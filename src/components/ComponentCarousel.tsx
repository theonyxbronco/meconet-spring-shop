"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SpringPhoto } from "@/assets/brand";
import { LENGTH_LABEL } from "@/lib/springMetrics";
import { SPRING_TYPE_LABEL, type SpringComponent } from "@/data/types";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const POPOVER_WIDTH = 318;

export function ComponentCarousel({
  title,
  components,
  selectedId,
  onSelect,
}: {
  title: string;
  components: SpringComponent[];
  selectedId: string;
  onSelect: (component: SpringComponent) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const [popoverLeft, setPopoverLeft] = useState<number | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const selected = components.find((component) => component.id === selectedId);

  // The spec popover hangs below the selected card, so it has to track horizontal scroll.
  const reposition = useCallback(() => {
    const container = scroller.current;
    const card = cards.current.get(selectedId);
    if (!container || !card) return setPopoverLeft(null);
    const raw = card.offsetLeft - container.scrollLeft;
    const max = container.clientWidth - POPOVER_WIDTH;
    setPopoverLeft(Math.max(0, Math.min(raw, Math.max(max, 0))));
    setAtStart(container.scrollLeft <= 2);
    setAtEnd(container.scrollLeft + container.clientWidth >= container.scrollWidth - 2);
  }, [selectedId]);

  useLayoutEffect(reposition, [reposition, components]);

  useEffect(() => {
    const container = scroller.current;
    if (!container) return;
    container.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      container.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition]);

  // Keep the chosen card in view when selection changes from elsewhere on the page.
  useEffect(() => {
    cards.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedId]);

  const nudge = (direction: -1 | 1) => {
    scroller.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  };

  return (
    <section className="bg-brand-50/60 py-14">
      <div className="mx-auto max-w-[1320px] px-5">
        <h2 className="text-[30px] font-extrabold tracking-tight text-ink">{title}</h2>

        <div className="relative mt-7">
          <ArrowButton side="left" disabled={atStart} onClick={() => nudge(-1)} />
          <ArrowButton side="right" disabled={atEnd} onClick={() => nudge(1)} />

          <div
            ref={scroller}
            className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
            role="listbox"
            aria-label="Springs included in this assortment"
          >
            {components.map((component) => {
              const active = component.id === selectedId;
              return (
                <button
                  key={component.id}
                  ref={(node) => {
                    if (node) cards.current.set(component.id, node);
                    else cards.current.delete(component.id);
                  }}
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(component)}
                  className={`relative flex w-[188px] shrink-0 flex-col rounded-xl border-2 bg-surface p-4 text-left transition ${
                    active
                      ? "border-brand-500 shadow-card"
                      : "border-transparent shadow-card hover:border-brand-100"
                  }`}
                >
                  {component.isTestTarget && <span className="sr-only">Reference component</span>}
                  <div className="flex h-[104px] items-center justify-center">
                    <SpringPhoto spring={component} className="h-full w-full" sizes="188px" />
                  </div>
                  <p className="mt-3 text-[12px] text-muted">Product code:</p>
                  <p className="text-[13.5px] font-bold leading-snug text-ink">{component.code}</p>
                  <p className="mt-1 text-[12px] text-muted">{component.quantity} pcs</p>
                </button>
              );
            })}
          </div>

          <div className="relative h-[182px]">
            <AnimatePresence mode="wait">
              {selected && popoverLeft !== null && (
                <motion.dl
                  key={selected.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  style={{ left: popoverLeft, width: POPOVER_WIDTH }}
                  className="absolute top-2 space-y-1.5 rounded-xl border border-line bg-surface/95 p-4 text-[13px] shadow-card backdrop-blur"
                >
                  <Row label="Product code" value={selected.code} strong />
                  <Row label="Spring type" value={SPRING_TYPE_LABEL[selected.type]} />
                  <Row
                    label="Dimensions"
                    value={`Ø${selected.outerDiameter} × ${selected.freeLength} mm`}
                  />
                  <Row label={LENGTH_LABEL[selected.type]} value={`${selected.freeLength} mm`} />
                  <Row
                    label="Load range"
                    value={`${selected.loadRange[0]} – ${selected.loadRange[1]} ${selected.loadUnit}`}
                  />
                  <Row label="Material" value={selected.material} />
                </motion.dl>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[108px] shrink-0 text-muted">{label}:</dt>
      <dd className={strong ? "font-bold text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}

function ArrowButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      className={`absolute top-[70px] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition ${
        side === "left" ? "-left-5" : "-right-5"
      } ${disabled ? "cursor-default opacity-35" : "hover:border-brand-400 hover:text-brand-600"}`}
    >
      {side === "left" ? <ChevronLeftIcon width={19} height={19} /> : <ChevronRightIcon width={19} height={19} />}
    </button>
  );
}
