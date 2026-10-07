"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { KitGallery } from "./KitGallery";
import { PurchasePanel } from "./PurchasePanel";
import { IncludedSprings } from "./IncludedSprings";
import { ComponentDetail } from "./ComponentDetail";
import { SpringStage } from "./SpringStage";
import { kitVariant } from "@/data/kits";
import type { Kit, KitTier } from "@/data/types";

export function KitDetail({ kit }: { kit: Kit }) {
  const [tier, setTier] = useState<KitTier>("basic");
  const variant = kitVariant(kit, tier);

  const [selectedId, setSelectedId] = useState(kit.components[0].id);
  // Pro contains everything Basic does, so only the way back can strand a selection
  // on a spring the box no longer holds.
  const selected =
    variant.components.find((component) => component.id === selectedId) ?? variant.components[0];

  return (
    <>
      {/* Arriving from the spring finder opens the kit at the spring it pointed to;
          arriving from the cart opens it on the build that is in the cart. */}
      <Suspense fallback={null}>
        <StateFromQuery kit={kit} onSpring={setSelectedId} onTier={setTier} />
      </Suspense>

      <nav aria-label="Breadcrumb" className="border-b border-line bg-brand-50/50">
        <ol className="mx-auto flex max-w-[1320px] gap-2 px-5 py-3 text-[13.5px] text-muted">
          <li>
            <Link href="/" className="hover:text-brand-600">
              Frontpage
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/" className="hover:text-brand-600">
              Spring Assortments
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-brand-600" aria-current="page">
            {variant.name}
          </li>
        </ol>
      </nav>

      {/* The title sits inside the left column rather than above both, so the panel on
          the right starts level with it instead of below the whole introduction.

          The springs lead: the rail and the 3D model of the one picked from it are the
          first thing under the title, because sessions showed people identifying their
          spring from photographs when the model was further down. The kit's own
          photographs stay, as thumbnails beside the introduction. */}
      <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-9">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:col-start-1">
            <div className="min-w-0 max-w-[480px]">
              <h1 className="text-[clamp(2.2rem,4.4vw,3.1rem)] font-extrabold leading-tight tracking-tight text-ink">
                {variant.name}
              </h1>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{variant.description}</p>
            </div>
            <KitGallery kit={kit} tier={tier} />
          </div>

          {/* Second in the markup so that on a phone, where everything is one column,
              the price and the button come before the long run of spring details
              rather than after it. On a wide screen it spans both rows on the right. */}
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <PurchasePanel kit={kit} variant={variant} tier={tier} onTier={setTier} />
          </div>

          <div className="min-w-0 rounded-2xl border border-line bg-brand-50 p-5 lg:col-start-1">
            <IncludedSprings
              title={`What's included in the ${variant.name}?`}
              components={variant.components}
              selectedId={selected.id}
              onSelect={(component) => setSelectedId(component.id)}
            />
            <div className="mt-1">
              <SpringStage spring={selected} />
            </div>
            <div className="mt-5">
              <ComponentDetail spring={selected} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Reads `?spring=<id>` and selects that spring, then brings its detail into view —
 * so "open the kit at this spring" from the finder lands the participant on the part
 * they are meant to compare, not on whichever spring happens to be first in the box.
 * `?tier=pro` opens the Pro build, which is how a cart line gets back to itself.
 */
function StateFromQuery({
  kit,
  onSpring,
  onTier,
}: {
  kit: Kit;
  onSpring: (id: string) => void;
  onTier: (tier: KitTier) => void;
}) {
  const params = useSearchParams();
  const requested = params.get("spring");
  const requestedTier = params.get("tier");
  const handled = useRef<string | null>(null);
  const handledTier = useRef<string | null>(null);

  useEffect(() => {
    if (!requestedTier || handledTier.current === requestedTier) return;
    handledTier.current = requestedTier;
    if (requestedTier === "pro" || requestedTier === "basic") onTier(requestedTier);
  }, [requestedTier, onTier]);

  useEffect(() => {
    if (!requested || handled.current === requested) return;
    // Pro-only springs are reachable too, so the whole Pro contents is the haystack —
    // and landing on one has to bring the Pro build with it, or the page shows a
    // spring the box on screen does not contain.
    if (!kitVariant(kit, "pro").components.some((component) => component.id === requested)) return;
    if (!kit.components.some((component) => component.id === requested)) onTier("pro");
    // The spring is selected, but the page is left at the top: arriving from the
    // conversation should open the kit, not throw the reader part-way down it.
    onSpring(requested);
    handled.current = requested;
  }, [requested, kit, onSpring, onTier]);

  return null;
}
