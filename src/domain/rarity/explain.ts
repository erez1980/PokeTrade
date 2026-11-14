import type { ComparisonResult, RarityResult } from "./engine";

export type Lang = "he" | "en";

/** Short, child-friendly reason phrases per factor. Hebrew phrases fit after "כי". */
export const FACTOR_PHRASES: Record<string, { he: string; en: string }> = {
  "ACQ.MYTHICAL": { he: "הוא פוקימון מיתי שמקבלים בדרך כלל רק פעם אחת, במשימות מיוחדות", en: "it is a Mythical Pokémon, usually given only once through special research" },
  "ACQ.LEGENDARY": { he: "הוא פוקימון אגדי שמגיע בעיקר מפשיטות לזמן מוגבל", en: "it is a Legendary Pokémon that mostly comes from limited-time raids" },
  "ACQ.ULTRA_BEAST": { he: "הוא אולטרה ביסט שמגיע מפשיטות לזמן מוגבל", en: "it is an Ultra Beast that comes from limited-time raids" },
  "ACQ.PHOTOBOMB": { he: "אפשר להשיג אותו רק כשהוא \"קופץ\" לתמונה במצלמת GO Snapshot", en: "it can only be found by photobombing GO Snapshot pictures" },
  "ACQ.RESEARCH": { he: "אפשר להשיג אותו רק דרך משימות מחקר", en: "it can only be obtained from research tasks" },
  "ACQ.RAID": { he: "אפשר להשיג אותו רק בפשיטות", en: "it can only be obtained in raids" },
  "ACQ.BABY": { he: "הוא פוקימון תינוק שבוקע בעיקר מביצים", en: "it is a baby Pokémon that mostly hatches from eggs" },
  "ACQ.STANDARD": { he: "הוא פוקימון רגיל בלי הגבלה מיוחדת", en: "it is a regular Pokémon without special limits" },
  "ACQ.NESTING": { he: "הוא מופיע הרבה בקנים (Nests)", en: "it appears often in nests" },
  "DIST.REGIONAL": { he: "הוא מופיע בטבע רק באזור מסוים בעולם", en: "it appears in the wild only in one region of the world" },
  "FORM.COSTUME": { he: "יש לו תחפושת מאירוע שהיה זמין לזמן מוגבל", en: "it wears a costume from a limited-time event" },
  "SHINY.FULL_ODDS": { he: "הוא שייני, וקשה מאוד למצוא שייני של פוקימון רגיל", en: "it is Shiny, and Shinies of regular Pokémon are very hard to find" },
  "SHINY.BOOSTED_ODDS": { he: "הוא שייני", en: "it is Shiny" },
  "SHINY.MYTHICAL": { he: "הוא מיתי שייני, שהיה זמין רק בהזדמנויות מיוחדות", en: "it is a Shiny Mythical that was available only on special occasions" },
  "TRADE.LUCKY": { he: "הוא לאקי, ופוקימון לאקי מקבלים רק מהחלפות", en: "it is Lucky, and Lucky Pokémon only come from trades" },
  "SHADOW.SHADOW": { he: "הוא שאדו, שמגיע רק מקרבות נגד צוות רוקט", en: "it is Shadow, which only comes from Team GO Rocket battles" },
  "SHADOW.PURIFIED": { he: "הוא מטוהר, כלומר היה פעם פוקימון שאדו", en: "it is Purified, meaning it used to be a Shadow Pokémon" },
  "MAX.DYNAMAX": { he: "הוא דיינמקס, שמשיגים רק בקרבות מקס", en: "it is Dynamax, which you only get from Max Battles" },
  "MAX.GIGANTAMAX": { he: "הוא גיגנטמקס, שמשיגים רק בקרבות גיגנטמקס מיוחדים", en: "it is Gigantamax, only from special Gigantamax battles" },
  "BG.LOCATION": { he: "יש לו רקע מיקום שמקבלים רק אם מגיעים למקום או לאירוע מסוים", en: "it has a location background you only get by attending a specific place or event" },
  "BG.SPECIAL": { he: "יש לו רקע מיוחד מאירוע שהיה זמין לזמן מוגבל", en: "it has a special background from a limited-time event" },
  "SIZE.EXTREME": { he: "יש לו גודל מיוחד (XXL או XXS)", en: "it has a special size (XXL or XXS)" },
  "MOVE.LEGACY": { he: "יש לו מתקפה מיוחדת שאפשר ללמוד רק באירועים", en: "it knows a special move only available at events" },
};

/** Factors that are worth mentioning as reasons for being rare (not "common" explanations). */
const NOT_A_RARITY_REASON = new Set(["ACQ.STANDARD", "ACQ.NESTING"]);

export function rarityReasons(r: RarityResult, lang: Lang, max = 3): string[] {
  return r.factors
    .filter((f) => f.counted && !NOT_A_RARITY_REASON.has(f.factor.id))
    .sort((x, y) => y.factor.points - x.factor.points || x.factor.id.localeCompare(y.factor.id))
    .slice(0, max)
    .map((f) => FACTOR_PHRASES[f.factor.id]?.[lang] ?? f.factor.id);
}

export function joinList(items: string[], lang: Lang): string {
  if (items.length <= 1) return items[0] ?? "";
  const last = items[items.length - 1]!;
  const head = items.slice(0, -1).join(", ");
  // Hebrew conjunction "ו" attaches to the next word: "הוא שייני, ויש לו רקע מיוחד".
  return lang === "he" ? `${head}, ו${last}` : `${head}, and ${last}`;
}

/** One-sentence explanation for a single result. */
export function explainSingle(r: RarityResult, name: string, lang: Lang): string {
  if (r.score === null) {
    return lang === "he"
      ? "אין מספיק מידע כדי לקבוע את רמת הנדירות בצורה אמינה."
      : "There is not enough information to determine the rarity reliably.";
  }
  const reasons = rarityReasons(r, lang);
  if (reasons.length === 0) {
    return lang === "he"
      ? `${name} הוא פוקימון נפוץ יחסית שקל יחסית למצוא.`
      : `${name} is a relatively common Pokémon that is fairly easy to find.`;
  }
  return lang === "he"
    ? `${name} נחשב נדיר כי ${joinList(reasons, lang)}.`
    : `${name} is considered rare because ${joinList(reasons, lang)}.`;
}

export const OUTCOME_HEADLINES: Record<ComparisonResult["outcome"], { he: string; en: string }> = {
  a_much_rarer: { he: "הפוקימון שלך נדיר בהרבה!", en: "Your Pokémon is much rarer!" },
  a_rarer: { he: "הפוקימון שלך קצת יותר נדיר.", en: "Your Pokémon is a bit rarer." },
  equal: { he: "שני הפוקימונים בערך באותה רמת נדירות!", en: "Both Pokémon are about equally rare!" },
  b_rarer: { he: "הפוקימון השני קצת יותר נדיר.", en: "The other Pokémon is a bit rarer." },
  b_much_rarer: { he: "הפוקימון השני נדיר בהרבה!", en: "The other Pokémon is much rarer!" },
  insufficient: { he: "אי אפשר לקבוע בוודאות מי יותר נדיר.", en: "We can't tell for sure which one is rarer." },
};

/** Explanation of *why* the winner is rarer, focusing on factors the loser does not share. */
export function explainComparison(c: ComparisonResult, nameA: string, nameB: string, lang: Lang): string {
  if (c.outcome === "insufficient") {
    const which = c.a.score === null && c.b.score === null ? "both" : c.a.score === null ? "a" : "b";
    if (lang === "he") {
      const who = which === "both" ? "על שני הפוקימונים" : `על ${which === "a" ? nameA : nameB}`;
      return `אין לנו מספיק מידע מאומת ${who} כדי להשוות בצורה אמינה.`;
    }
    const who = which === "both" ? "both Pokémon" : which === "a" ? nameA : nameB;
    return `We don't have enough verified information about ${who} to compare reliably.`;
  }
  if (c.outcome === "equal") {
    return lang === "he"
      ? `ל${nameA} ול${nameB} יש ציון נדירות קרוב מאוד, כך שאי אפשר לומר שאחד מהם נדיר יותר באופן ברור.`
      : `${nameA} and ${nameB} have very close rarity scores, so neither is clearly rarer.`;
  }
  const aWins = c.outcome === "a_much_rarer" || c.outcome === "a_rarer";
  const winner = aWins ? c.a : c.b;
  const loser = aWins ? c.b : c.a;
  const winnerName = aWins ? nameA : nameB;
  const loserIds = new Set(loser.factors.filter((f) => f.counted).map((f) => f.factor.id));
  const distinct = winner.factors
    .filter((f) => f.counted && !loserIds.has(f.factor.id) && !NOT_A_RARITY_REASON.has(f.factor.id))
    .sort((x, y) => y.factor.points - x.factor.points || x.factor.id.localeCompare(y.factor.id))
    .slice(0, 3)
    .map((f) => FACTOR_PHRASES[f.factor.id]?.[lang] ?? f.factor.id);
  const reasons = distinct.length ? distinct : rarityReasons(winner, lang);
  if (!reasons.length) {
    return lang === "he" ? `${winnerName} נחשב נדיר יותר לפי שיטת הדירוג שלנו.` : `${winnerName} is considered rarer by our scoring method.`;
  }
  return lang === "he"
    ? `${winnerName} נחשב נדיר יותר כי ${joinList(reasons, lang)}.`
    : `${winnerName} is considered rarer because ${joinList(reasons, lang)}.`;
}
