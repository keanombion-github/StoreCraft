"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { request } from "@/lib/commerce";
import { money, type Product, type Settings } from "@/lib/demo-data";
import { OrderSummary, storefrontPath } from "./order-summary";
import { saveCheckoutOrder } from "@/lib/demo-checkout";

type Result = {
  id: string;
  token: string;
  reference: string;
  paymentState: string;
  fulfillmentState: string;
  fulfillmentMethod: string;
  total: number;
  shipping: number;
  createdAt: string;
  items: { title: string; quantity: number }[];
};
export function DemoCheckout({
  products,
  cart,
  settings,
  onPaid,
  onBack,
}: {
  products: Product[];
  cart: Record<string, number>;
  settings: Settings;
  onPaid: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft] = useState(() => {
    const defaults = {
      name: "",
      email: "",
      street: "",
      city: "Singapore",
      postalCode: "",
    };
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("storecraft-checkout-draft-v1") ?? "null",
      );
      if (
        saved &&
        Object.keys(defaults).every(
          (key) =>
            typeof saved.guest?.[key] === "string" &&
            saved.guest[key].length <= 300,
        )
      )
        return {
          guest: saved.guest as typeof defaults,
          method: saved.method === "Pickup" ? "Pickup" : "Delivery",
        };
    } catch {
      /* Invalid or unavailable drafts start fresh. */
    }
    return { guest: defaults, method: "Delivery" };
  });
  const [method, setMethod] = useState(draft.method);
  const [guest, setGuest] = useState(draft.guest);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "storecraft-checkout-draft-v1",
        JSON.stringify({ guest, method }),
      );
    } catch {
      /* Checkout works without draft storage. */
    }
  }, [guest, method]);
  const [outcome, setOutcome] = useState("Paid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(() => window.innerWidth > 850);
  const pending = useRef<{ key: string; body: string } | null>(null);
  const locked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    heading.current?.focus({ preventScroll: !mounted.current });
    mounted.current = true;
  }, [step, result]);
  const subtotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] ?? 0),
    0,
  );
  const shipping =
    method === "Pickup" || subtotal >= settings.threshold
      ? 0
      : settings.shipping;
  const update = (field: keyof typeof guest, value: string) =>
    setGuest({ ...guest, [field]: value });
  const submit = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const details = {
      items: products
        .filter((p) => cart[p.id])
        .map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          quantity: cart[p.id],
        })),
      ...guest,
      outcome,
      fulfillmentMethod: method,
      shipping: settings.shipping,
      threshold: settings.threshold,
    };
    const body = JSON.stringify(details);
    if (pending.current?.body !== body)
      pending.current = { key: crypto.randomUUID(), body };
    try {
      const response = await request<Result>(
        "/api/demo/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            ...details,
            idempotencyKey: pending.current.key,
          }),
        },
        false,
      );
      setResult(response);
      try {
        saveCheckoutOrder({
          id: response.id,
          token: response.token,
          reference: response.reference,
          customer: details.name,
          email: details.email,
          address:
            method === "Pickup"
              ? "Demo collection counter, Singapore"
              : `${details.street}, ${details.city}, ${details.postalCode}, Singapore`,
          date: new Date(response.createdAt).toLocaleDateString(),
          total: response.total,
          shipping: response.shipping,
          payment: response.paymentState,
          fulfillment: response.fulfillmentState,
          fulfillmentMethod: response.fulfillmentMethod,
          items: response.items
            .map((i) => `${i.title} × ${i.quantity}`)
            .join(", "),
        });
      } catch {
        setError(
          "Your order was saved, but browser storage is unavailable. Keep the order reference.",
        );
      }
      if (response.paymentState === "Paid") {
        try {
          sessionStorage.removeItem("storecraft-checkout-draft-v1");
        } catch {
          /* The saved order remains valid. */
        }
        onPaid();
      }
      pending.current = null;
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="commerce-grid checkout-grid">
      <section className="checkout-content">
        <nav aria-label="Checkout progress" className="checkout-progress">
          <Link href={storefrontPath + "/cart"}>Cart</Link>
          {["Information", "Shipping", "Payment"].map((label, i) => (
            <span key={label}>
              <span aria-hidden="true">›</span>
              <button
                type="button"
                aria-current={!result && step === i ? "step" : undefined}
                disabled={busy || i >= step || !!result}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
              >
                {label}
              </button>
            </span>
          ))}
        </nav>
        {result ? (
          <div className="demo-checkout-result" role="status">
            <span className="commerce-eyebrow">{result.reference}</span>
            <h1 ref={heading} tabIndex={-1}>
              {result.paymentState === "Paid"
                ? "Thank you for your order"
                : "Test payment declined"}
            </h1>
            <p>
              Your order <strong>{result.reference}</strong> was saved in
              StoreCraft.
            </p>
            <p>
              {result.paymentState === "Paid"
                ? "Payment simulated successfully. No money was charged."
                : "No money was charged. Your cart is unchanged so you can try again."}
            </p>
            <div className="checkout-review">
              <p>
                <span>Contact</span>
                <strong>{guest.email}</strong>
              </p>
              <p>
                <span>Method</span>
                <strong>
                  {method === "Pickup"
                    ? "Pickup at demo collection counter, Singapore"
                    : "Delivery to Singapore"}
                </strong>
              </p>
              <p>
                <span>Total</span>
                <strong>{money(result.total)}</strong>
              </p>
            </div>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            <p className="commerce-caption">
              Your test order is available in this browser’s dashboard.
            </p>
            <Link className="commerce-primary" href="/?view=Orders">
              View order in dashboard
            </Link>
            <Link
              className="commerce-text-button"
              href={
                result.paymentState === "Paid"
                  ? storefrontPath
                  : storefrontPath + "/cart"
              }
            >
              {result.paymentState === "Paid"
                ? "Continue shopping"
                : "Return to cart and retry"}
            </Link>
          </div>
        ) : (
          <form
            className="demo-checkout-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 2) {
                setStep(step + 1);
                setError("");
              } else void submit();
            }}
          >
            <h1 ref={heading} tabIndex={-1}>
              {["Contact and delivery", "Shipping method", "Payment"][step]}
            </h1>
            <p className="commerce-caption">
              Use fictional details. Payments and delivery are simulated.
            </p>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
            {step > 0 && (
              <div className="checkout-review">
                <p>
                  <span>Contact</span>
                  <strong>{guest.email}</strong>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep(0)}
                  >
                    Change
                  </button>
                </p>
                <p>
                  <span>{method === "Pickup" ? "Pickup" : "Ship to"}</span>
                  <strong>
                    {method === "Pickup"
                      ? "Demo collection counter, Singapore"
                      : `${guest.street}, ${guest.city}, ${guest.postalCode}`}
                  </strong>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep(0)}
                  >
                    Change
                  </button>
                </p>
                {step === 2 && (
                  <p>
                    <span>Method</span>
                    <strong>
                      {method === "Pickup"
                        ? "Pickup in store"
                        : "Standard delivery"}{" "}
                      · {shipping === 0 ? "Free" : money(shipping)}
                    </strong>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStep(1)}
                    >
                      Change
                    </button>
                  </p>
                )}
              </div>
            )}
            <fieldset disabled={busy}>
              {step === 0 && (
                <>
                  <h2>Contact</h2>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      value={guest.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="alex@example.com"
                    />
                  </label>
                  <label>
                    Name
                    <input
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={guest.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Alex Demo"
                    />
                  </label>
                  <h2>Delivery</h2>
                  <div className="checkout-options">
                    <label className={method === "Delivery" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="method"
                        value="Delivery"
                        checked={method === "Delivery"}
                        onChange={() => setMethod("Delivery")}
                      />
                      <span>
                        Ship to my address<small>Singapore delivery</small>
                      </span>
                    </label>
                    <label className={method === "Pickup" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="method"
                        value="Pickup"
                        checked={method === "Pickup"}
                        onChange={() => setMethod("Pickup")}
                      />
                      <span>
                        Pick up in store<small>Free collection</small>
                      </span>
                    </label>
                  </div>
                  {method === "Delivery" ? (
                    <>
                      <label>
                        Country / region
                        <select
                          aria-label="Country / region"
                          value="SG"
                          onChange={() => {}}
                        >
                          <option value="SG">Singapore</option>
                        </select>
                      </label>
                      <label>
                        Street address
                        <input
                          required
                          maxLength={300}
                          autoComplete="street-address"
                          value={guest.street}
                          onChange={(e) => update("street", e.target.value)}
                          placeholder="123 Demo Street"
                        />
                      </label>
                      <div className="checkout-address-row">
                        <label>
                          City
                          <input
                            required
                            maxLength={100}
                            autoComplete="address-level2"
                            value={guest.city}
                            onChange={(e) => update("city", e.target.value)}
                          />
                        </label>
                        <label>
                          Postal code
                          <input
                            required
                            maxLength={20}
                            autoComplete="postal-code"
                            value={guest.postalCode}
                            onChange={(e) =>
                              update("postalCode", e.target.value)
                            }
                            placeholder="123456"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="checkout-location">
                      <h3>Demo collection counter</h3>
                      <p>Singapore · Free pickup</p>
                      <p>
                        We’ll mark your order ready for collection in the demo
                        dashboard.
                      </p>
                    </div>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <h2>
                    {method === "Pickup"
                      ? "Pickup location"
                      : "Available shipping"}
                  </h2>
                  <div className="checkout-options">
                    <label className="selected">
                      <input type="radio" name="shipping" checked readOnly />
                      <span>
                        {method === "Pickup"
                          ? "Demo collection counter, Singapore"
                          : "Standard delivery"}
                        <small>
                          {method === "Pickup"
                            ? "Collect once your order is ready"
                            : "Test delivery within Singapore"}
                        </small>
                      </span>
                      <strong>
                        {shipping === 0 ? "Free" : money(shipping)}
                      </strong>
                    </label>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Simulated payment provider</h2>
                  <p className="commerce-caption">
                    Choose a result to test the order flow. No card details are
                    needed.
                  </p>
                  <label>
                    Simulated payment
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                    >
                      <option value="Paid">Successful payment</option>
                      <option value="Failed">Declined payment</option>
                    </select>
                  </label>
                  <p className="checkout-location">
                    Your test order will be saved when you place it. No real
                    money is charged.
                  </p>
                </>
              )}
            </fieldset>
            <div className="checkout-actions">
              <button
                className="commerce-text-button"
                type="button"
                disabled={busy}
                onClick={() => {
                  if (step === 0) onBack();
                  else setStep(step - 1);
                }}
              >
                {step === 0 ? "← Return to cart" : "← Back"}
              </button>
              <button
                className="commerce-primary"
                disabled={busy || subtotal === 0}
                type="submit"
              >
                {busy
                  ? "Saving order…"
                  : step === 0
                    ? "Continue to shipping"
                    : step === 1
                      ? "Continue to payment"
                      : "Place test order"}
              </button>
            </div>
          </form>
        )}
      </section>
      <aside className="commerce-summary checkout-summary">
        <details
          open={summaryOpen}
          onToggle={(e) => setSummaryOpen(e.currentTarget.open)}
        >
          <summary>
            <span>Order summary</span>
            <strong>
              {money(subtotal + (step === 0 && !result ? 0 : shipping))}
            </strong>
          </summary>
          <OrderSummary
            products={products}
            cart={cart}
            shipping={step === 0 && !result ? null : shipping}
          />
        </details>
      </aside>
    </div>
  );
}
