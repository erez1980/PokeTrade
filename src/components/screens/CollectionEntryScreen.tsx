"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseVariantKey, type VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { useStore } from "../providers/StoreProvider";
import { useToast } from "../Toast";
import { CatalogGate, PageTitle } from "../States";
import { PokemonPicker } from "../PokemonPicker";
import { PokemonImage } from "../PokemonImage";
import { PokemonOnBackground } from "../PokemonOnBackground";
import { VariantConfigurator } from "../VariantConfigurator";
import { TradeNotices } from "../TradeNotices";

export function CollectionEntryScreen() {
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
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [v, setV] = useState<VariantConfig | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [nickname, setNickname] = useState("");
  const [notes, setNotes] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [traded, setTraded] = useState(false);
  const [obtainedAt, setObtainedAt] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store.ready || loaded) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get("id");
    const existing = id ? store.collection.find((c) => c.id === id) : undefined;
    if (existing) {
      setEditId(existing.id);
      setV(existing.variant);
      setQuantity(existing.quantity);
      setNickname(existing.nickname ?? "");
      setNotes(existing.notes ?? "");
      setFavorite(existing.favorite);
      setTraded(existing.alreadyTraded);
      setObtainedAt(existing.obtainedAt ?? "");
    } else {
      const vk = p.get("v");
      const pv = vk ? parseVariantKey(vk) : null;
      if (pv && idx?.getSpecies(pv.speciesId)) setV(pv);
    }
    setLoaded(true);
  }, [store.ready, store.collection, loaded, idx]);

  if (!idx) return null;
  const species = v ? idx.getSpecies(v.speciesId) : undefined;
  const owned = v && !editId ? store.ownedCount(v) : 0;
  const lucky = v?.lucky ?? false;

  const save = async () => {
    if (!v) return;
    await store.saveInstance({
      id: editId ?? undefined,
      variant: v,
      quantity: Math.max(1, Math.min(9999, Math.floor(quantity) || 1)),
      nickname: nickname.trim().slice(0, 40) || undefined,
      notes: notes.trim().slice(0, 500) || undefined,
      favorite,
      alreadyTraded: traded || lucky,
      obtainedAt: /^\d{4}-\d{2}-\d{2}$/.test(obtainedAt) ? obtainedAt : undefined,
    });
    toast(m.collection.saved);
    router.push("/collection/");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={editId ? m.collection.entryTitleEdit : m.collection.entryTitleNew} />
      <div className="card space-y-4 p-4 sm:p-5">
        {!v || !species ? (
          <>
            <p className="font-bold">{m.collection.chooseFirst}</p>
            <PokemonPicker onSelect={(nv) => setV(nv)} autoFocus showSaved={false} />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <PokemonOnBackground variant={v} size={96} />
              <div>
                <p className="text-2xl font-black">{species.name[lang]}</p>
                <p className="ltr text-start text-sm text-ink-soft">#{species.id} · {species.name.en}</p>
                {!editId && <button className="btn btn-ghost mt-1 !min-h-9 !py-1 text-sm" onClick={() => setV(null)}>{m.picker.change}</button>}
              </div>
            </div>
            {owned > 0 && <p className="rounded-2xl bg-sky-50 p-2 text-sm font-semibold text-sky-800">{fmt(m.collection.duplicates, { n: owned })}</p>}
            <VariantConfigurator value={v} onChange={setV} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-ink-soft">
                {m.collection.quantity}
                <input className="input mt-1" type="number" min={1} max={9999} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </label>
              <label className="text-sm font-bold text-ink-soft">
                {m.collection.nickname}
                <input className="input mt-1" maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </label>
              <label className="text-sm font-bold text-ink-soft">
                {m.collection.obtainedAt}
                <input className="input mt-1" type="date" value={obtainedAt} onChange={(e) => setObtainedAt(e.target.value)} />
              </label>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                  <input type="checkbox" className="h-5 w-5 accent-violet-600" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} /> {m.actions.favorite}
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                  <input type="checkbox" className="h-5 w-5 accent-violet-600" checked={traded || lucky} disabled={lucky} onChange={(e) => setTraded(e.target.checked)} /> {m.collection.traded}
                </label>
              </div>
            </div>
            <label className="block text-sm font-bold text-ink-soft">
              {m.collection.notes}
              <textarea className="input mt-1 min-h-20" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <TradeNotices variant={v} alreadyTraded={traded || lucky} compact />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={save}>{m.actions.save}</button>
              <button className="btn btn-ghost" onClick={() => router.push("/collection/")}>{m.actions.cancel}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
