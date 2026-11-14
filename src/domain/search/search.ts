import type { CatalogIndex } from "../catalog/catalog-index";
import type { PokemonForm, PokemonSpecies } from "../catalog/schema";
import { isHebrew, normalizeHebrew, normalizeLatin, similarity } from "./normalize";
import { phoneticKey } from "./phonetic";

/**
 * Catalog search used by the text box AND voice search (voice transcripts go through
 * exactly the same function). Returns ranked candidates; it never "auto-selects".
 */

export interface SearchHit {
  species: PokemonSpecies;
  form?: PokemonForm;
  score: number;
  matched: string;
}

interface Entry {
  species: PokemonSpecies;
  latin: string[];
  hebrew: string[];
  keys: string[];
}

/** Words that select a regional form ("Alolan Vulpix", "וולפיקס אלולה"). */
const REGION_WORDS: Record<string, "alola" | "galar" | "hisui" | "paldea"> = {
  alola: "alola", alolan: "alola", "אלולה": "alola", "אלולני": "alola", "אלולנית": "alola", "אלולאני": "alola",
  galar: "galar", galarian: "galar", "גלאר": "galar", "גלארי": "galar", "גלאריאני": "galar",
  hisui: "hisui", hisuian: "hisui", "היסוי": "hisui", "היסואי": "hisui", "היסויאני": "hisui",
  paldea: "paldea", paldean: "paldea", "פלדאה": "paldea", "פלדיאני": "paldea",
};

/** Fuzzy matching only between strings of comparable length (a sentence is not a typo of a name). */
function closeLength(a: string, b: string): boolean {
  return Math.abs(a.length - b.length) <= Math.max(2, Math.round(Math.min(a.length, b.length) * 0.35));
}

export class SearchIndex {
  private readonly entries: Entry[];
  constructor(private readonly idx: CatalogIndex) {
    this.entries = idx.species.map((s) => {
      const heNames = [s.name.he, ...s.aliases.filter(isHebrew)];
      const latinNames = [s.name.en, s.key, ...s.aliases.filter((a) => !isHebrew(a))];
      return {
        species: s,
        latin: Array.from(new Set(latinNames.map(normalizeLatin).filter(Boolean))),
        hebrew: Array.from(new Set(heNames.map(normalizeHebrew).filter(Boolean))),
        keys: Array.from(new Set([...heNames, s.name.en].map(phoneticKey).filter((k) => k.length >= 2))),
      };
    });
  }

  search(query: string, opts: { limit?: number; includeUnreleased?: boolean } = {}): SearchHit[] {
    const limit = opts.limit ?? 8;
    const raw = query.trim();
    if (!raw) return [];

    // Pokédex number ("150", "#150")
    const num = raw.replace(/^#/, "");
    if (/^\d{1,4}$/.test(num)) {
      const s = this.idx.getSpecies(Number(num));
      if (s && (s.released || opts.includeUnreleased)) return [{ species: s, score: 1, matched: `#${s.id}` }];
    }

    // Detect region words and strip them
    let region: "alola" | "galar" | "hisui" | "paldea" | undefined;
    const tokens = raw.split(/\s+/).filter((t) => {
      const k = isHebrew(t) ? normalizeHebrew(t) : normalizeLatin(t);
      const r = REGION_WORDS[k] ?? REGION_WORDS[t.toLowerCase()];
      if (r) region = r;
      return !r;
    });
    const q = tokens.join(" ") || raw;
    const heQ = normalizeHebrew(q);
    const laQ = normalizeLatin(q);
    const keyQ = phoneticKey(q);
    const hebrewQuery = isHebrew(q);

    const hits: SearchHit[] = [];
    for (const e of this.entries) {
      if (!e.species.released && !opts.includeUnreleased) continue;
      let best = 0;
      let matched = "";
      const consider = (score: number, m: string) => {
        if (score > best) {
          best = score;
          matched = m;
        }
      };
      if (hebrewQuery && heQ) {
        for (const h of e.hebrew) {
          if (h === heQ) consider(1, h);
          else if (h.startsWith(heQ) && heQ.length >= 2) consider(0.9 + 0.05 * (heQ.length / h.length), h);
          else if (heQ.length >= 3 && h.includes(heQ)) consider(0.8, h);
          else if (heQ.length >= 3 && closeLength(h, heQ)) consider(similarity(h, heQ) * 0.9, h);
        }
      } else if (laQ) {
        for (const l of e.latin) {
          if (l === laQ) consider(1, l);
          else if (l.startsWith(laQ) && laQ.length >= 1) consider(0.9 + 0.05 * (laQ.length / l.length), l);
          else if (laQ.length >= 3 && l.includes(laQ)) consider(0.8, l);
          else if (laQ.length >= 3 && closeLength(l, laQ)) consider(similarity(l, laQ) * 0.9, l);
        }
      }
      if (keyQ.length >= 2) {
        for (const k of e.keys) {
          // Short consonant skeletons collide easily ("mk" = Muk/Mimikyu), so weight by length.
          if (k === keyQ) consider(keyQ.length >= 4 ? 0.86 : keyQ.length === 3 ? 0.8 : 0.7, k);
          else if (keyQ.length >= 3 && tokens.length <= 2 && Math.abs(k.length - keyQ.length) <= 2) consider(similarity(k, keyQ) * 0.8, k);
        }
      }
      if (best >= 0.6) {
        const form = region ? e.species.forms.find((f) => f.region === region) : undefined;
        hits.push({ species: e.species, form, score: form ? Math.min(1, best + 0.02) : best, matched });
      }
    }
    hits.sort((a, b) => b.score - a.score || a.species.id - b.species.id);
    return hits.slice(0, limit);
  }

  /** Merge results of several transcripts (speech alternatives); keep the best score per species. */
  searchMany(queries: string[], limit = 6): SearchHit[] {
    const best = new Map<number, SearchHit>();
    for (const q of queries) {
      for (const h of this.search(q, { limit: limit * 2 })) {
        const cur = best.get(h.species.id);
        if (!cur || h.score > cur.score) best.set(h.species.id, h);
      }
    }
    return [...best.values()].sort((a, b) => b.score - a.score || a.species.id - b.species.id).slice(0, limit);
  }
}

/**
 * Whether the top hit is unambiguous enough to be *suggested* first. The UI still requires
 * the user to confirm – this only controls wording ("did you mean…?" vs "which one?").
 */
export function isConfident(hits: SearchHit[]): boolean {
  if (!hits.length) return false;
  const [a, b] = hits;
  return a!.score >= 0.95 && (!b || a!.score - b.score >= 0.08);
}
