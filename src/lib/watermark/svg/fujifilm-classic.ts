import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { cleanDisplayText, formatTakenAt, sanitizeCustomLines } from "../classic-bottom";
import { fitPhoto, getCanvasRatio, paramsLine } from "../renderer-utils";

export const FUJI_PHOTO_PLACEHOLDER = "__FUJI_PHOTO__";

const FUJI_GREEN = "#00643f";
const FUJI_PAPER = "#f5f1e7";
const FUJI_INK = "#161616";
const FUJI_MUTED = "#5a5650";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the Fujifilm Classic template as a standalone SVG document.
 *
 * Geometry mirrors `fujifilm-classic.ts` (Canvas renderer) exactly so the
 * same calculation drives both browser preview (inline SVG) and resvg export.
 *
 * @param photoHref  URL or data-URL for the photo; use FUJI_PHOTO_PLACEHOLDER
 *                   when generating the template for Rust export.
 */
export function buildFujifilmClassicSvg(
  photoW: number,
  photoH: number,
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
  photoHref: string = FUJI_PHOTO_PLACEHOLDER,
  renderWidth: number = 900,
): string {
  const ratio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation);
  const layoutW = 900;
  const layoutH = layoutW / ratio;
  const outW = Math.max(320, Math.round(renderWidth));
  const outH = Math.max(240, Math.round(outW / ratio));
  const watermarkActive = config.showWatermark ?? true;

  const sideMargin = layoutW * 0.05;
  const topMargin = layoutH * 0.05;
  const captionH = watermarkActive ? Math.max(96, layoutH * 0.16) : layoutH * 0.05;

  const photoArea = { x: sideMargin, y: topMargin, w: layoutW - sideMargin * 2, h: layoutH - topMargin - captionH };
  const placed = fitPhoto(photoArea, photoW, photoH);

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${layoutW} ${layoutH}">`);
  lines.push(`<rect width="${layoutW}" height="${layoutH}" fill="${FUJI_PAPER}"/>`);
  const hrefEscaped = xmlEscape(photoHref);
  lines.push(`<image x="${placed.x}" y="${placed.y}" width="${placed.w}" height="${placed.h}" href="${hrefEscaped}" preserveAspectRatio="none"/>`);

  if (!watermarkActive) {
    lines.push("</svg>");
    return lines.join("\n");
  }

  const fontFamily = "Inter";
  const captionTop = placed.y + placed.h + layoutH * 0.03;
  const wordmarkSize = Math.max(20, frameParams.fontSize * 1.7);
  const wordmarkBaseline = captionTop + wordmarkSize * 0.85;
  const detailSize = Math.max(11, frameParams.fontSize);
  const paramsSize = Math.max(13, frameParams.fontSize * 1.2);
  const detailGap = Math.max(20, frameParams.fontSize * 1.6);
  const detailBaseline = wordmarkBaseline + detailGap;

  lines.push(`<text x="${placed.x}" y="${wordmarkBaseline}" font-family="${fontFamily}" font-weight="900" font-size="${wordmarkSize}" fill="${FUJI_GREEN}">FUJIFILM</text>`);

  // Film simulation pill — approximate FUJIFILM advance width for placement
  // (consistent across browser + resvg since both use the same formula, not measureText).
  const customLines = sanitizeCustomLines(config.customLines);
  const sim = (customLines[0] || "CLASSIC CHROME").toUpperCase();
  const pillSize = Math.max(10, frameParams.fontSize - 1);
  const approxWordW = wordmarkSize * 0.62 * 8.0;
  const pillW = pillSize * sim.length * 0.62 + pillSize * 1.4;
  const pillH = pillSize * 1.9;
  const pillX = placed.x + approxWordW + pillSize * 0.9;
  const pillY = wordmarkBaseline - pillH * 0.78;
  const r = pillH / 2;
  lines.push(`<g>`);
  lines.push(`  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${r}" ry="${r}" fill="${FUJI_GREEN}"/>`);
  lines.push(`  <text x="${pillX + pillW / 2}" y="${pillY + pillH / 2 + pillSize * 0.35}" text-anchor="middle" font-family="${fontFamily}" font-weight="700" font-size="${pillSize}" fill="#ffffff">${xmlEscape(sim)}</text>`);
  lines.push(`</g>`);

  // Camera + lens detail
  const camera = config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
  const lens = config.showLens ? cleanDisplayText(exif.lens) : "";
  const detail = [camera, lens].filter(Boolean).join("  ·  ");
  if (detail) {
    lines.push(`<text x="${placed.x}" y="${detailBaseline}" font-family="${fontFamily}" font-weight="500" font-size="${detailSize}" fill="${FUJI_MUTED}">${xmlEscape(detail)}</text>`);
  }

  // Right: params + date
  const rightX = placed.x + placed.w;
  const params = config.showParams ? paramsLine(exif, "  /  ") : "";
  const date = config.showDate ? formatTakenAt(exif.takenAt, config.dateFormat) : "";
  if (params) {
    lines.push(`<text x="${rightX}" y="${wordmarkBaseline}" text-anchor="end" font-family="${fontFamily}" font-weight="700" font-size="${paramsSize}" fill="${FUJI_INK}">${xmlEscape(params)}</text>`);
  }
  if (date) {
    lines.push(`<text x="${rightX}" y="${detailBaseline}" text-anchor="end" font-family="${fontFamily}" font-weight="500" font-size="${detailSize}" fill="${FUJI_MUTED}">${xmlEscape(date)}</text>`);
  }

  lines.push("</svg>");
  return lines.join("\n");
}
