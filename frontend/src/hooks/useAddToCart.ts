import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { messageOf } from "../lib/errors";
import type { Product } from "../types";
import { useAuth } from "./useAuth";
import { useCart } from "./useCart";
import { useToast } from "./useToast";

export function useAddToCart() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const add = useCallback(
    async (product: Product, quantity = 1) => {
      if (!user) {
        navigate("/login", {
          state: { from: location.pathname + location.search, message: "Sign in to add items to your cart." },
        });
        return false;
      }
      setBusyId(product.id);
      try {
        await addItem(product.id, quantity);
        toast.success(`${product.name} added to your cart`);
        return true;
      } catch (e) {
        toast.error(messageOf(e));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [user, addItem, navigate, location, toast],
  );

  return { add, busyId };
}
