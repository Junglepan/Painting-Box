use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rounded_rect_solid,
    fit_photo_in_area, format_camera, format_date, parse_color, resize_photo, ExportExif,
    ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const FUJI_GREEN: Rgba<u8> = Rgba([0, 100, 63, 255]);
const FUJI_PAPER: Rgba<u8> = Rgba([245, 241, 231, 255]);
const FUJI_INK: Rgba<u8> = Rgba([22, 22, 22, 255]);
const FUJI_MUTED: Rgba<u8> = Rgba([90, 86, 80, 255]);

pub(crate) fn compose_fujifilm_classic(
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

    let side_margin = (canvas_w as f32 * 0.05).round() as u32;
    let top_margin = (canvas_h as f32 * 0.05).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.16).round() as u32).max((96.0 * rs) as u32)
    } else {
        top_margin
    };

    let area_w = canvas_w.saturating_sub(side_margin * 2);
    let area_h = canvas_h.saturating_sub(top_margin + caption_h);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let photo_x = (side_margin + ox) as i64;
    let photo_y = (top_margin + oy) as i64;
    let placed_x = side_margin + ox;
    let placed_y = top_margin + oy;

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, FUJI_PAPER);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, photo_x, photo_y);

    if !config.show_watermark {
        return canvas;
    }

    let Some(rend) = text else { return canvas; };

    let _ = watermark_layout_spec();
    // TS sizes: wordmarkSize = max(20, fontSize * 1.7); detail = max(11, fontSize); params = max(13, fontSize * 1.2)
    let wordmark_pt = (frame.font_size as f32 * 1.7).max(20.0) * rs;
    let detail_pt = (frame.font_size as f32).max(11.0) * rs;
    let params_pt = (frame.font_size as f32 * 1.2).max(13.0) * rs;
    let caption_gap = (canvas_h as f32 * 0.03).round();
    let caption_top = placed_y as f32 + ph as f32 + caption_gap;
    // TS uses alphabetic baseline; FUJIFILM baseline = caption_top + wordmark_pt * 0.85.
    let wordmark_baseline = caption_top + wordmark_pt * 0.85;
    let detail_gap = (frame.font_size as f32 * 1.6).max(20.0) * rs;
    let detail_baseline = wordmark_baseline + detail_gap;

    // Left: FUJIFILM wordmark
    rend.draw(
        &mut canvas,
        "FUJIFILM",
        placed_x as f32,
        wordmark_baseline - rend.ascent(wordmark_pt, true),
        wordmark_pt,
        true,
        FUJI_GREEN,
    );

    // Film simulation pill (first custom line or default)
    let sim_text = {
        let custom = config.custom_lines.first().cloned().unwrap_or_default();
        if custom.trim().is_empty() { "CLASSIC CHROME".to_string() } else { custom.trim().to_uppercase() }
    };
    let pill_pt = ((frame.font_size as f32) - 1.0).max(10.0) * rs;
    let sim_w = rend.measure(&sim_text, pill_pt, true);
    let pill_w = sim_w + pill_pt * 1.4;
    let pill_h = pill_pt * 1.9;
    let wordmark_w = rend.measure("FUJIFILM", wordmark_pt, true);
    let pill_x = placed_x as f32 + wordmark_w + pill_pt * 0.9;
    let pill_y = wordmark_baseline - pill_h * 0.78;
    fill_rounded_rect_solid(
        &mut canvas,
        pill_x as i64, pill_y as i64,
        pill_w as u32, pill_h as u32,
        (pill_h / 2.0) as u32,
        FUJI_GREEN,
    );
    let pill_text_x = pill_x + pill_w / 2.0 - sim_w / 2.0;
    let pill_text_y = pill_y + pill_h / 2.0 - rend.line_height(pill_pt, true) / 2.0;
    rend.draw(&mut canvas, &sim_text, pill_text_x, pill_text_y, pill_pt, true, Rgba([255, 255, 255, 255]));

    // Camera + lens below wordmark
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
    let detail: String = [camera, lens].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("  \u{00B7}  ");
    if !detail.is_empty() {
        let y = detail_baseline - rend.ascent(detail_pt, false);
        rend.draw(&mut canvas, &detail, placed_x as f32, y, detail_pt, false, FUJI_MUTED);
    }

    // Right: params + date
    let right_x = placed_x + pw;
    let params = if config.show_params { build_params_line(exif, "  /  ") } else { String::new() };
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };

    if !params.is_empty() {
        let pw_meas = rend.measure(&params, params_pt, true);
        let y = wordmark_baseline - rend.ascent(params_pt, true);
        rend.draw(&mut canvas, &params, right_x as f32 - pw_meas, y, params_pt, true, FUJI_INK);
    }
    if !date.is_empty() {
        let dw = rend.measure(&date, detail_pt, false);
        let y = detail_baseline - rend.ascent(detail_pt, false);
        rend.draw(&mut canvas, &date, right_x as f32 - dw, y, detail_pt, false, FUJI_MUTED);
    }

    let _ = parse_color;
    canvas
}
