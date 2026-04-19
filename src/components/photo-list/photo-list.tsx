import { useEffect, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { usePhotoStore } from "@/stores/photo-store";
import { exportSinglePhoto } from "@/lib/tauri/photos";
import { IMPORT_EXTENSIONS } from "@/lib/import/accept";
import { createImportedPhotos } from "@/lib/import/records";
import { useExportStore } from "@/stores/export-store";
import type { ExportJob, Photo } from "@/stores/types";
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Images,
  LoaderCircle,
  Plus,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplateStore } from "@/stores/template-store";

type ExportFormat = "jpg" | "png" | "webp";

export function PhotoList() {
  const { photos, selectedId, select, removePhoto, addPhotos, importErrors, setImportErrors } =
    usePhotoStore();
  const autoPreviewEnabled = usePhotoStore((s) => s.autoPreviewEnabled);
  const setAutoPreviewEnabled = usePhotoStore((s) => s.setAutoPreviewEnabled);
  const enqueueParse = usePhotoStore((s) => s.enqueueParse);
  const selected = photos.find((p) => p.id === selectedId) ?? null;
  const jobs = useExportStore((s) => s.jobs);
  const enqueue = useExportStore((s) => s.enqueue);
  const updateJob = useExportStore((s) => s.updateJob);
  const setRunning = useExportStore((s) => s.setRunning);
  const { frameParams, config } = useTemplateStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("jpg");
  const [quality, setQuality] = useState(92);
  const [exporting, setExporting] = useState(false);
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
  const queuedIds = usePhotoStore((s) => s.parseQueue);
  const parseableIds = photos
    .filter(
      (photo) =>
        (photo.previewStatus === "idle" || photo.exifStatus === "idle") &&
        !queuedIds.includes(photo.id),
    )
    .map((photo) => photo.id);

  const importFromPaths = async (paths: string[]) => {
    if (paths.length === 0) return;
    const imported = createImportedPhotos(paths);
    addPhotos(imported);
    if (autoPreviewEnabled) {
      enqueueParse(imported.map((photo) => photo.id));
    }
    setImportErrors([]);
  };

  const onPick = async () => {
    try {
      const picked = await open({
        title: "选择照片",
        multiple: true,
        filters: [
          {
            name: "Images",
            extensions: [...IMPORT_EXTENSIONS],
          },
        ],
      });
      const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
      await importFromPaths(paths);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "无法打开系统文件选择器";
      setImportErrors([{ path: "", message: `导入失败：${message}` }]);
    }
  };

  const onExport = async () => {
    if (!selected || exporting) return;
    const ext = format === "jpg" ? "jpg" : format;
    const outputPath = await save({
      title: "导出照片",
      defaultPath: `${selected.path.replace(/\.[^.]+$/, "")}-painting-box.${ext}`,
      filters: [{ name: format.toUpperCase(), extensions: [ext] }],
    });
    if (!outputPath) return;

    const jobId = crypto.randomUUID();
    try {
      setExporting(true);
      setRunning(true);
      enqueue([
        {
          id: jobId,
          photoId: selected.id,
          status: "running",
          progress: 0,
        },
      ]);
      await exportSinglePhoto({
        photoPath: selected.path,
        outputPath,
        frameParams,
        exif: selected.exif,
        config,
        exportQuality: quality,
      });
      updateJob(jobId, { status: "done", progress: 100 });
      setExportOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "导出失败";
      updateJob(jobId, { status: "error", error: message });
    } finally {
      setExporting(false);
      setRunning(false);
    }
  };

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
            aria-label="自动预览"
            title={autoPreviewEnabled ? "关闭自动预览" : "开启自动预览"}
            onClick={() => setAutoPreviewEnabled(!autoPreviewEnabled)}
            className={cn(
              "btn-neu h-7 w-7 px-0",
              autoPreviewEnabled && "shadow-[var(--shadow-apple-card),var(--ring-selected)]",
            )}
          >
            {autoPreviewEnabled ? (
              <Eye className="h-3.5 w-3.5 text-primary" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            aria-label="解析所有照片"
            title={parseableIds.length > 0 ? "解析所有照片" : "没有待解析照片"}
            disabled={parseableIds.length === 0}
            onClick={() => enqueueParse(parseableIds)}
            className="btn-neu h-7 w-7 px-0"
          >
            <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            aria-label="导入照片"
            title="导入照片"
            onClick={() => void onPick()}
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
              exporting={exporting}
              canExport={!!selected}
              onExport={onExport}
            />
          ) : null}
        </div>
      </div>
      <div className="surface-inset mx-2 mb-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2">
          {importErrors.length > 0 ? (
            <div className="mb-2 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5 text-[10px] text-destructive">
              {importErrors[0].message}
            </div>
          ) : null}
          {photos.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-1.5">
              {photos.map((p) => {
                const name = p.path.split("/").pop() ?? p.path;
                const previewState = getPreviewState(p, queuedIds.includes(p.id));
                const exportState = getExportState(
                  jobs.filter((job) => job.photoId === p.id),
                );
                return (
                  <li key={p.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-all duration-200 ease-out",
                        selectedId === p.id
                          ? "border-primary/60 bg-primary/5 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
                          : "border-border/40 bg-card hover:-translate-y-px hover:border-border hover:shadow-[var(--shadow-apple-card)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => select(p.id)}
                        aria-label={name}
                        title={name}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[11px] font-medium text-foreground/90">
                          {name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                          {p.width && p.height ? `${p.width} × ${p.height}` : "未加载预览"}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <StatusIcon
                            label={`可预览：${previewState.label}`}
                            tone={previewState.tone}
                            kind="preview"
                          />
                          <StatusIcon
                            label={`导出：${exportState.label}`}
                            tone={exportState.tone}
                            kind="export"
                          />
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        aria-label={`删除 ${name}`}
                        title="删除照片"
                        className="btn-neu h-6 w-6 shrink-0 px-0"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

type StatusTone = "neutral" | "info" | "success" | "error";
type StatusKind = "preview" | "export";

function StatusIcon({
  label,
  tone,
  kind,
}: {
  label: string;
  tone: StatusTone;
  kind: StatusKind;
}) {
  const Icon = getStatusIcon(kind, tone);
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border",
        tone === "neutral" && "border-border/50 bg-background/70 text-muted-foreground/75",
        tone === "info" && "border-primary/20 bg-primary/8 text-primary/80",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        tone === "error" && "border-destructive/20 bg-destructive/10 text-destructive/80",
      )}
    >
      <Icon className={cn("h-2.75 w-2.75", tone === "info" && "animate-spin")} />
    </span>
  );
}

function getStatusIcon(kind: StatusKind, tone: StatusTone) {
  if (tone === "error") return AlertCircle;
  if (tone === "success") return CheckCircle2;
  if (tone === "info") return LoaderCircle;
  return kind === "preview" ? Eye : CircleSlash;
}

function getPreviewState(photo: Photo, queued: boolean) {
  if (photo.previewStatus === "error" || photo.exifStatus === "error") {
    return { label: "失败", tone: "error" as const };
  }
  if (queued) {
    return { label: "排队中", tone: "info" as const };
  }
  if (photo.previewStatus === "ready" && photo.exifStatus === "ready") {
    return { label: "可用", tone: "success" as const };
  }
  if (photo.previewStatus === "loading" || photo.exifStatus === "loading") {
    return { label: "生成中", tone: "info" as const };
  }
  return { label: "未生成", tone: "neutral" as const };
}

function getExportState(
  jobs: ExportJob[],
) {
  const latest = jobs[jobs.length - 1];
  if (!latest) {
    return { label: "未导出", tone: "neutral" as const };
  }
  if (latest.status === "done") {
    return { label: "已导出", tone: "success" as const };
  }
  if (latest.status === "error") {
    return { label: "失败", tone: "error" as const };
  }
  if (latest.status === "running") {
    return { label: "导出中", tone: "info" as const };
  }
  return { label: "排队中", tone: "info" as const };
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
  exporting,
  canExport,
  onExport,
}: {
  format: ExportFormat;
  quality: number;
  onFormat: (f: ExportFormat) => void;
  onQuality: (q: number) => void;
  count: number;
  exporting: boolean;
  canExport: boolean;
  onExport: () => void;
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
        onClick={() => void onExport()}
        disabled={!canExport || exporting}
        className="btn-primary h-8 w-full gap-1.5 text-[11px]"
      >
        <Download className="h-3 w-3" />
        {exporting ? "导出中…" : "开始导出"}
      </button>
    </div>
  );
}
