import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { PokemonDetailsScreen } from "@/components/screens/PokemonDetailsScreen";

interface CatalogLite {
  species: { id: number; name: { en: string; he: string } }[];
}

function loadCatalog(): CatalogLite {
  return JSON.parse(readFileSync(path.join(process.cwd(), "public/data/catalog.json"), "utf8"));
}

/** Every species in the catalog gets a static details page (static export). */
export function generateStaticParams() {
  return loadCatalog().species.map((s) => ({ id: String(s.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = loadCatalog().species.find((x) => String(x.id) === id);
  return { title: s ? `${s.name.he} (${s.name.en})` : "Pokémon" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PokemonDetailsScreen id={Number(id)} />;
}
