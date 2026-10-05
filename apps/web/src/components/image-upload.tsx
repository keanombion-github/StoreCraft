"use client";
/* eslint-disable @next/next/no-img-element -- Uploaded public store imagery. */
import { useState } from "react";
import { supabase } from "@/lib/commerce";

export function assetUrl(path?: string) {
  return path
    ? (supabase?.storage.from("storecraft-assets").getPublicUrl(path).data
        .publicUrl ?? "")
    : "";
}
export function ImageUpload({
  value,
  onChange,
  onBusy,
  label = "Upload image",
  localOnly = false,
}: {
  value: string;
  onChange: (path: string, url: string) => void;
  onBusy?: (busy: boolean) => void;
  label?: string;
  localOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="image-upload">
      {value && (
        <img
          src={
            value.startsWith("https://") || value.startsWith("data:image/")
              ? value
              : assetUrl(value)
          }
          alt="Current uploaded image preview"
        />
      )}
      <label>
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 5 * 1024 * 1024 ||
              file.size === 0
            ) {
              setError("Choose a JPEG, PNG, or WebP image up to 5 MB.");
              return;
            }
            setBusy(true);
            onBusy?.(true);
            try {
              // Decoding rejects mislabeled non-images. Uploads use unique paths, never overwrite published assets.
              const bitmap = await createImageBitmap(file);
              if (bitmap.width > 8000 || bitmap.height > 8000) {
                bitmap.close();
                throw new Error(
                  "Image dimensions must be no larger than 8000 pixels.",
                );
              }
              bitmap.close();
              if (localOnly) {
                if (file.size > 1024 * 1024)
                  throw new Error(
                    "For the browser demo, choose an image up to 1 MB.",
                  );
                const url = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () =>
                    reject(new Error("Could not read this image."));
                  reader.readAsDataURL(file);
                });
                onChange("", url);
                return;
              }
              const session = await supabase?.auth.getSession();
              const owner = session?.data.session?.user.id;
              if (!supabase || !owner)
                throw new Error("Sign in before uploading an image.");
              const extension =
                file.type === "image/jpeg"
                  ? "jpg"
                  : file.type === "image/png"
                    ? "png"
                    : "webp";
              const path = `${owner}/${crypto.randomUUID()}.${extension}`;
              const upload = await supabase.storage
                .from("storecraft-assets")
                .upload(path, file, {
                  contentType: file.type,
                  cacheControl: "31536000",
                  upsert: false,
                });
              if (upload.error) throw new Error(upload.error.message);
              onChange(path, assetUrl(path));
            } catch (failure) {
              setError((failure as Error).message);
            } finally {
              setBusy(false);
              onBusy?.(false);
            }
          }}
        />
      </label>
      <p className="helper">
        JPEG, PNG, or WebP · Up to {localOnly ? "1 MB" : "5 MB"} ·{" "}
        {localOnly ? "Saved in this browser" : "Public storefront imagery"}
      </p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
