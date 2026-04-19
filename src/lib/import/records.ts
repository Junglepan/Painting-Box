import type { ImportedPhoto } from "@/stores/types";

export function createImportedPhotos(paths: string[]): ImportedPhoto[] {
  return paths.map((path) => ({
    id: crypto.randomUUID(),
    path,
  }));
}
