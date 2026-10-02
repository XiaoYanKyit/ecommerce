import { money } from "../lib/format";
import type { Product } from "../types";

export function Price({ product, large = false }: { product: Pick<Product, "price" | "current_price" | "on_sale">; large?: boolean }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className={`font-display font-bold ${large ? "text-3xl" : "text-lg"}`}>{money(product.current_price)}</span>
      {product.on_sale && (
        <span className={`text-muted line-through ${large ? "text-base" : "text-sm"}`}>{money(product.price)}</span>
      )}
    </p>
  );
}
