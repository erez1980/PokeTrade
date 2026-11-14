/**
 * Rule-based English -> Hebrew transliteration used by the catalog pipeline to give every
 * species a readable Hebrew name when no curated Hebrew name exists
 * (data/curation/hebrew-names.json always wins). Output follows common Israeli fan
 * spelling: consonants are written, long vowels use י/ו, short "a"/"e" are often omitted.
 */

const FINAL: Record<string, string> = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };

const DIGRAPHS: [string, string][] = [
  ["tch", "צ'"],
  ["sch", "ש"],
  ["ch", "צ'"],
  ["sh", "ש"],
  ["th", "ת'"],
  ["ph", "פ"],
  ["ck", "ק"],
  ["qu", "קוו"],
  ["dg", "ג'"],
  ["wh", "וו"],
  ["ts", "צ"],
  ["tz", "צ"],
  ["zz", "ז"],
];

const VOWEL_GROUPS: [string, string][] = [
  ["eau", "ו"],
  ["ee", "י"],
  ["ea", "י"],
  ["ie", "י"],
  ["ei", "יי"],
  ["ey", "יי"],
  ["ay", "יי"],
  ["ai", "יי"],
  ["oo", "ו"],
  ["ou", "או"],
  ["ow", "או"],
  ["au", "או"],
  ["aw", "או"],
  ["oi", "וי"],
  ["oy", "וי"],
  ["eo", "יאו"],
  ["ew", "יו"],
  ["ue", "ו"],
  ["ui", "וי"],
];

const isVowel = (c: string | undefined) => c !== undefined && "aeiouy".includes(c);

function consonant(c: string, next: string | undefined): string {
  switch (c) {
    case "b": return "ב";
    case "c": return next && "eiy".includes(next) ? "ס" : "ק";
    case "d": return "ד";
    case "f": return "פ";
    case "g": return next && "ei".includes(next) ? "ג'" : "ג";
    case "h": return "ה";
    case "j": return "ג'";
    case "k": return "ק";
    case "l": return "ל";
    case "m": return "מ";
    case "n": return "נ";
    case "p": return "פ";
    case "q": return "ק";
    case "r": return "ר";
    case "s": return "ס";
    case "t": return "ט";
    case "v": return "ו";
    case "w": return "וו";
    case "x": return "קס";
    case "z": return "ז";
    default: return "";
  }
}

function transliterateWord(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  let out = "";
  let i = 0;
  while (i < w.length) {
    const rest = w.slice(i);
    const atStart = i === 0;
    // vowel groups
    const vg = VOWEL_GROUPS.find(([k]) => rest.startsWith(k));
    if (vg) {
      out += atStart ? (vg[1].startsWith("א") ? vg[1] : "א" + vg[1]) : vg[1];
      i += vg[0].length;
      continue;
    }
    const dg = DIGRAPHS.find(([k]) => rest.startsWith(k));
    if (dg) {
      out += dg[1];
      i += dg[0].length;
      continue;
    }
    const c = w[i]!;
    const next = w[i + 1];
    const atEnd = i === w.length - 1;
    if (c === next && !isVowel(c)) {
      i++;
      continue; // double consonant
    }
    if (isVowel(c)) {
      if (c === "y") {
        out += atStart && isVowel(next) ? "י" : "י";
      } else if (atStart) {
        out += c === "o" || c === "u" ? "או" : c === "i" ? "אי" : "א";
      } else if (c === "e" && atEnd && w.length > 3) {
        // silent final e ("Blastoise")
      } else if (c === "a") {
        // "a" written as א when it ends the word or is followed by a single consonant + vowel
        const n1 = w[i + 1];
        const n2 = w[i + 2];
        const afterDigraph = DIGRAPHS.find(([k]) => w.startsWith(k, i + 1));
        if (atEnd) out += "ה";
        else if (afterDigraph && isVowel(w[i + 1 + afterDigraph[0].length])) out += "א";
        else if (n1 && !isVowel(n1) && isVowel(n2)) out += "א";
        else if (isVowel(n1)) out += "א";
      } else if (c === "e") {
        const n1 = w[i + 1];
        const n2 = w[i + 2];
        if (n1 && !isVowel(n1) && isVowel(n2) && n2 !== "e") out += "י";
      } else if (c === "i") out += "י";
      else out += "ו"; // o, u
      i++;
      continue;
    }
    out += consonant(c, next);
    i++;
  }
  // final letter forms
  const last = out.slice(-1);
  if (FINAL[last]) out = out.slice(0, -1) + FINAL[last];
  return out;
}

export function transliterateToHebrew(name: string): string {
  return name
    .replace(/♀/g, " female")
    .replace(/♂/g, " male")
    .split(/[\s-]+/)
    .map(transliterateWord)
    .filter(Boolean)
    .join(" ");
}
