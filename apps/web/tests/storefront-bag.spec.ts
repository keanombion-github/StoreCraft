import { test, expect } from "@playwright/test";

test("storefront bag updates quantities and closes without trapping scrolling", async ({ page }) => {
  await page.goto("/s/sunday-supply");
  await page.getByRole("button", { name: "Add to bag +", exact: true }).first().click();
  await page.getByRole("button", { name: /Bag \(/ }).first().click();
  const bag = page.getByRole("dialog", { name: "Your bag" });
  await expect(bag).toBeVisible();
  const quantity = bag.getByRole("spinbutton").first();
  await quantity.fill("2");
  await expect(quantity).toHaveValue("2");
  expect(await bag.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await bag.getByRole("button", { name: "Remove", exact: true }).first().click();
  await expect(bag.getByRole("spinbutton")).toHaveCount(0);
  await bag.getByRole("button", { name: "Continue shopping" }).click();
  await expect(bag).toHaveCount(0);
  await page.getByRole("button", { name: /Bag \(/ }).first().click();
  await page.keyboard.press("Escape");
  await expect(bag).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

