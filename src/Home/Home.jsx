import { Link, useHistory } from "react-router-dom";
import "./home.css";
import Nav from "../Nav/Nav";
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
const socketRef = typeof window !== "undefined" ? { current: null } : null;

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
}
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

  if (normalizedValue === "requestsent" || normalizedValue === "requestreceived") {
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

// ...existing code...

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
      className="Home_imageViewerOverlay"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="Home_imageViewerCard"
      >
        <div className="Home_imageViewerHeader">
          <strong className="Home_imageViewerTitle">{activeImageLabel}</strong>
          <span className="Home_imageViewerCount">
            {hasImages ? `${boundedIndex + 1} / ${safeImages.length}` : "0 / 0"}
          </span>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="Home_imageViewerCloseButton"
          >
            x
          </button>
        </div>
        <div className="Home_imageViewerStage">
          {hasImages && activeImageUrl ? (
            <img
              src={activeImageUrl}
              alt={activeImageLabel}
              className="Home_imageViewerImage"
            />
          ) : (
            <p className="Home_imageViewerEmpty">No image available.</p>
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
                className="Home_imageViewerNavButton Home_imageViewerNavButton--prev"
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() =>
                  onChangeIndex?.((boundedIndex + 1) % safeImages.length)
                }
                className="Home_imageViewerNavButton Home_imageViewerNavButton--next"
              >
                {">"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const VideoViewerModal = ({ isOpen, video, onClose, title }) => {
  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const videoUrl = String(video?.url || "").trim();
  const videoLabel =
    String(video?.publicId || video?.fileName || title || "Video").trim() ||
    "Video";

  return (
    <div
      className="Home_videoViewerOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={String(title || videoLabel || "Video player")}
      onClick={() => onClose?.()}
    >
      <div
        className="fc Home_preStart_reportCard Home_preStart_reportsCard Home_videoViewerCard"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="Home_gallery_Header_wrapper fr Home_videoViewerHeader">
          <div className="fc Home_videoViewerTitleBlock">
            <span className="Home_videoViewerEyebrow">App health style player</span>
            <strong className="Home_videoViewerTitle">{videoLabel}</strong>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="Home_reportToggleButton Home_videoViewerCloseButton"
            aria-label="Close video player"
            title="Close"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div className="Home_reportBody Home_videoViewerBody isOpen">
          <div className="Home_videoViewerFrame">
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="Home_videoViewerMedia"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function Home(props) {
  // --- Friends Info Fetch State ---
  const [friendsInfo, setFriendsInfo] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);

  // Fetch friends info for users that are already friends (page load)
  useEffect(() => {
    const fetchFriends = async () => {
      if (!props.state?.token || !props.state?.my_id) return;
      setFriendsLoading(true);
      setFriendsError(null);
      try {
        const res = await fetch(
          apiUrl(`/api/user/update/${props.state.my_id}`),
          {
            headers: { Authorization: `Bearer ${props.state.token}` },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch friends info");
        const data = await res.json();
        // Only keep friends with userMode accepted (already friends)
        const acceptedFriends = Array.isArray(data.friends)
          ? data.friends.filter((f) => f.userMode?.includes("accepted"))
          : [];
        setFriendsInfo(acceptedFriends);
      } catch (err) {
        setFriendsError(err.message || "Unknown error");
        setFriendsInfo([]);
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchFriends();
  }, [props.state?.token, props.state?.my_id]);

  // Example: fetchFriendsByMode for requests/blocked/search (to be used on tab click/search)
  const fetchFriendsByMode = async (mode) => {
    if (!props.state?.token || !props.state?.my_id) return [];
    try {
      const res = await fetch(apiUrl(`/api/user/update/${props.state.my_id}`), {
        headers: { Authorization: `Bearer ${props.state.token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch friends info");
      const data = await res.json();
      return Array.isArray(data.friends)
        ? data.friends.filter((f) => f.userMode === mode)
        : [];
    } catch {
      return [];
    }
  };
  const isNaghamtrkmani = false;
  const homeThemeClassName = isNaghamtrkmani
    ? "Home_themeNoga"
    : "Home_themeGreen";
  // Set background style for everyone except naghamtrkmani
  const baseUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  // Style moved to CSS: .Home_root--bg
  const homeBackgroundStyle = undefined;
  // State to track which friend's chat is open
  const [openChatFriendId, setOpenChatFriendId] = useState(null);
  const [compressionProgress, setCompressionProgress] = useState(null);
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
  const [inlineCallActionsTarget, setInlineCallActionsTarget] = useState(null);
  const history = useHistory();
  const galleryUploadInputRef = React.useRef(null);
  const hasRecoveredPendingUploadsRef = React.useRef(false);
  const mainWrapperRef = React.useRef(null);
  const drawingCanvasRef = React.useRef(null);
  const drawingCanvasHostRef = React.useRef(null);
  const appliedDrawingCanvasRef = React.useRef(null);
  const appliedDrawingCanvasHostRef = React.useRef(null);
  const friendsMiniNavRef = React.useRef(null);
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
  // Gallery tab state: 'images' or 'videos'
  const [galleryTab, setGalleryTab] = useState("images");
  const [isImageGalleryDeletingPublicId, setIsImageGalleryDeletingPublicId] =
    useState("");
  const [
    isImageGallerySettingProfilePublicId,
    setIsImageGallerySettingProfilePublicId,
  ] = useState("");
  const [clearPendingFeedback, setClearPendingFeedback] = useState("");
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);
  const [activeGalleryVideo, setActiveGalleryVideo] = useState(null);
  const [activeGalleryImageIndex, setActiveGalleryImageIndex] = useState(0);
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
  const [isHomeDrawingModeEnabled, setIsHomeDrawingModeEnabled] =
    useState(false);
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

  const introWrapRef = React.useRef(null);
  const separatorDraggingRef = React.useRef(false);
  const separatorStartXRef = React.useRef(0);
  const separatorStartWidthRef = React.useRef(0);
  const [leftColumnWidthPercent, setLeftColumnWidthPercent] = useState(66);
  const friendsEventsWrapperRef = React.useRef(null);
  const friendsEventsHandleDraggingRef = React.useRef(false);
  const friendsEventsHandleStartXRef = React.useRef(0);
  const friendsEventsHandleStartWidthRef = React.useRef(75);
  const [friendsEventsWidthPercent, setFriendsEventsWidthPercent] =
    useState(75);
  const HOME_INTRO_SEPARATOR_WIDTH = 38;
  const HOME_LEFT_COLUMN_MIN_WIDTH = 520;
  const HOME_RIGHT_COLUMN_MIN_WIDTH = 300;
  const HOME_LEFT_COLUMN_MAX_WIDTH_RATIO = 0.82;

  const touchMoveOptions = React.useMemo(() => ({ passive: false }), []);

  useEffect(() => {
    if (!props.state?.token) {
      return undefined;
    }

    const userId = getUserIdFromToken(props.state.token);
    if (!userId) {
      return undefined;
    }

    if (!socketRef.current) {
      socketRef.current = io({ transports: ["websocket"] });
    }

    const socket = socketRef.current;
    const handleCompressionProgress = (data) => {
      setCompressionProgress(data.percent);
      if (data.done) {
        setTimeout(() => setCompressionProgress(null), 1200);
      }
    };

    socket.emit("join", userId.toString());
    socket.on("compression-progress", handleCompressionProgress);

    return () => {
      socket.off("compression-progress", handleCompressionProgress);
    };
  }, [props.state?.token]);
  const HOME_DRAWING_PATH_FILL = "rgba(118, 233, 247, 0.08)";
  const HOME_DRAWING_PATH_GLOW = "rgba(118, 233, 247, 0.16)";

  const clampLeftColumnWidthPercent = React.useCallback((nextWidthPercent) => {
    const containerWidth =
      introWrapRef.current?.getBoundingClientRect().width || 1;
    const availableWidth = Math.max(
      containerWidth - HOME_INTRO_SEPARATOR_WIDTH,
      1,
    );
    const minWidthPercent = (HOME_LEFT_COLUMN_MIN_WIDTH / availableWidth) * 100;
    const maxWidthPercent = Math.min(
      ((availableWidth - HOME_RIGHT_COLUMN_MIN_WIDTH) / availableWidth) * 100,
      HOME_LEFT_COLUMN_MAX_WIDTH_RATIO * 100,
    );
    const nextWidth = Math.min(
      maxWidthPercent,
      Math.max(minWidthPercent, nextWidthPercent),
    );
    return Number.isFinite(nextWidth) ? nextWidth : 66;
  }, []);

  const handlePointerMove = React.useCallback(
    (event) => {
      if (!separatorDraggingRef.current) {
        return;
      }

      const pageX =
        (event.touches && event.touches[0] && event.touches[0].pageX) ||
        event.pageX;
      const containerWidth =
        introWrapRef.current?.getBoundingClientRect().width || 1;
      const availableWidth = Math.max(
        containerWidth - HOME_INTRO_SEPARATOR_WIDTH,
        1,
      );
      const deltaPercent =
        ((pageX - separatorStartXRef.current) / availableWidth) * 100;

      setLeftColumnWidthPercent(
        clampLeftColumnWidthPercent(
          separatorStartWidthRef.current + deltaPercent,
        ),
      );
      event.preventDefault();
    },
    [clampLeftColumnWidthPercent],
  );

  const handlePointerUp = React.useCallback(() => {
    if (!separatorDraggingRef.current) {
      return;
    }
    separatorDraggingRef.current = false;
    document.removeEventListener("mousemove", handlePointerMove);
    document.removeEventListener(
      "touchmove",
      handlePointerMove,
      touchMoveOptions,
    );
    document.removeEventListener("mouseup", handlePointerUp);
    document.removeEventListener("touchend", handlePointerUp);
    document.removeEventListener("touchcancel", handlePointerUp);
  }, [handlePointerMove]);

  const startSeparatorDrag = React.useCallback(
    (event) => {
      event.preventDefault();
      separatorDraggingRef.current = true;
      separatorStartXRef.current =
        (event.touches && event.touches[0] && event.touches[0].pageX) ||
        event.pageX;
      separatorStartWidthRef.current = leftColumnWidthPercent;
      document.addEventListener("mousemove", handlePointerMove);
      document.addEventListener(
        "touchmove",
        handlePointerMove,
        touchMoveOptions,
      );
      document.addEventListener("mouseup", handlePointerUp);
      document.addEventListener("touchend", handlePointerUp);
      document.addEventListener("touchcancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, leftColumnWidthPercent],
  );

  React.useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener(
        "touchmove",
        handlePointerMove,
        touchMoveOptions,
      );
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("touchcancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp, touchMoveOptions]);

  const clampFriendsEventsWidthPercent = React.useCallback((nextWidth) => {
    const clampedWidth = Math.min(86, Math.max(44, nextWidth));
    return Number.isFinite(clampedWidth) ? clampedWidth : 75;
  }, []);

  const handleFriendsEventsHandleMove = React.useCallback(
    (event) => {
      if (!friendsEventsHandleDraggingRef.current) {
        return;
      }

      const pageX =
        (event.touches && event.touches[0] && event.touches[0].pageX) ||
        event.pageX;
      const wrapperWidth =
        friendsEventsWrapperRef.current?.getBoundingClientRect().width || 1;
      const deltaPercent =
        ((pageX - friendsEventsHandleStartXRef.current) / wrapperWidth) * 100;

      setFriendsEventsWidthPercent(
        clampFriendsEventsWidthPercent(
          friendsEventsHandleStartWidthRef.current + deltaPercent,
        ),
      );
      event.preventDefault();
    },
    [clampFriendsEventsWidthPercent],
  );

  const stopFriendsEventsHandleDrag = React.useCallback(() => {
    if (!friendsEventsHandleDraggingRef.current) {
      return;
    }

    friendsEventsHandleDraggingRef.current = false;
    document.removeEventListener("mousemove", handleFriendsEventsHandleMove);
    document.removeEventListener(
      "touchmove",
      handleFriendsEventsHandleMove,
      touchMoveOptions,
    );
    document.removeEventListener("mouseup", stopFriendsEventsHandleDrag);
    document.removeEventListener("touchend", stopFriendsEventsHandleDrag);
    document.removeEventListener("touchcancel", stopFriendsEventsHandleDrag);
  }, [handleFriendsEventsHandleMove, touchMoveOptions]);

  const startFriendsEventsHandleDrag = React.useCallback(
    (event) => {
      event.preventDefault();
      friendsEventsHandleDraggingRef.current = true;
      friendsEventsHandleStartXRef.current =
        (event.touches && event.touches[0] && event.touches[0].pageX) ||
        event.pageX;
      friendsEventsHandleStartWidthRef.current = friendsEventsWidthPercent;
      document.addEventListener("mousemove", handleFriendsEventsHandleMove);
      document.addEventListener(
        "touchmove",
        handleFriendsEventsHandleMove,
        touchMoveOptions,
      );
      document.addEventListener("mouseup", stopFriendsEventsHandleDrag);
      document.addEventListener("touchend", stopFriendsEventsHandleDrag);
      document.addEventListener("touchcancel", stopFriendsEventsHandleDrag);
    },
    [
      friendsEventsWidthPercent,
      handleFriendsEventsHandleMove,
      stopFriendsEventsHandleDrag,
      touchMoveOptions,
    ],
  );

  React.useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleFriendsEventsHandleMove);
      document.removeEventListener(
        "touchmove",
        handleFriendsEventsHandleMove,
        touchMoveOptions,
      );
      document.removeEventListener("mouseup", stopFriendsEventsHandleDrag);
      document.removeEventListener("touchend", stopFriendsEventsHandleDrag);
      document.removeEventListener("touchcancel", stopFriendsEventsHandleDrag);
    };
  }, [
    handleFriendsEventsHandleMove,
    stopFriendsEventsHandleDrag,
    touchMoveOptions,
  ]);

  React.useEffect(() => {
    setLeftColumnWidthPercent((currentWidth) =>
      clampLeftColumnWidthPercent(currentWidth),
    );
  }, [clampLeftColumnWidthPercent]);

  React.useEffect(() => {
    if (!introWrapRef.current) {
      return;
    }

    introWrapRef.current.style.setProperty(
      "--home-left-column-width",
      `${leftColumnWidthPercent}%`,
    );
    introWrapRef.current.style.setProperty(
      "--home-right-column-width",
      `calc(${100 - leftColumnWidthPercent}% - ${HOME_INTRO_SEPARATOR_WIDTH}px)`,
    );
  }, [HOME_INTRO_SEPARATOR_WIDTH, leftColumnWidthPercent]);

  const getNavChildForbiddenRects = React.useCallback(() => {
    if (!mainWrapperRef.current) {
      return [];
    }

    const wrapperRect = mainWrapperRef.current.getBoundingClientRect();
    const navChildSelectors = [
      "#Home_navWrap .Nav_actionButton",
      "#Home_navWrap #SubApps_icon_container",
      // Removed notification icons container
      "#Home_navWrap #Dim_article",
      "#Home_navWrap #Logout_article",
      "#Home_navWrap #Refresh_article",
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
      "#Home_main_leftColumn_wrapper",
      "#Home_rightColumn_wrapper",
      "#Home_preStart_reportsWrapper",
      "#Home_userMenuCluster",
      "#Home_navWrap .Nav_actionButton",
      "#Home_navWrap #SubApps_icon_container",
      // Removed notification icons container
      "#Home_navWrap #Dim_article",
      "#Home_navWrap #Logout_article",
      "#Home_navWrap #Refresh_article",
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

    homeDrawing.appliedPaths.forEach((segment) => {
      const rawPoints = Array.isArray(segment?.points) ? segment.points : [];
      if (rawPoints.length < 2) {
        return;
      }

      const palette = resolveHomeDrawingPalette(segment);
      const smoothedPoints = smoothHomeDrawingPoints(rawPoints);
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
      const effectiveMusicSignal = props.state?.planner_music?.isPlaying
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

      drawHomeLedRopePath(appliedContext, smoothedPoints, palette, {
        musicSignal: effectiveMusicSignal,
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

    getHomeDrawingMaskedRects().forEach((rect) => {
      const bleed = 0;
      const left = Math.max(0, rect.left - bleed);
      const top = Math.max(0, rect.top - bleed);
      const width = Math.max(0, rect.right - rect.left + bleed * 2);
      const height = Math.max(0, rect.bottom - rect.top + bleed * 2);
      const safeRadius = {
        topLeft: Math.max(0, Number(rect?.radii?.topLeft || 0)),
        topRight: Math.max(0, Number(rect?.radii?.topRight || 0)),
        bottomRight: Math.max(0, Number(rect?.radii?.bottomRight || 0)),
        bottomLeft: Math.max(0, Number(rect?.radii?.bottomLeft || 0)),
      };

      [draftContext].forEach((context) => {
        context.save();
        context.globalCompositeOperation = "destination-out";
        context.beginPath();

        if (typeof context.roundRect === "function") {
          context.roundRect(left, top, width, height, [
            safeRadius.topLeft,
            safeRadius.topRight,
            safeRadius.bottomRight,
            safeRadius.bottomLeft,
          ]);
        } else {
          const maxRadius = Math.min(width, height) / 2;
          const topLeft = Math.min(safeRadius.topLeft, maxRadius);
          const topRight = Math.min(safeRadius.topRight, maxRadius);
          const bottomRight = Math.min(safeRadius.bottomRight, maxRadius);
          const bottomLeft = Math.min(safeRadius.bottomLeft, maxRadius);

          context.moveTo(left + topLeft, top);
          context.lineTo(left + width - topRight, top);
          context.quadraticCurveTo(
            left + width,
            top,
            left + width,
            top + topRight,
          );
          context.lineTo(left + width, top + height - bottomRight);
          context.quadraticCurveTo(
            left + width,
            top + height,
            left + width - bottomRight,
            top + height,
          );
          context.lineTo(left + bottomLeft, top + height);
          context.quadraticCurveTo(
            left,
            top + height,
            left,
            top + height - bottomLeft,
          );
          context.lineTo(left, top + topLeft);
          context.quadraticCurveTo(left, top, left + topLeft, top);
        }

        context.closePath();
        context.fill();
        context.restore();
      });
    });
  }, [
    HOME_DRAWING_PATH_FILL,
    getHomeDrawingMaskedRects,
    homeDrawing.appliedPaths,
    homeDrawing.draftPaths,
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

  const beginHomeDrawingStroke = React.useCallback(
    (event) => {
      if (!isHomeDrawingModeEnabled) {
        return;
      }

      const point = getCanvasPointFromEvent(event);

      if (!point || isPointInsideNavChildCard(point)) {
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

      if (isPointInsideNavChildCard(point)) {
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

    const handlePlannerMusicSignalChange = (event) => {
      const nextAudioSignal = event?.detail?.audioSignal;

      if (!nextAudioSignal) {
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
    leftColumnWidthPercent,
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

    setOpenChatFriendId((currentFriendId) =>
      currentFriendId === globalActiveChatFriendId
        ? currentFriendId
        : globalActiveChatFriendId,
    );
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

  const toggleGalleryTopRow = () => {
    setIsGalleryTopRowVisible((value) => !value);
  };

  React.useEffect(() => {
    setAcademicInfoFields({
      program: String(props.state?.program || ""),
      university: String(props.state?.university || ""),
      studyYear: String(props.state?.studyYear || ""),
      term: String(props.state?.term || ""),
    });
  }, [
    props.state?.program,
    props.state?.university,
    props.state?.studyYear,
    props.state?.term,
  ]);

  React.useEffect(() => {
    setLoginLogEntries(
      Array.isArray(props.state?.login_record) ? props.state.login_record : [],
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
  const socialFriends = React.useMemo(
    () =>
      Array.isArray(props.state?.friends)
        ? [...props.state.friends]
            .filter((friend) => friend && typeof friend === "object")
            .filter((friend) => {
              const userMode = normalizeFriendUserMode(
                friend?.userMode || friend?.mode || friend?.relationship?.userMode,
              );
              return userMode === "friend";
            })
            .map((friend) => {
              const firstName = String(
                friend.info?.firstname ||
                  friend.identity?.personal?.firstname ||
                  "",
              ).trim();
              const lastName = String(
                friend.info?.lastname ||
                  friend.identity?.personal?.lastname ||
                  "",
              ).trim();
              const username = String(
                friend.info?.username ||
                  friend.identity?.atSignup?.username ||
                  "",
              ).trim();
              const displayName =
                `${firstName} ${lastName}`.trim() || username || "Doctor";
              const initials =
                `${firstName.charAt(0) || displayName.charAt(0) || "D"}${
                  lastName.charAt(0) || username.charAt(0) || ""
                }`.toUpperCase();

              return {
                id: String(friend._id || username || displayName).trim(),
                chatId: String(friend._id || "").trim(),
                displayName,
                initials: initials || "D",
                username,
                avatarUrl: String(
                  friend?.media?.profilePicture?.url ||
                    friend?.profilePicture ||
                    friend?.info?.profilePicture ||
                    friend?.identity?.personal?.profilePicture?.picture?.url ||
                    "",
                ).trim(),
                isConnected: Boolean(
                  friend.status?.isConnected ??
                  friend.identity?.status?.isLoggedIn,
                ),
              };
            })
            .sort((firstFriend, secondFriend) => {
              if (firstFriend.isConnected !== secondFriend.isConnected) {
                return (
                  Number(secondFriend.isConnected) -
                  Number(firstFriend.isConnected)
                );
              }

              return firstFriend.displayName.localeCompare(
                secondFriend.displayName,
              );
            })
        : [],
    [props.state?.friends],
  );

  const unreadChatCountsByFriendId = React.useMemo(() => {
    const notifications = Array.isArray(props.state?.notifications)
      ? props.state.notifications
      : [];

    return notifications.reduce((counts, notification) => {
      if (
        notification?.type !== "chat_message" ||
        notification?.status === "read"
      ) {
        return counts;
      }

      const friendId = String(notification.id || "").trim();

      if (!friendId) {
        return counts;
      }

      const nextCount = Number(notification.count);
      counts[friendId] = Number.isFinite(nextCount)
        ? Math.max(0, nextCount)
        : 1;
      return counts;
    }, {});
  }, [props.state?.notifications]);

  const friendRequestNotifications = React.useMemo(() => {
    const friendRequests = Array.isArray(props.state?.friend_requests)
      ? props.state.friend_requests
      : [];

    return friendRequests
      .map((request) => ({
        type: "friend_request",
        ...request,
      }))
      .filter(
        (notification) =>
          notification?.type === "friend_request" &&
          notification?.status !== "read",
      )
      .filter(
        (notification, index, allNotifications) =>
          allNotifications.findIndex(
            (candidate) =>
              String(candidate?._id || candidate?.id || "") ===
              String(notification?._id || notification?.id || ""),
          ) === index,
      );
  }, [props.state?.friend_requests]);


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
      setFriendSearchResults((currentResults) =>
        currentResults.length ? [] : currentResults,
      );
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
  }, [
    deriveSearchUserMode,
    friendSearchQuery,
    props.state?.my_id,
    props.state?.username,
  ]);

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
            normalizeFriendUserMode(entry?.userMode || DEFAULT_BLOCKED_LIST_USER_MODE) ===
            mode,
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
          modifierClass: "Home_socialFriendStatus--offline",
        };
      }

      if (isAvailableInChat) {
        return {
          iconClass: "fa-comments",
          label: "In Chat",
          modifierClass: "Home_socialFriendStatus--online",
        };
      }

      return {
        iconClass: "fa-signal",
        label: "Online",
        modifierClass: "Home_socialFriendStatus--connected",
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
        modifierClass: "Home_socialFriendStatus--online",
      };
    }

    if (userMode === "requestsent") {
      return {
        iconClass: "fa-paper-plane",
        label: "Request sent",
        modifierClass: "Home_socialFriendStatus--connected",
      };
    }

    if (userMode === "friend") {
      return {
        iconClass: "fa-user-check",
        label: "Friend",
        modifierClass: "Home_socialFriendStatus--connected",
      };
    }

    return {
      iconClass: "fa-user-plus",
      label: "Not connected",
      modifierClass: "Home_socialFriendStatus--offline",
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
          className={`Home_socialFriendItem fc${isFriendChatOpen ? " Home_socialFriendItem--chatOpen Home_socialFriendItem--activeView" : ""}`}
        >
          <button
            type="button"
            className="Home_socialFriendSummary fr"
            onClick={() => handleToggleInlineFriendChat(friend)}
            aria-expanded={isFriendChatOpen}
            aria-controls={
              friend.chatId ? `Home_friendChat_${friend.chatId}` : undefined
            }
            disabled={!friend.chatId}
          >
            <div className="Home_socialFriendIdentity fr">
              <div className="Home_socialFriendAvatar">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={`${friend.displayName} avatar`}
                    className="Home_socialFriendAvatarImage"
                  />
                ) : (
                  <i className="fas fa-user-circle" aria-hidden="true"></i>
                )}
              </div>
              <div className="Home_socialFriendCopy fc">
                <span className="Home_socialFriendName">
                  {friend.displayName}
                </span>
                <span className="Home_socialFriendUsername">
                  {friend.username || "Phenomed user"}
                </span>
              </div>
            </div>
            <div className="Home_socialFriendPresence">
              {unreadChatCount > 0 ? (
                <span className="Home_socialFriendUnreadBadge">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              ) : null}
              <span
                className={`Home_socialFriendStatus ${friendPresenceState.modifierClass}`}
              >
                <i className={`fas ${friendPresenceState.iconClass}`}></i>
                <span>{friendPresenceState.label}</span>
              </span>
              {isFriendChatOpen ? (
                <div
                  className="Home_socialFriendInlineCallActionsSlot"
                  ref={(node) => {
                    setInlineCallActionsTarget((currentTarget) =>
                      currentTarget === node ? currentTarget : node,
                    );
                  }}
                />
              ) : null}
            </div>
          </button>
          {isIncomingCallForFriend ? (
            <div className="Home_socialFriendIncomingCall fc">
              <div className="Home_socialFriendIncomingCallCopy fc">
                <strong>Incoming {incomingCallMode} call</strong>
                <span>
                  {friend.displayName || "Your friend"} is calling you.
                </span>
              </div>
              <div className="Home_socialFriendIncomingCallActions fr">
                <button
                  type="button"
                  className="Home_socialFriendCallButton Home_socialFriendCallButton--accept"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.state?.global_call_session?.acceptIncomingCall?.();
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="Home_socialFriendCallButton Home_socialFriendCallButton--decline"
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
              id={`Home_friendChat_${friend.chatId}`}
              className="Home_inlineFriendChat"
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

      // Try to get user info from notification or fallback
      const profilePicture =
        notification?.info?.profilePicture ||
        notification?.profilePicture ||
        notification?.identity?.personal?.profilePicture?.picture?.url ||
        "";
      const firstname =
        notification?.info?.firstname ||
        notification?.identity?.personal?.firstname ||
        "";
      const lastname =
        notification?.info?.lastname ||
        notification?.identity?.personal?.lastname ||
        "";
      const username =
        notification?.info?.username ||
        notification?.identity?.atSignup?.username ||
        notification?.username ||
        "";

      return (
        <li key={requestId || requesterId} className="Home_socialFriendItem fc">
          <div className="Home_socialFriendSummary fr">
            <div className="Home_socialFriendIdentity fr">
              <div className="Home_socialFriendAvatar">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={firstname || username || "User"}
                    className="Home_socialFriendAvatarImg"
                  />
                ) : (
                  <i className="fas fa-user-clock" aria-hidden="true"></i>
                )}
              </div>
              <div className="Home_socialFriendCopy fc">
                <span className="Home_socialFriendName">
                  {[firstname, lastname].filter(Boolean).join(" ") ||
                    username ||
                    "User"}
                </span>
                <span className="Home_socialFriendUsername">@{username}</span>
              </div>
            </div>
          </div>
          <div className="Home_socialRequestActions fr">
            <button
              type="button"
              className="Home_socialRequestButton Home_socialRequestButton--accept"
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
              className="Home_socialRequestButton Home_socialRequestButton--dismiss"
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
      const canAcceptRequest =
        candidateMode === "requestreceived";
      const canRemoveFriend = candidateMode === "friend";
      return (
        <li key={candidate.id} className="Home_socialFriendItem fc">
          <div className="Home_socialFriendSummary fr">
            <div className="Home_socialFriendIdentity fr">
              <div className="Home_socialFriendAvatar">
                {candidate.avatarUrl ? (
                  <img
                    src={candidate.avatarUrl}
                    alt={`${candidate.displayName} avatar`}
                    className="Home_socialFriendAvatarImage"
                  />
                ) : (
                  <span aria-hidden="true">{candidate.initials}</span>
                )}
              </div>
              <div className="Home_socialFriendCopy fc">
                <span className="Home_socialFriendName">
                  {candidate.displayName}
                </span>
                <span className="Home_socialFriendUsername">
                  {candidate.username || "Phenomed user"}
                </span>
              </div>
            </div>
            <div className="Home_socialFriendPresence">
              <span
                className={`Home_socialFriendStatus ${candidateUserModeMeta.modifierClass}`}
              >
                <i className={`fas ${candidateUserModeMeta.iconClass}`}></i>
                <span>{candidateUserModeMeta.label}</span>
              </span>
            </div>
            <div className="Home_socialRequestActions fr">
              {canSendRequest ? (
                <button
                  type="button"
                  className="Home_socialRequestButton Home_socialRequestButton--accept"
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
                  className="Home_socialRequestButton Home_socialRequestButton--dismiss"
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
                  className="Home_socialRequestButton Home_socialRequestButton--accept"
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
                  className="Home_socialRequestButton Home_socialRequestButton--dismiss"
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
                  className="Home_socialRequestButton Home_socialRequestButton--dismiss"
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
      <div className="Home_socialRequestSearchRow">
        <div className="Home_socialRequestSearchWrap fr">
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
      <li key={user.id} className="Home_socialFriendItem fc">
        <div className="Home_socialFriendSummary fr">
          <div className="Home_socialFriendIdentity fr">
            <div className="Home_socialFriendAvatar">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.displayName} avatar`}
                  className="Home_socialFriendAvatarImage"
                />
              ) : (
                <span aria-hidden="true">{user.initials}</span>
              )}
            </div>
            <div className="Home_socialFriendCopy fc">
              <span className="Home_socialFriendName">{user.displayName}</span>
              <span className="Home_socialFriendUsername">
                {user.username || "Blocked user"}
              </span>
            </div>
          </div>
          <div className="Home_socialFriendPresence">
            <span className="Home_socialFriendStatus Home_socialFriendStatus--offline">
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
      <div className="Home_socialBlockedPanel fc">
        <div className="Home_socialBlockedTabs fr">
          {blockedListGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`Home_socialBlockedTab${
                activeBlockedListGroup === group.id ? " isActive" : ""
              }`}
              onClick={() => setActiveBlockedListGroup(group.id)}
            >
              {group.label} ({group.count})
            </button>
          ))}
        </div>
        {activeBlockedListGroupMeta.tabs.length > 1 ? (
          <div className="Home_socialBlockedTabs fr">
            {activeBlockedListGroupMeta.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`Home_socialBlockedTab${
                  activeBlockedListTab === tab.id ? " isActive" : ""
                }`}
                onClick={() => setActiveBlockedListTab(tab.id)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        ) : null}
        <ul className="Home_socialFriendsList">
          {activeBlockedListTabMeta.entries.length === 0 ? (
            <li className="Home_socialFriendsEmptyState">
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
  const openProfilePicturePicker = () => {
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
    const isVideoFilePre = preCheckMimeType.toLowerCase().startsWith("video/");

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
            galleryPayload?.message || uploadResult?.message || "Unable to refresh media gallery.",
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
      existingUploadTask?.resourceType || (isVideoFile ? "video" : "image");
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
      sendCloudinaryReply(
        payload?.message || "Media deleted from gallery.",
      );
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

    const activeVideoPublicId = String(activeGalleryVideo?.publicId || "").trim();
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
  }, [props.state?.profilePictureViewport]);

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
    props.state?.homeDrawing,
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
    homeDrawing,
    persistHomeDrawing,
    props.setUserMediaInfo,
    props.state?.imageGallery,
    props.state?.homeDrawing,
    props.state?.profilePicture,
    props.state?.profilePictureViewport,
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
      <div className="fr Home_userMenu_contentDivs">
        <label>{label}:</label>
        {isEditingThisField ? (
          <input
            type="text"
            className="Home_userMenu_inlineInput"
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
          className="Home_userMenu_infoEditIcon"
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
  return (
    <>
      {compressionProgress !== null && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#1a2a2f",
            color: "#fff",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          Compressing video: {compressionProgress}%
        </div>
      )}
      <article
        id="Home_studysessions_article"
        className={[homeThemeClassName, !isNaghamtrkmani ? "Home_root--bg" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <section id="Home_visible_wrapper" className="fc slide-top">
          <div id="Home_main_wrapper" className="fc" ref={mainWrapperRef}>
            <div
              className={`Home_mainDrawingControls fr${
                isHomeDrawingModeEnabled
                  ? " Home_mainDrawingControls--open"
                  : " Home_mainDrawingControls--closed"
              }`}
            >
              <button
                type="button"
                className={`Home_mainDrawingButton${
                  isHomeDrawingModeEnabled ? " isActive" : ""
                }`}
                onClick={handleToggleHomeDrawingMode}
                aria-pressed={isHomeDrawingModeEnabled}
                aria-label={
                  isHomeDrawingModeEnabled
                    ? "Disable glow line drawing"
                    : "Enable glow line drawing"
                }
                title={
                  isHomeDrawingModeEnabled
                    ? "Disable glow line drawing"
                    : "Enable glow line drawing"
                }
              >
                <i className="fas fa-pen-nib"></i>
              </button>
              <button
                type="button"
                className={`Home_mainDrawingButton Home_mainDrawingControls_panelItem${
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
                className={`Home_mainDrawingButton Home_mainDrawingControls_panelItem${
                  isHomeDrawingAutoGlueEnabled ? " isActive" : ""
                }`}
                onClick={() =>
                  setIsHomeDrawingAutoGlueEnabled(
                    (currentValue) => !currentValue,
                  )
                }
                aria-pressed={isHomeDrawingAutoGlueEnabled}
                aria-label={
                  isHomeDrawingAutoGlueEnabled
                    ? "Disable auto-gluing the line"
                    : "Enable auto-gluing the line"
                }
                title={
                  isHomeDrawingAutoGlueEnabled
                    ? "Auto-glue on"
                    : "Auto-glue off"
                }
              >
                <i className="fas fa-link"></i>
              </button>
              <div className="Home_mainDrawingPalette fr Home_mainDrawingControls_panelItem">
                {HOME_DRAWING_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    className={`Home_mainDrawingPaletteButton Home_mainDrawingPaletteButton--${palette.id}${
                      activeHomeDrawingPaletteId === palette.id
                        ? " isActive"
                        : ""
                    }`}
                    onClick={() => setActiveHomeDrawingPaletteId(palette.id)}
                    aria-label={`Use ${palette.label} rope light color`}
                    title={palette.label}
                  >
                    <span aria-hidden="true"></span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="Home_mainDrawingButton Home_mainDrawingControls_panelItem"
                onClick={clearHomeDrawingCanvas}
                aria-label="Clear glow lines"
                title="Clear glow lines"
              >
                <i className="fas fa-eraser"></i>
              </button>
            </div>
            <div
              ref={appliedDrawingCanvasHostRef}
              className="Home_mainDrawingCanvasHost Home_mainDrawingCanvasHost--display"
            >
              <canvas
                ref={appliedDrawingCanvasRef}
                className="Home_mainDrawingCanvas"
              />
            </div>
            <div
              key={`home-drawing-canvas-${homeDrawingCanvasVersion}`}
              ref={drawingCanvasHostRef}
              className={`Home_mainDrawingCanvasHost${
                isHomeDrawingModeEnabled
                  ? " Home_mainDrawingCanvasHost--active"
                  : ""
              }`}
            >
              <canvas
                ref={drawingCanvasRef}
                className="Home_mainDrawingCanvas"
                onPointerDown={beginHomeDrawingStroke}
                onPointerMove={continueHomeDrawingStroke}
                onPointerUp={endHomeDrawingStroke}
                onPointerLeave={endHomeDrawingStroke}
                onPointerCancel={endHomeDrawingStroke}
              />
            </div>
            <div id="Home_topControls" className="fr">
              <div id="Home_navWrap">
                <Nav
                  path="/"
                  state={props.state}
                  logOut={props.logOut}
                  acceptFriend={props.acceptFriend}
                  makeNotificationsRead={props.makeNotificationsRead}
                  extraActions={[
                    {
                      id: "friends-list",
                      label: "Friends",
                      iconClass: "fas fa-user-friends",
                      isActive: !isReportsWrapperOpen,
                      onClick: () => {
                        setIsReportsWrapperOpen(false);
                        setShowGalleryInRightColumn(false);
                        setOpenChatFriendId(null);
                        props.closeActiveChat?.();
                      },
                    },
                    {
                      id: "reports-settings",
                      label: isReportsWrapperOpen
                        ? "Hide Reports"
                        : "Open Reports",
                      iconClass: "fas fa-cog",
                      isActive: isReportsWrapperOpen,
                      onClick: () =>
                        setIsReportsWrapperOpen(
                          (currentValue) => !currentValue,
                        ),
                    },
                  ]}
                  subApps={homeSubApps}
                />
              </div>
            </div>
            <div id="Home_preStart_introWrap" className="fr" ref={introWrapRef}>
              {/* Removed Home_preStart_profileWrapper and its contents */}
              <div
                id="Home_main_leftColumn_wrapper"
                className="Home_main_leftColumn_wrapper"
              >
                <div id="Home_bioWrapper" className="Home_bioWrapper fc">
                  <div
                    id="Home_preStart_profileWrapper"
                    ref={profilePictureWrapperRef}
                  >
                    {profilePictureSrc ? (
                      <img
                        id="Home_preStart_profilePic"
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
                      ref={galleryUploadInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="Home_hiddenFileInput"
                      onChange={handleProfilePictureSelected}
                    />
                  </div>
                  <div id="Home_preStart_personalBio" className="fc">
                    <div className="Home_preStart_bioFlexRow">
                      <div className="Home_preStart_bioLeft fc">
                        <span id="Home_preStart_bio_name">
                          {props.state.firstname || "-"}{" "}
                          {props.state.lastname || "-"}
                        </span>
                        <span id="Home_preStart_bio_username">
                          ({props.state.username || "-"})
                        </span>
                      </div>
                      <div className="Home_preStart_bioRight fc">
                        <span id="Home_preStart_bio_study">
                          Studying {props.state.program || "-"} at{" "}
                          {props.state.university || "-"} University
                        </span>
                        <div id="Home_preStart_bio_yearTermRow">
                          <span id="Home_preStart_bio_year">
                            Year {props.state.studyYear || "-"}
                          </span>
                          <span id="Home_preStart_bio_term">
                            Term {props.state.term || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="Home_friendsEventsWrapper fr">
                  <div className="Home_friendsEvents fc">
                    <div className="Home_friendsEventsHeader fr">
                      <h3>Friends Events</h3>
                    </div>
                    <div className="Home_friendsEventsEmpty">
                      There is no events to show.
                    </div>
                  </div>
                  <div className="Home_friendsGallery fc">
                    <div className="Home_friendsGalleryHeader fc">
                      <h3>Gallery</h3>
                      <div className="Home_friendsGalleryHeaderControls fr">
                        <div className="Home_galleryTabs fr">
                        <button
                          type="button"
                          className={`Home_galleryTabButton${galleryTab === "images" ? " isActive" : ""}`}
                          onClick={() => setGalleryTab("images")}
                        >
                          Images
                        </button>
                        <button
                          type="button"
                          className={`Home_galleryTabButton${galleryTab === "videos" ? " isActive" : ""}`}
                          onClick={() => setGalleryTab("videos")}
                        >
                          Videos
                        </button>
                      </div>
                      <button
                        type="button"
                        className="Home_changePasswordSubmit Home_galleryUploadButton Home_friendsGalleryUploadButton"
                        onClick={openProfilePicturePicker}
                        disabled={isImageGalleryUploading}
                      >
                        {isImageGalleryUploading ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                    </div>
                    {imageGallery.length ? (
                      <div className="Home_galleryGrid">
                        {imageGallery
                          .filter((image) =>
                            galleryTab === "images"
                              ? !isVideoGalleryItem(image)
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
                                className="Home_galleryItem fc"
                              >
                                <div className="Home_galleryThumbWrap">
                                  <button
                                    type="button"
                                    className="Home_galleryThumbButton"
                                    onClick={() =>
                                      toggleGalleryItemActions(image.publicId)
                                    }
                                    title="Show media actions"
                                  >
                                    {isVideoItem ? (
                                      <video
                                        src={image.url}
                                        className="Home_galleryThumb"
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img
                                        src={image.url}
                                        alt="Gallery upload"
                                        className="Home_galleryThumb"
                                      />
                                    )}
                                  </button>
                                  <div
                                    className={`Home_galleryItemActions fc${isActionsOpen ? " Home_galleryItemActions--open" : ""}`}
                                  >
                                    <button
                                      type="button"
                                      className="Home_editPicButton"
                                      onClick={() => {
                                        if (isVideoItem) {
                                          if (typeof window !== "undefined") {
                                            window.open(
                                              image.url,
                                              "_blank",
                                              "noopener,noreferrer",
                                            );
                                          }
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
                                      className="Home_editPicButton"
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
                                      className="Home_editPicButton"
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
                      <div className="Home_galleryEmptyState">
                        No media uploaded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="Home_introSeparator"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize home columns"
                onMouseDown={startSeparatorDrag}
                onTouchStart={startSeparatorDrag}
              ></div>
              <section
                id="Home_rightColumn_wrapper"
                className="Home_socialFriendsPanel fc"
              >
                <div
                  id="Home_friendsCard"
                  className={`Home_socialFriendsCard fc${activeFriendCard ? " Home_socialFriendsCard--chatMounted" : ""}`}
                >
                  {activeFriendCard ? null : (
                    <div className="Home_gallery_Header_wrapper fr">
                      <div className="Home_socialFriendsHeaderCopy fc">
                        <div className="Home_socialFriendsHeaderTitleRow fr">
                          <h3 className="Home_socialFriendsTitle">
                            {isReportsWrapperOpen ? "Settings" : "Friends"}
                          </h3>
                          {isReportsWrapperOpen ? null : (
                            <span className="Home_socialFriendsCount">
                              {activeFriendsMiniTabMeta?.count || 0}
                            </span>
                          )}
                        </div>
                        {!isReportsWrapperOpen ? (
                          <div
                            className="Home_socialFriendsMiniNav"
                            ref={friendsMiniNavRef}
                            style={{
                              "--home-friends-tab-count": 3,
                              "--home-friends-tab-index": Math.max(
                                0,
                                Math.min(activeFriendsMiniTabIndex, 2),
                              ),
                            }}
                          >
                            <div className="Home_socialFriendsMiniNavRail">
                              <span
                                className="Home_socialFriendsMiniNavSelector"
                                aria-hidden="true"
                              ></span>
                              {friendsMiniTabs.map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  className={`Home_socialFriendsMiniNavButton${
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
                    </div>
                  )}
                  {isReportsWrapperOpen ? null : (
                    <>
                      {activeFriendsMiniTab === "friends" ? (
                        <>
                          {renderFriendSearchPanel()}
                          {renderBlockedListPanel()}
                        </>
                      ) : (
                        <>
                          {activeFriendsMiniTab === "pages"
                            ? renderPageSearchPanel()
                            : renderGroupSearchPanel()}
                          <ul className="Home_socialFriendsList">
                            <li className="Home_socialFriendsEmptyState">
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
            {/* /Home_preStart_leftPanel */}
          </div>
          <div
            id="Home_preStart_reportsWrapper"
            className={`fc Home_preStart_reports${isReportsWrapperOpen ? "" : " Home_preStart_reportsWrapper--closed"}`}
          >
            <div className="Home_settingsBackRow fr">
              <button
                type="button"
                className="Home_settingsBackButton"
                onClick={() => setIsReportsWrapperOpen(false)}
                aria-label="Back from settings"
                title="Back"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back</span>
              </button>
            </div>
            <div className="fc Home_preStart_reportCard Home_preStart_reportsCard">
              <div className="Home_gallery_Header_wrapper fr">
                <h3>Log Record: Date and Time</h3>
                <div className="Home_gallery_Header_wrapperActions fr">
                  <button
                    type="button"
                    className="Home_reportDeleteButton"
                    onClick={clearLoginLog}
                    disabled={isLoginLogDeleting}
                    aria-label="Delete all login log entries"
                    title="Delete all login log entries"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
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
                className={`Home_reportBody fc${isReportSectionOpen("loginLog") ? " isOpen" : ""}`}
              >
                <ul className="fc Home_studySessions_area">
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
                          className="Home_logRecordViewer"
                        >
                          <button
                            type="button"
                            className="Home_logRecordArrow"
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
                          <div className="Home_logRecordCard">
                            <div className="Home_logRecordEntry fc">
                              <span className="Home_logRecordLabel">
                                Login:
                              </span>
                              <span className="Home_logRecordValue">
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
                            <div className="Home_logRecordEntry fc">
                              <span className="Home_logRecordLabel">
                                Logout:
                              </span>
                              <span className="Home_logRecordValue">
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
                            className="Home_logRecordArrow"
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
              <div className="fc Home_preStart_reportCard Home_preStart_reportsCard">
                <div className="Home_gallery_Header_wrapper fr">
                  <h3>Visit Log: App Entries</h3>
                  <div className="Home_gallery_Header_wrapperActions fr">
                    <button
                      type="button"
                      className="Home_reportDeleteButton"
                      onClick={clearVisitLog}
                      disabled={isVisitLogDeleting}
                      aria-label="Delete all visit log entries"
                      title="Delete all visit log entries"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    <button
                      type="button"
                      className="Home_reportToggleButton"
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
                  className={`Home_reportBody fc${isReportSectionOpen("visitLog") ? " isOpen" : ""}`}
                >
                  <ul className="fc Home_studySessions_area">
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
                            className="Home_logRecordViewer"
                          >
                            <button
                              type="button"
                              className="Home_logRecordArrow"
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
                            <div className="Home_logRecordCard Home_logRecordCard--stacked">
                              <div className="Home_logRecordEntry fc">
                                <span className="Home_logRecordLabel">IP:</span>
                                <span className="Home_logRecordValue">
                                  {`${activeVisitLogRecord.ip || "Unknown IP"} (${activeVisitLogRecord.country || "Unknown"})`}
                                </span>
                              </div>
                              <div className="Home_logRecordEntry fc">
                                <span className="Home_logRecordLabel">
                                  Visited:
                                </span>
                                <span className="Home_logRecordValue">
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
                              className="Home_logRecordArrow"
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
              <div className="fc Home_preStart_reportsCard">
                <div className="Home_gallery_Header_wrapper fr">
                  <h3>naghamtrkmani course letter</h3>
                  <button
                    type="button"
                    className="Home_reportToggleButton"
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
                  className={`Home_reportBody fc${isReportSectionOpen("naghamLetter") ? " isOpen" : ""}`}
                >
                  <div id="Home_naghamCourseLetter_div" className="fc">
                    <select
                      id="Home_naghamCourseLetter_select"
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
                      id="Home_naghamCourseLetter_textarea"
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
                      className="Home_changePasswordSubmit"
                      onClick={saveNaghamCourseLetter}
                    >
                      Save note
                    </button>
                    {naghamCourseLetterFeedback ? (
                      <p className="Home_passwordFeedback Home_passwordFeedback--success">
                        {naghamCourseLetterFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="fc Home_preStart_reportsCard">
              <div className="Home_gallery_Header_wrapper fr">
                <h3>planner music playlist</h3>
                <button
                  type="button"
                  className="Home_reportToggleButton"
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
                className={`Home_reportBody fc${isReportSectionOpen("musicPlaylist") ? " isOpen" : ""}`}
              >
                <div id="Home_musicArchivePlaylist_div" className="fc">
                  <div className="Home_musicLibraryCompact fc">
                    <div className="Home_musicApiHeader fr">
                      <strong>Music library</strong>
                      <span>One compact place for all music sources</span>
                    </div>

                    <div className="Home_musicLibraryMainRow fr">
                      <div className="Home_musicLibraryUnifiedSearch fc">
                        <div className="Home_musicArchiveSearch_row fr">
                          <input
                            id="Home_musicLibrarySongSearch_input"
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
                            id="Home_musicLibraryArtistSearch_input"
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
                            className="Home_changePasswordSubmit"
                            onClick={searchAllMusicLibrarySources}
                            disabled={isMusicLibrarySearching}
                          >
                            {isMusicLibrarySearching
                              ? "Searching..."
                              : "Search"}
                          </button>
                        </div>
                        {musicLibrarySearchFeedback ? (
                          <p className="Home_passwordFeedback Home_passwordFeedback--success">
                            {musicLibrarySearchFeedback}
                          </p>
                        ) : null}
                      </div>

                      <div className="Home_musicLibraryCompactSections fc">
                        <section className="Home_musicLibrarySource fc">
                          <div className="Home_musicLibrarySourceHeader fr">
                            <strong>Internet Archive</strong>
                            <span>Direct archive identifiers and search</span>
                          </div>
                          <div id="Home_musicArchiveSearch_div" className="fc">
                            {musicArchiveSearchResults.length > 0 ? (
                              <ul
                                id="Home_musicArchiveSearch_results"
                                className="fc"
                              >
                                {musicArchiveSearchResults.map((result) => (
                                  <li
                                    key={result.identifier}
                                    className="Home_musicArchiveSearch_result"
                                    onClick={() =>
                                      addMusicArchiveSong(result.identifier)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        addMusicArchiveSong(result.identifier);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    title={result.identifier}
                                  >
                                    <strong>{result.title}</strong>
                                    <div className="Home_musicArchiveSearch_meta fr">
                                      <span>{result.creator}</span>
                                      <em className="Home_musicArchiveSearch_sourceTag">
                                        Internet Archive
                                      </em>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </section>

                        <section className="Home_musicLibrarySource fc">
                          <div className="Home_musicLibrarySourceHeader fr">
                            <strong>iTunes Search API</strong>
                            <span>Preview-based search results</span>
                          </div>
                          <div className="Home_musicArchiveSearch_div fc">
                            {itunesSearchResults.length > 0 ? (
                              <ul id="Home_itunesSearch_results" className="fc">
                                {itunesSearchResults.map((result) => (
                                  <li
                                    key={result.identifier || result.queryLabel}
                                    className="Home_musicArchiveSearch_result"
                                    onClick={() =>
                                      addITunesSong(result.queryLabel)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        addITunesSong(result.queryLabel);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    title={result.queryLabel}
                                  >
                                    <strong>{result.title}</strong>
                                    <div className="Home_musicArchiveSearch_meta fr">
                                      <span>{result.creator}</span>
                                      <em className="Home_musicArchiveSearch_sourceTag">
                                        iTunes
                                      </em>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </section>

                        <section className="Home_musicLibrarySource fc">
                          <div className="Home_musicLibrarySourceHeader fr">
                            <strong>MusicBrainz</strong>
                            <span>
                              Metadata search that resolves to playable matches
                            </span>
                          </div>
                          <div className="Home_musicArchiveSearch_div fc">
                            {musicBrainzSearchResults.length > 0 ? (
                              <ul
                                id="Home_musicBrainzSearch_results"
                                className="fc"
                              >
                                {musicBrainzSearchResults.map((result) => (
                                  <li
                                    key={result.identifier || result.queryLabel}
                                    className="Home_musicArchiveSearch_result"
                                    onClick={() =>
                                      addMusicBrainzSong(result.queryLabel)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        addMusicBrainzSong(result.queryLabel);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    title={result.queryLabel}
                                  >
                                    <strong>{result.title}</strong>
                                    <div className="Home_musicArchiveSearch_meta fr">
                                      <span>{result.creator}</span>
                                      <em className="Home_musicArchiveSearch_sourceTag">
                                        MusicBrainz
                                      </em>
                                    </div>
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
                    className="Home_changePasswordSubmit"
                    onClick={saveMusicArchivePlaylist}
                  >
                    Save music API settings
                  </button>
                  {musicArchivePlaylistFeedback ? (
                    <p className="Home_passwordFeedback Home_passwordFeedback--success">
                      {musicArchivePlaylistFeedback}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="fc Home_preStart_reportsCard">
              <div className="Home_gallery_Header_wrapper fr">
                <h3>schoolplanner telegram</h3>
                <button
                  type="button"
                  className="Home_reportToggleButton"
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
                className={`Home_reportBody fc${isReportSectionOpen("telegram") ? " isOpen" : ""}`}
              >
                <div id="Home_schoolPlannerTelegram_div" className="fc">
                  {schoolPlannerTelegramFeedback ? (
                    <p className="Home_passwordFeedback Home_passwordFeedback--success">
                      {schoolPlannerTelegramFeedback}
                    </p>
                  ) : null}
                  <div id="Home_schoolPlannerTelegram_adminDiv" className="fc">
                    <label className="Home_userMenu_title_label">
                      telegram mtproto config
                    </label>
                    <p className="Home_schoolPlannerTelegram_adminStatus">
                      {telegramConfigStatus.configured
                        ? "Your Telegram connection is saved for this account."
                        : "Your Telegram connection is not complete yet."}
                    </p>
                    <div className="Home_schoolPlannerTelegram_adminFlags fr">
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
                      id="Home_schoolPlannerTelegram_apiId_input"
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
                      id="Home_schoolPlannerTelegram_apiHash_input"
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
                      id="Home_schoolPlannerTelegram_phone_input"
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
                      className="Home_changePasswordSubmit"
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
                          id="Home_schoolPlannerTelegram_code_input"
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
                          className="Home_changePasswordSubmit"
                          onClick={verifyTelegramCode}
                        >
                          Verify code
                        </button>
                      </>
                    ) : null}
                    {telegramAuthStage === "password" ? (
                      <>
                        <input
                          id="Home_schoolPlannerTelegram_password_input"
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
                          className="Home_changePasswordSubmit"
                          onClick={verifyTelegramPassword}
                        >
                          Verify password
                        </button>
                      </>
                    ) : null}
                    <p className="Home_schoolPlannerTelegram_adminStatus">
                      {telegramAuthStage === "password"
                        ? "Telegram is asking for the 2-step verification password."
                        : telegramAuthStage === "connected"
                          ? "Telegram login is connected for this account."
                          : "Start with API ID, API Hash, and phone number."}
                    </p>
                    {telegramConfigFeedback ? (
                      <p className="Home_passwordFeedback Home_passwordFeedback--success">
                        {telegramConfigFeedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="fc Home_preStart_reportsCard">
              <div className="Home_gallery_Header_wrapper fr">
                <h3>Graphic Control</h3>
                <button
                  type="button"
                  className="Home_reportToggleButton"
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
                className={`Home_reportBody fc${isReportSectionOpen("graphicControl") ? " isOpen" : ""}`}
              >
                <div className="fc Home_graphicControlCard">
                  <label className="Home_preStart_toggleRow">
                    <input
                      type="checkbox"
                      checked={schoolPlannerReducedMotion}
                      onChange={(event) =>
                        setSchoolPlannerReducedMotion(event.target.checked)
                      }
                    />
                    <span>Reduce School Planner motion</span>
                  </label>
                  <label className="fc Home_graphicControlField">
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
                    className="Home_changePasswordToggle"
                    onClick={() => setPhenomedSocialChatBackground("")}
                  >
                    Clear chat background
                  </button>
                </div>
              </div>
            </div>

            <div
              className="fc Home_preStart_reportsCard"
              id="Home_userMenu_panelCard"
            >
              <div className="Home_gallery_Header_wrapper fr">
                <h3>Control Panel</h3>
                <button
                  type="button"
                  className="Home_reportToggleButton"
                  onClick={() => toggleReportSection("controlPanel")}
                  aria-label="Toggle control panel"
                  aria-expanded={isReportSectionOpen("controlPanel")}
                  aria-controls="Home_userMenu_personalInfo_content_div"
                  title="Toggle control panel"
                >
                  <i
                    className={`fas ${isReportSectionOpen("controlPanel") ? "fa-chevron-up" : "fa-chevron-down"}`}
                  ></i>
                </button>
              </div>

              <div
                id="Home_userMenu_personalInfo_content_div"
                className={`fc Home_userMenu_panelBody${isReportSectionOpen("controlPanel") ? " isOpen" : ""}`}
              >
                {renderInlineInfoField("First name", "firstname")}
                {renderInlineInfoField("Last name", "lastname")}
                {renderInlineInfoField("Username", "username")}
                {renderInlineInfoField("Program", "program")}
                {renderInlineInfoField("University", "university")}
                {renderInlineInfoField("Year", "studyYear")}
                {renderInlineInfoField("Term", "term")}
                <div className="fr Home_userMenu_contentDivs">
                  <label>Password:</label>
                  <button
                    type="button"
                    className="Home_changePasswordToggle"
                    onClick={() => setIsPasswordFormOpen((current) => !current)}
                  >
                    {isPasswordFormOpen ? "Close" : "Change password"}
                  </button>
                </div>
                <div className="fr Home_userMenu_contentDivs">
                  <label>Footer:</label>
                  <button
                    type="button"
                    className="Home_changePasswordToggle"
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
                    className={`Home_passwordFeedback Home_passwordFeedback--${academicInfoFeedback.tone || "info"}`}
                  >
                    {academicInfoFeedback.message}
                  </p>
                ) : null}
                {isAcademicInfoEditing ? (
                  <form
                    id="Home_editAcademicInfo_form"
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
                      className="Home_changePasswordSubmit"
                      disabled={isAcademicInfoSubmitting}
                    >
                      {isAcademicInfoSubmitting ? "Saving..." : "Save"}
                    </button>
                  </form>
                ) : null}
                {passwordFeedback.message ? (
                  <p
                    className={`Home_passwordFeedback Home_passwordFeedback--${passwordFeedback.tone || "info"}`}
                  >
                    {passwordFeedback.message}
                  </p>
                ) : null}
                {isPasswordFormOpen ? (
                  <form
                    id="Home_changePassword_form"
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
                      className="Home_changePasswordSubmit"
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
export default Home;
