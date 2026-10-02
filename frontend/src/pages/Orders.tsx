import { useState } from "react";
import { Link } from "react-router-dom";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { buttonClass, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useTitle } from "../hooks/useTitle";
import { formatDate, money } from "../lib/format";
import { orderApi } from "../services/shop";

const PAGE_SIZE = 12;

export default function Orders() {
  useTitle("My orders");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => orderApi.list(page), [page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">My orders</h1>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : data.results.length === 0 ? (
          <EmptyState
            title="No orders yet"
            text="When you place an order it will show up here."
            action={<Link to="/products" className={buttonClass("primary")}>Start shopping</Link>}
          />
        ) : (
          <>
            <ul className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
              {data.results.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.order_number}`} className="block rounded-lg border border-line bg-white p-4 transition-colors hover:border-ink">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-lg font-bold">{o.order_number}</p>
                      <StatusBadge value={o.status} label={o.status_display} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(o.created_at)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items
                    </p>
                    <p className="mt-2 truncate text-sm">{o.items.map((i) => i.product_name).join(", ")}</p>
                    <p className="mt-2 font-bold">{money(o.total)}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
