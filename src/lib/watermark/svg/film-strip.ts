import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { cleanDisplayText, formatTakenAt, sanitizeCustomLines } from "../classic-bottom";
import { getCanvasRatio } from "../renderer-utils";
import { closeSvg, SVG_PHOTO_PLACEHOLDER, applySvgMainImageRatio, svgContainedImage, svgFontFamily, svgImage, xmlEscape, type SvgLogoAsset } from "./shared";

const TOP_BAR_RATIO = 0.08;
const BOTTOM_BAR_RATIO = 0.13;
const SPROCKET_BAND_RATIO = 0.06;
const SPROCKET_HOLE_COUNT = 10;

export function buildFilmStripSvg(
  photoW: number,
  photoH: number,
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
  photoHref: string = SVG_PHOTO_PLACEHOLDER,
  canvasBaseWidth: number = 900,
  logo?: SvgLogoAsset | null,
): string {
  const designW = 900;
  const canvasW = Math.max(320, Math.round(canvasBaseWidth));
  const ratio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation, photoW / photoH);
  const canvasH = canvasW / ratio;
  const scale = canvasW / designW;
  const watermarkActive = config.showWatermark ?? true;

  const topBarH = Math.round(canvasH * TOP_BAR_RATIO);
  const bottomBarH = watermarkActive ? Math.max(frameParams.infoBarHeight * scale, Math.round(canvasH * BOTTOM_BAR_RATIO)) : topBarH;
  const sprocketBandW = Math.round(canvasW * SPROCKET_BAND_RATIO);
  const photoArea = applySvgMainImageRatio(
    { x: sprocketBandW, y: topBarH, w: canvasW - sprocketBandW * 2, h: canvasH - topBarH - bottomBarH },
    frameParams.mainImageWidthRatio,
  );
  const photoRatio = photoW / photoH;
  const areaRatio = photoArea.w / photoArea.h;
  const placedW = photoRatio > areaRatio ? photoArea.w : photoArea.h * photoRatio;
  const placedH = photoRatio > areaRatio ? photoArea.w / photoRatio : photoArea.h;
  const photoX = photoArea.x + (photoArea.w - placedW) / 2;
  const photoY = photoArea.y + (photoArea.h - placedH) / 2;

  const fontFamily = svgFontFamily(frameParams.fontFamily);
  const lines = svgRoot(canvasW, canvasH, fontFamily);
  lines.push(`<rect width="${canvasW}" height="${canvasH}" fill="#0a0a0a"/>`);
  lines.push(svgImage(photoHref, photoX, photoY, placedW, placedH));
  lines.push(sprocketHoles(0, sprocketBandW, topBarH, canvasH - bottomBarH));
  lines.push(sprocketHoles(canvasW - sprocketBandW, sprocketBandW, topBarH, canvasH - bottomBarH));

  if (!watermarkActive) return closeSvg(lines);

  const fontSize = Math.max(10 * scale, frameParams.fontSize * scale);
  const textColor = frameParams.textColor || "#f5f5f5";
  const camera = config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
  const lens = config.showLens ? cleanDisplayText(exif.lens) : "";
  const topLabel = [frameNumber(exif), camera || lens].filter(Boolean).join("  ·  ");
  if (topLabel && topBarH >= fontSize + 4 * scale) {
    const px = Math.max(sprocketBandW + 16 * scale, 28 * scale);
    if (logo && config.showLogo) {
      const logoH = Math.max(10 * scale, fontSize);
      lines.push(svgContainedImage(logo.href, px, topBarH / 2 - logoH / 2, logoH * logo.aspectRatio, logoH));
      lines.push(`<text x="${px + logoH * logo.aspectRatio + frameParams.logoGap * scale}" y="${topBarH / 2}" dominant-baseline="middle" font-family="${fontFamily}" font-weight="600" font-size="${Math.max(9 * scale, fontSize - 2 * scale)}" fill="${textColor}" opacity="0.8">${xmlEscape(topLabel)}</text>`);
    } else {
      lines.push(`<text x="${px}" y="${topBarH / 2}" dominant-baseline="middle" font-family="${fontFamily}" font-weight="600" font-size="${Math.max(9 * scale, fontSize - 2 * scale)}" fill="${textColor}" opacity="0.8">${xmlEscape(topLabel)}</text>`);
    }
  }

  const margin = Math.max(sprocketBandW + 20 * scale, 32 * scale);
  const barCenterY = canvasH - bottomBarH / 2;
  const params = config.showParams ? buildParams(exif) : "";
  const dateLine = config.showDate ? formatTakenAt(exif.takenAt, config.dateFormat) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  if (params) {
    lines.push(`<text x="${canvasW - margin}" y="${barCenterY - fontSize * 0.55}" text-anchor="end" dominant-baseline="middle" font-family="${fontFamily}" font-weight="400" font-size="${fontSize}" fill="${textColor}">${xmlEscape(params)}</text>`);
  }
  const detail = [dateLine, ...customLines].filter(Boolean).join("  ·  ");
  if (detail) {
    lines.push(`<text x="${canvasW - margin}" y="${barCenterY + fontSize * 0.55}" text-anchor="end" dominant-baseline="middle" font-family="${fontFamily}" font-weight="400" font-size="${Math.max(9 * scale, fontSize - 2 * scale)}" fill="${textColor}" opacity="0.7">${xmlEscape(detail)}</text>`);
  }

  return closeSvg(lines);
}

function svgRoot(canvasW: number, canvasH: number, fontFamily: string): string[] {
  return [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" font-family="${xmlEscape(fontFamily)}">`];
}

function sprocketHoles(bandX: number, width: number, bandTop: number, bandBottom: number): string {
  const bandH = bandBottom - bandTop;
  const holeWidth = width * 0.55;
  const holeHeight = (bandH / SPROCKET_HOLE_COUNT) * 0.55;
  const holeRadius = Math.min(holeWidth, holeHeight) * 0.25;
  const stride = bandH / SPROCKET_HOLE_COUNT;
  const rects: string[] = [];
  for (let i = 0; i < SPROCKET_HOLE_COUNT; i += 1) {
    const cy = bandTop + stride * (i + 0.5);
    const cx = bandX + width / 2;
    rects.push(`<rect x="${cx - holeWidth / 2}" y="${cy - holeHeight / 2}" width="${holeWidth}" height="${holeHeight}" rx="${holeRadius}" ry="${holeRadius}" fill="#f7f7f0"/>`);
  }
  return rects.join("\n");
}

function buildParams(exif: ExifData): string {
  const items: string[] = [];
  if (exif.focalLength) items.push(`${Math.round(exif.focalLength)}mm`);
  if (exif.aperture) items.push(`f/${trimNumeric(exif.aperture)}`);
  if (exif.shutterSpeed) items.push(exif.shutterSpeed);
  if (exif.iso) items.push(`ISO ${exif.iso}`);
  return items.join("  ·  ");
}

function frameNumber(exif: ExifData): string {
  const match = exif.takenAt.match(/(\d{2})$/);
  if (!match) return "— —";
  return match[1].padStart(2, "0");
}

function trimNumeric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
