"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Catalog } from "@/domain/catalog/schema";
import { CatalogIndex } from "@/domain/catalog/catalog-index";
import { SearchIndex } from "@/domain/search/search";
import { withBase } from "@/lib/base-path";

interface CatalogCtx {
  status: "loading" | "ready" | "error";
  idx: CatalogIndex | null;
  search: SearchIndex | null;
  reload: () => void;
}

const Ctx = createContext<CatalogCtx | null>(null);
let cache: { idx: CatalogIndex; search: SearchIndex } | null = null;

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<CatalogCtx, "reload">>(
    cache ? { status: "ready", ...cache } : { status: "loading", idx: null, search: null },
  );
  const load = useCallback(() => {
    if (cache) {
      setState({ status: "ready", ...cache });
      return;
    }
    setState({ status: "loading", idx: null, search: null });
    fetch(withBase("/data/catalog.json"))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json) => {
        const parsed = Catalog.parse(json); // never trust the network blindly
        const idx = new CatalogIndex(parsed);
        cache = { idx, search: new SearchIndex(idx) };
        setState({ status: "ready", ...cache });
      })
      .catch(() => setState({ status: "error", idx: null, search: null }));
  }, []);
  useEffect(() => {
    if (!cache) load();
  }, [load]);
  return <Ctx.Provider value={{ ...state, reload: load }}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside CatalogProvider");
  return c;
}
