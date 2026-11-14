/** Upstream data sources used by the catalog ingestion pipeline. */
export interface UpstreamSource {
  id: string;
  name: string;
  url: string;
  license: string;
  file: string;
  notes?: string;
}

const POGOAPI = "https://pogoapi.net/api/v1";
const POGOAPI_LICENSE = "Free public API (pogoapi.net); game-derived facts. No explicit license – attribution given, facts only.";

const pogo = (name: string, notes?: string): UpstreamSource => ({
  id: `pogoapi:${name}`,
  name: `pogoapi.net – ${name}.json`,
  url: `${POGOAPI}/${name}.json`,
  license: POGOAPI_LICENSE,
  file: `pogoapi-${name}.json`,
  notes,
});

export const UPSTREAM: UpstreamSource[] = [
  pogo("released_pokemon", "Species released in Pokémon GO."),
  pogo("shiny_pokemon", "Shiny release + channels in which shinies were found."),
  pogo("pokemon_rarity", "Legendary / Mythic / Ultra beast / Standard classification."),
  pogo("nesting_pokemon"),
  pogo("shadow_pokemon"),
  pogo("raid_exclusive_pokemon"),
  pogo("research_task_exclusive_pokemon"),
  pogo("photobomb_exclusive_pokemon"),
  pogo("baby_pokemon"),
  pogo("alolan_pokemon"),
  pogo("galarian_pokemon"),
  {
    id: "pokemon-go-api",
    name: "pokemon-go-api – pokedex.json",
    url: "https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json",
    license: "MIT (code). Data and icons are derived from the Pokémon GO game master/assets © Niantic / The Pokémon Company.",
    file: "pokemon-go-api-pokedex.json",
    notes: "Names (7 languages), types, class, forms/costumes with asset names, Gigantamax flag, elite moves.",
  },
  {
    id: "watwowmap-masterfile",
    name: "WatWowMap Masterfile-Generator – master-latest.json",
    url: "https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest.json",
    license: "Game-master-derived data published by WatWowMap (see repository license).",
    file: "watwowmap-master-latest.json",
    notes: "Form names, costume flags, family ids, legendary/mythic flags.",
  },
  {
    id: "game-master",
    name: "PokeMiners game_masters – latest.json",
    url: "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json",
    license: "Decoded Pokémon GO game master © Niantic; used for factual game parameters only.",
    file: "pokeminers-game-master.json",
    notes: "Max (Dynamax/Gigantamax) visual settings, size settings, location cards, tradability flags.",
  },
];

export const RAW_DIR = "data/sources/raw";
export const MANIFEST = "data/sources/manifest.json";
