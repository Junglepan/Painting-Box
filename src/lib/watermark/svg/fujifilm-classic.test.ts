import { describe, expect, test } from "bun:test";

import { getTemplateDefaults } from "@/stores/template-store";
import type { ExifData } from "@/stores/types";
import { buildFujifilmClassicSvg, makeFujifilmClassicSvgResponsive } from "./fujifilm-classic";

const exif: ExifData = {
  camera: { make: "FUJIFILM", model: "X100VI" },
  lens: "23mm F2",
  focalLength: 23,
  aperture: 8,
  shutterSpeed: "1/250",
  iso: 160,
  takenAt: "2026-04-30T08:00:00",
};

function firstFontSize(svg: string, text: string): number {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = svg.match(new RegExp(`font-size="([0-9.]+)"[^>]*>${escaped}<`));
  if (!match) throw new Error(`font size for ${text} not found`);
  return Number(match[1]);
}

function firstImageRect(svg: string) {
  const match = svg.match(/<image[^>]* x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/);
  if (!match) throw new Error("image rect not found");
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
}

function viewBoxSize(svg: string) {
  const match = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  if (!match) throw new Error("viewBox not found");
  return { width: Number(match[1]), height: Number(match[2]) };
}

function textY(svg: string, value: string): number {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = svg.match(new RegExp(`<text[^>]*>${escaped}<`))?.[0];
  const match = tag?.match(/ y="([0-9.]+)"/);
  if (!match) throw new Error(`text y for ${value} not found`);
  return Number(match[1]);
}

describe("Fujifilm Classic SVG", () => {
  test("scales watermark typography with high-resolution export canvas", () => {
    const { frameParams, config } = getTemplateDefaults("fujifilm-classic");
    const previewSvg = buildFujifilmClassicSvg(8256, 5504, exif, frameParams, config, "preview.jpg", 900);
    const exportSvg = buildFujifilmClassicSvg(8256, 5504, exif, frameParams, config, "__FUJI_PHOTO__", 8256);

    const previewWordmark = firstFontSize(previewSvg, "FUJIFILM");
    const exportWordmark = firstFontSize(exportSvg, "FUJIFILM");

    expect(exportWordmark / previewWordmark).toBeCloseTo(8256 / 900, 3);
  });

  test("keeps inline preview SVG visible in a flex container", () => {
    const { frameParams, config } = getTemplateDefaults("fujifilm-classic");
    const svg = buildFujifilmClassicSvg(8256, 5504, exif, frameParams, config, "preview.jpg", 900);

    const responsive = makeFujifilmClassicSvgResponsive(svg);

    expect(responsive).toContain('width="100%"');
    expect(responsive).toContain('height="100%"');
    expect(responsive).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(responsive).toContain('style="display:block;"');
    expect(responsive).toContain('viewBox="0 0 ');
  });

  test("uses compact margins and keeps lowered watermark inside the canvas", () => {
    const { frameParams, config } = getTemplateDefaults("fujifilm-classic");
    const svg = buildFujifilmClassicSvg(8256, 5504, exif, frameParams, config, "preview.jpg", 900);

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);
    const wordmarkY = textY(svg, "FUJIFILM");

    expect(image.width / box.width).toBeGreaterThan(0.82);
    expect(image.x / box.width).toBeLessThan(0.09);
    expect(wordmarkY).toBeGreaterThan(image.y + image.height);
    expect(wordmarkY).toBeLessThan(box.height - 8);
  });
});
