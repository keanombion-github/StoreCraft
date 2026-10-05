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
    await page.getByRole("button", { name: "Checkout", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Test checkout" });
    await dialog
      .getByRole("combobox", { name: "Fulfillment", exact: true })
      .selectOption("Pickup");
    await dialog.getByLabel("Name", { exact: true }).fill("Alex Demo");
    await dialog.getByLabel("Email", { exact: true }).fill("alex@example.com");
    await dialog
      .getByRole("combobox", { name: "Simulated payment", exact: true })
      .selectOption(outcome);
    await dialog.getByRole("button", { name: "Place test order" }).click();
    await expect(
      dialog.getByText("SC-DEMO-TEST", { exact: true }),
    ).toBeVisible();
    expect(submissions).toBe(1);
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    );
    await dialog.getByRole("button", { name: "Continue shopping" }).click();
    await page.getByRole("button", { name: "Continue shopping" }).click();
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
