import type { ExifData, FrameParams, Photo, TemplateConfig, TemplateKind } from "@/stores/types";
import { buildFilmStripSvg } from "./film-strip";
import { buildFujifilmClassicSvg } from "./fujifilm-classic";
import { buildHasselbladSvg } from "./hasselblad";
import { SVG_PHOTO_PLACEHOLDER, type SvgLogoAsset } from "./shared";
import { buildGenericSvgForKind } from "./simple-templates";
import { buildXiaomiLeicaSvg } from "./xiaomi-leica";

const EMPTY_EXIF: ExifData = {
  camera: { make: "", model: "" },
  lens: "",
  focalLength: 0,
  aperture: 0,
  shutterSpeed: "",
  iso: 0,
  takenAt: "",
};

export const SVG_TEMPLATE_KINDS = new Set<TemplateKind>([
  "classic-bottom",
  "magazine",
  "minimal-corner",
  "cinematic",
  "cinema-scope",
  "film-strip",
  "xiaomi-leica",
  "photo-album",
  "crop-marks",
  "fujifilm-classic",
  "hasselblad",
  "darkroom-proof",
  "contact-sheet",
]);

export function buildWatermarkSvgTemplate(
  photo: Pick<Photo, "width" | "height" | "exif">,
  kind: TemplateKind,
  frameParams: FrameParams,
  config: TemplateConfig,
  photoHref: string = SVG_PHOTO_PLACEHOLDER,
  canvasBaseWidth: number = Math.max(900, Math.round(photo.width ?? 900)),
  logo?: SvgLogoAsset | null,
): string | undefined {
  const photoW = photo.width ?? 900;
  const photoH = photo.height ?? 600;
  const exif = photo.exif ?? EMPTY_EXIF;

  if (kind === "fujifilm-classic") {
    return buildFujifilmClassicSvg(photoW, photoH, exif, frameParams, config, photoHref, canvasBaseWidth);
  }
  if (kind === "film-strip") {
    return buildFilmStripSvg(photoW, photoH, exif, frameParams, config, photoHref, canvasBaseWidth, logo);
  }
  if (kind === "xiaomi-leica") {
    return buildXiaomiLeicaSvg(photoW, photoH, exif, frameParams, config, photoHref, canvasBaseWidth);
  }
  if (kind === "hasselblad") {
    return buildHasselbladSvg(photoW, photoH, exif, frameParams, config, photoHref, canvasBaseWidth);
  }
  return buildGenericSvgForKind(kind, {
    photoW,
    photoH,
    exif,
    frameParams,
    config,
    photoHref,
    canvasBaseWidth,
    logo,
  });
}
