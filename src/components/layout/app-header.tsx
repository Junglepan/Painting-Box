import { Camera } from "lucide-react";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-2.5">
        <Camera className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Painting Box
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          v0.1.0
        </span>
      </div>
      <div className="text-xs text-muted-foreground">摄影水印生成器</div>
    </header>
  );
}
