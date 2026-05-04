use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    build_params_line, clean_display_text, compute_canvas_size, fill_rect, fit_photo_in_area,
    format_camera, format_date, resize_photo, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const PAPER_BLACK: Rgba<u8> = Rgba([13, 13, 13, 255]);
const PAPER_WHITE: Rgba<u8> = Rgba([245, 239, 225, 255]);
const PAPER_INK: Rgba<u8> = Rgba([26, 26, 26, 255]);
const PAPER_MUTED: Rgba<u8> = Rgba([102, 96, 88, 255]);
const PROOF_RED: Rgba<u8> = Rgba([178, 34, 34, 255]);

pub(crate) fn compose_darkroom_proof(
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

    let paper_x = (canvas_w as f32 * 0.04).round() as u32;
    let paper_y = (canvas_h as f32 * 0.04).round() as u32;
    let paper_w = canvas_w.saturating_sub(paper_x * 2);
    let paper_h = canvas_h.saturating_sub(paper_y * 2);

    let paper_pad_x = (canvas_w as f32 * 0.06).round() as u32;
    let paper_pad_top = (canvas_h as f32 * 0.06).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.14).round() as u32).max((76.0 * rs) as u32)
    } else {
        (canvas_h as f32 * 0.06).round() as u32
    };

    let area_x = paper_x + paper_pad_x;
    let area_y = paper_y + paper_pad_top;
    let area_w = paper_w.saturating_sub(paper_pad_x * 2);
    let area_h = paper_h.saturating_sub(paper_pad_top + caption_h);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let photo_x = (area_x + ox) as i64;
    let photo_y = (area_y + oy) as i64;
    let placed_x = area_x + ox;
    let placed_y = area_y + oy;

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, PAPER_BLACK);
    fill_rect(&mut canvas, paper_x as i64, paper_y as i64, paper_w, paper_h, PAPER_WHITE);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, photo_x, photo_y);

    if !config.show_watermark {
        return canvas;
    }

    let Some(rend) = text else { return canvas; };

    let spec = watermark_layout_spec();
    let line_pt = (frame.font_size as f32 * spec.secondary_font_scale).max(11.0 * rs);
    let caption_gap = (canvas_h as f32 * 0.025).round();
    let caption_top = placed_y as f32 + ph as f32 + caption_gap;

    // PROOF stamp: draw upright (no rotation - Rust image crate limitation)
    let stamp_pt = (canvas_w as f32 * 0.038).max(22.0 * rs);
    let stamp_y = caption_top + (canvas_h as f32 * 0.045).max(28.0 * rs);
    let stamp_text = "PROOF";
    let stamp_w = rend.measure(stamp_text, stamp_pt, true);
    let stamp_h = rend.line_height(stamp_pt, true);
    let box_pad_x = (6.0 * rs).round() as u32;
    let box_pad_y = (4.0 * rs).round() as u32;
    // Draw box outline
    let bx = placed_x as i64 - box_pad_x as i64;
    let by = (stamp_y - rend.ascent(stamp_pt, true) - box_pad_y as f32) as i64;
    let bw = stamp_w as u32 + box_pad_x * 2;
    let bh = stamp_h as u32 + box_pad_y * 2;
    draw_rect_outline(&mut canvas, bx, by, bw, bh, 2, PROOF_RED);
    rend.draw(&mut canvas, stamp_text, placed_x as f32, stamp_y - stamp_h, stamp_pt, true, PROOF_RED);

    // Right column: params, camera, date (typewriter style)
    let right_x = placed_x + pw;
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let lens = if config.show_lens { clean_display_text(&exif.lens) } else { String::new() };
    let cam_lens: String = [camera, lens].into_iter().filter(|s| !s.is_empty()).collect::<Vec<_>>().join("  \u{00B7}  ");

    let mut meta_lines: Vec<(String, bool)> = Vec::new();
    if config.show_params {
        let p = build_params_line(exif, "  ");
        if !p.is_empty() { meta_lines.push((p, true)); }
    }
    if !cam_lens.is_empty() { meta_lines.push((cam_lens, false)); }
    if config.show_date {
        let d = format_date(&exif.taken_at, &config.date_format);
        if !d.is_empty() { meta_lines.push((d, false)); }
    }
    for (i, (line, bold)) in meta_lines.iter().enumerate() {
        let y = caption_top + i as f32 * line_pt * 1.55;
        let w = rend.measure(line, line_pt, *bold);
        let x = right_x as f32 - w;
        let color = if i == 0 { PAPER_INK } else { PAPER_MUTED };
        rend.draw(&mut canvas, line, x, y, line_pt, *bold, color);
    }

    canvas
}

fn draw_rect_outline(canvas: &mut RgbaImage, x: i64, y: i64, w: u32, h: u32, thickness: u32, color: Rgba<u8>) {
    fill_rect(canvas, x, y, w, thickness, color);                          // top
    fill_rect(canvas, x, y + h as i64 - thickness as i64, w, thickness, color); // bottom
    fill_rect(canvas, x, y, thickness, h, color);                          // left
    fill_rect(canvas, x + w as i64 - thickness as i64, y, thickness, h, color); // right
}
