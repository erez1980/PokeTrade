"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { variantKey } from "@/domain/catalog/variant";
import { scoreVariant } from "@/domain/rarity/engine";
import { isTradeBlocked, tradeNotices } from "@/domain/trade/rules";
import { makeBackup, parseBackup } from "@/lib/storage/backup";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { useStore } from "../providers/StoreProvider";
import { useToast } from "../Toast";
import { CatalogGate, EmptyState, PageTitle } from "../States";
import { PokemonImage } from "../PokemonImage";
import { ConfidenceBadge, Tag } from "../Badges";
import { IconCompare, IconDownload, IconEdit, IconLock, IconPlus, IconStar, IconStarFilled, IconTrash, IconUpload } from "../Icons";
import { variantTags } from "@/lib/describe";

type Filter = "all" | "favorite" | "shiny" | "lucky" | "shadow" | "purified" | "dynamax" | "gigantamax" | "costume" | "background";

export function CollectionScreen() {
  return (
    <CatalogGate>
      <Inner />
    </CatalogGate>
  );
}

function Inner() {
  const { idx } = useCatalog();
  const { m, lang, fmt } = useI18n();
  const store = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"name" | "rarity" | "date">("date");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    if (!idx) return [];
    return store.collection
      .map((c) => ({ c, s: idx.getSpecies(c.variant.speciesId), r: scoreVariant(idx, c.variant), key: variantKey(c.variant) }))
      .filter((x) => x.s);
  }, [idx, store.collection]);

  const dupCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.key, (map.get(r.key) ?? 0) + r.c.quantity);
    return map;
  }, [rows]);

  const stats = useMemo(() => {
    const sum = (f: (x: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((n, x) => n + x.c.quantity, 0);
    const rarest = rows.filter((x) => x.r.score !== null).sort((a, b) => b.r.score! - a.r.score!)[0];
    return {
      total: sum(() => true),
      species: new Set(rows.map((x) => x.c.variant.speciesId)).size,
      shiny: sum((x) => x.c.variant.shiny),
      lucky: sum((x) => x.c.variant.lucky),
      max: sum((x) => x.c.variant.maxState !== "none"),
      background: sum((x) => !!x.c.variant.backgroundId),
      rarest,
    };
  }, [rows]);

  const list = useMemo(() => {
    if (!idx) return [];
    const ql = q.trim().toLowerCase();
    let l = rows.filter(({ c, s }) => {
      const v = c.variant;
      const form = idx.getForm(v.formId)?.form;
      const pass: Record<Filter, boolean> = {
        all: true,
        favorite: c.favorite,
        shiny: v.shiny,
        lucky: v.lucky,
        shadow: v.shadowState === "shadow",
        purified: v.shadowState === "purified",
        dynamax: v.maxState === "dynamax",
        gigantamax: v.maxState === "gigantamax",
        costume: form?.kind === "costume",
        background: !!v.backgroundId,
      };
      if (!pass[filter]) return false;
      if (!ql) return true;
      return [s!.name.he, s!.name.en, c.nickname ?? "", String(s!.id)].some((t) => t.toLowerCase().includes(ql));
    });
    l = [...l].sort((a, b) =>
      sort === "name"
        ? a.s!.name[lang].localeCompare(b.s!.name[lang], lang)
        : sort === "rarity"
          ? (b.r.score ?? -1) - (a.r.score ?? -1)
          : b.c.createdAt.localeCompare(a.c.createdAt),
    );
    return l;
  }, [idx, rows, q, filter, sort, lang]);

  if (!idx) return null;

  const doExport = () => {
    const data = JSON.stringify(makeBackup(store.collection, store.wishlist), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `poketrade-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const doImport = async (file: File) => {
    const text = await file.text();
    const res = parseBackup(text, (id) => !!idx.getSpecies(id));
    if (!res.ok) {
      toast(m.collection.importBad);
      return;
    }
    const n = await store.importData(res.collection, res.wishlist);
    toast(fmt(m.collection.importOk, { n }));
  };

  const FILTERS: Filter[] = ["all", "favorite", "shiny", "lucky", "shadow", "purified", "dynamax", "gigantamax", "costume", "background"];
  const filterLabel = (f: Filter) => (f === "all" ? m.collection.filterAll : f === "favorite" ? m.collection.favoritesOnly : f === "costume" ? m.attrs.costume : m.attrs[f]);

  return (
    <div>
      <PageTitle title={m.collection.title}>
        <Link href="/collection/entry/" className="btn btn-primary"><IconPlus /> {m.collection.add}</Link>
      </PageTitle>

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" aria-label="stats">
        {([
          [m.collection.stats.total, stats.total],
          [m.collection.stats.species, stats.species],
          [m.collection.stats.shiny, stats.shiny],
          [m.collection.stats.lucky, stats.lucky],
          [m.collection.stats.max, stats.max],
          [m.collection.stats.background, stats.background],
        ] as const).map(([label, val]) => (
          <div key={label} className="card p-3 text-center">
            <p className="ltr text-2xl font-black text-violet-700">{val}</p>
            <p className="text-xs font-bold text-ink-soft">{label}</p>
          </div>
        ))}
        <div className="card col-span-2 flex items-center gap-2 p-3 sm:col-span-3 lg:col-span-1">
          {stats.rarest ? (
            <>
              <PokemonImage species={stats.rarest.s!} form={idx.getForm(stats.rarest.c.variant.formId)?.form} shiny={stats.rarest.c.variant.shiny} size={44} sparkle={false} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-ink-soft">{m.collection.stats.rarest}</p>
                <p className="truncate text-sm font-black">{stats.rarest.s!.name[lang]} <span className="ltr">{stats.rarest.r.score}</span></p>
              </div>
            </>
          ) : (
            <p className="text-xs text-ink-soft">{m.collection.stats.rarest}: —</p>
          )}
        </div>
      </section>

      {store.memoryMode && <p className="mb-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-900">⚠️ {m.collection.storageNote}</p>}

      {store.collection.length === 0 ? (
        <EmptyState title={m.collection.empty} emoji="🎒">
          <Link href="/collection/entry/" className="btn btn-primary"><IconPlus /> {m.collection.add}</Link>
        </EmptyState>
      ) : (
        <>
          <div className="card mb-3 space-y-2 p-3">
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" type="search" placeholder={m.collection.search} aria-label={m.collection.search} value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="sort">
                <option value="date">{m.collection.sortDate}</option>
                <option value="name">{m.collection.sortName}</option>
                <option value="rarity">{m.collection.sortRarity}</option>
              </select>
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {FILTERS.map((f) => (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={`chip !px-3 !py-1.5 text-sm ${filter === f ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-800"}`}>
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ c, s, r, key }) => {
              const form = idx.getForm(c.variant.formId)?.form;
              const blocked = isTradeBlocked(tradeNotices(idx, c.variant, { alreadyTraded: c.alreadyTraded }));
              const dups = dupCount.get(key) ?? 0;
              return (
                <li key={c.id} className="card flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-3">
                    <PokemonImage species={s!} form={form} shiny={c.variant.shiny} size={72} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black">{c.nickname || s!.name[lang]}</p>
                      {c.nickname && <p className="truncate text-xs text-ink-soft">{s!.name[lang]}</p>}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {variantTags(idx, c.variant, m, lang).map((t) => <Tag key={t}>{t}</Tag>)}
                        {c.quantity > 1 && <Tag tone="sky">×{c.quantity}</Tag>}
                        {blocked && <Tag tone="berry"><IconLock size={12} /> {m.trade.blocked}</Tag>}
                      </div>
                    </div>
                    <button className="btn btn-ghost h-10 w-10 !p-0" aria-pressed={c.favorite} aria-label={m.actions.favorite} onClick={() => store.saveInstance({ ...c, favorite: !c.favorite })}>
                      {c.favorite ? <IconStarFilled className="text-amber-500" /> : <IconStar />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-violet-50 px-3 py-1.5">
                    <span className="text-sm font-bold">{r.score !== null ? <><span className="ltr">{r.score}</span>/100 <span className="text-[10px] text-ink-soft">{m.compare.estimated}</span></> : m.compare.noScore}</span>
                    <ConfidenceBadge confidence={r.confidence} />
                  </div>
                  {dups > 1 && <p className="text-[11px] font-semibold text-sky-700">{fmt(m.collection.duplicates, { n: dups })}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <Link className="btn btn-ghost !min-h-9 !py-1 text-sm" href={`/?a=${encodeURIComponent(key)}`}><IconCompare size={16} /> {m.actions.compare}</Link>
                    <Link className="btn btn-ghost !min-h-9 !py-1 text-sm" href={`/collection/entry/?id=${encodeURIComponent(c.id)}`}><IconEdit size={16} /> {m.actions.edit}</Link>
                    {confirmId === c.id ? (
                      <button className="btn btn-danger !min-h-9 !py-1 text-sm" onClick={() => { store.removeInstance(c.id); setConfirmId(null); }}>{m.actions.confirmRemove}</button>
                    ) : (
                      <button className="btn btn-ghost !min-h-9 !py-1 text-sm" onClick={() => setConfirmId(c.id)} aria-label={`${m.actions.remove} ${s!.name[lang]}`}><IconTrash size={16} /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <section className="card mt-6 space-y-2 p-4">
        <h2 className="font-black">{m.collection.backup}</h2>
        <p className="text-sm text-ink-soft">{m.collection.storageNote}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={doExport}><IconDownload size={18} /> {m.collection.export}</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}><IconUpload size={18} /> {m.collection.import}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="import-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}
