# Uploadable StoreCraft themes

Open the demo, choose **Page builder**, and use **Download starter theme**. Extract the ZIP, edit the files, ZIP the theme folder again, and choose **Upload theme ZIP**. Importing changes the draft's appearance while preserving products, widgets, content, and logo. Save draft to keep it; Publish updates the storefront in a new tab. Pick Midnight or Linen, or Remove uploaded theme, to return to the built-in renderer without losing content.

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
