"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderRecord } from "@/components/OrderRecord";
import { useOrders } from "@/lib/orders";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const { byId, hydrated, markDispatched } = useOrders();
  const order = byId(params.id);

  if (!hydrated) {
    return <p className="mx-auto max-w-[900px] px-5 py-20 text-center text-[15px] text-muted">Loading…</p>;
  }

  if (!order) {
    return (
      <section className="mx-auto max-w-[620px] px-5 py-20 text-center">
        <h1 className="text-[26px] font-extrabold text-ink">Order not found</h1>
        <p className="mt-3 text-[15px] text-muted">
          Order history for this prototype is kept in this browser, so it does not follow you to
          another device.
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
    <section className="mx-auto max-w-[900px] px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex gap-2 text-[13.5px] text-muted">
        <Link href="/" className="hover:text-brand-600">
          Frontpage
        </Link>
        <span aria-hidden>/</span>
        <Link href="/orders" className="hover:text-brand-600">
          Orders &amp; documents
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-brand-600">{order.number}</span>
      </nav>

      <h1 className="mb-7 text-[34px] font-extrabold tracking-tight text-ink">Order {order.number}</h1>

      <OrderRecord order={order} />

      {/*
       * Dispatch is what brings the delivery note and the invoice into existence. In a
       * real shop that happens in the warehouse; here it needs a button, or a session
       * could never see the documents that matter most to the people being tested.
       */}
      {order.status === "confirmed" && (
        <div className="mt-6 rounded-card border border-dashed border-line-strong bg-brand-50/40 p-5">
          <p className="text-[13.5px] text-ink-soft">
            <strong className="font-bold text-ink">Moderator shortcut.</strong> The delivery note and
            invoice are raised when the parcel ships. Simulate that to see them.
          </p>
          <button
            onClick={() => markDispatched(order.id)}
            className="mt-3 rounded-full border border-line-strong bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            Mark as dispatched
          </button>
        </div>
      )}
    </section>
  );
}
