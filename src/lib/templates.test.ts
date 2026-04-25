import { describe, expect, test } from "bun:test";

import { TEMPLATE_LIBRARY } from "./templates";

describe("template library", () => {
  test("hides polaroid until it is implemented", () => {
    expect(TEMPLATE_LIBRARY.map((template) => template.kind)).toEqual([
      "classic-bottom",
      "polaroid",
      "minimal-corner",
    ]);
  });
});
