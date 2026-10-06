"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CloseIcon, RulerIcon } from "./icons";

/**
 * The screen-scale machinery, shared by everything that draws at 1:1.
 *
 * CSS pixels are not a fixed physical size, so the scale has to be calibrated once
 * per display. A bank card is the reference: every ID-1 card is exactly 85.60 mm wide.
 * The calibration is kept per browser, so a reader who set it on a kit page gets a
 * true ruler in the conversation too, and the other way round.
 */

const CARD_WIDTH_MM = 85.6;
export const DEFAULT_PX_PER_MM = 96 / 25.4; // the CSS reference of 96 dpi
const STORAGE_KEY = "meconet-screen-scale";

export function useScreenScale() {
  const [pxPerMm, setPxPerMm] = useState(DEFAULT_PX_PER_MM);
  // Whether this browser has ever been calibrated — the standalone tool opens its
  // card step for a first-time reader rather than quietly showing a guessed scale.
  const [calibrated, setCalibrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const value = parseFloat(stored);
      if (!Number.isFinite(value)) return;
      setPxPerMm(value);
      setCalibrated(true);
    } catch {
      // Fall back to the 96 dpi assumption.
    }
  }, []);

  const save = useCallback((value: number) => {
    setPxPerMm(value);
    setCalibrated(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Not worth interrupting the task over.
    }
  }, []);

  return { pxPerMm, calibrated, save };
}

/** A millimetre ruler drawn at true size, as wide as `widthMm` asks for. */
export function MmRuler({ pxPerMm, widthMm }: { pxPerMm: number; widthMm: number }) {
  const total = Math.floor(widthMm);
  return (
    <svg
      width={(total + 4) * pxPerMm}
      height={34}
      viewBox={`0 0 ${total + 4} 9`}
      preserveAspectRatio="none"
      className="mt-2 block"
      aria-label="Millimetre ruler at actual size"
    >
      <line x1="0" y1="0.2" x2={total} y2="0.2" stroke="#0b2e5e" strokeWidth="0.25" />
      {Array.from({ length: total + 1 }, (_, mm) => {
        const major = mm % 10 === 0;
        const mid = mm % 5 === 0;
        return (
          <line
            key={mm}
            x1={mm}
            y1="0.2"
            x2={mm}
            y2={major ? 3.4 : mid ? 2.2 : 1.3}
            stroke="#0b2e5e"
            strokeWidth={major ? 0.3 : 0.18}
          />
        );
      })}
      {Array.from({ length: Math.floor(total / 10) + 1 }, (_, i) => (
        <text key={i} x={i * 10 + 0.8} y="7" fontSize="3.4" fill="#37557f" fontWeight="600">
          {i * 10}
        </text>
      ))}
    </svg>
  );
}

/**
 * The scale readout and the bank-card step that sets it.
 *
 * `defaultOpen` is for the standalone tool, where calibrating *is* the first task;
 * on a kit page the drawing is already useful at the stored scale, so it stays shut.
 */
export function ScaleCalibrator({
  pxPerMm,
  onChange,
  defaultOpen = false,
}: {
  pxPerMm: number;
  onChange: (value: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-line bg-page p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink">
          Screen scale: {pxPerMm.toFixed(2)} px per mm
        </p>
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="rounded-full border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
        >
          {open ? "Done" : "Calibrate for this screen"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <p className="text-[13.5px] text-muted">
            Hold any bank card against the bar below and drag the slider until the widths match.
            Every card is exactly 85.6 mm wide.
          </p>
          <div
            className="mt-3 h-[54px] rounded-lg border-2 border-dashed border-brand-400 bg-brand-50"
            style={{ width: CARD_WIDTH_MM * pxPerMm }}
          />
          <input
            type="range"
            min={2.5}
            max={9}
            step={0.01}
            value={pxPerMm}
            onChange={(event) => onChange(parseFloat(event.target.value))}
            aria-label="Screen scale calibration"
            className="mt-4 w-full max-w-[420px] accent-[#1f85f0]"
          />
          <button
            onClick={() => onChange(DEFAULT_PX_PER_MM)}
            className="ml-4 text-[13px] font-medium text-brand-600 hover:underline"
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}

/** How much ruler we will draw, however wide or narrow the box turns out to be. */
const MIN_RULER_MM = 40;
const MAX_RULER_MM = 300;

/**
 * The ruler on its own, with no spring to compare against.
 *
 * This is the version the conversation opens: someone who has not picked a kit yet
 * has nothing to lay their spring over, but they still need a millimetre scale to
 * read it off — which is the measurement the finder keeps asking them for.
 */
export function ScreenRulerOverlay({ onClose }: { onClose: () => void }) {
  const { pxPerMm, calibrated, save } = useScreenScale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [widthMm, setWidthMm] = useState(MIN_RULER_MM);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // As long a ruler as the box can hold, re-measured when the window or the scale
  // changes — a ruler that runs off the edge is one a reader has to scroll to use.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const fit = () => {
      const available = track.clientWidth / pxPerMm - 4; // the ruler's own tail margin
      setWidthMm(Math.max(MIN_RULER_MM, Math.min(MAX_RULER_MM, Math.floor(available))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(track);
    return () => observer.disconnect();
  }, [pxPerMm]);

  // Hung off the body rather than rendered in place. The conversation that opens
  // this sits inside the hero's animated wrapper, and a transformed ancestor makes
  // `fixed` mean "fixed to the hero" instead of to the viewport.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Measuring tool"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[1000px] overflow-auto rounded-2xl bg-surface p-6 shadow-pop"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <RulerIcon width={19} height={19} />
            </span>
            <div>
              <h2 className="text-[22px] font-extrabold text-ink">Measuring tool</h2>
              <p className="mt-1 text-[14px] text-muted">
                A true-to-size millimetre ruler. Calibrate it once for this screen, then hold the
                spring flat against it and read the number off.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close the measuring tool"
            className="shrink-0 rounded-full border border-line p-2 text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        {/* Calibration comes first here: until the card step is done, the ruler below
            is only as accurate as a guess at the display's dpi. */}
        <div className="mt-5">
          <ScaleCalibrator pxPerMm={pxPerMm} onChange={save} defaultOpen={!calibrated} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-[linear-gradient(0deg,#f8fbfe,#ffffff)] p-6">
          {/* The measured element is inside the padding, so its width is the width the
              ruler actually has to fit into. */}
          <div ref={trackRef}>
            <MmRuler pxPerMm={pxPerMm} widthMm={widthMm} />
          </div>
        </div>

        <ul className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {[
            {
              term: "Free length",
              how: "Lay the spring along the ruler, end to end, hooks included — nothing pressing on it.",
            },
            {
              term: "Outside Ø",
              how: "Stand it on the ruler and measure straight across the coil, not diagonally.",
            },
            {
              term: "Wire Ø",
              how: "Too fine to read directly: squeeze ten coils together, measure that, divide by ten.",
            },
          ].map((hint) => (
            <li key={hint.term} className="rounded-lg bg-brand-50/60 p-3.5">
              <p className="text-[13.5px] font-bold text-ink">{hint.term}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{hint.how}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
          A millimetre or two out is fine — every result is an assortment that covers a spread of
          sizes.
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
