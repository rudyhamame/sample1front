/**
 * usePDFAnalysis - React hook for PDF content analysis
 * Handles all analysis logic and state management
 */

import { useCallback, useEffect, useRef, useState } from "react";
import PDFAnalyzer from "../utils/PDF/PDFAnalyzer";

export const usePDFAnalysis = (pdfDocument, pageNumber) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerError, setAnalyzerError] = useState("");
  const analyzerRef = useRef(null);

  // Initialize analyzer
  useEffect(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new PDFAnalyzer();
    }
  }, []);

  // Analyze entire PDF document
  const analyzeDocument = useCallback(async () => {
    if (!pdfDocument || !analyzerRef.current) {
      return;
    }

    setIsAnalyzing(true);
    setAnalyzerError("");

    try {
      const result = await analyzerRef.current.analyzePDF(pdfDocument);
      setAnalysis(result);
      return result;
    } catch (error) {
      const errorMessage = error?.message || "Failed to analyze PDF document";
      setAnalyzerError(errorMessage);
      console.error("PDF analysis error:", error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [pdfDocument]);

  // Analyze current page
  const analyzeCurrentPage = useCallback(async () => {
    if (!pdfDocument || !analyzerRef.current || !pageNumber) {
      return;
    }

    setAnalyzerError("");

    try {
      const pageAnalysis = await analyzerRef.current.getPageAnalysis(
        pdfDocument,
        pageNumber,
      );

      // Update the current page in the analysis state
      setAnalysis((currentAnalysis) => {
        if (!currentAnalysis) {
          return {
            totalPages: pdfDocument.numPages,
            pageAnalysis: [pageAnalysis],
          };
        }

        return {
          ...currentAnalysis,
          currentPageAnalysis: pageAnalysis,
        };
      });

      return pageAnalysis;
    } catch (error) {
      const errorMessage =
        error?.message || `Failed to analyze page ${pageNumber}`;
      setAnalyzerError(errorMessage);
      console.error("Page analysis error:", error);
      return null;
    }
  }, [pdfDocument, pageNumber]);

  // Analyze page visual density (more intensive)
  const analyzePageVisualDensity = useCallback(
    async (scale = 1) => {
      if (!pdfDocument || !analyzerRef.current || !pageNumber) {
        return;
      }

      setAnalyzerError("");

      try {
        const page = await pdfDocument.getPage(pageNumber);
        const visualDensity = await analyzerRef.current.analyzeVisualDensity(
          page,
          scale,
        );

        return visualDensity;
      } catch (error) {
        const errorMessage =
          error?.message || "Failed to analyze visual density";
        setAnalyzerError(errorMessage);
        console.error("Visual density analysis error:", error);
        return null;
      }
    },
    [pdfDocument, pageNumber],
  );

  // Extract full text from current page
  const extractPageText = useCallback(async () => {
    if (!pdfDocument || !analyzerRef.current || !pageNumber) {
      return "";
    }

    setAnalyzerError("");

    try {
      const text = await analyzerRef.current.extractPageText(
        pdfDocument,
        pageNumber,
      );
      return text;
    } catch (error) {
      const errorMessage = error?.message || "Failed to extract text";
      setAnalyzerError(errorMessage);
      console.error("Text extraction error:", error);
      return "";
    }
  }, [pdfDocument, pageNumber]);

  // Extract text from a range of pages
  const extractRangeText = useCallback(
    async (startPage, endPage) => {
      if (!pdfDocument || !analyzerRef.current) {
        return "";
      }

      setAnalyzerError("");

      try {
        const text = await analyzerRef.current.extractRangeText(
          pdfDocument,
          startPage,
          endPage,
        );
        return text;
      } catch (error) {
        const errorMessage = error?.message || "Failed to extract text range";
        setAnalyzerError(errorMessage);
        console.error("Range text extraction error:", error);
        return "";
      }
    },
    [pdfDocument],
  );

  // Extract text from entire PDF
  const extractFullPDF = useCallback(async () => {
    if (!pdfDocument || !analyzerRef.current) {
      return "";
    }

    setAnalyzerError("");

    try {
      const text = await analyzerRef.current.extractFullPDF(pdfDocument);
      return text;
    } catch (error) {
      const errorMessage = error?.message || "Failed to extract PDF text";
      setAnalyzerError(errorMessage);
      console.error("Full PDF extraction error:", error);
      return "";
    }
  }, [pdfDocument]);

  return {
    analysis,
    isAnalyzing,
    analyzerError,
    analyzeDocument,
    analyzeCurrentPage,
    analyzePageVisualDensity,
    extractPageText,
    extractRangeText,
    extractFullPDF,
  };
};

export default usePDFAnalysis;
