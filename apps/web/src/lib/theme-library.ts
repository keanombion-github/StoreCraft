import type { PageDocument, ThemeLibraryEntry } from "./commerce";
import { themes } from "./storefront-themes";

export function themeKey(page: PageDocument): string {
  return (
    page.themeKey ??
    (page.themePackage
      ? `${page.themePackage.name}@${page.themePackage.version}`
      : (page.themeId ?? "midnight"))
  );
}
export function libraryEntries(page: PageDocument): ThemeLibraryEntry[] {
  const entries = (page.themeLibrary ?? []).map((entry) =>
    page.themePackage && entry.id === themeKey(page)
      ? {
          ...entry,
          accent: page.accent,
          font: page.font,
          themePackage: page.themePackage,
        }
      : entry,
  );
  if (
    page.themePackage &&
    !entries.some((entry) => entry.id === themeKey(page))
  )
    entries.push({
      id: themeKey(page),
      themeId: page.themeId ?? "midnight",
      accent: page.accent,
      font: page.font,
      themePackage: page.themePackage,
    });
  return entries;
}
export function chooseTheme(page: PageDocument, id: string): PageDocument {
  const library = libraryEntries(page);
  if (id === themeKey(page)) return { ...page, themeLibrary: library };
  if (id === "midnight" || id === "linen")
    return {
      ...page,
      themeLibrary: library,
      themeKey: id,
      themePackage: null,
      themeId: id,
      accent: themes[id].accent,
      font: themes[id].font,
    };
  const entry = library.find((item) => item.id === id);
  if (!entry) throw new Error("This theme is no longer in your library.");
  return {
    ...page,
    themeLibrary: library,
    themeKey: id,
    themePackage: entry.themePackage,
    themeId: entry.themeId,
    accent: entry.accent,
    font: entry.font,
  };
}
