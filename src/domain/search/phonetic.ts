import { normalizeHebrew, normalizeLatin } from "./normalize";

/**
 * Language-independent consonant skeleton so that Hebrew spellings (typed or recognized
 * by speech-to-text) can be matched against English Pokémon names.
 *
 *   "מיוטו" -> "mt"      "Mewtwo" -> "mtb" (edit distance 1)
 *   "פיקאצ'ו" -> "pkc"   "Pikachu" -> "pkc"
 *   "רייקוואזה" -> "rkbz"  "Rayquaza" -> "rkbz"
 *
 * Merged classes: b/v/w -> b, p/f -> p, k/c(hard)/q -> k, s/sh -> s, t/th -> t,
 * ch/tch/ts/צ -> c, j/soft g/dg/ג'/ז' -> j, z -> z. Vowels, h, y are dropped.
 */

const HEB: Record<string, string> = {
  "ב": "b", "ג": "g", "ד": "d", "ז": "z", "ט": "t", "ת": "t", "כ": "k", "ק": "k",
  "ל": "l", "מ": "m", "נ": "n", "ס": "s", "ש": "s", "צ": "c", "פ": "p", "ר": "r",
  "א": "", "ע": "", "ה": "", "ח": "", "י": "",
};

export function hebrewPhoneticKey(input: string): string {
  const s = normalizeHebrew(input);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const next = s[i + 1];
    if (c === "'") continue;
    if (next === "'") {
      if (c === "ג" || c === "ז") out += "j";
      else if (c === "צ") out += "c";
      else if (c === "ת") out += "t";
      else out += HEB[c] ?? "";
      continue;
    }
    if (c === "ו") {
      // "וו" = consonant w/v; word-initial ו = v; otherwise a vowel (o/u).
      if (next === "ו") {
        out += "b";
        i++;
      } else if (i === 0) out += "b";
      continue;
    }
    out += HEB[c] ?? "";
  }
  return collapse(out);
}

/** Expects hard "c" already mapped to "k" (see latinKey); any remaining "c" is a "ch" sound. */
function latinPhoneticKey(input: string): string {
  let s = normalizeLatin(input).replace(/[0-9]/g, "");
  s = s
    .replace(/sch/g, "s")
    .replace(/tch/g, "c")
    .replace(/ch/g, "c")
    .replace(/sh/g, "s")
    .replace(/th/g, "t")
    .replace(/ph/g, "p")
    .replace(/ck/g, "k")
    .replace(/qu/g, "kw")
    .replace(/dg/g, "j")
    .replace(/wh/g, "w")
    .replace(/x/g, "ks")
    .replace(/t[sz]/g, "c")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/g(?=[eiy])/g, "j");
  let out = "";
  const vowel = (ch: string | undefined) => ch !== undefined && "aeiouy".includes(ch);
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if ("aeiouyh".includes(c)) continue;
    if (c === "w") {
      // consonant at start of word or between consonant and vowel ("Swablu", "Kwazy"), vowel otherwise ("Mew").
      const prev = s[i - 1];
      if (i === 0 || (!vowel(prev) && vowel(s[i + 1]))) out += "b";
      continue;
    }
    if (c === "v" || c === "b") out += "b";
    else if (c === "f" || c === "p") out += "p";
    else if (c === "q" || c === "k") out += "k";
    else out += c;
  }
  return collapse(out);
}

/** Pre-pass for hard "c" (before a/o/u/consonant/end) so it is not confused with "ch". */
export function latinKey(input: string): string {
  const pre = normalizeLatin(input)
    .replace(/ch/g, "\u0001")
    .replace(/c(?![eiy])/g, "k")
    .replace(/\u0001/g, "ch");
  return latinPhoneticKey(pre);
}

function collapse(s: string): string {
  return s.replace(/(.)\1+/g, "$1");
}

export function phoneticKey(input: string): string {
  return /[֐-׿]/.test(input) ? hebrewPhoneticKey(input) : latinKey(input);
}
