import { Link } from "react-router-dom";
import Nav from "../../Header/Nav/Nav";
import React, { useState } from "react";
import { apiUrl } from "../../../config/api";

const Greeting = (props) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordFeedback, setPasswordFeedback] = useState({
    tone: "",
    message: "",
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const loginRecords = Array.isArray(props.state.login_record)
    ? [...props.state.login_record]
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.loggedInAt || 0).getTime() -
            new Date(firstRecord.loggedInAt || 0).getTime(),
        )
        .slice(0, 20)
    : [];

  const updatePasswordField = (event) => {
    const { name, value } = event.target;
    setPasswordFields((currentFields) => ({
      ...currentFields,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (!props.state?.token) {
      setPasswordFeedback({
        tone: "error",
        message: "You need to be logged in to change the password.",
      });
      return;
    }

    if (!passwordFields.currentPassword || !passwordFields.newPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "Please fill in the current and new password.",
      });
      return;
    }

    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordFeedback({
        tone: "error",
        message: "The new password and confirmation do not match.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordFeedback({
      tone: "",
      message: "",
    });

    try {
      const response = await fetch(apiUrl("/api/user/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${props.state.token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordFields.currentPassword,
          newPassword: passwordFields.newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to change the password right now."
        );
      }

      setPasswordFields({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFeedback({
        tone: "success",
        message: payload?.message || "Password changed successfully.",
      });
      setIsPasswordFormOpen(false);
    } catch (error) {
      setPasswordFeedback({
        tone: "error",
        message: error?.message || "Unable to change the password right now.",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return (
    <article id="Greeting_studysessions_article" className="fc">
      <div id="Greeting_topControls" className="fr">
        <div id="Greeting_userMenuCluster" className="fc">
          <button
            id="Greeting_userMenu_button"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
          >
            <i className="fi fi-bs-user" id="Greeting_userMenu_i"></i>
          </button>
          <div id="Greeting_userMenu_div" className="fc">
            <div
              id="Greeting_userMenu_content_div"
              className={`fc${isUserMenuOpen ? " Greeting_userMenu_content_div--open" : ""}`}
            >
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
                    <button
                      type="button"
                      className="Greeting_changePasswordToggle"
                      onClick={() =>
                        setIsPasswordFormOpen((current) => !current)
                      }
                    >
                      {isPasswordFormOpen ? "Close" : "Change password"}
                    </button>
                  </div>
                </div>
                {passwordFeedback.message ? (
                  <p
                    className={`Greeting_passwordFeedback Greeting_passwordFeedback--${passwordFeedback.tone || "info"}`}
                  >
                    {passwordFeedback.message}
                  </p>
                ) : null}
                {isPasswordFormOpen ? (
                  <form
                    id="Greeting_changePassword_form"
                    className="fc"
                    onSubmit={handlePasswordChange}
                  >
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Current password"
                      value={passwordFields.currentPassword}
                      onChange={updatePasswordField}
                      autoComplete="current-password"
                    />
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New password"
                      value={passwordFields.newPassword}
                      onChange={updatePasswordField}
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={passwordFields.confirmPassword}
                      onChange={updatePasswordField}
                      autoComplete="new-password"
                    />
                    <button
                      type="submit"
                      className="Greeting_changePasswordSubmit"
                      disabled={isPasswordSubmitting}
                    >
                      {isPasswordSubmitting ? "Saving..." : "Save password"}
                    </button>
                  </form>
                ) : null}
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
                const loggedOutAt = record.loggedOutAt
                  ? new Date(record.loggedOutAt)
                  : null;

                return (
                  <li key={record._id || record.loggedInAt || index}>
                    <div className="Greeting_logRecordCard">
                      <div className="Greeting_logRecordEntry fc">
                        <span className="Greeting_logRecordLabel">Login:</span>
                        <span className="Greeting_logRecordValue">
                          {loggedInAt.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          {loggedInAt.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="Greeting_logRecordEntry fc">
                        <span className="Greeting_logRecordLabel">Logout:</span>
                        <span className="Greeting_logRecordValue">
                          {loggedOutAt
                            ? `${loggedOutAt.toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })} ${loggedOutAt.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}`
                            : "Still active"}
                        </span>
                      </div>
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
