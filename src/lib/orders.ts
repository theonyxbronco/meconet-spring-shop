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
import { BUYER_ADDRESS, BUYER_BILLING } from "@/data/seller";

/** Finland's standard VAT rate since September 2024. */
export const VAT_RATE = 0.255;

/**
 * A postal address as the checkout collects it.
 *
 * Postal code and city are separate fields rather than one "02770 Espoo" string:
 * the moment the address became editable, a single field invited participants to
 * type the two halves in either order, and the documents print them back in a fixed
 * Finnish layout.
 */
export interface Address {
  company: string;
  contact: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

/** The countries Meconet ships springs to from Vantaa, for the country select. */
export const DELIVERY_COUNTRIES = ["Finland", "Sweden", "Norway", "Denmark", "Estonia", "Germany"];

export interface DeliveryOption {
  id: string;
  label: string;
  detail: string;
  /** Whole euros, like every other price in the prototype. */
  priceEUR: number;
}

/**
 * Three ways to get the box, because a checkout with one shipping row is not a
 * decision and tells a usability session nothing. Collection is here because a
 * workshop inside the ring road genuinely does drive to Vantaa for a part it needs
 * the same afternoon.
 */
export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: "standard",
    label: "Standard parcel",
    detail: "1–2 working days · Posti",
    priceEUR: 0,
  },
  {
    id: "express",
    label: "Express parcel",
    detail: "Next working day if ordered before 14:00",
    priceEUR: 19,
  },
  {
    id: "pickup",
    label: "Collect from Vantaa",
    detail: "Pavintie 8 · ready within 2 hours, weekdays 8–16",
    priceEUR: 0,
  },
];

export function deliveryOptionById(id: string): DeliveryOption {
  return DELIVERY_OPTIONS.find((option) => option.id === id) ?? DELIVERY_OPTIONS[0];
}

/** Net terms Meconet offers an account customer. */
export const PAYMENT_TERM_OPTIONS = [14, 21, 30, 45];

export type PaymentMethod = "invoice" | "card";

/** Who the invoice is addressed to, which is often not who placed the order. */
export interface BillingDetails {
  company: string;
  businessId: string;
}

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
  /** Frozen at purchase, like the prices: where this particular box was sent. */
  deliveryAddress: Address;
  /** The chosen option snapshotted, so a later change to the price list cannot rewrite history. */
  delivery: DeliveryOption;
  paymentMethod: PaymentMethod;
  billing: BillingDetails;
  lines: OrderLine[];
  subtotalEUR: number;
  /** Delivery charge, VAT-exclusive like the lines. */
  shippingEUR: number;
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
  deliveryAddress: Address;
  delivery: DeliveryOption;
  paymentMethod: PaymentMethod;
  billing: BillingDetails;
  paymentTermDays?: number;
}

export function buildOrder(draft: DraftOrder, serial: number, now = new Date()): Order {
  const lines: OrderLine[] = draft.lines.map((line) => ({
    ...line,
    lineTotalEUR: line.unitPriceEUR * line.quantity,
  }));
  const subtotalEUR = lines.reduce((total, line) => total + line.lineTotalEUR, 0);
  const shippingEUR = draft.delivery.priceEUR;
  // Delivery is taxed at the same rate as the goods in Finland, so VAT is charged on
  // the carriage as well — getting this wrong is the sort of thing a participant's
  // bookkeeper spots in a second.
  const vatEUR = Math.round((subtotalEUR + shippingEUR) * VAT_RATE);
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
    deliveryAddress: draft.deliveryAddress,
    delivery: draft.delivery,
    paymentMethod: draft.paymentMethod,
    billing: draft.billing,
    lines,
    subtotalEUR,
    shippingEUR,
    vatEUR,
    totalEUR: subtotalEUR + shippingEUR + vatEUR,
    paymentTermDays,
    dueDate: addDays(now, paymentTermDays).toISOString(),
  };
}

/**
 * Fills in the fields an order predates.
 *
 * Orders are kept in localStorage, so a tester who placed one before the checkout
 * collected an address still has it in their browser. Rather than let those orders
 * render a document with holes in it, they are read back as having taken the account
 * address and the standard delivery — which is exactly what they did.
 */
function normalizeOrder(order: Order): Order {
  const delivery = order.delivery ?? DELIVERY_OPTIONS[0];
  const shippingEUR = order.shippingEUR ?? delivery.priceEUR;

  return {
    ...order,
    deliveryAddress: order.deliveryAddress ?? BUYER_ADDRESS,
    delivery,
    paymentMethod: order.paymentMethod ?? "invoice",
    billing: order.billing ?? BUYER_BILLING,
    shippingEUR,
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
      if (raw) setOrders((JSON.parse(raw) as Order[]).map(normalizeOrder));
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
        existing = (JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Order[]).map(
          normalizeOrder,
        );
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
      : {
          available: false,
          label: "Delivery note",
          note:
            order.delivery.id === "pickup"
              ? "Issued when your order is picked, ready within 2 hours"
              : `Issued when the parcel leaves · ${order.delivery.detail}`,
        };
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
