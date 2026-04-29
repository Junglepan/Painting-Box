use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    compute_canvas_size, fit_photo_in_area, format_date, resize_photo, ExportExif,
    ExportFrameParams, ExportTemplateConfig,
};
use crate::render::text::TextRenderer;

const LCD_ORANGE: Rgba<u8> = Rgba([255, 122, 0, 255]);

pub(crate) fn compose_date_stamp(
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

    let (pw, ph, ox, oy) = fit_photo_in_area(canvas_w, canvas_h, src_w, src_h);

    let black = Rgba([0, 0, 0, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, black);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, ox as i64, oy as i64);

    if !config.show_watermark {
        return canvas;
    }

    let date_str = if config.show_date && !exif.taken_at.is_empty() {
        let d = format_date(&exif.taken_at, &config.date_format);
        if d.is_empty() { format_date(&exif.taken_at, "YYYY-MM-DD") } else { d }
    } else {
        return canvas;
    };
    if date_str.is_empty() { return canvas; }

    let stamp = format_stamp(&date_str);
    let stamp_pt = ((canvas_w as f32 * 0.045 * rs / rs).max(28.0 * rs))
        .min(frame.font_size as f32 * 4.5 * rs);

    let Some(rend) = text else { return canvas; };

    let margin = ((canvas_w as f32 * 0.03).max(20.0 * rs)).round();
    let sw = rend.measure(&stamp, stamp_pt, true);
    let x = ox as f32 + pw as f32 - margin - sw;
    let y = oy as f32 + ph as f32 - margin - rend.line_height(stamp_pt, true);

    rend.draw(&mut canvas, &stamp, x, y, stamp_pt, true, LCD_ORANGE);

    canvas
}

fn format_stamp(input: &str) -> String {
    // Convert "2026-04-28" → "'26  4  28" for the vintage LCD look.
    let clean: String = input.chars().filter(|c| c.is_ascii_digit() || *c == '-' || *c == '/' || *c == '.').collect();
    let parts: Vec<&str> = if clean.contains('-') {
        clean.split('-').collect()
    } else if clean.contains('/') {
        clean.split('/').collect()
    } else {
        clean.split('.').collect()
    };
    if parts.len() >= 3 && parts[0].len() == 4 {
        let yy = &parts[0][2..4];
        let mm = parts[1].trim_start_matches('0');
        let dd = parts[2];
        return format!("'{yy}  {mm}  {dd}");
    }
    input.to_string()
}
