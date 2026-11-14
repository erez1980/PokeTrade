/**
 * Step 1 of the catalog pipeline: download every upstream source into data/sources/raw
 * and record retrieval time, HTTP Last-Modified and SHA-256 in data/sources/manifest.json.
 *
 *   npm run data:fetch
 *
 * Raw files are git-ignored (some are large); the manifest is committed so every catalog
 * build is traceable to exact upstream content.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { MANIFEST, RAW_DIR, UPSTREAM } from "./sources";

interface ManifestEntry {
  id: string;
  url: string;
  file: string;
  retrievedAt: string;
  lastModified?: string;
  sha256: string;
  bytes: number;
}

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "PokeTrade-catalog-pipeline/1.0" } });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  throw lastErr;
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  const previous: ManifestEntry[] = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")).entries : [];
  const entries: ManifestEntry[] = [];
  const errors: string[] = [];
  for (const src of UPSTREAM) {
    try {
      const res = await fetchWithRetry(src.url);
      const text = await res.text();
      JSON.parse(text); // must be valid JSON
      const sha256 = createHash("sha256").update(text).digest("hex");
      writeFileSync(path.join(RAW_DIR, src.file), text);
      const prev = previous.find((p) => p.id === src.id);
      entries.push({
        id: src.id,
        url: src.url,
        file: src.file,
        retrievedAt: new Date().toISOString(),
        lastModified: res.headers.get("last-modified") ?? undefined,
        sha256,
        bytes: text.length,
      });
      console.log(`${prev?.sha256 === sha256 ? "unchanged" : "UPDATED  "} ${src.id} (${text.length} bytes)`);
    } catch (e) {
      errors.push(`${src.id}: ${(e as Error).message}`);
      const prev = previous.find((p) => p.id === src.id);
      if (prev) entries.push(prev); // keep the last good snapshot
      console.error(`FAILED   ${src.id}: ${(e as Error).message}`);
    }
  }
  writeFileSync(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), entries, errors }, null, 2) + "\n");
  if (errors.length) {
    console.error(`${errors.length} source(s) failed; previous snapshots were kept.`);
    process.exitCode = 1;
  }
}

main();
