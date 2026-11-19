/**
 * Step 2 of the catalog pipeline: normalize raw upstream sources + curated data into
 * public/data/catalog.json, validated against the Zod schema.
 *
 *   npm run data:build
 *
 * Safety rules:
 *  - The build fails (exit 1) on schema or integrity errors; the published catalog is untouched.
 *  - A source update never silently removes previously available species/forms: they are
 *    carried forward and flagged "needs review" in the data-quality report.
 *  - Every published catalog is snapshotted to data/catalog/snapshots for rollback.
 *  - If raw sources are missing (fresh clone), the build re-validates and re-publishes
 *    the last committed catalog instead of failing.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { Catalog, type EvidenceRecord, type PokemonBackground, type PokemonForm, type PokemonSpecies, type ShinyChannel, type SourceRef } from "../../src/domain/catalog/schema";
import { CatalogIndex } from "../../src/domain/catalog/catalog-index";
import { buildRankings } from "../../src/domain/rarity/rankings";
import { SCORING_VERSION } from "../../src/domain/rarity/config";
import { transliterateToHebrew } from "../../src/domain/search/transliterate";
import { MANIFEST, RAW_DIR, UPSTREAM } from "./sources";
import { FORM_NAME_OVERRIDES, backgroundName, hebrewForToken, humanizeToken, regionOf } from "./form-names";

const OUT_CATALOG = "public/data/catalog.json";
const OUT_REPORT = "public/data/report.json";
const SNAPSHOT_DIR = "data/catalog/snapshots";
const CHANGELOG = "data/catalog/changelog.json";
const CURATION = "data/curation";

type Json = any; // raw upstream JSON is validated field-by-field below

function readRaw(file: string): Json | null {
  const p = path.join(RAW_DIR, file);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}
const readJson = (p: string): Json => JSON.parse(readFileSync(p, "utf8"));
const today = () => new Date().toISOString().slice(0, 10);

function typeName(t: { type: string } | null | undefined): string | null {
  return t ? t.type.replace("POKEMON_TYPE_", "").toLowerCase() : null;
}

interface Report {
  generatedAt: string;
  catalogVersion: string;
  scoringVersion: string;
  status: "ok" | "republished-previous" | "failed";
  sources: { id: string; retrievedAt?: string; lastModified?: string; sha256?: string }[];
  counts: Record<string, number>;
  missingArtwork: string[];
  missingRarityEvidence: number[];
  invalidCombinations: string[];
  ingestionErrors: string[];
  needsReview: string[];
  changes: { added: number[]; removed: number[]; newlyReleased: number[]; formsAdded: string[]; formsRetained: string[] };
  rankings: { variants: number; ranked: number; unranked: number; species: number };
}

function main() {
  const errors: string[] = [];
  const needsReview: string[] = [];
  const raw = Object.fromEntries(UPSTREAM.map((s) => [s.id, readRaw(s.file)]));
  const missing = UPSTREAM.filter((s) => !raw[s.id]).map((s) => s.id);
  const previous = existsSync(OUT_CATALOG) ? Catalog.parse(readJson(OUT_CATALOG)) : null;

  if (missing.length) {
    if (!previous) {
      console.error(`Missing raw sources (${missing.join(", ")}) and no previous catalog. Run "npm run data:fetch".`);
      process.exit(1);
    }
    console.warn(`Raw sources missing (${missing.length}); re-validating and re-publishing the committed catalog ${previous.catalogVersion}.`);
    writeReport(previous, { status: "republished-previous", ingestionErrors: [`raw sources not present: ${missing.join(", ")}`] });
    return;
  }

  const manifest = existsSync(MANIFEST) ? readJson(MANIFEST) : { entries: [] };
  const curatedEvidence = readJson(path.join(CURATION, "evidence.json"));
  const hebrewNames: Record<string, string[]> = readJson(path.join(CURATION, "hebrew-names.json")).names;

  // ---------- Sources ----------
  const sources: SourceRef[] = UPSTREAM.map((u) => {
    const m = manifest.entries.find((e: Json) => e.id === u.id);
    return { id: u.id, name: u.name, url: u.url, license: u.license, retrievedAt: m?.retrievedAt ?? today(), sha256: m?.sha256, sourceVersion: m?.lastModified, notes: u.notes };
  });
  // Group id used by scoring factors ("pogoapi") resolves to the pogoapi family.
  sources.push({ id: "pogoapi", name: "pogoapi.net (released, shiny, nesting, shadow, raid/research/photobomb exclusive, baby lists)", url: "https://pogoapi.net/", license: "See pogoapi:* entries", retrievedAt: sources.find((s) => s.id === "pogoapi:released_pokemon")!.retrievedAt, sourceVersion: sources.find((s) => s.id === "pogoapi:released_pokemon")!.sourceVersion });
  for (const s of curatedEvidence.sources) sources.push({ ...s });

  // ---------- Upstream indexes ----------
  const released = new Set<number>(Object.keys(raw["pogoapi:released_pokemon"]).map(Number));
  // A documented shiny release is also evidence that the species itself is released
  // (the released list can lag behind the shiny list between upstream updates).
  for (const id of Object.keys(raw["pogoapi:shiny_pokemon"]).map(Number)) released.add(id);
  for (const id of curatedEvidence.releasedOverrides.add) released.add(id);
  for (const id of curatedEvidence.releasedOverrides.remove) released.delete(id);
  const shiny: Record<string, Json> = raw["pogoapi:shiny_pokemon"];
  const nesting = new Set(Object.keys(raw["pogoapi:nesting_pokemon"]).map(Number));
  const shadow = new Set(Object.keys(raw["pogoapi:shadow_pokemon"]).map(Number));
  const raidEx = new Set(Object.keys(raw["pogoapi:raid_exclusive_pokemon"]).map(Number));
  const researchEx = new Set((raw["pogoapi:research_task_exclusive_pokemon"] as Json[]).map((x) => x.id));
  const photobombEx = new Set((raw["pogoapi:photobomb_exclusive_pokemon"] as Json[]).map((x) => x.id));
  const baby = new Set((Array.isArray(raw["pogoapi:baby_pokemon"]) ? raw["pogoapi:baby_pokemon"] : Object.values(raw["pogoapi:baby_pokemon"])).map((x: Json) => x.id));
  const alolan = new Set(Object.keys(raw["pogoapi:alolan_pokemon"]).map(Number));
  const galarian = new Set(Object.keys(raw["pogoapi:galarian_pokemon"]).map(Number));
  const rarityClass = new Map<number, string>();
  for (const [cls, list] of Object.entries(raw["pogoapi:pokemon_rarity"] as Record<string, Json[]>)) {
    for (const e of list) if (cls !== "Standard") rarityClass.set(e.pokemon_id, cls);
  }
  const master = raw["watwowmap-masterfile"].pokemon as Record<string, Json>;
  const gm = raw["game-master"] as Json[];
  const gmBy = new Map<string, Json>(gm.map((e) => [e.templateId, e.data]));

  // Max (Dynamax / Gigantamax) capability from game-master Max Battle visual settings.
  const dynamax = new Set<string>();
  const gigantamax = new Set<string>();
  const scaling = gmBy.get("BREAD_POKEMON_SCALING_SETTINGS")?.breadPokemonScalingSettings?.visualSettings ?? [];
  for (const v of scaling) {
    for (const f of v.pokemonFormData ?? []) {
      for (const vd of f.visualData ?? []) {
        if (vd.breadMode === "BREAD_MODE") dynamax.add(v.pokemonId);
        if (typeof vd.breadMode === "string" && vd.breadMode.startsWith("BREAD_DOUGH")) gigantamax.add(v.pokemonId);
      }
    }
  }
  if (!scaling.length) errors.push("game-master: BREAD_POKEMON_SCALING_SETTINGS missing (Max data unavailable)");

  // Size variants + tradability from game master pokemon settings.
  const sizeKeys = new Set<string>();
  const untradable = new Set<string>();
  for (const e of gm) {
    const ext = e.data?.pokemonExtendedSettings;
    if (ext?.sizeSettings?.xxlUpperBound) sizeKeys.add(ext.uniqueId);
    const ps = e.data?.pokemonSettings;
    if (ps && ps.isTradable === false && !ps.form) untradable.add(ps.pokemonId);
  }

  // Backgrounds (location cards) from game master.
  const backgroundLinks: Record<string, number[]> = curatedEvidence.backgroundLinks.links;
  const bgCurated: Record<string, { event?: string; dates?: string; allCaught?: boolean; evidenceIds?: string[] }> = curatedEvidence.backgroundLinks.meta ?? {};
  const backgrounds: PokemonBackground[] = gm
    .filter((e) => e.templateId.startsWith("LC_") && e.data?.locationCardSettings)
    .map((e) => {
      const id = String(e.templateId).replace(/[^A-Z0-9_]/g, "_");
      const settings = e.data.locationCardSettings;
      const name = backgroundName(id);
      const meta = bgCurated[id] ?? {};
      const image = typeof settings.imageUrl === "string" && /^[A-Za-z0-9_-]+$/.test(settings.imageUrl) ? settings.imageUrl : undefined;
      const special = settings.cardType === "SPECIAL_BACKGROUND" || /SPECIAL/.test(id) || (image ?? "").startsWith("sb_");
      return {
        id,
        name: meta.event ? { en: meta.event, he: name.he } : name,
        kind: special ? ("special" as const) : ("location" as const),
        verifiedSpecies: backgroundLinks[id] ?? [],
        allCaught: meta.allCaught || undefined,
        image,
        year: Number(id.match(/(20\d\d)/)?.[1]) || undefined,
        dates: meta.dates,
        evidenceIds: meta.evidenceIds,
        source: "game-master",
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const regionalByid = new Map<number, string>();
  for (const r of curatedEvidence.regionalExclusives) for (const id of r.ids) regionalByid.set(id, r.region.en);
  const releasedForms = new Set<string>(curatedEvidence.releasedForms.ids);
  const tradableMythicals: number[] = curatedEvidence.tradableMythicals.ids;

  // ---------- Species ----------
  const missingArtwork: string[] = [];
  const species: PokemonSpecies[] = [];
  const pgapi = raw["pokemon-go-api"] as Json[];
  for (const p of pgapi.sort((a, b) => a.dexNr - b.dexNr)) {
    const id: number = p.dexNr;
    const key: string = p.id;
    const m = master[String(id)];
    const en: string = p.names?.English ?? m?.name;
    if (!en) {
      errors.push(`#${id}: no English name`);
      continue;
    }
    const curated = hebrewNames[String(id)];
    const he = curated?.[0] ?? transliterateToHebrew(en);
    const auto = transliterateToHebrew(en);
    const aliases = Array.from(new Set([...(curated ?? []), auto].filter((a) => a && a !== he)));

    const cls: PokemonSpecies["class"] =
      p.pokemonClass === "POKEMON_CLASS_MYTHIC" || m?.mythic || rarityClass.get(id) === "Mythic"
        ? "mythical"
        : p.pokemonClass === "POKEMON_CLASS_LEGENDARY" || m?.legendary || rarityClass.get(id) === "Legendary"
          ? "legendary"
          : p.pokemonClass === "POKEMON_CLASS_ULTRA_BEAST" || rarityClass.get(id) === "Ultra beast"
            ? "ultra_beast"
            : "standard";

    const sh = shiny[String(id)];
    const shinyChannels: ShinyChannel[] = sh
      ? (["wild", "raid", "egg", "research", "evolution", "photobomb"] as const).filter((c) => sh[`found_${c}`])
      : [];
    const isReleased = released.has(id);

    // Forms
    const forms: PokemonForm[] = [];
    const seen = new Set<string>();
    const masterForms = Object.values((m?.forms ?? {}) as Record<string, Json>);
    const isCostumeProto = (proto: string) => masterForms.some((mf) => mf.proto === proto && mf.is_costume);
    const assetOf = (url: string | undefined) => (url ? url.split("/").pop()!.replace(/\.icon\.png$/, "") : undefined);

    const pushForm = (f: PokemonForm) => {
      if (seen.has(f.id)) return;
      seen.add(f.id);
      forms.push(f);
    };
    const normalAsset = assetOf(p.assets?.image);
    pushForm({
      id: `${key}_NORMAL`,
      name: { en: "Normal", he: "רגיל" },
      kind: "normal",
      status: "available",
      asset: normalAsset,
      shiny: sh ? "yes" : "no",
    });
    // NORMAL forms use PokéAPI official artwork by Pokédex number, so a missing icon is not reported.

    for (const a of (p.assetForms ?? []) as Json[]) {
      if (a.isFemale) continue;
      let formTok: string | null = a.form ?? null;
      const costumeTok: string | null = a.costume ?? null;
      if (!formTok && !costumeTok) continue;
      if (formTok && formTok.startsWith(`${key}_`)) formTok = formTok.slice(key.length + 1);
      if (formTok && /^(MEGA|PRIMAL|GIGANTAMAX|ETERNAMAX|NORMAL)/.test(formTok) && !costumeTok) continue;
      const region = formTok ? regionOf(formTok) : undefined;
      const fid = [key, formTok, costumeTok ? `C_${costumeTok}` : null].filter(Boolean).join("_").replace(/[^A-Z0-9_]/g, "_");
      const proto = formTok ? `${key}_${formTok}` : "";
      const costume = !!costumeTok || (proto && isCostumeProto(proto)) || /\d{4}/.test(formTok ?? "");
      const kind: PokemonForm["kind"] = costume ? "costume" : region ? "regional" : "special";

      let status: PokemonForm["status"] = "available";
      let shinyTri: PokemonForm["shiny"] = "unknown";
      if (kind === "regional") {
        const regionalName = formTok!;
        if (region === "alola") status = alolan.has(id) ? "available" : "unverified";
        else if (region === "galar") status = galarian.has(id) ? "available" : "unverified";
        else status = releasedForms.has(`${key}_${regionalName}`) ? "available" : "unverified";
        if (region === "alola" && sh?.alolan_shiny) shinyTri = "yes";
      }
      const tokenLabel = [formTok, costumeTok].filter(Boolean).join("_");
      const rf = p.regionForms && !Array.isArray(p.regionForms) ? p.regionForms[`${key}_${formTok}`] : undefined;
      const special = FORM_NAME_OVERRIDES[`${key}_${tokenLabel}`];
      const enName = special ? special.en : rf?.names?.English ? String(rf.names.English).replace(new RegExp(`\\s*${en}\\s*`), " ").trim() || humanizeToken(tokenLabel) : humanizeToken(tokenLabel);
      const asset = assetOf(a.image);
      if (!asset) missingArtwork.push(fid);
      pushForm({
        id: fid,
        name: { en: enName, he: special?.he ?? (hebrewForToken(tokenLabel) || enName) },
        kind,
        region,
        status,
        asset,
        shiny: shinyTri,
        eventTag: costume ? tokenLabel : undefined,
      });
    }
    // Species whose default asset is a specific form (e.g. Unown A) – keep NORMAL as the generic entry.

    const eliteMoves = [
      ...Object.keys(p.eliteQuickMoves && !Array.isArray(p.eliteQuickMoves) ? p.eliteQuickMoves : {}),
      ...Object.keys(p.eliteCinematicMoves && !Array.isArray(p.eliteCinematicMoves) ? p.eliteCinematicMoves : {}),
    ];
    const tradable = !untradable.has(key) && (cls !== "mythical" || tradableMythicals.includes(id));
    const gmax = gigantamax.has(key) || !!p.hasGigantamaxEvolution;

    species.push({
      id,
      key,
      name: { en, he },
      aliases,
      gen: p.generation,
      types: [typeName(p.primaryType), typeName(p.secondaryType)].filter((t): t is string => !!t),
      class: cls,
      released: isReleased,
      baby: baby.has(id),
      family: m?.family ?? id,
      forms,
      flags: {
        shinyReleased: !!sh,
        shinyChannels,
        shadow: shadow.has(id),
        nesting: nesting.has(id),
        raidExclusive: raidEx.has(id),
        researchExclusive: researchEx.has(id),
        photobombExclusive: photobombEx.has(id),
        regionalExclusive: regionalByid.get(id) ?? null,
        dynamax: dynamax.has(key) || gmax,
        gigantamax: gmax,
        eliteMoves,
        sizeVariants: sizeKeys.has(key),
        tradable,
      },
    });
  }

  // ---------- Carry forward (never silently erase) ----------
  const formsRetained: string[] = [];
  if (previous) {
    const byId = new Map(species.map((s) => [s.id, s]));
    for (const ps of previous.species) {
      const cur = byId.get(ps.id);
      if (!cur) {
        species.push(ps);
        needsReview.push(`species #${ps.id} ${ps.name.en} missing from upstream – retained from previous catalog`);
        continue;
      }
      if (ps.released && !cur.released) {
        cur.released = true;
        needsReview.push(`species #${ps.id} ${ps.name.en} no longer listed as released upstream – kept released pending review`);
      }
      for (const pf of ps.forms) {
        if (pf.status === "available" && !cur.forms.some((f) => f.id === pf.id)) {
          cur.forms.push(pf);
          formsRetained.push(pf.id);
        }
      }
    }
    species.sort((a, b) => a.id - b.id);
  }

  // ---------- Evidence records ----------
  const asOf = (id: string) => sources.find((s) => s.id === id)?.sourceVersion ?? sources.find((s) => s.id === id)?.retrievedAt ?? today();
  const evidence: EvidenceRecord[] = [
    { id: "EV.RELEASED", description: { en: "Released-species list", he: "רשימת הפוקימונים ששוחררו" }, sourceId: "pogoapi:released_pokemon", url: UPSTREAM[0]!.url, confidence: "medium", period: { asOf: asOf("pogoapi:released_pokemon") } },
    { id: "EV.SHINY", description: { en: "Shiny releases and channels", he: "שחרורי שייני והדרכים להשיג אותם" }, sourceId: "pogoapi:shiny_pokemon", confidence: "medium", period: { asOf: asOf("pogoapi:shiny_pokemon") } },
    { id: "EV.CLASS", description: { en: "Legendary / Mythical / Ultra Beast classification", he: "סיווג אגדי / מיתי / אולטרה ביסט" }, sourceId: "pokemon-go-api", confidence: "high", period: { asOf: asOf("pokemon-go-api") } },
    { id: "EV.MAX", description: { en: "Dynamax / Gigantamax capability (game master)", he: "יכולת דיינמקס / גיגנטמקס (קובץ המשחק)" }, sourceId: "game-master", confidence: "medium", period: { asOf: asOf("game-master") } },
    { id: "EV.COSTUME", description: { en: "Costume and form assets", he: "תחפושות וצורות" }, sourceId: "pokemon-go-api", confidence: "medium", period: { asOf: asOf("pokemon-go-api") } },
    { id: "EV.REGIONAL", description: { en: "Regional exclusives (curated)", he: "פוקימונים אזוריים (נאסף ידנית)" }, sourceId: "curated-regionals", confidence: "medium", period: { asOf: curatedEvidence._meta.updated } },
    { id: "EV.SHINY_RATES", description: { en: "Shiny rate categories (community research)", he: "קטגוריות סיכוי לשייני (מחקר קהילה)" }, sourceId: "curated-shiny-rates", confidence: "medium", period: { asOf: curatedEvidence._meta.updated } },
    { id: "EV.TRADING", description: { en: "Official trading rules", he: "חוקי ההחלפה הרשמיים" }, sourceId: "official-trading", confidence: "high", period: { asOf: "2026-11-14" } },
  ];
  // Curated, source-backed evidence records (research results) – see data/curation/evidence.json.
  for (const r of curatedEvidence.evidenceRecords ?? []) evidence.push(r);
  for (const b of backgrounds) for (const id of b.evidenceIds ?? []) if (!evidence.some((e) => e.id === id)) errors.push(`background ${b.id} references unknown evidence ${id}`);
  for (const c of curatedEvidence.verifiedCombos) {
    if (!evidence.some((e) => e.id === c.evidenceId)) errors.push(`verifiedCombo references unknown evidence ${c.evidenceId}`);
  }

  const catalogVersion = `${today()}.${createHash("sha256").update(JSON.stringify(species)).digest("hex").slice(0, 8)}`;
  const candidate = {
    schemaVersion: 1 as const,
    catalogVersion,
    generatedAt: new Date().toISOString(),
    sources,
    evidence,
    species,
    backgrounds,
    verifiedCombos: curatedEvidence.verifiedCombos,
    tradableMythicals,
  };

  // ---------- Schema + integrity validation ----------
  const parsed = Catalog.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 50)) errors.push(`schema: ${issue.path.join(".")}: ${issue.message}`);
  }
  const ids = new Set<number>();
  const formIds = new Set<string>();
  const invalidCombinations: string[] = [];
  for (const s of species) {
    if (ids.has(s.id)) errors.push(`duplicate species id ${s.id}`);
    ids.add(s.id);
    if (!s.forms.some((f) => f.kind === "normal")) errors.push(`#${s.id} has no normal form`);
    for (const f of s.forms) {
      if (formIds.has(f.id)) errors.push(`duplicate form id ${f.id}`);
      formIds.add(f.id);
    }
    if (s.flags.gigantamax && !s.flags.dynamax) invalidCombinations.push(`#${s.id} gigantamax without dynamax`);
    if (s.class === "mythical" && s.flags.tradable && !tradableMythicals.includes(s.id)) invalidCombinations.push(`#${s.id} mythical marked tradable`);
    if (!s.released && s.flags.shinyReleased) invalidCombinations.push(`#${s.id} ${s.name.en}: shiny released but species not released`);
  }
  if (species.length < 900) errors.push(`only ${species.length} species – upstream looks truncated`);
  if (released.size < 800) errors.push(`only ${released.size} released species – upstream looks truncated`);
  for (const ic of invalidCombinations) needsReview.push(`invalid combination: ${ic}`);

  if (errors.length) {
    console.error("Catalog build FAILED – published catalog left unchanged:\n" + errors.map((e) => "  - " + e).join("\n"));
    if (previous) writeReport(previous, { status: "failed", ingestionErrors: errors, needsReview });
    process.exit(1);
  }
  const catalog = parsed.data!;

  // ---------- Diff vs previous ----------
  const prevIds = new Set(previous?.species.map((s) => s.id) ?? []);
  const prevReleased = new Set(previous?.species.filter((s) => s.released).map((s) => s.id) ?? []);
  const prevForms = new Set(previous?.species.flatMap((s) => s.forms.map((f) => f.id)) ?? []);
  const changes = {
    added: catalog.species.filter((s) => !prevIds.has(s.id)).map((s) => s.id),
    removed: [...prevIds].filter((id) => !ids.has(id)),
    newlyReleased: catalog.species.filter((s) => s.released && !prevReleased.has(s.id)).map((s) => s.id),
    formsAdded: catalog.species.flatMap((s) => s.forms.map((f) => f.id)).filter((f) => !prevForms.has(f)),
    formsRetained,
  };

  // ---------- Publish ----------
  const unchanged = previous && JSON.stringify(previous.species) === JSON.stringify(catalog.species) && JSON.stringify(previous.backgrounds) === JSON.stringify(catalog.backgrounds);
  const toPublish = unchanged ? { ...catalog, catalogVersion: previous!.catalogVersion, generatedAt: previous!.generatedAt } : catalog;
  mkdirSync(path.dirname(OUT_CATALOG), { recursive: true });
  writeFileSync(OUT_CATALOG, JSON.stringify(toPublish));
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapPath = path.join(SNAPSHOT_DIR, `catalog-${toPublish.catalogVersion}.json.gz`);
  if (!existsSync(snapPath)) writeFileSync(snapPath, gzipSync(JSON.stringify(toPublish)));
  pruneSnapshots(5);

  if (!unchanged) {
    const log = existsSync(CHANGELOG) ? readJson(CHANGELOG) : { entries: [] };
    log.entries.unshift({
      catalogVersion: toPublish.catalogVersion,
      previousVersion: previous?.catalogVersion ?? null,
      generatedAt: toPublish.generatedAt,
      sources: sources.filter((s) => s.sha256).map((s) => ({ id: s.id, sha256: s.sha256 })),
      added: changes.added.length,
      removed: changes.removed.length,
      newlyReleased: changes.newlyReleased,
      formsAdded: changes.formsAdded.length,
      formsRetained: changes.formsRetained,
      needsReview,
    });
    writeFileSync(CHANGELOG, JSON.stringify(log, null, 2) + "\n");
  }

  writeReport(toPublish, { status: "ok", ingestionErrors: [], needsReview, missingArtwork, invalidCombinations, changes });
  console.log(
    `Catalog ${toPublish.catalogVersion}${unchanged ? " (unchanged)" : ""}: ${catalog.species.length} species, ` +
      `${catalog.species.filter((s) => s.released).length} released, ${catalog.species.reduce((n, s) => n + s.forms.length, 0)} forms, ` +
      `${catalog.backgrounds.length} backgrounds. Review items: ${needsReview.length}.`,
  );
}

function pruneSnapshots(keep: number) {
  const files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith(".json.gz")).sort().reverse();
  // keep the newest `keep` snapshots; older ones stay in git history
  for (const f of files.slice(keep)) {
    unlinkSync(path.join(SNAPSHOT_DIR, f));
  }
}

function writeReport(
  catalog: ReturnType<typeof Catalog.parse>,
  extra: Partial<Report> & { status: Report["status"] },
) {
  const idx = new CatalogIndex(catalog);
  const rankings = buildRankings(idx, catalog.generatedAt);
  const missingRarityEvidence = catalog.species
    .filter((s) => s.released && s.class === "standard" && !s.flags.nesting && s.flags.shinyChannels.length === 0 && !s.baby && !s.flags.raidExclusive && !s.flags.researchExclusive && !s.flags.photobombExclusive)
    .map((s) => s.id);
  const prevReport: Report | null = existsSync(OUT_REPORT) ? readJson(OUT_REPORT) : null;
  const report: Report = {
    generatedAt: new Date().toISOString(),
    catalogVersion: catalog.catalogVersion,
    scoringVersion: SCORING_VERSION,
    status: extra.status,
    sources: catalog.sources.map((s) => ({ id: s.id, retrievedAt: s.retrievedAt, lastModified: s.sourceVersion, sha256: s.sha256 })),
    counts: {
      species: catalog.species.length,
      released: catalog.species.filter((s) => s.released).length,
      unreleased: catalog.species.filter((s) => !s.released).length,
      forms: catalog.species.reduce((n, s) => n + s.forms.length, 0),
      formsUnverified: catalog.species.reduce((n, s) => n + s.forms.filter((f) => f.status === "unverified").length, 0),
      costumes: catalog.species.reduce((n, s) => n + s.forms.filter((f) => f.kind === "costume").length, 0),
      shinyReleased: catalog.species.filter((s) => s.flags.shinyReleased).length,
      dynamax: catalog.species.filter((s) => s.flags.dynamax).length,
      gigantamax: catalog.species.filter((s) => s.flags.gigantamax).length,
      backgrounds: catalog.backgrounds.length,
      backgroundsVerified: catalog.backgrounds.filter((b) => b.verifiedSpecies.length > 0).length,
      verifiedCombos: catalog.verifiedCombos.length,
    },
    missingArtwork: extra.missingArtwork ?? prevReport?.missingArtwork ?? [],
    missingRarityEvidence,
    invalidCombinations: extra.invalidCombinations ?? prevReport?.invalidCombinations ?? [],
    ingestionErrors: extra.ingestionErrors ?? [],
    needsReview: extra.needsReview ?? prevReport?.needsReview ?? [],
    changes: extra.changes ?? prevReport?.changes ?? { added: [], removed: [], newlyReleased: [], formsAdded: [], formsRetained: [] },
    rankings: {
      variants: rankings.variants.length,
      ranked: rankings.variants.filter((v) => v.rank !== null).length,
      unranked: rankings.variants.filter((v) => v.rank === null).length,
      species: rankings.species.length,
    },
  };
  writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2) + "\n");
}

main();
