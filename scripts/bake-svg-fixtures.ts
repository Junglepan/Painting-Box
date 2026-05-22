/**
 * Bakes the SVG output of every registered template into
 * `src-tauri/tests/fixtures/svg/<kind>.svg`.
 *
 * Run via `bun run bake-svg-fixtures`. The Rust visual_regression test
 * reads these fixtures, renders each via resvg, and asserts the PNG hash
 * matches a checked-in baseline (`tests/fixtures/expected/<kind>.png.sha256`).
 *
 * Re-run whenever the TS SVG generators change; commit the regenerated
 * .svg files alongside the code change.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildWatermarkSvgTemplate, SVG_TEMPLATE_KINDS } from "../src/lib/watermark/svg/templates";
import { getTemplateDefaults } from "../src/stores/template-store";
import type { ExifData } from "@/stores/types";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "..", "src-tauri", "tests", "fixtures", "svg");

const STABLE_EXIF: ExifData = {
  camera: { make: "FUJIFILM", model: "X-T5" },
  lens: "XF 35mmF1.4 R",
  focalLength: 35,
  aperture: 1.8,
  shutterSpeed: "1/250 s",
  iso: 200,
  takenAt: "2026-04-28T18:42:11",
};

const PHOTO = { width: 4032, height: 3024, exif: STABLE_EXIF } as const;

// Use a fixed 900px canvas so fixture renders stay small (~30-50KB PNG each)
// and tests run fast. Real-user photos drive a larger canvasBaseWidth at
// runtime, but the rendering code path is the same.
const CANVAS_BASE_WIDTH = 900;

mkdirSync(FIXTURES_DIR, { recursive: true });

let written = 0;
for (const kind of SVG_TEMPLATE_KINDS) {
  const { frameParams, config } = getTemplateDefaults(kind);
  const svg = buildWatermarkSvgTemplate(
    PHOTO,
    kind,
    frameParams,
    config,
    undefined,
    CANVAS_BASE_WIDTH,
  );
  if (!svg) {
    console.warn(`skip ${kind}: builder returned undefined`);
    continue;
  }
  writeFileSync(join(FIXTURES_DIR, `${kind}.svg`), svg, "utf-8");
  written += 1;
}

console.log(`baked ${written} SVG fixtures into ${FIXTURES_DIR}`);
