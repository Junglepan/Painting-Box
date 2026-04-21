import { describe, expect, test } from "bun:test";

import {
  buildBatchExportPath,
  buildBatchExportPlan,
  defaultSingleExportPath,
  renamedExportPath,
} from "./paths";

describe("export paths", () => {
  test("uses _painting_box as the default single export suffix", () => {
    expect(defaultSingleExportPath("/photos/PBK_001.NEF", "jpg")).toBe(
      "/photos/PBK_001_painting_box.jpg",
    );
  });

  test("builds batch export paths under the selected output directory", () => {
    expect(buildBatchExportPath("/exports/", "/photos/PBK_001.NEF", "png")).toBe(
      "/exports/PBK_001_painting_box.png",
    );
  });

  test("adds numeric suffix after the default export suffix when renaming", () => {
    expect(renamedExportPath("/exports/PBK_001_painting_box.jpg", 2)).toBe(
      "/exports/PBK_001_painting_box_2.jpg",
    );
  });

  test("skips already exported photos in batch plan", () => {
    const plan = buildBatchExportPlan({
      photos: [
        { id: "a", path: "/photos/a.jpg" },
        { id: "b", path: "/photos/b.jpg" },
      ],
      exported: [{ photoId: "a" }],
      outputDir: "/exports",
      format: "jpg",
      conflictStrategy: "skip",
    });

    expect(plan.map((item) => item.photo.id)).toEqual(["b"]);
  });

  test("renames already exported photos in batch plan", () => {
    const plan = buildBatchExportPlan({
      photos: [{ id: "a", path: "/photos/a.jpg" }],
      exported: [{ photoId: "a" }],
      outputDir: "/exports",
      format: "jpg",
      conflictStrategy: "rename",
    });

    expect(plan[0].outputPath).toBe("/exports/a_painting_box_1.jpg");
  });
});
