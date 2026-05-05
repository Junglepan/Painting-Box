import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig, TemplateKind } from "@/stores/types";
import {
  buildPreviewLines,
  buildPreviewRenderPlan,
  buildRenderableLines,
  cleanDisplayText,
  resolveReadableTextAndDivider,
} from "../classic-bottom";
import { WATERMARK_LAYOUT_SPEC } from "../layout-spec";
import { fitPhoto, getCanvasRatio, paramsLine } from "../renderer-utils";
import { applySvgMainImageRatio, applySvgWidthRatio, isPortraitPhoto, shouldStackMetadata, SVG_PHOTO_PLACEHOLDER, svgContainedImage, svgFontFamily, svgImage, xmlEscape, type SvgLogoAsset, type SvgRect } from "./shared";

type SvgArgs = {
  photoW: number;
  photoH: number;
  exif: ExifData;
  frameParams: FrameParams;
  config: TemplateConfig;
  photoHref?: string;
  canvasBaseWidth?: number;
  logo?: SvgLogoAsset | null;
};

export function buildClassicBottomSvg(args: SvgArgs) {
  const g = base(args, args.frameParams.bgColor || "#ffffff");
  const watermarkActive = args.config.showWatermark ?? true;
  const logo = watermarkActive && args.config.showLogo ? args.logo : null;
  const renderLines = watermarkActive
    ? buildRenderableLines(buildPreviewLines(args.exif, args.config), Boolean(logo))
    : [];
  const primaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinPrimaryFontSize * g.scale,
    args.frameParams.fontSize * WATERMARK_LAYOUT_SPEC.primaryFontScale * g.scale,
  );
  const secondaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinSecondaryFontSize * g.scale,
    args.frameParams.fontSize * WATERMARK_LAYOUT_SPEC.secondaryFontScale * g.scale,
  );
  const extraLineGap = WATERMARK_LAYOUT_SPEC.baseLineGapPx * g.scale;
  const totalTextHeight = renderLines.reduce(
    (sum, _line, index) =>
      sum + (index === 0 ? primaryFontSize : secondaryFontSize) + (index === 0 ? 0 : extraLineGap),
    0,
  );
  const plan = buildPreviewRenderPlan({
    photoWidth: args.photoW,
    photoHeight: args.photoH,
    frameParams: args.frameParams,
    templateKind: "classic-bottom",
    totalTextHeight,
    logoOnlyWatermark: false,
    showWatermark: watermarkActive,
    baseWidth: g.canvasW,
  });
  const lines = root(g);
  lines.push(backgroundElements(args, g));
  lines.push(photoElement(args, g, plan.imageX, plan.imageY, plan.photoW, plan.photoH));
  if (watermarkActive) {
    const readable = resolveReadableTextAndDivider({
      autoTextContrast: args.frameParams.autoTextContrast,
      averageLuminance: backgroundLuminance(args.frameParams),
      fallbackTextColor: args.frameParams.textColor,
      fallbackDividerColor: args.frameParams.dividerColor,
    });
    const centerX = g.canvasW / 2;
    let cursorY = plan.blockTop;
    renderLines.forEach((line, index) => {
      if (index > 0) cursorY += extraLineGap;
      const fontSize = index === 0 ? primaryFontSize : secondaryFontSize;
      if (index === 0 && logo) {
        lines.push(inlineLogoAndText(logo, centerX, cursorY, fontSize, line, fontSize, readable.textColor, "middle", g.scale, args.frameParams.logoSize, args.frameParams.logoGap));
      } else {
        lines.push(text(centerX, cursorY + fontSize, line, fontSize, "700", readable.textColor, "middle"));
      }
      cursorY += fontSize;
    });
  }
  return closeTemplate(lines);
}

export function buildMinimalCornerSvg(args: SvgArgs) {
  const g = base(args, "#ffffff");
  const margin = Math.max(g.canvasW * 0.04, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const label = cameraLabel(args.exif, args.config) || paramsLine(args.exif, "  /  ");
  const size = Math.max(9 * g.scale, args.frameParams.fontSize * g.scale);
  const logoH = args.logo && args.config.showLogo ? minimalCornerLogoHeight(args, g.scale) : 0;
  const watermarkContentH = Math.max(logoH, label ? size : 0);
  const watermarkH = g.watermarkActive && watermarkContentH > 0
    ? Math.max(36 * g.scale, watermarkContentH + 24 * g.scale)
    : 0;
  const area = {
    x: margin,
    y: margin,
    w: g.canvasW - margin * 2,
    h: Math.max(1, g.canvasH - margin * 2 - watermarkH),
  };
  const placed = fitPhoto(tunablePhotoArea(args, area), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#ffffff"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive && watermarkContentH > 0) {
    const rightInset = Math.min(16 * g.scale, placed.w * 0.04);
    const right = placed.x + placed.w - rightInset;
    const watermarkTop = Math.min(
      g.canvasH - margin - watermarkContentH,
      Math.max(placed.y + placed.h, placed.y + placed.h + Math.max(14 * g.scale, watermarkH * 0.32)),
    );
    if (args.logo && args.config.showLogo) {
      const logoW = logoH * args.logo.aspectRatio;
      lines.push(svgContainedImage(args.logo.href, right - logoW, watermarkTop, logoW, logoH));
    } else if (label) {
      lines.push(text(right, watermarkTop + size, label, size, "600", args.frameParams.textColor || "#111827", "end"));
    }
  }
  return closeTemplate(lines);
}

export function buildCinematicSvg(args: SvgArgs) {
  const g = base(args, "#000000");
  const topBarH = g.canvasH * 0.09;
  const bottomBarH = g.watermarkActive ? scaledBarH(args, g, g.canvasH * 0.14) : topBarH;
  const placed = fitPhoto(tunablePhotoArea(args, { x: 0, y: topBarH, w: g.canvasW, h: g.canvasH - topBarH - bottomBarH }), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#000000"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive) {
    const size = Math.max(11 * g.scale, args.frameParams.fontSize * g.scale);
    const y = g.canvasH - bottomBarH / 2;
    const left = brandLine(args.exif, args.config);
    const right = args.config.showParams ? paramsLine(args.exif, "  ·  ") : "";
    if (args.logo && args.config.showLogo) {
      const logoH = logoHeight(args, g.scale, size);
      lines.push(svgContainedImage(args.logo.href, 32 * g.scale, y - logoH / 2, logoH * args.logo.aspectRatio, logoH));
      if (left) lines.push(text(32 * g.scale + logoH * args.logo.aspectRatio + args.frameParams.logoGap * g.scale, y, left, size, "600", args.frameParams.textColor || "#f5f5f5", "start", "middle"));
    } else if (left) lines.push(text(32 * g.scale, y, left, size, "600", args.frameParams.textColor || "#f5f5f5", "start", "middle"));
    if (right) lines.push(text(g.canvasW - 32 * g.scale, y, right, size, "400", args.frameParams.textColor || "#f5f5f5", "end", "middle"));
  }
  return closeTemplate(lines);
}

export function buildCropMarksSvg(args: SvgArgs) {
  const g = base(args, "#ffffff");
  const margin = Math.max(g.canvasW * 0.06, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const placed = fitPhoto(tunablePhotoArea(args, { x: margin, y: margin, w: g.canvasW - margin * 2, h: g.canvasH - margin * 2 }), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#ffffff"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive) {
    cropMarks(lines, placed.x, placed.y, placed.w, placed.h, g.scale);
    const stripY = placed.y + placed.h + 40 * g.scale;
    ["#00b0f0", "#e83e8c", "#ffe600", "#0a0a0a"].forEach((c, i) => lines.push(`<rect x="${placed.x + i * 27 * g.scale}" y="${stripY}" width="${24 * g.scale}" height="${24 * g.scale}" fill="${c}"/>`));
    const label = cameraLabel(args.exif, args.config) || cleanDisplayText(args.exif.lens);
    if (label) lines.push(text(placed.x + 118 * g.scale, stripY + 12 * g.scale, label, Math.max(10 * g.scale, (args.frameParams.fontSize - 1) * g.scale), "400", "#404040", "start", "middle"));
    const params = args.config.showParams ? paramsLine(args.exif, "  ·  ") : "";
    if (params) lines.push(text(placed.x + placed.w, stripY + 12 * g.scale, params, Math.max(10 * g.scale, (args.frameParams.fontSize - 1) * g.scale), "400", "#404040", "end", "middle"));
  }
  return closeTemplate(lines);
}

export function buildContactSheetSvg(args: SvgArgs) {
  const g = base(args, "#0a0a0a");
  const perfH = Math.max(12 * g.scale, g.canvasH * 0.026);
  const side = g.canvasW * 0.04;
  const captionH = g.watermarkActive ? Math.max(args.frameParams.infoBarHeight * g.scale * 0.45, 34 * g.scale, g.canvasH * 0.045) : g.canvasH * 0.025;
  const placed = fitPhoto(widthTunablePhotoArea(args, { x: side, y: perfH + g.canvasH * 0.018, w: g.canvasW - side * 2, h: g.canvasH - perfH * 2 - captionH - g.canvasH * 0.025 }), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#0a0a0a"/>`, sprocketRow(0, 0, g.canvasW, perfH, g.scale), sprocketRow(0, g.canvasH - perfH, g.canvasW, perfH, g.scale));
  lines.push(`<rect x="${placed.x - 4 * g.scale}" y="${placed.y - 4 * g.scale}" width="${placed.w + 8 * g.scale}" height="${placed.h + 8 * g.scale}" fill="#ffffff"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive) {
    const captionTop = placed.y + placed.h + g.canvasH * 0.025;
    const size = Math.max(11 * g.scale, args.frameParams.fontSize * 1.05 * g.scale);
    lines.push(text(placed.x, captionTop + size, "→ FRAME 24A", size, "700", "#f5f5f5"));
  }
  return closeTemplate(lines);
}

export function buildPhotoAlbumSvg(args: SvgArgs) {
  const g = base(args, "#ede2cc");
  const margin = Math.max(g.canvasW * 0.025, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const topMargin = Math.max(g.canvasH * 0.035, margin);
  const bottomMargin = Math.max(g.canvasH * 0.04, margin);
  const placed = fitPhoto(tunablePhotoArea(args, { x: margin, y: topMargin, w: g.canvasW - margin * 2, h: g.canvasH - topMargin - bottomMargin }), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#ede2cc"/>`, `<rect x="${placed.x - 6 * g.scale}" y="${placed.y - 6 * g.scale}" width="${placed.w + 12 * g.scale}" height="${placed.h + 12 * g.scale}" fill="#fdfaf2"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  cornerTriangles(lines, placed.x, placed.y, placed.w, placed.h, Math.max(28 * g.scale, Math.min(placed.w, placed.h) * 0.075));
  return closeTemplate(lines);
}

export function buildDarkroomProofSvg(args: SvgArgs) {
  const g = base(args, "#0d0d0d");
  const paperX = Math.max(g.canvasW * 0.03, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const paperY = Math.max(g.canvasH * 0.025, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const paperW = g.canvasW - paperX * 2;
  const paperH = g.canvasH - paperY * 2;
  const insetX = g.canvasW * 0.04;
  const insetTop = g.canvasH * 0.045;
  const proofReserve = g.watermarkActive ? scaledBarH(args, g, g.canvasH * 0.12) : g.canvasH * 0.035;
  const placed = fitPhoto(widthTunablePhotoArea(args, { x: paperX + insetX, y: paperY + insetTop, w: paperW - insetX * 2, h: paperH - insetTop - proofReserve }), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="#0d0d0d"/>`, `<rect x="${paperX}" y="${paperY}" width="${paperW}" height="${paperH}" fill="#f5efe1"/>`, photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive) {
    const stampSize = Math.max(22 * g.scale, g.canvasW * 0.038);
    const sx = placed.x, sy = placed.y + placed.h + g.canvasH * 0.055;
    lines.push(`<g transform="translate(${sx} ${sy}) rotate(-8)">`);
    lines.push(`<rect x="${-6 * g.scale}" y="${-stampSize * 0.95}" width="${stampSize * 4.1}" height="${stampSize * 1.25}" fill="none" stroke="#b22222" stroke-width="${2 * g.scale}"/>`);
    lines.push(text(0, 0, "PROOF", stampSize, "900", "#b22222"));
    lines.push(`</g>`);
  }
  return closeTemplate(lines);
}

export function buildGenericSvgForKind(kind: TemplateKind, args: SvgArgs): string | undefined {
  switch (kind) {
    case "classic-bottom": return buildClassicBottomSvg(args);
    case "magazine": return buildMagazineSvg(args);
    case "minimal-corner": return buildMinimalCornerSvg(args);
    case "cinematic": return buildCinematicSvg(args);
    case "photo-album": return buildPhotoAlbumSvg(args);
    case "crop-marks": return buildCropMarksSvg(args);
    case "darkroom-proof": return buildDarkroomProofSvg(args);
    case "contact-sheet": return buildContactSheetSvg(args);
    default: return undefined;
  }
}

function buildMagazineSvg(args: SvgArgs) {
  return buildBottomBarSvg(args, "magazine");
}

function buildBottomBarSvg(args: SvgArgs, mode: "classic-bottom" | "magazine") {
  const bg = args.frameParams.bgColor || "#ffffff";
  const g = base(args, bg);
  const compact = mode === "magazine";
  const margin = compact
    ? Math.max(g.canvasW * 0.015, g.canvasW * (args.frameParams.minTopBottomMargin / 100))
    : Math.max(g.canvasW * 0.06, g.canvasW * (args.frameParams.minTopBottomMargin / 100));
  const topMargin = compact ? Math.max(g.canvasH * 0.02, margin * 0.7) : g.canvasH * 0.06;
  const bottomSafety = compact ? g.canvasH * 0.01 : g.canvasH * 0.1;
  const barH = g.watermarkActive ? scaledBarH(args, g, compact ? g.canvasH * 0.07 : g.canvasH * 0.14) : g.canvasH * 0.04;
  const photoArea = { x: margin, y: topMargin, w: g.canvasW - margin * 2, h: g.canvasH - topMargin - bottomSafety - barH };
  const placed = fitPhoto(compact ? widthTunablePhotoArea(args, photoArea) : tunablePhotoArea(args, photoArea), args.photoW, args.photoH);
  const lines = root(g);
  lines.push(`<rect width="${g.canvasW}" height="${g.canvasH}" fill="${backgroundFill(args.frameParams)}"/>`);
  lines.push(photoElement(args, g, placed.x, placed.y, placed.w, placed.h));
  if (g.watermarkActive) {
    const y = placed.y + placed.h + barH * (compact ? 0.55 : 0.35);
    const label = cameraLabel(args.exif, args.config);
    const params = args.config.showParams ? paramsLine(args.exif, "  /  ") : "";
    const size = Math.max(11 * g.scale, args.frameParams.fontSize * g.scale);
    const portraitPhotoLayout = isPortraitPhoto(args.photoW, args.photoH);
    const watermarkX = portraitPhotoLayout ? Math.max(24 * g.scale, g.canvasW * 0.03) : placed.x;
    const stackMetadata = compact && !portraitPhotoLayout && shouldStackMetadata(placed.w, g.canvasW);
    if (args.logo && args.config.showLogo) {
      const labelSize = mode === "magazine" ? size * 1.35 : size;
      lines.push(inlineLogoAndText(args.logo, watermarkX, y - labelSize, labelSize, label, labelSize, args.frameParams.textColor || "#1f2937", "start", g.scale, args.frameParams.logoSize, args.frameParams.logoGap));
    } else if (label) lines.push(text(watermarkX, y, label, mode === "magazine" ? size * 1.35 : size, "700", args.frameParams.textColor || "#1f2937"));
    if (params) {
      const paramsY = stackMetadata ? y + Math.max(size * 1.5, 18 * g.scale) : y;
      const paramsX = portraitPhotoLayout ? g.canvasW - watermarkX : placed.x + placed.w;
      lines.push(text(stackMetadata ? watermarkX : paramsX, paramsY, params, size, "500", args.frameParams.textColor || "#1f2937", stackMetadata ? "start" : "end"));
    }
  }
  return closeTemplate(lines);
}

function base(args: SvgArgs, bg: string) {
  const canvasW = Math.max(320, Math.round(args.canvasBaseWidth ?? 900));
  return {
    bg,
    canvasW,
    canvasH: canvasW / getCanvasRatio(args.frameParams.canvasRatio, args.frameParams.canvasOrientation, args.photoW / args.photoH),
    scale: canvasW / 900,
    fontFamily: svgFontFamily(args.frameParams.fontFamily),
    photoHref: args.photoHref ?? SVG_PHOTO_PLACEHOLDER,
    watermarkActive: args.config.showWatermark ?? true,
  };
}

function backgroundFill(frameParams: FrameParams) {
  if (frameParams.background === "black") return "#111827";
  if (frameParams.background === "custom") return frameParams.bgColor;
  return "#ffffff";
}

function backgroundLuminance(frameParams: FrameParams): number {
  if (frameParams.background === "blur") return 40;
  const hex = backgroundFill(frameParams).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function backgroundElements(args: SvgArgs, g: ReturnType<typeof base>): string {
  if (args.frameParams.background !== "blur") {
    return `<rect width="${g.canvasW}" height="${g.canvasH}" fill="${backgroundFill(args.frameParams)}"/>`;
  }
  const blur = Math.max(1, Math.round(args.frameParams.blurRadius * g.scale * 0.45));
  return [
    `<defs><filter id="pb-bg-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>`,
    `<image x="0" y="0" width="${g.canvasW}" height="${g.canvasH}" href="${xmlEscape(g.photoHref)}" xlink:href="${xmlEscape(g.photoHref)}" preserveAspectRatio="xMidYMid slice" filter="url(#pb-bg-blur)"/>`,
    `<rect width="${g.canvasW}" height="${g.canvasH}" fill="rgba(0,0,0,0.22)"/>`,
  ].join("\n");
}

function scaledBarH(args: SvgArgs, g: ReturnType<typeof base>, fallback: number) {
  return Math.max(args.frameParams.infoBarHeight * g.scale, fallback);
}

function tunablePhotoArea(args: SvgArgs, area: SvgRect) {
  return applySvgMainImageRatio(area, args.frameParams.mainImageWidthRatio);
}

function widthTunablePhotoArea(args: SvgArgs, area: SvgRect) {
  return applySvgWidthRatio(area, args.frameParams.mainImageWidthRatio);
}

function photoElement(args: SvgArgs, g: ReturnType<typeof base>, x: number, y: number, w: number, h: number) {
  const radius = Math.min(args.frameParams.innerRadius * g.scale, Math.min(w, h) / 8);
  const shadowDefs = photoShadowDefs(args, g, x, y, w, h);
  const clipped = radius > 0
    ? [
        `<defs><clipPath id="pb-photo-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/></clipPath></defs>`,
        `<g clip-path="url(#pb-photo-clip)">${svgImage(g.photoHref, x, y, w, h)}</g>`,
      ].join("\n")
    : svgImage(g.photoHref, x, y, w, h);
  // Include shadow <defs> inline so photoElement is self-contained regardless
  // of which template calls it. Outer <g> wraps clip so shadow extends past clip boundary.
  const image = shadowDefs
    ? [shadowDefs, `<g filter="url(#pb-photo-shadow)">${clipped}</g>`].join("\n")
    : clipped;
  const border = args.frameParams.photoBorder;
  if (!border || args.frameParams.photoBorderStyle === "none") return image;
  const strokeWidth = Math.min(border * g.scale, Math.min(w, h) / 12);
  const dash = args.frameParams.photoBorderStyle === "dashed" ? ` stroke-dasharray="${strokeWidth * 3} ${strokeWidth * 2}"` : "";
  return [
    image,
    `<rect x="${x + strokeWidth / 2}" y="${y + strokeWidth / 2}" width="${Math.max(0, w - strokeWidth)}" height="${Math.max(0, h - strokeWidth)}" rx="${radius}" ry="${radius}" fill="none" stroke="${xmlEscape(args.frameParams.photoBorderColor || "#ffffff")}" stroke-width="${strokeWidth}"${dash}/>`,
  ].join("\n");
}

function photoShadowDefs(args: SvgArgs, g: ReturnType<typeof base>, x: number, y: number, w: number, h: number): string {
  if (!args.frameParams.shadow) return "";
  const blur = Math.max(0, args.frameParams.shadowBlur * g.scale);
  const offsetY = h * (args.frameParams.shadowOffsetY / 100);
  const opacity = Math.min(1, Math.max(0, args.frameParams.shadowOpacity / 100));
  if (blur <= 0 || opacity <= 0) return "";
  const pad = blur * 3 + Math.abs(offsetY);
  return [
    `<defs><filter id="pb-photo-shadow" x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" filterUnits="userSpaceOnUse">`,
    `<feDropShadow dx="0" dy="${offsetY}" stdDeviation="${blur}" flood-color="#111827" flood-opacity="${opacity}"/>`,
    `</filter></defs>`,
  ].join("\n");
}

function logoHeight(args: SvgArgs, scale: number, fontSize: number) {
  return Math.max(12 * scale, Math.min(fontSize * 1.25, args.frameParams.logoSize * scale * 1.25));
}

function minimalCornerLogoHeight(args: SvgArgs, scale: number) {
  return Math.max(12 * scale, args.frameParams.logoSize * scale * 1.15);
}

function inlineLogoAndText(
  logo: SvgLogoAsset,
  centerX: number,
  cursorY: number,
  fontSize: number,
  line: string,
  textSize: number,
  fill: string,
  anchor: "start" | "middle" | "end",
  scale: number,
  logoSize: number,
  gap: number,
) {
  const logoFontScale = Math.max(0.5, fontSize / (WATERMARK_LAYOUT_SPEC.logoFontScaleBase * scale));
  const logoH = Math.max(12 * scale, logoSize * WATERMARK_LAYOUT_SPEC.logoVisualScale * logoFontScale * scale);
  const logoW = logoH * logo.aspectRatio;
  const estimatedTextW = line.length * textSize * 0.55;
  const inlineGap = line ? gap * scale : 0;
  const totalW = logoW + inlineGap + estimatedTextW;
  const startX = anchor === "middle" ? centerX - totalW / 2 : centerX;
  const baselineY = cursorY + fontSize;
  const logoY = Math.max(cursorY, baselineY + fontSize * WATERMARK_LAYOUT_SPEC.logoBaselineOffsetRatio - logoH);
  const parts = [svgContainedImage(logo.href, startX, logoY, logoW, logoH)];
  if (line) parts.push(text(startX + logoW + inlineGap, baselineY, line, textSize, "700", fill, "start"));
  return parts.join("\n");
}

function root(g: ReturnType<typeof base>) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${g.canvasW}" height="${g.canvasH}" viewBox="0 0 ${g.canvasW} ${g.canvasH}">`,
    `<g font-family="${xmlEscape(g.fontFamily)}">`,
  ];
}

function closeTemplate(lines: string[]): string {
  lines.push("</g>");
  lines.push("</svg>");
  return lines.join("\n");
}

function text(x: number, y: number, value: string, size: number, weight: string, fill: string, anchor: "start" | "middle" | "end" = "start", baseline?: "middle") {
  const dominant = baseline ? ` dominant-baseline="${baseline}"` : "";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}"${dominant} font-weight="${weight}" font-size="${size}" fill="${fill}">${xmlEscape(value)}</text>`;
}

function brandLine(exif: ExifData, config: TemplateConfig) {
  return [cameraLabel(exif, config), config.showLens ? cleanDisplayText(exif.lens) : ""].filter(Boolean).join("  ·  ");
}

function cameraLabel(exif: ExifData, config: TemplateConfig) {
  return config.showCamera ? normalizeModel(exif.camera.make, exif.camera.model) : "";
}

function cropMarks(lines: string[], x: number, y: number, w: number, h: number, scale: number) {
  const len = 24 * scale, gap = 8 * scale;
  const path = [
    `M ${x - gap - len} ${y - gap} H ${x - gap} V ${y - gap - len}`,
    `M ${x + w + gap + len} ${y - gap} H ${x + w + gap} V ${y - gap - len}`,
    `M ${x - gap - len} ${y + h + gap} H ${x - gap} V ${y + h + gap + len}`,
    `M ${x + w + gap + len} ${y + h + gap} H ${x + w + gap} V ${y + h + gap + len}`,
  ].join(" ");
  lines.push(`<path d="${path}" fill="none" stroke="#0a0a0a" stroke-width="${scale}"/>`);
}

function cornerTriangles(lines: string[], x: number, y: number, w: number, h: number, s: number) {
  lines.push(`<path d="M ${x} ${y} H ${x + s} V ${y} L ${x} ${y + s} Z" fill="#241c14"/>`);
  lines.push(`<path d="M ${x + w} ${y} H ${x + w - s} V ${y} L ${x + w} ${y + s} Z" fill="#241c14"/>`);
  lines.push(`<path d="M ${x} ${y + h} H ${x + s} V ${y + h} L ${x} ${y + h - s} Z" fill="#241c14"/>`);
  lines.push(`<path d="M ${x + w} ${y + h} H ${x + w - s} V ${y + h} L ${x + w} ${y + h - s} Z" fill="#241c14"/>`);
}

function sprocketRow(x: number, y: number, w: number, h: number, scale: number) {
  const holeH = h * 0.55, holeW = h * 0.85, gap = holeW * 1.1, total = holeW + gap, count = Math.floor(w / total);
  const offset = (w - count * total + gap) / 2;
  const rects: string[] = [];
  for (let i = 0; i < count; i += 1) rects.push(`<rect x="${x + offset + i * total}" y="${y + (h - holeH) / 2}" width="${holeW}" height="${holeH}" rx="${2 * scale}" ry="${2 * scale}" fill="#f5f5f5"/>`);
  return rects.join("\n");
}
