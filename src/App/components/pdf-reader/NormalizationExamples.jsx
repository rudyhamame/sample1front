/**
 * Example: Using TextExtractorPanel with PDF Reader
 *
 * This shows how to integrate the TextExtractorPanel component
 * with normalization support into your PDF viewing interface.
 */

import React, { useRef, useState } from "react";
import PDFViewer from "./PDFViewer"; // Your PDF viewer component
import TextExtractorPanel from "./TextExtractorPanel";
import usePDFAnalysis from "../hooks/usePDFAnalysis";

/**
 * Example 1: Basic Integration
 */
export function BasicPDFReaderWithExtractor() {
  const [showExtractor, setShowExtractor] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const analyzerRef = useRef(null);
  const { isAnalyzing, extractPageText, extractFullPDF, analyzerError } =
    usePDFAnalysis();

  const handleExtractText = async (mode, params) => {
    try {
      let text = "";

      if (mode === "page") {
        text = await extractPageText(params);
      } else if (mode === "range") {
        text = await extractRangeText(params.start, params.end);
      } else if (mode === "all") {
        text = await extractFullPDF();
      }

      setExtractedText(text);
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Failed to extract text");
    }
  };

  return (
    <div className="pdf-reader-container">
      {/* PDF Viewer Section */}
      <div className="pdf-viewer-section">
        <PDFViewer
          onPageChange={(page, total) => {
            setCurrentPage(page);
            setTotalPages(total);
          }}
        />

        {/* Extract Button */}
        <button className="extract-btn" onClick={() => setShowExtractor(true)}>
          📄 Extract Text with Normalization
        </button>
      </div>

      {/* Text Extractor Panel with Normalization */}
      <TextExtractorPanel
        isOpen={showExtractor}
        onClose={() => setShowExtractor(false)}
        onExtractText={handleExtractText}
        isExtracting={isAnalyzing}
        extractedText={extractedText}
        pageNumber={currentPage}
        totalPages={totalPages}
        analyzerInstance={analyzerRef.current}
      />
    </div>
  );
}

/**
 * Example 2: With Smart Normalization Selection
 *
 * Automatically selects appropriate normalization level
 * based on text quality metrics
 */
export function SmartNormalizationExample() {
  const analyzerRef = useRef(null);
  const [extractedText, setExtractedText] = useState("");
  const [suggestedLevel, setSuggestedLevel] = useState("standard");

  const handleExtractText = async (mode, params) => {
    let text = "";
    // ... extraction logic ...
    setExtractedText(text);

    // Analyze quality and suggest normalization level
    if (analyzerRef.current) {
      const stats = analyzerRef.current.getTextQualityStats(text);

      if (stats.hasCommonErrors) {
        if (stats.avgWordsPerSentence > 40) {
          setSuggestedLevel("aggressive");
          console.log("📊 Suggesting Aggressive - broken sentences detected");
        } else {
          setSuggestedLevel("standard");
          console.log("📊 Suggesting Standard - common artifacts detected");
        }
      } else {
        setSuggestedLevel("raw");
        console.log("✅ Text is clean - Raw level suggested");
      }
    }
  };

  return (
    <div>
      {/* Component renders with suggested level pre-selected */}
      <TextExtractorPanel
        // ... props ...
        extractedText={extractedText}
        analyzerInstance={analyzerRef.current}
        defaultNormalizationLevel={suggestedLevel}
      />
    </div>
  );
}

/**
 * Example 3: Batch Processing with Normalization
 *
 * Extract text from multiple pages and apply
 * consistent normalization
 */
export async function batchExtractAndNormalize(
  pdf,
  pages,
  normLevel = "standard",
) {
  const analyzer = new PDFAnalyzer();
  const results = [];

  for (const pageNum of pages) {
    try {
      // Extract
      const rawText = await analyzer.extractPageText(pdf, pageNum);

      // Normalize
      const cleanText = analyzer.normalizeText(rawText, normLevel);

      // Get stats
      const stats = analyzer.getTextQualityStats(cleanText);

      results.push({
        pageNumber: pageNum,
        text: cleanText,
        stats,
        originalLength: rawText.length,
        cleanedLength: cleanText.length,
      });

      console.log(`✅ Page ${pageNum}: ${stats.wordCount} words`);
    } catch (error) {
      console.error(`❌ Page ${pageNum} failed:`, error);
    }
  }

  return results;
}

/**
 * Example 4: Compare Normalization Levels
 *
 * Show user side-by-side comparison of different levels
 */
export function NormalizationComparisonExample() {
  const analyzerRef = useRef(null);
  const [textComparison, setTextComparison] = useState({
    raw: "",
    standard: "",
    aggressive: "",
    stats: {},
  });

  const handleExtractText = async (mode, params) => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    // Extract raw text
    let rawText = "";
    // ... extraction logic ...

    // Apply all three levels
    const raw = analyzer.normalizeText(rawText, "raw");
    const standard = analyzer.normalizeText(rawText, "standard");
    const aggressive = analyzer.normalizeText(rawText, "aggressive");

    // Get stats for each
    const stats = {
      raw: analyzer.getTextQualityStats(raw),
      standard: analyzer.getTextQualityStats(standard),
      aggressive: analyzer.getTextQualityStats(aggressive),
    };

    setTextComparison({
      raw,
      standard,
      aggressive,
      stats,
    });

    // Show comparison
    console.log("Raw:", stats.raw.wordCount, "words");
    console.log("Standard:", stats.standard.wordCount, "words");
    console.log("Aggressive:", stats.aggressive.wordCount, "words");
  };

  return (
    <div className="comparison-view">
      <div className="level raw">
        <h4>Raw</h4>
        <p>{textComparison.raw}</p>
        <small>{textComparison.stats.raw?.wordCount || 0} words</small>
      </div>

      <div className="level standard">
        <h4>Standard</h4>
        <p>{textComparison.standard}</p>
        <small>{textComparison.stats.standard?.wordCount || 0} words</small>
      </div>

      <div className="level aggressive">
        <h4>Aggressive</h4>
        <p>{textComparison.aggressive}</p>
        <small>{textComparison.stats.aggressive?.wordCount || 0} words</small>
      </div>
    </div>
  );
}

/**
 * Example 5: Advanced Quality Assessment
 *
 * Use text quality stats to make decisions
 * about extraction and processing
 */
export async function advancedQualityAssessment(pdf, pageNum) {
  const analyzer = new PDFAnalyzer();
  const text = await analyzer.extractPageText(pdf, pageNum);
  const stats = analyzer.getTextQualityStats(text);

  // Quality scoring
  let quality = "excellent";
  let recommendation = "Use raw text";

  if (stats.hasCommonErrors) {
    quality = "poor";
    recommendation = "Use aggressive normalization";
  } else if (stats.avgWordsPerSentence > 50) {
    quality = "fair";
    recommendation = "Use standard normalization";
  } else if (stats.avgWordsPerParagraph < 30) {
    quality = "fair";
    recommendation = "Broken paragraphs - use aggressive";
  }

  return {
    quality,
    recommendation,
    stats,
    score: calculateQualityScore(stats),
  };

  function calculateQualityScore(stats) {
    let score = 100;

    if (stats.hasCommonErrors) score -= 30;
    if (stats.avgWordsPerSentence > 50) score -= 15;
    if (stats.avgWordsPerSentence < 10) score -= 15;
    if (stats.avgWordsPerParagraph < 20) score -= 15;

    return Math.max(0, score);
  }
}

/**
 * Example 6: Progressive Enhancement Pattern
 *
 * Start with Standard, upgrade to Aggressive if needed
 */
export function useProgressiveNormalization() {
  const analyzerRef = useRef(null);
  const [text, setText] = useState("");
  const [level, setLevel] = useState("standard");

  const normalizeProgressively = async (rawText) => {
    const analyzer = analyzerRef.current;

    // Try standard first
    const standardText = analyzer.normalizeText(rawText, "standard");
    const stats = analyzer.getTextQualityStats(standardText);

    setText(standardText);
    setLevel("standard");

    // If still has errors, upgrade to aggressive
    if (stats.hasCommonErrors && stats.avgWordsPerSentence > 40) {
      const aggressiveText = analyzer.normalizeText(rawText, "aggressive");
      setText(aggressiveText);
      setLevel("aggressive");
      console.log("📈 Upgraded to Aggressive normalization");
    }
  };

  return { text, level, normalizeProgressively };
}

export default BasicPDFReaderWithExtractor;
