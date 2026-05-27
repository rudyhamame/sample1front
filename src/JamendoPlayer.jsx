import React from "react";
import { apiUrl } from "./config/api";
import "./deezerPlayer.css";
import {
  addSharedPlannerMusicLibraryItem,
  removeSharedPlannerMusicLibraryItem,
} from "./music/globalMusicPlayer";
import { readStoredSession } from "./utils/sessionCleanup";

const normalizeTrack = (entry = {}) => ({
  id: String(entry?.id || "").trim(),
  title: String(entry?.name || entry?.title || "").trim(),
  artist: String(entry?.artist_name || "").trim(),
  album: String(entry?.album_name || "").trim(),
  cover: String(
    entry?.album_image || entry?.image || entry?.album_cover || "",
  ).trim(),
  audio: String(entry?.audio || entry?.audiodownload || "").trim(),
  duration: Number(entry?.duration || 0) || 0,
  genre: String(
    entry?.musicinfo?.tags?.genres?.[0]?.name ||
      entry?.musicinfo?.tags?.genres?.[0] ||
      "",
  ).trim(),
});

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

function JamendoPlayer({ serverReply }) {
  const [query, setQuery] = React.useState("");
  const [tracks, setTracks] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchEnabled, setSearchEnabled] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [activeTrackId, setActiveTrackId] = React.useState("");
  const [playlistFeedback, setPlaylistFeedback] = React.useState("");
  const [addedTrackIds, setAddedTrackIds] = React.useState({});
  const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
  const previewAudioRef = React.useRef(null);
  const [playlistTracks, setPlaylistTracks] = React.useState([]);
  const [durationMinMinutes, setDurationMinMinutes] = React.useState("");
  const [durationMaxMinutes, setDurationMaxMinutes] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState("all");
  const [availableGenres, setAvailableGenres] = React.useState([]);

  const loadAddedTrackIds = React.useCallback(async () => {
    try {
      const token = String(readStoredSession?.()?.token || "").trim();
      if (!token) {
        return;
      }
      const response = await fetch(
        apiUrl("/api/user/settings/music-playlist"),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }
      const playlist = Array.isArray(payload?.musicPlaylist)
        ? payload.musicPlaylist
        : [];
      const nextMap = {};
      const nextPlaylistTracks = [];
      playlist.forEach((entry) => {
        const trackId = String(entry?.trackId || entry?.id || "").trim();
        if (trackId) {
          nextMap[trackId] = true;
          nextPlaylistTracks.push({
            id: trackId,
            title: String(
              entry?.songName ||
                entry?.title ||
                entry?.trackTitle ||
                "Untitled",
            ).trim(),
            artist: String(
              entry?.artist || entry?.trackArtist || "Unknown",
            ).trim(),
            cover: "",
            audio: String(entry?.previewUrl || entry?.src || "").trim(),
          });
        }
      });
      setAddedTrackIds(nextMap);
      setPlaylistTracks(nextPlaylistTracks);
    } catch {}
  }, []);

  const publish = (message) => {
    if (typeof serverReply === "function") {
      serverReply(String(message || ""));
    }
  };

  const activeTrack =
    tracks.find((track) => String(track.id) === String(activeTrackId)) || null;

  const durationRange = React.useMemo(() => {
    const minRaw = String(durationMinMinutes || "").trim();
    const maxRaw = String(durationMaxMinutes || "").trim();
    const min = Number(minRaw);
    const max = Number(maxRaw);
    const hasMin = minRaw !== "" && Number.isFinite(min) && min >= 0;
    const hasMax = maxRaw !== "" && Number.isFinite(max) && max >= 0;
    return {
      hasMin,
      hasMax,
      minSecs: hasMin ? min * 60 : 0,
      maxSecs: hasMax ? max * 60 : 0,
    };
  }, [durationMaxMinutes, durationMinMinutes]);

  const isTrackInDurationRange = React.useCallback(
    (track = {}) => {
      const seconds = Number(track?.duration || 0);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return false;
      }
      if (durationRange.hasMin && seconds < durationRange.minSecs) {
        return false;
      }
      if (durationRange.hasMax && seconds > durationRange.maxSecs) {
        return false;
      }
      return true;
    },
    [durationRange],
  );

  const trackDerivedGenres = React.useMemo(() => {
    const bucket = new Set();
    tracks.forEach((track) => {
      const genre = String(track?.genre || "").trim();
      if (genre) {
        bucket.add(genre);
      }
    });
    return Array.from(bucket).sort((a, b) => a.localeCompare(b));
  }, [tracks]);
  const genreOptions = React.useMemo(
    () => [
      "all",
      ...(availableGenres.length > 0 ? availableGenres : trackDerivedGenres),
    ],
    [availableGenres, trackDerivedGenres],
  );

  const isTrackMatchingGenre = React.useCallback(
    (track = {}) => {
      if (selectedGenre === "all") {
        return true;
      }
      return (
        String(track?.genre || "").trim().toLowerCase() ===
        String(selectedGenre || "").trim().toLowerCase()
      );
    },
    [selectedGenre],
  );

  const filteredTracks = React.useMemo(
    () =>
      tracks
        .filter((track) => isTrackInDurationRange(track))
        .filter((track) => isTrackMatchingGenre(track)),
    [isTrackInDurationRange, isTrackMatchingGenre, tracks],
  );

  const filteredPlaylistTracks = React.useMemo(
    () =>
      playlistTracks
        .map((track) => {
          const matchingLoadedTrack =
            tracks.find((entry) => String(entry.id) === String(track.id)) ||
            null;
          return {
            ...track,
            genre: String(
              track?.genre || matchingLoadedTrack?.genre || "",
            ).trim(),
          };
        })
        .filter((track) => isTrackInDurationRange(track))
        .filter((track) => isTrackMatchingGenre(track))
        .sort((a, b) =>
          String(a?.genre || "zzzz").localeCompare(String(b?.genre || "zzzz")),
        ),
    [isTrackInDurationRange, isTrackMatchingGenre, playlistTracks, tracks],
  );

  const setActiveTrack = (trackId) => {
    setActiveTrackId(String(trackId || ""));
  };

  const loadTracks = async (nextQuery = "", nextGenre = "all") => {
    setIsLoading(true);
    try {
      const normalizedGenre = String(nextGenre || "all").trim().toLowerCase();
      const response = await fetch(
        apiUrl(
          `/api/jamendo/tracks?limit=25&q=${encodeURIComponent(
            String(nextQuery || "").trim(),
          )}&genre=${encodeURIComponent(
            normalizedGenre === "all" ? "" : normalizedGenre,
          )}`,
        ),
        { method: "GET", mode: "cors" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Jamendo tracks.");
      }

      const nextTracks = Array.isArray(payload?.results)
        ? payload.results
            .map(normalizeTrack)
            .filter((track) => track.id && track.audio)
        : [];
      setTracks(nextTracks);
      setActiveTrackId(String(nextTracks[0]?.id || ""));
      publish(
        nextQuery
          ? nextTracks.length > 0
            ? `Found ${nextTracks.length} Jamendo tracks.`
            : "No Jamendo tracks found."
          : nextTracks.length > 0
            ? "Loaded Jamendo popular tracks."
            : "No Jamendo tracks found.",
      );
    } catch (error) {
      publish(error?.message || "Unable to load Jamendo tracks.");
    } finally {
      setIsLoading(false);
    }
  };

  const searchTracks = async () => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) {
      publish("Type a search query for Jamendo.");
      return;
    }
    await loadTracks(normalizedQuery, selectedGenre);
  };

  const playPrev = () => {
    if (!activeTrack || tracks.length === 0) {
      return;
    }
    const currentIndex = tracks.findIndex(
      (track) => String(track.id) === String(activeTrack.id),
    );
    if (currentIndex < 0) {
      return;
    }
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setActiveTrack(tracks[prevIndex]?.id);
  };

  const playNext = () => {
    if (!activeTrack || tracks.length === 0) {
      return;
    }
    const currentIndex = tracks.findIndex(
      (track) => String(track.id) === String(activeTrack.id),
    );
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = (currentIndex + 1) % tracks.length;
    setActiveTrack(tracks[nextIndex]?.id);
  };

  const playPreview = () => {
    const audioUrl = String(activeTrack?.audio || "").trim();
    if (!audioUrl) {
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    const audio = previewAudioRef.current;
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
    audio
      .play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => null);
  };

  const pausePreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    setIsPreviewPlaying(false);
  };

  const stopPreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
    setIsPreviewPlaying(false);
  };

  const addTrackToPlaylist = async (track = {}) => {
    const normalizedTrackId = String(track?.id || "").trim();
    const normalizedAudioUrl = String(track?.audio || "").trim();
    if (!normalizedTrackId || !normalizedAudioUrl) {
      return;
    }

    try {
      const result = await addSharedPlannerMusicLibraryItem({
        provider: "jamendo",
        trackId: normalizedTrackId,
        query: normalizedTrackId,
        title: String(track?.title || "").trim(),
        artist: String(track?.artist || "").trim(),
        previewUrl: normalizedAudioUrl,
      });
      if (result?.reason === "duplicate") {
        setPlaylistFeedback("Song is already in the footer playlist.");
        setAddedTrackIds((currentValue) => ({
          ...currentValue,
          [normalizedTrackId]: true,
        }));
        loadAddedTrackIds();
        return;
      }
      if (result?.added) {
        setPlaylistFeedback("Song added to the footer playlist.");
        setAddedTrackIds((currentValue) => ({
          ...currentValue,
          [normalizedTrackId]: true,
        }));
        loadAddedTrackIds();
        publish(`Added ${track.title || "track"} to the footer playlist.`);
        return;
      }
      setPlaylistFeedback("Unable to add song to the footer playlist.");
    } catch (error) {
      setPlaylistFeedback(
        error?.message || "Unable to add song to the footer playlist.",
      );
    }
  };

  const removeTrackFromPlaylist = async (track = {}) => {
    const normalizedTrackId = String(track?.id || "").trim();
    const normalizedAudioUrl = String(track?.audio || "").trim();
    if (!normalizedTrackId || !normalizedAudioUrl) {
      return;
    }
    try {
      const result = await removeSharedPlannerMusicLibraryItem({
        provider: "jamendo",
        trackId: normalizedTrackId,
        query: normalizedTrackId,
        title: String(track?.title || "").trim(),
        artist: String(track?.artist || "").trim(),
        previewUrl: normalizedAudioUrl,
      });
      if (result?.removed) {
        setPlaylistFeedback("");
        setAddedTrackIds((currentValue) => {
          const nextValue = { ...currentValue };
          delete nextValue[normalizedTrackId];
          return nextValue;
        });
        loadAddedTrackIds();
        publish(`Removed ${track.title || "track"} from the footer playlist.`);
        return;
      }
      setPlaylistFeedback("Unable to remove song from the footer playlist.");
    } catch (error) {
      setPlaylistFeedback(
        error?.message || "Unable to remove song from the footer playlist.",
      );
    }
  };

  React.useEffect(() => {
    let isCancelled = false;
    const loadConfig = async () => {
      try {
        const response = await fetch(apiUrl("/api/jamendo/config"), {
          method: "GET",
          mode: "cors",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || isCancelled) {
          return;
        }
        setSearchEnabled(Boolean(payload?.searchEnabled));
        setStatusMessage(String(payload?.message || "").trim());
        if (payload?.searchEnabled) {
          loadTracks("", selectedGenre);
        }
      } catch {}
    };
    loadConfig();
    loadAddedTrackIds();
    return () => {
      isCancelled = true;
    };
  }, [loadAddedTrackIds, selectedGenre]);

  React.useEffect(() => {
    if (!searchEnabled) {
      return;
    }
    loadTracks(query, selectedGenre);
  }, [searchEnabled, selectedGenre]);

  React.useEffect(() => {
    let isCancelled = false;
    const loadGenres = async () => {
      try {
        const response = await fetch(apiUrl("/api/jamendo/genres"), {
          method: "GET",
          mode: "cors",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || isCancelled) {
          return;
        }
        const genres = Array.isArray(payload?.genres)
          ? payload.genres
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
          : [];
        setAvailableGenres(genres);
      } catch {}
    };
    loadGenres();
    return () => {
      isCancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return undefined;
    }
    const handleEnded = () => setIsPreviewPlaying(false);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  React.useEffect(() => {
    stopPreview();
  }, [activeTrackId]);

  React.useEffect(
    () => () => {
      const audio = previewAudioRef.current;
      if (!audio) {
        return;
      }
      audio.pause();
      audio.src = "";
    },
    [],
  );

  return (
    <section id="deezerPlayerPage" className="deezerPlayerPage">
      <header className="deezerPlayerPage_header">
        <h1>Jamendo Music Player</h1>
        <p>Search and stream free Jamendo tracks with direct audio URLs.</p>
      </header>

      {playlistFeedback ? <p>{playlistFeedback}</p> : null}

      <div className="deezerPlayerPage_controls">
        <input
          id="jamendoPlayer_searchInput"
          type="text"
          className="deezerPlayer_input"
          value={query}
          placeholder="Search song, artist, or album"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchTracks();
            }
          }}
        />
        <button
          id="jamendoPlayer_searchBtn"
          type="button"
          className="deezerPlayer_btn"
          onClick={searchTracks}
          disabled={isLoading || !searchEnabled}
        >
          Search
        </button>
        <button
          id="jamendoPlayer_popularBtn"
          type="button"
          className="deezerPlayer_btn"
          onClick={() => loadTracks("", selectedGenre)}
          disabled={isLoading || !searchEnabled}
        >
          Popular
        </button>
      </div>
      <div className="deezerPlayer_durationFilter">
        <span className="deezerPlayer_durationFilterTitle">Duration</span>
        <input
          id="jamendoPlayer_durationMin"
          type="number"
          min="0"
          step="1"
          className="deezerPlayer_input deezerPlayer_input--duration"
          value={durationMinMinutes}
          placeholder="Min"
          onChange={(event) => setDurationMinMinutes(event.target.value)}
        />
        <input
          id="jamendoPlayer_durationMax"
          type="number"
          min="0"
          step="1"
          className="deezerPlayer_input deezerPlayer_input--duration"
          value={durationMaxMinutes}
          placeholder="Max"
          onChange={(event) => setDurationMaxMinutes(event.target.value)}
        />
        <select
          id="jamendoPlayer_genreFilter"
          className="deezerPlayer_input deezerPlayer_input--duration"
          value={selectedGenre}
          onChange={(event) =>
            setSelectedGenre(String(event.target.value || "all"))
          }
        >
          {genreOptions.map((entry) => (
            <option key={`jamendo-genre-${entry}`} value={entry}>
              {entry === "all" ? "All genres" : entry}
            </option>
          ))}
        </select>
      </div>
      <div className="deezerPlayerPage_layout">
        <aside className="deezerPlayer_list">
          {filteredTracks.map((track) =>
            (() => {
              const isAdded = Boolean(
                addedTrackIds[String(track.id || "").trim()],
              );
              return (
                <div
                  key={track.id}
                  className={`deezerPlayer_trackItem${
                    String(track.id) === String(activeTrackId)
                      ? " is-active"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="deezerPlayer_trackSelectBtn"
                    onClick={() => setActiveTrack(track.id)}
                  >
                    <img src={track.cover} alt="" />
                    <span>{track.title}</span>
                    <small>{track.artist}</small>
                    <small>
                      {track.genre ? `Genre: ${track.genre}` : "Genre: -"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className={
                      "deezerPlayer_btn deezerPlayer_trackAddBtn" +
                      (isAdded ? " deezerPlayer_trackAddBtn--added" : "")
                    }
                    onClick={() =>
                      isAdded
                        ? removeTrackFromPlaylist(track)
                        : addTrackToPlaylist(track)
                    }
                  >
                    {isAdded ? (
                      <>
                        <i
                          className="fi fi-rr-check-circle"
                          aria-hidden="true"
                        />{" "}
                        Added
                      </>
                    ) : (
                      "Add to playlist"
                    )}
                  </button>
                </div>
              );
            })(),
          )}
        </aside>

        <article className="deezerPlayer_nowPlaying">
          {activeTrack ? (
            <>
              <div className="deezerPlayer_previewMass">
                <img
                  src={activeTrack.cover}
                  alt=""
                  className="deezerPlayer_cover"
                />
                <div className="deezerPlayer_previewButtonsRow">
                  <button
                    type="button"
                    className="deezerPlayer_btn"
                    onClick={playPreview}
                    disabled={!activeTrack?.audio}
                    aria-label="Play preview"
                    title="Play preview"
                  >
                    <i className="fi fi-rr-play" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="deezerPlayer_btn"
                    onClick={pausePreview}
                    disabled={!isPreviewPlaying}
                    aria-label="Pause preview"
                    title="Pause preview"
                  >
                    <i className="fi fi-rr-pause" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="deezerPlayer_btn"
                    onClick={stopPreview}
                    disabled={!activeTrack?.audio}
                    aria-label="Stop preview"
                    title="Stop preview"
                  >
                    <i className="fi fi-rr-stop" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="deezerPlayer_nowPlayingDetails">
                {(() => {
                  const isAdded = Boolean(
                    addedTrackIds[String(activeTrack?.id || "").trim()],
                  );
                  return (
                    <>
                      <h2>{activeTrack.title}</h2>
                      <p>{activeTrack.artist}</p>
                      <p>{activeTrack.album}</p>
                      <p>{formatDuration(activeTrack.duration)}</p>
                      <div className="deezerPlayer_transport">
                        <div className="deezerPlayer_transportGroup">
                          <button
                            type="button"
                            className="deezerPlayer_btn"
                            onClick={playPrev}
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            className="deezerPlayer_btn"
                            onClick={playNext}
                          >
                            Next
                          </button>
                        </div>
                        <div className="deezerPlayer_transportGroup">
                          <button
                            type="button"
                            className={
                              "deezerPlayer_btn" +
                              (isAdded
                                ? " deezerPlayer_trackAddBtn--added"
                                : "")
                            }
                            onClick={() =>
                              isAdded
                                ? removeTrackFromPlaylist(activeTrack)
                                : addTrackToPlaylist(activeTrack)
                            }
                          >
                            {isAdded ? (
                              <>
                                <i
                                  className="fi fi-rr-check-circle"
                                  aria-hidden="true"
                                />{" "}
                                Added
                              </>
                            ) : (
                              "Add to playlist"
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <p>No track selected.</p>
          )}
        </article>

        <aside className="deezerPlayer_playlistOnly">
          <h3 className="deezerPlayer_playlistOnlyTitle">Playlist songs</h3>
          {filteredPlaylistTracks.length === 0 ? (
            <p className="deezerPlayer_playlistOnlyEmpty">
              No songs in playlist.
            </p>
          ) : (
            <div className="deezerPlayer_playlistOnlyList">
              {filteredPlaylistTracks.map((track, index) => {
                const isActive = String(track.id) === String(activeTrackId);
                const matchingLoadedTrack =
                  tracks.find(
                    (entry) => String(entry.id) === String(track.id),
                  ) || null;
                const playableTrack = matchingLoadedTrack || track;
                return (
                  <div
                    key={`playlist-only-${track.id}-${index}`}
                    className={
                      "deezerPlayer_playlistOnlyItem" +
                      (isActive ? " is-active" : "")
                    }
                  >
                    <button
                      type="button"
                      className="deezerPlayer_playlistOnlySelectBtn"
                      onClick={() => setActiveTrack(track.id)}
                    >
                      <span>{track.title}</span>
                      <small>{track.artist}</small>
                      <small>
                        {track.genre ? `Genre: ${track.genre}` : "Genre: -"}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="deezerPlayer_btn deezerPlayer_trackAddBtn deezerPlayer_trackAddBtn--added"
                      onClick={() => removeTrackFromPlaylist(playableTrack)}
                      aria-label="Remove from playlist"
                      title="Remove from playlist"
                    >
                      <i className="fi fi-rr-apps-delete" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default JamendoPlayer;
