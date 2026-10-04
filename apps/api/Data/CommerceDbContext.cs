using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Stores;
using StoreCraft.Api.Features.Storefront;
using StoreCraft.Api.Features.Orders;

namespace StoreCraft.Api.Data;

public sealed class CommerceDbContext(DbContextOptions<CommerceDbContext> options) : DbContext(options)
{
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<PublishedPage> PublishedPages => Set<PublishedPage>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderEvent> OrderEvents => Set<OrderEvent>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        // Keep this application's tables separate from Supabase's auth/storage schemas.
        model.HasDefaultSchema("commerce");
        var stores = model.Entity<Store>();
        stores.ToTable("Stores", table => table.HasCheckConstraint("CK_Stores_Currency", "\"Currency\" IN ('SGD', 'USD', 'PHP')"));
        stores.HasKey(store => store.Id);
        stores.HasIndex(store => store.OwnerUserId).IsUnique();
        stores.HasIndex(store => store.Slug).IsUnique();
        stores.Property(store => store.Name).HasMaxLength(80);
        stores.Property(store => store.Slug).HasMaxLength(100);
        stores.Property(store => store.ContactEmail).HasMaxLength(254);
        stores.Property(store => store.Currency).HasMaxLength(3);
        stores.Property(store => store.DraftDocument).HasColumnType("jsonb");
        stores.Property(store => store.PickupAddress).HasMaxLength(300);
        stores.ToTable("Stores", table => { table.HasCheckConstraint("CK_Stores_Shipping", "\"ShippingMinorUnits\" >= 0"); table.HasCheckConstraint("CK_Stores_Threshold", "\"FreeShippingThreshold\" > 0"); });

        var pages = model.Entity<PublishedPage>();
        pages.HasKey(page => page.Id);
        pages.Property(page => page.Document).HasColumnType("jsonb");
        pages.HasOne<Store>().WithMany().HasForeignKey(page => page.StoreId).OnDelete(DeleteBehavior.Restrict);

        var orders = model.Entity<Order>();
        var events = model.Entity<OrderEvent>();
        events.HasKey(e => e.Id);
        events.HasIndex(e => new { e.StoreId, e.AcknowledgedAt, e.Id });
        events.Property(e => e.Payload).HasColumnType("jsonb");
        events.Property(e => e.Type).HasMaxLength(50);
        events.HasOne<Store>().WithMany().HasForeignKey(e => e.StoreId).OnDelete(DeleteBehavior.Restrict);
        events.HasOne<Order>().WithMany().HasForeignKey(e => e.OrderId).OnDelete(DeleteBehavior.Restrict);
        orders.HasKey(order => order.Id);
        orders.HasIndex(order => new { order.StoreId, order.IdempotencyKey }).IsUnique();
        orders.HasOne<Store>().WithMany().HasForeignKey(order => order.StoreId).OnDelete(DeleteBehavior.Restrict);
        orders.Property(order => order.ItemsJson).HasColumnType("jsonb");
        orders.Property(order => order.CustomerName).HasMaxLength(100);
        orders.Property(order => order.CustomerEmail).HasMaxLength(254);
        orders.Property(order => order.Address).HasMaxLength(1000);
        orders.Property(order => order.FulfillmentMethod).HasMaxLength(16);
        orders.ToTable("Orders", table => { table.HasCheckConstraint("CK_Orders_Method", "\"FulfillmentMethod\" IN ('Delivery', 'Pickup')"); table.HasCheckConstraint("CK_Orders_Total", "\"Subtotal\" >= 0 AND \"Shipping\" >= 0 AND \"Total\" = \"Subtotal\" + \"Shipping\""); table.HasCheckConstraint("CK_Orders_Payment", "\"PaymentState\" IN ('Paid', 'Failed')"); table.HasCheckConstraint("CK_Orders_Fulfillment", "\"FulfillmentState\" IN ('Unfulfilled', 'Shipped', 'Delivered', 'ReadyForPickup', 'Collected')"); });

        var products = model.Entity<Product>();
        products.ToTable("Products", table =>
        {
            table.HasCheckConstraint("CK_Products_Price", "\"PriceMinorUnits\" > 0");
            table.HasCheckConstraint("CK_Products_Stock", "\"StockQuantity\" >= 0");
            table.HasCheckConstraint("CK_Products_Status", "\"Status\" IN ('Draft', 'Active', 'Archived')");
        });
        products.HasKey(product => product.Id);
        products.HasIndex(product => new { product.StoreId, product.Slug }).IsUnique();
        products.HasIndex(product => new { product.StoreId, product.Status });
        products.HasOne<Store>().WithMany().HasForeignKey(product => product.StoreId).OnDelete(DeleteBehavior.Restrict);
        products.Property(product => product.Title).HasMaxLength(100);
        products.Property(product => product.Slug).HasMaxLength(120);
        products.Property(product => product.Description).HasMaxLength(4000);
        products.Property(product => product.Sku).HasMaxLength(80);
        products.Property(product => product.ImagePath).HasMaxLength(200);
        products.Property(product => product.ImageAlt).HasMaxLength(150);
        products.Property(product => product.Status).HasConversion<string>().HasMaxLength(16);
    }
}
