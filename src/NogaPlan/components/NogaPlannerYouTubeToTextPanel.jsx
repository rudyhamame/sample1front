import React from "react";
import { apiUrl } from "../../config/api";
import { readStoredSession } from "../../utils/sessionCleanup";

const POLL_INTERVAL_MS = 2500;

const DEFAULT_MODE = "auto";

const buildAuthorizedHeaders = () => {
  const token = String(readStoredSession?.()?.token || "").trim();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const NogaPlannerYouTubeToTextPanel = ({ planner }) => {
  const userId = String(planner?.props?.state?.my_id || "").trim();
  const [youtubeUrl, setYoutubeUrl] = React.useState("");
  const [lang, setLang] = React.useState("");
  const [mode, setMode] = React.useState(DEFAULT_MODE);
  const [jobId, setJobId] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [transcript, setTranscript] = React.useState("");
  const [transcriptLang, setTranscriptLang] = React.useState("");
  const [availableLangs, setAvailableLangs] = React.useState([]);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);

  const canSubmit = Boolean(youtubeUrl.trim()) && Boolean(userId) && !isSubmitting;
  const isBusy = isSubmitting || isPolling;

  const publish = React.useCallback(
    (message) => {
      planner?.props?.serverReply?.(String(message || ""));
    },
    [planner],
  );

  const resetOutput = React.useCallback(() => {
    setJobId("");
    setStatus("idle");
    setTranscript("");
    setTranscriptLang("");
    setAvailableLangs([]);
    setErrorMessage("");
  }, []);

  const fetchJobStatus = React.useCallback(
    async (targetJobId) => {
      if (!targetJobId || !userId) {
        return;
      }

      setIsPolling(true);
      try {
        const response = await fetch(
          apiUrl(
            `/api/user/supadata/youtube-to-text/${encodeURIComponent(
              userId,
            )}/${encodeURIComponent(targetJobId)}`,
          ),
          {
            method: "GET",
            headers: buildAuthorizedHeaders(),
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            String(payload?.message || "Failed to fetch transcript job."),
          );
        }

        const nextStatus = String(payload?.status || "queued").trim().toLowerCase();
        setStatus(nextStatus);

        if (nextStatus === "completed") {
          setTranscript(String(payload?.content || "").trim());
          setTranscriptLang(String(payload?.lang || "").trim());
          setAvailableLangs(
            Array.isArray(payload?.availableLangs) ? payload.availableLangs : [],
          );
          setJobId("");
          publish("YouTube transcript is ready.");
        } else if (nextStatus === "failed") {
          const nextError = String(
            payload?.error?.details ||
              payload?.error?.message ||
              payload?.message ||
              "Transcript job failed.",
          ).trim();
          setErrorMessage(nextError);
          setJobId("");
          publish(nextError);
        }
      } catch (error) {
        const nextError = String(
          error?.message || "Failed to fetch transcript job.",
        ).trim();
        setErrorMessage(nextError);
        setJobId("");
        setStatus("failed");
        publish(nextError);
      } finally {
        setIsPolling(false);
      }
    },
    [publish, userId],
  );

  React.useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      fetchJobStatus(jobId);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchJobStatus, jobId, status]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setTranscript("");
    setTranscriptLang("");
    setAvailableLangs([]);
    setJobId("");
    setStatus("submitting");

    try {
      const response = await fetch(
        apiUrl(`/api/user/supadata/youtube-to-text/${encodeURIComponent(userId)}`),
        {
          method: "POST",
          headers: buildAuthorizedHeaders(),
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            lang: lang.trim(),
            mode,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          String(payload?.message || "Failed to fetch YouTube transcript."),
        );
      }

      if (String(payload?.status || "").trim().toLowerCase() === "queued" && payload?.jobId) {
        setJobId(String(payload.jobId || "").trim());
        setStatus("queued");
        publish("Transcript job queued. Polling Supadata now.");
        return;
      }

      setStatus("completed");
      setTranscript(String(payload?.content || "").trim());
      setTranscriptLang(String(payload?.lang || "").trim());
      setAvailableLangs(
        Array.isArray(payload?.availableLangs) ? payload.availableLangs : [],
      );
      publish("YouTube transcript fetched.");
    } catch (error) {
      const nextError = String(
        error?.message || "Failed to fetch YouTube transcript.",
      ).trim();
      setErrorMessage(nextError);
      setStatus("failed");
      publish(nextError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!transcript) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transcript);
      publish("Transcript copied.");
    } catch {
      publish("Unable to copy transcript.");
    }
  };

  const handleDownload = () => {
    if (!transcript) {
      return;
    }

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "youtube-transcript.txt";
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <section
      id="nogaPlanner_youtubeToTextPanel"
      className="nogaPlanner_youtubeToTextPanel"
    >
      <div className="nogaPlanner_youtubeToTextPanelHeader">
        <div>
          <span className="nogaPlanner_savedCoursesTableSubEyebrow">
            Supadata
          </span>
          <h2 className="nogaPlanner_youtubeToTextPanelTitle">YouTube to Text</h2>
        </div>
        <div className="nogaPlanner_youtubeToTextPanelStatus">
          <strong>{isBusy ? "Working" : "Ready"}</strong>
          <span>{status === "queued" ? "Polling transcript job" : transcriptLang || "Plain text output"}</span>
        </div>
      </div>

      <form
        id="nogaPlanner_youtubeToTextForm"
        className="nogaPlanner_youtubeToTextForm"
        onSubmit={handleSubmit}
      >
        <label className="nogaPlanner_youtubeToTextField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">YouTube URL</span>
          <input
            id="nogaPlanner_youtubeToTextUrl"
            type="url"
            className="nogaPlanner_homeIntervalsInput"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(String(event.target.value || ""))}
            disabled={isBusy}
          />
        </label>

        <div className="nogaPlanner_youtubeToTextFormGrid">
          <label className="nogaPlanner_youtubeToTextField">
            <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Language</span>
            <input
              id="nogaPlanner_youtubeToTextLang"
              type="text"
              className="nogaPlanner_homeIntervalsInput"
              placeholder="en"
              value={lang}
              onChange={(event) => setLang(String(event.target.value || ""))}
              disabled={isBusy}
            />
          </label>

          <label className="nogaPlanner_youtubeToTextField">
            <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Mode</span>
            <select
              id="nogaPlanner_youtubeToTextMode"
              className="nogaPlanner_homeIntervalsInput"
              value={mode}
              onChange={(event) =>
                setMode(String(event.target.value || DEFAULT_MODE).trim().toLowerCase())
              }
              disabled={isBusy}
            >
              <option value="auto">Auto</option>
              <option value="native">Native</option>
              <option value="generate">Generate</option>
            </select>
          </label>
        </div>

        <div className="nogaPlanner_youtubeToTextActions">
          <button
            type="submit"
            className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
            disabled={!canSubmit}
          >
            {isBusy ? "Fetching..." : "Get Transcript"}
          </button>
          <button
            type="button"
            className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
            onClick={() => {
              setYoutubeUrl("");
              setLang("");
              setMode(DEFAULT_MODE);
              resetOutput();
            }}
            disabled={isBusy}
          >
            Reset
          </button>
          <button
            type="button"
            className="nogaPlanner_homePanelCardSetBtn"
            onClick={handleCopy}
            disabled={!transcript}
          >
            Copy
          </button>
          <button
            type="button"
            className="nogaPlanner_homePanelCardSetBtn"
            onClick={handleDownload}
            disabled={!transcript}
          >
            Download
          </button>
        </div>
      </form>

      {availableLangs.length > 0 ? (
        <div className="nogaPlanner_youtubeToTextLangs">
          <span className="nogaPlanner_savedCoursesTableSubEyebrow">
            Available languages
          </span>
          <div className="nogaPlanner_youtubeToTextLangChips">
            {availableLangs.map((entry) => (
              <span
                key={`nogaPlanner_youtubeToTextLang_${entry}`}
                className="nogaPlanner_youtubeToTextLangChip"
              >
                {String(entry || "").trim()}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="nogaPlanner_youtubeToTextError" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="nogaPlanner_youtubeToTextOutputCard">
        <div className="nogaPlanner_youtubeToTextOutputHeader">
          <span className="nogaPlanner_savedCoursesTableSubEyebrow">Transcript</span>
          <strong>
            {jobId
              ? `Job: ${jobId}`
              : transcript
                ? `${transcript.split(/\s+/).filter(Boolean).length} words`
                : "No transcript yet"}
          </strong>
        </div>
        <textarea
          id="nogaPlanner_youtubeToTextOutput"
          className="nogaPlanner_youtubeToTextOutput"
          value={transcript}
          readOnly
          placeholder="Transcript text will appear here."
        />
      </div>
    </section>
  );
};

export default NogaPlannerYouTubeToTextPanel;
