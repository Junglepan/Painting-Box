import { create } from "zustand";
import type { CanvasRatio, FrameParams, TemplateConfig, TemplateKind } from "./types";

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
  showLogo: false,
  showCamera: true,
  showLens: false,
  showParams: true,
  showDateTime: false,
  showGps: false,
};

const defaultFrameParams: FrameParams = {
  paddingTop: 4,
  paddingRight: 7,
  paddingBottom: 3,
  paddingLeft: 7,
  paddingLocked: false,
  outerRadius: 12,
  innerRadius: 16,
  infoBarHeight: 86,
  mainImageWidthRatio: 90,
  minTopBottomMargin: 2,
  textMargin: 0.4,

  background: "white",
  bgColor: "#ffffff",
  blurRadius: 40,

  shadow: true,
  shadowBlur: 24,
  shadowOffsetY: 10,
  shadowOpacity: 20,

  photoScale: 100,
  photoBorder: 0,

  fontSize: 22,
  fontWeight: 600,
  letterSpacing: 0,
  lineHeight: 1.3,
  textColor: "#1f2937",
  textAlign: "center",

  logoSize: 28,
  logoColor: "original",
  logoGap: 12,

  dividerShow: false,
  dividerColor: "#d7dce6",

  canvasRatio: "auto" as CanvasRatio,

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
