import { useEffect } from "react";
import { resolveTheme, useThemeStore } from "@/stores/theme-store";

/** Apply the resolved theme as a class on <html>. Re-resolve when system preference changes. */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    apply();
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [mode]);
}
