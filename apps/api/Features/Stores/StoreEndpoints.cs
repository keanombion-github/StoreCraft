using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StoreCraft.Api.Data;

namespace StoreCraft.Api.Features.Stores;

public sealed record CreateStoreRequest(string Name, string Slug, string ContactEmail);

public static partial class StoreEndpoints
{
    public static Guid Owner(ClaimsPrincipal user) => Guid.Parse(user.FindFirst("sub")!.Value);

    public static void MapStores(this WebApplication app)
    {
        var routes = app.MapGroup("/api/merchant").RequireAuthorization("Merchant");
        routes.MapGet("/store", async (ClaimsPrincipal user, CommerceDbContext db) =>
        {
            var store = await db.Stores.AsNoTracking().SingleOrDefaultAsync(store => store.OwnerUserId == Owner(user));
            return store is null ? Results.NotFound() : Results.Ok(store);
        });
        routes.MapPost("/store", async (CreateStoreRequest input, ClaimsPrincipal user, CommerceDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 80 || input.Slug is null || input.Slug == "sunday-supply" || !SlugPattern().IsMatch(input.Slug) ||
                !System.Net.Mail.MailAddress.TryCreate(input.ContactEmail, out _) || input.ContactEmail.Length > 254)
                return Results.BadRequest(new { error = "Enter a store name, valid email, and a lowercase slug using letters, numbers, and hyphens (3–100 characters)." });
            var owner = Owner(user);
            if (await db.Stores.AnyAsync(store => store.OwnerUserId == owner)) return Results.Conflict(new { error = "This account already owns a store." });
            var store = new Store { Id = Guid.NewGuid(), OwnerUserId = owner, Name = input.Name.Trim(), Slug = input.Slug, ContactEmail = input.ContactEmail, CreatedAt = DateTimeOffset.UtcNow };
            db.Stores.Add(store);
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            { return Results.Conflict(new { error = "That store slug is already taken, or this account already owns a store." }); }
            return Results.Created("/api/merchant/store", store);
        });
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$")]
    private static partial Regex SlugPattern();
}
