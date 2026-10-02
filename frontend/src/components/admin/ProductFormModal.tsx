import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { messageOf } from "../../lib/errors";
import { ApiError } from "../../services/api";
import { adminApi } from "../../services/admin";
import { catalogApi } from "../../services/catalog";
import type { Product } from "../../types";
import { Alert, Button, Modal, SelectField, TextAreaField, TextField } from "../ui";

interface Props {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const toast = useToast();
  const categories = useAsync(() => catalogApi.categories(), []);

  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ? String(product.category.id) : "",
    price: product?.price ?? "",
    discount_price: product?.discount_price ?? "",
    stock: product ? String(product.stock) : "0",
    description: product?.description ?? "",
    is_active: product?.is_active ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : (product?.image ?? null)), [file, product]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");

    const body = new FormData();
    body.append("name", form.name.trim());
    if (form.sku.trim()) body.append("sku", form.sku.trim());
    body.append("category_id", form.category);
    body.append("price", form.price);
    body.append("discount_price", form.discount_price);
    body.append("stock", form.stock);
    body.append("description", form.description);
    body.append("is_active", String(form.is_active));
    if (file) body.append("image", file);

    try {
      if (product) await adminApi.updateProduct(product.slug, body);
      else await adminApi.createProduct(body);
      toast.success(product ? "Product updated" : "Product created");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setErrors(err.fieldErrors);
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(messageOf(err));
      }
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? "Edit product" : "New product"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Name" required value={form.name} onChange={set("name")} error={errors.name} />
          <TextField label="SKU" value={form.sku} onChange={set("sku")} error={errors.sku} hint={product ? undefined : "Leave blank to generate one."} />
          <SelectField label="Category" value={form.category} onChange={set("category")} error={errors.category_id}>
            <option value="">No category</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextField label="Price" required inputMode="decimal" value={form.price} onChange={set("price")} error={errors.price} />
          <TextField label="Discount price" inputMode="decimal" value={form.discount_price} onChange={set("discount_price")} error={errors.discount_price} hint="Optional. Must be lower than the price." />
          <TextField label="Stock" required type="number" min={0} step={1} value={form.stock} onChange={set("stock")} error={errors.stock} />
          <div>
            <label htmlFor="product-image" className="mb-1 block text-sm font-medium">
              Image
            </label>
            <input id="product-image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
            {errors.image && <p role="alert" className="mt-1 text-sm text-danger">{errors.image}</p>}
          </div>
          {preview && <img src={preview} alt="Product preview" className="size-24 rounded-md border border-line object-cover" />}
          <TextAreaField className="sm:col-span-2" label="Description" value={form.description} onChange={set("description")} error={errors.description} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Visible in the store
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {product ? "Save changes" : "Create product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
