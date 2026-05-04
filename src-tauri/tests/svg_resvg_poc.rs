//! POC: validate that resvg + usvg can render the visual primitives we
//! currently lack on the Rust side (Gaussian blur, arbitrary rotation,
//! italic, letter-spacing, pill / rounded-rect, embedded photo).
//!
//! If this passes and the resulting PNG looks visually correct, the
//! SVG-as-source-of-truth + resvg-on-export architecture is viable.

use std::path::PathBuf;
use std::sync::Arc;

use base64::Engine;
use resvg::{tiny_skia, usvg};

const FIXTURE_PHOTO: &str = "../public/images/preview-default.jpg";
const FONTS_DIR: &str = "fonts";

fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn load_photo_data_url() -> String {
    let path = project_root().join(FIXTURE_PHOTO);
    let bytes = std::fs::read(&path).expect("read fixture jpg");
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    format!("data:image/jpeg;base64,{}", b64)
}

fn load_fontdb() -> usvg::fontdb::Database {
    let mut db = usvg::fontdb::Database::new();
    let fonts = project_root().join(FONTS_DIR);
    db.load_fonts_dir(&fonts);
    db
}

/// Build an SVG that exercises every visual feature we currently can't
/// reproduce on the Rust `image` crate path.
fn build_test_svg(photo_data_url: &str) -> String {
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>

  <!-- 1. Cream paper background (Photo Album / Fujifilm feel) -->
  <rect width="900" height="600" fill="#f5f1e7"/>

  <!-- 2. Photo paper with Gaussian-blurred drop shadow (Photo Album) -->
  <rect x="64" y="56" width="772" height="380" fill="#000" opacity="0.18" filter="url(#paper-shadow)"/>
  <rect x="58" y="50" width="772" height="380" fill="#fdfaf2"/>

  <!-- 3. Embedded photo via dataURL (preserveAspectRatio fits inside paper) -->
  <image x="68" y="60" width="752" height="360" href="{photo}" preserveAspectRatio="xMidYMid slice"/>

  <!-- 4. FUJIFILM bold wordmark + letter-spacing (Hasselblad/Fujifilm) -->
  <text x="58" y="490" font-family="Inter" font-weight="900" font-size="38" fill="#00643f" letter-spacing="2">FUJIFILM</text>

  <!-- 5. Pill / rounded rect with inset white text (Fujifilm) -->
  <g transform="translate(285 470)">
    <rect width="160" height="28" rx="14" ry="14" fill="#00643f"/>
    <text x="80" y="19" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" fill="#fff">CLASSIC CHROME</text>
  </g>

  <!-- 6. Italic caption (Photo Album hand-script feel) -->
  <text x="58" y="528" font-family="Playfair Display" font-style="italic" font-weight="500" font-size="20" fill="#3b3024">Tokyo, late afternoon · 2026</text>

  <!-- 7. Right-aligned mono-style EXIF (Contact Sheet / Crop Marks) -->
  <text x="838" y="490" text-anchor="end" font-family="Inter" font-weight="500" font-size="16" fill="#161616">35mm · f/1.8 · 1/250 · ISO 200</text>
  <text x="838" y="514" text-anchor="end" font-family="Inter" font-weight="400" font-size="14" fill="#5a5650">2026 · 04 · 28</text>

  <!-- 8. Rotated PROOF stamp with red outline (Darkroom Proof) -->
  <g transform="translate(450 300) rotate(-8)">
    <rect x="-70" y="-26" width="140" height="52" fill="none" stroke="#b22222" stroke-width="3"/>
    <text x="0" y="10" text-anchor="middle" font-family="Inter" font-weight="900" font-size="34" fill="#b22222" letter-spacing="3">PROOF</text>
  </g>

  <!-- 9. Sprocket holes row (Film Strip / Contact Sheet) -->
  <g fill="#f7f7f0">
    <rect x="20" y="565" width="22" height="14" rx="3"/>
    <rect x="60" y="565" width="22" height="14" rx="3"/>
    <rect x="100" y="565" width="22" height="14" rx="3"/>
    <rect x="140" y="565" width="22" height="14" rx="3"/>
    <rect x="180" y="565" width="22" height="14" rx="3"/>
  </g>
</svg>"##,
        photo = photo_data_url
    )
}

#[test]
fn resvg_can_render_all_visual_primitives() {
    let photo = load_photo_data_url();
    let svg = build_test_svg(&photo);

    let mut opt = usvg::Options::default();
    opt.fontdb = Arc::new(load_fontdb());
    opt.font_family = "Inter".to_string();

    let tree = usvg::Tree::from_str(&svg, &opt).expect("parse svg");
    let size = tree.size().to_int_size();
    assert_eq!(size.width(), 900);
    assert_eq!(size.height(), 600);

    let mut pixmap = tiny_skia::Pixmap::new(size.width(), size.height())
        .expect("alloc pixmap");
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());

    let png = pixmap.encode_png().expect("encode png");
    let out = project_root().join("tests").join("output");
    std::fs::create_dir_all(&out).ok();
    let out_path = out.join("svg_resvg_poc.png");
    std::fs::write(&out_path, &png).expect("write png");

    println!("POC output: {}", out_path.display());

    let alpha_pixels: usize = pixmap
        .data()
        .chunks_exact(4)
        .filter(|p| p[3] > 10)
        .count();
    let total = (size.width() * size.height()) as usize;
    let coverage = alpha_pixels as f32 / total as f32;
    println!("non-transparent coverage: {:.1}%", coverage * 100.0);

    assert!(
        coverage > 0.5,
        "render produced too little coverage ({coverage}); something failed silently"
    );

    let mut sample_offsets = Vec::new();
    for y in (50..550).step_by(50) {
        for x in (60..840).step_by(80) {
            let idx = ((y * size.width() + x) * 4) as usize;
            sample_offsets.push((x, y, idx));
        }
    }
    let mut distinct_colors = std::collections::HashSet::new();
    for (_, _, idx) in &sample_offsets {
        let rgb = (
            pixmap.data()[*idx],
            pixmap.data()[*idx + 1],
            pixmap.data()[*idx + 2],
        );
        distinct_colors.insert(rgb);
    }
    println!("distinct sampled colors: {}", distinct_colors.len());
    assert!(
        distinct_colors.len() > 5,
        "render too monochromatic; photo / shapes likely missing"
    );
}
