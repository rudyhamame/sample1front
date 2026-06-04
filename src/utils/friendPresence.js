const DEFAULT_FRIEND_PRESENCE_STALE_MS = 90_000;

const toTimestamp = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsedNumber = Number(value.trim());
    return Number.isFinite(parsedNumber) ? parsedNumber : 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readFriendPresenceUpdatedAt = (friend = {}) => {
  const candidates = [
    friend?.presenceUpdatedAt,
    friend?.presence?.updatedAt,
    friend?.status?.updatedAt,
    friend?.status?.lastSeen,
    friend?.identity?.status?.updatedAt,
    friend?.identity?.status?.lastSeen,
    friend?.updatedAt,
    friend?.lastSeen,
    friend?.last_seen,
  ];

  for (const candidate of candidates) {
    const timestamp = toTimestamp(candidate);
    if (timestamp) {
      return timestamp;
    }
  }

  return 0;
};

const readFriendOnlineFlag = (friend = {}) =>
  friend?.isOnline ??
  friend?.isConnected ??
  friend?.status?.isOnline ??
  friend?.status?.isConnected ??
  friend?.status?.isLoggedIn ??
  friend?.identity?.status?.isLoggedIn ??
  null;

const isTruthyPresence = (value) => {
  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return ["1", "true", "online", "connected", "loggedin"].includes(
      normalizedValue,
    );
  }

  return false;
};

const isFalsePresence = (value) => {
  if (value === false) {
    return true;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return ["0", "false", "offline", "disconnected", "loggedout"].includes(
      normalizedValue,
    );
  }

  return false;
};

export const getFriendChatPresenceKey = (friend = {}) => {
  const username = String(
    friend?.username || friend?.info?.username || "",
  ).trim();
  const chatId = String(
    friend?.chatId ||
      friend?.friendId ||
      friend?._id ||
      friend?.id ||
      friend?.info?._id ||
      "",
  ).trim();

  return chatId || username.toLowerCase();
};

export const getFriendPresenceState = (
  friend = {},
  { chatPresence = null, now = Date.now(), staleAfterMs = DEFAULT_FRIEND_PRESENCE_STALE_MS } = {},
) => {
  const chatKey = getFriendChatPresenceKey(friend);
  const normalizedUsername = String(
    friend?.username || friend?.info?.username || "",
  )
    .trim()
    .toLowerCase();
  const presenceMap =
    chatPresence && typeof chatPresence === "object" ? chatPresence : null;
  const isChatting = Boolean(
    (chatKey && presenceMap?.[chatKey]) ||
      (normalizedUsername && presenceMap?.[normalizedUsername]) ||
      (friend?._id && presenceMap?.[String(friend._id)]) ||
      (friend?.id && presenceMap?.[String(friend.id)]),
  );

  if (isChatting) {
    return {
      mode: "chatting",
      label: "In Chat",
      iconClass: "fa-comments",
    };
  }

  const onlineFlag = readFriendOnlineFlag(friend);
  const presenceUpdatedAt = readFriendPresenceUpdatedAt(friend);
  const isFresh =
    !presenceUpdatedAt || now - presenceUpdatedAt <= staleAfterMs;

  if (isFalsePresence(onlineFlag)) {
    return {
      mode: "offline",
      label: "Offline",
      iconClass: "fa-circle",
    };
  }

  if (isTruthyPresence(onlineFlag) && isFresh) {
    return {
      mode: "connected",
      label: "Online",
      iconClass: "fa-signal",
    };
  }

  if (isTruthyPresence(onlineFlag) && !isFresh) {
    return {
      mode: "offline",
      label: "Offline",
      iconClass: "fa-circle",
    };
  }

  return {
    mode: "offline",
    label: "Offline",
    iconClass: "fa-circle",
  };
};

export const FRIEND_PRESENCE_STALE_MS = DEFAULT_FRIEND_PRESENCE_STALE_MS;
