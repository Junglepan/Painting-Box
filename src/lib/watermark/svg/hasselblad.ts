import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { cleanDisplayText, formatTakenAt } from "../classic-bottom";
import { fitPhoto, getCanvasRatio, paramsLine } from "../renderer-utils";
import { applySvgWidthRatio, closeSvg, isPortraitPhoto, shouldStackMetadata, SVG_PHOTO_PLACEHOLDER, svgFontFamily, svgImage, xmlEscape } from "./shared";

const HASSY_BG = "#0a0a0a";
const HASSY_ORANGE = "#ff8a00";
const HASSY_INK = "#f5f5f5";
const HASSY_MUTED = "#9a958c";

export function buildHasselbladSvg(
  photoW: number,
  photoH: number,
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
  photoHref: string = SVG_PHOTO_PLACEHOLDER,
  canvasBaseWidth: number = 900,
): string {
  const designW = 900;
  const canvasW = Math.max(320, Math.round(canvasBaseWidth));
  const ratio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation);
  const canvasH = canvasW / ratio;
  const scale = canvasW / designW;
  const watermarkActive = config.showWatermark ?? true;
  const sideMargin = Math.max(canvasW * 0.015, canvasW * (frameParams.minTopBottomMargin / 100));
  const topMargin = Math.max(canvasH * 0.025, canvasW * (frameParams.minTopBottomMargin / 100));
  const captionH = watermarkActive ? Math.max(frameParams.infoBarHeight * scale * 0.8, 60 * scale, canvasH * 0.1) : 0;
  const placed = fitPhoto(
    applySvgWidthRatio(
      { x: sideMargin, y: topMargin, w: canvasW - sideMargin * 2, h: canvasH - topMargin - captionH - canvasH * 0.025 },
      frameParams.mainImageWidthRatio,
    ),
    photoW,
    photoH,
  );

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`];
  lines.push(`<rect width="${canvasW}" height="${canvasH}" fill="${HASSY_BG}"/>`);
  lines.push(svgImage(photoHref, placed.x, placed.y, placed.w, placed.h));
  if (!watermarkActive) return closeSvg(lines);

  const portraitPhotoLayout = isPortraitPhoto(photoW, photoH);
  const watermarkX = portraitPhotoLayout ? Math.max(24 * scale, canvasW * 0.03) : placed.x;
  const fontFamily = svgFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.03;
  const wordSize = Math.max(20 * scale, canvasW * 0.034);
  const wordBaseline = captionTop + wordSize * 0.9;
  lines.push(`<text x="${watermarkX}" y="${wordBaseline}" font-family="${fontFamily}" font-weight="700" font-size="${wordSize}" letter-spacing="${wordSize * 0.18}" fill="${HASSY_ORANGE}">HASSELBLAD</text>`);

  const camera = config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
  const lens = config.showLens ? cleanDisplayText(exif.lens) : "";
  const subline = [camera, lens].filter(Boolean).join("  ·  ");
  const detailSize = Math.max(11 * scale, frameParams.fontSize * scale);
  const detailGap = Math.max(20 * scale, frameParams.fontSize * 1.6 * scale);
  let lowerBaseline = wordBaseline;
  if (subline) {
    lowerBaseline = wordBaseline + detailGap;
    lines.push(`<text x="${watermarkX}" y="${lowerBaseline}" font-family="${fontFamily}" font-weight="400" font-size="${detailSize}" fill="${HASSY_MUTED}">${xmlEscape(subline)}</text>`);
  }

  const rightX = portraitPhotoLayout ? canvasW - watermarkX : placed.x + placed.w;
  const params = config.showParams ? paramsLine(exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(exif.takenAt, config.dateFormat) : "";
  const paramsSize = Math.max(13 * scale, frameParams.fontSize * 1.2 * scale);
  const stackMetadata = !portraitPhotoLayout && shouldStackMetadata(placed.w, canvasW);
  if (params) {
    const paramsY = stackMetadata ? lowerBaseline + detailGap : wordBaseline;
    const anchor = stackMetadata ? "" : ` text-anchor="end"`;
    const x = stackMetadata ? watermarkX : rightX;
    lines.push(`<text x="${x}" y="${paramsY}"${anchor} font-family="${fontFamily}" font-weight="500" font-size="${paramsSize}" fill="${HASSY_INK}">${xmlEscape(params)}</text>`);
    lowerBaseline = Math.max(lowerBaseline, paramsY);
  }
  if (date) {
    const dateY = stackMetadata ? lowerBaseline + detailGap : wordBaseline + detailGap;
    const anchor = stackMetadata ? "" : ` text-anchor="end"`;
    const x = stackMetadata ? watermarkX : rightX;
    lines.push(`<text x="${x}" y="${dateY}"${anchor} font-family="${fontFamily}" font-weight="400" font-size="${detailSize}" fill="${HASSY_MUTED}">${xmlEscape(date)}</text>`);
  }
  return closeSvg(lines);
}

