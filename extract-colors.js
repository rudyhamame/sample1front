/**
 * Extract dominant colors from an image using Canvas API
 * This utility can be used to extract colors from the background image
 * and dynamically apply them to the footer
 */

async function extractDominantColors(imagePath, colorCount = 5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Sample every Nth pixel to improve performance
      const sampleRate = 10;
      const colors = {};

      for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
        colors[hex] = (colors[hex] || 0) + 1;
      }

      // Sort by frequency and get top N colors
      const sorted = Object.entries(colors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([color]) => color);

      resolve(sorted);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imagePath;
  });
}

// Usage example:
// extractDominantColors('/img/Gemini_Generated_Image_pzz2s0pzz2s0pzz2.png', 5)
//   .then(colors => {
//     console.log('Dominant colors:', colors);
//     // Apply to footer or other elements
//   });

export { extractDominantColors };
