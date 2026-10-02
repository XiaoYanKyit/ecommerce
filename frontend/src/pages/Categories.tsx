import { Link } from "react-router-dom";
import { EmptyState, ErrorState, Skeleton } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useTitle } from "../hooks/useTitle";
import { catalogApi } from "../services/catalog";

export default function Categories() {
  useTitle("Categories");
  const { data, error, loading, reload } = useAsync(() => catalogApi.categories(), []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Categories</h1>
      <p className="mt-1 text-muted">Pick a department to start browsing.</p>

      <div className="mt-8">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : data && data.length === 0 ? (
          <EmptyState title="No categories yet" text="Categories will appear here once they're added." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/products?category=${c.slug}`}
                  className="group flex h-full min-h-40 flex-col justify-between rounded-lg border border-line bg-white p-6 transition-colors hover:border-ink"
                >
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight group-hover:text-brand">{c.name}</h2>
                    {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                  </div>
                  <p className="mt-6 text-sm font-semibold">
                    {c.product_count ?? 0} {c.product_count === 1 ? "product" : "products"} →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
