"use client";
import { useEffect, useRef, useState } from "react";
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
import { validateHtmlWidget } from "@/lib/html-widget";
import { ShareStorefront } from "./share-storefront";
import { ImageUpload } from "./image-upload";
import { PageRenderer } from "./storefront-renderer";
import { readDemoPage } from "@/lib/demo-page";
import { ThemeLibraryView } from "./theme-library-view";
import { chooseTheme, libraryEntries, themeKey } from "@/lib/theme-library";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeading,
  faTableColumns,
  faFont,
  faCode,
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
  const inspectorRef = useRef<HTMLElement>(null);
  const [document, setDocument] = useState<PageDocument | null>(null);
  const [screen, setScreen] = useState<"library" | "editor">("library");
  const [published, setPublished] = useState<PageDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [targetColumn, setTargetColumn] = useState(0);
  const [region, setRegion] = useState<Region>("Main");
  const [dragged, setDragged] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryExpanded, setLibraryExpanded] = useState(true);
  const [history, setHistory] = useState<PageDocument[]>([]);
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
  useEffect(() => {
    if (!selected || screen !== "editor") return;
    inspectorRef.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected, screen]);
  function change(value: PageDocument) {
    if (document) setHistory((previous) => [...previous.slice(-19), document]);
    setDocument({ ...value, themeLibrary: libraryEntries(value) });
    setDirty(true);
    onDirtyChange?.(true);
    setMessage("");
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setDocument(previous);
    setHistory(history.slice(0, -1));
    setSelected((current) =>
      previous.sections.some((s) => s.id === current) ? current : "",
    );
    setDirty(true);
    onDirtyChange?.(true);
    setMessage("Last change undone. Save or publish to keep it.");
    setError("");
  }
  function shiftWidget(item: Section, direction: number) {
    const siblings = document!.sections.filter(
      (s) => regionOf(s) === regionOf(item) && s.parentId === item.parentId,
    );
    const index = siblings.findIndex((s) => s.id === item.id);
    const neighbor = siblings[index + direction];
    if (!neighbor) return;
    if (direction < 0) reorder(item.id, neighbor.id, regionOf(item));
    else reorder(neighbor.id, item.id, regionOf(item));
  }
  function canShift(item: Section, direction: number) {
    const siblings = document!.sections.filter(
      (s) => regionOf(s) === regionOf(item) && s.parentId === item.parentId,
    );
    return !!siblings[siblings.findIndex((s) => s.id === item.id) + direction];
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
    const invalidHtml = value.sections
      .filter((s) => s.type === "Html")
      .map((s) => validateHtmlWidget(s.html ?? "", s.htmlHeight ?? 240))
      .find(Boolean);
    if (invalidHtml) {
      setError(invalidHtml);
      return;
    }
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
    (section.type !== "Container" &&
      (!document.themePackage?.widgets[section.type] ||
        document.themePackage.widgets[section.type]!.fields.includes(field)));
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
    const slot = targetId.startsWith("column:") ? targetId.split(":") : null;
    const targetItem = document!.sections.find((s) => s.id === targetId);
    const parent = document!.sections.find(
      (s) =>
        s.id === (slot ? slot[1] : targetItem?.parentId) &&
        s.type === "Container",
    );
    if (slot && !parent) return;
    if (
      parent &&
      (["Container", "Navigation", "Footer"].includes(item.type) ||
        targetRegion !== regionOf(parent))
    )
      return;
    if (
      slot &&
      parent &&
      (!Number.isInteger(Number(slot[2])) ||
        Number(slot[2]) < 0 ||
        Number(slot[2]) >= (parent.columns ?? 2))
    )
      return;
    if (
      parent &&
      document!.sections.filter((s) => s.parentId === parent.id && s.id !== id)
        .length >= 8
    ) {
      setError("A container can hold up to eight widgets.");
      return;
    }

    if (!parent && !widgets[targetRegion].includes(item.type)) {
      setError(`${item.type} cannot go in ${targetRegion}.`);
      return;
    }
    if (
      !item.parentId &&
      regionOf(item) === "Main" &&
      targetRegion !== "Main" &&
      document!.sections.filter((s) => regionOf(s) === "Main" && !s.parentId)
        .length === 1
    ) {
      setError("Keep at least one widget in Main.");
      return;
    }
    const sections = document!.sections.filter((s) => s.id !== id);
    const target = sections.findIndex((s) => s.id === targetId);
    sections.splice(target < 0 ? sections.length : target, 0, {
      ...item,
      region: targetRegion,
      parentId: parent?.id,
      column: parent
        ? slot
          ? Number(slot[2])
          : (targetItem?.column ?? 0)
        : undefined,
    });
    change({
      ...document!,
      sections: sections.map((s) =>
        s.parentId === id ? { ...s, region: targetRegion } : s,
      ),
    });
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
        !item.parentId &&
        regionOf(item) === "Main" &&
        document!.sections.filter((s) => regionOf(s) === "Main" && !s.parentId)
          .length === 1
      )
    );
  }
  function deleteWidget(id: string) {
    if (!canDelete(id)) return;
    const children = document!.sections.filter((s) => s.parentId === id);
    if (
      children.length &&
      !window.confirm(
        "Delete this container and its widgets? Cancel to keep them, or move the widgets out first.",
      )
    )
      return;
    change({
      ...document!,
      sections: document!.sections.filter(
        (s) => s.id !== id && s.parentId !== id,
      ),
    });
    if (selected === id || children.some((child) => child.id === selected))
      setSelected("");
    setError("");
  }
  function addWidget(
    type: Section["type"],
    targetRegion: Region,
    beforeId = "",
  ) {
    if (locked) return;
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
    const slot = beforeId.startsWith("column:") ? beforeId.split(":") : null;
    const parent = slot
      ? document!.sections.find(
          (s) => s.id === slot[1] && s.type === "Container",
        )
      : null;
    if (
      slot &&
      (!parent ||
        targetRegion !== regionOf(parent) ||
        ["Container", "Navigation", "Footer"].includes(type))
    ) {
      setError("Use content widgets inside a container.");
      return;
    }
    if (
      slot &&
      parent &&
      (!Number.isInteger(Number(slot[2])) ||
        Number(slot[2]) < 0 ||
        Number(slot[2]) >= (parent.columns ?? 2))
    )
      return;
    if (
      parent &&
      document!.sections.filter((s) => s.parentId === parent.id).length >= 8
    ) {
      setError("A container can hold up to eight widgets.");
      return;
    }
    if (!parent && !widgets[targetRegion].includes(type)) {
      setError(`${type} cannot go in ${targetRegion}.`);
      return;
    }
    const item: Section = {
      id: crypto.randomUUID(),
      type,
      region: targetRegion,
      parentId: parent?.id,
      column: parent ? Number(slot![2]) : undefined,
      ...(type === "Container"
        ? { columns: 2, gap: 24, alignment: "start" as const }
        : {}),
      ...(type === "Html"
        ? {
            html: "<section><h2>Your custom content</h2><p>Edit this HTML in widget settings.</p></section>",
            htmlHeight: 240,
          }
        : {}),
      title: type === "Container" ? "Column layout" : "New section",
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
          demo={demo}
          products={products}
          storeName={store.name}
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
        <button
          className="secondary"
          disabled={locked || !history.length}
          onClick={undo}
        >
          Undo
        </button>
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
        <ShareStorefront
          published={published}
          products={products}
          storeName={store.name}
          slug={store.slug}
          demo={demo}
        />
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
          <aside
            className={`panel builder-controls widget-library-panel ${libraryExpanded ? "library-expanded" : "library-collapsed"}`}
          >
            <div className="library-heading">
              <h2>Widget library</h2>
              <button
                className="quiet library-toggle"
                aria-expanded={libraryExpanded}
                onClick={() => setLibraryExpanded(!libraryExpanded)}
              >
                {libraryExpanded ? "Hide widgets" : "Show widgets"}
              </button>
            </div>
            <p className="helper">
              Drag a card into a highlighted space. On touch screens, choose a
              placement below and tap a card.
            </p>
            <label className="library-placement">
              Add widgets to
              <select
                aria-label="Add widgets to"
                value={region}
                onChange={(event) => setRegion(event.target.value as Region)}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div className="widget-library">
              <div className="widget-library-group">
                {[...new Set(regions.flatMap((r) => widgets[r]))].map(
                  (type) => {
                    const insideContainer =
                      section?.type === "Container" &&
                      regionOf(section) === region &&
                      !["Container", "Navigation", "Footer"].includes(type);
                    const r =
                      insideContainer || widgets[region].includes(type)
                        ? region
                        : regions.find((r) => widgets[r].includes(type))!;
                    const singleton =
                      ["Navigation", "Footer"].includes(type) &&
                      document.sections.some((s) => s.type === type);
                    const icon =
                      type === "Text"
                        ? faFont
                        : type === "Html"
                          ? faCode
                          : type === "Image"
                            ? faImages
                            : type === "Container"
                              ? faTableColumns
                              : type === "Hero"
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
                        aria-label={`Add ${type}`}
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
                          else
                            addWidget(
                              type,
                              r,
                              insideContainer
                                ? `column:${section.id}:${Math.min(targetColumn, (section.columns ?? 2) - 1)}`
                                : "",
                            );
                        }}
                      >
                        <FontAwesomeIcon icon={icon} />
                        <span>
                          <strong>
                            {type === "FeaturedProducts"
                              ? "Product collection"
                              : type === "ImageText"
                                ? "Image & text"
                                : type === "Html"
                                  ? "HTML"
                                  : type}
                          </strong>
                          <small>
                            {singleton
                              ? "Drag to reorder · click to edit"
                              : "Drag to place · click to add"}
                          </small>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
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
                    {items.map((item) => (
                      <div
                        className={`widget-list ${item.parentId ? "child-widget" : ""} ${item.id === selected ? "selected-widget" : ""}`}
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
                          {item.type === "Html"
                            ? "HTML"
                            : item.type === "ImageText"
                              ? "Image & text"
                              : item.type === "FeaturedProducts"
                                ? "Product collection"
                                : item.type}
                          {item.parentId && (
                            <small>
                              Column {(item.column ?? 0) + 1} ·{" "}
                              {document.sections.find(
                                (s) => s.id === item.parentId,
                              )?.title || "Container"}
                            </small>
                          )}
                          <small>{item.title || "Store branding"}</small>
                        </button>
                        <div className="widget-actions">
                          <button
                            aria-label={`Move ${item.type} up`}
                            disabled={locked || !canShift(item, -1)}
                            onClick={() => shiftWidget(item, -1)}
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Move ${item.type} down`}
                            disabled={locked || !canShift(item, 1)}
                            onClick={() => shiftWidget(item, 1)}
                          >
                            ↓
                          </button>
                          <button
                            aria-label={`Duplicate ${item.type}`}
                            disabled={
                              locked ||
                              document.sections.length >= 24 ||
                              (!!item.parentId &&
                                document.sections.filter(
                                  (s) => s.parentId === item.parentId,
                                ).length >= 8) ||
                              ["Navigation", "Footer", "Container"].includes(
                                item.type,
                              )
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
              onSelectColumn={(id, column) => {
                select(id);
                setTargetColumn(column);
              }}
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
              ref={inspectorRef}
              tabIndex={-1}
              className="panel builder-controls widget-inspector"
              aria-label="Widget editor"
            >
              <div className="inspector-heading">
                <h2>Widget settings</h2>
                <button
                  className="quiet"
                  title="Close settings (Esc)"
                  aria-label="Close widget editor"
                  onClick={() => setSelected("")}
                >
                  ×
                </button>
              </div>
              {section ? (
                <>
                  <p className="widget-location">
                    {regionOf(section)} /{" "}
                    {section.type === "Html"
                      ? "HTML"
                      : section.type === "ImageText"
                        ? "Image & text"
                        : section.type === "FeaturedProducts"
                          ? "Product collection"
                          : section.type}
                  </p>
                  {section.parentId && (
                    <button
                      className="secondary"
                      onClick={() => select(section.parentId!)}
                    >
                      Edit parent container
                    </button>
                  )}
                  {section.type === "Container" && (
                    <>
                      <label>
                        Container name
                        <input
                          value={section.title}
                          maxLength={150}
                          onChange={(event) =>
                            update({ title: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Columns
                        <select
                          aria-label="Columns"
                          value={section.columns ?? 2}
                          onChange={(event) => {
                            const columns = Number(event.target.value);
                            change({
                              ...document,
                              sections: document.sections.map((s) =>
                                s.id === section.id
                                  ? { ...s, columns }
                                  : s.parentId === section.id
                                    ? {
                                        ...s,
                                        column: Math.min(
                                          s.column ?? 0,
                                          columns - 1,
                                        ),
                                      }
                                    : s,
                              ),
                            });
                            setTargetColumn(0);
                          }}
                        >
                          {Array.from({ length: 8 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Column spacing
                        <select
                          value={section.gap ?? 24}
                          onChange={(event) =>
                            update({ gap: Number(event.target.value) })
                          }
                        >
                          {[0, 8, 16, 24, 32, 48].map((gap) => (
                            <option key={gap} value={gap}>
                              {gap} px
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Vertical alignment
                        <select
                          value={section.alignment ?? "start"}
                          onChange={(event) =>
                            update({
                              alignment: event.target
                                .value as Section["alignment"],
                            })
                          }
                        >
                          <option value="start">Top</option>
                          <option value="center">Center</option>
                          <option value="end">Bottom</option>
                        </select>
                      </label>
                      <label>
                        Add widgets to column
                        <select
                          value={Math.min(
                            targetColumn,
                            (section.columns ?? 2) - 1,
                          )}
                          onChange={(event) =>
                            setTargetColumn(Number(event.target.value))
                          }
                        >
                          {Array.from(
                            { length: section.columns ?? 2 },
                            (_, i) => (
                              <option key={i} value={i}>
                                Column {i + 1}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <p className="helper">
                        Drag content widgets into a column, or choose a column
                        here and tap a content widget in the library. Up to
                        eight widgets per container.
                      </p>
                    </>
                  )}
                  {
                    <label>
                      Placement
                      <select
                        aria-label="Placement"
                        value={
                          section.parentId
                            ? `column:${section.parentId}:${section.column ?? 0}`
                            : regionOf(section)
                        }
                        onChange={(event) =>
                          reorder(
                            section.id,
                            regions.includes(event.target.value as Region)
                              ? ""
                              : event.target.value,
                            regions.includes(event.target.value as Region)
                              ? (event.target.value as Region)
                              : regionOf(
                                  document.sections.find(
                                    (s) =>
                                      s.id === event.target.value.split(":")[1],
                                  )!,
                                ),
                          )
                        }
                        disabled={["Navigation", "Footer"].includes(
                          section.type,
                        )}
                      >
                        {regions
                          .filter((r) => widgets[r].includes(section.type))
                          .map((r) => (
                            <option key={r} value={r}>
                              {r} page
                            </option>
                          ))}
                        {document.sections
                          .filter(
                            (s) =>
                              section.type !== "Container" &&
                              !["Navigation", "Footer"].includes(
                                section.type,
                              ) &&
                              s.type === "Container" &&
                              !s.parentId,
                          )
                          .flatMap((container) =>
                            Array.from(
                              { length: container.columns ?? 2 },
                              (_, i) => (
                                <option
                                  key={`${container.id}:${i}`}
                                  value={`column:${container.id}:${i}`}
                                >
                                  {container.title || "Container"} · Column{" "}
                                  {i + 1}
                                </option>
                              ),
                            ),
                          )}
                      </select>
                    </label>
                  }
                  {section.type === "Html" && (
                    <>
                      <label>
                        HTML code
                        <textarea
                          aria-label="HTML code"
                          rows={12}
                          maxLength={20000}
                          value={section.html ?? ""}
                          onChange={(event) =>
                            update({ html: event.target.value })
                          }
                          spellCheck={false}
                        />
                      </label>
                      <label>
                        HTML height
                        <input
                          type="number"
                          min={60}
                          max={1200}
                          value={section.htmlHeight ?? 240}
                          onChange={(event) =>
                            update({
                              htmlHeight: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <p className="helper">
                        Presentation HTML and inline CSS. Scripts, embedded
                        pages and forms are blocked.
                      </p>
                    </>
                  )}
                  {section.type !== "Html" && editable("title") && (
                    <label>
                      {section.type === "Image"
                        ? "Image alternative text"
                        : "Title"}
                      <input
                        value={section.title}
                        maxLength={150}
                        onChange={(event) =>
                          update({ title: event.target.value })
                        }
                      />
                    </label>
                  )}
                  {!["Image", "Html"].includes(section.type) &&
                    editable("text") && (
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
                    ["Hero", "ImageText", "Image"].includes(section.type) && (
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
