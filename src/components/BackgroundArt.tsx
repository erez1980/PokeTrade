"use client";
import { useState } from "react";
import type { PokemonBackground } from "@/domain/catalog/schema";
import { backgroundImage } from "@/lib/images";

/** Background picture with a colourful fallback card when no picture exists. */
export function BackgroundArt({ bg, className = "", label }: { bg: PokemonBackground; className?: string; label?: string }) {
  const src = backgroundImage(bg.image);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`flex items-center justify-center bg-gradient-to-br ${bg.kind === "location" ? "from-sky-400 to-emerald-300" : "from-fuchsia-400 to-amber-300"} p-1 text-center text-[10px] font-bold text-white ${className}`} role="img" aria-label={label ?? bg.name.en}>
        {label ?? bg.name.en}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label ?? bg.name.en} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={`object-cover ${className}`} onError={() => setFailed(true)} />
  );
}
