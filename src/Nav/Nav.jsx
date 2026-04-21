import React from "react";
import Dim from "./Dim/Dim";
import Logout from "./Logout/Logout";
import Refresh from "./Refresh/Refresh";

const Nav = (props) => {
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
          <Logout logOut={props.logOut} />
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
