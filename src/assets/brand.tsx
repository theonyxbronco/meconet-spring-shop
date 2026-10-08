/**
 * ─── ASSET SWAP POINT ────────────────────────────────────────────────────────
 * Every piece of imagery in the prototype is resolved here, so swapping artwork
 * is a change to this one file:
 *
 *   Wordmark   → the meconet lockup from `public/meconet_logo.png`
 *   KitBoxArt  → the kit's lid label from `public/kit-covers`, named on the kit
 *   KitShot    → any further photograph of the kit, listed on the kit
 *   SpringPhoto→ the component's studio photograph, when `kits.ts` gives it one,
 *                otherwise the generated SpringArt below
 *   SpringArt  → generated from each spring's real dimensions, so it stays
 *                correct for any component you add to the catalogue. This is
 *                the only art the actual-size overlay may use, because it is
 *                the only art guaranteed to be drawn to scale.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Image from "next/image";
import { useId } from "react";
import { springProfile } from "@/lib/springProfile";
import { variantName } from "@/data/kits";
import type { Kit, KitPhoto, KitTier, SpringComponent } from "@/data/types";

/**
 * The meconet wordmark, from `public/meconet_logo.png`. The artwork is drawn in
 * white on transparency, which is right for the navy header and footer; `tone="dark"`
 * inverts it to near-black for the printed order sheets. It stays an <img> rather
 * than a tinted mask because a mask is a background graphic, and the print dialog
 * drops those by default — the letterhead has to survive being put on paper.
 *
 * The lockup has one shape, so callers give it a width and the height follows.
 */
export function Wordmark({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <Image
      src="/meconet_logo.png"
      alt="meconet"
      width={242}
      height={31}
      priority
      className={`h-auto select-none ${tone === "light" ? "" : "invert"} ${className}`}
    />
  );
}

/** Metallic stroke used by every generated spring illustration. */
function SteelGradient({ id, dark = false }: { id: string; dark?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={dark ? "#1d2a3a" : "#8fa3b8"} />
      <stop offset="28%" stopColor={dark ? "#5b6b7e" : "#e8eef5"} />
      <stop offset="52%" stopColor={dark ? "#141c27" : "#9fb2c6"} />
      <stop offset="78%" stopColor={dark ? "#43505f" : "#cfdae6"} />
      <stop offset="100%" stopColor={dark ? "#0d141c" : "#7d93aa"} />
    </linearGradient>
  );
}

export function SpringArt({
  spring,
  className = "",
  dark,
}: {
  spring: SpringComponent;
  className?: string;
  dark?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const profile = springProfile(spring);
  // Stainless reads brighter; plated steel reads darker.
  const isDark = dark ?? spring.material.includes("10270-1");

  return (
    <svg
      viewBox={profile.viewBox}
      className={className}
      role="img"
      aria-label={`${spring.name}, ${spring.code}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <SteelGradient id={`steel-${uid}`} dark={isDark} />
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={profile.strokeWidth * 0.35} stdDeviation={profile.strokeWidth * 0.3} floodColor="#0b2e5e" floodOpacity="0.18" />
        </filter>
      </defs>
      <g
        fill="none"
        stroke={`url(#steel-${uid})`}
        strokeWidth={profile.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#shadow-${uid})`}
      >
        <path d={profile.body} />
        {profile.features.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The real studio photograph of a component, where the catalogue has one.
 *
 * Falls back to the generated illustration so a kit without photography still
 * renders. Never use this in the actual-size overlay — the photographs are shot
 * to look good, not to scale.
 */
export function SpringPhoto({
  spring,
  className = "",
  sizes = "(max-width: 1024px) 90vw, 620px",
}: {
  spring: SpringComponent;
  className?: string;
  sizes?: string;
}) {
  if (!spring.photoUrl) return <SpringArt spring={spring} className={className} />;

  return (
    <div className={`relative ${className}`}>
      <Image
        src={spring.photoUrl}
        alt={`${spring.name}, ${spring.code}`}
        fill
        sizes={sizes}
        className="object-contain"
      />
    </div>
  );
}

/**
 * The kit's printed lid label — the artwork a customer recognises on the shelf.
 * `art="thumbnail"` picks the tighter crop, which is what survives being drawn at
 * the size of a result card or a cart line; the full lid is for the big stages.
 */
export function KitBoxArt({
  kit,
  className = "",
  art = "cover",
  fit = "contain",
  tier = "basic",
}: {
  kit: Kit;
  className?: string;
  art?: "cover" | "thumbnail";
  /** The build whose lid to show; Pro falls back to the Basic lid when it has none of its own. */
  tier?: KitTier;
  /**
   * `contain` floats the lid on whatever is behind it, which is what a gallery
   * stage or a cart line wants. `fit="cover"` instead fills its box edge to edge,
   * for the card that is meant to *be* the picture — so the lifted-off-the-page
   * shadow and the corner radius come off with it.
   */
  fit?: "contain" | "cover";
}) {
  const cover = (tier === "pro" && kit.pro.coverImage) || kit.coverImage;
  return (
    <div className={`relative ${className}`}>
      <Image
        src={art === "thumbnail" ? kit.thumbnailImage : cover}
        alt={`${tier === "pro" ? variantName(kit, tier) : kit.name} assortment box`}
        fill
        sizes={art === "thumbnail" ? "(max-width: 768px) 45vw, 300px" : "(max-width: 768px) 90vw, 420px"}
        className={
          fit === "cover"
            ? "object-cover"
            : "rounded-[6px] object-contain drop-shadow-[0_6px_18px_rgba(11,46,94,0.18)]"
        }
      />
    </div>
  );
}

/** A further photograph of the kit itself — the open box, a layout shot. */
export function KitShot({ photo, className = "" }: { photo: KitPhoto; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src={photo.src}
        alt={photo.label}
        fill
        sizes="(max-width: 768px) 90vw, 420px"
        className="rounded-[6px] object-contain drop-shadow-[0_6px_18px_rgba(11,46,94,0.18)]"
      />
    </div>
  );
}
