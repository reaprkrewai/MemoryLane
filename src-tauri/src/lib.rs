// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod llama;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            llama::get_embedded_status,
            llama::start_embedded_ai,
            llama::stop_embedded_ai,
            llama::download_model,
            llama::download_binary,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } => {
                    // Clean shutdown: stop embedded AI server
                    std::thread::spawn(|| {
                        let rt = tokio::runtime::Runtime::new().unwrap();
                        rt.block_on(async {
                            // Note: We would need app_data_dir here which is difficult to get
                            // in the exit handler. Consider storing manager in app state instead.
                            // For now, llama-server will be killed when the process exits.
                        });
                    });
                }
                _ => {}
            }
        })
}
