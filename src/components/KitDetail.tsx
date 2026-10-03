"use client";

import Link from "next/link";
import { useState } from "react";
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
