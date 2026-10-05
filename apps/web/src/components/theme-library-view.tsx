"use client";
import { ShareStorefront } from "./share-storefront";
import type { PageDocument, CatalogProduct } from "@/lib/commerce";
import { libraryEntries, themeKey } from "@/lib/theme-library";
import { themes } from "@/lib/storefront-themes";
import { downloadTheme } from "@/lib/theme-download";
import { chooseTheme } from "@/lib/theme-library";
import { ThemePackageUpload } from "./theme-package-upload";

export function ThemeLibraryView({
  document,
  published,
  locked,
  onEdit,
  onActivate,
  onPreview,
  onUpload,
  onBusy,
  slug,
  demo = false,
  products = [],
  storeName = "StoreCraft",
}: {
  document: PageDocument;
  published: PageDocument | null;
  locked: boolean;
  onEdit: (id: string) => void;
  onActivate: (id: string) => void;
  onPreview: (id: string) => void;
  onUpload: (page: PageDocument) => void;
  onBusy: (busy: boolean) => void;
  slug: string;
  demo?: boolean;
  products?: CatalogProduct[];
  storeName?: string;
}) {
  const cards = [
    ...Object.entries(themes).map(([id, theme]) => ({
      id,
      name: theme.name,
      description: theme.description,
      accent: theme.accent,
      light: id === "linen",
    })),
    ...libraryEntries(document).map((entry) => ({
      id: entry.id,
      name: entry.themePackage.name,
      description: `Uploaded theme · ${entry.themePackage.version}`,
      accent: entry.accent,
      light: entry.themeId === "linen",
    })),
  ];
  return (
    <section className="theme-manager">
      <header className="theme-manager-heading">
        <div>
          <span className="store-eyebrow">Online store</span>
          <h2>Your themes</h2>
          <p>
            Preview or edit a design. Set active publishes it with your current
            page content.
          </p>
        </div>
        {published && (
          <a
            className="secondary"
            href={`/s/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View live storefront ↗
          </a>
        )}
      </header>
      <ShareStorefront
        published={published}
        products={products}
        storeName={storeName}
        slug={slug}
        demo={demo}
      />
      <section className="theme-active-section" aria-label="Active theme">
        <h3>Active theme</h3>
        {!published && (
          <p>
            No active theme yet. Choose a theme below to publish your
            storefront.
          </p>
        )}
        <div className="theme-active-grid">
          {renderCards(
            cards.filter(
              (card) => published && themeKey(published) === card.id,
            ),
          )}
        </div>
      </section>
      <section
        className="theme-available-section"
        aria-label="Available themes"
      >
        <h3>Theme library</h3>
        <p>Try another design or upload your own theme.</p>
        <ThemePackageUpload
          document={document}
          onChange={onUpload}
          onBusy={onBusy}
          locked={locked}
        />
        <div className="theme-manager-grid">
          {renderCards(
            cards.filter(
              (card) => !published || themeKey(published) !== card.id,
            ),
          )}
        </div>
      </section>
    </section>
  );

  function renderCards(items: typeof cards) {
    return items.map((card) => {
      const active = !!published && themeKey(published) === card.id;
      return (
        <article
          key={card.id}
          className={`theme-manager-card ${active ? "is-active" : ""}`}
          aria-label={`${card.name} theme`}
        >
          <div
            className={`theme-card-preview ${card.light ? "light-preview" : ""}`}
            style={
              { "--theme-card-accent": card.accent } as React.CSSProperties
            }
          >
            <div className="theme-card-header">
              <span>StoreCraft</span>
              <i />
            </div>
            <div className="theme-card-hero">
              <span>A considered collection.</span>
              <i />
            </div>
            <div className="theme-card-products">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="theme-card-info">
            <div>
              <h3>{card.name}</h3>
              {active ? (
                <span className="theme-active-badge">Current active</span>
              ) : (
                <span className="theme-available-badge">Available</span>
              )}
            </div>
            <p>{card.description}</p>
            {themeKey(document) === card.id && !active && (
              <small>Selected draft</small>
            )}
          </div>
          <div className="theme-card-actions">
            <button
              className="primary"
              disabled={locked}
              onClick={() => onEdit(card.id)}
            >
              Edit in page builder
            </button>
            <button
              className="secondary"
              disabled={locked}
              onClick={() => onPreview(card.id)}
            >
              Preview storefront ↗
            </button>
            <button
              className="quiet"
              hidden={active}
              disabled={locked || active}
              onClick={() => onActivate(card.id)}
            >
              {active ? "Active theme" : "Set active"}
            </button>
            <button
              className="quiet"
              disabled={locked}
              onClick={() => downloadTheme(chooseTheme(document, card.id))}
            >
              Download theme
            </button>
          </div>
        </article>
      );
    });
  }
}
