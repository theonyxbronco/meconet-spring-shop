"use client";

import Link from "next/link";
import { useState } from "react";
import { KitBoxArt } from "@/assets/brand";
import { formatEUR, useCart } from "@/lib/cart";
import { CheckIcon } from "@/components/icons";

export default function CheckoutPage() {
  const cart = useCart();
  const [placed, setPlaced] = useState(false);
  const vat = Math.round(cart.subtotal * 0.255);

  if (placed) {
    return (
      <section className="mx-auto max-w-[720px] px-5 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stock-bg text-stock">
          <CheckIcon width={32} height={32} />
        </span>
        <h1 className="mt-6 text-[34px] font-extrabold tracking-tight text-ink">Order placed</h1>
        <p className="mt-3 text-[16px] text-muted">
          Thank you. This is where the usability test ends — nothing was actually ordered.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-brand-500 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-brand-600"
        >
          Back to the shop
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex gap-2 text-[13.5px] text-muted">
        <Link href="/" className="hover:text-brand-600">
          Frontpage
        </Link>
        <span aria-hidden>/</span>
        <Link href="/cart" className="hover:text-brand-600">
          Cart
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-brand-600">Checkout</span>
      </nav>

      <h1 className="text-[36px] font-extrabold tracking-tight text-ink">Checkout</h1>

      {cart.lines.length === 0 ? (
        <p className="mt-8 rounded-card border border-line bg-surface p-12 text-center text-[16px] text-muted">
          There is nothing to check out yet.{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            Find an assortment
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <Placeholder
              step="1"
              title="Delivery address"
              lines={["Meconet Oy", "Pavintie 8", "01260 Vantaa, Finland"]}
            />
            <Placeholder
              step="2"
              title="Delivery method"
              lines={["Standard parcel · 1–2 working days", "Free of charge"]}
            />
            <Placeholder step="3" title="Payment" lines={["Invoice, 14 days net", "Reference 2734-PROTO"]} />
            <p className="text-[13.5px] text-muted">
              These steps are filled in for the prototype. Nothing is submitted anywhere.
            </p>
          </div>

          <aside className="h-fit rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 className="text-[20px] font-bold text-ink">Your order</h2>
            <ul className="mt-5 space-y-4">
              {cart.lines.map((line) => (
                <li key={line.slug} className="flex items-center gap-3">
                  <div className="h-12 w-16 shrink-0 rounded-lg bg-brand-50 p-1">
                    <KitBoxArt kit={line.kit} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{line.kit.name}</p>
                    <p className="text-[12.5px] text-muted">Quantity {line.quantity}</p>
                  </div>
                  <span className="text-[14.5px] font-semibold text-ink">{formatEUR(line.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[14.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatEUR(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">VAT 25.5%</dt>
                <dd className="font-semibold text-ink">{formatEUR(vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[18px]">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="font-extrabold text-ink">{formatEUR(cart.subtotal + vat)}</dd>
              </div>
            </dl>

            <button
              onClick={() => {
                setPlaced(true);
                cart.clear();
              }}
              className="mt-6 w-full rounded-full bg-brand-500 py-4 text-[16px] font-bold uppercase tracking-wide text-white transition hover:bg-brand-600"
            >
              Place order
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

function Placeholder({ step, title, lines }: { step: string; title: string; lines: string[] }) {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600">
          {step}
        </span>
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-stock">
          <CheckIcon width={15} height={15} />
          Ready
        </span>
      </div>
      <div className="mt-3 pl-10 text-[14.5px] leading-relaxed text-ink-soft">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
