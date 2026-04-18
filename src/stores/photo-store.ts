import { create } from "zustand";
import type { Photo } from "./types";

type PhotoState = {
  photos: Photo[];
  selectedId: string | null;
  addPhotos: (next: Photo[]) => void;
  removePhoto: (id: string) => void;
  select: (id: string | null) => void;
  clear: () => void;
};

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  selectedId: null,
  addPhotos: (next) =>
    set((s) => ({
      photos: [...s.photos, ...next],
      selectedId: s.selectedId ?? next[0]?.id ?? null,
    })),
  removePhoto: (id) =>
    set((s) => ({
      photos: s.photos.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  select: (id) => set({ selectedId: id }),
  clear: () => set({ photos: [], selectedId: null }),
}));
