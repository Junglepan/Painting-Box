import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExportJob } from "./types";

type ExportState = {
  jobs: ExportJob[];
  isRunning: boolean;
  defaultOutputDir: string | null;
  enqueue: (jobs: ExportJob[]) => void;
  updateJob: (id: string, patch: Partial<ExportJob>) => void;
  setRunning: (running: boolean) => void;
  setDefaultOutputDir: (dir: string | null) => void;
  clear: () => void;
};

export const useExportStore = create<ExportState>()(
  persist(
    (set) => ({
      jobs: [],
      isRunning: false,
      defaultOutputDir: null,
      enqueue: (jobs) => set((s) => ({ jobs: [...s.jobs, ...jobs] })),
      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        })),
      setRunning: (running) => set({ isRunning: running }),
      setDefaultOutputDir: (dir) => set({ defaultOutputDir: dir }),
      clear: () => set({ jobs: [] }),
    }),
    {
      name: "painting-box-export-settings",
      // Only persist user preferences, not job history.
      partialize: (state) => ({ defaultOutputDir: state.defaultOutputDir }),
    },
  ),
);
