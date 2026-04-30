use std::path::Path;
use std::sync::Arc;

use base64::Engine;
use resvg::{tiny_skia, usvg};

use crate::images::decode_image;

const PHOTO_PLACEHOLDER: &str = "__FUJI_PHOTO__";

/// Load photo from `photo_path`, encode as base64, replace `__FUJI_PHOTO__` in the
/// SVG template, render via resvg, and write the result to `output_path`.
pub fn render_svg_export(
    photo_path: &str,
    svg_template: &str,
    output_path: &str,
    quality: u8,
) -> Result<(), String> {
    let img = decode_image(Path::new(photo_path)).map_err(|e| format!("load photo: {e}"))?;

    // Encode as JPEG data URL.
    let mut jpeg_buf: Vec<u8> = Vec::new();
    {
        use image::codecs::jpeg::JpegEncoder;
        let mut enc = JpegEncoder::new_with_quality(&mut jpeg_buf, 92);
        let rgb = img.to_rgb8();
        enc.encode_image(&rgb).map_err(|e| format!("encode photo: {e}"))?;
    }
    let b64 = base64::engine::general_purpose::STANDARD.encode(&jpeg_buf);
    let data_url = format!("data:image/jpeg;base64,{b64}");
    let svg = svg_template.replace(PHOTO_PLACEHOLDER, &data_url);

    let fonts_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("fonts");
    let mut db = usvg::fontdb::Database::new();
    db.load_fonts_dir(&fonts_dir);

    let opt = usvg::Options {
        fontdb: Arc::new(db),
        font_family: "Inter".to_string(),
        ..Default::default()
    };

    let tree = usvg::Tree::from_str(&svg, &opt).map_err(|e| format!("parse svg: {e}"))?;
    let size = tree.size().to_int_size();

    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or_else(|| "alloc pixmap failed".to_string())?;
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());

    let rgba = image::RgbaImage::from_raw(size.width(), size.height(), pixmap.take())
        .ok_or_else(|| "pixmap→image conversion failed".to_string())?;

    crate::render::classic_bottom::save_image(&rgba, Path::new(output_path), quality)
}
