import { usePhotoStore } from "@/stores/photo-store";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>照片列表</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
                    "group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left text-[13px]",
                    "transition-[background-color,box-shadow,transform,color] duration-200 ease-out",
                    selectedId === p.id
                      ? "border-primary/35 bg-accent text-accent-foreground shadow-[var(--shadow-apple-card)]"
                      : "text-foreground/80 hover:-translate-y-px hover:bg-muted/70 hover:text-foreground hover:shadow-[0_2px_6px_rgba(17,24,39,0.05)]",
                  )}
                >
                  <div className="h-9 w-9 shrink-0 rounded-md bg-muted shadow-[inset_0_1px_2px_rgba(17,24,39,0.06)]" />
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
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-background"
        style={{ boxShadow: "var(--shadow-neu-inset)" }}
      >
        <ImagePlus className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-medium text-foreground">还没有照片</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        拖拽照片到这里
        <br />
        或点击下方导入按钮
      </p>
    </div>
  );
}
