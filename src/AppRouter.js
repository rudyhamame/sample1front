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

const AppRouter = () => {
  const [authState, setAuthState] = useState(getStoredAuth);
  const isAuthenticated = authState?.isConnected === true;

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
              <App key="app-home" path="/" onLogout={handleLogout} />
            ) : (
              <Login onLogin={handleLogin} onForceLogout={handleLogout} />
            )}
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
          <Route path="/phenomed/schoolplanner/nogaplan">
            {isAuthenticated ? (
              <App
                key="app-nogaplan"
                path="/phenomed/schoolplanner/nogaplan"
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
          <Route exact path="/phenomedsocial/ar">
            {isAuthenticated ? (
              <App
                key="app-phenomedsocial-ar"
                path="/phenomedsocial/ar"
                onLogout={handleLogout}
              />
            ) : (
              <Redirect to="/" />
            )}
          </Route>
          <Route exact path="/phenomedsocial">
            {isAuthenticated ? (
              <App
                key="app-phenomedsocial"
                path="/phenomedsocial"
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
          <Redirect to="/" />
        </Switch>
      </Router>
    </div>
  );
};

export default AppRouter;
