"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { CatalogProduct, PageDocument } from "@/lib/commerce";
import { PageRenderer } from "./storefront-renderer";
const subscribe = () => () => {};
export function ThemePreview({ id }: { id: string }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <Preview id={id} />
  ) : (
    <p className="loading">Opening theme preview…</p>
  );
}
function Preview({ id }: { id: string }) {
  const [preview] = useState(() => {
    try {
      const raw = localStorage.getItem(`storecraft-theme-preview:${id}`);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (saved.expires < Date.now()) return null;
      return saved as {
        document: PageDocument;
        products: CatalogProduct[];
        storeName: string;
      };
    } catch {
      return null;
    }
  });
  if (!preview)
    return (
      <main className="loading">
        <p>This preview has expired or is unavailable in this browser.</p>
        <Link href="/">Return to StoreCraft</Link>
      </main>
    );
  return (
    <>
      <div className="sandbox-bar">
        <span>Theme preview · Your live storefront is unchanged</span>
        <Link href="/">Back to StoreCraft</Link>
      </div>
      <PageRenderer
        document={preview.document}
        products={preview.products}
        storeName={preview.storeName}
      />
    </>
  );
}
