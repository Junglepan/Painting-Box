import { usePhotoStore } from "@/stores/photo-store";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>照片列表</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {photos.length}
        </span>
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
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-all duration-150 ease-out",
                    selectedId === p.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <div className="h-9 w-9 shrink-0 rounded bg-muted" />
                  <span className="truncate text-[13px]">
                    {p.path.split("/").pop()}
                  </span>
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
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-background"
        style={{ boxShadow: "var(--shadow-neu-inset)" }}
      >
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium text-foreground">还没有照片</p>
      <p className="text-[11px] text-muted-foreground">
        拖拽照片到这里，或点击下方导入按钮
      </p>
    </div>
  );
}
