import { useEffect, useState } from "react";
import { ProductFormModal } from "../../components/admin/ProductFormModal";
import { Pagination } from "../../components/Pagination";
import { ProductImage } from "../../components/ProductImage";
import { StatusBadge } from "../../components/StatusBadge";
import { Button, EmptyState, ErrorState, inputClass, PageSpinner } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useTitle } from "../../hooks/useTitle";
import { useToast } from "../../hooks/useToast";
import { messageOf } from "../../lib/errors";
import { money } from "../../lib/format";
import { adminApi } from "../../services/admin";
import { catalogApi } from "../../services/catalog";
import type { Product } from "../../types";

const PAGE_SIZE = 12;

export default function AdminProducts() {
  useTitle("Products · Admin");
  const toast = useToast();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const { data, error, loading, reload } = useAsync(
    () => catalogApi.products({ search: debounced.trim(), page, page_size: PAGE_SIZE, include_inactive: true }),
    [debounced, page],
  );

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? Past orders keep their record of it.`)) return;
    try {
      await adminApi.deleteProduct(p.slug);
      toast.success("Product deleted");
      if (data && data.results.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Products</h1>
        <Button onClick={() => setEditing("new")}>New product</Button>
      </div>

      <div>
        <label htmlFor="admin-product-search" className="sr-only">
          Search products
        </label>
        <input id="admin-product-search" type="search" placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} max-w-sm`} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <PageSpinner />
      ) : data.results.length === 0 ? (
        <EmptyState title="No products found" text={debounced ? "Try a different search." : "Create your first product to get started."} />
      ) : (
        <>
          <div className={`overflow-x-auto rounded-lg border border-line bg-white ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.results.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md bg-canvas">
                          <ProductImage src={p.image} name={p.name} className="size-full text-sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="text-xs text-muted">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.category?.name ?? <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{money(p.current_price)}</span>
                      {p.on_sale && <span className="ml-1 text-xs text-muted line-through">{money(p.price)}</span>}
                    </td>
                    <td className={`px-4 py-3 font-semibold tabular-nums ${p.stock === 0 ? "text-danger" : ""}`}>{p.stock}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={p.is_active ? "paid" : "refunded"} label={p.is_active ? "Active" : "Hidden"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(p)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
