import { useCallback } from "react";
import { toast } from "sonner";
import { getDb } from "../lib/db";
import { useEntryStore, Photo } from "../stores/entryStore";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS_PER_ENTRY = 10;
const THUMBNAIL_SIZE = 100; // px

/**
 * Generates a thumbnail data URI from a File using browser Canvas API.
 * Returns a 100x100px (cover crop) JPEG data URI.
 */
function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // Cover-crop: scale to fill 100x100 centered
      const scale = Math.max(
        THUMBNAIL_SIZE / img.naturalWidth,
        THUMBNAIL_SIZE / img.naturalHeight
      );
      const scaledW = img.naturalWidth * scale;
      const scaledH = img.naturalHeight * scale;
      const offsetX = (THUMBNAIL_SIZE - scaledW) / 2;
      const offsetY = (THUMBNAIL_SIZE - scaledH) / 2;
      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for thumbnail generation"));
    };

    img.src = url;
  });
}

/**
 * Reads a File as a base64 data URI.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a random hex ID (16 bytes = 32 hex chars).
 */
function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function usePhotoManagement(entryId: string) {
  const addPhotosToEntry = useEntryStore((s) => s.addPhotosToEntry);
  const removePhotoFromEntry = useEntryStore((s) => s.removePhotoFromEntry);
  const getPhotosForEntry = useEntryStore((s) => s.getPhotosForEntry);
  const entries = useEntryStore((s) => s.entries);

  const currentPhotos = entries.find((e) => e.id === entryId)?.photos ?? [];

  /**
   * Process selected files: validate, generate thumbnails, insert DB records,
   * update store state, show toasts.
   */
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validate mime types
      const validFiles = fileArray.filter((f) => ALLOWED_MIME_TYPES.includes(f.type));
      const rejectedCount = fileArray.length - validFiles.length;
      if (rejectedCount > 0) {
        toast.error(
          `${rejectedCount} file${rejectedCount > 1 ? "s" : ""} rejected — only JPEG, PNG, and WebP are supported`
        );
      }
      if (validFiles.length === 0) return;

      // Enforce per-entry photo limit
      const slotsRemaining = MAX_PHOTOS_PER_ENTRY - currentPhotos.length;
      if (slotsRemaining <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS_PER_ENTRY} photos per entry`);
        return;
      }
      const filesToProcess = validFiles.slice(0, slotsRemaining);
      if (filesToProcess.length < validFiles.length) {
        toast.error(
          `Only ${slotsRemaining} more photo${slotsRemaining > 1 ? "s" : ""} can be added (limit: ${MAX_PHOTOS_PER_ENTRY})`
        );
      }

      const db = await getDb();
      const now = Date.now();
      const newPhotos: Photo[] = [];

      for (const file of filesToProcess) {
        try {
          const [photoDataUrl, thumbnailDataUrl] = await Promise.all([
            readFileAsDataUrl(file),
            generateThumbnail(file),
          ]);

          const id = generateId();
          const displayOrder = currentPhotos.length + newPhotos.length;

          await db.execute(
            `INSERT INTO media_attachments
              (id, entry_id, photo_path, thumbnail_path, file_size, mime_type, display_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              entryId,
              photoDataUrl,
              thumbnailDataUrl,
              file.size,
              file.type,
              displayOrder,
              now,
            ]
          );

          newPhotos.push({
            id,
            entry_id: entryId,
            photo_path: photoDataUrl,
            thumbnail_path: thumbnailDataUrl,
            file_size: file.size,
            mime_type: file.type,
            display_order: displayOrder,
            created_at: now,
          });
        } catch {
          toast.error(`Failed to attach ${file.name}`);
        }
      }

      if (newPhotos.length > 0) {
        addPhotosToEntry(entryId, newPhotos);
        toast.success(
          `${newPhotos.length} photo${newPhotos.length > 1 ? "s" : ""} added`
        );
      }
    },
    [entryId, currentPhotos, addPhotosToEntry]
  );

  /**
   * Remove a photo: delete DB record, update store state.
   * Note: Since we store data URIs in DB, there are no disk files to delete.
   */
  const removePhoto = useCallback(
    async (photoId: string) => {
      try {
        const db = await getDb();
        await db.execute("DELETE FROM media_attachments WHERE id = ?", [photoId]);
        removePhotoFromEntry(entryId, photoId);
        toast.success("Photo removed");
      } catch {
        toast.error("Failed to remove photo");
      }
    },
    [entryId, removePhotoFromEntry]
  );

  /**
   * Load photos for this entry from DB into the store.
   */
  const loadPhotos = useCallback(async () => {
    try {
      const photos = await getPhotosForEntry(entryId);
      useEntryStore.getState().setEntryPhotos(entryId, photos);
    } catch {
      // Non-fatal: entry will show no photos
    }
  }, [entryId, getPhotosForEntry]);

  return { processFiles, removePhoto, loadPhotos, currentPhotos };
}
