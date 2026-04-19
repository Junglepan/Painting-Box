import { describe, expect, test } from "bun:test";

import { formatCamera, normalizeMake, normalizeModel } from "./brand";

describe("brand formatting", () => {
  test("strips CORPORATION from make", () => {
    expect(normalizeMake("NIKON CORPORATION")).toBe("Nikon");
  });

  test("formats nikon z bodies with spaced main number and roman iteration", () => {
    expect(normalizeModel("NIKON", "NIKON Z_7")).toBe("Z 7");
    expect(normalizeModel("NIKON CORPORATION", "NIKON Z 7_2")).toBe("Z 7II");
    expect(formatCamera("NIKON CORPORATION", "NIKON Z_7")).toBe("Nikon Z 7");
  });

  test("formats nikon z letter models", () => {
    expect(normalizeModel("NIKON", "NIKON Z_fc")).toBe("Z fc");
    expect(normalizeModel("NIKON", "NIKON Z-F")).toBe("Z f");
  });

  test("formats sony ilce bodies with alpha prefix", () => {
    expect(normalizeModel("SONY", "ILCE-7M4")).toBe("α 7m4");
    expect(formatCamera("SONY", "ILCE-7M4")).toBe("Sony α 7m4");
  });

  test("lowercases default model and removes duplicated make", () => {
    expect(normalizeModel("Canon", "Canon EOS R5")).toBe("eos r5");
    expect(formatCamera("Canon", "Canon EOS R5")).toBe("Canon eos r5");
  });
});
