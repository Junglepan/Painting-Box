use image::{
    imageops::{overlay, resize, FilterType},
    DynamicImage, Rgba, RgbaImage,
};

use crate::render::classic_bottom::{
    apply_rounded_corners, average_luminance_regions, build_text_sample_regions,
    draw_rounded_rect_stroke, draw_soft_shadow, parse_color, resize_photo, resolve_readable_colors,
    sample_watermark_luminance, scaled_corner_padding, scaled_divider_horizontal_margin,
    ExportFrameParams, RenderLinePlan, RenderPlan,
};
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::text::TextRenderer;

pub(crate) fn compose_with_plan(
    source: DynamicImage,
    frame: &ExportFrameParams,
    text: Option<&TextRenderer>,
    template_kind: &str,
    plan: &RenderPlan,
    render_lines: &[String],
    logo: Option<&RgbaImage>,
) -> RgbaImage {
    let spec = watermark_layout_spec();
    let bg = parse_color(&frame.bg_color, &frame.background);
    let text_color = parse_color(&frame.text_color, "white");
    let divider_color = parse_color(&frame.divider_color, "white");
    let mut canvas = RgbaImage::from_pixel(plan.canvas_w, plan.canvas_h, bg);

    // ── Photo ────────────────────────────────────────────────────────────────
    let mut photo = resize_photo(source, plan.photo_w, plan.photo_h);
    let r = ((frame.inner_radius as f32 * plan.resolution_scale).round() as u32)
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
            (frame.shadow_blur as f32 * plan.resolution_scale).round() as u32,
            shadow_offset_y,
            frame.shadow_opacity.min(100),
        );
    }

    overlay(
        &mut canvas,
        &photo,
        i64::from(plan.image_left),
        i64::from(plan.image_top),
    );

    if frame.photo_border > 0 && frame.photo_border_style != "none" {
        let border = (frame.photo_border as f32 * plan.resolution_scale).round() as u32;
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

    if render_lines.is_empty() {
        return canvas;
    }
    let image_bottom = plan.image_top as f32 + plan.photo_h as f32;

    let sample_regions = build_text_sample_regions(plan, render_lines);
    let avg_luma = if sample_regions.is_empty() {
        sample_watermark_luminance(
            &canvas,
            template_kind,
            plan.bottom_bar_mode,
            plan.image_left as f32,
            plan.image_top as f32,
            plan.photo_w as f32,
            plan.photo_h as f32,
            plan.bar_top as f32,
            plan.canvas_h as f32,
            plan.block_top,
            plan.total_text_h,
            scaled_corner_padding(plan.resolution_scale),
        )
    } else {
        average_luminance_regions(&canvas, &sample_regions)
    };
    let (text_color, divider_color) = resolve_readable_colors(
        frame.auto_text_contrast,
        avg_luma,
        text_color,
        divider_color,
    );

    if frame.divider_show && plan.bottom_bar_mode {
        let divider_y = if plan.block_top > image_bottom {
            image_bottom + (plan.block_top - image_bottom) / 2.0
        } else {
            plan.bar_top as f32
        };
        let divider_y = divider_y
            .round()
            .clamp(0.0, plan.canvas_h.saturating_sub(1) as f32) as u32;
        let margin = scaled_divider_horizontal_margin(plan.canvas_w);
        for x in margin..plan.canvas_w.saturating_sub(margin) {
            canvas.put_pixel(x, divider_y, divider_color);
        }
    }

    let mut cursor_y = plan.block_top;

    for (index, line) in render_lines.iter().enumerate() {
        if index > 0 {
            cursor_y += plan.extra_line_gap as f32;
        }
        let y = cursor_y;
        let line_plan: &RenderLinePlan = &plan.line_plans[index];
        let text_baseline = y + line_plan.text_ascent;

        if let (Some(logo_image), Some((logo_w, logo_h))) = (logo, line_plan.logo_inline) {
            let logo_x = line_plan.inline_x.round() as i64;
            let logo_y = (text_baseline + line_plan.pt * spec.logo_baseline_offset_ratio - logo_h)
                .round() as i64;
            let target_w = logo_w.round().max(1.0) as u32;
            let target_h = logo_h.round().max(1.0) as u32;
            let resized_logo = resize(logo_image, target_w, target_h, FilterType::Lanczos3);
            overlay(&mut canvas, &resized_logo, logo_x, logo_y);
        }

        let text_x = line_plan.inline_x
            + line_plan
                .logo_inline
                .map(|(w, _)| w + line_plan.inline_gap)
                .unwrap_or(0.0);

        if !line.is_empty() {
            if let Some(r) = text {
                r.draw(&mut canvas, line, text_x, y, line_plan.pt, true, text_color);
            }
        }
        cursor_y += line_plan.line_height;
    }

    canvas
}
