"use client";
/* eslint-disable @next/next/no-img-element -- Public uploaded images and HTTPS widget assets. */
import { useEffect, useRef, useState } from "react";
import type { CatalogProduct, PageDocument, Section } from "@/lib/commerce";
import { normalizePage, regionOf, regions } from "@/lib/storefront-themes";
import { money } from "@/lib/demo-data";
import { assetUrl } from "./image-upload";

function ProductImage({ product }: { product: CatalogProduct }) {
  const url = product.imagePath
    ? assetUrl(product.imagePath)
    : product.imageUrl?.startsWith("https://")
      ? product.imageUrl
      : "";
  return url ? (
    <img
      className="published-product-photo"
      src={url}
      alt={product.imageAlt || product.title}
      loading="lazy"
    />
  ) : (
    <div className="product-placeholder" aria-label="No product image">
      {product.title.slice(0, 1)}
    </div>
  );
}
function Collection({
  section,
  products,
  onAdd,
}: {
  section: Section;
  products: CatalogProduct[];
  onAdd?: (product: CatalogProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
  }, [detail]);
  const featured = section.productIds?.length
    ? products.filter((product) => section.productIds!.includes(product.id))
    : products;
  const filtered = featured.filter((product) =>
    `${product.title} ${product.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 8) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <>
      <div className="collection-heading">
        <div>
          <span className="store-eyebrow">Selected for you</span>
          <h2>{section.title || "Collection"}</h2>
          <p>{section.text}</p>
        </div>
        <label className="catalog-search">
          Search this collection
          <input
            type="search"
            value={query}
            placeholder="Find something you love"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="product-grid">
        {filtered.slice(currentPage * 8, currentPage * 8 + 8).map((product) => (
          <article key={product.id} className="shop-product">
            <button
              className="product-detail-link"
              onClick={() => setDetail(product)}
              aria-label={`View ${product.title}`}
            >
              <ProductImage product={product} />
              <h3>{product.title}</h3>
            </button>
            <div className="product-card-bottom">
              <strong>{money(product.priceMinorUnits)}</strong>
              <span>
                {product.stockQuantity > 0 ? "Available" : "Sold out"}
              </span>
            </div>
            <button
              className="add-bag"
              disabled={!onAdd || product.stockQuantity === 0}
              onClick={() => onAdd?.(product)}
            >
              {product.stockQuantity === 0
                ? "Out of stock"
                : onAdd
                  ? "Add to bag +"
                  : "Preview only"}
            </button>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="store-empty">
          {query
            ? "No products match your search."
            : "Our next collection is coming soon."}
        </p>
      )}
      {lastPage > 0 && (
        <div className="catalog-pagination">
          <button
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {lastPage + 1}
          </span>
          <button
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="store-product-dialog"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <button
              className="dialog-close"
              aria-label="Close product details"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
            <ProductImage product={detail} />
            <div>
              <span className="store-eyebrow">The collection</span>
              <h2>{detail.title}</h2>
              <p className="product-description">{detail.description}</p>
              <strong>{money(detail.priceMinorUnits)}</strong>
              <p>
                {detail.stockQuantity > 0
                  ? `${detail.stockQuantity} available`
                  : "Out of stock"}
              </p>
              <button
                className="widget-button"
                disabled={!onAdd || detail.stockQuantity === 0}
                onClick={() => {
                  onAdd?.(detail);
                  dialog.current?.close();
                }}
              >
                {onAdd ? "Add to bag" : "Preview only"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function PageRenderer({
  document,
  products,
  storeName,
  contactEmail,
  catalogHref = "#catalog",
  onAdd,
  onSelect,
  selected,
  onDropWidget,
  onDragWidget,
  canDropWidget,
}: {
  document: PageDocument;
  products: CatalogProduct[];
  storeName: string;
  contactEmail?: string;
  catalogHref?: string;
  onAdd?: (product: CatalogProduct) => void;
  onSelect?: (id: string) => void;
  selected?: string;
  onDropWidget?: (
    payload: string,
    region: "Header" | "Main" | "Footer",
    beforeId: string,
  ) => void;
  onDragWidget?: (id: string) => void;
  canDropWidget?: (region: "Header" | "Main" | "Footer") => boolean;
}) {
  const page = normalizePage(document);
  return (
    <div
      className={`widget-page theme-${page.themeId ?? "midnight"} template-${page.templateId ?? "essentials"}`}
      style={
        {
          "--page-accent": page.accent,
          fontFamily:
            page.font === "Georgia" ? "Georgia, serif" : "Inter, sans-serif",
        } as React.CSSProperties
      }
    >
      {regions.map((region) => (
        <div
          key={region}
          className={`store-region store-region-${region.toLowerCase()}`}
          data-region={region}
        >
          {onSelect && <div className="preview-region-label">{region}</div>}
          {onDropWidget && (
            <div
              className={`canvas-drop-slot ${canDropWidget?.(region) ? "accepts-widget" : ""}`}
              data-drop-region={region}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = canDropWidget?.(region)
                  ? "copy"
                  : "none";
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDropWidget(
                  event.dataTransfer.getData("text/plain"),
                  region,
                  page.sections.find((s) => regionOf(s) === region)?.id ?? "",
                );
              }}
            >
              Drop a widget in {region}
            </div>
          )}
          {page.sections
            .filter((section) => regionOf(section) === region)
            .map((section) => (
              <section
                key={section.id}
                id={
                  section.type === "FeaturedProducts"
                    ? page.sections.find(
                        (item) => item.type === "FeaturedProducts",
                      )?.id === section.id
                      ? "catalog"
                      : `catalog-${section.id}`
                    : undefined
                }
                className={`widget-section widget-${section.type.toLowerCase()} ${selected === section.id && onSelect ? "preview-selected" : ""}`}
                onClickCapture={
                  onSelect
                    ? (event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            ".preview-edit,.canvas-drop-slot",
                          )
                        )
                          return;
                        event.preventDefault();
                        event.stopPropagation();
                        onSelect(section.id);
                      }
                    : undefined
                }
              >
                {onSelect && (
                  <button
                    className="preview-edit"
                    draggable={!!onDragWidget}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", section.id);
                      onDragWidget?.(section.id);
                    }}
                    onClick={() => onSelect(section.id)}
                  >
                    Edit {section.type}
                  </button>
                )}
                {section.type === "Navigation" ? (
                  <header className="widget-store-header">
                    <a
                      href={
                        catalogHref === "#catalog"
                          ? "#"
                          : catalogHref.replace(/\/catalog$/, "")
                      }
                      className="store-wordmark"
                    >
                      {page.logo ? (
                        <img src={page.logo} alt={page.logoAlt || storeName} />
                      ) : (
                        <strong>{section.title || storeName}</strong>
                      )}
                    </a>
                    <span>{section.text}</span>
                    <a href={catalogHref}>{section.button || "Collection"}</a>
                  </header>
                ) : section.type === "Hero" || section.type === "ImageText" ? (
                  <>
                    <div>
                      <span className="store-eyebrow">
                        {section.type === "Hero"
                          ? "Welcome to the collection"
                          : "Our story"}
                      </span>
                      <h2>{section.title}</h2>
                      <p>{section.text}</p>
                      {section.button && (
                        <a className="widget-button" href={catalogHref}>
                          {section.button} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>
                    {section.image && (
                      <img
                        src={section.image}
                        alt={section.title}
                        loading={section.type === "Hero" ? "eager" : "lazy"}
                      />
                    )}
                  </>
                ) : section.type === "FeaturedProducts" ? (
                  <Collection
                    section={section}
                    products={products}
                    onAdd={onAdd}
                  />
                ) : section.type === "Footer" ? (
                  <footer>
                    <div>
                      <strong className="footer-store-name">{storeName}</strong>
                      <h2>{section.title}</h2>
                      <p>{section.text}</p>
                    </div>
                    <div>
                      <a href={catalogHref}>Explore the collection</a>
                      {contactEmail && (
                        <a href={`mailto:${contactEmail}`}>Contact us</a>
                      )}
                      <span>
                        © {new Date().getFullYear()} {storeName}
                      </span>
                    </div>
                  </footer>
                ) : (
                  <div className="store-announcement">
                    <strong>{section.title}</strong>
                    {section.text && <span>{section.text}</span>}
                  </div>
                )}
                {onDropWidget && (
                  <div
                    className={`canvas-drop-slot ${canDropWidget?.(region) ? "accepts-widget" : ""}`}
                    data-drop-region={region}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const list = page.sections.filter(
                        (s) => regionOf(s) === region,
                      );
                      onDropWidget(
                        event.dataTransfer.getData("text/plain"),
                        region,
                        list[list.findIndex((s) => s.id === section.id) + 1]
                          ?.id ?? "",
                      );
                    }}
                  >
                    Drop widget here
                  </div>
                )}
              </section>
            ))}
        </div>
      ))}
    </div>
  );
}
