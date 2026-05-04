import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { cleanDisplayText, formatTakenAt, sanitizeCustomLines } from "../classic-bottom";
import { fitPhoto, getCanvasRatio, paramsLine } from "../renderer-utils";
import { closeSvg, SVG_PHOTO_PLACEHOLDER, applySvgMainImageRatio, svgFontFamily, svgImage, xmlEscape } from "./shared";

const LEICA_RED = "#e20612";
const BAR_HEIGHT_RATIO = 0.16;

export function buildXiaomiLeicaSvg(
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
  const barH = watermarkActive ? Math.max(frameParams.infoBarHeight * scale, 80 * scale, Math.round(canvasH * BAR_HEIGHT_RATIO)) : 0;
  const placed = fitPhoto(applySvgMainImageRatio({ x: 0, y: 0, w: canvasW, h: canvasH - barH }, frameParams.mainImageWidthRatio), photoW, photoH);

  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`];
  lines.push(`<rect width="${canvasW}" height="${canvasH}" fill="#ffffff"/>`);
  lines.push(svgImage(photoHref, placed.x, placed.y, placed.w, placed.h));
  if (!watermarkActive) return closeSvg(lines);

  const fontFamily = svgFontFamily(frameParams.fontFamily);
  const barTop = canvasH - barH;
  const cx = canvasW / 2;
  const padding = Math.max(28 * scale, canvasW * 0.04);
  lines.push(`<rect x="0" y="${canvasH - 3 * scale}" width="${canvasW}" height="${3 * scale}" fill="${LEICA_RED}"/>`);
  const redBarH = barH * 0.62;
  lines.push(`<rect x="${cx - 1.5 * scale}" y="${barTop + (barH - redBarH) / 2}" width="${3 * scale}" height="${redBarH}" fill="${LEICA_RED}"/>`);

  const camera = config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
  const lensRaw = config.showLens ? cleanDisplayText(exif.lens) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const leftPrimary = camera || customLines[0] || "";
  const leftSecondary = lensRaw || (camera ? customLines[0] : customLines[1]) || "";
  const primarySize = Math.max(18 * scale, frameParams.fontSize * 1.6 * scale);
  const secondarySize = Math.max(11 * scale, frameParams.fontSize * scale);
  const paramsSize = Math.max(15 * scale, frameParams.fontSize * 1.4 * scale);
  const dateSize = Math.max(10 * scale, (frameParams.fontSize - 1) * scale);
  if (leftPrimary) {
    lines.push(`<text x="${padding}" y="${barTop + barH * 0.45}" font-family="${fontFamily}" font-weight="700" font-size="${primarySize}" fill="#1a1a1a">${xmlEscape(leftPrimary)}</text>`);
  }
  if (leftSecondary) {
    lines.push(`<text x="${padding}" y="${barTop + barH * 0.72}" font-family="${fontFamily}" font-weight="500" font-size="${secondarySize}" fill="#7d7d7d">${xmlEscape(leftSecondary)}</text>`);
  }

  const params = config.showParams ? paramsLine(exif, "  ") : "";
  const dateLine = config.showDate ? formatTakenAt(exif.takenAt, config.dateFormat) : "";
  if (params) {
    lines.push(`<text x="${canvasW - padding}" y="${barTop + barH * 0.45}" text-anchor="end" font-family="${fontFamily}" font-weight="700" font-size="${paramsSize}" fill="#1a1a1a">${xmlEscape(params)}</text>`);
  }
  if (dateLine) {
    lines.push(`<text x="${canvasW - padding}" y="${barTop + barH * 0.72}" text-anchor="end" font-family="${fontFamily}" font-weight="500" font-size="${dateSize}" fill="#7d7d7d">${xmlEscape(dateLine)}</text>`);
  }
  return closeSvg(lines);
}

