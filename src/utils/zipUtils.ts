import JSZip from "jszip";
import { ExportData } from "../hooks/useDataExport";

export interface ZipResult {
  blob: Blob;
  includedPhotos: number;
  skippedPhotos: number;
}

/**
 * Create a ZIP file from exported journal data
 * Structure:
 * - metadata.json (index of entries, tags, photos)
 * - photos/{id}.jpg (photo files if available)
 */
export async function createExportZip(data: ExportData): Promise<ZipResult> {
  const zip = new JSZip();

  // Add metadata.json to root
  const metadata = {
    timestamp: data.timestamp,
    version: data.version,
    summary: {
      entriesCount: data.entries.length,
      tagsCount: data.tags.length,
      photosCount: data.photos.length,
    },
    entries: data.entries,
    tags: data.tags,
    entryTags: data.entryTags,
    photos: data.photos.map((p) => ({
      id: p.id,
      entryId: p.entryId,
      fileName: p.fileName,
      mimeType: p.mimeType,
    })), // Don't include dataUri in metadata
    settings: data.settings,
  };

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  // Add photos to photos/ folder
  let includedPhotos = 0;
  let skippedPhotos = 0;

  for (const photo of data.photos) {
    try {
      if (photo.dataUri.startsWith("data:")) {
        // Convert data URI to Blob
        const response = await fetch(photo.dataUri);
        const blob = await response.blob();
        zip.folder("photos")!.file(photo.fileName, blob);
        includedPhotos++;
      } else {
        skippedPhotos++;
      }
    } catch (err) {
      console.warn(`Failed to include photo ${photo.id}:`, err);
      skippedPhotos++;
    }
  }

  // Generate ZIP blob
  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    includedPhotos,
    skippedPhotos,
  };
}

/**
 * Generate filename for export ZIP
 */
export function generateExportFilename(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `chronicle-export-${year}-${month}-${day}.zip`;
}
