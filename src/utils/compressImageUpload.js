const DEFAULT_MAX_DIMENSION = 2560;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62];
const NON_COMPRESSIBLE_TYPES = new Set([
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image for compression."));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to export compressed image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });

const buildCompressedFileName = (name, mimeType) => {
  const baseName = String(name || "image")
    .trim()
    .replace(/\.[^.]+$/, "");

  if (mimeType === "image/webp") {
    return `${baseName}.webp`;
  }

  if (mimeType === "image/png") {
    return `${baseName}.png`;
  }

  return `${baseName}.jpg`;
};

export const canCompressImageUpload = (file) => {
  const mimeType = String(file?.type || "").trim().toLowerCase();

  if (!mimeType.startsWith("image/")) {
    return false;
  }

  return !NON_COMPRESSIBLE_TYPES.has(mimeType);
};

export default async function compressImageUpload(
  file,
  options = {},
) {
  if (!file || !canCompressImageUpload(file)) {
    return file;
  }

  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    maxBytes = DEFAULT_MAX_BYTES,
    qualitySteps = DEFAULT_QUALITY_STEPS,
  } = options;

  const image = await loadImageElement(file);
  const width = Number(image.naturalWidth || image.width) || 0;
  const height = Number(image.naturalHeight || image.height) || 0;

  if (!width || !height) {
    return file;
  }

  const largestSide = Math.max(width, height);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const inputMimeType = String(file.type || "").trim().toLowerCase();
  const outputMimeType =
    inputMimeType === "image/png" || inputMimeType === "image/webp"
      ? "image/webp"
      : "image/jpeg";

  let bestBlob = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, outputMimeType, quality);

    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob;
    }

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      break;
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  return new File(
    [bestBlob],
    buildCompressedFileName(file.name, bestBlob.type || outputMimeType),
    {
      type: bestBlob.type || outputMimeType,
      lastModified: Date.now(),
    },
  );
}
