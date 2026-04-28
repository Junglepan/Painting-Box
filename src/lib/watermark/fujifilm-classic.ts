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

const FUJI_GREEN = "#00643f";
const FUJI_PAPER = "#f5f1e7";
const FUJI_INK = "#161616";
const FUJI_MUTED = "#5a5650";

/**
 * Fujifilm classic style. Cream paper background; photo sits on top with a
 * left "FUJIFILM" green wordmark + film simulation pill on the bottom-left
 * and EXIF / date column on the bottom-right.
 */
export function drawFujifilmClassicPreview(
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

  const sideMargin = canvasW * 0.05;
  const topMargin = canvasH * 0.05;
  const captionH = watermarkActive ? Math.max(96, canvasH * 0.16) : canvasH * 0.05;

  const photoArea = {
    x: sideMargin,
    y: topMargin,
    w: canvasW - sideMargin * 2,
    h: canvasH - topMargin - captionH,
  };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = FUJI_PAPER;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.03;

  // Left: FUJIFILM wordmark + film simulation pill.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const wordmarkSize = Math.max(20, frameParams.fontSize * 1.7);
  ctx.fillStyle = FUJI_GREEN;
  ctx.font = `900 ${wordmarkSize}px ${fontFamily}`;
  ctx.fillText("FUJIFILM", placed.x, captionTop + wordmarkSize * 0.85);

  const wordWidth = ctx.measureText("FUJIFILM").width;

  // Film simulation pill (CLASSIC CHROME by default — falls back to first custom line).
  const customLines = sanitizeCustomLines(config.customLines);
  const sim = (customLines[0] || "CLASSIC CHROME").toUpperCase();
  const pillSize = Math.max(10, frameParams.fontSize - 1);
  ctx.font = `700 ${pillSize}px ${fontFamily}`;
  const pillW = ctx.measureText(sim).width + pillSize * 1.4;
  const pillH = pillSize * 1.9;
  const pillX = placed.x + wordWidth + pillSize * 0.9;
  const pillY = captionTop + wordmarkSize * 0.85 - pillH * 0.78;
  ctx.fillStyle = FUJI_GREEN;
  drawPill(ctx, pillX, pillY, pillW, pillH);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(sim, pillX + pillW / 2, pillY + pillH / 2 + 1);

  // Lens / camera below wordmark.
  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const detail = [camera, lens].filter(Boolean).join("  ·  ");
  if (detail) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = FUJI_MUTED;
    ctx.font = `500 ${Math.max(11, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(detail, placed.x, captionTop + wordmarkSize * 0.85 + Math.max(20, frameParams.fontSize * 1.6));
  }

  // Right: params + date stacked, right-aligned with photo.
  const rightX = placed.x + placed.w;
  const params = config.showParams ? paramsLine(photo.exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  if (params) {
    ctx.fillStyle = FUJI_INK;
    ctx.font = `700 ${Math.max(13, frameParams.fontSize * 1.2)}px ${fontFamily}`;
    ctx.fillText(params, rightX, captionTop + wordmarkSize * 0.85);
  }
  if (date) {
    ctx.fillStyle = FUJI_MUTED;
    ctx.font = `500 ${Math.max(11, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(date, rightX, captionTop + wordmarkSize * 0.85 + Math.max(20, frameParams.fontSize * 1.6));
  }
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
}
