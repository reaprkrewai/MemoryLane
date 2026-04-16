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
        if binary_path.exists() {
            return Ok(());
        }

        // Determine which binary to download based on platform
        let download_url = if cfg!(windows) {
            "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-server-latest-windows-x64.exe"
        } else if cfg!(target_os = "macos") {
            if cfg!(target_arch = "aarch64") {
                "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-server-latest-macos-arm64"
            } else {
                "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-server-latest-macos-x64"
            }
        } else {
            "https://github.com/ggml-org/llama.cpp/releases/download/b3920/llama-server-latest-linux-x64"
        };

        let client = Client::new();
        let response = client
            .get(download_url)
            .send()
            .await
            .map_err(|e| format!("Failed to download binary: {}", e))?;

        let mut file = std::fs::File::create(&binary_path)
            .map_err(|e| format!("Failed to create binary file: {}", e))?;

        use std::io::Write;
        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Download error: {}", e))?;

        file.write_all(&bytes)
            .map_err(|e| format!("Write error: {}", e))?;

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
