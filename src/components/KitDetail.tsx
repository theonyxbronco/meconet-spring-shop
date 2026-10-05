"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { KitGallery } from "./KitGallery";
import { PurchasePanel } from "./PurchasePanel";
import { IncludedSprings } from "./IncludedSprings";
import { ComponentDetail } from "./ComponentDetail";
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
          the right starts level with it instead of below the whole introduction. */}
      <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-9">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
          <div className="min-w-0">
            <h1 className="text-[clamp(2.2rem,4.4vw,3.1rem)] font-extrabold leading-tight tracking-tight text-ink">
              {variant.name}
            </h1>
            <p className="mt-3 max-w-[620px] text-[15.5px] leading-relaxed text-ink-soft">
              {variant.description}
            </p>
            <div className="mt-7">
              <KitGallery kit={kit} components={variant.components} />
            </div>
          </div>

          <PurchasePanel kit={kit} variant={variant} tier={tier} onTier={setTier} />
        </div>
      </section>

      <IncludedSprings
        title={`What's included in the ${variant.name}?`}
        components={variant.components}
        selectedId={selected.id}
        onSelect={(component) => setSelectedId(component.id)}
      />

      <ComponentDetail spring={selected} />
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
    onSpring(requested);
    const timer = setTimeout(() => {
      // Marked as handled only once the scroll has actually run. Claiming it up front
      // loses the scroll under a Strict Mode double mount: the cleanup cancels the
      // timer and the second pass then sees the request as already dealt with.
      handled.current = requested;
      document.getElementById("included-springs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(timer);
  }, [requested, kit, onSpring, onTier]);

  return null;
}
