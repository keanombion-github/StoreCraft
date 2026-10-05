import { test, expect } from "@playwright/test";
test("cart page updates quantities, persists on reload, and handles an empty cart", async ({
  page,
}) => {
  await page.goto("/s/sunday-supply");
  await page
    .getByRole("button", { name: "Add to bag +", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Bag (1)", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  const quantity = page.getByRole("spinbutton").first();
  await quantity.fill("2");
  await expect(quantity).toHaveValue("2");
  await page.reload();
  await expect(page.getByRole("spinbutton").first()).toHaveValue("2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Remove Everyday ceramic mug", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your cart is empty" }),
  ).toBeVisible();
  await page.goto("/s/sunday-supply/checkout");
  await expect(
    page.getByRole("heading", { name: "Your cart is empty" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Place test order" }),
  ).toHaveCount(0);
});
