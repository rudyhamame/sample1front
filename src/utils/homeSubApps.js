export const getHomeSubApps = (username = "") => {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  return [
    {
      id: "ecg",
      label: "PhenoMed ECG",
      icon: "fas fa-heartbeat",
      path: "/ecg",
    },
    {
      id: "pdf-reader",
      label: "PDF Reader",
      icon: "fas fa-file-pdf",
      path: "/phenomed/pdf-reader",
    },
    ...(normalizedUsername === "rudyhamame"
      ? [
          {
            id: "telegram-control",
            label: "Telegram Control",
            icon: "fab fa-telegram-plane",
            path: "/phenomed/telegram-control",
          },
          {
            id: "visit-log",
            label: "Visit-Log",
            icon: "fas fa-shoe-prints",
            path: "/phenomed/visit-log",
          },
        ]
      : []),
    {
      id: "jamendo-player",
      label: "Jamendo Player",
      icon: "fas fa-music",
      path: "/phenomed/jamendo-player",
    },
    {
      id: "school",
      label: "Study Planner",
      icon: "fas fa-layer-group",
      path: "/phenomed/nogaplan",
    },
    {
      id: "social",
      label: "Home",
      icon: "fas fa-house-user",
      path: "/",
    },
  ];
};
