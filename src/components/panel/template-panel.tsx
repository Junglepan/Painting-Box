import { useTemplateStore } from "@/stores/template-store";
import type { TemplateKind } from "@/stores/types";
import { cn } from "@/lib/utils";

const TEMPLATES: { kind: TemplateKind; name: string; desc: string }[] = [
  { kind: "classic-bottom", name: "经典黑底栏", desc: "相机 Logo + 参数" },
  { kind: "polaroid", name: "宝丽来白边", desc: "四周留白 + 底部信息" },
  { kind: "minimal-corner", name: "极简角标", desc: "右下角小字" },
  { kind: "magazine", name: "杂志横幅", desc: "顶底双栏 + 大字 Logo" },
];

export function TemplatePanel() {
  const { currentKind, setKind } = useTemplateStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3 text-xs font-medium text-muted-foreground">
        模板
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {TEMPLATES.map((t) => (
            <li key={t.kind}>
              <button
                type="button"
                onClick={() => setKind(t.kind)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
                  currentKind === t.kind
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card/30 text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-[11px] opacity-70">{t.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          disabled
          className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground opacity-60"
        >
          导出（待接入）
        </button>
      </div>
    </div>
  );
}
