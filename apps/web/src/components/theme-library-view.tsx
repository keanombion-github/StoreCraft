"use client";
import type { PageDocument } from "@/lib/commerce";
import { libraryEntries, themeKey } from "@/lib/theme-library";
import { themes } from "@/lib/storefront-themes";
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
      <div className="theme-manager-grid">
        {cards.map((card) => {
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
                  disabled={locked || active}
                  onClick={() => onActivate(card.id)}
                >
                  {active ? "Active theme" : "Set active"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <details className="panel theme-upload-panel">
        <summary>Upload a new theme</summary>
        <p>
          Add a StoreCraft theme ZIP to your library. Uploading doesn’t change
          the live storefront.
        </p>
        <ThemePackageUpload
          document={document}
          onChange={onUpload}
          onBusy={onBusy}
          locked={locked}
        />
      </details>
    </section>
  );
}
