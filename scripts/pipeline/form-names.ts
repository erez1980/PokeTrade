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
  TEAM: "קבוצה", UMBRA: "אומברה", SOLAR: "סולארי", LUNAR: "ירחי", ARRAIA: "ארראיה", CHERRY: "דובדבן", BLOSSOM: "פריחה",
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

/** Event-type tokens in location-card template ids. */
const BG_EVENTS: [RegExp, string, string][] = [
  [/GOFEST/, "GO Fest", "GO Fest"],
  [/GOTOUR/, "GO Tour", "GO Tour"],
  [/CITYSAFARI|CITY_SAFARI/, "City Safari", "ספארי עירוני"],
  [/SAFARI_ZONE|SAFARIZONE/, "Safari Zone", "ספארי זון"],
  [/AIRADVENTURES/, "Air Adventures", "הרפתקאות אוויר"],
  [/ROADTRIP/, "Road Trip", "מסע בדרכים"],
  [/WORLD_CHAMPIONSHIPS|WCS/, "World Championships", "אליפות העולם"],
  [/GOWA/, "GO Wild Area", "GO Wild Area"],
  [/CARNIVAL/, "Carnival", "קרנבל"],
  [/STAMP_RALLY/, "Stamp Rally", "מרוץ חותמות"],
  [/MLB/, "MLB", "בייסבול MLB"],
  [/NFL/, "NFL", "פוטבול NFL"],
  [/NPB/, "NPB", "בייסבול יפני"],
  [/FESTIVAL/, "Festival", "פסטיבל"],
  [/^NT_/, "National Trust", "נשיונל טראסט"],
  [/POKELID/, "Poké Lid", "מכסה פוקימון"],
  [/SPECIALBACKGROUND|^SB_/, "Special background", "רקע מיוחד"],
];

/** City / place tokens → [English, Hebrew]. */
const PLACES: Record<string, [string, string]> = {
  LASVEGAS: ["Las Vegas", "לאס וגאס"], LOSANGELES: ["Los Angeles", "לוס אנג'לס"], NYC: ["New York", "ניו יורק"], NEWYORK: ["New York", "ניו יורק"],
  LONDON: ["London", "לונדון"], OSAKA: ["Osaka", "אוסקה"], SEOUL: ["Seoul", "סיאול"], BARCELONA: ["Barcelona", "ברצלונה"],
  MEXICOCITY: ["Mexico City", "מקסיקו סיטי"], JEJU: ["Jeju", "ג'ג'ו"], BALI: ["Bali", "באלי"], FUKUOKA: ["Fukuoka", "פוקואוקה"],
  HONGKONG: ["Hong Kong", "הונג קונג"], HONOLULU: ["Honolulu", "הונולולו"], INCHEON: ["Incheon", "אינצ'און"], JAKARTA: ["Jakarta", "ג'קרטה"],
  MADRID: ["Madrid", "מדריד"], MILAN: ["Milan", "מילאנו"], MUMBAI: ["Mumbai", "מומבאי"], SANTIAGO: ["Santiago", "סנטיאגו"],
  SAOPAULO: ["São Paulo", "סאו פאולו"], SENDAI: ["Sendai", "סנדאי"], SINGAPORE: ["Singapore", "סינגפור"], SURABAYA: ["Surabaya", "סורבאיה"],
  TAINAN: ["Tainan", "טאינאן"], YOGYAKARTA: ["Yogyakarta", "יוגיאקרטה"], AMSTERDAM: ["Amsterdam", "אמסטרדם"], ANAHEIM: ["Anaheim", "אנהיים"],
  BANGKOK: ["Bangkok", "בנגקוק"], BERLIN: ["Berlin", "ברלין"], CANCUN: ["Cancún", "קנקון"], COLOGNE: ["Cologne", "קלן"],
  NAGASAKI: ["Nagasaki", "נגסאקי"], HAGUE: ["The Hague", "האג"], JANGHEUNG: ["Jangheung", "ג'אנגהונג"], JERSEYCITY: ["Jersey City", "ג'רזי סיטי"],
  PYEONGCHANG: ["Pyeongchang", "פיונגצ'אנג"], MANCHESTER: ["Manchester", "מנצ'סטר"], NEWTAIPEICITY: ["New Taipei City", "טאיפיי החדשה"],
  PARIS: ["Paris", "פריז"], TAIPEICITY: ["Taipei", "טאיפיי"], VALENCIA: ["Valencia", "ולנסיה"], VANCOUVER: ["Vancouver", "ונקובר"],
  CHICAGO: ["Chicago", "שיקגו"], COPENHAGEN: ["Copenhagen", "קופנהגן"], RIODEJANEIRO: ["Rio de Janeiro", "ריו דה ז'ניירו"],
  SANFRANCISCO: ["San Francisco", "סן פרנסיסקו"], TOKYO: ["Tokyo", "טוקיו"], BUENOSAIRES: ["Buenos Aires", "בואנוס איירס"],
  MIAMI: ["Miami", "מיאמי"], SYDNEY: ["Sydney", "סידני"], GLOBAL: ["Global", "עולמי"],
};

/** Readable name for a location-card / background template id, e.g. "GO Fest 2024 · Madrid". */
export function backgroundName(id: string): { en: string; he: string } {
  const body = id.replace(/^LC_/, "").replace(/_\d{3}$/, "");
  const year = body.match(/(20\d\d)/)?.[1];
  const ev = BG_EVENTS.find(([re]) => re.test(body));
  const place = Object.keys(PLACES)
    .sort((a, b) => b.length - a.length)
    .find((p) => body.replace(/_/g, "").includes(p));
  const num = id.match(/_(\d{3})$/)?.[1];
  const suffix = num && num !== "001" ? ` #${Number(num)}` : "";
  if (!ev && !place) {
    const label = humanizeToken(body);
    return { en: label + suffix, he: (hebrewForToken(body) || label) + suffix };
  }
  // Remaining descriptive tokens (e.g. "UMBRA", "SHIELD_CROWNED", "TEAM_BLUE", "NT_11" -> 11).
  const known = new Set(["SPECIALBACKGROUND", "GLOBAL", "GOFEST", "GOTOUR", "CITYSAFARI", "ROADTRIP", "AIRADVENTURES", "GOWA", "WCS", "NT", "POKELID", "SB", "LC", "SAFARI", "ZONE", "WORLD", "CHAMPIONSHIPS", "EVENT"]);
  const rest = body.split("_").filter((t) => t && !known.has(t) && t !== year && !(place && place.includes(t)) && !(ev && ev[0].test(t)));
  const extra = rest.length ? ` (${humanizeToken(rest.join("_"))})` : "";
  const extraHe = rest.length ? ` (${hebrewForToken(rest.join("_")) || humanizeToken(rest.join("_"))})` : "";
  const en = [ev?.[1], year].filter(Boolean).join(" ") + (place ? ` · ${PLACES[place]![0]}` : "") + extra + suffix;
  const he = [ev?.[2], year].filter(Boolean).join(" ") + (place ? ` · ${PLACES[place]![1]}` : "") + extraHe + suffix;
  return { en: en.trim().replace(/^· /, ""), he: he.trim().replace(/^· /, "") };
}
