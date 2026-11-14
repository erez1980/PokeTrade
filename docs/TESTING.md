# Testing

```bash
npm test          # Vitest – 95 unit tests
npm run build && npm run test:e2e        # Playwright – Chromium desktop + Android emulation
E2E_ALL_BROWSERS=1 npm run test:e2e      # + iOS Safari (WebKit), desktop Safari, Firefox (CI does this)
```

| Suite | Covers |
|---|---|
| `rarity.test.ts` | Determinism, identical/swap symmetry, meter = scores, no fabricated scores for unverified/unreleased/impossible, missing evidence → low confidence, no double counting, "Shiny ≠ always rarer", thresholds + low-confidence widening, Hebrew explanations, rankings use the same engine, ties, filters, real-catalog sanity |
| `validate.test.ts` | Impossible/unverified combinations, sanitize, variant-key round trip, real catalog integrity (complete, unique ids, normal forms) |
| `search.test.ts` | Hebrew aliases (מיוטו / מיו טו / Mewtwo / 150 …), typos, every released species findable by English, Hebrew and number, regional form words, unreleased hidden |
| `trade.test.ts` | Mythical, previously traded/Lucky, Shadow, G-Max special trade, Max keep-one, backgrounds, fused/crowned, rarity untouched |
| `storage.test.ts` | IndexedDB persistence across reload, duplicates, invalid rows, backup round-trip, tampered files, unknown species, merge |
| `voice.test.tsx` | Unsupported browser, he-IL, explicit start, alternatives, permission denied, cancel, timeout; Hebrew transcripts → search; ambiguity; unrecognised speech |
| `tests/e2e/app.spec.ts` | Child compare flow, swap, disabled combos with explanation, insufficient data, keyboard combobox, voice (mocked recognizer) + unsupported, rankings filters, Pokédex → details, collection persistence + compare from collection, wishlist → collection, backup export/import, no horizontal scroll / RTL / accessible names on all pages, English UI, no Stardust |

**Manual checks still required on real devices** (cannot be automated here): actual Hebrew speech recognition on iOS Safari and Android Chrome (real voices, background noise, short utterances), screen readers (VoiceOver/TalkBack).
