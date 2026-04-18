import { usePhotoStore } from "@/stores/photo-store";
import { ImageOff } from "lucide-react";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4 text-xs font-medium text-muted-foreground">
        <span>预览</span>
        {selected ? (
          <span>
            {selected.width} × {selected.height}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
        {selected ? (
          <div className="h-full w-full rounded-lg border border-border bg-card shadow-sm" />
        ) : (
          <PreviewEmpty />
        )}
      </div>
    </div>
  );
}

function PreviewEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <ImageOff className="h-10 w-10 opacity-50" />
      <p className="text-sm">选择一张照片以预览效果</p>
    </div>
  );
}
