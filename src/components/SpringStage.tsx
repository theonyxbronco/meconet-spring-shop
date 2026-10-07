"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SpringPhoto } from "@/assets/brand";
import { TechnicalDrawing } from "./TechnicalDrawing";
import { ActualSizeOverlay } from "./ActualSizeOverlay";
import { SPRING_TYPE_LABEL, type SpringComponent } from "@/data/types";
import { CubeIcon, DrawingIcon, ImageIcon, RulerIcon } from "./icons";

const SpringViewer = dynamic(() => import("./SpringViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[14px] text-muted">Loading 3D view…</div>
  ),
});

type Mode = "3d" | "technical" | "photo";

/**
 * The selected spring, large: the 3D model first, then its technical drawing, then
 * its photograph.
 *
 * The 3D model leads because sessions showed participants identifying springs from
 * photographs, which hide the proportions they needed — a model they can turn over,
 * generated from the same numbers as the specification, does not. The photograph
 * is still a tab away for anyone who wants to see the real part.
 */
export function SpringStage({ spring }: { spring: SpringComponent }) {
  const [mode, setMode] = useState<Mode>("3d");
  const [actualSize, setActualSize] = useState(false);
  const [sheet, setSheet] = useState(0);

  const sheets = spring.drawings ?? [];

  // A different component may have fewer sheets than the one just shown.
  useEffect(() => setSheet(0), [spring.id]);

  return (
    <div>
      <div className="relative h-[440px] overflow-hidden rounded-xl border border-line bg-surface">
        {mode === "3d" ? (
          <SpringViewer spring={spring} />
        ) : mode === "photo" ? (
          <div className="flex h-full items-center justify-center p-10">
            <SpringPhoto spring={spring} className="h-full w-full" />
          </div>
        ) : (
          <DrawingPane spring={spring} sheets={sheets} sheet={sheet} onPickSheet={setSheet} />
        )}

        {/* Which spring this is, without looking away from it. */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-surface/92 px-3 py-2 shadow-card backdrop-blur">
          <p className="text-[15px] font-extrabold leading-tight tracking-tight text-ink">{spring.code}</p>
          <p className="text-[12.5px] text-ink-soft">
            {SPRING_TYPE_LABEL[spring.type]} · Ø{spring.outerDiameter} × {spring.freeLength} mm · wire{" "}
            {spring.wireDiameter}
          </p>
        </div>

        <div className="absolute right-4 top-4 flex gap-1.5 rounded-full border border-line bg-surface/92 p-1 shadow-card backdrop-blur">
          <ModeButton active={mode === "3d"} onClick={() => setMode("3d")} label="3D">
            <CubeIcon width={16} height={16} />
          </ModeButton>
          <ModeButton active={mode === "technical"} onClick={() => setMode("technical")} label="Technical">
            <DrawingIcon width={16} height={16} />
          </ModeButton>
          <ModeButton active={mode === "photo"} onClick={() => setMode("photo")} label="Photo">
            <ImageIcon width={16} height={16} />
          </ModeButton>
        </div>
      </div>

      <button
        onClick={() => setActualSize(true)}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-surface py-3 text-[15px] font-semibold text-ink transition hover:border-brand-500 hover:text-brand-600"
      >
        <RulerIcon width={19} height={19} />
        Compare at actual size
      </button>
      <p className="mt-2 text-center text-[13px] text-muted">
        Shows this spring 1:1 on screen so you can hold a real one against it.
      </p>

      <AnimatePresence>{actualSize && <ActualSizeOverlay spring={spring} onClose={() => setActualSize(false)} />}</AnimatePresence>
    </div>
  );
}

/**
 * The Technical view.
 *
 * A component with real drawing sheets shows those, with a thumbnail strip when
 * there is more than one — the sheets differ in which views they carry, not in
 * which spring they show. Everything else falls back to the drawing generated
 * from the component's own dimensions.
 */
function DrawingPane({
  spring,
  sheets,
  sheet,
  onPickSheet,
}: {
  spring: SpringComponent;
  sheets: string[];
  sheet: number;
  onPickSheet: (index: number) => void;
}) {
  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 pt-20">
        <TechnicalDrawing spring={spring} />
      </div>
    );
  }

  const current = sheets[Math.min(sheet, sheets.length - 1)];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex-1 p-5 pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-5 top-20"
          >
            <Image
              src={current}
              alt={`Dimensioned drawing of ${spring.name}, ${spring.code}`}
              fill
              sizes="(max-width: 1024px) 90vw, 760px"
              className="object-contain"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {sheets.length > 1 && (
        <div className="flex shrink-0 gap-2 border-t border-line bg-page px-4 py-3">
          {sheets.map((src, index) => (
            <button
              key={src}
              onClick={() => onPickSheet(index)}
              aria-label={`Show drawing sheet ${index + 1} of ${sheets.length}`}
              aria-current={index === sheet}
              className={`relative h-[46px] w-[66px] shrink-0 overflow-hidden rounded border-2 bg-white transition ${
                index === sheet ? "border-brand-500" : "border-line hover:border-brand-200"
              }`}
            >
              <Image src={src} alt="" fill sizes="66px" className="object-contain p-0.5" />
            </button>
          ))}
          <p className="ml-auto self-center text-[12px] text-muted">
            Sheet {Math.min(sheet, sheets.length - 1) + 1} of {sheets.length}
          </p>
        </div>
      )}
    </div>
  );
}

function ModeButton({
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
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
        active ? "bg-brand-500 text-white" : "text-ink hover:bg-brand-50"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
