import { Camera, Settings2 } from "lucide-react";

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
      <div className="flex items-center gap-1.5">
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
