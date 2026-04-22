import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { apiUrl } from "../../config/api";
import "./subapps.css";

const START_WINDOWS = {
  appHealth: {
    title: "App health",
    icon: "fas fa-heartbeat",
    width: 320,
    height: 420,
  },
};

const START_MENU_LAYOUT_STORAGE_KEY = "SubApps.startMenuLayout";
const START_MENU_LISTS = ["main", "settings"];

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

const normalizeStartMenuLayout = (layout, appItemIds) => {
  const fallbackLayout = {
    main: appItemIds,
    settings: ["appHealth"],
  };
  const nextLayout = START_MENU_LISTS.reduce((lists, listId) => {
    const listItems = Array.isArray(layout?.[listId]) ? layout[listId] : [];
    return {
      ...lists,
      [listId]: listItems,
    };
  }, {});

  const availableIds = new Set([...appItemIds, "appHealth"]);
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
  const [startMenuLayout, setStartMenuLayout] = useState(() =>
    normalizeStartMenuLayout(readStoredStartMenuLayout(), []),
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

    const panel = event.currentTarget.closest(".SubApps_healthPanel");
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
  const startMenuItems = apps.reduce(
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
      },
    ),
  );
  const healthRows = Array.isArray(props.appHealth?.rows)
    ? props.appHealth.rows
    : [];
  const healthWindow = startWindows.appHealth || {};
  const minimizedStartWindows = Object.entries(startWindows).filter(
    ([windowId, windowState]) =>
      START_WINDOWS[windowId] && windowState?.isMinimized,
  );

  const placementClass =
    props.placement === "footer" ? " SubApps_article--footer" : "";
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
      normalizeStartMenuLayout(currentLayout, [
        ...appItemIds,
        ...actionItemIds,
      ]),
    );
  }, [appLayoutKey, actionLayoutKey]);

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
        ]);
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
  }, [authToken, appLayoutKey, actionLayoutKey, isStartMenuReady]);

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

      const normalizedLayout = normalizeStartMenuLayout(nextLayout, [
        ...appItemIds,
        ...actionItemIds,
      ]);
      saveStartMenuLayoutToBackend(normalizedLayout);
      return normalizedLayout;
    });
    setDraggedStartItem(null);
  }

  function renderStartMenuItem(itemId, listId) {
    const item = startMenuItems[itemId];
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

  return (
    <section
      id="SubApps_article"
      ref={articleRef}
      className={`SubApps_article${placementClass}`}
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
              <i className="fas fa-chevron-up SubApps_rowCaret"></i>
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
      <section
        className={`SubApps_healthPanel fc${healthWindow.isOpen ? " is-open" : ""}`}
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
    </section>
  );
};

export default SubApps;
