import { test, expect, type Page } from "@playwright/test";

test("product changes survive reload and active visibility controls storefront", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page
    .getByRole("button", { name: "Add product", exact: false })
    .first()
    .click();
  const editor = page.getByRole("dialog", { name: "Add a product" });
  await editor.getByLabel("Product title").fill("Learning mug");
  await editor
    .getByLabel("Description")
    .fill("A fictional product for our first learning slice.");
  await editor.getByLabel("Price (SGD)").fill("12.50");
  await editor.getByLabel("Stock quantity").fill("3");
  await editor.getByRole("button", { name: "Save product" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Learning mug Simple product" }),
  ).toBeVisible();
  page = await openStore(page);
  await expect(
    page.getByRole("button", { name: "View Learning mug", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Learning mug", exact: true })
    .click();
  await page.getByLabel("Visibility").selectOption("Active");
  await page.getByRole("button", { name: "Save product" }).click();
  page = await openStore(page);
  await expect(
    page.getByRole("button", { name: "View Learning mug", exact: true }),
  ).toBeVisible();
  const product = page.locator("article").filter({
    has: page.getByRole("button", { name: "View Learning mug", exact: true }),
  });
  await product.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("button", { name: "Bag (1)", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("$17.50");
  await page.getByLabel("Quantity for Learning mug").fill("3");
  await expect(page.getByRole("dialog")).toContainText("$42.50");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Your bag is waiting");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("settings, navigation, failed payment handling and responsive layout", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Settings", exact: false })
    .first()
    .click();
  await page.getByLabel("Store name").fill("Kean’s Corner");
  await page.getByLabel("Flat rate (SGD)").fill("7");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Settings", exact: false })
    .first()
    .click();
  await expect(page.getByLabel("Store name")).toHaveValue("Kean’s Corner");
  await page
    .getByRole("button", { name: "Orders", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "SC-1040", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Simulate marking shipped" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "SC-1042", exact: true }).click();
  await page.getByRole("button", { name: "Simulate marking shipped" }).click();
  await expect(page.locator(".order-detail")).toContainText(
    "Fulfillment: Shipped",
  );
  await page
    .getByRole("button", { name: "Home", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Overview dashboard" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Everyday things. A little more considered.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search products" })
    .fill("no such product");
  await expect(
    page.getByRole("heading", { name: "No products found" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search products" }).fill("");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  page = await openStore(page);
  await expect(page.locator(".store-wordmark")).toContainText("Kean’s Corner");
  await expect(
    page.getByRole("button", {
      name: "View Quiet moments notebook",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("storefront.png"),
    fullPage: true,
  });
});

async function openStore(page: Page) {
  const popupPromise = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "View store ↗", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForURL("**/s/sunday-supply");
  await expect(
    page.getByRole("button", { name: "View store ↗", exact: true }),
  ).toBeVisible();
  return popup;
}
