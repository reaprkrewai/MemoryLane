use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, Window};
use tokio::process::Child;
use tokio::sync::Mutex;

/// Manages the embedded llama.cpp server process and lifecycle
pub struct LlamaManager {
    server_process: Arc<Mutex<Option<Child>>>,
    app_data_dir: PathBuf,
    server_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddedAIStatus {
    pub binary_exists: bool,
    pub model_exists: bool,
    pub server_running: bool,
    pub server_healthy: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: u8,
}

impl LlamaManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            server_process: Arc::new(Mutex::new(None)),
            app_data_dir,
            server_port: 8189,
        }
    }

    fn get_binary_path(&self) -> PathBuf {
        let binary_name = if cfg!(windows) {
            "llama-server.exe"
        } else if cfg!(target_os = "macos") {
            "llama-server-macos"
        } else {
            "llama-server"
        };
        self.app_data_dir.join("bin").join(binary_name)
    }

    fn get_model_path(&self) -> PathBuf {
        self.app_data_dir
            .join("models")
            .join("phi3-mini-4k-instruct-q4.gguf")
    }

    fn get_models_dir(&self) -> PathBuf {
        self.app_data_dir.join("models")
    }

    fn get_bin_dir(&self) -> PathBuf {
        self.app_data_dir.join("bin")
    }

    pub async fn get_status(&self) -> EmbeddedAIStatus {
        let binary_path = self.get_binary_path();
        let model_path = self.get_model_path();

        let binary_exists = binary_path.exists();
        let model_exists = model_path.exists();

        let server_process = self.server_process.lock().await;
        let server_running = server_process.is_some();

        // Check HTTP health
        let server_healthy = if server_running {
            self.check_server_health().await
        } else {
            false
        };

        EmbeddedAIStatus {
            binary_exists,
            model_exists,
            server_running,
            server_healthy,
        }
    }

    async fn check_server_health(&self) -> bool {
        let url = format!("http://localhost:{}/health", self.server_port);
        let client = Client::new();
        match tokio::time::timeout(
            std::time::Duration::from_secs(2),
            client.get(&url).send(),
        )
        .await
        {
            Ok(Ok(resp)) => resp.status().is_success(),
            _ => false,
        }
    }

    pub async fn start_server(&self) -> Result<(), String> {
        let binary_path = self.get_binary_path();
        let model_path = self.get_model_path();

        if !binary_path.exists() {
            return Err("llama-server binary not found".to_string());
        }

        if !model_path.exists() {
            return Err("Model file not found".to_string());
        }

        // Check if already running
        {
            let server_process = self.server_process.lock().await;
            if server_process.is_some() {
                return Err("Server already running".to_string());
            }
        }

        let mut cmd = tokio::process::Command::new(&binary_path);
        cmd.arg("--port")
            .arg(self.server_port.to_string())
            .arg("--model")
            .arg(&model_path)
            .arg("--embeddings")
            .arg("--host")
            .arg("127.0.0.1")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());

        match cmd.spawn() {
            Ok(child) => {
                let mut server_process = self.server_process.lock().await;
                *server_process = Some(child);
                Ok(())
            }
            Err(e) => Err(format!("Failed to start server: {}", e)),
        }
    }

    pub async fn stop_server(&self) -> Result<(), String> {
        let mut server_process = self.server_process.lock().await;
        if let Some(mut child) = server_process.take() {
            let _ = child.kill().await;
        }
        Ok(())
    }

    pub async fn download_model(&self, window: &Window) -> Result<(), String> {
        let model_dir = self.get_models_dir();
        if !model_dir.exists() {
            std::fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;
        }

        let model_path = self.get_model_path();
        if model_path.exists() {
            return Ok(());
        }

        // Download from Hugging Face
        let url = "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf";

        let client = Client::new();
        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to start download: {}", e))?;

        let total_size = response
            .content_length()
            .ok_or("Could not get file size")?;

        let mut downloaded: u64 = 0;
        let mut file = std::fs::File::create(&model_path)
            .map_err(|e| format!("Failed to create file: {}", e))?;

        let mut stream = response.bytes_stream();
        use futures::stream::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
            downloaded += chunk.len() as u64;

            let percentage = (downloaded as f64 / total_size as f64 * 100.0) as u8;

            let _ = window.emit(
                "ai://download-progress",
                DownloadProgress {
                    current: downloaded,
                    total: total_size,
                    percentage,
                },
            );

            use std::io::Write;
            file.write_all(&chunk)
                .map_err(|e| format!("Write error: {}", e))?;
        }

        Ok(())
    }

    pub async fn download_binary(&self, _window: &Window) -> Result<(), String> {
        let bin_dir = self.get_bin_dir();
        if !bin_dir.exists() {
            std::fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
        }

        let binary_path = self.get_binary_path();

        // Stub-detection: earlier versions wrote the literal "Not Found" HTTP body (9 bytes)
        // to disk as the executable because the release URL 404'd. Any file under 100 KB
        // cannot be a real llama-server build, so treat it as corrupt and re-download.
        if binary_path.exists() {
            let len = std::fs::metadata(&binary_path)
                .map(|m| m.len())
                .unwrap_or(0);
            if len >= 100_000 {
                return Ok(());
            }
            let _ = std::fs::remove_file(&binary_path);
        }

        // ggml-org/llama.cpp releases ship Windows/macOS/Linux builds as ZIP archives
        // containing `llama-server(.exe)` plus `ggml.dll` / `libggml.so` / `libggml.dylib`
        // and `llama.dll` / `libllama.*`. Fetch the ZIP, validate HTTP status, extract.
        let (archive_url, members): (&str, &[&str]) = if cfg!(windows) {
            (
                "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-b3920-bin-win-avx2-x64.zip",
                &["llama-server.exe", "ggml.dll", "llama.dll", "llava_shared.dll"],
            )
        } else if cfg!(target_os = "macos") {
            if cfg!(target_arch = "aarch64") {
                (
                    "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-b3920-bin-macos-arm64.zip",
                    &["llama-server", "libggml.dylib", "libllama.dylib"],
                )
            } else {
                (
                    "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-b3920-bin-macos-x64.zip",
                    &["llama-server", "libggml.dylib", "libllama.dylib"],
                )
            }
        } else {
            (
                "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-b3920-bin-ubuntu-x64.zip",
                &["llama-server", "libggml.so", "libllama.so"],
            )
        };

        let client = Client::new();
        let response = client
            .get(archive_url)
            .send()
            .await
            .map_err(|e| format!("Failed to download archive: {}", e))?
            .error_for_status()
            .map_err(|e| format!("Archive URL returned {}: {}", e.status().map(|s| s.as_u16()).unwrap_or(0), archive_url))?;

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Download error: {}", e))?;

        Self::extract_members(&bytes, &bin_dir, members)?;

        // Final sanity check: the binary we care about must have landed on disk.
        if !binary_path.exists() {
            return Err(format!(
                "Archive extracted but {} not found in archive (expected entries: {:?})",
                binary_path.display(),
                members
            ));
        }

        // Make executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o755);
            std::fs::set_permissions(&binary_path, perms)
                .map_err(|e| format!("Failed to set permissions: {}", e))?;
        }

        Ok(())
    }

    /// Extract a fixed set of basename-matched entries from a ZIP archive in memory
    /// into `bin_dir`. Entries whose basename matches any `members` string are written;
    /// everything else in the archive is ignored. Missing members are tolerated — the
    /// caller verifies the critical file exists after extraction.
    fn extract_members(
        archive_bytes: &[u8],
        bin_dir: &std::path::Path,
        members: &[&str],
    ) -> Result<(), String> {
        use std::io::{Cursor, Read, Write};

        let reader = Cursor::new(archive_bytes);
        let mut zip = zip::ZipArchive::new(reader)
            .map_err(|e| format!("Invalid archive (not a ZIP?): {}", e))?;

        for i in 0..zip.len() {
            let mut entry = zip
                .by_index(i)
                .map_err(|e| format!("ZIP index {} unreadable: {}", i, e))?;
            if !entry.is_file() {
                continue;
            }
            // Copy basename to owned String so we can later take a mutable borrow on `entry`
            // to read its contents (enclosed_name borrows from entry).
            let basename = match entry
                .enclosed_name()
                .and_then(|p| p.file_name().and_then(|n| n.to_str()).map(String::from))
            {
                Some(name) => name,
                None => continue,
            };
            if !members.contains(&basename.as_str()) {
                continue;
            }

            let out_path = bin_dir.join(&basename);
            let mut out = std::fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create {}: {}", out_path.display(), e))?;
            let mut buf = Vec::with_capacity(entry.size() as usize);
            entry
                .read_to_end(&mut buf)
                .map_err(|e| format!("Read error for {}: {}", basename, e))?;
            out.write_all(&buf)
                .map_err(|e| format!("Write error for {}: {}", basename, e))?;
        }

        Ok(())
    }
}

// Tauri command implementations
#[tauri::command]
pub async fn get_embedded_status(
    handle: AppHandle,
) -> Result<EmbeddedAIStatus, String> {
    let app_data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let manager = LlamaManager::new(app_data_dir);
    Ok(manager.get_status().await)
}

#[tauri::command]
pub async fn start_embedded_ai(
    handle: AppHandle,
) -> Result<(), String> {
    let app_data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let manager = LlamaManager::new(app_data_dir);
    manager.start_server().await
}

#[tauri::command]
pub async fn stop_embedded_ai(
    handle: AppHandle,
) -> Result<(), String> {
    let app_data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let manager = LlamaManager::new(app_data_dir);
    manager.stop_server().await
}

#[tauri::command]
pub async fn download_model(
    handle: AppHandle,
    window: Window,
) -> Result<(), String> {
    let app_data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let manager = LlamaManager::new(app_data_dir);
    manager.download_model(&window).await
}

#[tauri::command]
pub async fn download_binary(
    handle: AppHandle,
    window: Window,
) -> Result<(), String> {
    let app_data_dir = handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;

    let manager = LlamaManager::new(app_data_dir);
    manager.download_binary(&window).await
}
