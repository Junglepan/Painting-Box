import { TEMPLATE_REGISTRY } from "@/lib/watermark/template-registry";
import type { TemplateKind } from "@/stores/types";

export type TemplateMeta = {
  kind: TemplateKind;
  name: string;
  desc: string;
};

export const TEMPLATE_LIBRARY: TemplateMeta[] = Object.values(TEMPLATE_REGISTRY)
  .filter((entry) => entry.exposedInLibrary)
  .map(({ kind, name, desc }) => ({ kind, name, desc }));
