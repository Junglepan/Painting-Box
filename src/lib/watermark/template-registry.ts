import type { TemplateConfig, TemplateKind } from "@/stores/types";

export type TemplateLayoutMode =
  | "bottom-bar"
  | "corner-overlay"
  | "letterbox"
  | "film-strip";
export type WatermarkPlacement = "center" | "corner-bottom-right";

type ConfigLockKey = "showLogo" | "showCamera" | "showLens" | "showParams" | "showDate";

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
    displayFields: ["showLogo", "showCamera", "showLens", "showParams", "showDate"],
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
    displayFields: ["showLogo", "showCamera", "showParams"],
    configLocks: {
      showLens: false,
      showDate: false,
    },
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
      showDate: false,
    },
    liftLogoOnly: true,
  },
  cinematic: {
    kind: "cinematic",
    name: "电影黑边",
    desc: "上下黑边带，下栏白色文字",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showLogo", "showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "film-strip": {
    kind: "film-strip",
    name: "胶片齿孔",
    desc: "上下黑带 + 左右齿孔",
    mode: "film-strip",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showParams", "showDate"],
    configLocks: {
      showLogo: false,
      showLens: false,
    },
    liftLogoOnly: false,
  },
  "xiaomi-leica": {
    kind: "xiaomi-leica",
    name: "徕卡风",
    desc: "中央分隔 + 红色细线，致敬小米徕卡水印",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "photo-album": {
    kind: "photo-album",
    name: "旧相册",
    desc: "米色调底纹，四角黑色三角夹",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: [],
    configLocks: {
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    },
    liftLogoOnly: false,
  },
  "crop-marks": {
    kind: "crop-marks",
    name: "印刷标记",
    desc: "四角 L 形对位标 + CMYK 色块",
    mode: "corner-overlay",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "fujifilm-classic": {
    kind: "fujifilm-classic",
    name: "富士经典",
    desc: "米白底 + 绿色品牌口音 + 胶片模拟标签",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  hasselblad: {
    kind: "hasselblad",
    name: "哈苏",
    desc: "纯黑底栏 + 橙色品牌口音，极简到只剩型号",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "darkroom-proof": {
    kind: "darkroom-proof",
    name: "暗房样片",
    desc: "黑色相纸边 + 窄白边，下方打 PROOF 印记",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: [],
    configLocks: {
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    },
    liftLogoOnly: false,
  },
  "contact-sheet": {
    kind: "contact-sheet",
    name: "接触印样",
    desc: "黑底 + 上下齿孔 + 白色细边，模拟胶卷小样",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: [],
    configLocks: {
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: false,
    },
    liftLogoOnly: false,
  },
};

export function getTemplateRegistryEntry(kind: TemplateKind): TemplateRegistryEntry {
  return TEMPLATE_REGISTRY[kind];
}
