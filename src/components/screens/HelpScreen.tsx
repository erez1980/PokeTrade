"use client";
import { FACTORS, SCORING_EFFECTIVE_DATE, SCORING_VERSION, THRESHOLDS, TIERS } from "@/domain/rarity/config";
import { FACTOR_PHRASES } from "@/domain/rarity/explain";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { ConfidenceBadge } from "../Badges";
import { PageTitle } from "../States";

/** Rarity methodology page – generated from the live scoring configuration so it can't drift. */
export function HelpScreen() {
  const { m, lang } = useI18n();
  const { idx } = useCatalog();
  const he = lang === "he";
  const groups = Array.from(new Set(Object.values(FACTORS).map((f) => f.group)));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title={m.help.title} subtitle={m.rankings.intro} />
      <section className="card space-y-2 p-4 leading-relaxed">
        <h2 className="text-lg font-black">{he ? "בקצרה" : "In short"}</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm">
          {he ? (
            <>
              <li>כל פוקימון מקבל <b>ציון נדירות משוער</b> בין 0 ל-100. זה לא סיכוי רשמי ולא מספר שחקנים שיש להם אותו.</li>
              <li>הציון מחושב מ<b>גורמים</b> שאפשר לאמת: איך משיגים את הפוקימון, האם הוא אזורי, שייני, מאירוע, דיינמקס ועוד.</li>
              <li>אם אין לנו מספיק מידע מאומת – אנחנו <b>לא ממציאים ציון</b>, ומציגים &quot;אין מספיק מידע&quot;.</li>
              <li>ליד כל ציון מופיעה <b>רמת ביטחון</b>: גבוהה, בינונית או נמוכה.</li>
              <li>אותה בחירה תמיד מקבלת אותו ציון. כשהמשחק משתנה – מעדכנים את הנתונים והגרסה.</li>
            </>
          ) : (
            <>
              <li>Each Pokémon gets an <b>estimated rarity score</b> from 0 to 100. It is not official odds and not a count of players who own it.</li>
              <li>The score is built from verifiable <b>factors</b>: how it is obtained, regional exclusivity, Shiny, event, Dynamax and more.</li>
              <li>If we lack verified information we <b>never invent a score</b> and show &quot;insufficient data&quot;.</li>
              <li>Every score shows a <b>confidence level</b>: high, medium or low.</li>
              <li>The same input always gives the same score. When the game changes, data and versions are updated.</li>
            </>
          )}
        </ul>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-black">{he ? "הגורמים והנקודות" : "Factors and points"}</h2>
        <p className="text-sm text-ink-soft">
          {he
            ? "בכל קבוצה נספר רק הגורם החזק ביותר, כדי לא לספור את אותה סיבה פעמיים. הנקודות של הקבוצות מתחברות, והציון מוגבל ל-0–100."
            : "Within each group only the strongest factor counts, so the same reason is never counted twice. Group points are added and the score is clamped to 0–100."}
        </p>
        {groups.map((g) => (
          <div key={g}>
            <h3 className="ltr text-start text-sm font-black uppercase text-violet-700">{g}</h3>
            <ul className="mt-1 space-y-1">
              {Object.values(FACTORS).filter((f) => f.group === g).map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-violet-50/60 p-2 text-sm">
                  <b className="ltr w-12 rounded bg-white text-center">+{f.points}</b>
                  <span className="flex-1">{FACTOR_PHRASES[f.id]?.[lang]}</span>
                  <ConfidenceBadge confidence={f.confidence} />
                  <span className="ltr w-full text-start text-[11px] text-ink-soft">{f.id} – {f.rule} [{f.sourceId}]</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="text-lg font-black">{he ? "איך מחליטים מי ניצח?" : "How is the winner decided?"}</h2>
        <ul className="list-disc space-y-1 ps-5">
          <li>{he ? `הפרש של ${THRESHOLDS.significant} נקודות ומעלה: "נדיר בהרבה".` : `${THRESHOLDS.significant}+ points difference: "much rarer".`}</li>
          <li>{he ? `הפרש של ${THRESHOLDS.moderate}–${THRESHOLDS.significant - 1}: "קצת יותר נדיר".` : `${THRESHOLDS.moderate}–${THRESHOLDS.significant - 1}: "a bit rarer".`}</li>
          <li>{he ? `פחות מ-${THRESHOLDS.moderate}: "בערך אותה נדירות". בביטחון נמוך הטווח מוכפל (${THRESHOLDS.moderate * THRESHOLDS.lowConfidenceWidening}).` : `Less than ${THRESHOLDS.moderate}: "about equal". With low confidence the band is widened to ${THRESHOLDS.moderate * THRESHOLDS.lowConfidenceWidening}.`}</li>
          <li>{he ? "מד הנדירות מציג את היחס בין שני הציונים (ציון א' חלקי סכום הציונים) – לא אחוז סיכוי." : "The meter shows the ratio of the two scores (A ÷ (A + B)) – not a probability."}</li>
        </ul>
        <h3 className="pt-2 font-black">{he ? "דרגות נדירות" : "Rarity tiers"}</h3>
        <ul className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <li key={t.id} className="chip bg-violet-50 text-violet-800">{m.tiers[t.id]} ≥ <span className="ltr">{t.min}</span></li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="text-lg font-black">{he ? "מה אנחנו לא יודעים" : "What we don't know"}</h2>
        <ul className="list-disc space-y-1 ps-5">
          {he ? (
            <>
              <li>אין נתונים רשמיים על כמה שחקנים מחזיקים כל פוקימון, ולכן אנחנו לא מציגים מספרים כאלה.</li>
              <li>שייני של תחפושות, שאדו, מקס ורקעים מיוחדים – מסומנים &quot;לא מאומת&quot; עד שנאמת אותם ממקור.</li>
              <li>אחוזי שייני הם הערכות של מחקר קהילתי. אנחנו משתמשים בהם רק כדי לבחור קטגוריה, לא כסיכוי.</li>
              <li>רשימת הפוקימונים ששוחררו מגיעה ממקור חיצוני ועשויה לפגר אחרי שחרורים חדשים.</li>
            </>
          ) : (
            <>
              <li>There is no official data on how many players own each Pokémon, so we never show such numbers.</li>
              <li>Costume Shinies, Shadow/Max Shinies and special backgrounds stay &quot;unverified&quot; until verified from a source.</li>
              <li>Shiny rates are community research estimates, used only to pick a category – never shown as odds.</li>
              <li>The released list comes from an external source and may lag behind brand-new releases.</li>
            </>
          )}
        </ul>
      </section>

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="text-lg font-black">{m.details.sources}</h2>
        <ul className="space-y-1">
          {idx?.catalog.sources.map((s) => (
            <li key={s.id} className="ltr text-start">
              <a className="font-semibold underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
              <span className="text-[11px] text-ink-soft"> — {s.license} · {(s.sourceVersion ?? s.retrievedAt).slice(0, 25)}</span>
            </li>
          ))}
        </ul>
        <p className="ltr text-start text-[11px] text-ink-soft">scoring v{SCORING_VERSION} (effective {SCORING_EFFECTIVE_DATE}) · catalog {idx?.catalog.catalogVersion}</p>
        <p className="text-[11px] text-ink-soft">{m.disclaimer}</p>
      </section>
    </div>
  );
}
