//! Visual regression: render every template fixture via resvg and assert the
//! SHA256 of the output PNG matches a checked-in baseline hash.
//!
//! ### Workflow
//!
//! 1. When TS SVG generators change: `bun run bake-svg-fixtures` to rebuild
//!    `tests/fixtures/svg/<kind>.svg`.
//! 2. `cargo test --test visual_regression` to verify Rust output is stable.
//! 3. If a behavioral change is intentional and PNGs differ, regenerate the
//!    hashes: `PB_UPDATE_FIXTURES=1 cargo test --test visual_regression`.
//!
//! ### What this catches
//!
//! - resvg version upgrades that shift pixels
//! - Font loading regressions
//! - SVG template structure changes (via the upstream bake step)
//!
//! ### When drift happens
//!
//! The actual rendered PNG is written to `target/visual-regression/<kind>.png`
//! so you can open it to see what changed before deciding whether to re-bake.

use std::path::{Path, PathBuf};

use painting_box_lib::render::svg_export::render_svg_export;
use sha2::{Digest, Sha256};

const TEMPLATE_KINDS: &[&str] = &[
    "classic-bottom",
    "minimal-corner",
    "magazine",
    "cinematic",
    "cinema-scope",
    "film-strip",
    "xiaomi-leica",
    "photo-album",
    "crop-marks",
    "fujifilm-classic",
    "hasselblad",
    "darkroom-proof",
    "contact-sheet",
];

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
}

fn svg_fixture(kind: &str) -> PathBuf {
    fixtures_dir().join("svg").join(format!("{kind}.svg"))
}

fn baseline_hash(kind: &str) -> PathBuf {
    fixtures_dir().join("expected").join(format!("{kind}.png.sha256"))
}

fn test_photo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("public")
        .join("images")
        .join("preview-default.jpg")
}

fn drift_artifact_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("target")
        .join("visual-regression")
}

fn render(kind: &str, svg: &str, photo: &Path) -> Vec<u8> {
    let out = std::env::temp_dir().join(format!("pb-vr-{kind}.png"));
    render_svg_export(
        photo.to_str().expect("photo path utf8"),
        svg,
        out.to_str().expect("tmp path utf8"),
        92,
    )
    .expect("resvg render");
    let bytes = std::fs::read(&out).expect("read rendered png");
    let _ = std::fs::remove_file(&out);
    bytes
}

fn hex_hash(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

#[test]
fn every_template_renders_to_stable_baseline() {
    let photo = test_photo();
    assert!(photo.exists(), "missing fixture photo at {}", photo.display());

    let update = std::env::var("PB_UPDATE_FIXTURES").is_ok();
    let mut drifted: Vec<String> = Vec::new();
    let mut missing_svg: Vec<String> = Vec::new();

    std::fs::create_dir_all(fixtures_dir().join("expected")).ok();
    let artifact_dir = drift_artifact_dir();
    std::fs::create_dir_all(&artifact_dir).ok();

    for kind in TEMPLATE_KINDS {
        let svg_path = svg_fixture(kind);
        if !svg_path.exists() {
            missing_svg.push(kind.to_string());
            continue;
        }
        let svg = std::fs::read_to_string(&svg_path).expect("read svg fixture");
        let png = render(kind, &svg, &photo);
        let actual_hash = hex_hash(&png);

        let baseline_path = baseline_hash(kind);
        if update || !baseline_path.exists() {
            std::fs::write(&baseline_path, &actual_hash).expect("write baseline hash");
            println!("baseline written for {kind}: {actual_hash}");
            continue;
        }

        let expected_hash = std::fs::read_to_string(&baseline_path)
            .expect("read baseline hash")
            .trim()
            .to_string();

        if actual_hash != expected_hash {
            let artifact = artifact_dir.join(format!("{kind}.png"));
            std::fs::write(&artifact, &png).ok();
            drifted.push(format!(
                "  {kind}\n    expected: {expected_hash}\n    actual:   {actual_hash}\n    artifact: {}",
                artifact.display()
            ));
        }
    }

    assert!(
        missing_svg.is_empty(),
        "missing SVG fixtures (run `bun run bake-svg-fixtures`): {missing_svg:?}"
    );
    assert!(
        drifted.is_empty(),
        "\n{} templates drifted from baseline:\n{}\n\nIf intentional, re-bake:\n  PB_UPDATE_FIXTURES=1 cargo test --test visual_regression\n",
        drifted.len(),
        drifted.join("\n"),
    );
}
