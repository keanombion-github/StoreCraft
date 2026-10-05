# Publish StoreCraft with Netlify and Render

Configuration is prepared in the repository. A live deployment has not been created or verified yet. Use your existing accounts; no database password or privileged key belongs in GitHub.

## Render API

Create a Blueprint from the StoreCraft GitHub repository using root `render.yaml`. It defines a free Docker web service, a production environment, and the database readiness check. The root Dockerfile builds only the .NET API and runs under the container's non-root app user.

Fill these private/environment values in Render:

| Variable | Value |
| --- | --- |
| ConnectionStrings__Commerce | Your existing Supabase PostgreSQL connection string, including the private password. Use Npgsql key/value format as configured locally. |
| Demo__ConfirmationSecret | A base64-encoded random key of at least 32 bytes. Keep it stable so existing receipt links keep working. |
| Cors__Origins__0 | The final Netlify URL, for example https://your-storecraft.netlify.app, with no trailing slash. |

Supabase__Url, production environment, port 8080, and Demo__Enabled=true are already declared. Explicit demo mode enables simulated checkout on the hosted portfolio; it never performs real payment processing. If demo mode is disabled, checkout is unavailable and the storefront says so.

To copy a freshly generated receipt key locally without printing it:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | Set-Clipboard
```

Apply committed migrations deliberately from your configured machine before deploying; startup does not migrate the database automatically. The latest migration has already been applied to the current StoreCraft project, including the public-image bucket and upload policy. `/health/ready` verifies database connectivity and that committed migrations are applied.

## Netlify frontend

Import the StoreCraft repository. Root `netlify.toml` selects apps/web, Node 24, the build command, and Next's output directory. Configure these environment variables for the build:

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | https://pqwzqabkrwnkatqkgohl.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Your browser-safe publishable key from Supabase. |
| NEXT_PUBLIC_API_URL | The HTTPS URL of the deployed Render API, with no trailing slash. |

Rebuild after changing NEXT_PUBLIC variables: they are embedded into the frontend build. Never add the database password, service-role key, or receipt-signing key here.

In Supabase Auth, change Site URL to the Netlify URL and allow its `/merchant` redirect. Retain localhost redirects if you still develop locally. Confirm your own signup and image upload through the deployed UI.

## Before calling deployment complete

Verify API readiness, merchant login and email confirmation, ownership isolation, product/image persistence, a draft that stays private, publishing, a new-tab storefront, delivery and pickup quotes, successful/failed demo checkout, receipt reload, and merchant fulfillment. Confirm the GitHub checks passed. Cold starts on free services can make the first request slow; the app supplies loading/retry states.

There is no local Docker installation in this workspace. The Docker image build passed in GitHub Actions, alongside API and frontend checks. Live configuration still needs provider account access. Hosting accounts, provider limits, and auth redirect configuration cannot be inferred from source files.

References: [Render Blueprint configuration](https://render.com/docs/blueprint-spec), [Render free services](https://render.com/docs/free), and [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## Portfolio checkout and future OMS

Sunday Supply now offers checkout from its bag, with Singapore delivery or free pickup and successful/declined simulated payments. No provider keys are needed. Render requires Demo__Enabled=true, already set by the Blueprint.

POST /api/demo/checkout persists orders and transactional OrderEvents using the existing database schema. The dedicated unpublished portfolio demo store separates these from merchant records. API totals use bounded snapshots of the visitor-authored demo catalog and shipping settings. These are saved test orders; they do not charge money or consume merchant inventory. No migration is needed.

The browser retains its own order references and private receipt tokens, and displays them alongside seeded examples in Orders. A token is required to read a receipt or update demo fulfillment. Delivery follows Unfulfilled → Shipped → Delivered; pickup follows Unfulfilled → ReadyForPickup → Collected. Failed payments cannot be fulfilled. Identical checkout retries return the existing order. Clearing browser storage removes dashboard links, not database records. Use fictional guest details.

OMS events use the existing OrderPlaced/FulfillmentUpdated schema. Merchant sync routes remain authenticated and scoped to owned stores; anonymous portfolio records require a separately secured integration before an OMS can consume them. Never expose a global public order list. Plan retention for persisted demo records before sustained traffic; checkout rate limiting is active.

Deploy both the API and frontend update, then verify checkout, dashboard reload, and fulfillment. The provider is simulated, not Stripe.

The repository now supplies NEXT_PUBLIC_API_URL=https://storecraft-api.onrender.com in netlify.toml so portfolio checkout reaches the deployed API even when the dashboard value is empty. Update this public setting if the API hostname changes.
