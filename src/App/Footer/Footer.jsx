import React from "react";
import SubApps from "../../Nav/SubApps/SubApps";
import { getHomeSubApps } from "../../utils/homeSubApps";
import {
  getPlannerMusicSnapshot,
  playPreviousSharedPlannerMusicTrack,
  setSharedPlannerMusicVolume,
  toggleSharedPlannerMusic,
  playNextSharedPlannerMusicTrack,
} from "../../music/globalMusicPlayer";
import "./Footer.css";

const Footer = ({
  appState,
  onLogout,
  onSetSelectedAiProvider,
  onApplyGraphicsScale,
}) => {
  const VOICE_CALL_MINIMIZED_STORAGE_KEY =
    "phenomed.voiceCall.windowMinimized";
  const [isDarkMode, setIsDarkMode] = React.useState(() =>
    typeof document !== "undefined"
      ? document.body.classList.contains("dark")
      : false,
  );
  const [isHomeNogaVideoMinimized, setIsHomeNogaVideoMinimized] =
    React.useState(false);
  const [isVoiceCallMinimized, setIsVoiceCallMinimized] = React.useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(VOICE_CALL_MINIMIZED_STORAGE_KEY) === "true"
      : false,
  );
  const [voicePromptState, setVoicePromptState] = React.useState({
    isOpen: false,
    tab: "",
    button: "",
    command: "",
  });
  const newMessageAudioRef = React.useRef(null);
  const previousUnreadChatCountsRef = React.useRef({});
  const hasHydratedUnreadCountsRef = React.useRef(false);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isHomeNogaFooterRoute =
    currentPath === "/phenomed/home" ||
    currentPath === "/phenomed/home/" ||
    currentPath.startsWith("/phenomed/home/") ||
    currentPath === "/phenomed/home/noga" ||
    currentPath === "/phenomed/home/noga/" ||
    currentPath.startsWith("/phenomed/home/noga/");
  const isHomeFooterRoute =
    currentPath === "/phenomed/home" || currentPath === "/phenomed/home/";
  const isTelegramControlRoute =
    currentPath === "/phenomed/telegram-control";
  const isMusicPlayerRoute =
    currentPath === "/phenomed/jamendo-player" ||
    currentPath === "/phenomed/deezer-player" ||
    currentPath === "/phenomed/soundcloud-player";
  const isNogaPlanRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.includes("/phenomed/schoolplanner/nogaplan") ||
      window.location.pathname.includes("/phenomed/nogaplan"));
  const normalizedUsername = String(appState.username || "").toLowerCase();
  const isNaghamNogaFooter =
    isNogaPlanRoute && normalizedUsername === "naghamtrkmani";
  const isNogaFooterThemeRoute =
    !isHomeNogaFooterRoute && (isNogaPlanRoute || isNaghamNogaFooter);
  const footerThemeClass = [
    isHomeNogaFooterRoute
      ? "server_answer--home-noga"
      : isNogaFooterThemeRoute
      ? "server_answer--noga"
      : isHomeFooterRoute
        ? "server_answer--home"
        : "",
    isTelegramControlRoute ? "server_answer--telegram" : "",
    isMusicPlayerRoute ? "server_answer--music" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const plannerMusic = appState.planner_music || getPlannerMusicSnapshot();
  const plannerMusicVolume = Math.round(
    Math.min(1, Math.max(0, Number(plannerMusic.volume) || 0)) * 100,
  );
  const footerSubApps = getHomeSubApps(appState.username);
  const selectedAiProvider = String(appState.aiProvider || "openai")
    .trim()
    .toLowerCase();
  const selectedAiStatus =
    appState.ai_connection_statuses?.[selectedAiProvider] || "offline";
  const browserStatus =
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline";
  const userStatus = appState.my_id ? "connected" : "offline";
  const unreadChatCountsByFriendId = React.useMemo(() => {
    const chatEntries = Array.isArray(appState?.chat) ? appState.chat : [];
    const chatLastReadAtByFriendId =
      appState?.chatLastReadAtByFriendId &&
      typeof appState.chatLastReadAtByFriendId === "object"
        ? appState.chatLastReadAtByFriendId
        : {};

    return chatEntries.reduce((accumulator, message) => {
      const friendId = String(message?._id || "").trim();
      const messageSender = String(message?.from || "").trim().toLowerCase();
      const messageStatus = String(message?.status || "").trim().toLowerCase();
      const messageTimestamp = new Date(message?.date || 0).getTime();
      const lastReadAtTimestamp = new Date(
        chatLastReadAtByFriendId[friendId] || 0,
      ).getTime();

      if (
        !friendId ||
        messageSender === "me" ||
        message?.deleted ||
        messageStatus === "read" ||
        (Number.isFinite(messageTimestamp) &&
          Number.isFinite(lastReadAtTimestamp) &&
          messageTimestamp <= lastReadAtTimestamp)
      ) {
        return accumulator;
      }

      accumulator[friendId] = Number(accumulator[friendId] || 0) + 1;
      return accumulator;
    }, {});
  }, [appState?.chat, appState?.chatLastReadAtByFriendId]);
  const appHealthRows = [
    {
      id: "browser",
      label: "Browser network",
      value: browserStatus === "online" ? "Online" : "Offline",
      status: browserStatus,
    },
    {
      id: "user",
      label: "User session",
      value: appState.my_id ? "Signed in" : "Signed out",
      status: userStatus,
    },
    {
      id: "backend",
      label: "Backend",
      value: String(appState.backend_health_status || "checking").toUpperCase(),
      status: appState.backend_health_status || "checking",
    },
    {
      id: "provider",
      label: "Selected AI",
      value: `${selectedAiProvider.toUpperCase()} / ${String(
        selectedAiStatus,
      ).toUpperCase()}`,
      status: selectedAiStatus,
    },
    ...Object.entries(appState.ai_connection_statuses || {}).map(
      ([serviceName, serviceStatus]) => ({
        id: serviceName,
        label: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
        value: String(serviceStatus || "offline").toUpperCase(),
        status: serviceStatus || "offline",
      }),
    ),
  ];
  const aiControl = {
    selectedProvider: selectedAiProvider,
    statuses: appState.ai_connection_statuses || {},
    onSelectProvider: onSetSelectedAiProvider,
  };
  const graphicsScaleEntries = Array.isArray(appState.settings?.ui?.scale)
    ? appState.settings.ui.scale
    : [];
  const graphicsScaleByElement = graphicsScaleEntries.reduce(
    (accumulator, entry) => {
        const rawElement = String(entry?.element || "").trim();
        const element =
          rawElement === "Home_Noga_studysessions_article" ||
          rawElement === "Home_Noga_article"
            ? "app_page"
            : rawElement;
        if (!element) {
          return accumulator;
        }

        accumulator[element] = Number(entry?.scaleNum) || 1;
        return accumulator;
      },
      {},
    );
  const graphicsScaleSettingsKey = JSON.stringify(graphicsScaleByElement);
  const graphicsControl = {
    scaleSettingsByElement: graphicsScaleByElement,
    scaleEntries: graphicsScaleEntries,
    scaleSettingsKey: graphicsScaleSettingsKey,
    onApply: onApplyGraphicsScale,
    defaultTarget: "app_page",
  };


  React.useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark"));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleOpenPrompt = (event) => {
      const detail =
        event?.detail && typeof event.detail === "object" ? event.detail : {};
      setVoicePromptState({
        isOpen: true,
        tab: String(detail?.tab || "").trim(),
        button: String(detail?.button || "").trim(),
        command: String(detail?.command || "").trim(),
      });
    };
    window.addEventListener(
      "noga-voice-command-prompt-open",
      handleOpenPrompt,
    );
    return () => {
      window.removeEventListener(
        "noga-voice-command-prompt-open",
        handleOpenPrompt,
      );
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!newMessageAudioRef.current) {
      newMessageAudioRef.current = new Audio("/sounds/newmessage.mp3");
      newMessageAudioRef.current.preload = "auto";
    }

    return () => {
      if (newMessageAudioRef.current) {
        newMessageAudioRef.current.pause();
        newMessageAudioRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const currentCounts = unreadChatCountsByFriendId || {};
    const previousCounts = previousUnreadChatCountsRef.current || {};
    const normalizedActiveChatFriendId = String(
      appState?.activeChatFriendId || "",
    ).trim();

    if (!hasHydratedUnreadCountsRef.current) {
      previousUnreadChatCountsRef.current = currentCounts;
      hasHydratedUnreadCountsRef.current = true;
      return;
    }

    const hasNewUnreadMessage = Object.keys(currentCounts).some((friendId) => {
      const currentValue = Number(currentCounts[friendId] || 0);
      const previousValue = Number(previousCounts[friendId] || 0);

      return (
        currentValue > previousValue &&
        String(friendId || "").trim() !== normalizedActiveChatFriendId
      );
    });

    previousUnreadChatCountsRef.current = currentCounts;

    if (!hasNewUnreadMessage || !newMessageAudioRef.current) {
      return;
    }

    try {
      newMessageAudioRef.current.currentTime = 0;
      newMessageAudioRef.current.play().catch(() => null);
    } catch {
      // Ignore playback failures.
    }
  }, [appState?.activeChatFriendId, unreadChatCountsByFriendId]);

  const submitVoicePrompt = () => {
    const command = String(voicePromptState?.command || "").trim();
    if (!voicePromptState?.isOpen || !command) {
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("noga-voice-command-prompt-submit", {
          detail: {
            tab: String(voicePromptState?.tab || "").trim(),
            button: String(voicePromptState?.button || "").trim(),
            command,
          },
        }),
      );
    }
    setVoicePromptState({
      isOpen: false,
      tab: "",
      button: "",
      command: "",
    });
  };

  const cancelVoicePrompt = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("noga-voice-command-prompt-cancel"));
    }
    setVoicePromptState({
      isOpen: false,
      tab: "",
      button: "",
      command: "",
    });
  };

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const showVideoTaskButton = () => setIsHomeNogaVideoMinimized(true);
    const hideVideoTaskButton = () => setIsHomeNogaVideoMinimized(false);

    window.addEventListener(
      "home-noga-video-window-minimized",
      showVideoTaskButton,
    );
    window.addEventListener(
      "home-noga-video-window-restored",
      hideVideoTaskButton,
    );
    window.addEventListener(
      "home-noga-video-window-closed",
      hideVideoTaskButton,
    );

    return () => {
      window.removeEventListener(
        "home-noga-video-window-minimized",
        showVideoTaskButton,
      );
      window.removeEventListener(
        "home-noga-video-window-restored",
        hideVideoTaskButton,
      );
      window.removeEventListener(
        "home-noga-video-window-closed",
        hideVideoTaskButton,
      );
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const setMinimized = () => {
      window.localStorage.setItem(VOICE_CALL_MINIMIZED_STORAGE_KEY, "true");
      setIsVoiceCallMinimized(true);
    };
    const setRestored = () => {
      window.localStorage.setItem(VOICE_CALL_MINIMIZED_STORAGE_KEY, "false");
      setIsVoiceCallMinimized(false);
    };

    window.addEventListener("voice-call-window-minimized", setMinimized);
    window.addEventListener("voice-call-window-restored", setRestored);
    window.addEventListener("voice-call-window-closed", setRestored);

    return () => {
      window.removeEventListener("voice-call-window-minimized", setMinimized);
      window.removeEventListener("voice-call-window-restored", setRestored);
      window.removeEventListener("voice-call-window-closed", setRestored);
    };
  }, []);

  const toggleDarkMode = () => {
    if (typeof document === "undefined") {
      return;
    }

    const nextIsDark = !document.body.classList.contains("dark");
    document.body.classList.toggle("dark", nextIsDark);

    document
      .getElementById("PhenomedSocial_article")
      ?.classList.toggle("PhenomedSocial_themeDark", nextIsDark);
    document
      .getElementById("Home_studysessions_article")
      ?.classList.toggle("Home_themeDark", nextIsDark);
    document
      .getElementById("Home_Noga_article")
      ?.classList.toggle("Home_Noga_themeDark", nextIsDark);
    setIsDarkMode(nextIsDark);
  };

  const footerStartActions = [
    {
      id: "darkMode",
      label: isDarkMode ? "Light Mode" : "Dark Mode",
      icon: isDarkMode ? "fas fa-sun" : "fas fa-moon",
      onClick: toggleDarkMode,
    },
    {
      id: "logout",
      label: "Logout",
      icon: "fas fa-sign-out-alt",
      onClick: () => {
        if (typeof onLogout === "function") {
          onLogout();
        }
      },
    },
    ...(isTelegramControlRoute
      ? [
          {
            id: "telegramLoginWindow",
            label: "Telegram Login",
            icon: "fas fa-key",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("telegram-control-open-login-window"),
                );
              }
            },
          },
        ]
      : []),
  ];

  return (
    <footer
      id="server_answer"
      className={`${appState.has_active_server_reply ? "server_answer--active " : ""}${footerThemeClass}`.trim()}
    >
      <div id="server_answer_mainCluster">
        <SubApps
          subApps={footerSubApps}
          startActions={footerStartActions}
          startSettingsItemIds={
            isTelegramControlRoute ? ["action:telegramLoginWindow"] : []
          }
          placement="footer"
          authToken={appState.token}
          appHealth={{ rows: appHealthRows }}
          aiControl={aiControl}
          graphicsControl={graphicsControl}
        />
        {isHomeNogaVideoMinimized ? (
          <div className="SubApps_minimizedWindows fr">
            <button
              type="button"
              className="SubApps_minimizedWindowButton"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("home-noga-video-window-restore"),
                  );
                }
              }}
              title="Restore video player"
            >
              <i className="fas fa-film"></i>
              <span>Video</span>
            </button>
          </div>
        ) : null}
        <div id="server_answer_wrapper">
          <span
            id="server_answer_light"
            className={
              appState.has_active_server_reply ? "server_answer_light--active" : ""
            }
            aria-hidden="true"
          ></span>
          <p
            id="server_answer_message"
            className={
              appState.server_answer === "NO NEW SERVER REPLY"
                ? "server_answer_message--idle"
                : ""
            }
          >
            {voicePromptState?.isOpen ? (
              <span id="server_answer_voicePromptWrap">
                <span id="server_answer_voicePromptMeta">
                  {`${voicePromptState?.tab || "NogaPlanner"} • ${
                    voicePromptState?.button || "-"
                  }`}
                </span>
                <input
                  id="server_answer_voicePromptInput"
                  type="text"
                  value={voicePromptState.command}
                  onChange={(event) =>
                    setVoicePromptState((previousState) => ({
                      ...previousState,
                      command: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitVoicePrompt();
                    }
                  }}
                  placeholder="Type the voice command in English"
                />
                <button
                  id="server_answer_voicePromptSubmit"
                  type="button"
                  onClick={submitVoicePrompt}
                >
                  Save
                </button>
                <button
                  id="server_answer_voicePromptCancel"
                  type="button"
                  onClick={cancelVoicePrompt}
                >
                  Cancel
                </button>
              </span>
            ) : (
              appState.server_answer
            )}
          </p>
        </div>
      </div>
      <div id="server_answer_rightCluster">
        <div
          id="server_answer_musicPlayer"
          className={
            !plannerMusic.isReady ? "server_answer_musicPlayer--idle" : ""
          }
        >
          <button
            type="button"
            id="server_answer_noga_prev"
            className="server_answer_noga_playerButton"
            onClick={() => playPreviousSharedPlannerMusicTrack(true)}
            aria-label="Previous planner track"
            title="Previous planner track"
            disabled={!plannerMusic.isReady}
          >
            <i className="fi fi-rr-angle-small-left"></i>
          </button>
          <button
            type="button"
            id="server_answer_noga_toggle"
            className="server_answer_noga_playerButton"
            onClick={() => toggleSharedPlannerMusic()}
            aria-label={
              plannerMusic.isPlaying
                ? "Pause planner music"
                : "Play planner music"
            }
            title={
              plannerMusic.isPlaying
                ? "Pause planner music"
                : "Play planner music"
            }
            disabled={!plannerMusic.isReady}
          >
            <i
              className={
                plannerMusic.isPlaying ? "fi fi-rr-pause" : "fi fi-rr-play"
              }
            ></i>
          </button>
          <button
            type="button"
            id="server_answer_noga_next"
            className="server_answer_noga_playerButton"
            onClick={() => playNextSharedPlannerMusicTrack(true)}
            aria-label="Next planner track"
            title="Next planner track"
            disabled={!plannerMusic.isReady}
          >
            <i className="fi fi-rr-angle-small-right"></i>
          </button>
          <div id="server_answer_musicMeta">
            <span id="server_answer_musicLabel">
              {plannerMusic.isReady ? "Planner music" : "Music unavailable"}
            </span>
            <span
              id="server_answer_musicTrack"
              title={`${plannerMusic.trackTitle || "Planner Music"} - ${plannerMusic.trackArtist || "Internet Archive"}`}
            >
              {plannerMusic.trackTitle || "Planner Music"}
              {plannerMusic.trackArtist ? ` / ${plannerMusic.trackArtist}` : ""}
            </span>
          </div>
          <label
            id="server_answer_musicVolume"
            title={`Volume ${plannerMusicVolume}%`}
          >
            <i
              className={
                plannerMusicVolume === 0 ? "fas fa-volume-mute" : "fas fa-volume-up"
              }
              aria-hidden="true"
            ></i>
            <input
              id="server_answer_musicVolumeInput"
              type="range"
              min="0"
              max="100"
              step="1"
              value={plannerMusicVolume}
              onChange={(event) =>
                setSharedPlannerMusicVolume(Number(event.target.value) / 100)
              }
              aria-label="Planner music volume"
              disabled={!plannerMusic.isReady}
            />
            <span id="server_answer_musicVolumeValue">
              {plannerMusicVolume}%
            </span>
          </label>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
