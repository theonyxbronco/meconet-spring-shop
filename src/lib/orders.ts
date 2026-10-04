"use client";

/**
 * Placed orders, kept so that the paperwork outlives the page view.
 *
 * A workshop's reason for wanting documents at all is that someone else — a
 * bookkeeper, an auditor, the person who signs off the project — will ask for them
 * weeks later. A confirmation screen that forgets the order on refresh cannot serve
 * that, so an order is snapshotted the moment it is placed and never recomputed:
 * prices, names and VAT are frozen as they were on the day, not looked back up in
 * the catalogue, where they may since have changed.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

/** Finland's standard VAT rate since September 2024. */
export const VAT_RATE = 0.255;

export interface OrderLine {
  slug: string;
  /** Frozen at purchase: the catalogue is free to rename or reprice afterwards. */
  name: string;
  partNumber: string;
  quantity: number;
  unitPriceEUR: number;
  lineTotalEUR: number;
}

/**
 * The three documents a Finnish B2B order produces, and when each one exists.
 * The invoice genuinely does not exist at checkout — it is raised on dispatch — so
 * the UI shows it as pending rather than offering a download that would be a lie.
 */
export type DocumentKind = "confirmation" | "delivery-note" | "invoice";

export type OrderStatus = "confirmed" | "dispatched";

export interface Order {
  id: string;
  /** Human-facing order number, e.g. "MEC-26-0431". */
  number: string;
  /** Finnish payment reference, check digit and all. Bookkeeping types this. */
  reference: string;
  placedAt: string;
  status: OrderStatus;
  /** The buyer's own PO or work-order number, so they can reconcile the invoice. */
  buyerReference: string;
  /** Which job or cost centre the spend belongs to. */
  costCentre: string;
  /** Where a copy of the invoice goes, usually not the person who ordered. */
  invoiceEmail: string;
  lines: OrderLine[];
  subtotalEUR: number;
  vatEUR: number;
  totalEUR: number;
  /** Net payment terms in days. */
  paymentTermDays: number;
  dueDate: string;
}

const STORAGE_KEY = "meconet-orders";

/**
 * Finnish reference number check digit: weight the digits 7, 3, 1 from the right,
 * then take what is needed to reach the next multiple of ten. Getting this right
 * costs ten lines and is the difference between a document that looks like an
 * invoice and one a participant's accounts team would actually accept.
 */
function referenceCheckDigit(body: string): number {
  const weights = [7, 3, 1];
  const sum = body
    .split("")
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * weights[index % 3], 0);
  return (10 - (sum % 10)) % 10;
}

function buildReference(serial: number): string {
  const body = String(1000 + serial);
  return `${body}${referenceCheckDigit(body)}`;
}

function addDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

export interface DraftOrder {
  lines: Array<{ slug: string; name: string; partNumber: string; quantity: number; unitPriceEUR: number }>;
  buyerReference: string;
  costCentre: string;
  invoiceEmail: string;
  paymentTermDays?: number;
}

export function buildOrder(draft: DraftOrder, serial: number, now = new Date()): Order {
  const lines: OrderLine[] = draft.lines.map((line) => ({
    ...line,
    lineTotalEUR: line.unitPriceEUR * line.quantity,
  }));
  const subtotalEUR = lines.reduce((total, line) => total + line.lineTotalEUR, 0);
  const vatEUR = Math.round(subtotalEUR * VAT_RATE);
  const paymentTermDays = draft.paymentTermDays ?? 14;

  return {
    id: `ord-${now.getTime()}-${serial}`,
    number: `MEC-${String(now.getFullYear()).slice(2)}-${String(serial).padStart(4, "0")}`,
    reference: buildReference(serial),
    placedAt: now.toISOString(),
    status: "confirmed",
    buyerReference: draft.buyerReference,
    costCentre: draft.costCentre,
    invoiceEmail: draft.invoiceEmail,
    lines,
    subtotalEUR,
    vatEUR,
    totalEUR: subtotalEUR + vatEUR,
    paymentTermDays,
    dueDate: addDays(now, paymentTermDays).toISOString(),
  };
}

/**
 * Orders live in localStorage like the cart does, and are read through a hook rather
 * than a provider: every screen that needs them is a leaf, so there is nothing for a
 * context to save. `hydrated` is exposed because the first client render has to match
 * the server's empty list or React will complain about the mismatch.
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {
      // An empty history is a perfectly good fallback.
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Order[]) => {
    setOrders(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing blocks writes; the session still works in memory.
    }
  }, []);

  const place = useCallback(
    (draft: DraftOrder) => {
      // Read straight from storage rather than from state: the checkout places an
      // order in the same tick it mounts the confirmation, and a stale `orders`
      // would hand out a serial that is already taken.
      let existing: Order[] = [];
      try {
        existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      } catch {
        existing = [];
      }
      const order = buildOrder(draft, existing.length + 1);
      persist([order, ...existing]);
      return order;
    },
    [persist],
  );

  /** Marks an order dispatched, which is what brings its later documents into being. */
  const markDispatched = useCallback(
    (id: string) => {
      persist(
        orders.map((order) => (order.id === id ? { ...order, status: "dispatched" as const } : order)),
      );
    },
    [orders, persist],
  );

  const byId = useCallback((id: string) => orders.find((order) => order.id === id), [orders]);

  const years = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => new Date(order.placedAt).getFullYear()))).sort(
        (a, b) => b - a,
      ),
    [orders],
  );

  return { orders, hydrated, place, markDispatched, byId, years };
}

/** Whether a given document exists yet, and what to say when it does not. */
export function documentState(order: Order, kind: DocumentKind): {
  available: boolean;
  label: string;
  note: string;
} {
  if (kind === "confirmation") {
    return { available: true, label: "Order confirmation", note: "Issued when you placed the order" };
  }
  if (kind === "delivery-note") {
    return order.status === "dispatched"
      ? { available: true, label: "Delivery note", note: "Packed with the parcel" }
      : { available: false, label: "Delivery note", note: "Issued when the parcel leaves, in 1–2 working days" };
  }
  return order.status === "dispatched"
    ? { available: true, label: "Invoice", note: `${order.paymentTermDays} days net · due ${formatDate(order.dueDate)}` }
    : {
        available: false,
        label: "Invoice",
        note: `Raised on dispatch · ${order.paymentTermDays} days net`,
      };
}

export const DOCUMENT_KINDS: DocumentKind[] = ["confirmation", "delivery-note", "invoice"];

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Groups the reference the way a Finnish bank statement prints it: 1234 56789. */
export function formatReference(reference: string): string {
  return reference.replace(/\B(?=(\d{5})+(?!\d))/g, " ");
}

/**
 * Order lines as CSV. Unglamorous, and the export a bookkeeper will actually use,
 * because unlike a PDF it imports straight into a ledger.
 */
export function ordersToCsv(orders: Order[]): string {
  const header = [
    "Order number",
    "Date",
    "Your reference",
    "Cost centre",
    "Part number",
    "Description",
    "Quantity",
    "Unit price EUR",
    "Line total EUR",
    "VAT rate",
  ];
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = orders.flatMap((order) =>
    order.lines.map((line) =>
      [
        order.number,
        order.placedAt.slice(0, 10),
        order.buyerReference,
        order.costCentre,
        line.partNumber,
        line.name,
        line.quantity,
        line.unitPriceEUR,
        line.lineTotalEUR,
        `${(VAT_RATE * 100).toFixed(1)}%`,
      ]
        .map(escape)
        .join(","),
    ),
  );
  return [header.join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // The BOM is what makes Excel open a UTF-8 CSV without mangling "Pitäjänmäki".
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
