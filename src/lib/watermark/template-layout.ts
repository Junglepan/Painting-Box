import type { TemplateKind } from "@/stores/types";

export type WatermarkPlacement = "center" | "corner-bottom-right";
export type TemplateLayoutMode = "bottom-bar" | "corner-overlay";

type TemplateLayout = {
  mode: TemplateLayoutMode;
  placement: WatermarkPlacement;
};

const TEMPLATE_LAYOUTS: Record<TemplateKind, TemplateLayout> = {
  "classic-bottom": { mode: "bottom-bar", placement: "center" },
  "classic-white": { mode: "bottom-bar", placement: "center" },
  polaroid: { mode: "bottom-bar", placement: "center" },
  "minimal-corner": { mode: "bottom-bar", placement: "corner-bottom-right" },
  magazine: { mode: "bottom-bar", placement: "center" },
  "film-strip": { mode: "bottom-bar", placement: "center" },
  "full-frame": { mode: "bottom-bar", placement: "center" },
  leica: { mode: "bottom-bar", placement: "center" },
  poster: { mode: "bottom-bar", placement: "center" },
  "square-social": { mode: "bottom-bar", placement: "center" },
  xpan: { mode: "bottom-bar", placement: "center" },
  "minimal-blank": { mode: "bottom-bar", placement: "center" },
  custom: { mode: "bottom-bar", placement: "center" },
};

export function getTemplateLayout(kind: TemplateKind): TemplateLayout {
  return TEMPLATE_LAYOUTS[kind];
}
