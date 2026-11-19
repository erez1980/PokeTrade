"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PokemonBackground } from "@/domain/catalog/schema";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { BackgroundArt } from "./BackgroundArt";
import { IconCheck, IconSearch, IconX } from "./Icons";

type Tab = "verified" | "location" | "special";

/** Visual gallery for choosing a special / location background. */
export function BackgroundPicker({ speciesId, value, onChange }: { speciesId: number; value: string | null; onChange: (id: string | null) => void }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const all = useMemo(() => idx?.catalog.backgrounds ?? [], [idx]);
  const verified = useMemo(() => all.filter((b) => b.verifiedSpecies.includes(speciesId)), [all, speciesId]);
  const [tab, setTab] = useState<Tab>("location");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setTab(verified.length ? "verified" : "location");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      triggerRef.current?.focus();
    };
  }, [open, verified.length]);

  if (!idx) return null;
  const current = value ? idx.getBackground(value) : undefined;
  const ql = q.trim().toLowerCase();
  const list = (tab === "verified" ? verified : all.filter((b) => b.kind === tab))
    .filter((b) => !ql || b.name.en.toLowerCase().includes(ql) || b.name.he.includes(q.trim()) || b.id.toLowerCase().includes(ql))
    .sort((a, b) => Number(b.verifiedSpecies.includes(speciesId)) - Number(a.verifiedSpecies.includes(speciesId)) || (b.year ?? 0) - (a.year ?? 0) || a.name.en.localeCompare(b.name.en));
  const isVerified = (b: PokemonBackground) => b.verifiedSpecies.includes(speciesId);

  return (
    <div>
      <p className="mb-1 text-sm font-bold text-ink-soft">{m.attrs.background}</p>
      <button ref={triggerRef} type="button" className="flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-violet-100 bg-white p-1.5 text-start hover:border-violet-300" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {current ? (
          <BackgroundArt bg={current} className="h-12 w-12 shrink-0 rounded-xl" label={current.name[lang]} />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl" aria-hidden>🖼️</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{current ? current.name[lang] : m.attrs.noBackground}</span>
          <span className="block text-[11px] text-ink-soft">
            {current ? (isVerified(current) ? `✓ ${m.bg.verifiedFor}` : m.attrs.unverifiedTag) : m.bg.choose}
          </span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={m.bg.title}
            className="pop-in flex max-h-[88dvh] w-full max-w-3xl flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-violet-100 p-3">
              <h2 className="flex-1 text-lg font-black">{m.bg.title}</h2>
              <button type="button" className="btn btn-ghost h-10 w-10 !p-0" onClick={() => setOpen(false)} aria-label={m.actions.close}><IconX /></button>
            </div>
            <div className="space-y-2 p-3">
              <label className="relative block">
                <span className="sr-only">{m.bg.search}</span>
                <IconSearch className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-violet-400 [inset-inline-start:0.85rem]" size={18} />
                <input className="input ps-10" type="search" placeholder={m.bg.search} value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <div className="flex gap-1.5 overflow-x-auto" role="tablist">
                {(["verified", "location", "special"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} className={`chip !px-3 !py-1.5 text-sm ${tab === t ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-800"}`} onClick={() => setTab(t)}>
                    {t === "verified" ? `✓ ${m.bg.tabVerified} (${verified.length})` : t === "location" ? m.attrs.locationBackground : m.attrs.specialBackground}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {tab === "verified" && verified.length === 0 && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{m.bg.noneVerified}</p>}
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                <li>
                  <button type="button" onClick={() => { onChange(null); setOpen(false); }} aria-pressed={!value} className={`flex h-full w-full flex-col items-center gap-1 rounded-2xl p-1.5 text-center ${!value ? "bg-violet-100 ring-2 ring-violet-500" : "bg-slate-50 hover:bg-violet-50"}`}>
                    <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-white text-2xl" aria-hidden>🚫</span>
                    <span className="text-[11px] font-bold">{m.attrs.noBackground}</span>
                  </button>
                </li>
                {list.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => { onChange(b.id); setOpen(false); }} aria-pressed={value === b.id} className={`relative flex h-full w-full flex-col items-center gap-1 rounded-2xl p-1.5 text-center ${value === b.id ? "bg-violet-100 ring-2 ring-violet-500" : "bg-slate-50 hover:bg-violet-50"}`}>
                      <BackgroundArt bg={b} className="aspect-square w-full rounded-xl" label={b.name[lang]} />
                      {isVerified(b) && <span className="absolute end-2 top-2 rounded-full bg-emerald-500 p-0.5 text-white shadow" title={m.bg.verifiedFor}><IconCheck size={12} /></span>}
                      <span className="line-clamp-2 text-[11px] font-bold leading-tight">{b.name[lang]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
