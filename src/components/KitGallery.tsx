"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KitBoxArt, SpringPhoto } from "@/assets/brand";
import type { Kit, SpringComponent } from "@/data/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomIcon } from "./icons";

type Slide = { key: string; label: string; spring?: SpringComponent };

/**
 * One spring per type, so the strip advertises the spread of the kit rather than
 * three near-identical compression springs off the top of the list.
 */
function featured(kit: Kit): SpringComponent[] {
  const seen = new Set<SpringComponent["type"]>();
  const pick = kit.components.filter((spring) => {
    if (seen.has(spring.type)) return false;
    seen.add(spring.type);
    return true;
  });
  return pick.slice(0, 3);
}

export function KitGallery({ kit }: { kit: Kit }) {
  const slides: Slide[] = [
    { key: "box", label: `${kit.name} assortment box` },
    ...featured(kit).map((spring) => ({
      key: spring.id,
      label: `${spring.name}, ${spring.code}`,
      spring,
    })),
  ];

  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const active = slides[index];

  const step = (direction: -1 | 1) =>
    setIndex((current) => (current + direction + slides.length) % slides.length);

  const render = (slide: Slide, className: string) =>
    slide.spring ? (
      <SpringPhoto spring={slide.spring} className={className} />
    ) : (
      <KitBoxArt kit={kit} className={className} />
    );

  return (
    <div className="flex gap-4">
      <div className="flex w-[74px] shrink-0 flex-col gap-3">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.key}
            onClick={() => setIndex(slideIndex)}
            aria-label={`Show ${slide.label}`}
            aria-current={slideIndex === index}
            className={`flex h-[62px] items-center justify-center rounded-lg border-2 bg-surface p-1.5 transition ${
              slideIndex === index ? "border-brand-500" : "border-line hover:border-brand-100"
            }`}
          >
            {render(slide, "h-full w-full")}
          </button>
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-brand-50 to-brand-50/40 p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex h-[300px] items-center justify-center"
          >
            {render(active, "h-full w-full")}
          </motion.div>
        </AnimatePresence>

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

        <button
          onClick={() => setZoomed(true)}
          aria-label="Enlarge image"
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-ink transition hover:text-brand-600"
        >
          <ZoomIcon width={19} height={19} />
        </button>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.key}
              onClick={() => setIndex(slideIndex)}
              aria-label={`Go to image ${slideIndex + 1}`}
              className={`h-2 w-2 rounded-full transition ${
                slideIndex === index ? "bg-brand-500" : "bg-brand-500/30"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/75 p-8 backdrop-blur-sm"
            role="dialog"
            aria-label={active.label}
          >
            <button
              onClick={() => setZoomed(false)}
              aria-label="Close enlarged image"
              className="absolute right-6 top-6 rounded-full bg-surface p-2.5 text-ink"
            >
              <CloseIcon width={20} height={20} />
            </button>
            <div className="w-full max-w-[1000px] rounded-2xl bg-surface p-10">
              {render(active, "h-[60vh] w-full")}
              <p className="mt-4 text-center text-[14px] text-muted">{active.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
