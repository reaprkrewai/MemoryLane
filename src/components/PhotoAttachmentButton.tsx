import { useRef } from "react";
import { Camera } from "lucide-react";
import { Photo } from "../stores/entryStore";
import { usePhotoManagement } from "../hooks/usePhotoManagement";

interface PhotoAttachmentButtonProps {
  entryId: string;
  onPhotosAdded?: (photos: Photo[]) => void;
  currentPhotoCount?: number;
}

const MAX_PHOTOS = 10;

export function PhotoAttachmentButton({
  entryId,
  onPhotosAdded,
  currentPhotoCount = 0,
}: PhotoAttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processFiles } = usePhotoManagement(entryId);

  const isAtLimit = currentPhotoCount >= MAX_PHOTOS;

  const handleButtonClick = () => {
    if (isAtLimit) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Capture photos to pass to callback before processing mutates state
    // processFiles handles toast + DB; we listen via store subscription in parent
    await processFiles(files);

    if (onPhotosAdded) {
      // Notify parent — photos have been added to the store by this point
      // Parent can re-read from store; we pass empty array as signal
      onPhotosAdded([]);
    }

    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="inline-flex items-center">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Visible button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isAtLimit}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-label text-muted transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Attach photos"
        title={
          isAtLimit
            ? `Maximum ${MAX_PHOTOS} photos per entry`
            : "Attach photos (JPEG, PNG, WebP)"
        }
      >
        <Camera size={14} />
        <span>Add Photo</span>
        {currentPhotoCount > 0 && (
          <span className="ml-0.5 text-muted">({currentPhotoCount}/{MAX_PHOTOS})</span>
        )}
      </button>
    </div>
  );
}
