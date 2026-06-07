import React, { useCallback, useState } from "react";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";
import App from "./App/App";
import Login from "./Login/Login";
import { clearStoredSession, readStoredSession } from "./utils/sessionCleanup";

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
  const isAuthenticated =
    authState?.isLoggedIn === true || authState?.isConnected === true;
  const profileIsAllowed = authState?.profileCompleted !== false;
  const canAccessAuthenticatedRoutes = isAuthenticated && profileIsAllowed;
  const authenticatedHomeRoute = getHomeRouteForUser(authState);
  const canAccessTelegramControl =
    getNormalizedUsername(authState) === "rudyhamame";

  const handleLogin = useCallback((nextAuthState) => {
    setAuthState(nextAuthState);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setAuthState(null);
  }, []);

  return (
    <div id="App_viewportScale">
      <Router>
        <Switch>
          <Route exact path="/">
            {canAccessAuthenticatedRoutes ? (
              <Redirect to={authenticatedHomeRoute} />
            ) : (
              <Login onLogin={handleLogin} onForceLogout={handleLogout} />
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
    </div>
  );
};

export default AppRouter;
