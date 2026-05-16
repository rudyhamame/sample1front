import React, { useEffect, useRef, useState } from "react";
import NogaPlannerSettings from "./NogaPlannerSettings";
import { apiUrl } from "../../config/api";
import "../../telegramControlPage.css";

const NogaPlannerSavedCoursesPanel = ({ planner, runtime }) => {
  const [coursesMiniBarActionsLeft, setCoursesMiniBarActionsLeft] =
    useState("50%");
  const [isMiniBarActionsVisible, setIsMiniBarActionsVisible] = useState(false);
  const [logoClockPosition, setLogoClockPosition] = useState("9");
  const [logoAssetsReady, setLogoAssetsReady] = useState(false);
  const [noAttendanceForComponent, setNoAttendanceForComponent] = useState(false);
  const [hoveredCourseGroupKey, setHoveredCourseGroupKey] = useState("");
  const [telegramChatOpen, setTelegramChatOpen] = useState(false);
  const [telegramStoredGroups, setTelegramStoredGroups] = useState([]);
  const [telegramSelectedGroupReference, setTelegramSelectedGroupReference] =
    useState("");
  const [telegramSearchQuery, setTelegramSearchQuery] = useState("");
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramChatLoading, setTelegramChatLoading] = useState(false);
  const [telegramChatError, setTelegramChatError] = useState("");
  const [telegramChatFrame, setTelegramChatFrame] = useState({
    top: 84,
    right: 16,
    width: 480,
    height: 620,
    zIndex: 28,
  });
  const telegramChatFrameRef = useRef({
    top: 84,
    right: 16,
    width: 480,
    height: 620,
    zIndex: 28,
  });
  const telegramChatDragRef = useRef(null);
  const telegramChatResizeRef = useRef(null);
  const telegramChatZCounterRef = useRef(28);
  const logoImageRef = useRef(null);
  const coursesMiniBarTabsRef = useRef(null);
  const previousWrapperTabRef = useRef(String(planner.state?.wrapperTab || ""));
  const savedCoursesWorkspacePointerRafRef = useRef(0);
  const logoClockPositionRef = useRef("9");
  const savedCoursesWorkspacePointerStateRef = useRef({
    active: false,
    targetX: 0.5,
    targetY: 0.5,
    currentX: 0.5,
    currentY: 0.5,
  });
  const {
    formatPlannerStatusLabel,
    formatSavedCourseTitle,
    splitCourseTextList,
    buildSavedCourseComponentEntryFromDraft,
    normalizeAcademicYearValue,
    formatCourseLocationDisplay,
    formatAcademicTermDisplay,
    HOUR_OPTIONS,
    TERM_OPTIONS,
    SAVED_COMPONENT_CLASS_OPTIONS,
    ACADEMIC_YEAR_OPTIONS,
    buildDefaultPlannerWeekdayOptions,
    PLANNER_COURSE_UI,
    getPlannerDefaultFieldsForForm,
    NOGAPLANNER_TEXT,
  } = runtime;
  const SAVED_TEXT = NOGAPLANNER_TEXT.savedCourses;
  const WRAPPER_TABS = [
    {
      key: "courses",
      label: NOGAPLANNER_TEXT.savedCourses.coursesTitle,
      icon: "fi fi-rr-lesson",
    },
    {
      key: "lectures",
      label: NOGAPLANNER_TEXT.savedCourses.lecturesTitle,
      icon: "fi fi-rc-leader-speech",
    },
    {
      key: "exams",
      label: NOGAPLANNER_TEXT.examBoard.tabExams,
      icon: "fi fi-rr-test",
    },
    {
      key: "settings",
      label: SAVED_TEXT.plannerSettings,
      icon: "fi fi-rr-holding-hand-gear",
    },
  ];
  const LOGO_BY_CLOCK_POSITION = {
    "12": "/img/NP12.png",
    "1": "/img/NP1.png",
    "2": "/img/NP2.png",
    "3": "/img/NP3.png",
    "4": "/img/NP4.png",
    "5": "/img/NP5.png",
    "6": "/img/NP6.png",
    "7": "/img/NP7.png",
    "8": "/img/NP8.png",
    "9": "/img/NP9.png",
    "11": "/img/NP11.png",
    "10": "/img/NP10.png",
  };
  const setLogoClockPositionImmediate = (nextClockBucket) => {
    const normalizedClockBucket = String(nextClockBucket || "").trim();
    const nextLogoSource =
      LOGO_BY_CLOCK_POSITION[normalizedClockBucket] || "/img/NP9.png";
    if (
      logoAssetsReady &&
      logoImageRef.current?.getAttribute("src") !== nextLogoSource
    ) {
      logoImageRef.current?.setAttribute("src", nextLogoSource);
    }
    if (logoClockPositionRef.current !== normalizedClockBucket) {
      logoClockPositionRef.current = normalizedClockBucket;
      setLogoClockPosition(normalizedClockBucket);
    }
  };

  const savedCourses = Array.isArray(planner.state?.courses)
    ? planner.state.courses
    : [];
  const {
    plannerTab,
    plannerSettingsVisible,
    plannerSelectSettings,
    savedCourseEditorVisible,
    savedCourseEditorMode,
    savedCourseDraft,
    savedCourseComponentDraftActive,
    selectedSavedCourseDraftComponentIndex,
    savedCourseSelectionMode,
    deleteSelectionMode,
    selectedSavedCourseIds,
    selectedCourseForLecturesId,
    savedCourseDetailsComponentId,
    savedCourseSortKey,
    savedCourseSortDirection,
    savedCoursesColumnHeaderWidth,
    plannerSettingsLogoMotionEnabled,
    plannerSettingsLogoFixedClock,
    inlineLectureRowVisible,
  } = planner.state;

  const componentClassOptions = Array.isArray(
    plannerSelectSettings?.componentClassOptions,
  )
    ? plannerSelectSettings.componentClassOptions
    : SAVED_COMPONENT_CLASS_OPTIONS;
  const weekdayOptions = Array.isArray(plannerSelectSettings?.weekdayOptions)
    ? plannerSelectSettings.weekdayOptions
    : buildDefaultPlannerWeekdayOptions();
  const hourOptions = Array.isArray(plannerSelectSettings?.hourOptions)
    ? plannerSelectSettings.hourOptions
    : [...HOUR_OPTIONS];
  const savedCourseLockedFields =
    planner.getLockedSavedCourseDraftFields(savedCourseDraft);
  const hasSelectedComponentType = Boolean(
    String(
      savedCourseDraft?.course_classSelection ||
        savedCourseDraft?.course_class ||
        "",
    ).trim(),
  );

  const selectedIds = Array.isArray(selectedSavedCourseIds)
    ? selectedSavedCourseIds
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const selectedComponentId = String(selectedCourseForLecturesId || "").trim();
  const selectedDetailsComponent = String(
    savedCourseDetailsComponentId || "",
  ).trim();
  const hasSelectedExam = Boolean(
    String(planner.state?.selected_course_id || "").trim() &&
      Number(planner.state?.selected_exam_index) >= 0,
  );
  const lectureSelectionIds = Array.isArray(planner.state?.deleteSelectionIds)
    ? planner.state.deleteSelectionIds
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const getCourseNameGroupKey = (course = {}) =>
    String(course?.course_name || "").trim().toLowerCase();
  const isLecturesTab = plannerTab === "lectures";
  const isCoursesTab = plannerTab === "courses";
  const isSettingsTab = String(planner.state?.wrapperTab || "").trim() === "settings";
  const hasActivePlannerTab =
    isCoursesTab ||
    isLecturesTab ||
    planner.state?.wrapperTab === "exams" ||
    isSettingsTab;
  const activeWorkspaceTabTitle = isCoursesTab
    ? SAVED_TEXT.coursesTitle
    : isLecturesTab
      ? SAVED_TEXT.lecturesTitle
      : planner.state?.wrapperTab === "exams"
        ? NOGAPLANNER_TEXT.examBoard.tabExams
        : "";
  const messageFriendSettings = planner.state?.plannerSelectSettings?.messageFriend;
  const plannerToken = String(planner?.props?.state?.token || "").trim();
  const normalizeFriendId = (value) => {
    if (!value) {
      return "";
    }
    if (typeof value === "object") {
      return String(value?._id || value?.id || "").trim();
    }
    return String(value || "").trim();
  };
  const myUserId = String(planner?.props?.state?.my_id || "").trim();
  const friends = Array.isArray(planner?.props?.state?.friends)
    ? planner.props.state.friends
    : [];
  const messageFromFriendId = String(
    messageFriendSettings?.from?.friendID || "",
  ).trim();
  const messageFromFriendText = (() => {
    const selectedFriend = friends.find((entry) => {
      const candidateId = String(
        entry?._id || entry?.id || entry?.user?._id || entry?.user?.id || "",
      ).trim();
      return candidateId && candidateId === messageFromFriendId;
    });
    const friendSettings =
      selectedFriend?.memory?.studyPlanner?.studyOrganizer?.settings ||
      selectedFriend?.memory?.MOI?.studyPlanner?.studyOrganizer?.settings ||
      selectedFriend?.settings ||
      selectedFriend?.user?.memory?.studyPlanner?.studyOrganizer?.settings ||
      selectedFriend?.user?.memory?.MOI?.studyPlanner?.studyOrganizer?.settings ||
      {};
    const friendOutgoingList = Array.isArray(friendSettings?.messageFriend?.to)
      ? friendSettings.messageFriend.to
      : [];
    const matchedIncoming = friendOutgoingList.find(
      (entry) =>
        normalizeFriendId(entry?.friendID) === myUserId &&
        String(entry?.message || "").trim(),
    );
    if (matchedIncoming) {
      return String(matchedIncoming?.message || "").trim();
    }
    const outgoingList = Array.isArray(messageFriendSettings?.to)
      ? messageFriendSettings.to
      : [];
    const matchedOutgoing = outgoingList.find(
      (entry) => normalizeFriendId(entry?.friendID) === messageFromFriendId,
    );
    if (matchedOutgoing) {
      return String(matchedOutgoing?.message || "").trim();
    }
    return String(messageFriendSettings?.from?.message || "").trim();
  })();
  const showCourseEditor = isCoursesTab && savedCourseEditorVisible;
  const shouldShowSelectedCourseLectures =
    isLecturesTab && !savedCourseSelectionMode;
  const isLogoMotionListenerEnabled = Boolean(plannerSettingsLogoMotionEnabled);
  const fixedLogoClockPosition = String(plannerSettingsLogoFixedClock || "9").trim();
  const scheduleDisabledForComponent =
    noAttendanceForComponent || !hasSelectedComponentType;
  const componentFieldsIdle = !Boolean(savedCourseComponentDraftActive);
  const courseCoreFieldsReady = Boolean(
    String(savedCourseDraft?.course_name || "").trim() &&
      String(savedCourseDraft?.course_code || "").trim() &&
      String(savedCourseDraft?.course_status || "").trim() &&
      String(savedCourseDraft?.course_totalWeight || "").trim(),
  );
  const showComponentSaveCancelActions =
    Boolean(savedCourseComponentDraftActive) && hasSelectedComponentType;
  const hasPendingUnsavedComponentDraft = Boolean(savedCourseComponentDraftActive);
  const syncTelegramChatFrame = (nextFrame) => {
    telegramChatFrameRef.current = nextFrame;
    setTelegramChatFrame(nextFrame);
  };
  const bringTelegramChatToFront = () => {
    telegramChatZCounterRef.current += 1;
    const nextFrame = {
      ...telegramChatFrameRef.current,
      zIndex: telegramChatZCounterRef.current,
    };
    syncTelegramChatFrame(nextFrame);
  };
  const formatStoredGroupOptionLabel = (group = {}) => {
    const title = String(group?.title || "").trim();
    const reference = String(
      group?.groupReference || group?.reference || group?.username || "",
    ).trim();
    if (title && reference) {
      return `${title} (${reference})`;
    }
    return title || reference || "Telegram group";
  };

  const formatTelegramMessageDate = (value) => {
    const nextDate = value ? new Date(value) : null;
    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return "";
    }
    return nextDate.toLocaleString();
  };

  const fetchTelegramStoredGroups = async () => {
    if (!plannerToken) {
      setTelegramChatError("Telegram login token is missing.");
      setTelegramStoredGroups([]);
      return [];
    }
    try {
      const response = await fetch(apiUrl("/api/telegram/stored-groups"), {
        headers: {
          Authorization: `Bearer ${plannerToken}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram groups.");
      }
      const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
      setTelegramStoredGroups(nextGroups);
      setTelegramSelectedGroupReference((currentValue) => {
        const currentRef = String(currentValue || "").trim();
        if (
          currentRef &&
          nextGroups.some(
            (group) =>
              String(group?.groupReference || "").trim() === currentRef,
          )
        ) {
          return currentValue;
        }
        return String(nextGroups[0]?.groupReference || "");
      });
      return nextGroups;
    } catch (nextError) {
      setTelegramStoredGroups([]);
      setTelegramChatError(
        nextError?.message || "Unable to load Telegram groups.",
      );
      return [];
    }
  };

  const searchTelegramStoredMessages = async (groupReferenceOverride = "") => {
    const groupReference = String(
      groupReferenceOverride || telegramSelectedGroupReference || "",
    ).trim();
    if (!plannerToken) {
      setTelegramChatError("Telegram login token is missing.");
      return;
    }
    if (!groupReference) {
      setTelegramMessages([]);
      setTelegramChatError("Choose a stored group first.");
      return;
    }
    setTelegramChatLoading(true);
    setTelegramChatError("");
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", "120");
      searchParams.set("offset", "0");
      searchParams.set("group", groupReference);
      if (String(telegramSearchQuery || "").trim()) {
        searchParams.set("q", String(telegramSearchQuery).trim());
      }
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${plannerToken}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram messages.");
      }
      setTelegramMessages(Array.isArray(payload?.messages) ? payload.messages : []);
    } catch (nextError) {
      setTelegramMessages([]);
      setTelegramChatError(
        nextError?.message || "Unable to load Telegram messages.",
      );
    } finally {
      setTelegramChatLoading(false);
    }
  };

  useEffect(() => {
    setNoAttendanceForComponent(false);
  }, [selectedSavedCourseDraftComponentIndex, hasSelectedComponentType]);

  useEffect(() => {
    if (!telegramChatOpen) {
      return;
    }
    fetchTelegramStoredGroups();
  }, [telegramChatOpen]);

  useEffect(() => {
    if (!telegramChatOpen) {
      return;
    }
    if (!String(telegramSelectedGroupReference || "").trim()) {
      setTelegramMessages([]);
      return;
    }
    searchTelegramStoredMessages(telegramSelectedGroupReference);
  }, [telegramChatOpen, telegramSelectedGroupReference]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const dragState = telegramChatDragRef.current;
      if (dragState) {
        const nextTop = Math.max(20, dragState.startTop + (event.clientY - dragState.startY));
        const nextRight = Math.max(8, dragState.startRight - (event.clientX - dragState.startX));
        syncTelegramChatFrame({
          ...telegramChatFrameRef.current,
          top: Math.round(nextTop),
          right: Math.round(nextRight),
        });
        return;
      }
      const resizeState = telegramChatResizeRef.current;
      if (!resizeState) {
        return;
      }
      const nextWidth = Math.max(320, resizeState.startWidth + (event.clientX - resizeState.startX));
      const nextHeight = Math.max(280, resizeState.startHeight + (event.clientY - resizeState.startY));
      syncTelegramChatFrame({
        ...telegramChatFrameRef.current,
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
      });
    };
    const handlePointerUp = () => {
      telegramChatDragRef.current = null;
      telegramChatResizeRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleWrapperTabButtonClick = (tabKey) => {
    if (tabKey === "settings") {
      planner.handleWrapperTabChange("settings");
      setIsMiniBarActionsVisible(false);
      return;
    }
    const isActiveTab = planner.state.wrapperTab === tabKey;
    if (isActiveTab) {
      setIsMiniBarActionsVisible((previousValue) => !previousValue);
      return;
    }
    planner.handleWrapperTabChange(tabKey);
  };
  useEffect(() => {
    const currentWrapperTab = String(planner.state?.wrapperTab || "");
    if (previousWrapperTabRef.current !== currentWrapperTab) {
      setIsMiniBarActionsVisible(Boolean(currentWrapperTab));
      previousWrapperTabRef.current = currentWrapperTab;
    }
  }, [planner.state?.wrapperTab]);
  const updateSavedCoursesWorkspacePointerTarget = (clientX, clientY) => {
    if (!isLogoMotionListenerEnabled) {
      return;
    }
    const articleElement = document.getElementById("nogaPlanner_article");
    if (!articleElement) {
      return;
    }
    const articleRect = articleElement.getBoundingClientRect();
    if (articleRect.width <= 0 || articleRect.height <= 0) {
      return;
    }
    const rawX = clientX - articleRect.left;
    const rawY = clientY - articleRect.top;
    const clampedX = Math.max(0, Math.min(articleRect.width, rawX));
    const clampedY = Math.max(0, Math.min(articleRect.height, rawY));
    const normalizedX = clampedX / articleRect.width;
    const normalizedY = clampedY / articleRect.height;
    const pointerState = savedCoursesWorkspacePointerStateRef.current;
    pointerState.active = true;
    pointerState.targetX = normalizedX;
    pointerState.targetY = normalizedY;
    articleElement.dataset.pointerActive = "true";
  };
  const getPointerClockBucket = (normalizedX, normalizedY) => {
    // 12 o'clock is top-center of #nogaPlanner_article.
    // 3 o'clock is right-center, 6 o'clock is bottom-center, 9 o'clock is left-center.
    const dx = normalizedX - 0.5;
    const dy = normalizedY - 0.5;
    const clockwiseFromTop =
      ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const nearestClockIndex = Math.round(clockwiseFromTop / 30) % 12;
    return nearestClockIndex === 0 ? "12" : String(nearestClockIndex);
  };
  const applySmoothedSavedCoursesWorkspacePointer = () => {
    const articleElement = document.getElementById("nogaPlanner_article");
    if (!articleElement) {
      return false;
    }
    if (!isLogoMotionListenerEnabled) {
      const normalizedFixedClock =
        fixedLogoClockPosition && LOGO_BY_CLOCK_POSITION[fixedLogoClockPosition]
          ? fixedLogoClockPosition
          : "9";
      articleElement.dataset.pointerClock = normalizedFixedClock;
      setLogoClockPositionImmediate(normalizedFixedClock);
      return false;
    }
    const pointerState = savedCoursesWorkspacePointerStateRef.current;
    const smoothingFactor = 0.16;
    pointerState.currentX +=
      (pointerState.targetX - pointerState.currentX) * smoothingFactor;
    pointerState.currentY +=
      (pointerState.targetY - pointerState.currentY) * smoothingFactor;

    const deltaX = pointerState.targetX - pointerState.currentX;
    const deltaY = pointerState.targetY - pointerState.currentY;
    const distance = Math.hypot(deltaX, deltaY);
    const vectorX = pointerState.currentX - 0.5;
    const vectorY = pointerState.currentY - 0.5;
    const angleDeg = (Math.atan2(vectorY, vectorX) * 180) / Math.PI;
    const clockBucket = getPointerClockBucket(
      pointerState.currentX,
      pointerState.currentY,
    );

    articleElement.dataset.pointerX = pointerState.currentX.toFixed(4);
    articleElement.dataset.pointerY = pointerState.currentY.toFixed(4);
    articleElement.dataset.pointerAngle = angleDeg.toFixed(2);
    articleElement.dataset.pointerClock = clockBucket;
    articleElement.style.setProperty(
      "--nogaPlanner-workspace-pointer-x",
      pointerState.currentX.toFixed(4),
    );
    articleElement.style.setProperty(
      "--nogaPlanner-workspace-pointer-y",
      pointerState.currentY.toFixed(4),
    );
    articleElement.style.setProperty(
      "--nogaPlanner-workspace-pointer-angle",
      `${angleDeg.toFixed(2)}deg`,
    );
    setLogoClockPositionImmediate(clockBucket);

    const shouldContinue = pointerState.active || distance > 0.0015;
    if (!shouldContinue) {
      pointerState.currentX = pointerState.targetX;
      pointerState.currentY = pointerState.targetY;
    }
    return shouldContinue;
  };
  const ensureSavedCoursesWorkspacePointerLoop = () => {
    if (savedCoursesWorkspacePointerRafRef.current) {
      return;
    }
    const step = () => {
      const shouldContinue = applySmoothedSavedCoursesWorkspacePointer();
      if (shouldContinue) {
        savedCoursesWorkspacePointerRafRef.current = requestAnimationFrame(step);
        return;
      }
      savedCoursesWorkspacePointerRafRef.current = 0;
    };
    savedCoursesWorkspacePointerRafRef.current = requestAnimationFrame(step);
  };
  const queueSavedCoursesWorkspacePointerUpdate = (
    clientX,
    clientY,
    options = {},
  ) => {
    if (!isLogoMotionListenerEnabled) {
      return;
    }
    updateSavedCoursesWorkspacePointerTarget(clientX, clientY);
    if (options?.snapToTarget) {
      const pointerState = savedCoursesWorkspacePointerStateRef.current;
      pointerState.currentX = pointerState.targetX;
      pointerState.currentY = pointerState.targetY;
      const articleElement = document.getElementById("nogaPlanner_article");
      if (articleElement) {
        const vectorX = pointerState.currentX - 0.5;
        const vectorY = pointerState.currentY - 0.5;
        const angleDeg = (Math.atan2(vectorY, vectorX) * 180) / Math.PI;
        const clockBucket = getPointerClockBucket(
          pointerState.currentX,
          pointerState.currentY,
        );
        articleElement.dataset.pointerX = pointerState.currentX.toFixed(4);
        articleElement.dataset.pointerY = pointerState.currentY.toFixed(4);
        articleElement.dataset.pointerAngle = angleDeg.toFixed(2);
        articleElement.dataset.pointerClock = clockBucket;
        articleElement.style.setProperty(
          "--nogaPlanner-workspace-pointer-x",
          pointerState.currentX.toFixed(4),
        );
        articleElement.style.setProperty(
          "--nogaPlanner-workspace-pointer-y",
          pointerState.currentY.toFixed(4),
        );
        articleElement.style.setProperty(
          "--nogaPlanner-workspace-pointer-angle",
          `${angleDeg.toFixed(2)}deg`,
        );
        setLogoClockPositionImmediate(clockBucket);
      }
    }
    ensureSavedCoursesWorkspacePointerLoop();
  };
  const handleSavedCoursesWorkspacePointerClick = (event) => {
    if (typeof event?.clientX !== "number" || typeof event?.clientY !== "number") {
      return;
    }
    queueSavedCoursesWorkspacePointerUpdate(event.clientX, event.clientY, {
      snapToTarget: true,
    });
  };
  const handleSavedCoursesWorkspaceTouchStart = (event) => {
    const touchPoint = event?.touches?.[0] || event?.changedTouches?.[0];
    if (!touchPoint) {
      return;
    }
    queueSavedCoursesWorkspacePointerUpdate(
      touchPoint.clientX,
      touchPoint.clientY,
      {
        snapToTarget: true,
      },
    );
  };
  const clearSavedCoursesWorkspacePointer = () => {
    if (!isLogoMotionListenerEnabled) {
      return;
    }
    const articleElement = document.getElementById("nogaPlanner_article");
    if (!articleElement) {
      return;
    }
    const pointerState = savedCoursesWorkspacePointerStateRef.current;
    pointerState.active = false;
    articleElement.dataset.pointerActive = "false";
    ensureSavedCoursesWorkspacePointerLoop();
  };
  const resetToUnmountedPlannerState = () => {
    planner.setState({
      wrapperTab: "",
      plannerTab: "",
      plannerSettingsVisible: false,
      selectedTabItemId: null,
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      savedCourseSelectionMode: false,
      selectedSavedCourseIds: [],
      savedCourseEditorVisible: false,
      inlineCourseRowVisible: false,
    });
    setIsMiniBarActionsVisible(false);
  };

  useEffect(() => {
    const updateCoursesMiniBarActionsPosition = () => {
      const tabsContainer = coursesMiniBarTabsRef.current;
      if (!tabsContainer) {
        setCoursesMiniBarActionsLeft("50%");
        return;
      }
      const activeTabButton = tabsContainer.querySelector(
        '[data-wrapper-tab-active="true"]',
      );
      if (!activeTabButton) {
        setCoursesMiniBarActionsLeft("50%");
        return;
      }
      const titleRowContainer = tabsContainer.closest(
        ".nogaPlanner_coursesTitleRow",
      );
      const baseRect = titleRowContainer
        ? titleRowContainer.getBoundingClientRect()
        : tabsContainer.getBoundingClientRect();
      const activeRect = activeTabButton.getBoundingClientRect();
      const nextLeft = activeRect.left - baseRect.left + activeRect.width / 2;
      setCoursesMiniBarActionsLeft(`${Math.round(nextLeft)}px`);
    };

    updateCoursesMiniBarActionsPosition();
    window.addEventListener("resize", updateCoursesMiniBarActionsPosition);
    return () =>
      window.removeEventListener("resize", updateCoursesMiniBarActionsPosition);
  }, [
    planner.state.wrapperTab,
    showCourseEditor,
    isLecturesTab,
    savedCourseSelectionMode,
  ]);
  useEffect(
    () => () => {
      if (savedCoursesWorkspacePointerRafRef.current) {
        cancelAnimationFrame(savedCoursesWorkspacePointerRafRef.current);
        savedCoursesWorkspacePointerRafRef.current = 0;
      }
    },
    [],
  );
  useEffect(() => {
    let isCancelled = false;
    const preloadFallbackTimeout = window.setTimeout(() => {
      if (!isCancelled) {
        setLogoAssetsReady(true);
      }
    }, 1500);
    const imageSources = Object.values(LOGO_BY_CLOCK_POSITION);
    Promise.all(
      imageSources.map(
        (imageSource) =>
          new Promise((resolve) => {
            const image = new Image();
            image.decoding = "async";
            image.onload = resolve;
            image.onerror = resolve;
            image.src = imageSource;
          }),
      ),
    ).then(() => {
      if (!isCancelled) {
        window.clearTimeout(preloadFallbackTimeout);
        setLogoAssetsReady(true);
      }
    });
    return () => {
      isCancelled = true;
      window.clearTimeout(preloadFallbackTimeout);
    };
  }, []);
  useEffect(() => {
    if (!logoAssetsReady) {
      return;
    }
    const normalizedClockBucket = String(
      logoClockPositionRef.current || "9",
    ).trim();
    const nextLogoSource =
      LOGO_BY_CLOCK_POSITION[normalizedClockBucket] || "/img/NP9.png";
    if (logoImageRef.current?.getAttribute("src") !== nextLogoSource) {
      logoImageRef.current?.setAttribute("src", nextLogoSource);
    }
  }, [logoAssetsReady]);
  useEffect(() => {
    const articleElement = document.getElementById("nogaPlanner_article");
    if (!articleElement) {
      return undefined;
    }
    const handleArticleClick = (event) => {
      if (typeof event?.clientX !== "number" || typeof event?.clientY !== "number") {
        return;
      }
      queueSavedCoursesWorkspacePointerUpdate(event.clientX, event.clientY, {
        snapToTarget: true,
      });
    };
    const handleArticleTouchStart = (event) => {
      const touchPoint = event?.touches?.[0] || event?.changedTouches?.[0];
      if (!touchPoint) {
        return;
      }
      queueSavedCoursesWorkspacePointerUpdate(
        touchPoint.clientX,
        touchPoint.clientY,
        {
          snapToTarget: true,
        },
      );
    };
    articleElement.addEventListener("click", handleArticleClick);
    articleElement.addEventListener("touchstart", handleArticleTouchStart, {
      passive: true,
    });
    return () => {
      articleElement.removeEventListener("click", handleArticleClick);
      articleElement.removeEventListener("touchstart", handleArticleTouchStart);
    };
  }, [isLogoMotionListenerEnabled]);
  useEffect(() => {
    if (isLogoMotionListenerEnabled) {
      return;
    }
    const normalizedFixedClock =
      fixedLogoClockPosition && LOGO_BY_CLOCK_POSITION[fixedLogoClockPosition]
        ? fixedLogoClockPosition
        : "9";
    logoClockPositionRef.current = normalizedFixedClock;
    setLogoClockPosition(normalizedFixedClock);
    const pointerState = savedCoursesWorkspacePointerStateRef.current;
    pointerState.active = false;
    const articleElement = document.getElementById("nogaPlanner_article");
    if (articleElement) {
      articleElement.dataset.pointerActive = "false";
      articleElement.dataset.pointerClock = normalizedFixedClock;
    }
  }, [isLogoMotionListenerEnabled, fixedLogoClockPosition]);

  const courseUi = PLANNER_COURSE_UI;
  const courseFieldLabel = (fieldName) => courseUi.fields[fieldName] || "";

  const savedCourseDefaultFieldMap = new Map(
    getPlannerDefaultFieldsForForm("savedCourse").map((fieldConfig) => [
      String(fieldConfig?.fieldName || "").trim(),
      String(fieldConfig?.key || "").trim(),
    ]),
  );

  const applySavedCourseFieldDefault = (fieldName) => {
    const fieldKey = savedCourseDefaultFieldMap.get(
      String(fieldName || "").trim(),
    );
    if (!fieldKey) {
      return;
    }
    const defaultValue = String(
      plannerSelectSettings?.fieldDefaults?.[fieldKey] || "",
    ).trim();
    planner.handleSavedCourseDraftChange(fieldName, defaultValue);
  };

  const renderSavedCourseFieldEyebrow = (label, options = {}) => {
    const { fieldName = "", readOnly = false } = options;
    const normalizedFieldName = String(fieldName || "").trim();
    const fieldKey = savedCourseDefaultFieldMap.get(normalizedFieldName);
    const isRelationshipLockedField = savedCourseLockedFields.has(
      normalizedFieldName,
    );
    const defaultValue = String(
      fieldKey ? plannerSelectSettings?.fieldDefaults?.[fieldKey] || "" : "",
    ).trim();
    const hasDefaultValue = Boolean(defaultValue);
    const fieldClassLabel = readOnly || isRelationshipLockedField
      ? "NogaPlanner"
      : hasDefaultValue
        ? "Default"
        : "Manual";
    const defaultLabel = hasDefaultValue
      ? `${fieldClassLabel} (${defaultValue})`
      : fieldClassLabel;
    return (
      <span className="nogaPlanner_savedCourseFieldEyebrow">
        <span>{label}</span>
        {readOnly || isRelationshipLockedField || !hasDefaultValue ? (
          <span className="nogaPlanner_savedCourseFieldClass">
            {fieldClassLabel}
          </span>
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="nogaPlanner_savedCourseFieldClass nogaPlanner_savedCourseFieldClass--default"
            onClick={() => applySavedCourseFieldDefault(normalizedFieldName)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                applySavedCourseFieldDefault(normalizedFieldName);
              }
            }}
            title={SAVED_TEXT.restoreDefaultTitle}
          >
            {defaultLabel}
          </span>
        )}
      </span>
    );
  };

  const splitScheduleParts = (scheduleValue) => {
    const rawEntries = Array.isArray(scheduleValue)
      ? scheduleValue
      : splitCourseTextList(scheduleValue);
    const entries = rawEntries
      .map((entry) => {
        if (entry && typeof entry === "object") {
          return {
            day: String(entry?.day || "").trim(),
            time: String(entry?.time || "").trim(),
          };
        }
        const match = String(entry || "")
          .trim()
          .match(/^(.*?)(?:\s*\((.*?)\))?$/);
        return {
          day: String(match?.[1] || "").trim(),
          time: String(match?.[2] || "").trim(),
        };
      })
      .filter((entry) => entry.day || entry.time);
    return {
      day:
        entries
          .map((entry) => entry.day)
          .filter(Boolean)
          .join(" | ") || "-",
      time:
        entries
          .map((entry) => entry.time)
          .filter(Boolean)
          .join(" | ") || "-",
    };
  };

  const renderSavedCourseSortLabel = (sortKey, label) => {
    const isActive = savedCourseSortKey === sortKey;
    const markerClassName = !isActive
      ? "fi fi-rr-arrows-up-down"
      : savedCourseSortDirection === "asc"
        ? "fi fi-rr-arrow-small-up"
        : "fi fi-rr-arrow-small-down";
    return (
      <>
        <span>{label}</span>
        <i
          className={markerClassName}
          aria-hidden="true"
          style={{ marginInlineStart: "6px", verticalAlign: "middle" }}
        />
      </>
    );
  };

  const formatCourseWeightDisplay = (value) => {
    if (value && typeof value === "object") {
      const normalizedValue = String(
        value?.value ?? value?.weight ?? value?.total ?? "",
      ).trim();
      if (normalizedValue) {
        return normalizedValue;
      }
    }
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || "-";
  };

  const renderMiniBarButtonContent = (iconClassName, label, metaLabel = "") => (
    <span className="nogaPlanner_coursesMiniBarBtnIconLabel">
      <i className={iconClassName} />
      <span>{label}</span>
      {metaLabel ? (
        <span className="nogaPlanner_coursesMiniBarBtnCounter">{metaLabel}</span>
      ) : null}
    </span>
  );

  const savedCourseProfileNormativeAcademicYear =
    normalizeAcademicYearValue(
      String(savedCourseDraft?.normativeCourseYearInterval || "").trim(),
    ) || "";
  const savedCourseProfileNormativeTerm = String(
    savedCourseDraft?.normativeCourseTerm || "",
  ).trim();
  const savedCourseProfileActualAcademicYear =
    normalizeAcademicYearValue(
      String(savedCourseDraft?.actualCourseYearInterval || "").trim() ||
        (planner.props.state?.studying?.time?.currentAcademicYear ??
          planner.props.state?.studying?.currentAcademicYear ??
          planner.props.state?.profile?.studying?.time?.currentAcademicYear ??
          planner.props.state?.profile?.studying?.currentAcademicYear ??
          planner.props.state?.currentAcademicYear),
    ) || "";
  const savedCourseProfileActualTerm = planner.getPlannerCurrentAcademicTerm();

  const buildRenderCourses = () => {
    const rows = [...savedCourses];
    if (!savedCourseEditorVisible) {
      return rows;
    }

    const currentEntry = buildSavedCourseComponentEntryFromDraft({
      ...savedCourseDraft,
      course_class:
        String(savedCourseDraft?.course_classSelection || "").trim() ||
        String(savedCourseDraft?.course_class || "").trim(),
    });

    if (savedCourseEditorMode === "add") {
      const staged = Array.isArray(savedCourseDraft?.course_components)
        ? savedCourseDraft.course_components
        : [];
      const previewEntries = [...staged];
      const currentIndex = Number(selectedSavedCourseDraftComponentIndex);
      const hasCurrent = Boolean(
        String(currentEntry?.course_class || "").trim(),
      );
      if (
        hasCurrent &&
        !(Number.isInteger(currentIndex) && currentIndex >= 0)
      ) {
        previewEntries.push(currentEntry);
      }
      const previewRows = previewEntries.map((entry, index) => ({
        _id: `__draft-course-${index}`,
        __draft: true,
        course_name: savedCourseDraft.course_name,
        course_code: savedCourseDraft.course_code,
        course_status: savedCourseDraft.course_status,
        course_totalWeight: savedCourseDraft.course_totalWeight,
        course_class: entry.course_class || "",
        component_status:
          entry.component_status || savedCourseDraft.component_status,
        normativeCourseYearInterval:
          entry.normativeCourseYearInterval ||
          planner.getPlannerProfileAcademicYear(),
        normativeCourseTerm:
          entry.normativeCourseTerm || planner.getPlannerProfileAcademicTerm(),
        actualCourseYearInterval:
          entry.actualCourseYearInterval ||
          savedCourseDraft.actualCourseYearInterval ||
          savedCourseProfileActualAcademicYear,
        actualCourseTerm:
          entry.actualCourseTerm || savedCourseProfileActualTerm,
        course_dayAndTime: entry.course_dayAndTime || "",
        course_locationBuilding: entry.course_locationBuilding || "",
        course_locationRoom: entry.course_locationRoom || "",
        course_grade: entry.course_grade || "",
      }));
      return previewRows.length ? [...rows, ...previewRows] : rows;
    }

    if (savedCourseEditorMode === "edit") {
      const targetId = String(
        savedCourseDetailsComponentId ||
          selectedCourseForLecturesId ||
          selectedIds[0] ||
          "",
      ).trim();
      if (!targetId) {
        return rows;
      }
      return rows.map((course) =>
        String(course?._id || "").trim() === targetId
          ? {
              ...course,
              __draft: true,
              course_name: savedCourseDraft.course_name,
              course_code: savedCourseDraft.course_code,
              course_status: savedCourseDraft.course_status,
              course_totalWeight: savedCourseDraft.course_totalWeight,
              course_class:
                String(savedCourseDraft?.course_classSelection || "").trim() ||
                course.course_class,
              component_status: savedCourseDraft.component_status,
              normativeCourseYearInterval:
                planner.getPlannerProfileAcademicYear(),
              normativeCourseTerm: planner.getPlannerProfileAcademicTerm(),
              actualCourseYearInterval:
                savedCourseDraft.actualCourseYearInterval ||
                savedCourseProfileActualAcademicYear,
              actualCourseTerm: savedCourseProfileActualTerm,
              course_dayAndTime: savedCourseDraft.course_dayAndTime,
              course_locationBuilding: savedCourseDraft.course_locationBuilding,
              course_locationRoom: savedCourseDraft.course_locationRoom,
              course_grade: savedCourseDraft.course_grade,
            }
          : course,
      );
    }

    return rows;
  };

  const renderSavedCourses = buildRenderCourses();
  const groupedRows = [];
  let rowIndex = 0;
  while (rowIndex < renderSavedCourses.length) {
    const row = renderSavedCourses[rowIndex];
    const groupKey = getCourseNameGroupKey(row);
    const group = [row];
    let nextIndex = rowIndex + 1;
    while (
      nextIndex < renderSavedCourses.length &&
      getCourseNameGroupKey(renderSavedCourses[nextIndex]) === groupKey
    ) {
      group.push(renderSavedCourses[nextIndex]);
      nextIndex += 1;
    }
    groupedRows.push(group);
    rowIndex = nextIndex;
  }

  const selectedGroupCount = groupedRows.filter((group) => {
    const groupIds = group
      .map((entry) => String(entry?._id || "").trim())
      .filter(Boolean);
    return groupIds.some((entryId) => selectedIds.includes(entryId));
  }).length;
  const canEditSelectedCourse = selectedIds.length > 0 && selectedGroupCount === 1;
  const canDeleteSelectedCourses = selectedIds.length > 0;
  const canEditSelectedLecture =
    !deleteSelectionMode && String(planner.state?.selectedTabItemId || "").trim().length > 0;
  const canDeleteSelectedLectures = lectureSelectionIds.length > 0;

  const uniqueSavedCoursesCount = groupedRows.length;
  const totalSavedCourseComponentsCount = renderSavedCourses.length;

  const stagedDraftComponents = Array.isArray(savedCourseDraft?.course_components)
    ? savedCourseDraft.course_components
    : [];

  const locationEntries = Array.isArray(planner.state?.courses)
    ? planner.state.courses
    : [];
  const locationBuildingOptions = Array.from(
    new Set(
      (Array.isArray(plannerSelectSettings?.locationBuildingOptions)
        ? plannerSelectSettings.locationBuildingOptions
        : []
      )
        .map((entry) => String(entry || "").trim())
        .concat(
          locationEntries.map((entry) =>
            String(
              entry?.course_location?.building ||
                entry?.course_locationBuilding ||
                "",
            ).trim(),
          ),
        )
        .concat(String(savedCourseDraft?.course_locationBuilding || "").trim())
        .filter((entry) => entry && entry !== "-"),
    ),
  );
  const locationRoomOptions = Array.from(
    new Set(
      (() => {
        const selectedBuilding = String(
          savedCourseDraft?.course_locationBuilding || "",
        ).trim();
        const groupedRooms = Array.isArray(
          plannerSelectSettings?.locationRoomOptionsByBuilding,
        )
          ? plannerSelectSettings.locationRoomOptionsByBuilding
              .filter((entry) => {
                const building = String(entry?.building || "").trim();
                return !selectedBuilding || building === selectedBuilding;
              })
              .flatMap((entry) =>
                Array.isArray(entry?.rooms) ? entry.rooms : [],
              )
          : [];
        const flatRooms = Array.isArray(
          plannerSelectSettings?.locationRoomOptions,
        )
          ? plannerSelectSettings.locationRoomOptions
          : [];
        return [...groupedRooms, ...flatRooms];
      })()
        .map((entry) => String(entry || "").trim())
        .concat(
          locationEntries
            .filter((entry) => {
              const buildingValue = String(
                entry?.course_location?.building ||
                  entry?.course_locationBuilding ||
                  "",
              ).trim();
              const selectedBuilding = String(
                savedCourseDraft?.course_locationBuilding || "",
              ).trim();
              return !selectedBuilding || buildingValue === selectedBuilding;
            })
            .map((entry) =>
              String(
                entry?.course_location?.room ||
                  entry?.course_locationRoom ||
                  "",
              ).trim(),
            ),
        )
        .concat(String(savedCourseDraft?.course_locationRoom || "").trim())
        .filter((entry) => entry && entry !== "-"),
    ),
  );
  const buildPredictionListId = (fieldName) =>
    `nogaPlanner_savedCourseInputPredictions_${fieldName}`;
  const getInputPredictions = (fieldName, currentValue = "") => {
    if (typeof planner.getPlannerInputPredictions !== "function") {
      return [];
    }
    return planner.getPlannerInputPredictions(fieldName, currentValue);
  };
  const courseNamePredictions = getInputPredictions(
    "course_name",
    savedCourseDraft?.course_name,
  );
  const courseCodePredictions = getInputPredictions(
    "course_code",
    savedCourseDraft?.course_code,
  );
  const courseTotalWeightPredictions = getInputPredictions(
    "course_totalWeight",
    savedCourseDraft?.course_totalWeight,
  );
  const courseGradePredictions = getInputPredictions(
    "course_grade",
    savedCourseDraft?.course_grade,
  );

  const renderSavedCourseEditorPanel = () => (
    <div
      id="nogaPlanner_savedCourseEditor"
      className="nogaPlanner_savedCourseEditor"
    >
      
        <div
          id="nogaPlanner_savedCourseEditor_courseCard"
          className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--courseCard"
        >
          <div className="nogaPlanner_formCardTitleRow">
            <p
              id="nogaPlanner_savedCourseEditor_courseCardTitle"
              className="nogaPlanner_savedCourseEditorLabel"
            >
              {courseUi.editor.courseCardTitle}
            </p>
            {plannerSettingsVisible ? (
              <button
                id="nogaPlanner_savedCourseEditor_closeFormBtn"
                type="button"
                className="nogaPlanner_coursesMiniBarBtn nogaPlanner_formCardCloseBtn"
                onClick={planner.closeSavedCourseEditor}
                aria-label={NOGAPLANNER_TEXT.settings.back}
                title={NOGAPLANNER_TEXT.settings.back}
              >
                <i className="fi fi-rc-arrow-alt-circle-left" />
              </button>
            ) : null}
          </div>
          <div
            id="nogaPlanner_savedCourseEditor_courseFormFieldsWrapper"
            className="nogaPlanner_savedCourseEditor_courseFormFieldsWrapper"
          >
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("course_name"), {
                fieldName: "course_name",
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_name"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={savedCourseDraft.course_name}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_name",
                    event.target.value,
                  )
                }
                placeholder={courseFieldLabel("course_name")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("course_code"), {
                fieldName: "course_code",
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_code"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={savedCourseDraft.course_code}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_code",
                    event.target.value,
                  )
                }
                placeholder={courseFieldLabel("course_code")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("course_status"), {
                fieldName: "course_status",
                readOnly: true,
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_status"
                className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
                type="text"
                value={
                  formatPlannerStatusLabel(savedCourseDraft.course_status) ===
                  "-"
                    ? courseUi.editor.pendingStatus
                    : formatPlannerStatusLabel(savedCourseDraft.course_status)
                }
                readOnly
                placeholder={courseFieldLabel("course_status")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("course_totalWeight"),
                {
                  fieldName: "course_totalWeight",
                },
              )}
              <input
                id="nogaPlanner_savedCourseInput_course_totalWeight"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="number"
                min="0"
                step="0.01"
                value={savedCourseDraft.course_totalWeight}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_totalWeight",
                    event.target.value,
                  )
                }
                placeholder={courseFieldLabel("course_totalWeight")}
              />
            </div>
          </div>
        </div>
        <div
          id="nogaPlanner_savedCourseEditor_componentCard"
          className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentCard"
        >
          <div
            id="nogaPlanner_savedCourseEditor_componentCardHeader"
            className="nogaPlanner_savedCourseEditorLabelRow"
          >
            <div
              id="nogaPlanner_savedCourseEditor_componentCardTitle"
              className="nogaPlanner_savedCourseEditorLabel nogaPlanner_savedCourseEditorLabelButton"
            >
              <span>{courseUi.editor.componentCardTitle}</span>
            </div>
          </div>
          <div
            id="nogaPlanner_savedCourseEditor_componentFormFieldsWrapper"
            className="nogaPlanner_savedCourseEditor_componentFormFieldsWrapper"
          >
          <div
            id="nogaPlanner_savedCourseEditor_componentEntriesRow"
            className="nogaPlanner_savedCourseEditor_componentEntriesRow"
          >
            <div
              id="nogaPlanner_savedCourseEditorLabelControls"
              className="nogaPlanner_savedCourseEditorLabelControls"
            >
              <ul
                id="nogaPlanner_savedCourse_componentCompactList"
                className="nogaPlanner_savedCourse_componentCompactList"
              >
                {stagedDraftComponents.length === 0 ? (
                  <li className="nogaPlanner_savedCourse_componentCompactListEmpty">
                    {NOGAPLANNER_TEXT.common.noEntries}
                  </li>
                ) : (
                  stagedDraftComponents.map((entry, entryIndex) => {
                    const entryLabel =
                      String(entry?.course_class || entry?.course_component || "").trim() ||
                      `${courseUi.editor.currentComponent} ${entryIndex + 1}`;
                    const isSelected =
                      Number(selectedSavedCourseDraftComponentIndex) ===
                      entryIndex;
                    return (
                      <li key={`saved-course-component-compact-${entryIndex}`}>
                        <button
                          type="button"
                          className={
                            "nogaPlanner_savedCourse_componentCompactItem" +
                            (isSelected
                              ? " nogaPlanner_savedCourse_componentCompactItem--active"
                              : "")
                          }
                          onClick={() =>
                            planner.selectSavedCourseDraftComponent(
                              String(entryIndex),
                            )
                          }
                        >
                          {entryLabel}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              <div
                id="nogaPlanner_savedCourseComponentActionsWrapper"
                className="nogaPlanner_savedCourseComponentActionsWrapper"
              >
                {showComponentSaveCancelActions ? (
                  <div
                    id="nogaPlanner_savedCourseComponentSaveCancelWrapper"
                    className="nogaPlanner_savedCourseComponentSaveCancelWrapper"
                  >
                    <button
                      id="nogaPlanner_savedCourseBtn_addComponent"
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={planner.appendSavedCourseComponentEntry}
                      disabled={!hasSelectedComponentType || componentFieldsIdle}
                      title={NOGAPLANNER_TEXT.common.save}
                      aria-label={NOGAPLANNER_TEXT.common.save}
                    >
                      <i className="fas fa-save" aria-hidden="true" />
                    </button>
                    <button
                      id="nogaPlanner_savedCourseBtn_cancelComponent"
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={planner.cancelSavedCourseComponentDraftEdit}
                      title={NOGAPLANNER_TEXT.common.cancel}
                      aria-label={NOGAPLANNER_TEXT.common.cancel}
                    >
                      <i className="fas fa-times" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                <button
                  id="nogaPlanner_savedCourseBtn_addMoreComponent"
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={planner.startAddingNewSavedCourseComponent}
                  disabled={
                    stagedDraftComponents.length === 0 ||
                    Boolean(savedCourseComponentDraftActive)
                  }
                  title={courseUi.editor.newComponent}
                  aria-label={courseUi.editor.newComponent}
                >
                  <i className="fi fi-rr-plus-small" aria-hidden="true" />
                </button>
                <button
                  id="nogaPlanner_savedCourseBtn_deleteComponent"
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={planner.deleteSelectedSavedCourseDraftComponent}
                  disabled={stagedDraftComponents.length === 0}
                  title={NOGAPLANNER_TEXT.common.delete}
                  aria-label={NOGAPLANNER_TEXT.common.delete}
                >
                  <i className="fas fa-trash" aria-hidden="true" />
                </button>
              </div>
            </div>
            </div>
            <fieldset
              className="nogaPlanner_savedCourseComponentFieldsFieldset"
              disabled={componentFieldsIdle}
            >
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("course_classSelection"),
                { fieldName: "course_classSelection" },
              )}
              <select
                id="nogaPlanner_savedCourseSelect_course_classSelection"
                className="nogaPlanner_savedCoursesDetailsInput"
                value={savedCourseDraft.course_classSelection}
                disabled={
                  savedCourseLockedFields.has("course_classSelection") ||
                  !courseCoreFieldsReady
                }
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_classSelection",
                    event.target.value,
                  )
                }
                title={
                  courseCoreFieldsReady
                    ? ""
                    : "أكمل اسم المقرر، الرمز، الحالة، ووزن المقرر أولاً"
                }
              >
                <option value="">
                  {courseFieldLabel("course_classSelection")}
                </option>
                {componentClassOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("component_status"), {
                fieldName: "component_status",
                readOnly: true,
              })}
              <input
                id="nogaPlanner_savedCourseInput_component_status"
                className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
                type="text"
                value={
                  formatPlannerStatusLabel(savedCourseDraft.component_status) ===
                  "-"
                    ? courseUi.editor.pendingStatus
                    : formatPlannerStatusLabel(savedCourseDraft.component_status)
                }
                readOnly
                placeholder={courseFieldLabel("component_status")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("normativeCourseYearInterval"),
                { fieldName: "normativeCourseYearInterval" },
              )}
              <select
                id="nogaPlanner_savedCourseSelect_normativeCourseYearInterval"
                className="nogaPlanner_savedCoursesDetailsInput"
                value={savedCourseProfileNormativeAcademicYear}
                disabled={!hasSelectedComponentType}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "normativeCourseYearInterval",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {courseFieldLabel("normativeCourseYearInterval")}
                </option>
                {ACADEMIC_YEAR_OPTIONS.map((optionValue) => (
                  <option
                    key={`normative-year-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("normativeCourseTerm"),
                {
                  fieldName: "normativeCourseTerm",
                },
              )}
              <select
                id="nogaPlanner_savedCourseSelect_normativeCourseTerm"
                className="nogaPlanner_savedCoursesDetailsInput"
                value={savedCourseProfileNormativeTerm}
                disabled={!hasSelectedComponentType}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "normativeCourseTerm",
                    event.target.value,
                  )
                }
              >
                <option value="">{courseFieldLabel("normativeCourseTerm")}</option>
                {TERM_OPTIONS.map((optionValue) => (
                  <option key={`normative-term-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("actualCourseYearInterval"),
                { fieldName: "actualCourseYearInterval", readOnly: true },
              )}
              <input
                id="nogaPlanner_savedCourseInput_actualCourseYearInterval"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={savedCourseProfileActualAcademicYear}
                disabled={!hasSelectedComponentType}
                readOnly
                placeholder={courseFieldLabel("actualCourseYearInterval")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("actualCourseTerm"), {
                fieldName: "actualCourseTerm",
                readOnly: true,
              })}
              <input
                id="nogaPlanner_savedCourseInput_actualCourseTerm"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={savedCourseProfileActualTerm}
                disabled={!hasSelectedComponentType}
                readOnly
                placeholder={courseFieldLabel("actualCourseTerm")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              <div
                id="nogaPlanner_savedCourseDetailGroupsGrid"
                className="nogaPlanner_savedCourseDetailGroupsGrid"
              >
            <div
              id="nogaPlanner_savedCourseDetailGroup_schedule"
              className="nogaPlanner_savedCourseDetailGroup"
            >
              <div
                id="nogaPlanner_savedCourseScheduleHeaderRow"
                className="nogaPlanner_savedCourseScheduleHeaderRow"
              >
                {renderSavedCourseFieldEyebrow(
                  courseUi.editor.scheduleGroupTitle,
                  { fieldName: "course_dayAndTime" },
                )}
                <label
                  htmlFor="nogaPlanner_savedCourseCheckbox_noAttendance"
                  className="nogaPlanner_savedCourseNoAttendanceToggle"
                >
                  <input
                    id="nogaPlanner_savedCourseCheckbox_noAttendance"
                    type="checkbox"
                    checked={noAttendanceForComponent}
                    onChange={(event) =>
                      setNoAttendanceForComponent(Boolean(event.target.checked))
                    }
                  />
                  <span>لا يوجد حضور لهذا المكوّن</span>
                </label>
              </div>
              <div
                className={
                  "nogaPlanner_savedCourseScheduleControlsRow" +
                  (scheduleDisabledForComponent
                    ? " nogaPlanner_savedCourseFields--inactive"
                    : "")
                }
              >
                <div
                  id="nogaPlanner_savedCourseScheduleRow"
                  className="nogaPlanner_savedCourseScheduleRow"
                >
                  <div
                    id="nogaPlanner_savedCourseScheduleField_day"
                    className="nogaPlanner_savedCourseScheduleField"
                  >
                    <select
                      id="nogaPlanner_savedCourseSelect_course_daySelection"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={savedCourseDraft.course_daySelection}
                      disabled={
                        scheduleDisabledForComponent ||
                        savedCourseLockedFields.has("course_daySelection")
                      }
                      onChange={(event) =>
                        planner.handleSavedCourseDraftChange(
                          "course_daySelection",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        {courseFieldLabel("course_daySelection")}
                      </option>
                      {weekdayOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    id="nogaPlanner_savedCourseScheduleField_time"
                    className="nogaPlanner_savedCourseScheduleField"
                  >
                    <select
                      id="nogaPlanner_savedCourseSelect_course_timeSelection"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={savedCourseDraft.course_timeSelection}
                      disabled={
                        scheduleDisabledForComponent ||
                        savedCourseLockedFields.has("course_timeSelection")
                      }
                      onChange={(event) =>
                        planner.handleSavedCourseDraftChange(
                          "course_timeSelection",
                          event.target.value,
                        )
                      }
                      onKeyDown={planner.handleSavedCourseScheduleEnter}
                    >
                      <option value="">
                        {courseFieldLabel("course_timeSelection")}
                      </option>
                      {hourOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  id="nogaPlanner_savedCourseBtn_appendScheduleEntry"
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={planner.appendSavedCourseScheduleEntry}
                  disabled={scheduleDisabledForComponent}
                >
                  +
                </button>
              </div>
              <ul
                id="nogaPlanner_savedCoursesScheduleChips"
                className={
                  "nogaPlanner_savedCoursesScheduleChips" +
                  (scheduleDisabledForComponent
                    ? " nogaPlanner_savedCourseFields--inactive"
                    : "")
                }
              >
                {splitCourseTextList(savedCourseDraft.course_dayAndTime).length > 0 ? (
                  splitCourseTextList(savedCourseDraft.course_dayAndTime).map(
                    (entry, entryIndex) => (
                      <li
                        id={`nogaPlanner_savedCourseScheduleChip_${entryIndex}`}
                        key={`saved-course-schedule-${entryIndex}`}
                        className="nogaPlanner_savedCoursesScheduleChip"
                        onClick={() => {
                          if (scheduleDisabledForComponent) return;
                          planner.removeSavedCourseScheduleEntry(entryIndex);
                        }}
                      >
                        {entry}
                      </li>
                    ),
                  )
                ) : (
                  <li className="nogaPlanner_savedCoursesScheduleEmpty">
                    لا يوجد أي إدخال، أضف واحداً
                  </li>
                )}
              </ul>
            </div>
            <div
              id="nogaPlanner_savedCourseDetailGroup_location"
              className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseDetailGroup--location"
            >
              {renderSavedCourseFieldEyebrow(
                courseFieldLabel("course_location") ||
                  courseUi.editor.locationGroupTitle,
                { fieldName: "course_locationBuilding" },
              )}
              <select
                id="nogaPlanner_savedCourseSelect_course_locationBuilding"
                className={
                  "nogaPlanner_savedCoursesDetailsInput" +
                  (scheduleDisabledForComponent
                    ? " nogaPlanner_savedCourseFields--inactive"
                    : "")
                }
                value={savedCourseDraft.course_locationBuilding}
                disabled={
                  scheduleDisabledForComponent ||
                  savedCourseLockedFields.has("course_locationBuilding")
                }
                onChange={(event) => {
                  const nextBuildingValue = event.target.value;
                  planner.handleSavedCourseDraftChange(
                    "course_locationBuilding",
                    nextBuildingValue,
                  );
                  planner.handleSavedCourseDraftChange(
                    "course_locationRoom",
                    "",
                  );
                }}
              >
                <option value="">
                  {courseFieldLabel("course_locationBuilding")}
                </option>
                {locationBuildingOptions.map((optionValue) => (
                  <option key={`building-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
              <select
                id="nogaPlanner_savedCourseSelect_course_locationRoom"
                className={
                  "nogaPlanner_savedCoursesDetailsInput" +
                  (scheduleDisabledForComponent
                    ? " nogaPlanner_savedCourseFields--inactive"
                    : "")
                }
                value={savedCourseDraft.course_locationRoom}
                disabled={
                  scheduleDisabledForComponent ||
                  !String(
                    savedCourseDraft.course_locationBuilding || "",
                  ).trim() ||
                  savedCourseLockedFields.has("course_locationRoom")
                }
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_locationRoom",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {courseFieldLabel("course_locationRoom")}
                </option>
                {locationRoomOptions.map((optionValue) => (
                  <option key={`room-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
            </div>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("course_grade"), {
                fieldName: "course_grade",
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_grade"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="number"
                min="0"
                step="0.01"
                value={savedCourseDraft.course_grade}
                disabled={
                  !hasSelectedComponentType ||
                  savedCourseLockedFields.has("course_grade")
                }
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange(
                    "course_grade",
                    event.target.value,
                  )
                }
                placeholder={courseFieldLabel("course_grade")}
              />
            </div>
            </fieldset>
          </div>
        </div>
    </div>
  );

  const renderWrapperTabs = () => (
      <div id="nogaPlanner_wrapperTabsGroup" className="nogaPlanner_wrapperTabsGroup">
        <div
          id="nogaPlanner_coursesMiniBar"
          className="nogaPlanner_coursesMiniBar"
        >
            <div
              id="nogaPlanner_coursesMiniBar_tabs"
              className="nogaPlanner_coursesMiniBarCol nogaPlanner_coursesMiniBarCol--tabs"
              ref={coursesMiniBarTabsRef}
            >
                {WRAPPER_TABS.map((tabEntry) => (
                  <button
                    key={`wrapper-tab-${tabEntry.key}`}
                    id={`nogaPlanner_wrapperTabBtn_${tabEntry.key}`}
                    type="button"
                    className={
                      "nogaPlanner_wrapperTabBtn"
                    }
                    data-wrapper-tab-active={
                      planner.state.wrapperTab === tabEntry.key ? "true" : "false"
                    }
                    onClick={() => handleWrapperTabButtonClick(tabEntry.key)}
                    aria-label={tabEntry.label}
                    title={tabEntry.label}
                    aria-expanded={
                      planner.state.wrapperTab === tabEntry.key
                        ? isMiniBarActionsVisible
                        : false
                    }
                  >
                    <span className="nogaPlanner_wrapperTabBtnIconLabel">
                      <i className={tabEntry.icon} />
                      <span>{tabEntry.label}</span>
                    </span>
                  </button>
                ))}
            </div>
          {isMiniBarActionsVisible &&
          !plannerSettingsVisible &&
          (planner.state.wrapperTab === "courses" ||
            planner.state.wrapperTab === "lectures" ||
            planner.state.wrapperTab === "exams") ? (
            <>
              <div
                id="nogaPlanner_wrapperTabsActions"
                className="nogaPlanner_wrapperTabsActions"
              >
              {showCourseEditor ? (
                <>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_save"
                    type="button"
                    className={
                      "nogaPlanner_coursesMiniBarBtn" +
                      (hasPendingUnsavedComponentDraft
                        ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                        : "")
                    }
                    onClick={planner.submitSavedCourseEditor}
                    disabled={hasPendingUnsavedComponentDraft}
                    aria-label={SAVED_TEXT.save}
                    title={SAVED_TEXT.save}
                  >
                    {renderMiniBarButtonContent("fas fa-save", SAVED_TEXT.save)}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_close"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={planner.closeSavedCourseEditor}
                    aria-label={SAVED_TEXT.close}
                    title={SAVED_TEXT.close}
                  >
                    {renderMiniBarButtonContent(
                      "fas fa-times",
                      SAVED_TEXT.close,
                    )}
                  </button>
                </>
              ) : isLecturesTab ? (
                <>
                  {inlineLectureRowVisible ? (
                    <>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_saveLecture"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.submitInlineLectureRow}
                        aria-label={SAVED_TEXT.save}
                        title={SAVED_TEXT.save}
                      >
                        {renderMiniBarButtonContent("fas fa-save", SAVED_TEXT.save)}
                      </button>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_cancelLecture"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.closeInlineLectureRow}
                        aria-label={SAVED_TEXT.close}
                        title={SAVED_TEXT.close}
                      >
                        {renderMiniBarButtonContent("fas fa-times", SAVED_TEXT.close)}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_addLecture"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--add"
                        onClick={planner.openInlineLectureRow}
                        aria-label={SAVED_TEXT.addLecture}
                        title={SAVED_TEXT.addLecture}
                      >
                        {renderMiniBarButtonContent(
                          "fi fi-sr-rectangle-history-circle-plus",
                          SAVED_TEXT.add,
                        )}
                      </button>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_deleteAllLectures"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.deleteAllVisibleLectures}
                        aria-label={SAVED_TEXT.deleteAll}
                        title={SAVED_TEXT.deleteAll}
                      >
                        {renderMiniBarButtonContent(
                          "fas fa-trash-alt",
                          SAVED_TEXT.deleteAll,
                        )}
                      </button>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_toggleLectureSelectionMode"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.toggleLectureSelectionMode}
                        aria-pressed={deleteSelectionMode}
                        aria-label={
                          deleteSelectionMode
                            ? SAVED_TEXT.finishSelection
                            : SAVED_TEXT.select
                        }
                        title={
                          deleteSelectionMode
                            ? SAVED_TEXT.finishSelection
                            : SAVED_TEXT.select
                        }
                      >
                        {renderMiniBarButtonContent(
                          "fi fi-rr-choose",
                          deleteSelectionMode
                            ? SAVED_TEXT.finishSelection
                            : SAVED_TEXT.select,
                          `(${lectureSelectionIds.length})`,
                        )}
                      </button>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_deleteSelectedLecture"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.deleteSelectedLectures}
                        disabled={!canDeleteSelectedLectures}
                        aria-label={NOGAPLANNER_TEXT.common.delete}
                        title={NOGAPLANNER_TEXT.common.delete}
                      >
                        {renderMiniBarButtonContent(
                          "fas fa-trash",
                          NOGAPLANNER_TEXT.common.delete,
                        )}
                      </button>
                      <button
                        id="nogaPlanner_coursesMiniBarBtn_editSelectedLecture"
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.handleMiniBarEdit}
                        disabled={!canEditSelectedLecture}
                        aria-label={SAVED_TEXT.edit}
                        title={SAVED_TEXT.edit}
                      >
                        {renderMiniBarButtonContent("fas fa-pen", SAVED_TEXT.edit)}
                      </button>
                    </>
                  )}
                </>
              ) : planner.state.wrapperTab === "exams" ? (
                <>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_addExam"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--add"
                    onClick={() => planner.openAddExamForm("Add")}
                    aria-label={NOGAPLANNER_TEXT.examBoard.add}
                    title={NOGAPLANNER_TEXT.examBoard.add}
                  >
                    {renderMiniBarButtonContent(
                      "fi fi-sr-rectangle-history-circle-plus",
                      NOGAPLANNER_TEXT.examBoard.add,
                    )}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_editExam"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={() => planner.openAddExamForm("Edit")}
                    disabled={!hasSelectedExam}
                    aria-label={NOGAPLANNER_TEXT.examBoard.edit}
                    title={NOGAPLANNER_TEXT.examBoard.edit}
                  >
                    {renderMiniBarButtonContent(
                      "fas fa-pen",
                      NOGAPLANNER_TEXT.examBoard.edit,
                    )}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_deleteExam"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={planner.deleteSelectedExam}
                    disabled={!hasSelectedExam}
                    aria-label={NOGAPLANNER_TEXT.examBoard.delete}
                    title={NOGAPLANNER_TEXT.examBoard.delete}
                  >
                    {renderMiniBarButtonContent(
                      "fas fa-trash",
                      NOGAPLANNER_TEXT.examBoard.delete,
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_addCourse"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--add"
                    onClick={() => planner.openSavedCourseEditor("add")}
                    aria-label={SAVED_TEXT.add}
                    title={SAVED_TEXT.add}
                  >
                    {renderMiniBarButtonContent(
                      "fi fi-sr-rectangle-history-circle-plus",
                      SAVED_TEXT.add,
                    )}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_toggleSelectionMode"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={planner.enableSavedCourseSelectionMode}
                    aria-pressed={savedCourseSelectionMode}
                    aria-label={
                      savedCourseSelectionMode
                        ? SAVED_TEXT.finishSelection
                        : SAVED_TEXT.select
                    }
                    title={
                      savedCourseSelectionMode
                        ? SAVED_TEXT.finishSelection
                        : SAVED_TEXT.select
                    }
                  >
                    {renderMiniBarButtonContent(
                      "fi fi-rr-choose",
                      savedCourseSelectionMode
                        ? SAVED_TEXT.finishSelection
                        : SAVED_TEXT.select,
                      `(${selectedGroupCount})`,
                    )}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_deleteSelectedCourse"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={planner.deleteSelectedSavedCourse}
                    disabled={!canDeleteSelectedCourses}
                    aria-label={NOGAPLANNER_TEXT.common.delete}
                    title={NOGAPLANNER_TEXT.common.delete}
                  >
                    {renderMiniBarButtonContent(
                      "fas fa-trash",
                      NOGAPLANNER_TEXT.common.delete,
                    )}
                  </button>
                  <button
                    id="nogaPlanner_coursesMiniBarBtn_editCourse"
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={() => planner.openSavedCourseEditor("edit")}
                    disabled={!canEditSelectedCourse}
                    aria-label={SAVED_TEXT.edit}
                    title={SAVED_TEXT.edit}
                  >
                    {renderMiniBarButtonContent("fas fa-pen", SAVED_TEXT.edit)}
                  </button>
                </>
              )}
              </div>
            </>
          ) : null}
        </div>
        <div id="nogaPlanner_wrapperTabsAside" className="nogaPlanner_wrapperTabsAside">
          <button
            id="nogaPlanner_coursesMiniBarBtn_telegramChat"
            type="button"
            className={
              "nogaPlanner_wrapperTabBtn" +
              (telegramChatOpen ? " nogaPlanner_coursesMiniBarBtn--active" : "")
            }
            onClick={() => setTelegramChatOpen((currentValue) => !currentValue)}
            aria-pressed={telegramChatOpen}
            aria-label="Telegram chat"
            title="Telegram chat"
          >
            <span className="nogaPlanner_wrapperTabBtnIconLabel">
              <i className="fi fi-brands-telegram" />
              <span>Telegram</span>
            </span>
          </button>
          {isMiniBarActionsVisible &&
          !plannerSettingsVisible &&
          (planner.state.wrapperTab === "courses" ||
            planner.state.wrapperTab === "lectures" ||
            planner.state.wrapperTab === "exams") ? (
            <button
              id="backToTabs_button"
              type="button"
              className="nogaPlanner_wrapperTabBtn"
              aria-label={NOGAPLANNER_TEXT.settings.back}
              title={NOGAPLANNER_TEXT.settings.back}
              onClick={resetToUnmountedPlannerState}
              data-wrapper-tab-active="true"
            >
              <span className="nogaPlanner_wrapperTabBtnIconLabel">
                <i className="fi fi-rc-arrow-alt-circle-left" />
                <span>{NOGAPLANNER_TEXT.settings.back}</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>
  );

  const renderTelegramChatPanel = () => {
    if (!telegramChatOpen) {
      return null;
    }
    return (
      <div
        id="nogaPlanner_telegramMiniChat"
        className="telegramControlPage_card telegramControlPage_card--stream nogaPlanner_telegramMiniChat"
        style={{
          top: `${telegramChatFrame.top}px`,
          right: `${telegramChatFrame.right}px`,
          width: `${telegramChatFrame.width}px`,
          height: `${telegramChatFrame.height}px`,
          zIndex: telegramChatFrame.zIndex,
        }}
      >
        <div className="telegramControlPage_cardHeader">
          <h2>Telegram messages</h2>
          <span>{`${telegramMessages.length} shown`}</span>
        </div>
        <div className="telegramControlPage_streamToolbar">
          <select
            id="nogaPlanner_telegramMiniChatGroupSelect"
            className="telegramControlPage_input"
            value={telegramSelectedGroupReference}
            onChange={(event) =>
              setTelegramSelectedGroupReference(event.target.value)
            }
          >
            <option value="">Select stored group</option>
            {(Array.isArray(telegramStoredGroups) ? telegramStoredGroups : []).map(
              (group) => {
                const reference = String(group?.groupReference || "").trim();
                if (!reference) {
                  return null;
                }
                return (
                  <option key={`telegram-mini-group-${reference}`} value={reference}>
                    {formatStoredGroupOptionLabel(group)}
                  </option>
                );
              },
            )}
          </select>
          <div className="telegramControlPage_streamControlsRow">
            <input
              id="nogaPlanner_telegramMiniChatSearch"
              className="telegramControlPage_input"
              type="text"
              value={telegramSearchQuery}
              onChange={(event) => setTelegramSearchQuery(event.target.value)}
              placeholder="Search stored messages"
            />
            <button
              id="nogaPlanner_telegramMiniChatSearchBtn"
              type="button"
              className="telegramControlPage_button telegramControlPage_button--primary"
              onClick={() => searchTelegramStoredMessages()}
              disabled={telegramChatLoading}
            >
              Search
            </button>
          </div>
        </div>
        <div id="nogaPlanner_telegramMiniChatViewer" className="telegramControlPage_streamMessagesPane">
          {telegramChatLoading ? (
            <p className="telegramControlPage_status">Loading messages...</p>
          ) : telegramChatError ? (
            <p className="telegramControlPage_feedback">{telegramChatError}</p>
          ) : telegramMessages.length === 0 ? (
            <p className="telegramControlPage_status">No messages found.</p>
          ) : (
            <div className="telegramControlPage_messageStack">
              {telegramMessages.map((message, index) => {
                const messageKey = String(
                  message?._id || message?.id || `${message?.date || ""}-${index}`,
                );
                const sender = String(
                  message?.senderName ||
                    message?.sender ||
                    message?.from ||
                    message?.author ||
                    "Unknown sender",
                ).trim();
                const text = String(message?.text || "").trim();
                return (
                  <article
                    key={`telegram-mini-message-${messageKey}`}
                    className="telegramControlPage_message telegramControlPage_message--ltr"
                  >
                    <div className="telegramControlPage_messageMeta">
                      <strong>{sender || "Unknown sender"}</strong>
                      <span>{formatTelegramMessageDate(message?.date)}</span>
                    </div>
                    <p className="telegramControlPage_messageText">
                      {text || "(No text content)"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTable = () => (
    <div
      id="nogaPlanner_savedCoursesTableBodyScroll"
      className="nogaPlanner_savedCoursesTableBodyScroll"
      ref={planner.savedCoursesColumnBodyRef}
      onScroll={planner.handleSavedCoursesBodyScroll}
    >
      <table
        id="nogaPlanner_savedCoursesTable"
        className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable"
      >
        {planner.renderSavedCoursesTableColGroup()}
        <thead id="nogaPlanner_savedCoursesTableHead">
          <tr id="nogaPlanner_savedCoursesTableHead_row_1">
            <th id="nogaPlanner_savedCoursesTableHead_courseGroup" colSpan={3}>
              {courseUi.table.courseGroup}
            </th>
            <th
              id="nogaPlanner_savedCoursesTableHead_componentsGroup"
              colSpan={11}
            >
              {courseUi.table.componentsGroup}
            </th>
          </tr>
          <tr id="nogaPlanner_savedCoursesTableHead_row_2">
            <th id="nogaPlanner_savedCoursesTableHead_courseName" rowSpan={3}>
              <span
                className="nogaPlanner_tabTableSortLabel"
                role="button"
                tabIndex={0}
                onClick={() => planner.handleSavedCourseSort("course_name")}
              >
                {renderSavedCourseSortLabel(
                  "course_name",
                  courseFieldLabel("course_name"),
                )}
              </span>
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_courseStatus" rowSpan={3}>
              <span
                className="nogaPlanner_tabTableSortLabel"
                role="button"
                tabIndex={0}
                onClick={() => planner.handleSavedCourseSort("course_status")}
              >
                {renderSavedCourseSortLabel(
                  "course_status",
                  courseFieldLabel("course_status"),
                )}
              </span>
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_courseWeight" rowSpan={3}>
              {courseFieldLabel("course_totalWeight")}
            </th>
            <th
              id="nogaPlanner_savedCoursesTableHead_componentType"
              rowSpan={3}
            >
              <span
                className="nogaPlanner_tabTableSortLabel"
                role="button"
                tabIndex={0}
                onClick={() => planner.handleSavedCourseSort("course_class")}
              >
                {renderSavedCourseSortLabel(
                  "course_class",
                  courseFieldLabel("course_classSelection"),
                )}
              </span>
            </th>
            <th
              id="nogaPlanner_savedCoursesTableHead_componentStatus"
              rowSpan={3}
            >
              {courseFieldLabel("component_status")}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_timingGroup" colSpan={4}>
              {courseUi.table.timing}
            </th>
            <th
              id="nogaPlanner_savedCoursesTableHead_scheduleGroup"
              colSpan={2}
            >
              {courseUi.editor.scheduleGroupTitle}
            </th>
            <th
              id="nogaPlanner_savedCoursesTableHead_locationGroup"
              colSpan={2}
            >
              {courseUi.editor.locationGroupTitle}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_grade" rowSpan={3}>
              {courseFieldLabel("course_grade")}
            </th>
          </tr>
          <tr id="nogaPlanner_savedCoursesTableHead_row_3">
            <th
              id="nogaPlanner_savedCoursesTableHead_normativeGroup"
              colSpan={2}
            >
              {courseUi.table.normative}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_actualGroup" colSpan={2}>
              {courseUi.table.actual}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_day" rowSpan={2}>
              {courseFieldLabel("course_daySelection")}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_time" rowSpan={2}>
              {courseFieldLabel("course_timeSelection")}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_building" rowSpan={2}>
              {courseFieldLabel("course_locationBuilding")}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_room" rowSpan={2}>
              {courseFieldLabel("course_locationRoom")}
            </th>
          </tr>
          <tr id="nogaPlanner_savedCoursesTableHead_row_4">
            <th id="nogaPlanner_savedCoursesTableHead_normativeYear">
              {courseUi.table.academicYear}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_normativeTerm">
              {courseUi.table.term}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_actualYear">
              {courseUi.table.academicYear}
            </th>
            <th id="nogaPlanner_savedCoursesTableHead_actualTerm">
              {courseUi.table.term}
            </th>
          </tr>
        </thead>
        <tbody id="nogaPlanner_savedCoursesTableBody">
          {renderSavedCourses.length === 0 ? (
            <tr id="nogaPlanner_savedCoursesTableBody_emptyRow">
              <td
                id="nogaPlanner_savedCoursesTableBody_emptyCell"
                colSpan={14}
                className="nogaPlanner_savedCoursesEmpty"
              >
                {courseUi.table.empty}
              </td>
            </tr>
          ) : (
            groupedRows.map((group) =>
              group.map((course, groupIndex) => {
                const courseId = String(course?._id || "").trim();
                const courseGroupKey = getCourseNameGroupKey(course);
                const isSelected =
                  selectedIds.includes(courseId) ||
                  selectedComponentId === courseId ||
                  selectedDetailsComponent === courseId;
                const isGroupHovered =
                  courseGroupKey &&
                  String(hoveredCourseGroupKey || "").trim() === courseGroupKey;
                const scheduleParts = splitScheduleParts(
                  course?.course_dayAndTime,
                );
                const rowClassName =
                  "nogaPlanner_tabTableRow" +
                  (isGroupHovered ? " hovered" : "") +
                  (isSelected ? " selected" : "") +
                  (course.__draft ? " nogaPlanner_tabTableRow--draft" : "");
                return (
                  <tr
                    id={`nogaPlanner_savedCoursesTableBody_row_${courseId || groupIndex}`}
                    key={
                      courseId ||
                      `${buildSavedCourseGroupKey(course)}-${groupIndex}`
                    }
                    className={rowClassName}
                  >
                    {groupIndex === 0 ? (
                      <>
                        <td
                          rowSpan={group.length}
                          className={
                            "nogaPlanner_savedCoursesTableCell--merged" +
                            (isSelected
                              ? " nogaPlanner_savedCoursesTableCell--mergedSelected"
                              : "")
                          }
                          onMouseEnter={() =>
                            setHoveredCourseGroupKey(courseGroupKey)
                          }
                          onMouseLeave={() => setHoveredCourseGroupKey("")}
                          onClick={() =>
                            !course.__draft &&
                            planner.handleSavedCourseGroupClick(course, group)
                          }
                        >
                          {formatSavedCourseTitle(course)}
                        </td>
                        <td
                          rowSpan={group.length}
                          className="nogaPlanner_savedCoursesTableCell--courseStatusMerged"
                        >
                          {formatPlannerStatusLabel(group[0]?.course_status)}
                        </td>
                        <td
                          rowSpan={group.length}
                          className="nogaPlanner_savedCoursesTableCell--courseWeightMerged"
                        >
                          {formatCourseWeightDisplay(
                            group[0]?.course_totalWeight,
                          )}
                        </td>
                      </>
                    ) : null}
                    <td>{course?.course_class || "-"}</td>
                    <td>
                      {formatPlannerStatusLabel(course?.component_status)}
                    </td>
                    <td>{course?.normativeCourseYearInterval || "-"}</td>
                    <td>
                      {formatAcademicTermDisplay(course?.normativeCourseTerm) ||
                        "-"}
                    </td>
                    <td>{course?.actualCourseYearInterval || "-"}</td>
                    <td>
                      {formatAcademicTermDisplay(course?.actualCourseTerm) ||
                        "-"}
                    </td>
                    <td>{scheduleParts.day}</td>
                    <td>{scheduleParts.time}</td>
                    <td>
                      {String(
                        course?.course_locationBuilding ||
                          course?.course_location?.building ||
                          "",
                      ).trim() || "-"}
                    </td>
                    <td>
                      {String(
                        course?.course_locationRoom ||
                          course?.course_location?.room ||
                          "",
                      ).trim() || "-"}
                    </td>
                    <td>{course?.course_grade || "-"}</td>
                  </tr>
                );
              }),
            )
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section
      id="nogaPlanner_savedCoursesColumn"
      className="nogaPlanner_homeSoulPanel"
      ref={planner.savedCoursesColumnRef}
    >
      {showCourseEditor ? renderSavedCourseEditorPanel() : null}
      {isLecturesTab && inlineLectureRowVisible ? (
        planner.renderSelectedCourseLecturesTable("form")
      ) : null}
      <div
        id="nogaPlanner_coursesTitleRow"
        className="nogaPlanner_coursesTitleRow"
        ref={planner.savedCoursesColumnHeaderRef}
      >
        <div
          id="nogaPlanner_coursesTitleTextWrap"
          className="nogaPlanner_coursesTitleTextWrap"
        >
            {logoAssetsReady ? (
              <img
                ref={logoImageRef}
                id="nogaPlanner_coursesEyebrowLogo"
                src={
                  LOGO_BY_CLOCK_POSITION[String(logoClockPosition || "").trim()] ||
                  "/img/NP9.png"
                }
                alt={NOGAPLANNER_TEXT.common.appEyebrow}
                loading="eager"
                fetchpriority="high"
                decoding="async"
              />
            ) : (
              <div
                id="nogaPlanner_coursesEyebrowLogoLoader"
                className="nogaPlanner_coursesEyebrowLogoLoader"
                aria-label="Loading logo images"
              />
            )}
        </div>
        {renderWrapperTabs()}
      </div>
      {renderTelegramChatPanel()}
      {isSettingsTab || plannerSettingsVisible ? (
        <NogaPlannerSettings planner={planner} runtime={runtime} />
      ) : (
        <div
          id="nogaPlanner_savedCoursesWorkspace"
          className={
            "nogaPlanner_savedCoursesWorkspace" +
            (showCourseEditor ? " nogaPlanner_savedCoursesWorkspace--editorOpen" : "")
          }
        >
          {hasActivePlannerTab ? (
            <div
              id="nogaPlanner_savedCoursesWorkspaceTitle"
              className="nogaPlanner_savedCoursesWorkspaceTitle"
            >
              <p>{activeWorkspaceTabTitle}</p>
              {messageFromFriendText ? (
                <div className="nogaPlanner_savedCoursesWorkspaceFriendMessageWrapper">
                  <p>
                    {messageFromFriendText}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {!hasActivePlannerTab ? null : isLecturesTab ? (
            planner.renderSelectedCourseLecturesTable(
              inlineLectureRowVisible ? "table" : "full",
            )
          ) : planner.state?.wrapperTab === "exams" ? (
            planner.renderSelectedCourseExamBoard(true)
          ) : (
            <>
              {shouldShowSelectedCourseLectures
                ? planner.renderSelectedCourseLecturesTable()
                : renderTable()}
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default NogaPlannerSavedCoursesPanel;

