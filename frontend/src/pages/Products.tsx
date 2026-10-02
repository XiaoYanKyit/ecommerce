import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../components/Pagination";
import { ProductGrid, ProductGridSkeleton } from "../components/ProductGrid";
import { Button, EmptyState, ErrorState, inputClass, selectClass } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useTitle } from "../hooks/useTitle";
import { catalogApi } from "../services/catalog";

const PAGE_SIZE = 12;

const SORTS = [
  { value: "-created_at", label: "Newest" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export default function Products() {
  useTitle("Shop");
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const minPrice = params.get("min_price") ?? "";
  const maxPrice = params.get("max_price") ?? "";
  const inStock = params.get("in_stock") === "true";
  const onSale = params.get("on_sale") === "true";
  const ordering = params.get("ordering") ?? "-created_at";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const update = (patch: Record<string, string | undefined>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!keepPage) next.delete("page");
    setParams(next);
  };

  const [q, setQ] = useState(search);
  const debouncedQ = useDebounce(q);
  useEffect(() => {
    setQ(search);
  }, [search]);
  useEffect(() => {
    if (debouncedQ.trim() !== search) update({ search: debouncedQ.trim() });
  }, [debouncedQ]);

  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  useEffect(() => {
    setMin(minPrice);
    setMax(maxPrice);
  }, [minPrice, maxPrice]);

  const categories = useAsync(() => catalogApi.categories(), []);
  const products = useAsync(
    () =>
      catalogApi.products({
        search,
        category,
        min_price: minPrice,
        max_price: maxPrice,
        in_stock: inStock,
        on_sale: onSale,
        ordering,
        page,
        page_size: PAGE_SIZE,
      }),
    [params.toString()],
  );

  const hasFilters = Boolean(search || category || minPrice || maxPrice || inStock || onSale);
  const activeCategory = categories.data?.find((c) => c.slug === category);

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    update({ min_price: min.trim(), max_price: max.trim() });
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold ${active ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{activeCategory ? activeCategory.name : "All products"}</h1>
      {activeCategory?.description && <p className="mt-1 text-muted">{activeCategory.description}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside>
          <details className="rounded-lg border border-line bg-white lg:open:block" open>
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold lg:cursor-default">Filters</summary>
            <div className="space-y-5 border-t border-line p-4">
              <div>
                <label htmlFor="filter-search" className="mb-1 block text-sm font-medium">
                  Search
                </label>
                <input id="filter-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, SKU…" className={inputClass} />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Category</legend>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={chip(!category)} onClick={() => update({ category: undefined })}>
                    All
                  </button>
                  {(categories.data ?? []).map((c) => (
                    <button key={c.id} type="button" className={chip(category === c.slug)} onClick={() => update({ category: c.slug })}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <form onSubmit={applyPrice}>
                <p className="mb-1 text-sm font-medium">Price</p>
                <div className="flex items-center gap-2">
                  <input aria-label="Minimum price" inputMode="decimal" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className={inputClass} />
                  <span className="text-muted">–</span>
                  <input aria-label="Maximum price" inputMode="decimal" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className={inputClass} />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="mt-2">
                  Apply
                </Button>
              </form>

              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={inStock} onChange={(e) => update({ in_stock: e.target.checked ? "true" : undefined })} />
                  In stock only
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={onSale} onChange={(e) => update({ on_sale: e.target.checked ? "true" : undefined })} />
                  On sale
                </label>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams())}>
                  Clear all filters
                </Button>
              )}
            </div>
          </details>
        </aside>

        <section aria-busy={products.loading}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {products.data ? `${products.data.count} ${products.data.count === 1 ? "product" : "products"}` : "\u00a0"}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort by
              </label>
              <select id="sort" value={ordering} onChange={(e) => update({ ordering: e.target.value })} className={`${selectClass} w-auto`}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {products.error ? (
            <ErrorState message={products.error} onRetry={products.reload} />
          ) : !products.data ? (
            <ProductGridSkeleton count={PAGE_SIZE} />
          ) : products.data.results.length === 0 ? (
            <EmptyState
              title="No products found"
              text={hasFilters ? "Try removing a filter or searching for something else." : "There are no products yet."}
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className={products.loading ? "opacity-60 transition-opacity" : ""}>
                <ProductGrid products={products.data.results} />
              </div>
              <Pagination page={page} count={products.data.count} pageSize={PAGE_SIZE} onPage={(p) => update({ page: String(p) }, true)} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
