import { describe, expect, test } from "bun:test";

import {
  getCameraLogoAsset,
  getCameraLogoAssetByKey,
  getCameraLogoKey,
  getLogoVariants,
  getResolvedLogoKey,
  resolveLogoSelection,
} from "./logo";

describe("camera logo mapping", () => {
  test("maps core brands to stable logo keys", () => {
    expect(getCameraLogoKey("NIKON CORPORATION")).toBe("nikon");
    expect(getCameraLogoKey("Panasonic")).toBe("panasonic");
    expect(getCameraLogoKey("SONY")).toBe("sony");
  });

  test("returns mapped assets for canonical brands", () => {
    expect(getCameraLogoAsset("NIKON CORPORATION", "white")).toBe("/brand-logos/nikon-white.svg");
    expect(getCameraLogoAsset("Panasonic", "black")).toBe("/brand-logos/lumix-black.svg");
    expect(getCameraLogoAsset("SONY", "original")).toBe("/brand-logos/sony-black.svg");
  });

  test("falls back to available variants", () => {
    expect(getCameraLogoAsset("Ricoh", "white")).toBe("/brand-logos/ricoh-original.svg");
  });

  test("supports full catalog lookup with normalized english and chinese keys", () => {
    expect(getCameraLogoAssetByKey("apple", "white")).toBe("/brand-logos/apple-white.svg");
    expect(getCameraLogoAssetByKey("老蛙", "white")).toBe("/brand-logos/老蛙-white.svg");
    expect(getCameraLogoAssetByKey("sigma", "icon-black")).toBe("/brand-logos/sigma-icon-black.svg");
  });

  test("lists variants available for a key", () => {
    expect(getLogoVariants("nikon")).toEqual(["black", "icon-original", "original", "white"]);
    expect(getLogoVariants("老蛙")).toEqual(["black", "original", "white"]);
  });

  test("resolves effective logo key from auto mode using photo brand", () => {
    expect(getResolvedLogoKey("", "NIKON CORPORATION")).toBe("nikon");
    expect(getResolvedLogoKey("canon", "NIKON CORPORATION")).toBe("canon");
  });

  test("prefers explicit key and variant but can fall back to EXIF make", () => {
    expect(resolveLogoSelection("canon", "white", "NIKON CORPORATION")).toEqual({
      key: "canon",
      variant: "white",
      asset: "/brand-logos/canon-white.svg",
    });
    expect(resolveLogoSelection("", "white", "NIKON CORPORATION")).toEqual({
      key: "nikon",
      variant: "white",
      asset: "/brand-logos/nikon-white.svg",
    });
  });

  test("auto mode still respects manual variant selection when brand supports it", () => {
    expect(resolveLogoSelection("", "black", "NIKON CORPORATION")).toEqual({
      key: "nikon",
      variant: "black",
      asset: "/brand-logos/nikon-black.svg",
    });
  });

  test("auto mode defaults nikon to black when variant is untouched", () => {
    expect(resolveLogoSelection("", "original", "NIKON CORPORATION")).toEqual({
      key: "nikon",
      variant: "black",
      asset: "/brand-logos/nikon-black.svg",
    });
  });

  test("returns null for unmapped brands", () => {
    expect(getCameraLogoAsset("Olympus", "white")).toBeNull();
    expect(getCameraLogoAssetByKey("not-exists", "white")).toBeNull();
  });
});
