"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActualSizeOverlay } from "./ActualSizeOverlay";
import { identificationSteps, keyFigures, specAttributes, springNotes } from "@/lib/springSpecs";
import type { SpringComponent } from "@/data/types";
import { ChevronDownIcon, DownloadIcon } from "./icons";

type Panel = "specifications" | "notes" | "identify" | "files";

/**
 * Everything written down about the selected spring, directly under its 3D model:
 * the key figures at a glance, then the full sheet and notes. Keeping them in one
 * place with the model and the rail means picking a spring and reading it never
 * sends anyone scrolling between two ends of the page.
 */
export function ComponentDetail({ spring }: { spring: SpringComponent }) {
  const [actualSize, setActualSize] = useState(false);
  // Every panel opens and closes on its own: reading the specification while
  // checking the identification notes against the part in hand is the normal way
  // to use this page, and closing one panel to open another takes that away.
  const [open, setOpen] = useState<Set<Panel>>(() => new Set<Panel>(["specifications"]));
  const [note, setNote] = useState<string | null>(null);
  const toggle = (panel: Panel) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(panel)) next.add(panel);
      return next;
    });

  const flash = (message: string) => {
    setNote(message);
    setTimeout(() => setNote(null), 2600);
  };

  const groups = specAttributes(spring);

  return (
    <section aria-label={`Details of ${spring.code}`}>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {keyFigures(spring).map((figure) => (
          <div key={figure.label} className="bg-surface px-4 py-3">
            <dt className="truncate text-[12.5px] text-muted" title={figure.label}>
              {figure.label}
              {figure.ref && <span className="ml-1.5 italic">{figure.ref}</span>}
            </dt>
            <dd className="mt-0.5 text-[17px] font-bold text-ink">
              {figure.value}
              {figure.unit && <span className="ml-1 text-[13px] font-medium text-muted">{figure.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 space-y-3">
        <Accordion
          title="Technical specifications"
          open={open.has("specifications")}
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
              {groups.map((group) => (
                <tbody key={group.title}>
                  <tr>
                    <th
                      colSpan={4}
                      scope="rowgroup"
                      className="border-b border-line px-3 pb-1.5 pt-4 text-left text-[13px] font-bold text-ink"
                    >
                      {group.title}
                    </th>
                  </tr>
                  {group.rows.map((attribute) => (
                    <tr key={attribute.label} className="align-top">
                      <td className="border-b border-line px-3 py-2 text-ink-soft">{attribute.label}</td>
                      <td className="border-b border-line px-3 py-2 font-medium italic text-muted">
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
              ))}
            </table>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Derived from the catalogue geometry. Tolerances to EN 15800 unless otherwise agreed.
            The symbols in the Ref. column are the ones the Technical view is annotated with, so
            a dimension read off the sheet can be looked up here directly.
          </p>
        </Accordion>

        <Accordion
          title="Notes on using this spring"
          open={open.has("notes")}
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
          open={open.has("identify")}
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

        <Accordion title="CAD/PDF files" open={open.has("files")} onToggle={() => toggle("files")}>
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
