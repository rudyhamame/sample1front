import React, { useEffect, useRef, useState } from "react";
import "../Login/login.css";
import "../Login/login.max-width-600.css";
import "../Login/login.min-1200-max-1440.css";
import "../Login/login.min-901-max-1199.css";
import "../Login/login.min-601-max-900.css";
import "../Login/login.max-width-500.css";
import { apiUrl } from "../config/api";
import InspectionOverlay from "../debug/InspectionOverlay";

const clinicalRealityParagraphs = [
  "Phenomenon (trace-as-accessed) first exists in the mode of present appearing: it is an aspect of the phenomena-as-appearing to the subject, the 3D slice of appearance within experience. But once retained, it also becomes part of phenomena-as-stored, the 4D trajectory of experience, through which the subject gathers successive appearances into an experiential continuity.",
  "Slice of phenomena (phenomena-as-3D) is a phenomenal moment in which the lapse of time is zero, namely, a moment in which no change is grasped by the subject within its phenomenal mode and every phenomenon of this slice is re-identifiable by the subject. However, if there was at least one phenomenon that changes, it is not a slice.",
  "Time is not an object in the ontos, but the subject’s experience of the 4D ontos as phenomenally dense. It arises through the succession and retention of phenomena, by which the subject undergoes the ontos as temporally extended.",
  "A good clinician-as-subject must attend not only to the patient-as-object within the clinical moment, but also to the objects accessed by the patient-as-subject.",
  "Phenomenal Condensation & Phenomenal Pattern: a more likely true meaning of an object emerges through phenomenal condensation and through the patterned relations of change among phenomena. As these relations become stronger and more coherent, meaning becomes more solid. This solidified meaning is called a concept, that is, a representation in experience of the object under study.",
  "Domain of Phenomena is the attention-bounded portion of the subject’s experiential field within which objects are assigned for study and their phenomena become available for access, retention, and relation.",
  "Subject Target is to give meaning to the phenomena within the Domain of Phenomena so as to approach truth (objects of the Domain).",
  "Qualia lead attention by giving experience its felt salience. They do not yet constitute intelligibility, but they can draw the subject toward certain phenomena rather than others. In this sense, qualia help govern what is first noticed, held, or followed within the field of experience. They are therefore prior to conceptual meaning, yet influential in shaping which phenomena become central within attention.",
  "Felt Sense (Felt Salience) is the subject’s internal bodily awareness of a complex situation, in which multiple experiential elements—thoughts, emotions, and bodily sensations—are condensed into a pre-conceptual felt meaning. It is not yet full intelligibility, but a bodily given that can guide attention and orient the subject toward what matters within experience.",
  "Phenomena are processed through two parallel pathways: one pathway concerns their immediate experiential force, through which they are felt, attended to, and rendered salient within experience. The other concerns their intelligible organization, through which they are related, stabilized, and formed into concept. Thus, the subject does not process phenomena only by understanding them, but also by undergoing them, so that feeling and intellect operate in parallel upon the same phenomenal field. So, phenomena are processed through two parallel pathways: a qualitative pathway, in which phenomena are felt and become salient, and an intellectual pathway, in which phenomena are organized into meaning and concept.",
  "Phenomena are the interface between what-is-in-itself and what-is-accessed by the subject. They do not belong purely to the object-in-itself, since they arise only insofar as traces become available within a mode of access; yet neither are they detached inventions of the subject, since they are grounded in the real traces of the ontic being. In this sense, phenomena stand at the boundary where the truth of the object begins to enter experience. They are thus neither the object-in-itself as such, nor mere subjective fabrication, but the accessible presentation through which the object becomes available for study.",
  "Consciousness is the subject-side field of access in which real traces of objects become phenomenally available. Within consciousness, phenomena can appear, be attended, felt, retained, related, and conceptualized in the subject’s movement toward truth. Consciousness includes both newly appearing phenomena and previously retained phenomena insofar as they become present again to the subject. It is therefore not the object-in-itself nor the trace-in-itself, but the domain of phenomenal access through which the subject encounters reality.",
  "Experience is consciousness in its concrete lived unfolding (unfolding or continuity means the ongoing connectedness of experience across succession). It is the temporally extended undergoing of phenomena as they appear, are felt with salience, retained across succession, and organized into meaning. In this sense, experience is where truth first becomes livable for the subject: not as truth-in-itself fully possessed, but as phenomenally accessed reality undergoing qualitative and intelligible formation.",
  "Memory is the retained dimension of consciousness through which previously accessed phenomena remain stored and can later return for renewed access, relation, and meaning-formation. A phenomenon first appears within phenomena-as-appearing; once retained, it enters phenomena-as-stored. Memory belongs to this retained layer. Without memory, consciousness would break into isolated appearances, and the subject would have no experiential continuity, no grasp of change, no phenomenal condensation, and no concept formation",
  "Consciousness = accessExperience = lived accessMemory = retained access",
  "Consciousness gives presence.Experience gives lived continuity.Memory gives retention and re-availability.",
  "Reflection is the movement within consciousness by which the subject turns back upon lived experience in order to examine, relate, and clarify what has already been phenomenally accessed. Whereas experience is the immediate unfolding of phenomena as they appear, are felt, and are retained across succession, reflection is the secondary act through which those phenomena are taken up again for interpretation, comparison, and conceptual organization. Through reflection, what was first merely lived becomes more explicitly understood: salience is examined, relations are drawn, meanings are formed, and the subject can move from pre-reflective contact with reality toward more articulated understanding and truth. Reflection therefore does not create the phenomenon itself, but re-approaches what has appeared in experience so that its significance may become more intelligible.",
  "Meaning is the intelligible sense a phenomenon comes to have for the subject within consciousness and experience. It is not identical with the mere appearance of a phenomenon, but arises when what is given in experience becomes organized, related, and grasped as having some determinate sense. A phenomenon may first appear simply as felt or noticed, yet through retention, relation, and reflection it can come to mean something within the subject’s lived world. Meaning therefore belongs neither to the object-in-itself alone nor to pure subjective invention alone, but to the phenomenal encounter in which reality becomes understandable for the subject. In this way, meaning is the formed sense through which experience becomes not only lived, but also intelligible.",
  "Meaning and Reflection: Meaning is not merely a post-reflective mode of experience, though reflection often gives it clearer and more articulated form. In lived experience, phenomena may already be encountered with an implicit sense, orientation, or affective weight prior to deliberate reflection. Reflection then returns to experience, draws out relations, and makes that sense more explicit and conceptually graspable. Meaning, therefore, belongs both to the pre-reflective texture of experience in an implicit way and to reflective experience in a more explicit and developed way.",
  "Implicit meaning and Explicit meaning: Implicit meaning is the sense a phenomenon already carries within lived experience before the subject has reflectively clarified or articulated it. It is present as felt orientation, affective weight, or immediate significance, but remains folded into experience rather than set out clearly in thought or language. Explicit meaning, by contrast, is the sense of a phenomenon once reflection has drawn it out, clarified it, and made it available for articulation, judgment, communication, and conceptual use. Thus, implicit meaning is lived but not yet fully expressed, whereas explicit meaning is meaning that has become clear, formulable, and in that sense exportable beyond the immediacy of experience.",
  "Salience is the degree to which a phenomenon stands out within consciousness as prominent, noticeable, affectively striking, or attention-grabbing. A phenomenon becomes salient when it appears with greater intensity, contrast, novelty, affective charge, urgency, or relevance to the subject’s current state, so that it draws notice more readily than what remains in the background.",
  "Significance is the meaningful importance a phenomenon comes to have for the subject within experience, reflection, and understanding. A phenomenon may be salient simply because it appears vividly or forcefully, even before the subject knows what it means, whereas it becomes significant when that appearance is taken up as mattering in some determinate way. Thus, salience concerns phenomenal prominence, while significance concerns meaningful importance.",
  "Salience and Significance: A phenomenon that is already significant to the subject can become salient because its prior meaning, value, or relevance disposes consciousness to register it more readily when it appears. What matters to the subject is not encountered as neutral among other appearances, but as bearing a heightened readiness for notice, affective resonance, and attentional uptake. For this reason, when such a phenomenon enters the field of consciousness, it tends to stand out more quickly and forcefully than what lacks comparable significance. Its significance does not itself collapse into salience, but it functions as a condition that intensifies the likelihood of salience by making the phenomenon more experientially charged, recognizable, and attentionally compelling. In this way, prior significance can help produce salience, such that what already matters to the subject more readily comes forward within experience.",
  "Identity of the subject is not just what is stored, but the active pattern by which retained phenomena shape how new reality appears and how that reality is changed in return.",
];

const initialClinicalRealityHtml = [
  "<h3>H: MCTOS | PhenoMed Website</h3>",
  ...clinicalRealityParagraphs.map((paragraph) => `<p>${paragraph}</p>`),
].join("");

const buildHighlightCursor = (color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <path d="M7 20l-1 5 5-1 10-10-4-4L7 20z" fill="${color}" stroke="#24434a" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M15.8 7.2l4 4" stroke="#24434a" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M5 25h8" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `.trim();

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 24, text`;
};

const Login = ({ onLogin }) => {
  const articleRef = useRef(null);
  const footerRef = useRef(null);
  const loginFormRef = useRef(null);
  const realityEditorRef = useRef(null);
  const [is_loading, setIs_loading] = useState(null);
  const [signup_ok, setSignup_ok] = useState(null);
  const [login_ok, setLogin_ok] = useState(null);
  const [authReport, setAuthReport] = useState(null);
  const [signupMessage, setSignupMessage] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [isClinicalRealityOpen, setIsClinicalRealityOpen] = useState(false);
  const [clinicalRealityHtml, setClinicalRealityHtml] = useState(
    initialClinicalRealityHtml,
  );
  const [editorTextColor, setEditorTextColor] = useState("#1a3b43");
  const [editorHighlightColor, setEditorHighlightColor] = useState("#fff1a8");
  const [isHighlightModeOn, setIsHighlightModeOn] = useState(false);
  const [hasRealitySelection, setHasRealitySelection] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [zoomScale, setZoomScale] = useState(window.visualViewport?.scale || 1);
  const isWideLoginLayout = viewportSize.width > 1000;
  const feedbackMessage =
    (login_ok === false &&
      "The password you entered is not correct, please try again") ||
    (signup_ok === true &&
      (signupMessage || "You have successfully signed up!")) ||
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
    if (!isWideLoginLayout && isClinicalRealityOpen) {
      setIsClinicalRealityOpen(false);
    }
  }, [isClinicalRealityOpen, isWideLoginLayout]);

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

  useEffect(() => {
    const syncRealitySelection = () => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasRealitySelection(false);
        return;
      }

      const editorElement = realityEditorRef.current;
      const range = selection.getRangeAt(0);
      const hasSelectionInsideEditor =
        !!editorElement &&
        editorElement.contains(range.commonAncestorContainer) &&
        selection.toString().trim().length > 0;

      setHasRealitySelection(hasSelectionInsideEditor);
    };

    document.addEventListener("selectionchange", syncRealitySelection);
    return () => {
      document.removeEventListener("selectionchange", syncRealitySelection);
    };
  }, []);

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

  const focusRealityEditor = () => {
    if (realityEditorRef.current) {
      realityEditorRef.current.focus();
    }
  };

  const applyEditorCommand = (command, value = null) => {
    focusRealityEditor();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, value);
  };

  const applyHighlightToSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (editorElement && editorElement.contains(range.commonAncestorContainer)) {
      applyEditorCommand("hiliteColor", editorHighlightColor);
    }
  };

  const adjustSelectedFontSize = (delta) => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setHasRealitySelection(false);
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (!editorElement || !editorElement.contains(range.commonAncestorContainer)) {
      setHasRealitySelection(false);
      return;
    }

    const selectedText = selection.toString();

    if (!selectedText.trim()) {
      setHasRealitySelection(false);
      return;
    }

    const parentElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    const computedFontSizePx = Number.parseFloat(
      window.getComputedStyle(parentElement).fontSize,
    );
    const computedFontSizePt = computedFontSizePx * 0.75;
    const nextFontSizePt = Math.max(9, Math.min(31.5, computedFontSizePt + delta));
    const extractedContent = range.extractContents();
    const fragmentChildNodes = Array.from(extractedContent.childNodes);
    const sizeWrapper = document.createElement("span");

    sizeWrapper.style.fontSize = `${nextFontSizePt.toFixed(1)}pt`;
    sizeWrapper.appendChild(extractedContent);
    range.insertNode(sizeWrapper);

    selection.removeAllRanges();
    const updatedRange = document.createRange();

    if (fragmentChildNodes.length > 0) {
      updatedRange.setStartBefore(fragmentChildNodes[0]);
      updatedRange.setEndAfter(fragmentChildNodes[fragmentChildNodes.length - 1]);
    } else {
      updatedRange.selectNodeContents(sizeWrapper);
    }

    selection.addRange(updatedRange);

    setHasRealitySelection(true);
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
          setSignupMessage(data.message || "You have successfully signed up!");
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
      <InspectionOverlay
        rootId="Login_article"
        debugClassName="Login_debugBordersOn"
        viewportBadgeId="Login_viewportBadge"
        hoveredBadgeId="Login_hoveredIdBadge"
        copiedBadgeId="Login_copiedIdBadge"
      />
      <main
        id="Login_main"
        className={`fc${isClinicalRealityOpen ? " Login_main--reality-open" : ""}`}
      >
        <section
          id="Login_realityPanel"
          className={isClinicalRealityOpen ? "is-open" : ""}
          aria-hidden={!isClinicalRealityOpen}
        >
          <div id="Login_realityPanel_inner" className="fc">
            <div id="Login_realityStickyHeader" className="fc">
              <p id="Login_realityPanel_eyebrow">How I See The Clinical Reality</p>
              <div id="Login_realityControls" className="fr">
                <button
                  type="button"
                  className="Login_realityControlButton"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyEditorCommand("bold")}
                >
                  B
                </button>
                <button
                  type="button"
                  className="Login_realityControlButton"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyEditorCommand("italic")}
                >
                  I
                </button>
                <button
                  type="button"
                  className="Login_realityControlButton"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyEditorCommand("underline")}
                >
                  U
                </button>
                <label className="Login_realityControlField">
                  <span>Color</span>
                  <input
                    type="color"
                    value={editorTextColor}
                    onMouseDown={(event) => event.preventDefault()}
                    onChange={(event) => {
                      setEditorTextColor(event.target.value);
                      applyEditorCommand("foreColor", event.target.value);
                    }}
                  />
                </label>
                <label className="Login_realityControlField">
                  <span>Highlight</span>
                  <button
                    type="button"
                    className={`Login_realityControlButton Login_realityControlButton--pen${isHighlightModeOn ? " is-armed" : ""}`}
                    title="Highlight mode"
                    aria-label="Toggle highlight mode"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      focusRealityEditor();
                      setIsHighlightModeOn((currentValue) => !currentValue);
                    }}
                  >
                    <i
                      className="fas fa-highlighter"
                      style={{ color: editorHighlightColor }}
                    ></i>
                  </button>
                  <input
                    type="color"
                    value={editorHighlightColor}
                    onMouseDown={(event) => event.preventDefault()}
                    onChange={(event) => {
                      setEditorHighlightColor(event.target.value);
                      if (!isHighlightModeOn) {
                        applyEditorCommand("hiliteColor", event.target.value);
                      }
                    }}
                  />
                </label>
                <label className="Login_realityControlField">
                  <span>Size</span>
                  <button
                    type="button"
                    className="Login_realityControlButton Login_realityControlButton--size"
                    title="Decrease selected text size"
                    aria-label="Decrease selected text size"
                    disabled={!hasRealitySelection}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => adjustSelectedFontSize(-1)}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    className="Login_realityControlButton Login_realityControlButton--size"
                    title="Increase selected text size"
                    aria-label="Increase selected text size"
                    disabled={!hasRealitySelection}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => adjustSelectedFontSize(1)}
                  >
                    A+
                  </button>
                </label>
              </div>
            </div>
            <div
              id="Login_realityEditor"
              ref={realityEditorRef}
              className="fc"
              contentEditable
              suppressContentEditableWarning
              style={{
                cursor: isHighlightModeOn
                  ? buildHighlightCursor(editorHighlightColor)
                  : "text",
              }}
              dangerouslySetInnerHTML={{ __html: clinicalRealityHtml }}
              onInput={(event) => {
                setClinicalRealityHtml(event.currentTarget.innerHTML);
              }}
              onBlur={(event) => {
                setClinicalRealityHtml(event.currentTarget.innerHTML);
              }}
              onMouseUp={() => {
                if (isHighlightModeOn) {
                  applyHighlightToSelection();
                }
              }}
              onKeyUp={() => {
                if (isHighlightModeOn) {
                  applyHighlightToSelection();
                }
              }}
            ></div>
          </div>
        </section>
        <section id="Login_loginLogo_container">
          <div id="Login_logoRow" className="fr">
            <button
              id="Login_realityToggle"
              type="button"
              aria-label={
                isClinicalRealityOpen
                  ? "Hide clinical reality note"
                  : "Show clinical reality note"
              }
              aria-expanded={isClinicalRealityOpen}
              onClick={() => {
                if (isWideLoginLayout) {
                  setIsClinicalRealityOpen((currentValue) => !currentValue);
                }
              }}
            >
              <i
                className={
                  isClinicalRealityOpen
                    ? "fas fa-chevron-left"
                    : "fas fa-chevron-right"
                }
              ></i>
            </button>
            <div id="Login_logoStack" className="fc">
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
            </div>
          </div>
        </section>
        <section
          id="Login_loginForm_container"
          className={
            isLoginTransitioning || (isClinicalRealityOpen && isWideLoginLayout)
              ? "is-collapsed"
              : ""
          }
        >
          <section
            id="Login_loginFrom_form"
            className={`fc Login_loginFrom_form--${authMode}`}
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
          <h4 id="Login_copyright_text">©2020 Rudy Hamame</h4>
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
