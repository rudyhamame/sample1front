import React from "react";
import Dim from "./Dim/Dim";
import Logout from "./Logout/Logout";
import Notifications from "./Notifications/Notifications";
import Refresh from "./Refresh/Refresh";
import SubApps from "./SubApps/SubApps";

const Nav = (props) => {
  return (
    <nav id="Nav_article" className="fr">
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
      <SubApps subApps={props.subApps} />
      <Logout logOut={props.logOut} />
      <Notifications
        state={props.state}
        acceptFriend={props.acceptFriend}
        makeNotificationsRead={props.makeNotificationsRead}
      />
      <Dim />
      <Refresh />
    </nav>
  );
};

export default Nav;
