import React, { useEffect, useRef, useState } from "react";
import "../Login/login.css";
import "../Login/login.max-width-600.css";
import "../Login/login.min-1200-max-1440.css";
import "../Login/login.min-901-max-1199.css";
import "../Login/login.min-601-max-900.css";
import "../Login/login.max-width-500.css";
import { apiUrl } from "../config/api";

const Login = ({ onLogin }) => {
  const articleRef = useRef(null);
  const footerRef = useRef(null);
  const loginFormRef = useRef(null);
  const [is_loading, setIs_loading] = useState(null);
  const [signup_ok, setSignup_ok] = useState(null);
  const [login_ok, setLogin_ok] = useState(null);
  const [authReport, setAuthReport] = useState(null);
  const [signupMessage, setSignupMessage] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [zoomScale, setZoomScale] = useState(
    window.visualViewport?.scale || 1,
  );
  const feedbackMessage =
    (login_ok === false &&
      "The password you entered is not correct, please try again") ||
    (signup_ok === true && (signupMessage || "You have successfully signed up!")) ||
    (signup_ok === false &&
      (signupMessage || "Please make sure you entered valid information")) ||
    (signup_ok === null && signupMessage) ||
    null;

  useEffect(() => {
    if (login_ok && authReport) {
      setIsLoginTransitioning(true);
      sessionStorage.setItem("state", JSON.stringify(authReport));

      const timeoutId = window.setTimeout(() => {
        setIs_loading(false);
        if (onLogin) {
          onLogin(authReport);
        }
      }, 5000);

      return () => window.clearTimeout(timeoutId);
    }
  }, [authReport, login_ok]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const updateZoomScale = () => {
      setZoomScale(window.visualViewport?.scale || 1);
    };

    updateZoomScale();
    window.addEventListener("resize", updateZoomScale);
    window.visualViewport?.addEventListener("resize", updateZoomScale);

    return () => {
      window.removeEventListener("resize", updateZoomScale);
      window.visualViewport?.removeEventListener("resize", updateZoomScale);
    };
  }, []);

  useEffect(() => {
    if (!footerRef.current || !articleRef.current) {
      return;
    }

    // Keep footer:rest-of-page at 1:6, so footer is 1/7 of total visible height.
    const visibleFooterHeight = viewportSize.height / 7;
    const scaledFooterHeight = visibleFooterHeight * zoomScale;

    articleRef.current.style.setProperty(
      "--login-footer-height",
      `${scaledFooterHeight}px`,
    );
    footerRef.current.style.setProperty(
      "--login-footer-width",
      `${zoomScale * 100}%`,
    );
    footerRef.current.style.setProperty(
      "--login-footer-height",
      `${scaledFooterHeight}px`,
    );
    footerRef.current.style.setProperty(
      "--login-footer-scale",
      `${1 / zoomScale}`,
    );
  }, [viewportSize.height, zoomScale]);

  useEffect(() => {
    if (!loginFormRef.current || isLoginTransitioning) {
      return;
    }

    const formEl = loginFormRef.current;
    const selectors = [
      "input",
      "button",
      "#Login_modeNav h4",
      "#Login_loginFrom_form h4",
      "#Login_feedback_text",
    ].join(", ");

    const resetScaledStyles = () => {
      formEl.querySelectorAll(selectors).forEach((element) => {
        element.style.removeProperty("font-size");
        element.style.removeProperty("min-height");
        element.style.removeProperty("line-height");
        element.style.removeProperty("padding-top");
        element.style.removeProperty("padding-right");
        element.style.removeProperty("padding-bottom");
        element.style.removeProperty("padding-left");
      });
    };

    const collectMetrics = () =>
      Array.from(formEl.querySelectorAll(selectors)).map((element) => {
        const styles = window.getComputedStyle(element);
        const parseValue = (value) => {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        };

        return {
          element,
          fontSize: parseValue(styles.fontSize),
          minHeight: parseValue(styles.minHeight),
          lineHeight:
            styles.lineHeight === "normal"
              ? null
              : parseValue(styles.lineHeight),
          paddingTop: parseValue(styles.paddingTop),
          paddingRight: parseValue(styles.paddingRight),
          paddingBottom: parseValue(styles.paddingBottom),
          paddingLeft: parseValue(styles.paddingLeft),
        };
      });

    const applyScale = (metrics, scale) => {
      metrics.forEach((metric) => {
        if (metric.fontSize) {
          metric.element.style.setProperty(
            "font-size",
            `${Math.max(metric.fontSize * scale, 6)}px`,
            "important",
          );
        }

        if (metric.minHeight && metric.minHeight > 0) {
          metric.element.style.setProperty(
            "min-height",
            `${Math.max(metric.minHeight * scale, 16)}px`,
            "important",
          );
        }

        if (metric.lineHeight) {
          metric.element.style.setProperty(
            "line-height",
            `${Math.max(metric.lineHeight * scale, 1)}px`,
            "important",
          );
        }

        if (metric.paddingTop !== null) {
          metric.element.style.setProperty(
            "padding-top",
            `${Math.max(metric.paddingTop * scale, 0)}px`,
            "important",
          );
        }

        if (metric.paddingRight !== null) {
          metric.element.style.setProperty(
            "padding-right",
            `${Math.max(metric.paddingRight * scale, 0)}px`,
            "important",
          );
        }

        if (metric.paddingBottom !== null) {
          metric.element.style.setProperty(
            "padding-bottom",
            `${Math.max(metric.paddingBottom * scale, 0)}px`,
            "important",
          );
        }

        if (metric.paddingLeft !== null) {
          metric.element.style.setProperty(
            "padding-left",
            `${Math.max(metric.paddingLeft * scale, 0)}px`,
            "important",
          );
        }
      });
    };

    const fitLoginForm = () => {
      resetScaledStyles();
      const metrics = collectMetrics();
      let scale = 1;

      applyScale(metrics, scale);

      while (
        (formEl.scrollHeight > formEl.clientHeight + 1 ||
          formEl.scrollWidth > formEl.clientWidth + 1) &&
        scale > 0.4
      ) {
        scale -= 0.04;
        applyScale(metrics, scale);
      }
    };

    const runFit = () => window.requestAnimationFrame(fitLoginForm);
    const resizeObserver = new ResizeObserver(runFit);

    resizeObserver.observe(formEl);
    if (articleRef.current) {
      resizeObserver.observe(articleRef.current);
    }

    runFit();

    return () => {
      resizeObserver.disconnect();
      resetScaledStyles();
    };
  }, [
    authMode,
    feedbackMessage,
    isLoginTransitioning,
    viewportSize.height,
    viewportSize.width,
  ]);

  const formControl = (text) => {
    setAuthMode(text);
    setLogin_ok(null);
    setSignup_ok(null);
    setSignupMessage(null);
  };

  const login = () => {
    let login;
    let Login_username_input = document.getElementById("Login_username_input");
    let Login_password_input = document.getElementById("Login_password_input");

    if (Login_password_input.value && Login_username_input.value) {
      setIs_loading(true);
      let url = apiUrl("/api/user/login/");
      let req = new Request(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: Login_username_input.value,
          password: Login_password_input.value,
        }),
      });

      fetch(req)
        .then((response) => {
          if (response.status === 201) {
            login = true;
            return response.json(response);
          }
          if (response.status === 401) {
            setLogin_ok(false);
            setIs_loading(false);
            return response.json(response);
          }
        })
        .then((userdata) => {
          if (userdata && login === true) {
            setAuthReport({
              my_id: userdata.user._id,
              username: userdata.user.info.username,
              firstname: userdata.user.info.firstname,
              lastname: userdata.user.info.lastname,
              dob: userdata.user.info.dob,
              token: userdata.token,
              isConnected: true,
              notes: userdata.user.notes,
              friends: userdata.user.friends,
              friend_requests: userdata.user.friend_requests,
              notifications: userdata.user.notifications,
              posts: userdata.user.posts,
              courses: userdata.user.schoolPlanner.courses,
              lectures: userdata.user.schoolPlanner.lectures,
            });
            setLogin_ok(true);
          } else {
            setLogin_ok(false);
            setIs_loading(false);
          }
        });
    } else {
      setLogin_ok(false);
      setIs_loading(false);
    }
  };

  const signup = (event) => {
    event.preventDefault();
    setIs_loading(true);
    setSignupMessage(null);

    let Login_username_input = document.getElementById("Login_username_input");
    let Login_password_input = document.getElementById("Login_password_input");
    let Login_firstname_input = document.getElementById(
      "Login_firstname_input",
    );
    let Login_lastname_input = document.getElementById("Login_lastname_input");
    let Login_email_input = document.getElementById("Login_email_input");
    let Login_dob_input = document.getElementById("Login_dob_input");

    if (
      Login_username_input.value &&
      Login_password_input.value &&
      Login_firstname_input.value &&
      Login_lastname_input.value &&
      Login_email_input.value
    ) {
      const signupPayload = {
        username: Login_username_input.value,
        password: Login_password_input.value,
        firstname: Login_firstname_input.value,
        lastname: Login_lastname_input.value,
        email: Login_email_input.value,
        dob: Login_dob_input.value,
      };

      const url = apiUrl("/api/user/signup/request-code");
      const req = new Request(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupPayload),
      });

      fetch(req)
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.message || "Unable to complete signup. Please try again.",
            );
          }

          return data;
        })
        .then((data) => {
          setSignup_ok(true);
          setSignupMessage(
            data.message || "You have successfully signed up!",
          );
        })
        .catch((err) => {
          setSignup_ok(false);
          setSignupMessage(err.message);
        })
        .finally(() => {
          setIs_loading(false);
        });
    } else {
      setIs_loading(false);
      setSignup_ok(false);
      setSignupMessage("Please make sure you entered valid information");
    }
  };

  return (
    <article id="Login_article" className="fc" ref={articleRef}>
      <main id="Login_main" className="fc">
        <section id="Login_loginLogo_container">
          <h1 id="Login_loginLogo_text">
            <span className="Login_loginLogo_mark">H</span>
            <span className="Login_loginLogo_divider" aria-hidden="true">
              &middot;
            </span>
            <span className="Login_loginLogo_name">MCTOS</span>
          </h1>
          <h2 id="Login_loginLogo_cloneText">PhenoMed</h2>
          <h4 id="Login_subLoginLogo_text">
            From Clinical-related Phenomena to Diagnosis
          </h4>
        </section>
        <section id="Login_loginForm_container">
          <section
            id="Login_loginFrom_form"
            className={`fc Login_loginFrom_form--${authMode}${isLoginTransitioning ? " is-collapsed" : ""}`}
            ref={loginFormRef}
          >
            {authMode === "signup" && (
              <input
                id="Login_firstname_input"
                type="text"
                placeholder="doctor's first name"
              />
            )}
            {authMode === "signup" && (
              <input
                id="Login_lastname_input"
                type="text"
                placeholder="doctor's last name"
              />
            )}
            <input
              id="Login_username_input"
              type="text"
              placeholder="doctor's username"
              onKeyPress={(event) => {
                if (event.which === 13) {
                  login();
                }
              }}
            />
            <input
              id="Login_password_input"
              type="password"
              placeholder="password"
              onKeyPress={(event) => {
                if (event.which === 13) {
                  login();
                }
              }}
            />
            {authMode === "signup" && (
              <input
                id="Login_email_input"
                type="email"
                placeholder="doctor's email address"
              />
            )}
            {authMode === "signup" && (
              <input id="Login_dob_input" type="date" />
            )}
            {authMode === "login" ? (
              <button id="Login_login_button" onClick={login}>
                Log in
              </button>
            ) : (
              <button id="Login_signup_button" onClick={signup}>
                Sign up
              </button>
            )}
            <nav id="Login_modeNav" aria-label="Authentication mode">
              {authMode === "signup" && (
                <h4
                  className={authMode === "login" ? "is-active" : ""}
                  id="Login_loginShow_text"
                  onClick={() => formControl("login")}
                >
                  Log in
                </h4>
              )}
              {authMode === "login" && (
                <h4
                  id="Login_signupShow_text"
                  onClick={() => formControl("signup")}
                >
                  Sign up
                </h4>
              )}
            </nav>
            {feedbackMessage && (
              <h4 id="Login_feedback_text">{feedbackMessage}</h4>
            )}
          </section>
        </section>
      </main>
      <footer id="Login_footer" ref={footerRef}>
        <section id="Login_copyright_container">
          <h4 id="Login_copyright_text">Â©2020 Rudy Hamame</h4>
          <p id="Login_poweredBy_text">
            Powered by OpenAI API to support intelligent medical knowledge and
            enquiry experiences.
          </p>
        </section>
      </footer>
      {is_loading === true && (
        <div id="Login_loaderImg_div" className="loaderImg_div fc">
          <img src="/img/loader.gif" alt="" width="100px" />
        </div>
      )}
    </article>
  );
};

export default Login;


