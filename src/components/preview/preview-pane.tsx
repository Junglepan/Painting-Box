import { useEffect, useMemo, useRef, useState } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF, effectiveShowWatermark } from "@/stores/types";
import type { ExifData } from "@/stores/types";
import { makeSvgResponsive, svgAspectRatio, svgDataUrl, type SvgLogoAsset } from "@/lib/watermark/svg/shared";
import { buildWatermarkSvgTemplate, SVG_TEMPLATE_KINDS } from "@/lib/watermark/svg/templates";
import { resolvePreviewLogoSelection } from "@/lib/watermark/classic-bottom";
import { getLogoSvg } from "@/lib/tauri/logo";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayedSvgUrlRef = useRef<string | null>(null);
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null);
  const [svgLogoAsset, setSvgLogoAsset] = useState<SvgLogoAsset | null | undefined>(undefined);
  const [mockImageHref, setMockImageHref] = useState<string | null>(null);

  const svgPreviewReady =
    SVG_TEMPLATE_KINDS.has(currentKind) &&
    selected?.previewStatus === "ready" &&
    Boolean(selected.thumbnailDataUrl && selected.width && selected.height);

  const logoSelection = useMemo(() => {
    if (!SVG_TEMPLATE_KINDS.has(currentKind)) return null;
    const photoExif = selected ? selected.exif ?? EMPTY_EXIF : MOCK_EXIF;
    const effectiveConfig = selected
      ? { ...config, showWatermark: effectiveShowWatermark(selected, config.showWatermark) }
      : { ...config, showCamera: true, showLens: true, showParams: false, showLogo: true };
    const effectiveFrameParams = selected
      ? frameParams
      : { ...frameParams, logoKey: "painting-box", logoVariant: "original" };
    return resolvePreviewLogoSelection(photoExif, effectiveFrameParams, effectiveConfig);
  }, [config, currentKind, frameParams, selected]);

  const logoKey = logoSelection?.key ?? null;
  const logoVariant = logoSelection?.variant ?? null;

  useEffect(() => {
    if (!logoKey || !logoVariant) {
      setSvgLogoAsset(null);
      return;
    }
    let cancelled = false;
    void getLogoSvg(logoKey, logoVariant).then((svg) => {
      if (cancelled) return;
      setSvgLogoAsset(svg ? { href: svgDataUrl(svg), aspectRatio: svgAspectRatio(svg) } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [logoKey, logoVariant]);

  useEffect(() => {
    if (selected || !SVG_TEMPLATE_KINDS.has(currentKind)) return;
    let cancelled = false;
    void imageHrefToDataUrl(MOCK_IMAGE_SRC).then((href) => {
      if (!cancelled) setMockImageHref(href);
    });
    return () => {
      cancelled = true;
    };
  }, [currentKind, selected]);

  // SVG-path preview: single source of truth with export.
  const svgString = useMemo(() => {
    if (!SVG_TEMPLATE_KINDS.has(currentKind)) return null;
    if (!selected) {
      if (!mockImageHref) return null;
      // Mock preview: branding text over default image.
      const mockCfg = { ...config, showCamera: true, showLens: true, showParams: false, showLogo: true };
      return buildWatermarkSvgTemplate(
        { width: MOCK_W, height: MOCK_H, exif: MOCK_EXIF },
        currentKind,
        frameParams,
        mockCfg,
        mockImageHref,
        900,
        svgLogoAsset,
      );
    }
    if (!selected.thumbnailDataUrl || !selected.width || !selected.height) return null;
    const effCfg = { ...config, showWatermark: effectiveShowWatermark(selected, config.showWatermark) };
    return buildWatermarkSvgTemplate(
      { ...selected, exif: selected.exif ?? EMPTY_EXIF },
      currentKind,
      frameParams,
      effCfg,
      selected.thumbnailDataUrl,
      900,
      svgLogoAsset,
    );
  }, [currentKind, selected, config, frameParams, svgLogoAsset, mockImageHref]);

  useEffect(() => {
    if (!svgString) {
      if (displayedSvgUrlRef.current) {
        URL.revokeObjectURL(displayedSvgUrlRef.current);
        displayedSvgUrlRef.current = null;
      }
      setSvgPreviewUrl(null);
      return;
    }

    let adopted = false;
    let cancelled = false;
    const responsiveSvg = makeSvgResponsive(svgString);
    const nextUrl = URL.createObjectURL(new Blob([responsiveSvg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      adopted = true;
      const previousUrl = displayedSvgUrlRef.current;
      displayedSvgUrlRef.current = nextUrl;
      setSvgPreviewUrl(nextUrl);
      if (previousUrl) URL.revokeObjectURL(previousUrl);
    };
    image.onerror = () => {
      if (!adopted) URL.revokeObjectURL(nextUrl);
    };
    image.src = nextUrl;

    return () => {
      cancelled = true;
      if (!adopted) URL.revokeObjectURL(nextUrl);
    };
  }, [svgString]);

  useEffect(() => {
    return () => {
      if (displayedSvgUrlRef.current) {
        URL.revokeObjectURL(displayedSvgUrlRef.current);
        displayedSvgUrlRef.current = null;
      }
    };
  }, []);

  // Loading skeleton
  if (selected && !svgPreviewReady) {
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

  return (
    <div
      ref={containerRef}
      className="surface-inset relative flex h-full w-full items-center justify-center overflow-hidden p-4"
    >
      {svgPreviewUrl ? (
        <img
          src={svgPreviewUrl}
          alt=""
          className="block h-full w-full object-contain shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
          draggable={false}
        />
      ) : null}
    </div>
  );
}

async function imageHrefToDataUrl(href: string): Promise<string | null> {
  try {
    const response = await fetch(href);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("默认预览图加载失败"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
