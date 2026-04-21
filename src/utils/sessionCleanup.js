import { apiUrl } from "../config/api";

const SESSION_STORAGE_KEY = "state";

export const readStoredSession = () => {
  try {
    const sessionState = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (sessionState) {
      return JSON.parse(sessionState);
    }

    const persistedState = localStorage.getItem(SESSION_STORAGE_KEY);
    return persistedState ? JSON.parse(persistedState) : null;
  } catch (error) {
    return null;
  }
};

export const writeStoredSession = (nextState) => {
  try {
    const serializedState = JSON.stringify(nextState);
    sessionStorage.setItem(SESSION_STORAGE_KEY, serializedState);
    localStorage.setItem(SESSION_STORAGE_KEY, serializedState);
  } catch (error) {
    // Ignore storage write errors.
  }
};

export const clearStoredSession = () => {
  sessionStorage.clear();
  localStorage.clear();
};

export const notifyBackendLogout = ({ userId, token } = {}) => {
  if (token && typeof fetch === "function") {
    return fetch(apiUrl("/api/user/logout"), {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      keepalive: true,
    })
      .then(() => undefined)
      .catch(() => undefined);
  }

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
    token: storedSession?.token,
  }).finally(() => {
    if (clear) {
      clearStoredSession();
    }
  });
};
