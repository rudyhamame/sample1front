import React, { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";
import App from "./App/App";
import Login from "./Login/Login";
import { clearStoredSession, readStoredSession } from "./utils/sessionCleanup";

const SHELL_HEIGHT_SELECTORS = [
  "html",
  "body",
  "#root",
  "#App_viewportScale",
  "#app_page",
  "#Main_article",
];

const getStoredAuth = () => {
  return readStoredSession();
};

const getNormalizedUsername = (authState) => {
  return String(
    authState?.username ??
      authState?.userName ??
      authState?.identity?.atSignup?.username ??
      authState?.identity?.personal?.username ??
      authState?.auth?.username ??
      "",
  )
    .trim()
    .toLowerCase();
};

const getHomeRouteForUser = (authState) => {
  return "/phenomed/home";
};

const AppRouter = () => {
  const [authState, setAuthState] = useState(getStoredAuth);
  const [isShellHeightMonitorMinimized, setIsShellHeightMonitorMinimized] =
    useState(false);
  const [shellHeightMonitorPosition, setShellHeightMonitorPosition] = useState({
    x: 10,
    y: 10,
  });
  const [shellViewportMetrics, setShellViewportMetrics] = useState({
    innerHeight: 0,
    innerWidth: 0,
    visualViewportHeight: 0,
    visualViewportWidth: 0,
    visualViewportOffsetTop: 0,
    visualViewportOffsetLeft: 0,
    scrollY: 0,
    scrollX: 0,
    documentScrollHeight: 0,
    documentClientHeight: 0,
  });
  const [shellHeightEntries, setShellHeightEntries] = useState(() =>
    SHELL_HEIGHT_SELECTORS.map((selector) => ({
      selector,
      currentHeight: 0,
      accumulatedHeight: 0,
      changeCount: 0,
    })),
  );
  const isAuthenticated =
    authState?.isLoggedIn === true || authState?.isConnected === true;
  const profileIsAllowed = authState?.profileCompleted !== false;
  const canAccessAuthenticatedRoutes = isAuthenticated && profileIsAllowed;
  const authenticatedHomeRoute = getHomeRouteForUser(authState);
  const canAccessTelegramControl =
    getNormalizedUsername(authState) === "rudyhamame";
  const canAccessVisitLog = getNormalizedUsername(authState) === "rudyhamame";

  const handleLogin = useCallback((nextAuthState) => {
    setAuthState(nextAuthState);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setAuthState(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const previousHeights = new Map();
    let animationFrameId = null;

    const measureHeights = () => {
      const nextEntries = SHELL_HEIGHT_SELECTORS.map((selector) => {
        const element =
          selector === "html"
            ? document.documentElement
            : selector === "body"
              ? document.body
              : document.querySelector(selector);
        const measuredHeight = element
          ? Math.round(element.getBoundingClientRect().height)
          : 0;
        const previousHeight = previousHeights.get(selector);

        previousHeights.set(selector, measuredHeight);

        return {
          selector,
          measuredHeight,
          changed:
            previousHeight === undefined || previousHeight !== measuredHeight,
        };
      });

      setShellHeightEntries((currentEntries) =>
        nextEntries.map((entry) => {
          const previousEntry = currentEntries.find(
            (candidate) => candidate.selector === entry.selector,
          ) || {
            selector: entry.selector,
            currentHeight: 0,
            accumulatedHeight: 0,
            changeCount: 0,
          };

          return {
            selector: entry.selector,
            currentHeight: entry.measuredHeight,
            accumulatedHeight: entry.changed
              ? previousEntry.accumulatedHeight + entry.measuredHeight
              : previousEntry.accumulatedHeight,
            changeCount: entry.changed
              ? previousEntry.changeCount + 1
              : previousEntry.changeCount,
          };
        }),
      );

      const visualViewport = window.visualViewport;
      const scrollingElement =
        document.scrollingElement || document.documentElement || document.body;

      setShellViewportMetrics({
        innerHeight: Math.round(window.innerHeight || 0),
        innerWidth: Math.round(window.innerWidth || 0),
        visualViewportHeight: Math.round(visualViewport?.height || 0),
        visualViewportWidth: Math.round(visualViewport?.width || 0),
        visualViewportOffsetTop: Math.round(visualViewport?.offsetTop || 0),
        visualViewportOffsetLeft: Math.round(visualViewport?.offsetLeft || 0),
        scrollY: Math.round(window.scrollY || window.pageYOffset || 0),
        scrollX: Math.round(window.scrollX || window.pageXOffset || 0),
        documentScrollHeight: Math.round(scrollingElement?.scrollHeight || 0),
        documentClientHeight: Math.round(scrollingElement?.clientHeight || 0),
      });
    };

    const scheduleMeasureHeights = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        measureHeights();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasureHeights();
    });

    SHELL_HEIGHT_SELECTORS.forEach((selector) => {
      const element =
        selector === "html"
          ? document.documentElement
          : selector === "body"
            ? document.body
            : document.querySelector(selector);

      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener("resize", scheduleMeasureHeights);
    window.addEventListener("scroll", scheduleMeasureHeights, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleMeasureHeights);
    window.visualViewport?.addEventListener("scroll", scheduleMeasureHeights);
    scheduleMeasureHeights();

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasureHeights);
      window.removeEventListener("scroll", scheduleMeasureHeights);
      window.visualViewport?.removeEventListener("resize", scheduleMeasureHeights);
      window.visualViewport?.removeEventListener("scroll", scheduleMeasureHeights);
    };
  }, [authState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let dragPointerId = null;
    let dragStartPointerX = 0;
    let dragStartPointerY = 0;
    let dragStartPanelX = 0;
    let dragStartPanelY = 0;

    const handlePointerMove = (event) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      const nextX = Math.max(
        0,
        Math.round(dragStartPanelX + (event.clientX - dragStartPointerX)),
      );
      const nextY = Math.max(
        0,
        Math.round(dragStartPanelY + (event.clientY - dragStartPointerY)),
      );

      setShellHeightMonitorPosition({
        x: nextX,
        y: nextY,
      });
    };

    const stopDragging = (event) => {
      if (dragPointerId === null) {
        return;
      }

      if (event && event.pointerId !== undefined && event.pointerId !== dragPointerId) {
        return;
      }

      dragPointerId = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    window.__startShellHeightMonitorDrag = (event) => {
      dragPointerId = event.pointerId;
      dragStartPointerX = event.clientX;
      dragStartPointerY = event.clientY;
      dragStartPanelX = shellHeightMonitorPosition.x;
      dragStartPanelY = shellHeightMonitorPosition.y;
    };

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      delete window.__startShellHeightMonitorDrag;
    };
  }, [shellHeightMonitorPosition.x, shellHeightMonitorPosition.y]);

  return (
    <>
      <div
        id="App_shellHeightMonitor"
        style={{
          top: `${shellHeightMonitorPosition.y}px`,
          left: `${shellHeightMonitorPosition.x}px`,
          right: "auto",
        }}
      >
        <div id="App_shellHeightMonitor_header">
          <strong
            id="App_shellHeightMonitor_title"
            onPointerDown={(event) => {
              window.__startShellHeightMonitorDrag?.(event);
            }}
          >
            Shell Heights
          </strong>
          <button
            id="App_shellHeightMonitor_toggle"
            type="button"
            onClick={() =>
              setIsShellHeightMonitorMinimized((currentValue) => !currentValue)
            }
            aria-label={
              isShellHeightMonitorMinimized ? "Expand shell heights" : "Minimize shell heights"
            }
            title={
              isShellHeightMonitorMinimized ? "Expand shell heights" : "Minimize shell heights"
            }
          >
            {isShellHeightMonitorMinimized ? "+" : "-"}
          </button>
        </div>
        {!isShellHeightMonitorMinimized ? (
          <>
            <div id="App_shellHeightMonitor_metrics">
              <span className="App_shellHeightMonitor_metric">
                inner: {shellViewportMetrics.innerWidth} x {shellViewportMetrics.innerHeight}
              </span>
              <span className="App_shellHeightMonitor_metric">
                vv: {shellViewportMetrics.visualViewportWidth} x {shellViewportMetrics.visualViewportHeight}
              </span>
              <span className="App_shellHeightMonitor_metric">
                vvOff: {shellViewportMetrics.visualViewportOffsetLeft}, {shellViewportMetrics.visualViewportOffsetTop}
              </span>
              <span className="App_shellHeightMonitor_metric">
                scroll: {shellViewportMetrics.scrollX}, {shellViewportMetrics.scrollY}
              </span>
              <span className="App_shellHeightMonitor_metric">
                doc: {shellViewportMetrics.documentClientHeight} / {shellViewportMetrics.documentScrollHeight}
              </span>
            </div>
            <ul id="App_shellHeightMonitor_list">
              {shellHeightEntries.map((entry) => (
                <li key={entry.selector} className="App_shellHeightMonitor_item">
                  <span className="App_shellHeightMonitor_selector">{entry.selector}</span>
                  <span className="App_shellHeightMonitor_value">
                    h:{entry.currentHeight}px
                  </span>
                  <span className="App_shellHeightMonitor_value">
                    sum:{entry.accumulatedHeight}px
                  </span>
                  <span className="App_shellHeightMonitor_value">
                    n:{entry.changeCount}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <Router>
        <Switch>
          <Route exact path="/">
            {canAccessAuthenticatedRoutes ? (
              <Redirect to={authenticatedHomeRoute} />
            ) : (
              <div id="App_viewportScale">
                <Login onLogin={handleLogin} onForceLogout={handleLogout} />
              </div>
            )}
          </Route>
          <Route exact path="/phenomed/home">
            {canAccessAuthenticatedRoutes ? (
              <App key="app-home" path="/phenomed/home" onLogout={handleLogout} />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/home/noga">
            {canAccessAuthenticatedRoutes ? (
              <Redirect to="/phenomed/home" />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/pdf-reader">
            <Redirect to="/phenomed/pdf-reader" />
          </Route>
          <Route path="/cooporation">
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-cooporation"
                path="/cooporation"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route path="/phenomed/nogaplan">
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-nogaplan"
                path="/phenomed/nogaplan"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/schoolplanner/ar">
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-studyplanner-ar"
                path="/phenomed/schoolplanner/ar"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route path="/phenomed/schoolplanner">
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-studyplanner"
                path="/phenomed/schoolplanner"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route path="/ecg">
            {canAccessAuthenticatedRoutes ? (
              <App key="app-ecg" path="/ecg" onLogout={handleLogout} />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/pdf-reader">
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-pdf-reader"
                path="/phenomed/pdf-reader"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/telegram-control">
            {canAccessAuthenticatedRoutes && canAccessTelegramControl ? (
              <App
                key="app-telegram-control"
                path="/phenomed/telegram-control"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to={canAccessAuthenticatedRoutes ? authenticatedHomeRoute : "/"} />
            )}
          </Route>
          <Route exact path="/phenomed/visit-log">
            {canAccessAuthenticatedRoutes && canAccessVisitLog ? (
              <App
                key="app-visit-log"
                path="/phenomed/visit-log"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to={canAccessAuthenticatedRoutes ? authenticatedHomeRoute : "/"} />
            )}
          </Route>
          <Route exact path={["/profile/:username", "/phenomed/:username"]}>
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-profile"
                path="/phenomed/:username"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Redirect to={isAuthenticated ? authenticatedHomeRoute : "/"} />
        </Switch>
      </Router>
    </>
  );
};

export default AppRouter;
