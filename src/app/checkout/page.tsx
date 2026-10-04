"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KitBoxArt } from "@/assets/brand";
import { formatEUR, useCart } from "@/lib/cart";
import { useOrders, VAT_RATE, type Order } from "@/lib/orders";
import { BUYER } from "@/data/seller";
import { OrderRecord } from "@/components/OrderRecord";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

export default function CheckoutPage() {
  const cart = useCart();
  const orders = useOrders();
  const [placed, setPlaced] = useState<Order | null>(null);

  /*
   * A workshop cannot reconcile an invoice it has no handle on: the person who
   * approves the spend knows the job number, not the Meconet order number. Asking for
   * their reference here is one input, and it is the difference between filing the
   * invoice and chasing someone to find out what it was for.
   */
  const [buyerReference, setBuyerReference] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");

  const vat = Math.round(cart.subtotal * VAT_RATE);
  const placedHeading = useRef<HTMLHeadingElement>(null);

  /*
   * Placing the order swaps the view without changing the route, so nothing resets
   * the scroll the way a real navigation would: the Place order button sits low in
   * the sidebar, and the confirmation would otherwise open part-way down, below its
   * own heading. Moving focus to that heading as well as scrolling means a screen
   * reader is told the order went through, rather than only sighted users seeing it.
   */
  useEffect(() => {
    if (!placed) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    placedHeading.current?.focus({ preventScroll: true });
  }, [placed]);

  const placeOrder = () => {
    const order = orders.place({
      lines: cart.lines.map((line) => ({
        slug: line.slug,
        name: line.kit.name,
        partNumber: line.kit.partNumber,
        quantity: line.quantity,
        unitPriceEUR: line.kit.priceEUR,
      })),
      buyerReference: buyerReference.trim(),
      costCentre: costCentre.trim(),
      invoiceEmail: invoiceEmail.trim() || BUYER.email,
    });
    setPlaced(order);
    cart.clear();
  };

  if (placed) {
    return (
      <section className="mx-auto max-w-[900px] px-5 py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stock-bg text-stock">
            <CheckIcon width={26} height={26} />
          </span>
          <div>
            <h1
              ref={placedHeading}
              tabIndex={-1}
              className="text-[32px] font-extrabold leading-tight tracking-tight text-ink outline-none"
            >
              Order placed
            </h1>
            <p className="mt-2 text-[15.5px] text-ink-soft">
              Everything below stays in <Link href="/orders" className="font-semibold text-brand-600 hover:underline">Orders &amp; documents</Link>,
              so you can come back for the paperwork whenever your bookkeeping needs it.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <OrderRecord order={placed} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600"
          >
            All orders &amp; documents
            <ArrowRightIcon width={17} height={17} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 text-[15px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            Back to the shop
          </Link>
        </div>

        <p className="mt-8 text-[13.5px] text-muted">
          This is where the usability test ends — nothing was actually ordered, and no document here
          is a real demand for payment.
        </p>
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
              lines={[BUYER.name, BUYER.street, `${BUYER.postal}, ${BUYER.country}`]}
            />
            <Placeholder
              step="2"
              title="Delivery method"
              lines={["Standard parcel · 1–2 working days", "Free of charge"]}
            />
            <Placeholder
              step="3"
              title="Payment"
              lines={["Invoice, 14 days net", `Billing to ${BUYER.name} · Business ID ${BUYER.businessId}`]}
            />

            <div className="rounded-card border border-line bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600">
                  4
                </span>
                <h2 className="text-[18px] font-bold text-ink">Your references</h2>
                <span className="ml-auto text-[13px] text-muted">Optional</span>
              </div>
              <p className="mt-3 pl-10 text-[14px] leading-relaxed text-muted">
                Printed on the confirmation, the delivery note and the invoice, so your accounts can
                match them to the job without asking you.
              </p>
              <div className="mt-4 grid gap-4 pl-10 sm:grid-cols-2">
                <Field
                  id="buyer-reference"
                  label="Your order or PO number"
                  placeholder="e.g. TK-2026-118"
                  value={buyerReference}
                  onChange={setBuyerReference}
                />
                <Field
                  id="cost-centre"
                  label="Cost centre or project"
                  placeholder="e.g. Line 3 retrofit"
                  value={costCentre}
                  onChange={setCostCentre}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="invoice-email"
                    label="Send invoice copy to"
                    type="email"
                    placeholder={BUYER.email}
                    value={invoiceEmail}
                    onChange={setInvoiceEmail}
                    hint="Leave blank to use your account address. Most workshops send this to bookkeeping."
                  />
                </div>
              </div>
            </div>

            <p className="text-[13.5px] text-muted">
              Steps 1 to 3 are filled in for the prototype. Nothing is submitted anywhere.
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
                <dt className="text-muted">VAT {(VAT_RATE * 100).toFixed(1)}%</dt>
                <dd className="font-semibold text-ink">{formatEUR(vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[18px]">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="font-extrabold text-ink">{formatEUR(cart.subtotal + vat)}</dd>
              </div>
            </dl>

            <button
              onClick={placeOrder}
              className="mt-6 w-full rounded-full bg-brand-500 py-4 text-[16px] font-bold uppercase tracking-wide text-white transition hover:bg-brand-600"
            >
              Place order
            </button>
            <p className="mt-3 text-center text-[13px] text-muted">
              You will get an order confirmation straight away. The invoice follows on dispatch.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14.5px] text-ink outline-none placeholder:text-muted focus:border-brand-400"
      />
      {hint && <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>}
    </div>
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
