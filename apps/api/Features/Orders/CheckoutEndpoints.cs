using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Storefront;

namespace StoreCraft.Api.Features.Orders;

public sealed record CartLine(Guid ProductId, int Quantity);
public sealed record CheckoutRequest(Guid IdempotencyKey, CartLine[] Items, string Name, string Email, string Street, string City, string PostalCode, string Country, string Outcome);
public sealed record FulfillRequest(string State, string TrackingNumber, string TrackingUrl);

public static class CheckoutEndpoints
{
    public static void MapCheckout(this WebApplication app, string confirmationSecret)
    {
        var key = Convert.FromBase64String(confirmationSecret);
        string AccessToken(Guid orderId) => Convert.ToHexString(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(orderId.ToString()))).ToLowerInvariant();

        // This simulator is deliberately restricted to local Development deployments.
        app.MapPost("/api/public/stores/{slug}/checkout", async (string slug, CheckoutRequest input, CommerceDbContext db) =>
        {
            if (!app.Environment.IsDevelopment()) return Results.NotFound();
            if (input.IdempotencyKey == Guid.Empty || input.Items is null || input.Items.Length is < 1 or > 20 || input.Items.Any(item => item is null || item.ProductId == Guid.Empty || item.Quantity is < 1 or > 99) || input.Items.Select(item => item.ProductId).Distinct().Count() != input.Items.Length) return Results.BadRequest(new { error = "Provide 1–20 distinct products with quantities from 1 to 99 and a checkout request ID." });
            if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 100 || !System.Net.Mail.MailAddress.TryCreate(input.Email, out _) || input.Email.Length > 254 || string.IsNullOrWhiteSpace(input.Street) || input.Street.Length > 300 || string.IsNullOrWhiteSpace(input.City) || input.City.Length > 100 || string.IsNullOrWhiteSpace(input.PostalCode) || input.PostalCode.Length > 20) return Results.BadRequest(new { error = "Enter valid guest and shipping details." });
            if (input.Country != "SG") return Results.BadRequest(new { error = "This store currently ships to Singapore only." });
            if (input.Outcome is not ("Paid" or "Failed")) return Results.BadRequest(new { error = "Choose a supported demo payment outcome." });
            var store = await db.Stores.SingleOrDefaultAsync(store => store.Slug == slug && store.PublishedVersionId != null);
            if (store is null) return Results.NotFound();
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(input, PageRules.Json))));
            await using var transaction = await db.Database.BeginTransactionAsync();
            // Serialize identical retries, including when two requests arrive simultaneously.
            var lockName = store.Id + ":" + input.IdempotencyKey;
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({lockName}, 0))");
            var existing = await db.Orders.SingleOrDefaultAsync(order => order.StoreId == store.Id && order.IdempotencyKey == input.IdempotencyKey);
            if (existing is not null)
            {
                if (existing.RequestHash != hash) return Results.Conflict(new { error = "That checkout request ID was already used for different details. Start a new checkout." });
                await transaction.CommitAsync();
                return Results.Ok(new { existing.Id, existing.Reference, existing.PaymentState, token = AccessToken(existing.Id), replayed = true });
            }
            var snapshots = new List<PurchasedItem>();
            long subtotal = 0;
            // A stable lock order prevents concurrent carts from locking products in opposite orders.
            foreach (var line in input.Items.OrderBy(item => item.ProductId))
            {
                var product = await db.Products.FromSqlInterpolated($"SELECT * FROM commerce.\"Products\" WHERE \"Id\" = {line.ProductId} AND \"StoreId\" = {store.Id} FOR UPDATE").SingleOrDefaultAsync();
                if (product is null || product.Status != ProductStatus.Active || product.StockQuantity < line.Quantity) return Results.Conflict(new { error = "A product is unavailable or its stock changed. Update your bag and try again." });
                snapshots.Add(new(product.Id, product.Title, product.Sku, line.Quantity, product.PriceMinorUnits));
                subtotal = checked(subtotal + product.PriceMinorUnits * line.Quantity);
                if (input.Outcome == "Paid") { product.StockQuantity -= line.Quantity; product.UpdatedAt = DateTimeOffset.UtcNow; }
            }
            var shipping = subtotal >= store.FreeShippingThreshold ? 0 : store.ShippingMinorUnits;
            var id = Guid.NewGuid();
            var order = new Order { Id = id, StoreId = store.Id, IdempotencyKey = input.IdempotencyKey, RequestHash = hash, Reference = "SC-" + id.ToString("N")[..10].ToUpperInvariant(), CustomerName = input.Name.Trim(), CustomerEmail = input.Email, Address = $"{input.Street}, {input.City}, {input.PostalCode}, Singapore", Subtotal = subtotal, Shipping = shipping, Total = checked(subtotal + shipping), Currency = store.Currency, PaymentState = input.Outcome, ItemsJson = JsonSerializer.Serialize(snapshots, PageRules.Json), CreatedAt = DateTimeOffset.UtcNow };
            db.Orders.Add(order); await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.Ok(new { order.Id, order.Reference, order.PaymentState, token = AccessToken(order.Id), replayed = false });
        });
        app.MapGet("/api/public/orders/{id:guid}", async (Guid id, string token, CommerceDbContext db) =>
        {
            var expected = AccessToken(id);
            if (token is null || token.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(token), Encoding.UTF8.GetBytes(expected))) return Results.NotFound();
            var order = await db.Orders.AsNoTracking().SingleOrDefaultAsync(order => order.Id == id);
            return order is null ? Results.NotFound() : Results.Ok(new { order.Reference, order.PaymentState, order.FulfillmentState, order.Currency, order.Subtotal, order.Shipping, order.Total, items = JsonSerializer.Deserialize<PurchasedItem[]>(order.ItemsJson, PageRules.Json), order.CreatedAt });
        });
        var merchant = app.MapGroup("/api/merchant/orders").RequireAuthorization("Merchant");
        merchant.MapGet("/", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await StorefrontEndpoints.OwnedStore(db, user); if (store is null) return Results.NotFound();
            return Results.Ok(await db.Orders.AsNoTracking().Where(order => order.StoreId == store.Id).OrderByDescending(order => order.CreatedAt).Select(order => new { order.Id, order.Reference, order.CustomerName, order.CustomerEmail, order.Address, order.ItemsJson, order.PaymentState, order.FulfillmentState, order.TrackingNumber, order.TrackingUrl, order.Total, order.Subtotal, order.Shipping, order.CreatedAt }).ToListAsync());
        });
        merchant.MapPut("/{id:guid}/fulfillment", async (Guid id, FulfillRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await StorefrontEndpoints.OwnedStore(db, user); if (store is null) return Results.NotFound();
            var order = await db.Orders.SingleOrDefaultAsync(order => order.Id == id && order.StoreId == store.Id); if (order is null) return Results.NotFound();
            if (order.PaymentState != "Paid" || !((order.FulfillmentState == "Unfulfilled" && input.State == "Shipped") || (order.FulfillmentState == "Shipped" && input.State == "Delivered"))) return Results.BadRequest(new { error = "Only paid orders can progress from unfulfilled to shipped, then delivered." });
            if (string.IsNullOrWhiteSpace(input.TrackingNumber) || input.TrackingNumber.Length > 100 || input.TrackingUrl is null || input.TrackingUrl.Length > 1000 || (input.TrackingUrl.Length > 0 && (!Uri.TryCreate(input.TrackingUrl, UriKind.Absolute, out var url) || url.Scheme != "https"))) return Results.BadRequest(new { error = "Enter a tracking number and an optional HTTPS tracking URL." });
            order.FulfillmentState = input.State; order.TrackingNumber = input.TrackingNumber; order.TrackingUrl = input.TrackingUrl;
            await db.SaveChangesAsync(); return Results.Ok(new { order.FulfillmentState });
        });
    }
}
