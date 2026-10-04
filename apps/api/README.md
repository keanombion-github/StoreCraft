# StoreCraft API foundation

This is a .NET 10 API foundation, not an authenticated commerce API yet. Only health endpoints are exposed. No merchant read/write endpoint is available before token validation and store ownership checks are implemented.

## Run without cloud credentials

```powershell
dotnet run --project apps/api --no-launch-profile -- --environment Development --urls http://localhost:5050
```

`GET /health` checks that the process is running. It does not claim the database is ready. `GET /health/ready` returns 503 until a configured PostgreSQL connection works.

## Configure later

Use .NET user secrets from `apps/api` for local database configuration. Do not paste passwords into chat or commit them:

```powershell
dotnet user-secrets set "ConnectionStrings:Commerce" "YOUR_POSTGRES_CONNECTION_STRING"
```

The connection string should come from your dedicated StoreCraft Supabase project's Connect panel. Choose its connection type according to your machine/network and the current Supabase connection guidance. Environment variable `ConnectionStrings__Commerce` is the deployment equivalent.

## Migration commands (repository root)

```powershell
dotnet tool restore
dotnet ef migrations script --project apps/api --output docs/database-initial.sql
```

The generated SQL can be reviewed without a database. Migrations are not applied automatically at startup. Applying a migration requires a real connection and a deliberate database setup step; this scaffold has not modified Supabase.

## Files to understand

- `Program.cs`: registers the database and health checks.
- `Features/Stores/Store.cs`: store identity, owner, currency, and contact details.
- `Features/Products/Product.cs`: store-owned catalog record, integer price, and stock.
- `Data/CommerceDbContext.cs`: table relationships, indexes, and database constraints.
- `Migrations/`: database changes generated from that model.

One owner has one store. Store slugs are globally unique, while product slugs are unique inside a store. Database constraints reject negative stock and non-positive prices. These rules complement later API validation; they do not implement merchant authorization.

