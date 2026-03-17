import React from "react";
import { Link } from "react-router-dom";
import Dim from "./Dim/Dim";
import Logout from "./Logout/Logout";
import Menu from "./Menu/Menu";
import MessengerIcon from "./MessengerIcon/MessengerIcon";
import Notifications from "./Notifications/Notifications";
import ProfileIcon from "./Profile/ProfileIcon";
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
          />
          <Dim />
          <Refresh />
        </nav>
      )
};

export default Nav;
