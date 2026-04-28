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
  type ShowcasePhoto,
} from "./renderer-utils";

const SLIDE_PAPER = "#f5f3ed";
const SLIDE_FRAME = "#fafaf6";
const SLIDE_FRAME_SHADOW = "rgba(0,0,0,0.16)";
const SLIDE_INK = "#1a1a1a";
const KODAK_RED = "#cb1f27";
const KODAK_YELLOW = "#ffce00";

/**
 * Kodak slide / Kodachrome 35mm transparency look. Cream backdrop with a
 * slightly off-white slide-mount frame around the photo; the bottom frame
 * carries a red "KODACHROME" stripe and date stamp typical of mounted slides.
 */
export function drawKodakSlidePreview(
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

  // Slide mount: thicker bottom edge to host the Kodachrome stripe.
  const sideFrame = canvasW * 0.05;
  const topFrame = canvasH * 0.07;
  const bottomFrame = watermarkActive ? Math.max(72, canvasH * 0.16) : topFrame;

  const slideX = canvasW * 0.06;
  const slideY = canvasH * 0.05;
  const slideW = canvasW - slideX * 2;
  const slideH = canvasH - slideY * 2;
  const photoArea = {
    x: slideX + sideFrame,
    y: slideY + topFrame,
    w: slideW - sideFrame * 2,
    h: slideH - topFrame - bottomFrame,
  };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = SLIDE_PAPER;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Slide mount with a subtle drop shadow.
  ctx.save();
  ctx.shadowColor = SLIDE_FRAME_SHADOW;
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = SLIDE_FRAME;
  ctx.fillRect(slideX, slideY, slideW, slideH);
  ctx.restore();

  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  // Photo cutout border (1px black) — emulates slide aperture cut.
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1;
  ctx.strokeRect(placed.x - 0.5, placed.y - 0.5, placed.w + 1, placed.h + 1);

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const stripeTop = placed.y + placed.h + canvasH * 0.025;
  const stripeH = Math.max(22, canvasH * 0.04);
  const stripeW = slideW - sideFrame * 2;

  // KODACHROME red stripe.
  ctx.fillStyle = KODAK_RED;
  ctx.fillRect(placed.x, stripeTop, stripeW, stripeH);

  // Inset yellow rule on top edge.
  ctx.fillStyle = KODAK_YELLOW;
  ctx.fillRect(placed.x, stripeTop, stripeW, 2);

  // KODACHROME wordmark left + date right.
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const wordSize = Math.max(11, frameParams.fontSize * 1.1);
  ctx.font = `800 ${wordSize}px ${fontFamily}`;
  ctx.fillText("KODACHROME 64", placed.x + stripeH * 0.5, stripeTop + stripeH / 2);

  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";
  if (date) {
    ctx.textAlign = "right";
    ctx.font = `600 ${wordSize}px ${fontFamily}`;
    ctx.fillText(date, placed.x + stripeW - stripeH * 0.5, stripeTop + stripeH / 2);
  }

  // Camera under stripe in slide-mount black ink.
  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const subline = camera || customLines[0] || "";
  if (subline) {
    ctx.fillStyle = SLIDE_INK;
    ctx.textAlign = "center";
    ctx.font = `500 ${Math.max(10, frameParams.fontSize)}px ${fontFamily}`;
    ctx.fillText(subline, placed.x + stripeW / 2, stripeTop + stripeH + Math.max(14, frameParams.fontSize));
  }
}
