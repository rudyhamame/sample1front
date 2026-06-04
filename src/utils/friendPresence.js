const DEFAULT_FRIEND_PRESENCE_STALE_MS = 90_000;

const STATUS_META = {
  online: {
    mode: "online",
    label: "Online",
    iconClass: "fa-signal",
  },
  busy: {
    mode: "busy",
    label: "Busy",
    iconClass: "fa-circle-half-stroke",
  },
  studying: {
    mode: "studying",
    label: "Studying",
    iconClass: "fa-book-open",
  },
  offline: {
    mode: "offline",
    label: "Offline",
    iconClass: "fa-circle",
  },
};

const LOCAL_STATUS_META = {
  "in my chat": {
    mode: "in_my_chat",
    label: "In my chat",
    iconClass: "fa-comments",
  },
  typing: {
    mode: "typing",
    label: "Typing",
    iconClass: "fa-keyboard",
  },
};

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

const readStatusValue = (source = {}) =>
  String(source?.status?.value || "").trim().toLowerCase();

const readLocalStatusValue = (source = {}) =>
  String(source?.localStatus?.value || "").trim().toLowerCase();

const readStatusUpdatedAt = (source = {}) => {
  const candidates = [
    source?.status?.updatedAt,
    source?.status?.lastSeenAt,
    source?.localStatus?.updatedAt,
  ];

  for (const candidate of candidates) {
    const timestamp = toTimestamp(candidate);
    if (timestamp) {
      return timestamp;
    }
  }

  return 0;
};

const resolveStatusMeta = (statusValue) => STATUS_META[statusValue] || STATUS_META.offline;

const resolveLocalStatusMeta = (localStatusValue) =>
  LOCAL_STATUS_META[localStatusValue] || null;

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

export const getFriendPresenceState = (friend = {}) => {
  const statusValue = readStatusValue(friend);
  const statusMeta = resolveStatusMeta(statusValue);
  const updatedAt = readStatusUpdatedAt(friend);

  return {
    ...statusMeta,
    source: "global",
    updatedAt: updatedAt || null,
  };
};

export const getFriendPresenceStateForChatPanel = (friend = {}) => {
  const localStatusValue = readLocalStatusValue(friend);
  const localStatusMeta = resolveLocalStatusMeta(localStatusValue);

  if (localStatusMeta) {
    return {
      ...localStatusMeta,
      source: "local",
    };
  }

  return {
    ...getFriendPresenceState(friend),
    source: "global",
  };
};

export const FRIEND_PRESENCE_STALE_MS = DEFAULT_FRIEND_PRESENCE_STALE_MS;
