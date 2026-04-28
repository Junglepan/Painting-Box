import { normalizeModel } from "@/lib/exif/brand";
import type { FrameParams, TemplateConfig } from "@/stores/types";
import {
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

const SHEET_BG = "#0a0a0a";
const SHEET_INK = "#f5f5f5";
const SHEET_MUTED = "#a8a8a8";
const SHEET_FRAME = "#ffffff";

/**
 * Contact sheet / proof contact print. Black background with the photo
 * matted by a thin white "frame number" border. Top + bottom edges carry a
 * row of sprocket holes like 35mm film. Bottom-right shows the EXIF.
 */
export function drawContactSheetPreview(
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

  const perfH = Math.max(18, canvasH * 0.045);
  const sideMargin = canvasW * 0.07;
  const captionH = watermarkActive ? Math.max(78, canvasH * 0.14) : 0;

  const photoArea = {
    x: sideMargin,
    y: perfH + canvasH * 0.025,
    w: canvasW - sideMargin * 2,
    h: canvasH - perfH * 2 - captionH - canvasH * 0.06,
  };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = SHEET_BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  drawSprocketRow(ctx, 0, 0, canvasW, perfH);
  drawSprocketRow(ctx, 0, canvasH - perfH, canvasW, perfH);

  // White photo-mat frame.
  const matPad = Math.max(3, canvasW * 0.005);
  ctx.fillStyle = SHEET_FRAME;
  ctx.fillRect(
    placed.x - matPad,
    placed.y - matPad,
    placed.w + matPad * 2,
    placed.h + matPad * 2,
  );
  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.035;

  // Frame number — ROLL / FRAME labelling reminiscent of contact sheets.
  ctx.fillStyle = SHEET_INK;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const labelSize = Math.max(11, frameParams.fontSize * 1.05);
  ctx.font = `700 ${labelSize}px "Courier New", "Menlo", ${fontFamily}`;
  ctx.fillText("→ FRAME 24A", placed.x, captionTop + labelSize);

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const subline = camera || customLines[0] || "";
  if (subline) {
    ctx.fillStyle = SHEET_MUTED;
    ctx.font = `400 ${Math.max(10, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(subline, placed.x, captionTop + labelSize + Math.max(16, frameParams.fontSize * 1.4));
  }

  // Right: params + date in mono.
  const rightX = placed.x + placed.w;
  const params = config.showParams ? paramsLine(photo.exif, "  ") : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";
  ctx.textAlign = "right";
  if (params) {
    ctx.fillStyle = SHEET_INK;
    ctx.font = `700 ${labelSize}px "Courier New", "Menlo", ${fontFamily}`;
    ctx.fillText(params, rightX, captionTop + labelSize);
  }
  if (date) {
    ctx.fillStyle = SHEET_MUTED;
    ctx.font = `400 ${Math.max(10, frameParams.fontSize)}px "Courier New", "Menlo", ${fontFamily}`;
    ctx.fillText(date, rightX, captionTop + labelSize + Math.max(16, frameParams.fontSize * 1.4));
  }
}

function drawSprocketRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const holeH = h * 0.55;
  const holeW = h * 0.85;
  const gap = holeW * 1.1;
  const total = holeW + gap;
  const count = Math.floor(w / total);
  const offset = (w - count * total + gap) / 2;
  const holeY = y + (h - holeH) / 2;
  ctx.fillStyle = "#f5f5f5";
  for (let i = 0; i < count; i++) {
    const hx = x + offset + i * total;
    roundedRect(ctx, hx, holeY, holeW, holeH, 2);
    ctx.fill();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
