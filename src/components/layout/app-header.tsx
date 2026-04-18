import { Camera } from "lucide-react";

export function AppHeader() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium tracking-wide">Painting Box</span>
        <span className="text-xs text-muted-foreground">v0.1.0</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>摄影水印生成器</span>
      </div>
    </header>
  );
}
