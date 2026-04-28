import type { FrameParams, TemplateConfig } from "@/stores/types";
import { formatTakenAt } from "./classic-bottom";
import {
  dprFor,
  fitPhoto,
  getCanvasRatio,
  type ShowcasePhoto,
} from "./renderer-utils";

const LCD_ORANGE = "#ff7a00";
const LCD_GLOW = "rgba(255,122,0,0.45)";

/**
 * Date stamp template — emulates the LCD orange date burn-in of late-90s
 * point-and-shoot cameras. Photo fills the canvas; the date sits in the
 * lower-right with a faint glow.
 */
export function drawDateStampPreview(
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

  const placed = fitPhoto(
    { x: 0, y: 0, w: canvasW, h: canvasH },
    photo.width,
    photo.height,
  );

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const date = config.showDate
    ? formatTakenAt(photo.exif.takenAt, config.dateFormat) || formatTakenAt(photo.exif.takenAt, "YYYY-MM-DD")
    : "";
  if (!date) return;

  const stampText = formatStamp(date);

  const fontSize = Math.max(28, Math.min(canvasW * 0.045, frameParams.fontSize * 4.5));
  // Stack monospace fallbacks; users picking Bebas Neue / Inter still get a
  // chunky LCD-ish glyph because we set a heavy weight too.
  ctx.font = `700 ${fontSize}px "Courier New", "Menlo", monospace`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";

  const margin = Math.max(20, canvasW * 0.03);
  const x = placed.x + placed.w - margin;
  const y = placed.y + placed.h - margin;

  ctx.save();
  ctx.shadowColor = LCD_GLOW;
  ctx.shadowBlur = 18;
  ctx.fillStyle = LCD_ORANGE;
  ctx.fillText(stampText, x, y);
  ctx.restore();
}

function formatStamp(input: string): string {
  // Convert "2026-04-28" → "'26 4 28" for that vintage LCD look. Falls back
  // to the original string if it doesn't match the expected pattern.
  const m = input.match(/^(\d{2})(\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return input;
  const yy = m[2];
  const mm = String(Number(m[3]));
  const dd = m[4];
  return `'${yy}  ${mm}  ${dd}`;
}
