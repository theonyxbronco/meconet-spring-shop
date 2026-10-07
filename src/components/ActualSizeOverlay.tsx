"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { SpringArt } from "@/assets/brand";
import { springProfile } from "@/lib/springProfile";
import { LENGTH_LABEL } from "@/lib/springMetrics";
import type { SpringComponent } from "@/data/types";
import { CloseIcon } from "./icons";
import { MmRuler, ScaleCalibrator, useScreenScale } from "./ScreenRuler";

/**
 * Renders the spring at 1:1 on screen so a physical part can be laid against it.
 *
 * The screen scale, the ruler and the bank-card calibration live in `ScreenRuler` —
 * shared with the conversation's measuring tool, which is the same thing without a
 * spring to compare against.
 */
export function ActualSizeOverlay({ spring, onClose }: { spring: SpringComponent; onClose: () => void }) {
  const { pxPerMm, save } = useScreenScale();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const profile = springProfile(spring);
  const [, , viewWidth, viewHeight] = profile.viewBox.split(" ").map(Number);
  const widthPx = viewWidth * pxPerMm;
  const heightPx = viewHeight * pxPerMm;

  // Rendered into <body>, so no sticky or transformed ancestor can trap it under
  // the rest of the page.
  return createPortal(
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
            <MmRuler pxPerMm={pxPerMm} widthMm={viewWidth} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-4">
          <Fact label={LENGTH_LABEL[spring.type]} value={`${spring.freeLength} mm`} />
          <Fact label="Outside Ø" value={`${spring.outerDiameter} mm`} />
          <Fact label="Wire Ø" value={`${spring.wireDiameter} mm`} />
          <Fact label="Ends" value={spring.endType} />
        </dl>

        <div className="mt-5">
          <ScaleCalibrator pxPerMm={pxPerMm} onChange={save} />
        </div>
      </motion.div>
    </motion.div>,
    document.body,
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
