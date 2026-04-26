use crate::render::classic_bottom::resolve_logo_svg_bytes;

/// Serve embedded SVG bytes as a UTF-8 string so the frontend can construct
/// a data URL without relying on Tauri's asset server — which fails on
/// Windows WebView2 for SVG MIME types.
#[tauri::command]
pub fn get_logo_svg(key: String, variant: String) -> Option<String> {
    let bytes = resolve_logo_svg_bytes(key.trim(), variant.trim())?;
    std::str::from_utf8(bytes).ok().map(str::to_owned)
}
