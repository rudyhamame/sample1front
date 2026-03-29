import React, { useEffect } from "react";
import "./imageViewerModal.css";

const ImageViewerModal = ({
  isOpen,
  images = [],
  activeIndex = 0,
  onChangeIndex,
  onClose,
  title,
}) => {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const boundedIndex = Math.min(
    Math.max(Number(activeIndex) || 0, 0),
    Math.max(safeImages.length - 1, 0),
  );
  const activeImage = safeImages[boundedIndex] || null;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key === "ArrowLeft" && boundedIndex > 0) {
        onChangeIndex?.(boundedIndex - 1);
        return;
      }

      if (event.key === "ArrowRight" && boundedIndex < safeImages.length - 1) {
        onChangeIndex?.(boundedIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [boundedIndex, isOpen, onChangeIndex, onClose, safeImages.length]);

  if (!isOpen || !activeImage) {
    return null;
  }

  return (
    <div className="imageViewer_overlay" role="dialog" aria-modal="true">
      <div className="imageViewer_shell">
        <div className="imageViewer_toolbar">
          <div className="imageViewer_titleWrap">
            <p className="imageViewer_title">{title || "Image viewer"}</p>
            <p className="imageViewer_subtitle">
              {boundedIndex + 1} / {safeImages.length}
              {activeImage?.width && activeImage?.height
                ? ` • ${activeImage.width}x${activeImage.height}`
                : ""}
            </p>
          </div>
          <div className="imageViewer_controls">
            <button
              type="button"
              onClick={() => window.open(activeImage.url, "_blank", "noopener,noreferrer")}
            >
              Open
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="imageViewer_body">
          <button
            type="button"
            className="imageViewer_navButton"
            onClick={() => onChangeIndex?.(boundedIndex - 1)}
            disabled={boundedIndex === 0}
            aria-label="Previous image"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="imageViewer_canvasWrap">
            <img
              src={activeImage.url}
              alt={title || "Gallery image"}
              className="imageViewer_image"
            />
          </div>
          <button
            type="button"
            className="imageViewer_navButton"
            onClick={() => onChangeIndex?.(boundedIndex + 1)}
            disabled={boundedIndex >= safeImages.length - 1}
            aria-label="Next image"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        {safeImages.length > 1 ? (
          <div className="imageViewer_thumbStrip">
            {safeImages.map((image, index) => (
              <button
                key={image.publicId || image.url || index}
                type="button"
                className="imageViewer_thumbButton"
                data-active={index === boundedIndex}
                onClick={() => onChangeIndex?.(index)}
              >
                <img src={image.url} alt="Gallery thumbnail" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ImageViewerModal;