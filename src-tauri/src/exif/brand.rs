const ROMAN: &[&str] = &["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

fn to_roman(n: usize) -> String {
    ROMAN.get(n).map(|s| s.to_string()).unwrap_or_else(|| n.to_string())
}

fn sanitize(raw: &str) -> String {
    raw.trim().trim_matches('"').trim().to_string()
}

fn title_case(raw: &str) -> String {
    let s = sanitize(raw);
    if s.is_empty() {
        return String::new();
    }
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_ascii_uppercase().to_string() + &chars.as_str().to_ascii_lowercase(),
    }
}

fn default_model(raw: &str, make: &str) -> String {
    let mut value = sanitize(raw).to_ascii_lowercase();
    let prefix = sanitize(make).to_ascii_lowercase();
    if !prefix.is_empty() {
        let with_space = format!("{prefix} ");
        if value.starts_with(&with_space) {
            value = value[with_space.len()..].trim().to_string();
        }
    }
    value
}

fn nikon_model(raw: &str, make: &str) -> String {
    let mut value = sanitize(raw);
    let make_upper = normalize_make(make).to_ascii_uppercase();
    if !make_upper.is_empty() {
        let with_space = format!("{make_upper} ");
        if value.to_ascii_uppercase().starts_with(&with_space) {
            value = value[with_space.len()..].trim().to_string();
        }
    }

    let normalized = value.replace(['_', '-'], " ");
    let parts: Vec<&str> = normalized.split_whitespace().collect();
    if let Some(first) = parts.first() {
        if first.eq_ignore_ascii_case("z") {
            if parts.len() == 2 && parts[1].chars().all(|c| c.is_ascii_alphabetic()) {
                return format!("Z {}", parts[1].to_ascii_lowercase());
            }
            if parts.len() == 2 {
                if let Ok(main_num) = parts[1].parse::<usize>() {
                    return format!("Z {}", main_num);
                }
            }
            if parts.len() == 3 {
                if let (Ok(main_num), Ok(iter_num)) = (parts[1].parse::<usize>(), parts[2].parse::<usize>()) {
                    return format!("Z {}{}", main_num, to_roman(iter_num));
                }
            }
        }
    }

    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn sony_model(raw: &str) -> String {
    let value = sanitize(raw);
    if value.to_ascii_uppercase().starts_with("ILCE-") {
        return format!("α {}", value[5..].to_ascii_lowercase());
    }
    value.to_ascii_lowercase()
}

/// "NIKON CORPORATION" → "Nikon", "SONY" → "Sony", etc.
pub fn normalize_make(raw: &str) -> String {
    let s = sanitize(raw);
    let s = s.trim_end_matches(|c: char| !c.is_alphabetic());
    let s = if let Some(pos) = s.to_ascii_uppercase().rfind("CORPORATION") {
        s[..pos].trim_end().to_string()
    } else {
        s.to_string()
    };
    if s.is_empty() { return String::new(); }
    match s.to_ascii_lowercase().as_str() {
        "nikon" | "sony" | "canon" | "fujifilm" | "leica" | "panasonic" | "phaseone" => title_case(&s),
        _ => title_case(&s),
    }
}

/// Returns the normalized display model string.
pub fn normalize_model(make: &str, model: &str) -> String {
    let make_norm = normalize_make(make).to_ascii_lowercase();
    match make_norm.as_str() {
        "nikon" => nikon_model(model, make),
        "sony" => sony_model(model),
        _ => default_model(model, make),
    }
}

pub fn format_camera(make: &str, model: &str) -> String {
    let norm_make = normalize_make(make);
    let norm_model = normalize_model(make, model);
    let raw_model = sanitize(model);

    if norm_make.is_empty() { return norm_model; }
    if norm_model.is_empty() { return norm_make; }

    let raw_prefix = format!("{} ", norm_make.to_ascii_lowercase());
    if raw_model.to_ascii_lowercase().starts_with(&raw_prefix) {
        let trimmed = raw_model[raw_prefix.len()..].trim();
        return format!("{} {}", norm_make, normalize_model(make, trimmed)).trim().to_string();
    }

    if norm_model.to_ascii_lowercase().starts_with(&norm_make.to_ascii_lowercase()) {
        return norm_model;
    }

    format!("{} {}", norm_make, norm_model)
}

#[cfg(test)]
mod tests {
    use super::{format_camera, normalize_make, normalize_model};

    #[test]
    fn strips_corporation_suffix() {
        assert_eq!(normalize_make("NIKON CORPORATION"), "Nikon");
    }

    #[test]
    fn formats_nikon_z_bodies() {
        assert_eq!(normalize_model("NIKON", "NIKON Z_7"), "Z 7");
        assert_eq!(normalize_model("NIKON CORPORATION", "NIKON Z 7_2"), "Z 7II");
        assert_eq!(format_camera("NIKON CORPORATION", "NIKON Z_7"), "Nikon Z 7");
    }

    #[test]
    fn formats_nikon_z_letter_models() {
        assert_eq!(normalize_model("NIKON", "NIKON Z_fc"), "Z fc");
        assert_eq!(normalize_model("NIKON", "NIKON Z-F"), "Z f");
    }

    #[test]
    fn formats_sony_ilce_bodies() {
        assert_eq!(normalize_model("SONY", "ILCE-7M4"), "α 7m4");
        assert_eq!(format_camera("SONY", "ILCE-7M4"), "Sony α 7m4");
    }

    #[test]
    fn removes_duplicate_default_make_prefix() {
        assert_eq!(normalize_model("Canon", "Canon EOS R5"), "eos r5");
        assert_eq!(format_camera("Canon", "Canon EOS R5"), "Canon eos r5");
    }
}
