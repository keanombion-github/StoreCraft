import { test, expect } from "@playwright/test";

test("builder settings stay in view, Escape closes them, and Undo restores deletion", async ({page}, testInfo) => {
  if (testInfo.project.name === "desktop") await page.setViewportSize({width:1024,height:900});
  await page.goto("/");
  await page.getByRole("button", {name:"Page builder",exact:true}).click();
  await page.getByRole("button", {name:"Edit in page builder",exact:true}).first().click();
  await expect(page.locator(".widget-library-card")).toHaveCount(10);
  await expect(page.getByRole("button", {name:"Add Text",exact:true})).toHaveCount(1);
  await expect(page.getByRole("button", {name:"Add Container",exact:true})).toHaveCount(1);
  await page.getByRole("button",{name:"Edit Hero",exact:true}).click();
  const inspector = page.getByRole("complementary", {name:"Widget editor"});
  const bounds = await inspector.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(inspector).toHaveCount(0);
  if (testInfo.project.name === "phone") {
    await page.getByRole("button", {name:"Hide widgets",exact:true}).click();
    await expect(page.getByRole("button",{name:"Add Hero",exact:true})).toBeHidden();
    await page.getByRole("button", {name:"Show widgets",exact:true}).click();
    await expect(page.getByRole("button",{name:"Add Hero",exact:true})).toBeVisible();
  }
  const header = page.locator('.store-region-header').first();
  await header.getByRole("button",{name:"Delete Announcement",exact:true}).click();
  await expect(header.locator('.widget-announcement')).toHaveCount(0);
  await page.getByRole("button",{name:"Undo",exact:true}).click();
  await expect(header.locator('.widget-announcement')).toHaveCount(1);
  await page.getByLabel("Add widgets to", {exact:true}).selectOption("Main");
  await page.getByRole("button",{name:"Add Html",exact:true}).click();
  await inspector.getByLabel("HTML height").fill("300");
  await expect(page.locator('iframe[title="Custom HTML widget"]')).toHaveCSS("height","300px");
});
