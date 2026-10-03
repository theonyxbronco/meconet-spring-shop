"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SpringArt } from "@/assets/brand";
import { springProfile } from "@/lib/springProfile";
import { LENGTH_LABEL } from "@/lib/springMetrics";
import type { SpringComponent } from "@/data/types";
import { CloseIcon } from "./icons";

/**
 * Renders the spring at 1:1 on screen so a physical part can be laid against it.
 *
 * CSS pixels are not a fixed physical size, so the scale has to be calibrated once
 * per display. A bank card is the reference: every ID-1 card is exactly 85.60 mm wide.
 */

const CARD_WIDTH_MM = 85.6;
const DEFAULT_PX_PER_MM = 96 / 25.4; // the CSS reference of 96 dpi
const STORAGE_KEY = "meconet-screen-scale";

export function ActualSizeOverlay({ spring, onClose }: { spring: SpringComponent; onClose: () => void }) {
  const [pxPerMm, setPxPerMm] = useState(DEFAULT_PX_PER_MM);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setPxPerMm(parseFloat(stored));
    } catch {
      // Fall back to the 96 dpi assumption.
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = (value: number) => {
    setPxPerMm(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Not worth interrupting the task over.
    }
  };

  const profile = springProfile(spring);
  const [, , viewWidth, viewHeight] = profile.viewBox.split(" ").map(Number);
  const widthPx = viewWidth * pxPerMm;
  const heightPx = viewHeight * pxPerMm;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${spring.code} at actual size`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[1000px] overflow-auto rounded-2xl bg-surface p-6 shadow-pop"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-extrabold text-ink">Actual size · {spring.code}</h2>
            <p className="mt-1 text-[14px] text-muted">
              Hold your spring flat against the screen and line it up with the outline.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close actual size view"
            className="rounded-full border border-line p-2 text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-[linear-gradient(0deg,#f8fbfe,#ffffff)] p-6">
          <div style={{ width: widthPx, minWidth: widthPx }}>
            {/* Exact box plus a matching aspect ratio means the drawing lands at true 1:1. */}
            <div style={{ width: widthPx, height: heightPx }}>
              <SpringArt spring={spring} className="h-full w-full" />
            </div>
            <Ruler pxPerMm={pxPerMm} widthMm={viewWidth} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-4">
          <Fact label={LENGTH_LABEL[spring.type]} value={`${spring.freeLength} mm`} />
          <Fact label="Outside Ø" value={`${spring.outerDiameter} mm`} />
          <Fact label="Wire Ø" value={`${spring.wireDiameter} mm`} />
          <Fact label="Ends" value={spring.endType} />
        </dl>

        <div className="mt-5 rounded-xl border border-line bg-page p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-semibold text-ink">
              Screen scale: {pxPerMm.toFixed(2)} px per mm
            </p>
            <button
              onClick={() => setCalibrating((value) => !value)}
              className="rounded-full border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
            >
              {calibrating ? "Done" : "Calibrate for this screen"}
            </button>
          </div>

          {calibrating && (
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
                onChange={(event) => save(parseFloat(event.target.value))}
                aria-label="Screen scale calibration"
                className="mt-4 w-full max-w-[420px] accent-[#1f85f0]"
              />
              <button
                onClick={() => save(DEFAULT_PX_PER_MM)}
                className="ml-4 text-[13px] font-medium text-brand-600 hover:underline"
              >
                Reset to default
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Ruler({ pxPerMm, widthMm }: { pxPerMm: number; widthMm: number }) {
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
