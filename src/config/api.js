const DEFAULT_API_BASE_URL =
  "https://sample1back-qcq4e5lp8-rudyhamames-projects.vercel.app";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
