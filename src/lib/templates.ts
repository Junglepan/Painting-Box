import type { TemplateKind } from "@/stores/types";

export type TemplateMeta = {
  kind: TemplateKind;
  name: string;
  desc: string;
};

export const TEMPLATE_LIBRARY: TemplateMeta[] = [
  { kind: "classic-bottom", name: "经典底栏", desc: "Logo + 参数底部横栏" },
  { kind: "polaroid", name: "宝丽来", desc: "四周留白 + 底部宽边信息" },
  { kind: "minimal-corner", name: "极简角标", desc: "图片下方右对齐轻量水印" },
];
