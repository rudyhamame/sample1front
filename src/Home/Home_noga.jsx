import { Link, useHistory } from "react-router-dom";
import "./home-noga.css";
import Nav from "../Nav/Nav";
import React, { useEffect, useRef, useState } from "react";
import { apiUrl } from "../config/api";
import {
  drawHomeLedRopePath,
  drawHomeSketchPath,
  HOME_DRAWING_PALETTES,
  mergeNearbyHomeDrawingPaths,
  smoothHomeDrawingPoints,
} from "../utils/homeDrawingRope";
import { getHomeSubApps } from "../utils/homeSubApps";
import FriendChat from "../HomeChat/FriendChat";
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
const PLANNER_MUSIC_SESSION_EVENT = "planner-music-session-change";
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
  pending: { label: "Pending", iconClass: "fa-user-clock" },
  blocked: { label: "Blocked", iconClass: "fa-user-slash" },
  friends: { label: "Friends", iconClass: "fa-user-check" },
};

const HOME_GALLERY_TAB_UPLOAD_CONFIG = {
  images: {
    accept: "image/*",
    resourceType: "image",
    label: "image",
  },
  patterns: {
    accept: "image/*",
    resourceType: "pattern",
    label: "pattern",
  },
  videos: {
    accept: "video/*",
    resourceType: "video",
    label: "video",
  },
};

const HOME_DRAWING_ALLOWLIST_ZONES = [
  { id: "canvas", label: "Canvas", selector: "#Home_Noga_main_wrapper" },
  {
    id: "leftColumn",
    label: "Left column",
    selector: "#Home_Noga_main_leftColumn_wrapper",
  },
  {
    id: "rightColumn",
    label: "Right column",
    selector: "#Home_Noga_rightColumn_wrapper",
  },
  {
    id: "bio",
    label: "Bio",
    selector: "#Home_Noga_bioWrapper",
  },
  {
    id: "reports",
    label: "Reports",
    selector: "#Home_Noga_preStart_reportsWrapper",
  },
];

const HOME_DRAWING_VISIBILITY_WRAPPERS = [
  {
    id: "leftColumn",
    label: "Left column",
    selector: "#Home_Noga_main_leftColumn_wrapper",
  },
  {
    id: "bio",
    label: "Bio wrapper",
    selector: "#Home_Noga_bioWrapper",
  },
  {
    id: "profile",
    label: "Profile picture",
    selector: "#Home_Noga_preStart_profileWrapper",
  },
  {
    id: "bioText",
    label: "Bio text",
    selector: "#Home_Noga_preStart_personalBio",
  },
  {
    id: "rightColumn",
    label: "Right column",
    selector: "#Home_Noga_rightColumn_wrapper",
  },
  {
    id: "reports",
    label: "Reports",
    selector: "#Home_Noga_preStart_reportsWrapper",
  },
];

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

const normalizeHomeDrawingPaletteSnapshot = (
  paletteLike,
  fallbackId = "aurora",
) => {
  const fallbackPalette =
    HOME_DRAWING_PALETTES.find(
      (paletteOption) => paletteOption.id === fallbackId,
    ) || HOME_DRAWING_PALETTES[0];

  return {
    paletteId:
      String(
        paletteLike?.paletteId || fallbackPalette?.id || "aurora",
      ).trim() ||
      fallbackPalette?.id ||
      "aurora",
    stroke:
      String(paletteLike?.stroke || "").trim() ||
      String(fallbackPalette?.stroke || "").trim(),
    glow:
      String(paletteLike?.glow || "").trim() ||
      String(fallbackPalette?.glow || "").trim(),
    bulb:
      String(paletteLike?.bulb || "").trim() ||
      String(fallbackPalette?.bulb || "").trim(),
  };
};

const resolveHomeDrawingPalette = (paletteLike) => {
  const paletteId =
    String(paletteLike?.paletteId || "aurora").trim() || "aurora";
  const fallbackPalette =
    HOME_DRAWING_PALETTES.find(
      (paletteOption) => paletteOption.id === paletteId,
    ) || HOME_DRAWING_PALETTES[0];

  return normalizeHomeDrawingPaletteSnapshot(paletteLike, fallbackPalette?.id);
};

const normalizeHomeDrawingPayload = (nextDrawingPayload) => {
  const normalizePaths = (rawPaths) =>
    (Array.isArray(rawPaths) ? rawPaths : [])
      .map((path) => {
        const paletteSnapshot = normalizeHomeDrawingPaletteSnapshot(
          path,
          String(path?.paletteId || "aurora").trim() || "aurora",
        );
        const points = Array.isArray(path?.points)
          ? path.points
              .map((point) => ({
                x: Number(point?.x),
                y: Number(point?.y),
              }))
              .filter(
                (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
              )
          : [];

        return {
          paletteId: paletteSnapshot.paletteId,
          stroke: paletteSnapshot.stroke,
          glow: paletteSnapshot.glow,
          bulb: paletteSnapshot.bulb,
          points,
        };
      })
      .filter((path) => path.points.length >= 2);

  const legacyAppliedPaths =
    !Array.isArray(nextDrawingPayload?.appliedPaths) &&
    Array.isArray(nextDrawingPayload?.paths)
      ? nextDrawingPayload.paths
      : [];

  const normalizeTextItems = (rawItems) =>
    (Array.isArray(rawItems) ? rawItems : [])
      .map((item, index) => ({
        id: String(item?.id || "").trim() || `home-text-${Date.now()}-${index}`,
        paletteId: String(item?.paletteId || "aurora").trim() || "aurora",
        text: String(item?.text || "").trim(),
        x: Number(item?.x),
        y: Number(item?.y),
      }))
      .filter(
        (item) =>
          item.text && Number.isFinite(item.x) && Number.isFinite(item.y),
      );

  return {
    draftPaths: normalizePaths(nextDrawingPayload?.draftPaths),
    appliedPaths: normalizePaths(
      Array.isArray(nextDrawingPayload?.appliedPaths)
        ? nextDrawingPayload.appliedPaths
        : legacyAppliedPaths,
    ),
    textItems: normalizeTextItems(nextDrawingPayload?.textItems),
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

    const intervalId = window.setInterval(syncTheme, 800);
    document.addEventListener("visibilitychange", syncTheme);
    window.addEventListener("focus", syncTheme);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", syncTheme);
      window.removeEventListener("focus", syncTheme);
    };
  }, []);
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
  const drawingCanvasRef = React.useRef(null);
  const drawingCanvasHostRef = React.useRef(null);
  const appliedDrawingCanvasRef = React.useRef(null);
  const appliedDrawingCanvasHostRef = React.useRef(null);
  const drawingVisibilityCanvasRefs = React.useRef(new Map());
  const drawingPathsRef = React.useRef([]);
  const drawingCurrentPathRef = React.useRef(null);
  const isDrawingPointerActiveRef = React.useRef(false);
  const profilePictureWrapperRef = React.useRef(null);
  const profilePictureImageRef = React.useRef(null);
  const profilePictureGestureRef = React.useRef({
    mode: "idle",
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDistance: 0,
    startScale: 1,
  });
  // (Fixed: removed misplaced JSX here)
  const [isImageGalleryUploading, setIsImageGalleryUploading] = useState(false);
  // Gallery tab state: 'images' | 'patterns' | 'videos'
  const [galleryTab, setGalleryTab] = useState("images");
  const activeGalleryUploadConfig =
    HOME_GALLERY_TAB_UPLOAD_CONFIG[galleryTab] ||
    HOME_GALLERY_TAB_UPLOAD_CONFIG.images;
  const [isImageGalleryDeletingPublicId, setIsImageGalleryDeletingPublicId] =
    useState("");
  const [
    isImageGallerySettingProfilePublicId,
    setIsImageGallerySettingProfilePublicId,
  ] = useState("");
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
    program: "",
    university: "",
    studyYear: "",
    term: "",
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
  const [activeBlockedListTab, setActiveBlockedListTab] = useState(
    DEFAULT_BLOCKED_LIST_USER_MODE,
  );
  const [activeBlockedListGroup, setActiveBlockedListGroup] = useState(
    DEFAULT_BLOCKED_LIST_GROUP,
  );
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
  const [isHomeDrawingModeEnabled, setIsHomeDrawingModeEnabled] =
    useState(false);
  const [isHomeDrawingAllowListEnabled, setIsHomeDrawingAllowListEnabled] =
    useState(false);
  const [activeHomeDrawingAllowZoneId, setActiveHomeDrawingAllowZoneId] =
    useState(HOME_DRAWING_ALLOWLIST_ZONES[0]?.id || "canvas");
  const [isHomeDrawingAllowZoneMenuOpen, setIsHomeDrawingAllowZoneMenuOpen] =
    useState(false);
  const [isHomeDrawingVisibilityMenuOpen, setIsHomeDrawingVisibilityMenuOpen] =
    useState(false);
  const [homeDrawingVisibleWrapperIds, setHomeDrawingVisibleWrapperIds] =
    useState(() => ["bio"]);
  const [isHomeDrawingAutoGlueEnabled, setIsHomeDrawingAutoGlueEnabled] =
    useState(true);
  const [isHomeDrawingStartingFresh, setIsHomeDrawingStartingFresh] =
    useState(false);
  const [activeHomeDrawingPaletteId, setActiveHomeDrawingPaletteId] = useState(
    HOME_DRAWING_PALETTES[0]?.id || "aurora",
  );
  const [homeDrawing, setHomeDrawing] = useState(() =>
    normalizeHomeDrawingPayload(props.state?.homeDrawing),
  );
  const [homeDrawingCanvasVersion, setHomeDrawingCanvasVersion] = useState(0);
  const latestHomeDrawingSaveRequestIdRef = React.useRef(0);
  const pendingHomeDrawingSyncRef = React.useRef(false);
  const [isGalleryTopRowVisible, setIsGalleryTopRowVisible] = useState(false);
  const [isBioWallpaperControlsOpen, setIsBioWallpaperControlsOpen] =
    useState(false);
  const [isProfilePictureDragging, setIsProfilePictureDragging] =
    useState(false);
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

  const isReportSectionOpen = (sectionKey) =>
    Boolean(openReportSections?.[sectionKey]);

  const toggleReportSection = (sectionKey) => {
    setOpenReportSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections?.[sectionKey],
    }));
  };

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const HOME_DRAWING_PATH_FILL = "rgba(118, 233, 247, 0.08)";
  const HOME_DRAWING_PATH_GLOW = "rgba(118, 233, 247, 0.16)";

  const getNavChildForbiddenRects = React.useCallback(() => {
    if (!mainWrapperRef.current) {
      return [];
    }

    const wrapperRect = mainWrapperRef.current.getBoundingClientRect();
    const navChildSelectors = [
      "#Home_Noga_navWrap .Nav_actionButton",
      "#Home_Noga_navWrap #SubApps_icon_container",
      "#Home_Noga_navWrap #Notification_icons_container",
      "#Home_Noga_navWrap #Dim_article",
      "#Home_Noga_navWrap #Logout_article",
      "#Home_Noga_navWrap #Refresh_article",
    ];

    return navChildSelectors
      .flatMap((selector) =>
        Array.from(mainWrapperRef.current.querySelectorAll(selector)),
      )
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const elementRect = element.getBoundingClientRect();
        return elementRect.width > 0 && elementRect.height > 0;
      })
      .map((element) => {
        const elementRect = element.getBoundingClientRect();

        return {
          left: elementRect.left - wrapperRect.left,
          top: elementRect.top - wrapperRect.top,
          right: elementRect.right - wrapperRect.left,
          bottom: elementRect.bottom - wrapperRect.top,
        };
      });
  }, []);

  const getHomeDrawingMaskedRects = React.useCallback(() => {
    if (!mainWrapperRef.current) {
      return [];
    }

    const wrapperRect = mainWrapperRef.current.getBoundingClientRect();
    const maskedSelectors = [
      "#Home_Noga_main_leftColumn_wrapper",
      "#Home_Noga_rightColumn_wrapper",
      "#Home_Noga_preStart_reportsWrapper",
      "#Home_Noga_userMenuCluster",
      "#Home_Noga_navWrap .Nav_actionButton",
      "#Home_Noga_navWrap #SubApps_icon_container",
      "#Home_Noga_navWrap #Notification_icons_container",
      "#Home_Noga_navWrap #Dim_article",
      "#Home_Noga_navWrap #Logout_article",
      "#Home_Noga_navWrap #Refresh_article",
    ];

    return maskedSelectors
      .flatMap((selector) =>
        Array.from(mainWrapperRef.current.querySelectorAll(selector)),
      )
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const elementRect = element.getBoundingClientRect();
        return elementRect.width > 0 && elementRect.height > 0;
      })
      .map((element) => {
        const elementRect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const topLeftRadius = Number.parseFloat(
          computedStyle.borderTopLeftRadius || "0",
        );
        const topRightRadius = Number.parseFloat(
          computedStyle.borderTopRightRadius || "0",
        );
        const bottomRightRadius = Number.parseFloat(
          computedStyle.borderBottomRightRadius || "0",
        );
        const bottomLeftRadius = Number.parseFloat(
          computedStyle.borderBottomLeftRadius || "0",
        );

        return {
          left: elementRect.left - wrapperRect.left,
          top: elementRect.top - wrapperRect.top,
          right: elementRect.right - wrapperRect.left,
          bottom: elementRect.bottom - wrapperRect.top,
          radii: {
            topLeft: Number.isFinite(topLeftRadius) ? topLeftRadius : 0,
            topRight: Number.isFinite(topRightRadius) ? topRightRadius : 0,
            bottomRight: Number.isFinite(bottomRightRadius)
              ? bottomRightRadius
              : 0,
            bottomLeft: Number.isFinite(bottomLeftRadius)
              ? bottomLeftRadius
              : 0,
          },
        };
      });
  }, []);

  const getHomeDrawingAllowListRects = React.useCallback(() => {
    if (!mainWrapperRef.current) {
      return [];
    }

    const activeZone = HOME_DRAWING_ALLOWLIST_ZONES.find(
      (zone) => zone.id === activeHomeDrawingAllowZoneId,
    );

    if (!activeZone?.selector) {
      return [];
    }

    const wrapperRect = mainWrapperRef.current.getBoundingClientRect();

    return Array.from(
      mainWrapperRef.current.querySelectorAll(activeZone.selector),
    )
      .filter((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const elementRect = element.getBoundingClientRect();
        return elementRect.width > 0 && elementRect.height > 0;
      })
      .map((element) => {
        const elementRect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const topLeftRadius = Number.parseFloat(
          computedStyle.borderTopLeftRadius || "0",
        );
        const topRightRadius = Number.parseFloat(
          computedStyle.borderTopRightRadius || "0",
        );
        const bottomRightRadius = Number.parseFloat(
          computedStyle.borderBottomRightRadius || "0",
        );
        const bottomLeftRadius = Number.parseFloat(
          computedStyle.borderBottomLeftRadius || "0",
        );

        return {
          left: elementRect.left - wrapperRect.left,
          top: elementRect.top - wrapperRect.top,
          right: elementRect.right - wrapperRect.left,
          bottom: elementRect.bottom - wrapperRect.top,
          radii: {
            topLeft: Number.isFinite(topLeftRadius) ? topLeftRadius : 0,
            topRight: Number.isFinite(topRightRadius) ? topRightRadius : 0,
            bottomRight: Number.isFinite(bottomRightRadius)
              ? bottomRightRadius
              : 0,
            bottomLeft: Number.isFinite(bottomLeftRadius)
              ? bottomLeftRadius
              : 0,
          },
        };
      });
  }, [activeHomeDrawingAllowZoneId]);

  const isPointInsideAllowedZone = React.useCallback(
    (point) => {
      if (!isHomeDrawingAllowListEnabled) {
        return true;
      }

      const allowListRects = getHomeDrawingAllowListRects();

      if (!Array.isArray(allowListRects) || allowListRects.length === 0) {
        return false;
      }

      return allowListRects.some(
        (rect) =>
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom,
      );
    },
    [getHomeDrawingAllowListRects, isHomeDrawingAllowListEnabled],
  );

  const setHomeDrawingVisibilityCanvasRef = React.useCallback(
    (wrapperId, canvasNode) => {
      if (canvasNode) {
        drawingVisibilityCanvasRefs.current.set(wrapperId, canvasNode);
        return;
      }

      drawingVisibilityCanvasRefs.current.delete(wrapperId);
    },
    [],
  );

  const toggleHomeDrawingVisibleWrapper = React.useCallback((wrapperId) => {
    setHomeDrawingVisibleWrapperIds((currentIds) => {
      const normalizedIds = Array.isArray(currentIds) ? currentIds : [];

      if (normalizedIds.includes(wrapperId)) {
        return normalizedIds.filter((currentId) => currentId !== wrapperId);
      }

      return [...normalizedIds, wrapperId];
    });
  }, []);

  const renderHomeDrawingVisibilityCanvas = React.useCallback(
    (wrapperId) =>
      homeDrawingVisibleWrapperIds.includes(wrapperId) ? (
        <canvas
          ref={(canvasNode) =>
            setHomeDrawingVisibilityCanvasRef(wrapperId, canvasNode)
          }
          className="Home_Noga_drawingVisibilityCanvas"
          aria-hidden="true"
        />
      ) : null,
    [homeDrawingVisibleWrapperIds, setHomeDrawingVisibilityCanvasRef],
  );

  const redrawHomeDrawingCanvas = React.useCallback(() => {
    const appliedCanvas = appliedDrawingCanvasRef.current;
    const appliedHost = appliedDrawingCanvasHostRef.current;
    const draftCanvas = drawingCanvasRef.current;
    const draftHost = drawingCanvasHostRef.current;

    if (
      !appliedCanvas ||
      !appliedHost ||
      !draftCanvas ||
      !draftHost ||
      !mainWrapperRef.current
    ) {
      return;
    }

    const appliedContext = appliedCanvas.getContext("2d");
    const draftContext = draftCanvas.getContext("2d");

    if (!appliedContext || !draftContext) {
      return;
    }

    const bounds = appliedHost.getBoundingClientRect();
    const devicePixelRatio =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    [appliedCanvas, draftCanvas].forEach((canvasNode) => {
      if (
        canvasNode.width !== Math.round(width * devicePixelRatio) ||
        canvasNode.height !== Math.round(height * devicePixelRatio)
      ) {
        canvasNode.width = Math.round(width * devicePixelRatio);
        canvasNode.height = Math.round(height * devicePixelRatio);
        canvasNode.style.width = `${width}px`;
        canvasNode.style.height = `${height}px`;
      }
    });

    [appliedContext, draftContext].forEach((context) => {
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
    });

    if (isHomeDrawingModeEnabled) {
      const drawingGlow = draftContext.createLinearGradient(
        0,
        0,
        width,
        height,
      );
      drawingGlow.addColorStop(0, "rgba(173, 245, 255, 0.05)");
      drawingGlow.addColorStop(0.45, HOME_DRAWING_PATH_FILL);
      drawingGlow.addColorStop(1, "rgba(118, 233, 247, 0.02)");
      draftContext.fillStyle = drawingGlow;
      draftContext.fillRect(0, 0, width, height);
    }

    const nowSeconds =
      typeof performance !== "undefined"
        ? performance.now() / 1000
        : Date.now() / 1000;
    const homeMusicSignal = homeMusicSignalRef.current || {};
    const signalUpdatedAt = Number(homeMusicSignal.updatedAt) || 0;
    const signalAgeMs =
      signalUpdatedAt > 0
        ? Math.max(0, Date.now() - signalUpdatedAt)
        : Number.POSITIVE_INFINITY;
    const hasFreshSignal = signalAgeMs < 1400;
    const fallbackBeat = (Math.sin(nowSeconds * 2.8) + 1) / 2;
    const isHomeMusicPlaying =
      Boolean(props.state?.planner_music?.isPlaying) ||
      Boolean(homeMusicIsPlayingRef.current);
    const effectiveMusicSignal = isHomeMusicPlaying
      ? {
          energy: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.energy) || 0 : 0,
            0.2 + fallbackBeat * 0.18,
          ),
          bass: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.bass) || 0 : 0,
            0.24 + fallbackBeat * 0.22,
          ),
          mid: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.mid) || 0 : 0,
            0.16 + fallbackBeat * 0.14,
          ),
          treble: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.treble) || 0 : 0,
            0.12 + fallbackBeat * 0.12,
          ),
          pitch: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.pitch) || 0 : 0,
            0.18 + fallbackBeat * 0.16,
          ),
          tempo: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.tempo) || 0 : 0,
            0.24 + fallbackBeat * 0.12,
          ),
          pulse: Math.max(
            hasFreshSignal ? Number(homeMusicSignal.pulse) || 0 : 0,
            0.3 + fallbackBeat * 0.32,
          ),
          fallbackTime:
            hasFreshSignal &&
            Number.isFinite(Number(homeMusicSignal.fallbackTime))
              ? Number(homeMusicSignal.fallbackTime)
              : nowSeconds,
          updatedAt: signalUpdatedAt || Date.now(),
        }
      : null;

    homeDrawing.appliedPaths.forEach((segment) => {
      const rawPoints = Array.isArray(segment?.points) ? segment.points : [];
      if (rawPoints.length < 2) {
        return;
      }

      const palette = resolveHomeDrawingPalette(segment);
      const smoothedPoints = smoothHomeDrawingPoints(rawPoints);

      drawHomeLedRopePath(appliedContext, smoothedPoints, palette, {
        musicSignal: effectiveMusicSignal,
        animateBulbs: Boolean(effectiveMusicSignal),
      });
    });

    homeDrawing.draftPaths.forEach((segment) => {
      const rawPoints = Array.isArray(segment?.points) ? segment.points : [];
      if (rawPoints.length < 2) {
        return;
      }

      const palette = resolveHomeDrawingPalette(segment);

      drawHomeSketchPath(draftContext, rawPoints, palette);
    });

    const appendRoundedRectPath = (context, rect) => {
      const bleed = 0;
      const left = Math.max(0, rect.left - bleed);
      const top = Math.max(0, rect.top - bleed);
      const rectWidth = Math.max(0, rect.right - rect.left + bleed * 2);
      const rectHeight = Math.max(0, rect.bottom - rect.top + bleed * 2);
      const safeRadius = {
        topLeft: Math.max(0, Number(rect?.radii?.topLeft || 0)),
        topRight: Math.max(0, Number(rect?.radii?.topRight || 0)),
        bottomRight: Math.max(0, Number(rect?.radii?.bottomRight || 0)),
        bottomLeft: Math.max(0, Number(rect?.radii?.bottomLeft || 0)),
      };

      if (rectWidth <= 0 || rectHeight <= 0) {
        return;
      }

      if (typeof context.roundRect === "function") {
        context.roundRect(left, top, rectWidth, rectHeight, [
          safeRadius.topLeft,
          safeRadius.topRight,
          safeRadius.bottomRight,
          safeRadius.bottomLeft,
        ]);
        return;
      }

      const maxRadius = Math.min(rectWidth, rectHeight) / 2;
      const topLeft = Math.min(safeRadius.topLeft, maxRadius);
      const topRight = Math.min(safeRadius.topRight, maxRadius);
      const bottomRight = Math.min(safeRadius.bottomRight, maxRadius);
      const bottomLeft = Math.min(safeRadius.bottomLeft, maxRadius);

      context.moveTo(left + topLeft, top);
      context.lineTo(left + rectWidth - topRight, top);
      context.quadraticCurveTo(
        left + rectWidth,
        top,
        left + rectWidth,
        top + topRight,
      );
      context.lineTo(left + rectWidth, top + rectHeight - bottomRight);
      context.quadraticCurveTo(
        left + rectWidth,
        top + rectHeight,
        left + rectWidth - bottomRight,
        top + rectHeight,
      );
      context.lineTo(left + bottomLeft, top + rectHeight);
      context.quadraticCurveTo(
        left,
        top + rectHeight,
        left,
        top + rectHeight - bottomLeft,
      );
      context.lineTo(left, top + topLeft);
      context.quadraticCurveTo(left, top, left + topLeft, top);
      context.closePath();
    };

    const applyCanvasRectMask = (context, rects, operation) => {
      if (!Array.isArray(rects) || rects.length === 0) {
        return;
      }

      context.save();
      context.globalCompositeOperation = operation;
      context.beginPath();
      rects.forEach((rect) => appendRoundedRectPath(context, rect));
      context.fill();
      context.restore();
    };

    const getElementCanvasRect = (element) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const wrapperRect = mainWrapperRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      if (elementRect.width <= 0 || elementRect.height <= 0) {
        return null;
      }

      const computedStyle = window.getComputedStyle(element);

      return {
        left: elementRect.left - wrapperRect.left,
        top: elementRect.top - wrapperRect.top,
        right: elementRect.right - wrapperRect.left,
        bottom: elementRect.bottom - wrapperRect.top,
        radii: {
          topLeft: Number.parseFloat(computedStyle.borderTopLeftRadius || "0"),
          topRight: Number.parseFloat(
            computedStyle.borderTopRightRadius || "0",
          ),
          bottomRight: Number.parseFloat(
            computedStyle.borderBottomRightRadius || "0",
          ),
          bottomLeft: Number.parseFloat(
            computedStyle.borderBottomLeftRadius || "0",
          ),
        },
      };
    };

    const visibleWrapperRects = HOME_DRAWING_VISIBILITY_WRAPPERS.map(
      (wrapper) => {
        const wrapperElement = mainWrapperRef.current.querySelector(
          wrapper.selector,
        );
        const wrapperCanvas = drawingVisibilityCanvasRefs.current.get(
          wrapper.id,
        );
        const wrapperRect = getElementCanvasRect(wrapperElement);

        if (!wrapperCanvas || !wrapperElement || !wrapperRect) {
          return null;
        }

        const wrapperContext = wrapperCanvas.getContext("2d");
        const wrapperWidth = Math.max(
          1,
          Math.round(wrapperRect.right - wrapperRect.left),
        );
        const wrapperHeight = Math.max(
          1,
          Math.round(wrapperRect.bottom - wrapperRect.top),
        );

        if (!wrapperContext) {
          return wrapperRect;
        }

        if (
          wrapperCanvas.width !== Math.round(wrapperWidth * devicePixelRatio) ||
          wrapperCanvas.height !== Math.round(wrapperHeight * devicePixelRatio)
        ) {
          wrapperCanvas.width = Math.round(wrapperWidth * devicePixelRatio);
          wrapperCanvas.height = Math.round(wrapperHeight * devicePixelRatio);
          wrapperCanvas.style.width = `${wrapperWidth}px`;
          wrapperCanvas.style.height = `${wrapperHeight}px`;
        }

        wrapperContext.setTransform(
          devicePixelRatio,
          0,
          0,
          devicePixelRatio,
          0,
          0,
        );
        wrapperContext.clearRect(0, 0, wrapperWidth, wrapperHeight);

        homeDrawing.appliedPaths.forEach((segment) => {
          const rawPoints = Array.isArray(segment?.points)
            ? segment.points
            : [];

          if (rawPoints.length < 2) {
            return;
          }

          const shiftedPoints = smoothHomeDrawingPoints(rawPoints).map(
            (point) => ({
              x: point.x - wrapperRect.left,
              y: point.y - wrapperRect.top,
            }),
          );

          drawHomeLedRopePath(
            wrapperContext,
            shiftedPoints,
            resolveHomeDrawingPalette(segment),
            {
              musicSignal: effectiveMusicSignal,
              animateBulbs: Boolean(effectiveMusicSignal),
            },
          );
        });

        homeDrawing.draftPaths.forEach((segment) => {
          const rawPoints = Array.isArray(segment?.points)
            ? segment.points
            : [];

          if (rawPoints.length < 2) {
            return;
          }

          drawHomeSketchPath(
            wrapperContext,
            rawPoints.map((point) => ({
              x: point.x - wrapperRect.left,
              y: point.y - wrapperRect.top,
            })),
            resolveHomeDrawingPalette(segment),
          );
        });

        return wrapperRect;
      },
    ).filter(Boolean);

    if (isHomeDrawingAllowListEnabled) {
      const allowListRects = getHomeDrawingAllowListRects();

      if (allowListRects.length === 0) {
        draftContext.clearRect(0, 0, width, height);
      } else {
        applyCanvasRectMask(draftContext, allowListRects, "destination-in");
      }

      applyCanvasRectMask(
        draftContext,
        getNavChildForbiddenRects(),
        "destination-out",
      );

      applyCanvasRectMask(draftContext, visibleWrapperRects, "destination-out");
    } else {
      applyCanvasRectMask(
        draftContext,
        getHomeDrawingMaskedRects(),
        "destination-out",
      );
      applyCanvasRectMask(draftContext, visibleWrapperRects, "destination-out");
    }
  }, [
    HOME_DRAWING_PATH_FILL,
    getHomeDrawingAllowListRects,
    getHomeDrawingMaskedRects,
    getNavChildForbiddenRects,
    homeDrawingVisibleWrapperIds,
    homeDrawing.appliedPaths,
    homeDrawing.draftPaths,
    isHomeDrawingAllowListEnabled,
    isHomeDrawingModeEnabled,
    props.state?.planner_music?.isPlaying,
  ]);

  const getCanvasPointFromEvent = React.useCallback((event) => {
    const canvas = drawingCanvasRef.current;

    if (!canvas) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
    };
  }, []);

  const isPointInsideNavChildCard = React.useCallback(
    (point) =>
      getNavChildForbiddenRects().some(
        (rect) =>
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom,
      ),
    [getNavChildForbiddenRects],
  );

  React.useEffect(() => {
    drawingPathsRef.current = homeDrawing.draftPaths;
  }, [homeDrawing.draftPaths]);

  React.useEffect(() => {
    homeMusicIsPlayingRef.current = Boolean(
      props.state?.planner_music?.isPlaying,
    );
  }, [props.state?.planner_music?.isPlaying]);

  React.useEffect(() => {
    if (!isHomeDrawingAllowListEnabled || !isHomeDrawingModeEnabled) {
      setIsHomeDrawingAllowZoneMenuOpen(false);
    }

    if (!isHomeDrawingModeEnabled) {
      setIsHomeDrawingVisibilityMenuOpen(false);
    }
  }, [isHomeDrawingAllowListEnabled, isHomeDrawingModeEnabled]);

  const beginHomeDrawingStroke = React.useCallback(
    (event) => {
      if (!isHomeDrawingModeEnabled) {
        return;
      }

      const point = getCanvasPointFromEvent(event);

      if (
        !point ||
        isPointInsideNavChildCard(point) ||
        !isPointInsideAllowedZone(point)
      ) {
        drawingCurrentPathRef.current = null;
        isDrawingPointerActiveRef.current = true;
        return;
      }

      event.preventDefault();

      isDrawingPointerActiveRef.current = true;
      const selectedPalette = resolveHomeDrawingPalette({
        paletteId: activeHomeDrawingPaletteId,
      });
      const nextPath = {
        paletteId: selectedPalette.paletteId,
        stroke: selectedPalette.stroke,
        glow: selectedPalette.glow,
        bulb: selectedPalette.bulb,
        points: [point],
      };
      drawingCurrentPathRef.current = nextPath;
      setHomeDrawing((currentDrawing) => ({
        draftPaths: [...currentDrawing.draftPaths, nextPath],
        appliedPaths: currentDrawing.appliedPaths,
        textItems: currentDrawing.textItems,
      }));
    },
    [
      activeHomeDrawingPaletteId,
      getCanvasPointFromEvent,
      isHomeDrawingModeEnabled,
      isPointInsideAllowedZone,
      isPointInsideNavChildCard,
    ],
  );

  const continueHomeDrawingStroke = React.useCallback(
    (event) => {
      if (!isHomeDrawingModeEnabled || !isDrawingPointerActiveRef.current) {
        return;
      }

      const point = getCanvasPointFromEvent(event);

      if (!point) {
        return;
      }

      event.preventDefault();

      if (
        isPointInsideNavChildCard(point) ||
        !isPointInsideAllowedZone(point)
      ) {
        drawingCurrentPathRef.current = null;
        return;
      }

      if (!drawingCurrentPathRef.current) {
        const selectedPalette = resolveHomeDrawingPalette({
          paletteId: activeHomeDrawingPaletteId,
        });
        const nextPath = {
          paletteId: selectedPalette.paletteId,
          stroke: selectedPalette.stroke,
          glow: selectedPalette.glow,
          bulb: selectedPalette.bulb,
          points: [point],
        };
        drawingCurrentPathRef.current = nextPath;
        setHomeDrawing((currentDrawing) => ({
          draftPaths: [...currentDrawing.draftPaths, nextPath],
          appliedPaths: currentDrawing.appliedPaths,
          textItems: currentDrawing.textItems,
        }));
      } else {
        drawingCurrentPathRef.current.points.push(point);
        setHomeDrawing((currentDrawing) => ({
          draftPaths: [...currentDrawing.draftPaths],
          appliedPaths: currentDrawing.appliedPaths,
          textItems: currentDrawing.textItems,
        }));
      }
    },
    [
      activeHomeDrawingPaletteId,
      getCanvasPointFromEvent,
      isHomeDrawingModeEnabled,
      isPointInsideAllowedZone,
      isPointInsideNavChildCard,
    ],
  );

  const endHomeDrawingStroke = React.useCallback(() => {
    isDrawingPointerActiveRef.current = false;
    drawingCurrentPathRef.current = null;
  }, []);

  const clearHomeDrawingCanvas = React.useCallback(() => {
    drawingCurrentPathRef.current = null;
    pendingHomeDrawingSyncRef.current = true;
    const nextDrawing = {
      draftPaths: [],
      appliedPaths: [],
      textItems: [],
    };
    setHomeDrawing(nextDrawing);
    props.setUserMediaInfo?.({
      profilePicture: String(props.state?.profilePicture || "").trim(),
      profilePictureViewport: props.state?.profilePictureViewport || {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
      homeDrawing: nextDrawing,
      imageGallery: Array.isArray(props.state?.imageGallery)
        ? props.state.imageGallery
        : [],
    });
  }, [
    props.setUserMediaInfo,
    props.state?.imageGallery,
    props.state?.profilePicture,
    props.state?.profilePictureViewport,
  ]);

  const persistHomeDrawing = React.useCallback(
    async (drawingPayload, { requestId, keepalive = false } = {}) => {
      if (!props.state?.token) {
        return null;
      }

      const response = await fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeDrawing: drawingPayload,
        }),
        keepalive,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save home drawing.");
      }

      const nextHomeDrawing = normalizeHomeDrawingPayload(
        payload?.media?.homeDrawing || drawingPayload,
      );

      if (
        Number.isFinite(requestId) &&
        latestHomeDrawingSaveRequestIdRef.current !== requestId
      ) {
        return nextHomeDrawing;
      }

      pendingHomeDrawingSyncRef.current = false;

      props.setUserMediaInfo?.({
        profilePicture: String(props.state?.profilePicture || "").trim(),
        profilePictureViewport: props.state?.profilePictureViewport || {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        homeDrawing: nextHomeDrawing,
        imageGallery: Array.isArray(props.state?.imageGallery)
          ? props.state.imageGallery
          : [],
      });

      return nextHomeDrawing;
    },
    [
      props.setUserMediaInfo,
      props.state?.imageGallery,
      props.state?.profilePicture,
      props.state?.profilePictureViewport,
      props.state?.token,
    ],
  );

  const applyHomeDrawingRope = React.useCallback(() => {
    const sourcePaths = [
      ...(Array.isArray(homeDrawing?.appliedPaths)
        ? homeDrawing.appliedPaths
        : []),
      ...(Array.isArray(homeDrawing?.draftPaths) ? homeDrawing.draftPaths : []),
    ];

    if (!sourcePaths.length) {
      const persistedDrawing = {
        draftPaths: [],
        appliedPaths: Array.isArray(homeDrawing?.appliedPaths)
          ? homeDrawing.appliedPaths
          : [],
        textItems: Array.isArray(homeDrawing?.textItems)
          ? homeDrawing.textItems
          : [],
      };

      setHomeDrawing(persistedDrawing);
      props.setUserMediaInfo?.({
        profilePicture: String(props.state?.profilePicture || "").trim(),
        profilePictureViewport: props.state?.profilePictureViewport || {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
        homeDrawing: persistedDrawing,
        imageGallery: Array.isArray(props.state?.imageGallery)
          ? props.state.imageGallery
          : [],
      });
      pendingHomeDrawingSyncRef.current = true;
      setIsHomeDrawingModeEnabled(false);
      drawingCurrentPathRef.current = null;
      isDrawingPointerActiveRef.current = false;

      if (props.state?.token) {
        const requestId = latestHomeDrawingSaveRequestIdRef.current + 1;
        latestHomeDrawingSaveRequestIdRef.current = requestId;

        persistHomeDrawing(persistedDrawing, {
          requestId,
          keepalive: true,
        }).catch(() => {
          pendingHomeDrawingSyncRef.current = false;
        });
      }
      return;
    }

    const existingAppliedPaths = Array.isArray(homeDrawing?.appliedPaths)
      ? homeDrawing.appliedPaths
      : [];
    const draftPaths = Array.isArray(homeDrawing?.draftPaths)
      ? homeDrawing.draftPaths
      : [];
    const mergeSourcePaths = isHomeDrawingStartingFresh
      ? draftPaths
      : sourcePaths;
    const mergedPaths = isHomeDrawingAutoGlueEnabled
      ? mergeNearbyHomeDrawingPaths(mergeSourcePaths)
      : mergeSourcePaths;
    const mergedResultPaths = mergedPaths.length
      ? mergedPaths
      : mergeSourcePaths;
    const nextAppliedPaths = isHomeDrawingStartingFresh
      ? [...existingAppliedPaths, ...mergedResultPaths]
      : mergedResultPaths;
    const persistedDrawing = {
      draftPaths: [],
      appliedPaths: nextAppliedPaths,
      textItems: Array.isArray(homeDrawing?.textItems)
        ? homeDrawing.textItems
        : [],
    };

    setHomeDrawing(persistedDrawing);
    props.setUserMediaInfo?.({
      profilePicture: String(props.state?.profilePicture || "").trim(),
      profilePictureViewport: props.state?.profilePictureViewport || {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
      homeDrawing: persistedDrawing,
      imageGallery: Array.isArray(props.state?.imageGallery)
        ? props.state.imageGallery
        : [],
    });
    pendingHomeDrawingSyncRef.current = true;
    drawingCurrentPathRef.current = null;
    isDrawingPointerActiveRef.current = false;
    setIsHomeDrawingModeEnabled(false);
    setIsHomeDrawingStartingFresh(false);
    setHomeDrawingCanvasVersion((currentVersion) => currentVersion + 1);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          redrawHomeDrawingCanvas();
        });
      });
    }

    if (props.state?.token) {
      const requestId = latestHomeDrawingSaveRequestIdRef.current + 1;
      latestHomeDrawingSaveRequestIdRef.current = requestId;

      persistHomeDrawing(persistedDrawing, {
        requestId,
        keepalive: true,
      }).catch(() => {
        pendingHomeDrawingSyncRef.current = false;
      });
    }
  }, [
    homeDrawing?.appliedPaths,
    homeDrawing?.draftPaths,
    homeDrawing?.textItems,
    isHomeDrawingAutoGlueEnabled,
    isHomeDrawingStartingFresh,
    persistHomeDrawing,
    props.setUserMediaInfo,
    props.state?.imageGallery,
    props.state?.profilePicture,
    props.state?.profilePictureViewport,
    props.state?.token,
    redrawHomeDrawingCanvas,
  ]);

  const handleToggleHomeDrawingMode = React.useCallback(() => {
    if (isHomeDrawingModeEnabled) {
      endHomeDrawingStroke();
      applyHomeDrawingRope();
      return;
    }

    setIsHomeDrawingModeEnabled(true);
  }, [applyHomeDrawingRope, endHomeDrawingStroke, isHomeDrawingModeEnabled]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener(
      "home-noga-toggle-drawing",
      handleToggleHomeDrawingMode,
    );

    return () => {
      window.removeEventListener(
        "home-noga-toggle-drawing",
        handleToggleHomeDrawingMode,
      );
    };
  }, [handleToggleHomeDrawingMode]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePlannerMusicSignalChange = (event) => {
      const nextAudioSignal = event?.detail?.audioSignal;
      if (typeof event?.detail?.isPlaying === "boolean") {
        homeMusicIsPlayingRef.current = event.detail.isPlaying;
      }

      if (!nextAudioSignal) {
        redrawHomeDrawingCanvas();
        return;
      }

      const currentSignal = homeMusicSignalRef.current || {};

      if (
        currentSignal.updatedAt === nextAudioSignal.updatedAt &&
        currentSignal.energy === nextAudioSignal.energy &&
        currentSignal.pitch === nextAudioSignal.pitch &&
        currentSignal.tempo === nextAudioSignal.tempo &&
        currentSignal.pulse === nextAudioSignal.pulse
      ) {
        return;
      }

      homeMusicSignalRef.current = nextAudioSignal;
      redrawHomeDrawingCanvas();
    };

    window.addEventListener(
      PLANNER_MUSIC_SESSION_EVENT,
      handlePlannerMusicSignalChange,
    );

    return () => {
      window.removeEventListener(
        PLANNER_MUSIC_SESSION_EVENT,
        handlePlannerMusicSignalChange,
      );
    };
  }, [redrawHomeDrawingCanvas]);

  React.useEffect(() => {
    redrawHomeDrawingCanvas();
  }, [
    activeFriendsMiniTab,
    isReportsWrapperOpen,
    openChatFriendId,
    redrawHomeDrawingCanvas,
    showGalleryInRightColumn,
  ]);

  React.useEffect(() => {
    if (isHomeDrawingModeEnabled) {
      return undefined;
    }

    if (typeof window === "undefined") {
      redrawHomeDrawingCanvas();
      return undefined;
    }

    const frameRequest = window.requestAnimationFrame(() => {
      redrawHomeDrawingCanvas();
    });
    const timeoutId = window.setTimeout(() => {
      redrawHomeDrawingCanvas();
    }, 60);

    return () => {
      window.cancelAnimationFrame(frameRequest);
      window.clearTimeout(timeoutId);
    };
  }, [
    homeDrawing.appliedPaths,
    isHomeDrawingModeEnabled,
    redrawHomeDrawingCanvas,
  ]);

  React.useEffect(() => {
    if (isHomeDrawingModeEnabled) {
      return;
    }

    isDrawingPointerActiveRef.current = false;
    drawingCurrentPathRef.current = null;
  }, [isHomeDrawingModeEnabled]);

  React.useEffect(() => {
    const wrapperNode = mainWrapperRef.current;

    if (!wrapperNode) {
      return undefined;
    }

    const handleResize = () => {
      redrawHomeDrawingCanvas();
    };

    handleResize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(wrapperNode);

    return () => {
      observer.disconnect();
    };
  }, [redrawHomeDrawingCanvas]);

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
      program: String(props.state?.program || ""),
      university: String(props.state?.university || ""),
      studyYear: String(props.state?.studyYear || ""),
      term: String(props.state?.term || ""),
    };

    setAcademicInfoFields((currentFields) =>
      currentFields.program === nextAcademicInfoFields.program &&
      currentFields.university === nextAcademicInfoFields.university &&
      currentFields.studyYear === nextAcademicInfoFields.studyYear &&
      currentFields.term === nextAcademicInfoFields.term
        ? currentFields
        : nextAcademicInfoFields,
    );
  }, [
    props.state?.program,
    props.state?.university,
    props.state?.studyYear,
    props.state?.term,
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

  const isVisitLogOwner =
    String(props.state?.username || "").toLowerCase() === "rudyhamame";

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

        return {
          id: String(friend?._id || friend?.id || chatId || index),
          chatId,
          username,
          displayName,
          initials,
          avatarUrl,
          isConnected: Boolean(
            friend?.isConnected || props.state?.friendChatPresence?.[chatId],
          ),
        };
      })
      .filter((friend) => friend.chatId);
  }, [props.state?.friendChatPresence, props.state?.friends]);

  // TODO: Refactor unreadChatCountsByFriendId to use chat state or friends[].userMode if needed
  const unreadChatCountsByFriendId = React.useMemo(() => ({}), []);

  // TODO: Refactor friendRequestNotifications to use friends[].userMode if needed
  const friendRequestNotifications = React.useMemo(() => [], []);

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

  const deriveSearchUserMode = React.useCallback(
    (candidate) => {
      const candidateId = String(candidate?.id || "").trim();
      const candidateUsername = String(candidate?.username || "")
        .trim()
        .toLowerCase();

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

      if (candidateId && sentFriendRequestIds.has(candidateId)) {
        return "requestSent";
      }

      return "stranger";
    },
    [
      existingFriendIds,
      existingFriendUsernames,
      incomingFriendRequestIds,
      incomingFriendRequestIdsByUsername,
      sentFriendRequestIds,
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
              const id = String(user?._id || info?._id || "").trim();
              const username = String(
                info?.username || atSignup?.username || user?.username || "",
              )
                .trim()
                .toLowerCase();
              const firstname = String(
                info?.firstname || personal?.firstname || "",
              ).trim();
              const lastname = String(
                info?.lastname || personal?.lastname || "",
              ).trim();
              const displayName =
                `${firstname} ${lastname}`.trim() || username || "User";
              const profilePicture =
                personal?.profilePicture?.picture ||
                personal?.profilePicture ||
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
        return {
          id: String(entry?._id || entry?.id || info?._id || username || index),
          displayName,
          username,
          initials,
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

  const activeBlockedListGroupMeta = blockedListGroups.find(
    (group) => group.id === activeBlockedListGroup,
  ) ||
    blockedListGroups[0] || {
      id: DEFAULT_BLOCKED_LIST_GROUP,
      label: BLOCKED_LIST_GROUP_META[DEFAULT_BLOCKED_LIST_GROUP].label,
      iconClass: BLOCKED_LIST_GROUP_META[DEFAULT_BLOCKED_LIST_GROUP].iconClass,
      tabs: [],
      count: 0,
    };

  const activeBlockedListTabMeta = activeBlockedListGroupMeta.tabs.find(
    (tab) => tab.id === activeBlockedListTab,
  ) ||
    activeBlockedListGroupMeta.tabs[0] ||
    blockedListTabs.find((tab) => tab.id === activeBlockedListTab) ||
    blockedListTabs[0] || {
      id: DEFAULT_BLOCKED_LIST_USER_MODE,
      entries: [],
      count: 0,
      ...getFriendUserModeMeta(DEFAULT_BLOCKED_LIST_USER_MODE),
    };

  React.useEffect(() => {
    const nextGroupId = getBlockedListGroupIdForMode(
      activeBlockedListTabMeta.id,
    );
    if (nextGroupId !== activeBlockedListGroup) {
      setActiveBlockedListGroup(nextGroupId);
    }
  }, [activeBlockedListGroup, activeBlockedListTabMeta.id]);

  React.useEffect(() => {
    if (activeBlockedListTabMeta.id !== activeBlockedListTab) {
      setActiveBlockedListTab(activeBlockedListTabMeta.id);
    }
  }, [activeBlockedListTab, activeBlockedListTabMeta.id]);

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
  const hasActiveFriendSearchQuery =
    String(friendSearchQuery || "").trim() !== "";

  const getFriendPresenceState = React.useCallback(
    (friend) => {
      const friendId = String(friend?.chatId || "").trim();
      const isConnected = Boolean(friend?.isConnected);
      const isAvailableInChat = friendId
        ? Boolean(props.state?.friendChatPresence?.[friendId])
        : false;

      if (!isConnected) {
        return {
          iconClass: "fa-circle",
          label: "Offline",
          modifierClass: "Home_Noga_socialFriendStatus--offline",
        };
      }

      if (isAvailableInChat) {
        return {
          iconClass: "fa-comments",
          label: "In Chat",
          modifierClass: "Home_Noga_socialFriendStatus--online",
        };
      }

      return {
        iconClass: "fa-signal",
        label: "Online",
        modifierClass: "Home_Noga_socialFriendStatus--connected",
      };
    },
    [props.state?.friendChatPresence],
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

    return {
      iconClass: "fa-user-plus",
      label: "Not connected",
      modifierClass: "Home_Noga_socialFriendStatus--offline",
    };
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
      const isFriendChatOpen = openChatFriendId === friend.chatId;
      const unreadChatCount = isFriendChatOpen
        ? 0
        : unreadChatCountsByFriendId[friend.chatId] || 0;
      const friendPresenceState = getFriendPresenceState(friend);
      const incomingCall =
        props.state?.global_call_session?.incomingCall || null;
      const isIncomingCallForFriend =
        String(incomingCall?.fromUserId || "").trim() ===
        String(friend.chatId || "").trim();
      const incomingCallMode =
        incomingCall?.callType === "video" ? "video" : "voice";
      const inlineChatState = isFriendChatOpen
        ? {
            ...props.state,
            friendID_selected: friend.chatId,
            activeChatFriendId: friend.chatId,
            activeChatFriendName:
              friend.displayName || props.state?.activeChatFriendName || "Chat",
            isChatting: true,
          }
        : props.state;

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
                  />
                ) : (
                  <span aria-hidden="true">{friend.initials}</span>
                )}
              </div>
              <div className="Home_Noga_socialFriendCopy">
                <span className="Home_Noga_socialFriendName">
                  {friend.displayName}
                </span>
                <span className="Home_Noga_socialFriendUsername">
                  {friend.username || "Phenomed user"}
                </span>
              </div>
            </div>
            <div className="Home_Noga_socialFriendPresence">
              {unreadChatCount > 0 ? (
                <span className="Home_Noga_socialFriendUnreadBadge">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              ) : null}
              <span
                className={`Home_Noga_socialFriendStatus ${friendPresenceState.modifierClass}`}
              >
                <i className={`fas ${friendPresenceState.iconClass}`}></i>
                <span>{friendPresenceState.label}</span>
              </span>
              {isFriendChatOpen ? (
                <div
                  className="Home_Noga_socialFriendInlineCallActionsSlot"
                  ref={handleInlineCallActionsTargetRef}
                />
              ) : null}
            </div>
          </button>
          {isIncomingCallForFriend ? (
            <div className="Home_Noga_socialFriendIncomingCall">
              <div className="Home_Noga_socialFriendIncomingCallCopy">
                <strong>Incoming {incomingCallMode} call</strong>
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
          {isFriendChatOpen && friend.chatId ? (
            <div
              id={`Home_Noga_friendChat_${friend.chatId}`}
              className="Home_Noga_inlineFriendChat"
            >
              <FriendChat
                state={inlineChatState}
                content={HOME_CHAT_CONTENT}
                sendToThemMessage={props.sendToThemMessage}
                updateMyTypingPresence={props.updateMyTypingPresence}
                markMessagesRead={props.markMessagesRead}
                requestGlobalCall={props.requestGlobalCall}
                globalCallSession={props.state?.global_call_session}
                closeActiveChat={() => {
                  setInlineCallActionsTarget(null);
                  setOpenChatFriendId(null);
                  props.closeActiveChat?.();
                }}
                hideTitleContainer
                inlineCallActionsTarget={inlineCallActionsTarget}
              />
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
      getFriendPresenceState,
      unreadChatCountsByFriendId,
      handleToggleInlineFriendChat,
    ],
  );

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
            currentResults.filter((entry) => entry.username !== username),
          );
          setFriendSearchFeedback("Friend request sent.");
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
    ],
  );

  const renderSearchedUserListItem = React.useCallback(
    (candidate) => {
      const isSending = sendingFriendRequestUsername === candidate.username;
      const candidateUserModeMeta = getSearchCandidateUserModeMeta(candidate);
      const candidateId = String(candidate?.id || "").trim();
      const candidateMode = String(candidate?.userMode || "stranger")
        .trim()
        .toLowerCase();
      const canSendRequest = candidateMode === "stranger";
      const canCancelRequest = candidateMode === "requestsent";
      const canAcceptRequest = candidateMode === "requestreceived";
      const canRemoveFriend = candidateMode === "friend";
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
                  />
                ) : (
                  <span aria-hidden="true">{candidate.initials}</span>
                )}
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
            <div className="Home_Noga_socialFriendPresence">
              <span
                className={`Home_Noga_socialFriendStatus ${candidateUserModeMeta.modifierClass}`}
              >
                <i className={`fas ${candidateUserModeMeta.iconClass}`}></i>
                <span>{candidateUserModeMeta.label}</span>
              </span>
            </div>
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
              {canCancelRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => props.cancelSentFriendRequest?.(candidateId)}
                  disabled={!candidateId}
                  aria-label="Cancel friend request"
                  title="Cancel friend request"
                >
                  <i className="fas fa-ban"></i>
                </button>
              ) : null}
              {canAcceptRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--accept"
                  onClick={() =>
                    candidateId &&
                    props.acceptFriend?.(`accept_icon${candidateId}`)
                  }
                  disabled={!candidateId}
                  aria-label="Accept friend request"
                  title="Accept friend request"
                >
                  <i className="fas fa-user-check"></i>
                </button>
              ) : null}
              {canAcceptRequest ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => props.dismissFriendRequest?.(candidateId)}
                  disabled={!candidateId}
                  aria-label="Dismiss friend request"
                  title="Dismiss friend request"
                >
                  <i className="fas fa-times"></i>
                </button>
              ) : null}
              {canRemoveFriend ? (
                <button
                  type="button"
                  className="Home_Noga_socialRequestButton Home_Noga_socialRequestButton--dismiss"
                  onClick={() => props.removeFriend?.(candidateId)}
                  disabled={!candidateId}
                  aria-label="Remove friend"
                  title="Remove friend"
                >
                  <i className="fas fa-user-minus"></i>
                </button>
              ) : null}
            </div>
          </div>
        </li>
      );
    },
    [
      getSearchCandidateUserModeMeta,
      props,
      sendFriendRequestToUser,
      sendingFriendRequestUsername,
    ],
  );

  const renderConnectionSearchPanel = React.useCallback(
    ({ value, onChange, placeholder, ariaLabel }) => (
      <div className="Home_Noga_socialRequestSearchRow">
        <div className="Home_Noga_socialRequestSearchWrap">
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
      </div>
    ),
    [],
  );

  const renderFriendSearchPanel = React.useCallback(
    () =>
      renderConnectionSearchPanel({
        value: friendSearchQuery,
        onChange: setFriendSearchQuery,
        placeholder: "Search friends",
        ariaLabel: "Search friends",
      }),
    [friendSearchQuery, renderConnectionSearchPanel],
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

  const renderBlockedUserListItem = React.useCallback((user) => {
    const userModeMeta = getFriendUserModeMeta(user?.userMode);
    return (
      <li key={user.id} className="Home_Noga_socialFriendItem">
        <div className="Home_Noga_socialFriendSummary">
          <div className="Home_Noga_socialFriendIdentity">
            <div className="Home_Noga_socialFriendAvatar">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.displayName} avatar`}
                  className="Home_Noga_socialFriendAvatarImage"
                />
              ) : (
                <span aria-hidden="true">{user.initials}</span>
              )}
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
          <div className="Home_Noga_socialFriendPresence">
            <span className="Home_Noga_socialFriendStatus Home_Noga_socialFriendStatus--offline">
              <i className={`fas ${userModeMeta.iconClass}`}></i>
              <span>{userModeMeta.label}</span>
            </span>
          </div>
        </div>
      </li>
    );
  }, []);

  const renderBlockedListPanel = React.useCallback(
    () => (
      <div className="Home_Noga_socialBlockedPanel">
        <div className="Home_Noga_socialBlockedTabs">
          {blockedListGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`Home_Noga_socialBlockedTab${
                activeBlockedListGroup === group.id ? " isActive" : ""
              }`}
              onClick={() => setActiveBlockedListGroup(group.id)}
            >
              {group.label} ({group.count})
            </button>
          ))}
        </div>
        {activeBlockedListGroupMeta.tabs.length > 1 ? (
          <div className="Home_Noga_socialBlockedTabs">
            {activeBlockedListGroupMeta.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`Home_Noga_socialBlockedTab${
                  activeBlockedListTab === tab.id ? " isActive" : ""
                }`}
                onClick={() => setActiveBlockedListTab(tab.id)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        ) : null}
        <ul className="Home_Noga_socialFriendsList">
          {activeBlockedListTabMeta.entries.length === 0 ? (
            <li className="Home_Noga_socialFriendsEmptyState">
              {activeBlockedListTabMeta.emptyLabel}
            </li>
          ) : (
            activeBlockedListTabMeta.entries.map(renderBlockedUserListItem)
          )}
        </ul>
      </div>
    ),
    [
      activeBlockedListGroup,
      activeBlockedListGroupMeta,
      activeBlockedListTab,
      activeBlockedListTabMeta,
      blockedListGroups,
      renderBlockedUserListItem,
    ],
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
        homeDrawing:
          props.state?.homeDrawing &&
          typeof props.state.homeDrawing === "object"
            ? props.state.homeDrawing
            : { draftPaths: [], appliedPaths: [], textItems: [] },
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
      props.state?.homeDrawing,
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

    const maxVideoSizeBytes = 100 * 1024 * 1024;
    const preCheckMimeType = String(selectedFile?.type || "").trim();
    const targetResourceType = String(
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
            folder: cloudinaryPayload.folder,
            resourceType: cloudinaryPayload.resource_type || resourceType,
            mimeType,
            width: cloudinaryPayload.width,
            height: cloudinaryPayload.height,
            format: cloudinaryPayload.format,
            bytes: cloudinaryPayload.bytes,
            duration: cloudinaryPayload.duration,
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
    if (!isVisitLogOwner || !props.state?.token) {
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
  }, [isVisitLogOwner, props.state?.token, props.state?.visitLogRefreshToken]);

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
    const normalizedDrawing = normalizeHomeDrawingPayload(
      props.state?.homeDrawing,
    );

    if (isHomeDrawingModeEnabled || homeDrawing.draftPaths.length > 0) {
      return;
    }

    if (pendingHomeDrawingSyncRef.current) {
      const currentSerialized = JSON.stringify(homeDrawing);
      const nextSerialized = JSON.stringify(normalizedDrawing);

      if (currentSerialized !== nextSerialized) {
        return;
      }

      pendingHomeDrawingSyncRef.current = false;
    }

    setHomeDrawing((currentDrawing) => {
      const currentSerialized = JSON.stringify(currentDrawing);
      const nextSerialized = JSON.stringify(normalizedDrawing);
      return currentSerialized === nextSerialized
        ? currentDrawing
        : normalizedDrawing;
    });
  }, [
    homeDrawing.draftPaths.length,
    isHomeDrawingModeEnabled,
    props.state?.homeDrawing?.draftPaths,
    props.state?.homeDrawing?.appliedPaths,
    props.state?.homeDrawing?.textItems,
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

  React.useEffect(() => {
    if (!props.state?.token || !profilePictureSrc) {
      return;
    }

    if (!hasHydratedProfilePictureViewportRef.current) {
      return;
    }

    const stateViewport = normalizeProfilePictureViewport(
      props.state?.profilePictureViewport,
    );

    if (
      stateViewport.scale === profilePictureViewport.scale &&
      stateViewport.offsetX === profilePictureViewport.offsetX &&
      stateViewport.offsetY === profilePictureViewport.offsetY
    ) {
      return;
    }

    const saveTimeout = window.setTimeout(async () => {
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
      } catch (error) {
        // Keep local viewport state even if persistence fails.
      }
    }, 450);

    return () => {
      window.clearTimeout(saveTimeout);
    };
  }, [
    profilePictureSrc,
    profilePictureViewport,
    props.setUserMediaInfo,
    props.state?.imageGallery,
    props.state?.profilePicture,
    props.state?.profilePictureViewport,
    props.state?.token,
  ]);

  React.useEffect(() => {
    if (!props.state?.token) {
      return;
    }

    if (isHomeDrawingModeEnabled || homeDrawing.draftPaths.length > 0) {
      return;
    }

    const persistedDrawing = {
      draftPaths: [],
      appliedPaths: homeDrawing.appliedPaths,
      textItems: homeDrawing.textItems,
    };
    const persistedSerialized = JSON.stringify(persistedDrawing);
    const stateSerialized = JSON.stringify(
      normalizeHomeDrawingPayload(props.state?.homeDrawing),
    );

    if (persistedSerialized === stateSerialized) {
      return;
    }

    const saveTimeout = window.setTimeout(async () => {
      const requestId = latestHomeDrawingSaveRequestIdRef.current + 1;
      latestHomeDrawingSaveRequestIdRef.current = requestId;

      try {
        await persistHomeDrawing(persistedDrawing, { requestId });
      } catch (error) {
        // Keep local drawing state even if persistence fails.
        pendingHomeDrawingSyncRef.current = false;
      }
    }, 700);

    return () => {
      window.clearTimeout(saveTimeout);
    };
  }, [
    isHomeDrawingModeEnabled,
    homeDrawing.appliedPaths,
    homeDrawing.draftPaths.length,
    homeDrawing.textItems,
    persistHomeDrawing,
    props.state?.homeDrawing?.draftPaths,
    props.state?.homeDrawing?.appliedPaths,
    props.state?.homeDrawing?.textItems,
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
          program: academicInfoFields.program,
          university: academicInfoFields.university,
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
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
        studyYear: nextInfo?.studyYear || academicInfoFields.studyYear,
        term: nextInfo?.term || academicInfoFields.term,
        aiProvider:
          nextInfo?.aiProvider || String(props.state?.aiProvider || "openai"),
      });
      setAcademicInfoFields({
        program: nextInfo?.program || academicInfoFields.program,
        university: nextInfo?.university || academicInfoFields.university,
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
      program: String(props.state?.program || "").trim(),
      university: String(props.state?.university || "").trim(),
      studyYear: String(props.state?.studyYear || "").trim(),
      term: String(props.state?.term || "").trim(),
      aiProvider: String(props.state?.aiProvider || "openai").trim(),
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
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
        studyYear: nextInfo?.studyYear || payloadBody.studyYear,
        term: nextInfo?.term || payloadBody.term,
        aiProvider: nextInfo?.aiProvider || payloadBody.aiProvider,
      });
      setAcademicInfoFields({
        program: nextInfo?.program || payloadBody.program,
        university: nextInfo?.university || payloadBody.university,
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
      event.preventDefault();
      submitInlinePersonalInfoEdit();
      return;
    }

    if (event.key === "Escape") {
      setActivePersonalInfoField("");
      setPersonalInfoInputValue("");
    }
  };

  const renderInlineInfoField = (label, fieldName, fallback = "-") => {
    const isEditingThisField = activePersonalInfoField === fieldName;
    const displayValue = String(props.state?.[fieldName] || "").trim();

    return (
      <div className="fr Home_Noga_userMenu_contentDivs">
        <label>{label}:</label>
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

  const profileState =
    props.state && typeof props.state === "object" ? props.state : {};
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
        },
        {
          label: "Last name",
          value: formatProfileValue(profileState.lastname),
        },
        {
          label: "Username",
          value: formatProfileValue(profileState.username),
        },
        {
          label: "DOB",
          value: formattedDob,
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
        },
        {
          label: "Program",
          value: formatProfileValue(
            profileStudying.program || profileState.program,
          ),
        },
        {
          label: "Faculty",
          value: formatProfileValue(
            profileStudying.faculty || profileState.faculty,
          ),
        },
        {
          label: "Current year",
          value: formatProfileValue(profileStudyingCurrentDate.year),
        },
        {
          label: "Current term",
          value: formatProfileValue(
            profileStudyingCurrentDate.term ||
              profileStudying.term ||
              profileState.term,
          ),
        },
        {
          label: "Academic year",
          value: formatProfileValue(profileStudyingTime.currentAcademicYear),
        },
        {
          label: "Language",
          value: formatProfileValue(profileStudying.language),
        },
      ],
    },
    {
      title: "Work",
      rows: [
        {
          label: "Company",
          value: formatProfileValue(profileWorking.company),
        },
        {
          label: "Position",
          value: formatProfileValue(profileWorking.position),
        },
      ],
    },
    {
      title: "Contact",
      rows: [
        {
          label: "Email",
          value: formatProfileValue(profileState.email),
        },
        {
          label: "Phone",
          value: formatProfileValue(profileState.phone),
        },
        {
          label: "Location",
          value: formatProfileValue(
            [profileHometown.Country, profileHometown.City]
              .map((value) => String(value || "").trim())
              .filter(Boolean)
              .join(" / "),
          ),
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
  const bioWrapperStyle = {
    "--home-bio-wallpaper-image": currentBioWallpaperUrl
      ? `url("${currentBioWallpaperUrl.replace(/"/g, '\\"')}")`
      : "none",
    "--home-bio-wallpaper-size": `${currentBioWallpaperSize}px auto`,
    "--home-bio-wallpaper-repeat": currentBioWallpaperRepeat
      ? "repeat"
      : "no-repeat",
  };
  const drawingControlsPanel = (
    <div className="Home_Noga_mainDrawingControls Home_Noga_mainDrawingControls--open">
      <button
        type="button"
        className={`Home_Noga_mainDrawingButton Home_Noga_mainDrawingControls_panelItem${
          isHomeDrawingStartingFresh ? " isActive" : ""
        }`}
        onClick={() =>
          setIsHomeDrawingStartingFresh((currentValue) => !currentValue)
        }
        aria-pressed={isHomeDrawingStartingFresh}
        aria-label="Start a fresh unlinked line"
        title="Start a fresh unlinked line"
      >
        <i className="fas fa-plus"></i>
      </button>
      <button
        type="button"
        className={`Home_Noga_mainDrawingButton Home_Noga_mainDrawingControls_panelItem${
          isHomeDrawingAutoGlueEnabled ? " isActive" : ""
        }`}
        onClick={() =>
          setIsHomeDrawingAutoGlueEnabled((currentValue) => !currentValue)
        }
        aria-pressed={isHomeDrawingAutoGlueEnabled}
        aria-label={
          isHomeDrawingAutoGlueEnabled
            ? "Disable auto-gluing the line"
            : "Enable auto-gluing the line"
        }
        title={isHomeDrawingAutoGlueEnabled ? "Auto-glue on" : "Auto-glue off"}
      >
        <i className="fas fa-link"></i>
      </button>
      <button
        type="button"
        className={`Home_Noga_mainDrawingButton Home_Noga_mainDrawingControls_panelItem${
          isHomeDrawingAllowListEnabled ? " isActive" : ""
        }`}
        onClick={() =>
          setIsHomeDrawingAllowListEnabled((currentValue) => !currentValue)
        }
        aria-pressed={isHomeDrawingAllowListEnabled}
        aria-label="Toggle allow-list drawing zones"
        title={
          isHomeDrawingAllowListEnabled
            ? "Allow-list zones on"
            : "Allow-list zones off"
        }
      >
        <i className="fas fa-filter"></i>
      </button>
      {isHomeDrawingAllowListEnabled ? (
        <div className="Home_Noga_mainDrawingAllowList Home_Noga_mainDrawingControls_panelItem">
          <button
            type="button"
            className="Home_Noga_mainDrawingAllowSelect"
            onClick={() =>
              setIsHomeDrawingAllowZoneMenuOpen((currentValue) => !currentValue)
            }
            aria-haspopup="listbox"
            aria-expanded={isHomeDrawingAllowZoneMenuOpen}
            title="Select allow-list zone"
          >
            {HOME_DRAWING_ALLOWLIST_ZONES.find(
              (zone) => zone.id === activeHomeDrawingAllowZoneId,
            )?.label || "Canvas"}
            <i className="fas fa-chevron-down" aria-hidden="true"></i>
          </button>
          {isHomeDrawingAllowZoneMenuOpen ? (
            <div
              className="Home_Noga_mainDrawingAllowMenu"
              role="listbox"
              aria-label="Allowed drawing zones"
            >
              {HOME_DRAWING_ALLOWLIST_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={`Home_Noga_mainDrawingAllowOption${
                    activeHomeDrawingAllowZoneId === zone.id ? " isActive" : ""
                  }`}
                  onClick={() => {
                    setActiveHomeDrawingAllowZoneId(zone.id);
                    setIsHomeDrawingAllowZoneMenuOpen(false);
                  }}
                  role="option"
                  aria-selected={activeHomeDrawingAllowZoneId === zone.id}
                >
                  {zone.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="Home_Noga_mainDrawingAllowList Home_Noga_mainDrawingControls_panelItem">
        <button
          type="button"
          className="Home_Noga_mainDrawingAllowSelect"
          onClick={() =>
            setIsHomeDrawingVisibilityMenuOpen((currentValue) => !currentValue)
          }
          aria-haspopup="listbox"
          aria-expanded={isHomeDrawingVisibilityMenuOpen}
          title="Choose wrappers where drawing stays visible under children"
        >
          Visible ({homeDrawingVisibleWrapperIds.length})
          <i className="fas fa-eye" aria-hidden="true"></i>
        </button>
        {isHomeDrawingVisibilityMenuOpen ? (
          <div
            className="Home_Noga_mainDrawingAllowMenu Home_Noga_mainDrawingVisibilityMenu"
            role="listbox"
            aria-label="Drawing visibility wrappers"
          >
            {HOME_DRAWING_VISIBILITY_WRAPPERS.map((wrapper) => {
              const isChecked = homeDrawingVisibleWrapperIds.includes(
                wrapper.id,
              );

              return (
                <button
                  key={wrapper.id}
                  type="button"
                  className={`Home_Noga_mainDrawingAllowOption${
                    isChecked ? " isActive" : ""
                  }`}
                  onClick={() => toggleHomeDrawingVisibleWrapper(wrapper.id)}
                  role="option"
                  aria-selected={isChecked}
                >
                  <span className="Home_Noga_mainDrawingVisibilityCheck">
                    {isChecked ? "✓" : ""}
                  </span>
                  <span>{wrapper.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="Home_Noga_mainDrawingPalette fr Home_Noga_mainDrawingControls_panelItem">
        {HOME_DRAWING_PALETTES.map((palette) => (
          <button
            key={palette.id}
            type="button"
            className={`Home_Noga_mainDrawingPaletteButton${
              activeHomeDrawingPaletteId === palette.id ? " isActive" : ""
            }`}
            onClick={() => setActiveHomeDrawingPaletteId(palette.id)}
            aria-label={`Use ${palette.label} rope light color`}
            title={palette.label}
            style={{
              "--home-drawing-palette-stroke": palette.stroke,
              "--home-drawing-palette-glow": palette.glow,
            }}
          >
            <span aria-hidden="true"></span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="Home_Noga_mainDrawingButton Home_Noga_mainDrawingControls_panelItem"
        onClick={clearHomeDrawingCanvas}
        aria-label="Clear glow lines"
        title="Clear glow lines"
      >
        <i className="fas fa-eraser"></i>
      </button>
      <button
        type="button"
        className="Home_Noga_mainDrawingButton Home_Noga_mainDrawingControls_panelItem"
        onClick={handleToggleHomeDrawingMode}
        aria-label="Finish glow line drawing"
        title="Finish glow line drawing"
      >
        <i className="fas fa-check"></i>
      </button>
    </div>
  );
  return (
    <>
      <article
        id="Home_Noga_studysessions_article"
        className={[
          homeThemeClassName,
          isHomeNogaDarkTheme ? "Home_Noga_themeDark" : "",
          !isNaghamtrkmani ? "Home_Noga_root--bg" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section id="Home_Noga_visible_wrapper" className="fc slide-top">
          <div id="Home_Noga_main_wrapper" className="fc" ref={mainWrapperRef}>
            <div
              ref={appliedDrawingCanvasHostRef}
              className="Home_Noga_mainDrawingCanvasHost Home_Noga_mainDrawingCanvasHost--display"
            >
              <canvas
                ref={appliedDrawingCanvasRef}
                className="Home_Noga_mainDrawingCanvas"
              />
            </div>
            <div
              key={`home-drawing-canvas-${homeDrawingCanvasVersion}`}
              ref={drawingCanvasHostRef}
              className={`Home_Noga_mainDrawingCanvasHost${
                isHomeDrawingModeEnabled
                  ? " Home_Noga_mainDrawingCanvasHost--active"
                  : ""
              }`}
            >
              <canvas
                ref={drawingCanvasRef}
                className="Home_Noga_mainDrawingCanvas"
                onPointerDown={beginHomeDrawingStroke}
                onPointerMove={continueHomeDrawingStroke}
                onPointerUp={endHomeDrawingStroke}
                onPointerLeave={endHomeDrawingStroke}
                onPointerCancel={endHomeDrawingStroke}
              />
            </div>
            {isHomeDrawingModeEnabled ? drawingControlsPanel : null}
            <div id="Home_Noga_preStart_introWrap" className="fr">
              {/* Removed Home_Noga_preStart_profileWrapper and its contents */}
              <div
                id="Home_Noga_main_leftColumn_wrapper"
                className="Home_Noga_main_leftColumn_wrapper"
              >
                {renderHomeDrawingVisibilityCanvas("leftColumn")}
                <div
                  id="Home_Noga_bioWrapper"
                  className="Home_Noga_bioWrapper"
                  style={bioWrapperStyle}
                >
                  {renderHomeDrawingVisibilityCanvas("bio")}
                  <div
                    id="Home_Noga_preStart_profileWrapper"
                    ref={profilePictureWrapperRef}
                    style={{ position: "relative" }}
                  >
                    {renderHomeDrawingVisibilityCanvas("profile")}
                    {profilePictureSrc ? (
                      <img
                        id="Home_Noga_preStart_profilePic"
                        ref={profilePictureImageRef}
                        src={profilePictureSrc}
                        alt={`${props.state.firstname} ${props.state.lastname}`}
                        onDoubleClick={resetProfilePictureViewport}
                        onTouchStart={handleProfilePictureTouchStart}
                        onTouchMove={handleProfilePictureTouchMove}
                        onTouchEnd={handleProfilePictureTouchEnd}
                        onTouchCancel={handleProfilePictureTouchEnd}
                        onPointerDown={handleProfilePicturePointerDown}
                        onPointerMove={handleProfilePicturePointerMove}
                        onPointerUp={handleProfilePicturePointerUp}
                        onPointerCancel={handleProfilePicturePointerUp}
                        onWheel={handleProfilePictureWheel}
                        className={isProfilePictureDragging ? "isDragging" : ""}
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
                      onChange={handleProfilePictureSelected}
                    />
                  </div>
                  <div id="Home_Noga_preStart_personalBio" className="fc">
                    {renderHomeDrawingVisibilityCanvas("bioText")}
                    <div
                      id="Home_Noga_preStart_personalInfoGrid"
                      className="Home_Noga_preStart_personalInfoGrid--compact"
                    >
                      <div className="Home_Noga_compactBioCard">
                        <div className="Home_Noga_compactBioIdentity">
                          <h3 className="Home_Noga_compactBioName">
                            {compactDisplayName}
                          </h3>
                          <p className="Home_Noga_compactBioUsername">
                            {compactUsername}
                          </p>
                        </div>
                        <div className="Home_Noga_compactBioSummary">
                          <p className="Home_Noga_compactBioEyebrow">Bio</p>
                          <p className="Home_Noga_compactBioText">
                            {compactBio}
                          </p>
                          <button
                            type="button"
                            className="Home_Noga_aboutButton"
                            onClick={() =>
                              setIsAboutOpen((currentValue) => !currentValue)
                            }
                            aria-pressed={isAboutOpen}
                          >
                            {isAboutOpen ? "Close About" : "About"}
                          </button>
                          <button
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
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="Home_Noga_friendsEventsWrapper">
                  <div className="Home_Noga_friendsEvents">
                    {isAboutOpen ? (
                      <>
                        <div className="Home_Noga_friendsEventsHeader">
                          <h3>About Profile</h3>
                        </div>
                        <div className="Home_Noga_aboutPanel">
                          {profileColumns.map((column) => (
                            <section
                              key={`about-${column.title}`}
                              className="Home_Noga_profileInfoColumn"
                            >
                              <h4 className="Home_Noga_profileInfoColumnTitle">
                                {column.title}
                              </h4>
                              {column.rows.map((row) => (
                                <p key={`${column.title}-${row.label}`}>
                                  <strong>{row.label}</strong>
                                  <span>{row.value}</span>
                                </p>
                              ))}
                            </section>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="Home_Noga_friendsEventsHeader">
                          <h3>Friends Events</h3>
                        </div>
                        <div className="Home_Noga_friendsEventsEmpty">
                          There is no events to show.
                        </div>
                      </>
                    )}
                  </div>
                  <div className="Home_Noga_friendsGallery">
                    <div className="Home_Noga_friendsGalleryHeader">
                      <div className="Home_Noga_friendsGalleryHeaderTitleRow">
                        <h3>Gallery</h3>
                        <button
                          type="button"
                          className="Home_Noga_changePasswordSubmit Home_Noga_galleryUploadButton Home_Noga_friendsGalleryUploadButton"
                          onClick={openGalleryUploadPicker}
                          disabled={isImageGalleryUploading}
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
                          <span>
                            {isImageGalleryUploading
                              ? `Uploading ${activeGalleryUploadConfig.label}`
                              : `Upload ${activeGalleryUploadConfig.label}`}
                          </span>
                        </button>
                      </div>
                      <div className="Home_Noga_friendsGalleryHeaderControls">
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
                            <span>Images</span>
                          </button>
                          <button
                            type="button"
                            className={`Home_Noga_galleryTabButton${galleryTab === "patterns" ? " isActive" : ""}`}
                            onClick={() => setGalleryTab("patterns")}
                            aria-label="Patterns"
                            title="Patterns"
                            aria-pressed={galleryTab === "patterns"}
                          >
                            <i className="fas fa-shapes" aria-hidden="true"></i>
                            <span>Patterns</span>
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
                            <span>Videos</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {imageGallery.length ? (
                      <div className="Home_Noga_galleryGrid">
                        {imageGallery
                          .filter((image) =>
                            galleryTab === "images"
                              ? !isVideoGalleryItem(image) &&
                                String(
                                  image?.resourceType || image?.resource_type || "",
                                )
                                  .trim()
                                  .toLowerCase() !== "pattern"
                              : galleryTab === "patterns"
                                ? String(
                                    image?.resourceType ||
                                      image?.resource_type ||
                                      "",
                                  )
                                    .trim()
                                    .toLowerCase() === "pattern"
                                : isVideoGalleryItem(image),
                          )
                          .map((image) => {
                            const imagePublicId = String(image?.publicId || "");
                            const isVideoItem = isVideoGalleryItem(image);
                            const isActionsOpen =
                              imagePublicId === activeGalleryActionsPublicId;
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
                                        isVideoItem
                                          ? "Open video"
                                          : "View image"
                                      }
                                      title={
                                        isVideoItem
                                          ? "Open video"
                                          : "View image"
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
                                    <button
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
                                    </button>
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
                        {galleryTab === "patterns"
                          ? "No saved patterns yet."
                          : "No media uploaded yet."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <section
                id="Home_Noga_rightColumn_wrapper"
                className="Home_Noga_socialFriendsPanel"
              >
                {renderHomeDrawingVisibilityCanvas("rightColumn")}
                <div
                  id="Home_Noga_friendsCard"
                  className={`Home_Noga_socialFriendsCard fc${activeFriendCard ? " Home_Noga_socialFriendsCard--chatMounted" : ""}`}
                >
                  {activeFriendCard ? null : (
                    <div className="Home_Noga_gallery_Header_wrapper">
                      <div className="Home_Noga_socialFriendsHeaderTitleRow">
                        <h3 className="Home_Noga_socialFriendsTitle">
                          {isReportsWrapperOpen
                            ? "Settings"
                            : activeFriendsMiniTabMeta?.label || "Friends"}
                        </h3>
                        {isReportsWrapperOpen ? null : (
                          <span className="Home_Noga_socialFriendsCount">
                            {activeFriendsMiniTabMeta?.count || 0}
                          </span>
                        )}
                      </div>
                      {!isReportsWrapperOpen ? (
                        <div
                          className="Home_Noga_socialFriendsMiniNav"
                          style={{
                            "--home-friends-tab-count": 3,
                            "--home-friends-tab-index": Math.max(
                              0,
                              Math.min(activeFriendsMiniTabIndex, 2),
                            ),
                          }}
                        >
                          <div className="Home_Noga_socialFriendsMiniNavRail">
                            <span
                              className="Home_Noga_socialFriendsMiniNavSelector"
                              aria-hidden="true"
                            ></span>
                            {friendsMiniTabs.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                className={`Home_Noga_socialFriendsMiniNavButton${
                                  activeFriendsMiniTab === tab.id
                                    ? " isActive"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleSelectFriendsMiniTab(tab.id)
                                }
                                aria-label={tab.label}
                                title={tab.label}
                              >
                                <i className={tab.iconClass}></i>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {isReportsWrapperOpen ? null : (
                    <>
                      {activeFriendsMiniTab === "friends" ? (
                        <div className="Home_Noga_socialFriendsSearchAndBlocked">
                          {renderFriendSearchPanel()}
                          {renderBlockedListPanel()}
                        </div>
                      ) : (
                        <>
                          {activeFriendsMiniTab === "pages"
                            ? renderPageSearchPanel()
                            : renderGroupSearchPanel()}
                          <ul className="Home_Noga_socialFriendsList">
                            <li className="Home_Noga_socialFriendsEmptyState">
                              {activeFriendsMiniTab === "pages"
                                ? pageSearchQuery.trim()
                                  ? "No pages matched your search."
                                  : "No pages to show yet."
                                : groupSearchQuery.trim()
                                  ? "No groups matched your search."
                                  : "No groups to show yet."}
                            </li>
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>
            {/* /Home_Noga_preStart_leftPanel */}
          </div>
          <div
            id="Home_Noga_preStart_reportsWrapper"
            className={`fc Home_Noga_preStart_reports${isReportsWrapperOpen ? "" : " Home_Noga_preStart_reportsWrapper--closed"}`}
          >
            {renderHomeDrawingVisibilityCanvas("reports")}
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
                  >
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
          </div>
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
      </article>
    </>
  );
}
export default HomeNoga;
