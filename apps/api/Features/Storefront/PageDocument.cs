using System.Text.Json;
using System.Text.RegularExpressions;

namespace StoreCraft.Api.Features.Storefront;

public sealed record PageSection(string Id, string Type, string Title, string Text, string Image, string Button, string Region = "Main", Guid[]? ProductIds = null);
public sealed record PageDocument(int SchemaVersion, string Accent, string Font, PageSection[] Sections, string ThemeId = "midnight", string TemplateId = "essentials", string Logo = "", string LogoAlt = "", ThemePackage? ThemePackage = null);
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
    public static PageDocument Default => new(2, "#a78bfa", "Inter", [
        new("navigation", "Navigation", "", "Thoughtful goods for everyday living", "", "Collection", "Header"),
        new("announcement", "Announcement", "A little more considered", "Welcome to our collection", "", "", "Header"),
        new("hero", "Hero", "Everyday things. A little more considered.", "Thoughtful essentials for everyday living.", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80", "Shop the collection"),
        new("products", "FeaturedProducts", "Shop the collection", "", "", ""),
        new("story", "ImageText", "Made for the everyday", "Objects you reach for, spaces you love. Discover the details that make a difference.", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80", "Explore the collection"),
        new("footer", "Footer", "Thank you for shopping with us", "Considered essentials. Carefully chosen.", "", "", "Footer")]);

    // Old saved snapshots remain readable; only explicit publication replaces their JSON.
    public static PageDocument Normalize(PageDocument document)
    {
        if (document.SchemaVersion != 1) return document;
        var footerFound = false;
        var sections = document.Sections.Select(section => {
            if (section.Type != "Footer") return section with { Region = "Main" };
            var type = footerFound ? "Announcement" : "Footer"; footerFound = true;
            return section with { Type = type, Region = "Footer" };
        }).ToList();
        string NewId(string prefix) { var id = prefix; while (sections.Any(s => s.Id == id)) id += "-"; return id; }
        sections.Insert(0, new(NewId("legacy-navigation"), "Navigation", "", "", "", "Collection", "Header"));
        if (!footerFound) sections.Add(new(NewId("legacy-footer"), "Footer", "Thank you for shopping with us", "", "", "", "Footer"));
        if (!sections.Any(s => s.Region == "Main")) sections.Add(new(NewId("legacy-welcome"), "Hero", "Welcome to our store", "", "", "Shop the collection"));
        return document with { SchemaVersion = 2, Sections = sections.ToArray() };
    }

    public static string? Validate(PageDocument document)
    {
        if (document.ThemePackage is { } package && ThemePackageRules.Validate(package) is { } packageError) return packageError;
        if (document.SchemaVersion is not (1 or 2) || !AccentPattern().IsMatch(document.Accent ?? "") || document.Font is not ("Inter" or "Georgia")) return "Choose a supported page version, font, and six-digit hex color.";
        if (document.ThemeId is not ("midnight" or "linen") || document.TemplateId is not ("essentials" or "editorial")) return "Choose an available theme and template.";
        if (document.Logo is null || document.LogoAlt is null || document.LogoAlt.Length > 150 || document.Logo.Length > 1000 || (document.Logo.Length > 0 && (!Uri.TryCreate(document.Logo, UriKind.Absolute, out var logo) || logo.Scheme != "https" || string.IsNullOrWhiteSpace(document.LogoAlt)))) return "Provide an HTTPS logo and descriptive alternative text.";
        if (document.Sections is null || document.Sections.Length is < 1 or > 24 || document.Sections.Any(section => section is null)) return "A page needs 1–24 sections.";
        if (document.SchemaVersion == 1 && (document.Sections.Length > 20 || document.Sections.Any(s => s.Type == "Navigation"))) return "Upgrade this page to the current schema before adding regions.";
        if (document.Sections.Select(section => section.Id).Distinct().Count() != document.Sections.Length) return "Section IDs must be unique.";
        foreach (var section in document.Sections)
        {
            if (string.IsNullOrWhiteSpace(section.Id) || section.Id.Length > 80 || section.Type is not ("Navigation" or "Hero" or "FeaturedProducts" or "ImageText" or "Announcement" or "Footer")) return "Invalid section ID or widget type.";
            if (document.SchemaVersion == 2 && !Allowed(section.Type, section.Region)) return "That widget is not allowed in this region.";
            if (section.ProductIds is { } ids && (ids.Length > 24 || ids.Any(id => id == Guid.Empty) || ids.Distinct().Count() != ids.Length || (ids.Length > 0 && section.Type != "FeaturedProducts"))) return "Choose up to 24 unique featured products.";
            if (section.Title is null || section.Title.Length > 150 || section.Text is null || section.Text.Length > 1000 || section.Button is null || section.Button.Length > 50 || section.Image is null || section.Image.Length > 1000) return "A widget field is missing or too long.";
            if (section.Image.Length > 0 && (!Uri.TryCreate(section.Image, UriKind.Absolute, out var uri) || uri.Scheme != "https")) return "Widget images must use an HTTPS URL.";
        }
        if (document.SchemaVersion == 2 && (document.Sections.Count(section => section.Type == "Navigation") > 1 || document.Sections.Count(section => section.Type == "Footer") > 1 || !document.Sections.Any(section => section.Region == "Main"))) return "Use at most one navigation and one footer, and keep at least one main-content widget.";
        return null;
    }
    public static bool Allowed(string type, string region) => region switch
    {
        "Header" => type is "Navigation" or "Announcement",
        "Main" => type is "Hero" or "FeaturedProducts" or "ImageText" or "Announcement",
        "Footer" => type is "Footer" or "Announcement",
        _ => false
    };
    [GeneratedRegex("^#[a-fA-F0-9]{6}$")] private static partial Regex AccentPattern();
}
