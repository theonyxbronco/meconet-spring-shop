"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEUR, useCart } from "@/lib/cart";
import { formatDistance, workshopsStocking } from "@/data/workshops";
import {
  SPRING_TYPE_LABEL,
  TIER_LABEL,
  type Kit,
  type KitTier,
  type SpringComponent,
  type SpringType,
} from "@/data/types";
import { kitVariant, pieceCount, type KitVariant } from "@/data/kits";
import { LocalStockOverlay } from "./LocalStockOverlay";
import { ArrowRightIcon, CheckIcon, MinusIcon, PinIcon, PlusIcon, TruckIcon } from "./icons";

export function PurchasePanel({
  kit,
  variant,
  tier,
  onTier,
}: {
  kit: Kit;
  variant: KitVariant;
  tier: KitTier;
  onTier: (tier: KitTier) => void;
}) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showingMap, setShowingMap] = useState(false);

  const nearby = useMemo(() => workshopsStocking(kit.slug), [kit.slug]);

  const addToOrder = () => {
    cart.add(kit.slug, quantity, variant.tier);
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  return (
    // On a wide screen the springs beside it run long, so the panel follows the
    // reader down — but only where the window is tall enough to show all of it.
    //
    // Read top to bottom it answers one question per block, in the order people ask
    // them: what is it, which box, when can I have it, what does it cost.
    <aside className="self-start divide-y divide-line rounded-xl border border-line bg-surface shadow-card lg:[@media(min-height:880px)]:sticky lg:[@media(min-height:880px)]:top-[var(--header-offset)]">
      <div className="px-6 pb-5 pt-6">
        <p className="text-[24px] font-extrabold leading-tight tracking-tight text-ink">{variant.name}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span>Part {variant.partNumber}</span>
          <span className="flex items-center gap-1.5 font-semibold text-stock">
            <span className="h-2 w-2 rounded-full bg-stock" />
            {kit.inStock ? "In stock" : "Made to order"}
          </span>
        </p>
      </div>

      <div className="px-6 py-5">
        <TierSwitch kit={kit} tier={tier} onTier={onTier} />
      </div>

      {/*
       * Delivery is 1-2 days; a workshop across town is this afternoon. The nearby
       * line is only worth showing when somebody actually has the box, so it
       * disappears entirely rather than announcing that there is nowhere to go.
       */}
      <div className="space-y-3 px-6 py-5">
        <p className="flex items-center gap-2.5 text-[14.5px] text-ink">
          <TruckIcon width={19} height={19} className="shrink-0 text-stock" />
          Delivered in {kit.deliveryDays}
        </p>
        {nearby.length > 0 && (
          <button
            onClick={() => setShowingMap(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-page px-3.5 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50"
          >
            <PinIcon width={19} height={19} className="shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
              <span className="font-semibold">Pick up today</span> from {nearby.length}{" "}
              {nearby.length === 1 ? "workshop" : "workshops"} nearby
              <span className="block text-[12.5px] text-muted">
                Nearest: {nearby[0].name}, {formatDistance(nearby[0].distanceKm)}
              </span>
            </span>
            <ArrowRightIcon width={16} height={16} className="shrink-0 text-brand-600" />
          </button>
        )}
      </div>

      <div className="px-6 pb-6 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted">Price per box</p>
            <p className="text-[30px] font-extrabold leading-none tracking-tight text-ink">
              {formatEUR(variant.priceEUR)}
            </p>
          </div>
          <div>
            <label htmlFor="quantity" className="sr-only">
              Quantity
            </label>
            <div className="flex items-center rounded-lg border border-line-strong">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
                className="flex h-11 w-10 items-center justify-center text-ink transition hover:text-brand-600"
              >
                <MinusIcon width={16} height={16} />
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
                className="h-11 w-[48px] border-x border-line-strong bg-transparent text-center text-[16px] font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                aria-label="Increase quantity"
                className="flex h-11 w-10 items-center justify-center text-ink transition hover:text-brand-600"
              >
                <PlusIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={addToOrder}
          className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[16px] font-bold text-white transition ${
            added ? "bg-stock" : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {added ? (
            <>
              <CheckIcon width={20} height={20} />
              Added to order
            </>
          ) : quantity > 1 ? (
            `Add ${quantity} to order · ${formatEUR(variant.priceEUR * quantity)}`
          ) : (
            "Add to order"
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {showingMap && <LocalStockOverlay kit={kit} stops={nearby} onClose={() => setShowingMap(false)} />}
      </AnimatePresence>
    </aside>
  );
}

const TYPE_ORDER: SpringType[] = ["compression", "extension", "torsion", "die", "disc"];

/** "Ø5–11 mm": the spread of outside diameters a set of springs covers. */
const diameterRange = (components: SpringComponent[]) => {
  const sizes = components.map((component) => component.outerDiameter);
  return `Ø${Math.min(...sizes)}–${Math.max(...sizes)} mm`;
};

/** "4 compression, 3 extension and 1 disc": what a set of springs is made of. */
const typeBreakdown = (components: SpringComponent[]) => {
  const parts = TYPE_ORDER.map((type) => ({
    type,
    count: components.filter((component) => component.type === type).length,
  }))
    .filter((part) => part.count > 0)
    .map((part) => `${part.count} ${SPRING_TYPE_LABEL[part.type].split(" ")[0].toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
};

/**
 * Basic or Pro.
 *
 * Both are the same kit in a bigger box, so the two sit side by side with their own
 * price, size count and size range: the upgrade can be judged without switching to
 * it first. Underneath, one line says exactly what the extra money buys, worked out
 * from the springs themselves rather than written by hand.
 */
function TierSwitch({
  kit,
  tier,
  onTier,
}: {
  kit: Kit;
  tier: KitTier;
  onTier: (tier: KitTier) => void;
}) {
  const options: KitTier[] = ["basic", "pro"];
  const extra = kit.pro.components;

  return (
    <div>
      <p className="text-[13.5px] font-semibold text-ink">Choose your box</p>
      <div role="group" aria-label="Kit build" className="mt-2.5 grid grid-cols-2 gap-2.5">
        {options.map((option) => {
          const build = kitVariant(kit, option);
          const active = option === tier;
          return (
            <button
              key={option}
              onClick={() => onTier(option)}
              aria-pressed={active}
              className={`rounded-lg border-2 px-3.5 py-3 text-left transition ${
                active ? "border-brand-500 bg-brand-50/70" : "border-line hover:border-brand-200"
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className={`text-[15px] font-bold ${active ? "text-brand-600" : "text-ink"}`}>
                  {TIER_LABEL[option]}
                </span>
                <span className="text-[15px] font-bold text-ink">{formatEUR(build.priceEUR)}</span>
              </span>
              <span className="mt-1.5 block text-[13px] font-medium text-ink-soft">
                {build.components.length} sizes · {diameterRange(build.components)}
              </span>
              <span className="block text-[12px] text-muted">{pieceCount(build.components)} pieces</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-lg bg-brand-50/70 px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft">
        <span className="block font-semibold text-ink">
          Pro = everything in Basic + {extra.length} more sizes
        </span>
        {typeBreakdown(extra)}, widening the range to {diameterRange([...kit.components, ...extra])}.
      </p>
    </div>
  );
}
