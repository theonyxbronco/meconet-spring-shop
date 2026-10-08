"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KitBoxArt, KitShot } from "@/assets/brand";
import { variantName } from "@/data/kits";
import type { Kit, KitPhoto, KitTier } from "@/data/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomIcon } from "./icons";

type Slide = { key: string; label: string; photo?: KitPhoto };

/**
 * The kit as a product: its lid and its own photographs, as thumbnails that open
 * large.
 *
 * The springs used to follow here, one slide each, and sessions showed people
 * identifying their spring from those photographs instead of the 3D model below.
 * The springs now live only in the rail and `SpringStage`, so this stays about the
 * box.
 */
export function KitGallery({ kit, tier }: { kit: Kit; tier: KitTier }) {
  // A photograph of one build's contents is wrong for the other, so a shot that
  // names a tier only appears on that tier.
  const shots = (kit.galleryImages ?? []).filter((photo) => !photo.tier || photo.tier === tier);

  const slides: Slide[] = [
    { key: "box", label: `${variantName(kit, tier)} assortment box` },
    ...shots.map((photo) => ({ key: photo.src, label: photo.label, photo })),
  ];

  const [open, setOpen] = useState<number | null>(null);
  // Switching to the other tier can take away the shot that is open.
  const active = open === null ? null : slides[Math.min(open, slides.length - 1)];

  const step = (direction: -1 | 1) =>
    setOpen((current) => ((current ?? 0) + direction + slides.length) % slides.length);

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const render = (slide: Slide, className: string) =>
    slide.photo ? (
      <KitShot photo={slide.photo} className={className} />
    ) : (
      <KitBoxArt kit={kit} tier={tier} className={className} />
    );

  return (
    <>
      <ul className="flex gap-2.5">
        {slides.map((slide, index) => (
          <li key={slide.key}>
            <button
              onClick={() => setOpen(index)}
              aria-label={`Enlarge ${slide.label}`}
              title={slide.label}
              className="group relative flex h-[76px] w-[112px] items-center justify-center rounded-lg border border-line bg-gradient-to-b from-brand-50 to-brand-50/40 p-1.5 transition hover:border-brand-400"
            >
              {render(slide, "h-full w-full")}
              <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface/85 text-ink opacity-70 transition group-hover:opacity-100">
                <ZoomIcon width={13} height={13} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/75 p-8 backdrop-blur-sm"
            role="dialog"
            aria-label={active.label}
          >
            <button
              onClick={() => setOpen(null)}
              aria-label="Close enlarged image"
              className="absolute right-6 top-6 rounded-full bg-surface p-2.5 text-ink"
            >
              <CloseIcon width={20} height={20} />
            </button>
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-[1000px] rounded-2xl bg-surface p-10"
            >
              {render(active, "h-[60vh] w-full")}
              <p className="mt-4 text-center text-[14px] text-muted">{active.label}</p>

              {slides.length > 1 && (
                <>
                  <button
                    onClick={() => step(-1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-card transition hover:text-brand-600"
                  >
                    <ChevronLeftIcon width={19} height={19} />
                  </button>
                  <button
                    onClick={() => step(1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-card transition hover:text-brand-600"
                  >
                    <ChevronRightIcon width={19} height={19} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
