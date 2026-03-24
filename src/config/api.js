const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://sample1back.onrender.com";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
