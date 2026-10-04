using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Storefront;

namespace StoreCraft.Api.Features.Orders;

// Transactional outbox: a future OMS polls and acknowledges only its owner's events.
public sealed class OrderEvent
{
    public long Id { get; set; }
    public Guid StoreId { get; set; }
    public Guid OrderId { get; set; }
    public required string Type { get; set; }
    public required string Payload { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? AcknowledgedAt { get; set; }
}
public sealed record AcknowledgeEvents(long[] Ids);
public static class OrderSync
{
    public static OrderEvent Event(Order order, string type) => new() { StoreId = order.StoreId, OrderId = order.Id, Type = type, Payload = System.Text.Json.JsonSerializer.Serialize(new { schemaVersion = 1, order.Id, order.Reference, order.PaymentState, order.FulfillmentState, order.FulfillmentMethod, order.Currency, order.Total, order.Shipping, order.CustomerName, order.CustomerEmail, order.Address, order.TrackingNumber, order.TrackingUrl, items = System.Text.Json.JsonSerializer.Deserialize<PurchasedItem[]>(order.ItemsJson, PageRules.Json) }, PageRules.Json) };
    public static void MapOrderSync(this WebApplication app)
    {
        var routes = app.MapGroup("/api/merchant/sync").RequireAuthorization("Merchant");
        routes.MapGet("/events", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await StorefrontEndpoints.OwnedStore(db, user);
            if (store is null) return Results.NotFound();
            return Results.Ok(await db.OrderEvents.AsNoTracking().Where(e => e.StoreId == store.Id && e.AcknowledgedAt == null).OrderBy(e => e.Id).Take(100).ToListAsync());
        });
        routes.MapPost("/acknowledge", async (AcknowledgeEvents input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (input.Ids is null || input.Ids.Length is < 1 or > 100 || input.Ids.Any(id => id <= 0) || input.Ids.Distinct().Count() != input.Ids.Length) return Results.BadRequest();
            var store = await StorefrontEndpoints.OwnedStore(db, user);
            if (store is null) return Results.NotFound();
            var events = await db.OrderEvents.Where(e => e.StoreId == store.Id && input.Ids.Contains(e.Id)).ToListAsync();
            if (events.Count != input.Ids.Length) return Results.NotFound();
            foreach (var entry in events) entry.AcknowledgedAt ??= DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(); return Results.Ok(new { acknowledged = events.Count });
        });
    }
}
