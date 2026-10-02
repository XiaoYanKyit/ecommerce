import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, TextField } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTitle } from "../hooks/useTitle";
import { messageOf } from "../lib/errors";

interface LocationState {
  from?: string;
  message?: string;
}

export default function Login() {
  useTitle("Sign in");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as LocationState;
  const destination = state.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={destination} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(messageOf(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-muted">Welcome back.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
        {state.message && !error && <Alert kind="success">{state.message}</Alert>}
        {error && <Alert>{error}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link to="/register" state={state} className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
