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

const getHomeRouteForUser = (authState) => {
  const normalizedUsername = String(authState?.username || "").toLowerCase();
  return normalizedUsername === "naghamtrkmani"
    ? "/phenomed/home/noga"
    : "/phenomed/home";
};

const AppRouter = () => {
  const [authState, setAuthState] = useState(getStoredAuth);
  const isAuthenticated = authState?.isConnected === true;
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
            {isAuthenticated ? (
              <Redirect to={authenticatedHomeRoute} />
            ) : (
              <Login onLogin={handleLogin} onForceLogout={handleLogout} />
            )}
          </Route>
          <Route exact path="/phenomed/home">
            {isAuthenticated ? (
              <App
                key="app-home"
                path="/phenomed/home"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/home/noga">
            {isAuthenticated ? (
              <App
                key="app-home-noga"
                path="/phenomed/home/noga"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/pdf-reader">
            <Redirect to="/phenomed/pdf-reader" />
          </Route>
          <Route path="/cooporation">
            {isAuthenticated ? (
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
            {isAuthenticated ? (
              <App key="app-study" path="/study" onLogout={handleLogout} />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route path="/phenomed/nogaplan">
            {isAuthenticated ? (
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
            {isAuthenticated ? (
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
            {isAuthenticated ? (
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
            {isAuthenticated ? (
              <App key="app-ecg" path="/ecg" onLogout={handleLogout} />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomed/pdf-reader">
            {isAuthenticated ? (
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
            {isAuthenticated ? (
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
            {isAuthenticated ? (
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
