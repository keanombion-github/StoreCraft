# Milestone 2: the API and database foundation

## What was built in this slice

The .NET API runs independently of Next.js. It has a process health endpoint and a database connection check. EF Core defines Stores and Products in a dedicated `commerce` PostgreSQL schema. A committed migration and a generated SQL script describe those tables without requiring a live database.

No Supabase resource has been created or changed. No migration has been applied. Login, API token verification, ownership enforcement, and merchant product endpoints are still to implement. The dashboard still uses browser sandbox data.

## Where to look

- `apps/api/Program.cs`: starts the API and exposes health checks.
- `apps/api/Features/Stores/Store.cs`: one merchant-owned store.
- `apps/api/Features/Products/Product.cs`: a product belonging to that store.
- `apps/api/Data/CommerceDbContext.cs`: relationships and database constraints.
- `apps/api/Migrations/`: versioned database creation instructions.
- `docs/database-initial.sql`: human-readable SQL generated from the migration.
- `apps/web/src/app/s/sunday-supply/page.tsx`: separate sample-store preview URL.

## What the database is responsible for

A store has an owner ID from Supabase Auth. Each product has a StoreId pointing to its store. One owner can own one store; each store slug is globally unique. A product slug only has to be unique within its store. Prices use integer minor units, stock cannot be negative, and status is Draft, Active, or Archived.

These constraints protect data integrity. They do not prove who is making a request. Later, the API will validate a Supabase token and compare its user ID to the store owner before reading or changing merchant data.

The next data flow is: merchant signs in → browser receives an identity token → API verifies the token → API checks store ownership → EF Core queries or updates PostgreSQL.

## Try it

From the repository root, run:

```powershell
dotnet run --project apps/api --no-launch-profile -- --environment Development --urls http://localhost:5050
```

Open http://localhost:5050/health. It should report that the API is running. `/health/ready` should return 503 with a configuration message until a database is configured. A successful connection check still does not claim the schema has been migrated.

Open the dashboard and use View store. The storefront opens at `/s/sunday-supply` in a new tab, while the dashboard remains open. It reads the same browser-saved sandbox collection when opened. This is a preview route for one sample shop, not completed multi-store routing or publishing. Refresh the storefront after editing products in the dashboard to reload the preview data.

## Supabase setup next

Create a dedicated StoreCraft project in a Free organization through the Supabase dashboard. Save its database password privately. Use the Connect panel for the database settings. For a local machine needing IPv4, the Session pooler is an option; a direct connection is suitable when the host supports its networking requirements. Npgsql uses a semicolon-delimited connection string, not a pasted PostgreSQL URL.

Store database secrets through .NET user-secrets or deployment environment variables, as described in `apps/api/README.md`. Keep them out of source files and chat. The project URL and browser publishable key will be used when implementing merchant login. Privileged keys belong only on the server.

On 2026-10-04, the [Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) states an allowance of two active free projects, and [billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase) lists 500 MB database size per Free project. No existing Supabase projects were reported; BoardSync uses Neon and Render. Reserve one free project for StoreCraft; Invoice Reminder is deferred. Check the actual account allowance during setup.

Official connection guidance: [connecting to PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Confirmed next features

The page builder is merchant-facing. It will offer predefined Hero, Featured products, Image and text, Announcement, and Footer widgets. Merchants can add, edit, duplicate, remove, and reorder them, then save a draft, preview, or publish. Customers browse the resulting page. Draft and published versions stay separate, with shared rendering components and server document validation.

Checkout will support conspicuously labeled test payments, beginning with our app-owned simulator. A successful test creates an order; failures remain failures. Prices, shipping, stock, and retry protection belong to the API. Real cards are not collected by the simulator. Stripe sandbox remains optional, subject to account availability.

A future OMS can consume orders and return delivery or pickup fulfillment updates. StoreCraft remains the source of checkout and payment records. This integration is planned, not built.

## Your small learning task

Open `Product.cs` and find `StoreId`. Then find its foreign key in `CommerceDbContext.cs`. Explain why a product needs that reference even though it already has its own ID. You do not need to edit the schema yet.

## Verification

API compilation and migration SQL generation succeeded. HTTP checks returned 200 for process health and 503 for readiness without database configuration. The web production build and lint checks passed; browser checks exercise the new-tab preview on desktop and phone. Live PostgreSQL migration execution, database constraints, authentication, and cross-merchant access have not yet been integration-tested because no database or Auth project is connected.

