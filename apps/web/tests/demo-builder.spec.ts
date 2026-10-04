import { test, expect } from "@playwright/test";

test("widget library places cards in canvas regions and opens the matching editor", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Widget editor" }),
  ).toHaveCount(0);
  const source = page.getByRole("button", {
    name: "Add ImageText to Main",
    exact: true,
  });
  const mainSlot = page.locator('[data-drop-region="Main"]').first();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer: transfer });
  await mainSlot.dispatchEvent("dragover", { dataTransfer: transfer });
  await expect(mainSlot).toHaveClass(/accepts-widget/);
  if (testInfo.project.name === "desktop") await source.dragTo(mainSlot);
  else await mainSlot.dispatchEvent("drop", { dataTransfer: transfer });
  const editor = page.getByRole("complementary", { name: "Widget editor" });
  await expect(editor).toContainText("Main / ImageText");
  await editor.getByLabel("Title", { exact: true }).fill("A new image story");
  await expect(
    page.getByRole("heading", { name: "A new image story" }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close widget editor" }).click();
  await page.getByRole("heading", { name: "A new image story" }).click();
  await expect(editor.getByLabel("Image URL (HTTPS)")).toBeVisible();
  await page
    .getByRole("button", { name: "Add Announcement to Footer", exact: true })
    .click();
  await expect(editor).toContainText("Footer / Announcement");
  await expect(editor.getByLabel("Image URL (HTTPS)")).toHaveCount(0);
  await source.dispatchEvent("dragstart", { dataTransfer: transfer });
  await page
    .locator('[data-drop-region="Header"]')
    .first()
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.locator("p[role=alert]")).toContainText(
    "ImageText cannot go in Header",
  );
  await page.screenshot({
    path: testInfo.outputPath("builder.png"),
    fullPage: true,
  });
});

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
  await page.getByRole("button", { name: "Edit Hero", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A portfolio visitor's design");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page.getByRole("button", { name: "Edit Hero", exact: true }).click();
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
