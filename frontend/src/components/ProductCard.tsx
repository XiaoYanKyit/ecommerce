import { Link } from "react-router-dom";
import { useAddToCart } from "../hooks/useAddToCart";
import type { Product } from "../types";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { Button } from "./ui";

export function ProductCard({ product }: { product: Product }) {
  const { add, busyId } = useAddToCart();
  const lowStock = product.in_stock && product.stock <= 5;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-canvas">
        <ProductImage src={product.image} name={product.name} className="size-full" />
        {product.on_sale && (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-xs font-bold">-{product.discount_percent}%</span>
        )}
        {!product.in_stock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-semibold text-white">Sold out</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category && <p className="text-xs font-medium uppercase tracking-wide text-muted">{product.category.name}</p>}
        <h3 className="font-semibold leading-snug">
          <Link to={`/products/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <Price product={product} />
        {lowStock && <p className="text-xs font-medium text-danger">Only {product.stock} left</p>}
        <Button
          className="mt-auto"
          variant={product.in_stock ? "primary" : "secondary"}
          size="sm"
          disabled={!product.in_stock}
          loading={busyId === product.id}
          onClick={() => add(product)}
        >
          {product.in_stock ? "Add to cart" : "Unavailable"}
        </Button>
      </div>
    </article>
  );
}
