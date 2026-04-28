import { invoke } from "@tauri-apps/api/core";
import LOGO_CATALOG from "@/shared/logo-catalog.json";
import { isTauri } from "@/lib/env";

type LogoCatalog = Record<string, Record<string, string>>;
const catalog = LOGO_CATALOG as LogoCatalog;

export async function getLogoSvg(key: string, variant: string): Promise<string | null> {
  if (isTauri()) {
    return invoke<string | null>("get_logo_svg", { key, variant });
  }
  // Web fallback: fetch the SVG straight from /brand-logos/.
  const url = catalog[key]?.[variant];
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}
