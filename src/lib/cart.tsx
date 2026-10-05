"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { kitBySlug, kitVariant, type KitVariant } from "@/data/kits";
import type { Kit, KitTier } from "@/data/types";

interface CartItem {
  slug: string;
  /** Basic and Pro are separate products: separate part numbers, separate prices. */
  tier: KitTier;
  quantity: number;
}

interface CartLine extends CartItem {
  /** Identifies the line, since one kit can be in the cart as both builds. */
  key: string;
  kit: Kit;
  variant: KitVariant;
  lineTotal: number;
}

interface CartValue {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Bumps on every add, so the header badge and preview can react. */
  lastAdded: { slug: string; tier: KitTier; quantity: number; at: number } | null;
  add: (slug: string, quantity: number, tier?: KitTier) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const lineKey = (slug: string, tier: KitTier) => `${slug}:${tier}`;

const CartContext = createContext<CartValue | null>(null);
const STORAGE_KEY = "meconet-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<CartValue["lastAdded"]>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // Carts saved before the Pro build existed hold no tier, and are all Basic.
      if (raw) {
        const saved = JSON.parse(raw) as Array<Partial<CartItem>>;
        setItems(
          saved.flatMap((item) =>
            item.slug ? [{ slug: item.slug, tier: item.tier ?? "basic", quantity: item.quantity ?? 1 }] : [],
          ),
        );
      }
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

  const add = useCallback((slug: string, quantity: number, tier: KitTier = "basic") => {
    setItems((current) => {
      const existing = current.find((item) => item.slug === slug && item.tier === tier);
      if (existing) {
        return current.map((item) =>
          item.slug === slug && item.tier === tier ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { slug, tier, quantity }];
    });
    setLastAdded({ slug, tier, quantity, at: Date.now() });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => lineKey(item.slug, item.tier) !== key)
        : current.map((item) =>
            lineKey(item.slug, item.tier) === key ? { ...item, quantity } : item,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((item) => lineKey(item.slug, item.tier) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const lines = items.flatMap((item) => {
      const kit = kitBySlug(item.slug);
      if (!kit) return [];
      const variant = kitVariant(kit, item.tier);
      return [
        {
          ...item,
          key: lineKey(item.slug, item.tier),
          kit,
          variant,
          lineTotal: variant.priceEUR * item.quantity,
        },
      ];
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
