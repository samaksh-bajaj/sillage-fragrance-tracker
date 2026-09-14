// Loads the Parfumo fragrance catalog into public.fragrances.
// Usage: node --env-file=.env --env-file=.env.local scripts/seed-fragrances.mjs
// Safe to re-run: rows are upserted on parfumo_url and image columns are left untouched.

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

const CSV_URL =
  'https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2024/2024-12-10/parfumo_data_clean.csv';
const BATCH_SIZE = 1000;

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clean = (value) => {
  const trimmed = value?.trim();
  return !trimmed || trimmed === 'NA' ? null : trimmed;
};

const toList = (value) => {
  const cleaned = clean(value);
  if (!cleaned) return [];
  return [...new Set(cleaned.split(',').map((item) => item.trim()).filter(Boolean))];
};

const toInt = (value) => {
  const cleaned = clean(value);
  const parsed = cleaned === null ? NaN : Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDecimal = (value) => {
  const cleaned = clean(value);
  const parsed = cleaned === null ? NaN : Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

// Must match normalizeSearch() in the app so queries hit the same text.
const normalizeSearch = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const toFragrance = (row) => {
  const name = clean(row.Name);
  const brand = clean(row.Brand);
  const parfumoUrl = clean(row.URL);
  if (!name || !brand || !parfumoUrl) return null;

  return {
    name,
    brand,
    release_year: toInt(row.Release_Year),
    concentration: clean(row.Concentration),
    rating_value: toDecimal(row.Rating_Value),
    rating_count: toInt(row.Rating_Count),
    main_accords: toList(row.Main_Accords),
    top_notes: toList(row.Top_Notes),
    middle_notes: toList(row.Middle_Notes),
    base_notes: toList(row.Base_Notes),
    perfumers: toList(row.Perfumers),
    parfumo_url: parfumoUrl,
    search_text: normalizeSearch(`${brand} ${name}`),
  };
};

// How much data a row carries, used to keep the richest copy of duplicate URLs.
const completeness = (fragrance) =>
  Object.values(fragrance).filter((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null,
  ).length;

async function upsertBatch(batch, attempt = 1) {
  const { error } = await supabase
    .from('fragrances')
    .upsert(batch, { onConflict: 'parfumo_url' });
  if (!error) return;
  if (attempt >= 3) throw error;
  console.warn(`Batch failed (attempt ${attempt}): ${error.message}. Retrying…`);
  await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  return upsertBatch(batch, attempt + 1);
}

console.log('Downloading CSV…');
const response = await fetch(CSV_URL);
if (!response.ok) throw new Error(`CSV download failed: HTTP ${response.status}`);
const rows = parse(await response.text(), { columns: true, skip_empty_lines: true });
console.log(`Parsed ${rows.length} rows.`);

const byUrl = new Map();
let skipped = 0;
for (const row of rows) {
  const fragrance = toFragrance(row);
  if (!fragrance) {
    skipped += 1;
    continue;
  }
  const existing = byUrl.get(fragrance.parfumo_url);
  if (!existing || completeness(fragrance) > completeness(existing)) {
    byUrl.set(fragrance.parfumo_url, fragrance);
  }
}
const fragrances = [...byUrl.values()];
console.log(
  `Prepared ${fragrances.length} fragrances (skipped ${skipped} incomplete, merged ${rows.length - skipped - fragrances.length} duplicates).`,
);

for (let start = 0; start < fragrances.length; start += BATCH_SIZE) {
  await upsertBatch(fragrances.slice(start, start + BATCH_SIZE));
  console.log(`Upserted ${Math.min(start + BATCH_SIZE, fragrances.length)} / ${fragrances.length}`);
}

console.log('Done.');
