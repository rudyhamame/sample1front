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
  const [loginLogEntries, setLoginLogEntries] = useState([]);
  const [isLoginLogDeleting, setIsLoginLogDeleting] = useState(false);
  const [loginLogError, setLoginLogError] = useState("");
  const [visitLogEntries, setVisitLogEntries] = useState([]);
  const [isVisitLogLoading, setIsVisitLogLoading] = useState(false);
  const [visitLogError, setVisitLogError] = useState("");
  const [isVisitLogDeleting, setIsVisitLogDeleting] = useState(false);
  const [loginLogIndex, setLoginLogIndex] = useState(0);
  const [visitLogIndex, setVisitLogIndex] = useState(0);

  React.useEffect(() => {
    setLoginLogEntries(
      Array.isArray(props.state?.login_record) ? props.state.login_record : []
    );
  }, [props.state?.login_record]);

  const isVisitLogOwner =
    String(props.state?.username || "").toLowerCase() === "rudyhamame";

  const loginRecords = Array.isArray(loginLogEntries)
    ? [...loginLogEntries]
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.loggedInAt || 0).getTime() -
            new Date(firstRecord.loggedInAt || 0).getTime(),
        )
        .slice(0, 20)
    : [];

  const activeLoginRecord =
    loginRecords.length > 0 ? loginRecords[loginLogIndex] : null;
  const activeVisitLogRecord =
    visitLogEntries.length > 0 ? visitLogEntries[visitLogIndex] : null;

  React.useEffect(() => {
    if (loginRecords.length === 0) {
      if (loginLogIndex !== 0) {
        setLoginLogIndex(0);
      }
      return;
    }

    if (loginLogIndex > loginRecords.length - 1) {
      setLoginLogIndex(loginRecords.length - 1);
    }
  }, [loginLogIndex, loginRecords.length]);

  React.useEffect(() => {
    if (visitLogEntries.length === 0) {
      if (visitLogIndex !== 0) {
        setVisitLogIndex(0);
      }
      return;
    }

    if (visitLogIndex > visitLogEntries.length - 1) {
      setVisitLogIndex(visitLogEntries.length - 1);
    }
  }, [visitLogEntries.length, visitLogIndex]);

  React.useEffect(() => {
    if (!isVisitLogOwner || !props.state?.token) {
      setVisitLogEntries([]);
      setVisitLogError("");
      setIsVisitLogLoading(false);
      return;
    }

    let isMounted = true;
    setIsVisitLogLoading(true);
    setVisitLogError("");

    fetch(apiUrl("/api/user/visit-log"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${props.state.token}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load the visit log right now."
          );
        }

        return payload;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setVisitLogEntries(
          Array.isArray(payload?.visitLog) ? payload.visitLog : []
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setVisitLogError(
          error?.message || "Unable to load the visit log right now."
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsVisitLogLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isVisitLogOwner, props.state?.token, props.state?.visitLogRefreshToken]);

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

  const clearVisitLog = async () => {
    if (!isVisitLogOwner || !props.state?.token || isVisitLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all visit log entries?"
    );

    if (!shouldDelete) {
      return;
    }

    setIsVisitLogDeleting(true);
    setVisitLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/visit-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the visit log right now."
        );
      }

      setVisitLogEntries([]);
      setVisitLogIndex(0);
    } catch (error) {
      setVisitLogError(
        error?.message || "Unable to delete the visit log right now."
      );
    } finally {
      setIsVisitLogDeleting(false);
    }
  };

  const clearLoginLog = async () => {
    if (!props.state?.token || isLoginLogDeleting) {
      return;
    }

    const shouldDelete = window.confirm(
      "Do you want to delete all login log entries?"
    );

    if (!shouldDelete) {
      return;
    }

    setIsLoginLogDeleting(true);
    setLoginLogError("");

    try {
      const response = await fetch(apiUrl("/api/user/login-log"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${props.state.token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the login log right now."
        );
      }

      setLoginLogEntries([]);
      setLoginLogIndex(0);
    } catch (error) {
      setLoginLogError(
        error?.message || "Unable to delete the login log right now."
      );
    } finally {
      setIsLoginLogDeleting(false);
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
          <Nav
            path="/"
            state={props.state}
            logOut={props.logOut}
            acceptFriend={props.acceptFriend}
            makeNotificationsRead={props.makeNotificationsRead}
          />
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
            <p id="Greeting_preStart_actionsTitle">PhenoMed Sub-apps</p>
            <ul id="Greeting_preStart_appList" className="fc">
              <li>
                <Link to="/study">
                  <i className="fas fa-stopwatch"></i>
                  <span>Phenomed Student</span>
                </Link>
              </li>
              <li>
                <Link to="/studyplanner">
                  <i className="fas fa-layer-group"></i>
                  <span>Study Organizer</span>
                </Link>
              </li>
              <li>
                <Link to="/phenomedsocial">
                  <i className="fas fa-house-user"></i>
                  <span>Phenomed Social</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div id="Greeting_preStart_reports" className="fc">
          <div id="Greeting_preStart_reportDiv" className="fc">
            <div className="Greeting_reportHeader fr">
              <h3>Log Record: Date and Time</h3>
              <button
                type="button"
                className="Greeting_reportDeleteButton"
                onClick={clearLoginLog}
                disabled={isLoginLogDeleting}
                aria-label="Delete all login log entries"
                title="Delete all login log entries"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
            <ul id="Greeting_studySessions_area" className="fc">
              {loginLogError ? (
                <div>{loginLogError}</div>
              ) : activeLoginRecord === null ? (
                <div>No login records to show yet</div>
              ) : (
                (() => {
                  const loggedInAt = new Date(activeLoginRecord.loggedInAt);
                  const loggedOutAt = activeLoginRecord.loggedOutAt
                    ? new Date(activeLoginRecord.loggedOutAt)
                    : null;

                  return (
                    <li
                      key={
                        activeLoginRecord._id ||
                        activeLoginRecord.loggedInAt ||
                        loginLogIndex
                      }
                      className="Greeting_logRecordViewer"
                    >
                      <button
                        type="button"
                        className="Greeting_logRecordArrow"
                        onClick={() =>
                          setLoginLogIndex((currentIndex) =>
                            Math.max(currentIndex - 1, 0)
                          )
                        }
                        disabled={loginLogIndex === 0}
                        aria-label="Show newer login record"
                        title="Show newer login record"
                      >
                        <i className="fas fa-angle-up"></i>
                      </button>
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
                      <button
                        type="button"
                        className="Greeting_logRecordArrow"
                        onClick={() =>
                          setLoginLogIndex((currentIndex) =>
                            Math.min(currentIndex + 1, loginRecords.length - 1)
                          )
                        }
                        disabled={loginLogIndex === loginRecords.length - 1}
                        aria-label="Show older login record"
                        title="Show older login record"
                      >
                        <i className="fas fa-angle-down"></i>
                      </button>
                    </li>
                  );
                })()
              )}
            </ul>
          </div>

          {isVisitLogOwner ? (
            <div id="Greeting_preStart_reportDiv" className="fc">
              <div className="Greeting_reportHeader fr">
                <h3>Visit Log: App Entries</h3>
                <button
                  type="button"
                  className="Greeting_reportDeleteButton"
                  onClick={clearVisitLog}
                  disabled={isVisitLogDeleting}
                  aria-label="Delete all visit log entries"
                  title="Delete all visit log entries"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
              <ul id="Greeting_studySessions_area" className="fc">
              {isVisitLogLoading ? (
                <div>Loading visit log...</div>
              ) : visitLogError ? (
                <div>{visitLogError}</div>
              ) : activeVisitLogRecord === null ? (
                <div>No visit records to show yet</div>
              ) : (
                (() => {
                  const visitedAt = new Date(activeVisitLogRecord.visitedAt);

                  return (
                    <li
                      key={`${activeVisitLogRecord._id || activeVisitLogRecord.ip || "visit"}-${activeVisitLogRecord.visitedAt || visitLogIndex}`}
                      className="Greeting_logRecordViewer"
                    >
                      <button
                        type="button"
                        className="Greeting_logRecordArrow"
                        onClick={() =>
                          setVisitLogIndex((currentIndex) =>
                            Math.max(currentIndex - 1, 0)
                          )
                        }
                        disabled={visitLogIndex === 0}
                        aria-label="Show newer visit record"
                        title="Show newer visit record"
                      >
                        <i className="fas fa-angle-up"></i>
                      </button>
                      <div className="Greeting_logRecordCard Greeting_logRecordCard--stacked">
                        <div className="Greeting_logRecordEntry fc">
                          <span className="Greeting_logRecordLabel">IP:</span>
                          <span className="Greeting_logRecordValue">
                            {`${activeVisitLogRecord.ip || "Unknown IP"} (${activeVisitLogRecord.country || "Unknown"})`}
                          </span>
                        </div>
                        <div className="Greeting_logRecordEntry fc">
                          <span className="Greeting_logRecordLabel">Visited:</span>
                          <span className="Greeting_logRecordValue">
                            {visitedAt.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            {visitedAt.toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="Greeting_logRecordArrow"
                        onClick={() =>
                          setVisitLogIndex((currentIndex) =>
                            Math.min(currentIndex + 1, visitLogEntries.length - 1)
                          )
                        }
                        disabled={visitLogIndex === visitLogEntries.length - 1}
                        aria-label="Show older visit record"
                        title="Show older visit record"
                      >
                        <i className="fas fa-angle-down"></i>
                      </button>
                    </li>
                  );
                })()
              )}
            </ul>
          </div>
          ) : null}
        </div>
      </section>
    </article>
  );
};
export default Greeting;
