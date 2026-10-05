"use client";
/* eslint-disable @next/next/no-img-element -- Demo product photography. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { money, photo, type Product, type Settings } from "@/lib/demo-data";
import { DemoCheckout } from "./demo-checkout";

import { OrderSummary, storefrontPath } from "./order-summary";
export function DemoCommercePage({
  mode,
  products,
  settings,
}: {
  mode: "cart" | "checkout";
  products: Product[];
  settings: Settings;
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
      /* Session browsing still works. */
    }
  }, [cart]);
  const count = Object.values(cart).reduce((sum, n) => sum + n, 0);
  return (
    <div className="commerce-page">
      <header className="commerce-header">
        <Link href={storefrontPath} className="commerce-brand">
          {settings.name}
        </Link>
        <Link href={storefrontPath}>Continue shopping</Link>
      </header>
      <main className="commerce-main">
        {count === 0 ? (
          <section className="commerce-empty">
            <h1>Your cart is empty</h1>
            <p>
              Find something you love in the collection, then come back to
              checkout.
            </p>
            <Link className="commerce-primary" href={storefrontPath}>
              Explore the collection
            </Link>
          </section>
        ) : mode === "checkout" ? (
          <DemoCheckout
            products={products}
            cart={cart}
            settings={settings}
            onPaid={() => {
              try {
                localStorage.setItem("storecraft-demo-bag-v1", "{}");
              } catch {
                /* The order is still saved on the API. */
              }
            }}
            onBack={() => window.location.assign(storefrontPath + "/cart")}
          />
        ) : (
          <>
            <div className="commerce-page-heading">
              <div>
                <span className="commerce-eyebrow">YOUR SELECTION</span>
                <h1>
                  Your cart <small>({count})</small>
                </h1>
              </div>
              <Link href={storefrontPath}>Continue shopping →</Link>
            </div>
            <div className="commerce-grid">
              <section className="commerce-cart-items" aria-label="Cart items">
                <div className="commerce-cart-labels">
                  <span>Product</span>
                  <span>Quantity</span>
                  <span>Total</span>
                </div>
                {products
                  .filter((p) => cart[p.id])
                  .map((p) => (
                    <article className="commerce-cart-row" key={p.id}>
                      <img src={photo(p.image, 200)} alt={p.title} />
                      <div className="commerce-cart-product">
                        <h2>{p.title}</h2>
                        <p>{money(p.price)} each</p>
                        <button
                          className="commerce-text-button"
                          aria-label={`Remove ${p.title}`}
                          onClick={() =>
                            setCart((current) => {
                              const next = { ...current };
                              delete next[p.id];
                              return next;
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <label className="commerce-quantity">
                        <span className="sr-only">Quantity for {p.title}</span>
                        <input
                          aria-label={`Quantity for ${p.title}`}
                          type="number"
                          min={1}
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
                      <strong>{money(p.price * cart[p.id])}</strong>
                    </article>
                  ))}
              </section>
              <aside className="commerce-summary">
                <h2>Order summary</h2>
                <OrderSummary
                  products={products}
                  cart={cart}
                  shipping={null}
                  totalLabel="Estimated total"
                  showItems={false}
                />
                <Link
                  className="commerce-primary"
                  href={storefrontPath + "/checkout"}
                >
                  Continue to checkout
                </Link>
                <p className="commerce-caption">
                  Delivery and pickup options are available at checkout.
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
