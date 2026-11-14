import { describe, expect, it } from "vitest";
import { fixtureIndex, realIndex } from "./fixtures";
import { defaultVariant } from "@/domain/catalog/variant";
import { isTradeBlocked, tradeNotices } from "@/domain/trade/rules";
import { scoreVariant } from "@/domain/rarity/engine";

const idx = fixtureIndex();
const v = (id: number, p = {}) => ({ ...defaultVariant(id, idx.defaultForm(idx.getSpecies(id)!).id), ...p });
const ids = (n: ReturnType<typeof tradeNotices>) => n.map((x) => x.id);

describe("trade rules", () => {
  it("blocks Mythicals except curated exceptions", () => {
    expect(isTradeBlocked(tradeNotices(idx, v(5)))).toBe(true);
    expect(isTradeBlocked(tradeNotices(idx, v(10)))).toBe(false);
  });
  it("blocks previously traded (and Lucky) Pokémon", () => {
    expect(ids(tradeNotices(idx, v(1), { alreadyTraded: true }))).toContain("TR.TRADED");
    expect(ids(tradeNotices(idx, v(1, { lucky: true })))).toContain("TR.TRADED");
  });
  it("blocks Shadow Pokémon", () => {
    expect(ids(tradeNotices(idx, v(1, { shadowState: "shadow" })))).toContain("TR.SHADOW");
    expect(isTradeBlocked(tradeNotices(idx, v(1, { shadowState: "purified" })))).toBe(false);
  });
  it("marks Gigantamax as Special Trade and Max as keep-one", () => {
    const n = ids(tradeNotices(idx, v(6, { maxState: "gigantamax" })));
    expect(n).toContain("TR.GMAX_SPECIAL");
    expect(n).toContain("TR.MAX_KEEP");
  });
  it("notes location backgrounds as Special Trades and remote limits", () => {
    const n = ids(tradeNotices(idx, v(2, { backgroundId: "LC_TEST_CITY_GOFEST_001" })));
    expect(n).toContain("TR.LOCATION_SPECIAL");
    expect(n).toContain("TR.REMOTE_LIMITS");
  });
  it("never changes the rarity score", () => {
    const a = scoreVariant(idx, v(1));
    tradeNotices(idx, v(1), { alreadyTraded: true });
    expect(scoreVariant(idx, v(1))).toEqual(a);
  });
  it("handles fused and crowned forms on the real catalog", () => {
    const real = realIndex();
    const kyurem = real.getSpecies(646)!.forms.find((f) => /BLACK|WHITE/.test(f.id));
    if (kyurem) expect(ids(tradeNotices(real, { ...defaultVariant(646, kyurem.id) }))).toContain("TR.FUSION");
    const zacian = real.getSpecies(888)!.forms.find((f) => /CROWNED/.test(f.id));
    if (zacian) expect(ids(tradeNotices(real, { ...defaultVariant(888, zacian.id) }))).toContain("TR.CROWNED_REMOTE");
  });
});
