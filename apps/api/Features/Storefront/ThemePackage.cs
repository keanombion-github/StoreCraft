using System.Text.Json;
using System.Text.RegularExpressions;

namespace StoreCraft.Api.Features.Storefront;

public sealed record ThemeWidget(string Html, int Height, string[] Fields);
public sealed record ThemePackage(int FormatVersion, string Name, string Version, string Css, Dictionary<string, ThemeWidget> Widgets);
public sealed record ThemeLibraryEntry(string Id, string ThemeId, string Accent, string Font, ThemePackage ThemePackage);

public static class ThemePackageRules
{
    private static readonly HashSet<string> Tags = new("div section article header footer h1 h2 h3 h4 h5 h6 p span img strong em small ul ol li figure figcaption br hr b i".Split(' '));
    private static readonly HashSet<string> Types = new(["Navigation", "Hero", "ImageText", "FeaturedProducts", "Announcement", "Footer"]);
    private static readonly HashSet<string> Fields = new(["title", "text", "image", "button"]);
    public static string? Validate(ThemePackage package)
    {
        if (package.FormatVersion != 1 || string.IsNullOrWhiteSpace(package.Name) || package.Name.Length > 80 || package.Version is null || !Regex.IsMatch(package.Version, @"^\d+\.\d+\.\d+$")) return "Invalid theme name, version, or format.";
        if (package.Css is null || package.Css.Length > 100_000 || Regex.IsMatch(package.Css, @"@import|url\s*\(|<|expression\s*\(", RegexOptions.IgnoreCase)) return "Theme CSS must be local and cannot import external content.";
        if (package.Widgets is null || package.Widgets.Count is < 1 or > 6) return "Include 1–6 supported widget templates.";
        foreach (var (type, widget) in package.Widgets)
        {
            var allowedFields = type is "Hero" or "ImageText" ? Fields : type == "Navigation" ? new HashSet<string>(["title", "text", "button"]) : new HashSet<string>(["title", "text"]);
            if (!Types.Contains(type) || widget is null || widget.Html is null || widget.Html.Length > 300_000 || widget.Height is < 60 or > 1200 || widget.Fields is null || widget.Fields.Length > 4 || widget.Fields.Any(field => !allowedFields.Contains(field))) return "Invalid theme widget or editable fields.";
            if (Regex.IsMatch(widget.Html, @"\bon[a-z]+\s*=|javascript\s*:|\bsrcdoc\s*=|<!|<\?", RegexOptions.IgnoreCase)) return "Theme templates cannot contain scripts, handlers, or embedded documents.";
            foreach (Match match in Regex.Matches(widget.Html, @"<\s*/?\s*([a-z][a-z0-9]*)", RegexOptions.IgnoreCase))
                if (!Tags.Contains(match.Groups[1].Value.ToLowerInvariant())) return "Theme templates must use supported presentation HTML tags.";
        }
        return JsonSerializer.Serialize(package).Length > 2_000_000 ? "Expanded theme must be under 2 MB." : null;
    }
}
