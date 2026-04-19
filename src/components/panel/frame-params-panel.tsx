import { useState } from "react";
import { useTemplateStore } from "@/stores/template-store";
import { usePhotoStore } from "@/stores/photo-store";
import type {
  CanvasRatio,
  ExifData,
  FrameBackground,
  FrameParams,
  InfoPosition,
  LogoVariant,
  TemplateConfig,
  TextAlign,
  WatermarkFontFamily,
} from "@/stores/types";
import { cn } from "@/lib/utils";
import {
  LOGO_KEYS,
  getLogoVariants,
  getResolvedLogoKey,
  resolveLogoSelection,
} from "@/lib/exif/logo";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Aperture,
  Bold,
  Camera,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Layout,
  Minus,
  Palette,
  RotateCcw,
  Sparkles,
  SquareDashed,
  Sticker,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BG_OPTIONS: { value: FrameBackground; label: string; swatch: string }[] =
  [
    { value: "white", label: "白", swatch: "#ffffff" },
    { value: "black", label: "黑", swatch: "#111827" },
    {
      value: "blur",
      label: "模糊",
      swatch: "linear-gradient(135deg,#dbe4ff,#f0e4ff)",
    },
    { value: "custom", label: "自定", swatch: "repeating-conic-gradient(#d7dce6 0 25%,#fff 0 50%) 0 0/8px 8px" },
  ];

const ALIGNS: { value: TextAlign; icon: LucideIcon }[] = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
];

const FONT_FAMILIES: { value: WatermarkFontFamily; label: string }[] = [
  { value: "pingfang-sc", label: "PingFang SC" },
  { value: "arial", label: "Arial" },
];

const INFO_POS: { value: InfoPosition; label: string }[] = [
  { value: "bottom", label: "底" },
  { value: "top", label: "顶" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

const CANVAS_RATIOS: { value: CanvasRatio; label: string }[] = [
  { value: "auto", label: "原图" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:2", label: "3:2" },
  { value: "4:3", label: "4:3" },
  { value: "5:4", label: "5:4" },
  { value: "16:10", label: "16:10" },
  { value: "16:9", label: "16:9" },
  { value: "20:9", label: "20:9" },
  { value: "21:9", label: "21:9" },
  { value: "2.35:1", label: "2.35:1" },
  { value: "2.39:1", label: "2.39:1" },
];

const FIELDS: {
  key: keyof TemplateConfig;
  icon: LucideIcon;
  label: string;
}[] = [
  { key: "showLogo", icon: Sticker, label: "Logo" },
  { key: "showCamera", icon: Camera, label: "机身" },
  { key: "showLens", icon: Aperture, label: "镜头" },
  { key: "showParams", icon: SquareDashed, label: "参数" },
];

type SectionId =
  | "layout"
  | "background"
  | "shadow"
  | "photo"
  | "type"
  | "logo"
  | "divider"
  | "display";

export function FrameParamsPanel() {
  const {
    frameParams,
    setFrameParams,
    resetFrameParams,
    config,
    setConfig,
  } = useTemplateStore();
  const selectedPhoto = usePhotoStore((s) =>
    s.photos.find((p) => p.id === s.selectedId),
  );
  const panelLocked =
    !!selectedPhoto &&
    (selectedPhoto.previewStatus !== "ready" ||
      selectedPhoto.exifStatus !== "ready");

  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    layout: true,
    background: true,
    shadow: false,
    photo: false,
    type: false,
    logo: false,
    divider: false,
    display: true,
  });

  const toggle = (id: SectionId) =>
    setOpen((o) => ({ ...o, [id]: !o[id] }));

  const set = (partial: Partial<FrameParams>) => setFrameParams(partial);
  const resolvedLogo = resolveLogoSelection(
    frameParams.logoKey,
    frameParams.logoVariant,
    selectedPhoto?.exif?.camera.make,
  );
  const effectiveLogoKey = getResolvedLogoKey(
    frameParams.logoKey,
    selectedPhoto?.exif?.camera.make,
  );
  const logoVariants = effectiveLogoKey ? getLogoVariants(effectiveLogoKey) : [];
  const logoVariantValue = logoVariants.includes(frameParams.logoVariant)
    ? frameParams.logoVariant
    : resolvedLogo.variant;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          <span>参数</span>
        </div>
        <button
          type="button"
          onClick={resetFrameParams}
          aria-label="重置参数"
          title="重置参数"
          className="btn-neu h-7 w-7 px-0"
          disabled={panelLocked}
        >
          <RotateCcw className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      <fieldset
        disabled={panelLocked}
        className="flex-1 overflow-y-auto px-4 pb-5 disabled:pointer-events-none disabled:opacity-45"
      >
        {panelLocked ? (
          <div className="mb-3 rounded-md border border-border/50 bg-card/55 px-2.5 py-2 text-[11px] text-muted-foreground/75">
            当前照片预览生成中，参数将在整体预览完成后解锁。
          </div>
        ) : null}
        <Section
          id="layout"
          icon={Layout}
          label="布局"
          open={open.layout}
          onToggle={toggle}
        >
          <div className="mb-3">
            <span className="label-plain mb-2 block">画布比例</span>
            <div className="grid grid-cols-4 gap-1.5">
              {CANVAS_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  onClick={() => set({ canvasRatio: ratio.value })}
                  className={cn(
                    "chip text-[10px]",
                    frameParams.canvasRatio === ratio.value && "chip-active",
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
          <SliderRow
            hint="主图占比"
            min={70}
            max={100}
            step={1}
            value={frameParams.mainImageWidthRatio}
            unit="%"
            onChange={(v) => set({ mainImageWidthRatio: v })}
          />
          <SliderRow
            hint="上下边距"
            min={0}
            max={12}
            step={0.2}
            value={frameParams.minTopBottomMargin}
            unit="%"
            onChange={(v) => set({ minTopBottomMargin: v })}
          />
          <SliderRow
            hint="文本间距"
            min={0}
            max={3}
            step={0.1}
            value={frameParams.textMargin}
            onChange={(v) => set({ textMargin: v })}
          />
          <div className="mt-3 space-y-1.5">
            <SliderRow
              hint="外圆角"
              min={0}
              max={48}
              value={frameParams.outerRadius}
              onChange={(v) => set({ outerRadius: v })}
            />
            <SliderRow
              hint="内圆角"
              min={0}
              max={32}
              value={frameParams.innerRadius}
              onChange={(v) => set({ innerRadius: v })}
            />
            <SliderRow
              hint="底栏"
              min={0}
              max={240}
              value={frameParams.infoBarHeight}
              onChange={(v) => set({ infoBarHeight: v })}
            />
          </div>
          <div className="mt-4">
            <span className="label-plain mb-2 block">信息位置</span>
            <div className="grid grid-cols-4 gap-1.5">
              {INFO_POS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set({ infoPosition: p.value })}
                  className={cn(
                    "chip text-[10px]",
                    frameParams.infoPosition === p.value && "chip-active",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="background"
          icon={Palette}
          label="背景"
          open={open.background}
          onToggle={toggle}
        >
          <div className="mb-2 flex gap-1.5">
            {BG_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set({ background: o.value })}
                aria-label={o.label}
                title={o.label}
                className={cn(
                  "relative h-7 flex-1 overflow-hidden rounded-md border transition-all duration-200",
                  frameParams.background === o.value
                    ? "border-primary/60 shadow-[var(--ring-selected)]"
                    : "border-border/60 hover:border-border",
                )}
                style={{ background: o.swatch }}
              />
            ))}
          </div>
          {frameParams.background === "custom" ? (
            <ColorRow
              label="颜色"
              value={frameParams.bgColor}
              onChange={(v) => set({ bgColor: v })}
            />
          ) : null}
          {frameParams.background === "blur" ? (
            <SliderRow
              hint="模糊"
              min={0}
              max={80}
              value={frameParams.blurRadius}
              onChange={(v) => set({ blurRadius: v })}
            />
          ) : null}
        </Section>

        <Section
          id="shadow"
          icon={Sparkles}
          label="阴影"
          open={open.shadow}
          onToggle={toggle}
        >
          <div className="param-row">
            <span className="label-plain">启用</span>
            <Toggle
              active={frameParams.shadow}
              onClick={() => set({ shadow: !frameParams.shadow })}
            />
          </div>
          {frameParams.shadow ? (
            <div className="space-y-1.5">
              <SliderRow
                hint="模糊"
                min={0}
                max={60}
                value={frameParams.shadowBlur}
                onChange={(v) => set({ shadowBlur: v })}
              />
              <SliderRow
                hint="偏移"
                min={0}
                max={30}
                value={frameParams.shadowOffsetY}
                onChange={(v) => set({ shadowOffsetY: v })}
              />
              <SliderRow
                hint="浓度"
                min={0}
                max={80}
                value={frameParams.shadowOpacity}
                unit="%"
                onChange={(v) => set({ shadowOpacity: v })}
              />
            </div>
          ) : null}
        </Section>

        <Section
          id="photo"
          icon={ImageIcon}
          label="照片"
          open={open.photo}
          onToggle={toggle}
        >
          <SliderRow
            hint="白边"
            min={0}
            max={16}
            value={frameParams.photoBorder}
            onChange={(v) => set({ photoBorder: v })}
          />
        </Section>

        <Section
          id="type"
          icon={Type}
          label="文字"
          open={open.type}
          onToggle={toggle}
        >
          <SelectRow
            label="字体"
            value={frameParams.fontFamily}
            options={FONT_FAMILIES}
            onChange={(value) => set({ fontFamily: value as WatermarkFontFamily })}
          />
          <SliderRow
            hint="字号"
            min={16}
            max={34}
            value={frameParams.fontSize}
            onChange={(v) => set({ fontSize: v })}
          />
          <ColorRow
            label="颜色"
            value={frameParams.textColor}
            onChange={(v) => set({ textColor: v })}
          />
          <div className="mt-3">
            <span className="label-plain mb-2 block">对齐</span>
            <div className="grid grid-cols-3 gap-1.5">
              {ALIGNS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => set({ textAlign: a.value })}
                    aria-label={a.value}
                    className={cn(
                      "chip",
                      frameParams.textAlign === a.value && "chip-active",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          id="logo"
          icon={Bold}
          label="Logo"
          open={open.logo}
          onToggle={toggle}
        >
          <SelectRow
            label="品牌"
            value={frameParams.logoKey}
            options={[
              { value: "", label: "auto" },
              ...LOGO_KEYS.map((key) => ({ value: key, label: key })),
            ]}
            onChange={(value) => {
              const nextKey = getResolvedLogoKey(
                value,
                selectedPhoto?.exif?.camera.make,
              );
              const nextVariants = nextKey ? getLogoVariants(nextKey) : [];
              set({
                logoKey: value,
                logoVariant: nextVariants.includes(frameParams.logoVariant)
                  ? frameParams.logoVariant
                  : nextVariants[0] ?? "original",
              });
            }}
          />
          <SelectRow
            label="版本"
            value={logoVariantValue}
            disabled={!effectiveLogoKey || logoVariants.length === 0}
            options={logoVariants.map((variant) => ({
              value: variant,
              label: variant,
            }))}
            onChange={(value) => set({ logoVariant: value as LogoVariant })}
          />
          <SliderRow
            hint="尺寸"
            min={10}
            max={30}
            value={frameParams.logoSize}
            onChange={(v) => set({ logoSize: v })}
          />
          <SliderRow
            hint="间距"
            min={40}
            max={80}
            value={frameParams.logoGap}
            onChange={(v) => set({ logoGap: v })}
          />
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            {effectiveLogoKey
              ? `当前 Logo: ${effectiveLogoKey}`
              : "当前 Logo: 跟随照片"}
          </p>
        </Section>

        <Section
          id="divider"
          icon={Minus}
          label="分隔线"
          open={open.divider}
          onToggle={toggle}
        >
          <div className="param-row">
            <span className="label-plain">显示</span>
            <Toggle
              active={frameParams.dividerShow}
              onClick={() => set({ dividerShow: !frameParams.dividerShow })}
            />
          </div>
          {frameParams.dividerShow ? (
            <ColorRow
              label="颜色"
              value={frameParams.dividerColor}
              onChange={(v) => set({ dividerColor: v })}
            />
          ) : null}
        </Section>

        <Section
          id="display"
          icon={Eye}
          label="显示项"
          open={open.display}
          onToggle={toggle}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {FIELDS.map((f) => {
              const Icon = f.icon;
              const active = config[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setConfig({ [f.key]: !active })}
                  className={cn("chip", active && "chip-active")}
                >
                  <Icon className="h-3 w-3" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {selectedPhoto ? (
          <div className="border-t border-border/40 pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Camera className="h-3 w-3" />
              <span>EXIF</span>
            </div>
            {selectedPhoto.exifStatus === "loading" ? (
              <p className="text-[11px] text-muted-foreground/70">soon...</p>
            ) : selectedPhoto.exifStatus === "error" ? (
              <p className="text-[11px] text-destructive/80">
                {selectedPhoto.exifError ?? "EXIF 读取失败"}
              </p>
            ) : panelLocked ? (
              <p className="text-[11px] text-muted-foreground/70">
                soon...
              </p>
            ) : (
              <ExifRows exif={selectedPhoto.exif} />
            )}
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  label,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  icon: LucideIcon;
  label: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/40 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="group flex w-full items-center justify-between py-1.5 text-left"
      >
        <span
          className={cn(
            "label-inset text-[11px] uppercase",
            open && "label-inset-active",
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>
      {open ? <div className="mt-2.5 pb-1.5">{children}</div> : null}
    </div>
  );
}

function SliderRow({
  hint,
  min,
  max,
  step = 1,
  value,
  unit,
  onChange,
}: {
  hint: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const isInt = Number.isInteger(step);
  const display = isInt ? String(value) : value.toFixed(1);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-10 shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
        {hint}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-neu flex-1"
        style={{ ["--range-fill" as string]: `${pct}%` }}
      />
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={display}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          onBlur={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          className="num-input"
        />
        {unit ? (
          <span className="w-3 text-[10px] text-muted-foreground/70">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1">
      <span className="label-plain">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
        />
        <span className="text-[10px] font-medium tabular-nums uppercase text-muted-foreground/70">
          {value}
        </span>
      </div>
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="param-row">
      <span className="label-plain">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="param-select"
      >
        {options.map((option) => (
          <option key={option.value || "auto"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={active}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors duration-200",
        active ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200",
          active
            ? "left-[calc(100%-1.125rem)] shadow-[0_1px_3px_rgba(17,24,39,0.2)]"
            : "left-0.5 shadow-[0_1px_2px_rgba(17,24,39,0.15)]",
        )}
      />
    </button>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="label-plain shrink-0">{label}</span>
      <span className="text-right text-[11px] text-foreground/85">{value}</span>
    </div>
  );
}

function ExifRows({ exif }: { exif?: ExifData }) {
  if (!exif) {
    return <p className="text-[11px] text-muted-foreground/70">暂无 EXIF 信息</p>;
  }

  const rawCamera = [exif.camera.make, exif.camera.model]
    .filter(Boolean)
    .join(" ");
  const rawParams = [
    exif.focalLength ? `${exif.focalLength}mm` : "",
    exif.aperture ? `f/${exif.aperture}` : "",
    exif.shutterSpeed,
    exif.iso ? `ISO${exif.iso}` : "",
  ]
    .filter(Boolean)
    .join("  ");

  return (
    <div className="space-y-1.5">
      <ReadOnlyRow label="机身" value={rawCamera} />
      <ReadOnlyRow label="镜头" value={exif.lens} />
      <ReadOnlyRow label="参数" value={rawParams} />
      <ReadOnlyRow label="时间" value={exif.takenAt} />
      {exif.gps ? (
        <ReadOnlyRow
          label="GPS"
          value={`${exif.gps.lat.toFixed(4)}, ${exif.gps.lng.toFixed(4)}`}
        />
      ) : null}
    </div>
  );
}
