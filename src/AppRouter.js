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

const isNogaUser = (authState) =>
  getNormalizedUsername(authState) === "naghamtrkmani";

const getHomeRouteForUser = (authState) => {
  return isNogaUser(authState) ? "/phenomed/home/noga" : "/phenomed/home";
};

const AppRouter = () => {
  const [authState, setAuthState] = useState(getStoredAuth);
  const isAuthenticated = authState?.isConnected === true;
  const profileIsAllowed = authState?.profileCompleted !== false;
  const canAccessAuthenticatedRoutes = isAuthenticated && profileIsAllowed;
  const isAuthenticatedNogaUser =
    canAccessAuthenticatedRoutes && isNogaUser(authState);
  const authenticatedHomeRoute = getHomeRouteForUser(authState);

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
              isAuthenticatedNogaUser ? (
                <Redirect to="/phenomed/home/noga" />
              ) : (
                <App
                  key="app-home"
                  path="/phenomed/home"
                  onLogout={handleLogout}
                />
              )
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/home/noga">
            {canAccessAuthenticatedRoutes ? (
              isAuthenticatedNogaUser ? (
                <App
                  key="app-home-noga"
                  path="/phenomed/home/noga"
                  onLogout={handleLogout}
                />
              ) : (
                <Redirect to="/phenomed/home" />
              )
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
          <Route path="/study">
            {canAccessAuthenticatedRoutes ? (
              <App key="app-study" path="/study" onLogout={handleLogout} />
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
            {canAccessAuthenticatedRoutes ? (
              <App
                key="app-telegram-control"
                path="/phenomed/telegram-control"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route path="/profile/:username">
            {canAccessAuthenticatedRoutes ? (
              <App key="app-profile" path="/profile" onLogout={handleLogout} />
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
