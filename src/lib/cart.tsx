"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { kitBySlug } from "@/data/kits";
import type { Kit } from "@/data/types";

interface CartItem {
  slug: string;
  quantity: number;
}

interface CartLine extends CartItem {
  kit: Kit;
  lineTotal: number;
}

interface CartValue {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Bumps on every add, so the header badge and preview can react. */
  lastAdded: { slug: string; quantity: number; at: number } | null;
  add: (slug: string, quantity: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = "meconet-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<CartValue["lastAdded"]>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // A fresh cart is a perfectly good fallback.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing blocks writes; the in-memory cart still works.
    }
  }, [items, hydrated]);

  const add = useCallback((slug: string, quantity: number) => {
    setItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (existing) {
        return current.map((item) =>
          item.slug === slug ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { slug, quantity }];
    });
    setLastAdded({ slug, quantity, at: Date.now() });
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => item.slug !== slug)
        : current.map((item) => (item.slug === slug ? { ...item, quantity } : item)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const lines = items.flatMap((item) => {
      const kit = kitBySlug(item.slug);
      return kit ? [{ ...item, kit, lineTotal: kit.priceEUR * item.quantity }] : [];
    });
    return {
      items,
      lines,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: lines.reduce((total, line) => total + line.lineTotal, 0),
      lastAdded,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [items, lastAdded, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}

export const formatEUR = (amount: number) =>
  new Intl.NumberFormat("en-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
