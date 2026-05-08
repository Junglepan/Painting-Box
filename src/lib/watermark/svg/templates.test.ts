import { describe, expect, test } from "bun:test";

import { getTemplateDefaults } from "@/stores/template-store";
import type { ExifData, Photo } from "@/stores/types";
import { getTemplateFrameCapabilities } from "@/lib/template-capabilities";
import { buildPreviewLines, buildPreviewRenderPlan, buildRenderableLines } from "../classic-bottom";
import { WATERMARK_LAYOUT_SPEC } from "../layout-spec";
import { SVG_PHOTO_PLACEHOLDER } from "./shared";
import { buildWatermarkSvgTemplate, SVG_TEMPLATE_KINDS } from "./templates";

const exif: ExifData = {
  camera: { make: "NIKON CORPORATION", model: "NIKON Z 7II" },
  lens: "NIKKOR Z 70-200mm f/2.8 VR S",
  focalLength: 115,
  aperture: 7.1,
  shutterSpeed: "1/250 s",
  iso: 125,
  takenAt: "2026-04-30T08:12:34",
};

const photo: Photo = {
  id: "p1",
  path: "/tmp/PBK_6279.jpg",
  width: 8256,
  height: 5504,
  previewStatus: "ready",
  exifStatus: "ready",
  exif,
};

function firstFontSize(svg: string, text: string): number {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = svg.match(new RegExp(`font-size="([0-9.]+)"[^>]*>[^<]*${escaped}[^<]*<`));
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

function textTag(svg: string, text: string): string {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = svg.match(new RegExp(`<text[^>]*>[^<]*${escaped}[^<]*<\\/text>`))?.[0];
  if (!tag) throw new Error(`text tag for ${text} not found`);
  return tag;
}

function textY(svg: string, text: string): number {
  const y = Number(textTag(svg, text).match(/ y="([0-9.]+)"/)?.[1]);
  if (!Number.isFinite(y)) throw new Error(`text y for ${text} not found`);
  return y;
}

function textX(svg: string, text: string): number {
  const x = Number(textTag(svg, text).match(/ x="([0-9.]+)"/)?.[1]);
  if (!Number.isFinite(x)) throw new Error(`text x for ${text} not found`);
  return x;
}

function imageRectByHref(svg: string, href: string) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = svg.match(new RegExp(`<image[^>]*href="${escaped}"[^>]*>`))?.[0];
  if (!tag) throw new Error(`image with href ${href} not found`);
  const match = tag.match(/ x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/);
  if (!match) throw new Error(`image rect for ${href} not found`);
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

describe("watermark SVG templates", () => {
  test("covers every template kind", () => {
    expect([...SVG_TEMPLATE_KINDS].sort()).toEqual([
      "cinematic",
      "classic-bottom",
      "contact-sheet",
      "crop-marks",
      "darkroom-proof",
      "film-strip",
      "fujifilm-classic",
      "hasselblad",
      "magazine",
      "minimal-corner",
      "photo-album",
      "xiaomi-leica",
    ]);
  });

  test.each([
    ["classic-bottom", "Z 7II"],
    ["magazine", "Z 7II"],
    ["minimal-corner", "115mm"],
    ["cinematic", "Z 7II"],
    ["film-strip", "34  ·  Z 7II"],
    ["xiaomi-leica", "Z 7II"],
    ["photo-album", null],
    ["crop-marks", "Z 7II"],
    ["darkroom-proof", "PROOF"],
    ["contact-sheet", "→ FRAME 24A"],
    ["fujifilm-classic", "FUJIFILM"],
    ["hasselblad", "HASSELBLAD"],
  ] as const)("%s builds an export SVG with the photo placeholder", (kind, marker) => {
    const { frameParams, config } = getTemplateDefaults(kind);

    const svg = buildWatermarkSvgTemplate(photo, kind, frameParams, config);

    expect(svg).toContain("<svg");
    expect(svg).toContain(SVG_PHOTO_PLACEHOLDER);
    if (marker) expect(svg).toContain(marker);
  });

  test.each([
    ["classic-bottom", "Z 7II"],
    ["magazine", "Z 7II"],
    ["minimal-corner", "115mm"],
    ["cinematic", "Z 7II"],
    ["film-strip", "34  ·  Z 7II"],
    ["xiaomi-leica", "Z 7II"],
    ["crop-marks", "Z 7II"],
    ["darkroom-proof", "PROOF"],
    ["contact-sheet", "→ FRAME 24A"],
    ["fujifilm-classic", "FUJIFILM"],
    ["hasselblad", "HASSELBLAD"],
  ] as const)("%s scales typography for high-resolution export", (kind, marker) => {
    const { frameParams, config } = getTemplateDefaults(kind);

    const previewSvg = buildWatermarkSvgTemplate(photo, kind, frameParams, config, "preview.jpg", 900);
    const exportSvg = buildWatermarkSvgTemplate(photo, kind, frameParams, config, SVG_PHOTO_PLACEHOLDER, 8256);

    const previewSize = firstFontSize(previewSvg, marker);
    const exportSize = firstFontSize(exportSvg, marker);

    expect(exportSize / previewSize).toBeCloseTo(8256 / 900, 3);
  });

  test("classic-bottom SVG uses the legacy preview render plan geometry", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");
    const svg = buildWatermarkSvgTemplate(photo, "classic-bottom", frameParams, config, SVG_PHOTO_PLACEHOLDER, 900);
    const renderLines = buildRenderableLines(buildPreviewLines(exif, config), false);
    const primary = Math.max(WATERMARK_LAYOUT_SPEC.baseMinPrimaryFontSize, frameParams.fontSize * WATERMARK_LAYOUT_SPEC.primaryFontScale);
    const secondary = Math.max(WATERMARK_LAYOUT_SPEC.baseMinSecondaryFontSize, frameParams.fontSize * WATERMARK_LAYOUT_SPEC.secondaryFontScale);
    const totalTextHeight = renderLines.reduce(
      (sum, _line, index) => sum + (index === 0 ? primary : secondary) + (index === 0 ? 0 : WATERMARK_LAYOUT_SPEC.baseLineGapPx),
      0,
    );
    const plan = buildPreviewRenderPlan({
      photoWidth: photo.width ?? 900,
      photoHeight: photo.height ?? 600,
      frameParams,
      templateKind: "classic-bottom",
      totalTextHeight,
      logoOnlyWatermark: false,
      showWatermark: config.showWatermark,
      baseWidth: 900,
    });

    expect(svg).toContain(`x="${plan.imageX}" y="${plan.imageY}" width="${plan.photoW}" height="${plan.photoH}"`);
    const yMatch = svg.match(/<text[^>]*>Z 7II<\/text>/)?.[0].match(/y="([0-9.]+)"/);
    expect(yMatch).toBeTruthy();
    expect(Number(yMatch?.[1])).toBeGreaterThan(plan.blockTop);
    expect(Number(yMatch?.[1])).toBeLessThan(plan.barTop + plan.infoBarHeight);
  });

  test("classic-bottom SVG embeds logo asset while keeping the photo placeholder", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");
    const logo = {
      href: "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%20300%20100%22%2F%3E",
      aspectRatio: 3,
    };

    const svg = buildWatermarkSvgTemplate(
      photo,
      "classic-bottom",
      frameParams,
      { ...config, showLogo: true },
      SVG_PHOTO_PLACEHOLDER,
      900,
      logo,
    );

    expect(svg).toContain(SVG_PHOTO_PLACEHOLDER);
    expect(svg).toContain(logo.href);
    expect(svg?.match(/<image/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("classic-bottom SVG can render logo without text fields", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");
    const logo = {
      href: "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%20300%20100%22%2F%3E",
      aspectRatio: 3,
    };

    const svg = buildWatermarkSvgTemplate(
      photo,
      "classic-bottom",
      frameParams,
      {
        ...config,
        showLogo: true,
        showCamera: false,
        showLens: false,
        showParams: false,
        showDate: false,
      },
      SVG_PHOTO_PLACEHOLDER,
      900,
      logo,
    );

    expect(svg).toContain(logo.href);
    expect(svg).not.toContain(">Z 7II<");
    expect(svg?.match(/<image/g)?.length).toBeGreaterThanOrEqual(2);
  });

  test("magazine SVG uses baseline-aligned inline logo", () => {
    const { frameParams, config } = getTemplateDefaults("magazine");
    const logo = {
      href: "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%20300%20100%22%2F%3E",
      aspectRatio: 3,
    };

    const svg = buildWatermarkSvgTemplate(
      photo,
      "magazine",
      frameParams,
      { ...config, showLogo: true },
      SVG_PHOTO_PLACEHOLDER,
      900,
      logo,
    );

    expect(svg).toContain(logo.href);
    expect(svg).toContain(">Z 7II<");
    const logoTag = svg?.match(new RegExp(`<image[^>]*${logo.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`))?.[0];
    const logoY = Number(logoTag?.match(/ y="([0-9.]+)"/)?.[1]);
    const textY = Number(svg?.match(/<text[^>]*>Z 7II<\/text>/)?.[0].match(/y="([0-9.]+)"/)?.[1]);
    expect(Number.isFinite(logoY)).toBe(true);
    expect(Number.isFinite(textY)).toBe(true);
    expect(logoY).toBeLessThan(textY);
  });

  test("minimal-corner SVG keeps logo in the bottom watermark area", () => {
    const { frameParams, config } = getTemplateDefaults("minimal-corner");
    const logo = {
      href: "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%20300%20100%22%2F%3E",
      aspectRatio: 3,
    };

    const svg = buildWatermarkSvgTemplate(
      photo,
      "minimal-corner",
      frameParams,
      { ...config, showLogo: true },
      SVG_PHOTO_PLACEHOLDER,
      900,
      logo,
    );
    if (!svg) throw new Error("minimal-corner svg did not build");

    const photoRect = firstImageRect(svg);
    const logoRect = imageRectByHref(svg, logo.href);

    expect(logoRect.y - (photoRect.y + photoRect.height)).toBeGreaterThanOrEqual(14);
    expect(logoRect.height).toBeGreaterThanOrEqual(16);
    expect(logoRect.x + logoRect.width).toBeLessThanOrEqual(photoRect.x + photoRect.width + 0.001);
  });

  test("classic-bottom high-resolution export does not double-scale layout controls", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");

    const previewSvg = buildWatermarkSvgTemplate(photo, "classic-bottom", frameParams, config, "preview.jpg", 900);
    const exportSvg = buildWatermarkSvgTemplate(photo, "classic-bottom", frameParams, config, SVG_PHOTO_PLACEHOLDER, 8256);
    if (!previewSvg || !exportSvg) throw new Error("classic-bottom svg did not build");

    const previewRect = firstImageRect(previewSvg);
    const exportRect = firstImageRect(exportSvg);
    const expectedScale = 8256 / 900;

    expect(exportRect.width / previewRect.width).toBeCloseTo(expectedScale, 0);
    expect(exportRect.height / previewRect.height).toBeCloseTo(expectedScale, 0);
    expect(exportRect.height).toBeGreaterThan(3000);
  });

  test("classic-bottom portrait photos on a landscape canvas respond to main image ratio", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");
    const portraitPhoto = { ...photo, width: 5504, height: 8256 };
    const lowSvg = buildWatermarkSvgTemplate(
      portraitPhoto,
      "classic-bottom",
      { ...frameParams, mainImageWidthRatio: 74 },
      config,
      "preview.jpg",
      900,
    );
    const highSvg = buildWatermarkSvgTemplate(
      portraitPhoto,
      "classic-bottom",
      { ...frameParams, mainImageWidthRatio: 92 },
      config,
      "preview.jpg",
      900,
    );
    if (!lowSvg || !highSvg) throw new Error("classic-bottom svg did not build");

    const low = firstImageRect(lowSvg);
    const high = firstImageRect(highSvg);
    const box = viewBoxSize(highSvg);

    expect(high.width).toBeGreaterThan(low.width);
    expect(high.x).toBeGreaterThanOrEqual(0);
    expect(high.x + high.width).toBeLessThanOrEqual(box.width);
    expect(high.height).toBeLessThan(box.height);
  });

  test("classic-bottom SVG preserves the legacy photo shadow", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");

    const svg = buildWatermarkSvgTemplate(
      photo,
      "classic-bottom",
      { ...frameParams, shadow: true, shadowBlur: 18, shadowOffsetY: 2, shadowOpacity: 14 },
      config,
      SVG_PHOTO_PLACEHOLDER,
      900,
    );

    // Three-layer shadow stack uses feGaussianBlur + feOffset + feFlood + feMerge.
    // Far-layer opacity = 0.14 × 0.32 = 0.0448 (multiplier rebalanced 2026-05-08).
    expect(svg).toContain('filter="url(#pb-photo-shadow)"');
    expect(svg).toContain("feGaussianBlur");
    expect(svg).toContain("feMerge");
    expect(svg).toContain('flood-opacity="0.044800000000000006"');
  });

  test("classic-bottom SVG clips the photo image when inner radius is configured", () => {
    const { frameParams, config } = getTemplateDefaults("classic-bottom");
    const svg = buildWatermarkSvgTemplate(
      photo,
      "classic-bottom",
      { ...frameParams, innerRadius: 24 },
      config,
      SVG_PHOTO_PLACEHOLDER,
      900,
    );

    expect(svg).toContain("<clipPath");
    expect(svg).toContain('clip-path="url(#pb-photo-clip)"');
    expect(svg).toContain('rx="24"');
  });

  test("magazine SVG uses compact margins for a larger default photo", () => {
    const { frameParams, config } = getTemplateDefaults("magazine");
    const svg = buildWatermarkSvgTemplate(photo, "magazine", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("magazine svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);

    expect(image.width / box.width).toBeGreaterThan(0.80);
    expect(image.x / box.width).toBeLessThan(0.09);
    expect((box.height - image.y - image.height) / box.height).toBeLessThan(0.16);
  });

  test("cinematic SVG uses expanded letterbox space for a larger default photo", () => {
    const { frameParams, config } = getTemplateDefaults("cinematic");
    const svg = buildWatermarkSvgTemplate(photo, "cinematic", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("cinematic svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);

    expect(image.width / box.width).toBeGreaterThan(0.75);
    expect(image.height / box.height).toBeGreaterThan(0.75);
    expect(image.y / box.height).toBeLessThan(0.11);
    expect(image.y + image.height).toBeLessThanOrEqual(box.height);
  });

  test("photo-album SVG uses a larger pure-photo mount without text", () => {
    const { frameParams, config } = getTemplateDefaults("photo-album");
    const svg = buildWatermarkSvgTemplate(
      photo,
      "photo-album",
      frameParams,
      {
        ...config,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      },
      "preview.jpg",
      900,
    );
    if (!svg) throw new Error("photo-album svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);

    expect(image.width / box.width).toBeGreaterThan(0.78);
    expect(image.height / box.height).toBeGreaterThan(0.78);
    expect(svg).not.toContain(">Z 7II<");
    expect(svg).not.toContain("NIKKOR");
    expect(svg).not.toContain("115mm");
    expect(svg).not.toContain("2026");
  });

  test("darkroom-proof SVG uses a larger fixed proof layout without EXIF text", () => {
    const { frameParams, config } = getTemplateDefaults("darkroom-proof");
    const svg = buildWatermarkSvgTemplate(
      photo,
      "darkroom-proof",
      frameParams,
      {
        ...config,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      },
      "preview.jpg",
      900,
    );
    if (!svg) throw new Error("darkroom-proof svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);

    expect(image.width / box.width).toBeGreaterThan(0.64);
    expect(image.height / box.height).toBeGreaterThan(0.42);
    expect(image.x / box.width).toBeLessThan(0.2);
    expect(svg).toContain("PROOF");
    expect(svg).not.toContain(">Z 7II<");
    expect(svg).not.toContain("NIKKOR");
    expect(svg).not.toContain("115mm");
    expect(svg).not.toContain("2026");
  });

  test("contact-sheet SVG uses a larger fixed frame layout without EXIF text", () => {
    const { frameParams, config } = getTemplateDefaults("contact-sheet");
    const svg = buildWatermarkSvgTemplate(
      photo,
      "contact-sheet",
      frameParams,
      {
        ...config,
        showCamera: true,
        showLens: true,
        showParams: true,
        showDate: true,
      },
      "preview.jpg",
      900,
    );
    if (!svg) throw new Error("contact-sheet svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);

    expect(image.width / box.width).toBeGreaterThan(0.76);
    expect(image.height / box.height).toBeGreaterThan(0.5);
    expect(image.x / box.width).toBeLessThan(0.12);
    expect(svg).toContain("→ FRAME 24A");
    expect(svg).not.toContain(">Z 7II<");
    expect(svg).not.toContain("NIKKOR");
    expect(svg).not.toContain("115mm");
    expect(svg).not.toContain("2026");
  });

  test("hasselblad SVG uses compact margins and keeps lowered watermark inside the canvas", () => {
    const { frameParams, config } = getTemplateDefaults("hasselblad");
    const svg = buildWatermarkSvgTemplate(photo, "hasselblad", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("hasselblad svg did not build");

    const image = firstImageRect(svg);
    const box = viewBoxSize(svg);
    const wordmarkTag = svg.match(/<text[^>]*>HASSELBLAD<\/text>/)?.[0];
    const wordmarkY = Number(wordmarkTag?.match(/ y="([0-9.]+)"/)?.[1]);

    expect(image.width / box.width).toBeGreaterThan(0.82);
    expect(image.x / box.width).toBeLessThan(0.09);
    expect(wordmarkY).toBeGreaterThan(image.y + image.height);
    expect(wordmarkY).toBeLessThan(box.height - 8);
  });

  test("hasselblad uses portrait watermark layout when a portrait photo is placed on a landscape canvas", () => {
    const { frameParams, config } = getTemplateDefaults("hasselblad");
    const portraitPhoto = { ...photo, width: 5504, height: 8256 };
    const svg = buildWatermarkSvgTemplate(portraitPhoto, "hasselblad", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("hasselblad svg did not build");

    const wordmarkY = textY(svg, "HASSELBLAD");
    const paramsY = textY(svg, "115mm");
    const paramsX = textX(svg, "115mm");
    const box = viewBoxSize(svg);

    expect(paramsY).toBeCloseTo(wordmarkY, 3);
    expect(paramsX).toBeGreaterThan(box.width * 0.78);
    expect(wordmarkY).toBeLessThan(box.height - 8);
  });

  test("fujifilm-classic uses portrait watermark layout when a portrait photo is placed on a landscape canvas", () => {
    const { frameParams, config } = getTemplateDefaults("fujifilm-classic");
    const portraitPhoto = { ...photo, width: 5504, height: 8256 };
    const svg = buildWatermarkSvgTemplate(portraitPhoto, "fujifilm-classic", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("fujifilm-classic svg did not build");

    const wordmarkY = textY(svg, "FUJIFILM");
    const paramsY = textY(svg, "115mm");
    const paramsX = textX(svg, "115mm");
    const box = viewBoxSize(svg);

    expect(paramsY).toBeCloseTo(wordmarkY, 3);
    expect(paramsX).toBeGreaterThan(box.width * 0.78);
    expect(wordmarkY).toBeLessThan(box.height - 8);
  });

  test("magazine uses portrait watermark layout when a portrait photo is placed on a landscape canvas", () => {
    const { frameParams, config } = getTemplateDefaults("magazine");
    const portraitPhoto = { ...photo, width: 5504, height: 8256 };
    const svg = buildWatermarkSvgTemplate(portraitPhoto, "magazine", frameParams, config, "preview.jpg", 900);
    if (!svg) throw new Error("magazine svg did not build");

    const cameraY = textY(svg, "Z 7II");
    const paramsY = textY(svg, "115mm");
    const paramsX = textX(svg, "115mm");
    const box = viewBoxSize(svg);

    expect(paramsY).toBeCloseTo(cameraY, 3);
    expect(paramsX).toBeGreaterThan(box.width * 0.78);
    expect(cameraY).toBeLessThan(box.height - 8);
  });

  test("magazine SVG excludes unsupported lens date and custom text", () => {
    const { frameParams, config } = getTemplateDefaults("magazine");
    const svg = buildWatermarkSvgTemplate(
      photo,
      "magazine",
      frameParams,
      {
        ...config,
        showLens: true,
        showDate: true,
        customLines: ["CUSTOM"],
      },
      "preview.jpg",
      900,
    );

    expect(svg).toContain(">Z 7II<");
    expect(svg).toContain("115mm");
    expect(svg).not.toContain("NIKKOR");
    expect(svg).not.toContain("2026");
    expect(svg).not.toContain("CUSTOM");
  });

  test("templates that expose main image ratio keep the photo bounded while resizing it", () => {
    for (const kind of SVG_TEMPLATE_KINDS) {
      const ratioControl = getTemplateFrameCapabilities(kind).controls.mainImageWidthRatio;
      if (!ratioControl || ratioControl === true) continue;

      const { frameParams, config } = getTemplateDefaults(kind);
      const lowSvg = buildWatermarkSvgTemplate(
        photo,
        kind,
        { ...frameParams, mainImageWidthRatio: ratioControl.min },
        config,
        "preview.jpg",
        900,
      );
      const highSvg = buildWatermarkSvgTemplate(
        photo,
        kind,
        { ...frameParams, mainImageWidthRatio: ratioControl.max },
        config,
        "preview.jpg",
        900,
      );
      if (!lowSvg || !highSvg) throw new Error(`${kind} did not build svg`);

      const low = firstImageRect(lowSvg);
      const high = firstImageRect(highSvg);
      const box = viewBoxSize(highSvg);

      expect(high.width, `${kind} image width should respond to mainImageWidthRatio`).toBeGreaterThan(low.width);
      expect(high.x, `${kind} image x should stay within canvas`).toBeGreaterThanOrEqual(0);
      expect(high.y, `${kind} image y should stay within canvas`).toBeGreaterThanOrEqual(0);
      expect(high.x + high.width, `${kind} image width should stay within canvas`).toBeLessThanOrEqual(box.width + 0.001);
      expect(high.y + high.height, `${kind} image height should stay within canvas`).toBeLessThanOrEqual(box.height + 0.001);
    }
  });

  test("templates only expose controls that affect generated SVG output", () => {
    for (const kind of SVG_TEMPLATE_KINDS) {
      const controls = getTemplateFrameCapabilities(kind).controls;
      const { frameParams, config } = getTemplateDefaults(kind);

      if (controls.fontFamily) {
        const svg = buildWatermarkSvgTemplate(
          photo,
          kind,
          { ...frameParams, fontFamily: "playfair-display" },
          config,
          "preview.jpg",
          900,
        );
        expect(svg, `${kind} should use selected font family`).toContain("Playfair Display");
      }

      if (controls.photoBorder) {
        const svg = buildWatermarkSvgTemplate(
          photo,
          kind,
          { ...frameParams, photoBorder: 8, photoBorderStyle: "dashed", photoBorderColor: "#ff00aa" },
          config,
          "preview.jpg",
          900,
        );
        expect(svg, `${kind} should render configured photo border`).toContain('stroke="#ff00aa"');
        expect(svg, `${kind} should render dashed photo border`).toContain("stroke-dasharray");
      }
    }
  });
});
