import type { TemplateConfig, TemplateKind } from "@/stores/types";

export type TemplateLayoutMode = "bottom-bar" | "corner-overlay";
export type WatermarkPlacement = "center" | "corner-bottom-right";

type ConfigLockKey = "showLogo" | "showCamera" | "showLens" | "showParams";

export type TemplateRegistryEntry = {
  kind: TemplateKind;
  name: string;
  desc: string;
  mode: TemplateLayoutMode;
  placement: WatermarkPlacement;
  exposedInLibrary: boolean;
  displayFields: (keyof TemplateConfig)[];
  configLocks: Partial<Pick<TemplateConfig, ConfigLockKey>> | null;
  liftLogoOnly: boolean;
};

export const TEMPLATE_REGISTRY: Record<TemplateKind, TemplateRegistryEntry> = {
  "classic-bottom": {
    kind: "classic-bottom",
    name: "经典底栏",
    desc: "Logo + 参数底部横栏",
    mode: "bottom-bar",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showLogo", "showCamera", "showLens", "showParams"],
    configLocks: null,
    liftLogoOnly: false,
  },
  polaroid: {
    kind: "polaroid",
    name: "宝丽来",
    desc: "宝丽来风格底部横栏",
    mode: "bottom-bar",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showLogo", "showCamera", "showLens", "showParams"],
    configLocks: null,
    liftLogoOnly: false,
  },
  magazine: {
    kind: "magazine",
    name: "杂志双栏",
    desc: "左侧品牌信息，右侧拍摄参数",
    mode: "bottom-bar",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showLogo", "showCamera", "showLens", "showParams"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "minimal-corner": {
    kind: "minimal-corner",
    name: "极简角标",
    desc: "图片下方右对齐轻量水印",
    mode: "bottom-bar",
    placement: "corner-bottom-right",
    exposedInLibrary: true,
    displayFields: ["showLogo"],
    configLocks: {
      showLogo: true,
      showCamera: false,
      showLens: false,
      showParams: false,
    },
    liftLogoOnly: true,
  },
};

export function getTemplateRegistryEntry(kind: TemplateKind): TemplateRegistryEntry {
  return TEMPLATE_REGISTRY[kind];
}
