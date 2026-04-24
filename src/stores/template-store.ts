import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyTemplateConfigConstraints,
  applyTemplateFrameConstraints,
} from "@/lib/template-capabilities";
import { usePresetStore } from "./preset-store";
import type { CanvasOrientation, CanvasRatio, FrameParams, Preset, TemplateConfig, TemplateKind } from "./types";

type TemplateState = {
  currentKind: TemplateKind;
  config: TemplateConfig;
  frameParams: FrameParams;
  fieldOverrides: Record<string, string>;
  setKind: (kind: TemplateKind) => void;
  setConfig: (partial: Partial<TemplateConfig>) => void;
  setFrameParams: (partial: Partial<FrameParams>) => void;
  applyPreset: (preset: Pick<Preset, "kind" | "frameParams" | "config">) => void;
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
  watermarkTopPadding: 12,
  watermarkBottomPadding: 64,

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
  fontSize: 10,
  textColor: "#1f2937",
  autoTextContrast: true,

  logoSize: 15,
  logoKey: "",
  logoVariant: "original",
  logoColor: "original",
  logoGap: 60,

  dividerShow: false,
  dividerColor: "#d7dce6",

  canvasRatio: "3:2" as CanvasRatio,
  canvasOrientation: "landscape" as CanvasOrientation,

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
  "classic-white": createTemplateBase(
    {
      background: "white",
      bgColor: "#ffffff",
      textColor: "#111827",
      dividerColor: "#d1d5db",
      shadowOpacity: 72,
    },
    {
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    },
  ),
  polaroid: createTemplateBase(
    {
      background: "white",
      bgColor: "#ffffff",
      textColor: "#1f2937",
      dividerShow: false,
      innerRadius: 0,
      outerRadius: 0,
      photoBorder: 10,
      infoBarHeight: 148,
      mainImageWidthRatio: 82,
      minTopBottomMargin: 2,
      fontSize: 9,
      logoSize: 12,
      logoGap: 18,
      shadow: false,
    },
    {
      showLogo: false,
      showCamera: true,
      showLens: false,
      showParams: false,
    },
  ),
  "minimal-corner": createTemplateBase(
    {
      background: "white",
      bgColor: "#ffffff",
      textColor: "#ffffff",
      dividerShow: false,
      innerRadius: 12,
      outerRadius: 0,
      mainImageWidthRatio: 94,
      minTopBottomMargin: 1.4,
      infoBarHeight: 0,
      fontSize: 9,
      logoSize: 12,
      logoGap: 12,
      shadow: false,
    },
    {
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    },
  ),
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
    config: applyTemplateConfigConstraints(kind, { ...base.config }),
    frameParams: applyTemplateFrameConstraints({ ...base.frameParams }),
  };
}

function clearSelectedPreset() {
  usePresetStore.getState().select(null);
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
        clearSelectedPreset();
        set({
          currentKind: kind,
          config: base.config,
          frameParams: base.frameParams,
        });
      },
      setConfig: (partial) =>
        set((s) => {
          clearSelectedPreset();
          return {
            config: applyTemplateConfigConstraints(s.currentKind, {
              ...s.config,
              ...partial,
            }),
          };
        }),
      setFrameParams: (partial) =>
        set((s) => {
          clearSelectedPreset();
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
              frameParams: applyTemplateFrameConstraints({
                ...s.frameParams,
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
                ...partial,
              }),
            };
          }
          return {
            frameParams: applyTemplateFrameConstraints({
              ...s.frameParams,
              ...partial,
            }),
          };
        }),
      applyPreset: (preset) =>
        set({
          currentKind: preset.kind,
          config: applyTemplateConfigConstraints(preset.kind, {
            ...preset.config,
          }),
          frameParams: applyTemplateFrameConstraints({ ...preset.frameParams }),
        }),
      resetFrameParams: () =>
        set((s) => {
          clearSelectedPreset();
          return { frameParams: getTemplateBase(s.currentKind).frameParams };
        }),
      setFieldOverride: (field, value) =>
        set((s) => {
          clearSelectedPreset();
          return { fieldOverrides: { ...s.fieldOverrides, [field]: value } };
        }),
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
          config: applyTemplateConfigConstraints(
            next?.currentKind ?? base.currentKind,
            { ...base.config, ...(next?.config ?? {}) },
          ),
          frameParams: applyTemplateFrameConstraints({
            ...base.frameParams,
            ...(next?.frameParams ?? {}),
          }),
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
