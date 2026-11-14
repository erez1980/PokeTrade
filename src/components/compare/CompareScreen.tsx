"use client";
import { useEffect, useRef, useState } from "react";
import { parseVariantKey, variantKey, type VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { CatalogGate } from "../States";
import { ComparePanel } from "./ComparePanel";
import { ComparisonResultView } from "./ComparisonResultView";
import { IconCompare, IconSwap } from "../Icons";

export function CompareScreen() {
  return (
    <CatalogGate>
      <CompareInner />
    </CatalogGate>
  );
}

function CompareInner() {
  const { idx } = useCatalog();
  const { m } = useI18n();
  const [a, setA] = useState<VariantConfig | null>(null);
  const [b, setB] = useState<VariantConfig | null>(null);
  const [aTraded, setATraded] = useState<boolean | undefined>();
  const [bTraded, setBTraded] = useState<boolean | undefined>();
  const [show, setShow] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Preselect from URL (?a=<variantKey>&b=<variantKey>) – used by rankings / collection "compare" actions.
  useEffect(() => {
    if (!idx) return;
    const params = new URLSearchParams(window.location.search);
    const pa = params.get("a");
    const pb = params.get("b");
    const ok = (k: string | null) => {
      const v = k ? parseVariantKey(k) : null;
      return v && idx.getSpecies(v.speciesId) && idx.getForm(v.formId) ? v : null;
    };
    const va = ok(pa);
    const vb = ok(pb);
    if (va) setA(va);
    if (vb) setB(vb);
  }, [idx]);

  // Keep URL shareable without adding history entries.
  useEffect(() => {
    const params = new URLSearchParams();
    if (a) params.set("a", variantKey(a));
    if (b) params.set("b", variantKey(b));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [a, b]);

  useEffect(() => {
    if (!a || !b) setShow(false);
  }, [a, b]);

  const swap = () => {
    setA(b);
    setB(a);
    setATraded(bTraded);
    setBTraded(aTraded);
  };

  const runCompare = () => {
    setShow(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="bg-gradient-to-l from-violet-700 via-sky-600 to-violet-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">{m.compare.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft sm:text-base">{m.compare.subtitle}</p>
      </header>

      <div className="relative grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <ComparePanel title={m.compare.mine} accent="grape" value={a} onChange={(v, meta) => { setA(v); if (meta) setATraded(meta.alreadyTraded); }} />
        <div className="flex justify-center lg:pt-24">
          <button type="button" className="btn btn-sun h-12 w-12 !p-0 shadow-lg" onClick={swap} aria-label={m.compare.swap} title={m.compare.swap} disabled={!a && !b}>
            <IconSwap />
          </button>
        </div>
        <ComparePanel title={m.compare.other} accent="sun" value={b} onChange={(v, meta) => { setB(v); if (meta) setBTraded(meta.alreadyTraded); }} />
      </div>

      <div className="sticky bottom-20 z-30 flex justify-center md:bottom-4">
        <button type="button" className="btn btn-primary min-w-56 text-lg" disabled={!a || !b} onClick={runCompare}>
          <IconCompare /> {a && b ? m.compare.compareNow : m.compare.pickBoth}
        </button>
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        {show && a && b && <ComparisonResultView a={a} b={b} aTraded={aTraded} bTraded={bTraded} />}
      </div>
    </div>
  );
}
