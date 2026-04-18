import { PhotoList } from "@/components/photo-list/photo-list";
import { PreviewPane } from "@/components/preview/preview-pane";
import { TemplatePanel } from "@/components/panel/template-panel";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell() {
  return (
    <div className="flex h-full flex-col text-foreground">
      <AppHeader />
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <aside className="card-apple flex w-64 shrink-0 overflow-hidden">
          <PhotoList />
        </aside>
        <main className="card-apple card-apple-elevated flex flex-1 overflow-hidden">
          <PreviewPane />
        </main>
        <aside className="card-apple flex w-80 shrink-0 overflow-hidden">
          <TemplatePanel />
        </aside>
      </div>
    </div>
  );
}
