import catalog from "@/shared/logo-catalog.json";

export const LOGO_CATALOG = catalog as Record<string, Record<string, string>>;

export const LOGO_KEYS = Object.keys(LOGO_CATALOG).sort((a, b) =>
  a.localeCompare(b, "zh-Hans-CN"),
);

export type LogoCatalogKey = keyof typeof LOGO_CATALOG;
