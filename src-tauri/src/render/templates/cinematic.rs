use image::{
    imageops::{overlay, resize, FilterType},
    DynamicImage, Rgba, RgbaImage,
};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect,
    fit_photo_in_area, format_camera, format_date, load_logo_rgba, parse_color,
    resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const TOP_BAR_RATIO: f32 = 0.13;
const BOTTOM_BAR_RATIO: f32 = 0.16;

pub(crate) fn compose_cinematic(
    source: DynamicImage,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
    text: Option<&TextRenderer>,
) -> RgbaImage {
    let src_w = source.width();
    let src_h = source.height();
    let (canvas_w, canvas_h) = compute_canvas_size(src_w, src_h, frame);
    let rs = src_w as f32 / 900.0;

    let top_bar_h = (canvas_h as f32 * TOP_BAR_RATIO).round() as u32;
    let bottom_bar_h = if config.show_watermark {
        (canvas_h as f32 * BOTTOM_BAR_RATIO).round() as u32
    } else {
        top_bar_h
    };

    let area_w = canvas_w;
    let area_h = canvas_h.saturating_sub(top_bar_h + bottom_bar_h);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let img_x = ox as i64;
    let img_y = (top_bar_h + oy) as i64;

    let black = Rgba([0, 0, 0, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, black);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, img_x, img_y);

    if !config.show_watermark {
        return canvas;
    }

    let text_color = parse_color(&frame.text_color, "white");
    let spec = watermark_layout_spec();
    let primary_pt =
        (frame.font_size as f32 * spec.primary_font_scale).max(spec.base_min_primary_font_size)
            * rs;
    let secondary_pt =
        (frame.font_size as f32 * spec.secondary_font_scale).max(spec.base_min_secondary_font_size)
            * rs;

    let bar_center_y = canvas_h as f32 - bottom_bar_h as f32 / 2.0;
    let margin = (32.0 * rs).round();

    let Some(rend) = text else { return canvas; };

    let lh = rend.line_height(primary_pt, true);
    let text_top_y = bar_center_y - lh / 2.0;

    // Left side: [logo] camera · lens
    let logo = if config.show_logo { load_logo_rgba(frame, exif, config) } else { None };
    let mut cursor_x = margin;

    if let Some(ref logo_img) = logo {
        let logo_h = primary_pt * spec.logo_visual_scale;
        let logo_w = logo_h * (logo_img.width() as f32 / logo_img.height().max(1) as f32);
        let lw = logo_w.round().max(1.0) as u32;
        let lh_px = logo_h.round().max(1.0) as u32;
        let resized = resize(logo_img, lw, lh_px, FilterType::Lanczos3);
        let ly = (bar_center_y - logo_h / 2.0).round() as i64;
        overlay(&mut canvas, &resized, cursor_x.round() as i64, ly);
        cursor_x += logo_w + frame.logo_gap as f32 * rs + 4.0 * rs;
    }

    let mut left_parts: Vec<String> = Vec::new();
    if config.show_camera {
        let cam = format_camera(exif);
        if !cam.is_empty() { left_parts.push(cam); }
    }
    if config.show_lens {
        let lens = clean_display_text(&exif.lens);
        if !lens.is_empty() { left_parts.push(lens); }
    }
    let left = left_parts.join("  \u{00B7}  ");
    if !left.is_empty() {
        rend.draw(&mut canvas, &left, cursor_x, text_top_y, primary_pt, true, text_color);
    }

    // Right side: params
    if config.show_params {
        let params = build_params_line(exif, "  \u{00B7}  ");
        if !params.is_empty() {
            let pw = rend.measure(&params, secondary_pt, false);
            let x = canvas_w as f32 - margin - pw;
            let y = bar_center_y - rend.line_height(secondary_pt, false) / 2.0;
            rend.draw(&mut canvas, &params, x, y, secondary_pt, false, text_color);
        }
    }

    // Extra row: date + custom lines (subtle, centered near bottom edge)
    let mut extras: Vec<String> = Vec::new();
    if config.show_date {
        let d = format_date(&exif.taken_at, &config.date_format);
        if !d.is_empty() { extras.push(d); }
    }
    for line in &config.custom_lines {
        let t = line.trim().to_string();
        if !t.is_empty() { extras.push(t); }
    }
    if !extras.is_empty() {
        let extra_pt = (primary_pt * 0.82).max(9.0 * rs);
        let extra_text = extras.join("  \u{00B7}  ");
        let ew = rend.measure(&extra_text, extra_pt, false);
        let ex = (canvas_w as f32 / 2.0 - ew / 2.0).max(0.0);
        let ey = canvas_h as f32 - (14.0 * rs);
        let mut muted = text_color;
        muted.0[3] = (muted.0[3] as f32 * 0.7) as u8;
        rend.draw(&mut canvas, &extra_text, ex, ey, extra_pt, false, muted);
    }

    let _ = fill_rect; // suppress unused warning if not used elsewhere
    canvas
}
