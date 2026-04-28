import { normalizeModel } from "@/lib/exif/brand";
import type { FrameParams, TemplateConfig } from "@/stores/types";
import {
  cleanDisplayText,
  formatTakenAt,
  getPreviewFontFamily,
} from "./classic-bottom";
import {
  dprFor,
  fitPhoto,
  getCanvasRatio,
  paramsLine,
  type ShowcasePhoto,
} from "./renderer-utils";

const HASSY_BG = "#0a0a0a";
const HASSY_ORANGE = "#ff8a00";
const HASSY_INK = "#f5f5f5";
const HASSY_MUTED = "#9a958c";

/**
 * Hasselblad style. Pure black canvas, photo near-fullbleed with bold
 * "HASSELBLAD" wordmark below it (orange), and EXIF aligned right. The
 * watermark stays minimalist — only camera/params, no lens or extras.
 */
export function drawHasselbladPreview(
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

  const sideMargin = canvasW * 0.04;
  const topMargin = canvasH * 0.04;
  const captionH = watermarkActive ? Math.max(96, canvasH * 0.14) : 0;

  const photoArea = {
    x: sideMargin,
    y: topMargin,
    w: canvasW - sideMargin * 2,
    h: canvasH - topMargin - captionH - canvasH * 0.04,
  };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = HASSY_BG;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.025;

  // Left: HASSELBLAD wordmark in orange — wide letterspacing for the premium feel.
  const wordSize = Math.max(20, canvasW * 0.034);
  ctx.fillStyle = HASSY_ORANGE;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `700 ${wordSize}px ${fontFamily}`;
  drawSpacedText(ctx, "HASSELBLAD", placed.x, captionTop + wordSize * 0.9, wordSize * 0.18);

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const subline = [camera, lens].filter(Boolean).join("  ·  ");
  if (subline) {
    ctx.fillStyle = HASSY_MUTED;
    ctx.font = `400 ${Math.max(11, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(subline, placed.x, captionTop + wordSize * 0.9 + Math.max(20, frameParams.fontSize * 1.6));
  }

  // Right: params + date.
  const rightX = placed.x + placed.w;
  const params = config.showParams ? paramsLine(photo.exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";

  ctx.textAlign = "right";
  if (params) {
    ctx.fillStyle = HASSY_INK;
    ctx.font = `500 ${Math.max(13, frameParams.fontSize * 1.2)}px ${fontFamily}`;
    ctx.fillText(params, rightX, captionTop + wordSize * 0.9);
  }
  if (date) {
    ctx.fillStyle = HASSY_MUTED;
    ctx.font = `400 ${Math.max(11, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(date, rightX, captionTop + wordSize * 0.9 + Math.max(20, frameParams.fontSize * 1.6));
  }
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}
