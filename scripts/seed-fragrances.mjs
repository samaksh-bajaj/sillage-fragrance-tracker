// Loads the cleaned Parfumo fragrance catalog into public.fragrances.
// Usage: node --env-file=.env --env-file=.env.local scripts/seed-fragrances.mjs [--dry-run]
// Safe to re-run: rows are upserted on parfumo_url. Catalog rows that the cleaner merged away are
// deleted after any collection entries pointing at them are moved to the record that replaced them.

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

import { cleanCatalog } from './lib/clean-catalog.mjs';

const CSV_URL =
  'https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2024/2024-12-10/parfumo_data_clean.csv';
const BATCH_SIZE = 1000;
const dryRun = process.argv.includes('--dry-run');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!dryRun && (!url || !secretKey)) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

async function withRetry(label, operation, attempt = 1) {
  const { data, error } = await operation();
  if (!error) return data;
  if (attempt >= 3) throw new Error(`${label}: ${error.message}`);
  console.warn(`${label} failed (attempt ${attempt}): ${error.message}. Retrying…`);
  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  return withRetry(label, operation, attempt + 1);
}

function chunk(items, size) {
  const chunks = [];
  for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size));
  return chunks;
}

console.log('Downloading CSV…');
const response = await fetch(CSV_URL);
if (!response.ok) throw new Error(`CSV download failed: HTTP ${response.status}`);
const rows = parse(await response.text(), { columns: true, skip_empty_lines: true });

const { fragrances, merges, renamed, skipped } = cleanCatalog(rows);
console.log(
  `Parsed ${rows.length} rows → ${fragrances.length} fragrances ` +
    `(${skipped} incomplete skipped, ${renamed.length} names cleaned, ${merges.size} duplicates merged).`,
);

if (dryRun) {
  for (const { from, to } of renamed.slice(0, 20)) console.log(`  rename: ${from} → ${to}`);
  for (const [from, to] of merges) console.log(`  merge: ${from} → ${to}`);
  process.exit(0);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const [index, batch] of chunk(fragrances, BATCH_SIZE).entries()) {
  await withRetry('Upsert', () => supabase.from('fragrances').upsert(batch, { onConflict: 'parfumo_url' }));
  console.log(`Upserted ${Math.min((index + 1) * BATCH_SIZE, fragrances.length)} / ${fragrances.length}`);
}

// Find catalog rows that are no longer part of the cleaned catalog.
const wantedUrls = new Set(fragrances.map((fragrance) => fragrance.parfumo_url));
const existing = [];
for (let from = 0; ; from += BATCH_SIZE) {
  const page = await withRetry('Read catalog', () =>
    supabase.from('fragrances').select('id, parfumo_url').order('id').range(from, from + BATCH_SIZE - 1),
  );
  existing.push(...page);
  if (page.length < BATCH_SIZE) break;
}
const idByUrl = new Map(existing.map((row) => [row.parfumo_url, row.id]));
const stale = existing.filter((row) => !wantedUrls.has(row.parfumo_url));

let moved = 0;
const kept = [];
const removable = [];
for (const row of stale) {
  const collectionRows = await withRetry('Read collections', () =>
    supabase.from('user_fragrances').select('user_id, status').eq('fragrance_id', row.id),
  );
  const replacementId = idByUrl.get(merges.get(row.parfumo_url));

  if (collectionRows.length > 0 && !replacementId) {
    kept.push(row.parfumo_url);
    continue;
  }

  for (const entry of collectionRows) {
    const current = await withRetry('Read replacement entry', () =>
      supabase
        .from('user_fragrances')
        .select('status')
        .eq('user_id', entry.user_id)
        .eq('fragrance_id', replacementId)
        .maybeSingle(),
    );
    const status = current?.status === 'owned' || entry.status === 'owned' ? 'owned' : entry.status;
    await withRetry('Move collection entry', () =>
      supabase
        .from('user_fragrances')
        .upsert({ user_id: entry.user_id, fragrance_id: replacementId, status }, { onConflict: 'user_id,fragrance_id' }),
    );
    moved += 1;
  }
  removable.push(row.id);
}

for (const ids of chunk(removable, 200)) {
  await withRetry('Delete collection entries', () => supabase.from('user_fragrances').delete().in('fragrance_id', ids));
  await withRetry('Delete stale fragrances', () => supabase.from('fragrances').delete().in('id', ids));
}

console.log(`Removed ${removable.length} stale fragrances (moved ${moved} collection entries).`);
if (kept.length > 0) {
  console.warn(`Kept ${kept.length} stale fragrances that are in someone's collection:`, kept);
}
console.log('Done.');
