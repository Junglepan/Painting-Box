import { usePhotoStore } from "@/stores/photo-store";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center justify-between border-b border-border px-3 text-xs font-medium text-muted-foreground">
        <span>照片列表</span>
        <span>{photos.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {photos.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-1">
            {photos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    selectedId === p.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-muted" />
                  <span className="truncate">{p.path.split("/").pop()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
      <ImagePlus className="h-8 w-8 opacity-50" />
      <p className="text-xs">还没有照片</p>
      <p className="text-[11px] opacity-70">拖拽照片到这里，或点击下方导入按钮</p>
    </div>
  );
}
