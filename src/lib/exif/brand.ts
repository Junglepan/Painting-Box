const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
type BrandFormatter = {
  make: (value: string) => string;
  model: (value: string, make: string) => string;
};

function toRoman(n: number): string {
  if (n >= 1 && n < ROMAN.length) return ROMAN[n];
  return String(n);
}

function sanitize(raw: string) {
  return raw.trim().replace(/^"+|"+$/g, "").trim();
}

function titleCase(raw: string) {
  const s = sanitize(raw);
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

function defaultModel(raw: string, make: string) {
  let v = sanitize(raw).toLowerCase();
  const prefix = sanitize(make).toLowerCase();
  if (prefix && v.startsWith(`${prefix} `)) {
    v = v.slice(prefix.length + 1).trim();
  }
  return v;
}

function nikonModel(raw: string, make: string) {
  let v = sanitize(raw);
  const makeUpper = normalizeMake(make).toUpperCase();
  if (makeUpper && v.toUpperCase().startsWith(`${makeUpper} `)) {
    v = v.slice(makeUpper.length + 1).trim();
  }
  // Nikon Z numeric bodies: keep main number arabic with space after Z, convert only iteration suffix.
  v = v.replace(/^Z[\s_-]*(\d{1,2})(?:[\s_-]+(\d{1,2}))?$/i, (_, main: string, iter?: string) => {
    const mainNum = parseInt(main, 10);
    if (Number.isNaN(mainNum)) return "Z";
    const mainPart = `Z ${mainNum}`;
    if (!iter) return mainPart;
    const iterNum = parseInt(iter, 10);
    if (Number.isNaN(iterNum)) return mainPart;
    return `${mainPart}${toRoman(iterNum)}`;
  });
  // Nikon Z letter models: normalize separators/case, e.g. Z-fc / Z FC -> Z fc.
  v = v.replace(/^Z[\s_-]*([A-Za-z]{1,3})$/i, (_, suffix: string) => `Z ${suffix.toLowerCase()}`);
  return v.replace(/\s+/g, " ").trim();
}

function sonyModel(raw: string) {
  const v = sanitize(raw);
  if (v.toUpperCase().startsWith("ILCE-")) {
    return `α ${v.slice(5).toLowerCase()}`;
  }
  return v.toLowerCase();
}

const BRAND_FORMATTERS: Record<string, BrandFormatter> = {
  nikon: {
    make: titleCase,
    model: nikonModel,
  },
  sony: {
    make: titleCase,
    model: (value) => sonyModel(value),
  },
  canon: {
    make: titleCase,
    model: defaultModel,
  },
  fujifilm: {
    make: titleCase,
    model: defaultModel,
  },
  leica: {
    make: titleCase,
    model: defaultModel,
  },
  panasonic: {
    make: titleCase,
    model: defaultModel,
  },
  phaseone: {
    make: titleCase,
    model: defaultModel,
  },
};

// Strips "CORPORATION" etc. and capitalizes: "NIKON CORPORATION" → "Nikon"
export function normalizeMake(raw: string): string {
  const cleaned = sanitize(raw).replace(/\s*CORPORATION\b/gi, "").trim();
  const formatter = BRAND_FORMATTERS[cleaned.toLowerCase()];
  return formatter ? formatter.make(cleaned) : titleCase(cleaned);
}

// Returns the normalized display model string
export function normalizeModel(make: string, model: string): string {
  const makeNorm = normalizeMake(make).toLowerCase();
  const formatter = BRAND_FORMATTERS[makeNorm];
  return formatter ? formatter.model(model, make) : defaultModel(model, make);
}

export function formatCamera(make: string, model: string): string {
  const normMake = normalizeMake(make);
  const normModel = normalizeModel(make, model);

  if (!normMake) return normModel;
  if (!normModel) return normMake;

  const rawModel = sanitize(model);
  const rawPrefix = normMake ? `${normMake.toLowerCase()} ` : "";
  if (rawPrefix && rawModel.toLowerCase().startsWith(rawPrefix)) {
    return `${normMake} ${normalizeModel(make, rawModel.slice(rawPrefix.length))}`.trim();
  }
  if (normModel.toLowerCase().startsWith(normMake.toLowerCase())) return normModel;

  return `${normMake} ${normModel}`;
}
