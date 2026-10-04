"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  DEMO_LOCATION,
  directionsUrl,
  formatDistance,
  formatLastOrdered,
  type NearbyWorkshop,
} from "@/data/workshops";
import type { Kit } from "@/data/types";
import { ArrowRightIcon, CloseIcon, PhoneIcon, PinIcon } from "./icons";

/**
 * Leaflet reaches for `window` at import time, so the map is pulled in only on the
 * client. It is also only ever needed once this dialog opens, which keeps a mapping
 * library out of the bundle every other page pays for.
 */
const RegionMap = dynamic(() => import("./RegionMap").then((module) => module.RegionMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-brand-50" />,
});

/**
 * "Where can I get this today?" — the workshops around the capital region that
 * Meconet's own order log says are holding this kit.
 *
 * The list and the map are two views of one selection: picking a row moves the map,
 * clicking a pin moves the list. Keeping a single `selected` id means the two can
 * never disagree about which workshop is being talked about.
 */
export function LocalStockOverlay({
  kit,
  stops,
  onClose,
}: {
  kit: Kit;
  stops: NearbyWorkshop[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(stops[0]?.id ?? null);
  const selected = stops.find((stop) => stop.id === selectedId) ?? stops[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Workshops near you stocking the ${kit.name}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[1040px] overflow-auto rounded-2xl bg-surface p-6 shadow-pop"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-extrabold text-ink">Pick it up nearby</h2>
            <p className="mt-1 text-[14px] text-muted">
              {stops.length} workshops around Espoo, Helsinki and Vantaa are holding the {kit.name}.
              Distances are from {DEMO_LOCATION.label}.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close nearby workshops"
            className="shrink-0 rounded-full border border-line p-2 text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
          <ul className="flex flex-col gap-2" aria-label="Workshops stocking this kit">
            {stops.map((stop, index) => {
              const active = stop.id === selected?.id;
              return (
                <li key={stop.id}>
                  <button
                    onClick={() => setSelectedId(stop.id)}
                    aria-current={active}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-brand-400 bg-brand-50"
                        : "border-line bg-surface hover:border-line-strong hover:bg-page"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold text-white ${
                        active ? "bg-navy-900" : "bg-brand-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-ink">{stop.name}</span>
                      <span className="block truncate text-[13.5px] text-muted">{stop.district}</span>
                      <span className="mt-1 block text-[13px] font-semibold text-brand-600">
                        {formatDistance(stop.distanceKm)} away
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div>
            <div className="h-[340px] overflow-hidden rounded-xl border border-line bg-page sm:h-[400px]">
              <RegionMap stops={stops} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
            </div>

            {selected && (
              <div className="mt-4 rounded-xl border border-line bg-page p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-extrabold text-ink">{selected.name}</h3>
                    <p className="mt-1 flex items-start gap-2 text-[14px] text-ink-soft">
                      <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
                      <span>
                        {selected.street}, {selected.postal}
                        <span className="block text-muted">
                          {formatDistance(selected.distanceKm)} from {DEMO_LOCATION.label}
                        </span>
                      </span>
                    </p>
                  </div>
                  <ConfidenceBadge stop={selected} />
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-3">
                  <Fact label="Opening hours" value={selected.hours} />
                  <Fact
                    label="Phone"
                    value={
                      <a href={`tel:${selected.phone.replace(/\s/g, "")}`} className="hover:underline">
                        {selected.phone}
                      </a>
                    }
                  />
                  <Fact
                    label="On the shelf"
                    value={`${selected.kitStock.boxes} ${selected.kitStock.boxes === 1 ? "box" : "boxes"}`}
                  />
                </dl>

                <p className="mt-4 flex items-start gap-2 text-[13px] text-muted">
                  <PhoneIcon width={15} height={15} className="mt-0.5 shrink-0" />
                  Last ordered the {kit.name} from Meconet in{" "}
                  {formatLastOrdered(selected.kitStock.lastOrdered)}
                  {selected.confidence === "likely"
                    ? " — recent enough that the box should still have plenty in it."
                    : ", so it may well have been worked through since."}
                </p>

                <a
                  href={directionsUrl(selected)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
                >
                  Get directions
                  <ArrowRightIcon width={16} height={16} />
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
          These are independent workshops, not Meconet stores. Availability is estimated from their
          Meconet order history, so stock is not guaranteed and prices are set by the workshop.
        </p>
      </motion.div>
    </motion.div>
  );
}

function ConfidenceBadge({ stop }: { stop: NearbyWorkshop }) {
  const likely = stop.confidence === "likely";
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
        likely ? "bg-stock-bg text-stock" : "bg-[#fdf2e0] text-[#9a6508]"
      }`}
    >
      {likely ? "Likely on the shelf" : "Call ahead to confirm"}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
