"use client";

/**
 * A single document on its own page, ready to print.
 *
 * It opens in a new tab with the print dialog already up, so "download the invoice"
 * is two actions — click, then Save as PDF — and the result is a real PDF with
 * selectable text that a bookkeeping system can read, rather than a screenshot.
 * The toolbar above the sheet is marked `no-print` and disappears on paper.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { OrderDocument } from "@/components/OrderDocument";
import { DOCUMENT_KINDS, documentState, useOrders, type DocumentKind } from "@/lib/orders";
import { ArrowRightIcon } from "@/components/icons";

export default function OrderDocumentPage() {
  const params = useParams<{ id: string; document: string }>();
  const { byId, hydrated } = useOrders();
  const printed = useRef(false);

  const kind = DOCUMENT_KINDS.includes(params.document as DocumentKind)
    ? (params.document as DocumentKind)
    : null;
  const order = byId(params.id);
  const state = order && kind ? documentState(order, kind) : null;
  const ready = Boolean(order && kind && state?.available);

  useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    // One frame for fonts and layout to settle, or the first page prints unstyled.
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!hydrated) {
    return <p className="p-12 text-center text-[15px] text-muted">Loading the document…</p>;
  }

  if (!order || !kind || !state?.available) {
    return (
      <section className="mx-auto max-w-[620px] px-5 py-20 text-center">
        <h1 className="text-[26px] font-extrabold text-ink">That document is not available</h1>
        <p className="mt-3 text-[15px] text-muted">
          {order && kind
            ? state?.note
            : "The order could not be found — order history is kept in this browser only."}
        </p>
        <Link
          href="/orders"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white hover:bg-brand-600"
        >
          Back to orders
          <ArrowRightIcon width={17} height={17} />
        </Link>
      </section>
    );
  }

  return (
    <div className="doc-screen">
      <div className="no-print mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Link href={`/orders/${order.id}`} className="text-[14px] font-semibold text-brand-600 hover:underline">
          ← Back to order {order.number}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-600"
        >
          Print / Save as PDF
        </button>
      </div>
      <OrderDocument order={order} kind={kind} />
    </div>
  );
}
