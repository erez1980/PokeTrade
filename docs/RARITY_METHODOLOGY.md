# Rarity methodology (scoring v1.0.0, effective 2026-11-14)

The in-app page `/help` is generated from `src/domain/rarity/config.ts`; this document explains the reasoning. Any change to points, groups or thresholds **must** bump `SCORING_VERSION` and update this file.

## What the score is — and is not

* An **estimated rarity index** from 0 to 100 for one *exact* variant (species + form + characteristics).
* It is **not** a probability, not official odds, and not a count of owners. No global ownership numbers exist publicly; we never show any.
* Battle power, CP, PvP value and money are never inputs.

## Pipeline

1. **Validate** the variant (`src/domain/catalog/validate.ts`). Every selected characteristic is `available`, `impossible` or `unverified`.
   * `impossible` → the variant is rejected (e.g. Shadow + Lucky, Shadow + Dynamax, Gigantamax on a species without G-Max, Lucky on an untradable Mythical, Shiny never released).
   * `unverified` → **no score** ("insufficient data"). Examples: Shiny costume forms, Shiny Shadow, Shiny Max, any background not linked to that species by a curator, Hisuian/Paldean forms not confirmed released.
2. **Collect factors** from catalog facts. Factors are grouped; **within a group only the strongest factor counts** (no double counting — e.g. "Legendary" and "raid exclusive" describe the same limitation).
3. **Sum** the counted factors, round, clamp to 0–100.
4. **Confidence** = the lowest confidence among counted factors; lowered to *low* when a standard species has no acquisition evidence at all (missing evidence never makes a Pokémon "common", it lowers confidence).

| Group | Factor | Points | Evidence | Confidence |
|---|---|---|---|---|
| acquisition (one) | Mythical | 70 | game master class | high |
| | Legendary / Ultra Beast | 55 | game master / pogoapi | high / medium |
| | Photobomb-only, research-only, raid-only | 45 | pogoapi lists | medium |
| | Baby | 25 | pogoapi | medium |
| | Standard | 18 | — | medium |
| | Standard, nests | 8 | pogoapi nesting list | medium |
| distribution | Regional exclusive (original form only) | +20 | curated list | medium |
| form | Costume / event form | +15 | game assets | medium |
| shiny | Full-odds category (wild/egg/photobomb of standard species) | +30 | community research (~1/500) | medium |
| | Boosted category (raid/legendary/research-only) | +15 | community research (~1/20 legendary raids) | medium |
| | Shiny Mythical | +20 | pogoapi | medium |
| trade | Lucky | +10 | official trading FAQ | high |
| shadow | Shadow / Purified | +10 | pogoapi | medium |
| max | Dynamax / Gigantamax | +20 / +35 | game master Max settings | medium |
| background | Location / special background (verified links only) | +20 / +12 | game master + curation | medium |
| size | XXL / XXS | +5 | game master size bounds | low |
| move | Legacy / exclusive move | +5 | game master elite moves | medium |

Shiny rates are used **only to pick a category**; they are never shown to the user as a probability. A Shiny is therefore **not** automatically rarer than a Legendary: a Shiny nesting species scores 38, a normal Legendary 55.

## Comparison

* `diff = scoreA − scoreB`. Thresholds (configurable in `THRESHOLDS`): `|diff| ≥ 15` → "much rarer"; `5–14` → "a bit rarer"; `< 5` → "about equal".
* If either side has **low** confidence, the "about equal" band is doubled (`lowConfidenceWidening`).
* If either side has no score → "We can't tell for sure which one is rarer".
* **Meter** position = `a / (a + b)` — the same numbers as the scores, so they can never disagree. It is labelled as *not* a probability.
* Calibration: `tests/unit/rarity.test.ts` holds the curated test dataset (common, legendary, mythical, shiny, costume, regional, Dynamax, Gigantamax, backgrounds, unknown/unreleased) and asserts orderings and threshold behaviour.

## Tiers

Mythic-tier ≥ 85, Ultra rare ≥ 70, Rare ≥ 50, Uncommon ≥ 30, Common < 30.

## Rankings

`src/domain/rarity/rankings.ts` enumerates every released species × form × single characteristic (Shiny, Shadow, Dynamax, Gigantamax) plus curator-verified backgrounds, scores each with the **same engine**, and assigns competition ranks (equal scores share a rank and are labelled "tie"). Variants without a score are listed in "Unranked / insufficient data". Species-level ranking uses the default form without characteristics and is shown separately.

## Lucky

A Lucky you *own* is scored as a variant (it can only come from a trade). This is different from the chance of a trade *becoming* Lucky, which the app does not model.

## Re-evaluation

When the game changes, `npm run data:update` rebuilds the catalog; scores re-evaluate automatically because they are computed from catalog facts at runtime. Curated facts live in `data/curation/evidence.json` and require a source per entry.

## Known gaps (documented, not hidden)

* No dataset reliably links backgrounds to species → all backgrounds are "unverified" until curated.
* Shiny availability per costume / Shadow / Max is not in our sources → "unverified".
* The released-species list (pogoapi.net) is a snapshot that can lag brand-new releases; a documented Shiny release also counts as release evidence, and `releasedOverrides` allows corrections.
* Event re-release frequency is not modelled (no reliable machine-readable history).
