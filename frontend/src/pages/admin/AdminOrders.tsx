import { Fragment, useEffect, useState } from "react";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState, ErrorState, inputClass, PageSpinner, selectClass } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useTitle } from "../../hooks/useTitle";
import { useToast } from "../../hooks/useToast";
import { messageOf } from "../../lib/errors";
import { formatDateTime, money } from "../../lib/format";
import { adminApi } from "../../services/admin";
import type { Order, OrderStatus, PaymentStatus } from "../../types";

const PAGE_SIZE = 12;
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENTS: PaymentStatus[] = ["unpaid", "paid", "failed", "refunded"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminOrders() {
  useTitle("Orders · Admin");
  const toast = useToast();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [updated, setUpdated] = useState<Record<number, Order>>({});

  useEffect(() => {
    setPage(1);
  }, [debounced, status, payment]);

  const { data, error, loading, reload } = useAsync(
    () => adminApi.orders({ search: debounced.trim(), status, payment_status: payment, page }),
    [debounced, status, payment, page],
  );

  const change = async (order: Order, patch: { status?: OrderStatus; payment_status?: PaymentStatus }) => {
    setSavingId(order.id);
    try {
      const saved = await adminApi.updateOrder(order.order_number, patch);
      setUpdated((u) => ({ ...u, [saved.id]: saved }));
      toast.success(`${saved.order_number} updated`);
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input id="order-search" type="search" placeholder="Order #, name or email" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} w-64`} />
        </div>
        <div>
          <label htmlFor="order-status" className="sr-only">
            Order status
          </label>
          <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-auto`}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="order-payment" className="sr-only">
            Payment status
          </label>
          <select id="order-payment" value={payment} onChange={(e) => setPayment(e.target.value)} className={`${selectClass} w-auto`}>
            <option value="">All payments</option>
            {PAYMENTS.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <PageSpinner />
      ) : data.results.length === 0 ? (
        <EmptyState title="No orders found" text="Try changing the filters." />
      ) : (
        <>
          <div className={`overflow-x-auto rounded-lg border border-line bg-white ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.results.map((base) => {
                  const o = updated[base.id] ?? base;
                  const open = openId === o.id;
                  return (
                    <Fragment key={o.id}>
                      <tr className="cursor-pointer hover:bg-canvas/60" onClick={() => setOpenId(open ? null : o.id)}>
                        <td className="px-4 py-3">
                          <button type="button" aria-expanded={open} className="font-semibold text-brand hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : o.id); }}>
                            {o.order_number}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p>{o.shipping_full_name}</p>
                          <p className="text-xs text-muted">{o.customer_email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDateTime(o.created_at)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge value={o.status} label={o.status_display} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={o.payment_status} label={o.payment_status_display} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{money(o.total)}</td>
                      </tr>
                      {open && (
                        <tr className="bg-canvas/50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-6 md:grid-cols-3">
                              <div className="md:col-span-2">
                                <h3 className="mb-2 text-sm font-semibold">Items</h3>
                                <ul className="space-y-1 text-sm">
                                  {o.items.map((i) => (
                                    <li key={i.id} className="flex justify-between gap-3">
                                      <span>
                                        {i.quantity} × {i.product_name} <span className="text-muted">({i.product_sku})</span>
                                      </span>
                                      <span className="font-medium">{money(i.line_total)}</span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-3 text-sm text-muted">
                                  Ship to {o.shipping_full_name}, {o.shipping_address_line1}
                                  {o.shipping_address_line2 ? `, ${o.shipping_address_line2}` : ""}, {o.shipping_city}, {o.shipping_postal_code}, {o.shipping_country}
                                  {o.shipping_phone ? ` · ${o.shipping_phone}` : ""}
                                </p>
                                {o.notes && <p className="mt-1 text-sm text-muted">Note: {o.notes}</p>}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label htmlFor={`status-${o.id}`} className="mb-1 block text-sm font-medium">
                                    Order status
                                  </label>
                                  <select
                                    id={`status-${o.id}`}
                                    value={o.status}
                                    disabled={savingId === o.id || o.status === "cancelled"}
                                    onChange={(e) => change(o, { status: e.target.value as OrderStatus })}
                                    className={selectClass}
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {cap(s)}
                                      </option>
                                    ))}
                                  </select>
                                  {o.status === "cancelled" && <p className="mt-1 text-xs text-muted">Cancelled orders can't be reopened.</p>}
                                </div>
                                <div>
                                  <label htmlFor={`payment-${o.id}`} className="mb-1 block text-sm font-medium">
                                    Payment status
                                  </label>
                                  <select
                                    id={`payment-${o.id}`}
                                    value={o.payment_status}
                                    disabled={savingId === o.id}
                                    onChange={(e) => change(o, { payment_status: e.target.value as PaymentStatus })}
                                    className={selectClass}
                                  >
                                    {PAYMENTS.map((s) => (
                                      <option key={s} value={s}>
                                        {cap(s)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {o.status !== "cancelled" && <p className="text-xs text-muted">Choosing "Cancelled" returns the items to stock.</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
