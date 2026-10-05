"use client";
import { useRef, useState } from "react";
import { request } from "@/lib/commerce";
import { money, type Product, type Settings } from "@/lib/demo-data";
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
  onBusyChange,
}: {
  products: Product[];
  cart: Record<string, number>;
  settings: Settings;
  onPaid: () => void;
  onBack: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [method, setMethod] = useState("Delivery");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const pending = useRef<{ key: string; body: string } | null>(null);
  const subtotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] ?? 0),
    0,
  );
  const shipping =
    method === "Pickup" || subtotal >= settings.threshold
      ? 0
      : settings.shipping;
  const locked = useRef(false);
  if (result)
    return (
      <div className="demo-checkout-result" role="status">
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <h2>
          {result.paymentState === "Paid"
            ? "Order confirmed"
            : "Test payment declined"}
        </h2>
        <p>
          Your order <strong>{result.reference}</strong> was saved in
          StoreCraft.
        </p>
        <p>
          {result.paymentState === "Paid"
            ? "Payment simulated successfully. No money was charged."
            : "No money was charged. Your bag is unchanged so you can try again."}
        </p>
        <p>
          {result.fulfillmentMethod === "Pickup"
            ? "Pickup at the demo collection counter, Singapore"
            : "Delivery to Singapore"}
        </p>
        <p>
          Total: <strong>{money(result.total)}</strong>
        </p>
        <p className="muted">
          You can see this test order in your dashboard’s Orders view on this
          browser.
        </p>
        <button className="shop-button bag-continue" onClick={onBack}>
          Continue shopping
        </button>
        <a className="text-link" href={`/?view=Orders`}>
          View orders in dashboard
        </a>
      </div>
    );
  return (
    <form
      className="demo-checkout-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (locked.current) return;
        locked.current = true;
        setBusy(true);
        onBusyChange(true);
        setError("");
        const fields = new FormData(event.currentTarget);
        const details = {
          items: products
            .filter((p) => cart[p.id])
            .map((p) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              quantity: cart[p.id],
            })),
          name: String(fields.get("name")),
          email: String(fields.get("email")),
          street: String(fields.get("street") ?? ""),
          city: String(fields.get("city") ?? ""),
          postalCode: String(fields.get("postalCode") ?? ""),
          outcome: String(fields.get("outcome")),
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
          if (response.paymentState === "Paid") onPaid();
          pending.current = null;
        } catch (failure) {
          setError((failure as Error).message);
        } finally {
          locked.current = false;
          setBusy(false);
          onBusyChange(false);
        }
      }}
    >
      <h2>Test checkout</h2>
      <p className="info-note">
        Use fictional details. This creates a saved test order; no real payment,
        delivery, or email is sent.
      </p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <label>
          Fulfillment
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="Delivery">Delivery to Singapore</option>
            <option value="Pickup">Free pickup in store</option>
          </select>
        </label>
        {method === "Pickup" && (
          <p className="muted">Demo collection counter, Singapore</p>
        )}
        <label>
          Name
          <input name="name" required maxLength={100} placeholder="Alex Demo" />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="alex@example.com"
          />
        </label>
        {method === "Delivery" && (
          <>
            <label>
              Street address
              <input
                name="street"
                required
                maxLength={300}
                placeholder="123 Demo Street"
              />
            </label>
            <div className="checkout-address-row">
              <label>
                City
                <input
                  name="city"
                  required
                  maxLength={100}
                  defaultValue="Singapore"
                />
              </label>
              <label>
                Postal code
                <input
                  name="postalCode"
                  required
                  maxLength={20}
                  placeholder="123456"
                />
              </label>
            </div>
          </>
        )}
        <label>
          Simulated payment
          <select name="outcome">
            <option value="Paid">Successful payment</option>
            <option value="Failed">Declined payment</option>
          </select>
        </label>
      </fieldset>
      <div className="cart-totals">
        <p>
          Subtotal<span>{money(subtotal)}</span>
        </p>
        <p>
          {method === "Pickup" ? "Pickup" : "Shipping"}
          <span>{money(shipping)}</span>
        </p>
        <strong>
          Total<span>{money(subtotal + shipping)}</span>
        </strong>
      </div>
      <button
        className="shop-button bag-continue"
        disabled={busy || subtotal === 0}
        type="submit"
      >
        {busy ? "Saving order…" : "Place test order"}
      </button>
      <button
        className="text-link"
        type="button"
        disabled={busy}
        onClick={onBack}
      >
        Back to bag
      </button>
    </form>
  );
}
