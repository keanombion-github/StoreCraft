import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { zipSync, unzipSync, strToU8 } from "fflate";

const starter = path.resolve("public/theme-packages/atelier.zip");

test("local theme images are embedded and oversized expanded files are rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page.locator(".theme-upload-panel > summary").click();
  const files = unzipSync(new Uint8Array(readFileSync(starter)));
  files["atelier/assets/sample.png"] = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49/QqAAVtAqnjGVhuAAAAAElFTkSuQmCC",
      "base64",
    ),
  );
  files["atelier/widgets/hero.html"] = strToU8(
    '<h2>{{title}}</h2><img src="{{asset:assets/sample.png}}" alt="Local package image">',
  );
  await page.getByLabel("Upload theme ZIP").setInputFiles({
    name: "images.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync(files)),
  });
  await page
    .getByRole("article", { name: "Atelier theme" })
    .getByRole("button", { name: "Edit in page builder" })
    .click();
  const image = page
    .frameLocator('iframe[title="Atelier Hero"]')
    .getByRole("img", { name: "Local package image" });
  await expect(image).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(image).toBeVisible();
  await page.getByRole("button", { name: "← Theme library" }).click();
  await page.locator(".theme-upload-panel > summary").click();
  files["atelier/assets/large.txt"] = new Uint8Array(600_000);
  await page.getByLabel("Upload theme ZIP").setInputFiles({
    name: "oversized.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync(files)),
  });
  await expect(page.locator('p[role="alert"]')).toContainText(
    "individual file exceeds 500 KB",
  );
  await expect(
    page.getByRole("article", { name: "Atelier theme" }),
  ).toBeVisible();
});

test("uploaded HTML theme retains editable content, publishing and the working bag", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page.locator(".theme-upload-panel > summary").click();
  await page.getByLabel("Upload theme ZIP").setInputFiles(starter);
  await expect(
    page.getByRole("article", { name: "Atelier theme" }),
  ).toBeVisible();
  await page
    .getByRole("article", { name: "Atelier theme" })
    .getByRole("button", { name: "Edit in page builder" })
    .click();
  await expect(
    page
      .frameLocator('iframe[title="Atelier Hero"]')
      .getByText("The Atelier collection"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Hero", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("<b>A visitor's custom theme</b>");
  await expect(
    page.frameLocator('iframe[title="Atelier Hero"]').getByRole("heading"),
  ).toHaveText("<b>A visitor's custom theme</b>");
  await page
    .getByRole("button", { name: "Edit Navigation", exact: true })
    .click();
  const editor = page.getByRole("complementary", { name: "Widget editor" });
  await expect(editor.getByLabel("Title", { exact: true })).toHaveCount(0);
  await expect(editor.getByLabel("Text", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page.locator(".theme-upload-panel > summary").click();
  await expect(
    page.getByRole("article", { name: "Atelier theme" }),
  ).toBeVisible();
  await page
    .getByRole("article", { name: "Atelier theme" })
    .getByRole("button", { name: "Edit in page builder" })
    .click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("link", { name: "View published" }).click();
  const popup = await popupPromise;
  await expect(
    popup.frameLocator('iframe[title="Atelier Hero"]').getByRole("heading"),
  ).toHaveText("<b>A visitor's custom theme</b>");
  await popup
    .getByRole("button", { name: "Add to bag", exact: false })
    .first()
    .click();
  await popup.getByRole("button", { name: "Bag (1)" }).click();
  await expect(popup.getByRole("dialog")).toContainText("Everyday ceramic mug");
  await page.getByRole("button", { name: "← Theme library" }).click();
  await page
    .getByRole("article", { name: "Midnight theme" })
    .getByRole("button", { name: "Edit in page builder" })
    .click();
  await expect(page.locator("iframe.package-widget-frame")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "<b>A visitor's custom theme</b>" }),
  ).toBeVisible();
});

test("theme import rejects scripts and invalid archive paths without replacing the design", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page.locator(".theme-upload-panel > summary").click();
  const files = unzipSync(new Uint8Array(readFileSync(starter)));
  files["atelier/widgets/hero.html"] = strToU8(
    "<script>window.parent.localStorage.clear()</script>",
  );
  await page.getByLabel("Upload theme ZIP").setInputFiles({
    name: "unsafe.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync(files)),
  });
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Unsupported HTML tag",
  );
  await expect(page.locator("iframe.package-widget-frame")).toHaveCount(0);
  await page.getByLabel("Upload theme ZIP").setInputFiles({
    name: "paths.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "../theme.json": strToU8("{}") })),
  });
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Invalid archive paths",
  );
  await page
    .getByRole("article", { name: "Midnight theme" })
    .getByRole("button", { name: "Edit in page builder" })
    .click();
  await page.locator(".editor-layout-settings > summary").click();
  await expect(
    page.getByRole("heading", {
      name: "Everyday things. A little more considered.",
    }),
  ).toBeVisible();
  const option = page.getByLabel("Starting layout").locator("option").last();
  await expect(option).toHaveCSS("color", "rgb(244, 237, 249)");
  await expect(option).toHaveCSS("background-color", "rgb(33, 24, 43)");
});
