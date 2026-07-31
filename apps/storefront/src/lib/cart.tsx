"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  name: string;
  sku: string;
  priceCents: number;
  qty: number;
  available: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "zl_storefront_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    return {
      items,
      add: (item, qty = 1) => {
        setItems((prev) => {
          const existing = prev.find((p) => p.productId === item.productId);
          if (existing) {
            return prev.map((p) =>
              p.productId === item.productId
                ? { ...p, qty: Math.min(p.qty + qty, item.available) }
                : p
            );
          }
          return [...prev, { ...item, qty: Math.min(qty, item.available) }];
        });
      },
      setQty: (productId, qty) => {
        setItems((prev) =>
          prev
            .map((p) =>
              p.productId === productId
                ? { ...p, qty: Math.max(0, Math.min(qty, p.available)) }
                : p
            )
            .filter((p) => p.qty > 0)
        );
      },
      remove: (productId) =>
        setItems((prev) => prev.filter((p) => p.productId !== productId)),
      clear: () => setItems([]),
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.priceCents, 0),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart outside provider");
  return ctx;
}
