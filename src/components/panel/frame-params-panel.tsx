import { useState } from "react";
import { usePhotoStore } from "@/stores/photo-store";
import { useTemplateStore } from "@/stores/template-store";
import type {
  CanvasRatio,
  CropRatio,
  DateFormat,
  ExifData,
  FrameBackground,
  FrameParams,
  LogoVariant,
  PhotoBorderStyle,
  TemplateConfig,
  WatermarkFontFamily,
} from "@/stores/types";
import {
  CUSTOM_LINES_MAX,
  CUSTOM_LINE_MAX_LENGTH,
  DATE_FORMATS,
} from "@/stores/types";
import { cn } from "@/lib/utils";
import {
  LOGO_KEYS,
  getLogoVariants,
  getResolvedLogoKey,
  resolveLogoSelection,
} from "@/lib/exif/logo";
import { getTemplateDisplayFields, getTemplateFrameCapabilities, isTemplateDisplayFieldFixed } from "@/lib/template-capabilities";
import {
  Aperture,
  Bold,
  CalendarDays,
  Camera,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Layout,
  Layers,
  Palette,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
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

const FONT_FAMILIES: { value: WatermarkFontFamily; label: string; group?: string }[] = [
  { value: "inter",            label: "Inter（内置）",      group: "英文" },
  { value: "playfair-display", label: "Playfair Display",   group: "英文" },
  { value: "bebas-neue",       label: "Bebas Neue",         group: "英文" },
  { value: "arial",            label: "Arial",              group: "英文" },
  { value: "noto-sans-sc",     label: "Noto Sans SC（内置）", group: "中文" },
  { value: "pingfang-sc",      label: "PingFang SC",        group: "中文" },
];

// All entries are landscape-first (w >= h); portrait toggle flips them.
const CANVAS_RATIOS: { value: CanvasRatio; label: string }[] = [
  { value: "3:2",    label: "原图"   },
  { value: "1:1",    label: "1:1"    },
  { value: "4:3",    label: "4:3"    },
  { value: "5:4",    label: "5:4"    },
  { value: "16:10",  label: "16:10"  },
  { value: "16:9",   label: "16:9"   },
  { value: "21:9",   label: "21:9"   },
  { value: "2.35:1", label: "2.35:1" },
];

const CROP_RATIOS: { value: CropRatio; label: string }[] = [
  { value: "original", label: "原图" },
  { value: "2.35:1",   label: "2.35:1" },
  { value: "16:9",     label: "16:9" },
  { value: "4:3",      label: "4:3" },
  { value: "3:2",      label: "3:2" },
  { value: "1:1",      label: "1:1" },
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
  { key: "showDate", icon: CalendarDays, label: "日期" },
];

const BORDER_STYLES: { value: PhotoBorderStyle; label: string }[] = [
  { value: "none", label: "无" },
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
];

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = DATE_FORMATS.map(
  (value) => ({ value, label: value }),
);

type SectionId =
  | "layout"
  | "background"
  | "shadow"
  | "photo"
  | "type"
  | "logo"
  | "display";

export function FrameParamsPanel() {
  const { currentKind, frameParams, setFrameParams, resetFrameParams, config, setConfig } =
    useTemplateStore();
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
  const displayFields = getTemplateDisplayFields(currentKind);
  const frameCapabilities = getTemplateFrameCapabilities(currentKind);
  const frameControls = frameCapabilities.controls;
  const has = (key: keyof typeof frameControls) => Boolean(frameControls[key]);
  const range = (key: keyof typeof frameControls) => {
    const control = frameControls[key];
    return control && control !== true ? control : null;
  };
  const mainImageRange = range("mainImageWidthRatio");
  const marginRange = range("minTopBottomMargin");
  const infoBarRange = range("infoBarHeight");
  const radiusRange = range("innerRadius");
  const borderRange = range("photoBorder");
  const fontSizeRange = range("fontSize");
  const shadowBlurRange = range("shadowBlur");
  const shadowOffsetYRange = range("shadowOffsetY");
  const shadowOpacityRange = range("shadowOpacity");
  const logoSizeRange = range("logoSize");
  const logoGapRange = range("logoGap");
  const showLayoutFineControls = Boolean(mainImageRange || marginRange || infoBarRange || radiusRange);
  const showBackgroundControls = has("background");
  const showShadowControls = Boolean(has("shadow") || shadowBlurRange || shadowOffsetYRange || shadowOpacityRange);
  const showTypeControls = Boolean(has("fontFamily") || fontSizeRange || has("textColor"));
  const showLogoControls = Boolean(logoSizeRange || logoGapRange);

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
            <div className="mb-2 flex items-center gap-1.5">
              <span className="label-plain flex-1">画布比例</span>
              <button
                type="button"
                title="跟随照片方向"
                onClick={() => set({ canvasOrientation: "auto" })}
                className={cn(
                  "chip h-6 px-1.5 text-[9px] font-medium",
                  frameParams.canvasOrientation === "auto" && "chip-active",
                )}
              >
                自动
              </button>
              {(["landscape", "portrait"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  title={o === "landscape" ? "横图" : "竖图"}
                  onClick={() => set({ canvasOrientation: o })}
                  className={cn(
                    "chip h-6 w-7 px-0",
                    frameParams.canvasOrientation === o && "chip-active",
                  )}
                >
                  {o === "landscape"
                    ? <RectangleHorizontal className="h-3 w-3" />
                    : <RectangleVertical className="h-3 w-3" />}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CANVAS_RATIOS.map((ratio) => {
                const isSquare = ratio.value === "1:1";
                const hasSemanticLabel = ratio.label !== ratio.value;
                const effectiveOrientation =
                  frameParams.canvasOrientation === "auto"
                    ? selectedPhoto?.width && selectedPhoto?.height && selectedPhoto.height > selectedPhoto.width
                      ? "portrait"
                      : "landscape"
                    : frameParams.canvasOrientation;
                const label =
                  !isSquare && !hasSemanticLabel && effectiveOrientation === "portrait"
                    ? ratio.value.split(":").reverse().join(":")
                    : ratio.label;
                return (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => set({ canvasRatio: ratio.value })}
                    className={cn(
                      "chip text-[10px]",
                      frameParams.canvasRatio === ratio.value && "chip-active",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {has("cropRatio") ? (
            <div className="mb-3">
              <span className="label-plain mb-2">照片裁切</span>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {CROP_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set({ cropRatio: r.value })}
                    className={cn(
                      "chip text-[10px]",
                      (frameParams.cropRatio ?? "original") === r.value && "chip-active",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {range("cropPosition") && (frameParams.cropRatio ?? "original") !== "original" ? (
                <div className="mt-1.5">
                  <SliderRow
                    hint="裁切位置"
                    min={range("cropPosition")!.min}
                    max={range("cropPosition")!.max}
                    step={range("cropPosition")!.step}
                    value={frameParams.cropPosition ?? 50}
                    unit="%"
                    onChange={(v) => set({ cropPosition: v })}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {showLayoutFineControls ? (
            <div className="space-y-1.5">
              {mainImageRange ? (
                <SliderRow
                  hint="主图占比"
                  min={mainImageRange.min}
                  max={mainImageRange.max}
                  step={mainImageRange.step}
                  value={frameParams.mainImageWidthRatio}
                  unit="%"
                  onChange={(v) => set({ mainImageWidthRatio: v })}
                />
              ) : null}
              {marginRange ? (
                <SliderRow
                  hint="边距"
                  min={marginRange.min}
                  max={marginRange.max}
                  step={marginRange.step}
                  value={frameParams.minTopBottomMargin}
                  unit="%"
                  onChange={(v) => set({ minTopBottomMargin: v })}
                />
              ) : null}
              {infoBarRange ? (
                <SliderRow
                  hint="底栏"
                  min={infoBarRange.min}
                  max={infoBarRange.max}
                  step={infoBarRange.step}
                  value={frameParams.infoBarHeight}
                  onChange={(v) => set({ infoBarHeight: v })}
                />
              ) : null}
              {radiusRange ? (
                <SliderRow
                  hint="内圆角"
                  min={radiusRange.min}
                  max={radiusRange.max}
                  step={radiusRange.step}
                  value={frameParams.innerRadius}
                  onChange={(v) => set({ innerRadius: v })}
                />
              ) : null}
            </div>
          ) : null}
        </Section>

        {showBackgroundControls ? (
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
                  style={{ background: o.value === "custom" ? frameParams.bgColor : o.swatch }}
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
        ) : null}

        {showShadowControls ? (
          <Section
            id="shadow"
            icon={Layers}
            label="阴影"
            open={open.shadow}
            onToggle={toggle}
          >
            {has("shadow") ? (
              <div className="param-row mb-2">
                <span className="label-plain">照片阴影</span>
                <Toggle
                  active={frameParams.shadow}
                  onClick={() => set({ shadow: !frameParams.shadow })}
                />
              </div>
            ) : null}
            {frameParams.shadow ? (
              <div className="space-y-1.5">
                {shadowBlurRange ? (
                  <SliderRow
                    hint="模糊"
                    min={shadowBlurRange.min}
                    max={shadowBlurRange.max}
                    step={shadowBlurRange.step}
                    value={frameParams.shadowBlur}
                    onChange={(v) => set({ shadowBlur: v })}
                  />
                ) : null}
                {shadowOffsetYRange ? (
                  <SliderRow
                    hint="下移"
                    min={shadowOffsetYRange.min}
                    max={shadowOffsetYRange.max}
                    step={shadowOffsetYRange.step}
                    value={frameParams.shadowOffsetY}
                    unit="%"
                    onChange={(v) => set({ shadowOffsetY: v })}
                  />
                ) : null}
                {shadowOpacityRange ? (
                  <SliderRow
                    hint="强度"
                    min={shadowOpacityRange.min}
                    max={shadowOpacityRange.max}
                    step={shadowOpacityRange.step}
                    value={frameParams.shadowOpacity}
                    unit="%"
                    onChange={(v) => set({ shadowOpacity: v })}
                  />
                ) : null}
              </div>
            ) : null}
          </Section>
        ) : null}

        <Section
          id="display"
          icon={Eye}
          label="显示项"
          open={open.display}
          onToggle={toggle}
        >
          <div className="param-row mb-2">
            <span className="label-plain">水印</span>
            <Toggle
              active={config.showWatermark}
              onClick={() => setConfig({ showWatermark: !config.showWatermark })}
            />
          </div>
          {config.showWatermark ? (
            <div className="grid grid-cols-3 gap-1.5">
              {FIELDS.map((f) => {
                const Icon = f.icon;
                const active = Boolean(config[f.key]);
                const fixed = isTemplateDisplayFieldFixed(currentKind, f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    disabled={fixed}
                    aria-disabled={fixed}
                    onClick={() => {
                      if (!fixed) setConfig({ [f.key]: !active });
                    }}
                    title={fixed ? "当前模板不支持配置此显示项" : undefined}
                    className={cn(
                      "chip",
                      active && "chip-active",
                      fixed && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/60">水印已关闭，导出将不含水印区域</p>
          )}
        </Section>

        {borderRange ? <Section
          id="photo"
          icon={ImageIcon}
          label="照片"
          open={open.photo}
          onToggle={toggle}
        >
          <SliderRow
            hint="边框"
            min={borderRange.min}
            max={borderRange.max}
            step={borderRange.step}
            value={frameParams.photoBorder}
            onChange={(v) => set({ photoBorder: v })}
          />
          {frameParams.photoBorder > 0 ? (
            <>
              <div className="param-row">
                <span className="label-plain">样式</span>
                <div className="flex gap-1">
                  {BORDER_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set({ photoBorderStyle: s.value })}
                      className={cn(
                        "chip text-[10px]",
                        frameParams.photoBorderStyle === s.value && "chip-active",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {frameParams.photoBorderStyle !== "none" ? (
                <ColorRow
                  label="颜色"
                  value={frameParams.photoBorderColor}
                  onChange={(v) => set({ photoBorderColor: v })}
                />
              ) : null}
            </>
          ) : null}
        </Section> : null}

        {showTypeControls ? <Section
          id="type"
          icon={Type}
          label="文字"
          open={open.type}
          onToggle={toggle}
        >
          {has("fontFamily") ? (
            <SelectRow
              label="字体"
              value={frameParams.fontFamily}
              options={FONT_FAMILIES}
              onChange={(value) => set({ fontFamily: value as WatermarkFontFamily })}
            />
          ) : null}
          {fontSizeRange ? (
            <SliderRow
              hint="字号"
              min={fontSizeRange.min}
              max={fontSizeRange.max}
              step={fontSizeRange.step}
              value={frameParams.fontSize}
              onChange={(v) => set({ fontSize: v })}
            />
          ) : null}
          {has("textColor") ? (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="label-plain">颜色</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="跟随背景对比度自动"
                  onClick={() => set({ autoTextContrast: true })}
                  className={cn(
                    "chip h-6 px-1.5 text-[9px] font-medium",
                    frameParams.autoTextContrast && "chip-active",
                  )}
                >
                  自动
                </button>
                <input
                  type="color"
                  value={frameParams.textColor}
                  onChange={(e) => set({ textColor: e.target.value, autoTextContrast: false })}
                  className={cn(
                    "h-6 w-8 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5",
                    frameParams.autoTextContrast && "opacity-50",
                  )}
                />
                <span className="text-[10px] font-medium tabular-nums uppercase text-muted-foreground/70">
                  {frameParams.textColor}
                </span>
              </div>
            </div>
          ) : null}
          <div className="mt-2 border-t border-border/40 pt-2">
            {displayFields.includes("showDate") && config.showDate ? (
              <SelectRow
                label="日期格式"
                value={config.dateFormat}
                options={DATE_FORMAT_OPTIONS}
                onChange={(value) =>
                  setConfig({ dateFormat: value as DateFormat })
                }
              />
            ) : null}
            <CustomLinesEditor
              lines={config.customLines}
              onChange={(lines) => setConfig({ customLines: lines })}
            />
          </div>
        </Section> : null}

        {showLogoControls ? <Section
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
            value={frameParams.logoVariant === "auto" ? "auto" : logoVariantValue}
            disabled={!effectiveLogoKey || logoVariants.length === 0}
            options={[
              ...(logoVariants.includes("black") && logoVariants.includes("white")
                ? [{ value: "auto", label: "auto（跟随背景）" }]
                : []),
              ...logoVariants.map((variant) => ({ value: variant, label: variant })),
            ]}
            onChange={(value) => set({ logoVariant: value as LogoVariant })}
          />
          {logoSizeRange ? (
            <SliderRow
              hint="尺寸"
              min={logoSizeRange.min}
              max={logoSizeRange.max}
              step={logoSizeRange.step}
              value={frameParams.logoSize}
              onChange={(v) => set({ logoSize: v })}
            />
          ) : null}
          {logoGapRange ? (
            <SliderRow
              hint="间距"
              min={logoGapRange.min}
              max={logoGapRange.max}
              step={logoGapRange.step}
              value={frameParams.logoGap}
              onChange={(v) => set({ logoGap: v })}
            />
          ) : null}
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            {effectiveLogoKey
              ? `当前 Logo: ${effectiveLogoKey}`
              : "当前 Logo: 跟随照片"}
          </p>
        </Section> : null}

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

function CustomLinesEditor({
  lines,
  onChange,
}: {
  lines: string[];
  onChange: (lines: string[]) => void;
}) {
  const safe = Array.isArray(lines) ? lines : [];
  const slots = Array.from({ length: CUSTOM_LINES_MAX }, (_, i) => safe[i] ?? "");
  const update = (index: number, value: string) => {
    const next = slots.slice();
    next[index] = value.slice(0, CUSTOM_LINE_MAX_LENGTH);
    onChange(next.map((s) => s.trim()).filter(Boolean).length === 0 ? [] : next);
  };
  return (
    <div className="space-y-1.5">
      <span className="label-plain">自定义文字</span>
      {slots.map((value, index) => (
        <input
          key={index}
          type="text"
          value={value}
          maxLength={CUSTOM_LINE_MAX_LENGTH}
          placeholder={index === 0 ? "例如：Shot on Leica" : "可选第二行"}
          onChange={(e) => update(index, e.target.value)}
          className="param-text-input"
        />
      ))}
      <p className="text-[10px] text-muted-foreground/60">
        最多 {CUSTOM_LINES_MAX} 行，每行 {CUSTOM_LINE_MAX_LENGTH} 字以内
      </p>
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
  const safeValue = Number.isFinite(value) ? value : min;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const isInt = Number.isInteger(step);
  const display = isInt ? String(safeValue) : safeValue.toFixed(1);

  const pct = ((safeValue - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-12 shrink-0 whitespace-nowrap text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
        {hint}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
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
            if (!Number.isNaN(n)) onChange(clamp(n));
          }}
          onBlur={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          className="num-input"
        />
        <span className="w-3 text-[10px] text-muted-foreground/70">
          {unit ?? ""}
        </span>
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
  options: { value: string; label: string; group?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const hasGroups = options.some((o) => o.group);

  const renderOptions = () => {
    if (!hasGroups) {
      return options.map((option) => (
        <option key={option.value || "auto"} value={option.value}>
          {option.label}
        </option>
      ));
    }
    const groupOrder: string[] = [];
    const grouped: Record<string, typeof options> = {};
    for (const opt of options) {
      const g = opt.group ?? "";
      if (!grouped[g]) { grouped[g] = []; groupOrder.push(g); }
      grouped[g].push(opt);
    }
    return groupOrder.map((g) => (
      <optgroup key={g} label={g}>
        {grouped[g].map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </optgroup>
    ));
  };

  return (
    <div className="param-row">
      <span className="label-plain">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="param-select"
      >
        {renderOptions()}
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
