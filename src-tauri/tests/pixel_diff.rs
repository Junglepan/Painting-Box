//! Quick utility test to extract and compare pixel colors at specific
//! locations from the two POC PNG outputs (SVG vs legacy renderer).
//! Run with `cargo test --test pixel_diff -- --nocapture`.

use std::path::PathBuf;

fn out(p: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("output")
        .join(p)
}

#[test]
fn compare_fujifilm_pixel_colors() {
    let svg_path = out("fujifilm_classic_svg.png");
    let cv_path = out("fujifilm_classic_canvas.png");
    if !svg_path.exists() || !cv_path.exists() {
        eprintln!("skip: run fujifilm_classic_svg_e2e first");
        return;
    }
    let svg = image::open(&svg_path).unwrap().to_rgba8();
    let cv = image::open(&cv_path).unwrap().to_rgba8();
    println!("SVG dim: {}x{}", svg.width(), svg.height());
    println!("Canvas dim: {}x{}", cv.width(), cv.height());

    // FUJIFILM wordmark area: roughly y=515-535, x=60-220 at 900x600
    println!("\n--- FUJIFILM wordmark sampling ---");
    for &(x, y) in &[(80, 525u32), (95, 525), (110, 525), (130, 525), (160, 525)] {
        println!(
            "  ({:3},{:3})  svg={:?}  canvas={:?}",
            x,
            y,
            svg.get_pixel(x, y),
            cv.get_pixel(x, y)
        );
    }
    println!("\n--- pill area (CLASSIC CHROME) ---");
    for &(x, y) in &[(290, 525u32), (310, 525), (350, 525), (390, 525)] {
        println!(
            "  ({:3},{:3})  svg={:?}  canvas={:?}",
            x,
            y,
            svg.get_pixel(x, y),
            cv.get_pixel(x, y)
        );
    }
}
