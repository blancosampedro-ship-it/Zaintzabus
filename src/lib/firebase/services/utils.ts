/** Normaliza texto para tokens de búsqueda (minúsculas, sin dobles espacios). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Tokeniza una cadena para `searchTerms` (OR con array-contains-any). */
export function buildSearchTerms(...parts: Array<string | undefined | null>): string[] {
  const tokens: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    const normalized = normalizeForSearch(part);
    if (!normalized) continue;

    for (const token of normalized.split(' ')) {
      if (token.length < 2) continue;
      tokens.push(token);
    }

    // también guardamos la frase completa para búsquedas por substring manual (UI)
    tokens.push(normalized);
  }

  // dedupe
  return Array.from(new Set(tokens)).slice(0, 50);
}

export function padNumber(num: number, width: number): string {
  return String(num).padStart(width, '0');
}
