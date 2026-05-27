export const getHomeSubApps = (username = "") => {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const nogaPlanPermittedUsers = new Set(["naghamtrkmani", "rudyhamame"]);
  const isNogaPlanOwner = nogaPlanPermittedUsers.has(normalizedUsername);

  return [
    {
      id: "study",
      label: "Phenomed Student",
      icon: "fas fa-stopwatch",
      path: "/study",
    },
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
    {
      id: "telegram-control",
      label: "Telegram Control",
      icon: "fab fa-telegram-plane",
      path: "/phenomed/telegram-control",
    },
    {
      id: "jamendo-player",
      label: "Jamendo Player",
      icon: "fas fa-music",
      path: "/phenomed/jamendo-player",
    },
    {
      id: "school",
      label: isNogaPlanOwner ? "Noga Plan" : "School Planner",
      icon: "fas fa-layer-group",
      path: isNogaPlanOwner
        ? "/phenomed/schoolplanner/nogaplan"
        : "/phenomed/schoolplanner",
    },
    {
      id: "social",
      label: "Home",
      icon: "fas fa-house-user",
      path: "/",
    },
  ];
};
