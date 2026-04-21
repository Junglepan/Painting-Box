import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  ExifData,
  ExportSinglePhotoRequest,
  ExportSinglePhotoResult,
  LoadPhotosResponse,
  PhotoPreviewData,
} from "@/stores/types";

export type ExportProgressEvent = {
  jobId: string;
  completed: number;
  total: number;
  outputPath?: string;
  error?: string;
};

export type ExportBatchRequest = {
  jobId: string;
  request: ExportSinglePhotoRequest;
};

export type ExportBatchResult = {
  jobId: string;
  outputPath?: string;
  error?: string;
};

export function loadPhotos(paths: string[]) {
  return invoke<LoadPhotosResponse>("load_photos", { paths });
}

export function exportSinglePhoto(request: ExportSinglePhotoRequest) {
  return invoke<ExportSinglePhotoResult>("export_single_photo", {
    request: toTauriExportRequest(request),
  });
}

export function toTauriExportRequest(request: ExportSinglePhotoRequest) {
  const { exportQuality, frameParams, ...rest } = request;
  return {
    ...rest,
    frameParams: {
      ...frameParams,
      exportQuality,
    },
  };
}

export function loadPhotoExif(path: string) {
  return invoke<ExifData>("load_photo_exif", { path });
}

export function loadPhotoPreview(path: string) {
  return invoke<PhotoPreviewData>("load_photo_preview", { path });
}

export function exportBatchPhotos(requests: ExportBatchRequest[]) {
  return invoke<ExportBatchResult[]>("export_batch_photos", {
    requests: requests.map((r) => ({
      jobId: r.jobId,
      request: toTauriExportRequest(r.request),
    })),
  });
}

export function onExportProgress(cb: (e: ExportProgressEvent) => void) {
  return listen<ExportProgressEvent>("export-progress", (event) => cb(event.payload));
}
