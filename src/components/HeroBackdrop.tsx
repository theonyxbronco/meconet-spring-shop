/**
 * The home page's backdrop: a drawing-office grid that clears away behind the
 * search, and a few springs drawn as line art with their dimension callouts — the
 * same language as the technical drawings on every spring's page.
 *
 * It is decoration only. Everything sits at low contrast and well clear of the
 * middle, so the search stays the one thing on the page asking to be read. Below
 * the widest layout the line art would crowd the heading, so it is left out there
 * and only the grid remains.
 */

/**
 * A coil seen from the side, as one continuous stroke: a helix projected flat,
 * leaning by `lean` so each turn reads as a loop rather than a wave.
 */
function coilPath(turns: number, pitch: number, radius: number, lean: number, start = 0) {
  const steps = Math.round(turns * 36);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const x = start + (pitch * t) / (Math.PI * 2) + lean * Math.sin(t);
    const y = radius * Math.cos(t);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join("L")}`;
}

const COMPRESSION = coilPath(9, 22, 30, 9);
const EXTENSION = coilPath(16, 9, 18, 7, 24);
const SMALL = coilPath(6, 16, 16, 6);

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-grid absolute inset-0" />

      <div className="absolute inset-0 hidden text-brand-500 xl:block">
        {/* Compression spring, upper left, with its free length dimensioned. */}
        <svg
          className="hero-float absolute -left-[1%] top-[7%] w-[230px] -rotate-[14deg]"
          viewBox="-20 -60 260 130"
          fill="none"
        >
          <path d={COMPRESSION} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" strokeLinecap="round" />
          <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1">
            <path d="M-9 44V58M207 44V58M-9 52H207" />
            <path d="M-9 52l6-3v6zM207 52l-6-3v6z" fill="currentColor" fillOpacity="0.35" />
          </g>
          <text x="99" y="66" textAnchor="middle" className="fill-brand-600/45 text-[11px] font-semibold">
            L0 = 40
          </text>
        </svg>

        {/* Extension spring, lower right, hooked at both ends, its diameter called out. */}
        <svg
          className="hero-float-slow absolute bottom-[3%] -right-[2%] w-[270px] rotate-[11deg]"
          viewBox="-10 -50 220 100"
          fill="none"
        >
          <g stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round">
            <path d={EXTENSION} />
            <circle cx="10" cy="18" r="14" />
            <circle cx="182" cy="18" r="14" />
          </g>
          <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1">
            <path d="M96 -18V-40M96 18V40" />
            <path d="M118 -30h34" />
          </g>
          <text x="156" y="-26" className="fill-brand-600/45 text-[11px] font-semibold">
            Ø8
          </text>
        </svg>

        {/* A small spring, lower left, to keep the two big ones from mirroring. */}
        <svg
          className="hero-float-slow absolute bottom-[8%] left-[5%] w-[130px] rotate-[24deg]"
          viewBox="-20 -30 140 60"
          fill="none"
        >
          <path d={SMALL} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {/* Upper right: a torsion spring, its legs drawn out at an angle. */}
        <svg
          className="hero-float absolute right-[4%] top-[6%] w-[150px] -rotate-[8deg]"
          viewBox="-60 -50 160 100"
          fill="none"
        >
          <g stroke="currentColor" strokeOpacity="0.24" strokeWidth="1.8" strokeLinecap="round">
            <path d={coilPath(4, 9, 16, 5)} />
            <path d="M0 16L-52 40M36 16L92 -36" />
          </g>
          <path d="M-30 -10A34 34 0 0 1 4 -40" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
          <text x="-44" y="-28" className="fill-brand-600/45 text-[11px] font-semibold">
            θ
          </text>
        </svg>
      </div>
    </div>
  );
}
