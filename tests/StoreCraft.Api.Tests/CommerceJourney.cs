using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using StoreCraft.Api.Data;
using StoreCraft.Api.Features.Storefront;

public class CommerceJourney
{
    [Fact]
    [Trait("Category", "Integration")]
    public async Task OwnershipPublishingCheckoutAndConcurrentStockAreEnforced()
    {
        using var factory = new TestApplication();
        using var client = factory.CreateClient();
        var owner = Guid.NewGuid(); var stranger = Guid.NewGuid();
        var slug = "test-" + Guid.NewGuid().ToString("N");
        try
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/merchant/store")).StatusCode);
            client.DefaultRequestHeaders.Authorization = new("Bearer", factory.Token(owner));
            var storeResponse = await client.PostAsJsonAsync("/api/merchant/store", new {name="Integration test store", slug, contactEmail="test@example.com"});
            Assert.Equal(HttpStatusCode.Created, storeResponse.StatusCode);
            var productInput = new {title="Test mug",slug="test-mug",description="Integration fixture",sku="TEST",priceMinorUnits=2400,stockQuantity=2,status="Active"};
            var productResponse = await client.PostAsJsonAsync("/api/merchant/products/", productInput);
            Assert.Equal(HttpStatusCode.Created, productResponse.StatusCode);
            var product = JsonNode.Parse(await productResponse.Content.ReadAsStringAsync())!;
            var productId = product["id"]!.GetValue<Guid>();
            client.DefaultRequestHeaders.Authorization = new("Bearer", factory.Token(stranger));
            Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/merchant/products/{productId}", productInput)).StatusCode);
            client.DefaultRequestHeaders.Authorization = new("Bearer", factory.Token(owner));
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/public/stores/{slug}")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/merchant/page/publish", PageRules.Default)).StatusCode);
            var invalidFeatured = PageRules.Default with { Sections = PageRules.Default.Sections.Select(s => s.Type == "FeaturedProducts" ? s with { ProductIds = [Guid.NewGuid()] } : s).ToArray() };
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/merchant/page/publish", invalidFeatured)).StatusCode);
            var draft = PageRules.Default with { Sections = PageRules.Default.Sections.Select(s => s.Id == "hero" ? s with { Title = "Unpublished change" } : s).ToArray() };
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/merchant/page", draft)).StatusCode);
            var published = await client.GetStringAsync($"/api/public/stores/{slug}");
            Assert.DoesNotContain("Unpublished change", published);
            object Checkout(Guid key, string outcome="Paid") => new { idempotencyKey=key,items=new[]{new {productId,quantity=1}},name="Test Customer",email="test@example.com",street="Test address",city="Singapore",postalCode="123456",country="SG",outcome,priceMinorUnits=1 };
            var failed = await client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(Guid.NewGuid(),"Failed"));
            Assert.Equal(HttpStatusCode.OK, failed.StatusCode);
            var key = Guid.NewGuid();
            var paid = await client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(key));
            Assert.Equal(HttpStatusCode.OK, paid.StatusCode);
            var result = JsonNode.Parse(await paid.Content.ReadAsStringAsync())!;
            var replay = JsonNode.Parse(await (await client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(key))).Content.ReadAsStringAsync())!;
            Assert.Equal(result["id"]!.ToString(), replay["id"]!.ToString());
            Assert.True(replay["replayed"]!.GetValue<bool>());
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(key,"Failed"))).StatusCode);
            var receipt = JsonNode.Parse(await client.GetStringAsync($"/api/public/orders/{result["id"]}?token={result["token"]}"))!;
            Assert.Equal(2900, receipt["total"]!.GetValue<long>());
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/public/orders/{result["id"]}?token=invalid")).StatusCode);
            var simultaneous = await Task.WhenAll(client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(Guid.NewGuid())),client.PostAsJsonAsync($"/api/public/stores/{slug}/checkout", Checkout(Guid.NewGuid())));
            Assert.Single(simultaneous,response=>response.StatusCode==HttpStatusCode.OK);
            Assert.Single(simultaneous,response=>response.StatusCode==HttpStatusCode.Conflict);
            Assert.Equal(HttpStatusCode.OK,(await client.PutAsJsonAsync($"/api/merchant/orders/{result["id"]}/fulfillment",new {state="Shipped",trackingNumber="TEST123",trackingUrl="https://example.com/tracking"})).StatusCode);
        }
        finally
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CommerceDbContext>();
            var ids = db.Stores.Where(s=>s.OwnerUserId==owner).Select(s=>s.Id);
            await db.OrderEvents.Where(o=>ids.Contains(o.StoreId)).ExecuteDeleteAsync();
            await db.Orders.Where(o=>ids.Contains(o.StoreId)).ExecuteDeleteAsync();
            await db.PublishedPages.Where(p=>ids.Contains(p.StoreId)).ExecuteDeleteAsync();
            await db.Products.Where(p=>ids.Contains(p.StoreId)).ExecuteDeleteAsync();
            await db.Stores.Where(s=>s.OwnerUserId==owner).ExecuteDeleteAsync();
        }
    }
    [Fact]
    public void PageValidationRejectsUnsafeImagesAndDuplicateSections()
    {
        Assert.Null(PageRules.Validate(PageRules.Default));
        Assert.NotNull(PageRules.Validate(PageRules.Default with {Sections=[new("a","Hero","","","javascript:alert(1)","")]}));
        Assert.NotNull(PageRules.Validate(PageRules.Default with {Sections=[PageRules.Default.Sections[0],PageRules.Default.Sections[0]]}));
    }
}
public sealed class TestApplication : WebApplicationFactory<Program>
{
    private readonly bool production;
    private readonly bool demoEnabled;
    public TestApplication(bool production = false, bool demoEnabled = false) { this.production = production; this.demoEnabled = demoEnabled; }
    private readonly ECDsa signing = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private const string Issuer="https://pqwzqabkrwnkatqkgohl.supabase.co/auth/v1";
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(production ? "Production" : "Development");
        builder.ConfigureAppConfiguration((_,config)=>config.AddUserSecrets<CommerceDesignTimeFactory>(optional:false).AddInMemoryCollection(new Dictionary<string,string?> { ["Demo:Enabled"] = demoEnabled.ToString() }));
        builder.ConfigureServices(services=>services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme,options=>{
            var configuration=new OpenIdConnectConfiguration {Issuer=Issuer};
            configuration.SigningKeys.Add(new ECDsaSecurityKey(signing) {KeyId="integration-only"});
            options.ConfigurationManager=new StaticConfigurationManager<OpenIdConnectConfiguration>(configuration);
        }));
    }
    public string Token(Guid owner) => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(Issuer,"authenticated",[new Claim("sub",owner.ToString()),new Claim("role","authenticated")],DateTime.UtcNow.AddMinutes(-1),DateTime.UtcNow.AddMinutes(10),new SigningCredentials(new ECDsaSecurityKey(signing){KeyId="integration-only"},SecurityAlgorithms.EcdsaSha256)));
}
