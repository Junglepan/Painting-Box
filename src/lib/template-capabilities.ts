import { TEMPLATE_REGISTRY } from "@/lib/watermark/template-registry";
import type { FrameParams, TemplateConfig, TemplateKind } from "@/stores/types";

export type FrameControlKey =
  | "mainImageWidthRatio"
  | "minTopBottomMargin"
  | "infoBarHeight"
  | "innerRadius"
  | "photoBorder"
  | "fontSize"
  | "fontFamily"
  | "textColor"
  | "background"
  | "shadow"
  | "shadowBlur"
  | "shadowOffsetY"
  | "shadowOpacity"
  | "logoSize"
  | "logoGap";

export type NumericFrameControl = {
  min: number;
  max: number;
  step: number;
};

type TemplateFrameCapabilities = {
  controls: Partial<Record<FrameControlKey, NumericFrameControl | true>>;
};

const COMMON_CANVAS_CONTROLS = {
  fontSize: { min: 3, max: 18, step: 1 },
  fontFamily: true,
  textColor: true,
} satisfies TemplateFrameCapabilities["controls"];

const PHOTO_SHADOW_CONTROLS = {
  shadow: true,
  shadowBlur: { min: 0, max: 48, step: 1 },
  shadowOffsetY: { min: 0, max: 8, step: 0.1 },
  shadowOpacity: { min: 0, max: 80, step: 1 },
} satisfies TemplateFrameCapabilities["controls"];

const TEMPLATE_FRAME_CAPABILITIES: Record<TemplateKind, TemplateFrameCapabilities> = {
  "classic-bottom": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 0, max: 7, step: 0.1 },
      innerRadius: { min: 0, max: 28, step: 1 },
      photoBorder: { min: 0, max: 12, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
      ...PHOTO_SHADOW_CONTROLS,
      infoBarHeight: { min: 0, max: 150, step: 1 },
      logoSize: { min: 10, max: 25, step: 1 },
      logoGap: { min: 0, max: 30, step: 1 },
    },
  },
  magazine: {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 1, max: 5, step: 0.1 },
      innerRadius: { min: 0, max: 24, step: 1 },
      photoBorder: { min: 0, max: 10, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
      infoBarHeight: { min: 36, max: 100, step: 1 },
      logoSize: { min: 10, max: 22, step: 1 },
      logoGap: { min: 0, max: 24, step: 1 },
    },
  },
  "minimal-corner": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 1, max: 6, step: 0.1 },
      innerRadius: { min: 0, max: 24, step: 1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
    },
  },
  cinematic: {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      infoBarHeight: { min: 72, max: 112, step: 1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
      logoSize: { min: 10, max: 25, step: 1 },
      logoGap: { min: 0, max: 30, step: 1 },
    },
  },
  "film-strip": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      infoBarHeight: { min: 76, max: 118, step: 1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
    },
  },
  "xiaomi-leica": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      infoBarHeight: { min: 96, max: 140, step: 1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
    },
  },
  "photo-album": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 1, max: 6, step: 0.1 },
      infoBarHeight: { min: 0, max: 80, step: 1 },
      photoBorder: { min: 2, max: 12, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
    },
  },
  "crop-marks": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 5, max: 10, step: 0.1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
    },
  },
  "fujifilm-classic": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 0, max: 6, step: 0.1 },
      infoBarHeight: { min: 64, max: 132, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
    },
  },
  hasselblad: {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 0, max: 6, step: 0.1 },
      infoBarHeight: { min: 64, max: 132, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
    },
  },
  "darkroom-proof": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      minTopBottomMargin: { min: 1, max: 5, step: 0.1 },
      infoBarHeight: { min: 56, max: 112, step: 1 },
      photoBorder: { min: 2, max: 12, step: 1 },
      background: true,
      ...COMMON_CANVAS_CONTROLS,
    },
  },
  "contact-sheet": {
    controls: {
      mainImageWidthRatio: { min: 80, max: 100, step: 1 },
      infoBarHeight: { min: 56, max: 100, step: 1 },
      photoBorder: { min: 0, max: 6, step: 1 },
      fontSize: { min: 3, max: 18, step: 1 },
      textColor: true,
    },
  },
};

export function getTemplateDisplayFields(kind: TemplateKind) {
  return TEMPLATE_REGISTRY[kind].displayFields;
}

export function getTemplateFrameCapabilities(kind: TemplateKind): TemplateFrameCapabilities {
  return TEMPLATE_FRAME_CAPABILITIES[kind];
}

export function isTemplateDisplayFieldFixed(
  kind: TemplateKind,
  field: keyof TemplateConfig,
) {
  return !getTemplateDisplayFields(kind).includes(field);
}

export function applyTemplateConfigConstraints(
  kind: TemplateKind,
  config: TemplateConfig,
): TemplateConfig {
  const locks = TEMPLATE_REGISTRY[kind].configLocks;
  if (!locks) return config;
  return { ...config, ...locks };
}

export function applyTemplateFrameConstraints(kindOrFrameParams: TemplateKind | FrameParams, maybeFrameParams?: FrameParams): FrameParams {
  const kind = typeof kindOrFrameParams === "string" ? kindOrFrameParams : "classic-bottom";
  const frameParams = typeof kindOrFrameParams === "string" ? maybeFrameParams : kindOrFrameParams;
  if (!frameParams) throw new Error("frameParams is required");

  const controls = getTemplateFrameCapabilities(kind).controls;
  const constrained = { ...frameParams };
  for (const [key, control] of Object.entries(controls) as [keyof FrameParams, NumericFrameControl | true][]) {
    if (control === true) continue;
    const current = constrained[key];
    if (typeof current === "number") {
      (constrained as Record<string, unknown>)[key] = clamp(current, control.min, control.max);
    }
  }
  return constrained;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
