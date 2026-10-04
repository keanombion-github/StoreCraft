import { Unzip, UnzipInflate, strFromU8 } from "fflate";
import type { ThemePackage, Section, PageDocument } from "./commerce";
import { regions, widgets } from "./storefront-themes";

const widgetTypes = [...new Set(regions.flatMap((r) => widgets[r]))];
const tags = new Set(
  "div section article header footer h1 h2 h3 h4 h5 h6 p span img strong em small ul ol li figure figcaption br hr b i".split(
    " ",
  ),
);
const fields = ["title", "text", "image", "button"];
const fieldsFor = (type: string) =>
  type === "Hero" || type === "ImageText"
    ? fields
    : type === "Navigation"
      ? ["title", "text", "button"]
      : ["title", "text"];
export function validateThemePackage(theme: ThemePackage) {
  if (
    theme.formatVersion !== 1 ||
    typeof theme.name !== "string" ||
    !theme.name.trim() ||
    theme.name.length > 80 ||
    typeof theme.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(theme.version)
  )
    throw new Error(
      "Use formatVersion 1, a name, and a version such as 1.0.0.",
    );
  if (
    typeof theme.css !== "string" ||
    theme.css.length > 100_000 ||
    /@import|url\s*\(|<|expression\s*\(/i.test(theme.css)
  )
    throw new Error(
      "CSS must be local, without imports, URL references, or executable content. Use image tags for assets.",
    );
  if (
    !theme.widgets ||
    typeof theme.widgets !== "object" ||
    Array.isArray(theme.widgets) ||
    !Object.keys(theme.widgets).length
  )
    throw new Error("Include at least one widget template.");
  for (const [type, widget] of Object.entries(theme.widgets)) {
    if (
      !widgetTypes.includes(type as Section["type"]) ||
      !widget ||
      typeof widget.html !== "string" ||
      widget.html.length > 300_000 ||
      !Number.isInteger(widget.height) ||
      widget.height < 60 ||
      widget.height > 1200 ||
      !Array.isArray(widget.fields) ||
      widget.fields.length > 4 ||
      widget.fields.some((f) => !fieldsFor(type).includes(f))
    )
      throw new Error(
        "Each supported widget needs HTML, a height from 60–1200, and supported editable fields.",
      );
    for (const match of widget.html.matchAll(/<\s*\/?\s*([a-z][a-z0-9]*)/gi))
      if (!tags.has(match[1].toLowerCase()))
        throw new Error(
          `Unsupported HTML tag: ${match[1]}. Use presentation HTML; StoreCraft provides interactive controls.`,
        );
    if (/\bon[a-z]+\s*=|javascript\s*:|\bsrcdoc\s*=|<!|<\?/i.test(widget.html))
      throw new Error(
        "Scripts, event handlers, and embedded documents are not supported.",
      );
    for (const match of widget.html.matchAll(/\{\{([^}]+)\}\}/g))
      if (![...fields, "storeName", "logo", "logoAlt"].includes(match[1]))
        throw new Error(`Unknown template placeholder: ${match[1]}.`);
  }
  if (JSON.stringify(theme).length > 2_000_000)
    throw new Error("The expanded theme must be under 2 MB.");
}

// Streaming decompression caps actual output, including archives with misleading size headers.
function unpack(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    const files: Record<string, Uint8Array> = Object.create(null);
    let total = 0,
      count = 0,
      failed = false;
    const unzip = new Unzip((file) => {
      if (failed) return;
      if (
        ++count > 40 ||
        file.name.includes("..") ||
        file.name.includes("\\") ||
        file.name.startsWith("/") ||
        file.name in files
      ) {
        failed = true;
        reject(
          new Error(
            "Invalid archive paths, duplicate files, or too many files.",
          ),
        );
        return;
      }
      if (file.name.endsWith("/")) return;
      files[file.name] = new Uint8Array();
      const chunks: Uint8Array[] = [];
      let size = 0;
      file.ondata = (error, data, final) => {
        if (failed) return;
        if (error) {
          failed = true;
          reject(new Error("The ZIP archive could not be read."));
          return;
        }
        total += data.length;
        size += data.length;
        if (total > 2_000_000 || size > 500_000) {
          failed = true;
          file.terminate();
          reject(
            new Error(
              "Expanded theme exceeds 2 MB, or an individual file exceeds 500 KB.",
            ),
          );
          return;
        }
        chunks.push(data);
        if (final) {
          const joined = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            joined.set(chunk, offset);
            offset += chunk.length;
          }
          files[file.name] = joined;
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try {
      for (let offset = 0; offset < bytes.length && !failed; offset += 1024)
        unzip.push(
          bytes.subarray(offset, offset + 1024),
          offset + 1024 >= bytes.length,
        );
      if (!failed) resolve(files);
    } catch {
      reject(new Error("Choose a valid, unencrypted theme ZIP."));
    }
  });
}

export async function importTheme(file: File): Promise<{
  theme: ThemePackage;
  baseTheme: "midnight" | "linen";
  accent: string;
  font: string;
}> {
  if (
    !file.name.toLowerCase().endsWith(".zip") ||
    file.size > 2_000_000 ||
    !file.size
  )
    throw new Error("Choose a StoreCraft theme ZIP up to 2 MB.");
  const files = await unpack(new Uint8Array(await file.arrayBuffer()));
  const manifests = Object.keys(files).filter(
    (path) => path === "theme.json" || path.endsWith("/theme.json"),
  );
  if (manifests.length !== 1)
    throw new Error("The ZIP must contain exactly one theme.json manifest.");
  const root = manifests[0].slice(0, -"theme.json".length);
  const manifest = JSON.parse(strFromU8(files[manifests[0]]));
  function read(path: string) {
    if (typeof path !== "string" || path.includes("..") || !files[root + path])
      throw new Error(`Missing or invalid theme file: ${path}`);
    return strFromU8(files[root + path]);
  }
  const theme: ThemePackage = {
    formatVersion: manifest.formatVersion,
    name: manifest.name,
    version: manifest.version,
    css: read(manifest.stylesheet),
    widgets: {},
  };
  if (!manifest.widgets || typeof manifest.widgets !== "object")
    throw new Error("Missing widget definitions.");
  for (const [type, definition] of Object.entries(manifest.widgets)) {
    const entry = definition as {
      template: string;
      height: number;
      fields: string[];
      region: string;
    };
    if (
      !regions.includes(entry.region as (typeof regions)[number]) ||
      !widgets[entry.region as (typeof regions)[number]].includes(
        type as Section["type"],
      )
    )
      throw new Error(`Invalid region for ${type}.`);
    let html = read(entry.template);
    html = html.replace(/\{\{asset:([^}]+)\}\}/g, (_match, path: string) => {
      const image = files[root + path];
      const extension = path.split(".").pop()?.toLowerCase();
      if (
        !image ||
        !["png", "jpg", "jpeg", "webp"].includes(extension ?? "") ||
        path.includes("..")
      )
        throw new Error("Theme assets must be local PNG, JPEG, or WebP files.");
      let binary = "";
      for (const value of image) binary += String.fromCharCode(value);
      return `data:image/${extension === "jpg" ? "jpeg" : extension};base64,${btoa(binary)}`;
    });
    theme.widgets[type as Section["type"]] = {
      html,
      height: entry.height,
      fields: entry.fields,
    };
  }
  validateThemePackage(theme);
  if (
    !["midnight", "linen"].includes(manifest.baseTheme) ||
    !/^#[a-f0-9]{6}$/i.test(manifest.accent) ||
    !["Inter", "Georgia"].includes(manifest.font)
  )
    throw new Error(
      "Choose a supported baseTheme, font, and six-digit accent color.",
    );
  return {
    theme,
    baseTheme: manifest.baseTheme,
    accent: manifest.accent,
    font: manifest.font,
  };
}

export function themeWidgetHtml(
  page: PageDocument,
  section: Section,
  storeName: string,
) {
  const theme = page.themePackage!;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]!,
    );
  const values: Record<string, string> = {
    title: section.title,
    text: section.text,
    image: /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(
      section.image,
    )
      ? section.image
      : "",
    button: section.button,
    storeName,
    logo: page.logo ?? "",
    logoAlt: page.logoAlt ?? storeName,
  };
  const html = theme.widgets[section.type]!.html.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => escape(values[key] ?? ""),
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;font-family:${page.font === "Georgia" ? "Georgia,serif" : "Inter,Arial,sans-serif"}}:root{--accent:${page.accent}}${theme.css}</style></head><body>${html}</body></html>`;
}
