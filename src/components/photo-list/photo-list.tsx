import { useEffect, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { usePhotoStore } from "@/stores/photo-store";
import { exportBatchPhotos, exportSinglePhoto, onExportProgress } from "@/lib/tauri/photos";
import {
  buildBatchExportPlan,
  defaultSingleExportPath,
  type ExportConflictStrategy,
  type ExportFormat,
} from "@/lib/export/paths";
import { IMPORT_EXTENSIONS } from "@/lib/import/accept";
import { createImportedPhotos } from "@/lib/import/records";
import { useExportStore } from "@/stores/export-store";
import type { ExifData, ExportJob, Photo } from "@/stores/types";
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  Copy,
  Download,
  Eye,
  EyeOff,
  Images,
  LoaderCircle,
  Plus,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTemplateStore } from "@/stores/template-store";

export function PhotoList() {
  const { photos, selectedId, select, removePhoto, addPhotos, importErrors, setImportErrors } =
    usePhotoStore();
  const autoPreviewEnabled = usePhotoStore((s) => s.autoPreviewEnabled);
  const setAutoPreviewEnabled = usePhotoStore((s) => s.setAutoPreviewEnabled);
  const enqueueParse = usePhotoStore((s) => s.enqueueParse);
  const jobs = useExportStore((s) => s.jobs);
  const enqueue = useExportStore((s) => s.enqueue);
  const updateJob = useExportStore((s) => s.updateJob);
  const setRunning = useExportStore((s) => s.setRunning);
  const { currentKind, frameParams, config } = useTemplateStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("jpg");
  const [conflictStrategy, setConflictStrategy] =
    useState<ExportConflictStrategy>("skip");
  const [quality, setQuality] = useState(92);
  const [exporting, setExporting] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
  const exportedRecords = jobs
    .filter((job) => job.status === "done")
    .map((job) => ({ photoId: job.photoId, outputPath: job.outputPath }));
  const exportedPhotoIds = new Set(exportedRecords.map((record) => record.photoId));
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

  const runSingleExport = async (photo: Photo, outputPath: string) => {
    const jobId = crypto.randomUUID();
    try {
      setExporting(true);
      setRunning(true);
      enqueue([
        {
          id: jobId,
          photoId: photo.id,
          status: "running",
          progress: 0,
          outputPath,
        },
      ]);
      await exportSinglePhoto({
        photoPath: photo.path,
        outputPath,
        templateKind: currentKind,
        frameParams,
        exif: photo.exif,
        config,
        exportQuality: quality,
      });
      updateJob(jobId, { status: "done", progress: 100, outputPath });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error || "导出失败");
      updateJob(jobId, { status: "error", error: message });
      return false;
    } finally {
      setExporting(false);
      setRunning(false);
    }
  };

  const onExportPhoto = async (photo: Photo) => {
    const ext = format === "jpg" ? "jpg" : format;
    const outputPath = await save({
      title: "导出照片",
      defaultPath: defaultSingleExportPath(photo.path, format),
      filters: [{ name: format.toUpperCase(), extensions: [ext] }],
    });
    if (!outputPath) return;

    const ok = await runSingleExport(photo, outputPath);
    if (ok) setExportOpen(false);
  };

  const onExportAll = async () => {
    if (photos.length === 0 || exporting) return;
    const outputDir = await open({
      title: "选择导出目录",
      directory: true,
      multiple: false,
    });
    if (!outputDir || Array.isArray(outputDir)) return;

    const plan = buildBatchExportPlan({
      photos,
      exported: exportedRecords,
      outputDir,
      format,
      conflictStrategy,
    });

    if (plan.length === 0) {
      setExportOpen(false);
      return;
    }

    // Assign job IDs upfront so progress events can be matched.
    const batchItems = plan.map((item) => ({
      jobId: crypto.randomUUID(),
      photo: item.photo,
      outputPath: item.outputPath,
    }));

    enqueue(
      batchItems.map((item) => ({
        id: item.jobId,
        photoId: item.photo.id,
        status: "queued" as const,
        progress: 0,
        outputPath: item.outputPath,
      })),
    );

    setExporting(true);
    setRunning(true);
    setExportOpen(false);

    // Subscribe to per-job progress events before firing the batch.
    const unlisten = await onExportProgress((event) => {
      updateJob(event.jobId, {
        status: event.error ? "error" : "done",
        progress: event.error ? 0 : 100,
        outputPath: event.outputPath ?? undefined,
        error: event.error ?? undefined,
      });
    });

    // Fire the parallel batch — non-blocking, rayon processes all photos concurrently.
    exportBatchPhotos(
      batchItems.map((item) => ({
        jobId: item.jobId,
        request: {
          photoPath: item.photo.path,
          outputPath: item.outputPath,
          templateKind: currentKind,
          frameParams,
          exif: item.photo.exif,
          config,
          exportQuality: quality,
        },
      })),
    )
      .catch(() => {/* individual errors are surfaced via progress events */})
      .finally(() => {
        unlisten();
        setExporting(false);
        setRunning(false);
      });
  };

  const copyExif = async (photo: Photo) => {
    if (copyingId === photo.id || photo.exifStatus !== "ready" || !photo.exif) return;
    try {
      setCopyingId(photo.id);
      await navigator.clipboard.writeText(formatExifForCopy(photo.path, photo.exif));
      setCopiedId(photo.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === photo.id ? null : current));
      }, 1400);
    } catch {
      // Clipboard errors should not override EXIF parsing status.
    } finally {
      setCopyingId((current) => (current === photo.id ? null : current));
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
            aria-label="导出整个列表"
            title={canExport ? "导出整个列表" : "先导入照片"}
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
              conflictStrategy={conflictStrategy}
              onConflictStrategy={setConflictStrategy}
              count={photos.length}
              exportedCount={exportedPhotoIds.size}
              exporting={exporting}
              canExport={photos.length > 0}
              onExport={onExportAll}
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
                const hasExifInfo = hasExifContent(p.exif);
                const exifUnavailable = p.exifStatus === "error" || (p.exifStatus === "ready" && !hasExifInfo);
                const copyDisabled = copyingId === p.id || p.exifStatus !== "ready" || !hasExifInfo;
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
                          {exifUnavailable ? (
                            <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                              无信息
                            </span>
                          ) : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onExportPhoto(p)}
                        aria-label={`导出 ${name}`}
                        title="导出当前照片"
                        className="btn-neu h-6 w-6 shrink-0 px-0"
                        disabled={exporting}
                      >
                        <Download className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyExif(p)}
                        aria-label={`复制 ${name} 的 EXIF`}
                        title={copiedId === p.id ? "已复制 EXIF" : "复制 EXIF"}
                        className={cn(
                          "btn-neu h-6 w-6 shrink-0 px-0",
                          copyDisabled && "opacity-45",
                          copiedId === p.id &&
                            "border-emerald-500/40 text-emerald-700 shadow-[var(--ring-selected)]",
                        )}
                        disabled={copyDisabled}
                      >
                        {copyingId === p.id ? (
                          <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : copiedId === p.id ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
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

function formatExifForCopy(path: string, exif: ExifData) {
  const params = [
    exif.focalLength ? `${exif.focalLength}mm` : "",
    exif.aperture ? `f/${exif.aperture}` : "",
    exif.shutterSpeed,
    exif.iso ? `ISO${exif.iso}` : "",
  ]
    .filter(Boolean)
    .join("  ");
  const gps = exif.gps ? `${exif.gps.lat}, ${exif.gps.lng}` : "";
  return [
    `文件: ${path}`,
    `机身: ${[exif.camera.make, exif.camera.model].filter(Boolean).join(" ").trim()}`,
    `镜头: ${exif.lens || "-"}`,
    `参数: ${params || "-"}`,
    `时间: ${exif.takenAt || "-"}`,
    `GPS: ${gps || "-"}`,
  ].join("\n");
}

function hasExifContent(exif?: ExifData) {
  if (!exif) return false;
  const camera = [exif.camera.make, exif.camera.model].filter(Boolean).join(" ").trim();
  const hasGps = !!exif.gps;
  return Boolean(
    camera ||
      exif.lens ||
      exif.focalLength ||
      exif.aperture ||
      exif.shutterSpeed ||
      exif.iso ||
      exif.takenAt ||
      hasGps,
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
  conflictStrategy,
  onConflictStrategy,
  count,
  exportedCount,
  exporting,
  canExport,
  onExport,
}: {
  format: ExportFormat;
  quality: number;
  onFormat: (f: ExportFormat) => void;
  onQuality: (q: number) => void;
  conflictStrategy: ExportConflictStrategy;
  onConflictStrategy: (strategy: ExportConflictStrategy) => void;
  count: number;
  exportedCount: number;
  exporting: boolean;
  canExport: boolean;
  onExport: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-9 z-[9999] w-60 rounded-lg border border-border/60 bg-card p-3 shadow-[var(--shadow-apple-popover)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          导出整个列表
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

      {exportedCount > 0 ? (
        <div className="mb-2.5">
          <span className="label-plain mb-1.5 block">已导出处理</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { value: "skip", label: "跳过" },
              { value: "overwrite", label: "覆盖" },
              { value: "rename", label: "重命名" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onConflictStrategy(option.value as ExportConflictStrategy)}
                className={cn(
                  "chip text-[10px]",
                  conflictStrategy === option.value && "chip-active",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
