import { test, expect } from "@playwright/test";

test("footer can move, be deleted on canvas, and be restored", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit in page builder", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Add Announcement to Footer", exact: true })
    .click();
  const footer = page.locator(".store-region-footer");
  await expect(
    page.getByRole("button", { name: "Add Footer to Footer", exact: true }),
  ).toHaveAttribute("draggable", "true");
  const handle = page.getByRole("button", { name: "Drag Footer", exact: true });
  const slot = footer.locator(".canvas-drop-slot").last();
  if (testInfo.project.name === "desktop") {
    await handle.scrollIntoViewIfNeeded();
    const start = (await handle.boundingBox())!;
    await page.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2 + 15,
      { steps: 5 },
    );
    await slot.scrollIntoViewIfNeeded();
    const end = (await slot.boundingBox())!;
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
      steps: 10,
    });
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2 + 1);
    await page.mouse.up();
  } else {
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await handle.dispatchEvent("dragstart", { dataTransfer: transfer });
    await slot.dispatchEvent("drop", { dataTransfer: transfer });
  }
  await expect(footer.locator(".widget-section").last()).toHaveClass(
    /widget-footer/,
  );
  await page
    .getByRole("button", { name: "Delete Footer", exact: true })
    .click();
  await expect(footer.locator(".widget-footer")).toHaveCount(0);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit in page builder", exact: true })
    .first()
    .click();
  await expect(page.locator(".store-region-footer .widget-footer")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Add Footer to Footer", exact: true })
    .click();
  await expect(page.locator(".store-region-footer .widget-footer")).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("complementary", { name: "Widget editor" }),
  ).toContainText("Footer / Footer");
});

test("widget library places cards in canvas regions and opens the matching editor", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit in page builder", exact: true })
    .first()
    .click();
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
  await page
    .getByRole("button", { name: "Edit in page builder", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Edit Hero", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A portfolio visitor's design");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit in page builder", exact: true })
    .first()
    .click();
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
