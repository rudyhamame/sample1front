/**
 * PDFAnalysisSummary - Overview of entire document complexity
 * Shows distribution, hardest pages, easiest pages, and statistics
 */

import React, { useState } from "react";
import "./PDFAnalysisSummary.css";

const PDFAnalysisSummary = ({ analysis, isOpen, onClose, onSelectPage }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!isOpen || !analysis || !analysis.summary) {
    return null;
  }

  const { summary, pageAnalysis } = analysis;

  const getDifficultyColor = (difficulty) => {
    const colors = {
      "Very Easy": "#4CAF50",
      Easy: "#8BC34A",
      Medium: "#FFC107",
      Hard: "#FF9800",
      "Very Hard": "#F44336",
    };
    return colors[difficulty] || "#999";
  };

  const PageItem = ({ page, isHardest }) => (
    <div
      className={`page-item ${isHardest ? "highlight" : ""}`}
      onClick={() => {
        onSelectPage(page.page);
        onClose();
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="page-number">Page {page.page}</div>
      <div
        className="page-score"
        style={{ backgroundColor: getDifficultyColor(page.difficulty) }}
      >
        {page.score}
      </div>
      <div className="page-difficulty">{page.difficulty}</div>
    </div>
  );

  return (
    <div className="analysis-summary-overlay" onClick={onClose}>
      <div className="analysis-summary" onClick={(e) => e.stopPropagation()}>
        <div className="summary-header">
          <h2>PDF Analysis Overview</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="summary-tabs">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "distribution" ? "active" : ""}`}
            onClick={() => setActiveTab("distribution")}
          >
            Distribution
          </button>
          <button
            className={`tab-btn ${activeTab === "pages" ? "active" : ""}`}
            onClick={() => setActiveTab("pages")}
          >
            Pages
          </button>
        </div>

        <div className="summary-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="tab-pane">
              <div className="stat-card large">
                <div className="stat-value">{summary.totalPages}</div>
                <div className="stat-label">Total Pages</div>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <div className="stat-value">
                    {summary.averageComplexity.toFixed(1)}
                  </div>
                  <div className="stat-label">Average Complexity</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{summary.averageDifficulty}</div>
                  <div className="stat-label">Overall Difficulty</div>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <div className="stat-value">{summary.maxComplexity}</div>
                  <div className="stat-label">Hardest Page</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{summary.minComplexity}</div>
                  <div className="stat-label">Easiest Page</div>
                </div>
              </div>
            </div>
          )}

          {/* Distribution Tab */}
          {activeTab === "distribution" && (
            <div className="tab-pane">
              <h3>Difficulty Distribution</h3>
              {Object.entries(summary.difficultyDistribution).map(
                ([difficulty, count]) => (
                  <div key={difficulty} className="distribution-row">
                    <div className="distribution-label">{difficulty}</div>
                    <div className="distribution-bar-container">
                      <div
                        className="distribution-bar"
                        style={{
                          width: `${(count / summary.totalPages) * 100}%`,
                          backgroundColor: getDifficultyColor(difficulty),
                        }}
                      ></div>
                    </div>
                    <div className="distribution-count">
                      {count} ({((count / summary.totalPages) * 100).toFixed(0)}
                      %)
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === "pages" && (
            <div className="tab-pane">
              <h3 className="section-title">🔥 Most Difficult Pages</h3>
              <div className="pages-grid">
                {summary.hardestPages.map((page) => (
                  <PageItem key={`hard-${page.page}`} page={page} isHardest />
                ))}
              </div>

              <h3 className="section-title">✨ Easiest Pages</h3>
              <div className="pages-grid">
                {summary.easiestPages.map((page) => (
                  <PageItem key={`easy-${page.page}`} page={page} />
                ))}
              </div>

              <h3 className="section-title">📊 All Pages</h3>
              <div className="all-pages-grid">
                {pageAnalysis.map((p) => (
                  <div
                    key={p.pageNumber}
                    className="page-mini"
                    onClick={() => {
                      onSelectPage(p.pageNumber);
                      onClose();
                    }}
                    style={{ cursor: "pointer" }}
                    title={`${p.difficulty} - Score: ${p.complexityScore}`}
                  >
                    <div
                      className="mini-dot"
                      style={{
                        backgroundColor: p.color || "#999",
                      }}
                    ></div>
                    <div className="mini-label">{p.pageNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysisSummary;
