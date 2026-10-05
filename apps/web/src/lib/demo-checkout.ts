import { demoOrders } from "./demo-data";
export type DemoOrder = (typeof demoOrders)[number] & {
  id?: string;
  token?: string;
  fulfillmentMethod?: string;
};
const key = "storecraft-checkout-orders-v1";
export function readCheckoutOrders(): DemoOrder[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved)
      ? saved
          .filter(
            (o: DemoOrder) =>
              typeof o.id === "string" &&
              typeof o.token === "string" &&
              typeof o.reference === "string" &&
              typeof o.total === "number",
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function saveCheckoutOrder(order: DemoOrder) {
  const orders = readCheckoutOrders().filter((o) => o.id !== order.id);
  localStorage.setItem(key, JSON.stringify([order, ...orders].slice(0, 100)));
  window.dispatchEvent(new Event("storecraft-orders-changed"));
}
