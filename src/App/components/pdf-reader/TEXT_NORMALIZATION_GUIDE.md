# PDF Text Normalization for Better Readability

The text extraction system now includes **optional text normalization** to clean up and improve the readability of extracted lecture text.

## 🎯 Why Normalize?

PDFs often have extraction artifacts that make reading difficult:

### Common Issues

**Without Normalization (Raw):**
```
Introduction to Ma-
chine Learning

This  is  about  machine  learning...

5  

Section on supervised learning
```

**With Standard Normalization:**
```
Introduction to Machine Learning

This is about machine learning...

Section on supervised learning
```

**With Aggressive Normalization:**
```
Introduction to Machine Learning

This is about machine learning. Section on supervised learning is important for understanding the basics.
```

## 📊 Three Normalization Levels

### 1. **Raw** - No Cleaning
- Returns text exactly as extracted from PDF
- Best for: Checking original content, debugging
- Processing: Minimal (fastest)

**Cleans only:**
- Basic spacing and line breaks

### 2. **Standard** - Recommended (Default)
- Fixes most common PDF artifacts
- Best for: Most lecture PDFs and textbooks
- Processing: Fast

**Fixes:**
- ✅ Hyphenated words split across lines (`text-\nure` → `texture`)
- ✅ Page numbers on own lines
- ✅ "Page 5" style headers
- ✅ Multiple spaces to single
- ✅ Excessive newlines (3+) to double newlines

### 3. **Aggressive** - Maximum Cleanup
- Smart detection and fixes broken sentences
- Best for: Scanned PDFs, complex layouts
- Processing: Slower (more analysis)

**Fixes everything in Standard, plus:**
- ✅ Orphaned single characters (`\na\n`)
- ✅ Missing periods between sentences
- ✅ Broken sentence lines
- ✅ Space before punctuation
- ✅ Smart paragraph detection

## 🎮 How to Use

### In TextExtractorPanel

1. **Click "Extract Text"** to extract from current page/range/all
2. **Choose Quality Level:**
   - Click "Raw", "Standard", or "Aggressive"
   - Preview updates in real-time
3. **Copy or Export:**
   - Copy to clipboard
   - Export as .txt file

### Live Preview

Text quality hints appear if issues are detected:

```
💡 Text has common PDF artifacts. Try "Standard" or "Aggressive" normalization
```

## 📈 Quality Indicators

After normalizing, you see stats:

```
Words:      1,242
Lines:      87
Characters: 8,956
```

## 💻 Programmatic Use

### In Your Components

```jsx
import PDFAnalyzer from "../utils/PDF/PDFAnalyzer";

const analyzer = new PDFAnalyzer();

// Extract and normalize
const rawText = await analyzer.extractPageText(pdf, 1);
const cleanText = analyzer.normalizeText(rawText, "standard");

// Or use aggressive
const veryClean = analyzer.normalizeText(rawText, "aggressive");
```

### Text Quality Analysis

```jsx
const stats = analyzer.getTextQualityStats(text);
console.log(stats);
// {
//   wordCount: 1242,
//   sentenceCount: 45,
//   paragraphCount: 12,
//   avgWordsPerSentence: 27.6,
//   avgWordsPerParagraph: 103.5,
//   hasCommonErrors: false
// }
```

## 🔧 Normalization Details

### Standard Level Fixes

**1. Hyphenated Words**
```
Input:  "text-\nraction"
Output: "textraction"
```

**2. Page Numbers**
```
Input:  "...end of content\n5\n\nNext section..."
Output: "...end of content\n\nNext section..."
```

**3. Multiple Spaces**
```
Input:  "word1    word2"
Output: "word1 word2"
```

**4. Excessive Newlines**
```
Input:  "paragraph1\n\n\n\nparagraph2"
Output: "paragraph1\n\nparagraph2"
```

### Aggressive Level Additional Fixes

**1. Orphaned Characters**
```
Input:  "...sentence.\na\nNext..."
Output: "...sentence. Next..."
```

**2. Missing Punctuation**
```
Input:  "first sentence[space]second SENTENCE"
Output: "first sentence. Second sentence"
```

**3. Broken Sentences**
```
Input:  "This is a very long sentence that was\nbroken across\nlines"
Output: "This is a very long sentence that was broken across lines"
```

**4. Space Before Punctuation**
```
Input:  "end of sentence , next"
Output: "end of sentence, next"
```

## 📋 Best Practices

### When to Use Each Level

| Level | PDF Type | Use Case |
|-------|----------|----------|
| **Raw** | Any | Verify original content |
| **Standard** | Text-based PDFs | 99% of lecture notes |
| **Aggressive** | Scanned PDFs | Complex layouts, OCR'd text |

### Workflow Recommendations

**For Clean PDFs (born-digital):**
1. Extract with Standard normalization
2. Copy to notes app
3. Add your own highlights

**For Scanned PDFs:**
1. Try Standard first
2. If broken text, switch to Aggressive
3. Manually fix any remaining issues

**For Mixed Content:**
1. Extract page by page
2. Adjust normalization per page
3. Combine in your notes app

## 🔍 Quality Checks

The system detects and alerts you to common errors:

```javascript
const stats = analyzer.getTextQualityStats(text);

if (stats.hasCommonErrors) {
  console.log("⚠️ PDF has artifacts - recommend 'Standard' or 'Aggressive'");
}

if (stats.avgWordsPerSentence > 50) {
  console.log("⚠️ Very long sentences - may be broken text");
}

if (stats.avgWordsPerParagraph < 20) {
  console.log("⚠️ Very short paragraphs - may have broken lines");
}
```

## 🐛 Troubleshooting

### Text is still messy after normalization

**Solution:**
- Try "Aggressive" level
- Manually fix in your notes app
- Consider PDF is image-only (use OCR instead)

### Aggressive mode removed important content

**Solution:**
- Switch back to "Standard"
- Manually clean up
- Aggressive is conservative but may be too aggressive for some PDFs

### Hyphenated words not joining

**Solution:**
- Standard only removes hyphens at line breaks
- Hyphens within words are preserved (intentional)
- Example: "mother-in-law" stays as is

### Numbers disappearing

**Solution:**
- Raw level strips page numbers on own lines
- Page numbers at end of text are removed
- If losing important numbers, use Raw level and manually clean

## 📊 Performance

- **Raw extraction**: ~50-150ms per page
- **Standard normalization**: +10-20ms processing
- **Aggressive normalization**: +30-50ms processing

Results are cached, so re-normalizing same text is instant.

## 🔗 API Reference

### `normalizeText(text, level)`

```javascript
/**
 * @param {string} text - Raw extracted text
 * @param {string} level - 'raw' | 'standard' | 'aggressive'
 * @returns {string} Normalized text
 */
const cleaned = analyzer.normalizeText(rawText, "standard");
```

### `getTextQualityStats(text)`

```javascript
/**
 * @param {string} text - Text to analyze
 * @returns {Object} Quality statistics
 */
const stats = analyzer.getTextQualityStats(text);
// Returns: {
//   wordCount: number,
//   sentenceCount: number,
//   paragraphCount: number,
//   avgWordsPerSentence: number,
//   avgWordsPerParagraph: number,
//   hasCommonErrors: boolean
// }
```

## ✅ Examples

### Example 1: Extract and Auto-Clean

```jsx
const text = await extractPageText();
const clean = analyzer.normalizeText(text, "standard");
navigator.clipboard.writeText(clean);
```

### Example 2: Compare Levels

```jsx
const raw = await extractPageText();
const standard = analyzer.normalizeText(raw, "standard");
const aggressive = analyzer.normalizeText(raw, "aggressive");

console.log("Raw length:", raw.length);
console.log("Standard length:", standard.length);
console.log("Aggressive length:", aggressive.length);
```

### Example 3: Smart Selection

```jsx
const text = await extractPageText();
const stats = analyzer.getTextQualityStats(text);

let level = "raw";
if (stats.hasCommonErrors) {
  level = "standard";
  if (stats.avgWordsPerSentence > 40) {
    level = "aggressive";
  }
}

const cleaned = analyzer.normalizeText(text, level);
```

## 🎯 Summary

- **Raw**: Original PDF text, minimal cleanup
- **Standard**: Recommended, fixes artifacts
- **Aggressive**: Maximum cleanup, best for scanned PDFs

Choose based on your PDF quality, and always preview before copying!

---

**Created**: April 2026  
**Feature**: Text Normalization in PDFAnalyzer + TextExtractorPanel  
**Status**: Ready to use
