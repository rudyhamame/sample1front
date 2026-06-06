//...........import..................
import React from "react";

//........import CSS...........
import "./App.css";
import "../Nav/nav.css";
import { Route } from "react-router-dom";
import HomeNoga from "../Home/Home_noga";
import {
  getPlannerMusicSnapshot,
  playNextSharedPlannerMusicTrack,
  playPreviousSharedPlannerMusicTrack,
  toggleSharedPlannerMusic,
  warmSharedPlannerMusic,
} from "../music/globalMusicPlayer";
import VoiceVideoCall from "../voiceVideoCall/VoiceVideoCall";
import Footer from "./Footer/Footer";
import SubApps from "../Nav/SubApps/SubApps";
import { getHomeSubApps } from "../utils/homeSubApps";
import { apiUrl } from "../config/api";
import { connectRealtime } from "../realtime/socket";
import {
  logoutStoredSession,
  readStoredSession,
  writeStoredSession,
} from "../utils/sessionCleanup";
import { getFriendChatPresenceKey } from "../utils/friendPresence";
import { normalizeUserUpdatePayload } from "../utils/backendUser";
import {
  saveRemoteImageToUserGallery,
  uploadAudioFileAsChatAttachment,
  uploadImageFileAsChatAttachment,
} from "../utils/userImageGallery";

const APP_HIDE_FOOTER_STORAGE_KEY = "phenomed.hideFooter";
const APP_SCALE_STORAGE_KEY = "phenomed.appScale";
const DEFAULT_APP_SCALE = 0.8;
const APP_SCALE_STEP = 0.05;

const clampAppScale = (value) => {
  const nextScale = Number(value);
  if (!Number.isFinite(nextScale) || nextScale <= 0) {
    return DEFAULT_APP_SCALE;
  }

  return Math.round(nextScale * 100) / 100;
};

const normalizeScaleEntries = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => {
      const rawElement = String(entry?.element || "").trim();
      const element =
        rawElement === "Home_Noga_studysessions_article"
          ? "Home_Noga_article"
          : rawElement;
      const scaleNum = Number(entry?.scaleNum);

      if (!element) {
        return null;
      }

      return {
        element,
        scaleNum: clampAppScale(scaleNum),
      };
    })
    .filter(Boolean);

const getSettingsUi = (value) => {
  const settings = value && typeof value === "object" ? value : {};
  const ui = settings.ui && typeof settings.ui === "object" ? settings.ui : {};

  return {
    ...ui,
    scale: normalizeScaleEntries(ui.scale ?? settings.scale),
  };
};

const normalizeAppSettings = (value) => {
  const settings = value && typeof value === "object" ? value : {};

  return {
    ...settings,
    ui: getSettingsUi(settings),
  };
};

const getScaleValueForElement = (scaleEntries, elementId) => {
  const normalizedElementId = String(elementId || "").trim();
  if (!normalizedElementId) {
    return null;
  }

  const scaleEntry = normalizeScaleEntries(scaleEntries).find(
    (entry) => String(entry?.element || "").trim() === normalizedElementId,
  );

  return scaleEntry ? clampAppScale(scaleEntry.scaleNum) : null;
};

const appendMediaVersionParam = (url, version) => {
  const normalizedUrl = String(url || "").trim();
  const normalizedVersion = String(version || "").trim();

  if (!normalizedUrl || !normalizedVersion) {
    return normalizedUrl;
  }

  try {
    const nextUrl = new URL(normalizedUrl);
    nextUrl.searchParams.set("vprof", normalizedVersion);
    return nextUrl.toString();
  } catch {
    const joiner = normalizedUrl.includes("?") ? "&" : "?";
    return `${normalizedUrl}${joiner}vprof=${encodeURIComponent(normalizedVersion)}`;
  }
};

const resolveProfilePictureStateUrl = (requestedProfilePicture, fallbackUrl = "") => {
  if (
    requestedProfilePicture &&
    typeof requestedProfilePicture === "object" &&
    !Array.isArray(requestedProfilePicture)
  ) {
    const nextUrl = String(
      requestedProfilePicture.url || requestedProfilePicture.secure_url || "",
    ).trim();
    const nextVersion =
      String(requestedProfilePicture.contentHash || "").trim() ||
      String(requestedProfilePicture.assetId || requestedProfilePicture.asset_id || "").trim() ||
      String(requestedProfilePicture.updatedAt || "").trim() ||
      String(requestedProfilePicture.publicId || requestedProfilePicture.public_id || "").trim();

    return appendMediaVersionParam(nextUrl, nextVersion) || nextUrl;
  }

  return String(requestedProfilePicture || fallbackUrl || "").trim();
};

const LazyStudyPlanner = React.lazy(
  () => import("./SubApps/StudyPlannner/StudyPlanner"),
);
const LazyNogaPlan = React.lazy(() => import("../NogaPlan/NogaPlanner.jsx"));
const LazyPhenomedECG = React.lazy(
  () => import("./SubApps/PhenomedECG/PhenomedECG"),
);
const LazyPdfReaderPage = React.lazy(() => import("../PdfReaderPage.jsx"));
const LazyTelegramControlPage = React.lazy(
  () => import("../TelegramControlPage.jsx"),
);
const LazyJamendoPlayer = React.lazy(() => import("../JamendoPlayer.jsx"));
const LazyProfile = React.lazy(() => import("../Profile/Profile.jsx"));
const RESERVED_PROFILE_ROUTE_SEGMENTS = new Set([
  "home",
  "study",
  "ecg",
  "schoolplanner",
  "nogaplan",
  "pdf-reader",
  "telegram-control",
  "jamendo-player",
  "deezer-player",
  "soundcloud-player",
]);
const LazyStudy = React.lazy(
  () => import("./SubApps/StudyPlannner/components/Study/Study"),
);
//...........component..................
class App extends React.Component {
  //..........states...........
  constructor(props) {
    super(props);
    const storedSession = readStoredSession() || {};
    const hideFooterPreference =
      typeof window !== "undefined" &&
      window.localStorage.getItem(APP_HIDE_FOOTER_STORAGE_KEY) === "true";
    this.state = {
      my_id: storedSession.my_id || null,
      username: storedSession.username || "",
      firstname: storedSession.firstname || "",
      lastname: storedSession.lastname || "",
      email: storedSession.email || "",
      phone: storedSession.phone || "",
      bio: storedSession.bio || "",
      hometown:
        storedSession.hometown && typeof storedSession.hometown === "object"
          ? storedSession.hometown
          : { Country: "", City: "" },
      studying:
        storedSession.studying && typeof storedSession.studying === "object"
          ? storedSession.studying
          : {},
      working:
        storedSession.working && typeof storedSession.working === "object"
          ? storedSession.working
          : {},
      faculty: storedSession.faculty || "",
      program: storedSession.program || "",
      university: storedSession.university || "",
      studyYear: storedSession.studyYear || "",
      term: storedSession.term || "",
      aiProvider: storedSession.aiProvider || "openai",
      profilePicture: storedSession.profilePicture || "",
      profilePictureViewport:
        storedSession.profilePictureViewport &&
        typeof storedSession.profilePictureViewport === "object"
          ? storedSession.profilePictureViewport
          : { scale: 1, offsetX: 0, offsetY: 0 },
      homeDrawing:
        storedSession.homeDrawing &&
        typeof storedSession.homeDrawing === "object"
          ? storedSession.homeDrawing
          : { draftPaths: [], appliedPaths: [], textItems: [] },
      imageGallery: Array.isArray(storedSession.imageGallery)
        ? storedSession.imageGallery
        : [],
      bioWrapperWallpaper:
        typeof storedSession.bioWrapperWallpaper === "string"
          ? storedSession.bioWrapperWallpaper
          : "",
      bioWrapperWallpaperSize: Number(storedSession.bioWrapperWallpaperSize) || 520,
      bioWrapperWallpaperRepeat:
        storedSession.bioWrapperWallpaperRepeat !== undefined
          ? Boolean(storedSession.bioWrapperWallpaperRepeat)
          : true,
      dob: storedSession.dob || null,
      token: storedSession.token || "",
      settings: normalizeAppSettings(storedSession.settings),
      appScale:
        typeof window !== "undefined"
          ? getScaleValueForElement(
              normalizeAppSettings(storedSession.settings).ui.scale,
              "app_page",
            ) ??
            clampAppScale(window.localStorage.getItem(APP_SCALE_STORAGE_KEY))
          : DEFAULT_APP_SCALE,
      isLoggedIn: Boolean(
        storedSession.isLoggedIn ?? storedSession.isConnected ?? true,
      ),
      isConnected: Boolean(storedSession.isConnected ?? true),
      isOnline: false,
      friends: Array.isArray(storedSession.friends)
        ? storedSession.friends
        : [],
      friendLocalStatusById:
        storedSession.friendLocalStatusById &&
        typeof storedSession.friendLocalStatusById === "object"
          ? storedSession.friendLocalStatusById
          : {},
      friend_requests: Array.isArray(storedSession.friend_requests)
        ? storedSession.friend_requests
        : [],
      sent_friend_requests: Array.isArray(storedSession.sent_friend_requests)
        ? storedSession.sent_friend_requests
        : [],
      rejected_users: Array.isArray(storedSession.rejected_users)
        ? storedSession.rejected_users
        : [],
      chat: [],
      chatLastReadAtByFriendId:
        storedSession.chatLastReadAtByFriendId &&
        typeof storedSession.chatLastReadAtByFriendId === "object"
          ? storedSession.chatLastReadAtByFriendId
          : {},
      posts: Array.isArray(storedSession.posts) ? storedSession.posts : [],
      lectures: Array.isArray(storedSession.lectures)
        ? storedSession.lectures
        : [],
      app_is_loading: false,
      friend_target: null,
      friendID_selected: null,
      activeChatFriendId: null,
      activeChatFriendName: "",
      isChatting: false,
      isSendingMessage: false,
      searching_on: false,
      friendsPosts_retrieved: false,
      retrievingFriendsPosts_DONE: false,
      visitLogRefreshToken: 0,
      timer: {
        hours: 0,
        mins: 0,
        secs: 0,
      },
      login_record: [],
      profile: false,
      friendAddedSuccessfully: null,
      posts_updated: false,
      posts_deleted: false,
      image: null,
      server_answer: "NO NEW SERVER REPLY",
      has_active_server_reply: false,
      backend_health_status: "checking",
      ai_connection_statuses: {
        openai: "checking",
        groq: "checking",
        gemini: "checking",
        kimi: "checking",
        telegram: "checking",
        cloudinary: "checking",
      },
      planner_music: getPlannerMusicSnapshot(),
      hide_app_footer: hideFooterPreference,
      global_call_request: null,
      global_call_session: null,
      activeSubAppPresenceMode: "",
    };
  }
  serverReplyTimeout = null;
  serverReplyAudioContext = null;
  realtimeSocket = null;
  backendHealthPollInterval = null;
  userInfoPollInterval = null;
  sessionHeartbeatInterval = null;
  isUnmounted = false;
  backendHealthAbortController = null;
  userInfoAbortController = null;
  userInfoRequestPromise = null;
  userInfoRefreshQueued = false;
  userInfoRequestVersion = 0;
  latestAppliedUserInfoVersion = 0;
  lastUserInfoFetchAt = 0;
  minUserInfoRefreshIntervalMs = 2500;
  lastPresenceStatusValue = "";
  friendChatPresenceById = new Map();
  friendTypingPresenceById = new Map();
  friendLocalStatusClearTimersById = new Map();
  friendLocalStatusClearDelayMs = 2000;
  ////////////////////////////////////////Variables//////////////
  // posts = [];
  // lectures = [];
  memory = {
    courses: [],
  };
  /////////////////////////////////////////////////////Lifecycle//////////////////////////
  componentDidMount() {
    this.isUnmounted = false;
    const storedSession = readStoredSession() || {};
    this.safeSetState({
      my_id: storedSession.my_id || null,
      username: storedSession.username || "",
      firstname: storedSession.firstname || "",
      lastname: storedSession.lastname || "",
      email: storedSession.email || "",
      phone: storedSession.phone || "",
      bio: storedSession.bio || "",
      hometown:
        storedSession.hometown && typeof storedSession.hometown === "object"
          ? storedSession.hometown
          : { Country: "", City: "" },
      studying:
        storedSession.studying && typeof storedSession.studying === "object"
          ? storedSession.studying
          : {},
      working:
        storedSession.working && typeof storedSession.working === "object"
          ? storedSession.working
          : {},
      faculty: storedSession.faculty || "",
      program: storedSession.program || "",
      university: storedSession.university || "",
      studyYear: storedSession.studyYear || "",
      term: storedSession.term || "",
      aiProvider: storedSession.aiProvider || "openai",
      profilePicture: storedSession.profilePicture || "",
      profilePictureViewport:
        storedSession.profilePictureViewport &&
        typeof storedSession.profilePictureViewport === "object"
          ? storedSession.profilePictureViewport
          : { scale: 1, offsetX: 0, offsetY: 0 },
      imageGallery: Array.isArray(storedSession.imageGallery)
        ? storedSession.imageGallery
        : [],
      bioWrapperWallpaper:
        typeof storedSession.bioWrapperWallpaper === "string"
          ? storedSession.bioWrapperWallpaper
          : "",
      bioWrapperWallpaperSize: Number(storedSession.bioWrapperWallpaperSize) || 520,
      bioWrapperWallpaperRepeat:
        storedSession.bioWrapperWallpaperRepeat !== undefined
          ? Boolean(storedSession.bioWrapperWallpaperRepeat)
          : true,
      dob: storedSession.dob || null,
      token: storedSession.token || "",
    });
    this.updateUserInfo();
    this.connectRealtime();
    this.syncPresenceStatus({
      force: true,
    });
    warmSharedPlannerMusic().catch(() => null);
    this.pollBackendHealth();
    this.backendHealthPollInterval = window.setInterval(
      this.pollBackendHealth,
      30000,
    );
    this.userInfoPollInterval = window.setInterval(() => {
      this.updateUserInfo({ force: true });
    }, 45000);
    this.startSessionHeartbeat();
    window.addEventListener(
      "planner-music-session-change",
      this.handlePlannerMusicSessionChange,
    );
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    this.applyScaleSettingsToDom(this.state.settings?.ui?.scale);
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.my_id && this.state.my_id) {
      this.startSessionHeartbeat();
      this.updateUserInfo();
      this.connectRealtime();
    }

    if (
      this.state.friendID_selected &&
      (prevState.chat !== this.state.chat ||
        prevState.friendID_selected !== this.state.friendID_selected)
    ) {
      this.RetrievingMySendingMessages(this.state.friendID_selected);
    }

    if (
      prevState.isChatting !== this.state.isChatting ||
      prevState.activeChatFriendId !== this.state.activeChatFriendId ||
      prevState.global_call_session !== this.state.global_call_session ||
      prevState.activeSubAppPresenceMode !==
        this.state.activeSubAppPresenceMode
    ) {
      this.syncPresenceStatus({
      });
    }

    if (prevState.settings !== this.state.settings) {
      this.applyScaleSettingsToDom(this.state.settings?.ui?.scale);
    }
  }
  componentWillUnmount() {
    this.isUnmounted = true;
    window.removeEventListener(
      "planner-music-session-change",
      this.handlePlannerMusicSessionChange,
    );
    window.removeEventListener("pagehide", this.handlePageHide);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    if (this.serverReplyTimeout) {
      window.clearTimeout(this.serverReplyTimeout);
      this.serverReplyTimeout = null;
    }
    if (this.serverReplyAudioContext) {
      this.serverReplyAudioContext.close().catch(() => null);
      this.serverReplyAudioContext = null;
    }
    if (this.realtimeSocket) {
      this.realtimeSocket.disconnect();
      this.realtimeSocket = null;
    }
    if (this.backendHealthPollInterval) {
      window.clearInterval(this.backendHealthPollInterval);
      this.backendHealthPollInterval = null;
    }
    if (this.userInfoPollInterval) {
      window.clearInterval(this.userInfoPollInterval);
      this.userInfoPollInterval = null;
    }
    if (this.sessionHeartbeatInterval) {
      window.clearInterval(this.sessionHeartbeatInterval);
      this.sessionHeartbeatInterval = null;
    }
    if (this.backendHealthAbortController) {
      this.backendHealthAbortController.abort();
      this.backendHealthAbortController = null;
    }
    if (this.userInfoAbortController) {
      this.userInfoAbortController.abort();
      this.userInfoAbortController = null;
    }
    this.friendLocalStatusClearTimersById.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    this.friendLocalStatusClearTimersById.clear();
    this.userInfoRequestPromise = null;
    this.userInfoRefreshQueued = false;
    // if (this.props.path === "/") {
    //   this.availableToChat(false);
    // }
  }

  safeSetState = (updater, callback) => {
    if (this.isUnmounted) {
      return;
    }

    this.setState(updater, callback);
  };

  handlePlannerMusicSessionChange = (event) => {
    const nextSnapshot = event?.detail || getPlannerMusicSnapshot();

    this.safeSetState((currentState) => {
      const currentSnapshot = currentState.planner_music || {};

      if (
        currentSnapshot.isReady === nextSnapshot.isReady &&
        currentSnapshot.isPlaying === nextSnapshot.isPlaying &&
        currentSnapshot.trackTitle === nextSnapshot.trackTitle &&
        currentSnapshot.trackArtist === nextSnapshot.trackArtist &&
        currentSnapshot.volume === nextSnapshot.volume
      ) {
        return null;
      }

      return {
        planner_music: {
          ...currentSnapshot,
          isReady: nextSnapshot.isReady,
          isPlaying: nextSnapshot.isPlaying,
          trackTitle: nextSnapshot.trackTitle,
          trackArtist: nextSnapshot.trackArtist,
          volume: nextSnapshot.volume,
        },
      };
    });
  };

  handlePageHide = () => {
    if (this.state?.activeChatFriendId) {
      this.updateMyChatPresence(this.state.activeChatFriendId, false);
      this.updateMyTypingPresence(this.state.activeChatFriendId, false);
    }

    this.sendOfflinePresenceBeacon();

    logoutStoredSession({
      clear: false,
      tokenless: false,
    });
  };

  handleBeforeUnload = () => {
    if (this.state?.activeChatFriendId) {
      this.updateMyChatPresence(this.state.activeChatFriendId, false);
      this.updateMyTypingPresence(this.state.activeChatFriendId, false);
    }

    this.sendOfflinePresenceBeacon();

    logoutStoredSession({
      clear: false,
      tokenless: false,
    });
  };

  handleSubAppPresenceChange = (nextPresenceMode = "") => {
    const normalizedPresenceMode = String(nextPresenceMode || "")
      .trim()
      .toLowerCase();
    const nextValue = normalizedPresenceMode === "studying" ? "studying" : "";

    if (this.state.activeSubAppPresenceMode === nextValue) {
      return;
    }

    this.safeSetState(
      {
        activeSubAppPresenceMode: nextValue,
      },
      () => {
        this.syncPresenceStatus({
        });
      },
    );
  };

  getDesiredPresenceStatusValue = () => {
    if (!this.state?.my_id) {
      return "offline";
    }

    if (this.state?.global_call_session) {
      return "busy";
    }

    if (this.state?.isChatting && this.state?.activeChatFriendId) {
      return "busy";
    }

    if (this.state?.activeSubAppPresenceMode === "studying") {
      return "studying";
    }

    return "online";
  };

  syncPresenceStatus = ({
    statusValue = null,
    force = false,
    keepalive = false,
  } = {}) => {
    if (!this.state?.my_id || typeof fetch !== "function") {
      return Promise.resolve(null);
    }

    const nextStatusValue = String(
      statusValue || this.getDesiredPresenceStatusValue(),
    )
      .trim()
      .toLowerCase();
    const normalizedStatusValue = ["online", "busy", "studying", "offline"].includes(
      nextStatusValue,
    )
      ? nextStatusValue
      : this.getDesiredPresenceStatusValue();

    if (!force && this.lastPresenceStatusValue === normalizedStatusValue) {
      return Promise.resolve(normalizedStatusValue);
    }

    this.lastPresenceStatusValue = normalizedStatusValue;

    const requestOptions = {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...(this.state?.token
          ? {
              Authorization: `Bearer ${this.state.token}`,
            }
          : {}),
      },
      keepalive: Boolean(keepalive),
      body: JSON.stringify({
        statusValue: normalizedStatusValue,
      }),
    };

    return fetch(apiUrl(`/api/user/isOnline/${this.state.my_id}`), requestOptions)
      .then(() => normalizedStatusValue)
      .catch(() => normalizedStatusValue);
  };

  sendOfflinePresenceBeacon = () => {
    if (!this.state?.my_id || typeof navigator === "undefined") {
      return false;
    }

    const endpoint = apiUrl(`/api/user/isOnline/${this.state.my_id}`);
    const payload = JSON.stringify({
      statusValue: "offline",
    });

    if (typeof navigator.sendBeacon === "function") {
      try {
        return navigator.sendBeacon(
          endpoint,
          new Blob([payload], {
            type: "application/json",
          }),
        );
      } catch {
        // Fall through to the keepalive fetch fallback below.
      }
    }

    fetch(endpoint, {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: payload,
    }).catch(() => null);

    return true;
  };

  sendSessionHeartbeat = () => {
    return this.syncPresenceStatus({
      statusValue: this.getDesiredPresenceStatusValue(),
      force: true,
      keepalive: true,
    });
  };

  startSessionHeartbeat = () => {
    if (this.sessionHeartbeatInterval || !this.state?.my_id) {
      return;
    }

    this.sendSessionHeartbeat();
    this.sessionHeartbeatInterval = window.setInterval(() => {
      this.sendSessionHeartbeat();
    }, 30000);
  };

  pollBackendHealth = () => {
    if (this.backendHealthAbortController) {
      this.backendHealthAbortController.abort();
    }

    this.backendHealthAbortController = new AbortController();

    fetch(apiUrl("/api/health"), {
      method: "GET",
      headers: this.state.token
        ? {
            Authorization: `Bearer ${this.state.token}`,
          }
        : undefined,
      signal: this.backendHealthAbortController.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        const nextStatus = String(payload?.status || "")
          .trim()
          .toLowerCase();

        if (!response.ok) {
          throw new Error(nextStatus || "offline");
        }

        this.safeSetState({
          backend_health_status: nextStatus || "healthy",
          ai_connection_statuses: {
            openai: String(payload?.ai?.openai || "offline")
              .trim()
              .toLowerCase(),
            groq: String(payload?.ai?.groq || "offline")
              .trim()
              .toLowerCase(),
            gemini: String(payload?.ai?.gemini || "offline")
              .trim()
              .toLowerCase(),
            kimi: String(payload?.ai?.kimi || "offline")
              .trim()
              .toLowerCase(),
            telegram: String(payload?.ai?.telegram || "offline")
              .trim()
              .toLowerCase(),
            cloudinary: String(payload?.ai?.cloudinary || "offline")
              .trim()
              .toLowerCase(),
          },
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }

        this.safeSetState({
          backend_health_status: "offline",
          ai_connection_statuses: {
            openai: "offline",
            groq: "offline",
            gemini: "offline",
            kimi: "offline",
            telegram: "offline",
            cloudinary: "offline",
          },
        });
      });
  };

  //......MAKE YOURSELF AVAILABLE TO CHAT......
  connectRealtime = () => {
    if (this.realtimeSocket || !this.state.my_id) {
      return;
    }

    this.realtimeSocket = connectRealtime({
      userId: this.state.my_id,
      onUserRefresh: (payload = {}) => {
        if (
          String(payload?.reason || "").trim().toLowerCase() ===
            "connection:changed" &&
          String(payload?.targetUserId || "").trim() ===
            String(this.state.my_id || "").trim() &&
          payload?.friendId &&
          payload?.localStatus
        ) {
          this.applyFriendLocalStatusFromBackend(
            payload.friendId,
            payload.localStatus,
            new Date(),
          );
        }

        this.updateUserInfo({ force: true });
      },
      onChatPresence: (payload) => {
        this.handleFriendChatPresence(payload || {});
      },
      onTypingPresence: (payload) => {
        this.handleFriendTypingPresence(payload || {});
      },
      onChatRead: ({ friendId }) => {
        this.handleChatRead({
          friendId,
        });
      },
      onVisitLog: ({ visitLog }) => {
        if (this.state.username !== "rudyhamame" || !visitLog) {
          return;
        }

        this.safeSetState({
          visitLogRefreshToken: Date.now(),
        });

        const visitedAt = new Date(visitLog.visitedAt);
        const visitTimeLabel = `${visitedAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })} ${visitedAt.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`;

        this.serverReply(
          `New visit detected from ${visitLog.ip || "Unknown IP"} at ${visitTimeLabel}`,
        );

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          new window.Notification("New visit detected", {
            body: `${visitLog.ip || "Unknown IP"} at ${visitTimeLabel}`,
          });
        }
      },
      onConnected: () => {
        if (this.state.isChatting && this.state.activeChatFriendId) {
          this.updateMyChatPresence(this.state.activeChatFriendId, true);
        }

        this.syncPresenceStatus({
          force: true,
        });

        if (
          this.state.username === "rudyhamame" &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "default"
        ) {
          window.Notification.requestPermission().catch(() => null);
        }
      },
    });
  };

  updateMyChatPresence = (friendId, isChatting) => {
    if (!this.realtimeSocket || !this.state.my_id || !friendId) {
      return;
    }

    this.realtimeSocket.emit("user:chat-status", {
      userId: this.state.my_id,
      friendId,
      isChatting,
    });
  };

  updateMyTypingPresence = (friendId, isTyping) => {
    if (!this.realtimeSocket || !this.state.my_id || !friendId) {
      return;
    }

    this.realtimeSocket.emit("user:typing-status", {
      userId: this.state.my_id,
      friendId,
      isTyping,
    });
  };

  getLocalStatusTimestamp = (localStatus) => {
    const rawValue =
      localStatus?.updatedAt ||
      localStatus?.lastTypingAt ||
      localStatus?.lastChatAt ||
      null;

    if (!rawValue) {
      return 0;
    }

    const timestamp = new Date(rawValue).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  clearFriendLocalStatusTimer = (friendId) => {
    const normalizedFriendId = String(friendId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    const existingTimer =
      this.friendLocalStatusClearTimersById.get(normalizedFriendId);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
      this.friendLocalStatusClearTimersById.delete(normalizedFriendId);
    }
  };

  scheduleFriendLocalStatusClear = (friendId) => {
    const normalizedFriendId = String(friendId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    this.clearFriendLocalStatusTimer(normalizedFriendId);

    const timerId = window.setTimeout(() => {
      this.friendLocalStatusClearTimersById.delete(normalizedFriendId);

      const stillTyping = Boolean(
        this.friendTypingPresenceById.get(normalizedFriendId),
      );
      const stillChatting = Boolean(
        this.friendChatPresenceById.get(normalizedFriendId),
      );

      if (stillTyping) {
        this.applyFriendLocalStatusFromBackend(
          normalizedFriendId,
          "typing",
          new Date(),
        );
        return;
      }

      if (stillChatting) {
        this.applyFriendLocalStatusFromBackend(
          normalizedFriendId,
          "in my chat",
          new Date(),
        );
        return;
      }

      this.applyFriendLocalStatusFromBackend(normalizedFriendId, null, new Date());
    }, this.friendLocalStatusClearDelayMs);

    this.friendLocalStatusClearTimersById.set(normalizedFriendId, timerId);
  };

  applyFriendLocalStatusFromBackend = (friendId, value, updatedAt = new Date()) => {
    const normalizedFriendId = String(friendId || "").trim();
    const normalizedValue = String(value || "").trim().toLowerCase();
    const nextValue = ["in my chat", "typing"].includes(normalizedValue)
      ? normalizedValue
      : null;

    if (!normalizedFriendId) {
      return;
    }

    this.safeSetState((prevState) => ({
      friendLocalStatusById: {
        ...(prevState.friendLocalStatusById || {}),
        [normalizedFriendId]: {
          value: nextValue,
          updatedAt,
          lastChatAt:
            nextValue === "in my chat"
              ? updatedAt
              : prevState.friendLocalStatusById?.[normalizedFriendId]?.lastChatAt ||
                null,
          lastTypingAt:
            nextValue === "typing"
              ? updatedAt
              : prevState.friendLocalStatusById?.[normalizedFriendId]?.lastTypingAt ||
                null,
        },
      },
      friends: Array.isArray(prevState.friends)
        ? prevState.friends.map((friend) => {
            const candidateId = String(
              friend?._id || friend?.id || friend?.userID || friend?.chatId || "",
            ).trim();

            if (candidateId !== normalizedFriendId) {
              return friend;
            }

            const currentLocalStatus =
              friend?.localStatus && typeof friend.localStatus === "object"
                ? friend.localStatus
                : {};

            return {
              ...friend,
              localStatus: {
                ...currentLocalStatus,
                value: nextValue,
                updatedAt,
                lastChatAt:
                  nextValue === "in my chat"
                    ? updatedAt
                    : currentLocalStatus?.lastChatAt || null,
                lastTypingAt:
                  nextValue === "typing"
                    ? updatedAt
                    : currentLocalStatus?.lastTypingAt || null,
              },
            };
          })
        : prevState.friends,
    }));
  };

  handleFriendChatPresence = ({ userId, isChatting }) => {
    const normalizedFriendId = String(userId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    this.friendChatPresenceById.set(normalizedFriendId, Boolean(isChatting));
    if (isChatting) {
      this.clearFriendLocalStatusTimer(normalizedFriendId);
    }

    this.applyFriendLocalStatusFromBackend(
      normalizedFriendId,
      isChatting ? "in my chat" : null,
      new Date(),
    );
  };

  handleFriendTypingPresence = ({ userId, isTyping }) => {
    const normalizedFriendId = String(userId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    this.friendTypingPresenceById.set(normalizedFriendId, Boolean(isTyping));
    if (isTyping) {
      this.clearFriendLocalStatusTimer(normalizedFriendId);
    }

    if (isTyping) {
      this.applyFriendLocalStatusFromBackend(
        normalizedFriendId,
        "typing",
        new Date(),
      );
      return;
    }

    if (this.friendChatPresenceById.get(normalizedFriendId)) {
      this.applyFriendLocalStatusFromBackend(
        normalizedFriendId,
        "in my chat",
        new Date(),
      );
      return;
    }

    this.scheduleFriendLocalStatusClear(normalizedFriendId);
  };

  markMessagesRead = (friendId) => {
    const normalizedFriendId = String(friendId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    const currentChat = Array.isArray(this.state.chat) ? this.state.chat : [];
    const unreadIncomingMessages = currentChat.filter((message) => {
      const messageFriendId = String(message?._id || "").trim();
      const messageSender = String(message?.from || "").trim().toLowerCase();
      const messageStatus = String(message?.status || "").trim().toLowerCase();

      return (
        messageFriendId === normalizedFriendId &&
        messageSender !== "me" &&
        !message?.deleted &&
        messageStatus !== "read"
      );
    });

    const hasUnreadIncomingMessages = unreadIncomingMessages.length > 0;
    const latestReadAtIso = new Date(
      unreadIncomingMessages.reduce((latestTimestamp, message) => {
        const messageTimestamp = new Date(message?.date || 0).getTime();
        return Number.isFinite(messageTimestamp) && messageTimestamp > latestTimestamp
          ? messageTimestamp
          : latestTimestamp;
      }, Date.now()),
    ).toISOString();

    this.safeSetState((prevState) => ({
      chat: (Array.isArray(prevState.chat) ? prevState.chat : []).map((message) => {
        const messageFriendId = String(message?._id || "").trim();
        const messageSender = String(message?.from || "").trim().toLowerCase();
        const messageStatus = String(message?.status || "").trim().toLowerCase();

        if (
          messageFriendId !== normalizedFriendId ||
          messageSender === "me" ||
          message?.deleted ||
          messageStatus === "read"
        ) {
          return message;
        }

        return {
          ...message,
          status: "read",
        };
      }),
      chatLastReadAtByFriendId: {
        ...(prevState.chatLastReadAtByFriendId || {}),
        [normalizedFriendId]: latestReadAtIso,
      },
    }), () => {
      this.persistStoredSession({
        chatLastReadAtByFriendId: this.state.chatLastReadAtByFriendId,
      });
    });

    if (!this.realtimeSocket || !this.state.my_id || !hasUnreadIncomingMessages) {
      return;
    }

    this.realtimeSocket.emit("user:message-read", {
      userId: this.state.my_id,
      friendId: normalizedFriendId,
    });
  };

  handleChatRead = ({ friendId, readerUserId }) => {
    const normalizedFriendId = String(readerUserId || friendId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    this.safeSetState((prevState) => ({
      chat: (Array.isArray(prevState.chat) ? prevState.chat : []).map(
        (message) => {
          if (
            String(message?._id || "").trim() !== normalizedFriendId ||
            String(message?.from || "").trim() !== "me" ||
            String(message?.status || "")
              .trim()
              .toLowerCase() === "read"
          ) {
            return message;
          }

          return {
            ...message,
            status: "read",
          };
        },
      ),
    }));
  };

  getRealtimeSocket = () => this.realtimeSocket;

  requestGlobalCall = ({ friendId, friendName, mode }) => {
    const normalizedFriendId = String(friendId || "").trim();

    if (!normalizedFriendId) {
      return;
    }

    this.safeSetState({
      global_call_request: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        friendId: normalizedFriendId,
        friendName: String(friendName || "").trim(),
        mode: mode === "video" ? "video" : "audio",
      },
    });
  };

  handleGlobalCallRequestHandled = (requestId) => {
    this.safeSetState((currentState) => {
      if (currentState.global_call_request?.id !== requestId) {
        return null;
      }

      return {
        global_call_request: null,
      };
    });
  };

  handleGlobalCallSessionChange = (session) => {
    this.safeSetState({
      global_call_session:
        session && typeof session === "object" ? session : null,
    }, () => {
      this.syncPresenceStatus({
      });
    });
  };

  availableToChat = (isLoggedIn) => {
    return Promise.resolve({ isLoggedIn: Boolean(isLoggedIn) });
  };

  //......END OF MAKE YOURSELF AVAILABLE TO CHAT......

  //............................................Retrieving Area..........................................................................
  posts_alreadyBuilt = [];
  posts_comments = [];
  BuildingPosts = () => {
    console.log(this.state.posts_alreadyBuilt);
    let ul = document.getElementById("MountPosts_content_container");
    // if (this.state.posts.length > 0) {
    //   this.state.posts.sort((a, b) => {
    //     return new Date(b.date) - new Date(a.date);
    //   });
    // }
    for (var i = 0; i < this.state.posts.length; i++) {
      console.log(this.state.posts);
      if (
        this.state.posts[i]._id !== this.state.posts_alreadyBuilt[i] ||
        (this.state.posts[i]._id === this.state.posts_alreadyBuilt[i] &&
          this.state.posts[i].comments.length !==
            this.state.posts_comments[i]) ||
        this.state.posts_deleted
      ) {
        if (
          this.state.posts[i]._id === this.state.posts_alreadyBuilt[i] &&
          this.state.posts[i].comments.length !== this.state.posts_comments[i]
        ) {
          let commentlist_ul = document.getElementById(
            "commentlist_ul" + this.state.posts[i]._id,
          );
          if (this.state.posts[i].comments.length === 1) {
            let commentlist_ul = document.createElement("ul");
            commentlist_ul.setAttribute(
              "id",
              "commentlist_ul" + this.state.posts[i]._id,
            );
            commentlist_ul.setAttribute("class", "fc commentlist_ul");
            let comments_div = document.getElementById(
              "commentDiv" + this.state.posts[i]._id,
            );
            let li = document.createElement("li");
            li.setAttribute("class", "comment_li");
            li.textContent =
              this.state.posts[i].comments[
                this.state.posts[i].comments.length - 1
              ];
            commentlist_ul.prepend(li);
            comments_div.appendChild(commentlist_ul);
            this.state.posts_comments[i] = this.state.posts[i].comments.length;
          } else {
            let li = document.createElement("li");
            li.setAttribute("class", "comment_li");
            li.textContent =
              this.state.posts[i].comments[
                this.state.posts[i].comments.length - 1
              ];
            commentlist_ul.prepend(li);
            this.state.posts_comments[i] = this.state.posts[i].comments.length;
          }
        } else {
          this.safeSetState({
            app_is_loading: true,
          });
          let date_p = document.createElement("p");
          let category_p = document.createElement("p");
          let subject_p = document.createElement("p");
          let reference_p = document.createElement("p");
          let page_p = document.createElement("p");
          let li = document.createElement("li");
          let details_div = document.createElement("div");
          let note_options_div = document.createElement("div");
          //.............................comments.......................

          //............date.................................
          let date = this.state.posts[i].date;
          let date_timezone = new Date(date);
          let date_string = date_timezone.toDateString();
          let time_string = date_timezone.toLocaleTimeString();
          //.............................................
          //...............................note..................................
          let note_p = document.createElement("p");
          note_p.textContent = this.state.posts[i].note;
          note_p.setAttribute("class", "note_p");
          note_options_div.setAttribute("class", "fr note_options_div");
          note_options_div.setAttribute("id", "note_options_div" + i);
          note_options_div.appendChild(note_p);
          //.......................Options....................................
          let options_div = document.createElement("div");
          //............................Poster name.......................
          let postername_p = document.createElement("p");
          postername_p.setAttribute("class", "postername_p");
          details_div.appendChild(postername_p);
          //..................................

          if (this.state.posts[i].id === this.state.my_id) {
            postername_p.textContent = "Mine";
            let p_delete = document.createElement("p");
            let p_edit = document.createElement("p");
            p_delete.style.cursor = "pointer";
            p_edit.style.cursor = "pointer";
            p_delete.textContent = "Delete";
            p_edit.textContent = "Edit";
            options_div.appendChild(p_delete);
            options_div.appendChild(p_edit);
            p_delete.addEventListener("click", () => {
              this.deletePost(options_div.id);
            });

            p_edit.addEventListener("click", () =>
              this.editPost(options_div.id),
            );
            note_options_div.appendChild(options_div);
            options_div.setAttribute(
              "class",
              "fc MountPosts_postOptionsContainer",
            );
            options_div.setAttribute("id", this.state.posts[i]._id);
          } else {
            postername_p.textContent =
              this.state.posts[i].firstname +
              " " +
              this.state.posts[i].lastname;
          }
          //........................................................................

          //.....................................................................
          li.className = "fc";

          date_p.innerHTML =
            "<i class='far fa-clock'></i>" +
            "  " +
            date_string +
            ", " +
            time_string;
          category_p.textContent = "System: " + this.state.posts[i].category;
          subject_p.textContent = "Discipline: " + this.state.posts[i].subject;
          reference_p.textContent =
            "Reference: " + this.state.posts[i].reference;
          page_p.textContent = "Page #: " + this.state.posts[i].page_num;
          date_p.className = "MountPosts_date";
          details_div.appendChild(date_p);
          details_div.appendChild(category_p);
          details_div.appendChild(subject_p);
          details_div.setAttribute("class", "fr details_div");
          //...................comments...............
          let comments_div = document.createElement("div");
          let comment_input = document.createElement("input");
          let commentlist_ul = document.createElement("ul");
          comments_div.appendChild(comment_input);
          comments_div.setAttribute("class", "fc comments_div");
          comments_div.setAttribute(
            "id",
            "commentDiv" + this.state.posts[i]._id,
          );
          comment_input.setAttribute(
            "id",
            "comment_input" + this.state.posts[i]._id,
          );
          comment_input.setAttribute("class", "comment_input");
          commentlist_ul.setAttribute(
            "id",
            "commentlist_ul" + this.state.posts[i]._id,
          );
          comment_input.setAttribute("placeholder", "Enter a comment");
          comment_input.addEventListener("keypress", (event) => {
            this.postComment(event, comments_div.id, comment_input.id);
          });
          this.state.posts[i].comments.forEach((comment) => {
            let comment_li = document.createElement("li");
            comment_li.textContent = comment;
            comment_li.setAttribute("class", "comment_li");
            commentlist_ul.setAttribute("class", "fc commentlist_ul");
            commentlist_ul.prepend(comment_li);
            comments_div.appendChild(commentlist_ul);
          });
          //.....................................................

          if (
            !(
              this.state.posts[i].reference === "" &&
              this.state.posts[i].page_num !== null
            )
          ) {
            if (this.state.posts[i].reference !== "")
              details_div.appendChild(reference_p);
            if (this.state.posts[i].page_num !== null)
              details_div.appendChild(page_p);
          }
          li.setAttribute("id", "li" + this.state.posts[i]._id);
          li.appendChild(details_div);
          li.appendChild(note_options_div);
          li.appendChild(comments_div);
          ul.appendChild(li);
          this.state.posts_alreadyBuilt[i] = this.state.posts[i]._id;
          this.state.posts_comments[i] = this.state.posts[i].comments.length;
          this.safeSetState({
            app_is_loading: false,
            //   posts_updated: true,
          });
        }
      }

      // if (this.state.posts.length < this.state.posts_alreadyBuilt.length) {
      //   this.state.posts_alreadyBuilt = [];
      //   ul.innerHTML = "";
      // }
    }
  };
  //////////////////////////// Profile///////////////////////////////////////////////
  profilePosts = [];
  BuildingPostsProfile = () => {
    let ul = document.getElementById("MountPosts_content_container");
    for (var i = 0; i < this.state.posts.length; i++) {
      if (this.state.posts[i].id === this.state.my_id) {
        if (this.state.posts.length >= this.profilePosts.length) {
          if (this.state.posts[i]._id !== this.profilePosts[i]) {
            if (
              this.state.posts[i]._id === this.profilePosts[i] &&
              this.state.posts[i].comments.length !==
                this.state.posts_comments[i]
            ) {
              let commentlist_ul = document.getElementById(
                "commentlist_ul" + this.state.posts[i]._id,
              );
              if (this.state.posts[i].comments.length === 1) {
                let commentlist_ul = document.createElement("ul");
                commentlist_ul.setAttribute(
                  "id",
                  "commentlist_ul" + this.state.posts[i]._id,
                );
                commentlist_ul.setAttribute("class", "fc commentlist_ul");
                let comments_div = document.getElementById(
                  "commentDiv" + this.state.posts[i]._id,
                );
                let li = document.createElement("li");
                li.setAttribute("class", "comment_li");
                li.textContent =
                  this.state.posts[i].comments[
                    this.state.posts[i].comments.length - 1
                  ];
                commentlist_ul.prepend(li);
                comments_div.appendChild(commentlist_ul);
                this.state.posts_comments[i] =
                  this.state.posts[i].comments.length;
              } else {
                let li = document.createElement("li");
                li.setAttribute("class", "comment_li");
                li.textContent =
                  this.state.posts[i].comments[
                    this.state.posts[i].comments.length - 1
                  ];
                commentlist_ul.prepend(li);
                this.state.posts_comments[i] =
                  this.state.posts[i].comments.length;
              }
            } else {
              this.safeSetState({
                app_is_loading: true,
              });
              let date_p = document.createElement("p");
              let category_p = document.createElement("p");
              let subject_p = document.createElement("p");
              let reference_p = document.createElement("p");
              let page_p = document.createElement("p");
              let li = document.createElement("li");
              let details_div = document.createElement("div");
              let note_options_div = document.createElement("div");
              //.............................comments.......................

              //............date.................................
              let date = this.state.posts[i].date;
              let date_timezone = new Date(date);
              let date_string = date_timezone.toDateString();
              let time_string = date_timezone.toLocaleTimeString();
              //.............................................
              //...............................note..................................
              let note_p = document.createElement("p");
              note_p.textContent = this.state.posts[i].note;
              note_p.setAttribute("class", "note_p");
              note_options_div.setAttribute("class", "fr note_options_div");
              note_options_div.setAttribute("id", "note_options_div" + i);
              note_options_div.appendChild(note_p);
              //.......................Options....................................
              let options_div = document.createElement("div");
              options_div.setAttribute("class", "options_div");
              //............................Poster name.......................
              let postername_p = document.createElement("p");
              postername_p.setAttribute("class", "postername_p");
              details_div.appendChild(postername_p);
              //..................................

              postername_p.textContent = "Mine";
              let p_delete = document.createElement("p");
              let p_edit = document.createElement("p");
              p_delete.style.cursor = "pointer";
              p_edit.style.cursor = "pointer";
              p_delete.textContent = "Delete";
              p_edit.textContent = "Edit";
              options_div.appendChild(p_delete);
              options_div.appendChild(p_edit);
              p_delete.addEventListener("click", () =>
                this.deletePost(options_div.id),
              );
              p_edit.addEventListener("click", () =>
                this.editPost(options_div.id),
              );
              note_options_div.appendChild(options_div);
              options_div.setAttribute(
                "class",
                "fc MountPosts_postOptionsContainer",
              );
              options_div.setAttribute("id", this.state.posts[i]._id);

              //........................................................................

              //.....................................................................
              li.className = "fc";

              date_p.innerHTML =
                "<i class='far fa-clock'></i>" +
                "  " +
                date_string +
                ", " +
                time_string;
              category_p.textContent =
                "Category: " + this.state.posts[i].category;
              subject_p.textContent = "Subject: " + this.state.posts[i].subject;
              reference_p.textContent =
                "Reference: " + this.state.posts[i].reference;
              page_p.textContent = "Page #: " + this.state.posts[i].page_num;
              date_p.className = "MountPosts_date";
              details_div.appendChild(date_p);
              details_div.appendChild(category_p);
              details_div.appendChild(subject_p);
              details_div.setAttribute("class", "fr details_div");
              //...................comments...............
              let comments_div = document.createElement("div");
              let comment_input = document.createElement("input");
              let commentlist_ul = document.createElement("ul");
              comments_div.appendChild(comment_input);
              comments_div.setAttribute("class", "fc comments_div");
              comments_div.setAttribute(
                "id",
                "commentDiv" + this.state.posts[i]._id,
              );
              comment_input.setAttribute(
                "id",
                "comment_input" + this.state.posts[i]._id,
              );
              comment_input.setAttribute("class", "comment_input");
              commentlist_ul.setAttribute(
                "id",
                "commentlist_ul" + this.state.posts[i]._id,
              );
              comment_input.setAttribute("placeholder", "Enter a comment");
              comment_input.addEventListener("keypress", (event) => {
                this.postComment(event, comments_div.id, comment_input.id);
              });
              this.state.posts[i].comments.forEach((comment) => {
                let comment_li = document.createElement("li");
                comment_li.textContent = comment;
                comment_li.setAttribute("class", "comment_li");
                commentlist_ul.setAttribute("class", "fc commentlist_ul");
                commentlist_ul.prepend(comment_li);
                comments_div.appendChild(commentlist_ul);
              });
              //.....................................................

              if (
                !(
                  this.state.posts[i].reference === "" &&
                  this.state.posts[i].page_num !== null
                )
              ) {
                if (this.state.posts[i].reference !== "")
                  details_div.appendChild(reference_p);
                if (this.state.posts[i].page_num !== null)
                  details_div.appendChild(page_p);
              }
              li.setAttribute("id", "li" + this.state.posts[i]._id);
              li.appendChild(details_div);
              li.appendChild(note_options_div);
              li.appendChild(comments_div);
              ul.prepend(li);
              this.profilePosts[i] = this.state.posts[i]._id;
              // this.state.posts_comments[i] = this.state.posts[i].comments.length;
              this.safeSetState({
                app_is_loading: false,
              });
            }
          }
        }
        // if (this.state.posts.length < this.state.posts_alreadyBuilt.length) {
        //   this.state.posts_alreadyBuilt = [];
        //   ul.innerHTML = "";
        // }
      }
    }
    if (this.profilePosts.length === 0) {
    }
  };
  ////////////////////////////////Edit Post///////////////////////////////////////////
  enableEditPost = false;
  targetIDEditPost;
  editPostControlCounter = -1;
  editPost = (post_id) => {
    this.editPostControlCounter++;
    if (this.editPostControlCounter % 2 === 0) {
      this.targetIDEditPost = post_id;
      this.state.posts.forEach((post) => {
        if (post._id === post_id) {
          document.getElementById("InputPost_textarea").value = post.note;
          document.getElementById("InputPost_category").value = post.category;
          document.getElementById("InputPost_subject").value = post.subject;
          document.getElementById("InputPost_resourse").value = post.reference;
          document.getElementById("InputPost_page").value = post.page_num;
          this.enableEditPost = true;
          document.getElementById("InputPost_post_button").innerHTML = "Edit";
          document.getElementById(post_id).children[1].textContent = "Cancel?";
          document.getElementById(post_id).children[1].style.backgroundColor =
            "var(--black)";
        }
      });
    } else {
      document.getElementById("InputPost_textarea").value = "";
      document.getElementById("InputPost_category").value = "";
      document.getElementById("InputPost_subject").value = "";
      document.getElementById("InputPost_resourse").value = "";
      document.getElementById("InputPost_page").value = "";
      this.enableEditPost = false;
      document.getElementById("InputPost_post_button").innerHTML = "Post";
      document.getElementById(post_id).children[1].style.backgroundColor =
        "var(--red)";
      document.getElementById(post_id).children[1].textContent = "Edit";
    }
  };
  ////////////////////////Post Comment/////////////////////////////
  postComment = (event, post_id, input_id) => {
    if (event.which === 13) {
      this.serverReply("Posts are disabled");
    }
  };
  //////////////////////////SEND MESSAGE TO FRIEND'S Chat////////////////////////////////
  RetrievingMySendingMessages = (friend_id) => {
    const ul = document.getElementById("Chat_messages");

    if (!ul || !friend_id) {
      return;
    }

    if (ul.dataset.reactManaged === "true") {
      ul.scrollTop = ul.scrollHeight;
      return;
    }

    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    const friendReadyToReply = Array.isArray(this.state.friends)
      ? this.state.friends.some(
          (friend) =>
            String(friend?._id || friend?.id || "").trim() ===
              String(friend_id || "").trim() &&
            String(friend?.localStatus?.value || "").trim().toLowerCase() ===
              "typing",
        )
      : false;

    ul.innerHTML = "";
    let previousDayKey = null;

    const seenDates = [];
    const chatHistory = Array.isArray(this.state.chat) ? this.state.chat : [];
    const matchingMessages = chatHistory.filter((message, index) => {
      if (seenDates[index] === message.date || friend_id !== message._id) {
        return false;
      }

      seenDates[index] = message.date;
      return true;
    });

    if (matchingMessages.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.setAttribute("id", "FriendChat_empty_state");
      emptyState.textContent = "No messages yet for this conversation.";
      ul.appendChild(emptyState);
      return;
    }

    matchingMessages.forEach((message) => {
      const text = document.createElement("p");
      const time = document.createElement("span");
      const meta = document.createElement("span");
      const status = document.createElement("span");
      const li = document.createElement("li");
      const div = document.createElement("div");
      const messageDate = new Date(message.date);
      const messageDirection = arabicPattern.test(String(message.message || ""))
        ? "rtl"
        : "ltr";
      const dayKey = Number.isNaN(messageDate.getTime())
        ? "unknown-day"
        : `${messageDate.getFullYear()}-${messageDate.getMonth()}-${messageDate.getDate()}`;
      const dayLabel = Number.isNaN(messageDate.getTime())
        ? ""
        : messageDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
      const timestamp = Number.isNaN(messageDate.getTime())
        ? ""
        : messageDate.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

      if (dayLabel && dayKey !== previousDayKey) {
        const daySeparator = document.createElement("li");
        const daySeparatorText = document.createElement("span");

        daySeparator.className = "Chat_daySeparator";
        daySeparatorText.className = "Chat_daySeparatorText";
        daySeparatorText.textContent = dayLabel;
        daySeparator.appendChild(daySeparatorText);
        ul.appendChild(daySeparator);
        previousDayKey = dayKey;
      }

      text.textContent = message.message;
      time.textContent = timestamp;
      time.className = "Chat_messageTimestamp";
      meta.className = "Chat_messageMeta";
      li.setAttribute("dir", messageDirection);
      if (message.from === "me") {
        li.setAttribute("class", "sentMessagesLI");
        div.setAttribute("class", "sentMessagesDIV fc");
        status.className = "Chat_messageStatus";

        if (message.status === "read") {
          status.textContent = "Ã¢Å“â€œÃ¢Å“â€œ";
          status.classList.add("Chat_messageStatus--read");
        } else if (message.status === "received") {
          status.textContent = "Ã¢Å“â€œÃ¢Å“â€œ";
          status.classList.add("Chat_messageStatus--received");
        } else {
          status.textContent = "Ã¢Å“â€œ";
          status.classList.add("Chat_messageStatus--sent");
        }

        if (friendReadyToReply) {
          status.classList.add("Chat_messageStatus--replying");
        }
      } else {
        li.setAttribute("class", "receivedMessagesLI");
        div.setAttribute("class", "receivedMessagesDIV fc");
      }
      li.classList.add(
        messageDirection === "rtl" ? "Chat_message--rtl" : "Chat_message--ltr",
      );

      li.appendChild(text);
      meta.appendChild(time);
      if (message.from === "me") {
        meta.appendChild(status);
      }
      li.appendChild(meta);
      div.appendChild(li);
      ul.appendChild(div);
    });

    ul.scrollTop = ul.scrollHeight;
  };

  uploadChatImages = async (files = []) => {
    const validFiles = (Array.isArray(files) ? files : [])
      .filter(Boolean)
      .filter((file) => String(file?.type || "").trim().toLowerCase().startsWith("image/"));

    if (validFiles.length === 0) {
      return [];
    }

    const uploadedMedia = [];

    for (const file of validFiles) {
      let uploadedMediaItem;
      try {
        uploadedMediaItem = await uploadImageFileAsChatAttachment({
          token: this.state.token,
          file,
          onStatus: (message) => this.serverReply(message),
        });
      } catch (error) {
        this.serverReply(error?.message || "Unable to upload chat image.");
        throw error;
      }

      if (uploadedMediaItem?.url) {
        uploadedMedia.push(uploadedMediaItem);
      }
    }

    return uploadedMedia;
  };

  uploadChatAudio = async (file) => {
    if (!file) {
      return null;
    }

    try {
      return await uploadAudioFileAsChatAttachment({
        token: this.state.token,
        file,
        onStatus: (message) => this.serverReply(message),
      });
    } catch (error) {
      this.serverReply(error?.message || "Unable to upload voice note.");
      throw error;
    }
  };

  saveChatImageToGallery = async (imageSource, options = {}) => {
    const normalizedImageSource =
      imageSource && typeof imageSource === "object"
        ? imageSource
        : {
            url: imageSource,
          };
    const visibility = String(options?.visibility || "public")
      .trim()
      .toLowerCase();
    let saveResult;
    try {
      saveResult = await saveRemoteImageToUserGallery({
        token: this.state.token,
        url: normalizedImageSource?.url,
        publicId: normalizedImageSource?.publicId,
        assetId: normalizedImageSource?.assetId,
        contentHash: normalizedImageSource?.contentHash,
        mimeType: normalizedImageSource?.mimeType || "image/jpeg",
        resourceType: normalizedImageSource?.resourceType || "image",
        format: normalizedImageSource?.format,
        visibility:
          visibility === "hidden" || visibility === "me"
            ? visibility
            : "public",
      });
    } catch (error) {
      this.serverReply(error?.message || "Unable to save image to gallery.");
      throw error;
    }
    const { payload, media } = saveResult;

    this.setUserMediaInfo({
      profilePicture: this.state.profilePicture,
      imageGallery: Array.isArray(payload?.imageGallery) ? payload.imageGallery : [],
    });
    this.serverReply(
      visibility === "hidden"
        ? "Image saved to your hidden gallery."
        : "Image saved to your gallery.",
    );

    return media;
  };

  editChatMessage = async (friendId, messageId, text) => {
    const normalizedFriendId = String(friendId || "").trim();
    const normalizedMessageId = String(messageId || "").trim();
    const normalizedText = String(text || "").trim();

    if (!normalizedFriendId || !normalizedMessageId) {
      this.serverReply("Unable to find that message.");
      return false;
    }

    try {
      const response = await fetch(
        apiUrl("/api/chat/message/") +
          normalizedFriendId +
          "/" +
          this.state.my_id +
          "/" +
          normalizedMessageId,
        {
          method: "PATCH",
          mode: "cors",
          headers: {
            Authorization: "Bearer " + this.state.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: {
              text: normalizedText,
            },
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.serverReply(payload?.message || "Unable to edit message.");
        return false;
      }

      this.safeSetState((prevState) => ({
        chat: (Array.isArray(prevState.chat) ? prevState.chat : []).map((message) => {
          if (
            String(message?._id || "").trim() !== normalizedFriendId ||
            String(message?.id || "").trim() !== normalizedMessageId
          ) {
            return message;
          }

          return {
            ...message,
            message: normalizedText,
            edited: true,
            deleted: false,
          };
        }),
      }));
      return true;
    } catch (error) {
      this.serverReply(error?.message || "Unable to edit message.");
      return false;
    }
  };

  deleteChatMessage = async (friendId, messageId, scope = "everyone") => {
    const normalizedFriendId = String(friendId || "").trim();
    const normalizedMessageId = String(messageId || "").trim();
    const normalizedScope =
      String(scope || "everyone").trim().toLowerCase() === "me" ? "me" : "everyone";

    if (!normalizedFriendId || !normalizedMessageId) {
      this.serverReply("Unable to find that message.");
      return false;
    }

    try {
      const response = await fetch(
        apiUrl("/api/chat/message/") +
          normalizedFriendId +
          "/" +
          this.state.my_id +
          "/" +
          normalizedMessageId +
          `?scope=${normalizedScope}`,
        {
          method: "DELETE",
          mode: "cors",
          headers: {
            Authorization: "Bearer " + this.state.token,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.serverReply(payload?.message || "Unable to delete message.");
        return false;
      }

      this.safeSetState((prevState) => ({
        chat:
          normalizedScope === "me"
            ? (Array.isArray(prevState.chat) ? prevState.chat : []).filter(
                (message) =>
                  !(
                    String(message?._id || "").trim() === normalizedFriendId &&
                    String(message?.id || "").trim() === normalizedMessageId
                  ),
              )
            : (Array.isArray(prevState.chat) ? prevState.chat : []).map((message) => {
                if (
                  String(message?._id || "").trim() !== normalizedFriendId ||
                  String(message?.id || "").trim() !== normalizedMessageId
                ) {
                  return message;
                }

                return {
                  ...message,
                  message: "",
                  audio: "",
                  images: [],
                  deleted: true,
                  edited: false,
                };
              }),
      }));
      return true;
    } catch (error) {
      this.serverReply(error?.message || "Unable to delete message.");
      return false;
    }
  };

  sendToThemMessage = (messagePayload) => {
    const normalizedPayload =
      typeof messagePayload === "string"
        ? {
            text: String(messagePayload || ""),
            audio: "",
            images: [],
          }
        : {
            text: String(messagePayload?.text || ""),
            audio: String(messagePayload?.audio || "").trim(),
            images: (Array.isArray(messagePayload?.images)
              ? messagePayload.images
              : []
            )
              .map((entry) => String(entry || "").trim())
              .filter(Boolean),
          };
    const normalizedMessage = normalizedPayload.text;
    const normalizedAudio = normalizedPayload.audio;
    const normalizedImages = normalizedPayload.images;
    const textarea = document.getElementById("Chat_textarea_input");
    if (textarea) {
      textarea.style.height = "42px";
    }
    if (!this.state.friendID_selected) {
      this.serverReply("Select a doctor from your friends list first");
      return Promise.resolve(false);
    }
    if (
      normalizedMessage.trim() !== "" ||
      normalizedAudio ||
      normalizedImages.length > 0
    ) {
      const selectedFriendId = this.state.friendID_selected;
      const optimisticTimestamp = new Date().toISOString();
      let url =
        apiUrl("/api/chat/sendMessage/") +
        selectedFriendId +
        "/" +
        this.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: {
            text: normalizedMessage,
            audio: normalizedAudio,
            images: normalizedImages,
            videos: [],
            documents: [],
          },
        }),
      };
      let req = new Request(url, options);
      this.safeSetState({
        isSendingMessage: true,
      });
      return fetch(req)
        .then(async (result) => {
          const payload = await result.json().catch(() => ({}));
          if (result.status === 201) {
            if (textarea) {
              textarea.value = "";
              textarea.style.height = "42px";
              textarea.focus();
            }
            this.safeSetState((prevState) => ({
              chat: [
                ...(Array.isArray(prevState.chat) ? prevState.chat : []),
                {
                  id: String(payload?.chatMessage?.id || "").trim(),
                  _id: selectedFriendId,
                  from: "me",
                  message: normalizedMessage,
                  audio: normalizedAudio,
                  images: normalizedImages,
                  date: optimisticTimestamp,
                  status: String(payload?.chatMessage?.status || "sent")
                    .trim()
                    .toLowerCase(),
                  edited: false,
                  deleted: false,
                },
              ],
            }));
            this.updateMyTypingPresence(selectedFriendId, false);
            return true;
          } else {
            this.serverReply(payload?.message || "Unable to send message");
            return false;
          }
        })
        .catch((error) => {
          this.serverReply(error?.message || "Unable to send message");
          return false;
        })
        .finally(() => {
          this.safeSetState({
            isSendingMessage: false,
          });
        });
    } else {
      this.serverReply("You can't send an empty message");
      return Promise.resolve(false);
    }
  };

  ////////////////////////ACCEPT FRIEND/////////////////////////////////////////////

  markFriendRequestReadLocally = (requestId) => {
    this.safeSetState((prevState) => ({
      friend_requests: (prevState.friend_requests || []).map((request) =>
        String(request?._id || "") === String(requestId) ||
        String(request?.id || "") === String(requestId)
          ? { ...request, status: "read" }
          : request,
      ),
    }));
  };

  markSelectedFriendMessagesRead = (friendId) => {
    if (!friendId || !this.state?.my_id) {
      return Promise.resolve(false);
    }

    this.markMessagesRead(friendId);
    return Promise.resolve(true);
  };

  acceptFriend = (friend) => {
    let friend_trim = friend.slice(11, friend.length);

    this.serverReply("Adding ...");
    let url =
      apiUrl("/api/user/acceptFriend/") + this.state.my_id + "/" + friend_trim;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    return fetch(req)
      .then((response) => {
        if (response.status === 201) {
          this.serverReply("You're now friends!");
          this.markFriendRequestReadLocally(friend_trim);
          this.updateUserInfo();
          return true;
        }
        if (response.status === 409) {
          this.markFriendRequestReadLocally(friend_trim);
          this.serverReply("You're already friends!");
          this.updateUserInfo();
          return true;
        }

        this.serverReply("Unable to accept friend request.");
        return false;
      })
      .catch(() => {
        this.serverReply("Unable to accept friend request.");
        return false;
      });
  };

  dismissFriendRequest = (requestTarget) => {
    const requestId = String(requestTarget || "").startsWith("decline_icon")
      ? String(requestTarget).slice(12)
      : String(requestTarget || "");

    if (!requestId) {
      this.serverReply("Unable to dismiss friend request.");
      return Promise.resolve(false);
    }

    return fetch(
      new Request(apiUrl("/api/user/friend-requests/") + requestId + "/read", {
        method: "PUT",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
      }),
    )
      .then((response) => {
        if (response.ok) {
          this.safeSetState((prevState) => ({
            friends: (
              Array.isArray(prevState.friends) ? prevState.friends : []
            ).filter((friend) => {
              const friendId = String(
                friend?._id || friend?.id || friend?.userID || "",
              ).trim();
              const friendMode = String(
                friend?.userMode ||
                  friend?.mode ||
                  friend?.relationship?.userMode ||
                  "",
              )
                .trim()
                .toLowerCase();

              return !(
                friendId === requestId &&
                friendMode === "requestreceived"
              );
            }),
          }));
          this.markFriendRequestReadLocally(requestId);
          this.updateUserInfo();
          this.serverReply("Friend request rejected.");
          return true;
        }

        this.serverReply("Unable to dismiss friend request.");
        return false;
      })
      .catch(() => {
        this.serverReply("Unable to dismiss friend request.");
        return false;
      });
  };

  cancelSentFriendRequest = (receiverId) => {
    const normalizedReceiverId = String(receiverId || "").trim();

    if (!normalizedReceiverId) {
      this.serverReply("Unable to cancel friend request.");
      return Promise.resolve(false);
    }

    return fetch(
      apiUrl(
        `/api/user/friend-requests/sent/${encodeURIComponent(
          normalizedReceiverId,
        )}`,
      ),
      {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.state.token,
          "Content-Type": "application/json",
        },
      },
    )
      .then((response) => {
        if (response.ok) {
          this.safeSetState((prevState) => ({
            friends: (
              Array.isArray(prevState.friends) ? prevState.friends : []
            ).filter((friend) => {
              const friendId = String(
                friend?._id || friend?.id || friend?.userID || "",
              ).trim();
              const friendMode = String(
                friend?.userMode ||
                  friend?.mode ||
                  friend?.relationship?.userMode ||
                  "",
              )
                .trim()
                .toLowerCase();

              return !(
                friendId === normalizedReceiverId &&
                friendMode === "requestsent"
              );
            }),
            sent_friend_requests: (
              Array.isArray(prevState.sent_friend_requests)
                ? prevState.sent_friend_requests
                : []
            ).filter(
              (request) => String(request?.id || "") !== normalizedReceiverId,
            ),
          }));
          this.updateUserInfo();
          this.serverReply("Friend request cancelled.");
          return true;
        }

        this.serverReply("Unable to cancel friend request.");
        return false;
      })
      .catch(() => {
        this.serverReply("Unable to cancel friend request.");
        return false;
      });
  };

  //////////////////////////////BUILD FRIENDS LIST////////////////
  app_friends = [];

  buildFriendsList = () => {
    //...START FETCHING FRIENDS
    let url = apiUrl("/api/user/update/") + this.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
      },
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        }
      })
      .then((jsonData) => {
        //...END FETCHING FRIENDS
        let ul = document.getElementById("FriendsList_friends_list");

        for (var i = 0; i < jsonData.friends.length; i++) {
          this.safeSetState({
            friends: jsonData.friends,
          });
          //For every friend
          const currentFriend = jsonData.friends[i] || {};
          const currentStatusValue = String(
            currentFriend?.status?.value || "offline",
          )
            .trim()
            .toLowerCase();
          if (this.app_friends[i] !== jsonData.friends[i]._id) {
            //If a friend is new to the app add it to the friends list with respect to the online status and to the app memory
            let p = document.createElement("p");
            let li = document.createElement("li");
            let icon = document.createElement("i");

            const friendIdentity = currentFriend?.identity || {};
            const friendPersonal = friendIdentity.personal || {};
            p.textContent =
              String(friendPersonal.firstname || "") +
              " " +
              String(friendPersonal.lastname || "");
            p.setAttribute("id", [i]);
            li.appendChild(p);
            li.setAttribute("id", jsonData.friends[i]._id);
            li.addEventListener("click", () => {
              this.get_current_friend_chat_id(li.id);

              document.getElementById(
                "DropHorizontally_article",
              ).style.display = "none";
            });
            li.setAttribute("class", "fr");
            li.setAttribute("title", String(friendPersonal.firstname || ""));
            icon.setAttribute("id", "online_icon" + jsonData.friends[i]._id);
            icon.setAttribute("class", "fas fa-circle");
            li.appendChild(icon);
            ul.appendChild(li);
            icon.style.color =
              currentStatusValue === "busy"
                ? "#ff9800"
                : currentStatusValue === "studying"
                  ? "#1e88e5"
                  : currentStatusValue === "offline"
                    ? "var(--black)"
                    : "#32cd32";
            this.app_friends[i] = jsonData.friends[i]._id;
          }
          if (this.app_friends[i] === currentFriend._id) {
            const iconElement = document.getElementById(
              "online_icon" + currentFriend._id,
            );
            if (iconElement) {
              iconElement.style.color =
                currentStatusValue === "busy"
                  ? "#ff9800"
                  : currentStatusValue === "studying"
                    ? "#1e88e5"
                    : currentStatusValue === "offline"
                      ? "var(--black)"
                      : "#32cd32";
            }
          }
        }
      });
  };

  ////////////////////////////Select friend id to chat //////////////////////////////////////////////////
  get_current_friend_chat_id = (friendID) => {
    let activeChatFriendName = "";
    this.state.friends.forEach((friend) => {
      if (friend._id === friendID) {
        const friendPersonal = friend?.identity?.personal || friend?.info || {};
        activeChatFriendName =
          friendPersonal?.firstname && friendPersonal?.lastname
            ? `${friendPersonal.firstname} ${friendPersonal.lastname}`
            : friendPersonal?.firstname || "Chat";
      }
    });

    this.safeSetState({
      friendID_selected: friendID,
      activeChatFriendId: friendID,
      activeChatFriendName,
      isChatting: true,
    }, () => {
      this.syncPresenceStatus({
      });
    });

    this.updateMyChatPresence(friendID, true);
    this.updateMyTypingPresence(friendID, false);
    this.markSelectedFriendMessagesRead(friendID);
    this.RetrievingMySendingMessages(friendID);
  };

  closeActiveChat = () => {
    const activeFriendId = this.state.activeChatFriendId;

    if (this.state.activeChatFriendId) {
      this.updateMyChatPresence(this.state.activeChatFriendId, false);
      this.updateMyTypingPresence(this.state.activeChatFriendId, false);
    }

    this.safeSetState({
      friendID_selected: null,
      activeChatFriendId: null,
      activeChatFriendName: "",
      isChatting: false,
    }, () => {
      this.syncPresenceStatus({
      });
    });
  };

  removeFriend = (friendId) => {
    if (!friendId) {
      return Promise.resolve(false);
    }

    const url =
      apiUrl("/api/user/removeFriend/") + this.state.my_id + "/" + friendId;
    const options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };

    return fetch(new Request(url, options))
      .then((response) => {
        if (response.ok) {
          this.safeSetState((currentState) => ({
            friends: (currentState.friends || []).filter(
              (friend) => friend?._id !== friendId,
            ),
            activeChatFriendId:
              currentState.activeChatFriendId === friendId
                ? null
                : currentState.activeChatFriendId,
            activeChatFriendName:
              currentState.activeChatFriendId === friendId
                ? ""
                : currentState.activeChatFriendName,
            isChatting:
              currentState.activeChatFriendId === friendId
                ? false
                : currentState.isChatting,
          }));
          this.updateUserInfo();
          this.serverReply("Friend removed.");
          return true;
        }

        this.serverReply("Unable to remove friend.");
        return false;
      })
      .catch(() => {
        this.serverReply("Unable to remove friend.");
        return false;
      });
  };

  unblockFriend = (friendId) => {
    if (!friendId) {
      return Promise.resolve(false);
    }

    const url =
      apiUrl("/api/user/unblockFriend/") + this.state.my_id + "/" + friendId;
    const options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.state.token,
        "Content-Type": "application/json",
      },
    };

    return fetch(new Request(url, options))
      .then((response) => {
        if (response.ok) {
          this.safeSetState((currentState) => ({
            friends: (currentState.friends || []).filter(
              (friend) => friend?._id !== friendId,
            ),
          }));
          this.updateUserInfo();
          this.serverReply("User unblocked.");
          return true;
        }

        this.serverReply("Unable to unblock user.");
        return false;
      })
      .catch(() => {
        this.serverReply("Unable to unblock user.");
        return false;
      });
  };

  ///DeleteFriendPost
  deleteFriendPost = (post_id) => {
    document.getElementById("li" + post_id).remove();
  };
  ////////////////////////////Update State//////////DONE/////////////////////
  updateUserInfo = ({ force = false } = {}) => {
    if (!this.state.my_id) {
      return Promise.resolve(null);
    }

    const now = Date.now();
    if (
      !force &&
      now - this.lastUserInfoFetchAt < this.minUserInfoRefreshIntervalMs
    ) {
      return Promise.resolve(null);
    }

    if (this.userInfoRequestPromise) {
      this.userInfoRefreshQueued = true;
      return this.userInfoRequestPromise;
    }

    if (this.userInfoAbortController) {
      this.userInfoAbortController.abort();
    }

    this.userInfoAbortController = new AbortController();

    let url = apiUrl("/api/user/update/") + this.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
      signal: this.userInfoAbortController.signal,
    });
    this.lastUserInfoFetchAt = Date.now();
    const requestVersion = ++this.userInfoRequestVersion;

    this.userInfoRequestPromise = fetch(req)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        }
        throw new Error(`Failed to load user info: ${response.status}`);
      })
      .then((jsonData) => {
        if (requestVersion < this.latestAppliedUserInfoVersion) {
          return null;
        }

        const normalizedPayload = normalizeUserUpdatePayload(jsonData);
        const currentFriends = Array.isArray(this.state.friends)
          ? this.state.friends
          : [];
        const currentFriendsById = new Map(
          currentFriends
            .filter((friend) => friend && typeof friend === "object")
            .map((friend) => [
              String(friend?._id || friend?.id || friend?.chatId || "").trim(),
              friend,
            ])
            .filter(([friendId]) => Boolean(friendId)),
        );
        const nextFriends = Array.isArray(normalizedPayload.friends)
          ? normalizedPayload.friends.map((friend) => {
              if (!friend || typeof friend !== "object") {
                return friend;
              }

              const friendId = String(
                friend?._id || friend?.id || friend?.chatId || "",
              ).trim();
              const currentFriend = friendId
                ? currentFriendsById.get(friendId)
                : null;
              const currentLocalStatus =
                currentFriend?.localStatus &&
                typeof currentFriend.localStatus === "object"
                  ? currentFriend.localStatus
                  : null;
              const incomingLocalStatus =
                friend?.localStatus && typeof friend.localStatus === "object"
                  ? friend.localStatus
                  : null;
              const liveLocalStatus =
                this.state.friendLocalStatusById &&
                typeof this.state.friendLocalStatusById === "object"
                  ? this.state.friendLocalStatusById[friendId] || null
                  : null;
              const currentLocalStatusTimestamp = this.getLocalStatusTimestamp(
                currentLocalStatus,
              );
              const incomingLocalStatusTimestamp = this.getLocalStatusTimestamp(
                incomingLocalStatus,
              );
              const liveLocalStatusTimestamp = this.getLocalStatusTimestamp(
                liveLocalStatus,
              );
              const shouldPreserveCurrentLocalStatus =
                Boolean(
                  currentLocalStatus?.value &&
                    ["in my chat", "typing"].includes(
                      String(currentLocalStatus.value || "")
                        .trim()
                        .toLowerCase(),
                    ),
                ) &&
                currentLocalStatusTimestamp > incomingLocalStatusTimestamp;
              const shouldPreserveLiveLocalStatus =
                Boolean(
                  liveLocalStatus?.value &&
                    ["in my chat", "typing"].includes(
                      String(liveLocalStatus.value || "")
                        .trim()
                        .toLowerCase(),
                    ),
                ) &&
                liveLocalStatusTimestamp >=
                  Math.max(
                    incomingLocalStatusTimestamp,
                    currentLocalStatusTimestamp,
                  );

              return {
                ...friend,
                presenceUpdatedAt:
                  friend.presenceUpdatedAt ||
                  friend?.status?.updatedAt ||
                  friend?.status?.lastSeenAt ||
                  friend?.identity?.status?.updatedAt ||
                  friend?.identity?.status?.lastSeenAt ||
                  null,
                chatId:
                  String(friend?.chatId || getFriendChatPresenceKey(friend))
                    .trim() || friend?.chatId,
                localStatus: shouldPreserveLiveLocalStatus
                  ? liveLocalStatus
                  : shouldPreserveCurrentLocalStatus
                  ? currentLocalStatus
                  : incomingLocalStatus || {
                      value: null,
                      updatedAt: null,
                      lastChatAt: null,
                      lastTypingAt: null,
                    },
              };
            })
          : [];
        const personal = normalizedPayload.personal || {};
        const nextStudying =
          normalizedPayload.studying &&
          typeof normalizedPayload.studying === "object"
            ? normalizedPayload.studying
            : this.state.studying;
        const nextProfilePicture =
          normalizedPayload.profilePicture || this.state.profilePicture;
        const nextImageGallery = normalizedPayload.imageGallery;
        const nextProfilePictureViewport =
          normalizedPayload.profilePictureViewport;
        const fetchedHomeDrawing = normalizedPayload.homeDrawing;
        const currentHomeDrawing =
          this.state.homeDrawing && typeof this.state.homeDrawing === "object"
            ? this.state.homeDrawing
            : { draftPaths: [], appliedPaths: [], textItems: [] };
        const fetchedAppliedCount = Array.isArray(
          fetchedHomeDrawing.appliedPaths,
        )
          ? fetchedHomeDrawing.appliedPaths.length
          : Array.isArray(fetchedHomeDrawing.paths)
            ? fetchedHomeDrawing.paths.length
            : 0;
        const currentAppliedCount = Array.isArray(
          currentHomeDrawing.appliedPaths,
        )
          ? currentHomeDrawing.appliedPaths.length
          : Array.isArray(currentHomeDrawing.paths)
            ? currentHomeDrawing.paths.length
            : 0;
        const fetchedTextCount = Array.isArray(fetchedHomeDrawing.textItems)
          ? fetchedHomeDrawing.textItems.length
          : 0;
        const currentTextCount = Array.isArray(currentHomeDrawing.textItems)
          ? currentHomeDrawing.textItems.length
          : 0;
        const nextHomeDrawing =
          fetchedAppliedCount === 0 &&
          fetchedTextCount === 0 &&
          (currentAppliedCount > 0 || currentTextCount > 0)
            ? currentHomeDrawing
            : fetchedHomeDrawing;
        const nextSettings = normalizeAppSettings(normalizedPayload.settings);
        const nextAppScale =
          getScaleValueForElement(nextSettings.ui.scale, "app_page") ??
          this.state.appScale;
        this.safeSetState({
          username:
            normalizedPayload?.identity?.atSignup?.username ||
            this.state.username,
          firstname: personal?.firstname || this.state.firstname,
          lastname: personal?.lastname || this.state.lastname,
          studying: nextStudying,
          faculty: personal?.faculty || this.state.faculty || "",
          program: personal?.program || "",
          university: personal?.university || "",
          studyYear: personal?.year || personal?.studyYear || "",
          term: personal?.term || "",
          aiProvider: normalizedPayload.aiProvider,
          friends: nextFriends,
          friend_requests: normalizedPayload.friendRequests,
          sent_friend_requests: normalizedPayload.sentFriendRequests,
          rejected_users: normalizedPayload.rejectedUsers,
          posts: normalizedPayload.posts,
          chat: normalizedPayload.chat,
          login_record: [],
          isOnline: normalizedPayload.isOnline,
          profilePicture: nextProfilePicture,
          profilePictureViewport: nextProfilePictureViewport,
          homeDrawing: nextHomeDrawing,
          imageGallery: nextImageGallery,
          settings: nextSettings,
          appScale: nextAppScale,
        });
        this.persistStoredSession({
          username:
            normalizedPayload?.identity?.atSignup?.username ||
            this.state.username,
          firstname: personal?.firstname || this.state.firstname,
          lastname: personal?.lastname || this.state.lastname,
          studying: nextStudying,
          faculty: personal?.faculty || this.state.faculty || "",
          program: personal?.program || "",
          university: personal?.university || "",
          studyYear: personal?.year || personal?.studyYear || "",
          term: personal?.term || "",
          aiProvider: normalizedPayload.aiProvider,
          profilePicture: nextProfilePicture,
          profilePictureViewport: nextProfilePictureViewport,
          homeDrawing: nextHomeDrawing,
          imageGallery: nextImageGallery,
          settings: nextSettings,
          appScale: nextAppScale,
          friends: nextFriends,
          friend_requests: normalizedPayload.friendRequests,
          sent_friend_requests: normalizedPayload.sentFriendRequests,
          rejected_users: normalizedPayload.rejectedUsers,
          posts: normalizedPayload.posts,
          login_record: [],
          friendLocalStatusById:
            this.state.friendLocalStatusById &&
            typeof this.state.friendLocalStatusById === "object"
              ? this.state.friendLocalStatusById
              : {},
        });
        this.latestAppliedUserInfoVersion = requestVersion;
        this.memory.courses = normalizedPayload.memory.courses;
        return normalizedPayload;
      })
      .catch((err) => {
        if (err?.name === "AbortError") {
          return;
        }

        if (err.message === "Cannot read property 'credentials' of null")
          console.log("Error", err.message);
      })
      .finally(() => {
        this.userInfoRequestPromise = null;
        if (this.userInfoRefreshQueued && !this.isUnmounted) {
          this.userInfoRefreshQueued = false;
          this.updateUserInfo();
        } else {
          this.userInfoRefreshQueued = false;
        }
      });

    return this.userInfoRequestPromise;
  };

  persistStoredSession = (partialState = {}) => {
    try {
      const storedSession = readStoredSession() || {};
      writeStoredSession({
        ...storedSession,
        ...partialState,
      });
    } catch (error) {
      // Ignore storage write errors.
    }
  };

  getScaleSettingMap = (scaleEntries = []) =>
    (Array.isArray(scaleEntries) ? scaleEntries : []).reduce(
      (accumulator, entry) => {
        const element = String(entry?.element || "").trim();
        if (!element) {
          return accumulator;
        }

        accumulator[element] = clampAppScale(entry?.scaleNum);
        return accumulator;
      },
      {},
    );

  applyScaleSettingsToDom = (scaleEntries = []) => {
    if (typeof document === "undefined") {
      return;
    }

    const scaleMap = this.getScaleSettingMap(scaleEntries);
    const hasExpandedNonPageScale = Object.entries(scaleMap).some(
      ([elementId, scaleNum]) =>
        elementId !== "app_page" && Number(scaleNum) > 1,
    );
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.style.overflow = hasExpandedNonPageScale ? "auto" : "";
    }

    Object.entries(scaleMap).forEach(([elementId, scaleNum]) => {
      if (!elementId || elementId === "app_page") {
        return;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        return;
      }

      if (Number(scaleNum) === 1) {
        element.style.removeProperty("width");
        element.style.removeProperty("height");
        element.style.removeProperty("min-height");
        element.style.removeProperty("max-height");
        element.style.removeProperty("transform");
        element.style.removeProperty("transform-origin");
        element.style.removeProperty("overflow");
        return;
      }

      element.style.width = `calc(100% / ${scaleNum})`;
      element.style.height = `calc(100% / ${scaleNum})`;
      element.style.minHeight = "0";
      element.style.maxHeight = `calc(100% / ${scaleNum})`;
      element.style.transform = `scale(${scaleNum})`;
      element.style.transformOrigin = "top left";
      element.style.overflow = "hidden";
    });
  };

  getCurrentScaleForElement = (elementId = "") => {
    const normalizedElementId = String(elementId || "").trim();
    if (!normalizedElementId) {
      return 1;
    }

    const scaleEntries = Array.isArray(this.state.settings?.ui?.scale)
      ? this.state.settings.ui.scale
      : [];
    const scaleEntry = scaleEntries.find(
      (entry) =>
        String(entry?.element || "").trim() === normalizedElementId,
    );

    return scaleEntry ? clampAppScale(scaleEntry.scaleNum) : 1;
  };

  setUserAcademicInfo = (nextInfo = {}) => {
    this.safeSetState(
      (currentState) => ({
        bio:
          nextInfo?.bio !== undefined
            ? String(nextInfo?.bio || "").trim()
            : currentState.bio,
        email:
          nextInfo?.email !== undefined
            ? String(nextInfo?.email || "").trim()
            : currentState.email,
        phone:
          nextInfo?.phone !== undefined
            ? String(nextInfo?.phone || "").trim()
            : currentState.phone,
        dob:
          nextInfo?.dob !== undefined ? nextInfo?.dob || null : currentState.dob,
        firstname:
          nextInfo?.firstname !== undefined
            ? String(nextInfo?.firstname || "").trim()
            : currentState.firstname,
        lastname:
          nextInfo?.lastname !== undefined
            ? String(nextInfo?.lastname || "").trim()
            : currentState.lastname,
        username:
          nextInfo?.username !== undefined
            ? String(nextInfo?.username || "").trim()
            : currentState.username,
        studying: (() => {
          const currentStudying =
            currentState.studying && typeof currentState.studying === "object"
              ? currentState.studying
              : {};
          const currentStudyingTime =
            currentStudying.time && typeof currentStudying.time === "object"
              ? currentStudying.time
              : {};
          const currentStudyingTimeStart =
            currentStudyingTime.start && typeof currentStudyingTime.start === "object"
              ? currentStudyingTime.start
              : {};
          const currentStudyingTimeCurrent =
            currentStudyingTime.current &&
            typeof currentStudyingTime.current === "object"
              ? currentStudyingTime.current
              : {};
          const currentStudyingTimeStartDate =
            currentStudyingTime.startDate &&
            typeof currentStudyingTime.startDate === "object"
              ? currentStudyingTime.startDate
              : {};
          const currentStudyingTimeCurrentDate =
            currentStudyingTime.currentDate &&
            typeof currentStudyingTime.currentDate === "object"
              ? currentStudyingTime.currentDate
              : {};

          const nextCurrentProgramYearInterval =
            nextInfo?.currentAcademicYear !== undefined
              ? String(nextInfo?.currentAcademicYear || "").trim() || null
              : currentStudyingTimeCurrent.programYearInterval ??
                currentStudyingTime.currentAcademicYear ??
                null;
          const nextCurrentProgramYearNum =
            nextInfo?.studyYear !== undefined
              ? String(nextInfo?.studyYear || "").trim() !== ""
                ? Number(nextInfo.studyYear)
                : null
              : currentStudyingTimeCurrent.programYearNum ??
                currentStudyingTimeCurrentDate.year ??
                null;
          const nextCurrentProgramTerm =
            nextInfo?.term !== undefined
              ? String(nextInfo?.term || "").trim() || null
              : String(
                  currentStudyingTimeCurrent.programTerm ??
                    currentStudyingTimeCurrentDate.term ??
                    "",
                ).trim() || null;

          return {
            ...currentStudying,
            faculty:
              nextInfo?.faculty !== undefined
                ? String(nextInfo?.faculty || "").trim()
                : String(currentStudying?.faculty || "").trim(),
            program:
              nextInfo?.program !== undefined
                ? String(nextInfo?.program || "").trim()
                : String(currentStudying?.program || "").trim(),
            university:
              nextInfo?.university !== undefined
                ? String(nextInfo?.university || "").trim()
                : String(currentStudying?.university || "").trim(),
            language:
              nextInfo?.language !== undefined
                ? String(nextInfo?.language || "").trim()
                : String(currentStudying?.language || "").trim(),
            componentsClass:
              nextInfo?.componentsClass !== undefined
                ? Array.from(
                    new Set(
                      (Array.isArray(nextInfo.componentsClass)
                        ? nextInfo.componentsClass
                        : [nextInfo.componentsClass]
                      )
                        .map((entry) => String(entry || "").trim())
                        .filter(Boolean),
                    ),
                  )
                : Array.isArray(currentStudying?.componentsClass)
                  ? currentStudying.componentsClass
                  : [],
            time: {
              ...currentStudyingTime,
              currentAcademicYear: nextCurrentProgramYearInterval,
              start: {
                ...currentStudyingTimeStart,
              },
              current: {
                ...currentStudyingTimeCurrent,
                programYearInterval: nextCurrentProgramYearInterval,
                programYearNum: nextCurrentProgramYearNum,
                programTerm: nextCurrentProgramTerm,
              },
              startDate: {
                ...currentStudyingTimeStartDate,
              },
              currentDate: {
                ...currentStudyingTimeCurrentDate,
                year: nextCurrentProgramYearNum,
                term: nextCurrentProgramTerm,
              },
            },
          };
        })(),
        working: {
          ...(currentState.working && typeof currentState.working === "object"
            ? currentState.working
            : {}),
          company:
            nextInfo?.company !== undefined
              ? String(nextInfo?.company || "").trim()
              : String(currentState?.working?.company || "").trim(),
          position:
            nextInfo?.position !== undefined
              ? String(nextInfo?.position || "").trim()
              : String(currentState?.working?.position || "").trim(),
        },
        hometown: {
          ...(currentState.hometown && typeof currentState.hometown === "object"
            ? currentState.hometown
            : {}),
          Country:
            nextInfo?.hometownCountry !== undefined
              ? String(nextInfo?.hometownCountry || "").trim()
              : String(currentState?.hometown?.Country || "").trim(),
          City:
            nextInfo?.hometownCity !== undefined
              ? String(nextInfo?.hometownCity || "").trim()
              : String(currentState?.hometown?.City || "").trim(),
        },
        faculty:
          nextInfo?.faculty !== undefined
            ? String(nextInfo?.faculty || "").trim()
            : currentState.faculty,
        program: String(nextInfo?.program || "").trim(),
        university: String(nextInfo?.university || "").trim(),
        studyYear: String(nextInfo?.studyYear || "").trim(),
        term: String(nextInfo?.term || "").trim(),
        aiProvider: ["openai", "groq", "gemini", "kimi"].includes(
          String(nextInfo?.aiProvider || "")
            .trim()
            .toLowerCase(),
        )
          ? String(nextInfo?.aiProvider || "")
              .trim()
              .toLowerCase()
          : "openai",
      }),
      () => {
        this.persistStoredSession({
          bio: this.state.bio,
          email: this.state.email,
          phone: this.state.phone,
          dob: this.state.dob,
          firstname: this.state.firstname,
          lastname: this.state.lastname,
          username: this.state.username,
          hometown: this.state.hometown,
          working: this.state.working,
          studying: this.state.studying,
          faculty: this.state.faculty,
          program: this.state.program,
          university: this.state.university,
          studyYear: this.state.studyYear,
          term: this.state.term,
          aiProvider: this.state.aiProvider,
        });
      },
    );
  };

  setUserMediaInfo = (nextMedia = {}) => {
    const requestedProfilePicture = nextMedia?.profilePicture;
    const nextProfilePicture = resolveProfilePictureStateUrl(
      requestedProfilePicture,
      this.state.profilePicture,
    );
    const nextImageGallery = Array.isArray(nextMedia?.imageGallery)
      ? nextMedia.imageGallery
      : [];
    const nextProfilePictureViewport =
      nextMedia?.profilePictureViewport &&
      typeof nextMedia.profilePictureViewport === "object"
        ? nextMedia.profilePictureViewport
        : this.state.profilePictureViewport;
    const nextHomeDrawing =
      nextMedia?.homeDrawing && typeof nextMedia.homeDrawing === "object"
        ? nextMedia.homeDrawing
        : this.state.homeDrawing;
    const nextBioWrapperWallpaper =
      nextMedia?.bioWrapperWallpaper !== undefined
        ? String(nextMedia.bioWrapperWallpaper || "").trim()
        : this.state.bioWrapperWallpaper;
    const requestedBioWrapperWallpaperSize = Number(
      nextMedia?.bioWrapperWallpaperSize,
    );
    const nextBioWrapperWallpaperSize = Number.isFinite(
      requestedBioWrapperWallpaperSize,
    )
      ? Math.min(Math.max(requestedBioWrapperWallpaperSize, 180), 1400)
      : Number(this.state.bioWrapperWallpaperSize) || 520;
    const nextBioWrapperWallpaperRepeat =
      nextMedia?.bioWrapperWallpaperRepeat !== undefined
        ? Boolean(nextMedia.bioWrapperWallpaperRepeat)
        : this.state.bioWrapperWallpaperRepeat;

    this.safeSetState(
      (currentState) => {
        const currentViewport = currentState.profilePictureViewport || {};
        const nextViewport = nextProfilePictureViewport || {};
        const isViewportUnchanged =
          Number(currentViewport.scale) === Number(nextViewport.scale) &&
          Number(currentViewport.offsetX) === Number(nextViewport.offsetX) &&
          Number(currentViewport.offsetY) === Number(nextViewport.offsetY);
        const isHomeDrawingUnchanged =
          JSON.stringify(currentState.homeDrawing || {}) ===
          JSON.stringify(nextHomeDrawing || {});
        const isGalleryUnchanged =
          JSON.stringify(currentState.imageGallery || []) ===
          JSON.stringify(nextImageGallery);
        const isBioWallpaperUnchanged =
          String(currentState.bioWrapperWallpaper || "") ===
            nextBioWrapperWallpaper &&
          Number(currentState.bioWrapperWallpaperSize || 520) ===
            nextBioWrapperWallpaperSize &&
          Boolean(currentState.bioWrapperWallpaperRepeat) ===
            nextBioWrapperWallpaperRepeat;

        if (
          currentState.profilePicture === nextProfilePicture &&
          isViewportUnchanged &&
          isHomeDrawingUnchanged &&
          isGalleryUnchanged &&
          isBioWallpaperUnchanged
        ) {
          return null;
        }

        return {
          profilePicture: nextProfilePicture,
          profilePictureViewport: nextProfilePictureViewport,
          homeDrawing: nextHomeDrawing,
          imageGallery: nextImageGallery,
          bioWrapperWallpaper: nextBioWrapperWallpaper,
          bioWrapperWallpaperSize: nextBioWrapperWallpaperSize,
          bioWrapperWallpaperRepeat: nextBioWrapperWallpaperRepeat,
        };
      },
      () => {
        this.persistStoredSession({
          profilePicture: this.state.profilePicture,
          profilePictureViewport: this.state.profilePictureViewport,
          homeDrawing: this.state.homeDrawing,
          imageGallery: this.state.imageGallery,
          bioWrapperWallpaper: this.state.bioWrapperWallpaper,
          bioWrapperWallpaperSize: this.state.bioWrapperWallpaperSize,
          bioWrapperWallpaperRepeat: this.state.bioWrapperWallpaperRepeat,
        });
      },
    );
  };

  setSelectedAiProvider = (provider) => {
    const nextProvider = ["openai", "groq", "gemini", "kimi"].includes(
      String(provider || "")
        .trim()
        .toLowerCase(),
    )
      ? String(provider || "")
          .trim()
          .toLowerCase()
      : "openai";

    if (this.state.aiProvider === nextProvider) {
      return;
    }

    this.safeSetState({
      aiProvider: nextProvider,
    });

    try {
      const storedSession = readStoredSession() || {};
      writeStoredSession({
        ...storedSession,
        aiProvider: nextProvider,
      });
    } catch (error) {
      // Ignore storage errors and keep runtime state update.
    }

    if (!this.state.token) {
      return;
    }

    fetch(apiUrl("/api/user/profile"), {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${this.state.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        program: String(this.state.program || "").trim(),
        university: String(this.state.university || "").trim(),
        studyYear: String(this.state.studyYear || "").trim(),
        term: String(this.state.term || "").trim(),
        aiProvider: nextProvider,
      }),
    }).catch(() => undefined);
  };

  ///////////////////////////////////////Counter////////////////////////////////////////////////
  counter = () => {
    let secs;
    let mins;
    let hours;
    document.getElementById("Posts_content_container").style.height = "100%";
    // document.getElementById("Footer_article").style.display = "none";
    // document.getElementById("SearchPosts_article").style.display = "flex";
    // document.getElementById("Header_timer_h1").style.display = "inline";
    if (JSON.parse(sessionStorage.getItem("Header_timer_h1"))) {
      secs = JSON.parse(sessionStorage.getItem("Header_timer_h1")).secs;
      mins = JSON.parse(sessionStorage.getItem("Header_timer_h1")).mins;
      hours = JSON.parse(sessionStorage.getItem("Header_timer_h1")).hours;
    } else {
      secs = 0;
      mins = 0;
      hours = 0;
    }
    setInterval(() => {
      secs++;
      if (secs % 60 === 0 && secs !== 0) {
        mins++;
        secs = 0;
      }
      if (mins % 60 === 0 && mins !== 0) {
        hours++;
        mins = 0;
      }

      this.safeSetState({
        timer: {
          hours: hours,
          mins: mins,
          secs: secs,
        },
      });
    }, 1000);
  };

  playServerReplySound = () => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    try {
      if (!this.serverReplyAudioContext) {
        this.serverReplyAudioContext = new AudioContextClass();
      }

      const context = this.serverReplyAudioContext;

      if (context.state === "suspended") {
        context.resume().catch(() => null);
      }

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.exponentialRampToValueAtTime(988, now + 0.18);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.34);
    } catch (error) {
      console.log("server reply sound unavailable");
    }
  };

  //........Server answer..........
  serverReply = (answer) => {
    const nextAnswer = String(answer || "").trim() || "NO NEW SERVER REPLY";
    const isActiveReply = nextAnswer !== "NO NEW SERVER REPLY";

    if (this.serverReplyTimeout) {
      window.clearTimeout(this.serverReplyTimeout);
    }

    this.safeSetState({
      server_answer: nextAnswer,
      has_active_server_reply: isActiveReply,
    });

    if (isActiveReply) {
      this.playServerReplySound();
    }

    this.serverReplyTimeout = window.setTimeout(
      () => {
        this.safeSetState({
          server_answer: "NO NEW SERVER REPLY",
          has_active_server_reply: false,
        });
        this.serverReplyTimeout = null;
      },
      Math.max(3000, 8000),
    );
  };

  //.....loader function..........
  loader = () => {
    return (
      <div
        style={{
          fontSize: "20pt",
          display: "flex",
          position: "fixed",
          top: "0",
          bottom: "0",

          justifyContent: "center",
          alignContent: "center",
          flexDirection: "column",
          zIndex: "100",
        }}
      >
        <img src="/img/loader.gif" alt="" width="70px" />
      </div>
    );
  };

  /////////////////////////Log out//////////////////////
  logOut = () => {
    const finishLogout = () => {
      this.syncPresenceStatus({
        statusValue: "offline",
        force: true,
        keepalive: true,
      });

      logoutStoredSession({
        clear: false,
        tokenless: false,
      });

      if (this.realtimeSocket) {
        this.realtimeSocket.disconnect();
        this.realtimeSocket = null;
      }

      if (this.props.onLogout) {
        this.props.onLogout();
      }
    };

    this.safeSetState(
      {
        isLoggedIn: false,
        isConnected: false,
      },
      () => {
        this.syncPresenceStatus({
          statusValue: "offline",
          force: true,
          keepalive: true,
        });
        finishLogout();
        this.availableToChat(false).catch(() => null);
      },
    );
  };

  friendConnectionColor = (isLoggedIn) => {
    if (isLoggedIn) {
      return "#32cd32";
    }

    return "rgba(240, 242, 245, 0.42)";
  };

  ///////////////////////Searching in posts////////////////////
  prepare_searchPosts = (entry1, entry2, entry3) => {
    let keyword;
    let subject;
    let category;
    if (!entry1) {
      keyword = "$";
    } else {
      keyword = entry1;
    }
    if (!entry2) {
      subject = "$";
    } else {
      subject = entry2;
    }
    if (!entry3) {
      category = "$";
    } else {
      category = entry3;
    }
    this.searchPosts(keyword, subject, category);
  };
  searchPosts = (keyword, subject, category) => {
    let ul = document.getElementById("MountPosts_content_container");
    let array = [];
    ul.innerHTML = "";
    //..................................
    this.state.posts.forEach((post) => {
      if (keyword !== "$" && subject === "$" && category === "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note).toLowerCase().includes(keyword.toLowerCase())
        ) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject !== "$" && category === "$") {
        if (post.subject === subject) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject === "$" && category !== "$") {
        if (post.category === category) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject !== "$" && category === "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && post.subject === subject)
        ) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject === "$" && category !== "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(keyword.toLowerCase() && post.category === category)
        ) {
          array.push(post);
        }
      }
      if (keyword === "$" && subject !== "$" && category !== "$") {
        if (post.subject === subject && post.category === category) {
          array.push(post);
        }
      }
      if (keyword !== "$" && subject !== "$" && category !== "$") {
        if (
          String(post.note).toLowerCase() === keyword.toLowerCase() ||
          String(post.note)
            .toLowerCase()
            .includes(
              keyword.toLowerCase() &&
                post.subject === subject &&
                post.category === category,
            )
        ) {
          array.push(post);
        }
      }
    });
    let array_associate = [];
    for (var i = 0; i < array.length; i++) {
      if (array_associate[i] !== array[i]._id) {
        let date_p = document.createElement("p");
        let category_p = document.createElement("p");
        let subject_p = document.createElement("p");
        let reference_p = document.createElement("p");
        let page_p = document.createElement("p");
        let li = document.createElement("li");
        let details_div = document.createElement("div");
        let note_options_div = document.createElement("div");
        //.............................comments.......................

        //............date.................................
        let date = array[i].date;
        let date_timezone = new Date(date);
        let date_string = date_timezone.toDateString();
        let time_string = date_timezone.toLocaleTimeString();
        //.............................................
        //...............................note..................................
        let note_p = document.createElement("p");
        note_p.textContent = array[i].note;
        note_p.setAttribute("class", "note_p");
        note_options_div.setAttribute("class", "fr note_options_div");
        note_options_div.setAttribute("id", "note_options_div" + i);
        note_options_div.appendChild(note_p);
        //.......................Options....................................
        let options_div = document.createElement("div");
        options_div.setAttribute("class", "options_div");
        //............................Poster name.......................
        let postername_p = document.createElement("p");
        postername_p.setAttribute("class", "postername_p");
        details_div.appendChild(postername_p);
        //..................................
        if (array[i].id === this.state.my_id) {
          postername_p.textContent = "Mine";
          let p_delete = document.createElement("p");
          let p_edit = document.createElement("p");
          p_delete.style.cursor = "pointer";
          p_edit.style.cursor = "pointer";
          p_delete.textContent = "Delete";
          p_edit.textContent = "Edit";
          options_div.appendChild(p_delete);
          options_div.appendChild(p_edit);
          p_delete.addEventListener("click", () => {
            this.safeSetState({ posts_deleted: true });
            this.deletePost(options_div.id);
          });
          p_edit.addEventListener("click", () => this.editPost(options_div.id));
          note_options_div.appendChild(options_div);
          options_div.setAttribute(
            "class",
            "fc MountPosts_postOptionsContainer",
          );
          options_div.setAttribute("id", array[i]._id);
        } else {
          postername_p.textContent =
            array[i].firstname + " " + array[i].lastname;
        }
        //........................................................................

        //.....................................................................
        li.className = "fc";

        date_p.innerHTML =
          "<i class='far fa-clock'></i>" +
          "  " +
          date_string +
          ", " +
          time_string;
        category_p.textContent = "Category: " + array[i].category;
        subject_p.textContent = "Subject: " + array[i].subject;
        reference_p.textContent = "Reference: " + array[i].reference;
        page_p.textContent = "Page #: " + array[i].page_num;
        date_p.className = "MountPosts_date";
        details_div.appendChild(date_p);
        details_div.appendChild(category_p);
        details_div.appendChild(subject_p);
        details_div.setAttribute("class", "fr details_div");
        //...................comments...............
        let comments_div = document.createElement("div");
        let comment_input = document.createElement("input");
        let commentlist_ul = document.createElement("ul");
        comments_div.appendChild(comment_input);
        comments_div.setAttribute("class", "fc comments_div");
        comments_div.setAttribute("id", "commentDiv" + array[i]._id);
        comment_input.setAttribute("id", "comment_input" + array[i]._id);
        comment_input.setAttribute("class", "comment_input");
        commentlist_ul.setAttribute("id", "commentlist_ul" + array[i]._id);
        comment_input.setAttribute("placeholder", "Enter a comment");
        comment_input.addEventListener("keypress", (event) => {
          this.postComment(event, comments_div.id, comment_input.id);
        });
        array[i].comments.forEach((comment) => {
          let comment_li = document.createElement("li");
          comment_li.textContent = comment;
          comment_li.setAttribute("class", "comment_li");
          commentlist_ul.setAttribute("class", "fc commentlist_ul");
          commentlist_ul.prepend(comment_li);
          comments_div.appendChild(commentlist_ul);
        });
        //.....................................................

        if (!(array[i].reference === "" && array[i].page_num !== null)) {
          if (array[i].reference !== "") details_div.appendChild(reference_p);
          if (array[i].page_num !== null) details_div.appendChild(page_p);
        }
        li.setAttribute("id", "li" + array[i]._id);
        li.appendChild(details_div);
        li.appendChild(note_options_div);
        li.appendChild(comments_div);
        ul.appendChild(li);
        this.safeSetState({
          app_is_loading: false,
        });
      }
      array_associate[i] = array[i]._id;
    }
  };
  show_profile = (boolean) => {
    this.safeSetState({
      profile: boolean,
    });
  };
  setAppFooterHidden = (shouldHide) => {
    const nextValue = Boolean(shouldHide);
    this.safeSetState({
      hide_app_footer: nextValue,
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        APP_HIDE_FOOTER_STORAGE_KEY,
        nextValue ? "true" : "false",
      );
    }
  };

  setAppScale = (nextScale) => {
    const resolvedScale = clampAppScale(nextScale);
    if (resolvedScale === this.state.appScale) {
      return;
    }

    this.safeSetState({
      appScale: resolvedScale,
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_SCALE_STORAGE_KEY, String(resolvedScale));
    }
  };

  setGraphicsScaleSetting = (elementId, scaleNum) => {
    const normalizedElementId = String(elementId || "").trim();
    if (!normalizedElementId) {
      return;
    }

    const resolvedScale = clampAppScale(scaleNum);
    let nextSettings = null;

    this.safeSetState((currentState) => {
      const currentSettings = normalizeAppSettings(currentState.settings);
      const currentScaleEntries = Array.isArray(currentSettings.ui?.scale)
        ? currentSettings.ui.scale
        : [];
      const nextScaleEntries = currentScaleEntries.filter(
        (entry) =>
          String(entry?.element || "").trim() !== normalizedElementId,
      );

      nextScaleEntries.push({
        element: normalizedElementId,
        scaleNum: resolvedScale,
      });

      nextSettings = {
        ...currentSettings,
        ui: {
          ...getSettingsUi(currentSettings),
          scale: nextScaleEntries,
          updatedAt: new Date().toISOString(),
        },
      };

      const nextState = {
        settings: nextSettings,
      };

      if (normalizedElementId === "app_page") {
        nextState.appScale = resolvedScale;
      }

      return nextState;
    }, () => {
      if (!nextSettings) {
        return;
      }

      this.persistStoredSession({
        settings: nextSettings,
        appScale:
          normalizedElementId === "app_page"
            ? resolvedScale
            : this.state.appScale,
      });

      this.applyScaleSettingsToDom(nextSettings.ui.scale);

      if (!this.state.token) {
        return;
      }

      fetch(apiUrl("/api/user/profile"), {
        method: "PUT",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          program: String(this.state.program || "").trim(),
          university: String(this.state.university || "").trim(),
          studyYear: String(this.state.studyYear || "").trim(),
          term: String(this.state.term || "").trim(),
          aiProvider: String(this.state.aiProvider || "openai").trim(),
          settings: nextSettings,
        }),
      }).catch(() => undefined);
    });
  };

  //.....Reander Login HTML..........
  render() {
    const isNogaPlanRoute =
      typeof window !== "undefined" &&
      (window.location.pathname.includes("/phenomed/schoolplanner/nogaplan") ||
        window.location.pathname.includes("/phenomed/nogaplan"));
    const normalizedUsername = String(this.state.username || "").toLowerCase();
    const isNaghamNogaFooter =
      isNogaPlanRoute && normalizedUsername === "naghamtrkmani";
    const showServerAnswerFooter = !this.state.hide_app_footer;
    const isNaghamTrkMani = normalizedUsername === "naghamtrkmani";
    const appPageClassName = `fc${showServerAnswerFooter ? "" : " app_page--footer-hidden"}${isNaghamTrkMani ? " app_page--has-background-pattern" : ""}`;
    const footerProps = {
      appState: this.state,
      onSetSelectedAiProvider: this.setSelectedAiProvider,
      onLogout: this.logOut,
      onApplyGraphicsScale: this.setGraphicsScaleSetting,
    };
    const appViewportStyle = {
      "--app-scale": this.state.appScale,
    };
    const routeFallback = (
      <section
        id="App_routeLoading"
        className="fc"
        aria-live="polite"
        aria-busy="true"
      >
        Loading...
      </section>
    );

    return (
      <React.Fragment>
        <div id="App_viewportScale" style={appViewportStyle}>
          <React.Suspense fallback={routeFallback}>
          <Route exact path="/phenomed/home">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <HomeNoga
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  dismissFriendRequest={this.dismissFriendRequest}
                  cancelSentFriendRequest={this.cancelSentFriendRequest}
                  removeFriend={this.removeFriend}
                  unblockFriend={this.unblockFriend}
                  updateUserInfo={this.updateUserInfo}
                  selectFriendChat={this.get_current_friend_chat_id}
                  closeActiveChat={this.closeActiveChat}
                  sendToThemMessage={this.sendToThemMessage}
                  uploadChatImages={this.uploadChatImages}
                  uploadChatAudio={this.uploadChatAudio}
                  saveChatImageToGallery={this.saveChatImageToGallery}
                  editChatMessage={this.editChatMessage}
                  deleteChatMessage={this.deleteChatMessage}
                  updateMyTypingPresence={this.updateMyTypingPresence}
                  markMessagesRead={this.markMessagesRead}
                  serverReply={this.serverReply}
                  requestGlobalCall={this.requestGlobalCall}
                  setAppFooterHidden={this.setAppFooterHidden}
                  setUserAcademicInfo={this.setUserAcademicInfo}
                  setUserMediaInfo={this.setUserMediaInfo}
                  homeBasePath="/phenomed/home"
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/home/noga">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <HomeNoga
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  dismissFriendRequest={this.dismissFriendRequest}
                  cancelSentFriendRequest={this.cancelSentFriendRequest}
                  removeFriend={this.removeFriend}
                  unblockFriend={this.unblockFriend}
                  updateUserInfo={this.updateUserInfo}
                  selectFriendChat={this.get_current_friend_chat_id}
                  closeActiveChat={this.closeActiveChat}
                  sendToThemMessage={this.sendToThemMessage}
                  uploadChatImages={this.uploadChatImages}
                  uploadChatAudio={this.uploadChatAudio}
                  saveChatImageToGallery={this.saveChatImageToGallery}
                  editChatMessage={this.editChatMessage}
                  deleteChatMessage={this.deleteChatMessage}
                  updateMyTypingPresence={this.updateMyTypingPresence}
                  markMessagesRead={this.markMessagesRead}
                  serverReply={this.serverReply}
                  requestGlobalCall={this.requestGlobalCall}
                  setAppFooterHidden={this.setAppFooterHidden}
                  setUserAcademicInfo={this.setUserAcademicInfo}
                  setUserMediaInfo={this.setUserMediaInfo}
                  homeBasePath="/phenomed/home"
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route path="/study">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyStudy
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  type={this.type}
                  show_profile={this.show_profile}
                  serverReply={this.serverReply}
                />{" "}
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/schoolplanner/nogaplan">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyNogaPlan
                  locale="ar"
                  state={this.state}
                  onPresenceModeChange={this.handleSubAppPresenceChange}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  type={this.type}
                  show_profile={this.show_profile}
                  memory={this.memory}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/nogaplan">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyNogaPlan
                  locale="ar"
                  state={this.state}
                  onPresenceModeChange={this.handleSubAppPresenceChange}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  type={this.type}
                  show_profile={this.show_profile}
                  memory={this.memory}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/schoolplanner/ar">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyStudyPlanner
                  locale="ar"
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  type={this.type}
                  show_profile={this.show_profile}
                  memory={this.memory}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/schoolplanner">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyStudyPlanner
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  type={this.type}
                  show_profile={this.show_profile}
                  memory={this.memory}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route path="/ecg">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyPhenomedECG
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/pdf-reader">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyPdfReaderPage
                  state={this.state}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/telegram-control">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyTelegramControlPage
                  state={this.state}
                  memory={this.memory}
                  logOut={this.logOut}
                  acceptFriend={this.acceptFriend}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/jamendo-player">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyJamendoPlayer
                  state={this.state}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/deezer-player">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyJamendoPlayer
                  state={this.state}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route exact path="/phenomed/soundcloud-player">
            <article id="app_page" className={appPageClassName}>
              <main id="Main_article" className="fr">
                <LazyJamendoPlayer
                  state={this.state}
                  serverReply={this.serverReply}
                />
              </main>
              {showServerAnswerFooter ? (
                <Footer {...footerProps} />
              ) : null}
            </article>
          </Route>
          <Route
            exact
            path={["/profile/:username", "/phenomed/:username"]}
            render={({ match }) => {
              const username = String(match?.params?.username || "").trim().toLowerCase();
              if (RESERVED_PROFILE_ROUTE_SEGMENTS.has(username)) {
                return null;
              }
              return (
                <article id="app_page" className={appPageClassName}>
                  <main id="Main_article" className="fr">
                    <LazyProfile viewerState={this.state} logOut={this.logOut} />
                  </main>
                  {showServerAnswerFooter ? (
                    <Footer {...footerProps} />
                  ) : null}
                </article>
              );
            }}
          />
          </React.Suspense>
        </div>
        {this.state.app_is_loading && (
          <div
            style={{
              fontSize: "20pt",
              display: "flex",
              position: "fixed",
              top: "0",
              bottom: "0",
              right: "0",
              left: "0",
              justifyContent: "center",
              alignContent: "center",
              flexDirection: "column",
              zIndex: "100",
            }}
          >
            <img
              src="/img/loader.gif"
              alt=""
              width="70px"
              style={{
                margin: "auto",
              }}
            />
          </div>
        )}
        <VoiceVideoCall
          appState={this.state}
          getRealtimeSocket={this.getRealtimeSocket}
          callRequest={this.state.global_call_request}
          onCallRequestHandled={this.handleGlobalCallRequestHandled}
          onSessionChange={this.handleGlobalCallSessionChange}
        />
      </React.Fragment>
    );
  }
}
export default App;

