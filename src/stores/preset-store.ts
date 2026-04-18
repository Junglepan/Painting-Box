import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preset } from "./types";

type PresetState = {
  presets: Preset[];
  selectedId: string | null;
  add: (p: Omit<Preset, "id" | "createdAt">) => string;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  select: (id: string | null) => void;
};

export const usePresetStore = create<PresetState>()(
  persist(
    (set) => ({
      presets: [],
      selectedId: null,
      add: (p) => {
        const id = crypto.randomUUID();
        set((s) => ({
          presets: [
            ...s.presets,
            { ...p, id, createdAt: new Date().toISOString() },
          ],
          selectedId: id,
        }));
        return id;
      },
      remove: (id) =>
        set((s) => ({
          presets: s.presets.filter((x) => x.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      rename: (id, name) =>
        set((s) => ({
          presets: s.presets.map((x) => (x.id === id ? { ...x, name } : x)),
        })),
      select: (id) => set({ selectedId: id }),
    }),
    { name: "painting-box-presets" },
  ),
);
