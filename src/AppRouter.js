import React, { useCallback, useState } from "react";
import { BrowserRouter as Router, Redirect, Route, Switch } from "react-router-dom";
import App from "./App/App";
import Login from "./Login/Login";

const getStoredAuth = () => {
  try {
    const storedState = sessionStorage.getItem("state");
    return storedState ? JSON.parse(storedState) : null;
  } catch (error) {
    return null;
  }
};

const AppRouter = () => {
  const [authState, setAuthState] = useState(getStoredAuth);
  const isAuthenticated = authState?.isConnected === true;

  const handleLogin = useCallback((nextAuthState) => {
    setAuthState(nextAuthState);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.clear();
    localStorage.clear();
    setAuthState(null);
  }, []);

  return (
    <Router>
      <Switch>
        <Route exact path="/">
          {isAuthenticated ? (
            <App key="app-home" path="/" onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
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
        <Route path="/studyplanner">
          {isAuthenticated ? (
            <App
              key="app-studyplanner"
              path="/studyplanner"
              onLogout={handleLogout}
            />
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
  );
};

export default AppRouter;
