import { describe, expect, test } from "bun:test";

import { TEMPLATE_LIBRARY } from "./templates";

describe("template library", () => {
  test("exposes the full set of templates", () => {
    expect(TEMPLATE_LIBRARY.map((template) => template.kind)).toEqual([
      "classic-bottom",
      "magazine",
      "minimal-corner",
      "cinematic",
      "film-strip",
      "xiaomi-leica",
      "photo-album",
      "crop-marks",
      "fujifilm-classic",
      "hasselblad",
      "darkroom-proof",
      "contact-sheet",
    ]);
  });
});
