"use client";
import type { ResultConfidence } from "@/domain/rarity/engine";
import type { TierId } from "@/domain/rarity/config";
import { useI18n } from "./providers/I18nProvider";

const TIER_STYLE: Record<TierId, string> = {
  mythic: "bg-gradient-to-l from-fuchsia-500 to-amber-400 text-white",
  ultra: "bg-violet-600 text-white",
  rare: "bg-sky-500 text-white",
  uncommon: "bg-emerald-500 text-white",
  common: "bg-slate-200 text-slate-700",
};

export function TierBadge({ tier }: { tier: TierId | null }) {
  const { m } = useI18n();
  if (!tier) return null;
  return <span className={`chip ${TIER_STYLE[tier]}`}>{m.tiers[tier]}</span>;
}

const CONF_STYLE: Record<ResultConfidence, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-sky-100 text-sky-800",
  low: "bg-amber-100 text-amber-800",
  insufficient: "bg-slate-200 text-slate-700",
};
const CONF_BARS: Record<ResultConfidence, number> = { high: 3, medium: 2, low: 1, insufficient: 0 };

export function ConfidenceBadge({ confidence }: { confidence: ResultConfidence }) {
  const { m } = useI18n();
  const bars = CONF_BARS[confidence];
  return (
    <span className={`chip ${CONF_STYLE[confidence]}`} title={m.confidence[confidence]}>
      <span aria-hidden className="inline-flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`inline-block w-[3px] rounded-sm ${i <= bars ? "bg-current" : "bg-current opacity-25"}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {m.confidence[confidence]}
    </span>
  );
}

export function Tag({ children, tone = "grape" }: { children: React.ReactNode; tone?: "grape" | "sun" | "sky" | "leaf" | "slate" | "berry" }) {
  const tones = {
    grape: "bg-violet-100 text-violet-800",
    sun: "bg-amber-100 text-amber-900",
    sky: "bg-sky-100 text-sky-800",
    leaf: "bg-emerald-100 text-emerald-800",
    slate: "bg-slate-100 text-slate-700",
    berry: "bg-rose-100 text-rose-800",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}
