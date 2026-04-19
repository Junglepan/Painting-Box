import { useTemplateStore } from "@/stores/template-store";
import type { TemplateKind } from "@/stores/types";
import { TEMPLATE_LIBRARY } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export function TemplateGallery() {
  const { currentKind, setKind } = useTemplateStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-1.5 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        <span>模板库</span>
        <span className="ml-0.5 text-[10px] font-medium tabular-nums normal-case tracking-normal text-muted-foreground/70">
          {TEMPLATE_LIBRARY.length}
        </span>
      </div>
      <div className="surface-inset mx-3 mb-3 flex-1 overflow-hidden">
        <div className="scrollbar-gutter-stable flex h-full items-center gap-2 overflow-x-auto overflow-y-hidden px-3 py-2.5">
          {TEMPLATE_LIBRARY.map((t) => (
            <TemplateCard
              key={t.kind}
              kind={t.kind}
              name={t.name}
              active={currentKind === t.kind}
              onClick={() => setKind(t.kind)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  kind,
  name,
  active,
  onClick,
}: {
  kind: TemplateKind;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full shrink-0 flex-col gap-1 rounded-md border bg-card p-1.5 transition-all duration-200 ease-out",
        active
          ? "border-primary/60 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
          : "border-border/40 hover:-translate-y-px hover:border-border hover:shadow-[var(--shadow-apple-card)]",
      )}
      style={{ width: 96 }}
    >
      <div className="flex-1 overflow-hidden rounded-sm">
        <TemplateThumbnail kind={kind} />
      </div>
      <span
        className={cn(
          "truncate text-[10px] font-medium",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
    </button>
  );
}

// 最小矢量缩略图：用纯色块演示每种模板的布局特征
function TemplateThumbnail({ kind }: { kind: TemplateKind }) {
  switch (kind) {
    case "classic-bottom":
      return (
        <div className="flex h-full w-full flex-col bg-muted">
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="h-3 bg-card" />
        </div>
      );
    case "polaroid":
      return (
        <div className="h-full w-full bg-card p-1 pb-2.5">
          <div className="h-full w-full bg-muted-foreground/20" />
        </div>
      );
    case "minimal-corner":
      return (
        <div className="relative h-full w-full bg-muted-foreground/20">
          <div className="absolute bottom-1 right-1 h-1 w-3 rounded-sm bg-white/80" />
        </div>
      );
    case "magazine":
      return (
        <div className="flex h-full w-full flex-col bg-card">
          <div className="h-2 bg-foreground" />
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="h-2 bg-foreground" />
        </div>
      );
    case "film-strip":
      return (
        <div className="flex h-full w-full flex-col bg-foreground">
          <div className="flex h-1.5 items-center justify-around">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-0.5 w-1 rounded-sm bg-card" />
            ))}
          </div>
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="flex h-1.5 items-center justify-around">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-0.5 w-1 rounded-sm bg-card" />
            ))}
          </div>
        </div>
      );
    case "full-frame":
      return (
        <div className="h-full w-full bg-card p-1">
          <div className="h-full w-full border border-foreground/60 bg-muted-foreground/20" />
        </div>
      );
    case "leica":
      return (
        <div className="h-full w-full bg-foreground p-1 relative">
          <div className="h-full w-full bg-muted-foreground/20" />
          <div className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </div>
      );
    case "poster":
      return (
        <div className="flex h-full w-full flex-col bg-card">
          <div className="h-3 bg-muted-foreground/20" />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-1.5 w-6 rounded-sm bg-foreground" />
          </div>
        </div>
      );
    case "square-social":
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <div className="aspect-square w-[70%] bg-muted-foreground/30" />
        </div>
      );
    case "xpan":
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <div className="h-1/3 w-full bg-muted-foreground/30" />
        </div>
      );
    case "minimal-blank":
      return (
        <div className="h-full w-full bg-card p-1">
          <div className="h-full w-full bg-muted-foreground/20" />
        </div>
      );
    default:
      return <div className="h-full w-full bg-muted" />;
  }
}
