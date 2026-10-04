using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Stores;

namespace StoreCraft.Api.Features.Storefront;

public sealed record StoreSettingsRequest(string Name, string ContactEmail, long ShippingMinorUnits, long FreeShippingThreshold, bool PickupEnabled = false, string PickupAddress = "");

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
            if (input.PickupAddress is null || input.PickupAddress.Length > 300 || (input.PickupEnabled && string.IsNullOrWhiteSpace(input.PickupAddress))) return Results.BadRequest(new { error = "Enter a pickup address of up to 300 characters." });
            store.Name = input.Name.Trim(); store.ContactEmail = input.ContactEmail; store.ShippingMinorUnits = input.ShippingMinorUnits; store.FreeShippingThreshold = input.FreeShippingThreshold;
            store.PickupEnabled = input.PickupEnabled; store.PickupAddress = input.PickupAddress.Trim();
            await db.SaveChangesAsync(); return Results.Ok(store);
        });
        merchant.MapGet("/page", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await OwnedStore(db, user);
            return store is null ? Results.NotFound() : Results.Ok(new { document = store.DraftDocument is null ? PageRules.Default : PageRules.Normalize(JsonSerializer.Deserialize<PageDocument>(store.DraftDocument, PageRules.Json)!), published = store.PublishedVersionId.HasValue });
        });
        merchant.MapPut("/page", async (PageDocument document, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (PageRules.Validate(document) is { } error) return Results.BadRequest(new { error });
            document = PageRules.Normalize(document);
            var store = await OwnedStore(db, user); if (store is null) return Results.NotFound();
            if (!await ValidProductReferences(document, store.Id, db)) return Results.BadRequest(new { error = "Featured products must be active products in your store." });
            store.DraftDocument = JsonSerializer.Serialize(document, PageRules.Json);
            await db.SaveChangesAsync(); return Results.Ok(new { saved = true });
        });
        merchant.MapPost("/page/publish", async (PageDocument document, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (PageRules.Validate(document) is { } error) return Results.BadRequest(new { error });
            var store = await OwnedStore(db, user); if (store is null) return Results.NotFound();
            if (!await ValidProductReferences(document, store.Id, db)) return Results.BadRequest(new { error = "Featured products must be active products in your store." });
            var json = JsonSerializer.Serialize(document, PageRules.Json);
            document = PageRules.Normalize(document);
            json = JsonSerializer.Serialize(document, PageRules.Json);
            var page = new PublishedPage { Id = Guid.NewGuid(), StoreId = store.Id, Document = json, PublishedAt = DateTimeOffset.UtcNow };
            db.PublishedPages.Add(page); store.DraftDocument = json; store.PublishedVersionId = page.Id;
            await db.SaveChangesAsync(); return Results.Ok(new { publishedAt = page.PublishedAt });
        });
        app.MapGet("/api/public/stores/{slug}", async (string slug, CommerceDbContext db) =>
        {
            var store = await db.Stores.AsNoTracking().SingleOrDefaultAsync(store => store.Slug == slug && store.PublishedVersionId != null);
            if (store is null) return Results.NotFound(new { error = "This store is not published." });
            var page = await db.PublishedPages.AsNoTracking().SingleAsync(page => page.Id == store.PublishedVersionId && page.StoreId == store.Id);
            var products = await db.Products.AsNoTracking().Where(product => product.StoreId == store.Id && product.Status == ProductStatus.Active).OrderBy(product => product.CreatedAt).Select(product => new { product.Id, product.Title, product.Slug, product.Description, product.PriceMinorUnits, product.StockQuantity, product.ImagePath, product.ImageAlt }).ToListAsync();
            return Results.Ok(new { store = new { store.Name, store.Slug, store.ContactEmail, store.Currency, store.ShippingMinorUnits, store.FreeShippingThreshold, store.PickupEnabled, PickupAddress = store.PickupEnabled ? store.PickupAddress : "" }, document = PageRules.Normalize(JsonSerializer.Deserialize<PageDocument>(page.Document, PageRules.Json)!), products, demoCheckoutEnabled = app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Demo:Enabled") });
        });
    }
    public static Task<Store?> OwnedStore(CommerceDbContext db, ClaimsPrincipal user) => db.Stores.SingleOrDefaultAsync(store => store.OwnerUserId == StoreEndpoints.Owner(user));
    private static async Task<bool> ValidProductReferences(PageDocument document, Guid storeId, CommerceDbContext db)
    {
        var ids = document.Sections.SelectMany(s => s.ProductIds ?? []).Distinct().ToArray();
        return ids.Length == 0 || await db.Products.CountAsync(p => p.StoreId == storeId && p.Status == ProductStatus.Active && ids.Contains(p.Id)) == ids.Length;
    }
}
