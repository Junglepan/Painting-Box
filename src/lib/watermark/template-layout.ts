import type { TemplateKind } from "@/stores/types";

export type WatermarkPlacement = "center" | "corner-bottom-right";
export type TemplateLayoutMode = "bottom-bar" | "corner-overlay";

type TemplateLayout = {
  mode: TemplateLayoutMode;
  placement: WatermarkPlacement;
};

const TEMPLATE_LAYOUTS: Record<TemplateKind, TemplateLayout> = {
  "classic-bottom": { mode: "bottom-bar", placement: "center" },
  polaroid: { mode: "bottom-bar", placement: "center" },
  "minimal-corner": { mode: "bottom-bar", placement: "corner-bottom-right" },
};

export function getTemplateLayout(kind: TemplateKind): TemplateLayout {
  return TEMPLATE_LAYOUTS[kind];
}
