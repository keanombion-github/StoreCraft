import { test, expect } from "@playwright/test";
import path from "node:path";

test("theme library separates previews, edits, uploads and the active storefront", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your themes" }),
  ).toBeVisible();
  const midnight = page.getByRole("article", { name: "Midnight theme" });
  const linen = page.getByRole("article", { name: "Linen theme" });
  await expect(midnight).toContainText("Current active");
  await expect(
    page.getByRole("heading", { name: "Widget library" }),
  ).toHaveCount(0);
  const previewPromise = context.waitForEvent("page");
  await linen.getByRole("button", { name: "Preview storefront" }).click();
  const preview = await previewPromise;
  await expect(preview.locator(".theme-linen")).toBeVisible();
  await expect(midnight).toContainText("Current active");
  await linen.getByRole("button", { name: "Edit in page builder" }).click();
  await expect(
    page.getByRole("heading", { name: "Widget library" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← Theme library" }).click();
  await expect(midnight).toContainText("Current active");
  await linen.getByRole("button", { name: "Set active", exact: true }).click();
  await expect(linen).toContainText("Current active");
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Linen theme" }),
  ).toContainText("Current active");
  await page.locator(".theme-upload-panel > summary").click();
  await page
    .getByLabel("Upload theme ZIP")
    .setInputFiles(path.resolve("public/theme-packages/atelier.zip"));
  const atelier = page.getByRole("article", { name: "Atelier theme" });
  await expect(atelier).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Linen theme" }),
  ).toContainText("Current active");
  await expect(atelier).toContainText("Available");
  await atelier
    .getByRole("button", { name: "Set active", exact: true })
    .click();
  await expect(atelier).toContainText("Current active");
  await midnight
    .getByRole("button", { name: "Set active", exact: true })
    .click();
  await expect(midnight).toContainText("Current active");
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(atelier).toBeVisible();
  await expect(midnight).toContainText("Current active");
});
