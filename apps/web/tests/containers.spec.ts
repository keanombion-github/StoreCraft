import { test, expect } from "@playwright/test";

test("containers retain editable children, remap columns, and publish responsive layouts", async ({page}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Page builder", exact: true}).click();
  await page.getByRole("button", {name: "Edit in page builder", exact: true}).first().click();
  await page.getByRole("button", {name: "Add Container to Main", exact: true}).click();
  const inspector = page.getByRole("complementary", {name: "Widget editor"});
  await inspector.getByLabel("Columns", {exact:true}).selectOption("8");
  await inspector.getByLabel("Add widgets to column").selectOption("7");
  await page.getByRole("button", {name: "Add ImageText to Main", exact:true}).click();
  await inspector.getByLabel("Title", {exact:true}).fill("Inside column eight");
  const container = page.locator(".widget-container");
  await expect(container.locator('[data-column="7"] .widget-imagetext')).toContainText("Inside column eight");
  await inspector.getByRole("button", {name:"Edit parent container", exact:true}).click();
  await inspector.getByLabel("Columns", {exact:true}).selectOption("2");
  await expect(container.locator('[data-column="1"] .widget-imagetext')).toContainText("Inside column eight");
  if (testInfo.project.name === "phone") await inspector.getByRole("button", {name:"Close widget editor",exact:true}).click();
  await container.getByRole("button", {name: "Edit ImageText", exact:true}).click();
  await inspector.getByLabel("Text", {exact:true}).fill("Child stays editable");
  await inspector.getByLabel("Placement", {exact:true}).selectOption("Main");
  await expect(container.locator(".widget-imagetext")).toHaveCount(0);
  await inspector.getByLabel("Placement", {exact:true}).selectOption({label:"Column layout · Column 1"});
  await expect(container.locator('[data-column="0"] .widget-imagetext')).toContainText("Child stays editable");
  await page.getByRole("button", {name: "Publish", exact:true}).click();
  await page.reload();
  await page.getByRole("button", {name: "Page builder", exact:true}).click();
  await page.getByRole("button", {name: "Edit in page builder", exact:true}).first().click();
  await expect(page.locator(".widget-container .widget-imagetext")).toContainText("Child stays editable");
  const library = page.locator(".builder-layout > .builder-controls").first();
  await page.locator(".widget-footer").scrollIntoViewIfNeeded();
  await expect(library.getByRole("heading", {name:"Widget library"})).toBeVisible();
  const bounds = await library.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeLessThan(testInfo.project.name === "phone" ? 300 : 150);
  await page.goto("/s/sunday-supply");
  await expect(page.locator(".widget-container .widget-imagetext")).toContainText("Child stays editable");
  if (testInfo.project.name === "phone") {
    const columns = page.locator(".container-column");
    const first = await columns.nth(0).boundingBox();
    const second = await columns.nth(1).boundingBox();
    expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  }
});

test("container drop accepts content and rejects nested containers", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name:"Page builder", exact:true}).click();
  await page.getByRole("button", {name:"Edit in page builder", exact:true}).first().click();
  await page.getByRole("button", {name:"Add Container to Main", exact:true}).click();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page.getByRole("button", {name:"Add Announcement to Main", exact:true}).dispatchEvent("dragstart", {dataTransfer:transfer});
  await page.locator(".container-drop-slot").first().dispatchEvent("drop", {dataTransfer:transfer});
  await expect(page.locator(".widget-container .widget-announcement")).toHaveCount(1);
  await page.getByRole("button", {name:"Add Container to Main", exact:true}).dispatchEvent("dragstart", {dataTransfer:transfer});
  await page.locator(".container-drop-slot").first().dispatchEvent("drop", {dataTransfer:transfer});
  await expect(page.locator(".widget-container")).toHaveCount(1);
});
