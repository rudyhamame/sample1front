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
              onClick={() =>
                window.open(activeImage.url, "_blank", "noopener,noreferrer")
              }
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
          <div
            className="imageViewer_canvasWrap"
            style={{ position: "relative" }}
          >
            <img
              src={activeImage.url}
              alt={title || "Gallery image"}
              className="imageViewer_image"
              id="imageViewer_baseImage"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "calc(94vh - 160px)",
                borderRadius: "18px",
              }}
              onLoad={(e) => {
                // Resize canvas to match image
                const img = e.target;
                const canvas = document.getElementById(
                  "imageViewer_drawCanvas",
                );
                if (canvas && img) {
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  canvas.style.width = img.width + "px";
                  canvas.style.height = img.height + "px";
                }
              }}
            />
            <canvas
              id="imageViewer_drawCanvas"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                touchAction: "none",
                borderRadius: "18px",
                zIndex: 2,
              }}
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
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 16px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              // Save the edited image (base + drawing)
              const img = document.getElementById("imageViewer_baseImage");
              const canvas = document.getElementById("imageViewer_drawCanvas");
              if (!img || !canvas) return;
              // Create a new canvas to merge
              const mergeCanvas = document.createElement("canvas");
              mergeCanvas.width = img.naturalWidth;
              mergeCanvas.height = img.naturalHeight;
              const ctx = mergeCanvas.getContext("2d");
              ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
              ctx.drawImage(canvas, 0, 0, img.naturalWidth, img.naturalHeight);
              // Download as PNG
              const link = document.createElement("a");
              link.download = "profile-picture-edited.png";
              link.href = mergeCanvas.toDataURL("image/png");
              link.click();
            }}
          >
            Save as PP
          </button>
          <button
            type="button"
            onClick={() => {
              // Clear drawing
              const canvas = document.getElementById("imageViewer_drawCanvas");
              if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }}
          >
            Clear Drawing
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
  // Drawing logic for pen
  useEffect(() => {
    const canvas = document.getElementById("imageViewer_drawCanvas");
    const img = document.getElementById("imageViewer_baseImage");
    if (!canvas || !img) return;
    // Always match canvas size to image size
    function resizeCanvas() {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.width = img.width + "px";
      canvas.style.height = img.height + "px";
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches.length > 0) {
        return [
          (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
          (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
        ];
      } else {
        return [
          (e.clientX - rect.left) * (canvas.width / rect.width),
          (e.clientY - rect.top) * (canvas.height / rect.height),
        ];
      }
    };
    const startDraw = (e) => {
      drawing = true;
      [lastX, lastY] = getPos(e);
      e.preventDefault();
    };
    const draw = (e) => {
      if (!drawing) return;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#ff4a00";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const [x, y] = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      [lastX, lastY] = [x, y];
      e.preventDefault();
    };
    const stopDraw = (e) => {
      drawing = false;
      if (e) e.preventDefault();
    };
    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    // Touch events
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw, { passive: false });
    canvas.addEventListener("touchcancel", stopDraw, { passive: false });
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
      canvas.removeEventListener("touchcancel", stopDraw);
    };
  }, [isOpen, activeImage?.url]);
};

export default ImageViewerModal;
