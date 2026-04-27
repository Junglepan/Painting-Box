import type { TemplateKind } from "@/stores/types";
import {
  TEMPLATE_REGISTRY,
  type TemplateLayoutMode,
  type WatermarkPlacement,
} from "./template-registry";

export type { TemplateLayoutMode, WatermarkPlacement };

type TemplateLayout = {
  mode: TemplateLayoutMode;
  placement: WatermarkPlacement;
};

export function getTemplateLayout(kind: TemplateKind): TemplateLayout {
  const entry = TEMPLATE_REGISTRY[kind];
  return { mode: entry.mode, placement: entry.placement };
}
