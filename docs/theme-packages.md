# Uploadable StoreCraft themes

Open the demo and choose **Page builder** to start in **Your themes**. Each card offers **Edit in page builder**, **Preview storefront**, and **Set active**. The Current active badge comes from the published snapshot. Preview opens a separate browser tab without publishing; editing changes the draft. Set active publishes the selected theme with the current page content.

Expand **Upload a new theme** to download the starter or import a ZIP. Uploads are saved to the draft library automatically and leave the active storefront unchanged. Extract the starter ZIP, edit its HTML/CSS, ZIP the folder again, and upload it. Uploaded themes remain in the library when switching away. Matching name/version uploads replace that library entry; different versions get separate entries. The library holds five uploaded themes, up to 2 MB combined. The portfolio library stays in the visitor's browser; merchant libraries persist in PostgreSQL. Unpublished library packages are omitted from public storefront responses.

The editor has a back button to the library. Widget cards stay on the left, the canvas sits in the center, and selecting a placed widget opens its inspector. Page structure, branding, and starting-layout controls are expandable to keep the workspace focused.

The working source is `themes/atelier/`. The downloadable archive is `apps/web/public/theme-packages/atelier.zip`. After changing the source, run `node scripts/bundle-theme.cjs` from the project root to rebuild the download.

```text
atelier/
  theme.json
  assets/theme.css
  widgets/navigation.html
  widgets/announcement.html
  widgets/hero.html
  widgets/image-text.html
  widgets/products.html
  widgets/footer.html
```

## Manifest

`theme.json` declares `formatVersion: 1`, name, semantic version, `baseTheme` (midnight/linen), a six-digit accent, font (Inter/Georgia), stylesheet path, and widget definitions. Each definition identifies a supported region, template path, editable fields, and frame height in pixels (60–1200). The region must be one where that widget is allowed. Announcement can also be placed in the other supported regions. Templates for omitted widget types fall back to StoreCraft's built-in renderer.

Supported fields:

| Widget | Editable fields |
| --- | --- |
| Hero / ImageText | title, text, image, button |
| Navigation | title, text, button |
| Announcement / FeaturedProducts / Footer | title, text |

The featured-products selection remains a native editor control. The package skins the six existing widget types; it does not register new widget types.

## HTML and CSS

Use presentation HTML such as headings, paragraphs, sections, divs, lists, and images. Bind merchant content with `{{title}}`, `{{text}}`, `{{image}}`, `{{button}}`, `{{storeName}}`, `{{logo}}`, and `{{logoAlt}}`. Values are escaped; entering HTML into a title displays it as text. A local image can use `<img src="{{asset:assets/photo.jpg}}" alt="Description">`. PNG, JPEG, and WebP files are embedded during import; use JPEG or WebP for compact photos.

`assets/theme.css` styles the imported widget HTML. `var(--accent)` reflects the merchant's accent color. It does not change admin controls or the native commerce components. CSS imports and URL references are not supported; use image tags for images. Native product grids, search, product details, collection links, cart, and checkout keep their application behavior. Uploaded templates cannot replace checkout logic.

Each template renders inside a sandboxed iframe with scripts, forms, and access to the parent application's session/storage blocked. Uploaded HTML does not run JavaScript. StoreCraft renders collection buttons and links outside the frames. In the builder, click a widget's Edit control to customize fields; the iframe itself is a visual preview.

This first package version uses explicit widget heights. Use responsive CSS inside the frame and test narrow and wide previews; taller content may scroll inside the frame. Home widgets, header, footer, and the catalog's shared header/footer use the package. A separate product-page template engine, arbitrary widget registration, theme JavaScript, and Shopify Liquid/BigCommerce Handlebars compatibility are not included.

## Persistence and limits

The ZIP must be at most 2 MB, with at most 40 entries, at most 500 KB per expanded file, and at most 2 MB total expanded content. Path traversal, duplicate paths, unsupported HTML tags, and executable templates are rejected. HTML templates are limited to 300,000 characters and CSS to 100,000 characters. The normalized embedded package must fit within 2 MB.

The portfolio demo keeps the compiled package in that visitor's browser alongside draft/published designs. Browser storage can fill up; the builder reports failures. Merchant stores save the compiled package in their existing draft/published JSON in PostgreSQL, so no new schema migration is required. Publishing creates a snapshot; another theme upload does not change an existing published snapshot until Publish is clicked.

Implementation files: `apps/web/src/lib/theme-packages.ts` (ZIP importer and bindings), `apps/web/src/components/theme-package-upload.tsx` (upload/download controls), `apps/web/src/components/storefront-renderer.tsx` (sandboxed rendering), and `apps/api/Features/Storefront/ThemePackage.cs` (server validation).

Theme downloads are available on each theme card. Uploaded themes export their compiled HTML and CSS, including embedded images. Built-in themes export their native base preset and an editable announcement template; other widgets continue to use StoreCraft's native rendering. Upload is always visible above the inactive theme library. The published theme occupies its own row.
