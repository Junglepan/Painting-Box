import { PhotoList } from "@/components/photo-list/photo-list";
import { PreviewPane } from "@/components/preview/preview-pane";
import { FrameParamsPanel } from "@/components/panel/frame-params-panel";
import { TemplateGallery } from "@/components/gallery/template-gallery";
import { AppHeader } from "@/components/layout/app-header";

export function AppShell() {
  return (
    <div className="flex h-full flex-col text-foreground">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <section className="flex w-72 shrink-0 flex-col overflow-hidden">
          <FrameParamsPanel />
        </section>
        <div className="divider-v" />
        <main className="flex flex-1 items-center justify-center overflow-hidden p-4">
          <PreviewPane />
        </main>
        <div className="divider-v" />
        <aside className="flex w-52 shrink-0 flex-col overflow-hidden">
          <PhotoList />
        </aside>
      </div>
      <div className="h-36 shrink-0 border-t border-border/60">
        <TemplateGallery />
      </div>
    </div>
  );
}
