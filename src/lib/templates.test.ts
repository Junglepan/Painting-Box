import { describe, expect, test } from "bun:test";

import { TEMPLATE_LIBRARY } from "./templates";

describe("template library", () => {
  test("exposes the full set of templates", () => {
    expect(TEMPLATE_LIBRARY.map((template) => template.kind)).toEqual([
      "classic-bottom",
      "polaroid",
      "magazine",
      "minimal-corner",
      "minimal-fullbleed",
      "cinematic",
      "film-strip",
      "xiaomi-leica",
      "photo-album",
      "date-stamp",
      "swiss-grid",
      "crop-marks",
      "fujifilm-classic",
      "hasselblad",
      "darkroom-proof",
      "kodak-slide",
      "contact-sheet",
    ]);
  });
});
