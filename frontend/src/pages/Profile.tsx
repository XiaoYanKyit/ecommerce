import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, buttonClass, TextField } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTitle } from "../hooks/useTitle";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../lib/format";
import { ApiError } from "../services/api";
import { messageOf } from "../lib/errors";

const FIELDS = ["first_name", "last_name", "phone", "address_line1", "address_line2", "city", "state", "postal_code", "country"] as const;
type Field = (typeof FIELDS)[number];

export default function Profile() {
  useTitle("Profile");
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<Record<Field, string>>(() => {
    const initial = {} as Record<Field, string>;
    for (const f of FIELDS) initial[f] = user?.[f] ?? "";
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const set = (name: Field) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      await updateProfile(form);
      toast.success("Profile saved");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-muted">
            {user.email} · member since {formatDate(user.date_joined)}
          </p>
        </div>
        <Link to="/orders" className={buttonClass("secondary")}>
          View my orders
        </Link>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {formError && <Alert>{formError}</Alert>}
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl font-bold">Personal details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="First name" autoComplete="given-name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} />
            <TextField label="Last name" autoComplete="family-name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} />
            <TextField label="Email" value={user.email} disabled hint="Email can't be changed." readOnly />
            <TextField label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} />
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl font-bold">Default shipping address</h2>
          <p className="mt-1 text-sm text-muted">Used to pre-fill checkout.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField className="sm:col-span-2" label="Address" autoComplete="address-line1" value={form.address_line1} onChange={set("address_line1")} error={errors.address_line1} />
            <TextField className="sm:col-span-2" label="Apartment, suite, etc." autoComplete="address-line2" value={form.address_line2} onChange={set("address_line2")} error={errors.address_line2} />
            <TextField label="City" autoComplete="address-level2" value={form.city} onChange={set("city")} error={errors.city} />
            <TextField label="State / region" autoComplete="address-level1" value={form.state} onChange={set("state")} error={errors.state} />
            <TextField label="Postal code" autoComplete="postal-code" value={form.postal_code} onChange={set("postal_code")} error={errors.postal_code} />
            <TextField label="Country" autoComplete="country-name" value={form.country} onChange={set("country")} error={errors.country} />
          </div>
        </section>

        <Button type="submit" size="lg" loading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
