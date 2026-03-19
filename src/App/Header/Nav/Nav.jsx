import React from "react";
import Dim from "./Dim/Dim";
import Logout from "./Logout/Logout";
import Notifications from "./Notifications/Notifications";
import Refresh from "./Refresh/Refresh";
const Nav = (props) => {
  let app_page = document.getElementById("root");
  let width = window.getComputedStyle(app_page).width;
      return (
        <nav id="Nav_article" className="fr">
          <Logout logOut={props.logOut} />
          <Notifications
            state={props.state}
            acceptFriend={props.acceptFriend}
            makeNotificationsRead={props.makeNotificationsRead}
          />
          <Dim />
          <Refresh />
        </nav>
      )
};

export default Nav;
