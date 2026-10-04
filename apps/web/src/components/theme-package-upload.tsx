"use client";
import { useState } from "react";
import { importTheme } from "@/lib/theme-packages";
import type { PageDocument } from "@/lib/commerce";

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
              onChange({
                ...document,
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
      {document.themePackage && (
        <>
          <span>
            Active: {document.themePackage.name} ·{" "}
            {document.themePackage.version}
          </span>
          <button
            className="quiet"
            disabled={locked}
            onClick={() => onChange({ ...document, themePackage: null })}
          >
            Remove uploaded theme
          </button>
        </>
      )}
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
