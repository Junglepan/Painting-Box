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
  polaroid: {
    kind: "polaroid",
    name: "宝丽来",
    desc: "宝丽来风格底部横栏",
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
    displayFields: ["showLogo", "showCamera", "showLens", "showParams", "showDate"],
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
      showDate: false,
    },
    liftLogoOnly: true,
  },
  "minimal-fullbleed": {
    kind: "minimal-fullbleed",
    name: "极简白底",
    desc: "四周宽白边，底部极小信息",
    mode: "bottom-bar",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showLogo", "showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
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
    displayFields: ["showLogo", "showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
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
    displayFields: ["showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
    liftLogoOnly: false,
  },
  "date-stamp": {
    kind: "date-stamp",
    name: "日期戳",
    desc: "右下角橙色 LCD 日期，致敬老相机",
    mode: "corner-overlay",
    placement: "corner-bottom-right",
    exposedInLibrary: true,
    displayFields: ["showDate"],
    configLocks: {
      showLogo: false,
      showCamera: false,
      showLens: false,
      showParams: false,
      showDate: true,
    },
    liftLogoOnly: false,
  },
  "swiss-grid": {
    kind: "swiss-grid",
    name: "瑞士网格",
    desc: "强排版网格 + 大号粗体型号",
    mode: "letterbox",
    placement: "center",
    exposedInLibrary: true,
    displayFields: ["showCamera", "showLens", "showParams", "showDate"],
    configLocks: null,
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
};

export function getTemplateRegistryEntry(kind: TemplateKind): TemplateRegistryEntry {
  return TEMPLATE_REGISTRY[kind];
}
