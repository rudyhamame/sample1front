import React from "react";
import { apiUrl } from "./config/api";
import "./deezerPlayer.css";

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

const normalizeTrack = (entry = {}) => ({
  id: Number(entry?.id || 0),
  title: String(entry?.title || "").trim(),
  artist: String(entry?.artist?.name || "").trim(),
  album: String(entry?.album?.title || "").trim(),
  cover: String(entry?.album?.cover_medium || entry?.album?.cover || "").trim(),
  preview: String(entry?.preview || "").trim(),
  duration: Number(entry?.duration || 0),
});

function DeezerPlayer({ serverReply }) {
  const [query, setQuery] = React.useState("");
  const [tracks, setTracks] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTrackId, setActiveTrackId] = React.useState(0);
  const audioRef = React.useRef(null);

  const activeTrack = React.useMemo(
    () => tracks.find((track) => Number(track.id) === Number(activeTrackId)) || null,
    [activeTrackId, tracks],
  );

  const publish = React.useCallback(
    (message) => {
      if (typeof serverReply === "function") {
        serverReply(String(message || ""));
      }
    },
    [serverReply],
  );

  const searchTracks = React.useCallback(async () => {
    const q = String(query || "").trim();
    if (!q) {
      publish("Type a search query for Deezer.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        apiUrl(`/api/deezer/search?q=${encodeURIComponent(q)}&limit=25`),
        { method: "GET", mode: "cors" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to search Deezer.");
      }
      const nextTracks = Array.isArray(payload?.data)
        ? payload.data.map(normalizeTrack).filter((track) => track.id)
        : [];
      setTracks(nextTracks);
      setActiveTrackId(Number(nextTracks[0]?.id || 0));
      publish(
        nextTracks.length > 0
          ? `Found ${nextTracks.length} tracks.`
          : "No tracks found.",
      );
    } catch (error) {
      publish(error?.message || "Unable to search Deezer.");
    } finally {
      setIsLoading(false);
    }
  }, [publish, query]);

  const loadChart = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl("/api/deezer/chart"), {
        method: "GET",
        mode: "cors",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Deezer chart.");
      }
      const nextTracks = Array.isArray(payload?.data)
        ? payload.data.map(normalizeTrack).filter((track) => track.id)
        : [];
      setTracks(nextTracks);
      setActiveTrackId(Number(nextTracks[0]?.id || 0));
      publish(
        nextTracks.length > 0
          ? "Loaded Deezer top chart."
          : "No chart tracks found.",
      );
    } catch (error) {
      publish(error?.message || "Unable to load Deezer chart.");
    } finally {
      setIsLoading(false);
    }
  }, [publish]);

  React.useEffect(() => {
    loadChart();
  }, [loadChart]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack?.preview) {
      return;
    }
    audio.load();
    audio.play().catch(() => {});
  }, [activeTrack?.id, activeTrack?.preview]);

  const playPrev = () => {
    if (tracks.length === 0 || !activeTrackId) {
      return;
    }
    const currentIndex = tracks.findIndex((t) => Number(t.id) === Number(activeTrackId));
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setActiveTrackId(Number(tracks[prevIndex]?.id || 0));
  };

  const playNext = () => {
    if (tracks.length === 0 || !activeTrackId) {
      return;
    }
    const currentIndex = tracks.findIndex((t) => Number(t.id) === Number(activeTrackId));
    const nextIndex = (currentIndex + 1) % tracks.length;
    setActiveTrackId(Number(tracks[nextIndex]?.id || 0));
  };

  return (
    <section id="deezerPlayerPage" className="deezerPlayerPage">
      <header className="deezerPlayerPage_header">
        <h1>Deezer Music Player</h1>
        <p>Search tracks and play 30-second previews.</p>
      </header>

      <div className="deezerPlayerPage_controls">
        <input
          id="deezerPlayer_searchInput"
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
          id="deezerPlayer_searchBtn"
          type="button"
          className="deezerPlayer_btn"
          onClick={searchTracks}
          disabled={isLoading}
        >
          Search
        </button>
        <button
          id="deezerPlayer_chartBtn"
          type="button"
          className="deezerPlayer_btn"
          onClick={loadChart}
          disabled={isLoading}
        >
          Top Chart
        </button>
      </div>

      <div className="deezerPlayerPage_layout">
        <aside className="deezerPlayer_list">
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              className={`deezerPlayer_trackItem${Number(track.id) === Number(activeTrackId) ? " is-active" : ""}`}
              onClick={() => setActiveTrackId(track.id)}
            >
              <img src={track.cover} alt="" />
              <span>{track.title}</span>
              <small>{track.artist}</small>
            </button>
          ))}
        </aside>

        <article className="deezerPlayer_nowPlaying">
          {activeTrack ? (
            <>
              <img src={activeTrack.cover} alt="" className="deezerPlayer_cover" />
              <div className="deezerPlayer_nowPlayingDetails">
                <h2>{activeTrack.title}</h2>
                <p>{activeTrack.artist}</p>
                <p>{activeTrack.album}</p>
                <p>{formatDuration(activeTrack.duration)}</p>
                <div className="deezerPlayer_transport">
                  <button type="button" className="deezerPlayer_btn" onClick={playPrev}>
                    Prev
                  </button>
                  <button type="button" className="deezerPlayer_btn" onClick={playNext}>
                    Next
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  controls
                  src={activeTrack.preview || ""}
                  className="deezerPlayer_audio"
                />
              </div>
            </>
          ) : (
            <p>No track selected.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default DeezerPlayer;
