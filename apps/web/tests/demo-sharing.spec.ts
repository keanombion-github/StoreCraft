import { test, expect } from "@playwright/test";
import { zlibSync, strToU8 } from "fflate";

test("published demo share opens in a fresh browser without changing its workspace", async ({page, browser}) => {
  await page.goto("/");
  await page.getByRole("button", {name:"Page builder",exact:true}).click();
  await page.getByRole("button", {name:"Edit in page builder",exact:true}).first().click();
  await page.getByRole("button",{name:"Edit Hero",exact:true}).click();
  await page.getByRole("complementary",{name:"Widget editor"}).getByLabel("Title",{exact:true}).fill("A shared collection");
  await page.getByRole("button",{name:"Publish",exact:true}).click();
  await page.getByRole("button",{name:"Share published demo",exact:true}).click();
  const link = page.getByRole("link",{name:"Open shared storefront"});
  const url = await link.getAttribute("href");
  expect(url).toContain("/shared-storefront#");
  const context = await browser.newContext();
  const recipient = await context.newPage();
  await recipient.goto(url!);
  await expect(recipient.getByRole("heading",{name:"A shared collection",exact:true})).toBeVisible();
  expect(await recipient.evaluate(() => localStorage.getItem("storecraft-demo-published"))).toBeNull();
  await recipient.goto("/");
  await recipient.getByRole("button",{name:"Page builder",exact:true}).click();
  await recipient.getByRole("button",{name:"Edit in page builder",exact:true}).first().click();
  await expect(recipient.getByRole("heading",{name:"A shared collection",exact:true})).toHaveCount(0);
  await context.close();
});

test("sharing rejects invalid and oversized compressed content", async ({page}) => {
  const compressed = Buffer.from(zlibSync(strToU8(JSON.stringify({junk:"x".repeat(300000)})))).toString("base64url");
  await page.goto(`/shared-storefront#${compressed}`);
  await expect(page.getByText("This shared storefront link is invalid or incomplete.", {exact:false})).toBeVisible();
  await page.goto("/shared-storefront#invalid");
  await expect(page.getByText("This shared storefront link is invalid or incomplete.", {exact:false})).toBeVisible();
});
