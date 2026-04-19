import { useEffect, useState } from "react";
import { PhotoList } from "@/components/photo-list/photo-list";
import { PreviewPane } from "@/components/preview/preview-pane";
import { FrameParamsPanel } from "@/components/panel/frame-params-panel";
import { TemplateGallery } from "@/components/gallery/template-gallery";
import { PresetGallery } from "@/components/gallery/preset-gallery";
import { AppHeader } from "@/components/layout/app-header";
import { ResizeHandle } from "@/components/layout/resize-handle";

const STORAGE_KEY = "painting-box-layout";
const DEFAULT_LIST_WIDTH = 240;
const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 400;

function loadListWidth(): number {
  if (typeof window === "undefined") return DEFAULT_LIST_WIDTH;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LIST_WIDTH;
    const parsed = JSON.parse(raw) as { listWidth?: number };
    const w = parsed.listWidth;
    if (typeof w !== "number" || Number.isNaN(w)) return DEFAULT_LIST_WIDTH;
    return Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, w));
  } catch {
    return DEFAULT_LIST_WIDTH;
  }
}

export function AppShell() {
  const [listWidth, setListWidth] = useState<number>(() => loadListWidth());

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ listWidth }),
      );
    } catch {
      // storage unavailable, ignore
    }
  }, [listWidth]);

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
        <ResizeHandle
          value={listWidth}
          min={MIN_LIST_WIDTH}
          max={MAX_LIST_WIDTH}
          onChange={setListWidth}
          direction="left"
        />
        <aside
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ width: listWidth }}
        >
          <PhotoList />
        </aside>
      </div>
      <div className="flex h-36 shrink-0 border-t border-border/60">
        <div className="min-w-0 flex-[3]">
          <TemplateGallery />
        </div>
        <div className="divider-v" />
        <div className="min-w-0 flex-[2]">
          <PresetGallery />
        </div>
      </div>
    </div>
  );
}
