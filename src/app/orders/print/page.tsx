"use client";

/**
 * Every available document for a set of orders, stacked one per page.
 *
 * This is the quarter-end job: tick a period in the archive, land here, hit Save as
 * PDF once and get a single file holding the whole lot. Pending documents are skipped
 * rather than printed empty — an invoice that has not been raised is not paperwork,
 * it is a blank page in a bookkeeper's file.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { OrderDocument } from "@/components/OrderDocument";
import { DOCUMENT_KINDS, documentState, useOrders } from "@/lib/orders";

export default function BulkPrintPage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-[15px] text-muted">Loading…</p>}>
      <BulkPrint />
    </Suspense>
  );
}

function BulkPrint() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const { orders, hydrated } = useOrders();
  const printed = useRef(false);

  const chosen = orders.filter((order) => ids.includes(order.id));
  const sheets = chosen.flatMap((order) =>
    DOCUMENT_KINDS.filter((kind) => documentState(order, kind).available).map((kind) => ({
      key: `${order.id}-${kind}`,
      order,
      kind,
    })),
  );

  useEffect(() => {
    if (!hydrated || sheets.length === 0 || printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, [hydrated, sheets.length]);

  if (!hydrated) {
    return <p className="p-12 text-center text-[15px] text-muted">Gathering documents…</p>;
  }

  if (sheets.length === 0) {
    return (
      <section className="mx-auto max-w-[620px] px-5 py-20 text-center">
        <h1 className="text-[26px] font-extrabold text-ink">Nothing to print</h1>
        <p className="mt-3 text-[15px] text-muted">
          None of the selected orders has a document available yet.
        </p>
        <Link
          href="/orders"
          className="mt-7 inline-block rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white hover:bg-brand-600"
        >
          Back to orders
        </Link>
      </section>
    );
  }

  return (
    <div className="doc-screen">
      <div className="no-print mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Link href="/orders" className="text-[14px] font-semibold text-brand-600 hover:underline">
          ← Back to orders
        </Link>
        <p className="text-[13.5px] text-muted">
          {sheets.length} documents from {chosen.length} {chosen.length === 1 ? "order" : "orders"}
        </p>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-600"
        >
          Print / Save as PDF
        </button>
      </div>

      {sheets.map((sheet) => (
        <OrderDocument key={sheet.key} order={sheet.order} kind={sheet.kind} />
      ))}
    </div>
  );
}
