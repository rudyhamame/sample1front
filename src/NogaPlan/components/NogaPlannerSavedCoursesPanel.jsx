import React, { useEffect, useRef, useState } from "react";
import { apiUrl } from "../../config/api";
import "../../telegramControlPage.css";
import {
  getPlannerCountdownEndDate,
  isPlannerActive,
  PLANNER_COUNTDOWN_EVENT,
  PLANNER_ACTIVE_EVENT,
} from "../plannerCountdown";

const NogaPlannerSavedCoursesPanel = ({ planner, runtime, shellOnly = false, shellVisible = true }) => {
  const [coursesMiniBarActionsLeft, setCoursesMiniBarActionsLeft] =
    useState("50%");
  const [isMiniBarActionsVisible, setIsMiniBarActionsVisible] = useState(false);
  const [noAttendanceForComponent, setNoAttendanceForComponent] = useState(false);
  const [hoveredCourseGroupKey, setHoveredCourseGroupKey] = useState("");
  const [telegramChatOpen, setTelegramChatOpen] = useState(false);
  const [telegramStoredGroups, setTelegramStoredGroups] = useState([]);
  const [telegramSelectedGroupReference, setTelegramSelectedGroupReference] =
    useState("");
  const [telegramSearchQuery, setTelegramSearchQuery] = useState("");
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramChatLoading, setTelegramChatLoading] = useState(false);
  const [telegramUpdateLoading, setTelegramUpdateLoading] = useState(false);
  const [telegramChatError, setTelegramChatError] = useState("");
  const [showNewCourseToolbar, setShowNewCourseToolbar] = useState(false);
  const [telegramChatFrame, setTelegramChatFrame] = useState({
    top: 84,
    right: 16,
    width: 480,
    height: 620,
    zIndex: 28,
  });
  const [countdownEndIso, setCountdownEndIso] = useState(() => getPlannerCountdownEndDate());
  const [countdownActive, setCountdownActive] = useState(() => isPlannerActive());
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  useEffect(() => {
    const onActive = (e) => {
      setCountdownActive(Boolean(e?.detail?.active));
      setCountdownEndIso(e?.detail?.endIso || null);
    };
    const onChange = (e) => setCountdownEndIso(e?.detail?.endIso || null);
    window.addEventListener(PLANNER_ACTIVE_EVENT, onActive);
    window.addEventListener(PLANNER_COUNTDOWN_EVENT, onChange);
    const ticker = setInterval(() => setCountdownNowMs(Date.now()), 60000);
    return () => {
      window.removeEventListener(PLANNER_ACTIVE_EVENT, onActive);
      window.removeEventListener(PLANNER_COUNTDOWN_EVENT, onChange);
      clearInterval(ticker);
    };
  }, []);
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
  const coursesMiniBarTabsRef = useRef(null);
  const previousWrapperTabRef = useRef(String(planner.state?.wrapperTab || ""));
  const {
    formatPlannerStatusLabel,
    formatSavedCourseTitle,
    splitCourseTextList,
    buildSavedCourseComponentEntryFromDraft,
    formatCourseLocationDisplay,
    formatAcademicTermDisplay,
    HOUR_OPTIONS,
    TERM_OPTIONS,
    SAVED_COMPONENT_CLASS_OPTIONS,
    ACADEMIC_YEAR_OPTIONS,
    buildDefaultPlannerWeekdayOptions,
    getPlannerDefaultFieldsForForm,
    getPlannerFieldDefaultValue,
    NOGAPLANNER_TEXT,
  } = runtime;
  const SAVED_TEXT = NOGAPLANNER_TEXT.savedCourses;
  const WRAPPER_TABS = [
    {
      key: "home",
      label: "Home",
      icon: "fi fi-rr-house-blank",
    },
    {
      key: "traces",
      label: "Study",
      icon: "fi fi-rr-folder",
    },
    {
      key: "youtube-text",
      label: "YouTube to Text",
      icon: "fi fi-rr-play-alt",
    },
    {
      key: "plan",
      label: NOGAPLANNER_TEXT.studyPlan.title,
      icon: "fi fi-rr-calendar-clock",
    },
    {
      key: "ai",
      label: NOGAPLANNER_TEXT.wrapperTabs.aiHelper,
      icon: "fi fi-rr-sparkles",
    },
  ];
  const settingsTabEntry = {
    key: "settings",
    label: SAVED_TEXT.plannerSettings,
    icon: "fi fi-rr-holding-hand-gear",
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
  const activeWrapperTab = String(planner.state?.wrapperTab || "").trim();
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
  const showCourseEditor = savedCourseEditorVisible;
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
  const isNewCourseToolbarDraftReady = Boolean(
    String(savedCourseDraft?.course_name || "").trim() &&
      String(savedCourseDraft?.course_code || "").trim() &&
      String(
        savedCourseDraft?.course_classSelection ||
          savedCourseDraft?.course_class ||
          "",
      ).trim(),
  );
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

  const updateTelegramGroup = async () => {
    const groupReference = String(telegramSelectedGroupReference || "").trim();
    if (!plannerToken) {
      setTelegramChatError("Telegram login token is missing.");
      return;
    }
    if (!groupReference) {
      setTelegramChatError("Choose a stored group first.");
      return;
    }
    setTelegramUpdateLoading(true);
    setTelegramChatError("");
    try {
      const response = await fetch(
        apiUrl(`/api/telegram/stored-groups/${encodeURIComponent(groupReference)}/sync`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ syncEnabled: true }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update Telegram group.");
      }
      await searchTelegramStoredMessages(groupReference);
    } catch (nextError) {
      setTelegramChatError(nextError?.message || "Unable to update Telegram group.");
    } finally {
      setTelegramUpdateLoading(false);
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
    if (planner.state.wrapperTab === tabKey) {
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
  useEffect(() => {
    const updateCoursesMiniBarActionsPosition = () => {
      const tabsContainer = coursesMiniBarTabsRef.current;
      if (!tabsContainer) {
        setCoursesMiniBarActionsLeft("50%");
        return;
      }
      const activeTabButton = tabsContainer.querySelector(
        '[data-main-tab-button="true"][data-wrapper-tab-active="true"]',
      );
      if (!activeTabButton) {
        setCoursesMiniBarActionsLeft("50%");
        return;
      }
      const titleRowContainer = tabsContainer.closest("#nogaPlanner_shellAside");
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

  const courseUi = NOGAPLANNER_TEXT.savedCourses || {};
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
      getPlannerFieldDefaultValue(
        plannerSelectSettings?.fieldDefaults,
        "course",
        fieldKey,
      ) || "",
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
      fieldKey
        ? getPlannerFieldDefaultValue(
            plannerSelectSettings?.fieldDefaults,
            "course",
            fieldKey,
          )
        : "",
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
    String(savedCourseDraft?.normativeCourseYearInterval || "").trim() || "";
  const savedCourseProfileNormativeTerm = String(
    savedCourseDraft?.normativeCourseTerm || "",
  ).trim();
  const savedCourseProfileActualAcademicYear =
    String(
      savedCourseDraft?.actualCourseYearInterval ||
        planner.props.state?.studying?.time?.currentAcademicYear ||
        planner.props.state?.studying?.currentAcademicYear ||
        planner.props.state?.profile?.studying?.time?.currentAcademicYear ||
        planner.props.state?.profile?.studying?.currentAcademicYear ||
        planner.props.state?.currentAcademicYear ||
        "",
    ).trim() || "";
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
              {renderSavedCourseFieldEyebrow("Name", {
                fieldName: "course_name",
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_name"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={savedCourseDraft.course_name}
                onChange={(event) =>
                  planner.handleSavedCourseDraftChange("course_name", event.target.value)
                }
                placeholder="Name"
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow(courseFieldLabel("course_code"), {
                fieldName: "course_code",
              })}
              <input
                id="nogaPlanner_savedCourseInput_course_code"
                className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
                type="text"
                value={savedCourseDraft.course_code}
                readOnly
                placeholder={courseFieldLabel("course_code")}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow("Status", {
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
                placeholder="Status"
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorFieldCluster">
              {renderSavedCourseFieldEyebrow("Weight", {
                fieldName: "course_totalWeight",
              })}
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
                placeholder="Weight"
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
                    : "Complete the course name, code, status, and course weight first"
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
                  <span>No attendance for this component</span>
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
                    No entries yet, add one
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
      <>
        <div
          id="nogaPlanner_coursesMiniBar"
          className="nogaPlanner_coursesMiniBar"
        >
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
        <div
          id="nogaPlanner_wrapperTabsAside"
          className="nogaPlanner_wrapperTabsAside"
          ref={coursesMiniBarTabsRef}
        >
          {WRAPPER_TABS.map((tabEntry) => (
            <button
              key={`wrapper-tab-${tabEntry.key}`}
              id={`nogaPlanner_wrapperTabBtn_${tabEntry.key}`}
              type="button"
              className="nogaPlanner_wrapperTabBtn"
              data-main-tab-button="true"
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
          <button
            id="nogaPlanner_wrapperTabBtn_settings"
            type="button"
            className="nogaPlanner_wrapperTabBtn"
            onClick={() => handleWrapperTabButtonClick(settingsTabEntry.key)}
            aria-label={settingsTabEntry.label}
            title={settingsTabEntry.label}
          >
            <span className="nogaPlanner_wrapperTabBtnIconLabel">
              <i className={settingsTabEntry.icon} />
              <span>{settingsTabEntry.label}</span>
            </span>
          </button>
        </div>
      </>
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
              disabled={telegramChatLoading || telegramUpdateLoading}
            >
              Search
            </button>
            <button
              id="nogaPlanner_telegramMiniChatUpdateBtn"
              type="button"
              className="telegramControlPage_button"
              onClick={updateTelegramGroup}
              disabled={telegramUpdateLoading || telegramChatLoading || !telegramSelectedGroupReference}
            >
              {telegramUpdateLoading ? "Updating..." : "Update"}
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
                const hasArabic = (str) => /[؀-ۿ]/.test(str);
                const senderIsArabic = hasArabic(sender);
                const textIsArabic = hasArabic(text);
                return (
                  <article
                    key={`telegram-mini-message-${messageKey}`}
                    className="telegramControlPage_message telegramControlPage_message--ltr"
                  >
                    <div className="telegramControlPage_messageMeta">
                      <strong
                        className={senderIsArabic ? "nogaPlanner_arabicText" : undefined}
                        dir={senderIsArabic ? "rtl" : undefined}
                      >
                        {sender || "Unknown sender"}
                      </strong>
                      <span>{formatTelegramMessageDate(message?.date)}</span>
                    </div>
                    <p
                      className={`telegramControlPage_messageText${textIsArabic ? " nogaPlanner_arabicText" : ""}`}
                      dir={textIsArabic ? "rtl" : undefined}
                    >
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

  if (shellOnly) {
    let shellCountdownValue = null;
    let shellCountdownLabel = "To end:";
    if (countdownActive && countdownEndIso) {
      let endDate = new Date(`${countdownEndIso}T23:59:59`);
      if (Number.isNaN(endDate.getTime()) && /^\d{4}$/.test(countdownEndIso)) {
        endDate = new Date(`${countdownEndIso}-12-31T23:59:59`);
      }
      if (!Number.isNaN(endDate.getTime())) {
        const diffMs = endDate.getTime() - countdownNowMs;
        const isPast = diffMs < 0;
        const absDiffMs = Math.abs(diffMs);
        const totalMins = Math.floor(absDiffMs / 60000);
        const totalHours = Math.floor(totalMins / 60);
        const totalDays = Math.floor(totalHours / 24);
        const months = Math.floor(totalDays / 30.44);
        const remDays = Math.floor(totalDays - months * 30.44);
        const weeks = Math.floor(remDays / 7);
        const days = remDays % 7;
        const hours = totalHours % 24;
        const mins = totalMins % 60;
        shellCountdownLabel = isPast ? "Since end:" : "To end:";
        shellCountdownValue = `${months}mo — ${weeks}w — ${days}d — ${hours}h — ${mins}m`;
      }
    }
    return (
      <aside
        id="nogaPlanner_shellAside"
        className="nogaPlanner_homeSoulPanel"
        ref={planner.savedCoursesColumnHeaderRef}
        style={{ display: shellVisible ? "flex" : "none" }}
      >
        {countdownActive ? (
          <div id="nogaPlanner_shellAsideCountdown" className="nogaPlanner_shellAsideCountdown">
            <span className="nogaPlanner_shellAsideCountdownLabel">{shellCountdownLabel}</span>
            <span className="nogaPlanner_shellAsideCountdownValue">{shellCountdownValue || "—"}</span>
          </div>
        ) : null}
        {renderWrapperTabs()}
      </aside>
    );
  }

  return (
    <>
      {showCourseEditor ? renderSavedCourseEditorPanel() : null}
      {messageFromFriendText ? (
        <div className="nogaPlanner_savedCoursesWorkspaceFriendMessageWrapper">
          <p>{messageFromFriendText}</p>
        </div>
      ) : null}
    </>
  );
};

export default NogaPlannerSavedCoursesPanel;
