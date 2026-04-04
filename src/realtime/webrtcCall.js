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

export const getIceCandidateType = (candidate) => {
  const candidateText =
    typeof candidate === "string"
      ? candidate
      : String(candidate?.candidate || "").trim();

  const typeMatch = candidateText.match(/\btyp\s+([a-z]+)/i);
  return String(typeMatch?.[1] || "unknown").toLowerCase();
};

const incrementCandidateType = (target, type) => {
  const normalizedType = String(type || "unknown").trim().toLowerCase() || "unknown";
  target[normalizedType] = Number(target[normalizedType] || 0) + 1;
};

const summarizeIceStats = (stats) => {
  const localCandidates = new Map();
  const remoteCandidates = new Map();
  const candidatePairReports = [];
  let selectedPair = null;

  stats.forEach((report) => {
    if (!report || !report.type) {
      return;
    }

    if (report.type === "local-candidate") {
      localCandidates.set(report.id, report);
      return;
    }

    if (report.type === "remote-candidate") {
      remoteCandidates.set(report.id, report);
      return;
    }

    if (report.type !== "candidate-pair") {
      return;
    }

    const localCandidate = localCandidates.get(report.localCandidateId);
    const remoteCandidate = remoteCandidates.get(report.remoteCandidateId);
    const pairSummary = {
      id: report.id,
      state: String(report.state || "").trim().toLowerCase(),
      nominated: Boolean(report.nominated),
      selected: Boolean(report.selected),
      bytesSent: Number(report.bytesSent || 0),
      bytesReceived: Number(report.bytesReceived || 0),
      currentRoundTripTime:
        Number.isFinite(Number(report.currentRoundTripTime))
          ? Number(report.currentRoundTripTime)
          : null,
      local: localCandidate
        ? {
            candidateType: String(localCandidate.candidateType || "unknown").trim().toLowerCase(),
            protocol: String(localCandidate.protocol || "unknown").trim().toLowerCase(),
            address:
              String(localCandidate.address || localCandidate.ip || "").trim() ||
              "",
            port: Number(localCandidate.port || 0) || null,
            networkType: String(localCandidate.networkType || "").trim().toLowerCase(),
          }
        : null,
      remote: remoteCandidate
        ? {
            candidateType: String(remoteCandidate.candidateType || "unknown").trim().toLowerCase(),
            protocol: String(remoteCandidate.protocol || "unknown").trim().toLowerCase(),
            address:
              String(remoteCandidate.address || remoteCandidate.ip || "").trim() ||
              "",
            port: Number(remoteCandidate.port || 0) || null,
          }
        : null,
    };

    candidatePairReports.push(pairSummary);

    if (
      report.nominated ||
      report.selected ||
      report.state === "succeeded"
    ) {
      selectedPair = pairSummary;
    }
  });

  return {
    localCandidates,
    remoteCandidates,
    candidatePairReports,
    selectedPair,
  };
};

export const getPeerConnectionDiagnostics = async (peerConnection) => {
  if (!peerConnection || typeof peerConnection.getStats !== "function") {
    return null;
  }

  try {
    const stats = await peerConnection.getStats();
    const {
      localCandidates,
      remoteCandidates,
      candidatePairReports,
      selectedPair,
    } = summarizeIceStats(stats);
    const localCandidateTypes = {};
    const remoteCandidateTypes = {};

    localCandidates.forEach((candidate) => {
      incrementCandidateType(localCandidateTypes, candidate?.candidateType);
    });
    remoteCandidates.forEach((candidate) => {
      incrementCandidateType(remoteCandidateTypes, candidate?.candidateType);
    });

    return {
      connectionState: String(peerConnection.connectionState || "").trim().toLowerCase(),
      iceConnectionState: String(peerConnection.iceConnectionState || "").trim().toLowerCase(),
      iceGatheringState: String(peerConnection.iceGatheringState || "").trim().toLowerCase(),
      signalingState: String(peerConnection.signalingState || "").trim().toLowerCase(),
      localCandidateTypes,
      remoteCandidateTypes,
      localCandidateCount: localCandidates.size,
      remoteCandidateCount: remoteCandidates.size,
      candidatePairCount: candidatePairReports.length,
      selectedPair,
    };
  } catch (error) {
    return {
      error: error?.message || "Unable to inspect WebRTC stats.",
      connectionState: String(peerConnection.connectionState || "").trim().toLowerCase(),
      iceConnectionState: String(peerConnection.iceConnectionState || "").trim().toLowerCase(),
      iceGatheringState: String(peerConnection.iceGatheringState || "").trim().toLowerCase(),
      signalingState: String(peerConnection.signalingState || "").trim().toLowerCase(),
    };
  }
};
