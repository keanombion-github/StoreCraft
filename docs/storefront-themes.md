# Themes, templates, and regions

HTML/CSS theme ZIP uploads are now supported. Start with **Download starter theme** in Page builder; see [the theme package guide](theme-packages.md) for the file format, source folder, and editing instructions.

Page builder now starts in **Your themes**. Preview designs in new tabs, open a theme's editor, or use Set active to publish it. Uploaded themes remain in the library when switching designs. Editing and previewing leave the currently published theme unchanged.

For the portfolio demo, open http://localhost:3000/ and select **Page builder**. No login is required. Products, settings, draft designs, and published designs are stored in that visitor's browser. Publish updates their sample storefront at `/s/sunday-supply`, opened in a new tab. Demo images are stored locally (up to 1 MB each); browser storage limits apply. The sample bag is a preview and does not create orders.

Preview the designs at http://localhost:3000/themes. The separate http://localhost:3000/merchant route still requires login for database-backed stores, uploads, orders, and test checkout. Authentication and ownership checks remain enforced on the API.

**Theme** controls the appearance. Midnight uses black surfaces and violet accents; Linen uses warm paper colors, plum accents, and Georgia. Selecting a theme keeps widget content, products, and the logo. Accent and font remain editable.

**Template** is a starting arrangement. Essentials puts the collection before the store story; Editorial puts the story first. Applying a template explicitly replaces draft widgets after a confirmation. It keeps the current theme, uploaded logo, products, and published snapshot.

**Regions** define where widgets belong:

| Region | Allowed widgets |
| --- | --- |
| Header | Optional Navigation and Announcements |
| Main | Hero, FeaturedProducts, ImageText, Announcement |
| Footer | Optional Footer and Announcements |

Navigation and Footer cannot be duplicated, but can be deleted and restored from the library. Main must retain at least one widget. Every placed widget has Move, Edit, and Delete controls; Move uses a drag handle. Drag to reorder compatible widgets, or use keyboard-accessible arrow buttons. Footer moves within Footer and navigation within Header. The API validates these rules independently of the editor.

The left widget library shows each widget once. Drag a card into a dashed space in the canvas; compatible spaces highlight in purple. For click or touch placement, choose Add widgets to and tap a card. A selected container uses its chosen column for compatible content widgets. Navigation and footer retain their dedicated placements. Select a placed widget or its Edit button to open the right inspector, which offers fields appropriate to that widget. Close the inspector to expand the canvas. Drag the Edit handle to move a placed widget, or use the arrows in Page regions.

The document is schema version 2. Older version 1 drafts/snapshots load through a compatibility adapter; their saved JSON is not rewritten just by viewing them. Saving and publishing remain separate. The same renderer powers the editor, shop, catalog, and theme gallery.

## How to try the complete flow

1. Create a merchant account, confirm the email if requested, and create your store.
2. Add an Active product, upload a JPEG/PNG/WebP image, and give it useful alternative text.
3. Open Page builder, choose a theme, and customize the default widgets. Upload a logo, select featured products, arrange regions, and check the phone preview.
4. Save draft and compare the published storefront. Publish when ready. View published opens a new tab.
5. Open Collection to browse every active product at `/s/your-slug/catalog`, search, page through products, and open product details.
6. In Settings, optionally enable pickup and enter its collection address. Checkout shows the current API quote for delivery or pickup and verifies stock/prices again during payment.
7. Simulate a failed payment to check that the bag and stock remain available. Simulate success to create a paid order. Delivery progresses to Shipped then Delivered; pickup progresses to ReadyForPickup then Collected.

## Files to understand

| File | Responsibility |
| --- | --- |
| apps/web/src/lib/storefront-themes.ts | Theme presets, templates, allowed widgets, and old-page compatibility. |
| apps/web/src/components/page-builder.tsx | Theme/layout selection, regions, reordering, uploads, widget editing, save/publish. |
| apps/web/src/components/storefront-renderer.tsx | Shared visual renderer, catalog search/pagination, and product details. |
| apps/web/src/components/image-upload.tsx | Image decoding, file limits, unique uploads, and public asset URLs. |
| apps/web/src/app/dark-glass.css | Merchant theme library and storefront theme styles. |
| apps/api/Features/Storefront/PageDocument.cs | Server schema, compatibility, and region validation. |
| apps/api/Features/Orders/CheckoutEndpoints.cs | Authoritative quotes, demo checkout, stock transactions, receipts, and delivery/pickup transitions. |
| apps/api/Features/Orders/OrderEvent.cs | Transactional order events and owned polling/acknowledgment endpoints for a future OMS. |
| docs/storage-policy.sql | Public-image bucket limits and account-folder upload policy, applied by the new migration. |
| netlify.toml, render.yaml, Dockerfile | Deployment configuration; see deployment.md. |

## Images and permissions

The public `storecraft-assets` bucket accepts JPEG, PNG, and WebP files up to 5 MB. The browser also decodes images and rejects dimensions above 8000 pixels. Supabase enforces the bucket limits and RLS upload policy; merchants can insert only into their own authenticated-user folder after they have created a store. The product API rejects image paths belonging to a different account and requires alternative text. Widget images may use an HTTPS URL.

Each upload uses a fresh UUID path. Removing an image from an editor removes its reference, not its stored object, so older published snapshots still work. Unreferenced uploads currently remain in Storage; periodic cleanup and multiple photos per product are future improvements.

The policy follows [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [bucket limits](https://supabase.com/docs/guides/storage/buckets/creating-buckets), and [standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads). Object creation uses the Storage API; SQL defines the bucket and access policy.

## Future OMS connection

Checkout and fulfillment save an event in the same database transaction as the order change. Failed transactions leave no event. Retrying an identical checkout creates no second order/event. These events are already recorded; a separate OMS is not yet connected or built.

An adapter authenticates as the merchant and polls `GET /api/merchant/sync/events`. It receives at most 100 unacknowledged events in ID order. After importing each event successfully, it sends `POST /api/merchant/sync/acknowledge` with `{"ids":[123,124]}`. Acknowledgments are idempotent and reject other stores' IDs. The OMS should deduplicate by event ID, since retries can deliver an event again. Event payloads contain private customer/order information and must stay in authorized systems.

The payload includes schemaVersion, order ID/reference, currency, amounts, payment and fulfillment states, delivery/pickup method, tracking, customer/address snapshots, and purchased items. Add dedicated scoped service credentials before unattended integration; do not embed a merchant password in an OMS script.

## Verification and practical limits

Run frontend lint/build and Playwright tests from apps/web. Run `dotnet test tests/StoreCraft.Api.Tests` from the root. Database tests use uniquely owned temporary fixtures and clean them up. Browser tests mock API/Auth/Storage responses for repeatable editor, upload, and checkout checks; they do not claim to verify real Supabase email delivery or a real image upload by your account.

The GitHub workflow runs frontend checks, browser tests with fixture configuration, backend unit checks, and a container build. It deliberately excludes database integration tests from public pull requests; those require local database credentials. Live hosting, your confirmed merchant signup/upload, and an actual OMS connection need separate verification. This remains a demo: no real payment charges, tax engine, live carrier tracking, multi-country delivery, or stock reservations for asynchronous payments.

Learning exercise: change only the theme and observe the unchanged text. Save draft, inspect the shop, and then publish. Compare that with applying a template, which replaces draft widget content explicitly.
