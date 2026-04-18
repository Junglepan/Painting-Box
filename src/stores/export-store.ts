import { create } from "zustand";
import type { ExportJob } from "./types";

type ExportState = {
  jobs: ExportJob[];
  isRunning: boolean;
  enqueue: (jobs: ExportJob[]) => void;
  updateJob: (id: string, patch: Partial<ExportJob>) => void;
  setRunning: (running: boolean) => void;
  clear: () => void;
};

export const useExportStore = create<ExportState>((set) => ({
  jobs: [],
  isRunning: false,
  enqueue: (jobs) => set((s) => ({ jobs: [...s.jobs, ...jobs] })),
  updateJob: (id, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
  setRunning: (running) => set({ isRunning: running }),
  clear: () => set({ jobs: [] }),
}));
