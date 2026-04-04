import React from "react";
import { createPortal } from "react-dom";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import "./emojie_picker.css";
import "./friendchat.css";
import { apiUrl } from "../config/api";
import {
  attachStreamToElement,
  createPeerConnection,
  getIceCandidateType,
  getPeerConnectionDiagnostics,
  requestCallMedia,
  stopMediaStream,
} from "../realtime/webrtcCall";

const CHAT_CALL_PANEL_LAYOUT_STORAGE_KEY =
  "phenomed.friendChat.callPanelLayout";
const DEFAULT_CALL_PANEL_LAYOUT = {
  x: 24,
  y: 24,
  width: 360,
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
    second: "2-digit",
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

    if (String(event || "").startsWith("ice-diagnostics")) {
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

const FriendChat = ({
  state,
  content,
  sendToThemMessage,
  updateMyTypingPresence,
  markMessagesRead,
  getRealtimeSocket,
  requestGlobalCall,
  globalCallSession,
  closeActiveChat,
  hideTitleContainer = false,
  inlineCallActionsTarget = null,
}) => {
  const chatContent = content?.chat;
  const isChatting = Boolean(state?.isChatting);
  const hasActiveChat = Boolean(state?.activeChatFriendName);
  const friendIsChatting = state?.activeChatFriendId
    ? Boolean(state?.friendChatPresence?.[state.activeChatFriendId])
    : false;
  const friendIsTyping = state?.activeChatFriendId
    ? Boolean(state?.friendTypingPresence?.[state.activeChatFriendId])
    : false;
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const emojiPickerWrapRef = React.useRef(null);
  const emojiPickerRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const [localMessages, setLocalMessages] = React.useState([]);
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
  const typingDebounceTimeoutRef = React.useRef(null);
  const lastTypingStateRef = React.useRef(false);
  const activeCallPartnerRef = React.useRef("");
  const disconnectTimeoutRef = React.useRef(null);
  const diagnosticsIntervalRef = React.useRef(null);
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
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
        text: String(message?.message || "").trim(),
        sender: String(message?.from || "").trim() === "me" ? "me" : "friend",
        status: String(message?.status || "sent").trim().toLowerCase(),
        pending: false,
        timestamp:
          Number(new Date(message?.date).getTime()) || Date.now() + index,
        rawDate: message?.date,
      }));
  }, [state?.activeChatFriendId, state?.chat]);
  const activeFriendId = String(state?.activeChatFriendId || "").trim();
  const currentUserId = String(state?.my_id || "").trim();
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
  const globalToggleCamera =
    typeof normalizedGlobalCallSession?.toggleCamera === "function"
      ? normalizedGlobalCallSession.toggleCamera
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
  const [inlineCallElapsedMs, setInlineCallElapsedMs] = React.useState(0);
  const currentUserDisplayName =
    `${String(state?.firstname || "").trim()} ${String(state?.lastname || "").trim()}`.trim() ||
    String(state?.username || "").trim() ||
    "Doctor";

  React.useEffect(() => {
    if (!isGlobalCallActiveForFriend || !globalCallStartedAt) {
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
  }, [globalCallStartedAt, isGlobalCallActiveForFriend]);

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
      setCallMode("");
      setCallState(nextState);
      if (clearIncoming) {
        setIncomingCall(null);
      }
      setCallError(keepError ? nextError : "");
      setVideoOverlayScale(1);
      setVideoOverlayPosition({ x: 18, y: 18 });
    },
    [releasePeerConnection, resetCallMedia],
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
          logCallDebug("friend", "ice-candidate-local", {
            candidateType: getIceCandidateType(candidate),
            friendId: activeCallPartnerRef.current,
          });
          socket.emit("call:ice-candidate", {
            toUserId: activeCallPartnerRef.current,
            candidate,
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
    const socket = getRealtimeSocket?.();

    if (!socket) {
      return undefined;
    }

    const handleOffer = ({ fromUserId, offer, callType, metadata }) => {
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
        metadata: metadata && typeof metadata === "object" ? metadata : {},
      });
      setCallMode(callType === "video" ? "video" : "audio");
      setCallState("incoming");
      setCallError("");
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

      teardownCall({
        keepError: true,
        nextError: "The call was declined.",
      });
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:end", handleEnd);
    socket.on("call:reject", handleReject);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:end", handleEnd);
      socket.off("call:reject", handleReject);
    };
  }, [
    activeFriendId,
    flushQueuedIceCandidates,
    getRealtimeSocket,
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

  const handleSend = () => {
    const textarea = textareaRef.current;
    const message = textarea ? textarea.value : "";
    if (!message.trim()) return;

    // Optimistically add message
    const tempId = generateTempId();
    setLocalMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: message,
        sender: "me",
        pending: true,
        timestamp: Date.now(),
      },
    ]);

    if (sendToThemMessage) {
      Promise.resolve(sendToThemMessage(message, tempId)).then((didSend) => {
        if (didSend === false) {
          setLocalMessages((prev) =>
            prev.filter((pendingMessage) => pendingMessage.id !== tempId),
          );
        }
      });
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
              remoteMessage.sender === "me" && remoteMessage.text === msg.text,
          ),
      ),
    );
  }, [normalizedRemoteMessages]);

  // Combine local and backend messages for display
  const allMessages = [
    ...normalizedRemoteMessages,
    ...localMessages.filter((msg) => msg.pending),
  ];

  const setTypingPresence = React.useCallback(
    (nextIsTyping, { immediate = false } = {}) => {
      if (!state?.activeChatFriendId || !updateMyTypingPresence) {
        return;
      }

      const normalizedValue = Boolean(nextIsTyping);

      if (typingDebounceTimeoutRef.current) {
        window.clearTimeout(typingDebounceTimeoutRef.current);
        typingDebounceTimeoutRef.current = null;
      }

      if (lastTypingStateRef.current === normalizedValue && !immediate) {
        return;
      }

      const emitTypingPresence = () => {
        lastTypingStateRef.current = normalizedValue;
        updateMyTypingPresence(state.activeChatFriendId, normalizedValue);
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
    setTypingPresence(Boolean(event.target.value.trim()));
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

    try {
      setCallError("");
      setIncomingCall(null);
      setCallMode(nextCallMode);
      setCallState("requesting-media");

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
        callType: nextCallMode,
        offer: peerConnection.localDescription,
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
        reason: "declined",
      });
    }

    teardownCall({
      keepError: true,
      nextError: "Incoming call declined.",
    });
  };

  const handleEndCall = (reason = "ended") => {
    const socket = getRealtimeSocket?.();
    const targetUserId =
      activeCallPartnerRef.current ||
      incomingCall?.fromUserId ||
      activeFriendId;

    if (socket && targetUserId) {
      socket.emit("call:end", {
        toUserId: targetUserId,
        reason,
      });
    }

    teardownCall();
  };

  const inlineCallActions =
    hideTitleContainer && hasActiveChat ? (
      <div className="Chat_inlineCallActions Home_socialFriendPresence fr">
        {isGlobalCallActiveForFriend ? (
          <>
            <span className="Chat_inlineCallElapsed" aria-label="Call duration">
              {formatCallElapsed(inlineCallElapsedMs)}
            </span>
            <button
              type="button"
              className={`Chat_callButton${globalAudioMuted ? " is-muted" : ""}`}
              title={globalAudioMuted ? "Enable microphone" : "Disable microphone"}
              aria-label={globalAudioMuted ? "Enable microphone" : "Disable microphone"}
              onClick={globalToggleMute || undefined}
              disabled={!globalToggleMute}
            >
              <i
                className={`fas ${globalAudioMuted ? "fa-microphone-slash" : "fa-microphone"}`}
                aria-hidden="true"
              ></i>
            </button>
            {globalCallMode === "video" ? (
              <button
                type="button"
                className={`Chat_callButton${globalVideoMuted ? " is-muted" : ""}`}
                title={globalVideoMuted ? "Enable camera" : "Disable camera"}
                aria-label={globalVideoMuted ? "Enable camera" : "Disable camera"}
                onClick={globalToggleCamera || undefined}
                disabled={!globalToggleCamera}
              >
                <i
                  className={`fas ${globalVideoMuted ? "fa-video-slash" : "fa-video"}`}
                  aria-hidden="true"
                ></i>
              </button>
            ) : null}
            <button
              type="button"
              className="Chat_callButton Chat_callButton--end"
              title="End call"
              aria-label="End call"
              onClick={() => handleEndCall("hangup")}
            >
              <i className="fas fa-phone-slash" aria-hidden="true"></i>
            </button>
          </>
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
    left: `${callPanelLayout.x}px`,
    top: `${callPanelLayout.y}px`,
    width: `${callPanelLayout.width}px`,
    height: `${callPanelLayout.height}px`,
  };
  const showCallControls =
    callMode !== "video" || isRemoteVideoHovered || isCallControlsPinned;
  const shouldRenderCallPanel =
    !usesGlobalCallPanel && Boolean(callMode) && callState !== "incoming";

  return (
    <section id="FriendChat_article" className="fc">
      <div id="FriendChat_content_container" className="fc">
        <section id="Chat_article" className="fc">
          {hideTitleContainer ? null : (
            <section id="Chat_title_container" className="fr">
              <i
                className="fas fa-chevron-circle-left"
                id="Chat_goback_icon"
                onClick={() => {
                  const phenomedIntro = document.querySelector(
                    ".PhenomedSocial_intro",
                  );
                  const friendsListArticle = document.getElementById(
                    "FriendsList_article",
                  );
                  const addFriendArticle =
                    document.getElementById("AddFriend_article");
                  const friendChatArticle =
                    document.getElementById("FriendChat_article");

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
                }}
              ></i>
              <div id="Chat_title_copy" className="fc">
                <h1 id="Chat_title_text">
                  {state?.activeChatFriendName || chatContent?.title || "Chat"}
                </h1>
                {hasActiveChat && (
                  <p id="Chat_title_status">
                    {friendIsChatting
                      ? "In Chat"
                      : state?.friends?.find?.(
                            (friend) =>
                              String(friend?._id || "").trim() ===
                              activeFriendId,
                          )?.status?.isConnected
                        ? "Online"
                        : chatContent?.offlineLabel || "offline"}
                  </p>
                )}
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
                    <i className="fas fa-phone-alt"></i>
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
                    <i className="fas fa-video"></i>
                  </button>
                </div>
              ) : null}
            </section>
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
                ? inlineCallActionsTarget
                  ? createPortal(inlineCallActions, inlineCallActionsTarget)
                  : inlineCallActions
                : null}
              {!usesGlobalCallPanel && incomingCall ? (
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
                    <span>
                      {callState === "calling"
                        ? "Calling..."
                        : callState === "incoming"
                          ? "Incoming call"
                          : callState === "requesting-media"
                            ? "Requesting media..."
                            : callState === "connecting"
                              ? "Connecting..."
                              : callState === "connected"
                                ? "Connected"
                                : "Ready"}
                    </span>
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
              <ul id="Chat_messages" data-react-managed="true">
                {allMessages.length === 0 ? (
                  <li id="FriendChat_empty_state">
                    {chatContent?.empty ||
                      "Open a conversation to view messages here."}
                  </li>
                ) : (
                  allMessages.map((msg, index) => (
                    <div
                      key={`${msg.id || msg.timestamp}-${msg.rawDate || ""}-${msg.sender}-${index}`}
                      className={
                        msg.sender === "me"
                          ? "sentMessagesDIV fc"
                          : "receivedMessagesDIV fc"
                      }
                    >
                      <li
                        className={
                          msg.sender === "me"
                            ? "sentMessagesLI"
                            : "receivedMessagesLI"
                        }
                        style={
                          msg.pending
                            ? { opacity: 0.6, fontStyle: "italic" }
                            : undefined
                        }
                      >
                        <p>{msg.text}</p>
                        <span className="Chat_messageMeta">
                          <span className="Chat_messageTimestamp">
                            {formatChatTimestamp(msg.rawDate, msg.timestamp)}
                          </span>
                          {msg.sender === "me" ? (
                            <span
                              className={`Chat_messageStatus ${
                                msg.pending
                                  ? "Chat_messageStatus--sent"
                                  : msg.status === "read"
                                    ? "Chat_messageStatus--read"
                                    : "Chat_messageStatus--received"
                              }`}
                            >
                              {msg.pending ? "..." : "✓"}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    </div>
                  ))
                )}
              </ul>
              <section id="Chat_form" className="fr">
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
                      <i className="fas fa-smile" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
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
                >
                  <i className="fc far fa-paper-plane"></i>
                </button>
              </section>
              <div
                id="Chat_emoji_mount"
                className="fc"
                style={{
                  height: isEmojiPickerOpen ? "40%" : "0",
                }}
              >
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
                          emojiStyle={EmojiStyle.APPLE}
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
            </React.Fragment>
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default FriendChat;
