import { useEffect, useRef, useState } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { Plus, Images, Download, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type ExportFormat = "jpg" | "png" | "webp";

export function PhotoList() {
  const { photos, selectedId, select } = usePhotoStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("jpg");
  const [quality, setQuality] = useState(92);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  const canExport = photos.length > 0;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <Images className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground/70">
            {photos.length}
          </span>
        </div>
        <div className="relative flex items-center gap-1" ref={popRef}>
          <button
            type="button"
            aria-label="导入照片"
            title="导入照片"
            className="btn-neu h-7 w-7 px-0"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            aria-label="批量导出"
            title={canExport ? "批量导出" : "先导入照片"}
            disabled={!canExport}
            onClick={() => setExportOpen((v) => !v)}
            className={cn(
              "btn-primary h-7 w-7 px-0",
              exportOpen && "shadow-[var(--shadow-primary-pressed)]",
            )}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          {exportOpen ? (
            <ExportPopover
              format={format}
              quality={quality}
              onFormat={setFormat}
              onQuality={setQuality}
              count={photos.length}
            />
          ) : null}
        </div>
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

function ExportPopover({
  format,
  quality,
  onFormat,
  onQuality,
  count,
}: {
  format: ExportFormat;
  quality: number;
  onFormat: (f: ExportFormat) => void;
  onQuality: (q: number) => void;
  count: number;
}) {
  return (
    <div
      className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-border/60 bg-card p-3 shadow-[var(--shadow-apple-popover)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          批量导出
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/70">
          {count} 张
        </span>
      </div>

      <div className="mb-2.5">
        <span className="label-plain mb-1.5 block">格式</span>
        <div className="grid grid-cols-3 gap-1">
          {(["jpg", "png", "webp"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormat(f)}
              className={cn("chip", format === f && "chip-active")}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {format !== "png" ? (
        <div className="mb-2.5 flex items-center gap-2">
          <span className="w-10 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
            质量
          </span>
          <input
            type="range"
            min={60}
            max={100}
            value={quality}
            onChange={(e) => onQuality(Number(e.target.value))}
            className="range-neu flex-1"
            style={{
              ["--range-fill" as string]: `${((quality - 60) / 40) * 100}%`,
            }}
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground/70">
            {quality}
          </span>
        </div>
      ) : null}

      <button
        type="button"
        disabled
        className="btn-neu mb-2 flex h-7 w-full items-center justify-start gap-1.5 px-2 text-[11px] text-muted-foreground"
      >
        <FolderOpen className="h-3 w-3" />
        <span className="truncate">选择输出目录…</span>
      </button>

      <button
        type="button"
        disabled
        className="btn-primary h-8 w-full gap-1.5 text-[11px]"
      >
        <Download className="h-3 w-3" />
        开始导出（待接入）
      </button>
    </div>
  );
}
