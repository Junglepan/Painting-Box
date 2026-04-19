import { create } from "zustand";
import type {
  ExifData,
  ImportedPhoto,
  Photo,
  PhotoImportError,
  PhotoPreviewData,
} from "./types";

type PhotoState = {
  photos: Photo[];
  selectedId: string | null;
  importErrors: PhotoImportError[];
  addPhotos: (next: ImportedPhoto[]) => void;
  setPreviewLoading: (id: string) => void;
  setPreviewData: (id: string, preview: PhotoPreviewData) => void;
  setPreviewError: (id: string, message: string) => void;
  setExifLoading: (id: string) => void;
  setExifData: (id: string, exif: ExifData) => void;
  setExifError: (id: string, message: string) => void;
  setImportErrors: (next: PhotoImportError[]) => void;
  removePhoto: (id: string) => void;
  select: (id: string | null) => void;
  clear: () => void;
};

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  selectedId: null,
  importErrors: [],
  addPhotos: (next) =>
    set((s) => ({
      photos: [
        ...s.photos,
        ...next
          .filter((p) => !s.photos.some((x) => x.path === p.path))
          .map((p) => ({
            ...p,
            previewStatus: "idle" as const,
            exifStatus: "idle" as const,
          })),
      ],
      selectedId: s.selectedId,
    })),
  setPreviewLoading: (id) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id ? { ...p, previewStatus: "loading", previewError: undefined } : p,
      ),
    })),
  setPreviewData: (id, preview) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id
          ? {
              ...p,
              thumbnailDataUrl: preview.thumbnailDataUrl,
              width: preview.width,
              height: preview.height,
              previewStatus: "ready",
              previewError: undefined,
            }
          : p,
      ),
    })),
  setPreviewError: (id, message) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id ? { ...p, previewStatus: "error", previewError: message } : p,
      ),
    })),
  setExifLoading: (id) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id ? { ...p, exifStatus: "loading", exifError: undefined } : p,
      ),
    })),
  setExifData: (id, exif) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id ? { ...p, exif, exifStatus: "ready", exifError: undefined } : p,
      ),
    })),
  setExifError: (id, message) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === id ? { ...p, exifStatus: "error", exifError: message } : p,
      ),
    })),
  setImportErrors: (next) => set({ importErrors: next }),
  removePhoto: (id) =>
    set((s) => ({
      photos: s.photos.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  select: (id) => set({ selectedId: id }),
  clear: () => set({ photos: [], selectedId: null, importErrors: [] }),
}));
