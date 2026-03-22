import { Link } from "react-router-dom";
import Nav from "../../Header/Nav/Nav";
import React from "react";

const Greeting = (props) => {
  const loginRecords = Array.isArray(props.state.login_record)
    ? [...props.state.login_record]
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.loggedInAt || 0).getTime() -
            new Date(firstRecord.loggedInAt || 0).getTime(),
        )
        .slice(0, 20)
    : [];

  return (
    <article id="Greeting_studysessions_article" className="fc">
      <div id="Greeting_topControls" className="fr">
        <div id="Greeting_userMenuCluster" className="fc">
          <button
            id="Greeting_userMenu_button"
            onClick={() => {
              let Greeting_userMenu_content_div = document.querySelector(
                "#Greeting_userMenu_content_div",
              );
              let Greeting_userMenu_content_div_CS = window.getComputedStyle(
                Greeting_userMenu_content_div,
              );
              if (
                Greeting_userMenu_content_div_CS.getPropertyValue("display") ===
                "none"
              ) {
                document.getElementById(
                  "Greeting_userMenu_content_div",
                ).style.display = "flex";
              } else {
                document.getElementById(
                  "Greeting_userMenu_content_div",
                ).style.display = "none";
              }
            }}
          >
            <i className="fi fi-bs-user" id="Greeting_userMenu_i"></i>
          </button>
          <div id="Greeting_userMenu_div" className="fc">
            <div id="Greeting_userMenu_content_div" className="fc">
              <div id="Greeting_userMenu_personalInfo_div">
                <label className="Greeting_userMenu_title_label">
                  Personal information
                </label>
                <div id="Greeting_userMenu_personalInfo_content_div" className="fc">
                  <div className="fr Greeting_userMenu_contentDivs">
                    <label>First name:</label>
                    <p>{props.state.firstname}</p>
                  </div>
                  <div className="fr Greeting_userMenu_contentDivs">
                    <label>Last name:</label>
                    <p>{props.state.lastname}</p>
                  </div>
                  <div className="fr Greeting_userMenu_contentDivs">
                    <label>Username:</label>
                    <p>{props.state.username}</p>
                  </div>
                  <div className="fr Greeting_userMenu_contentDivs">
                    <label>Password:</label>
                    <p style={{ color: "var(--red)", cursor: "pointer" }}>
                      Change password
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="Greeting_navWrap">
          <Nav path="/" state={props.state} logOut={props.logOut} />
        </div>
      </div>

      <section id="Greeting_preStart" className="fc slide-top">
        <div id="Greeting_preStart_intro" className="fc">
          <p id="Greeting_preStart_eyebrow">PhenoMed Workspace</p>
          <h1>Hello Dr. {props.state.firstname},</h1>
          <p id="Greeting_preStart_subtitle">
            A calm clinical space for focused study, planning, and social
            exchange.
          </p>
          <div id="Greeting_preStart_actions" className="fc">
            <button id="Greeting_preStart_button1" className="fr">
              <Link to="/study">
                <i className="fas fa-stopwatch"></i> Study tool
              </Link>
            </button>
            <button id="Greeting_preStart_button2" className="fr">
              <Link to="/studyplanner">
                <i className="fas fa-layer-group"></i> Study organizer
              </Link>
            </button>
            <button id="Greeting_preStart_button3" className="fr">
              <Link to="/phenomedsocial">
                <i className="fas fa-house-user"></i> Phenomed Social
              </Link>
            </button>
          </div>
        </div>

        <div id="Greeting_preStart_reportDiv" className="fc">
          <h3>Log Record: Date and Time</h3>
          <ul id="Greeting_studySessions_area" className="fc">
            {loginRecords.length === 0 ? (
              <div>No login records to show yet</div>
            ) : (
              loginRecords.map((record, index) => {
                const loggedInAt = new Date(record.loggedInAt);

                return (
                  <li key={record._id || record.loggedInAt || index}>
                    <div className="Greeting_logRecordCard fc">
                      <p>
                        Date:{" "}
                        {loggedInAt.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p>
                        Time:{" "}
                        {loggedInAt.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>
    </article>
  );
};
export default Greeting;
