import type { PageDocument, Section } from "./commerce";

export const regions = ["Header", "Main", "Footer"] as const;
export type Region = (typeof regions)[number];
export const widgets: Record<Region, Section["type"][]> = {
  Header: ["Container", "Text", "Image", "Html", "Navigation", "Announcement"],
  Main: [
    "Text",
    "Image",
    "Html",
    "Container",
    "Hero",
    "FeaturedProducts",
    "ImageText",
    "Announcement",
  ],
  Footer: ["Container", "Text", "Image", "Html", "Footer", "Announcement"],
};
export const themes = {
  midnight: {
    name: "Midnight",
    description: "Black glass, violet accents, crisp typography.",
    accent: "#a78bfa",
    font: "Inter",
  },
  linen: {
    name: "Linen",
    description: "Warm paper, plum details, editorial typography.",
    accent: "#76516d",
    font: "Georgia",
  },
};
export function regionOf(section: Section): Region {
  return (
    section.region ??
    (section.type === "Footer"
      ? "Footer"
      : section.type === "Navigation"
        ? "Header"
        : "Main")
  );
}
export function normalizePage(page: PageDocument): PageDocument {
  if (page.schemaVersion === 2) return page;
  const sections = page.sections.map((section) => ({
    ...section,
    region: regionOf(section),
  }));
  if (!sections.some((section) => section.type === "Navigation"))
    sections.unshift({
      id: "legacy-navigation",
      type: "Navigation",
      title: "",
      text: "",
      image: "",
      button: "Collection",
      region: "Header",
    });
  if (!sections.some((section) => section.type === "Footer"))
    sections.push({
      id: "legacy-footer",
      type: "Footer",
      title: "Thank you for shopping with us",
      text: "",
      image: "",
      button: "",
      region: "Footer",
    });
  return {
    ...page,
    schemaVersion: 2,
    themeId: page.themeId ?? "midnight",
    templateId: page.templateId ?? "essentials",
    sections,
  };
}
export function templateSections(
  template: "essentials" | "editorial",
): Section[] {
  const item = (
    id: string,
    type: Section["type"],
    region: Region,
    title: string,
    text = "",
    image = "",
    button = "",
  ): Section => ({ id, type, region, title, text, image, button });
  const image =
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80";
  return [
    item(
      "navigation",
      "Navigation",
      "Header",
      "",
      "Considered goods. Everyday living.",
      "",
      "Collection",
    ),
    item(
      "announcement",
      "Announcement",
      "Header",
      "A little more considered",
      "Welcome to our collection",
    ),
    item(
      "hero",
      "Hero",
      "Main",
      template === "editorial"
        ? "Objects with a story."
        : "Everyday things. A little more considered.",
      "Thoughtful essentials for the spaces and moments that matter.",
      image,
      "Discover the collection",
    ),
    ...(template === "editorial"
      ? [
          item(
            "story",
            "ImageText",
            "Main",
            "The things we choose",
            "Made to become part of your everyday. A collection selected for its character, usefulness, and lasting appeal.",
            image,
            "Explore",
          ),
        ]
      : []),
    item(
      "products",
      "FeaturedProducts",
      "Main",
      "The collection",
      "Discover your next everyday favourite.",
    ),
    ...(template === "essentials"
      ? [
          item(
            "story",
            "ImageText",
            "Main",
            "Made for the everyday",
            "Small details make a difference. Find pieces that belong in your life.",
            image,
            "Shop the collection",
          ),
        ]
      : []),
    item(
      "footer",
      "Footer",
      "Footer",
      "Stay a little longer",
      "Considered essentials. Carefully chosen.",
    ),
  ];
}
