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

const PAPER_BLACK = "#0d0d0d";
const PAPER_WHITE = "#f5efe1";
const PAPER_INK = "#1a1a1a";
const PAPER_MUTED = "#666058";
const PROOF_RED = "#b22222";

/**
 * Darkroom proof print. Black canvas with a creamy white photo paper that
 * has the photo printed inside; below the photo, a "PROOF" stamp in red
 * and the EXIF in old-typewriter style metadata.
 */
export function drawDarkroomProofPreview(
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

  // Photo paper layout — wide white border around the photo, like darkroom prints.
  const paperPadX = canvasW * 0.06;
  const paperPadTop = canvasH * 0.06;
  const captionH = watermarkActive ? Math.max(76, canvasH * 0.14) : canvasH * 0.06;
  const paperX = canvasW * 0.04;
  const paperY = canvasH * 0.04;
  const paperW = canvasW - paperX * 2;
  const paperH = canvasH - paperY * 2;
  const photoArea = {
    x: paperX + paperPadX,
    y: paperY + paperPadTop,
    w: paperW - paperPadX * 2,
    h: paperH - paperPadTop - captionH,
  };
  const placed = fitPhoto(photoArea, photo.width, photo.height);

  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  canvas.style.aspectRatio = `${canvasW} / ${canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = PAPER_BLACK;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // White photo paper.
  ctx.fillStyle = PAPER_WHITE;
  ctx.fillRect(paperX, paperY, paperW, paperH);

  ctx.drawImage(image, placed.x, placed.y, placed.w, placed.h);

  if (!watermarkActive) return;

  const fontFamily = getPreviewFontFamily(frameParams.fontFamily);
  const captionTop = placed.y + placed.h + canvasH * 0.025;

  // PROOF stamp (rotated -8°), positioned over the bottom-left.
  ctx.save();
  const stampX = placed.x;
  const stampY = captionTop + Math.max(28, canvasH * 0.045);
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.14);
  const stampSize = Math.max(22, canvasW * 0.038);
  ctx.font = `900 ${stampSize}px ${fontFamily}`;
  ctx.fillStyle = PROOF_RED;
  ctx.strokeStyle = PROOF_RED;
  ctx.lineWidth = 2;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const stampText = "PROOF";
  const stampW = ctx.measureText(stampText).width;
  ctx.strokeRect(-6, -stampSize * 0.95, stampW + 12, stampSize * 1.25);
  ctx.fillText(stampText, 0, 0);
  ctx.restore();

  const camera = config.showCamera
    ? normalizeModel(photo.exif.camera.make, photo.exif.camera.model)
    : "";
  const lens = config.showLens ? cleanDisplayText(photo.exif.lens) : "";
  const customLines = sanitizeCustomLines(config.customLines);

  // Right column — typewriter feel using mono-leaning font + monospaced fallback.
  const rightX = placed.x + placed.w;
  const meta = [
    config.showParams ? paramsLine(photo.exif, "  ") : "",
    [camera, lens].filter(Boolean).join("  ·  "),
    config.showDate ? formatTakenAt(photo.exif.takenAt, config.dateFormat) : "",
    customLines[0] || "",
  ].filter(Boolean);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  const lineSize = Math.max(11, frameParams.fontSize);
  meta.forEach((line, i) => {
    ctx.font = `${i === 0 ? "700" : "500"} ${lineSize}px "Courier New", "Menlo", ${fontFamily}`;
    ctx.fillStyle = i === 0 ? PAPER_INK : PAPER_MUTED;
    ctx.fillText(line, rightX, captionTop + i * lineSize * 1.55 + lineSize);
  });
}
