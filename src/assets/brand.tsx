/**
 * ─── ASSET SWAP POINT ────────────────────────────────────────────────────────
 * Every piece of imagery in the prototype is generated here, so replacing the
 * placeholders with real Meconet assets is a change to this one file:
 *
 *   Wordmark   → swap the <text> for <Image src="/meconet-logo.svg" …>
 *   KitBoxArt  → swap the generated box for <Image src={`/kits/${kit.slug}.jpg`} …>
 *   SpringArt  → keep it; it is generated from each spring's real dimensions,
 *                so it stays correct for any component you add to the catalogue.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useId } from "react";
import { springProfile } from "@/lib/springProfile";
import type { Kit, SpringComponent } from "@/data/types";

export function Wordmark({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span
      className={`select-none font-extrabold tracking-[-0.045em] lowercase ${
        tone === "light" ? "text-white" : "text-navy-900"
      } ${className}`}
    >
      meconet
    </span>
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

/** Deterministic jitter so the generated box renders identically on server and client. */
function seeded(seed: string) {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) value = (value * 31 + seed.charCodeAt(i)) % 2147483647;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483647;
    return value / 2147483647;
  };
}

export function KitBoxArt({ kit, className = "" }: { kit: Kit; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const random = seeded(kit.slug);
  const cols = Math.ceil(Math.sqrt(kit.compartments * 1.7));
  const rows = Math.ceil(kit.compartments / cols);

  const boxW = 300;
  const boxH = 190;
  const padding = 12;
  const cellW = (boxW - padding * 2) / cols;
  const cellH = (boxH - padding * 2) / rows;

  // Fill every cell in the tray, not just the advertised compartment count,
  // so the generated box never shows an empty corner.
  const cells = Array.from({ length: cols * rows }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = padding + col * cellW;
    const y = padding + row * cellH;
    const count = 2 + Math.floor(random() * 2);
    const squiggles = Array.from({ length: count }, (_, s) => {
      const cy = y + cellH * (0.32 + s * 0.26) + random() * 2;
      const cx = x + cellW * 0.16 + random() * cellW * 0.12;
      const len = cellW * (0.48 + random() * 0.2);
      const amp = cellH * 0.1;
      const waves = 5;
      const points: string[] = [];
      for (let i = 0; i <= waves * 8; i += 1) {
        const t = i / (waves * 8);
        points.push(`${i === 0 ? "M" : "L"} ${(cx + t * len).toFixed(1)} ${(cy + Math.sin(t * waves * Math.PI * 2) * amp).toFixed(1)}`);
      }
      return points.join(" ");
    });
    return { x, y, squiggles };
  });

  return (
    <svg viewBox={`0 0 ${boxW} ${boxH + 26}`} className={className} role="img" aria-label={`${kit.name} assortment box`}>
      <defs>
        <linearGradient id={`lid-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#dce8f4" stopOpacity="0.62" />
        </linearGradient>
        <linearGradient id={`tray-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f9fe" />
          <stop offset="100%" stopColor="#dfeaf6" />
        </linearGradient>
      </defs>

      {/* Open lid, hinged at the back */}
      <g transform="translate(14 0)">
        <rect x="0" y="0" width={boxW - 28} height="24" rx="4" fill={`url(#lid-${uid})`} stroke="#c3d6e8" strokeWidth="1.2" />
        <rect x="10" y="5" width="54" height="14" rx="2" fill="#ffffff" stroke="#cfdce9" strokeWidth="0.8" />
        <text x="14" y="15" fontSize="7" fontWeight="700" fill="#0b2e5e" fontFamily="inherit">
          meconet
        </text>
        <rect x="70" y="7" width="46" height="2" rx="1" fill="#b9cbdd" />
        <rect x="70" y="12" width="34" height="2" rx="1" fill="#c9d8e6" />
      </g>

      {/* Compartment tray */}
      <g transform="translate(0 26)">
        <rect x="0" y="0" width={boxW} height={boxH} rx="8" fill={`url(#tray-${uid})`} stroke="#bdd1e4" strokeWidth="1.4" />
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={padding + (i + 1) * cellW}
            y1={padding * 0.6}
            x2={padding + (i + 1) * cellW}
            y2={boxH - padding * 0.6}
            stroke="#c9dbea"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={padding * 0.6}
            y1={padding + (i + 1) * cellH}
            x2={boxW - padding * 0.6}
            y2={padding + (i + 1) * cellH}
            stroke="#c9dbea"
            strokeWidth="1"
          />
        ))}
        <g fill="none" stroke="#2f3f52" strokeWidth="1.5" strokeLinecap="round" opacity="0.78">
          {cells.map((cell, index) => (
            <g key={index}>
              {cell.squiggles.map((d, s) => (
                <path key={s} d={d} />
              ))}
            </g>
          ))}
        </g>
        <rect x="0" y="0" width={boxW} height={boxH} rx="8" fill="#ffffff" opacity="0.08" />
      </g>
    </svg>
  );
}
