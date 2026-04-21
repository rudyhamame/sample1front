# PDF Text Extraction for Note-Taking

Yes! The PDF analyzer can now **extract readable, continuous text** from lecture PDFs for easy note-taking.

## 🎯 What It Does

Extracts text from PDF pages and formats it properly with:
- ✅ Line breaks preserved
- ✅ Proper spacing between words/paragraphs
- ✅ Full text from pages (not just preview)
- ✅ Copy to clipboard functionality
- ✅ Export as .txt file for offline study

## 📱 Features

### Text Extraction Modes

1. **Current Page** - Extract text from the page you're viewing
2. **Page Range** - Extract specific page range (e.g., pages 5-12)
3. **Entire Document** - Extract all pages at once

### Export Options

- **📋 Copy to Clipboard** - Copy extracted text to paste into notes app
- **💾 Export as File** - Download as .txt file for offline use

## 🚀 Quick Integration

### Add to `PdfReaderModal.jsx`

```jsx
import TextExtractorPanel from "./TextExtractorPanel";
import usePDFAnalysis from "../../../hooks/usePDFAnalysis";

export default function PdfReaderModal({ ... }) {
  const {
    extractPageText,
    extractRangeText,
    extractFullPDF,
    analyzerError,
  } = usePDFAnalysis(pdfDocument, pageNumber);

  const [isTextExtractorOpen, setIsTextExtractorOpen] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractText = async (mode, options) => {
    setIsExtracting(true);
    let text = "";

    try {
      if (mode === "page") {
        text = await extractPageText();
      } else if (mode === "range") {
        text = await extractRangeText(options.start, options.end);
      } else if (mode === "all") {
        text = await extractFullPDF();
      }
      setExtractedText(text);
    } catch (error) {
      console.error("Extraction error:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    // In toolbar (around line 2050):
    <button
      onClick={() => setIsTextExtractorOpen(true)}
      disabled={!pdfDocument}
      title="Extract text for notes"
    >
      📝 Extract Text
    </button>

    // In shell JSX (end of component):
    <TextExtractorPanel
      isOpen={isTextExtractorOpen}
      onClose={() => setIsTextExtractorOpen(false)}
      onExtractText={handleExtractText}
      isExtracting={isExtracting}
      extractedText={extractedText}
      pageNumber={pageNumber}
      totalPages={numPages}
    />
  );
}
```

## 💡 Usage Examples

### Example 1: Simple Page Extraction

```jsx
const { extractPageText } = usePDFAnalysis(pdfDocument, 5);

// Get text from page 5
const text = await extractPageText();
console.log(text); // Full formatted text from page
```

### Example 2: Extract and Copy

```jsx
const text = await extractPageText();

// Copy to clipboard
navigator.clipboard.writeText(text);
```

### Example 3: Extract Study Materials

```jsx
const { extractRangeText } = usePDFAnalysis(pdfDocument, 1);

// Get pages 10-20 for studying
const studyMaterial = await extractRangeText(10, 20);

// Save to file
const blob = new Blob([studyMaterial], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "lecture-notes.txt";
a.click();
```

## 📊 Hook API

```jsx
const {
  // Text Extraction Methods
  extractPageText,      // () => Promise<string>
  extractRangeText,     // (start, end) => Promise<string>
  extractFullPDF,       // () => Promise<string>

  // State
  analyzerError,        // string - error message if any

  // Also includes analysis methods
  analysis,
  isAnalyzing,
  analyzeDocument,
  analyzeCurrentPage,
  analyzePageVisualDensity,
} = usePDFAnalysis(pdfDocument, pageNumber);
```

## 🎓 Use Cases

### Study Notes
```jsx
// Extract current lecture page
const lectureText = await extractPageText();

// Paste into note-taking app (Notion, OneNote, etc.)
// Add your own notes and highlights
```

### Offline Reading
```jsx
// Export full PDF text before going offline
const fullText = await extractFullPDF();

// Save as file and read on any device
```

### Text Analysis
```jsx
// Extract text and analyze with AI
const text = await extractPageText();
const summary = await generateSummary(text); // Your AI service
```

### Creating Flashcards
```jsx
// Extract page text
const text = await extractRangeText(startPage, endPage);

// Parse for key terms
const terms = extractKeyTerms(text);

// Create flashcards from terms
terms.forEach(term => createFlashcard(term));
```

## 📝 Text Format

Extracted text is formatted like this:

```
Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that
focuses on enabling computers to learn from data without being
explicitly programmed. This approach has revolutionized many
fields including natural language processing, computer vision,
and recommendation systems.

Key Concepts:

1. Supervised Learning - Training data includes labeled examples
2. Unsupervised Learning - Finding patterns in unlabeled data
3. Reinforcement Learning - Learning through trial and error

Applications:

- Image recognition in medical diagnosis
- Natural language processing for translation
- Predictive analytics in finance
```

Key formatting features:
- ✅ Preserved line breaks and paragraphs
- ✅ Single spaces between words
- ✅ Multiple blank lines cleaned up
- ✅ No extraction artifacts or hidden characters

## 🔍 Text Quality Notes

### What Works Well
- ✅ Text-based PDFs (most lecture notes)
- ✅ Multi-page documents
- ✅ Mixed content (text + images)
- ✅ Different font sizes and styles

### Limitations
- ⚠️ Image-only PDFs won't have text (try OCR separately)
- ⚠️ Complex layouts may have ordering issues
- ⚠️ Scanned PDFs (try OCR first)

### If Text Quality is Poor
Use OCR (Optical Character Recognition) first:

```jsx
// The PdfReaderModal already has tesseract.js available
// You can add OCR preprocessing to text extraction

const performOCRIfNeeded = async (page) => {
  const text = await extractFullText(page);
  
  if (!text || text.trim().length === 0) {
    // Fallback to OCR
    const worker = await Tesseract.createWorker();
    const result = await worker.recognize(canvasOfPage);
    return result.data.text;
  }
  
  return text;
};
```

## 📋 Checklist for Using Text Extraction

- [ ] PDF is loaded in PdfReaderModal
- [ ] Click "📝 Extract Text" button in toolbar
- [ ] Choose extraction mode (Current, Range, or All)
- [ ] Click "Extract Text" button
- [ ] View preview of extracted text
- [ ] Choose action:
  - [ ] Copy to clipboard → Paste into notes app
  - [ ] Export as .txt → Save for offline use

## 🐛 Troubleshooting

### Extracted text is empty
- Check if PDF has actual text (not just images)
- Try page-by-page extraction instead of full document
- Consider OCR for scanned PDFs

### Text is out of order
- This can happen with complex layouts
- Try extracting smaller page ranges
- Copy and reorganize in your notes app

### File export not working
- Check browser permissions for downloads
- Try copy to clipboard instead
- Use a different browser if issue persists

## 🎯 Best Practices

1. **Extract While Studying**
   - Extract current page as you go through lecture
   - Add your own notes in the notes app

2. **Create Study Documents**
   - Extract key pages for each topic
   - Combine multiple extractions into one document
   - Organize by chapter or topic

3. **Use for Multiple Purposes**
   - Extract for reading offline
   - Extract for sharing with classmates
   - Extract for AI-powered summarization

4. **Check Quality**
   - Preview extracted text before copying
   - Fix any formatting issues
   - Verify important sections are included

## 🔗 Related Features

- **[PDF Complexity Analysis](PDF_ANALYSIS_README.md)** - Know which pages are harder
- **Page Metrics Panel** - See detailed text statistics
- **Text Search** (coming soon) - Find text within extracted content

---

**Created**: April 2026  
**Component**: TextExtractorPanel + Hook methods  
**Status**: Ready to use  
**Dependencies**: pdfjs-dist (already included)
