import { describe, expect, test } from "bun:test";

import { usePresetStore } from "./preset-store";
import { getTemplateDefaults, useTemplateStore } from "./template-store";
import type { TemplateKind } from "./types";
import { TEMPLATE_LIBRARY } from "@/lib/templates";
import { getTemplateFrameCapabilities } from "@/lib/template-capabilities";

describe("template defaults", () => {
  test("template defaults stay inside configurable main image ratio range", () => {
    const kinds = TEMPLATE_LIBRARY.map((template) => template.kind);
    for (const kind of kinds) {
      const defaults = getTemplateDefaults(kind);
      const controls = getTemplateFrameCapabilities(kind).controls;
      for (const [key, control] of Object.entries(controls)) {
        if (control === true) continue;
        const value = defaults.frameParams[key as keyof typeof defaults.frameParams];
        if (typeof value !== "number") continue;
        expect(value, `${kind}.${key} default should be >= min`).toBeGreaterThanOrEqual(control.min);
        expect(value, `${kind}.${key} default should be <= max`).toBeLessThanOrEqual(control.max);
      }
    }
    useTemplateStore.getState().setKind("classic-bottom");
  });

  test("minimal-corner defaults to logo only", () => {
    useTemplateStore.getState().setKind("minimal-corner");
    const defaults = getTemplateDefaults("minimal-corner");

    expect(useTemplateStore.getState().config).toEqual({
      showWatermark: true,
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
      dateFormat: "YYYY-MM-DD",
      customLines: [],
    });
    expect(defaults.frameParams.logoSize).toBe(14);

    useTemplateStore.getState().setKind("classic-bottom");
  });

  test("classic-bottom defaults match the adapted baseline", () => {
    const defaults = getTemplateDefaults("classic-bottom");

    expect(defaults.frameParams.fontFamily).toBe("pingfang-sc");
    expect(defaults.frameParams.logoSize).toBe(20);
    expect(defaults.frameParams.mainImageWidthRatio).toBe(85);
    expect(defaults.frameParams.minTopBottomMargin).toBe(0);
    expect(defaults.frameParams.infoBarHeight).toBe(0);
    expect(defaults.frameParams.innerRadius).toBe(0);
  });

  test("magazine defaults give the photo more space", () => {
    const defaults = getTemplateDefaults("magazine");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(85);
    expect(defaults.frameParams.minTopBottomMargin).toBe(1.5);
    expect(defaults.frameParams.infoBarHeight).toBe(42);
    expect(defaults.config.showLogo).toBe(true);
    expect(defaults.config.showCamera).toBe(true);
    expect(defaults.config.showLens).toBe(false);
    expect(defaults.config.showParams).toBe(true);
    expect(defaults.config.showDate).toBe(false);
  });

  test("cinematic defaults give the photo more space", () => {
    const defaults = getTemplateDefaults("cinematic");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(100);
    expect(defaults.frameParams.infoBarHeight).toBe(84);
  });

  test("film-strip defaults hide logo and lens with a larger photo", () => {
    const defaults = getTemplateDefaults("film-strip");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(90);
    expect(defaults.config.showLogo).toBe(false);
    expect(defaults.config.showLens).toBe(false);
  });

  test("photo-album defaults to a pure photo mount", () => {
    const defaults = getTemplateDefaults("photo-album");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(90);
    expect(defaults.frameParams.minTopBottomMargin).toBe(2);
    expect(defaults.frameParams.infoBarHeight).toBe(0);
    expect(defaults.config.showLogo).toBe(false);
    expect(defaults.config.showCamera).toBe(false);
    expect(defaults.config.showLens).toBe(false);
    expect(defaults.config.showParams).toBe(false);
    expect(defaults.config.showDate).toBe(false);
  });

  test("fujifilm-classic defaults give the photo more space", () => {
    const defaults = getTemplateDefaults("fujifilm-classic");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(90);
    expect(defaults.frameParams.minTopBottomMargin).toBe(0);
    expect(defaults.frameParams.infoBarHeight).toBe(80);
  });

  test("hasselblad defaults give the photo more space", () => {
    const defaults = getTemplateDefaults("hasselblad");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(90);
    expect(defaults.frameParams.minTopBottomMargin).toBe(0);
    expect(defaults.frameParams.infoBarHeight).toBe(80);
  });

  test("darkroom-proof defaults to a fixed proof layout with a larger photo", () => {
    const defaults = getTemplateDefaults("darkroom-proof");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(88);
    expect(defaults.frameParams.minTopBottomMargin).toBe(2);
    expect(defaults.frameParams.infoBarHeight).toBe(80);
    expect(defaults.config.showLogo).toBe(false);
    expect(defaults.config.showCamera).toBe(false);
    expect(defaults.config.showLens).toBe(false);
    expect(defaults.config.showParams).toBe(false);
    expect(defaults.config.showDate).toBe(false);
  });

  test("contact-sheet defaults to a fixed frame layout with a larger photo", () => {
    const defaults = getTemplateDefaults("contact-sheet");

    expect(defaults.frameParams.mainImageWidthRatio).toBe(90);
    expect(defaults.frameParams.minTopBottomMargin).toBe(3);
    expect(defaults.frameParams.infoBarHeight).toBe(72);
    expect(defaults.config.showLogo).toBe(false);
    expect(defaults.config.showCamera).toBe(false);
    expect(defaults.config.showLens).toBe(false);
    expect(defaults.config.showParams).toBe(false);
    expect(defaults.config.showDate).toBe(false);
  });

  test("clears selected preset when template parameters change", () => {
    const presetId = usePresetStore.getState().add({
      name: "固定预设",
      kind: "classic-bottom",
      frameParams: useTemplateStore.getState().frameParams,
      config: useTemplateStore.getState().config,
    });
    usePresetStore.getState().select(presetId);

    useTemplateStore.getState().setFrameParams({ logoSize: 18 });

    expect(usePresetStore.getState().selectedId).toBeNull();
    usePresetStore.getState().remove(presetId);
  });

  test("keeps selected preset when applying a preset atomically", () => {
    const presetId = usePresetStore.getState().add({
      name: "固定预设",
      kind: "classic-bottom",
      frameParams: useTemplateStore.getState().frameParams,
      config: useTemplateStore.getState().config,
    });

    useTemplateStore.getState().applyPreset({
      kind: "classic-bottom",
      frameParams: useTemplateStore.getState().frameParams,
      config: useTemplateStore.getState().config,
    });
    usePresetStore.getState().select(presetId);

    expect(usePresetStore.getState().selectedId).toBe(presetId);
    usePresetStore.getState().remove(presetId);
    useTemplateStore.getState().setKind("classic-bottom");
  });
});
