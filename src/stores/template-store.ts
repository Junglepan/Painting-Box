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
  setKind: (kind: TemplateKind) => void;
  setConfig: (partial: Partial<TemplateConfig>) => void;
  setFrameParams: (partial: Partial<FrameParams>) => void;
  applyPreset: (preset: Pick<Preset, "kind" | "frameParams" | "config">) => void;
  resetFrameParams: () => void;
};

const defaultConfig: TemplateConfig = {
  showWatermark: true,
  showLogo: true,
  showCamera: true,
  showLens: false,
  showParams: true,
  showDate: false,
  dateFormat: "YYYY-MM-DD",
  customLines: [],
};

const defaultFrameParams: FrameParams = {
  paddingTop: 4,
  paddingRight: 7,
  paddingBottom: 3,
  paddingLeft: 7,
  paddingLocked: false,
  outerRadius: 0,
  innerRadius: 0,
  infoBarHeight: 72,
  mainImageWidthRatio: 85,
  minTopBottomMargin: 2.4,
  textMargin: 0,
  watermarkTopPadding: 12,
  watermarkBottomPadding: 64,

  background: "white",
  bgColor: "#ffffff",
  blurRadius: 40,

  shadow: false,
  shadowBlur: 20,
  shadowOffsetY: 0.06,
  shadowOpacity: 100,

  photoScale: 100,
  photoBorder: 0,
  photoBorderStyle: "solid",
  photoBorderColor: "#ffffff",

  fontFamily: "inter",
  fontSize: 10,
  textColor: "#1f2937",
  autoTextContrast: true,

  logoSize: 15,
  logoKey: "",
  logoVariant: "original",
  logoColor: "original",
  logoGap: 10,

  dividerShow: false,
  dividerColor: "#d7dce6",

  canvasRatio: "3:2" as CanvasRatio,
  canvasOrientation: "landscape" as CanvasOrientation,
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
      mainImageWidthRatio: 85,
      minTopBottomMargin: 2,
      fontSize: 9,
      logoSize: 12,
      logoGap: 10,
      shadow: false,
    },
    {
      showLogo: false,
      showCamera: true,
      showLens: false,
      showParams: false,
    },
  ),
  magazine: createTemplateBase(
    {
      background: "white",
      bgColor: "#ffffff",
      textColor: "#1f2937",
      dividerShow: false,
      innerRadius: 0,
      outerRadius: 0,
      photoBorder: 0,
      infoBarHeight: 80,
      mainImageWidthRatio: 85,
      minTopBottomMargin: 2,
      fontSize: 11,
      logoSize: 14,
      logoGap: 8,
      shadow: true,
      shadowBlur: 18,
      shadowOffsetY: 2,
      shadowOpacity: 14,
    },
    {
      showLogo: true,
      showCamera: true,
      showLens: true,
      showParams: true,
    },
  ),
  "minimal-corner": createTemplateBase(
    {
      background: "white",
      bgColor: "#ffffff",
      textColor: "#ffffff",
      dividerShow: false,
      innerRadius: 0,
      outerRadius: 0,
      mainImageWidthRatio: 85,
      minTopBottomMargin: 1.4,
      infoBarHeight: 0,
      fontSize: 9,
      logoSize: 12,
      logoGap: 10,
      shadow: false,
    },
    {
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    },
  ),
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
          const base = getTemplateBase(s.currentKind);
          return { config: base.config, frameParams: base.frameParams };
        }),
    }),
    {
      name: "painting-box-template-config",
      version: 5,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>;
        if (version < 3 && s.currentKind === "classic-white") {
          s.currentKind = "classic-bottom";
        }
        if (version < 5) {
          const cfg = (s.config ?? {}) as Record<string, unknown>;
          if (cfg.showDate === undefined) cfg.showDate = false;
          if (cfg.dateFormat === undefined) cfg.dateFormat = "YYYY-MM-DD";
          if (!Array.isArray(cfg.customLines)) cfg.customLines = [];
          s.config = cfg;
          const fp = (s.frameParams ?? {}) as Record<string, unknown>;
          if (fp.photoBorderStyle === undefined) fp.photoBorderStyle = "solid";
          if (fp.photoBorderColor === undefined) fp.photoBorderColor = "#ffffff";
          s.frameParams = fp;
        }
        return s;
      },
      merge: (persisted, current) => {
        const next = persisted as Partial<TemplateState> | undefined;
        const base = current as TemplateState;
        const kind = next?.currentKind ?? base.currentKind;
        return {
          ...base,
          ...next,
          config: applyTemplateConfigConstraints(
            kind,
            { ...base.config, ...(next?.config ?? {}) },
          ),
          frameParams: applyTemplateFrameConstraints({
            ...base.frameParams,
            ...(next?.frameParams ?? {}),
          }),
        };
      },
      partialize: (state) => ({
        currentKind: state.currentKind,
        config: state.config,
        frameParams: state.frameParams,
      }),
    },
  ),
);
