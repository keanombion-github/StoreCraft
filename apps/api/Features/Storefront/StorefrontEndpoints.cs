using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Stores;

namespace StoreCraft.Api.Features.Storefront;

public sealed record StoreSettingsRequest(string Name, string ContactEmail, long ShippingMinorUnits, long FreeShippingThreshold);

public static class StorefrontEndpoints
{
    public static void MapStorefront(this WebApplication app)
    {
        var merchant = app.MapGroup("/api/merchant").RequireAuthorization("Merchant");
        merchant.MapPut("/store", async (StoreSettingsRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 80 || !System.Net.Mail.MailAddress.TryCreate(input.ContactEmail, out _) || input.ContactEmail.Length > 254 || input.ShippingMinorUnits is < 0 or > 1_000_000 || input.FreeShippingThreshold is < 1 or > 100_000_000) return Results.BadRequest(new { error = "Check store name, email, and non-negative shipping/positive threshold." });
            var store = await OwnedStore(db, user);
            if (store is null) return Results.NotFound();
            store.Name = input.Name.Trim(); store.ContactEmail = input.ContactEmail; store.ShippingMinorUnits = input.ShippingMinorUnits; store.FreeShippingThreshold = input.FreeShippingThreshold;
            await db.SaveChangesAsync(); return Results.Ok(store);
        });
        merchant.MapGet("/page", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await OwnedStore(db, user);
            return store is null ? Results.NotFound() : Results.Ok(new { document = store.DraftDocument is null ? PageRules.Default : JsonSerializer.Deserialize<PageDocument>(store.DraftDocument, PageRules.Json), published = store.PublishedVersionId.HasValue });
        });
        merchant.MapPut("/page", async (PageDocument document, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (PageRules.Validate(document) is { } error) return Results.BadRequest(new { error });
            var store = await OwnedStore(db, user); if (store is null) return Results.NotFound();
            store.DraftDocument = JsonSerializer.Serialize(document, PageRules.Json);
            await db.SaveChangesAsync(); return Results.Ok(new { saved = true });
        });
        merchant.MapPost("/page/publish", async (PageDocument document, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (PageRules.Validate(document) is { } error) return Results.BadRequest(new { error });
            var store = await OwnedStore(db, user); if (store is null) return Results.NotFound();
            var json = JsonSerializer.Serialize(document, PageRules.Json);
            var page = new PublishedPage { Id = Guid.NewGuid(), StoreId = store.Id, Document = json, PublishedAt = DateTimeOffset.UtcNow };
            db.PublishedPages.Add(page); store.DraftDocument = json; store.PublishedVersionId = page.Id;
            await db.SaveChangesAsync(); return Results.Ok(new { publishedAt = page.PublishedAt });
        });
        app.MapGet("/api/public/stores/{slug}", async (string slug, CommerceDbContext db) =>
        {
            var store = await db.Stores.AsNoTracking().SingleOrDefaultAsync(store => store.Slug == slug && store.PublishedVersionId != null);
            if (store is null) return Results.NotFound(new { error = "This store is not published." });
            var page = await db.PublishedPages.AsNoTracking().SingleAsync(page => page.Id == store.PublishedVersionId && page.StoreId == store.Id);
            var products = await db.Products.AsNoTracking().Where(product => product.StoreId == store.Id && product.Status == ProductStatus.Active).OrderBy(product => product.CreatedAt).Select(product => new { product.Id, product.Title, product.Slug, product.Description, product.PriceMinorUnits, product.StockQuantity }).ToListAsync();
            return Results.Ok(new { store = new { store.Name, store.Slug, store.ContactEmail, store.Currency, store.ShippingMinorUnits, store.FreeShippingThreshold }, document = JsonSerializer.Deserialize<PageDocument>(page.Document, PageRules.Json), products });
        });
    }
    public static Task<Store?> OwnedStore(CommerceDbContext db, ClaimsPrincipal user) => db.Stores.SingleOrDefaultAsync(store => store.OwnerUserId == StoreEndpoints.Owner(user));
}
