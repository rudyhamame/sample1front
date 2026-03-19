import React from "react";

const Logout = (props) => {
  return (
    <section id="Logout_article">
      <i
        title="Log out"
        onClick={props.logOut}
        className="fas fa-sign-out-alt"
        id="i_nav_logout"
      ></i>
    </section>
  );
};

export default Logout;
