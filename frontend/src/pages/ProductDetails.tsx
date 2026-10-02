import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Price } from "../components/Price";
import { ProductImage } from "../components/ProductImage";
import { QuantityStepper } from "../components/QuantityStepper";
import { Button, buttonClass, ErrorState, Skeleton } from "../components/ui";
import { useAddToCart } from "../hooks/useAddToCart";
import { useAsync } from "../hooks/useAsync";
import { useTitle } from "../hooks/useTitle";
import { money } from "../lib/format";
import { catalogApi } from "../services/catalog";

export default function ProductDetails() {
  const { slug = "" } = useParams();
  const { data: product, error, loading, reload } = useAsync(() => catalogApi.product(slug), [slug]);
  const { add, busyId } = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  useTitle(product?.name ?? "Product");
  useEffect(() => {
    setQuantity(1);
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message={error.includes("Not found") ? "We couldn't find that product." : error} onRetry={reload} />
        <p className="mt-6 text-center">
          <Link to="/products" className={buttonClass("secondary")}>
            Back to products
          </Link>
        </p>
      </div>
    );
  }

  if (loading && !product) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2" aria-busy="true">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  if (!product) return null;

  const saving = Number(product.price) - Number(product.current_price);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link to="/products" className="hover:text-ink">
          Shop
        </Link>
        {product.category && (
          <>
            {" / "}
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-ink">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-lg border border-line bg-white">
          <ProductImage src={product.image} name={product.name} className="aspect-square w-full" />
          {product.on_sale && (
            <span className="absolute left-4 top-4 rounded-full bg-sale px-3 py-1 text-sm font-bold">-{product.discount_percent}%</span>
          )}
        </div>

        <div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">{product.name}</h1>
          <div className="mt-4">
            <Price product={product} large />
            {product.on_sale && <p className="mt-1 text-sm font-semibold text-ok">You save {money(saving)}</p>}
          </div>

          <p className="mt-5 whitespace-pre-line text-muted">{product.description || "No description yet."}</p>

          <p className={`mt-6 text-sm font-semibold ${product.in_stock ? (product.stock <= 5 ? "text-danger" : "text-ok") : "text-muted"}`}>
            {!product.in_stock ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left in stock` : "In stock"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            {product.in_stock && <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} />}
            <Button size="lg" disabled={!product.in_stock} loading={busyId === product.id} onClick={() => add(product, quantity)}>
              {product.in_stock ? "Add to cart" : "Unavailable"}
            </Button>
          </div>

          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
            <dt className="text-muted">SKU</dt>
            <dd className="font-medium">{product.sku}</dd>
            {product.category && (
              <>
                <dt className="text-muted">Category</dt>
                <dd className="font-medium">{product.category.name}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
