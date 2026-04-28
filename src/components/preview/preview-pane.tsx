import { useCallback, useEffect, useRef } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF, effectiveShowWatermark } from "@/stores/types";
import type { ExifData } from "@/stores/types";
import { drawClassicBottomPreview, resolvePreviewLogoSelection } from "@/lib/watermark/classic-bottom";
import { drawMagazinePreview } from "@/lib/watermark/magazine";
import { drawCinematicPreview } from "@/lib/watermark/cinematic";
import { drawFilmStripPreview } from "@/lib/watermark/film-strip";
import { loadImage, loadLogoImage } from "@/lib/watermark/load-image";
import type { TemplateKind } from "@/stores/types";
import type { FrameParams, TemplateConfig } from "@/stores/types";

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

const MOCK_W = 1536;
const MOCK_H = 1024;
const MOCK_IMAGE_SRC = "/images/preview-default.jpg";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const { currentKind, frameParams, config } = useTemplateStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fitCanvasToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !canvas.width || !canvas.height) return;
    const style = window.getComputedStyle(container);
    const availW = container.clientWidth
      - parseFloat(style.paddingLeft)
      - parseFloat(style.paddingRight);
    const availH = container.clientHeight
      - parseFloat(style.paddingTop)
      - parseFloat(style.paddingBottom);
    const scale = Math.min(availW / canvas.width, availH / canvas.height);
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(fitCanvasToContainer);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitCanvasToContainer]);

  const previewReady =
    selected?.previewStatus === "ready" && selected.exifStatus === "ready";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Mock preview (no photo selected) ──────────────────────────────
    if (!selected) {
      // Respect global showWatermark; override content fields for app branding.
      // showParams=false because all numeric fields are zero in mock data.
      const mockConfig = {
        ...config,
        showCamera: true,
        showLens: true,
        showParams: false,
        showLogo: true,
      };
      const mockFrameParams = { ...frameParams, logoKey: "painting-box", logoVariant: "original" };
      const logoSelection = resolvePreviewLogoSelection(MOCK_EXIF, mockFrameParams, mockConfig);
      let cancelled = false;

      void Promise.all([
        loadImage(MOCK_IMAGE_SRC),
        logoSelection ? loadLogoImage(logoSelection.key, logoSelection.variant) : Promise.resolve(null),
      ]).then(([image, logoImage]) => {
        if (cancelled) return;
        dispatchPreview(currentKind, canvas, image, logoImage, {
          width: MOCK_W,
          height: MOCK_H,
          src: "",
          exif: MOCK_EXIF,
        }, mockFrameParams, mockConfig);
        fitCanvasToContainer();
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
    const logoSelection = resolvePreviewLogoSelection(
      selected.exif ?? EMPTY_EXIF,
      frameParams,
      effectiveConfig,
    );

    let cancelled = false;
    void Promise.all([
      loadImage(thumbnailDataUrl),
      logoSelection ? loadLogoImage(logoSelection.key, logoSelection.variant) : Promise.resolve(null),
    ]).then(([image, logoImage]) => {
      if (cancelled) return;
      dispatchPreview(currentKind, canvas, image, logoImage, {
        width,
        height,
        src: thumbnailDataUrl,
        exif: selected.exif ?? EMPTY_EXIF,
      }, frameParams, effectiveConfig);
      fitCanvasToContainer();
    });

    return () => { cancelled = true; };
  }, [config, currentKind, frameParams, previewReady, selected]);

  // Loading skeleton
  if (selected && !previewReady) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center overflow-hidden p-4">
        <div className="relative flex h-full w-full max-w-[calc(100%)] items-center justify-center overflow-hidden rounded-[18px]">
          <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.92),rgba(255,255,255,0.18)_28%,rgba(148,163,184,0.12)_56%,rgba(100,116,139,0.16)_100%)]" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="h-2.5 w-20 rounded-full bg-foreground/8" />
            <p className="text-[11px] text-muted-foreground/70">soon...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (selected?.previewStatus === "error") {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <p className="text-[11px] text-destructive/80">
          {selected.previewError ?? "预览生成失败"}
        </p>
      </div>
    );
  }

  // Canvas (real photo OR mock preview)
  return (
    <div
      ref={containerRef}
      className="surface-inset relative flex h-full w-full items-center justify-center overflow-hidden p-4"
    >
      <canvas
        ref={canvasRef}
        className="shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
      />
    </div>
  );
}

function dispatchPreview(
  kind: TemplateKind,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  logoImage: HTMLImageElement | null,
  photo: { width: number; height: number; src: string; exif: ExifData },
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  if (kind === "magazine") {
    drawMagazinePreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "cinematic") {
    drawCinematicPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "film-strip") {
    drawFilmStripPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  drawClassicBottomPreview(canvas, image, logoImage, photo, frameParams, config, kind);
}
