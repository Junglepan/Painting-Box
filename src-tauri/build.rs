fn main() {
    tauri_build::build();

    let fonts_dir = std::path::Path::new("fonts");

    if fonts_dir.join("inter-regular.ttf").exists()
        && fonts_dir.join("inter-bold.ttf").exists()
    {
        println!("cargo:rustc-cfg=bundled_inter");
    }

    if fonts_dir.join("playfair-display-regular.ttf").exists()
        && fonts_dir.join("playfair-display-bold.ttf").exists()
    {
        println!("cargo:rustc-cfg=bundled_playfair_display");
    }

    if fonts_dir.join("bebas-neue-regular.ttf").exists() {
        println!("cargo:rustc-cfg=bundled_bebas_neue");
    }

    if fonts_dir.join("noto-sans-sc-regular.ttf").exists()
        && fonts_dir.join("noto-sans-sc-bold.ttf").exists()
    {
        println!("cargo:rustc-cfg=bundled_noto_sans_sc");
    }

    println!("cargo:rerun-if-changed=fonts/inter-regular.ttf");
    println!("cargo:rerun-if-changed=fonts/inter-bold.ttf");
    println!("cargo:rerun-if-changed=fonts/playfair-display-regular.ttf");
    println!("cargo:rerun-if-changed=fonts/playfair-display-bold.ttf");
    println!("cargo:rerun-if-changed=fonts/bebas-neue-regular.ttf");
    println!("cargo:rerun-if-changed=fonts/noto-sans-sc-regular.ttf");
    println!("cargo:rerun-if-changed=fonts/noto-sans-sc-bold.ttf");
}
