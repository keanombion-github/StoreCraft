import { zipSync, strToU8 } from "fflate";
import type { PageDocument } from "./commerce";
import { themes, regions, widgets } from "./storefront-themes";
export function downloadTheme(page: PageDocument) {
  const base = page.themeId ?? "midnight";
  const theme = page.themePackage;
  const definitions = theme?.widgets ?? {
    Announcement: {
      html: "<section><h2>{{title}}</h2><p>{{text}}</p></section>",
      height: 80,
      fields: ["title", "text"],
    },
  };
  const files: Record<string, Uint8Array> = {};
  const manifest = {
    formatVersion: 1,
    name: theme?.name ?? themes[base].name,
    version: theme?.version ?? "1.0.0",
    baseTheme: base,
    accent: page.accent,
    font: page.font,
    stylesheet: "assets/theme.css",
    widgets: Object.fromEntries(
      Object.entries(definitions).map(([type, widget]) => {
        const template = `widgets/${type.toLowerCase()}.html`;
        files[template] = strToU8(widget!.html);
        return [
          type,
          {
            template,
            height: widget!.height,
            fields: widget!.fields,
            region: regions.find((region) =>
              widgets[region].includes(type as (typeof widgets.Header)[number]),
            ),
          },
        ];
      }),
    ),
  };
  files["theme.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["assets/theme.css"] = strToU8(
    theme?.css ??
      "section { padding: 12px 24px; text-align: center; } h2 { margin: 0; font-size: 16px; } p { margin: 6px 0; }",
  );
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(zipSync(files, { level: 6 }))], {
      type: "application/zip",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
