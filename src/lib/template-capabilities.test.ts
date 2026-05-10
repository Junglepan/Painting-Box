import { describe, expect, test } from "bun:test";

import {
  applyTemplateFrameConstraints,
  applyTemplateConfigConstraints,
  getTemplateFrameCapabilities,
  getTemplateDisplayFields,
  isTemplateDisplayFieldFixed,
} from "./template-capabilities";
import { useTemplateStore } from "@/stores/template-store";

describe("template capabilities", () => {
  test("minimal-corner only allows logo display", () => {
    expect(getTemplateDisplayFields("minimal-corner")).toEqual(["showLogo"]);
    expect(
      applyTemplateConfigConstraints("minimal-corner", {
        showLogo: false,
        showCamera: true,
        showLens: true,
        showParams: true,
      }),
    ).toEqual({
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    });
  });

  test("classic-bottom keeps all display fields configurable", () => {
    expect(
      applyTemplateConfigConstraints("classic-bottom", {
        showLogo: false,
        showCamera: true,
        showLens: true,
        showParams: false,
        watermarkTemplate: ["{Model}", "{Params}"],
      }),
    ).toEqual({
      showLogo: false,
      showCamera: true,
      showLens: true,
      showParams: false,
      watermarkTemplate: ["{Model}", "{Params}"],
    });
  });

  test("magazine only allows logo camera and params display", () => {
    expect(getTemplateDisplayFields("magazine")).toEqual(["showLogo", "showCamera", "showParams"]);
    expect(
      applyTemplateConfigConstraints("magazine", {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      }),
    ).toEqual({
      showLogo: true,
      showCamera: true,
      showLens: false,
      showParams: true,
      showDate: false,
    });
  });

  test("film-strip disables logo and lens display configuration", () => {
    expect(getTemplateDisplayFields("film-strip")).toEqual(["showCamera", "showParams", "showDate"]);
    expect(isTemplateDisplayFieldFixed("film-strip", "showLogo")).toBe(true);
    expect(isTemplateDisplayFieldFixed("film-strip", "showLens")).toBe(true);
    expect(isTemplateDisplayFieldFixed("film-strip", "showCamera")).toBe(false);
    expect(
      applyTemplateConfigConstraints("film-strip", {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      }),
    ).toEqual({
      showLogo: false,
      showCamera: true,
      showLens: false,
      showParams: true,
      showDate: true,
    });
  });

  test("photo-album disables all watermark display configuration", () => {
    expect(getTemplateDisplayFields("photo-album")).toEqual([]);
    for (const field of ["showLogo", "showCamera", "showLens", "showParams", "showDate"] as const) {
      expect(isTemplateDisplayFieldFixed("photo-album", field)).toBe(true);
    }
    expect(
      applyTemplateConfigConstraints("photo-album", {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      }),
    ).toEqual({
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    });
  });

  test("darkroom-proof disables all watermark display configuration", () => {
    expect(getTemplateDisplayFields("darkroom-proof")).toEqual([]);
    for (const field of ["showLogo", "showCamera", "showLens", "showParams", "showDate"] as const) {
      expect(isTemplateDisplayFieldFixed("darkroom-proof", field)).toBe(true);
    }
    expect(
      applyTemplateConfigConstraints("darkroom-proof", {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      }),
    ).toEqual({
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    });
  });

  test("contact-sheet disables all watermark display configuration", () => {
    expect(getTemplateDisplayFields("contact-sheet")).toEqual([]);
    for (const field of ["showLogo", "showCamera", "showLens", "showParams", "showDate"] as const) {
      expect(isTemplateDisplayFieldFixed("contact-sheet", field)).toBe(true);
    }
    expect(
      applyTemplateConfigConstraints("contact-sheet", {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      }),
    ).toEqual({
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    });
  });


  test("clamps main image ratio into the configurable range", () => {
    const frameParams = useTemplateStore.getState().frameParams;

    expect(
      applyTemplateFrameConstraints("classic-bottom", {
        ...frameParams,
        mainImageWidthRatio: 120,
      }).mainImageWidthRatio,
    ).toBe(100);

    expect(
      applyTemplateFrameConstraints("classic-bottom", {
        ...frameParams,
        mainImageWidthRatio: 20,
      }).mainImageWidthRatio,
    ).toBe(80);
  });

  test("declares bounded frame controls per template", () => {
    expect(getTemplateFrameCapabilities("classic-bottom").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("classic-bottom").controls.shadow).toBe(true);
    expect(getTemplateFrameCapabilities("classic-bottom").controls.shadowBlur).toEqual({
      min: 0,
      max: 48,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("crop-marks").controls.infoBarHeight).toBeUndefined();
    expect(getTemplateFrameCapabilities("crop-marks").controls.shadow).toBeUndefined();
    expect(getTemplateFrameCapabilities("film-strip").controls.fontSize).toEqual({
      min: 3,
      max: 50,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("film-strip").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("photo-album").controls.photoBorder).toEqual({
      min: 2,
      max: 12,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("photo-album").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("magazine").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("fujifilm-classic").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("fujifilm-classic").controls.minTopBottomMargin).toEqual({
      min: 0,
      max: 6,
      step: 0.1,
    });
    expect(getTemplateFrameCapabilities("fujifilm-classic").controls.infoBarHeight).toEqual({
      min: 64,
      max: 132,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("hasselblad").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("hasselblad").controls.minTopBottomMargin).toEqual({
      min: 0,
      max: 6,
      step: 0.1,
    });
    expect(getTemplateFrameCapabilities("hasselblad").controls.infoBarHeight).toEqual({
      min: 64,
      max: 132,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("darkroom-proof").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("darkroom-proof").controls.minTopBottomMargin).toEqual({
      min: 1,
      max: 5,
      step: 0.1,
    });
    expect(getTemplateFrameCapabilities("darkroom-proof").controls.infoBarHeight).toEqual({
      min: 56,
      max: 112,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("contact-sheet").controls.mainImageWidthRatio).toEqual({
      min: 80,
      max: 100,
      step: 1,
    });
    expect(getTemplateFrameCapabilities("contact-sheet").controls.infoBarHeight).toEqual({
      min: 56,
      max: 100,
      step: 1,
    });
  });

  test("clamps values using each template capability range", () => {
    const frameParams = useTemplateStore.getState().frameParams;

    const film = applyTemplateFrameConstraints("film-strip", {
      ...frameParams,
      mainImageWidthRatio: 99,
      fontSize: 30,
      infoBarHeight: 10,
    });
    expect(film.mainImageWidthRatio).toBe(99);
    expect(film.fontSize).toBe(30);
    expect(film.infoBarHeight).toBe(76);

    const album = applyTemplateFrameConstraints("photo-album", {
      ...frameParams,
      mainImageWidthRatio: 68,
      photoBorder: 0,
      infoBarHeight: 200,
    });
    expect(album.mainImageWidthRatio).toBe(80);
    expect(album.photoBorder).toBe(2);
    expect(album.infoBarHeight).toBe(80);

    const classic = applyTemplateFrameConstraints("classic-bottom", {
      ...frameParams,
      shadowBlur: 200,
      shadowOffsetY: 20,
      shadowOpacity: 90,
    });
    expect(classic.shadowBlur).toBe(48);
    expect(classic.shadowOffsetY).toBe(8);
    expect(classic.shadowOpacity).toBe(80);
  });
});
