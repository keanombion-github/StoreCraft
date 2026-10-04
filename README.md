# StoreCraft

A learning project for a merchant dashboard and customer storefront. StoreCraft is the folder name; the final product name remains open.

## Current status

A working first interface is in `apps/web`: a responsive merchant dashboard and sample customer storefront with fictional data. The .NET API and store/product migration are scaffolded in `apps/api`; they are not connected to Supabase or the dashboard yet. Authentication, live database storage, the section builder, publishing, and checkout remain to build.

See [docs/milestone-2-foundation.md](docs/milestone-2-foundation.md) for the API walkthrough and Supabase setup step. View store now opens the sample storefront in a new tab at `/s/sunday-supply`.

The full scope and learning checkpoints are in [PROJECT_BRIEF.md](PROJECT_BRIEF.md).

## Run it locally

Open a terminal and run:

```powershell
cd D:\Projects\StoreCraft\apps\web
npm ci
npm run dev
```

Then open http://localhost:3000. Stop the server with Ctrl+C.

## What works now

- Home: product counts, fictional order totals, and setup shortcuts.
- Products: search, status filtering, add/edit, stock, price, description, and visibility.
- Orders: fictional order details and a session-only fulfillment simulation for paid orders.
- Storefront: active products, product details, search, and a sample bag with quantity controls and shipping estimates.
- Settings: store name, contact email, and flat-rate/free-threshold shipping.

Products and settings save in this browser using `localStorage`. This is a learning sandbox, not signed-in merchant persistence. Orders and the sample bag reset when their session ends. Product photos load from Unsplash and need an internet connection. New products reuse a sample photo; uploading images comes later.

## Where to look in the files

| File | What it does |
| --- | --- |
| `apps/web/src/app/page.tsx` | Opens the application at `/`. |
| `apps/web/src/app/layout.tsx` | Defines the outer HTML and browser tab title. |
| `apps/web/src/components/store-app.tsx` | Dashboard navigation, lists, counts, product/settings state, and browser saving. |
| `apps/web/src/components/store-forms.tsx` | Product editor and store settings forms. |
| `apps/web/src/components/storefront.tsx` | Customer view, product details, bag, and estimated totals. |
| `apps/web/src/lib/demo-data.ts` | Fictional products, sample orders, data types, photos, and price formatting. |
| `apps/web/src/app/globals.css` | Colors, spacing, tables, storefront styling, and phone layouts. |
| `apps/web/src/app/dark-glass.css` | Dark glass theme: background glows, transparency, blur, borders, and purple accents and locally bundled Inter typography. |
| `apps/web/src/components/overview-cards.tsx` | Home overview cards and sample sales chart, derived from fictional data. |
| `apps/web/tests/workspace.spec.ts` | Browser checks for the important interface flows. |

Read [docs/learning-milestone-1.md](docs/learning-milestone-1.md) for a walkthrough and a small practice task.

## Verification

Run these from `apps/web`:

```powershell
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser checks cover product persistence and draft visibility, cart quantities, settings persistence, navigation, failed-payment fulfillment restrictions, and desktop/phone layout. They do not verify backend commerce rules, since there is no API yet.

## Installed versions

Node 24.21.0 and npm 11.19.0 were used. Direct dependencies are pinned in `apps/web/package.json`, with resolved dependencies in `package-lock.json`: Next.js 16.3.8, React/React DOM 19.2.8, TypeScript 5.9.3, Tailwind and its PostCSS plugin 4.3.3, Playwright 1.63.0, Prettier 3.9.9, ESLint 9.39.5, and eslint-config-next 16.3.8. The installed Next.js bundled page/layout and client-component guidance was read before implementation.

The dependency audit currently reports five high-severity entries in the development lint dependency chain stemming from `braces` (GHSA-vfj7-8cjw-p6xm). No patched braces release was available at implementation time; the suggested automatic fix downgrades the Next lint configuration to a different major version. This remains an open tooling issue. Production dependencies should be audited again before deployment.

## First working slice

Start with a responsive dashboard shell, a products list, and a sample storefront using fictional products. Navigation should lead to useful content, and unfinished features should be clearly labeled.

The interface displays data; later, the .NET API will enforce store ownership and commerce rules, and PostgreSQL will save the results. Fictional data lets us learn the interface before introducing those services.

## Working approach

1. Explain the purpose, data flow, and one tradeoff.
2. Build a small working slice.
3. Verify it and explain the changed files.
4. Give Kean one bounded adjustment to make.

## Decisions still needed

- Confirm how many Supabase free projects are already in use.
- Select the supported .NET LTS and database library versions when scaffolding the API.
- Verify current free-tier limits before allocating services or deploying.

Do not reuse or modify another project's database without a deliberate allocation decision.

See [docs/decisions.md](docs/decisions.md) for decision notes.


