import { AppShell } from "@/components/layout/app-shell";
import { TemplateShowcase } from "@/components/showcase/template-showcase";
import { isTauri } from "@/lib/env";

export default function App() {
  // On the web demo we render a static showcase grid of all templates.
  // The full editor experience (`AppShell`) is for the Tauri desktop shell.
  if (!isTauri() && !showcaseDisabledViaQuery()) {
    return <TemplateShowcase />;
  }
  return <AppShell />;
}

// Allow ?app=1 in the URL to force the full editor on web (useful for QA).
function showcaseDisabledViaQuery(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("app") === "1";
}
