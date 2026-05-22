//! Image encoding + disk write. Format dispatched from output path extension.

use std::{fs::File, io::BufWriter, path::Path};

use image::{DynamicImage, ImageFormat, RgbaImage};

pub fn save_image(image: &RgbaImage, path: &Path, quality: u8) -> Result<(), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_else(|| "png".into());

    let file = File::create(path).map_err(|e| format!("无法创建导出文件：{e}"))?;
    let mut w = BufWriter::new(file);
    let q = quality.clamp(60, 100);

    match ext.as_str() {
        "jpg" | "jpeg" => {
            let jpeg = turbojpeg::compress_image(image, q as i32, turbojpeg::Subsamp::None)
                .map_err(|e| format!("JPEG 导出失败：{e}"))?;
            std::io::Write::write_all(&mut w, &jpeg)
                .map_err(|e| format!("JPEG 写入失败：{e}"))?;
        }
        "webp" => {
            DynamicImage::ImageRgba8(image.clone())
                .write_to(&mut w, ImageFormat::WebP)
                .map_err(|e| format!("WebP 导出失败：{e}"))?;
        }
        _ => {
            DynamicImage::ImageRgba8(image.clone())
                .write_to(&mut w, ImageFormat::Png)
                .map_err(|e| format!("PNG 导出失败：{e}"))?;
        }
    }
    Ok(())
}
