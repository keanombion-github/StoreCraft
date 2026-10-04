namespace StoreCraft.Api.Features.Products;

public enum ProductStatus { Draft, Active, Archived }

public sealed class Product
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public required string Description { get; set; }
    public required string Sku { get; set; }
    public long PriceMinorUnits { get; set; }
    public int StockQuantity { get; set; }
    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
