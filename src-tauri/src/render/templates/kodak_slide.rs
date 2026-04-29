use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    compute_canvas_size, fill_rect, fit_photo_in_area, format_camera, format_date, resize_photo,
    ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::text::TextRenderer;

const SLIDE_PAPER: Rgba<u8> = Rgba([245, 243, 237, 255]);
const SLIDE_FRAME: Rgba<u8> = Rgba([250, 250, 246, 255]);
const SLIDE_SHADOW: Rgba<u8> = Rgba([0, 0, 0, 41]);
const SLIDE_INK: Rgba<u8> = Rgba([26, 26, 26, 255]);
const KODAK_RED: Rgba<u8> = Rgba([203, 31, 39, 255]);
const KODAK_YELLOW: Rgba<u8> = Rgba([255, 206, 0, 255]);
const KODAK_WHITE: Rgba<u8> = Rgba([255, 255, 255, 255]);

pub(crate) fn compose_kodak_slide(
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

    let side_frame = (canvas_w as f32 * 0.05).round() as u32;
    let top_frame = (canvas_h as f32 * 0.07).round() as u32;
    let bottom_frame = if config.show_watermark {
        ((canvas_h as f32 * 0.16).round() as u32).max((72.0 * rs) as u32)
    } else {
        top_frame
    };

    let slide_x = (canvas_w as f32 * 0.06).round() as u32;
    let slide_y = (canvas_h as f32 * 0.05).round() as u32;
    let slide_w = canvas_w.saturating_sub(slide_x * 2);
    let slide_h = canvas_h.saturating_sub(slide_y * 2);

    let area_x = slide_x + side_frame;
    let area_y = slide_y + top_frame;
    let area_w = slide_w.saturating_sub(side_frame * 2);
    let area_h = slide_h.saturating_sub(top_frame + bottom_frame);
    let (pw, ph, ox, oy) = fit_photo_in_area(area_w, area_h, src_w, src_h);
    let placed_x = area_x + ox;
    let placed_y = area_y + oy;

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, SLIDE_PAPER);

    let shadow_offset = (4.0 * rs).round() as i64;
    fill_rect(&mut canvas, slide_x as i64 + shadow_offset, slide_y as i64 + shadow_offset, slide_w, slide_h, SLIDE_SHADOW);
    fill_rect(&mut canvas, slide_x as i64, slide_y as i64, slide_w, slide_h, SLIDE_FRAME);

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, placed_x as i64, placed_y as i64);

    if !config.show_watermark {
        return canvas;
    }

    // 1px black aperture cutout border around the photo (slide-mount feel).
    let stroke = (1.0 * rs).round() as u32;
    let sw = stroke.max(1);
    fill_rect(&mut canvas, placed_x as i64, placed_y as i64 - sw as i64, pw, sw, SLIDE_INK);
    fill_rect(&mut canvas, placed_x as i64, (placed_y + ph) as i64, pw, sw, SLIDE_INK);
    fill_rect(&mut canvas, placed_x as i64 - sw as i64, placed_y as i64 - sw as i64, sw, ph + sw * 2, SLIDE_INK);
    fill_rect(&mut canvas, (placed_x + pw) as i64, placed_y as i64 - sw as i64, sw, ph + sw * 2, SLIDE_INK);

    let Some(rend) = text else { return canvas; };

    let stripe_top = placed_y as f32 + ph as f32 + (canvas_h as f32 * 0.025).round();
    let stripe_h = ((canvas_h as f32 * 0.04).round() as u32).max((22.0 * rs) as u32);
    let stripe_x = area_x;
    let stripe_w = area_w;

    fill_rect(&mut canvas, stripe_x as i64, stripe_top as i64, stripe_w, stripe_h, KODAK_RED);
    fill_rect(&mut canvas, stripe_x as i64, stripe_top as i64, stripe_w, 2, KODAK_YELLOW);

    let word_pt = (frame.font_size as f32 * 1.1).max(11.0 * rs);
    let text_y = stripe_top + stripe_h as f32 / 2.0 - rend.line_height(word_pt, true) / 2.0;
    let pad = stripe_h as f32 * 0.5;

    rend.draw(&mut canvas, "KODACHROME 64", stripe_x as f32 + pad, text_y, word_pt, true, KODAK_WHITE);

    if config.show_date {
        let date = format_date(&exif.taken_at, &config.date_format);
        if !date.is_empty() {
            let dw = rend.measure(&date, word_pt, false);
            let x = stripe_x as f32 + stripe_w as f32 - pad - dw;
            rend.draw(&mut canvas, &date, x, text_y, word_pt, false, KODAK_WHITE);
        }
    }

    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let subline = if !camera.is_empty() {
        camera
    } else {
        config.custom_lines.first().cloned().unwrap_or_default().trim().to_string()
    };
    if !subline.is_empty() {
        let sub_pt = (frame.font_size as f32).max(10.0 * rs);
        let sw = rend.measure(&subline, sub_pt, false);
        let sx = stripe_x as f32 + stripe_w as f32 / 2.0 - sw / 2.0;
        let sy = stripe_top + stripe_h as f32 + (14.0 * rs).max(frame.font_size as f32);
        rend.draw(&mut canvas, &subline, sx, sy, sub_pt, false, SLIDE_INK);
    }

    canvas
}
