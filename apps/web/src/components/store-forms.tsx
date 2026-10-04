import { useEffect, useRef } from "react";
import { initialProducts, type Product, type Settings } from "@/lib/demo-data";

export function ProductEditor({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="product-dialog"
      onCancel={onClose}
      aria-labelledby="editor-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onSave({
            id: product?.id ?? `p-${crypto.randomUUID()}`,
            title: String(data.get("title")).trim(),
            description: String(data.get("description")).trim(),
            category: String(data.get("category")),
            price: Math.round(Number(data.get("price")) * 100),
            stock: Number(data.get("stock")),
            status: data.get("status") as Product["status"],
            image: product?.image ?? initialProducts[0].image,
          });
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">YOUR COLLECTION</span>
            <h2 id="editor-title">
              {product ? "Edit product" : "Add a product"}
            </h2>
          </div>
          <button
            type="button"
            className="quiet"
            aria-label="Close product editor"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <label>
          Product title
          <input
            name="title"
            required
            pattern=".*\S.*"
            maxLength={100}
            defaultValue={product?.title}
            placeholder="e.g. Everyday ceramic mug"
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            maxLength={1000}
            defaultValue={product?.description}
            placeholder="What makes this product special?"
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label>
            Price (SGD)
            <input
              name="price"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              defaultValue={product ? product.price / 100 : ""}
            />
          </label>
          <label>
            Stock quantity
            <input
              name="stock"
              type="number"
              min="0"
              max="1000000"
              step="1"
              required
              defaultValue={product?.stock ?? 0}
            />
          </label>
          <label>
            Category
            <select
              name="category"
              defaultValue={product?.category ?? "Living"}
            >
              {["Living", "Kitchen", "Accessories", "Stationery"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Visibility
            <select name="status" defaultValue={product?.status ?? "Draft"}>
              <option>Draft</option>
              <option>Active</option>
            </select>
          </label>
        </div>
        <p className="helper">
          New products use a sample image. Image uploads and SKU editing come in
          the product API milestone.
        </p>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save product
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  return (
    <form
      className="panel settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onSave({
          name: String(data.get("name")).trim(),
          email: String(data.get("email")),
          shipping: Math.round(Number(data.get("shipping")) * 100),
          threshold: Math.round(Number(data.get("threshold")) * 100),
        });
      }}
    >
      <h2>General details</h2>
      <p className="muted">Give your shop a name and a way to get in touch.</p>
      <label>
        Store name
        <input
          name="name"
          defaultValue={settings.name}
          required
          pattern=".*\S.*"
          maxLength={80}
        />
      </label>
      <label>
        Contact email
        <input
          name="email"
          type="email"
          defaultValue={settings.email}
          required
        />
      </label>
      <label>
        Currency
        <input value="SGD · Singapore dollar" readOnly />
      </label>
      <h2 className="form-section">Shipping estimate</h2>
      <p className="muted">
        Singapore only. These rates appear in the sample cart.
      </p>
      <div className="form-grid">
        <label>
          Flat rate (SGD)
          <input
            type="number"
            name="shipping"
            required
            min="0"
            max="10000"
            step="0.01"
            defaultValue={settings.shipping / 100}
          />
        </label>
        <label>
          Free shipping from (SGD)
          <input
            type="number"
            name="threshold"
            required
            min="0.01"
            max="1000000"
            step="0.01"
            defaultValue={settings.threshold / 100}
          />
        </label>
      </div>
      <div className="info-note">
        <strong>Payments: demo mode</strong>
        <p>
          Checkout is not connected yet. Tax calculation is outside this demo’s
          scope.
        </p>
      </div>
      <button className="primary" type="submit">
        Save settings
      </button>
    </form>
  );
}
