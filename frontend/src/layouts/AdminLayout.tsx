import { Link, NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
];

export default function AdminLayout() {
  const item = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${isActive ? "bg-ink text-white" : "text-ink hover:bg-ink/5"}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <p className="font-display text-xl font-extrabold tracking-tight">
            HiroShi <span className="ml-1 rounded-md bg-sale px-2 py-0.5 text-xs font-bold uppercase tracking-wide">admin</span>
          </p>
          <Link to="/" className="text-sm font-semibold text-brand hover:underline">
            View store →
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={item}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
