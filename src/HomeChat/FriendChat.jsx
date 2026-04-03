import React from "react";
import { createPortal } from "react-dom";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import "./emojie_picker.css";
import "./friendchat.css";
import { apiUrl } from "../config/api";
import {
  attachStreamToElement,
  createPeerConnection,
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
const CALL_PANEL_MIN_WIDTH = 300;
const CALL_PANEL_MIN_HEIGHT = 220;
const CALL_PANEL_MARGIN = 16;

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

const FriendChat = ({
  state,
  content,
  sendToThemMessage,
  updateMyTypingPresence,
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
  const callPanelInteractionRef = React.useRef(null);
  const peerConnectionRef = React.useRef(null);
  const localStreamRef = React.useRef(null);
  const remoteStreamRef = React.useRef(null);
  const rtcConfigRef = React.useRef(null);
  const queuedIceCandidatesRef = React.useRef([]);
  const typingDebounceTimeoutRef = React.useRef(null);
  const lastTypingStateRef = React.useRef(false);
  const activeCallPartnerRef = React.useRef("");
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = React.useState(0);
  const [localStreamVersion, setLocalStreamVersion] = React.useState(0);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  const [videoOverlayPosition, setVideoOverlayPosition] = React.useState({
    x: 18,
    y: 18,
  });
  const [videoOverlayScale, setVideoOverlayScale] = React.useState(1);
  const [callPanelLayout, setCallPanelLayout] = React.useState(
    DEFAULT_CALL_PANEL_LAYOUT,
  );
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
  const globalCallIsBusy =
    globalCallState !== "idle" ||
    Boolean(normalizedGlobalCallSession?.callMode) ||
    Boolean(globalIncomingCall);
  const currentUserDisplayName =
    `${String(state?.firstname || "").trim()} ${String(state?.lastname || "").trim()}`.trim() ||
    String(state?.username || "").trim() ||
    "Doctor";

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

    if (!stageElement) {
      return {
        x: Math.max(0, Number(nextPosition?.x) || 0),
        y: Math.max(0, Number(nextPosition?.y) || 0),
      };
    }

    const stageWidth = stageElement.clientWidth || 0;
    const stageHeight = stageElement.clientHeight || 0;
    const panelWidth = 320 * scale;
    const panelHeight = 228 * scale;

    return {
      x: clampValue(
        Number(nextPosition?.x) || 0,
        0,
        Math.max(stageWidth - panelWidth, 0),
      ),
      y: clampValue(
        Number(nextPosition?.y) || 0,
        0,
        Math.max(stageHeight - panelHeight, 0),
      ),
    };
  }, []);

  const setVideoOverlayScaleClamped = React.useCallback(
    (nextScale) => {
      const normalizedScale = clampValue(nextScale, 0.72, 1.45);
      setVideoOverlayScale(normalizedScale);
      setVideoOverlayPosition((currentPosition) =>
        clampVideoOverlayPosition(currentPosition, normalizedScale),
      );
    },
    [clampVideoOverlayPosition],
  );

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
          if (connectionState === "connected") {
            setCallState("connected");
            setCallError("");
            return;
          }

          if (connectionState === "connecting") {
            setCallState("connecting");
            return;
          }

          if (
            connectionState === "failed" ||
            connectionState === "disconnected" ||
            connectionState === "closed"
          ) {
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
          if (iceConnectionState === "failed") {
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
      getRealtimeSocket,
      loadRtcConfiguration,
      releasePeerConnection,
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

  const inlineCallActions =
    hideTitleContainer && hasActiveChat ? (
      <div className="Chat_inlineCallActions Home_socialFriendPresence fr">
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
      </div>
    ) : null;

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
      setVideoOverlayScale(1);
      setVideoOverlayPosition({ x: 18, y: 18 });
      return undefined;
    }

    setVideoOverlayPosition((currentPosition) =>
      clampVideoOverlayPosition(currentPosition, videoOverlayScale),
    );

    return undefined;
  }, [callMode, clampVideoOverlayPosition, videoOverlayScale]);

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
        const draftLayout = {
          ...currentLayout,
          x: interaction.originX,
          y: interaction.originY,
          width: interaction.originWidth,
          height: interaction.originHeight,
        };

        if (interaction.edge.includes("e")) {
          draftLayout.width = interaction.originWidth + deltaX;
        }

        if (interaction.edge.includes("s")) {
          draftLayout.height = interaction.originHeight + deltaY;
        }

        if (interaction.edge.includes("w")) {
          draftLayout.width = interaction.originWidth - deltaX;
          draftLayout.x = interaction.originX + deltaX;
        }

        if (interaction.edge.includes("n")) {
          draftLayout.height = interaction.originHeight - deltaY;
          draftLayout.y = interaction.originY + deltaY;
        }

        return clampCallPanelLayout(draftLayout);
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
              {!usesGlobalCallPanel && callMode ? (
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
                  >
                    {callMode === "video" ? (
                      <>
                        <div className="Chat_mediaTile Chat_mediaTile--remote Chat_mediaTile--floatingRemote">
                          <video
                            id="Chat_remoteVideo"
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                          />
                        </div>
                        <div
                          className="Chat_videoOverlay fc"
                          style={{
                            left: `${videoOverlayPosition.x}px`,
                            top: `${videoOverlayPosition.y}px`,
                            transform: `scale(${videoOverlayScale})`,
                          }}
                        >
                          <div className="Chat_videoOverlayHeader fr">
                            <div className="Chat_videoOverlayScaleControls fr">
                              <button
                                type="button"
                                className="Chat_videoOverlayScaleButton"
                                onClick={() =>
                                  setVideoOverlayScaleClamped(
                                    videoOverlayScale - 0.12,
                                  )
                                }
                                aria-label="Shrink video"
                                title="Shrink video"
                              >
                                <i className="fas fa-search-minus"></i>
                              </button>
                              <button
                                type="button"
                                className="Chat_videoOverlayScaleButton"
                                onClick={() =>
                                  setVideoOverlayScaleClamped(
                                    videoOverlayScale + 0.12,
                                  )
                                }
                                aria-label="Enlarge video"
                                title="Enlarge video"
                              >
                                <i className="fas fa-search-plus"></i>
                              </button>
                            </div>
                          </div>
                          <div className="Chat_videoOverlayBody">
                            <div className="Chat_mediaTile Chat_mediaTile--local Chat_mediaTile--floatingLocal">
                              <video
                                id="Chat_localVideo"
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                              />
                            </div>
                          </div>
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
                  <div className="Chat_callControls fr">
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
