import { describe, expect, test } from "bun:test";

import { buildPreviewLines, getPreviewFontFamily } from "./classic-bottom";
import { EMPTY_EXIF } from "@/stores/types";

describe("classic bottom preview lines", () => {
  test("excludes time and gps from watermark lines", () => {
    const exif = {
      ...EMPTY_EXIF,
      camera: { make: "NIKON CORPORATION", model: "NIKON Z 7_2" },
      lens: "NIKKOR Z 70-200mm f/2.8 VR S",
      focalLength: 200,
      aperture: 2.8,
      shutterSpeed: "1/1250 s",
      iso: 100,
      takenAt: "2026-04-11 17:51:42",
      gps: { lat: 40.1234, lng: 116.5678 },
    };

    expect(
      buildPreviewLines(exif, {
        showLogo: true,
        showCamera: true,
        showLens: true,
        showParams: true,
      }),
    ).toEqual(["Z 7II", "NIKKOR Z 70-200mm f/2.8 VR S", "200mm f/2.8 1/1250 s ISO100"]);
  });

  test("uses PingFang SC as the default preview font family", () => {
    expect(getPreviewFontFamily("pingfang-sc")).toContain("PingFang SC");
    expect(getPreviewFontFamily("arial")).toContain("Arial");
  });
});
