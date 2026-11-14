"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SearchHit } from "@/domain/search/search";
import { isConfident } from "@/domain/search/search";
import { defaultVariant, type VariantConfig } from "@/domain/catalog/variant";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { useStore } from "./providers/StoreProvider";
import { PokemonImage } from "./PokemonImage";
import { IconBox, IconHeart, IconMic, IconSearch, IconX } from "./Icons";
import { useVoiceSearch } from "@/lib/voice";
import { variantTags } from "@/lib/describe";

interface Props {
  onSelect: (v: VariantConfig, source?: { kind: "collection" | "wishlist"; id: string; alreadyTraded?: boolean }) => void;
  autoFocus?: boolean;
  includeUnreleased?: boolean;
  showSaved?: boolean;
  label?: string;
}

export function PokemonPicker({ onSelect, autoFocus, includeUnreleased = false, showSaved = true, label }: Props) {
  const { search, idx } = useCatalog();
  const { m, lang } = useI18n();
  const store = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<null | "collection" | "wishlist">(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceSearch(lang === "he" ? "he-IL" : "en-US");

  const hits = useMemo<SearchHit[]>(() => (search && q.trim() ? search.search(q, { limit: 8, includeUnreleased }) : []), [search, q, includeUnreleased]);
  const voiceHits = useMemo<SearchHit[]>(() => (search && voice.transcripts.length ? search.searchMany(voice.transcripts, 6) : []), [search, voice.transcripts]);

  useEffect(() => setActive(0), [q]);

  const choose = (h: SearchHit) => {
    const formId = (h.form ?? h.species.forms.find((f) => f.kind === "normal") ?? h.species.forms[0]!).id;
    onSelect(defaultVariant(h.species.id, formId));
    setQ("");
    setOpen(false);
    voice.cancel();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = hits[active];
      if (h) choose(h);
    } else if (e.key === "Escape") setOpen(false);
  };

  const voiceMessage =
    voice.state === "listening"
      ? m.voice.listening
      : voice.state === "error"
        ? voice.error === "denied"
          ? m.voice.denied
          : voice.error === "unsupported"
            ? m.voice.unsupported
            : voice.error === "network"
              ? m.voice.network
              : voice.error === "timeout"
                ? m.voice.timeout
                : m.voice.noSpeech
        : voice.state === "done" && !voiceHits.length
          ? m.voice.noMatch
          : null;

  if (!idx) return null;

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>{label ?? m.picker.searchLabel}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-violet-400 [inset-inline-start:0.85rem]" size={20} />
          <input
            id={`${listId}-input`}
            ref={inputRef}
            className="input scroll-mt-20 ps-11"
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={m.picker.placeholder}
            value={q}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={`${listId}-list`}
            aria-activedescendant={open && hits[active] ? `${listId}-opt-${active}` : undefined}
            aria-autocomplete="list"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              // On phones keep the suggestions above the sticky compare button / bottom navigation.
              if (window.matchMedia("(max-width: 767px)").matches) inputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
          />
        </div>
        {voice.supported ? (
          <button
            type="button"
            className={`btn h-12 w-12 !p-0 ${voice.state === "listening" ? "listening bg-rose-500 text-white" : "btn-sun"}`}
            aria-label={voice.state === "listening" ? m.voice.cancel : m.voice.button}
            title={m.voice.button}
            aria-pressed={voice.state === "listening"}
            onClick={() => (voice.state === "listening" ? voice.cancel() : voice.start())}
          >
            {voice.state === "listening" ? <IconX /> : <IconMic />}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost h-12 w-12 !p-0" aria-label={`${m.voice.button} – ${m.voice.unsupported}`} title={m.voice.unsupported} disabled>
            <IconMic />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <ul id={`${listId}-list`} role="listbox" className="card absolute z-50 mt-2 max-h-80 w-full overflow-auto p-1">
          {hits.length === 0 ? (
            <li className="p-3 text-sm text-ink-soft">{m.picker.noResults}</li>
          ) : (
            hits.map((h, i) => (
              <li
                key={`${h.species.id}-${h.form?.id ?? ""}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl p-2 ${i === active ? "bg-violet-100" : "hover:bg-violet-50"}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(h);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <PokemonImage species={h.species} form={h.form} size={44} />
                <span className="flex-1">
                  <span className="block font-bold">
                    {h.species.name[lang]} {h.form && <span className="text-violet-600">({h.form.name[lang]})</span>}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    <span className="ltr">#{h.species.id} · {h.species.name.en}</span>
                    {!h.species.released && <span className="ms-2 text-amber-700">{m.picker.notReleased}</span>}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {voice.state !== "idle" && (
        <div className="card pop-in mt-2 p-3" role="status" aria-live="polite">
          {voiceMessage && <p className="text-sm font-semibold">{voiceMessage}</p>}
          {voice.state === "done" && voice.transcripts.length > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              {m.voice.heard} <q>{voice.transcripts[0]}</q>
            </p>
          )}
          {voiceHits.length > 0 && (
            <>
              <p className="mt-2 text-sm font-bold">{isConfident(voiceHits) ? m.picker.didYouMean : m.picker.whichOne}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {voiceHits.map((h) => (
                  <button key={h.species.id} type="button" className="flex items-center gap-2 rounded-2xl bg-violet-50 p-2 text-start hover:bg-violet-100" onClick={() => choose(h)}>
                    <PokemonImage species={h.species} form={h.form} size={40} />
                    <span className="text-sm font-bold">{h.species.name[lang]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {voice.state !== "listening" && voice.error !== "unsupported" && (
              <button type="button" className="btn btn-ghost !min-h-9 !py-1 text-sm" onClick={voice.start}>{m.voice.retry}</button>
            )}
            <button type="button" className="btn btn-ghost !min-h-9 !py-1 text-sm" onClick={() => { voice.cancel(); inputRef.current?.focus(); }}>{m.voice.cancel}</button>
            <span className="text-[11px] text-ink-soft">{m.voice.privacy}</span>
          </div>
        </div>
      )}

      {showSaved && (store.collection.length > 0 || store.wishlist.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {store.collection.length > 0 && (
            <button type="button" className={`btn btn-ghost !min-h-9 !py-1 text-sm ${saved === "collection" ? "!bg-violet-200" : ""}`} aria-expanded={saved === "collection"} onClick={() => setSaved(saved === "collection" ? null : "collection")}>
              <IconBox size={16} /> {m.picker.fromCollection}
            </button>
          )}
          {store.wishlist.length > 0 && (
            <button type="button" className={`btn btn-ghost !min-h-9 !py-1 text-sm ${saved === "wishlist" ? "!bg-violet-200" : ""}`} aria-expanded={saved === "wishlist"} onClick={() => setSaved(saved === "wishlist" ? null : "wishlist")}>
              <IconHeart size={16} /> {m.picker.fromWishlist}
            </button>
          )}
        </div>
      )}
      {saved && (
        <div className="card pop-in mt-2 max-h-72 overflow-auto p-2">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {(saved === "collection" ? store.collection : store.wishlist).map((e) => {
              const s = idx.getSpecies(e.variant.speciesId);
              if (!s) return null;
              const f = idx.getForm(e.variant.formId)?.form;
              const tags = variantTags(idx, e.variant, m, lang);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-2xl p-2 text-start hover:bg-violet-50"
                    onClick={() => {
                      onSelect(e.variant, { kind: saved, id: e.id, alreadyTraded: "alreadyTraded" in e ? e.alreadyTraded : undefined });
                      setSaved(null);
                    }}
                  >
                    <PokemonImage species={s} form={f} shiny={e.variant.shiny} size={40} sparkle={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{"nickname" in e && e.nickname ? e.nickname : s.name[lang]}</span>
                      <span className="block truncate text-xs text-ink-soft">{tags.join(" · ") || m.attrs.sizeNormal}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
