import { useTemplateStore } from "@/stores/template-store";
import type { TemplateKind } from "@/stores/types";
import { cn } from "@/lib/utils";
import { Download, Check } from "lucide-react";

const TEMPLATES: { kind: TemplateKind; name: string; desc: string }[] = [
  { kind: "classic-bottom", name: "经典黑底栏", desc: "相机 Logo + 参数" },
  { kind: "polaroid", name: "宝丽来白边", desc: "四周留白 + 底部信息" },
  { kind: "minimal-corner", name: "极简角标", desc: "右下角小字" },
  { kind: "magazine", name: "杂志横幅", desc: "顶底双栏 + 大字 Logo" },
];

export function TemplatePanel() {
  const { currentKind, setKind } = useTemplateStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-border/60 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        模板
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {TEMPLATES.map((t) => {
            const active = currentKind === t.kind;
            return (
              <li key={t.kind}>
                <button
                  type="button"
                  onClick={() => setKind(t.kind)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-left transition-all duration-150 ease-out",
                    active
                      ? "border-primary/70 bg-accent"
                      : "border-border/80 hover:border-primary/30 hover:bg-card",
                  )}
                  style={{
                    boxShadow: active
                      ? "var(--shadow-neu-pressed)"
                      : "var(--shadow-neu-raised)",
                  }}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : t.name[0]}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] font-medium text-foreground">
                      {t.name}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {t.desc}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="shrink-0 border-t border-border/60 p-3">
        <button
          type="button"
          disabled
          className="btn-neu h-10 w-full bg-primary text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          导出（待接入）
        </button>
      </div>
    </div>
  );
}
