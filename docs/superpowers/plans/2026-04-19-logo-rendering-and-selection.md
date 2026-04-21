# Logo Rendering And Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render real SVG camera logos in preview/export and add a global Logo brand/version selector driven by the logo catalog.

**Architecture:** Keep logo configuration at the template/global level, not per photo. Use the existing catalog as the single source of truth, expose global `logoKey` and `logoVariant` fields in template state, and make preview/export both read those values instead of synthetic placeholder text.

**Tech Stack:** React, TypeScript, Rust, Tauri, Canvas 2D, SVG assets

---

### Task 1: Add state and helper tests for global logo selection

**Files:**
- Modify: `src/lib/exif/logo.test.ts`
- Modify: `src/stores/types.ts`
- Modify: `src/stores/template-store.ts`

- [x] **Step 1: Write failing tests for explicit logo-key and logo-variant selection**

Cover:
- explicit key lookup beats EXIF-derived key
- per-key available variants are enumerable from the catalog
- fallback behavior stays stable when a variant is missing

- [x] **Step 2: Run the targeted tests and confirm red**

Run: `npm run test -- src/lib/exif/logo.test.ts`
Expected: FAIL on missing helpers or state fields.

- [x] **Step 3: Add minimal state fields**

Add `logoKey` and `logoVariant` to `FrameParams` and initialize them in the template store.

- [x] **Step 4: Re-run the targeted tests**

Run: `npm run test -- src/lib/exif/logo.test.ts`
Expected: FAIL only on missing helper behavior, not type errors.

### Task 2: Implement catalog-driven logo selection helpers

**Files:**
- Modify: `src/lib/exif/logo.ts`
- Modify: `src/lib/exif/logo-catalog.ts`

- [x] **Step 1: Add helpers for listing keys and variants**

Add helpers for:
- catalog keys
- available variants for a key
- resolving a logo path from explicit `logoKey + logoVariant`

- [x] **Step 2: Preserve EXIF-derived fallback**

If no explicit key is selected, keep the existing EXIF-derived brand fallback.

- [x] **Step 3: Re-run targeted tests**

Run: `npm run test -- src/lib/exif/logo.test.ts`
Expected: PASS

### Task 3: Render real logos in preview and expose global controls

**Files:**
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src/components/panel/frame-params-panel.tsx`
- Modify: `src/stores/template-store.ts`

- [x] **Step 1: Write the smallest failing test or assertion update for preview inputs**

Add a test for logo helper output if needed; otherwise document the render path in code comments and move to implementation.

- [x] **Step 2: Add global Logo controls in the panel**

Expose:
- `showLogo`
- `logoKey` selector
- `logoVariant` selector filtered by current key
- existing `logoSize` and `logoGap`

- [x] **Step 3: Load and draw the selected SVG in canvas preview**

Use the chosen asset path to draw the logo before the first text line, replacing the placeholder logo token.

- [x] **Step 4: Verify preview build**

Run: `npm run build`
Expected: PASS

### Task 4: Render real logos in Rust export and record the change

**Files:**
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Modify: `src-tauri/src/commands/photos.rs` if request shape changes
- Modify: `CHANGELOG.md`

- [x] **Step 1: Add request/config fields needed by export**

Make sure export receives `logoKey` and `logoVariant`.

- [x] **Step 2: Implement minimal Rust-side SVG logo loading strategy**

Load the selected logo asset from `public/brand-logos` and composite it into the first line region.

- [x] **Step 3: Run Rust verification**

Run: `cargo check`
Expected: PASS

- [x] **Step 4: Record the user-visible behavior in `CHANGELOG.md`**

### Execution Note (Retrospective Closure on 2026-04-21)

Checklist closed against implemented code in:
- `src/stores/types.ts`, `src/stores/template-store.ts`
- `src/lib/exif/logo.ts`, `src/lib/exif/logo-catalog.ts`, `src/lib/exif/logo.test.ts`
- `src/components/panel/frame-params-panel.tsx`
- `src/lib/watermark/classic-bottom.ts`
- `src-tauri/src/render/classic_bottom.rs`

Fresh verification on 2026-04-21:
- `bun test src/lib/exif/logo.test.ts`
- `npm run build`
- `cargo check`

Note that logo rendering now uses real assets and that global logo brand/version can be selected.
