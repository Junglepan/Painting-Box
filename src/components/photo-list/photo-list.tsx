import { usePhotoStore } from "@/stores/photo-store";
import { Plus, Images } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Images className="h-3.5 w-3.5" />
          <span>{photos.length}</span>
        </div>
        <button
          type="button"
          aria-label="导入照片"
          title="导入照片"
          className="btn-neu h-7 w-7 px-0"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="surface-inset mx-2 mb-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2">
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
                    title={p.path.split("/").pop()}
                    className={cn(
                      "aspect-square w-full overflow-hidden rounded-md border bg-card transition-all duration-200 ease-out",
                      selectedId === p.id
                        ? "border-primary/60 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
                        : "border-border/40 hover:-translate-y-px hover:border-border hover:shadow-[var(--shadow-apple-card)]",
                    )}
                  >
                    <div className="h-full w-full bg-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <Plus className="h-5 w-5" />
      <p className="text-[11px]">拖入照片</p>
    </div>
  );
}
