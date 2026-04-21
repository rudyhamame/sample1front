/**
 * TextExtractorPanel - Extract and display full text from PDF pages
 * Allows users to copy text for note-taking with optional normalization
 */

import React, { useState, useCallback, useMemo } from "react";
import "./TextExtractorPanel.css";

const TextExtractorPanel = ({
  isOpen,
  onClose,
  onExtractText,
  isExtracting = false,
  extractedText = "",
  pageNumber = 1,
  totalPages = 1,
  analyzerInstance = null,
}) => {
  const [extractMode, setExtractMode] = useState("current"); // "current", "range", "all"
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(totalPages);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [normalizationLevel, setNormalizationLevel] = useState("standard"); // "raw", "standard", "aggressive"

  if (!isOpen) return null;

  // Normalize extracted text
  const normalizedText = useMemo(() => {
    if (!extractedText || !analyzerInstance) return extractedText;
    return analyzerInstance.normalizeText(extractedText, normalizationLevel);
  }, [extractedText, normalizationLevel, analyzerInstance]);

  // Get text quality stats
  const textStats = useMemo(() => {
    if (!normalizedText || !analyzerInstance) {
      return { wordCount: 0, paragraphCount: 0, hasCommonErrors: false };
    }
    return analyzerInstance.getTextQualityStats(normalizedText);
  }, [normalizedText, analyzerInstance]);

  const textPreviewLines = normalizedText.split("\n").length;
  const textPreviewWords = normalizedText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const handleCopyToClipboard = async () => {
    try {
      if (!normalizedText) {
        alert("No text to copy");
        return;
      }

      await navigator.clipboard.writeText(normalizedText);
      setCopyFeedback("✓ Copied to clipboard!");
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch (error) {
      alert("Failed to copy text");
      console.error("Copy error:", error);
    }
  };

  const handleExportAsFile = () => {
    if (!normalizedText) {
      alert("No text to export");
      return;
    }

    const element = document.createElement("a");
    const file = new Blob([normalizedText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);

    const fileName =
      extractMode === "current"
        ? `lecture-notes-page-${pageNumber}.txt`
        : extractMode === "all"
          ? "lecture-notes-full.txt"
          : `lecture-notes-pages-${startPage}-${endPage}.txt`;

    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return (
    <div className="text-extractor-overlay" onClick={onClose}>
      <div
        className="text-extractor-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="extractor-header">
          <h3>📝 Extract Text for Notes</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="extractor-content">
          {/* Mode Selection */}
          <div className="mode-section">
            <h4>What to Extract?</h4>
            <div className="mode-buttons">
              <button
                className={`mode-btn ${extractMode === "current" ? "active" : ""}`}
                onClick={() => setExtractMode("current")}
              >
                Current Page
              </button>
              <button
                className={`mode-btn ${extractMode === "range" ? "active" : ""}`}
                onClick={() => setExtractMode("range")}
              >
                Page Range
              </button>
              <button
                className={`mode-btn ${extractMode === "all" ? "active" : ""}`}
                onClick={() => setExtractMode("all")}
              >
                Entire Document
              </button>
            </div>

            {extractMode === "current" && (
              <p className="mode-info">Extracting page {pageNumber}</p>
            )}

            {extractMode === "range" && (
              <div className="range-inputs">
                <div className="input-group">
                  <label>From Page:</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={startPage}
                    onChange={(e) =>
                      setStartPage(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </div>
                <div className="input-group">
                  <label>To Page:</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={endPage}
                    onChange={(e) =>
                      setEndPage(
                        Math.min(
                          totalPages,
                          parseInt(e.target.value) || totalPages,
                        ),
                      )
                    }
                  />
                </div>
                <p className="mode-info">
                  Extracting pages {startPage} to {endPage} (
                  {endPage - startPage + 1} pages)
                </p>
              </div>
            )}

            {extractMode === "all" && (
              <p className="mode-info">Extracting all {totalPages} pages</p>
            )}
          </div>

          {/* Normalization Settings */}
          {extractedText && (
            <div className="normalization-section">
              <h4>✨ Text Quality</h4>
              <div className="normalization-buttons">
                <button
                  className={`norm-btn ${normalizationLevel === "raw" ? "active" : ""}`}
                  onClick={() => setNormalizationLevel("raw")}
                  title="No cleaning - raw PDF text"
                >
                  Raw
                </button>
                <button
                  className={`norm-btn ${normalizationLevel === "standard" ? "active" : ""}`}
                  onClick={() => setNormalizationLevel("standard")}
                  title="Fix hyphens, remove page numbers"
                >
                  Standard
                </button>
                <button
                  className={`norm-btn ${normalizationLevel === "aggressive" ? "active" : ""}`}
                  onClick={() => setNormalizationLevel("aggressive")}
                  title="Smart cleanup, fix broken sentences"
                >
                  Aggressive
                </button>
              </div>
              {textStats.hasCommonErrors && normalizationLevel === "raw" && (
                <p className="quality-hint">
                  💡 Text has common PDF artifacts. Try "Standard" or
                  "Aggressive" normalization
                </p>
              )}
            </div>
          )}

          {/* Extract Button */}
          <button
            className="extract-btn"
            onClick={() => {
              if (extractMode === "current") {
                onExtractText("page", pageNumber);
              } else if (extractMode === "range") {
                onExtractText("range", { start: startPage, end: endPage });
              } else {
                onExtractText("all");
              }
            }}
            disabled={isExtracting || !totalPages}
          >
            {isExtracting ? "Extracting..." : "Extract Text"}
          </button>

          {/* Text Preview */}
          {normalizedText && (
            <>
              <div className="text-stats">
                <div className="stat">
                  <span className="stat-label">Words:</span>
                  <span className="stat-value">
                    {textPreviewWords.toLocaleString()}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Lines:</span>
                  <span className="stat-value">
                    {textPreviewLines.toLocaleString()}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Characters:</span>
                  <span className="stat-value">
                    {normalizedText.length.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-preview-container">
                <h4>Preview</h4>
                <div className="text-preview">{normalizedText}</div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="action-btn copy-btn"
                  onClick={handleCopyToClipboard}
                >
                  {copyFeedback || "📋 Copy to Clipboard"}
                </button>
                <button
                  className="action-btn export-btn"
                  onClick={handleExportAsFile}
                >
                  💾 Export as .txt File
                </button>
              </div>
            </>
          )}

          {!normalizedText && !isExtracting && (
            <div className="empty-state">
              <p>🔤 Click "Extract Text" to start extracting lecture text</p>
              <p className="hint">
                The extracted text will be formatted for easy reading and
                note-taking
              </p>
            </div>
          )}

          {isExtracting && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Extracting text...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextExtractorPanel;
