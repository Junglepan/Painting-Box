use image::{imageops::overlay, DynamicImage, Rgba, RgbaImage};

use crate::render::classic_bottom::{
    compute_canvas_size, fill_rect, fit_photo_in_area, format_camera, format_date, resize_photo,
    ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

const ALBUM_BG: Rgba<u8> = Rgba([237, 226, 204, 255]);
const ALBUM_INK: Rgba<u8> = Rgba([59, 48, 36, 255]);
const TRIANGLE_COLOR: Rgba<u8> = Rgba([36, 28, 20, 255]);
const PHOTO_PAPER: Rgba<u8> = Rgba([253, 250, 242, 255]);
const CAPTION_MUTED: Rgba<u8> = Rgba([90, 74, 54, 255]);

pub(crate) fn compose_photo_album(
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

    let side_margin = (canvas_w as f32 * 0.08).round() as u32;
    let top_margin = (canvas_h as f32 * 0.06).round() as u32;
    let bottom_pad = (canvas_h as f32 * 0.04).round() as u32;
    let caption_h = if config.show_watermark {
        ((canvas_h as f32 * 0.11).round() as u32).max((56.0 * rs) as u32)
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

    let mut canvas = RgbaImage::from_pixel(canvas_w, canvas_h, ALBUM_BG);

    // Photo paper background (with simple shadow approximation: slightly larger dark rect)
    let paper_pad = (6.0 * rs).round() as u32;
    let shadow_offset = (6.0 * rs).round() as u32;
    let shadow_color = Rgba([0, 0, 0, 40]);
    fill_rect(
        &mut canvas,
        placed_x as i64 - paper_pad as i64 + shadow_offset as i64,
        placed_y as i64 - paper_pad as i64 + shadow_offset as i64,
        pw + paper_pad * 2,
        ph + paper_pad * 2,
        shadow_color,
    );
    fill_rect(
        &mut canvas,
        placed_x as i64 - paper_pad as i64,
        placed_y as i64 - paper_pad as i64,
        pw + paper_pad * 2,
        ph + paper_pad * 2,
        PHOTO_PAPER,
    );

    let photo = resize_photo(source, pw, ph);
    overlay(&mut canvas, &photo, photo_x, photo_y);

    // Corner triangles
    let tri_size = ((pw.min(ph) as f32 * 0.075).round() as u32).max((28.0 * rs) as u32);
    draw_corner_triangle(&mut canvas, placed_x as i64, placed_y as i64, tri_size, rs, 0);
    draw_corner_triangle(&mut canvas, (placed_x + pw) as i64, placed_y as i64, tri_size, rs, 1);
    draw_corner_triangle(&mut canvas, placed_x as i64, (placed_y + ph) as i64, tri_size, rs, 2);
    draw_corner_triangle(&mut canvas, (placed_x + pw) as i64, (placed_y + ph) as i64, tri_size, rs, 3);

    if !config.show_watermark {
        return canvas;
    }

    let Some(rend) = text else { return canvas; };

    let spec = watermark_layout_spec();
    let primary_pt = (frame.font_size as f32 * spec.primary_font_scale * 1.4).max(15.0 * rs);
    let secondary_pt = (frame.font_size as f32 * spec.secondary_font_scale * 1.05).max(11.0 * rs);

    let caption_gap = (canvas_h as f32 * 0.04).round();
    let caption_y = placed_y as f32 + ph as f32 + paper_pad as f32 + caption_gap;
    let caption_center_y = caption_y + primary_pt / 2.0;

    // Left: custom line or camera (italic feel via bold=false)
    let camera = if config.show_camera { format_camera(exif) } else { String::new() };
    let left = config.custom_lines.first()
        .and_then(|l| if l.trim().is_empty() { None } else { Some(l.trim().to_string()) })
        .unwrap_or(camera);
    if !left.is_empty() {
        let y = caption_center_y - rend.line_height(primary_pt, false) / 2.0;
        rend.draw(&mut canvas, &left, placed_x as f32, y, primary_pt, false, ALBUM_INK);
    }

    // Right: date or second custom line
    let date = if config.show_date { format_date(&exif.taken_at, &config.date_format) } else { String::new() };
    let right = if !date.is_empty() { date } else {
        config.custom_lines.get(1).cloned().unwrap_or_default().trim().to_string()
    };
    if !right.is_empty() {
        let rw = rend.measure(&right, secondary_pt, false);
        let x = placed_x as f32 + pw as f32 - rw;
        let y = caption_center_y - rend.line_height(secondary_pt, false) / 2.0;
        rend.draw(&mut canvas, &right, x, y, secondary_pt, false, CAPTION_MUTED);
    }

    canvas
}

/// corner: 0=TL, 1=TR, 2=BL, 3=BR
fn draw_corner_triangle(canvas: &mut RgbaImage, x: i64, y: i64, size: u32, _rs: f32, corner: u8) {
    let s = size as i64;
    let cw = canvas.width() as i64;
    let ch = canvas.height() as i64;
    // The triangle vertices per corner
    let (ax, ay, bx, by, cx_p, cy_p) = match corner {
        0 => (x, y, x + s, y, x, y + s),         // TL
        1 => (x, y, x - s, y, x, y + s),         // TR
        2 => (x, y, x + s, y, x, y - s),         // BL
        _ => (x, y, x - s, y, x, y - s),         // BR
    };
    // Bounding box
    let min_x = ax.min(bx).min(cx_p).max(0);
    let max_x = ax.max(bx).max(cx_p).min(cw - 1);
    let min_y = ay.min(by).min(cy_p).max(0);
    let max_y = ay.max(by).max(cy_p).min(ch - 1);
    for py in min_y..=max_y {
        for px in min_x..=max_x {
            if point_in_triangle(px, py, ax, ay, bx, by, cx_p, cy_p) {
                canvas.put_pixel(px as u32, py as u32, TRIANGLE_COLOR);
            }
        }
    }
}

fn sign(ax: i64, ay: i64, bx: i64, by: i64, cx: i64, cy: i64) -> i64 {
    (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)
}

fn point_in_triangle(px: i64, py: i64, ax: i64, ay: i64, bx: i64, by: i64, cx: i64, cy: i64) -> bool {
    let d1 = sign(px, py, ax, ay, bx, by);
    let d2 = sign(px, py, bx, by, cx, cy);
    let d3 = sign(px, py, cx, cy, ax, ay);
    let has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    let has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    !(has_neg && has_pos)
}
