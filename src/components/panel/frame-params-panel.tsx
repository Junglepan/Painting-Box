import { useState } from "react";
import { useTemplateStore } from "@/stores/template-store";
import type {
  FrameBackground,
  FrameParams,
  InfoPosition,
  LogoColor,
  TemplateConfig,
  TextAlign,
} from "@/stores/types";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Aperture,
  Bold,
  Calendar,
  Camera,
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Layout,
  Link2,
  Link2Off,
  MapPin,
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

const LOGO_COLORS: { value: LogoColor; label: string }[] = [
  { value: "original", label: "原色" },
  { value: "black", label: "黑" },
  { value: "white", label: "白" },
];

const ALIGNS: { value: TextAlign; icon: LucideIcon }[] = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
];

const INFO_POS: { value: InfoPosition; label: string }[] = [
  { value: "bottom", label: "底" },
  { value: "top", label: "顶" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
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
  { key: "showDateTime", icon: Calendar, label: "时间" },
  { key: "showGps", icon: MapPin, label: "GPS" },
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
        >
          <RotateCcw className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5">
        <Section
          id="layout"
          icon={Layout}
          label="布局"
          open={open.layout}
          onToggle={toggle}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="label-inset">边距</span>
            <button
              type="button"
              onClick={() =>
                set({ paddingLocked: !frameParams.paddingLocked })
              }
              aria-label={frameParams.paddingLocked ? "取消联动" : "联动四边"}
              title={frameParams.paddingLocked ? "取消联动" : "联动四边"}
              className={cn(
                "chip chip-icon",
                frameParams.paddingLocked && "chip-active",
              )}
            >
              {frameParams.paddingLocked ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Link2Off className="h-3 w-3" />
              )}
            </button>
          </div>
          <SliderRow
            hint="上"
            min={0}
            max={300}
            value={frameParams.paddingTop}
            onChange={(v) => set({ paddingTop: v })}
          />
          <SliderRow
            hint="右"
            min={0}
            max={300}
            value={frameParams.paddingRight}
            onChange={(v) => set({ paddingRight: v })}
          />
          <SliderRow
            hint="下"
            min={0}
            max={300}
            value={frameParams.paddingBottom}
            onChange={(v) => set({ paddingBottom: v })}
          />
          <SliderRow
            hint="左"
            min={0}
            max={300}
            value={frameParams.paddingLeft}
            onChange={(v) => set({ paddingLeft: v })}
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
            <span className="label-plain mb-2">信息位置</span>
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
            <span className="label-inset">启用</span>
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
                max={80}
                value={frameParams.shadowBlur}
                onChange={(v) => set({ shadowBlur: v })}
              />
              <SliderRow
                hint="偏移"
                min={0}
                max={40}
                value={frameParams.shadowOffsetY}
                onChange={(v) => set({ shadowOffsetY: v })}
              />
              <SliderRow
                hint="浓度"
                min={0}
                max={100}
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
            hint="缩放"
            min={50}
            max={100}
            value={frameParams.photoScale}
            unit="%"
            onChange={(v) => set({ photoScale: v })}
          />
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
          <SliderRow
            hint="字号"
            min={8}
            max={48}
            value={frameParams.fontSize}
            onChange={(v) => set({ fontSize: v })}
          />
          <div className="mb-3 mt-3">
            <span className="label-plain mb-2">字重</span>
            <div className="grid grid-cols-4 gap-1.5">
              {([400, 500, 600, 700] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => set({ fontWeight: w })}
                  className={cn(
                    "chip text-[10px]",
                    frameParams.fontWeight === w && "chip-active",
                  )}
                  style={{ fontWeight: w }}
                >
                  {w === 400 ? "常规" : w === 500 ? "中等" : w === 600 ? "半粗" : "粗体"}
                </button>
              ))}
            </div>
          </div>
          <SliderRow
            hint="字距"
            min={0}
            max={8}
            step={0.5}
            value={frameParams.letterSpacing}
            onChange={(v) => set({ letterSpacing: v })}
          />
          <SliderRow
            hint="行高"
            min={0.8}
            max={2}
            step={0.1}
            value={frameParams.lineHeight}
            onChange={(v) => set({ lineHeight: v })}
          />
          <ColorRow
            label="颜色"
            value={frameParams.textColor}
            onChange={(v) => set({ textColor: v })}
          />
          <div className="mt-3">
            <span className="label-plain mb-2">对齐</span>
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
          <SliderRow
            hint="尺寸"
            min={16}
            max={80}
            value={frameParams.logoSize}
            onChange={(v) => set({ logoSize: v })}
          />
          <SliderRow
            hint="间距"
            min={0}
            max={40}
            value={frameParams.logoGap}
            onChange={(v) => set({ logoGap: v })}
          />
          <div className="mt-3">
            <span className="label-plain mb-2">颜色</span>
            <div className="grid grid-cols-3 gap-1.5">
              {LOGO_COLORS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set({ logoColor: l.value })}
                  className={cn(
                    "chip text-[10px]",
                    frameParams.logoColor === l.value && "chip-active",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="divider"
          icon={Minus}
          label="分隔线"
          open={open.divider}
          onToggle={toggle}
        >
          <div className="param-row">
            <span className="label-inset">显示</span>
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
      </div>
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
      <span className="w-10 shrink-0 text-center text-[11px] font-medium text-muted-foreground">
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
      <div className="relative flex shrink-0 items-center">
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
          className="num-input h-6 w-11 px-1 text-[11px]"
        />
        {unit ? (
          <span className="pointer-events-none absolute right-1 text-[9px] text-muted-foreground">
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
      <span className="label-inset">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
        />
        <span className="font-mono text-[10px] tabular-nums uppercase text-muted-foreground">
          {value}
        </span>
      </div>
    </label>
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
