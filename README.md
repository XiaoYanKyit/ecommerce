# E-commerce (Django REST + React)

Status: **backend (models + REST API) and frontend (React + Vite + TypeScript + Tailwind)**.

## Quick start (two terminals)

```bash

cd backend && source .venv/bin/activate && python manage.py runserver


cd frontend
npm install
cp .env.example .env  
npm run dev
```

Full backend setup is below; frontend notes are at the end.

## Install and run (macOS / Linux)

```bash
cd ecommerce/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

python manage.py makemigrations users products orders
python manage.py migrate
python manage.py seed_products
python manage.py runserver
```

Windows (PowerShell): activate with `.venv\Scripts\Activate.ps1` and copy with `copy .env.example .env`.

> Run `makemigrations` once, **before the first `migrate`**: the project uses a custom user model (email login), and its migration must exist before Django creates the database tables.

Seed accounts (development only):

| Role     | Email                  | Password        |
|----------|------------------------|-----------------|
| Admin    | admin@example.com      | admin12345      |
| Customer | customer@example.com   | customer12345   |

Django's own admin is at http://127.0.0.1:8000/django-admin/ (same admin account).

## Verify step 1 — models

```bash
python manage.py check
python manage.py test
```

`check` should report "no issues". `test` runs 25 tests covering auth, product filters/permissions,
cart, checkout (stock, price snapshot, shipping), cancellations and the admin stats.

## Verify step 2 — API (server running on :8000)

```bash
curl http://127.0.0.1:8000/api/health/
curl "http://127.0.0.1:8000/api/products/?search=coffee"
curl "http://127.0.0.1:8000/api/products/?category=books&ordering=price"
curl http://127.0.0.1:8000/api/categories/

curl -X POST http://127.0.0.1:8000/api/auth/login/ -H "Content-Type: application/json" \
     -d '{"email":"customer@example.com","password":"customer12345"}'
# => {"token": "...", "user": {...}}

TOKEN=paste-token-here
curl -X POST http://127.0.0.1:8000/api/cart/items/ -H "Authorization: Token $TOKEN" \
     -H "Content-Type: application/json" -d '{"product_id": 1, "quantity": 2}'
curl http://127.0.0.1:8000/api/cart/ -H "Authorization: Token $TOKEN"
```

You can also click through the browsable API at http://127.0.0.1:8000/api/products/ while DEBUG is on.

## API reference

Money values are returned as strings (`"45.00"`) to avoid float rounding. Authenticated requests send
`Authorization: Token <token>`.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/api/auth/register/` | public | email, password, first_name, last_name → `{token, user}` |
| POST | `/api/auth/login/` | public | email, password → `{token, user}` |
| POST | `/api/auth/logout/` | user | invalidates the token |
| GET/PATCH | `/api/auth/me/` | user | profile and default address |
| GET | `/api/categories/` | public | with `product_count`; staff can POST/PATCH/DELETE (`/api/categories/<slug>/`) |
| GET | `/api/products/` | public | `search`, `category`, `min_price`, `max_price`, `in_stock`, `on_sale`, `ordering`, `page`, `page_size` |
| GET | `/api/products/<slug>/` | public | |
| POST/PATCH/DELETE | `/api/products/[<slug>/]` | staff | JSON or multipart (for `image`); staff may add `include_inactive=true` to list |
| GET/DELETE | `/api/cart/` | user | DELETE empties the cart |
| POST | `/api/cart/items/` | user | `{product_id, quantity}`; adds to an existing line |
| PATCH/DELETE | `/api/cart/items/<id>/` | user | `{quantity}` sets an exact quantity |
| POST | `/api/orders/` | user | checkout: shipping fields + `payment_method` + `notes`; builds the order from the cart |
| GET | `/api/orders/`, `/api/orders/<order_number>/` | user | own orders only |
| POST | `/api/orders/<order_number>/cancel/` | user | pending orders only; restocks |
| GET | `/api/admin/orders/` | staff | `status`, `payment_status`, `search`, `ordering` |
| PATCH | `/api/admin/orders/<order_number>/` | staff | `status`, `payment_status`; cancelling restocks |
| GET/PATCH | `/api/admin/customers/` | staff | order count and total spent; PATCH `is_active` |
| GET | `/api/admin/stats/` | staff | totals, orders by status, last 7 days, low stock, recent orders |

## Design decisions worth knowing

- **Cart is server-side**, so React talks to Django for everything and the cart follows the user across devices. Every cart endpoint returns the whole cart.
- **Checkout is one transaction**: stock is locked and re-checked, order items snapshot name/SKU/price, stock is decremented, the cart is cleared. If anything fails nothing changes.
- **Payments are not integrated.** `payment_status` starts `unpaid`; an admin marks it `paid`. A gateway such as Stripe would plug into `orders/services.py`.
- **One token per user**: logging out signs out every device. Tokens do not expire (fine for development; switch to expiring tokens or JWT before production).
- **PostgreSQL**: set `DB_ENGINE=postgres` and the `DB_*` variables in `.env`, `pip install "psycopg[binary]"`, then run `migrate` again. No code changes needed.
- Deleting a product keeps old orders intact (their items keep a name/SKU/price snapshot); deleting a category leaves its products uncategorised.
- Shipping: flat rate, free above a threshold. Both set in `.env`.


---

# Frontend

Stack: React 19, Vite, TypeScript, Tailwind CSS 4, React Router 7. No UI or state libraries; data comes from the Django API only.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev          
npm run typecheck
npm run build
```

`VITE_API_URL` (in `frontend/.env`) points at the API, default `http://127.0.0.1:8000/api`.
Open the site on `localhost:5173` or `127.0.0.1:5173` — both are allowed by the backend's CORS setting.

## Try it

1. Browse as a guest: home, shop (search, category, price, sort, in-stock/on-sale filters), product pages.
2. Sign in as `customer@example.com` / `customer12345`, add items, change quantities, check out, view the order, cancel it.
3. Sign in as `admin@example.com` / `admin12345` → account menu → **Admin** for the dashboard, product/category CRUD with image upload, orders (change status/payment, cancelling restocks) and customers.

## Structure

```text
frontend/src/
├── components/   reusable UI (ui.tsx primitives, ProductCard, Pagination, RouteGuards…) + admin/
├── pages/        Home, Products, ProductDetails, Categories, Cart, Checkout, Login, Register,
│                 Profile, Orders, OrderDetails + admin/ (Dashboard, Products, Categories, Orders, Customers)
├── layouts/      MainLayout (header/footer), AdminLayout (sidebar)
├── services/     api.ts (fetch wrapper, token, errors) + auth / catalog / shop / admin endpoint modules
├── hooks/        useAuth, useCart, useToast (providers), useAsync, useDebounce, useAddToCart, useTitle
├── types/        TypeScript models matching the API
└── App.tsx       routes (admin screens are lazy-loaded)
```

## Behaviour notes

- Every screen handles loading (skeletons/spinners), API errors (message + "Try again"), empty results, and network failure.
- Filters, search, sort and page live in the URL, so shop pages can be bookmarked and shared.
- The cart is the server's cart; adding as a guest sends you to sign in and back.
- If stock changes while someone checks out, the checkout shows the reason and refreshes the cart.
- The token is kept in `localStorage`. If the server rejects it, the app signs the user out automatically.
- Only "Pay on delivery" is offered at checkout because no payment gateway is connected.
