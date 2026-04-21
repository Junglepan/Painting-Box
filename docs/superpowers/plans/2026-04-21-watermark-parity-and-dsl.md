# Watermark Parity and DSL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify preview/export watermark behavior, add internal template DSL support, and improve readability + logo parity.

**Architecture:** Move shared layout constants to JSON consumed by both TypeScript and Rust; keep existing renderers but drive key geometry with shared spec and shared logo catalog data. Extend watermark line building with optional internal DSL while preserving current toggle-based defaults.

**Tech Stack:** React + TypeScript canvas preview, Rust renderer, Bun tests, Cargo tests/check.

---

### Task 1: Shared Layout Spec

**Files:**
- Create: `src/shared/watermark-layout-spec.json`
- Create: `src/lib/watermark/layout-spec.ts`
- Create: `src-tauri/src/render/layout_spec.rs`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`

- [x] **Step 1: Add RED tests for shared constants usage**
- [x] **Step 2: Implement shared JSON spec and loaders (TS/Rust)**
- [x] **Step 3: Replace duplicated layout constants with shared spec reads**
- [x] **Step 4: Run focused tests/checks**

### Task 2: Unified Logo Catalog for TS/Rust

**Files:**
- Create: `src/shared/logo-catalog.json`
- Modify: `src/lib/exif/logo-catalog.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`

- [x] **Step 1: Add RED tests for Rust logo path resolution via catalog**
- [x] **Step 2: Make TS read catalog from shared JSON source**
- [x] **Step 3: Make Rust read the same shared catalog JSON**
- [x] **Step 4: Run focused tests/checks**

### Task 3: Internal Watermark Template DSL (no UI)

**Files:**
- Modify: `src/stores/types.ts`
- Modify: `src/lib/template-capabilities.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Modify: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add RED tests for placeholder line rendering**
- [x] **Step 2: Add optional DSL field to config types without UI exposure**
- [x] **Step 3: Implement placeholder expansion in TS and Rust line builders**
- [x] **Step 4: Run focused tests/checks**

### Task 4: Font Metrics Improvement

**Files:**
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/text.rs`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Modify: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add RED tests for baseline/line-height behavior helpers**
- [x] **Step 2: Implement TS text metrics helpers**
- [x] **Step 3: Implement Rust ascent/descent/line-height helpers**
- [x] **Step 4: Use metrics for text block height + baseline placement**
- [x] **Step 5: Run focused tests/checks**

### Task 5: Auto Readability Strategy

**Files:**
- Modify: `src/stores/types.ts`
- Modify: `src/stores/template-store.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`
- Modify: `src-tauri/src/render/classic_bottom.rs`
- Modify: `src/lib/watermark/classic-bottom.test.ts`

- [x] **Step 1: Add RED tests for luminance-based color choice**
- [x] **Step 2: Add internal toggle `autoTextContrast` (default enabled)**
- [x] **Step 3: Implement preview/export adaptive text/divider color selection**
- [x] **Step 4: Run focused tests/checks**

### Task 6: Verification and Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [x] **Step 1: Update changelog**
- [x] **Step 2: Run `bun test src/lib/watermark/classic-bottom.test.ts src/lib/template-capabilities.test.ts src/lib/exif/logo.test.ts src/lib/exif/brand.test.ts`**
- [x] **Step 3: Run `npm run build`**
- [x] **Step 4: Run `cargo check`**
- [x] **Step 5: Run `cargo test --test phase2_smoke --no-run`**

### Execution Note (2026-04-21)

Completed in this branch with paired TS/Rust changes and fresh verification evidence.  
Additional focused Rust unit checks executed:
- `cargo test dsl_template_builds_expected_lines --lib`
- `cargo test readable_color_prefers_dark_text_on_light_background --lib`
