namespace StoreCraft.Api.Features.Orders;

public sealed class Order
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public Guid IdempotencyKey { get; set; }
    public required string RequestHash { get; set; }
    public required string Reference { get; set; }
    public required string CustomerName { get; set; }
    public required string CustomerEmail { get; set; }
    public required string Address { get; set; }
    public string Currency { get; set; } = "SGD";
    public long Subtotal { get; set; }
    public long Shipping { get; set; }
    public long Total { get; set; }
    public required string ItemsJson { get; set; }
    public string PaymentState { get; set; } = "Pending";
    public string FulfillmentState { get; set; } = "Unfulfilled";
    public string TrackingNumber { get; set; } = "";
    public string TrackingUrl { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}
public sealed record PurchasedItem(Guid ProductId, string Title, string Sku, int Quantity, long UnitPrice);
