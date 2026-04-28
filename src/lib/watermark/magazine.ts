import { normalizeModel } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import {
  averageLuminance,
  backgroundFill,
  buildPreviewRenderPlan,
  cleanDisplayText,
  formatTakenAt,
  getPreviewFontFamily,
  resolvePreviewGeometryMetrics,
  resolveReadableTextAndDivider,
  sanitizeCustomLines,
} from "./classic-bottom";
import { WATERMARK_LAYOUT_SPEC } from "./layout-spec";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

type MagazineColumns = {
  left: string[];
  right: string[];
};

const COLUMN_GAP_PX = 24;
const COLUMN_INNER_PADDING_PX = 16;

export function buildMagazineColumns(
  exif: ExifData,
  config: TemplateConfig,
): MagazineColumns {
  const left: string[] = [];
  const right: string[] = [];

  if (config.showCamera) {
    const camera = normalizeModel(exif.camera.make, exif.camera.model);
    if (camera) left.push(camera);
  }
  if (config.showLens) {
    const lens = cleanDisplayText(exif.lens);
    if (lens) left.push(lens);
  }

  if (config.showParams) {
    if (exif.focalLength) right.push(`${Math.round(exif.focalLength)}mm`);
    if (exif.aperture) right.push(`f/${trimNumeric(exif.aperture)}`);
    if (exif.shutterSpeed) right.push(exif.shutterSpeed);
    if (exif.iso) right.push(`ISO ${exif.iso}`);
  }

  if (config.showDate) {
    const date = formatTakenAt(exif.takenAt, config.dateFormat);
    if (date) right.push(date);
  }

  for (const custom of sanitizeCustomLines(config.customLines)) {
    left.push(custom);
  }

  return { left, right };
}

export function drawMagazinePreview(
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
  const columns = watermarkActive
    ? buildMagazineColumns(photo.exif, config)
    : { left: [], right: [] };
  const effectiveLogo = watermarkActive && config.showLogo ? logoImage : null;

  const primaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinPrimaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.primaryFontScale,
  );
  const secondaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinSecondaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.secondaryFontScale,
  );

  // Magazine bar shows a fixed two-row block per column; reserve enough space.
  const totalTextHeight =
    primaryFontSize + (columns.left.length > 1 ? secondaryFontSize + 6 : 0);

  const plan = buildPreviewRenderPlan({
    photoWidth: photo.width,
    photoHeight: photo.height,
    frameParams,
    templateKind: "magazine",
    totalTextHeight,
    logoOnlyWatermark: false,
    showWatermark: watermarkActive,
    baseWidth,
  });
  const geometry = resolvePreviewGeometryMetrics(frameParams);

  canvas.width = Math.round(plan.canvasW * dpr);
  canvas.height = Math.round(plan.canvasH * dpr);
  canvas.style.aspectRatio = `${plan.canvasW} / ${plan.canvasH}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, plan.canvasW, plan.canvasH);

  ctx.fillStyle = backgroundFill(frameParams);
  ctx.fillRect(0, 0, plan.canvasW, plan.canvasH);

  if (frameParams.shadow) {
    ctx.save();
    ctx.shadowColor = `rgba(17,24,39,${frameParams.shadowOpacity / 100})`;
    ctx.shadowBlur = frameParams.shadowBlur;
    ctx.shadowOffsetY = plan.photoH * (frameParams.shadowOffsetY / 100);
    ctx.fillStyle = "#000000";
    roundRect(ctx, plan.imageX, plan.imageY, plan.photoW, plan.photoH, geometry.innerRadius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, plan.imageX, plan.imageY, plan.photoW, plan.photoH, geometry.innerRadius);
  ctx.clip();
  ctx.drawImage(image, plan.imageX, plan.imageY, plan.photoW, plan.photoH);
  ctx.restore();

  if (frameParams.photoBorder > 0 && frameParams.photoBorderStyle !== "none") {
    ctx.save();
    ctx.strokeStyle = frameParams.photoBorderColor || "#ffffff";
    ctx.lineWidth = geometry.photoBorder;
    if (frameParams.photoBorderStyle === "dashed") {
      const dash = Math.max(4, geometry.photoBorder * 2.4);
      ctx.setLineDash([dash, dash * 0.6]);
    }
    roundRect(ctx, plan.imageX, plan.imageY, plan.photoW, plan.photoH, geometry.innerRadius);
    ctx.stroke();
    ctx.restore();
  }

  if (!watermarkActive || plan.infoBarHeight <= 0) return;

  // Sample background luminance under the bar for auto-contrast.
  const sampleY = Math.max(plan.barTop, 0);
  const sampleH = Math.max(20, plan.canvasH - sampleY);
  const luma = averageLuminance(ctx, 0, sampleY, plan.canvasW, sampleH);
  const readable = resolveReadableTextAndDivider({
    autoTextContrast: frameParams.autoTextContrast,
    averageLuminance: luma,
    fallbackTextColor: frameParams.textColor,
    fallbackDividerColor: frameParams.dividerColor,
  });

  const barCenterY = plan.barTop + plan.infoBarHeight / 2;
  const dividerX = plan.canvasW / 2;
  const left = plan.horizontalMargin + COLUMN_INNER_PADDING_PX;
  const right = plan.canvasW - plan.horizontalMargin - COLUMN_INNER_PADDING_PX;
  const leftEnd = dividerX - COLUMN_GAP_PX / 2;
  const rightStart = dividerX + COLUMN_GAP_PX / 2;

  // Optional vertical divider (only when both columns have content).
  if (frameParams.dividerShow && columns.left.length > 0 && columns.right.length > 0) {
    const inset = Math.min(16, plan.infoBarHeight * 0.25);
    ctx.strokeStyle = readable.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX, plan.barTop + inset);
    ctx.lineTo(dividerX, plan.barTop + plan.infoBarHeight - inset);
    ctx.stroke();
  }

  ctx.fillStyle = readable.textColor;
  ctx.textBaseline = "middle";

  drawLeftColumn({
    ctx,
    columns,
    logo: effectiveLogo,
    fontFamily: frameParams.fontFamily,
    primaryFontSize,
    secondaryFontSize,
    logoGap: frameParams.logoGap,
    barCenterY,
    leftX: left,
    leftEnd,
  });

  drawRightColumn({
    ctx,
    items: columns.right,
    fontFamily: frameParams.fontFamily,
    fontSize: secondaryFontSize,
    barCenterY,
    rightX: right,
    rightStart,
  });
}

function drawLeftColumn({
  ctx,
  columns,
  logo,
  fontFamily,
  primaryFontSize,
  secondaryFontSize,
  logoGap,
  barCenterY,
  leftX,
  leftEnd,
}: {
  ctx: CanvasRenderingContext2D;
  columns: MagazineColumns;
  logo: HTMLImageElement | null;
  fontFamily: FrameParams["fontFamily"];
  primaryFontSize: number;
  secondaryFontSize: number;
  logoGap: number;
  barCenterY: number;
  leftX: number;
  leftEnd: number;
}) {
  const lines = columns.left;
  ctx.textAlign = "left";

  if (lines.length === 0 && !logo) return;

  const primary = lines[0] ?? "";
  const secondary = lines[1];
  const lineGap = 6;

  const primaryFont = `700 ${primaryFontSize}px ${getPreviewFontFamily(fontFamily)}`;
  ctx.font = primaryFont;

  const logoBox = logo
    ? calcLogoBox(logo, primaryFontSize * (WATERMARK_LAYOUT_SPEC.logoVisualScale ?? 1.18))
    : null;
  const logoTextGap = logoBox && primary ? logoGap : 0;

  let cursorX = leftX;
  if (logoBox) {
    drawLogo(ctx, logo!, logoBox, cursorX, barCenterY - logoBox.height / 2);
    cursorX += logoBox.width + logoTextGap;
  }

  const remaining = Math.max(0, leftEnd - cursorX);
  const effectivePrimary = clipText(ctx, primary, remaining);

  // Primary line baseline aligns with logo's vertical center.
  const primaryY = secondary ? barCenterY - lineGap / 2 - primaryFontSize / 4 : barCenterY;
  if (effectivePrimary) {
    ctx.fillText(effectivePrimary, cursorX, primaryY);
  }

  if (secondary) {
    const secondaryY = barCenterY + secondaryFontSize / 2 + lineGap / 2;
    ctx.font = `400 ${secondaryFontSize}px ${getPreviewFontFamily(fontFamily)}`;
    const secondaryRemaining = Math.max(0, leftEnd - leftX);
    const effectiveSecondary = clipText(ctx, secondary, secondaryRemaining);
    if (effectiveSecondary) {
      ctx.fillText(effectiveSecondary, leftX, secondaryY);
    }
  }
}

function drawRightColumn({
  ctx,
  items,
  fontFamily,
  fontSize,
  barCenterY,
  rightX,
  rightStart,
}: {
  ctx: CanvasRenderingContext2D;
  items: string[];
  fontFamily: FrameParams["fontFamily"];
  fontSize: number;
  barCenterY: number;
  rightX: number;
  rightStart: number;
}) {
  if (items.length === 0) return;
  ctx.textAlign = "right";
  ctx.font = `600 ${fontSize}px ${getPreviewFontFamily(fontFamily)}`;

  // Lay out all params on a single line if they fit; otherwise split into 2 rows.
  const separator = "  ·  ";
  const single = items.join(separator);
  const singleWidth = ctx.measureText(single).width;
  const available = rightX - rightStart;

  if (singleWidth <= available) {
    ctx.fillText(single, rightX, barCenterY);
    return;
  }

  // Two-row fallback: split items roughly evenly.
  const mid = Math.ceil(items.length / 2);
  const row1 = items.slice(0, mid).join(separator);
  const row2 = items.slice(mid).join(separator);
  const lineGap = 6;
  const y1 = barCenterY - fontSize / 2 - lineGap / 2 + fontSize / 2;
  const y2 = barCenterY + fontSize / 2 + lineGap / 2 - fontSize / 2;
  ctx.fillText(clipText(ctx, row1, available), rightX, y1);
  ctx.fillText(clipText(ctx, row2, available), rightX, y2);
}

function clipText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (!text || maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let end = text.length - 1;
  while (end > 0 && ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth) {
    end -= 1;
  }
  return end > 0 ? text.slice(0, end) + ellipsis : ellipsis;
}

type LogoBox = { width: number; height: number };

function calcLogoBox(image: HTMLImageElement, targetHeight: number): LogoBox {
  const w = Math.max(1, image.naturalWidth);
  const h = Math.max(1, image.naturalHeight);
  const height = Math.max(12, targetHeight);
  return { width: height * (w / h), height };
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: LogoBox,
  x: number,
  y: number,
) {
  ctx.drawImage(image, x, y, size.width, size.height);
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

function trimNumeric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
