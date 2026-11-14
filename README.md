# PokéTrade — מי יותר נדיר?

A Hebrew-first (RTL) web app for Pokémon GO players: pick two Pokémon, set their exact characteristics (Shiny, Lucky, Shadow/Purified, Dynamax/Gigantamax, costume, regional form, background, size, legacy move) and see **which one is estimated to be rarer — and why**.

> Independent fan project. Not affiliated with Niantic, Scopely, Nintendo, Creatures, GAME FREAK or The Pokémon Company. Rarity scores are estimates, never official odds.

## Features (P0)

| Area | What it does |
|---|---|
| **Compare** (`/`) | Two panels, Hebrew/English/number/typo-tolerant search, Hebrew voice search, form + characteristic configurator with validation, numeric scores (0–100), visual meter, Hebrew explanation, advanced source-backed details, trade-eligibility notices, swap, shareable URL. |
| **Rarity rankings** (`/rankings`) | Exact-variant and species-level rankings from the same engine, Top 10/25/50/100/all, 10 filters, ties share ranks, "Unranked / insufficient data" section. |
| **Pokédex** (`/pokedex`, `/pokemon/[id]`) | All 1,024 species (940 released in GO per sources), forms gallery, configurable variant score, availability facts with sources. |
| **My collection** (`/collection`) | Local (IndexedDB) instances with full variant config, quantity, nickname, notes, favorite, traded flag, date; dashboard stats; search/filter/sort; JSON backup export/import. |
| **Wishlist** (`/wishlist`) | Desired variants with rarity, sort, remove, "got it!" → moves to collection. |
| **Voice search** | `he-IL` Web Speech API, capability detection, permission/timeout/no-speech/network handling, multiple candidates, user must confirm. No audio is stored. |
| **Settings / Help** | Language, reduced motion, local-data wipe; methodology page generated from the live scoring config. |
| **Admin** (`/admin`) | Internal read-only data-quality dashboard (not linked in nav, `noindex`). |

No Stardust calculations (by design).

## Quick start

```bash
npm ci
npm run dev            # http://localhost:3000
npm test               # unit tests (Vitest)
npm run build          # validates/publishes catalog, then static export to ./out
npm start              # serve ./out on http://localhost:4173
npm run test:e2e       # Playwright (needs a build)
```

Catalog maintenance:

```bash
npm run data:update    # fetch upstream sources + rebuild & validate catalog
npm run data:rollback  # list snapshots;  npm run data:rollback -- <version>  to restore
```

## Architecture

```
src/domain/catalog   Zod schemas, catalog index, variant model, attribute validation layer
src/domain/rarity    versioned scoring config, engine, explanations, rankings
src/domain/trade     trade-eligibility rules (independent of rarity)
src/domain/search    Hebrew normalization, phonetic matching, transliteration, search index
src/domain/i18n      Hebrew (default) + English strings
src/lib              IndexedDB storage, backup, voice hook, image URLs
src/components       UI components and screens
scripts/pipeline     fetch-sources → build-catalog → snapshots / changelog / report; rollback
data/curation        curated, source-attributed facts + Hebrew names (reviewed by humans)
public/data          published catalog.json + report.json (data-quality)
```

Docs: [Rarity methodology](docs/RARITY_METHODOLOGY.md) · [Data sources & licensing](docs/DATA_SOURCES.md) · [Deployment](docs/DEPLOYMENT.md) · [Privacy & security](docs/PRIVACY_SECURITY.md) · [Testing](docs/TESTING.md)
