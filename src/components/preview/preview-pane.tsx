import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { ImageOff } from "lucide-react";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const { frameParams } = useTemplateStore();

  return (
    <div className="surface-inset flex h-full w-full items-center justify-center p-8">
      {selected ? (
        <div
          className="bg-card shadow-[var(--shadow-apple-elevated)]"
          style={{
            width: "min(100%, 520px)",
            aspectRatio: `${selected.width} / ${selected.height}`,
            borderRadius: frameParams.radius,
            paddingTop: frameParams.paddingTop,
            paddingRight: frameParams.paddingRight,
            paddingBottom: frameParams.paddingBottom,
            paddingLeft: frameParams.paddingLeft,
            background:
              frameParams.background === "black"
                ? "#111827"
                : frameParams.background === "blur"
                  ? "linear-gradient(135deg,#dbe4ff,#f0e4ff)"
                  : "#ffffff",
          }}
        >
          <div
            className="h-full w-full rounded-md bg-muted"
            style={{ borderRadius: Math.max(frameParams.radius - 4, 0) }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-500">
          <ImageOff className="h-7 w-7" />
          <p className="text-[11px]">选一张照片开始</p>
        </div>
      )}
    </div>
  );
}
