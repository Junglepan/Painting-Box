import { describe, expect, test } from "bun:test";

import {
  buildPreviewLines,
  buildRenderableLines,
  computeWatermarkBlockTop,
  getPreviewFontFamily,
  resolveReadableTextAndDivider,
  shouldLiftLogoOnlyWatermark,
} from "./classic-bottom";
import { EMPTY_EXIF } from "@/stores/types";
import { getTemplateLayout } from "./template-layout";

describe("classic bottom preview lines", () => {
  test("excludes time and gps from watermark lines", () => {
    const exif = {
      ...EMPTY_EXIF,
      camera: { make: "NIKON CORPORATION", model: "NIKON Z 7_2" },
      lens: "NIKKOR Z 70-200mm f/2.8 VR S",
      focalLength: 200,
      aperture: 2.8,
      shutterSpeed: "1/1250 s",
      iso: 100,
      takenAt: "2026-04-11 17:51:42",
      gps: { lat: 40.1234, lng: 116.5678 },
    };

    expect(
      buildPreviewLines(exif, {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
      }),
    ).toEqual(["Z 7II", "NIKKOR Z 70-200mm f/2.8 VR S", "200mm f/2.8 1/1250 s ISO100"]);
  });

  test("uses internal watermark template DSL when provided", () => {
    const exif = {
      ...EMPTY_EXIF,
      camera: { make: "NIKON CORPORATION", model: "NIKON Z 7_2" },
      lens: "NIKKOR Z 24-70mm f/2.8 S",
      focalLength: 70,
      aperture: 2.8,
      shutterSpeed: "1/160 s",
      iso: 64,
    };

    expect(
      buildPreviewLines(exif, {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        watermarkTemplate: ["{Model}", "{LensModel}", "{FocalLength}mm f/{FNumber} {ExposureTime} ISO{ISO}"],
      }),
    ).toEqual(["Z 7II", "NIKKOR Z 24-70mm f/2.8 S", "70mm f/2.8 1/160 s ISO64"]);
  });

  test("uses PingFang SC as the default preview font family", () => {
    expect(getPreviewFontFamily("pingfang-sc")).toContain("PingFang SC");
    expect(getPreviewFontFamily("arial")).toContain("Arial");
  });

  test("keeps logo-only watermark renderable even when every text field is hidden", () => {
    expect(buildRenderableLines([], true)).toEqual([""]);
    expect(buildRenderableLines([], false)).toEqual([]);
  });

  test("keeps the watermark block centered between image bottom and canvas bottom", () => {
    const centered = computeWatermarkBlockTop({
      barTop: 300,
      contentHeight: 600,
      imageBottom: 420,
      totalTextHeight: 40,
    });
    expect(centered).toBe(490);
  });

  test("renders minimal-corner in the bottom watermark area instead of overlaying the photo", () => {
    expect(getTemplateLayout("minimal-corner")).toEqual({
      mode: "bottom-bar",
      placement: "corner-bottom-right",
    });
  });

  test("moves classic-white logo-only watermark upward by one line", () => {
    expect(shouldLiftLogoOnlyWatermark("classic-white", true)).toBe(true);
    expect(shouldLiftLogoOnlyWatermark("classic-bottom", true)).toBe(false);

    const regularTop = computeWatermarkBlockTop({
      barTop: 300,
      contentHeight: 600,
      imageBottom: 420,
      totalTextHeight: 20,
    });
    const liftedTop = computeWatermarkBlockTop({
      barTop: 300,
      contentHeight: 600,
      imageBottom: 420,
      totalTextHeight: 20,
      offsetY: -20,
    });

    expect(liftedTop).toBe(regularTop - 20);
  });

  test("moves minimal-corner logo-only watermark upward by one line", () => {
    expect(shouldLiftLogoOnlyWatermark("minimal-corner", true)).toBe(true);
  });

  test("auto readability picks dark text on light background", () => {
    expect(
      resolveReadableTextAndDivider({
        autoTextContrast: true,
        averageLuminance: 230,
        fallbackTextColor: "#ffffff",
        fallbackDividerColor: "#d7dce6",
      }),
    ).toEqual({
      textColor: "#111827",
      dividerColor: "#9ca3af",
    });
  });

  test("auto readability picks light text on dark background", () => {
    expect(
      resolveReadableTextAndDivider({
        autoTextContrast: true,
        averageLuminance: 20,
        fallbackTextColor: "#1f2937",
        fallbackDividerColor: "#4b5563",
      }),
    ).toEqual({
      textColor: "#f9fafb",
      dividerColor: "#d1d5db",
    });
  });
});
