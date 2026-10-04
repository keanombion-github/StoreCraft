"use client";
/* eslint-disable @next/next/no-img-element -- Merchant-provided HTTPS product/widget photos. */
import { useEffect, useState } from "react";
import {
  request,
  type PageDocument,
  type Section,
  type StoreRecord,
  type CatalogProduct,
} from "@/lib/commerce";
import { money, photo } from "@/lib/demo-data";

export function PageRenderer({
  document,
  products,
  storeName,
  onAdd,
}: {
  document: PageDocument;
  products: CatalogProduct[];
  storeName: string;
  onAdd?: (product: CatalogProduct) => void;
}) {
  return (
    <div
      className="widget-page"
      style={
        {
          "--page-accent": document.accent,
          fontFamily:
            document.font === "Georgia"
              ? "Georgia, serif"
              : "Inter, sans-serif",
        } as React.CSSProperties
      }
    >
      <header className="widget-store-header">
        <strong>{storeName}</strong>
        <a href="#catalog">Collection</a>
      </header>
      {document.sections.map((section) => (
        <section
          key={section.id}
          className={`widget-section widget-${section.type.toLowerCase()}`}
        >
          {section.type === "Hero" || section.type === "ImageText" ? (
            <>
              <div>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
                {section.button && (
                  <a className="widget-button" href="#catalog">
                    {section.button}
                  </a>
                )}
              </div>
              {section.image && <img src={section.image} alt={section.title} />}
            </>
          ) : section.type === "FeaturedProducts" ? (
            <>
              <h2>{section.title || "Collection"}</h2>
              <p>{section.text}</p>
              <div id="catalog" className="product-grid">
                {products.map((product) => (
                  <article key={product.id} className="shop-product">
                    <img
                      className="published-product-photo"
                      src={photo("photo-1514228742587-6b1558fcca3d", 500)}
                      alt="Sample product photo"
                    />
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    <strong>{money(product.priceMinorUnits)}</strong>
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
              {products.length === 0 && (
                <p>No active products in this collection yet.</p>
              )}
            </>
          ) : (
            <>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

export function PageBuilder({
  store,
  products,
}: {
  store: StoreRecord;
  products: CatalogProduct[];
}) {
  const [document, setDocument] = useState<PageDocument | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(false);
  const [widget, setWidget] = useState<Section["type"]>("Hero");
  async function load() {
    try {
      const page = await request<{ document: PageDocument }>(
        "/api/merchant/page",
      );
      setDocument(page.document);
      setSelected(page.document.sections[0]?.id ?? "");
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  useEffect(() => {
    void request<{ document: PageDocument }>("/api/merchant/page").then(page => {
      setDocument(page.document);
      setSelected(page.document.sections[0]?.id ?? "");
    }).catch(failure => setError(failure.message));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(value: PageDocument) {
    setDocument(value);
    setDirty(true);
    setMessage("");
  }
  async function save(publish = false) {
    if (!document) return;
    setBusy(true);
    setError("");
    try {
      await request(
        publish ? "/api/merchant/page/publish" : "/api/merchant/page",
        { method: publish ? "POST" : "PUT", body: JSON.stringify(document) },
      );
      setDirty(false);
      setMessage(
        publish
          ? "Published. The public store now uses this snapshot."
          : "Draft saved. The public store has not changed.",
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!document)
    return (
      <div className="panel info-card">
        <p>{error || "Loading your page design…"}</p>
        {error && (
          <button className="secondary" onClick={() => void load()}>
            Retry
          </button>
        )}
      </div>
    );
  const section = document.sections.find((item) => item.id === selected);
  function update(values: Partial<Section>) {
    change({
      ...document!,
      sections: document!.sections.map((item) =>
        item.id === selected ? { ...item, ...values } : item,
      ),
    });
  }
  function move(index: number, direction: number) {
    const sections = [...document!.sections];
    [sections[index], sections[index + direction]] = [
      sections[index + direction],
      sections[index],
    ];
    change({ ...document!, sections });
  }
  return (
    <>
      <div className="builder-toolbar">
        <span>{dirty ? "Unsaved changes" : "Draft up to date"}</span>
        <button className="secondary" onClick={() => setPhone(!phone)}>
          {phone ? "Desktop preview" : "Phone preview"}
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void save()}
        >
          Save draft
        </button>
        <button
          className="primary"
          disabled={busy}
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
      <div className="builder-layout">
        <aside className="panel builder-controls">
          <h2>Widgets</h2>
          {document.sections.map((item, index) => (
            <div
              className={
                item.id === selected
                  ? "widget-list selected-widget"
                  : "widget-list"
              }
              key={item.id}
            >
              <button
                className="text-link"
                onClick={() => setSelected(item.id)}
              >
                {item.type}
              </button>
              <div>
                <button
                  aria-label={`Move ${item.type} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${item.type} down`}
                  disabled={index === document.sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  aria-label={`Duplicate ${item.type}`}
                  disabled={document.sections.length >= 20}
                  onClick={() => {
                    const copy = { ...item, id: crypto.randomUUID() };
                    const sections = [...document.sections];
                    sections.splice(index + 1, 0, copy);
                    change({ ...document, sections });
                    setSelected(copy.id);
                  }}
                >
                  ⧉
                </button>
                <button
                  aria-label={`Remove ${item.type}`}
                  disabled={document.sections.length <= 1}
                  onClick={() => {
                    const sections = document.sections.filter(
                      (value) => value.id !== item.id,
                    );
                    change({ ...document, sections });
                    setSelected(sections[0]?.id ?? "");
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <label>
            New widget
            <select
              value={widget}
              onChange={(event) =>
                setWidget(event.target.value as Section["type"])
              }
            >
              {[
                "Hero",
                "FeaturedProducts",
                "ImageText",
                "Announcement",
                "Footer",
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <button
            className="secondary"
            disabled={document.sections.length >= 20}
            onClick={() => {
              const item: Section = {
                id: crypto.randomUUID(),
                type: widget,
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
          <h2>Theme</h2>
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
        </aside>
        <div
          className={
            phone ? "builder-preview phone-preview" : "builder-preview"
          }
        >
          <PageRenderer
            document={document}
            products={products.filter((product) => product.status === "Active")}
            storeName={store.name}
          />
        </div>
        <aside className="panel builder-controls">
          <h2>Widget settings</h2>
          {section && (
            <>
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
                </>
              )}
              <p className="helper">
                Plain text only. The customer page uses this same renderer.
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
