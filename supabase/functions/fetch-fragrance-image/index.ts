// Fetches a fragrance's Parfumo page, reads its og:image, and copies the image into Storage.
// Called by the app after a user adds a fragrance to their collection.
// Expected failures (blocked page, missing og:image, bad image) return 200 with image_url: null.

import { withSupabase } from 'npm:@supabase/server@1.6.0';

const BUCKET = 'fragrance-images';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

type Result = { image_url: string | null; reason?: string };

class FetchFailure extends Error {}

async function fetchWithLimit(url: string, accept: string, maxBytes: number) {
  const response = await fetch(url, {
    headers: { ...REQUEST_HEADERS, Accept: accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return { response, bytes: null };
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new FetchFailure('too_large');
  }

  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FetchFailure('too_large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { response, bytes };
}

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

function parseOgImage(html: string, pageUrl: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
    }
    const key = (attributes.property ?? attributes.name ?? '').toLowerCase();
    if (key !== 'og:image' || !attributes.content) continue;

    try {
      const imageUrl = new URL(decodeEntities(attributes.content.trim()), pageUrl);
      return imageUrl.protocol === 'https:' ? imageUrl.href : null;
    } catch {
      return null;
    }
  }
  return null;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const json = (body: Result, status = 200) => Response.json(body, { status });

    if (req.method !== 'POST') return json({ image_url: null, reason: 'method_not_allowed' }, 405);

    let fragranceId: number;
    try {
      fragranceId = Number((await req.json()).fragrance_id);
    } catch {
      fragranceId = NaN;
    }
    if (!Number.isSafeInteger(fragranceId) || fragranceId <= 0) {
      return json({ image_url: null, reason: 'invalid_fragrance_id' }, 400);
    }

    // Only fetch for fragrances the caller actually owns (checked under their RLS).
    const { data: owned, error: ownedError } = await ctx.supabase
      .from('user_fragrances')
      .select('fragrance_id')
      .eq('fragrance_id', fragranceId)
      .eq('status', 'owned')
      .maybeSingle();
    if (ownedError) return json({ image_url: null, reason: 'lookup_failed' }, 500);
    if (!owned) return json({ image_url: null, reason: 'not_in_collection' }, 403);

    const { data: fragrance, error: fragranceError } = await ctx.supabaseAdmin
      .from('fragrances')
      .select('id, parfumo_url, image_url, image_last_attempt_at')
      .eq('id', fragranceId)
      .single();
    if (fragranceError || !fragrance) return json({ image_url: null, reason: 'fragrance_not_found' }, 404);

    if (fragrance.image_url) return json({ image_url: fragrance.image_url });

    const lastAttempt = fragrance.image_last_attempt_at
      ? Date.parse(fragrance.image_last_attempt_at)
      : 0;
    if (Date.now() - lastAttempt < RETRY_AFTER_MS) {
      return json({ image_url: null, reason: 'recently_attempted' });
    }

    await ctx.supabaseAdmin
      .from('fragrances')
      .update({ image_last_attempt_at: new Date().toISOString() })
      .eq('id', fragranceId);

    const fail = (reason: string) => {
      console.log(JSON.stringify({ fragrance_id: fragranceId, reason }));
      return json({ image_url: null, reason });
    };

    try {
      // The page URL comes from our catalog, never from the request.
      const page = await fetchWithLimit(fragrance.parfumo_url, 'text/html', MAX_HTML_BYTES);
      if (!page.bytes) return fail(`page_http_${page.response.status}`);

      const html = new TextDecoder().decode(page.bytes);
      const imageUrl = parseOgImage(html, page.response.url || fragrance.parfumo_url);
      if (!imageUrl) return fail('no_og_image');

      const image = await fetchWithLimit(imageUrl, 'image/*', MAX_IMAGE_BYTES);
      if (!image.bytes) return fail(`image_http_${image.response.status}`);

      const contentType = (image.response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      const extension = IMAGE_EXTENSIONS[contentType];
      if (!extension) return fail('unsupported_image_type');

      const path = `${fragranceId}.${extension}`;
      const { error: uploadError } = await ctx.supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, image.bytes, { contentType, upsert: true });
      if (uploadError) return fail('upload_failed');

      const { data: publicUrl } = ctx.supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      const { error: updateError } = await ctx.supabaseAdmin
        .from('fragrances')
        .update({ image_url: publicUrl.publicUrl })
        .eq('id', fragranceId);
      if (updateError) return fail('save_failed');

      return json({ image_url: publicUrl.publicUrl });
    } catch (error) {
      if (error instanceof FetchFailure) return fail(error.message);
      if (error instanceof DOMException && error.name === 'TimeoutError') return fail('timeout');
      return fail('fetch_failed');
    }
  }),
};
