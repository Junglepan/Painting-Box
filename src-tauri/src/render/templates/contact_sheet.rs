use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, compute_canvas_size, fill_rect, fill_rounded_rect_solid, fit_photo_in_area,
    format_camera, format_date, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::text::TextRenderer;

const SHEET_BG: Rgba<u8> = Rgba([10, 10, 10, 255]);
const SHEET_INK: Rgba<u8> = Rgba([245, 245, 245, 255]);
const SHEET_MUTED: Rgba<u8> = Rgba([168, 168, 168, 255]);
const SHEET_FRAME: Rgba<u8> = Rgba([255, 255, 255, 255]);
const PERF_COLOR: Rgba<u8> = Rgba([245, 245, 245, 255]);

pub(crate) fn compose_contact_sheet(
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

    let perf_h = ((canvas_h as f32 * 0.045).round() as u32).max((18.0 * rs) as u32);
    let side_margin = (canvas_w as f32 * 0.07).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.14).round() as u32).max((78.0 * rs) as u32)
    } else {
        0
    };

    let area_x = side_margin;
    let area_y = perf_h + (canvas_h as f32 * 0.025).round() as u32;
    let area_w = canvas_w.saturating_sub(side_margin * 2);
    let area_h = canvas_h.saturating_sub(perf_h * 2 + caption_h + (canvas_h as f32 * 0.06).round() as u32);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let placed_x = area_x + ox;
    let placed_y = area_y + oy;

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, SHEET_BG);

    draw_perf_row(&mut canvas, 0, canvas_w, perf_h, rs);
    draw_perf_row(&mut canvas, canvas_h.saturating_sub(perf_h), canvas_w, perf_h, rs);

    let mat_pad = ((canvas_w as f32 * 0.005).round() as u32).max((3.0 * rs) as u32);
    fill_rect(
        &mut canvas,
        placed_x as i64 - mat_pad as i64,
        placed_y as i64 - mat_pad as i64,
        pw + mat_pad * 2,
        ph + mat_pad * 2,
        SHEET_FRAME,
    );

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, placed_x as i64, placed_y as i64);

    if !config.show_watermark {
        return canvas;
    }

    let Some(rend) = text else { return canvas; };

    let caption_top = placed_y as f32 + ph as f32 + (canvas_h as f32 * 0.035).round();
    let label_pt = (frame.font_size as f32 * 1.05).max(11.0 * rs);
    let label_y = caption_top;

    rend.draw(&mut canvas, "\u{2192} FRAME 24A", placed_x as f32, label_y, label_pt, true, SHEET_INK);

    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let subline = if !camera.is_empty() {
        camera
    } else {
        config.custom_lines.first().cloned().unwrap_or_default().trim().to_string()
    };
    if !subline.is_empty() {
        let sub_pt = (frame.font_size as f32).max(10.0 * rs);
        let sy = caption_top + (label_pt * 1.4).max(16.0 * rs);
        rend.draw(&mut canvas, &subline, placed_x as f32, sy, sub_pt, false, SHEET_MUTED);
    }

    let right_x = placed_x as f32 + pw as f32;
    let params = if config.show_params { build_params_line(exif, "  ") } else { String::new() };
    if !params.is_empty() {
        let pw_meas = rend.measure(&params, label_pt, true);
        rend.draw(&mut canvas, &params, right_x - pw_meas, label_y, label_pt, true, SHEET_INK);
    }
    if config.show_date {
        let date = format_date(&exif.taken_at, &config.date_format);
        if !date.is_empty() {
            let sub_pt = (frame.font_size as f32).max(10.0 * rs);
            let dw = rend.measure(&date, sub_pt, false);
            let dy = caption_top + (label_pt * 1.4).max(16.0 * rs);
            rend.draw(&mut canvas, &date, right_x - dw, dy, sub_pt, false, SHEET_MUTED);
        }
    }

    canvas
}

fn draw_perf_row(canvas: &mut RgbaImage, row_y: u32, canvas_w: u32, perf_h: u32, rs: f32) {
    let hole_h = (perf_h as f32 * 0.55).round() as u32;
    let hole_w = (perf_h as f32 * 0.85).round() as u32;
    let gap = (hole_w as f32 * 1.1).round() as u32;
    let total = hole_w + gap;
    if total == 0 { return; }
    let count = canvas_w / total;
    let offset = (canvas_w.saturating_sub(count * total) + gap) / 2;
    let hole_y = row_y + perf_h.saturating_sub(hole_h) / 2;
    let radius = ((hole_w.min(hole_h) as f32 * 0.2).round() as u32).max(1);
    let _ = rs;
    for i in 0..count {
        let hx = offset + i * total;
        fill_rounded_rect_solid(canvas, hx as i64, hole_y as i64, hole_w, hole_h, radius, PERF_COLOR);
    }
}
