# Containers and demo storefront sharing

## Column layouts

Open Page builder, edit a theme, then choose **Container** in the Main widget library. Its settings offer one to eight columns, spacing, vertical alignment, and a name. Each container holds up to eight content widgets; the existing 24-widget page limit includes its children.

Drag content into a column. On touch screens, select a container and its destination column, then tap a Main content widget in the library. Click a child to edit its own fields. Its Placement control moves it between columns or back onto the Main page. Containers cannot contain other containers, navigation, or footers.

Reducing the number of columns moves affected children into the last remaining column without deleting them. Deleting a populated container asks whether to delete its children too; move them out first to keep them. Containers cannot be duplicated yet. Columns stack on phones, including the editor's Phone preview.

The widget library stays visible while the page scrolls, with its own scroll area. On phones it uses a shorter panel to leave space for the canvas.

## Sharing a demo

Publish the demo, then choose **Share published demo** in the editor or theme library. Copy the link or open it in a new tab. This creates a read-only snapshot of the published page and active demo products, encoded into the URL fragment. It works in a different browser without reading or changing that visitor's saved workspace. Product browsing works; the shared snapshot does not create orders or accept payments.

The snapshot stays as it was when copied. Later edits require publishing and copying a new link. Anyone holding the link can read the included demo content; share only content you intend to show publicly. StoreCraft does not store these snapshots on the server, and links have no revocation or expiry controls. This first version uses long links (up to 16,000 encoded characters); some messaging services may truncate them. If content exceeds the size limit, the interface asks for smaller images or HTTPS image links. Uploaded theme assets and inline images can reach the limit quickly.

Sharing across computers needs a publicly hosted StoreCraft frontend. A localhost URL only opens on the machine running it. Hosting setup remains in deployment.md; no deployment has been created yet.

Merchant stores still publish to the stable /s/{slug} address using the API and database. Their Copy storefront link action copies that URL rather than a demo snapshot.

## Files

- src/components/page-builder.tsx: container settings, placement, deletion and editing.
- src/components/storefront-renderer.tsx: columns and nested content rendering.
- src/lib/demo-sharing.ts: snapshot encoding, bounded decoding and content validation.
- src/components/share-storefront.tsx: link actions.
- src/app/shared-storefront/page.tsx: shared snapshot route.
- apps/api/Features/Storefront/PageDocument.cs: persisted layout rules.
