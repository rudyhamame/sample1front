import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/build/pdf";
import "./pdfReaderModal.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const TOOLS = [
  { id: "pen", label: "Pen" },
  { id: "highlight", label: "Highlight" },
  { id: "note", label: "Note" },
];

const clampPage = (value, max) => {
  const numeric = Number(value) || 1;

  if (!max || max < 1) {
    return Math.max(1, numeric);
  }

  return Math.min(max, Math.max(1, numeric));
};

const clampUnit = (value) => Math.min(Math.max(value, 0), 1);

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

const getStorageKey = (documentKey) =>
  `schoolplanner.telegram.pdfReaderAnnotations.v1:${documentKey}`;

const readStoredStudyState = (documentKey) => {
  if (typeof window === "undefined" || !documentKey) {
    return { annotationsByPage: {}, studySummary: "" };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(documentKey));
    const parsed = JSON.parse(raw || "{}");
    return {
      annotationsByPage:
        parsed?.annotationsByPage && typeof parsed.annotationsByPage === "object"
          ? parsed.annotationsByPage
          : {},
      studySummary: typeof parsed?.studySummary === "string" ? parsed.studySummary : "",
    };
  } catch {
    return { annotationsByPage: {}, studySummary: "" };
  }
};

const writeStoredStudyState = (documentKey, annotationsByPage, studySummary) => {
  if (typeof window === "undefined" || !documentKey) {
    return;
  }

  try {
    window.localStorage.setItem(
      getStorageKey(documentKey),
      JSON.stringify({ annotationsByPage, studySummary }),
    );
  } catch {
    // Ignore local storage failures.
  }
};

const pathFromPoints = (points = []) => {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y + 0.01}`;
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
};

const createDraft = (tool, point, defaultNoteText) => {
  if (tool === "pen") {
    return {
      type: "pen",
      color: "#2dd4bf",
      width: 3,
      points: [point],
    };
  }

  if (tool === "highlight") {
    return {
      type: "highlight",
      color: "rgba(250, 204, 21, 0.34)",
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
  }

  if (tool === "note") {
    return {
      id: `${Date.now()}`,
      type: "note",
      color: "#fb7185",
      x: point.x,
      y: point.y,
      text: defaultNoteText || "New study note",
      createdAt: new Date().toISOString(),
    };
  }

  return null;
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
  const overlayRef = useRef(null);
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
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState("pen");
  const [rtlMode, setRtlMode] = useState(true);
  const [antiOcrMode, setAntiOcrMode] = useState(true);
  const [defaultNoteText, setDefaultNoteText] = useState("");
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [annotationsByPage, setAnnotationsByPage] = useState({});
  const [studySummary, setStudySummary] = useState("");

  const documentKey = useMemo(() => {
    return [fileUrl, title, metadata?.sender, metadata?.sizeBytes]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|");
  }, [fileUrl, metadata?.sender, metadata?.sizeBytes, title]);

  const currentAnnotations = annotationsByPage[String(pageNumber)] || [];
  const selectedNote = currentAnnotations.find(
    (annotation) => annotation.id === selectedNoteId && annotation.type === "note",
  );

  useEffect(() => {
    setPageNumber(Math.max(1, Number(initialPage) || 1));
    setZoom(Math.min(2.5, Math.max(0.6, Number(initialZoom) || 1)));
  }, [initialPage, initialZoom, fileUrl]);

  useEffect(() => {
    const stored = readStoredStudyState(documentKey);
    setAnnotationsByPage(stored.annotationsByPage);
    setStudySummary(stored.studySummary);
    setSelectedNoteId(null);
  }, [documentKey]);

  useEffect(() => {
    writeStoredStudyState(documentKey, annotationsByPage, studySummary);
  }, [annotationsByPage, documentKey, studySummary]);

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
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        setCanvasSize({
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });

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

  const setPageAnnotations = (updater) => {
    setAnnotationsByPage((currentState) => {
      const pageKey = String(pageNumber);
      const currentPageAnnotations = currentState[pageKey] || [];
      const nextPageAnnotations =
        typeof updater === "function"
          ? updater(currentPageAnnotations)
          : updater || [];

      return {
        ...currentState,
        [pageKey]: nextPageAnnotations,
      };
    });
  };

  const getRelativePoint = (event) => {
    const overlay = overlayRef.current;

    if (!overlay) {
      return { x: 0, y: 0 };
    }

    const bounds = overlay.getBoundingClientRect();

    return {
      x: clampUnit((event.clientX - bounds.left) / Math.max(bounds.width, 1)),
      y: clampUnit((event.clientY - bounds.top) / Math.max(bounds.height, 1)),
    };
  };

  const handlePointerDown = (event) => {
    if (!fileUrl || pageRendering || documentLoading) {
      return;
    }

    const point = getRelativePoint(event);

    if (tool === "note") {
      const note = createDraft("note", point, defaultNoteText);
      setPageAnnotations((entries) => [...entries, note]);
      setSelectedNoteId(note.id);
      return;
    }

    setDraftAnnotation(createDraft(tool, point, defaultNoteText));
  };

  const handlePointerMove = (event) => {
    if (!draftAnnotation) {
      return;
    }

    const point = getRelativePoint(event);

    if (draftAnnotation.type === "pen") {
      setDraftAnnotation((currentDraft) => ({
        ...currentDraft,
        points: [...currentDraft.points, point],
      }));
      return;
    }

    if (draftAnnotation.type === "highlight") {
      setDraftAnnotation((currentDraft) => ({
        ...currentDraft,
        width: point.x - currentDraft.x,
        height: point.y - currentDraft.y,
      }));
    }
  };

  const finalizeDraft = () => {
    if (!draftAnnotation) {
      return;
    }

    const annotation = {
      ...draftAnnotation,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setPageAnnotations((entries) => [...entries, annotation]);
    setDraftAnnotation(null);
  };

  const updateSelectedNote = (nextText) => {
    setPageAnnotations((entries) =>
      entries.map((entry) =>
        entry.id === selectedNoteId && entry.type === "note"
          ? { ...entry, text: nextText }
          : entry,
      ),
    );
  };

  const deleteAnnotation = (annotationId) => {
    setPageAnnotations((entries) =>
      entries.filter((entry) => entry.id !== annotationId),
    );

    if (selectedNoteId === annotationId) {
      setSelectedNoteId(null);
    }
  };

  const resetStudyState = () => {
    setAnnotationsByPage({});
    setStudySummary("");
    setSelectedNoteId(null);
    setDraftAnnotation(null);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pdfReader_overlay" role="dialog" aria-modal="true">
      <div className="pdfReader_shell pdfReader_shell--study" dir={rtlMode ? "rtl" : "ltr"}>
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

        <div className="pdfReader_studyLayout">
          <aside className="pdfReader_studyPanel">
            <div className="pdfReader_panelBlock">
              <p className="pdfReader_panelEyebrow">Study tools</p>
              <h2>Arabic-ready annotated reader</h2>
              <p>
                Draw, highlight, and place notes even when text extraction is weak
                or blocked.
              </p>
            </div>

            <div className="pdfReader_panelBlock">
              <div className="pdfReader_toolRow">
                {TOOLS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={tool === entry.id ? "is-active" : ""}
                    onClick={() => setTool(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className="pdfReader_toggleRow">
                <label>
                  <input
                    type="checkbox"
                    checked={rtlMode}
                    onChange={(event) => setRtlMode(event.target.checked)}
                  />
                  Arabic RTL
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={antiOcrMode}
                    onChange={(event) => setAntiOcrMode(event.target.checked)}
                  />
                  Anti-OCR mode
                </label>
              </div>
            </div>

            <div className="pdfReader_panelBlock">
              <label className="pdfReader_inputLabel" htmlFor="pdf-reader-default-note">
                Default note text
              </label>
              <textarea
                id="pdf-reader-default-note"
                value={defaultNoteText}
                onChange={(event) => setDefaultNoteText(event.target.value)}
                rows={3}
                placeholder="Type a note, then click the PDF page."
              />
            </div>

            <div className="pdfReader_panelBlock">
              <label className="pdfReader_inputLabel" htmlFor="pdf-reader-summary">
                Study summary
              </label>
              <textarea
                id="pdf-reader-summary"
                value={studySummary}
                onChange={(event) => setStudySummary(event.target.value)}
                rows={7}
                placeholder="Add chapter notes, questions, vocabulary, or revision prompts."
              />
            </div>

            <div className="pdfReader_panelBlock">
              <div className="pdfReader_inlineMeta">
                <span>{currentAnnotations.length} annotations on this page</span>
                <button type="button" onClick={resetStudyState}>
                  Reset Notes
                </button>
              </div>
              <p className="pdfReader_hint">
                {antiOcrMode
                  ? "Visual study mode is active. This works well for scanned or OCR-resistant PDFs."
                  : "Standard view is active."}
              </p>
            </div>
          </aside>

          <div className="pdfReader_canvasSection">
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
                  <div
                    ref={overlayRef}
                    className="pdfReader_annotationLayer"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finalizeDraft}
                    onPointerLeave={finalizeDraft}
                    style={{
                      width: canvasSize.width ? `${canvasSize.width}px` : undefined,
                      height: canvasSize.height ? `${canvasSize.height}px` : undefined,
                    }}
                  >
                    <canvas ref={canvasRef} className="pdfReader_canvas" />
                    <svg
                      viewBox="0 0 1 1"
                      preserveAspectRatio="none"
                      className="pdfReader_annotationSvg"
                    >
                      {currentAnnotations.map((annotation) => {
                        if (annotation.type === "pen") {
                          return (
                            <path
                              key={annotation.id}
                              d={pathFromPoints(annotation.points)}
                              fill="none"
                              stroke={annotation.color}
                              strokeWidth={(annotation.width || 3) / 1000}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        }

                        if (annotation.type === "highlight") {
                          return (
                            <rect
                              key={annotation.id}
                              x={Math.min(annotation.x, annotation.x + annotation.width)}
                              y={Math.min(annotation.y, annotation.y + annotation.height)}
                              width={Math.abs(annotation.width)}
                              height={Math.abs(annotation.height)}
                              fill={annotation.color}
                              rx="0.01"
                            />
                          );
                        }

                        if (annotation.type === "note") {
                          return (
                            <g key={annotation.id}>
                              <circle cx={annotation.x} cy={annotation.y} r="0.017" fill={annotation.color} />
                              <text
                                x={annotation.x + 0.024}
                                y={annotation.y + 0.006}
                                fill="#ffffff"
                                fontSize="0.03"
                                fontWeight="700"
                              >
                                Note
                              </text>
                            </g>
                          );
                        }

                        return null;
                      })}

                      {draftAnnotation?.type === "pen" ? (
                        <path
                          d={pathFromPoints(draftAnnotation.points)}
                          fill="none"
                          stroke={draftAnnotation.color}
                          strokeWidth={(draftAnnotation.width || 3) / 1000}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {draftAnnotation?.type === "highlight" ? (
                        <rect
                          x={Math.min(draftAnnotation.x, draftAnnotation.x + draftAnnotation.width)}
                          y={Math.min(draftAnnotation.y, draftAnnotation.y + draftAnnotation.height)}
                          width={Math.abs(draftAnnotation.width)}
                          height={Math.abs(draftAnnotation.height)}
                          fill={draftAnnotation.color}
                          rx="0.01"
                        />
                      ) : null}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="pdfReader_notesPanel">
            <div className="pdfReader_panelBlock">
              <h3>Page annotations</h3>
              <p>Highlights and pen marks stay visual. Notes remain editable.</p>
            </div>

            <div className="pdfReader_annotationList">
              {currentAnnotations.length ? (
                currentAnnotations.map((annotation, index) => (
                  <button
                    key={annotation.id}
                    type="button"
                    className={`pdfReader_annotationItem${
                      annotation.id === selectedNoteId ? " is-selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedNoteId(annotation.type === "note" ? annotation.id : null)
                    }
                  >
                    <strong>
                      {annotation.type} #{index + 1}
                    </strong>
                    <span>
                      {annotation.type === "note"
                        ? annotation.text
                        : annotation.type === "highlight"
                        ? "Visual highlight region"
                        : "Freehand pen markup"}
                    </span>
                    <span
                      className="pdfReader_annotationDelete"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteAnnotation(annotation.id);
                      }}
                    >
                      Delete
                    </span>
                  </button>
                ))
              ) : (
                <div className="pdfReader_emptyState">
                  No annotations yet. Pick a tool and interact directly with the page.
                </div>
              )}
            </div>

            <div className="pdfReader_panelBlock">
              <label className="pdfReader_inputLabel" htmlFor="pdf-reader-selected-note">
                Selected note editor
              </label>
              <textarea
                id="pdf-reader-selected-note"
                value={selectedNote?.text || ""}
                onChange={(event) => updateSelectedNote(event.target.value)}
                disabled={!selectedNote}
                rows={8}
                placeholder="Click a note marker to edit it here."
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PdfReaderModal;
