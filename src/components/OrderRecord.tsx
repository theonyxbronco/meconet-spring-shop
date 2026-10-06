"use client";

/**
 * The order as a record rather than a thank-you: the numbers somebody will be asked
 * for later, and the documents that prove it, in the state each of them is actually
 * in. Shared by the post-checkout screen and the order archive so that the page you
 * land on and the page you come back to a month later are the same page.
 */

import Link from "next/link";
import { useState } from "react";
import { formatEUR } from "@/lib/cart";
import {
  DOCUMENT_KINDS,
  documentState,
  downloadCsv,
  formatDateTime,
  formatReference,
  ordersToCsv,
  VAT_RATE,
  type DocumentKind,
  type Order,
} from "@/lib/orders";
import { BUYER } from "@/data/seller";
import { CheckIcon, DownloadIcon, MailIcon, TruckIcon } from "./icons";

export function OrderRecord({ order }: { order: Order }) {
  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-ink">Order {order.number}</h2>
            <p className="mt-1 text-[13.5px] text-muted">Placed {formatDateTime(order.placedAt)}</p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-stock-bg px-3.5 py-1.5 text-[13px] font-bold text-stock">
            <TruckIcon width={16} height={16} />
            {order.status === "dispatched" ? "Dispatched" : "Confirmed · ships in 1–2 days"}
          </span>
        </div>

        {/*
         * These two are the numbers a bookkeeper will be asked for, usually while on
         * the phone to someone else. Copy buttons beat reading digits aloud.
         */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <CopyField label="Order number" value={order.number} />
          <CopyField label="Payment reference" value={formatReference(order.reference)} />
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-5 text-[14px] sm:grid-cols-3">
          <Fact label="Your reference" value={order.buyerReference || "Not given"} />
          <Fact label="Cost centre" value={order.costCentre || "Not given"} />
          <Fact label="Invoice copy to" value={order.invoiceEmail || BUYER.email} />
        </dl>

        {/*
         * What was chosen at checkout, read back. A participant who changed the
         * address or the terms needs to see that the order kept the change, and a
         * month later this is the only place that still says where the box went.
         */}
        <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-line pt-5 text-[14px] sm:grid-cols-3">
          <Fact
            label={order.delivery.id === "pickup" ? "Collection" : "Delivered to"}
            value={[
              order.deliveryAddress.company,
              order.deliveryAddress.street,
              `${order.deliveryAddress.postalCode} ${order.deliveryAddress.city}`,
              order.deliveryAddress.country,
            ]}
          />
          <Fact label="Delivery" value={[order.delivery.label, order.delivery.detail]} />
          <Fact
            label="Payment"
            value={
              order.paymentMethod === "invoice"
                ? [`Invoice, ${order.paymentTermDays} days net`, `Billed to ${order.billing.company}`]
                : ["Card", "Paid when the order was placed"]
            }
          />
        </dl>
      </section>

      <DocumentStrip order={order} />

      <section className="rounded-card border border-line bg-surface p-6 shadow-card">
        <h2 className="text-[18px] font-bold text-ink">What you ordered</h2>
        <table className="mt-4 w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
              <th className="pb-2 font-semibold">Part</th>
              <th className="pb-2 text-right font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Unit</th>
              <th className="pb-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.partNumber} className="border-b border-line">
                <td className="py-3">
                  <span className="block font-semibold text-ink">{line.name}</span>
                  <span className="block text-[12.5px] text-muted">{line.partNumber}</span>
                </td>
                <td className="py-3 text-right text-ink">{line.quantity}</td>
                <td className="py-3 text-right text-ink">{formatEUR(line.unitPriceEUR)}</td>
                <td className="py-3 text-right font-semibold text-ink">{formatEUR(line.lineTotalEUR)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-[260px] text-[14px]">
            <div className="flex justify-between py-1">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold text-ink">{formatEUR(order.subtotalEUR)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted">{order.delivery.label}</dt>
              <dd className="font-semibold text-ink">
                {order.shippingEUR === 0 ? "Free" : formatEUR(order.shippingEUR)}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted">VAT {(VAT_RATE * 100).toFixed(1)}%</dt>
              <dd className="font-semibold text-ink">{formatEUR(order.vatEUR)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-[18px]">
              <dt className="font-bold text-ink">Total</dt>
              <dd className="font-extrabold text-ink">{formatEUR(order.totalEUR)}</dd>
            </div>
          </dl>
        </div>

        <button
          onClick={() => downloadCsv(`${order.number}.csv`, ordersToCsv([order]))}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
        >
          <DownloadIcon width={16} height={16} />
          Export lines as CSV
        </button>
      </section>
    </div>
  );
}

/**
 * The three documents and, crucially, when each one exists. Showing the two that are
 * not ready yet — greyed, with a date rather than nothing — answers the question
 * people would otherwise raise a support ticket for: "where is my invoice?"
 */
export function DocumentStrip({ order }: { order: Order }) {
  const [emailed, setEmailed] = useState<DocumentKind | null>(null);

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 className="text-[18px] font-bold text-ink">Documents</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Open a document and use your browser&apos;s print dialog to save it as a PDF or send it to
        paper.
      </p>

      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {DOCUMENT_KINDS.map((kind) => {
          const state = documentState(order, kind);
          return (
            <li
              key={kind}
              className={`flex flex-col rounded-xl border p-4 ${
                state.available ? "border-line bg-page" : "border-dashed border-line-strong bg-page/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${
                    state.available ? "bg-stock" : "border border-line-strong bg-surface"
                  }`}
                >
                  {state.available && <CheckIcon width={12} height={12} />}
                </span>
                <span
                  className={`text-[14.5px] font-bold ${state.available ? "text-ink" : "text-muted"}`}
                >
                  {state.label}
                </span>
              </span>
              <span className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted">{state.note}</span>

              {state.available ? (
                <span className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/orders/${order.id}/${kind}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-600"
                  >
                    <DownloadIcon width={15} height={15} />
                    PDF
                  </Link>
                  <button
                    onClick={() => {
                      setEmailed(kind);
                      setTimeout(() => setEmailed(null), 2600);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
                  >
                    {emailed === kind ? (
                      <>
                        <CheckIcon width={15} height={15} />
                        Sent
                      </>
                    ) : (
                      <>
                        <MailIcon width={15} height={15} />
                        Email
                      </>
                    )}
                  </button>
                </span>
              ) : (
                <span className="mt-3 text-[12.5px] font-semibold text-muted">
                  Not available yet
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {emailed && (
        <p className="mt-3 text-[13px] text-stock" role="status">
          A copy has been sent to {order.invoiceEmail || BUYER.email}.
        </p>
      )}
    </section>
  );
}

/** A value plus a one-click copy, because these get read down a phone line. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the number is on screen to read either way.
    }
  };

  return (
    <div className="rounded-xl border border-line bg-page p-3.5">
      <p className="text-[12px] uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="font-mono text-[17px] font-bold text-ink">{value}</p>
        <button
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | string[] }) {
  const lines = Array.isArray(value) ? value : [value];

  return (
    <div>
      <dt className="text-[12px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">
        {lines.map((line, index) => (
          <span key={`${index}-${line}`} className={index === 0 ? "block" : "block font-normal text-ink-soft"}>
            {line}
          </span>
        ))}
      </dd>
    </div>
  );
}
