import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "亮色", Icon: Sun },
  { value: "dark", label: "暗色", Icon: Moon },
  { value: "system", label: "跟随系统", Icon: Monitor },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const Current = OPTIONS.find((o) => o.value === mode)?.Icon ?? Monitor;

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        title="外观"
        aria-label="外观"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Current className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-md border border-border/60 bg-popover py-1 shadow-[var(--shadow-apple-popover)]">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setMode(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px]",
                mode === o.value
                  ? "bg-accent/60 text-accent-foreground"
                  : "text-foreground hover:bg-accent/40",
              )}
            >
              <o.Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
