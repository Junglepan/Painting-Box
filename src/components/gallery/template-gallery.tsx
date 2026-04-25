import { useTemplateStore } from "@/stores/template-store";
import { usePhotoStore } from "@/stores/photo-store";
import type { TemplateKind } from "@/stores/types";
import { TEMPLATE_LIBRARY } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export function TemplateGallery() {
  const { currentKind, setKind } = useTemplateStore();
  const selectedPhoto = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const locked =
    !!selectedPhoto &&
    (selectedPhoto.previewStatus !== "ready" ||
      selectedPhoto.exifStatus !== "ready");

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
              disabled={locked}
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
  disabled,
  onClick,
}: {
  kind: TemplateKind;
  name: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex h-full shrink-0 flex-col gap-1 rounded-md border bg-card p-1.5 transition-all duration-200 ease-out",
        disabled && "cursor-not-allowed opacity-45 hover:translate-y-0 hover:border-border/40 hover:shadow-none",
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
    default:
      return <div className="h-full w-full bg-muted" />;
  }
}
