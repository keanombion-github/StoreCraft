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
public sealed record CheckoutRequest(Guid IdempotencyKey, CartLine[] Items, string Name, string Email, string Street, string City, string PostalCode, string Country, string Outcome, string FulfillmentMethod = "Delivery");
public sealed record FulfillRequest(string State, string TrackingNumber, string TrackingUrl);
public sealed record QuoteRequest(CartLine[] Items, string Country, string FulfillmentMethod = "Delivery");

public static class CheckoutEndpoints
{
    public static void MapCheckout(this WebApplication app, string confirmationSecret)
    {
        var key = Convert.FromBase64String(confirmationSecret);
        string AccessToken(Guid orderId) => Convert.ToHexString(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(orderId.ToString()))).ToLowerInvariant();

        app.MapPost("/api/public/stores/{slug}/quote", async (string slug, QuoteRequest input, CommerceDbContext db) =>
        {
            if (input.Items is null || input.Items.Length is < 1 or > 20 || input.Items.Any(item => item is null || item.ProductId == Guid.Empty || item.Quantity is < 1 or > 99) || input.Items.Select(item => item.ProductId).Distinct().Count() != input.Items.Length || input.Country != "SG") return Results.BadRequest(new { error = "Choose valid quantities and a supported destination." });
            var store = await db.Stores.AsNoTracking().SingleOrDefaultAsync(s => s.Slug == slug && s.PublishedVersionId != null);
            if (store is null) return Results.NotFound();
            if (input.FulfillmentMethod is not ("Delivery" or "Pickup") || (input.FulfillmentMethod == "Pickup" && !store.PickupEnabled)) return Results.BadRequest(new { error = "That fulfillment option is unavailable." });
            var ids = input.Items.Select(i => i.ProductId).ToArray();
            var products = await db.Products.AsNoTracking().Where(p => p.StoreId == store.Id && p.Status == ProductStatus.Active && ids.Contains(p.Id)).ToListAsync();
            long subtotal = 0;
            foreach (var item in input.Items)
            {
                var product = products.SingleOrDefault(p => p.Id == item.ProductId);
                if (product is null || product.StockQuantity < item.Quantity) return Results.Conflict(new { error = "A product is unavailable or its stock changed. Update your bag." });
                subtotal = checked(subtotal + product.PriceMinorUnits * item.Quantity);
            }
            var shipping = input.FulfillmentMethod == "Pickup" || subtotal >= store.FreeShippingThreshold ? 0 : store.ShippingMinorUnits;
            return Results.Ok(new { subtotal, shipping, total = subtotal + shipping, store.Currency });
        }).RequireRateLimiting("checkout");

        // Explicit demo mode enables the simulator on portfolio deployments without enabling real charges.
        app.MapPost("/api/public/stores/{slug}/checkout", async (string slug, CheckoutRequest input, CommerceDbContext db, IDemoPayment payment) =>
        {
            if (!app.Environment.IsDevelopment() && !app.Configuration.GetValue<bool>("Demo:Enabled")) return Results.NotFound();
            if (input.IdempotencyKey == Guid.Empty || input.Items is null || input.Items.Length is < 1 or > 20 || input.Items.Any(item => item is null || item.ProductId == Guid.Empty || item.Quantity is < 1 or > 99) || input.Items.Select(item => item.ProductId).Distinct().Count() != input.Items.Length) return Results.BadRequest(new { error = "Provide 1–20 distinct products with quantities from 1 to 99 and a checkout request ID." });
            if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 100 || !System.Net.Mail.MailAddress.TryCreate(input.Email, out _) || input.Email.Length > 254 || string.IsNullOrWhiteSpace(input.Street) || input.Street.Length > 300 || string.IsNullOrWhiteSpace(input.City) || input.City.Length > 100 || string.IsNullOrWhiteSpace(input.PostalCode) || input.PostalCode.Length > 20) return Results.BadRequest(new { error = "Enter valid guest and shipping details." });
            if (input.Country != "SG") return Results.BadRequest(new { error = "This store currently ships to Singapore only." });
            if (input.Outcome is not ("Paid" or "Failed")) return Results.BadRequest(new { error = "Choose a supported demo payment outcome." });
            var store = await db.Stores.SingleOrDefaultAsync(store => store.Slug == slug && store.PublishedVersionId != null);
            if (store is null) return Results.NotFound();
            if (input.FulfillmentMethod is not ("Delivery" or "Pickup") || (input.FulfillmentMethod == "Pickup" && !store.PickupEnabled)) return Results.BadRequest(new { error = "That fulfillment option is unavailable." });
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
            var shipping = input.FulfillmentMethod == "Pickup" || subtotal >= store.FreeShippingThreshold ? 0 : store.ShippingMinorUnits;
            var id = Guid.NewGuid();
            var order = new Order { Id = id, StoreId = store.Id, IdempotencyKey = input.IdempotencyKey, RequestHash = hash, Reference = "SC-" + id.ToString("N")[..10].ToUpperInvariant(), CustomerName = input.Name.Trim(), CustomerEmail = input.Email, Address = input.FulfillmentMethod == "Pickup" ? "Pickup at " + store.PickupAddress : $"{input.Street}, {input.City}, {input.PostalCode}, Singapore", FulfillmentMethod = input.FulfillmentMethod, Subtotal = subtotal, Shipping = shipping, Total = checked(subtotal + shipping), Currency = store.Currency, PaymentState = payment.Settle(input.Outcome), ItemsJson = JsonSerializer.Serialize(snapshots, PageRules.Json), CreatedAt = DateTimeOffset.UtcNow };
            db.Orders.Add(order); db.OrderEvents.Add(OrderSync.Event(order, "OrderPlaced")); await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.Ok(new { order.Id, order.Reference, order.PaymentState, token = AccessToken(order.Id), replayed = false });
        }).RequireRateLimiting("checkout");
        app.MapGet("/api/public/orders/{id:guid}", async (Guid id, string token, CommerceDbContext db) =>
        {
            var expected = AccessToken(id);
            if (token is null || token.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(token), Encoding.UTF8.GetBytes(expected))) return Results.NotFound();
            var order = await db.Orders.AsNoTracking().SingleOrDefaultAsync(order => order.Id == id);
            return order is null ? Results.NotFound() : Results.Ok(new { order.Reference, order.PaymentState, order.FulfillmentState, order.FulfillmentMethod, order.Currency, order.Subtotal, order.Shipping, order.Total, items = JsonSerializer.Deserialize<PurchasedItem[]>(order.ItemsJson, PageRules.Json), order.CreatedAt });
        });
        var merchant = app.MapGroup("/api/merchant/orders").RequireAuthorization("Merchant");
        merchant.MapGet("/", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await StorefrontEndpoints.OwnedStore(db, user); if (store is null) return Results.NotFound();
            return Results.Ok(await db.Orders.AsNoTracking().Where(order => order.StoreId == store.Id).OrderByDescending(order => order.CreatedAt).Select(order => new { order.Id, order.Reference, order.CustomerName, order.CustomerEmail, order.Address, order.ItemsJson, order.PaymentState, order.FulfillmentState, order.FulfillmentMethod, order.TrackingNumber, order.TrackingUrl, order.Total, order.Subtotal, order.Shipping, order.CreatedAt }).ToListAsync());
        });
        merchant.MapPut("/{id:guid}/fulfillment", async (Guid id, FulfillRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await StorefrontEndpoints.OwnedStore(db, user); if (store is null) return Results.NotFound();
            await using var transaction = await db.Database.BeginTransactionAsync();
            var order = await db.Orders.FromSqlInterpolated($"SELECT * FROM commerce.\"Orders\" WHERE \"Id\" = {id} AND \"StoreId\" = {store.Id} FOR UPDATE").SingleOrDefaultAsync();
            if (order is null) return Results.NotFound();
            var allowed = order.FulfillmentMethod == "Pickup"
                ? (order.FulfillmentState == "Unfulfilled" && input.State == "ReadyForPickup") || (order.FulfillmentState == "ReadyForPickup" && input.State == "Collected")
                : (order.FulfillmentState == "Unfulfilled" && input.State == "Shipped") || (order.FulfillmentState == "Shipped" && input.State == "Delivered");
            if (order.PaymentState != "Paid" || !allowed) return Results.BadRequest(new { error = "Choose the next fulfillment step for this paid order." });
            if (order.FulfillmentMethod == "Delivery" && (string.IsNullOrWhiteSpace(input.TrackingNumber) || input.TrackingNumber.Length > 100 || input.TrackingUrl is null || input.TrackingUrl.Length > 1000 || (input.TrackingUrl.Length > 0 && (!Uri.TryCreate(input.TrackingUrl, UriKind.Absolute, out var url) || url.Scheme != "https")))) return Results.BadRequest(new { error = "Enter a tracking number and an optional HTTPS tracking URL." });
            order.FulfillmentState = input.State;
            if (order.FulfillmentMethod == "Delivery") { order.TrackingNumber = input.TrackingNumber; order.TrackingUrl = input.TrackingUrl; }
            db.OrderEvents.Add(OrderSync.Event(order, "FulfillmentUpdated"));
            await db.SaveChangesAsync(); await transaction.CommitAsync(); return Results.Ok(new { order.FulfillmentState });
        });
    }
}
