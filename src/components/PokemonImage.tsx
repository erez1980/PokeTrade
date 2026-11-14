"use client";
import { useState } from "react";
import type { PokemonForm, PokemonSpecies } from "@/domain/catalog/schema";
import { formImage, speciesArtwork } from "@/lib/images";

interface Props {
  species: PokemonSpecies;
  form?: PokemonForm;
  shiny?: boolean;
  size?: number;
  alt?: string;
  className?: string;
  sparkle?: boolean;
  priority?: boolean;
}

/** Lazy-loaded artwork with graceful fallback (species artwork -> placeholder silhouette). */
export function PokemonImage({ species, form, shiny = false, size = 96, alt, className = "", sparkle, priority }: Props) {
  const primary = formImage(species, form, shiny);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);
  const [lastPrimary, setLastPrimary] = useState(primary);
  if (primary !== lastPrimary) {
    setLastPrimary(primary);
    setSrc(primary);
    setFailed(false);
  }
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {failed ? (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" aria-label={alt ?? species.name.en} role="img">
          <circle cx="12" cy="12" r="10" fill="#e9e5ff" />
          <text x="12" y="16" textAnchor="middle" fontSize="9" fill="#6d28d9" fontWeight="700">?</text>
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? species.name.en}
          width={size}
          height={size}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(76,29,149,0.25)]"
          onError={() => {
            const fallback = speciesArtwork(species.id, shiny);
            if (src !== fallback) setSrc(fallback);
            else setFailed(true);
          }}
        />
      )}
      {(sparkle ?? shiny) && (
        <>
          <span className="sparkle" style={{ top: "6%", insetInlineStart: "10%", animationDelay: "0s" }} />
          <span className="sparkle" style={{ top: "20%", insetInlineEnd: "6%", animationDelay: "0.6s" }} />
          <span className="sparkle" style={{ bottom: "12%", insetInlineStart: "22%", animationDelay: "1.2s" }} />
        </>
      )}
    </span>
  );
}
