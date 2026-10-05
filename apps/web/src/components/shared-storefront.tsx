"use client";
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { readDemoShareUrl } from "@/lib/demo-sharing";
import { PageRenderer } from "./storefront-renderer";
const subscribe = () => () => {};
export function SharedStorefront() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <Snapshot />
  ) : (
    <p className="loading">Opening shared storefront…</p>
  );
}
function Snapshot() {
  const hash = useSyncExternalStore(
    (listener) => {
      window.addEventListener("hashchange", listener);
      return () => window.removeEventListener("hashchange", listener);
    },
    () => window.location.hash,
    () => "",
  );
  const result = useMemo(() => {
    try {
      return { store: readDemoShareUrl(hash), error: "" };
    } catch {
      return {
        store: null,
        error:
          "This shared storefront link is invalid or incomplete. Ask its creator for a new link.",
      };
    }
  }, [hash]);
  if (!result.store)
    return (
      <main className="loading">
        <p>{result.error}</p>
        <Link href="/">Try StoreCraft</Link>
      </main>
    );
  return (
    <>
      <div className="sandbox-bar">
        <span>Shared demo · Saved design · Preview only</span>
        <Link href="/">Build your own store</Link>
      </div>
      <PageRenderer
        document={result.store.document}
        products={result.store.products}
        storeName={result.store.storeName}
      />
    </>
  );
}
