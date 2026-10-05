"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KitBoxArt, SpringPhoto } from "@/assets/brand";
import type { Kit, SpringComponent } from "@/data/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomIcon } from "./icons";

type Slide = { key: string; label: string; spring?: SpringComponent };

export function KitGallery({ kit, components }: { kit: Kit; components: SpringComponent[] }) {
  const slides: Slide[] = [
    { key: "box", label: `${kit.name} assortment box` },
    ...components.map((spring) => ({
      key: spring.id,
      label: `${spring.name}, ${spring.code}`,
      spring,
    })),
  ];

  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  // Switching to the shorter Basic list can leave the index past the end of it.
  const active = slides[Math.min(index, slides.length - 1)];
  const rail = useRef<HTMLDivElement>(null);

  // The rail holds every spring in the kit, so it scrolls — stepping through with the
  // arrows has to bring the matching thumbnail back into view. It nudges the rail's own
  // scrollTop rather than calling scrollIntoView, which would drag the whole page along
  // with it, and it sits out the first render so that merely opening the page is still.
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    const strip = rail.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const above = thumb.offsetTop - strip.scrollTop;
    const below = thumb.offsetTop + thumb.offsetHeight - (strip.scrollTop + strip.clientHeight);
    if (above < 0) strip.scrollTo({ top: thumb.offsetTop, behavior: "smooth" });
    else if (below > 0) strip.scrollTo({ top: strip.scrollTop + below, behavior: "smooth" });
  }, [index]);

  const step = (direction: -1 | 1) =>
    setIndex((current) => (current + direction + slides.length) % slides.length);

  const render = (slide: Slide, className: string) =>
    slide.spring ? (
      <SpringPhoto spring={slide.spring} className={className} />
    ) : (
      <KitBoxArt kit={kit} className={className} />
    );

  /*
   * Every lid and every studio photograph is 3:2, so the stage is cut to 3:2 as well
   * and the artwork reaches all four edges. The stage fills the column, which means
   * its width sets its height — so the rail beside it is taken out of flow and
   * stretched to whatever the stage works out to be, rather than being told a height
   * of its own that would only match at one window size.
   */
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-5">
      <div className="relative">
        <div
          ref={rail}
          className="no-scrollbar absolute inset-0 flex flex-col gap-2.5 overflow-y-auto"
        >
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.key}
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show ${slide.label}`}
              aria-current={slides[slideIndex].key === active.key}
              className={`flex h-[60px] shrink-0 items-center justify-center rounded-lg border-2 bg-surface p-1.5 transition ${
                slides[slideIndex].key === active.key ? "border-brand-500" : "border-line hover:border-brand-100"
              }`}
            >
              {render(slide, "h-full w-full")}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-[3/2] min-w-0 overflow-hidden rounded-xl bg-gradient-to-b from-brand-50 to-brand-50/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
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
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-ink transition hover:text-brand-600"
        >
          <ZoomIcon width={19} height={19} />
        </button>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.key}
              onClick={() => setIndex(slideIndex)}
              aria-label={`Go to image ${slideIndex + 1}`}
              className={`h-2 w-2 rounded-full transition ${
                slides[slideIndex].key === active.key ? "bg-brand-500" : "bg-brand-500/30"
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
