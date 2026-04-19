# Brand Logo Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align camera brand formatting with `yiyin` rules and introduce a logo-key mapping layer that prefers `Camera-Logos-SVG` assets.

**Architecture:** Keep raw EXIF untouched, and derive two separate presentation helpers: one for formatted brand/model text and one for logo asset lookup. Mirror the same brand formatting rules in TypeScript and Rust so preview and export stay consistent.

**Tech Stack:** React, TypeScript, Rust, Tauri

---

### Task 1: Add TypeScript brand and logo mapping tests

**Files:**
- Create: `src/lib/exif/brand.test.ts`
- Create: `src/lib/exif/logo.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for `yiyin`-style brand formatting**

- [ ] **Step 2: Run the targeted test command and confirm failures**

Run: `npx vitest run src/lib/exif/brand.test.ts src/lib/exif/logo.test.ts`
Expected: FAIL because the test files or logo helpers do not exist yet.

- [ ] **Step 3: Add minimal test runner support**

Install and wire `vitest` as a dev dependency with a simple `test` script in `package.json`.

- [ ] **Step 4: Re-run the targeted tests to keep them red for the right reason**

Run: `npx vitest run src/lib/exif/brand.test.ts src/lib/exif/logo.test.ts`
Expected: FAIL on missing exports or wrong behavior, not on runner setup.

### Task 2: Implement TypeScript brand formatting and logo lookup

**Files:**
- Modify: `src/lib/exif/brand.ts`
- Create: `src/lib/exif/logo.ts`
- Modify: `src/lib/watermark/classic-bottom.ts`

- [ ] **Step 1: Implement `yiyin`-style camera formatting**

Cover:
- strip `CORPORATION`
- Nikon `Z -> ℤ`, `_7 -> VII`
- Sony `ILCE- -> α`
- default lowercase-model formatting with deduped make

- [ ] **Step 2: Implement logo key and asset lookup helpers**

Cover:
- normalized brand aliases
- primary mapping to `Camera-Logos-SVG`
- return no-logo for unmapped brands

- [ ] **Step 3: Switch preview text rendering to the shared formatting helper**

Use the new formatted camera function and logo lookup without changing raw EXIF display.

- [ ] **Step 4: Re-run the TypeScript tests**

Run: `npx vitest run src/lib/exif/brand.test.ts src/lib/exif/logo.test.ts`
Expected: PASS

### Task 3: Mirror mapping rules in Rust and record the change

**Files:**
- Modify: `src-tauri/src/exif/brand.rs`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add Rust unit tests for formatted brand output**

Cover Nikon, Sony, default, and make normalization cases.

- [ ] **Step 2: Run the Rust brand tests and confirm they fail first**

Run: `cargo test exif::brand --lib`
Expected: FAIL until Rust logic matches the new expectations.

- [ ] **Step 3: Implement the minimal Rust changes**

Mirror the TypeScript formatting behavior so export text matches preview.

- [ ] **Step 4: Re-run the Rust brand tests**

Run: `cargo test exif::brand --lib`
Expected: PASS

- [ ] **Step 5: Record the user-visible behavior in `CHANGELOG.md`**

Note the `yiyin`-style brand formatting and new logo-source strategy.

### Task 4: Verify the integrated build

**Files:**
- Modify: none

- [ ] **Step 1: Run TypeScript build verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run Rust type-check verification**

Run: `cargo check`
Expected: PASS
