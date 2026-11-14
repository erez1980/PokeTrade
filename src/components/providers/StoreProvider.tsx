"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collectionStore, isMemoryMode, wishlistStore } from "@/lib/storage/db";
import { newId, type UserPokemonInstance, type WishlistEntry } from "@/lib/storage/schema";
import { mergeById } from "@/lib/storage/backup";
import { variantKey, type VariantConfig } from "@/domain/catalog/variant";

interface StoreCtx {
  ready: boolean;
  memoryMode: boolean;
  collection: UserPokemonInstance[];
  wishlist: WishlistEntry[];
  saveInstance: (i: Omit<UserPokemonInstance, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => Promise<UserPokemonInstance>;
  removeInstance: (id: string) => Promise<void>;
  addWish: (v: VariantConfig) => Promise<WishlistEntry>;
  removeWish: (id: string) => Promise<void>;
  wishToCollection: (id: string) => Promise<void>;
  importData: (c: UserPokemonInstance[], w: WishlistEntry[]) => Promise<number>;
  clearAll: () => Promise<void>;
  ownedCount: (v: VariantConfig) => number;
  isWished: (v: VariantConfig) => boolean;
}

const Ctx = createContext<StoreCtx | null>(null);
const CHANNEL = "poketrade-store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [collection, setCollection] = useState<UserPokemonInstance[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);

  const refresh = useCallback(async () => {
    const [c, w] = await Promise.all([collectionStore.all(), wishlistStore.all()]);
    setCollection(c);
    setWishlist(w);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    // keep several open tabs in sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = () => refresh();
    } catch {
      /* unsupported */
    }
    return () => bc?.close();
  }, [refresh]);

  const notify = () => {
    try {
      const bc = new BroadcastChannel(CHANNEL);
      bc.postMessage("changed");
      bc.close();
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<StoreCtx>(() => {
    const now = () => new Date().toISOString();
    return {
      ready,
      memoryMode: ready && isMemoryMode(),
      collection,
      wishlist,
      async saveInstance(input) {
        const existing = input.id ? collection.find((c) => c.id === input.id) : undefined;
        const rec: UserPokemonInstance = {
          ...input,
          id: input.id ?? newId(),
          createdAt: existing?.createdAt ?? input.createdAt ?? now(),
          updatedAt: now(),
        };
        await collectionStore.put(rec);
        setCollection((cur) => (existing ? cur.map((c) => (c.id === rec.id ? rec : c)) : [...cur, rec]));
        notify();
        return rec;
      },
      async removeInstance(id) {
        await collectionStore.delete(id);
        setCollection((cur) => cur.filter((c) => c.id !== id));
        notify();
      },
      async addWish(v) {
        const rec: WishlistEntry = { id: newId(), variant: v, createdAt: now() };
        await wishlistStore.put(rec);
        setWishlist((cur) => [...cur, rec]);
        notify();
        return rec;
      },
      async removeWish(id) {
        await wishlistStore.delete(id);
        setWishlist((cur) => cur.filter((w) => w.id !== id));
        notify();
      },
      async wishToCollection(id) {
        const w = wishlist.find((x) => x.id === id);
        if (!w) return;
        const t = now();
        const rec: UserPokemonInstance = { id: newId(), variant: w.variant, quantity: 1, favorite: false, alreadyTraded: w.variant.lucky, obtainedAt: t.slice(0, 10), createdAt: t, updatedAt: t };
        await collectionStore.put(rec);
        await wishlistStore.delete(id);
        setCollection((cur) => [...cur, rec]);
        setWishlist((cur) => cur.filter((x) => x.id !== id));
        notify();
      },
      async importData(c, w) {
        const mc = mergeById(collection, c);
        const mw = mergeById(wishlist, w);
        for (const x of mc.added) await collectionStore.put(x);
        for (const x of mw.added) await wishlistStore.put(x);
        setCollection(mc.merged);
        setWishlist(mw.merged);
        notify();
        return mc.added.length + mw.added.length;
      },
      async clearAll() {
        await collectionStore.clear();
        await wishlistStore.clear();
        setCollection([]);
        setWishlist([]);
        notify();
      },
      ownedCount(v) {
        const k = variantKey(v);
        return collection.filter((c) => variantKey(c.variant) === k).reduce((n, c) => n + c.quantity, 0);
      },
      isWished(v) {
        const k = variantKey(v);
        return wishlist.some((w) => variantKey(w.variant) === k);
      },
    };
  }, [ready, collection, wishlist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}
