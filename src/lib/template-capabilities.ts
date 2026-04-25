import type { FrameParams, TemplateConfig, TemplateKind } from "@/stores/types";

const ALL_DISPLAY_FIELDS: (keyof TemplateConfig)[] = [
  "showLogo",
  "showCamera",
  "showLens",
  "showParams",
];

const TEMPLATE_DISPLAY_FIELDS: Partial<Record<TemplateKind, (keyof TemplateConfig)[]>> = {
  "minimal-corner": ["showLogo"],
};

export function getTemplateDisplayFields(kind: TemplateKind) {
  return TEMPLATE_DISPLAY_FIELDS[kind] ?? ALL_DISPLAY_FIELDS;
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
  if (kind === "minimal-corner") {
    return {
      ...config,
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    };
  }

  return config;
}

export function applyTemplateFrameConstraints(frameParams: FrameParams): FrameParams {
  return {
    ...frameParams,
    mainImageWidthRatio: clamp(frameParams.mainImageWidthRatio, 70, 95),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
