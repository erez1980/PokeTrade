import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests, collectionStore, wishlistStore } from "@/lib/storage/db";
import { makeBackup, mergeById, parseBackup } from "@/lib/storage/backup";
import type { UserPokemonInstance, WishlistEntry } from "@/lib/storage/schema";
import { defaultVariant } from "@/domain/catalog/variant";

const inst = (id: string, speciesId = 25): UserPokemonInstance => ({
  id,
  variant: { ...defaultVariant(speciesId, speciesId === 25 ? "PIKACHU_NORMAL" : "X_NORMAL"), shiny: true },
  quantity: 2,
  favorite: true,
  alreadyTraded: false,
  nickname: "Sparky",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const wish = (id: string): WishlistEntry => ({ id, variant: defaultVariant(150, "MEWTWO_NORMAL"), createdAt: "2026-01-02T00:00:00.000Z" });

describe("local persistence (IndexedDB)", () => {
  beforeEach(async () => {
    __resetForTests();
    await collectionStore.clear();
    await wishlistStore.clear();
  });

  it("persists collection and wishlist across a reload (new connection)", async () => {
    await collectionStore.put(inst("a"));
    await wishlistStore.put(wish("w"));
    __resetForTests(); // simulates a page reload: module state gone, IndexedDB kept
    expect(await collectionStore.all()).toEqual([inst("a")]);
    expect(await wishlistStore.all()).toEqual([wish("w")]);
  });

  it("keeps distinct copies of the same variant", async () => {
    await collectionStore.put(inst("a"));
    await collectionStore.put(inst("b"));
    expect(await collectionStore.all()).toHaveLength(2);
  });

  it("rejects invalid records at write time", async () => {
    await expect(collectionStore.put({ ...inst("x"), quantity: 0 })).rejects.toThrow();
  });

  it("deletes entries", async () => {
    await collectionStore.put(inst("a"));
    await collectionStore.delete("a");
    expect(await collectionStore.all()).toHaveLength(0);
  });
});

describe("backup export / import", () => {
  it("round-trips a backup", () => {
    const b = makeBackup([inst("a")], [wish("w")], new Date("2026-02-02"));
    const r = parseBackup(JSON.stringify(b), () => true);
    expect(r.ok).toBe(true);
    expect(r.collection).toEqual([inst("a")]);
    expect(r.wishlist).toEqual([wish("w")]);
  });
  it("rejects malformed or tampered files", () => {
    expect(parseBackup("not json", () => true).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other" }), () => true).ok).toBe(false);
    const bad = makeBackup([{ ...inst("a"), nickname: "<script>".repeat(20) }], []);
    expect(parseBackup(JSON.stringify(bad), () => true).ok).toBe(false); // nickname > 40 chars
  });
  it("skips species that are not in the catalog", () => {
    const r = parseBackup(JSON.stringify(makeBackup([inst("a"), inst("b", 99999)], [])), (id) => id === 25);
    expect(r.collection.map((c) => c.id)).toEqual(["a"]);
    expect(r.skippedUnknown).toBe(1);
  });
  it("merge never overwrites existing entries (duplicate ids)", () => {
    const { merged, added } = mergeById([inst("a")], [{ ...inst("a"), nickname: "changed" }, inst("b")]);
    expect(added.map((x) => x.id)).toEqual(["b"]);
    expect(merged.find((x) => x.id === "a")?.nickname).toBe("Sparky");
  });
});
