"use client";
import Link from "next/link";
import { useState } from "react";
import type { PageDocument } from "@/lib/commerce";
import { themes, templateSections } from "@/lib/storefront-themes";
import { PageRenderer } from "@/components/storefront-renderer";
import { initialProducts, photo } from "@/lib/demo-data";

export default function ThemeGallery() {
  const [theme, setTheme] = useState<keyof typeof themes>("midnight");
  const [template, setTemplate] = useState<"essentials" | "editorial">(
    "essentials",
  );
  const document: PageDocument = {
    schemaVersion: 2,
    themeId: theme,
    templateId: template,
    accent: themes[theme].accent,
    font: themes[theme].font,
    sections: templateSections(template),
  };
  return (
    <main className="theme-gallery">
      <header className="theme-gallery-toolbar">
        <Link href="/" className="brand">
          StoreCraft
        </Link>
        <span>Storefront theme preview</span>
        <div>
          {(Object.keys(themes) as (keyof typeof themes)[]).map((id) => (
            <button
              key={id}
              className={theme === id ? "primary" : "secondary"}
              aria-pressed={theme === id}
              onClick={() => setTheme(id)}
            >
              {themes[id].name}
            </button>
          ))}
        </div>
        <label>
          Layout
          <select
            value={template}
            onChange={(event) =>
              setTemplate(event.target.value as typeof template)
            }
          >
            <option value="essentials">Essentials</option>
            <option value="editorial">Editorial</option>
          </select>
        </label>
        <Link href="/" className="text-link">
          Try the demo page builder ↗
        </Link>
      </header>
      <PageRenderer
        document={document}
        products={initialProducts
          .filter((product) => product.status === "Active")
          .slice(0, 4)
          .map((product) => ({
            id: product.id,
            title: product.title,
            slug: product.id,
            description: product.description,
            sku: "SAMPLE",
            priceMinorUnits: product.price,
            stockQuantity: product.stock,
            status: product.status,
            imageUrl: photo(product.image, 600),
            imageAlt: product.title,
          }))}
        storeName="Sunday Studio"
        contactEmail="hello@example.com"
      />
    </main>
  );
}
