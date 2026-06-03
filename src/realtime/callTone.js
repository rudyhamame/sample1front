const ringtoneSources = new Set();

let ringtoneAudio = null;

const getRingtoneAudio = () => {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  if (!ringtoneAudio) {
    ringtoneAudio = new Audio("/sounds/call-ringtone.wav");
    ringtoneAudio.loop = true;
    ringtoneAudio.preload = "auto";
  }

  return ringtoneAudio;
};

const syncPlayback = () => {
  const audio = getRingtoneAudio();

  if (!audio) {
    return;
  }

  if (ringtoneSources.size > 0) {
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

  ringtoneSources.add(normalizedKey);
  syncPlayback();
};

export const stopIncomingCallTone = (sourceKey) => {
  const normalizedKey = String(sourceKey || "").trim();

  if (!normalizedKey) {
    return;
  }

  ringtoneSources.delete(normalizedKey);
  syncPlayback();
};
