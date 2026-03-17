import React from "react";

const Notifications = (props) => {
  function openNotifications() {
    // if (document.getElementById("Notifications_alert")) {
    //   document.getElementById("Notifications_alert").style.display = "none";
    // }
    let Notifications_dropMenu_container = document.getElementById(
      "Notifications_dropMenu_container"
    );
    let i_bell_close = document.getElementById("i_bell_close");
    let i_bell_open = document.getElementById("i_bell_open");
    Notifications_dropMenu_container.style.display = "flex";
    i_bell_close.style.display = "inline";
    i_bell_open.style.display = "none";
    i_bell_open.style.color = "white";
  }

  function closeNotifications() {
    let Notifications_dropMenu_container = document.getElementById(
      "Notifications_dropMenu_container"
    );
    let i_bell_close = document.getElementById("i_bell_close");
    let i_bell_open = document.getElementById("i_bell_open");
    Notifications_dropMenu_container.style.display = "none";
    i_bell_close.style.display = "none";
    i_bell_open.style.display = "inline";
  }

  return (
    <section id="Notifications_article">
      <div id="Notification_icons_container">
        <i
          id="i_bell_open"
          onClick={openNotifications}
          class="fas fa-bell"
          title="Notifications"
        ></i>
        <i
          id="i_bell_close"
          onClick={closeNotifications}
          style={{ display: "none" }}
          class="fas fa-bell"
          title="Notifications"
        ></i>

      </div>

      <section id="Notifications_content_container">
        <ul id="Notifications_dropMenu_container" className="fc"></ul>
      </section>
    </section>
  );
};

export default Notifications;
