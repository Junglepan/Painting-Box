use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect, fit_photo_in_area,
    format_camera, format_date, parse_color, resize_photo, ExportExif, ExportFrameParams,
    ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const LEICA_RED: Rgba<u8> = Rgba([226, 6, 18, 255]);
const BAR_HEIGHT_RATIO: f32 = 0.16;

pub(crate) fn compose_xiaomi_leica(
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

    let bar_h = if config.show_watermark {
        ((canvas_h as f32 * BAR_HEIGHT_RATIO).round() as u32).max((80.0 * rs) as u32)
    } else {
        0
    };

    let area_h = canvas_h.saturating_sub(bar_h);
    let (pw, ph, ox, oy) = fit_photo_in_area(canvas_w, area_h, src_w, src_h);
    let img_x = ox as i64;
    let img_y = oy as i64;

    let white = Rgba([255, 255, 255, 255]);
    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, white);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, img_x, img_y);

    if !config.show_watermark {
        return canvas;
    }

    let bar_top = canvas_h.saturating_sub(bar_h);
    let spec = watermark_layout_spec();
    let primary_pt =
        (frame.font_size as f32 * spec.primary_font_scale * 1.6).max(18.0 * rs) * rs / rs;
    let secondary_pt = (frame.font_size as f32 * spec.secondary_font_scale).max(11.0 * rs);

    // Red rule at very bottom
    fill_rect(&mut canvas, 0, (canvas_h - (3.0 * rs).round() as u32) as i64, canvas_w, (3.0 * rs).round() as u32, LEICA_RED);

    // Red vertical divider in center
    let cx = canvas_w / 2;
    let red_bar_h = (bar_h as f32 * 0.62).round() as u32;
    let red_y = bar_top + (bar_h - red_bar_h) / 2;
    fill_rect(&mut canvas, cx as i64 - (1.5 * rs) as i64, red_y as i64, (3.0 * rs).round() as u32, red_bar_h, LEICA_RED);

    let padding = ((canvas_w as f32 * 0.04).max(28.0 * rs)).round();

    let Some(rend) = text else { return canvas; };

    let ink = Rgba([26, 26, 26, 255]);
    let muted = Rgba([125, 125, 125, 255]);

    // Left column: camera + lens
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };

    let top_y = bar_top as f32 + bar_h as f32 * 0.45 - rend.line_height(primary_pt, true);
    let bot_y = bar_top as f32 + bar_h as f32 * 0.72 - rend.line_height(secondary_pt, false);

    if !camera.is_empty() {
        rend.draw(&mut canvas, &camera, padding, top_y, primary_pt, true, ink);
    }
    if !lens.is_empty() {
        rend.draw(&mut canvas, &lens, padding, bot_y, secondary_pt, false, muted);
    }

    // Right column: params + date
    let params = if config.show_params { build_params_line(exif, "  ") } else { String::new() };
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };

    if !params.is_empty() {
        let pw = rend.measure(&params, primary_pt, true);
        let x = canvas_w as f32 - padding - pw;
        rend.draw(&mut canvas, &params, x, top_y, primary_pt, true, ink);
    }
    if !date.is_empty() {
        let dw = rend.measure(&date, secondary_pt, false);
        let x = canvas_w as f32 - padding - dw;
        rend.draw(&mut canvas, &date, x, bot_y, secondary_pt, false, muted);
    }

    canvas
}
