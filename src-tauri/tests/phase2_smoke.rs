//! IPC smoke test: import → preview → SVG-path export.
//!
//! The frontend (`src/lib/watermark/svg/templates.ts`) builds the actual SVG
//! per template. This test embeds a minimal SVG that exercises the same
//! resvg pipeline without depending on TS code.

use std::{env, path::PathBuf};

use painting_box_lib::{
    commands::photos::{
        export_single_photo, load_photo_preview, load_photos, ExportSinglePhotoRequest,
    },
    render::types::{ExportExif, ExportFrameParams, ExportTemplateConfig},
};
use tauri::async_runtime::block_on;

fn sample_path() -> PathBuf {
    PathBuf::from(env::var("PHASE2_SAMPLE_PATH").expect("PHASE2_SAMPLE_PATH must be set"))
}

fn minimal_svg_template() -> String {
    // Mirrors the structure the TS generator emits: photo placeholder + a
    // single watermark text element. resvg resolves `__FUJI_PHOTO__` to the
    // photo file via the custom href resolver in svg_export.rs.
    r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="600" viewBox="0 0 900 600">
<rect width="900" height="600" fill="#ffffff"/>
<image x="0" y="0" width="900" height="540" href="__FUJI_PHOTO__" xlink:href="__FUJI_PHOTO__" preserveAspectRatio="xMidYMid slice"/>
<text x="450" y="575" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#1f2937">painting-box smoke</text>
</svg>"##.to_string()
}

fn default_frame_params() -> ExportFrameParams {
    ExportFrameParams {
        info_bar_height: 160,
        main_image_width_ratio: 90.0,
        min_top_bottom_margin: 2.0,
        inner_radius: 0,
        shadow: false,
        shadow_blur: 0,
        shadow_offset_y: 0.0,
        shadow_opacity: 0,
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
        font_family: "inter".to_string(),
        font_size: 14,
        auto_text_contrast: true,
        divider_show: false,
        divider_color: String::new(),
        canvas_ratio: "3:2".to_string(),
        canvas_orientation: "landscape".to_string(),
        export_quality: 92,
        crop_ratio: "original".to_string(),
        crop_position: 50.0,
    }
}

fn default_config() -> ExportTemplateConfig {
    ExportTemplateConfig {
        show_watermark: true,
        show_logo: false,
        show_camera: true,
        show_lens: true,
        show_params: true,
        watermark_template: None,
        show_date: false,
        date_format: String::new(),
        custom_lines: Vec::new(),
    }
}

#[test]
fn jpg_import_and_export_pipeline_works() {
    block_on(async {
        let sample = sample_path();
        let response = load_photos(vec![sample.display().to_string()]).await;

        assert!(
            response.errors.is_empty(),
            "import errors: {:?}",
            response
                .errors
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
            frame_params: default_frame_params(),
            exif: Some(ExportExif {
                camera: painting_box_lib::render::types::ExportCamera {
                    make: "TEST".to_string(),
                    model: "SMOKE".to_string(),
                },
                lens: String::new(),
                iso: 100,
                aperture: 2.8,
                shutter_speed: "1/125".to_string(),
                focal_length: 35.0,
                taken_at: String::new(),
                gps: None,
            }),
            config: default_config(),
            svg_template: Some(minimal_svg_template()),
        };

        let result = export_single_photo(request).await.expect("export should succeed");
        let output_path = PathBuf::from(result.output_path);
        assert!(output_path.exists());
        let metadata = std::fs::metadata(&output_path).expect("exported file metadata");
        assert!(metadata.len() > 0);

        let _ = std::fs::remove_file(output_path);
    });
}

#[test]
fn export_without_svg_template_returns_error() {
    block_on(async {
        let sample = sample_path();
        let response = load_photos(vec![sample.display().to_string()]).await;
        let photo = &response.photos[0];
        let output = env::temp_dir().join("painting-box-no-svg.jpg");
        let request = ExportSinglePhotoRequest {
            photo_path: photo.path.clone(),
            output_path: output.display().to_string(),
            template_kind: "classic-bottom".to_string(),
            frame_params: default_frame_params(),
            exif: None,
            config: default_config(),
            svg_template: None,
        };
        let err = export_single_photo(request).await.expect_err("should error when svg_template missing");
        assert!(err.contains("SVG"), "expected SVG-related error, got: {err}");
    });
}
