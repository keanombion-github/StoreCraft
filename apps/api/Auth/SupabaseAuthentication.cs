using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace StoreCraft.Api.Auth;

// Supabase exposes JWKS rather than requiring a conventional OIDC discovery document.
public sealed class SupabaseConfigurationRetriever(string issuer) : IConfigurationRetriever<OpenIdConnectConfiguration>
{
    public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(string address, IDocumentRetriever retriever, CancellationToken cancellation)
    {
        var json = await retriever.GetDocumentAsync(address, cancellation);
        var configuration = new OpenIdConnectConfiguration { Issuer = issuer };
        foreach (var key in new JsonWebKeySet(json).GetSigningKeys()) configuration.SigningKeys.Add(key);
        return configuration;
    }
}

public static class SupabaseAuthentication
{
    public static void AddMerchantAuthentication(this IServiceCollection services, string projectUrl)
    {
        var issuer = projectUrl.TrimEnd('/') + "/auth/v1";
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.ConfigurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                issuer + "/.well-known/jwks.json", new SupabaseConfigurationRetriever(issuer), new HttpDocumentRetriever { RequireHttps = true });
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = issuer,
                ValidateAudience = true, ValidAudience = "authenticated",
                ValidateLifetime = true, RequireExpirationTime = true,
                ValidateIssuerSigningKey = true, RequireSignedTokens = true,
                ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256, SecurityAlgorithms.RsaSha256],
                ClockSkew = TimeSpan.FromSeconds(30)
            };
        });
        services.AddAuthorization(options => options.AddPolicy("Merchant", policy =>
            policy.RequireAuthenticatedUser().RequireClaim("role", "authenticated").RequireAssertion(context =>
                Guid.TryParse(context.User.FindFirst("sub")?.Value, out _))));
    }
}
