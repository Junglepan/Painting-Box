export type ExportFormat = "jpg" | "png" | "webp";
export type ExportConflictStrategy = "skip" | "overwrite" | "rename";

export type ExportPhotoRecord = {
  id: string;
  path: string;
};

export type ExportedRecord = {
  photoId: string;
  outputPath?: string;
};

function exportExtension(format: ExportFormat) {
  return format === "jpg" ? "jpg" : format;
}

export function defaultSingleExportPath(path: string, format: ExportFormat) {
  return `${stripExtension(path)}_painting_box.${exportExtension(format)}`;
}

export function buildBatchExportPath(
  outputDir: string,
  photoPath: string,
  format: ExportFormat,
  suffix = "_painting_box",
) {
  const normalizedDir = outputDir.replace(/\/+$/, "");
  const name = basename(stripExtension(photoPath));
  return `${normalizedDir}/${name}${suffix}.${exportExtension(format)}`;
}

export function renamedExportPath(outputPath: string, number: number) {
  const base = stripExtension(outputPath);
  const ext = extension(outputPath);
  return `${base}_${number}${ext ? `.${ext}` : ""}`;
}

export function buildBatchExportPlan<TPhoto extends ExportPhotoRecord>({
  photos,
  exported,
  outputDir,
  format,
  conflictStrategy,
}: {
  photos: TPhoto[];
  exported: ExportedRecord[];
  outputDir: string;
  format: ExportFormat;
  conflictStrategy: ExportConflictStrategy;
}) {
  const exportedIds = new Set(exported.map((record) => record.photoId));
  const renameCounters = new Map<string, number>();

  return photos.flatMap((photo) => {
    const alreadyExported = exportedIds.has(photo.id);
    if (alreadyExported && conflictStrategy === "skip") {
      return [];
    }

    const baseOutputPath = buildBatchExportPath(outputDir, photo.path, format);
    const outputPath =
      alreadyExported && conflictStrategy === "rename"
        ? renamedExportPath(baseOutputPath, nextRenameNumber(renameCounters, baseOutputPath))
        : baseOutputPath;

    return [{ photo, outputPath }];
  });
}

function nextRenameNumber(counters: Map<string, number>, outputPath: string) {
  const next = (counters.get(outputPath) ?? 0) + 1;
  counters.set(outputPath, next);
  return next;
}

function stripExtension(path: string) {
  return path.replace(/\.[^/.]+$/, "");
}

function extension(path: string) {
  const match = path.match(/\.([^/.]+)$/);
  return match?.[1] ?? "";
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
