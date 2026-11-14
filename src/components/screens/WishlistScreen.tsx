"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { variantKey, type VariantConfig } from "@/domain/catalog/variant";
import { scoreVariant } from "@/domain/rarity/engine";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { useStore } from "../providers/StoreProvider";
import { useToast } from "../Toast";
import { CatalogGate, EmptyState, PageTitle } from "../States";
import { PokemonImage } from "../PokemonImage";
import { PokemonPicker } from "../PokemonPicker";
import { VariantConfigurator } from "../VariantConfigurator";
import { ConfidenceBadge, Tag, TierBadge } from "../Badges";
import { IconCheck, IconCompare, IconPlus, IconTrash } from "../Icons";
import { variantTags } from "@/lib/describe";

export function WishlistScreen() {
  return (
    <CatalogGate>
      <Inner />
    </CatalogGate>
  );
}

function Inner() {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const store = useStore();
  const toast = useToast();
  const [sort, setSort] = useState<"rarity" | "date">("date");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<VariantConfig | null>(null);

  const list = useMemo(() => {
    if (!idx) return [];
    return store.wishlist
      .map((w) => ({ w, s: idx.getSpecies(w.variant.speciesId), r: scoreVariant(idx, w.variant) }))
      .filter((x) => x.s)
      .sort((a, b) => (sort === "rarity" ? (b.r.score ?? -1) - (a.r.score ?? -1) : b.w.createdAt.localeCompare(a.w.createdAt)));
  }, [idx, store.wishlist, sort]);
  if (!idx) return null;

  return (
    <div>
      <PageTitle title={m.wishlist.title} subtitle={m.wishlist.private}>
        <button className="btn btn-primary" onClick={() => { setAdding((x) => !x); setDraft(null); }} aria-expanded={adding}><IconPlus /> {m.wishlist.add}</button>
      </PageTitle>

      {adding && (
        <section className="card pop-in mb-4 space-y-3 p-4">
          {!draft ? (
            <PokemonPicker onSelect={setDraft} autoFocus showSaved={false} />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <PokemonImage species={idx.getSpecies(draft.speciesId)!} form={idx.getForm(draft.formId)?.form} shiny={draft.shiny} size={72} />
                <p className="text-xl font-black">{idx.getSpecies(draft.speciesId)!.name[lang]}</p>
                <button className="btn btn-ghost ms-auto !min-h-9 !py-1 text-sm" onClick={() => setDraft(null)}>{m.picker.change}</button>
              </div>
              <VariantConfigurator value={draft} onChange={setDraft} />
              <button
                className="btn btn-primary"
                disabled={store.isWished(draft)}
                onClick={async () => {
                  await store.addWish(draft);
                  toast(m.actions.added);
                  setDraft(null);
                  setAdding(false);
                }}
              >
                {store.isWished(draft) ? m.actions.inWishlist : m.actions.addWishlist}
              </button>
            </>
          )}
        </section>
      )}

      {list.length === 0 ? (
        <EmptyState title={m.wishlist.empty} emoji="💫" />
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="sort">
              <option value="date">{m.wishlist.sortDate}</option>
              <option value="rarity">{m.wishlist.sortRarity}</option>
            </select>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ w, s, r }) => {
              const owned = store.ownedCount(w.variant);
              return (
                <li key={w.id} className="card flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-3">
                    <PokemonImage species={s!} form={idx.getForm(w.variant.formId)?.form} shiny={w.variant.shiny} size={72} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black">{s!.name[lang]}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {variantTags(idx, w.variant, m, lang).map((t) => <Tag key={t}>{t}</Tag>)}
                        {owned > 0 && <Tag tone="leaf">{m.actions.inCollection}</Tag>}
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft">{m.wishlist.added}: {new Date(w.createdAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-violet-50 px-3 py-1.5">
                    <span className="text-sm font-bold">{r.score !== null ? <><span className="ltr">{r.score}</span>/100</> : m.compare.noScore}</span>
                    <TierBadge tier={r.tier} />
                    <ConfidenceBadge confidence={r.confidence} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button className="btn btn-sun !min-h-9 !py-1 text-sm" onClick={async () => { await store.wishToCollection(w.id); toast(m.wishlist.obtainedNote); }}>
                      <IconCheck size={16} /> {m.actions.obtained}
                    </button>
                    <Link className="btn btn-ghost !min-h-9 !py-1 text-sm" href={`/?a=${encodeURIComponent(variantKey(w.variant))}`}><IconCompare size={16} /> {m.actions.compare}</Link>
                    <button className="btn btn-ghost !min-h-9 !py-1 text-sm" onClick={() => store.removeWish(w.id)} aria-label={`${m.actions.remove} ${s!.name[lang]}`}><IconTrash size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
