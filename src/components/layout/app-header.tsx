import { Camera } from "lucide-react";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_6px_rgba(47,111,237,0.35)]"
        >
          <Camera className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Painting Box
        </span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          v0.1.0
        </span>
      </div>
      <div className="text-xs text-muted-foreground">摄影水印生成器</div>
    </header>
  );
}
