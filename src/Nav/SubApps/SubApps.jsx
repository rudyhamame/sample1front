import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHistory } from "react-router-dom";
import { apiUrl } from "../../config/api";
import "./subapps.css";

const START_WINDOWS = {
  graphics: {
    title: "Graphics",
    icon: "fas fa-vector-square",
    width: 320,
    height: 240,
  },
  appHealth: {
    title: "App health",
    icon: "fas fa-heartbeat",
    width: 320,
    height: 420,
  },
  aiControl: {
    title: "AI",
    icon: "fas fa-robot",
    width: 320,
    height: 420,
  },
};

const START_MENU_LAYOUT_STORAGE_KEY = "SubApps.startMenuLayout";
const START_MENU_LISTS = ["main", "settings"];
const GRAPHICS_TARGET_OPTIONS = [
  {
    value: "app_page",
    label: "App shell",
  },
  {
    value: "Home_Noga_article",
    label: "Home_noga",
  },
  {
    value: "nogaPlanner_article",
    label: "NogaPlanner",
  },
  {
    value: "telegramControlPage",
    label: "Telegram",
  },
  {
    value: "Home_studysessions_article",
    label: "Home",
  },
];

const readStoredStartMenuLayout = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(START_MENU_LAYOUT_STORAGE_KEY),
    );
  } catch (error) {
    return null;
  }
};

const normalizeStartMenuLayout = (
  layout,
  appItemIds,
  defaultMainWindowItemIds = [],
  defaultSettingsItemIds = [],
) => {
  const safeDefaultMainWindowItems = Array.isArray(defaultMainWindowItemIds)
    ? defaultMainWindowItemIds.filter((itemId) => typeof itemId === "string")
    : [];
  const safeDefaultSettingsItems = Array.isArray(defaultSettingsItemIds)
    ? defaultSettingsItemIds.filter((itemId) => typeof itemId === "string")
    : [];
  const fallbackLayout = {
    main: [...appItemIds, ...safeDefaultMainWindowItems],
    settings: ["appHealth", "aiControl", ...safeDefaultSettingsItems],
  };
  const nextLayout = START_MENU_LISTS.reduce((lists, listId) => {
    const listItems = Array.isArray(layout?.[listId]) ? layout[listId] : [];
    return {
      ...lists,
      [listId]: listItems,
    };
  }, {});

  const availableIds = new Set([
    ...appItemIds,
    ...safeDefaultMainWindowItems,
    "appHealth",
    "aiControl",
  ]);
  const usedIds = new Set();

  START_MENU_LISTS.forEach((listId) => {
    nextLayout[listId] = nextLayout[listId].filter((itemId) => {
      if (!availableIds.has(itemId) || usedIds.has(itemId)) {
        return false;
      }
      usedIds.add(itemId);
      return true;
    });
  });

  Object.entries(fallbackLayout).forEach(([listId, itemIds]) => {
    itemIds.forEach((itemId) => {
      if (!usedIds.has(itemId)) {
        nextLayout[listId].push(itemId);
        usedIds.add(itemId);
      }
    });
  });

  return nextLayout;
};

const getDefaultStartWindowPosition = (windowId) => {
  const windowMeta = START_WINDOWS[windowId] || START_WINDOWS.appHealth;
  if (typeof window === "undefined") {
    return { x: 120, y: 120 };
  }

  return {
    x: Math.max(16, (window.innerWidth - windowMeta.width) / 2),
    y: Math.max(16, (window.innerHeight - windowMeta.height) / 2),
  };
};

const clampStartWindowPosition = (position, windowId) => {
  const windowMeta = START_WINDOWS[windowId] || START_WINDOWS.appHealth;
  if (typeof window === "undefined") {
    return position;
  }

  return {
    x: Math.min(
      Math.max(8, position.x),
      Math.max(8, window.innerWidth - windowMeta.width - 8),
    ),
    y: Math.min(Math.max(8, position.y), Math.max(8, window.innerHeight - 96)),
  };
};

const SubApps = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [startWindows, setStartWindows] = useState({});
  const [graphicsDraftTarget, setGraphicsDraftTarget] = useState(() =>
    String(props.graphicsControl?.defaultTarget || GRAPHICS_TARGET_OPTIONS[0].value),
  );
  const [graphicsDraftScale, setGraphicsDraftScale] = useState(() => {
    const defaultTarget = String(
      props.graphicsControl?.defaultTarget || GRAPHICS_TARGET_OPTIONS[0].value,
    );
    const rawScale =
      props.graphicsControl?.scaleSettingsByElement?.[defaultTarget];
    return Number(rawScale) || 1;
  });
  const [startMenuLayout, setStartMenuLayout] = useState(() =>
    normalizeStartMenuLayout(
      readStoredStartMenuLayout(),
      [],
      ["graphics"],
      Array.isArray(props.startSettingsItemIds)
        ? props.startSettingsItemIds
        : [],
    ),
  );
  const [draggedStartItem, setDraggedStartItem] = useState(null);
  const articleRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const windowDragRef = useRef(null);
  const hasLoadedStartMenuLayoutRef = useRef(false);
  const lastSavedStartMenuLayoutRef = useRef("");
  const history = useHistory();

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (articleRef.current && !articleRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, []);

  function toggleOpen(event) {
    event.stopPropagation();
    setIsOpen((prev) => {
      const nextIsOpen = !prev;
      if (!nextIsOpen) {
        setIsSettingsOpen(false);
      }
      return nextIsOpen;
    });
  }

  function handleNav(event, path) {
    event.preventDefault();
    setIsOpen(false);
    setIsSettingsOpen(false);
    history.push(path);
  }

  function toggleSettings(event) {
    event.stopPropagation();
    setIsSettingsOpen((prev) => !prev);
  }

  function openStartWindow(event, windowId) {
    event.stopPropagation();
    setStartWindows((currentWindows) => {
      const currentWindow = currentWindows[windowId] || {};
      return {
        ...currentWindows,
        [windowId]: {
          ...currentWindow,
          isOpen: true,
          isMinimized: false,
          position:
            currentWindow.position || getDefaultStartWindowPosition(windowId),
        },
      };
    });
  }

  function minimizeStartWindow(event, windowId) {
    event.stopPropagation();
    setStartWindows((currentWindows) => ({
      ...currentWindows,
      [windowId]: {
        ...(currentWindows[windowId] || {}),
        isOpen: false,
        isMinimized: true,
      },
    }));
  }

  function closeStartWindow(event, windowId) {
    event.stopPropagation();
    setStartWindows((currentWindows) => ({
      ...currentWindows,
      [windowId]: {
        ...(currentWindows[windowId] || {}),
        isOpen: false,
        isMinimized: false,
      },
    }));
  }

  function startWindowDrag(event, windowId) {
    if (event.button !== 0 || event.target.closest("button")) {
      return;
    }

    const panel = event.currentTarget.closest(".SubApps_startPanel");
    if (!panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    windowDragRef.current = {
      windowId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };

    event.preventDefault();
    window.addEventListener("pointermove", handleStartWindowDrag);
    window.addEventListener("pointerup", stopStartWindowDrag);
  }

  function handleStartWindowDrag(event) {
    const dragState = windowDragRef.current;
    if (!dragState) {
      return;
    }

    const nextPosition = clampStartWindowPosition(
      {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      },
      dragState.windowId,
    );

    setStartWindows((currentWindows) => ({
      ...currentWindows,
      [dragState.windowId]: {
        ...(currentWindows[dragState.windowId] || {}),
        position: nextPosition,
      },
    }));
  }

  function stopStartWindowDrag() {
    windowDragRef.current = null;
    window.removeEventListener("pointermove", handleStartWindowDrag);
    window.removeEventListener("pointerup", stopStartWindowDrag);
  }

  const apps = props.subApps || [];
  const appItemIds = apps.map((app) => `app:${app.id}`);
  const actions = Array.isArray(props.startActions) ? props.startActions : [];
  const actionItemIds = actions.map((action) => `action:${action.id}`);
  const startSettingsItemIds = Array.isArray(props.startSettingsItemIds)
    ? props.startSettingsItemIds
    : [];
  const startSettingsLayoutKey = startSettingsItemIds.join("|");
  const startMenuItems = {
    graphics: {
      type: "window",
      icon: START_WINDOWS.graphics.icon,
      label: START_WINDOWS.graphics.title,
      windowId: "graphics",
    },
  };
  const appAndActionMenuItems = apps.reduce(
    (items, app) => ({
      ...items,
      [`app:${app.id}`]: {
        type: "nav",
        icon: app.icon,
        label: app.label,
        path: app.path,
      },
    }),
    actions.reduce(
      (items, action) => ({
        ...items,
        [`action:${action.id}`]: {
          type: "action",
          icon: action.icon,
          label: action.label,
          onClick: action.onClick,
        },
      }),
      {
        appHealth: {
          type: "window",
          icon: START_WINDOWS.appHealth.icon,
          label: START_WINDOWS.appHealth.title,
          windowId: "appHealth",
        },
        aiControl: {
          type: "window",
          icon: START_WINDOWS.aiControl.icon,
          label: START_WINDOWS.aiControl.title,
          windowId: "aiControl",
        },
      },
    ),
  );
  const mergedStartMenuItems = {
    ...startMenuItems,
    ...appAndActionMenuItems,
  };
  const healthRows = Array.isArray(props.appHealth?.rows)
    ? props.appHealth.rows
    : [];
  const healthWindow = startWindows.appHealth || {};
  const aiWindow = startWindows.aiControl || {};
  const graphicsWindow = startWindows.graphics || {};
  const graphicsScale = Number(graphicsDraftScale) || 1;
  const graphicsScaleEntries = Array.isArray(props.graphicsControl?.scaleEntries)
    ? props.graphicsControl.scaleEntries.filter((entry) => {
        const element = String(entry?.element || "").trim();
        return Boolean(element);
      })
    : [];
  const aiStatuses =
    props.aiControl && typeof props.aiControl === "object"
      ? props.aiControl.statuses || {}
      : {};
  const selectedAiProvider = String(
    props.aiControl?.selectedProvider || "openai",
  )
    .trim()
    .toLowerCase();
  const supportedAiProviders = ["openai", "groq", "gemini", "kimi"];
  const aiProviders = supportedAiProviders.filter(
    (provider) =>
      Object.prototype.hasOwnProperty.call(aiStatuses, provider) ||
      provider === selectedAiProvider,
  );
  const minimizedStartWindows = Object.entries(startWindows).filter(
    ([windowId, windowState]) =>
      START_WINDOWS[windowId] && windowState?.isMinimized,
  );
  const hasOpenStartWindow = Object.entries(startWindows).some(
    ([windowId, windowState]) => START_WINDOWS[windowId] && windowState?.isOpen,
  );

  const placementClass =
    props.placement === "footer" ? " SubApps_article--footer" : "";
  const openWindowClass = hasOpenStartWindow
    ? " SubApps_article--has-open-window"
    : "";
  const authToken = String(props.authToken || props.token || "").trim();
  const appLayoutKey = appItemIds.join("|");
  const actionLayoutKey = actionItemIds.join("|");
  const isStartMenuReady = appItemIds.length > 0;

  function saveStartMenuLayoutToBackend(nextLayout) {
    if (!authToken || !isStartMenuReady) {
      return Promise.resolve(false);
    }

    const serializedLayout = JSON.stringify(nextLayout);
    return fetch(apiUrl("/api/user/ui/start-menu-layout"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ startMenuLayout: nextLayout }),
    })
      .then((response) => {
        if (response.ok) {
          lastSavedStartMenuLayoutRef.current = serializedLayout;
          return true;
        }
        return false;
      })
      .catch(() => false);
  }

  useEffect(() => {
    setStartMenuLayout((currentLayout) =>
      normalizeStartMenuLayout(
        currentLayout,
        [...appItemIds, ...actionItemIds],
        ["graphics"],
        startSettingsItemIds,
      ),
    );
  }, [actionLayoutKey, appLayoutKey, startSettingsLayoutKey]);

  useEffect(() => {
    const nextTarget = String(
      props.graphicsControl?.defaultTarget ||
        GRAPHICS_TARGET_OPTIONS[0].value,
    );
    setGraphicsDraftTarget(nextTarget);
    const nextScale =
      Number(props.graphicsControl?.scaleSettingsByElement?.[nextTarget]) || 1;
    setGraphicsDraftScale(nextScale);
  }, [
    props.graphicsControl?.defaultTarget,
    props.graphicsControl?.scaleSettingsKey,
  ]);

  useEffect(() => {
    const nextScale =
      Number(
        props.graphicsControl?.scaleSettingsByElement?.[graphicsDraftTarget],
      ) || 1;
    setGraphicsDraftScale(nextScale);
  }, [graphicsDraftTarget, props.graphicsControl?.scaleSettingsKey]);

  useEffect(() => {
    let shouldIgnore = false;
    hasLoadedStartMenuLayoutRef.current = false;

    if (!authToken || !isStartMenuReady) {
      hasLoadedStartMenuLayoutRef.current = true;
      return undefined;
    }

    fetch(apiUrl("/api/user/ui/start-menu-layout"), {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (shouldIgnore || !data?.startMenuLayout) {
          return;
        }

        const serverLayout = normalizeStartMenuLayout(data.startMenuLayout, [
          ...appItemIds,
          ...actionItemIds,
        ], ["graphics"], startSettingsItemIds);
        lastSavedStartMenuLayoutRef.current = JSON.stringify(serverLayout);
        setStartMenuLayout(serverLayout);
      })
      .catch(() => {})
      .finally(() => {
        if (!shouldIgnore) {
          hasLoadedStartMenuLayoutRef.current = true;
        }
      });

    return () => {
      shouldIgnore = true;
    };
  }, [actionLayoutKey, appLayoutKey, authToken, isStartMenuReady, startSettingsLayoutKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      START_MENU_LAYOUT_STORAGE_KEY,
      JSON.stringify(startMenuLayout),
    );
  }, [startMenuLayout]);

  useEffect(() => {
    if (
      !authToken ||
      !isStartMenuReady ||
      !hasLoadedStartMenuLayoutRef.current
    ) {
      return undefined;
    }

    const serializedLayout = JSON.stringify(startMenuLayout);
    if (serializedLayout === lastSavedStartMenuLayoutRef.current) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      fetch(apiUrl("/api/user/ui/start-menu-layout"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ startMenuLayout }),
      })
        .then((response) => {
          if (response.ok) {
            lastSavedStartMenuLayoutRef.current = serializedLayout;
          }
        })
        .catch(() => {});
    }, 350);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [authToken, isStartMenuReady, startMenuLayout]);

  function startMenuItemDrag(event, itemId, sourceListId) {
    event.stopPropagation();
    setDraggedStartItem({ itemId, sourceListId });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ itemId, sourceListId }),
    );
  }

  function allowStartMenuDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  }

  function allowSettingsButtonDrop(event) {
    allowStartMenuDrop(event);
    if (!isSettingsOpen) {
      setIsSettingsOpen(true);
    }
  }

  function dropStartMenuItem(event, targetListId) {
    event.preventDefault();
    event.stopPropagation();

    let droppedItem = draggedStartItem;
    try {
      const transferData = event.dataTransfer.getData("application/json");
      if (transferData) {
        droppedItem = JSON.parse(transferData);
      }
    } catch (error) {
      droppedItem = draggedStartItem;
    }

    if (!droppedItem?.itemId || !START_MENU_LISTS.includes(targetListId)) {
      return;
    }

    setStartMenuLayout((currentLayout) => {
      const nextLayout = START_MENU_LISTS.reduce((lists, listId) => {
        lists[listId] = (currentLayout[listId] || []).filter(
          (itemId) => itemId !== droppedItem.itemId,
        );
        return lists;
      }, {});

      nextLayout[targetListId] = [
        ...nextLayout[targetListId],
        droppedItem.itemId,
      ];

      const normalizedLayout = normalizeStartMenuLayout(
        nextLayout,
        [...appItemIds, ...actionItemIds],
        ["graphics"],
      );
      saveStartMenuLayoutToBackend(normalizedLayout);
      return normalizedLayout;
    });
    setDraggedStartItem(null);
  }

  function renderStartMenuItem(itemId, listId) {
    const item = mergedStartMenuItems[itemId];
    if (!item) {
      return null;
    }

    const itemClassName = `SubApps_menuItem${
      draggedStartItem?.itemId === itemId ? " is-dragging" : ""
    }`;
    const dragProps = {
      draggable: true,
      onDragStart: (event) => startMenuItemDrag(event, itemId, listId),
      onDragEnd: () => setDraggedStartItem(null),
    };

    if (item.type === "nav") {
      return (
        <li key={itemId} className={itemClassName} {...dragProps}>
          <a
            href={item.path}
            className="SubApps_row fr"
            draggable={false}
            onClick={(event) => handleNav(event, item.path)}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </a>
        </li>
      );
    }

    if (item.type === "action") {
      return (
        <li key={itemId} className={itemClassName} {...dragProps}>
          <button
            type="button"
            className="SubApps_row SubApps_row--button fr"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
              setIsSettingsOpen(false);
              item.onClick?.(event);
            }}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </button>
        </li>
      );
    }

    return (
      <li key={itemId} className={itemClassName} {...dragProps}>
        <button
          type="button"
          className="SubApps_row SubApps_row--button fr"
          onClick={(event) => openStartWindow(event, item.windowId)}
          aria-expanded={Boolean(startWindows[item.windowId]?.isOpen)}
        >
          <i className={item.icon}></i>
          <span>{item.label}</span>
        </button>
      </li>
    );
  }

  const mainStartItems = startMenuLayout.main || [];
  const settingsStartItems = startMenuLayout.settings || [];
  const renderWindowPanels = (panels) =>
    typeof document !== "undefined" ? createPortal(panels, document.body) : panels;

  return (
    <section
      id="SubApps_article"
      ref={articleRef}
      className={`SubApps_article${placementClass}${openWindowClass}`}
    >
      <div id="SubApps_icon_container">
        <i
          className={isOpen ? "fas fa-th SubApps_icon--open" : "fas fa-th"}
          onClick={toggleOpen}
          title="Sub-apps"
        ></i>
      </div>

      <section id="SubApps_content_container">
        <ul
          id="SubApps_dropMenu_container"
          className={`fc${isOpen ? " is-open" : ""}`}
          onDragOver={allowStartMenuDrop}
          onDrop={(event) => dropStartMenuItem(event, "main")}
        >
          {mainStartItems.length === 0 ? (
            <li id="SubApps_empty_state">No apps available</li>
          ) : (
            mainStartItems.map((itemId) => renderStartMenuItem(itemId, "main"))
          )}
          <li className="SubApps_menuItem SubApps_settingsItem">
            <button
              ref={settingsButtonRef}
              type="button"
              className="SubApps_row SubApps_row--button fr"
              onClick={toggleSettings}
              onDragOver={allowSettingsButtonDrop}
              onDrop={(event) => dropStartMenuItem(event, "settings")}
              aria-expanded={isSettingsOpen}
            >
              <i className="fas fa-cog"></i>
              <span>Settings</span>
              <i className="fas fa-chevron-right SubApps_rowCaret"></i>
            </button>
            {isSettingsOpen ? (
              <div
                className="SubApps_settingsInlineList fc"
                onDragOver={allowStartMenuDrop}
                onDrop={(event) => dropStartMenuItem(event, "settings")}
              >
                {settingsStartItems.length === 0 ? (
                  <div id="SubApps_settingsEmptyState">Drop buttons here</div>
                ) : (
                  settingsStartItems.map((itemId) =>
                    renderStartMenuItem(itemId, "settings"),
                  )
                )}
              </div>
            ) : null}
          </li>
        </ul>
      </section>
      {minimizedStartWindows.length ? (
        <div className="SubApps_minimizedWindows fr">
          {minimizedStartWindows.map(([windowId]) => (
            <button
              key={windowId}
              type="button"
              className="SubApps_minimizedWindowButton"
              onClick={(event) => openStartWindow(event, windowId)}
              title={`Restore ${START_WINDOWS[windowId].title}`}
            >
              <i className={START_WINDOWS[windowId].icon}></i>
              <span>{START_WINDOWS[windowId].title}</span>
            </button>
          ))}
        </div>
      ) : null}
      {renderWindowPanels(
        <>
          <section
            className={`SubApps_startPanel SubApps_healthPanel fc${healthWindow.isOpen ? " is-open" : ""}`}
            aria-label="App health information"
            style={
              healthWindow.position
                ? {
                    left: `${healthWindow.position.x}px`,
                    top: `${healthWindow.position.y}px`,
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="SubApps_healthMiniBar fr"
              onPointerDown={(event) => startWindowDrag(event, "appHealth")}
            >
              <h4>App health</h4>
              <div className="SubApps_healthWindowActions fr">
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => minimizeStartWindow(event, "appHealth")}
                  aria-label="Minimize app health"
                  title="Minimize"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => closeStartWindow(event, "appHealth")}
                  aria-label="Close app health"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            {healthRows.length ? (
              <ul className="SubApps_healthList fc">
                {healthRows.map((row) => (
                  <li key={row.id} className="SubApps_healthRow fr">
                    <span className="SubApps_healthLabel">{row.label}</span>
                    <span
                      className={`SubApps_healthStatus SubApps_healthStatus--${row.status}`}
                    >
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="SubApps_healthEmpty">
                Health information is not available yet.
              </p>
            )}
          </section>
          <section
            className={`SubApps_startPanel SubApps_healthPanel SubApps_graphicsPanel fc${graphicsWindow.isOpen ? " is-open" : ""}`}
            aria-label="Graphics control"
            style={
              graphicsWindow.position
                ? {
                    left: `${graphicsWindow.position.x}px`,
                    top: `${graphicsWindow.position.y}px`,
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="SubApps_healthMiniBar fr"
              onPointerDown={(event) => startWindowDrag(event, "graphics")}
            >
              <h4>Graphics</h4>
              <div className="SubApps_healthWindowActions fr">
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => minimizeStartWindow(event, "graphics")}
                  aria-label="Minimize graphics"
                  title="Minimize"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => closeStartWindow(event, "graphics")}
                  aria-label="Close graphics"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="SubApps_graphicsBody fc">
              <p className="SubApps_graphicsDescription">
                Choose a target, then stage and apply its scale.
              </p>
              <label className="SubApps_graphicsTargetField fc">
                <span className="SubApps_graphicsTargetLabel">Target</span>
                <select
                  className="SubApps_graphicsTargetSelect"
                  value={graphicsDraftTarget}
                  onChange={(event) => {
                    const nextTarget = String(event.target.value || "").trim();
                    setGraphicsDraftTarget(nextTarget);
                  }}
                >
                  {GRAPHICS_TARGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="SubApps_graphicsScaleControls fr">
                <button
                  type="button"
                  className="SubApps_graphicsScaleButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGraphicsDraftScale((currentScale) =>
                      Number(currentScale) - 0.05,
                    );
                  }}
                  aria-label="Decrease app scale"
                  title="Scale down"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <span className="SubApps_graphicsScaleValue">
                  {Math.round(graphicsScale * 100)}%
                </span>
                <button
                  type="button"
                  className="SubApps_graphicsScaleButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGraphicsDraftScale((currentScale) =>
                      Number(currentScale) + 0.05,
                    );
                  }}
                  aria-label="Increase app scale"
                  title="Scale up"
                >
                  <i className="fas fa-plus"></i>
                </button>
                <button
                  type="button"
                  className="SubApps_graphicsApplyButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.graphicsControl?.onApply?.(
                      graphicsDraftTarget,
                      graphicsScale,
                    );
                  }}
                  aria-label="Apply app scale"
                  title="Apply"
                  disabled={
                    Math.abs(
                      graphicsScale -
                        (Number(
                          props.graphicsControl?.scaleSettingsByElement?.[
                            graphicsDraftTarget
                          ],
                        ) || 1),
                    ) < 0.001
                  }
                >
                  Apply
                </button>
              </div>
              <div className="SubApps_graphicsScaleListWrap fc">
                <span className="SubApps_graphicsScaleListTitle">
                  Saved scale entries
                </span>
                {graphicsScaleEntries.length ? (
                  <ul className="SubApps_graphicsScaleList fc">
                    {graphicsScaleEntries.map((entry) => {
                      const element = String(entry?.element || "").trim();
                      const scaleValue = Number(entry?.scaleNum) || 1;

                      return (
                        <li
                          key={`${element}:${scaleValue}`}
                          className="SubApps_graphicsScaleListItem fr"
                        >
                          <span className="SubApps_graphicsScaleListElement">
                            {element}
                          </span>
                          <span className="SubApps_graphicsScaleListValue">
                            {Math.round(scaleValue * 100)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="SubApps_graphicsScaleEmpty">
                    No saved scale entries yet.
                  </p>
                )}
              </div>
            </div>
          </section>
          <section
            className={`SubApps_startPanel SubApps_healthPanel SubApps_aiPanel fc${aiWindow.isOpen ? " is-open" : ""}`}
            aria-label="AI provider control"
            style={
              aiWindow.position
                ? {
                    left: `${aiWindow.position.x}px`,
                    top: `${aiWindow.position.y}px`,
                  }
                : undefined
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="SubApps_healthMiniBar fr"
              onPointerDown={(event) => startWindowDrag(event, "aiControl")}
            >
              <h4>AI</h4>
              <div className="SubApps_healthWindowActions fr">
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => minimizeStartWindow(event, "aiControl")}
                  aria-label="Minimize AI control"
                  title="Minimize"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <button
                  type="button"
                  className="SubApps_healthWindowButton"
                  onClick={(event) => closeStartWindow(event, "aiControl")}
                  aria-label="Close AI control"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <ul className="SubApps_healthList fc">
              {aiProviders.map((provider) => {
                const normalizedProvider = String(provider || "")
                  .trim()
                  .toLowerCase();
                const status = String(
                  aiStatuses?.[normalizedProvider] || "offline",
                )
                  .trim()
                  .toLowerCase();
                const isSelected = normalizedProvider === selectedAiProvider;

                return (
                  <li key={normalizedProvider} className="SubApps_healthRow fr">
                    <button
                      type="button"
                      className={`SubApps_aiProviderButton fr${isSelected ? " is-selected" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.aiControl?.onSelectProvider?.(normalizedProvider);
                      }}
                    >
                      <span className="SubApps_healthLabel">
                        {normalizedProvider.charAt(0).toUpperCase() +
                          normalizedProvider.slice(1)}
                      </span>
                      <span
                        className={`SubApps_healthStatus SubApps_healthStatus--${status}`}
                      >
                        {isSelected
                          ? `${status.toUpperCase()} / SELECTED`
                          : status.toUpperCase()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>,
      )}
    </section>
  );
};

export default SubApps;
