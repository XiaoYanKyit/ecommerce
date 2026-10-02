import { useState, type FormEvent } from "react";
import { Alert, Button, EmptyState, ErrorState, Modal, PageSpinner, TextAreaField, TextField } from "../../components/ui";
import { useAsync } from "../../hooks/useAsync";
import { useTitle } from "../../hooks/useTitle";
import { useToast } from "../../hooks/useToast";
import { messageOf } from "../../lib/errors";
import { ApiError } from "../../services/api";
import { adminApi } from "../../services/admin";
import { catalogApi } from "../../services/catalog";
import type { Category } from "../../types";

function CategoryForm({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");
    const body = new FormData();
    body.append("name", name.trim());
    body.append("description", description);
    if (file) body.append("image", file);
    try {
      if (category) await adminApi.updateCategory(category.slug, body);
      else await adminApi.createCategory(body);
      toast.success(category ? "Category updated" : "Category created");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setFormError(messageOf(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={category ? "Edit category" : "New category"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextAreaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
        <div>
          <label htmlFor="category-image" className="mb-1 block text-sm font-medium">
            Image (optional)
          </label>
          <input id="category-image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          {errors.image && <p role="alert" className="mt-1 text-sm text-danger">{errors.image}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {category ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCategories() {
  useTitle("Categories · Admin");
  const toast = useToast();
  const { data, error, reload } = useAsync(() => catalogApi.categories(), []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const remove = async (c: Category) => {
    const count = c.product_count ?? 0;
    const warning = count > 0 ? ` Its ${count} product(s) will become uncategorised.` : "";
    if (!window.confirm(`Delete "${c.name}"?${warning}`)) return;
    try {
      await adminApi.deleteCategory(c.slug);
      toast.success("Category deleted");
      reload();
    } catch (e) {
      toast.error(messageOf(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Categories</h1>
        <Button onClick={() => setEditing("new")}>New category</Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <PageSpinner />
      ) : data.length === 0 ? (
        <EmptyState title="No categories yet" text="Create a category to organise your products." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted">
                  /{c.slug} · {c.product_count ?? 0} products
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(c)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CategoryForm
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
