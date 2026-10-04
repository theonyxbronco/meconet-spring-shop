"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { KitGallery } from "./KitGallery";
import { PurchasePanel } from "./PurchasePanel";
import { ComponentCarousel } from "./ComponentCarousel";
import { ComponentDetail } from "./ComponentDetail";
import type { Kit } from "@/data/types";

export function KitDetail({ kit }: { kit: Kit }) {
  const [selectedId, setSelectedId] = useState(kit.components[0].id);
  const selected = kit.components.find((component) => component.id === selectedId) ?? kit.components[0];

  return (
    <>
      {/* Arriving from the spring finder opens the kit at the spring it pointed to. */}
      <Suspense fallback={null}>
        <SpringFromQuery kit={kit} onSpring={setSelectedId} />
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
            {kit.name}
          </li>
        </ol>
      </nav>

      <section className="mx-auto max-w-[1320px] px-5 pb-12 pt-9">
        <h1 className="text-[clamp(2.2rem,4.4vw,3.1rem)] font-extrabold leading-tight tracking-tight text-ink">
          {kit.name}
        </h1>
        <p className="mt-3 max-w-[620px] text-[15.5px] leading-relaxed text-ink-soft">{kit.description}</p>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
          <KitGallery kit={kit} />
          <PurchasePanel kit={kit} />
        </div>
      </section>

      <ComponentCarousel
        title={`What's included in the ${kit.name}?`}
        components={kit.components}
        selectedId={selectedId}
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
 */
function SpringFromQuery({ kit, onSpring }: { kit: Kit; onSpring: (id: string) => void }) {
  const requested = useSearchParams().get("spring");
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!requested || handled.current === requested) return;
    if (!kit.components.some((component) => component.id === requested)) return;
    onSpring(requested);
    const timer = setTimeout(() => {
      // Marked as handled only once the scroll has actually run. Claiming it up front
      // loses the scroll under a Strict Mode double mount: the cleanup cancels the
      // timer and the second pass then sees the request as already dealt with.
      handled.current = requested;
      document.getElementById("included-springs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(timer);
  }, [requested, kit, onSpring]);

  return null;
}
