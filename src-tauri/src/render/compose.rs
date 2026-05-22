//! Top-level export entry. The frontend always pre-builds the SVG template
//! (see `src/lib/watermark/svg/templates.ts`); this dispatches to resvg.

use crate::commands::photos::ExportSinglePhotoRequest;

pub fn render_to_path(request: &ExportSinglePhotoRequest) -> Result<(), String> {
    let Some(svg_template) = request.svg_template.as_ref() else {
        return Err("缺少 SVG 模板：前端未生成水印图层".to_string());
    };
    crate::render::svg_export::render_svg_export(
        &request.photo_path,
        svg_template,
        &request.output_path,
        request.frame_params.export_quality,
    )
}
