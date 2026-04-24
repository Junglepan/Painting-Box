use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock},
};

use ab_glyph::{Font, FontVec, GlyphId, PxScale, ScaleFont, point};
use image::{Rgba, RgbaImage};
use serde::Deserialize;

pub struct TextRenderer {
    regular: FontVec,
    bold: FontVec,
}

impl TextRenderer {
    pub fn cached(family: &str) -> Option<Arc<Self>> {
        static FONT_CACHE: OnceLock<Mutex<HashMap<String, Arc<TextRenderer>>>> = OnceLock::new();
        let cache = FONT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
        let key = family.to_string();

        if let Ok(guard) = cache.lock() {
            if let Some(renderer) = guard.get(&key) {
                return Some(Arc::clone(renderer));
            }
        }

        let renderer = Arc::new(Self::load(family)?);
        if let Ok(mut guard) = cache.lock() {
            guard.insert(key, Arc::clone(&renderer));
        }
        Some(renderer)
    }

    pub fn load(family: &str) -> Option<Self> {
        // Try bundled Inter first (compiled in when fonts/inter-*.ttf exist in src-tauri/fonts/).
        if let Some(renderer) = load_bundled(family) {
            return Some(renderer);
        }
        let regular = load_font(font_paths(family, false))?;
        let bold = load_font(font_paths(family, true))
            .unwrap_or_else(|| load_font(font_paths(family, false)).unwrap());
        Some(Self { regular, bold })
    }

    pub fn measure(&self, text: &str, size: f32, bold: bool) -> f32 {
        let font = if bold { &self.bold } else { &self.regular };
        let scaled = font.as_scaled(PxScale::from(size));
        let mut w = 0.0f32;
        let mut prev: Option<GlyphId> = None;
        for ch in text.chars() {
            let id = scaled.glyph_id(ch);
            if let Some(p) = prev {
                w += scaled.kern(p, id);
            }
            w += scaled.h_advance(id);
            prev = Some(id);
        }
        w
    }

    pub fn ascent(&self, size: f32, bold: bool) -> f32 {
        let font = if bold { &self.bold } else { &self.regular };
        let scaled = font.as_scaled(PxScale::from(size));
        scaled.ascent()
    }

    pub fn line_height(&self, size: f32, bold: bool) -> f32 {
        let font = if bold { &self.bold } else { &self.regular };
        let scaled = font.as_scaled(PxScale::from(size));
        let ascent = scaled.ascent();
        let descent = scaled.descent().abs();
        let h = ascent + descent;
        h.max(size)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn draw(
        &self,
        canvas: &mut RgbaImage,
        text: &str,
        x: f32,
        y: f32,
        size: f32,
        bold: bool,
        color: Rgba<u8>,
    ) {
        let font = if bold { &self.bold } else { &self.regular };
        let scale = PxScale::from(size);
        let scaled = font.as_scaled(scale);
        let baseline = y + scaled.ascent();

        let mut cursor_x = x;
        let mut prev: Option<GlyphId> = None;

        for ch in text.chars() {
            let id = scaled.glyph_id(ch);
            if let Some(p) = prev {
                cursor_x += scaled.kern(p, id);
            }
            let glyph = id.with_scale_and_position(scale, point(cursor_x, baseline));
            cursor_x += scaled.h_advance(id);
            prev = Some(id);

            if let Some(outlined) = font.outline_glyph(glyph) {
                let bounds = outlined.px_bounds();
                outlined.draw(|gx, gy, cov| {
                    let px = bounds.min.x as i32 + gx as i32;
                    let py = bounds.min.y as i32 + gy as i32;
                    if px < 0 || py < 0 {
                        return;
                    }
                    let (px, py) = (px as u32, py as u32);
                    if px >= canvas.width() || py >= canvas.height() {
                        return;
                    }
                    let bg = *canvas.get_pixel(px, py);
                    let a = cov;
                    let blend = |fg: u8, bg: u8| -> u8 {
                        (fg as f32 * a + bg as f32 * (1.0 - a)).round() as u8
                    };
                    canvas.put_pixel(
                        px,
                        py,
                        Rgba([
                            blend(color[0], bg[0]),
                            blend(color[1], bg[1]),
                            blend(color[2], bg[2]),
                            255,
                        ]),
                    );
                });
            }
        }
    }
}

fn load_font(paths: Vec<&'static str>) -> Option<FontVec> {
    for path in paths {
        let Ok(data) = std::fs::read(path) else { continue };
        if let Ok(font) = FontVec::try_from_vec(data.clone()) {
            return Some(font);
        }
        // TTC collection — try first 4 faces
        for i in 0..4u32 {
            if let Ok(font) = FontVec::try_from_vec_and_index(data.clone(), i) {
                return Some(font);
            }
        }
    }
    None
}

fn font_paths(family: &str, bold: bool) -> Vec<&'static str> {
    let mut paths: Vec<&'static str> = Vec::new();

    if let Some(mapped) = mapped_font_paths(family, bold) {
        paths.extend(mapped);
    }

    // Always append platform-reliable fallbacks so text renders even when the
    // primary font is unavailable (e.g. PingFang paths change across macOS versions).
    if cfg!(target_os = "macos") {
        if bold {
            paths.extend_from_slice(&[
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/ArialHB.ttc",
                "/Library/Fonts/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
            ]);
        } else {
            paths.extend_from_slice(&[
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/System/Library/Fonts/ArialHB.ttc",
                "/Library/Fonts/Arial.ttf",
            ]);
        }
    } else if cfg!(target_os = "windows") {
        if bold {
            paths.extend_from_slice(&[
                "C:\\Windows\\Fonts\\arialbd.ttf",
                "C:\\Windows\\Fonts\\arial.ttf",
            ]);
        } else {
            paths.push("C:\\Windows\\Fonts\\arial.ttf");
        }
    } else {
        if bold {
            paths.push("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf");
        }
        paths.push("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    }

    paths
}

/// Load bundled Inter font when compiled-in bytes are available.
/// Activated automatically by build.rs when src-tauri/fonts/inter-*.ttf exist.
fn load_bundled(family: &str) -> Option<TextRenderer> {
    #[cfg(bundled_inter)]
    {
        const INTER_REGULAR: &[u8] = include_bytes!("../../fonts/inter-regular.ttf");
        const INTER_BOLD: &[u8] = include_bytes!("../../fonts/inter-bold.ttf");

        if family == "inter" || family == "pingfang-sc" || family == "arial" {
            let regular = load_font_from_bytes(INTER_REGULAR)?;
            let bold = load_font_from_bytes(INTER_BOLD)
                .unwrap_or_else(|| load_font_from_bytes(INTER_REGULAR).unwrap());
            return Some(TextRenderer { regular, bold });
        }
    }
    let _ = family;
    None
}

#[allow(dead_code)]
fn load_font_from_bytes(data: &[u8]) -> Option<FontVec> {
    if let Ok(font) = FontVec::try_from_vec(data.to_vec()) {
        return Some(font);
    }
    for i in 0..4u32 {
        if let Ok(font) = FontVec::try_from_vec_and_index(data.to_vec(), i) {
            return Some(font);
        }
    }
    None
}

#[derive(Debug, Deserialize)]
struct FontMapEntry {
    #[serde(rename = "platformPaths")]
    platform_paths: FontPlatformPaths,
}

#[derive(Debug, Deserialize)]
struct FontPlatformPaths {
    macos: FontWeightPaths,
    windows: FontWeightPaths,
    linux: FontWeightPaths,
}

#[derive(Debug, Deserialize)]
struct FontWeightPaths {
    regular: Vec<String>,
    bold: Vec<String>,
}

fn mapped_font_paths(family: &str, bold: bool) -> Option<Vec<&'static str>> {
    let config = font_mapping();
    let entry = config.get(family)?;
    let platform = if cfg!(target_os = "macos") {
        &entry.platform_paths.macos
    } else if cfg!(target_os = "windows") {
        &entry.platform_paths.windows
    } else {
        &entry.platform_paths.linux
    };
    let selected = if bold { &platform.bold } else { &platform.regular };
    if selected.is_empty() {
        return None;
    }
    Some(selected.iter().map(|path| leak_string(path.clone())).collect())
}

fn font_mapping() -> &'static HashMap<String, FontMapEntry> {
    static FONT_MAPPING: OnceLock<HashMap<String, FontMapEntry>> = OnceLock::new();
    FONT_MAPPING.get_or_init(|| {
        serde_json::from_str(include_str!("../../../src/shared/font-mapping.json"))
            .unwrap_or_default()
    })
}

fn leak_string(value: String) -> &'static str {
    Box::leak(value.into_boxed_str())
}
