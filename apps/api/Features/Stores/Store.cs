namespace StoreCraft.Api.Features.Stores;

public sealed class Store
{
    public Guid Id { get; set; }
    // This is the verified Supabase Auth user ID, never an ID trusted from a form.
    public Guid OwnerUserId { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string ContactEmail { get; set; }
    public string Currency { get; set; } = "SGD";
    public DateTimeOffset CreatedAt { get; set; }
}
