import { Backup, BACKUP_FORMAT, type UserPokemonInstance, type WishlistEntry } from "./schema";

export function makeBackup(collection: UserPokemonInstance[], wishlist: WishlistEntry[], now = new Date()): Backup {
  return { app: "poketrade", format: BACKUP_FORMAT, exportedAt: now.toISOString(), collection, wishlist };
}

export interface ImportResult {
  ok: boolean;
  collection: UserPokemonInstance[];
  wishlist: WishlistEntry[];
  skippedUnknown: number;
  error?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Parses and validates a backup file. Unknown species (not in the current catalog) are skipped.
 * Nothing is written here – the caller merges the validated result.
 */
export function parseBackup(text: string, knownSpecies: (id: number) => boolean): ImportResult {
  if (text.length > MAX_BYTES) return { ok: false, collection: [], wishlist: [], skippedUnknown: 0, error: "too_large" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, collection: [], wishlist: [], skippedUnknown: 0, error: "invalid_json" };
  }
  const parsed = Backup.safeParse(json);
  if (!parsed.success) return { ok: false, collection: [], wishlist: [], skippedUnknown: 0, error: "invalid_schema" };
  let skipped = 0;
  const keep = <T extends { variant: { speciesId: number } }>(arr: T[]) =>
    arr.filter((x) => {
      const ok = knownSpecies(x.variant.speciesId);
      if (!ok) skipped++;
      return ok;
    });
  return { ok: true, collection: keep(parsed.data.collection), wishlist: keep(parsed.data.wishlist), skippedUnknown: skipped };
}

/** Merge by id; existing ids are kept (import never overwrites local edits). */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): { merged: T[]; added: T[] } {
  const ids = new Set(existing.map((e) => e.id));
  const added = incoming.filter((i) => !ids.has(i.id));
  return { merged: [...existing, ...added], added };
}
