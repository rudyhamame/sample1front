/**
 * Quick Usage Examples for PDF Analysis System
 */

// ============ EXAMPLE 1: Analyze entire PDF ============
// In a React component:

import usePDFAnalysis from "../../hooks/usePDFAnalysis";

function MyPDFComponent({ pdfDocument }) {
  const { analysis, isAnalyzing, analyzeDocument } = usePDFAnalysis(
    pdfDocument,
    1,
  );

  const handleAnalyze = async () => {
    const result = await analyzeDocument();
    console.log("Document Analysis:", result);

    // Access summary
    console.log("Average Complexity:", result.summary.averageComplexity);
    console.log("Hardest Pages:", result.summary.hardestPages);
    console.log(
      "Difficulty Distribution:",
      result.summary.difficultyDistribution,
    );
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? "Analyzing..." : "Analyze Document"}
      </button>

      {analysis && (
        <div>
          <h3>Analysis Results:</h3>
          <p>Total Pages: {analysis.totalPages}</p>
          <p>
            Average Complexity: {analysis.summary.averageComplexity.toFixed(1)}
          </p>
          <p>Average Difficulty: {analysis.summary.averageDifficulty}</p>
        </div>
      )}
    </div>
  );
}

// ============ EXAMPLE 2: Get current page analysis ============
// Show metrics for single page

function CurrentPageMetrics({ pdfDocument, pageNumber }) {
  const { analysis, currentPageAnalysis, analyzeCurrentPage } = usePDFAnalysis(
    pdfDocument,
    pageNumber,
  );

  useEffect(() => {
    analyzeCurrentPage().then((result) => {
      console.log(`Page ${pageNumber} Complexity:`, result.complexityScore);
      console.log(`Difficulty: ${result.difficulty}`);
      console.log(`Metrics:`, result.metrics);
    });
  }, [pageNumber, analyzeCurrentPage]);

  if (!currentPageAnalysis) return <div>Analyzing page...</div>;

  return (
    <div>
      <h4>Page {pageNumber} Complexity</h4>
      <div
        style={{
          backgroundColor: currentPageAnalysis.color,
          color: "white",
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: "bold" }}>
          {currentPageAnalysis.complexityScore}
        </div>
        <div style={{ fontSize: "14px" }}>{currentPageAnalysis.difficulty}</div>
      </div>

      <h5>Text Content</h5>
      <ul>
        <li>Words: {currentPageAnalysis.metrics.textMetrics.wordCount}</li>
        <li>
          Paragraphs: {currentPageAnalysis.metrics.textMetrics.paragraphCount}
        </li>
        <li>
          Font Sizes: {currentPageAnalysis.metrics.textMetrics.fontSizeVariety}
        </li>
      </ul>
    </div>
  );
}

// ============ EXAMPLE 3: Find most difficult pages ============
// Identify pages that need more study time

async function findHardestPages(pdfDocument) {
  const analyzer = new PDFAnalyzer();
  const analysis = await analyzer.analyzePDF(pdfDocument);

  const hardestPages = analysis.summary.hardestPages.slice(0, 5);

  console.log("Focus on these pages for studying:");
  hardestPages.forEach((page) => {
    console.log(`Page ${page.page}: ${page.difficulty} (Score: ${page.score})`);
  });

  return hardestPages;
}

// ============ EXAMPLE 4: Create study plan ============
// Prioritize study based on page complexity

async function createStudyPlan(pdfDocument) {
  const analyzer = new PDFAnalyzer();
  const analysis = await analyzer.analyzePDF(pdfDocument);
  const summary = analysis.summary;

  const studyPlan = {
    totalStudyPages: summary.hardestPages.length + 5,
    priorityPages: summary.hardestPages.map((p) => p.page),
    easyPages: summary.easiestPages.map((p) => p.page),
    difficultyBreakdown: summary.difficultyDistribution,
  };

  console.log("📚 Study Plan:");
  console.log(`Focus on ${studyPlan.priorityPages.length} hardest pages first`);
  console.log(`Difficulty: ${summary.averageDifficulty}`);
  console.log(summary.difficultyDistribution);

  return studyPlan;
}

// ============ EXAMPLE 5: Visual comparison ============
// Compare page densities visually

function PageDensityComparison({ analysis }) {
  if (!analysis || !analysis.pageAnalysis) return null;

  return (
    <div style={{ padding: "20px" }}>
      <h3>Page Density Visualization</h3>
      {analysis.pageAnalysis.map((page, idx) => (
        <div key={idx} style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "50px" }}>Page {page.pageNumber}</div>
            <div
              style={{
                flex: 1,
                height: "30px",
                background: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${page.complexityScore}%`,
                  backgroundColor: page.color,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ width: "80px", textAlign: "right" }}>
              {page.complexityScore} ({page.difficulty})
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ EXAMPLE 6: Study strategy recommendation ============
// Give recommendations based on content analysis

function StudyRecommendations({ analysis }) {
  if (!analysis) return null;

  const summary = analysis.summary;
  const avgComplexity = summary.averageComplexity;

  let recommendation = "";
  let strategy = [];

  if (avgComplexity < 40) {
    recommendation =
      "This document is straightforward and relatively easy to study";
    strategy = [
      "Quick review should be sufficient",
      "Focus on key concepts",
      "Use passive reading technique",
    ];
  } else if (avgComplexity < 60) {
    recommendation =
      "This document has moderate complexity and will need careful attention";
    strategy = [
      "Take regular notes while reading",
      "Use active recall techniques",
      "Review after each section",
    ];
  } else if (avgComplexity < 80) {
    recommendation =
      "This is challenging material that requires deep study and repeated review";
    strategy = [
      "Break into smaller chunks",
      "Use spaced repetition",
      "Create mind maps or diagrams",
      "Study harder pages first",
    ];
  } else {
    recommendation =
      "This is very dense, complex material. Plan for extended study sessions";
    strategy = [
      "Start with easiest pages to build confidence",
      "Use active reading and annotation",
      "Plan multiple review cycles",
      "Consider study groups",
      "Study hardest pages when fresh",
    ];
  }

  return (
    <div
      style={{ padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}
    >
      <h4>📖 Study Recommendation</h4>
      <p style={{ fontSize: "16px", fontWeight: "500" }}>{recommendation}</p>
      <h5>Suggested Strategy:</h5>
      <ul>
        {strategy.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
        <p>
          Average Complexity: <strong>{avgComplexity.toFixed(1)}/100</strong>
        </p>
        <p>
          Estimated difficulty: <strong>{summary.averageDifficulty}</strong>
        </p>
      </div>
    </div>
  );
}

export {
  findHardestPages,
  createStudyPlan,
  StudyRecommendations,
  PageDensityComparison,
};
