import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer.js";
import "./pdfReaderModal.css";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.js?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const TOOLS = [
  {
    id: "select",
    label: <i className="fas fa-i-cursor"></i>,
    title: "Text selection",
  },
  { id: "pen", label: <i className="fas fa-pen"></i> },
  { id: "hand", label: <i className="fas fa-hand-paper"></i> },
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
        parsed?.annotationsByPage &&
        typeof parsed.annotationsByPage === "object"
          ? parsed.annotationsByPage
          : {},
      studySummary:
        typeof parsed?.studySummary === "string" ? parsed.studySummary : "",
    };
  } catch {
    return { annotationsByPage: {}, studySummary: "" };
  }
};

const writeStoredStudyState = (
  documentKey,
  annotationsByPage,
  studySummary,
) => {
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

const hexToRgba = (value, alpha) => {
  if (typeof value !== "string") {
    return `rgba(250, 204, 21, ${alpha})`;
  }

  const normalized = value.trim();

  if (/^#([0-9a-f]{3}){1,2}$/i.test(normalized)) {
    const hex = normalized.slice(1);
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => `${character}${character}`)
            .join("")
        : hex;
    const parsed = Number.parseInt(expanded, 16);

    return `rgba(${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}, ${alpha})`;
  }

  return normalized;
};

const createDraft = (tool, point, defaultNoteText, options = {}) => {
  if (tool === "pen") {
    return {
      type: "pen",
      color: options.penColor || "#2dd4bf",
      width: 3,
      points: [point],
    };
  }

  if (tool === "highlight") {
    return {
      type: "highlight",
      color: options.highlightColor || "rgba(250, 204, 21, 0.34)",
      width: options.highlightStrokeWidth || 18,
      points: [point],
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

const getRangeFromPoint = (x, y) => {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }

  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);

    if (!position) {
      return null;
    }

    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  return null;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPastedPlainText = (plainText) => {
  const normalizedText = String(plainText || "").replace(/\r\n?/g, "\n");
  const blocks = normalizedText.split(/\n{2,}/).filter((block) => block.trim());

  if (blocks.length === 0) {
    return "";
  }

  return blocks
    .map((block) => {
      const htmlBlock = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p><span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;">${htmlBlock}</span></p>`;
    })
    .join("");
};

const sanitizeClinicalRealityHtml = (html) => {
  if (typeof window === "undefined") {
    return String(html || "");
  }

  const container = window.document.createElement("div");
  container.innerHTML = String(html || "");

  container.querySelectorAll("*").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    if (element.tagName === "H3") {
      element.style.removeProperty("line-height");
      element.style.removeProperty("font-family");
    } else {
      element.style.removeProperty("font-size");
      element.style.removeProperty("line-height");
      element.style.removeProperty("font-family");
    }

    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });

  return container.innerHTML;
};

const normalizeOcrText = (value = "") => {
  const normalizedValue = String(value || "").replace(/\r\n?/g, "\n");

  return normalizedValue
    .replace(/-\n(?=\p{L})/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/([^\n])\n(?=[^\n])/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, allLines) => {
      if (!line) {
        return true;
      }

      const compactLine = line.replace(/\s+/g, " ").trim();
      const isStandalonePageMarker =
        /^page\s+\d+$/i.test(compactLine) ||
        /^p\.\s*\d+$/i.test(compactLine) ||
        /^\d+$/.test(compactLine);

      if (!isStandalonePageMarker) {
        return true;
      }

      const previousLine = String(allLines[index - 1] || "").trim();
      const nextLine = String(allLines[index + 1] || "").trim();

      return Boolean(previousLine || nextLine) === false;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  onChooseFile,
  renderInline = false,
  forceVisible = false,
  storedCourseOptions = [],
  selectedCourseName = "",
  onSelectCourseName,
  selectedCourseLectures = [],
  selectedLectureId = "",
  onSelectCourseLecture,
  cloudPdfMessages = [],
  openCloudPdf,
}) => {
  const canvasRefs = useRef({});
  const canvasWrapRef = useRef(null);
  const overlayRefs = useRef({});
  const textLayerRefs = useRef({});
  const pageContainerRefs = useRef({});
  const realityEditorRef = useRef(null);
  const renderTasksRef = useRef({});
  const textLayerBuildersRef = useRef({});
  const draftAnnotationRef = useRef(null);
  const draftAnimationFrameRef = useRef(null);
  const wheelAnimationFrameRef = useRef(null);
  const wheelTargetRef = useRef({ top: 0, left: 0 });
  const pinchGestureRef = useRef(null);
  const threeFingerUndoCooldownRef = useRef(0);
  const panSessionRef = useRef(null);
  const visiblePagesRef = useRef(new Set());
  const layoutSyncTimeoutRef = useRef(null);
  const ocrWorkerRef = useRef(null);
  const ocrWorkerPromiseRef = useRef(null);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(
    Math.max(1, Number(initialPage) || 1),
  );
  const [zoom, setZoom] = useState(
    Math.min(2.5, Math.max(0.6, Number(initialZoom) || 1)),
  );
  const [viewerError, setViewerError] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [renderingPages, setRenderingPages] = useState({});
  const [pageSizes, setPageSizes] = useState({});
  const [canvasWrapWidth, setCanvasWrapWidth] = useState(0);
  const [visiblePages, setVisiblePages] = useState([]);
  const [renderRevision, setRenderRevision] = useState(0);
  const [tool, setTool] = useState(null);
  const [isRealityToolbarOpen, setIsRealityToolbarOpen] = useState(true);
  const [editorTextColor, setEditorTextColor] = useState("#1a3b43");
  const [editorHighlightColor, setEditorHighlightColor] = useState("#fff1a8");
  const [isPenEraseModeOn, setIsPenEraseModeOn] = useState(false);
  const [isHighlightEraseModeOn, setIsHighlightEraseModeOn] =
    useState(false);
  const [highlightStrokeWidth, setHighlightStrokeWidth] = useState(18);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [scrollSpeedFactor, setScrollSpeedFactor] = useState(1.55);
  const [touchZoomResponse, setTouchZoomResponse] = useState(1);
  const [scrollTransitionAmount, setScrollTransitionAmount] = useState(0.22);
  const [hasRealitySelection, setHasRealitySelection] = useState(true);
  const [selectedRealityFontSizePt, setSelectedRealityFontSizePt] =
    useState(12);
  const disableErasers = useCallback(
    (options = { keepPen: false, keepHighlight: false }) => {
      if (!options.keepPen) {
        setIsPenEraseModeOn(false);
      }

      if (!options.keepHighlight) {
        setIsHighlightEraseModeOn(false);
      }
    },
    [],
  );
  const [activePdfToolButton, setActivePdfToolButton] = useState("");
  const [rtlMode, setRtlMode] = useState(true);
  const [antiOcrMode, setAntiOcrMode] = useState(true);
  const [defaultNoteText, setDefaultNoteText] = useState("");
  const [draftAnnotation, setDraftAnnotation] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [annotationsByPage, setAnnotationsByPage] = useState({});
  const [studySummary, setStudySummary] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [normalizedOcrText, setNormalizedOcrText] = useState("");
  const [ocrSourcePage, setOcrSourcePage] = useState(null);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const handlePdfToolButton = useCallback(
    (buttonId, effect) => {
      disableErasers();
      setActivePdfToolButton(buttonId);
      effect?.();
    },
    [disableErasers],
  );

  const documentKey = useMemo(() => {
    return [fileUrl, title, metadata?.sender, metadata?.sizeBytes]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|");
  }, [fileUrl, metadata?.sender, metadata?.sizeBytes, title]);

  const currentAnnotations = annotationsByPage[String(pageNumber)] || [];
  const selectedNote = currentAnnotations.find(
    (annotation) =>
      annotation.id === selectedNoteId && annotation.type === "note",
  );
  const isCurrentPageRendering = Boolean(renderingPages[String(pageNumber)]);
  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, index) => index + 1),
    [numPages],
  );
  const visiblePagesKey = useMemo(
    () =>
      visiblePages
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    [visiblePages],
  );
  const pageRendering = useMemo(
    () => Object.values(renderingPages).some(Boolean),
    [renderingPages],
  );
  const isSelectingText = tool === "select";

  const getOcrWorker = useCallback(async () => {
    if (ocrWorkerRef.current) {
      return ocrWorkerRef.current;
    }

    if (!ocrWorkerPromiseRef.current) {
      ocrWorkerPromiseRef.current = import("tesseract.js").then(
        async ({ createWorker }) => {
          const worker = await createWorker("eng", 1, {
            logger: (message) => {
              if (message?.status) {
                const progressSuffix = Number.isFinite(message?.progress)
                  ? ` ${Math.round(message.progress * 100)}%`
                  : "";
                setOcrStatus(`${message.status}${progressSuffix}`);
              }
            },
          });

          ocrWorkerRef.current = worker;
          return worker;
        },
      );
    }

    return ocrWorkerPromiseRef.current;
  }, []);

  const appendOcrTextToSummary = useCallback(() => {
    const nextText = String(normalizedOcrText || ocrText || "").trim();

    if (!nextText) {
      return;
    }

    setStudySummary((currentValue) => {
      const separator = currentValue.trim() ? "<p><br></p>" : "";
      return `${currentValue}${separator}${formatPastedPlainText(nextText)}`;
    });
  }, [normalizedOcrText, ocrText]);

  const runOcrForCurrentPage = useCallback(async () => {
    const activeCanvas = canvasRefs.current[pageNumber];

    if (!activeCanvas) {
      setOcrStatus("Current page is not ready for OCR yet.");
      return;
    }

    setIsRunningOcr(true);
    setOcrStatus(`Preparing OCR for page ${pageNumber}...`);
    setOcrSourcePage(pageNumber);

    try {
      const worker = await getOcrWorker();
      const result = await worker.recognize(activeCanvas);
      const nextText = String(result?.data?.text || "").trim();
      const nextNormalizedText = normalizeOcrText(nextText);

      setOcrText(nextText);
      setNormalizedOcrText(nextNormalizedText);
      setOcrStatus(
        nextText
          ? `OCR finished for page ${pageNumber}.`
          : `OCR finished for page ${pageNumber}, but no text was detected.`,
      );
    } catch (ocrError) {
      setOcrStatus(
        ocrError?.message || "OCR failed for the current page.",
      );
    } finally {
      setIsRunningOcr(false);
    }
  }, [getOcrWorker, pageNumber]);

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
    draftAnnotationRef.current = draftAnnotation;
  }, [draftAnnotation]);

  useEffect(() => {
    return () => {
      const terminateWorker = async () => {
        try {
          const worker = await ocrWorkerPromiseRef.current;
          await worker?.terminate?.();
        } catch {
          // Ignore OCR worker cleanup failures.
        } finally {
          ocrWorkerRef.current = null;
          ocrWorkerPromiseRef.current = null;
        }
      };

      terminateWorker();
    };
  }, []);

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
        setPageSizes({});
        setRenderingPages({});
        setVisiblePages([]);
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
        setPageSizes({});
        setRenderingPages({});
        setRenderRevision(0);
        visiblePagesRef.current = new Set([
          clampPage(initialPage, nextDocument.numPages || 0),
        ]);
        setVisiblePages(Array.from(visiblePagesRef.current));
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
    if (
      !isOpen ||
      !fileUrl ||
      documentLoading ||
      !pdfDocument ||
      numPages <= 0
    ) {
      return undefined;
    }

    const timeoutIds = [
      window.setTimeout(() => {
        setRenderRevision((currentValue) => currentValue + 1);
      }, 60),
      window.setTimeout(() => {
        setRenderRevision((currentValue) => currentValue + 1);
      }, 220),
    ];

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [documentLoading, fileUrl, isOpen, numPages, pdfDocument]);

  useEffect(() => {
    if (!isOpen || !pdfDocument || canvasWrapWidth <= 0) {
      return undefined;
    }

    let isCancelled = false;
    const pagesToRender = Array.from(
      new Set(
        [pageNumber - 1, pageNumber, pageNumber + 1, ...visiblePages].filter(
          (pageIndex) => pageIndex >= 1 && pageIndex <= numPages,
        ),
      ),
    );

    const setPageRenderingState = (pageIndex, nextState) => {
      const pageKey = String(pageIndex);
      setRenderingPages((currentState) =>
        currentState[pageKey] === nextState
          ? currentState
          : {
              ...currentState,
              [pageKey]: nextState,
            },
      );
    };

    const renderPage = async (pageIndex) => {
      const canvas = canvasRefs.current[pageIndex];

      if (!canvas) {
        return;
      }

      setPageRenderingState(pageIndex, true);

      try {
        const page = await pdfDocument.getPage(pageIndex);

        if (isCancelled) {
          return;
        }

        const unscaledViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(320, canvasWrapWidth - 32);
        const baseScale = availableWidth / Math.max(1, unscaledViewport.width);
        const viewport = page.getViewport({
          scale: Math.max(0.25, baseScale) * zoom,
        });
        const outputScale =
          typeof window !== "undefined"
            ? Math.max(window.devicePixelRatio || 1, 1)
            : 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas rendering is not available.");
        }

        canvas.width = Math.round(viewport.width * outputScale);
        canvas.height = Math.round(viewport.height * outputScale);
        canvas.style.width = `${Math.round(viewport.width)}px`;
        canvas.style.height = `${Math.round(viewport.height)}px`;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        setPageSizes((currentState) => {
          const pageKey = String(pageIndex);
          const nextSize = {
            width: Math.round(viewport.width),
            height: Math.round(viewport.height),
          };
          const currentSize = currentState[pageKey];

          if (
            currentSize?.width === nextSize.width &&
            currentSize?.height === nextSize.height
          ) {
            return currentState;
          }

          return {
            ...currentState,
            [pageKey]: nextSize,
          };
        });

        renderTasksRef.current[pageIndex]?.cancel?.();
        const nextRenderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTasksRef.current[pageIndex] = nextRenderTask;
        await nextRenderTask.promise;

        const textLayerDiv = textLayerRefs.current[pageIndex];

        if (textLayerDiv) {
          try {
            textLayerDiv.innerHTML = "";
            textLayerDiv.style.setProperty(
              "--scale-factor",
              `${viewport.scale}`,
            );

            const textContentSource = await page.getTextContent({
              normalizeWhitespace: true,
            });
            const builder =
              textLayerBuildersRef.current[pageIndex] ||
              new TextLayerBuilder({});

            textLayerBuildersRef.current[pageIndex] = builder;
            textLayerDiv.append(builder.div);
            builder.div.style.setProperty(
              "--scale-factor",
              `${viewport.scale}`,
            );
            builder.setTextContentSource(textContentSource);
            await builder.render(viewport);
          } catch {
            // Keep the canvas visible even if text-layer generation fails.
          }
        }
      } catch (renderError) {
        if (
          !isCancelled &&
          renderError?.name !== "RenderingCancelledException"
        ) {
          setViewerError(
            renderError?.message || "Unable to render this PDF page.",
          );
        }
      } finally {
        if (!isCancelled) {
          setPageRenderingState(pageIndex, false);
        }
      }
    };

    setViewerError("");
    pagesToRender.forEach((pageIndex) => {
      renderPage(pageIndex);
    });

    return () => {
      isCancelled = true;
      pagesToRender.forEach((pageIndex) => {
        renderTasksRef.current[pageIndex]?.cancel?.();
      });
    };
  }, [
    canvasWrapWidth,
    isOpen,
    numPages,
    pageNumber,
    pdfDocument,
    renderRevision,
    visiblePagesKey,
    zoom,
  ]);

  useEffect(
    () => () => {
      Object.values(renderTasksRef.current).forEach((task) => task?.cancel?.());
      if (layoutSyncTimeoutRef.current) {
        window.clearTimeout(layoutSyncTimeoutRef.current);
        layoutSyncTimeoutRef.current = null;
      }
      if (draftAnimationFrameRef.current) {
        window.cancelAnimationFrame(draftAnimationFrameRef.current);
        draftAnimationFrameRef.current = null;
      }
      if (wheelAnimationFrameRef.current) {
        window.cancelAnimationFrame(wheelAnimationFrameRef.current);
        wheelAnimationFrameRef.current = null;
      }
      pinchGestureRef.current = null;
    },
    [],
  );

  useEffect(
    () => () => {
      pdfDocument?.destroy?.().catch(() => {});
    },
    [pdfDocument],
  );

  const isVisible = forceVisible || isOpen;

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const wrapElement = canvasWrapRef.current;

    if (!wrapElement) {
      return undefined;
    }

    const syncWidth = () => {
      const nextWidth = Math.max(0, wrapElement.clientWidth || 0);
      setCanvasWrapWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    syncWidth();

    let animationFrameId = 0;
    let secondAnimationFrameId = 0;

    animationFrameId = window.requestAnimationFrame(() => {
      syncWidth();
      secondAnimationFrameId = window.requestAnimationFrame(() => {
        syncWidth();
      });
    });

    layoutSyncTimeoutRef.current = window.setTimeout(() => {
      syncWidth();
      layoutSyncTimeoutRef.current = null;
    }, 180);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        syncWidth();
      });

      observer.observe(wrapElement);

      return () => {
        observer.disconnect();
        window.cancelAnimationFrame(animationFrameId);
        window.cancelAnimationFrame(secondAnimationFrameId);
        if (layoutSyncTimeoutRef.current) {
          window.clearTimeout(layoutSyncTimeoutRef.current);
          layoutSyncTimeoutRef.current = null;
        }
      };
    }

    window.addEventListener("resize", syncWidth);
    return () => {
      window.removeEventListener("resize", syncWidth);
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(secondAnimationFrameId);
      if (layoutSyncTimeoutRef.current) {
        window.clearTimeout(layoutSyncTimeoutRef.current);
        layoutSyncTimeoutRef.current = null;
      }
    };
  }, [documentLoading, fileUrl, isVisible, numPages]);

  useEffect(() => {
    if (!isVisible || !canvasWrapRef.current || !pageNumbers.length) {
      return undefined;
    }

    const rootElement = canvasWrapRef.current;

    if (typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let strongestVisiblePage = null;
        let strongestRatio = 0;

        entries.forEach((entry) => {
          const pageIndex = Number(entry.target.dataset.pageNumber);

          if (!pageIndex) {
            return;
          }

          if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
            visiblePagesRef.current.add(pageIndex);

            if (entry.intersectionRatio > strongestRatio) {
              strongestRatio = entry.intersectionRatio;
              strongestVisiblePage = pageIndex;
            }
          } else {
            visiblePagesRef.current.delete(pageIndex);
          }
        });

        const nextVisiblePages = Array.from(visiblePagesRef.current).sort(
          (firstPage, secondPage) => firstPage - secondPage,
        );
        setVisiblePages((currentPages) =>
          currentPages.length === nextVisiblePages.length &&
          currentPages.every((page, index) => page === nextVisiblePages[index])
            ? currentPages
            : nextVisiblePages,
        );

        if (strongestVisiblePage) {
          setPageNumber((currentPage) =>
            currentPage === strongestVisiblePage
              ? currentPage
              : strongestVisiblePage,
          );
        }
      },
      {
        root: rootElement,
        threshold: [0.2, 0.45, 0.7, 0.9],
      },
    );

    pageNumbers.forEach((pageIndex) => {
      const pageElement = pageContainerRefs.current[pageIndex];

      if (pageElement) {
        observer.observe(pageElement);
      }
    });

    return () => observer.disconnect();
  }, [isVisible, pageNumbers]);

  const setPageAnnotations = (targetPageNumber, updater) => {
    setAnnotationsByPage((currentState) => {
      const pageKey = String(targetPageNumber);
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
  const isPdfToolButtonActive = (id) => activePdfToolButton === id;

  const getRelativePoint = (event, targetPageNumber) => {
    const overlay = overlayRefs.current[targetPageNumber];

    if (!overlay) {
      return { x: 0, y: 0 };
    }

    const bounds = overlay.getBoundingClientRect();

    return {
      x: clampUnit((event.clientX - bounds.left) / Math.max(bounds.width, 1)),
      y: clampUnit((event.clientY - bounds.top) / Math.max(bounds.height, 1)),
    };
  };

  const eraseHighlightAnnotationsAtPoint = (targetPageNumber, point) => {
    const currentPageSize = pageSizes[String(targetPageNumber)] || {};
    const width = Math.max(currentPageSize.width || 0, 1);
    const height = Math.max(currentPageSize.height || 0, 1);
    const eraserRadius = Math.max(
      10,
      Math.min(24, Math.min(width, height) * 0.02),
    );

    setPageAnnotations(targetPageNumber, (entries) =>
      entries.flatMap((entry) => {
        if (entry.type !== "highlight" || !Array.isArray(entry.points)) {
          return [entry];
        }

        const segments = [];
        let currentSegment = [];

        entry.points.forEach((penPoint) => {
          const deltaX = (penPoint.x - point.x) * width;
          const deltaY = (penPoint.y - point.y) * height;
          const isInsideEraseRadius =
            Math.hypot(deltaX, deltaY) <= eraserRadius;

          if (isInsideEraseRadius) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
              currentSegment = [];
            }

            return;
          }

          currentSegment.push(penPoint);
        });

        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }

        return segments.map((segment, segmentIndex) => ({
          ...entry,
          id: `${entry.id || entry.type}-${segmentIndex}-${Date.now()}`,
          points: segment,
        }));
      }),
    );
  };

  const erasePenAnnotationsAtPoint = (targetPageNumber, point) => {
    const currentPageSize = pageSizes[String(targetPageNumber)] || {};
    const width = Math.max(currentPageSize.width || 0, 1);
    const height = Math.max(currentPageSize.height || 0, 1);
    const eraserRadius = Math.max(
      10,
      Math.min(24, Math.min(width, height) * 0.02),
    );

    setPageAnnotations(targetPageNumber, (entries) =>
      entries.flatMap((entry) => {
        if (entry.type !== "pen" || !Array.isArray(entry.points)) {
          return [entry];
        }

        const segments = [];
        let currentSegment = [];

        entry.points.forEach((penPoint) => {
          const deltaX = (penPoint.x - point.x) * width;
          const deltaY = (penPoint.y - point.y) * height;
          const isInsideEraseRadius =
            Math.hypot(deltaX, deltaY) <= eraserRadius;

          if (isInsideEraseRadius) {
            if (currentSegment.length > 0) {
              segments.push(currentSegment);
              currentSegment = [];
            }

            return;
          }

          currentSegment.push(penPoint);
        });

        if (currentSegment.length > 0) {
          segments.push(currentSegment);
        }

        return segments.map((segment, segmentIndex) => ({
          ...entry,
          id: `${entry.id || entry.type}-${segmentIndex}-${Date.now()}`,
          points: segment,
        }));
      }),
    );
  };

  const handlePointerDown = (targetPageNumber, event) => {
    if (
      !fileUrl ||
      Boolean(renderingPages[String(targetPageNumber)]) ||
      documentLoading
    ) {
      return;
    }

    if (isPenEraseModeOn) {
      erasePenAnnotationsAtPoint(
        targetPageNumber,
        getRelativePoint(event, targetPageNumber),
      );
      event.preventDefault();
      return;
    }

    if (isHighlightEraseModeOn) {
      eraseHighlightAnnotationsAtPoint(
        targetPageNumber,
        getRelativePoint(event, targetPageNumber),
      );
      event.preventDefault();
      return;
    }

    if (!tool) {
      return;
    }

    if (tool === "select") {
      return;
    }

    if (tool === "hand") {
      const wrapElement = canvasWrapRef.current;

      if (!wrapElement) {
        return;
      }

      panSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: wrapElement.scrollLeft,
        startScrollTop: wrapElement.scrollTop,
      };
      event.preventDefault();
      return;
    }

    const point = getRelativePoint(event, targetPageNumber);

    if (tool === "note") {
      const note = createDraft("note", point, defaultNoteText);
      setPageAnnotations(targetPageNumber, (entries) => [...entries, note]);
      setPageNumber(targetPageNumber);
      setSelectedNoteId(note.id);
      return;
    }

    const nextDraft = {
      ...createDraft(tool, point, defaultNoteText, {
        penColor: editorTextColor,
        highlightColor: hexToRgba(editorHighlightColor, 0.34),
        highlightStrokeWidth,
      }),
      pageNumber: targetPageNumber,
    };
    setPageNumber(targetPageNumber);
    draftAnnotationRef.current = nextDraft;
    setDraftAnnotation(nextDraft);
  };

  const handlePointerMove = (targetPageNumber, event) => {
    if (isPenEraseModeOn && event.buttons === 1) {
      erasePenAnnotationsAtPoint(
        targetPageNumber,
        getRelativePoint(event, targetPageNumber),
      );
      event.preventDefault();
      return;
    }

    if (isHighlightEraseModeOn && event.buttons === 1) {
      eraseHighlightAnnotationsAtPoint(
        targetPageNumber,
        getRelativePoint(event, targetPageNumber),
      );
      event.preventDefault();
      return;
    }

    if (tool === "select") {
      return;
    }

    if (tool === "hand" && panSessionRef.current) {
      const wrapElement = canvasWrapRef.current;

      if (!wrapElement) {
        return;
      }

      wrapElement.scrollLeft =
        panSessionRef.current.startScrollLeft -
        (event.clientX - panSessionRef.current.startX);
      wrapElement.scrollTop =
        panSessionRef.current.startScrollTop -
        (event.clientY - panSessionRef.current.startY);
      event.preventDefault();
      return;
    }

    if (!draftAnnotationRef.current) {
      return;
    }

    const point = getRelativePoint(event, targetPageNumber);

    const currentDraft = draftAnnotationRef.current;

    if (currentDraft.pageNumber !== targetPageNumber) {
      return;
    }

    let nextDraft = currentDraft;

    if (currentDraft.type === "pen") {
      nextDraft = {
        ...currentDraft,
        points: [...currentDraft.points, point],
      };
    } else if (currentDraft.type === "highlight") {
      nextDraft = {
        ...currentDraft,
        points: [...currentDraft.points, point],
      };
    }

    if (nextDraft === currentDraft) {
      return;
    }

    draftAnnotationRef.current = nextDraft;

    if (!draftAnimationFrameRef.current) {
      draftAnimationFrameRef.current = window.requestAnimationFrame(() => {
        draftAnimationFrameRef.current = null;
        setDraftAnnotation(draftAnnotationRef.current);
      });
    }
  };

  const animateCanvasWheelScroll = useCallback(() => {
    const wrapElement = canvasWrapRef.current;

    if (!wrapElement) {
      wheelAnimationFrameRef.current = null;
      return;
    }

    const nextTop =
      wrapElement.scrollTop +
      (wheelTargetRef.current.top - wrapElement.scrollTop) *
        scrollTransitionAmount;
    const nextLeft =
      wrapElement.scrollLeft +
      (wheelTargetRef.current.left - wrapElement.scrollLeft) *
        scrollTransitionAmount;

    wrapElement.scrollTop = nextTop;
    wrapElement.scrollLeft = nextLeft;

    const reachedTop =
      Math.abs(wheelTargetRef.current.top - wrapElement.scrollTop) < 1;
    const reachedLeft =
      Math.abs(wheelTargetRef.current.left - wrapElement.scrollLeft) < 1;

    if (reachedTop && reachedLeft) {
      wrapElement.scrollTop = wheelTargetRef.current.top;
      wrapElement.scrollLeft = wheelTargetRef.current.left;
      wheelAnimationFrameRef.current = null;
      return;
    }

    wheelAnimationFrameRef.current = window.requestAnimationFrame(
      animateCanvasWheelScroll,
    );
  }, [scrollTransitionAmount]);

  const handleCanvasWheel = useCallback(
    (event) => {
      if (event.ctrlKey) {
        return;
      }

      const wrapElement = canvasWrapRef.current;

      if (!wrapElement) {
        return;
      }

      event.preventDefault();

      const deltaUnitMultiplier =
        event.deltaMode === 1
          ? 34
          : event.deltaMode === 2
            ? wrapElement.clientHeight * 0.92
            : 1;
      const verticalBoost = scrollSpeedFactor;
      const horizontalBoost = Math.max(1, scrollSpeedFactor - 0.3);
      const nextDeltaY =
        (event.shiftKey ? event.deltaX || event.deltaY : event.deltaY) *
        deltaUnitMultiplier *
        verticalBoost;
      const nextDeltaX =
        (!event.shiftKey ? event.deltaX : 0) *
        deltaUnitMultiplier *
        horizontalBoost;

      if (!wheelAnimationFrameRef.current) {
        wheelTargetRef.current = {
          top: wrapElement.scrollTop,
          left: wrapElement.scrollLeft,
        };
      }

      const maxTop = Math.max(
        0,
        wrapElement.scrollHeight - wrapElement.clientHeight,
      );
      const maxLeft = Math.max(
        0,
        wrapElement.scrollWidth - wrapElement.clientWidth,
      );

      wheelTargetRef.current = {
        top: Math.min(
          maxTop,
          Math.max(0, wheelTargetRef.current.top + nextDeltaY),
        ),
        left: Math.min(
          maxLeft,
          Math.max(0, wheelTargetRef.current.left + nextDeltaX),
        ),
      };

      if (!wheelAnimationFrameRef.current) {
        wheelAnimationFrameRef.current = window.requestAnimationFrame(
          animateCanvasWheelScroll,
        );
      }
    },
    [animateCanvasWheelScroll, scrollSpeedFactor],
  );

  const getTouchDistance = useCallback((firstTouch, secondTouch) => {
    const deltaX = firstTouch.clientX - secondTouch.clientX;
    const deltaY = firstTouch.clientY - secondTouch.clientY;
    return Math.hypot(deltaX, deltaY);
  }, []);

  const undoLastPdfAction = useCallback(() => {
    const editorElement = realityEditorRef.current;
    const activeElement = document.activeElement;
    const isEditingRealityNotes =
      editorElement &&
      activeElement &&
      (activeElement === editorElement || editorElement.contains(activeElement));

    if (isEditingRealityNotes) {
      document.execCommand("undo");

      if (editorElement) {
        setStudySummary(
          sanitizeClinicalRealityHtml(editorElement.innerHTML),
        );
      }

      return;
    }

    if (draftAnnotationRef.current) {
      draftAnnotationRef.current = null;
      setDraftAnnotation(null);
      return;
    }

    const pageKey = String(pageNumber);
    const pageEntries = annotationsByPage[pageKey] || [];
    const lastEntry = pageEntries[pageEntries.length - 1];

    if (!lastEntry) {
      return;
    }

    setPageAnnotations(pageNumber, (entries) => entries.slice(0, -1));

    if (lastEntry.id === selectedNoteId) {
      setSelectedNoteId(null);
    }
  }, [annotationsByPage, pageNumber, selectedNoteId]);

  const handleCanvasTouchStart = useCallback(
    (event) => {
      if (event.touches.length === 3) {
        const now = Date.now();

        if (now - threeFingerUndoCooldownRef.current > 500) {
          threeFingerUndoCooldownRef.current = now;
          event.preventDefault();
          undoLastPdfAction();
        }

        return;
      }

      if (event.touches.length !== 2) {
        return;
      }

      const [firstTouch, secondTouch] = event.touches;
      pinchGestureRef.current = {
        startDistance: getTouchDistance(firstTouch, secondTouch),
        startZoom: zoom,
      };
    },
    [getTouchDistance, undoLastPdfAction, zoom],
  );

  const handleCanvasTouchMove = useCallback(
    (event) => {
      if (event.touches.length !== 2 || !pinchGestureRef.current) {
        return;
      }

      event.preventDefault();

      const [firstTouch, secondTouch] = event.touches;
      const nextDistance = getTouchDistance(firstTouch, secondTouch);
      const startDistance = pinchGestureRef.current.startDistance || nextDistance;

      if (!startDistance) {
        return;
      }

      const nextZoom = Math.max(
        0.6,
        Math.min(
          2.5,
          pinchGestureRef.current.startZoom *
            (1 + (nextDistance / startDistance - 1) * touchZoomResponse),
        ),
      );

      setZoom(Number(nextZoom.toFixed(3)));
    },
    [getTouchDistance, touchZoomResponse],
  );

  const handleCanvasTouchEnd = useCallback(() => {
    pinchGestureRef.current = null;
  }, []);

  const finalizeDraft = () => {
    if (panSessionRef.current) {
      panSessionRef.current = null;
      return;
    }

    const currentDraft = draftAnnotationRef.current;

    if (draftAnimationFrameRef.current) {
      window.cancelAnimationFrame(draftAnimationFrameRef.current);
      draftAnimationFrameRef.current = null;
    }

    if (!currentDraft) {
      return;
    }

    const annotation = {
      ...currentDraft,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setPageAnnotations(annotation.pageNumber, (entries) => [
      ...entries,
      annotation,
    ]);
    draftAnnotationRef.current = null;
    setDraftAnnotation(null);
  };

  const updateSelectedNote = (nextText) => {
    setPageAnnotations(pageNumber, (entries) =>
      entries.map((entry) =>
        entry.id === selectedNoteId && entry.type === "note"
          ? { ...entry, text: nextText }
          : entry,
      ),
    );
  };

  const deleteAnnotation = (annotationId) => {
    setPageAnnotations(pageNumber, (entries) =>
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

  const focusRealityEditor = () => {
    if (realityEditorRef.current) {
      realityEditorRef.current.focus();
    }
  };

  const hasActiveSelectionInsideEditor = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return false;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    return (
      !!editorElement && editorElement.contains(range.commonAncestorContainer)
    );
  };

  const insertHtmlAtCurrentSelection = (html) => {
    document.execCommand("insertHTML", false, html);
  };

  useEffect(() => {
    const editorElement = realityEditorRef.current;

    if (!editorElement) {
      return;
    }

    const sanitizedSummary = sanitizeClinicalRealityHtml(studySummary);

    if (editorElement.innerHTML !== sanitizedSummary) {
      editorElement.innerHTML = sanitizedSummary;
    }
  }, [studySummary]);

  useEffect(() => {
    const syncRealitySelection = () => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasRealitySelection(false);
        setSelectedRealityFontSizePt(null);
        return;
      }

      const editorElement = realityEditorRef.current;
      const range = selection.getRangeAt(0);
      const hasSelectionInsideEditor =
        !!editorElement &&
        editorElement.contains(range.commonAncestorContainer) &&
        selection.toString().trim().length > 0;

      setHasRealitySelection(hasSelectionInsideEditor);

      if (!hasSelectionInsideEditor) {
        setSelectedRealityFontSizePt(null);
        return;
      }

      const parentElement =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : range.startContainer;
      const computedFontSizePx = Number.parseFloat(
        window.getComputedStyle(parentElement).fontSize,
      );
      const computedFontSizePt = computedFontSizePx * 0.75;

      setSelectedRealityFontSizePt(Number(computedFontSizePt.toFixed(1)));
    };

    document.addEventListener("selectionchange", syncRealitySelection);
    return () => {
      document.removeEventListener("selectionchange", syncRealitySelection);
    };
  }, []);

  const applyEditorCommand = (command, value = null) => {
    if (command === "justifyLeft") {
      setRtlMode(false);
    }

    if (command === "justifyRight") {
      setRtlMode(true);
    }

    if (!hasActiveSelectionInsideEditor()) {
      focusRealityEditor();
    }

    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, value);

    if (realityEditorRef.current) {
      setStudySummary(
        sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
      );
    }
  };

  const applyHighlightToSelection = () => {
    disableErasers();
    setTool((currentTool) =>
      currentTool === "highlight" ? null : "highlight",
    );
  };

  const clearTransparentHighlightArtifacts = () => {
    if (!realityEditorRef.current) {
      return;
    }

    realityEditorRef.current
      .querySelectorAll(
        '[style*="background-color: transparent"], [style*="background-color: rgba(0, 0, 0, 0)"]',
      )
      .forEach((element) => {
        element.style.backgroundColor = "";

        if (!element.getAttribute("style")?.trim()) {
          element.removeAttribute("style");
        }
      });
  };

  const eraseHighlightAtPoint = (clientX, clientY) => {
    const editorElement = realityEditorRef.current;

    if (!editorElement) {
      return;
    }

    const caretRange = getRangeFromPoint(clientX, clientY);

    if (!caretRange || !editorElement.contains(caretRange.startContainer)) {
      return;
    }

    const textNode =
      caretRange.startContainer.nodeType === Node.TEXT_NODE
        ? caretRange.startContainer
        : null;

    if (!textNode || !textNode.textContent) {
      return;
    }

    const offset = Math.min(
      caretRange.startOffset,
      Math.max(textNode.textContent.length - 1, 0),
    );

    const charRange = document.createRange();
    charRange.setStart(textNode, offset);
    charRange.setEnd(
      textNode,
      Math.min(offset + 1, textNode.textContent.length),
    );

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(charRange);
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, "transparent");
    clearTransparentHighlightArtifacts();
    selection.removeAllRanges();
    setHasRealitySelection(false);
    setSelectedRealityFontSizePt(null);
    setStudySummary(sanitizeClinicalRealityHtml(editorElement.innerHTML));
  };

  const handleRealityEditorMouseDown = (event) => {
    if (!isHighlightEraseModeOn) {
      return;
    }

    event.preventDefault();
    eraseHighlightAtPoint(event.clientX, event.clientY);
  };

  const handleRealityEditorMouseMove = (event) => {
    if (!isHighlightEraseModeOn || event.buttons !== 1) {
      return;
    }

    event.preventDefault();
    eraseHighlightAtPoint(event.clientX, event.clientY);
  };

  const removeHighlightFromSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return false;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (
      !editorElement ||
      !editorElement.contains(range.commonAncestorContainer)
    ) {
      return false;
    }

    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, "transparent");
    clearTransparentHighlightArtifacts();
    selection.removeAllRanges();
    setHasRealitySelection(false);
    setSelectedRealityFontSizePt(null);
    setStudySummary(sanitizeClinicalRealityHtml(editorElement.innerHTML));
    return true;
  };

  const handleRealityEditorPaste = (event) => {
    event.preventDefault();

    const plainText = event.clipboardData?.getData("text/plain") || "";
    const htmlToInsert = formatPastedPlainText(plainText);

    if (!htmlToInsert) {
      return;
    }

    focusRealityEditor();
    insertHtmlAtCurrentSelection(htmlToInsert);

    if (realityEditorRef.current) {
      setStudySummary(
        sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
      );
    }
  };

  const handleRealityEditorBeforeInput = (event) => {
    if (event.isComposing) {
      return;
    }

    if (event.inputType === "insertText" && event.data) {
      event.preventDefault();
      focusRealityEditor();
      insertHtmlAtCurrentSelection(
        `<span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;">${escapeHtml(event.data)}</span>`,
      );

      if (realityEditorRef.current) {
        setStudySummary(
          sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
        );
      }
      return;
    }

    if (event.inputType === "insertParagraph") {
      event.preventDefault();
      focusRealityEditor();
      insertHtmlAtCurrentSelection(
        `<p><span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;"><br></span></p>`,
      );

      if (realityEditorRef.current) {
        setStudySummary(
          sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
        );
      }
    }
  };

  const adjustSelectedFontSize = (delta) => {
    if (tool === "highlight") {
      setHighlightStrokeWidth((currentWidth) =>
        Math.max(8, Math.min(36, currentWidth + delta * 2)),
      );
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (
      !editorElement ||
      !editorElement.contains(range.commonAncestorContainer)
    ) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
      return;
    }

    const selectedText = selection.toString();

    if (!selectedText.trim()) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
      return;
    }

    const parentElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    const computedFontSizePx = Number.parseFloat(
      window.getComputedStyle(parentElement).fontSize,
    );
    const computedFontSizePt = computedFontSizePx * 0.75;
    const roundedFontSizePt = Number(computedFontSizePt.toFixed(3));
    const isWholePointSize = Number.isInteger(roundedFontSizePt);
    let nextFontSizePt = roundedFontSizePt;

    if (delta > 0) {
      nextFontSizePt = isWholePointSize
        ? roundedFontSizePt + delta
        : Math.ceil(roundedFontSizePt);
    } else if (delta < 0) {
      nextFontSizePt = isWholePointSize
        ? roundedFontSizePt + delta
        : Math.floor(roundedFontSizePt);
    }

    nextFontSizePt = Math.max(9, Math.min(31.5, nextFontSizePt));
    const extractedContent = range.extractContents();
    const fragmentChildNodes = Array.from(extractedContent.childNodes);
    const sizeWrapper = document.createElement("span");

    sizeWrapper.style.fontSize = `${nextFontSizePt.toFixed(1)}pt`;
    sizeWrapper.style.lineHeight = "inherit";
    sizeWrapper.appendChild(extractedContent);
    range.insertNode(sizeWrapper);

    selection.removeAllRanges();
    const updatedRange = document.createRange();

    if (fragmentChildNodes.length > 0) {
      updatedRange.setStartBefore(fragmentChildNodes[0]);
      updatedRange.setEndAfter(
        fragmentChildNodes[fragmentChildNodes.length - 1],
      );
    } else {
      updatedRange.selectNodeContents(sizeWrapper);
    }

    selection.addRange(updatedRange);

    setStudySummary(sanitizeClinicalRealityHtml(editorElement.innerHTML));
    setHasRealitySelection(true);
    setSelectedRealityFontSizePt(Number(nextFontSizePt.toFixed(1)));
  };

  const scrollToPage = (targetPageNumber) => {
    const nextPage = clampPage(targetPageNumber, numPages);
    const pageElement = pageContainerRefs.current[nextPage];

    setPageNumber(nextPage);

    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  const shell = (
    <div
      id="pdfReader_shell"
      className="pdfReader_shell pdfReader_shell--study"
      dir={rtlMode ? "rtl" : "ltr"}
      style={{
        "--pdf-reader-highlight-color": editorHighlightColor,
      }}
    >
      <div id="PDF_controlwrapper" className="PDF_controlwrapper">
        <div id="pdfReader_toolbar" className="pdfReader_toolbar">
          <div id="pdfReader_titleWrap" className="pdfReader_titleWrap">
            <p id="pdfReader_title" className="pdfReader_title">
              {title || "Telegram PDF"}
            </p>
            <p id="pdfReader_subtitle" className="pdfReader_subtitle">
              {metadata?.sender ? `${metadata.sender} • ` : ""}
              {getReadableSize(metadata?.sizeBytes) || "PDF"}
            </p>
          </div>
          <div id="pdfReader_controls" className="pdfReader_controls">
            <div id="PDF_pageControls" className="PDF_pageControls">
              <button
                id="pdfReader_prevButton"
                type="button"
                onClick={() => scrollToPage(pageNumber - 1)}
                disabled={pageNumber <= 1 || !numPages}
              >
                Prev
              </button>
              <span id="pdfReader_pageCounter">
                {pageNumber}/{numPages || "-"}
              </span>
              <button
                id="pdfReader_nextButton"
                type="button"
                onClick={() => scrollToPage(pageNumber + 1)}
                disabled={!numPages || pageNumber >= numPages}
              >
                Next
              </button>
            </div>
            <div id="PDF_zoomControls" className="PDF_zoomControls">
              <button
                id="pdfReader_zoomOutButton"
                type="button"
                onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))}
                disabled={zoom <= 0.6}
              >
                -
              </button>
              <span id="pdfReader_zoomPercent">{Math.round(zoom * 100)}%</span>
              <button
                id="pdfReader_zoomInButton"
                type="button"
                onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
                disabled={zoom >= 2.5}
              >
                +
              </button>
            </div>
            {onChooseFile ? (
              <div className="pdfReader_uploadWrapper">
                <button
                  id="pdfReader_choosePdfButton"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowUploadPanel((value) => !value);
                  }}
                >
                  Choose PDF
                </button>
                {showUploadPanel ? (
                  <div className="pdfReader_uploadDropdown">
                    <button
                      type="button"
                      onClick={() => {
                        onChooseFile();
                        setShowUploadPanel(false);
                      }}
                    >
                      Upload local file
                    </button>
                    <p className="pdfReader_uploadHint">Cloud PDFs</p>
                    {cloudPdfMessages.length ? (
                      <ul className="pdfReader_uploadList">
                        {cloudPdfMessages.map((message) => {
                          const itemKey =
                            String(message?.publicId || "").trim() ||
                            String(message?.assetId || "").trim() ||
                            String(message?.url || "").trim();
                          const cloudTitle =
                            String(message?.publicId || "")
                              .trim()
                              .split("/")
                              .pop() || "Cloud PDF";

                          return (
                            <li
                              key={itemKey || message?.url}
                              className="pdfReader_uploadListItem"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  openCloudPdf?.(message);
                                  setShowUploadPanel(false);
                                }}
                              >
                                <span>{cloudTitle}</span>
                                <small>
                                  {Number(message?.bytes || 0) > 0
                                    ? `${(Number(message?.bytes) / 1024).toFixed(
                                        1,
                                      )} KB`
                                    : "Stored in Cloudinary"}
                                </small>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="pdfReader_uploadHint">
                        No Cloud PDFs were found in your saved media.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              id="pdfReader_openTabButton"
              type="button"
              onClick={onOpenInNewTab}
              disabled={!fileUrl}
            >
              Open Tab
            </button>
            <button
              id="pdfReader_downloadButton"
              type="button"
              onClick={onDownload}
              disabled={!fileUrl}
            >
              Download
            </button>
            <button
              id="pdfReader_settingsButton"
              type="button"
              aria-pressed={isSettingsPanelOpen}
              onClick={() =>
                setIsSettingsPanelOpen((currentValue) => !currentValue)
              }
            >
              Settings
            </button>
            <button id="pdfReader_closeButton" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div
          id="PDF_tools"
          className={`PDF_tools fr${isRealityToolbarOpen ? " is-open" : ""}`}
          aria-hidden={!isRealityToolbarOpen}
        >
          <div id="PDF_textDecorationTools" className="PDF_tools_SubGroups">
            <span id="PDF_textDecorationTools_formatLabel">Format</span>
            <button
              id="PDF_textDecorationTools_bold"
              type="button"
              className={`Login_realityControlButton${isPdfToolButtonActive("PDF_textDecorationTools_bold") ? " is-armed" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                handlePdfToolButton("PDF_textDecorationTools_bold", () =>
                  applyEditorCommand("bold"),
                )
              }
            >
              B
            </button>
            <button
              id="PDF_textDecorationTools_italic"
              type="button"
              className={`Login_realityControlButton${isPdfToolButtonActive("PDF_textDecorationTools_italic") ? " is-armed" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                handlePdfToolButton("PDF_textDecorationTools_italic", () =>
                  applyEditorCommand("italic"),
                )
              }
            >
              I
            </button>
            <button
              id="PDF_textDecorationTools_underline"
              type="button"
              className={`Login_realityControlButton${isPdfToolButtonActive("PDF_textDecorationTools_underline") ? " is-armed" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                handlePdfToolButton("PDF_textDecorationTools_underline", () =>
                  applyEditorCommand("underline"),
                )
              }
            >
              U
            </button>
          </div>
          <div id="PDF_textStyleTools" className="PDF_tools_SubGroups">
            <label
              id="PDF_textStyleTools_alignGroup"
              className="Login_realityControlField"
            >
              <span id="PDF_textStyleTools_alignLabel">Align</span>
              <button
                id="PDF_textStyleTools_alignLeft"
                type="button"
                className={`Login_realityControlButton Login_realityControlButton--align${isPdfToolButtonActive("PDF_textStyleTools_alignLeft") ? " is-armed" : ""}`}
                title="Align left"
                aria-label="Align left"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  handlePdfToolButton("PDF_textStyleTools_alignLeft", () =>
                    applyEditorCommand("justifyLeft"),
                  )
                }
              >
                <i className="fas fa-align-left"></i>
              </button>
              <button
                id="PDF_textStyleTools_alignCenter"
                type="button"
                className={`Login_realityControlButton Login_realityControlButton--align${isPdfToolButtonActive("PDF_textStyleTools_alignCenter") ? " is-armed" : ""}`}
                title="Align center"
                aria-label="Align center"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  handlePdfToolButton("PDF_textStyleTools_alignCenter", () =>
                    applyEditorCommand("justifyCenter"),
                  )
                }
              >
                <i className="fas fa-align-center"></i>
              </button>
              <button
                id="PDF_textStyleTools_alignRight"
                type="button"
                className={`Login_realityControlButton Login_realityControlButton--align${isPdfToolButtonActive("PDF_textStyleTools_alignRight") ? " is-armed" : ""}`}
                title="Align right"
                aria-label="Align right"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  handlePdfToolButton("PDF_textStyleTools_alignRight", () =>
                    applyEditorCommand("justifyRight"),
                  )
                }
              >
                <i className="fas fa-align-right"></i>
              </button>
            </label>
          </div>
          <div id="PDF_tools_penGroup" className="PDF_tools_SubGroups">
            <span id="PDF_tools_penGroup_penLabel">Pen</span>
            <button
              id="PDF_tools_tool_pen"
              type="button"
              className={`Login_realityControlButton Login_realityControlButton--pen${tool === "pen" ? " is-armed" : ""}`}
              title="Pen"
              aria-label="Pen"
              aria-pressed={tool === "pen"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                disableErasers({ keepPen: true });
                setTool((currentTool) =>
                  currentTool === "pen" ? null : "pen",
                );
              }}
            >
              <i className="fas fa-pen" style={{ color: editorTextColor }}></i>
            </button>
            <button
              id="PDF_tools_penEraserButton"
              type="button"
              className={`Login_realityControlButton Login_realityControlButton--erase${isPenEraseModeOn ? " is-armed" : ""}`}
              title="Pen eraser"
              aria-label="Pen eraser"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                disableErasers({ keepPen: true });
                setTool("pen");
                setIsPenEraseModeOn((currentValue) => !currentValue);
              }}
            >
              <i className="fas fa-eraser"></i>
            </button>
            <input
              id="PDF_tools_textColorInput"
              type="color"
              value={editorTextColor}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => {
                setEditorTextColor(event.target.value);
                applyEditorCommand("foreColor", event.target.value);
              }}
            />
          </div>
          <label id="PDF_tools_toolGroup" className="Login_realityControlField">
            <span id="PDF_tools_toolLabel">Tool</span>
            {TOOLS.filter((entry) => entry.id !== "pen" && entry.id !== "hand").map((entry) => (
              <button
                id={`PDF_tools_tool_${entry.id}`}
                key={entry.id}
                type="button"
                className={`Login_realityControlButton Login_realityControlButton--pen${tool === entry.id ? " is-armed" : ""}`}
                title={
                  entry.title ||
                  entry.id.charAt(0).toUpperCase() + entry.id.slice(1)
                }
                aria-label={
                  entry.title ||
                  entry.id.charAt(0).toUpperCase() + entry.id.slice(1)
                }
                aria-pressed={tool === entry.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  disableErasers();
                  setTool((currentTool) =>
                    currentTool === entry.id ? null : entry.id,
                  );
                }}
              >
                {entry.label}
              </button>
            ))}
          </label>
          <label
            id="PDF_tools_highlightGroup"
            className="PDF_tools_SubGroups"
          >
            <span id="PDF_tools_highlightLabel">Highlight</span>
            <button
              id="PDF_tools_highlightButton"
              type="button"
              className={`Login_realityControlButton Login_realityControlButton--pen${tool === "highlight" ? " is-armed" : ""}`}
              title="Free highlight on PDF"
              aria-label="Free highlight on PDF"
              aria-pressed={tool === "highlight"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={applyHighlightToSelection}
            >
              <i className="fas fa-highlighter pdfReader_highlightIcon"></i>
            </button>
            <button
              id="PDF_tools_highlightEraserButton"
              type="button"
              className={`Login_realityControlButton Login_realityControlButton--erase${isHighlightEraseModeOn ? " is-armed" : ""}`}
              title="Eraser"
              aria-label="Eraser"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const removedSelectionHighlight =
                  removeHighlightFromSelection();

                if (!removedSelectionHighlight) {
                  disableErasers({ keepHighlight: true });
                  setTool("pen");
                  setIsHighlightEraseModeOn((currentValue) => !currentValue);
                }
              }}
            >
              <i className="fas fa-eraser"></i>
            </button>
            <input
              id="PDF_tools_highlightColorInput"
              type="color"
              value={editorHighlightColor}
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => {
                setEditorHighlightColor(event.target.value);
              }}
            />
          </label>
          <label
            id="PDF_tools_sizeGroup"
            className="PDF_tools_SubGroups"
          >
            <span id="PDF_tools_sizeLabel">Size</span>
            <output
              id="PDF_tools_sizeOutput"
              className={`Login_realityControlMonitor${tool === "highlight" || hasRealitySelection ? " is-active" : ""}`}
              aria-live="polite"
            >
              {tool === "highlight"
                ? `${highlightStrokeWidth}px`
                : hasRealitySelection && selectedRealityFontSizePt !== null
                  ? `${selectedRealityFontSizePt}pt`
                  : "--"}
            </output>
            <button
              id="PDF_tools_sizeDecreaseButton"
              type="button"
              className="Login_realityControlButton Login_realityControlButton--size"
              title={
                tool === "highlight"
                  ? "Decrease highlight thickness"
                  : "Decrease selected text size"
              }
              aria-label={
                tool === "highlight"
                  ? "Decrease highlight thickness"
                  : "Decrease selected text size"
              }
              disabled={
                tool === "highlight"
                  ? highlightStrokeWidth <= 8
                  : !hasRealitySelection
              }
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                disableErasers();
                adjustSelectedFontSize(-1);
              }}
            >
              A-
            </button>
            <button
              id="PDF_tools_sizeIncreaseButton"
              type="button"
              className="Login_realityControlButton Login_realityControlButton--size"
              title={
                tool === "highlight"
                  ? "Increase highlight thickness"
                  : "Increase selected text size"
              }
              aria-label={
                tool === "highlight"
                  ? "Increase highlight thickness"
                  : "Increase selected text size"
              }
              disabled={
                tool === "highlight"
                  ? highlightStrokeWidth >= 36
                  : !hasRealitySelection
              }
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                disableErasers();
                adjustSelectedFontSize(1);
              }}
            >
              A+
            </button>
            <button
              id="PDF_tools_tool_hand"
              type="button"
              className={`Login_realityControlButton Login_realityControlButton--pen${tool === "hand" ? " is-armed" : ""}`}
              title="Hand"
              aria-label="Hand"
              aria-pressed={tool === "hand"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                disableErasers();
                setTool((currentTool) => (currentTool === "hand" ? null : "hand"));
              }}
            >
            <i className="fas fa-hand-paper"></i>
          </button>
          </label>
        </div>
      </div>
      <div id="pdfReader_studyLayout" className="pdfReader_studyLayout">
        <aside id="pdfReader_studyPanel" className="pdfReader_studyPanel">
          <div
            id="pdfReader_courseSelectBlock"
            className="pdfReader_panelBlock"
          >
            <label
              id="pdfReader_courseSelectLabel"
              className="pdfReader_inputLabel"
              htmlFor="pdfReader_courseSelect"
            >
              Select course
            </label>
            <select
              id="pdfReader_courseSelect"
              className="pdfReader_courseSelect"
              value={selectedCourseName}
              onChange={(event) => onSelectCourseName?.(event.target.value)}
            >
              <option value="">Select course</option>
              {storedCourseOptions.map((courseName) => (
                <option key={courseName} value={courseName}>
                  {courseName}
                </option>
              ))}
            </select>
          </div>

          <div id="pdfReader_lectureListBlock" className="pdfReader_panelBlock">
            <h3 id="pdfReader_lectureListHeading">Stored lectures</h3>
            <ul id="pdfReader_lectureList" className="pdfReader_lectureList">
              {selectedCourseLectures.length ? (
                selectedCourseLectures.map((lecture) => (
                  <li
                    key={lecture.id}
                    id={`pdfReader_lectureListItem-${lecture.id}`}
                    className="pdfReader_lectureListItem"
                  >
                    <button
                      id={`pdfReader_lectureButton-${lecture.id}`}
                      type="button"
                      className={`pdfReader_lectureButton${
                        lecture.id === selectedLectureId ? " is-selected" : ""
                      }`}
                      onClick={() => onSelectCourseLecture?.(lecture)}
                      disabled={!lecture.pdfUrl}
                    >
                      <strong>{lecture.title}</strong>
                      <span>
                        {lecture.pdfUrl
                          ? "Open lecture PDF"
                          : "No PDF available"}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li
                  id="pdfReader_lectureListEmpty"
                  className="pdfReader_lectureListEmpty"
                >
                  {selectedCourseName
                    ? "No stored lectures found for this course."
                    : "Choose a course to view its stored lectures."}
                </li>
              )}
            </ul>
          </div>
        </aside>

        <div id="pdfReader_canvasSection" className="pdfReader_canvasSection">
          <div
            id="pdfReader_canvasWrap"
            className="pdfReader_canvasWrap pdfReader_canvasWrap--nativescrollable"
            ref={canvasWrapRef}
            onWheel={handleCanvasWheel}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onTouchCancel={handleCanvasTouchEnd}
          >
            {isLoading || documentLoading ? (
              <p id="pdfReader_statusLoading" className="pdfReader_status">
                Opening PDF...
              </p>
            ) : error ? (
              <p id="pdfReader_statusError" className="pdfReader_status">
                {error}
              </p>
            ) : viewerError ? (
              <p id="pdfReader_statusViewerError" className="pdfReader_status">
                {viewerError}
              </p>
            ) : !fileUrl ? (
              <p id="pdfReader_statusEmpty" className="pdfReader_status">
                No PDF selected.
              </p>
            ) : (
              <div id="pdfReader_canvasStack" className="pdfReader_canvasStack">
                {isCurrentPageRendering ? (
                  <p
                    id="pdfReader_statusRendering"
                    className="pdfReader_status pdfReader_status--floating"
                  >
                    Rendering page {pageNumber}...
                  </p>
                ) : null}
                {pageNumbers.map((pageIndex) => {
                  const pageSize = pageSizes[String(pageIndex)] || {
                    width: 0,
                    height: 0,
                  };
                  const pageAnnotations =
                    annotationsByPage[String(pageIndex)] || [];

                  return (
                    <div
                      id={`pdfReader_canvasStage-${pageIndex}`}
                      key={pageIndex}
                      ref={(node) => {
                        if (node) {
                          pageContainerRefs.current[pageIndex] = node;
                        } else {
                          delete pageContainerRefs.current[pageIndex];
                        }
                      }}
                      data-page-number={pageIndex}
                      className={`pdfReader_canvasStage${pageIndex === pageNumber ? " is-current" : ""}`}
                    >
                      <div
                        id={`pdfReader_annotationLayer-${pageIndex}`}
                        ref={(node) => {
                          if (node) {
                            overlayRefs.current[pageIndex] = node;
                          } else {
                            delete overlayRefs.current[pageIndex];
                          }
                        }}
                        className={`pdfReader_annotationLayer${tool === "hand" ? " pdfReader_annotationLayer--hand" : ""}${tool === "select" ? " pdfReader_annotationLayer--select" : ""}${!tool ? " pdfReader_annotationLayer--idle" : ""}${isHighlightEraseModeOn || isPenEraseModeOn ? " pdfReader_annotationLayer--erase" : ""}`}
                        onPointerDown={(event) =>
                          handlePointerDown(pageIndex, event)
                        }
                        onPointerMove={(event) =>
                          handlePointerMove(pageIndex, event)
                        }
                        onPointerUp={finalizeDraft}
                        onPointerLeave={finalizeDraft}
                        style={{
                          "--pdf-page-width": pageSize.width
                            ? `${pageSize.width}px`
                            : undefined,
                          "--pdf-page-height": pageSize.height
                            ? `${pageSize.height}px`
                            : undefined,
                        }}
                      >
                        <canvas
                          id={`pdfReader_canvas-${pageIndex}`}
                          ref={(node) => {
                            if (node) {
                              canvasRefs.current[pageIndex] = node;
                            } else {
                              delete canvasRefs.current[pageIndex];
                            }
                          }}
                          className={`pdfReader_canvas${isSelectingText ? " is-textSelecting" : ""}`}
                        />
                        <div
                          id={`pdfReader_textLayer-${pageIndex}`}
                          ref={(node) => {
                            if (node) {
                              textLayerRefs.current[pageIndex] = node;
                            } else {
                              delete textLayerRefs.current[pageIndex];
                            }
                          }}
                          className={`pdfReader_textLayer textLayer${isSelectingText ? " is-active" : ""}`}
                          style={{
                            "--pdf-page-width": pageSize.width
                              ? `${pageSize.width}px`
                              : undefined,
                            "--pdf-page-height": pageSize.height
                              ? `${pageSize.height}px`
                              : undefined,
                          }}
                        />
                        <svg
                          id={`pdfReader_annotationSvg-${pageIndex}`}
                          viewBox="0 0 1 1"
                          preserveAspectRatio="none"
                          className={`pdfReader_annotationSvg${isSelectingText ? " is-textSelecting" : ""}`}
                        >
                          {pageAnnotations.map((annotation) => {
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
                                <path
                                  key={annotation.id}
                                  d={pathFromPoints(annotation.points)}
                                  fill="none"
                                  stroke={annotation.color}
                                  strokeWidth={(annotation.width || 18) / 1000}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              );
                            }

                            if (annotation.type === "note") {
                              return (
                                <g key={annotation.id}>
                                  <circle
                                    cx={annotation.x}
                                    cy={annotation.y}
                                    r="0.017"
                                    fill={annotation.color}
                                  />
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

                          {draftAnnotation?.type === "pen" &&
                          draftAnnotation.pageNumber === pageIndex ? (
                            <path
                              d={pathFromPoints(draftAnnotation.points)}
                              fill="none"
                              stroke={draftAnnotation.color}
                              strokeWidth={(draftAnnotation.width || 3) / 1000}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : null}

                          {draftAnnotation?.type === "highlight" &&
                          draftAnnotation.pageNumber === pageIndex ? (
                            <path
                              d={pathFromPoints(draftAnnotation.points)}
                              fill="none"
                              stroke={draftAnnotation.color}
                              strokeWidth={(draftAnnotation.width || 18) / 1000}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : null}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside id="pdfReader_notesPanel" className="pdfReader_notesPanel">
          {isSettingsPanelOpen ? (
            <>
              <div id="pdfReader_settingsIntroBlock" className="pdfReader_panelBlock">
                <span className="pdfReader_panelEyebrow">Reader settings</span>
                <h3 id="pdfReader_settingsHeading">PDF reader settings</h3>
                <p id="pdfReader_settingsDescription">
                  Adjust the behavior of this reading session without leaving the page.
                </p>
              </div>

              <div id="pdfReader_settingsModeBlock" className="pdfReader_panelBlock">
                <span className="pdfReader_inputLabel">Modes</span>
                <div className="pdfReader_settingsGrid">
                  <button
                    id="pdfReader_settingsOcrButton"
                    type="button"
                    className={`pdfReader_settingsToggle${antiOcrMode ? " is-active" : ""}`}
                    aria-pressed={antiOcrMode}
                    onClick={() => setAntiOcrMode((currentValue) => !currentValue)}
                  >
                    <strong>OCR assist</strong>
                    <span>{antiOcrMode ? "On" : "Off"}</span>
                  </button>
                  <button
                    id="pdfReader_settingsDirectionButton"
                    type="button"
                    className={`pdfReader_settingsToggle${rtlMode ? " is-active" : ""}`}
                    aria-pressed={rtlMode}
                    onClick={() => setRtlMode((currentValue) => !currentValue)}
                  >
                    <strong>Direction</strong>
                    <span>{rtlMode ? "RTL" : "LTR"}</span>
                  </button>
                  <button
                    id="pdfReader_settingsToolbarButton"
                    type="button"
                    className={`pdfReader_settingsToggle${isRealityToolbarOpen ? " is-active" : ""}`}
                    aria-pressed={isRealityToolbarOpen}
                    onClick={() =>
                      setIsRealityToolbarOpen((currentValue) => !currentValue)
                    }
                  >
                    <strong>Tools bar</strong>
                    <span>{isRealityToolbarOpen ? "Visible" : "Hidden"}</span>
                  </button>
                </div>
              </div>

              <div id="pdfReader_settingsStatsBlock" className="pdfReader_panelBlock">
                <span className="pdfReader_inputLabel">Session</span>
                <div className="pdfReader_settingsList">
                  <div className="pdfReader_settingsRow">
                    <span>Page</span>
                    <strong>
                      {pageNumber}/{numPages || "-"}
                    </strong>
                  </div>
                  <div className="pdfReader_settingsRow">
                    <span>Zoom</span>
                    <strong>{Math.round(zoom * 100)}%</strong>
                  </div>
                  <div className="pdfReader_settingsRow">
                    <span>Annotations</span>
                    <strong>{currentAnnotations.length}</strong>
                  </div>
                  <div className="pdfReader_settingsRow">
                    <span>Highlight size</span>
                    <strong>{highlightStrokeWidth}px</strong>
                  </div>
                </div>
              </div>

              <div
                id="pdfReader_settingsScrollBlock"
                className="pdfReader_panelBlock"
              >
                <span className="pdfReader_inputLabel">Scrolling</span>
                <div className="pdfReader_settingsControlCard">
                  <label
                    id="pdfReader_settingsScrollSpeedField"
                    className="pdfReader_settingsControlField"
                  >
                    <div className="pdfReader_settingsControlText">
                      <strong>Scroll speed</strong>
                      <span>How quickly wheel and trackpad movement travels.</span>
                    </div>
                    <div className="pdfReader_settingsControlInputRow">
                      <input
                        id="pdfReader_settingsScrollSpeedInput"
                        type="range"
                        min="1"
                        max="2.4"
                        step="0.05"
                        value={scrollSpeedFactor}
                        onChange={(event) =>
                          setScrollSpeedFactor(Number(event.target.value))
                        }
                      />
                      <output id="pdfReader_settingsScrollSpeedValue">
                        {scrollSpeedFactor.toFixed(2)}x
                      </output>
                    </div>
                  </label>

                  <label
                    id="pdfReader_settingsTouchZoomField"
                    className="pdfReader_settingsControlField"
                  >
                    <div className="pdfReader_settingsControlText">
                      <strong>Touch response</strong>
                      <span>How strongly two-finger touch changes zoom.</span>
                    </div>
                    <div className="pdfReader_settingsControlInputRow">
                      <input
                        id="pdfReader_settingsTouchZoomInput"
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.05"
                        value={touchZoomResponse}
                        onChange={(event) =>
                          setTouchZoomResponse(Number(event.target.value))
                        }
                      />
                      <output id="pdfReader_settingsTouchZoomValue">
                        {touchZoomResponse.toFixed(2)}x
                      </output>
                    </div>
                  </label>

                  <label
                    id="pdfReader_settingsTransitionField"
                    className="pdfReader_settingsControlField"
                  >
                    <div className="pdfReader_settingsControlText">
                      <strong>Area transition</strong>
                      <span>How smoothly the view eases into the next scroll area.</span>
                    </div>
                    <div className="pdfReader_settingsControlInputRow">
                      <input
                        id="pdfReader_settingsTransitionInput"
                        type="range"
                        min="0.12"
                        max="0.4"
                        step="0.01"
                        value={scrollTransitionAmount}
                        onChange={(event) =>
                          setScrollTransitionAmount(Number(event.target.value))
                        }
                      />
                      <output id="pdfReader_settingsTransitionValue">
                        {scrollTransitionAmount.toFixed(2)}
                      </output>
                    </div>
                  </label>
                </div>
              </div>

              <div id="pdfReader_settingsActionsBlock" className="pdfReader_panelBlock">
                <span className="pdfReader_inputLabel">Actions</span>
                <div className="pdfReader_settingsGrid">
                  <button
                    id="pdfReader_settingsResetNotesButton"
                    type="button"
                    className="pdfReader_settingsToggle"
                    onClick={resetStudyState}
                  >
                    <strong>Reset notes</strong>
                    <span>Clear annotations and summary</span>
                  </button>
                  <button
                    id="pdfReader_settingsBackButton"
                    type="button"
                    className="pdfReader_settingsToggle is-active"
                    onClick={() => setIsSettingsPanelOpen(false)}
                  >
                    <strong>Back to notes</strong>
                    <span>Return to the notes panel</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div id="pdfReader_defaultNoteBlock" className="pdfReader_panelBlock">
                <label
                  id="pdfReader_defaultNoteLabel"
                  className="pdfReader_inputLabel"
                  htmlFor="pdf-reader-default-note"
                >
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

              <div id="pdfReader_summaryBlock" className="pdfReader_panelBlock">
                <label
                  id="pdfReader_summaryLabel"
                  className="pdfReader_inputLabel"
                  htmlFor="pdf-reader-summary"
                >
                  Study summary
                </label>
                <div
                  id="pdf-reader-summary"
                  ref={realityEditorRef}
                  className={`pdfReader_richEditor${isHighlightEraseModeOn ? " is-eraseCursor" : ""}`}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Add chapter notes, questions, vocabulary, or revision prompts."
                  onInput={(event) => {
                    setStudySummary(
                      sanitizeClinicalRealityHtml(event.currentTarget.innerHTML),
                    );
                  }}
                  onBlur={(event) => {
                    setStudySummary(
                      sanitizeClinicalRealityHtml(event.currentTarget.innerHTML),
                    );
                  }}
                  onMouseDown={handleRealityEditorMouseDown}
                  onMouseMove={handleRealityEditorMouseMove}
                  onBeforeInput={handleRealityEditorBeforeInput}
                  onPaste={handleRealityEditorPaste}
                ></div>
              </div>

              <div id="pdfReader_studyMetaBlock" className="pdfReader_panelBlock">
                <div id="pdfReader_inlineMeta" className="pdfReader_inlineMeta">
                  <span id="pdfReader_annotationCount">
                    {currentAnnotations.length} annotations on this page
                  </span>
                  <button
                    id="pdfReader_resetNotesButton"
                    type="button"
                    onClick={resetStudyState}
                  >
                    Reset Notes
                  </button>
                </div>
                <p id="pdfReader_hint" className="pdfReader_hint">
                  {antiOcrMode
                    ? "Visual study mode is active. This works well for scanned or OCR-resistant PDFs."
                    : "Standard view is active."}
                </p>
              </div>

              <div id="pdfReader_ocrBlock" className="pdfReader_panelBlock">
                <div className="pdfReader_ocrHeader">
                  <div className="pdfReader_ocrCopy">
                    <label
                      id="pdfReader_ocrLabel"
                      className="pdfReader_inputLabel"
                      htmlFor="pdf-reader-ocr-output"
                    >
                      OCR extraction
                    </label>
                    <p className="pdfReader_hint">
                      Extract text from the current PDF page using Tesseract.
                    </p>
                  </div>
                  <button
                    id="pdfReader_runOcrButton"
                    type="button"
                    className="pdfReader_ocrAction"
                    onClick={runOcrForCurrentPage}
                    disabled={
                      !fileUrl ||
                      documentLoading ||
                      isCurrentPageRendering ||
                      isRunningOcr
                    }
                  >
                    {isRunningOcr ? "Running OCR..." : `OCR page ${pageNumber}`}
                  </button>
                </div>
                <div id="pdfReader_ocrStatus" className="pdfReader_ocrStatus">
                  {ocrStatus ||
                    "OCR is idle. Use this when the PDF page is a scan or image."}
                </div>
                <label
                  id="pdfReader_ocrRawLabel"
                  className="pdfReader_inputLabel"
                  htmlFor="pdf-reader-ocr-output"
                >
                  Raw OCR text
                </label>
                <textarea
                  id="pdf-reader-ocr-output"
                  className="pdfReader_ocrOutput"
                  value={ocrText}
                  onChange={(event) => setOcrText(event.target.value)}
                  rows={8}
                  placeholder="OCR text will appear here."
                />
                <label
                  id="pdfReader_ocrNormalizedLabel"
                  className="pdfReader_inputLabel"
                  htmlFor="pdf-reader-ocr-normalized"
                >
                  Normalized OCR text
                </label>
                <textarea
                  id="pdf-reader-ocr-normalized"
                  className="pdfReader_ocrOutput pdfReader_ocrOutput--normalized"
                  value={normalizedOcrText}
                  onChange={(event) => setNormalizedOcrText(event.target.value)}
                  rows={8}
                  placeholder="Normalized OCR text will appear here."
                />
                <div className="pdfReader_ocrActionsRow">
                  <span className="pdfReader_ocrMeta">
                    {ocrSourcePage
                      ? `Last OCR page: ${ocrSourcePage}`
                      : "No OCR result yet"}
                  </span>
                  <button
                    id="pdfReader_appendOcrButton"
                    type="button"
                    className="pdfReader_ocrAction"
                    onClick={appendOcrTextToSummary}
                    disabled={!String(normalizedOcrText || ocrText || "").trim()}
                  >
                    Add normalized OCR to summary
                  </button>
                </div>
              </div>

              <div id="pdfReader_notesIntroBlock" className="pdfReader_panelBlock">
                <h3 id="pdfReader_notesHeading">Page annotations</h3>
                <p id="pdfReader_notesDescription">
                  Highlights and pen marks stay visual. Notes remain editable.
                </p>
              </div>

              <div
                id="pdfReader_annotationList"
                className="pdfReader_annotationList"
              >
                {currentAnnotations.length ? (
                  currentAnnotations.map((annotation, index) => (
                    <button
                      id={`pdfReader_annotationItem-${annotation.id}`}
                      key={annotation.id}
                      type="button"
                      className={`pdfReader_annotationItem${
                        annotation.id === selectedNoteId ? " is-selected" : ""
                      }`}
                      onClick={() =>
                        setSelectedNoteId(
                          annotation.type === "note" ? annotation.id : null,
                        )
                      }
                    >
                      <strong id={`pdfReader_annotationTitle-${annotation.id}`}>
                        {annotation.type} #{index + 1}
                      </strong>
                      <span id={`pdfReader_annotationText-${annotation.id}`}>
                        {annotation.type === "note"
                          ? annotation.text
                          : annotation.type === "highlight"
                            ? "Freehand highlight markup"
                            : "Freehand pen markup"}
                      </span>
                      <span
                        id={`pdfReader_annotationDelete-${annotation.id}`}
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
                  <div id="pdfReader_emptyState" className="pdfReader_emptyState">
                    No annotations yet. Pick a tool and interact directly with the
                    page.
                  </div>
                )}
              </div>

              <div
                id="pdfReader_selectedNoteBlock"
                className="pdfReader_panelBlock"
              >
                <label
                  id="pdfReader_selectedNoteLabel"
                  className="pdfReader_inputLabel"
                  htmlFor="pdf-reader-selected-note"
                >
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
            </>
          )}
        </aside>
      </div>
    </div>
  );

  if (renderInline) {
    return (
      <div id="pdfReader_inlineMount" className="pdfReader_inlineMount">
        {shell}
      </div>
    );
  }

  return (
    <div
      id="pdfReader_overlay"
      className="pdfReader_overlay"
      role="dialog"
      aria-modal="true"
    >
      {shell}
    </div>
  );
};

export default PdfReaderModal;
