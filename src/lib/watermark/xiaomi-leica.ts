import { normalizeModel } from "@/lib/exif/brand";
import type { FrameParams, TemplateConfig } from "@/stores/types";
import {
  cleanDisplayText,
  formatTakenAt,
  getPreviewFontFamily,
  sanitizeCustomLines,
} from "./classic-bottom";
import {
  dprFor,
  fitPhoto,
  getCanvasRatio,
  paramsLine,
  type ShowcasePhoto,
} from "./renderer-utils";

const LEICA_RED = "#e20612";
const BAR_HEIGHT_RATIO = 0.16;

/**
 * Xiaomi × Leica style watermark.
 * Photo on top, white bottom bar with: left = camera/lens, center = vertical
 * red separator, right = exposure params. A thin red rule sits at the bottom
 * of the white bar.
 */
export function drawXiaomiLeicaPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  _logo: HTMLImageElement | null,
  photo: ShowcasePhoto,
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = dprFor(canvas);
  const baseWidth = 900;
  const ratio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation);
  const canvasW = baseWidth;
  const canvasH = canvasW / ratio;
  const watermarkActive = config.showWatermark ?? true;
  const barH = watermarkActive ? Math.max(80, Math.round(canvasH * BAR_HEIGHT_RATIO)) : 0;

  const photoArea = { x: 0, y: 0, w: canvasW, h: canvasH - barH };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const barTop = canvasH - barH;
  const cx = canvasW / 2;
  const padding = Math.max(28, canvasW * 0.04);

  // Red rule across the very bottom of the bar.
  ctx.fillStyle = LEICA_RED;
  ctx.fillRect(0, canvasH - 3, canvasW, 3);

  // Center red vertical divider.
  const redBarH = barH * 0.62;
  ctx.fillStyle = LEICA_RED;
  ctx.fillRect(cx - 1.5, barTop + (barH - redBarH) / 2, 3, redBarH);

  // Left column: camera model + lens (or custom first line).
  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lensRaw = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const leftPrimary = camera || customLines[0] || "";
  const leftSecondary =
    lensRaw || (camera ? customLines[0] : customLines[1]) || "";

  ctx.fillStyle = "#1a1a1a";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (leftPrimary) {
    ctx.font = `700 ${Math.max(18, frameParams.fontSize * 1.6)}px ${fontFamily}`;
    ctx.fillText(leftPrimary, padding, barTop + barH * 0.45);
  }
  if (leftSecondary) {
    ctx.fillStyle = "#7d7d7d";
    ctx.font = `500 ${Math.max(11, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(leftSecondary, padding, barTop + barH * 0.72);
  }

  // Right column: focal/aperture/shutter/iso, with optional date below.
  ctx.textAlign = "right";
  const params = config.showParams ? paramsLine(photo.exif, "  ") : "";
  const dateLine = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";

  if (params) {
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `700 ${Math.max(15, frameParams.fontSize * 1.4)}px ${fontFamily}`;
    ctx.fillText(params, canvasW - padding, barTop + barH * 0.45);
  }
  if (dateLine) {
    ctx.fillStyle = "#7d7d7d";
    ctx.font = `500 ${Math.max(10, frameParams.fontSize - 1)}px ${fontFamily}`;
    ctx.fillText(dateLine, canvasW - padding, barTop + barH * 0.72);
  }
}
