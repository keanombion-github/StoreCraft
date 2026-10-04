"use client";
import { useState } from "react";
import { importTheme } from "@/lib/theme-packages";
import type { PageDocument } from "@/lib/commerce";
import { libraryEntries } from "@/lib/theme-library";

export function ThemePackageUpload({
  document,
  onChange,
  onBusy,
  locked,
}: {
  document: PageDocument;
  onChange: (document: PageDocument) => void;
  onBusy: (busy: boolean) => void;
  locked: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <div className="theme-package-controls">
      <label>
        Upload a StoreCraft theme ZIP
        <input
          aria-label="Upload theme ZIP"
          type="file"
          accept=".zip,application/zip"
          disabled={locked}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            onBusy(true);
            try {
              const imported = await importTheme(file);
              const library = libraryEntries(document);
              const existing = library.find(
                (entry) =>
                  entry.themePackage.name === imported.theme.name &&
                  entry.themePackage.version === imported.theme.version,
              );
              if (!existing && library.length >= 5)
                throw new Error(
                  "Your library can hold up to five uploaded themes.",
                );
              const id = existing?.id ?? crypto.randomUUID();
              const entry = {
                id,
                themeId: imported.baseTheme,
                accent: imported.accent,
                font: imported.font,
                themePackage: imported.theme,
              };
              const nextLibrary = [
                ...library.filter((item) => item.id !== id),
                entry,
              ];
              if (JSON.stringify(nextLibrary).length > 2_000_000)
                throw new Error(
                  "The combined theme library must fit within 2 MB.",
                );
              onChange({
                ...document,
                themeKey: id,
                themeLibrary: nextLibrary,
                themePackage: imported.theme,
                themeId: imported.baseTheme,
                accent: imported.accent,
                font: imported.font,
              });
            } catch (failure) {
              setError((failure as Error).message);
            } finally {
              onBusy(false);
            }
          }}
        />
      </label>
      <a className="secondary" href="/theme-packages/atelier.zip" download>
        Download starter theme
      </a>
      <small>
        Theme files change presentation. Products, widgets, and checkout stay
        connected.
      </small>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
