import { openDB, type IDBPDatabase } from "idb";
import { UserPokemonInstance, WishlistEntry } from "./schema";

/**
 * Local persistence (IndexedDB). No server, no account. If IndexedDB is unavailable
 * (e.g. some private-browsing modes) we fall back to memory and tell the user.
 */
const DB_NAME = "poketrade";
const DB_VERSION = 1;
type StoreName = "collection" | "wishlist";

let dbPromise: Promise<IDBPDatabase> | null = null;
const memory: Record<StoreName, Map<string, unknown>> = { collection: new Map(), wishlist: new Map() };
let memoryMode = false;

function db(): Promise<IDBPDatabase> | null {
  if (memoryMode) return null;
  if (typeof indexedDB === "undefined") {
    memoryMode = true;
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains("collection")) d.createObjectStore("collection", { keyPath: "id" });
        if (!d.objectStoreNames.contains("wishlist")) d.createObjectStore("wishlist", { keyPath: "id" });
      },
    }).catch((e) => {
      memoryMode = true;
      throw e;
    });
  }
  return dbPromise;
}

export function isMemoryMode() {
  return memoryMode;
}

async function getAll<T>(store: StoreName, parse: (x: unknown) => T | null): Promise<T[]> {
  const p = db();
  let rows: unknown[];
  try {
    rows = p ? await (await p).getAll(store) : [...memory[store].values()];
  } catch {
    rows = [...memory[store].values()];
  }
  // Validate every stored record – corrupted or tampered rows are skipped, never rendered.
  return rows.map(parse).filter((x): x is T => x !== null);
}

async function put(store: StoreName, value: { id: string }): Promise<void> {
  const p = db();
  try {
    if (p) {
      await (await p).put(store, value);
      return;
    }
  } catch {
    /* fall through to memory */
  }
  memory[store].set(value.id, value);
}

async function del(store: StoreName, id: string): Promise<void> {
  const p = db();
  try {
    if (p) {
      await (await p).delete(store, id);
      return;
    }
  } catch {
    /* fall through */
  }
  memory[store].delete(id);
}

async function clear(store: StoreName): Promise<void> {
  const p = db();
  try {
    if (p) {
      await (await p).clear(store);
      return;
    }
  } catch {
    /* fall through */
  }
  memory[store].clear();
}

const parseInstance = (x: unknown) => {
  const r = UserPokemonInstance.safeParse(x);
  return r.success ? r.data : null;
};
const parseWish = (x: unknown) => {
  const r = WishlistEntry.safeParse(x);
  return r.success ? r.data : null;
};

export const collectionStore = {
  all: () => getAll("collection", parseInstance),
  put: async (v: UserPokemonInstance) => put("collection", UserPokemonInstance.parse(v)),
  delete: (id: string) => del("collection", id),
  clear: () => clear("collection"),
};

export const wishlistStore = {
  all: () => getAll("wishlist", parseWish),
  put: async (v: WishlistEntry) => put("wishlist", WishlistEntry.parse(v)),
  delete: (id: string) => del("wishlist", id),
  clear: () => clear("wishlist"),
};

/** Test hook: reset module state between tests. */
export function __resetForTests() {
  dbPromise = null;
  memoryMode = false;
  memory.collection.clear();
  memory.wishlist.clear();
}
