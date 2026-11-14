"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { CatalogGate, PageTitle } from "../States";
import { PokemonImage } from "../PokemonImage";
import { Tag } from "../Badges";
import { IconSearch } from "../Icons";

export function PokedexScreen() {
  return (
    <CatalogGate>
      <Inner />
    </CatalogGate>
  );
}

function Inner() {
  const { idx, search } = useCatalog();
  const { m, lang } = useI18n();
  const [q, setQ] = useState("");
  const [rel, setRel] = useState<"released" | "all" | "unreleased">("released");
  const [gen, setGen] = useState(0);
  const [limit, setLimit] = useState(60);
  const sentinel = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    if (!idx || !search) return [];
    let base = q.trim() ? search.search(q, { limit: 60, includeUnreleased: true }).map((h) => h.species) : [...idx.species];
    if (rel === "released") base = base.filter((s) => s.released);
    if (rel === "unreleased") base = base.filter((s) => !s.released);
    if (gen) base = base.filter((s) => s.gen === gen);
    return base;
  }, [idx, search, q, rel, gen]);

  useEffect(() => setLimit(60), [q, rel, gen]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + 60);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!idx) return null;
  const gens = Array.from(new Set(idx.species.map((s) => s.gen))).sort((a, b) => a - b);

  return (
    <div>
      <PageTitle title={m.pokedex.title} subtitle={`${list.length} ${m.pokedex.count}`} />
      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">{m.pokedex.search}</span>
          <IconSearch className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-violet-400 [inset-inline-start:0.85rem]" size={20} />
          <input className="input ps-11" type="search" placeholder={m.pokedex.search} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input sm:!w-auto" value={rel} onChange={(e) => setRel(e.target.value as typeof rel)} aria-label={m.pokedex.filterAll}>
          <option value="released">{m.pokedex.filterReleased}</option>
          <option value="all">{m.pokedex.filterAll}</option>
          <option value="unreleased">{m.pokedex.filterUnreleased}</option>
        </select>
        <select className="input sm:!w-auto" value={gen} onChange={(e) => setGen(Number(e.target.value))} aria-label={m.pokedex.gen}>
          <option value={0}>{m.pokedex.allGens}</option>
          {gens.map((g) => (
            <option key={g} value={g}>{m.pokedex.gen} {g}</option>
          ))}
        </select>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {list.slice(0, limit).map((s) => (
          <li key={s.id}>
            <Link href={`/pokemon/${s.id}/`} className={`card flex h-full flex-col items-center p-3 text-center transition hover:-translate-y-0.5 hover:shadow-xl ${s.released ? "" : "opacity-70"}`}>
              <span className="ltr self-start text-[11px] font-bold text-ink-soft">#{String(s.id).padStart(4, "0")}</span>
              <PokemonImage species={s} size={88} />
              <span className="mt-1 font-black">{s.name[lang]}</span>
              {lang === "he" && <span className="ltr text-[11px] text-ink-soft">{s.name.en}</span>}
              <span className="mt-1 flex flex-wrap justify-center gap-1">
                {s.class !== "standard" && <Tag tone="sun">{m.attrs[s.class]}</Tag>}
                {!s.released && <Tag tone="slate">{m.pokedex.unreleased}</Tag>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="h-4" />
    </div>
  );
}
