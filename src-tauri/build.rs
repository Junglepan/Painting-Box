fn main() {
    tauri_build::build();

    // Enable bundled font support when font files are present in src-tauri/fonts/.
    // To bundle Inter: place inter-regular.ttf and inter-bold.ttf in src-tauri/fonts/
    let fonts_dir = std::path::Path::new("fonts");
    if fonts_dir.join("inter-regular.ttf").exists()
        && fonts_dir.join("inter-bold.ttf").exists()
    {
        println!("cargo:rustc-cfg=bundled_inter");
    }
    println!("cargo:rerun-if-changed=fonts/inter-regular.ttf");
    println!("cargo:rerun-if-changed=fonts/inter-bold.ttf");
}
