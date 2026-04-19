export const IMPORT_EXTENSIONS = ["jpg", "jpeg", "png", "heic"] as const;

export function isImportablePath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  return !!ext && IMPORT_EXTENSIONS.includes(ext as (typeof IMPORT_EXTENSIONS)[number]);
}
