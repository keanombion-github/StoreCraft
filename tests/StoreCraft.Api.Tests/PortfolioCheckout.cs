using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StoreCraft.Api.Data;

public class PortfolioCheckout
{
    [Fact]
    [Trait("Category", "Integration")]
    public async Task DemoOrdersPersistReplayAndRequirePrivateTokensForFulfillment()
    {
        using var factory = new TestApplication();
        using var client = factory.CreateClient();
        var key = Guid.NewGuid(); var failedKey = Guid.NewGuid();
        object Input(Guid id, string outcome = "Paid", int quantity = 2) => new { idempotencyKey = id, items = new[]{new {id="test-portfolio-mug",title="Portfolio test mug",price=2400,quantity}}, name="Fictional test guest",email="test@example.com",street="",city="",postalCode="",outcome,fulfillmentMethod="Pickup",shipping=500,threshold=10000 };
        try
        {
            var replies = await Task.WhenAll(client.PostAsJsonAsync("/api/demo/checkout", Input(key)),client.PostAsJsonAsync("/api/demo/checkout", Input(key)));
            Assert.All(replies, r => Assert.Equal(HttpStatusCode.OK,r.StatusCode));
            var first = JsonNode.Parse(await replies[0].Content.ReadAsStringAsync())!;
            var second = JsonNode.Parse(await replies[1].Content.ReadAsStringAsync())!;
            Assert.Equal(first["id"]!.ToString(),second["id"]!.ToString());
            Assert.Equal(4800,first["total"]!.GetValue<long>());
            Assert.Equal(0,first["shipping"]!.GetValue<long>());
            Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsJsonAsync("/api/demo/checkout",Input(key,"Failed"))).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PostAsJsonAsync("/api/demo/checkout",Input(Guid.NewGuid(),quantity:100))).StatusCode);
            var id=first["id"]!.ToString(); var token=first["token"]!.ToString();
            Assert.Equal(HttpStatusCode.NotFound,(await client.GetAsync($"/api/public/orders/{id}?token=wrong")).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.GetAsync($"/api/public/orders/{id}?token={token}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,(await client.PutAsJsonAsync($"/api/demo/orders/{id}/fulfillment",new {token="wrong",state="ReadyForPickup"})).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PutAsJsonAsync($"/api/demo/orders/{id}/fulfillment",new {token,state="Collected"})).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PutAsJsonAsync($"/api/demo/orders/{id}/fulfillment",new {token,state="ReadyForPickup"})).StatusCode);
            Assert.Equal(HttpStatusCode.OK,(await client.PutAsJsonAsync($"/api/demo/orders/{id}/fulfillment",new {token,state="Collected"})).StatusCode);
            var failed = JsonNode.Parse(await (await client.PostAsJsonAsync("/api/demo/checkout",Input(failedKey,"Failed"))).Content.ReadAsStringAsync())!;
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PutAsJsonAsync($"/api/demo/orders/{failed["id"]}/fulfillment",new {token=failed["token"]!.ToString(),state="ReadyForPickup"})).StatusCode);
            using var scope = factory.Services.CreateScope();
            var db=scope.ServiceProvider.GetRequiredService<CommerceDbContext>();
            var orderId=Guid.Parse(id);
            Assert.Equal(3,await db.OrderEvents.CountAsync(e=>e.OrderId==orderId));
            Assert.Equal("Collected",(await db.Orders.SingleAsync(o=>o.Id==orderId)).FulfillmentState);
        }
        finally
        {
            using var scope=factory.Services.CreateScope();
            var db=scope.ServiceProvider.GetRequiredService<CommerceDbContext>();
            var storeId=Guid.Parse("89be99ef-68de-4b0a-825a-a315f1587cf2");
            var ids=db.Orders.Where(o=>o.StoreId==storeId && (o.IdempotencyKey==key || o.IdempotencyKey==failedKey)).Select(o=>o.Id);
            await db.OrderEvents.Where(e=>ids.Contains(e.OrderId)).ExecuteDeleteAsync();
            await db.Orders.Where(o=>o.StoreId==storeId && (o.IdempotencyKey==key || o.IdempotencyKey==failedKey)).ExecuteDeleteAsync();
        }
    }
    [Fact]
    public async Task HostedDemoCheckoutRequiresExplicitEnablement()
    {
        using var factory=new TestApplication(production:true);
        using var client=factory.CreateClient();
        var result=await client.PostAsJsonAsync("/api/demo/checkout",new { idempotencyKey=Guid.NewGuid(),items=Array.Empty<object>(),name="",email="",street="",city="",postalCode="",outcome="Paid",fulfillmentMethod="Pickup",shipping=500,threshold=10000 });
        Assert.Equal(HttpStatusCode.NotFound,result.StatusCode);
    }
}
