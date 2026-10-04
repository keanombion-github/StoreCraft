"use client";

/* eslint-disable @next/next/no-img-element -- Standard images for remote fictional product photos. */
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  initialProducts,
  initialSettings,
  demoOrders,
  money,
  photo,
  type Product,
  type Settings,
} from "@/lib/demo-data";
import { ProductEditor, SettingsForm } from "./store-forms";
import { Shop } from "./storefront";
import { OverviewCards } from "./overview-cards";

type View = "Home" | "Products" | "Orders" | "Storefront" | "Settings";
const navigation: { name: View; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Products", icon: "▦" },
  { name: "Orders", icon: "▤" },
  { name: "Storefront", icon: "◫" },
  { name: "Settings", icon: "⚙" },
];
const subscribe = () => () => {};

export function StoreApp({
  storefrontPreview = false,
}: {
  storefrontPreview?: boolean;
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <Workspace storefrontPreview={storefrontPreview} />
  ) : (
    <p className="loading">Opening your workspace…</p>
  );
}

function readSaved(): { products: Product[]; settings: Settings } {
  try {
    const raw = localStorage.getItem("storecraft-demo-v1");
    if (raw) {
      const saved = JSON.parse(raw);
      if (
        Array.isArray(saved.products) &&
        saved.products.every(
          (p: Product) =>
            typeof p.id === "string" &&
            typeof p.title === "string" &&
            typeof p.description === "string" &&
            typeof p.category === "string" &&
            typeof p.image === "string" &&
            Number.isInteger(p.price) &&
            p.price > 0 &&
            Number.isInteger(p.stock) &&
            p.stock >= 0 &&
            ["Active", "Draft"].includes(p.status),
        ) &&
        typeof saved.settings?.name === "string" &&
        typeof saved.settings?.email === "string" &&
        Number.isInteger(saved.settings?.shipping) &&
        saved.settings.shipping >= 0 &&
        Number.isInteger(saved.settings?.threshold) &&
        saved.settings.threshold > 0
      )
        return saved;
    }
  } catch {
    /* Missing or invalid browser saves fall back to fictional seed data. */
  }
  return { products: initialProducts, settings: initialSettings };
}

function Workspace({ storefrontPreview }: { storefrontPreview: boolean }) {
  const router = useRouter();
  const [saved] = useState(readSaved);
  const [products, setProducts] = useState(saved.products);
  const [settings, setSettings] = useState(saved.settings);
  const [view, setView] = useState<View>("Home");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  function openStore() {
    window.open("/s/sunday-supply", "_blank", "noopener,noreferrer");
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All products");
  const [orders, setOrders] = useState(demoOrders);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  function persist(nextProducts: Product[], nextSettings: Settings) {
    try {
      localStorage.setItem(
        "storecraft-demo-v1",
        JSON.stringify({ products: nextProducts, settings: nextSettings }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  const active = products.filter((p) => p.status === "Active");
  const shown = products.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All products" || p.status === filter),
  );
  const order = orders.find((o) => o.reference === selectedOrder);
  if (storefrontPreview)
    return (
      <Shop
        products={active}
        settings={settings}
        onBack={() => {
          router.push("/");
        }}
      />
    );

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="store-switch">
          <span className="store-avatar">S</span>
          <div>
            <strong>{settings.name}</strong>
            <small>Demo workspace</small>
          </div>
        </div>
        <small className="nav-label">WORKSPACE</small>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={view === item.name ? "nav-item selected" : "nav-item"}
              aria-current={view === item.name ? "page" : undefined}
              onClick={() => {
                setView(item.name);
                setNotice("");
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.name}
              {item.name === "Orders" && (
                <b>
                  {
                    orders.filter(
                      (o) =>
                        o.payment === "Paid" && o.fulfillment === "Unfulfilled",
                    ).length
                  }
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="profile-avatar">KO</span>
            <div>
              <strong>Kean Ombion</strong>
              <small>Learning workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="brand"
            onClick={() => setView("Home")}
            aria-label="StoreCraft home"
          >
            <span className="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 8h14l1 12H4L5 8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M9 9V6a3 3 0 0 1 6 0v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>
            StoreCraft
          </button>
          <label className="global-search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle
                cx="10"
                cy="10"
                r="6"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <input
              aria-label="Search catalog"
              placeholder="Search products…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setView("Products");
              }}
            />
          </label>
          <button className="quiet" onClick={() => openStore()}>
            View store ↗
          </button>
        </header>
        <main
          className={view === "Home" ? "content home-dashboard" : "content"}
        >
          <div className="demo-note">
            <span className="dot" />
            Browser sandbox · Fictional data · Changes stay on this device
          </div>
          {storageError && (
            <p role="alert" className="alert">
              Browser saving is unavailable. Changes will be lost when you
              reload.
            </p>
          )}
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
          <div className="page-heading">
            <div>
              <h1>{view === "Home" ? "Overview dashboard" : view}</h1>
              <p>
                {
                  {
                    Home: "Sample store activity and order status.",
                    Products:
                      "Manage your catalog, inventory, and product visibility.",
                    Orders: "From purchase to doorstep, one order at a time.",
                    Storefront: "A thoughtful space for the things you make.",
                    Settings: "Manage store details and shipping rates.",
                  }[view]
                }
              </p>
            </div>
            {view === "Products" && (
              <button className="primary" onClick={() => setEditor("new")}>
                ＋ Add product
              </button>
            )}
          </div>

          {view === "Products" && (
            <>
              <div className="stats">
                <Stat
                  label="Total products"
                  value={String(products.length)}
                  note="Your growing collection"
                />
                <Stat
                  label="Active products"
                  value={String(active.length)}
                  note="Visible in your sample storefront"
                />
                <Stat
                  label="Low stock"
                  value={String(products.filter((p) => p.stock < 10).length)}
                  note="Products with fewer than 10 units"
                />
              </div>
              <section className="panel">
                <div className="table-toolbar">
                  <div className="tabs">
                    {["All products", "Active", "Draft"].map((t) => (
                      <button
                        key={t}
                        className={filter === t ? "tab active" : "tab"}
                        onClick={() => setFilter(t)}
                      >
                        {t}
                        <span>
                          {t === "All products"
                            ? products.length
                            : products.filter((p) => p.status === t).length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <span>⌕</span>
                    <input
                      aria-label="Search products"
                      placeholder="Search products…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Status</th>
                        <th>Inventory</th>
                        <th>Category</th>
                        <th className="number">Price</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <button
                              className="product-cell"
                              onClick={() => setEditor(p)}
                            >
                              <img src={photo(p.image, 150)} alt="" />
                              <span>
                                <strong>{p.title}</strong>
                                <small>Simple product</small>
                              </span>
                            </button>
                          </td>
                          <td>
                            <Badge text={p.status} />
                          </td>
                          <td>
                            <span
                              className={
                                p.stock === 0
                                  ? "stock empty"
                                  : p.stock < 10
                                    ? "stock low"
                                    : "stock"
                              }
                            >
                              <i />
                              {p.stock === 0
                                ? "Out of stock"
                                : `${p.stock} in stock`}
                            </span>
                          </td>
                          <td className="muted">{p.category}</td>
                          <td className="number price">{money(p.price)}</td>
                          <td>
                            <button
                              className="edit-button"
                              aria-label={`Edit ${p.title}`}
                              onClick={() => setEditor(p)}
                            >
                              ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown.length === 0 && (
                  <div className="empty-state">
                    <h3>No products found</h3>
                    <p>Try another search, or add your first product.</p>
                    <button
                      className="primary"
                      onClick={() => setEditor("new")}
                    >
                      Add product
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  Showing {shown.length} of {products.length} products
                  <span>All prices in SGD</span>
                </div>
              </section>
              <p className="helper">
                ⓘ Draft products are only visible here. Active products appear
                in your sample storefront.
              </p>
            </>
          )}

          {view === "Home" && (
            <>
              <div className="report-period">
                <span className="period-label">Oct 1 – 3, 2026</span>
                <span>Sample dataset</span>
                <span className="report-currency">SGD</span>
              </div>
              <div className="stats">
                <Stat
                  label="Products in your catalog"
                  value={String(products.length)}
                  note={`${active.length} active products`}
                />
                <Stat
                  label="Fictional paid orders"
                  value={String(
                    orders.filter((o) => o.payment === "Paid").length,
                  )}
                  note="Seeded examples, not real purchases"
                />
                <Stat
                  label="Demo sales · SGD"
                  value={money(
                    orders
                      .filter((o) => o.payment === "Paid")
                      .reduce((sum, o) => sum + o.total, 0),
                  )}
                  note="Simulated payments only"
                />
              </div>
              <OverviewCards products={products} orders={orders} />
              <div className="panel checklist">
                <h2>Store setup</h2>
                {[
                  "Add or edit a product",
                  "Explore the sample storefront",
                  "Set your shipping rate",
                ].map((text, i) => (
                  <button
                    key={text}
                    onClick={() =>
                      i === 1
                        ? openStore()
                        : setView(i === 0 ? "Products" : "Settings")
                    }
                  >
                    <span>{i + 1}</span>
                    {text}
                    <b>→</b>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === "Orders" && (
            <>
              <div className="panel">
                <div className="table-toolbar">
                  <strong>Fictional order examples</strong>
                  <span className="muted">
                    Fulfillment changes reset on reload
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Payment</th>
                        <th>Fulfillment</th>
                        <th className="number">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.reference}>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setSelectedOrder(o.reference)}
                            >
                              {o.reference}
                            </button>
                            <small className="block muted">{o.date}</small>
                          </td>
                          <td>
                            {o.customer}
                            <small className="block muted">{o.email}</small>
                          </td>
                          <td>
                            <Badge text={o.payment} />
                          </td>
                          <td>
                            <Badge text={o.fulfillment} />
                          </td>
                          <td className="number">{money(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {order && (
                <section className="panel order-detail">
                  <h2>
                    {order.reference}
                    <button
                      className="quiet"
                      onClick={() => setSelectedOrder(null)}
                    >
                      Close
                    </button>
                  </h2>
                  <p>{order.items}</p>
                  <p>
                    {order.customer} · {order.email}
                  </p>
                  <p>{order.address}</p>
                  <p>
                    Shipping: {money(order.shipping)} · Total:{" "}
                    {money(order.total)}
                  </p>
                  <p>
                    Payment: {order.payment} · Fulfillment: {order.fulfillment}
                  </p>
                  {order.payment === "Paid" &&
                    order.fulfillment === "Unfulfilled" && (
                      <button
                        className="primary"
                        onClick={() => {
                          setOrders(
                            orders.map((o) =>
                              o.reference === order.reference
                                ? { ...o, fulfillment: "Shipped" }
                                : o,
                            ),
                          );
                          setNotice(
                            "Sample order marked shipped for this session. Tracking entry comes later.",
                          );
                        }}
                      >
                        Simulate marking shipped
                      </button>
                    )}
                </section>
              )}
              <p className="helper">
                These orders are examples. Checkout and payment processing have
                not been connected.
              </p>
            </>
          )}

          {view === "Storefront" && (
            <>
              <div className="panel">
                <div className="preview-top">
                  <span className="dot" />
                  Sample storefront <span>Preview only</span>
                </div>
                <div className="mini-shop">
                  <small>{settings.name.toUpperCase()}</small>
                  <h2>
                    Everyday things.
                    <br />A little more considered.
                  </h2>
                  <p>
                    Thoughtful essentials for slow mornings and living well.
                  </p>
                  <button className="primary" onClick={() => openStore()}>
                    Explore your storefront ↗
                  </button>
                </div>
              </div>
              <div className="panel info-card">
                <h2>The start of something yours.</h2>
                <p>
                  This preview renders your active products and store name. The
                  section editor, draft saving, and publishing will arrive in
                  the builder milestone.
                </p>
                <button
                  className="secondary"
                  onClick={() => setView("Settings")}
                >
                  Edit store details
                </button>
              </div>
            </>
          )}

          {view === "Settings" && (
            <SettingsForm
              settings={settings}
              onSave={(value) => {
                setSettings(value);
                persist(products, value);
                setNotice(
                  "Settings updated. A warning appears above if browser saving fails.",
                );
              }}
            />
          )}
          <footer className="workspace-footer">
            <span>Browser sandbox</span>
            <span>StoreCraft · Learning demo</span>
          </footer>
        </main>
      </div>
      {editor && (
        <ProductEditor
          product={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSave={(p) => {
            const next = products.some((item) => item.id === p.id)
              ? products.map((item) => (item.id === p.id ? p : item))
              : [...products, p];
            setProducts(next);
            persist(next, settings);
            setEditor(null);
            setNotice(
              "Product updated. A warning appears above if browser saving fails.",
            );
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Badge({ text }: { text: string }) {
  return <span className={`badge ${text.toLowerCase()}`}>{text}</span>;
}
