use std::{
    collections::HashMap,
    fs::File,
    io::BufWriter,
    path::Path,
    sync::{Mutex, OnceLock},
};

use image::{
    imageops::{overlay, resize, FilterType},
    DynamicImage, ImageFormat, Rgba, RgbaImage,
};
use resvg::{tiny_skia, usvg};
use serde::Deserialize;

use crate::commands::photos::ExportSinglePhotoRequest;
use crate::exif::{brand, read_exif, CameraInfo, ExifData, GpsInfo};
use crate::images::decode_image;
use crate::render::layout_spec::watermark_layout_spec;
use crate::render::logo_assets::embedded_logos;
use crate::render::text::TextRenderer;

// ── EXIF types (deserialized from frontend) ─────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportExif {
    pub camera: ExportCamera,
    pub lens: String,
    pub iso: u32,
    pub aperture: f64,
    pub shutter_speed: String,
    pub focal_length: f64,
    pub taken_at: String,
    pub gps: Option<ExportGps>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportCamera {
    pub make: String,
    pub model: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExportGps {
    pub lat: f64,
    pub lng: f64,
}

impl From<ExifData> for ExportExif {
    fn from(v: ExifData) -> Self {
        Self {
            camera: ExportCamera::from(v.camera),
            lens: v.lens,
            iso: v.iso,
            aperture: v.aperture,
            shutter_speed: v.shutter_speed,
            focal_length: v.focal_length,
            taken_at: v.taken_at,
            gps: v.gps.map(ExportGps::from),
        }
    }
}

impl From<CameraInfo> for ExportCamera {
    fn from(v: CameraInfo) -> Self {
        Self {
            make: v.make,
            model: v.model,
        }
    }
}

impl From<GpsInfo> for ExportGps {
    fn from(v: GpsInfo) -> Self {
        Self {
            lat: v.lat,
            lng: v.lng,
        }
    }
}

// ── Frame / config types ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTemplateConfig {
    pub show_watermark: bool,
    pub show_logo: bool,
    pub show_camera: bool,
    pub show_lens: bool,
    pub show_params: bool,
    pub watermark_template: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFrameParams {
    pub info_bar_height: u32,
    pub main_image_width_ratio: f32,
    pub min_top_bottom_margin: f32,
    pub text_margin: f32,
    pub watermark_top_padding: f32,
    pub watermark_bottom_padding: f32,
    pub inner_radius: u32,
    pub outer_radius: u32,
    pub shadow: bool,
    pub shadow_blur: u32,
    pub shadow_offset_y: f32,
    pub shadow_opacity: u32,
    pub photo_border: u32,
    pub background: String,
    pub bg_color: String,
    pub text_color: String,
    pub logo_key: String,
    pub logo_variant: String,
    pub logo_size: u32,
    pub logo_gap: u32,
    pub font_family: String,
    pub font_size: u32,
    pub auto_text_contrast: bool,
    pub divider_show: bool,
    pub divider_color: String,
    pub canvas_ratio: String,
    pub canvas_orientation: String, // "landscape" | "portrait"
    pub export_quality: u8,
}

#[derive(Debug, Clone)]
struct RenderPlan {
    resolution_scale: f32,
    bottom_bar_mode: bool,
    #[allow(dead_code)]
    top_margin: u32,
    extra_line_gap: u32,
    #[allow(dead_code)]
    logo_only_watermark: bool,
    total_text_h: f32,
    canvas_w: u32,
    canvas_h: u32,
    bar_top: u32,
    photo_w: u32,
    photo_h: u32,
    image_left: u32,
    image_top: u32,
    block_top: f32,
    line_plans: Vec<RenderLinePlan>,
}

#[derive(Debug, Clone)]
struct RenderLinePlan {
    pt: f32,
    line_height: f32,
    text_ascent: f32,
    text_width: f32,
    inline_gap: f32,
    logo_inline: Option<(f32, f32)>,
    inline_x: f32,
}

#[derive(Debug, Clone, Copy, PartialEq)]
struct SampleRegion {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

// ── Entry point ──────────────────────────────────────────────────────────────

pub fn render_to_path(request: &ExportSinglePhotoRequest) -> Result<(), String> {
    let source = decode_image(Path::new(&request.photo_path))?;
    let exif = request
        .exif
        .clone()
        .unwrap_or_else(|| read_exif(Path::new(&request.photo_path)).into());
    let renderer = TextRenderer::cached(&request.frame_params.font_family);
    let rendered = compose(
        source,
        &request.frame_params,
        &exif,
        &request.config,
        renderer.as_deref(),
        &request.template_kind,
    );
    save_image(
        &rendered,
        Path::new(&request.output_path),
        request.frame_params.export_quality,
    )
}

// ── Composition ──────────────────────────────────────────────────────────────

pub fn compose(
    source: DynamicImage,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
    text: Option<&TextRenderer>,
    template_kind: &str,
) -> RgbaImage {
    let src_w = source.width();
    let src_h = source.height();

    let lines = build_lines(exif, config);
    let logo = if config.show_watermark { load_logo_rgba(frame, exif, config) } else { None };
    let render_lines = if config.show_watermark {
        build_render_lines(lines.clone(), logo.is_some())
    } else {
        Vec::new()
    };
    let plan = build_render_plan(
        src_w,
        src_h,
        frame,
        template_kind,
        &render_lines,
        text,
        logo.as_ref()
            .map(|image| image.width() as f32 / image.height().max(1) as f32),
        config.show_watermark,
    );
    compose_with_plan(
        source,
        frame,
        text,
        template_kind,
        &plan,
        &render_lines,
        logo.as_ref(),
    )
}

fn compose_with_plan(
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

    if frame.photo_border > 0 {
        let border = (frame.photo_border as f32 * plan.resolution_scale).round() as u32;
        draw_rounded_rect_stroke(
            &mut canvas,
            plan.image_left,
            plan.image_top,
            plan.photo_w,
            plan.photo_h,
            r,
            border,
            Rgba([255, 255, 255, 255]),
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
        let line_plan = &plan.line_plans[index];
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

#[allow(clippy::too_many_arguments)]
fn build_render_plan(
    source_w: u32,
    source_h: u32,
    frame: &ExportFrameParams,
    template_kind: &str,
    render_lines: &[String],
    text: Option<&TextRenderer>,
    logo_ratio: Option<f32>,
    show_watermark: bool,
) -> RenderPlan {
    let spec = watermark_layout_spec();
    let resolution_scale = source_w as f32 / 900.0;
    let bottom_bar_mode = is_bottom_bar_template(template_kind);
    let top_margin =
        ((source_w as f32) * (frame.min_top_bottom_margin.max(0.0) / 100.0)).round() as u32;
    let extra_line_gap = (spec.base_line_gap_px * resolution_scale)
        .round()
        .max(spec.base_line_gap_px) as u32;
    let logo_only_watermark =
        logo_ratio.is_some() && render_lines.len() == 1 && render_lines[0].is_empty();
    let primary_pt = (frame.font_size as f32 * spec.primary_font_scale)
        .max(spec.base_min_primary_font_size)
        * resolution_scale;
    let secondary_pt = (frame.font_size as f32 * spec.secondary_font_scale)
        .max(spec.base_min_secondary_font_size)
        * resolution_scale;

    let text_block_h = render_lines
        .iter()
        .enumerate()
        .fold(0u32, |acc, (index, _)| {
            let size = if index == 0 { primary_pt } else { secondary_pt };
            let line_h = text
                .map(|r| r.line_height(size, true))
                .unwrap_or(size)
                .round() as u32;
            acc + line_h + if index == 0 { 0 } else { extra_line_gap }
        });
    let min_info_bar_h = text_block_h + (12.0 * resolution_scale).round() as u32;
    // infoBarHeight is in 900px canvas-pixel space; scale to full resolution.
    let scaled_info_bar_h = (frame.info_bar_height as f32 * resolution_scale).round() as u32;
    // When watermark is off the info bar disappears → image fills the full canvas.
    let info_bar_h = if !show_watermark {
        0
    } else if bottom_bar_mode {
        scaled_info_bar_h.max(min_info_bar_h)
    } else {
        0
    };

    let img_ratio = frame.main_image_width_ratio.clamp(1.0, 100.0);
    let canvas_w = source_w;
    let canvas_ratio = parse_canvas_ratio(&frame.canvas_ratio, &frame.canvas_orientation);
    let canvas_h = ((source_w as f32) / canvas_ratio).round().max(1.0) as u32;
    let bar_top = canvas_h.saturating_sub(info_bar_h);
    let avail_h = if bottom_bar_mode {
        bar_top.saturating_sub(top_margin.saturating_mul(2)).max(1)
    } else {
        canvas_h.saturating_sub(top_margin.saturating_mul(2)).max(1)
    };
    let natural_w = ((source_w as f32) * (img_ratio / 100.0)).round().max(1.0);
    let natural_h = source_h as f32 * natural_w / source_w as f32;
    let fit = if natural_h > avail_h as f32 {
        avail_h as f32 / natural_h
    } else {
        1.0
    };
    let photo_w = (natural_w * fit).round() as u32;
    let photo_h = (natural_h * fit).round() as u32;
    let image_left = (canvas_w.saturating_sub(photo_w)) / 2;
    let image_top = top_margin + (avail_h.saturating_sub(photo_h)) / 2;

    let total_text_h = render_lines
        .iter()
        .enumerate()
        .fold(0f32, |acc, (index, _)| {
            let size = if index == 0 { primary_pt } else { secondary_pt };
            let line_h = text.map(|r| r.line_height(size, true)).unwrap_or(size);
            acc + line_h
                + if index == 0 {
                    0.0
                } else {
                    extra_line_gap as f32
                }
        });
    let image_bottom = image_top as f32 + photo_h as f32;
    let block_top = if bottom_bar_mode {
        let offset_y = if should_lift_logo_only_watermark(template_kind, logo_only_watermark) {
            -primary_pt
        } else {
            0.0
        };
        compute_watermark_block_top(
            bar_top as f32,
            canvas_h as f32,
            image_bottom,
            total_text_h,
            offset_y,
        )
    } else {
        compute_corner_watermark_block_top(
            image_top as f32,
            image_bottom,
            total_text_h,
            scaled_corner_padding(resolution_scale),
        )
    };

    let line_plans = build_line_plans(
        render_lines,
        text,
        frame,
        logo_ratio,
        template_kind,
        canvas_w,
        image_left,
        photo_w,
        resolution_scale,
        bottom_bar_mode,
        primary_pt,
        secondary_pt,
    );

    RenderPlan {
        resolution_scale,
        bottom_bar_mode,
        top_margin,
        extra_line_gap,
        logo_only_watermark,
        total_text_h,
        canvas_w,
        canvas_h,
        bar_top,
        photo_w,
        photo_h,
        image_left,
        image_top,
        block_top,
        line_plans,
    }
}

#[allow(clippy::too_many_arguments)]
fn build_line_plans(
    render_lines: &[String],
    text: Option<&TextRenderer>,
    frame: &ExportFrameParams,
    logo_ratio: Option<f32>,
    template_kind: &str,
    canvas_w: u32,
    image_left: u32,
    photo_w: u32,
    resolution_scale: f32,
    bottom_bar_mode: bool,
    primary_pt: f32,
    secondary_pt: f32,
) -> Vec<RenderLinePlan> {
    render_lines
        .iter()
        .enumerate()
        .map(|(index, line)| {
            let is_first = index == 0;
            let pt = if is_first { primary_pt } else { secondary_pt };
            let text_ascent = text.map(|r| r.ascent(pt, true)).unwrap_or(pt * 0.8);
            let line_height = text.map(|r| r.line_height(pt, true)).unwrap_or(pt);
            let text_w = if line.is_empty() {
                0.0
            } else if let Some(r) = text {
                r.measure(line, pt, true)
            } else {
                (line.len() as f32) * pt * 0.6
            };
            let logo_inline = if is_first {
                compute_logo_inline(frame, logo_ratio, pt, resolution_scale)
            } else {
                None
            };
            let inline_gap = if logo_inline.is_some() && !line.is_empty() {
                frame.logo_gap as f32 * resolution_scale
            } else {
                0.0
            };
            let inline_w = text_w + logo_inline.map(|(w, _)| w + inline_gap).unwrap_or(0.0);
            let inline_x = compute_inline_x(
                canvas_w as f32,
                image_left as f32,
                photo_w as f32,
                inline_w,
                resolution_scale,
                bottom_bar_mode,
                template_kind,
            );

            RenderLinePlan {
                pt,
                line_height,
                text_ascent,
                text_width: text_w,
                inline_gap,
                logo_inline,
                inline_x,
            }
        })
        .collect()
}

fn compute_logo_inline(
    frame: &ExportFrameParams,
    logo_ratio: Option<f32>,
    pt: f32,
    resolution_scale: f32,
) -> Option<(f32, f32)> {
    let spec = watermark_layout_spec();
    let ratio = logo_ratio?;
    // Use 900px-equivalent pt so the scale factor matches the Canvas preview formula.
    let pt_900 = pt / resolution_scale;
    let logo_font_scale = (pt_900 / spec.logo_font_scale_base).max(0.5);
    let h = (frame.logo_size as f32 * resolution_scale * spec.logo_visual_scale * logo_font_scale)
        .max(12.0 * resolution_scale);
    let w = h * ratio;
    Some((w, h))
}

fn parse_canvas_ratio(ratio: &str, orientation: &str) -> f32 {
    let parts: Vec<f32> = ratio.split(':').filter_map(|s| s.parse().ok()).collect();
    if parts.len() == 2 && parts[0] > 0.0 && parts[1] > 0.0 {
        return if orientation == "portrait" {
            parts[1] / parts[0]  // flip → taller canvas
        } else {
            parts[0] / parts[1]
        };
    }
    3.0 / 2.0
}

// ── Text content ─────────────────────────────────────────────────────────────

fn build_lines(exif: &ExportExif, config: &ExportTemplateConfig) -> Vec<String> {
    if let Some(templates) = &config.watermark_template {
        if !templates.is_empty() {
            return build_dsl_lines(exif, templates);
        }
    }

    let mut lines: Vec<String> = Vec::new();

    if config.show_camera {
        let cam = format_camera(exif);
        if !cam.is_empty() {
            lines.push(cam);
        }
    }
    if config.show_lens && !exif.lens.is_empty() {
        lines.push(clean_display_text(&exif.lens));
    }

    if config.show_params {
        let params: Vec<String> = [
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
                format!("ISO{}", exif.iso)
            } else {
                String::new()
            },
        ]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect();
        if !params.is_empty() {
            lines.push(params.join(" "));
        }
    }
    lines.into_iter().filter(|s| !s.is_empty()).collect()
}

fn build_dsl_lines(exif: &ExportExif, templates: &[String]) -> Vec<String> {
    let model = format_camera(exif);
    let lens = clean_display_text(&exif.lens);
    let params: Vec<String> = [
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
            format!("ISO{}", exif.iso)
        } else {
            String::new()
        },
    ]
    .into_iter()
    .filter(|s| !s.is_empty())
    .collect();
    let params_joined = params.join(" ");

    templates
        .iter()
        .map(|line| {
            let focal_length = if exif.focal_length > 0.0 {
                format!("{}", exif.focal_length.round() as u32)
            } else {
                String::new()
            };
            let f_number = if exif.aperture > 0.0 {
                format!("{:.1}", exif.aperture)
            } else {
                String::new()
            };
            let iso = if exif.iso > 0 {
                format!("{}", exif.iso)
            } else {
                String::new()
            };
            line.replace("{Make}", &exif.camera.make)
                .replace("{Model}", &model)
                .replace("{Camera}", &model)
                .replace("{LensModel}", &lens)
                .replace("{Lens}", &lens)
                .replace("{FocalLength}", &focal_length)
                .replace("{FNumber}", &f_number)
                .replace("{ExposureTime}", &exif.shutter_speed)
                .replace("{ISO}", &iso)
                .replace("{Params}", &params_joined)
        })
        .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|line| !line.is_empty())
        .collect()
}

fn build_render_lines(lines: Vec<String>, has_logo: bool) -> Vec<String> {
    if !lines.is_empty() {
        return lines;
    }
    if has_logo {
        return vec![String::new()];
    }
    Vec::new()
}

fn should_lift_logo_only_watermark(template_kind: &str, logo_only_watermark: bool) -> bool {
    logo_only_watermark
        && watermark_layout_spec()
            .logo_only_lift_templates
            .iter()
            .any(|item| item == template_kind)
}

fn is_bottom_bar_template(template_kind: &str) -> bool {
    !matches!(template_kind, "corner-overlay")
}

fn is_corner_bottom_right_template(template_kind: &str) -> bool {
    matches!(template_kind, "minimal-corner")
}

fn compute_inline_x(
    canvas_w: f32,
    image_left: f32,
    photo_w: f32,
    inline_w: f32,
    resolution_scale: f32,
    bottom_bar_mode: bool,
    template_kind: &str,
) -> f32 {
    let corner_padding = scaled_corner_padding(resolution_scale);
    if is_corner_bottom_right_template(template_kind) {
        return image_left + photo_w - inline_w - corner_padding;
    }
    if bottom_bar_mode {
        return (canvas_w - inline_w) / 2.0;
    }
    image_left + photo_w - inline_w - corner_padding
}

fn compute_watermark_block_top(
    bar_top: f32,
    canvas_h: f32,
    image_bottom: f32,
    total_text_h: f32,
    offset_y: f32,
) -> f32 {
    let centered_top = image_bottom + (canvas_h - image_bottom - total_text_h) / 2.0;
    let preferred_top = centered_top + offset_y;
    let min_top = bar_top.max(image_bottom);
    let max_top = min_top.max(canvas_h - total_text_h);
    preferred_top.clamp(min_top, max_top)
}

fn compute_corner_watermark_block_top(
    image_top: f32,
    image_bottom: f32,
    total_text_h: f32,
    corner_padding: f32,
) -> f32 {
    let preferred_top = image_bottom - total_text_h - corner_padding;
    let min_top = image_top + corner_padding;
    let max_top = image_bottom - total_text_h - corner_padding;
    preferred_top.clamp(min_top, max_top)
}

fn scaled_divider_horizontal_margin(source_width: u32) -> u32 {
    (watermark_layout_spec().divider_horizontal_margin_px * (source_width as f32 / 900.0)) as u32
}

fn scaled_corner_padding(resolution_scale: f32) -> f32 {
    watermark_layout_spec().corner_padding_px * resolution_scale
}

fn format_camera(exif: &ExportExif) -> String {
    brand::normalize_model(&exif.camera.make, &exif.camera.model)
}

fn load_logo_rgba(
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
) -> Option<RgbaImage> {
    if !config.show_logo {
        return None;
    }

    let key = if frame.logo_key.trim().is_empty() {
        infer_logo_key(&exif.camera.make)?
    } else {
        frame.logo_key.trim().to_ascii_lowercase()
    };
    let variant = if frame.logo_key.trim().is_empty()
        && key == "nikon"
        && frame.logo_variant.trim().eq_ignore_ascii_case("original")
    {
        "black".to_string()
    } else {
        frame.logo_variant.trim().to_ascii_lowercase()
    };
    resolve_logo_svg_bytes(&key, &variant).and_then(cached_svg_logo)
}

fn cached_svg_logo(svg_bytes: &'static [u8]) -> Option<RgbaImage> {
    static LOGO_CACHE: OnceLock<Mutex<HashMap<usize, RgbaImage>>> = OnceLock::new();
    let cache = LOGO_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let key = svg_bytes.as_ptr() as usize;

    if let Ok(guard) = cache.lock() {
        if let Some(image) = guard.get(&key) {
            return Some(image.clone());
        }
    }

    let image = render_svg_logo(svg_bytes).ok()?;
    if let Ok(mut guard) = cache.lock() {
        guard.insert(key, image.clone());
    }
    Some(image)
}

fn infer_logo_key(make: &str) -> Option<String> {
    let normalized = brand::normalize_make(make).to_ascii_lowercase();
    match normalized.as_str() {
        "" => None,
        "lumix" => Some("panasonic".into()),
        "phase one" => Some("phaseone".into()),
        "osmo action" => Some("osmo-action".into()),
        other => Some(other.into()),
    }
}

fn resolve_logo_svg_bytes(key: &str, variant: &str) -> Option<&'static [u8]> {
    static LOGOS: OnceLock<HashMap<(&'static str, &'static str), &'static [u8]>> = OnceLock::new();
    let logos = LOGOS.get_or_init(embedded_logos);

    let lookup_keys: &[&str] = match key {
        "panasonic" => &["panasonic", "lumix"],
        "sony" => &["sony", "sonyalpha"],
        _ => &[key],
    };
    let fallbacks = ["original", "black", "white", "icon-original", "icon-black", "icon-white"];

    for &k in lookup_keys {
        if let Some(&bytes) = logos.get(&(k, variant)) {
            return Some(bytes);
        }
    }
    for &k in lookup_keys {
        for &fb in &fallbacks {
            if let Some(&bytes) = logos.get(&(k, fb)) {
                return Some(bytes);
            }
        }
    }
    None
}

fn render_svg_logo(svg_bytes: &[u8]) -> Result<RgbaImage, String> {
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_data(svg_bytes, &options).map_err(|e| format!("解析 SVG 失败：{e}"))?;
    let size = tree.size().to_int_size();
    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or_else(|| "创建 Logo 画布失败".to_string())?;
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    let image = RgbaImage::from_raw(size.width(), size.height(), pixmap.data().to_vec())
        .ok_or_else(|| "创建 Logo 位图失败".to_string())?;
    Ok(trim_transparent_bounds(&image))
}

fn trim_transparent_bounds(image: &RgbaImage) -> RgbaImage {
    let mut min_x = image.width();
    let mut min_y = image.height();
    let mut max_x = 0u32;
    let mut max_y = 0u32;
    let mut found = false;

    for (x, y, pixel) in image.enumerate_pixels() {
        if pixel.0[3] == 0 {
            continue;
        }
        found = true;
        min_x = min_x.min(x);
        min_y = min_y.min(y);
        max_x = max_x.max(x);
        max_y = max_y.max(y);
    }

    if !found {
        return image.clone();
    }

    let width = max_x.saturating_sub(min_x) + 1;
    let height = max_y.saturating_sub(min_y) + 1;
    image::imageops::crop_imm(image, min_x, min_y, width, height).to_image()
}

fn clean_display_text(value: &str) -> String {
    value.trim().trim_matches('"').trim().to_string()
}

fn resolve_readable_colors(
    auto: bool,
    average_luminance: f32,
    fallback_text: Rgba<u8>,
    fallback_divider: Rgba<u8>,
) -> (Rgba<u8>, Rgba<u8>) {
    if !auto {
        return (fallback_text, fallback_divider);
    }
    let spec = watermark_layout_spec();
    if average_luminance >= spec.readability_threshold_luma {
        return (
            parse_hex_color(&spec.readability_dark_text_color, fallback_text),
            parse_hex_color(&spec.readability_dark_divider_color, fallback_divider),
        );
    }
    (
        parse_hex_color(&spec.readability_light_text_color, fallback_text),
        parse_hex_color(&spec.readability_light_divider_color, fallback_divider),
    )
}

#[allow(clippy::too_many_arguments)]
fn sample_watermark_luminance(
    canvas: &RgbaImage,
    template_kind: &str,
    bottom_bar_mode: bool,
    image_left: f32,
    image_top: f32,
    image_w: f32,
    image_h: f32,
    bar_top: f32,
    canvas_h: f32,
    block_top: f32,
    text_h: f32,
    corner_padding: f32,
) -> f32 {
    let is_corner = !bottom_bar_mode || template_kind == "minimal-corner";
    if is_corner {
        let x = (image_left + image_w - 260.0).max(image_left);
        let y = (image_top + image_h - 120.0 - corner_padding).max(image_top);
        return average_luminance(canvas, x as u32, y as u32, 240, 90);
    }

    let y = (block_top.max(bar_top) - 8.0).max(0.0);
    let h = (text_h + 20.0).max(20.0).min((canvas_h - y).max(1.0));
    average_luminance(canvas, 0, y as u32, canvas.width(), h as u32)
}

fn build_text_sample_regions(plan: &RenderPlan, render_lines: &[String]) -> Vec<SampleRegion> {
    let mut regions = Vec::new();
    let mut cursor_y = plan.block_top;
    for (index, line) in render_lines.iter().enumerate() {
        if index > 0 {
            cursor_y += plan.extra_line_gap as f32;
        }
        let line_plan = &plan.line_plans[index];
        if !line.is_empty() && line_plan.text_width > 0.0 {
            let text_x = line_plan.inline_x
                + line_plan
                    .logo_inline
                    .map(|(w, _)| w + line_plan.inline_gap)
                    .unwrap_or(0.0);
            let x = text_x.max(0.0).round() as u32;
            let y = (cursor_y.max(0.0)).round() as u32;
            let width = line_plan.text_width.max(1.0).round() as u32;
            let height = line_plan.line_height.max(1.0).round() as u32;
            regions.push(SampleRegion {
                x,
                y,
                width,
                height,
            });
        }
        cursor_y += line_plan.line_height;
    }
    regions
}

fn average_luminance_regions(canvas: &RgbaImage, regions: &[SampleRegion]) -> f32 {
    let mut total = 0.0f32;
    let mut area = 0u32;
    for region in regions {
        let region_area = region.width.saturating_mul(region.height).max(1);
        total += average_luminance(canvas, region.x, region.y, region.width, region.height)
            * region_area as f32;
        area = area.saturating_add(region_area);
    }
    if area == 0 {
        0.0
    } else {
        total / area as f32
    }
}

fn average_luminance(canvas: &RgbaImage, x: u32, y: u32, width: u32, height: u32) -> f32 {
    let x0 = x.min(canvas.width().saturating_sub(1));
    let y0 = y.min(canvas.height().saturating_sub(1));
    let w = width.min(canvas.width().saturating_sub(x0)).max(1);
    let h = height.min(canvas.height().saturating_sub(y0)).max(1);

    let mut total = 0.0f32;
    for py in y0..y0 + h {
        for px in x0..x0 + w {
            let p = canvas.get_pixel(px, py);
            total += 0.2126 * p[0] as f32 + 0.7152 * p[1] as f32 + 0.0722 * p[2] as f32;
        }
    }
    total / (w * h) as f32
}

// ── Save ─────────────────────────────────────────────────────────────────────

fn save_image(image: &RgbaImage, path: &Path, quality: u8) -> Result<(), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_else(|| "png".into());

    let file = File::create(path).map_err(|e| format!("无法创建导出文件：{e}"))?;
    let mut w = BufWriter::new(file);
    let dynamic = DynamicImage::ImageRgba8(image.clone());
    let q = quality.clamp(60, 100);

    match ext.as_str() {
        "jpg" | "jpeg" => {
            let jpeg = turbojpeg::compress_image(image, q as i32, turbojpeg::Subsamp::Sub2x2)
                .map_err(|e| format!("JPEG 导出失败：{e}"))?;
            std::io::Write::write_all(&mut w, &jpeg)
                .map_err(|e| format!("JPEG 写入失败：{e}"))?;
        }
        "webp" => {
            dynamic
                .write_to(&mut w, ImageFormat::WebP)
                .map_err(|e| format!("WebP 导出失败：{e}"))?;
        }
        _ => {
            dynamic
                .write_to(&mut w, ImageFormat::Png)
                .map_err(|e| format!("PNG 导出失败：{e}"))?;
        }
    }
    Ok(())
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

fn apply_rounded_corners(image: &mut RgbaImage, radius: u32) {
    if radius == 0 {
        return;
    }
    let (w, h) = (image.width() as i32, image.height() as i32);
    let r = radius as i32;
    let corners = [
        (r, r),
        (w - r - 1, r),
        (r, h - r - 1),
        (w - r - 1, h - r - 1),
    ];
    for y in 0..h {
        for x in 0..w {
            if (x >= r && x < w - r) || (y >= r && y < h - r) {
                continue;
            }
            let inside = corners.iter().any(|&(cx, cy)| {
                let (dx, dy) = (x - cx, y - cy);
                dx * dx + dy * dy <= r * r
            });
            if !inside {
                image.get_pixel_mut(x as u32, y as u32).0[3] = 0;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn draw_rounded_rect_stroke(
    canvas: &mut RgbaImage,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    radius: u32,
    thickness: u32,
    color: Rgba<u8>,
) {
    for t in 0..thickness {
        let expand = t as i32;
        let sx = x as i32 - expand;
        let sy = y as i32 - expand;
        let sw = w + t * 2;
        let sh = h + t * 2;
        let sr = (radius + t).min(sh / 2).min(sw / 2);
        draw_rounded_rect_outline(canvas, sx, sy, sw as i32, sh as i32, sr as i32, color);
    }
}

fn draw_rounded_rect_outline(
    canvas: &mut RgbaImage,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    r: i32,
    color: Rgba<u8>,
) {
    let cw = canvas.width() as i32;
    let ch = canvas.height() as i32;
    let corners = [
        (x + r, y + r),
        (x + w - r - 1, y + r),
        (x + r, y + h - r - 1),
        (x + w - r - 1, y + h - r - 1),
    ];
    for py in y.max(0)..(y + h).min(ch) {
        for px in x.max(0)..(x + w).min(cw) {
            let on_top = py == y;
            let on_bot = py == y + h - 1;
            let on_left = px == x;
            let on_right = px == x + w - 1;
            let edge = on_top || on_bot || on_left || on_right;
            if !edge {
                continue;
            }
            let in_rect = (px >= x + r && px < x + w - r) || (py >= y + r && py < y + h - r);
            let inside = in_rect
                || corners.iter().any(|&(cx, cy)| {
                    let (dx, dy) = (px - cx, py - cy);
                    dx * dx + dy * dy <= r * r
                });
            if inside {
                canvas.put_pixel(px as u32, py as u32, color);
            }
        }
    }
}

/// Gaussian-approximated soft shadow via 3-pass box blur on an alpha mask.
/// Complexity: O(photo_w × photo_h) — replaces the O(blur_layers × area) ring approach.
#[allow(clippy::too_many_arguments)]
fn draw_soft_shadow(
    canvas: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    radius: u32,
    blur: u32,
    offset_y: u32,
    opacity_pct: u32,
) {
    if opacity_pct == 0 || width == 0 || height == 0 {
        return;
    }

    // Match Canvas shadow semantics more closely: keep a much wider blur
    // spread area so the blur tail does not get clipped into a rectangle.
    let blur_px = blur.clamp(1, 120) as usize;
    // Keep enough spread to avoid clipping, but closer to preview's softness.
    let pad = (blur_px * 2).clamp(2, 240);
    let off = offset_y as usize;
    let mw = width as usize + pad * 2;
    let mh = height as usize + pad * 2 + off;
    let mut mask = vec![0u8; mw * mh];

    // Rasterize the rounded rect into the mask at origin (pad, pad + off).
    let r = radius.min(width / 2).min(height / 2) as i32;
    let (wi, hi) = (width as i32, height as i32);
    let corners = [
        (r, r),
        (wi - r - 1, r),
        (r, hi - r - 1),
        (wi - r - 1, hi - r - 1),
    ];
    for my in 0..mh {
        let ry = my as i32 - (pad + off) as i32;
        if ry < 0 || ry >= hi {
            continue;
        }
        for mx in 0..mw {
            let rx = mx as i32 - pad as i32;
            if rx < 0 || rx >= wi {
                continue;
            }
            let in_rect = (rx >= r && rx < wi - r) || (ry >= r && ry < hi - r);
            let inside = in_rect
                || corners.iter().any(|&(cx, cy)| {
                    let (dx, dy) = (rx - cx, ry - cy);
                    dx * dx + dy * dy <= r * r
                });
            if inside {
                mask[my * mw + mx] = 255;
            }
        }
    }

    // Three-pass box blur ≈ Gaussian.
    let k = (blur_px / 2).max(1);
    for _ in 0..3 {
        box_blur_h(&mut mask, mw, mh, k);
        box_blur_v(&mut mask, mw, mh, k);
    }

    // Blend shadow onto canvas. Keep a tiny cutoff only to avoid useless work.
    let alpha_scale = opacity_pct.min(100) as f32 / 100.0;
    let cutoff = 1u8;
    let ox = x as i32 - pad as i32;
    let oy = y as i32 - pad as i32;
    let (cw, ch) = (canvas.width() as i32, canvas.height() as i32);
    for my in 0..mh as i32 {
        let cy = oy + my;
        if cy < 0 || cy >= ch {
            continue;
        }
        let row = my as usize * mw;
        for mx in 0..mw as i32 {
            let cx = ox + mx;
            if cx < 0 || cx >= cw {
                continue;
            }
            let a_raw = mask[row + mx as usize];
            if a_raw <= cutoff {
                continue;
            }
            let a = a_raw as f32 / 255.0 * alpha_scale;
            let p = canvas.get_pixel_mut(cx as u32, cy as u32);
            p.0[0] = (p.0[0] as f32 * (1.0 - a)).round() as u8;
            p.0[1] = (p.0[1] as f32 * (1.0 - a)).round() as u8;
            p.0[2] = (p.0[2] as f32 * (1.0 - a)).round() as u8;
        }
    }
}

/// Horizontal box blur using prefix sums — O(width) per row.
fn box_blur_h(buf: &mut [u8], width: usize, height: usize, radius: usize) {
    let mut tmp = vec![0u8; width * height];
    for y in 0..height {
        let row = y * width;
        let mut prefix = vec![0u32; width + 1];
        for x in 0..width {
            prefix[x + 1] = prefix[x] + buf[row + x] as u32;
        }
        for x in 0..width {
            let lo = x.saturating_sub(radius);
            let hi = (x + radius + 1).min(width);
            tmp[row + x] = ((prefix[hi] - prefix[lo]) / (hi - lo) as u32) as u8;
        }
    }
    buf.copy_from_slice(&tmp);
}

/// Vertical box blur using prefix sums — O(height) per column.
fn box_blur_v(buf: &mut [u8], width: usize, height: usize, radius: usize) {
    let mut tmp = vec![0u8; width * height];
    for x in 0..width {
        let mut prefix = vec![0u32; height + 1];
        for y in 0..height {
            prefix[y + 1] = prefix[y] + buf[y * width + x] as u32;
        }
        for y in 0..height {
            let lo = y.saturating_sub(radius);
            let hi = (y + radius + 1).min(height);
            tmp[y * width + x] = ((prefix[hi] - prefix[lo]) / (hi - lo) as u32) as u8;
        }
    }
    buf.copy_from_slice(&tmp);
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use std::collections::HashMap;

    #[derive(Debug, Deserialize)]
    struct ParityFixtureCase {
        #[serde(rename = "sourceW")]
        source_w: u32,
        #[serde(rename = "sourceH")]
        source_h: u32,
        #[serde(rename = "templateKind")]
        template_kind: String,
        scenario: String,
        expected: ParityExpected,
    }

    #[derive(Debug, Deserialize)]
    struct ParityExpected {
        #[serde(rename = "canvasW")]
        canvas_w: u32,
        #[serde(rename = "canvasH")]
        canvas_h: u32,
        #[serde(rename = "topMargin")]
        top_margin: u32,
        #[serde(rename = "barTop")]
        bar_top: u32,
        #[serde(rename = "photoW")]
        photo_w: u32,
        #[serde(rename = "photoH")]
        photo_h: u32,
        #[serde(rename = "imageLeft")]
        image_left: u32,
        #[serde(rename = "imageTop")]
        image_top: u32,
        #[serde(rename = "blockTop")]
        block_top: u32,
    }

    #[test]
    fn minimal_corner_uses_bottom_watermark_area() {
        assert!(is_bottom_bar_template("minimal-corner"));
    }

    #[test]
    fn minimal_corner_inline_content_aligns_to_photo_right_edge() {
        let x = compute_inline_x(900.0, 100.0, 700.0, 80.0, 1.0, true, "minimal-corner");
        assert_eq!(x, 702.0);
    }

    #[test]
    fn logo_only_lift_applies_to_minimal_corner() {
        assert!(should_lift_logo_only_watermark("minimal-corner", true));
        assert!(!should_lift_logo_only_watermark("classic-bottom", true));
        assert!(!should_lift_logo_only_watermark("minimal-corner", false));
    }

    #[test]
    fn text_sampling_regions_follow_text_bounds() {
        let plan = RenderPlan {
            resolution_scale: 1.0,
            bottom_bar_mode: true,
            top_margin: 24,
            extra_line_gap: 8,
            logo_only_watermark: false,
            total_text_h: 40.0,
            canvas_w: 900,
            canvas_h: 600,
            bar_top: 520,
            photo_w: 700,
            photo_h: 480,
            image_left: 100,
            image_top: 40,
            block_top: 540.0,
            line_plans: vec![RenderLinePlan {
                pt: 16.0,
                line_height: 18.0,
                text_ascent: 14.0,
                text_width: 92.0,
                inline_gap: 0.0,
                logo_inline: None,
                inline_x: 404.0,
            }],
        };

        let regions = build_text_sample_regions(&plan, &[String::from("Z 7II")]);
        assert_eq!(
            regions,
            vec![SampleRegion {
                x: 404,
                y: 540,
                width: 92,
                height: 18,
            }]
        );
    }

    #[test]
    fn dsl_template_builds_expected_lines() {
        let exif = ExportExif {
            camera: ExportCamera {
                make: "NIKON CORPORATION".to_string(),
                model: "NIKON Z 7_2".to_string(),
            },
            lens: "NIKKOR Z 24-70mm f/2.8 S".to_string(),
            iso: 64,
            aperture: 2.8,
            shutter_speed: "1/160 s".to_string(),
            focal_length: 70.0,
            taken_at: String::new(),
            gps: None,
        };
        let lines = build_dsl_lines(
            &exif,
            &vec![
                "{Model}".to_string(),
                "{LensModel}".to_string(),
                "{FocalLength}mm f/{FNumber} {ExposureTime} ISO{ISO}".to_string(),
            ],
        );
        assert_eq!(
            lines,
            vec![
                "Z 7II".to_string(),
                "NIKKOR Z 24-70mm f/2.8 S".to_string(),
                "70mm f/2.8 1/160 s ISO64".to_string()
            ]
        );
    }

    #[test]
    fn readable_color_prefers_dark_text_on_light_background() {
        let (text, divider) = resolve_readable_colors(
            true,
            220.0,
            Rgba([255, 255, 255, 255]),
            Rgba([215, 220, 230, 255]),
        );
        assert_eq!(text, Rgba([17, 24, 39, 255]));
        assert_eq!(divider, Rgba([156, 163, 175, 255]));
    }

    #[test]
    fn render_plan_builds_stable_bottom_bar_geometry() {
        let frame = ExportFrameParams {
            info_bar_height: 72,
            main_image_width_ratio: 85.0,
            min_top_bottom_margin: 2.4,
            text_margin: 0.0,
            watermark_top_padding: 12.0,
            watermark_bottom_padding: 64.0,
            inner_radius: 16,
            outer_radius: 0,
            shadow: true,
            shadow_blur: 20,
            shadow_offset_y: 0.06,
            shadow_opacity: 100,
            photo_border: 0,
            background: "white".to_string(),
            bg_color: "#ffffff".to_string(),
            text_color: "#1f2937".to_string(),
            logo_key: "".to_string(),
            logo_variant: "original".to_string(),
            logo_size: 15,
            logo_gap: 10,
            font_family: "pingfang-sc".to_string(),
            font_size: 10,
            auto_text_contrast: false,
            divider_show: false,
            divider_color: "#d7dce6".to_string(),
            canvas_ratio: "auto".to_string(),
            canvas_orientation: "landscape".to_string(),
            export_quality: 92,
        };
        let lines = vec!["Z 7II".to_string(), "50mm f/1.4 1/800 ISO100".to_string()];
        let plan = build_render_plan(4032, 3024, &frame, "classic-bottom", &lines, None, None, true);

        assert!(plan.bottom_bar_mode);
        assert_eq!(plan.canvas_w, 4032);
        assert_eq!(plan.top_margin, 97);
        assert!(plan.photo_h > 0);
        assert!(plan.image_top >= plan.top_margin);
        assert!(plan.block_top >= plan.bar_top as f32);
        assert!(!plan.logo_only_watermark);
    }

    #[test]
    fn render_plan_precomputes_line_metrics_and_inline_layout() {
        let frame = ExportFrameParams {
            info_bar_height: 72,
            main_image_width_ratio: 85.0,
            min_top_bottom_margin: 2.4,
            text_margin: 0.0,
            watermark_top_padding: 12.0,
            watermark_bottom_padding: 64.0,
            inner_radius: 16,
            outer_radius: 0,
            shadow: true,
            shadow_blur: 20,
            shadow_offset_y: 0.06,
            shadow_opacity: 100,
            photo_border: 0,
            background: "white".to_string(),
            bg_color: "#ffffff".to_string(),
            text_color: "#1f2937".to_string(),
            logo_key: "nikon".to_string(),
            logo_variant: "original".to_string(),
            logo_size: 15,
            logo_gap: 10,
            font_family: "pingfang-sc".to_string(),
            font_size: 10,
            auto_text_contrast: false,
            divider_show: false,
            divider_color: "#d7dce6".to_string(),
            canvas_ratio: "auto".to_string(),
            canvas_orientation: "landscape".to_string(),
            export_quality: 92,
        };
        let lines = vec!["Z 7II".to_string(), "50mm f/1.4 1/800 ISO100".to_string()];
        let plan = build_render_plan(
            4032,
            3024,
            &frame,
            "classic-bottom",
            &lines,
            None,
            Some(3.0),
            true,
        );

        assert_eq!(plan.line_plans.len(), 2);
        assert!(plan.line_plans[0].line_height > 0.0);
        assert!(plan.line_plans[0].text_ascent > 0.0);
        assert!(plan.line_plans[0].logo_inline.is_some());
        assert!(plan.line_plans[1].logo_inline.is_none());
        assert!(plan.line_plans[0].inline_x >= 0.0);
    }

    #[test]
    fn render_plan_matches_shared_parity_fixture_geometry() {
        let fixtures: HashMap<String, ParityFixtureCase> = serde_json::from_str(include_str!(
            "../../../src/shared/render-plan-parity-fixtures.json",
        ))
        .expect("invalid render plan parity fixture json");
        for case in fixtures.values() {
            let frame = if case.template_kind == "minimal-corner" {
                ExportFrameParams {
                    info_bar_height: 0,
                    main_image_width_ratio: 94.0,
                    min_top_bottom_margin: 1.4,
                    text_margin: 0.0,
                    watermark_top_padding: 12.0,
                    watermark_bottom_padding: 64.0,
                    inner_radius: 12,
                    outer_radius: 0,
                    shadow: false,
                    shadow_blur: 20,
                    shadow_offset_y: 0.06,
                    shadow_opacity: 100,
                    photo_border: 0,
                    background: "white".to_string(),
                    bg_color: "#ffffff".to_string(),
                    text_color: "#ffffff".to_string(),
                    logo_key: "".to_string(),
                    logo_variant: "original".to_string(),
                    logo_size: 12,
                    logo_gap: 10,
                    font_family: "pingfang-sc".to_string(),
                    font_size: 9,
                    auto_text_contrast: false,
                    divider_show: false,
                    divider_color: "#d7dce6".to_string(),
                    canvas_ratio: "auto".to_string(),
                    canvas_orientation: "landscape".to_string(),
                    export_quality: 92,
                }
            } else if case.template_kind == "polaroid" {
                ExportFrameParams {
                    info_bar_height: 148,
                    main_image_width_ratio: 82.0,
                    min_top_bottom_margin: 2.0,
                    text_margin: 0.0,
                    watermark_top_padding: 12.0,
                    watermark_bottom_padding: 64.0,
                    inner_radius: 0,
                    outer_radius: 0,
                    shadow: false,
                    shadow_blur: 20,
                    shadow_offset_y: 0.06,
                    shadow_opacity: 100,
                    photo_border: 10,
                    background: "white".to_string(),
                    bg_color: "#ffffff".to_string(),
                    text_color: "#1f2937".to_string(),
                    logo_key: "".to_string(),
                    logo_variant: "original".to_string(),
                    logo_size: 12,
                    logo_gap: 10,
                    font_family: "pingfang-sc".to_string(),
                    font_size: 9,
                    auto_text_contrast: false,
                    divider_show: false,
                    divider_color: "#d7dce6".to_string(),
                    canvas_ratio: "auto".to_string(),
                    canvas_orientation: "landscape".to_string(),
                    export_quality: 92,
                }
            } else {
                ExportFrameParams {
                    info_bar_height: 72,
                    main_image_width_ratio: 85.0,
                    min_top_bottom_margin: 2.4,
                    text_margin: 0.0,
                    watermark_top_padding: 12.0,
                    watermark_bottom_padding: 64.0,
                    inner_radius: 16,
                    outer_radius: 0,
                    shadow: true,
                    shadow_blur: 20,
                    shadow_offset_y: 0.06,
                    shadow_opacity: 100,
                    photo_border: 0,
                    background: "white".to_string(),
                    bg_color: "#ffffff".to_string(),
                    text_color: "#1f2937".to_string(),
                    logo_key: "".to_string(),
                    logo_variant: "original".to_string(),
                    logo_size: 15,
                    logo_gap: 10,
                    font_family: "pingfang-sc".to_string(),
                    font_size: 10,
                    auto_text_contrast: false,
                    divider_show: false,
                    divider_color: "#d7dce6".to_string(),
                    canvas_ratio: "auto".to_string(),
                    canvas_orientation: "landscape".to_string(),
                    export_quality: 92,
                }
            };
            let (lines, logo_ratio) = if case.scenario == "logo-only" {
                (vec!["".to_string()], Some(3.0))
            } else {
                (
                    vec!["Z 7II".to_string(), "50mm f/1.4 1/800 ISO100".to_string()],
                    None,
                )
            };

            let plan = build_render_plan(
                case.source_w,
                case.source_h,
                &frame,
                &case.template_kind,
                &lines,
                None,
                logo_ratio,
                true,
            );

            assert_eq!(plan.canvas_w, case.expected.canvas_w);
            assert_eq!(plan.canvas_h, case.expected.canvas_h);
            assert_eq!(plan.top_margin, case.expected.top_margin);
            assert_eq!(plan.bar_top, case.expected.bar_top);
            assert_eq!(plan.photo_w, case.expected.photo_w);
            assert_eq!(plan.photo_h, case.expected.photo_h);
            assert_eq!(plan.image_left, case.expected.image_left);
            assert_eq!(plan.image_top, case.expected.image_top);
            assert_eq!(plan.block_top.round() as u32, case.expected.block_top);
        }
    }

    #[test]
    fn divider_margin_scales_from_900_width_baseline() {
        let base = watermark_layout_spec().divider_horizontal_margin_px as u32;
        assert_eq!(scaled_divider_horizontal_margin(900), base);
        assert_eq!(scaled_divider_horizontal_margin(1800), base * 2);
    }

    #[test]
    fn corner_padding_scales_from_900_width_baseline() {
        let base = watermark_layout_spec().corner_padding_px;
        assert_eq!(scaled_corner_padding(1.0), base);
        assert_eq!(scaled_corner_padding(2.0), base * 2.0);
    }
}

/// SIMD-accelerated resize via fast_image_resize (AVX2 / Neon auto-selected).
/// Falls back to image-crate CatmullRom if the source is already smaller than target.
fn resize_photo(
    source: DynamicImage,
    target_w: u32,
    target_h: u32,
) -> image::ImageBuffer<image::Rgba<u8>, Vec<u8>> {
    use fast_image_resize::{
        images::Image, images::ImageRef, PixelType, ResizeAlg, ResizeOptions, Resizer,
    };

    let src_rgba = source.into_rgba8();
    let (sw, sh) = (src_rgba.width(), src_rgba.height());
    if sw == 0 || sh == 0 || target_w == 0 || target_h == 0 {
        return src_rgba;
    }

    let src_ref = match ImageRef::new(sw, sh, src_rgba.as_raw(), PixelType::U8x4) {
        Ok(r) => r,
        Err(_) => return src_rgba,
    };
    let mut dst = Image::new(target_w, target_h, PixelType::U8x4);
    let opts = ResizeOptions::new().resize_alg(ResizeAlg::Convolution(
        fast_image_resize::FilterType::Lanczos3,
    ));
    if Resizer::new().resize(&src_ref, &mut dst, &opts).is_err() {
        // Graceful fallback to image-crate CatmullRom
        return image::imageops::resize(
            &src_rgba,
            target_w,
            target_h,
            image::imageops::FilterType::CatmullRom,
        );
    }
    image::RgbaImage::from_raw(target_w, target_h, dst.into_vec()).unwrap_or_else(|| {
        image::imageops::resize(
            &src_rgba,
            target_w,
            target_h,
            image::imageops::FilterType::CatmullRom,
        )
    })
}

fn parse_color(hex: &str, _background: &str) -> Rgba<u8> {
    let fallback = Rgba([255, 255, 255, 255]);
    let value = hex.trim_start_matches('#');
    if value.len() == 6 {
        let r = u8::from_str_radix(&value[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&value[2..4], 16).unwrap_or(255);
        let b = u8::from_str_radix(&value[4..6], 16).unwrap_or(255);
        return Rgba([r, g, b, 255]);
    }
    fallback
}

fn parse_hex_color(hex: &str, fallback: Rgba<u8>) -> Rgba<u8> {
    let value = hex.trim_start_matches('#');
    if value.len() == 6 {
        let r = u8::from_str_radix(&value[0..2], 16).unwrap_or(fallback[0]);
        let g = u8::from_str_radix(&value[2..4], 16).unwrap_or(fallback[1]);
        let b = u8::from_str_radix(&value[4..6], 16).unwrap_or(fallback[2]);
        return Rgba([r, g, b, 255]);
    }
    fallback
}
