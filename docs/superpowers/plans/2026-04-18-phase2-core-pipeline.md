# Phase 2 Core Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete import-to-preview-to-export workflow for `jpg/jpeg/png/heic` using Rust-backed photo loading and a Canvas `classic-bottom` preview.

**Architecture:** Rust owns image IO, normalized EXIF, thumbnail generation, and export. React owns shell interactions, state updates, and Canvas preview rendering for the first template. The preview/export contract stays shared so both outputs follow the same layout rules.

**Tech Stack:** Tauri 2, React 19, TypeScript, Zustand, Rust, `image`, `kamadak-exif`, Canvas 2D

---

### Task 1: Introduce Phase 2 command/data contracts

**Files:**
- Modify: `src/stores/types.ts`
- Create: `src/lib/tauri/photos.ts`
- Modify: `src/stores/photo-store.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add the frontend types for loaded photos and export requests**

Add Rust-compatible request/response types to `src/stores/types.ts` so the UI no longer relies on placeholder-only photo structures.

- [ ] **Step 2: Add the Tauri wrapper module**

Create `src/lib/tauri/photos.ts` with typed wrappers for `load_photos` and `export_single_photo`.

- [ ] **Step 3: Update `photo-store` to support replace/upsert and import errors**

Extend `src/stores/photo-store.ts` so loaded photos from Rust can be merged safely and import errors can be surfaced in the UI.

- [ ] **Step 4: Record the visible contract milestone**

Update `CHANGELOG.md` with the new import/export pipeline groundwork once the contracts are visible in the app behavior or developer-facing architecture.

- [ ] **Step 5: Verify TypeScript still builds**

Run: `npm run build`
Expected: build succeeds without TypeScript errors

### Task 2: Add Rust photo loading with EXIF and thumbnails

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/commands/photos.rs`
- Create: `src-tauri/src/exif/mod.rs`
- Create: `src-tauri/src/exif/normalize.rs`
- Create: `src-tauri/src/images/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add any missing Rust dependencies**

Update `src-tauri/Cargo.toml` for image decode/encode and EXIF parsing needs required by the loader/export path.

- [ ] **Step 2: Implement EXIF normalization helpers**

Create Rust helpers that map raw EXIF tags into the frontend-friendly shape from the spec, preserving a `raw` fallback map.

- [ ] **Step 3: Implement thumbnail generation and image dimension reading**

Create Rust image helpers that read supported formats, bound thumbnails for preview/list usage, and return a data URL payload.

- [ ] **Step 4: Implement `load_photos` command**

Create `src-tauri/src/commands/photos.rs` with `load_photos(paths)` returning successful photo payloads plus structured per-file failures.

- [ ] **Step 5: Register the command in Tauri**

Wire the new module into `src-tauri/src/lib.rs`.

- [ ] **Step 6: Record the user-visible import milestone**

Update `CHANGELOG.md` to reflect Rust-backed metadata and thumbnail loading once visible in the UI.

- [ ] **Step 7: Verify Rust compiles**

Run: `cargo check`
Expected: build succeeds with no Rust errors

### Task 3: Implement photo import interactions in the UI

**Files:**
- Modify: `src/components/photo-list/photo-list.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Create: `src/lib/import/accept.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add file picker import flow**

Wire the photo list import button to Tauri file selection and call `load_photos` with chosen paths.

- [ ] **Step 2: Add window-level drag/drop import**

Handle dropped files from the shell and route supported paths through the same import pipeline.

- [ ] **Step 3: Render real thumbnails and import errors**

Replace placeholder tiles in `PhotoList` with returned thumbnails and show readable failures for unsupported/broken files.

- [ ] **Step 4: Record the import UX milestone**

Update `CHANGELOG.md` with picker/drag import support and real thumbnail rendering.

- [ ] **Step 5: Verify frontend build**

Run: `npm run build`
Expected: build succeeds and photo list compiles with the new flow

### Task 4: Add read-only EXIF presentation

**Files:**
- Modify: `src/components/panel/frame-params-panel.tsx`
- Create: `src/lib/exif/format.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add EXIF formatting helpers**

Create formatting helpers for shutter speed, aperture, ISO, focal length, and taken-at display to keep JSX small.

- [ ] **Step 2: Add a read-only EXIF section to the params panel**

Render core metadata for the selected photo in a dedicated section without introducing edit behavior yet.

- [ ] **Step 3: Record the metadata milestone**

Update `CHANGELOG.md` for the new EXIF panel visibility.

- [ ] **Step 4: Verify frontend build**

Run: `npm run build`
Expected: build succeeds and selected-photo metadata compiles cleanly

### Task 5: Implement the `classic-bottom` Canvas preview

**Files:**
- Create: `src/lib/watermark/classic-bottom.ts`
- Create: `src/lib/watermark/load-image.ts`
- Modify: `src/components/preview/preview-pane.tsx`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add a reusable image loader for Canvas**

Create a helper that loads the selected source image into an `HTMLImageElement` safely for preview rendering.

- [ ] **Step 2: Implement `classic-bottom` layout math**

Create a dedicated renderer module for bottom-bar geometry, text layout, and divider/logo slots.

- [ ] **Step 3: Replace the placeholder preview with real Canvas drawing**

Update `PreviewPane` to draw the image plus bottom bar based on the current photo and template parameters.

- [ ] **Step 4: Record the preview milestone**

Update `CHANGELOG.md` to note the first live template preview.

- [ ] **Step 5: Verify frontend build**

Run: `npm run build`
Expected: build succeeds and preview compiles without runtime-only type issues

### Task 6: Implement single-photo Rust export

**Files:**
- Create: `src-tauri/src/render/mod.rs`
- Create: `src-tauri/src/render/classic_bottom.rs`
- Modify: `src-tauri/src/commands/photos.rs`
- Modify: `src/components/photo-list/photo-list.tsx`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Define the export request/response path in Rust**

Add an `export_single_photo` command input matching the frontend request shape.

- [ ] **Step 2: Implement full-resolution `classic-bottom` composition**

Create Rust render helpers for the first template using the same layout assumptions as the Canvas preview.

- [ ] **Step 3: Wire the export button UI**

Use the current export popover to trigger a single-photo export path, with the placeholder button replaced by a real action when a photo is selected.

- [ ] **Step 4: Record the export milestone**

Update `CHANGELOG.md` for single-photo export support.

- [ ] **Step 5: Verify both build pipelines**

Run: `cargo check`
Expected: Rust compiles

Run: `npm run build`
Expected: frontend compiles with the export wiring

### Task 7: Final verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run end-to-end verification**

Run: `npm run build`
Expected: success

Run: `cargo check`
Expected: success

- [ ] **Step 2: Manual workflow check**

Verify the app can:
- import at least one `jpg/png/heic`
- show a thumbnail
- display EXIF values
- preview the `classic-bottom` template
- export one file

- [ ] **Step 3: Ensure changelog coverage is complete**

Review `CHANGELOG.md` and confirm every user-visible Phase 2 milestone from this plan is recorded.
