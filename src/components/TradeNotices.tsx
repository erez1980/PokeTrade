"use client";
import { useMemo } from "react";
import { isTradeBlocked, tradeNotices } from "@/domain/trade/rules";
import type { VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { IconInfo, IconLock, IconCheck } from "./Icons";

export function TradeNotices({ variant, alreadyTraded, compact }: { variant: VariantConfig; alreadyTraded?: boolean; compact?: boolean }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const notices = useMemo(() => (idx ? tradeNotices(idx, variant, { alreadyTraded }) : []), [idx, variant, alreadyTraded]);
  if (!idx || !notices.length) return null;
  const blocked = isTradeBlocked(notices);
  const shown = compact ? notices.filter((n) => n.severity !== "info") : notices;
  const style = { blocked: "bg-rose-50 text-rose-900", special: "bg-violet-50 text-violet-900", conditional: "bg-amber-50 text-amber-900", info: "bg-slate-50 text-slate-700" };
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-sm font-bold">
        {blocked ? <IconLock size={16} className="text-rose-600" /> : <IconCheck size={16} className="text-emerald-600" />}
        {blocked ? m.trade.blocked : m.trade.eligible}
      </p>
      <ul className="space-y-1">
        {shown.map((n) => (
          <li key={n.id} className={`flex gap-2 rounded-xl px-2.5 py-1.5 text-xs ${style[n.severity]}`}>
            <IconInfo size={14} className="mt-0.5 shrink-0" />
            <span>
              <b>{m.trade[n.severity]}: </b>
              {n[lang]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
