"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  request,
  type PageDocument,
  type CatalogProduct,
  type StoreRecord,
} from "@/lib/commerce";
import { money } from "@/lib/demo-data";
import { PageRenderer } from "./page-builder";

type PublicData = {
  store: StoreRecord;
  document: PageDocument;
  products: CatalogProduct[];
};
type Receipt = {
  reference: string;
  paymentState: string;
  fulfillmentState: string;
  total: number;
  shipping: number;
  items: {
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }[];
};

const subscribe = () => () => {};
export function PublicStore({ slug }: { slug: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <HydratedStore key={slug} slug={slug} /> : <p className="loading">Opening the store…</p>;
}
function HydratedStore({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`storecraft-cart-${slug}`) ?? "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved) && Object.values(saved).every(n => Number.isInteger(n) && Number(n) > 0 && Number(n) <= 99)) return saved;
    } catch { /* Invalid saved carts reset. */ }
    return {};
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirmationError, setConfirmationError] = useState("");
  async function load() {
    setError("");
    try {
      setData(
        await request<PublicData>(
          `/api/public/stores/${encodeURIComponent(slug)}`,
          {},
          false,
        ),
      );
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  useEffect(() => {
    void request<PublicData>(`/api/public/stores/${encodeURIComponent(slug)}`, {}, false)
      .then(setData).catch(failure => setError(failure.message));
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("order") && hash.get("token"))
      void request<Receipt>(
        `/api/public/orders/${hash.get("order")}?token=${encodeURIComponent(hash.get("token")!)}`,
        {},
        false,
      )
        .then(setReceipt)
        .catch((failure) => setConfirmationError(failure.message));
  }, [slug]);
  function updateCart(next: Record<string, number>) {
    setCart(next);
    setRequestId(crypto.randomUUID());
    try {
      localStorage.setItem(`storecraft-cart-${slug}`, JSON.stringify(next));
    } catch {
      setError(
        "Browser storage is unavailable; your bag cannot survive a reload.",
      );
    }
  }
  if (!data && !error)
    return (
      <p className="loading">
        Opening the store… The API may need a moment to wake up.
      </p>
    );
  if (!data)
    return (
      <main className="auth-page">
        <div className="panel info-card">
          <h1>Store unavailable</h1>
          <p>{error}</p>
          <button className="secondary" onClick={() => void load()}>
            Retry
          </button>
          <Link className="quiet" href="/merchant">
            Merchant sign in
          </Link>
        </div>
      </main>
    );
  const count = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const subtotal = data.products.reduce(
    (sum, product) => sum + (cart[product.id] ?? 0) * product.priceMinorUnits,
    0,
  );
  const shipping =
    subtotal >= data.store.freeShippingThreshold || subtotal === 0
      ? 0
      : data.store.shippingMinorUnits;
  const unavailable = Object.keys(cart).some(
    (id) =>
      !data.products.some(
        (product) => product.id === id && product.stockQuantity >= cart[id],
      ),
  );
  return (
    <div className="shop published-shop">
      <div className="sandbox-bar">
        <Link href="/merchant">Merchant dashboard</Link>
        <span>Demo shop · Test payments only · Singapore shipping</span>
        <button onClick={() => setCartOpen(!cartOpen)}>Bag ({count})</button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {confirmationError && <p className="alert">{confirmationError}</p>}
      {receipt && (
        <section className="panel receipt">
          <h1>
            {receipt.paymentState === "Paid"
              ? "Test order confirmed"
              : "Test payment failed"}
          </h1>
          <p>
            Reference: <strong>{receipt.reference}</strong>
          </p>
          <p>
            Payment: {receipt.paymentState} · Fulfillment:{" "}
            {receipt.fulfillmentState}
          </p>
          <p>
            Total: {money(receipt.total)} · Shipping: {money(receipt.shipping)}
          </p>
          <ul>
            {receipt.items.map((item) => (
              <li key={item.productId}>
                {item.title} × {item.quantity} — {money(item.unitPrice)}
              </li>
            ))}
          </ul>
          <p className="helper">
            No money was charged. Keep this confirmation link private.
          </p>
          <button
            className="secondary"
            onClick={() => {
              setReceipt(null);
              window.history.replaceState(null, "", window.location.pathname);
            }}
          >
            Continue shopping
          </button>
        </section>
      )}
      <PageRenderer
        document={data.document}
        products={data.products}
        storeName={data.store.name}
        onAdd={(product) => {
          const next = Math.min(
            product.stockQuantity,
            99,
            (cart[product.id] ?? 0) + 1,
          );
          updateCart({ ...cart, [product.id]: next });
          setCartOpen(true);
        }}
      />
      {cartOpen && (
        <section className="panel checkout-panel">
          <div className="dialog-heading">
            <h2>Bag and test checkout</h2>
            <button className="quiet" onClick={() => setCartOpen(false)}>
              Close
            </button>
          </div>
          {count === 0 ? (
            <p>Your bag is empty.</p>
          ) : (
            <>
              <div className="checkout-lines">
                {Object.entries(cart).map(([id, quantity]) => {
                  const product = data.products.find(
                    (product) => product.id === id,
                  );
                  return (
                    <div className="cart-line" key={id}>
                      <div>
                        <strong>
                          {product?.title ?? "Unavailable product"}
                        </strong>
                        <p>
                          {product
                            ? money(product.priceMinorUnits)
                            : "Remove this item"}
                        </p>
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={Math.min(product?.stockQuantity ?? 99, 99)}
                            value={quantity}
                            onChange={(event) => {
                              const amount = Number(event.target.value);
                              if (
                                Number.isInteger(amount) &&
                                amount >= 1 &&
                                amount <= 99
                              )
                                updateCart({ ...cart, [id]: amount });
                            }}
                          />
                        </label>
                        <button
                          className="quiet"
                          onClick={() => {
                            const next = { ...cart };
                            delete next[id];
                            updateCart(next);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p>
                Subtotal {money(subtotal)} · Estimated shipping{" "}
                {money(shipping)} · Estimated total{" "}
                <strong>{money(subtotal + shipping)}</strong>
              </p>
              {unavailable && (
                <p className="alert">
                  A product is unavailable or exceeds current stock. Adjust your
                  bag before checkout.
                </p>
              )}
              <form
                className="settings-form"
                onChange={() => setRequestId(crypto.randomUUID())}
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  const fields = new FormData(event.currentTarget);
                  setBusy(true);
                  setError("");
                  try {
                    const result = await request<{ id: string; token: string }>(
                      `/api/public/stores/${encodeURIComponent(slug)}/checkout`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          idempotencyKey: requestId,
                          items: Object.entries(cart).map(
                            ([productId, quantity]) => ({
                              productId,
                              quantity,
                            }),
                          ),
                          name: fields.get("name"),
                          email: fields.get("email"),
                          street: fields.get("street"),
                          city: fields.get("city"),
                          postalCode: fields.get("postal"),
                          country: fields.get("country"),
                          outcome: fields.get("outcome"),
                        }),
                      },
                      false,
                    );
                    window.history.replaceState(
                      null,
                      "",
                      `#order=${result.id}&token=${result.token}`,
                    );
                    try {
                      setReceipt(
                        await request<Receipt>(
                          `/api/public/orders/${result.id}?token=${result.token}`,
                          {},
                          false,
                        ),
                      );
                    } catch {
                      setConfirmationError(
                        "Your order was recorded. Reload this confirmation link to retrieve its result.",
                      );
                    }
                    updateCart({});
                    setCartOpen(false);
                    void load();
                  } catch (failure) {
                    setError((failure as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h3>Guest details</h3>
                <label>
                  Name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Street address
                  <input
                    name="street"
                    required
                    maxLength={300}
                    autoComplete="street-address"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    City
                    <input
                      name="city"
                      required
                      maxLength={100}
                      autoComplete="address-level2"
                      defaultValue="Singapore"
                    />
                  </label>
                  <label>
                    Postal code
                    <input
                      name="postal"
                      required
                      maxLength={20}
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
                <label>
                  Destination
                  <select name="country">
                    <option value="SG">Singapore</option>
                  </select>
                </label>
                <label>
                  Test payment outcome
                  <select name="outcome">
                    <option value="Paid">Simulate successful payment</option>
                    <option value="Failed">Simulate failed payment</option>
                  </select>
                </label>
                <p className="info-note">
                  Demo payments only. No card details are requested and no money
                  moves. The API recalculates prices, shipping, and
                  availability. Tax calculation is outside this demo’s scope.
                </p>
                <button className="primary" disabled={busy || unavailable}>
                  {busy ? "Processing test payment…" : "Place test order"}
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
