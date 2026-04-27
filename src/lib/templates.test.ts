import { describe, expect, test } from "bun:test";

import { TEMPLATE_LIBRARY } from "./templates";

describe("template library", () => {
  test("exposes classic-bottom, polaroid, and minimal-corner", () => {
    expect(TEMPLATE_LIBRARY.map((template) => template.kind)).toEqual([
      "classic-bottom",
      "polaroid",
      "minimal-corner",
    ]);
  });
});
