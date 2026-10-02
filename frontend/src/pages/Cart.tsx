import { useState } from "react";
import { Link } from "react-router-dom";
import { ProductImage } from "../components/ProductImage";
import { QuantityStepper } from "../components/QuantityStepper";
import { Button, buttonClass, EmptyState, PageSpinner } from "../components/ui";
import { useCart } from "../hooks/useCart";
import { useTitle } from "../hooks/useTitle";
import { useToast } from "../hooks/useToast";
import { messageOf } from "../lib/errors";
import { money } from "../lib/format";

export default function Cart() {
  useTitle("Your cart");
  const { cart, loading, updateItem, removeItem, clear } = useCart();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !cart) return <PageSpinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          text="Find something you like and it will show up here."
          action={<Link to="/products" className={buttonClass("primary")}>Start shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your cart</h1>
        <button type="button" className="text-sm font-semibold text-muted hover:text-danger" onClick={() => run(0, clear)}>
          Empty cart
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {cart.items.map((item) => {
            const p = item.product;
            const busy = busyId === item.id;
            return (
              <li key={item.id} className={`flex gap-4 p-4 ${busy ? "opacity-60" : ""}`}>
                <Link to={`/products/${p.slug}`} className="size-24 shrink-0 overflow-hidden rounded-md bg-canvas">
                  <ProductImage src={p.image} name={p.name} className="size-full" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/products/${p.slug}`} className="font-semibold hover:text-brand">
                        {p.name}
                      </Link>
                      <p className="text-sm text-muted">{money(p.current_price)} each</p>
                    </div>
                    <p className="font-bold">{money(item.line_total)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <QuantityStepper
                      value={item.quantity}
                      max={Math.min(p.stock, 99)}
                      disabled={busy}
                      onChange={(q) => run(item.id, () => updateItem(item.id, q))}
                    />
                    <button type="button" disabled={busy} className="text-sm font-semibold text-muted hover:text-danger" onClick={() => run(item.id, () => removeItem(item.id))}>
                      Remove
                    </button>
                  </div>
                  {item.quantity >= p.stock && <p className="text-xs text-muted">That's all we have in stock.</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal ({cart.item_count} items)</dt>
              <dd className="font-medium">{money(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="font-medium">{Number(cart.shipping_cost) === 0 ? "Free" : money(cart.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-bold">{money(cart.total)}</dd>
            </div>
          </dl>
          <Link to="/checkout" className={buttonClass("primary", "lg", "mt-5 w-full")}>
            Checkout
          </Link>
          <Link to="/products" className={buttonClass("ghost", "md", "mt-2 w-full")}>
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
