/* eslint-disable @next/next/no-img-element -- Demo product photography. */
import { money, photo, type Product } from "@/lib/demo-data";
export const storefrontPath = "/s/sunday-supply";
export function OrderSummary({
  products,
  cart,
  shipping,
  totalLabel = "Total",
  showItems = true,
}: {
  products: Product[];
  cart: Record<string, number>;
  shipping: number | null;
  totalLabel?: string;
  showItems?: boolean;
}) {
  const subtotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] ?? 0),
    0,
  );
  return (
    <div className="commerce-summary-content">
      {showItems && (
        <div className="commerce-summary-items">
          {products
            .filter((p) => cart[p.id])
            .map((p) => (
              <div className="commerce-summary-item" key={p.id}>
                <div className="commerce-thumbnail">
                  <img src={photo(p.image, 150)} alt="" />
                  <span>{cart[p.id]}</span>
                </div>
                <strong>{p.title}</strong>
                <span>{money(p.price * cart[p.id])}</span>
              </div>
            ))}
        </div>
      )}
      <div className="commerce-totals">
        <p>
          Subtotal<span>{money(subtotal)}</span>
        </p>
        <p>
          Shipping
          <span>
            {shipping === null
              ? "Calculated next step"
              : shipping === 0
                ? "Free"
                : money(shipping)}
          </span>
        </p>
        <strong>
          {totalLabel}
          <span>
            <small>SGD</small> {money(subtotal + (shipping ?? 0))}
          </span>
        </strong>
      </div>
      <p className="commerce-caption">
        Test checkout · No real payment or delivery
      </p>
    </div>
  );
}
