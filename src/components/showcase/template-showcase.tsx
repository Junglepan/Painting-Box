import { useEffect, useRef } from "react";
import { Camera, Globe } from "lucide-react";
import { TEMPLATE_REGISTRY } from "@/lib/watermark/template-registry";
import { drawClassicBottomPreview, resolvePreviewLogoSelection } from "@/lib/watermark/classic-bottom";
import { drawMagazinePreview } from "@/lib/watermark/magazine";
import { drawCinematicPreview } from "@/lib/watermark/cinematic";
import { drawFilmStripPreview } from "@/lib/watermark/film-strip";
import { drawXiaomiLeicaPreview } from "@/lib/watermark/xiaomi-leica";
import { drawPhotoAlbumPreview } from "@/lib/watermark/photo-album";
import { drawCropMarksPreview } from "@/lib/watermark/crop-marks";
import { drawFujifilmClassicPreview } from "@/lib/watermark/fujifilm-classic";
import { drawHasselbladPreview } from "@/lib/watermark/hasselblad";
import { drawDarkroomProofPreview } from "@/lib/watermark/darkroom-proof";
import { drawContactSheetPreview } from "@/lib/watermark/contact-sheet";
import { loadImage, loadLogoImage } from "@/lib/watermark/load-image";
import { getTemplateDefaults } from "@/stores/template-store";
import type {
  ExifData,
  FrameParams,
  TemplateConfig,
  TemplateKind,
} from "@/stores/types";

const SAMPLE_IMAGE = "/images/preview-default.jpg";
const SAMPLE_W = 1536;
const SAMPLE_H = 1024;

const SAMPLE_EXIF: ExifData = {
  camera: { make: "Painting Box", model: "@panbokui" },
  lens: "github.com/panbokui/painting-box",
  focalLength: 35,
  aperture: 1.8,
  shutterSpeed: "1/250",
  iso: 200,
  takenAt: "2026:04:28 18:42:11",
};

export function TemplateShowcase() {
  const entries = Object.values(TEMPLATE_REGISTRY).filter((e) => e.exposedInLibrary);

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(47,111,237,0.32)]">
            <Camera className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Painting Box
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Template Showcase
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
          <Globe className="h-3 w-3" />
          演示模式 · 仅预览
        </span>
      </header>

      <section className="mx-auto max-w-[1280px] px-6 pb-12 sm:px-10">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            水印模板展示
          </h1>
          <p className="text-[13px] text-muted-foreground">
            内置 {entries.length} 款水印模板，下方使用同一张样图与示例 EXIF 渲染，便于横向对比视觉差异。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <ShowcaseCard
              key={entry.kind}
              kind={entry.kind}
              name={entry.name}
              desc={entry.desc}
            />
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-[1280px] px-6 pb-10 text-[11px] text-muted-foreground/70 sm:px-10">
        Painting Box 是一款基于 Tauri 2 + React 18 的桌面端摄影水印工具，
        本页面仅用于展示模板视觉效果，导入与导出功能仅在桌面端可用。
      </footer>
    </div>
  );
}

function ShowcaseCard({
  kind,
  name,
  desc,
}: {
  kind: TemplateKind;
  name: string;
  desc: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { frameParams, config } = previewParamsFor(kind);
    const logoSelection = resolvePreviewLogoSelection(SAMPLE_EXIF, frameParams, config);
    let cancelled = false;
    void Promise.all([
      loadImage(SAMPLE_IMAGE),
      logoSelection ? loadLogoImage(logoSelection.key, logoSelection.variant) : Promise.resolve(null),
    ]).then(([image, logoImage]) => {
      if (cancelled) return;
      dispatch(kind, canvas, image, logoImage, frameParams, config);
    });
    return () => { cancelled = true; };
  }, [kind]);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/50 bg-white shadow-[0_4px_14px_rgba(148,163,184,0.16)] transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(148,163,184,0.22)]">
      <div className="flex aspect-[3/2] items-center justify-center overflow-hidden bg-[#eef1f6] p-4">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full rounded-md shadow-[0_2px_10px_rgba(17,24,39,0.08)]"
        />
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
          {name}
        </h2>
        <p className="text-[11.5px] leading-snug text-muted-foreground">
          {desc}
        </p>
      </div>
    </article>
  );
}

function dispatch(
  kind: TemplateKind,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  logoImage: HTMLImageElement | null,
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  const photo = { width: SAMPLE_W, height: SAMPLE_H, src: "", exif: SAMPLE_EXIF };
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
  if (kind === "xiaomi-leica") {
    drawXiaomiLeicaPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "photo-album") {
    drawPhotoAlbumPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "crop-marks") {
    drawCropMarksPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "fujifilm-classic") {
    drawFujifilmClassicPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "hasselblad") {
    drawHasselbladPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "darkroom-proof") {
    drawDarkroomProofPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  if (kind === "contact-sheet") {
    drawContactSheetPreview(canvas, image, logoImage, photo, frameParams, config);
    return;
  }
  drawClassicBottomPreview(canvas, image, logoImage, photo, frameParams, config, kind);
}

function previewParamsFor(kind: TemplateKind) {
  const base = getTemplateDefaults(kind);
  return {
    frameParams: { ...base.frameParams, logoKey: "painting-box", logoVariant: "original" },
    config: { ...base.config, showLogo: true },
  };
}
