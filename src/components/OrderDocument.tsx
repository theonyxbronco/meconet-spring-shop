"use client";

/**
 * One printable sheet: an order confirmation, a delivery note or an invoice.
 *
 * All three share a letterhead and a line table, but they are not the same document
 * and the differences matter to the people filing them. A delivery note carries no
 * prices — it is checked against the box on arrival by someone who has no business
 * seeing what the workshop paid. An invoice carries bank details, a due date and the
 * payment reference. A confirmation carries prices but nothing to pay against,
 * because at that point nothing is payable yet.
 *
 * The sheet is laid out for paper rather than for the screen: it is sized in
 * millimetres, and `@media print` in globals strips the site chrome around it so the
 * browser's own Save as PDF produces a clean, selectable-text document.
 */

import { Wordmark } from "@/assets/brand";
import { BUYER, SELLER } from "@/data/seller";
import {
  formatDate,
  formatReference,
  VAT_RATE,
  type DocumentKind,
  type Order,
} from "@/lib/orders";
import { formatEUR } from "@/lib/cart";

const TITLES: Record<DocumentKind, string> = {
  confirmation: "Order confirmation",
  "delivery-note": "Delivery note",
  invoice: "Invoice",
};

/** Finnish names shown beneath the English, since the filing is done in Finnish. */
const SUBTITLES: Record<DocumentKind, string> = {
  confirmation: "Tilausvahvistus",
  "delivery-note": "Lähetysluettelo",
  invoice: "Lasku",
};

export function OrderDocument({ order, kind }: { order: Order; kind: DocumentKind }) {
  const pricing = kind !== "delivery-note";

  return (
    <article className="doc-sheet">
      <header className="flex items-start justify-between gap-8 border-b-2 border-ink pb-5">
        <div>
          <Wordmark tone="dark" className="h-7 w-auto" />
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            {SELLER.name}
            <br />
            {SELLER.street}, {SELLER.postal}
            <br />
            {SELLER.country}
            <br />
            Business ID {SELLER.businessId} · VAT {SELLER.vatId}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-[24px] font-extrabold leading-none tracking-tight text-ink">
            {TITLES[kind]}
          </h1>
          <p className="mt-1 text-[12px] italic text-muted">{SUBTITLES[kind]}</p>
          <p className="mt-3 text-[13px] font-bold text-ink">{order.number}</p>
          <p className="text-[11px] text-muted">{formatDate(order.placedAt)}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-8">
        <Block title={kind === "delivery-note" ? "Deliver to" : "Bill to"}>
          {BUYER.name}
          <br />
          {BUYER.street}, {BUYER.postal}
          <br />
          {BUYER.country}
          <br />
          Business ID {BUYER.businessId}
          <br />
          Attn. {BUYER.contact}
        </Block>

        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[11.5px]">
          <Row label="Your reference" value={order.buyerReference || "—"} />
          <Row label="Cost centre" value={order.costCentre || "—"} />
          {kind === "invoice" && (
            <>
              <Row label="Payment reference" value={formatReference(order.reference)} strong />
              <Row label="Terms" value={`${order.paymentTermDays} days net`} />
              <Row label="Due date" value={formatDate(order.dueDate)} strong />
            </>
          )}
          {kind === "confirmation" && (
            <>
              <Row label="Delivery" value="Standard parcel · 1–2 working days" />
              <Row label="Payment" value={`Invoice, ${order.paymentTermDays} days net`} />
            </>
          )}
          {kind === "delivery-note" && (
            <>
              <Row label="Order number" value={order.number} />
              <Row label="Packages" value={String(order.lines.reduce((n, l) => n + l.quantity, 0))} />
            </>
          )}
        </dl>
      </section>

      <table className="mt-7 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="border-b border-line-strong text-left text-[10px] uppercase tracking-wide text-muted">
            <th className="pb-2 font-semibold">Part number</th>
            <th className="pb-2 font-semibold">Description</th>
            <th className="pb-2 text-right font-semibold">Qty</th>
            {pricing && <th className="pb-2 text-right font-semibold">Unit</th>}
            {pricing && <th className="pb-2 text-right font-semibold">Total</th>}
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.partNumber} className="border-b border-line">
              <td className="py-2.5 font-mono text-[11px] text-ink-soft">{line.partNumber}</td>
              <td className="py-2.5 font-semibold text-ink">{line.name}</td>
              <td className="py-2.5 text-right text-ink">{line.quantity}</td>
              {pricing && <td className="py-2.5 text-right text-ink">{formatEUR(line.unitPriceEUR)}</td>}
              {pricing && (
                <td className="py-2.5 text-right font-semibold text-ink">{formatEUR(line.lineTotalEUR)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pricing && (
        <div className="mt-5 flex justify-end">
          <dl className="w-[260px] text-[11.5px]">
            <Total label="Subtotal" value={formatEUR(order.subtotalEUR)} />
            <Total label={`VAT ${(VAT_RATE * 100).toFixed(1)}%`} value={formatEUR(order.vatEUR)} />
            <div className="mt-2 flex justify-between border-t-2 border-ink pt-2 text-[15px]">
              <dt className="font-bold text-ink">{kind === "invoice" ? "Amount due" : "Total"}</dt>
              <dd className="font-extrabold text-ink">{formatEUR(order.totalEUR)}</dd>
            </div>
          </dl>
        </div>
      )}

      {kind === "invoice" && (
        <section className="mt-7 rounded-lg border border-line-strong p-4 text-[11.5px]">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted">Payment details</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1.5">
            <Row label="IBAN" value={SELLER.iban} strong />
            <Row label="BIC" value={SELLER.bic} />
            <Row label="Reference" value={formatReference(order.reference)} strong />
            <Row label="Due" value={formatDate(order.dueDate)} />
          </dl>
          <p className="mt-3 text-[10.5px] text-muted">
            Please quote the payment reference exactly as shown. Interest on overdue payments
            follows the Finnish Interest Act.
          </p>
        </section>
      )}

      {kind === "delivery-note" && (
        <p className="mt-7 text-[11px] text-muted">
          Check the contents against this note on arrival. Report shortages or damage within seven
          days, quoting order {order.number}.
        </p>
      )}

      <footer className="mt-auto border-t border-line pt-4 text-[10px] leading-relaxed text-muted">
        {SELLER.name} · {SELLER.street}, {SELLER.postal} · {SELLER.phone} · {SELLER.email} ·
        Business ID {SELLER.businessId}
        <br />
        <span className="italic">
          Prototype document. Generated for a usability session — not a real order and not a valid
          demand for payment.
        </span>
      </footer>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted">{title}</h2>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className="whitespace-nowrap text-muted">{label}</dt>
      <dd className={strong ? "font-bold text-ink" : "text-ink"}>{value}</dd>
    </>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
