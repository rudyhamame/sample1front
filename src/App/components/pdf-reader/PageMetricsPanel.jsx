/**
 * PageMetricsPanel - Detailed analysis of current page content
 * Shows text and visual metrics
 */

import React from "react";
import "./PageMetricsPanel.css";

const PageMetricsPanel = ({ analysis, isOpen, onClose }) => {
  if (!isOpen || !analysis || !analysis.metrics) {
    return null;
  }

  const { metrics, complexityScore, difficulty, color } = analysis;
  const { textMetrics, imageMetrics, visualDensity } = metrics;

  const MetricRow = ({ label, value, unit = "" }) => (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="metric-unit">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="metrics-panel">
      <div className="metrics-header">
        <h3>Page Complexity Analysis</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="metrics-content">
        {/* Complexity Score */}
        <div className="metrics-section complexity-highlight">
          <div className="score-badge" style={{ backgroundColor: color }}>
            <div className="score-number">{complexityScore}</div>
            <div className="score-text">{difficulty}</div>
          </div>
          <div className="score-description">
            This page has{" "}
            <strong>
              {complexityScore < 40
                ? "light content"
                : complexityScore < 60
                  ? "moderate content"
                  : complexityScore < 80
                    ? "dense content"
                    : "very dense content"}
            </strong>
            , making it{" "}
            <strong>
              {complexity < 40
                ? "easy"
                : complexityScore < 60
                  ? "moderately"
                  : complexityScore < 80
                    ? "challenging"
                    : "very challenging"}{" "}
              to study
            </strong>
            .
          </div>
        </div>

        {/* Text Metrics */}
        {textMetrics && (
          <div className="metrics-section">
            <h4>📝 Text Content</h4>
            <MetricRow label="Characters" value={textMetrics.characterCount} />
            <MetricRow label="Words" value={textMetrics.wordCount} />
            <MetricRow label="Lines" value={textMetrics.lineCount} />
            <MetricRow label="Paragraphs" value={textMetrics.paragraphCount} />
            <MetricRow
              label="Unique Words"
              value={textMetrics.uniqueWordsCount}
            />
            <MetricRow
              label="Avg Font Size"
              value={textMetrics.avgFontSize}
              unit="pt"
            />
            <MetricRow
              label="Font Sizes"
              value={`${textMetrics.minFontSize.toFixed(1)} - ${textMetrics.maxFontSize.toFixed(1)}`}
              unit="pt"
            />
            <MetricRow
              label="Font Variety"
              value={textMetrics.fontSizeVariety}
              unit="different sizes"
            />
            <MetricRow
              label="Avg Words/Paragraph"
              value={textMetrics.avgWordsPerParagraph.toFixed(1)}
            />
          </div>
        )}

        {/* Visual Metrics */}
        {imageMetrics && (
          <div className="metrics-section">
            <h4>🖼️ Visual Elements</h4>
            <MetricRow
              label="Detected Images"
              value={imageMetrics.detectedImageOperations}
            />
            <MetricRow label="XObjects" value={imageMetrics.xObjectCount} />
            <MetricRow
              label="Has Images"
              value={imageMetrics.hasImages ? "Yes" : "No"}
            />
            {visualDensity && (
              <>
                <MetricRow
                  label="Visual Density"
                  value={visualDensity.visualDensity}
                  unit="%"
                />
                <MetricRow
                  label="Canvas Size"
                  value={`${Math.round(visualDensity.width)} × ${Math.round(visualDensity.height)}`}
                  unit="px"
                />
              </>
            )}
          </div>
        )}

        {/* Content Preview */}
        {textMetrics?.rawText && (
          <div className="metrics-section">
            <h4>📄 Content Preview</h4>
            <div className="text-preview">
              {textMetrics.rawText}
              {textMetrics.characterCount > 500 && "..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageMetricsPanel;
