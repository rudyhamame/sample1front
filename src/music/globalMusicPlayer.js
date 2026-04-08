const PLANNER_MUSIC_SESSION_EVENT = "planner-music-session-change";
const MUSIC_LIBRARY_STORAGE_KEY = "schoolPlanner_music_library_items";
const LEGACY_MUSIC_LIBRARY_STORAGE_KEYS = [
  "phenomed.globalMusic.archiveItems",
  "schoolPlanner_music_archive_items",
];

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

const DEFAULT_MUSIC_LIBRARY_ITEMS = INTERNET_ARCHIVE_CLASSICAL_ITEMS.map(
  (item) => ({
    provider: "internetArchive",
    identifier: item.identifier,
    query: item.identifier,
    title: item.fallbackTitle,
    artist: item.fallbackCreator,
  }),
);

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

const buildITunesSearchUrl = (queryText) =>
  `https://itunes.apple.com/search?term=${encodeURIComponent(
    queryText,
  )}&entity=song&limit=1`;

const buildMusicBrainzSearchUrl = (queryText) =>
  `https://musicbrainz.org/ws/2/recording?fmt=json&limit=1&query=${encodeURIComponent(
    queryText,
  )}`;

const buildQueryFromTitleArtist = (title, artist, fallbackValue = "") => {
  const parts = [String(title || "").trim(), String(artist || "").trim()].filter(
    Boolean,
  );

  if (parts.length > 0) {
    return parts.join(" - ");
  }

  return String(fallbackValue || "").trim();
};

const normalizeStoredMusicLibraryItem = (rawItem) => {
  if (typeof rawItem === "string") {
    const normalizedIdentifier = String(rawItem || "").trim();

    if (!normalizedIdentifier) {
      return null;
    }

    return {
      provider: "internetArchive",
      identifier: normalizedIdentifier,
      query: normalizedIdentifier,
      title: normalizedIdentifier.replace(/[-_]+/g, " "),
      artist: "Internet Archive",
    };
  }

  const provider = String(rawItem?.provider || "internetArchive").trim();
  const identifier = String(rawItem?.identifier || "").trim();
  const title = String(
    rawItem?.title || rawItem?.fallbackTitle || rawItem?.trackTitle || "",
  ).trim();
  const artist = String(
    rawItem?.artist || rawItem?.fallbackCreator || rawItem?.trackArtist || "",
  ).trim();
  const query = String(
    rawItem?.query || buildQueryFromTitleArtist(title, artist, identifier),
  ).trim();
  const previewUrl = String(
    rawItem?.previewUrl || rawItem?.src || rawItem?.url || "",
  ).trim();
  const trackId = String(rawItem?.trackId || rawItem?.id || "").trim();
  const recordingId = String(rawItem?.recordingId || "").trim();

  if (!provider) {
    return null;
  }

  if (provider === "internetArchive" && !identifier && !query) {
    return null;
  }

  if (provider !== "internetArchive" && !query && !previewUrl && !trackId && !recordingId) {
    return null;
  }

  return {
    provider,
    identifier,
    query,
    title,
    artist,
    previewUrl,
    trackId,
    recordingId,
  };
};

const readStoredMusicLibraryItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const candidateKeys = [
    MUSIC_LIBRARY_STORAGE_KEY,
    ...LEGACY_MUSIC_LIBRARY_STORAGE_KEYS,
  ];

  for (const storageKey of candidateKeys) {
    try {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) {
        continue;
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        continue;
      }

      const normalizedItems = parsedValue
        .map((item) => normalizeStoredMusicLibraryItem(item))
        .filter(Boolean);

      if (normalizedItems.length > 0) {
        return normalizedItems;
      }
    } catch {}
  }

  return [];
};

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

const getConfiguredMusicLibraryItems = () => {
  const storedItems = readStoredMusicLibraryItems();
  return storedItems.length > 0 ? storedItems : DEFAULT_MUSIC_LIBRARY_ITEMS;
};

const resolveInternetArchiveTrack = async (item) => {
  const normalizedIdentifier = String(item?.identifier || item?.query || "").trim();
  const fallbackTitle =
    String(item?.title || item?.query || normalizedIdentifier).trim() ||
    normalizedIdentifier;
  const fallbackCreator =
    String(item?.artist || "Internet Archive").trim() || "Internet Archive";

  try {
    const metadataResponse = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(normalizedIdentifier)}`,
    );

    if (metadataResponse.ok) {
      const metadataPayload = await metadataResponse.json();
      const resolvedTrack = buildResolvedArchiveTrack(
        {
          ...item,
          identifier: normalizedIdentifier,
          fallbackTitle,
          fallbackCreator,
        },
        metadataPayload,
      );

      if (resolvedTrack) {
        return resolvedTrack;
      }
    }
  } catch {}

  try {
    const searchResponse = await fetch(
      buildInternetArchiveSearchUrl(
        fallbackTitle || normalizedIdentifier || fallbackCreator,
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
        fallbackTitle: matchedDoc?.title || fallbackTitle || matchedIdentifier,
        fallbackCreator: matchedDoc?.creator || fallbackCreator || "Internet Archive",
      },
      metadataPayload,
    );
  } catch {
    return null;
  }
};

const resolveITunesTrack = async (item) => {
  const previewUrl = String(item?.previewUrl || "").trim();
  const title = String(item?.title || "").trim();
  const artist = String(item?.artist || "").trim();
  const query =
    String(item?.query || buildQueryFromTitleArtist(title, artist)).trim();

  if (previewUrl) {
    return {
      id: String(item?.trackId || query || previewUrl).trim() || previewUrl,
      title: title || "iTunes Preview",
      artist: artist || "iTunes Search API",
      src: previewUrl,
    };
  }

  if (!query) {
    return null;
  }

  try {
    const response = await fetch(buildITunesSearchUrl(query));
    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    const track = Array.isArray(payload?.results) ? payload.results[0] : null;
    const resolvedPreviewUrl = String(track?.previewUrl || "").trim();

    if (!resolvedPreviewUrl) {
      return null;
    }

    return {
      id: String(track?.trackId || query).trim() || resolvedPreviewUrl,
      title: String(track?.trackName || title || query).trim() || "iTunes Preview",
      artist:
        String(track?.artistName || artist || "iTunes Search API").trim() ||
        "iTunes Search API",
      src: resolvedPreviewUrl,
    };
  } catch {
    return null;
  }
};

const resolveMusicBrainzTrack = async (item) => {
  const existingQuery = String(
    item?.query || buildQueryFromTitleArtist(item?.title, item?.artist),
  ).trim();

  if (!existingQuery) {
    return null;
  }

  try {
    const response = await fetch(buildMusicBrainzSearchUrl(existingQuery));
    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    const recording = Array.isArray(payload?.recordings)
      ? payload.recordings[0]
      : null;

    const resolvedTitle =
      String(recording?.title || item?.title || existingQuery).trim() ||
      existingQuery;
    const resolvedArtist =
      String(
        Array.isArray(recording?.["artist-credit"])
          ? recording["artist-credit"]
              .map((credit) => String(credit?.name || "").trim())
              .filter(Boolean)
              .join(", ")
          : item?.artist || "",
      ).trim() || "MusicBrainz";

    const iTunesTrack = await resolveITunesTrack({
      provider: "itunes",
      query: buildQueryFromTitleArtist(resolvedTitle, resolvedArtist, existingQuery),
      title: resolvedTitle,
      artist: resolvedArtist,
    });

    if (iTunesTrack) {
      return iTunesTrack;
    }

    return resolveInternetArchiveTrack({
      provider: "internetArchive",
      identifier: "",
      query: buildQueryFromTitleArtist(resolvedTitle, resolvedArtist, existingQuery),
      title: resolvedTitle,
      artist: resolvedArtist,
    });
  } catch {
    return null;
  }
};

const resolveMusicLibraryTrack = (item) => {
  const provider = String(item?.provider || "internetArchive").trim();

  if (provider === "itunes") {
    return resolveITunesTrack(item);
  }

  if (provider === "musicBrainz") {
    return resolveMusicBrainzTrack(item);
  }

  return resolveInternetArchiveTrack(item);
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
    trackArtist: "Music Library",
  });

  playlistPromise = Promise.all(
    getConfiguredMusicLibraryItems().map((item) => resolveMusicLibraryTrack(item)),
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
      trackTitle: "Music Unavailable",
      trackArtist: "Try again later",
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
  resetAudioSignal(0);

  const nextPlaylist = await loadMusicLibrary();

  if (wasPlaying && nextPlaylist.length > 0) {
    await setTrack(0, true);
  }

  return nextPlaylist;
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
