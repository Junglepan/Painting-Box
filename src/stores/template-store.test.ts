import { describe, expect, test } from "bun:test";

import { usePresetStore } from "./preset-store";
import { useTemplateStore } from "./template-store";
import type { TemplateKind } from "./types";

describe("template defaults", () => {
  test("template defaults stay inside configurable main image ratio range", () => {
    const kinds: TemplateKind[] = ["classic-bottom", "minimal-corner"];
    for (const kind of kinds) {
      useTemplateStore.getState().setKind(kind);
      const ratio = useTemplateStore.getState().frameParams.mainImageWidthRatio;
      expect(ratio).toBeGreaterThanOrEqual(70);
      expect(ratio).toBeLessThanOrEqual(95);
    }
    useTemplateStore.getState().setKind("classic-bottom");
  });

  test("minimal-corner defaults to logo only", () => {
    useTemplateStore.getState().setKind("minimal-corner");

    expect(useTemplateStore.getState().config).toEqual({
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    });

    useTemplateStore.getState().setKind("classic-bottom");
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
