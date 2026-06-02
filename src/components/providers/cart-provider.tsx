"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addLine as addLinePure,
  lineCount as lineCountPure,
  removeLine as removeLinePure,
  setLineQty as setLineQtyPure,
  subtotalUsdMinor as subtotalPure,
} from "@/lib/cart-math";

export interface CartLine {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel?: string;
  unitPriceUsdMinor: number;
  imageUrl?: string;
  qty: number;
}

interface Ctx {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalUsdMinor: number;
}

const CartContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "m0:cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => addLinePure(prev, line));
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines((prev) => removeLinePure(prev, variantId));
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) => setLineQtyPure(prev, variantId, qty));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(() => {
    const count = lineCountPure(lines);
    const subtotalUsdMinor = subtotalPure(lines);
    return { lines, add, remove, setQty, clear, count, subtotalUsdMinor };
  }, [lines, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
