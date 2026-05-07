use std::{env, path::PathBuf};

use painting_box_lib::{
    commands::photos::{
        export_single_photo, load_photo_preview, load_photos, ExportSinglePhotoRequest,
    },
    render::classic_bottom::{ExportFrameParams, ExportTemplateConfig},
};
use tauri::async_runtime::block_on;

fn sample_path() -> PathBuf {
    PathBuf::from(
        env::var("PHASE2_SAMPLE_PATH").expect("PHASE2_SAMPLE_PATH must be set"),
    )
}

#[test]
fn jpg_import_and_export_pipeline_works() {
    block_on(async {
        let sample = sample_path();
        let response = load_photos(vec![sample.display().to_string()]).await;

        assert!(
            response.errors.is_empty(),
            "import errors: {:?}",
            response.errors
                .iter()
                .map(|e| format!("{}: {}", e.path, e.message))
                .collect::<Vec<_>>()
        );
        assert_eq!(response.photos.len(), 1);

        let photo = &response.photos[0];
        let preview = load_photo_preview(photo.path.clone())
            .await
            .expect("preview should load");
        assert!(!preview.thumbnail_data_url.is_empty());
        assert!(preview.width > 0);
        assert!(preview.height > 0);

        let output = env::temp_dir().join("painting-box-phase2-smoke-export.jpg");
        let request = ExportSinglePhotoRequest {
            photo_path: photo.path.clone(),
            output_path: output.display().to_string(),
            template_kind: "classic-bottom".to_string(),
            frame_params: ExportFrameParams {
                info_bar_height: 160,
                main_image_width_ratio: 90.0,
                min_top_bottom_margin: 2.0,
                inner_radius: 16,
                shadow: true,
                shadow_blur: 24,
                shadow_offset_y: 10.0,
                shadow_opacity: 20,
                photo_border: 0,
                photo_border_color: String::new(),
                photo_border_style: String::new(),
                background: "white".to_string(),
                bg_color: "#ffffff".to_string(),
                text_color: "#1f2937".to_string(),
                logo_key: String::new(),
                logo_variant: "original".to_string(),
                logo_size: 28,
                logo_gap: 12,
                font_family: "pingfang-sc".to_string(),
                font_size: 22,
                auto_text_contrast: true,
                divider_show: true,
                divider_color: "#d7dce6".to_string(),
                canvas_ratio: "auto".to_string(),
                canvas_orientation: "landscape".to_string(),
                export_quality: 92,
            },
            exif: None,
            config: ExportTemplateConfig {
                show_watermark: true,
                show_logo: true,
                show_camera: true,
                show_lens: true,
                show_params: true,
                watermark_template: None,
                show_date: false,
                date_format: String::new(),
                custom_lines: Vec::new(),
            },
            svg_template: None,
        };

        let result = export_single_photo(request)
            .await
            .expect("export should succeed");
        let output_path = PathBuf::from(result.output_path);
        assert!(output_path.exists());
        let metadata = std::fs::metadata(&output_path).expect("exported file metadata");
        assert!(metadata.len() > 0);

        let _ = std::fs::remove_file(output_path);
    });
}
