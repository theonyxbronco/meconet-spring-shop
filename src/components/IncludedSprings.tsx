"use client";

import { useState } from "react";
import { SpringPhoto } from "@/assets/brand";
import { SPRING_TYPE_LABEL, type SpringComponent, type SpringType } from "@/data/types";
import { SpringRail } from "./SpringRail";
import { CarouselIcon, GridIcon } from "./icons";

type View = "rail" | "grid";

/** The order the types are laid out in, so the grid reads the same for every kit. */
const TYPE_ORDER: SpringType[] = ["compression", "extension", "torsion", "die", "disc"];

/**
 * Everything in the box.
 *
 * The rail is the quick way past: one row, scrolled through while the detail below
 * keeps up. The grid is for the opposite job — seeing the whole assortment laid out
 * at once, sorted into its spring types, the way the compartments in the real box
 * are. Picking a spring in either one opens it in the detail below.
 */
export function IncludedSprings({
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
  const [view, setView] = useState<View>("rail");

  const groups = TYPE_ORDER.map((type) => ({
    type,
    springs: components.filter((component) => component.type === type),
  })).filter((group) => group.springs.length > 0);

  const pieces = components.reduce((total, component) => total + component.quantity, 0);

  return (
    <section id="included-springs" className="border-y border-line bg-brand-50/60 py-6">
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink">{title}</h2>
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-muted">
              {components.length} spring types · {pieces} pieces · pick one to see it below
            </p>
            <div
              role="group"
              aria-label="How to show the springs"
              className="flex gap-1 rounded-full border border-line bg-surface p-1"
            >
              <ViewButton active={view === "rail"} onClick={() => setView("rail")} label="Rail">
                <CarouselIcon width={15} height={15} />
              </ViewButton>
              <ViewButton active={view === "grid"} onClick={() => setView("grid")} label="Grid">
                <GridIcon width={15} height={15} />
              </ViewButton>
            </div>
          </div>
        </div>

        {view === "rail" ? (
          <SpringRail components={components} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <div className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group.type}>
                <h3 className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink-soft/80">
                  {SPRING_TYPE_LABEL[group.type]}s
                  <span className="ml-2 font-medium normal-case tracking-normal text-muted">
                    {group.springs.length}{" "}
                    {group.springs.length === 1 ? "size" : "sizes"}
                  </span>
                </h3>
                <ul className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.springs.map((spring) => (
                    <li key={spring.id}>
                      <GridCard
                        spring={spring}
                        active={spring.id === selectedId}
                        onSelect={() => onSelect(spring)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** One spring in the grid: the photo big enough to tell it apart, with its numbers. */
function GridCard({
  spring,
  active,
  onSelect,
}: {
  spring: SpringComponent;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border-2 bg-surface p-3 text-left transition ${
        active ? "border-brand-500 shadow-card" : "border-transparent shadow-card hover:border-brand-200"
      }`}
    >
      <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-lg bg-brand-50/70 p-1.5">
        <SpringPhoto spring={spring} className="h-full w-full" sizes="64px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13.5px] font-bold ${active ? "text-brand-600" : "text-ink"}`}>
          {spring.code}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          Ø{spring.outerDiameter} × {spring.freeLength} mm · wire {spring.wireDiameter}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted">
          {spring.quantity} pcs · {spring.endType}
        </p>
      </div>
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${
        active ? "bg-brand-500 text-white" : "text-ink hover:bg-brand-50"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
