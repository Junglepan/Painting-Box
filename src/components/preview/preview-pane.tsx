import { useEffect, useRef } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF } from "@/stores/types";
import { ImageOff } from "lucide-react";
import { drawClassicBottomPreview } from "@/lib/watermark/classic-bottom";
import { loadImage } from "@/lib/watermark/load-image";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const { frameParams, config } = useTemplateStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewReady =
    selected?.previewStatus === "ready" && selected.exifStatus === "ready";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !selected ||
      !canvas ||
      !previewReady ||
      !selected.thumbnailDataUrl ||
      !selected.width ||
      !selected.height
    ) {
      return;
    }
    const thumbnailDataUrl = selected.thumbnailDataUrl;
    const width = selected.width;
    const height = selected.height;

    let cancelled = false;
    void loadImage(thumbnailDataUrl).then((image) => {
      if (cancelled) return;
      drawClassicBottomPreview(
        canvas,
        image,
        {
          width,
          height,
          src: thumbnailDataUrl,
          exif: selected.exif ?? EMPTY_EXIF,
        },
        frameParams,
        config,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [config, frameParams, previewReady, selected]);

  if (!selected) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-500">
          <ImageOff className="h-7 w-7" />
          <p className="text-[11px]">选一张照片开始</p>
        </div>
      </div>
    );
  }

  if (!previewReady) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-6">
        <div className="flex h-full w-full max-h-full max-w-[760px] items-center justify-center">
          <div className="relative flex aspect-[3/2] w-full max-h-full max-w-full flex-col items-center justify-center overflow-hidden rounded-[18px] border border-border/50 bg-gradient-to-br from-white/85 via-slate-100/70 to-slate-200/75 shadow-[var(--shadow-apple-elevated)]">
            <div className="h-full w-full animate-pulse bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.92),rgba(255,255,255,0.18)_28%,rgba(148,163,184,0.18)_56%,rgba(100,116,139,0.24)_100%)]" />
            <div className="absolute flex flex-col items-center gap-2">
              <div className="h-2.5 w-20 rounded-full bg-foreground/8" />
              <p className="text-[11px] text-muted-foreground/70">soon...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selected.previewStatus === "error") {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <p className="text-[11px] text-destructive/80">
          {selected.previewError ?? "预览生成失败"}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-6">
      <div className="flex h-full w-full max-h-full max-w-[760px] items-center justify-center">
        <canvas
          ref={canvasRef}
          className="h-auto w-auto max-h-full max-w-full rounded-[18px] shadow-[var(--shadow-apple-elevated)]"
        />
      </div>
    </div>
  );
}
