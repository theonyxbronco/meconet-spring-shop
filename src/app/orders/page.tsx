"use client";

/**
 * My orders & documents — the archive.
 *
 * Built around the job rather than around the order: at quarter end somebody has to
 * produce every document from a period, and doing that one order at a time through a
 * confirmation email is the thing that makes suppliers painful to buy from. Hence the
 * year filter, the multi-select, the one-action bundle print and the CSV.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatEUR } from "@/lib/cart";
import {
  DOCUMENT_KINDS,
  documentState,
  downloadCsv,
  formatDate,
  ordersToCsv,
  useOrders,
  type Order,
} from "@/lib/orders";
import { DownloadIcon, SearchIcon } from "@/components/icons";

type StatusFilter = "all" | "confirmed" | "dispatched";

export default function OrdersPage() {
  const { orders, hydrated, years } = useOrders();
  const [year, setYear] = useState<number | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (year !== "all" && new Date(order.placedAt).getFullYear() !== year) return false;
      if (status !== "all" && order.status !== status) return false;
      if (!needle) return true;
      return (
        order.number.toLowerCase().includes(needle) ||
        order.buyerReference.toLowerCase().includes(needle) ||
        order.costCentre.toLowerCase().includes(needle) ||
        order.lines.some((line) => line.name.toLowerCase().includes(needle))
      );
    });
  }, [orders, year, status, query]);

  // Selection follows the filter: tick everything, narrow the year, and the hidden
  // orders should not quietly end up in the export.
  const selectedVisible = visible.filter((order) => selected.includes(order.id));
  const allShown = visible.length > 0 && selectedVisible.length === visible.length;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  if (!hydrated) {
    return <p className="mx-auto max-w-[1100px] px-5 py-20 text-center text-[15px] text-muted">Loading…</p>;
  }

  return (
    <section className="mx-auto max-w-[1100px] px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex gap-2 text-[13.5px] text-muted">
        <Link href="/" className="hover:text-brand-600">
          Frontpage
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-brand-600">My orders &amp; documents</span>
      </nav>

      <h1 className="text-[36px] font-extrabold tracking-tight text-ink">My orders &amp; documents</h1>
      <p className="mt-3 max-w-[640px] text-[15.5px] text-ink-soft">
        Every order with its confirmation, delivery note and invoice. Select a period and take the
        whole lot in one go.
      </p>

      {orders.length === 0 ? (
        <p className="mt-10 rounded-card border border-line bg-surface p-12 text-center text-[16px] text-muted">
          No orders yet.{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            Find an assortment
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="relative flex-1 min-w-[220px]">
              <span className="sr-only">Search orders</span>
              <SearchIcon
                width={18}
                height={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Order number, your reference, cost centre or kit"
                className="h-11 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-[14.5px] text-ink outline-none placeholder:text-muted focus:border-brand-400"
              />
            </label>

            <Select
              label="Year"
              value={String(year)}
              onChange={(value) => setYear(value === "all" ? "all" : Number(value))}
              options={[{ value: "all", label: "All years" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as StatusFilter)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "confirmed", label: "Confirmed" },
                { value: "dispatched", label: "Dispatched" },
              ]}
            />
          </div>

          {/*
           * The bulk bar only appears once something is ticked, so the common case —
           * "open the order I just placed" — is not buried under batch tooling.
           */}
          {selectedVisible.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-400 bg-brand-50 p-3.5">
              <span className="text-[14px] font-semibold text-ink">
                {selectedVisible.length} selected
              </span>
              <Link
                href={`/orders/print?ids=${selectedVisible.map((order) => order.id).join(",")}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-600"
              >
                <DownloadIcon width={16} height={16} />
                Documents as one PDF
              </Link>
              <button
                onClick={() =>
                  downloadCsv(
                    `meconet-orders-${year === "all" ? "all" : year}.csv`,
                    ordersToCsv(selectedVisible),
                  )
                }
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
              >
                <DownloadIcon width={16} height={16} />
                Lines as CSV
              </button>
              <button
                onClick={() => setSelected([])}
                className="ml-auto text-[13.5px] font-semibold text-brand-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="w-full min-w-[820px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                  <th className="w-10 py-3 pl-5">
                    <input
                      type="checkbox"
                      checked={allShown}
                      onChange={() =>
                        setSelected(allShown ? [] : visible.map((order) => order.id))
                      }
                      aria-label="Select all shown orders"
                      className="h-4 w-4 accent-[#1f85f0]"
                    />
                  </th>
                  <th className="py-3 font-semibold">Order</th>
                  <th className="py-3 font-semibold">Your reference</th>
                  <th className="py-3 font-semibold">Items</th>
                  <th className="py-3 pr-6 text-right font-semibold">Total</th>
                  <th className="py-3 font-semibold">Documents</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <Row
                    key={order.id}
                    order={order}
                    checked={selected.includes(order.id)}
                    onToggle={() => toggle(order.id)}
                  />
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="p-10 text-center text-[15px] text-muted">
                No orders match those filters.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Row({
  order,
  checked,
  onToggle,
}: {
  order: Order;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-page">
      <td className="py-4 pl-5 align-top">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select order ${order.number}`}
          className="h-4 w-4 accent-[#1f85f0]"
        />
      </td>
      <td className="py-4 align-top">
        <Link href={`/orders/${order.id}`} className="font-bold text-brand-600 hover:underline">
          {order.number}
        </Link>
        <span className="block text-[12.5px] text-muted">{formatDate(order.placedAt)}</span>
      </td>
      <td className="py-4 align-top">
        <span className="block text-ink">{order.buyerReference || "—"}</span>
        <span className="block text-[12.5px] text-muted">{order.costCentre || ""}</span>
      </td>
      <td className="py-4 align-top text-ink-soft">
        {order.lines.map((line) => (
          <span key={line.partNumber} className="block">
            {line.quantity} × {line.name}
          </span>
        ))}
      </td>
      <td className="py-4 pr-6 text-right align-top font-semibold text-ink">{formatEUR(order.totalEUR)}</td>
      <td className="py-4 pr-5 align-top">
        <span className="flex flex-wrap gap-1.5">
          {DOCUMENT_KINDS.map((kind) => {
            const state = documentState(order, kind);
            const short =
              kind === "confirmation" ? "Confirmation" : kind === "delivery-note" ? "Delivery" : "Invoice";
            return state.available ? (
              <Link
                key={kind}
                href={`/orders/${order.id}/${kind}`}
                target="_blank"
                className="rounded-full border border-line-strong px-3 py-1 text-[12.5px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
              >
                {short}
              </Link>
            ) : (
              <span
                key={kind}
                title={state.note}
                className="rounded-full border border-dashed border-line-strong px-3 py-1 text-[12.5px] text-muted"
              >
                {short} · pending
              </span>
            );
          })}
        </span>
      </td>
    </tr>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[14.5px] font-semibold text-ink outline-none focus:border-brand-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
