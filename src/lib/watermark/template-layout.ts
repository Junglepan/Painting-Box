import type { TemplateKind } from "@/stores/types";

export type WatermarkPlacement = "center";

const WATERMARK_PLACEMENT_BY_TEMPLATE: Record<TemplateKind, WatermarkPlacement> = {
  "classic-bottom": "center",
  polaroid: "center",
  "minimal-corner": "center",
  magazine: "center",
  "film-strip": "center",
  "full-frame": "center",
  leica: "center",
  poster: "center",
  "square-social": "center",
  xpan: "center",
  "minimal-blank": "center",
  custom: "center",
};

export function getWatermarkPlacement(kind: TemplateKind): WatermarkPlacement {
  return WATERMARK_PLACEMENT_BY_TEMPLATE[kind];
}
