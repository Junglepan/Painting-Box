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

const MARK_COLOR = "#0a0a0a";
const MARK_LEN = 24;
const MARK_GAP = 8;

/**
 * Pre-press / crop-marks template. White canvas, photo centered with a wide
 * margin. L-shaped trim marks at each corner (offset from photo edge). A
 * CMYK-style color swatch strip sits under the photo alongside EXIF metadata.
 */
export function drawCropMarksPreview(
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

  const margin = canvasW * 0.1;
  const photoArea = {
    x: margin,
    y: margin,
    w: canvasW - margin * 2,
    h: canvasH - margin * 2,
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

  drawLMark(ctx, placed.x - MARK_GAP, placed.y - MARK_GAP, "tl");
  drawLMark(ctx, placed.x + placed.w + MARK_GAP, placed.y - MARK_GAP, "tr");
  drawLMark(ctx, placed.x - MARK_GAP, placed.y + placed.h + MARK_GAP, "bl");
  drawLMark(ctx, placed.x + placed.w + MARK_GAP, placed.y + placed.h + MARK_GAP, "br");

  // CMYK color strip + metadata below photo.
  const stripY = placed.y + placed.h + MARK_GAP + MARK_LEN + 8;
  const swatchW = Math.min(24, placed.w * 0.04);
  const swatchH = swatchW;
  const cmyk = ["#00b0f0", "#e83e8c", "#ffe600", "#0a0a0a"];
  cmyk.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(placed.x + i * (swatchW + 3), stripY, swatchW, swatchH);
  });

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const metaSize = Math.max(10, frameParams.fontSize - 1);
  ctx.font = `400 ${metaSize}px ${fontFamily}`;
  ctx.fillStyle = "#404040";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const leftLabel = camera || lens || customLines[0] || "";
  if (leftLabel) {
    ctx.fillText(leftLabel, placed.x + cmyk.length * (swatchW + 3) + 10, stripY + swatchH / 2);
  }

  const params = config.showParams ? paramsLine(photo.exif, "  ·  ") : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";
  const rightLabel = [params, date].filter(Boolean).join("    ");
  if (rightLabel) {
    ctx.textAlign = "right";
    ctx.fillText(rightLabel, placed.x + placed.w, stripY + swatchH / 2);
  }
}

type Corner = "tl" | "tr" | "bl" | "br";

function drawLMark(ctx: CanvasRenderingContext2D, x: number, y: number, corner: Corner) {
  ctx.save();
  ctx.strokeStyle = MARK_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  if (corner === "tl") {
    ctx.moveTo(x - MARK_LEN, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - MARK_LEN);
  } else if (corner === "tr") {
    ctx.moveTo(x + MARK_LEN, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - MARK_LEN);
  } else if (corner === "bl") {
    ctx.moveTo(x - MARK_LEN, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + MARK_LEN);
  } else {
    ctx.moveTo(x + MARK_LEN, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + MARK_LEN);
  }

  ctx.stroke();
  ctx.restore();
}
