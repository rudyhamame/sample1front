const PDF_READER_STORAGE_KEY = "schoolplanner.telegram.pdfReaderState.v1";

const readStoredState = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PDF_READER_STORAGE_KEY) || "{}",
    );

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

const writeStoredState = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PDF_READER_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in private mode or quota limits.
  }
};

export const getStoredPdfReaderState = (messageKey) => {
  const key = String(messageKey || "").trim();

  if (!key) {
    return {
      page: 1,
      zoom: 1,
    };
  }

  const stored = readStoredState();
  const storedEntry = stored[key];

  return {
    page: Math.max(1, Number(storedEntry?.page) || 1),
    zoom: Math.min(2.5, Math.max(0.6, Number(storedEntry?.zoom) || 1)),
  };
};

export const setStoredPdfReaderState = (messageKey, value = {}) => {
  const key = String(messageKey || "").trim();

  if (!key) {
    return;
  }

  const nextPage = Math.max(1, Number(value?.page) || 1);
  const nextZoom = Math.min(2.5, Math.max(0.6, Number(value?.zoom) || 1));
  const stored = readStoredState();

  stored[key] = {
    page: nextPage,
    zoom: nextZoom,
    updatedAt: Date.now(),
  };

  writeStoredState(stored);
};
