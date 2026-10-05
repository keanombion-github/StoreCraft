import { test, expect } from "@playwright/test";

for (const outcome of ["Paid", "Failed"]) {
  test(`demo ${outcome} checkout records order and preserves correct bag state`, async ({
    page,
  }) => {
    let submissions = 0;
    await page.route("**/api/demo/checkout", async (route) => {
      const input = route.request().postDataJSON();
      submissions++;
      expect(input.fulfillmentMethod).toBe("Pickup");
      expect(input.items[0].quantity).toBe(1);
      expect(input.idempotencyKey).toBeTruthy();
      await route.fulfill({
        json: {
          id: "test-order-id",
          token: "private-test-token",
          reference: "SC-DEMO-TEST",
          paymentState: outcome,
          fulfillmentState: "Unfulfilled",
          fulfillmentMethod: "Pickup",
          total: 2400,
          shipping: 0,
          createdAt: new Date().toISOString(),
          items: [{ title: "Everyday ceramic mug", quantity: 1 }],
        },
      });
    });
    await page.route(
      "**/api/demo/orders/test-order-id/fulfillment",
      async (route) => {
        expect(route.request().postDataJSON().token).toBe("private-test-token");
        await route.fulfill({ json: { fulfillmentState: "ReadyForPickup" } });
      },
    );
    await page.goto("/s/sunday-supply");
    await page
      .getByRole("button", { name: "Add to bag +", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Bag (1)", exact: true }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await page
      .getByRole("link", { name: "Continue to checkout", exact: true })
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    const dialog = page.locator(".checkout-content");
    await dialog.getByRole("radio", { name: /Pick up in store/ }).check();
    await dialog.getByLabel("Name", { exact: true }).fill("Alex Demo");
    await dialog.getByLabel("Email", { exact: true }).fill("alex@example.com");
    await expect(
      dialog.getByRole("combobox", { name: "Simulated payment", exact: true }),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Continue to shipping" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Shipping method" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Continue to payment" }).click();
    await dialog
      .getByRole("combobox", { name: "Simulated payment", exact: true })
      .selectOption(outcome);
    await dialog.getByRole("button", { name: "Place test order" }).click();
    await expect(
      dialog.getByRole("heading", {name: outcome === "Paid" ? "Thank you for your order" : "Test payment declined"}),
    ).toBeVisible();
    expect(submissions).toBe(1);
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    );
    await page.goto("/s/sunday-supply");
    await expect(
      page.getByRole("button", {
        name: outcome === "Paid" ? "Bag (0)" : "Bag (1)",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/?view=Orders");
    await page
      .getByRole("button", { name: "SC-DEMO-TEST", exact: true })
      .click();
    await expect(page.getByText("Alex Demo · alex@example.com")).toBeVisible();
    if (outcome === "Paid") {
      await page.getByRole("button", { name: "Mark ready for pickup" }).click();
      await expect(
        page.getByRole("button", { name: "Mark collected" }),
      ).toBeVisible();
      await page.reload();
      await page
        .getByRole("button", { name: "SC-DEMO-TEST", exact: true })
        .click();
      await expect(page.getByText(/Fulfillment: ReadyForPickup/)).toBeVisible();
    } else
      await expect(
        page.getByRole("button", { name: "Mark ready for pickup" }),
      ).toHaveCount(0);
  });
}

test("checkout validates information, preserves edits, and shows payment only after shipping", async ({
  page,
}) => {
  await page.goto("/s/sunday-supply");
  await page
    .getByRole("button", { name: "Add to bag +", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Bag (1)", exact: true }).click();
  await page
    .getByRole("link", { name: "Continue to checkout", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await expect(
    page.getByRole("heading", { name: "Contact and delivery" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Simulated payment", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("alex@example.com");
  await page.getByLabel("Name", { exact: true }).fill("Alex Demo");
  await page
    .getByLabel("Street address", { exact: true })
    .fill("123 Demo Street");
  await page.getByLabel("Postal code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await expect(
    page.getByRole("heading", { name: "Shipping method" }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: /Standard delivery/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Simulated payment", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Information", exact: true }).click();
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "123 Demo Street",
  );
  await page
    .getByLabel("Street address", { exact: true })
    .fill("456 Updated Street");
  await page.reload();
  await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
    "456 Updated Street",
  );
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.locator(".checkout-review")).toContainText(
    "456 Updated Street",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
