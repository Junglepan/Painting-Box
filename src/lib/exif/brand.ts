const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function toRoman(n: number): string {
  if (n >= 1 && n < ROMAN.length) return ROMAN[n];
  return String(n);
}

// Strips "CORPORATION" etc. and capitalizes: "NIKON CORPORATION" → "Nikon"
export function normalizeMake(raw: string): string {
  const s = raw.trim().replace(/\s*CORPORATION\b/gi, "").trim();
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

// Returns the normalized display model string
export function normalizeModel(make: string, model: string): string {
  const s = model.trim();
  const makeNorm = normalizeMake(make).toLowerCase(); // e.g. "sony", "nikon", "canon"

  // Sony ILCE- → α series, lowercase: "ILCE-7M4" → "α 7m4"
  if (makeNorm === "sony") {
    if (s.toUpperCase().startsWith("ILCE-")) {
      return "α " + s.slice(5).toLowerCase();
    }
  }

  // Nikon: strip "NIKON " prefix, Z → ℤ, "_N" suffix → Roman numeral
  if (makeNorm === "nikon") {
    let v = s.toUpperCase().startsWith("NIKON ") ? s.slice(6).trim() : s;
    v = v.replace(/Z/gi, "ℤ");
    const parts = v.split("_");
    if (parts.length > 1) {
      const last = parts.pop()!;
      const n = parseInt(last, 10);
      if (!isNaN(n)) return (parts.join(" ").trim() + " " + toRoman(n)).trim();
      return (parts.join(" ").trim() + " " + last).trim();
    }
    return v.trim();
  }

  // Default: lowercase, strip leading brand prefix ("Canon EOS R5" → "eos r5")
  let v = s.toLowerCase();
  if (makeNorm && v.startsWith(makeNorm + " ")) {
    v = v.slice(makeNorm.length + 1).trim();
  }
  return v;
}

export function formatCamera(make: string, model: string): string {
  const normMake = normalizeMake(make);
  const normModel = normalizeModel(make, model);

  if (!normMake) return normModel;
  if (!normModel) return normMake;

  // Avoid duplicate brand: "Nikon nikon d750" → just "Nikon d750"
  if (normModel.toLowerCase().startsWith(normMake.toLowerCase())) return normModel;

  return `${normMake} ${normModel}`;
}
