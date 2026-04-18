import { create } from "zustand";
import type { TemplateConfig, TemplateKind } from "./types";

type TemplateState = {
  currentKind: TemplateKind;
  config: TemplateConfig;
  fieldOverrides: Record<string, string>;
  setKind: (kind: TemplateKind) => void;
  setConfig: (partial: Partial<TemplateConfig>) => void;
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

export const useTemplateStore = create<TemplateState>((set) => ({
  currentKind: "classic-bottom",
  config: defaultConfig,
  fieldOverrides: {},
  setKind: (kind) => set({ currentKind: kind }),
  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),
  setFieldOverride: (field, value) =>
    set((s) => ({ fieldOverrides: { ...s.fieldOverrides, [field]: value } })),
}));
