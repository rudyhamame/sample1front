const PLANNER_MUSIC_SESSION_EVENT = "planner-music-session-change";
const MUSIC_LIBRARY_STORAGE_KEY = "phenomed.globalMusic.archiveItems";

const INTERNET_ARCHIVE_CLASSICAL_ITEMS = [
  {
    identifier: "beethoven-piano-sonata-no.-14-moonlight-sonata",
    fallbackTitle: "Moonlight Sonata",
    fallbackCreator: "Ludwig van Beethoven",
  },
  {
    identifier: "nocturne-op.-9-no.-2",
    fallbackTitle: "Nocturne Op. 9 No. 2",
    fallbackCreator: "Frederic Chopin",
  },
  {
    identifier: "gymnopedie-no.-1",
    fallbackTitle: "Gymnopedie No. 1",
    fallbackCreator: "Erik Satie",
  },
];

let sharedSnapshot = {
  isReady: false,
  isPlaying: false,
  trackTitle: "Planner Music",
  trackArtist: "Internet Archive",
  volume: 0.42,
  audioSignal: {
    energy: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    pitch: 0,
    tempo: 0,
    pulse: 0,
    fallbackTime: 0,
    updatedAt: 0,
  },
};

let audioElement = null;
let playlist = [];
let playlistIndex = 0;
let playlistPromise = null;
let eventsBound = false;
let musicAudioContext = null;
let musicSourceNode = null;
let musicAnalyser = null;
let musicAnalyserData = null;
let reactiveFrame = null;
let lastSignalEmitAt = 0;

const EMPTY_AUDIO_SIGNAL = {
  energy: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  pitch: 0,
  tempo: 0,
  pulse: 0,
  fallbackTime: 0,
  updatedAt: 0,
};

const emitSnapshot = (nextSnapshot = {}) => {
  sharedSnapshot = {
    ...sharedSnapshot,
    ...nextSnapshot,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PLANNER_MUSIC_SESSION_EVENT, {
        detail: { ...sharedSnapshot },
      }),
    );
  }
};

const resetAudioSignal = (fallbackTime = 0) => {
  emitSnapshot({
    audioSignal: {
      ...EMPTY_AUDIO_SIGNAL,
      fallbackTime: Math.max(0, Number(fallbackTime) || 0),
      updatedAt: Date.now(),
    },
  });
};

const stopReactiveSignalLoop = ({ keepSignal = false } = {}) => {
  if (typeof window !== "undefined" && reactiveFrame) {
    window.cancelAnimationFrame(reactiveFrame);
  }
  reactiveFrame = null;

  if (!keepSignal) {
    resetAudioSignal(audioElement?.currentTime || 0);
  }
};

const ensureAnalyser = async () => {
  const musicAudio = ensureAudioElement();

  if (!musicAudio || typeof window === "undefined") {
    return false;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext || null;

  if (!AudioContextClass) {
    return false;
  }

  try {
    if (!musicAudioContext) {
      musicAudioContext = new AudioContextClass();
    }

    if (musicAudioContext.state === "suspended") {
      await musicAudioContext.resume();
    }

    if (!musicSourceNode) {
      musicSourceNode = musicAudioContext.createMediaElementSource(musicAudio);
    }

    if (!musicAnalyser) {
      musicAnalyser = musicAudioContext.createAnalyser();
      musicAnalyser.fftSize = 256;
      musicAnalyser.smoothingTimeConstant = 0.84;
      musicAnalyserData = new Uint8Array(musicAnalyser.frequencyBinCount);
      musicSourceNode.connect(musicAnalyser);
      musicAnalyser.connect(musicAudioContext.destination);
    }

    return true;
  } catch {
    return false;
  }
};

const emitAudioSignalFromCurrentFrame = () => {
  const activeAudio = ensureAudioElement();
  if (!activeAudio) {
    return;
  }

  let bass = 0;
  let mid = 0;
  let treble = 0;
  let energy = 0;

  if (musicAnalyser && musicAnalyserData) {
    musicAnalyser.getByteFrequencyData(musicAnalyserData);
    const bucketCount = musicAnalyserData.length;
    const bassEnd = Math.max(1, Math.floor(bucketCount * 0.18));
    const midEnd = Math.max(bassEnd + 1, Math.floor(bucketCount * 0.55));
    let bassTotal = 0;
    let midTotal = 0;
    let trebleTotal = 0;

    for (let index = 0; index < bucketCount; index += 1) {
      const sample = musicAnalyserData[index] / 255;
      energy += sample;

      if (index < bassEnd) {
        bassTotal += sample;
      } else if (index < midEnd) {
        midTotal += sample;
      } else {
        trebleTotal += sample;
      }
    }

    energy /= bucketCount || 1;
    bass = bassTotal / bassEnd;
    mid = midTotal / Math.max(1, midEnd - bassEnd);
    treble = trebleTotal / Math.max(1, bucketCount - midEnd);
  } else {
    const fallbackBeat = Math.abs(
      Math.sin((activeAudio.currentTime || 0) * (1.2 + sharedSnapshot.volume * 2)),
    );
    energy = 0.18 + fallbackBeat * 0.42;
    bass = 0.22 + fallbackBeat * 0.34;
    mid = 0.16 + fallbackBeat * 0.26;
    treble = 0.12 + fallbackBeat * 0.22;
  }

  const tempo = Math.max(
    0,
    Math.min(1, (0.006 + energy * 0.018 + mid * 0.01 - 0.006) / 0.028),
  );
  const pitch = Math.max(0, Math.min(1, treble * 0.68 + mid * 0.32));
  const pulse = Math.max(
    0,
    Math.min(
      1,
      bass * 0.52 +
        energy * 0.28 +
        Math.abs(
          Math.sin((activeAudio.currentTime || 0) * (1.3 + tempo * 3.4)),
        ) *
          0.2,
    ),
  );

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastSignalEmitAt >= 72) {
    lastSignalEmitAt = now;
    emitSnapshot({
      audioSignal: {
        energy,
        bass,
        mid,
        treble,
        pitch,
        tempo,
        pulse,
        fallbackTime: activeAudio.currentTime || 0,
        updatedAt: Date.now(),
      },
    });
  }
};

const startReactiveSignalLoop = async () => {
  const musicAudio = ensureAudioElement();
  if (!musicAudio || typeof window === "undefined") {
    return;
  }

  await ensureAnalyser();
  stopReactiveSignalLoop({ keepSignal: true });
  lastSignalEmitAt = 0;

  const step = () => {
    if (!audioElement || audioElement.paused || audioElement.ended) {
      stopReactiveSignalLoop();
      return;
    }

    emitAudioSignalFromCurrentFrame();
    reactiveFrame = window.requestAnimationFrame(step);
  };

  reactiveFrame = window.requestAnimationFrame(step);
};

const ensureAudioElement = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = "auto";
    audioElement.crossOrigin = "anonymous";
    audioElement.volume = sharedSnapshot.volume;
  }

  if (!eventsBound && audioElement) {
    audioElement.addEventListener("play", () => {
      emitSnapshot({ isPlaying: true });
      startReactiveSignalLoop().catch(() => {
        resetAudioSignal(audioElement?.currentTime || 0);
      });
    });
    audioElement.addEventListener("pause", () => {
      emitSnapshot({ isPlaying: false });
      stopReactiveSignalLoop();
    });
    audioElement.addEventListener("ended", () => {
      stopReactiveSignalLoop();
      playNextSharedPlannerMusicTrack(true);
    });
    audioElement.addEventListener("error", () => {
      stopReactiveSignalLoop();
      emitSnapshot({
        isReady: false,
        isPlaying: false,
        trackTitle: "Archive Unavailable",
        trackArtist: "Try again later",
      });
    });
    eventsBound = true;
  }

  return audioElement;
};

const buildInternetArchiveSearchUrl = (queryText) =>
  `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    queryText,
  )}&fl[]=identifier,title,creator&rows=1&page=1&output=json&sort[]=downloads desc`;

const buildResolvedArchiveTrack = (item, payload) => {
  const files = Array.isArray(payload?.files) ? payload.files : [];
  const audioFile = files.find((file) => {
    const name = String(file?.name || "").toLowerCase();
    const format = String(file?.format || "").toLowerCase();

    return (
      name.endsWith(".mp3") ||
      name.endsWith(".ogg") ||
      format.includes("mp3") ||
      format.includes("ogg")
    );
  });

  if (!audioFile?.name) {
    return null;
  }

  const identifier = String(payload?.metadata?.identifier || item?.identifier || "").trim();
  if (!identifier) {
    return null;
  }

  return {
    id: identifier,
    title:
      String(payload?.metadata?.title || item?.fallbackTitle || identifier).trim() ||
      "Archive Track",
    artist:
      String(payload?.metadata?.creator || item?.fallbackCreator || "Internet Archive").trim() ||
      "Internet Archive",
    src: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(audioFile.name)}`,
  };
};

const getConfiguredInternetArchiveItems = () => {
  if (typeof window === "undefined") {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }

  try {
    const raw = window.localStorage.getItem(MUSIC_LIBRARY_STORAGE_KEY) || "[]";
    const storedIdentifiers = JSON.parse(raw);

    if (!Array.isArray(storedIdentifiers) || storedIdentifiers.length === 0) {
      return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
    }

    return storedIdentifiers
      .map((identifier) => String(identifier || "").trim())
      .filter(Boolean)
      .map((identifier) => {
        const matchingItem = INTERNET_ARCHIVE_CLASSICAL_ITEMS.find(
          (entry) => entry.identifier === identifier,
        );

        return (
          matchingItem || {
            identifier,
            fallbackTitle: identifier.replace(/[-_]+/g, " "),
            fallbackCreator: "Internet Archive",
          }
        );
      });
  } catch {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }
};

const resolveInternetArchiveTrack = async (item) => {
  try {
    const metadataResponse = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`,
    );

    if (metadataResponse.ok) {
      const metadataPayload = await metadataResponse.json();
      const resolvedTrack = buildResolvedArchiveTrack(item, metadataPayload);

      if (resolvedTrack) {
        return resolvedTrack;
      }
    }
  } catch {}

  try {
    const searchResponse = await fetch(
      buildInternetArchiveSearchUrl(
        item.fallbackTitle || item.identifier || item.fallbackCreator,
      ),
    );

    if (!searchResponse.ok) {
      return null;
    }

    const searchPayload = await searchResponse.json();
    const matchedDoc = searchPayload?.response?.docs?.[0];
    const matchedIdentifier = String(matchedDoc?.identifier || "").trim();

    if (!matchedIdentifier) {
      return null;
    }

    const metadataResponse = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(matchedIdentifier)}`,
    );

    if (!metadataResponse.ok) {
      return null;
    }

    const metadataPayload = await metadataResponse.json();

    return buildResolvedArchiveTrack(
      {
        ...item,
        identifier: matchedIdentifier,
        fallbackTitle:
          matchedDoc?.title || item.fallbackTitle || matchedIdentifier,
        fallbackCreator:
          matchedDoc?.creator || item.fallbackCreator || "Internet Archive",
      },
      metadataPayload,
    );
  } catch {
    return null;
  }
};

const syncTrackSnapshot = () => {
  const currentTrack = playlist[playlistIndex];

  emitSnapshot({
    isReady: Boolean(currentTrack),
    trackTitle: currentTrack?.title || "Planner Music",
    trackArtist: currentTrack?.artist || "Internet Archive",
    volume: audioElement?.volume ?? sharedSnapshot.volume,
    audioSignal: sharedSnapshot.isPlaying
      ? sharedSnapshot.audioSignal
      : {
          ...EMPTY_AUDIO_SIGNAL,
          updatedAt: Date.now(),
        },
  });
};

const setTrack = (nextIndex, autoplay = false) => {
  const musicAudio = ensureAudioElement();
  const nextTrack = playlist[nextIndex];

  if (!musicAudio || !nextTrack) {
    return Promise.resolve(false);
  }

  playlistIndex = nextIndex;
  musicAudio.pause();
  musicAudio.src = nextTrack.src;
  musicAudio.load();
  resetAudioSignal(0);
  syncTrackSnapshot();

  if (!autoplay) {
    return Promise.resolve(true);
  }

  return musicAudio
    .play()
    .then(() => {
      syncTrackSnapshot();
      return true;
    })
    .catch(() => false);
};

const loadMusicLibrary = async () => {
  if (playlist.length > 0) {
    return playlist;
  }

  if (playlistPromise) {
    return playlistPromise;
  }

  emitSnapshot({
    isReady: false,
    isPlaying: false,
    trackTitle: "Loading music...",
    trackArtist: "Internet Archive",
  });

  playlistPromise = Promise.all(
    getConfiguredInternetArchiveItems().map((item) =>
      resolveInternetArchiveTrack(item),
    ),
  )
    .then((tracks) => tracks.filter(Boolean))
    .catch(() => [])
    .finally(() => {
      playlistPromise = null;
    });

  const resolvedTracks = await playlistPromise;
  playlist = resolvedTracks;

  if (playlist.length > 0) {
    await setTrack(0, false);
  } else {
    emitSnapshot({
      isReady: false,
      isPlaying: false,
      trackTitle: "Archive Unavailable",
      trackArtist: "Try again later",
    });
  }

  return playlist;
};

export const warmSharedPlannerMusic = () => {
  ensureAudioElement();
  return loadMusicLibrary();
};

export const getPlannerMusicSnapshot = () => ({
  ...sharedSnapshot,
});

export const toggleSharedPlannerMusic = async () => {
  const musicAudio = ensureAudioElement();
  if (!musicAudio) {
    return false;
  }

  if (!playlist.length) {
    await loadMusicLibrary();
  }

  if (!playlist.length) {
    return false;
  }

  if (!musicAudio.src) {
    return setTrack(playlistIndex, true);
  }

  if (musicAudio.paused) {
    return musicAudio
      .play()
      .then(() => {
        syncTrackSnapshot();
        startReactiveSignalLoop().catch(() => null);
        return true;
      })
      .catch(() => false);
  }

  musicAudio.pause();
  syncTrackSnapshot();
  return true;
};

export const playNextSharedPlannerMusicTrack = async (autoplay = true) => {
  if (!playlist.length) {
    await loadMusicLibrary();
  }

  if (!playlist.length) {
    return false;
  }

  return setTrack((playlistIndex + 1) % playlist.length, autoplay);
};

export const playPreviousSharedPlannerMusicTrack = async (autoplay = true) => {
  if (!playlist.length) {
    await loadMusicLibrary();
  }

  if (!playlist.length) {
    return false;
  }

  return setTrack((playlistIndex - 1 + playlist.length) % playlist.length, autoplay);
};
