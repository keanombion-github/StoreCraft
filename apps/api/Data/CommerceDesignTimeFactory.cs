using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace StoreCraft.Api.Data;

public sealed class CommerceDesignTimeFactory : IDesignTimeDbContextFactory<CommerceDbContext>
{
    public CommerceDbContext CreateDbContext(string[] args)
    {
        // Generating migrations does not connect. Applying them requires a real secret.
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<CommerceDesignTimeFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();
        var connection = configuration.GetConnectionString("Commerce")
            ?? "Host=localhost;Database=storecraft_design_only;Username=placeholder;Password=placeholder";
        return new CommerceDbContext(new DbContextOptionsBuilder<CommerceDbContext>().UseNpgsql(connection).Options);
    }
}
