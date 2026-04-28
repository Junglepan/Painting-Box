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

const TOP_BAR_RATIO = 0.13;
const BOTTOM_BAR_RATIO = 0.16;

export function drawCinematicPreview(
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
  const photoArea = { x: 0, y: topBarH, w: canvasW, h: canvasH - topBarH - bottomBarH };

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

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.drawImage(image, photoX, photoY, photoW, photoH);

  if (!watermarkActive) return;

  const left = buildBrandLine(photo.exif, config);
  const right = buildParamsLine(photo.exif, config);
  const customLines = sanitizeCustomLines(config.customLines);
  const dateLine = config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "";

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const fontSize = Math.max(11, frameParams.fontSize);
  const margin = 32;
  const barCenterY = canvasH - bottomBarH / 2;
  const textColor = frameParams.textColor || "#f5f5f5";

  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";

  const logoBox = config.showLogo && logoImage
    ? calcLogoBox(logoImage, fontSize * 1.6)
    : null;

  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  let cursorX = margin;
  if (logoBox) {
    ctx.drawImage(logoImage!, cursorX, barCenterY - logoBox.height / 2, logoBox.width, logoBox.height);
    cursorX += logoBox.width + frameParams.logoGap + 4;
  }
  if (left) {
    ctx.textAlign = "left";
    ctx.fillText(left, cursorX, barCenterY);
  }

  if (right) {
    ctx.textAlign = "right";
    ctx.font = `400 ${fontSize}px ${fontFamily}`;
    ctx.fillText(right, canvasW - margin, barCenterY);
  }

  // Optional 2nd row inside bottom bar: date + customLines
  const extras = [dateLine, ...customLines].filter(Boolean);
  if (extras.length > 0 && bottomBarH >= fontSize * 2.6) {
    ctx.font = `400 ${Math.max(9, fontSize - 2)}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillStyle = `${textColor}${textColor.length === 7 ? "b3" : ""}`;
    ctx.fillText(extras.join("  ·  "), canvasW / 2, canvasH - 14);
  }
}

function buildBrandLine(exif: ExifData, config: TemplateConfig): string {
  const parts: string[] = [];
  if (config.showCamera) {
    const camera = normalizeModel(exif.camera.make, exif.camera.model);
    if (camera) parts.push(camera);
  }
  if (config.showLens) {
    const lens = cleanDisplayText(exif.lens);
    if (lens) parts.push(lens);
  }
  return parts.join("  ·  ");
}

function buildParamsLine(exif: ExifData, config: TemplateConfig): string {
  if (!config.showParams) return "";
  const items: string[] = [];
  if (exif.focalLength) items.push(`${Math.round(exif.focalLength)}mm`);
  if (exif.aperture) items.push(`f/${trimNumeric(exif.aperture)}`);
  if (exif.shutterSpeed) items.push(exif.shutterSpeed);
  if (exif.iso) items.push(`ISO ${exif.iso}`);
  return items.join("  ·  ");
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

function getCanvasRatio(
  ratio: FrameParams["canvasRatio"],
  orientation: FrameParams["canvasOrientation"],
) {
  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) return 16 / 9;
  return orientation === "portrait" ? rh / rw : rw / rh;
}
