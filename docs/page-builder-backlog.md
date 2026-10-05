# Page builder ideas for later

Saved from Kean's request on October 4, 2026. Initial proposal; implementation status is recorded below.

## Container widget with configurable columns

Add a container widget that can hold other widgets and offer column layout options, with up to eight columns. The first version supports up to eight columns and eight child widgets per container.

The goal is an experimental, flexible builder for demo users. Keep simple prebuilt layouts as the starting experience, then allow users to arrange content inside containers.

Suggested first version:

- A flat container with configurable column count and child widget slots.
- Visible drop targets, child selection, editing, moving, and deletion.
- Controls for spacing, alignment, and column widths.
- Responsive layouts: fewer columns on tablets and stacking on phones.
- Prevent deeply nested containers initially to keep editing predictable.
- Define deletion behavior so removing a container does not accidentally lose its contents.
- Extend page validation, theme rendering, and saved-page compatibility together.

Prioritize reliable products, storefront publishing, and checkout before developing this extension. The first version is now implemented.

Implemented October 5, 2026: flat containers with 1–8 columns, up to eight child widgets, spacing/alignment controls, child placement, safe column reduction, responsive stacking, and confirmed deletion. See containers-and-sharing.md for usage and limits. Column widths and deeper nesting remain future work.
