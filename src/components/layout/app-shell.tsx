import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhotoList } from "@/components/photo-list/photo-list";
import { PreviewPane } from "@/components/preview/preview-pane";
import { FrameParamsPanel } from "@/components/panel/frame-params-panel";
import { TemplateGallery } from "@/components/gallery/template-gallery";
import { PresetGallery } from "@/components/gallery/preset-gallery";
import { AppHeader } from "@/components/layout/app-header";
import { ResizeHandle } from "@/components/layout/resize-handle";
import { isImportablePath } from "@/lib/import/accept";
import { createImportedPhotos } from "@/lib/import/records";
import { loadPhotoExif, loadPhotoPreview } from "@/lib/tauri/photos";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import { exifHasContent } from "@/stores/types";

const STORAGE_KEY = "painting-box-layout";
const DEFAULT_LIST_WIDTH = 240;
const MIN_LIST_WIDTH = 200;
const MAX_LIST_WIDTH = 400;
const PARSE_CONCURRENCY = 1;

function loadListWidth(): number {
  if (typeof window === "undefined") return DEFAULT_LIST_WIDTH;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LIST_WIDTH;
    const parsed = JSON.parse(raw) as { listWidth?: number };
    const w = parsed.listWidth;
    if (typeof w !== "number" || Number.isNaN(w)) return DEFAULT_LIST_WIDTH;
    return Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, w));
  } catch {
    return DEFAULT_LIST_WIDTH;
  }
}

export function AppShell() {
  const [listWidth, setListWidth] = useState<number>(() => loadListWidth());
  const photos = usePhotoStore((s) => s.photos);
  const selectedId = usePhotoStore((s) => s.selectedId);
  const autoPreviewEnabled = usePhotoStore((s) => s.autoPreviewEnabled);
  const parseQueue = usePhotoStore((s) => s.parseQueue);
  const addPhotos = usePhotoStore((s) => s.addPhotos);
  const enqueueParse = usePhotoStore((s) => s.enqueueParse);
  const dequeueParse = usePhotoStore((s) => s.dequeueParse);
  const setImportErrors = usePhotoStore((s) => s.setImportErrors);
  const setExifLoading = usePhotoStore((s) => s.setExifLoading);
  const setExifData = usePhotoStore((s) => s.setExifData);
  const setExifError = usePhotoStore((s) => s.setExifError);
  const setPhotoConfig = usePhotoStore((s) => s.setPhotoConfig);
  const setPreviewLoading = usePhotoStore((s) => s.setPreviewLoading);
  const setPreviewData = usePhotoStore((s) => s.setPreviewData);
  const setPreviewError = usePhotoStore((s) => s.setPreviewError);
  const selectedPhoto = useMemo(
    () => photos.find((p) => p.id === selectedId) ?? null,
    [photos, selectedId],
  );
  const activeParseRef = useRef(new Set<string>());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ listWidth }));
    } catch {
      // storage unavailable, ignore
    }
  }, [listWidth]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWindow()
      .onDragDropEvent(async (event) => {
        if (cancelled || event.payload.type !== "drop") return;
        const paths = event.payload.paths.filter(isImportablePath);
        if (paths.length === 0) return;
        if (cancelled) return;
        const imported = createImportedPhotos(paths);
        addPhotos(imported);
        if (autoPreviewEnabled) {
          enqueueParse(imported.map((photo) => photo.id));
        }
        setImportErrors([]);
      })
      .then((cleanup) => {
        unlisten = cleanup;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [addPhotos, autoPreviewEnabled, enqueueParse, setImportErrors]);

  useEffect(() => {
    if (
      selectedPhoto &&
      (selectedPhoto.previewStatus === "idle" || selectedPhoto.exifStatus === "idle")
    ) {
      enqueueParse([selectedPhoto.id], true);
    }
  }, [enqueueParse, selectedPhoto]);

  useEffect(() => {
    if (activeParseRef.current.size >= PARSE_CONCURRENCY) return;

    const nextId = parseQueue.find((id) => {
      const photo = photos.find((item) => item.id === id);
      if (!photo || activeParseRef.current.has(id)) return false;
      return photo.previewStatus === "idle" || photo.exifStatus === "idle";
    });

    if (!nextId) return;

    const photo = photos.find((item) => item.id === nextId);
    if (!photo) {
      dequeueParse(nextId);
      return;
    }

    activeParseRef.current.add(nextId);

    if (photo.previewStatus === "idle") {
      setPreviewLoading(nextId);
    }
    if (photo.exifStatus === "idle") {
      setExifLoading(nextId);
    }

    const previewTask =
      photo.previewStatus === "idle"
        ? loadPhotoPreview(photo.path)
            .then((preview) => {
              setPreviewData(nextId, preview);
            })
            .catch((error) => {
              const message =
                error instanceof Error ? error.message : "预览生成失败";
              setPreviewError(nextId, message);
            })
        : Promise.resolve();

    const exifTask =
      photo.exifStatus === "idle"
        ? loadPhotoExif(photo.path)
            .then((exif) => {
              setExifData(nextId, exif);
              // Auto-disable watermark for photos with no EXIF content,
              // unless the user has already set a per-photo config.
              if (!exifHasContent(exif)) {
                const p = usePhotoStore.getState().photos.find((x) => x.id === nextId);
                if (p && !p.config) {
                  const globalConfig = useTemplateStore.getState().config;
                  setPhotoConfig(nextId, { ...globalConfig, showWatermark: false });
                }
              }
            })
            .catch((error) => {
              const message =
                error instanceof Error ? error.message : "EXIF 解析失败";
              setExifError(nextId, message);
            })
        : Promise.resolve();

    void Promise.allSettled([previewTask, exifTask]).finally(() => {
      activeParseRef.current.delete(nextId);
      dequeueParse(nextId);
    });
  }, [
    dequeueParse,
    parseQueue,
    photos,
    setExifData,
    setExifError,
    setExifLoading,
    setPhotoConfig,
    setPreviewData,
    setPreviewError,
    setPreviewLoading,
  ]);

  return (
    <div className="flex h-full flex-col text-foreground">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden border-b border-border/60">
        <section className="flex w-72 shrink-0 flex-col overflow-hidden">
          <FrameParamsPanel />
        </section>
        <div className="divider-v" />
        <main className="flex flex-1 items-center justify-center overflow-hidden p-2">
          <PreviewPane />
        </main>
        <ResizeHandle
          value={listWidth}
          min={MIN_LIST_WIDTH}
          max={MAX_LIST_WIDTH}
          onChange={setListWidth}
          direction="left"
        />
        <aside
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ width: listWidth }}
        >
          <PhotoList />
        </aside>
      </div>
      <div className="flex h-36 shrink-0">
        <div className="min-w-0 flex-[3]">
          <TemplateGallery />
        </div>
        <div className="divider-v" />
        <div className="min-w-0 flex-[2]">
          <PresetGallery />
        </div>
      </div>
    </div>
  );
}
