const tones: Record<string, string> = {
  pending: "bg-sale/30 text-ink",
  processing: "bg-brand/10 text-brand-dark",
  shipped: "bg-brand/10 text-brand-dark",
  delivered: "bg-ok/15 text-ok",
  cancelled: "bg-danger/10 text-danger",
  unpaid: "bg-sale/30 text-ink",
  paid: "bg-ok/15 text-ok",
  failed: "bg-danger/10 text-danger",
  refunded: "bg-line text-muted",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[value] ?? "bg-line text-muted"}`}>
      {label ?? value}
    </span>
  );
}
