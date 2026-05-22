//! IPC contract types. Serde-deserialized from the frontend export request.
//!
//! These structs are kept in a dedicated module (not in any renderer file) so
//! they survive any future renderer refactor — they belong to the IPC layer.

use serde::Deserialize;

use crate::exif::{CameraInfo, ExifData, GpsInfo};

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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTemplateConfig {
    pub show_watermark: bool,
    pub show_logo: bool,
    pub show_camera: bool,
    pub show_lens: bool,
    pub show_params: bool,
    pub watermark_template: Option<Vec<String>>,
    #[serde(default)]
    pub show_date: bool,
    #[serde(default)]
    pub date_format: String,
    #[serde(default)]
    pub custom_lines: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFrameParams {
    pub info_bar_height: u32,
    pub main_image_width_ratio: f32,
    pub min_top_bottom_margin: f32,
    pub inner_radius: u32,
    pub shadow: bool,
    pub shadow_blur: u32,
    pub shadow_offset_y: f32,
    pub shadow_opacity: u32,
    pub photo_border: u32,
    #[serde(default)]
    pub photo_border_color: String,
    #[serde(default)]
    pub photo_border_style: String,
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
    pub canvas_orientation: String,
    pub export_quality: u8,
    #[serde(default = "default_crop_ratio")]
    pub crop_ratio: String,
    #[serde(default = "default_crop_position")]
    pub crop_position: f32,
}

fn default_crop_ratio() -> String {
    "original".to_string()
}

fn default_crop_position() -> f32 {
    50.0
}
