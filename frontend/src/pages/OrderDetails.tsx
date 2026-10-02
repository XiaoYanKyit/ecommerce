import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ProductImage } from "../components/ProductImage";
import { StatusBadge } from "../components/StatusBadge";
import { Alert, Button, buttonClass, ErrorState, PageSpinner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useTitle } from "../hooks/useTitle";
import { useToast } from "../hooks/useToast";
import { messageOf } from "../lib/errors";
import { formatDateTime, money } from "../lib/format";
import { orderApi } from "../services/shop";
import type { Order } from "../types";

export default function OrderDetails() {
  const { orderNumber = "" } = useParams();
  const justPlaced = Boolean((useLocation().state as { placed?: boolean } | null)?.placed);
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => orderApi.get(orderNumber), [orderNumber]);
  const [override, setOverride] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const order = override ?? data;
  useTitle(order ? `Order ${order.order_number}` : "Order");

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState message={error.includes("Not found") ? "We couldn't find that order." : error} onRetry={reload} />
        <p className="mt-6 text-center">
          <Link to="/orders" className={buttonClass("secondary")}>
            All orders
          </Link>
        </p>
      </div>
    );
  }
  if (loading && !order) return <PageSpinner />;
  if (!order) return null;

  const cancel = async () => {
    if (!window.confirm("Cancel this order? Items go back into stock.")) return;
    setCancelling(true);
    try {
      setOverride(await orderApi.cancel(order.order_number));
      toast.success("Order cancelled");
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setCancelling(false);
    }
  };

  const address = [
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
    order.shipping_country,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {justPlaced && (
        <div className="mb-6">
          <Alert kind="success">Thanks! Your order has been placed. We'll let you know when it ships.</Alert>
        </div>
      )}

      <Link to="/orders" className="text-sm font-semibold text-brand hover:underline">
        ← All orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={order.status} label={order.status_display} />
          <StatusBadge value={order.payment_status} label={order.payment_status_display} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-display text-lg font-bold">Items</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-canvas">
                  <ProductImage src={item.image} name={item.product_name} className="size-full" />
                </div>
                <div className="min-w-0 flex-1">
                  {item.product_slug ? (
                    <Link to={`/products/${item.product_slug}`} className="font-semibold hover:text-brand">
                      {item.product_name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{item.product_name}</p>
                  )}
                  <p className="text-sm text-muted">
                    {item.quantity} × {money(item.price)}
                  </p>
                </div>
                <p className="font-bold">{money(item.line_total)}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-display text-lg font-bold">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{Number(order.shipping_cost) === 0 ? "Free" : money(order.shipping_cost)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-lg font-bold">{money(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Payment</dt>
                <dd>{order.payment_method_display}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-display text-lg font-bold">Ship to</h2>
            <address className="mt-3 text-sm not-italic leading-relaxed">
              <p className="font-semibold">{order.shipping_full_name}</p>
              {address.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {order.shipping_phone && <p className="mt-2 text-muted">{order.shipping_phone}</p>}
              <p className="text-muted">{order.shipping_email}</p>
            </address>
            {order.notes && <p className="mt-3 border-t border-line pt-3 text-sm text-muted">Note: {order.notes}</p>}
          </section>

          {order.status === "pending" && (
            <Button variant="secondary" className="w-full" loading={cancelling} onClick={cancel}>
              Cancel order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
