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
    // SVG-path: frontend pre-built the SVG template; use resvg renderer.
    if let Some(ref svg_template) = request.svg_template {
        return crate::render::svg_export::render_svg_export(
            &request.photo_path,
            svg_template,
            &request.output_path,
            request.frame_params.export_quality,
        );
    }

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
    use crate::render::templates;
    match template_kind {
        "magazine" => return templates::magazine::compose_magazine(source, frame, exif, config, text),
        "cinematic" => return templates::cinematic::compose_cinematic(source, frame, exif, config, text),
        "film_strip" => return templates::film_strip::compose_film_strip(source, frame, exif, config, text),
        "xiaomi_leica" => return templates::xiaomi_leica::compose_xiaomi_leica(source, frame, exif, config, text),
        "fujifilm_classic" => return templates::fujifilm_classic::compose_fujifilm_classic(source, frame, exif, config, text),
        "hasselblad" => return templates::hasselblad::compose_hasselblad(source, frame, exif, config, text),
        "photo_album" => return templates::photo_album::compose_photo_album(source, frame, exif, config, text),
        "darkroom_proof" => return templates::darkroom_proof::compose_darkroom_proof(source, frame, exif, config, text),
        "crop_marks" => return templates::crop_marks::compose_crop_marks(source, frame, exif, config, text),
        "contact_sheet" => return templates::contact_sheet::compose_contact_sheet(source, frame, exif, config, text),
        _ => {}
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
