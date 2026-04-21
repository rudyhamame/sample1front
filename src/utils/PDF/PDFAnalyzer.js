/**
 * PDFAnalyzer - Analyzes PDF page complexity based on text and visual metrics
 * Helps identify pages with more content/information density (harder to study)
 */

import * as pdfjs from "pdfjs-dist/legacy/build/pdf";

class PDFAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Analyze a single page for content metrics
   */
  async analyzePageMetrics(page) {
    try {
      const [textContent, viewport] = await Promise.all([
        page.getTextContent(),
        page.getViewport({ scale: 1 }),
      ]);

      const textMetrics = this._analyzeTextContent(textContent);
      const imageMetrics = await this._analyzeImages(page);

      return {
        textMetrics,
        imageMetrics,
        dimensions: {
          width: viewport.width,
          height: viewport.height,
        },
      };
    } catch (error) {
      console.error("Error analyzing page metrics:", error);
      return null;
    }
  }

  /**
   * Extract and analyze text content
   */
  _analyzeTextContent(textContent) {
    if (!textContent?.items) {
      return this._emptyTextMetrics();
    }

    const items = textContent.items;
    let fullText = "";
    let textItems = [];
    let fontSize = [];

    items.forEach((item) => {
      if (item.str) {
        fullText += item.str;
        textItems.push(item.str);
        if (item.height) {
          fontSize.push(item.height);
        }
      }
    });

    const words = fullText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const lines = fullText.split(/\n/).filter((l) => l.trim().length > 0);
    const paragraphs = fullText
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);

    // Calculate average font size
    const avgFontSize =
      fontSize.length > 0
        ? fontSize.reduce((a, b) => a + b, 0) / fontSize.length
        : 0;

    // Estimate complexity: longer text, more paragraphs = more complex
    const textDensity = fullText.length;
    const wordCount = words.length;
    const avgWordsPerParagraph =
      paragraphs.length > 0 ? wordCount / paragraphs.length : 0;
    const avgWordsPerLine = lines.length > 0 ? wordCount / lines.length : 0;
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;

    return {
      characterCount: fullText.length,
      wordCount,
      lineCount: lines.length,
      paragraphCount: paragraphs.length,
      textItems: textItems.length,
      avgFontSize: parseFloat(avgFontSize.toFixed(2)),
      minFontSize: fontSize.length > 0 ? Math.min(...fontSize) : 0,
      maxFontSize: fontSize.length > 0 ? Math.max(...fontSize) : 0,
      fontSizeVariety: fontSize.length > 0 ? new Set(fontSize).size : 0,
      avgWordsPerParagraph: parseFloat(avgWordsPerParagraph.toFixed(2)),
      avgWordsPerLine: parseFloat(avgWordsPerLine.toFixed(2)),
      uniqueWordsCount: uniqueWords,
      textDensity,
      hasText: fullText.length > 0,
      rawText: fullText.substring(0, 500), // First 500 chars for preview
    };
  }

  /**
   * Analyze visual content (images, XObjects)
   */
  async _analyzeImages(page) {
    try {
      const operatorList = await page.getOperatorList();
      const imageCount = (operatorList.fnArray || []).filter(
        (fn, i) =>
          fn === pdfjs.OPS.paintImageXObject ||
          fn === pdfjs.OPS.paintInlineImageXObject ||
          fn === pdfjs.OPS.paintImageXObjectRepeat,
      ).length;

      // Get rendering info to estimate visual complexity
      const resources = await page.getResources();
      const xobjects = resources?.get("XObject");
      let imageXObjectCount = 0;

      if (xobjects) {
        const iterator = xobjects.getRawValues ? xobjects.getRawValues() : [];
        imageXObjectCount = Array.isArray(iterator) ? iterator.length : 0;
      }

      return {
        detectedImageOperations: imageCount,
        xObjectCount: imageXObjectCount,
        hasImages: imageCount > 0 || imageXObjectCount > 0,
      };
    } catch (error) {
      return {
        detectedImageOperations: 0,
        xObjectCount: 0,
        hasImages: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate visual density (estimated by analyzing rendered content)
   */
  async analyzeVisualDensity(page, scale = 1) {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Analyze pixel data to estimate visual density
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let nonWhitePixels = 0;
      // Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Consider non-white if significantly colored or not fully transparent
        if (a > 128 && !(r > 240 && g > 240 && b > 240)) {
          nonWhitePixels++;
        }
      }

      const totalSamplePixels = data.length / 16;
      const visualDensity = (nonWhitePixels / totalSamplePixels) * 100;

      return {
        visualDensity: parseFloat(visualDensity.toFixed(2)),
        width: canvas.width,
        height: canvas.height,
      };
    } catch (error) {
      console.error("Error analyzing visual density:", error);
      return {
        visualDensity: 0,
        width: 0,
        height: 0,
        error: error.message,
      };
    }
  }

  /**
   * Generate complexity score (0-100) combining multiple factors
   */
  generateComplexityScore(metrics) {
    if (!metrics?.textMetrics) {
      return 0;
    }

    const text = metrics.textMetrics;
    let score = 0;

    // Text-based scoring (0-70 points)
    if (text.wordCount > 0) {
      // Word count component (0-25)
      const wordScore = Math.min((text.wordCount / 500) * 25, 25);
      score += wordScore;

      // Paragraph density component (0-20)
      const paragraphDensity = text.avgWordsPerParagraph;
      const paragraphScore = Math.min((paragraphDensity / 200) * 20, 20);
      score += paragraphScore;

      // Font variation component (0-15)
      const fontVariance = text.fontSizeVariety;
      const fontScore = Math.min((fontVariance / 10) * 15, 15);
      score += fontScore;

      // Unique vocabulary component (0-10)
      const vocabDensity =
        text.uniqueWordsCount > 0 ? text.wordCount / text.uniqueWordsCount : 1;
      const vocabScore = Math.min((vocabDensity / 3) * 10, 10);
      score += vocabScore;
    }

    // Visual-based scoring (0-30 points)
    if (metrics.imageMetrics?.hasImages) {
      score += 15; // Images present
    }

    if (metrics.visualDensity?.visualDensity) {
      const densityScore = Math.min(
        (metrics.visualDensity.visualDensity / 100) * 15,
        15,
      );
      score += densityScore;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Get difficulty level based on score
   */
  getDifficultyLevel(score) {
    if (score < 20) return "Very Easy";
    if (score < 40) return "Easy";
    if (score < 60) return "Medium";
    if (score < 80) return "Hard";
    return "Very Hard";
  }

  /**
   * Get difficulty color
   */
  getDifficultyColor(score) {
    if (score < 20) return "#4CAF50"; // Green
    if (score < 40) return "#8BC34A"; // Light Green
    if (score < 60) return "#FFC107"; // Yellow
    if (score < 80) return "#FF9800"; // Orange
    return "#F44336"; // Red
  }

  /**
   * Analyze entire PDF document
   */
  async analyzePDF(pdf) {
    const pageCount = pdf.numPages;
    const pageAnalysis = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const metrics = await this.analyzePageMetrics(page);

        if (metrics) {
          const complexityScore = this.generateComplexityScore(metrics);
          const difficulty = this.getDifficultyLevel(complexityScore);
          const color = this.getDifficultyColor(complexityScore);

          pageAnalysis.push({
            pageNumber: pageNum,
            metrics,
            complexityScore,
            difficulty,
            color,
          });
        }
      } catch (error) {
        console.error(`Error analyzing page ${pageNum}:`, error);
        pageAnalysis.push({
          pageNumber: pageNum,
          error: error.message,
        });
      }
    }

    return {
      totalPages: pageCount,
      pageAnalysis,
      summary: this._generateSummary(pageAnalysis),
    };
  }

  /**
   * Generate summary statistics
   */
  _generateSummary(pageAnalysis) {
    const validPages = pageAnalysis.filter(
      (p) => p.complexityScore !== undefined,
    );

    if (validPages.length === 0) {
      return null;
    }

    const scores = validPages.map((p) => p.complexityScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Count difficulty levels
    const difficultyDistribution = {
      "Very Easy": validPages.filter((p) => p.difficulty === "Very Easy")
        .length,
      Easy: validPages.filter((p) => p.difficulty === "Easy").length,
      Medium: validPages.filter((p) => p.difficulty === "Medium").length,
      Hard: validPages.filter((p) => p.difficulty === "Hard").length,
      "Very Hard": validPages.filter((p) => p.difficulty === "Very Hard")
        .length,
    };

    return {
      averageComplexity: parseFloat(avgScore.toFixed(2)),
      maxComplexity: maxScore,
      minComplexity: minScore,
      averageDifficulty: this.getDifficultyLevel(avgScore),
      difficultyDistribution,
      hardestPages: validPages
        .sort((a, b) => b.complexityScore - a.complexityScore)
        .slice(0, 5)
        .map((p) => ({
          page: p.pageNumber,
          score: p.complexityScore,
          difficulty: p.difficulty,
        })),
      easiestPages: validPages
        .sort((a, b) => a.complexityScore - b.complexityScore)
        .slice(0, 5)
        .map((p) => ({
          page: p.pageNumber,
          score: p.complexityScore,
          difficulty: p.difficulty,
        })),
    };
  }

  /**
   * Get analysis for specific page
   */
  async getPageAnalysis(pdf, pageNumber) {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    const cacheKey = `${pdf._baseUrl || "pdf"}-${pageNumber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const page = await pdf.getPage(pageNumber);
    const metrics = await this.analyzePageMetrics(page);
    const complexityScore = this.generateComplexityScore(metrics);
    const difficulty = this.getDifficultyLevel(complexityScore);
    const color = this.getDifficultyColor(complexityScore);

    const analysis = {
      pageNumber,
      metrics,
      complexityScore,
      difficulty,
      color,
    };

    this.cache.set(cacheKey, analysis);
    return analysis;
  }

  _emptyTextMetrics() {
    return {
      characterCount: 0,
      wordCount: 0,
      lineCount: 0,
      paragraphCount: 0,
      textItems: 0,
      avgFontSize: 0,
      minFontSize: 0,
      maxFontSize: 0,
      fontSizeVariety: 0,
      avgWordsPerParagraph: 0,
      avgWordsPerLine: 0,
      uniqueWordsCount: 0,
      textDensity: 0,
      hasText: false,
      rawText: "",
      fullText: "",
    };
  }

  /**
   * Extract full readable text from a page (for note-taking)
   * Formats text with proper spacing and line breaks
   */
  async extractFullText(page) {
    try {
      const textContent = await page.getTextContent();

      if (!textContent?.items || textContent.items.length === 0) {
        return "";
      }

      const items = textContent.items;
      let currentLine = "";
      let fullText = "";
      let lastY = null;
      const lineThreshold = 5; // pixels threshold for new line

      // Sort items by Y position (top to bottom) for better flow
      const sortedItems = items.sort((a, b) => {
        const yDiff =
          (b.transform?.[5] || b.y || 0) - (a.transform?.[5] || a.y || 0);
        if (Math.abs(yDiff) > lineThreshold) return yDiff;
        return (a.transform?.[4] || a.x || 0) - (b.transform?.[4] || b.x || 0);
      });

      sortedItems.forEach((item) => {
        if (!item.str) return;

        const currentY = item.transform?.[5] || item.y || 0;

        // Detect line break
        if (lastY !== null && Math.abs(currentY - lastY) > lineThreshold) {
          if (currentLine.trim()) {
            fullText += currentLine.trim() + "\n";
          }
          currentLine = "";
        }

        // Add appropriate spacing
        if (currentLine && !currentLine.endsWith(" ")) {
          currentLine += " ";
        }

        currentLine += item.str;
        lastY = currentY;
      });

      // Add remaining text
      if (currentLine.trim()) {
        fullText += currentLine.trim() + "\n";
      }

      // Clean up multiple spaces and line breaks
      fullText = fullText
        .replace(/[ \t]{2,}/g, " ") // Multiple spaces to single
        .replace(/\n\n\n+/g, "\n\n") // Multiple newlines to double
        .trim();

      return fullText;
    } catch (error) {
      console.error("Error extracting text:", error);
      return "";
    }
  }

  /**
   * Extract text from a specific page number
   */
  async extractPageText(pdf, pageNumber) {
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    const cacheKey = `text-${pdf._baseUrl || "pdf"}-${pageNumber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const page = await pdf.getPage(pageNumber);
    const text = await this.extractFullText(page);

    this.cache.set(cacheKey, text);
    return text;
  }

  /**
   * Extract text from a range of pages
   */
  async extractRangeText(pdf, startPage, endPage) {
    const start = Math.max(1, startPage);
    const end = Math.min(pdf.numPages, endPage);

    if (start > end) {
      throw new Error("Invalid page range");
    }

    let combinedText = "";

    for (let pageNum = start; pageNum <= end; pageNum++) {
      try {
        const pageText = await this.extractPageText(pdf, pageNum);
        if (pageText) {
          combinedText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
      } catch (error) {
        console.error(`Error extracting page ${pageNum}:`, error);
        combinedText += `\n--- Page ${pageNum} [Error: Could not extract text] ---\n`;
      }
    }

    return combinedText.trim();
  }

  /**
   * Extract text from entire PDF document
   */
  async extractFullPDF(pdf) {
    return this.extractRangeText(pdf, 1, pdf.numPages);
  }

  /**
   * Normalize extracted text for better readability
   * @param {string} text - Raw extracted text
   * @param {string} level - 'raw', 'standard', or 'aggressive'
   * @returns {string} Normalized text
   */
  normalizeText(text, level = "standard") {
    if (!text) return text;

    let result = text;

    // Always apply: trim and basic cleanup
    result = result.trim();

    if (level === "raw") {
      return result;
    }

    // Standard normalization (fixes common PDF artifacts)
    if (level === "standard" || level === "aggressive") {
      // Fix hyphenated words split across lines
      // e.g., "text-\nextraction" → "textextraction"
      result = result.replace(/(-)\n/g, "");

      // Remove common page artifacts (page numbers, headers)
      result = result.replace(/^\d+\s*$\n?/gm, ""); // Page numbers on own line
      result = result.replace(/^(Page\s+\d+|p\.\s*\d+)\s*$/gim, ""); // "Page 5" style headers

      // Clean up excessive spacing
      result = result.replace(/[ \t]{2,}/g, " "); // Multiple spaces to single
      result = result.replace(/\n[ \t]+/g, "\n"); // Leading spaces on new lines
      result = result.replace(/[ \t]+\n/g, "\n"); // Trailing spaces on lines

      // Fix paragraph detection - multiple newlines often indicate paragraphs
      result = result.replace(/\n{3,}/g, "\n\n"); // 3+ newlines → 2
    }

    if (level === "aggressive") {
      // Aggressive: smart paragraph detection and cleanup

      // Remove orphaned single characters
      result = result.replace(/\n[a-z]\n/g, "\n");

      // Fix common OCR/extraction errors
      result = result
        .replace(/([a-z])\s+([A-Z])/g, "$1. $2") // Missing periods between sentences
        .replace(/\s+([.,:;!?])/g, "$1"); // Space before punctuation

      // Detect and fix broken lines (single word lines that likely belong to previous)
      const lines = result.split("\n");
      const fixedLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = lines[i + 1];

        // If current line is short (< 40 chars) and next line exists and starts lowercase
        if (
          line.trim().length < 40 &&
          line.trim().length > 0 &&
          nextLine &&
          /^[a-z]/.test(nextLine.trim())
        ) {
          // Join with space instead of newline
          fixedLines[fixedLines.length - 1] += " " + line.trim();
        } else {
          fixedLines.push(line);
        }
      }

      result = fixedLines.join("\n");

      // Final cleanup
      result = result
        .replace(/\n{3,}/g, "\n\n")
        .replace(/([.!?])\n([a-z])/g, "$1 $2") // Sentences broken across lines
        .trim();
    }

    return result;
  }

  /**
   * Get normalized text quality stats
   */
  getTextQualityStats(text) {
    if (!text) {
      return {
        wordCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        avgWordsPerSentence: 0,
        avgWordsPerParagraph: 0,
        hasCommonErrors: false,
      };
    }

    const words = text.trim().split(/\s+/);
    const sentences = text.match(/[.!?]+/g) || [];
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

    const avgWordsPerSentence =
      sentences.length > 0 ? words.length / sentences.length : 0;
    const avgWordsPerParagraph =
      paragraphs.length > 0 ? words.length / paragraphs.length : 0;

    // Detect common errors
    const hasCommonErrors =
      /([a-z])\s{2,}([a-z])/.test(text) || // Multiple spaces between words
      /\n\n\n+/.test(text) || // Excessive blank lines
      /^\d+\s*$/m.test(text); // Standalone page numbers

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgWordsPerParagraph: Math.round(avgWordsPerParagraph * 10) / 10,
      hasCommonErrors,
    };
  }
}

export default PDFAnalyzer;
