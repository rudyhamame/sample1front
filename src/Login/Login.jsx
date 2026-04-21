import React, { useEffect, useRef, useState } from "react";
import "../Login/login.css";
import { apiUrl } from "../config/api";
import InspectionOverlay from "../debug/InspectionOverlay";
import {
  logoutStoredSession,
  readStoredSession,
  writeStoredSession,
} from "../utils/sessionCleanup";
import { normalizeUserPayload } from "../utils/normalizeUser";

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
const clinicalRealityPublicOwnerUsername = "rudyhamame";
const formatAppLastUpdatedLabel = (value) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const loginAppLastUpdatedFallbackLabel = formatAppLastUpdatedLabel(
  "2026-03-22T12:00:00+03:00",
);

const countryPhoneCodes = {
  Egypt: "+20",
  Lebanon: "+961",
  Jordan: "+962",
  Syria: "+963",
  USA: "+1",
  UK: "+44",
  Canada: "+1",
  Australia: "+61",
};

const countryOptions = [
  "Egypt",
  "Lebanon",
  "Jordan",
  "Syria",
  "USA",
  "UK",
  "Canada",
  "Australia",
  "Other",
];

const hometownCityOptionsByCountry = {
  Egypt: ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said"],
  Lebanon: ["Beirut", "Tripoli", "Sidon", "Tyre", "Jounieh"],
  Jordan: ["Amman", "Zarqa", "Irbid", "Aqaba", "Madaba"],
  Syria: ["Damascus", "Aleppo", "Homs", "Latakia", "Hama"],
  USA: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
  UK: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  Australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  Other: ["Other"],
};

const universityOptionsByCountry = {
  Egypt: [
    "Cairo University",
    "Ain Shams University",
    "Alexandria University",
    "Mansoura University",
    "Assiut University",
  ],
  Lebanon: [
    "American University of Beirut",
    "Lebanese University",
    "Saint Joseph University",
    "Lebanese American University",
  ],
  Jordan: [
    "University of Jordan",
    "Jordan University of Science and Technology",
    "Yarmouk University",
    "Hashemite University",
  ],
  Syria: [
    "Damascus University",
    "Aleppo University",
    "Homs University",
    "Latakia University",
    "Hama University",
  ],
  USA: [
    "Harvard University",
    "Stanford University",
    "MIT",
    "UCLA",
    "University of Michigan",
  ],
  UK: [
    "University of Oxford",
    "University of Cambridge",
    "Imperial College London",
    "UCL",
    "King's College London",
  ],
  Canada: [
    "University of Toronto",
    "McGill University",
    "University of British Columbia",
    "University of Alberta",
  ],
  Australia: [
    "University of Melbourne",
    "University of Sydney",
    "Monash University",
    "UNSW Sydney",
  ],
  Other: [],
};

const applyPhoneCountryCode = (country, phone = "") => {
  const code = countryPhoneCodes[country];
  if (!code) {
    return phone;
  }

  const digitsOnly = phone.replace(/\D+/g, "");
  const normalized = digitsOnly.replace(
    new RegExp(`^${code.replace("+", "")}`),
    "",
  );
  return `${code}${normalized}`;
};

const getUniversityOptionsForCountry = (country = "") => {
  const normalizedCountry = String(country || "").trim();
  if (!normalizedCountry) {
    return [];
  }
  return Array.isArray(universityOptionsByCountry[normalizedCountry])
    ? universityOptionsByCountry[normalizedCountry]
    : [];
};

const studyYearNumberOptions = Array.from(
  { length: new Date().getFullYear() - 2000 + 7 },
  (_, index) => String(2000 + index),
);
const studyTermOptions = ["First", "Second", "Third"];
const programOptions = [
  "Medicine",
  "Dentistry",
  "Pharmacy",
  "Nursing",
  "Biomedical Sciences",
  "Engineering",
  "Computer Science",
  "Business",
  "Law",
  "Arts",
  "Other",
];
const studyLanguageOptions = [
  "Arabic",
  "English",
  "French",
  "German",
  "Spanish",
  "Other",
];

const completeProfileCoreFields = [
  {
    key: "firstname",
    label: "First name",
    type: "text",
  },
  {
    key: "lastname",
    label: "Last name",
    type: "text",
  },
  {
    key: "email",
    label: "Email address",
    type: "email",
  },
  {
    key: "phoneCountry",
    label: "Phone country",
    type: "select",
    options: countryOptions,
  },
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
  },
  {
    key: "dob",
    label: "Date of birth",
    type: "date",
  },
  {
    key: "hometown.Country",
    label: "Country",
    type: "select",
    options: countryOptions,
  },
  {
    key: "hometown.City",
    label: "City",
    type: "select",
    options: [],
  },
  {
    key: "bio",
    label: "Bio",
    type: "textarea",
  },
];

const completeProfileStudentFields = [
  {
    key: "studying.university",
    label: "University",
    type: "select",
    options: [], // Will be populated dynamically
  },
  {
    key: "studying.faculty",
    label: "Faculty",
    type: "text",
  },
  {
    key: "studying.program",
    label: "Program",
    type: "select",
    options: programOptions,
  },
  {
    key: "studying.time.totalYears",
    label: "Program total years",
    type: "number",
  },
  {
    key: "studying.time.currentAcademicYear",
    label: "Current academic year number",
    type: "number",
  },
  {
    key: "studying.time.startDate.startYear",
    label: "Program start year",
    type: "select",
    options: studyYearNumberOptions,
  },
  {
    key: "studying.time.startDate.startTerm",
    label: "Program start term",
    type: "select",
    options: studyTermOptions,
  },
  {
    key: "studying.time.currentDate.year",
    label: "Current year",
    type: "select",
    options: studyYearNumberOptions,
  },
  {
    key: "studying.time.currentDate.term",
    label: "Current term",
    type: "select",
    options: studyTermOptions,
  },
  {
    key: "studying.language",
    label: "Language of study",
    type: "select",
    options: studyLanguageOptions,
  },
];

const completeProfileWorkingFields = [
  {
    key: "working.company",
    label: "Company",
    type: "text",
  },
  {
    key: "working.position",
    label: "Position",
    type: "text",
  },
];

const sanitizeNonNegativeNumberInput = (value) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "";
  }
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return "";
  }
  return String(Math.max(0, parsedValue));
};

const getStoredAuthState = () => {
  try {
    const rawState = window.sessionStorage.getItem("state");

    if (!rawState) {
      return null;
    }

    return JSON.parse(rawState);
  } catch (error) {
    return null;
  }
};

const getRangeFromPoint = (x, y) => {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }

  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);

    if (!position) {
      return null;
    }

    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  return null;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const parseApiPayload = async (response) => {
  const contentType = String(response?.headers?.get("content-type") || "")
    .trim()
    .toLowerCase();

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const rawText = await response.text().catch(() => "");
  const trimmedText = String(rawText || "").trim();

  if (!trimmedText || trimmedText.startsWith("<!DOCTYPE")) {
    return {
      message:
        "Backend returned HTML instead of JSON. Please check API base URL and route availability.",
    };
  }

  return {
    message: trimmedText,
  };
};

const formatPastedPlainText = (plainText) => {
  const normalizedText = String(plainText || "").replace(/\r\n?/g, "\n");
  const blocks = normalizedText.split(/\n{2,}/).filter((block) => block.trim());

  if (blocks.length === 0) {
    return "";
  }

  return blocks
    .map((block) => {
      const htmlBlock = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p><span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;">${htmlBlock}</span></p>`;
    })
    .join("");
};

const sanitizeClinicalRealityHtml = (html) => {
  if (typeof window === "undefined") {
    return String(html || "");
  }

  const container = window.document.createElement("div");
  container.innerHTML = String(html || "");

  container.querySelectorAll("*").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    if (element.tagName === "H3") {
      element.style.removeProperty("line-height");
      element.style.removeProperty("font-family");
    } else {
      element.style.removeProperty("font-size");
      element.style.removeProperty("line-height");
      element.style.removeProperty("font-family");
    }

    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });

  return container.innerHTML;
};

const Login = ({ onLogin, onForceLogout }) => {
  const articleRef = useRef(null);
  const footerRef = useRef(null);
  const loginFormRef = useRef(null);
  const previousAuthFormRectRef = useRef(null);
  const authFormAnimationFrameRef = useRef(null);
  const authFormAnimationTimeoutRef = useRef(null);
  const realityEditorRef = useRef(null);
  const hasSyncedRealityEditorRef = useRef(false);
  const hasCompletedClinicalRealityBootstrapRef = useRef(false);
  const hasSkippedInitialClinicalRealityPersistRef = useRef(false);
  const clinicalRealityBaselineRef = useRef(initialClinicalRealityHtml);
  const [is_loading, setIs_loading] = useState(null);
  const [signup_ok, setSignup_ok] = useState(null);
  const [login_ok, setLogin_ok] = useState(null);
  const [loginMessage, setLoginMessage] = useState(null);
  const [authReport, setAuthReport] = useState(null);
  const [signupMessage, setSignupMessage] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authFormInlineStyle, setAuthFormInlineStyle] = useState({});
  const [alignedBlockMinHeight, setAlignedBlockMinHeight] = useState(0);
  const [pendingSignupAuthReport, setPendingSignupAuthReport] = useState(null);
  const [isPendingSignupUsernameEditable, setIsPendingSignupUsernameEditable] =
    useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    username: "",
    password: "",
  });
  const [profileCompletionForm, setProfileCompletionForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phoneCountry: "",
    phone: "",
    dob: "",
    hometown: {
      Country: "",
      City: "",
    },
    bio: "",
    studying: {
      university: "",
      faculty: "",
      program: "",
      programStartYear: "",
      term: "",
      time: {
        totalYears: "",
        currentAcademicYear: "",
        startDate: {
          startYear: "",
          startTerm: "",
        },
        currentDate: {
          year: "",
          term: "",
        },
      },
      language: "",
    },
    working: {
      company: "",
      position: "",
    },
    profilePic: {
      url: "",
      publicId: "",
      mimeType: "",
      width: null,
      height: null,
    },
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      width: null,
      height: null,
    },
  });
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [isClinicalRealityOpen, setIsClinicalRealityOpen] = useState(false);
  const [isRealityToolbarOpen, setIsRealityToolbarOpen] = useState(false);
  const [clinicalRealityHtml, setClinicalRealityHtml] = useState(
    initialClinicalRealityHtml,
  );
  const [editorTextColor, setEditorTextColor] = useState("#1a3b43");
  const [editorHighlightColor, setEditorHighlightColor] = useState("#fff1a8");
  const [isHighlightEraseModeOn, setIsHighlightEraseModeOn] = useState(false);
  const [hasRealitySelection, setHasRealitySelection] = useState(false);
  const [selectedRealityFontSizePt, setSelectedRealityFontSizePt] =
    useState(null);
  const [isClinicalRealitySaving, setIsClinicalRealitySaving] = useState(false);
  const [savingDots, setSavingDots] = useState(".");
  const [canPersistClinicalReality, setCanPersistClinicalReality] = useState(
    Boolean(getStoredAuthState()?.token),
  );
  const [hasPendingAdminSave, setHasPendingAdminSave] = useState(false);
  const [summaryInput, setSummaryInput] = useState("");
  const [summaryReply, setSummaryReply] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [zoomScale, setZoomScale] = useState(window.visualViewport?.scale || 1);
  const [loginAppLastUpdatedLabel, setLoginAppLastUpdatedLabel] = useState(
    loginAppLastUpdatedFallbackLabel,
  );
  const [universityOptions, setUniversityOptions] = useState([]);
  const isWideLoginLayout = viewportSize.width > 1000;
  const feedbackMessage =
    (login_ok === false &&
      (loginMessage ||
        "The password you entered is not correct, please try again")) ||
    (signup_ok === true &&
      (signupMessage || "You have successfully signed up!")) ||
    (signup_ok === false &&
      (signupMessage || "Please make sure you entered valid information")) ||
    (signup_ok === null && signupMessage) ||
    null;

  useEffect(() => {
    let isMounted = true;

    fetch(apiUrl("/api/user/app-last-updated"))
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        if (payload?.committedAt) {
          setLoginAppLastUpdatedLabel(
            formatAppLastUpdatedLabel(payload.committedAt),
          );
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const buildEraserCursor = () => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <path d="M8 18l8-8 6 6-8 8H8l-4-4 8-8" fill="#f7fbfc" stroke="#35545b" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M14 24h8" stroke="#9db3b8" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `.trim();

    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 24, text`;
  };

  const saveClinicalRealityToDb = ({ token, html }) =>
    fetch(apiUrl("/api/user/clinical-reality"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        html: sanitizeClinicalRealityHtml(html),
      }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Unable to save clinical reality content.");
      }

      return response.json();
    });

  const insertHtmlAtCurrentSelection = (html) => {
    document.execCommand("insertHTML", false, html);
  };

  const extractPlainTextFromHtml = (html) => {
    if (typeof window === "undefined") {
      return String(html || "").replace(/<[^>]+>/g, " ");
    }

    const container = window.document.createElement("div");
    container.innerHTML = String(html || "");
    return (container.textContent || container.innerText || "").trim();
  };

  useEffect(() => {
    const storedSession = readStoredSession();

    if (!storedSession?.my_id) {
      fetch(apiUrl("/api/user/visit-log"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }).catch(() => null);
      return;
    }

    logoutStoredSession().finally(() => {
      fetch(apiUrl("/api/user/visit-log"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }).catch(() => null);
      if (typeof onForceLogout === "function") {
        onForceLogout();
      }
    });
  }, [onForceLogout]);

  useEffect(() => {
    if (login_ok && authReport) {
      setIsLoginTransitioning(true);
      writeStoredSession(authReport);
      setIs_loading(false);
      if (onLogin) {
        onLogin(authReport);
      }
      const transitionResetTimer = window.setTimeout(() => {
        setIsLoginTransitioning(false);
      }, 280);
      return () => window.clearTimeout(transitionResetTimer);
    }
    setIsLoginTransitioning(false);
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
    // Legacy backend source (kept as a supplemental fallback list).
    fetch(apiUrl("/api/user/hometown-cities"))
      .then((response) => response.json().catch(() => ({ cities: [] })))
      .then((payload) => {
        if (payload.cities && Array.isArray(payload.cities)) {
          setUniversityOptions(payload.cities);
        }
      })
      .catch(() => {
        // If fetching fails, set empty options
        setUniversityOptions([]);
      });
  }, []);

  useEffect(() => {
    if (!footerRef.current || !articleRef.current) {
      return;
    }

    // Keep footer:rest-of-page at 1:6, so footer is 1/7 of total visible height.
    const visibleFooterHeight =
      isClinicalRealityOpen && isWideLoginLayout ? 0 : viewportSize.height / 7;
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
  }, [
    isClinicalRealityOpen,
    isWideLoginLayout,
    viewportSize.height,
    zoomScale,
  ]);

  useEffect(() => {
    if (!realityEditorRef.current) {
      return;
    }

    const editorElement = realityEditorRef.current;
    const shouldHydrateEditor =
      !hasSyncedRealityEditorRef.current ||
      document.activeElement !== editorElement;

    if (
      shouldHydrateEditor &&
      editorElement.innerHTML !== clinicalRealityHtml
    ) {
      editorElement.innerHTML = clinicalRealityHtml;
    }

    hasSyncedRealityEditorRef.current = true;
  }, [clinicalRealityHtml]);

  useEffect(() => {
    let ignoreHydration = false;
    const storedAuthState = getStoredAuthState();

    const requestUrl = storedAuthState?.token
      ? apiUrl("/api/user/clinical-reality")
      : apiUrl(
          `/api/user/clinical-reality/public/${clinicalRealityPublicOwnerUsername}`,
        );
    const requestOptions = storedAuthState?.token
      ? {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedAuthState.token}`,
          },
        }
      : {
          method: "GET",
        };

    fetch(requestUrl, requestOptions)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load clinical reality content.");
        }

        return response.json();
      })
      .then((payload) => {
        if (ignoreHydration) {
          return;
        }

        const dbHtml = String(payload?.clinicalReality?.html || "");

        if (dbHtml.trim()) {
          const sanitizedDbHtml = sanitizeClinicalRealityHtml(dbHtml);
          clinicalRealityBaselineRef.current = sanitizedDbHtml;
          setClinicalRealityHtml(sanitizedDbHtml);
          setHasPendingAdminSave(false);
        } else {
          clinicalRealityBaselineRef.current = initialClinicalRealityHtml;
          setHasPendingAdminSave(false);
        }
      })
      .catch(() => {
        // Keep the bundled fallback if the public/authenticated fetch fails.
      })
      .finally(() => {
        if (!ignoreHydration) {
          hasCompletedClinicalRealityBootstrapRef.current = true;
        }
      });

    return () => {
      ignoreHydration = true;
    };
  }, []);

  useEffect(() => {
    if (!hasCompletedClinicalRealityBootstrapRef.current) {
      return;
    }

    if (!hasSkippedInitialClinicalRealityPersistRef.current) {
      hasSkippedInitialClinicalRealityPersistRef.current = true;
      return;
    }

    setIsClinicalRealitySaving(true);
    let ignoreSave = false;

    const saveTimeoutId = window.setTimeout(() => {
      const storedAuthState = getStoredAuthState();

      if (!storedAuthState?.token) {
        if (!ignoreSave) {
          setHasPendingAdminSave(
            clinicalRealityHtml !== clinicalRealityBaselineRef.current,
          );
        }
        if (!ignoreSave) {
          setIsClinicalRealitySaving(false);
        }
        return;
      }

      saveClinicalRealityToDb({
        token: storedAuthState.token,
        html: clinicalRealityHtml,
      })
        .then(() => {
          clinicalRealityBaselineRef.current = clinicalRealityHtml;
          setHasPendingAdminSave(false);
        })
        .catch(() => {
          // DB save intentionally has no browser fallback.
        })
        .finally(() => {
          if (!ignoreSave) {
            setIsClinicalRealitySaving(false);
          }
        });
    }, 1000);

    return () => {
      ignoreSave = true;
      window.clearTimeout(saveTimeoutId);
    };
  }, [clinicalRealityHtml]);

  useEffect(() => {
    if (!isClinicalRealitySaving) {
      setSavingDots(".");
      return;
    }

    const frames = [".", "..", "..."];
    let frameIndex = 0;
    const dotsIntervalId = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      setSavingDots(frames[frameIndex]);
    }, 320);

    return () => window.clearInterval(dotsIntervalId);
  }, [isClinicalRealitySaving]);

  useEffect(() => {
    if (
      !authReport?.token ||
      !hasCompletedClinicalRealityBootstrapRef.current
    ) {
      return;
    }

    setCanPersistClinicalReality(true);
    setIsClinicalRealitySaving(true);

    saveClinicalRealityToDb({
      token: authReport.token,
      html: clinicalRealityHtml,
    })
      .then(() => {
        clinicalRealityBaselineRef.current = clinicalRealityHtml;
        setHasPendingAdminSave(false);
      })
      .catch(() => {
        // DB save intentionally has no browser fallback.
      })
      .finally(() => {
        setIsClinicalRealitySaving(false);
      });
  }, [authReport]);

  useEffect(() => {
    const syncRealitySelection = () => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasRealitySelection(false);
        setSelectedRealityFontSizePt(null);
        return;
      }

      const editorElement = realityEditorRef.current;
      const range = selection.getRangeAt(0);
      const hasSelectionInsideEditor =
        !!editorElement &&
        editorElement.contains(range.commonAncestorContainer) &&
        selection.toString().trim().length > 0;

      setHasRealitySelection(hasSelectionInsideEditor);

      if (!hasSelectionInsideEditor) {
        setSelectedRealityFontSizePt(null);
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

      setSelectedRealityFontSizePt(Number(computedFontSizePt.toFixed(1)));
    };

    document.addEventListener("selectionchange", syncRealitySelection);
    return () => {
      document.removeEventListener("selectionchange", syncRealitySelection);
    };
  }, []);

  const formControl = (text) => {
    // Prevent switching away from complete-profile mode if user must complete profile
    if (authMode === "complete-profile" && text !== "complete-profile") {
      return;
    }

    if (loginFormRef.current) {
      const formRect = loginFormRef.current.getBoundingClientRect();
      previousAuthFormRectRef.current = {
        width: formRect.width,
        height: formRect.height,
      };
    }

    setAuthMode(text);
    setLogin_ok(null);
    setLoginMessage(null);
    setSignup_ok(null);
    setSignupMessage(null);
    if (text !== "complete-profile") {
      setPendingSignupAuthReport(null);
      setProfileCompletionForm({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        dob: "",
        hometown: {
          Country: "",
          City: "",
        },
        bio: "",
        studying: {
          university: "",
          faculty: "",
          program: "",
          programStartYear: "",
          term: "",
          time: {
            totalYears: "",
            currentAcademicYear: "",
            startDate: {
              startYear: "",
              startTerm: "",
            },
            currentDate: {
              year: "",
              term: "",
            },
          },
          language: "",
        },
        working: {
          company: "",
          position: "",
        },
        profilePic: {
          url: "",
          publicId: "",
          mimeType: "",
          width: null,
          height: null,
        },
        viewport: {
          x: 0,
          y: 0,
          zoom: 1,
          width: null,
          height: null,
        },
      });
    }
  };

  const goBackToSignupFromCompleteProfile = () => {
    if (loginFormRef.current) {
      const formRect = loginFormRef.current.getBoundingClientRect();
      previousAuthFormRectRef.current = {
        width: formRect.width,
        height: formRect.height,
      };
    }

    setAuthMode("signup");
    setLogin_ok(null);
    setLoginMessage(null);
    setSignup_ok(null);
    setSignupMessage(null);
    setIsPendingSignupUsernameEditable(false);
  };

  const updateProfileCompletionField = (field, value) => {
    setProfileCompletionForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateCredentialsField = (field, value) => {
    setCredentialsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // Helper functions for nested object handling
  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((current, key) => current?.[key], obj) || "";
  };

  const updateNestedField = (path, value) => {
    setProfileCompletionForm((prev) => {
      const keys = path.split(".");
      const newForm = { ...prev };
      let current = newForm;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newForm;
    });
  };

  const renderTextField = ({
    id,
    label,
    type = "text",
    value,
    onChange,
    onEnter,
    options = [],
    disabled = false,
  }) => {
    const isPasswordField = type === "password";
    const resolvedType = isPasswordField && isPasswordVisible ? "text" : type;

    if (type === "select") {
      return (
        <label className="Login_authField" htmlFor={id} key={id}>
          <span className="Login_authFieldLabel">{label}</span>
          <span className="Login_authInputWrap">
            <select
              id={id}
              value={value}
              className="Login_authInput"
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
            >
              <option value="">Select {label.toLowerCase()}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
        </label>
      );
    }

    return (
      <label className="Login_authField" htmlFor={id} key={id}>
        <span className="Login_authFieldLabel">{label}</span>
        <span className="Login_authInputWrap">
          <input
            id={id}
            type={resolvedType}
            value={value}
            autoComplete="off"
            min={type === "number" ? 0 : undefined}
            step={type === "number" ? 1 : undefined}
            className={
              isPasswordField
                ? "Login_authInput Login_authInput--password"
                : "Login_authInput"
            }
            onChange={(event) => onChange(event.target.value)}
            onWheel={(event) => {
              if (type === "number") {
                event.currentTarget.blur();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onEnter) {
                onEnter(event);
              }
            }}
          />
          {isPasswordField ? (
            <button
              type="button"
              className="Login_passwordToggle"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              title={isPasswordVisible ? "Hide password" : "Show password"}
              onClick={() => setIsPasswordVisible((current) => !current)}
            >
              <i
                className={
                  isPasswordVisible ? "fi fi-rr-eye-crossed" : "fi fi-rr-eye"
                }
              ></i>
            </button>
          ) : null}
        </span>
      </label>
    );
  };

  useEffect(() => {
    const formElement = loginFormRef.current;
    const previousRect = previousAuthFormRectRef.current;

    if (!formElement || !previousRect || typeof window === "undefined") {
      return;
    }

    const nextRect = formElement.getBoundingClientRect();
    previousAuthFormRectRef.current = null;

    if (
      Math.abs((previousRect.width || 0) - (nextRect.width || 0)) < 1 &&
      Math.abs((previousRect.height || 0) - (nextRect.height || 0)) < 1
    ) {
      setAuthFormInlineStyle({});
      return;
    }

    if (authFormAnimationFrameRef.current) {
      window.cancelAnimationFrame(authFormAnimationFrameRef.current);
    }

    if (authFormAnimationTimeoutRef.current) {
      window.clearTimeout(authFormAnimationTimeoutRef.current);
    }

    setAuthFormInlineStyle({
      width: `${previousRect.width}px`,
      height: `${previousRect.height}px`,
      overflow: "hidden",
      transition: "none",
    });

    authFormAnimationFrameRef.current = window.requestAnimationFrame(() => {
      setAuthFormInlineStyle({
        width: `${nextRect.width}px`,
        height: `${nextRect.height}px`,
        overflow: "hidden",
        transition: "width 260ms ease, height 260ms ease",
      });

      authFormAnimationTimeoutRef.current = window.setTimeout(() => {
        setAuthFormInlineStyle({});
      }, 280);
    });
  }, [authMode]);

  useEffect(() => {
    const formElement = loginFormRef.current;

    if (!formElement || typeof window === "undefined") {
      return;
    }

    const updateAlignedHeight = () => {
      const nextHeight = Math.ceil(
        formElement.getBoundingClientRect().height || 0,
      );
      setAlignedBlockMinHeight(nextHeight);
    };

    updateAlignedHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateAlignedHeight);
      return () => window.removeEventListener("resize", updateAlignedHeight);
    }

    const resizeObserver = new ResizeObserver(() => {
      updateAlignedHeight();
    });

    resizeObserver.observe(formElement);
    window.addEventListener("resize", updateAlignedHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateAlignedHeight);
    };
  }, [authMode, isWideLoginLayout]);

  useEffect(() => {
    return () => {
      if (authFormAnimationFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(authFormAnimationFrameRef.current);
      }

      if (
        authFormAnimationTimeoutRef.current &&
        typeof window !== "undefined"
      ) {
        window.clearTimeout(authFormAnimationTimeoutRef.current);
      }
    };
  }, []);

  const login = () => {
    let login;
    const username = credentialsForm.username.trim();
    const password = credentialsForm.password;

    if (password && username) {
      setIs_loading(true);
      setLoginMessage(null);
      let url = apiUrl("/api/user/login/");
      let req = new Request(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      fetch(req)
        .then(async (response) => {
          const payload = await parseApiPayload(response);

          if (response.status === 201) {
            login = true;
            return payload;
          }

          if (response.status === 202 && payload.requiresProfileCompletion) {
            // Profile completion required - redirect to post-signup form
            setPendingSignupAuthReport({
              token: payload.token,
              user: payload.user,
            });
            setIsPendingSignupUsernameEditable(false);
            setAuthMode("complete-profile");
            setLoginMessage("Please complete your profile to continue.");
            setIs_loading(false);
            return null;
          }

          if (response.status === 401) {
            setLoginMessage(
              "The password you entered is not correct, please try again",
            );
            setLogin_ok(false);
            setIs_loading(false);
            return payload;
          }

          throw new Error(
            payload?.message ||
              "The app backend is currently unavailable as I am working on the ECG Digitizer project.",
          );
        })
        .then((userdata) => {
          if (userdata && login === true) {
            const nextAuthReport = normalizeUserPayload(userdata.user, {
              token: userdata.token,
              isConnected: true,
            });

            setAuthReport(nextAuthReport);
            setLoginMessage(null);
            setLogin_ok(true);
            setIsClinicalRealitySaving(true);
            saveClinicalRealityToDb({
              token: userdata.token,
              html: realityEditorRef.current?.innerHTML || clinicalRealityHtml,
            })
              .then(() => {
                clinicalRealityBaselineRef.current =
                  realityEditorRef.current?.innerHTML || clinicalRealityHtml;
                setHasPendingAdminSave(false);
              })
              .catch(() => {
                // If this fails, we still allow login to continue.
              })
              .finally(() => {
                setIsClinicalRealitySaving(false);
                setCanPersistClinicalReality(true);
              });
          } else {
            setLoginMessage(
              "The password you entered is not correct, please try again",
            );
            setLogin_ok(false);
            setIs_loading(false);
          }
        })
        .catch(() => {
          setLoginMessage(
            "The app backend is currently unavailable as I am working on the ECG Digitizer project.",
          );
          setLogin_ok(false);
          setIs_loading(false);
        });
    } else {
      setLoginMessage(
        "The password you entered is not correct, please try again",
      );
      setLogin_ok(false);
      setIs_loading(false);
    }
  };

  const focusRealityEditor = () => {
    if (realityEditorRef.current) {
      realityEditorRef.current.focus();
    }
  };

  const hasActiveSelectionInsideEditor = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return false;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    return (
      !!editorElement && editorElement.contains(range.commonAncestorContainer)
    );
  };

  const applyEditorCommand = (command, value = null) => {
    if (!hasActiveSelectionInsideEditor()) {
      focusRealityEditor();
    }
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(command, false, value);

    if (realityEditorRef.current) {
      setClinicalRealityHtml(
        sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
      );
    }
  };

  const applyHighlightToSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (
      editorElement &&
      editorElement.contains(range.commonAncestorContainer)
    ) {
      applyEditorCommand("hiliteColor", editorHighlightColor);
      selection.removeAllRanges();
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
    }
  };

  const clearTransparentHighlightArtifacts = () => {
    if (!realityEditorRef.current) {
      return;
    }

    realityEditorRef.current
      .querySelectorAll(
        '[style*="background-color: transparent"], [style*="background-color: rgba(0, 0, 0, 0)"]',
      )
      .forEach((element) => {
        element.style.backgroundColor = "";

        if (!element.getAttribute("style")?.trim()) {
          element.removeAttribute("style");
        }
      });
  };

  const eraseHighlightAtPoint = (clientX, clientY) => {
    const editorElement = realityEditorRef.current;

    if (!editorElement) {
      return;
    }

    const caretRange = getRangeFromPoint(clientX, clientY);

    if (!caretRange || !editorElement.contains(caretRange.startContainer)) {
      return;
    }

    const textNode =
      caretRange.startContainer.nodeType === Node.TEXT_NODE
        ? caretRange.startContainer
        : null;

    if (!textNode || !textNode.textContent) {
      return;
    }

    const offset = Math.min(
      caretRange.startOffset,
      Math.max(textNode.textContent.length - 1, 0),
    );

    const charRange = document.createRange();
    charRange.setStart(textNode, offset);
    charRange.setEnd(
      textNode,
      Math.min(offset + 1, textNode.textContent.length),
    );

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(charRange);
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, "transparent");
    clearTransparentHighlightArtifacts();
    selection.removeAllRanges();
    setHasRealitySelection(false);
    setSelectedRealityFontSizePt(null);
    setClinicalRealityHtml(
      sanitizeClinicalRealityHtml(editorElement.innerHTML),
    );
  };

  const handleRealityEditorMouseDown = (event) => {
    if (!isHighlightEraseModeOn) {
      return;
    }

    event.preventDefault();
    eraseHighlightAtPoint(event.clientX, event.clientY);
  };

  const handleRealityEditorMouseMove = (event) => {
    if (!isHighlightEraseModeOn || event.buttons !== 1) {
      return;
    }

    event.preventDefault();
    eraseHighlightAtPoint(event.clientX, event.clientY);
  };

  const removeHighlightFromSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (
      !editorElement ||
      !editorElement.contains(range.commonAncestorContainer)
    ) {
      return;
    }

    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, "transparent");
    clearTransparentHighlightArtifacts();
    setClinicalRealityHtml(
      sanitizeClinicalRealityHtml(editorElement.innerHTML),
    );
  };

  const handleRealityEditorPaste = (event) => {
    event.preventDefault();

    const plainText = event.clipboardData?.getData("text/plain") || "";
    const htmlToInsert = formatPastedPlainText(plainText);

    if (!htmlToInsert) {
      return;
    }

    focusRealityEditor();
    insertHtmlAtCurrentSelection(htmlToInsert);

    if (realityEditorRef.current) {
      setClinicalRealityHtml(
        sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
      );
    }
  };

  const handleRealityEditorBeforeInput = (event) => {
    if (event.isComposing) {
      return;
    }

    if (event.inputType === "insertText" && event.data) {
      event.preventDefault();
      focusRealityEditor();
      insertHtmlAtCurrentSelection(
        `<span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;">${escapeHtml(event.data)}</span>`,
      );

      if (realityEditorRef.current) {
        setClinicalRealityHtml(
          sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
        );
      }
      return;
    }

    if (event.inputType === "insertParagraph") {
      event.preventDefault();
      focusRealityEditor();
      insertHtmlAtCurrentSelection(
        `<p><span style="font-size: 9pt; line-height: inherit; font-family: 'IBM Plex Mono', monospace;"><br></span></p>`,
      );

      if (realityEditorRef.current) {
        setClinicalRealityHtml(
          sanitizeClinicalRealityHtml(realityEditorRef.current.innerHTML),
        );
      }
    }
  };

  const adjustSelectedFontSize = (delta) => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
      return;
    }

    const editorElement = realityEditorRef.current;
    const range = selection.getRangeAt(0);

    if (
      !editorElement ||
      !editorElement.contains(range.commonAncestorContainer)
    ) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
      return;
    }

    const selectedText = selection.toString();

    if (!selectedText.trim()) {
      setHasRealitySelection(false);
      setSelectedRealityFontSizePt(null);
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
    const roundedFontSizePt = Number(computedFontSizePt.toFixed(3));
    const isWholePointSize = Number.isInteger(roundedFontSizePt);
    let nextFontSizePt = roundedFontSizePt;

    if (delta > 0) {
      nextFontSizePt = isWholePointSize
        ? roundedFontSizePt + delta
        : Math.ceil(roundedFontSizePt);
    } else if (delta < 0) {
      nextFontSizePt = isWholePointSize
        ? roundedFontSizePt + delta
        : Math.floor(roundedFontSizePt);
    }

    nextFontSizePt = Math.max(9, Math.min(31.5, nextFontSizePt));
    const extractedContent = range.extractContents();
    const fragmentChildNodes = Array.from(extractedContent.childNodes);
    const sizeWrapper = document.createElement("span");

    sizeWrapper.style.fontSize = `${nextFontSizePt.toFixed(1)}pt`;
    sizeWrapper.style.lineHeight = "inherit";
    sizeWrapper.appendChild(extractedContent);
    range.insertNode(sizeWrapper);

    selection.removeAllRanges();
    const updatedRange = document.createRange();

    if (fragmentChildNodes.length > 0) {
      updatedRange.setStartBefore(fragmentChildNodes[0]);
      updatedRange.setEndAfter(
        fragmentChildNodes[fragmentChildNodes.length - 1],
      );
    } else {
      updatedRange.selectNodeContents(sizeWrapper);
    }

    selection.addRange(updatedRange);

    setClinicalRealityHtml(
      sanitizeClinicalRealityHtml(editorElement.innerHTML),
    );
    setHasRealitySelection(true);
    setSelectedRealityFontSizePt(Number(nextFontSizePt.toFixed(1)));
  };

  const signup = (event) => {
    event?.preventDefault();
    setIs_loading(true);
    setSignupMessage(null);
    const username = credentialsForm.username.trim();
    const password = credentialsForm.password;

    if (username && password) {
      const signupPayload = {
        username,
        password,
      };

      const url = apiUrl("/api/user/signup");
      const req = new Request(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupPayload),
      });

      fetch(req)
        .then(async (response) => {
          const data = await parseApiPayload(response);

          if (!response.ok) {
            throw new Error(
              data.message || "Unable to complete signup. Please try again.",
            );
          }

          return data;
        })
        .then((data) => {
          const nextPendingAuthReport = normalizeUserPayload(data.user, {
            token: data.token,
            isConnected: true,
          });

          if (loginFormRef.current) {
            const formRect = loginFormRef.current.getBoundingClientRect();
            previousAuthFormRectRef.current = {
              width: formRect.width,
              height: formRect.height,
            };
          }

          setPendingSignupAuthReport(nextPendingAuthReport);
          setIsPendingSignupUsernameEditable(false);
          setSignup_ok(true);
          setSignupMessage(
            data.message ||
              "Account created. Complete your profile to continue.",
          );
          setAuthMode("complete-profile");
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
      setSignupMessage("Please enter a valid username and password.");
    }
  };

  const completeSignupProfile = (event) => {
    event?.preventDefault();

    if (!pendingSignupAuthReport?.token) {
      setSignup_ok(false);
      setSignupMessage("Your signup session expired. Please sign up again.");
      setAuthMode("signup");
      return;
    }

    const {
      firstname,
      lastname,
      email,
      phoneCountry,
      phone,
      dob,
      hometown,
      bio,
      studying,
      working,
    } = profileCompletionForm;

    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !email.trim() ||
      !phoneCountry.trim() ||
      !phone.trim() ||
      !dob.trim() ||
      !hometown.Country.trim() ||
      !hometown.City.trim() ||
      !bio.trim()
    ) {
      setSignup_ok(false);
      setSignupMessage("Please complete all required personal information.");
      return;
    }

    // Check if user provided studying or working info
    const isStudying = studying.university.trim() || studying.program.trim();
    const isWorking = working.company.trim() || working.position.trim();

    if (isStudying) {
      if (
        !studying.program.trim() ||
        !studying.university.trim() ||
        !String(studying?.time?.startDate?.startYear || "").trim() ||
        !String(studying?.time?.startDate?.startTerm || "").trim() ||
        !String(studying?.time?.currentDate?.year || "").trim() ||
        !String(studying?.time?.currentDate?.term || "").trim()
      ) {
        setSignup_ok(false);
        setSignupMessage("Please complete all education information.");
        return;
      }
    }

    if (isWorking) {
      if (!working.company.trim() || !working.position.trim()) {
        setSignup_ok(false);
        setSignupMessage("Please complete all professional information.");
        return;
      }
    }

    if (!isStudying && !isWorking) {
      setSignup_ok(false);
      setSignupMessage(
        "Please provide either education or professional information.",
      );
      return;
    }

    setIs_loading(true);
    setSignupMessage(null);

    fetch(apiUrl("/api/user/signup/personal"), {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pendingSignupAuthReport.token}`,
      },
      body: JSON.stringify({
        firstname,
        lastname,
        email,
        phone,
        dob,
        hometown,
        bio,
        studying: isStudying ? studying : undefined,
        working: isWorking ? working : undefined,
      }),
    })
      .then(async (response) => {
        const data = await parseApiPayload(response);

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to save your personal information.",
          );
        }

        return data;
      })
      .then((data) => {
        const nextAuthReport = normalizeUserPayload(data.user, {
          token: pendingSignupAuthReport.token,
          isConnected: true,
        });

        setAuthReport(nextAuthReport);
        setLogin_ok(true);
        setLoginMessage(null);
        setSignup_ok(true);
        setSignupMessage(
          data.message || "Profile completed successfully. Redirecting...",
        );
        setCanPersistClinicalReality(true);
      })
      .catch((error) => {
        setSignup_ok(false);
        setSignupMessage(error.message);
      })
      .finally(() => {
        setIs_loading(false);
      });
  };

  const editPendingSignupAuth = () => {
    if (!pendingSignupAuthReport?.token) {
      setSignup_ok(false);
      setSignupMessage("Your signup session expired. Please sign up again.");
      setAuthMode("signup");
      return;
    }

    const username = String(credentialsForm.username || "").trim();
    const password = String(credentialsForm.password || "");

    if (!username || !password) {
      setSignup_ok(false);
      setSignupMessage("Please provide username and password before editing.");
      return;
    }

    setIs_loading(true);
    setSignupMessage(null);

    fetch(apiUrl("/api/user/signup/auth"), {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pendingSignupAuthReport.token}`,
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })
      .then(async (response) => {
        const data = await parseApiPayload(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to update signup credentials.");
        }

        return data;
      })
      .then((data) => {
        setPendingSignupAuthReport((current) => ({
          ...(current || {}),
          user: data.user,
        }));
        setIsPendingSignupUsernameEditable(false);
        setSignup_ok(true);
        setSignupMessage("Credentials updated. Continue profile completion.");
        setAuthMode("complete-profile");
      })
      .catch((error) => {
        setSignup_ok(false);
        setSignupMessage(error.message);
      })
      .finally(() => {
        setIs_loading(false);
      });
  };

  const summarizeClinicalReality = async () => {
    const sourceText =
      summaryInput.trim() || extractPlainTextFromHtml(clinicalRealityHtml);

    if (!sourceText) {
      setSummaryError("There is no text to summarize.");
      setSummaryReply("");
      return;
    }

    setIsSummarizing(true);
    setSummaryError("");

    try {
      const response = await fetch(apiUrl("/api/enquiries"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: sourceText,
          aiProvider: "openai",
          instructions:
            "Summarize the provided text clearly and faithfully. Keep the summary structured in one short paragraph followed by 3 concise bullet points. Do not invent claims. Preserve philosophical and clinical meaning.",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to summarize the text.");
      }

      setSummaryReply(String(payload?.reply || "").trim());
      setSummaryError("");
    } catch (error) {
      setSummaryReply("");
      setSummaryError(
        String(error?.message || "Unable to summarize the text right now."),
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const authSubmitLabel =
    authMode === "login"
      ? "Log in"
      : authMode === "signup"
        ? "Sign up"
        : "Continue to Home";
  const authSubmitAction =
    authMode === "login"
      ? login
      : authMode === "signup"
        ? signup
        : completeSignupProfile;
  const isSignupAuthEditMode =
    authMode === "signup" && Boolean(pendingSignupAuthReport?.token);

  const isSubmitDisabled = (() => {
    if (authMode === "login" || authMode === "signup") {
      return !credentialsForm.username.trim() || !credentialsForm.password;
    }
    if (authMode === "complete-profile") {
      const {
        firstname,
        lastname,
        email,
        phone,
        dob,
        hometown,
        bio,
        studying,
        working,
      } = profileCompletionForm;
      if (
        !firstname.trim() ||
        !lastname.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !dob.trim() ||
        !hometown.Country.trim() ||
        !hometown.City.trim() ||
        !bio.trim()
      ) {
        return true;
      }
      // Check if user is studying or working
      const isStudying = studying.university.trim() || studying.program.trim();
      const isWorking = working.company.trim() || working.position.trim();

      if (isStudying) {
        return (
          !studying.program.trim() ||
          !studying.university.trim() ||
          !String(studying?.time?.startDate?.startYear || "").trim() ||
          !String(studying?.time?.startDate?.startTerm || "").trim() ||
          !String(studying?.time?.currentDate?.year || "").trim() ||
          !String(studying?.time?.currentDate?.term || "").trim()
        );
      }
      if (isWorking) {
        return !working.company.trim() || !working.position.trim();
      }
      // User must be either studying or working
      return !isStudying && !isWorking;
    }
    return false;
  })();

  const authModeSwitchLabel =
    authMode === "login" ? "Create an account" : "I already have an account";

  const credentialFields =
    authMode === "login" || authMode === "signup"
      ? [
          renderTextField({
            id: "login-username-input",
            label: "Username",
            value: credentialsForm.username,
            onChange: (value) => updateCredentialsField("username", value),
            onEnter:
              authMode === "login"
                ? () => login()
                : isSignupAuthEditMode
                  ? () => {
                      if (isPendingSignupUsernameEditable) {
                        editPendingSignupAuth();
                      }
                    }
                  : signup,
            disabled:
              authMode === "signup" &&
              Boolean(pendingSignupAuthReport?.token) &&
              !isPendingSignupUsernameEditable,
          }),
          renderTextField({
            id: "login-password-input",
            label: "Password",
            type: "password",
            value: credentialsForm.password,
            onChange: (value) => updateCredentialsField("password", value),
            onEnter:
              authMode === "login"
                ? () => login()
                : isSignupAuthEditMode
                  ? () => {
                      if (isPendingSignupUsernameEditable) {
                        editPendingSignupAuth();
                      }
                    }
                  : signup,
          }),
        ]
      : [];

  const completeProfileFields =
    authMode === "complete-profile"
      ? [
          ...(() => {
            const renderCoreField = (field) => {
            const isNestedField = field.key.includes(".");
            const value = isNestedField
              ? getNestedValue(profileCompletionForm, field.key)
              : profileCompletionForm[field.key];
            const options =
              field.key === "hometown.City"
                ? hometownCityOptionsByCountry[
                    profileCompletionForm.hometown.Country
                  ] || []
                : field.options;
            const onChange = (value) => {
              if (field.key === "phoneCountry") {
                setProfileCompletionForm((current) => ({
                  ...current,
                  phoneCountry: value,
                  phone: applyPhoneCountryCode(value, current.phone),
                }));
              } else if (field.key === "hometown.Country") {
                setProfileCompletionForm((current) => ({
                  ...current,
                  hometown: {
                    ...current.hometown,
                    Country: value,
                    City: "",
                  },
                }));
              } else if (isNestedField) {
                updateNestedField(field.key, value);
              } else {
                updateProfileCompletionField(field.key, value);
              }
            };

            return renderTextField({
              id: `complete-profile-${field.key.replace(".", "-")}`,
              label: field.label,
              type: field.type,
              value,
              onChange,
              options,
              disabled:
                field.key === "hometown.City" &&
                !profileCompletionForm.hometown.Country,
            });
            };

            const renderedCoreFields = [];
            const phoneCountryField = completeProfileCoreFields.find(
              (field) => field.key === "phoneCountry",
            );
            const phoneField = completeProfileCoreFields.find(
              (field) => field.key === "phone",
            );

            completeProfileCoreFields.forEach((field) => {
              if (field.key === "phoneCountry" || field.key === "phone") {
                return;
              }

              renderedCoreFields.push(renderCoreField(field));

              if (field.key === "email" && phoneCountryField && phoneField) {
                renderedCoreFields.push(
                  <div key="complete-profile-phone-row" className="Login_authInlineRow">
                    {renderCoreField(phoneCountryField)}
                    {renderCoreField(phoneField)}
                  </div>,
                );
              }
            });

            return renderedCoreFields;
          })(),
          // Studying section
          <div key="studying-section" className="profile-section">
            <h3>Education (Optional)</h3>
            {completeProfileStudentFields.map((field) =>
              renderTextField({
                id: `complete-profile-${field.key.replaceAll(".", "-")}`,
                label: field.label,
                type: field.type,
                value:
                  field.type === "number"
                    ? sanitizeNonNegativeNumberInput(
                        getNestedValue(profileCompletionForm, field.key),
                      )
                    : getNestedValue(profileCompletionForm, field.key),
                onChange: (value) =>
                  updateNestedField(
                    field.key,
                    field.type === "number"
                      ? sanitizeNonNegativeNumberInput(value)
                      : value,
                  ),
                options:
                  field.key === "studying.university"
                    ? [
                        ...new Set([
                          ...getUniversityOptionsForCountry(
                            profileCompletionForm.hometown.Country,
                          ),
                          ...universityOptions,
                        ]),
                      ]
                    : field.options,
              }),
            )}
          </div>,
          // Working section
          <div key="working-section" className="profile-section">
            <h3>Professional (Optional)</h3>
            {completeProfileWorkingFields.map((field) =>
              renderTextField({
                id: `complete-profile-${field.key.replace(".", "-")}`,
                label: field.label,
                type: field.type,
                value: getNestedValue(profileCompletionForm, field.key),
                onChange: (value) => updateNestedField(field.key, value),
              }),
            )}
          </div>,
        ]
      : [];

  return (
    <article
      id="Login_article"
      className={`fc${isClinicalRealityOpen && isWideLoginLayout ? " Login_article--reality-open" : ""}`}
      ref={articleRef}
    >
      <InspectionOverlay
        rootId="Login_article"
        debugClassName="Login_debugBordersOn"
        viewportBadgeId="Login_viewportBadge"
        hoveredBadgeId="Login_hoveredIdBadge"
        copiedBadgeId="Login_copiedIdBadge"
      />
      {!isClinicalRealityOpen && (
        <button
          id="Login_realityToggle"
          type="button"
          aria-label="Show clinical reality note"
          aria-expanded={false}
          onClick={() => {
            if (isWideLoginLayout) {
              setIsClinicalRealityOpen(true);
            }
          }}
        >
          <i className="fas fa-brain"></i>
        </button>
      )}
      <main
        id="Login_main"
        className={`fc${isClinicalRealityOpen ? " Login_main--reality-open" : ""}${authMode === "complete-profile" ? " Login_main--post-signup" : ""}`}
        style={{
          "--login-aligned-block-min-height": `${Math.max(0, alignedBlockMinHeight)}px`,
        }}
      >
        <section
          id="Login_realityPanel"
          className={isClinicalRealityOpen ? "is-open" : ""}
          aria-hidden={!isClinicalRealityOpen}
        >
          <div id="Login_realityPanel_inner" className="fc">
            <div id="Login_realityStickyHeader" className="fc">
              <div id="Login_realityPanel_eyebrowRow" className="fr">
                <button
                  id="Login_realityPanelBackButton"
                  type="button"
                  aria-label="Hide clinical reality note"
                  onClick={() => setIsClinicalRealityOpen(false)}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <p id="Login_realityPanel_eyebrow">
                  How I See The Clinical Reality
                </p>
                <button
                  id="Login_realityToolbarToggle"
                  type="button"
                  aria-label={
                    isRealityToolbarOpen
                      ? "Hide text editing tools"
                      : "Show text editing tools"
                  }
                  aria-expanded={isRealityToolbarOpen}
                  onClick={() =>
                    setIsRealityToolbarOpen((currentValue) => !currentValue)
                  }
                >
                  <i
                    className={
                      isRealityToolbarOpen ? "fas fa-edit" : "far fa-edit"
                    }
                  ></i>
                </button>
              </div>
              <div
                id="Login_realityControls"
                className={`fr${isRealityToolbarOpen ? " is-open" : ""}`}
                aria-hidden={!isRealityToolbarOpen}
              >
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
                  <span>Align</span>
                  <button
                    type="button"
                    className="Login_realityControlButton Login_realityControlButton--align"
                    title="Align left"
                    aria-label="Align left"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyEditorCommand("justifyLeft")}
                  >
                    <i className="fas fa-align-left"></i>
                  </button>
                  <button
                    type="button"
                    className="Login_realityControlButton Login_realityControlButton--align"
                    title="Align center"
                    aria-label="Align center"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyEditorCommand("justifyCenter")}
                  >
                    <i className="fas fa-align-center"></i>
                  </button>
                  <button
                    type="button"
                    className="Login_realityControlButton Login_realityControlButton--align"
                    title="Align right"
                    aria-label="Align right"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyEditorCommand("justifyRight")}
                  >
                    <i className="fas fa-align-right"></i>
                  </button>
                </label>
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
                    className="Login_realityControlButton Login_realityControlButton--pen"
                    title="Apply highlight"
                    aria-label="Apply highlight to selection"
                    disabled={!hasRealitySelection}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={applyHighlightToSelection}
                  >
                    <i
                      className="fas fa-highlighter"
                      style={{ color: editorHighlightColor }}
                    ></i>
                  </button>
                  <button
                    type="button"
                    className={`Login_realityControlButton Login_realityControlButton--erase${isHighlightEraseModeOn ? " is-armed" : ""}`}
                    title="Remove highlight"
                    aria-label="Remove highlight"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setIsHighlightEraseModeOn(
                        (currentValue) => !currentValue,
                      );
                    }}
                  >
                    <i className="fas fa-eraser"></i>
                  </button>
                  <input
                    type="color"
                    value={editorHighlightColor}
                    onMouseDown={(event) => event.preventDefault()}
                    onChange={(event) => {
                      setEditorHighlightColor(event.target.value);
                    }}
                  />
                </label>
                <label className="Login_realityControlField">
                  <span>Size</span>
                  <output
                    className={`Login_realityControlMonitor${hasRealitySelection ? " is-active" : ""}`}
                    aria-live="polite"
                  >
                    {hasRealitySelection && selectedRealityFontSizePt !== null
                      ? `${selectedRealityFontSizePt}pt`
                      : "--"}
                  </output>
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
            <div id="Login_realityBody" className="fr">
              <aside id="Login_summaryPanel" className="fc">
                <div id="Login_summaryPanel_inner" className="fc">
                  <p id="Login_summaryPanel_title">ChatGPT Summary</p>
                  <textarea
                    id="Login_summaryInput"
                    value={summaryInput}
                    placeholder="Paste text here, or leave this empty to summarize the article on the right."
                    onChange={(event) => setSummaryInput(event.target.value)}
                  />
                  <button
                    id="Login_summaryButton"
                    type="button"
                    onClick={summarizeClinicalReality}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? "Summarizing..." : "Summarize"}
                  </button>
                  <div id="Login_summaryOutput" className="fc">
                    {summaryError ? (
                      <p id="Login_summaryError">{summaryError}</p>
                    ) : summaryReply ? (
                      <pre id="Login_summaryReply">{summaryReply}</pre>
                    ) : (
                      <p id="Login_summaryPlaceholder">
                        The summary will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </aside>
              <div id="Login_realityEditorColumn" className="fc">
                <div
                  id="Login_realityEditor"
                  ref={realityEditorRef}
                  className="fc"
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    cursor: isHighlightEraseModeOn
                      ? buildEraserCursor()
                      : "text",
                  }}
                  onInput={(event) => {
                    setClinicalRealityHtml(
                      sanitizeClinicalRealityHtml(
                        event.currentTarget.innerHTML,
                      ),
                    );
                  }}
                  onBlur={(event) => {
                    setClinicalRealityHtml(
                      sanitizeClinicalRealityHtml(
                        event.currentTarget.innerHTML,
                      ),
                    );
                  }}
                  onMouseDown={handleRealityEditorMouseDown}
                  onMouseMove={handleRealityEditorMouseMove}
                  onBeforeInput={handleRealityEditorBeforeInput}
                  onPaste={handleRealityEditorPaste}
                ></div>
              </div>
            </div>
            <p
              id="Login_realitySaveStatus"
              aria-live="polite"
              aria-atomic="true"
            >
              {isClinicalRealitySaving
                ? `Saving ${savingDots}`
                : canPersistClinicalReality
                  ? "Saved"
                  : hasPendingAdminSave
                    ? "SAVED TEMPORARILY: CHANGES ARE WAITING FOR ADMIN TO LOG IN"
                    : "NO CHANGES TO SAVE"}
            </p>
          </div>
        </section>
        <section
          id="Login_brandPanel"
          className={
            isClinicalRealityOpen && isWideLoginLayout
              ? "is-collapsed"
              : authMode === "complete-profile"
                ? "is-collapsed"
                : ""
          }
        >
          <div id="Login_brandContentWrap" className="fc">
            <h1 id="Login_brandWordmark">
              <span className="Login_brandWordmarkFlex">
                <span className="Login_brandMark">H</span>
                <span className="Login_brandDivider" aria-hidden="true">
                  &middot;
                </span>
                <span className="Login_brandName">MCTOS</span>
              </span>
            </h1>
            <h2 id="Login_brandProduct">PhenoMed</h2>
            <h4 id="Login_brandTagline">
              From Clinical-related Phenomena to Diagnosis
            </h4>
          </div>
        </section>
        <section
          id="Login_authPanel"
          className={
            isClinicalRealityOpen && isWideLoginLayout
              ? "is-collapsed"
              : ""
          }
        >
          <section
            id="Login_authCard"
            className="fc"
            ref={loginFormRef}
            style={authFormInlineStyle}
          >
            {authMode === "complete-profile" && (
              <div id="Login_authCardHeader">
                <button
                  id="Login_authBackButton"
                  type="button"
                  onClick={goBackToSignupFromCompleteProfile}
                  aria-label="Back to sign up"
                >
                  <i className="fas fa-arrow-left" />
                </button>
                <h4 id="Login_authFeedback">
                  Account created. Complete your personal information to
                  continue to Home.
                </h4>
              </div>
            )}
            <section
              id="Login_authFields"
              className={`fc${authMode === "complete-profile" ? " is-scrollable" : ""}`}
            >
              {credentialFields}
              {completeProfileFields}
            </section>
            <section id="Login_authActions" className="fc">
              {authMode === "signup" && pendingSignupAuthReport?.token && (
                <div id="Login_authPendingSignupActionsRow">
                  <button
                    id="Login_authEditUsernameButton"
                    type="button"
                    onClick={() => {
                      if (!isPendingSignupUsernameEditable) {
                        setIsPendingSignupUsernameEditable(true);
                        return;
                      }
                      editPendingSignupAuth();
                    }}
                  >
                    {isPendingSignupUsernameEditable ? "Save Edit" : "Edit"}
                  </button>
                  <button
                    id="Login_authContinueToPostSignupButton"
                    type="button"
                    aria-label="Go to post-signup form"
                    title="Go to post-signup form"
                    onClick={() => {
                      setIsPendingSignupUsernameEditable(false);
                      setAuthMode("complete-profile");
                    }}
                  >
                    <i className="fas fa-arrow-right" />
                  </button>
                </div>
              )}
              {authMode === "complete-profile" ? (
                <div className="Login_authSubmitRow">
                  <button
                    id="Login_authSubmitButton"
                    type="button"
                    onClick={authSubmitAction}
                    disabled={isSubmitDisabled}
                  >
                    {authSubmitLabel}
                  </button>
                  <button
                    id="Login_authClearButton"
                    type="button"
                    onClick={() =>
                      setProfileCompletionForm({
                        firstname: "",
                        lastname: "",
                        email: "",
                        phoneCountry: "",
                        phone: "",
                        dob: "",
                        hometown: {
                          Country: "",
                          City: "",
                        },
                        bio: "",
                        studying: {
                          university: "",
                          faculty: "",
                          program: "",
                          programStartYear: "",
                          term: "",
                          time: {
                            totalYears: "",
                            currentAcademicYear: "",
                            startDate: {
                              startYear: "",
                              startTerm: "",
                            },
                            currentDate: {
                              year: "",
                              term: "",
                            },
                          },
                          language: "",
                        },
                        working: {
                          company: "",
                          position: "",
                        },
                        profilePic: {
                          url: "",
                          publicId: "",
                          mimeType: "",
                          width: null,
                          height: null,
                        },
                        viewport: {
                          x: 0,
                          y: 0,
                          zoom: 1,
                          width: null,
                          height: null,
                        },
                      })
                    }
                  >
                    Clear
                  </button>
                </div>
              ) : (
                !isSignupAuthEditMode && (
                  <button
                    id="Login_authSubmitButton"
                    type="button"
                    onClick={authSubmitAction}
                    disabled={isSubmitDisabled}
                  >
                    {authSubmitLabel}
                  </button>
                )
              )}
              {authMode !== "complete-profile" && (
                <nav id="Login_authModeSwitch" aria-label="Authentication mode">
                  <button
                    type="button"
                    className="Login_authModeSwitchButton"
                    onClick={() =>
                      formControl(authMode === "login" ? "signup" : "login")
                    }
                  >
                    {authModeSwitchLabel}
                  </button>
                </nav>
              )}
              {feedbackMessage && authMode !== "complete-profile" && (
                <h4 id="Login_authFeedback">{feedbackMessage}</h4>
              )}
            </section>
          </section>
        </section>
      </main>
      <footer
        id="Login_footer"
        className={
          isClinicalRealityOpen && isWideLoginLayout ? "is-hidden" : ""
        }
        ref={footerRef}
      >
        <div id="Login_footer_left">
          <h4 id="Login_copyright_text">©2020 Rudy Hamame</h4>
        </div>
        <div id="Login_footer_right">
          <p id="Login_poweredBy_text">
            Powered by OpenAI API to support intelligent medical knowledge and
            enquiry experiences.
          </p>
          <p id="Login_lastUpdated_text">
            App last updated: {loginAppLastUpdatedLabel}
          </p>
        </div>
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
