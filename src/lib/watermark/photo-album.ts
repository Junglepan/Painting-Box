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

const ALBUM_BG = "#ede2cc";
const ALBUM_INK = "#3b3024";
const TRIANGLE_COLOR = "#241c14";
const PHOTO_PAPER = "#fdfaf2";

/**
 * Old photo album template: cream textured-feeling bg with the photo
 * mounted via 4 dark triangular corner mounts. EXIF/date appears as a
 * handwritten-feeling caption beneath the photo.
 */
export function drawPhotoAlbumPreview(
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

  const captionH = watermarkActive ? Math.max(56, canvasH * 0.11) : 0;
  const sideMargin = canvasW * 0.08;
  const topMargin = canvasH * 0.06;
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

  ctx.fillStyle = ALBUM_BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Soft drop shadow under the photo paper.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = PHOTO_PAPER;
  const paperPad = 6;
  ctx.fillRect(
    placed.x - paperPad,
    placed.y - paperPad,
    placed.w + paperPad * 2,
    placed.h + paperPad * 2,
  );
  ctx.restore();

  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  // 4 corner triangle mounts.
  const triSize = Math.max(28, Math.min(placed.w, placed.h) * 0.075);
  drawCornerTriangle(ctx, placed.x, placed.y, triSize, "tl");
  drawCornerTriangle(ctx, placed.x + placed.w, placed.y, triSize, "tr");
  drawCornerTriangle(ctx, placed.x, placed.y + placed.h, triSize, "bl");
  drawCornerTriangle(ctx, placed.x + placed.w, placed.y + placed.h, triSize, "br");

  if (!watermarkActive) return;

  // Handwritten-feeling caption below the photo.
  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const captionY = placed.y + placed.h + paperPad + canvasH * 0.04;

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const date = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";
  const customLines = sanitizeCustomLines(config.customLines);
  const left = customLines[0] || camera;
  const right = date || customLines[1] || "";

  ctx.fillStyle = ALBUM_INK;
  ctx.textBaseline = "middle";

  const sizePrimary = Math.max(15, frameParams.fontSize * 1.4);
  const sizeSecondary = Math.max(11, frameParams.fontSize * 1.05);

  if (left) {
    ctx.textAlign = "left";
    // Italic lends a hand-script feel without adding a custom font dep.
    ctx.font = `italic 500 ${sizePrimary}px ${fontFamily}`;
    ctx.fillText(left, placed.x, captionY);
  }
  if (right) {
    ctx.textAlign = "right";
    ctx.font = `italic 400 ${sizeSecondary}px ${fontFamily}`;
    ctx.fillStyle = "#5a4a36";
    ctx.fillText(right, placed.x + placed.w, captionY);
  }
}

type Corner = "tl" | "tr" | "bl" | "br";

function drawCornerTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  corner: Corner,
) {
  ctx.save();
  ctx.fillStyle = TRIANGLE_COLOR;
  ctx.beginPath();
  if (corner === "tl") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
  } else if (corner === "tr") {
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x, y + size);
  } else if (corner === "bl") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y - size);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x, y - size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
