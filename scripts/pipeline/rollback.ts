/**
 * Safe rollback of the published catalog to a previous snapshot.
 *
 *   npm run data:rollback            # list snapshots
 *   npm run data:rollback -- <version>   # restore catalog-<version>.json.gz
 *
 * The restored file is re-validated against the schema before it is written.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { Catalog } from "../../src/domain/catalog/schema";

const DIR = "data/catalog/snapshots";
const OUT = "public/data/catalog.json";
const version = process.argv[2];
const snaps = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json.gz")).sort().reverse() : [];

if (!version) {
  const current = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).catalogVersion : "none";
  console.log(`Current: ${current}\nSnapshots:\n${snaps.map((s) => "  " + s.replace(/^catalog-|\.json\.gz$/g, "")).join("\n") || "  (none)"}`);
  process.exit(0);
}
const file = path.join(DIR, `catalog-${version}.json.gz`);
if (!existsSync(file)) {
  console.error(`Snapshot ${version} not found.`);
  process.exit(1);
}
const parsed = Catalog.safeParse(JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")));
if (!parsed.success) {
  console.error("Snapshot failed schema validation – not restored.");
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(parsed.data));
console.log(`Restored catalog ${version}. Run "npm run build" and redeploy.`);
