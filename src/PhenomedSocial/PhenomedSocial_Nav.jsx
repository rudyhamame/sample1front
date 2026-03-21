import React from "react";
import Dim from "../App/Header/Nav/Dim/Dim";
import Logout from "../App/Header/Nav/Logout/Logout";
import Notifications from "../App/Header/Nav/Notifications/Notifications";
import Refresh from "../App/Header/Nav/Refresh/Refresh";

const PhenomedSocial_Nav = (props) => {
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
      <div className="PhenomedSocial_navUtilityGroup fr">
        <Logout logOut={props.logOut} />
        <Notifications
          state={props.state}
          acceptFriend={props.acceptFriend}
          makeNotificationsRead={props.makeNotificationsRead}
          isOpen={props.notificationsOpen}
          onOpenChange={props.onNotificationsOpenChange}
          hidePanel
          disableOutsideClose
        />
        <Dim />
        <Refresh />
      </div>
    </nav>
  );
};

export default PhenomedSocial_Nav;
