import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, TextField } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTitle } from "../hooks/useTitle";
import { messageOf } from "../lib/errors";
import { ApiError } from "../services/api";

export default function Register() {
  useTitle("Create account");
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const from = ((useLocation().state ?? {}) as { from?: string }).from ?? "/";

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (name: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      await register({ ...form, email: form.email.trim() });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setFormError(messageOf(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-muted">Save your cart, check out faster and track orders.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
        {formError && <Alert>{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" autoComplete="given-name" required value={form.first_name} onChange={set("first_name")} error={errors.first_name} />
          <TextField label="Last name" autoComplete="family-name" required value={form.last_name} onChange={set("last_name")} error={errors.last_name} />
        </div>
        <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters, not too common."
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" state={{ from }} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
