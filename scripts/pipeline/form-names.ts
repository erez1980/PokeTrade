/** Human-readable English + Hebrew names for form/costume tokens from the game master. */

const TOKEN_HE: Record<string, string> = {
  ALOLA: "אלולה", ALOLAN: "אלולה", GALARIAN: "גלאר", GALAR: "גלאר", HISUIAN: "היסוי", HISUI: "היסוי",
  PALDEA: "פלדאה", PALDEAN: "פלדאה", AQUA: "מים", BLAZE: "אש", COMBAT: "קרב",
  HALLOWEEN: "האלווין", FALL: "סתיו", WINTER: "חורף", SPRING: "אביב", SUMMER: "קיץ", HOLIDAY: "חג",
  ANNIVERSARY: "יום הולדת", PARTY: "מסיבה", HAT: "כובע", CROWN: "כתר", FLOWER: "פרח", COPY: "שיבוט",
  GOFEST: "GO Fest", GOTOUR: "GO Tour", TOUR: "Tour", WCS: "אליפות העולם", WORLDS: "אליפות העולם",
  POP: "פופ", ROCK: "רוק", STAR: "כוכב", FLYING: "מעופף", DOCTOR: "דוקטור", LIBRE: "ליברה",
  BELLE: "בל", PHD: "פרופסור", COSTUME: "תחפושת", ADVENTURE: "הרפתקה", KARIYUSHI: "קריושי",
  TSHIRT: "חולצה", BANDANA: "בנדנה", NEW: "חדש", YEAR: "שנה", ONE: "", SAFARI: "ספארי",
  SUNNY: "שמשי", RAINY: "גשום", SNOWY: "מושלג", ATTACK: "התקפה", DEFENSE: "הגנה", SPEED: "מהירות",
  NORMAL: "רגיל", ORIGIN: "מקורי", ALTERED: "משתנה", SKY: "שמיים", LAND: "יבשה", THERIAN: "תריאן",
  INCARNATE: "התגלמות", BLACK: "שחור", WHITE: "לבן", RED: "אדום", BLUE: "כחול", YELLOW: "צהוב",
  ORANGE: "כתום", GREEN: "ירוק", PURPLE: "סגול", PINK: "ורוד", STRIPED: "מפוספס", PLANT: "צמח",
  SANDY: "חול", TRASH: "זבל", WEST: "מערב", EAST: "מזרח", SEA: "ים", OVERCAST: "מעונן", SUNSHINE: "שמש",
  HEAT: "חום", WASH: "שטיפה", FROST: "כפור", FAN: "מאוורר", MOW: "מכסחה", CROWNED: "מוכתר",
  SWORD: "חרב", SHIELD: "מגן", HERO: "גיבור", AMPED: "מוגבר", LOW: "נמוך", KEY: "מפתח",
  MALE: "זכר", FEMALE: "נקבה", SHADOW: "צל", ICE: "קרח", RIDER: "רוכב", DUSK: "דמדומים", MANE: "רעמה",
  DAWN: "שחר", WINGS: "כנפיים", MIDDAY: "צהריים", MIDNIGHT: "חצות", BAILE: "באילה", POMPOM: "פומפום",
  PAU: "פאו", SENSU: "סנסו", SOLO: "סולו", SCHOOL: "להקה", COMPLETE: "שלם", TEN: "10%", FIFTY: "50%",
  CONFINED: "כלוא", UNBOUND: "משוחרר", SINGLE: "יחיד", STRIKE: "מכה", RAPID: "מהירה", MEADOW: "אחו",
  ARCHIPELAGO: "ארכיפלג", CONTINENTAL: "יבשתי", ELEGANT: "אלגנטי", GARDEN: "גן", HIGH: "גבוה",
  PLAINS: "מישורים", ICY: "קפוא", SNOW: "שלג", JUNGLE: "ג'ונגל", MARINE: "ימי", MODERN: "מודרני",
  MONSOON: "מונסון", OCEAN: "אוקיינוס", POLAR: "קוטבי", RIVER: "נהר", SANDSTORM: "סופת חול", SAVANNA: "סוואנה",
  JAN: "ינואר", JANUARY: "ינואר", FEB: "פברואר", FEBRUARY: "פברואר", MAR: "מרץ", MARCH: "מרץ", APRIL: "אפריל", APR: "אפריל",
  MAY: "מאי", JUNE: "יוני", JUN: "יוני", JULY: "יולי", JUL: "יולי", AUG: "אוגוסט", AUGUST: "אוגוסט", SEPT: "ספטמבר",
  SEPTEMBER: "ספטמבר", OCT: "אוקטובר", OCTOBER: "אוקטובר", NOV: "נובמבר", NOVEMBER: "נובמבר", DEC: "דצמבר", DECEMBER: "דצמבר",
  KANTO: "קאנטו", JOHTO: "ג'וטו", HOENN: "הואן", SINNOH: "סינו", UNOVA: "יונובה", KALOS: "קאלוס",
  DIWALI: "דיוואלי", INDONESIA: "אינדונזיה", TCG: "קלפים", PI: "פאי", VS: "נגד", GOTOUR_2023: "GO Tour 2023",
  SUN: "שמש", TUNDRA: "טונדרה", FANCY: "מהודר", POKEBALL: "פוקבול", NOEVOLVE: "",
};

export function humanizeToken(token: string): string {
  return token
    .split("_")
    .filter((t) => t && t !== "NOEVOLVE")
    .map((t) => (/^\d+$/.test(t) ? t : t.charAt(0) + t.slice(1).toLowerCase()))
    .join(" ");
}

export function hebrewForToken(token: string): string {
  const parts = token.split("_").filter((t) => t && t !== "NOEVOLVE");
  const mapped = parts.map((t) => (/^\d+$/.test(t) ? t : TOKEN_HE[t] ?? (t.length <= 3 ? t : humanizeToken(t)))).filter(Boolean);
  return mapped.join(" ");
}

export function regionOf(token: string): "alola" | "galar" | "hisui" | "paldea" | undefined {
  if (/^ALOLA/.test(token)) return "alola";
  if (/^GALAR/.test(token)) return "galar";
  if (/^HISUI/.test(token)) return "hisui";
  if (/^PALDEA/.test(token)) return "paldea";
  return undefined;
}

/** Hand-written names for forms whose game-master token is not descriptive. */
export const FORM_NAME_OVERRIDES: Record<string, { en: string; he: string }> = {
  MEWTWO_A: { en: "Armored", he: "משוריין" },
  PIKACHU_COPY_2019: { en: "Clone (2019)", he: "שיבוט (2019)" },
  CHARIZARD_COPY_2019: { en: "Clone (2019)", he: "שיבוט (2019)" },
  BLASTOISE_COPY_2019: { en: "Clone (2019)", he: "שיבוט (2019)" },
  VENUSAUR_COPY_2019: { en: "Clone (2019)", he: "שיבוט (2019)" },
};
