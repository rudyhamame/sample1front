import { apiUrl } from "../config/api";

export const readStoredSession = () => {
  try {
    const storedState = sessionStorage.getItem("state");
    return storedState ? JSON.parse(storedState) : null;
  } catch (error) {
    return null;
  }
};

export const clearStoredSession = () => {
  sessionStorage.clear();
  localStorage.clear();
};

export const notifyBackendLogout = ({ userId } = {}) => {
  if (!userId) {
    return Promise.resolve();
  }

  const url = apiUrl(`/api/user/isOnline/${userId}`);
  const body = JSON.stringify({
    isConnected: false,
  });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    try {
      const blob = new Blob([body], {
        type: "application/json",
      });
      navigator.sendBeacon(url, blob);
      return Promise.resolve();
    } catch (error) {
      // Fall back to fetch.
    }
  }

  if (typeof fetch !== "function") {
    return Promise.resolve();
  }

  return fetch(url, {
    method: "PUT",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
};

export const logoutStoredSession = ({ clear = true } = {}) => {
  const storedSession = readStoredSession();

  return notifyBackendLogout({
    userId: storedSession?.my_id,
  }).finally(() => {
    if (clear) {
      clearStoredSession();
    }
  });
};
