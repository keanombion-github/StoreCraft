"use client";
import { useState } from "react";
import type { PageDocument, CatalogProduct } from "@/lib/commerce";
import { createDemoShareUrl } from "@/lib/demo-sharing";
export function ShareStorefront({
  published,
  products,
  storeName,
  slug,
  demo,
}: {
  published: PageDocument | null;
  products: CatalogProduct[];
  storeName: string;
  slug: string;
  demo: boolean;
}) {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  if (!published) return null;
  return (
    <div className="storefront-share">
      <button
        className="secondary"
        onClick={async () => {
          try {
            const next = demo
              ? createDemoShareUrl(
                  published,
                  products,
                  storeName,
                  window.location.origin,
                )
              : new URL(`/s/${slug}`, window.location.origin).href;
            setUrl(next);
            let copied = false;
            try {
              await navigator.clipboard.writeText(next);
              copied = true;
            } catch {
              /* The visible link remains usable when clipboard is blocked. */
            }
            const local = ["localhost", "127.0.0.1"].includes(
              window.location.hostname,
            );
            setMessage(
              `${copied ? "Link copied." : "Your link is ready."} ${local ? "This local address works on this computer. Deploy StoreCraft to share it with others." : demo ? "Anyone with this link can view this saved demo. Publish and copy a new link to share later changes." : "Anyone with this link can view your published store."}`,
            );
          } catch (error) {
            setMessage((error as Error).message);
            setUrl("");
          }
        }}
      >
        {demo ? "Share published demo" : "Copy storefront link"}
      </button>
      {message && <p role="status">{message}</p>}
      {url && (
        <a
          className="text-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open shared storefront ↗
        </a>
      )}
    </div>
  );
}
