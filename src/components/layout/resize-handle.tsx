import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Direction = "left" | "right";

export function ResizeHandle({
  value,
  min,
  max,
  onChange,
  direction = "left",
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  direction?: Direction;
  className?: string;
}) {
  const startX = useRef(0);
  const startValue = useRef(0);
  const dragging = useRef(false);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const signed = direction === "left" ? -delta : delta;
      const next = Math.min(max, Math.max(min, startValue.current + signed));
      onChange(next);
    },
    [direction, max, min, onChange],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMove, onUp]);

  const onDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startValue.current = value;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onDown}
      className={cn(
        "group relative h-full w-1 shrink-0 cursor-col-resize",
        className,
      )}
    >
      <div className="divider-v absolute inset-y-0 left-1/2 -translate-x-1/2" />
      <div className="absolute inset-y-0 left-1/2 h-full w-[2px] -translate-x-1/2 rounded-full bg-primary/0 transition-colors duration-150 group-hover:bg-primary/40" />
      <div
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px] rounded-full bg-card px-0.5 py-1.5",
          "opacity-60 shadow-[var(--shadow-neu-raised)] transition-all duration-200 ease-out",
          "group-hover:opacity-100 group-hover:shadow-[var(--shadow-neu-raised-hover)]",
        )}
      >
        <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground/60 transition-colors group-hover:bg-primary/80" />
        <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground/60 transition-colors group-hover:bg-primary/80" />
        <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground/60 transition-colors group-hover:bg-primary/80" />
      </div>
    </div>
  );
}
