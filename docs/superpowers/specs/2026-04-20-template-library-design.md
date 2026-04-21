# Template Library Design

## Scope

This design narrows the next template expansion pass to three high-value templates:

1. `classic-white`
2. `polaroid`
3. `minimal-corner`

The goal is to produce three templates that are visually distinct, stable across photo ratios, and consistent between preview and export. This intentionally avoids broadening the template library with low-confidence concepts such as `magazine`, `film-strip`, `poster`, or `xpan` before the core template system is mature.

## Non-Goals

- No broad visual pass across every template placeholder in the gallery
- No one-off styling experiments that are preview-only
- No per-template parameter explosion
- No changes to photo import, EXIF parsing, or export workflow outside what is required by template rendering

## Template Set

### `classic-white`

Purpose:
- Provide a clean white-base counterpart to the existing `classic-bottom`

Visual direction:
- White canvas
- Centered photo
- Bottom information block with dark text
- Thin divider between photo and watermark area
- Small brand logo, restrained hierarchy

Behavior:
- Shares the same text content model as `classic-bottom`
- Uses stable centered watermark placement
- Must remain readable on both portrait and landscape photos

### `polaroid`

Purpose:
- Provide a card-like template with stronger photographic framing and less metadata density

Visual direction:
- White border around the image
- Noticeably larger bottom margin than top/side margins
- Reduced emphasis on logo
- Text sits in the lower white area with more breathing room

Behavior:
- Uses fewer visible text lines by default than `classic-bottom`
- Must feel intentionally sparse rather than like a stretched bottom bar

### `minimal-corner`

Purpose:
- Provide a lightweight overlay option for users who do not want a full bottom-frame treatment

Visual direction:
- No enlarged white canvas
- Photo stays dominant
- Small metadata block in one corner
- Minimal visual footprint

Behavior:
- Should support the same logo / camera / lens / params content model, but default to a reduced visible set
- Must preserve readability without overwhelming the image

## Architecture

Template expansion should continue to use the current shared render pipeline rather than introducing three disconnected rendering systems.

The rendering model should be split into:

1. Shared content generation
- Build watermark text lines from the normalized EXIF model and template config

2. Template-specific layout
- Decide canvas geometry, photo placement, watermark region, divider behavior, and logo/text anchoring

3. Shared drawing helpers
- Reuse font loading, logo loading, text measurement, baseline alignment, corner radius, and shadow helpers

This keeps preview and Rust export aligned while allowing each template to differ in composition.

## File-Level Direction

- `src/lib/templates.ts`
  - Keep template metadata list authoritative

- `src/components/gallery/template-gallery.tsx`
  - Keep gallery thumbnail language aligned with actual template behavior

- `src/components/preview/preview-pane.tsx`
  - Continue using the current selected template kind to drive preview rendering

- `src/lib/watermark/*`
  - Add template-aware layout behavior in a focused way
  - Avoid packing all template logic into one giant branch block if it starts to sprawl

- `src-tauri/src/render/*`
  - Mirror preview template layout decisions in export rendering

- `src/stores/template-store.ts`
  - Keep per-template default parameter baselines lightweight and intentional

## Constraints

- Preview and export must remain visually consistent
- New templates must work with the current EXIF / logo pipeline
- Template controls should remain global export-level settings, not per-photo settings
- Parameter ranges must remain constrained enough that templates do not become ugly under normal use

## Acceptance Criteria

The work is successful when:

- `classic-white`, `polaroid`, and `minimal-corner` each have a visually distinct first version
- Each template can be selected from the gallery and previewed correctly
- Each template exports through Rust with the same overall composition seen in preview
- None of the three templates require a new large parameter surface to remain usable
- Existing `classic-bottom` behavior is preserved

## Recommended Implementation Order

1. Finalize `classic-white`
2. Implement `polaroid`
3. Implement `minimal-corner`

This order keeps the first step closest to the current code, then moves to progressively more distinct layouts.
