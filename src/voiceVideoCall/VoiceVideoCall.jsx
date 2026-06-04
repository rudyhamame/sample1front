import React from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../config/api";
import {
  attachStreamToElement,
  requestCallMedia,
  stopMediaStream,
} from "../realtime/webrtcCall";
import {
  startOutgoingCallTone,
  startIncomingCallTone,
  stopOutgoingCallTone,
  stopIncomingCallTone,
} from "../realtime/callTone";
import {
  RoomEvent,
  Track,
  addTrackToStream,
  buildLiveKitRoomName,
  createCallRoom,
  removeTrackFromStream,
  syncParticipantTracks,
} from "../realtime/livekitCall";
import "./VoiceVideoCall.css";

const DEFAULT_CALL_PANEL_LAYOUT = {
  x: 24,
  y: 24,
  width: 360,
  height: 430,
};
const DEFAULT_VIDEO_OVERLAY_LAYOUT = {
  x: 18,
  y: 18,
};
const CALL_NO_ANSWER_TIMEOUT_MS = 30000;
const VOICE_CALL_MINIMIZED_STORAGE_KEY =
  "phenomed.voiceCall.windowMinimized";

const logCallDebug = (scope, event, details = {}) => {
  try {
    console.info(`[call][${scope}] ${event}`, details);
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

function VoiceVideoCall({
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
  const roomRef = React.useRef(null);
  const localStreamRef = React.useRef(null);
  const localPreviewStreamRef = React.useRef(null);
  const remoteStreamRef = React.useRef(null);
  const activeCallPartnerRef = React.useRef("");
  const activeRoomNameRef = React.useRef("");
  const manualDisconnectRef = React.useRef(false);
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [callStartedAt, setCallStartedAt] = React.useState(null);
  const [callElapsedMs, setCallElapsedMs] = React.useState(0);
  const [remoteStreamVersion, setRemoteStreamVersion] = React.useState(0);
  const [localStreamVersion, setLocalStreamVersion] = React.useState(0);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  const [activeCallDisplayName, setActiveCallDisplayName] = React.useState("");
  const [isFooterCallMinimized, setIsFooterCallMinimized] = React.useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(VOICE_CALL_MINIMIZED_STORAGE_KEY) === "true"
      : false,
  );

  const friends = appState?.friends;
  const currentUserId = String(appState?.my_id || "").trim();
  const currentUserDisplayName =
    `${String(appState?.firstname || "").trim()} ${String(appState?.lastname || "").trim()}`.trim() ||
    String(appState?.username || "").trim() ||
    "Doctor";
  const ringtoneSourceKey = React.useMemo(
    () => `global-call:${currentUserId || "unknown"}`,
    [currentUserId],
  );

  const updateFooterMinimizedState = React.useCallback((nextValue) => {
    const normalizedValue = Boolean(nextValue);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        VOICE_CALL_MINIMIZED_STORAGE_KEY,
        normalizedValue ? "true" : "false",
      );
      window.dispatchEvent(
        new CustomEvent(
          normalizedValue
            ? "voice-call-window-minimized"
            : "voice-call-window-restored",
        ),
      );
    }

    setIsFooterCallMinimized(normalizedValue);
  }, []);

  const minimizeVoiceCallWindow = React.useCallback(() => {
    updateFooterMinimizedState(true);
  }, [updateFooterMinimizedState]);

  const restoreVoiceCallWindow = React.useCallback(() => {
    updateFooterMinimizedState(false);
  }, [updateFooterMinimizedState]);

  const syncMediaElements = React.useCallback(() => {
    const activeLocalStream = localStreamRef.current || localPreviewStreamRef.current;

    attachStreamToElement(localAudioRef.current, localStreamRef.current, {
      muted: true,
    });
    attachStreamToElement(remoteAudioRef.current, remoteStreamRef.current, {
      muted: false,
    });
    attachStreamToElement(localVideoRef.current, activeLocalStream, {
      muted: true,
    });
    attachStreamToElement(remoteVideoRef.current, remoteStreamRef.current, {
      muted: false,
    });
  }, []);

  const resetMediaStreams = React.useCallback(() => {
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    stopMediaStream(localPreviewStreamRef.current);
    localPreviewStreamRef.current = null;
    stopMediaStream(remoteStreamRef.current);
    remoteStreamRef.current = null;
    setLocalStreamVersion((value) => value + 1);
    setRemoteStreamVersion((value) => value + 1);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  }, []);

  const leaveRoom = React.useCallback(() => {
    manualDisconnectRef.current = true;

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    activeRoomNameRef.current = "";
  }, []);

  const teardownCall = React.useCallback(
    ({
      keepError = false,
      nextError = "",
      nextState = "idle",
      clearIncoming = true,
    } = {}) => {
      stopIncomingCallTone(ringtoneSourceKey);
      leaveRoom();
      resetMediaStreams();
      activeCallPartnerRef.current = "";
      setActiveCallDisplayName("");
      setCallStartedAt(null);
      setCallMode("");
      setCallState(nextState);
      if (clearIncoming) {
        setIncomingCall(null);
      }
      setCallError(keepError ? nextError : "");
      updateFooterMinimizedState(false);
    },
    [
      leaveRoom,
      resetMediaStreams,
      ringtoneSourceKey,
      updateFooterMinimizedState,
    ],
  );

  const fetchLiveKitConnection = React.useCallback(
    async (roomName, nextCallMode) => {
      const response = await fetch(apiUrl("/api/user/livekit/token"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(appState?.token
            ? {
                Authorization: `Bearer ${appState.token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          roomName,
          callType: nextCallMode,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message || "Unable to get LiveKit connection details.",
        );
      }

      return response.json();
    },
    [appState?.token],
  );

  const prepareLocalMedia = React.useCallback(async (nextCallMode) => {
    if (localPreviewStreamRef.current) {
      return localPreviewStreamRef.current;
    }

    const previewStream = await requestCallMedia(nextCallMode);
    localPreviewStreamRef.current = previewStream;
    setLocalStreamVersion((value) => value + 1);
    setIsAudioMuted(false);
    setIsVideoMuted(nextCallMode !== "video");
    return previewStream;
  }, []);

  const joinRoom = React.useCallback(
    async ({ roomName, partnerUserId, nextCallMode }) => {
      const connection = await fetchLiveKitConnection(roomName, nextCallMode);
      const room = createCallRoom();

      manualDisconnectRef.current = false;
      activeRoomNameRef.current = roomName;

      const handleLocalTrackAdded = (track) => {
        if (localPreviewStreamRef.current) {
          stopMediaStream(localPreviewStreamRef.current);
          localPreviewStreamRef.current = null;
        }

        if (addTrackToStream(localStreamRef, track)) {
          setLocalStreamVersion((value) => value + 1);
        }
      };

      const handleLocalTrackRemoved = (track) => {
        if (removeTrackFromStream(localStreamRef, track)) {
          setLocalStreamVersion((value) => value + 1);
        }
      };

      const handleRemoteTrackAdded = (track) => {
        if (addTrackToStream(remoteStreamRef, track)) {
          setRemoteStreamVersion((value) => value + 1);
        }
      };

      const handleRemoteTrackRemoved = (track) => {
        if (removeTrackFromStream(remoteStreamRef, track)) {
          setRemoteStreamVersion((value) => value + 1);
        }
      };

      room
        .on(RoomEvent.TrackSubscribed, (track) => {
          handleRemoteTrackAdded(track);
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          handleRemoteTrackRemoved(track);
        })
        .on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication?.track) {
            handleLocalTrackAdded(publication.track);
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication?.track) {
            handleLocalTrackRemoved(publication.track);
          }
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          remoteStreamRef.current = null;
          setRemoteStreamVersion((value) => value + 1);
        })
        .on(RoomEvent.Disconnected, () => {
          roomRef.current = null;

          if (manualDisconnectRef.current) {
            manualDisconnectRef.current = false;
            return;
          }

          teardownCall({
            keepError: true,
            nextError: "The call disconnected.",
          });
        })
        .on(RoomEvent.Reconnecting, () => {
          setCallState("connecting");
        })
        .on(RoomEvent.Reconnected, () => {
          setCallState("connected");
          setCallError("");
        });

      roomRef.current = room;
      await room.connect(connection.url, connection.token, {
        autoSubscribe: true,
      });

      await room.localParticipant.setMicrophoneEnabled(true);
      if (nextCallMode === "video") {
        await room.localParticipant.setCameraEnabled(true);
      }

      syncParticipantTracks(room.localParticipant, localStreamRef);
      room.remoteParticipants.forEach((participant) => {
        syncParticipantTracks(participant, remoteStreamRef, {
          kind: Track.Kind.Video,
        });
        syncParticipantTracks(participant, remoteStreamRef, {
          kind: Track.Kind.Audio,
        });
      });

      setLocalStreamVersion((value) => value + 1);
      setRemoteStreamVersion((value) => value + 1);
      setCallStartedAt(Date.now());
      setCallState("connected");
      setCallError("");
      activeCallPartnerRef.current = String(partnerUserId || "").trim();
      logCallDebug("global", "livekit-room-connected", {
        roomName,
        friendId: activeCallPartnerRef.current,
        callMode: nextCallMode,
      });
    },
    [fetchLiveKitConnection, teardownCall],
  );

  const handleStartCall = React.useCallback(
    async ({ friendId, friendName, mode }) => {
      const targetUserId = String(friendId || "").trim();
      const nextCallMode = mode === "video" ? "video" : "audio";

      if (!targetUserId || !currentUserId) {
        return;
      }

      try {
        const roomName = buildLiveKitRoomName(currentUserId, targetUserId);
        const socket = getRealtimeSocket?.();

        if (!socket) {
          throw new Error("Realtime connection is not ready.");
        }

        activeCallPartnerRef.current = targetUserId;
        activeRoomNameRef.current = roomName;
        setCallError("");
        setIncomingCall(null);
        setCallMode(nextCallMode);
        setCallState("requesting-media");
        setActiveCallDisplayName(
          getFriendDisplayName(friends, targetUserId, friendName),
        );

        await prepareLocalMedia(nextCallMode);
        setCallState("calling");

        socket.emit("call:offer", {
          toUserId: targetUserId,
          fromUserId: currentUserId,
          callType: nextCallMode,
          offer: {
            roomName,
          },
          metadata: {
            fromDisplayName: currentUserDisplayName,
            roomName,
          },
        });

        logCallDebug("global", "offer-created", {
          friendId: targetUserId,
          roomName,
          callMode: nextCallMode,
        });
      } catch (error) {
        teardownCall({
          keepError: true,
          nextError: error?.message || "Unable to start the call.",
        });
      }
    },
    [
      currentUserDisplayName,
      currentUserId,
      friends,
      getRealtimeSocket,
      prepareLocalMedia,
      teardownCall,
    ],
  );

  const handleAcceptIncomingCall = React.useCallback(async () => {
    const roomName = String(incomingCall?.offer?.roomName || "").trim();
    const fromUserId = String(incomingCall?.fromUserId || "").trim();

    if (!roomName || !fromUserId) {
      return;
    }

    try {
      const socket = getRealtimeSocket?.();

      if (!socket) {
        throw new Error("Realtime connection is not ready.");
      }

      setCallError("");
      setCallMode(incomingCall.callType);
      setCallState("requesting-media");
      setActiveCallDisplayName(
        getFriendDisplayName(
          friends,
          fromUserId,
          incomingCall?.metadata?.fromDisplayName,
        ),
      );

      await prepareLocalMedia(incomingCall.callType);
      setCallState("connecting");

      await joinRoom({
        roomName,
        partnerUserId: fromUserId,
        nextCallMode: incomingCall.callType,
      });

      socket.emit("call:answer", {
        toUserId: fromUserId,
        fromUserId: currentUserId,
        answer: {
          accepted: true,
          roomName,
        },
      });

      setIncomingCall(null);
    } catch (error) {
      teardownCall({
        keepError: true,
        nextError: error?.message || "Unable to answer the call.",
      });
    }
  }, [
    currentUserId,
    friends,
    getRealtimeSocket,
    incomingCall,
    joinRoom,
    prepareLocalMedia,
    teardownCall,
  ]);

  const handleRejectIncomingCall = React.useCallback(() => {
    const socket = getRealtimeSocket?.();
    const fromUserId = String(incomingCall?.fromUserId || "").trim();

    if (socket && fromUserId) {
      socket.emit("call:reject", {
        toUserId: fromUserId,
        fromUserId: currentUserId,
        reason: "declined",
      });
    }

    teardownCall();
  }, [currentUserId, getRealtimeSocket, incomingCall, teardownCall]);

  const handleEndCall = React.useCallback(
    (reason = "ended") => {
      const normalizedReason =
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "ended";
      const socket = getRealtimeSocket?.();
      const targetUserId =
        activeCallPartnerRef.current || String(incomingCall?.fromUserId || "").trim();

      if (socket && targetUserId) {
        socket.emit("call:end", {
          toUserId: targetUserId,
          fromUserId: currentUserId,
          reason: normalizedReason,
        });
      }

      teardownCall();
    },
    [currentUserId, getRealtimeSocket, incomingCall, teardownCall],
  );

  const handleToggleMute = React.useCallback(async () => {
    const room = roomRef.current;

    if (!room) {
      return;
    }

    const nextMuted = !isAudioMuted;
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  const handleToggleCamera = React.useCallback(async () => {
    const room = roomRef.current;

    if (!room || callMode !== "video") {
      return;
    }

    const nextMuted = !isVideoMuted;
    await room.localParticipant.setCameraEnabled(!nextMuted);
    setIsVideoMuted(nextMuted);
  }, [callMode, isVideoMuted]);

  React.useEffect(() => {
    syncMediaElements();
  }, [localStreamVersion, remoteStreamVersion, syncMediaElements]);

  React.useEffect(() => {
    return () => {
      teardownCall();
    };
  }, [teardownCall]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleMinimized = () => setIsFooterCallMinimized(true);
    const handleRestored = () => setIsFooterCallMinimized(false);

    window.addEventListener("voice-call-window-minimized", handleMinimized);
    window.addEventListener("voice-call-window-restored", handleRestored);
    window.addEventListener("voice-call-window-closed", handleRestored);

    return () => {
      window.removeEventListener("voice-call-window-minimized", handleMinimized);
      window.removeEventListener("voice-call-window-restored", handleRestored);
      window.removeEventListener("voice-call-window-closed", handleRestored);
    };
  }, []);

  React.useEffect(() => {
    const socket = getRealtimeSocket?.();

    if (!socket) {
      return undefined;
    }

    const handleOffer = ({ fromUserId, offer, callType, metadata }) => {
      const normalizedFromUserId = String(fromUserId || "").trim();
      const roomName = String(offer?.roomName || metadata?.roomName || "").trim();

      if (!normalizedFromUserId || normalizedFromUserId === currentUserId || !roomName) {
        return;
      }

      if (callState !== "idle" || callMode || incomingCall) {
        socket.emit("call:reject", {
          toUserId: normalizedFromUserId,
          reason: "busy",
        });
        return;
      }

      setIncomingCall({
        fromUserId: normalizedFromUserId,
        offer: {
          roomName,
        },
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
      if (String(fromUserId || "").trim() !== activeCallPartnerRef.current) {
        return;
      }

      if (!answer?.accepted) {
        teardownCall({
          keepError: true,
          nextError: "The call was not accepted.",
        });
        return;
      }

      try {
        setCallState("connecting");
        await joinRoom({
          roomName:
            String(answer?.roomName || activeRoomNameRef.current || "").trim(),
          partnerUserId: fromUserId,
          nextCallMode: callMode || "audio",
        });
      } catch (error) {
        teardownCall({
          keepError: true,
          nextError: error?.message || "Unable to join the LiveKit room.",
        });
      }
    };

    const handleEnd = ({ fromUserId }) => {
      const normalizedFromUserId = String(fromUserId || "").trim();
      const expectedPartnerId =
        activeCallPartnerRef.current ||
        String(incomingCall?.fromUserId || "").trim();

      if (!normalizedFromUserId || normalizedFromUserId !== expectedPartnerId) {
        return;
      }

      teardownCall();
    };

    const handleReject = ({ fromUserId }) => {
      const normalizedFromUserId = String(fromUserId || "").trim();
      const expectedPartnerId =
        activeCallPartnerRef.current ||
        String(incomingCall?.fromUserId || "").trim();

      if (!normalizedFromUserId || normalizedFromUserId !== expectedPartnerId) {
        return;
      }

      teardownCall();
    };

    socket.on("call:offer", handleOffer);
    socket.on("call:answer", handleAnswer);
    socket.on("call:end", handleEnd);
    socket.on("call:reject", handleReject);

    return () => {
      socket.off("call:offer", handleOffer);
      socket.off("call:answer", handleAnswer);
      socket.off("call:end", handleEnd);
      socket.off("call:reject", handleReject);
    };
  }, [
    callMode,
    callState,
    currentUserId,
    friends,
    getRealtimeSocket,
    incomingCall,
    joinRoom,
    teardownCall,
  ]);

  React.useEffect(() => {
    if (!callRequest?.id) {
      return undefined;
    }

    onCallRequestHandled?.(callRequest.id);
    handleStartCall(callRequest);
    return undefined;
  }, [callRequest, handleStartCall, onCallRequestHandled]);

  React.useEffect(() => {
    const activeCallPartnerId =
      activeCallPartnerRef.current || String(incomingCall?.fromUserId || "").trim();

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
      callStartedAt: callState === "connected" ? callStartedAt : null,
      isAudioMuted,
      isVideoMuted,
      toggleMute:
        activeCallPartnerId && !incomingCall ? handleToggleMute : null,
      toggleCamera:
        callMode === "video" && activeCallPartnerId && !incomingCall
          ? handleToggleCamera
          : null,
      endCall:
        activeCallPartnerId && !incomingCall ? handleEndCall : null,
      acceptIncomingCall: incomingCall ? handleAcceptIncomingCall : null,
      declineIncomingCall: incomingCall ? handleRejectIncomingCall : null,
    });
  }, [
    activeCallDisplayName,
    callMode,
    callStartedAt,
    callState,
    friends,
    handleAcceptIncomingCall,
    handleRejectIncomingCall,
    handleToggleCamera,
    handleToggleMute,
    handleEndCall,
    incomingCall,
    isAudioMuted,
    isVideoMuted,
    onSessionChange,
  ]);

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
    if (callState !== "calling") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (callState !== "calling") {
        return;
      }

      logCallDebug("global", "no-answer-timeout", {
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

      teardownCall({
        keepError: true,
        nextError: "No answer from the receiver.",
      });
    }, CALL_NO_ANSWER_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [callState, currentUserId, getRealtimeSocket, teardownCall]);

  React.useEffect(() => {
    if (callState !== "connected" || !callStartedAt) {
      setCallElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => {
      setCallElapsedMs(Math.max(0, Date.now() - callStartedAt));
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [callStartedAt, callState]);

  const portalTarget =
    typeof document !== "undefined"
      ? (Boolean(incomingCall) && callState === "incoming"
          ? document.getElementById("Home_voiceCallNotificationDock")
          : null) ||
        (isFooterCallMinimized
          ? document.getElementById("Home_voiceCallDock")
          : null) ||
        document.getElementById("Home_Noga_callDock") ||
        document.getElementById("app_page")
      : null;
  const isFooterDocked = portalTarget?.id === "Home_voiceCallDock";
  const isFooterNotificationDock =
    portalTarget?.id === "Home_voiceCallNotificationDock";
  const isDockedInLeftColumn =
    portalTarget?.id === "Home_Noga_callDock" ||
    portalTarget?.id === "Home_callDock";

  if (!portalTarget || (!callMode && !incomingCall && !callError)) {
    return null;
  }

  const callPanelStyle = isDockedInLeftColumn
    ? undefined
    : {
        left: `${DEFAULT_CALL_PANEL_LAYOUT.x}px`,
        top: `${DEFAULT_CALL_PANEL_LAYOUT.y}px`,
        width: `${DEFAULT_CALL_PANEL_LAYOUT.width}px`,
        height: `${DEFAULT_CALL_PANEL_LAYOUT.height}px`,
      };

  const showCallControls =
    Boolean(callMode) && callState !== "incoming" && callState !== "idle";
  const shouldShowVideoMonitor =
    callMode === "video" && callState === "connected";
  const shouldMountHiddenLocalVideoElement =
    callMode === "video" && !shouldShowVideoMonitor;
  const shouldRenderCallPanel = callMode === "video";
  const shouldRenderIncomingBanner = false;
  const footerControlsPortalTarget =
    typeof document !== "undefined"
      ? document.getElementById("Home_voiceCallNotificationDock")
      : null;
  const shouldRenderFooterCallBar = Boolean(
    footerControlsPortalTarget && (incomingCall || callMode || callError),
  );
  const shouldRenderFooterMiniPanel = false;
  const footerCallBar = shouldRenderFooterCallBar ? (
    <section
      id="Chat_footerCallBar"
      className={`fc Chat_footerCallBar${incomingCall ? " Chat_footerCallBar--incoming" : " Chat_footerCallBar--active"}`}
    >
      {incomingCall ? (
        <>
          <span className="Chat_footerCallMeta">
            <strong>
              Incoming {incomingCall.callType === "video" ? "video" : "voice"} call
            </strong>
            <span>
              {incomingCall?.metadata?.fromDisplayName ||
                activeCallDisplayName ||
                "Your friend"}{" "}
              is calling.
            </span>
          </span>
          <button
            type="button"
            className="Chat_callControlButton Chat_callControlButton--accept"
            onClick={handleAcceptIncomingCall}
            title="Accept call"
            aria-label="Accept call"
          >
            <i className="fas fa-phone"></i>
          </button>
          <button
            type="button"
            className="Chat_callControlButton Chat_callControlButton--end"
            onClick={handleRejectIncomingCall}
            title="Decline call"
            aria-label="Decline call"
          >
            <i className="fas fa-phone-slash"></i>
          </button>
        </>
      ) : (
        <>
          <span className="Chat_footerCallMeta">
            <strong>{callMode === "video" ? "Video call" : "Voice call"}</strong>
            <span className="Chat_callElapsed" aria-label="Call duration">
              {formatCallElapsed(callElapsedMs)}
            </span>
          </span>
          <button
            type="button"
            className={`Chat_callControlButton${isAudioMuted ? " is-muted" : ""}`}
            onClick={handleToggleMute}
            title={isAudioMuted ? "Enable microphone" : "Disable microphone"}
            aria-label={isAudioMuted ? "Enable microphone" : "Disable microphone"}
            disabled={!localStreamRef.current}
          >
            <i
              className={`fas ${isAudioMuted ? "fa-microphone-slash" : "fa-microphone"}`}
            ></i>
          </button>
          <button
            type="button"
            className="Chat_callControlButton Chat_callControlButton--end"
            onClick={() => handleEndCall("hangup")}
            title="End call"
            aria-label="End call"
          >
            <i className="fas fa-phone-slash"></i>
          </button>
        </>
      )}
    </section>
  ) : null;

  const mainPortal = createPortal(
    <React.Fragment>
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <audio ref={localAudioRef} autoPlay playsInline muted />
      {shouldMountHiddenLocalVideoElement ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ display: "none" }}
        />
      ) : null}
      {shouldRenderIncomingBanner ? (
        <section
          id="Chat_incomingCallBanner"
          className={`fc${isDockedInLeftColumn ? " Chat_incomingCallBanner--docked" : ""}${isFooterNotificationDock ? " Chat_incomingCallBanner--footerDock" : ""}`}
        >
          <strong>
            Incoming {incomingCall.callType === "video" ? "video" : "voice"} call
          </strong>
          <span>
            {incomingCall?.metadata?.fromDisplayName || activeCallDisplayName || "Your friend"}{" "}
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
      {shouldRenderFooterMiniPanel ? (
        <section
          id="Chat_callPanel"
          className={`fc Chat_callPanel Chat_callPanel--footerDock${callState === "connected" ? " is-connected" : ""}`}
        >
          <div className="Chat_callStatusRow fr Chat_callPanelHeader">
            <strong>{callMode === "video" ? "Video call" : "Voice call"}</strong>
            <span>
              {callState === "connected"
                ? "Connected"
                : callState === "connecting"
                  ? "Connecting..."
                  : callState === "requesting-media"
                    ? "Requesting media..."
                    : callState === "calling"
                      ? "Calling..."
                      : "Ready"}
            </span>
          </div>
          <div className="Chat_callControls Chat_callControls--mini fr is-visible">
            <button
              type="button"
              className={`Chat_callControlButton${isAudioMuted ? " is-muted" : ""}`}
              onClick={handleToggleMute}
              title={isAudioMuted ? "Enable microphone" : "Disable microphone"}
              aria-label={isAudioMuted ? "Enable microphone" : "Disable microphone"}
              disabled={!roomRef.current}
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
                title={isVideoMuted ? "Enable camera" : "Disable camera"}
                aria-label={isVideoMuted ? "Enable camera" : "Disable camera"}
                disabled={!roomRef.current}
              >
                <i
                  className={`fas ${isVideoMuted ? "fa-video-slash" : "fa-video"}`}
                ></i>
              </button>
            ) : null}
            <button
              type="button"
              className="Chat_callControlButton"
              onClick={restoreVoiceCallWindow}
              title="Restore call window"
              aria-label="Restore call window"
            >
              <i className="fas fa-window-restore"></i>
            </button>
            <button
              type="button"
              className="Chat_callControlButton Chat_callControlButton--end"
              onClick={() => handleEndCall("hangup")}
              title="End call"
              aria-label="End call"
            >
              <i className="fas fa-phone-slash"></i>
            </button>
          </div>
        </section>
      ) : shouldRenderCallPanel ? (
        <section
          id="Chat_callPanel"
          className={`fc Chat_callPanel${callState === "connected" ? " is-connected" : ""}${isDockedInLeftColumn ? " Chat_callPanel--docked" : ""}`}
          style={callPanelStyle}
        >
          <div className="Chat_callStatusRow fr Chat_callPanelHeader">
            <strong>{callMode === "video" ? "Video call" : "Voice call"}</strong>
            <span>
              {callState === "calling"
                ? "Calling..."
                : callState === "incoming"
                  ? "Incoming call"
                  : callState === "connecting"
                    ? "Connecting..."
                    : callState === "connected"
                      ? "Connected"
                      : "Ready"}
            </span>
          </div>
          <div
            className={`Chat_mediaStage${callMode === "video" ? " Chat_mediaStage--floating" : " fr"}`}
          >
            {callMode === "video" ? (
              <>
                <div className="Chat_mediaTile Chat_mediaTile--remote Chat_mediaTile--floatingRemote">
                  <video ref={remoteVideoRef} autoPlay playsInline />
                </div>
                {shouldShowVideoMonitor ? (
                  <div
                    className="Chat_videoOverlay fc"
                    style={{
                      left: `${DEFAULT_VIDEO_OVERLAY_LAYOUT.x}px`,
                      top: `${DEFAULT_VIDEO_OVERLAY_LAYOUT.y}px`,
                    }}
                  >
                    <div className="Chat_videoOverlayHeader fr">
                      <span className="Chat_videoOverlayHandle">
                        <i className="fas fa-video"></i>
                        <span>You</span>
                      </span>
                    </div>
                    <div className="Chat_mediaTile Chat_mediaTile--local Chat_mediaTile--floatingLocal">
                      <video autoPlay playsInline muted ref={localVideoRef} />
                    </div>
                  </div>
                ) : null}
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

  return (
    <>
      {mainPortal}
      {footerCallBar && footerControlsPortalTarget
        ? createPortal(footerCallBar, footerControlsPortalTarget)
        : null}
    </>
  );
}

export default VoiceVideoCall;
