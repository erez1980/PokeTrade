# Data sources, licensing and review process

| Source | Used for | License / terms | Notes |
|---|---|---|---|
| [pogoapi.net](https://pogoapi.net/) (`released_pokemon`, `shiny_pokemon`, `pokemon_rarity`, `nesting_pokemon`, `shadow_pokemon`, `raid/research/photobomb_exclusive`, `baby`, `alolan`, `galarian`) | Released list, shiny release + channels, classifications, acquisition restrictions | Free public API, no explicit license. Facts only, attributed. | Snapshot last-modified 2026-01-31 at time of build. |
| [pokemon-go-api](https://github.com/pokemon-go-api/pokemon-go-api) `pokedex.json` | Names, types, generation, class, forms/costumes (asset list), Gigantamax flag, elite moves | MIT (code); data/assets derived from the game © Niantic / TPC | 14.9 MB; raw file not committed. |
| [WatWowMap Masterfile-Generator](https://github.com/WatWowMap/Masterfile-Generator) | Form names, costume flags, families | See repository license | |
| [PokeMiners game_masters](https://github.com/PokeMiners/game_masters) | Max-battle (Dynamax/Gigantamax) settings, size bounds, location cards, tradability | Decoded game master © Niantic; factual parameters only | |
| Official Pokémon GO Help Center (trading, remote trading, Max Pokémon) | Trade rules, Gigantamax special trade, Max keep-one rule | Facts cited, text not reproduced | URLs in `data/curation/evidence.json` |
| Community documentation (Bulbapedia, Silph Road research archive) | Regional exclusives, shiny-rate categories, fused-form trade rule, Meltan/Melmetal trade exception, released Hisuian/Paldean forms | Facts only (Bulbapedia text is CC BY-NC-SA, not reproduced) | Confidence ≤ medium |
| Official pokemongo.com posts, LeekDuck (incl. shiny checklist data), Serebii, Dittobase, Pokémon GO Hub | Background → Pokémon links, costume Shiny status (`evidenceRecords`, `backgroundLinks`, `formShiny` in `data/curation/evidence.json`) | Facts only, each with URL | Researched 2026-11-19; in-person backgrounds cross-checked by 2 sources |
| [PokeMiners pogo_assets](https://github.com/PokeMiners/pogo_assets) | Background pictures (hot-linked) | Game assets © Niantic/TPC | 236/246 available |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Official artwork (hot-linked) | Repo CC0-style; **artwork © Nintendo/Creatures/GAME FREAK/TPC** | Not redistributed; loaded from raw.githubusercontent.com |
| [pokemon-go-api/assets](https://github.com/pokemon-go-api/assets) | Form/costume icons (hot-linked) | Game assets © Niantic/TPC | Not redistributed |

**Artwork rights:** Pokémon images are copyrighted by their owners. The app hot-links them for a non-commercial fan project and states non-affiliation. Before any commercial use, obtain permission or replace artwork (the URL builders are isolated in `src/lib/images.ts`).

**Hebrew names:** there is no official Hebrew localisation of Pokémon GO. `data/curation/hebrew-names.json` holds curated fan spellings and aliases for ~295 popular species; all others use the rule-based transliterator. Search additionally uses a Hebrew↔Latin phonetic key, so imperfect spellings still match.

## Pipeline

1. `npm run data:fetch` – downloads all sources to `data/sources/raw/` (git-ignored) and writes `data/sources/manifest.json` (retrieval time, Last-Modified, SHA-256). A failed download keeps the previous manifest entry.
2. `npm run data:build` – normalises into `public/data/catalog.json`:
   * Zod schema validation + integrity checks (duplicate ids, missing normal forms, G-Max without Dynamax, truncated upstream).
   * **Never silently erases**: species/forms present before but missing upstream are carried forward and flagged in `needsReview`.
   * Writes a gzipped snapshot (`data/catalog/snapshots/`, newest 5 kept; older in git history), a changelog entry and `public/data/report.json` (rendered at `/admin`).
   * On any error the published catalog is left unchanged and the build exits 1.
   * Without raw sources (fresh clone / CI deploy) it re-validates and republishes the committed catalog.
3. `npm run data:rollback -- <version>` – restores a validated snapshot.
4. `.github/workflows/data-update.yml` runs weekly and opens a **pull request** — updates are reviewed before they go live.

A new Pokémon appears automatically once it is in the sources: the UI is entirely data-driven (static detail pages are generated from the catalog at build time).

## Adding curated evidence

Edit `data/curation/evidence.json`. Every entry needs a source id with URL. Examples:
* Verify a background on a species → add the species id to `backgroundLinks.links["LC_..."]`.
* Verify a Shiny costume / Shiny Max / Shiny Shadow → add a `verifiedCombos` entry with an `evidenceId`.
* Confirm a regional form release → add the form id to `releasedForms.ids`.
Then `npm run data:build && npm test`.
