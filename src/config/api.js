const DEV_API_BASE_URL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:4000"
    : "http://10.38.149.72:4000";

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? DEV_API_BASE_URL
  : "https://sample1back.onrender.com";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
