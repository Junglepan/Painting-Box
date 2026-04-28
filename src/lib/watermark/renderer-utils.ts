import type { ExifData, FrameParams } from "@/stores/types";

export type ShowcasePhoto = {
  width: number;
  height: number;
  src: string;
  exif: ExifData;
};

/** Resolve canvas pixel ratio honoring the user's DPR for crisp text. */
export function dprFor(canvas: HTMLCanvasElement): number {
  void canvas;
  return typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
}

/** Map FrameParams canvas ratio + orientation → numeric width/height ratio. */
export function getCanvasRatio(
  ratio: FrameParams["canvasRatio"],
  orientation: FrameParams["canvasOrientation"],
) {
  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) return 3 / 2;
  return orientation === "portrait" ? rh / rw : rw / rh;
}

/** Letterbox-fit a photo into an area, returning the centered draw rect. */
export function fitPhoto(
  area: { x: number; y: number; w: number; h: number },
  photoW: number,
  photoH: number,
) {
  const photoRatio = photoW / photoH;
  const areaRatio = area.w / area.h;
  let w: number;
  let h: number;
  if (photoRatio > areaRatio) {
    w = area.w;
    h = w / photoRatio;
  } else {
    h = area.h;
    w = h * photoRatio;
  }
  return {
    x: area.x + (area.w - w) / 2,
    y: area.y + (area.h - h) / 2,
    w,
    h,
  };
}

/** Compose params row "35mm · f/1.8 · 1/250 · ISO200". */
export function paramsLine(exif: ExifData, separator = "  ·  "): string {
  const items: string[] = [];
  if (exif.focalLength) items.push(`${Math.round(exif.focalLength)}mm`);
  if (exif.aperture) items.push(`f/${trimNumeric(exif.aperture)}`);
  if (exif.shutterSpeed) items.push(exif.shutterSpeed);
  if (exif.iso) items.push(`ISO${exif.iso}`);
  return items.join(separator);
}

export function trimNumeric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Same rounded-rect helper used by the other renderers; pulled here so each
 *  template module stays self-contained without re-importing classic-bottom. */
export function roundRectPath(
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
