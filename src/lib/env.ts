/**
 * Detect whether the app is running inside the Tauri shell vs a plain browser.
 * Used to guard native-only calls (Rust commands, window API, dialog plugin)
 * so the same bundle can serve a web demo of the templates.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}
