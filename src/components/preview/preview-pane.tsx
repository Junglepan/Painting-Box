import { usePhotoStore } from "@/stores/photo-store";
import { ImageOff } from "lucide-react";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>预览</span>
        {selected ? (
          <span className="font-mono text-[10px]">
            {selected.width} × {selected.height}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-8">
        {selected ? (
          <div
            className="h-full w-full rounded-lg bg-background"
            style={{ boxShadow: "var(--shadow-neu-inset)" }}
          />
        ) : (
          <PreviewEmpty />
        )}
      </div>
    </div>
  );
}

function PreviewEmpty() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-background"
        style={{ boxShadow: "var(--shadow-neu-inset)" }}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">选择一张照片以预览效果</p>
      <p className="text-xs text-muted-foreground">
        从左侧选择照片或拖入图片文件
      </p>
    </div>
  );
}
