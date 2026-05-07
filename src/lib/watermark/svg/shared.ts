import type { WatermarkFontFamily } from "@/stores/types";

export const SVG_PHOTO_PLACEHOLDER = "__FUJI_PHOTO__";

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function svgImage(photoHref: string, x: number, y: number, width: number, height: number): string {
  const href = xmlEscape(photoHref);
  return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${href}" xlink:href="${href}" preserveAspectRatio="none"/>`;
}

export function svgContainedImage(href: string, x: number, y: number, width: number, height: number): string {
  const safeHref = xmlEscape(href);
  return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${safeHref}" xlink:href="${safeHref}" preserveAspectRatio="xMidYMid meet"/>`;
}

export type SvgLogoAsset = {
  href: string;
  aspectRatio: number;
};

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ensureSvgDimensions(svg))}`;
}

export function svgAspectRatio(svg: string): number {
  const explicit = svg.match(/\bwidth="([0-9.]+)"[^>]*\bheight="([0-9.]+)"/);
  if (explicit) return safeRatio(Number(explicit[1]), Number(explicit[2]));
  const viewBox = svg.match(/viewBox="[^"]*\s+([0-9.]+)\s+([0-9.]+)"/);
  if (viewBox) return safeRatio(Number(viewBox[1]), Number(viewBox[2]));
  return 3;
}

function ensureSvgDimensions(svg: string): string {
  if (/\bwidth\s*=/.test(svg) && /\bheight\s*=/.test(svg)) return svg;
  const match = svg.match(/viewBox="[^"]*\s+([0-9.]+)\s+([0-9.]+)"/);
  if (!match) return svg;
  return svg.replace("<svg", `<svg width="${match[1]}" height="${match[2]}"`);
}

function safeRatio(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) return 3;
  return Math.min(8, Math.max(0.25, width / height));
}

export type SvgRect = { x: number; y: number; w: number; h: number };

export function applySvgWidthRatio(area: SvgRect, ratioPercent: number): SvgRect {
  const ratio = Math.min(100, Math.max(1, Number.isFinite(ratioPercent) ? ratioPercent : 100)) / 100;
  const w = area.w * ratio;
  return { x: area.x + (area.w - w) / 2, y: area.y, w, h: area.h };
}

export function applySvgMainImageRatio(area: SvgRect, ratioPercent: number): SvgRect {
  const ratio = Math.min(100, Math.max(1, Number.isFinite(ratioPercent) ? ratioPercent : 100)) / 100;
  const w = area.w * ratio;
  const h = area.h * ratio;
  return {
    x: area.x + (area.w - w) / 2,
    y: area.y + (area.h - h) / 2,
    w,
    h,
  };
}

export function svgFontFamily(fontFamily: WatermarkFontFamily): string {
  switch (fontFamily) {
    case "noto-sans-sc":
      return "Noto Sans SC Thin, Inter, sans-serif";
    case "pingfang-sc":
      return "Noto Sans SC Thin, Inter, sans-serif";
    case "playfair-display":
      return "Playfair Display, Inter, serif";
    case "bebas-neue":
      return "Bebas Neue, Inter, sans-serif";
    case "arial":
      return "Inter, sans-serif";
    case "inter":
    default:
      return "Inter, sans-serif";
  }
}

export function blurBackgroundSvg(
  photoHref: string,
  canvasW: number,
  canvasH: number,
  blurRadius: number,
  scale: number,
): string {
  // sRGB interpolation prevents linearRGB color shift at edges. The fractalNoise
  // dither layer at ~5% opacity masks 8-bit quantization banding in smooth blurred
  // gradients — same trick Instagram/Apple system blur uses to hide stepping.
  const std = Math.max(1, Math.round(blurRadius * scale * 0.45));
  const safeHref = xmlEscape(photoHref);
  return [
    `<defs>`,
    `<filter id="pb-bg-blur" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${std}"/></filter>`,
    `<filter id="pb-bg-dither" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">`,
    `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="3"/>`,
    `<feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"/>`,
    `</filter>`,
    `</defs>`,
    `<image x="0" y="0" width="${canvasW}" height="${canvasH}" href="${safeHref}" xlink:href="${safeHref}" preserveAspectRatio="xMidYMid slice" filter="url(#pb-bg-blur)"/>`,
    `<rect width="${canvasW}" height="${canvasH}" fill="rgba(0,0,0,0.22)"/>`,
    `<rect width="${canvasW}" height="${canvasH}" filter="url(#pb-bg-dither)" opacity="0.05"/>`,
  ].join("\n");
}

export function closeSvg(lines: string[]): string {
  lines.push("</svg>");
  return lines.join("\n");
}

export function shouldStackMetadata(photoWidth: number, canvasWidth: number): boolean {
  return photoWidth < canvasWidth * 0.58;
}

export function isPortraitPhoto(photoW: number, photoH: number): boolean {
  return photoH > photoW;
}

export function makeSvgResponsive(svg: string): string {
  return svg.replace(
    /<svg([^>]*?)\s+width="[^"]*"\s+height="[^"]*"/,
    '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;"',
  );
}
