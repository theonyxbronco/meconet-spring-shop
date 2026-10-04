"use client";

import Link from "next/link";
import { useState } from "react";
import { KitBoxArt } from "@/assets/brand";
import type { Kit, SpringComponent } from "@/data/types";
import { ArrowRightIcon, HeartIcon } from "./icons";

export function KitCard({
  kit,
  reasons,
  highlight,
}: {
  kit: Kit;
  reasons?: string[];
  highlight?: SpringComponent;
}) {
  const [saved, setSaved] = useState(false);
  const pieces = kit.components.reduce((total, component) => total + component.quantity, 0);
  // The chip above already names the matching spring; don't say it twice.
  const visibleReasons = (reasons ?? []).filter(
    (reason) => !highlight || !reason.includes(highlight.code),
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
      <div className="relative m-3 mb-0 overflow-hidden rounded-xl bg-brand-50/70 p-5">
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-stock-bg px-2.5 py-1 text-[12px] font-semibold text-stock">
          <span className="h-1.5 w-1.5 rounded-full bg-stock" />
          In stock
        </span>
        <button
          onClick={() => setSaved((value) => !value)}
          aria-label={saved ? `Remove ${kit.name} from favourites` : `Save ${kit.name} to favourites`}
          aria-pressed={saved}
          className={`absolute right-3 top-3 z-10 transition ${saved ? "text-brand-500" : "text-ink/45 hover:text-brand-500"}`}
        >
          <HeartIcon width={22} height={22} fill={saved ? "currentColor" : "none"} />
        </button>
        <KitBoxArt kit={kit} className="mx-auto h-[170px] w-full transition duration-500 group-hover:scale-[1.03]" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[19px] font-bold leading-snug text-ink">{kit.name}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{kit.shortText}</p>

        {highlight && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-[13px] text-ink">
            <span className="font-semibold">Includes {highlight.code}</span>
            <span className="text-ink-soft">
              {" "}
              · Ø{highlight.outerDiameter} × {highlight.freeLength} mm
            </span>
          </p>
        )}

        {visibleReasons.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink-soft">
            {visibleReasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span className="first-letter:uppercase">{reason}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[13px] text-muted">
          {kit.components.length} spring types · {pieces} pieces
        </p>

        <Link
          href={highlight ? `/assortments/${kit.slug}?spring=${highlight.id}` : `/assortments/${kit.slug}`}
          className="mt-5 flex items-center gap-2.5 text-[15px] font-semibold text-brand-600 transition group-hover:gap-3.5"
        >
          <ArrowRightIcon width={19} height={19} />
          View details
        </Link>
      </div>
    </article>
  );
}
