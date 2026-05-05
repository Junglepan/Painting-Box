use std::path::Path;
use std::sync::Arc;

use resvg::{tiny_skia, usvg};

use crate::images::decode_image;

const PHOTO_PLACEHOLDER: &str = "__FUJI_PHOTO__";

/// Load photo from `photo_path`, resolve `__FUJI_PHOTO__` as an in-memory image,
/// render the SVG template via resvg, and write the result to `output_path`.
pub fn render_svg_export(
    photo_path: &str,
    svg_template: &str,
    output_path: &str,
    quality: u8,
) -> Result<(), String> {
    let img = decode_image(Path::new(photo_path)).map_err(|e| format!("load photo: {e}"))?;

    // Encode the decoded source once; usvg resolves the placeholder to these bytes.
    let mut jpeg_buf: Vec<u8> = Vec::new();
    {
        use image::codecs::jpeg::JpegEncoder;
        let mut enc = JpegEncoder::new_with_quality(&mut jpeg_buf, 92);
        let rgb = img.to_rgb8();
        enc.encode_image(&rgb).map_err(|e| format!("encode photo: {e}"))?;
    }
    let photo_bytes = Arc::new(jpeg_buf);

    let mut db = usvg::fontdb::Database::new();
    db.load_system_fonts();
    #[cfg(bundled_inter)]
    {
        db.load_font_data(include_bytes!("../../fonts/inter-regular.ttf").to_vec());
        db.load_font_data(include_bytes!("../../fonts/inter-bold.ttf").to_vec());
    }
    #[cfg(bundled_noto_sans_sc)]
    {
        db.load_font_data(include_bytes!("../../fonts/noto-sans-sc-regular.ttf").to_vec());
        db.load_font_data(include_bytes!("../../fonts/noto-sans-sc-bold.ttf").to_vec());
    }
    #[cfg(bundled_playfair_display)]
    {
        db.load_font_data(include_bytes!("../../fonts/playfair-display-regular.ttf").to_vec());
        db.load_font_data(include_bytes!("../../fonts/playfair-display-bold.ttf").to_vec());
    }
    #[cfg(bundled_bebas_neue)]
    {
        db.load_font_data(include_bytes!("../../fonts/bebas-neue-regular.ttf").to_vec());
    }

    let default_data_resolver = usvg::ImageHrefResolver::default_data_resolver();
    let default_string_resolver = usvg::ImageHrefResolver::default_string_resolver();
    let photo_resolver_bytes = photo_bytes.clone();

    let opt = usvg::Options {
        fontdb: Arc::new(db),
        font_family: "Inter".to_string(),
        image_href_resolver: usvg::ImageHrefResolver {
            resolve_data: default_data_resolver,
            resolve_string: Box::new(move |href, opts| {
                if href == PHOTO_PLACEHOLDER {
                    Some(usvg::ImageKind::JPEG(photo_resolver_bytes.clone()))
                } else {
                    default_string_resolver(href, opts)
                }
            }),
        },
        ..Default::default()
    };

    let tree = usvg::Tree::from_str(svg_template, &opt).map_err(|e| format!("parse svg: {e}"))?;
    let size = tree.size().to_int_size();

    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or_else(|| "alloc pixmap failed".to_string())?;
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());

    let rgba = image::RgbaImage::from_raw(size.width(), size.height(), pixmap.take())
        .ok_or_else(|| "pixmap→image conversion failed".to_string())?;

    crate::render::classic_bottom::save_image(&rgba, Path::new(output_path), quality)
}

#[cfg(test)]
mod tests {
    use super::render_svg_export;
    use image::{Rgba, RgbaImage};

    #[test]
    fn resolves_photo_placeholder_without_data_url_replacement() {
        let dir = std::env::temp_dir();
        let suffix = format!(
            "{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock before unix epoch")
                .as_nanos()
        );
        let source = dir.join(format!("painting-box-svg-source-{suffix}.png"));
        let output = dir.join(format!("painting-box-svg-output-{suffix}.png"));

        let source_image = RgbaImage::from_pixel(8, 8, Rgba([240, 8, 8, 255]));
        source_image.save(&source).expect("write source image");

        let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="8" height="8" viewBox="0 0 8 8">
  <rect x="0" y="0" width="8" height="8" fill="#ffffff"/>
  <image x="0" y="0" width="8" height="8" href="__FUJI_PHOTO__" xlink:href="__FUJI_PHOTO__" preserveAspectRatio="none"/>
</svg>"##;

        render_svg_export(
            &source.to_string_lossy(),
            svg,
            &output.to_string_lossy(),
            92,
        )
        .expect("render svg export");

        let rendered = image::open(&output).expect("read rendered image").to_rgba8();
        let center = rendered.get_pixel(4, 4);
        assert!(center[0] > 180, "expected red photo pixel, got {center:?}");
        assert!(center[1] < 100, "expected low green channel, got {center:?}");
        assert!(center[2] < 100, "expected low blue channel, got {center:?}");

        let _ = std::fs::remove_file(source);
        let _ = std::fs::remove_file(output);
    }

    #[test]
    fn renders_svg_text_with_bundled_fonts() {
        let dir = std::env::temp_dir();
        let suffix = format!(
            "{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock before unix epoch")
                .as_nanos()
        );
        let source = dir.join(format!("painting-box-svg-text-source-{suffix}.png"));
        let output = dir.join(format!("painting-box-svg-text-output-{suffix}.png"));

        let source_image = RgbaImage::from_pixel(8, 8, Rgba([255, 255, 255, 255]));
        source_image.save(&source).expect("write source image");

        let svg = r##"<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
  <rect x="0" y="0" width="240" height="80" fill="#ffffff"/>
  <text x="12" y="52" font-family="PingFang SC, Noto Sans SC, sans-serif" font-weight="700" font-size="40" fill="#111827">Z 7II</text>
</svg>"##;

        render_svg_export(
            &source.to_string_lossy(),
            svg,
            &output.to_string_lossy(),
            92,
        )
        .expect("render svg export");

        let rendered = image::open(&output).expect("read rendered image").to_rgba8();
        let dark_pixels = rendered
            .pixels()
            .filter(|pixel| pixel[0] < 80 && pixel[1] < 90 && pixel[2] < 110)
            .count();
        assert!(dark_pixels > 80, "expected rendered text pixels, got {dark_pixels}");

        let _ = std::fs::remove_file(source);
        let _ = std::fs::remove_file(output);
    }
}
