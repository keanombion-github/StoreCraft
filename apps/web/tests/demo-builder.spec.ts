import { test, expect } from "@playwright/test";

test("portfolio builder works without auth and publishes only to this browser", async ({
  page,
  context,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/merchant/")) writes.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Merchant sign in" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A portfolio visitor's design");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "A portfolio visitor's design",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("link", { name: "View published" }).click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "A portfolio visitor's design" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  const isolated = await context.browser()!.newContext();
  const fresh = await isolated.newPage();
  await fresh.goto("http://localhost:3000/s/sunday-supply");
  await expect(
    fresh.getByRole("heading", { name: "A portfolio visitor's design" }),
  ).toHaveCount(0);
  await isolated.close();
});
