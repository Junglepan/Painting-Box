use std::{collections::HashMap, sync::OnceLock};

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkLayoutSpec {
    pub primary_font_scale: f32,
    pub secondary_font_scale: f32,
    pub base_min_primary_font_size: f32,
    pub base_min_secondary_font_size: f32,
    pub base_line_gap_px: f32,
    pub logo_visual_scale: f32,
    pub logo_font_scale_base: f32,
    pub logo_baseline_offset_ratio: f32,
    pub divider_horizontal_margin_px: f32,
    pub corner_padding_px: f32,
    pub logo_only_lift_templates: Vec<String>,
    pub readability_threshold_luma: f32,
    pub readability_dark_text_color: String,
    pub readability_dark_divider_color: String,
    pub readability_light_text_color: String,
    pub readability_light_divider_color: String,
}

pub fn watermark_layout_spec() -> &'static WatermarkLayoutSpec {
    static SPEC: OnceLock<WatermarkLayoutSpec> = OnceLock::new();
    SPEC.get_or_init(|| {
        serde_json::from_str(include_str!("../../../src/shared/watermark-layout-spec.json"))
            .expect("invalid shared watermark-layout-spec.json")
    })
}

pub fn logo_catalog() -> &'static HashMap<String, HashMap<String, String>> {
    static CATALOG: OnceLock<HashMap<String, HashMap<String, String>>> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(include_str!("../../../src/shared/logo-catalog.json"))
            .expect("invalid shared logo-catalog.json")
    })
}
