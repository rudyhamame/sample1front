import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/build/pdf";
import "./pdfReaderModal.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const clampPage = (value, max) => {
  const numeric = Number(value) || 1;

  if (!max || max < 1) {
    return Math.max(1, numeric);
  }

  return Math.min(max, Math.max(1, numeric));
};

const getReadableSize = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (numeric < 1024) {
    return `${numeric} B`;
  }

  if (numeric < 1024 * 1024) {
    return `${(numeric / 1024).toFixed(1)} KB`;
  }

  return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
};

const PdfReaderModal = ({
  isOpen,
  fileUrl,
  title,
  metadata,
  initialPage = 1,
  initialZoom = 1,
  isLoading,
  error,
  onClose,
  onOpenInNewTab,
  onDownload,
  onReaderStateChange,
}) => {
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const renderTaskRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(Math.max(1, Number(initialPage) || 1));
  const [zoom, setZoom] = useState(
    Math.min(2.5, Math.max(0.6, Number(initialZoom) || 1)),
  );
  const [viewerError, setViewerError] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [pageRendering, setPageRendering] = useState(false);

  useEffect(() => {
    setPageNumber(Math.max(1, Number(initialPage) || 1));
    setZoom(Math.min(2.5, Math.max(0.6, Number(initialZoom) || 1)));
  }, [initialPage, initialZoom, fileUrl]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    onReaderStateChange?.({
      page: pageNumber,
      zoom,
    });
  }, [isOpen, onReaderStateChange, pageNumber, zoom]);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask = null;

    const loadDocument = async () => {
      if (!isOpen || !fileUrl) {
        setPdfDocument(null);
        setNumPages(0);
        setViewerError("");
        setDocumentLoading(false);
        return;
      }

      setDocumentLoading(true);
      setViewerError("");

      try {
        loadingTask = pdfjs.getDocument(fileUrl);
        const nextDocument = await loadingTask.promise;

        if (isCancelled) {
          await nextDocument.destroy();
          return;
        }

        setPdfDocument((currentDocument) => {
          currentDocument?.destroy().catch(() => {});
          return nextDocument;
        });
        setNumPages(Number(nextDocument.numPages || 0));
        setPageNumber((currentPage) =>
          clampPage(currentPage || initialPage, nextDocument.numPages || 0),
        );
      } catch (loadError) {
        if (!isCancelled) {
          setPdfDocument(null);
          setNumPages(0);
          setViewerError(
            loadError?.message || "Unable to load this PDF in the reader.",
          );
        }
      } finally {
        if (!isCancelled) {
          setDocumentLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      loadingTask?.destroy?.();
    };
  }, [fileUrl, initialPage, isOpen]);

  useEffect(() => {
    if (!isOpen || !pdfDocument || !canvasRef.current || !canvasWrapRef.current) {
      return undefined;
    }

    let isCancelled = false;

    const renderPage = async () => {
      setPageRendering(true);
      setViewerError("");

      try {
        const page = await pdfDocument.getPage(clampPage(pageNumber, numPages));

        if (isCancelled) {
          return;
        }

        const unscaledViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          320,
          canvasWrapRef.current.clientWidth - 32,
        );
        const baseScale = availableWidth / Math.max(1, unscaledViewport.width);
        const viewport = page.getViewport({
          scale: Math.max(0.25, baseScale) * zoom,
        });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas rendering is not available.");
        }

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;

        renderTaskRef.current?.cancel?.();
        const nextRenderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = nextRenderTask;
        await nextRenderTask.promise;
      } catch (renderError) {
        if (!isCancelled && renderError?.name !== "RenderingCancelledException") {
          setViewerError(
            renderError?.message || "Unable to render this PDF page.",
          );
        }
      } finally {
        if (!isCancelled) {
          setPageRendering(false);
        }
      }
    };

    renderPage();

    const handleResize = () => {
      window.clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = window.setTimeout(() => {
        renderPage();
      }, 120);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(resizeTimeoutRef.current);
      renderTaskRef.current?.cancel?.();
    };
  }, [isOpen, numPages, pageNumber, pdfDocument, zoom]);

  useEffect(() => () => {
    renderTaskRef.current?.cancel?.();
    window.clearTimeout(resizeTimeoutRef.current);
  }, []);

  useEffect(() => () => {
    pdfDocument?.destroy?.().catch(() => {});
  }, [pdfDocument]);

  const isVisible =
    isOpen &&
    (isLoading ||
      documentLoading ||
      pageRendering ||
      Boolean(fileUrl) ||
      Boolean(error) ||
      Boolean(viewerError));

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pdfReader_overlay" role="dialog" aria-modal="true">
      <div className="pdfReader_shell">
        <div className="pdfReader_toolbar">
          <div className="pdfReader_titleWrap">
            <p className="pdfReader_title">{title || "Telegram PDF"}</p>
            <p className="pdfReader_subtitle">
              {metadata?.sender ? `${metadata.sender} • ` : ""}
              {getReadableSize(metadata?.sizeBytes) || "PDF"}
            </p>
          </div>
          <div className="pdfReader_controls">
            <button
              type="button"
              onClick={() =>
                setPageNumber((currentPage) => clampPage(currentPage - 1, numPages))
              }
              disabled={pageNumber <= 1 || !numPages}
            >
              Prev
            </button>
            <span>
              {pageNumber}/{numPages || "-"}
            </span>
            <button
              type="button"
              onClick={() =>
                setPageNumber((currentPage) => clampPage(currentPage + 1, numPages))
              }
              disabled={!numPages || pageNumber >= numPages}
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))}
              disabled={zoom <= 0.6}
            >
              -
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
              disabled={zoom >= 2.5}
            >
              +
            </button>
            <button type="button" onClick={onOpenInNewTab} disabled={!fileUrl}>
              Open Tab
            </button>
            <button type="button" onClick={onDownload} disabled={!fileUrl}>
              Download
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="pdfReader_canvasWrap pdfReader_canvasWrap--native" ref={canvasWrapRef}>
          {isLoading || documentLoading ? (
            <p className="pdfReader_status">Opening PDF...</p>
          ) : error ? (
            <p className="pdfReader_status">{error}</p>
          ) : viewerError ? (
            <p className="pdfReader_status">{viewerError}</p>
          ) : !fileUrl ? (
            <p className="pdfReader_status">No PDF selected.</p>
          ) : (
            <div className="pdfReader_canvasStage">
              {pageRendering ? (
                <p className="pdfReader_status pdfReader_status--floating">
                  Rendering page...
                </p>
              ) : null}
              <canvas ref={canvasRef} className="pdfReader_canvas" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfReaderModal;
