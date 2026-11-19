"use client";
import type { VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { PokemonImage } from "./PokemonImage";
import { BackgroundArt } from "./BackgroundArt";

/** Pokémon artwork, drawn on top of its special background when it has one (like in the game). */
export function PokemonOnBackground({ variant, size = 96, priority, sparkle }: { variant: VariantConfig; size?: number; priority?: boolean; sparkle?: boolean }) {
  const { idx } = useCatalog();
  const { lang } = useI18n();
  if (!idx) return null;
  const s = idx.getSpecies(variant.speciesId);
  if (!s) return null;
  const form = idx.getForm(variant.formId)?.form;
  const bg = variant.backgroundId ? idx.getBackground(variant.backgroundId) : undefined;
  if (!bg) return <PokemonImage species={s} form={form} shiny={variant.shiny} size={size} priority={priority} sparkle={sparkle} />;
  const pad = Math.round(size * 0.12);
  return (
    <span className="relative inline-flex shrink-0 overflow-hidden rounded-[22%] shadow-md ring-2 ring-white" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      <BackgroundArt bg={bg} className="absolute inset-0 h-full w-full" label={bg.name[lang]} />
      <span className="relative m-auto">
        <PokemonImage species={s} form={form} shiny={variant.shiny} size={size} priority={priority} sparkle={sparkle} />
      </span>
    </span>
  );
}
