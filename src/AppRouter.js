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
            <App path="/" onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </Route>
        <Route path="/cooporation">
          {isAuthenticated ? (
            <App path="/cooporation" onLogout={handleLogout} />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route path="/study">
          {isAuthenticated ? (
            <App path="/study" onLogout={handleLogout} />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route path="/studyplanner">
          {isAuthenticated ? (
            <App path="/studyplanner" onLogout={handleLogout} />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route exact path="/phenomedsocial/ar">
          {isAuthenticated ? (
            <App path="/phenomedsocial/ar" onLogout={handleLogout} />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route exact path="/phenomedsocial">
          {isAuthenticated ? (
            <App path="/phenomedsocial" onLogout={handleLogout} />
          ) : (
            <Redirect to="/" />
          )}
        </Route>
        <Route path="/profile/:username">
          {isAuthenticated ? (
            <App path="/profile" onLogout={handleLogout} />
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
