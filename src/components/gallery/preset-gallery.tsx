import { useEffect, useRef, useState } from "react";
import { usePresetStore } from "@/stores/preset-store";
import { useTemplateStore } from "@/stores/template-store";
import { usePhotoStore } from "@/stores/photo-store";
import { PRESET_NAME_MAX, type Preset } from "@/stores/types";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkPlus, Trash2, Check, X } from "lucide-react";

export function PresetGallery() {
  const { presets, selectedId, add, remove, rename, select } =
    usePresetStore();
  const { currentKind, frameParams, config, setKind, setFrameParams, setConfig } =
    useTemplateStore();
  const selectedPhoto = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const locked =
    !!selectedPhoto &&
    (selectedPhoto.previewStatus !== "ready" ||
      selectedPhoto.exifStatus !== "ready");

  const [draftName, setDraftName] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (draftName !== null || renamingId !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [draftName, renamingId]);

  const startSave = () => {
    if (locked) return;
    const suggested = `预设 ${presets.length + 1}`;
    setDraftName(suggested.slice(0, PRESET_NAME_MAX));
    setRenamingId(null);
    requestAnimationFrame(() => {
      stripRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  };

  const confirmSave = () => {
    const name = (draftName ?? "").trim();
    if (!name) {
      setDraftName(null);
      return;
    }
    add({ name, kind: currentKind, frameParams, config });
    setDraftName(null);
  };

  const cancelSave = () => setDraftName(null);

  const apply = (p: Preset) => {
    if (locked) return;
    if (renamingId === p.id) return;
    select(p.id);
    setKind(p.kind);
    setFrameParams(p.frameParams);
    setConfig(p.config);
  };

  const confirmRename = (id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) rename(id, trimmed);
    setRenamingId(null);
  };

  return (
    <fieldset
      disabled={locked}
      className="flex h-full w-full flex-col disabled:pointer-events-none"
    >
      <div className="flex h-8 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Bookmark className="h-3.5 w-3.5" />
          <span>预设</span>
          <span className="ml-0.5 text-[10px] font-medium tabular-nums normal-case tracking-normal text-muted-foreground/70">
            {presets.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startSave}
            disabled={draftName !== null || locked}
            aria-label="保存当前参数为预设"
            title="保存当前参数"
            className="btn-neu h-6 w-6 px-0"
          >
            <BookmarkPlus className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => selectedId && remove(selectedId)}
            disabled={!selectedId || locked}
            aria-label="删除选中预设"
            title="删除选中预设"
            className="btn-neu h-6 w-6 px-0"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="surface-inset mx-3 mb-3 flex-1 overflow-hidden">
        <div
          ref={stripRef}
          className="flex h-full items-center gap-2 overflow-x-auto overflow-y-hidden px-3 py-2.5"
        >
          {draftName !== null ? (
            <DraftCard
              inputRef={inputRef}
              value={draftName}
              onChange={setDraftName}
              onConfirm={confirmSave}
              onCancel={cancelSave}
            />
          ) : null}
          {presets.length === 0 && draftName === null ? (
            <EmptyState onSave={startSave} />
          ) : (
            presets.map((p) =>
              renamingId === p.id ? (
                <RenameCard
                  key={p.id}
                  inputRef={inputRef}
                  initial={p.name}
                  onConfirm={(n) => confirmRename(p.id, n)}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <PresetCard
                  key={p.id}
                  preset={p}
                  active={selectedId === p.id}
                  disabled={locked}
                  onClick={() => apply(p)}
                  onDoubleClick={() => {
                    if (locked) return;
                    setRenamingId(p.id);
                    setDraftName(null);
                  }}
                />
              ),
            )
          )}
        </div>
      </div>
    </fieldset>
  );
}

function PresetCard({
  preset,
  active,
  disabled,
  onClick,
  onDoubleClick,
}: {
  preset: Preset;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const bg =
    preset.frameParams.background === "black"
      ? "#111827"
      : preset.frameParams.background === "blur"
        ? "linear-gradient(135deg,#dbe4ff,#f0e4ff)"
        : preset.frameParams.background === "custom"
          ? preset.frameParams.bgColor
          : "#ffffff";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={`${preset.name}（双击重命名）`}
      className={cn(
        "group flex h-full shrink-0 flex-col gap-1 rounded-md border bg-card p-1.5 transition-all duration-200 ease-out",
        disabled && "cursor-not-allowed opacity-45 hover:translate-y-0 hover:border-border/40 hover:shadow-none",
        active
          ? "border-primary/60 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
          : "border-border/40 hover:-translate-y-px hover:border-border hover:shadow-[var(--shadow-apple-card)]",
      )}
      style={{ width: 96 }}
    >
      <div
        className="flex flex-1 items-center justify-center overflow-hidden rounded-sm"
        style={{ background: bg }}
      >
        <div className="h-[60%] w-[70%] rounded-[2px] bg-muted-foreground/20" />
      </div>
      <span
        className={cn(
          "truncate text-[10px] font-medium",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {preset.name}
      </span>
    </button>
  );
}

function DraftCard({
  inputRef,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex h-full shrink-0 flex-col gap-1 rounded-md border border-primary/60 bg-card p-1.5 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
      style={{ width: 96 }}
    >
      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-sm bg-accent/40">
        <BookmarkPlus className="h-4 w-4 text-primary" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={PRESET_NAME_MAX}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onConfirm}
        className="num-input w-full px-1 text-[10px]"
      />
      <div className="flex gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfirm}
          aria-label="确认保存"
          className="btn-primary h-5 flex-1 px-0 text-[10px]"
        >
          <Check className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
          aria-label="取消"
          className="btn-neu h-5 flex-1 px-0 text-[10px]"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}

function RenameCard({
  inputRef,
  initial,
  onConfirm,
  onCancel,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  initial: string;
  onConfirm: (n: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div
      className="flex h-full shrink-0 flex-col gap-1 rounded-md border border-primary/60 bg-card p-1.5 shadow-[var(--shadow-apple-card),var(--ring-selected)]"
      style={{ width: 96 }}
    >
      <div className="flex-1 rounded-sm bg-muted" />
      <input
        ref={inputRef}
        type="text"
        value={v}
        maxLength={PRESET_NAME_MAX}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm(v);
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => onConfirm(v)}
        className="num-input w-full px-1 text-[10px]"
      />
    </div>
  );
}

function EmptyState({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <button
        type="button"
        onClick={onSave}
        className="btn-neu h-7 gap-1.5 px-2.5 text-[11px]"
      >
        <BookmarkPlus className="h-3 w-3" />
        保存当前参数
      </button>
    </div>
  );
}
