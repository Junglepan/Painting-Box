use ab_glyph::{Font, FontVec, GlyphId, PxScale, ScaleFont, point};
use image::{Rgba, RgbaImage};

pub struct TextRenderer {
    regular: FontVec,
    bold: FontVec,
}

impl TextRenderer {
    pub fn load(family: &str) -> Option<Self> {
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
    if cfg!(target_os = "macos") {
        if family == "pingfang-sc" {
            return vec![
                "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/86ba2c91f017a3749571a82f2c6d890ac7ffb2fb.asset/AssetData/PingFang.ttc",
                "/System/Library/PrivateFrameworks/FontServices.framework/Versions/A/Resources/Reserved/PingFangUI.ttc",
                "/System/Library/Fonts/ArialHB.ttc",
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
            ];
        }
        if bold {
            vec![
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/Library/Fonts/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
            ]
        } else {
            vec![
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/Library/Fonts/Arial.ttf",
            ]
        }
    } else if cfg!(target_os = "windows") {
        if bold {
            vec![
                "C:\\Windows\\Fonts\\arialbd.ttf",
                "C:\\Windows\\Fonts\\arial.ttf",
            ]
        } else {
            vec!["C:\\Windows\\Fonts\\arial.ttf"]
        }
    } else {
        if bold {
            vec![
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]
        } else {
            vec![
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            ]
        }
    }
}
