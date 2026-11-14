import type { CatalogIndex } from "@/domain/catalog/catalog-index";
import type { VariantConfig } from "@/domain/catalog/variant";
import type { Lang, Messages } from "@/domain/i18n/messages";

/** Short attribute labels for a variant ("שייני · דיינמקס · תחפושת סתיו 2018"). */
export function variantTags(idx: CatalogIndex, v: VariantConfig, m: Messages, lang: Lang): string[] {
  const tags: string[] = [];
  const fe = idx.getForm(v.formId);
  if (fe && fe.form.kind !== "normal") tags.push(fe.form.name[lang]);
  if (v.shiny) tags.push(m.attrs.shiny);
  if (v.lucky) tags.push(m.attrs.lucky);
  if (v.shadowState === "shadow") tags.push(m.attrs.shadow);
  if (v.shadowState === "purified") tags.push(m.attrs.purified);
  if (v.maxState === "dynamax") tags.push(m.attrs.dynamax);
  if (v.maxState === "gigantamax") tags.push(m.attrs.gigantamax);
  if (v.backgroundId) {
    const bg = idx.getBackground(v.backgroundId);
    tags.push(bg ? bg.name[lang] : m.attrs.background);
  }
  if (v.size !== "normal") tags.push(v.size.toUpperCase());
  if (v.legacyMove) tags.push(m.attrs.legacyMove);
  return tags;
}

export function speciesName(idx: CatalogIndex, v: VariantConfig, lang: Lang): string {
  return idx.getSpecies(v.speciesId)?.name[lang] ?? `#${v.speciesId}`;
}

export function variantLabel(idx: CatalogIndex, v: VariantConfig, m: Messages, lang: Lang): string {
  return [speciesName(idx, v, lang), ...variantTags(idx, v, m, lang)].join(" · ");
}
