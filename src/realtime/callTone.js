const incomingToneSources = new Set();
const outgoingToneSources = new Set();

let incomingToneAudio = null;
let outgoingToneAudio = null;

const getIncomingToneAudio = () => {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  if (!incomingToneAudio) {
    incomingToneAudio = new Audio("/sounds/call-ringtone.mp3");
    incomingToneAudio.loop = true;
    incomingToneAudio.preload = "auto";
  }

  return incomingToneAudio;
};

const getOutgoingToneAudio = () => {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  if (!outgoingToneAudio) {
    outgoingToneAudio = new Audio("/sounds/ringing.mp3");
    outgoingToneAudio.loop = true;
    outgoingToneAudio.preload = "auto";
  }

  return outgoingToneAudio;
};

const syncPlayback = (audio, sources) => {
  if (!audio) {
    return;
  }

  if (sources.size > 0) {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    return;
  }

  audio.pause();
  audio.currentTime = 0;
};

export const startIncomingCallTone = (sourceKey) => {
  const normalizedKey = String(sourceKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  incomingToneSources.add(normalizedKey);
  syncPlayback(getIncomingToneAudio(), incomingToneSources);
};

export const stopIncomingCallTone = (sourceKey) => {
  const normalizedKey = String(sourceKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  incomingToneSources.delete(normalizedKey);
  syncPlayback(getIncomingToneAudio(), incomingToneSources);
};

export const startOutgoingCallTone = (sourceKey) => {
  const normalizedKey = String(sourceKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  outgoingToneSources.add(normalizedKey);
  syncPlayback(getOutgoingToneAudio(), outgoingToneSources);
};

export const stopOutgoingCallTone = (sourceKey) => {
  const normalizedKey = String(sourceKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  outgoingToneSources.delete(normalizedKey);
  syncPlayback(getOutgoingToneAudio(), outgoingToneSources);
};
