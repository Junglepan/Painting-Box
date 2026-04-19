import { normalizeMake } from "./brand";
import { LOGO_CATALOG } from "./logo-catalog";
import type { LogoVariant } from "@/stores/types";

export { LOGO_KEYS } from "./logo-catalog";

const MAKE_TO_KEY: Record<string, keyof typeof LOGO_CATALOG> = {
  apple: "apple",
  canon: "canon",
  dji: "dji",
  fujifilm: "fujifilm",
  gopro: "gopro",
  hasselblad: "hasselblad",
  honor: "honor",
  huawei: "huawei",
  insta360: "insta360",
  iqoo: "iqoo",
  leica: "leica",
  lumix: "panasonic",
  meizu: "meizu",
  minolta: "minolta",
  nikon: "nikon",
  oneplus: "oneplus",
  oppo: "oppo",
  "osmo action": "osmo-action",
  panasonic: "panasonic",
  phaseone: "phaseone",
  "phase one": "phaseone",
  realme: "realme",
  redmi: "redmi",
  ricoh: "ricoh",
  samsung: "samsung",
  sigma: "sigma",
  sony: "sony",
  tamron: "tamron",
  tokina: "tokina",
  vivo: "vivo",
  xiaomi: "xiaomi",
  zeiss: "zeiss",
} as const;

const KEY_FALLBACKS: Partial<Record<keyof typeof LOGO_CATALOG, (keyof typeof LOGO_CATALOG)[]>> = {
  panasonic: ["panasonic", "lumix"],
  sony: ["sony", "sonyalpha"],
};

export function getCameraLogoKey(make: string) {
  const normalized = normalizeMake(make).toLowerCase();
  return MAKE_TO_KEY[normalized] ?? null;
}

export function getLogoVariants(key: string): LogoVariant[] {
  const keys = getLookupKeys(key);
  for (const lookupKey of keys) {
    const record = LOGO_CATALOG[lookupKey] as Record<string, string> | undefined;
    if (!record) continue;
    return Object.keys(record) as LogoVariant[];
  }
  return [];
}

export function getResolvedLogoKey(explicitKey: string, make?: string) {
  return explicitKey || (make ? getCameraLogoKey(make) : null) || "";
}

export function resolveLogoSelection(
  explicitKey: string,
  explicitVariant: LogoVariant,
  make?: string,
) {
  const key = getResolvedLogoKey(explicitKey, make);
  if (!key) {
    return { key: "", variant: explicitVariant, asset: null };
  }

  const variants = getLogoVariants(key);
  const isAutoDefaultNikon =
    !explicitKey &&
    key === "nikon" &&
    explicitVariant === "original" &&
    variants.includes("black");
  const preferredVariant = isAutoDefaultNikon
    ? "black"
    : variants.includes(explicitVariant)
      ? explicitVariant
      : getAutoLogoVariant(key, explicitVariant);
  const asset = getCameraLogoAssetByKey(key, preferredVariant);
  if (!asset) {
    return { key, variant: preferredVariant, asset: null };
  }

  const variant = variants.includes(preferredVariant)
    ? preferredVariant
    : inferVariantFromAsset(key, asset);
  return { key, variant, asset };
}

export function getCameraLogoAssetByKey(
  key: string,
  variant: LogoVariant,
) {
  const keys = getLookupKeys(key);

  for (const lookupKey of keys) {
    const record = LOGO_CATALOG[lookupKey] as Record<string, string> | undefined;
    if (!record) continue;

    const exact = record[variant];
    if (exact) return exact;
  }

  for (const lookupKey of keys) {
    const record = LOGO_CATALOG[lookupKey] as Record<string, string> | undefined;
    if (!record) continue;

    const fallback =
      record.original ??
      record.black ??
      record.white ??
      record["icon-original"] ??
      record["icon-black"] ??
      record["icon-white"];
    if (fallback) return fallback;
  }

  return null;
}

export function getCameraLogoAsset(make: string, variant: LogoVariant) {
  const key = getCameraLogoKey(make);
  if (!key) return null;
  return getCameraLogoAssetByKey(key, variant);
}

function getLookupKeys(key: string) {
  if (key in LOGO_CATALOG) {
    const typedKey = key as keyof typeof LOGO_CATALOG;
    return KEY_FALLBACKS[typedKey] ?? [typedKey];
  }
  return [];
}

function inferVariantFromAsset(key: string, asset: string): LogoVariant {
  const record = LOGO_CATALOG[key as keyof typeof LOGO_CATALOG] as Record<string, string> | undefined;
  if (!record) return "original";
  const found = Object.entries(record).find(([, value]) => value === asset)?.[0];
  return found ?? "original";
}

function getAutoLogoVariant(key: string, fallback: LogoVariant) {
  const variants = getLogoVariants(key);
  return (
    variants.find((variant) => variant.startsWith("icon-")) ??
    variants.find((variant) => variant === "original") ??
    variants.find((variant) => variant === "black") ??
    variants.find((variant) => variant === "white") ??
    fallback
  );
}
