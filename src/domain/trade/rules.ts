import type { CatalogIndex } from "../catalog/catalog-index";
import type { VariantConfig } from "../catalog/variant";

/**
 * Trading eligibility. Independent from rarity: nothing here changes a rarity score.
 * Rules are taken from the official Pokémon GO Help Center articles (see docs/DATA_SOURCES.md).
 */
export type TradeSeverity = "blocked" | "special" | "conditional" | "info";

export interface TradeNotice {
  id: string;
  severity: TradeSeverity;
  he: string;
  en: string;
  sourceId: string;
}

export interface TradeContext {
  /** The player marked this Pokémon as already traded once. */
  alreadyTraded?: boolean;
}

export const TRADE_SOURCES = {
  trading: "official-trading",
  remote: "official-remote-trading",
  max: "official-max",
  shadow: "official-help-center",
  community: "community-documentation",
} as const;

const FUSION_FORM = /(BLACK|WHITE|DUSK_MANE|DAWN_WINGS|ICE_RIDER|SHADOW_RIDER)$/;
const CROWNED_FORM = /CROWNED/;

export function tradeNotices(idx: CatalogIndex, v: VariantConfig, ctx: TradeContext = {}): TradeNotice[] {
  const s = idx.getSpecies(v.speciesId);
  const fe = idx.getForm(v.formId);
  if (!s || !fe) return [];
  const notices: TradeNotice[] = [];
  const blocked = (n: Omit<TradeNotice, "severity">) => notices.push({ ...n, severity: "blocked" });

  if (s.class === "mythical" && !idx.isTradableMythical(s.id)) {
    blocked({ id: "TR.MYTHICAL", he: "פוקימונים מיתיים כמו מיו לא ניתנים להחלפה.", en: "Mythical Pokémon (like Mew) cannot be traded.", sourceId: TRADE_SOURCES.trading });
  }
  if (v.lucky || ctx.alreadyTraded) {
    blocked({ id: "TR.TRADED", he: "פוקימון שכבר הוחלף פעם אחת לא ניתן להחלפה שוב.", en: "A Pokémon that was already traded once cannot be traded again.", sourceId: TRADE_SOURCES.trading });
  }
  if (v.shadowState === "shadow") {
    blocked({ id: "TR.SHADOW", he: "פוקימון שאדו לא ניתן להחלפה. אפשר לטהר אותו ואז להחליף.", en: "Shadow Pokémon cannot be traded. Purify it first to trade it.", sourceId: TRADE_SOURCES.shadow });
  }
  if (FUSION_FORM.test(fe.form.id) && (s.key === "KYUREM" || s.key === "NECROZMA" || s.key === "CALYREX")) {
    blocked({ id: "TR.FUSION", he: "פוקימון מאוחד צריך קודם לחזור לצורה הרגילה לפני החלפה.", en: "Fused Pokémon must be unfused before trading.", sourceId: TRADE_SOURCES.community });
  }

  if (!notices.some((n) => n.severity === "blocked")) {
    if (v.maxState === "gigantamax") {
      notices.push({ id: "TR.GMAX_SPECIAL", severity: "special", he: "החלפת פוקימון גיגנטמקס היא תמיד החלפה מיוחדת (Special Trade).", en: "Trading a Gigantamax Pokémon is always a Special Trade.", sourceId: TRADE_SOURCES.max });
    }
    if (v.backgroundId) {
      notices.push({ id: "TR.LOCATION_SPECIAL", severity: "special", he: "פוקימון עם רקע מיוחד נחשב להחלפה מיוחדת (Special Trade).", en: "Pokémon with special features like Location Cards are Special Trades.", sourceId: TRADE_SOURCES.trading });
    }
    if (fe.form.kind === "costume" || fe.form.kind === "regional" || s.class !== "standard" || v.shiny) {
      notices.push({ id: "TR.MAYBE_SPECIAL", severity: "conditional", he: "אם לחבר שלך אין עדיין את הפוקימון הזה (או את הצורה הזו) בפוקידקס, זו תהיה החלפה מיוחדת.", en: "If your friend doesn't have this Pokémon (or this form) in their Pokédex yet, it will be a Special Trade.", sourceId: TRADE_SOURCES.trading });
    }
    if (v.maxState !== "none") {
      notices.push({ id: "TR.MAX_KEEP", severity: "conditional", he: "צריך להשאיר לפחות פוקימון מקס אחד באוסף. רמות מתקפות המקס מתאפסות בהחלפה.", en: "You must keep at least one Max Pokémon. Max Move levels reset when traded.", sourceId: TRADE_SOURCES.max });
    }
    if (CROWNED_FORM.test(fe.form.id)) {
      notices.push({ id: "TR.CROWNED_REMOTE", severity: "conditional", he: "זסיאן וזמזנטה בצורת כתר לא ניתנים להחלפה מרחוק.", en: "Crowned Zacian and Zamazenta cannot be traded remotely.", sourceId: TRADE_SOURCES.remote });
    }
    notices.push({ id: "TR.BASICS", severity: "info", he: "כדי להחליף צריך להיות לפחות בדרגה 10 ולהיות ליד החבר. החלפה מרחוק אפשרית רק עם חברים לנצח (Forever Friends).", en: "Trading requires level 10+ and being near your friend. Remote trades are only possible with Forever Friends.", sourceId: TRADE_SOURCES.trading });
    notices.push({ id: "TR.REMOTE_LIMITS", severity: "info", he: "בהחלפה מרחוק אי אפשר לשלוח פוקימון שנתפס ב-30 הימים האחרונים, פוקימון שמגן על חדר כושר, באדי או פוקימון במגה פעיל.", en: "Remote trades exclude Pokémon caught in the last 30 days, Gym defenders, your buddy and active Mega Pokémon.", sourceId: TRADE_SOURCES.remote });
  }
  return notices;
}

export function isTradeBlocked(notices: TradeNotice[]): boolean {
  return notices.some((n) => n.severity === "blocked");
}
