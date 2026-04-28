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

const RULE_COLOR = "#0a0a0a";

/**
 * Swiss / International Style template. Strict 12-column-ish grid: photo
 * occupies the upper region with a thin black rule under it. Below the rule:
 *  - left: oversized model in heavy weight
 *  - right: stacked exposure + date in a smaller monospaced-feeling weight
 */
export function drawSwissGridPreview(
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

  const sideGutter = canvasW * 0.06;
  const topGutter = canvasH * 0.06;
  const captionH = watermarkActive ? Math.max(110, canvasH * 0.18) : 0;

  const photoArea = {
    x: sideGutter,
    y: topGutter,
    w: canvasW - sideGutter * 2,
    h: canvasH - topGutter - captionH - canvasH * 0.04,
  };
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

  // Rule beneath the photo aligned to the photo edges (Swiss hallmark).
  const ruleY = placed.y + placed.h + canvasH * 0.025;
  ctx.fillStyle = RULE_COLOR;
  ctx.fillRect(placed.x, ruleY, placed.w, 2);

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const labelTop = ruleY + canvasH * 0.025;

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const headline = (camera || customLines[0] || "PAINTING BOX").toUpperCase();
  const tagline = lens || customLines[customLines.length - 1] || "";

  // Headline — heavy and oversized.
  const headlineSize = Math.min(canvasW * 0.07, 56);
  ctx.fillStyle = "#0a0a0a";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `800 ${headlineSize}px ${fontFamily}`;
  ctx.fillText(headline, placed.x, labelTop + headlineSize * 0.85);

  if (tagline) {
    const tagSize = Math.max(11, frameParams.fontSize);
    ctx.fillStyle = "#404040";
    ctx.font = `500 ${tagSize}px ${fontFamily}`;
    ctx.fillText(tagline, placed.x, labelTop + headlineSize * 0.85 + tagSize * 1.6);
  }

  // Right side: exposure params + date stacked, right-aligned with photo.
  const rightX = placed.x + placed.w;
  const params = config.showParams ? paramsLine(photo.exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";

  ctx.textAlign = "right";
  const metaSize = Math.max(11, frameParams.fontSize);
  ctx.font = `500 ${metaSize}px ${fontFamily}`;
  ctx.fillStyle = "#0a0a0a";
  if (params) {
    ctx.fillText(params, rightX, labelTop + metaSize * 1.2);
  }
  if (date) {
    ctx.fillStyle = "#7d7d7d";
    ctx.fillText(date, rightX, labelTop + metaSize * 1.2 + metaSize * 1.5);
  }

  // Page number in corner (Swiss design tic).
  ctx.fillStyle = "#7d7d7d";
  ctx.font = `500 ${Math.max(9, frameParams.fontSize - 2)}px ${fontFamily}`;
  ctx.textAlign = "right";
  ctx.fillText("01 / 01", canvasW - sideGutter, canvasH - canvasH * 0.025);
}
