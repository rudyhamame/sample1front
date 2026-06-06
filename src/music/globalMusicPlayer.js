import { apiUrl } from "../config/api";
import { readStoredSession } from "../utils/sessionCleanup";

const PLANNER_MUSIC_SESSION_EVENT = "planner-music-session-change";
const JAMENDO_TRACK_LOOKUP_ENDPOINT = "/api/jamendo/tracks";
const JAMENDO_TRACK_STREAM_ENDPOINT = "/api/jamendo/stream";
const MUSIC_PLAYLIST_SETTINGS_ENDPOINT = "/api/user/settings/music-playlist";
const PLANNER_MUSIC_VOLUME_STORAGE_KEY = "phenomed.plannerMusic.volume";
const buildBackendUrl = (path = "") => apiUrl(String(path || "").trim());

const clampVolume = (value) => {
  const volume = Number(value);
  if (!Number.isFinite(volume)) {
    return 0.42;
  }
  return Math.min(1, Math.max(0, volume));
};

const readStoredVolume = () => {
  if (typeof window === "undefined") {
    return 0.42;
  }

  return clampVolume(
    window.localStorage.getItem(PLANNER_MUSIC_VOLUME_STORAGE_KEY) ?? 0.42,
  );
};

let sharedSnapshot = {
  isReady: false,
  isPlaying: false,
  trackTitle: "Planner Music",
  trackArtist: "Jamendo Playlist",
  volume: readStoredVolume(),
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
let consecutiveTrackErrorCount = 0;
let jamendoRefreshInFlight = false;

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
      consecutiveTrackErrorCount = 0;
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
      consecutiveTrackErrorCount = 0;
      stopReactiveSignalLoop();
      playNextSharedPlannerMusicTrack(true);
    });
    audioElement.addEventListener("error", async () => {
      stopReactiveSignalLoop();
      const currentTrack = playlist[playlistIndex];
      const canRefreshCurrentTrack =
        !jamendoRefreshInFlight &&
        currentTrack &&
        String(currentTrack.provider || "").trim().toLowerCase() === "jamendo" &&
        String(currentTrack.trackId || "").trim() &&
        !currentTrack.__refreshAttempted;

      if (canRefreshCurrentTrack) {
        jamendoRefreshInFlight = true;
        currentTrack.__refreshAttempted = true;
        const refreshedTrack = await refreshJamendoTrackSource(currentTrack);
        jamendoRefreshInFlight = false;
        if (refreshedTrack && audioElement) {
          audioElement.pause();
          audioElement.src = refreshedTrack.src;
          audioElement.load();
          audioElement.play().catch(() => null);
          syncTrackSnapshot();
          return;
        }
      }

      consecutiveTrackErrorCount += 1;
      if (playlist.length > 1 && consecutiveTrackErrorCount < playlist.length) {
        playNextSharedPlannerMusicTrack(true);
        return;
      }
      emitSnapshot({
        isReady: false,
        isPlaying: false,
        trackTitle: "Music unavailable",
        trackArtist: "",
      });
    });
    eventsBound = true;
  }

  return audioElement;
};

const normalizeStoredMusicLibraryItem = (rawItem) => {
  const provider = String(rawItem?.provider || "").trim().toLowerCase();
  const title = String(
    rawItem?.songName ||
      rawItem?.title ||
      rawItem?.fallbackTitle ||
      rawItem?.trackTitle ||
      "",
  ).trim();
  const artist = String(
    rawItem?.artist || rawItem?.fallbackCreator || rawItem?.trackArtist || "",
  ).trim();
  const identifier = String(
    rawItem?.trackId || rawItem?.id || rawItem?.query || rawItem?.previewUrl || "",
  ).trim();
  const buildQueryFromTitleArtist = (nextTitle, nextArtist, fallbackIdentifier) =>
    [String(nextTitle || "").trim(), String(nextArtist || "").trim(), String(fallbackIdentifier || "").trim()]
      .filter(Boolean)
      .join(" ");
  const query = String(
    rawItem?.query || buildQueryFromTitleArtist(title, artist, identifier),
  ).trim();
  const previewUrl = String(
    rawItem?.previewUrl || rawItem?.src || rawItem?.url || "",
  ).trim();
  const trackId = String(rawItem?.trackId || rawItem?.id || "").trim();

  if (provider !== "jamendo" || (!query && !previewUrl && !trackId)) {
    return null;
  }

  return {
    provider,
    query,
    title,
    artist,
    previewUrl,
    trackId,
  };
};

const refreshJamendoTrackSource = async (track = {}) => {
  if (typeof window === "undefined") {
    return null;
  }
  const trackId = String(track?.trackId || "").trim();
  if (!trackId) {
    return null;
  }
  try {
    const response = await fetch(
      `${buildBackendUrl(JAMENDO_TRACK_LOOKUP_ENDPOINT)}?id=${encodeURIComponent(trackId)}&limit=1`,
      {
        method: "GET",
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return null;
    }
    const firstMatch = Array.isArray(payload?.results) ? payload.results[0] : null;
    const refreshedUrl = String(
      firstMatch?.audio || firstMatch?.audiodownload || "",
    ).trim();
    if (!refreshedUrl) {
      return null;
    }
    const refreshedTrackId = String(firstMatch?.id || trackId).trim();
    track.src = refreshedTrackId
      ? `${buildBackendUrl(JAMENDO_TRACK_STREAM_ENDPOINT)}?id=${encodeURIComponent(refreshedTrackId)}`
      : refreshedUrl;
    track.title = String(
      firstMatch?.name || track?.title || "Jamendo Track",
    ).trim() || "Jamendo Track";
    track.artist = String(
      firstMatch?.artist_name || track?.artist || "Jamendo",
    ).trim() || "Jamendo";
    return track;
  } catch {
    return null;
  }
};

const buildMusicLibraryItemIdentity = (item = {}) =>
  [
    String(item?.provider || "").trim().toLowerCase(),
    String(item?.trackId || "").trim(),
    String(item?.previewUrl || "").trim(),
    String(item?.query || "").trim(),
  ].join("::");

const buildAuthHeaders = () => {
  const token = String(readStoredSession?.()?.token || "").trim();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

const fetchMusicPlaylistFromSettings = async () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const response = await fetch(apiUrl(MUSIC_PLAYLIST_SETTINGS_ENDPOINT), {
      method: "GET",
      headers: {
        ...buildAuthHeaders(),
      },
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return [];
    }
    return (Array.isArray(payload?.musicPlaylist) ? payload.musicPlaylist : [])
      .map((item) => normalizeStoredMusicLibraryItem(item))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const saveMusicPlaylistToSettings = async (items = []) => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const response = await fetch(apiUrl(MUSIC_PLAYLIST_SETTINGS_ENDPOINT), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ musicPlaylist: items }),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const resolveMusicLibraryTrack = (item) => {
  const provider = String(item?.provider || "").trim().toLowerCase();

  if (provider === "jamendo") {
    const previewUrl = String(item?.previewUrl || "").trim();
    const trackId = String(item?.trackId || "").trim();
    if (!previewUrl && !trackId) {
      return Promise.resolve(null);
    }
    const streamUrl = trackId
      ? `${buildBackendUrl(JAMENDO_TRACK_STREAM_ENDPOINT)}?id=${encodeURIComponent(trackId)}`
      : previewUrl;
    return Promise.resolve({
      id:
        String(item?.trackId || item?.query || previewUrl).trim() || previewUrl,
      title: String(item?.title || "Jamendo Track").trim() || "Jamendo Track",
      artist: String(item?.artist || "Jamendo").trim() || "Jamendo",
      src: streamUrl,
      provider: "jamendo",
      trackId,
      __refreshAttempted: false,
    });
  }
  return Promise.resolve(null);
};

const syncTrackSnapshot = () => {
  const currentTrack = playlist[playlistIndex];

  emitSnapshot({
    isReady: Boolean(currentTrack),
    trackTitle: currentTrack?.title || "Planner Music",
    trackArtist: currentTrack?.artist || "Jamendo Playlist",
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
  nextTrack.__refreshAttempted = false;
  musicAudio.pause();
  musicAudio.src = nextTrack.src;
  musicAudio.load();
  emitSnapshot({ isReady: true });
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
    trackArtist: "Music Library",
  });

  const configuredItems = await fetchMusicPlaylistFromSettings();

  playlistPromise = Promise.all(
    configuredItems.map((item) => resolveMusicLibraryTrack(item)),
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
      trackTitle: "Music unavailable",
      trackArtist: "",
    });
  }

  return playlist;
};

export const warmSharedPlannerMusic = () => {
  ensureAudioElement();
  return loadMusicLibrary();
};

export const refreshSharedPlannerMusicLibrary = async () => {
  const wasPlaying = Boolean(audioElement && !audioElement.paused && audioElement.src);

  if (audioElement) {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
  }

  playlist = [];
  playlistIndex = 0;
  playlistPromise = null;
  consecutiveTrackErrorCount = 0;
  resetAudioSignal(0);

  const nextPlaylist = await loadMusicLibrary();

  if (wasPlaying && nextPlaylist.length > 0) {
    await setTrack(0, true);
  }

  return nextPlaylist;
};

export const addSharedPlannerMusicLibraryItem = async (rawItem = {}) => {
  if (typeof window === "undefined") {
    return { added: false, reason: "unavailable" };
  }

  const normalizedItem = normalizeStoredMusicLibraryItem(rawItem);
  if (!normalizedItem) {
    return { added: false, reason: "invalid" };
  }

  const currentItems = await fetchMusicPlaylistFromSettings();
  const targetIdentity = buildMusicLibraryItemIdentity(normalizedItem);
  const alreadyExists = currentItems.some(
    (item) => buildMusicLibraryItemIdentity(item) === targetIdentity,
  );

  if (alreadyExists) {
    return { added: false, reason: "duplicate" };
  }

  const nextItems = [...currentItems, normalizedItem];
  const saved = await saveMusicPlaylistToSettings(nextItems);
  if (!saved) {
    return { added: false, reason: "save_failed" };
  }
  await refreshSharedPlannerMusicLibrary();
  return { added: true, reason: "added" };
};

export const removeSharedPlannerMusicLibraryItem = async (rawItem = {}) => {
  if (typeof window === "undefined") {
    return { removed: false, reason: "unavailable" };
  }

  const normalizedItem = normalizeStoredMusicLibraryItem(rawItem);
  if (!normalizedItem) {
    return { removed: false, reason: "invalid" };
  }

  const currentItems = await fetchMusicPlaylistFromSettings();
  const targetIdentity = buildMusicLibraryItemIdentity(normalizedItem);
  const nextItems = currentItems.filter(
    (item) => buildMusicLibraryItemIdentity(item) !== targetIdentity,
  );

  if (nextItems.length === currentItems.length) {
    return { removed: false, reason: "missing" };
  }

  const saved = await saveMusicPlaylistToSettings(nextItems);
  if (!saved) {
    return { removed: false, reason: "save_failed" };
  }

  await refreshSharedPlannerMusicLibrary();
  return { removed: true, reason: "removed" };
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

export const setSharedPlannerMusicVolume = (nextVolume) => {
  const normalizedVolume = clampVolume(nextVolume);
  const musicAudio = ensureAudioElement();

  if (musicAudio) {
    musicAudio.volume = normalizedVolume;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      PLANNER_MUSIC_VOLUME_STORAGE_KEY,
      String(normalizedVolume),
    );
  }

  emitSnapshot({ volume: normalizedVolume });
  return normalizedVolume;
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
