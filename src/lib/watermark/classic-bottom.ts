import { normalizeModel } from "@/lib/exif/brand";
import { resolveLogoSelection } from "@/lib/exif/logo";
import FONT_MAPPING from "@/shared/font-mapping.json";
import type {
  DateFormat,
  ExifData,
  FrameParams,
  TemplateConfig,
  TemplateKind,
} from "@/stores/types";
import { CUSTOM_LINES_MAX } from "@/stores/types";
import { getTemplateLayout, type TemplateLayoutMode, type WatermarkPlacement } from "./template-layout";
import { TEMPLATE_REGISTRY } from "./template-registry";
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

type PreviewGeometryMetrics = {
  infoBarHeight: number;
  innerRadius: number;
  photoBorder: number;
  horizontalMargin: number;
  cornerPadding: number;
  logoGap: number;
};

type PreviewRenderPlan = {
  templateMode: TemplateLayoutMode;
  placement: WatermarkPlacement;
  canvasW: number;
  canvasH: number;
  infoBarHeight: number;
  topBottomMargin: number;
  availableHeight: number;
  imageX: number;
  imageY: number;
  photoW: number;
  photoH: number;
  imageBottom: number;
  barTop: number;
  blockTop: number;
  totalTextHeight: number;
  extraLineGap: number;
  primaryFontSize: number;
  secondaryFontSize: number;
  horizontalMargin: number;
  cornerPadding: number;
};

type TextSampleBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function resolvePreviewGeometryMetrics(frameParams: FrameParams): PreviewGeometryMetrics {
  return {
    infoBarHeight: frameParams.infoBarHeight,
    innerRadius: frameParams.innerRadius,
    photoBorder: frameParams.photoBorder,
    horizontalMargin: WATERMARK_LAYOUT_SPEC.dividerHorizontalMarginPx,
    cornerPadding: WATERMARK_LAYOUT_SPEC.cornerPaddingPx,
    logoGap: frameParams.logoGap,
  };
}

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

export function buildPreviewRenderPlan({
  photoWidth,
  photoHeight,
  frameParams,
  templateKind,
  totalTextHeight,
  logoOnlyWatermark,
  showWatermark = true,
  baseWidth = 900,
}: {
  photoWidth: number;
  photoHeight: number;
  frameParams: FrameParams;
  templateKind: TemplateKind;
  totalTextHeight: number;
  logoOnlyWatermark: boolean;
  showWatermark?: boolean;
  baseWidth?: number;
}): PreviewRenderPlan {
  const templateLayout = getTemplateLayout(templateKind);
  const topBottomMargin = Math.round(baseWidth * (frameParams.minTopBottomMargin / 100));
  const primaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinPrimaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.primaryFontScale,
  );
  const secondaryFontSize = Math.max(
    WATERMARK_LAYOUT_SPEC.baseMinSecondaryFontSize,
    frameParams.fontSize * WATERMARK_LAYOUT_SPEC.secondaryFontScale,
  );
  const extraLineGap = WATERMARK_LAYOUT_SPEC.baseLineGapPx;
  const geometry = resolvePreviewGeometryMetrics(frameParams);
  const minInfoBarHeight = Math.round(totalTextHeight) + 12;
  // When watermark is off the info bar disappears entirely → image fills the canvas.
  const infoBarHeight = !showWatermark
    ? 0
    : templateLayout.mode === "bottom-bar"
      ? Math.max(geometry.infoBarHeight, minInfoBarHeight)
      : 0;
  const canvasRatio = getCanvasRatio(frameParams.canvasRatio, frameParams.canvasOrientation ?? "landscape");
  const canvasH = baseWidth / canvasRatio;
  const barTop = canvasH - infoBarHeight;
  const availableHeight = Math.max(
    1,
    (templateLayout.mode === "bottom-bar" ? barTop : canvasH) - topBottomMargin * 2,
  );
  const naturalWidth = Math.round(baseWidth * (frameParams.mainImageWidthRatio / 100));
  const naturalHeight = (photoHeight * naturalWidth) / photoWidth;
  const fitScale = Math.min(1, availableHeight / naturalHeight);
  const photoW = Math.round(naturalWidth * fitScale);
  const photoH = Math.round(naturalHeight * fitScale);
  const imageX = Math.floor((baseWidth - photoW) / 2);
  const imageY = topBottomMargin + Math.floor((availableHeight - photoH) / 2);
  const imageBottom = imageY + photoH;
  const blockTop = templateLayout.mode === "bottom-bar"
    ? computeWatermarkBlockTop({
        barTop,
        contentHeight: canvasH,
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
        cornerPadding: geometry.cornerPadding,
      });

  return {
    templateMode: templateLayout.mode,
    placement: templateLayout.placement,
    canvasW: baseWidth,
    canvasH,
    infoBarHeight,
    topBottomMargin,
    availableHeight,
    imageX,
    imageY,
    photoW,
    photoH,
    imageBottom,
    barTop,
    blockTop,
    totalTextHeight,
    extraLineGap,
    primaryFontSize,
    secondaryFontSize,
    horizontalMargin: geometry.horizontalMargin,
    cornerPadding: geometry.cornerPadding,
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
  const watermarkActive = config.showWatermark ?? true;
  const textLines = watermarkActive ? buildPreviewLines(photo.exif, config) : [];
  const effectiveLogo = watermarkActive ? logoImage : null;
  const renderLines = buildRenderableLines(textLines, Boolean(effectiveLogo));
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
  const plan = buildPreviewRenderPlan({
    photoWidth: photo.width,
    photoHeight: photo.height,
    frameParams,
    templateKind,
    totalTextHeight: textBlockHeight,
    logoOnlyWatermark: Boolean(effectiveLogo) && renderLines.length === 1 && renderLines[0] === "",
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

  // Shadow is cast by a filled shape drawn BEFORE the clipped image so it's
  // visible outside the photo bounds. The fill is then covered by the image.
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
  roundRect(
    ctx,
    plan.imageX,
    plan.imageY,
    plan.photoW,
    plan.photoH,
    geometry.innerRadius,
  );
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
    roundRect(
      ctx,
      plan.imageX,
      plan.imageY,
      plan.photoW,
      plan.photoH,
      geometry.innerRadius,
    );
    ctx.stroke();
    ctx.restore();
  }

  const left = plan.horizontalMargin;
  const right = plan.canvasW - plan.horizontalMargin;

  const sampleBoxes = buildTextSampleBoxes({
    ctx,
    renderLines,
    lineMetrics,
    plan,
    frameParams,
    logoImage: effectiveLogo,
    left,
    right,
  });

  const averageLuminance = sampleBoxes.length > 0
    ? averageLuminanceForBoxes(ctx, sampleBoxes)
    : sampleWatermarkLuminance(ctx, {
        templateKind,
        templateMode: plan.templateMode,
        imageX: plan.imageX,
        imageY: plan.imageY,
        imageWidth: plan.photoW,
        imageHeight: plan.photoH,
        barTop: plan.barTop,
        contentHeight: plan.canvasH,
        blockTop: plan.blockTop,
        totalTextHeight: plan.totalTextHeight,
        cornerPadding: plan.cornerPadding,
      });
  const readable = resolveReadableTextAndDivider({
    autoTextContrast: frameParams.autoTextContrast,
    averageLuminance,
    fallbackTextColor: frameParams.textColor,
    fallbackDividerColor: frameParams.dividerColor,
  });

  if (frameParams.dividerShow && plan.templateMode === "bottom-bar") {
    const dividerY =
      plan.blockTop > plan.imageBottom
        ? plan.imageBottom + (plan.blockTop - plan.imageBottom) / 2
        : plan.barTop;
    ctx.strokeStyle = readable.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plan.horizontalMargin, dividerY);
    ctx.lineTo(plan.canvasW - plan.horizontalMargin, dividerY);
    ctx.stroke();
  }

  ctx.fillStyle = readable.textColor;
  ctx.textBaseline = "alphabetic";

  const textStart = left;
  let cursorY = plan.blockTop;
  renderLines.forEach((line, index) => {
    const firstLine = index === 0;
    const fontSize = firstLine ? plan.primaryFontSize : plan.secondaryFontSize;
    const weight = 700;
    if (index > 0) cursorY += plan.extraLineGap;
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
    const inlineGap = logoInline && line ? geometry.logoGap : 0;
    const inlineWidth = textWidth + (logoInline ? logoInline.width + inlineGap : 0);
    // Strict baseline alignment: icon bottom follows text baseline exactly.
    const logoTop = logoInline
      ? Math.max(cursorY, y + fontSize * LOGO_BASELINE_OFFSET_RATIO - logoInline.height)
      : y;

    const centerX = (textStart + right) / 2;
    if (plan.placement === "corner-bottom-right") {
      const textX = plan.imageX + plan.photoW - plan.cornerPadding;
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
  orientation: FrameParams["canvasOrientation"],
) {
  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) return 3 / 2;
  // landscape = w/h (>1), portrait = h/w (flipped, <1 → taller canvas)
  return orientation === "portrait" ? rh / rw : rw / rh;
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

  if (config.showDate) {
    const date = formatTakenAt(exif.takenAt, config.dateFormat);
    if (date) lines.push(date);
  }

  for (const custom of sanitizeCustomLines(config.customLines)) {
    lines.push(custom);
  }

  return lines.filter(Boolean);
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatTakenAt(takenAt: string, format: DateFormat): string {
  if (!takenAt) return "";
  // EXIF DateTimeOriginal is typically "YYYY:MM:DD HH:MM:SS"; tolerate other separators.
  const match = takenAt.match(/^(\d{4})[-:.\/](\d{1,2})[-:.\/](\d{1,2})/);
  if (!match) return "";
  const year = match[1];
  const monthNum = Number.parseInt(match[2], 10);
  const month = String(monthNum).padStart(2, "0");
  const day = match[3].padStart(2, "0");
  if (monthNum < 1 || monthNum > 12) return "";
  const monthShort = MONTH_NAMES_SHORT[monthNum - 1];
  switch (format) {
    case "YYYY-MM-DD":  return `${year}-${month}-${day}`;
    case "YYYY/MM/DD":  return `${year}/${month}/${day}`;
    case "YYYY.MM.DD":  return `${year}.${month}.${day}`;
    case "DD MMM YYYY": return `${day} ${monthShort} ${year}`;
    case "MMM DD, YYYY": return `${monthShort} ${day}, ${year}`;
    default: return `${year}-${month}-${day}`;
  }
}

export function sanitizeCustomLines(lines: string[] | undefined | null): string[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .slice(0, CUSTOM_LINES_MAX)
    .map((line) => cleanDisplayText(typeof line === "string" ? line : ""))
    .filter(Boolean);
}

export function buildRenderableLines(lines: string[], hasLogo: boolean) {
  if (lines.length > 0) return lines;
  return hasLogo ? [""] : [];
}

export function shouldLiftLogoOnlyWatermark(
  templateKind: TemplateKind,
  logoOnlyWatermark: boolean,
) {
  return logoOnlyWatermark && TEMPLATE_REGISTRY[templateKind].liftLogoOnly;
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
    // fontBoundingBox matches ab_glyph's ascent/descent from the same font tables.
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
    return { ascent, height: Math.max(fontSize, ascent + descent) };
  });
}

function sampleWatermarkLuminance(
  ctx: CanvasRenderingContext2D,
  args: {
    templateKind: TemplateKind;
    templateMode: TemplateLayoutMode;
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

export function buildTextSampleBoxes({
  ctx,
  renderLines,
  lineMetrics,
  plan,
  frameParams,
  logoImage,
  left,
  right,
}: {
  ctx: CanvasRenderingContext2D;
  renderLines: string[];
  lineMetrics: LineMetric[];
  plan: PreviewRenderPlan;
  frameParams: FrameParams;
  logoImage: HTMLImageElement | null;
  left: number;
  right: number;
}) {
  const boxes: TextSampleBox[] = [];
  const textStart = left;
  let cursorY = plan.blockTop;

  renderLines.forEach((line, index) => {
    const firstLine = index === 0;
    const fontSize = firstLine ? plan.primaryFontSize : plan.secondaryFontSize;
    if (index > 0) cursorY += plan.extraLineGap;
    ctx.font = `700 ${fontSize}px ${getPreviewFontFamily(frameParams.fontFamily)}`;
    const baselineY = cursorY + lineMetrics[index].ascent;
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
    const inlineGap = logoInline && line ? frameParams.logoGap : 0;
    const inlineWidth = textWidth + (logoInline ? logoInline.width + inlineGap : 0);
    const centerX = (textStart + right) / 2;
    let textX = 0;

    if (plan.placement === "corner-bottom-right") {
      const textRight = plan.imageX + plan.photoW - plan.cornerPadding;
      textX = logoInline ? textRight - inlineWidth + logoInline.width + inlineGap : textRight - textWidth;
    } else {
      textX = logoInline
        ? centerX - inlineWidth / 2 + logoInline.width + inlineGap
        : centerX - textWidth / 2;
    }

    if (textWidth > 0) {
      boxes.push({
        x: textX,
        y: baselineY - lineMetrics[index].ascent,
        width: textWidth,
        height: lineMetrics[index].height,
      });
    }

    cursorY += lineMetrics[index].height;
  });

  return boxes;
}

function averageLuminanceForBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: TextSampleBox[],
) {
  let totalLuminance = 0;
  let totalArea = 0;
  for (const box of boxes) {
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));
    const area = width * height;
    totalLuminance += averageLuminance(ctx, box.x, box.y, width, height) * area;
    totalArea += area;
  }
  return totalArea > 0 ? totalLuminance / totalArea : 0;
}

export function averageLuminance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const transform = ctx.getTransform();
  const scaleX = Math.abs(transform.a) || 1;
  const scaleY = Math.abs(transform.d) || 1;
  const sx = Math.max(0, Math.floor(x * scaleX));
  const sy = Math.max(0, Math.floor(y * scaleY));
  const sw = Math.max(1, Math.min(Math.floor(width * scaleX), ctx.canvas.width - sx));
  const sh = Math.max(1, Math.min(Math.floor(height * scaleY), ctx.canvas.height - sy));
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

export function backgroundFill(frameParams: FrameParams) {
  if (frameParams.background === "black") return "#111827";
  if (frameParams.background === "custom") return frameParams.bgColor;
  if (frameParams.background === "blur") return "#eef1f6";
  return "#ffffff";
}

export function cleanDisplayText(value: string) {
  return value.trim().replace(/^"+|"+$/g, "").trim();
}

export function getPreviewFontFamily(fontFamily: FrameParams["fontFamily"]) {
  const mapped = FONT_MAPPING[fontFamily];
  if (mapped?.cssFamily) return mapped.cssFamily;
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

export function resolvePreviewLogoSelection(
  exif: ExifData,
  frameParams: FrameParams,
  config: TemplateConfig,
) {
  if (!config.showLogo) return null;
  const selection = resolveLogoSelection(
    frameParams.logoKey,
    frameParams.logoVariant,
    exif.camera.make,
  );
  if (!selection.key) return null;
  return selection;
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
