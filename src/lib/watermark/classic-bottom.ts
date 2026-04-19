import { normalizeModel } from "@/lib/exif/brand";
import { resolveLogoSelection } from "@/lib/exif/logo";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";
import { getWatermarkPlacement } from "./template-layout";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

const LOGO_VISUAL_SCALE = 1.18;
const LOGO_FONT_SCALE_BASE = 20;
const BASELINE_ASCENT_RATIO = 0.8;
const LOGO_BASELINE_OFFSET_RATIO = 0;

export function drawClassicBottomPreview(
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
  const scale = baseWidth / photo.width;
  const topBottomMargin = baseWidth * (frameParams.minTopBottomMargin / 100);
  const textLines = buildPreviewLines(photo.exif, config);
  const primaryFontSize = Math.max(16, frameParams.fontSize * 1.18);
  const secondaryFontSize = Math.max(13, frameParams.fontSize * 0.96);
  const extraLineGap = 8;
  const textBlockHeight = textLines.reduce((acc, _line, index) => {
    const size = index === 0 ? primaryFontSize : secondaryFontSize;
    return acc + size + (index === 0 ? 0 : extraLineGap);
  }, 0);
  const minInfoBarHeight = textBlockHeight + 12;
  const infoBarHeight = Math.max(
    frameParams.infoBarHeight * scale,
    minInfoBarHeight,
  );
  const canvasRatio = getCanvasRatio(frameParams.canvasRatio, photo.width, photo.height);
  const canvasHeight = baseWidth / canvasRatio;
  const barTop = canvasHeight - infoBarHeight;
  const availableHeight = Math.max(1, barTop - topBottomMargin * 2);
  const naturalWidth = baseWidth * (frameParams.mainImageWidthRatio / 100);
  const naturalHeight = (photo.height * naturalWidth) / photo.width;
  const fitScale = Math.min(1, availableHeight / naturalHeight);

  // ── Canvas dimensions ─────────────────────────────────────────────────────
  const contentWidth = baseWidth;
  const contentHeight = canvasHeight;
  const imageDrawWidth = naturalWidth * fitScale;
  const imageDrawHeight = naturalHeight * fitScale;
  const imageX = (contentWidth - imageDrawWidth) / 2;
  const imageY = topBottomMargin + (availableHeight - imageDrawHeight) / 2;

  canvas.width = Math.round(contentWidth * dpr);
  canvas.height = Math.round(contentHeight * dpr);
  canvas.style.aspectRatio = `${contentWidth} / ${contentHeight}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, contentWidth, contentHeight);

  ctx.fillStyle = backgroundFill(frameParams);
  ctx.fillRect(0, 0, contentWidth, contentHeight);

  // Shadow is cast by a filled shape drawn BEFORE the clipped image so it's
  // visible outside the photo bounds. The fill is then covered by the image.
  if (frameParams.shadow) {
    ctx.save();
    ctx.shadowColor = `rgba(17,24,39,${frameParams.shadowOpacity / 100})`;
    ctx.shadowBlur = frameParams.shadowBlur;
    ctx.shadowOffsetY = imageDrawHeight * (frameParams.shadowOffsetY / 100);
    ctx.fillStyle = "#000000";
    roundRect(ctx, imageX, imageY, imageDrawWidth, imageDrawHeight, frameParams.innerRadius * scale);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(
    ctx,
    imageX,
    imageY,
    imageDrawWidth,
    imageDrawHeight,
    frameParams.innerRadius * scale,
  );
  ctx.clip();
  ctx.drawImage(image, imageX, imageY, imageDrawWidth, imageDrawHeight);
  ctx.restore();

  if (frameParams.photoBorder > 0) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = frameParams.photoBorder * scale;
    roundRect(
      ctx,
      imageX,
      imageY,
      imageDrawWidth,
      imageDrawHeight,
      frameParams.innerRadius * scale,
    );
    ctx.stroke();
  }

  if (frameParams.dividerShow) {
    ctx.strokeStyle = frameParams.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24 * scale, barTop);
    ctx.lineTo(contentWidth - 24 * scale, barTop);
    ctx.stroke();
  }

  const left = 24 * scale;
  const right = contentWidth - 24 * scale;
  const totalTextHeight = textLines.reduce((acc, _line, index) => {
    const size = index === 0 ? primaryFontSize : secondaryFontSize;
    return acc + size + (index === 0 ? 0 : extraLineGap);
  }, 0);
  const watermarkTopPadding = Number.isFinite(frameParams.watermarkTopPadding)
    ? frameParams.watermarkTopPadding
    : 8;
  const watermarkBottomPadding = Number.isFinite(frameParams.watermarkBottomPadding)
    ? frameParams.watermarkBottomPadding
    : 8;
  const watermarkTopPaddingPx = (infoBarHeight * watermarkTopPadding) / 100;
  const watermarkBottomPaddingPx = (infoBarHeight * watermarkBottomPadding) / 100;
  const preferredTop = barTop + watermarkTopPaddingPx;
  const maxTop = Math.max(
    barTop,
    barTop + infoBarHeight - totalTextHeight - watermarkBottomPaddingPx,
  );
  const blockTop = Math.min(Math.max(barTop, preferredTop), maxTop);

  ctx.fillStyle = frameParams.textColor;
  ctx.textBaseline = "alphabetic";

  const textStart = left;
  let cursorY = blockTop;
  textLines.forEach((line, index) => {
    const firstLine = index === 0;
    const fontSize = firstLine ? primaryFontSize : secondaryFontSize;
    const weight = 700;
    if (index > 0) cursorY += extraLineGap;
    const y = cursorY + fontSize * BASELINE_ASCENT_RATIO;
    ctx.font = `${weight} ${fontSize}px ${getPreviewFontFamily(frameParams.fontFamily)}`;
    const metrics = ctx.measureText(line);
    const logoFontScale = Math.max(0.5, fontSize / LOGO_FONT_SCALE_BASE);
    const logoInline =
      firstLine && logoImage
        ? calcLogoInline(
            logoImage,
            frameParams.logoSize * LOGO_VISUAL_SCALE * logoFontScale,
          )
        : null;
    const inlineWidth = metrics.width + (logoInline ? logoInline.width + frameParams.logoGap * scale : 0);
    // Strict baseline alignment: icon bottom follows text baseline exactly.
    const logoTop = logoInline
      ? y + fontSize * LOGO_BASELINE_OFFSET_RATIO - logoInline.height
      : y;

    const placement = getWatermarkPlacement("classic-bottom");
    const centerX = (textStart + right) / 2;
    if (placement !== "center") {
      // Placeholder branch for future template placement strategies.
      ctx.textAlign = "center";
      ctx.fillText(line, centerX, y);
      cursorY += fontSize;
      return;
    }

    // Classic bottom template currently uses centered watermark layout.
    ctx.textAlign = "center";
    if (logoInline && logoImage) {
      const inlineStart = centerX - inlineWidth / 2;
      drawLogoInline(ctx, logoImage, logoInline, inlineStart, logoTop);
      ctx.textAlign = "left";
      ctx.fillText(line, inlineStart + logoInline.width + frameParams.logoGap * scale, y);
      cursorY += fontSize;
      return;
    }
    ctx.fillText(line, centerX, y);
    cursorY += fontSize;
  });
}

function getCanvasRatio(
  ratio: FrameParams["canvasRatio"],
  _width: number,
  _height: number,
) {
  if (ratio === "auto") {
    return 3 / 2;
  }

  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) {
    return 3 / 2;
  }
  return rw / rh;
}

export function buildPreviewLines(exif: ExifData, config: TemplateConfig) {
  const lines: string[] = [];

  if (config.showCamera) {
    const camera = normalizeModel(exif.camera.make, exif.camera.model);
    if (camera) lines.push(camera);
  }
  if (config.showLens) {
    const lens = cleanDisplayText(exif.lens);
    if (lens) lines.push(lens);
  }

  if (config.showParams) {
    const params = [
      exif.focalLength ? `${Math.round(exif.focalLength)}mm` : "",
      exif.aperture ? `f/${trim(exif.aperture)}` : "",
      exif.shutterSpeed,
      exif.iso ? `ISO${exif.iso}` : "",
    ].filter(Boolean);
    if (params.length) lines.push(params.join(" "));
  }

  return lines.filter(Boolean);
}

function trim(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function backgroundFill(frameParams: FrameParams) {
  if (frameParams.background === "black") return "#111827";
  if (frameParams.background === "custom") return frameParams.bgColor;
  if (frameParams.background === "blur") return "#eef1f6";
  return "#ffffff";
}

function cleanDisplayText(value: string) {
  return value.trim().replace(/^"+|"+$/g, "").trim();
}

export function getPreviewFontFamily(fontFamily: FrameParams["fontFamily"]) {
  if (fontFamily === "arial") {
    return 'Arial, "Helvetica Neue", sans-serif';
  }
  return '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
}

export function resolvePreviewLogo(
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  if (!config.showLogo) return null;
  return resolveLogoSelection(
    frameParams.logoKey,
    frameParams.logoVariant,
    exif.camera.make,
  ).asset;
}

function calcLogoInline(image: HTMLImageElement, targetHeight: number) {
  const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
  const height = Math.max(12, targetHeight);
  return {
    width: height * ratio,
    height,
  };
}

function drawLogoInline(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: { width: number; height: number },
  x: number,
  topY: number,
) {
  ctx.drawImage(image, x, topY, size.width, size.height);
}
