import type { PokemonForm, PokemonSpecies } from "@/domain/catalog/schema";

/**
 * Artwork is hot-linked (not redistributed) from community asset repositories:
 *  - PokéAPI sprites (official artwork)      https://github.com/PokeAPI/sprites
 *  - pokemon-go-api assets (GO form icons)    https://github.com/pokemon-go-api/assets
 * Pokémon artwork is © Nintendo / Creatures / GAME FREAK / The Pokémon Company; see docs/DATA_SOURCES.md.
 */
const POKEAPI = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const GOAPI = "https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon";

export function speciesArtwork(id: number, shiny = false): string {
  return shiny ? `${POKEAPI}/shiny/${id}.png` : `${POKEAPI}/${id}.png`;
}

export function formImage(species: PokemonSpecies, form: PokemonForm | undefined, shiny = false): string {
  if (!form || form.kind === "normal" || !form.asset) return speciesArtwork(species.id, shiny);
  return `${GOAPI}/${form.asset}${shiny ? ".s" : ""}.icon.png`;
}

/** Background / location-card artwork (game asset), hot-linked from PokeMiners pogo_assets. */
const BG_BASE = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/LocationCards";
export function backgroundImage(image: string | undefined): string | null {
  return image && /^[A-Za-z0-9_-]+$/.test(image) ? `${BG_BASE}/${image}.png` : null;
}
