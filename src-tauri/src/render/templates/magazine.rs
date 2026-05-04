use image::{
    imageops::{overlay, resize, FilterType},
    DynamicImage, Rgba, RgbaImage,
};

use crate::render::classic_bottom::{
    apply_rounded_corners, average_luminance, build_render_lines, build_render_plan,
    clean_display_text, draw_rounded_rect_stroke, draw_soft_shadow, format_camera, format_date,
    load_logo_rgba, parse_color, resize_photo, resolve_readable_colors, ExportExif,
    ExportFrameParams, ExportTemplateConfig,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

pub(crate) fn compose_magazine(
    source: DynamicImage,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
    text: Option<&TextRenderer>,
) -> RgbaImage {
    let src_w = source.width();
    let src_h = source.height();
    let rs = src_w as f32 / 900.0;

    let (left_lines, right_items) = build_magazine_columns(exif, config);
    let logo = if config.show_watermark && config.show_logo {
        load_logo_rgba(frame, exif, config)
    } else {
        None
    };

    let flat_lines: Vec<String> = left_lines.iter().chain(right_items.iter()).cloned().collect();
    let render_lines_for_plan = if config.show_watermark {
        build_render_lines(flat_lines, logo.is_some())
    } else {
        Vec::new()
    };
    let plan = build_render_plan(
        src_w,
        src_h,
        frame,
        "magazine",
        &render_lines_for_plan,
        text,
        logo.as_ref().map(|img| img.width() as f32 / img.height().max(1) as f32),
        config.show_watermark,
    );

    let bg = parse_color(&frame.bg_color, &frame.background);
    let mut canvas = RgbaImage::from_pixel(plan.canvas_w, plan.canvas_h, bg);

    let mut photo = resize_photo(source, plan.photo_w, plan.photo_h);
    let r = ((frame.inner_radius as f32 * rs).round() as u32)
        .min(plan.photo_h / 2)
        .min(plan.photo_w / 2);
    apply_rounded_corners(&mut photo, r);

    if frame.shadow {
        let shadow_offset_y =
            ((plan.photo_h as f32) * (frame.shadow_offset_y.max(0.0) / 100.0)).round() as u32;
        draw_soft_shadow(
            &mut canvas,
            plan.image_left,
            plan.image_top,
            plan.photo_w,
            plan.photo_h,
            r,
            (frame.shadow_blur as f32 * rs).round() as u32,
            shadow_offset_y,
            frame.shadow_opacity.min(100),
        );
    }
    overlay(&mut canvas, &photo, i64::from(plan.image_left), i64::from(plan.image_top));

    if frame.photo_border > 0 && frame.photo_border_style != "none" {
        let border = (frame.photo_border as f32 * rs).round() as u32;
        let border_color = if frame.photo_border_color.is_empty() {
            Rgba([255, 255, 255, 255])
        } else {
            parse_color(&frame.photo_border_color, "white")
        };
        draw_rounded_rect_stroke(
            &mut canvas,
            plan.image_left,
            plan.image_top,
            plan.photo_w,
            plan.photo_h,
            r,
            border,
            border_color,
        );
    }

    if !config.show_watermark || plan.canvas_h <= plan.bar_top {
        return canvas;
    }

    let spec = watermark_layout_spec();
    let primary_pt = (frame.font_size as f32 * spec.primary_font_scale)
        .max(spec.base_min_primary_font_size) * rs;
    let secondary_pt = (frame.font_size as f32 * spec.secondary_font_scale)
        .max(spec.base_min_secondary_font_size) * rs;

    let text_color = parse_color(&frame.text_color, "white");
    let divider_color = parse_color(&frame.divider_color, "white");

    let bar_top = plan.bar_top;
    let avg_luma = average_luminance(&canvas, 0, bar_top, plan.canvas_w, plan.canvas_h - bar_top);
    let (text_color, divider_color) =
        resolve_readable_colors(frame.auto_text_contrast, avg_luma, text_color, divider_color);

    let side_margin = (plan.canvas_w as f32 * 0.044).round() as u32;
    let col_inner_pad = (16.0 * rs).round();
    let divider_x = plan.canvas_w / 2;
    let col_gap = (24.0 * rs).round();
    let left_x = side_margin as f32 + col_inner_pad;
    let left_end = divider_x as f32 - col_gap / 2.0;
    let right_start = divider_x as f32 + col_gap / 2.0;
    let right_x = plan.canvas_w as f32 - side_margin as f32 - col_inner_pad;
    let bar_center_y = bar_top as f32 + (plan.canvas_h - bar_top) as f32 / 2.0;

    if frame.divider_show && !left_lines.is_empty() && !right_items.is_empty() {
        let inset = ((plan.canvas_h - bar_top) as f32 * 0.22).round() as u32;
        for y in (bar_top + inset)..(plan.canvas_h.saturating_sub(inset)) {
            if divider_x < plan.canvas_w {
                canvas.put_pixel(divider_x, y, divider_color);
            }
        }
    }

    let primary = left_lines.first().cloned().unwrap_or_default();
    let secondary = left_lines.get(1).cloned();

    let logo_ratio = logo.as_ref().map(|img| img.width() as f32 / img.height().max(1) as f32);
    let logo_target_h = primary_pt * spec.logo_visual_scale;
    let logo_w = logo_ratio.map(|ratio| logo_target_h * ratio).unwrap_or(0.0);
    let logo_gap = if logo.is_some() && !primary.is_empty() {
        frame.logo_gap as f32 * rs
    } else {
        0.0
    };

    let line_gap = 6.0 * rs;
    let (primary_ascent, primary_line_h, secondary_ascent, secondary_line_h) = text
        .map(|r| {
            (
                r.ascent(primary_pt, true),
                r.line_height(primary_pt, true),
                r.ascent(secondary_pt, false),
                r.line_height(secondary_pt, false),
            )
        })
        .unwrap_or((primary_pt * 0.8, primary_pt, secondary_pt * 0.8, secondary_pt));

    let (primary_y, secondary_y_opt) = if secondary.is_some() {
        let total_h = primary_line_h + line_gap + secondary_line_h;
        let block_top = bar_center_y - total_h / 2.0;
        (block_top, Some(block_top + primary_line_h + line_gap))
    } else {
        (bar_center_y - primary_line_h / 2.0, None)
    };

    let primary_baseline = primary_y + primary_ascent;

    if let Some(logo_img) = &logo {
        let logo_draw_w = (logo_w.round().max(1.0)) as u32;
        let logo_draw_h = (logo_target_h.round().max(1.0)) as u32;
        let resized = resize(logo_img, logo_draw_w, logo_draw_h, FilterType::Lanczos3);
        let logo_x = left_x.round() as i64;
        let logo_y = (primary_baseline + primary_pt * spec.logo_baseline_offset_ratio - logo_target_h)
            .round() as i64;
        overlay(&mut canvas, &resized, logo_x, logo_y);
    }

    let text_left_x = left_x + logo_w + logo_gap;

    if let Some(rend) = text {
        if !primary.is_empty() {
            let avail = (left_end - text_left_x).max(0.0);
            let clipped = clip_text(rend, &primary, avail, primary_pt, true);
            rend.draw(&mut canvas, &clipped, text_left_x, primary_y, primary_pt, true, text_color);
        }
        if let (Some(sec), Some(sec_y)) = (&secondary, secondary_y_opt) {
            let avail = (right_x - left_x).max(0.0);
            let clipped = clip_text(rend, sec, avail, secondary_pt, false);
            rend.draw(&mut canvas, &clipped, left_x, sec_y, secondary_pt, false, text_color);
        }
    }

    if let Some(rend) = text {
        if !right_items.is_empty() {
            let sep = "  \u{00B7}  ";
            let single = right_items.join(sep);
            let available = right_x - right_start;
            let single_w = rend.measure(&single, secondary_pt, true);

            if single_w <= available {
                let y = bar_center_y - secondary_line_h / 2.0;
                rend.draw(&mut canvas, &single, right_x - single_w, y, secondary_pt, true, text_color);
            } else {
                let mid = right_items.len().div_ceil(2);
                let row1 = right_items[..mid].join(sep);
                let row2 = right_items[mid..].join(sep);
                let total_h = secondary_line_h * 2.0 + line_gap;
                let block_top = bar_center_y - total_h / 2.0;
                let row2_y = block_top + secondary_line_h + line_gap;
                let c1 = clip_text(rend, &row1, available, secondary_pt, true);
                let c2 = clip_text(rend, &row2, available, secondary_pt, true);
                let w1 = rend.measure(&c1, secondary_pt, true).min(available);
                let w2 = rend.measure(&c2, secondary_pt, true).min(available);
                rend.draw(&mut canvas, &c1, right_x - w1, block_top, secondary_pt, true, text_color);
                rend.draw(&mut canvas, &c2, right_x - w2, row2_y, secondary_pt, true, text_color);
            }
        }
    }

    let _ = secondary_ascent;

    canvas
}

fn build_magazine_columns(
    exif: &ExportExif,
    config: &ExportTemplateConfig,
) -> (Vec<String>, Vec<String>) {
    let mut left: Vec<String> = Vec::new();
    let mut right: Vec<String> = Vec::new();

    if config.show_camera {
        let cam = format_camera(exif);
        if !cam.is_empty() {
            left.push(cam);
        }
    }
    if config.show_lens {
        let lens = clean_display_text(&exif.lens);
        if !lens.is_empty() {
            left.push(lens);
        }
    }
    for line in &config.custom_lines {
        let t = line.trim().to_string();
        if !t.is_empty() {
            left.push(t);
        }
    }

    if config.show_params {
        let items: Vec<String> = [
            if exif.focal_length > 0.0 {
                format!("{}mm", exif.focal_length.round() as u32)
            } else {
                String::new()
            },
            if exif.aperture > 0.0 {
                format!("f/{:.1}", exif.aperture)
            } else {
                String::new()
            },
            exif.shutter_speed.clone(),
            if exif.iso > 0 {
                format!("ISO {}", exif.iso)
            } else {
                String::new()
            },
        ]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect();
        right.extend(items);
    }
    if config.show_date {
        let date = format_date(&exif.taken_at, &config.date_format);
        if !date.is_empty() {
            right.push(date);
        }
    }

    (left, right)
}

fn clip_text(r: &TextRenderer, text: &str, max_width: f32, size: f32, bold: bool) -> String {
    if max_width <= 0.0 || text.is_empty() {
        return String::new();
    }
    if r.measure(text, size, bold) <= max_width {
        return text.to_string();
    }
    let ellipsis = "\u{2026}";
    let mut end = text.chars().count();
    while end > 0 {
        let s: String = text.chars().take(end).collect();
        let candidate = format!("{}{}", s, ellipsis);
        if r.measure(&candidate, size, bold) <= max_width {
            return candidate;
        }
        end -= 1;
    }
    ellipsis.to_string()
}
