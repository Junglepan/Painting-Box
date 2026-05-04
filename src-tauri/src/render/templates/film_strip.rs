use image::{
    imageops::{overlay, resize, FilterType},
    DynamicImage, Rgba, RgbaImage,
};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect,
    fill_rounded_rect_solid, fit_photo_in_area, format_camera, format_date, load_logo_rgba,
    parse_color, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const TOP_BAR_RATIO: f32 = 0.08;
const BOTTOM_BAR_RATIO: f32 = 0.13;
const SPROCKET_BAND_RATIO: f32 = 0.06;
const SPROCKET_COUNT: u32 = 10;

pub(crate) fn compose_film_strip(
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
    let band_w = (canvas_w as f32 * SPROCKET_BAND_RATIO).round() as u32;

    let area_w = canvas_w.saturating_sub(band_w * 2);
    let area_h = canvas_h.saturating_sub(top_bar_h + bottom_bar_h);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let img_x = (band_w + ox) as i64;
    let img_y = (top_bar_h + oy) as i64;

    let film_bg = Rgba([10, 10, 10, 255]);
    let hole_color = Rgba([247, 247, 240, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, film_bg);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, img_x, img_y);

    // Sprocket holes on both side bands
    let band_top = top_bar_h;
    let band_bottom = canvas_h.saturating_sub(bottom_bar_h);
    let band_h = band_bottom.saturating_sub(band_top);
    draw_sprockets(&mut canvas, 0, band_w, band_top, band_h, hole_color);
    draw_sprockets(&mut canvas, canvas_w.saturating_sub(band_w), band_w, band_top, band_h, hole_color);

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

    let Some(rend) = text else { return canvas; };

    // Top band: frame-number · camera/lens label
    {
        let frame_num = frame_number(&exif.taken_at);
        let cam = if config.show_camera { format_camera(exif) } else { String::new() };
        let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
        let cam_or_lens = if !cam.is_empty() { cam } else { lens };
        let parts: Vec<String> = [frame_num, cam_or_lens]
            .into_iter()
            .filter(|s| !s.is_empty())
            .collect();
        let top_label = parts.join("  \u{00B7}  ");
        if !top_label.is_empty() && top_bar_h as f32 >= primary_pt * 0.8 + 4.0 {
            let label_pt = (primary_pt * 0.82).max(9.0 * rs);
            let mut muted = text_color;
            muted.0[3] = (muted.0[3] as f32 * 0.8) as u8;
            let lx = (band_w as f32 + 16.0 * rs).max(28.0 * rs);
            let ly = top_bar_h as f32 / 2.0 - rend.line_height(label_pt, true) / 2.0;
            rend.draw(&mut canvas, &top_label, lx, ly, label_pt, true, muted);
        }
    }

    // Bottom band
    let bar_center_y = canvas_h as f32 - bottom_bar_h as f32 / 2.0;
    let margin = (band_w as f32 + 20.0 * rs).max(32.0 * rs);

    // Logo on left
    let logo = if config.show_logo { load_logo_rgba(frame, exif, config) } else { None };
    if let Some(ref logo_img) = logo {
        let logo_h = primary_pt * spec.logo_visual_scale;
        let logo_w = logo_h * (logo_img.width() as f32 / logo_img.height().max(1) as f32);
        let resized = resize(
            logo_img,
            logo_w.round().max(1.0) as u32,
            logo_h.round().max(1.0) as u32,
            FilterType::Lanczos3,
        );
        let ly = (bar_center_y - logo_h / 2.0).round() as i64;
        overlay(&mut canvas, &resized, margin.round() as i64, ly);
    }

    // Params on right
    if config.show_params {
        let params = build_params_line(exif, "  \u{00B7}  ");
        if !params.is_empty() {
            let pw = rend.measure(&params, secondary_pt, false);
            let x = canvas_w as f32 - margin - pw;
            let y = bar_center_y - rend.line_height(secondary_pt, false) * 0.55;
            rend.draw(&mut canvas, &params, x, y, secondary_pt, false, text_color);
        }
    }

    // Date/custom below params
    let mut detail_parts: Vec<String> = Vec::new();
    if config.show_date {
        let d = format_date(&exif.taken_at, &config.date_format);
        if !d.is_empty() { detail_parts.push(d); }
    }
    for line in &config.custom_lines {
        let t = line.trim().to_string();
        if !t.is_empty() { detail_parts.push(t); }
    }
    if !detail_parts.is_empty() {
        let detail_pt = (primary_pt * 0.82).max(9.0 * rs);
        let detail = detail_parts.join("  \u{00B7}  ");
        let dw = rend.measure(&detail, detail_pt, false);
        let x = canvas_w as f32 - margin - dw;
        let y = bar_center_y + rend.line_height(secondary_pt, false) * 0.55;
        let mut muted = text_color;
        muted.0[3] = (muted.0[3] as f32 * 0.7) as u8;
        rend.draw(&mut canvas, &detail, x, y, detail_pt, false, muted);
    }

    let _ = (fill_rect, clean_display_text);
    canvas
}

/// Pseudo frame number: trailing 2 digits of the seconds field of taken_at.
/// Mirrors the TS `frameNumber()` helper. Returns "— —" if no digits found.
fn frame_number(taken_at: &str) -> String {
    let trailing: String = taken_at.chars().rev().take_while(|c| c.is_ascii_digit()).collect();
    if trailing.is_empty() {
        return "\u{2014} \u{2014}".to_string();
    }
    let mut digits: String = trailing.chars().rev().collect();
    if digits.len() > 2 {
        digits = digits[digits.len() - 2..].to_string();
    } else if digits.len() < 2 {
        digits = format!("{:0>2}", digits);
    }
    digits
}

fn draw_sprockets(canvas: &mut RgbaImage, band_x: u32, band_w: u32, band_top: u32, band_h: u32, color: Rgba<u8>) {
    if band_h == 0 || SPROCKET_COUNT == 0 { return; }
    let hole_w = (band_w as f32 * 0.55).round() as u32;
    let hole_h = (band_h as f32 / SPROCKET_COUNT as f32 * 0.55).round() as u32;
    let radius = (hole_w.min(hole_h) as f32 * 0.25).round() as u32;
    let stride = band_h / SPROCKET_COUNT;

    for i in 0..SPROCKET_COUNT {
        let cy = band_top + stride * i + stride / 2;
        let cx = band_x + band_w / 2;
        let hx = cx.saturating_sub(hole_w / 2);
        let hy = cy.saturating_sub(hole_h / 2);
        fill_rounded_rect_solid(canvas, hx as i64, hy as i64, hole_w, hole_h, radius, color);
    }
}
