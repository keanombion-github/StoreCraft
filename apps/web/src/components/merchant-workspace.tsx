"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  request,
  supabase,
  type StoreRecord,
  type CatalogProduct,
  type LiveOrder,
} from "@/lib/commerce";
import { money } from "@/lib/demo-data";
import { PageBuilder } from "./page-builder";
import { ImageUpload, assetUrl } from "./image-upload";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBox,
  faReceipt,
  faWandMagicSparkles,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

export function MerchantWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!supabase) {
      setTimeout(() => setReady(true), 0);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <p className="loading">Checking your session…</p>;
  if (!supabase)
    return (
      <p className="loading">
        Supabase configuration is missing. See the setup guide.
      </p>
    );
  return session ? (
    <MerchantDashboard key={session.user.id} session={session} />
  ) : (
    <Login />
  );
}

function Login() {
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-page">
      <div className="auth-brand">StoreCraft</div>
      <form
        className="panel settings-form auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          const fields = new FormData(event.currentTarget);
          const credentials = {
            email: String(fields.get("email")),
            password: String(fields.get("password")),
          };
          const result = signup
            ? await supabase!.auth.signUp({
                ...credentials,
                options: {
                  emailRedirectTo: window.location.origin + "/merchant",
                },
              })
            : await supabase!.auth.signInWithPassword(credentials);
          setMessage(
            result.error?.message ??
              (signup && !result.data.session
                ? "Check your email to confirm the account, then return here to sign in."
                : "Signed in."),
          );
          setBusy(false);
        }}
      >
        <h1>
          {signup ? "Create your merchant account" : "Sign in to your store"}
        </h1>
        <p className="muted">
          Your products and page designs are saved to your own store.
        </p>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={8}
          />
        </label>
        {message && (
          <p role="status" className="info-note">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          className="quiet"
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup
            ? "Already have an account? Sign in"
            : "Create a merchant account"}
        </button>
        <p>
          <Link href="/" className="text-link">
            Explore the browser sandbox
          </Link>
        </p>
      </form>
    </main>
  );
}

function MerchantDashboard({ session }: { session: Session }) {
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("Home");
  const [builderDirty, setBuilderDirty] = useState(false);
  const [syncEvents, setSyncEvents] = useState<number | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [editor, setEditor] = useState<CatalogProduct | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  async function load() {
    setError("");
    try {
      const sessionResult = await supabase!.auth.getSession();
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050") +
          "/api/merchant/store",
        {
          headers: {
            Authorization: `Bearer ${sessionResult.data.session?.access_token}`,
          },
        },
      );
      if (response.status === 404) {
        setStore(null);
        setLoaded(true);
        return;
      }
      if (!response.ok)
        throw new Error(
          "Could not load your store. Check the API connection and retry.",
        );
      setStore(await response.json());
      const [catalog, purchases] = await Promise.all([
        request<CatalogProduct[]>("/api/merchant/products/"),
        request<LiveOrder[]>("/api/merchant/orders/"),
      ]);
      setProducts(catalog);
      setOrders(purchases);
      setLoaded(true);
    } catch (failure) {
      setError((failure as Error).message);
      setLoaded(true);
    }
  }
  useEffect(() => {
    void supabase!.auth.getSession().then(() => load());
  }, []); // Each account gets a newly mounted workspace.
  async function save(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setEditor(null);
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return <p className="loading">Loading your merchant workspace…</p>;
  if (!store)
    return (
      <main className="auth-page">
        <form
          className="panel settings-form auth-card"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            void save(
              () =>
                request("/api/merchant/store", {
                  method: "POST",
                  body: JSON.stringify({
                    name: values.get("name"),
                    slug: values.get("slug"),
                    contactEmail: values.get("email"),
                  }),
                }),
              "Store created.",
            );
          }}
        >
          <h1>Create your store</h1>
          <p className="muted">
            One store per merchant account. Currency: SGD.
          </p>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <label>
            Store name
            <input name="name" required maxLength={80} />
          </label>
          <label>
            Store URL slug
            <input
              name="slug"
              required
              pattern="[a-z0-9][a-z0-9-]{1,98}[a-z0-9]"
              placeholder="keans-store"
            />
          </label>
          <label>
            Contact email
            <input
              name="email"
              type="email"
              defaultValue={session.user.email}
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            Create store
          </button>
          <button type="button" className="quiet" onClick={() => void load()}>
            Retry loading
          </button>
          <button
            type="button"
            className="quiet"
            onClick={() => void supabase!.auth.signOut()}
          >
            Sign out
          </button>
        </form>
      </main>
    );
  const shown = products.filter(
    (product) =>
      product.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || product.status === filter),
  );
  return (
    <div className="workspace live-workspace">
      <header className="topbar">
        <Link className="brand" href="/merchant">
          StoreCraft
        </Link>
        <span className="live-brand-store">{store.name}</span>
        <a
          className="quiet"
          href={`/s/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View store ↗
        </a>
      </header>
      <aside className="sidebar">
        <div className="store-switch">
          <div>
            <strong>{store.name}</strong>
            <small>Merchant workspace</small>
          </div>
        </div>
        <nav>
          {["Home", "Products", "Orders", "Page builder", "Settings"].map(
            (item) => (
              <button
                key={item}
                className={tab === item ? "nav-item selected" : "nav-item"}
                onClick={() => {
                  if (
                    tab === "Page builder" &&
                    builderDirty &&
                    item !== tab &&
                    !window.confirm(
                      "Your draft has unsaved changes. Leave the editor? You can return to it during this session.",
                    )
                  )
                    return;
                  setTab(item);
                  setError("");
                  setNotice("");
                }}
              >
                <span aria-hidden="true">
                  <FontAwesomeIcon
                    icon={
                      item === "Home"
                        ? faHouse
                        : item === "Products"
                          ? faBox
                          : item === "Orders"
                            ? faReceipt
                            : item === "Page builder"
                              ? faWandMagicSparkles
                              : faGear
                    }
                    style={{ width: "1em", height: "1em" }}
                  />
                </span>
                {item}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <small className="muted">{session.user.email}</small>
          <button
            className="quiet"
            onClick={() => {
              if (
                !builderDirty ||
                window.confirm("Sign out and discard unsaved page changes?")
              )
                void supabase!.auth.signOut();
            }}
          >
            Sign out
          </button>
          <Link href="/" className="quiet">
            Browser sandbox
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <main className="content">
          <div className="demo-note">
            Persistent merchant data · Test payments only
          </div>
          <div className="page-heading">
            <div>
              <h1>{tab === "Home" ? "Overview dashboard" : tab}</h1>
              <p>
                {store.name} · /s/{store.slug}
              </p>
            </div>
            {tab === "Products" && (
              <button className="primary" onClick={() => setEditor("new")}>
                Add product
              </button>
            )}
          </div>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          {tab === "Home" && (
            <>
              <div className="stats">
                <div className="stat">
                  <span>Products</span>
                  <strong>{products.length}</strong>
                  <small>
                    {products.filter((p) => p.status === "Active").length}{" "}
                    active
                  </small>
                </div>
                <div className="stat">
                  <span>Paid demo orders</span>
                  <strong>
                    {orders.filter((o) => o.paymentState === "Paid").length}
                  </strong>
                  <small>
                    {
                      orders.filter(
                        (o) =>
                          o.paymentState === "Paid" &&
                          o.fulfillmentState === "Unfulfilled",
                      ).length
                    }{" "}
                    awaiting shipment
                  </small>
                </div>
                <div className="stat">
                  <span>Demo sales · SGD</span>
                  <strong>
                    {money(
                      orders
                        .filter((o) => o.paymentState === "Paid")
                        .reduce((total, o) => total + o.total, 0),
                    )}
                  </strong>
                  <small>Failed payments excluded</small>
                </div>
              </div>
              <div className="panel info-card">
                <h2>
                  {store.publishedVersionId
                    ? "Your store is published"
                    : "Prepare your first storefront"}
                </h2>
                <p>
                  Add active products, arrange widgets in the page builder, and
                  publish to open your shop to customers.
                </p>
                <button
                  className="primary"
                  onClick={() => setTab("Page builder")}
                >
                  Open page builder
                </button>
              </div>
            </>
          )}
          {tab === "Products" && (
            <>
              <div className="panel">
                <div className="table-toolbar">
                  <div className="tabs">
                    {["All", "Active", "Draft"].map((value) => (
                      <button
                        key={value}
                        className="tab"
                        onClick={() => setFilter(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <input
                      aria-label="Search merchant products"
                      placeholder="Search products"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Status</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setEditor(product)}
                            >
                              {product.title}
                            </button>
                          </td>
                          <td>{product.sku}</td>
                          <td>{product.status}</td>
                          <td>{product.stockQuantity}</td>
                          <td>{money(product.priceMinorUnits)}</td>
                          <td>
                            <button
                              className="quiet"
                              disabled={busy}
                              onClick={() =>
                                void save(
                                  () =>
                                    request(
                                      `/api/merchant/products/${product.id}`,
                                      {
                                        method: "PUT",
                                        body: JSON.stringify({
                                          ...product,
                                          status: "Archived",
                                        }),
                                      },
                                    ),
                                  "Product archived. Historical orders remain intact.",
                                )
                              }
                            >
                              Archive
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown.length === 0 && (
                  <p className="empty-state">
                    No products yet. Add a product to start your catalog.
                  </p>
                )}
              </div>
              {editor && (
                <CatalogForm
                  key={editor === "new" ? "new" : editor.id}
                  product={editor === "new" ? null : editor}
                  busy={busy}
                  onClose={() => setEditor(null)}
                  onSave={(values) =>
                    void save(
                      () =>
                        request(
                          editor === "new"
                            ? "/api/merchant/products/"
                            : `/api/merchant/products/${editor.id}`,
                          {
                            method: editor === "new" ? "POST" : "PUT",
                            body: JSON.stringify(values),
                          },
                        ),
                      "Product saved to your store.",
                    )
                  }
                />
              )}
            </>
          )}
          <div hidden={tab !== "Page builder"}>
            <PageBuilder
              store={store}
              products={products}
              onDirtyChange={setBuilderDirty}
              onPublished={() => void load()}
            />
          </div>
          {tab === "Settings" && (
            <form
              className="panel settings-form"
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void save(
                  () =>
                    request("/api/merchant/store", {
                      method: "PUT",
                      body: JSON.stringify({
                        name: values.get("name"),
                        contactEmail: values.get("email"),
                        shippingMinorUnits: Math.round(
                          Number(values.get("shipping")) * 100,
                        ),
                        freeShippingThreshold: Math.round(
                          Number(values.get("threshold")) * 100,
                        ),
                        pickupEnabled: values.get("pickupEnabled") === "on",
                        pickupAddress: values.get("pickupAddress"),
                      }),
                    }),
                  "Store settings saved.",
                );
              }}
            >
              <h2>General and shipping</h2>
              <label>
                Store name
                <input
                  name="name"
                  required
                  defaultValue={store.name}
                  maxLength={80}
                />
              </label>
              <label>
                Contact email
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={store.contactEmail}
                />
              </label>
              <p className="muted">
                Currency: SGD · Ships to Singapore · Tax calculation outside
                demo scope
              </p>
              <label>
                Flat shipping rate (SGD)
                <input
                  type="number"
                  name="shipping"
                  min="0"
                  max="10000"
                  step="0.01"
                  required
                  defaultValue={store.shippingMinorUnits / 100}
                />
              </label>
              <label>
                Free shipping from (SGD)
                <input
                  type="number"
                  name="threshold"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={store.freeShippingThreshold / 100}
                />
              </label>
              <button className="primary" disabled={busy}>
                Save settings
              </button>
              <h2>Pickup in store</h2>
              <label className="checkbox-label">
                <input
                  name="pickupEnabled"
                  type="checkbox"
                  defaultChecked={store.pickupEnabled}
                />
                Offer free pickup
              </label>
              <label>
                Pickup address
                <input
                  name="pickupAddress"
                  maxLength={300}
                  defaultValue={store.pickupAddress ?? ""}
                  placeholder="Where customers collect their orders"
                />
              </label>
              <h2>Order sync</h2>
              <p className="helper">
                Orders and fulfillment changes are queued for your future OMS.
                An OMS is not connected yet.
              </p>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void request<unknown[]>("/api/merchant/sync/events")
                    .then((events) => setSyncEvents(events.length))
                    .catch((failure) => setError(failure.message));
                }}
              >
                Check queued updates
              </button>
              {syncEvents !== null && (
                <p role="status">
                  {syncEvents === 100 ? "100 or more" : syncEvents} updates
                  awaiting an OMS.
                </p>
              )}
            </form>
          )}
          {tab === "Orders" && (
            <OrdersView
              orders={orders}
              busy={busy}
              onFulfill={(order, state, number, url) =>
                void save(
                  () =>
                    request(`/api/merchant/orders/${order.id}/fulfillment`, {
                      method: "PUT",
                      body: JSON.stringify({
                        state,
                        trackingNumber: number,
                        trackingUrl: url,
                      }),
                    }),
                  "Fulfillment updated.",
                )
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

function CatalogForm({
  product,
  busy,
  onClose,
  onSave,
}: {
  product: CatalogProduct | null;
  busy: boolean;
  onClose: () => void;
  onSave: (values: object) => void;
}) {
  const [imagePath, setImagePath] = useState(product?.imagePath ?? "");
  const [imageAlt, setImageAlt] = useState(product?.imageAlt ?? "");
  const [uploading, setUploading] = useState(false);
  return (
    <form
      className="panel settings-form live-product-form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        if (uploading || busy) return;
        onSave({
          title: fields.get("title"),
          slug: fields.get("slug"),
          description: fields.get("description"),
          sku: fields.get("sku"),
          priceMinorUnits: Math.round(Number(fields.get("price")) * 100),
          stockQuantity: Number(fields.get("stock")),
          status: fields.get("status"),
          imagePath,
          imageAlt,
        });
      }}
    >
      <h2>{product ? "Edit product" : "New product"}</h2>
      <label>
        Title
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={product?.title}
        />
      </label>
      <label>
        Slug
        <input
          name="slug"
          required
          maxLength={120}
          pattern="[a-z0-9][a-z0-9-]{1,118}[a-z0-9]"
          defaultValue={product?.slug}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          required
          maxLength={4000}
          defaultValue={product?.description}
        />
      </label>
      <label>
        SKU
        <input name="sku" maxLength={80} defaultValue={product?.sku} />
      </label>
      <ImageUpload
        value={imagePath}
        onBusy={setUploading}
        onChange={(path) => {
          setImagePath(path);
          if (!imageAlt) setImageAlt(product?.title ?? "Product photo");
        }}
      />
      <label>
        Image alternative text
        <input
          value={imageAlt}
          maxLength={150}
          required={!!imagePath}
          onChange={(event) => setImageAlt(event.target.value)}
        />
      </label>
      {imagePath && (
        <button
          type="button"
          className="quiet"
          disabled={uploading}
          onClick={() => {
            setImagePath("");
            setImageAlt("");
          }}
        >
          Remove product image
        </button>
      )}
      {imagePath && (
        <a
          className="text-link"
          href={assetUrl(imagePath)}
          target="_blank"
          rel="noopener noreferrer"
        >
          View uploaded image
        </a>
      )}
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
            defaultValue={product ? product.priceMinorUnits / 100 : ""}
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
            defaultValue={product?.stockQuantity ?? 0}
          />
        </label>
      </div>
      <label>
        Status
        <select name="status" defaultValue={product?.status ?? "Draft"}>
          <option>Draft</option>
          <option>Active</option>
        </select>
      </label>
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary"
          disabled={uploading}
          onClick={onClose}
        >
          Cancel
        </button>
        <button className="primary" disabled={busy || uploading}>
          Save product
        </button>
      </div>
    </form>
  );
}

function OrdersView({
  orders,
  busy,
  onFulfill,
}: {
  orders: LiveOrder[];
  busy: boolean;
  onFulfill: (
    order: LiveOrder,
    state: string,
    number: string,
    url: string,
  ) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const current = orders.find((order) => order.id === selected);
  return (
    <>
      <div className="panel">
        <div className="table-toolbar">
          <label className="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search orders"
              placeholder="Order reference or email"
            />
          </label>
          <select
            aria-label="Filter orders"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>All</option>
            <option>Paid</option>
            <option>Failed</option>
            <option>Unfulfilled</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>ReadyForPickup</option>
            <option>Collected</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(
                  (order) =>
                    (order.reference + order.customerEmail)
                      .toLowerCase()
                      .includes(query.toLowerCase()) &&
                    (filter === "All" ||
                      order.paymentState === filter ||
                      order.fulfillmentState === filter),
                )
                .map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(order.id)}
                      >
                        {order.reference}
                      </button>
                    </td>
                    <td>{order.customerEmail}</td>
                    <td>{order.paymentState}</td>
                    <td>{order.fulfillmentState}</td>
                    <td>{money(order.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <p className="empty-state">
            Orders appear here after a test checkout.
          </p>
        )}
      </div>
      {current && (
        <form
          className="panel settings-form live-product-form"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            onFulfill(
              current,
              current.fulfillmentMethod === "Pickup"
                ? current.fulfillmentState === "Unfulfilled"
                  ? "ReadyForPickup"
                  : "Collected"
                : current.fulfillmentState === "Unfulfilled"
                  ? "Shipped"
                  : "Delivered",
              String(fields.get("number") ?? ""),
              String(fields.get("url") ?? ""),
            );
          }}
        >
          <h2>{current.reference}</h2>
          <p>
            {current.customerName} · {current.customerEmail}
          </p>
          <p>{current.address}</p>
          <ul>
            {JSON.parse(current.itemsJson).map(
              (item: {
                productId: string;
                title: string;
                quantity: number;
                unitPrice: number;
              }) => (
                <li key={item.productId}>
                  {item.title} × {item.quantity} — {money(item.unitPrice)}
                </li>
              ),
            )}
          </ul>
          <p>
            Shipping {money(current.shipping)} · Total {money(current.total)}
          </p>
          <p>
            {current.paymentState} · {current.fulfillmentMethod ?? "Delivery"} ·{" "}
            {current.fulfillmentState}
          </p>
          {current.paymentState === "Paid" &&
            !["Delivered", "Collected"].includes(current.fulfillmentState) && (
              <>
                {current.fulfillmentMethod !== "Pickup" && (
                  <>
                    <label>
                      Tracking number
                      <input
                        name="number"
                        required
                        maxLength={100}
                        defaultValue={current.trackingNumber}
                      />
                    </label>
                    <label>
                      Tracking URL (optional HTTPS)
                      <input
                        name="url"
                        type="url"
                        defaultValue={current.trackingUrl}
                      />
                    </label>
                  </>
                )}
                <button className="primary" disabled={busy}>
                  Mark{" "}
                  {current.fulfillmentMethod === "Pickup"
                    ? current.fulfillmentState === "Unfulfilled"
                      ? "ready for pickup"
                      : "collected"
                    : current.fulfillmentState === "Unfulfilled"
                      ? "shipped"
                      : "delivered"}
                </button>
              </>
            )}
          <button
            type="button"
            className="quiet"
            onClick={() => setSelected(null)}
          >
            Close details
          </button>
        </form>
      )}
    </>
  );
}
