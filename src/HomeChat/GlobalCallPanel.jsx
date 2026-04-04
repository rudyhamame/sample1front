import React from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../config/api";
import {
  attachStreamToElement,
  createPeerConnection,
  getIceCandidateType,
  getPeerConnectionDiagnostics,
  requestCallMedia,
  stopMediaStream,
} from "../realtime/webrtcCall";
import "./globalcall.css";

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

const clampValue = (value, min, max) => {
  if (!Number.isFinite(value)) {
    return min;
  }

  if (min > max) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
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
  } catch {
    // Ignore console failures.
  }
};

const getFriendDisplayName = (friends, userId, fallback = "") => {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    return String(fallback || "").trim();
  }

  const friend = (Array.isArray(friends) ? friends : []).find(
    (entry) => String(entry?._id || "").trim() === normalizedUserId,
  );

  const firstName = String(friend?.info?.firstname || "").trim();
  const lastName = String(friend?.info?.lastname || "").trim();
  const username = String(friend?.info?.username || "").trim();

  return (
    `${firstName} ${lastName}`.trim() ||
    username ||
    String(fallback || "").trim() ||
    "Your friend"
  );
};

function GlobalCallPanel({
  appState,
  getRealtimeSocket,
  callRequest,
  onCallRequestHandled,
  onSessionChange,
}) {
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
  const activeCallPartnerRef = React.useRef("");
  const disconnectTimeoutRef = React.useRef(null);
  const diagnosticsIntervalRef = React.useRef(null);
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [callStartedAt, setCallStartedAt] = React.useState(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = React.useState(0);
  const [localStreamVersion, setLocalStreamVersion] = React.useState(0);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  const [activeCallDisplayName, setActiveCallDisplayName] = React.useState("");
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

  const friends = appState?.friends;
  const currentUserId = String(appState?.my_id || "").trim();
  const currentUserDisplayName =
    `${String(appState?.firstname || "").trim()} ${String(appState?.lastname || "").trim()}`.trim() ||
    String(appState?.username || "").trim() ||
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
      setActiveCallDisplayName("");
      setCallStartedAt(null);
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

    logCallDebug("global", event, {
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
      headers: appState?.token
        ? {
            Authorization: `Bearer ${appState.token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error("Unable to load call configuration.");
    }

    const payload = await response.json().catch(() => ({}));
    logCallDebug("global", "rtc-config-loaded", {
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
  }, [appState?.token]);

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
          logCallDebug("global", "ice-candidate-local", {
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
          logCallDebug("global", "connection-state", {
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
          logCallDebug("global", "ice-connection-state", {
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

  const handleStartCall = React.useCallback(
    async ({ friendId, friendName, mode }) => {
      const targetUserId = String(friendId || "").trim();
      const nextCallMode = mode === "video" ? "video" : "audio";

      if (!targetUserId || !currentUserId) {
        return;
      }

      try {
        setCallError("");
        setIncomingCall(null);
        setCallStartedAt(Date.now());
        setCallMode(nextCallMode);
        setCallState("requesting-media");
        setActiveCallDisplayName(
          getFriendDisplayName(friends, targetUserId, friendName),
        );

        const socket = getRealtimeSocket?.();

        if (!socket) {
          throw new Error("Realtime connection is not ready.");
        }

        const localStream = await requestCallMedia(nextCallMode);
        localStreamRef.current = localStream;
        setLocalStreamVersion((value) => value + 1);
        setIsAudioMuted(false);
        setIsVideoMuted(false);

        const peerConnection = await createManagedPeerConnection(targetUserId);
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: nextCallMode === "video",
        });

        await peerConnection.setLocalDescription(offer);
        logCallDebug("global", "offer-created", {
          friendId: targetUserId,
          callMode: nextCallMode,
        });

        socket.emit("call:offer", {
          toUserId: targetUserId,
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
    },
    [
      createManagedPeerConnection,
      currentUserDisplayName,
      currentUserId,
      friends,
      getRealtimeSocket,
      teardownCall,
    ],
  );

  const handleAcceptIncomingCall = React.useCallback(async () => {
    if (!incomingCall?.fromUserId || !incomingCall?.offer) {
      return;
    }

    try {
      setCallError("");
      setCallStartedAt(Date.now());
      setCallMode(incomingCall.callType);
      setCallState("requesting-media");
      setActiveCallDisplayName(
        getFriendDisplayName(
          friends,
          incomingCall.fromUserId,
          incomingCall?.metadata?.fromDisplayName,
        ),
      );

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
      logCallDebug("global", "answer-created", {
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
  }, [
    createManagedPeerConnection,
    flushQueuedIceCandidates,
    friends,
    getRealtimeSocket,
    incomingCall,
    teardownCall,
  ]);

  const handleRejectIncomingCall = React.useCallback(() => {
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
  }, [getRealtimeSocket, incomingCall, teardownCall]);

  const handleEndCall = React.useCallback(
    (reason = "ended") => {
      const socket = getRealtimeSocket?.();
      const targetUserId =
        activeCallPartnerRef.current ||
        incomingCall?.fromUserId ||
        String(callRequest?.friendId || "").trim();

      if (socket && targetUserId) {
        socket.emit("call:end", {
          toUserId: targetUserId,
          reason,
        });
      }

      teardownCall();
    },
    [callRequest?.friendId, getRealtimeSocket, incomingCall, teardownCall],
  );

  const handleToggleMute = React.useCallback(() => {
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
  }, [isAudioMuted]);

  const handleToggleCamera = React.useCallback(() => {
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
  }, [isVideoMuted]);

  React.useEffect(() => {
    syncMediaElements();
  }, [localStreamVersion, remoteStreamVersion, syncMediaElements]);

  React.useEffect(() => () => teardownCall(), [teardownCall]);

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
    } catch {
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

  React.useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = videoOverlayDragRef.current;
      const resizeState = videoOverlayResizeRef.current;

      if (resizeState) {
        event.preventDefault();

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

  React.useEffect(() => {
    const socket = getRealtimeSocket?.();

    if (!socket) {
      return undefined;
    }

    const handleOffer = ({ fromUserId, offer, callType, metadata }) => {
      const normalizedFromUserId = String(fromUserId || "").trim();

      if (!normalizedFromUserId || normalizedFromUserId === currentUserId) {
        return;
      }

      if (callState !== "idle" || callMode || incomingCall) {
        socket.emit("call:reject", {
          toUserId: normalizedFromUserId,
          reason: "busy",
        });
        return;
      }

      logCallDebug("global", "offer-received", {
        fromUserId: normalizedFromUserId,
        callType,
      });

      setIncomingCall({
        fromUserId: normalizedFromUserId,
        offer,
        callType: callType === "video" ? "video" : "audio",
        metadata: metadata && typeof metadata === "object" ? metadata : {},
      });
      setActiveCallDisplayName(
        getFriendDisplayName(
          friends,
          normalizedFromUserId,
          metadata?.fromDisplayName,
        ),
      );
      setCallMode(callType === "video" ? "video" : "audio");
      setCallState("incoming");
      setCallError("");
    };

    const handleAnswer = async ({ fromUserId, answer }) => {
      if (
        String(fromUserId || "").trim() !== activeCallPartnerRef.current ||
        !answer
      ) {
        return;
      }

      logCallDebug("global", "answer-received", {
        fromUserId: String(fromUserId || "").trim(),
      });

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
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
        String(fromUserId || "").trim() !== activeCallPartnerRef.current ||
        !candidate
      ) {
        return;
      }

      logCallDebug("global", "ice-candidate-remote", {
        fromUserId: String(fromUserId || "").trim(),
        candidateType: getIceCandidateType(candidate),
      });

      const peerConnection = peerConnectionRef.current;

      if (!peerConnection || !peerConnection.remoteDescription) {
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
      if (String(fromUserId || "").trim() !== activeCallPartnerRef.current) {
        return;
      }

      teardownCall({
        keepError: true,
        nextError: "The call ended.",
      });
    };

    const handleReject = ({ fromUserId }) => {
      if (String(fromUserId || "").trim() !== activeCallPartnerRef.current) {
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
    callMode,
    callState,
    currentUserId,
    flushQueuedIceCandidates,
    friends,
    getRealtimeSocket,
    incomingCall,
    teardownCall,
  ]);

  React.useEffect(() => {
    if (!callRequest?.id) {
      return undefined;
    }

    onCallRequestHandled?.(callRequest.id);

    if (callState !== "idle" || callMode || incomingCall) {
      setCallError("Finish the current call first.");
      return undefined;
    }

    handleStartCall({
      friendId: callRequest.friendId,
      friendName: callRequest.friendName,
      mode: callRequest.mode,
    });

    return undefined;
  }, [
    callMode,
    callRequest,
    callState,
    handleStartCall,
    incomingCall,
    onCallRequestHandled,
  ]);

  React.useEffect(() => {
    const activeCallPartnerId =
      activeCallPartnerRef.current ||
      String(incomingCall?.fromUserId || "").trim();

    if (!callMode && !incomingCall) {
      onSessionChange?.(null);
      return;
    }

    onSessionChange?.({
      callState,
      callMode,
      incomingCall,
      activeCallPartnerId,
      activeCallDisplayName:
        activeCallDisplayName ||
        getFriendDisplayName(friends, activeCallPartnerId),
      callStartedAt,
      isAudioMuted,
      isVideoMuted,
      toggleMute:
        activeCallPartnerId && !incomingCall ? handleToggleMute : null,
      toggleCamera:
        callMode === "video" && activeCallPartnerId && !incomingCall
          ? handleToggleCamera
          : null,
      acceptIncomingCall: incomingCall ? handleAcceptIncomingCall : null,
      declineIncomingCall: incomingCall ? handleRejectIncomingCall : null,
    });
  }, [
    activeCallDisplayName,
    callStartedAt,
    callMode,
    callState,
    friends,
    handleAcceptIncomingCall,
    handleToggleCamera,
    handleToggleMute,
    handleRejectIncomingCall,
    incomingCall,
    isAudioMuted,
    isVideoMuted,
    onSessionChange,
  ]);

  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById("app_page")
      : null;

  if (!portalTarget || (!callMode && !incomingCall && !callError)) {
    return null;
  }

  const callPanelStyle = {
    left: `${callPanelLayout.x}px`,
    top: `${callPanelLayout.y}px`,
    width: `${callPanelLayout.width}px`,
    height: `${callPanelLayout.height}px`,
  };

  const displayName =
    activeCallDisplayName ||
    getFriendDisplayName(
      friends,
      activeCallPartnerRef.current || incomingCall?.fromUserId,
    );
  const showCallControls =
    callMode !== "video" || isRemoteVideoHovered || isCallControlsPinned;
  const shouldRenderCallPanel = Boolean(callMode) && callState !== "incoming";

  return createPortal(
    <React.Fragment>
      <audio id="Chat_remoteAudio" ref={remoteAudioRef} autoPlay playsInline />
      <audio
        id="Chat_localAudio"
        ref={localAudioRef}
        autoPlay
        playsInline
        muted
      />
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
              <React.Fragment>
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
              </React.Fragment>
            ) : (
              <React.Fragment>
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
              </React.Fragment>
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
              onPointerDown={(event) => handleCallPanelResizeStart(edge, event)}
            />
          ))}
        </section>
      ) : null}
      {callError ? (
        <div id="Chat_callError" className="Chat_callError">
          {callError}
        </div>
      ) : null}
    </React.Fragment>,
    portalTarget,
  );
}

export default GlobalCallPanel;
