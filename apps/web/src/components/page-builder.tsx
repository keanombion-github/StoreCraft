"use client";
import { useEffect, useState } from "react";
import {
  request,
  type PageDocument,
  type Section,
  type StoreRecord,
  type CatalogProduct,
} from "@/lib/commerce";
import {
  normalizePage,
  regionOf,
  regions,
  themes,
  templateSections,
  widgets,
  type Region,
} from "@/lib/storefront-themes";
import { ImageUpload } from "./image-upload";
import { PageRenderer } from "./storefront-renderer";
import { readDemoPage } from "@/lib/demo-page";
export { PageRenderer } from "./storefront-renderer";

export function PageBuilder({
  store,
  products,
  onDirtyChange,
  onPublished,
  demo = false,
}: {
  store: StoreRecord;
  products: CatalogProduct[];
  onDirtyChange?: (dirty: boolean) => void;
  onPublished?: () => void;
  demo?: boolean;
}) {
  const [document, setDocument] = useState<PageDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [region, setRegion] = useState<Region>("Main");
  const [widget, setWidget] = useState<Section["type"]>("Hero");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phone, setPhone] = useState(false);
  const [template, setTemplate] = useState<"essentials" | "editorial">(
    "essentials",
  );
  useEffect(() => {
    onDirtyChange?.(dirty || uploading);
  }, [dirty, uploading, onDirtyChange]);
  useEffect(() => {
    let active = true;
    void (
      demo
        ? Promise.resolve({ document: readDemoPage() })
        : request<{ document: PageDocument }>("/api/merchant/page")
    )
      .then((page) => {
        if (!active) return;
        const normalized = normalizePage(page.document);
        setDocument(normalized);
        setSelected(
          normalized.sections.find((s) => regionOf(s) === "Main")?.id ?? "",
        );
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [demo]);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uploading]);
  function change(value: PageDocument) {
    setDocument(value);
    setDirty(true);
    onDirtyChange?.(true);
    setMessage("");
  }
  function select(id: string) {
    setSelected(id);
    const section = document?.sections.find((s) => s.id === id);
    if (section) setRegion(regionOf(section));
  }
  async function save(publish: boolean) {
    if (!document || uploading || busy) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        localStorage.setItem("storecraft-demo-draft", JSON.stringify(document));
        if (publish)
          localStorage.setItem(
            "storecraft-demo-published",
            JSON.stringify(document),
          );
      } else
        await request(
          publish ? "/api/merchant/page/publish" : "/api/merchant/page",
          { method: publish ? "POST" : "PUT", body: JSON.stringify(document) },
        );
      setDirty(false);
      onDirtyChange?.(false);
      setMessage(
        demo
          ? publish
            ? "Published for your browser demo. Open View store to see it."
            : "Draft saved in this browser."
          : publish
            ? "Published. Your public shop now uses this design."
            : "Draft saved. Your published shop is unchanged.",
      );
      if (publish) onPublished?.();
    } catch (failure) {
      setError(
        demo
          ? "Browser saving failed. Storage may be full or disabled; try a smaller image."
          : (failure as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!document)
    return (
      <div className="panel info-card">
        <p>{error || "Loading your page design…"}</p>
        {error && (
          <button
            className="secondary"
            onClick={() => {
              setError("");
              void request<{ document: PageDocument }>("/api/merchant/page")
                .then((page) => {
                  const next = normalizePage(page.document);
                  setDocument(next);
                  setSelected(next.sections[0]?.id ?? "");
                })
                .catch((failure) => setError(failure.message));
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  const section = document.sections.find((item) => item.id === selected);
  const locked = busy || uploading;
  function update(values: Partial<Section>) {
    change({
      ...document!,
      sections: document!.sections.map((item) =>
        item.id === selected ? { ...item, ...values } : item,
      ),
    });
  }
  function reorder(id: string, targetId: string, targetRegion: Region) {
    const item = document!.sections.find((s) => s.id === id);
    if (!item || id === targetId) return;
    if (!widgets[targetRegion].includes(item.type)) {
      setError(`${item.type} cannot go in ${targetRegion}.`);
      return;
    }
    if (
      regionOf(item) === "Main" &&
      targetRegion !== "Main" &&
      document!.sections.filter((s) => regionOf(s) === "Main").length === 1
    ) {
      setError("Keep at least one widget in Main.");
      return;
    }
    const sections = document!.sections.filter((s) => s.id !== id);
    const target = sections.findIndex((s) => s.id === targetId);
    sections.splice(target < 0 ? sections.length : target, 0, {
      ...item,
      region: targetRegion,
    });
    change({ ...document!, sections });
    setError("");
    setRegion(targetRegion);
    setSelected(id);
  }
  return (
    <>
      <div className="builder-toolbar">
        <span role="status">
          {busy
            ? "Saving…"
            : uploading
              ? "Uploading image…"
              : dirty
                ? "Unsaved changes"
                : "Draft up to date"}
        </span>
        <button className="secondary" onClick={() => setPhone(!phone)}>
          {phone ? "Desktop preview" : "Phone preview"}
        </button>
        <button
          className="secondary"
          disabled={locked}
          onClick={() => void save(false)}
        >
          Save draft
        </button>
        <button
          className="primary"
          disabled={locked}
          onClick={() => void save(true)}
        >
          Publish
        </button>
        <a
          className="quiet"
          href={`/s/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View published ↗
        </a>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <fieldset className="builder-fieldset" disabled={locked}>
        <div className="theme-library panel">
          <div>
            <span className="store-eyebrow">Your storefront</span>
            <h2>Choose a theme</h2>
            <p className="muted">
              Change the design while keeping your content.
            </p>
          </div>
          <div className="theme-options">
            {(Object.keys(themes) as (keyof typeof themes)[]).map((id) => (
              <button
                key={id}
                className={`theme-option theme-swatch-${id} ${document.themeId === id ? "active" : ""}`}
                disabled={uploading}
                aria-pressed={document.themeId === id}
                onClick={() =>
                  change({
                    ...document,
                    themeId: id,
                    accent: themes[id].accent,
                    font: themes[id].font,
                  })
                }
              >
                <span className="theme-swatch">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{themes[id].name}</strong>
                <small>{themes[id].description}</small>
              </button>
            ))}
          </div>
          <div className="template-picker">
            <label>
              Starting layout
              <select
                value={template}
                onChange={(event) =>
                  setTemplate(event.target.value as typeof template)
                }
              >
                <option value="essentials">
                  Essentials — collection first
                </option>
                <option value="editorial">Editorial — story first</option>
              </select>
            </label>
            <button
              className="secondary"
              disabled={uploading}
              onClick={() => {
                if (
                  !window.confirm(
                    "Replace the draft widgets with this starting layout? Your products, logo, and theme are kept. The published shop will not change until you publish.",
                  )
                )
                  return;
                change({
                  ...document,
                  templateId: template,
                  sections: templateSections(template),
                });
                setSelected("hero");
                setRegion("Main");
              }}
            >
              Apply layout
            </button>
            <small>Applying a layout replaces draft widgets.</small>
          </div>
        </div>
        <div className="builder-layout">
          <aside className="panel builder-controls">
            <h2>Page regions</h2>
            <p className="helper">
              Drag widgets within a region, or use the arrow buttons.
            </p>
            {regions.map((r) => {
              const items = document.sections.filter(
                (item) => regionOf(item) === r,
              );
              return (
                <div
                  className={`region-list ${region === r ? "active-region" : ""}`}
                  key={r}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!locked)
                      reorder(event.dataTransfer.getData("text/plain"), "", r);
                  }}
                >
                  <button
                    className="region-heading"
                    onClick={() => {
                      setRegion(r);
                      setWidget(r === "Main" ? "Hero" : "Announcement");
                    }}
                    aria-pressed={region === r}
                  >
                    {r}
                    <span>{items.length}</span>
                  </button>
                  {items.map((item, index) => (
                    <div
                      className={`widget-list ${item.id === selected ? "selected-widget" : ""}`}
                      key={item.id}
                      draggable={!locked}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!locked)
                          reorder(
                            event.dataTransfer.getData("text/plain"),
                            item.id,
                            r,
                          );
                      }}
                    >
                      <button
                        className="text-link widget-select"
                        onClick={() => select(item.id)}
                      >
                        {item.type}
                        <small>{item.title || "Store branding"}</small>
                      </button>
                      <div className="widget-actions">
                        <button
                          aria-label={`Move ${item.type} up`}
                          disabled={locked || index === 0}
                          onClick={() =>
                            reorder(item.id, items[index - 1].id, r)
                          }
                        >
                          ↑
                        </button>
                        <button
                          aria-label={`Move ${item.type} down`}
                          disabled={locked || index === items.length - 1}
                          onClick={() =>
                            reorder(items[index + 1].id, item.id, r)
                          }
                        >
                          ↓
                        </button>
                        <button
                          aria-label={`Duplicate ${item.type}`}
                          disabled={
                            locked ||
                            document.sections.length >= 24 ||
                            ["Navigation", "Footer"].includes(item.type)
                          }
                          onClick={() => {
                            const copy = { ...item, id: crypto.randomUUID() };
                            const sections = [...document.sections];
                            sections.splice(
                              sections.findIndex((s) => s.id === item.id) + 1,
                              0,
                              copy,
                            );
                            change({ ...document, sections });
                            select(item.id);
                            setSelected(copy.id);
                          }}
                        >
                          ⧉
                        </button>
                        <button
                          aria-label={`Remove ${item.type}`}
                          disabled={
                            locked ||
                            ["Navigation", "Footer"].includes(item.type) ||
                            (r === "Main" && items.length === 1)
                          }
                          onClick={() => {
                            const sections = document.sections.filter(
                              (s) => s.id !== item.id,
                            );
                            change({ ...document, sections });
                            setSelected(
                              sections.find((s) => regionOf(s) === r)?.id ??
                                sections[0].id,
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="helper">Drop a suitable widget here.</p>
                  )}
                </div>
              );
            })}
            <label>
              New widget in {region}
              <select
                value={
                  widgets[region].includes(widget) &&
                  !["Navigation", "Footer"].includes(widget)
                    ? widget
                    : "Announcement"
                }
                onChange={(event) =>
                  setWidget(event.target.value as Section["type"])
                }
              >
                {widgets[region]
                  .filter((type) => !["Navigation", "Footer"].includes(type))
                  .map((type) => (
                    <option key={type}>{type}</option>
                  ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={locked || document.sections.length >= 24}
              onClick={() => {
                const type =
                  widgets[region].includes(widget) &&
                  !["Navigation", "Footer"].includes(widget)
                    ? widget
                    : "Announcement";
                const item: Section = {
                  id: crypto.randomUUID(),
                  type,
                  region,
                  title: "New section",
                  text: "",
                  image: "",
                  button: "",
                };
                change({ ...document, sections: [...document.sections, item] });
                setSelected(item.id);
              }}
            >
              Add widget
            </button>
            <h2>Brand settings</h2>
            <label>
              Accent color
              <input
                type="color"
                value={document.accent}
                onChange={(event) =>
                  change({ ...document, accent: event.target.value })
                }
              />
            </label>
            <label>
              Font
              <select
                value={document.font}
                onChange={(event) =>
                  change({ ...document, font: event.target.value })
                }
              >
                <option>Inter</option>
                <option>Georgia</option>
              </select>
            </label>
            <ImageUpload
              localOnly={demo}
              label="Upload store logo"
              value={document.logo ?? ""}
              onBusy={(value) => {
                setUploading(value);
                onDirtyChange?.(value || dirty);
              }}
              onChange={(_path, url) =>
                change({
                  ...document,
                  logo: url,
                  logoAlt: document.logoAlt || store.name,
                })
              }
            />
            <label>
              Logo alternative text
              <input
                value={document.logoAlt ?? ""}
                maxLength={150}
                onChange={(event) =>
                  change({ ...document, logoAlt: event.target.value })
                }
              />
            </label>
            {document.logo && (
              <button
                className="quiet"
                disabled={uploading}
                onClick={() => change({ ...document, logo: "", logoAlt: "" })}
              >
                Use store name instead
              </button>
            )}
          </aside>
          <div
            className={
              phone ? "builder-preview phone-preview" : "builder-preview"
            }
          >
            <PageRenderer
              document={document}
              products={products.filter(
                (product) => product.status === "Active",
              )}
              storeName={store.name}
              contactEmail={store.contactEmail}
              onSelect={select}
              selected={selected}
            />
          </div>
          <aside className="panel builder-controls">
            <h2>Widget settings</h2>
            {section ? (
              <>
                <p className="widget-location">
                  {regionOf(section)} / {section.type}
                </p>
                <label>
                  Title
                  <input
                    value={section.title}
                    maxLength={150}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <label>
                  Text
                  <textarea
                    value={section.text}
                    maxLength={1000}
                    rows={5}
                    onChange={(event) => update({ text: event.target.value })}
                  />
                </label>
                {["Hero", "ImageText"].includes(section.type) && (
                  <>
                    <ImageUpload
                      localOnly={demo}
                      value={section.image}
                      onBusy={(value) => {
                        setUploading(value);
                        onDirtyChange?.(value || dirty);
                      }}
                      onChange={(_path, url) => update({ image: url })}
                    />
                    <label>
                      Image URL (HTTPS)
                      <input
                        type="url"
                        value={section.image}
                        maxLength={1000}
                        onChange={(event) =>
                          update({ image: event.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {["Hero", "ImageText", "Navigation"].includes(section.type) && (
                  <label>
                    Button label
                    <input
                      value={section.button}
                      maxLength={50}
                      onChange={(event) =>
                        update({ button: event.target.value })
                      }
                    />
                  </label>
                )}
                {section.type === "FeaturedProducts" && (
                  <fieldset className="featured-product-picker">
                    <legend>Featured products</legend>
                    <p className="helper">
                      Leave all unchecked to show the whole active catalog.
                    </p>
                    {section.productIds?.some(
                      (id) =>
                        !products.some(
                          (product) =>
                            product.id === id && product.status === "Active",
                        ),
                    ) && (
                      <div className="info-note">
                        <p>This collection references unavailable products.</p>
                        <button
                          className="secondary"
                          onClick={() =>
                            update({
                              productIds: section.productIds?.filter((id) =>
                                products.some(
                                  (product) =>
                                    product.id === id &&
                                    product.status === "Active",
                                ),
                              ),
                            })
                          }
                        >
                          Remove unavailable selections
                        </button>
                      </div>
                    )}
                    {products
                      .filter((p) => p.status === "Active")
                      .map((product) => (
                        <label key={product.id}>
                          <input
                            type="checkbox"
                            checked={
                              section.productIds?.includes(product.id) ?? false
                            }
                            disabled={
                              !section.productIds?.includes(product.id) &&
                              (section.productIds?.length ?? 0) >= 24
                            }
                            onChange={(event) =>
                              update({
                                productIds: event.target.checked
                                  ? [...(section.productIds ?? []), product.id]
                                  : section.productIds?.filter(
                                      (id) => id !== product.id,
                                    ),
                              })
                            }
                          />
                          {product.title}
                        </label>
                      ))}
                  </fieldset>
                )}
                <p className="helper">
                  Navigation stays in Header. Footer stays in Footer. Changes
                  appear in your shop after Publish.
                </p>
              </>
            ) : (
              <p>Select a widget to edit it.</p>
            )}
          </aside>
        </div>
      </fieldset>
    </>
  );
}
