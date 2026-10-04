using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;
using StoreCraft.Api.Auth;
using StoreCraft.Api.Features.Stores;
using StoreCraft.Api.Features.Products;
using StoreCraft.Api.Features.Storefront;
using StoreCraft.Api.Features.Orders;

var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddMerchantAuthentication(builder.Configuration["Supabase:Url"] ?? "https://pqwzqabkrwnkatqkgohl.supabase.co");
builder.Services.AddSingleton<IDemoPayment, DemoPayment>();
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429;
    options.AddPolicy("checkout", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000", "http://127.0.0.1:3000"]).AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddDbContext<CommerceDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("Commerce") ?? throw new InvalidOperationException("Database connection is not configured.")));

var app = builder.Build();
var connection = app.Configuration.GetConnectionString("Commerce");
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
if (!string.IsNullOrWhiteSpace(connection))
{
    app.MapStores(); app.MapProducts(); app.MapStorefront(); app.MapOrderSync();
    var secret = builder.Configuration["Demo:ConfirmationSecret"];
    if (string.IsNullOrWhiteSpace(secret)) throw new InvalidOperationException("Configure Demo:ConfirmationSecret to enable private order receipts.");
    try { if (Convert.FromBase64String(secret).Length < 32) throw new FormatException(); }
    catch (FormatException) { throw new InvalidOperationException("Demo:ConfirmationSecret must be a base64-encoded random key of at least 32 bytes."); }
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
        if (await database.Database.CanConnectAsync(timeout.Token) && !(await database.Database.GetPendingMigrationsAsync(timeout.Token)).Any())
            return Results.Ok(new { status = "connected", schemaVerified = true });
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
