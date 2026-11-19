"use client";
import { useId, useMemo, useState } from "react";
import { attributeAvailability, sanitizeVariant, type AttributeAvailability, type ReasonCode } from "@/domain/catalog/validate";
import type { AttributeKey, VariantConfig } from "@/domain/catalog/variant";
import type { PokemonForm } from "@/domain/catalog/schema";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { BackgroundPicker } from "./BackgroundPicker";

interface Props {
  value: VariantConfig;
  onChange: (v: VariantConfig) => void;
  compact?: boolean;
}

type ToggleDef = {
  key: string;
  label: string;
  on: boolean;
  avail: AttributeAvailability;
  apply: (v: VariantConfig, on: boolean) => VariantConfig;
  tone: string;
};

export function VariantConfigurator({ value, onChange, compact }: Props) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const [why, setWhy] = useState<ReasonCode | null>(null);
  const uid = useId();
  const species = idx?.getSpecies(value.speciesId);
  const avail = useMemo(() => (idx ? attributeAvailability(idx, value) : null), [idx, value]);
  if (!idx || !species || !avail) return null;

  const set = (v: VariantConfig) => {
    setWhy(null);
    onChange(sanitizeVariant(idx, v));
  };

  // Availability of an option is computed against the variant *with that option applied*,
  // so e.g. "Shadow" is checked together with the current Max state.
  const availFor = (patch: Partial<VariantConfig>, key: AttributeKey) => attributeAvailability(idx, { ...value, ...patch })![key];

  const toggles: ToggleDef[] = [
    { key: "shiny", label: m.attrs.shiny, on: value.shiny, avail: availFor({ shiny: true }, "shiny"), apply: (v, on) => ({ ...v, shiny: on }), tone: "from-amber-300 to-yellow-200" },
    { key: "lucky", label: m.attrs.lucky, on: value.lucky, avail: availFor({ lucky: true }, "lucky"), apply: (v, on) => ({ ...v, lucky: on }), tone: "from-yellow-300 to-orange-200" },
    { key: "shadow", label: m.attrs.shadow, on: value.shadowState === "shadow", avail: availFor({ shadowState: "shadow" }, "shadow"), apply: (v, on) => ({ ...v, shadowState: on ? "shadow" : "none" }), tone: "from-purple-400 to-fuchsia-300" },
    { key: "purified", label: m.attrs.purified, on: value.shadowState === "purified", avail: availFor({ shadowState: "purified" }, "purified"), apply: (v, on) => ({ ...v, shadowState: on ? "purified" : "none" }), tone: "from-sky-200 to-white" },
    { key: "dynamax", label: m.attrs.dynamax, on: value.maxState === "dynamax", avail: availFor({ maxState: "dynamax" }, "dynamax"), apply: (v, on) => ({ ...v, maxState: on ? "dynamax" : "none" }), tone: "from-rose-400 to-pink-300" },
    { key: "gigantamax", label: m.attrs.gigantamax, on: value.maxState === "gigantamax", avail: availFor({ maxState: "gigantamax" }, "gigantamax"), apply: (v, on) => ({ ...v, maxState: on ? "gigantamax" : "none" }), tone: "from-red-500 to-rose-300" },
    { key: "legacyMove", label: m.attrs.legacyMove, on: value.legacyMove, avail: avail.legacyMove, apply: (v, on) => ({ ...v, legacyMove: on }), tone: "from-emerald-300 to-teal-200" },
  ];

  const forms = species.forms;
  const groups: { label: string; items: PokemonForm[] }[] = [
    { label: m.attrs.form, items: forms.filter((f) => f.kind === "normal") },
    { label: m.attrs.regional, items: forms.filter((f) => f.kind === "regional") },
    { label: m.attrs.special, items: forms.filter((f) => f.kind === "special") },
    { label: m.attrs.costume, items: forms.filter((f) => f.kind === "costume") },
  ].filter((g) => g.items.length > 0);
  const currentForm = idx.getForm(value.formId)?.form;

  return (
    <div className="space-y-3">
      {forms.length > 1 && (
        <div>
          <label htmlFor={`${uid}-form`} className="mb-1 block text-sm font-bold text-ink-soft">{m.attrs.form}</label>
          <select id={`${uid}-form`} className="input" value={value.formId} onChange={(e) => set({ ...value, formId: e.target.value })}>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.kind === "normal" ? m.attrs.sizeNormal : f.name[lang]}
                    {f.status === "unverified" ? ` (${m.attrs.unverifiedTag})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {currentForm?.status === "unverified" && <p className="mt-1 text-xs font-semibold text-amber-700">{m.reasons.form_unverified}</p>}
        </div>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-bold text-ink-soft">{m.attrs.title}</legend>
        <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {toggles.map((t) => {
            const impossible = t.avail.status === "impossible" && !t.on;
            const unverified = t.avail.status === "unverified";
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={t.on}
                aria-disabled={impossible}
                aria-describedby={impossible || unverified ? `${uid}-why` : undefined}
                title={impossible || unverified ? m.reasons[t.avail.reason] : undefined}
                onClick={() => {
                  if (impossible) {
                    setWhy(t.avail.reason);
                    return;
                  }
                  set(t.apply(value, !t.on));
                  if (unverified && !t.on) setWhy(t.avail.reason);
                }}
                className={`relative flex min-h-12 items-center justify-between gap-1 rounded-2xl border-2 px-3 py-2 text-start text-sm font-bold transition ${
                  t.on
                    ? `border-violet-500 bg-gradient-to-l ${t.tone} text-ink shadow-md`
                    : impossible
                      ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-400"
                      : "border-violet-100 bg-white hover:border-violet-300"
                }`}
              >
                <span>{t.label}</span>
                {impossible && <span className="text-[10px] font-semibold">{m.attrs.notAvailableTag}</span>}
                {unverified && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">{m.attrs.unverifiedTag}</span>}
                {t.on && !unverified && <span aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
        <p id={`${uid}-why`} className="mt-2 min-h-5 text-xs font-semibold text-amber-800" role="status" aria-live="polite">
          {why ? m.reasons[why] : ""}
        </p>
        {value.lucky && <p className="text-xs text-ink-soft">{m.attrs.luckyNote}</p>}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-size`} className="mb-1 block text-sm font-bold text-ink-soft">{m.attrs.size}</label>
          <select
            id={`${uid}-size`}
            className="input"
            value={value.size}
            disabled={avail.size.status === "impossible"}
            onChange={(e) => set({ ...value, size: e.target.value as VariantConfig["size"] })}
          >
            <option value="normal">{m.attrs.sizeNormal}</option>
            <option value="xxl">XXL</option>
            <option value="xxs">XXS</option>
          </select>
        </div>
        <div>
          <BackgroundPicker speciesId={species.id} value={value.backgroundId} onChange={(id) => set({ ...value, backgroundId: id })} />
          {value.backgroundId && avail.background.status !== "available" && (
            <p className="mt-1 text-xs font-semibold text-amber-700">{m.reasons[avail.background.reason]}</p>
          )}
        </div>
      </div>
    </div>
  );
}
