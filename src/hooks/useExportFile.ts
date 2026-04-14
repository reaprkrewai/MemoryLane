import { generateExportFilename } from "../utils/zipUtils";

/**
 * Hook to handle file save dialog and write export ZIP
 * Uses Web File System Access API (showSaveFilePicker)
 */
export function useExportFile() {
  const save = async (blob: Blob, defaultName?: string): Promise<string | null> => {
    try {
      // Check browser support
      if (!("showSaveFilePicker" in window)) {
        // Fallback: Use download link
        return fallbackDownload(blob, defaultName);
      }

      // Use File System Access API
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultName || generateExportFilename(),
        types: [
          {
            description: "ZIP Archives",
            accept: { "application/zip": [".zip"] },
          },
        ],
      });

      // Write to file
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return handle.name;
    } catch (err: unknown) {
      // User cancelled or error occurred
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }

      // Fallback to download
      console.warn("File System Access API failed, using fallback download", err);
      return fallbackDownload(blob, defaultName);
    }
  };

  return { save };
}

/**
 * Fallback download method using blob URL
 */
function fallbackDownload(blob: Blob, defaultName?: string): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultName || generateExportFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Return the filename (not the actual path for fallback)
    resolve(link.download);
  });
}
