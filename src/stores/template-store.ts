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
  resetFrameParams: () => void;
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
  paddingLocked: false,
  outerRadius: 12,
  innerRadius: 6,
  infoBarHeight: 120,

  background: "white",
  bgColor: "#ffffff",
  blurRadius: 40,

  shadow: true,
  shadowBlur: 28,
  shadowOffsetY: 12,
  shadowOpacity: 18,

  photoScale: 100,
  photoBorder: 0,

  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0,
  lineHeight: 1.3,
  textColor: "#1f2937",
  textAlign: "center",

  logoSize: 32,
  logoColor: "original",
  logoGap: 12,

  dividerShow: false,
  dividerColor: "#d7dce6",

  infoPosition: "bottom",
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
    set((s) => {
      if (
        s.frameParams.paddingLocked &&
        (partial.paddingTop !== undefined ||
          partial.paddingRight !== undefined ||
          partial.paddingBottom !== undefined ||
          partial.paddingLeft !== undefined)
      ) {
        const v =
          partial.paddingTop ??
          partial.paddingRight ??
          partial.paddingBottom ??
          partial.paddingLeft ??
          0;
        return {
          frameParams: {
            ...s.frameParams,
            paddingTop: v,
            paddingRight: v,
            paddingBottom: v,
            paddingLeft: v,
            ...partial,
          },
        };
      }
      return { frameParams: { ...s.frameParams, ...partial } };
    }),
  resetFrameParams: () => set({ frameParams: defaultFrameParams }),
  setFieldOverride: (field, value) =>
    set((s) => ({ fieldOverrides: { ...s.fieldOverrides, [field]: value } })),
}));
