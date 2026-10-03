"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SpringPhoto } from "@/assets/brand";
import { TechnicalDrawing } from "./TechnicalDrawing";
import { ActualSizeOverlay } from "./ActualSizeOverlay";
import { identificationSteps, specAttributes, springNotes } from "@/lib/springSpecs";
import { SPRING_TYPE_LABEL, type SpringComponent } from "@/data/types";
import {
  ChevronDownIcon,
  CubeIcon,
  DownloadIcon,
  DrawingIcon,
  ImageIcon,
  RulerIcon,
} from "./icons";

const SpringViewer = dynamic(() => import("./SpringViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[14px] text-muted">Loading 3D view…</div>
  ),
});

type Panel = "specifications" | "drawing" | "notes" | "identify" | "files";
type Mode = "3d" | "image" | "drawing";

export function ComponentDetail({ spring }: { spring: SpringComponent }) {
  // The 3D model is the view the shop leads with: it is the only one a customer can
  // turn over, and it is generated from the same numbers as the table beside it.
  const [mode, setMode] = useState<Mode>("3d");
  const [actualSize, setActualSize] = useState(false);
  const [open, setOpen] = useState<Panel | null>("specifications");
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState(0);

  const sheets = spring.drawings ?? [];

  // A different component may have fewer sheets than the one just shown.
  useEffect(() => setSheet(0), [spring.id]);

  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));

  const flash = (message: string) => {
    setNote(message);
    setTimeout(() => setNote(null), 2600);
  };

  const attributes = specAttributes(spring);

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative h-[420px] overflow-hidden rounded-xl border border-line bg-surface">
            {mode === "3d" ? (
              <SpringViewer spring={spring} />
            ) : mode === "image" ? (
              <div className="flex h-full items-center justify-center p-10">
                <SpringPhoto spring={spring} className="h-full w-full" />
              </div>
            ) : (
              <DrawingPane spring={spring} sheets={sheets} sheet={sheet} onPickSheet={setSheet} />
            )}

            <div className="absolute right-4 top-4 flex gap-1.5 rounded-full border border-line bg-surface/92 p-1 shadow-card backdrop-blur">
              <ModeButton active={mode === "3d"} onClick={() => setMode("3d")} label="3D">
                <CubeIcon width={16} height={16} />
              </ModeButton>
              <ModeButton active={mode === "image"} onClick={() => setMode("image")} label="Photo">
                <ImageIcon width={16} height={16} />
              </ModeButton>
              <ModeButton active={mode === "drawing"} onClick={() => setMode("drawing")} label="Drawing">
                <DrawingIcon width={16} height={16} />
              </ModeButton>
            </div>
          </div>

          <button
            onClick={() => setActualSize(true)}
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-surface py-3.5 text-[15px] font-semibold text-ink transition hover:border-brand-500 hover:text-brand-600"
          >
            <RulerIcon width={19} height={19} />
            Compare at actual size
          </button>
          <p className="mt-2 text-center text-[13px] text-muted">
            Shows this spring 1:1 on screen so you can hold a real one against it.
          </p>
        </div>

        <div>
          <p className="text-[14px] text-muted">Product code:</p>
          <h2 className="text-[34px] font-extrabold tracking-tight text-ink">{spring.code}</h2>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            {SPRING_TYPE_LABEL[spring.type]} · {spring.quantity} pieces in this assortment
          </p>

          <div className="mt-7 space-y-3">
            <Accordion
              title="Technical specifications"
              open={open === "specifications"}
              onToggle={() => toggle("specifications")}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="bg-brand-50 text-left text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft">
                      <th className="border-b border-line px-3 py-2.5">Product attribute</th>
                      <th className="border-b border-line px-3 py-2.5">Ref.</th>
                      <th className="border-b border-line px-3 py-2.5 text-right">Value</th>
                      <th className="border-b border-line px-3 py-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributes.map((attribute) => (
                      <tr key={attribute.label} className="align-top">
                        <td className="border-b border-line px-3 py-2 text-muted">{attribute.label}</td>
                        <td className="border-b border-line px-3 py-2 font-medium italic text-ink-soft">
                          {attribute.ref ?? ""}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right font-semibold text-ink">
                          {attribute.value}
                        </td>
                        <td className="border-b border-line px-3 py-2 whitespace-nowrap text-muted">
                          {attribute.unit ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] text-muted">
                Derived from the catalogue geometry. Tolerances to EN 15800 unless otherwise agreed.
              </p>
            </Accordion>

            <Accordion
              title="Technical drawing"
              open={open === "drawing"}
              onToggle={() => toggle("drawing")}
            >
              <div className="rounded-lg border border-line bg-white p-3">
                {sheets.length > 0 ? (
                  <SheetImage spring={spring} src={sheets[0]} className="h-[230px]" sizes="620px" />
                ) : (
                  <TechnicalDrawing spring={spring} />
                )}
              </div>
              <p className="mt-3 text-[13px] text-muted">
                The symbols on the sheet — <SheetSymbols spring={spring} /> — are the same ones
                in the Ref. column of the specification table above, so a dimension you read off
                the drawing can be looked up directly.
              </p>
              <button
                onClick={() => setMode("drawing")}
                className="mt-3 text-[14px] font-semibold text-brand-600 underline decoration-brand-100 decoration-2 underline-offset-4 hover:decoration-brand-400"
              >
                Open it larger in the Drawing view →
              </button>
            </Accordion>

            <Accordion
              title="Notes on using this spring"
              open={open === "notes"}
              onToggle={() => toggle("notes")}
            >
              <ul className="space-y-2.5">
                {springNotes(spring).map((text) => (
                  <li key={text} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </Accordion>

            <Accordion
              title="How to identify this spring"
              open={open === "identify"}
              onToggle={() => toggle("identify")}
            >
              <ol className="space-y-3">
                {identificationSteps(spring).map((text, index) => (
                  <li key={text} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-soft">
                    <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12.5px] font-bold text-brand-600">
                      {index + 1}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => setActualSize(true)}
                className="mt-4 text-[14px] font-semibold text-brand-600 underline decoration-brand-100 decoration-2 underline-offset-4 hover:decoration-brand-400"
              >
                Still unsure? Compare it at actual size →
              </button>
            </Accordion>

            <Accordion title="CAD/PDF files" open={open === "files"} onToggle={() => toggle("files")}>
              <ul className="space-y-2.5">
                {[
                  { name: `${spring.code}.step`, size: "412 KB" },
                  { name: `${spring.code}.dxf`, size: "88 KB" },
                  { name: `${spring.code}-datasheet.pdf`, size: "164 KB" },
                ].map((file) => (
                  <li key={file.name}>
                    <button
                      onClick={() => flash("Downloads are not enabled in this prototype")}
                      className="flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left transition hover:border-brand-400"
                    >
                      <DownloadIcon width={18} height={18} className="text-brand-600" />
                      <span className="flex-1 text-[14px] font-medium text-ink">{file.name}</span>
                      <span className="text-[13px] text-muted">{file.size}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Accordion>
          </div>
        </div>
      </div>

      <AnimatePresence>{actualSize && <ActualSizeOverlay spring={spring} onClose={() => setActualSize(false)} />}</AnimatePresence>

      <AnimatePresence>
        {note && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-navy-900 px-5 py-2.5 text-[13.5px] text-white shadow-pop"
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

/** One drawing sheet, letterboxed on white the way a PDF sheet would be. */
function SheetImage({
  spring,
  src,
  className = "",
  sizes,
}: {
  spring: SpringComponent;
  src: string;
  className?: string;
  sizes: string;
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <Image
        src={src}
        alt={`Dimensioned drawing of ${spring.name}, ${spring.code}`}
        fill
        sizes={sizes}
        className="object-contain"
      />
    </div>
  );
}

/**
 * The Drawing view.
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
      <div className="flex h-full items-center justify-center p-4">
        <TechnicalDrawing spring={spring} />
      </div>
    );
  }

  const current = sheets[Math.min(sheet, sheets.length - 1)];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative flex-1 p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-5"
          >
            <Image
              src={current}
              alt={`Dimensioned drawing of ${spring.name}, ${spring.code}`}
              fill
              sizes="(max-width: 1024px) 90vw, 620px"
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

/** The dimension symbols this spring's sheets are annotated with. */
function SheetSymbols({ spring }: { spring: SpringComponent }) {
  const symbols =
    spring.type === "torsion"
      ? ["d", "Do", "Di", "L1", "L2", "θ"]
      : ["d", "Do", "Di", "L0", "p"];

  return (
    <>
      {symbols.map((symbol, index) => (
        <span key={symbol}>
          {index > 0 && ", "}
          <em className="font-medium not-italic text-ink">{symbol}</em>
        </span>
      ))}
    </>
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

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-brand-50/70">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-semibold text-ink"
      >
        {title}
        <ChevronDownIcon
          width={20}
          height={20}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="bg-surface px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
