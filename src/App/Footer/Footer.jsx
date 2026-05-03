import React from "react";
import SubApps from "../../Nav/SubApps/SubApps";
import { getHomeSubApps } from "../../utils/homeSubApps";
import {
  getPlannerMusicSnapshot,
  playPreviousSharedPlannerMusicTrack,
  toggleSharedPlannerMusic,
  playNextSharedPlannerMusicTrack,
} from "../../music/globalMusicPlayer";
import "./Footer.css";

const Footer = ({ appState, onLogout, onSetSelectedAiProvider }) => {
  const [isDarkMode, setIsDarkMode] = React.useState(() =>
    typeof document !== "undefined"
      ? document.body.classList.contains("dark")
      : false,
  );
  const [isHomeNogaVideoMinimized, setIsHomeNogaVideoMinimized] =
    React.useState(false);
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isHomeNogaFooterRoute =
    currentPath === "/phenomed/home/noga" ||
    currentPath === "/phenomed/home/noga/";
  const isHomeFooterRoute =
    currentPath === "/phenomed/home" || currentPath === "/phenomed/home/";
  const isTelegramControlRoute =
    currentPath === "/phenomed/telegram-control";
  const isArabicSchoolPlannerRoute =
    currentPath === "/phenomed/schoolplanner/ar" ||
    currentPath === "/phenomed/nogaplan";
  const isNogaPlanRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.includes("/phenomed/schoolplanner/nogaplan") ||
      window.location.pathname.includes("/phenomed/nogaplan"));
  const normalizedUsername = String(appState.username || "").toLowerCase();
  const isNaghamNogaFooter =
    isNogaPlanRoute && normalizedUsername === "naghamtrkmani";
  const footerThemeClass = [
    isHomeNogaFooterRoute || isNaghamNogaFooter
      ? "server_answer--noga"
      : isHomeFooterRoute
        ? "server_answer--home"
        : "",
    isTelegramControlRoute ? "server_answer--telegram" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const plannerMusic = appState.planner_music || getPlannerMusicSnapshot();
  const footerSubApps = getHomeSubApps(appState.username);
  const selectedAiProvider = String(appState.aiProvider || "openai")
    .trim()
    .toLowerCase();
  const selectedAiStatus =
    appState.ai_connection_statuses?.[selectedAiProvider] || "offline";
  const browserStatus =
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline";
  const userStatus = appState.my_id ? "connected" : "offline";
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

  const openArabicSchoolPlanner = () => {
    if (typeof window === "undefined" || isArabicSchoolPlannerRoute) {
      return;
    }

    const arabicTargetPath = currentPath.includes(
      "/phenomed/schoolplanner/nogaplan",
    )
      ? "/phenomed/nogaplan"
      : "/phenomed/schoolplanner/ar";

    window.location.assign(arabicTargetPath);
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
      .getElementById("Home_Noga_studysessions_article")
      ?.classList.toggle("Home_Noga_themeDark", nextIsDark);
    setIsDarkMode(nextIsDark);
  };

  const footerStartActions = [
    ...(isHomeNogaFooterRoute
      ? [
          {
            id: "nogaDrawing",
            label: "Drawing",
            icon: "fas fa-pen-nib",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("home-noga-toggle-drawing"));
              }
            },
          },
        ]
      : []),
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
  ];

  return (
    <footer
      id="server_answer"
      className={`${appState.has_active_server_reply ? "server_answer--active " : ""}${footerThemeClass}`.trim()}
    >
      <SubApps
        subApps={footerSubApps}
        startActions={footerStartActions}
        placement="footer"
        authToken={appState.token}
        appHealth={{ rows: appHealthRows }}
        aiControl={aiControl}
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
        {appState.server_answer}
      </p>
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
      </div>
      <button
        type="button"
        className={`server_answer_locale_button${isArabicSchoolPlannerRoute ? " server_answer_locale_button--active" : ""}`}
        onClick={openArabicSchoolPlanner}
        aria-label="Open Arabic School Planner"
        title="Arabic School Planner"
        disabled={isArabicSchoolPlannerRoute}
      >
        Ar
      </button>
    </footer>
  );
};

export default Footer;
