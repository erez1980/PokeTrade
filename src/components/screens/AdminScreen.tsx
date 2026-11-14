"use client";
import { useEffect, useState } from "react";
import { withBase } from "@/lib/base-path";

interface Report {
  generatedAt: string;
  catalogVersion: string;
  scoringVersion: string;
  status: string;
  sources: { id: string; retrievedAt?: string; lastModified?: string; sha256?: string }[];
  counts: Record<string, number>;
  missingArtwork: string[];
  missingRarityEvidence: number[];
  invalidCombinations: string[];
  ingestionErrors: string[];
  needsReview: string[];
  changes: { added: number[]; removed: number[]; newlyReleased: number[]; formsAdded: string[]; formsRetained: string[] };
  rankings: Record<string, number>;
}

/** Internal data-quality dashboard (developer/admin view, read-only, not linked from the main navigation). */
export function AdminScreen() {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(withBase("/data/report.json"))
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then(setR)
      .catch(() => setErr(true));
  }, []);
  if (err) return <p className="card p-4">report.json not available</p>;
  if (!r) return <p className="p-4">Loading…</p>;
  const List = ({ title, items }: { title: string; items: (string | number)[] }) => (
    <section className="card p-4">
      <h2 className="font-black">{title} <span className="text-ink-soft">({items.length})</span></h2>
      {items.length ? (
        <ul className="mt-2 max-h-64 overflow-auto font-mono text-xs">{items.map((i) => <li key={String(i)}>{i}</li>)}</ul>
      ) : (
        <p className="mt-1 text-sm text-emerald-700">✓ none</p>
      )}
    </section>
  );
  return (
    <div dir="ltr" className="space-y-4 text-left">
      <h1 className="text-2xl font-black">Data quality dashboard</h1>
      <section className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <p>Status: <b className={r.status === "ok" ? "text-emerald-700" : "text-rose-700"}>{r.status}</b></p>
        <p>Last successful build: <b>{r.generatedAt}</b></p>
        <p>Catalog version: <b className="font-mono">{r.catalogVersion}</b></p>
        <p>Scoring version: <b className="font-mono">{r.scoringVersion}</b></p>
      </section>
      <section className="card p-4">
        <h2 className="font-black">Counts</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {Object.entries({ ...r.counts, ...Object.fromEntries(Object.entries(r.rankings).map(([k, v]) => [`rankings.${k}`, v])) }).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-violet-50 p-2"><p className="font-mono text-[11px]">{k}</p><p className="text-lg font-black">{v}</p></div>
          ))}
        </div>
      </section>
      <section className="card overflow-x-auto p-4">
        <h2 className="font-black">Source versions</h2>
        <table className="mt-2 w-full text-xs">
          <thead><tr className="text-left"><th>id</th><th>retrieved</th><th>last-modified</th><th>sha256</th></tr></thead>
          <tbody>
            {r.sources.map((s) => (
              <tr key={s.id} className="border-t"><td className="py-1 font-mono">{s.id}</td><td>{s.retrievedAt}</td><td>{s.lastModified ?? "—"}</td><td className="font-mono">{s.sha256?.slice(0, 12) ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <List title="Ingestion errors" items={r.ingestionErrors} />
        <List title="Unreviewed updates / needs review" items={r.needsReview} />
        <List title="Invalid attribute combinations" items={r.invalidCombinations} />
        <List title="Missing artwork (form icons)" items={r.missingArtwork} />
        <List title="Missing rarity evidence (released species, low confidence)" items={r.missingRarityEvidence} />
        <List title="Newly released in this build" items={r.changes.newlyReleased} />
        <List title="Forms retained (dropped upstream)" items={r.changes.formsRetained} />
      </div>
    </div>
  );
}
