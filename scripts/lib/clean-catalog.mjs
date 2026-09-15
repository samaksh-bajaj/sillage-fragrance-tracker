// Turns raw rows from the Parfumo TidyTuesday CSV into clean catalog records.
// Pure functions only, so the seed script can dry-run and report what changed.

// Parfumo appends contributor roles to names ("Jane Doe Brand owner") or lists them alone.
const PERFUMER_ROLE = /\s*\b(brand owner|perfume maker|creative director|perfume designer|fragrance designer)$/i;
const ACCORD_PLACEHOLDERS = new Set(['main accords']);

// Spelling variants of the same concentration label.
const CONCENTRATION_ALIASES = new Map(
  Object.entries({
    'eau de perfum': 'Eau de Parfum',
    'eau de perfume': 'Eau de Parfum',
    'eau de parfume': 'Eau de Parfum',
    'eau de parfum concentre': 'Eau de Parfum Concentrée',
    aftershave: 'After Shave',
    'after-shave': 'After Shave',
    'after-shave lotion': 'After Shave Lotion',
    'aftershave lotion': 'After Shave Lotion',
    'après rasage': 'Après-Rasage',
    'lotion après rasage': 'Lotion Après-Rasage',
    'hair and body mist': 'Hair & Body Mist',
    'all over spray': 'All-Over Spray',
    bodyspray: 'Body Spray',
    'parfum-gel': 'Parfum Gel',
    'eau de cologne concentré': 'Eau de Cologne Concentrée',
    concentration: null,
  }),
);

export const normalizeSearch = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const clean = (value) => {
  const collapsed = value?.replace(/\s+/g, ' ').trim();
  return !collapsed || collapsed === 'NA' ? null : collapsed;
};

const toList = (value) => {
  const cleaned = clean(value);
  if (!cleaned) return [];
  return cleaned.split(',').map((item) => item.trim()).filter(Boolean);
};

const toInt = (value) => {
  const parsed = Number.parseInt(clean(value) ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDecimal = (value) => {
  const parsed = Number.parseFloat(clean(value) ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const urlSlug = (url) => decodeURIComponent(url.split('/').pop() ?? '').toLowerCase();

// The CSV moved a leading number (e.g. "24" of "24, Faubourg") into its own column; put it back.
// The URL slug shows whether the number was followed by a separator ("455-tabac…") or not ("5th_avenue…").
function restoreLeadingNumber(name, brand, number, url) {
  if (!number || !/^\d+\.?$/.test(number)) return name;
  const digits = number.replace(/\.$/, '');
  const slug = urlSlug(url).replace(/^[-_]+/, '');
  const slugStartsWithNumber = slug.startsWith(digits.toLowerCase());
  const remainder = slugStartsWithNumber ? slug.slice(digits.length) : null;

  // The name was only the number, and the CSV filled the gap with the brand.
  if (name.toLowerCase() === brand.toLowerCase() && remainder !== null && !/[a-z]/.test(remainder)) {
    return digits;
  }

  const attach =
    /^[,.;:!?)\]_°'’]/.test(name) ||
    /^(st|nd|rd|th)\b/i.test(name) ||
    (!number.endsWith('.') && !!remainder && !/^[-_.]/.test(remainder));
  return attach ? `${number}${name}` : `${number} ${name}`;
}

// A handful of names were corrupted into "#NAME?" by a spreadsheet; rebuild them from the URL slug.
function repairCorruptedName(name, url) {
  if (!/^#?NAME\?$/.test(name)) return name;
  return urlSlug(url)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Many names repeat "<brand> <year> <concentration>" at the end; drop that suffix
// when it matches the record's own brand, year, and concentration.
function stripRepeatedSuffix(name, brand, releaseYear, concentration) {
  const pattern = new RegExp(`^(?:(.*)\\s+)?${escapeRegExp(brand)}(?:\\s+(\\d{4}))?(?:\\s+(.+))?$`, 'i');
  const match = name.match(pattern);
  if (!match) return name;

  const [, base, year, suffixConcentration] = match;
  if (!year && !suffixConcentration) return name;
  if (year && Number(year) !== releaseYear) return name;
  if (suffixConcentration && suffixConcentration.toLowerCase() !== concentration?.toLowerCase()) return name;

  return base?.trim() || brand;
}

function canonicalConcentration(concentration) {
  if (!concentration) return null;
  const alias = CONCENTRATION_ALIASES.get(concentration.toLowerCase());
  return alias === undefined ? concentration : alias;
}

// A release year in the URL slug that isn't part of the name itself.
function slugYear(name, url) {
  const match = urlSlug(url).match(/(?:^|[-_])((?:19|20)\d\d)(?=[-_]|$)/);
  if (!match || name.includes(match[1]) || Number(match[1]) > new Date().getFullYear()) return null;
  return Number(match[1]);
}

function cleanRow(row) {
  const brand = clean(row.Brand);
  const rawName = clean(row.Name);
  const parfumoUrl = clean(row.URL);
  if (!brand || !rawName || !parfumoUrl) return null;

  const releaseYear = toInt(row.Release_Year);
  const rawConcentration = clean(row.Concentration);

  let name = repairCorruptedName(rawName, parfumoUrl);
  name = restoreLeadingNumber(name, brand, clean(row.Number), parfumoUrl);
  name = stripRepeatedSuffix(name, brand, releaseYear, rawConcentration);

  return {
    raw_name: rawName,
    record: {
      name,
      brand,
      // Parfumo adds the release year to URLs of same-named releases ("glistening-2019").
      release_year: releaseYear ?? slugYear(name, parfumoUrl),
      concentration: canonicalConcentration(rawConcentration),
      rating_value: toDecimal(row.Rating_Value),
      rating_count: toInt(row.Rating_Count),
      main_accords: toList(row.Main_Accords).filter((accord) => !ACCORD_PLACEHOLDERS.has(accord.toLowerCase())),
      top_notes: toList(row.Top_Notes),
      middle_notes: toList(row.Middle_Notes),
      base_notes: toList(row.Base_Notes),
      perfumers: toList(row.Perfumers)
        .map((perfumer) => perfumer.replace(PERFUMER_ROLE, '').trim())
        .filter(Boolean),
      parfumo_url: parfumoUrl,
      search_text: '',
    },
  };
}

// Use the most common spelling for values that differ only by letter case ("Sour milk" / "Sour Milk").
function unifyCase(records, fields) {
  const counts = new Map();
  for (const record of records) {
    for (const field of fields) {
      for (const value of record[field]) {
        const key = value.toLowerCase();
        const spellings = counts.get(key) ?? new Map();
        spellings.set(value, (spellings.get(value) ?? 0) + 1);
        counts.set(key, spellings);
      }
    }
  }
  const preferred = new Map();
  for (const [key, spellings] of counts) {
    const [best] = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    preferred.set(key, best[0]);
  }
  for (const record of records) {
    for (const field of fields) {
      record[field] = [...new Set(record[field].map((value) => preferred.get(value.toLowerCase())))];
    }
  }
}

const NOTE_FIELDS = ['main_accords', 'top_notes', 'middle_notes', 'base_notes'];

const notesSize = (record) => NOTE_FIELDS.reduce((total, field) => total + record[field].length, 0);
const contentSize = (record) => notesSize(record) + record.perfumers.length;

const compatible = (a, b) => a.length === 0 || b.length === 0 || JSON.stringify(a) === JSON.stringify(b);

const richness = (a, b) =>
  contentSize(b) - contentSize(a) ||
  (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
  a.parfumo_url.localeCompare(b.parfumo_url);

// Same-named records are the same fragrance when neither their notes nor their perfumers disagree.
function canMerge(kept, candidate) {
  const notesAgree =
    notesSize(kept) === 0 ||
    notesSize(candidate) === 0 ||
    NOTE_FIELDS.every((field) => JSON.stringify(kept[field]) === JSON.stringify(candidate[field]));
  return notesAgree && compatible(kept.perfumers, candidate.perfumers);
}

function absorb(kept, duplicate) {
  if (notesSize(kept) === 0) {
    for (const field of NOTE_FIELDS) kept[field] = duplicate[field];
  }
  if (kept.perfumers.length === 0) kept.perfumers = duplicate.perfumers;
  if (kept.release_year === null) kept.release_year = duplicate.release_year;
  if (kept.rating_count === null && duplicate.rating_count !== null) {
    kept.rating_value = duplicate.rating_value;
    kept.rating_count = duplicate.rating_count;
  }
}

/**
 * @returns {{ fragrances: object[], merges: Map<string, string>, renamed: {from: string, to: string}[], skipped: number }}
 *   merges maps each dropped duplicate URL to the URL of the record that replaced it.
 */
export function cleanCatalog(rows) {
  let skipped = 0;
  const renamed = [];
  const byUrl = new Map();

  for (const row of rows) {
    const result = cleanRow(row);
    if (!result) {
      skipped += 1;
      continue;
    }
    const { record, raw_name } = result;
    const existing = byUrl.get(record.parfumo_url);
    if (existing && richness(existing.record, record) <= 0) continue;
    byUrl.set(record.parfumo_url, { record, raw_name });
  }

  const cleaned = [...byUrl.values()];
  for (const { record, raw_name } of cleaned) {
    if (record.name !== raw_name) renamed.push({ from: raw_name, to: record.name });
  }

  const records = cleaned.map(({ record }) => record);
  unifyCase(records, ['main_accords', 'top_notes', 'middle_notes', 'base_notes', 'perfumers']);

  // Group by everything but the year: an undated listing can be a copy of a dated one.
  const groups = new Map();
  for (const record of records) {
    const key = [
      normalizeSearch(record.brand),
      normalizeSearch(record.name),
      record.concentration?.toLowerCase() ?? '',
    ].join('|');
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const fragrances = [];
  const merges = new Map();
  for (const group of groups.values()) {
    const datedYears = new Set(group.map((record) => record.release_year).filter((year) => year !== null));
    // An undated listing is only treated as a copy of the one dated release when their data matches
    // exactly (or neither has any); with several dated releases it could belong to any of them.
    const sameListing = (a, b) => {
      if (a.release_year === b.release_year) return canMerge(a, b);
      if (datedYears.size !== 1 || (a.release_year !== null && b.release_year !== null)) return false;
      if (contentSize(a) === 0 && contentSize(b) === 0) return true;
      return notesSize(a) > 0 && NOTE_FIELDS.every((field) => JSON.stringify(a[field]) === JSON.stringify(b[field])) &&
        compatible(a.perfumers, b.perfumers);
    };

    const kept = [];
    for (const record of group.sort(richness)) {
      const target = kept.find((candidate) => sameListing(candidate, record));
      if (target) {
        merges.set(record.parfumo_url, target.parfumo_url);
        absorb(target, record);
      } else {
        kept.push(record);
      }
    }
    fragrances.push(...kept);
  }

  for (const record of fragrances) {
    record.search_text = normalizeSearch(`${record.brand} ${record.name}`);
  }

  return { fragrances, merges, renamed, skipped };
}
