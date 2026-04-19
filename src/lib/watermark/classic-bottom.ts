import { formatCamera } from "@/lib/exif/brand";
import type { ExifData, FrameParams, TemplateConfig } from "@/stores/types";

type PreviewData = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

export function drawClassicBottomPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
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
  const textLines = previewLines(photo.exif, config);
  const textGap = Math.max(2, baseWidth * (frameParams.textMargin / 100));
  const primaryFontSize = Math.max(16, frameParams.fontSize * 1.18);
  const secondaryFontSize = Math.max(13, frameParams.fontSize * 0.96);
  const textBlockHeight =
    textLines.length > 1 ? primaryFontSize + secondaryFontSize + textGap : primaryFontSize;
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

  if (frameParams.shadow) {
    ctx.save();
    ctx.shadowColor = `rgba(17,24,39,${frameParams.shadowOpacity / 100})`;
    ctx.shadowBlur = frameParams.shadowBlur * scale * 0.6;
    ctx.shadowOffsetY = frameParams.shadowOffsetY * scale * 0.5;
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

  if (frameParams.shadow) {
    ctx.restore();
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

  ctx.fillStyle = frameParams.textColor;
  ctx.textBaseline = "middle";

  const textStart = left;
  const lineGap = textGap;

  textLines.forEach((line, index) => {
    const y =
      centerY -
      ((textLines.length - 1) * lineGap) / 2 +
      index * lineGap;

    const firstLine = index === 0;
    const fontSize = firstLine ? primaryFontSize : secondaryFontSize;
    const weight = firstLine ? 700 : frameParams.fontWeight;
    ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;

    if (frameParams.textAlign === "right") {
      ctx.textAlign = "right";
      ctx.fillText(line, right, y);
      return;
    }
    if (frameParams.textAlign === "center") {
      ctx.textAlign = "center";
      ctx.fillText(line, (textStart + right) / 2, y);
      return;
    }
    ctx.textAlign = "left";
    ctx.fillText(line, textStart, y);
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

function previewLines(exif: ExifData, config: TemplateConfig) {
  const first: string[] = [];
  const second: string[] = [];

  if (config.showCamera) {
    const camera = formatCamera(exif.camera.make, exif.camera.model);
    if (camera) first.push(camera);
  }
  if (config.showLens && exif.lens) first.push(exif.lens);

  if (config.showParams) {
    const params = [
      exif.focalLength ? `${Math.round(exif.focalLength)}mm` : "",
      exif.aperture ? `f/${trim(exif.aperture)}` : "",
      exif.shutterSpeed,
      exif.iso ? `ISO${exif.iso}` : "",
    ].filter(Boolean);
    if (params.length) second.push(params.join(" "));
  }

  if (config.showDateTime && exif.takenAt) second.push(exif.takenAt);
  if (config.showGps && exif.gps) {
    second.push(`${exif.gps.lat.toFixed(4)}, ${exif.gps.lng.toFixed(4)}`);
  }

  let firstLine = first.join("  ·  ");
  if (config.showLogo) {
    firstLine = firstLine ? `PB  ·  ${firstLine}` : "PB";
  }
  return [firstLine, second.join("  ·  ")].filter(Boolean);
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
