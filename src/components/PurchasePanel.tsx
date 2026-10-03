"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatEUR, useCart } from "@/lib/cart";
import type { Kit } from "@/data/types";
import { CheckIcon, MinusIcon, PlusIcon, TruckIcon } from "./icons";

export function PurchasePanel({ kit }: { kit: Kit }) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

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
    </aside>
  );
}
