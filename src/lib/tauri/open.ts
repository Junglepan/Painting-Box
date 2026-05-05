import { revealItemInDir } from "@tauri-apps/plugin-opener";

export function revealExportDirectory(path: string) {
  return revealItemInDir(path);
}
