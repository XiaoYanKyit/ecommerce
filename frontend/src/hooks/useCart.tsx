import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartApi } from "../services/shop";
import type { Cart } from "../types";
import { useAuth } from "./useAuth";

interface CartApi {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setCart(await cartApi.get());
  }, []);

  useEffect(() => {
    if (!user) {
      setCart(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    cartApi
      .get()
      .then((c) => !cancelled && setCart(c))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addItem = useCallback(async (productId: number, quantity = 1) => {
    setCart(await cartApi.add(productId, quantity));
  }, []);
  const updateItem = useCallback(async (itemId: number, quantity: number) => {
    setCart(await cartApi.update(itemId, quantity));
  }, []);
  const removeItem = useCallback(async (itemId: number) => {
    setCart(await cartApi.remove(itemId));
  }, []);
  const clear = useCallback(async () => {
    setCart(await cartApi.clear());
  }, []);

  const value = useMemo(
    () => ({ cart, loading, itemCount: cart?.item_count ?? 0, refresh, addItem, updateItem, removeItem, clear }),
    [cart, loading, refresh, addItem, updateItem, removeItem, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
