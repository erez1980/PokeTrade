"use client";
import Link from "next/link";
import type { VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { PokemonPicker } from "../PokemonPicker";
import { PokemonImage } from "../PokemonImage";
import { PokemonOnBackground } from "../PokemonOnBackground";
import { VariantConfigurator } from "../VariantConfigurator";
import { SaveActions } from "../SaveActions";
import { Tag } from "../Badges";
import { variantTags } from "@/lib/describe";

interface Props {
  title: string;
  accent: "grape" | "sun";
  value: VariantConfig | null;
  onChange: (v: VariantConfig | null, meta?: { alreadyTraded?: boolean }) => void;
}

export function ComparePanel({ title, accent, value, onChange }: Props) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const species = value && idx ? idx.getSpecies(value.speciesId) : undefined;
  const form = value && idx ? idx.getForm(value.formId)?.form : undefined;
  const ring = accent === "grape" ? "from-violet-500 to-sky-400" : "from-amber-400 to-yellow-300";

  return (
    <section className="card relative overflow-visible p-4 sm:p-5" aria-label={title}>
      <div className={`absolute inset-x-0 top-0 h-2 rounded-t-[1.5rem] bg-gradient-to-l ${ring}`} aria-hidden />
      <h2 className="mb-3 mt-1 text-lg font-black">{title}</h2>
      {!value || !species || !idx ? (
        <PokemonPicker onSelect={(v, src) => onChange(v, { alreadyTraded: src?.alreadyTraded })} label={title} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-[2rem] bg-gradient-to-b p-1 ${value.shiny ? "from-amber-200 to-yellow-50" : "from-violet-100 to-white"}`}>
              <PokemonOnBackground variant={value} size={112} priority />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink-soft ltr text-start">#{String(species.id).padStart(4, "0")}</p>
              <p className="truncate text-2xl font-black">{species.name[lang]}</p>
              {lang === "he" && <p className="ltr truncate text-start text-sm text-ink-soft">{species.name.en}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {species.class !== "standard" && <Tag tone="sun">{m.attrs[species.class]}</Tag>}
                {form?.kind === "costume" && <Tag tone="berry">{m.attrs.event}</Tag>}
                {variantTags(idx, value, m, lang).map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost !min-h-9 !py-1 text-sm" onClick={() => onChange(null)}>{m.picker.change}</button>
            <Link className="btn btn-ghost !min-h-9 !py-1 text-sm" href={`/pokemon/${species.id}/`}>{m.actions.details}</Link>
          </div>
          <VariantConfigurator value={value} onChange={(v) => onChange(v)} />
          <SaveActions variant={value} />
        </div>
      )}
    </section>
  );
}
