import { Link } from "react-router-dom";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorState, PageSpinner } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useTitle } from "../../hooks/useTitle";
import { formatDate, money } from "../../lib/format";
import { adminApi } from "../../services/admin";
import type { OrderStatus } from "../../types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const STATUS_ORDER: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function AdminDashboard() {
  useTitle("Dashboard");
  const { data, error, reload } = useAsync(() => adminApi.stats(), []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageSpinner />;

  const maxRevenue = Math.max(...data.sales_last_7_days.map((d) => Number(d.revenue)), 1);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Revenue (paid)" value={money(data.revenue)} hint="Paid, not cancelled" />
        <Stat label="Gross sales" value={money(data.gross_sales)} hint="All orders except cancelled" />
        <Stat label="Orders" value={String(data.total_orders)} hint={`${data.pending_orders} pending`} />
        <Stat label="Products" value={String(data.total_products)} />
        <Stat label="Customers" value={String(data.total_customers)} />
        <Stat label="Low stock" value={String(data.low_stock_products.length)} hint="Products needing a restock" />
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold">Sales, last 7 days</h2>
        <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label="Bar chart of daily sales for the last 7 days">
          {data.sales_last_7_days.map((d) => {
            const height = Math.max((Number(d.revenue) / maxRevenue) * 100, 2);
            const day = new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
            return (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${formatDate(d.date)}: ${money(d.revenue)}, ${d.orders} orders`}>
                <span className="text-xs font-semibold">{Number(d.revenue) > 0 ? money(d.revenue) : ""}</span>
                <div className={`w-full rounded-t-md ${Number(d.revenue) > 0 ? "bg-brand" : "bg-line"}`} style={{ height: `${height}%` }} />
                <span className="text-xs text-muted">{day}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold">Orders by status</h2>
          <ul className="mt-3 space-y-2">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <StatusBadge value={s} />
                <span className="font-semibold tabular-nums">{data.orders_by_status[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold">Low stock</h2>
          {data.low_stock_products.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Everything is well stocked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.low_stock_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-muted">· {p.sku}</span>
                  </span>
                  <span className={`shrink-0 font-semibold ${p.stock === 0 ? "text-danger" : ""}`}>{p.stock === 0 ? "Out" : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-brand hover:underline">
            All orders →
          </Link>
        </div>
        {data.recent_orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Order</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recent_orders.map((o) => (
                  <tr key={o.order_number}>
                    <td className="py-2 pr-4 font-semibold">{o.order_number}</td>
                    <td className="py-2 pr-4">{o.customer}</td>
                    <td className="py-2 pr-4 text-muted">{formatDate(o.created_at)}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge value={o.status} />
                    </td>
                    <td className="py-2 text-right font-semibold">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
