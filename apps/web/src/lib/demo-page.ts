import type { CatalogProduct, PageDocument } from "./commerce";
import { photo, type Product } from "./demo-data";
import { normalizePage, templateSections, themes } from "./storefront-themes";

export function readDemoPage(published = false): PageDocument {
  try {
    const raw = localStorage.getItem(
      published ? "storecraft-demo-published" : "storecraft-demo-draft",
    );
    if (raw) {
      const page = JSON.parse(raw);
      if (Array.isArray(page.sections) && page.schemaVersion === 2)
        return normalizePage(page);
    }
  } catch {
    /* A damaged browser save falls back to the starter design. */
  }
  return {
    schemaVersion: 2,
    themeId: "midnight",
    templateId: "essentials",
    accent: themes.midnight.accent,
    font: themes.midnight.font,
    sections: templateSections("essentials"),
  };
}

export function demoCatalog(products: Product[]): CatalogProduct[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.id,
    description: p.description,
    sku: p.id,
    priceMinorUnits: p.price,
    stockQuantity: p.stock,
    status: p.status,
    imageUrl: photo(p.image, 700),
    imageAlt: p.title,
  }));
}
