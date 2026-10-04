import { demoOrders, money, type Product } from "@/lib/demo-data";

export function OverviewCards({
  products,
  orders,
}: {
  products: Product[];
  orders: typeof demoOrders;
}) {
  const paid = orders.filter((order) => order.payment === "Paid");
  const days = ["Oct 1, 2026", "Oct 2, 2026", "Oct 3, 2026"];
  const totals = days.map((day) =>
    paid
      .filter((order) => order.date === day)
      .reduce((sum, order) => sum + order.total, 0),
  );
  const maximum = Math.max(...totals, 1);
  const points = totals
    .map(
      (total, index) => `${30 + index * 130},${145 - (total / maximum) * 110}`,
    )
    .join(" ");
  const counts = [
    {
      label: "Active",
      value: products.filter((product) => product.status === "Active").length,
    },
    {
      label: "Draft",
      value: products.filter((product) => product.status === "Draft").length,
    },
    {
      label: "Out of stock",
      value: products.filter((product) => product.stock === 0).length,
    },
  ];
  const waiting = paid.filter(
    (order) => order.fulfillment === "Unfulfilled",
  ).length;
  return (
    <section className="overview-grid" aria-label="Demo business overview">
      <article className="panel overview-card">
        <div className="overview-card-heading">
          <h2>Sales over time</h2>
          <span className="overview-tag">DEMO</span>
        </div>
        <strong className="overview-value">
          {money(paid.reduce((sum, order) => sum + order.total, 0))}
        </strong>
        <p>Paid sample orders · Oct 1–3, 2026</p>
        <svg
          viewBox="0 0 320 180"
          role="img"
          aria-label={`Sample paid sales: October 1 ${money(totals[0])}, October 2 ${money(totals[1])}, October 3 ${money(totals[2])}`}
        >
          <defs>
            <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b488dd" stopOpacity=".3" />
              <stop offset="100%" stopColor="#b488dd" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[35, 90, 145].map((y) => (
            <line
              key={y}
              x1="30"
              x2="290"
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity=".12"
              strokeDasharray="3 5"
            />
          ))}
          <polygon
            points={`30,145 ${points} 290,145`}
            fill="url(#sales-fill)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#bb96e6"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {totals.map((total, i) => (
            <circle
              key={i}
              cx={30 + i * 130}
              cy={145 - (total / maximum) * 110}
              r="4"
              fill="#e2c8fc"
            />
          ))}
          {["Oct 1", "Oct 2", "Oct 3"].map((day, i) => (
            <text
              key={day}
              x={30 + i * 130}
              y="173"
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
            >
              {day}
            </text>
          ))}
        </svg>
      </article>
      <article className="panel overview-card">
        <div className="overview-card-heading">
          <h2>Catalog overview</h2>
          <span className="overview-tag">PRODUCTS</span>
        </div>
        <strong className="overview-value">{products.length}</strong>
        <p>A clear view of your collection</p>
        <div className="overview-bars">
          {counts.map((count) => (
            <div key={count.label}>
              <div className="overview-bar-label">
                <span>{count.label}</span>
                <strong>{count.value}</strong>
              </div>
              <div className="overview-bar-track">
                <span
                  style={{
                    width: `${(count.value / Math.max(products.length, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <small>Stock status can overlap product visibility.</small>
      </article>
      <article className="panel overview-card">
        <div className="overview-card-heading">
          <h2>Fulfillment snapshot</h2>
          <span className="overview-tag">DEMO</span>
        </div>
        <strong className="overview-value">
          {waiting}
          <span className="overview-value-unit"> awaiting shipment</span>
        </strong>
        <p>Paid sample orders ready for your next step</p>
        <div className="fulfillment-list">
          {[
            { label: "Paid orders", value: paid.length },
            {
              label: "Shipped",
              value: paid.filter((order) => order.fulfillment === "Shipped")
                .length,
            },
            {
              label: "Failed payments",
              value: orders.filter((order) => order.payment === "Failed")
                .length,
            },
          ].map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <small>Fictional data, not live business analytics.</small>
      </article>
    </section>
  );
}
