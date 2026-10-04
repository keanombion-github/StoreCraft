using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Stores;

namespace StoreCraft.Api.Data;

public sealed class CommerceDbContext(DbContextOptions<CommerceDbContext> options) : DbContext(options)
{
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<Product> Products => Set<Product>();

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
        products.Property(product => product.Status).HasConversion<string>().HasMaxLength(16);
    }
}
