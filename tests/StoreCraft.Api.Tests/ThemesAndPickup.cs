using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Storefront;

public class ThemesAndPickup
{
    [Fact]
    public void LegacyPagesKeepContentAndRegionRulesRejectInvalidLayouts()
    {
        var legacy = new PageDocument(1, "#956ec6", "Georgia", [new("hero", "Hero", "My existing store", "Keep this", "", "Shop"), new("footer", "Footer", "My footer", "", "", "")]);
        var upgraded = PageRules.Normalize(legacy);
        Assert.Equal("My existing store", upgraded.Sections.Single(s => s.Id == "hero").Title);
        Assert.Equal("Georgia", upgraded.Font);
        Assert.Null(PageRules.Validate(upgraded));
        Assert.NotNull(PageRules.Validate(upgraded with { Sections = upgraded.Sections.Select(s => s.Id == "hero" ? s with { Region = "Header" } : s).ToArray() }));
        Assert.NotNull(PageRules.Validate(upgraded with { ThemeId = "unknown" }));
        Assert.NotNull(PageRules.Validate(upgraded with { Logo = "https://example.com/logo.png", LogoAlt = "" }));
        Assert.NotNull(PageRules.Validate(upgraded with { Sections = upgraded.Sections.Where(s => s.Region != "Main").ToArray() }));
        var owner = Guid.NewGuid();
        var input = new ProductRequest("Mug", "mug", "Description", "SKU", 2400, 2, "Active", owner + "/" + Guid.NewGuid() + ".png", "Stoneware mug");
        Assert.True(ProductEndpoints.ValidImage(input, owner));
        Assert.False(ProductEndpoints.ValidImage(input, Guid.NewGuid()));
        Assert.False(ProductEndpoints.ValidImage(input with { ImagePath = owner + "/../other.png" }, owner));
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PickupQuotesFulfillmentAndSyncStayOwnedAndTransactional()
    {
        using var factory = new TestApplication(); using var client = factory.CreateClient();
        var owner = Guid.NewGuid(); var stranger = Guid.NewGuid(); var slug = "pickup-test-" + Guid.NewGuid().ToString("N");
        client.DefaultRequestHeaders.Authorization = new("Bearer", factory.Token(owner));
        try
        {
            Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/merchant/store", new { name="Pickup test", slug, contactEmail="test@example.com" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/merchant/store",new { name="Pickup test",contactEmail="test@example.com",shippingMinorUnits=500,freeShippingThreshold=10000,pickupEnabled=true,pickupAddress="Test collection point" })).StatusCode);
            var productResponse = await client.PostAsJsonAsync("/api/merchant/products/", new { title="Fixture",slug="fixture",description="Test item",sku="TEST",priceMinorUnits=2500,stockQuantity=4,status="Active" });
            var id = JsonNode.Parse(await productResponse.Content.ReadAsStringAsync())!["id"]!.GetValue<Guid>();
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/merchant/page/publish",PageRules.Default with { ThemeId="linen", Font="Georgia" })).StatusCode);
            var quote = await client.PostAsJsonAsync($"/api/public/stores/{slug}/quote",new {items=new[]{new { productId=id, quantity=1 }},country="SG",fulfillmentMethod="Pickup"});
            Assert.Equal(0,JsonNode.Parse(await quote.Content.ReadAsStringAsync())!["shipping"]!.GetValue<long>());
            var freeDelivery = await client.PostAsJsonAsync($"/api/public/stores/{slug}/quote",new {items=new[]{new { productId=id, quantity=4 }},country="SG",fulfillmentMethod="Delivery"});
            Assert.Equal(0,JsonNode.Parse(await freeDelivery.Content.ReadAsStringAsync())!["shipping"]!.GetValue<long>());
            Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsJsonAsync($"/api/public/stores/{slug}/quote",new {items=new[]{new { productId=id, quantity=5 }},country="SG",fulfillmentMethod="Delivery"})).StatusCode);
            var request = new { idempotencyKey=Guid.NewGuid(),items=new[]{new {productId=id,quantity=1}},name="Fixture shopper",email="test@example.com",street="Pickup",city="Singapore",postalCode="N/A",country="SG",outcome="Paid",fulfillmentMethod="Pickup" };
            var checkout = await client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout",request);
            Assert.Equal(HttpStatusCode.OK,checkout.StatusCode);
            var order = JsonNode.Parse(await checkout.Content.ReadAsStringAsync())!;
            var orderId = order["id"]!.ToString();
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PutAsJsonAsync($"/api/merchant/orders/{orderId}/fulfillment",new { state="Shipped",trackingNumber="",trackingUrl="" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PutAsJsonAsync($"/api/merchant/orders/{orderId}/fulfillment",new { state="ReadyForPickup",trackingNumber="",trackingUrl="" })).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PutAsJsonAsync($"/api/merchant/orders/{orderId}/fulfillment",new { state="Collected",trackingNumber="",trackingUrl="" })).StatusCode);
            var events = JsonNode.Parse(await client.GetStringAsync("/api/merchant/sync/events"))!.AsArray();
            Assert.Equal(3,events.Count);
            client.DefaultRequestHeaders.Authorization = new("Bearer",factory.Token(stranger));
            Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsJsonAsync("/api/merchant/sync/acknowledge",new { ids=events.Select(e=>e!["id"]!.GetValue<long>()).ToArray() })).StatusCode);
            client.DefaultRequestHeaders.Authorization = new("Bearer",factory.Token(owner));
            var ack = new { ids=events.Select(e=>e!["id"]!.GetValue<long>()).ToArray() };
            Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/merchant/sync/acknowledge",ack)).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/merchant/sync/acknowledge",ack)).StatusCode);
            Assert.Empty(JsonNode.Parse(await client.GetStringAsync("/api/merchant/sync/events"))!.AsArray());
            using var scope = factory.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<CommerceDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync();
            Assert.False(await db.Database.SqlQuery<bool>($"SELECT has_table_privilege('authenticated', 'commerce.\"Stores\"', 'SELECT') AS \"Value\"").SingleAsync());
            Assert.Equal(5242880,await db.Database.SqlQuery<long>($"SELECT file_size_limit AS \"Value\" FROM storage.buckets WHERE id = 'storecraft-assets'").SingleAsync());
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT set_config('request.jwt.claim.sub', {owner.ToString()}, true)");
            Assert.True(await db.Database.SqlQuery<bool>($"SELECT commerce.can_upload_storecraft_asset() AS \"Value\"").SingleAsync());
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT set_config('request.jwt.claim.sub', {stranger.ToString()}, true)");
            Assert.False(await db.Database.SqlQuery<bool>($"SELECT commerce.can_upload_storecraft_asset() AS \"Value\"").SingleAsync());
            await transaction.RollbackAsync();
        }
        finally
        {
            using var scope = factory.Services.CreateScope(); var db=scope.ServiceProvider.GetRequiredService<CommerceDbContext>();
            var ids=db.Stores.Where(s=>s.OwnerUserId==owner).Select(s=>s.Id);
            await db.OrderEvents.Where(e=>ids.Contains(e.StoreId)).ExecuteDeleteAsync();
            await db.Orders.Where(e=>ids.Contains(e.StoreId)).ExecuteDeleteAsync();
            await db.PublishedPages.Where(e=>ids.Contains(e.StoreId)).ExecuteDeleteAsync();
            await db.Products.Where(e=>ids.Contains(e.StoreId)).ExecuteDeleteAsync();
            await db.Stores.Where(s=>s.OwnerUserId==owner).ExecuteDeleteAsync();
        }
    }

    [Theory]
    [InlineData(false, HttpStatusCode.NotFound)]
    [InlineData(true, HttpStatusCode.BadRequest)]
    [Trait("Category", "Integration")]
    public async Task ProductionCheckoutRequiresExplicitDemoMode(bool enabled, HttpStatusCode expected)
    {
        using var factory = new TestApplication(production: true, demoEnabled: enabled);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/public/stores/fixture/checkout",new { idempotencyKey=Guid.NewGuid(), items=Array.Empty<object>(), name="Fixture",email="fixture@example.com",street="Fixture",city="Singapore",postalCode="123456",country="SG",outcome="Paid" });
        Assert.Equal(expected, response.StatusCode);
    }
}
