import { invoke } from "@tauri-apps/api/core";
import type {
  ExifData,
  ExportSinglePhotoRequest,
  ExportSinglePhotoResult,
  LoadPhotosResponse,
  PhotoPreviewData,
} from "@/stores/types";

export function loadPhotos(paths: string[]) {
  return invoke<LoadPhotosResponse>("load_photos", { paths });
}

export function exportSinglePhoto(request: ExportSinglePhotoRequest) {
  return invoke<ExportSinglePhotoResult>("export_single_photo", { request });
}

export function loadPhotoExif(path: string) {
  return invoke<ExifData>("load_photo_exif", { path });
}

export function loadPhotoPreview(path: string) {
  return invoke<PhotoPreviewData>("load_photo_preview", { path });
}
