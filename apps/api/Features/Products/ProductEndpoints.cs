using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Stores;

namespace StoreCraft.Api.Features.Products;

public sealed record ProductRequest(string Title, string Slug, string Description, string Sku, long PriceMinorUnits, int StockQuantity, string Status, string ImagePath = "", string ImageAlt = "");

public static partial class ProductEndpoints
{
    public static void MapProducts(this WebApplication app)
    {
        var routes = app.MapGroup("/api/merchant/products").RequireAuthorization("Merchant");
        routes.MapGet("/", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var owner = StoreEndpoints.Owner(user);
            var storeId = await db.Stores.Where(store => store.OwnerUserId == owner).Select(store => (Guid?)store.Id).SingleOrDefaultAsync();
            return storeId is null ? Results.NotFound() : Results.Ok(await db.Products.AsNoTracking().Where(product => product.StoreId == storeId && product.Status != ProductStatus.Archived).OrderBy(product => product.CreatedAt).ToListAsync());
        });
        routes.MapPost("/", async (ProductRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (Validate(input) is { } error) return Results.BadRequest(new { error });
            var owner = StoreEndpoints.Owner(user);
            var storeId = await db.Stores.Where(store => store.OwnerUserId == owner).Select(store => (Guid?)store.Id).SingleOrDefaultAsync();
            if (storeId is null) return Results.NotFound();
            if (!ValidImage(input, owner)) return Results.BadRequest(new { error = "Select an image uploaded by your account and provide alternative text." });
            var product = new Product { Id = Guid.NewGuid(), StoreId = storeId.Value, Title = input.Title.Trim(), Slug = input.Slug, Description = input.Description.Trim(), Sku = input.Sku.Trim(), PriceMinorUnits = input.PriceMinorUnits, StockQuantity = input.StockQuantity, Status = Enum.Parse<ProductStatus>(input.Status), CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
            db.Products.Add(product);
            product.ImagePath = input.ImagePath; product.ImageAlt = input.ImageAlt;
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { return Results.Conflict(new { error = "A product with that slug already exists in your store." }); }
            return Results.Created($"/api/merchant/products/{product.Id}", product);
        });
        routes.MapPut("/{id:guid}", async (Guid id, ProductRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (Validate(input) is { } error) return Results.BadRequest(new { error });
            var owner = StoreEndpoints.Owner(user);
            // Join ownership into the resource query; never authorize an ID supplied by the browser alone.
            if (!ValidImage(input, owner)) return Results.BadRequest(new { error = "Select an image uploaded by your account and provide alternative text." });
            var product = await db.Products.SingleOrDefaultAsync(product => product.Id == id && db.Stores.Any(store => store.Id == product.StoreId && store.OwnerUserId == owner));
            if (product is null) return Results.NotFound();
            product.Title = input.Title.Trim(); product.Slug = input.Slug; product.Description = input.Description.Trim(); product.Sku = input.Sku.Trim();
            product.PriceMinorUnits = input.PriceMinorUnits; product.StockQuantity = input.StockQuantity; product.Status = Enum.Parse<ProductStatus>(input.Status); product.UpdatedAt = DateTimeOffset.UtcNow;
            product.ImagePath = input.ImagePath; product.ImageAlt = input.ImageAlt;
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: "23505" }) { return Results.Conflict(new { error = "A product with that slug already exists in your store." }); }
            return Results.Ok(product);
        });
    }

    public static string? Validate(ProductRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Length > 100 || string.IsNullOrWhiteSpace(input.Description) || input.Description.Length > 4000 || input.Sku is null || input.Sku.Length > 80) return "Enter a title, description, and SKU within their length limits.";
        if (!SlugPattern().IsMatch(input.Slug ?? "")) return "Use a lowercase product slug with letters, numbers, and hyphens (3–120 characters).";
        if (input.PriceMinorUnits is < 1 or > 100_000_000 || input.StockQuantity is < 0 or > 1_000_000) return "Price must be positive and stock must be a non-negative whole number within the supported limits.";
        if (input.Status is not ("Draft" or "Active" or "Archived")) return "Choose Draft, Active, or Archived.";
        return null;
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$")]
    private static partial Regex SlugPattern();
    public static bool ValidImage(ProductRequest input, Guid owner) => input.ImagePath is not null && input.ImageAlt is not null && input.ImageAlt.Length <= 150 && (input.ImagePath.Length == 0 || (!string.IsNullOrWhiteSpace(input.ImageAlt) && Regex.IsMatch(input.ImagePath, "^" + owner.ToString() + @"/[a-f0-9-]{36}\.(jpg|png|webp)$")));
}
