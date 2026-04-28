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
    case "magazine":
      return (
        <div className="flex h-full w-full flex-col bg-muted">
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="flex h-3 items-center gap-0.5 bg-card px-0.5">
            <div className="h-1 flex-1 rounded-sm bg-muted-foreground/40" />
            <div className="h-2 w-px bg-muted-foreground/40" />
            <div className="h-1 flex-1 rounded-sm bg-muted-foreground/40" />
          </div>
        </div>
      );
    case "minimal-fullbleed":
      return (
        <div className="flex h-full w-full flex-col bg-card p-1.5 pb-2">
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="mt-1 h-0.5 w-3/5 self-center rounded-sm bg-muted-foreground/40" />
        </div>
      );
    case "cinematic":
      return (
        <div className="flex h-full w-full flex-col bg-black">
          <div className="h-2 bg-black" />
          <div className="flex-1 bg-muted-foreground/30" />
          <div className="flex h-3 items-center justify-between bg-black px-1">
            <div className="h-1 w-3 rounded-sm bg-white/70" />
            <div className="h-1 w-4 rounded-sm bg-white/40" />
          </div>
        </div>
      );
    case "film-strip":
      return (
        <div className="flex h-full w-full bg-[#0a0a0a]">
          <div className="flex w-1.5 flex-col items-center justify-around py-1">
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
          </div>
          <div className="flex flex-1 flex-col py-1">
            <div className="flex-1 bg-muted-foreground/30" />
            <div className="mt-1 h-1 rounded-sm bg-white/30" />
          </div>
          <div className="flex w-1.5 flex-col items-center justify-around py-1">
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
            <div className="h-0.5 w-1 rounded-sm bg-white/80" />
          </div>
        </div>
      );
    case "xiaomi-leica":
      return (
        <div className="flex h-full w-full flex-col">
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="flex h-4 items-center gap-0 bg-white">
            <div className="h-2.5 flex-1 px-1">
              <div className="h-1 w-4/5 rounded-sm bg-muted-foreground/50" />
            </div>
            <div className="h-3 w-px bg-red-500" />
            <div className="h-2.5 flex-1 px-1 flex justify-end">
              <div className="h-1 w-3/5 rounded-sm bg-muted-foreground/40" />
            </div>
          </div>
        </div>
      );
    case "photo-album":
      return (
        <div className="flex h-full w-full flex-col bg-[#ede2cc] p-1.5 pb-2">
          <div className="relative flex-1 bg-[#fdfaf2] shadow-sm">
            <div className="absolute inset-0 bg-muted-foreground/20" />
            <div className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-[#241c14]" />
            <div className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-[#241c14]" />
            <div className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-[#241c14]" />
            <div className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-[#241c14]" />
          </div>
          <div className="mt-1 h-1 w-2/5 rounded-sm bg-[#3b3024]/50" />
        </div>
      );
    case "date-stamp":
      return (
        <div className="relative flex h-full w-full items-end justify-end bg-muted-foreground/20 p-1">
          <span className="font-mono text-[6px] font-bold text-orange-500 opacity-90">'26  4  28</span>
        </div>
      );
    case "swiss-grid":
      return (
        <div className="flex h-full w-full flex-col bg-white p-1.5">
          <div className="flex-1 bg-muted-foreground/20" />
          <div className="my-1 h-px bg-muted-foreground/60" />
          <div className="flex items-end justify-between">
            <div className="h-1.5 w-2/5 rounded-sm bg-muted-foreground/60" />
            <div className="h-1 w-1/4 rounded-sm bg-muted-foreground/30" />
          </div>
        </div>
      );
    case "crop-marks":
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-white">
          <div className="absolute left-1 top-1 h-1.5 w-px bg-muted-foreground/60" />
          <div className="absolute left-1 top-1 h-px w-1.5 bg-muted-foreground/60" />
          <div className="absolute right-1 top-1 h-1.5 w-px bg-muted-foreground/60" />
          <div className="absolute right-1 top-1 h-px w-1.5 bg-muted-foreground/60" />
          <div className="absolute bottom-1 left-1 h-1.5 w-px bg-muted-foreground/60" />
          <div className="absolute bottom-1 left-1 h-px w-1.5 bg-muted-foreground/60" />
          <div className="absolute bottom-1 right-1 h-1.5 w-px bg-muted-foreground/60" />
          <div className="absolute bottom-1 right-1 h-px w-1.5 bg-muted-foreground/60" />
          <div className="h-3/5 w-3/5 bg-muted-foreground/20" />
        </div>
      );
    default:
      return <div className="h-full w-full bg-muted" />;
  }
}
