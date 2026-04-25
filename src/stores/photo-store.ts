import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  autoPreviewEnabled: boolean;
  parseQueue: string[];
  addPhotos: (next: ImportedPhoto[]) => void;
  setPreviewLoading: (id: string) => void;
  setPreviewData: (id: string, preview: PhotoPreviewData) => void;
  setPreviewError: (id: string, message: string) => void;
  setExifLoading: (id: string) => void;
  setExifData: (id: string, exif: ExifData) => void;
  setExifError: (id: string, message: string) => void;
  setAutoPreviewEnabled: (enabled: boolean) => void;
  enqueueParse: (ids: string[], front?: boolean) => void;
  dequeueParse: (id: string) => void;
  setImportErrors: (next: PhotoImportError[]) => void;
  setPhotoWatermark: (id: string, show: boolean | undefined) => void;
  removePhoto: (id: string) => void;
  select: (id: string | null) => void;
  clear: () => void;
};

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set) => ({
      photos: [],
      selectedId: null,
      importErrors: [],
      autoPreviewEnabled: false,
      parseQueue: [],
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
      setAutoPreviewEnabled: (enabled) => set({ autoPreviewEnabled: enabled }),
      enqueueParse: (ids, front = false) =>
        set((s) => {
          const deduped = ids.filter((id, index) => ids.indexOf(id) === index);
          const additions = deduped.filter((id) => !s.parseQueue.includes(id));
          return {
            parseQueue: front
              ? [...additions, ...s.parseQueue]
              : [...s.parseQueue, ...additions],
          };
        }),
      dequeueParse: (id) =>
        set((s) => ({
          parseQueue: s.parseQueue.filter((queuedId) => queuedId !== id),
        })),
      setImportErrors: (next) => set({ importErrors: next }),
      setPhotoWatermark: (id, show) =>
        set((s) => ({
          photos: s.photos.map((p) => (p.id === id ? { ...p, showWatermark: show } : p)),
        })),
      removePhoto: (id) =>
        set((s) => ({
          photos: s.photos.filter((p) => p.id !== id),
          parseQueue: s.parseQueue.filter((queuedId) => queuedId !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      select: (id) => set({ selectedId: id }),
      clear: () =>
        set({ photos: [], selectedId: null, importErrors: [], parseQueue: [] }),
    }),
    {
      name: "painting-box-photo-config",
      partialize: (state) => ({
        autoPreviewEnabled: state.autoPreviewEnabled,
      }),
    },
  ),
);
