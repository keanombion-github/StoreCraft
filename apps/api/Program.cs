using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Commerce");
if (!string.IsNullOrWhiteSpace(connection))
    builder.Services.AddDbContext<CommerceDbContext>(options => options.UseNpgsql(connection));

var app = builder.Build();
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

// Merchant endpoints will be added only with verified identity and ownership checks.
// Database migrations are an explicit setup operation, never a startup side effect.
app.Run();
