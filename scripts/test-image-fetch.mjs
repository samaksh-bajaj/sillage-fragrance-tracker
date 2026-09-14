// End-to-end check for the fetch-fragrance-image Edge Function.
// Creates a throwaway confirmed user, adds sample fragrances to their collection,
// calls the function for each, prints the results, then deletes the user.
// Usage: node --env-file=.env --env-file=.env.local scripts/test-image-fetch.mjs [count]

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  console.error('Missing Supabase URL, publishable key, or secret key.');
  process.exit(1);
}

const count = Number(process.argv[2] ?? 10);
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secretKey, clientOptions);
const userClient = createClient(url, publishableKey, clientOptions);

const email = `sillage-image-test-${Date.now()}@example.com`;
const password = randomUUID();

const callFunction = async (accessToken, fragranceId) => {
  const started = Date.now();
  const response = await fetch(`${url}/functions/v1/fetch-fragrance-image`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fragrance_id: fragranceId }),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ms: Date.now() - started, ...body };
};

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError) throw createError;
const userId = created.user.id;

const testedIds = [];
try {
  const { data: signIn, error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  const accessToken = signIn.session.access_token;

  // Mix of well-known and obscure fragrances that don't have an image yet.
  const { data: popular, error: popularError } = await admin
    .from('fragrances')
    .select('id, brand, name')
    .is('image_url', null)
    .not('rating_count', 'is', null)
    .order('rating_count', { ascending: false })
    .limit(Math.ceil(count / 2));
  if (popularError) throw popularError;
  const { data: obscure, error: obscureError } = await admin
    .from('fragrances')
    .select('id, brand, name')
    .is('image_url', null)
    .is('rating_count', null)
    .limit(Math.floor(count / 2));
  if (obscureError) throw obscureError;
  const samples = [...popular, ...obscure];

  const { error: addError } = await userClient
    .from('user_fragrances')
    .insert(samples.map((fragrance) => ({ fragrance_id: fragrance.id })));
  if (addError) throw addError;

  const results = [];
  for (const fragrance of samples) {
    testedIds.push(fragrance.id);
    const result = await callFunction(accessToken, fragrance.id);
    results.push({
      fragrance: `${fragrance.brand} – ${fragrance.name}`.slice(0, 48),
      status: result.status,
      ms: result.ms,
      outcome: result.image_url ? 'image stored' : result.reason ?? result.message ?? 'unknown',
    });
  }
  console.table(results);

  const stored = results.filter((result) => result.outcome === 'image stored').length;
  console.log(`Images stored: ${stored} / ${results.length}`);

  const { data: notOwned } = await admin
    .from('fragrances')
    .select('id')
    .not('id', 'in', `(${samples.map((fragrance) => fragrance.id).join(',')})`)
    .limit(1)
    .single();
  const rejected = await callFunction(accessToken, notOwned.id);
  console.log(`Not-owned fragrance → HTTP ${rejected.status} (${rejected.reason})`);

  const noAuth = await fetch(`${url}/functions/v1/fetch-fragrance-image`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fragrance_id: samples[0].id }),
  });
  console.log(`No user token → HTTP ${noAuth.status}`);
} finally {
  // Let real users retry fragrances whose fetch failed during the test.
  if (testedIds.length) {
    await admin
      .from('fragrances')
      .update({ image_last_attempt_at: null })
      .in('id', testedIds)
      .is('image_url', null);
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  console.log(deleteError ? `Failed to delete test user: ${deleteError.message}` : 'Test user deleted.');
}
