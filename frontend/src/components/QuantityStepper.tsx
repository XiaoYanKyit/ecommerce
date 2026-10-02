import { MinusIcon, PlusIcon } from "./icons";

interface Props {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, min = 1, max, disabled, onChange }: Props) {
  const btn = "flex size-9 items-center justify-center text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-white" role="group" aria-label="Quantity">
      <button type="button" className={btn} aria-label="Decrease quantity" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <MinusIcon width={16} height={16} />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}
