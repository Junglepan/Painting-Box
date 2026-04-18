import { useTemplateStore } from "@/stores/template-store";
import type {
  FrameBackground,
  TemplateConfig,
  TemplateKind,
} from "@/stores/types";
import { cn } from "@/lib/utils";
import {
  Square,
  Rows3,
  Image as ImageIcon,
  Columns3,
  Palette,
  Sparkles,
  Type,
  Eye,
  Camera,
  Aperture,
  Calendar,
  MapPin,
  Sticker,
  SquareDashed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TEMPLATES: { kind: TemplateKind; icon: LucideIcon; label: string }[] = [
  { kind: "classic-bottom", icon: Rows3, label: "经典底栏" },
  { kind: "polaroid", icon: Square, label: "宝丽来" },
  { kind: "minimal-corner", icon: ImageIcon, label: "极简角标" },
  { kind: "magazine", icon: Columns3, label: "杂志" },
];

const BG_OPTIONS: { value: FrameBackground; label: string; swatch: string }[] =
  [
    { value: "white", label: "白", swatch: "#ffffff" },
    { value: "black", label: "黑", swatch: "#111827" },
    { value: "blur", label: "模糊", swatch: "linear-gradient(135deg,#dbe4ff,#f0e4ff)" },
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

export function FrameParamsPanel() {
  const {
    currentKind,
    setKind,
    frameParams,
    setFrameParams,
    config,
    setConfig,
  } = useTemplateStore();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1.5 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Palette className="h-3.5 w-3.5" />
        <span>参数</span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-5">
        <Section>
          <div className="grid grid-cols-4 gap-1.5">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = currentKind === t.kind;
              return (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setKind(t.kind)}
                  aria-label={t.label}
                  title={t.label}
                  className={cn("chip chip-icon", active && "chip-active")}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={SquareDashed} label="边距">
          <div className="grid grid-cols-2 gap-2">
            <NumField
              value={frameParams.paddingTop}
              onChange={(v) => setFrameParams({ paddingTop: v })}
              hint="上"
            />
            <NumField
              value={frameParams.paddingRight}
              onChange={(v) => setFrameParams({ paddingRight: v })}
              hint="右"
            />
            <NumField
              value={frameParams.paddingBottom}
              onChange={(v) => setFrameParams({ paddingBottom: v })}
              hint="下"
            />
            <NumField
              value={frameParams.paddingLeft}
              onChange={(v) => setFrameParams({ paddingLeft: v })}
              hint="左"
            />
          </div>
        </Section>

        <Section icon={Square} label="圆角">
          <Slider
            min={0}
            max={48}
            value={frameParams.radius}
            onChange={(v) => setFrameParams({ radius: v })}
          />
        </Section>

        <Section icon={Palette} label="背景">
          <div className="flex gap-1.5">
            {BG_OPTIONS.map((o) => {
              const active = frameParams.background === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFrameParams({ background: o.value })}
                  aria-label={o.label}
                  title={o.label}
                  className={cn(
                    "relative h-7 flex-1 overflow-hidden rounded-md border transition-all duration-200",
                    active
                      ? "border-primary/60 shadow-[var(--ring-selected)]"
                      : "border-border/60 hover:border-border",
                  )}
                  style={{ background: o.swatch }}
                />
              );
            })}
          </div>
        </Section>

        <Section icon={Sparkles} label="阴影">
          <Toggle
            active={frameParams.shadow}
            onClick={() => setFrameParams({ shadow: !frameParams.shadow })}
          />
        </Section>

        <Section icon={Type} label="字号">
          <Slider
            min={8}
            max={36}
            value={frameParams.fontSize}
            onChange={(v) => setFrameParams({ fontSize: v })}
          />
        </Section>

        <Section icon={Eye} label="显示">
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
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label ? (
        <div className="param-label mb-2">
          {Icon ? <Icon className="h-3 w-3" /> : null}
          <span>{label}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function NumField({
  value,
  onChange,
  hint,
}: {
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-3 text-center text-[10px] text-muted-foreground">
        {hint}
      </span>
      <input
        type="number"
        className="num-input flex-1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function Slider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
        {value}
      </span>
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
