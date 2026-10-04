import { test, expect, type Page } from "@playwright/test";

const owner = "12345678-1234-1234-1234-123456789012";
const productId = "11111111-1111-1111-1111-111111111111";
const product = {
  id: productId,
  title: "Stoneware cup",
  slug: "stoneware-cup",
  description: "A handmade stoneware cup with a soft glaze.",
  priceMinorUnits: 2400,
  stockQuantity: 8,
  status: "Active",
  sku: "CUP",
  imagePath: "",
  imageAlt: "",
};
const initialDocument = {
  schemaVersion: 2,
  themeId: "midnight",
  templateId: "essentials",
  accent: "#a78bfa",
  font: "Inter",
  logo: "",
  logoAlt: "",
  sections: [
    {
      id: "nav",
      type: "Navigation",
      region: "Header",
      title: "",
      text: "Considered essentials",
      image: "",
      button: "Collection",
    },
    {
      id: "hero",
      type: "Hero",
      region: "Main",
      title: "Your original story",
      text: "This content should survive a theme change.",
      image: "",
      button: "Shop",
    },
    {
      id: "catalog",
      type: "FeaturedProducts",
      region: "Main",
      title: "The collection",
      text: "",
      image: "",
      button: "",
    },
    {
      id: "footer",
      type: "Footer",
      region: "Footer",
      title: "Thank you",
      text: "",
      image: "",
      button: "",
    },
  ],
};
const store = {
  id: owner,
  name: "Test studio",
  slug: "test-studio",
  contactEmail: "studio@example.com",
  shippingMinorUnits: 500,
  freeShippingThreshold: 10000,
  pickupEnabled: true,
  pickupAddress: "Fixture collection point",
  publishedVersionId: "fixture",
};

async function merchantSession(page: Page) {
  await page.addInitScript(
    ({ owner }) => {
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const jwt =
        btoa(JSON.stringify({ alg: "ES256", typ: "JWT" })) +
        "." +
        btoa(
          JSON.stringify({ sub: owner, role: "authenticated", exp: expires }),
        ) +
        ".fixture";
      localStorage.setItem(
        "sb-pqwzqabkrwnkatqkgohl-auth-token",
        JSON.stringify({
          access_token: jwt,
          refresh_token: "fixture",
          token_type: "bearer",
          expires_at: expires,
          expires_in: 3600,
          user: {
            id: owner,
            email: "studio@example.com",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-10-04T00:00:00Z",
          },
        }),
      );
    },
    { owner },
  );
}

test("themes preserve content, regions constrain widgets, drafts and publishing stay separate", async ({
  page,
}) => {
  await merchantSession(page);
  let draft = structuredClone(initialDocument);
  let published = structuredClone(initialDocument);
  await page.route("http://localhost:5050/api/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/page/publish")) {
      published = route.request().postDataJSON();
      draft = published;
      await route.fulfill({ json: { publishedAt: "fixture" } });
    } else if (url.endsWith("/page")) {
      if (method === "PUT") {
        draft = route.request().postDataJSON();
        await route.fulfill({ json: { saved: true } });
      } else
        await route.fulfill({ json: { document: draft, published: true } });
    } else if (url.includes("/products"))
      await route.fulfill({ json: [product] });
    else if (url.includes("/orders")) await route.fulfill({ json: [] });
    else if (url.includes("/public/stores"))
      await route.fulfill({
        json: { store, document: published, products: [product] },
      });
    else await route.fulfill({ json: store });
  });
  await page.goto("/merchant");
  await page.getByRole("button", { name: "Page builder", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your original story" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Linen/ }).click();
  await expect(page.locator(".theme-linen")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your original story" }),
  ).toBeVisible();
  await page
    .getByLabel("Title", { exact: true })
    .fill("A merchant's own story");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved. Your published shop is unchanged."),
  ).toBeVisible();
  expect(published.themeId).toBe("midnight");
  expect(draft.themeId).toBe("linen");
  await page
    .getByRole("button", { name: "Footer", exact: false })
    .filter({ hasText: /^Footer1$/ })
    .click();
  await expect(page.getByLabel("New widget in Footer")).toHaveValue(
    "Announcement",
  );
  await expect(
    page.getByLabel("New widget in Footer").locator("option"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Main", exact: false })
    .filter({ hasText: /^Main2$/ })
    .click();
  await page
    .getByRole("button", { name: "Move Hero down", exact: true })
    .click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByText("Published. Your public shop now uses this design."),
  ).toBeVisible();
  expect(
    published.sections.filter((s) => s.region === "Main").map((s) => s.type),
  ).toEqual(["FeaturedProducts", "Hero"]);
  expect(published.sections.find((s) => s.id === "hero")!.title).toBe(
    "A merchant's own story",
  );
  const link = page.getByRole("link", { name: "View published" });
  await expect(link).toHaveAttribute("target", "_blank");
  await page
    .getByRole("button", { name: "Phone preview", exact: true })
    .click();
  expect(
    await page
      .locator(".phone-preview")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(390);
});

test("public search, product details, pickup quote and failed payment keep the bag", async ({
  page,
}) => {
  await page.route("http://localhost:5050/api/public/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/quote")) {
      const input = route.request().postDataJSON();
      const shipping = input.fulfillmentMethod === "Pickup" ? 0 : 500;
      await route.fulfill({
        json: { subtotal: 2400, shipping, total: 2400 + shipping },
      });
    } else if (url.includes("/checkout")) {
      expect(route.request().postDataJSON().fulfillmentMethod).toBe("Pickup");
      await route.fulfill({ json: { id: productId, token: "fixture" } });
    } else if (url.includes("/orders/"))
      await route.fulfill({
        json: {
          reference: "SC-FAILED",
          paymentState: "Failed",
          fulfillmentState: "Unfulfilled",
          fulfillmentMethod: "Pickup",
          total: 2400,
          shipping: 0,
          items: [
            { productId, title: product.title, quantity: 1, unitPrice: 2400 },
          ],
        },
      });
    else
      await route.fulfill({
        json: { store, document: initialDocument, products: [product] },
      });
  });
  await page.goto("/s/test-studio");
  await page.getByLabel("Search this collection").fill("missing");
  await expect(page.getByText("No products match your search.")).toBeVisible();
  await page.getByLabel("Search this collection").fill("stoneware");
  await page.getByRole("button", { name: "View Stoneware cup" }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog.getByText(product.description)).toBeVisible();
  await dialog.getByRole("button", { name: "Add to bag", exact: true }).click();
  await page.getByLabel("Fulfillment method").selectOption("Pickup");
  await page.getByLabel("Name", { exact: true }).fill("Fixture shopper");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.com");
  await page.getByLabel("Test payment outcome").selectOption("Failed");
  await page.getByRole("button", { name: "Place test order" }).click();
  await expect(
    page.getByRole("heading", { name: "Test payment failed" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Bag (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Continue shopping" }).click();
  await page.getByRole("button", { name: "Bag (1)" }).click();
  await expect(
    page.getByRole("heading", { name: "Bag and test checkout" }),
  ).toBeVisible();
});

test("product images reject unsupported files and save an owned upload with alt text", async ({
  page,
}) => {
  await merchantSession(page);
  let saved: { imagePath?: string; imageAlt?: string } = {};
  let uploads = 0;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN49/QqAAVtAqnjGVhuAAAAAElFTkSuQmCC",
    "base64",
  );
  await page.route(
    "https://pqwzqabkrwnkatqkgohl.supabase.co/storage/v1/**",
    async (route) => {
      if (route.request().method() === "POST") {
        uploads++;
        expect(route.request().url()).toContain(`/storecraft-assets/${owner}/`);
        await route.fulfill({ json: { Key: "fixture", Id: "fixture" } });
      } else await route.fulfill({ contentType: "image/png", body: png });
    },
  );
  await page.route("http://localhost:5050/api/merchant/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/products") && route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { ...product, ...saved } });
    } else if (url.includes("/products"))
      await route.fulfill({ json: [product] });
    else if (url.includes("/orders")) await route.fulfill({ json: [] });
    else if (url.includes("/page"))
      await route.fulfill({ json: { document: initialDocument } });
    else await route.fulfill({ json: store });
  });
  await page.goto("/merchant");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: product.title, exact: true }).click();
  const form = page.locator(".live-product-form");
  const input = form.getByLabel("Upload image", { exact: true });
  await input.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(form.getByRole("alert")).toContainText("JPEG, PNG, or WebP");
  expect(uploads).toBe(0);
  await input.setInputFiles({
    name: "cup.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    form.getByRole("link", { name: "View uploaded image" }),
  ).toBeVisible();
  await form.getByLabel("Image alternative text").fill("A cream stoneware cup");
  await form.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Product saved to your store.")).toBeVisible();
  expect(saved.imagePath).toMatch(new RegExp(`^${owner}/[a-f0-9-]{36}\\.png$`));
  expect(saved.imageAlt).toBe("A cream stoneware cup");
  expect(uploads).toBe(1);
});

test("the full catalog includes products outside the home selection and paginates", async ({ page }) => {
  const products = Array.from({ length: 10 }, (_, index) => ({ ...product, id: `11111111-1111-1111-1111-${String(index + 1).padStart(12, "0")}`, title: `Studio piece ${index + 1}` }));
  const document = { ...initialDocument, sections: initialDocument.sections.map(section => section.type === "FeaturedProducts" ? { ...section, productIds: [products[0].id] } : section) };
  await page.route("http://localhost:5050/api/public/**", route => route.fulfill({ json: { store, document, products } }));
  await page.goto("/s/test-studio");
  await expect(page.locator(".shop-product")).toHaveCount(1);
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/test-studio\/catalog$/);
  await expect(page.getByRole("heading", { name: "The full collection" })).toBeVisible();
  await expect(page.locator(".shop-product")).toHaveCount(8);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".shop-product")).toHaveCount(2);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByLabel("Search this collection").fill("Studio piece 9");
  await expect(page.locator(".shop-product")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Studio piece 9" })).toBeVisible();
});
