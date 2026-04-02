export const getFallbackIceServers = () => [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
  },
];

export const normalizeIceServers = (iceServers) => {
  const normalized = Array.isArray(iceServers)
    ? iceServers
        .map((entry) => {
          if (!entry || (!entry.urls && !entry.url)) {
            return null;
          }

          const urls = Array.isArray(entry.urls)
            ? entry.urls.filter(Boolean)
            : entry.urls || entry.url;

          if (!urls || (Array.isArray(urls) && urls.length === 0)) {
            return null;
          }

          const nextEntry = { urls };

          if (entry.username) {
            nextEntry.username = entry.username;
          }

          if (entry.credential) {
            nextEntry.credential = entry.credential;
          }

          return nextEntry;
        })
        .filter(Boolean)
    : [];

  return normalized.length ? normalized : getFallbackIceServers();
};

export const stopMediaStream = (stream) => {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Ignore track shutdown failures.
    }
  });
};

export const attachStreamToElement = (element, stream, { muted = false } = {}) => {
  if (!element) {
    return;
  }

  if (element.srcObject !== stream) {
    element.srcObject = stream || null;
  }

  element.muted = Boolean(muted);

  if (stream) {
    const playPromise = element.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => null);
    }
  }
};

export const requestCallMedia = async (callType = "audio") => {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw new Error("Media devices are not available in this browser.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video",
  });
};

export const createPeerConnection = ({
  iceServers,
  onIceCandidate,
  onTrack,
  onConnectionStateChange,
  onIceConnectionStateChange,
}) => {
  const peerConnection = new RTCPeerConnection({
    iceServers: normalizeIceServers(iceServers),
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && typeof onIceCandidate === "function") {
      onIceCandidate(event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    if (typeof onTrack === "function") {
      onTrack(event);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (typeof onConnectionStateChange === "function") {
      onConnectionStateChange(peerConnection.connectionState);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    if (typeof onIceConnectionStateChange === "function") {
      onIceConnectionStateChange(peerConnection.iceConnectionState);
    }
  };

  return peerConnection;
};
