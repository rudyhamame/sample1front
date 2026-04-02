import React from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../../../../config/api";
import {
  attachStreamToElement,
  createPeerConnection,
  requestCallMedia,
  stopMediaStream,
} from "../../../../realtime/webrtcCall";

const CHAT_EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🤔",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "🎉",
  "💙",
  "💯",
  "😎",
  "😅",
  "😭",
  "🤝",
];

CHAT_EMOJIS.push("🫂", "❤️");

const resetChatTextareaHeight = (textarea) => {
  if (!textarea) {
    return;
  }

  textarea.style.height = "42px";
};

const resizeChatTextarea = (textarea) => {
  if (!textarea) {
    return;
  }

  resetChatTextareaHeight(textarea);
  textarea.style.height = `${Math.max(textarea.scrollHeight, 42)}px`;
};

const keepTextareaFocus = (event) => {
  event.preventDefault();
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

const FriendChat = ({
  state,
  content,
  sendToThemMessage,
  updateMyTypingPresence,
  getRealtimeSocket,
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
  const emojiPickerRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const [localMessages, setLocalMessages] = React.useState([]);
  const localAudioRef = React.useRef(null);
  const remoteAudioRef = React.useRef(null);
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  const peerConnectionRef = React.useRef(null);
  const localStreamRef = React.useRef(null);
  const remoteStreamRef = React.useRef(null);
  const rtcConfigRef = React.useRef(null);
  const queuedIceCandidatesRef = React.useRef([]);
  const activeCallPartnerRef = React.useRef("");
  const [callState, setCallState] = React.useState("idle");
  const [callMode, setCallMode] = React.useState("");
  const [callError, setCallError] = React.useState("");
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = React.useState(0);
  const [localStreamVersion, setLocalStreamVersion] = React.useState(0);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);

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
          Number(new Date(message?.date).getTime()) ||
          Date.now() + index,
        rawDate: message?.date,
      }));
  }, [state?.activeChatFriendId, state?.chat]);
  const activeFriendId = String(state?.activeChatFriendId || "").trim();
  const currentUserId = String(state?.my_id || "").trim();
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
    },
    [releasePeerConnection, resetCallMedia],
  );

  const loadRtcConfiguration = React.useCallback(async () => {
    const currentRtcConfig = rtcConfigRef.current;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      currentRtcConfig &&
      Array.isArray(currentRtcConfig.iceServers) &&
      (!currentRtcConfig.expiresAt || currentRtcConfig.expiresAt - nowSeconds > 60)
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
        await peerConnection.addIceCandidate(new RTCIceCandidate(nextCandidate));
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
              nextError: "Unable to establish media through the current network.",
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
    [getRealtimeSocket, loadRtcConfiguration, releasePeerConnection, teardownCall],
  );

  React.useEffect(() => {
    syncMediaElements();
  }, [localStreamVersion, remoteStreamVersion, syncMediaElements]);

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
      if (!fromUserId || String(fromUserId).trim() !== activeFriendId || !candidate) {
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
  }, [activeFriendId, flushQueuedIceCandidates, getRealtimeSocket, teardownCall]);

  React.useEffect(() => {
    if (!isEmojiPickerOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEmojiPickerOpen]);

  // Helper to generate a temporary ID for optimistic messages
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const handleSend = () => {
    if (state?.isSendingMessage) {
      return;
    }

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
    if (textarea) {
      textarea.value = "";
      textarea.focus();
      resetChatTextareaHeight(textarea);
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

  const handleTypingChange = (event) => {
    resizeChatTextarea(event.target);

    if (!state?.activeChatFriendId || !updateMyTypingPresence) {
      return;
    }

    updateMyTypingPresence(
      state.activeChatFriendId,
      Boolean(event.target.value.trim()),
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
    resizeChatTextarea(textarea);
    textarea.focus();

    if (state?.activeChatFriendId && updateMyTypingPresence) {
      updateMyTypingPresence(
        state.activeChatFriendId,
        Boolean(nextValue.trim()),
      );
    }
  };

  const handleTextareaFocus = () => {
    if (!state?.activeChatFriendId || !updateMyTypingPresence) {
      return;
    }

    updateMyTypingPresence(state.activeChatFriendId, true);
  };

  const handleTextareaBlur = (event) => {
    resetChatTextareaHeight(event.target);

    if (!state?.activeChatFriendId || !updateMyTypingPresence) {
      return;
    }

    updateMyTypingPresence(state.activeChatFriendId, false);
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
          disabled={callState !== "idle" && callState !== "incoming"}
          onClick={() => handleStartCall("audio")}
        >
          <i className="fas fa-phone-alt"></i>
        </button>
        <button
          type="button"
          className="Chat_callButton"
          title="Start video call"
          aria-label="Start video call"
          disabled={callState !== "idle" && callState !== "incoming"}
          onClick={() => handleStartCall("video")}
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
      activeCallPartnerRef.current || incomingCall?.fromUserId || activeFriendId;

    if (socket && targetUserId) {
      socket.emit("call:end", {
        toUserId: targetUserId,
        reason,
      });
    }

    teardownCall();
  };

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
                    {friendIsTyping
                      ? chatContent?.typingLabel || "typing..."
                      : friendIsChatting
                        ? chatContent?.onlineLabel || "online"
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
                    disabled={callState !== "idle" && callState !== "incoming"}
                    onClick={() => handleStartCall("audio")}
                  >
                    <i className="fas fa-phone-alt"></i>
                  </button>
                  <button
                    id="Chat_videoCallButton"
                    type="button"
                    className="Chat_callButton"
                    title="Start video call"
                    aria-label="Start video call"
                    disabled={callState !== "idle" && callState !== "incoming"}
                    onClick={() => handleStartCall("video")}
                  >
                    <i className="fas fa-video"></i>
                  </button>
                </div>
              ) : null}
            </section>
          )}
          {isChatting ? (
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
              {inlineCallActions
                ? inlineCallActionsTarget
                  ? createPortal(inlineCallActions, inlineCallActionsTarget)
                  : inlineCallActions
                : null}
              {incomingCall ? (
                <section id="Chat_incomingCallBanner" className="fc">
                  <strong>
                    Incoming {incomingCall.callType === "video" ? "video" : "voice"} call
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
              {callMode ? (
                <section
                  id="Chat_callPanel"
                  className={`fc Chat_callPanel${callState === "connected" ? " is-connected" : ""}`}
                >
                  <div className="Chat_callStatusRow fr">
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
                  <div className="Chat_mediaStage fr">
                    <div className="Chat_mediaTile Chat_mediaTile--remote">
                      {callMode === "video" ? (
                        <video
                          id="Chat_remoteVideo"
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <div className="Chat_audioPlaceholder">
                          <i className="fas fa-user-md"></i>
                          <span>Remote audio</span>
                        </div>
                      )}
                    </div>
                    <div className="Chat_mediaTile Chat_mediaTile--local">
                      {callMode === "video" ? (
                        <video
                          id="Chat_localVideo"
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                        />
                      ) : (
                        <div className="Chat_audioPlaceholder">
                          <i className="fas fa-microphone"></i>
                          <span>Local audio</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Chat_callControls fr">
                    <button
                      type="button"
                      className={`Chat_callControlButton${isAudioMuted ? " is-muted" : ""}`}
                      onClick={handleToggleMute}
                      disabled={!localStreamRef.current}
                    >
                      <i className={`fas ${isAudioMuted ? "fa-microphone-slash" : "fa-microphone"}`}></i>
                    </button>
                    {callMode === "video" ? (
                      <button
                        type="button"
                        className={`Chat_callControlButton${isVideoMuted ? " is-muted" : ""}`}
                        onClick={handleToggleCamera}
                        disabled={!localStreamRef.current}
                      >
                        <i className={`fas ${isVideoMuted ? "fa-video-slash" : "fa-video"}`}></i>
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
                </section>
              ) : null}
              {callError ? (
                <div id="Chat_callError" className="Chat_callError">
                  {callError}
                </div>
              ) : null}
              <ul id="Chat_messages" data-react-managed="true">
                {allMessages.length === 0 ? (
                  <li id="FriendChat_empty_state">
                    {chatContent?.empty || "Open a conversation to view messages here."}
                  </li>
                ) : (
                  allMessages.map((msg) => (
                    <div
                      key={msg.id || msg.timestamp}
                      className={msg.sender === "me" ? "sentMessagesDIV fc" : "receivedMessagesDIV fc"}
                    >
                      <li
                        className={msg.sender === "me" ? "sentMessagesLI" : "receivedMessagesLI"}
                        style={msg.pending ? { opacity: 0.6, fontStyle: "italic" } : undefined}
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
                <div id="Chat_emoji_picker_wrap" ref={emojiPickerRef}>
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
                    <span role="img" aria-hidden="true">
                      🙂
                    </span>
                  </button>
                  {isEmojiPickerOpen ? (
                    <div id="Chat_emoji_picker" className="fc">
                      {CHAT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="Chat_emoji_option"
                          onMouseDown={keepTextareaFocus}
                          onTouchStart={keepTextareaFocus}
                          onClick={() => {
                            handleEmojiSelect(emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
                  onInput={(event) => {
                    resizeChatTextarea(event.target);
                  }}
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
                  disabled={Boolean(state?.isSendingMessage)}
                  onMouseDown={keepTextareaFocus}
                  onTouchStart={keepTextareaFocus}
                  onClick={handleSend}
                >
                  <i className="fc far fa-paper-plane"></i>
                </button>
              </section>
            </React.Fragment>
          ) : null}
        </section>
      </div>
    </section>
  );
};

export default FriendChat;
