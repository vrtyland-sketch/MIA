use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct TabletInfo {
    windows_ink: bool,
    platform: String,
    runtime: String,
}

#[tauri::command]
fn tablet_info() -> TabletInfo {
    TabletInfo {
        windows_ink: cfg!(target_os = "windows"),
        platform: std::env::consts::OS.to_string(),
        runtime: "mia-paint-tauri".to_string(),
    }
}

#[tauri::command]
fn pick_open_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("MIA Paint", &["miapaint"])
        .blocking_pick_file();
    Ok(picked.map(|p| p.to_string()))
}

#[tauri::command]
fn pick_save_file(app: tauri::AppHandle, default_name: String) -> Result<Option<String>, String> {
    let name = if default_name.trim().is_empty() {
        "projekt.miapaint".to_string()
    } else {
        default_name
    };
    let picked = app
        .dialog()
        .file()
        .set_file_name(&name)
        .add_filter("MIA Paint", &["miapaint"])
        .blocking_save_file();
    Ok(picked.map(|p| p.to_string()))
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<String, String> {
    let data = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(data))
}

#[tauri::command]
fn write_file_bytes(path: String, bytes_base64: String) -> Result<(), String> {
    let data = STANDARD
        .decode(bytes_base64.as_bytes())
        .map_err(|e| e.to_string())?;
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            tablet_info,
            pick_open_file,
            pick_save_file,
            read_file_bytes,
            write_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running MIA Paint Tauri");
}
