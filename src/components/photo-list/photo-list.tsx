import { usePhotoStore } from "@/stores/photo-store";
import { Plus, Images } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <Images className="h-3.5 w-3.5 text-muted-foreground" />
        <button
          type="button"
          aria-label="导入照片"
          className="btn-neu h-7 w-7 px-0"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {photos.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-2 gap-1.5">
            {photos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p.id)}
                  aria-label={p.path.split("/").pop()}
                  className={cn(
                    "group aspect-square w-full overflow-hidden rounded-md border transition-all duration-200 ease-out",
                    selectedId === p.id
                      ? "border-primary/60 shadow-[var(--shadow-apple-card)]"
                      : "border-transparent hover:border-border",
                  )}
                  style={{ boxShadow: "var(--shadow-neu-inset)" }}
                >
                  <div className="h-full w-full bg-muted" />
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
    <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
      <Plus className="h-5 w-5" />
      <p className="text-[11px]">拖入照片</p>
    </div>
  );
}
