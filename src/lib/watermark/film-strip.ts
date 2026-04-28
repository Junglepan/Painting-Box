import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import {
  cleanDisplayText,
  formatTakenAt,
  getPreviewFontFamily,
  sanitizeCustomLines,
} from "./classic-bottom";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

const TOP_BAR_RATIO = 0.08;
const BOTTOM_BAR_RATIO = 0.13;
const SPROCKET_BAND_RATIO = 0.06;
const SPROCKET_HOLE_COUNT = 10;

export function drawFilmStripPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  logoImage: HTMLImageElement | null,
  photo: PreviewData,
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const baseWidth = 900;
  const watermarkActive = config.showWatermark ?? true;

  const canvasRatio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation);
  const canvasW = baseWidth;
  const canvasH = canvasW / canvasRatio;

  const topBarH = Math.round(canvasH * TOP_BAR_RATIO);
  const bottomBarH = watermarkActive ? Math.round(canvasH * BOTTOM_BAR_RATIO) : topBarH;
  const sprocketBandW = Math.round(canvasW * SPROCKET_BAND_RATIO);

  const photoArea = {
    x: sprocketBandW,
    y: topBarH,
    w: canvasW - sprocketBandW * 2,
    h: canvasH - topBarH - bottomBarH,
  };
  const photoRatio = photo.width / photo.height;
  const areaRatio = photoArea.w / photoArea.h;
  let photoW: number;
  let photoH: number;
  if (photoRatio > areaRatio) {
    photoW = photoArea.w;
    photoH = photoW / photoRatio;
  } else {
    photoH = photoArea.h;
    photoW = photoH * photoRatio;
  }
  const photoX = photoArea.x + (photoArea.w - photoW) / 2;
  const photoY = photoArea.y + (photoArea.h - photoH) / 2;

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Filmstrip body (slightly off-black for that aged film look).
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.drawImage(image, photoX, photoY, photoW, photoH);

  drawSprocketHoles(ctx, {
    bandX: 0,
    width: sprocketBandW,
    bandTop: topBarH,
    bandBottom: canvasH - bottomBarH,
  });
  drawSprocketHoles(ctx, {
    bandX: canvasW - sprocketBandW,
    width: sprocketBandW,
    bandTop: topBarH,
    bandBottom: canvasH - bottomBarH,
  });

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const fontSize = Math.max(10, frameParams.fontSize);
  const textColor = frameParams.textColor || "#f5f5f5";

  // Top band: frame number style indicator (e.g. "01 · LEICA M11").
  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const topLabel = [frameNumber(photo.exif), camera || lens].filter(Boolean).join("  ·  ");

  if (topLabel && topBarH >= fontSize + 4) {
    ctx.fillStyle = `${textColor}cc`;
    ctx.font = `600 ${Math.max(9, fontSize - 2)}px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const px = Math.max(sprocketBandW + 16, 28);
    ctx.fillText(topLabel, px, topBarH / 2);
  }

  // Bottom band: params + date + custom lines.
  const params = config.showParams ? buildParams(photo.exif) : "";
  const dateLine = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";
  const customLines = sanitizeCustomLines(config.customLines);

  const barCenterY = canvasH - bottomBarH / 2;
  const margin = Math.max(sprocketBandW + 20, 32);

  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";

  if (config.showLogo && logoImage) {
    const logoBox = calcLogoBox(logoImage, fontSize * 1.5);
    ctx.drawImage(
      logoImage,
      margin,
      barCenterY - logoBox.height / 2,
      logoBox.width,
      logoBox.height,
    );
  }

  ctx.font = `400 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "right";
  if (params) {
    ctx.fillText(params, canvasW - margin, barCenterY - fontSize * 0.55);
  }
  const detail = [dateLine, ...customLines].filter(Boolean).join("  ·  ");
  if (detail) {
    ctx.fillStyle = `${textColor}b3`;
    ctx.font = `400 ${Math.max(9, fontSize - 2)}px ${fontFamily}`;
    ctx.fillText(detail, canvasW - margin, barCenterY + fontSize * 0.55);
  }
}

function drawSprocketHoles(
  ctx: CanvasRenderingContext2D,
  args: { bandX: number; width: number; bandTop: number; bandBottom: number },
) {
  const { bandX, width, bandTop, bandBottom } = args;
  const bandH = bandBottom - bandTop;
  const holeWidth = width * 0.55;
  const holeHeight = bandH / SPROCKET_HOLE_COUNT * 0.55;
  const holeRadius = Math.min(holeWidth, holeHeight) * 0.25;
  const stride = bandH / SPROCKET_HOLE_COUNT;

  ctx.save();
  ctx.fillStyle = "#f7f7f0";
  for (let i = 0; i < SPROCKET_HOLE_COUNT; i += 1) {
    const cy = bandTop + stride * (i + 0.5);
    const cx = bandX + width / 2;
    roundRect(
      ctx,
      cx - holeWidth / 2,
      cy - holeHeight / 2,
      holeWidth,
      holeHeight,
      holeRadius,
    );
    ctx.fill();
  }
  ctx.restore();
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
  // Pseudo frame number derived from takenAt seconds; falls back to "—".
  const match = exif.takenAt.match(/(\d{2})$/);
  if (!match) return "— —";
  return match[1].padStart(2, "0");
}

function trimNumeric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function calcLogoBox(image: HTMLImageElement, targetHeight: number) {
  const w = Math.max(1, image.naturalWidth);
  const h = Math.max(1, image.naturalHeight);
  const height = Math.max(12, targetHeight);
  return { width: height * (w / h), height };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getCanvasRatio(
  ratio: FrameParams["canvasRatio"],
  orientation: FrameParams["canvasOrientation"],
) {
  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) return 3 / 2;
  return orientation === "portrait" ? rh / rw : rw / rh;
}
