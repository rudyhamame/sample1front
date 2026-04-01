import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./subapps.css";

const SubApps = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const history = useHistory();

  useEffect(() => {
    function closeOnOutsideClick(event) {
      const article = document.getElementById("SubApps_article");
      if (article && !article.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, []);

  function toggleOpen(event) {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function handleNav(event, path) {
    event.preventDefault();
    setIsOpen(false);
    history.push(path);
  }

  const apps = props.subApps || [];

  return (
    <section id="SubApps_article">
      <div id="SubApps_icon_container">
        <i
          className={isOpen ? "fas fa-th SubApps_icon--open" : "fas fa-th"}
          onClick={toggleOpen}
          title="Sub-apps"
        ></i>
      </div>

      <section id="SubApps_content_container">
        <ul
          id="SubApps_dropMenu_container"
          className="fc"
          style={{ display: isOpen ? "flex" : "none" }}
        >
          {apps.length === 0 ? (
            <li id="SubApps_empty_state">No apps available</li>
          ) : (
            apps.map((app) => (
              <li key={app.id}>
                <a
                  href={app.path}
                  className="SubApps_row fr"
                  onClick={(e) => handleNav(e, app.path)}
                >
                  <i className={app.icon}></i>
                  <span>{app.label}</span>
                </a>
              </li>
            ))
          )}
        </ul>
      </section>
    </section>
  );
};

export default SubApps;
