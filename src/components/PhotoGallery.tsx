import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Photo } from "../stores/entryStore";

interface PhotoGalleryProps {
  photos: Photo[];
  mode: "thumbnail-strip" | "expanded-grid" | "editor";
  onRemove?: (photoId: string) => void;
  onPhotoClick?: (photoIndex: number) => void;
}

interface LightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const next = () => setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close photo viewer"
      >
        <X size={16} />
      </button>

      {/* Prev button */}
      {photos.length > 1 && (
        <button
          type="button"
          onClick={prev}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Previous photo"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Image */}
      <img
        src={photos[currentIndex].photo_path}
        alt={`Photo ${currentIndex + 1}`}
        className="max-h-[90vh] max-w-[90vw] rounded object-contain"
      />

      {/* Next button */}
      {photos.length > 1 && (
        <button
          type="button"
          onClick={next}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Next photo"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-label text-white">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

export function PhotoGallery({ photos, mode, onRemove, onPhotoClick }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const handleThumbnailClick = (index: number) => {
    if (mode === "expanded-grid") {
      setLightboxIndex(index);
    } else if (onPhotoClick) {
      onPhotoClick(index);
    }
  };

  // ── Mode: thumbnail-strip (timeline card) ─────────────────────────────────
  if (mode === "thumbnail-strip") {
    const visiblePhotos = photos.slice(0, 3);
    const overflowCount = photos.length - visiblePhotos.length;

    return (
      <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
        {visiblePhotos.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.thumbnail_path}
            alt={`Photo ${i + 1}`}
            loading="lazy"
            className="h-10 w-10 flex-shrink-0 rounded object-cover border border-border"
          />
        ))}
        {overflowCount > 0 && (
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-border bg-surface text-label text-muted">
            +{overflowCount}
          </span>
        )}
      </div>
    );
  }

  // ── Mode: expanded-grid (expanded entry view) ──────────────────────────────
  if (mode === "expanded-grid") {
    return (
      <>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => handleThumbnailClick(i)}
              className="group relative aspect-square overflow-hidden rounded border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={photo.thumbnail_path}
                alt={`Photo ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>

        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  // ── Mode: editor (entry editor with remove buttons) ───────────────────────
  // mode === "editor"
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded border border-border"
          >
            <img
              src={photo.thumbnail_path}
              alt={`Photo ${i + 1}`}
              loading="lazy"
              className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
              onClick={() => setLightboxIndex(i)}
            />

            {/* Remove button — visible on hover */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(photo.id);
                }}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 focus:opacity-100 focus:outline-none"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
