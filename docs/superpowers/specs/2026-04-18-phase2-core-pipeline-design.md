# Phase 2 Core Pipeline Design

**Scope**

Phase 2 delivers one end-to-end photo workflow for `jpg/jpeg/png/heic`:
import photos, parse metadata, generate thumbnails, render a `classic-bottom`
preview in Canvas, and export a single composed image through Rust.

**Non-goals**

- RAW support
- Batch export execution
- Multi-template parity
- Full EXIF editing UX

**Architecture**

The implementation follows the existing mixed rendering plan:

- Rust is the source of truth for file IO, image dimensions, EXIF parsing,
  thumbnail generation, and final export composition.
- React/Tauri orchestrates file selection, drag and drop, state storage, and
  Canvas preview rendering.
- Preview and export share one template contract so field order, spacing rules,
  and typography ratios stay aligned even if pixels are not identical.

**Data Flow**

1. User imports one or more local image files through file picker or drag/drop.
2. Frontend passes file paths to a Tauri `load_photos` command.
3. Rust filters unsupported files, reads image metadata, generates a bounded
   thumbnail, extracts EXIF into a normalized payload, and returns photo records.
4. Frontend stores photo records in `photo-store` and renders real thumbnails in
   `PhotoList`.
5. `PreviewPane` renders the selected photo plus a `classic-bottom` info bar on
   Canvas using `template-store` parameters.
6. User triggers single export; frontend sends export inputs to Rust.
7. Rust composes the full-resolution output and writes it to the chosen path.

**Rust Surface**

Rust should expose:

- `load_photos(paths: string[]) -> LoadPhotosResponse`
- `export_single_photo(request: ExportRequest) -> ExportResult`

The Rust response should standardize:

- photo id
- source path
- width / height
- thumbnail data url
- normalized EXIF structure
- per-file error information for unsupported or failed inputs

**Frontend Surface**

Frontend changes should be kept narrow:

- `PhotoList` gets file picker and drag/drop wiring plus real thumbnail rendering.
- `PreviewPane` moves from placeholder box to actual Canvas drawing for
  `classic-bottom`.
- `FrameParamsPanel` gains a read-only EXIF section for core fields.
- `AppShell` hosts drop events at the shell level so import works from the whole
  window, not just the photo list.

**Template Boundary**

Phase 2 implements only `classic-bottom`.

The first template should honor the existing parameters that are already present
in `template-store` and materially affect this layout:

- paddings
- background
- shadow
- photo scale / border
- font size / weight / letter spacing / line height / text color / alignment
- logo size / gap / color
- divider show / color
- info position when applicable to the bottom-bar layout

Unused parameters must be left untouched rather than removed.

**EXIF Boundary**

The normalized preview/export model should support:

- camera make/model
- lens
- ISO
- aperture
- shutter speed
- focal length
- taken at
- optional GPS
- raw fallback map

When a field is missing, UI should degrade gracefully and omit the label/value
instead of rendering placeholder junk.

**Error Handling**

- Unsupported files should be skipped with explicit errors, not silently ignored.
- HEIC decoding failures should return a visible per-file error.
- Export failures should surface a readable error string to the UI.
- Missing EXIF is valid; photo import should still succeed.

**Verification**

Phase 2 is complete when:

- importing `jpg/png/heic` produces photo records and visible thumbnails
- selecting a photo shows a real Canvas preview for `classic-bottom`
- EXIF fields render in the panel for files that contain them
- single-photo export writes a file successfully
- `npm run build` and `cargo check` pass

**Changelog Rule**

Every user-visible milestone in this phase must update `CHANGELOG.md` before the
work is considered complete.
