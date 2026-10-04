"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEUR, useCart } from "@/lib/cart";
import { formatDistance, workshopsStocking } from "@/data/workshops";
import type { Kit } from "@/data/types";
import { LocalStockOverlay } from "./LocalStockOverlay";
import { ArrowRightIcon, CheckIcon, MinusIcon, PinIcon, PlusIcon, TruckIcon } from "./icons";

export function PurchasePanel({ kit }: { kit: Kit }) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showingMap, setShowingMap] = useState(false);

  const nearby = useMemo(() => workshopsStocking(kit.slug), [kit.slug]);

  const addToOrder = () => {
    cart.add(kit.slug, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  return (
    <aside className="rounded-xl border border-line bg-surface p-6 shadow-card">
      <p className="text-[13.5px] text-muted">Part number:</p>
      <p className="text-[30px] font-extrabold leading-tight tracking-tight text-ink">{kit.partNumber}</p>

      <p className="mt-4 flex items-center gap-2.5 text-[15px] font-semibold text-stock">
        <span className="h-2.5 w-2.5 rounded-full bg-stock" />
        {kit.inStock ? "In Stock" : "Made to order"}
      </p>
      <p className="mt-2 flex items-center gap-2.5 text-[15px] text-stock">
        <TruckIcon width={20} height={20} />
        Deliverable in {kit.deliveryDays}
      </p>

      <p className="mt-5 text-[14px] text-muted">
        Price per assortment
        <span className="ml-2 text-[20px] font-bold text-ink">{formatEUR(kit.priceEUR)}</span>
      </p>

      <div className="mt-5">
        <label htmlFor="quantity" className="text-[15px] font-semibold text-ink">
          Quantity
        </label>
        <div className="mt-2 flex w-[150px] items-center rounded-lg border border-line-strong">
          <button
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center text-ink transition hover:text-brand-600"
          >
            <MinusIcon width={17} height={17} />
          </button>
          <input
            id="quantity"
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(event) => {
              const next = parseInt(event.target.value, 10);
              setQuantity(Number.isNaN(next) ? 1 : Math.min(99, Math.max(1, next)));
            }}
            className="h-11 w-[56px] border-x border-line-strong bg-transparent text-center text-[16px] font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center text-ink transition hover:text-brand-600"
          >
            <PlusIcon width={17} height={17} />
          </button>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={addToOrder}
        className={`mt-6 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[16px] font-bold uppercase tracking-wide text-white transition ${
          added ? "bg-stock" : "bg-brand-500 hover:bg-brand-600"
        }`}
      >
        {added ? (
          <>
            <CheckIcon width={20} height={20} />
            Added to order
          </>
        ) : (
          "Add to order"
        )}
      </motion.button>

      <p className="mt-3 text-center text-[13px] text-muted">
        {kit.components.length} spring types ·{" "}
        {kit.components.reduce((total, component) => total + component.quantity, 0)} pieces per box
      </p>

      {/*
       * Delivery is 1-2 days; a workshop across town is this afternoon. Only worth
       * saying when somebody nearby actually has the box, so the block disappears
       * entirely rather than announcing that there is nowhere to go.
       */}
      {nearby.length > 0 && (
        <button
          onClick={() => setShowingMap(true)}
          className="mt-5 flex w-full items-start gap-3 rounded-xl border border-line bg-page p-4 text-left transition hover:border-brand-400 hover:bg-brand-50"
        >
          <PinIcon width={20} height={20} className="mt-0.5 shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-ink">Also available near you</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
              {nearby.length} {nearby.length === 1 ? "workshop" : "workshops"} in the capital region
              stock this kit — nearest is {nearby[0].name}, {formatDistance(nearby[0].distanceKm)} away.
            </span>
            <span className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-brand-600">
              See them on the map
              <ArrowRightIcon width={15} height={15} />
            </span>
          </span>
        </button>
      )}

      <AnimatePresence>
        {showingMap && (
          <LocalStockOverlay kit={kit} stops={nearby} onClose={() => setShowingMap(false)} />
        )}
      </AnimatePresence>
    </aside>
  );
}
