import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProductImage } from "../components/ProductImage";
import { Alert, Button, buttonClass, EmptyState, PageSpinner, TextAreaField, TextField } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useTitle } from "../hooks/useTitle";
import { money } from "../lib/format";
import { ApiError } from "../services/api";
import { orderApi } from "../services/shop";
import type { CheckoutPayload } from "../types";

type FormState = Omit<CheckoutPayload, "payment_method">;

export default function Checkout() {
  useTitle("Checkout");
  const { user } = useAuth();
  const { cart, loading, refresh } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => ({
    shipping_full_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    shipping_email: user?.email ?? "",
    shipping_phone: user?.phone ?? "",
    shipping_address_line1: user?.address_line1 ?? "",
    shipping_address_line2: user?.address_line2 ?? "",
    shipping_city: user?.city ?? "",
    shipping_state: user?.state ?? "",
    shipping_postal_code: user?.postal_code ?? "",
    shipping_country: user?.country ?? "",
    notes: "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (name: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  if (loading && !cart) return <PageSpinner />;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Nothing to check out"
          text="Your cart is empty."
          action={<Link to="/products" className={buttonClass("primary")}>Browse products</Link>}
        />
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      const order = await orderApi.checkout({ ...form, payment_method: "cod" });
      await refresh();
      navigate(`/orders/${order.order_number}`, { replace: true, state: { placed: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        const { cart: cartError, ...fields } = err.fieldErrors;
        setErrors(fields);
        
        if (cartError || Object.keys(fields).length === 0) {
          setFormError(cartError ?? err.message);
          refresh().catch(() => undefined);
        } else {
          setFormError("Please fix the highlighted fields.");
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Checkout</h1>

      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {formError && <Alert>{formError}</Alert>}

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl font-bold">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField className="sm:col-span-2" label="Full name" autoComplete="name" required value={form.shipping_full_name} onChange={set("shipping_full_name")} error={errors.shipping_full_name} />
              <TextField label="Email" type="email" autoComplete="email" required value={form.shipping_email} onChange={set("shipping_email")} error={errors.shipping_email} />
              <TextField label="Phone" type="tel" autoComplete="tel" value={form.shipping_phone} onChange={set("shipping_phone")} error={errors.shipping_phone} />
              <TextField className="sm:col-span-2" label="Address" autoComplete="address-line1" required value={form.shipping_address_line1} onChange={set("shipping_address_line1")} error={errors.shipping_address_line1} />
              <TextField className="sm:col-span-2" label="Apartment, suite, etc. (optional)" autoComplete="address-line2" value={form.shipping_address_line2} onChange={set("shipping_address_line2")} error={errors.shipping_address_line2} />
              <TextField label="City" autoComplete="address-level2" required value={form.shipping_city} onChange={set("shipping_city")} error={errors.shipping_city} />
              <TextField label="State / region" autoComplete="address-level1" value={form.shipping_state} onChange={set("shipping_state")} error={errors.shipping_state} />
              <TextField label="Postal code" autoComplete="postal-code" required value={form.shipping_postal_code} onChange={set("shipping_postal_code")} error={errors.shipping_postal_code} />
              <TextField label="Country" autoComplete="country-name" required value={form.shipping_country} onChange={set("shipping_country")} error={errors.shipping_country} />
              <TextAreaField className="sm:col-span-2" label="Delivery notes (optional)" value={form.notes} onChange={set("notes")} error={errors.notes} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl font-bold">Payment</h2>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-ink">Pay on delivery.</span> Online card payments aren't connected in this demo store, so you pay when your order arrives.
            </p>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl font-bold">Your order</h2>
          <ul className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-canvas">
                  <ProductImage src={item.product.image} name={item.product.name} className="size-full" />
                  <span className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-bl-md bg-ink px-1 text-xs font-bold text-white">{item.quantity}</span>
                </div>
                <span className="min-w-0 flex-1 truncate">{item.product.name}</span>
                <span className="font-medium">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{money(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{Number(cart.shipping_cost) === 0 ? "Free" : money(cart.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-bold">{money(cart.total)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting}>
            Place order
          </Button>
          <Link to="/cart" className={buttonClass("ghost", "md", "mt-2 w-full")}>
            Back to cart
          </Link>
        </aside>
      </form>
    </div>
  );
}
