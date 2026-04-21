# Template Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement first usable versions of `classic-white`, `polaroid`, and `minimal-corner` with aligned preview/export behavior.

**Architecture:** Keep the shared watermark content pipeline, but split template-specific geometry and placement into focused helpers so preview and Rust export can share the same composition model. Each template gets a constrained default config rather than a bespoke parameter surface.

**Tech Stack:** React, Zustand, TypeScript canvas preview, Rust image export, Bun tests, Cargo check/tests.

---

### Task 1: Extract Template Geometry Helpers

**Files:**
- Modify: `src/lib/watermark/template-layout.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Test: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Implement shared template geometry helpers**
- [x] **Step 3: Wire preview to use template-specific geometry**
- [x] **Step 4: Wire Rust export to mirror the same geometry**
- [x] **Step 5: Run focused tests and checks**

### Task 2: Finalize `classic-white`

**Files:**
- Modify: `src/stores/types.ts`
- Modify: `src/stores/template-store.ts`
- Modify: `src/lib/templates.ts`
- Modify: `src/components/gallery/template-gallery.tsx`
- Modify: `src/components/preview/preview-pane.tsx`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Test: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add/confirm template metadata and defaults**
- [x] **Step 2: Implement white-base layout/render treatment in preview/export**
- [x] **Step 3: Align gallery thumbnail with real template behavior**
- [x] **Step 4: Run focused tests and checks**

### Task 3: Implement `polaroid`

**Files:**
- Modify: `src/stores/template-store.ts`
- Modify: `src/components/gallery/template-gallery.tsx`
- Modify: `src/lib/watermark/template-layout.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Test: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add template defaults for a larger bottom white margin**
- [x] **Step 2: Implement preview/export composition with sparse lower caption block**
- [x] **Step 3: Adjust default visible fields for Polaroid behavior**
- [x] **Step 4: Run focused tests and checks**

### Task 4: Implement `minimal-corner`

**Files:**
- Modify: `src/stores/template-store.ts`
- Modify: `src/components/gallery/template-gallery.tsx`
- Modify: `src/lib/watermark/template-layout.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Test: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add template defaults for reduced visible metadata**
- [x] **Step 2: Implement corner-anchored preview/export layout without enlarged frame**
- [x] **Step 3: Keep logo/text anchoring readable against the image**
- [x] **Step 4: Run focused tests and checks**

### Task 5: Verification and Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [x] **Step 1: Record user-visible template library changes**
- [x] **Step 2: Run `bun test src/lib/watermark/classic-bottom.test.ts src/lib/exif/logo.test.ts src/lib/exif/brand.test.ts`**
- [x] **Step 3: Run `npm run build`**
- [x] **Step 4: Run `cargo check`**
- [x] **Step 5: Run `cargo test --test phase2_smoke --no-run`**

### Execution Note (Retrospective Closure on 2026-04-21)

This checklist was backfilled based on implemented code paths already present in:
- `src/lib/watermark/template-layout.ts`
- `src/lib/watermark/classic-bottom.ts`
- `src-tauri/src/render/classic_bottom.rs`
- `src/stores/template-store.ts`
- `src/components/gallery/template-gallery.tsx`

Fresh verification rerun on 2026-04-21:
- `bun test src/lib/watermark/classic-bottom.test.ts src/lib/exif/logo.test.ts src/lib/exif/brand.test.ts`
- `npm run build`
- `cargo check`
- `cargo test --test phase2_smoke --no-run`
