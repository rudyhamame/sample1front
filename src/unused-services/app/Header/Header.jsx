import React from "react";
import Nav from "./Nav/Nav";

const Header = (props) => {
  return (
    <header id="Header_article" className="fr">
      <div id="Header_content_container" className="fr">
        <Nav
          rendered_page_switcher={props.rendered_page_switcher}
          username={props.username}
          dbUpdate_isConnected={props.dbUpdate_isConnected}
          logOut={props.logOut}
          state={props.state}
          acceptFriend={props.acceptFriend}
          type={props.type}
          show_profile={props.show_profile}
        />

        <h1
          style={{
            color: "white",
            textAlign: "center",
            fontFamily: "'Raleway', sans-serif",
            fontWeight: "500",
          }}
        >
          {props.state.firstname}
        </h1>
      </div>
    </header>
  );
};

export default Header;
