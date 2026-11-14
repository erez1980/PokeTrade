import { z } from "zod";
import { VariantConfig } from "@/domain/catalog/variant";

export const UserPokemonInstance = z.object({
  id: z.string().min(1).max(64),
  variant: VariantConfig,
  quantity: z.number().int().min(1).max(9999).default(1),
  nickname: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  favorite: z.boolean().default(false),
  alreadyTraded: z.boolean().default(false),
  obtainedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserPokemonInstance = z.infer<typeof UserPokemonInstance>;

export const WishlistEntry = z.object({
  id: z.string().min(1).max(64),
  variant: VariantConfig,
  createdAt: z.string(),
  note: z.string().max(200).optional(),
});
export type WishlistEntry = z.infer<typeof WishlistEntry>;

export const BACKUP_FORMAT = 1;
export const Backup = z.object({
  app: z.literal("poketrade"),
  format: z.literal(BACKUP_FORMAT),
  exportedAt: z.string(),
  collection: z.array(UserPokemonInstance).max(50000),
  wishlist: z.array(WishlistEntry).max(50000),
});
export type Backup = z.infer<typeof Backup>;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
