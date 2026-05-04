use image::{DynamicImage, Rgba, RgbaImage};
use image::imageops::overlay;

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect, fit_photo_in_area,
    format_camera, format_date, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::text::TextRenderer;

const MARK_COLOR: Rgba<u8> = Rgba([10, 10, 10, 255]);
const META_COLOR: Rgba<u8> = Rgba([64, 64, 64, 255]);

pub(crate) fn compose_crop_marks(
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

    let margin = (canvas_w as f32 * 0.1).round() as u32;
    let area_w = canvas_w.saturating_sub(margin * 2);
    let area_h = canvas_h.saturating_sub(margin * 2);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let placed_x = margin + ox;
    let placed_y = margin + oy;

    let white = Rgba([255, 255, 255, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, white);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, placed_x as i64, placed_y as i64);

    if !config.show_watermark {
        return canvas;
    }

    let mark_len = (24.0 * rs).round() as u32;
    let mark_gap = (8.0 * rs).round() as u32;

    let lx = placed_x as i64 - mark_gap as i64;
    let rx = placed_x as i64 + pw as i64 + mark_gap as i64;
    let ty = placed_y as i64 - mark_gap as i64;
    let by = placed_y as i64 + ph as i64 + mark_gap as i64;

    // TL
    fill_rect(&mut canvas, lx - mark_len as i64, ty, mark_len, 1, MARK_COLOR);
    fill_rect(&mut canvas, lx, ty - mark_len as i64, 1, mark_len, MARK_COLOR);
    // TR
    fill_rect(&mut canvas, rx, ty, mark_len, 1, MARK_COLOR);
    fill_rect(&mut canvas, rx, ty - mark_len as i64, 1, mark_len, MARK_COLOR);
    // BL
    fill_rect(&mut canvas, lx - mark_len as i64, by, mark_len, 1, MARK_COLOR);
    fill_rect(&mut canvas, lx, by, 1, mark_len, MARK_COLOR);
    // BR
    fill_rect(&mut canvas, rx, by, mark_len, 1, MARK_COLOR);
    fill_rect(&mut canvas, rx, by, 1, mark_len, MARK_COLOR);

    let Some(rend) = text else { return canvas; };

    let swatch_w = ((pw as f32 * 0.04).round() as u32).max(1).min((24.0 * rs) as u32).max(4);
    let swatch_h = swatch_w;
    let swatch_gap = (3.0 * rs).round().max(1.0) as u32;
    let strip_y = by + mark_len as i64 + (8.0 * rs).round() as i64;

    let cmyk: [(Rgba<u8>, u32); 4] = [
        (Rgba([0, 176, 240, 255]), 0),
        (Rgba([232, 62, 140, 255]), 1),
        (Rgba([255, 230, 0, 255]), 2),
        (Rgba([10, 10, 10, 255]), 3),
    ];
    for (color, idx) in &cmyk {
        let sx = placed_x as i64 + *idx as i64 * (swatch_w as i64 + swatch_gap as i64);
        fill_rect(&mut canvas, sx, strip_y, swatch_w, swatch_h, *color);
    }

    let meta_pt = (frame.font_size as f32 - 1.0).max(10.0 * rs);
    let swatch_total_w = (cmyk.len() as u32) * (swatch_w + swatch_gap);
    let label_x = placed_x as f32 + swatch_total_w as f32 + 10.0 * rs;
    let label_y = strip_y as f32 + swatch_h as f32 / 2.0 - rend.line_height(meta_pt, false) / 2.0;

    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
    let left_label = if !camera.is_empty() {
        camera
    } else if !lens.is_empty() {
        lens
    } else {
        config.custom_lines.first().cloned().unwrap_or_default().trim().to_string()
    };
    if !left_label.is_empty() {
        rend.draw(&mut canvas, &left_label, label_x, label_y, meta_pt, false, META_COLOR);
    }

    let params = if config.show_params { build_params_line(exif, "  \u{00B7}  ") } else { String::new() };
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };
    let right_label = [params, date].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("    ");
    if !right_label.is_empty() {
        let rw = rend.measure(&right_label, meta_pt, false);
        let rx2 = placed_x as f32 + pw as f32 - rw;
        rend.draw(&mut canvas, &right_label, rx2, label_y, meta_pt, false, META_COLOR);
    }

    canvas
}
