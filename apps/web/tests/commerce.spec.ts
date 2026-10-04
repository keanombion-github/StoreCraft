import { test, expect } from "@playwright/test";

test("merchant sign-in and account creation are available", async ({ page }) => {
  await page.goto("/merchant");
  await expect(page.getByRole("heading", { name: "Sign in to your store" })).toBeVisible();
  await page.getByRole("button", { name: "Create a merchant account" }).click();
  await expect(page.getByRole("heading", { name: "Create your merchant account" })).toBeVisible();
});

test("published widgets and test checkout display a server receipt", async ({ page }) => {
  const id = "11111111-1111-1111-1111-111111111111";
  await page.route("http://localhost:5050/api/public/**", async route => {
    const url = route.request().url();
    if (url.includes("/checkout")) {
      const body = route.request().postDataJSON();
      expect(body.items).toEqual([{ productId: id, quantity: 1 }]);
      expect(body).not.toHaveProperty("priceMinorUnits");
      await route.fulfill({ json: { id, token: "receipt-test" } });
    } else if (url.includes("/orders/")) {
      await route.fulfill({ json: { reference: "SC-TEST", paymentState: "Paid", fulfillmentState: "Unfulfilled", total: 2900, shipping: 500, items: [{ productId: id, title: "Test mug", quantity: 1, unitPrice: 2400 }] } });
    } else {
      await route.fulfill({ json: {
        store: { name: "Widget test shop", slug: "widget-test", shippingMinorUnits: 500, freeShippingThreshold: 10000 },
        document: { schemaVersion: 1, accent: "#956ec6", font: "Inter", sections: [{ id: "collection", type: "FeaturedProducts", title: "Shop the collection", text: "", image: "", button: "" }] },
        products: [{ id, title: "Test mug", slug: "test-mug", description: "A test product", priceMinorUnits: 2400, stockQuantity: 3, status: "Active" }],
      } });
    }
  });
  await page.goto("/s/widget-test");
  await expect(page.getByRole("heading", { name: "Shop the collection" })).toBeVisible();
  await page.getByRole("button", { name: "Add to bag +" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test Shopper");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Street address").fill("Test address");
  await page.getByLabel("Postal code").fill("123456");
  await page.getByRole("button", { name: "Place test order" }).click();
  await expect(page.getByRole("heading", { name: "Test order confirmed" })).toBeVisible();
  await expect(page.getByText("SC-TEST", { exact: true })).toBeVisible();
  await expect(page.getByText("No money was charged.", { exact: false })).toBeVisible();
});
