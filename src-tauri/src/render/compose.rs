use std::path::Path;

use image::{DynamicImage, RgbaImage};

use crate::commands::photos::ExportSinglePhotoRequest;
use crate::exif::read_exif;
use crate::images::decode_image;
use crate::render::classic_bottom::{
    build_lines, build_render_lines, build_render_plan, load_logo_rgba, save_image,
    ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use crate::render::text::TextRenderer;

/// Decode, compose, and write one photo to disk.
/// Keeps the Tauri command thin by centralising all I/O here.
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

/// Top-level dispatch: selects the template renderer and returns the composited image.
pub fn compose(
    source: DynamicImage,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
    text: Option<&TextRenderer>,
    template_kind: &str,
) -> RgbaImage {
    if template_kind == "magazine" {
        return crate::render::templates::magazine::compose_magazine(
            source, frame, exif, config, text,
        );
    }

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
    crate::render::templates::classic_bottom::compose_with_plan(
        source,
        frame,
        text,
        template_kind,
        &plan,
        &render_lines,
        logo.as_ref(),
    )
}
