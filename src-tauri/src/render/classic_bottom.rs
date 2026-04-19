use std::{fs::File, io::BufWriter, path::{Path, PathBuf}};

use image::{
    codecs::jpeg::JpegEncoder, imageops::overlay, DynamicImage, ImageFormat, Rgba, RgbaImage,
};
use resvg::{tiny_skia, usvg};
use serde::Deserialize;

use crate::commands::photos::ExportSinglePhotoRequest;
use crate::exif::{brand, read_exif, CameraInfo, ExifData, GpsInfo};
use crate::images::decode_image;
use crate::render::text::TextRenderer;

const LOGO_VISUAL_SCALE: f32 = 1.18;

// ── EXIF types (deserialized from frontend) ─────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportExif {
    pub camera: ExportCamera,
    pub lens: String,
    pub iso: u32,
    pub aperture: f64,
    pub shutter_speed: String,
    pub focal_length: f64,
    pub taken_at: String,
    pub gps: Option<ExportGps>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportCamera {
    pub make: String,
    pub model: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportGps {
    pub lat: f64,
    pub lng: f64,
}

impl From<ExifData> for ExportExif {
    fn from(v: ExifData) -> Self {
        Self {
            camera: ExportCamera::from(v.camera),
            lens: v.lens,
            iso: v.iso,
            aperture: v.aperture,
            shutter_speed: v.shutter_speed,
            focal_length: v.focal_length,
            taken_at: v.taken_at,
            gps: v.gps.map(ExportGps::from),
        }
    }
}

impl From<CameraInfo> for ExportCamera {
    fn from(v: CameraInfo) -> Self {
        Self { make: v.make, model: v.model }
    }
}

impl From<GpsInfo> for ExportGps {
    fn from(v: GpsInfo) -> Self {
        Self { lat: v.lat, lng: v.lng }
    }
}

// ── Frame / config types ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTemplateConfig {
    pub show_logo: bool,
    pub show_camera: bool,
    pub show_lens: bool,
    pub show_params: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFrameParams {
    pub info_bar_height: u32,
    pub main_image_width_ratio: f32,
    pub min_top_bottom_margin: f32,
    pub text_margin: f32,
    pub inner_radius: u32,
    pub outer_radius: u32,
    pub shadow: bool,
    pub shadow_blur: u32,
    pub shadow_offset_y: u32,
    pub shadow_opacity: u32,
    pub photo_border: u32,
    pub background: String,
    pub bg_color: String,
    pub text_color: String,
    pub logo_key: String,
    pub logo_variant: String,
    pub logo_size: u32,
    pub logo_gap: u32,
    pub font_family: String,
    pub font_size: u32,
    pub divider_show: bool,
    pub divider_color: String,
    pub canvas_ratio: String,
    pub export_quality: u8,
}

// ── Entry point ──────────────────────────────────────────────────────────────

pub fn render_to_path(request: &ExportSinglePhotoRequest) -> Result<(), String> {
    let source = decode_image(Path::new(&request.photo_path))?;
    let exif = request
        .exif
        .clone()
        .unwrap_or_else(|| read_exif(Path::new(&request.photo_path)).into());
    let renderer = TextRenderer::load(&request.frame_params.font_family);
    let rendered = compose(source, &request.frame_params, &exif, &request.config, renderer.as_ref());
    save_image(&rendered, Path::new(&request.output_path), request.frame_params.export_quality)
}

// ── Composition ──────────────────────────────────────────────────────────────

pub fn compose(
    source: DynamicImage,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
    text: Option<&TextRenderer>,
) -> RgbaImage {
    let src_w = source.width();
    let top_margin = ((src_w as f32) * (frame.min_top_bottom_margin.max(0.0) / 100.0)).round() as u32;
    let text_gap = ((src_w as f32) * (frame.text_margin.max(0.0) / 100.0)).round().max(2.0) as u32;
    let extra_line_gap = ((text_gap as f32) * 1.8).round().max(8.0) as u32;

    let lines = build_lines(exif, config);
    let resolution_scale = src_w as f32 / 900.0;
    let primary_pt = frame.font_size as f32 * 1.18 * resolution_scale;
    let secondary_pt = frame.font_size as f32 * 0.96 * resolution_scale;

    let text_block_h = lines.iter().enumerate().fold(0u32, |acc, (index, _)| {
        let size = if index == 0 { primary_pt as u32 } else { secondary_pt as u32 };
        acc + size + if index == 0 { 0 } else { extra_line_gap }
    });

    let info_bar_h = frame.info_bar_height
        .max(text_block_h + ((top_margin as f32 * 1.2) as u32));
    let bar_h = info_bar_h + top_margin;

    // ── Canvas dimensions ─────────────────────────────────────────────────
    let img_ratio = frame.main_image_width_ratio.clamp(1.0, 100.0);
    let canvas_w = src_w;
    let canvas_ratio = parse_canvas_ratio(&frame.canvas_ratio, source.width(), source.height());
    let canvas_h = ((src_w as f32) / canvas_ratio).round().max(1.0) as u32;
    let bar_top = canvas_h.saturating_sub(bar_h);
    let avail_h = bar_top.saturating_sub(top_margin).max(1);
    let natural_w = ((src_w as f32) * (img_ratio / 100.0)).round().max(1.0);
    let natural_h = source.height() as f32 * natural_w / source.width() as f32;
    let fit = if natural_h > avail_h as f32 {
        avail_h as f32 / natural_h
    } else {
        1.0
    };
    let photo_w = (natural_w * fit).round() as u32;
    let photo_h = (natural_h * fit).round() as u32;
    let image_left = (canvas_w.saturating_sub(photo_w)) / 2;
    let image_top = top_margin + (avail_h.saturating_sub(photo_h)) / 2;

    let bg = parse_color(&frame.bg_color, &frame.background);
    let text_color = parse_color(&frame.text_color, "white");
    let divider_color = parse_color(&frame.divider_color, "white");
    let logo = load_logo_rgba(frame, exif, config);

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, bg);

    // ── Photo ────────────────────────────────────────────────────────────────
    let resized = source.resize_exact(photo_w, photo_h, image::imageops::FilterType::Lanczos3);
    let mut photo = resized.to_rgba8();
    let r = frame.inner_radius.min(photo_h / 2).min(photo_w / 2);
    apply_rounded_corners(&mut photo, r);

    if frame.shadow {
        draw_soft_shadow(
            &mut canvas,
            image_left,
            image_top,
            photo_w,
            photo_h,
            r,
            (frame.shadow_blur as f32 * resolution_scale).round() as u32,
            (frame.shadow_offset_y as f32 * resolution_scale).round() as u32,
            frame.shadow_opacity.min(100),
        );
    }

    overlay(&mut canvas, &photo, i64::from(image_left), i64::from(image_top));

    if frame.photo_border > 0 {
        draw_rounded_rect_stroke(
            &mut canvas,
            image_left,
            image_top,
            photo_w,
            photo_h,
            r,
            frame.photo_border,
            Rgba([255, 255, 255, 255]),
        );
    }

    // ── Info bar ─────────────────────────────────────────────────────────────
    if frame.divider_show {
        let margin = (24.0 * (src_w as f32 / 900.0)) as u32;
        for x in margin..canvas_w.saturating_sub(margin) {
            canvas.put_pixel(x, bar_top, divider_color);
        }
    }

    if lines.is_empty() {
        return canvas;
    }

    let bar_center_y = bar_top as f32 + info_bar_h as f32 / 2.0;
    let total_text_h = lines.iter().enumerate().fold(0f32, |acc, (index, _)| {
        let size = if index == 0 { primary_pt } else { secondary_pt };
        acc + size + if index == 0 { 0.0 } else { extra_line_gap as f32 }
    });
    let block_top = bar_center_y - total_text_h / 2.0;
    let mut cursor_y = block_top;

    for (i, line) in lines.iter().enumerate() {
        let is_first = i == 0;
        let pt = if is_first { primary_pt } else { secondary_pt };
        let bold = true;
        if i > 0 {
            cursor_y += extra_line_gap as f32;
        }
        let y = cursor_y;

        let text_w = if let Some(r) = text {
            r.measure(line, pt, bold)
        } else {
            (line.len() as f32) * pt * 0.6
        };

        let logo_inline = if is_first {
            logo.as_ref().map(|image| {
                let ratio = image.width() as f32 / image.height().max(1) as f32;
                let h = (frame.logo_size as f32 * resolution_scale * LOGO_VISUAL_SCALE).max(12.0);
                let w = h * ratio;
                (w, h)
            })
        } else {
            None
        };
        let inline_w = text_w
            + logo_inline
                .map(|(w, _)| w + frame.logo_gap as f32 * resolution_scale)
                .unwrap_or(0.0);

        let x = ((canvas_w as f32) - inline_w) / 2.0;

        if let (Some(logo_image), Some((_logo_w, logo_h))) = (logo.as_ref(), logo_inline) {
            let logo_x = x.round() as i64;
            let logo_y = (y + (pt - logo_h) / 2.0).round() as i64;
            overlay(&mut canvas, logo_image, logo_x, logo_y);
        }

        let text_x = x
            + logo_inline
                .map(|(w, _)| w + frame.logo_gap as f32 * resolution_scale)
                .unwrap_or(0.0);

        if let Some(r) = text {
            r.draw(&mut canvas, line, text_x, y, pt, bold, text_color);
        }
        cursor_y += pt;
    }

    canvas
}

fn parse_canvas_ratio(ratio: &str, source_w: u32, source_h: u32) -> f32 {
    if ratio == "auto" {
        return 3.0 / 2.0;
    }

    let parts: Vec<f32> = ratio.split(':').filter_map(|s| s.parse().ok()).collect();
    if parts.len() == 2 && parts[0] > 0.0 && parts[1] > 0.0 {
        return parts[0] / parts[1];
    }

    let _ = (source_w, source_h);
    3.0 / 2.0
}

// ── Text content ─────────────────────────────────────────────────────────────

fn build_lines(exif: &ExportExif, config: &ExportTemplateConfig) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();

    if config.show_camera {
        let cam = format_camera(exif);
        if !cam.is_empty() {
            lines.push(cam);
        }
    }
    if config.show_lens && !exif.lens.is_empty() {
        lines.push(clean_display_text(&exif.lens));
    }

    if config.show_params {
        let params: Vec<String> = [
            if exif.focal_length > 0.0 { format!("{}mm", exif.focal_length.round() as u32) } else { String::new() },
            if exif.aperture > 0.0 { format!("f/{:.1}", exif.aperture) } else { String::new() },
            exif.shutter_speed.clone(),
            if exif.iso > 0 { format!("ISO{}", exif.iso) } else { String::new() },
        ].into_iter().filter(|s| !s.is_empty()).collect();
        if !params.is_empty() {
            lines.push(params.join(" "));
        }
    }
    lines.into_iter().filter(|s| !s.is_empty()).collect()
}

fn format_camera(exif: &ExportExif) -> String {
    brand::normalize_model(&exif.camera.make, &exif.camera.model)
}

fn load_logo_rgba(
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
) -> Option<RgbaImage> {
    if !config.show_logo {
        return None;
    }

    let key = if frame.logo_key.trim().is_empty() {
        infer_logo_key(&exif.camera.make)?
    } else {
        frame.logo_key.trim().to_ascii_lowercase()
    };
    let path = resolve_logo_asset_path(&key, &frame.logo_variant)?;
    render_svg_logo(&path).ok()
}

fn infer_logo_key(make: &str) -> Option<String> {
    let normalized = brand::normalize_make(make).to_ascii_lowercase();
    match normalized.as_str() {
        "" => None,
        "lumix" => Some("panasonic".into()),
        "phase one" => Some("phaseone".into()),
        "osmo action" => Some("osmo-action".into()),
        other => Some(other.into()),
    }
}

fn resolve_logo_asset_path(key: &str, variant: &str) -> Option<PathBuf> {
    let base = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()?
        .join("public")
        .join("brand-logos");

    let candidates = [
        format!("{key}-{variant}.svg"),
        format!("{key}-original.svg"),
        format!("{key}-black.svg"),
        format!("{key}-white.svg"),
        format!("{key}-icon-original.svg"),
        format!("{key}-icon-black.svg"),
        format!("{key}-icon-white.svg"),
    ];

    for candidate in candidates {
        let path = base.join(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    if key == "panasonic" {
        return resolve_logo_asset_path("lumix", variant);
    }
    if key == "sony" {
        return resolve_logo_asset_path("sonyalpha", variant);
    }

    None
}

fn render_svg_logo(path: &Path) -> Result<RgbaImage, String> {
    let svg = std::fs::read(path).map_err(|e| format!("读取 Logo 失败：{e}"))?;
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_data(&svg, &options).map_err(|e| format!("解析 SVG 失败：{e}"))?;
    let size = tree.size().to_int_size();
    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or_else(|| "创建 Logo 画布失败".to_string())?;
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    RgbaImage::from_raw(size.width(), size.height(), pixmap.data().to_vec())
        .ok_or_else(|| "创建 Logo 位图失败".to_string())
}

fn clean_display_text(value: &str) -> String {
    value.trim().trim_matches('"').trim().to_string()
}

// ── Save ─────────────────────────────────────────────────────────────────────

fn save_image(image: &RgbaImage, path: &Path, quality: u8) -> Result<(), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_else(|| "png".into());

    let file = File::create(path).map_err(|e| format!("无法创建导出文件：{e}"))?;
    let mut w = BufWriter::new(file);
    let dynamic = DynamicImage::ImageRgba8(image.clone());
    let q = quality.clamp(60, 100);

    match ext.as_str() {
        "jpg" | "jpeg" => {
            JpegEncoder::new_with_quality(&mut w, q)
                .encode_image(&dynamic)
                .map_err(|e| format!("JPEG 导出失败：{e}"))?;
        }
        "webp" => {
            dynamic.write_to(&mut w, ImageFormat::WebP)
                .map_err(|e| format!("WebP 导出失败：{e}"))?;
        }
        _ => {
            dynamic.write_to(&mut w, ImageFormat::Png)
                .map_err(|e| format!("PNG 导出失败：{e}"))?;
        }
    }
    Ok(())
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

fn apply_rounded_corners(image: &mut RgbaImage, radius: u32) {
    if radius == 0 { return; }
    let (w, h) = (image.width() as i32, image.height() as i32);
    let r = radius as i32;
    let corners = [(r, r), (w - r - 1, r), (r, h - r - 1), (w - r - 1, h - r - 1)];
    for y in 0..h {
        for x in 0..w {
            if (x >= r && x < w - r) || (y >= r && y < h - r) { continue; }
            let inside = corners.iter().any(|&(cx, cy)| {
                let (dx, dy) = (x - cx, y - cy);
                dx * dx + dy * dy <= r * r
            });
            if !inside {
                image.get_pixel_mut(x as u32, y as u32).0[3] = 0;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn draw_rounded_rect_stroke(
    canvas: &mut RgbaImage,
    x: u32, y: u32, w: u32, h: u32, radius: u32, thickness: u32, color: Rgba<u8>,
) {
    for t in 0..thickness {
        let expand = t as i32;
        let sx = x as i32 - expand;
        let sy = y as i32 - expand;
        let sw = w + t * 2;
        let sh = h + t * 2;
        let sr = (radius + t).min(sh / 2).min(sw / 2);
        draw_rounded_rect_outline(canvas, sx, sy, sw as i32, sh as i32, sr as i32, color);
    }
}

fn draw_rounded_rect_outline(
    canvas: &mut RgbaImage, x: i32, y: i32, w: i32, h: i32, r: i32, color: Rgba<u8>,
) {
    let cw = canvas.width() as i32;
    let ch = canvas.height() as i32;
    let corners = [(x + r, y + r), (x + w - r - 1, y + r), (x + r, y + h - r - 1), (x + w - r - 1, y + h - r - 1)];
    for py in y.max(0)..(y + h).min(ch) {
        for px in x.max(0)..(x + w).min(cw) {
            let on_top = py == y;
            let on_bot = py == y + h - 1;
            let on_left = px == x;
            let on_right = px == x + w - 1;
            let edge = on_top || on_bot || on_left || on_right;
            if !edge { continue; }
            let in_rect = (px >= x + r && px < x + w - r) || (py >= y + r && py < y + h - r);
            let inside = in_rect || corners.iter().any(|&(cx, cy)| {
                let (dx, dy) = (px - cx, py - cy);
                dx * dx + dy * dy <= r * r
            });
            if inside {
                canvas.put_pixel(px as u32, py as u32, color);
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn draw_soft_shadow(
    canvas: &mut RgbaImage,
    x: u32, y: u32, width: u32, height: u32, radius: u32,
    blur: u32, offset_y: u32, opacity_pct: u32,
) {
    let layers = blur.clamp(1, 40);
    let base_alpha = ((opacity_pct as f32 / 100.0) * 180.0).round() as i32;
    let start_y = y.saturating_add(offset_y);
    for layer in 0..layers {
        let expand = layer;
        let alpha = ((base_alpha as f32) * (1.0 - layer as f32 / layers as f32)).round() as i32;
        if alpha <= 0 { continue; }
        let sx = x.saturating_sub(expand);
        let sy = start_y.saturating_sub(expand);
        let sw = width.saturating_add(expand * 2);
        let sh = height.saturating_add(expand * 2);
        let sr = radius.saturating_add(expand);
        draw_rounded_rect_alpha(canvas, sx, sy, sw, sh, sr, alpha as u8);
    }
}

fn draw_rounded_rect_alpha(
    canvas: &mut RgbaImage, x: u32, y: u32, w: u32, h: u32, radius: u32, alpha: u8,
) {
    if w == 0 || h == 0 || alpha == 0 { return; }
    let (cw, ch) = (canvas.width() as i32, canvas.height() as i32);
    let (rx, ry, rw, rh) = (x as i32, y as i32, w as i32, h as i32);
    let rr = radius.min(w / 2).min(h / 2) as i32;
    let corners = [(rx + rr, ry + rr), (rx + rw - rr - 1, ry + rr), (rx + rr, ry + rh - rr - 1), (rx + rw - rr - 1, ry + rh - rr - 1)];
    for py in ry.max(0)..(ry + rh).min(ch) {
        for px in rx.max(0)..(rx + rw).min(cw) {
            let in_rect = (px >= rx + rr && px < rx + rw - rr) || (py >= ry + rr && py < ry + rh - rr);
            let inside = in_rect || corners.iter().any(|&(cx, cy)| {
                let (dx, dy) = (px - cx, py - cy);
                dx * dx + dy * dy <= rr * rr
            });
            if inside {
                let pixel = canvas.get_pixel_mut(px as u32, py as u32);
                let a = alpha as f32 / 255.0;
                pixel.0[0] = ((pixel.0[0] as f32) * (1.0 - a)).round() as u8;
                pixel.0[1] = ((pixel.0[1] as f32) * (1.0 - a)).round() as u8;
                pixel.0[2] = ((pixel.0[2] as f32) * (1.0 - a)).round() as u8;
            }
        }
    }
}

fn parse_color(hex: &str, _background: &str) -> Rgba<u8> {
    let fallback = Rgba([255, 255, 255, 255]);
    let value = hex.trim_start_matches('#');
    if value.len() == 6 {
        let r = u8::from_str_radix(&value[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&value[2..4], 16).unwrap_or(255);
        let b = u8::from_str_radix(&value[4..6], 16).unwrap_or(255);
        return Rgba([r, g, b, 255]);
    }
    fallback
}
