use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect, fit_photo_in_area,
    format_camera, format_date, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

pub(crate) fn compose_swiss_grid(
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

    let side_gutter = (canvas_w as f32 * 0.06).round() as u32;
    let top_gutter = (canvas_h as f32 * 0.06).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.18).round() as u32).max((110.0 * rs) as u32)
    } else {
        0
    };
    let bottom_pad = (canvas_h as f32 * 0.04).round() as u32;

    let area_w = canvas_w.saturating_sub(side_gutter * 2);
    let area_h = canvas_h.saturating_sub(top_gutter + caption_h + bottom_pad);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let photo_x = (side_gutter + ox) as i64;
    let photo_y = (top_gutter + oy) as i64;
    let placed_x = side_gutter + ox;
    let placed_y = top_gutter + oy;

    let white = Rgba([255, 255, 255, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, white);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, photo_x, photo_y);

    if !config.show_watermark {
        return canvas;
    }

    let rule_color = Rgba([10, 10, 10, 255]);
    let ink = Rgba([10, 10, 10, 255]);
    let muted = Rgba([125, 125, 125, 255]);

    let _ = watermark_layout_spec();
    let base_pt = (frame.font_size as f32).max(11.0) * rs;
    let page_pt = ((frame.font_size as f32) - 2.0).max(9.0) * rs;

    // Rule below photo
    let rule_y = (placed_y + ph) as i64 + (canvas_h as f32 * 0.025).round() as i64;
    fill_rect(&mut canvas, placed_x as i64, rule_y, pw, 2, rule_color);

    let label_top = rule_y as f32 + (canvas_h as f32 * 0.025).round();

    let Some(rend) = text else { return canvas; };

    // Left: oversized headline — TS uses 800 weight (bold).
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
    let headline = if !camera.is_empty() {
        camera.to_uppercase()
    } else {
        config.custom_lines.first().cloned().unwrap_or_else(|| "PAINTING BOX".to_string()).to_uppercase()
    };
    let tagline = if !lens.is_empty() {
        lens
    } else {
        config.custom_lines.last().cloned().unwrap_or_default().trim().to_string()
    };
    let headline_pt = (canvas_w as f32 * 0.07).min(56.0 * rs);
    let headline_baseline = label_top + headline_pt * 0.85;
    rend.draw(
        &mut canvas,
        &headline,
        placed_x as f32,
        headline_baseline - rend.ascent(headline_pt, true),
        headline_pt,
        true,
        ink,
    );

    // Tagline: lens or last custom line, below headline.
    if !tagline.is_empty() {
        let tag_baseline = headline_baseline + base_pt * 1.6;
        let y = tag_baseline - rend.ascent(base_pt, false);
        rend.draw(&mut canvas, &tagline, placed_x as f32, y, base_pt, false, Rgba([64, 64, 64, 255]));
    }

    // Right: params + date — TS metaSize == base_pt; TS baselines at labelTop + metaSize*1.2 and +metaSize*1.5
    let right_x = placed_x + pw;
    let params = if config.show_params { build_params_line(exif, "  /  ") } else { String::new() };
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };
    let params_baseline = label_top + base_pt * 1.2;
    if !params.is_empty() {
        let w = rend.measure(&params, base_pt, false);
        let y = params_baseline - rend.ascent(base_pt, false);
        rend.draw(&mut canvas, &params, right_x as f32 - w, y, base_pt, false, ink);
    }
    if !date.is_empty() {
        let dw = rend.measure(&date, base_pt, false);
        let date_baseline = params_baseline + base_pt * 1.5;
        let y = date_baseline - rend.ascent(base_pt, false);
        rend.draw(&mut canvas, &date, right_x as f32 - dw, y, base_pt, false, muted);
    }

    // Page number — TS baseline at canvasH - canvasH*0.025
    let page = "01 / 01";
    let pw_meas = rend.measure(page, page_pt, false);
    let page_x = canvas_w as f32 - side_gutter as f32 - pw_meas;
    let page_baseline = canvas_h as f32 - (canvas_h as f32 * 0.025).round();
    let y = page_baseline - rend.ascent(page_pt, false);
    rend.draw(&mut canvas, page, page_x, y, page_pt, false, muted);

    canvas
}
