//! End-to-end POC for Fujifilm Classic: SVG-as-source-of-truth + resvg.
//!
//! Generates a Fujifilm Classic SVG using the same geometry as the existing
//! Canvas/image-crate paths. Renders it via resvg and dumps the PNG. A
//! companion run uses the legacy `compose_fujifilm_classic` Rust renderer
//! so the two can be compared side-by-side.

use std::path::PathBuf;
use std::sync::Arc;

use base64::Engine;
use image::imageops::{resize, FilterType};
use image::DynamicImage;
use painting_box_lib::render::classic_bottom::{
    ExportCamera, ExportExif, ExportFrameParams, ExportTemplateConfig,
};
use resvg::{tiny_skia, usvg};

const FIXTURE_PHOTO: &str = "../public/images/preview-default.jpg";
const FONTS_DIR: &str = "fonts";
const CANVAS_W: f32 = 900.0;

fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn output_dir() -> PathBuf {
    let dir = project_root().join("tests").join("output");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn load_photo_data_url() -> (String, u32, u32) {
    let path = project_root().join(FIXTURE_PHOTO);
    let img = image::open(&path).expect("open jpg");
    let (w, h) = (img.width(), img.height());
    // Resize to 900px wide for parity with TS preview baseline.
    let target_w = 900u32;
    let target_h = (h as f32 * (target_w as f32 / w as f32)).round() as u32;
    let resized = resize(&img.to_rgb8(), target_w, target_h, FilterType::Lanczos3);
    let mut buf = Vec::new();
    {
        use image::codecs::jpeg::JpegEncoder;
        let mut enc = JpegEncoder::new_with_quality(&mut buf, 92);
        enc.encode(
            resized.as_raw(),
            target_w,
            target_h,
            image::ExtendedColorType::Rgb8,
        )
        .expect("encode jpg");
    }
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    (
        format!("data:image/jpeg;base64,{}", b64),
        target_w,
        target_h,
    )
}

fn load_fontdb() -> usvg::fontdb::Database {
    let mut db = usvg::fontdb::Database::new();
    db.load_fonts_dir(project_root().join(FONTS_DIR));
    db
}

fn canvas_ratio_value(canvas_ratio: &str, orientation: &str) -> f32 {
    let parts: Vec<&str> = canvas_ratio.split(':').collect();
    if parts.len() != 2 {
        return 3.0 / 2.0;
    }
    let rw: f32 = parts[0].parse().unwrap_or(3.0);
    let rh: f32 = parts[1].parse().unwrap_or(2.0);
    if orientation == "portrait" {
        rh / rw
    } else {
        rw / rh
    }
}

fn fit_photo(area_w: f32, area_h: f32, photo_w: f32, photo_h: f32) -> (f32, f32, f32, f32) {
    let photo_ratio = photo_w / photo_h;
    let area_ratio = area_w / area_h;
    let (w, h) = if photo_ratio > area_ratio {
        (area_w, area_w / photo_ratio)
    } else {
        (area_h * photo_ratio, area_h)
    };
    let x = (area_w - w) / 2.0;
    let y = (area_h - h) / 2.0;
    (x, y, w, h)
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Build the Fujifilm Classic template as a complete SVG document.
/// Geometry mirrors `src/lib/watermark/svg/fujifilm-classic.ts` exactly so
/// the same SVG can drive both browser preview and resvg export.
fn build_fujifilm_classic_svg(
    photo_data_url: &str,
    photo_w: u32,
    photo_h: u32,
    frame: &ExportFrameParams,
    exif: &ExportExif,
    config: &ExportTemplateConfig,
) -> String {
    let canvas_w = CANVAS_W;
    let ratio = canvas_ratio_value(&frame.canvas_ratio, &frame.canvas_orientation);
    let canvas_h = canvas_w / ratio;

    let side_margin = canvas_w * 0.05;
    let top_margin = canvas_h * 0.05;
    let watermark_active = config.show_watermark;
    let caption_h = if watermark_active {
        (canvas_h * 0.16).max(96.0)
    } else {
        canvas_h * 0.05
    };

    let area_w = canvas_w - side_margin * 2.0;
    let area_h = canvas_h - top_margin - caption_h;
    let (ox, oy, pw, ph) = fit_photo(area_w, area_h, photo_w as f32, photo_h as f32);
    let placed_x = side_margin + ox;
    let placed_y = top_margin + oy;

    // SVG header + paper background.
    let mut svg = String::new();
    svg.push_str(&format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="{cw}" height="{ch}" viewBox="0 0 {cw} {ch}">
<rect width="{cw}" height="{ch}" fill="#f5f1e7"/>
<image x="{px}" y="{py}" width="{pw}" height="{ph}" href="{photo}" preserveAspectRatio="none"/>
"##,
        cw = canvas_w,
        ch = canvas_h,
        px = placed_x,
        py = placed_y,
        pw = pw,
        ph = ph,
        photo = photo_data_url,
    ));

    if !watermark_active {
        svg.push_str("</svg>");
        return svg;
    }

    let caption_top = placed_y + ph + canvas_h * 0.03;
    let wordmark_size = (frame.font_size as f32 * 1.7).max(20.0);
    let wordmark_baseline = caption_top + wordmark_size * 0.85;
    let detail_size = (frame.font_size as f32).max(11.0);
    let params_size = (frame.font_size as f32 * 1.2).max(13.0);
    let detail_gap = (frame.font_size as f32 * 1.6).max(20.0);
    let detail_baseline = wordmark_baseline + detail_gap;

    // FUJIFILM wordmark — TS uses 900 weight, alphabetic baseline.
    svg.push_str(&format!(
        r##"<text x="{x}" y="{y}" font-family="Inter" font-weight="900" font-size="{sz}" fill="#00643f">FUJIFILM</text>
"##,
        x = placed_x,
        y = wordmark_baseline,
        sz = wordmark_size,
    ));

    // Approximate FUJIFILM advance width using a fixed pseudo-em ratio. Browser
    // and resvg will measure the same TTF, so this is just for pill placement.
    // We use 8 chars * 0.62 em as a safe estimate for Inter Black.
    let pill_text = config
        .custom_lines
        .first()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_uppercase())
        .unwrap_or_else(|| "CLASSIC CHROME".to_string());
    let pill_size = (frame.font_size as f32 - 1.0).max(10.0);
    let approx_word_w = wordmark_size * 0.62 * 8.0;
    // `textLength` adoption: rely on resvg/browser to measure exactly. We
    // place the pill at fixed offset; if text wraps it'll wrap consistently.
    let pill_h = pill_size * 1.9;
    let pill_w = pill_size * (pill_text.len() as f32) * 0.62 + pill_size * 1.4;
    let pill_x = placed_x + approx_word_w + pill_size * 0.9;
    let pill_y = wordmark_baseline - pill_h * 0.78;

    svg.push_str(&format!(
        r##"<g>
  <rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="{r}" ry="{r}" fill="#00643f"/>
  <text x="{tx}" y="{ty}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="{sz}" fill="#ffffff">{label}</text>
</g>
"##,
        px = pill_x,
        py = pill_y,
        pw = pill_w,
        ph = pill_h,
        r = pill_h / 2.0,
        tx = pill_x + pill_w / 2.0,
        ty = pill_y + pill_h / 2.0 + pill_size * 0.35,
        sz = pill_size,
        label = xml_escape(&pill_text),
    ));

    // Camera + lens detail row (left, muted).
    let camera = if config.show_camera {
        format!("{} {}", exif.camera.make.trim(), exif.camera.model.trim())
            .trim()
            .to_string()
    } else {
        String::new()
    };
    let lens = if config.show_lens {
        exif.lens.trim().trim_matches('"').to_string()
    } else {
        String::new()
    };
    let detail = [camera, lens]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("  \u{00B7}  ");
    if !detail.is_empty() {
        svg.push_str(&format!(
            r##"<text x="{x}" y="{y}" font-family="Inter" font-weight="500" font-size="{sz}" fill="#5a5650">{text}</text>
"##,
            x = placed_x,
            y = detail_baseline,
            sz = detail_size,
            text = xml_escape(&detail),
        ));
    }

    // Right column: params + date.
    let right_x = placed_x + pw;
    let params = if config.show_params {
        let mut items: Vec<String> = Vec::new();
        if exif.focal_length > 0.0 {
            items.push(format!("{}mm", exif.focal_length.round() as i64));
        }
        if exif.aperture > 0.0 {
            let f = if exif.aperture.fract() == 0.0 {
                format!("f/{}", exif.aperture as i64)
            } else {
                format!("f/{:.1}", exif.aperture)
            };
            items.push(f);
        }
        if !exif.shutter_speed.is_empty() {
            items.push(exif.shutter_speed.clone());
        }
        if exif.iso > 0 {
            items.push(format!("ISO {}", exif.iso));
        }
        items.join("  /  ")
    } else {
        String::new()
    };
    let date = if config.show_date && !exif.taken_at.is_empty() {
        let cleaned: String = exif
            .taken_at
            .chars()
            .map(|c| if c == ':' { '-' } else { c })
            .collect();
        cleaned
            .split_whitespace()
            .next()
            .unwrap_or(&cleaned)
            .to_string()
    } else {
        String::new()
    };

    if !params.is_empty() {
        svg.push_str(&format!(
            r##"<text x="{x}" y="{y}" text-anchor="end" font-family="Inter" font-weight="700" font-size="{sz}" fill="#161616">{text}</text>
"##,
            x = right_x,
            y = wordmark_baseline,
            sz = params_size,
            text = xml_escape(&params),
        ));
    }
    if !date.is_empty() {
        svg.push_str(&format!(
            r##"<text x="{x}" y="{y}" text-anchor="end" font-family="Inter" font-weight="500" font-size="{sz}" fill="#5a5650">{text}</text>
"##,
            x = right_x,
            y = detail_baseline,
            sz = detail_size,
            text = xml_escape(&date),
        ));
    }

    svg.push_str("</svg>");
    svg
}

fn render_svg(svg: &str) -> tiny_skia::Pixmap {
    let mut opt = usvg::Options::default();
    opt.fontdb = Arc::new(load_fontdb());
    opt.font_family = "Inter".to_string();
    let tree = usvg::Tree::from_str(svg, &opt).expect("parse svg");
    let size = tree.size().to_int_size();
    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height()).expect("alloc");
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    pixmap
}

fn make_test_inputs() -> (ExportFrameParams, ExportExif, ExportTemplateConfig) {
    let frame = ExportFrameParams {
        info_bar_height: 160,
        main_image_width_ratio: 90.0,
        min_top_bottom_margin: 2.0,
        text_margin: 0.4,
        watermark_top_padding: 0.0,
        watermark_bottom_padding: 0.0,
        inner_radius: 0,
        outer_radius: 0,
        shadow: false,
        shadow_blur: 0,
        shadow_offset_y: 0.0,
        shadow_opacity: 0,
        photo_border: 0,
        photo_border_color: String::new(),
        photo_border_style: String::new(),
        background: "#f5f1e7".to_string(),
        bg_color: "#f5f1e7".to_string(),
        text_color: "#161616".to_string(),
        logo_key: String::new(),
        logo_variant: String::new(),
        logo_size: 0,
        logo_gap: 0,
        font_family: "inter".to_string(),
        font_size: 14,
        auto_text_contrast: false,
        divider_show: false,
        divider_color: String::new(),
        canvas_ratio: "3:2".to_string(),
        canvas_orientation: "landscape".to_string(),
        export_quality: 92,
    };
    let exif = ExportExif {
        camera: ExportCamera {
            make: "FUJIFILM".to_string(),
            model: "X-T5".to_string(),
        },
        lens: "XF 35mm F1.4 R".to_string(),
        iso: 200,
        aperture: 1.8,
        shutter_speed: "1/250".to_string(),
        focal_length: 35.0,
        taken_at: "2026:04:28 18:42:11".to_string(),
        gps: None,
    };
    let config = ExportTemplateConfig {
        show_watermark: true,
        show_logo: false,
        show_camera: true,
        show_lens: true,
        show_params: true,
        watermark_template: None,
        show_date: true,
        date_format: "YYYY-MM-DD".to_string(),
        custom_lines: Vec::new(),
    };
    (frame, exif, config)
}

#[test]
fn fujifilm_classic_svg_renders_via_resvg() {
    let (photo_url, pw, ph) = load_photo_data_url();
    let (frame, exif, config) = make_test_inputs();

    let svg = build_fujifilm_classic_svg(&photo_url, pw, ph, &frame, &exif, &config);

    let svg_path = output_dir().join("fujifilm_classic.svg");
    std::fs::write(&svg_path, &svg).expect("write svg");
    println!("svg saved to: {}", svg_path.display());
    println!("svg byte size: {}", svg.len());

    let pixmap = render_svg(&svg);
    let png = pixmap.encode_png().expect("encode");
    let png_path = output_dir().join("fujifilm_classic_svg.png");
    std::fs::write(&png_path, &png).expect("write png");
    println!("svg→png saved to: {}", png_path.display());

    // Sanity: should have lots of color variation (photo + watermark).
    let mut samples = std::collections::HashSet::new();
    for chunk in pixmap.data().chunks_exact(4) {
        if chunk[3] > 0 {
            samples.insert((chunk[0] / 16, chunk[1] / 16, chunk[2] / 16));
        }
    }
    assert!(
        samples.len() > 30,
        "render too monotone: {} buckets",
        samples.len()
    );

    // Compare against the legacy Rust renderer (compose_fujifilm_classic).
    use painting_box_lib::render::compose::compose;
    let path = project_root().join(FIXTURE_PHOTO);
    let source = image::open(path).expect("open jpg");
    // Resize to 900x600 to match SVG canvas exactly.
    let resized = resize(&source.to_rgb8(), 900, 600, FilterType::Lanczos3);
    let dyn_img = DynamicImage::ImageRgb8(resized);
    let renderer = painting_box_lib::render::text::TextRenderer::cached(&frame.font_family);
    let canvas_rgba = compose(
        dyn_img,
        &frame,
        &exif,
        &config,
        renderer.as_deref(),
        "fujifilm_classic",
    );
    let canvas_png_path = output_dir().join("fujifilm_classic_canvas.png");
    canvas_rgba.save(&canvas_png_path).expect("save canvas png");
    println!("legacy canvas-equiv saved to: {}", canvas_png_path.display());
}
