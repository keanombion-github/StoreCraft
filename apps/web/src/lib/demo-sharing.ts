import { zlibSync, Unzlib, strToU8, strFromU8 } from "fflate";
import type { PageDocument, CatalogProduct } from "./commerce";
import { regions, widgets } from "./storefront-themes";
import { validateHtmlWidget } from "./html-widget";
import { validateThemePackage } from "./theme-packages";
export type SharedStore = {
  version: 1;
  document: PageDocument;
  products: CatalogProduct[];
  storeName: string;
};
const MAX_LINK = 16000;
const MAX_EXPANDED = 200000;
const image = (value: unknown) =>
  typeof value === "string" &&
  value.length <= 100000 &&
  (!value ||
    /^https:\/\//.test(value) ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max;
export function validateSharedStore(value: SharedStore) {
  if (!value || value.version !== 1 || !text(value.storeName, 100))
    throw new Error("Invalid shared storefront.");
  const page = value.document;
  if (
    !page ||
    page.schemaVersion !== 2 ||
    !/^#[a-f0-9]{6}$/i.test(page.accent) ||
    !["Inter", "Georgia"].includes(page.font) ||
    !["midnight", "linen"].includes(page.themeId ?? "midnight") ||
    !["essentials", "editorial"].includes(page.templateId ?? "essentials") ||
    !image(page.logo ?? "") ||
    !text(page.logoAlt ?? "", 150) ||
    !Array.isArray(page.sections) ||
    page.sections.length < 1 ||
    page.sections.length > 24
  )
    throw new Error("Invalid shared page design.");
  if (page.themePackage) validateThemePackage(page.themePackage);
  const ids = new Set<string>();
  for (const section of page.sections) {
    if (
      !section ||
      !text(section.id, 80) ||
      !section.id ||
      ids.has(section.id) ||
      !regions.includes(section.region ?? "Main") ||
      !(section.parentId
        ? regions.some((r) => widgets[r].includes(section.type))
        : widgets[section.region ?? "Main"].includes(section.type)) ||
      !text(section.title, 150) ||
      !text(section.text, 1000) ||
      !text(section.button, 50) ||
      !image(section.image) ||
      (section.productIds !== undefined &&
        (!Array.isArray(section.productIds) ||
          section.productIds.length > 24 ||
          section.productIds.some((id) => !text(id, 80))))
    )
      throw new Error("Invalid shared widget.");
    if (
      section.type === "Html" &&
      validateHtmlWidget(section.html ?? "", section.htmlHeight ?? 240)
    )
      throw new Error("Invalid shared HTML widget.");
    ids.add(section.id);
    if (
      section.type === "Container" &&
      (section.parentId ||
        !Number.isInteger(section.columns ?? 2) ||
        (section.columns ?? 2) < 1 ||
        (section.columns ?? 2) > 8 ||
        ![0, 8, 16, 24, 32, 48].includes(section.gap ?? 24) ||
        !["start", "center", "end"].includes(section.alignment ?? "start") ||
        page.sections.filter((child) => child.parentId === section.id).length >
          8)
    )
      throw new Error("Invalid shared columns.");
  }
  for (const section of page.sections)
    if (section.parentId !== undefined) {
      const parent = page.sections.find((item) => item.id === section.parentId);
      if (
        !parent ||
        parent.type !== "Container" ||
        parent.parentId ||
        ["Container", "Navigation", "Footer"].includes(section.type) ||
        section.region !== parent.region ||
        !Number.isInteger(section.column) ||
        section.column! < 0 ||
        section.column! >= (parent.columns ?? 2)
      )
        throw new Error("Invalid shared column placement.");
    }
  if (!Array.isArray(value.products) || value.products.length > 50)
    throw new Error("Share up to 50 demo products.");
  for (const product of value.products)
    if (
      !product ||
      product.imagePath !== undefined ||
      !text(product.id, 80) ||
      !text(product.title, 150) ||
      !text(product.description, 2000) ||
      !text(product.slug, 100) ||
      !Number.isSafeInteger(product.priceMinorUnits) ||
      product.priceMinorUnits < 0 ||
      product.priceMinorUnits > 100000000 ||
      !Number.isSafeInteger(product.stockQuantity) ||
      product.stockQuantity < 0 ||
      product.stockQuantity > 1000000 ||
      !image(product.imageUrl ?? "") ||
      !text(product.imageAlt ?? "", 150)
    )
      throw new Error("Invalid shared product.");
  return value;
}
export function createDemoShareUrl(
  page: PageDocument,
  products: CatalogProduct[],
  storeName: string,
  origin: string,
) {
  const snapshot: SharedStore = {
    version: 1,
    document: { ...page, themeLibrary: undefined },
    products: products
      .filter((p) => p.status === "Active")
      .map((p) => ({ ...p, imagePath: undefined })),
    storeName,
  };
  validateSharedStore(snapshot);
  const json = JSON.stringify(snapshot);
  if (strToU8(json).length > MAX_EXPANDED)
    throw new Error(
      "This design is too large for a share link. Use smaller images or a lighter theme.",
    );
  const bytes = zlibSync(strToU8(json), { level: 9 });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (encoded.length > MAX_LINK)
    throw new Error(
      "This design is too large for a share link. Use HTTPS image links instead of large uploaded images.",
    );
  return `${origin}/shared-storefront#${encoded}`;
}
export function readDemoShareUrl(hash: string): SharedStore {
  const encoded = hash.replace(/^#/, "");
  if (
    !encoded ||
    encoded.length > MAX_LINK ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  )
    throw new Error("This share link is incomplete or invalid.");
  const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inflate = new Unzlib((chunk) => {
    total += chunk.length;
    if (total > MAX_EXPANDED)
      throw new Error("This shared storefront is too large.");
    chunks.push(chunk);
  });
  const compressed = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  for (let i = 0; i < compressed.length; i += 64)
    inflate.push(compressed.subarray(i, i + 64), i + 64 >= compressed.length);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return validateSharedStore(JSON.parse(strFromU8(bytes)) as SharedStore);
}
