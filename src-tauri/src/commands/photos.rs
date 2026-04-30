use std::{
    path::{Path, PathBuf},
    sync::atomic::{AtomicUsize, Ordering},
};

use base64::{engine::general_purpose::STANDARD, Engine};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use uuid::Uuid;

use crate::exif::{read_exif, ExifData};
use crate::images::{decode_image, supported_extension};
use crate::render::classic_bottom::{ExportExif, ExportFrameParams, ExportTemplateConfig};
use crate::render::compose::render_to_path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoImportError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoRecord {
    pub id: String,
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoPreviewRecord {
    pub thumbnail_data_url: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadPhotosResponse {
    pub photos: Vec<PhotoRecord>,
    pub errors: Vec<PhotoImportError>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSinglePhotoRequest {
    pub photo_path: String,
    pub output_path: String,
    pub template_kind: String,
    pub frame_params: ExportFrameParams,
    pub exif: Option<ExportExif>,
    pub config: ExportTemplateConfig,
    /// Pre-built SVG template (with `__FUJI_PHOTO__` placeholder) for SVG-path export.
    /// When present, bypasses the image-crate renderer and uses resvg instead.
    pub svg_template: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSinglePhotoResult {
    pub output_path: String,
}

#[tauri::command]
pub async fn load_photos(paths: Vec<String>) -> LoadPhotosResponse {
    tauri::async_runtime::spawn_blocking(move || {
        let mut photos = Vec::new();
        let mut errors = Vec::new();

        for path in paths {
            match load_photo(Path::new(&path)) {
                Ok(photo) => photos.push(photo),
                Err(message) => errors.push(PhotoImportError { path, message }),
            }
        }

        LoadPhotosResponse { photos, errors }
    })
    .await
    .unwrap_or_else(|_| LoadPhotosResponse {
        photos: Vec::new(),
        errors: vec![PhotoImportError {
            path: String::new(),
            message: "导入任务执行失败".to_string(),
        }],
    })
}

#[tauri::command]
pub async fn export_single_photo(
    request: ExportSinglePhotoRequest,
) -> Result<ExportSinglePhotoResult, String> {
    let output_path = request.output_path.clone();
    tauri::async_runtime::spawn_blocking(move || render_to_path(&request))
        .await
        .map_err(|err| format!("导出任务执行失败：{err}"))??;

    Ok(ExportSinglePhotoResult { output_path })
}

/// Exports multiple photos in parallel using Rayon.
/// Emits `"export-progress"` events: `{ jobId, completed, total, outputPath?, error? }`.
#[tauri::command]
pub async fn export_batch_photos(
    requests: Vec<ExportBatchRequest>,
    app: tauri::AppHandle,
) -> Vec<ExportBatchResult> {
    let total = requests.len();
    tauri::async_runtime::spawn_blocking(move || {
        let completed = AtomicUsize::new(0);
        requests
            .into_par_iter()
            .map(|req| {
                let job_id = req.job_id.clone();
                let output_path = req.request.output_path.clone();
                let result = render_to_path(&req.request);
                let done = completed.fetch_add(1, Ordering::Relaxed) + 1;
                let (ok_path, err_msg) = match &result {
                    Ok(_) => (Some(output_path.clone()), None),
                    Err(e) => (None, Some(e.clone())),
                };
                let _ = app.emit(
                    "export-progress",
                    serde_json::json!({
                        "jobId": job_id,
                        "completed": done,
                        "total": total,
                        "outputPath": ok_path,
                        "error": err_msg,
                    }),
                );
                ExportBatchResult {
                    job_id,
                    output_path: result.ok().map(|_| output_path),
                    error: err_msg,
                }
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBatchRequest {
    pub job_id: String,
    pub request: ExportSinglePhotoRequest,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportBatchResult {
    pub job_id: String,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn load_photo_exif(path: String) -> Result<ExifData, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = PathBuf::from(path);
        ensure_supported(&path)?;
        Ok(read_exif(&path))
    })
    .await
    .map_err(|err| format!("EXIF 任务执行失败：{err}"))?
}

#[tauri::command]
pub async fn load_photo_preview(path: String) -> Result<PhotoPreviewRecord, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = PathBuf::from(path);
        ensure_supported(&path)?;
        build_preview(&path)
    })
    .await
    .map_err(|err| format!("预览任务执行失败：{err}"))?
}

fn load_photo(path: &Path) -> Result<PhotoRecord, String> {
    ensure_supported(path)?;
    let path_str = normalize_path(path)?;
    Ok(PhotoRecord {
        id: Uuid::new_v4().to_string(),
        path: path_str,
    })
}

fn build_preview(path: &Path) -> Result<PhotoPreviewRecord, String> {
    use fast_image_resize::{
        images::{Image, ImageRef},
        FilterType, PixelType, ResizeAlg, ResizeOptions, Resizer,
    };

    let image = decode_image(path)?;
    let width = image.width();
    let height = image.height();

    let (thumb_w, thumb_h) = thumbnail_dims(width, height, 1200);
    let src = image.into_rgba8();

    let src_ref = ImageRef::new(width, height, src.as_raw(), PixelType::U8x4)
        .map_err(|e| format!("缩略图初始化失败：{e}"))?;
    let mut dst = Image::new(thumb_w, thumb_h, PixelType::U8x4);
    let opts = ResizeOptions::new().resize_alg(ResizeAlg::Convolution(FilterType::Box));

    Resizer::new()
        .resize(&src_ref, &mut dst, &opts)
        .map_err(|e| format!("缩略图缩放失败：{e}"))?;

    let thumb = image::RgbaImage::from_raw(thumb_w, thumb_h, dst.into_vec())
        .ok_or_else(|| "缩略图转换失败".to_string())?;

    let jpeg = turbojpeg::compress_image(&thumb, 85, turbojpeg::Subsamp::Sub2x2)
        .map_err(|err| format!("缩略图编码失败：{err}"))?;

    Ok(PhotoPreviewRecord {
        thumbnail_data_url: format!(
            "data:image/jpeg;base64,{}",
            STANDARD.encode(&jpeg)
        ),
        width,
        height,
    })
}

fn thumbnail_dims(w: u32, h: u32, max: u32) -> (u32, u32) {
    if w <= max && h <= max {
        return (w, h);
    }
    if w >= h {
        (max, ((h as f64 / w as f64) * max as f64).round().max(1.0) as u32)
    } else {
        (((w as f64 / h as f64) * max as f64).round().max(1.0) as u32, max)
    }
}

fn ensure_supported(path: &Path) -> Result<(), String> {
    let ext = supported_extension(path)?;

    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "heic" => Ok(()),
        _ => Err("仅支持 JPG / JPEG / PNG / HEIC".to_string()),
    }
}

fn normalize_path(path: &Path) -> Result<String, String> {
    path.canonicalize()
        .unwrap_or_else(|_| PathBuf::from(path))
        .to_str()
        .map(ToOwned::to_owned)
        .ok_or_else(|| "文件路径包含无效字符".to_string())
}
