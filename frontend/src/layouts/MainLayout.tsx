import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CartIcon, SearchIcon, UserIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
      <span className="grid size-6 place-items-center rounded-md bg-brand" aria-hidden="true">
        <span className="size-2.5 rounded-sm bg-sale" />
      </span>
      HiroShi
    </Link>
  );
}

function SearchBar({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [q, setQ] = useState(params.get("search") ?? "");
  const inputId = useId();

  useEffect(() => {
    if (location.pathname !== "/products") setQ("");
  }, [location.pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/products?search=${encodeURIComponent(term)}` : "/products");
  };

  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        id={inputId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products"
        className="h-10 w-full rounded-full border border-line bg-canvas pl-10 pr-4 text-sm placeholder:text-muted/70 focus:border-brand focus:bg-white focus:outline-none"
      />
    </form>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5">
          Sign in
        </Link>
        <Link to="/register" className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 sm:block">
          Create account
        </Link>
      </div>
    );
  }

  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-canvas";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5"
      >
        <UserIcon />
        <span className="hidden max-w-24 truncate sm:inline">{user.first_name || "Account"}</span>
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
            <Link role="menuitem" to="/profile" className={item}>
              Profile
            </Link>
            <Link role="menuitem" to="/orders" className={item}>
              My orders
            </Link>
            {user.is_staff && (
              <Link role="menuitem" to="/admin" className={item}>
                Admin
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              className={`${item} border-t border-line text-danger`}
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MainLayout() {
  const { itemCount } = useCart();
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5 ${isActive ? "bg-ink/5" : ""}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Wordmark />
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/products" className={link}>
              Shop
            </NavLink>
            <NavLink to="/categories" className={link}>
              Categories
            </NavLink>
          </nav>
          <SearchBar className="order-last w-full md:order-none md:ml-auto md:max-w-sm md:flex-1" />
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <AccountMenu />
            <Link to="/cart" className="relative rounded-full p-2.5 hover:bg-ink/5" aria-label={`Cart, ${itemCount} items`}>
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-sale px-1 text-xs font-bold">{itemCount}</span>
              )}
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-line px-4 py-1 md:hidden" aria-label="Main">
          <NavLink to="/products" className={link}>
            Shop
          </NavLink>
          <NavLink to="/categories" className={link}>
            Categories
          </NavLink>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

<footer className="border-t border-line bg-white">
  <div className="mx-auto max-w-7xl px-4 py-12">
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Brand */}
      <div>
        <p className="font-display text-xl font-extrabold text-ink">HiroShi</p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
          A modern online shopping experience for discovering products you
          love, with simple ordering and reliable delivery.
        </p>
      </div>

      {/* Shop */}
      <div>
        <h3 className="text-sm font-bold text-ink">Shop</h3>
        <div className="mt-4 flex flex-col gap-2 text-sm text-muted">
          <Link to="/products" className="hover:text-ink">
            All products
          </Link>
          <Link to="/categories" className="hover:text-ink">
            Categories
          </Link>
          <Link to="/cart" className="hover:text-ink">
            Shopping cart
          </Link>
        </div>
      </div>

      {/* Account */}
      <div>
        <h3 className="text-sm font-bold text-ink">Account</h3>
        <div className="mt-4 flex flex-col gap-2 text-sm text-muted">
          <Link to="/profile" className="hover:text-ink">
            My profile
          </Link>
          <Link to="/orders" className="hover:text-ink">
            My orders
          </Link>
        </div>
      </div>

      {/* Support */}
      <div>
        <h3 className="text-sm font-bold text-ink">Customer support</h3>
        <div className="mt-4 flex flex-col gap-2 text-sm text-muted">
          <span>Delivery information</span>
          <span>Returns & refunds</span>
          <span>Contact us</span>
        </div>
      </div>
    </div>

    <div className="mt-10 border-t border-line pt-6">
      <div className="flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} HiroShi. All rights reserved. | Design and Coded By Rio</p>
        <p>Demo store — payments are not connected. Orders are pay-on-delivery.</p>
      </div>
    </div>
  </div>
</footer>
    </div>
  );
}
