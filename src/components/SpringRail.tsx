"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SpringPhoto } from "@/assets/brand";
import { SPRING_TYPE_LABEL, type SpringComponent } from "@/data/types";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * The springs in a kit as one scrolling row. The section around it — heading, counts
 * and the switch to the grid — belongs to `IncludedSprings`, which owns both views.
 */
export function SpringRail({
  components,
  selectedId,
  onSelect,
}: {
  components: SpringComponent[];
  selectedId: string;
  onSelect: (component: SpringComponent) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // The arrows are only meaningful while there is somewhere left to scroll.
  const readEdges = useCallback(() => {
    const container = scroller.current;
    if (!container) return;
    setAtStart(container.scrollLeft <= 2);
    setAtEnd(container.scrollLeft + container.clientWidth >= container.scrollWidth - 2);
  }, []);

  useLayoutEffect(readEdges, [readEdges, components]);

  useEffect(() => {
    const container = scroller.current;
    if (!container) return;
    container.addEventListener("scroll", readEdges, { passive: true });
    window.addEventListener("resize", readEdges);
    return () => {
      container.removeEventListener("scroll", readEdges);
      window.removeEventListener("resize", readEdges);
    };
  }, [readEdges]);

  // Keep the chosen card in view when the selection changes from elsewhere on the page.
  // Only on a real change: arriving on the page is not a selection, and scrolling the
  // carousel into view then drags the whole page down past the gallery. Comparing the id
  // rather than tracking "have I mounted" also survives a Strict Mode double mount.
  const shown = useRef(selectedId);
  useEffect(() => {
    if (shown.current === selectedId) return;
    shown.current = selectedId;
    cards.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedId]);

  const nudge = (direction: -1 | 1) => {
    scroller.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  };

  return (
    <div className="relative mt-4">
      <ArrowButton side="left" disabled={atStart} onClick={() => nudge(-1)} />
      <ArrowButton side="right" disabled={atEnd} onClick={() => nudge(1)} />

      <div
        ref={scroller}
        className="no-scrollbar flex gap-2.5 overflow-x-auto scroll-smooth px-1 py-1"
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
              title={`${component.code} — ${SPRING_TYPE_LABEL[component.type]}, Ø${component.outerDiameter} × ${component.freeLength} mm`}
              onClick={() => onSelect(component)}
              className={`flex w-[124px] shrink-0 flex-col items-center rounded-lg border-2 bg-surface px-2 py-2 text-center transition ${
                active
                  ? "border-brand-500 shadow-card"
                  : "border-transparent shadow-card hover:border-brand-200"
              }`}
            >
              {component.isTestTarget && <span className="sr-only">Reference component</span>}
              <div className="flex h-[52px] w-full items-center justify-center">
                <SpringPhoto spring={component} className="h-full w-full" sizes="124px" />
              </div>
              <p
                className={`mt-1.5 w-full truncate text-[11.5px] font-bold leading-tight ${
                  active ? "text-brand-600" : "text-ink"
                }`}
              >
                {component.code}
              </p>
              <p className="text-[11px] text-muted">{component.quantity} pcs</p>
            </button>
          );
        })}
      </div>
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
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition ${
        side === "left" ? "-left-4" : "-right-4"
      } ${disabled ? "cursor-default opacity-35" : "hover:border-brand-400 hover:text-brand-600"}`}
    >
      {side === "left" ? <ChevronLeftIcon width={17} height={17} /> : <ChevronRightIcon width={17} height={17} />}
    </button>
  );
}
