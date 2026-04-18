import type { TemplateKind } from "@/stores/types";

export type TemplateMeta = {
  kind: TemplateKind;
  name: string;
  desc: string;
};

export const TEMPLATE_LIBRARY: TemplateMeta[] = [
  { kind: "classic-bottom", name: "经典底栏", desc: "Logo + 参数底部横栏" },
  { kind: "polaroid", name: "宝丽来", desc: "四周白边 + 底部大留白" },
  { kind: "minimal-corner", name: "极简角标", desc: "右下角轻量水印" },
  { kind: "magazine", name: "杂志横幅", desc: "顶底双栏 + 大字 Logo" },
  { kind: "film-strip", name: "胶片齿边", desc: "上下胶片孔 + 片号" },
  { kind: "full-frame", name: "全相框", desc: "四边等宽外描边" },
  { kind: "leica", name: "徕卡红标", desc: "黑边白框 + 红点" },
  { kind: "poster", name: "海报大字", desc: "巨型字号 + 留白" },
  { kind: "square-social", name: "社交方图", desc: "1:1 裁切适合 IG" },
  { kind: "xpan", name: "宽幅全景", desc: "2.7:1 电影感" },
  { kind: "minimal-blank", name: "纯画框", desc: "只留白边，不带信息" },
];
