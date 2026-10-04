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
import { ThemeLibraryView } from "./theme-library-view";
import { chooseTheme, libraryEntries, themeKey } from "@/lib/theme-library";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeading,
  faImages,
  faBullhorn,
  faBox,
  faBars,
  faGripLines,
} from "@fortawesome/free-solid-svg-icons";
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
  const [screen, setScreen] = useState<"library" | "editor">("library");
  const [published, setPublished] = useState<PageDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [region, setRegion] = useState<Region>("Main");
  const [dragged, setDragged] = useState("");
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
        ? Promise.resolve({
            document: readDemoPage(),
            publishedDocument: readDemoPage(true),
          })
        : request<{
            document: PageDocument;
            publishedDocument?: PageDocument | null;
          }>("/api/merchant/page")
    )
      .then((page) => {
        if (!active) return;
        const normalized = normalizePage(page.document);
        setDocument(normalized);
        setPublished(page.publishedDocument ?? null);
        setSelected("");
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
    setDocument({ ...value, themeLibrary: libraryEntries(value) });
    setDirty(true);
    onDirtyChange?.(true);
    setMessage("");
  }
  function select(id: string) {
    setSelected(id);
    const section = document?.sections.find((s) => s.id === id);
    if (section) setRegion(regionOf(section));
  }
  async function save(
    publish: boolean,
    value = document,
    importComplete = false,
  ) {
    if (!value || (!importComplete && uploading) || busy) return;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        localStorage.setItem("storecraft-demo-draft", JSON.stringify(value));
        if (publish)
          localStorage.setItem(
            "storecraft-demo-published",
            JSON.stringify(value),
          );
      } else
        await request(
          publish ? "/api/merchant/page/publish" : "/api/merchant/page",
          { method: publish ? "POST" : "PUT", body: JSON.stringify(value) },
        );
      setDocument(value);
      if (publish) setPublished(value);
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
  const editable = (field: string) =>
    !section ||
    !document.themePackage?.widgets[section.type] ||
    document.themePackage.widgets[section.type]!.fields.includes(field);
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
  function canDelete(id: string) {
    const item = document!.sections.find((s) => s.id === id);
    return (
      !!item &&
      !locked &&
      !(
        regionOf(item) === "Main" &&
        document!.sections.filter((s) => regionOf(s) === "Main").length === 1
      )
    );
  }
  function deleteWidget(id: string) {
    if (!canDelete(id)) return;
    change({
      ...document!,
      sections: document!.sections.filter((s) => s.id !== id),
    });
    if (selected === id) setSelected("");
    setError("");
  }
  function addWidget(
    type: Section["type"],
    targetRegion: Region,
    beforeId = "",
  ) {
    if (locked) return;
    if (!widgets[targetRegion].includes(type)) {
      setError(`${type} cannot go in ${targetRegion}.`);
      return;
    }
    if (document!.sections.length >= 24) {
      setError("A page can have up to 24 widgets.");
      return;
    }
    if (
      ["Navigation", "Footer"].includes(type) &&
      document!.sections.some((s) => s.type === type)
    ) {
      setError(`Your page already has a ${type} widget. Select it to edit it.`);
      return;
    }
    const item: Section = {
      id: crypto.randomUUID(),
      type,
      region: targetRegion,
      title: "New section",
      text: "",
      image: "",
      button: "",
    };
    const sections = [...document!.sections];
    const index = sections.findIndex((s) => s.id === beforeId);
    sections.splice(index < 0 ? sections.length : index, 0, item);
    change({ ...document!, sections });
    setSelected(item.id);
    setRegion(targetRegion);
    setError("");
  }
  function dropWidget(payload: string, targetRegion: Region, beforeId = "") {
    setDragged("");
    if (locked) return;
    if (payload.startsWith("new:")) {
      const type = payload.slice(4) as Section["type"];
      if (regions.some((r) => widgets[r].includes(type)))
        addWidget(type, targetRegion, beforeId);
    } else reorder(payload, beforeId, targetRegion);
  }
  if (screen === "library")
    return (
      <>
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
        <ThemeLibraryView
          document={document}
          published={published}
          locked={locked}
          slug={store.slug}
          onBusy={setUploading}
          onUpload={(value) => {
            change(value);
            void save(false, value, true);
          }}
          onEdit={(id) => {
            const next = chooseTheme(document, id);
            if (id !== themeKey(document)) change(next);
            else setDocument(next);
            setScreen("editor");
            setSelected("");
          }}
          onActivate={(id) => {
            const next = chooseTheme(document, id);
            change(next);
            void save(true, next);
          }}
          onPreview={(id) => {
            try {
              const keys = Object.keys(localStorage).filter((key) =>
                key.startsWith("storecraft-theme-preview:"),
              );
              if (keys.length >= 8) localStorage.removeItem(keys[0]);
              const idForPreview = crypto.randomUUID();
              localStorage.setItem(
                `storecraft-theme-preview:${idForPreview}`,
                JSON.stringify({
                  document: {
                    ...chooseTheme(document, id),
                    themeLibrary: undefined,
                  },
                  products: products.filter(
                    (product) => product.status === "Active",
                  ),
                  storeName: store.name,
                  expires: Date.now() + 86400000,
                }),
              );
              window.open(
                `/theme-preview/${idForPreview}`,
                "_blank",
                "noopener,noreferrer",
              );
            } catch {
              setError(
                "The preview could not be saved. Browser storage may be full or disabled.",
              );
            }
          }}
        />
      </>
    );
  return (
    <>
      <div className="builder-toolbar">
        <button
          className="secondary"
          disabled={locked}
          onClick={() => setScreen("library")}
        >
          ← Theme library
        </button>
        <span className="editor-theme-name">
          {document.themePackage?.name ??
            themes[document.themeId ?? "midnight"].name}
        </span>
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
        <details className="panel editor-layout-settings">
          <summary>Starting layout</summary>
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
        </details>
        <div
          className={`builder-layout ${section ? "has-inspector" : ""}`}
          onDragEnd={() => setDragged("")}
        >
          <aside className="panel builder-controls">
            <h2>Widget library</h2>
            <p className="helper">
              Drag a card into a highlighted space. On touch screens, choose a
              region and tap a card.
            </p>
            <div className="widget-library">
              {regions.map((r) => (
                <div className="widget-library-group" key={r}>
                  <h3>{r}</h3>
                  {widgets[r].map((type) => {
                    const singleton =
                      ["Navigation", "Footer"].includes(type) &&
                      document.sections.some((s) => s.type === type);
                    const icon =
                      type === "Hero"
                        ? faHeading
                        : type === "ImageText"
                          ? faImages
                          : type === "FeaturedProducts"
                            ? faBox
                            : type === "Announcement"
                              ? faBullhorn
                              : type === "Navigation"
                                ? faBars
                                : faGripLines;
                    return (
                      <button
                        key={type}
                        className="widget-library-card"
                        draggable={!locked}
                        disabled={locked}
                        aria-label={`Add ${type} to ${r}`}
                        onDragStart={(event) => {
                          const payload = singleton
                            ? document.sections.find((s) => s.type === type)!.id
                            : `new:${type}`;
                          event.dataTransfer.setData("text/plain", payload);
                          event.dataTransfer.effectAllowed = singleton
                            ? "move"
                            : "copy";
                          setDragged(payload);
                        }}
                        onClick={() => {
                          if (singleton)
                            select(
                              document.sections.find((s) => s.type === type)!
                                .id,
                            );
                          else addWidget(type, r);
                        }}
                      >
                        <FontAwesomeIcon icon={icon} />
                        <span>
                          <strong>
                            {type === "FeaturedProducts"
                              ? "Product collection"
                              : type === "ImageText"
                                ? "Image & text"
                                : type}
                          </strong>
                          <small>
                            {singleton
                              ? `Drag to reorder in ${r} · click to edit`
                              : `Drag to ${r} · click to add`}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <details className="builder-section">
              <summary>Page structure</summary>
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
                        dropWidget(event.dataTransfer.getData("text/plain"), r);
                    }}
                  >
                    <button
                      className="region-heading"
                      onClick={() => {
                        setRegion(r);
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
                          setDragged(item.id);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!locked)
                            dropWidget(
                              event.dataTransfer.getData("text/plain"),
                              r,
                              item.id,
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
                            disabled={!canDelete(item.id)}
                            onClick={() => deleteWidget(item.id)}
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
            </details>
            <details className="builder-section">
              <summary>Brand settings</summary>
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
            </details>
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
              onDragWidget={setDragged}
              onDropWidget={dropWidget}
              onDeleteWidget={deleteWidget}
              canDeleteWidget={canDelete}
              editorLocked={locked}
              canDropWidget={(r) => {
                const type = dragged.startsWith("new:")
                  ? (dragged.slice(4) as Section["type"])
                  : document.sections.find((s) => s.id === dragged)?.type;
                return !!type && widgets[r].includes(type) && !locked;
              }}
            />
          </div>
          {section && (
            <aside
              className="panel builder-controls widget-inspector"
              aria-label="Widget editor"
            >
              <div className="inspector-heading">
                <h2>Widget settings</h2>
                <button
                  className="quiet"
                  aria-label="Close widget editor"
                  onClick={() => setSelected("")}
                >
                  ×
                </button>
              </div>
              {section ? (
                <>
                  <p className="widget-location">
                    {regionOf(section)} / {section.type}
                  </p>
                  {editable("title") && (
                    <label>
                      Title
                      <input
                        value={section.title}
                        maxLength={150}
                        onChange={(event) =>
                          update({ title: event.target.value })
                        }
                      />
                    </label>
                  )}
                  {editable("text") && (
                    <label>
                      Text
                      <textarea
                        aria-label="Text"
                        value={section.text}
                        maxLength={1000}
                        rows={5}
                        onChange={(event) =>
                          update({ text: event.target.value })
                        }
                      />
                    </label>
                  )}
                  {editable("image") &&
                    ["Hero", "ImageText"].includes(section.type) && (
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
                  {editable("button") &&
                    ["Hero", "ImageText", "Navigation"].includes(
                      section.type,
                    ) && (
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
                          <p>
                            This collection references unavailable products.
                          </p>
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
                                section.productIds?.includes(product.id) ??
                                false
                              }
                              disabled={
                                !section.productIds?.includes(product.id) &&
                                (section.productIds?.length ?? 0) >= 24
                              }
                              onChange={(event) =>
                                update({
                                  productIds: event.target.checked
                                    ? [
                                        ...(section.productIds ?? []),
                                        product.id,
                                      ]
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
                  <button
                    className="secondary delete-widget"
                    disabled={!canDelete(section.id)}
                    onClick={() => deleteWidget(section.id)}
                  >
                    Delete widget
                  </button>
                  <p className="helper">
                    Navigation stays in Header. Footer stays in Footer. Keep at
                    least one Main widget. Changes appear in your shop after
                    Publish.
                  </p>
                </>
              ) : (
                <p>Select a widget to edit it.</p>
              )}
            </aside>
          )}
        </div>
      </fieldset>
    </>
  );
}
