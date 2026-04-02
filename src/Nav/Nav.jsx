import React from "react";
import Dim from "./Dim/Dim";
import Logout from "./Logout/Logout";
import Notifications from "./Notifications/Notifications";
import Refresh from "./Refresh/Refresh";
import SubApps from "./SubApps/SubApps";

const Nav = (props) => {
    const [drawingMenuOpen, setDrawingMenuOpen] = React.useState(false);
    const handleDrawingButtonClick = (e) => {
      e.stopPropagation();
      setDrawingMenuOpen((prev) => !prev);
    };
    const handleDrawingMenuNav = (path) => {
      setDrawingMenuOpen(false);
      window.location.href = path;
    };
  const [navVisible, setNavVisible] = React.useState(false);

  const handleToggle = () => {
    setNavVisible((prev) => !prev);
  };

  return navVisible ? (
    <div className="nav-wrapper nav-wrapper--layered">
      <div
        className={`nav-animated-wrapper${
          navVisible
            ? " nav-animated-wrapper--open"
            : " nav-animated-wrapper--closed"
        }`}
      >
        <nav
          id="Nav_article"
          className={`fr${navVisible ? "" : " Nav_article--collapsed"}`}
        >
          {Array.isArray(props.extraActions)
            ? props.extraActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`Nav_actionButton${
                    action.isActive ? " Nav_actionButton--active" : ""
                  }`}
                  onClick={action.onClick}
                  aria-label={action.label}
                  title={action.label}
                >
                  <i className={action.iconClass}></i>
                  <span>{action.label}</span>
                </button>
              ))
            : null}
          {/* Drawing button with vertical sub-apps list */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              className="Home_mainDrawingButton"
              title="Drawing & Sub-Apps"
              style={{ margin: "0 8px", width: 42, height: 42, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={handleDrawingButtonClick}
            >
              <i className="fas fa-pen"></i>
            </button>
            {drawingMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  left: 0,
                  background: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 1000,
                  minWidth: 180,
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <button
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}
                  onClick={() => handleDrawingMenuNav("/draw")}
                >
                  <i className="fas fa-paint-brush"></i>
                  <span>Drawing Tool</span>
                </button>
                {Array.isArray(props.subApps) && props.subApps.map((app) => (
                  <button
                    key={app.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}
                    onClick={() => handleDrawingMenuNav(app.path)}
                  >
                    <i className={app.icon}></i>
                    <span>{app.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <SubApps subApps={props.subApps} />
          <Logout logOut={props.logOut} />
          <Notifications
            state={props.state}
            acceptFriend={props.acceptFriend}
            makeNotificationsRead={props.makeNotificationsRead}
          />
          <Dim />
          <Refresh />
          {/* Handle to hide nav */}
          <div className="nav-handle-container nav-handle-container--inner">
            <button
              className="nav-bottom-handle"
              onClick={handleToggle}
              aria-label="Hide navigation"
            />
          </div>
        </nav>
      </div>
    </div>
  ) : (
    <div
      className="nav-wrapper nav-wrapper--layered"
      style={{
        height: 0,
        minHeight: 0,
        overflow: "visible",
        padding: 0,
        border: "none",
        background: "none",
      }}
    >
      <div className="nav-handle-container nav-handle-container--outer">
        <button
          className="nav-bottom-handle"
          onClick={handleToggle}
          aria-label="Show navigation"
        />
      </div>
    </div>
  );
};

export default Nav;
