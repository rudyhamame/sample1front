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
};

let audioElement = null;
let playlist = [];
let playlistIndex = 0;
let playlistPromise = null;
let eventsBound = false;

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
    });
    audioElement.addEventListener("pause", () => {
      emitSnapshot({ isPlaying: false });
    });
    audioElement.addEventListener("ended", () => {
      playNextSharedPlannerMusicTrack(true);
    });
    audioElement.addEventListener("error", () => {
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
