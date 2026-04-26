import { invoke } from "@tauri-apps/api/core";

export function getLogoSvg(key: string, variant: string): Promise<string | null> {
  return invoke<string | null>("get_logo_svg", { key, variant });
}
