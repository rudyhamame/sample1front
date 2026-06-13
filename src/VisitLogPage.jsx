import React from "react";
import { apiUrl } from "./config/api";
import "./visitLogPage.css";

const VISIT_LOG_OWNER_USERNAME = "rudyhamame";

const formatVisitTimestamp = (value) => {
  const visitedAt = new Date(value);

  if (Number.isNaN(visitedAt.getTime())) {
    return "Unknown time";
  }

  return `${visitedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} ${visitedAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
};

const VisitLogPage = ({ state, serverReply }) => {
  const normalizedUsername = String(state?.username || "").trim().toLowerCase();
  const canAccessVisitLog = normalizedUsername === VISIT_LOG_OWNER_USERNAME;
  const [visitLogEntries, setVisitLogEntries] = React.useState([]);
  const [isVisitLogLoading, setIsVisitLogLoading] = React.useState(false);
  const [isVisitLogDeleting, setIsVisitLogDeleting] = React.useState(false);
  const [visitLogError, setVisitLogError] = React.useState("");

  const [videoGate, setVideoGate] = React.useState(null);
  const [videoGateForm, setVideoGateForm] = React.useState({ companyName: "", password: "", enabled: true });
  const [videoGateSaving, setVideoGateSaving] = React.useState(false);
  const [videoGateMessage, setVideoGateMessage] = React.useState("");

  React.useEffect(() => {
    if (!canAccessVisitLog || !state?.token) return;
    fetch(apiUrl("/api/user/video-gate"), {
      headers: { Authorization: `Bearer ${state.token}` },
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data?.videoGate) {
          setVideoGate(data.videoGate);
          setVideoGateForm((f) => ({
            ...f,
            companyName: data.videoGate.companyName || "",
            enabled: data.videoGate.enabled !== false,
          }));
        }
      })
      .catch(() => {});
  }, [canAccessVisitLog, state?.token]);

  const saveVideoGate = async (e) => {
    e.preventDefault();
    if (videoGateSaving) return;
    setVideoGateSaving(true);
    setVideoGateMessage("");
    try {
      const res = await fetch(apiUrl("/api/user/video-gate"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          enabled: videoGateForm.enabled,
          companyName: videoGateForm.companyName,
          password: videoGateForm.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save.");
      setVideoGate(data.videoGate);
      setVideoGateForm((f) => ({ ...f, password: "" }));
      setVideoGateMessage("Saved.");
    } catch (err) {
      setVideoGateMessage(err?.message || "Failed to save.");
    } finally {
      setVideoGateSaving(false);
    }
  };

  const loadVisitLog = React.useCallback(() => {
    if (!canAccessVisitLog || !state?.token) {
      setVisitLogEntries([]);
      setVisitLogError("");
      setIsVisitLogLoading(false);
      return;
    }

    let isMounted = true;
    setIsVisitLogLoading(true);
    setVisitLogError("");

    fetch(apiUrl("/api/user/visit-log"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load the visit log right now.",
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setVisitLogEntries(Array.isArray(payload?.visitLog) ? payload.visitLog : []);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setVisitLogError(
          error?.message || "Unable to load the visit log right now.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsVisitLogLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canAccessVisitLog, state?.token]);

  React.useEffect(() => {
    const cleanup = loadVisitLog();
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [loadVisitLog, state?.visitLogRefreshToken]);

  const clearVisitLog = async () => {
    if (!canAccessVisitLog || !state?.token || isVisitLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all visit log entries?",
    );

    if (!shouldDelete) {
      return;
    }

    setIsVisitLogDeleting(true);
    setVisitLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/visit-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the visit log right now.",
        );
      }

      setVisitLogEntries([]);
      if (typeof serverReply === "function") {
        serverReply(payload?.message || "Visit log cleared.");
      }
    } catch (error) {
      setVisitLogError(
        error?.message || "Unable to delete the visit log right now.",
      );
    } finally {
      setIsVisitLogDeleting(false);
    }
  };

  if (!canAccessVisitLog) {
    return null;
  }

  return (
    <section id="VisitLogPage_article" className="fc">
      <header id="VisitLogPage_header" className="fr">
        <div className="fc VisitLogPage_headerCopy">
          <p className="VisitLogPage_eyebrow">Admin window</p>
          <h1>Visit-Log</h1>
          <p className="VisitLogPage_subtitle">
            Review incoming app visits and clear the history when needed.
          </p>
        </div>
        <div className="fr VisitLogPage_headerActions">
          <button
            type="button"
            className="VisitLogPage_button"
            onClick={() => loadVisitLog()}
            disabled={isVisitLogLoading}
          >
            {isVisitLogLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="VisitLogPage_button VisitLogPage_button--danger"
            onClick={clearVisitLog}
            disabled={isVisitLogDeleting}
          >
            {isVisitLogDeleting ? "Resetting..." : "Reset"}
          </button>
        </div>
      </header>

      <section id="VisitLogPage_videoGate" className="fc">
        <div className="VisitLogPage_videoGateHero fc">
          <div className="VisitLogPage_videoGateHeroTop fr">
            <div className="fc VisitLogPage_videoGateCopy">
              <p className="VisitLogPage_eyebrow">Access control</p>
              <h2 className="VisitLogPage_sectionTitle">Video Gate</h2>
              <p className="VisitLogPage_subtitle">
                Control access to the login-page video. When gate is enabled, the video is open to all visitors. When disabled, only visitors who enter the correct company name and password can view it.
              </p>
            </div>
            <div className="VisitLogPage_videoGatePill">
              {videoGateForm.enabled ? "Public" : "Gated"}
            </div>
          </div>
          <div className="VisitLogPage_videoGateStats">
            <div className="VisitLogPage_videoGateStat">
              <span className="VisitLogPage_videoGateStatLabel">Authorized visitors</span>
              <strong className="VisitLogPage_videoGateStatValue">
                {Number(videoGate?.authorizedCount || 0)}
              </strong>
            </div>
            <div className="VisitLogPage_videoGateStat">
              <span className="VisitLogPage_videoGateStatLabel">Company</span>
              <strong className="VisitLogPage_videoGateStatValue">
                {videoGateForm.companyName?.trim() || "Not set"}
              </strong>
            </div>
          </div>
        </div>
        <form className="fc VisitLogPage_videoGateForm" onSubmit={saveVideoGate} noValidate>
          <label className="VisitLogPage_videoGateLabel">
            <input
              type="checkbox"
              checked={videoGateForm.enabled}
              onChange={(e) => setVideoGateForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            {" "}Gate enabled
          </label>
          <input
            className="VisitLogPage_input"
            type="text"
            placeholder="Company name"
            value={videoGateForm.companyName}
            onChange={(e) => setVideoGateForm((f) => ({ ...f, companyName: e.target.value }))}
          />
          <input
            className="VisitLogPage_input"
            type="password"
            placeholder={videoGate?.hasPassword ? "New password (leave blank to keep current)" : "Password"}
            value={videoGateForm.password}
            onChange={(e) => setVideoGateForm((f) => ({ ...f, password: e.target.value }))}
          />
          {videoGateMessage && (
            <p className="VisitLogPage_videoGateMessage">{videoGateMessage}</p>
          )}
          <button
            type="submit"
            className="VisitLogPage_button"
            disabled={videoGateSaving}
          >
            {videoGateSaving ? "Saving…" : "Save"}
          </button>
        </form>
        {Array.isArray(videoGate?.recentAuthorizedVisitors) &&
        videoGate.recentAuthorizedVisitors.length > 0 ? (
          <div className="fc VisitLogPage_videoGateRecent">
            <div className="VisitLogPage_videoGateRecentHeader fr">
              <h3 className="VisitLogPage_videoGateRecentTitle">Recent unlocks</h3>
              <span className="VisitLogPage_videoGateRecentCount">
                {videoGate.recentAuthorizedVisitors.length}
              </span>
            </div>
            {videoGate.recentAuthorizedVisitors.map((visitor, index) => (
              <div
                key={`${visitor?.ip || "visitor"}-${visitor?.verifiedAt || index}`}
                className="VisitLogPage_videoGateRecentItem"
              >
                <div className="VisitLogPage_videoGateRecentPrimary">
                  <span className="VisitLogPage_videoGateRecentCompany">
                    {visitor?.companyName || "Authorized"}
                  </span>
                  <span className="VisitLogPage_videoGateRecentIp">
                    {visitor?.ip || "Unknown IP"}
                  </span>
                </div>
                <div className="VisitLogPage_videoGateRecentMeta">
                  <span>{visitor?.country || "Unknown"}</span>
                  <span>
                    {visitor?.verifiedAt
                      ? formatVisitTimestamp(visitor.verifiedAt)
                      : "No time"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div id="VisitLogPage_body" className="fc">
        {visitLogError ? (
          <div className="VisitLogPage_emptyState">{visitLogError}</div>
        ) : isVisitLogLoading && visitLogEntries.length === 0 ? (
          <div className="VisitLogPage_emptyState">Loading visit log...</div>
        ) : visitLogEntries.length === 0 ? (
          <div className="VisitLogPage_emptyState">
            No visit records to show yet.
          </div>
        ) : (
          <ul className="fc VisitLogPage_list">
            {visitLogEntries.map((entry, index) => (
              <li
                key={`${entry?._id || entry?.ip || "visit"}-${entry?.visitedAt || index}`}
                className="VisitLogPage_card fc"
              >
                <div className="fr VisitLogPage_cardTop">
                  <span className="VisitLogPage_index">
                    #{visitLogEntries.length - index}
                  </span>
                  <span className="VisitLogPage_country">
                    {entry?.country || "Unknown"}
                  </span>
                </div>
                <div className="VisitLogPage_row">
                  <span className="VisitLogPage_label">IP</span>
                  <span className="VisitLogPage_value">
                    {entry?.ip || "Unknown IP"}
                  </span>
                </div>
                <div className="VisitLogPage_row">
                  <span className="VisitLogPage_label">Visited</span>
                  <span className="VisitLogPage_value">
                    {formatVisitTimestamp(entry?.visitedAt)}
                  </span>
                </div>
                <div className="VisitLogPage_row">
                  <span className="VisitLogPage_label">Video gate</span>
                  <span className="VisitLogPage_value">
                    {entry?.videoGate?.unlocked
                      ? `Unlocked${entry?.videoGate?.authorizedCompany ? ` · ${entry.videoGate.authorizedCompany}` : ""}`
                      : "Locked"}
                  </span>
                </div>
                {entry?.videoGate?.verifiedAt ? (
                  <div className="VisitLogPage_row">
                    <span className="VisitLogPage_label">Verified</span>
                    <span className="VisitLogPage_value">
                      {formatVisitTimestamp(entry.videoGate.verifiedAt)}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default VisitLogPage;
