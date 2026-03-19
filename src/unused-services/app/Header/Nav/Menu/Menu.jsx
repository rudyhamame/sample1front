import React from "react";

const Menu = (props) => {
  const openMenu = () => {
    let Menu_content_container = document.getElementById(
      "Menu_content_container"
    );
    let Menu_i_open = document.getElementById("Menu_i_open");
    let Menu_i_close = document.getElementById("Menu_i_close");

    Menu_content_container.style.display = "inline";
    Menu_i_close.style.display = "inline";
    Menu_i_open.style.display = "none";
  };
  function closeMenu() {
    let Menu_content_container = document.getElementById(
      "Menu_content_container"
    );
    let Menu_i_open = document.getElementById("Menu_i_open");
    let Menu_i_close = document.getElementById("Menu_i_close");

    Menu_content_container.style.display = "none";
    Menu_i_close.style.display = "none";
    Menu_i_open.style.display = "inline";
  }

  function opentodoAside() {
    let todouaside_main_container = document.getElementById(
      "todouaside_main_container"
    );
    let control_todoAside = document.getElementById("control_todoAside");
    let open_icon = document.getElementById("i_open_todoAside");
    if (control_todoAside.title === "unclicked") {
      todouaside_main_container.style.width = "300px";
      control_todoAside.title = "clicked";
      open_icon.className = "fas fa-arrow-left";
    } else {
      todouaside_main_container.style.width = "0";
      control_todoAside.title = "unclicked";
      open_icon.className = "fas fa-arrow-right";
    }
  }

  return (
    <article id="Menu_article">
      <i id="Menu_i_open" onClick={openMenu} class="fas fa-bars"></i>
      <i id="Menu_i_close" onClick={closeMenu} class="fas fa-bars"></i>
      <section className="fc">
        <ul id="Menu_content_container" className="fc">
          <li onClick={opentodoAside}>Add a friend</li>
          <li>Account</li>
        </ul>
      </section>
    </article>
  );
};

export default Menu;
