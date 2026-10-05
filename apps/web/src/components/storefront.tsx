/* eslint-disable @next/next/no-img-element -- Remote demo photography. */
import { useEffect, useRef, useState } from "react";
import { money, photo, type Product, type Settings } from "@/lib/demo-data";
import type { PageDocument } from "@/lib/commerce";
import { demoCatalog } from "@/lib/demo-page";
import { DemoCheckout } from "./demo-checkout";
import { PageRenderer } from "./storefront-renderer";

export function Shop({
  products,
  settings,
  onBack,
  page,
}: {
  products: Product[];
  settings: Settings;
  onBack: () => void;
  page?: PageDocument;
}) {
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("storecraft-demo-bag-v1") ?? "{}",
      );
      return Object.fromEntries(
        products
          .filter(
            (p) =>
              Number.isInteger(saved?.[p.id]) && saved[p.id] > 0 && p.stock > 0,
          )
          .map((p) => [p.id, Math.min(saved[p.id], p.stock, 99)]),
      );
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("storecraft-demo-bag-v1", JSON.stringify(cart));
    } catch {
      /* Browsing still works without storage. */
    }
  }, [cart]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const quantity = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const subtotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] ?? 0),
    0,
  );
  const shipping =
    subtotal === 0 || subtotal >= settings.threshold ? 0 : settings.shipping;
  const shown = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );
  function add(p: Product) {
    setCart((current) => ({
      ...current,
      [p.id]: Math.min(p.stock, 99, (current[p.id] ?? 0) + 1),
    }));
  }
  return (
    <div className="shop">
      <div className="sandbox-bar">
        <button onClick={onBack}>← Back to dashboard</button>
        <span>Sample storefront · Demo only</span>
        {page && (
          <button onClick={() => setCartOpen(true)}>Bag ({quantity})</button>
        )}
      </div>
      {page ? (
        <PageRenderer
          document={page}
          products={demoCatalog(products)}
          storeName={settings.name}
          onAdd={(product) => {
            const original = products.find((p) => p.id === product.id);
            if (original) add(original);
          }}
        />
      ) : (
        <>
          <div className="announcement">
            A little thoughtfulness goes a long way. Free Singapore shipping
            from {money(settings.threshold)}.
          </div>
          <header className="shop-header">
            <a href="#collection">Shop the collection</a>
            <strong>{settings.name}</strong>
            <button onClick={() => setCartOpen(true)}>Bag ({quantity})</button>
          </header>
          <main>
            <section className="shop-hero">
              <div className="hero-copy">
                <span className="eyebrow">LESS, BUT LOVELIER.</span>
                <h1>
                  Everyday things.
                  <br />
                  <em>
                    A little more
                    <br />
                    considered.
                  </em>
                </h1>
                <p>
                  Thoughtful essentials for slow mornings,
                  <br />
                  comfortable spaces, and living well.
                </p>
                <a className="shop-button" href="#collection">
                  Discover the collection ↗
                </a>
                <small>Simple things. Lasting favorites.</small>
              </div>
              <div className="hero-image">
                <img
                  src={photo("photo-1600210492486-724fe5c67fb0", 1400)}
                  alt="A warm living room with natural furniture"
                />
                <span>Room to slow down.</span>
              </div>
            </section>
            <section id="collection" className="collection">
              <div className="collection-heading">
                <div>
                  <span className="eyebrow">THE EVERYDAY EDIT</span>
                  <h2>Find your new favorite.</h2>
                </div>
                <label className="search">
                  <span>⌕</span>
                  <input
                    aria-label="Search storefront products"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search collection…"
                  />
                </label>
              </div>
              <div className="product-grid">
                {shown.map((p) => (
                  <article key={p.id} className="shop-product">
                    <button
                      className="shop-photo"
                      onClick={() => setSelected(p)}
                      aria-label={`View ${p.title}`}
                    >
                      <img src={photo(p.image, 800)} alt={p.title} />
                      {p.stock === 0 && <span>Sold out</span>}
                    </button>
                    <div className="shop-product-title">
                      <button onClick={() => setSelected(p)}>{p.title}</button>
                      <span>{money(p.price)}</span>
                    </div>
                    <small>{p.category}</small>
                    <button
                      className="add-bag"
                      disabled={p.stock === 0 || (cart[p.id] ?? 0) >= p.stock}
                      onClick={() => add(p)}
                    >
                      {p.stock === 0
                        ? "Out of stock"
                        : (cart[p.id] ?? 0) >= p.stock
                          ? "Stock limit reached"
                          : "Add to bag +"}
                    </button>
                  </article>
                ))}
              </div>
              {shown.length === 0 && (
                <p className="empty-state">No products match your search.</p>
              )}
            </section>
            <div className="shop-values">
              <span>✳ Thoughtfully selected</span>
              <span>◇ Everyday quality</span>
              <span>♡ A little more considered</span>
            </div>
          </main>
          <footer className="shop-footer">
            <strong>{settings.name}</strong>
            <p>Good things for everyday living.</p>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
            <small>
              Fictional shop · SGD prices · Tax calculation outside demo scope
            </small>
          </footer>
        </>
      )}
      {(cartOpen || selected) && (
        <ShopDialog
          busy={checkoutBusy}
          title={
            selected
              ? selected.title
              : checkoutOpen
                ? "Test checkout"
                : "Your bag"
          }
          onClose={() => {
            setSelected(null);
            setCartOpen(false);
            setCheckoutOpen(false);
          }}
        >
          {selected ? (
            <>
              <img
                className="detail-photo"
                src={photo(selected.image, 800)}
                alt={selected.title}
              />
              <h2>{selected.title}</h2>
              <p>{money(selected.price)}</p>
              <p className="muted">{selected.description}</p>
              <button
                className="primary"
                disabled={
                  selected.stock === 0 ||
                  (cart[selected.id] ?? 0) >= selected.stock
                }
                onClick={() => {
                  add(selected);
                  setSelected(null);
                  setCartOpen(true);
                }}
              >
                Add to bag
              </button>
            </>
          ) : checkoutOpen ? (
            <DemoCheckout
              products={products}
              cart={cart}
              settings={settings}
              onBusyChange={setCheckoutBusy}
              onPaid={() => setCart({})}
              onBack={() => setCheckoutOpen(false)}
            />
          ) : (
            <>
              <h2>
                Your bag <small>({quantity})</small>
              </h2>
              {quantity === 0 ? (
                <p className="muted">
                  Your bag is waiting for something lovely.
                </p>
              ) : (
                <>
                  {products
                    .filter((p) => cart[p.id])
                    .map((p) => (
                      <div className="cart-line" key={p.id}>
                        <img src={photo(p.image, 150)} alt="" />
                        <div>
                          <strong>{p.title}</strong>
                          <p>{money(p.price)}</p>
                          <label>
                            Quantity{" "}
                            <input
                              aria-label={`Quantity for ${p.title}`}
                              type="number"
                              min="1"
                              max={Math.min(p.stock, 99)}
                              value={cart[p.id]}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (
                                  Number.isInteger(n) &&
                                  n >= 1 &&
                                  n <= Math.min(p.stock, 99)
                                )
                                  setCart({ ...cart, [p.id]: n });
                              }}
                            />
                          </label>
                          <button
                            className="text-link"
                            onClick={() => {
                              const next = { ...cart };
                              delete next[p.id];
                              setCart(next);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  <div className="cart-totals">
                    <p>
                      Subtotal<span>{money(subtotal)}</span>
                    </p>
                    <p>
                      Singapore shipping estimate<span>{money(shipping)}</span>
                    </p>
                    <strong>
                      Estimated total<span>{money(subtotal + shipping)}</span>
                    </strong>
                  </div>
                </>
              )}
              <div className="info-note">
                Try checkout with simulated payments. Test orders are saved; no
                money is charged.
              </div>
              {quantity > 0 && (
                <button
                  className="shop-button bag-continue"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Checkout
                </button>
              )}
              <button
                className="shop-button bag-continue"
                onClick={() => setCartOpen(false)}
              >
                Continue shopping
              </button>
            </>
          )}
        </ShopDialog>
      )}
    </div>
  );
}

function ShopDialog({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="shop-drawer"
      aria-label={title}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return;
        const b = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < b.left ||
          event.clientX > b.right ||
          event.clientY < b.top ||
          event.clientY > b.bottom
        )
          onClose();
      }}
    >
      <button
        className="quiet drawer-close"
        aria-label={
          title === "Your bag" ? "Close bag" : `Close ${title.toLowerCase()}`
        }
        onClick={onClose}
        disabled={busy}
        autoFocus
      >
        Close ✕
      </button>
      {children}
    </dialog>
  );
}
