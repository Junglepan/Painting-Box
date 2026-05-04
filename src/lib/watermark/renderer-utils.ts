import type { ExifData, FrameParams } from "@/stores/types";

/** Map FrameParams canvas ratio + orientation → numeric width/height ratio.
 *  photoAspect (photoW/photoH) is required when orientation === "auto". */
export function getCanvasRatio(
  ratio: FrameParams["canvasRatio"],
  orientation: FrameParams["canvasOrientation"],
  photoAspect?: number,
) {
  const [rw, rh] = ratio.split(":").map(Number);
  if (!rw || !rh) return 3 / 2;
  const effective =
    orientation === "auto"
      ? photoAspect !== undefined && photoAspect < 1 ? "portrait" : "landscape"
      : orientation;
  return effective === "portrait" ? rh / rw : rw / rh;
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

function trimNumeric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
