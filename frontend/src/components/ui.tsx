import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CloseIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-line bg-white text-ink hover:border-ink",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-danger text-white hover:bg-danger/90",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra = "") =>
  [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading = false, className = "", type = "button", disabled, children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-24 text-brand">
      <Spinner className="size-8" />
    </div>
  );
}

/* ---------- Form fields ---------- */
const inputBase =
  "w-full rounded-md border bg-white px-3 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none disabled:bg-canvas disabled:text-muted";

function FieldShell({ id, label, error, hint, className, children }: { id: string; label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">>(
  function TextField({ label, error, hint, className, ...props }, ref) {
    const id = useId();
    return (
      <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputBase} h-10 ${error ? "border-danger" : "border-line"}`}
          {...props}
        />
      </FieldShell>
    );
  },
);

export function SelectField({ label, error, hint, className, children, ...props }: FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <select id={id} className={`${inputBase} h-10 ${error ? "border-danger" : "border-line"}`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, className, ...props }: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <textarea id={id} rows={4} className={`${inputBase} py-2 ${error ? "border-danger" : "border-line"}`} {...props} />
    </FieldShell>
  );
}

/* Compact select used in toolbars (no label wrapper) */
export const selectClass = `${inputBase} h-10 border-line`;
export const inputClass = `${inputBase} h-10 border-line`;

/* ---------- Feedback ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-white px-6 py-10 text-center">
      <h2 className="font-display text-xl font-bold text-danger">Couldn't load this</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success"; children: ReactNode }) {
  const tone = kind === "error" ? "border-danger/40 text-danger" : "border-ok/40 text-ok";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border bg-white px-4 py-3 text-sm font-medium ${tone}`}>
      {children}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-6 sm:rounded-xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-canvas hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
