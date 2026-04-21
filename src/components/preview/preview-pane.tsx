import { useEffect, useRef } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF } from "@/stores/types";
import { ImageOff } from "lucide-react";
import { drawClassicBottomPreview, resolvePreviewLogo } from "@/lib/watermark/classic-bottom";
import { loadImage } from "@/lib/watermark/load-image";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const { currentKind, frameParams, config } = useTemplateStore();
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
    const logoSrc = resolvePreviewLogo(selected.exif ?? EMPTY_EXIF, frameParams, config);

    let cancelled = false;
    void Promise.all([
      loadImage(thumbnailDataUrl),
      logoSrc ? loadImage(logoSrc).catch(() => null) : Promise.resolve(null),
    ]).then(([image, logoImage]) => {
      if (cancelled) return;
      drawClassicBottomPreview(
        canvas,
        image,
        logoImage,
        {
          width,
          height,
          src: thumbnailDataUrl,
          exif: selected.exif ?? EMPTY_EXIF,
        },
        frameParams,
        config,
        currentKind,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [config, currentKind, frameParams, previewReady, selected]);

  if (!selected) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <PreviewStage>
          <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-500">
            <ImageOff className="h-7 w-7" />
            <p className="text-[11px]">选一张照片开始</p>
          </div>
        </PreviewStage>
      </div>
    );
  }

  if (!previewReady) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-4">
        <PreviewStage>
          <div className="absolute inset-0 animate-pulse rounded-[18px] bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.92),rgba(255,255,255,0.18)_28%,rgba(148,163,184,0.12)_56%,rgba(100,116,139,0.16)_100%)]" />
          <div className="absolute flex flex-col items-center gap-2">
            <div className="h-2.5 w-20 rounded-full bg-foreground/8" />
            <p className="text-[11px] text-muted-foreground/70">soon...</p>
          </div>
        </PreviewStage>
      </div>
    );
  }

  if (selected.previewStatus === "error") {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <PreviewStage>
          <p className="text-[11px] text-destructive/80">
            {selected.previewError ?? "预览生成失败"}
          </p>
        </PreviewStage>
      </div>
    );
  }

  return (
    <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-4">
      <PreviewStage>
        <canvas
          ref={canvasRef}
          className="h-auto w-auto max-h-full max-w-full shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
        />
      </PreviewStage>
    </div>
  );
}

function PreviewStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-auto max-w-full aspect-[3/2] items-center justify-center overflow-hidden">
      {children}
    </div>
  );
}
