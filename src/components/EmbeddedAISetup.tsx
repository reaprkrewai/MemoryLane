/**
 * EmbeddedAISetup component
 * Shows download progress for the embedded AI model
 * Manages the llama.cpp model download flow
 */

import { Download, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAIStore } from "../stores/aiStore";
import { SettingRow } from "./SettingRow";

interface DownloadProgressPayload {
  current: number;
  total: number;
  percentage: number;
}

export function EmbeddedAISetup() {
  const embeddedStatus = useAIStore((s) => s.embeddedStatus);
  const downloadProgress = useAIStore((s) => s.downloadProgress);
  const [isDownloading, setIsDownloading] = useState(false);

  const modelSizeGB = 2.2;
  const currentGB = (downloadProgress / 100) * modelSizeGB;

  useEffect(() => {
    // Listen for download progress events from Tauri
    const unsubscribe = listen<DownloadProgressPayload>(
      "ai://download-progress",
      (event) => {
        const { percentage } = event.payload;
        useAIStore.setState({ downloadProgress: percentage });
      }
    );

    return () => {
      unsubscribe.then((unsub) => unsub());
    };
  }, []);

  const handleStartDownload = async () => {
    setIsDownloading(true);
    useAIStore.setState({ embeddedStatus: "downloading", downloadProgress: 0 });

    try {
      // Download the llama-server binary if not already present
      await invoke("download_binary");

      // Download the model
      await invoke("download_model");

      // Start the embedded AI server
      await invoke("start_embedded_ai");

      useAIStore.setState({
        embeddedStatus: "running",
        downloadProgress: 100,
      });

      toast.success("AI model downloaded and ready!");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Download failed:", err);
      useAIStore.setState({ embeddedStatus: "error" });
      toast.error(`Download failed: ${message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (embeddedStatus === "not-downloaded") {
    return (
      <SettingRow
        label="Download Model"
        description={`Download Phi-3 Mini (~${modelSizeGB}GB) for local AI`}
      >
        <button
          onClick={handleStartDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-amber-950 font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Download Model
        </button>
      </SettingRow>
    );
  }

  if (embeddedStatus === "downloading") {
    return (
      <SettingRow
        label="Downloading Model"
        description={`${currentGB.toFixed(1)}GB / ${modelSizeGB}GB`}
      >
        <div className="flex flex-col gap-2 w-64">
          <div className="relative h-6 bg-surface-secondary rounded-lg overflow-hidden border border-border">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all"
              style={{ width: `${downloadProgress}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-text">
                {downloadProgress}%
              </span>
            </div>
          </div>
          <p className="text-xs text-text-muted">
            This may take a few minutes depending on your connection
          </p>
        </div>
      </SettingRow>
    );
  }

  if (embeddedStatus === "error") {
    return (
      <SettingRow
        label="Download Failed"
        description="There was an error downloading the model"
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          <button
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border text-muted hover:border-accent/50 hover:text-text transition-colors font-medium"
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <Download size={14} />
                Try Again
              </>
            )}
          </button>
        </div>
      </SettingRow>
    );
  }

  if (embeddedStatus === "ready" || embeddedStatus === "running") {
    return (
      <SettingRow
        label="Model Status"
        description="Phi-3 Mini downloaded and ready"
      >
        <div className="flex items-center gap-2">
          <Check size={16} className="text-green-600" />
          <span className="text-sm text-text">Ready</span>
        </div>
      </SettingRow>
    );
  }

  return null;
}
