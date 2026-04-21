# Pending Tasks Snapshot (2026-04-21)

This snapshot consolidates older plan checklists that still show unchecked items.

## P0 (Should Execute Next)

- **Submit and stabilize current watermark parity + DSL work**
  - Commit only task-related files from the current working tree.
  - Run one more full verification after commit:
    - `bun test src/lib/watermark/classic-bottom.test.ts src/lib/template-capabilities.test.ts src/lib/exif/logo.test.ts src/lib/exif/brand.test.ts`
    - `npm run build`
    - `cargo check`
    - `cargo test --test phase2_smoke --no-run`

- **Template-library plan checklist backfill**
  - File: `docs/superpowers/plans/2026-04-20-template-library-implementation.md`
  - Action: Mark completed steps and explicitly list any remaining true gaps.

## P1 (Needs Confirmation)

- **Brand-logo mapping plan residuals**
  - File: `docs/superpowers/plans/2026-04-19-brand-logo-mapping.md`
  - Most implementation appears present; checklist still unchecked.
  - Action: verify each step against current code/tests and close or carry forward.

- **Logo rendering/selection plan residuals**
  - File: `docs/superpowers/plans/2026-04-19-logo-rendering-and-selection.md`
  - Core behaviors appear in code, but checklist not maintained.
  - Action: same as above.

## P2 (Likely Historical / Superseded, but Unclosed)

- **Phase 2 core pipeline checklist**
  - File: `docs/superpowers/plans/2026-04-18-phase2-core-pipeline.md`
  - Large checklist remains unchecked although major pipeline features exist.
  - Action: close with a retrospective status section instead of line-by-line retroactive ticking if preferred.

## Recommended Closure Order

1. Commit current watermark parity + DSL scope.
2. Close `2026-04-20` checklist.
3. Close `2026-04-19` checklists.
4. Add retrospective closure note for `2026-04-18`.
