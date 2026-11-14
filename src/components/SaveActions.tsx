"use client";
import Link from "next/link";
import type { VariantConfig } from "@/domain/catalog/variant";
import { variantKey } from "@/domain/catalog/variant";
import { useStore } from "./providers/StoreProvider";
import { useI18n } from "./providers/I18nProvider";
import { useToast } from "./Toast";
import { IconBox, IconCompare, IconHeart } from "./Icons";

export function SaveActions({ variant, showCompare }: { variant: VariantConfig; showCompare?: boolean }) {
  const store = useStore();
  const { m } = useI18n();
  const toast = useToast();
  const owned = store.ownedCount(variant);
  const wished = store.isWished(variant);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-ghost !min-h-10 !py-1.5 text-sm"
        onClick={async () => {
          await store.saveInstance({ variant, quantity: 1, favorite: false, alreadyTraded: variant.lucky });
          toast(`${m.actions.added} ✓`);
        }}
      >
        <IconBox size={16} /> {owned > 0 ? `${m.actions.inCollection} (${owned}) +` : m.actions.addCollection}
      </button>
      <button
        type="button"
        className="btn btn-ghost !min-h-10 !py-1.5 text-sm"
        disabled={wished}
        onClick={async () => {
          await store.addWish(variant);
          toast(`${m.actions.added} ✓`);
        }}
      >
        <IconHeart size={16} /> {wished ? m.actions.inWishlist : m.actions.addWishlist}
      </button>
      {showCompare && (
        <Link className="btn btn-primary !min-h-10 !py-1.5 text-sm" href={`/?a=${encodeURIComponent(variantKey(variant))}`}>
          <IconCompare size={16} /> {m.actions.compare}
        </Link>
      )}
    </div>
  );
}
