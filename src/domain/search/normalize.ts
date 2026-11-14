/** Text normalization shared by typed search and voice search. */

const NIQQUD = /[֑-ׇ]/g;
const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const GERESH = /[׳״'"`´’‘״׳]/g;

export function isHebrew(text: string): boolean {
  return /[֐-׿]/.test(text);
}

/** Hebrew: strip niqqud, unify final letters, unify geresh to "'", drop spaces/punctuation. */
export function normalizeHebrew(text: string): string {
  return text
    .replace(NIQQUD, "")
    .replace(GERESH, "'")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c] ?? c)
    .replace(/[^א-ת']/g, "")
    .replace(/'+/g, "'");
}

/** Latin: lowercase, strip diacritics (é -> e), keep a-z0-9 only. */
export function normalizeLatin(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

/** Damerau–Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

export function similarity(a: string, b: string): number {
  const m = Math.max(a.length, b.length);
  if (m === 0) return 1;
  return 1 - editDistance(a, b) / m;
}
