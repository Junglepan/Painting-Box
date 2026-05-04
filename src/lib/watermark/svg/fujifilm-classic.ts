import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { cleanDisplayText, formatTakenAt, sanitizeCustomLines } from "../classic-bottom";
import { fitPhoto, getCanvasRatio, paramsLine } from "../renderer-utils";
import { applySvgWidthRatio, closeSvg, isPortraitPhoto, makeSvgResponsive, shouldStackMetadata, SVG_PHOTO_PLACEHOLDER, svgFontFamily, svgImage, xmlEscape } from "./shared";

export const FUJI_PHOTO_PLACEHOLDER = SVG_PHOTO_PLACEHOLDER;

const FUJI_GREEN = "#00643f";
const FUJI_PAPER = "#f5f1e7";
const FUJI_INK = "#161616";
const FUJI_MUTED = "#5a5650";

export function buildFujifilmClassicSvg(
  photoW: number,
  photoH: number,
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
  photoHref: string = FUJI_PHOTO_PLACEHOLDER,
  canvasBaseWidth: number = 900,
): string {
  const DESIGN_W = 900;
  const ratio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation, photoW / photoH);
  const canvasW = Math.max(320, Math.round(canvasBaseWidth));
  const canvasH = canvasW / ratio;
  const scale = canvasW / DESIGN_W;
  const watermarkActive = config.showWatermark ?? true;

  const sideMargin = Math.max(canvasW * 0.015, canvasW * (frameParams.minTopBottomMargin / 100));
  const topMargin = Math.max(canvasH * 0.025, canvasW * (frameParams.minTopBottomMargin / 100));
  const captionH = watermarkActive ? Math.max(frameParams.infoBarHeight * scale, 64 * scale, canvasH * 0.11) : canvasH * 0.035;

  const photoArea = applySvgWidthRatio(
    { x: sideMargin, y: topMargin, w: canvasW - sideMargin * 2, h: canvasH - topMargin - captionH },
    frameParams.mainImageWidthRatio,
  );
  const placed = fitPhoto(photoArea, photoW, photoH);

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`);
  lines.push(`<rect width="${canvasW}" height="${canvasH}" fill="${FUJI_PAPER}"/>`);
  lines.push(svgImage(photoHref, placed.x, placed.y, placed.w, placed.h));

  if (!watermarkActive) {
    lines.push("</svg>");
    return lines.join("\n");
  }

  const portraitPhotoLayout = isPortraitPhoto(photoW, photoH);
  const watermarkX = portraitPhotoLayout ? Math.max(24 * scale, canvasW * 0.03) : placed.x;
  const fontFamily = svgFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.035;
  const wordmarkSize = Math.max(20 * scale, frameParams.fontSize * 1.7 * scale);
  const wordmarkBaseline = captionTop + wordmarkSize * 0.85;
  const detailSize = Math.max(11 * scale, frameParams.fontSize * scale);
  const paramsSize = Math.max(13 * scale, frameParams.fontSize * 1.2 * scale);
  const detailGap = Math.max(20 * scale, frameParams.fontSize * 1.6 * scale);
  const detailBaseline = wordmarkBaseline + detailGap;

  lines.push(`<text x="${watermarkX}" y="${wordmarkBaseline}" font-family="${fontFamily}" font-weight="900" font-size="${wordmarkSize}" fill="${FUJI_GREEN}">FUJIFILM</text>`);

  // Film simulation pill — approximate FUJIFILM advance width for placement
  // (consistent across browser + resvg since both use the same formula, not measureText).
  const customLines = sanitizeCustomLines(config.customLines);
  const sim = (customLines[0] || "CLASSIC CHROME").toUpperCase();
  const pillSize = Math.max(10 * scale, (frameParams.fontSize - 1) * scale);
  const approxWordW = wordmarkSize * 0.62 * 8.0;
  const pillW = pillSize * sim.length * 0.62 + pillSize * 1.4;
  const pillH = pillSize * 1.9;
  const pillX = watermarkX + approxWordW + pillSize * 0.9;
  const pillY = wordmarkBaseline - pillH * 0.78;
  const r = pillH / 2;
  lines.push(`<g>`);
  lines.push(`  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${r}" ry="${r}" fill="${FUJI_GREEN}"/>`);
  lines.push(`  <text x="${pillX + pillW / 2}" y="${pillY + pillH / 2 + pillSize * 0.35}" text-anchor="middle" font-family="${fontFamily}" font-weight="700" font-size="${pillSize}" fill="#ffffff">${xmlEscape(sim)}</text>`);
  lines.push(`</g>`);

  // Camera + lens detail
  const camera = config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
  const lens = config.showLens ? cleanDisplayText(exif.lens) : "";
  const detail = [camera, lens].filter(Boolean).join("  ·  ");
  let lowerBaseline = wordmarkBaseline;
  if (detail) {
    lowerBaseline = detailBaseline;
    lines.push(`<text x="${watermarkX}" y="${lowerBaseline}" font-family="${fontFamily}" font-weight="500" font-size="${detailSize}" fill="${FUJI_MUTED}">${xmlEscape(detail)}</text>`);
  }

  // Right: params + date
  const rightX = portraitPhotoLayout ? canvasW - watermarkX : placed.x + placed.w;
  const params = config.showParams ? paramsLine(exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(exif.takenAt, config.dateFormat) : "";
  const stackMetadata = !portraitPhotoLayout && shouldStackMetadata(placed.w, canvasW);
  if (params) {
    const paramsY = stackMetadata ? lowerBaseline + detailGap : wordmarkBaseline;
    const anchor = stackMetadata ? "" : ` text-anchor="end"`;
    const x = stackMetadata ? watermarkX : rightX;
    lines.push(`<text x="${x}" y="${paramsY}"${anchor} font-family="${fontFamily}" font-weight="700" font-size="${paramsSize}" fill="${FUJI_INK}">${xmlEscape(params)}</text>`);
    lowerBaseline = Math.max(lowerBaseline, paramsY);
  }
  if (date) {
    const dateY = stackMetadata ? lowerBaseline + detailGap : detailBaseline;
    const anchor = stackMetadata ? "" : ` text-anchor="end"`;
    const x = stackMetadata ? watermarkX : rightX;
    lines.push(`<text x="${x}" y="${dateY}"${anchor} font-family="${fontFamily}" font-weight="500" font-size="${detailSize}" fill="${FUJI_MUTED}">${xmlEscape(date)}</text>`);
  }

  return closeSvg(lines);
}

export function makeFujifilmClassicSvgResponsive(svg: string): string {
  return makeSvgResponsive(svg);
}

