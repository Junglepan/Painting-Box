import { useEffect, useState } from "react";
import { Camera, CheckCheck, Loader2, Settings2 } from "lucide-react";
import { useExportStore } from "@/stores/export-store";
import { cn } from "@/lib/utils";

function ExportBadge() {
  const jobs = useExportStore((s) => s.jobs);
  const isRunning = useExportStore((s) => s.isRunning);
  const [justDone, setJustDone] = useState(false);

  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const errors = jobs.filter((j) => j.status === "error").length;
  const allSettled = total > 0 && done === total;

  // Briefly show "完成" after the last job settles.
  useEffect(() => {
    if (allSettled && !isRunning) {
      setJustDone(true);
      const t = window.setTimeout(() => setJustDone(false), 2500);
      return () => window.clearTimeout(t);
    }
  }, [allSettled, isRunning]);

  if (!isRunning && !justDone) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
        justDone && !isRunning
          ? errors > 0
            ? "bg-destructive/10 text-destructive"
            : "bg-emerald-50 text-emerald-600"
          : "bg-primary/8 text-primary",
      )}
    >
      {justDone && !isRunning ? (
        <>
          <CheckCheck className="h-3 w-3" />
          <span>{errors > 0 ? `${errors} 张失败` : "导出完成"}</span>
        </>
      ) : (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>导出中 {done}/{total}</span>
        </>
      )}
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_6px_rgba(47,111,237,0.35)]">
          <Camera className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Painting Box
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ExportBadge />
        <button
          type="button"
          aria-label="设置"
          className="btn-neu h-8 w-8 px-0"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
