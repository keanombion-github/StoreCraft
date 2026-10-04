# First interface: how it works

## Open the app

Run `npm run dev` from `D:\Projects\StoreCraft\apps\web` and visit http://localhost:3000. The first screen is Home. The sidebar opens Home, Products, Orders, Storefront, and Settings. Use View store to open the customer experience and Back to dashboard to return.

## Follow one product change

1. `src/lib/demo-data.ts` supplies the initial fictional collection. Each product has an ID, title, price, stock, description, category, photo, and status.
2. `src/components/store-app.tsx` holds the current product array in React state. State is the data the screen remembers while it is running.
3. Clicking Add product or a product row opens `ProductEditor` in `src/components/store-forms.tsx`. The browser checks required fields, positive prices, and whole-number stock quantities.
4. Saving the form creates a product object and calls the dashboard's `onSave` callback. A callback is a function passed to another component so it can report an action.
5. The dashboard replaces the existing product with the same ID, or adds a new one. React renders the updated table and counts. The dashboard also attempts to save products and settings in browser storage; failures show a warning.
6. The dashboard filters the product array to `status === "Active"` before passing it to `Shop` in `src/components/storefront.tsx`. A draft stays out of this preview.

This visibility filter is interface behavior, not a security boundary. Later the .NET API must enforce what a public customer can read.

## Why prices look different in the data

A price of `2400` means SGD 24.00. `money()` in `demo-data.ts` divides by 100 and formats the display. The form turns an entered decimal into an integer using `Math.round(amount * 100)`. Integer minor units are easier to reason about than fractional floating-point values for commerce.

The sample bag calculates estimates from these products. Real checkout will calculate authoritative prices and shipping in the API and preserve purchased prices in order items.

## Separate pieces, shared data

`store-app.tsx` owns the catalog and settings. Forms report changes to it; the storefront receives the active catalog and settings. This prevents each screen from keeping a separate, disagreeing catalog.

`globals.css` defines the base layout; dark-glass.css adds the neutral charcoal and blue theme. Its media queries change the sidebar to horizontal navigation on a phone, stack the storefront hero, and reduce the product grid columns. Wide merchant tables scroll inside their own area.

The dashboard screens currently switch through React state at `/`; they are not separate URL routes yet. Multiple stores and public `/s/{storeSlug}` routes come after ownership and persistent store data.

## Try this walkthrough

1. Add a product titled Practice mug, priced at 12.50, with stock 3. Leave it Draft.
2. Reload: it should still be in Products.
3. Open View store: the draft should be absent.
4. Return, edit the product, and select Active.
5. Open the store: it should now appear. Add it to the bag and change quantity.
6. Under Settings, change the shipping rate, save, and return to the store to see the new estimate.
7. Under Orders, open a Paid order and simulate shipping. A Failed order has no shipping action.

## Your small practice task

In `src/components/storefront.tsx`, find the sentence "Thoughtful essentials for slow mornings" and change it to your own shop tagline. Save the file while the dev server runs; the storefront should update automatically.

Then trace an edited product price: which file handles the form, which file owns the product array, and which file displays the customer price? That is the main learning checkpoint for this slice.

## Still to build

Authentication, store ownership, the .NET API, PostgreSQL migrations, uploads, SKU/slug fields, persistent merchant records, real public store routes, the section builder, draft/published snapshots, checkout, secure order confirmation, authoritative inventory, and deployment. This first slice does not complete all Milestone 1 acceptance criteria, especially the visual builder and full order search/filtering.

## Verification on 2026-10-04

The production build and lint checks passed. Four Playwright checks passed across desktop Chromium and an emulated phone, covering product persistence, draft visibility, bag estimates and quantities, settings persistence, navigation, fulfillment restrictions, and page width. Dashboard, storefront, and phone editor screenshots were inspected. Production dependency audit reported zero vulnerabilities; the development lint advisory is recorded in README.

