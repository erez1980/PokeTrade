import type { Catalog, PokemonBackground, PokemonForm, PokemonSpecies, EvidenceRecord, SourceRef } from "./schema";

/** Fast lookup structure over an immutable catalog snapshot. */
export class CatalogIndex {
  readonly catalog: Catalog;
  private readonly speciesById = new Map<number, PokemonSpecies>();
  private readonly formById = new Map<string, { species: PokemonSpecies; form: PokemonForm }>();
  private readonly backgroundById = new Map<string, PokemonBackground>();
  private readonly evidenceById = new Map<string, EvidenceRecord>();
  private readonly sourceById = new Map<string, SourceRef>();
  private readonly verifiedComboKeys = new Set<string>();

  constructor(catalog: Catalog) {
    this.catalog = catalog;
    for (const s of catalog.species) {
      this.speciesById.set(s.id, s);
      for (const f of s.forms) this.formById.set(f.id, { species: s, form: f });
    }
    for (const b of catalog.backgrounds) this.backgroundById.set(b.id, b);
    for (const e of catalog.evidence) this.evidenceById.set(e.id, e);
    for (const src of catalog.sources) this.sourceById.set(src.id, src);
    for (const c of catalog.verifiedCombos) {
      for (const a of c.attributes) this.verifiedComboKeys.add(`${c.speciesId}|${c.formId ?? "*"}|${a}`);
    }
  }

  get species(): readonly PokemonSpecies[] {
    return this.catalog.species;
  }

  releasedSpecies(): PokemonSpecies[] {
    return this.catalog.species.filter((s) => s.released);
  }

  getSpecies(id: number): PokemonSpecies | undefined {
    return this.speciesById.get(id);
  }

  getForm(formId: string): { species: PokemonSpecies; form: PokemonForm } | undefined {
    return this.formById.get(formId);
  }

  defaultForm(species: PokemonSpecies): PokemonForm {
    return species.forms.find((f) => f.kind === "normal") ?? species.forms[0]!;
  }

  getBackground(id: string): PokemonBackground | undefined {
    return this.backgroundById.get(id);
  }

  getEvidence(id: string): EvidenceRecord | undefined {
    return this.evidenceById.get(id);
  }

  getSource(id: string): SourceRef | undefined {
    return this.sourceById.get(id);
  }

  /** True if a curator verified that `attribute` exists for this species/form. */
  isComboVerified(speciesId: number, formId: string, attribute: string): boolean {
    return (
      this.verifiedComboKeys.has(`${speciesId}|${formId}|${attribute}`) ||
      this.verifiedComboKeys.has(`${speciesId}|*|${attribute}`)
    );
  }

  isTradableMythical(speciesId: number): boolean {
    return this.catalog.tradableMythicals.includes(speciesId);
  }
}
