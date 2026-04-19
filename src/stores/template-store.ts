import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  showLogo: true,
  showCamera: true,
  showLens: false,
  showParams: true,
};

const defaultFrameParams: FrameParams = {
  paddingTop: 4,
  paddingRight: 7,
  paddingBottom: 3,
  paddingLeft: 7,
  paddingLocked: false,
  outerRadius: 0,
  innerRadius: 16,
  infoBarHeight: 72,
  mainImageWidthRatio: 85,
  minTopBottomMargin: 2.4,
  textMargin: 0,
  watermarkTopPadding: 2,
  watermarkBottomPadding: 8,

  background: "white",
  bgColor: "#ffffff",
  blurRadius: 40,

  shadow: true,
  shadowBlur: 20,
  shadowOffsetY: 0.06,
  shadowOpacity: 100,

  photoScale: 100,
  photoBorder: 0,

  fontFamily: "pingfang-sc",
  fontSize: 20,
  textColor: "#1f2937",

  logoSize: 20,
  logoKey: "",
  logoVariant: "original",
  logoColor: "original",
  logoGap: 40,

  dividerShow: false,
  dividerColor: "#d7dce6",

  canvasRatio: "auto" as CanvasRatio,

  infoPosition: "bottom",
};

type TemplateBaseState = {
  config: TemplateConfig;
  frameParams: FrameParams;
};

function createTemplateBase(
  frameOverrides: Partial<FrameParams> = {},
  configOverrides: Partial<TemplateConfig> = {},
): TemplateBaseState {
  return {
    config: { ...defaultConfig, ...configOverrides },
    frameParams: { ...defaultFrameParams, ...frameOverrides },
  };
}

const TEMPLATE_BASES: Record<TemplateKind, TemplateBaseState> = {
  "classic-bottom": createTemplateBase(),
  polaroid: createTemplateBase(),
  "minimal-corner": createTemplateBase(),
  magazine: createTemplateBase(),
  "film-strip": createTemplateBase(),
  "full-frame": createTemplateBase(),
  leica: createTemplateBase(),
  poster: createTemplateBase(),
  "square-social": createTemplateBase(),
  xpan: createTemplateBase(),
  "minimal-blank": createTemplateBase(),
  custom: createTemplateBase(),
};

function getTemplateBase(kind: TemplateKind): TemplateBaseState {
  const base = TEMPLATE_BASES[kind];
  return {
    config: { ...base.config },
    frameParams: { ...base.frameParams },
  };
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      currentKind: "classic-bottom",
      config: getTemplateBase("classic-bottom").config,
      frameParams: getTemplateBase("classic-bottom").frameParams,
      fieldOverrides: {},
      setKind: (kind) => {
        const base = getTemplateBase(kind);
        set({
          currentKind: kind,
          config: base.config,
          frameParams: base.frameParams,
        });
      },
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
      resetFrameParams: () =>
        set((s) => ({ frameParams: getTemplateBase(s.currentKind).frameParams })),
      setFieldOverride: (field, value) =>
        set((s) => ({ fieldOverrides: { ...s.fieldOverrides, [field]: value } })),
    }),
    {
      name: "painting-box-template-config",
      version: 2,
      merge: (persisted, current) => {
        const next = persisted as Partial<TemplateState> | undefined;
        const base = current as TemplateState;
        return {
          ...base,
          ...next,
          config: { ...base.config, ...(next?.config ?? {}) },
          frameParams: { ...base.frameParams, ...(next?.frameParams ?? {}) },
          fieldOverrides: { ...base.fieldOverrides, ...(next?.fieldOverrides ?? {}) },
        };
      },
      partialize: (state) => ({
        currentKind: state.currentKind,
        config: state.config,
        frameParams: state.frameParams,
        fieldOverrides: state.fieldOverrides,
      }),
    },
  ),
);
