import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { ImageOff } from "lucide-react";

export function PreviewPane() {
  const selected = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const { frameParams } = useTemplateStore();

  if (!selected) {
    return (
      <div className="surface-inset flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-500">
          <ImageOff className="h-7 w-7" />
          <p className="text-[11px]">选一张照片开始</p>
        </div>
      </div>
    );
  }

  const bg =
    frameParams.background === "black"
      ? "#111827"
      : frameParams.background === "blur"
        ? "linear-gradient(135deg,#dbe4ff,#f0e4ff)"
        : frameParams.background === "custom"
          ? frameParams.bgColor
          : "#ffffff";

  const boxShadow = frameParams.shadow
    ? `0 ${frameParams.shadowOffsetY}px ${frameParams.shadowBlur}px rgba(17,24,39,${frameParams.shadowOpacity / 100})`
    : "none";

  return (
    <div className="surface-inset flex h-full w-full items-center justify-center p-6">
      <div
        style={{
          width: "min(100%, 520px)",
          aspectRatio: `${selected.width} / ${selected.height + frameParams.paddingTop + frameParams.paddingBottom}`,
          borderRadius: frameParams.outerRadius,
          paddingTop: frameParams.paddingTop,
          paddingRight: frameParams.paddingRight,
          paddingBottom: frameParams.paddingBottom,
          paddingLeft: frameParams.paddingLeft,
          background: bg,
          boxShadow,
        }}
      >
        <div
          className="mx-auto h-full bg-muted"
          style={{
            width: `${frameParams.photoScale}%`,
            borderRadius: Math.max(frameParams.innerRadius, 0),
            outline:
              frameParams.photoBorder > 0
                ? `${frameParams.photoBorder}px solid #ffffff`
                : undefined,
            outlineOffset: frameParams.photoBorder > 0 ? -0.5 : undefined,
          }}
        />
      </div>
    </div>
  );
}
