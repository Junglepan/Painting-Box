import { describe, expect, test } from "bun:test";

import {
  buildPreviewRenderPlan,
  buildPreviewLines,
  buildRenderableLines,
  computeWatermarkBlockTop,
  getPreviewFontFamily,
  resolvePreviewGeometryMetrics,
  resolveReadableTextAndDivider,
  shouldLiftLogoOnlyWatermark,
} from "./classic-bottom";
import { EMPTY_EXIF } from "@/stores/types";
import { getTemplateLayout } from "./template-layout";
import { WATERMARK_LAYOUT_SPEC } from "./layout-spec";
import { useTemplateStore } from "@/stores/template-store";
import parityFixtures from "@/shared/render-plan-parity-fixtures.json";

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

  test("keeps preview geometry metrics width-invariant and aligned to shared spec", () => {
    const frameParams = useTemplateStore.getState().frameParams;
    const metrics = resolvePreviewGeometryMetrics(frameParams);

    expect(metrics.infoBarHeight).toBe(frameParams.infoBarHeight);
    expect(metrics.innerRadius).toBe(frameParams.innerRadius);
    expect(metrics.photoBorder).toBe(frameParams.photoBorder);
    expect(metrics.logoGap).toBe(frameParams.logoGap);
    expect(metrics.horizontalMargin).toBe(WATERMARK_LAYOUT_SPEC.dividerHorizontalMarginPx);
    expect(metrics.cornerPadding).toBe(WATERMARK_LAYOUT_SPEC.cornerPaddingPx);
  });

  test("matches shared multi-template parity fixtures", () => {
    const baseline = useTemplateStore.getState().frameParams;
    const scenarios = [
      parityFixtures.classicBottomDefault4032x3024TwoLines,
      parityFixtures.classicWhiteDefault4032x3024LogoOnly,
      parityFixtures.minimalCornerDefault4032x3024LogoOnly,
      parityFixtures.classicBottomDefault4032x3024LogoOnly,
      parityFixtures.polaroidDefault4032x3024TwoLines,
    ];

    for (const fixture of scenarios) {
      const frameParams = fixture.templateKind === "minimal-corner"
        ? {
            ...baseline,
            infoBarHeight: 0,
            mainImageWidthRatio: 94,
            minTopBottomMargin: 1.4,
            fontSize: 9,
            innerRadius: 12,
            photoBorder: 0,
            logoGap: 10,
            canvasRatio: "auto" as const,
          }
        : fixture.templateKind === "polaroid"
          ? {
              ...baseline,
              infoBarHeight: 148,
              mainImageWidthRatio: 82,
              minTopBottomMargin: 2,
              fontSize: 9,
              innerRadius: 0,
              photoBorder: 10,
              logoGap: 10,
              canvasRatio: "auto" as const,
            }
          : {
              ...baseline,
              infoBarHeight: 72,
              mainImageWidthRatio: 85,
              minTopBottomMargin: 2.4,
              fontSize: 10,
              innerRadius: 16,
              photoBorder: 0,
              logoGap: 10,
              canvasRatio: "auto" as const,
            };
      const totalTextHeight = fixture.scenario === "logo-only" ? 71.68 : 165.92;
      const plan = buildPreviewRenderPlan({
        photoWidth: fixture.sourceW,
        photoHeight: fixture.sourceH,
        frameParams,
        templateKind: fixture.templateKind,
        totalTextHeight,
        logoOnlyWatermark: fixture.scenario === "logo-only",
        baseWidth: fixture.sourceW,
      });

      expect(Math.round(plan.canvasW)).toBe(fixture.expected.canvasW);
      expect(Math.round(plan.canvasH)).toBe(fixture.expected.canvasH);
      expect(Math.round(plan.topBottomMargin)).toBe(fixture.expected.topMargin);
      expect(Math.round(plan.barTop)).toBe(fixture.expected.barTop);
      expect(Math.round(plan.photoW)).toBe(fixture.expected.photoW);
      expect(Math.round(plan.photoH)).toBe(fixture.expected.photoH);
      expect(Math.round(plan.imageX)).toBe(fixture.expected.imageLeft);
      expect(Math.round(plan.imageY)).toBe(fixture.expected.imageTop);
      expect(Math.round(plan.blockTop)).toBe(fixture.expected.blockTop);
    }
  });
});
