import { PhotoList } from "@/components/photo-list/photo-list";
import { PreviewPane } from "@/components/preview/preview-pane";
import { TemplatePanel } from "@/components/panel/template-panel";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-border bg-card">
          <PhotoList />
        </aside>
        <main className="flex-1 overflow-hidden bg-background">
          <PreviewPane />
        </main>
        <aside className="w-80 shrink-0 border-l border-border bg-card">
          <TemplatePanel />
        </aside>
      </div>
    </div>
  );
}
