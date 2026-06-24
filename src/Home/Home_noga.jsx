import { Link, useHistory } from "react-router-dom";
import "./home-noga.css";
import "./home_noga_rspnsv_360x666_mobilePortrait.css";
import "./home_noga_rspnsv_820x1048.css";
import Nav from "../Nav/Nav";
import React, { useEffect, useRef, useState } from "react";
import { apiUrl } from "../config/api";
import { getHomeSubApps } from "../utils/homeSubApps";
import compressImageUpload, {
  canCompressImageUpload,
} from "../utils/compressImageUpload";
import FriendChat from "../HomeChat/FriendChat";
import {
  getFriendPresenceState as resolveFriendPresenceState,
  getFriendPresenceStateForChatPanel as resolveFriendPresenceStateForChatPanel,
  getFriendChatPresenceKey,
} from "../utils/friendPresence";
import { refreshSharedPlannerMusicLibrary } from "../music/globalMusicPlayer";
import io from "socket.io-client";

const NAGHAM_COURSE_LETTERS_STORAGE_KEY = "schoolPlanner_nagham_course_letters";
const NAGHAM_COURSE_LIST_STORAGE_KEY = "schoolPlanner_nagham_course_list";
const SCHOOLPLANNER_MUSIC_STORAGE_KEY = "schoolPlanner_music_library_items";
const LEGACY_SCHOOLPLANNER_MUSIC_STORAGE_KEYS = [
  "schoolPlanner_music_archive_items",
  "phenomed.globalMusic.archiveItems",
];
const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY = "schoolPlanner_reduce_motion";
const PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY =
  "phenomedSocial_chat_messages_background";
const HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY =
  "home_profile_pic_viewport_transform";
const DEFAULT_HOME_BIO_WALLPAPER_SIZE = 520;
const DEFAULT_NAGHAM_COURSE_LETTER =
  "For dear naghamtrkmani: keep going, keep glowing, and let every page carry you a little closer to your beautiful goal.";
const DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS = [
  "MoonlightSonata_755",
  "fur-elise-by-beethoven-beethoven",
  "gymnopedie-no.-1",
  "NocturneCSharpMinor",
];
const HOME_CHAT_CONTENT = {
  chat: {
    title: "Chat",
    onlineLabel: "online",
    offlineLabel: "offline",
    unknownLabel: "unknown",
    typingLabel: "typing...",
    empty: "Open a conversation to view messages here.",
    inputPlaceholder: "Write a message",
  },
};

const DEFAULT_BLOCKED_LIST_USER_MODE = "friend";
const DEFAULT_BLOCKED_LIST_GROUP = "friends";
const BLOCKED_LIST_USER_MODE_ORDER = [
  "friend",
  "requestsent",
  "requestreceived",
  "blocked",
];
const BLOCKED_LIST_GROUP_ORDER = ["friends", "pending", "blocked"];
const BLOCKED_LIST_GROUP_META = {
  pending: { label: "Requests", iconClass: "fa-user-clock" },
  blocked: { label: "Blocked", iconClass: "fa-user-slash" },
  friends: { label: "Friends", iconClass: "fa-user-check" },
};
const ARABIC_TEXT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const HOME_GALLERY_TAB_UPLOAD_CONFIG = {
  images: {
    accept: "image/*",
    resourceType: "image",
    label: "image",
  },
  videos: {
    accept: "video/*",
    resourceType: "video",
    label: "video",
  },
};

const HOME_GALLERY_VISIBILITY_FILTERS = [
  { id: "public", label: "Public", icon: "fi fi-br-unlock" },
  { id: "me", label: "Private", icon: "fi fi-sr-lock" },
  { id: "hidden", label: "Hidden", icon: "fi fi-br-password-lock" },
];

const HOME_ACADEMIC_YEAR_OPTIONS = Array.from(
  { length: 31 },
  (_, index) => `${2030 - index}-${2031 - index}`,
);
const HOME_COMPONENT_CLASS_OPTIONS = [
  "Class",
  "Lab",
  "Clinical Rotations",
  "Pharmacy",
];

const createEmptyProgramTermScheduleEntry = () => ({
  component_class: "",
  start_date: "",
  end_date: "",
});

const normalizeProgramTermScheduleEntriesForDraft = (entries) => {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const component_class = String(entry?.component_class || "").trim();
      const start_date = entry?.start_date
        ? String(entry.start_date).slice(0, 10)
        : "";
      const end_date = entry?.end_date
        ? String(entry.end_date).slice(0, 10)
        : "";

      return {
        component_class,
        start_date,
        end_date,
      };
    })
    .filter(
      (entry) => entry.component_class || entry.start_date || entry.end_date,
    );

  return normalizedEntries.length > 0
    ? normalizedEntries
    : [createEmptyProgramTermScheduleEntry()];
};

const serializeProgramTermScheduleEntries = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      component_class: String(entry?.component_class || "").trim(),
      start_date: String(entry?.start_date || "").trim() || null,
      end_date: String(entry?.end_date || "").trim() || null,
    }))
    .filter(
      (entry) => entry.component_class || entry.start_date || entry.end_date,
    );

// Keep schedule display compact while still showing all saved rows.
const formatProgramTermScheduleDisplay = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const componentClass = String(entry?.component_class || "").trim();
      const startDate = entry?.start_date
        ? String(entry.start_date).slice(0, 10)
        : "";
      const endDate = entry?.end_date
        ? String(entry.end_date).slice(0, 10)
        : "";

      return [componentClass, startDate, endDate].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join(" ; ");

const formatProgramTermScheduleRowDisplay = (entry) => {
  const componentClass = String(entry?.component_class || "").trim();
  const startDate = entry?.start_date
    ? String(entry.start_date).slice(0, 10)
    : "";
  const endDate = entry?.end_date ? String(entry.end_date).slice(0, 10) : "";
  const dateRange = [startDate, endDate].filter(Boolean).join(" - ");

  if (componentClass && dateRange) {
    return `${componentClass}: ${dateRange}`;
  }
  if (componentClass) {
    return componentClass;
  }
  return dateRange || "-";
};

const HOME_ABOUT_PROFILE_REQUIRED_FIELDS = new Set(["firstname", "lastname"]);
const HOME_INLINE_REQUIRED_FIELDS = new Set([
  "firstname",
  "lastname",
  "username",
]);

const FRIEND_USER_MODE_META = {
  blocked: {
    label: "Blocked",
    iconClass: "fa-user-slash",
    emptyLabel: "No blocked users to show.",
  },
  requestsent: {
    label: "Sent",
    iconClass: "fa-paper-plane",
    emptyLabel: "No pending sent requests to show.",
  },
  requestreceived: {
    label: "Received",
    iconClass: "fa-user-clock",
    emptyLabel: "No pending received requests to show.",
  },
  friend: {
    label: "Friends",
    iconClass: "fa-user-check",
    emptyLabel: "No friends to show.",
  },
};

const getFriendUserModeMeta = (value) => {
  const normalizedValue = String(value || DEFAULT_BLOCKED_LIST_USER_MODE)
    .trim()
    .toLowerCase();
  return (
    FRIEND_USER_MODE_META[normalizedValue] || {
      label: normalizedValue.replace(/_/g, " "),
      iconClass: "fa-user",
      emptyLabel: "No users to show.",
    }
  );
};

const normalizeFriendUserMode = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "friend") {
    return "friend";
  }

  if (
    normalizedValue === "requestsent" ||
    normalizedValue.includes("requestsent")
  ) {
    return "requestsent";
  }

  if (
    normalizedValue === "requestreceived" ||
    normalizedValue.includes("requestreceived")
  ) {
    return "requestreceived";
  }

  if (normalizedValue.includes("blocked")) {
    return "blocked";
  }

  if (normalizedValue.includes("_accepted")) {
    return "friend";
  }

  return "stranger";
};

const getBlockedListGroupIdForMode = (value) => {
  const normalizedValue = normalizeFriendUserMode(value);

  if (
    normalizedValue === "requestsent" ||
    normalizedValue === "requestreceived"
  ) {
    return "pending";
  }

  if (normalizedValue === "friend") {
    return "friends";
  }

  if (normalizedValue === "blocked") {
    return "blocked";
  }

  return DEFAULT_BLOCKED_LIST_GROUP;
};

const sanitizeGalleryFileName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `gallery-${Date.now()}`;

const isArabicText = (value) => ARABIC_TEXT_PATTERN.test(String(value || ""));

const VIDEO_FORMATS = new Set([
  "mp4",
  "mov",
  "webm",
  "m4v",
  "avi",
  "mkv",
  "ogv",
]);

const isVideoGalleryItem = (item) => {
  const resourceType = String(item?.resourceType || item?.resource_type || "")
    .trim()
    .toLowerCase();
  if (resourceType === "video") {
    return true;
  }

  const mimeType = String(item?.mimeType || item?.mime_type || "")
    .trim()
    .toLowerCase();
  if (mimeType.startsWith("video/")) {
    return true;
  }

  const format = String(item?.format || "")
    .trim()
    .toLowerCase();
  if (VIDEO_FORMATS.has(format)) {
    return true;
  }

  const url = String(item?.url || item?.secure_url || "")
    .trim()
    .toLowerCase();
  return url.includes("/video/upload/");
};

const buildMusicSearchTerms = (searchFields) => ({
  song: String(searchFields?.song || "").trim(),
  artist: String(searchFields?.artist || "").trim(),
});

const buildInternetArchiveSearchUrl = (searchFields) => {
  const { song, artist } = buildMusicSearchTerms(searchFields);
  const queryClauses = ["mediatype:audio", "collection:opensource_audio"];
  const fieldClauses = [];

  if (song) {
    fieldClauses.push(
      `identifier:"${song}"`,
      `title:"${song}"`,
      `subject:"${song}"`,
    );
  }

  if (artist) {
    fieldClauses.push(`creator:"${artist}"`);
  }

  if (fieldClauses.length > 0) {
    queryClauses.push(`(${fieldClauses.join(" OR ")})`);
  }

  return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    queryClauses.join(" AND "),
  )}&fl[]=identifier,title,creator&sort[]=downloads desc&rows=8&page=1&output=json`;
};

const buildITunesSearchUrl = (searchFields) =>
  `https://itunes.apple.com/search?term=${encodeURIComponent(
    [searchFields?.song, searchFields?.artist]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" "),
  )}&entity=song&limit=8`;

const buildMusicBrainzSearchUrl = (searchFields) =>
  `https://musicbrainz.org/ws/2/recording?fmt=json&limit=8&query=${encodeURIComponent(
    [
      searchFields?.song ? `recording:${String(searchFields.song).trim()}` : "",
      searchFields?.artist
        ? `artist:${String(searchFields.artist).trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(" AND "),
  )}`;

const buildMusicLibraryLineLabel = (title, artist, fallbackValue = "") => {
  const parts = [
    String(title || "").trim(),
    String(artist || "").trim(),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" - ");
  }

  return String(fallbackValue || "").trim();
};

const getMusicProviderLabel = (provider) => {
  const normalizedProvider = String(provider || "").trim();

  if (normalizedProvider === "itunes") {
    return "iTunes";
  }

  if (normalizedProvider === "musicBrainz") {
    return "MusicBrainz";
  }

  return "Internet Archive";
};

const normalizeStoredMusicLibraryItem = (rawItem) => {
  if (typeof rawItem === "string") {
    const normalizedIdentifier = String(rawItem || "").trim();

    if (!normalizedIdentifier) {
      return null;
    }

    return {
      provider: "internetArchive",
      identifier: normalizedIdentifier,
      query: normalizedIdentifier,
      title: normalizedIdentifier.replace(/[-_]+/g, " "),
      artist: "Internet Archive",
    };
  }

  const provider = String(rawItem?.provider || "internetArchive").trim();
  const identifier = String(rawItem?.identifier || "").trim();
  const title = String(
    rawItem?.title || rawItem?.fallbackTitle || rawItem?.trackTitle || "",
  ).trim();
  const artist = String(
    rawItem?.artist || rawItem?.fallbackCreator || rawItem?.trackArtist || "",
  ).trim();
  const query = String(
    rawItem?.query || buildMusicLibraryLineLabel(title, artist, identifier),
  ).trim();

  if (!provider) {
    return null;
  }

  if (provider === "internetArchive" && !identifier && !query) {
    return null;
  }

  if (provider !== "internetArchive" && !query) {
    return null;
  }

  return {
    provider,
    identifier,
    query,
    title,
    artist,
  };
};

const readStoredMusicLibraryItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const candidateKeys = [
    SCHOOLPLANNER_MUSIC_STORAGE_KEY,
    ...LEGACY_SCHOOLPLANNER_MUSIC_STORAGE_KEYS,
  ];

  for (const storageKey of candidateKeys) {
    try {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) {
        continue;
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        continue;
      }

      const normalizedItems = parsedValue
        .map((item) => normalizeStoredMusicLibraryItem(item))
        .filter(Boolean);

      if (normalizedItems.length > 0) {
        return normalizedItems;
      }
    } catch {}
  }

  return [];
};

const formatStoredMusicLibraryItemsForProvider = (
  provider,
  defaultLines = [],
) => {
  const storedItems = readStoredMusicLibraryItems();
  const providerItems = storedItems.filter(
    (item) => item.provider === provider,
  );

  if (providerItems.length > 0) {
    return providerItems
      .map((item) => {
        if (provider === "internetArchive") {
          return String(item.identifier || item.query || "").trim();
        }

        return (
          buildMusicLibraryLineLabel(
            item.title,
            item.artist,
            item.query || item.identifier,
          ) || ""
        );
      })
      .filter(Boolean)
      .join("\n");
  }

  return defaultLines.join("\n");
};

const parsePlaylistLines = (inputValue) =>
  Array.from(
    new Set(
      String(inputValue || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );

const buildMusicLibraryItemsFromLines = (provider, inputValue) =>
  parsePlaylistLines(inputValue).map((line) => ({
    provider,
    identifier: provider === "internetArchive" ? line : "",
    query: line,
    title: provider === "internetArchive" ? line.replace(/[-_]+/g, " ") : "",
    artist:
      provider === "internetArchive"
        ? "Internet Archive"
        : provider === "itunes"
          ? "iTunes Search API"
          : "MusicBrainz",
  }));

const normalizeProfilePictureViewport = (nextViewport) => {
  const rawScale = Number(nextViewport?.scale);
  const rawOffsetX = Number(nextViewport?.offsetX);
  const rawOffsetY = Number(nextViewport?.offsetY);

  return {
    scale: Number.isFinite(rawScale) ? Math.min(Math.max(rawScale, 1), 4) : 1,
    offsetX: Number.isFinite(rawOffsetX) ? rawOffsetX : 0,
    offsetY: Number.isFinite(rawOffsetY) ? rawOffsetY : 0,
  };
};

const ImageViewerModal = ({
  isOpen,
  images,
  activeIndex,
  onChangeIndex,
  onClose,
  title,
}) => {
  const safeImages = Array.isArray(images) ? images : [];
  const hasImages = safeImages.length > 0;
  const boundedIndex = hasImages
    ? Math.min(Math.max(Number(activeIndex) || 0, 0), safeImages.length - 1)
    : 0;
  const activeImage = hasImages ? safeImages[boundedIndex] : null;

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (!hasImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        onChangeIndex?.(
          (boundedIndex - 1 + safeImages.length) % safeImages.length,
        );
      }

      if (event.key === "ArrowRight") {
        onChangeIndex?.((boundedIndex + 1) % safeImages.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    boundedIndex,
    hasImages,
    isOpen,
    onChangeIndex,
    onClose,
    safeImages.length,
  ]);

  if (!isOpen) {
    return null;
  }

  const activeImageUrl = String(
    activeImage?.url || activeImage?.secure_url || "",
  ).trim();
  const activeImageLabel =
    String(
      activeImage?.publicId ||
        activeImage?.originalFilename ||
        title ||
        "Image",
    ).trim() || "Image";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={String(title || activeImageLabel || "Image viewer")}
      onClick={() => onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "linear-gradient(180deg, rgba(6, 16, 20, 0.92), rgba(7, 19, 24, 0.96))",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: "min(92vw, 980px)",
          maxHeight: "92vh",
          padding: "18px",
          borderRadius: "24px",
          border: "1px solid rgba(125, 175, 186, 0.24)",
          background:
            "linear-gradient(180deg, rgba(10, 29, 36, 0.96), rgba(9, 24, 30, 0.98))",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.36)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "rgba(231, 244, 247, 0.96)",
          }}
        >
          <strong
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeImageLabel}
          </strong>
          <span
            style={{
              fontSize: "0.8rem",
              color: "rgba(192, 221, 227, 0.78)",
            }}
          >
            {hasImages ? `${boundedIndex + 1} / ${safeImages.length}` : "0 / 0"}
          </span>
          <button
            type="button"
            onClick={() => onClose?.()}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(125, 175, 186, 0.26)",
              background: "rgba(255, 255, 255, 0.06)",
              color: "rgba(240, 248, 250, 0.96)",
            }}
          >
            x
          </button>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "280px",
            borderRadius: "18px",
            overflow: "hidden",
            background:
              "radial-gradient(circle at top, rgba(36, 85, 97, 0.32), rgba(7, 18, 24, 0.98))",
          }}
        >
          {hasImages && activeImageUrl ? (
            <img
              src={activeImageUrl}
              alt={activeImageLabel}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "14px",
              }}
            />
          ) : (
            <p
              style={{
                color: "rgba(214, 231, 236, 0.82)",
                fontSize: "0.9rem",
              }}
            >
              No image available.
            </p>
          )}
          {safeImages.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  onChangeIndex?.(
                    (boundedIndex - 1 + safeImages.length) % safeImages.length,
                  )
                }
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(125, 175, 186, 0.26)",
                  background: "rgba(7, 22, 27, 0.72)",
                  color: "rgba(242, 249, 250, 0.98)",
                }}
              >
                â€¹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() =>
                  onChangeIndex?.((boundedIndex + 1) % safeImages.length)
                }
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(125, 175, 186, 0.26)",
                  background: "rgba(7, 22, 27, 0.72)",
                  color: "rgba(242, 249, 250, 0.98)",
                }}
              >
                â€º
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const clampVideoViewerWindowRect = (rect) => {
  if (typeof window === "undefined") {
    return rect;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minWidth = 360;
  const minHeight = 240;
  const safeGap = 8;
  const nextWidth = Math.min(
    Math.max(Number(rect?.width) || minWidth, minWidth),
    Math.max(minWidth, viewportWidth - safeGap * 2),
  );
  const nextHeight = Math.min(
    Math.max(Number(rect?.height) || minHeight, minHeight),
    Math.max(minHeight, viewportHeight - safeGap * 2),
  );
  const nextX = Math.min(
    Math.max(Number(rect?.x) || safeGap, safeGap),
    Math.max(safeGap, viewportWidth - nextWidth - safeGap),
  );
  const nextY = Math.min(
    Math.max(Number(rect?.y) || safeGap, safeGap),
    Math.max(safeGap, viewportHeight - nextHeight - safeGap),
  );

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
};

const getDefaultVideoViewerWindowRect = () => {
  if (typeof window === "undefined") {
    return { x: 48, y: 48, width: 720, height: 440 };
  }

  const width = Math.min(Math.max(window.innerWidth * 0.68, 420), 960);
  const height = Math.min(Math.max(window.innerHeight * 0.56, 280), 640);

  return clampVideoViewerWindowRect({
    x: (window.innerWidth - width) / 2,
    y: Math.max(18, (window.innerHeight - height) / 2),
    width,
    height,
  });
};

const getVideoViewerWindowRectForAspectRatio = (aspectRatio) => {
  if (typeof window === "undefined") {
    return getDefaultVideoViewerWindowRect();
  }

  const safeGap = 20;
  const maxWidth = Math.max(360, window.innerWidth - safeGap * 2);
  const maxHeight = Math.max(220, window.innerHeight - safeGap * 2);
  const normalizedAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;

  let width = Math.min(maxWidth, maxHeight * normalizedAspectRatio);
  let height = width / normalizedAspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * normalizedAspectRatio;
  }

  return {
    x: Math.max(safeGap, (window.innerWidth - width) / 2),
    y: Math.max(safeGap, (window.innerHeight - height) / 2),
    width,
    height,
  };
};

const getVideoViewerWindowRectAtPositionForAspectRatio = (
  rect,
  aspectRatio,
) => {
  if (typeof window === "undefined") {
    return rect || getDefaultVideoViewerWindowRect();
  }

  const safeGap = 8;
  const normalizedAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const maxWidth = Math.max(220, window.innerWidth - safeGap * 2);
  const maxHeight = Math.max(160, window.innerHeight - safeGap * 2);
  let width = Math.min(Math.max(Number(rect?.width) || 420, 220), maxWidth);
  let height = width / normalizedAspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * normalizedAspectRatio;
  }

  return clampVideoViewerWindowPosition({
    x: Number(rect?.x) || safeGap,
    y: Number(rect?.y) || safeGap,
    width,
    height,
  });
};

const clampVideoViewerWindowPosition = (rect) => {
  if (typeof window === "undefined") {
    return rect;
  }

  const safeGap = 8;
  const width = Number(rect?.width) || 360;
  const height = Number(rect?.height) || 240;

  return {
    ...rect,
    x: Math.min(
      Math.max(Number(rect?.x) || safeGap, safeGap),
      Math.max(safeGap, window.innerWidth - width - safeGap),
    ),
    y: Math.min(
      Math.max(Number(rect?.y) || safeGap, safeGap),
      Math.max(safeGap, window.innerHeight - height - safeGap),
    ),
  };
};

const getAspectLockedVideoViewerResizeRect = ({
  startRect,
  direction,
  deltaX,
  deltaY,
  aspectRatio,
}) => {
  if (!startRect) {
    return getDefaultVideoViewerWindowRect();
  }

  const safeGap = 8;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : startRect.width + 16;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : startRect.height + 16;
  const normalizedAspectRatio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const minWidth = Math.min(
    Math.max(220, 180 * normalizedAspectRatio),
    Math.max(220, viewportWidth - safeGap * 2),
  );
  const minHeight = minWidth / normalizedAspectRatio;
  const startWidth = Math.max(startRect.width, minWidth);
  const startHeight = startWidth / normalizedAspectRatio;
  const right = startRect.x + startWidth;
  const bottom = startRect.y + startHeight;
  const centerX = startRect.x + startWidth / 2;
  const centerY = startRect.y + startHeight / 2;
  let nextWidth = startWidth;

  if (direction.includes("e")) {
    nextWidth = startWidth + deltaX;
  } else if (direction.includes("w")) {
    nextWidth = startWidth - deltaX;
  } else if (direction.includes("s")) {
    nextWidth = (startHeight + deltaY) * normalizedAspectRatio;
  } else if (direction.includes("n")) {
    nextWidth = (startHeight - deltaY) * normalizedAspectRatio;
  }

  if (
    (direction.length === 2 && Math.abs(deltaY) > Math.abs(deltaX)) ||
    (!direction.includes("e") && !direction.includes("w"))
  ) {
    if (direction.includes("s")) {
      nextWidth = (startHeight + deltaY) * normalizedAspectRatio;
    } else if (direction.includes("n")) {
      nextWidth = (startHeight - deltaY) * normalizedAspectRatio;
    }
  }

  const maxWidthByViewport = viewportWidth - safeGap * 2;
  nextWidth = Math.min(Math.max(nextWidth, minWidth), maxWidthByViewport);
  let nextHeight = nextWidth / normalizedAspectRatio;

  if (nextHeight > viewportHeight - safeGap * 2) {
    nextHeight = viewportHeight - safeGap * 2;
    nextWidth = nextHeight * normalizedAspectRatio;
  }

  let nextX = startRect.x;
  let nextY = startRect.y;

  if (direction.includes("w")) {
    nextX = right - nextWidth;
  } else if (!direction.includes("e")) {
    nextX = centerX - nextWidth / 2;
  }

  if (direction.includes("n")) {
    nextY = bottom - nextHeight;
  } else if (!direction.includes("s")) {
    nextY = centerY - nextHeight / 2;
  }

  nextX = Math.min(
    Math.max(nextX, safeGap),
    Math.max(safeGap, viewportWidth - nextWidth - safeGap),
  );
  nextY = Math.min(
    Math.max(nextY, safeGap),
    Math.max(safeGap, viewportHeight - nextHeight - safeGap),
  );

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
};

const VIDEO_VIEWER_RESIZE_DIRECTIONS = [
  "n",
  "s",
  "e",
  "w",
  "ne",
  "nw",
  "se",
  "sw",
];

const HOME_NOGA_VIDEO_VIEWER_STATE_PREFIX = "homeNogaVideoViewerWindow:";

const getVideoViewerStorageKey = (videoKey = "") =>
  `${HOME_NOGA_VIDEO_VIEWER_STATE_PREFIX}${String(videoKey || "default").trim() || "default"}`;

const getSavedVideoViewerWindowState = (videoKey = "") => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsedState = JSON.parse(
      window.localStorage.getItem(getVideoViewerStorageKey(videoKey)) || "null",
    );
    const rect = parsedState?.rect;
    const aspectRatio = Number(parsedState?.aspectRatio || 0);

    if (
      !rect ||
      !Number.isFinite(Number(rect?.width)) ||
      !Number.isFinite(Number(rect?.height))
    ) {
      return null;
    }

    return {
      rect: clampVideoViewerWindowPosition({
        x: Number(rect.x) || 8,
        y: Number(rect.y) || 8,
        width: Number(rect.width) || 420,
        height: Number(rect.height) || 240,
      }),
      aspectRatio:
        Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null,
    };
  } catch {
    return null;
  }
};

const saveVideoViewerWindowState = (videoKey = "", rect, aspectRatio) => {
  if (typeof window === "undefined" || !rect) {
    return;
  }

  try {
    window.localStorage.setItem(
      getVideoViewerStorageKey(videoKey),
      JSON.stringify({
        rect,
        aspectRatio:
          Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0
            ? Number(aspectRatio)
            : null,
      }),
    );
  } catch {}
};

const VideoViewerModal = ({ isOpen, video, onClose, title }) => {
  const videoKey = React.useMemo(
    () =>
      String(
        video?.publicId || video?.url || video?.fileName || title || "",
      ).trim(),
    [title, video?.fileName, video?.publicId, video?.url],
  );
  const [windowRect, setWindowRect] = React.useState(
    () =>
      getSavedVideoViewerWindowState(videoKey)?.rect ||
      getDefaultVideoViewerWindowRect(),
  );
  const [videoAspectRatio, setVideoAspectRatio] = React.useState(
    () => getSavedVideoViewerWindowState(videoKey)?.aspectRatio || 16 / 9,
  );
  const [isWindowMinimized, setIsWindowMinimized] = React.useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = React.useState(false);
  const dragStateRef = React.useRef(null);
  const hasAppliedVideoRatioRef = React.useRef(false);
  const hasUserPositionedWindowRef = React.useRef(false);
  const restoredWindowRectRef = React.useRef(null);

  const closeVideoWindow = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("home-noga-video-window-closed"));
    }
    onClose?.();
  }, [onClose]);

  const stopWindowInteraction = React.useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", stopWindowInteraction);
    window.removeEventListener("pointercancel", stopWindowInteraction);
  }, []);

  function handleWindowPointerMove(event) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (dragState.mode === "move") {
      hasUserPositionedWindowRef.current = true;
      setWindowRect(
        clampVideoViewerWindowPosition({
          ...dragState.startRect,
          x: dragState.startRect.x + deltaX,
          y: dragState.startRect.y + deltaY,
        }),
      );
      return;
    }

    const direction = String(dragState.direction || "");
    hasUserPositionedWindowRef.current = true;
    setWindowRect(
      getAspectLockedVideoViewerResizeRect({
        startRect: dragState.startRect,
        direction,
        deltaX,
        deltaY,
        aspectRatio: videoAspectRatio,
      }),
    );
  }

  const beginWindowMove = React.useCallback(
    (event) => {
      if (event.button !== 0) {
        return;
      }

      if (!event.target?.closest(".Home_Noga_videoViewerWindowDragButton")) {
        return;
      }

      dragStateRef.current = {
        mode: "move",
        startX: event.clientX,
        startY: event.clientY,
        startRect: windowRect,
      };
      hasUserPositionedWindowRef.current = true;
      window.addEventListener("pointermove", handleWindowPointerMove);
      window.addEventListener("pointerup", stopWindowInteraction);
      window.addEventListener("pointercancel", stopWindowInteraction);
      event.preventDefault();
      event.stopPropagation();
    },
    [stopWindowInteraction, windowRect],
  );

  const toggleWindowSize = React.useCallback(
    (event) => {
      event.stopPropagation();

      if (isWindowMinimized) {
        setIsWindowMinimized(false);
        setWindowRect(getVideoViewerWindowRectForAspectRatio(videoAspectRatio));
        setIsWindowMaximized(true);
        return;
      }

      if (!isWindowMaximized) {
        restoredWindowRectRef.current = windowRect;
        setIsWindowMinimized(true);
        setIsWindowMaximized(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("home-noga-video-window-minimized"),
          );
        }
        return;
      }

      if (isWindowMaximized) {
        restoredWindowRectRef.current =
          restoredWindowRectRef.current || windowRect;
        setIsWindowMinimized(true);
        setIsWindowMaximized(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("home-noga-video-window-minimized"),
          );
        }
        return;
      }
    },
    [isWindowMaximized, isWindowMinimized, videoAspectRatio, windowRect],
  );

  const beginWindowResize = React.useCallback(
    (event, direction) => {
      if (event.button !== 0) {
        return;
      }

      dragStateRef.current = {
        mode: "resize",
        direction,
        startX: event.clientX,
        startY: event.clientY,
        startRect: windowRect,
      };
      hasUserPositionedWindowRef.current = true;
      window.addEventListener("pointermove", handleWindowPointerMove);
      window.addEventListener("pointerup", stopWindowInteraction);
      window.addEventListener("pointercancel", stopWindowInteraction);
      event.preventDefault();
      event.stopPropagation();
    },
    [stopWindowInteraction, windowRect],
  );

  React.useEffect(() => {
    if (!isOpen) {
      stopWindowInteraction();
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeVideoWindow();
      }
    };

    const initialAspectRatio =
      Number(video?.width || 0) / Number(video?.height || 0);
    const savedWindowState = getSavedVideoViewerWindowState(videoKey);

    hasAppliedVideoRatioRef.current = false;
    restoredWindowRectRef.current = null;
    hasUserPositionedWindowRef.current = false;
    setIsWindowMinimized(false);
    setIsWindowMaximized(false);

    if (savedWindowState?.rect) {
      const savedAspectRatio =
        savedWindowState.aspectRatio ||
        (Number.isFinite(initialAspectRatio) && initialAspectRatio > 0
          ? initialAspectRatio
          : 16 / 9);

      hasAppliedVideoRatioRef.current = true;
      setVideoAspectRatio(savedAspectRatio);
      setWindowRect(savedWindowState.rect);
    } else if (Number.isFinite(initialAspectRatio) && initialAspectRatio > 0) {
      hasAppliedVideoRatioRef.current = true;
      setVideoAspectRatio(initialAspectRatio);
      setWindowRect(getVideoViewerWindowRectForAspectRatio(initialAspectRatio));
    } else {
      setVideoAspectRatio(16 / 9);
      setWindowRect(getDefaultVideoViewerWindowRect());
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      stopWindowInteraction();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeVideoWindow, isOpen, stopWindowInteraction, videoKey]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleResize = () => {
      setWindowRect((currentRect) =>
        isWindowMaximized
          ? getVideoViewerWindowRectForAspectRatio(videoAspectRatio)
          : clampVideoViewerWindowPosition(currentRect),
      );
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, isWindowMaximized, videoAspectRatio]);

  React.useEffect(() => {
    if (!isOpen || isWindowMinimized) {
      return;
    }

    saveVideoViewerWindowState(videoKey, windowRect, videoAspectRatio);
  }, [isOpen, isWindowMinimized, videoAspectRatio, videoKey, windowRect]);

  React.useEffect(() => {
    if (!isOpen && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("home-noga-video-window-closed"));
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return undefined;
    }

    const restoreVideoWindow = () => {
      setIsWindowMinimized(false);
      setIsWindowMaximized(false);
      setWindowRect(
        clampVideoViewerWindowPosition(
          restoredWindowRectRef.current ||
            getVideoViewerWindowRectForAspectRatio(videoAspectRatio),
        ),
      );
      window.dispatchEvent(new CustomEvent("home-noga-video-window-restored"));
    };

    window.addEventListener(
      "home-noga-video-window-restore",
      restoreVideoWindow,
    );

    return () => {
      window.removeEventListener(
        "home-noga-video-window-restore",
        restoreVideoWindow,
      );
    };
  }, [isOpen, videoAspectRatio]);

  if (!isOpen) {
    return null;
  }

  const videoUrl = String(video?.url || "").trim();
  const videoLabel =
    String(video?.publicId || video?.fileName || title || "Video").trim() ||
    "Video";

  if (isWindowMinimized) {
    return null;
  }

  return (
    <div
      className="Home_Noga_videoViewerOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={String(title || videoLabel || "Video player")}
    >
      <div
        className={`fc Home_Noga_preStart_reportCard Home_Noga_preStart_reportsCard Home_Noga_videoViewerCard${
          isWindowMinimized ? " Home_Noga_videoViewerCard--minimized" : ""
        }${isWindowMaximized ? " Home_Noga_videoViewerCard--maximized" : ""}`}
        style={{
          transform: `translate(${windowRect.x}px, ${windowRect.y}px)`,
          width: isWindowMinimized ? "132px" : `${windowRect.width}px`,
          height: isWindowMinimized ? "38px" : `${windowRect.height}px`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="Home_Noga_videoViewerWindowControls">
          <button
            type="button"
            className="Home_Noga_videoViewerWindowButton Home_Noga_videoViewerWindowDragButton"
            onPointerDown={beginWindowMove}
            aria-label="Move video player"
            title="Move"
          >
            <i className="fas fa-arrows-alt" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            className="Home_Noga_videoViewerWindowButton"
            onClick={toggleWindowSize}
            aria-label={
              isWindowMinimized
                ? "Maximize video player"
                : isWindowMaximized
                  ? "Minimize video player"
                  : "Minimize video player"
            }
            title={
              isWindowMinimized
                ? "Maximize"
                : isWindowMaximized
                  ? "Minimize"
                  : "Minimize"
            }
          >
            <i
              className={`fas ${
                isWindowMinimized
                  ? "fa-expand-alt"
                  : isWindowMaximized
                    ? "fa-minus"
                    : "fa-minus"
              }`}
              aria-hidden="true"
            ></i>
          </button>
          <button
            type="button"
            className="Home_Noga_videoViewerWindowButton Home_Noga_videoViewerWindowButton--close"
            onClick={(event) => {
              event.stopPropagation();
              closeVideoWindow();
            }}
            aria-label="Close video player"
            title="Close"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div className="Home_Noga_reportBody Home_Noga_videoViewerBody isOpen">
          <div
            className="Home_Noga_videoViewerFrame"
            style={{ aspectRatio: String(videoAspectRatio) }}
          >
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="Home_Noga_videoViewerMedia"
              onLoadedMetadata={(event) => {
                const nextAspectRatio =
                  Number(event.currentTarget.videoWidth || 0) /
                  Number(event.currentTarget.videoHeight || 0);

                if (!Number.isFinite(nextAspectRatio) || nextAspectRatio <= 0) {
                  return;
                }

                setVideoAspectRatio(nextAspectRatio);

                if (!hasAppliedVideoRatioRef.current) {
                  hasAppliedVideoRatioRef.current = true;
                  setWindowRect((currentRect) =>
                    hasUserPositionedWindowRef.current
                      ? getVideoViewerWindowRectAtPositionForAspectRatio(
                          currentRect,
                          nextAspectRatio,
                        )
                      : getVideoViewerWindowRectForAspectRatio(nextAspectRatio),
                  );
                }
              }}
            />
          </div>
        </div>
        {VIDEO_VIEWER_RESIZE_DIRECTIONS.map((direction) => (
          <span
            key={direction}
            className={`Home_Noga_videoViewerResizeHandle Home_Noga_videoViewerResizeHandle--${direction}`}
            onPointerDown={(event) => beginWindowResize(event, direction)}
            aria-hidden="true"
          ></span>
        ))}
      </div>
    </div>
  );
};

function HomeNoga(props) {
  const readProgramTermValue = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return String(value.number || "").trim();
    }
    return String(value || "").trim();
  };
  const isNaghamtrkmani = true;
  const homeThemeClassName = isNaghamtrkmani
    ? "Home_Noga_themeNoga"
    : "Home_Noga_themeGreen";
  const [isHomeNogaDarkTheme, setIsHomeNogaDarkTheme] = useState(() =>
    typeof document !== "undefined"
      ? document.body.classList.contains("dark")
      : false,
  );
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const syncTheme = () => {
      setIsHomeNogaDarkTheme(document.body.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("visibilitychange", syncTheme);
    window.addEventListener("focus", syncTheme);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncTheme);
      window.removeEventListener("focus", syncTheme);
    };
  }, []);

  const fetchProfileEvents = async () => {
    const token = String(props.state?.token || "").trim();
    const myId = String(props.state?.my_id || "").trim();
    if (!token || !myId) return;
    setIsFetchingEvents(true);
    try {
      const response = await fetch(apiUrl(`/api/user/feedEvents/${myId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload?.events)) {
        setLocalProfileEvents(payload.events);
      }
    } catch (_err) {
      // ignore — fall back to props
    } finally {
      setIsFetchingEvents(false);
    }
  };

  useEffect(() => {
    fetchProfileEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.state?.my_id]);

  useEffect(() => {
    if (localProfileEvents === null) return;
    const incoming = Array.isArray(props.state?.profile_events)
      ? props.state.profile_events
      : [];
    if (incoming.length === 0) return;
    setLocalProfileEvents((current) => {
      const currentIds = new Set(
        (Array.isArray(current) ? current : []).map((e) => String(e?._id || "")),
      );
      const newOnes = incoming.filter(
        (e) => e?._id && !currentIds.has(String(e._id)),
      );
      if (newOnes.length === 0) return current;
      const taggedNew = newOnes.map((e) => ({ ...e, _isOwn: true }));
      return [...taggedNew, ...(Array.isArray(current) ? current : [])];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.state?.profile_events]);

  // Set background style for everyone except naghamtrkmani
  const baseUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  // Style moved to CSS: .Home_Noga_root--bg
  const homeBackgroundStyle = undefined;
  // State to track which friend's chat is open
  const [openChatFriendId, setOpenChatFriendId] = useState(null);
  const homeMusicSignalRef = React.useRef(
    props.state?.planner_music?.audioSignal || {
      energy: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      pitch: 0,
      tempo: 0,
      pulse: 0,
      fallbackTime: 0,
      updatedAt: 0,
    },
  );
  const homeMusicIsPlayingRef = React.useRef(
    Boolean(props.state?.planner_music?.isPlaying),
  );
  const [inlineCallActionsTarget, setInlineCallActionsTarget] = useState(null);
  const inlineCallActionsTargetNodeRef = React.useRef(null);
  const history = useHistory();
  const galleryUploadInputRef = React.useRef(null);
  const hasRecoveredPendingUploadsRef = React.useRef(false);
  const mainWrapperRef = React.useRef(null);
  const homeNogaSplitDragRef = React.useRef(null);
  const profilePictureWrapperRef = React.useRef(null);
  const profilePictureImageRef = React.useRef(null);
  const controlPanelCardRef = React.useRef(null);
  const academicInfoFormRef = React.useRef(null);
  const profilePictureGestureRef = React.useRef({
    mode: "idle",
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDistance: 0,
    startScale: 1,
  });
  const HOME_NOGA_SPLIT_HANDLE_WIDTH = 12;
  const HOME_NOGA_SPLIT_MIN_LEFT_WIDTH = 520;
  const HOME_NOGA_SPLIT_MIN_RIGHT_WIDTH = 220;
  const [homeNogaLeftColumnWidth, setHomeNogaLeftColumnWidth] = useState("");
  const [isHomeNogaSplitDragging, setIsHomeNogaSplitDragging] =
    useState(false);
  // (Fixed: removed misplaced JSX here)
  const [isImageGalleryUploading, setIsImageGalleryUploading] = useState(false);
  // Gallery tab state: 'images' | 'videos'
  const [galleryTab, setGalleryTab] = useState("images");
  // Mobile portrait tab: 'gallery' | 'events'
  const [friendsEventsTab, setFriendsEventsTab] = useState("gallery");
  const [localProfileEvents, setLocalProfileEvents] = useState(null);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [deletingEventIds, setDeletingEventIds] = useState(new Set());
  const [eventsTab, setEventsTab] = useState("mine");
  const [replyOpenIds, setReplyOpenIds] = useState(new Set());
  const [replyTexts, setReplyTexts] = useState({});
  const [submittingReplyIds, setSubmittingReplyIds] = useState(new Set());
  // Mobile portrait chat toggle
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [galleryImageVisibilityTab, setGalleryImageVisibilityTab] =
    useState("public");
  const activeGalleryUploadConfig =
    HOME_GALLERY_TAB_UPLOAD_CONFIG[galleryTab] ||
    HOME_GALLERY_TAB_UPLOAD_CONFIG.images;
  const [isImageGalleryDeletingPublicId, setIsImageGalleryDeletingPublicId] =
    useState("");
  const [
    isImageGallerySettingProfilePublicId,
    setIsImageGallerySettingProfilePublicId,
  ] = useState("");
  const [
    isImageGalleryVisibilityUpdatingPublicId,
    setIsImageGalleryVisibilityUpdatingPublicId,
  ] = useState("");
  const [
    isHiddenGalleryPasswordPromptOpen,
    setIsHiddenGalleryPasswordPromptOpen,
  ] = useState(false);
  const [hiddenGalleryPasswordInput, setHiddenGalleryPasswordInput] =
    useState("");
  const [hiddenGalleryPasswordFeedback, setHiddenGalleryPasswordFeedback] =
    useState("");
  const [
    isHiddenGalleryPasswordSubmitting,
    setIsHiddenGalleryPasswordSubmitting,
  ] = useState(false);
  const [clearPendingFeedback, setClearPendingFeedback] = useState("");
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeGalleryImageIndex, setActiveGalleryImageIndex] = useState(0);
  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);
  const [activeGalleryVideo, setActiveGalleryVideo] = useState(null);
  const [activeGalleryActionsPublicId, setActiveGalleryActionsPublicId] =
    useState("");
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordFeedback, setPasswordFeedback] = useState({
    tone: "",
    message: "",
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isAcademicInfoEditing, setIsAcademicInfoEditing] = useState(false);
  const [academicInfoFields, setAcademicInfoFields] = useState({
    faculty: "",
    program: "",
    university: "",
    currentAcademicYear: "",
    studyYear: "",
    term: "",
  });
  const [isAboutProfileEditing, setIsAboutProfileEditing] = useState(false);
  const [isAboutProfileSubmitting, setIsAboutProfileSubmitting] =
    useState(false);
  const [aboutProfileDraft, setAboutProfileDraft] = useState({
    firstname: "",
    lastname: "",
    dob: "",
    university: "",
    program: "",
    faculty: "",
    componentsClass: [],
    totalYearsNum: "",
    startProgramYearInterval: "",
    startProgramTerm: "",
    currentProgramYearNum: "",
    currentProgramYearInterval: "",
    currentProgramTerm: "",
    currentProgramTermAttendanceDateEntries: [],
    currentProgramTermExamDateEntries: [],
    language: "",
    company: "",
    position: "",
    email: "",
    phone: "",
    hometownCountry: "",
    hometownCity: "",
  });
  const [academicInfoFeedback, setAcademicInfoFeedback] = useState({
    tone: "",
    message: "",
  });
  const [isAcademicInfoSubmitting, setIsAcademicInfoSubmitting] =
    useState(false);
  const [activePersonalInfoField, setActivePersonalInfoField] = useState("");
  const [personalInfoInputValue, setPersonalInfoInputValue] = useState("");
  const [isPersonalInfoInlineSubmitting, setIsPersonalInfoInlineSubmitting] =
    useState(false);
  const [isCompactBioGenerating, setIsCompactBioGenerating] = useState(false);
  const [loginLogEntries, setLoginLogEntries] = useState([]);
  const [isLoginLogDeleting, setIsLoginLogDeleting] = useState(false);
  const [loginLogError, setLoginLogError] = useState("");
  const [visitLogEntries, setVisitLogEntries] = useState([]);
  const [isVisitLogLoading, setIsVisitLogLoading] = useState(false);
  const [visitLogError, setVisitLogError] = useState("");
  const [isVisitLogDeleting, setIsVisitLogDeleting] = useState(false);
  const [loginLogIndex, setLoginLogIndex] = useState(0);
  const [visitLogIndex, setVisitLogIndex] = useState(0);
  const [naghamCourseLetters, setNaghamCourseLetters] = useState(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      return (
        JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LETTERS_STORAGE_KEY) ||
            "{}",
        ) || {}
      );
    } catch (error) {
      return {};
    }
  });
  const [naghamCourseOptions, setNaghamCourseOptions] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      return (
        JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LIST_STORAGE_KEY) || "[]",
        ) || []
      );
    } catch (error) {
      return [];
    }
  });
  const [selectedNaghamCourseId, setSelectedNaghamCourseId] = useState("");
  const [naghamCourseLetterInput, setNaghamCourseLetterInput] = useState("");
  const [naghamCourseLetterFeedback, setNaghamCourseLetterFeedback] =
    useState("");
  const [musicArchivePlaylistInput, setMusicArchivePlaylistInput] = useState(
    () =>
      formatStoredMusicLibraryItemsForProvider(
        "internetArchive",
        DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS,
      ),
  );
  const [itunesPlaylistInput, setItunesPlaylistInput] = useState(() =>
    formatStoredMusicLibraryItemsForProvider("itunes"),
  );
  const [musicBrainzPlaylistInput, setMusicBrainzPlaylistInput] = useState(() =>
    formatStoredMusicLibraryItemsForProvider("musicBrainz"),
  );
  const [musicArchivePlaylistFeedback, setMusicArchivePlaylistFeedback] =
    useState("");
  const [musicLibrarySongQuery, setMusicLibrarySongQuery] = useState("");
  const [musicLibraryArtistQuery, setMusicLibraryArtistQuery] = useState("");
  const [musicLibrarySearchFeedback, setMusicLibrarySearchFeedback] =
    useState("");
  const [isMusicLibrarySearching, setIsMusicLibrarySearching] = useState(false);
  const [musicArchiveSearchResults, setMusicArchiveSearchResults] = useState(
    [],
  );
  const [itunesSearchResults, setItunesSearchResults] = useState([]);
  const [musicBrainzSearchResults, setMusicBrainzSearchResults] = useState([]);
  const musicLibraryPlaylistItems = [
    ...parsePlaylistLines(musicArchivePlaylistInput).map((line) => ({
      id: `archive-${line}`,
      label: line.replace(/[-_]+/g, " "),
      meta: line,
      source: "Internet Archive",
      provider: "internetArchive",
      value: line,
    })),
    ...parsePlaylistLines(itunesPlaylistInput).map((line) => ({
      id: `itunes-${line}`,
      label: line,
      meta: "",
      source: "iTunes",
      provider: "itunes",
      value: line,
    })),
    ...parsePlaylistLines(musicBrainzPlaylistInput).map((line) => ({
      id: `musicbrainz-${line}`,
      label: line,
      meta: "",
      source: "MusicBrainz",
      provider: "musicBrainz",
      value: line,
    })),
  ];
  const musicLibrarySearchResults = [
    ...musicArchiveSearchResults.map((result) => ({
      id: `archive-${result.identifier}`,
      title: result.title || result.identifier,
      artist: result.creator || "Internet Archive",
      source: "Internet Archive",
      provider: "internetArchive",
      value: result.identifier,
    })),
    ...itunesSearchResults.map((result) => ({
      id: `itunes-${result.identifier || result.queryLabel}`,
      title: result.title || result.queryLabel,
      artist: result.creator || "iTunes",
      source: "iTunes",
      provider: "itunes",
      value: result.queryLabel,
    })),
    ...musicBrainzSearchResults.map((result) => ({
      id: `musicbrainz-${result.identifier || result.queryLabel}`,
      title: result.title || result.queryLabel,
      artist: result.creator || "MusicBrainz",
      source: "MusicBrainz",
      provider: "musicBrainz",
      value: result.queryLabel,
    })),
  ];
  const [schoolPlannerTelegramFeedback, setSchoolPlannerTelegramFeedback] =
    useState("");
  const [phenomedSocialChatBackground, setPhenomedSocialChatBackground] =
    useState(() => {
      if (typeof window === "undefined") {
        return "";
      }

      return String(
        window.localStorage.getItem(PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY) || "",
      ).trim();
    });
  const [schoolPlannerReducedMotion, setSchoolPlannerReducedMotion] = useState(
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      return (
        String(
          window.localStorage.getItem(
            SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
          ) || "",
        ).trim() === "true"
      );
    },
  );
  const [schoolPlannerTelegramGroupInput, setSchoolPlannerTelegramGroupInput] =
    useState("");
  const [telegramApiIdInput, setTelegramApiIdInput] = useState("");
  const [telegramApiHashInput, setTelegramApiHashInput] = useState("");
  const [telegramPhoneNumberInput, setTelegramPhoneNumberInput] = useState("");
  const [telegramPhoneCodeInput, setTelegramPhoneCodeInput] = useState("");
  const [telegramPasswordInput, setTelegramPasswordInput] = useState("");
  const [telegramConfigFeedback, setTelegramConfigFeedback] = useState("");
  const [telegramConfigStatus, setTelegramConfigStatus] = useState({
    configured: false,
    hasApiId: false,
    hasApiHash: false,
    hasStringSession: false,
    groupReference: "",
  });
  const [telegramAuthStage, setTelegramAuthStage] = useState("idle");
  const [openReportSections, setOpenReportSections] = useState({});
  const [isReportsWrapperOpen, setIsReportsWrapperOpen] = useState(false);
  const [showGalleryInRightColumn, setShowGalleryInRightColumn] =
    useState(false);
  // --- Friends/Requests/Blocked/Chat logic from Home.jsx (full clone) ---
  const [activeFriendsMiniTab, setActiveFriendsMiniTab] = useState("friends");
  const [activeFriendsPanelTab, setActiveFriendsPanelTab] =
    useState("friends");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [isFriendSearchLoading, setIsFriendSearchLoading] = useState(false);
  const [friendSearchFeedback, setFriendSearchFeedback] = useState("");
  const [sendingFriendRequestUsername, setSendingFriendRequestUsername] =
    useState("");
  // Add any additional refs or state from Home.jsx friends logic here as needed

  // (Insert all memoized selectors, effects, callbacks, and renderers for friends, search, requests, blocked, and chat from Home.jsx here)
  // ...existing code...
  const [isGalleryTopRowVisible, setIsGalleryTopRowVisible] = useState(false);
  const [isBioWallpaperControlsOpen, setIsBioWallpaperControlsOpen] =
    useState(false);
  const [isProfilePictureDragging, setIsProfilePictureDragging] =
    useState(false);
  const [
    isApplyingProfilePictureViewport,
    setIsApplyingProfilePictureViewport,
  ] = useState(false);
  const hasHydratedProfilePictureViewportRef = React.useRef(true);
  const [profilePictureViewport, setProfilePictureViewport] = useState(() => {
    const stateViewport = props.state?.profilePictureViewport;
    if (stateViewport && typeof stateViewport === "object") {
      return normalizeProfilePictureViewport(stateViewport);
    }

    if (typeof window === "undefined") {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    try {
      const parsedViewport = JSON.parse(
        window.localStorage.getItem(HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY) ||
          "{}",
      );

      const scale = Number(parsedViewport?.scale) || 1;
      const offsetX = Number(parsedViewport?.offsetX) || 0;
      const offsetY = Number(parsedViewport?.offsetY) || 0;

      return normalizeProfilePictureViewport({
        scale,
        offsetX,
        offsetY,
      });
    } catch {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }
  });
  const isVisitLogOwner =
    String(props.state?.username || "").trim().toLowerCase() ===
    "rudyhamame";

  const isReportSectionOpen = (sectionKey) =>
    Boolean(openReportSections?.[sectionKey]);
  const shouldLoadVisitLog =
    isVisitLogOwner && isReportSectionOpen("visitLog") && Boolean(props.state?.token);

  const toggleReportSection = (sectionKey) => {
    setOpenReportSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections?.[sectionKey],
    }));
  };

  const openProfileEditor = () => {
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });
    setIsAboutProfileEditing(true);
  };

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  React.useEffect(() => {
    if (isReportsWrapperOpen || showGalleryInRightColumn) {
      if (openChatFriendId) {
        setOpenChatFriendId(null);
        props.closeActiveChat?.();
      }
    }
  }, [
    isReportsWrapperOpen,
    openChatFriendId,
    props.closeActiveChat,
    showGalleryInRightColumn,
  ]);

  React.useEffect(() => {
    const globalActiveChatFriendId = String(
      props.state?.activeChatFriendId || "",
    ).trim();
    if (!globalActiveChatFriendId) {
      setOpenChatFriendId((currentFriendId) =>
        currentFriendId ? null : currentFriendId,
      );
      return;
    }
    setOpenChatFriendId((currentFriendId) => {
      return currentFriendId === globalActiveChatFriendId
        ? currentFriendId
        : globalActiveChatFriendId;
    });
  }, [props.state?.activeChatFriendId]);

  React.useEffect(() => {
    if (!profilePictureImageRef.current) {
      return;
    }

    profilePictureImageRef.current.style.setProperty(
      "--home-profile-offset-x",
      `${profilePictureViewport.offsetX}px`,
    );
    profilePictureImageRef.current.style.setProperty(
      "--home-profile-offset-y",
      `${profilePictureViewport.offsetY}px`,
    );
    profilePictureImageRef.current.style.setProperty(
      "--home-profile-scale",
      `${profilePictureViewport.scale}`,
    );
  }, [profilePictureViewport]);

  const handleInlineCallActionsTargetRef = React.useCallback((node) => {
    if (inlineCallActionsTargetNodeRef.current === node) {
      return;
    }

    inlineCallActionsTargetNodeRef.current = node;
    setInlineCallActionsTarget(node);
  }, []);

  const toggleGalleryTopRow = () => {
    setIsGalleryTopRowVisible((value) => !value);
  };

  React.useEffect(() => {
    const nextAcademicInfoFields = {
      faculty: String(
        props.state?.faculty || props.state?.studying?.faculty || "",
      ),
      program: String(props.state?.program || ""),
      university: String(props.state?.university || ""),
      currentAcademicYear: String(
        props.state?.studying?.time?.current?.programYearInterval ||
          props.state?.studying?.time?.currentAcademicYear ||
          "",
      ),
      studyYear: String(
        props.state?.studyYear ||
          props.state?.studying?.time?.current?.programYearNum ||
          "",
      ),
      term: String(
        props.state?.term ||
          readProgramTermValue(
            props.state?.studying?.time?.current?.programTerm,
          ) ||
          "",
      ),
    };

    setAcademicInfoFields((currentFields) =>
      currentFields.faculty === nextAcademicInfoFields.faculty &&
      currentFields.program === nextAcademicInfoFields.program &&
      currentFields.university === nextAcademicInfoFields.university &&
      currentFields.currentAcademicYear ===
        nextAcademicInfoFields.currentAcademicYear &&
      currentFields.studyYear === nextAcademicInfoFields.studyYear &&
      currentFields.term === nextAcademicInfoFields.term
        ? currentFields
        : nextAcademicInfoFields,
    );
  }, [
    props.state?.faculty,
    props.state?.studying?.faculty,
    props.state?.program,
    props.state?.university,
    props.state?.studying?.time?.current?.programYearInterval,
    props.state?.studying?.time?.currentAcademicYear,
    props.state?.studying?.time?.current?.programYearNum,
    props.state?.studyYear,
    props.state?.studying?.time?.current?.programTerm,
    props.state?.term,
  ]);

  React.useEffect(() => {
    const nextAboutProfileDraft = {
      firstname: String(props.state?.firstname || ""),
      lastname: String(props.state?.lastname || ""),
      dob: props.state?.dob ? String(props.state.dob).slice(0, 10) : "",
      university: String(
        props.state?.studying?.university || props.state?.university || "",
      ),
      program: String(
        props.state?.studying?.program || props.state?.program || "",
      ),
      faculty: String(
        props.state?.studying?.faculty || props.state?.faculty || "",
      ),
      componentsClass: Array.from(
        new Set(
          (Array.isArray(props.state?.studying?.componentsClass)
            ? props.state.studying.componentsClass
            : [props.state?.studying?.componentsClass]
          )
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        ),
      ),
      totalYearsNum: String(props.state?.studying?.time?.totalYearsNum || ""),
      startProgramYearInterval: String(
        props.state?.studying?.time?.start?.programYearInterval || "",
      ),
      startProgramTerm: String(
        props.state?.studying?.time?.start?.programTerm || "",
      ),
      currentProgramYearNum: String(
        props.state?.studying?.time?.current?.programYearNum || "",
      ),
      currentProgramYearInterval: String(
        props.state?.studying?.time?.current?.programYearInterval || "",
      ),
      currentProgramTerm: String(
        readProgramTermValue(props.state?.studying?.time?.current?.programTerm) ||
          "",
      ),
      currentProgramTermAttendanceDateEntries: [],
      currentProgramTermExamDateEntries: [],
      language: String(props.state?.studying?.language || ""),
      company: String(props.state?.working?.company || ""),
      position: String(props.state?.working?.position || ""),
      email: String(props.state?.email || ""),
      phone: String(props.state?.phone || ""),
      hometownCountry: String(props.state?.hometown?.Country || ""),
      hometownCity: String(props.state?.hometown?.City || ""),
    };

    setAboutProfileDraft((currentDraft) =>
      JSON.stringify(currentDraft) === JSON.stringify(nextAboutProfileDraft)
        ? currentDraft
        : nextAboutProfileDraft,
    );
  }, [
    props.state?.firstname,
    props.state?.lastname,
    props.state?.dob,
    props.state?.studying?.university,
    props.state?.university,
    props.state?.studying?.program,
    props.state?.program,
    props.state?.studying?.faculty,
    props.state?.faculty,
    props.state?.studying?.componentsClass,
    props.state?.studying?.time?.totalYearsNum,
    props.state?.studying?.time?.start?.programYearInterval,
    props.state?.studying?.time?.start?.programTerm,
    props.state?.studying?.time?.current?.programYearNum,
    props.state?.studying?.time?.current?.programTerm,
    props.state?.studying?.time?.current?.programYearInterval,
    props.state?.studying?.language,
    props.state?.working?.company,
    props.state?.working?.position,
    props.state?.email,
    props.state?.phone,
    props.state?.hometown?.Country,
    props.state?.hometown?.City,
  ]);

  React.useEffect(() => {
    const nextLoginLogEntries = Array.isArray(props.state?.login_record)
      ? props.state.login_record
      : [];

    setLoginLogEntries((currentEntries) =>
      JSON.stringify(currentEntries) === JSON.stringify(nextLoginLogEntries)
        ? currentEntries
        : nextLoginLogEntries,
    );
  }, [props.state?.login_record]);

  const loginRecords = Array.isArray(loginLogEntries)
    ? [...loginLogEntries]
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.loggedInAt || 0).getTime() -
            new Date(firstRecord.loggedInAt || 0).getTime(),
        )
        .slice(0, 20)
    : [];

  const activeLoginRecord =
    loginRecords.length > 0 ? loginRecords[loginLogIndex] : null;
  const activeVisitLogRecord =
    visitLogEntries.length > 0 ? visitLogEntries[visitLogIndex] : null;
  const homeSubApps = React.useMemo(
    () => getHomeSubApps(props.state?.username),
    [props.state?.username],
  );
  const imageGallery = Array.isArray(props.state?.imageGallery)
    ? props.state.imageGallery
    : [];
  const imageOnlyGallery = React.useMemo(
    () => imageGallery.filter((item) => !isVideoGalleryItem(item)),
    [imageGallery],
  );
  const profilePictureSrc = String(props.state?.profilePicture || "").trim();
  const activeGalleryImage = imageOnlyGallery[activeGalleryImageIndex] || null;
  const normalizeGalleryVisibility = (visibility) => {
    const normalizedVisibility = String(visibility || "")
      .trim()
      .toLowerCase();

    if (normalizedVisibility === "private") {
      return "me";
    }

    return ["public", "me", "hidden"].includes(normalizedVisibility)
      ? normalizedVisibility
      : "public";
  };
  const filteredGalleryItems = React.useMemo(
    () =>
      imageGallery.filter((image) => {
        if (galleryTab === "images") {
          if (
            isVideoGalleryItem(image) ||
            String(image?.resourceType || image?.resource_type || "")
              .trim()
              .toLowerCase() === "pattern"
          ) {
            return false;
          }

          return (
            normalizeGalleryVisibility(image?.visibility) ===
            galleryImageVisibilityTab
          );
        }

        return isVideoGalleryItem(image);
      }),
    [galleryImageVisibilityTab, galleryTab, imageGallery],
  );
  const socialFriends = React.useMemo(() => {
    const rawFriends = Array.isArray(props.state?.friends)
      ? props.state.friends
      : [];

    return rawFriends
      .filter((friend) => friend && typeof friend === "object")
      .filter((friend) => {
        const userMode = String(
          friend?.userMode ||
            friend?.mode ||
            friend?.relationship?.userMode ||
            "",
        )
          .trim()
          .toLowerCase();

        return userMode === "friend";
      })
      .map((friend, index) => {
        const info =
          friend?.info ||
          friend?.user?.info ||
          friend?.user ||
          friend?.id?.info ||
          friend;
        const firstName = String(info?.firstname || "").trim();
        const lastName = String(info?.lastname || "").trim();
        const username = String(
          info?.username || friend?.username || "",
        ).trim();
        const displayName =
          `${firstName} ${lastName}`.trim() || username || "Friend";
        const initials =
          `${firstName.charAt(0) || displayName.charAt(0) || "F"}${
            lastName.charAt(0) || username.charAt(0) || ""
          }`.toUpperCase() || "F";
        const avatarUrl = String(
          friend?.media?.profilePicture?.url ||
            info?.profilePicture?.url ||
            info?.profilePicture ||
            friend?.profilePicture ||
            "",
        ).trim();
        const chatId = String(
          friend?.chatId ||
            friend?.friendId ||
            friend?._id ||
            friend?.id ||
            info?._id ||
            username ||
            index,
        ).trim();
        const normalizedUsername = String(username || "")
          .trim()
          .toLowerCase();
        const presenceState =
          openChatFriendId && openChatFriendId === chatId
            ? resolveFriendPresenceStateForChatPanel(friend)
            : resolveFriendPresenceState(friend);
        const localStatus =
          friend?.localStatus && typeof friend.localStatus === "object"
            ? {
                ...friend.localStatus,
                value:
                  String(friend.localStatus.value || "")
                    .trim()
                    .toLowerCase() || null,
              }
            : {
                value: null,
                updatedAt: null,
                lastChatAt: null,
                lastTypingAt: null,
              };

        return {
          id: String(friend?._id || friend?.id || chatId || index),
          chatId,
          username,
          displayName,
          initials,
          avatarUrl,
          status:
            friend?.status && typeof friend.status === "object"
              ? {
                  ...friend.status,
                  value:
                    String(friend.status.value || "")
                      .trim()
                      .toLowerCase() || null,
                }
              : {
                  value: null,
                  updatedAt: null,
                  lastSeenAt: null,
                  loggedInAt: null,
                  loggedOutAt: null,
                },
          localStatus,
          statusValue: presenceState.mode,
          presenceMode: presenceState.mode,
          presenceLabel: presenceState.label,
        };
      })
      .filter((friend) => friend.chatId);
  }, [props.state?.friends]);

  const unreadChatCountsByFriendId = React.useMemo(() => {
    const chatEntries = Array.isArray(props.state?.chat) ? props.state.chat : [];
    const chatLastReadAtByFriendId =
      props.state?.chatLastReadAtByFriendId &&
      typeof props.state.chatLastReadAtByFriendId === "object"
        ? props.state.chatLastReadAtByFriendId
        : {};

    return chatEntries.reduce((accumulator, message) => {
      const friendId = String(message?._id || "").trim();
      const messageSender = String(message?.from || "").trim().toLowerCase();
      const messageStatus = String(message?.status || "").trim().toLowerCase();
      const messageTimestamp = new Date(message?.date || 0).getTime();
      const lastReadAtTimestamp = new Date(
        chatLastReadAtByFriendId[friendId] || 0,
      ).getTime();

      if (
        !friendId ||
        messageSender === "me" ||
        message?.deleted ||
        messageStatus === "read" ||
        (Number.isFinite(messageTimestamp) &&
          Number.isFinite(lastReadAtTimestamp) &&
          messageTimestamp <= lastReadAtTimestamp)
      ) {
        return accumulator;
      }

      accumulator[friendId] = Number(accumulator[friendId] || 0) + 1;
      return accumulator;
    }, {});
  }, [props.state?.chat, props.state?.chatLastReadAtByFriendId]);

  const friendRequestNotifications = React.useMemo(() => {
    const rawRequests = Array.isArray(props.state?.friend_requests)
      ? props.state.friend_requests
      : [];

    return rawRequests
      .filter((request) => request && typeof request === "object")
      .filter((request) => {
        const normalizedStatus = String(request?.status || "")
          .trim()
          .toLowerCase();

        return ![
          "accepted",
          "rejected",
          "declined",
          "cancelled",
          "canceled",
        ].includes(normalizedStatus);
      })
      .map((request, index) => {
        const info =
          request?.info ||
          request?.user?.info ||
          request?.user ||
          request?.fromUser?.info ||
          request?.fromUser ||
          request;
        const firstName = String(info?.firstname || "").trim();
        const lastName = String(info?.lastname || "").trim();
        const username = String(info?.username || request?.username || "").trim();
        const displayName =
          `${firstName} ${lastName}`.trim() || username || "User";

        return {
          id: String(
            request?._id ||
              request?.id ||
              info?._id ||
              info?.id ||
              username ||
              index,
          ).trim(),
          username,
          displayName,
          initials:
            `${firstName.charAt(0) || displayName.charAt(0) || "U"}${
              lastName.charAt(0) || username.charAt(0) || ""
            }`.toUpperCase() || "U",
          avatarUrl: String(
            request?.media?.profilePicture?.url ||
              info?.profilePicture ||
              request?.profilePicture ||
              "",
          ).trim(),
          userMode: "requestreceived",
          statusValue: "requestreceived",
          presenceMode: "requestreceived",
          profileState: {},
        };
      })
      .filter((request) => request.id);
  }, [props.state?.friend_requests]);

  React.useEffect(() => {
    if (activeFriendsMiniTab === "search") {
      setActiveFriendsMiniTab("friends");
    }
  }, [activeFriendsMiniTab]);

  React.useEffect(() => {
    if (activeFriendsMiniTab === "requests") {
      props.updateUserInfo?.();
    }
  }, [activeFriendsMiniTab, props.updateUserInfo]);

  const incomingFriendRequestIds = React.useMemo(
    () =>
      new Set(
        friendRequestNotifications
          .map((notification) => String(notification?.id || "").trim())
          .filter(Boolean),
      ),
    [friendRequestNotifications],
  );

  const incomingFriendRequestIdsByUsername = React.useMemo(
    () =>
      new Set(
        friendRequestNotifications
          .map((notification) =>
            String(notification?.info?.username || notification?.username || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    [friendRequestNotifications],
  );

  const existingFriendUsernames = React.useMemo(
    () =>
      new Set(
        socialFriends
          .map((friend) =>
            String(friend?.username || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    [socialFriends],
  );

  const existingFriendIds = React.useMemo(
    () =>
      new Set(
        socialFriends
          .map((friend) => String(friend?.chatId || friend?.id || "").trim())
          .filter(Boolean),
      ),
    [socialFriends],
  );

  const sentFriendRequestIds = React.useMemo(
    () =>
      new Set(
        (Array.isArray(props.state?.sent_friend_requests)
          ? props.state.sent_friend_requests
          : []
        )
          .filter(
            (request) =>
              String(request?.status || "")
                .trim()
                .toLowerCase() === "pending",
          )
          .map((request) => String(request?.id || "").trim())
          .filter(Boolean),
      ),
    [props.state?.sent_friend_requests],
  );

  const sentFriendRequestUsernames = React.useMemo(
    () =>
      new Set(
        (Array.isArray(props.state?.sent_friend_requests)
          ? props.state.sent_friend_requests
          : []
        )
          .filter((request) => {
            const normalizedStatus = String(request?.status || "")
              .trim()
              .toLowerCase();
            return normalizedStatus === "pending";
          })
          .map((request) =>
            String(
              request?.username ||
                request?.toUser?.username ||
                request?.info?.username ||
                "",
            )
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    [props.state?.sent_friend_requests],
  );

  const deriveSearchUserMode = React.useCallback(
    (candidate) => {
      const candidateId = String(candidate?.id || "").trim();
      const candidateUsername = String(candidate?.username || "")
        .trim()
        .toLowerCase();
      const rawFriends = Array.isArray(props.state?.friends)
        ? props.state.friends
        : [];
      const matchedRelationshipEntry = rawFriends.find((entry) => {
        const info =
          entry?.info ||
          entry?.user?.info ||
          entry?.user ||
          entry?.id?.info ||
          entry ||
          {};
        const relationshipId = String(
          entry?._id || entry?.id || info?._id || info?.id || "",
        ).trim();
        const relationshipUsername = String(
          info?.username || entry?.username || "",
        )
          .trim()
          .toLowerCase();

        return (
          (candidateId && relationshipId === candidateId) ||
          (candidateUsername && relationshipUsername === candidateUsername)
        );
      });
      const matchedRelationshipMode = normalizeFriendUserMode(
        matchedRelationshipEntry?.userMode ||
          matchedRelationshipEntry?.mode ||
          matchedRelationshipEntry?.relationship?.userMode ||
          "",
      );

      if (matchedRelationshipMode && matchedRelationshipMode !== "stranger") {
        return matchedRelationshipMode;
      }

      if (
        candidateId &&
        (existingFriendIds.has(candidateId) ||
          existingFriendUsernames.has(candidateUsername))
      ) {
        return "friend";
      }

      if (
        candidateId &&
        (incomingFriendRequestIds.has(candidateId) ||
          incomingFriendRequestIdsByUsername.has(candidateUsername))
      ) {
        return "requestReceived";
      }

      if (
        (candidateId && sentFriendRequestIds.has(candidateId)) ||
        (candidateUsername && sentFriendRequestUsernames.has(candidateUsername))
      ) {
        return "requestsent";
      }

      return "stranger";
    },
    [
      existingFriendIds,
      existingFriendUsernames,
      incomingFriendRequestIds,
      incomingFriendRequestIdsByUsername,
      props.state?.friends,
      sentFriendRequestIds,
      sentFriendRequestUsernames,
    ],
  );

  React.useEffect(() => {
    const normalizedQuery = String(friendSearchQuery || "").trim();
    if (!normalizedQuery) {
      setFriendSearchResults([]);
      setFriendSearchFeedback("");
      setIsFriendSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setIsFriendSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      fetch(
        apiUrl(`/api/user/searchUsers/${encodeURIComponent(normalizedQuery)}`),
      )
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(new Error("search_failed")),
        )
        .then((payload) => {
          if (isCancelled) {
            return;
          }

          const currentUserId = String(props.state?.my_id || "").trim();
          const currentUsername = String(props.state?.username || "")
            .trim()
            .toLowerCase();
          const users = Array.isArray(payload?.array) ? payload.array : [];

          const normalizedResults = users
            .map((user) => {
              const info = user?.info || {};
              const identity = user?.identity || {};
              const personal = identity?.personal || {};
              const atSignup = identity?.atSignup || {};
              const profile = user?.profile || {};
              const auth = user?.auth || {};
              const id = String(
                user?._id || info?._id || profile?._id || "",
              ).trim();
              const username = String(
                info?.username ||
                  atSignup?.username ||
                  auth?.username ||
                  user?.username ||
                  "",
              )
                .trim()
                .toLowerCase();
              const firstname = String(
                info?.firstname ||
                  personal?.firstname ||
                  profile?.firstname ||
                  "",
              ).trim();
              const lastname = String(
                info?.lastname || personal?.lastname || profile?.lastname || "",
              ).trim();
              const displayName =
                `${firstname} ${lastname}`.trim() || username || "User";
              const profilePicture =
                personal?.profilePicture?.picture ||
                personal?.profilePicture ||
                profile?.picture?.profilePic?.index ||
                user?.profilePicture ||
                {};
              const avatarUrl = String(
                profilePicture?.url || profilePicture?.secure_url || "",
              ).trim();
              const initials =
                `${firstname.charAt(0) || displayName.charAt(0) || "U"}${
                  lastname.charAt(0) || username.charAt(0) || ""
                }`.toUpperCase() || "U";
              return {
                id,
                username,
                firstname,
                lastname,
                displayName,
                avatarUrl,
                initials,
              };
            })
            .filter((user) => user.id && user.username)
            .filter((user) => user.id !== currentUserId)
            .filter((user) => user.username !== currentUsername)
            .map((user) => ({
              ...user,
              userMode: deriveSearchUserMode(user),
            }));

          setFriendSearchResults(normalizedResults);
          setFriendSearchFeedback(
            normalizedResults.length
              ? ""
              : "No users found. Try another name or username.",
          );
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }
          setFriendSearchResults([]);
          setFriendSearchFeedback("Unable to search users right now.");
        })
        .finally(() => {
          if (!isCancelled) {
            setIsFriendSearchLoading(false);
          }
        });
    }, 260);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [friendSearchQuery, props.state?.my_id, props.state?.username]);

  // All non-stranger friends (pending, accepted, blocked, refused, etc)
  const relationshipEntries = React.useMemo(() => {
    const rawFriends = Array.isArray(props.state?.friends)
      ? props.state.friends
      : [];
    return rawFriends
      .filter((entry) => entry && typeof entry === "object")
      .filter((entry) => {
        const mode = normalizeFriendUserMode(
          entry?.userMode ||
            entry?.mode ||
            entry?.relationship?.userMode ||
            "stranger",
        );
        return mode !== "stranger";
      })
      .map((entry, index) => {
        const info =
          entry?.info ||
          entry?.user?.info ||
          entry?.user ||
          entry?.id?.info ||
          entry;
        const firstName = String(info?.firstname || "").trim();
        const lastName = String(info?.lastname || "").trim();
        const username = String(info?.username || entry?.username || "").trim();
        const displayName =
          `${firstName} ${lastName}`.trim() || username || "User";
        const initials =
          `${firstName.charAt(0) || displayName.charAt(0) || "U"}${lastName.charAt(0) || username.charAt(0) || ""}`.toUpperCase() ||
          "U";
        const profile =
          entry?.profile && typeof entry.profile === "object"
            ? entry.profile
            : {};
        const profileStudying =
          profile?.studying && typeof profile.studying === "object"
            ? profile.studying
            : {};
        const profileWorking =
          profile?.working && typeof profile.working === "object"
            ? profile.working
            : {};
        const profileHometown =
          profile?.hometown && typeof profile.hometown === "object"
            ? profile.hometown
            : {};
        const presenceState = resolveFriendPresenceState(entry);
        return {
          id: String(entry?._id || entry?.id || info?._id || username || index),
          displayName,
          username,
          initials,
          statusValue: presenceState.mode,
          presenceMode: presenceState.mode,
          userMode: normalizeFriendUserMode(
            entry?.userMode ||
              entry?.mode ||
              entry?.relationship?.userMode ||
              "stranger",
          ),
          avatarUrl: String(
            entry?.media?.profilePicture?.url ||
              info?.profilePicture ||
              entry?.profilePicture ||
              "",
          ).trim(),
          profileState: {
            firstname: firstName,
            lastname: lastName,
            username,
            email: String(profile?.email || "").trim(),
            phone: String(profile?.phone || "").trim(),
            bio: String(profile?.bio || "").trim(),
            dob: profile?.dob || null,
            faculty: String(profileStudying?.faculty || "").trim(),
            program: String(profileStudying?.program || "").trim(),
            university: String(profileStudying?.university || "").trim(),
            studyYear: String(
              profileStudying?.time?.current?.programYearNum ||
                profileStudying?.time?.currentDate?.year ||
                profileStudying?.academicYear ||
                "",
            ).trim(),
            term: String(
              profileStudying?.time?.current?.programTerm ||
                profileStudying?.time?.currentDate?.term ||
                profileStudying?.term ||
                "",
            ).trim(),
            hometown: profileHometown,
            studying: profileStudying,
            working: profileWorking,
          },
        };
      })
      .filter((entry) => entry.id);
  }, [props.state?.friends]);

  const blockedRelationshipEntries = relationshipEntries;

  const blockedListTabs = React.useMemo(
    () =>
      BLOCKED_LIST_USER_MODE_ORDER.map((mode) => {
        const entries = blockedRelationshipEntries.filter(
          (entry) =>
            String(entry?.userMode || DEFAULT_BLOCKED_LIST_USER_MODE)
              .trim()
              .toLowerCase() === mode,
        );
        const meta = getFriendUserModeMeta(mode);
        return {
          id: mode,
          entries,
          count: entries.length,
          label: meta.label,
          iconClass: meta.iconClass,
          emptyLabel: meta.emptyLabel,
        };
      }),
    [blockedRelationshipEntries],
  );

  const blockedListGroups = React.useMemo(
    () =>
      BLOCKED_LIST_GROUP_ORDER.map((groupId) => {
        const tabs = blockedListTabs.filter(
          (tab) => getBlockedListGroupIdForMode(tab.id) === groupId,
        );
        const meta = BLOCKED_LIST_GROUP_META[groupId] || {
          label: groupId,
          iconClass: "fa-users",
        };
        return {
          id: groupId,
          label: meta.label,
          iconClass: meta.iconClass,
          tabs,
          count: tabs.reduce((sum, tab) => sum + tab.count, 0),
        };
      }),
    [blockedListTabs],
  );

  const friendsMiniTabs = React.useMemo(
    () => [
      {
        id: "friends",
        iconClass: "fas fa-user-friends",
        label: "Friends",
        count: relationshipEntries.length,
      },
      {
        id: "pages",
        iconClass: "fas fa-file-alt",
        label: "Pages",
        count: 0,
      },
      {
        id: "groups",
        iconClass: "fas fa-users",
        label: "Groups",
        count: 0,
      },
    ],
    [relationshipEntries.length],
  );

  const activeFriendsMiniTabIndex = Math.max(
    0,
    friendsMiniTabs.findIndex((tab) => tab.id === activeFriendsMiniTab),
  );

  const activeFriendsMiniTabMeta =
    friendsMiniTabs[activeFriendsMiniTabIndex] || friendsMiniTabs[0];

  const activeFriendCard = React.useMemo(
    () =>
      socialFriends.find(
        (friend) => friend.chatId && friend.chatId === openChatFriendId,
      ) || null,
    [openChatFriendId, socialFriends],
  );
  const chatFriends = React.useMemo(() => {
    const getPresenceSortRank = (friend) => {
      const mode = String(
        resolveFriendPresenceState(friend)?.mode || "",
      ).trim();

      return mode === "offline" ? 1 : 0;
    };

    return [...socialFriends].sort((leftFriend, rightFriend) => {
      const leftRank = getPresenceSortRank(leftFriend);
      const rightRank = getPresenceSortRank(rightFriend);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return String(leftFriend.displayName || "")
        .localeCompare(String(rightFriend.displayName || ""), undefined, {
          sensitivity: "base",
      });
    });
  }, [socialFriends, resolveFriendPresenceState]);

  const requestsPanelEntries = React.useMemo(() => {
    const pendingRelationshipEntries = blockedListTabs
      .filter((tab) => getBlockedListGroupIdForMode(tab.id) === "pending")
      .flatMap((tab) => tab.entries);

    const mergedEntries = new Map();

    [...friendRequestNotifications, ...pendingRelationshipEntries].forEach(
      (entry) => {
        const entryId = String(entry?.id || "").trim();
        const username = String(entry?.username || "")
          .trim()
          .toLowerCase();
        const mapKey = entryId || username;

        if (!mapKey || mergedEntries.has(mapKey)) {
          return;
        }

        mergedEntries.set(mapKey, entry);
      },
    );

    return Array.from(mergedEntries.values());
  }, [blockedListTabs, friendRequestNotifications]);

  const blocklistPanelEntries = React.useMemo(
    () =>
      blockedListTabs
        .filter(
          (tab) => getBlockedListGroupIdForMode(tab.id) === "blocked",
        )
        .flatMap((tab) => tab.entries),
    [blockedListTabs],
  );

  const rightPanelTabs = React.useMemo(
    () => [
      {
        id: "friends",
        label: "Friends",
        icon: "fi fi-rr-high-five-celebration-yes",
        count: chatFriends.length,
      },
      {
        id: "requests",
        label: "Requests",
        icon: "fi fi-br-followers",
        count: requestsPanelEntries.length,
      },
      {
        id: "blocked",
        label: "Blocklist",
        icon: "fi fi-br-users-slash",
        count: blocklistPanelEntries.length,
      },
    ],
    [
      blocklistPanelEntries.length,
      chatFriends.length,
      requestsPanelEntries.length,
    ],
  );

  const activeRightPanelTabIndex = Math.max(
    0,
    rightPanelTabs.findIndex((tab) => tab.id === activeFriendsPanelTab),
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncHomeNogaLeftColumnWidth = () => {
      const shellNode = mainWrapperRef.current;
      if (!shellNode) {
        return;
      }

      const shellRect = shellNode.getBoundingClientRect();
      const availableWidth = Math.max(
        0,
        shellRect.width - HOME_NOGA_SPLIT_HANDLE_WIDTH,
      );
      const maxLeftWidth = Math.max(
        HOME_NOGA_SPLIT_MIN_LEFT_WIDTH,
        availableWidth - HOME_NOGA_SPLIT_MIN_RIGHT_WIDTH,
      );
      const fallbackLeftWidth = maxLeftWidth;

      setHomeNogaLeftColumnWidth((currentValue) => {
        const currentWidth = Number.parseFloat(String(currentValue || "").trim());
        const nextWidth = Number.isFinite(currentWidth) && currentWidth > 0
          ? currentWidth
          : fallbackLeftWidth;

        return `${Math.max(
          HOME_NOGA_SPLIT_MIN_LEFT_WIDTH,
          Math.min(maxLeftWidth, nextWidth),
        )}px`;
      });
    };

    syncHomeNogaLeftColumnWidth();
    window.addEventListener("resize", syncHomeNogaLeftColumnWidth);

    return () => {
      window.removeEventListener("resize", syncHomeNogaLeftColumnWidth);
    };
  }, []);

  const stopHomeNogaSplitDrag = React.useCallback(() => {
    homeNogaSplitDragRef.current = null;
    setIsHomeNogaSplitDragging(false);

    if (typeof window === "undefined") {
      return;
    }

    window.removeEventListener("pointermove", handleHomeNogaSplitPointerMove);
    window.removeEventListener("pointerup", stopHomeNogaSplitDrag);
    window.removeEventListener("pointercancel", stopHomeNogaSplitDrag);
  }, []);

  const handleHomeNogaSplitPointerMove = React.useCallback((event) => {
    const dragState = homeNogaSplitDragRef.current;
    const shellNode = mainWrapperRef.current;
    if (!dragState || !shellNode) {
      return;
    }

    const shellRect = shellNode.getBoundingClientRect();
    const availableWidth = Math.max(
      0,
      shellRect.width - HOME_NOGA_SPLIT_HANDLE_WIDTH,
    );
    const maxLeftWidth = Math.max(
      HOME_NOGA_SPLIT_MIN_LEFT_WIDTH,
      availableWidth - HOME_NOGA_SPLIT_MIN_RIGHT_WIDTH,
    );
    const rawLeftWidth =
      event.clientX -
      shellRect.left -
      HOME_NOGA_SPLIT_HANDLE_WIDTH / 2 -
      Number(dragState.pointerOffset || 0);
    const nextLeftWidth = Math.max(
      HOME_NOGA_SPLIT_MIN_LEFT_WIDTH,
      Math.min(maxLeftWidth, rawLeftWidth),
    );

    setHomeNogaLeftColumnWidth(`${Math.round(nextLeftWidth)}px`);
  }, []);

  const beginHomeNogaSplitDrag = React.useCallback((event) => {
    if (event.button !== 0) {
      return;
    }

    const shellNode = mainWrapperRef.current;
    if (!shellNode) {
      return;
    }

    const shellRect = shellNode.getBoundingClientRect();
    const availableWidth = Math.max(
      0,
      shellRect.width - HOME_NOGA_SPLIT_HANDLE_WIDTH,
    );
    const maxLeftWidth = Math.max(
      HOME_NOGA_SPLIT_MIN_LEFT_WIDTH,
      availableWidth - HOME_NOGA_SPLIT_MIN_RIGHT_WIDTH,
    );
    const currentLeftWidth = Number.parseFloat(
      String(homeNogaLeftColumnWidth || "").trim(),
    );
    const baseLeftWidth = Number.isFinite(currentLeftWidth) && currentLeftWidth > 0
      ? currentLeftWidth
      : maxLeftWidth;
    const pointerOffset =
      event.clientX -
      (shellRect.left +
        baseLeftWidth +
        HOME_NOGA_SPLIT_HANDLE_WIDTH / 2);

    homeNogaSplitDragRef.current = { pointerOffset };
    setIsHomeNogaSplitDragging(true);

    window.addEventListener("pointermove", handleHomeNogaSplitPointerMove);
    window.addEventListener("pointerup", stopHomeNogaSplitDrag);
    window.addEventListener("pointercancel", stopHomeNogaSplitDrag);

    event.preventDefault();
    event.stopPropagation();
  }, [
    handleHomeNogaSplitPointerMove,
    homeNogaLeftColumnWidth,
    stopHomeNogaSplitDrag,
  ]);

  React.useEffect(
    () => () => {
      stopHomeNogaSplitDrag();
    },
    [stopHomeNogaSplitDrag],
  );

  const activeFriendsPanelSearchPlaceholder = React.useMemo(() => {
    if (activeFriendsPanelTab === "requests") {
      return "Search non-friend users";
    }

    if (activeFriendsPanelTab === "blocked") {
      return "Search blocked users";
    }

    return "Search friends";
  }, [activeFriendsPanelTab]);

  const activeFriendsPanelSearchResults = React.useMemo(() => {
    const normalizedQuery = String(friendSearchQuery || "").trim();
    if (!normalizedQuery) {
      return [];
    }

    const modeMatchesActiveTab = (candidate) => {
      const candidateMode = normalizeFriendUserMode(candidate?.userMode);

      if (activeFriendsPanelTab === "requests") {
        return candidateMode !== "friend";
      }

      if (activeFriendsPanelTab === "blocked") {
        return candidateMode === "blocked";
      }

      return candidateMode === "friend";
    };

    return friendSearchResults.filter(modeMatchesActiveTab);
  }, [activeFriendsPanelTab, friendSearchQuery, friendSearchResults]);

  const activeFriendsPanelSearchEmptyMessage = React.useMemo(() => {
    if (activeFriendsPanelTab === "requests") {
      return "No non-friend users found.";
    }

    if (activeFriendsPanelTab === "blocked") {
      return "No blocked users found.";
    }

    return "No friends found.";
  }, [activeFriendsPanelTab]);

  const getFriendPresenceState = React.useCallback(
    (friend) => {
      const presenceState = resolveFriendPresenceState(friend);

      return {
        iconClass: presenceState.iconClass,
        label: presenceState.label,
        modifierClass:
          presenceState.mode === "in_my_chat"
            ? "Home_Noga_socialFriendStatus--chatting"
            : presenceState.mode === "typing"
              ? "Home_Noga_socialFriendStatus--typing"
              : presenceState.mode === "busy"
                ? "Home_Noga_socialFriendStatus--busy"
                : presenceState.mode === "studying"
                  ? "Home_Noga_socialFriendStatus--studying"
                  : presenceState.mode === "online"
                    ? "Home_Noga_socialFriendStatus--online"
                    : "Home_Noga_socialFriendStatus--offline",
      };
    },
    [],
  );

  const getSearchCandidateUserModeMeta = React.useCallback((candidate) => {
    const userMode = String(candidate?.userMode || "stranger")
      .trim()
      .toLowerCase();

    if (userMode === "requestreceived") {
      return {
        iconClass: "fa-user-clock",
        label: "Request received",
        modifierClass: "Home_Noga_socialFriendStatus--online",
      };
    }

    if (userMode === "requestsent") {
      return {
        iconClass: "fa-paper-plane",
        label: "Request sent",
        modifierClass: "Home_Noga_socialFriendStatus--connected",
      };
    }

    if (userMode === "friend") {
      return {
        iconClass: "fa-user-check",
        label: "Friend",
        modifierClass: "Home_Noga_socialFriendStatus--connected",
      };
    }

    return null;
  }, []);

  const handleToggleInlineFriendChat = React.useCallback(
    (friend) => {
      if (!friend?.chatId) {
        return;
      }

      if (openChatFriendId === friend.chatId) {
        setInlineCallActionsTarget(null);
        setOpenChatFriendId(null);
        props.closeActiveChat?.();
        return;
      }

      setInlineCallActionsTarget(null);
      setOpenChatFriendId(friend.chatId);
      props.selectFriendChat?.(friend.chatId);
    },
    [openChatFriendId, props],
  );

  const handleSelectFriendsMiniTab = React.useCallback(
    (nextTab) => {
      // If leaving 'friends' tab, clear search query/results
      if (activeFriendsMiniTab === "friends" && nextTab !== "friends") {
        setFriendSearchQuery("");
        setFriendSearchResults([]);
      }
      setActiveFriendsMiniTab(nextTab);

      if (openChatFriendId) {
        setInlineCallActionsTarget(null);
        setOpenChatFriendId(null);
        props.closeActiveChat?.();
      }
    },
    [activeFriendsMiniTab, openChatFriendId, props],
  );

  const renderFriendListItem = React.useCallback(
    (friend) => {
      const normalizedFriendChatId = String(friend?.chatId || "").trim();
      const normalizedOpenChatFriendId = String(openChatFriendId || "").trim();
      const normalizedActiveChatFriendId = String(
        props.state?.activeChatFriendId || "",
      ).trim();
      const isFriendChatOpen =
        normalizedFriendChatId &&
        (normalizedOpenChatFriendId === normalizedFriendChatId ||
          normalizedActiveChatFriendId === normalizedFriendChatId);
      const unreadChatCount = isFriendChatOpen
        ? 0
        : unreadChatCountsByFriendId[friend.chatId] || 0;
      const globalPresenceState = getFriendPresenceState(friend);
      const liveLocalStatus =
        props.state?.friendLocalStatusById &&
        typeof props.state.friendLocalStatusById === "object"
          ? props.state.friendLocalStatusById[normalizedFriendChatId] || null
          : null;
      const chatPanelLocalStatusValue = String(
        liveLocalStatus?.value || friend?.localStatus?.value || "",
      )
        .trim()
        .toLowerCase();
      const hasTextInTextarea = Boolean(
        liveLocalStatus?.hasTextInTextarea ?? friend?.localStatus?.hasTextInTextarea,
      );
      const localPresenceState =
        chatPanelLocalStatusValue === "typing"
          ? {
              text: "Busy, but he's here and typing.",
            }
          : chatPanelLocalStatusValue === "in my chat"
            ? {
                text: hasTextInTextarea
                  ? "Busy, but he's here and thinking."
                  : "Busy, but he's here and listening to me.",
              }
            : null;
      const incomingCall =
        props.state?.global_call_session?.incomingCall || null;
      const isIncomingCallForFriend =
        String(incomingCall?.fromUserId || "").trim() ===
        String(friend.chatId || "").trim();
      const incomingCallMode =
        incomingCall?.callType === "video" ? "video" : "voice";
      const isVoiceIncomingCallForFriend =
        isIncomingCallForFriend && incomingCallMode === "voice";

      return (
        <li
          key={friend.id}
          className={`Home_Noga_socialFriendItem fc${isFriendChatOpen ? " Home_Noga_socialFriendItem--chatOpen Home_Noga_socialFriendItem--activeView" : ""}`}
        >
          <button
            type="button"
            className="Home_Noga_socialFriendSummary"
            onClick={() => handleToggleInlineFriendChat(friend)}
            aria-expanded={isFriendChatOpen}
            aria-controls={
              friend.chatId
                ? `Home_Noga_friendChat_${friend.chatId}`
                : undefined
            }
            disabled={!friend.chatId}
          >
            <div className="Home_Noga_socialFriendIdentity">
              <div className="Home_Noga_socialFriendAvatar">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={`${friend.displayName} avatar`}
                    className="Home_Noga_socialFriendAvatarImage"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      const fallbackIcon =
                        event.currentTarget.nextElementSibling;
                      if (fallbackIcon) {
                        fallbackIcon.style.display = "inline-flex";
                      }
                    }}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  style={{ display: friend.avatarUrl ? "none" : "inline-flex" }}
                >
                  <i className="fas fa-user"></i>
                </span>
              </div>
              <div className="Home_Noga_socialFriendCopy">
                <span className="Home_Noga_socialFriendName">
                  {friend.displayName}
                </span>
                <span className="Home_Noga_socialFriendUsername">
                  {friend.username || "Phenomed user"}
                </span>
                <span className="Home_Noga_socialFriendStatusLine">
                  <span
                    className={`Home_Noga_socialFriendStatusText${
                      isFriendChatOpen && localPresenceState
                        ? " Home_Noga_socialFriendStatusText--busy"
                        : globalPresenceState?.mode
                          ? ` Home_Noga_socialFriendStatusText--${globalPresenceState.mode}`
                          : ""
                    }`}
                  >
                    {isFriendChatOpen && localPresenceState
                      ? localPresenceState.text
                      : globalPresenceState?.label || "Offline"}
                  </span>
                </span>
              </div>
            </div>
            <div className="Home_Noga_socialFriendPresence">
              <span
                className={`Home_Noga_socialFriendUnreadBadge${unreadChatCount > 0 ? "" : " Home_Noga_socialFriendUnreadBadge--empty"}`}
              >
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            </div>
          </button>
          {isFriendChatOpen ? (
            <div
              className="Home_Noga_socialFriendInlineCallActionsSlot"
              ref={handleInlineCallActionsTargetRef}
            />
          ) : null}
          {isVoiceIncomingCallForFriend ? (
            <div className="Home_Noga_socialFriendIncomingCall Home_Noga_socialFriendIncomingCall--minibar">
              <div className="Home_Noga_socialFriendIncomingCallCopy">
                <span>
                  {friend.displayName || "Your friend"} is calling you.
                </span>
              </div>
              <div className="Home_Noga_socialFriendIncomingCallActions">
                <button
                  type="button"
                  className="Home_Noga_socialFriendCallButton Home_Noga_socialFriendCallButton--accept"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.state?.global_call_session?.acceptIncomingCall?.();
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="Home_Noga_socialFriendCallButton Home_Noga_socialFriendCallButton--decline"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.state?.global_call_session?.declineIncomingCall?.();
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ) : null}
        </li>
      );
    },
    [
      openChatFriendId,
      props.closeActiveChat,
      props.markMessagesRead,
      props.requestGlobalCall,
      props.sendToThemMessage,
      props.state,
      props.updateMyTypingPresence,
      unreadChatCountsByFriendId,
      handleToggleInlineFriendChat,
    ],
  );

  const activeFriendChatState = React.useMemo(() => {
    if (!activeFriendCard?.chatId) {
      return props.state;
    }
    return {
      ...props.state,
      friendID_selected: activeFriendCard.chatId,
      activeChatFriendId: activeFriendCard.chatId,
      activeChatFriendName:
        activeFriendCard.displayName || props.state?.activeChatFriendName || "Chat",
      activeChatFriendAvatarUrl: activeFriendCard.avatarUrl || "",
      isChatting: true,
    };
  }, [activeFriendCard, props.state]);

  const renderFriendRequestListItem = React.useCallback(
    (notification) => {
      const requestId = String(
        notification?._id || notification?.id || "",
      ).trim();
      const requesterId = String(notification?.id || "").trim();
      const requesterFirstName = String(
        notification?.info?.firstname || notification?.firstname || "",
      ).trim();
      const requesterLastName = String(
        notification?.info?.lastname || notification?.lastname || "",
      ).trim();
      const requesterUsername = String(
        notification?.info?.username || notification?.username || "",
      ).trim();
      const senderFromMessage = String(notification?.message || "")
        .replace(/\s*sent\s+you\s+a\s+friend\s+request\s*$/i, "")
        .trim();
      const requestLabel =
        `${requesterFirstName} ${requesterLastName}`.trim() ||
        senderFromMessage ||
        requesterUsername ||
        "Friend request";

      return (
        <li
          key={requestId || requesterId}
          className="Home_Noga_socialFriendItem Home_Noga_socialFriendItem--request"
        >
          <div className="Home_Noga_socialFriendSummary">
            <div className="Home_Noga_socialFriendIdentity">
              <div className="Home_Noga_socialFriendAvatar Home_Noga_socialFriendAvatar--request">
                <i className="fas fa-user-clock" aria-hidden="true"></i>
              </div>
              <div className="Home_Noga_socialFriendCopy">
                <span className="Home_Noga_socialFriendName">
                  {requestLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="Home_Noga_socialRequestActions">
            <button
              type="button"
              className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--accept"
              onClick={() =>
                requesterId && props.acceptFriend?.(`accept_icon${requesterId}`)
              }
              disabled={!requesterId}
              aria-label="Accept friend request"
              title="Accept friend request"
            >
              <i className="fas fa-user-plus"></i>
            </button>
            <button
              type="button"
              className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
              onClick={() =>
                requestId && props.dismissFriendRequest?.(requestId)
              }
              disabled={!requestId}
              aria-label="Dismiss friend request"
              title="Dismiss friend request"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </li>
      );
    },
    [props],
  );

  const sendFriendRequestToUser = React.useCallback(
    (candidate) => {
      const username = String(candidate?.username || "")
        .trim()
        .toLowerCase();
      if (!username || !props.state?.token || !props.state?.my_id) {
        return;
      }

      const senderDisplayName = String(
        `${props.state?.firstname || ""} ${props.state?.lastname || ""}`,
      ).trim();
      const senderLabel =
        senderDisplayName ||
        String(props.state?.username || "").trim() ||
        "A user";

      setSendingFriendRequestUsername(username);
      fetch(apiUrl(`/api/user/addFriend/${encodeURIComponent(username)}/`), {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: props.state.my_id,
          message: `${senderLabel} sent you a friend request`,
        }),
      })
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(new Error("send_failed")),
        )
        .then(() => {
          setFriendSearchResults((currentResults) =>
            currentResults.map((entry) =>
              String(entry?.username || "")
                .trim()
                .toLowerCase() === username
                ? { ...entry, userMode: "requestsent" }
                : entry,
            ),
          );
          setFriendSearchFeedback("Friend request sent.");
          props.updateUserInfo?.();
          props.serverReply?.("Friend request sent!");
        })
        .catch(() => {
          setFriendSearchResults((currentResults) =>
            currentResults.length === 0 ? currentResults : [],
          );
          setFriendSearchFeedback("Unable to send friend request.");
          props.serverReply?.("Unable to send friend request.");
        })
        .finally(() => {
          setSendingFriendRequestUsername("");
        });
    },
    [
      props.serverReply,
      props.state?.firstname,
      props.state?.lastname,
      props.state?.my_id,
      props.state?.token,
      props.state?.username,
      props.updateUserInfo,
    ],
  );

  const handleAcceptSearchCandidate = React.useCallback(
    (candidateId) => {
      if (!candidateId) {
        return;
      }

      Promise.resolve(props.acceptFriend?.(`accept_icon${candidateId}`)).then(
        (didAccept) => {
          if (!didAccept) {
            return;
          }

          setFriendSearchResults((currentResults) =>
            currentResults.map((entry) =>
              String(entry?.id || "").trim() === candidateId
                ? { ...entry, userMode: "friend" }
                : entry,
            ),
          );
        },
      );
    },
    [props],
  );

  const handleRemoveSearchCandidate = React.useCallback(
    (candidateId) => {
      if (!candidateId) {
        return;
      }

      Promise.resolve(props.removeFriend?.(candidateId)).then((didRemove) => {
        if (!didRemove) {
          return;
        }

        setFriendSearchResults((currentResults) =>
          currentResults.map((entry) =>
            String(entry?.id || "").trim() === candidateId
              ? { ...entry, userMode: "stranger" }
              : entry,
          ),
        );
      });
    },
    [props],
  );

  const handleUnblockSearchCandidate = React.useCallback(
    (candidateId) => {
      if (!candidateId) {
        return;
      }

      Promise.resolve(props.unblockFriend?.(candidateId)).then((didUnblock) => {
        if (!didUnblock) {
          return;
        }

        setFriendSearchResults((currentResults) =>
          currentResults.map((entry) =>
            String(entry?.id || "").trim() === candidateId
              ? { ...entry, userMode: "stranger" }
              : entry,
          ),
        );
      });
    },
    [props],
  );

  const renderSearchedUserListItem = React.useCallback(
    (candidate) => {
      const isSending = sendingFriendRequestUsername === candidate.username;
      const candidateUserModeMeta = getSearchCandidateUserModeMeta(candidate);
      const candidateId = String(candidate?.id || "").trim();
      const candidateMode = normalizeFriendUserMode(
        deriveSearchUserMode(candidate),
      );
      const canSendRequest = candidateMode === "stranger";
      const canAcceptRequest = candidateMode === "requestreceived";
      const canCancelRequest = candidateMode === "requestsent";
      const canUnfriend = candidateMode === "friend";
      const canUnblock = candidateMode === "blocked";
      return (
        <li key={candidate.id} className="Home_Noga_socialFriendItem">
          <div className="Home_Noga_socialFriendSummary">
            <div className="Home_Noga_socialFriendIdentity">
              <div className="Home_Noga_socialFriendAvatar">
                {candidate.avatarUrl ? (
                  <img
                    src={candidate.avatarUrl}
                    alt={`${candidate.displayName} avatar`}
                    className="Home_Noga_socialFriendAvatarImage"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      const fallbackIcon =
                        event.currentTarget.nextElementSibling;
                      if (fallbackIcon) {
                        fallbackIcon.style.display = "inline-flex";
                      }
                    }}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  style={{
                    display: candidate.avatarUrl ? "none" : "inline-flex",
                  }}
                >
                  <i className="fas fa-user"></i>
                </span>
              </div>
              <div className="Home_Noga_socialFriendCopy">
                <span className="Home_Noga_socialFriendName">
                  {candidate.displayName}
                </span>
                <span className="Home_Noga_socialFriendUsername">
                  {candidate.username || "Phenomed user"}
                </span>
              </div>
            </div>
            {candidateUserModeMeta &&
            !isSending &&
            !canAcceptRequest &&
            !canCancelRequest ? (
              <div className="Home_Noga_socialFriendPresence">
                <span
                  className="Home_Noga_socialFriendChatIcon"
                  aria-hidden="true"
                >
                  <i className="fas fa-comments"></i>
                </span>
                <span
                  className={`Home_Noga_socialFriendStatus ${candidateUserModeMeta.modifierClass}`}
                >
                  <i className={`fas ${candidateUserModeMeta.iconClass}`}></i>
                  <span>{candidateUserModeMeta.label}</span>
                </span>
              </div>
            ) : null}
            <div className="Home_Noga_socialRequestActions">
              {canSendRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--accept"
                  onClick={() => sendFriendRequestToUser(candidate)}
                  disabled={isSending}
                  aria-label="Send friend request"
                  title="Send friend request"
                >
                  <i className="fas fa-user-plus"></i>
                </button>
              ) : null}
              {canAcceptRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--accept"
                  onClick={() => handleAcceptSearchCandidate(candidateId)}
                  disabled={!candidateId}
                  aria-label="Accept friend request"
                  title="Accept friend request"
                >
                  <i className="fas fa-user-check"></i>
                </button>
              ) : null}
              {canCancelRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => props.cancelSentFriendRequest?.(candidateId)}
                  disabled={!candidateId}
                  aria-label="Cancel friend request"
                  title="Cancel friend request"
                >
                  <i className="fas fa-times"></i>
                </button>
              ) : null}
              {canUnfriend ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => handleRemoveSearchCandidate(candidateId)}
                  disabled={!candidateId}
                  aria-label="Unfriend"
                  title="Unfriend"
                >
                  <i className="fas fa-user-minus"></i>
                </button>
              ) : null}
              {canUnblock ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => handleUnblockSearchCandidate(candidateId)}
                  disabled={!candidateId}
                  aria-label="Unblock user"
                  title="Unblock user"
                >
                  <i className="fas fa-user-slash"></i>
                </button>
              ) : null}
            </div>
          </div>
        </li>
      );
    },
    [
      deriveSearchUserMode,
      getSearchCandidateUserModeMeta,
      handleAcceptSearchCandidate,
      handleRemoveSearchCandidate,
      handleUnblockSearchCandidate,
      props,
      sendFriendRequestToUser,
      sendingFriendRequestUsername,
    ],
  );

  const renderConnectionSearchPanel = React.useCallback(
    ({ value, onChange, placeholder, ariaLabel, controls = null }) => (
      <div className="Home_Noga_socialDirectoryHeader">
        <div className="Home_Noga_socialDirectorySearch">
          <i className="fas fa-search" aria-hidden="true"></i>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={placeholder}
            aria-label={ariaLabel}
          />
        </div>
        {controls}
      </div>
    ),
    [],
  );

  const renderFriendSearchPanel = React.useCallback(
    () =>
      renderConnectionSearchPanel({
        value: friendSearchQuery,
        onChange: setFriendSearchQuery,
        placeholder: activeFriendsPanelSearchPlaceholder,
        ariaLabel: activeFriendsPanelSearchPlaceholder,
        controls: null,
      }),
    [
      activeFriendsPanelSearchPlaceholder,
      friendSearchQuery,
      renderConnectionSearchPanel,
    ],
  );

  const renderPageSearchPanel = React.useCallback(
    () =>
      renderConnectionSearchPanel({
        value: pageSearchQuery,
        onChange: setPageSearchQuery,
        placeholder: "Search pages",
        ariaLabel: "Search pages",
      }),
    [pageSearchQuery, renderConnectionSearchPanel],
  );

  const renderGroupSearchPanel = React.useCallback(
    () =>
      renderConnectionSearchPanel({
        value: groupSearchQuery,
        onChange: setGroupSearchQuery,
        placeholder: "Search groups",
        ariaLabel: "Search groups",
      }),
    [groupSearchQuery, renderConnectionSearchPanel],
  );

  const renderBlockedUserListItem = React.useCallback(
    (user) => {
      const userId = String(user?.id || "").trim();
      const username = String(user?.username || "").trim();
      const userMode = normalizeFriendUserMode(user?.userMode);
      const canAcceptRequest = userMode === "requestreceived";
      const isSentRequest = userMode === "requestsent";
      const showFriendPresence = userMode === "friend";
      const presenceState = showFriendPresence
        ? resolveFriendPresenceState(user)
        : null;
      const friendPresenceState = presenceState
        ? {
            modifierClass:
              presenceState.mode === "in_my_chat"
                ? "Home_Noga_socialFriendStatus--chatting"
                : presenceState.mode === "typing"
                    ? "Home_Noga_socialFriendStatus--typing"
                    : presenceState.mode === "busy"
                    ? "Home_Noga_socialFriendStatus--busy"
                    : presenceState.mode === "studying"
                      ? "Home_Noga_socialFriendStatus--studying"
                      : presenceState.mode === "online"
                        ? "Home_Noga_socialFriendStatus--online"
                        : "Home_Noga_socialFriendStatus--offline",
            iconClass: presenceState.iconClass,
            label: presenceState.label,
          }
        : null;
      const normalizedUserChatId = String(
        user?.chatId || getFriendChatPresenceKey(user),
      ).trim();
      const unreadChatCount = normalizedUserChatId
        ? unreadChatCountsByFriendId[normalizedUserChatId] || 0
        : 0;

      return (
        <li
          key={user.id}
          className="Home_Noga_socialFriendItem"
          onClick={() => {
            if (username) {
              history.push(`/phenomed/${encodeURIComponent(username)}`, {
                profileTheme: {
                  variant: "noga",
                  isDark: isHomeNogaDarkTheme,
                  backPath:
                    String(props?.homeBasePath || "").trim() ||
                    "/phenomed/home",
                },
              });
            }
          }}
        >
          <div className="Home_Noga_socialFriendSummary">
            <div className="Home_Noga_socialFriendIdentity">
              <div className="Home_Noga_socialFriendAvatar">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.displayName} avatar`}
                    className="Home_Noga_socialFriendAvatarImage"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                      const fallbackIcon =
                        event.currentTarget.nextElementSibling;
                      if (fallbackIcon) {
                        fallbackIcon.style.display = "inline-flex";
                      }
                    }}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  style={{ display: user.avatarUrl ? "none" : "inline-flex" }}
                >
                  <i className="fas fa-user"></i>
                </span>
              </div>
              <div className="Home_Noga_socialFriendCopy">
                <span className="Home_Noga_socialFriendName">
                  {user.displayName}
                </span>
                <span className="Home_Noga_socialFriendUsername">
                  {user.username || "Blocked user"}
                </span>
              </div>
            </div>
            {friendPresenceState && !canAcceptRequest && !isSentRequest ? (
              <div className="Home_Noga_socialFriendPresence">
                <span
                  className={`Home_Noga_socialFriendUnreadBadge${unreadChatCount > 0 ? "" : " Home_Noga_socialFriendUnreadBadge--empty"}`}
                >
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              </div>
            ) : null}
            {canAcceptRequest || isSentRequest ? (
              <div className="Home_Noga_socialRequestActions">
                {canAcceptRequest ? (
                  <>
                    <button
                      type="button"
                      className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--accept"
                      onClick={(event) => {
                        event.stopPropagation();
                        userId && props.acceptFriend?.(`accept_icon${userId}`);
                      }}
                      disabled={!userId}
                      aria-label="Accept friend request"
                      title="Accept friend request"
                    >
                      <i className="fas fa-user-check"></i>
                    </button>
                    <button
                      type="button"
                      className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                      onClick={(event) => {
                        event.stopPropagation();
                        userId && props.dismissFriendRequest?.(userId);
                      }}
                      disabled={!userId}
                      aria-label="Dismiss friend request"
                      title="Dismiss friend request"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </>
                ) : null}
                {isSentRequest ? (
                  <button
                    type="button"
                    className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                    onClick={(event) => {
                      event.stopPropagation();
                      userId && props.cancelSentFriendRequest?.(userId);
                    }}
                    disabled={!userId}
                    aria-label="Cancel friend request"
                    title="Cancel friend request"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </li>
      );
    },
    [history, props, unreadChatCountsByFriendId],
  );

  const openGalleryUploadPicker = () => {
    galleryUploadInputRef.current?.click();
  };

  const clampProfilePictureViewport = React.useCallback((nextViewport) => {
    const rawScale = Number(nextViewport?.scale);
    const rawOffsetX = Number(nextViewport?.offsetX);
    const rawOffsetY = Number(nextViewport?.offsetY);
    const scale = Number.isFinite(rawScale)
      ? Math.min(Math.max(rawScale, 1), 4)
      : 1;
    const offsetX = Number.isFinite(rawOffsetX) ? rawOffsetX : 0;
    const offsetY = Number.isFinite(rawOffsetY) ? rawOffsetY : 0;

    const wrapperBounds =
      profilePictureWrapperRef.current?.getBoundingClientRect();

    if (!wrapperBounds?.width || !wrapperBounds?.height || scale <= 1) {
      return {
        scale,
        offsetX: scale <= 1 ? 0 : offsetX,
        offsetY: scale <= 1 ? 0 : offsetY,
      };
    }

    // Keep standard edge coverage only so panning feels free while zoomed.
    const maxOffsetX = ((scale - 1) * wrapperBounds.width) / 2;
    const maxOffsetY = ((scale - 1) * wrapperBounds.height) / 2;

    return {
      scale,
      offsetX: Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX),
      offsetY: Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY),
    };
  }, []);

  const getTouchDistance = (touchA, touchB) =>
    Math.hypot(
      touchA.clientX - touchB.clientX,
      touchA.clientY - touchB.clientY,
    );

  const handleProfilePictureTouchStart = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const touches = event.touches;

    if (touches.length >= 2) {
      profilePictureGestureRef.current = {
        ...profilePictureGestureRef.current,
        mode: "pinch",
        startDistance: getTouchDistance(touches[0], touches[1]),
        startScale: profilePictureViewport.scale,
      };
      return;
    }

    if (touches.length === 1) {
      profilePictureGestureRef.current = {
        ...profilePictureGestureRef.current,
        mode: "pan",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        startOffsetX: profilePictureViewport.offsetX,
        startOffsetY: profilePictureViewport.offsetY,
      };
    }
  };

  const handleProfilePictureTouchMove = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const gesture = profilePictureGestureRef.current;

    if (gesture.mode === "pinch" && event.touches.length >= 2) {
      event.preventDefault();
      const nextDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const ratio =
        gesture.startDistance > 0 ? nextDistance / gesture.startDistance : 1;
      const nextScale = Math.min(Math.max(gesture.startScale * ratio, 1), 4);

      setProfilePictureViewport((currentViewport) =>
        clampProfilePictureViewport({
          ...currentViewport,
          scale: nextScale,
        }),
      );
      return;
    }

    if (gesture.mode === "pan" && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - gesture.startX;
      const deltaY = event.touches[0].clientY - gesture.startY;

      setProfilePictureViewport((currentViewport) =>
        clampProfilePictureViewport({
          ...currentViewport,
          offsetX: gesture.startOffsetX + deltaX,
          offsetY: gesture.startOffsetY + deltaY,
        }),
      );
    }
  };

  const handleProfilePictureTouchEnd = (event) => {
    if (event.touches.length >= 2) {
      profilePictureGestureRef.current.mode = "pinch";
      profilePictureGestureRef.current.startDistance = getTouchDistance(
        event.touches[0],
        event.touches[1],
      );
      profilePictureGestureRef.current.startScale =
        profilePictureViewport.scale;
      return;
    }

    if (event.touches.length === 1) {
      profilePictureGestureRef.current.mode = "pan";
      profilePictureGestureRef.current.startX = event.touches[0].clientX;
      profilePictureGestureRef.current.startY = event.touches[0].clientY;
      profilePictureGestureRef.current.startOffsetX =
        profilePictureViewport.offsetX;
      profilePictureGestureRef.current.startOffsetY =
        profilePictureViewport.offsetY;
      return;
    }

    profilePictureGestureRef.current.mode = "idle";
  };

  const handleProfilePicturePointerDown = (event) => {
    if (!profilePictureSrc || event.pointerType === "touch") {
      return;
    }

    profilePictureGestureRef.current = {
      ...profilePictureGestureRef.current,
      mode: "pointer-pan",
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: profilePictureViewport.offsetX,
      startOffsetY: profilePictureViewport.offsetY,
    };

    setIsProfilePictureDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleProfilePicturePointerMove = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    const gesture = profilePictureGestureRef.current;
    if (gesture.mode !== "pointer-pan") {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    setProfilePictureViewport((currentViewport) =>
      clampProfilePictureViewport({
        ...currentViewport,
        offsetX: gesture.startOffsetX + deltaX,
        offsetY: gesture.startOffsetY + deltaY,
      }),
    );
  };

  const handleProfilePicturePointerUp = (event) => {
    if (profilePictureGestureRef.current.mode === "pointer-pan") {
      profilePictureGestureRef.current.mode = "idle";
      setIsProfilePictureDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleProfilePictureWheel = (event) => {
    if (!profilePictureSrc) {
      return;
    }

    event.preventDefault();
    const zoomStep = event.deltaY < 0 ? 0.08 : -0.08;

    setProfilePictureViewport((currentViewport) =>
      clampProfilePictureViewport({
        ...currentViewport,
        scale: Math.min(Math.max(currentViewport.scale + zoomStep, 1), 4),
      }),
    );
  };

  const resetProfilePictureViewport = () => {
    setProfilePictureViewport(
      clampProfilePictureViewport({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }),
    );
  };

  const sendCloudinaryReply = (message) => {
    const nextMessage = String(message || "").trim();
    if (!nextMessage) {
      return;
    }

    props.serverReply?.(nextMessage);
  };

  const syncUserMediaState = (payload = {}, options = {}) => {
    const keepCurrentProfilePicture = Boolean(
      options?.keepCurrentProfilePicture,
    );

    props.setUserMediaInfo?.({
      profilePicture: keepCurrentProfilePicture
        ? String(props.state?.profilePicture || "").trim()
        : String(payload?.profilePicture?.url || "").trim(),
      imageGallery: Array.isArray(payload?.imageGallery)
        ? payload.imageGallery
        : [],
    });
  };

  const defaultPatternWallpaperUrl = React.useMemo(() => {
    if (!Array.isArray(imageGallery)) {
      return "";
    }

    const firstPatternImage = imageGallery.find((image) => {
      if (isVideoGalleryItem(image)) {
        return false;
      }

      return (
        String(image?.resourceType || image?.resource_type || "")
          .trim()
          .toLowerCase() === "pattern"
      );
    });

    return String(firstPatternImage?.url || "").trim();
  }, [imageGallery]);

  const currentBioWallpaperUrl = String(
    props.state?.bioWrapperWallpaper || defaultPatternWallpaperUrl,
  ).trim();
  const currentBioWallpaperSize = Math.min(
    Math.max(
      Number(props.state?.bioWrapperWallpaperSize) ||
        DEFAULT_HOME_BIO_WALLPAPER_SIZE,
      180,
    ),
    1400,
  );
  const currentBioWallpaperRepeat =
    props.state?.bioWrapperWallpaperRepeat !== undefined
      ? Boolean(props.state.bioWrapperWallpaperRepeat)
      : true;

  const updateBioWallpaperState = React.useCallback(
    (nextWallpaper = {}) => {
      props.setUserMediaInfo?.({
        profilePicture: String(props.state?.profilePicture || "").trim(),
        profilePictureViewport: props.state?.profilePictureViewport || {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        imageGallery: Array.isArray(props.state?.imageGallery)
          ? props.state.imageGallery
          : [],
        bioWrapperWallpaper:
          nextWallpaper.bioWrapperWallpaper !== undefined
            ? nextWallpaper.bioWrapperWallpaper
            : currentBioWallpaperUrl,
        bioWrapperWallpaperSize:
          nextWallpaper.bioWrapperWallpaperSize !== undefined
            ? nextWallpaper.bioWrapperWallpaperSize
            : currentBioWallpaperSize,
        bioWrapperWallpaperRepeat:
          nextWallpaper.bioWrapperWallpaperRepeat !== undefined
            ? nextWallpaper.bioWrapperWallpaperRepeat
            : currentBioWallpaperRepeat,
      });
    },
    [
      currentBioWallpaperRepeat,
      currentBioWallpaperSize,
      currentBioWallpaperUrl,
      props.setUserMediaInfo,
      props.state?.imageGallery,
      props.state?.profilePicture,
      props.state?.profilePictureViewport,
    ],
  );

  const handleSetGalleryImageAsBioWallpaper = React.useCallback(
    (image) => {
      if (!image || isVideoGalleryItem(image)) {
        return;
      }

      updateBioWallpaperState({
        bioWrapperWallpaper: String(image?.url || "").trim(),
      });
      setActiveGalleryActionsPublicId("");
      setIsBioWallpaperControlsOpen(true);
    },
    [updateBioWallpaperState],
  );

  const resetBioWallpaperToDefault = React.useCallback(() => {
    updateBioWallpaperState({
      bioWrapperWallpaper: defaultPatternWallpaperUrl,
      bioWrapperWallpaperSize: DEFAULT_HOME_BIO_WALLPAPER_SIZE,
      bioWrapperWallpaperRepeat: true,
    });
  }, [defaultPatternWallpaperUrl, updateBioWallpaperState]);

  const clearBioWallpaper = React.useCallback(() => {
    updateBioWallpaperState({
      bioWrapperWallpaper: "",
    });
  }, [updateBioWallpaperState]);

  const loadImageGalleryOnMount = React.useCallback(async () => {
    if (!props.state?.token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/user/image-gallery"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load media gallery.");
      }

      props.setUserMediaInfo?.({
        profilePicture: String(payload?.profilePicture?.url || "").trim(),
        imageGallery: Array.isArray(payload?.imageGallery)
          ? payload.imageGallery
          : [],
      });
    } catch (error) {
      // Keep existing state if gallery hydration fails on mount.
    }
  }, [props.setUserMediaInfo, props.state?.token]);

  const openGalleryViewer = (publicId = "") => {
    const targetPublicId = String(publicId || "").trim();
    if (!imageOnlyGallery.length) {
      return;
    }

    const nextIndex = targetPublicId
      ? imageOnlyGallery.findIndex(
          (image) => image?.publicId === targetPublicId,
        )
      : imageOnlyGallery.findIndex((image) => image?.url === profilePictureSrc);

    setActiveGalleryImageIndex(nextIndex >= 0 ? nextIndex : 0);
    setIsImageViewerOpen(true);
    setActiveGalleryActionsPublicId("");
  };

  const openGalleryVideoPlayer = React.useCallback((video) => {
    if (!video || !String(video?.url || "").trim()) {
      return;
    }

    setActiveGalleryVideo(video);
    setIsVideoViewerOpen(true);
    setActiveGalleryActionsPublicId("");
  }, []);

  const toggleGalleryItemActions = (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId) {
      return;
    }

    setActiveGalleryActionsPublicId((currentPublicId) =>
      currentPublicId === nextPublicId ? "" : nextPublicId,
    );
  };

  const uploadGalleryImage = async (selectedFile, options = {}) => {
    if (!selectedFile || !props.state?.token) {
      return;
    }

    const maxImageSizeBytes = 8 * 1024 * 1024;
    const maxVideoSizeBytes = 100 * 1024 * 1024;
    const preCheckMimeType = String(selectedFile?.type || "").trim();
    const targetResourceType =
      String(
        options?.resourceType ||
          HOME_GALLERY_TAB_UPLOAD_CONFIG[galleryTab]?.resourceType ||
          "",
      ).trim() || "image";
    const isVideoFilePre = preCheckMimeType.toLowerCase().startsWith("video/");
    const expectsVideoUpload = targetResourceType === "video";

    if (expectsVideoUpload && !isVideoFilePre) {
      sendCloudinaryReply("Please choose a video file for the Videos tab.");
      return;
    }

    if (!expectsVideoUpload && isVideoFilePre) {
      sendCloudinaryReply("Please choose an image file for this gallery tab.");
      return;
    }

    // If video and >=100MB, send to backend for compression/upload
    if (isVideoFilePre && selectedFile.size >= maxVideoSizeBytes) {
      setIsImageGalleryUploading(true);
      try {
        const formData = new FormData();
        formData.append("video", selectedFile);
        // Use XMLHttpRequest for progress events
        const uploadResult = await new Promise((resolve, reject) => {
          const xhr = new window.XMLHttpRequest();
          xhr.open("POST", apiUrl("/api/user/videoUpload"));
          xhr.setRequestHeader("Authorization", `Bearer ${props.state.token}`);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              sendCloudinaryReply(`Uploading video: ${percent}%`);
            }
          };
          xhr.onload = () => {
            let result = {};
            try {
              result = JSON.parse(xhr.responseText);
            } catch {}
            if (xhr.status >= 200 && xhr.status < 300) {
              sendCloudinaryReply(
                result?.message || "Video uploaded and processed.",
              );
              resolve(result);
            } else {
              sendCloudinaryReply(result?.message || "Video upload failed.");
              reject(new Error(result?.message || "Video upload failed."));
            }
          };
          xhr.onerror = () => {
            sendCloudinaryReply("Video upload failed.");
            reject(new Error("Video upload failed."));
          };
          xhr.send(formData);
        });

        const galleryResponse = await fetch(apiUrl("/api/user/image-gallery"), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${props.state.token}`,
          },
        });
        const galleryPayload = await galleryResponse.json().catch(() => ({}));

        if (!galleryResponse.ok) {
          throw new Error(
            galleryPayload?.message ||
              uploadResult?.message ||
              "Unable to refresh media gallery.",
          );
        }

        syncUserMediaState(galleryPayload, {
          keepCurrentProfilePicture: true,
        });
      } catch (error) {
        // Error message already sent in onerror/onload
      } finally {
        setIsImageGalleryUploading(false);
      }
      return;
    }

    // Otherwise, use existing Cloudinary flow for photos and small videos
    const existingUploadTask = options?.uploadTask || null;
    const fileToUploadFinal = selectedFile;
    const fileName = String(
      existingUploadTask?.fileName ||
        fileToUploadFinal?.name ||
        "gallery-upload",
    ).trim();
    const mimeType = String(
      existingUploadTask?.mimeType || fileToUploadFinal?.type || "",
    ).trim();
    const isVideoFile = mimeType.toLowerCase().startsWith("video/");
    const resourceType =
      existingUploadTask?.resourceType ||
      targetResourceType ||
      (isVideoFile ? "video" : "image");
    const publicId =
      String(existingUploadTask?.publicId || "").trim() ||
      sanitizeGalleryFileName(fileName);
    const uploadTaskId =
      String(existingUploadTask?.id || "").trim() ||
      `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const uploadTask = existingUploadTask || {
      id: uploadTaskId,
      file: fileToUploadFinal,
      fileName,
      mimeType,
      resourceType,
      publicId,
      createdAt: new Date().toISOString(),
      fileSize: Number(fileToUploadFinal?.size) || 0,
      lastModified: Number(fileToUploadFinal?.lastModified) || 0,
    };

    setIsImageGalleryUploading(true);
    let triedCompression = false;
    let fileToUpload = selectedFile;
    let currentMimeType = mimeType;

    if (
      !isVideoFile &&
      canCompressImageUpload(fileToUpload) &&
      fileToUpload.size >= maxImageSizeBytes
    ) {
      try {
        sendCloudinaryReply(
          `Large image detected (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing before upload...`,
        );
        const compressedImage = await compressImageUpload(fileToUpload, {
          maxBytes: maxImageSizeBytes,
        });

        if (compressedImage !== fileToUpload) {
          fileToUpload = compressedImage;
          currentMimeType = String(
            compressedImage?.type || currentMimeType,
          ).trim();
          triedCompression = true;
          sendCloudinaryReply(
            `Compressed image size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Starting upload...`,
          );
        }
      } catch (compressionError) {
        sendCloudinaryReply(
          `Image compression skipped: ${compressionError?.message || "Unknown error."}`,
        );
      }
    }

    while (true) {
      try {
        const signatureResponse = await fetch(
          apiUrl("/api/user/image-gallery/signature"),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${props.state.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              publicId,
              resourceType,
            }),
          },
        );
        const signaturePayload = await signatureResponse
          .json()
          .catch(() => ({}));

        if (!signatureResponse.ok) {
          throw new Error(
            signaturePayload?.message || "Unable to prepare media upload.",
          );
        }

        const cloudinaryBody = new FormData();
        cloudinaryBody.append("file", fileToUpload);
        cloudinaryBody.append("api_key", signaturePayload.apiKey);
        cloudinaryBody.append("timestamp", String(signaturePayload.timestamp));
        cloudinaryBody.append("signature", signaturePayload.signature);
        cloudinaryBody.append("folder", signaturePayload.folder);
        cloudinaryBody.append("public_id", signaturePayload.publicId);

        const cloudinaryResponse = await fetch(signaturePayload.uploadUrl, {
          method: "POST",
          body: cloudinaryBody,
        });
        const cloudinaryPayload = await cloudinaryResponse
          .json()
          .catch(() => ({}));

        if (!cloudinaryResponse.ok) {
          // Check for 413/403 error and only try compression once
          const errorMsg =
            cloudinaryPayload?.error?.message || "Media upload failed.";
          const status = cloudinaryResponse.status;
          if (
            isVideoFile &&
            !triedCompression &&
            (status === 413 ||
              status === 403 ||
              /file too large|413|too large|exceeds|limit/i.test(errorMsg))
          ) {
            sendCloudinaryReply(
              `Video too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
            );
            try {
              fileToUpload = await compressVideo(fileToUpload);
              triedCompression = true;
              sendCloudinaryReply(
                `Compressed video size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
              );
              continue; // Retry upload with compressed video
            } catch (compressionError) {
              throw new Error(
                "Video compression failed: " +
                  (compressionError?.message || "Unknown error."),
              );
            }
          }
          if (
            !isVideoFile &&
            !triedCompression &&
            canCompressImageUpload(fileToUpload) &&
            (status === 413 ||
              status === 403 ||
              /file too large|413|too large|exceeds|limit/i.test(errorMsg))
          ) {
            sendCloudinaryReply(
              `Image too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
            );
            try {
              const compressedImage = await compressImageUpload(fileToUpload, {
                maxBytes: maxImageSizeBytes,
              });
              if (compressedImage === fileToUpload) {
                throw new Error("Compression did not reduce image size.");
              }
              fileToUpload = compressedImage;
              currentMimeType = String(
                compressedImage?.type || currentMimeType,
              ).trim();
              triedCompression = true;
              sendCloudinaryReply(
                `Compressed image size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
              );
              continue;
            } catch (compressionError) {
              throw new Error(
                "Image compression failed: " +
                  (compressionError?.message || "Unknown error."),
              );
            }
          }
          sendCloudinaryReply(
            `Upload failed with status ${status}: ${errorMsg}`,
          );
          throw new Error(errorMsg);
        }

        const saveResponse = await fetch(apiUrl("/api/user/image-gallery"), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: cloudinaryPayload.secure_url,
            publicId: cloudinaryPayload.public_id,
            assetId: cloudinaryPayload.asset_id,
            contentHash: cloudinaryPayload.etag,
            folder: cloudinaryPayload.folder,
            resourceType: cloudinaryPayload.resource_type || resourceType,
            mimeType: currentMimeType,
            width: cloudinaryPayload.width,
            height: cloudinaryPayload.height,
            format: cloudinaryPayload.format,
            bytes: cloudinaryPayload.bytes,
            duration: cloudinaryPayload.duration,
            visibility: "public",
            createdAt: new Date().toISOString(),
          }),
        });
        const savePayload = await saveResponse.json().catch(() => ({}));

        if (!saveResponse.ok) {
          throw new Error(
            savePayload?.message || "Unable to save uploaded media.",
          );
        }

        syncUserMediaState(savePayload, {
          keepCurrentProfilePicture: true,
        });
        sendCloudinaryReply(
          savePayload?.message || "Media saved to Cloudinary.",
        );
        break; // Success, exit loop
      } catch (error) {
        if (
          isVideoFile &&
          !triedCompression &&
          /413|file too large|too large|exceeds|limit/i.test(
            error?.message || "",
          )
        ) {
          sendCloudinaryReply(
            `Video too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
          );
          try {
            fileToUpload = await compressVideo(fileToUpload);
            triedCompression = true;
            sendCloudinaryReply(
              `Compressed video size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
            );
            continue; // Retry upload with compressed video
          } catch (compressionError) {
            sendCloudinaryReply(
              "Video compression failed: " +
                (compressionError?.message || "Unknown error."),
            );
            break;
          }
        } else if (
          !isVideoFile &&
          !triedCompression &&
          canCompressImageUpload(fileToUpload) &&
          /413|file too large|too large|exceeds|limit/i.test(
            error?.message || "",
          )
        ) {
          sendCloudinaryReply(
            `Image too large (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB), compressing and retrying upload...`,
          );
          try {
            const compressedImage = await compressImageUpload(fileToUpload, {
              maxBytes: maxImageSizeBytes,
            });
            if (compressedImage === fileToUpload) {
              throw new Error("Compression did not reduce image size.");
            }
            fileToUpload = compressedImage;
            currentMimeType = String(
              compressedImage?.type || currentMimeType,
            ).trim();
            triedCompression = true;
            sendCloudinaryReply(
              `Compressed image size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB. Retrying upload...`,
            );
            continue;
          } catch (compressionError) {
            sendCloudinaryReply(
              "Image compression failed: " +
                (compressionError?.message || "Unknown error."),
            );
            break;
          }
        } else {
          sendCloudinaryReply(
            error?.message ||
              "Cloudinary upload paused. It will retry after refresh.",
          );
          break;
        }
      } finally {
        setIsImageGalleryUploading(false);
      }
    }
  };

  const handleProfilePictureSelected = async (event) => {
    const selectedFile = event.target?.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    await uploadGalleryImage(selectedFile);
  };

  const handleDeleteGalleryImage = async (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId || !props.state?.token) {
      return;
    }

    setIsImageGalleryDeletingPublicId(nextPublicId);

    try {
      const response = await fetch(apiUrl("/api/user/image-gallery"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicId: nextPublicId,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete media.");
      }

      syncUserMediaState(payload);
      sendCloudinaryReply(payload?.message || "Media deleted from gallery.");
      if (isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
    } catch (error) {
      sendCloudinaryReply(
        error?.message || "Cloudinary delete failed. Please try again.",
      );
    } finally {
      setIsImageGalleryDeletingPublicId("");
    }
  };

  const handleSetGalleryImageAsProfilePicture = async (publicId) => {
    const nextPublicId = String(publicId || "").trim();

    if (!nextPublicId || !props.state?.token) {
      return;
    }

    setIsImageGallerySettingProfilePublicId(nextPublicId);

    try {
      const response = await fetch(
        apiUrl("/api/user/image-gallery/profile-picture"),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicId: nextPublicId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to set profile picture.");
      }

      syncUserMediaState(payload);
      setActiveGalleryActionsPublicId("");
      sendCloudinaryReply(payload?.message || "Profile picture updated.");
    } catch (error) {
      sendCloudinaryReply(error?.message || "Unable to set profile picture.");
    } finally {
      setIsImageGallerySettingProfilePublicId("");
    }
  };

  // Removed: handleClearPendingUploads (no longer needed)

  // Removed: resumePendingUploads effect (no longer resumes uploads after refresh)

  React.useEffect(() => {
    loadImageGalleryOnMount();
  }, [loadImageGalleryOnMount]);

  React.useEffect(() => {
    if (!imageOnlyGallery.length) {
      if (activeGalleryImageIndex !== 0) {
        setActiveGalleryImageIndex(0);
      }
      if (isImageViewerOpen) {
        setIsImageViewerOpen(false);
      }
      return;
    }

    if (activeGalleryImageIndex > imageOnlyGallery.length - 1) {
      setActiveGalleryImageIndex(imageOnlyGallery.length - 1);
    }
  }, [activeGalleryImageIndex, imageOnlyGallery.length, isImageViewerOpen]);

  React.useEffect(() => {
    if (!activeGalleryActionsPublicId) {
      return;
    }

    const hasActiveImage = imageGallery.some(
      (image) => String(image?.publicId || "") === activeGalleryActionsPublicId,
    );

    if (!hasActiveImage) {
      setActiveGalleryActionsPublicId("");
    }
  }, [activeGalleryActionsPublicId, imageGallery]);

  React.useEffect(() => {
    if (!activeGalleryActionsPublicId) {
      return;
    }

    const handleOutsideClick = (e) => {
      if (!e.target.closest(".Home_Noga_galleryThumbWrap")) {
        setActiveGalleryActionsPublicId("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [activeGalleryActionsPublicId]);

  React.useEffect(() => {
    if (!isVideoViewerOpen || !activeGalleryVideo) {
      return;
    }

    const activeVideoPublicId = String(
      activeGalleryVideo?.publicId || "",
    ).trim();
    const nextActiveVideo =
      imageGallery.find(
        (image) => String(image?.publicId || "").trim() === activeVideoPublicId,
      ) || null;

    if (!nextActiveVideo) {
      setIsVideoViewerOpen(false);
      setActiveGalleryVideo(null);
      return;
    }

    setActiveGalleryVideo(nextActiveVideo);
  }, [activeGalleryVideo, imageGallery, isVideoViewerOpen]);

  React.useEffect(() => {
    if (loginRecords.length === 0) {
      if (loginLogIndex !== 0) {
        setLoginLogIndex(0);
      }
      return;
    }

    if (loginLogIndex > loginRecords.length - 1) {
      setLoginLogIndex(loginRecords.length - 1);
    }
  }, [loginLogIndex, loginRecords.length]);

  React.useEffect(() => {
    if (visitLogEntries.length === 0) {
      if (visitLogIndex !== 0) {
        setVisitLogIndex(0);
      }
      return;
    }

    if (visitLogIndex > visitLogEntries.length - 1) {
      setVisitLogIndex(visitLogEntries.length - 1);
    }
  }, [visitLogEntries.length, visitLogIndex]);

  React.useEffect(() => {
    if (!shouldLoadVisitLog) {
      setVisitLogEntries([]);
      setVisitLogError("");
      setIsVisitLogLoading(false);
      return;
    }

    let isMounted = true;
    setIsVisitLogLoading(true);
    setVisitLogError("");

    fetch(apiUrl("/api/user/visit-log"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${props.state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load the visit log right now.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setVisitLogEntries(
          Array.isArray(payload?.visitLog) ? payload.visitLog : [],
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setVisitLogError(
          error?.message || "Unable to load the visit log right now.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsVisitLogLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoadVisitLog, props.state?.token, props.state?.visitLogRefreshToken]);

  React.useEffect(() => {
    if (!isVisitLogOwner) {
      return;
    }

    let isMounted = true;
    const hydrateFromStoredCourses = () => {
      try {
        const storedCourses = JSON.parse(
          window.localStorage.getItem(NAGHAM_COURSE_LIST_STORAGE_KEY) || "[]",
        );

        if (isMounted && Array.isArray(storedCourses)) {
          setNaghamCourseOptions(storedCourses);
        }
      } catch (error) {
        if (isMounted) {
          setNaghamCourseOptions([]);
        }
      }
    };

    hydrateFromStoredCourses();

    fetch(apiUrl("/api/user/profile/naghamtrkmani"), {
      method: "GET",
      headers: props.state?.token
        ? {
            Authorization: `Bearer ${props.state.token}`,
          }
        : undefined,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load Nagham courses.");
        }

        return payload;
      })
      .then((payload) => {
        const rawCourses =
          payload?.schoolPlanner?.courses ||
          payload?.user?.schoolPlanner?.courses ||
          payload?.profile?.schoolPlanner?.courses ||
          [];

        const normalizedCourses = Array.isArray(rawCourses)
          ? rawCourses
              .filter((course) => course?._id && course?.course_name)
              .map((course) => ({
                id: course._id,
                name: course.course_name,
              }))
          : [];

        if (!isMounted || normalizedCourses.length === 0) {
          return;
        }

        window.localStorage.setItem(
          NAGHAM_COURSE_LIST_STORAGE_KEY,
          JSON.stringify(normalizedCourses),
        );
        setNaghamCourseOptions(normalizedCourses);
      })
      .catch(() => {
        hydrateFromStoredCourses();
      });

    return () => {
      isMounted = false;
    };
  }, [isVisitLogOwner, props.state?.token]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
      schoolPlannerReducedMotion ? "true" : "false",
    );
  }, [schoolPlannerReducedMotion]);

  React.useEffect(() => {
    const stateViewport = props.state?.profilePictureViewport;
    if (!stateViewport || typeof stateViewport !== "object") {
      return;
    }

    const normalizedViewport = normalizeProfilePictureViewport(stateViewport);
    hasHydratedProfilePictureViewportRef.current = true;
    setProfilePictureViewport((currentViewport) => {
      if (
        currentViewport.scale === normalizedViewport.scale &&
        currentViewport.offsetX === normalizedViewport.offsetX &&
        currentViewport.offsetY === normalizedViewport.offsetY
      ) {
        return currentViewport;
      }

      return normalizedViewport;
    });
  }, [
    props.state?.profilePictureViewport?.scale,
    props.state?.profilePictureViewport?.offsetX,
    props.state?.profilePictureViewport?.offsetY,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PHENOMEDSOCIAL_CHAT_BG_STORAGE_KEY,
      String(phenomedSocialChatBackground || "").trim(),
    );
  }, [phenomedSocialChatBackground]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      HOME_PROFILE_PIC_VIEWPORT_STORAGE_KEY,
      JSON.stringify(profilePictureViewport),
    );
  }, [profilePictureViewport]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clampCurrentViewport = () => {
      setProfilePictureViewport((currentViewport) => {
        const nextViewport = clampProfilePictureViewport(currentViewport);

        if (
          nextViewport.scale === currentViewport.scale &&
          nextViewport.offsetX === currentViewport.offsetX &&
          nextViewport.offsetY === currentViewport.offsetY
        ) {
          return currentViewport;
        }

        return nextViewport;
      });
    };

    clampCurrentViewport();
    window.addEventListener("resize", clampCurrentViewport);

    return () => {
      window.removeEventListener("resize", clampCurrentViewport);
    };
  }, [clampProfilePictureViewport, profilePictureSrc]);

  const persistedProfilePictureViewport = React.useMemo(
    () =>
      normalizeProfilePictureViewport(
        props.state?.profilePictureViewport || {},
      ),
    [
      props.state?.profilePictureViewport?.scale,
      props.state?.profilePictureViewport?.offsetX,
      props.state?.profilePictureViewport?.offsetY,
    ],
  );

  const isProfilePictureViewportDirty =
    hasHydratedProfilePictureViewportRef.current &&
    profilePictureSrc &&
    (persistedProfilePictureViewport.scale !== profilePictureViewport.scale ||
      persistedProfilePictureViewport.offsetX !==
        profilePictureViewport.offsetX ||
      persistedProfilePictureViewport.offsetY !==
        profilePictureViewport.offsetY);

  const applyProfilePictureViewportChange = React.useCallback(async () => {
    if (
      !props.state?.token ||
      !profilePictureSrc ||
      !isProfilePictureViewportDirty ||
      isApplyingProfilePictureViewport
    ) {
      return;
    }

    setIsApplyingProfilePictureViewport(true);

    try {
      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePictureViewport,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save profile view.");
      }

      const nextViewport = normalizeProfilePictureViewport(
        payload?.media?.profilePictureViewport || profilePictureViewport,
      );

      props.setUserMediaInfo?.({
        profilePicture: String(props.state?.profilePicture || "").trim(),
        profilePictureViewport: nextViewport,
        imageGallery: Array.isArray(props.state?.imageGallery)
          ? props.state.imageGallery
          : [],
      });
      props.serverReply?.("Profile picture view updated.");
    } catch (error) {
      props.serverReply?.(
        error?.message || "Unable to save profile picture view.",
      );
    } finally {
      setIsApplyingProfilePictureViewport(false);
    }
  }, [
    isApplyingProfilePictureViewport,
    isProfilePictureViewportDirty,
    profilePictureSrc,
    profilePictureViewport,
    props.serverReply,
    props.setUserMediaInfo,
    props.state?.imageGallery,
    props.state?.profilePicture,
    props.state?.token,
  ]);

  React.useEffect(() => {
    if (!isVisitLogOwner) {
      return;
    }

    if (naghamCourseOptions.length === 0) {
      setSelectedNaghamCourseId("");
      setNaghamCourseLetterInput("");
      return;
    }

    const activeCourseId = naghamCourseOptions.some(
      (course) => course.id === selectedNaghamCourseId,
    )
      ? selectedNaghamCourseId
      : naghamCourseOptions[0].id;

    if (activeCourseId !== selectedNaghamCourseId) {
      setSelectedNaghamCourseId(activeCourseId);
      return;
    }

    setNaghamCourseLetterInput(
      naghamCourseLetters[activeCourseId] || DEFAULT_NAGHAM_COURSE_LETTER,
    );
  }, [
    isVisitLogOwner,
    naghamCourseLetters,
    naghamCourseOptions,
    selectedNaghamCourseId,
  ]);

  React.useEffect(() => {
    if (!props.state?.token) {
      return;
    }

    let isMounted = true;

    fetch(apiUrl("/api/telegram/config"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${props.state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load Telegram config status.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setTelegramConfigStatus({
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
          groupReference: String(payload?.groupReference || ""),
        });
        setSchoolPlannerTelegramGroupInput(
          String(payload?.groupReference || ""),
        );
        setTelegramAuthStage(payload?.hasStringSession ? "connected" : "idle");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setTelegramConfigFeedback(
          error?.message || "Unable to load Telegram config status.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [props.state?.token]);

  const updatePasswordField = (event) => {
    const { name, value } = event.target;
    setPasswordFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (!props.state?.token) {
      setPasswordFeedback({
        tone: "error",
        message: "You need to be logged in to change the password.",
      });
      return;
    }

    if (!passwordFields.currentPassword || !passwordFields.newPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "Please fill in the current and new password.",
      });
      return;
    }

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "The new password and confirmation do not match.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordFields.currentPassword,
          newPassword: passwordFields.newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to change the password right now.",
        );
      }

      setPasswordFields({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFeedback({
        tone: "success",
        message: payload?.message || "Password changed successfully.",
      });
      setIsPasswordFormOpen(false);
    } catch (error) {
      setPasswordFeedback({
        tone: "error",
        message: error?.message || "Unable to change the password right now.",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const clearVisitLog = async () => {
    if (!isVisitLogOwner || !props.state?.token || isVisitLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all visit log entries?",
    );

    if (!shouldDelete) {
      return;
    }

    setIsVisitLogDeleting(true);
    setVisitLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/visit-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the visit log right now.",
        );
      }

      setVisitLogEntries([]);
      setVisitLogIndex(0);
    } catch (error) {
      setVisitLogError(
        error?.message || "Unable to delete the visit log right now.",
      );
    } finally {
      setIsVisitLogDeleting(false);
    }
  };

  const clearLoginLog = async () => {
    if (!props.state?.token || isLoginLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all login log entries?",
    );

    if (!shouldDelete) {
      return;
    }

    setIsLoginLogDeleting(true);
    setLoginLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/login-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the login log right now.",
        );
      }

      setLoginLogEntries([]);
      setLoginLogIndex(0);
    } catch (error) {
      setLoginLogError(
        error?.message || "Unable to delete the login log right now.",
      );
    } finally {
      setIsLoginLogDeleting(false);
    }
  };

  const saveNaghamCourseLetter = () => {
    if (!selectedNaghamCourseId) {
      setNaghamCourseLetterFeedback("Choose a course first.");
      return;
    }

    const nextLetter =
      String(naghamCourseLetterInput || "").trim() ||
      DEFAULT_NAGHAM_COURSE_LETTER;
    const nextLetters = {
      ...naghamCourseLetters,
      [selectedNaghamCourseId]: nextLetter,
    };

    window.localStorage.setItem(
      NAGHAM_COURSE_LETTERS_STORAGE_KEY,
      JSON.stringify(nextLetters),
    );
    setNaghamCourseLetters(nextLetters);
    setNaghamCourseLetterInput(nextLetter);
    setNaghamCourseLetterFeedback("Saved for the selected Nagham course.");
  };

  const saveMusicArchivePlaylist = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const nextArchiveLines = parsePlaylistLines(musicArchivePlaylistInput);
    const nextItunesLines = parsePlaylistLines(itunesPlaylistInput);
    const nextMusicBrainzLines = parsePlaylistLines(musicBrainzPlaylistInput);

    const nextArchiveItems =
      nextArchiveLines.length > 0
        ? buildMusicLibraryItemsFromLines(
            "internetArchive",
            nextArchiveLines.join("\n"),
          )
        : buildMusicLibraryItemsFromLines(
            "internetArchive",
            DEFAULT_ARCHIVE_MUSIC_IDENTIFIERS.join("\n"),
          );
    const nextLibraryItems = [
      ...nextArchiveItems,
      ...buildMusicLibraryItemsFromLines("itunes", nextItunesLines.join("\n")),
      ...buildMusicLibraryItemsFromLines(
        "musicBrainz",
        nextMusicBrainzLines.join("\n"),
      ),
    ];

    window.localStorage.setItem(
      SCHOOLPLANNER_MUSIC_STORAGE_KEY,
      JSON.stringify(nextLibraryItems),
    );

    setMusicArchivePlaylistInput(
      nextArchiveItems
        .map((item) => String(item.identifier || item.query || "").trim())
        .filter(Boolean)
        .join("\n"),
    );
    setItunesPlaylistInput(nextItunesLines.join("\n"));
    setMusicBrainzPlaylistInput(nextMusicBrainzLines.join("\n"));

    try {
      await refreshSharedPlannerMusicLibrary();
      setMusicArchivePlaylistFeedback("Saved planner music API settings.");
    } catch (error) {
      setMusicArchivePlaylistFeedback(
        error?.message ||
          "Saved settings, but could not refresh the player yet.",
      );
    }
  };

  const searchMusicArchiveSongs = async (searchOverride) => {
    const searchFields = {
      song:
        searchOverride?.song !== undefined
          ? searchOverride.song
          : musicLibrarySongQuery,
      artist:
        searchOverride?.artist !== undefined
          ? searchOverride.artist
          : musicLibraryArtistQuery,
    };
    const { song, artist } = buildMusicSearchTerms(searchFields);

    if (!song && !artist) {
      return [];
    }

    const response = await fetch(
      buildInternetArchiveSearchUrl({ song, artist }),
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error("Unable to search songs right now.");
    }

    return Array.isArray(payload?.response?.docs)
      ? payload.response.docs
          .map((item) => ({
            identifier: String(item?.identifier || "").trim(),
            title: String(item?.title || item?.identifier || "").trim(),
            creator: Array.isArray(item?.creator)
              ? item.creator.join(", ")
              : String(item?.creator || "Internet Archive").trim(),
          }))
          .filter((item) => item.identifier)
      : [];
  };

  const searchITunesSongs = async (searchOverride) => {
    const searchFields = {
      song:
        searchOverride?.song !== undefined
          ? searchOverride.song
          : musicLibrarySongQuery,
      artist:
        searchOverride?.artist !== undefined
          ? searchOverride.artist
          : musicLibraryArtistQuery,
    };
    const { song, artist } = buildMusicSearchTerms(searchFields);

    if (!song && !artist) {
      return [];
    }

    const response = await fetch(buildITunesSearchUrl({ song, artist }));
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error("Unable to search iTunes right now.");
    }

    return Array.isArray(payload?.results)
      ? payload.results
          .map((item) => ({
            identifier: String(item?.trackId || "").trim(),
            title: String(item?.trackName || "").trim(),
            creator: String(item?.artistName || "iTunes Search API").trim(),
            queryLabel: buildMusicLibraryLineLabel(
              item?.trackName,
              item?.artistName,
              item?.trackId,
            ),
          }))
          .filter((item) => item.queryLabel)
      : [];
  };

  const searchMusicBrainzSongs = async (searchOverride) => {
    const searchFields = {
      song:
        searchOverride?.song !== undefined
          ? searchOverride.song
          : musicLibrarySongQuery,
      artist:
        searchOverride?.artist !== undefined
          ? searchOverride.artist
          : musicLibraryArtistQuery,
    };
    const { song, artist } = buildMusicSearchTerms(searchFields);

    if (!song && !artist) {
      return [];
    }

    const response = await fetch(buildMusicBrainzSearchUrl({ song, artist }));
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error("Unable to search MusicBrainz right now.");
    }

    return Array.isArray(payload?.recordings)
      ? payload.recordings
          .map((item) => {
            const artistName = Array.isArray(item?.["artist-credit"])
              ? item["artist-credit"]
                  .map((credit) => String(credit?.name || "").trim())
                  .filter(Boolean)
                  .join(", ")
              : "";

            return {
              identifier: String(item?.id || "").trim(),
              title: String(item?.title || "").trim(),
              creator: artistName || "MusicBrainz",
              queryLabel: buildMusicLibraryLineLabel(
                item?.title,
                artistName,
                item?.id,
              ),
            };
          })
          .filter((item) => item.queryLabel)
      : [];
  };

  const searchAllMusicLibrarySources = async () => {
    const searchFields = buildMusicSearchTerms({
      song: musicLibrarySongQuery,
      artist: musicLibraryArtistQuery,
    });

    if (!searchFields.song && !searchFields.artist) {
      setMusicArchiveSearchResults([]);
      setItunesSearchResults([]);
      setMusicBrainzSearchResults([]);
      setMusicLibrarySearchFeedback("Type a song title or artist first.");
      return;
    }

    setIsMusicLibrarySearching(true);
    setMusicLibrarySearchFeedback("");

    const settledResults = await Promise.allSettled([
      searchMusicArchiveSongs(searchFields),
      searchITunesSongs(searchFields),
      searchMusicBrainzSongs(searchFields),
    ]);

    const nextArchiveResults =
      settledResults[0].status === "fulfilled" ? settledResults[0].value : [];
    const nextItunesResults =
      settledResults[1].status === "fulfilled" ? settledResults[1].value : [];
    const nextMusicBrainzResults =
      settledResults[2].status === "fulfilled" ? settledResults[2].value : [];

    setMusicArchiveSearchResults(nextArchiveResults);
    setItunesSearchResults(nextItunesResults);
    setMusicBrainzSearchResults(nextMusicBrainzResults);

    const totalResults =
      nextArchiveResults.length +
      nextItunesResults.length +
      nextMusicBrainzResults.length;

    if (totalResults > 0) {
      setMusicLibrarySearchFeedback("");
    } else {
      const firstRejected = settledResults.find(
        (result) => result.status === "rejected",
      );

      setMusicLibrarySearchFeedback(
        firstRejected?.status === "rejected"
          ? firstRejected.reason?.message || "Unable to search music right now."
          : "No matching songs found.",
      );
    }

    setIsMusicLibrarySearching(false);
  };

  const addMusicArchiveSong = (identifier) => {
    const normalizedIdentifier = String(identifier || "").trim();

    if (!normalizedIdentifier) {
      return;
    }

    const existingIdentifiers = Array.from(
      new Set(
        String(musicArchivePlaylistInput || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (existingIdentifiers.includes(normalizedIdentifier)) {
      setMusicArchivePlaylistFeedback("Song is already in the playlist.");
      return;
    }

    const nextIdentifiers = [...existingIdentifiers, normalizedIdentifier];
    setMusicArchivePlaylistInput(nextIdentifiers.join("\n"));
    setMusicArchivePlaylistFeedback("Song added to the playlist.");
  };

  const addITunesSong = (queryLabel) => {
    const normalizedLabel = String(queryLabel || "").trim();

    if (!normalizedLabel) {
      return;
    }

    const existingLabels = parsePlaylistLines(itunesPlaylistInput);

    if (existingLabels.includes(normalizedLabel)) {
      setMusicArchivePlaylistFeedback("Song is already in the playlist.");
      return;
    }

    setItunesPlaylistInput([...existingLabels, normalizedLabel].join("\n"));
    setMusicArchivePlaylistFeedback("Song added to the playlist.");
  };

  const addMusicBrainzSong = (queryLabel) => {
    const normalizedLabel = String(queryLabel || "").trim();

    if (!normalizedLabel) {
      return;
    }

    const existingLabels = parsePlaylistLines(musicBrainzPlaylistInput);

    if (existingLabels.includes(normalizedLabel)) {
      setMusicArchivePlaylistFeedback("Song is already in the playlist.");
      return;
    }

    setMusicBrainzPlaylistInput(
      [...existingLabels, normalizedLabel].join("\n"),
    );
    setMusicArchivePlaylistFeedback("Song added to the playlist.");
  };

  const removeMusicLibraryPlaylistItem = (provider, valueToRemove) => {
    const normalizedProvider = String(provider || "").trim();
    const normalizedValue = String(valueToRemove || "").trim();

    if (!normalizedValue) {
      return;
    }

    if (normalizedProvider === "itunes") {
      setItunesPlaylistInput(
        parsePlaylistLines(itunesPlaylistInput)
          .filter((line) => line !== normalizedValue)
          .join("\n"),
      );
    } else if (normalizedProvider === "musicBrainz") {
      setMusicBrainzPlaylistInput(
        parsePlaylistLines(musicBrainzPlaylistInput)
          .filter((line) => line !== normalizedValue)
          .join("\n"),
      );
    } else {
      setMusicArchivePlaylistInput(
        parsePlaylistLines(musicArchivePlaylistInput)
          .filter((line) => line !== normalizedValue)
          .join("\n"),
      );
    }

    setMusicArchivePlaylistFeedback(
      `${getMusicProviderLabel(normalizedProvider)} song removed from the playlist.`,
    );
  };

  const saveSchoolPlannerTelegramSettings = () => {
    if (!props.state?.token) {
      return;
    }

    const normalizedGroup = String(
      schoolPlannerTelegramGroupInput || "",
    ).trim();

    fetch(apiUrl("/api/telegram/config"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${props.state.token}`,
      },
      body: JSON.stringify({
        groupReference: normalizedGroup,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to save Telegram link settings.",
          );
        }

        setTelegramConfigStatus((currentStatus) => ({
          ...currentStatus,
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
          groupReference: String(payload?.groupReference || ""),
        }));
        setSchoolPlannerTelegramGroupInput(
          String(payload?.groupReference || ""),
        );
        setSchoolPlannerTelegramFeedback(
          payload?.message || "Saved SchoolPlanner Telegram settings.",
        );
      })
      .catch((error) => {
        setSchoolPlannerTelegramFeedback(
          error?.message || "Unable to save Telegram settings.",
        );
      });
  };

  const startTelegramAuth = async () => {
    if (!props.state?.token) {
      return;
    }

    const apiId = String(telegramApiIdInput || "").trim();
    const apiHash = String(telegramApiHashInput || "").trim();
    const phoneNumber = String(telegramPhoneNumberInput || "").trim();

    if (!apiId || !apiHash || !phoneNumber) {
      setTelegramConfigFeedback(
        "Please fill Telegram API ID, API Hash, and phone number.",
      );
      return;
    }

    try {
      setTelegramAuthStage("idle");
      setTelegramPhoneCodeInput("");
      setTelegramPasswordInput("");
      const response = await fetch(apiUrl("/api/telegram/auth/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          apiId,
          apiHash,
          phoneNumber,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to start Telegram login.");
      }

      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        payload?.message || "Telegram login code sent.",
      );
    } catch (error) {
      setTelegramAuthStage("idle");
      setTelegramConfigFeedback(
        error?.message || "Unable to start Telegram login.",
      );
    }
  };

  const verifyTelegramCode = async () => {
    if (!props.state?.token) {
      return;
    }

    const phoneCode = String(telegramPhoneCodeInput || "").trim();

    if (!phoneCode) {
      setTelegramConfigFeedback("Please enter the Telegram login code.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/auth/verify-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          phoneCode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to verify Telegram code.");
      }

      if (payload?.requiresPassword) {
        setTelegramAuthStage("password");
      } else {
        setTelegramAuthStage("connected");
        setTelegramConfigStatus((currentStatus) => ({
          ...currentStatus,
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
        }));
      }

      setTelegramConfigFeedback(payload?.message || "Telegram code verified.");
      setTelegramPhoneCodeInput("");
    } catch (error) {
      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        error?.message || "Unable to verify Telegram code.",
      );
    }
  };

  const verifyTelegramPassword = async () => {
    if (!props.state?.token) {
      return;
    }

    const password = String(telegramPasswordInput || "");

    if (!password.trim()) {
      setTelegramConfigFeedback(
        "Please enter the Telegram 2-step verification password.",
      );
      return;
    }

    try {
      const response = await fetch(
        apiUrl("/api/telegram/auth/verify-password"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${props.state.token}`,
          },
          body: JSON.stringify({
            password,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to verify Telegram password.",
        );
      }

      setTelegramAuthStage("connected");
      setTelegramConfigStatus((currentStatus) => ({
        ...currentStatus,
        configured: Boolean(payload?.configured),
        hasApiId: Boolean(payload?.hasApiId),
        hasApiHash: Boolean(payload?.hasApiHash),
        hasStringSession: Boolean(payload?.hasStringSession),
      }));
      setTelegramConfigFeedback(
        payload?.message || "Telegram connected successfully.",
      );
      setTelegramPasswordInput("");
    } catch (error) {
      setTelegramAuthStage("password");
      setTelegramConfigFeedback(
        error?.message || "Unable to verify Telegram password.",
      );
    }
  };

  const updateAcademicInfoField = (event) => {
    const { name, value } = event.target;

    setAcademicInfoFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAcademicInfoSave = async (event) => {
    event.preventDefault();

    if (!props.state?.token) {
      return;
    }

    setIsAcademicInfoSubmitting(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname: String(props.state?.firstname || "").trim(),
          lastname: String(props.state?.lastname || "").trim(),
          username: String(props.state?.username || "").trim(),
          faculty: academicInfoFields.faculty,
          program: academicInfoFields.program,
          university: academicInfoFields.university,
          currentAcademicYear: academicInfoFields.currentAcademicYear,
          studyYear: academicInfoFields.studyYear,
          term: academicInfoFields.term,
          aiProvider: String(props.state?.aiProvider || "openai").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update personal information.",
        );
      }

      const nextInfo = payload?.info || {};

      props.setUserAcademicInfo?.({
        firstname: nextInfo?.firstname || props.state?.firstname || "",
        lastname: nextInfo?.lastname || props.state?.lastname || "",
        username: nextInfo?.username || props.state?.username || "",
        faculty: nextInfo?.faculty || academicInfoFields.faculty,
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
        currentAcademicYear:
          nextInfo?.currentAcademicYear ||
          academicInfoFields.currentAcademicYear,
        studyYear: nextInfo?.studyYear || academicInfoFields.studyYear,
        term: nextInfo?.term || academicInfoFields.term,
        aiProvider:
          nextInfo?.aiProvider || String(props.state?.aiProvider || "openai"),
      });
      setAcademicInfoFields({
        faculty: nextInfo?.faculty || academicInfoFields.faculty,
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
        currentAcademicYear:
          nextInfo?.currentAcademicYear ||
          academicInfoFields.currentAcademicYear,
        studyYear: nextInfo?.studyYear || academicInfoFields.studyYear,
        term: nextInfo?.term || academicInfoFields.term,
      });
      setIsAcademicInfoEditing(false);
      setAcademicInfoFeedback({
        tone: "success",
        message: payload?.message || "Personal information updated.",
      });
    } catch (error) {
      setAcademicInfoFeedback({
        tone: "error",
        message: error?.message || "Unable to update personal information.",
      });
    } finally {
      setIsAcademicInfoSubmitting(false);
    }
  };

  const startInlinePersonalInfoEdit = (fieldName) => {
    setActivePersonalInfoField(fieldName);
    setPersonalInfoInputValue(String(props.state?.[fieldName] || ""));
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });
  };

  const submitInlinePersonalInfoEdit = async () => {
    if (!props.state?.token || !activePersonalInfoField) {
      return;
    }

    const nextFieldValue = String(personalInfoInputValue || "").trim();
    const requiredFields = ["firstname", "lastname", "username"];

    if (
      requiredFields.includes(activePersonalInfoField) &&
      !String(nextFieldValue || "").trim()
    ) {
      setAcademicInfoFeedback({
        tone: "error",
        message: "First name, last name, and username are required.",
      });
      return;
    }

    const payloadBody = {
      firstname: String(props.state?.firstname || "").trim(),
      lastname: String(props.state?.lastname || "").trim(),
      username: String(props.state?.username || "").trim(),
    };

    payloadBody[activePersonalInfoField] = nextFieldValue;

    if (
      !payloadBody.firstname ||
      !payloadBody.lastname ||
      !payloadBody.username
    ) {
      setAcademicInfoFeedback({
        tone: "error",
        message: "First name, last name, and username are required.",
      });
      return;
    }

    setIsPersonalInfoInlineSubmitting(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update personal information.",
        );
      }

      const nextInfo = payload?.info || payloadBody;

      props.setUserAcademicInfo?.({
        firstname: nextInfo?.firstname || payloadBody.firstname,
        lastname: nextInfo?.lastname || payloadBody.lastname,
        username: nextInfo?.username || payloadBody.username,
        bio: nextInfo?.bio || payloadBody.bio,
        faculty: nextInfo?.faculty || academicInfoFields.faculty,
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
        currentAcademicYear:
          nextInfo?.currentAcademicYear ||
          String(props.state?.studying?.time?.currentAcademicYear || ""),
        studyYear: nextInfo?.studyYear || payloadBody.studyYear,
        term: nextInfo?.term || payloadBody.term,
        aiProvider: nextInfo?.aiProvider || payloadBody.aiProvider,
      });
      setAcademicInfoFields({
        faculty: nextInfo?.faculty || academicInfoFields.faculty,
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
        currentAcademicYear:
          nextInfo?.currentAcademicYear ||
          String(props.state?.studying?.time?.currentAcademicYear || ""),
        studyYear: nextInfo?.studyYear || payloadBody.studyYear,
        term: nextInfo?.term || payloadBody.term,
      });
      setActivePersonalInfoField("");
      setPersonalInfoInputValue("");
      setAcademicInfoFeedback({
        tone: "success",
        message: payload?.message || "Personal information updated.",
      });
    } catch (error) {
      setAcademicInfoFeedback({
        tone: "error",
        message: error?.message || "Unable to update personal information.",
      });
    } finally {
      setIsPersonalInfoInlineSubmitting(false);
    }
  };

  const handleInlinePersonalInfoKeyDown = (event) => {
    if (event.key === "Enter") {
      if (
        activePersonalInfoField === "bio" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        return;
      }
      event.preventDefault();
      submitInlinePersonalInfoEdit();
      return;
    }

    if (event.key === "Escape") {
      setActivePersonalInfoField("");
      setPersonalInfoInputValue("");
    }
  };

  const extractCompactBioEventSummaries = (sourceValue) => {
    const sourceItems = Array.isArray(sourceValue)
      ? sourceValue
      : sourceValue && typeof sourceValue === "object"
        ? Object.values(sourceValue)
        : [];

    return sourceItems
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (!item || typeof item !== "object") {
          return "";
        }

        const title = String(
          item.title ||
            item.name ||
            item.eventName ||
            item.label ||
            item.subject ||
            "",
        ).trim();
        const date = String(
          item.date || item.startDate || item.start || item.when || "",
        ).trim();
        const location = String(
          item.location || item.place || item.venue || item.city || "",
        ).trim();
        const description = String(
          item.description || item.summary || item.note || "",
        ).trim();

        return [title, date, location, description].filter(Boolean).join(" • ");
      })
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  };

  const buildCompactBioGenerationContext = () => {
    const candidateEventSources = [
      props.state?.events,
      props.state?.eventList,
      props.state?.calendarEvents,
      props.state?.upcomingEvents,
      props.state?.login_record,
    ];
    const events = Array.from(
      new Set(
        candidateEventSources.flatMap((sourceValue) =>
          extractCompactBioEventSummaries(sourceValue),
        ),
      ),
    ).slice(0, 6);

    return {
      profile: {
        displayName: compactDisplayName,
        username: profileState.username,
        firstName: profileState.firstname,
        lastName: profileState.lastname,
        bio: compactBio,
        university: formatProfileValue(profileStudying.university || profileState.university),
        faculty: formatProfileValue(profileStudying.faculty || profileState.faculty),
        program: formatProfileValue(profileStudying.program || profileState.program),
        currentAcademicYear: formatProfileValue(
          profileStudyingCurrent.programYearInterval ||
            profileStudyingTime.currentAcademicYear ||
            profileState.studyYear,
        ),
        currentYearNumber: formatProfileValue(profileStudyingCurrent.programYearNum),
        currentTerm: formatProfileValue(
          readProgramTermValue(profileStudyingCurrent.programTerm) ||
            profileStudyingCurrentDate.term ||
            profileStudying.term ||
            profileState.term,
        ),
        language: formatProfileValue(profileStudying.language),
        company: formatProfileValue(profileWorking.company),
        position: formatProfileValue(profileWorking.position),
        hometown: formatProfileValue(
          [profileHometown.City, profileHometown.Country]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join(", "),
        ),
        componentsClass: Array.isArray(profileStudying.componentsClass)
          ? profileStudying.componentsClass
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
          : [],
      },
      events,
    };
  };

  const buildLocalCompactBio = (context) => {
    const profile = context?.profile || {};
    const events = Array.isArray(context?.events) ? context.events : [];
    const introParts = [];

    if (profile.program && profile.university) {
      introParts.push(
        `studying ${profile.program} at ${profile.university}`,
      );
    } else if (profile.program) {
      introParts.push(`studying ${profile.program}`);
    } else if (profile.university) {
      introParts.push(`based at ${profile.university}`);
    }

    if (profile.faculty) {
      introParts.push(`part of the ${profile.faculty} faculty`);
    }

    if (profile.company || profile.position) {
      introParts.push(
        `working${profile.position ? ` as ${profile.position}` : ""}${
          profile.company ? ` at ${profile.company}` : ""
        }`,
      );
    }

    if (profile.language && profile.language !== "-") {
      introParts.push(`speaks ${profile.language}`);
    }

    if (Array.isArray(profile.componentsClass) && profile.componentsClass.length) {
      introParts.push(
        `focused on ${profile.componentsClass.slice(0, 3).join(", ")}`,
      );
    }

    const introSentence = introParts.length
      ? `${profile.displayName || "This user"} is ${introParts.join(", ")}.`
      : `${profile.displayName || "This user"} keeps a profile that is still taking shape.`;

    const locationSentence =
      profile.hometown && profile.hometown !== "-"
        ? `They are connected to ${profile.hometown}.`
        : "";

    const eventSentence = events.length
      ? `Recent activity includes ${events.slice(0, 2).join(" and ")}.`
      : "Their event trail is still quiet, so the bio stays focused on the profile itself.";

    return [introSentence, locationSentence, eventSentence]
      .filter(Boolean)
      .join(" ");
  };

  const handleGenerateCompactBio = async () => {
    if (isCompactBioGenerating || isPersonalInfoInlineSubmitting) {
      return;
    }

    const context = buildCompactBioGenerationContext();
    setIsCompactBioGenerating(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const token = String(props.state?.token || "").trim();
      if (token) {
        const response = await fetch(apiUrl("/api/telegram/ai/profile-bio"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aiProvider: String(props.state?.aiProvider || "openai").trim(),
            profile: context.profile,
            events: context.events,
            currentBio: compactBio,
          }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to generate the bio right now.",
          );
        }

        const nextBio = String(
          payload?.bio || payload?.generatedBio || payload?.text || "",
        ).trim();

        if (nextBio) {
          setPersonalInfoInputValue(nextBio);
          setAcademicInfoFeedback({
            tone: "success",
            message: "Bio generated from your profile and activity.",
          });
          return;
        }
      }

      const fallbackBio = buildLocalCompactBio(context);
      setPersonalInfoInputValue(fallbackBio);
      setAcademicInfoFeedback({
        tone: "success",
        message: "Bio generated from your profile and activity.",
      });
    } catch (error) {
      const fallbackBio = buildLocalCompactBio(context);
      setPersonalInfoInputValue(fallbackBio);
      setAcademicInfoFeedback({
        tone: "success",
        message:
          error?.message ||
          "Generated a local bio from your profile and activity.",
      });
    } finally {
      setIsCompactBioGenerating(false);
    }
  };

  const handleUpdateGalleryImageVisibility = async (publicId, visibility) => {
    const nextPublicId = String(publicId || "").trim();
    const nextVisibility = normalizeGalleryVisibility(visibility);

    if (!nextPublicId || !props.state?.token) {
      return;
    }

    const targetImage = imageGallery.find(
      (image) => String(image?.publicId || "").trim() === nextPublicId,
    );

    if (!targetImage) {
      return;
    }

    if (
      normalizeGalleryVisibility(targetImage?.visibility) === nextVisibility
    ) {
      return;
    }

    setIsImageGalleryVisibilityUpdatingPublicId(nextPublicId);

    try {
      const response = await fetch(apiUrl("/api/user/image-gallery"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetImage?.url,
          publicId: targetImage?.publicId,
          assetId: targetImage?.assetId,
          folder: targetImage?.folder,
          resourceType:
            targetImage?.resourceType || targetImage?.resource_type || "image",
          mimeType: targetImage?.mimeType,
          width: targetImage?.width,
          height: targetImage?.height,
          format: targetImage?.format,
          bytes: targetImage?.bytes,
          duration: targetImage?.duration,
          visibility: nextVisibility,
          createdAt: targetImage?.createdAt || new Date().toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update visibility.");
      }

      syncUserMediaState(payload, {
        keepCurrentProfilePicture: true,
      });
      sendCloudinaryReply(payload?.message || "Visibility updated.");
    } catch (error) {
      sendCloudinaryReply(
        error?.message || "Unable to update media visibility.",
      );
    } finally {
      setIsImageGalleryVisibilityUpdatingPublicId("");
    }
  };

  const handleSelectGalleryVisibilityTab = (nextTabId) => {
    if (nextTabId !== "hidden") {
      setGalleryImageVisibilityTab(nextTabId);
      setIsHiddenGalleryPasswordPromptOpen(false);
      setHiddenGalleryPasswordInput("");
      setHiddenGalleryPasswordFeedback("");
      setIsHiddenGalleryPasswordSubmitting(false);
      return;
    }

    if (galleryImageVisibilityTab === "hidden") {
      setGalleryImageVisibilityTab("hidden");
      setIsHiddenGalleryPasswordPromptOpen(false);
      setHiddenGalleryPasswordInput("");
      setHiddenGalleryPasswordFeedback("");
      return;
    }

    setIsHiddenGalleryPasswordPromptOpen(true);
    setHiddenGalleryPasswordInput("");
    setHiddenGalleryPasswordFeedback("");
  };

  const handleUnlockHiddenGallery = async () => {
    if (!props.state?.token || isHiddenGalleryPasswordSubmitting) {
      return;
    }

    const password = String(hiddenGalleryPasswordInput || "");

    if (!password.trim()) {
      setHiddenGalleryPasswordFeedback("Please enter your password.");
      return;
    }

    setIsHiddenGalleryPasswordSubmitting(true);
    setHiddenGalleryPasswordFeedback("");

    try {
      const response = await fetch(apiUrl("/api/user/verify-password"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to verify password.");
      }

      setIsHiddenGalleryPasswordPromptOpen(false);
      setHiddenGalleryPasswordInput("");
      setHiddenGalleryPasswordFeedback("");
      setGalleryImageVisibilityTab("hidden");
    } catch (error) {
      setHiddenGalleryPasswordFeedback(
        error?.message || "Unable to verify password.",
      );
    } finally {
      setIsHiddenGalleryPasswordSubmitting(false);
    }
  };

  const updateAboutProfileField = (fieldName, nextValue) => {
    setAboutProfileDraft((currentDraft) => ({
      ...currentDraft,
      [fieldName]: nextValue,
    }));
  };

  const updateProgramTermScheduleEntry = (
    scheduleFieldName,
    entryIndex,
    fieldName,
    nextValue,
  ) => {
    setAboutProfileDraft((currentDraft) => {
      const baseEntries =
        Array.isArray(currentDraft?.[scheduleFieldName]) &&
        currentDraft[scheduleFieldName].length > 0
          ? currentDraft[scheduleFieldName]
          : [createEmptyProgramTermScheduleEntry()];
      const nextEntries = baseEntries.map((entry, index) =>
        index === entryIndex
          ? {
              ...entry,
              [fieldName]: nextValue,
            }
          : entry,
      );

      return {
        ...currentDraft,
        [scheduleFieldName]: nextEntries,
      };
    });
  };

  const addProgramTermScheduleEntry = (scheduleFieldName) => {
    setAboutProfileDraft((currentDraft) => ({
      ...currentDraft,
      [scheduleFieldName]: [
        ...(Array.isArray(currentDraft?.[scheduleFieldName])
          ? currentDraft[scheduleFieldName]
          : []),
        createEmptyProgramTermScheduleEntry(),
      ],
    }));
  };

  const removeProgramTermScheduleEntry = (scheduleFieldName, entryIndex) => {
    setAboutProfileDraft((currentDraft) => ({
      ...currentDraft,
      [scheduleFieldName]: (Array.isArray(currentDraft?.[scheduleFieldName])
        ? currentDraft[scheduleFieldName]
        : []
      ).filter((_, index) => index !== entryIndex),
    }));
  };

  const handleAboutProfileSave = async () => {
    if (!props.state?.token || isAboutProfileSubmitting) {
      return;
    }

    setIsAboutProfileSubmitting(true);
    setAcademicInfoFeedback({
      tone: "",
      message: "",
    });

    try {
      const nextCurrentProgramTerm = String(
        aboutProfileDraft.currentProgramTerm || "",
      ).trim();

      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname: aboutProfileDraft.firstname,
          lastname: aboutProfileDraft.lastname,
          dob: aboutProfileDraft.dob,
          university: aboutProfileDraft.university,
          program: aboutProfileDraft.program,
          faculty: aboutProfileDraft.faculty,
          componentsClass: Array.from(
            new Set(
              (Array.isArray(aboutProfileDraft.componentsClass)
                ? aboutProfileDraft.componentsClass
                : []
              )
                .map((entry) => String(entry || "").trim())
                .filter(Boolean),
            ),
          ),
          totalYearsNum: aboutProfileDraft.totalYearsNum,
          startProgramYearInterval: aboutProfileDraft.startProgramYearInterval,
          startProgramTerm: aboutProfileDraft.startProgramTerm,
          currentProgramYearNum: aboutProfileDraft.currentProgramYearNum,
          currentProgramYearInterval:
            aboutProfileDraft.currentProgramYearInterval,
          currentProgramTerm: nextCurrentProgramTerm,
          language: aboutProfileDraft.language,
          company: aboutProfileDraft.company,
          position: aboutProfileDraft.position,
          email: aboutProfileDraft.email,
          phone: aboutProfileDraft.phone,
          hometownCountry: aboutProfileDraft.hometownCountry,
          hometownCity: aboutProfileDraft.hometownCity,
          aiProvider: String(props.state?.aiProvider || "openai").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update profile information.",
        );
      }

      const nextInfo = payload?.info || {};

      props.setUserAcademicInfo?.({
        firstname: nextInfo?.firstname ?? aboutProfileDraft.firstname,
        lastname: nextInfo?.lastname ?? aboutProfileDraft.lastname,
        dob: nextInfo?.dob ?? aboutProfileDraft.dob,
        faculty: nextInfo?.faculty ?? aboutProfileDraft.faculty,
        componentsClass: Array.from(
          new Set(
            (Array.isArray(nextInfo?.componentsClass)
              ? nextInfo.componentsClass
              : Array.isArray(aboutProfileDraft.componentsClass)
                ? aboutProfileDraft.componentsClass
                : []
            )
              .map((entry) => String(entry || "").trim())
              .filter(Boolean),
          ),
        ),
        program: nextInfo?.program ?? aboutProfileDraft.program,
        university: nextInfo?.university ?? aboutProfileDraft.university,
        currentAcademicYear:
          nextInfo?.currentProgramYearInterval ??
          aboutProfileDraft.currentProgramYearInterval,
        studyYear:
          nextInfo?.currentProgramYearNum ??
          aboutProfileDraft.currentProgramYearNum,
        term:
          nextInfo?.currentProgramTerm ?? aboutProfileDraft.currentProgramTerm,
        language: nextInfo?.language ?? aboutProfileDraft.language,
        company: nextInfo?.company ?? aboutProfileDraft.company,
        position: nextInfo?.position ?? aboutProfileDraft.position,
        email: nextInfo?.email ?? aboutProfileDraft.email,
        phone: nextInfo?.phone ?? aboutProfileDraft.phone,
        hometownCountry:
          nextInfo?.hometownCountry ?? aboutProfileDraft.hometownCountry,
        hometownCity: nextInfo?.hometownCity ?? aboutProfileDraft.hometownCity,
        aiProvider:
          nextInfo?.aiProvider || String(props.state?.aiProvider || "openai"),
      });

      setIsAboutProfileEditing(false);
      setAcademicInfoFeedback({
        tone: "success",
        message: payload?.message || "Profile information updated.",
      });
    } catch (error) {
      setAcademicInfoFeedback({
        tone: "error",
        message: error?.message || "Unable to update profile information.",
      });
    } finally {
      setIsAboutProfileSubmitting(false);
    }
  };

  const availableProfileComponentClassOptions = Array.from(
    new Set(
      [
        ...HOME_COMPONENT_CLASS_OPTIONS,
        ...(Array.isArray(aboutProfileDraft?.componentsClass)
          ? aboutProfileDraft.componentsClass
          : []),
      ]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );

  const renderAboutProfileField = (fieldConfig) => {
    const {
      label,
      value,
      fieldName,
      inputType = "text",
      options = [],
      placeholder = "",
      displayEntries = [],
    } = fieldConfig;

    if (!isAboutProfileEditing || !fieldName) {
      if (inputType === "schedule") {
        const entries = Array.isArray(displayEntries) ? displayEntries : [];
        return (
          <p key={label}>
            <strong>{label}</strong>
            <span className="Home_Noga_aboutProfileScheduleDisplay">
              {entries.length > 0 ? (
                entries.map((entry, entryIndex) => (
                  <span
                    key={`${fieldName}-display-${entryIndex}`}
                    className="Home_Noga_aboutProfileScheduleDisplayRow"
                  >
                    {formatProgramTermScheduleRowDisplay(entry)}
                  </span>
                ))
              ) : (
                <span className="Home_Noga_aboutProfileScheduleDisplayRow">
                  -
                </span>
              )}
            </span>
          </p>
        );
      }

      return (
        <p key={label}>
          <strong>{label}</strong>
          <span>
            {inputType === "componentClasses" && Array.isArray(value)
              ? value.join(", ") || "-"
              : value}
          </span>
        </p>
      );
    }

    const fieldValue = String(aboutProfileDraft?.[fieldName] ?? "");
    const isRequiredField = HOME_ABOUT_PROFILE_REQUIRED_FIELDS.has(fieldName);

    if (inputType === "componentClasses") {
      const selectedValues = Array.isArray(aboutProfileDraft?.[fieldName])
        ? aboutProfileDraft[fieldName]
        : [];
      return (
        <div key={label} className="Home_Noga_aboutProfileEditRow">
          <strong>{label}</strong>
          <div className="Home_Noga_aboutProfileScheduleEditor">
            <select
              value=""
              onChange={(event) => {
                const nextValue = String(event.target.value || "").trim();
                if (!nextValue) {
                  return;
                }
                setAboutProfileDraft((currentDraft) => {
                  const currentList = Array.isArray(currentDraft?.[fieldName])
                    ? currentDraft[fieldName]
                    : [];
                  if (currentList.includes(nextValue)) {
                    return currentDraft;
                  }
                  return {
                    ...currentDraft,
                    [fieldName]: [...currentList, nextValue],
                  };
                });
              }}
            >
              <option value="" disabled>
                Add component class
              </option>
              {HOME_COMPONENT_CLASS_OPTIONS.map((optionValue) => (
                <option key={`${fieldName}-option-${optionValue}`} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
            <div className="Home_Noga_aboutProfileScheduleDisplay">
              {selectedValues.length > 0 ? (
                selectedValues.map((entry) => (
                  <button
                    key={`${fieldName}-chip-${entry}`}
                    type="button"
                    className="Home_Noga_aboutProfileScheduleRemove"
                    onClick={() =>
                      setAboutProfileDraft((currentDraft) => ({
                        ...currentDraft,
                        [fieldName]: (
                          Array.isArray(currentDraft?.[fieldName])
                            ? currentDraft[fieldName]
                            : []
                        ).filter(
                          (currentEntry) =>
                            String(currentEntry || "").trim() !== entry,
                        ),
                      }))
                    }
                  >
                    {entry} ×
                  </button>
                ))
              ) : (
                <span className="Home_Noga_aboutProfileScheduleDisplayRow">-</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (inputType === "schedule") {
      const entries = Array.isArray(aboutProfileDraft?.[fieldName])
        ? aboutProfileDraft[fieldName]
        : [];

      return (
        <div key={label} className="Home_Noga_aboutProfileEditRow">
          <strong>
            {label}
            {isRequiredField ? (
              <span className="Home_Noga_requiredMarker" aria-hidden="true">
                {" "}
                *
              </span>
            ) : null}
          </strong>
          <div className="Home_Noga_aboutProfileScheduleEditor">
            {entries.map((entry, entryIndex) => (
              <div
                key={`${fieldName}-${entryIndex}`}
                className="Home_Noga_aboutProfileScheduleRow"
              >
                <select
                  value={String(entry?.component_class || "")}
                  onChange={(event) =>
                    updateProgramTermScheduleEntry(
                      fieldName,
                      entryIndex,
                      "component_class",
                      event.target.value,
                    )
                  }
                >
                  <option value="" disabled>
                    Component class
                  </option>
                  {availableProfileComponentClassOptions.map((optionValue) => (
                    <option
                      key={`${fieldName}-component-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={String(entry?.start_date || "")}
                  onChange={(event) =>
                    updateProgramTermScheduleEntry(
                      fieldName,
                      entryIndex,
                      "start_date",
                      event.target.value,
                    )
                  }
                />
                <input
                  type="date"
                  value={String(entry?.end_date || "")}
                  onChange={(event) =>
                    updateProgramTermScheduleEntry(
                      fieldName,
                      entryIndex,
                      "end_date",
                      event.target.value,
                    )
                  }
                />
                <button
                  type="button"
                  className="Home_Noga_aboutProfileScheduleRemove"
                  onClick={() =>
                    removeProgramTermScheduleEntry(fieldName, entryIndex)
                  }
                  disabled={entries.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="Home_Noga_aboutProfileScheduleAdd"
              onClick={() => addProgramTermScheduleEntry(fieldName)}
            >
              Add row
            </button>
          </div>
        </div>
      );
    }

    return (
      <p key={label} className="Home_Noga_aboutProfileEditRow">
        <strong>
          {label}
          {isRequiredField ? (
            <span className="Home_Noga_requiredMarker" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </strong>
        {inputType === "select" ? (
          <select
            value={fieldValue}
            onChange={(event) =>
              updateAboutProfileField(fieldName, event.target.value)
            }
          >
            <option value="">{placeholder || label}</option>
            {options.map((optionValue) => (
              <option key={`${fieldName}-${optionValue}`} value={optionValue}>
                {optionValue}
              </option>
            ))}
          </select>
        ) : inputType === "textarea" ? (
          <textarea
            value={fieldValue}
            onChange={(event) =>
              updateAboutProfileField(fieldName, event.target.value)
            }
            placeholder={placeholder || label}
            rows={3}
          />
        ) : (
          <input
            type={inputType}
            value={fieldValue}
            onChange={(event) =>
              updateAboutProfileField(fieldName, event.target.value)
            }
            placeholder={placeholder || label}
          />
        )}
      </p>
    );
  };

  const renderInlineInfoField = (label, fieldName, fallback = "-") => {
    const isEditingThisField = activePersonalInfoField === fieldName;
    const displayValue = String(props.state?.[fieldName] || "").trim();
    const isRequiredField = HOME_INLINE_REQUIRED_FIELDS.has(fieldName);

    return (
      <div className="fr Home_Noga_userMenu_contentDivs">
        <label>
          {label}
          {isRequiredField ? (
            <span className="Home_Noga_requiredMarker" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
          :
        </label>
        {isEditingThisField ? (
          <input
            type="text"
            className="Home_Noga_userMenu_inlineInput"
            value={personalInfoInputValue}
            onChange={(event) => setPersonalInfoInputValue(event.target.value)}
            onKeyDown={handleInlinePersonalInfoKeyDown}
            autoFocus
            disabled={isPersonalInfoInlineSubmitting}
          />
        ) : (
          <p>{displayValue || fallback}</p>
        )}
        <button
          type="button"
          className="Home_Noga_userMenu_infoEditIcon"
          onClick={() => startInlinePersonalInfoEdit(fieldName)}
          aria-label={`Edit ${label.toLowerCase()}`}
          title={`Edit ${label.toLowerCase()}`}
          disabled={isPersonalInfoInlineSubmitting}
        >
          <i className="fas fa-pen"></i>
        </button>
      </div>
    );
  };

  const ownProfileState =
    props.state && typeof props.state === "object" ? props.state : {};
  const isViewingExternalProfile = false;
  const profileState = ownProfileState;
  const profileStudying =
    profileState.studying && typeof profileState.studying === "object"
      ? profileState.studying
      : {};
  const profileWorking =
    profileState.working && typeof profileState.working === "object"
      ? profileState.working
      : {};
  const profileHometown =
    profileState.hometown && typeof profileState.hometown === "object"
      ? profileState.hometown
      : {};
  const profileStudyingTime =
    profileStudying.time && typeof profileStudying.time === "object"
      ? profileStudying.time
      : {};
  const profileStudyingStartDate =
    profileStudyingTime.startDate &&
    typeof profileStudyingTime.startDate === "object"
      ? profileStudyingTime.startDate
      : {};
  const profileStudyingCurrent =
    profileStudyingTime.current &&
    typeof profileStudyingTime.current === "object"
      ? profileStudyingTime.current
      : {};
  const profileStudyingCurrentDate =
    profileStudyingTime.currentDate &&
    typeof profileStudyingTime.currentDate === "object"
      ? profileStudyingTime.currentDate
      : {};
  const formatProfileValue = (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || "-";
  };
  const formattedDob = (() => {
    if (!profileState.dob) {
      return "-";
    }
    const parsedDate = new Date(profileState.dob);
    if (Number.isNaN(parsedDate.getTime())) {
      return formatProfileValue(profileState.dob);
    }
    return parsedDate.toLocaleDateString();
  })();
  const profileColumns = [
    {
      title: "User Info",
      rows: [
        {
          label: "First name",
          value: formatProfileValue(profileState.firstname),
          fieldName: "firstname",
        },
        {
          label: "Last name",
          value: formatProfileValue(profileState.lastname),
          fieldName: "lastname",
        },
        {
          label: "DOB",
          value: formattedDob,
          fieldName: "dob",
          inputType: "date",
        },
      ],
    },
    {
      title: "Study",
      rows: [
        {
          label: "University",
          value: formatProfileValue(
            profileStudying.university || profileState.university,
          ),
          fieldName: "university",
        },
        {
          label: "Program",
          value: formatProfileValue(
            profileStudying.program || profileState.program,
          ),
          fieldName: "program",
        },
        {
          label: "Faculty",
          value: formatProfileValue(
            profileStudying.faculty || profileState.faculty,
          ),
          fieldName: "faculty",
        },
        {
          label: "Component class",
          value: Array.isArray(profileStudying.componentsClass)
            ? profileStudying.componentsClass
            : [],
          fieldName: "componentsClass",
          inputType: "componentClasses",
          options: HOME_COMPONENT_CLASS_OPTIONS,
        },
        {
          label: "Total program years",
          value: formatProfileValue(profileStudyingTime.totalYearsNum),
          fieldName: "totalYearsNum",
          inputType: "number",
        },
        {
          label: "Start interval",
          value: formatProfileValue(
            profileStudyingTime.start?.programYearInterval,
          ),
          fieldName: "startProgramYearInterval",
          inputType: "select",
          options: HOME_ACADEMIC_YEAR_OPTIONS,
        },
        {
          label: "Start term",
          value: formatProfileValue(profileStudyingTime.start?.programTerm),
          fieldName: "startProgramTerm",
          inputType: "select",
          options: ["First", "Second", "Third"],
        },
        {
          label: "Current program year number",
          value: formatProfileValue(profileStudyingCurrent.programYearNum),
          fieldName: "currentProgramYearNum",
          inputType: "number",
        },
        {
          label: "Current interval",
          value: formatProfileValue(
            profileStudyingCurrent.programYearInterval ||
              profileStudyingTime.currentAcademicYear,
          ),
          fieldName: "currentProgramYearInterval",
          inputType: "select",
          options: HOME_ACADEMIC_YEAR_OPTIONS,
        },
        {
          label: "Current term",
          value: formatProfileValue(
            readProgramTermValue(profileStudyingCurrent.programTerm) ||
              profileStudyingCurrentDate.term ||
              profileStudying.term ||
              profileState.term,
          ),
          fieldName: "currentProgramTerm",
          inputType: "select",
          options: ["First", "Second", "Third"],
        },
        {
          label: "Language",
          value: formatProfileValue(profileStudying.language),
          fieldName: "language",
        },
      ],
    },
    {
      title: "Work",
      rows: [
        {
          label: "Company",
          value: formatProfileValue(profileWorking.company),
          fieldName: "company",
        },
        {
          label: "Position",
          value: formatProfileValue(profileWorking.position),
          fieldName: "position",
        },
      ],
    },
    {
      title: "Contact",
      rows: [
        {
          label: "Email",
          value: formatProfileValue(profileState.email),
          fieldName: "email",
          inputType: "email",
        },
        {
          label: "Phone",
          value: formatProfileValue(profileState.phone),
          fieldName: "phone",
        },
        {
          label: "Country",
          value: formatProfileValue(profileHometown.Country),
          fieldName: "hometownCountry",
        },
        {
          label: "City",
          value: formatProfileValue(profileHometown.City),
          fieldName: "hometownCity",
        },
      ],
    },
  ];
  const compactDisplayName = formatProfileValue(
    [profileState.firstname, profileState.lastname]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" "),
  );
  const compactUsername = formatProfileValue(
    profileState.username ? `@${profileState.username}` : "",
  );
  const compactBio = formatProfileValue(profileState.bio);
  const isCompactBioArabic = isArabicText(compactBio);
  const isEditingCompactBio = activePersonalInfoField === "bio";
  const displayedProfilePictureSrc = String(
    props.state?.profilePicture || "",
  ).trim();
  const bioWrapperStyle = {
    "--home-bio-wallpaper-image": currentBioWallpaperUrl
      ? `url("${currentBioWallpaperUrl.replace(/"/g, '\\"')}")`
      : "none",
    "--home-bio-wallpaper-size": `${currentBioWallpaperSize}px auto`,
    "--home-bio-wallpaper-repeat": currentBioWallpaperRepeat
      ? "repeat"
      : "no-repeat",
  };
  const globalCallSession = props.state?.global_call_session || null;
  const hasHomeNogaCallDockMounted = Boolean(
    globalCallSession &&
      globalCallSession.callMode === "video" &&
      globalCallSession.callState !== "idle",
  );
  return (
      <article
        id="Home_Noga_article"
        className={[
          homeThemeClassName,
          isHomeNogaDarkTheme ? "Home_Noga_themeDark" : "",
          !isNaghamtrkmani ? "Home_Noga_root--bg" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section
          className={`fc slide-top Home_Noga_mainWrapperShell${isMobileChatOpen ? " Home_Noga_mainWrapperShell--chatView" : ""}`}
          ref={mainWrapperRef}
          style={
            homeNogaLeftColumnWidth
              ? {
                  "--home-left-column-width": homeNogaLeftColumnWidth,
                }
              : undefined
          }
      >
            {/* Removed Home_Noga_preStart_profileWrapper and its contents */}
              <div
                id="Home_Noga_main_leftColumn_wrapper"
                className="Home_Noga_main_leftColumn_wrapper"
              >
                <div
                  id="Home_Noga_bioProfileWrapper"
                  className="Home_Noga_bioProfileWrapper"
                >
                  <div
                    id="Home_Noga_bioWrapper"
                    className="Home_Noga_bioWrapper"
                    style={bioWrapperStyle}
                  >
                    <div
                      id="Home_Noga_preStart_profileWrapper"
                      ref={profilePictureWrapperRef}
                      style={{ position: "relative" }}
                    >
                      <div className="Home_Noga_preStart_profileViewportFrame">
                        {displayedProfilePictureSrc ? (
                          <img
                            id="Home_Noga_preStart_profilePic"
                            ref={profilePictureImageRef}
                            src={displayedProfilePictureSrc}
                            alt={compactDisplayName}
                            onDoubleClick={
                              isViewingExternalProfile
                                ? undefined
                                : resetProfilePictureViewport
                            }
                            onTouchStart={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePictureTouchStart
                            }
                            onTouchMove={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePictureTouchMove
                            }
                            onTouchEnd={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePictureTouchEnd
                            }
                            onTouchCancel={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePictureTouchEnd
                            }
                            onPointerDown={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePicturePointerDown
                            }
                            onPointerMove={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePicturePointerMove
                            }
                            onPointerUp={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePicturePointerUp
                            }
                            onPointerCancel={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePicturePointerUp
                            }
                            onWheel={
                              isViewingExternalProfile
                                ? undefined
                                : handleProfilePictureWheel
                            }
                            className={
                              !isViewingExternalProfile &&
                              isProfilePictureDragging
                                ? "isDragging"
                                : ""
                            }
                          />
                        ) : (
                          <i className="fas fa-user" aria-hidden="true"></i>
                        )}
                        <input
                          key={galleryTab}
                          ref={galleryUploadInputRef}
                          type="file"
                          accept={activeGalleryUploadConfig.accept}
                          className="Home_Noga_hiddenFileInput"
                          disabled={isViewingExternalProfile}
                          onChange={handleProfilePictureSelected}
                        />
                      </div>
                      {isProfilePictureViewportDirty ? (
                        <button
                          type="button"
                          className="Home_Noga_profileViewportApplyButton"
                          onClick={applyProfilePictureViewportChange}
                          disabled={isApplyingProfilePictureViewport}
                        >
                          {isApplyingProfilePictureViewport
                            ? "Applying..."
                            : "Apply Change"}
                        </button>
                      ) : null}
                    </div>
                    <div
                      id="Home_Noga_preStart_personalBio"
                      className={`fc${
                        isEditingCompactBio
                          ? " Home_Noga_preStart_personalBio--editing"
                          : ""
                      }`}
                    >
                      <div
                        id="Home_Noga_preStart_personalInfoGrid"
                        className="Home_Noga_preStart_personalInfoGrid--compact"
                      >
                          <div
                            className={`Home_Noga_compactBioCard${
                              isEditingCompactBio
                                ? " Home_Noga_compactBioCard--editing"
                                : ""
                            }`}
                          >
                            <div className="Home_Noga_compactBioIdentity">
                              <h3 className="Home_Noga_compactBioName">
                                {compactDisplayName}
                              </h3>
                              <p className="Home_Noga_compactBioUsername">
                                {compactUsername}
                              </p>
                            </div>
                            <div
                              className={`Home_Noga_compactBioSummary${
                                isEditingCompactBio
                                  ? " Home_Noga_compactBioSummary--editing"
                                  : ""
                              }`}
                            >
                              <div className="Home_Noga_compactBioHeadingRow">
                                <p className="Home_Noga_compactBioEyebrow">
                                  Bio
                                </p>
                                {!isViewingExternalProfile ? (
                                  <button
                                    type="button"
                                    className="Home_Noga_userMenu_infoEditIcon Home_Noga_compactBioEditButton"
                                    onClick={() =>
                                      startInlinePersonalInfoEdit("bio")
                                    }
                                    aria-label="Edit bio"
                                    title="Edit bio"
                                    disabled={isPersonalInfoInlineSubmitting}
                                  >
                                    <i className="fas fa-pen"></i>
                                  </button>
                                ) : null}
                              </div>
                          {isEditingCompactBio ? (
                            <div className="Home_Noga_compactBioEditor fc">
                              <textarea
                                className={`Home_Noga_userMenu_inlineInput Home_Noga_compactBioTextarea ${
                                  isArabicText(personalInfoInputValue)
                                    ? "Home_Noga_compactBioTextarea--rtl"
                                    : "Home_Noga_compactBioTextarea--ltr"
                                }`}
                                value={personalInfoInputValue}
                                onChange={(event) =>
                                  setPersonalInfoInputValue(event.target.value)
                                }
                                onKeyDown={handleInlinePersonalInfoKeyDown}
                                autoFocus
                                rows={5}
                                dir={
                                  isArabicText(personalInfoInputValue)
                                    ? "rtl"
                                    : "ltr"
                                }
                                disabled={isPersonalInfoInlineSubmitting}
                              />
                              <div className="Home_Noga_compactBioEditorActions fr">
                                <button
                                  type="button"
                                  className="Home_Noga_aboutButton Home_Noga_compactBioAiButton"
                                  onClick={handleGenerateCompactBio}
                                  disabled={
                                    isPersonalInfoInlineSubmitting ||
                                    isCompactBioGenerating
                                  }
                                  aria-label="Generate AI bio"
                                  title="Generate AI bio"
                                >
                                  <i
                                    className={`fi ${isCompactBioGenerating ? "fi-rr-spinner" : "fi-br-artificial-intelligence"}`}
                                    aria-hidden="true"
                                  ></i>
                                </button>
                                <button
                                  type="button"
                                  className="Home_Noga_aboutButton"
                                  onClick={submitInlinePersonalInfoEdit}
                                  disabled={
                                    isPersonalInfoInlineSubmitting ||
                                    isCompactBioGenerating
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="Home_Noga_aboutButton"
                                  onClick={() => {
                                    setActivePersonalInfoField("");
                                    setPersonalInfoInputValue("");
                                  }}
                                  disabled={
                                    isPersonalInfoInlineSubmitting ||
                                    isCompactBioGenerating
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className={`Home_Noga_compactBioText ${
                                isCompactBioArabic
                                  ? "Home_Noga_compactBioText--rtl"
                                  : "Home_Noga_compactBioText--ltr"
                              }`}
                              dir={isCompactBioArabic ? "rtl" : "ltr"}
                            >
                              {compactBio}
                            </p>
                          )}
                          {/* <button
                            type="button"
                            className="Home_Noga_aboutButton Home_Noga_wallpaperButton"
                            onClick={() =>
                              setIsBioWallpaperControlsOpen(
                                (currentValue) => !currentValue,
                              )
                            }
                            aria-pressed={isBioWallpaperControlsOpen}
                          >
                            {isBioWallpaperControlsOpen
                              ? "Close Wallpaper"
                              : "Wallpaper"}
                          </button>
                          {isBioWallpaperControlsOpen ? (
                            <div className="Home_Noga_bioWallpaperControls">
                              <label className="Home_Noga_bioWallpaperControlRow">
                                <span>Pattern size</span>
                                <input
                                  type="range"
                                  min="180"
                                  max="1400"
                                  step="20"
                                  value={currentBioWallpaperSize}
                                  onChange={(event) =>
                                    updateBioWallpaperState({
                                      bioWrapperWallpaperSize: Number(
                                        event.target.value,
                                      ),
                                    })
                                  }
                                />
                              </label>
                              <label className="Home_Noga_bioWallpaperControlCheck">
                                <input
                                  type="checkbox"
                                  checked={currentBioWallpaperRepeat}
                                  onChange={(event) =>
                                    updateBioWallpaperState({
                                      bioWrapperWallpaperRepeat:
                                        event.target.checked,
                                    })
                                  }
                                />
                                <span>Repeat for denser motifs</span>
                              </label>
                              <div className="Home_Noga_bioWallpaperControlActions">
                                <button
                                  type="button"
                                  className="Home_Noga_aboutButton Home_Noga_wallpaperAction"
                                  onClick={resetBioWallpaperToDefault}
                                >
                                  Use Pattern
                                </button>
                                <button
                                  type="button"
                                  className="Home_Noga_aboutButton Home_Noga_wallpaperAction"
                                  onClick={clearBioWallpaper}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ) : null} */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`Home_Noga_friendsEventsWrapper Home_Noga_friendsEventsWrapper--${friendsEventsTab}`}>
                  <div className="Home_Noga_friendsEventsTabBar">
                    <button
                      type="button"
                      className={`Home_Noga_friendsEventsTab${friendsEventsTab === "gallery" ? " isActive" : ""}`}
                      onClick={() => setFriendsEventsTab("gallery")}
                    >
                      Gallery
                    </button>
                    <button
                      type="button"
                      className={`Home_Noga_friendsEventsTab${friendsEventsTab === "events" ? " isActive" : ""}`}
                      onClick={() => setFriendsEventsTab("events")}
                    >
                      Events
                    </button>
                  </div>
                  <div className="Home_Noga_friendsGallery">
                    <div className="Home_Noga_friendsGalleryHeader">
                      <div className="Home_Noga_friendsGalleryHeaderTitleRow">
                        <h3>Gallery</h3>
                        <button
                          type="button"
                          className="Home_Noga_changePasswordSubmit"
                          onClick={openGalleryUploadPicker}
                          disabled={
                            isImageGalleryUploading || isViewingExternalProfile
                          }
                          aria-label={
                            isImageGalleryUploading
                              ? `Uploading ${activeGalleryUploadConfig.label}`
                              : `Upload ${activeGalleryUploadConfig.label}`
                          }
                          title={
                            isImageGalleryUploading
                              ? "Uploading..."
                              : `Upload ${activeGalleryUploadConfig.label}`
                          }
                        >
                          <i
                            className={`fi ${isImageGalleryUploading ? "fi-rr-spinner" : "fi-rr-cloud-upload-alt"}`}
                            aria-hidden="true"
                          ></i>
                        </button>
                      </div>
                      <div className="Home_Noga_friendsGalleryHeaderControls">
                        <div className="Home_Noga_galleryVisibilityTabs">
                          <div className="Home_Noga_galleryTabs">
                            <button
                              type="button"
                              className={`Home_Noga_galleryTabButton${galleryTab === "images" ? " isActive" : ""}`}
                              onClick={() => setGalleryTab("images")}
                              aria-label="Images"
                              title="Images"
                              aria-pressed={galleryTab === "images"}
                            >
                              <i
                                className="fi fi-rr-copy-image"
                                aria-hidden="true"
                              ></i>
                            </button>
                            <button
                              type="button"
                              className={`Home_Noga_galleryTabButton${galleryTab === "videos" ? " isActive" : ""}`}
                              onClick={() => setGalleryTab("videos")}
                              aria-label="Videos"
                              title="Videos"
                              aria-pressed={galleryTab === "videos"}
                            >
                              <i className="fi fi-rr-film" aria-hidden="true"></i>
                            </button>
                          </div>
                          {galleryTab === "images" ? (
                            HOME_GALLERY_VISIBILITY_FILTERS.map((filter) => (
                              <button
                                key={filter.id}
                                type="button"
                                className={`Home_Noga_galleryVisibilityTabButton${
                                  galleryImageVisibilityTab === filter.id
                                    ? " isActive"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleSelectGalleryVisibilityTab(filter.id)
                                }
                                aria-label={filter.label}
                                title={filter.label}
                                aria-pressed={
                                  galleryImageVisibilityTab === filter.id
                                }
                              >
                                {filter.icon
                                  ? <i className={filter.icon} aria-hidden="true" />
                                  : <span>{filter.label}</span>
                                }
                              </button>
                            ))
                          ) : null}
                        </div>
                        {galleryTab === "images" &&
                        isHiddenGalleryPasswordPromptOpen ? (
                          <div className="Home_Noga_galleryHiddenPasswordPrompt">
                            <input
                              type="password"
                              value={hiddenGalleryPasswordInput}
                              onChange={(event) => {
                                setHiddenGalleryPasswordInput(
                                  event.target.value,
                                );
                                if (hiddenGalleryPasswordFeedback) {
                                  setHiddenGalleryPasswordFeedback("");
                                }
                              }}
                              placeholder="Password for hidden images"
                              className="Home_Noga_galleryHiddenPasswordInput"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              className="Home_Noga_galleryHiddenPasswordButton"
                              onClick={handleUnlockHiddenGallery}
                              disabled={isHiddenGalleryPasswordSubmitting}
                            >
                              {isHiddenGalleryPasswordSubmitting
                                ? "Checking..."
                                : "Open Hidden"}
                            </button>
                            <button
                              type="button"
                              className="Home_Noga_galleryHiddenPasswordButton Home_Noga_galleryHiddenPasswordButton--ghost"
                              onClick={() => {
                                setIsHiddenGalleryPasswordPromptOpen(false);
                                setHiddenGalleryPasswordInput("");
                                setHiddenGalleryPasswordFeedback("");
                              }}
                              disabled={isHiddenGalleryPasswordSubmitting}
                            >
                              Cancel
                            </button>
                            {hiddenGalleryPasswordFeedback ? (
                              <p className="Home_Noga_galleryHiddenPasswordFeedback">
                                {hiddenGalleryPasswordFeedback}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {filteredGalleryItems.length ? (
                      <div className="Home_Noga_galleryGrid">
                        {filteredGalleryItems.map((image) => {
                          const imagePublicId = String(image?.publicId || "");
                          const isVideoItem = isVideoGalleryItem(image);
                          const isActionsOpen =
                            imagePublicId === activeGalleryActionsPublicId;
                          const currentVisibility = normalizeGalleryVisibility(
                            image?.visibility,
                          );
                          const isCurrentProfilePicture =
                            String(image?.url || "").trim() ===
                            profilePictureSrc;
                          return (
                            <article
                              key={image.publicId}
                              className="Home_Noga_galleryItem"
                            >
                              <div className="Home_Noga_galleryThumbWrap">
                                <button
                                  type="button"
                                  className="Home_Noga_galleryThumbButton"
                                  onClick={() =>
                                    toggleGalleryItemActions(image.publicId)
                                  }
                                  title="Show media actions"
                                >
                                  {isVideoItem ? (
                                    <video
                                      src={image.url}
                                      className="Home_Noga_galleryThumb"
                                      muted
                                      playsInline
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={image.url}
                                      alt="Gallery upload"
                                      className="Home_Noga_galleryThumb"
                                    />
                                  )}
                                </button>
                                <div
                                  className={`Home_Noga_galleryItemActions fc${isActionsOpen ? " Home_Noga_galleryItemActions--open" : ""}`}
                                >
                                  <button
                                    type="button"
                                    className="Home_Noga_editPicButton"
                                    onClick={() => {
                                      if (isVideoItem) {
                                        openGalleryVideoPlayer(image);
                                        return;
                                      }
                                      openGalleryViewer(image.publicId);
                                    }}
                                    aria-label={
                                      isVideoItem ? "Open video" : "View image"
                                    }
                                    title={
                                      isVideoItem ? "Open video" : "View image"
                                    }
                                  >
                                    <i
                                      className={`fas ${isVideoItem ? "fa-play" : "fa-expand"}`}
                                    ></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="Home_Noga_editPicButton"
                                    onClick={() =>
                                      handleSetGalleryImageAsProfilePicture(
                                        image.publicId,
                                      )
                                    }
                                    disabled={
                                      isVideoItem ||
                                      isCurrentProfilePicture ||
                                      isImageGallerySettingProfilePublicId ===
                                        image.publicId
                                    }
                                    aria-label={
                                      isImageGallerySettingProfilePublicId ===
                                      image.publicId
                                        ? "Saving profile picture"
                                        : isVideoItem
                                          ? "Only images can be profile pictures"
                                          : isCurrentProfilePicture
                                            ? "Current profile picture"
                                            : "Set as profile picture"
                                    }
                                    title={
                                      isImageGallerySettingProfilePublicId ===
                                      image.publicId
                                        ? "Saving profile picture"
                                        : isVideoItem
                                          ? "Only images can be profile pictures"
                                          : isCurrentProfilePicture
                                            ? "Current profile picture"
                                            : "Set as profile picture"
                                    }
                                  >
                                    <i className="fas fa-user-check"></i>
                                  </button>
                                  {isVideoItem ? null : (
                                    <div
                                      className="Home_Noga_galleryVisibilityGroup"
                                      role="group"
                                      aria-label="Image visibility"
                                    >
                                      {[
                                        {
                                          value: "public",
                                          label: "Public",
                                          iconClass: "fas fa-globe",
                                        },
                                        {
                                          value: "me",
                                          label: "Private",
                                          iconClass: "fas fa-lock",
                                        },
                                        {
                                          value: "hidden",
                                          label: "Hidden",
                                          iconClass: "fas fa-eye-slash",
                                        },
                                      ].map((option) => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          className={`Home_Noga_galleryVisibilityButton${
                                            currentVisibility === option.value
                                              ? " isActive"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleUpdateGalleryImageVisibility(
                                              image.publicId,
                                              option.value,
                                            )
                                          }
                                          disabled={
                                            isImageGalleryVisibilityUpdatingPublicId ===
                                            image.publicId
                                          }
                                          aria-label={`${option.label} visibility`}
                                          title={option.label}
                                          aria-pressed={
                                            currentVisibility === option.value
                                          }
                                        >
                                          <i
                                            className={option.iconClass}
                                            aria-hidden="true"
                                          ></i>
                                          <span>{option.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {/* <button
                                      type="button"
                                      className="Home_Noga_editPicButton"
                                      onClick={() =>
                                        handleSetGalleryImageAsBioWallpaper(
                                          image,
                                        )
                                      }
                                      disabled={isVideoItem}
                                      aria-label={
                                        isVideoItem
                                          ? "Only images can be used as bio wallpaper"
                                          : "Set as bio wallpaper"
                                      }
                                      title={
                                        isVideoItem
                                          ? "Only images can be used as bio wallpaper"
                                          : "Set as bio wallpaper"
                                      }
                                    >
                                      <i className="fas fa-panorama"></i>
                                    </button> */}
                                  <button
                                    type="button"
                                    className="Home_Noga_editPicButton"
                                    onClick={() =>
                                      handleDeleteGalleryImage(image.publicId)
                                    }
                                    disabled={
                                      isImageGalleryDeletingPublicId ===
                                      image.publicId
                                    }
                                    aria-label={
                                      isImageGalleryDeletingPublicId ===
                                      image.publicId
                                        ? "Deleting media"
                                        : "Delete media"
                                    }
                                    title={
                                      isImageGalleryDeletingPublicId ===
                                      image.publicId
                                        ? "Deleting media"
                                        : "Delete media"
                                    }
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="Home_Noga_galleryEmptyState">
                        {galleryTab === "images"
                          ? "No images found for this visibility."
                          : "No media uploaded yet."}
                      </div>
                    )}
                  </div>
                  <div className="Home_Noga_friendsEvents">
                    {isAboutOpen ? (
                      <>
                        <div className="Home_Noga_activeTab_title">
                          <div className="Home_Noga_activeTab_titleTitleRow">
                            <h3>Profile</h3>
                          </div>
                        </div>
                        <div
                          className={
                            "Home_Noga_aboutPanel" +
                            (isAboutProfileEditing
                              ? " Home_Noga_aboutPanel--editing"
                              : " Home_Noga_aboutPanel--regular")
                          }
                        >
                          <div className="Home_Noga_aboutPanelActions">
                            {isAboutProfileEditing ? (
                              <button
                                type="button"
                                className="Home_Noga_socialDirectoryTab Home_Noga_aboutButton"
                                onClick={handleAboutProfileSave}
                                disabled={isAboutProfileSubmitting}
                              >
                                {isAboutProfileSubmitting ? "save..." : "save"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="Home_Noga_socialDirectoryTab Home_Noga_aboutButton"
                                onClick={openProfileEditor}
                              >
                                edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="Home_Noga_socialDirectoryTab Home_Noga_aboutButton"
                              onClick={() => {
                                setIsAboutProfileEditing(false);
                                setIsAboutOpen(false);
                              }}
                              aria-pressed={isAboutOpen}
                              disabled={isAboutProfileSubmitting}
                            >
                              close
                            </button>
                          </div>
                          {profileColumns.map((column) => (
                            <section
                              key={`about-${column.title}`}
                              className="Home_Noga_profileInfoColumn"
                            >
                              <h4 className="Home_Noga_profileInfoColumnTitle">
                                {column.title}
                              </h4>
                              <div className="Home_Noga_profileInfoColumnGrid">
                                {column.rows.map(renderAboutProfileField)}
                              </div>
                            </section>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const allEvents = Array.isArray(localProfileEvents)
                            ? localProfileEvents
                            : Array.isArray(props.state?.profile_events)
                              ? props.state.profile_events
                              : [];
                          const ownEvents = allEvents.filter(
                            (e) => e?._isOwn !== false && !e?._ownerName,
                          );
                          const friendEvents = allEvents.filter(
                            (e) => e?._isOwn === false || Boolean(e?._ownerName),
                          );
                          const profileEvents =
                            eventsTab === "friends" ? friendEvents : ownEvents;
                          return (
                            <>
                              <div className="Home_Noga_eventsHeaderWrapper">
                                <div className="Home_Noga_activeTab_title">
                                  <div className="Home_Noga_activeTab_titleTitleRow">
                                    <h3>Events</h3>
                                    <span className="Home_Noga_socialFriendsCount">
                                      {profileEvents.length}
                                    </span>
                                  </div>
                                  <div className="Home_Noga_activeTab_titleActions">
                                    <button
                                      type="button"
                                      className="Home_Noga_aboutButton Home_Noga_aboutToggle"
                                      disabled={isFetchingEvents}
                                      onClick={fetchProfileEvents}
                                    >
                                      {isFetchingEvents ? "…" : <i className="fi fi-sc-refresh" />}
                                    </button>
                                    <button
                                      type="button"
                                      className="Home_Noga_aboutButton Home_Noga_aboutToggle"
                                      onClick={() => setIsAboutOpen((v) => !v)}
                                      aria-pressed={isAboutOpen}
                                    >
                                      Profile
                                    </button>
                                  </div>
                                </div>
                                <div className="Home_Noga_eventsTabBar">
                                  <button
                                    type="button"
                                    className={`Home_Noga_eventsTab${eventsTab === "mine" ? " isActive" : ""}`}
                                    onClick={() => setEventsTab("mine")}
                                  >
                                    Mine
                                    {ownEvents.length > 0 && (
                                      <span className="Home_Noga_eventsTabCount">{ownEvents.length}</span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className={`Home_Noga_eventsTab${eventsTab === "friends" ? " isActive" : ""}`}
                                    onClick={() => setEventsTab("friends")}
                                  >
                                    My Friends
                                    {friendEvents.length > 0 && (
                                      <span className="Home_Noga_eventsTabCount">{friendEvents.length}</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="Home_Noga_eventsContentWrapper">
                              {profileEvents.length > 0 ? (
                                <ul className="Home_Noga_eventsList">
                                  {profileEvents.map((event, eventIndex) => {
                                    const isOwn = event?._isOwn !== false && !event?._ownerName;
                                    const eventTitle = String(
                                      event?.eventTitle || "",
                                    ).trim();
                                    const eventText = String(
                                      event?.eventBody?.eventText || "",
                                    ).trim();
                                    const eventDate = event?.eventFooter?.eventDatePosted
                                      ? new Date(event.eventFooter.eventDatePosted).toLocaleString(
                                          undefined,
                                          {
                                            year: "numeric",
                                            month: "short",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          },
                                        )
                                      : "";
                                    const footerFirst = String(
                                      event?.eventFooter?.eventUserName?.firstName || "",
                                    ).trim();
                                    const footerLast = String(
                                      event?.eventFooter?.eventUserName?.lastName || "",
                                    ).trim();
                                    const ownerFirst = String(
                                      event?._ownerName?.firstName || footerFirst,
                                    ).trim();
                                    const ownerLast = String(
                                      event?._ownerName?.lastName || footerLast,
                                    ).trim();
                                    const authorName = [ownerFirst, ownerLast]
                                      .filter(Boolean)
                                      .join(" ");
                                    const imageUrls = Array.isArray(
                                      event?.eventBody?.eventImagesURLs,
                                    )
                                      ? event.eventBody.eventImagesURLs
                                      : [];
                                    return (
                                      <li
                                        key={event?._id || eventIndex}
                                        className={`Home_Noga_eventItem${event?.eventClass ? ` Home_Noga_eventItem--${event.eventClass}` : ""}${isOwn ? "" : " Home_Noga_eventItem--friend"}`}
                                      >
                                        <div className="Home_Noga_eventItemTopRow">
                                          {eventTitle ? (
                                            <p className="Home_Noga_eventItemTitle">
                                              {eventTitle}
                                            </p>
                                          ) : null}
                                          {isOwn ? (
                                          <button
                                            type="button"
                                            className="Home_Noga_eventItemDeleteBtn"
                                            aria-label="Delete event"
                                            disabled={deletingEventIds.has(String(event?._id || ""))}
                                            onClick={async () => {
                                              const eventId = String(event?._id || "").trim();
                                              if (!eventId) return;
                                              setDeletingEventIds((prev) => new Set([...prev, eventId]));
                                              try {
                                                const myId = String(props.state?.my_id || "").trim();
                                                const token = String(props.state?.token || "").trim();
                                                const response = await fetch(
                                                  apiUrl(`/api/user/profileEvents/${myId}/${eventId}`),
                                                  { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
                                                );
                                                if (response.ok) {
                                                  setLocalProfileEvents((prev) =>
                                                    Array.isArray(prev)
                                                      ? prev.filter((e) => String(e?._id || "") !== eventId)
                                                      : prev,
                                                  );
                                                  if (typeof props.removeProfileEvent === "function") {
                                                    props.removeProfileEvent(eventId);
                                                  }
                                                }
                                              } finally {
                                                setDeletingEventIds((prev) => {
                                                  const next = new Set(prev);
                                                  next.delete(String(event?._id || ""));
                                                  return next;
                                                });
                                              }
                                            }}
                                          >
                                            {deletingEventIds.has(String(event?._id || "")) ? "…" : <i className="fi fi-br-cross-small" aria-hidden="true" />}
                                          </button>
                                          ) : null}
                                        </div>
                                        <div className="Home_Noga_eventItemHeader">
                                          {authorName ? (
                                            <span className="Home_Noga_eventItemAuthor">
                                              {authorName}
                                            </span>
                                          ) : null}
                                          {eventDate ? (
                                            <span className="Home_Noga_eventItemDate">
                                              {eventDate}
                                            </span>
                                          ) : null}
                                        </div>
                                        {eventText ? (
                                          <div className="Home_Noga_eventItemText">
                                            {eventText.split("\n").map((line, lineIndex) => {
                                              const bulletMatch = line.match(/^-\s+([^:]+):\s*(.*)/);
                                              if (bulletMatch) {
                                                return (
                                                  <div key={lineIndex} className="Home_Noga_eventItemBullet">
                                                    <span className="Home_Noga_eventItemKey">{bulletMatch[1]}:</span>
                                                    <span className="Home_Noga_eventItemValue">{bulletMatch[2]}</span>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <p key={lineIndex} className="Home_Noga_eventItemLine">
                                                  {line}
                                                </p>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                        {imageUrls.length > 0 ? (
                                          <div className="Home_Noga_eventItemImages">
                                            {imageUrls.map((url, imgIndex) => (
                                              <img
                                                key={url + imgIndex}
                                                src={url}
                                                alt=""
                                                className="Home_Noga_eventItemImage"
                                              />
                                            ))}
                                          </div>
                                        ) : null}
                                        {(() => {
                                          const eventId = String(event?._id || "");
                                          const ownerId = String(event?._ownerId || props.state?.my_id || "");
                                          const replies = Array.isArray(event?.eventReplies)
                                            ? event.eventReplies
                                            : [];
                                          const isReplyOpen = replyOpenIds.has(eventId);
                                          const isSubmitting = submittingReplyIds.has(eventId);
                                          return (
                                            <div className="Home_Noga_eventReplySection">
                                              {replies.length > 0 && (
                                                <ul className="Home_Noga_eventRepliesList">
                                                  {replies.map((reply, rIdx) => {
                                                    const rFirst = String(reply?.eventReplyFooter?.eventReplyUserName?.firstName || "").trim();
                                                    const rLast = String(reply?.eventReplyFooter?.eventReplyUserName?.lastName || "").trim();
                                                    const rAuthor = [rFirst, rLast].filter(Boolean).join(" ");
                                                    const rDate = reply?.eventReplyFooter?.eventReplyDatePosted
                                                      ? new Date(reply.eventReplyFooter.eventReplyDatePosted).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                                                      : "";
                                                    const rText = String(reply?.eventReplyBody?.eventReplyText || "").trim();
                                                    const rDirection = ARABIC_TEXT_PATTERN.test(rText)
                                                      ? "rtl"
                                                      : "ltr";
                                                    return (
                                                      <li key={reply?._id || rIdx} className="Home_Noga_eventReplyItem">
                                                        <div className="Home_Noga_eventReplyMeta">
                                                          {rAuthor && <span className="Home_Noga_eventReplyAuthor">{rAuthor}</span>}
                                                          {rDate && <span className="Home_Noga_eventReplyDate">{rDate}</span>}
                                                        </div>
                                                        {rText ? (
                                                          <p
                                                            className={`Home_Noga_eventReplyText${rDirection === "rtl" ? " Home_Noga_eventReplyText--rtl" : ""}`}
                                                            dir={rDirection}
                                                          >
                                                            {rText}
                                                          </p>
                                                        ) : null}
                                                      </li>
                                                    );
                                                  })}
                                                </ul>
                                              )}
                                              <div className="Home_Noga_eventReplyBar">
                                                <button
                                                  type="button"
                                                  className={`Home_Noga_eventReplyToggle${isReplyOpen ? " isOpen" : ""}`}
                                                  onClick={() => setReplyOpenIds((prev) => {
                                                    const next = new Set(prev);
                                                    next.has(eventId) ? next.delete(eventId) : next.add(eventId);
                                                    return next;
                                                  })}
                                                >
                                                  {replies.length > 0
                                                    ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}`
                                                    : "Reply"}
                                                </button>
                                              </div>
                                              {isReplyOpen && (
                                                <div className="Home_Noga_eventReplyCompose">
                                                  <textarea
                                                    className="Home_Noga_eventReplyInput"
                                                    placeholder="Write a reply…"
                                                    rows={2}
                                                    value={replyTexts[eventId] || ""}
                                                    onChange={(e) => setReplyTexts((prev) => ({ ...prev, [eventId]: e.target.value }))}
                                                    disabled={isSubmitting}
                                                  />
                                                  <button
                                                    type="button"
                                                    className="Home_Noga_eventReplySend"
                                                    disabled={isSubmitting || !String(replyTexts[eventId] || "").trim()}
                                                    onClick={async () => {
                                                      const text = String(replyTexts[eventId] || "").trim();
                                                      if (!text || !eventId || !ownerId) return;
                                                      const token = String(props.state?.token || "").trim();
                                                      setSubmittingReplyIds((prev) => new Set([...prev, eventId]));
                                                      try {
                                                        const response = await fetch(
                                                          apiUrl(`/api/user/profileEvents/${ownerId}/${eventId}/reply`),
                                                          {
                                                            method: "POST",
                                                            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                                            body: JSON.stringify({ eventReplyText: text }),
                                                          },
                                                        );
                                                        const payload = await response.json().catch(() => ({}));
                                                        if (response.ok && payload?.reply) {
                                                          setLocalProfileEvents((prev) =>
                                                            Array.isArray(prev)
                                                              ? prev.map((ev) =>
                                                                  String(ev?._id || "") === eventId
                                                                    ? { ...ev, eventReplies: [...(Array.isArray(ev.eventReplies) ? ev.eventReplies : []), payload.reply] }
                                                                    : ev,
                                                                )
                                                              : prev,
                                                          );
                                                          setReplyTexts((prev) => ({ ...prev, [eventId]: "" }));
                                                          setReplyOpenIds((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
                                                        }
                                                      } finally {
                                                        setSubmittingReplyIds((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
                                                      }
                                                    }}
                                                  >
                                                    {isSubmitting ? "Sending…" : "Send"}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <div className="Home_Noga_friendsEventsEmpty">
                                  There are no events to show.
                                </div>
                              )}
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
	                </div>
	              </div>
	            </div>
	              <section
	                id="Home_Noga_rightColumn_wrapper"
	                className="Home_Noga_socialFriendsPanel"
	              >
	                {isReportsWrapperOpen ? null : (
	                  <>
	                    {activeFriendCard?.chatId ? (
		                      <FriendChat
		                        state={activeFriendChatState}
		                        content={HOME_CHAT_CONTENT}
		                        sendToThemMessage={props.sendToThemMessage}
                            serverReply={props.serverReply}
		                        uploadChatImages={props.uploadChatImages}
                            uploadChatAudio={props.uploadChatAudio}
		                        saveChatImageToGallery={props.saveChatImageToGallery}
		                        updateMyTypingPresence={props.updateMyTypingPresence}
		                        markMessagesRead={props.markMessagesRead}
	                        requestGlobalCall={props.requestGlobalCall}
	                        globalCallSession={props.state?.global_call_session}
	                        closeActiveChat={() => {
	                          setInlineCallActionsTarget(null);
	                          setOpenChatFriendId(null);
	                          props.closeActiveChat?.();
	                        }}
	                        inlineCallActionsTarget={inlineCallActionsTarget}
	                      />
	                    ) : (
                      <>
                        <div className="Home_Noga_friendsPanelHeader">
                          <div
                            className="Home_Noga_friendsPanelTitleRow"
                            style={{
                              "--home-right-panel-tab-count":
                                rightPanelTabs.length,
                              "--home-right-panel-tab-index":
                                activeRightPanelTabIndex,
                            }}
                          >
                            <span
                              className="Home_Noga_friendsPanelTitleRowSelector"
                              aria-hidden="true"
                            ></span>
                            {rightPanelTabs.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                className={`Home_Noga_friendsPanelTitle Home_Noga_friendsPanelTitleButton${activeFriendsPanelTab === tab.id ? " isActive" : ""}`}
                                onClick={() => {
                                  setActiveFriendsPanelTab(tab.id);
                                }}
                                aria-pressed={activeFriendsPanelTab === tab.id}
                                title={tab.label}
                              >
                                {tab.icon ? (
                                  <i className={tab.icon} />
                                ) : (
                                  tab.label
                                )}{" "}
                                <span className="Home_Noga_friendsPanelCount">
                                  {tab.count}
                                </span>
                              </button>
                            ))}
                          </div>
                          {renderFriendSearchPanel()}
                        </div>
                        {activeFriendsPanelTab === "friends" ? (
                          friendSearchQuery.trim() ? (
                            <ul className="Home_Noga_friendsList Home_Noga_socialDirectoryResults">
                              {activeFriendsPanelSearchResults.length > 0 ? (
                                activeFriendsPanelSearchResults.map(
                                  renderSearchedUserListItem,
                                )
                              ) : (
                                <li className="Home_Noga_socialFriendsEmptyState">
                                  {activeFriendsPanelSearchEmptyMessage}
                                </li>
                              )}
                            </ul>
                          ) : (
                          <ul className="Home_Noga_friendsList">
                            {chatFriends.length > 0 ? (
                              chatFriends.map(renderFriendListItem)
                            ) : (
                              <li className="Home_Noga_socialFriendsEmptyState">
                                No friends right now.
                              </li>
                            )}
                          </ul>
                          )
                        ) : friendSearchQuery.trim() ? (
                          <ul
                            id="Home_Noga_requestsBlocklistPanel"
                            className="Home_Noga_friendsList Home_Noga_socialDirectoryResults"
                          >
                            {activeFriendsPanelSearchResults.length > 0 ? (
                              activeFriendsPanelSearchResults.map(
                                renderSearchedUserListItem,
                              )
                            ) : (
                              <li className="Home_Noga_socialFriendsEmptyState">
                                {activeFriendsPanelSearchEmptyMessage}
                              </li>
                            )}
                          </ul>
                        ) : (
                          <ul
                            id="Home_Noga_requestsBlocklistPanel"
                            className="Home_Noga_friendsList Home_Noga_socialDirectoryResults"
                          >
                            {activeFriendsPanelTab === "requests" ? (
                              requestsPanelEntries.length > 0 ? (
                                requestsPanelEntries.map(
                                  renderBlockedUserListItem,
                                )
                              ) : (
                                <li className="Home_Noga_socialFriendsEmptyState">
                                  No requests to show yet.
                                </li>
                              )
                            ) : blocklistPanelEntries.length > 0 ? (
                              blocklistPanelEntries.map(
                                renderBlockedUserListItem,
                              )
                            ) : (
                              <li className="Home_Noga_socialFriendsEmptyState">
                                No blocked friends or users to show yet.
                              </li>
                            )}
                          </ul>
                        )}
                      </>
                    )}
                  </>
                )}
              </section>
            {/* /Home_Noga_preStart_leftPanel */}
          <section
            className={`fc Home_Noga_preStart_reports${isReportsWrapperOpen ? "" : " Home_Noga_preStart_reports--closed"}`}
          >
            <div className="Home_Noga_settingsBackRow">
              <button
                type="button"
                className="Home_Noga_settingsBackButton"
                onClick={() => setIsReportsWrapperOpen(false)}
                aria-label="Back from settings"
                title="Back"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
            </div>
            <div className="fc Home_Noga_preStart_reportCard Home_Noga_preStart_reportsCard">
              <div className="Home_Noga_gallery_Header_wrapper">
                <h3>Log Record: Date and Time</h3>
                <div className="Home_Noga_gallery_Header_wrapperActions">
                  <button
                    type="button"
                    className="Home_Noga_reportDeleteButton"
                    onClick={clearLoginLog}
                    disabled={isLoginLogDeleting}
                    aria-label="Delete all login log entries"
                    title="Delete all login log entries"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <button
                    type="button"
                    className="Home_Noga_reportToggleButton"
                    onClick={() => toggleReportSection("loginLog")}
                    aria-label="Toggle login log"
                    aria-expanded={isReportSectionOpen("loginLog")}
                    title="Toggle login log"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("loginLog") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>
              </div>
              <div
                className={`Home_Noga_reportBody fc${isReportSectionOpen("loginLog") ? " isOpen" : ""}`}
              >
                <ul className="fc Home_Noga_studySessions_area">
                  {loginLogError ? (
                    <div>{loginLogError}</div>
                  ) : activeLoginRecord === null ? (
                    <div>No login records to show yet</div>
                  ) : (
                    (() => {
                      const loggedInAt = new Date(activeLoginRecord.loggedInAt);
                      const loggedOutAt = activeLoginRecord.loggedOutAt
                        ? new Date(activeLoginRecord.loggedOutAt)
                        : null;

                      return (
                        <li
                          key={
                            activeLoginRecord._id ||
                            activeLoginRecord.loggedInAt ||
                            loginLogIndex
                          }
                          className="Home_Noga_logRecordViewer"
                        >
                          <button
                            type="button"
                            className="Home_Noga_logRecordArrow"
                            onClick={() =>
                              setLoginLogIndex((currentIndex) =>
                                Math.max(currentIndex - 1, 0),
                              )
                            }
                            disabled={loginLogIndex === 0}
                            aria-label="Show newer login record"
                            title="Show newer login record"
                          >
                            <i className="fas fa-angle-up"></i>
                          </button>
                          <div className="Home_Noga_logRecordCard">
                            <div className="Home_Noga_logRecordEntry">
                              <span className="Home_Noga_logRecordLabel">
                                Login:
                              </span>
                              <span className="Home_Noga_logRecordValue">
                                {loggedInAt.toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}{" "}
                                {loggedInAt.toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="Home_Noga_logRecordEntry">
                              <span className="Home_Noga_logRecordLabel">
                                Logout:
                              </span>
                              <span className="Home_Noga_logRecordValue">
                                {loggedOutAt
                                  ? `${loggedOutAt.toLocaleDateString(
                                      undefined,
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      },
                                    )} ${loggedOutAt.toLocaleTimeString(
                                      undefined,
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      },
                                    )}`
                                  : "Still active"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="Home_Noga_logRecordArrow"
                            onClick={() =>
                              setLoginLogIndex((currentIndex) =>
                                Math.min(
                                  currentIndex + 1,
                                  loginRecords.length - 1,
                                ),
                              )
                            }
                            disabled={loginLogIndex === loginRecords.length - 1}
                            aria-label="Show older login record"
                            title="Show older login record"
                          >
                            <i className="fas fa-angle-down"></i>
                          </button>
                        </li>
                      );
                    })()
                  )}
                </ul>
              </div>
            </div>

            {isVisitLogOwner ? (
              <div className="fc Home_Noga_preStart_reportCard Home_Noga_preStart_reportsCard">
                <div className="Home_Noga_gallery_Header_wrapper">
                  <h3>Visit Log: App Entries</h3>
                  <div className="Home_Noga_gallery_Header_wrapperActions">
                    <button
                      type="button"
                      className="Home_Noga_reportDeleteButton"
                      onClick={clearVisitLog}
                      disabled={isVisitLogDeleting}
                      aria-label="Delete all visit log entries"
                      title="Delete all visit log entries"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    <button
                      type="button"
                      className="Home_Noga_reportToggleButton"
                      onClick={() => toggleReportSection("visitLog")}
                      aria-label="Toggle visit log"
                      aria-expanded={isReportSectionOpen("visitLog")}
                      title="Toggle visit log"
                    >
                      <i
                        className={`fas ${isReportSectionOpen("visitLog") ? "fa-chevron-up" : "fa-chevron-down"}`}
                      ></i>
                    </button>
                  </div>
                </div>
                <div
                  className={`Home_Noga_reportBody fc${isReportSectionOpen("visitLog") ? " isOpen" : ""}`}
                >
                  <ul className="fc Home_Noga_studySessions_area">
                    {isVisitLogLoading ? (
                      <div>Loading visit log...</div>
                    ) : visitLogError ? (
                      <div>{visitLogError}</div>
                    ) : activeVisitLogRecord === null ? (
                      <div>No visit records to show yet</div>
                    ) : (
                      (() => {
                        const visitedAt = new Date(
                          activeVisitLogRecord.visitedAt,
                        );

                        return (
                          <li
                            key={`${activeVisitLogRecord._id || activeVisitLogRecord.ip || "visit"}-${activeVisitLogRecord.visitedAt || visitLogIndex}`}
                            className="Home_Noga_logRecordViewer"
                          >
                            <button
                              type="button"
                              className="Home_Noga_logRecordArrow"
                              onClick={() =>
                                setVisitLogIndex((currentIndex) =>
                                  Math.max(currentIndex - 1, 0),
                                )
                              }
                              disabled={visitLogIndex === 0}
                              aria-label="Show newer visit record"
                              title="Show newer visit record"
                            >
                              <i className="fas fa-angle-up"></i>
                            </button>
                            <div className="Home_Noga_logRecordCard Home_Noga_logRecordCard--stacked">
                              <div className="Home_Noga_logRecordEntry">
                                <span className="Home_Noga_logRecordLabel">
                                  IP:
                                </span>
                                <span className="Home_Noga_logRecordValue">
                                  {`${activeVisitLogRecord.ip || "Unknown IP"} (${activeVisitLogRecord.country || "Unknown"})`}
                                </span>
                              </div>
                              <div className="Home_Noga_logRecordEntry">
                                <span className="Home_Noga_logRecordLabel">
                                  Visited:
                                </span>
                                <span className="Home_Noga_logRecordValue">
                                  {visitedAt.toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}{" "}
                                  {visitedAt.toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="Home_Noga_logRecordArrow"
                              onClick={() =>
                                setVisitLogIndex((currentIndex) =>
                                  Math.min(
                                    currentIndex + 1,
                                    visitLogEntries.length - 1,
                                  ),
                                )
                              }
                              disabled={
                                visitLogIndex === visitLogEntries.length - 1
                              }
                              aria-label="Show older visit record"
                              title="Show older visit record"
                            >
                              <i className="fas fa-angle-down"></i>
                            </button>
                          </li>
                        );
                      })()
                    )}
                  </ul>
                </div>
              </div>
            ) : null}

            {isVisitLogOwner ? (
              <div className="fc Home_Noga_preStart_reportsCard">
                <div className="Home_Noga_gallery_Header_wrapper">
                  <h3>naghamtrkmani course letter</h3>
                  <button
                    type="button"
                    className="Home_Noga_reportToggleButton"
                    onClick={() => toggleReportSection("naghamLetter")}
                    aria-label="Toggle Nagham course letter"
                    aria-expanded={isReportSectionOpen("naghamLetter")}
                    title="Toggle Nagham course letter"
                  >
                    <i
                      className={`fas ${isReportSectionOpen("naghamLetter") ? "fa-chevron-up" : "fa-chevron-down"}`}
                    ></i>
                  </button>
                </div>
                <div
                  className={`Home_Noga_reportBody fc${isReportSectionOpen("naghamLetter") ? " isOpen" : ""}`}
                >
                  <div id="Home_Noga_naghamCourseLetter_div" className="fc">
                    <select
                      id="Home_Noga_naghamCourseLetter_select"
                      value={selectedNaghamCourseId}
                      onChange={(event) => {
                        const nextCourseId = event.target.value;
                        setSelectedNaghamCourseId(nextCourseId);
                        setNaghamCourseLetterInput(
                          naghamCourseLetters[nextCourseId] ||
                            DEFAULT_NAGHAM_COURSE_LETTER,
                        );
                        if (naghamCourseLetterFeedback) {
                          setNaghamCourseLetterFeedback("");
                        }
                      }}
                    >
                      {naghamCourseOptions.length === 0 ? (
                        <option value="">No Nagham courses found</option>
                      ) : null}
                      {naghamCourseOptions.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                    <textarea
                      id="Home_Noga_naghamCourseLetter_textarea"
                      value={naghamCourseLetterInput}
                      onChange={(event) => {
                        setNaghamCourseLetterInput(event.target.value);
                        if (naghamCourseLetterFeedback) {
                          setNaghamCourseLetterFeedback("");
                        }
                      }}
                      placeholder="Write the printed letter for the selected Nagham course"
                      rows={5}
                    />
                    <button
                      type="button"
                      className="Home_Noga_changePasswordSubmit"
                      onClick={saveNaghamCourseLetter}
                    >
                      Save note
                    </button>
                    {naghamCourseLetterFeedback ? (
                      <p className="Home_Noga_passwordFeedback Home_Noga_passwordFeedback--success">
                        {naghamCourseLetterFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="fc Home_Noga_preStart_reportsCard">
              <div className="Home_Noga_gallery_Header_wrapper">
                <h3>planner music playlist</h3>
                <button
                  type="button"
                  className="Home_Noga_reportToggleButton"
                  onClick={() => toggleReportSection("musicPlaylist")}
                  aria-label="Toggle planner music playlist"
                  aria-expanded={isReportSectionOpen("musicPlaylist")}
                  title="Toggle planner music playlist"
                >
                  <i
                    className={`fas ${isReportSectionOpen("musicPlaylist") ? "fa-chevron-up" : "fa-chevron-down"}`}
                  ></i>
                </button>
              </div>
              <div
                className={`Home_Noga_reportBody fc${isReportSectionOpen("musicPlaylist") ? " isOpen" : ""}`}
              >
                <div id="Home_Noga_musicArchivePlaylist_div" className="fc">
                  <div className="Home_Noga_musicLibraryCompact">
                    <div className="Home_Noga_musicApiHeader">
                      <strong>Music library</strong>
                      <span>One compact place for all music sources</span>
                    </div>

                    <div className="Home_Noga_musicLibraryMainRow">
                      <div className="Home_Noga_musicLibraryUnifiedSearch">
                        <div className="Home_Noga_musicLibraryUnifiedSearchContent">
                          <div className="Home_Noga_musicArchiveSearch_row">
                            <input
                              id="Home_Noga_musicLibrarySongSearch_input"
                              type="search"
                              value={musicLibrarySongQuery}
                              onChange={(event) => {
                                setMusicLibrarySongQuery(event.target.value);
                                if (musicLibrarySearchFeedback) {
                                  setMusicLibrarySearchFeedback("");
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  searchAllMusicLibrarySources();
                                }
                              }}
                              placeholder="Search by song"
                            />
                            <input
                              id="Home_Noga_musicLibraryArtistSearch_input"
                              type="search"
                              value={musicLibraryArtistQuery}
                              onChange={(event) => {
                                setMusicLibraryArtistQuery(event.target.value);
                                if (musicLibrarySearchFeedback) {
                                  setMusicLibrarySearchFeedback("");
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  searchAllMusicLibrarySources();
                                }
                              }}
                              placeholder="Search by artist"
                            />
                            <button
                              type="button"
                              className="Home_Noga_changePasswordSubmit"
                              onClick={searchAllMusicLibrarySources}
                              disabled={isMusicLibrarySearching}
                            >
                              {isMusicLibrarySearching
                                ? "Searching..."
                                : "Search"}
                            </button>
                          </div>
                          {musicLibrarySearchFeedback ? (
                            <p className="Home_Noga_passwordFeedback Home_Noga_passwordFeedback--success">
                              {musicLibrarySearchFeedback}
                            </p>
                          ) : null}
                        </div>
                        <ul
                          id="Home_Noga_musicLibraryPlaylist_ul"
                          className="fc"
                        >
                          {musicLibraryPlaylistItems.length > 0 ? (
                            musicLibraryPlaylistItems.map((item) => (
                              <li
                                key={item.id}
                                className="Home_Noga_musicLibraryPlaylist_item"
                              >
                                <div className="Home_Noga_musicLibraryPlaylist_copy">
                                  <strong>{item.label}</strong>
                                  <div className="Home_Noga_musicArchiveSearch_meta">
                                    <span>
                                      {item.meta || "Added to playlist"}
                                    </span>
                                    <em className="Home_Noga_musicArchiveSearch_sourceTag">
                                      {item.source}
                                    </em>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="Home_Noga_musicLibraryPlaylist_delete"
                                  onClick={() =>
                                    removeMusicLibraryPlaylistItem(
                                      item.provider,
                                      item.value,
                                    )
                                  }
                                  aria-label={`Delete ${item.label} from playlist`}
                                  title="Delete from playlist"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="Home_Noga_musicLibraryPlaylist_empty">
                              Added songs will appear here.
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="Home_Noga_musicLibraryCompactSections">
                        <section className="Home_Noga_musicLibrarySource">
                          <div className="Home_Noga_musicLibrarySourceHeader">
                            <strong>Search results</strong>
                            <span>Song name | Artist name | Source</span>
                          </div>
                          <div
                            id="Home_Noga_musicArchiveSearch_div"
                            className="fc"
                          >
                            {musicLibrarySearchResults.length > 0 ? (
                              <ul
                                id="Home_Noga_musicArchiveSearch_results"
                                className="fc"
                              >
                                {musicLibrarySearchResults.map((result) => (
                                  <li
                                    key={result.id}
                                    className="Home_Noga_musicArchiveSearch_result"
                                    onClick={() => {
                                      if (result.provider === "itunes") {
                                        addITunesSong(result.value);
                                      } else if (
                                        result.provider === "musicBrainz"
                                      ) {
                                        addMusicBrainzSong(result.value);
                                      } else {
                                        addMusicArchiveSong(result.value);
                                      }
                                    }}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        if (result.provider === "itunes") {
                                          addITunesSong(result.value);
                                        } else if (
                                          result.provider === "musicBrainz"
                                        ) {
                                          addMusicBrainzSong(result.value);
                                        } else {
                                          addMusicArchiveSong(result.value);
                                        }
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    title={`${result.title} | ${result.artist} | ${result.source}`}
                                  >
                                    <strong>
                                      {result.title} | {result.artist} |{" "}
                                      {result.source}
                                    </strong>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="Home_Noga_changePasswordSubmit"
                    onClick={saveMusicArchivePlaylist}
                  >
                    Save music API settings
                  </button>
                  {musicArchivePlaylistFeedback ? (
                    <p className="Home_Noga_passwordFeedback Home_Noga_passwordFeedback--success">
                      {musicArchivePlaylistFeedback}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="fc Home_Noga_preStart_reportsCard">
              <div className="Home_Noga_gallery_Header_wrapper">
                <h3>schoolplanner telegram</h3>
                <button
                  type="button"
                  className="Home_Noga_reportToggleButton"
                  onClick={() => toggleReportSection("telegram")}
                  aria-label="Toggle schoolplanner telegram"
                  aria-expanded={isReportSectionOpen("telegram")}
                  title="Toggle schoolplanner telegram"
                >
                  <i
                    className={`fas ${isReportSectionOpen("telegram") ? "fa-chevron-up" : "fa-chevron-down"}`}
                  ></i>
                </button>
              </div>
              <div
                className={`Home_Noga_reportBody fc${isReportSectionOpen("telegram") ? " isOpen" : ""}`}
              >
                <div id="Home_Noga_schoolPlannerTelegram_div" className="fc">
                  {schoolPlannerTelegramFeedback ? (
                    <p className="Home_Noga_passwordFeedback Home_Noga_passwordFeedback--success">
                      {schoolPlannerTelegramFeedback}
                    </p>
                  ) : null}
                  <div
                    id="Home_Noga_schoolPlannerTelegram_adminDiv"
                    className="fc"
                  >
                    <label className="Home_Noga_userMenu_title_label">
                      telegram mtproto config
                    </label>
                    <p className="Home_Noga_schoolPlannerTelegram_adminStatus">
                      {telegramConfigStatus.configured
                        ? "Your Telegram connection is saved for this account."
                        : "Your Telegram connection is not complete yet."}
                    </p>
                    <div className="Home_Noga_schoolPlannerTelegram_adminFlags">
                      <span>
                        API ID:{" "}
                        {telegramConfigStatus.hasApiId ? "set" : "missing"}
                      </span>
                      <span>
                        API Hash:{" "}
                        {telegramConfigStatus.hasApiHash ? "set" : "missing"}
                      </span>
                      <span>
                        Session:{" "}
                        {telegramConfigStatus.hasStringSession
                          ? "set"
                          : "missing"}
                      </span>
                    </div>
                    <input
                      id="Home_Noga_schoolPlannerTelegram_apiId_input"
                      type="text"
                      value={telegramApiIdInput}
                      onChange={(event) => {
                        setTelegramApiIdInput(event.target.value);
                        if (telegramConfigFeedback) {
                          setTelegramConfigFeedback("");
                        }
                      }}
                      placeholder="TELEGRAM_API_ID"
                    />
                    <input
                      id="Home_Noga_schoolPlannerTelegram_apiHash_input"
                      type="text"
                      value={telegramApiHashInput}
                      onChange={(event) => {
                        setTelegramApiHashInput(event.target.value);
                        if (telegramConfigFeedback) {
                          setTelegramConfigFeedback("");
                        }
                      }}
                      placeholder="TELEGRAM_API_HASH"
                    />
                    <input
                      id="Home_Noga_schoolPlannerTelegram_phone_input"
                      type="text"
                      value={telegramPhoneNumberInput}
                      onChange={(event) => {
                        setTelegramPhoneNumberInput(event.target.value);
                        if (telegramConfigFeedback) {
                          setTelegramConfigFeedback("");
                        }
                      }}
                      placeholder="Telegram phone number with country code"
                    />
                    <button
                      type="button"
                      className="Home_Noga_changePasswordSubmit"
                      onClick={startTelegramAuth}
                    >
                      Send Telegram code
                    </button>
                    {telegramAuthStage === "code" ||
                    telegramAuthStage === "password" ||
                    telegramAuthStage === "connected" ? (
                      <>
                        {/* Removed: Clear All Pending Uploads button and feedback (handler no longer exists) */}
                        <input
                          id="Home_Noga_schoolPlannerTelegram_code_input"
                          type="text"
                          value={telegramPhoneCodeInput}
                          onChange={(event) => {
                            setTelegramPhoneCodeInput(event.target.value);
                            if (telegramConfigFeedback) {
                              setTelegramConfigFeedback("");
                            }
                          }}
                          placeholder="Telegram login code"
                        />
                        <button
                          type="button"
                          className="Home_Noga_changePasswordSubmit"
                          onClick={verifyTelegramCode}
                        >
                          Verify code
                        </button>
                      </>
                    ) : null}
                    {telegramAuthStage === "password" ? (
                      <>
                        <input
                          id="Home_Noga_schoolPlannerTelegram_password_input"
                          type="password"
                          value={telegramPasswordInput}
                          onChange={(event) => {
                            setTelegramPasswordInput(event.target.value);
                            if (telegramConfigFeedback) {
                              setTelegramConfigFeedback("");
                            }
                          }}
                          placeholder="Telegram 2-step password if needed"
                        />
                        <button
                          type="button"
                          className="Home_Noga_changePasswordSubmit"
                          onClick={verifyTelegramPassword}
                        >
                          Verify password
                        </button>
                      </>
                    ) : null}
                    <p className="Home_Noga_schoolPlannerTelegram_adminStatus">
                      {telegramAuthStage === "password"
                        ? "Telegram is asking for the 2-step verification password."
                        : telegramAuthStage === "connected"
                          ? "Telegram login is connected for this account."
                          : "Start with API ID, API Hash, and phone number."}
                    </p>
                    {telegramConfigFeedback ? (
                      <p className="Home_Noga_passwordFeedback Home_Noga_passwordFeedback--success">
                        {telegramConfigFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="fc Home_Noga_preStart_reportsCard">
              <div className="Home_Noga_gallery_Header_wrapper">
                <h3>Graphic Control</h3>
                <button
                  type="button"
                  className="Home_Noga_reportToggleButton"
                  onClick={() => toggleReportSection("graphicControl")}
                  aria-label="Toggle graphic control"
                  aria-expanded={isReportSectionOpen("graphicControl")}
                  title="Toggle graphic control"
                >
                  <i
                    className={`fas ${isReportSectionOpen("graphicControl") ? "fa-chevron-up" : "fa-chevron-down"}`}
                  ></i>
                </button>
              </div>
              <div
                className={`Home_Noga_reportBody fc${isReportSectionOpen("graphicControl") ? " isOpen" : ""}`}
              >
                <div className="fc Home_Noga_graphicControlCard">
                  <label className="Home_Noga_preStart_toggleRow">
                    <input
                      type="checkbox"
                      checked={schoolPlannerReducedMotion}
                      onChange={(event) =>
                        setSchoolPlannerReducedMotion(event.target.checked)
                      }
                    />
                    <span>Reduce School Planner motion</span>
                  </label>
                  <label className="fc Home_Noga_graphicControlField">
                    <span>PhenoMed Social chat background (Chat_messages)</span>
                    <input
                      type="text"
                      value={phenomedSocialChatBackground}
                      onChange={(event) =>
                        setPhenomedSocialChatBackground(event.target.value)
                      }
                      placeholder="Image URL for chat panel background"
                    />
                  </label>
                  <button
                    type="button"
                    className="Home_Noga_changePasswordToggle"
                    onClick={() => setPhenomedSocialChatBackground("")}
                  >
                    Clear chat background
                  </button>
                </div>
              </div>
            </div>

            <div
              className="fc Home_Noga_preStart_reportsCard"
              id="Home_Noga_userMenu_panelCard"
              ref={controlPanelCardRef}
            >
              <div className="Home_Noga_gallery_Header_wrapper">
                <h3>Control Panel</h3>
                <button
                  type="button"
                  className="Home_Noga_reportToggleButton"
                  onClick={() => toggleReportSection("controlPanel")}
                  aria-label="Toggle control panel"
                  aria-expanded={isReportSectionOpen("controlPanel")}
                  aria-controls="Home_Noga_userMenu_personalInfo_content_div"
                  title="Toggle control panel"
                >
                  <i
                    className={`fas ${isReportSectionOpen("controlPanel") ? "fa-chevron-up" : "fa-chevron-down"}`}
                  ></i>
                </button>
              </div>

              <div
                id="Home_Noga_userMenu_personalInfo_content_div"
                className={`fc Home_Noga_userMenu_panelBody${isReportSectionOpen("controlPanel") ? " isOpen" : ""}`}
              >
                {renderInlineInfoField("First name", "firstname")}
                {renderInlineInfoField("Last name", "lastname")}
                {renderInlineInfoField("Username", "username")}
                {renderInlineInfoField("Program", "program")}
                {renderInlineInfoField("University", "university")}
                {renderInlineInfoField("Year", "studyYear")}
                {renderInlineInfoField("Term", "term")}
                <div className="fr Home_Noga_userMenu_contentDivs">
                  <label>Password:</label>
                  <button
                    type="button"
                    className="Home_Noga_changePasswordToggle"
                    onClick={() => setIsPasswordFormOpen((current) => !current)}
                  >
                    {isPasswordFormOpen ? "Close" : "Change password"}
                  </button>
                </div>
                <div className="fr Home_Noga_userMenu_contentDivs">
                  <label>Footer:</label>
                  <button
                    type="button"
                    className="Home_Noga_changePasswordToggle"
                    onClick={() =>
                      props.setAppFooterHidden?.(!props.state?.hide_app_footer)
                    }
                  >
                    {props.state?.hide_app_footer
                      ? "Show footer"
                      : "Hide footer"}
                  </button>
                </div>

                {academicInfoFeedback.message ? (
                  <p
                    className={`Home_Noga_passwordFeedback Home_Noga_passwordFeedback--${academicInfoFeedback.tone || "info"}`}
                  >
                    {academicInfoFeedback.message}
                  </p>
                ) : null}
                {isAcademicInfoEditing ? (
                  <form
                    id="Home_Noga_editAcademicInfo_form"
                    className="fc"
                    onSubmit={handleAcademicInfoSave}
                    ref={academicInfoFormRef}
                  >
                    <input
                      type="text"
                      name="faculty"
                      placeholder="Faculty"
                      value={academicInfoFields.faculty}
                      onChange={updateAcademicInfoField}
                    />
                    <input
                      type="text"
                      name="program"
                      placeholder="Program"
                      value={academicInfoFields.program}
                      onChange={updateAcademicInfoField}
                    />
                    <input
                      type="text"
                      name="university"
                      placeholder="University"
                      value={academicInfoFields.university}
                      onChange={updateAcademicInfoField}
                    />
                    <select
                      name="currentAcademicYear"
                      value={academicInfoFields.currentAcademicYear}
                      onChange={updateAcademicInfoField}
                    >
                      <option value="">Current academic year</option>
                      {HOME_ACADEMIC_YEAR_OPTIONS.map((optionValue) => (
                        <option
                          key={`academic-year-${optionValue}`}
                          value={optionValue}
                        >
                          {optionValue}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="studyYear"
                      placeholder="Year"
                      value={academicInfoFields.studyYear}
                      onChange={updateAcademicInfoField}
                    />
                    <input
                      type="text"
                      name="term"
                      placeholder="Term"
                      value={academicInfoFields.term}
                      onChange={updateAcademicInfoField}
                    />
                    <button
                      type="submit"
                      className="Home_Noga_changePasswordSubmit"
                      disabled={isAcademicInfoSubmitting}
                    >
                      {isAcademicInfoSubmitting ? "Saving..." : "Save"}
                    </button>
                  </form>
                ) : null}
                {passwordFeedback.message ? (
                  <p
                    className={`Home_Noga_passwordFeedback Home_Noga_passwordFeedback--${passwordFeedback.tone || "info"}`}
                  >
                    {passwordFeedback.message}
                  </p>
                ) : null}
                {isPasswordFormOpen ? (
                  <form
                    id="Home_Noga_changePassword_form"
                    className="fc"
                    onSubmit={handlePasswordChange}
                  >
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Current password"
                      value={passwordFields.currentPassword}
                      onChange={updatePasswordField}
                      autoComplete="current-password"
                    />
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New password"
                      value={passwordFields.newPassword}
                      onChange={updatePasswordField}
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={passwordFields.confirmPassword}
                      onChange={updatePasswordField}
                      autoComplete="new-password"
                    />
                    <button
                      type="submit"
                      className="Home_Noga_changePasswordSubmit"
                      disabled={isPasswordSubmitting}
                    >
                      {isPasswordSubmitting ? "Saving..." : "Save password"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </section>
        </section>
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          images={imageOnlyGallery}
          activeIndex={activeGalleryImageIndex}
          onChangeIndex={setActiveGalleryImageIndex}
          onClose={() => setIsImageViewerOpen(false)}
          title={
            activeGalleryImage
              ? String(activeGalleryImage.publicId || "Image viewer")
              : "Image viewer"
          }
        />
        <VideoViewerModal
          isOpen={isVideoViewerOpen}
          video={activeGalleryVideo}
          onClose={() => {
            setIsVideoViewerOpen(false);
            setActiveGalleryVideo(null);
          }}
          title={
            activeGalleryVideo
              ? String(activeGalleryVideo.publicId || "Video player")
              : "Video player"
          }
        />
      {hasHomeNogaCallDockMounted ? (
        <div id="Home_Noga_callDock" className="Home_Noga_callDock" />
      ) : null}
      <nav className="Home_Noga_mobileNavBar" aria-label="Mobile navigation">
        <button
          type="button"
          className="Home_Noga_mobileNavBtn"
          onClick={() => props.logOut?.()}
          aria-label="Log out"
        >
          <i className="fi fi-rr-sign-out-alt" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="Home_Noga_mobileNavBtn"
          onClick={() => history.push("/phenomed/home")}
          aria-label="Home"
        >
          <i className="fi fi-rr-home" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="Home_Noga_mobileNavBtn"
          onClick={() => setIsMobileChatOpen((v) => !v)}
          aria-label={isMobileChatOpen ? "Back to profile" : "Open chat"}
        >
          <i className={`fi ${isMobileChatOpen ? "fi-rr-arrow-left" : "fi-rr-comments"}`} aria-hidden="true" />
        </button>
      </nav>
      </article>
  );
}
export default HomeNoga;
