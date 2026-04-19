import { normalizeModel } from "@/lib/exif/brand";
import { resolveLogoSelection } from "@/lib/exif/logo";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

const LOGO_VISUAL_SCALE = 1.18;

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
  const textGap = Math.max(2, baseWidth * (frameParams.textMargin / 100));
  const primaryFontSize = Math.max(16, frameParams.fontSize * 1.18);
  const secondaryFontSize = Math.max(13, frameParams.fontSize * 0.96);
  const extraLineGap = Math.max(8, textGap * 1.8);
  const textBlockHeight = textLines.reduce((acc, _line, index) => {
    const size = index === 0 ? primaryFontSize : secondaryFontSize;
    return acc + size + (index === 0 ? 0 : extraLineGap);
  }, 0);
  const infoBarHeight = Math.max(
    frameParams.infoBarHeight * scale,
    textBlockHeight + topBottomMargin * 1.2,
  );
  const barHeight = infoBarHeight + topBottomMargin;
  const canvasRatio = getCanvasRatio(frameParams.canvasRatio, photo.width, photo.height);
  const canvasHeight = baseWidth / canvasRatio;
  const barTop = canvasHeight - barHeight;
  const availableHeight = Math.max(1, barTop - topBottomMargin);
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
  roundRect(ctx, 0, 0, contentWidth, contentHeight, frameParams.outerRadius * scale);
  ctx.fill();

  // Shadow is cast by a filled shape drawn BEFORE the clipped image so it's
  // visible outside the photo bounds. The fill is then covered by the image.
  if (frameParams.shadow) {
    ctx.save();
    ctx.shadowColor = `rgba(17,24,39,${frameParams.shadowOpacity / 100})`;
    ctx.shadowBlur = frameParams.shadowBlur;
    ctx.shadowOffsetY = frameParams.shadowOffsetY;
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
  const centerY = barTop + infoBarHeight / 2;
  const totalTextHeight = textLines.reduce((acc, _line, index) => {
    const size = index === 0 ? primaryFontSize : secondaryFontSize;
    return acc + size + (index === 0 ? 0 : extraLineGap);
  }, 0);
  const blockTop = centerY - totalTextHeight / 2;

  ctx.fillStyle = frameParams.textColor;
  ctx.textBaseline = "middle";

  const textStart = left;
  let cursorY = blockTop;
  textLines.forEach((line, index) => {
    const firstLine = index === 0;
    const fontSize = firstLine ? primaryFontSize : secondaryFontSize;
    const weight = 700;
    if (index > 0) cursorY += extraLineGap;
    const y = cursorY + fontSize / 2;
    ctx.font = `${weight} ${fontSize}px ${getPreviewFontFamily(frameParams.fontFamily)}`;
    const metrics = ctx.measureText(line);
    const logoInline =
      firstLine && logoImage
        ? calcLogoInline(logoImage, frameParams.logoSize * LOGO_VISUAL_SCALE)
        : null;
    const inlineWidth = metrics.width + (logoInline ? logoInline.width + frameParams.logoGap * scale : 0);
    // textBaseline="middle" aligns to em-square center; actual glyph visual center differs.
    // Offset logo to match where glyphs are actually rendered.
    const logoY = logoInline
      ? y + (metrics.actualBoundingBoxDescent - metrics.actualBoundingBoxAscent) / 2
      : y;

    if (frameParams.textAlign === "right") {
      ctx.textAlign = "right";
      const textX = right;
      if (logoInline && logoImage) {
        const logoX = textX - inlineWidth;
        drawLogoInline(ctx, logoImage, logoInline, logoX, logoY);
      }
      ctx.fillText(line, textX, y);
      cursorY += fontSize;
      return;
    }
    if (frameParams.textAlign === "center") {
      ctx.textAlign = "center";
      const centerX = (textStart + right) / 2;
      if (logoInline && logoImage) {
        const inlineStart = centerX - inlineWidth / 2;
        drawLogoInline(ctx, logoImage, logoInline, inlineStart, logoY);
        ctx.textAlign = "left";
        ctx.fillText(line, inlineStart + logoInline.width + frameParams.logoGap * scale, y);
        cursorY += fontSize;
        return;
      }
      ctx.fillText(line, centerX, y);
      cursorY += fontSize;
      return;
    }
    ctx.textAlign = "left";
    if (logoInline && logoImage) {
      drawLogoInline(ctx, logoImage, logoInline, textStart, logoY);
      ctx.fillText(line, textStart + logoInline.width + frameParams.logoGap * scale, y);
      cursorY += fontSize;
      return;
    }
    ctx.fillText(line, textStart, y);
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
  centerY: number,
) {
  ctx.drawImage(image, x, centerY - size.height / 2, size.width, size.height);
}
