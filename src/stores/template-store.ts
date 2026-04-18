import { create } from "zustand";
import type { FrameParams, TemplateConfig, TemplateKind } from "./types";

type TemplateState = {
  currentKind: TemplateKind;
  config: TemplateConfig;
  frameParams: FrameParams;
  fieldOverrides: Record<string, string>;
  setKind: (kind: TemplateKind) => void;
  setConfig: (partial: Partial<TemplateConfig>) => void;
  setFrameParams: (partial: Partial<FrameParams>) => void;
  setFieldOverride: (field: string, value: string) => void;
};

const defaultConfig: TemplateConfig = {
  showLogo: true,
  showCamera: true,
  showLens: true,
  showParams: true,
  showDateTime: true,
  showGps: false,
};

const defaultFrameParams: FrameParams = {
  paddingTop: 40,
  paddingRight: 40,
  paddingBottom: 120,
  paddingLeft: 40,
  radius: 12,
  background: "white",
  shadow: true,
  fontSize: 14,
};

export const useTemplateStore = create<TemplateState>((set) => ({
  currentKind: "classic-bottom",
  config: defaultConfig,
  frameParams: defaultFrameParams,
  fieldOverrides: {},
  setKind: (kind) => set({ currentKind: kind }),
  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),
  setFrameParams: (partial) =>
    set((s) => ({ frameParams: { ...s.frameParams, ...partial } })),
  setFieldOverride: (field, value) =>
    set((s) => ({ fieldOverrides: { ...s.fieldOverrides, [field]: value } })),
}));
