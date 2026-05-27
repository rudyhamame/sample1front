import React from "react";
import { apiUrl } from "./config/api";
import "./soundcloudPlayer.css";

const DEFAULT_SOUNDCLOUD_URL = "https://soundcloud.com/forss/flickermood";

const DEFAULT_QUEUE_ENTRY = {
  id: DEFAULT_SOUNDCLOUD_URL,
  title: "Flickermood",
  artist: "Forss",
  cover: "",
  url: DEFAULT_SOUNDCLOUD_URL,
  durationMs: 0,
};

const buildWidgetSrc = (resourceUrl = "") =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    String(resourceUrl || "").trim(),
  )}&auto_play=true&hide_related=false&show_comments=false&show_user=true&show_reposts=false&visual=true`;

const normalizeSearchTrack = (entry = {}) => ({
  id:
    String(entry?.id || "").trim() ||
    String(entry?.permalink_url || "").trim(),
  title: String(entry?.title || "").trim(),
  artist: String(entry?.user?.username || "").trim(),
  cover: String(entry?.artwork_url || entry?.user?.avatar_url || "").trim(),
  url: String(entry?.permalink_url || "").trim(),
  durationMs: Number(entry?.duration || 0) || 0,
});

const formatDuration = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

function SoundCloudPlayer({ serverReply }) {
  const [resourceUrlInput, setResourceUrlInput] = React.useState(
    DEFAULT_SOUNDCLOUD_URL,
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [queue, setQueue] = React.useState([DEFAULT_QUEUE_ENTRY]);
  const [activeTrackId, setActiveTrackId] = React.useState(
    DEFAULT_QUEUE_ENTRY.id,
  );
  const [activeMeta, setActiveMeta] = React.useState({
    title: DEFAULT_QUEUE_ENTRY.title,
    authorName: DEFAULT_QUEUE_ENTRY.artist,
    thumbnailUrl: "",
    providerName: "SoundCloud",
  });
  const [isLoadingEmbed, setIsLoadingEmbed] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchEnabled, setSearchEnabled] = React.useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = React.useState("");
  const [widgetScriptReady, setWidgetScriptReady] = React.useState(false);
  const [widgetReady, setWidgetReady] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const iframeRef = React.useRef(null);
  const widgetRef = React.useRef(null);

  const publish = (message) => {
    if (typeof serverReply === "function") {
      serverReply(String(message || ""));
    }
  };

  const activeTrack =
    queue.find((entry) => String(entry?.id) === String(activeTrackId)) || null;

  const selectTrackById = (nextId) => {
    const nextTrack =
      queue.find((entry) => String(entry?.id) === String(nextId)) || null;
    if (!nextTrack) {
      return;
    }
    setActiveTrackId(nextTrack.id);
    setResourceUrlInput(nextTrack.url);
  };

  const playPrev = () => {
    if (!activeTrack || queue.length === 0) {
      return;
    }
    const currentIndex = queue.findIndex(
      (entry) => String(entry?.id) === String(activeTrack.id),
    );
    if (currentIndex < 0) {
      return;
    }
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    selectTrackById(queue[prevIndex]?.id);
  };

  const playNext = () => {
    if (!activeTrack || queue.length === 0) {
      return;
    }
    const currentIndex = queue.findIndex(
      (entry) => String(entry?.id) === String(activeTrack.id),
    );
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = (currentIndex + 1) % queue.length;
    selectTrackById(queue[nextIndex]?.id);
  };

  const loadEmbedForUrl = async (nextUrl, options = {}) => {
    const normalizedUrl = String(nextUrl || "").trim();
    if (!normalizedUrl) {
      publish("Paste a SoundCloud URL first.");
      return;
    }

    setIsLoadingEmbed(true);
    try {
      const response = await fetch(
        apiUrl(`/api/soundcloud/oembed?url=${encodeURIComponent(normalizedUrl)}`),
        { method: "GET", mode: "cors" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load SoundCloud track.");
      }

      const nextEntry = {
        id: normalizedUrl,
        title: String(payload?.title || normalizedUrl).trim(),
        artist: String(payload?.authorName || "SoundCloud").trim(),
        cover: String(payload?.thumbnailUrl || "").trim(),
        url: normalizedUrl,
        durationMs: 0,
      };

      setQueue((currentQueue) => {
        const keepCurrentQueue =
          options?.replaceQueue === false && Array.isArray(currentQueue);
        if (!keepCurrentQueue) {
          return [nextEntry];
        }
        const nextQueue = currentQueue.filter(
          (entry) => String(entry?.url || "").trim() !== normalizedUrl,
        );
        return [nextEntry, ...nextQueue];
      });
      setActiveTrackId(nextEntry.id);
      setActiveMeta({
        title: nextEntry.title,
        authorName: nextEntry.artist,
        thumbnailUrl: nextEntry.cover,
        providerName: String(payload?.providerName || "SoundCloud").trim(),
      });
      publish(`Loaded ${nextEntry.title}.`);
    } catch (error) {
      publish(error?.message || "Unable to load SoundCloud track.");
    } finally {
      setIsLoadingEmbed(false);
    }
  };

  const searchTracks = async () => {
    const query = String(searchQuery || "").trim();
    if (!query) {
      publish("Type a search query for SoundCloud.");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        apiUrl(
          `/api/soundcloud/search?q=${encodeURIComponent(query)}&limit=25`,
        ),
        { method: "GET", mode: "cors" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to search SoundCloud.");
      }

      const nextTracks = Array.isArray(payload)
        ? payload.map(normalizeSearchTrack).filter((entry) => entry.id && entry.url)
        : Array.isArray(payload?.collection)
          ? payload.collection
              .map(normalizeSearchTrack)
              .filter((entry) => entry.id && entry.url)
          : [];

      setQueue(nextTracks);
      setActiveTrackId(String(nextTracks[0]?.id || ""));
      if (nextTracks[0]) {
        setResourceUrlInput(nextTracks[0].url);
      }
      publish(
        nextTracks.length > 0
          ? `Found ${nextTracks.length} SoundCloud tracks.`
          : "No SoundCloud tracks found.",
      );
    } catch (error) {
      publish(error?.message || "Unable to search SoundCloud.");
    } finally {
      setIsSearching(false);
    }
  };

  const togglePlayback = () => {
    const widget = widgetRef.current;
    if (!widget || !widgetReady) {
      return;
    }
    widget.getIsPaused((paused) => {
      if (paused) {
        widget.play();
        return;
      }
      widget.pause();
    });
  };

  React.useEffect(() => {
    loadEmbedForUrl(DEFAULT_SOUNDCLOUD_URL);
  }, []);

  React.useEffect(() => {
    let isCancelled = false;
    const loadConfig = async () => {
      try {
        const response = await fetch(apiUrl("/api/soundcloud/config"), {
          method: "GET",
          mode: "cors",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || isCancelled) {
          return;
        }
        setSearchEnabled(Boolean(payload?.searchEnabled));
        setSearchStatusMessage(String(payload?.message || "").trim());
      } catch {}
    };
    loadConfig();
    return () => {
      isCancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (window.SC?.Widget) {
      setWidgetScriptReady(true);
      return undefined;
    }

    const existingScript = document.getElementById(
      "soundcloud-widget-api-script",
    );
    if (existingScript) {
      const handleLoad = () => setWidgetScriptReady(true);
      existingScript.addEventListener("load", handleLoad);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.id = "soundcloud-widget-api-script";
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => setWidgetScriptReady(true);
    document.body.appendChild(script);
    return undefined;
  }, []);

  React.useEffect(() => {
    setWidgetReady(false);
    setIsPlaying(false);
  }, [activeTrack?.url]);

  React.useEffect(() => {
    if (!activeTrack) {
      return;
    }
    setActiveMeta({
      title: activeTrack.title || "SoundCloud",
      authorName: activeTrack.artist || "SoundCloud",
      thumbnailUrl: activeTrack.cover || "",
      providerName: "SoundCloud",
    });
  }, [activeTrack]);

  React.useEffect(() => {
    if (!widgetScriptReady || !iframeRef.current || !activeTrack?.url) {
      return undefined;
    }
    if (!window.SC?.Widget) {
      return undefined;
    }

    const widget = window.SC.Widget(iframeRef.current);
    widgetRef.current = widget;

    const handleReady = () => {
      setWidgetReady(true);
      widget.play();
      setIsPlaying(true);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleFinish = () => {
      if (!activeTrack || queue.length === 0) {
        return;
      }
      const currentIndex = queue.findIndex(
        (entry) => String(entry?.id) === String(activeTrack.id),
      );
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = (currentIndex + 1) % queue.length;
      selectTrackById(queue[nextIndex]?.id);
    };

    widget.bind(window.SC.Widget.Events.READY, handleReady);
    widget.bind(window.SC.Widget.Events.PLAY, handlePlay);
    widget.bind(window.SC.Widget.Events.PAUSE, handlePause);
    widget.bind(window.SC.Widget.Events.FINISH, handleFinish);

    return () => {
      try {
        widget.unbind(window.SC.Widget.Events.READY);
        widget.unbind(window.SC.Widget.Events.PLAY);
        widget.unbind(window.SC.Widget.Events.PAUSE);
        widget.unbind(window.SC.Widget.Events.FINISH);
      } catch {}
    };
  }, [activeTrack, queue, widgetScriptReady]);

  return (
    <section id="soundCloudPlayerPage" className="soundCloudPlayerPage">
      <header className="soundCloudPlayerPage_header">
        <h1>SoundCloud Music Player</h1>
        <p>
          Load a SoundCloud track or playlist URL, or search the catalog when
          the backend has a `SOUNDCLOUD_CLIENT_ID`.
        </p>
      </header>

      <div className="soundCloudPlayerPage_controls">
        <input
          id="soundCloudPlayer_urlInput"
          type="text"
          className="soundCloudPlayer_input"
          value={resourceUrlInput}
          placeholder="Paste SoundCloud track or playlist URL"
          onChange={(event) => setResourceUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              loadEmbedForUrl(resourceUrlInput);
            }
          }}
        />
        <button
          id="soundCloudPlayer_loadBtn"
          type="button"
          className="soundCloudPlayer_btn"
          onClick={() => loadEmbedForUrl(resourceUrlInput)}
          disabled={isLoadingEmbed}
        >
          Load URL
        </button>
      </div>

      <div className="soundCloudPlayerPage_controls">
        <input
          id="soundCloudPlayer_searchInput"
          type="text"
          className="soundCloudPlayer_input"
          value={searchQuery}
          placeholder="Search SoundCloud tracks"
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchTracks();
            }
          }}
        />
        <button
          id="soundCloudPlayer_searchBtn"
          type="button"
          className="soundCloudPlayer_btn"
          onClick={searchTracks}
          disabled={!searchEnabled || isSearching}
        >
          Search
        </button>
      </div>

      {searchStatusMessage ? (
        <p className="soundCloudPlayer_status">{searchStatusMessage}</p>
      ) : null}

      <div className="soundCloudPlayerPage_layout">
        <aside className="soundCloudPlayer_list">
          {queue.map((track) => (
            <button
              key={track.id}
              type="button"
              className={`soundCloudPlayer_trackItem${
                String(track.id) === String(activeTrackId) ? " is-active" : ""
              }`}
              onClick={() => selectTrackById(track.id)}
            >
              {track.cover ? <img src={track.cover} alt="" /> : <div />}
              <span>{track.title || "Untitled track"}</span>
              <small>{track.artist || "SoundCloud"}</small>
            </button>
          ))}
        </aside>

        <article className="soundCloudPlayer_nowPlaying">
          {activeTrack ? (
            <>
              {activeMeta?.thumbnailUrl ? (
                <img
                  src={activeMeta.thumbnailUrl}
                  alt=""
                  className="soundCloudPlayer_cover"
                />
              ) : null}
              <h2>{activeMeta?.title || activeTrack.title || "SoundCloud"}</h2>
              <p>{activeMeta?.authorName || activeTrack.artist || "SoundCloud"}</p>
              {activeTrack.durationMs > 0 ? (
                <p>{formatDuration(activeTrack.durationMs)}</p>
              ) : null}
              <div className="soundCloudPlayer_transport">
                <button
                  type="button"
                  className="soundCloudPlayer_btn"
                  onClick={playPrev}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="soundCloudPlayer_btn"
                  onClick={togglePlayback}
                  disabled={!widgetReady}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  className="soundCloudPlayer_btn"
                  onClick={playNext}
                >
                  Next
                </button>
              </div>
              <iframe
                key={activeTrack.url}
                ref={iframeRef}
                id="soundCloudPlayer_iframe"
                className="soundCloudPlayer_iframe"
                title={activeMeta?.title || activeTrack.title || "SoundCloud player"}
                src={buildWidgetSrc(activeTrack.url)}
                allow="autoplay"
              />
            </>
          ) : (
            <p>No SoundCloud item selected.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default SoundCloudPlayer;
