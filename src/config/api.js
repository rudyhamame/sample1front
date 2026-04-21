const DEV_API_BASE_URL = (() => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const currentHostname = String(window.location.hostname || "").trim();

  if (["localhost", "127.0.0.1"].includes(currentHostname)) {
    return "http://localhost:4000";
  }

  return `http://${currentHostname}:4000`;
})();

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? DEV_API_BASE_URL
  : "https://sample1back.onrender.com";

const PROD_ENV_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "",
).trim();
const DEV_ENV_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL_DEV || "",
).trim();

export const API_BASE_URL = (
  import.meta.env.DEV
    ? DEV_ENV_API_BASE_URL || DEFAULT_API_BASE_URL
    : PROD_ENV_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;
