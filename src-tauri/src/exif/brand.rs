const ROMAN: &[&str] = &["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

fn to_roman(n: usize) -> String {
    ROMAN.get(n).map(|s| s.to_string()).unwrap_or_else(|| n.to_string())
}

/// "NIKON CORPORATION" → "Nikon", "SONY" → "Sony", etc.
pub fn normalize_make(raw: &str) -> String {
    let s = raw.trim();
    // Strip CORPORATION suffix
    let s = s.trim_end_matches(|c: char| !c.is_alphabetic());
    let s = if let Some(pos) = s.to_ascii_uppercase().rfind("CORPORATION") {
        s[..pos].trim_end()
    } else {
        s
    };
    if s.is_empty() { return String::new(); }
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_ascii_uppercase().to_string() + &chars.as_str().to_ascii_lowercase(),
    }
}

/// Returns the normalized display model string.
pub fn normalize_model(make: &str, model: &str) -> String {
    let s = model.trim();
    let make_norm = normalize_make(make).to_ascii_lowercase();

    // Sony ILCE- → α series: "ILCE-7M4" → "α 7m4"
    if make_norm == "sony" {
        let upper = s.to_ascii_uppercase();
        if upper.starts_with("ILCE-") {
            return format!("α {}", s[5..].to_ascii_lowercase());
        }
    }

    // Nikon: strip "NIKON " prefix, Z → ℤ, "_N" suffix → Roman numeral
    if make_norm == "nikon" {
        let stripped = if s.to_ascii_uppercase().starts_with("NIKON ") { &s[6..] } else { s }.trim();
        let with_zed = stripped.replace(['Z', 'z'], "ℤ");
        let parts: Vec<&str> = with_zed.split('_').collect();
        if parts.len() > 1 {
            let (rest, last) = parts.split_at(parts.len() - 1);
            let last = last[0];
            if let Ok(n) = last.parse::<usize>() {
                let joined = rest.join(" ").trim().to_string();
                let roman = to_roman(n);
                return format!("{} {}", joined, roman).trim().to_string();
            }
            return format!("{} {}", rest.join(" ").trim(), last).trim().to_string();
        }
        return with_zed.trim().to_string();
    }

    // Default: lowercase, strip leading brand prefix
    let v = s.to_ascii_lowercase();
    if !make_norm.is_empty() {
        let prefix = format!("{} ", make_norm);
        if v.starts_with(&prefix) {
            return v[prefix.len()..].to_string();
        }
    }
    v
}

pub fn format_camera(make: &str, model: &str) -> String {
    let norm_make = normalize_make(make);
    let norm_model = normalize_model(make, model);

    if norm_make.is_empty() { return norm_model; }
    if norm_model.is_empty() { return norm_make; }

    if norm_model.to_ascii_lowercase().starts_with(&norm_make.to_ascii_lowercase()) {
        return norm_model;
    }

    format!("{} {}", norm_make, norm_model)
}
