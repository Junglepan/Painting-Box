use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fit_photo_in_area, format_camera,
    format_date, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const HASSY_BG: Rgba<u8> = Rgba([10, 10, 10, 255]);
const HASSY_ORANGE: Rgba<u8> = Rgba([255, 138, 0, 255]);
const HASSY_INK: Rgba<u8> = Rgba([245, 245, 245, 255]);
const HASSY_MUTED: Rgba<u8> = Rgba([154, 149, 140, 255]);

pub(crate) fn compose_hasselblad(
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

    let side_margin = (canvas_w as f32 * 0.04).round() as u32;
    let top_margin = (canvas_h as f32 * 0.04).round() as u32;
    let bottom_pad = (canvas_h as f32 * 0.04).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.14).round() as u32).max((96.0 * rs) as u32)
    } else {
        0
    };

    let area_w = canvas_w.saturating_sub(side_margin * 2);
    let area_h = canvas_h.saturating_sub(top_margin + caption_h + bottom_pad);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let photo_x = (side_margin + ox) as i64;
    let photo_y = (top_margin + oy) as i64;
    let placed_x = side_margin + ox;
    let placed_y = top_margin + oy;

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, HASSY_BG);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, photo_x, photo_y);

    if !config.show_watermark {
        return canvas;
    }

    let Some(rend) = text else { return canvas; };

    let spec = watermark_layout_spec();
    let word_pt = ((canvas_w as f32 * 0.034).max(20.0)) * rs;
    let detail_pt = (frame.font_size as f32 * spec.secondary_font_scale).max(11.0 * rs);
    let caption_top = placed_y as f32 + ph as f32 + (canvas_h as f32 * 0.025).round();
    let word_baseline = caption_top + word_pt * 0.9;

    // HASSELBLAD with letter spacing
    let spacing = word_pt * 0.18;
    draw_spaced_text(&mut canvas, rend, "HASSELBLAD", placed_x as f32, word_baseline - rend.ascent(word_pt, true) + rend.line_height(word_pt, true) * 0.1, word_pt, spacing, HASSY_ORANGE);

    // Camera + lens subline
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
    let subline: String = [camera, lens].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("  \u{00B7}  ");
    if !subline.is_empty() {
        let sub_y = word_baseline + (detail_pt * 1.6).max(20.0 * rs);
        rend.draw(&mut canvas, &subline, placed_x as f32, sub_y - rend.line_height(detail_pt, false), detail_pt, false, HASSY_MUTED);
    }

    // Right: params + date
    let right_x = placed_x + pw;
    let params_pt = (frame.font_size as f32 * spec.secondary_font_scale * 1.2).max(13.0 * rs);
    let params = if config.show_params { build_params_line(exif, "  /  ") } else { String::new() };
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };

    if !params.is_empty() {
        let pw_meas = rend.measure(&params, params_pt, false);
        let py = word_baseline - rend.line_height(params_pt, false);
        rend.draw(&mut canvas, &params, right_x as f32 - pw_meas, py, params_pt, false, HASSY_INK);
    }
    if !date.is_empty() {
        let dw = rend.measure(&date, detail_pt, false);
        let dy = word_baseline + (detail_pt * 1.6).max(20.0 * rs) - rend.line_height(detail_pt, false);
        rend.draw(&mut canvas, &date, right_x as f32 - dw, dy, detail_pt, false, HASSY_MUTED);
    }

    canvas
}

fn draw_spaced_text(
    canvas: &mut RgbaImage,
    rend: &TextRenderer,
    text: &str,
    mut x: f32,
    y: f32,
    pt: f32,
    spacing: f32,
    color: Rgba<u8>,
) {
    for ch in text.chars() {
        let s = ch.to_string();
        rend.draw(canvas, &s, x, y, pt, true, color);
        x += rend.measure(&s, pt, true) + spacing;
    }
}
