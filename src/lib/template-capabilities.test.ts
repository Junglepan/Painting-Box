import { describe, expect, test } from "bun:test";

import {
  applyTemplateFrameConstraints,
  applyTemplateConfigConstraints,
  getTemplateDisplayFields,
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

  test("clamps main image ratio into the configurable range", () => {
    const frameParams = useTemplateStore.getState().frameParams;

    expect(
      applyTemplateFrameConstraints({
        ...frameParams,
        mainImageWidthRatio: 120,
      }).mainImageWidthRatio,
    ).toBe(95);

    expect(
      applyTemplateFrameConstraints({
        ...frameParams,
        mainImageWidthRatio: 20,
      }).mainImageWidthRatio,
    ).toBe(70);
  });
});
