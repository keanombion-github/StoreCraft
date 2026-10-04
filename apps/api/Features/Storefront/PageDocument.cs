using System.Text.Json;
using System.Text.RegularExpressions;

namespace StoreCraft.Api.Features.Storefront;

public sealed record PageSection(string Id, string Type, string Title, string Text, string Image, string Button);
public sealed record PageDocument(int SchemaVersion, string Accent, string Font, PageSection[] Sections);
public sealed class PublishedPage
{
    public Guid Id { get; set; }
    public Guid StoreId { get; set; }
    public required string Document { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
}
public static partial class PageRules
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static PageDocument Default => new(1, "#956ec6", "Inter", [
        new("hero", "Hero", "Everyday things. A little more considered.", "Thoughtful essentials for everyday living.", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80", "Shop the collection"),
        new("products", "FeaturedProducts", "Shop the collection", "", "", ""),
        new("footer", "Footer", "Thank you for shopping with us", "", "", "")]);

    public static string? Validate(PageDocument document)
    {
        if (document.SchemaVersion != 1 || !AccentPattern().IsMatch(document.Accent ?? "") || document.Font is not ("Inter" or "Georgia")) return "Choose a supported page version, font, and six-digit hex color.";
        if (document.Sections is null || document.Sections.Length is < 1 or > 20 || document.Sections.Any(section => section is null)) return "A page needs 1–20 sections.";
        if (document.Sections.Select(section => section.Id).Distinct().Count() != document.Sections.Length) return "Section IDs must be unique.";
        foreach (var section in document.Sections)
        {
            if (string.IsNullOrWhiteSpace(section.Id) || section.Id.Length > 80 || section.Type is not ("Hero" or "FeaturedProducts" or "ImageText" or "Announcement" or "Footer")) return "Invalid section ID or widget type.";
            if (section.Title is null || section.Title.Length > 150 || section.Text is null || section.Text.Length > 1000 || section.Button is null || section.Button.Length > 50 || section.Image is null || section.Image.Length > 1000) return "A widget field is missing or too long.";
            if (section.Image.Length > 0 && (!Uri.TryCreate(section.Image, UriKind.Absolute, out var uri) || uri.Scheme != "https")) return "Widget images must use an HTTPS URL.";
        }
        return null;
    }
    [GeneratedRegex("^#[a-fA-F0-9]{6}$")] private static partial Regex AccentPattern();
}
