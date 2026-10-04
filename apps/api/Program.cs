using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Auth;
using StoreCraft.Api.Features.Stores;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Storefront;
using StoreCraft.Api.Features.Orders;

var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
var connection = builder.Configuration.GetConnectionString("Commerce");
builder.Services.AddMerchantAuthentication("https://pqwzqabkrwnkatqkgohl.supabase.co");
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000").AllowAnyHeader().AllowAnyMethod()));
if (!string.IsNullOrWhiteSpace(connection))
    builder.Services.AddDbContext<CommerceDbContext>(options => options.UseNpgsql(connection));

var app = builder.Build();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
if (!string.IsNullOrWhiteSpace(connection))
{
    app.MapStores(); app.MapProducts(); app.MapStorefront();
    var secret = builder.Configuration["Demo:ConfirmationSecret"];
    if (!string.IsNullOrWhiteSpace(secret)) app.MapCheckout(secret);
}
app.MapGet("/health", () => Results.Ok(new { status = "running", service = "StoreCraft API", databaseChecked = false }));
app.MapGet("/health/ready", async Task<IResult> (HttpContext context, CancellationToken cancellation) =>
{
    if (string.IsNullOrWhiteSpace(connection))
        return Results.Json(new { status = "not_ready", reason = "Database connection is not configured." }, statusCode: 503);
    try
    {
        var database = context.RequestServices.GetRequiredService<CommerceDbContext>();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        if (await database.Database.CanConnectAsync(timeout.Token))
            return Results.Ok(new { status = "connected", schemaVerified = false });
    }
    catch (Exception)
    {
        // Do not expose database credentials or provider error details in the response.
    }
    return Results.Json(new { status = "not_ready", reason = "Database connection is unavailable." }, statusCode: 503);
});

// Database migrations are an explicit setup operation, never a startup side effect.
app.Run();
public partial class Program { }
