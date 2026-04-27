import { TEMPLATE_REGISTRY } from "@/lib/watermark/template-registry";
import type { FrameParams, TemplateConfig, TemplateKind } from "@/stores/types";

export function getTemplateDisplayFields(kind: TemplateKind) {
  return TEMPLATE_REGISTRY[kind].displayFields;
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
