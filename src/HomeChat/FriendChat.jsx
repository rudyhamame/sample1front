import React from "react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import "./emojie_picker.css";
import "./friendchat.css";
import "../voiceVideoCall/VoiceVideoCall.css";
import { apiUrl } from "../config/api";
import {
  startOutgoingCallTone,
  startIncomingCallTone,
  stopOutgoingCallTone,
  stopIncomingCallTone,
} from "../realtime/callTone";
import {
  attachStreamToElement,
  createPeerConnection,
  getIceCandidateType,
  getPeerConnectionDiagnostics,
  requestCallMedia,
  stopMediaStream,
} from "../realtime/webrtcCall";
import {
  getFriendPresenceState as resolveFriendPresenceState,
  getFriendPresenceStateForChatPanel as resolveFriendPresenceStateForChatPanel,
  getFriendChatPresenceKey,
} from "../utils/friendPresence";

const CHAT_CALL_PANEL_LAYOUT_STORAGE_KEY =
  "phenomed.friendChat.callPan350pxelLayout";
const DEFAULT_CALL_PANEL_LAYOUT = {
  x: 24,
  y: 24,
  width: 100,
  height: 430,
};
const DEFAULT_VIDEO_OVERLAY_LAYOUT = {
  x: 18,
  y: 18,
  scale: 1,
};
const CALL_PANEL_MIN_WIDTH = 300;
const CALL_PANEL_MIN_HEIGHT = 220;
const CALL_PANEL_MARGIN = 16;
const VIDEO_OVERLAY_MIN_SCALE = 0.6;
const VIDEO_OVERLAY_MAX_SCALE = 2;
const CALL_NO_ANSWER_TIMEOUT_MS = 30000;
const CALL_CONNECTING_TIMEOUT_MS = 20000;
const CALL_DISCONNECTED_GRACE_MS = 8000;

const keepTextareaFocus = (event) => {
  event.preventDefault();
};

const clampValue = (value, min, max) => {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
};

const formatChatTimestamp = (rawValue, fallbackTimestamp) => {
  const dateValue = new Date(rawValue || fallbackTimestamp || Date.now());

  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getViewportBounds = () => {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const logCallDebug = (scope, event, details = {}) => {
  try {
    console.info(`[call][${scope}] ${event}`, details);

    if (
      String(event || "").startsWith("ice-diagnostics") ||
      String(event || "").startsWith("ice-candidate-")
    ) {
      console.info(
        `[call][${scope}] ${event}:json`,
        JSON.stringify(details, null, 2),
      );
    }
  } catch {
    // Ignore console failures.
  }
};

const formatCallElapsed = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor((Number(elapsedMs) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const formatVoiceNoteTime = (secondsValue) => {
  const totalSeconds = Math.max(0, Math.floor(Number(secondsValue) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const repairMojibakeText = (value) => {
  const text = String(value ?? "");
  if (!text) {
    return "";
  }
  const hasLikelyMojibake =
    text.includes("ðŸ") ||
    text.includes("âœ") ||
    text.includes("Ã") ||
    text.includes("Â");
  if (!hasLikelyMojibake) {
    return text;
  }
  try {
    return decodeURIComponent(escape(text));
  } catch (_error) {
    return text;
  }
};

const EMOJI_IMAGE_BASE_URL =
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg";
const ARABIC_TEXT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const isEmojiGrapheme = (value) => /\p{Extended_Pictographic}/u.test(value);

const toEmojiCodepoint = (value) =>
  Array.from(value || "")
    .map((char) => char.codePointAt(0))
    .filter((codePoint) => Number.isFinite(codePoint) && codePoint !== 0xfe0f)
    .map((codePoint) => codePoint.toString(16))
    .join("-");

const renderMessageWithEmojiImages = (value) => {
  const text = repairMojibakeText(value);
  if (!text) {
    return null;
  }

  const segmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  const graphemes = segmenter
    ? Array.from(segmenter.segment(text), (entry) => entry.segment)
    : Array.from(text);

  const renderedNodes = [];
  let textBuffer = "";

  graphemes.forEach((grapheme, index) => {
    if (!isEmojiGrapheme(grapheme)) {
      textBuffer += grapheme;
      return;
    }

    if (textBuffer) {
      renderedNodes.push(
        <React.Fragment key={`txt-${index}-${textBuffer.length}`}>
          {textBuffer}
        </React.Fragment>,
      );
      textBuffer = "";
    }

    const codepoint = toEmojiCodepoint(grapheme);
    if (!codepoint) {
      renderedNodes.push(
        <React.Fragment key={`raw-${index}`}>{grapheme}</React.Fragment>,
      );
      return;
    }

    renderedNodes.push(
      <span
        key={`emoji-wrap-${index}-${codepoint}`}
        className="Chat_messageEmojiInline"
        dir="auto"
      >
        <img
          key={`emoji-${index}-${codepoint}`}
          className="Chat_messageEmojiImage"
          src={`${EMOJI_IMAGE_BASE_URL}/${codepoint}.svg`}
          alt={grapheme}
          draggable={false}
        />
      </span>,
    );
  });

  if (textBuffer) {
    renderedNodes.push(
      <React.Fragment key="txt-final">{textBuffer}</React.Fragment>,
    );
  }

  return renderedNodes;
};

const normalizeMessageImages = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

const normalizeMessageAudio = (value) => String(value || "").trim();

const SECRET_CHAT_IMAGE_PREFIX = "secret-image:v1:";
const CHAT_IMAGE_ENTRY_PREFIX = "chat-image:v2:";
const CHAT_IMAGE_SELF_DESTRUCT_STORAGE_KEY =
  "phenomed.chat.oneTimeConsumedImages";
const CHAT_IMAGE_SELF_DESTRUCT_MODES = [
  { value: "none", label: "Off", durationMs: 0 },
  { value: "10s", label: "After 10 secs", durationMs: 10_000 },
  { value: "30s", label: "After 30 secs", durationMs: 30_000 },
];

const getChatImageSelfDestructMode = (value) => {
  const normalizedValue = String(value || "none").trim().toLowerCase();
  return CHAT_IMAGE_SELF_DESTRUCT_MODES.some(
    (option) => option.value === normalizedValue,
  )
    ? normalizedValue
    : "none";
};

const getChatImageSelfDestructDurationMs = (mode) => {
  const normalizedMode = getChatImageSelfDestructMode(mode);
  return (
    CHAT_IMAGE_SELF_DESTRUCT_MODES.find((option) => option.value === normalizedMode)
      ?.durationMs || 0
  );
};

const loadConsumedChatImageEntries = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(
      CHAT_IMAGE_SELF_DESTRUCT_STORAGE_KEY,
    );
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};

    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
};

const persistConsumedChatImageEntries = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CHAT_IMAGE_SELF_DESTRUCT_STORAGE_KEY,
      JSON.stringify(value && typeof value === "object" ? value : {}),
    );
  } catch {
    // Ignore storage failures.
  }
};

const encodeChatImageEntry = (value) => {
  const normalizedUrl = String(value?.url || value || "").trim();
  if (!normalizedUrl) {
    return "";
  }

  const selfDestructMode = getChatImageSelfDestructMode(
    value?.selfDestructMode,
  );
  const selfDestructDurationMs = getChatImageSelfDestructDurationMs(
    selfDestructMode,
  );
  const selfDestructCreatedAt = Number(value?.selfDestructCreatedAt) || Date.now();
  const selfDestructExpiresAt =
    selfDestructMode !== "one-time" && selfDestructDurationMs > 0
      ? Number(value?.selfDestructExpiresAt) || selfDestructCreatedAt + selfDestructDurationMs
      : Number(value?.selfDestructExpiresAt) || 0;

  try {
    return `${CHAT_IMAGE_ENTRY_PREFIX}${window.btoa(
      unescape(
        encodeURIComponent(
          JSON.stringify({
            url: normalizedUrl,
            isSecret: Boolean(value?.isSecret),
            publicId: String(value?.publicId || "").trim(),
            assetId: String(value?.assetId || "").trim(),
            contentHash: String(value?.contentHash || "").trim(),
            mimeType: String(value?.mimeType || "").trim(),
            resourceType: String(value?.resourceType || "image").trim() || "image",
            format: String(value?.format || "").trim(),
            selfDestructMode,
            selfDestructDurationMs,
            selfDestructCreatedAt,
            selfDestructExpiresAt,
          }),
        ),
      ),
    )}`;
  } catch {
    return normalizedUrl;
  }
};

const parseChatImageEntry = (value) => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return {
      rawValue: "",
      url: "",
      isSecret: false,
      publicId: "",
      assetId: "",
      contentHash: "",
      mimeType: "",
      resourceType: "image",
      format: "",
      selfDestructMode: "none",
      selfDestructDurationMs: 0,
      selfDestructCreatedAt: 0,
      selfDestructExpiresAt: 0,
    };
  }

  if (normalizedValue.startsWith(CHAT_IMAGE_ENTRY_PREFIX)) {
    try {
      const encodedPayload = normalizedValue.slice(CHAT_IMAGE_ENTRY_PREFIX.length);
      const decodedPayload = decodeURIComponent(escape(window.atob(encodedPayload)));
      const parsedPayload = JSON.parse(decodedPayload);

      return {
        rawValue: normalizedValue,
        url: String(parsedPayload?.url || "").trim(),
        isSecret: Boolean(parsedPayload?.isSecret),
        publicId: String(parsedPayload?.publicId || "").trim(),
        assetId: String(parsedPayload?.assetId || "").trim(),
        contentHash: String(parsedPayload?.contentHash || "").trim(),
        mimeType: String(parsedPayload?.mimeType || "").trim(),
        resourceType: String(parsedPayload?.resourceType || "image").trim() || "image",
        format: String(parsedPayload?.format || "").trim(),
        selfDestructMode: getChatImageSelfDestructMode(
          parsedPayload?.selfDestructMode,
        ),
        selfDestructDurationMs: getChatImageSelfDestructDurationMs(
          parsedPayload?.selfDestructMode,
        ),
        selfDestructCreatedAt:
          Number(parsedPayload?.selfDestructCreatedAt) || 0,
        selfDestructExpiresAt:
          Number(parsedPayload?.selfDestructExpiresAt) || 0,
      };
    } catch {
      return {
        rawValue: normalizedValue,
        url: "",
        isSecret: false,
        publicId: "",
        assetId: "",
        contentHash: "",
        mimeType: "",
        resourceType: "image",
        format: "",
        selfDestructMode: "none",
        selfDestructDurationMs: 0,
        selfDestructCreatedAt: 0,
        selfDestructExpiresAt: 0,
      };
    }
  }

  if (!normalizedValue.startsWith(SECRET_CHAT_IMAGE_PREFIX)) {
    return {
      rawValue: normalizedValue,
      url: normalizedValue,
      isSecret: false,
      publicId: "",
      assetId: "",
      contentHash: "",
      mimeType: "",
      resourceType: "image",
      format: "",
      selfDestructMode: "none",
      selfDestructDurationMs: 0,
      selfDestructCreatedAt: 0,
      selfDestructExpiresAt: 0,
    };
  }

  try {
    const encodedPayload = normalizedValue.slice(SECRET_CHAT_IMAGE_PREFIX.length);
    const decodedPayload = decodeURIComponent(escape(window.atob(encodedPayload)));
    const parsedPayload = JSON.parse(decodedPayload);

    return {
      rawValue: normalizedValue,
      url: String(parsedPayload?.url || "").trim(),
      isSecret: true,
      publicId: "",
      assetId: "",
      contentHash: "",
      mimeType: "",
      resourceType: "image",
      format: "",
      selfDestructMode: "none",
      selfDestructDurationMs: 0,
      selfDestructCreatedAt: 0,
      selfDestructExpiresAt: 0,
    };
  } catch {
    return {
      rawValue: normalizedValue,
      url: "",
      isSecret: true,
      publicId: "",
      assetId: "",
      contentHash: "",
      mimeType: "",
      resourceType: "image",
      format: "",
      selfDestructMode: "none",
      selfDestructDurationMs: 0,
      selfDestructCreatedAt: 0,
      selfDestructExpiresAt: 0,
    };
  }
};

const areImageListsEqual = (left, right) => {
  const normalizedLeft = normalizeMessageImages(left);
  const normalizedRight = normalizeMessageImages(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const ChatVoiceNotePlayer = ({ src = "" }) => {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);

  React.useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const handleTogglePlayback = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio.play().catch(() => null);
      return;
    }

    audio.pause();
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    const nextValue = Number(event.target.value || 0);

    setCurrentTime(nextValue);

    if (audio) {
      audio.currentTime = nextValue;
    }
  };

  const displayedTime =
    !isPlaying && currentTime <= 0
      ? duration
      : currentTime;

  return (
    <div className="Chat_voiceNotePlayerShell">
      <audio ref={audioRef} preload="metadata" src={src} className="Chat_voiceNoteAudio" />
      <button
        type="button"
        className="Chat_voiceNotePlaybackButton"
        onClick={handleTogglePlayback}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        title={isPlaying ? "Pause" : "Play"}
      >
        <i className={`fas ${isPlaying ? "fa-pause" : "fa-play"}`} aria-hidden="true"></i>
      </button>
      <input
        type="range"
        className="Chat_voiceNoteSeek"
        min="0"
        max={Math.max(duration, 0)}
        step="0.1"
        value={Math.min(currentTime, duration || currentTime)}
        onChange={handleSeek}
        aria-label="Voice note progress"
      />
      <span className="Chat_voiceNoteTime">
        {formatVoiceNoteTime(displayedTime)}
      </span>
    </div>
  );
};

const FriendChat = ({
  state,
  content,
  sendToThemMessage,
  serverReply,
  uploadChatImages,
  uploadChatAudio,
  saveChatImageToGallery,
  editChatMessage,
  deleteChatMessage,
  updateMyTypingPresence,
  markMessagesRead,
  getRealtimeSocket,
  requestGlobalCall,
  globalCallSession,
  closeActiveChat,
  hideTitleContainer = false,
  showInlineBackButton = true,
  inlineCallActionsTarget = null,
}) => {
  const chatContent = content?.chat;
  const isChatting = Boolean(state?.isChatting);
  const hasActiveChat = Boolean(state?.activeChatFriendName);
  const activeFriendRecord = React.useMemo(() => {
    const targetId = String(state?.activeChatFriendId || "").trim();
    if (!targetId) {
      return null;
    }
    const friends = Array.isArray(state?.friends) ? state.friends : [];
    return (
      friends.find(
        (friend) =>
          String(friend?._id || friend?.id || "").trim() === targetId,
      ) || null
    );
  }, [state?.activeChatFriendId, state?.friends]);
  const activeFriendAvatarUrl = React.useMemo(
    () =>
      String(
        state?.activeChatFriendAvatarUrl ||
          activeFriendRecord?.avatarUrl ||
          activeFriendRecord?.profile_picture ||
          activeFriendRecord?.profilePicture ||
          activeFriendRecord?.image ||
          activeFriendRecord?.photo ||
          "",
      ).trim(),
    [activeFriendRecord, state?.activeChatFriendAvatarUrl],
  );
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = React.useState(false);
  const [selectedMessageActionId, setSelectedMessageActionId] = React.useState("");
  const [activeContentView, setActiveContentView] = React.useState("messages");
  const emojiPickerWrapRef = React.useRef(null);
  const emojiPickerRef = React.useRef(null);
  const moreActionsMenuRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const attachmentInputRef = React.useRef(null);
  const isSendInFlightRef = React.useRef(false);
  const [localMessages, setLocalMessages] = React.useState([]);
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [selectedImageSelfDestructMode, setSelectedImageSelfDestructMode] =
    React.useState("none");
  const [recordedVoiceNote, setRecordedVoiceNote] = React.useState(null);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = React.useState(false);
  const [shouldSendSecretAttachments, setShouldSendSecretAttachments] =
    React.useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = React.useState(false);
  const [isMessageMutationPending, setIsMessageMutationPending] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = React.useState("");
  const [savingImageUrls, setSavingImageUrls] = React.useState({});
  const [unlockedSecretImageMap, setUnlockedSecretImageMap] = React.useState({});
  const [secretImagePasswordInput, setSecretImagePasswordInput] =
    React.useState("");
  const [secretImagePasswordFeedback, setSecretImagePasswordFeedback] =
    React.useState("");
  const [secretImageUnlockingKey, setSecretImageUnlockingKey] =
    React.useState("");
  const [isSecretImagePasswordSubmitting, setIsSecretImagePasswordSubmitting] =
    React.useState(false);
  const [consumedChatImageEntries, setConsumedChatImageEntries] =
    React.useState(() => loadConsumedChatImageEntries());
  const [chatImageClock, setChatImageClock] = React.useState(() => Date.now());
  const selectedImagesRef = React.useRef([]);
  const mediaRecorderRef = React.useRef(null);
  const mediaRecorderStreamRef = React.useRef(null);
  const mediaRecorderChunksRef = React.useRef([]);
  const messageLongPressTimeoutRef = React.useRef(null);
  const localAudioRef = React.useRef(null);
  const remoteAudioRef = React.useRef(null);
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  const videoStageRef = React.useRef(null);
  const callControlsRef = React.useRef(null);
  const videoOverlayRef = React.useRef(null);
  const videoOverlayDragRef = React.useRef(null);
  const videoOverlayResizeRef = React.useRef(null);
  const videoOverlayPinchRef = React.useRef(null);
  const callPanelInteractionRef = React.useRef(null);
  const peerConnectionRef = React.useRef(null);
  const localStreamRef = React.useRef(null);
  const remoteStreamRef = React.useRef(null);
  const rtcConfigRef = React.useRef(null);
  const queuedIceCandidatesRef = React.useRef([]);
  const activeCallIdRef = React.useRef("");
  const callDeliveryNoticeTimeoutRef = React.useRef(null);
  const typingDebounceTimeoutRef = React.useRef(null);
  const lastTypingStateRef = React.useRef(false);
  const activeCallPartnerRef = React.useRef("");
  const disconnectTimeoutRef = React.useRef(null);
  const diagnosticsIntervalRef = React.useRef(null);
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
  const [callDeliveryStatus, setCallDeliveryStatus] = React.useState("idle");
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = React.useState(0);
  const [localStreamVersion, setLocalStreamVersion] = React.useState(0);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  const [videoOverlayPosition, setVideoOverlayPosition] = React.useState({
    x: DEFAULT_VIDEO_OVERLAY_LAYOUT.x,
    y: DEFAULT_VIDEO_OVERLAY_LAYOUT.y,
  });
  const [videoOverlayScale, setVideoOverlayScale] = React.useState(
    DEFAULT_VIDEO_OVERLAY_LAYOUT.scale,
  );
  const [callPanelLayout, setCallPanelLayout] = React.useState(
    DEFAULT_CALL_PANEL_LAYOUT,
  );
  const [isRemoteVideoHovered, setIsRemoteVideoHovered] = React.useState(false);
  const [isCallControlsPinned, setIsCallControlsPinned] = React.useState(false);
  const normalizedRemoteMessages = React.useMemo(() => {
    const activeFriendId = String(state?.activeChatFriendId || "").trim();
    const chatHistory = Array.isArray(state?.chat) ? state.chat : [];
    const seenDates = new Set();

    return chatHistory
      .filter((message) => {
        if (!activeFriendId) {
          return false;
        }

        return String(message?._id || "").trim() === activeFriendId;
      })
      .filter((message) => {
        const messageDateKey = String(message?.date || "");
        if (seenDates.has(messageDateKey)) {
          return false;
        }

        seenDates.add(messageDateKey);
        return true;
      })
      .map((message, index) => ({
        id:
          String(message?.id || message?._id || "").trim() ||
          `remote-${message?.date || index}`,
        text: repairMojibakeText(String(message?.message || "").trim()),
        audio: normalizeMessageAudio(message?.audio),
        images: normalizeMessageImages(message?.images),
        sender: String(message?.from || "").trim() === "me" ? "me" : "friend",
        status: String(message?.status || "sent").trim().toLowerCase(),
        edited: Boolean(message?.edited),
        deleted: Boolean(message?.deleted),
        pending: false,
        timestamp:
          Number(new Date(message?.date).getTime()) || Date.now() + index,
        rawDate: message?.date,
      }));
  }, [state?.activeChatFriendId, state?.chat]);
  const activeFriendId = String(
    state?.activeChatFriendId ||
      state?.friendID_selected ||
      activeFriendRecord?._id ||
      activeFriendRecord?.id ||
      "",
  ).trim();
  const currentUserId = String(state?.my_id || "").trim();
  const ringtoneSourceKey = React.useMemo(
    () => `friend-chat:${currentUserId || activeFriendId || "unknown"}`,
    [activeFriendId, currentUserId],
  );
  const usesGlobalCallPanel = typeof requestGlobalCall === "function";
  const normalizedGlobalCallSession =
    globalCallSession && typeof globalCallSession === "object"
      ? globalCallSession
      : null;
  const globalCallState =
    normalizedGlobalCallSession?.callState || "idle";
  const globalIncomingCall = normalizedGlobalCallSession?.incomingCall || null;
  const globalCallPartnerId = String(
    normalizedGlobalCallSession?.activeCallPartnerId ||
      globalIncomingCall?.fromUserId ||
      "",
  ).trim();
  const globalCallStartedAt = Number(
    normalizedGlobalCallSession?.callStartedAt || 0,
  );
  const globalCallMode =
    normalizedGlobalCallSession?.callMode === "video" ? "video" : "audio";
  const globalAudioMuted = Boolean(normalizedGlobalCallSession?.isAudioMuted);
  const globalVideoMuted = Boolean(normalizedGlobalCallSession?.isVideoMuted);
  const globalToggleMute =
    typeof normalizedGlobalCallSession?.toggleMute === "function"
      ? normalizedGlobalCallSession.toggleMute
      : null;
  const globalEndCall =
    typeof normalizedGlobalCallSession?.endCall === "function"
      ? normalizedGlobalCallSession.endCall
      : null;
  const globalCallIsBusy =
    globalCallState !== "idle" ||
    Boolean(normalizedGlobalCallSession?.callMode) ||
    Boolean(globalIncomingCall);
  const isGlobalCallActiveForFriend =
    usesGlobalCallPanel &&
    activeFriendId &&
    globalCallPartnerId === activeFriendId &&
    (globalCallState === "calling" ||
      globalCallState === "requesting-media" ||
      globalCallState === "connecting" ||
      globalCallState === "connected");
  const isGlobalCallConnectedForFriend =
    isGlobalCallActiveForFriend &&
    globalCallState === "connected" &&
    Boolean(globalCallStartedAt);
  const [inlineCallElapsedMs, setInlineCallElapsedMs] = React.useState(0);
  const currentUserDisplayName =
    `${String(state?.firstname || "").trim()} ${String(state?.lastname || "").trim()}`.trim() ||
    String(state?.username || "").trim() ||
    "Doctor";
  const callPanelStatusLabel = React.useMemo(() => {
    if (callState === "calling") {
      if (callDeliveryStatus === "pending") {
        return "Calling (sent)...";
      }

      if (callDeliveryStatus === "delivered") {
        return "Ringing (delivered)...";
      }

      if (callDeliveryStatus === "failed") {
        return "Call not delivered.";
      }

      return "Calling...";
    }

    if (callState === "incoming") {
      return "Incoming call";
    }

    if (callState === "requesting-media") {
      return "Requesting media...";
    }

    if (callState === "connecting") {
      return "Connecting...";
    }

    if (callState === "connected") {
      return "Connected";
    }

    return "Ready";
  }, [callDeliveryStatus, callState]);

  React.useEffect(() => {
    if (
      !isGlobalCallActiveForFriend ||
      globalCallState !== "connected" ||
      !globalCallStartedAt
    ) {
      setInlineCallElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => {
      setInlineCallElapsedMs(Math.max(0, Date.now() - globalCallStartedAt));
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [globalCallStartedAt, globalCallState, isGlobalCallActiveForFriend]);

  const syncMediaElements = React.useCallback(() => {
    attachStreamToElement(localAudioRef.current, localStreamRef.current, {
      muted: true,
    });
    attachStreamToElement(remoteAudioRef.current, remoteStreamRef.current, {
      muted: false,
    });
    attachStreamToElement(localVideoRef.current, localStreamRef.current, {
      muted: true,
    });
    attachStreamToElement(remoteVideoRef.current, remoteStreamRef.current, {
      muted: false,
    });
  }, []);

  const clampVideoOverlayPosition = React.useCallback((nextPosition, scale) => {
    const stageElement = videoStageRef.current;
    const overlayElement = videoOverlayRef.current;

    const overlayWidth =
      overlayElement?.getBoundingClientRect?.().width || 128 * scale;
    const overlayHeight =
      overlayElement?.getBoundingClientRect?.().height || 116 * scale;

    if (!stageElement) {
      return {
        x: Math.max(0, Number(nextPosition?.x) || 0),
        y: Math.max(0, Number(nextPosition?.y) || 0),
      };
    }

    const stageWidth = stageElement.clientWidth || 0;
    const stageHeight = stageElement.clientHeight || 0;

    return {
      x: clampValue(
        Number(nextPosition?.x) || 0,
        0,
        Math.max(stageWidth - overlayWidth, 0),
      ),
      y: clampValue(
        Number(nextPosition?.y) || 0,
        0,
        Math.max(stageHeight - overlayHeight, 0),
      ),
    };
  }, []);

  const clampVideoOverlayScale = React.useCallback((nextScale) => {
    return clampValue(
      Number(nextScale) || DEFAULT_VIDEO_OVERLAY_LAYOUT.scale,
      VIDEO_OVERLAY_MIN_SCALE,
      VIDEO_OVERLAY_MAX_SCALE,
    );
  }, []);

  const clampCallPanelLayout = React.useCallback((nextLayout) => {
    const viewport = getViewportBounds();
    const safeWidth = clampValue(
      Number(nextLayout?.width) || DEFAULT_CALL_PANEL_LAYOUT.width,
      CALL_PANEL_MIN_WIDTH,
      Math.max(viewport.width - CALL_PANEL_MARGIN * 2, CALL_PANEL_MIN_WIDTH),
    );
    const safeHeight = clampValue(
      Number(nextLayout?.height) || DEFAULT_CALL_PANEL_LAYOUT.height,
      CALL_PANEL_MIN_HEIGHT,
      Math.max(viewport.height - CALL_PANEL_MARGIN * 2, CALL_PANEL_MIN_HEIGHT),
    );

    return {
      width: safeWidth,
      height: safeHeight,
      x: clampValue(
        Number(nextLayout?.x) || DEFAULT_CALL_PANEL_LAYOUT.x,
        CALL_PANEL_MARGIN,
        Math.max(
          viewport.width - safeWidth - CALL_PANEL_MARGIN,
          CALL_PANEL_MARGIN,
        ),
      ),
      y: clampValue(
        Number(nextLayout?.y) || DEFAULT_CALL_PANEL_LAYOUT.y,
        CALL_PANEL_MARGIN,
        Math.max(
          viewport.height - safeHeight - CALL_PANEL_MARGIN,
          CALL_PANEL_MARGIN,
        ),
      ),
    };
  }, []);

  const releasePeerConnection = React.useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  const resetCallMedia = React.useCallback(() => {
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;

    stopMediaStream(remoteStreamRef.current);
    remoteStreamRef.current = null;

    setLocalStreamVersion((value) => value + 1);
    setRemoteStreamVersion((value) => value + 1);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  }, []);

  const teardownCall = React.useCallback(
    ({
      keepError = false,
      nextError = "",
      nextState = "idle",
      clearIncoming = true,
    } = {}) => {
      stopIncomingCallTone(ringtoneSourceKey);
      stopOutgoingCallTone(ringtoneSourceKey);

      if (diagnosticsIntervalRef.current) {
        window.clearInterval(diagnosticsIntervalRef.current);
        diagnosticsIntervalRef.current = null;
      }

      if (disconnectTimeoutRef.current) {
        window.clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }

      releasePeerConnection();
      resetCallMedia();
      queuedIceCandidatesRef.current = [];
      activeCallPartnerRef.current = "";
      activeCallIdRef.current = "";
      setCallMode("");
      setCallState(nextState);
      if (clearIncoming) {
        setIncomingCall(null);
      }
      setCallError(keepError ? nextError : "");
      setCallDeliveryStatus("idle");
      if (callDeliveryNoticeTimeoutRef.current) {
        window.clearTimeout(callDeliveryNoticeTimeoutRef.current);
        callDeliveryNoticeTimeoutRef.current = null;
      }
      setVideoOverlayScale(1);
      setVideoOverlayPosition({ x: 18, y: 18 });
    },
    [releasePeerConnection, resetCallMedia, ringtoneSourceKey],
  );

  const logPeerDiagnostics = React.useCallback(async (event, extraDetails = {}) => {
    const diagnostics = await getPeerConnectionDiagnostics(peerConnectionRef.current);

    logCallDebug("friend", event, {
      ...extraDetails,
      diagnostics,
    });
  }, []);

  const stopDiagnosticsPolling = React.useCallback(() => {
    if (!diagnosticsIntervalRef.current) {
      return;
    }

    window.clearInterval(diagnosticsIntervalRef.current);
    diagnosticsIntervalRef.current = null;
  }, []);

  const startDiagnosticsPolling = React.useCallback(() => {
    if (diagnosticsIntervalRef.current) {
      return;
    }

    diagnosticsIntervalRef.current = window.setInterval(() => {
      logPeerDiagnostics("ice-diagnostics-poll", {
        friendId: activeCallPartnerRef.current,
      });
    }, 5000);
  }, [logPeerDiagnostics]);

  const clearDisconnectTimeout = React.useCallback(() => {
    if (!disconnectTimeoutRef.current) {
      return;
    }

    window.clearTimeout(disconnectTimeoutRef.current);
    disconnectTimeoutRef.current = null;
  }, []);

  const scheduleDisconnectedTeardown = React.useCallback(() => {
    if (disconnectTimeoutRef.current) {
      return;
    }

    disconnectTimeoutRef.current = window.setTimeout(() => {
      disconnectTimeoutRef.current = null;

      if (peerConnectionRef.current?.connectionState === "connected") {
        return;
      }

      teardownCall({
        keepError: true,
        nextError:
          "The call was interrupted by the network before it could recover.",
      });
    }, CALL_DISCONNECTED_GRACE_MS);
  }, [teardownCall]);

  const loadRtcConfiguration = React.useCallback(async () => {
    const currentRtcConfig = rtcConfigRef.current;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      currentRtcConfig &&
      Array.isArray(currentRtcConfig.iceServers) &&
      (!currentRtcConfig.expiresAt ||
        currentRtcConfig.expiresAt - nowSeconds > 60)
    ) {
      return currentRtcConfig.iceServers;
    }

    const response = await fetch(apiUrl("/api/user/rtc/config"), {
      method: "GET",
      headers: state?.token
        ? {
            Authorization: `Bearer ${state.token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error("Unable to load call configuration.");
    }

    const payload = await response.json().catch(() => ({}));
    logCallDebug("friend", "rtc-config-loaded", {
      turnEnabled: Boolean(payload?.turnEnabled),
      authMode: String(payload?.authMode || "").trim(),
      iceServers: Array.isArray(payload?.iceServers)
        ? payload.iceServers.map((entry) => ({
            urls: entry?.urls,
            hasUsername: Boolean(entry?.username),
            hasCredential: Boolean(entry?.credential),
          }))
        : [],
    });
    rtcConfigRef.current = {
      iceServers: Array.isArray(payload?.iceServers) ? payload.iceServers : [],
      expiresAt: Number(payload?.expiresAt) || null,
    };
    return rtcConfigRef.current.iceServers;
  }, [state?.token]);

  const flushQueuedIceCandidates = React.useCallback(async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection || !peerConnection.remoteDescription) {
      return;
    }

    while (queuedIceCandidatesRef.current.length > 0) {
      const nextCandidate = queuedIceCandidatesRef.current.shift();

      if (!nextCandidate) {
        continue;
      }

      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(nextCandidate),
        );
      } catch {
        // Ignore stale ICE candidates.
      }
    }
  }, []);

  const createManagedPeerConnection = React.useCallback(
    async (partnerUserId) => {
      const socket = getRealtimeSocket?.();

      if (!socket) {
        throw new Error("Realtime connection is not ready.");
      }

      releasePeerConnection();
      queuedIceCandidatesRef.current = [];
      activeCallPartnerRef.current = String(partnerUserId || "").trim();

      const peerConnection = createPeerConnection({
        iceServers: await loadRtcConfiguration(),
        onIceCandidate: (candidate) => {
          const serializedCandidate =
            typeof candidate?.toJSON === "function"
              ? candidate.toJSON()
              : candidate;

          logCallDebug("friend", "ice-candidate-local", {
            candidateType: getIceCandidateType(candidate),
            friendId: activeCallPartnerRef.current,
            candidate: serializedCandidate,
          });
          socket.emit("call:ice-candidate", {
            toUserId: activeCallPartnerRef.current,
            fromUserId: currentUserId,
            candidate: serializedCandidate,
          });
        },
        onTrack: (event) => {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }

          event.streams.forEach((stream) => {
            stream.getTracks().forEach((track) => {
              const hasTrack = remoteStreamRef.current
                .getTracks()
                .some((existingTrack) => existingTrack.id === track.id);

              if (!hasTrack) {
                remoteStreamRef.current.addTrack(track);
              }
            });
          });

          if (event.track) {
            const hasTrack = remoteStreamRef.current
              .getTracks()
              .some((existingTrack) => existingTrack.id === event.track.id);

            if (!hasTrack) {
              remoteStreamRef.current.addTrack(event.track);
            }
          }

          setRemoteStreamVersion((value) => value + 1);
        },
        onConnectionStateChange: (connectionState) => {
          logCallDebug("friend", "connection-state", {
            connectionState,
          });
          if (connectionState === "connected") {
            stopDiagnosticsPolling();
            logPeerDiagnostics("ice-diagnostics-connected", {
              friendId: activeCallPartnerRef.current,
            });
            clearDisconnectTimeout();
            setCallState("connected");
            setCallError("");
            return;
          }

          if (connectionState === "connecting") {
            startDiagnosticsPolling();
            clearDisconnectTimeout();
            setCallState("connecting");
            return;
          }

          if (connectionState === "disconnected") {
            logPeerDiagnostics("ice-diagnostics-disconnected", {
              friendId: activeCallPartnerRef.current,
            });
            scheduleDisconnectedTeardown();
            return;
          }

          if (connectionState === "failed" || connectionState === "closed") {
            stopDiagnosticsPolling();
            logPeerDiagnostics("ice-diagnostics-terminal", {
              friendId: activeCallPartnerRef.current,
              connectionState,
            });
            clearDisconnectTimeout();
            teardownCall({
              keepError: connectionState === "failed",
              nextError:
                connectionState === "failed"
                  ? "The call connection failed."
                  : "",
            });
          }
        },
        onIceConnectionStateChange: (iceConnectionState) => {
          logCallDebug("friend", "ice-connection-state", {
            iceConnectionState,
          });
          if (
            iceConnectionState === "connected" ||
            iceConnectionState === "completed" ||
            iceConnectionState === "checking"
          ) {
            clearDisconnectTimeout();
            return;
          }

          if (iceConnectionState === "disconnected") {
            logPeerDiagnostics("ice-diagnostics-ice-disconnected", {
              friendId: activeCallPartnerRef.current,
            });
            scheduleDisconnectedTeardown();
            return;
          }

          if (iceConnectionState === "failed") {
            stopDiagnosticsPolling();
            logPeerDiagnostics("ice-diagnostics-ice-failed", {
              friendId: activeCallPartnerRef.current,
            });
            clearDisconnectTimeout();
            teardownCall({
              keepError: true,
              nextError:
                "Unable to establish media through the current network.",
            });
          }
        },
      });

      peerConnectionRef.current = peerConnection;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      return peerConnection;
    },
    [
      clearDisconnectTimeout,
      getRealtimeSocket,
      loadRtcConfiguration,
      logPeerDiagnostics,
      releasePeerConnection,
      scheduleDisconnectedTeardown,
      startDiagnosticsPolling,
      stopDiagnosticsPolling,
      teardownCall,
    ],
  );

  React.useEffect(() => {
    syncMediaElements();
  }, [localStreamVersion, remoteStreamVersion, syncMediaElements]);

  React.useEffect(() => {
    return () => {
      if (typingDebounceTimeoutRef.current) {
        window.clearTimeout(typingDebounceTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      teardownCall();
    };
  }, [teardownCall]);

  React.useEffect(() => {
    teardownCall();
  }, [activeFriendId, teardownCall]);

  React.useEffect(() => {
    if (callState === "calling") {
      startOutgoingCallTone(ringtoneSourceKey);
      return () => {
        stopOutgoingCallTone(ringtoneSourceKey);
      };
    }

    stopOutgoingCallTone(ringtoneSourceKey);

    if (incomingCall && callState === "incoming") {
      startIncomingCallTone(ringtoneSourceKey);
    } else {
      stopIncomingCallTone(ringtoneSourceKey);
    }

    return () => {
      stopIncomingCallTone(ringtoneSourceKey);
    };
  }, [callState, incomingCall, ringtoneSourceKey]);

  React.useEffect(() => {
    const socket = getRealtimeSocket?.();

    if (!socket) {
      return undefined;
    }

    const handleOffer = ({
      fromUserId,
      offer,
      callType,
      metadata,
      callId,
    }) => {
      if (!fromUserId || String(fromUserId).trim() !== activeFriendId) {
        return;
      }

      logCallDebug("friend", "offer-received", {
        fromUserId: String(fromUserId).trim(),
        callType,
      });

      setIncomingCall({
        fromUserId: String(fromUserId).trim(),
        offer,
        callType: callType === "video" ? "video" : "audio",
        callId: String(callId || "").trim(),
        metadata: metadata && typeof metadata === "object" ? metadata : {},
      });
      setCallMode(callType === "video" ? "video" : "audio");
      setCallState("incoming");
      setCallError("");

      socket.emit("call:offer-received", {
        toUserId: String(fromUserId).trim(),
        fromUserId: currentUserId,
        callId: String(callId || "").trim(),
        callType: callType === "video" ? "video" : "audio",
      });
    };

    const handleAnswer = async ({ fromUserId, answer }) => {
      if (!fromUserId || String(fromUserId).trim() !== activeFriendId) {
        return;
      }

      logCallDebug("friend", "answer-received", {
        fromUserId: String(fromUserId).trim(),
      });

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection || !answer) {
        return;
      }

      try {
        setCallDeliveryStatus("delivered");
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
        await flushQueuedIceCandidates();
        setCallState("connecting");
      } catch {
        teardownCall({
          keepError: true,
          nextError: "Unable to finish connecting the call.",
        });
      }
    };

    const handleIceCandidate = async ({ fromUserId, candidate }) => {
      if (
        !fromUserId ||
        String(fromUserId).trim() !== activeFriendId ||
        !candidate
      ) {
        return;
      }

      logCallDebug("friend", "ice-candidate-remote", {
        fromUserId: String(fromUserId).trim(),
        candidateType: getIceCandidateType(candidate),
        candidate,
      });

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        queuedIceCandidatesRef.current.push(candidate);
        return;
      }

      if (!peerConnection.remoteDescription) {
        queuedIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale ICE candidates.
      }
    };

    const handleEnd = ({ fromUserId }) => {
      if (!fromUserId || String(fromUserId).trim() !== activeFriendId) {
        return;
      }

      teardownCall({
        keepError: true,
        nextError: "The call ended.",
      });
    };

    const handleReject = ({ fromUserId }) => {
      if (!fromUserId || String(fromUserId).trim() !== activeFriendId) {
        return;
      }

      teardownCall();
    };

    const handleOfferReceived = ({ fromUserId, callId }) => {
      const normalizedFromUserId = String(fromUserId || "").trim();
      const normalizedCallId = String(callId || "").trim();

      if (
        normalizedFromUserId !== activeCallPartnerRef.current ||
        normalizedCallId !== activeCallIdRef.current ||
        callDeliveryStatus !== "pending"
      ) {
        return;
      }

      setCallDeliveryStatus("delivered");
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);
    socket.on("call:reject", handleReject);
    socket.on("call:offer-received", handleOfferReceived);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
      socket.off("call:reject", handleReject);
      socket.off("call:offer-received", handleOfferReceived);
    };
  }, [
    activeFriendId,
    callDeliveryStatus,
    flushQueuedIceCandidates,
    getRealtimeSocket,
    teardownCall,
  ]);

  React.useEffect(() => {
    if (callState !== "calling" || callDeliveryStatus !== "pending") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (callState !== "calling" || callDeliveryStatus !== "pending") {
        return;
      }

      logPeerDiagnostics("ice-diagnostics-delivery-timeout", {
        friendId: activeCallPartnerRef.current,
      });

      stopOutgoingCallTone(ringtoneSourceKey);
      setCallDeliveryStatus("failed");
      setCallError("Call not delivered.");

      if (callDeliveryNoticeTimeoutRef.current) {
        window.clearTimeout(callDeliveryNoticeTimeoutRef.current);
      }
      callDeliveryNoticeTimeoutRef.current = window.setTimeout(() => {
        teardownCall();
      }, 6000);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    callDeliveryStatus,
    callState,
    logPeerDiagnostics,
    ringtoneSourceKey,
    teardownCall,
  ]);

  React.useEffect(() => {
    if (callState !== "calling" || callDeliveryStatus !== "delivered") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (callState !== "calling" || callDeliveryStatus !== "delivered") {
        return;
      }

      logPeerDiagnostics("ice-diagnostics-no-answer-timeout", {
        friendId: activeCallPartnerRef.current,
      });

      const socket = getRealtimeSocket?.();
      const targetUserId = activeCallPartnerRef.current;

      if (socket && targetUserId) {
        socket.emit("call:end", {
          toUserId: targetUserId,
          fromUserId: currentUserId,
          reason: "no-answer",
        });
      }

      teardownCall();
    }, CALL_NO_ANSWER_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    callDeliveryStatus,
    callState,
    currentUserId,
    getRealtimeSocket,
    logPeerDiagnostics,
    teardownCall,
  ]);

  React.useEffect(() => {
    if (callState !== "connecting") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (peerConnectionRef.current?.connectionState === "connected") {
        return;
      }

      logPeerDiagnostics("ice-diagnostics-connect-timeout", {
        friendId: activeCallPartnerRef.current,
      });

      teardownCall({
        keepError: true,
        nextError:
          "The call could not connect. Check the TURN server configuration or try a different network.",
      });
    }, CALL_CONNECTING_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [callState, logPeerDiagnostics, teardownCall]);

  // Helper to generate a temporary ID for optimistic messages
  const generateTempId = () =>
    `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  React.useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  React.useEffect(() => {
    persistConsumedChatImageEntries(consumedChatImageEntries);
  }, [consumedChatImageEntries]);

  React.useEffect(() => {
    const timerId = window.setInterval(() => {
      setChatImageClock(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  React.useEffect(
    () => () => {
      if (messageLongPressTimeoutRef.current) {
        window.clearTimeout(messageLongPressTimeoutRef.current);
        messageLongPressTimeoutRef.current = null;
      }
      selectedImagesRef.current.forEach((image) => {
        if (image?.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      if (recordedVoiceNote?.previewUrl) {
        URL.revokeObjectURL(recordedVoiceNote.previewUrl);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderStreamRef.current) {
        mediaRecorderStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaRecorderStreamRef.current = null;
      }
    },
    [recordedVoiceNote],
  );

  const handleAttachmentSelection = (event) => {
    const nextFiles = Array.from(event.target?.files || []).filter((file) =>
      String(file?.type || "").trim().toLowerCase().startsWith("image/"),
    );
    event.target.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    setSelectedImages((currentImages) => [
      ...currentImages,
      ...nextFiles.map((file, index) => ({
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: String(file?.name || "image").trim(),
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const markChatImageEntryConsumed = React.useCallback((imageEntry) => {
    const normalizedImageEntry = String(imageEntry || "").trim();
    if (!normalizedImageEntry) {
      return;
    }

    setConsumedChatImageEntries((currentValue) => {
      if (currentValue?.[normalizedImageEntry]) {
        return currentValue;
      }

      return {
        ...(currentValue || {}),
        [normalizedImageEntry]: Date.now(),
      };
    });
  }, []);

  const isChatImageEntryConsumed = React.useCallback(
    (imageEntry) => {
      const normalizedImageEntry = String(imageEntry || "").trim();
      return Boolean(consumedChatImageEntries?.[normalizedImageEntry]);
    },
    [consumedChatImageEntries],
  );

  const handleRemoveSelectedImage = (imageId) => {
    setSelectedImages((currentImages) => {
      const targetImage = currentImages.find((image) => image.id === imageId);
      if (targetImage?.previewUrl) {
        URL.revokeObjectURL(targetImage.previewUrl);
      }

      const nextImages = currentImages.filter((image) => image.id !== imageId);
      if (nextImages.length === 0) {
        setShouldSendSecretAttachments(false);
        setSelectedImageSelfDestructMode("none");
      }

      return nextImages;
    });
  };

  const handleClearRecordedVoiceNote = React.useCallback(() => {
    setRecordedVoiceNote((currentValue) => {
      if (currentValue?.previewUrl) {
        URL.revokeObjectURL(currentValue.previewUrl);
      }
      return null;
    });
  }, []);

  const handleToggleVoiceRecording = React.useCallback(async () => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function" ||
      typeof MediaRecorder === "undefined"
    ) {
      return;
    }

    if (isRecordingVoiceNote && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderChunksRef.current = [];
      mediaRecorderStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          mediaRecorderChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const chunks = mediaRecorderChunksRef.current || [];
        const nextMimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, {
          type: nextMimeType,
        });
        mediaRecorderChunksRef.current = [];
        setIsRecordingVoiceNote(false);

        if (mediaRecorderStreamRef.current) {
          mediaRecorderStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaRecorderStreamRef.current = null;
        }

        if (blob.size > 0) {
          const extension = nextMimeType.includes("mpeg")
            ? "mp3"
            : nextMimeType.includes("ogg")
              ? "ogg"
              : "webm";
          const previewUrl = URL.createObjectURL(blob);
          setRecordedVoiceNote((currentValue) => {
            if (currentValue?.previewUrl) {
              URL.revokeObjectURL(currentValue.previewUrl);
            }
            return {
              blob,
              mimeType: nextMimeType,
              previewUrl,
              fileName: `voice-note-${Date.now()}.${extension}`,
            };
          });
        }

        mediaRecorderRef.current = null;
      });

      recorder.start();
      setIsRecordingVoiceNote(true);
      handleClearRecordedVoiceNote();
    } catch (_error) {
      setIsRecordingVoiceNote(false);
    }
  }, [handleClearRecordedVoiceNote, isRecordingVoiceNote]);

  const handleSend = async () => {
    if (isSendInFlightRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    const message = textarea ? textarea.value : "";
    const trimmedMessage = String(message || "").trim();
    const queuedImages = Array.isArray(selectedImages) ? selectedImages : [];
    const queuedVoiceNote = recordedVoiceNote;

    if (editingMessageId) {
      if (!messageBeingEdited || typeof editChatMessage !== "function") {
        return;
      }

      const canSubmitBlankEdit =
        trimmedMessage.length > 0 ||
        Boolean(messageBeingEdited.audio) ||
        (Array.isArray(messageBeingEdited.images) && messageBeingEdited.images.length > 0);

      if (!canSubmitBlankEdit) {
        return;
      }

      isSendInFlightRef.current = true;
      setIsMessageMutationPending(true);
      try {
        const didEdit = await Promise.resolve(
          editChatMessage(activeFriendId, editingMessageId, trimmedMessage),
        );
        if (didEdit !== false) {
          if (textarea) {
            textarea.value = "";
            textarea.style.height = "42px";
            textarea.focus();
          }
          resetMessageEditingState();
          setTypingPresence(false, { immediate: true });
        }
      } finally {
        setIsMessageMutationPending(false);
        isSendInFlightRef.current = false;
      }
      return;
    }

    if (!trimmedMessage && queuedImages.length === 0 && !queuedVoiceNote) return;

    isSendInFlightRef.current = true;
    const tempId = generateTempId();
    const optimisticImages = queuedImages.map((image) => image.previewUrl).filter(Boolean);
    setLocalMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: trimmedMessage,
        audio: queuedVoiceNote?.previewUrl || "",
        images: optimisticImages,
        sender: "me",
        pending: true,
        timestamp: Date.now(),
      },
    ]);

    try {
      let uploadedImages = [];
      let uploadedAudio = "";

      if (queuedImages.length > 0 && typeof uploadChatImages === "function") {
        setIsUploadingAttachments(true);
        const uploadedMedia = await uploadChatImages(
          queuedImages.map((image) => image.file),
        );
        uploadedImages = (Array.isArray(uploadedMedia) ? uploadedMedia : [])
          .map((media) =>
            encodeChatImageEntry({
              ...media,
              isSecret: shouldSendSecretAttachments,
              selfDestructMode: selectedImageSelfDestructMode,
              selfDestructCreatedAt: Date.now(),
            }),
          )
          .filter(Boolean);
        if (shouldSendSecretAttachments) {
          setUnlockedSecretImageMap((currentValue) =>
            uploadedImages.reduce(
              (nextValue, imageEntry) => ({
                ...nextValue,
                [imageEntry]: true,
              }),
              { ...currentValue },
            ),
          );
        }
        setLocalMessages((prev) =>
          prev.map((pendingMessage) =>
            pendingMessage.id === tempId
              ? {
                  ...pendingMessage,
                  images: uploadedImages,
                }
              : pendingMessage,
          ),
        );
      }

      if (queuedVoiceNote?.blob && typeof uploadChatAudio === "function") {
        setIsUploadingAttachments(true);
        const voiceFile = new File([queuedVoiceNote.blob], queuedVoiceNote.fileName, {
          type: queuedVoiceNote.mimeType || "audio/webm",
        });
        const uploadedMedia = await uploadChatAudio(voiceFile);
        uploadedAudio = String(uploadedMedia?.url || "").trim();
        setLocalMessages((prev) =>
          prev.map((pendingMessage) =>
            pendingMessage.id === tempId
              ? {
                  ...pendingMessage,
                  audio: uploadedAudio,
                }
              : pendingMessage,
          ),
        );
      }

      if (sendToThemMessage) {
        const didSend = await Promise.resolve(
          sendToThemMessage({
            text: trimmedMessage,
            audio: uploadedAudio,
            images: uploadedImages,
          }),
        );
        if (didSend === false) {
          setLocalMessages((prev) =>
            prev.filter((pendingMessage) => pendingMessage.id !== tempId),
          );
        } else {
          setSelectedImages([]);
          selectedImagesRef.current = [];
          handleClearRecordedVoiceNote();
          // Pending message is removed by the useEffect when the socket
          // delivers the confirmed message into normalizedRemoteMessages.
        }
      }
    } catch (error) {
      serverReply?.(error?.message || "Unable to send voice note.");
      setLocalMessages((prev) =>
        prev.filter((pendingMessage) => pendingMessage.id !== tempId),
      );
    } finally {
      setIsUploadingAttachments(false);
      setShouldSendSecretAttachments(false);
      setSelectedImageSelfDestructMode("none");
      isSendInFlightRef.current = false;
    }

    setIsEmojiPickerOpen(false);
    if (state?.activeChatFriendId && updateMyTypingPresence) {
      lastTypingStateRef.current = false;
      updateMyTypingPresence(state.activeChatFriendId, false);
    }
    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }
  };

  // Listen for backend confirmation (simulate: replace pending with real)
  React.useEffect(() => {
    setLocalMessages((prev) =>
      prev.filter(
        (msg) =>
          !msg.pending ||
          !normalizedRemoteMessages.some(
            (remoteMessage) =>
              remoteMessage.sender === "me" &&
              remoteMessage.text === msg.text &&
              normalizeMessageAudio(remoteMessage.audio) ===
                normalizeMessageAudio(msg.audio) &&
              areImageListsEqual(remoteMessage.images, msg.images),
          ),
      ),
    );
  }, [normalizedRemoteMessages]);

  // Combine local and backend messages for display
  const allMessages = [
    ...normalizedRemoteMessages,
    ...localMessages.filter((msg) => msg.pending),
  ];
  const chatMediaItems = React.useMemo(
    () =>
      allMessages.flatMap((message, messageIndex) =>
        normalizeMessageImages(message?.images).map((imageEntry, imageIndex) => {
          const parsedImageEntry = parseChatImageEntry(imageEntry);

          return {
            id: `${message.id || message.timestamp || messageIndex}-${imageIndex}-${imageEntry}`,
            imageEntry,
            imageUrl: parsedImageEntry.url,
            isSecret: parsedImageEntry.isSecret,
            sender: message.sender,
            pending: Boolean(message.pending),
            timestamp: message.timestamp,
            rawDate: message.rawDate,
          };
        }),
      ),
    [allMessages],
  );
  const messageBeingEdited = React.useMemo(
    () =>
      allMessages.find(
        (message) => String(message?.id || "").trim() === String(editingMessageId || "").trim(),
      ) || null,
    [allMessages, editingMessageId],
  );
  const selectedMessageAction = React.useMemo(
    () =>
      allMessages.find(
        (message) =>
          String(message?.id || "").trim() === String(selectedMessageActionId || "").trim(),
      ) || null,
    [allMessages, selectedMessageActionId],
  );

  React.useEffect(() => {
    setIsMoreActionsOpen(false);
    setActiveContentView("messages");
    setSelectedMessageActionId("");
    setEditingMessageId("");
    setUnlockedSecretImageMap({});
    setSecretImagePasswordInput("");
    setSecretImagePasswordFeedback("");
    setSecretImageUnlockingKey("");
    setShouldSendSecretAttachments(false);
    setSelectedImageSelfDestructMode("none");
    setRecordedVoiceNote((currentValue) => {
      if (currentValue?.previewUrl) {
        URL.revokeObjectURL(currentValue.previewUrl);
      }
      return null;
    });
  }, [activeFriendId]);

  React.useEffect(() => {
    if (!isMoreActionsOpen) {
      return undefined;
    }

    const handlePointerDownOutsideMenu = (event) => {
      if (moreActionsMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsMoreActionsOpen(false);
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsMoreActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutsideMenu);
    document.addEventListener("touchstart", handlePointerDownOutsideMenu);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutsideMenu);
      document.removeEventListener("touchstart", handlePointerDownOutsideMenu);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isMoreActionsOpen]);

  React.useEffect(() => {
    if (!selectedMessageActionId) {
      return undefined;
    }

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setSelectedMessageActionId("");
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [selectedMessageActionId]);

  const setTypingPresence = React.useCallback(
    (nextIsTyping, { immediate = false, hasText } = {}) => {
      if (!state?.activeChatFriendId || !updateMyTypingPresence) {
        return;
      }

      const normalizedValue = Boolean(nextIsTyping);
      const normalizedHasText =
        typeof hasText === "boolean"
          ? hasText
          : Boolean(textareaRef.current?.value.trim());

      if (typingDebounceTimeoutRef.current) {
        window.clearTimeout(typingDebounceTimeoutRef.current);
        typingDebounceTimeoutRef.current = null;
      }

      if (lastTypingStateRef.current === normalizedValue && !immediate) {
        return;
      }

      const emitTypingPresence = () => {
        lastTypingStateRef.current = normalizedValue;
        updateMyTypingPresence(state.activeChatFriendId, normalizedValue, {
          hasText: normalizedHasText,
        });
      };

      if (immediate) {
        emitTypingPresence();
        return;
      }

      typingDebounceTimeoutRef.current = window.setTimeout(
        emitTypingPresence,
        normalizedValue ? 120 : 80,
      );
    },
    [state?.activeChatFriendId, updateMyTypingPresence],
  );

  const handleTypingChange = (event) => {
    const nextHasText = Boolean(event.target.value.trim());
    setTypingPresence(nextHasText, {
      hasText: nextHasText,
    });
  };

  const resetMessageEditingState = React.useCallback(() => {
    setEditingMessageId("");
    setSelectedMessageActionId("");
  }, []);

  const handleStartMessageEdit = (message) => {
    if (!message || message.pending || message.sender !== "me" || message.deleted) {
      return;
    }

    const textarea = textareaRef.current;
    selectedImagesRef.current.forEach((image) => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    selectedImagesRef.current = [];
    setSelectedImages([]);
    setShouldSendSecretAttachments(false);
    setEditingMessageId(String(message.id || "").trim());
    setSelectedMessageActionId("");

    if (textarea) {
      textarea.value = String(message.text || "");
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }

    setTypingPresence(Boolean(String(message.text || "").trim()), { immediate: true });
  };

  const handleCancelMessageEdit = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.value = "";
      textarea.style.height = "42px";
    }
    resetMessageEditingState();
    setTypingPresence(false, { immediate: true });
  };

  const handleDeleteExistingMessage = async (message) => {
    const messageId = String(message?.id || "").trim();
    if (
      !messageId ||
      message?.pending ||
      message?.sender !== "me" ||
      message?.deleted ||
      !activeFriendId ||
      typeof deleteChatMessage !== "function"
    ) {
      return;
    }

    setIsMessageMutationPending(true);
    setSelectedMessageActionId("");
    try {
      await deleteChatMessage(activeFriendId, messageId, "everyone");
      if (editingMessageId === messageId) {
        handleCancelMessageEdit();
      }
    } finally {
      setIsMessageMutationPending(false);
    }
  };

  const handleDeleteMessageForMe = async (message) => {
    const messageId = String(message?.id || "").trim();
    if (
      !messageId ||
      message?.pending ||
      !activeFriendId ||
      typeof deleteChatMessage !== "function"
    ) {
      return;
    }

    setIsMessageMutationPending(true);
    setSelectedMessageActionId("");
    try {
      await deleteChatMessage(activeFriendId, messageId, "me");
      if (editingMessageId === messageId) {
        handleCancelMessageEdit();
      }
    } finally {
      setIsMessageMutationPending(false);
    }
  };

  const handleCopyMessageText = async (message) => {
    const text = String(message?.text || "").trim();
    if (!text) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Ignore clipboard failures quietly.
    } finally {
      setSelectedMessageActionId("");
    }
  };

  const clearPendingMessageLongPress = React.useCallback(() => {
    if (messageLongPressTimeoutRef.current) {
      window.clearTimeout(messageLongPressTimeoutRef.current);
      messageLongPressTimeoutRef.current = null;
    }
  }, []);

  const beginMessageLongPress = React.useCallback(
    (message) => {
      if (!message || message.pending) {
        return;
      }

      clearPendingMessageLongPress();
      messageLongPressTimeoutRef.current = window.setTimeout(() => {
        setSelectedMessageActionId(String(message.id || "").trim());
        messageLongPressTimeoutRef.current = null;
      }, 420);
    },
    [clearPendingMessageLongPress],
  );

  const handleUnlockSecretImage = async (imageEntry) => {
    const normalizedImageEntry = String(imageEntry || "").trim();
    if (
      !normalizedImageEntry ||
      !state?.token ||
      isSecretImagePasswordSubmitting
    ) {
      return;
    }

    const password = String(secretImagePasswordInput || "");
    if (!password.trim()) {
      setSecretImageUnlockingKey(normalizedImageEntry);
      setSecretImagePasswordFeedback("Please enter your password.");
      return;
    }

    setIsSecretImagePasswordSubmitting(true);
    setSecretImageUnlockingKey(normalizedImageEntry);
    setSecretImagePasswordFeedback("");

    try {
      const response = await fetch(apiUrl("/api/user/verify-password"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
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

      setUnlockedSecretImageMap((currentValue) => ({
        ...currentValue,
        [normalizedImageEntry]: true,
      }));
      setSecretImagePasswordInput("");
      setSecretImagePasswordFeedback("");
      setSecretImageUnlockingKey("");
    } catch (error) {
      setSecretImagePasswordFeedback(
        error?.message || "Unable to verify password.",
      );
    } finally {
      setIsSecretImagePasswordSubmitting(false);
    }
  };

  const handleSaveMessageImage = async (imageEntry, options = {}) => {
    const parsedImageEntry =
      imageEntry && typeof imageEntry === "object"
        ? imageEntry
        : parseChatImageEntry(imageEntry);
    const normalizedUrl = String(parsedImageEntry?.url || "").trim();
    if (!normalizedUrl || typeof saveChatImageToGallery !== "function") {
      return;
    }

    setSavingImageUrls((currentValue) => ({
      ...currentValue,
      [normalizedUrl]: true,
    }));

    try {
      await saveChatImageToGallery(
        {
          url: normalizedUrl,
          publicId: parsedImageEntry?.publicId,
          assetId: parsedImageEntry?.assetId,
          contentHash: parsedImageEntry?.contentHash,
          mimeType: parsedImageEntry?.mimeType,
          resourceType: parsedImageEntry?.resourceType,
          format: parsedImageEntry?.format,
        },
        options,
      );
    } finally {
      setSavingImageUrls((currentValue) => {
        const nextValue = { ...currentValue };
        delete nextValue[normalizedUrl];
        return nextValue;
      });
    }
  };

  const getChatImageSelfDestructLabel = React.useCallback((mode) => {
    const normalizedMode = getChatImageSelfDestructMode(mode);
    return (
      CHAT_IMAGE_SELF_DESTRUCT_MODES.find(
        (option) => option.value === normalizedMode,
      )?.label || "Off"
    );
  }, []);

  const isChatImageExpired = React.useCallback(
    (parsedImageEntry) => {
      if (!parsedImageEntry?.rawValue) {
        return true;
      }

      if (isChatImageEntryConsumed(parsedImageEntry.rawValue)) {
        return true;
      }

      const selfDestructMode = getChatImageSelfDestructMode(
        parsedImageEntry?.selfDestructMode,
      );
      if (selfDestructMode === "none" || selfDestructMode === "one-time") {
        return false;
      }

      const expiresAt = Number(parsedImageEntry?.selfDestructExpiresAt) || 0;
      if (expiresAt > 0) {
        return chatImageClock >= expiresAt;
      }

      const createdAt = Number(parsedImageEntry?.selfDestructCreatedAt) || 0;
      const durationMs = getChatImageSelfDestructDurationMs(selfDestructMode);
      if (!createdAt || !durationMs) {
        return false;
      }

      return chatImageClock >= createdAt + durationMs;
    },
    [chatImageClock, isChatImageEntryConsumed],
  );

  const renderChatImageCard = (imageUrl, options = {}) => {
    const parsedImageEntry = parseChatImageEntry(imageUrl);
    const normalizedImageEntry = parsedImageEntry.rawValue;
    const normalizedImageUrl = parsedImageEntry.url;
    const isSecretImage = parsedImageEntry.isSecret;
    const selfDestructMode = getChatImageSelfDestructMode(
      parsedImageEntry.selfDestructMode,
    );
    const isOneTimeImage = selfDestructMode === "one-time";
    const isExpiredImage = isChatImageExpired(parsedImageEntry);
    const isSecretUnlocked =
      !isSecretImage || Boolean(unlockedSecretImageMap[normalizedImageEntry]);

    if (!normalizedImageEntry) {
      return null;
    }

    const sender = options.sender === "me" ? "me" : "friend";
    const pending = Boolean(options.pending);
    const isSavingImage = Boolean(
      savingImageUrls[normalizedImageUrl || normalizedImageEntry],
    );
    const isUnlockingCurrentImage =
      secretImageUnlockingKey === normalizedImageEntry &&
      isSecretImagePasswordSubmitting;

    if (isExpiredImage) {
      return (
        <div
          key={options.key || normalizedImageEntry}
          className={`Chat_messageImageCard Chat_messageImageCard--expired${
            options.panelVariant ? ` ${options.panelVariant}` : ""
          }`}
        >
          <div className="Chat_messageImageExpired">
            <div className="Chat_messageImageExpiredBadge">
              <i className="fas fa-hourglass-half" aria-hidden="true"></i>
              <span>Expired</span>
            </div>
            <p className="Chat_messageImageExpiredText">
              This attachment has self-destructed.
            </p>
          </div>
        </div>
      );
    }

    if (isSecretImage && !isSecretUnlocked) {
      return (
        <div
          key={options.key || normalizedImageEntry}
          className={`Chat_messageImageCard Chat_messageImageCard--secret${
            options.panelVariant ? ` ${options.panelVariant}` : ""
          }`}
        >
          <div className="Chat_secretImagePrompt fc">
            <div
              className="Chat_secretImagePromptBadge fr"
              aria-label="Secret attachment"
              title="Secret attachment"
            >
              <i className="fi fi-rr-lock" aria-hidden="true"></i>
            </div>
            <p className="Chat_secretImagePromptText">
              Enter your password to view this attachment.
            </p>
            <input
              type="password"
              className="Chat_secretImagePromptInput"
              value={
                secretImageUnlockingKey === normalizedImageEntry
                  ? secretImagePasswordInput
                  : ""
              }
              onChange={(event) => {
                setSecretImageUnlockingKey(normalizedImageEntry);
                setSecretImagePasswordInput(event.target.value);
                if (secretImagePasswordFeedback) {
                  setSecretImagePasswordFeedback("");
                }
              }}
              placeholder="Account password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="Chat_secretImagePromptButton"
              onClick={() => handleUnlockSecretImage(normalizedImageEntry)}
              disabled={isUnlockingCurrentImage}
            >
              {isUnlockingCurrentImage ? "Checking..." : "Unlock"}
            </button>
            {secretImageUnlockingKey === normalizedImageEntry &&
            secretImagePasswordFeedback ? (
              <p className="Chat_secretImagePromptFeedback">
                {secretImagePasswordFeedback}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div
        key={options.key || normalizedImageEntry}
        className={`Chat_messageImageCard${
          isSecretImage ? " Chat_messageImageCard--unlockedSecret" : ""
        }${
          isOneTimeImage ? " Chat_messageImageCard--oneTime" : ""
        }${
          options.panelVariant ? ` ${options.panelVariant}` : ""
        }`}
      >
        <a
          href={normalizedImageUrl}
          target="_blank"
          rel="noreferrer"
          className="Chat_messageImageLink"
          onClick={() => {
            if (isOneTimeImage) {
              markChatImageEntryConsumed(normalizedImageEntry);
            }
          }}
        >
          <img
            src={normalizedImageUrl}
            alt="Chat attachment"
            className="Chat_messageImage"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget
                ?.closest(".Chat_messageImageCard")
                ?.classList.add("Chat_messageImageCard--failed");
            }}
            onLoad={(event) => {
              event.currentTarget
                ?.closest(".Chat_messageImageCard")
                ?.classList.remove("Chat_messageImageCard--failed");
            }}
          />
        </a>
        {selfDestructMode !== "none" ? (
          <div className="Chat_messageImageMeta">
            <span className="Chat_messageImageMetaBadge">
              {getChatImageSelfDestructLabel(selfDestructMode)}
            </span>
          </div>
        ) : null}
        <a
          href={normalizedImageUrl}
          target="_blank"
          rel="noreferrer"
          className="Chat_messageImageFallback"
        >
          Open image
        </a>
        {sender !== "me" && !pending ? (
          <button
            type="button"
            className="Chat_messageImageSaveButton"
            onClick={() =>
              handleSaveMessageImage(parsedImageEntry, {
                visibility: isSecretImage ? "hidden" : "public",
              })
            }
            disabled={isSavingImage}
          >
            {isSavingImage ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>
    );
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? textarea.value.length;
    const nextValue =
      textarea.value.slice(0, selectionStart) +
      emoji +
      textarea.value.slice(selectionEnd);

    textarea.value = nextValue;
    const nextCursorPosition = selectionStart + emoji.length;
    textarea.selectionStart = nextCursorPosition;
    textarea.selectionEnd = nextCursorPosition;
    textarea.focus();

    setTypingPresence(Boolean(nextValue.trim()));
  };

  const handleEmojiPickerSelect = (emojiData) => {
    handleEmojiSelect(emojiData.emoji);
  };

  const handleCallButtonPress = React.useCallback(
    (nextCallMode) => {
      if (usesGlobalCallPanel) {
        if (!activeFriendId || globalCallIsBusy) {
          return;
        }

        requestGlobalCall({
          friendId: activeFriendId,
          friendName: state?.activeChatFriendName || "",
          mode: nextCallMode,
        });
        return;
      }

      handleStartCall(nextCallMode);
    },
    [
      activeFriendId,
      globalCallIsBusy,
      requestGlobalCall,
      state?.activeChatFriendName,
      usesGlobalCallPanel,
    ],
  );

  const handleTextareaFocus = () => {
    const textarea = textareaRef.current;
    setTypingPresence(Boolean(textarea?.value.trim()), { immediate: true });

    if (state?.activeChatFriendId && markMessagesRead) {
      markMessagesRead(state.activeChatFriendId);
    }
  };

  const handleTextareaBlur = (event) => {
    setTypingPresence(false, { immediate: true });
  };

  const handleStartCall = async (nextCallMode) => {
    if (!activeFriendId || !currentUserId) {
      return;
    }

    const callId = `call-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    try {
      setCallError("");
      setIncomingCall(null);
      setCallMode(nextCallMode);
      setCallState("requesting-media");
      setCallDeliveryStatus("pending");
      activeCallIdRef.current = callId;

      const socket = getRealtimeSocket?.();

      if (!socket) {
        throw new Error("Realtime connection is not ready.");
      }

      const localStream = await requestCallMedia(nextCallMode);
      localStreamRef.current = localStream;
      setLocalStreamVersion((value) => value + 1);
      setIsAudioMuted(false);
      setIsVideoMuted(false);

      const peerConnection = await createManagedPeerConnection(activeFriendId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: nextCallMode === "video",
      });

      await peerConnection.setLocalDescription(offer);
      logCallDebug("friend", "offer-created", {
        friendId: activeFriendId,
        callMode: nextCallMode,
      });

      socket.emit("call:offer", {
        toUserId: activeFriendId,
        fromUserId: currentUserId,
        callType: nextCallMode,
        offer: peerConnection.localDescription,
        callId,
        metadata: {
          fromDisplayName: currentUserDisplayName,
        },
      });

      setCallState("calling");
    } catch (error) {
      teardownCall({
        keepError: true,
        nextError: error?.message || "Unable to start the call.",
      });
    }
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall?.fromUserId || !incomingCall?.offer) {
      return;
    }

    try {
      setCallError("");
      setCallMode(incomingCall.callType);
      setCallState("requesting-media");

      const socket = getRealtimeSocket?.();

      if (!socket) {
        throw new Error("Realtime connection is not ready.");
      }

      const localStream = await requestCallMedia(incomingCall.callType);
      localStreamRef.current = localStream;
      setLocalStreamVersion((value) => value + 1);
      setIsAudioMuted(false);
      setIsVideoMuted(incomingCall.callType !== "video");

      const peerConnection = await createManagedPeerConnection(
        incomingCall.fromUserId,
      );

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );
      await flushQueuedIceCandidates();

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      logCallDebug("friend", "answer-created", {
        fromUserId: incomingCall.fromUserId,
        callMode: incomingCall.callType,
      });

      socket.emit("call:answer", {
        toUserId: incomingCall.fromUserId,
        fromUserId: currentUserId,
        answer: peerConnection.localDescription,
      });

      setIncomingCall(null);
      setCallState("connecting");
    } catch (error) {
      teardownCall({
        keepError: true,
        nextError: error?.message || "Unable to answer the call.",
      });
    }
  };

  const handleRejectIncomingCall = () => {
    const socket = getRealtimeSocket?.();

    if (socket && incomingCall?.fromUserId) {
      socket.emit("call:reject", {
        toUserId: incomingCall.fromUserId,
        fromUserId: currentUserId,
        reason: "declined",
      });
    }

    teardownCall({
      keepError: true,
      nextError: "Incoming call declined.",
    });
  };

  const handleEndCall = (reason = "ended") => {
    const normalizedReason =
      typeof reason === "string" && reason.trim() ? reason.trim() : "ended";
    const socket = getRealtimeSocket?.();
    const targetUserId =
      activeCallPartnerRef.current ||
      incomingCall?.fromUserId ||
      activeFriendId;

    if (socket && targetUserId) {
      socket.emit("call:end", {
        toUserId: targetUserId,
        fromUserId: currentUserId,
        reason: normalizedReason,
      });
    }

    teardownCall();
  };

  const inlineCallActions =
    hideTitleContainer && hasActiveChat ? (
      <div className="Chat_inlineCallActions fr">
        {isGlobalCallConnectedForFriend ? (
          null
        ) : (
          <>
            <button
              type="button"
              className="Chat_callButton"
              title="Start voice call"
              aria-label="Start voice call"
              disabled={
                usesGlobalCallPanel
                  ? globalCallIsBusy
                  : callState !== "idle" && callState !== "incoming"
              }
              onClick={() => handleCallButtonPress("audio")}
            >
              <i className="fas fa-phone-alt"></i>
            </button>
            <button
              type="button"
              className="Chat_callButton"
              title="Start video call"
              aria-label="Start video call"
              disabled={
                usesGlobalCallPanel
                  ? globalCallIsBusy
                  : callState !== "idle" && callState !== "incoming"
              }
              onClick={() => handleCallButtonPress("video")}
            >
              <i className="fas fa-video"></i>
            </button>
          </>
        )}
      </div>
    ) : null;

  const normalizedActiveFriendId = String(activeFriendId || "").trim().toLowerCase();
  const activeFriendPresenceFriend = React.useMemo(
    () =>
      state?.friends?.find?.((friend) => {
        const candidateIds = [
          friend?._id,
          friend?.id,
          friend?.chatId,
          friend?.friendId,
          getFriendChatPresenceKey(friend),
        ];

        return candidateIds.some(
          (candidateId) =>
            String(candidateId || "").trim().toLowerCase() ===
            normalizedActiveFriendId,
        );
      }) || null,
    [normalizedActiveFriendId, state?.friends],
  );
  const activeFriendGlobalPresence = React.useMemo(
    () => resolveFriendPresenceState(activeFriendPresenceFriend || {}),
    [activeFriendPresenceFriend],
  );
  const activeFriendLocalPresence = React.useMemo(() => {
    const liveLocalStatus =
      state?.friendLocalStatusById &&
      typeof state.friendLocalStatusById === "object"
        ? state.friendLocalStatusById[String(activeFriendId || "").trim()] || null
        : null;
    const localValue = String(
      liveLocalStatus?.value || activeFriendPresenceFriend?.localStatus?.value || "",
    )
      .trim()
      .toLowerCase();
    const hasTextInTextarea = Boolean(
      liveLocalStatus?.hasTextInTextarea ??
        activeFriendPresenceFriend?.localStatus?.hasTextInTextarea,
    );

    if (!localValue) {
      return null;
    }

    if (localValue === "typing") {
      return {
        text: "Busy, but he's here and typing.",
      };
    }

    if (localValue === "in my chat") {
      return {
        text: hasTextInTextarea
          ? "Busy, but he's here and thinking."
          : "Busy, but he's here and listening to me.",
      };
    }

    return null;
  }, [activeFriendId, activeFriendPresenceFriend, state?.friendLocalStatusById]);

  const inlineChatHeader =
    hideTitleContainer && hasActiveChat ? (
      <>
        <section id="Chat_inlineHeader" className="fr">
          {showInlineBackButton ? (
            <button
              id="Chat_backToListBtn"
              className="Chat_backToListBtn"
              type="button"
              aria-label="Back to chat list"
              title="Back to chat list"
              onClick={handleBackToChatList}
            >
              <i className="fi fi-br-left" aria-hidden="true"></i>
            </button>
          ) : null}
          <div id="Chat_inlineHeaderIdentity" className="fr">
            <span id="Chat_inlineHeaderAvatar" aria-hidden="true">
              {activeFriendAvatarUrl ? (
                <img
                  src={activeFriendAvatarUrl}
                  alt={`${state?.activeChatFriendName || "Friend"} avatar`}
                  id="Chat_inlineHeaderAvatarImage"
                />
              ) : (
                <i className="fas fa-user"></i>
              )}
            </span>
            <div id="Chat_inlineHeaderIdentityCopy" className="fc">
              <h1 id="Chat_inlineHeaderTitle">
                {state?.activeChatFriendName || chatContent?.title || "Chat"}
              </h1>
              {activeFriendLocalPresence ? (
                <p id="Chat_inlineHeaderLocalStatus">
                  {activeFriendLocalPresence.text}
                </p>
              ) : null}
            </div>
          </div>
        </section>
        {inlineCallActions ? (
          <div id="Chat_inlineCallActionsRow">{inlineCallActions}</div>
        ) : null}
      </>
    ) : null;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    try {
      const rawLayout = window.localStorage.getItem(
        CHAT_CALL_PANEL_LAYOUT_STORAGE_KEY,
      );

      if (!rawLayout) {
        return undefined;
      }

      const parsedLayout = JSON.parse(rawLayout);
      setCallPanelLayout(clampCallPanelLayout(parsedLayout));
    } catch (_error) {
      // Ignore malformed persisted layout and keep defaults.
    }

    return undefined;
  }, [clampCallPanelLayout]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.localStorage.setItem(
      CHAT_CALL_PANEL_LAYOUT_STORAGE_KEY,
      JSON.stringify(callPanelLayout),
    );

    return undefined;
  }, [callPanelLayout]);

  React.useEffect(() => {
    const handleViewportResize = () => {
      setCallPanelLayout((currentLayout) =>
        clampCallPanelLayout(currentLayout),
      );
    };

    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);
    };
  }, [clampCallPanelLayout]);

  React.useEffect(() => {
    if (callMode !== "video") {
      videoOverlayDragRef.current = null;
      videoOverlayResizeRef.current = null;
      videoOverlayPinchRef.current = null;
      setVideoOverlayScale(DEFAULT_VIDEO_OVERLAY_LAYOUT.scale);
      setVideoOverlayPosition({
        x: DEFAULT_VIDEO_OVERLAY_LAYOUT.x,
        y: DEFAULT_VIDEO_OVERLAY_LAYOUT.y,
      });
      setIsRemoteVideoHovered(false);
      setIsCallControlsPinned(false);
      return undefined;
    }

    setVideoOverlayPosition((currentPosition) =>
      clampVideoOverlayPosition(currentPosition, videoOverlayScale),
    );

    return undefined;
  }, [callMode, clampVideoOverlayPosition, videoOverlayScale]);

  React.useEffect(() => {
    if (!isCallControlsPinned) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        videoStageRef.current?.contains(target) ||
        callControlsRef.current?.contains(target)
      ) {
        return;
      }

      setIsCallControlsPinned(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCallControlsPinned]);

  React.useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = videoOverlayDragRef.current;
      const resizeState = videoOverlayResizeRef.current;

      if (resizeState) {
        const deltaX = event.clientX - resizeState.pointerStartX;
        const deltaY = event.clientY - resizeState.pointerStartY;
        const widthRatioBase =
          resizeState.originRect.width > 0
            ? resizeState.originRect.width
            : 1;
        const heightRatioBase =
          resizeState.originRect.height > 0
            ? resizeState.originRect.height
            : 1;

        let widthRatio = 1;
        let heightRatio = 1;

        if (resizeState.edge.includes("e")) {
          widthRatio =
            (resizeState.originRect.width + deltaX) / widthRatioBase;
        }
        if (resizeState.edge.includes("w")) {
          widthRatio =
            (resizeState.originRect.width - deltaX) / widthRatioBase;
        }
        if (resizeState.edge.includes("s")) {
          heightRatio =
            (resizeState.originRect.height + deltaY) / heightRatioBase;
        }
        if (resizeState.edge.includes("n")) {
          heightRatio =
            (resizeState.originRect.height - deltaY) / heightRatioBase;
        }

        let dominantRatio = 1;

        if (
          resizeState.edge.length === 2 &&
          Number.isFinite(widthRatio) &&
          Number.isFinite(heightRatio)
        ) {
          const widthDeltaMagnitude = Math.abs(widthRatio - 1);
          const heightDeltaMagnitude = Math.abs(heightRatio - 1);
          dominantRatio =
            widthDeltaMagnitude >= heightDeltaMagnitude
              ? widthRatio
              : heightRatio;
        } else if (
          (resizeState.edge.includes("e") || resizeState.edge.includes("w")) &&
          Number.isFinite(widthRatio)
        ) {
          dominantRatio = widthRatio;
        } else if (Number.isFinite(heightRatio)) {
          dominantRatio = heightRatio;
        }

        const nextScale = clampVideoOverlayScale(
          resizeState.originScale * dominantRatio,
        );

        const widthDelta =
          resizeState.originRect.width * (nextScale / resizeState.originScale) -
          resizeState.originRect.width;
        const heightDelta =
          resizeState.originRect.height *
            (nextScale / resizeState.originScale) -
          resizeState.originRect.height;

        setVideoOverlayScale(nextScale);
        setVideoOverlayPosition((currentPosition) =>
          clampVideoOverlayPosition(
            {
              x: resizeState.edge.includes("w")
                ? resizeState.originX - widthDelta
                : resizeState.originX,
              y: resizeState.edge.includes("n")
                ? resizeState.originY - heightDelta
                : resizeState.originY,
            },
            nextScale,
          ),
        );
        return;
      }

      if (!dragState) {
        return;
      }

      const nextPosition = clampVideoOverlayPosition(
        {
          x: dragState.originX + (event.clientX - dragState.pointerStartX),
          y: dragState.originY + (event.clientY - dragState.pointerStartY),
        },
        videoOverlayScale,
      );

      setVideoOverlayPosition(nextPosition);
    };

    const handlePointerUp = () => {
      videoOverlayDragRef.current = null;
      videoOverlayResizeRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [clampVideoOverlayPosition, clampVideoOverlayScale, videoOverlayScale]);

  React.useEffect(() => {
    const handlePanelPointerMove = (event) => {
      const interaction = callPanelInteractionRef.current;

      if (!interaction) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - interaction.pointerStartX;
      const deltaY = event.clientY - interaction.pointerStartY;

      if (interaction.type === "drag") {
        setCallPanelLayout((currentLayout) =>
          clampCallPanelLayout({
            ...currentLayout,
            x: interaction.originX + deltaX,
            y: interaction.originY + deltaY,
          }),
        );
        return;
      }

      setCallPanelLayout((currentLayout) => {
        const widthRatioBase =
          interaction.originWidth > 0 ? interaction.originWidth : 1;
        const heightRatioBase =
          interaction.originHeight > 0 ? interaction.originHeight : 1;
        let widthRatio = 1;
        let heightRatio = 1;

        if (interaction.edge.includes("e")) {
          widthRatio = (interaction.originWidth + deltaX) / widthRatioBase;
        }

        if (interaction.edge.includes("w")) {
          widthRatio = (interaction.originWidth - deltaX) / widthRatioBase;
        }

        if (interaction.edge.includes("s")) {
          heightRatio = (interaction.originHeight + deltaY) / heightRatioBase;
        }

        if (interaction.edge.includes("n")) {
          heightRatio = (interaction.originHeight - deltaY) / heightRatioBase;
        }

        let dominantRatio = 1;

        if (
          interaction.edge.length === 2 &&
          Number.isFinite(widthRatio) &&
          Number.isFinite(heightRatio)
        ) {
          const widthDeltaMagnitude = Math.abs(widthRatio - 1);
          const heightDeltaMagnitude = Math.abs(heightRatio - 1);
          dominantRatio =
            widthDeltaMagnitude >= heightDeltaMagnitude
              ? widthRatio
              : heightRatio;
        } else if (
          (interaction.edge.includes("e") || interaction.edge.includes("w")) &&
          Number.isFinite(widthRatio)
        ) {
          dominantRatio = widthRatio;
        } else if (Number.isFinite(heightRatio)) {
          dominantRatio = heightRatio;
        }

        const nextWidth = interaction.originWidth * dominantRatio;
        const nextHeight = interaction.originHeight * dominantRatio;

        return clampCallPanelLayout({
          ...currentLayout,
          x: interaction.edge.includes("w")
            ? interaction.originX + (interaction.originWidth - nextWidth)
            : interaction.originX,
          y: interaction.edge.includes("n")
            ? interaction.originY + (interaction.originHeight - nextHeight)
            : interaction.originY,
          width: nextWidth,
          height: nextHeight,
        });
      });
    };

    const handlePanelPointerUp = () => {
      callPanelInteractionRef.current = null;
    };

    window.addEventListener("pointermove", handlePanelPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePanelPointerUp);
    window.addEventListener("pointercancel", handlePanelPointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePanelPointerMove);
      window.removeEventListener("pointerup", handlePanelPointerUp);
      window.removeEventListener("pointercancel", handlePanelPointerUp);
    };
  }, [clampCallPanelLayout]);

  const handleVideoOverlayDragStart = React.useCallback(
    (event) => {
      if (callMode !== "video") {
        return;
      }

      if (event.target.closest(".Chat_videoOverlayScaleButton")) {
        return;
      }

      videoOverlayDragRef.current = {
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        originX: videoOverlayPosition.x,
        originY: videoOverlayPosition.y,
      };
    },
    [callMode, videoOverlayPosition.x, videoOverlayPosition.y],
  );

  const handleVideoOverlayResizeStart = React.useCallback(
    (edge, event) => {
      event.preventDefault();
      event.stopPropagation();

      const overlayRect = videoOverlayRef.current?.getBoundingClientRect?.();

      if (!overlayRect) {
        return;
      }

      videoOverlayResizeRef.current = {
        edge,
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        originX: videoOverlayPosition.x,
        originY: videoOverlayPosition.y,
        originScale: videoOverlayScale,
        originRect: overlayRect,
      };
    },
    [videoOverlayPosition.x, videoOverlayPosition.y, videoOverlayScale],
  );

  const handleVideoOverlayTouchStart = React.useCallback(
    (event) => {
      if (event.touches.length !== 2) {
        return;
      }

      const [touchA, touchB] = event.touches;
      const initialDistance = Math.hypot(
        touchB.clientX - touchA.clientX,
        touchB.clientY - touchA.clientY,
      );

      if (!initialDistance) {
        return;
      }

      videoOverlayPinchRef.current = {
        initialDistance,
        originScale: videoOverlayScale,
      };
    },
    [videoOverlayScale],
  );

  const handleVideoOverlayTouchMove = React.useCallback(
    (event) => {
      const pinchState = videoOverlayPinchRef.current;

      if (!pinchState || event.touches.length !== 2) {
        return;
      }

      event.preventDefault();

      const [touchA, touchB] = event.touches;
      const nextDistance = Math.hypot(
        touchB.clientX - touchA.clientX,
        touchB.clientY - touchA.clientY,
      );

      if (!nextDistance) {
        return;
      }

      const nextScale = clampVideoOverlayScale(
        pinchState.originScale * (nextDistance / pinchState.initialDistance),
      );

      setVideoOverlayScale(nextScale);
      setVideoOverlayPosition((currentPosition) =>
        clampVideoOverlayPosition(currentPosition, nextScale),
      );
    },
    [clampVideoOverlayPosition, clampVideoOverlayScale],
  );

  const handleVideoOverlayTouchEnd = React.useCallback(() => {
    if (videoOverlayPinchRef.current) {
      videoOverlayPinchRef.current = null;
    }
  }, []);

  const handleCallPanelDragStart = React.useCallback(
    (event) => {
      if (event.target.closest(".Chat_callControlButton")) {
        return;
      }

      callPanelInteractionRef.current = {
        type: "drag",
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        originX: callPanelLayout.x,
        originY: callPanelLayout.y,
      };
    },
    [callPanelLayout.x, callPanelLayout.y],
  );

  const handleCallPanelResizeStart = React.useCallback(
    (edge, event) => {
      event.preventDefault();
      event.stopPropagation();

      callPanelInteractionRef.current = {
        type: "resize",
        edge,
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        originX: callPanelLayout.x,
        originY: callPanelLayout.y,
        originWidth: callPanelLayout.width,
        originHeight: callPanelLayout.height,
      };
    },
    [
      callPanelLayout.height,
      callPanelLayout.width,
      callPanelLayout.x,
      callPanelLayout.y,
    ],
  );

  const handleToggleMute = () => {
    const localStream = localStreamRef.current;

    if (!localStream) {
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    const nextMuted = !isAudioMuted;

    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsAudioMuted(nextMuted);
  };

  const handleToggleCamera = () => {
    const localStream = localStreamRef.current;

    if (!localStream) {
      return;
    }

    const videoTracks = localStream.getVideoTracks();

    if (!videoTracks.length) {
      return;
    }

    const nextMuted = !isVideoMuted;

    videoTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsVideoMuted(nextMuted);
  };

  const callPanelStyle = {
    position: "absolute",
    left: `${callPanelLayout.x}px`,
    bottom: "0px",
    width: `${callPanelLayout.width}px`,
    height: `${callPanelLayout.height}px`,
    zIndex: 4,
  };
  function handleBackToChatList() {
    const phenomedIntro = document.querySelector(".PhenomedSocial_intro");
    const friendsListArticle = document.getElementById("FriendsList_article");
    const addFriendArticle = document.getElementById("AddFriend_article");
    const friendChatArticle = document.getElementById("Chat_article");

    if (friendsListArticle) {
      friendsListArticle.style.display = "flex";
    }
    if (addFriendArticle) {
      addFriendArticle.style.display = "flex";
    }
    if (friendChatArticle) {
      friendChatArticle.style.display = "none";
    }
    if (phenomedIntro) {
      phenomedIntro.style.display = "flex";
    }
    if (closeActiveChat) {
      closeActiveChat();
    }
  }
  const showCallControls =
    callMode !== "video" || isRemoteVideoHovered || isCallControlsPinned;
  const shouldRenderCallPanel =
    !usesGlobalCallPanel && callMode === "video" && callState === "connected";
  return (
    <section id="Chat_article" className="fc">
          {hideTitleContainer ? null : (
            <>
            <section id="Chat_title_container" className="fr">
              <button
                id="Chat_backToListBtn"
                type="button"
                aria-label="Back to chat list"
                title="Back to chat list"
                onClick={handleBackToChatList}
              >
                <i className="fi fi-br-left" aria-hidden="true"></i>
              </button>
              <div id="Chat_title_copy" className="fc">
                <div id="Chat_title_identity" className="fr">
                  <span id="Chat_title_avatar" aria-hidden="true">
                    {activeFriendAvatarUrl ? (
                      <img
                        src={activeFriendAvatarUrl}
                        alt={`${state?.activeChatFriendName || "Friend"} avatar`}
                        id="Chat_title_avatarImage"
                      />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </span>
                  <div id="Chat_title_identityCopy" className="fc">
                    <h1 id="Chat_title_text">
                      {state?.activeChatFriendName || chatContent?.title || "Chat"}
                    </h1>
                    {activeFriendLocalPresence ? (
                      <p id="Chat_title_localStatus">
                        {activeFriendLocalPresence.text}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              {hasActiveChat ? (
                <div id="Chat_callActions" className="fr">
                  <button
                    id="Chat_audioCallButton"
                    type="button"
                    className="Chat_callButton"
                    title="Start voice call"
                    aria-label="Start voice call"
                    disabled={
                      usesGlobalCallPanel
                        ? globalCallIsBusy
                        : callState !== "idle" && callState !== "incoming"
                    }
                    onClick={() => handleCallButtonPress("audio")}
                  >
                    <i className="fi fi-sr-phone" aria-hidden="true"></i>
                  </button>
                  <button
                    id="Chat_videoCallButton"
                    type="button"
                    className="Chat_callButton"
                    title="Start video call"
                    aria-label="Start video call"
                    disabled={
                      usesGlobalCallPanel
                        ? globalCallIsBusy
                        : callState !== "idle" && callState !== "incoming"
                    }
                    onClick={() => handleCallButtonPress("video")}
                  >
                    <i className="fi fi-sr-video" aria-hidden="true"></i>
                  </button>
                  <button
                    id="Chat_moreActionsButton"
                    type="button"
                    className="Chat_backToListBtn Chat_moreActionsButton"
                    title="More chat actions"
                    aria-label="More chat actions"
                    aria-expanded={isMoreActionsOpen}
                    aria-haspopup="menu"
                    onClick={() =>
                      setIsMoreActionsOpen((currentValue) => !currentValue)
                    }
                  >
                    <i className="fi fi-br-menu-dots-vertical" aria-hidden="true"></i>
                  </button>
                  {isMoreActionsOpen ? (
                    <div
                      ref={moreActionsMenuRef}
                      className="Chat_moreActionsMenu fc"
                      role="menu"
                    >
                      <button
                        type="button"
                        className="Chat_moreActionsMenuButton"
                        role="menuitem"
                        onClick={() => {
                          setActiveContentView("media");
                          setIsMoreActionsOpen(false);
                        }}
                      >
                        <i className="fas fa-images" aria-hidden="true"></i>
                        <span>Media</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
            {selectedMessageAction ? (
              <div id="Chat_messageActionBar" className="fr">
                <button
                  type="button"
                  className="Chat_messageActionBarButton Chat_messageActionBarButton--danger"
                  onClick={() => handleDeleteMessageForMe(selectedMessageAction)}
                  disabled={isMessageMutationPending}
                >
                  Delete for me
                </button>
                {selectedMessageAction.sender === "me" && !selectedMessageAction.deleted ? (
                  <button
                    type="button"
                    className="Chat_messageActionBarButton Chat_messageActionBarButton--danger"
                    onClick={() => handleDeleteExistingMessage(selectedMessageAction)}
                    disabled={isMessageMutationPending}
                  >
                    Delete for everyone
                  </button>
                ) : null}
                {selectedMessageAction.sender === "me" && !selectedMessageAction.deleted ? (
                  <button
                    type="button"
                    className="Chat_messageActionBarButton"
                    onClick={() => handleStartMessageEdit(selectedMessageAction)}
                    disabled={isMessageMutationPending}
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  className="Chat_messageActionBarButton"
                  onClick={() => handleCopyMessageText(selectedMessageAction)}
                  disabled={!String(selectedMessageAction?.text || "").trim()}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="Chat_messageActionBarClose"
                  onClick={() => setSelectedMessageActionId("")}
                  aria-label="Close message controls"
                  title="Close"
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
            ) : null}
            </>
          )}
          {isChatting ? (
            <React.Fragment>
              {usesGlobalCallPanel ? null : (
                <React.Fragment>
                  <audio
                    id="Chat_remoteAudio"
                    ref={remoteAudioRef}
                    autoPlay
                    playsInline
                  />
                  <audio
                    id="Chat_localAudio"
                    ref={localAudioRef}
                    autoPlay
                    playsInline
                    muted
                  />
                </React.Fragment>
              )}
              {inlineCallActions
                ? inlineChatHeader
                : null}
              {!usesGlobalCallPanel && incomingCall?.callType === "video" ? (
                <section id="Chat_incomingCallBanner" className="fc">
                  <strong>
                    Incoming{" "}
                    {incomingCall.callType === "video" ? "video" : "voice"} call
                  </strong>
                  <span>
                    {incomingCall?.metadata?.fromDisplayName ||
                      state?.activeChatFriendName ||
                      "Your friend"}{" "}
                    is calling.
                  </span>
                  <div className="Chat_callBannerActions fr">
                    <button
                      type="button"
                      className="Chat_callBannerButton Chat_callBannerButton--accept"
                      onClick={handleAcceptIncomingCall}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="Chat_callBannerButton Chat_callBannerButton--reject"
                      onClick={handleRejectIncomingCall}
                    >
                      Decline
                    </button>
                  </div>
                </section>
              ) : null}
              {shouldRenderCallPanel ? (
                <section
                  id="Chat_callPanel"
                  className={`fc Chat_callPanel${callState === "connected" ? " is-connected" : ""}`}
                  style={callPanelStyle}
                >
                  <div
                    className="Chat_callStatusRow fr Chat_callPanelHeader"
                    onPointerDown={handleCallPanelDragStart}
                  >
                    <strong>
                      {callMode === "video" ? "Video call" : "Voice call"}
                    </strong>
                    <span>{callPanelStatusLabel}</span>
                  </div>
                  <div
                    ref={videoStageRef}
                    className={`Chat_mediaStage${callMode === "video" ? " Chat_mediaStage--floating" : " fr"}`}
                    onMouseEnter={
                      callMode === "video"
                        ? () => setIsRemoteVideoHovered(true)
                        : undefined
                    }
                    onMouseLeave={
                      callMode === "video"
                        ? () => setIsRemoteVideoHovered(false)
                        : undefined
                    }
                  >
                    {callMode === "video" ? (
                      <>
                        <div
                          className="Chat_mediaTile Chat_mediaTile--remote Chat_mediaTile--floatingRemote"
                          onClick={() =>
                            setIsCallControlsPinned((currentValue) => !currentValue)
                          }
                          onTouchStart={() => setIsCallControlsPinned(true)}
                        >
                          <video
                            id="Chat_remoteVideo"
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                          />
                        </div>
                        <div
                          className="Chat_videoOverlay fc"
                          ref={videoOverlayRef}
                          style={{
                            left: `${videoOverlayPosition.x}px`,
                            top: `${videoOverlayPosition.y}px`,
                            transform: `scale(${videoOverlayScale})`,
                          }}
                          onPointerDown={handleVideoOverlayDragStart}
                          onTouchStart={handleVideoOverlayTouchStart}
                          onTouchMove={handleVideoOverlayTouchMove}
                          onTouchEnd={handleVideoOverlayTouchEnd}
                          onTouchCancel={handleVideoOverlayTouchEnd}
                        >
                          <div className="Chat_videoOverlayHeader fr">
                            <span className="Chat_videoOverlayHandle">
                              <i className="fas fa-arrows-alt"></i>
                              <span>Move video</span>
                            </span>
                          </div>
                          <div className="Chat_mediaTile Chat_mediaTile--local Chat_mediaTile--floatingLocal">
                            <video
                              id="Chat_localVideo"
                              ref={localVideoRef}
                              autoPlay
                              playsInline
                              muted
                            />
                          </div>
                          {["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((edge) => (
                            <div
                              key={edge}
                              className={`Chat_videoOverlayResizeHandle Chat_videoOverlayResizeHandle--${edge}`}
                              onPointerDown={(event) =>
                                handleVideoOverlayResizeStart(edge, event)
                              }
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="Chat_mediaTile Chat_mediaTile--remote">
                          <div className="Chat_audioPlaceholder">
                            <i className="fas fa-user-md"></i>
                            <span>Remote audio</span>
                          </div>
                        </div>
                        <div className="Chat_mediaTile Chat_mediaTile--local">
                          <div className="Chat_audioPlaceholder">
                            <i className="fas fa-microphone"></i>
                            <span>Local audio</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    ref={callControlsRef}
                    className={`Chat_callControls fr${showCallControls ? " is-visible" : ""}`}
                  >
                    <button
                      type="button"
                      className={`Chat_callControlButton${isAudioMuted ? " is-muted" : ""}`}
                      onClick={handleToggleMute}
                      disabled={!localStreamRef.current}
                    >
                      <i
                        className={`fas ${isAudioMuted ? "fa-microphone-slash" : "fa-microphone"}`}
                      ></i>
                    </button>
                    {callMode === "video" ? (
                      <button
                        type="button"
                        className={`Chat_callControlButton${isVideoMuted ? " is-muted" : ""}`}
                        onClick={handleToggleCamera}
                        disabled={!localStreamRef.current}
                      >
                        <i
                          className={`fas ${isVideoMuted ? "fa-video-slash" : "fa-video"}`}
                        ></i>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="Chat_callControlButton Chat_callControlButton--end"
                      onClick={() => handleEndCall("hangup")}
                    >
                      <i className="fas fa-phone-slash"></i>
                    </button>
                  </div>
                  {["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((edge) => (
                    <div
                      key={edge}
                      className={`Chat_callPanelResizeHandle Chat_callPanelResizeHandle--${edge}`}
                      onPointerDown={(event) =>
                        handleCallPanelResizeStart(edge, event)
                      }
                    />
                  ))}
                </section>
              ) : null}
              {!usesGlobalCallPanel && callError ? (
                <div id="Chat_callError" className="Chat_callError">
                  {callError}
                </div>
              ) : null}
              {activeContentView === "media" ? (
                <div id="Chat_mediaPanel" data-react-managed="true">
                  <div className="Chat_mediaPanelHeader fr">
                    <div className="Chat_mediaPanelCopy fc">
                      <strong>Shared media</strong>
                      <span>
                        {chatMediaItems.length > 0
                          ? `${chatMediaItems.length} item${chatMediaItems.length === 1 ? "" : "s"}`
                          : "No shared media yet"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="Chat_mediaPanelBackButton"
                      onClick={() => setActiveContentView("messages")}
                    >
                      <i className="fas fa-comments" aria-hidden="true"></i>
                      <span>Messages</span>
                    </button>
                  </div>
                  {chatMediaItems.length === 0 ? (
                    <div id="FriendChat_mediaEmpty_state">
                      No media has been shared in this chat yet.
                    </div>
                  ) : (
                    <div className="Chat_mediaPanelGrid">
                      {chatMediaItems.map((mediaItem, mediaIndex) => (
                        <div key={mediaItem.id} className="Chat_mediaPanelCard fc">
                          {renderChatImageCard(mediaItem.imageEntry, {
                            key: `${mediaItem.id}-${mediaIndex}`,
                            sender: mediaItem.sender,
                            pending: mediaItem.pending,
                            panelVariant: "Chat_messageImageCard--panel",
                          })}
                          <div className="Chat_mediaPanelMeta fc">
                            <strong>
                              {mediaItem.sender === "me"
                                ? "You"
                                : state?.activeChatFriendName || "Friend"}
                            </strong>
                            <span>
                              {formatChatTimestamp(
                                mediaItem.rawDate,
                                mediaItem.timestamp,
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ul id="Chat_messages" data-react-managed="true">
                  {allMessages.length === 0 ? (
                    <li id="FriendChat_empty_state">
                      {chatContent?.empty ||
                        "Open a conversation to view messages here."}
                    </li>
                  ) : (
                    allMessages.map((msg, index) => {
                      const msgText = String(msg?.text || "");
                      const msgDirection = ARABIC_TEXT_PATTERN.test(msgText)
                        ? "rtl"
                        : "ltr";
                      const messageItemClassName = [
                        msg.sender === "me" ? "sentMessagesLI" : "receivedMessagesLI",
                        `Chat_message--${msgDirection}`,
                      ].join(" ");

                      return (
                        <div
                          key={`${msg.id || msg.timestamp}-${msg.rawDate || ""}-${msg.sender}-${index}`}
                          className={
                            msg.sender === "me"
                              ? "sentMessagesDIV fc"
                              : "receivedMessagesDIV fc"
                          }
                        >
                          <li
                            className={messageItemClassName}
                            data-message-id={msg.id || ""}
                            onPointerDown={() => beginMessageLongPress(msg)}
                            onPointerUp={clearPendingMessageLongPress}
                            onPointerLeave={clearPendingMessageLongPress}
                            onPointerCancel={clearPendingMessageLongPress}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              setSelectedMessageActionId(String(msg.id || "").trim());
                            }}
                            style={
                              msg.pending
                                ? { opacity: 0.6, fontStyle: "italic" }
                                : undefined
                            }
                          >
                            <span className="Chat_messageTimestamp">
                              <span className="Chat_messageTimestampText">
                                {formatChatTimestamp(msg.rawDate, msg.timestamp)}
                              </span>
                              {msg.sender === "me" ? (
                                <span
                                  className={`Chat_messageStatus ${
                                    msg.pending
                                      ? "Chat_messageStatus--sent"
                                      : msg.status === "read"
                                        ? "Chat_messageStatus--read"
                                        : msg.status === "delivered"
                                          ? "Chat_messageStatus--received"
                                          : "Chat_messageStatus--sent"
                                  }`}
                                >
                                  {msg.pending ? "..." : ""}
                                  {!msg.pending &&
                                  (msg.status === "sent" ||
                                    msg.status === "delivered") ? (
                                    <i className="fi fi-br-envelope" aria-hidden="true"></i>
                                  ) : null}
                                  {msg.status === "read" && !msg.pending ? (
                                    <i
                                      className="fi fi-br-envelope-open"
                                      aria-hidden="true"
                                    ></i>
                                  ) : null}
                                </span>
                              ) : null}
                            </span>
                            {msg.deleted ? (
                              <p className="Chat_deletedMessageText">Message deleted</p>
                            ) : msg.text ? (
                              <p dir={msgDirection}>
                                <span>{renderMessageWithEmojiImages(msg.text)}</span>
                              </p>
                            ) : null}
                          {!msg.deleted && msg.audio ? (
                            <div className="Chat_voiceNoteCard">
                              <ChatVoiceNotePlayer src={msg.audio} />
                            </div>
                          ) : null}
                          {!msg.deleted &&
                            Array.isArray(msg.images) &&
                            msg.images.length > 0 ? (
                              <div className="Chat_messageImages">
                                {msg.images.map((imageUrl, imageIndex) =>
                                  renderChatImageCard(imageUrl, {
                                    key: `${imageUrl}-${imageIndex}`,
                                    sender: msg.sender,
                                    pending: msg.pending,
                                  }),
                                )}
                              </div>
                            ) : null}
                          </li>
                        </div>
                      );
                    })
                  )}
                </ul>
              )}
		              <section id="Chat_form" className="fc">
                        {editingMessageId ? (
                          <div className="Chat_editingBanner fr">
                            <span className="Chat_editingBannerCopy">
                              Editing message
                            </span>
                            <button
                              type="button"
                              className="Chat_editingBannerCancel"
                              onClick={handleCancelMessageEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
		                {selectedImages.length > 0 || recordedVoiceNote ? (
	                  <div className="Chat_attachmentPreviewRow">
	                    {selectedImages.map((image) => (
	                      <div
	                        key={image.id}
	                        className="Chat_attachmentPreviewCard"
	                      >
	                        <img
	                          src={image.previewUrl}
	                          alt={image.name || "Selected attachment"}
	                          className="Chat_attachmentPreviewImage"
	                        />
	                        <button
	                          type="button"
	                          className="Chat_attachmentPreviewRemove"
	                          onClick={() => handleRemoveSelectedImage(image.id)}
	                          aria-label="Remove selected image"
	                        >
	                          <i className="fas fa-times"></i>
	                        </button>
	                      </div>
	                    ))}
                      {recordedVoiceNote ? (
                        <div className="Chat_voiceNoteDraftCard">
                          <button
                            type="button"
                            className="Chat_attachmentPreviewRemove"
                            onClick={handleClearRecordedVoiceNote}
                            aria-label="Remove recorded voice note"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                          <div className="Chat_voiceNoteDraftMeta">
                            <i className="fas fa-microphone"></i>
                            <span>Voice note</span>
                          </div>
                          <audio
                            className="Chat_voiceNotePlayer"
                            controls
                            preload="metadata"
                            src={recordedVoiceNote.previewUrl}
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className={`Chat_attachmentSecretToggle${
                          shouldSendSecretAttachments
                            ? " Chat_attachmentSecretToggle--secret"
                            : " Chat_attachmentSecretToggle--open"
                        }`}
                        disabled={Boolean(recordedVoiceNote)}
                        onClick={() =>
                          setShouldSendSecretAttachments(
                            (currentValue) => !currentValue,
                          )
                        }
                        aria-label={
                          shouldSendSecretAttachments
                            ? "Secret attachment enabled"
                            : "Secret attachment disabled"
                        }
                        title={
                          shouldSendSecretAttachments
                            ? "Secret attachment enabled"
                            : "Secret attachment disabled"
                        }
                      >
                        <i
                          className={`${
                            shouldSendSecretAttachments
                              ? "fi fi-rr-lock"
                              : "fi fi-rr-lock-open-alt"
                          }`}
                          aria-hidden="true"
                        ></i>
                      </button>
                      <div className="Chat_attachmentSelfDestructGroup">
                        <button
                          type="button"
                          className={`Chat_attachmentSelfDestructToggle${
                            selectedImageSelfDestructMode === "10s"
                              ? " Chat_attachmentSelfDestructToggle--secret"
                              : " Chat_attachmentSelfDestructToggle--open"
                          }`}
                          disabled={Boolean(recordedVoiceNote)}
                          onClick={() =>
                            setSelectedImageSelfDestructMode((currentValue) =>
                              currentValue === "10s" ? "none" : "10s",
                            )
                          }
                          aria-label={
                            selectedImageSelfDestructMode === "10s"
                              ? "Self-destruction enabled for 10 seconds"
                              : "Self-destruction disabled"
                          }
                          title={
                            selectedImageSelfDestructMode === "10s"
                              ? "Self-destruction enabled for 10 seconds"
                              : "Self-destruction disabled"
                          }
                        >
                          <i className="fi fi-rr-time-forward-ten" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className={`Chat_attachmentSelfDestructToggle${
                            selectedImageSelfDestructMode === "30s"
                              ? " Chat_attachmentSelfDestructToggle--secret"
                              : " Chat_attachmentSelfDestructToggle--open"
                          }`}
                          disabled={Boolean(recordedVoiceNote)}
                          onClick={() =>
                            setSelectedImageSelfDestructMode((currentValue) =>
                              currentValue === "30s" ? "none" : "30s",
                            )
                          }
                          aria-label={
                            selectedImageSelfDestructMode === "30s"
                              ? "Self-destruction enabled for 30 seconds"
                              : "Self-destruction disabled"
                          }
                          title={
                            selectedImageSelfDestructMode === "30s"
                              ? "Self-destruction enabled for 30 seconds"
                              : "Self-destruction disabled"
                          }
                        >
                          <i className="fi fi-br-time-forward-thirty" aria-hidden="true"></i>
                        </button>
                      </div>
	                  </div>
	                ) : null}
	                <div className="Chat_formControls fr">
	                  <div id="Chat_emoji_button_mount">
	                    <div id="Chat_emoji_button_wrap">
	                      <button
	                        id="Chat_emoji_button"
	                        type="button"
	                        aria-label="Open emoji picker"
	                        title="Emoji"
	                        onMouseDown={keepTextareaFocus}
	                        onTouchStart={keepTextareaFocus}
	                        onClick={() => {
	                          setIsEmojiPickerOpen((currentValue) => !currentValue);
	                          const textarea = textareaRef.current;
	
	                          if (textarea) {
	                            textarea.focus();
	                          }
	                        }}
	                      >
	                        <i className="fi fi-sr-smile-beam" aria-hidden="true"></i>
	                      </button>
	                    </div>
	                  </div>
	                  <button
	                    id="Chat_voiceNote_button"
	                    type="button"
	                    aria-label={isRecordingVoiceNote ? "Stop voice note recording" : "Record voice note"}
	                    title={isRecordingVoiceNote ? "Stop recording" : "Record voice note"}
	                    onMouseDown={keepTextareaFocus}
	                    onTouchStart={keepTextareaFocus}
	                    onClick={handleToggleVoiceRecording}
	                    disabled={isUploadingAttachments || isMessageMutationPending}
	                  >
	                    <i
                        className={`fi ${
                          isRecordingVoiceNote ? "fi-sr-stop" : "fi-sr-microphone"
                        }`}
                      ></i>
	                  </button>
	                  <button
	                    id="Chat_attachment_button"
	                    type="button"
	                    aria-label="Attach images"
	                    title="Attach images"
	                    onMouseDown={keepTextareaFocus}
	                    onTouchStart={keepTextareaFocus}
	                    onClick={() => attachmentInputRef.current?.click()}
                      disabled={isRecordingVoiceNote}
	                  >
	                    <i className="fi fi-sr-picture" aria-hidden="true"></i>
	                  </button>
	                  <input
	                    ref={attachmentInputRef}
	                    type="file"
	                    accept="image/*"
	                    multiple
	                    hidden
	                    onChange={handleAttachmentSelection}
	                  />
	                  <textarea
	                    id="Chat_textarea_input"
	                    ref={textareaRef}
	                    placeholder={
	                      chatContent?.inputPlaceholder || "Write a message"
	                    }
	                    rows="1"
	                    onFocus={handleTextareaFocus}
	                    onBlur={handleTextareaBlur}
	                    onChange={handleTypingChange}
	                    onKeyDown={(event) => {
	                      if (event.key === "Enter" && !event.shiftKey) {
	                        event.preventDefault();
	                        handleSend();
	                      }
	                    }}
	                  ></textarea>
		                  <button
		                    id="Chat_submit_button"
	                    type="button"
	                    onMouseDown={keepTextareaFocus}
	                    onTouchStart={keepTextareaFocus}
	                    onClick={handleSend}
		                    disabled={isUploadingAttachments || isMessageMutationPending}
		                  >
		                    <i
                              className={`fi ${
                                editingMessageId ? "fi-sr-check" : "fi-sr-paper-plane"
                              }`}
                            ></i>
		                  </button>
	                </div>
	              </section>
              {isEmojiPickerOpen ? (
                <div id="Chat_emoji_mount" className="fc">
                  <div
                    id="Chat_emoji_region"
                    className="fc"
                    ref={emojiPickerWrapRef}
                  >
                    <div id="Chat_emoji_popup_wrap" className="fc">
                      <div
                        id="Chat_emoji_picker"
                        className="fc"
                        ref={emojiPickerRef}
                      >
                        <div id="Chat_emoji_picker_card_wrap" className="fc">
                          <EmojiPicker
                            id="Chat_emoji_picker_aside"
                            onEmojiClick={handleEmojiPickerSelect}
                            theme={Theme.AUTO}
                            emojiStyle={EmojiStyle.TWITTER}
                            lazyLoadEmojis
                            skinTonesDisabled={false}
                            searchDisabled={true}
                            previewConfig={{
                              showPreview: false,
                              defaultCaption: "Pick an emoji",
                            }}
                            className="Chat_modernEmojiPicker"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          ) : null}
    </section>
  );
};

export default FriendChat;
