pub mod commands;
pub mod exif;
pub mod images;
pub mod render;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::photos::load_photos,
            commands::photos::load_photo_exif,
            commands::photos::load_photo_preview,
            commands::photos::export_single_photo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
