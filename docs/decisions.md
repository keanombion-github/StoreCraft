# Decision notes

## 2026-10-04 — Start the API foundation and confirm upcoming features

Use the installed .NET 10 LTS SDK 10.0.401, Npgsql EF provider 10.0.3, and EF Core design tooling 10.0.12. Pin packages and restore dependencies with the committed lockfile. Scaffold stores/products in the commerce schema and generate migrations without applying them. Expose health endpoints only until verified merchant identity and ownership checks exist.

BoardSync uses Neon and Render; no Supabase projects have been created. Prioritize StoreCraft and reserve a dedicated free Supabase project, confirming the account allowance at setup. Do not change BoardSync.

View store opens a separate sample preview tab. Confirm the merchant page builder with predefined widgets and draft/publish separation, plus checkout using visibly labeled test payments. These remain upcoming milestones. Future OMS integration handles fulfillment while StoreCraft owns checkout and payment records.

## 2026-10-04 — Match the reference admin structure with black and purple glass

Use a full-width top bar with a working catalog search and brand, a 200px left sidebar, a report date label, and a three-column overview grid. Use near-black backgrounds, purple branding, translucent report panels, illuminated borders, and blur. Replace Segoe UI with locally bundled Inter at weights 400–700; font files are served by the app without a Google Fonts request. Preserve the fictional-data labels and derive all report counts from existing data.

## 2026-10-04 — Refine the admin design from user feedback

Replace the violet glow direction with neutral charcoal, slate, and muted blue. Use Segoe UI and larger table, form, navigation, and helper text. Keep restrained transparent surfaces and blur, with compact corners and plain borders. Replace the decorative monogram with an inline shopping-bag outline. Remove the sidebar slogan, welcome illustration, and product promo banner. Open on Home and keep overview cards prominent, following the supplied admin reference's information-first layout.

## 2026-10-04 — Dark glass visual direction

Use the supplied dashboard image for its sidebar and overview-card organization. Apply a custom midnight background, violet accents, translucent panels, fine borders, and backdrop blur across merchant and customer screens. Keep the visual theme in `apps/web/src/app/dark-glass.css`, imported after the base layout styles. Dark surfaces retain readable solid text, and browsers without backdrop blur receive a solid panel fallback.

Home overview cards derive sales, catalog counts, and fulfillment counts from existing fictional data. Do not invent visitor tracking or real business analytics. All sales charts are labeled demo data.

## 2026-10-04 — Adopt the supplied brief

The supplied Store Builder brief is saved as PROJECT_BRIEF.md. It defines the scope and the learning workflow. StoreCraft is the current workspace name, not a finalized brand decision.

## 2026-10-04 — Start with fictional data

The first milestone uses fictional products and orders. This keeps the first learning slice focused on screen structure and React data flow. It does not establish merchant persistence or commerce security.

Reconsider when moving to Milestone 2, which introduces authentication, ownership checks, and persistent products.

## Pending — Free-service allocation

Existing Supabase project usage has not been confirmed. No cloud resources have been created or changed. Verify current allowances and existing account usage before selecting a database project.

## 2026-10-04 — Browser sandbox for the first interface

Products and settings use React state and localStorage. This makes the first interface usable without a cloud account and keeps the data flow inspectable. It is device-local sandbox data, visibly labeled in the UI. Sample orders and cart state are temporary. Reconsider at Milestone 2, when merchant persistence belongs in the authenticated API.

Use native modal dialogs for the product editor and customer details/bag so focus is contained and Escape closes them. Use browser field validation for this slice; independent API validation remains required later.

## 2026-10-04 — Tool versions

Next.js 16.3.8, React 19.2.8, TypeScript 5.9.3, Tailwind 4.3.3, and Playwright 1.63.0 are installed. All direct versions are pinned in the web manifest and lockfile. Next's installed bundled client and page/layout guidance was read. API versions remain pending.

The npm audit finds a development-only lint dependency advisory originating in braces with no current patch. Keep the matching Next lint configuration rather than force a major downgrade. Review the issue before deployment and record it in README.

The .NET and database libraries will be verified and pinned when the API is scaffolded.

## 2026-10-04 — Region-based themes and completion work

Page schema 2 adds Midnight/Linen theme presets, Essentials/Editorial home layouts, Header/Main/Footer placement, logos, and featured product references. Legacy JSON is adapted during reads without rewriting snapshots. Theme selection keeps content; explicitly applying a template replaces draft widgets after confirmation. Native dragging supplements accessible move buttons.

Supabase Storage uses a public, size/type-limited image bucket with insert-only account-folder ownership policy. Unique paths preserve published images. Checkout supports authoritative quotes, explicit hosted demo mode, free pickup, and transactionally saved OMS events. The OMS itself remains a separate future project. Netlify/Render deployment files and GitHub checks are prepared; provider access and live verification are still needed.
