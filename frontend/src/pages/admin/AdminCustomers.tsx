import { useEffect, useState } from "react";
import { Pagination } from "../../components/Pagination";
import { StatusBadge } from "../../components/StatusBadge";
import { Button, EmptyState, ErrorState, inputClass, PageSpinner } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { useTitle } from "../../hooks/useTitle";
import { useToast } from "../../hooks/useToast";
import { messageOf } from "../../lib/errors";
import { formatDate, money } from "../../lib/format";
import { adminApi } from "../../services/admin";
import type { Customer } from "../../types";

const PAGE_SIZE = 12;

export default function AdminCustomers() {
  useTitle("Customers · Admin");
  const toast = useToast();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const { data, error, loading, reload } = useAsync(
    () => adminApi.customers({ search: debounced.trim(), page }),
    [debounced, page],
  );

  const toggle = async (c: Customer) => {
    const action = c.is_active ? "Deactivate" : "Reactivate";
    if (c.is_active && !window.confirm(`${action} ${c.email}? They won't be able to sign in.`)) return;
    setBusyId(c.id);
    try {
      await adminApi.updateCustomer(c.id, { is_active: !c.is_active });
      toast.success(`${c.email} ${c.is_active ? "deactivated" : "reactivated"}`);
      reload();
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Customers</h1>

      <div>
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input id="customer-search" type="search" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} max-w-sm`} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <PageSpinner />
      ) : data.results.length === 0 ? (
        <EmptyState title="No customers found" text={debounced ? "Try a different search." : "Customers appear here once they register."} />
      ) : (
        <>
          <div className={`overflow-x-auto rounded-lg border border-line bg-white ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Total spent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.results.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(c.date_joined)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(c.total_spent)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={c.is_active ? "paid" : "refunded"} label={c.is_active ? "Active" : "Deactivated"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" loading={busyId === c.id} onClick={() => toggle(c)}>
                        {c.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
