# Persistent merchant commerce

Open http://localhost:3000/merchant. Create your account, confirm the email if requested, and sign in. Create a store with a unique slug; sunday-supply belongs to the original sample shop.

1. Add an Active product with stock.
2. Open Page builder. Add Hero, FeaturedProducts, ImageText, Announcement, or Footer widgets. Edit text, HTTPS image URLs, font, and accent. Move sections up/down and check the phone preview.
3. Save draft preserves work without changing the public shop. Publish saves a separate snapshot. View store opens your shop in a new tab.
4. Add a product to the bag, enter fictional guest details, and choose successful or failed test payment. No money moves.
5. Find the order under Orders. Paid orders can progress to Shipped with tracking, then Delivered. Failed payments leave stock unchanged.

## Where to look

| File | Purpose |
| --- | --- |
| apps/web/src/components/merchant-workspace.tsx | Login, store creation, products, orders, settings, and navigation. |
| apps/web/src/components/page-builder.tsx | Widget editor and shared storefront renderer. |
| apps/web/src/components/public-store.tsx | Published shop, saved bag, checkout, and private receipt link. |
| apps/web/src/lib/commerce.ts | Supabase session and API requests. |
| apps/api/Auth/SupabaseAuthentication.cs | Signed token verification and merchant claims. |
| apps/api/Features/Products/ProductEndpoints.cs | Product validation and ownership checks. |
| apps/api/Features/Storefront/StorefrontEndpoints.cs | Drafts, published snapshots, settings, and public reads. |
| apps/api/Features/Orders/CheckoutEndpoints.cs | Prices, shipping, stock locking, retry protection, receipts, and fulfillment. |
| apps/api/Data/CommerceDbContext.cs | Database relationships and constraints. |
| tests/StoreCraft.Api.Tests/CommerceJourney.cs | Real database integration checks with temporary fixtures. |

The browser sends product IDs and quantities. The API reads current prices, locks stock inside a transaction, calculates shipping, and saves purchased-item snapshots. Browser-edited prices are ignored. Repeating the same checkout request returns the same order.

Database credentials and the receipt signing key stay in local .NET user secrets. Browser configuration stays in ignored .env.local; copy .env.example for a new machine. Supabase Data API remains disabled because commerce uses the .NET API.

## Run and verify

From the repository root:

```powershell
dotnet run --project apps/api --no-launch-profile -- --environment Development --urls http://localhost:5050
dotnet test tests/StoreCraft.Api.Tests
```

From apps/web, run npm run dev. Verification commands are npm run lint, npm run build, and npm run test:e2e.

Database integration checks verify ownership, publishing isolation, failed payments, server prices, duplicate retries, last-unit competition, receipts, and fulfillment, then delete their uniquely identified fixtures. Browser checks cover desktop and phone behavior. The new checkout browser test mocks API responses; backend integration checks independently use real PostgreSQL. A full browser journey with a real Supabase account still needs your signup.

## Current boundaries

See [the theme milestone](storefront-themes.md) for the newer themes, regions, image/logo uploads, catalog, pickup, and order sync queue. The simulator now also works in an explicitly configured hosted demo. Live deployment and an actual OMS connection remain unverified; setup is prepared in [deployment.md](deployment.md). Shipping currently uses Singapore and SGD. The original root dashboard and sunday-supply shop remain browser sandboxes.

For confirmation emails, set Supabase Auth Site URL to http://localhost:3000 and allow http://localhost:3000/merchant as a redirect URL.

Learning exercise: add an Announcement, save draft, compare the public shop, then publish. Follow the save request into StorefrontEndpoints.cs to see why draft and publish behave differently.
