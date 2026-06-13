import React, { useEffect, useRef, useState } from "react";
import "../Login/login.css";
import { apiUrl } from "../config/api";
import InspectionOverlay from "../debug/InspectionOverlay";
import {
  logoutStoredSession,
  readStoredSession,
  writeStoredSession,
} from "../utils/sessionCleanup";
import { stopSharedPlannerMusic } from "../music/globalMusicPlayer";
import { normalizeUserPayload } from "../utils/normalizeUser";

const LOGIN_KEYBOARD_OPEN_THRESHOLD = 120;
const LOGIN_KEYBOARD_SCROLL_MARGIN = 20;

const isEditableFormElement = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = String(element.tagName || "").toLowerCase();
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (tagName !== "input") {
    return false;
  }

  const inputType = String(element.getAttribute("type") || "text").toLowerCase();
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(
    inputType,
  );
};
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
const LOGIN_APP_LAST_UPDATED_CACHE_KEY = "login_app_last_updated_payload";
const LOGIN_HOMETOWN_CITIES_CACHE_KEY = "login_hometown_cities_payload";

const readSessionJson = (key, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.sessionStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
};

const writeSessionJson = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
};

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

const studyYearNumberOptions = Array.from({ length: 31 }, (_, index) =>
  String(2030 - index),
);
const studyYearIntervalOptions = studyYearNumberOptions
  .map((yearValue) => Number(yearValue))
  .filter(Number.isFinite)
  .map((yearValue) => `${yearValue}-${yearValue + 1}`);
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
const studyComponentsClassOptions = [
  "Class",
  "Lab",
  "Clinical Rotations",
  "Pharmacy",
];

const completeProfileCoreFields = [
  {
    key: "firstname",
    label: "First name",
    type: "text",
    required: true,
  },
  {
    key: "lastname",
    label: "Last name",
    type: "text",
    required: true,
  },
  {
    key: "email",
    label: "Email address",
    type: "email",
    required: false,
  },
  {
    key: "phoneCountry",
    label: "Phone country",
    type: "select",
    options: countryOptions,
    required: false,
  },
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
    required: false,
  },
  {
    key: "dob",
    label: "Date of birth",
    type: "date",
    required: false,
  },
  {
    key: "hometown.Country",
    label: "Country",
    type: "select",
    options: countryOptions,
    required: false,
  },
  {
    key: "hometown.City",
    label: "City",
    type: "select",
    options: [],
    required: false,
  },
];

const completeProfileStudentFields = [
  {
    key: "studying.university",
    label: "University",
    type: "select",
    options: [], // Will be populated dynamically
    required: true,
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
    required: true,
  },
  {
    key: "studying.language",
    label: "Language of study",
    type: "select",
    options: studyLanguageOptions,
  },
  {
    key: "studying.componentsClass",
    label: "Component class",
    type: "select",
    options: studyComponentsClassOptions,
  },
];

const completeProfileWorkingFields = [
  {
    key: "working.company",
    label: "Company",
    type: "text",
    required: true,
  },
  {
    key: "working.position",
    label: "Position",
    type: "text",
    required: true,
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

const createEmptyProfileCompletionForm = () => ({
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
      totalYearsNum: "",
      start: {
        programYearInterval: "",
        programTerm: "",
      },
      current: {
        programYearNum: "",
        programYearInterval: "",
        programTerm: "",
      },
    },
    language: "",
    componentsClass: [],
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

const Login = ({ onLogin, onForceLogout }) => {
  const VIDEO_GATE_SESSION_KEY = "videoGateUnlockedKey";
  const articleRef = useRef(null);
  const footerRef = useRef(null);
  const loginFormRef = useRef(null);
  const authFieldsRef = useRef(null);
  const previousAuthFormRectRef = useRef(null);
  const authFormAnimationFrameRef = useRef(null);
  const authFormAnimationTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const videoGateKeyRef = useRef("");
  const brandVideoRef = useRef(null);
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
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [videoGateRequiresVerification, setVideoGateRequiresVerification] =
    useState(true);
  const [videoGateForm, setVideoGateForm] = useState({ companyName: "", password: "" });
  const [videoGateError, setVideoGateError] = useState("");
  const [videoGatePending, setVideoGatePending] = useState(false);
  const [brandVideoAutoplayBlocked, setBrandVideoAutoplayBlocked] = useState(false);
  const [pendingSignupAuthReport, setPendingSignupAuthReport] = useState(null);
  const [isPendingSignupUsernameEditable, setIsPendingSignupUsernameEditable] =
    useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    username: "",
    password: "",
  });
  const [profileCompletionForm, setProfileCompletionForm] = useState(
    createEmptyProfileCompletionForm(),
  );
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(false);
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [zoomScale, setZoomScale] = useState(window.visualViewport?.scale || 1);
  const [loginAppLastUpdatedLabel, setLoginAppLastUpdatedLabel] = useState(
    loginAppLastUpdatedFallbackLabel,
  );
  const [universityOptions, setUniversityOptions] = useState([]);
  const isVisitorVideoReady = !videoGateRequiresVerification || videoUnlocked;
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

  const runIfMounted = (callback) => {
    if (isMountedRef.current) {
      callback();
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const video = brandVideoRef.current;
    if (!video || !isVisitorVideoReady) {
      setBrandVideoAutoplayBlocked(false);
      return undefined;
    }

    let cancelled = false;
    const tryStartVideo = async () => {
      try {
        const playResult = video.play();
        if (playResult && typeof playResult.then === "function") {
          await playResult;
        }
        if (!cancelled) {
          setBrandVideoAutoplayBlocked(false);
        }
      } catch {
        if (!cancelled) {
          setBrandVideoAutoplayBlocked(true);
        }
      }
    };

    const rafId = window.requestAnimationFrame(() => {
      void tryStartVideo();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [isVisitorVideoReady]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const cachedPayload = readSessionJson(LOGIN_APP_LAST_UPDATED_CACHE_KEY, null);

    if (cachedPayload?.committedAt) {
      setLoginAppLastUpdatedLabel(
        formatAppLastUpdatedLabel(cachedPayload.committedAt),
      );
    }

    fetch(apiUrl("/api/user/app-last-updated"), {
      signal: controller.signal,
    })
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        if (payload?.committedAt) {
          writeSessionJson(LOGIN_APP_LAST_UPDATED_CACHE_KEY, payload);
          setLoginAppLastUpdatedLabel(
            formatAppLastUpdatedLabel(payload.committedAt),
          );
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetch(apiUrl("/api/user/video-gate/public"), {
      signal: controller.signal,
    })
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        const enabled = payload?.videoGate?.enabled === true;
        const configured = payload?.videoGate?.configured === true;
        const gateKey = String(payload?.videoGate?.gateKey || "");
        const visitorUnlocked = payload?.videoGate?.visitorUnlocked === true;

        videoGateKeyRef.current = gateKey;

        if (enabled || !configured) {
          // Gate ON = public (or not configured): video is open to all.
          sessionStorage.removeItem(VIDEO_GATE_SESSION_KEY);
          setVideoGateRequiresVerification(false);
          setVideoUnlocked(true);
          return;
        }

        // Gate OFF and configured: restricted to allowed visitors.
        setVideoGateRequiresVerification(true);
        setVideoUnlocked(
          visitorUnlocked ||
            sessionStorage.getItem(VIDEO_GATE_SESSION_KEY) === gateKey,
        );
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        videoGateKeyRef.current = "";
        setVideoGateRequiresVerification(true);
        setVideoUnlocked(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

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
      stopSharedPlannerMusic({ resetPlaylist: true, resetSnapshot: true });
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
    if (!articleRef.current) {
      return;
    }

    articleRef.current.style.setProperty(
      "--login-keyboard-inset",
      `${Math.max(0, keyboardInset)}px`,
    );
  }, [keyboardInset]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const scrollFocusedFieldIntoView = () => {
      const scroller = authFieldsRef.current;
      const activeElement = document.activeElement;

      if (!scroller || !(activeElement instanceof HTMLElement)) {
        return;
      }

      if (!scroller.contains(activeElement)) {
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const fieldRect = activeElement.getBoundingClientRect();
      const visibleTop = scrollerRect.top + LOGIN_KEYBOARD_SCROLL_MARGIN;
      const visibleBottom =
        scrollerRect.bottom -
        Math.max(
          LOGIN_KEYBOARD_SCROLL_MARGIN,
          keyboardInset + LOGIN_KEYBOARD_SCROLL_MARGIN,
        );

      if (fieldRect.bottom > visibleBottom) {
        scroller.scrollTop += fieldRect.bottom - visibleBottom;
      } else if (fieldRect.top < visibleTop) {
        scroller.scrollTop -= visibleTop - fieldRect.top;
      }
    };

    const updateKeyboardInset = () => {
      const articleElement = articleRef.current;
      const activeElement = document.activeElement;
      const visualViewport = window.visualViewport;
      const keyboardLoss = Math.max(
        0,
        Math.round(
          (window.innerHeight || 0) -
            Number(visualViewport?.height || window.innerHeight || 0),
        ),
      );
      const shouldTreatAsKeyboard =
        Boolean(articleElement) &&
        articleElement.contains(activeElement) &&
        isEditableFormElement(activeElement) &&
        keyboardLoss > LOGIN_KEYBOARD_OPEN_THRESHOLD;

      setKeyboardInset(shouldTreatAsKeyboard ? keyboardLoss : 0);

      if (shouldTreatAsKeyboard) {
        window.requestAnimationFrame(() => {
          scrollFocusedFieldIntoView();
        });
      }
    };

    const handleFocusChange = () => {
      updateKeyboardInset();
      window.requestAnimationFrame(() => {
        scrollFocusedFieldIntoView();
      });
    };

    window.addEventListener("resize", updateKeyboardInset);
    window.addEventListener("focusin", handleFocusChange);
    window.addEventListener("focusout", handleFocusChange);
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();

    return () => {
      window.removeEventListener("resize", updateKeyboardInset);
      window.removeEventListener("focusin", handleFocusChange);
      window.removeEventListener("focusout", handleFocusChange);
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
    };
  }, [keyboardInset]);

  useEffect(() => {
    // Legacy backend source (kept as a supplemental fallback list).
    let ignoreUniversityOptions = false;
    const controller = new AbortController();
    const cachedPayload = readSessionJson(LOGIN_HOMETOWN_CITIES_CACHE_KEY, null);

    if (
      cachedPayload?.cities &&
      Array.isArray(cachedPayload.cities) &&
      cachedPayload.cities.length > 0
    ) {
      setUniversityOptions(cachedPayload.cities);
    }

    fetch(apiUrl("/api/user/hometown-cities"), {
      signal: controller.signal,
    })
      .then((response) => response.json().catch(() => ({ cities: [] })))
      .then((payload) => {
        if (
          !ignoreUniversityOptions &&
          payload.cities &&
          Array.isArray(payload.cities)
        ) {
          writeSessionJson(LOGIN_HOMETOWN_CITIES_CACHE_KEY, payload);
          setUniversityOptions(payload.cities);
        }
      })
      .catch(() => {
        // If fetching fails, set empty options
        if (!ignoreUniversityOptions) {
          setUniversityOptions([]);
        }
      });

    return () => {
      ignoreUniversityOptions = true;
      controller.abort();
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
      setProfileCompletionForm(createEmptyProfileCompletionForm());
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
        if (
          !current[keys[i]] ||
          typeof current[keys[i]] !== "object" ||
          Array.isArray(current[keys[i]])
        ) {
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
    required = false,
  }) => {
    const isPasswordField = type === "password";
    const resolvedType = isPasswordField && isPasswordVisible ? "text" : type;

    if (type === "select") {
      return (
        <label className="Login_authField" htmlFor={id} key={id}>
          <span className="Login_authFieldLabel">
            {label}
            {required ? " *" : ""}
          </span>
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
        <span className="Login_authFieldLabel">
          {label}
          {required ? " *" : ""}
        </span>
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
  }, [authMode]);

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

  const submitVideoGate = async (e) => {
    e.preventDefault();
    const companyName = videoGateForm.companyName.trim();
    const password = videoGateForm.password.trim();
    if (!companyName || !password) {
      setVideoGateError("Please fill in both fields.");
      return;
    }
    setVideoGatePending(true);
    setVideoGateError("");
    try {
      const res = await fetch(apiUrl("/api/user/video-gate/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified) {
        setVideoGateError(data?.message || "Invalid credentials.");
        return;
      }
      if (videoGateKeyRef.current) {
        sessionStorage.setItem(VIDEO_GATE_SESSION_KEY, videoGateKeyRef.current);
      }
      setVideoUnlocked(true);
    } catch {
      setVideoGateError("Unable to verify. Please try again.");
    } finally {
      setVideoGatePending(false);
    }
  };

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
            const normalizedPendingUser = normalizeUserPayload(payload.user, {
              token: payload.token,
              isLoggedIn: true,
            });

            if (
              String(normalizedPendingUser?.firstname || "").trim() &&
              String(normalizedPendingUser?.lastname || "").trim()
            ) {
              login = true;
              return payload;
            }

            // Profile completion required - redirect to post-signup form
            runIfMounted(() => {
              setPendingSignupAuthReport({
                token: payload.token,
                user: payload.user,
              });
              setIsPendingSignupUsernameEditable(false);
              setAuthMode("complete-profile");
              setLoginMessage("Please complete your profile to continue.");
              setIs_loading(false);
            });
            return null;
          }

          if (response.status === 401) {
            runIfMounted(() => {
              setLoginMessage(
                "The password you entered is not correct, please try again",
              );
              setLogin_ok(false);
              setIs_loading(false);
            });
            return payload;
          }

          throw new Error(
            payload?.message ||
              "The backend request failed or the API server is not responding at the configured URL.",
          );
        })
        .then((userdata) => {
          if (userdata && login === true) {
            const nextAuthReport = normalizeUserPayload(userdata.user, {
              token: userdata.token,
              isLoggedIn: true,
            });

            runIfMounted(() => {
              setAuthReport(nextAuthReport);
              setLoginMessage(null);
              setLogin_ok(true);
            });
          } else {
            runIfMounted(() => {
              setLoginMessage(
                "The password you entered is not correct, please try again",
              );
              setLogin_ok(false);
              setIs_loading(false);
            });
          }
        })
        .catch(() => {
          runIfMounted(() => {
            setLoginMessage(
              "The backend request failed or the API server is not responding at the configured URL.",
            );
            setLogin_ok(false);
            setIs_loading(false);
          });
        });
    } else {
      setLoginMessage(
        "The password you entered is not correct, please try again",
      );
      setLogin_ok(false);
      setIs_loading(false);
    }
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
            isLoggedIn: true,
          });

          if (loginFormRef.current) {
            const formRect = loginFormRef.current.getBoundingClientRect();
            previousAuthFormRectRef.current = {
              width: formRect.width,
              height: formRect.height,
            };
          }

          runIfMounted(() => {
            setPendingSignupAuthReport(nextPendingAuthReport);
            setIsPendingSignupUsernameEditable(false);
            setSignup_ok(true);
            setSignupMessage(
              data.message ||
                "Account created. Complete your profile to continue.",
            );
            setAuthMode("complete-profile");
          });
        })
        .catch((err) => {
          runIfMounted(() => {
            setSignup_ok(false);
            setSignupMessage(err.message);
          });
        })
        .finally(() => {
          runIfMounted(() => {
            setIs_loading(false);
          });
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
      studying,
      working,
    } = profileCompletionForm;

    if (
      !firstname.trim() ||
      !lastname.trim()
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
        !String(studying?.time?.start?.programYearInterval || "").trim() ||
        !String(studying?.time?.start?.programTerm || "").trim() ||
        !String(studying?.time?.current?.programYearNum || "").trim() ||
        !String(studying?.time?.current?.programYearInterval || "").trim() ||
        !String(studying?.time?.current?.programTerm || "").trim()
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
        dob: String(dob || "").trim() ? dob : null,
        hometown,
        studying: isStudying
          ? {
              ...studying,
              componentsClass: Array.from(
                new Set(
                  (Array.isArray(studying?.componentsClass)
                    ? studying.componentsClass
                    : [studying?.componentsClass]
                  )
                    .map((entry) => String(entry || "").trim())
                    .filter(Boolean),
                ),
              ),
            }
          : undefined,
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
          isLoggedIn: true,
        });

        runIfMounted(() => {
          setAuthReport(nextAuthReport);
          setLogin_ok(true);
          setLoginMessage(null);
          setSignup_ok(true);
          setSignupMessage(
            data.message || "Profile completed successfully. Redirecting...",
          );
        });
      })
      .catch((error) => {
        runIfMounted(() => {
          setSignup_ok(false);
          setSignupMessage(error.message);
        });
      })
      .finally(() => {
        runIfMounted(() => {
          setIs_loading(false);
        });
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
        runIfMounted(() => {
          setPendingSignupAuthReport((current) => ({
            ...(current || {}),
            user: data.user,
          }));
          setIsPendingSignupUsernameEditable(false);
          setSignup_ok(true);
          setSignupMessage("Credentials updated. Continue profile completion.");
          setAuthMode("complete-profile");
        });
      })
      .catch((error) => {
        runIfMounted(() => {
          setSignup_ok(false);
          setSignupMessage(error.message);
        });
      })
      .finally(() => {
        runIfMounted(() => {
          setIs_loading(false);
        });
      });
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
  const isProfileCompletionStudyingStarted = Boolean(
    profileCompletionForm.studying.university.trim() ||
      profileCompletionForm.studying.program.trim(),
  );
  const isProfileCompletionWorkingStarted = Boolean(
    profileCompletionForm.working.company.trim() ||
      profileCompletionForm.working.position.trim(),
  );

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
        studying,
        working,
      } = profileCompletionForm;
      if (
        !firstname.trim() ||
        !lastname.trim()
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
          !String(studying?.time?.start?.programYearInterval || "").trim() ||
          !String(studying?.time?.start?.programTerm || "").trim() ||
          !String(studying?.time?.current?.programYearNum || "").trim() ||
          !String(studying?.time?.current?.programYearInterval || "").trim() ||
          !String(studying?.time?.current?.programTerm || "").trim()
        );
      }
      if (isWorking) {
        return !working.company.trim() || !working.position.trim();
      }
      return false;
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
              required: Boolean(field.required),
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
                required:
                  Boolean(field.required) &&
                  isProfileCompletionWorkingStarted,
              }),
            )}
          </div>,
        ]
      : [];

  return (
    <article
      id="Login_article"
      className="fc"
      ref={articleRef}
    >
      <InspectionOverlay
        rootId="Login_article"
        debugClassName="Login_debugBordersOn"
        viewportBadgeId="Login_viewportBadge"
        hoveredBadgeId="Login_hoveredIdBadge"
        copiedBadgeId="Login_copiedIdBadge"
      />
      <main
        id="Login_main"
        className={`fc${authMode === "complete-profile" ? " Login_main--post-signup" : ""}`}
        style={{
          "--login-aligned-block-min-height": `${Math.max(0, alignedBlockMinHeight)}px`,
        }}
      >
        <section
          id="Login_brandPanel"
          className={authMode === "complete-profile" ? "is-collapsed" : ""}
        >
          <div id="Login_brandContentWrap" className="fc">
            <h1 id="Login_brandWordmark">
              <span className="Login_brandWordmarkFlex">
                <span className="Login_brandName">MCTOS|H</span>
              </span>
            </h1>
            <h2 id="Login_brandProduct">PhenoMed</h2>
            <h4 id="Login_brandTagline">
              From Clinical-related Phenomena to Diagnosis
            </h4>
            <div id="Login_brandVideoWrap" className={videoUnlocked ? "Login_brandVideoWrap--unlocked" : ""}>
              <video
                id="Login_brandVideo"
                ref={brandVideoRef}
                controls
                preload="auto"
                playsInline
                onPlay={() => setBrandVideoAutoplayBlocked(false)}
              >
                <source
                  src="https://res.cloudinary.com/dtoxkii3q/video/upload/v1781323258/copy_DBC85EC1-1520-4CBA-AF16-B27EB6DE8979_qvcziy.mp4"
                  type="video/mp4"
                />
              </video>
              {isVisitorVideoReady && brandVideoAutoplayBlocked && (
                <div className="Login_brandVideoFallback">
                  <p className="Login_brandVideoFallbackText">
                    Your browser blocked autoplay with sound.
                  </p>
                  <button
                    type="button"
                    className="Login_brandVideoFallbackButton"
                    onClick={() => {
                      const video = brandVideoRef.current;
                      if (!video) {
                        return;
                      }
                      video.muted = false;
                      video.volume = 1;
                      const playResult = video.play();
                      if (playResult && typeof playResult.catch === "function") {
                        playResult.catch(() => setBrandVideoAutoplayBlocked(true));
                      }
                    }}
                  >
                    Play with sound
                  </button>
                </div>
              )}
              {videoGateRequiresVerification && !videoUnlocked && (
                <form
                  id="Login_videoGateOverlay"
                  onSubmit={submitVideoGate}
                  noValidate
                >
                  <p id="Login_videoGateTitle">Members only</p>
                  <input
                    className="Login_videoGateInput"
                    type="text"
                    placeholder="Company name"
                    autoComplete="organization"
                    value={videoGateForm.companyName}
                    onChange={(e) => setVideoGateForm((f) => ({ ...f, companyName: e.target.value }))}
                    disabled={videoGatePending}
                  />
                  <input
                    className="Login_videoGateInput"
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={videoGateForm.password}
                    onChange={(e) => setVideoGateForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={videoGatePending}
                  />
                  {videoGateError && (
                    <p className="Login_videoGateError">{videoGateError}</p>
                  )}
                  <button
                    id="Login_videoGateSubmit"
                    type="submit"
                    disabled={videoGatePending}
                  >
                    {videoGatePending ? "Verifying…" : "Unlock"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
        <section
          id="Login_authPanel"
          className={keyboardInset > 0 ? "Login_authPanel--keyboardOpen" : ""}
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
              ref={authFieldsRef}
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
                      setProfileCompletionForm(createEmptyProfileCompletionForm())
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
              <p id="Login_authDemoNote">
                If you’d like to try the app right away, you can sign in with
                the demo account below:
                <br />
                <strong>Username:</strong> test
                <br />
                <strong>Password:</strong> test
                <br />
                You’re also welcome to create your own account anytime and
                enjoy the full experience with your own saved data.
              </p>
              {feedbackMessage && authMode !== "complete-profile" && (
                <h4 id="Login_authFeedback">{feedbackMessage}</h4>
              )}
            </section>
          </section>
        </section>
      </main>
      <footer
        id="Login_footer"
        className={keyboardInset > 0 ? "is-hidden" : ""}
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
