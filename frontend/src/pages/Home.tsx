import { Link } from "react-router-dom";
import { ProductGrid, ProductGridSkeleton } from "../components/ProductGrid";
import { ProductImage } from "../components/ProductImage";
import { buttonClass, ErrorState, Skeleton } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useTitle } from "../hooks/useTitle";
import { money } from "../lib/format";
import { catalogApi } from "../services/catalog";

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-brand hover:underline">
        View all →
      </Link>
    </div>
  );
}

export default function Home() {
  useTitle("");
  const newest = useAsync(() => catalogApi.products({ ordering: "-created_at", page_size: 8 }), []);
  const sale = useAsync(() => catalogApi.products({ on_sale: true, page_size: 4 }), []);
  const categories = useAsync(() => catalogApi.categories(), []);

  const heroSource = sale.data?.results.length ? sale.data.results : (newest.data?.results ?? []);
  const hero = heroSource.slice(0, 3);
  const heroLoading = sale.loading && newest.loading;

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
              Everyday things, well&nbsp;chosen.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Electronics, clothing, home, books and outdoor gear. Free shipping on larger orders, and you pay when it arrives.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className={buttonClass("primary", "lg")}>
                Shop all products
              </Link>
              <Link to="/categories" className={buttonClass("secondary", "lg")}>
                Browse categories
              </Link>
            </div>
          </div>

          {heroLoading ? (
            <div className="grid grid-cols-2 gap-3" aria-hidden="true">
              <Skeleton className="row-span-2 min-h-72" />
              <Skeleton className="aspect-square" />
              <Skeleton className="aspect-square" />
            </div>
          ) : (
            hero.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {hero.map((p, i) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.slug}`}
                    className={`group relative overflow-hidden rounded-lg bg-canvas ${i === 0 ? "row-span-2" : "aspect-square"}`}
                  >
                    <ProductImage src={p.image} name={p.name} className="size-full min-h-40 transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="truncate font-semibold">{p.name}</span>
                      <span className="shrink-0 font-bold">{money(p.current_price)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        <section aria-labelledby="home-categories">
          <h2 id="home-categories" className="sr-only">
            Categories
          </h2>
          {categories.error ? (
            <ErrorState message={categories.error} onRetry={categories.reload} />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {(categories.data ?? []).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/products?category=${c.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-ink"
                  >
                    {c.name}
                    <span className="text-xs font-medium text-muted">{c.product_count ?? 0}</span>
                  </Link>
                </li>
              ))}
              {categories.loading && !categories.data && <Skeleton className="h-10 w-64 rounded-full" />}
            </ul>
          )}
        </section>

        {(sale.loading || (sale.data && sale.data.results.length > 0) || sale.error) && (
          <section>
            <SectionHeader title="On sale" to="/products?on_sale=true" />
            {sale.error ? (
              <ErrorState message={sale.error} onRetry={sale.reload} />
            ) : sale.data ? (
              <ProductGrid products={sale.data.results} />
            ) : (
              <ProductGridSkeleton count={4} />
            )}
          </section>
        )}

        <section>
          <SectionHeader title="New arrivals" to="/products?ordering=-created_at" />
          {newest.error ? (
            <ErrorState message={newest.error} onRetry={newest.reload} />
          ) : newest.data ? (
            <ProductGrid products={newest.data.results} />
          ) : (
            <ProductGridSkeleton />
          )}
        </section>
      </div>
    </>
  );
}
