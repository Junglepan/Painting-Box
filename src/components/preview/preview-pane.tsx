import { useEffect, useRef } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF, effectiveShowWatermark } from "@/stores/types";
import type { ExifData } from "@/stores/types";
import { drawClassicBottomPreview, resolvePreviewLogo } from "@/lib/watermark/classic-bottom";
import { loadImage } from "@/lib/watermark/load-image";

// Branding data used when no photo is selected.
const MOCK_EXIF: ExifData = {
  camera: { make: "Painting Box", model: "@panbokui" },
  lens: "github.com/panbokui/painting-box",
  focalLength: 0,
  aperture: 0,
  shutterSpeed: "",
  iso: 0,
  takenAt: "",
};

const MOCK_W = 1800;
const MOCK_H = 1200;

function makePlaceholderImage(): HTMLImageElement {
  const c = document.createElement("canvas");
  c.width = MOCK_W;
  c.height = MOCK_H;
  const ctx = c.getContext("2d")!;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, MOCK_H * 0.55);
  sky.addColorStop(0, "#c5d5e8");
  sky.addColorStop(1, "#d8e6f0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, MOCK_W, MOCK_H * 0.55);

  // Ground
  const ground = ctx.createLinearGradient(0, MOCK_H * 0.55, 0, MOCK_H);
  ground.addColorStop(0, "#c2cad2");
  ground.addColorStop(1, "#b4bcc4");
  ctx.fillStyle = ground;
  ctx.fillRect(0, MOCK_H * 0.55, MOCK_W, MOCK_H * 0.45);

  // Subtle horizon line
  ctx.strokeStyle = "rgba(160,175,190,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, MOCK_H * 0.55);
  ctx.lineTo(MOCK_W, MOCK_H * 0.55);
  ctx.stroke();

  const img = new Image();
  img.src = c.toDataURL("image/jpeg", 0.9);
  return img;
}

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
    if (!canvas) return;

    // ── Mock preview (no photo selected) ──────────────────────────────
    if (!selected) {
      // Always show watermark with app branding; override logo to painting-box icon;
      // show lens line (GitHub URL) but skip numeric params (they'd be zeros).
      const mockConfig = {
        ...config,
        showWatermark: true,
        showCamera: true,
        showLens: true,
        showParams: false,
        showLogo: true,
      };
      const mockFrameParams = { ...frameParams, logoKey: "painting-box", logoVariant: "original" };
      const logoSrc = resolvePreviewLogo(MOCK_EXIF, mockFrameParams, mockConfig);
      let cancelled = false;

      void Promise.all([
        Promise.resolve(makePlaceholderImage()),
        logoSrc ? loadImage(logoSrc).catch(() => null) : Promise.resolve(null),
      ]).then(([image, logoImage]) => {
        if (cancelled) return;
        drawClassicBottomPreview(
          canvas,
          image,
          logoImage,
          { width: MOCK_W, height: MOCK_H, src: "", exif: MOCK_EXIF },
          mockFrameParams,
          mockConfig,
          currentKind,
        );
      });

      return () => { cancelled = true; };
    }

    // ── Real photo preview ────────────────────────────────────────────
    if (
      !previewReady ||
      !selected.thumbnailDataUrl ||
      !selected.width ||
      !selected.height
    ) {
      return;
    }

    const { thumbnailDataUrl, width, height } = selected;
    const effectiveConfig = {
      ...config,
      showWatermark: effectiveShowWatermark(selected, config.showWatermark),
    };
    const logoSrc = resolvePreviewLogo(
      selected.exif ?? EMPTY_EXIF,
      frameParams,
      effectiveConfig,
    );

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
        { width, height, src: thumbnailDataUrl, exif: selected.exif ?? EMPTY_EXIF },
        frameParams,
        effectiveConfig,
        currentKind,
      );
    });

    return () => { cancelled = true; };
  }, [config, currentKind, frameParams, previewReady, selected]);

  // Loading skeleton
  if (selected && !previewReady) {
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

  // Error state
  if (selected?.previewStatus === "error") {
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

  // Canvas (real photo OR mock preview)
  return (
    <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-4">
      <PreviewStage>
        <canvas
          ref={canvasRef}
          className="h-auto w-auto max-h-full max-w-full shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
        />
        {!selected && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-medium text-white/80 backdrop-blur-sm">
            示例
          </span>
        )}
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
