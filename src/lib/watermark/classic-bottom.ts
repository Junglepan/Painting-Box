import { normalizeModel } from "@/lib/exif/brand";
import { resolveLogoSelection } from "@/lib/exif/logo";
import type { ExifData, FrameParams, TemplateConfig, TemplateKind } from "@/stores/types";
import { getTemplateLayout } from "./template-layout";
import { WATERMARK_LAYOUT_SPEC } from "./layout-spec";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

const LOGO_VISUAL_SCALE = WATERMARK_LAYOUT_SPEC.logoVisualScale;
const LOGO_FONT_SCALE_BASE = WATERMARK_LAYOUT_SPEC.logoFontScaleBase;
const LOGO_BASELINE_OFFSET_RATIO = WATERMARK_LAYOUT_SPEC.logoBaselineOffsetRatio;
const logoBoundsCache = new WeakMap<HTMLImageElement, LogoContentBounds>();

type ReadableColorsArgs = {
  autoTextContrast: boolean;
  averageLuminance: number;
  fallbackTextColor: string;
  fallbackDividerColor: string;
};

export function resolveReadableTextAndDivider({
  autoTextContrast,
  averageLuminance,
  fallbackTextColor,
  fallbackDividerColor,
}: ReadableColorsArgs) {
  if (!autoTextContrast) {
    return { textColor: fallbackTextColor, dividerColor: fallbackDividerColor };
  }

  if (averageLuminance >= WATERMARK_LAYOUT_SPEC.readabilityThresholdLuma) {
    return {
      textColor: WATERMARK_LAYOUT_SPEC.readabilityDarkTextColor,
      dividerColor: WATERMARK_LAYOUT_SPEC.readabilityDarkDividerColor,
    };
  }

  return {
    textColor: WATERMARK_LAYOUT_SPEC.readabilityLightTextColor,
    dividerColor: WATERMARK_LAYOUT_SPEC.readabilityLightDividerColor,
  };
}

export function drawClassicBottomPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  logoImage: HTMLImageElement | null,
  photo: PreviewData,
  frameParams: FrameParams,
  config: TemplateConfig,
  templateKind: TemplateKind = "classic-bottom",
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const baseWidth = 900;
  const scale = baseWidth / photo.width;
  const templateLayout = getTemplateLayout(templateKind);
  const topBottomMargin = baseWidth * (frameParams.minTopBottomMargin / 100);
  const textLines = buildPreviewLines(photo.exif, config);
  const renderLines = buildRenderableLines(textLines, Boolean(logoImage));
  const logoOnlyWatermark = renderLines.length === 1 && renderLines[0] === "";
  const primaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinPrimaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.primaryFontScale,
  );
  const secondaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinSecondaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.secondaryFontScale,
  );
  const extraLineGap = WATERMARK_LAYOUT_SPEC.baseLineGapPx;
  const lineMetrics = computeLineMetrics(
    ctx,
    renderLines,
    frameParams.fontFamily,
    primaryFontSize,
    secondaryFontSize,
  );
  const textBlockHeight = lineMetrics.reduce(
    (acc, metric, index) => acc + metric.height + (index === 0 ? 0 : extraLineGap),
    0,
  );
  const minInfoBarHeight = textBlockHeight + 12;
  const infoBarHeight = templateLayout.mode === "bottom-bar"
    ? Math.max(frameParams.infoBarHeight * scale, minInfoBarHeight)
    : 0;
  const canvasRatio = getCanvasRatio(frameParams.canvasRatio, photo.width, photo.height);
  const canvasHeight = baseWidth / canvasRatio;
  const barTop = canvasHeight - infoBarHeight;
  const availableHeight = Math.max(
    1,
    (templateLayout.mode === "bottom-bar" ? barTop : canvasHeight) - topBottomMargin * 2,
  );
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

  const horizontalMargin = WATERMARK_LAYOUT_SPEC.dividerHorizontalMarginPx * scale;
  const cornerPadding = WATERMARK_LAYOUT_SPEC.cornerPaddingPx * scale;
  const left = horizontalMargin;
  const right = contentWidth - horizontalMargin;
  const totalTextHeight = textBlockHeight;
  const imageBottom = imageY + imageDrawHeight;
  const blockTop = templateLayout.mode === "bottom-bar"
    ? computeWatermarkBlockTop({
        barTop,
        contentHeight,
        imageBottom,
        totalTextHeight,
        offsetY: shouldLiftLogoOnlyWatermark(templateKind, logoOnlyWatermark)
          ? -primaryFontSize
          : 0,
      })
    : computeCornerWatermarkBlockTop({
        imageY,
        imageBottom,
        totalTextHeight,
        cornerPadding: WATERMARK_LAYOUT_SPEC.cornerPaddingPx,
      });

  const averageLuminance = sampleWatermarkLuminance(ctx, {
    templateKind,
    templateMode: templateLayout.mode,
    imageX,
    imageY,
    imageWidth: imageDrawWidth,
    imageHeight: imageDrawHeight,
    barTop,
    contentHeight,
    blockTop,
    totalTextHeight,
    cornerPadding,
  });
  const readable = resolveReadableTextAndDivider({
    autoTextContrast: frameParams.autoTextContrast,
    averageLuminance,
    fallbackTextColor: frameParams.textColor,
    fallbackDividerColor: frameParams.dividerColor,
  });

  if (frameParams.dividerShow && templateLayout.mode === "bottom-bar") {
    const dividerY =
      blockTop > imageBottom ? imageBottom + (blockTop - imageBottom) / 2 : barTop;
    ctx.strokeStyle = readable.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(horizontalMargin, dividerY);
    ctx.lineTo(contentWidth - horizontalMargin, dividerY);
    ctx.stroke();
  }

  ctx.fillStyle = readable.textColor;
  ctx.textBaseline = "alphabetic";

  const textStart = left;
  let cursorY = blockTop;
  renderLines.forEach((line, index) => {
    const firstLine = index === 0;
    const fontSize = firstLine ? primaryFontSize : secondaryFontSize;
    const weight = 700;
    if (index > 0) cursorY += extraLineGap;
    ctx.font = `${weight} ${fontSize}px ${getPreviewFontFamily(frameParams.fontFamily)}`;
    const y = cursorY + lineMetrics[index].ascent;
    const metrics = ctx.measureText(line);
    const logoFontScale = Math.max(0.5, fontSize / LOGO_FONT_SCALE_BASE);
    const logoInline =
      firstLine && logoImage
        ? calcLogoInline(
            logoImage,
            frameParams.logoSize * LOGO_VISUAL_SCALE * logoFontScale,
          )
        : null;
    const textWidth = line ? metrics.width : 0;
    const inlineGap = logoInline && line ? frameParams.logoGap * scale : 0;
    const inlineWidth = textWidth + (logoInline ? logoInline.width + inlineGap : 0);
    // Strict baseline alignment: icon bottom follows text baseline exactly.
    const logoTop = logoInline
      ? y + fontSize * LOGO_BASELINE_OFFSET_RATIO - logoInline.height
      : y;

    const centerX = (textStart + right) / 2;
    if (templateLayout.placement === "corner-bottom-right") {
      const textX = imageX + imageDrawWidth - cornerPadding;
      ctx.textAlign = "right";
      if (logoInline && logoImage) {
        const inlineStart = textX - inlineWidth;
        drawLogoInline(ctx, logoImage, logoInline, inlineStart, logoTop);
        if (line) {
          ctx.textAlign = "left";
          ctx.fillText(line, inlineStart + logoInline.width + inlineGap, y);
        }
        cursorY += lineMetrics[index].height;
        return;
      }
      if (line) {
        ctx.fillText(line, textX, y);
      }
      cursorY += lineMetrics[index].height;
      return;
    }

    ctx.textAlign = "center";
    if (logoInline && logoImage) {
      const inlineStart = centerX - inlineWidth / 2;
      drawLogoInline(ctx, logoImage, logoInline, inlineStart, logoTop);
      if (line) {
        ctx.textAlign = "left";
        ctx.fillText(line, inlineStart + logoInline.width + inlineGap, y);
      }
      cursorY += lineMetrics[index].height;
      return;
    }
    if (line) {
      ctx.fillText(line, centerX, y);
    }
    cursorY += lineMetrics[index].height;
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
  if (config.watermarkTemplate && config.watermarkTemplate.length > 0) {
    return buildDslLines(exif, config.watermarkTemplate);
  }

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

export function buildRenderableLines(lines: string[], hasLogo: boolean) {
  if (lines.length > 0) return lines;
  return hasLogo ? [""] : [];
}

export function shouldLiftLogoOnlyWatermark(
  templateKind: TemplateKind,
  logoOnlyWatermark: boolean,
) {
  return logoOnlyWatermark && WATERMARK_LAYOUT_SPEC.logoOnlyLiftTemplates.includes(templateKind);
}

type WatermarkBlockTopArgs = {
  barTop: number;
  contentHeight: number;
  imageBottom: number;
  totalTextHeight: number;
  offsetY?: number;
};

export function computeWatermarkBlockTop({
  barTop,
  contentHeight,
  imageBottom,
  totalTextHeight,
  offsetY = 0,
}: WatermarkBlockTopArgs) {
  const centeredTop =
    imageBottom + (contentHeight - imageBottom - totalTextHeight) / 2;
  const preferredTop = centeredTop + offsetY;
  const minTop = Math.max(barTop, imageBottom);
  const maxTop = Math.max(minTop, contentHeight - totalTextHeight);
  return Math.min(Math.max(minTop, preferredTop), maxTop);
}

function computeCornerWatermarkBlockTop({
  imageY,
  imageBottom,
  totalTextHeight,
  cornerPadding,
}: {
  imageY: number;
  imageBottom: number;
  totalTextHeight: number;
  cornerPadding: number;
}) {
  const preferredTop = imageBottom - totalTextHeight - cornerPadding;
  const minTop = imageY + cornerPadding;
  const maxTop = imageBottom - totalTextHeight - cornerPadding;
  return Math.min(Math.max(minTop, preferredTop), maxTop);
}

function trim(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

type LineMetric = { ascent: number; height: number };

function computeLineMetrics(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontFamily: FrameParams["fontFamily"],
  primarySize: number,
  secondarySize: number,
) {
  return lines.map((line, index): LineMetric => {
    const fontSize = index === 0 ? primarySize : secondarySize;
    ctx.font = `700 ${fontSize}px ${getPreviewFontFamily(fontFamily)}`;
    const target = line || "A";
    const metrics = ctx.measureText(target);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    return { ascent, height: Math.max(fontSize, ascent + descent) };
  });
}

function sampleWatermarkLuminance(
  ctx: CanvasRenderingContext2D,
  args: {
    templateKind: TemplateKind;
    templateMode: "bottom-bar" | "corner-overlay";
    imageX: number;
    imageY: number;
    imageWidth: number;
    imageHeight: number;
    barTop: number;
    contentHeight: number;
    blockTop: number;
    totalTextHeight: number;
    cornerPadding: number;
  },
) {
  const { templateKind, templateMode } = args;
  const isCorner = templateMode !== "bottom-bar" || templateKind === "minimal-corner";
  if (isCorner) {
    const x = Math.max(args.imageX, args.imageX + args.imageWidth - 260);
    const y = Math.max(args.imageY, args.imageY + args.imageHeight - 120 - args.cornerPadding);
    return averageLuminance(ctx, x, y, 240, 90);
  }

  const y = Math.max(args.barTop, args.blockTop - 8);
  const h = Math.max(20, Math.min(args.contentHeight - y, args.totalTextHeight + 20));
  return averageLuminance(ctx, 0, y, ctx.canvas.width, h);
}

function averageLuminance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.min(Math.floor(width), ctx.canvas.width - sx));
  const sh = Math.max(1, Math.min(Math.floor(height), ctx.canvas.height - sy));
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return total / (sw * sh);
}

function buildDslLines(exif: ExifData, templates: string[]) {
  const cameraModel = normalizeModel(exif.camera.make, exif.camera.model);
  const params = [
    exif.focalLength ? `${Math.round(exif.focalLength)}mm` : "",
    exif.aperture ? `f/${trim(exif.aperture)}` : "",
    exif.shutterSpeed,
    exif.iso ? `ISO${exif.iso}` : "",
  ].filter(Boolean).join(" ");

  const dict: Record<string, string> = {
    Make: exif.camera.make,
    Model: cameraModel,
    Camera: cameraModel,
    LensModel: cleanDisplayText(exif.lens),
    Lens: cleanDisplayText(exif.lens),
    FocalLength: exif.focalLength ? String(Math.round(exif.focalLength)) : "",
    FNumber: exif.aperture ? trim(exif.aperture) : "",
    ExposureTime: exif.shutterSpeed,
    ISO: exif.iso ? String(exif.iso) : "",
    Params: params,
  };

  return templates
    .map((line) =>
      line.replace(/\{([A-Za-z0-9_]+)\}/g, (_full, key: string) => dict[key] ?? ""))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
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
  const bounds = getLogoContentBounds(image);
  const ratio = bounds.sw / Math.max(1, bounds.sh);
  const height = Math.max(12, targetHeight);
  return {
    width: height * ratio,
    height,
  };
}

type LogoContentBounds = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

function getLogoContentBounds(image: HTMLImageElement): LogoContentBounds {
  const cached = logoBoundsCache.get(image);
  if (cached) return cached;

  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  const fallback = { sx: 0, sy: 0, sw: width, sh: height };
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= 0) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) {
      logoBoundsCache.set(image, fallback);
      return fallback;
    }
    const bounds = {
      sx: minX,
      sy: minY,
      sw: maxX - minX + 1,
      sh: maxY - minY + 1,
    };
    logoBoundsCache.set(image, bounds);
    return bounds;
  } catch {
    return fallback;
  }
}

function drawLogoInline(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: { width: number; height: number },
  x: number,
  topY: number,
) {
  const bounds = getLogoContentBounds(image);
  ctx.drawImage(
    image,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    x,
    topY,
    size.width,
    size.height,
  );
}
