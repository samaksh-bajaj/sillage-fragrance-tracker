// Must match normalizeSearch() in scripts/lib/clean-catalog.mjs, which builds search_text.
export function normalizeSearch(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchWords(text: string) {
  return (
    normalizeSearch(text)
      .split(' ')
      .filter(Boolean)
      // Escape LIKE wildcards so they match literally.
      .map((word) => word.replace(/[\\%_]/g, '\\$&'))
  );
}
