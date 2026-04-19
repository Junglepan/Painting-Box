use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use image::{DynamicImage, ImageReader};
use uuid::Uuid;

pub fn decode_image(path: &Path) -> Result<DynamicImage, String> {
    if is_heic(path) {
        return decode_heic(path);
    }

    ImageReader::open(path)
        .map_err(|err| format!("无法打开图片：{err}"))?
        .with_guessed_format()
        .map_err(|err| format!("无法识别图片格式：{err}"))?
        .decode()
        .map_err(|err| format!("暂不支持该图片编码：{err}"))
}

pub fn supported_extension(path: &Path) -> Result<String, String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .ok_or_else(|| "文件缺少扩展名".to_string())
}

pub fn is_heic(path: &Path) -> bool {
    matches!(supported_extension(path).ok().as_deref(), Some("heic"))
}

fn decode_heic(path: &Path) -> Result<DynamicImage, String> {
    #[cfg(target_os = "macos")]
    {
        let temp_path = temp_png_path();
        let status = Command::new("/usr/bin/sips")
            .arg("-s")
            .arg("format")
            .arg("png")
            .arg(path)
            .arg("--out")
            .arg(&temp_path)
            .status()
            .map_err(|err| format!("HEIC 转换失败：{err}"))?;

        if !status.success() {
            let _ = fs::remove_file(&temp_path);
            return Err("当前系统无法解码该 HEIC 文件".to_string());
        }

        let result = ImageReader::open(&temp_path)
            .map_err(|err| format!("无法读取转换后的 HEIC 图片：{err}"))?
            .with_guessed_format()
            .map_err(|err| format!("无法识别转换后的 HEIC 图片格式：{err}"))?
            .decode()
            .map_err(|err| format!("转换后的 HEIC 图片解码失败：{err}"));

        let _ = fs::remove_file(&temp_path);
        result
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("当前构建暂未接入 HEIC 解码".to_string())
    }
}

fn temp_png_path() -> PathBuf {
    env::temp_dir().join(format!("painting-box-{}.png", Uuid::new_v4()))
}
