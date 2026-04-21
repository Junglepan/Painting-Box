import { describe, expect, test } from "bun:test";

import { toTauriExportRequest } from "./photos";
import { useTemplateStore } from "@/stores/template-store";
import { EMPTY_EXIF } from "@/stores/types";

describe("tauri photo commands", () => {
  test("nests export quality inside frame params for Rust deserialization", () => {
    const frameParams = useTemplateStore.getState().frameParams;

    const request = toTauriExportRequest({
      photoPath: "/tmp/input.jpg",
      outputPath: "/tmp/output.jpg",
      templateKind: "classic-bottom",
      frameParams,
      exif: EMPTY_EXIF,
      config: {
        showLogo: true,
        showCamera: true,
        showLens: false,
        showParams: true,
      },
      exportQuality: 87,
    });

    expect(request.exportQuality).toBeUndefined();
    expect(request.frameParams.exportQuality).toBe(87);
  });
});
