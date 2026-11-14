import { z } from "zod";

/**
 * Canonical description of one exact Pokémon variant (species + form + special characteristics).
 * Collection entries, wishlist entries, comparisons and rankings all use this shape.
 */
export const VariantConfig = z.object({
  speciesId: z.number().int().positive(),
  formId: z.string().regex(/^[A-Z0-9_]+$/),
  shiny: z.boolean().default(false),
  lucky: z.boolean().default(false),
  shadowState: z.enum(["none", "shadow", "purified"]).default("none"),
  maxState: z.enum(["none", "dynamax", "gigantamax"]).default("none"),
  backgroundId: z.string().regex(/^[A-Z0-9_]+$/).nullable().default(null),
  size: z.enum(["normal", "xxl", "xxs"]).default("normal"),
  legacyMove: z.boolean().default(false),
});
export type VariantConfig = z.infer<typeof VariantConfig>;

export type AttributeKey =
  | "form"
  | "shiny"
  | "lucky"
  | "shadow"
  | "purified"
  | "dynamax"
  | "gigantamax"
  | "background"
  | "size"
  | "legacyMove";

export function defaultVariant(speciesId: number, formId: string): VariantConfig {
  return {
    speciesId,
    formId,
    shiny: false,
    lucky: false,
    shadowState: "none",
    maxState: "none",
    backgroundId: null,
    size: "normal",
    legacyMove: false,
  };
}

/** Deterministic, order-independent key for a variant (used for dedupe, caching, URLs). */
export function variantKey(v: VariantConfig): string {
  const parts = [
    String(v.speciesId),
    v.formId,
    v.shiny ? "S" : "",
    v.lucky ? "L" : "",
    v.shadowState === "shadow" ? "SH" : v.shadowState === "purified" ? "PU" : "",
    v.maxState === "dynamax" ? "DM" : v.maxState === "gigantamax" ? "GM" : "",
    v.backgroundId ? `BG:${v.backgroundId}` : "",
    v.size !== "normal" ? v.size.toUpperCase() : "",
    v.legacyMove ? "LM" : "",
  ];
  return parts.join("|");
}

export function parseVariantKey(key: string): VariantConfig | null {
  const p = key.split("|");
  if (p.length !== 9) return null;
  const [id, formId, s, l, sh, mx, bg, size, lm] = p as [string, string, string, string, string, string, string, string, string];
  const parsed = VariantConfig.safeParse({
    speciesId: Number(id),
    formId,
    shiny: s === "S",
    lucky: l === "L",
    shadowState: sh === "SH" ? "shadow" : sh === "PU" ? "purified" : "none",
    maxState: mx === "DM" ? "dynamax" : mx === "GM" ? "gigantamax" : "none",
    backgroundId: bg.startsWith("BG:") ? bg.slice(3) : null,
    size: size === "XXL" ? "xxl" : size === "XXS" ? "xxs" : "normal",
    legacyMove: lm === "LM",
  });
  return parsed.success ? parsed.data : null;
}
