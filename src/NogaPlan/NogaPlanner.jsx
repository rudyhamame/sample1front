//..............IMPORT................
import React, { Component } from "react";
import ReactDOM from "react-dom";
import "./nogaPlanner.css";
import "./nogaPlanner.dark.css";
import { apiUrl } from "../config/api";
import { normalizeMemoryPayload } from "../utils/backendUser";
import NogaPlannerLecturesTablePanel from "./components/NogaPlannerLecturesTablePanel";
import NogaPlannerSavedCoursesPanel from "./components/NogaPlannerSavedCoursesPanel";
import NogaPlannerExamBoardPanel from "./components/NogaPlannerExamBoardPanel";
import NogaPlannerAIHelperPanel from "./components/NogaPlannerAIHelperPanel";
import NogaPlannerStudyPlanPanel from "./components/NogaPlannerStudyPlanPanel";
import NogaPlannerSettings from "./components/NogaPlannerSettings";
import NogaPlannerTelegramPanel from "./components/NogaPlannerTelegramPanel";
import * as plannerRuntimeHelpers from "./lib/plannerRuntime";
import { updatePlannerCountdownEndDate, setPlannerActive } from "./plannerCountdown";
var courses = [];
var lectures = [];
var courses_partOfPlan = [];
var course_pages = [];
var checkedLectures = [];
var checkedCourses = [];
var courseNames = [];
var courseNames_filtered = [];
var courseInstructorsNames = [];
var courseInstructorsNames_filtered = [];
const {
  toSafeNumber,
  getDefaultPlannerLocale,
  getSafePlannerCourses,
  getSafePlannerLectures,
  getSafePagesPerDay,
  getPrimaryCourseExam,
  normalizeCourseDuplicateKeyPart,
  buildCourseDuplicateKey,
  formatExamDateParts,
  buildExamDateValue,
  getPlannerTermRank,
  getAcademicYearSortValue,
  normalizeProgramYearValue,
  getProgramYearSortValue,
  getComparableProgramYearNumber,
  formatExamTimeParts,
  buildExamTimeValue,
  TELEGRAM_PENDING_VALUE,
  TELEGRAM_COURSE_PAYLOAD_FIELDS,
  isPendingCourseValue,
  hasMeaningfulCourseFieldValue,
  formatCourseScheduleDisplay,
  formatCourseStringListDisplay,
  formatCourseLocationDisplay,
  formatPlannerStatusLabel,
  detectContentDirection,
  getCellAlignmentStyle,
  formatCourseComponentLabel,
  mergeCoursePayloadWithAiResult,
  splitCourseTextList,
  splitPlannerTextList,
  formatPlannerTextList,
  getDefaultInlineCourseDraft,
  getDefaultSavedCourseDraft,
  buildSavedCourseComponentEntryFromDraft,
  getDefaultInlineLectureDraft,
  EXAM_WEIGHT_UNIT_OPTIONS,
  EXAM_GRADE_UNIT_OPTIONS,
  EXAM_VOLUME_UNIT_OPTIONS,
  EXAM_RECOMMENDATION_TIMING_OPTIONS,
  EXAM_RECOMMENDATION_INTENSITY_OPTIONS,
  getDefaultExamDraft,
  normalizeExamEntryForPlanner,
  buildExamDraftFromEntry,
  buildExamEntryFromDraft,
  formatExamTimingDisplay,
  formatExamVolumeDisplay,
  formatExamWeightDisplay,
  formatExamGradeDisplay,
  formatExamRecommendationDisplay,
  buildAcademicYearOptions,
  ACADEMIC_YEAR_OPTIONS,
  normalizeAcademicYearValue,
  formatAcademicTermDisplay,
  formatAcademicYearAndTerm,
  TERM_OPTIONS,
  WEEKDAY_OPTIONS,
  HOUR_OPTIONS,
  SAVED_COMPONENT_CLASS_OPTIONS,
  getPlannerDefaultFieldsForForm,
  buildDefaultPlannerWeekdayOptions,
  buildDefaultPlannerSelectSettings,
  getDefaultPlannerRelationshipDraft,
  createPlannerSettingsRelationshipId,
  normalizePlannerSettingsStringList,
  normalizePlannerRelationshipEntry,
  normalizePlannerSelectSettings,
  getDefaultInlineComponentDraft,
  getEditableCourseDraft,
  buildCoursePayloadFromDraft,
  formatSavedCourseTitle,
  formatSavedCourseComponent,
  buildSavedCourseGroupKey,
  buildCourseComponentPickerLabel,
  buildCourseLectureMatchLabel,
  getCourseDueText,
  COURSE_PRINT_SOUND_START_OFFSET,
  COURSE_PRINT_SOUND_BASE_DURATION,
  NAGHAM_COURSE_LETTERS_STORAGE_KEY,
  NAGHAM_COURSE_LIST_STORAGE_KEY,
  SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
  DEFAULT_NAGHAM_COURSE_LETTER,
  TELEGRAM_DISPLAY_TIMEZONE,
  TELEGRAM_LECTURE_STOP_WORDS,
  normalizeTelegramSearchText,
  normalizeLectureCorrections,
  NOGAPLANNER_TEXT,
} = plannerRuntimeHelpers;
const NOGAPLANNER_PANEL_RUNTIME = {
  ReactDOM,
  apiUrl,
  normalizeMemoryPayload,
  ...plannerRuntimeHelpers,
};
const normalizeInstructorEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") {
    const normalizedValue = entry.trim();
    if (!normalizedValue) return null;
    const splitIndex = normalizedValue.indexOf(" ");
    return splitIndex === -1
      ? { firstName: normalizedValue, lastName: "" }
      : {
          firstName: normalizedValue.slice(0, splitIndex).trim(),
          lastName: normalizedValue.slice(splitIndex + 1).trim(),
        };
  }
  const firstName = String(entry?.firstName || "").trim();
  const lastName = String(entry?.lastName || "").trim();
  if (!firstName && !lastName) return null;
  return { firstName, lastName };
};

const formatInstructorDisplayName = (entry) => {
  const normalizedEntry = normalizeInstructorEntry(entry);
  if (!normalizedEntry) return "";
  return [normalizedEntry.firstName, normalizedEntry.lastName]
    .filter(Boolean)
    .join(" ");
};

export default class NogaPlanner extends Component {
  plannerLanguageOptions = [
    "Arabic",
    "Bengali",
    "Chinese",
    "Danish",
    "Dutch",
    "English",
    "Finnish",
    "French",
    "German",
    "Greek",
    "Hebrew",
    "Hindi",
    "Hungarian",
    "Indonesian",
    "Italian",
    "Japanese",
    "Korean",
    "Malay",
    "Norwegian",
    "Persian",
    "Polish",
    "Portuguese",
    "Romanian",
    "Russian",
    "Spanish",
    "Swedish",
    "Tagalog",
    "Thai",
    "Turkish",
    "Ukrainian",
    "Urdu",
    "Vietnamese",
  ];
  extractPlannerRootFromState = (state = {}) => {
    const stateObject = state && typeof state === "object" ? state : {};
    if (
      stateObject?.memory?.MOI?.studyPlanner &&
      typeof stateObject.memory.MOI.studyPlanner === "object"
    ) {
      return stateObject.memory.MOI.studyPlanner;
    }
    if (Array.isArray(stateObject?.memory?.MOI)) {
      const legacyMoiEntry = stateObject.memory.MOI.find(
        (entry) =>
          entry?.studyPlanner && typeof entry.studyPlanner === "object",
      );
      if (legacyMoiEntry?.studyPlanner) {
        return legacyMoiEntry.studyPlanner;
      }
    }
    if (
      stateObject?.memory?.studyPlanner &&
      typeof stateObject.memory.studyPlanner === "object"
    ) {
      return stateObject.memory.studyPlanner;
    }
    if (
      stateObject?.studyPlanner &&
      typeof stateObject.studyPlanner === "object"
    ) {
      return stateObject.studyPlanner;
    }
    return {};
  };
  getPrimaryProgramFailingRule = (plannerRoot = {}) => {
    const plannerRootObject =
      plannerRoot && typeof plannerRoot === "object" ? plannerRoot : {};
    const failingRules = this.normalizeProgramFailingRuleEntries(
      plannerRootObject?.programFailingRules,
    );
    const firstFailingRule = failingRules.find(
      (entry) => entry && typeof entry === "object",
    );
    if (firstFailingRule) {
      return firstFailingRule;
    }
    return plannerRootObject?.programPassingThresholdPerInterval &&
      typeof plannerRootObject.programPassingThresholdPerInterval === "object"
      ? plannerRootObject.programPassingThresholdPerInterval
      : {};
  };
  normalizeProgramFailingRuleDraftValue = (entry = null) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const thresholdMode = String(entry?.thresholdMode || "").trim();
    const thresholdUnit = String(entry?.thresholdUnit || "").trim();
    const thresholdNumber = String(entry?.thresholdNumber ?? "").trim();
    const thresholdRule = String(entry?.thresholdRule || "").trim();
    if (!thresholdMode && !thresholdUnit && !thresholdNumber) {
      return null;
    }
    return {
      thresholdMode,
      thresholdUnit,
      thresholdNumber,
      thresholdRule,
    };
  };
  buildProgramFailingRuleDraftKey = (entry = {}) =>
    [
      String(entry?.thresholdMode || "").trim(),
      String(entry?.thresholdUnit || "").trim(),
      String(entry?.thresholdNumber ?? "").trim(),
      String(entry?.thresholdRule || "").trim(),
    ].join("|");
  normalizeProgramFailingRuleEntries = (value = null) =>
    Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? [value]
        : [];
  normalizeProgramComponentWeightValue = (value = "") => {
    const normalizedValue = String(value || "").trim();
    const loweredValue = normalizedValue.toLowerCase();
    if (
      !normalizedValue ||
      loweredValue === "undefined" ||
      loweredValue === "null" ||
      normalizedValue === "-"
    ) {
      return "";
    }
    return normalizedValue;
  };
  normalizeProgramComponentValue = (entry = null) => {
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      return String(entry).trim();
    }
    if (!entry || typeof entry !== "object") {
      return "";
    }
    const rawValue =
      entry?.componentClass ??
      entry?.componentName ??
      entry?.componentId ??
      entry?.label ??
      "";
    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      return String(rawValue).trim();
    }
    return "";
  };
  buildProgramFailingRulesPayload = ({
    thresholdMode = "",
    thresholdUnit = "",
    thresholdNumber = null,
    thresholdRule = "",
  } = {}) => {
    const normalizedThresholdMode = String(thresholdMode || "").trim();
    const normalizedThresholdUnit = String(thresholdUnit || "").trim();
    const normalizedThresholdNumber = Number(thresholdNumber);
    const normalizedThresholdRule = String(thresholdRule || "").trim();
    return [
      {
        thresholdMode: normalizedThresholdMode,
        thresholdUnit: normalizedThresholdUnit,
        thresholdNumber: Number.isFinite(normalizedThresholdNumber)
          ? normalizedThresholdNumber
          : null,
        thresholdRule: normalizedThresholdRule || null,
      },
    ];
  };
  plannerInputHistoryStorageKey = "nogaPlanner.inputHistory.v1";
  plannerInputHistory = {};
  plannerPendingInputHistory = {};
  plannerPredictionToolSyncTimeout = null;
  plannerPredictionToolActivityFieldId = "__activity__";
  plannerViewportMetaElement = null;
  plannerViewportMetaOriginalContent = "";
  beginPlannerPending = (label = "Working...") => {
    this.setState((previousState) => ({
      plannerPendingRequests:
        Number(previousState?.plannerPendingRequests || 0) + 1,
      plannerPendingLabel: String(label || "Working...").trim() || "Working...",
    }));
  };
  endPlannerPending = () => {
    this.setState((previousState) => {
      const nextPendingRequests = Math.max(
        0,
        Number(previousState?.plannerPendingRequests || 0) - 1,
      );
      return {
        plannerPendingRequests: nextPendingRequests,
        plannerPendingLabel:
          nextPendingRequests > 0
            ? String(previousState?.plannerPendingLabel || "Working...")
            : "",
      };
    });
  };
  runPlannerPendingTask = async (label = "Working...", task = null) => {
    this.beginPlannerPending(label);
    try {
      return await task?.();
    } finally {
      this.endPlannerPending();
    }
  };
  getPlannerStudyPlanAid = () => {
    const localStudyPlanAid =
      this.state?.studyPlanAid && typeof this.state.studyPlanAid === "object"
        ? this.state.studyPlanAid
        : null;
    if (localStudyPlanAid) {
      return localStudyPlanAid;
    }
    const propsStudyPlanAid =
      this.props?.state?.studyPlanAid &&
      typeof this.props.state.studyPlanAid === "object"
        ? this.props.state.studyPlanAid
        : this.props?.state?.studyPlanner?.studyPlanAid &&
            typeof this.props.state.studyPlanner.studyPlanAid === "object"
          ? this.props.state.studyPlanner.studyPlanAid
          : this.props?.state?.memory?.MOI?.studyPlanner?.studyPlanAid &&
              typeof this.props.state.memory.MOI.studyPlanner.studyPlanAid ===
                "object"
            ? this.props.state.memory.MOI.studyPlanner.studyPlanAid
            : {};
    return propsStudyPlanAid;
  };
  setPlannerStudyPlanAidState = (nextStudyPlanAid = {}) => {
    const nextValue =
      nextStudyPlanAid && typeof nextStudyPlanAid === "object"
        ? nextStudyPlanAid
        : {};
    this.setState({ studyPlanAid: nextValue });
    return nextValue;
  };
  persistStudyPlanAid = async (nextStudyPlanAid = {}) => {
    return this.runPlannerPendingTask("Saving study plan aid...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      if (!userId || !token) {
        throw new Error(
          "Failed to save study plan aid: login data is incomplete.",
        );
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlanAid/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextStudyPlanAid || {}),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save study plan aid (${response.status}).`,
          ),
        );
      }
      return (
        payload?.updatedStudyPlanAid ||
        payload?.studyPlanAid ||
        nextStudyPlanAid
      );
    });
  };
  persistStudyPlannerProgram = async (nextProgramId = "") => {
    return this.runPlannerPendingTask("Saving program...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const programId = String(nextProgramId || "").trim();
      if (!userId || !token) {
        throw new Error("Failed to save program: login data is incomplete.");
      }
      if (!programId) {
        throw new Error("Program ID is required.");
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerProgram/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ programID: programId }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message || `Failed to save program (${response.status}).`,
          ),
        );
      }
      return payload?.studyPlanner || {};
    });
  };
  persistStudyPlannerMeta = async (nextMeta = {}) => {
    return this.runPlannerPendingTask("Saving planner details...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedMeta =
        nextMeta && typeof nextMeta === "object" ? nextMeta : {};
      if (!userId || !token) {
        throw new Error(
          "Failed to save planner details: login data is incomplete.",
        );
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerMeta/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(normalizedMeta),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save planner details (${response.status}).`,
          ),
        );
      }
      return payload?.studyPlanner || {};
    });
  };
  cancelHomeProgramEditor = () => {
    this.setState({
      homeProgramSetEditorOpen: false,
      homeProgramIdDraft: "",
      homeProgramNameEditorOpen: false,
      homeProgramNameDraft: "",
    });
  };
  cancelHomeProgramNameEditor = () => {
    this.setState({ homeProgramNameEditorOpen: false, homeProgramNameDraft: "" });
  };
  handleHomeProgramNameSetSubmit = async () => {
    const programName = String(this.state?.homeProgramNameDraft || "").trim();
    if (!programName) {
      this.props.serverReply?.("Enter program name first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({ programName });
      this.setState({
        plannerRoot: nextPlannerRoot && typeof nextPlannerRoot === "object" ? nextPlannerRoot : this.state?.plannerRoot || {},
        homeProgramNameEditorOpen: false,
      });
      this.props.serverReply?.("Program name set.");
    } catch (error) {
      this.props.serverReply?.(String(error?.message || "Failed to set program name."));
    }
  };
  cancelHomeProgramInstructorsEditor = () => {
    this.setState({
      homeProgramInstructorsSetEditorOpen: false,
      homeProgramInstructorFirstNameInput: "",
      homeProgramInstructorLastNameInput: "",
      homeProgramInstructorsDraftList: Array.isArray(
        this.state?.plannerRoot?.programInstructors,
      )
        ? this.state.plannerRoot.programInstructors
        : [],
    });
  };
  cancelHomeProgramEditorsEditor = () => {
    this.setState({
      homeProgramEditorsSetEditorOpen: false,
      homeProgramEditorInput: "",
      homeProgramEditorsDraftList: Array.isArray(
        this.state?.homeProgramEditorsDraftList,
      )
        ? this.state.homeProgramEditorsDraftList
        : [],
    });
  };
  cancelHomeProgramLocationsEditor = () => {
    this.setState({
      homeProgramLocationsSetEditorOpen: false,
      homeProgramLocationBuildingInput: "",
      homeProgramLocationRoomInputs: {},
      homeProgramLocationsDraftList: Array.isArray(
        this.state?.homeProgramLocationsDraftList,
      )
        ? this.state.homeProgramLocationsDraftList
        : [],
    });
  };
  cancelHomeLanguageEditor = () => {
    this.setState({
      homeLanguageEditorOpen: false,
      homeLanguageDraft: "",
    });
  };
  cancelHomeUniversityEditor = () => {
    this.setState({
      homeUniversityEditorOpen: false,
      homeUniversityDraft: "",
    });
  };
  cancelHomeFacultyEditor = () => {
    this.setState({
      homeFacultyEditorOpen: false,
      homeFacultyDraft: "",
    });
  };
  cancelHomeProgramStartYearEditor = () => {
    this.setState((previousState) => ({
      homeProgramStartYearEditorOpen: false,
      homeProgramStartYearDraft: String(
        previousState?.homeProgramStartYearValue || "",
      ),
    }));
  };
  cancelHomeProgramTotalYearsEditor = () => {
    this.setState((previousState) => ({
      homeProgramTotalYearsEditorOpen: false,
      homeProgramTotalYearsDraft: String(
        previousState?.homeProgramTotalYearsValue || "",
      ),
    }));
  };
  cancelHomeProgramTermsPerYearEditor = () => {
    this.setState((previousState) => ({
      homeProgramTermsPerYearEditorOpen: false,
      homeProgramTermsPerYearDraft: String(
        previousState?.homeProgramTermsPerYearValue || "",
      ),
    }));
  };

  cancelHomeProgramCurrentIntervalTryNumEditor = () => {
    const stored = this.state?.plannerRoot?.programCurrentIntervalTryNum;
    this.setState({
      homeProgramCurrentIntervalTryNumEditorOpen: false,
      homeProgramCurrentIntervalNumDraft: String(stored?.intervalNum ?? "").trim(),
      homeProgramCurrentIntervalTryNumDraft: String(stored?.intervalTryNum ?? "").trim(),
      homeProgramCurrentSubIntervalNumDraft: String(stored?.subIntervalNum ?? "").trim(),
    });
  };

  syncCurrentIntervalTrySelectionInPlannerRoot = (
    plannerRoot = {},
    intervalNum = null,
    intervalTryNum = null,
    subIntervalNum = null,
    targetSubIntervalId = "",
  ) => {
    const root =
      plannerRoot && typeof plannerRoot === "object" ? plannerRoot : {};
    const normalizedIntervalNum = Number.isFinite(Number(intervalNum))
      ? Number(intervalNum)
      : null;
    const normalizedTryNum = Number.isFinite(Number(intervalTryNum))
      ? Number(intervalTryNum)
      : null;
    const normalizedSubIntervalNum = Number.isFinite(Number(subIntervalNum))
      ? Number(subIntervalNum)
      : null;
    const normalizedTargetSubIntervalId = String(targetSubIntervalId || "").trim();
    const hasSelection =
      Number.isFinite(normalizedIntervalNum) &&
      Number.isFinite(normalizedTryNum);
    return {
      ...root,
      programIntervals: Array.isArray(root?.programIntervals)
        ? root.programIntervals.map((intervalEntry) => {
            const resolvedIntervalNum =
              Number.parseInt(String(intervalEntry?.intervalNum ?? "").trim(), 10) ||
              null;
            return {
              ...intervalEntry,
              intervalTry: Array.isArray(intervalEntry?.intervalTry)
                ? intervalEntry.intervalTry.map((tryEntry) => {
                    const resolvedTryNum =
                      Number.parseInt(String(tryEntry?.intervalTryNum ?? "").trim(), 10) ||
                      null;
                    const isSelectedTry =
                      hasSelection &&
                      resolvedIntervalNum === normalizedIntervalNum &&
                      resolvedTryNum === normalizedTryNum;
                    const subIntervals = Array.isArray(tryEntry?.intervalTrysubIntervals)
                      ? tryEntry.intervalTrysubIntervals
                      : [];
                    const activeSubIntervalIndex = normalizedTargetSubIntervalId
                      ? subIntervals.findIndex(
                          (subEntry) =>
                            String(
                              subEntry?.subIntervalID || subEntry?.subIntervalId || "",
                            ).trim() === normalizedTargetSubIntervalId,
                        )
                      : Number.isFinite(normalizedSubIntervalNum)
                        ? subIntervals.findIndex(
                            (subEntry) =>
                              Number.parseInt(
                                String(subEntry?.subIntervalNum ?? "").trim(),
                                10,
                              ) === normalizedSubIntervalNum,
                          )
                      : subIntervals.findIndex(
                          (subEntry) =>
                            Number.parseInt(
                              String(subEntry?.subIntervalNum ?? "").trim(),
                              10,
                            ) > 0,
                        );
                    return {
                      ...tryEntry,
                      intervalTrysubIntervals: subIntervals.map((subEntry, index) => ({
                        ...subEntry,
                        subIntervalCurrent:
                          isSelectedTry && activeSubIntervalIndex >= 0
                            ? index === activeSubIntervalIndex
                            : false,
                      })),
                    };
                  })
                : [],
            };
          })
        : [],
    };
  };

  resolveCurrentIntervalTryTargetSubIntervalId = (
    plannerRoot = {},
    intervalNum = null,
    intervalTryNum = null,
    subIntervalNum = null,
  ) => {
    const normalizedIntervalNum = Number.isFinite(Number(intervalNum))
      ? Number(intervalNum)
      : null;
    const normalizedTryNum = Number.isFinite(Number(intervalTryNum))
      ? Number(intervalTryNum)
      : null;
    const normalizedSubIntervalNum = Number.isFinite(Number(subIntervalNum))
      ? Number(subIntervalNum)
      : null;
    if (
      !Number.isFinite(normalizedIntervalNum) ||
      !Number.isFinite(normalizedTryNum) ||
      !Number.isFinite(normalizedSubIntervalNum)
    ) {
      return "";
    }
    const programIntervals = Array.isArray(plannerRoot?.programIntervals)
      ? plannerRoot.programIntervals
      : [];
    const selectedInterval = programIntervals.find(
      (intervalEntry) =>
        Number.parseInt(String(intervalEntry?.intervalNum ?? "").trim(), 10) ===
        normalizedIntervalNum,
    );
    if (!selectedInterval) {
      return "";
    }
    const selectedTry = (Array.isArray(selectedInterval?.intervalTry)
      ? selectedInterval.intervalTry
      : []
    ).find(
      (tryEntry) =>
        Number.parseInt(String(tryEntry?.intervalTryNum ?? "").trim(), 10) ===
        normalizedTryNum,
    );
    if (!selectedTry) {
      return "";
    }
    const selectedSubInterval = (Array.isArray(selectedTry?.intervalTrysubIntervals)
      ? selectedTry.intervalTrysubIntervals
      : []
    ).find(
      (subEntry) =>
        Number.parseInt(String(subEntry?.subIntervalNum ?? "").trim(), 10) ===
          normalizedSubIntervalNum &&
        String(subEntry?.subIntervalID || subEntry?.subIntervalId || "").trim(),
    );
    return String(
      selectedSubInterval?.subIntervalID || selectedSubInterval?.subIntervalId || "",
    ).trim();
  };

  handleHomeProgramCurrentIntervalTryNumSetSubmit = async () => {
    const intervalNumStr = String(this.state?.homeProgramCurrentIntervalNumDraft || "").trim();
    const intervalTryNumStr = String(this.state?.homeProgramCurrentIntervalTryNumDraft || "").trim();
    const subIntervalNumStr = String(this.state?.homeProgramCurrentSubIntervalNumDraft || "").trim();
    const intervalNum = Number.isFinite(Number(intervalNumStr)) ? Number(intervalNumStr) : null;
    const intervalTryNum = Number.isFinite(Number(intervalTryNumStr)) ? Number(intervalTryNumStr) : null;
    const subIntervalNum = Number.isFinite(Number(subIntervalNumStr)) ? Number(subIntervalNumStr) : null;
    if (intervalNum === null) {
      this.props.serverReply?.("Enter a valid interval number.");
      return;
    }
    if (intervalTryNum === null) {
      this.props.serverReply?.("Enter a valid try number.");
      return;
    }
    if (subIntervalNum === null) {
      this.props.serverReply?.("Enter a valid sub-interval try number.");
      return;
    }
    const currentPlannerRoot = this.getResolvedPlannerRoot();
    const targetSubIntervalId = this.resolveCurrentIntervalTryTargetSubIntervalId(
      currentPlannerRoot,
      intervalNum,
      intervalTryNum,
      subIntervalNum,
    );
    if (!targetSubIntervalId) {
      this.props.serverReply?.("Failed to resolve the target sub-interval.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programCurrentIntervalTryNum: { intervalNum, intervalTryNum, subIntervalNum },
        subIntervalID: targetSubIntervalId,
      });
      const refreshedPlannerRoot = await this.fetchStudyPlannerFromDb().catch(() => null);
      const persistedPlannerRoot =
        refreshedPlannerRoot && typeof refreshedPlannerRoot === "object"
          ? refreshedPlannerRoot
          : nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {};
      const syncedPlannerRoot = this.syncCurrentIntervalTrySelectionInPlannerRoot(
        persistedPlannerRoot,
        intervalNum,
        intervalTryNum,
        subIntervalNum,
        targetSubIntervalId,
      );
      this.setState({
        plannerRoot: syncedPlannerRoot,
        homeProgramCurrentIntervalTryNumEditorOpen: false,
        homeProgramCurrentIntervalNumDraft: String(
          syncedPlannerRoot?.programCurrentIntervalTryNum?.intervalNum ?? intervalNum,
        ).trim(),
        homeProgramCurrentIntervalTryNumDraft: String(
          syncedPlannerRoot?.programCurrentIntervalTryNum?.intervalTryNum ?? intervalTryNum ?? "",
        ).trim(),
        homeProgramCurrentSubIntervalNumDraft: String(
          syncedPlannerRoot?.programCurrentIntervalTryNum?.subIntervalNum ?? subIntervalNum ?? "",
        ).trim(),
      });
      this.props.serverReply?.("Current interval saved.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save current interval."),
      );
    }
  };

  handleHomeProgramCurrentIntervalTryNumReset = async () => {
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programCurrentIntervalTryNum: null,
      });
      const refreshedPlannerRoot = await this.fetchStudyPlannerFromDb().catch(() => null);
      const persistedPlannerRoot =
        refreshedPlannerRoot && typeof refreshedPlannerRoot === "object"
          ? refreshedPlannerRoot
          : nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {};
      const syncedPlannerRoot = this.syncCurrentIntervalTrySelectionInPlannerRoot(
        persistedPlannerRoot,
        null,
        null,
      );
      this.setState({
        plannerRoot: syncedPlannerRoot,
        homeProgramCurrentIntervalTryNumEditorOpen: false,
        homeProgramCurrentIntervalNumDraft: "",
        homeProgramCurrentIntervalTryNumDraft: "",
        homeProgramCurrentSubIntervalNumDraft: "",
      });
      this.props.serverReply?.("Current interval reset.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to reset current interval."),
      );
    }
  };

  getCurrentIntervalTryCalendarSelection = (plannerRoot = null) => {
    const resolvedPlannerRoot = plannerRoot || this.getResolvedPlannerRoot();
    const plannerIntervals = this.getPlannerIntervalsWithComponents(resolvedPlannerRoot);

    const currentProgramTry =
      resolvedPlannerRoot?.programCurrentIntervalTryNum &&
      typeof resolvedPlannerRoot.programCurrentIntervalTryNum === "object"
        ? resolvedPlannerRoot.programCurrentIntervalTryNum
        : null;
    const currentIntervalNum = Number.parseInt(
      String(currentProgramTry?.intervalNum || "").trim(),
      10,
    );
    const currentIntervalTryNum = Number.parseInt(
      String(currentProgramTry?.intervalTryNum || "").trim(),
      10,
    );
    const currentSubIntervalNum = Number.parseInt(
      String(currentProgramTry?.subIntervalNum || "").trim(),
      10,
    );

    // Path 1: explicit current sub-interval try match
    let currentIntervalRow = null;
    if (
      Number.isFinite(currentIntervalNum) &&
      Number.isFinite(currentIntervalTryNum) &&
      Number.isFinite(currentSubIntervalNum)
    ) {
      currentIntervalRow =
        plannerIntervals.find(
          (entry) =>
            Number.parseInt(String(entry?.intervalNum || "").trim(), 10) ===
              currentIntervalNum &&
            Number.parseInt(
              String(entry?.subIntervalTryNum ?? entry?.intervalTryNum ?? "").trim(),
              10,
            ) === currentIntervalTryNum &&
            Number.parseInt(String(entry?.subIntervalNum || "").trim(), 10) ===
              currentSubIntervalNum,
        ) || null;
    }

    // Path 2: fall back to the sub-interval marked as current
    if (!currentIntervalRow) {
      currentIntervalRow =
        plannerIntervals.find((entry) => Boolean(entry?.subIntervalCurrent)) || null;
    }

    const hasCompleteComponentDate = (comp) => {
      if (!comp || typeof comp !== "object" || Array.isArray(comp)) return false;
      const y = Number(comp.year);
      const m = Number(comp.month);
      const d = Number(comp.day);
      return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31;
    };
    const resolveHasCompleteDate = (isoFromParts, rawComponent) => {
      const parts = this.splitStudyPlanIsoDateParts(isoFromParts);
      if (parts.year && parts.year !== "-" && parts.month && parts.month !== "-" && parts.day && parts.day !== "-") {
        return true;
      }
      return hasCompleteComponentDate(rawComponent);
    };
    const hasCompleteStartDate = currentIntervalRow
      ? resolveHasCompleteDate(
          this.getPlannerSubIntervalTryDates(currentIntervalRow).start,
          currentIntervalRow?.subIntervalTryDates?.start,
        )
      : false;
    const hasCompleteEndDate = currentIntervalRow
      ? resolveHasCompleteDate(
          this.getPlannerSubIntervalTryDates(currentIntervalRow).end,
          currentIntervalRow?.subIntervalTryDates?.end,
        )
      : false;

    return {
      currentProgramTry,
      currentIntervalRow,
      hasCompleteStartDate,
      hasCompleteEndDate,
      isReady: Boolean(currentIntervalRow && hasCompleteStartDate && hasCompleteEndDate),
    };
  };

  generateCurrentIntervalTryCalendar = () => {
    const selection = this.getCurrentIntervalTryCalendarSelection();
    if (!selection.isReady || !selection.currentIntervalRow) {
      return;
    }

    const { currentIntervalRow, currentProgramTry } = selection;

    const resolveNum = (fromTry, fromRow) => {
      const n = Number.parseInt(String(fromTry || "").trim(), 10);
      if (Number.isFinite(n)) return n;
      return Number.parseInt(String(fromRow || "").trim(), 10);
    };
    const intervalNum = resolveNum(
      currentProgramTry?.intervalNum,
      currentIntervalRow?.intervalNum,
    );
    const intervalTryNum = resolveNum(
      currentProgramTry?.intervalTryNum,
      currentIntervalRow?.intervalTryNum,
    );

    const resolveIso = (isoFromFn, rawComp) => {
      if (isoFromFn && /^\d{4}-\d{2}-\d{2}$/.test(isoFromFn)) return isoFromFn;
      const d = this.componentObjectToUtcDate(rawComp);
      return d ? d.toISOString().slice(0, 10) : isoFromFn;
    };
    const startIso = resolveIso(
      this.getPlannerSubIntervalTryDates(currentIntervalRow).start,
      currentIntervalRow?.subIntervalTryDates?.start,
    );
    const endIso = resolveIso(
      this.getPlannerSubIntervalTryDates(currentIntervalRow).end,
      currentIntervalRow?.subIntervalTryDates?.end,
    );
    const startParts = this.splitStudyPlanIsoDateParts(startIso);
    const endParts = this.splitStudyPlanIsoDateParts(endIso);
    const rowKey = String(
      currentIntervalRow?.key || currentIntervalRow?.subIntervalId || currentIntervalRow?.subIntervalID || "",
    ).trim();

    this.setState({
      homeIntervalToolbarOpen: true,
      homeExpectedIntervalsGenerated: true,
      homeIntervalStatusDrafts: {},
      homeGeneratedIntervalNumDraft: String(intervalNum),
      homeGeneratedIntervalTryNumDraft: String(intervalTryNum),
      homeGeneratedSubIntervalNumDraft: String(
        currentIntervalRow?.subIntervalNum || currentIntervalRow?.term || "",
      ).trim(),
      homeGeneratedStartDateMonthDraft:
        startParts.month && startParts.month !== "-" ? startParts.month : "",
      homeGeneratedStartDateDayDraft:
        startParts.day && startParts.day !== "-" ? startParts.day : "",
      homeGeneratedEndDateMonthDraft:
        endParts.month && endParts.month !== "-" ? endParts.month : "",
      homeGeneratedEndDateDayDraft:
        endParts.day && endParts.day !== "-" ? endParts.day : "",
      homeCurrentIntervalKey: rowKey,
      homeCurrentIntervalDraft: rowKey,
      homeCurrentIntervalStartDateDraft: startIso,
      homeCurrentIntervalEndDateDraft: endIso,
    });
  };

  cancelHomeIntervalPassingThresholdEditor = () => {
    this.setState((previousState) => ({
      homeIntervalPassingThresholdEditorOpen: false,
      homeIntervalPassingThresholdModeDraft: "",
      homeIntervalPassingThresholdUnitDraft: "",
      homeIntervalPassingThresholdNumberDraft: "",
      homeIntervalPassingThresholdRuleDraft: "",
      homeIntervalPassingThresholdIsEditing: false,
      homeIntervalPassingThresholdDraftTouched: false,
      homeIntervalPassingThresholdDraftList: Array.isArray(
        previousState?.homeIntervalPassingThresholdValueList,
      )
        ? previousState.homeIntervalPassingThresholdValueList
        : [],
    }));
  };
  cancelHomeCoursesEditor = () => {
    this.setState({
      homeCoursesEditorOpen: false,
      homeMaterialMetadataMode: "course",
      homeCourseEditingKey: "",
      homeCourseOriginalId: "",
      homeCourseOriginalIntervalId: "",
      homeCourseOriginalCourseNum: "",
      homeCourseOriginalComponentClass: "",
      homeCourseOriginalLectureNum: "",
      homeCourseDraftList: [],
      homeCourseNameDraft: "",
      homeCourseIdDraft: "",
      homeCourseCodeDraft: "",
      homeCourseComponentDraft: [],
      homeCourseTotalWeightDraft: "",
      homeCourseSubIntervalYearDraft: "",
      homeCourseSubIntervalTermDraft: "",
      homeCourseComponentIdDraft: "",
      homeCourseComponentPartialWeightDraft: "",
      homeCourseComponentStatusDraft: "",
      homeCourseComponentEditingId: "",
      homeCourseIntervalIdDraft: "",
      homeCourseLectureCourseContextDraft: "",
      homeCourseLectureNameDraft: "",
      homeCourseLectureInstructorsDraft: "",
      homeCourseLectureInstructionDateDraft: "",
      homeCourseLectureDraftList: [],
      homeCourseExamDraftList: [],
      homeCourseExamScheduleEditorOpen: false,
      homeCourseExamComponentIdDraft: "",
      homeCourseExamClassDraft: "",
      homeCourseExamDateDraft: "",
      homeCourseExamTimeDraft: "",
      homeCourseExamLocationBuildingDraft: "",
      homeCourseExamLocationRoomDraft: "",
      homeCourseExamWeightDraft: "",
      homeCourseExamGradeDraft: "",
    });
  };
  cancelHomeCourseComponentLecturesEditor = () => {
    this.setState({
      homeCourseComponentLecturesEditorOpen: false,
      homeCourseComponentLectureCourseIdDraft: "",
      homeCourseComponentLectureIntervalIdDraft: "",
      homeCourseComponentLectureComponentIdDraft: "",
      homeCourseComponentLectureNameDraft: "",
      homeCourseComponentLectureDraftList: [],
    });
  };
  cancelHomeComponentsEditor = () => {
    this.setState({
      homeComponentsSetEditorOpen: false,
      homeComponentIdInput: "",
      homeComponentsDraftList: [],
    });
  };
  cancelHomeIntervalsEditor = () => {
    this.setState({
      homeIntervalToolbarOpen: false,
      homeExpectedIntervalsGenerated: false,
      homeIntervalStatusDrafts: {},
      homeManualIntervalIdDraft: "",
      homeManualIntervalYearDraft: "",
      homeManualIntervalTermDraft: "",
      homeManualIntervalsDraftList: [],
      homeDeletedIntervalIds: [],
      homeCurrentIntervalStatusDraft: "Normal",
      homeCurrentIntervalStartDateDraft: "",
      homeCurrentIntervalEndDateDraft: "",
      homeGeneratedIntervalNumDraft: "",
      homeGeneratedIntervalTryNumDraft: "",
      homeGeneratedSubIntervalNumDraft: "",
      homeGeneratedStartDateMonthDraft: "",
      homeGeneratedStartDateDayDraft: "",
      homeGeneratedEndDateMonthDraft: "",
      homeGeneratedEndDateDayDraft: "",
    });
  };
  persistStudyPlannerIntervals = async (intervals = []) => {
    return this.runPlannerPendingTask("Saving intervals...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const submittedIntervals = Array.isArray(intervals) ? intervals : [];
      if (!userId || !token) {
        throw new Error("Failed to save intervals: login data is incomplete.");
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerIntervals/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ intervals: submittedIntervals }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save intervals (${response.status}).`,
          ),
        );
      }
      const refreshedStudyPlanner = await this.fetchStudyPlannerFromDb();
      if (refreshedStudyPlanner && typeof refreshedStudyPlanner === "object") {
        return refreshedStudyPlanner;
      }
      return payload?.studyPlanner || {};
    });
  };
  persistStudyPlannerIntervalStatus = async ({
    intervalId = "",
    subIntervalId = "",
    intervalStatus = "Normal",
  } = {}) => {
    return this.runPlannerPendingTask("Saving interval status...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedIntervalId = String(intervalId || "").trim();
      const normalizedSubIntervalId = String(subIntervalId || "").trim();
      const normalizedStatusValue = String(intervalStatus || "").trim();
      const normalizedIntervalStatus = normalizedStatusValue
        ? normalizedStatusValue.toLowerCase() === "current"
          ? "current"
          : normalizedStatusValue.charAt(0).toUpperCase() +
            normalizedStatusValue.slice(1).toLowerCase()
        : "Normal";
      if (!userId || !token) {
        throw new Error(
          "Failed to save interval status: login data is incomplete.",
        );
      }
      if (!normalizedSubIntervalId && !normalizedIntervalId) {
        throw new Error(
          "Failed to save interval status: interval data is incomplete.",
        );
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerIntervalStatus/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intervalId: normalizedIntervalId,
            subIntervalId: normalizedSubIntervalId,
            intervalStatus: normalizedIntervalStatus,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save interval status (${response.status}).`,
          ),
        );
      }
      return payload?.studyPlanner || {};
    });
  };
  buildHomeGeneratedIntervals = (
    startYear = 0,
    totalYears = 0,
    totalTermsPerYear = 0,
    programId = "",
    intervalSymbol = "INT",
    intervalTrySymbol = "IT",
    subIntervalSymbol = "sINT",
  ) => {
    const safeStartYear = Number(startYear || 0);
    const safeTotalYears = Number(totalYears || 0);
    const safeTotalTermsPerYear = Number(totalTermsPerYear || 0);
    if (
      !Number.isInteger(safeStartYear) ||
      safeStartYear < 1000 ||
      safeStartYear > 9999 ||
      !Number.isInteger(safeTotalYears) ||
      safeTotalYears < 1 ||
      !Number.isInteger(safeTotalTermsPerYear) ||
      safeTotalTermsPerYear < 1 ||
      safeTotalYears * safeTotalTermsPerYear < 1
    ) {
      return [];
    }

    const safeProgramId = String(programId || "").trim();
    const safeIntervalSymbol = String(intervalSymbol || "INT").trim();
    const safeIntervalTrySymbol = String(intervalTrySymbol || "IT").trim();
    const safeSubIntervalSymbol = String(subIntervalSymbol || "sINT").trim();

    const generatedIntervals = [];
    for (let intervalOffset = 0; intervalOffset < safeTotalYears; intervalOffset += 1) {
      const programIntervalNum = intervalOffset + 1;
      const intervalID = `${safeProgramId}: ${safeIntervalSymbol}${programIntervalNum}`;
      const tryNum = 1;
      const intervalTryID = this.buildPlannerHierarchyId(
        intervalID,
        safeIntervalTrySymbol,
        tryNum,
      );
      const intervalTrysubIntervals = [];
      for (
        let subIntervalOffset = 0;
        subIntervalOffset < safeTotalTermsPerYear;
        subIntervalOffset += 1
      ) {
        const subIntervalNum = subIntervalOffset + 1;
        const subIntervalID = this.buildPlannerHierarchyId(
          intervalTryID,
          safeSubIntervalSymbol,
          subIntervalNum,
        );
        const startYearValue =
          safeStartYear +
          intervalOffset +
          Math.ceil((subIntervalNum - 1) / safeTotalTermsPerYear);
        const endYearValue = safeStartYear + programIntervalNum;
        const resolvedStartYear =
          Number.isInteger(startYearValue) && startYearValue >= 1000
            ? startYearValue
            : null;
        const resolvedEndYear =
          Number.isInteger(endYearValue) && endYearValue >= 1000
            ? endYearValue
            : null;
        const resolvedStartDate = resolvedStartYear ? String(resolvedStartYear) : "";
        const resolvedEndDate = resolvedEndYear ? String(resolvedEndYear) : "";
        intervalTrysubIntervals.push({
          subIntervalID,
          subIntervalNum,
          subIntervalSymbol: safeSubIntervalSymbol,
          subIntervalCurrent: false,
          subIntervalTryDates: {
            start: { year: resolvedStartYear, month: null, day: null },
            end: { year: resolvedEndYear, month: null, day: null },
          },
          subIntervalDates: {
            start: resolvedStartDate,
            end: resolvedEndDate,
          },
          subIntervalCourses: [],
        });
      }
      generatedIntervals.push({
        programID: safeProgramId,
        intervalID,
        intervalNum: programIntervalNum,
        intervalSymbol: safeIntervalSymbol,
        intervalStatus: "Normal",
        intervalTry: [
          {
            intervalTryID,
            intervalTryNum: tryNum,
            intervalTrySymbol: safeIntervalTrySymbol,
            intervalTrysubIntervals,
          },
        ],
      });
    }

    return generatedIntervals;
  };
  parseIntervalIdYearTerm = (subIntervalId = "") => {
    const empty = { intervalNum: "", intervalSymbol: "", tryNum: "", intervalTrySymbol: "", subIntervalNum: "", subIntervalSymbol: "", year: "", term: "" };
    const s = String(subIntervalId || "").trim();
    if (!s) return empty;
    const m = s.match(/([A-Za-z]+)(\d+)([A-Za-z]+)(\d+)([A-Za-z]+)(\d+)$/);
    if (!m) return empty;
    return {
      intervalNum: m[2], intervalSymbol: m[1],
      tryNum: m[4], intervalTrySymbol: m[3],
      subIntervalNum: m[6], subIntervalSymbol: m[5],
      year: m[2], term: m[6],
    };
  };
  getPlannerIntervalSchemaID = (entry = {}) =>
    String(
      entry?.intervalID ||
        entry?.intervalId ||
        "",
    ).trim();
  getPlannerSubIntervalSchemaID = (entry = {}) =>
    String(
      entry?.subIntervalID ||
        entry?.subIntervalId ||
        entry?.key ||
        "",
    ).trim();
  getPlannerCourseSchemaID = (entry = {}) =>
    String(
      entry?.courseID ||
        entry?.courseId ||
        "",
    ).trim();
  getPlannerComponentSchemaID = (entry = {}) =>
    String(
      entry?.componentID ||
        entry?.componentId ||
        "",
    ).trim();
  getPlannerLectureSchemaID = (entry = {}) =>
    String(
      entry?.lectureID ||
        entry?.lectureId ||
        "",
    ).trim();
  getPlannerExamSchemaID = (entry = {}) =>
    String(
      entry?.examID ||
        entry?.examId ||
        "",
    ).trim();
  buildPlannerHierarchyId = (parentId = "", symbol = "", num = "") => {
    const normalizedParentId = String(parentId || "").trim();
    const normalizedSymbol = String(symbol || "").trim();
    const normalizedNum = String(num ?? "").trim();
    if (!normalizedParentId || !normalizedSymbol || !normalizedNum) {
      return "";
    }
    return `${normalizedParentId}${normalizedSymbol}${normalizedNum}`;
  };
  resolvePlannerSubIntervalDraftId = ({
    subIntervalId = "",
    intervalNum = "",
    subIntervalNum = "",
  } = {}) => {
    const normalizedIntervalNum = String(intervalNum || "").trim();
    const normalizedSubIntervalNum = String(subIntervalNum || "").trim();
    const plannerRoot = this.getResolvedPlannerRoot();
    const plannerIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const matchedInterval = plannerIntervals.find((entry) => {
      const entrySubIntervalId = this.getPlannerSubIntervalSchemaID(entry);
      const parsedEntry = this.parseIntervalIdYearTerm(entrySubIntervalId);
      return (
        String(parsedEntry?.intervalNum || "").trim() === normalizedIntervalNum &&
        String(parsedEntry?.subIntervalNum || "").trim() === normalizedSubIntervalNum
      );
    });
    if (matchedInterval) {
      return this.getPlannerSubIntervalSchemaID(matchedInterval);
    }
    if (!normalizedIntervalNum || !normalizedSubIntervalNum) {
      return "";
    }
    const intervalSymbol = String(plannerRoot?.intervalSymbol || "INT").trim();
    const intervalTrySymbol = String(plannerRoot?.intervalTrySymbol || "IT").trim();
    const subIntervalSymbol = String(plannerRoot?.subIntervalSymbol || "sINT").trim();
    const plannerProgramID = String(plannerRoot?.programID || "").trim();
    const intervalID = `${plannerProgramID}: ${intervalSymbol}${normalizedIntervalNum}`;
    const intervalTryID = this.buildPlannerHierarchyId(
      intervalID,
      intervalTrySymbol,
      1,
    );
    return this.buildPlannerHierarchyId(
      intervalTryID,
      subIntervalSymbol,
      normalizedSubIntervalNum,
    );
  };
  buildHomeGeneratedIntervalRows = (
    startYear = 0,
    totalYears = 0,
    totalTermsPerYear = 0,
    programId = "",
    intervalSymbol = "INT",
    intervalTrySymbol = "IT",
    subIntervalSymbol = "sINT",
  ) => {
    const generatedIntervals = this.buildHomeGeneratedIntervals(
      startYear,
      totalYears,
      totalTermsPerYear,
      programId,
      intervalSymbol,
      intervalTrySymbol,
      subIntervalSymbol,
    );
    return this.getPlannerIntervalsWithComponents({
      programIntervals: generatedIntervals,
    });
  };
  buildHomeManualIntervalSchemas = (
    manualIntervals = [],
    programId = "",
    intervalSymbol = "INT",
    intervalTrySymbol = "IT",
    subIntervalSymbol = "sINT",
  ) => {
    const safeProgramId = String(programId || "").trim();
    const safeIntervalSymbol = String(intervalSymbol || "INT").trim();
    const safeIntervalTrySymbol = String(intervalTrySymbol || "IT").trim();
    const safeSubIntervalSymbol = String(subIntervalSymbol || "sINT").trim();
    const manualEntries = Array.isArray(manualIntervals) ? manualIntervals : [];
    const groupedIntervals = new Map();

    manualEntries.forEach((entry) => {
      const rawSubIntervalId = String(
        entry?.subIntervalId || entry?.subintervalId || entry?.key || "",
      ).trim();
      if (!rawSubIntervalId) {
        return;
      }

      const parsedInterval = this.parseIntervalIdYearTerm(rawSubIntervalId);
      const resolvedIntervalNum =
        Number.parseInt(
          String(parsedInterval?.intervalNum || entry?.intervalNum || "").trim(),
          10,
        ) || null;
      const resolvedIntervalSymbol =
        String(parsedInterval?.intervalSymbol || entry?.intervalSymbol || safeIntervalSymbol)
          .trim() || safeIntervalSymbol;
      const resolvedIntervalID =
        String(entry?.intervalId || entry?.intervalID || "").trim() ||
        (resolvedIntervalNum
          ? `${resolvedIntervalSymbol}${resolvedIntervalNum}`
          : "");
      const resolvedTryNum =
        Number.parseInt(
          String(parsedInterval?.tryNum || entry?.intervalTryNum || 1).trim(),
          10,
        ) || 1;
      const resolvedTrySymbol =
        String(parsedInterval?.intervalTrySymbol || entry?.intervalTrySymbol || safeIntervalTrySymbol)
          .trim() || safeIntervalTrySymbol;
      const resolvedTryID =
        this.buildPlannerHierarchyId(
          resolvedIntervalID,
          resolvedTrySymbol,
          resolvedTryNum,
        ) || String(entry?.intervalTryID || "").trim();
      const resolvedSubIntervalNum =
        Number.parseInt(
          String(parsedInterval?.subIntervalNum || entry?.subIntervalNum || "").trim(),
          10,
        ) || null;
      const resolvedSubIntervalSymbol =
        String(parsedInterval?.subIntervalSymbol || entry?.subIntervalSymbol || safeSubIntervalSymbol)
          .trim() || safeSubIntervalSymbol;
      const resolvedSubIntervalID =
        this.buildPlannerHierarchyId(
          resolvedTryID,
          resolvedSubIntervalSymbol,
          resolvedSubIntervalNum,
        ) || rawSubIntervalId;

      if (!resolvedIntervalID || !resolvedTryID || !resolvedSubIntervalID) {
        return;
      }

      if (!groupedIntervals.has(resolvedIntervalID)) {
        groupedIntervals.set(resolvedIntervalID, {
          programID: safeProgramId,
          intervalID: resolvedIntervalID,
          intervalNum: resolvedIntervalNum,
          intervalSymbol: resolvedIntervalSymbol,
          intervalStatus:
            String(entry?.intervalStatus || "Normal").trim() || "Normal",
          intervalTry: [],
        });
      }

      const intervalEntry = groupedIntervals.get(resolvedIntervalID);
      let intervalTryEntry = Array.isArray(intervalEntry?.intervalTry)
        ? intervalEntry.intervalTry.find(
            (tryEntry) =>
              String(tryEntry?.intervalTryID || "").trim() === resolvedTryID,
          )
        : null;

      if (!intervalTryEntry) {
        intervalTryEntry = {
          intervalTryID: resolvedTryID,
          intervalTryNum: resolvedTryNum,
          intervalTrySymbol: resolvedTrySymbol,
          intervalTrysubIntervals: [],
        };
        intervalEntry.intervalTry.push(intervalTryEntry);
      }

      intervalTryEntry.intervalTrysubIntervals.push({
        subIntervalID: resolvedSubIntervalID,
        subIntervalNum: resolvedSubIntervalNum,
        subIntervalSymbol: resolvedSubIntervalSymbol,
        subIntervalCurrent: Boolean(entry?.subIntervalCurrent),
        subIntervalTryDates: {
          start: entry?.subIntervalTryDates?.start || "",
          end: entry?.subIntervalTryDates?.end || "",
        },
        subIntervalDates: {
          start: entry?.subIntervalDates?.start || entry?.startDate || "",
          end: entry?.subIntervalDates?.end || entry?.endDate || "",
        },
        subIntervalCourses: Array.isArray(entry?.intervalCourses)
          ? entry.intervalCourses
          : Array.isArray(entry?.subIntervalCourses)
            ? entry.subIntervalCourses
            : [],
      });
    });

    return Array.from(groupedIntervals.values());
  };
  getNormalizedHomeManualIntervals = () => {
    const manualIntervals = Array.isArray(
      this.state?.homeManualIntervalsDraftList,
    )
      ? this.state.homeManualIntervalsDraftList
      : [];
    return Array.from(
      new Map(
        manualIntervals
          .map((entry) => {
            const subIntervalId = String(
              entry?.subIntervalId || entry?.subintervalId || entry?.intervalId || "",
            ).trim();
            if (!subIntervalId) {
              return null;
            }
            return [
              subIntervalId,
              {
                intervalId:
                  String(entry?.intervalId || "").trim() || subIntervalId,
                intervalNum:
                  Number.parseInt(
                    String(entry?.intervalNum || "").trim(),
                    10,
                  ) ||
                  Number.parseInt(
                    String(entry?.intervalId || "").trim(),
                    10,
                  ) ||
                  null,
                subIntervalId,
                regular:
                  typeof entry?.regular === "boolean"
                    ? entry.regular
                    : typeof entry?.expected === "boolean"
                      ? entry.expected
                      : false,
                intervalStatus:
                  String(entry?.intervalStatus || "Normal").trim() || "Normal",
                intervalCourses: Array.isArray(entry?.intervalCourses)
                  ? entry.intervalCourses
                  : [],
              },
            ];
          })
          .filter(Boolean),
      ).values(),
    );
  };
  appendHomeManualIntervalEntry = () => {
    const programTermsPerYear = Number(
      String(this.state?.homeProgramTermsPerYearValue || "").trim(),
    );
    if (!Number.isInteger(programTermsPerYear) || programTermsPerYear < 1) {
      this.props.serverReply?.(
        "Set Program Terms Per Year before adding an extra sub-Interval.",
      );
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const persistedIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const generatedIntervals = this.state?.homeExpectedIntervalsGenerated
      ? this.buildHomeGeneratedIntervalRows(
          this.state?.homeProgramStartYearValue,
          this.state?.homeProgramTotalYearsValue,
          this.state?.homeProgramTermsPerYearValue,
          String(plannerRoot?.programID || this.state?.homeProgramIdDraft || "").trim(),
          String(plannerRoot?.intervalSymbol || "INT").trim(),
          String(plannerRoot?.intervalTrySymbol || "IT").trim(),
          String(plannerRoot?.subIntervalSymbol || "sINT").trim(),
        )
      : [];
    const manualIntervals = this.getNormalizedHomeManualIntervals();
    const deletedIntervalIds = new Set(
      (Array.isArray(this.state?.homeDeletedIntervalIds)
        ? this.state.homeDeletedIntervalIds
        : []
      )
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    );
    const sequenceEntries = [
      ...persistedIntervals,
      ...generatedIntervals,
      ...manualIntervals,
    ]
      .map((entry) => {
        const subIntervalId = String(
          entry?.subIntervalId || entry?.subintervalId || entry?.key || "",
        ).trim();
        if (!subIntervalId || deletedIntervalIds.has(subIntervalId)) {
          return null;
        }
        const parsedInterval = this.parseIntervalIdYearTerm(subIntervalId);
        const year = Number(parsedInterval?.year || 0);
        const term = Number(parsedInterval?.term || 0);
        if (!year || !term) {
          return null;
        }
        return {
          intervalId: String(entry?.intervalId || "").trim(),
          subIntervalId,
          year,
          term,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.year !== right.year) {
          return left.year - right.year;
        }
        return left.term - right.term;
      });
    if (sequenceEntries.length === 0) {
      this.props.serverReply?.(
        "Generate or save regular intervals first, then add an extra sub-Interval.",
      );
      return;
    }
    const latestEntry = sequenceEntries[sequenceEntries.length - 1];
    const latestIntervalId = String(latestEntry?.intervalId || "").trim();
    const latestIntervalNum = Number.parseInt(
      String(latestEntry?.intervalNum || latestIntervalId || "").trim(),
      10,
    );
    const latestIntervalKey = Number.isInteger(latestIntervalNum)
      ? String(latestIntervalNum)
      : latestIntervalId;
    const latestIntervalEntryCount = sequenceEntries.filter((entry) => {
      const entryIntervalNum = Number.parseInt(
        String(entry?.intervalNum || entry?.intervalId || "").trim(),
        10,
      );
      if (Number.isInteger(latestIntervalNum) && Number.isInteger(entryIntervalNum)) {
        return entryIntervalNum === latestIntervalNum;
      }
      return String(entry?.intervalId || "").trim() === latestIntervalKey;
    }).length;
    const nextIntervalNum =
      latestIntervalEntryCount >= programTermsPerYear
        ? (Number.isInteger(latestIntervalNum) ? latestIntervalNum + 1 : sequenceEntries.length + 1)
        : (Number.isInteger(latestIntervalNum) ? latestIntervalNum : Number.parseInt(latestIntervalId, 10) || sequenceEntries.length);
    const existingSubIntervalIds = new Set(
      sequenceEntries.map((entry) => String(entry?.subIntervalId || "").trim()),
    );
    const buildNextCandidate = (latestEntry = null) => {
      if (!latestEntry) {
        return null;
      }
      const intervalId = String(nextIntervalNum || "").trim();
      if (!intervalId) {
        return null;
      }
      return {
        intervalId,
        subIntervalId:
          Number(latestEntry?.term || 0) >= programTermsPerYear
            ? `${Number(latestEntry?.year || 0)}1`
            : `${Number(latestEntry?.year || 0) + 1}${
                Number(latestEntry?.term || 0) + 1
              }`,
      };
    };
    let latestEntryCursor = latestEntry;
    let nextCandidate = buildNextCandidate(latestEntryCursor);
    let safetyCounter = 0;
    while (
      nextCandidate &&
      existingSubIntervalIds.has(String(nextCandidate.subIntervalId || "").trim()) &&
      safetyCounter < 500
    ) {
      existingSubIntervalIds.add(String(nextCandidate.subIntervalId || "").trim());
      latestEntryCursor = {
        intervalId: nextCandidate.intervalId,
        subIntervalId: nextCandidate.subIntervalId,
        year: this.parseIntervalIdYearTerm(nextCandidate.subIntervalId)?.year || "",
        term: this.parseIntervalIdYearTerm(nextCandidate.subIntervalId)?.term || "",
      };
      nextCandidate = buildNextCandidate(latestEntryCursor);
      safetyCounter += 1;
    }
    if (!nextCandidate || !nextCandidate.subIntervalId || !nextCandidate.intervalId) {
      this.props.serverReply?.("Could not determine the next extra sub-Interval.");
      return;
    }
    const nextSubIntervalId = String(nextCandidate.subIntervalId || "").trim();
    const nextIntervalId = String(nextCandidate.intervalId || "").trim();
    this.setState((previousState) => {
      const previousList = Array.isArray(
        previousState?.homeManualIntervalsDraftList,
      )
        ? previousState.homeManualIntervalsDraftList
        : [];
      if (
        previousList.some(
          (entry) =>
            String(
              entry?.subIntervalId || entry?.subintervalId || entry?.intervalId || "",
            ).trim() === nextSubIntervalId,
        )
      ) {
        return {
          homeManualIntervalIdDraft: "",
          homeManualIntervalYearDraft: "",
          homeManualIntervalTermDraft: "",
        };
      }
      return {
        homeManualIntervalsDraftList: [
          ...previousList,
          {
            intervalId: nextIntervalId,
            intervalNum: Number.parseInt(nextIntervalId, 10) || null,
            subIntervalId: nextSubIntervalId,
            regular: false,
            intervalStatus: "Normal",
            intervalCourses: [],
          },
        ],
        homeManualIntervalIdDraft: "",
        homeManualIntervalYearDraft: "",
        homeManualIntervalTermDraft: "",
      };
    });
  };
  removeHomeManualIntervalEntry = (subIntervalId = "") => {
    const normalizedSubIntervalId = String(subIntervalId || "").trim();
    if (!normalizedSubIntervalId) {
      return;
    }
    this.setState((previousState) => ({
      homeManualIntervalsDraftList: (Array.isArray(
        previousState?.homeManualIntervalsDraftList,
      )
        ? previousState.homeManualIntervalsDraftList
        : []
      ).filter(
        (entry) =>
          String(
            entry && typeof entry === "object"
              ? entry?.subIntervalId || entry?.subintervalId || entry?.intervalId
              : entry,
          ).trim() !== normalizedSubIntervalId,
      ),
    }));
  };
  deleteHomeIntervalEntry = async (subIntervalId = "") => {
    const normalizedSubIntervalId = String(subIntervalId || "").trim();
    if (!normalizedSubIntervalId) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextEntries = sourceEntries.filter(
      (entry) =>
        String(entry?.subIntervalId || entry?.key || "").trim() !==
        normalizedSubIntervalId,
    );
    try {
      const persistedStudyPlanner =
        await this.persistStudyPlannerIntervals(nextEntries);
      this.setState((previousState) => ({
        plannerRoot: persistedStudyPlanner,
        homeManualIntervalsDraftList: (Array.isArray(
          previousState?.homeManualIntervalsDraftList,
        )
          ? previousState.homeManualIntervalsDraftList
          : []
        ).filter(
          (entry) =>
            String(
              entry?.subIntervalId || entry?.subintervalId || entry?.intervalId || "",
            ).trim() !== normalizedSubIntervalId,
        ),
        homeDeletedIntervalIds: (Array.isArray(previousState?.homeDeletedIntervalIds)
          ? previousState.homeDeletedIntervalIds
          : []
        ).filter(
          (entry) => String(entry || "").trim() !== normalizedSubIntervalId,
        ),
      }));
      this.props.serverReply?.("Subinterval deleted.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to delete subinterval."),
      );
    }
  };
  deleteAllHomeIntervals = async (intervalIds = []) => {
    const normalizedIntervalIds = Array.from(
      new Set(
        (Array.isArray(intervalIds) ? intervalIds : [])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextEntries =
      normalizedIntervalIds.length > 0
        ? sourceEntries.filter(
            (entry) =>
              !normalizedIntervalIds.includes(
                String(entry?.subIntervalId || entry?.key || "").trim(),
              ),
          )
        : [];
    try {
      const persistedStudyPlanner =
        await this.persistStudyPlannerIntervals(nextEntries);
      this.setState({
        plannerRoot: persistedStudyPlanner,
        homeManualIntervalsDraftList: [],
        homeDeletedIntervalIds: [],
      });
      this.props.serverReply?.("Subintervals deleted.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to delete subintervals."),
      );
    }
  };
  setHomeCurrentInterval = async (intervalId = "") => {
    const normalizedIntervalKey = String(intervalId || "").trim();
    if (!normalizedIntervalKey) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const selectedEntry = sourceEntries.find(
      (entry) => this.getPlannerSubIntervalSchemaID(entry) === normalizedIntervalKey,
    );
    if (!selectedEntry) {
      this.props.serverReply?.("Failed to resolve the selected interval.");
      return;
    }
    const selectedEntryIsCurrent = Boolean(selectedEntry?.subIntervalCurrent);
    const persistedStudyPlanner = await this.persistStudyPlannerIntervals(
      sourceEntries.map((entry) => ({
        ...entry,
        subIntervalCurrent: selectedEntryIsCurrent
          ? false
          : this.getPlannerSubIntervalSchemaID(entry) === normalizedIntervalKey,
      })),
    );
    this.setState({
      plannerRoot: persistedStudyPlanner,
      homeCurrentIntervalKey: selectedEntryIsCurrent
        ? ""
        : normalizedIntervalKey,
      homeCurrentIntervalDraft: selectedEntryIsCurrent
        ? ""
        : normalizedIntervalKey,
      homeCurrentIntervalStatusDraft: selectedEntryIsCurrent
        ? "Normal"
        : "current",
      homeCurrentIntervalStartDateDraft: selectedEntryIsCurrent
        ? ""
        : String(
            this.getPlannerSubIntervalTryDates(selectedEntry).start,
          ).trim(),
      homeCurrentIntervalEndDateDraft: selectedEntryIsCurrent
        ? ""
        : String(
            this.getPlannerSubIntervalTryDates(selectedEntry).end,
          ).trim(),
    });
  };
  updateHomeCurrentIntervalDates = async () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const targetIntervalKey = String(
      this.state?.homeCurrentIntervalDraft || this.state?.homeCurrentIntervalKey || "",
    ).trim();
    const currentTargetEntry = sourceEntries.find(
      (entry) => this.getPlannerSubIntervalSchemaID(entry) === targetIntervalKey,
    );
    if (!currentTargetEntry) {
      this.props.serverReply?.("Select a current sub interval first.");
      return null;
    }
    const startDate = String(
      this.state?.homeCurrentIntervalStartDateDraft || "",
    ).trim();
    const endDate = String(this.state?.homeCurrentIntervalEndDateDraft || "").trim();
    if (!startDate || !endDate) {
      this.props.serverReply?.("Enter both start and end dates.");
      return null;
    }
    const persistedStudyPlanner = await this.persistStudyPlannerIntervals(
      sourceEntries.map((entry) => ({
        ...entry,
        subIntervalTryDates:
          this.getPlannerSubIntervalSchemaID(entry) === targetIntervalKey
            ? { start: startDate, end: endDate }
            : {
                start: String(
                  entry?.subIntervalTryDates?.start ||
                    entry?.subIntervalDates?.start ||
                    entry?.startDate ||
                    "",
                ).trim(),
                end: String(
                  entry?.subIntervalTryDates?.end ||
                    entry?.subIntervalDates?.end ||
                    entry?.endDate ||
                    "",
                ).trim(),
              },
        subIntervalDates:
          this.getPlannerSubIntervalSchemaID(entry) === targetIntervalKey
            ? { start: startDate, end: endDate }
            : {
                start: String(
                  entry?.subIntervalTryDates?.start ||
                    entry?.subIntervalDates?.start ||
                    entry?.startDate ||
                    "",
                ).trim(),
                end: String(
                  entry?.subIntervalTryDates?.end ||
                    entry?.subIntervalDates?.end ||
                    entry?.endDate ||
                    "",
                ).trim(),
              },
      })),
    );
    this.setState({
      plannerRoot: persistedStudyPlanner,
      homeSubIntervalsDatesEditorOpen: false,
      homeSubIntervalsDatesEditingKey: "",
    });
    return persistedStudyPlanner;
  };
  setHomeGeneratedIntervalMonthDay = async () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const intervalNum = String(
      this.state?.homeGeneratedIntervalNumDraft || "",
    ).trim();
    const intervalTryNum = String(
      this.state?.homeGeneratedIntervalTryNumDraft || "",
    ).trim();
    const subIntervalNum = String(
      this.state?.homeGeneratedSubIntervalNumDraft || "",
    ).trim();
    const targetEntry = sourceEntries.find(
      (entry) =>
        String(entry?.intervalNum || "").trim() === intervalNum &&
        String(entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "").trim() ===
          intervalTryNum &&
        String(entry?.subIntervalNum || "").trim() === subIntervalNum,
    );
    if (!targetEntry) {
      this.props.serverReply?.("Select an interval try first.");
      return null;
    }
    // Extract year directly from component objects; fall back to ISO string parsing
    const extractYear = (components) => {
      if (components && typeof components === "object" && !Array.isArray(components)) {
        const y = Number(components?.year);
        if (Number.isInteger(y) && y >= 1000 && y <= 9999) return y;
      }
      const isoStr = this.getPlannerSubIntervalTryDates(targetEntry).start;
      const parts = this.splitStudyPlanIsoDateParts(isoStr);
      const y = Number(parts?.year);
      return Number.isInteger(y) && y >= 1000 && y <= 9999 ? y : null;
    };
    const startYearNum = extractYear(targetEntry?.subIntervalTryDates?.start);
    const endYearNum = (() => {
      const components = targetEntry?.subIntervalTryDates?.end;
      if (components && typeof components === "object" && !Array.isArray(components)) {
        const y = Number(components?.year);
        if (Number.isInteger(y) && y >= 1000 && y <= 9999) return y;
      }
      const isoStr = this.getPlannerSubIntervalTryDates(targetEntry).end;
      const parts = this.splitStudyPlanIsoDateParts(isoStr);
      const y = Number(parts?.year);
      return Number.isInteger(y) && y >= 1000 && y <= 9999 ? y : null;
    })();
    const startMonthNum = Number(
      String(this.state?.homeGeneratedStartDateMonthDraft || "").trim(),
    );
    const startDayNum = Number(
      String(this.state?.homeGeneratedStartDateDayDraft || "").trim(),
    );
    const endMonthNum = Number(
      String(this.state?.homeGeneratedEndDateMonthDraft || "").trim(),
    );
    const endDayNum = Number(
      String(this.state?.homeGeneratedEndDateDayDraft || "").trim(),
    );
    const isValidYear = (y) => Number.isInteger(y) && y >= 1000 && y <= 9999;
    const isValidMonth = (m) => Number.isInteger(m) && m >= 1 && m <= 12;
    const isValidDay = (d) => Number.isInteger(d) && d >= 1 && d <= 31;
    if (
      !isValidYear(startYearNum) ||
      !isValidYear(endYearNum) ||
      !isValidMonth(startMonthNum) ||
      !isValidDay(startDayNum) ||
      !isValidMonth(endMonthNum) ||
      !isValidDay(endDayNum)
    ) {
      this.props.serverReply?.(
        "Set month and day for both start and end dates.",
      );
      return null;
    }
    const startComponents = { year: startYearNum, month: startMonthNum, day: startDayNum };
    const endComponents = { year: endYearNum, month: endMonthNum, day: endDayNum };
    const nextStartIso = this.dateComponentsToIsoString(startComponents);
    const nextEndIso = this.dateComponentsToIsoString(endComponents);
    const startDateValue = nextStartIso ? new Date(`${nextStartIso}T00:00:00.000Z`) : "";
    const endDateValue = nextEndIso ? new Date(`${nextEndIso}T00:00:00.000Z`) : "";
    const persistedStudyPlanner = await this.persistStudyPlannerIntervals(
      sourceEntries.map((entry) => {
        const isTarget =
          String(entry?.intervalNum || "").trim() === intervalNum &&
          String(entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "").trim() ===
            intervalTryNum &&
          String(entry?.subIntervalNum || "").trim() === subIntervalNum;
        if (!isTarget) {
          return entry;
        }
        return {
          ...entry,
          subIntervalTryDates: {
            start: {
              ...startComponents,
              date: startDateValue,
            },
            end: {
              ...endComponents,
              date: endDateValue,
            },
          },
          subIntervalDates: {
            start: nextStartIso,
            end: nextEndIso,
          },
          startDate: nextStartIso,
          endDate: nextEndIso,
        };
      }),
    );
    this.setState({
      plannerRoot: persistedStudyPlanner,
    });
    this.props.serverReply?.(
      "Month/day set for the selected sub-interval try.",
    );
    return persistedStudyPlanner;
  };
  setHomeIntervalStatus = async (intervalEntry = {}, status = "Normal") => {
    const targetIntervalId = String(intervalEntry?.intervalId || "").trim();
    const targetSubIntervalId = String(
      intervalEntry?.subIntervalId || intervalEntry?.key || "",
    ).trim();
    if (!targetSubIntervalId && !targetIntervalId) {
      this.props.serverReply?.("Failed to resolve the selected interval.");
      return;
    }
    try {
      const persisted = await this.persistStudyPlannerIntervalStatus({
        intervalId: targetIntervalId,
        subIntervalId: targetSubIntervalId,
        intervalStatus: status,
      });
      this.setState({ plannerRoot: persisted || this.state?.plannerRoot || {} });
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to update interval status."),
      );
    }
  };

  requestResetWithPassword = (label, action) => {
    this.setState({
      homeResetPendingAction: { label, action },
      homeResetPasswordDraft: "",
      homeResetPasswordError: "",
      homeResetPasswordLoading: false,
    });
  };

  confirmResetWithPassword = async () => {
    const { homeResetPendingAction, homeResetPasswordDraft } = this.state;
    const password = String(homeResetPasswordDraft || "").trim();
    if (!password || !homeResetPendingAction?.action) return;
    const token = String(this.props?.state?.token || "").trim();
    this.setState({ homeResetPasswordLoading: true, homeResetPasswordError: "" });
    try {
      const response = await fetch(apiUrl("/api/user/verify-password"), {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.setState({
          homeResetPasswordLoading: false,
          homeResetPasswordError: String(payload?.message || "Password is not correct."),
        });
        return;
      }
      const action = homeResetPendingAction.action;
      this.setState({
        homeResetPendingAction: null,
        homeResetPasswordDraft: "",
        homeResetPasswordError: "",
        homeResetPasswordLoading: false,
      });
      action();
    } catch (error) {
      this.setState({
        homeResetPasswordLoading: false,
        homeResetPasswordError: String(error?.message || "Password verification failed."),
      });
    }
  };

  triggerHomeIntervalRetaking = async (intervalId = "", subIntervalId = "") => {
    const targetIntervalId = String(intervalId || "").trim();
    const targetSubIntervalId = String(subIntervalId || "").trim();
    if (!targetIntervalId || !targetSubIntervalId) {
      this.props.serverReply?.("Failed to resolve the selected interval.");
      return;
    }
    try {
      const persistedStudyPlanner = await this.persistStudyPlannerIntervalStatus({
        intervalId: targetIntervalId,
        subIntervalId: targetSubIntervalId,
        intervalStatus: "Failed",
      });
      this.setState({ plannerRoot: persistedStudyPlanner || this.state?.plannerRoot || {} });
      this.props.serverReply?.("New interval try added.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to add new interval try."),
      );
    }
  };
  _normalizeArabicName = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word
          .replace(/^[أإآٱ]/u, "ا")
          .replace(/ة$/u, "ه")
          .replace(/ى$/u, "ي"),
      )
      .join(" ");

  _INSTRUCTOR_KW_RE =
    /(?:^|(?<=\s))(الدكتورة|الدكتوره|الدكتور|دكتورة|دكتوره|دكتور|الأستاذة|الأستاذه|الأستاذ|الاستاذة|الاستاذه|الاستاذ|أستاذة|أستاذه|أستاذ|استاذة|استاذه|استاذ|د\.?)(?=\s|$)/u;

  findTelegramInstructors = async () => {
    const token = String(this.props?.state?.token || "").trim();
    const groupReference = String(this.state?.telegramSelectedGroupReference || "").trim();
    if (!token || !groupReference) {
      this.props.serverReply?.("Select a Telegram group in Study Materials first.");
      return;
    }
    this.setState({ isTelegramFindingInstructors: true });
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("group", groupReference);
      searchParams.set("limit", "all");
      searchParams.set("offset", "0");
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.props.serverReply?.(String(payload?.error || "Failed to load group messages."));
        return;
      }
      const groupMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const allTexts = groupMessages
        .map((message) => String(message?.text || "").trim())
        .filter(Boolean);
      if (allTexts.length === 0) {
        this.props.serverReply?.("No messages found in this group.");
        return;
      }
      const aiResponse = await fetch(apiUrl("/api/telegram/ai/extract-instructors"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texts: allTexts }),
      });
      const aiPayload = await aiResponse.json().catch(() => ({}));
      if (!aiResponse.ok) {
        this.props.serverReply?.(String(aiPayload?.error || "AI extraction failed."));
        return;
      }
      const programInstructorNames = Array.isArray(aiPayload?.programInstructorNames)
        ? aiPayload.programInstructorNames
        : [];
      const results = programInstructorNames
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          firstName: String(entry?.firstName || "").trim() || null,
          lastName: String(entry?.lastName || "").trim() || null,
          fullName: String(
            entry?.fullName ||
              [
                String(entry?.firstName || "").trim(),
                String(entry?.lastName || "").trim(),
              ]
                .filter(Boolean)
                .join(" "),
          ).trim(),
          personality: String(entry?.personality || "").trim() || null,
          courseNames: Array.isArray(entry?.courseNames)
            ? entry.courseNames.map((value) => String(value || "").trim()).filter(Boolean)
            : [],
          evidence: Array.isArray(entry?.evidence)
            ? entry.evidence.map((value) => String(value || "").trim()).filter(Boolean)
            : [],
          confidence: ["high", "medium", "low"].includes(
            String(entry?.confidence || "").trim().toLowerCase(),
          )
            ? String(entry.confidence).trim().toLowerCase()
            : "low",
        }))
        .filter((entry) => entry.fullName);
      if (results.length === 0) {
        this.props.serverReply?.("No instructors found.");
        return;
      }
      const currentExtractions = Array.isArray(this.state?.plannerRoot?.programAIExtractions)
        ? this.state.plannerRoot.programAIExtractions : [];
      const nextExtractions = [...currentExtractions, {
        programInstructorNames: results,
      }];
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programAIExtractions: nextExtractions,
      });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        this.setState({ plannerRoot: nextPlannerRoot });
      }
      this.props.serverReply?.(`${results.length} instructor(s) saved to AI History.`);
    } catch (err) {
      this.props.serverReply?.(String(err?.message || "Extraction failed."));
    } finally {
      this.setState({ isTelegramFindingInstructors: false });
    }
  };

  extractTelegramCourseNames = async () => {
    const token = String(this.props?.state?.token || "").trim();
    const groupReference = String(this.state?.telegramSelectedGroupReference || "").trim();
    if (!token || !groupReference) {
      this.props.serverReply?.("Select a Telegram group in Study Materials first.");
      return;
    }
    this.setState({ isTelegramExtractingCourseNames: true });
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("group", groupReference);
      searchParams.set("limit", "all");
      searchParams.set("offset", "0");
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.props.serverReply?.(String(payload?.error || "Failed to load group messages."));
        return;
      }
      const groupMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const allTexts = groupMessages.map((m) => String(m?.text || "").trim()).filter(Boolean);
      if (allTexts.length === 0) {
        this.props.serverReply?.("No messages found in the selected group.");
        return;
      }
      console.log(`[extractTelegramCourseNames] sending ${allTexts.length} messages to AI`);
      const aiResponse = await fetch(apiUrl("/api/telegram/ai/extract-courses"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texts: allTexts }),
      });
      const aiPayload = await aiResponse.json().catch(() => ({}));
      console.log("[extractTelegramCourseNames] AI raw payload:", aiPayload);
      if (!aiResponse.ok) {
        this.props.serverReply?.(String(aiPayload?.error || "AI extraction failed."));
        return;
      }
      const courses = Array.isArray(aiPayload?.courses) ? aiPayload.courses : [];
      console.log("[extractTelegramCourseNames] parsed courses:", courses);
      const nameSet = new Set();
      const results = [];
      for (const entry of courses) {
        const courseName = String(entry?.courseName || "").trim();
        if (!courseName || nameSet.has(courseName)) continue;
        nameSet.add(courseName);
        results.push({ courseName, courseCode: String(entry?.courseCode || "").trim() });
      }
      if (results.length === 0) {
        this.props.serverReply?.("No courses found.");
        return;
      }
      const currentExtractions = Array.isArray(this.state?.plannerRoot?.programAIExtractions)
        ? this.state.plannerRoot.programAIExtractions : [];
      const nextExtractions = [...currentExtractions, {
        coursesNameCode: results.map((r) => ({
          courseName: String(r?.courseName || "").trim(),
          courseCode: String(r?.courseCode || "").trim(),
        })),
      }];
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programAIExtractions: nextExtractions,
      });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        this.setState({ plannerRoot: nextPlannerRoot });
      }
      this.props.serverReply?.(`${results.length} course(s) saved to AI History.`);
    } catch (err) {
      this.props.serverReply?.(String(err?.message || "Extraction failed."));
    } finally {
      this.setState({ isTelegramExtractingCourseNames: false });
    }
  };

  acceptAICourseName = async (courseName, courseCode) => {
    const current = Array.isArray(this.state?.plannerRoot?.programCoursesNamesCodes)
      ? this.state.plannerRoot.programCoursesNamesCodes : [];
    const alreadyExists = current.some(
      (c) => String(c?.courseName || "").trim().toLowerCase() === String(courseName || "").trim().toLowerCase(),
    );
    if (alreadyExists) {
      this.props.serverReply?.("Course already in registry.");
      return;
    }
    const nextCourses = [...current, { courseName: String(courseName || "").trim(), courseCode: String(courseCode || "").trim() }];
    const nextPlannerRoot = await this.persistStudyPlannerMeta({ programCoursesNamesCodes: nextCourses });
    if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
      this.setState({ plannerRoot: nextPlannerRoot });
    }
  };

  acceptAIInstructorName = async (firstName, lastName) => {
    const current = Array.isArray(this.state?.plannerRoot?.programInstructors)
      ? this.state.plannerRoot.programInstructors : [];
    const alreadyExists = current.some(
      (e) => String(e?.firstName || "").trim().toLowerCase() === String(firstName || "").trim().toLowerCase(),
    );
    if (alreadyExists) {
      this.props.serverReply?.("Instructor already in registry.");
      return;
    }
    const nextInstructors = [...current, { firstName: String(firstName || "").trim(), lastName: String(lastName || "").trim() }];
    const nextPlannerRoot = await this.persistStudyPlannerMeta({ programInstructors: nextInstructors });
    if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
      this.setState({ plannerRoot: nextPlannerRoot });
    }
  };

  acceptAISubIntervalCourse = async (courseEntry) => {
    const intervals = Array.isArray(this.state?.plannerRoot?.programIntervals)
      ? this.state.plannerRoot.programIntervals : [];
    let placed = false;
    const nextIntervals = intervals.map((interval) => {
      const nextTries = (interval.intervalTry || []).map((tryObj) => {
        const nextSubs = (tryObj.intervalTrysubIntervals || []).map((sub) => {
          if (!sub.subIntervalCurrent) return sub;
          placed = true;
          const existing = Array.isArray(sub.subIntervalCourses) ? sub.subIntervalCourses : [];
          const alreadyThere = existing.some(
            (c) => String(c?.courseName || "").trim().toLowerCase() === String(courseEntry?.courseName || "").trim().toLowerCase(),
          );
          if (alreadyThere) return sub;
          return { ...sub, subIntervalCourses: [...existing, courseEntry] };
        });
        return { ...tryObj, intervalTrysubIntervals: nextSubs };
      });
      return { ...interval, intervalTry: nextTries };
    });
    if (!placed) {
      this.props.serverReply?.("No current sub-interval found.");
      return;
    }
    const nextPlannerRoot = await this.persistStudyPlannerMeta({ programIntervals: nextIntervals });
    if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
      this.setState({ plannerRoot: nextPlannerRoot });
    }
  };

  extractTelegramCourseInfo = async () => {
    const token = String(this.props?.state?.token || "").trim();
    const groupReference = String(this.state?.telegramSelectedGroupReference || "").trim();
    if (!token || !groupReference) {
      this.props.serverReply?.("Select a Telegram group in Study Materials first.");
      return;
    }
    this.setState({ isTelegramExtractingCourseInfo: true });
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("group", groupReference);
      searchParams.set("limit", "all");
      searchParams.set("offset", "0");
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.props.serverReply?.(String(payload?.error || "Failed to load group messages."));
        return;
      }
      const groupMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const allTexts = groupMessages.map((m) => String(m?.text || "").trim()).filter(Boolean);
      if (allTexts.length === 0) {
        this.props.serverReply?.("No messages found in the selected group.");
        return;
      }
      console.log(`[extractTelegramCourseInfo] sending ${allTexts.length} messages to AI`);
      const aiResponse = await fetch(apiUrl("/api/telegram/ai/extract-course-info"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texts: allTexts }),
      });
      const aiPayload = await aiResponse.json().catch(() => ({}));
      console.log("[extractTelegramCourseInfo] AI raw payload:", aiPayload);
      if (!aiResponse.ok) {
        this.props.serverReply?.(String(aiPayload?.error || "AI extraction failed."));
        return;
      }
      const courses = Array.isArray(aiPayload?.courses) ? aiPayload.courses : [];
      if (courses.length === 0) {
        this.props.serverReply?.("No course info found.");
        return;
      }
      const subIntervalCourses = courses.map((c, idx) => ({
        courseSymbol: "CRS",
        courseNum: idx + 1,
        courseID: "",
        courseName: String(c?.courseName || "").trim(),
        courseCode: String(c?.courseCode || "").trim(),
        courseWeight: Number.isFinite(Number(c?.courseWeight)) ? Number(c.courseWeight) : 100,
        courseComponents: Array.isArray(c?.courseComponents)
          ? c.courseComponents.map((comp, cIdx) => ({
              componentSymbol: "COMP",
              componentNum: cIdx + 1,
              componentID: "",
              componentClass: String(comp?.componentClass || "").trim(),
              componentWeight: Number.isFinite(Number(comp?.componentWeight)) ? Number(comp.componentWeight) : null,
            }))
          : [],
      }));
      const currentExtractions = Array.isArray(this.state?.plannerRoot?.programAIExtractions)
        ? this.state.plannerRoot.programAIExtractions : [];
      const nextExtractions = [...currentExtractions, {
        subIntervalCourses,
      }];
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programAIExtractions: nextExtractions,
      });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        this.setState({ plannerRoot: nextPlannerRoot });
      }
      this.props.serverReply?.(`${subIntervalCourses.length} course info record(s) saved.`);
    } catch (err) {
      this.props.serverReply?.(String(err?.message || "Extraction failed."));
    } finally {
      this.setState({ isTelegramExtractingCourseInfo: false });
    }
  };

  acceptTelegramAiPreviewItems = async (selectedIndices) => {
    const preview = this.state?.telegramAiPreviewResults;
    if (!preview) return;
    const { goal, items } = preview;
    const accepted = Array.isArray(selectedIndices)
      ? items.filter((_, i) => selectedIndices.includes(i))
      : items;
    if (accepted.length === 0) return;
    try {
      const currentExtractions = Array.isArray(this.state?.plannerRoot?.programAIExtractions)
        ? this.state.plannerRoot.programAIExtractions : [];
      if (goal === "courses") {
        const current = Array.isArray(this.state?.plannerRoot?.programCoursesNamesCodes)
          ? this.state.plannerRoot.programCoursesNamesCodes : [];
        const seen = new Set(current.map((c) => String(c?.courseName || "").trim().toLowerCase()));
        const toAdd = accepted.filter((r) => !seen.has(String(r?.courseName || "").trim().toLowerCase()));
        const nextCourses = [...current, ...toAdd];
        const nextExtractions = [...currentExtractions, {
          coursesNameCode: accepted.map((r) => ({
            courseName: String(r?.courseName || "").trim(),
            courseCode: String(r?.courseCode || "").trim(),
          })),
        }];
        const nextPlannerRoot = await this.persistStudyPlannerMeta({
          programCoursesNamesCodes: nextCourses,
          programAIExtractions: nextExtractions,
        });
        if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
          this.setState({ plannerRoot: nextPlannerRoot, telegramAiPreviewResults: null });
        }
        this.props.serverReply?.(`${toAdd.length} course(s) added.`);
      } else if (goal === "instructors") {
        const current = Array.isArray(this.state?.plannerRoot?.programInstructors)
          ? this.state.plannerRoot.programInstructors : [];
        const normalizeAcceptedInstructor = (entry) => {
          if (entry && typeof entry === "object") {
            const firstName = String(entry?.firstName || "").trim();
            const lastName = String(entry?.lastName || "").trim();
            const fullName = String(
              entry?.fullName || [firstName, lastName].filter(Boolean).join(" "),
            ).trim();

            if (!fullName && !firstName && !lastName) {
              return null;
            }

            return {
              firstName: firstName || null,
              lastName: lastName || null,
              fullName,
              personality: String(entry?.personality || "").trim() || null,
              courseNames: Array.isArray(entry?.courseNames)
                ? entry.courseNames.map((value) => String(value || "").trim()).filter(Boolean)
                : [],
              evidence: Array.isArray(entry?.evidence)
                ? entry.evidence.map((value) => String(value || "").trim()).filter(Boolean)
                : [],
              confidence: ["high", "medium", "low"].includes(
                String(entry?.confidence || "").trim().toLowerCase(),
              )
                ? String(entry.confidence).trim().toLowerCase()
                : "low",
            };
          }

          const fullName = String(entry || "").trim();
          if (!fullName) {
            return null;
          }

          const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
          return {
            firstName: firstName || null,
            lastName: lastNameParts.join(" ").trim() || null,
            fullName,
            personality: null,
            courseNames: [],
            evidence: [],
            confidence: "low",
          };
        };
        const normalizedAccepted = accepted
          .map((entry) => normalizeAcceptedInstructor(entry))
          .filter(Boolean);
        const seen = new Set(
          current
            .map((entry) => formatInstructorDisplayName(entry).trim().toLowerCase())
            .filter(Boolean),
        );
        const toAdd = normalizedAccepted.filter(
          (entry) =>
            !seen.has(
              String(
                entry?.fullName ||
                  formatInstructorDisplayName({
                    firstName: String(entry?.firstName || "").trim(),
                    lastName: String(entry?.lastName || "").trim(),
                  }),
              )
                .trim()
                .toLowerCase(),
            ),
        );
        const nextInstructors = [
          ...current,
          ...toAdd.map((entry) => ({
            firstName: String(entry?.firstName || "").trim(),
            lastName: String(entry?.lastName || "").trim(),
          })),
        ];
        const nextExtractions = [...currentExtractions, {
          programInstructorNames: normalizedAccepted,
        }];
        const nextPlannerRoot = await this.persistStudyPlannerMeta({
          programInstructors: nextInstructors,
          programAIExtractions: nextExtractions,
        });
        if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
          this.setState({ plannerRoot: nextPlannerRoot, telegramAiPreviewResults: null });
        }
        this.props.serverReply?.(`${toAdd.length} instructor(s) added.`);
      }
    } catch (err) {
      this.props.serverReply?.(String(err?.message || "Failed to accept items."));
    }
  };

  clearTelegramAiPreview = () => {
    this.setState({ telegramAiPreviewResults: null });
  };

  getPlannerIntervalsWithComponents = (plannerRoot = {}) => {
    const plannerIntervals = Array.isArray(plannerRoot?.programIntervals)
      ? plannerRoot.programIntervals
      : [];
    return plannerIntervals
      .flatMap((intervalEntry) => {
        const intervalIDNum = (() => {
          const direct = Number.parseInt(String(intervalEntry?.intervalNum ?? "").trim(), 10);
          if (Number.isFinite(direct) && direct > 0) return direct;
          const rawId = String(intervalEntry?.intervalID || intervalEntry?.intervalId || "").trim();
          const m = rawId.match(/([A-Za-z]+)(\d+)$/);
          return m ? Number(m[2]) : null;
        })();
        const intervalStatus = Array.isArray(intervalEntry?.intervalStatus)
          ? String(intervalEntry?.intervalStatus?.[0] || "Normal").trim() || "Normal"
          : String(intervalEntry?.intervalStatus || "Normal").trim() || "Normal";

        const intervalSymbol = String(intervalEntry?.intervalSymbol || "INT").trim();
        const rawIntervalID = String(
          intervalEntry?.intervalID || intervalEntry?.intervalId || "",
        ).trim();
        const resolvedIntervalID = rawIntervalID;

        const makeSubIntervalEntry = (subIntervalEntry, intervalTryID, intervalTryNum, intervalTrySymbol, subIntervalSymbol) => {
          const rawSubIntervalID = String(subIntervalEntry?.subIntervalID || subIntervalEntry?.subIntervalId || "").trim();
          const resolvedSubSymbol = subIntervalSymbol || String(subIntervalEntry?.subIntervalSymbol || "sINT").trim();
          const resolvedSubIntervalNum =
            Number.parseInt(String(subIntervalEntry?.subIntervalNum || "").trim(), 10) ||
            null;
          const subIntervalID =
            rawSubIntervalID ||
            this.buildPlannerHierarchyId(
              intervalTryID,
              resolvedSubSymbol,
              resolvedSubIntervalNum,
            );
          if (!subIntervalID) return null;
          return {
            key: subIntervalID,
            intervalID: resolvedIntervalID,
            intervalId: resolvedIntervalID,
            intervalNum: intervalIDNum,
            intervalSymbol,
            intervalTryID: intervalTryID || "",
            intervalTryNum: intervalTryNum ?? null,
            intervalTrySymbol: intervalTrySymbol || "IT",
            subIntervalID,
            subIntervalId: subIntervalID,
            subIntervalNum: String(
              resolvedSubIntervalNum ?? subIntervalID,
            ).trim(),
            subIntervalSymbol: resolvedSubSymbol,
            subIntervalCurrent: Boolean(subIntervalEntry?.subIntervalCurrent),
            regular: true,
            intervalStatus,
            subIntervalTryDates: {
              start: this.getPlannerSubIntervalTryDates(subIntervalEntry).start,
              end: this.getPlannerSubIntervalTryDates(subIntervalEntry).end,
            },
            subIntervalDates: {
              start: this.getPlannerSubIntervalTryDates(subIntervalEntry).start,
              end: this.getPlannerSubIntervalTryDates(subIntervalEntry).end,
            },
            startDate: this.getPlannerSubIntervalTryDates(subIntervalEntry).start,
            endDate: this.getPlannerSubIntervalTryDates(subIntervalEntry).end,
            intervalCourses: Array.isArray(subIntervalEntry?.subIntervalCourses)
              ? subIntervalEntry.subIntervalCourses
              : Array.isArray(subIntervalEntry?.intervalCourses)
                ? subIntervalEntry.intervalCourses
                : [],
          };
        };

        // New structure: intervalTry[].intervalTrysubIntervals
        const intervalTries = Array.isArray(intervalEntry?.intervalTry) ? intervalEntry.intervalTry : [];
        if (intervalTries.length > 0) {
          return intervalTries.flatMap((tryEntry) => {
            const tryNum = (() => {
              const direct = Number.parseInt(String(tryEntry?.intervalTryNum ?? "").trim(), 10);
              if (Number.isFinite(direct) && direct > 0) return direct;
              const rawId = String(tryEntry?.intervalTryID || tryEntry?.intervalTryId || "").trim();
              const m = rawId.match(/([A-Za-z]+)(\d+)$/);
              return m ? Number(m[2]) : null;
            })();
            const trySymbol = String(tryEntry?.intervalTrySymbol || "IT").trim();
            const tryID =
              String(tryEntry?.intervalTryID || tryEntry?.intervalTryId || "").trim() ||
              this.buildPlannerHierarchyId(
                resolvedIntervalID,
                trySymbol,
                tryNum,
              );
            return (Array.isArray(tryEntry?.intervalTrysubIntervals) ? tryEntry.intervalTrysubIntervals : [])
              .map((sub) => makeSubIntervalEntry(sub, tryID, tryNum, trySymbol, String(sub?.subIntervalSymbol || "sINT").trim()))
              .filter(Boolean);
          });
        }

        return [];
      })
      .filter(Boolean);
  };
  loadHomePlannerData = async () => {
    const userId = String(this.props?.state?.my_id || "").trim();
    const token = String(this.props?.state?.token || "").trim();
    if (!userId || !token) {
      return null;
    }
    if (this.homePlannerLoadRequestedForUserId === userId) {
      return this.state?.plannerRoot || null;
    }
    const nextPlannerRoot = await this.fetchStudyPlannerFromDb();
    if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
      this.homePlannerLoadRequestedForUserId = userId;
      const nextProgramId = String(nextPlannerRoot?.programID || "").trim();
      const nextPlannerIntervals =
        this.getPlannerIntervalsWithComponents(nextPlannerRoot);
      const persistedCurrentIntervalEntry =
        nextPlannerIntervals.find(
          (entry) =>
            Boolean(entry?.subIntervalCurrent) ||
            String(entry?.intervalStatus || "").trim().toLowerCase() ===
              "current",
        ) || null;
      const persistedCurrentIntervalKey = String(
        persistedCurrentIntervalEntry?.key ||
          persistedCurrentIntervalEntry?.subIntervalId ||
          "",
      ).trim();
      const persistedCurrentIntervalStartDate = String(
        this.getPlannerSubIntervalTryDates(persistedCurrentIntervalEntry).start,
      ).trim();
      const persistedCurrentIntervalEndDate = String(
        this.getPlannerSubIntervalTryDates(persistedCurrentIntervalEntry).end,
      ).trim();
      const nextProgramComponents = Array.isArray(
        nextPlannerRoot?.programComponentClasses,
      )
        ? nextPlannerRoot.programComponentClasses
            .map((entry) => this.normalizeProgramComponentValue(entry))
            .filter(Boolean)
        : [];
      const nextProgramExamClasses = Array.isArray(
        nextPlannerRoot?.programExamClasses,
      )
        ? nextPlannerRoot.programExamClasses
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        : [];
      const nextPrimaryFailingRule = this.getPrimaryProgramFailingRule(
        nextPlannerRoot,
      );
      this.setState((previousState) => ({
        plannerRoot: nextPlannerRoot,
        homeProgramIdDraft:
          String(previousState?.homeProgramIdDraft || "").trim() ||
          nextProgramId,
        homeProgramNameDraft:
          String(previousState?.homeProgramNameDraft || "").trim() ||
          String(nextPlannerRoot?.programName || "").trim(),
        homeLanguageDraft:
          String(previousState?.homeLanguageDraft || "").trim() ||
          String(nextPlannerRoot?.programLanguage || "").trim(),
        homeUniversityDraft:
          String(previousState?.homeUniversityDraft || "").trim() ||
          String(nextPlannerRoot?.programUniversity || "").trim(),
        homeFacultyDraft:
          String(previousState?.homeFacultyDraft || "").trim() ||
          String(nextPlannerRoot?.programFaculty || "").trim(),
        homeProgramStartYearValue: String(
          nextPlannerRoot?.programStartYear ?? "",
        ).trim(),
        homeProgramStartYearDraft:
          String(previousState?.homeProgramStartYearDraft || "").trim() ||
          String(nextPlannerRoot?.programStartYear ?? "").trim(),
        homeProgramTotalYearsValue: String(
          nextPlannerRoot?.programTotalYears ?? "",
        ).trim(),
        homeProgramTotalYearsDraft:
          String(previousState?.homeProgramTotalYearsDraft || "").trim() ||
          String(nextPlannerRoot?.programTotalYears ?? "").trim(),
        homeProgramTermsPerYearValue: String(
          nextPlannerRoot?.programTermsPerYear ?? "",
        ).trim(),
        homeProgramTermsPerYearDraft:
          String(previousState?.homeProgramTermsPerYearDraft || "").trim() ||
          String(nextPlannerRoot?.programTermsPerYear ?? "").trim(),
        homeIntervalPassingThresholdModeValue: String(
          nextPrimaryFailingRule?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdModeDraft:
          String(
            previousState?.homeIntervalPassingThresholdModeDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdMode ?? "").trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPrimaryFailingRule?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitDraft:
          String(
            previousState?.homeIntervalPassingThresholdUnitDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdUnit ?? "").trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPrimaryFailingRule?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberDraft:
          String(
            previousState?.homeIntervalPassingThresholdNumberDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdNumber ?? "").trim(),
        homeProgramCardSet:
          Boolean(previousState?.homeProgramCardSet) || Boolean(nextProgramId),
        homeComponentsCardSet:
          Boolean(previousState?.homeComponentsCardSet) ||
          nextProgramComponents.length > 0,
        homeComponentsDraftList:
          nextProgramComponents.length > 0
            ? nextProgramComponents
            : previousState?.homeComponentsDraftList || [],
        homeExamsCardSet:
          Boolean(previousState?.homeExamsCardSet) ||
          nextProgramExamClasses.length > 0,
        homeExamsDraftList:
          nextProgramExamClasses.length > 0
            ? nextProgramExamClasses
            : previousState?.homeExamsDraftList || [],
        homeCurrentIntervalKey:
          String(previousState?.homeCurrentIntervalKey || "").trim() ||
          persistedCurrentIntervalKey,
        homeCurrentIntervalDraft:
          String(previousState?.homeCurrentIntervalDraft || "").trim() ||
          persistedCurrentIntervalKey,
        homeCurrentIntervalStatusDraft:
          String(previousState?.homeCurrentIntervalStatusDraft || "").trim() ||
          (persistedCurrentIntervalKey ? "current" : "Normal"),
        homeCurrentIntervalStartDateDraft:
          String(previousState?.homeCurrentIntervalStartDateDraft || "").trim() ||
          persistedCurrentIntervalStartDate,
        homeCurrentIntervalEndDateDraft:
          String(previousState?.homeCurrentIntervalEndDateDraft || "").trim() ||
          persistedCurrentIntervalEndDate,
        homeManualIntervalsDraftList:
          previousState?.homeManualIntervalsDraftList || [],
        homeGeneratedIntervalNumDraft:
          String(previousState?.homeGeneratedIntervalNumDraft || "").trim(),
        homeGeneratedIntervalTryNumDraft:
          String(previousState?.homeGeneratedIntervalTryNumDraft || "").trim(),
        homeGeneratedSubIntervalNumDraft:
          String(previousState?.homeGeneratedSubIntervalNumDraft || "").trim(),
        homeGeneratedStartDateMonthDraft:
          String(previousState?.homeGeneratedStartDateMonthDraft || "").trim(),
        homeGeneratedStartDateDayDraft:
          String(previousState?.homeGeneratedStartDateDayDraft || "").trim(),
        homeGeneratedEndDateMonthDraft:
          String(previousState?.homeGeneratedEndDateMonthDraft || "").trim(),
        homeGeneratedEndDateDayDraft:
          String(previousState?.homeGeneratedEndDateDayDraft || "").trim(),
      }));
    }
    return nextPlannerRoot;
  };
  persistStudyPlannerComponents = async (programComponents = []) => {
    return this.runPlannerPendingTask("Saving components...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedComponentIds = Array.from(
        new Set(
          (Array.isArray(programComponents) ? programComponents : [])
            .map((entry) => this.normalizeProgramComponentValue(entry))
            .filter(Boolean),
        ),
      );
      if (!userId || !token) {
        throw new Error("Failed to save components: login data is incomplete.");
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerComponents/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programComponentClasses: normalizedComponentIds,
            componentIds: normalizedComponentIds,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save components (${response.status}).`,
          ),
        );
      }
      return payload?.studyPlanner || {};
    });
  };
  persistStudyPlannerExamClasses = async (programExamClasses = []) => {
    return this.runPlannerPendingTask("Saving exam classes...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedProgramExamClasses = Array.from(
        new Set(
          (Array.isArray(programExamClasses) ? programExamClasses : [])
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        ),
      );
      if (!userId || !token) {
        throw new Error(
          "Failed to save exam classes: login data is incomplete.",
        );
      }
      const response = await fetch(
        apiUrl(`/api/user/editStudyPlannerMeta/${userId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programExamClasses: normalizedProgramExamClasses,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String(
            payload?.message ||
              `Failed to save exam classes (${response.status}).`,
          ),
        );
      }
      return payload?.studyPlanner || {};
    });
  };
  fetchStudyPlannerFromDb = async () => {
    return this.runPlannerPendingTask("Loading planner...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      if (!userId || !token) {
        return null;
      }
      const response = await fetch(apiUrl(`/api/user/studyPlanner/${userId}`), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return null;
      }
      return payload?.studyPlanner && typeof payload.studyPlanner === "object"
        ? payload.studyPlanner
        : null;
    });
  };
  isUsablePlannerRoot = (plannerRoot = null) => {
    if (!plannerRoot || typeof plannerRoot !== "object") {
      return false;
    }
    if (String(plannerRoot?.programID || "").trim()) {
      return true;
    }
    if (
      plannerRoot?.studyOrganizer &&
      typeof plannerRoot.studyOrganizer === "object"
    ) {
      return true;
    }
    if (
      plannerRoot?.studyPlanAid &&
      typeof plannerRoot.studyPlanAid === "object"
    ) {
      return true;
    }
    if (Array.isArray(plannerRoot?.programComponentClasses)) {
      return true;
    }
    if (Array.isArray(plannerRoot?.programExamClasses)) {
      return true;
    }
    if (Array.isArray(plannerRoot?.programExams)) {
      return true;
    }
    if (Array.isArray(plannerRoot?.exams)) {
      return true;
    }
    return false;
  };
  getResolvedPlannerRoot = () => {
    const statePlannerRoot =
      this.state?.plannerRoot && typeof this.state.plannerRoot === "object"
        ? this.state.plannerRoot
        : null;
    if (this.isUsablePlannerRoot(statePlannerRoot)) {
      return statePlannerRoot;
    }
    const propsMemoryPlannerRoot = this.extractPlannerRootFromState(
      this.props?.state || {},
    );
    if (this.isUsablePlannerRoot(propsMemoryPlannerRoot)) {
      return propsMemoryPlannerRoot;
    }
    const propsPlannerRoot = this.extractPlannerRootFromState(
      this.props?.state || {},
    );
    if (this.isUsablePlannerRoot(propsPlannerRoot)) {
      return propsPlannerRoot;
    }
    return {};
  };
  handleHomeProgramSetSubmit = async () => {
    const programId = String(this.state?.homeProgramIdDraft || "").trim();
    if (!programId) {
      this.props.serverReply?.("Enter program ID first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerProgram(programId);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramCardSet: true,
        homeProgramSetEditorOpen: false,
      });
      this.props.serverReply?.("Program set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set program."),
      );
    }
  };
  handleHomeLanguageSetSubmit = async () => {
    const programLanguage = String(this.state?.homeLanguageDraft || "").trim();
    if (!programLanguage) {
      this.props.serverReply?.("Enter program language first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programLanguage,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeLanguageEditorOpen: false,
      });
      this.props.serverReply?.("Language set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set language."),
      );
    }
  };
  handleHomeUniversitySetSubmit = async () => {
    const programUniversity = String(
      this.state?.homeUniversityDraft || "",
    ).trim();
    if (!programUniversity) {
      this.props.serverReply?.("Enter university first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programUniversity,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeUniversityEditorOpen: false,
      });
      this.props.serverReply?.("University set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set university."),
      );
    }
  };
  handleHomeFacultySetSubmit = async () => {
    const programFaculty = String(this.state?.homeFacultyDraft || "").trim();
    if (!programFaculty) {
      this.props.serverReply?.("Enter faculty first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programFaculty,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeFacultyEditorOpen: false,
      });
      this.props.serverReply?.("Faculty set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set faculty."),
      );
    }
  };
  handleHomeComponentsSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeComponentsDraftList)
      ? this.state.homeComponentsDraftList
      : [];
      const componentEntries = Array.from(
        new Set(
          draftList
            .map((entry) => this.normalizeProgramComponentValue(entry))
            .filter(Boolean),
        ),
      );
    try {
      const nextPlannerRoot =
        await this.persistStudyPlannerComponents(componentEntries);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeComponentsCardSet: true,
        homeComponentsSetEditorOpen: false,
      });
      this.props.serverReply?.("Components set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set components."),
      );
    }
  };
  cancelHomeExamsEditor = () => {
    this.setState({
      homeExamsSetEditorOpen: false,
      homeExamInput: "",
      homeExamsDraftList: Array.isArray(this.state?.homeExamsDraftList)
        ? this.state.homeExamsDraftList
        : [],
    });
  };
  handleHomeExamsSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeExamsDraftList)
      ? this.state.homeExamsDraftList
      : [];
    const programExamClasses = Array.from(
      new Set(
        draftList.map((entry) => String(entry || "").trim()).filter(Boolean),
      ),
    );
    try {
      const nextPlannerRoot = await this.persistStudyPlannerExamClasses(
        programExamClasses,
      );
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeExamsCardSet: true,
        homeExamsSetEditorOpen: false,
      });
      this.props.serverReply?.("Program exam classes set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set program exam classes."),
      );
    }
  };
  appendHomeProgramInstructorDraftEntry = () => {
    const firstName = String(
      this.state?.homeProgramInstructorFirstNameInput || "",
    ).trim();
    const lastName = String(
      this.state?.homeProgramInstructorLastNameInput || "",
    ).trim();
    if (!firstName && !lastName) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeProgramInstructorsDraftList)
        ? previousState.homeProgramInstructorsDraftList
        : [];
      const duplicateExists = prevList.some((entry) => {
        const normalizedEntry = normalizeInstructorEntry(entry);
        return (
          String(normalizedEntry?.firstName || "").trim().toLowerCase() ===
            firstName.toLowerCase() &&
          String(normalizedEntry?.lastName || "").trim().toLowerCase() ===
            lastName.toLowerCase()
        );
      });
      if (duplicateExists) {
        return {
          homeProgramInstructorFirstNameInput: "",
          homeProgramInstructorLastNameInput: "",
        };
      }
      return {
        homeProgramInstructorsDraftList: [...prevList, { firstName, lastName }],
        homeProgramInstructorFirstNameInput: "",
        homeProgramInstructorLastNameInput: "",
      };
    });
  };
  editHomeProgramInstructorDraftEntry = (entry = {}) => {
    const normalizedEntry = normalizeInstructorEntry(entry);
    if (!normalizedEntry) {
      return;
    }
    this.setState((previousState) => ({
      homeProgramInstructorsDraftList: (Array.isArray(
        previousState?.homeProgramInstructorsDraftList,
      )
        ? previousState.homeProgramInstructorsDraftList
        : []
      ).filter((draftEntry) => {
        const normalizedDraftEntry = normalizeInstructorEntry(draftEntry);
        return !(
          String(normalizedDraftEntry?.firstName || "").trim() ===
            normalizedEntry.firstName &&
          String(normalizedDraftEntry?.lastName || "").trim() ===
            normalizedEntry.lastName
        );
      }),
      homeProgramInstructorFirstNameInput: normalizedEntry.firstName,
      homeProgramInstructorLastNameInput: normalizedEntry.lastName,
    }));
  };
  removeHomeProgramInstructorDraftEntry = async (entry = {}) => {
    const normalizedEntry = normalizeInstructorEntry(entry);
    if (!normalizedEntry) return;
    const currentInstructors = Array.isArray(
      this.state?.plannerRoot?.programInstructors,
    )
      ? this.state.plannerRoot.programInstructors
      : [];
    const nextInstructors = currentInstructors.filter(
      (currentEntry) => {
        const normalizedCurrentEntry = normalizeInstructorEntry(currentEntry);
        return !(
          String(normalizedCurrentEntry?.firstName || "").trim() ===
            normalizedEntry.firstName &&
          String(normalizedCurrentEntry?.lastName || "").trim() ===
            normalizedEntry.lastName
        );
      },
    );
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programInstructors: nextInstructors
          .map((currentEntry) => normalizeInstructorEntry(currentEntry))
          .filter(Boolean),
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramInstructorsDraftList: nextInstructors,
      });
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to remove instructor."),
      );
    }
  };
  appendHomeProgramEditorDraftEntry = () => {
    const inputValue = String(this.state?.homeProgramEditorInput || "").trim();
    if (!inputValue) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeProgramEditorsDraftList)
        ? previousState.homeProgramEditorsDraftList
        : [];
      if (prevList.includes(inputValue)) {
        return { homeProgramEditorInput: "" };
      }
      return {
        homeProgramEditorsDraftList: [...prevList, inputValue],
        homeProgramEditorInput: "",
      };
    });
  };
  editHomeProgramEditorDraftEntry = (value = "") => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return;
    }
    this.setState((previousState) => ({
      homeProgramEditorsDraftList: (Array.isArray(
        previousState?.homeProgramEditorsDraftList,
      )
        ? previousState.homeProgramEditorsDraftList
        : []
      ).filter((entry) => String(entry || "").trim() !== normalizedValue),
      homeProgramEditorInput: normalizedValue,
    }));
  };
  removeHomeProgramEditorDraftEntry = (value = "") => {
    const normalizedValue = String(value || "").trim();
    this.setState((previousState) => ({
      homeProgramEditorsDraftList: (Array.isArray(
        previousState?.homeProgramEditorsDraftList,
      )
        ? previousState.homeProgramEditorsDraftList
        : []
      ).filter((entry) => String(entry || "").trim() !== normalizedValue),
    }));
  };
  normalizeHomeProgramLocationDraftEntry = (entry = {}) => ({
    building: String(entry?.building || "").trim(),
    rooms: Array.from(
      new Set(
        (Array.isArray(entry?.rooms)
          ? entry.rooms
          : entry?.room
            ? [entry.room]
            : []
        )
          .map((roomEntry) => String(roomEntry || "").trim())
          .filter(Boolean),
      ),
    ),
  });
  parseHomeProgramLocationRoomsInput = (value = "") =>
    Array.from(
      new Set(
        String(value || "")
          .split(/[\n,]+/)
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
  appendHomeProgramLocationDraftEntry = () => {
    const building = String(this.state?.homeProgramLocationBuildingInput || "").trim();
    if (!building) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeProgramLocationsDraftList)
        ? previousState.homeProgramLocationsDraftList
        : [];
      const exists = prevList.some(
        (entry) => String(entry?.building || "").trim() === building,
      );
      const nextList = exists ? prevList : [...prevList, { building, rooms: [] }];
      return {
        homeProgramLocationsDraftList: nextList,
        homeProgramLocationBuildingInput: "",
      };
    });
  };

  appendRoomToLocationDraftEntry = (building, room) => {
    const b = String(building || "").trim();
    const r = String(room || "").trim();
    if (!b || !r) return;
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeProgramLocationsDraftList)
        ? previousState.homeProgramLocationsDraftList
        : [];
      const prevInputs = previousState?.homeProgramLocationRoomInputs &&
        typeof previousState.homeProgramLocationRoomInputs === "object"
          ? previousState.homeProgramLocationRoomInputs
          : {};
      return {
        homeProgramLocationsDraftList: prevList.map((entry) => {
          if (String(entry?.building || "").trim() !== b) return entry;
          const existingRooms = Array.isArray(entry?.rooms) ? entry.rooms : [];
          return {
            ...entry,
            rooms: Array.from(
              new Set([...existingRooms, r].map((s) => String(s || "").trim()).filter(Boolean)),
            ),
          };
        }),
        homeProgramLocationRoomInputs: { ...prevInputs, [b]: "" },
      };
    });
  };
  editHomeProgramLocationDraftEntry = (entry = {}) => {
    const nextLocation = this.normalizeHomeProgramLocationDraftEntry(entry);
    this.setState({
      homeProgramLocationBuildingInput: nextLocation.building,
      homeProgramLocationRoomInputs: {},
    });
  };
  removeHomeProgramLocationDraftEntry = (entry = {}) => {
    const nextLocation = this.normalizeHomeProgramLocationDraftEntry(entry);
    this.setState((previousState) => ({
      homeProgramLocationsDraftList: (Array.isArray(
        previousState?.homeProgramLocationsDraftList,
      )
        ? previousState.homeProgramLocationsDraftList
        : []
      ).filter((draftEntry) => {
        return String(draftEntry?.building || "").trim() !== nextLocation.building;
      }),
    }));
  };
  appendHomeProgramCourseNameDraftEntry = () => {
    const courseName = String(this.state?.homeProgramCoursesNamesInput || "").trim();
    if (!courseName) return;
    const courseCode = String(this.state?.homeProgramCoursesCodesInput || "").trim();
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeProgramCoursesNamesDraftList)
        ? previousState.homeProgramCoursesNamesDraftList
        : [];
      if (prevList.some((e) => String(e?.courseName || "").trim() === courseName)) {
        return { homeProgramCoursesNamesInput: "", homeProgramCoursesCodesInput: "" };
      }
      return {
        homeProgramCoursesNamesDraftList: [...prevList, { courseName, courseCode }],
        homeProgramCoursesNamesInput: "",
        homeProgramCoursesCodesInput: "",
      };
    });
  };

  editHomeProgramCourseNameDraftEntry = (entry = {}) => {
    const courseName = String(entry?.courseName || "").trim();
    if (!courseName) return;
    this.setState((previousState) => ({
      homeProgramCoursesNamesDraftList: (Array.isArray(previousState?.homeProgramCoursesNamesDraftList)
        ? previousState.homeProgramCoursesNamesDraftList
        : []
      ).filter((e) => String(e?.courseName || "").trim() !== courseName),
      homeProgramCoursesNamesInput: courseName,
      homeProgramCoursesCodesInput: String(entry?.courseCode || "").trim(),
    }));
  };

  removeHomeProgramCourseNameDraftEntry = async (courseName = "") => {
    const normalizedName = String(courseName || "").trim();
    if (!normalizedName) return;
    const currentList = Array.isArray(this.state?.plannerRoot?.programCoursesNamesCodes)
      ? this.state.plannerRoot.programCoursesNamesCodes
      : [];
    const nextList = currentList.filter((e) => String(e?.courseName || "").trim() !== normalizedName);
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({ programCoursesNamesCodes: nextList });
      this.setState({
        plannerRoot: nextPlannerRoot && typeof nextPlannerRoot === "object" ? nextPlannerRoot : this.state?.plannerRoot || {},
        homeProgramCoursesNamesDraftList: nextList,
      });
    } catch (error) {
      this.props.serverReply?.(String(error?.message || "Failed to remove course."));
    }
  };

  cancelHomeProgramCoursesNamesEditor = () => {
    this.setState({
      homeProgramCoursesNamesSetEditorOpen: false,
      homeProgramCoursesNamesInput: "",
      homeProgramCoursesCodesInput: "",
      homeProgramCoursesNamesDraftList: Array.isArray(this.state?.plannerRoot?.programCoursesNamesCodes)
        ? this.state.plannerRoot.programCoursesNamesCodes
            .map((e) => {
              const obj = e && typeof e === "object" ? e : {};
              const name = String(obj?.courseName || "").trim();
              if (!name) return null;
              return { courseName: name, courseCode: String(obj?.courseCode || "").trim() };
            })
            .filter(Boolean)
        : [],
    });
  };

  handleHomeProgramCoursesNamesSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeProgramCoursesNamesDraftList)
      ? this.state.homeProgramCoursesNamesDraftList
      : [];
    const seen = new Set();
    const programCoursesNamesCodes = draftList
      .map((entry) => {
        const obj = entry && typeof entry === "object" ? entry : {};
        const courseName = String(obj?.courseName || "").trim();
        if (!courseName || seen.has(courseName)) return null;
        seen.add(courseName);
        return { courseName, courseCode: String(obj?.courseCode || "").trim() };
      })
      .filter(Boolean);
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({ programCoursesNamesCodes });
      this.setState({
        plannerRoot: nextPlannerRoot && typeof nextPlannerRoot === "object" ? nextPlannerRoot : this.state?.plannerRoot || {},
        homeProgramCoursesNamesCardSet: true,
        homeProgramCoursesNamesSetEditorOpen: false,
      });
      this.props.serverReply?.("Program courses names & codes set.");
    } catch (error) {
      this.props.serverReply?.(String(error?.message || "Failed to set program courses names & codes."));
    }
  };

  handleHomeProgramCoursesNamesReset = async () => {
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({ programCoursesNamesCodes: [] });
      this.setState({
        plannerRoot: nextPlannerRoot && typeof nextPlannerRoot === "object" ? nextPlannerRoot : this.state?.plannerRoot || {},
        homeProgramCoursesNamesCardSet: false,
        homeProgramCoursesNamesDraftList: [],
        homeProgramCoursesNamesSetEditorOpen: false,
      });
      this.props.serverReply?.("Program courses names & codes reset.");
    } catch (error) {
      this.props.serverReply?.(String(error?.message || "Failed to reset program courses names & codes."));
    }
  };

  handleHomeProgramInstructorsSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeProgramInstructorsDraftList)
      ? this.state.homeProgramInstructorsDraftList
      : [];
    const seen = new Set();
    const programInstructors = draftList
      .map((entry) => {
        const normalizedEntry = normalizeInstructorEntry(entry);
        const dedupeKey = formatInstructorDisplayName(normalizedEntry).toLowerCase();
        if (!normalizedEntry || !dedupeKey || seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);
        return normalizedEntry;
      })
      .filter(Boolean);
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programInstructors,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramInstructorsCardSet: true,
        homeProgramInstructorsSetEditorOpen: false,
        homeProgramInstructorFirstNameInput: "",
        homeProgramInstructorLastNameInput: "",
      });
      this.props.serverReply?.("Program instructors set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set program instructors."),
      );
    }
  };
  handleHomeProgramInstructorsReset = async () => {
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programInstructors: [],
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramInstructorsCardSet: false,
        homeProgramInstructorsDraftList: [],
        homeProgramInstructorsSetEditorOpen: false,
        homeProgramInstructorFirstNameInput: "",
        homeProgramInstructorLastNameInput: "",
      });
      this.props.serverReply?.("Program instructors reset.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to reset program instructors."),
      );
    }
  };

  handleHomeProgramEditorsSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeProgramEditorsDraftList)
      ? this.state.homeProgramEditorsDraftList
      : [];
    const programEditors = Array.from(
      new Set(
        draftList.map((entry) => String(entry || "").trim()).filter(Boolean),
      ),
    );
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programEditors,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramEditorsCardSet: true,
        homeProgramEditorsSetEditorOpen: false,
      });
      this.props.serverReply?.("Program editors set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set program editors."),
      );
    }
  };
  handleHomeProgramLocationsSetSubmit = async () => {
    const draftList = Array.isArray(this.state?.homeProgramLocationsDraftList)
      ? this.state.homeProgramLocationsDraftList
      : [];
    const programLocations = Array.from(
      new Map(
        draftList
          .map((entry) => ({
            building: String(entry?.building || "").trim(),
            rooms: Array.from(
              new Set(
                this.parseHomeProgramLocationRoomsInput(
                  Array.isArray(entry?.rooms) ? entry.rooms.join("\n") : "",
                ),
              ),
            ),
          }))
          .filter((entry) => entry.building && entry.rooms.length > 0)
          .map((entry) => [entry.building, entry]),
      ).values(),
    );
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programLocations,
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramLocationsCardSet: true,
        homeProgramLocationsSetEditorOpen: false,
      });
      this.props.serverReply?.("Program locations set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to set program locations."),
      );
    }
  };
  appendHomeExamDraftEntry = () => {
    const inputValue = String(this.state?.homeExamInput || "").trim();
    if (!inputValue) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeExamsDraftList)
        ? previousState.homeExamsDraftList
        : [];
      if (prevList.includes(inputValue)) {
        return {
          homeExamInput: "",
        };
      }
      return {
        homeExamsDraftList: [...prevList, inputValue],
        homeExamInput: "",
      };
    });
  };
  editHomeExamDraftEntry = (examValue = "") => {
    const normalizedExamValue = String(examValue || "").trim();
    if (!normalizedExamValue) {
      return;
    }
    this.setState((previousState) => ({
      homeExamsDraftList: (Array.isArray(previousState?.homeExamsDraftList)
        ? previousState.homeExamsDraftList
        : []
      ).filter((entry) => String(entry || "").trim() !== normalizedExamValue),
      homeExamInput: normalizedExamValue,
    }));
  };
  removeHomeExamDraftEntry = async (examValue = "") => {
    const normalizedExamValue = String(examValue || "").trim();
    if (!normalizedExamValue) {
      return;
    }
    this.setState((previousState) => ({
      homeExamsDraftList: (Array.isArray(previousState?.homeExamsDraftList)
        ? previousState.homeExamsDraftList
        : []
      ).filter((entry) => String(entry || "").trim() !== normalizedExamValue),
    }));
  };
  appendHomeComponentDraftEntry = () => {
    const inputValue = String(this.state?.homeComponentIdInput || "").trim();
    if (!inputValue) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeComponentsDraftList)
        ? previousState.homeComponentsDraftList
        : [];
      if (
        prevList.some(
          (entry) => this.normalizeProgramComponentValue(entry) === inputValue,
        )
      ) {
        return {
          homeComponentIdInput: "",
        };
      }
      return {
        homeComponentsDraftList: [...prevList, inputValue],
        homeComponentIdInput: "",
      };
    });
  };
  editHomeComponentDraftEntry = (componentId = "") => {
    const normalizedComponentId = String(componentId || "").trim();
    if (!normalizedComponentId) {
      return;
    }
    this.setState((previousState) => {
      const currentList = Array.isArray(previousState?.homeComponentsDraftList)
        ? previousState.homeComponentsDraftList
        : [];
      return {
        homeComponentsDraftList: currentList.filter(
          (entry) =>
            this.normalizeProgramComponentValue(entry) !== normalizedComponentId,
        ),
        homeComponentIdInput: normalizedComponentId,
      };
    });
  };
  removeHomeComponentDraftEntry = async (componentId = "") => {
    const normalizedComponentId = String(componentId || "").trim();
    if (!normalizedComponentId) {
      return;
    }
    this.setState((previousState) => ({
      homeComponentsDraftList: (Array.isArray(
        previousState?.homeComponentsDraftList,
      )
        ? previousState.homeComponentsDraftList
        : []
      ).filter(
        (entry) =>
          this.normalizeProgramComponentValue(entry) !== normalizedComponentId,
      ),
    }));
  };
  setStudyPlanAttendanceComponentKey = (nextValue = "all") => {
    const normalizedValue = String(nextValue || "").trim() || "all";
    this.setState({ studyPlanAttendanceComponentKey: normalizedValue });
  };
  setStudyPlanAttendanceExcludeMode = (nextValue = false) => {
    this.setState({ studyPlanAttendanceExcludeMode: Boolean(nextValue) });
  };
  splitStudyPlanIsoDateParts = (value = "") => {
    const trimmedValue = String(value || "").trim();
    const fullMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (fullMatch) {
      return {
        day: String(Number(fullMatch[3])).padStart(2, "0"),
        month: String(Number(fullMatch[2])).padStart(2, "0"),
        year: fullMatch[1],
      };
    }
    const yearMatch = trimmedValue.match(/^(\d{4})$/);
    if (yearMatch) {
      return { day: "", month: "", year: yearMatch[1] };
    }
    return { day: "", month: "", year: "" };
  };
  formatPlannerFullDate = (value = "") => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(value);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const explicitDate =
        value?.date instanceof Date && !Number.isNaN(value.date.getTime())
          ? value.date
          : null;
      const componentDate = explicitDate || this.componentObjectToUtcDate(value);
      if (componentDate) {
        return new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: explicitDate ? undefined : "UTC",
        }).format(componentDate);
      }
    }
    const trimmedValue = String(value || "").trim();
    if (!trimmedValue) {
      return "";
    }
    const fullMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!fullMatch) {
      return trimmedValue;
    }
    const year = Number(fullMatch[1]);
    const month = Number(fullMatch[2]);
    const day = Number(fullMatch[3]);
    const fullDate = new Date(year, month - 1, day);
    if (Number.isNaN(fullDate.getTime())) {
      return trimmedValue;
    }
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(fullDate);
  };
  dateComponentsToIsoString = (components) => {
    if (!components || typeof components !== "object" || Array.isArray(components)) return "";
    const year = Number(components?.year);
    if (!Number.isFinite(year) || year < 1000 || year > 9999) return "";
    const month = Number(components?.month);
    const day = Number(components?.day);
    if (Number.isFinite(month) && month >= 1 && month <= 12 && Number.isFinite(day) && day >= 1 && day <= 31) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return String(year);
  };
  formatPlannerTableValue = (value = "") => {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue || normalizedValue === "-" || normalizedValue === "(pending)") {
      return "";
    }
    return normalizedValue;
  };
  composeStudyPlanIsoDateFromParts = (parts = {}) => {
    const day = String(parts?.day || "").trim();
    const month = String(parts?.month || "").trim();
    const year = String(parts?.year || "").trim();
    if (!day || !month || !year) {
      return "";
    }
    const dayNumber = Number(day);
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (
      !Number.isInteger(dayNumber) ||
      !Number.isInteger(monthNumber) ||
      !Number.isInteger(yearNumber) ||
      dayNumber < 1 ||
      dayNumber > 31 ||
      monthNumber < 1 ||
      monthNumber > 12 ||
      yearNumber < 1000 ||
      yearNumber > 9999
    ) {
      return "";
    }
    const isoDate = `${String(yearNumber).padStart(4, "0")}-${String(
      monthNumber,
    ).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const candidateDate = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(candidateDate.getTime())) {
      return "";
    }
    if (
      candidateDate.getFullYear() !== yearNumber ||
      candidateDate.getMonth() + 1 !== monthNumber ||
      candidateDate.getDate() !== dayNumber
    ) {
      return "";
    }
    return isoDate;
  };
  getPlannerSubIntervalTryDates = (entry = {}) => {
    const resolveDate = (raw, fallback1, fallback2) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) return this.dateComponentsToIsoString(raw);
      const s = String(raw || "").trim();
      if (s) return s;
      if (fallback1 && typeof fallback1 === "object" && !Array.isArray(fallback1)) return this.dateComponentsToIsoString(fallback1);
      const s1 = String(fallback1 || "").trim();
      if (s1) return s1;
      return String(fallback2 || "").trim();
    };
    const start = resolveDate(entry?.subIntervalTryDates?.start, entry?.subIntervalDates?.start, entry?.startDate);
    const end = resolveDate(entry?.subIntervalTryDates?.end, entry?.subIntervalDates?.end, entry?.endDate);
    return { start, end };
  };
  setStudyPlanIntervalDraft = (nextDraft = {}) => {
    const currentDraft = this.state?.studyPlanIntervalDraft || {};
    const mergedDraft = {
      ...currentDraft,
      ...nextDraft,
    };
    const hasExplicitStartDate = Object.prototype.hasOwnProperty.call(
      nextDraft,
      "startDate",
    );
    const hasExplicitEndDate = Object.prototype.hasOwnProperty.call(
      nextDraft,
      "endDate",
    );
    const startParts = hasExplicitStartDate
      ? this.splitStudyPlanIsoDateParts(nextDraft?.startDate)
      : {
          day: String(
            mergedDraft?.startDateDay ?? currentDraft?.startDateDay ?? "",
          ).trim(),
          month: String(
            mergedDraft?.startDateMonth ?? currentDraft?.startDateMonth ?? "",
          ).trim(),
          year: String(
            mergedDraft?.startDateYear ?? currentDraft?.startDateYear ?? "",
          ).trim(),
        };
    const endParts = hasExplicitEndDate
      ? this.splitStudyPlanIsoDateParts(nextDraft?.endDate)
      : {
          day: String(
            mergedDraft?.endDateDay ?? currentDraft?.endDateDay ?? "",
          ).trim(),
          month: String(
            mergedDraft?.endDateMonth ?? currentDraft?.endDateMonth ?? "",
          ).trim(),
          year: String(
            mergedDraft?.endDateYear ?? currentDraft?.endDateYear ?? "",
          ).trim(),
        };
    const nextStartDate = hasExplicitStartDate
      ? String(nextDraft?.startDate || "").trim()
      : this.composeStudyPlanIsoDateFromParts(startParts);
    const nextEndDate = hasExplicitEndDate
      ? String(nextDraft?.endDate || "").trim()
      : this.composeStudyPlanIsoDateFromParts(endParts);
    this.setState({
      studyPlanIntervalDraft: {
        componentClass: String(
          nextDraft?.componentClass ?? currentDraft?.componentClass ?? "",
        ).trim(),
        startDate: nextStartDate,
        endDate: nextEndDate,
        startDateDay: startParts.day,
        startDateMonth: startParts.month,
        startDateYear: startParts.year,
        endDateDay: endParts.day,
        endDateMonth: endParts.month,
        endDateYear: endParts.year,
      },
    });
  };
  toggleStudyPlanExcludedDay = (dayKey = "") => {
    const normalizedDayKey = String(dayKey || "").slice(0, 10);
    if (!normalizedDayKey) {
      return;
    }
    this.setState((previousState) => {
      const previousList = Array.isArray(
        previousState?.studyPlanExcludedAttendanceDates,
      )
        ? previousState.studyPlanExcludedAttendanceDates
        : [];
      return {
        studyPlanExcludedAttendanceDates: previousList.includes(
          normalizedDayKey,
        )
          ? previousList.filter((entry) => entry !== normalizedDayKey)
          : [...previousList, normalizedDayKey],
      };
    });
  };
  addStudyPlanInterval = async () => {
    const intervalDraft = this.state?.studyPlanIntervalDraft || {};
    const componentClass = String(intervalDraft?.componentClass || "").trim();
    const startDate = String(intervalDraft?.startDate || "").trim();
    const endDate = String(intervalDraft?.endDate || "").trim();
    if (!componentClass || !startDate || !endDate) {
      this.props.serverReply?.(
        "Select component class and enter start/end dates.",
      );
      return;
    }
    const studyPlanAid = this.getPlannerStudyPlanAid();
    const nextIntervals = [
      ...(Array.isArray(studyPlanAid?.intervals) ? studyPlanAid.intervals : []),
      { componentClass, startDate, endDate },
    ];
    const persistedStudyPlanAid = await this.persistStudyPlanAid({
      intervals: nextIntervals,
    });
    this.setPlannerStudyPlanAidState(persistedStudyPlanAid);
    this.setState((previousState) => ({
      studyPlanIntervalDraft: {
        ...(previousState?.studyPlanIntervalDraft || {}),
        startDate: "",
        endDate: "",
        startDateDay: "",
        startDateMonth: "",
        startDateYear: "",
        endDateDay: "",
        endDateMonth: "",
        endDateYear: "",
      },
    }));
    this.props.serverReply?.("Interval added.");
  };
  addHomeTableInterval = async () => {
    const startYear = Number(this.state?.homeProgramStartYearValue || 0);
    const totalYears = Number(this.state?.homeProgramTotalYearsValue || 0);
    const totalTermsPerYear = Number(
      this.state?.homeProgramTermsPerYearValue || 0,
    );
    const plannerRoot = this.getResolvedPlannerRoot();
    const generatedIntervalSchemas = this.buildHomeGeneratedIntervals(
      startYear,
      totalYears,
      totalTermsPerYear,
      String(plannerRoot?.programID || this.state?.homeProgramIdDraft || "").trim(),
      String(plannerRoot?.intervalSymbol || "INT").trim(),
      String(plannerRoot?.intervalTrySymbol || "IT").trim(),
      String(plannerRoot?.subIntervalSymbol || "sINT").trim(),
    );
    const manualIntervals = this.getNormalizedHomeManualIntervals();
    const manualIntervalSchemas = this.buildHomeManualIntervalSchemas(
      manualIntervals,
      String(plannerRoot?.programID || this.state?.homeProgramIdDraft || "").trim(),
      String(plannerRoot?.intervalSymbol || "INT").trim(),
      String(plannerRoot?.intervalTrySymbol || "IT").trim(),
      String(plannerRoot?.subIntervalSymbol || "sINT").trim(),
    );
    const deletedIntervalIds = Array.from(
      new Set(
        (Array.isArray(this.state?.homeDeletedIntervalIds)
          ? this.state.homeDeletedIntervalIds
          : []
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const existingIntervals = Array.isArray(plannerRoot?.programIntervals)
      ? plannerRoot.programIntervals
      : [];
    const nextIntervals = [...generatedIntervalSchemas, ...manualIntervalSchemas];
    const remainingExistingIntervals = existingIntervals.filter(
      (intervalEntry) => {
        const flattenedRows = this.getPlannerIntervalsWithComponents({
          programIntervals: [intervalEntry],
        });
        if (flattenedRows.length === 0) {
          return true;
        }
        return flattenedRows.some((rowEntry) => {
          const intervalKey = String(
            rowEntry?.key || rowEntry?.subIntervalId || rowEntry?.intervalId || "",
          ).trim();
          return intervalKey && !deletedIntervalIds.includes(intervalKey);
        });
      },
    );
    if (
      nextIntervals.length === 0 &&
      remainingExistingIntervals.length === existingIntervals.length
    ) {
      this.props.serverReply?.(
        "Enter valid generated intervals or add unusual intervals.",
      );
      return;
    }
    const persistedStudyPlanner = await this.persistStudyPlannerIntervals([
      ...remainingExistingIntervals,
      ...nextIntervals,
    ]);
    this.setState({
      plannerRoot: persistedStudyPlanner,
    });
    this.setState({
      homeIntervalToolbarOpen: false,
      homeExpectedIntervalsGenerated: true,
      homeIntervalStatusDrafts: {},
      homeManualIntervalIdDraft: "",
      homeManualIntervalYearDraft: "",
      homeManualIntervalTermDraft: "",
      homeManualIntervalsDraftList: [],
      homeDeletedIntervalIds: [],
    });
    this.props.serverReply?.("Intervals generated.");
  };
  handleHomeProgramStartYearSetSubmit = async () => {
    const programStartYearValue = String(
      this.state?.homeProgramStartYearDraft || "",
    ).trim();
    if (!programStartYearValue) {
      this.props.serverReply?.("Enter program start year.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programStartYear: Number(programStartYearValue),
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramStartYearValue: String(
          nextPlannerRoot?.programStartYear ?? programStartYearValue,
        ).trim(),
        homeProgramStartYearDraft: String(
          nextPlannerRoot?.programStartYear ?? programStartYearValue,
        ).trim(),
        homeProgramStartYearEditorOpen: false,
      });
      this.props.serverReply?.("Program start year set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save program start year."),
      );
    }
  };
  handleHomeProgramTotalYearsSetSubmit = async () => {
    const programTotalYearsValue = String(
      this.state?.homeProgramTotalYearsDraft || "",
    ).trim();
    if (!programTotalYearsValue) {
      this.props.serverReply?.("Enter total years.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programTotalYears: Number(programTotalYearsValue),
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramTotalYearsValue: String(
          nextPlannerRoot?.programTotalYears ?? programTotalYearsValue,
        ).trim(),
        homeProgramTotalYearsDraft: String(
          nextPlannerRoot?.programTotalYears ?? programTotalYearsValue,
        ).trim(),
        homeProgramTotalYearsEditorOpen: false,
      });
      this.props.serverReply?.("Program total years set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save total years."),
      );
    }
  };
  handleHomeProgramTermsPerYearSetSubmit = async () => {
    const programTermsPerYearValue = String(
      this.state?.homeProgramTermsPerYearDraft || "",
    ).trim();
    if (!programTermsPerYearValue) {
      this.props.serverReply?.("Enter terms per year.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programTermsPerYear: Number(programTermsPerYearValue),
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeProgramTermsPerYearValue: String(
          nextPlannerRoot?.programTermsPerYear ?? programTermsPerYearValue,
        ).trim(),
        homeProgramTermsPerYearDraft: String(
          nextPlannerRoot?.programTermsPerYear ?? programTermsPerYearValue,
        ).trim(),
        homeProgramTermsPerYearEditorOpen: false,
      });
      this.props.serverReply?.("Terms per year set.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save terms per year."),
      );
    }
  };
  handleHomeIntervalPassingThresholdSetSubmit = async () => {
    const draftList = Array.isArray(
      this.state?.homeIntervalPassingThresholdDraftList,
    )
      ? this.state.homeIntervalPassingThresholdDraftList
      : [];
    const normalizedProgramFailingRules = draftList
      .map((entry) => this.normalizeProgramFailingRuleDraftValue(entry))
      .filter(Boolean)
      .map((entry) => ({
        thresholdMode: entry.thresholdMode,
        thresholdUnit: entry.thresholdUnit,
        thresholdNumber: Number(entry.thresholdNumber),
        thresholdRule: String(entry?.thresholdRule || "").trim() || null,
      }));
    const hasAnyThresholdValue = normalizedProgramFailingRules.length > 0;
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programFailingRules: normalizedProgramFailingRules,
        programPassingThresholdPerInterval: hasAnyThresholdValue
          ? normalizedProgramFailingRules[0]
          : {
              thresholdMode: null,
              thresholdUnit: null,
              thresholdNumber: null,
            },
      });
      const nextPrimaryFailingRule = this.getPrimaryProgramFailingRule(
        nextPlannerRoot,
      );
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeIntervalPassingThresholdModeValue: String(
          nextPrimaryFailingRule?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdModeDraft: String(
          nextPrimaryFailingRule?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPrimaryFailingRule?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitDraft: String(
          nextPrimaryFailingRule?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPrimaryFailingRule?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberDraft: String(
          nextPrimaryFailingRule?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdValueList: normalizedProgramFailingRules.map(
          (entry, index) => ({
            key: this.buildProgramFailingRuleDraftKey(entry) || `rule_${index}`,
            thresholdMode: String(entry?.thresholdMode || "").trim(),
            thresholdUnit: String(entry?.thresholdUnit || "").trim(),
            thresholdNumber: String(entry?.thresholdNumber ?? "").trim(),
            thresholdRule: String(entry?.thresholdRule || "").trim(),
          }),
        ),
        homeIntervalPassingThresholdDraftList: normalizedProgramFailingRules.map(
          (entry, index) => ({
            key: this.buildProgramFailingRuleDraftKey(entry) || `rule_${index}`,
            thresholdMode: String(entry?.thresholdMode || "").trim(),
            thresholdUnit: String(entry?.thresholdUnit || "").trim(),
            thresholdNumber: String(entry?.thresholdNumber ?? "").trim(),
            thresholdRule: String(entry?.thresholdRule || "").trim(),
          }),
        ),
        homeIntervalPassingThresholdEditorOpen: false,
        homeIntervalPassingThresholdDraftTouched: false,
      });
      this.props.serverReply?.(
        hasAnyThresholdValue
          ? "Program passing rules set."
          : "Program passing rules cleared.",
      );
    } catch (error) {
      this.props.serverReply?.(
        String(
          error?.message || "Failed to save program passing rules.",
        ),
      );
    }
  };
  appendHomeIntervalPassingThresholdDraftEntry = () => {
    const thresholdMode = String(
      this.state?.homeIntervalPassingThresholdModeDraft || "",
    ).trim();
    const thresholdUnit = String(
      this.state?.homeIntervalPassingThresholdUnitDraft || "",
    ).trim();
    const thresholdNumber = String(
      this.state?.homeIntervalPassingThresholdNumberDraft || "",
    ).trim();
    const thresholdRule = String(
      this.state?.homeIntervalPassingThresholdRuleDraft || "",
    ).trim();
    const hasAnyThresholdValue =
      Boolean(thresholdMode) || Boolean(thresholdUnit) || Boolean(thresholdNumber);
    if (
      hasAnyThresholdValue &&
      (!thresholdMode || !thresholdUnit || !thresholdNumber)
    ) {
      this.props.serverReply?.("Fill the rule before adding it.");
      return;
    }
    if (!hasAnyThresholdValue) {
      return;
    }
    const nextDraftRule = {
      key: this.buildProgramFailingRuleDraftKey({
        thresholdMode,
        thresholdUnit,
        thresholdNumber,
        thresholdRule,
      }),
      thresholdMode,
      thresholdUnit,
      thresholdNumber,
      thresholdRule,
    };
    this.setState((previousState) => {
      const prevList = Array.isArray(
        previousState?.homeIntervalPassingThresholdDraftList,
      )
        ? previousState.homeIntervalPassingThresholdDraftList
        : [];
      const existingIndex = prevList.findIndex(
        (entry) =>
          this.buildProgramFailingRuleDraftKey(entry) === nextDraftRule.key,
      );
      const nextList =
        existingIndex >= 0
          ? prevList.map((entry, index) =>
              index === existingIndex ? nextDraftRule : entry,
            )
          : [...prevList, nextDraftRule];
      return {
        homeIntervalPassingThresholdDraftList: nextList,
        homeIntervalPassingThresholdModeDraft: "",
        homeIntervalPassingThresholdUnitDraft: "",
        homeIntervalPassingThresholdNumberDraft: "",
        homeIntervalPassingThresholdRuleDraft: "",
        homeIntervalPassingThresholdIsEditing: false,
        homeIntervalPassingThresholdDraftTouched: true,
      };
    });
  };
  editHomeIntervalPassingThresholdDraftEntry = (rule = {}) => {
    const normalizedRule = this.normalizeProgramFailingRuleDraftValue(rule);
    if (!normalizedRule) {
      return;
    }
    const targetKey = this.buildProgramFailingRuleDraftKey(normalizedRule);
    this.setState((previousState) => ({
      homeIntervalPassingThresholdDraftList: (Array.isArray(
        previousState?.homeIntervalPassingThresholdDraftList,
      )
        ? previousState.homeIntervalPassingThresholdDraftList
        : []
      ).filter(
        (entry) => this.buildProgramFailingRuleDraftKey(entry) !== targetKey,
      ),
      homeIntervalPassingThresholdModeDraft: normalizedRule.thresholdMode,
      homeIntervalPassingThresholdUnitDraft: normalizedRule.thresholdUnit,
      homeIntervalPassingThresholdNumberDraft: normalizedRule.thresholdNumber,
      homeIntervalPassingThresholdRuleDraft: normalizedRule.thresholdRule || "",
      homeIntervalPassingThresholdIsEditing: true,
    }));
  };
  removeHomeIntervalPassingThresholdDraftEntry = (rule = {}) => {
    const normalizedRule = this.normalizeProgramFailingRuleDraftValue(rule);
    if (!normalizedRule) {
      return;
    }
    const targetKey = this.buildProgramFailingRuleDraftKey(normalizedRule);
    this.setState((previousState) => ({
      homeIntervalPassingThresholdDraftList: (Array.isArray(
        previousState?.homeIntervalPassingThresholdDraftList,
      )
        ? previousState.homeIntervalPassingThresholdDraftList
        : []
      ).filter(
        (entry) => this.buildProgramFailingRuleDraftKey(entry) !== targetKey,
      ),
      homeIntervalPassingThresholdDraftTouched: true,
    }));
  };
  normalizeHomeCourseComponentDraftEntry = (entry = {}) => {
    const normalizedEntry =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry
        : { componentId: entry };
    const componentId = String(
      normalizedEntry?.componentClass ||
        normalizedEntry?.componentName ||
      normalizedEntry?.componentId ||
        normalizedEntry?.course_componentId ||
        normalizedEntry?.id ||
        "",
    ).trim();
    if (!componentId) {
      return null;
    }
    const normalizePlannerLectureDateInput = (value) => {
      if (!value) {
        return "";
      }
      const directValue = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(directValue)) {
        return directValue;
      }
      const parsedDate = new Date(value);
      if (Number.isNaN(parsedDate.getTime())) {
        return directValue;
      }
      return parsedDate.toISOString().slice(0, 10);
    };
    return {
      componentId,
      componentID: String(normalizedEntry?.componentID || "").trim(),
      componentNum: Number.isFinite(Number.parseInt(normalizedEntry?.componentNum, 10))
        ? Number.parseInt(normalizedEntry.componentNum, 10)
        : null,
      componentWeightPercentage: String(
        normalizedEntry?.componentRelativeWeight ||
          normalizedEntry?.componentWeightPercentage ||
          normalizedEntry?.componentPartialWeight ||
          normalizedEntry?.componentWeight ||
          normalizedEntry?.partialWeight ||
          "",
      ).trim(),
      componentPartialWeight: String(
        normalizedEntry?.componentRelativeWeight ||
          normalizedEntry?.componentWeightPercentage ||
          normalizedEntry?.componentPartialWeight ||
          normalizedEntry?.componentWeight ||
          normalizedEntry?.partialWeight ||
          "",
      ).trim(),
      componentWeight: String(
        normalizedEntry?.componentWeight ||
          normalizedEntry?.componentRelativeWeight ||
          normalizedEntry?.componentPartialWeight ||
          normalizedEntry?.componentWeightPercentage ||
          normalizedEntry?.partialWeight ||
          "",
      ).trim(),
      componentStatus: String(
        normalizedEntry?.componentStatus ||
          normalizedEntry?.component_status ||
          normalizedEntry?.status ||
          "",
      ).trim(),
      componentExams: Array.isArray(normalizedEntry?.componentExams)
        ? normalizedEntry.componentExams
        : [],
    };
  };
  formatPlannerComponentWeightPercentage = (value) => {
    const normalizedValue =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value || "").replace("%", "").trim());
    if (!Number.isFinite(normalizedValue)) {
      return "-";
    }
    const displayValue = Number.isInteger(normalizedValue)
      ? String(Math.trunc(normalizedValue))
      : String(Number(normalizedValue.toFixed(2)));
    return `${displayValue}%`;
  };
  formatPlannerComponentWeightValue = (value) => {
    const normalizedValue =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value || "").replace("%", "").trim());
    if (!Number.isFinite(normalizedValue)) {
      return "-";
    }
    return Number.isInteger(normalizedValue)
      ? String(Math.trunc(normalizedValue))
      : String(Number(normalizedValue.toFixed(4)));
  };
  formatPlannerDateInputValue = (value) => {
    if (!value) {
      return "";
    }
    const directValue = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(directValue)) {
      return directValue;
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return directValue;
    }
    return parsedDate.toISOString().slice(0, 10);
  };
  parsePlannerIsoDateUtc = (value) => {
    const normalizedValue = this.formatPlannerDateInputValue(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      return null;
    }
    const parsedDate = new Date(`${normalizedValue}T00:00:00Z`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };
  getPlannerCurrentSubIntervalCalendarEntry = () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const selectedIntervalDraftKey = String(
      this.state?.homeCurrentIntervalDraft || "",
    ).trim();
    const selectedIntervalKey = String(
      this.state?.homeCurrentIntervalKey || "",
    ).trim();
    const resolveEntryByKey = (targetKey = "") =>
      targetKey
        ? sourceEntries.find((entry) =>
            [
              entry?.key,
              entry?.subIntervalID,
              entry?.subIntervalId,
              entry?.subIntervalNum,
              entry?.intervalId,
            ]
              .map((value) => String(value || "").trim())
              .filter(Boolean)
              .includes(targetKey),
          ) || null
        : null;
    const explicitCurrentEntry =
      resolveEntryByKey(selectedIntervalDraftKey) ||
      resolveEntryByKey(selectedIntervalKey);
    if (explicitCurrentEntry) {
      const draftStartDate = String(
        this.state?.homeCurrentIntervalStartDateDraft || "",
      ).trim();
      const draftEndDate = String(
        this.state?.homeCurrentIntervalEndDateDraft || "",
      ).trim();
      const explicitEntryKey = String(
        explicitCurrentEntry?.key || explicitCurrentEntry?.subIntervalId || "",
      ).trim();
      const activeSelectionKey = selectedIntervalDraftKey || selectedIntervalKey;
      return activeSelectionKey && activeSelectionKey === explicitEntryKey
        ? {
            ...explicitCurrentEntry,
            subIntervalTryDates: {
              start:
                draftStartDate ||
                this.getPlannerSubIntervalTryDates(explicitCurrentEntry).start,
              end:
                draftEndDate ||
                this.getPlannerSubIntervalTryDates(explicitCurrentEntry).end,
            },
            subIntervalDates: {
              start:
                draftStartDate ||
                this.getPlannerSubIntervalTryDates(explicitCurrentEntry).start,
              end:
                draftEndDate ||
                this.getPlannerSubIntervalTryDates(explicitCurrentEntry).end,
            },
            startDate:
              draftStartDate ||
              this.getPlannerSubIntervalTryDates(explicitCurrentEntry).start,
            endDate:
              draftEndDate ||
              this.getPlannerSubIntervalTryDates(explicitCurrentEntry).end,
          }
        : explicitCurrentEntry;
    }
    return (
      sourceEntries.find(
        (entry) =>
          Boolean(entry?.subIntervalCurrent) ||
          String(entry?.intervalStatus || "").trim().toLowerCase() === "current",
      ) || null
    );
  };
  componentObjectToUtcDate = (comp) => {
    if (!comp || typeof comp !== "object" || Array.isArray(comp)) return null;
    const y = Number(comp.year);
    const m = Number(comp.month);
    const d = Number(comp.day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const candidate = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  };

  buildPlannerCurrentSubIntervalCalendarDays = () => {
    const currentEntry = this.getPlannerCurrentSubIntervalCalendarEntry();
    const startDateValue = String(
      this.getPlannerSubIntervalTryDates(currentEntry).start,
    ).trim();
    const endDateValue = String(
      this.getPlannerSubIntervalTryDates(currentEntry).end,
    ).trim();
    const startDate =
      this.parsePlannerIsoDateUtc(startDateValue) ||
      this.componentObjectToUtcDate(currentEntry?.subIntervalTryDates?.start);
    const endDate =
      this.parsePlannerIsoDateUtc(endDateValue) ||
      this.componentObjectToUtcDate(currentEntry?.subIntervalTryDates?.end);
    if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) {
      return {
        currentEntry,
        startDateValue: startDate ? startDate.toISOString().slice(0, 10) : startDateValue,
        endDateValue: endDate ? endDate.toISOString().slice(0, 10) : endDateValue,
        startDate,
        endDate,
        days: [],
      };
    }
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
    const monthFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    const days = [];
    const cursor = new Date(startDate.getTime());
    while (cursor.getTime() <= endDate.getTime()) {
      days.push({
        key: cursor.toISOString().slice(0, 10),
        isoDate: cursor.toISOString().slice(0, 10),
        dayNumber: cursor.getUTCDate(),
        monthLabel: monthFormatter.format(cursor),
        weekdayLabel: dayFormatter.format(cursor),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return {
      currentEntry,
      startDateValue,
      endDateValue,
      startDate,
      endDate,
      days,
    };
  };
  buildPlannerMaterialMetadataCourseId = ({
    subIntervalId = "",
    courseNum = "",
    courseSymbol = "CRS",
  } = {}) => {
    const normalizedCourseNum = String(courseNum || "").trim();
    if (!normalizedCourseNum) return "";
    const normalizedSubIntervalId = String(subIntervalId || "").trim();
    if (!normalizedSubIntervalId) return "";
    const normalizedCourseSymbol = String(courseSymbol || "CRS").trim();
    return `${normalizedSubIntervalId}${normalizedCourseSymbol}${normalizedCourseNum}`;
  };
  parsePlannerMaterialMetadataCourseId = (value = "") => {
    const s = String(value || "").trim();
    const strictMatch = s.match(/^(.*\d)([A-Za-z]+)(\d+)$/);
    if (strictMatch) {
      return {
        intervalNum: this.parseIntervalIdYearTerm(strictMatch[1])?.intervalNum || "",
        tryNum: this.parseIntervalIdYearTerm(strictMatch[1])?.tryNum || "",
        subIntervalNum: this.parseIntervalIdYearTerm(strictMatch[1])?.subIntervalNum || "",
        subIntervalId: strictMatch[1],
        courseNum: strictMatch[3],
      };
    }
    return { intervalNum: "", tryNum: "", subIntervalNum: "", subIntervalId: "", courseNum: "" };
  };
  getPlannerMaterialMetadataCourseRows = (plannerRoot = {}) => {
    const plannerIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    return plannerIntervals.flatMap((intervalEntry) => {
      const intervalNum = Number.parseInt(
        String(intervalEntry?.intervalNum || "").trim(),
        10,
      );
      const intervalID = this.getPlannerIntervalSchemaID(intervalEntry);
      const subIntervalId = String(
        intervalEntry?.subIntervalID ||
          intervalEntry?.subIntervalId ||
          intervalEntry?.key ||
          "",
      ).trim();
      const intervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : Array.isArray(intervalEntry?.subIntervalCourses)
          ? intervalEntry.subIntervalCourses
          : [];
      return intervalCourses.flatMap((courseEntry, courseIndex) => {
        const courseComponents = Array.isArray(courseEntry?.courseComponents)
          ? courseEntry.courseComponents
          : [];
        const courseNum =
          Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
          courseIndex + 1;
        const displayComponents =
          courseComponents.length > 0
            ? courseComponents
            : [
                {
                  componentClass: String(
                    courseEntry?.courseComponentName ||
                      courseEntry?.courseComponentId ||
                      "",
                  ).trim(),
                  componentExams: [],
                },
              ];
      return displayComponents.map((componentEntry, componentIndex) => {
        const courseComponent = String(
          componentEntry?.componentClass ||
            courseEntry?.courseComponentName ||
            courseEntry?.courseComponentId ||
            "",
        ).trim() || "-";
        const rawCourseID = String(courseEntry?.courseID || "").trim();
        const parsedCourseID = this.parsePlannerMaterialMetadataCourseId(rawCourseID);
        const resolvedCourseNum =
          Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
          Number.parseInt(String(parsedCourseID?.courseNum || "").trim(), 10) ||
          courseNum;
        const courseId = rawCourseID || this.buildPlannerMaterialMetadataCourseId({
          subIntervalId,
          courseNum: resolvedCourseNum,
        });
        const resolvedComponentNum = Number.isFinite(Number.parseInt(componentEntry?.componentNum, 10))
          ? Number.parseInt(componentEntry.componentNum, 10)
          : componentIndex + 1;
        const componentSym = String(componentEntry?.componentSymbol || "COMP").trim();
        const componentID =
          String(componentEntry?.componentID || "").trim() ||
          (courseId
            ? `${courseId}-${componentSym}${resolvedComponentNum}`
            : "-");
        return {
          key: `${subIntervalId}_${courseNum}_${componentIndex}_${courseComponent}`,
          intervalID,
          intervalNum: Number.isInteger(intervalNum) ? intervalNum : null,
          subIntervalID: subIntervalId,
          subIntervalId,
          courseNum: resolvedCourseNum,
          courseID: courseId,
          courseId,
          courseName: String(courseEntry?.courseName || "").trim() || "-",
          courseCode: String(courseEntry?.courseCode || "").trim() || "-",
          courseWeight: String(courseEntry?.courseWeight ?? "").trim() || "-",
          courseComponent,
          componentID,
          componentNum: resolvedComponentNum,
          courseComponents: courseComponents,
          componentWeight: componentEntry?.componentWeight ?? null,
          componentExams: Array.isArray(componentEntry?.componentExams)
            ? componentEntry.componentExams
            : [],
          };
        });
      });
    });
  };
  getPlannerMaterialMetadataLectureRows = (plannerRoot = {}) => {
    return this.getPlannerMaterialMetadataCourseRows(plannerRoot).flatMap(
      (courseRow) =>
        (Array.isArray(courseRow?.componentExams) ? courseRow.componentExams : []).flatMap(
          (examEntry, examIdx) => {
            const examID = String(examEntry?.examID || "").trim();
            return (Array.isArray(examEntry?.examsLectures) ? examEntry.examsLectures : []).map(
              (lectureEntry, lectureIndex) => ({
                key: `${courseRow.key}_${examID || examIdx}_lecture_${String(lectureEntry?._id || "").trim() || lectureIndex}`,
                lectureID: String(lectureEntry?.lectureID || "").trim(),
                courseID: courseRow.courseID,
                courseId: courseRow.courseID,
              componentID: courseRow.componentID,
              examID,
              courseName: courseRow.courseName || "-",
              intervalID: courseRow.intervalID,
              intervalNum: courseRow.intervalNum,
              subIntervalID: courseRow.subIntervalID || courseRow.subIntervalId,
              subIntervalId: courseRow.subIntervalId,
              courseNum: courseRow.courseNum,
              courseComponent: courseRow.courseComponent,
                lectureNum:
                  Number.parseInt(String(lectureEntry?.lectureNum || "").trim(), 10) ||
                  lectureIndex + 1,
                lectureName: String(lectureEntry?.lectureName || "").trim() || "-",
                lectureInstructor: Array.isArray(lectureEntry?.lectureInstructors)
                  ? lectureEntry.lectureInstructors.join(", ")
                  : "-",
              }),
            );
          },
        ),
    );
  };
  getPlannerMaterialMetadataExamRows = (plannerRoot = {}) => {
    return this.getPlannerMaterialMetadataCourseRows(plannerRoot).flatMap(
      (courseRow) =>
        (Array.isArray(courseRow?.componentExams) ? courseRow.componentExams : []).map(
          (examEntry, examIndex) => {
            const normalizedExam = examEntry && typeof examEntry === "object" ? examEntry : {};
            const examID = String(normalizedExam?.examID || "").trim();
            const examNum = Number.parseInt(String(normalizedExam?.examNum || "").trim(), 10) || examIndex + 1;
            return {
              key: examID || `${courseRow.key}_exam_${examIndex}`,
              examID,
              examNum,
              componentID: courseRow.componentID,
              courseName: courseRow.courseName || "-",
              courseComponentClass: String(courseRow?.courseComponent || "-").trim() || "-",
              examDate: this.formatPlannerDateInputValue(normalizedExam?.examDate || ""),
              examTime: String(normalizedExam?.examTime || "").trim() || "-",
              examLocation: normalizedExam?.examLocation || null,
              examWeight: normalizedExam?.examWeight === 0 ? 0 : String(normalizedExam?.examWeight || "").trim() || "-",
              examGrade: normalizedExam?.examGrade === 0 ? 0 : String(normalizedExam?.examGrade || "").trim() || "-",
              examsLectures: Array.isArray(normalizedExam?.examsLectures) ? normalizedExam.examsLectures : [],
              isPreview: false,
            };
          },
        ),
    );
  };
  renderPlannerCurrentSubIntervalCalendar = () => {
    const { currentEntry, startDateValue, endDateValue, startDate, endDate, days } =
      this.buildPlannerCurrentSubIntervalCalendarDays();
    const nowMs = Number(this.state?.plannerCalendarNowMs) || Date.now();
    const todayIsoDate = new Date(nowMs).toISOString().slice(0, 10);
    const currentLabel = this.parseIntervalIdYearTerm(
      this.getPlannerSubIntervalSchemaID(currentEntry),
    );
    const titleLabel =
      currentLabel?.year && currentLabel?.term
        ? `${currentLabel.year} ${currentLabel.term}`
        : String(
            this.getPlannerSubIntervalSchemaID(currentEntry) ||
              this.getPlannerIntervalSchemaID(currentEntry) ||
              "",
          ).trim() || "Current sub-Interval";
    const selectedDayKey = String(this.state?.planSelectedDayKey || "").trim();
    const selectedDay =
      days.find((dayEntry) => dayEntry.key === selectedDayKey) || days[0] || null;
    const isFullIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
    const effectiveEndIso = isFullIso(endDateValue)
      ? endDateValue
      : days.length > 0
        ? days[days.length - 1].isoDate
        : "";
    const displayStartDate = this.formatPlannerFullDate(
      startDate || currentEntry?.subIntervalTryDates?.start || startDateValue || days[0]?.isoDate || "",
    );
    const displayEndDate = this.formatPlannerFullDate(
      endDate || currentEntry?.subIntervalTryDates?.end || endDateValue || days[days.length - 1]?.isoDate || "",
    );
    const endCountdown = (() => {
      if (!isFullIso(effectiveEndIso)) return null;
      const [y, m, d] = effectiveEndIso.split("-").map(Number);
      const endMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      const diffMs = Math.max(0, endMs - nowMs);
      const startDate = new Date(nowMs);
      const targetDate = new Date(nowMs + diffMs);
      const buildLocalDate = (dateValue) =>
        new Date(
          dateValue.getFullYear(),
          dateValue.getMonth(),
          dateValue.getDate(),
          dateValue.getHours(),
          dateValue.getMinutes(),
          dateValue.getSeconds(),
          dateValue.getMilliseconds(),
        );
      const addLocalMonths = (dateValue, monthsToAdd = 0) => {
        const nextDate = buildLocalDate(dateValue);
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
        return nextDate;
      };
      let months = 0;
      let cursorDate = buildLocalDate(startDate);
      while (true) {
        const nextMonthDate = addLocalMonths(cursorDate, 1);
        if (nextMonthDate.getTime() > targetDate.getTime()) {
          break;
        }
        cursorDate = nextMonthDate;
        months += 1;
      }
      const remainingMs = Math.max(0, targetDate.getTime() - cursorDate.getTime());
      const daysCount = Math.floor(remainingMs / 86400000);
      const hours = Math.floor((remainingMs % 86400000) / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      return {
        months,
        days: daysCount,
        hours,
        minutes,
        seconds,
      };
    })();
    const selectedDayTaskItems = selectedDay
      ? [
          { key: "attendance", label: "attendance" },
          { key: "study", label: "study" },
          { key: "exam", label: "exam" },
        ]
      : [];
    return (
      <section
        id="nogaPlanner_plan_calendar"
        className="nogaPlanner_planCalendar"
      >
        <div
          id="nogaPlanner_plan_calendarMainColumn"
          className="nogaPlanner_planCalendarMainColumn"
        >
          <header
            id="nogaPlanner_plan_calendarHeader"
            className="nogaPlanner_planCalendarHeader"
          >
            <div
              id="nogaPlanner_plan_calendarHeaderCopy"
              className="nogaPlanner_planCalendarHeaderCopy"
            >
              <span id="nogaPlanner_planCalendarEyebrow" className="nogaPlanner_planCalendarEyebrow">
                Current sub-Interval
              </span>
              <div
                id="nogaPlanner_plan_calendarDates"
                className="nogaPlanner_planCalendarDates"
              >
                <div
                  id="nogaPlanner_plan_calendarStartDateRow"
                  className="nogaPlanner_planCalendarDateRow"
                >
                  <span
                    id="nogaPlanner_plan_calendarStartDateLabel"
                    className="nogaPlanner_planCalendarDateLabel"
                  >
                    Start Date
                  </span>
                  <strong
                    id="nogaPlanner_plan_calendarStartDateValue"
                    className="nogaPlanner_planCalendarDateValue"
                  >
                    {displayStartDate || "-"}
                  </strong>
                </div>
                <div
                  id="nogaPlanner_plan_calendarEndDateRow"
                  className="nogaPlanner_planCalendarDateRow"
                >
                  <span
                    id="nogaPlanner_plan_calendarEndDateLabel"
                    className="nogaPlanner_planCalendarDateLabel"
                  >
                    End Date
                  </span>
                  <strong
                    id="nogaPlanner_plan_calendarEndDateValue"
                    className="nogaPlanner_planCalendarDateValue"
                  >
                    {displayEndDate || "-"}
                  </strong>
                </div>
              </div>
              <p
                id="nogaPlanner_plan_calendarRange"
                className="nogaPlanner_planCalendarRange"
              >
                {endCountdown && (
                  <span
                    id="nogaPlanner_plan_calendarCountdown"
                    className="nogaPlanner_planCalendarCountdown"
                  >
                    <span className="nogaPlanner_planCalendarCountdownLabel">
                      Remaining
                    </span>
                    <span className="nogaPlanner_planCalendarCountdownStats">
                      <span className="nogaPlanner_planCalendarCountdownUnit">
                        <strong>{endCountdown.months}</strong>
                        <span>Months</span>
                      </span>
                      <span className="nogaPlanner_planCalendarCountdownUnit">
                        <strong>{endCountdown.days}</strong>
                        <span>Days</span>
                      </span>
                      <span className="nogaPlanner_planCalendarCountdownUnit">
                        <strong>{endCountdown.hours}</strong>
                        <span>Hours</span>
                      </span>
                      <span className="nogaPlanner_planCalendarCountdownUnit">
                        <strong>{endCountdown.minutes}</strong>
                        <span>Mins</span>
                      </span>
                      <span className="nogaPlanner_planCalendarCountdownUnit">
                        <strong>{endCountdown.seconds}</strong>
                        <span>Secs</span>
                      </span>
                    </span>
                  </span>
                )}
              </p>
            </div>
          </header>
          <div
            id="nogaPlanner_plan_calendarGrid"
            className="nogaPlanner_planCalendarGrid"
          >
            {days.length > 0 ? (
              <>
                {days.map((dayEntry) => {
                  const isSelected =
                    selectedDay && selectedDay.key === dayEntry.key;
                  const isToday = dayEntry.isoDate === todayIsoDate;
                  return (
                    <button
                      id={`nogaPlanner_plan_calendarDay_${dayEntry.key}`}
                      key={`nogaPlanner_planCalendarDay_${dayEntry.key}`}
                      type="button"
                      className={
                        "nogaPlanner_planCalendarDay" +
                        (isToday ? " is-today" : "") +
                        (isSelected ? " is-selected" : "")
                      }
                      onClick={() =>
                        this.setState({ planSelectedDayKey: dayEntry.key })
                      }
                    >
                      <span id={`nogaPlanner_planCalendarDayWeekday_${dayEntry.key}`} className="nogaPlanner_planCalendarDayWeekday">
                        {dayEntry.weekdayLabel}
                      </span>
                      <strong id={`nogaPlanner_planCalendarDayNumber_${dayEntry.key}`} className="nogaPlanner_planCalendarDayNumber">
                        {dayEntry.dayNumber}
                      </strong>
                      <span id={`nogaPlanner_planCalendarDayMonth_${dayEntry.key}`} className="nogaPlanner_planCalendarDayMonth">
                        {dayEntry.monthLabel}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div
                id="nogaPlanner_plan_calendarEmpty"
                className="nogaPlanner_planCalendarEmpty"
              >
                No current sub-interval range is ready yet.
              </div>
            )}
          </div>
        </div>
        <div
          id="nogaPlanner_plan_tasksColumn"
          className="nogaPlanner_planCalendarTasksColumn"
        >
          <div
            id="nogaPlanner_plan_tasksCard"
            className="nogaPlanner_planCalendarTasksCard"
          >
            <span id="nogaPlanner_planCalendarEyebrow_2" className="nogaPlanner_planCalendarEyebrow">Tasks</span>
            <h4
              id="nogaPlanner_plan_tasksTitle"
              className="nogaPlanner_planCalendarTasksTitle"
            >
              {selectedDay ? selectedDay.isoDate : "Select a day"}
            </h4>
            <div
              id="nogaPlanner_plan_tasksList"
              className="nogaPlanner_planCalendarTasksList"
            >
              {selectedDay ? (
                selectedDayTaskItems.map((taskEntry) => (
                  <div
                    id={`nogaPlanner_plan_task_${taskEntry.key}`}
                    key={`nogaPlanner_planCalendarTask_${taskEntry.key}`}
                    className="nogaPlanner_planCalendarTaskItem"
                  >
                    {taskEntry.label}
                  </div>
                ))
              ) : (
                <div
                  id="nogaPlanner_plan_tasksEmpty"
                  className="nogaPlanner_planCalendarTasksEmpty"
                >
                  No day selected yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };
  formatPlannerComponentWeightInputValue = (value) => {
    const normalizedValue =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value || "").replace("%", "").trim());
    if (!Number.isFinite(normalizedValue)) {
      return "";
    }
    const inputValue = Math.abs(normalizedValue) <= 1 ? normalizedValue * 100 : normalizedValue;
    return String(Number.isInteger(inputValue) ? Math.trunc(inputValue) : Number(inputValue.toFixed(2)));
  };
  normalizeHomeCourseComponentLectureDraftEntry = (entry = {}) => {
    const normalizedEntry =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry
        : { lectureName: entry };
    const lectureName = String(
      normalizedEntry?.lectureName ||
        normalizedEntry?.lectureId ||
        normalizedEntry?.lectureName ||
        normalizedEntry?.lecture_name ||
        normalizedEntry?.name ||
        "",
    ).trim();
    if (!lectureName) {
      return null;
    }
    return {
      lectureName,
      lectureContent: Array.isArray(normalizedEntry?.lectureContent)
        ? normalizedEntry.lectureContent
        : [],
    };
  };
  normalizeHomeCourseLectureDraftEntry = (entry = {}) => {
    const normalizedEntry =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry
        : { lectureName: entry };
    const lectureName = String(
      normalizedEntry?.lectureName ||
        normalizedEntry?.lectureId ||
        normalizedEntry?.lecture_name ||
        normalizedEntry?.name ||
        "",
    ).trim();
    if (!lectureName) {
      return null;
    }
    return {
      key: String(
        normalizedEntry?.key ||
          normalizedEntry?._id ||
          "",
      ).trim(),
      courseID: String(
        normalizedEntry?.courseID ||
          normalizedEntry?.lecture_courseId ||
          "",
      ).trim(),
      courseName: String(
        normalizedEntry?.courseName ||
          normalizedEntry?.lecture_courseName ||
          "",
      ).trim(),
      lectureNum:
        Number.parseInt(String(normalizedEntry?.lectureNum || "").trim(), 10) ||
        null,
      lectureID: String(normalizedEntry?.lectureID || "").trim(),
      lectureName,
      lectureInstructor: String(
        normalizedEntry?.lectureInstructor ||
          normalizedEntry?.lectureInstructors ||
          "",
      ).trim(),
      subIntervalId: String(
          normalizedEntry?.subIntervalID ||
          normalizedEntry?.subIntervalId ||
          "",
      ).trim(),
      courseNum:
        Number.parseInt(String(normalizedEntry?.courseNum || "").trim(), 10) ||
        null,
      courseComponent: String(
        normalizedEntry?.courseComponent ||
          normalizedEntry?.courseComponentId ||
          "",
      ).trim(),
      examID: String(normalizedEntry?.examID || "").trim(),
      isPreview: Boolean(normalizedEntry?.isPreview),
    };
  };
  findPlannerCourseByNameDraft = (courseName = "") => {
    const normalizedName = String(courseName || "").trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }
    return (
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (courseEntry) =>
          String(courseEntry?.course_name || courseEntry?.name || "")
            .trim()
            .toLowerCase() === normalizedName,
      ) || null
    );
  };
  findPlannerCourseByCodeDraft = (courseCode = "") => {
    const normalizedCode = String(courseCode || "").trim().toLowerCase();
    if (!normalizedCode) {
      return null;
    }
    return (
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (courseEntry) =>
          String(courseEntry?.course_code || courseEntry?.code || "")
            .trim()
            .toLowerCase() === normalizedCode,
      ) || null
    );
  };
  resolvePlannerCourseDraft = ({
    courseId = "",
    courseName = "",
    courseCode = "",
  } = {}) => {
    const normalizedCourseId = String(courseId || "").trim();
    if (normalizedCourseId) {
      const matchedById =
        (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
          (courseEntry) =>
            String(courseEntry?._id || "").trim() === normalizedCourseId,
        ) || null;
      if (matchedById) {
        return matchedById;
      }
    }
    return (
      this.findPlannerCourseByNameDraft(courseName) ||
      this.findPlannerCourseByCodeDraft(courseCode) ||
      null
    );
  };
  appendHomeCourseComponentDraftEntry = () => {
    const parsedCourseWeight = Number.parseFloat(
      String(this.state?.homeCourseTotalWeightDraft || "").trim(),
    );
    const parsedComponentPercentage = Number.parseFloat(
      String(this.state?.homeCourseComponentPartialWeightDraft || "").trim(),
    );
    const nextComponent = this.normalizeHomeCourseComponentDraftEntry({
      componentId: this.state?.homeCourseComponentIdDraft || "",
      componentPartialWeight:
        this.state?.homeCourseComponentPartialWeightDraft || "",
      componentStatus: this.state?.homeCourseComponentStatusDraft || "",
      componentWeight:
        Number.isFinite(parsedCourseWeight) &&
        Number.isFinite(parsedComponentPercentage)
          ? Number(
              (
                parsedCourseWeight *
                (parsedComponentPercentage / 100)
              ).toFixed(4),
            )
          : null,
    });
    if (!nextComponent) {
      return;
    }
    const editingIntervalId = String(this.state?.homeCourseOriginalIntervalId || "").trim();
    const editingCourseNum = String(this.state?.homeCourseOriginalCourseNum || "").trim();
    const courseID = editingIntervalId && editingCourseNum
      ? this.buildPlannerMaterialMetadataCourseId({
          subIntervalId: editingIntervalId,
          courseNum: editingCourseNum,
        })
      : "";
    const existingDraftComponents = Array.isArray(this.state?.homeCourseComponentDraft)
      ? this.state.homeCourseComponentDraft
      : [];
    const nextComponentNum = existingDraftComponents.reduce((max, entry) => {
      const num = Number.isFinite(Number.parseInt(entry?.componentNum, 10))
        ? Number.parseInt(entry.componentNum, 10)
        : 0;
      return num > max ? num : max;
    }, 0) + 1;
    const nextComponentWithNum = { ...nextComponent, componentNum: nextComponentNum };
    const compSym = String(nextComponentWithNum?.componentSymbol || "COMP").trim();
    const componentID = courseID && nextComponentWithNum.componentNum != null
      ? `${courseID}-${compSym}${nextComponentWithNum.componentNum}`
      : courseID && nextComponentWithNum.componentId
        ? `${courseID}-${compSym}_${nextComponentWithNum.componentId}`
        : "";
    const nextComponentWithId = { ...nextComponentWithNum, componentID };
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeCourseComponentDraft)
        ? previousState.homeCourseComponentDraft
        : [];
      const existingIndex = prevList.findIndex(
        (entry) =>
          String(entry?.componentId || "").trim() === nextComponentWithId.componentId,
      );
      const nextList =
        existingIndex >= 0
          ? prevList.map((entry, index) =>
              index === existingIndex ? nextComponentWithId : entry,
            )
          : [...prevList, nextComponentWithId];
      return {
        homeCourseComponentDraft: nextList,
        homeCourseComponentIdDraft: "",
        homeCourseComponentPartialWeightDraft: "",
        homeCourseComponentStatusDraft: "",
        homeCourseComponentEditingId: "",
      };
    });
  };
  removeHomeCourseComponentDraftEntry = (componentId) => {
    this.setState((previousState) => ({
      homeCourseComponentDraft: (
        Array.isArray(previousState?.homeCourseComponentDraft)
          ? previousState.homeCourseComponentDraft
          : []
      ).filter(
        (entry) => String(
          entry?.componentClass || entry?.componentId || entry?.id || "",
        ).trim() !== String(componentId || "").trim(),
      ),
    }));
  };
  editHomeCourseComponentDraftEntry = (component) => {
    const componentId = String(component?.componentId || "").trim();
    this.setState((previousState) => ({
      homeCourseComponentDraft: (
        Array.isArray(previousState?.homeCourseComponentDraft)
          ? previousState.homeCourseComponentDraft
          : []
      ).filter(
        (entry) => String(
          entry?.componentClass || entry?.componentId || entry?.id || "",
        ).trim() !== componentId,
      ),
      homeCourseComponentIdDraft: componentId,
      homeCourseComponentPartialWeightDraft: String(
        component?.componentPartialWeight || component?.componentWeightPercentage || "",
      ).trim(),
      homeCourseComponentEditingId: componentId,
    }));
  };
  buildHomeCourseLectureDraftEntry = (entryIndex = 0) => {
    const lectureCourseContextDraftValue = String(
      this.state?.homeCourseLectureCourseContextDraft || "",
    ).trim();
    const lectureName = String(
      this.state?.homeCourseLectureNameDraft || "",
    ).trim();
    const lectureInstructor = String(
      this.state?.homeCourseLectureInstructorsDraft || "",
    ).trim();
    if (!lectureCourseContextDraftValue || !lectureName || !lectureInstructor) {
      return null;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const materialMetadataCourseRows = this.getPlannerMaterialMetadataCourseRows(
      plannerRoot,
    );
    const courseRow =
      materialMetadataCourseRows.find(
        (entry) => String(entry?.key || "").trim() === lectureCourseContextDraftValue,
      ) || null;
    if (!courseRow) {
      return null;
    }
    const existingLectureRows = this.getPlannerMaterialMetadataLectureRows(
      plannerRoot,
    );
    const queuedLectureRows = Array.isArray(
      this.state?.homeCourseLectureDraftList,
    )
      ? this.state.homeCourseLectureDraftList
      : [];
    const nextLectureNum =
      [...existingLectureRows, ...queuedLectureRows]
        .filter(
          (row) =>
            this.getPlannerCourseSchemaID(row) ===
              this.getPlannerCourseSchemaID(courseRow) &&
            String(row?.courseComponent || "").trim() ===
              String(courseRow?.courseComponent || "").trim(),
        )
        .reduce((maxValue, row) => {
          const currentLectureNum = Number.parseInt(
            String(row?.lectureNum || "").trim(),
            10,
          );
          return Number.isInteger(currentLectureNum) &&
            currentLectureNum > maxValue
            ? currentLectureNum
            : maxValue;
        }, 0) + 1;
    const storedComponentID = String(courseRow?.componentID || "").trim();
    const courseIDForLecture =
      this.getPlannerCourseSchemaID(courseRow) ||
      String(lectureCourseContextDraftValue || "").trim();
    const courseComponentForLecture = String(courseRow?.courseComponent || "").trim();
    const resolvedComponentID = storedComponentID && storedComponentID !== "-"
      ? storedComponentID
      : "";
    const previewLectureID = resolvedComponentID
      ? `${resolvedComponentID}-L${nextLectureNum}`
      : "";
    return {
      key: `draft_${lectureCourseContextDraftValue}_${nextLectureNum}_${entryIndex}`,
      courseID: courseIDForLecture,
      courseName:
        String(
          courseRow?.courseName ||
            this.state?.homeCourseLectureCourseNameDraft ||
            "",
        ).trim() || "-",
      courseNum:
        Number.parseInt(String(courseRow?.courseNum || "").trim(), 10) || null,
      subIntervalID: this.getPlannerSubIntervalSchemaID(courseRow) || "-",
      subIntervalId: this.getPlannerSubIntervalSchemaID(courseRow) || "-",
      courseComponent: courseComponentForLecture || "-",
      examID: String(this.state?.homeLectureExamIdDraft || "").trim(),
      lectureID: previewLectureID,
      lectureNum: nextLectureNum,
      lectureName,
      lectureInstructor,
      isPreview: true,
    };
  };
  appendHomeCourseLectureDraftEntry = () => {
    const nextEntry = this.buildHomeCourseLectureDraftEntry(
      Array.isArray(this.state?.homeCourseLectureDraftList)
        ? this.state.homeCourseLectureDraftList.length
        : 0,
    );
    if (!nextEntry) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeCourseLectureDraftList)
        ? previousState.homeCourseLectureDraftList
        : [];
      return {
        homeCourseLectureDraftList: [...prevList, nextEntry],
        homeCourseLectureCourseContextDraft: "",
        homeCourseLectureCourseNameDraft: "",
        homeCourseLectureNameDraft: "",
        homeCourseLectureInstructorsDraft: "",
      };
    });
  };
  normalizeHomeCourseExamDraftEntry = (entry = {}) => {
    const normalizedEntry =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry
        : {};
    const examID = String(normalizedEntry?.examID || "").trim();
    const storedComponentID = String(
      normalizedEntry?.componentID ||
        normalizedEntry?.courseID ||
        "",
    ).trim();
    const componentID = storedComponentID || (examID ? examID.replace(/_E\d+$/, "") : "");
    if (!componentID) {
      return null;
    }
    const examNum = Number.parseInt(String(normalizedEntry?.examNum || "").trim(), 10) || null;
    return {
      key: String(normalizedEntry?.key || examID || "").trim(),
      componentID,
      examNum,
      examID,
      courseName: String(normalizedEntry?.courseName || "").trim(),
      courseComponentClass: String(
        normalizedEntry?.courseComponentClass ||
          normalizedEntry?.courseComponent ||
          "",
      ).trim(),
      examDate: String(normalizedEntry?.examDate || "").trim(),
      examTime: String(normalizedEntry?.examTime || "").trim(),
      examLocation:
        normalizedEntry?.examLocation &&
        typeof normalizedEntry.examLocation === "object"
          ? normalizedEntry.examLocation
          : null,
      examsLectures: Array.isArray(normalizedEntry?.examsLectures) ? normalizedEntry.examsLectures : [],
      examWeight:
        normalizedEntry?.examWeight === 0
          ? 0
          : String(normalizedEntry?.examWeight || "").trim(),
      examGrade:
        normalizedEntry?.examGrade === 0
          ? 0
          : String(normalizedEntry?.examGrade || "").trim(),
      isPreview: Boolean(normalizedEntry?.isPreview),
    };
  };
  buildHomeCourseExamDraftEntry = (entryIndex = 0) => {
    const componentID = String(
      this.state?.homeCourseExamComponentIdDraft || "",
    ).trim();
    if (!componentID) {
      return null;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const materialMetadataCourseRows = this.getPlannerMaterialMetadataCourseRows(
      plannerRoot,
    );
    const matchedCourseRow =
      materialMetadataCourseRows.find((entry) => {
        const entryComponentID = this.getPlannerComponentSchemaID(entry);
        if (entryComponentID && entryComponentID !== "-") {
          return entryComponentID === componentID;
        }
        const cid = this.getPlannerCourseSchemaID(entry);
        const comp = String(entry?.courseComponent || "").trim();
        return cid && comp ? `${cid}_${comp}` === componentID : false;
      }) || null;
    if (!matchedCourseRow) {
      return null;
    }
    const examLocationBuilding = String(
      this.state?.homeCourseExamLocationBuildingDraft || "",
    ).trim();
    const examLocationRoom = String(
      this.state?.homeCourseExamLocationRoomDraft || "",
    ).trim();
    return {
      key: `draft_${componentID}_${entryIndex}`,
      componentID,
      courseName: String(matchedCourseRow?.courseName || "").trim(),
      courseComponentClass: String(
        matchedCourseRow?.courseComponent || "",
      ).trim(),
      examDate: String(this.state?.homeCourseExamDateDraft || "").trim(),
      examTime: String(this.state?.homeCourseExamTimeDraft || "").trim(),
      examLocation: examLocationBuilding
        ? {
            building: examLocationBuilding,
            rooms: examLocationRoom ? [examLocationRoom] : [],
          }
        : null,
      examWeight: String(this.state?.homeCourseExamWeightDraft || "").trim(),
      examGrade: String(
        this.state?.homeCourseExamGradeDraft || "",
      ).trim(),
      isPreview: true,
    };
  };
  appendHomeCourseExamDraftEntry = () => {
    const nextEntry = this.buildHomeCourseExamDraftEntry(
      Array.isArray(this.state?.homeCourseExamDraftList)
        ? this.state.homeCourseExamDraftList.length
        : 0,
    );
    if (!nextEntry) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeCourseExamDraftList)
        ? previousState.homeCourseExamDraftList
        : [];
      const existingIndex = prevList.findIndex(
        (entry) => String(entry?.examPartID || "").trim() === nextEntry.examPartID,
      );
      const nextList =
        existingIndex >= 0
          ? prevList.map((entry, index) =>
              index === existingIndex ? nextEntry : entry,
            )
          : [...prevList, nextEntry];
      return {
        homeCourseExamDraftList: nextList,
        homeCourseExamDateDraft: "",
        homeCourseExamTimeDraft: "",
        homeCourseExamLocationBuildingDraft: "",
        homeCourseExamLocationRoomDraft: "",
        homeCourseExamWeightDraft: "",
        homeCourseExamGradeDraft: "",
      };
    });
  };
  editHomeCourseExamScheduleEntry = (examEntry = {}) => {
    const normalizedExamEntry = this.normalizeHomeCourseExamDraftEntry(examEntry);
    if (!normalizedExamEntry) {
      return;
    }
    const sourceExamRows = this.state?.homeCourseExamScheduleEditorOpen
      ? Array.isArray(this.state?.homeCourseExamDraftList)
        ? this.state.homeCourseExamDraftList
        : []
      : this.getPlannerMaterialMetadataExamRows(this.getResolvedPlannerRoot());
    const normalizedLocation = normalizedExamEntry?.examLocation || null;
    const locationBuilding = String(normalizedLocation?.building || "").trim();
    const locationRoom = Array.isArray(normalizedLocation?.rooms) && normalizedLocation.rooms.length > 0
      ? String(normalizedLocation.rooms[0] || "").trim()
      : String(normalizedLocation?.room || "").trim();
    this.setState({
      homeCoursesEditorOpen: false,
      homeCourseExamScheduleEditorOpen: true,
      homeMaterialMetadataMode: "exams",
      homeCourseExamDraftList: sourceExamRows.map((entry) => ({
        ...entry,
        key: String(entry?.key || entry?.examPartID || entry?.examID || "").trim(),
      })),
      homeCourseExamComponentIdDraft: String(
        normalizedExamEntry?.componentID || "",
      ).trim(),
      homeCourseExamDateDraft: String(
        normalizedExamEntry?.examDate || "",
      ).trim(),
      homeCourseExamTimeDraft: String(
        normalizedExamEntry?.examTime || "",
      ).trim(),
      homeCourseExamLocationBuildingDraft: locationBuilding,
      homeCourseExamLocationRoomDraft: locationRoom,
      homeCourseExamWeightDraft: String(
        normalizedExamEntry?.examWeight ?? "",
      ).trim(),
      homeCourseExamGradeDraft: String(
        normalizedExamEntry?.examGrade ?? "",
      ).trim(),
    });
  };
  deleteHomeCourseExamScheduleEntry = async (examEntry = {}) => {
    const normalizedExamEntry = this.normalizeHomeCourseExamDraftEntry(examEntry);
    if (!normalizedExamEntry) {
      return;
    }
    const targetExamID = String(normalizedExamEntry?.examID || "").trim();
    const targetComponentID = String(normalizedExamEntry?.componentID || "").trim();
    if (!targetExamID && !targetComponentID) {
      return;
    }
    if (this.state?.homeCourseExamScheduleEditorOpen) {
      this.setState((previousState) => {
        const prevList = Array.isArray(previousState?.homeCourseExamDraftList)
          ? previousState.homeCourseExamDraftList
          : [];
        const nextList = prevList.filter((entry) => {
          const eID = String(entry?.examID || entry?.key || "").trim();
          return targetExamID ? eID !== targetExamID : String(entry?.componentID || "").trim() !== targetComponentID;
        });
        const shouldClearDraft =
          String(previousState?.homeCourseExamComponentIdDraft || "").trim() === targetComponentID;
        return {
          homeCourseExamDraftList: nextList,
          ...(shouldClearDraft
            ? {
                homeCourseExamComponentIdDraft: "",
                homeCourseExamDateDraft: "",
                homeCourseExamTimeDraft: "",
                homeCourseExamLocationBuildingDraft: "",
                homeCourseExamLocationRoomDraft: "",
                homeCourseExamWeightDraft: "",
                homeCourseExamGradeDraft: "",
              }
            : {}),
        };
      });
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const intervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      const nextIntervalCourses = intervalCourses.map((courseEntry) => {
        const nextComponents = (Array.isArray(courseEntry?.courseComponents) ? courseEntry.courseComponents : []).map(
          (comp) => {
            const compID = String(comp?.componentID || "").trim();
            if (compID !== targetComponentID) return comp;
            const nextExams = (Array.isArray(comp?.componentExams) ? comp.componentExams : []).filter(
              (ex) => {
                const eID = String(ex?.examID || "").trim();
                return targetExamID ? eID !== targetExamID : false;
              },
            );
            return { ...comp, componentExams: nextExams };
          },
        );
        return { ...courseEntry, courseComponents: nextComponents };
      });
      return {
        ...intervalEntry,
        intervalCourses: nextIntervalCourses,
        subIntervalCourses: nextIntervalCourses,
      };
    });
    try {
      const nextPlannerRoot = await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
      });
      this.props.serverReply?.("Exam deleted.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to delete exam."),
      );
    }
  };
  getNextAvailableCourseNumForInterval = (intervalId) => {
    const resolvedIntervalId = String(intervalId || "").trim();
    if (!resolvedIntervalId) return 1;
    const usedNums = new Set();
    const savedIntervals = this.getPlannerIntervalsWithComponents(this.getResolvedPlannerRoot());
    const savedInterval = savedIntervals.find(
      (e) => String(e?.subIntervalId || e?.intervalId || "").trim() === resolvedIntervalId,
    );
    if (savedInterval) {
      const courses = Array.isArray(savedInterval?.intervalCourses) ? savedInterval.intervalCourses : [];
      courses.forEach((course) => {
        const n = Number.parseInt(String(course?.courseNum || "").trim(), 10);
        if (Number.isInteger(n) && n > 0) usedNums.add(n);
      });
    }
    const draftList = Array.isArray(this.state?.homeCourseDraftList) ? this.state.homeCourseDraftList : [];
    draftList
      .filter((e) => !e?.isEdit && String(e?.subIntervalId || e?.intervalId || "").trim() === resolvedIntervalId)
      .forEach((e) => {
        const n = Number.parseInt(String(e?.courseNum || "").trim(), 10);
        if (Number.isInteger(n) && n > 0) usedNums.add(n);
      });
    let num = 1;
    while (usedNums.has(num)) num++;
    return num;
  };
  buildHomeCourseMetadataDraftEntry = (entryIndex = 0) => {
    const courseName = String(this.state?.homeCourseNameDraft || "").trim();
    const courseCode = String(this.state?.homeCourseCodeDraft || "").trim();
    const courseWeight = String(this.state?.homeCourseTotalWeightDraft || "").trim();
    const parsedCourseWeight = Number.parseFloat(courseWeight);
    const courseComponentId = String(
      this.state?.homeCourseComponentIdDraft || "",
    ).trim();
    const componentWeightPercentage = String(
      this.state?.homeCourseComponentPartialWeightDraft || "",
    ).trim();
    const parsedComponentWeightPercentage = Number.parseFloat(
      componentWeightPercentage,
    );
    const componentWeight = Number.isFinite(parsedCourseWeight) &&
      Number.isFinite(parsedComponentWeightPercentage)
        ? Number(
            (parsedCourseWeight * (parsedComponentWeightPercentage / 100)).toFixed(4),
          )
        : null;
    const subIntervalYear = String(
      this.state?.homeCourseSubIntervalYearDraft || "",
    ).trim();
    const subIntervalTerm = String(
      this.state?.homeCourseSubIntervalTermDraft || "",
    ).trim();
    const intervalId = this.resolvePlannerSubIntervalDraftId({
      subIntervalId: this.state?.homeCourseIntervalIdDraft || "",
      intervalNum: subIntervalYear,
      subIntervalNum: subIntervalTerm,
    });
    if (
      !courseName ||
      !courseCode ||
      !courseWeight ||
      !courseComponentId ||
      !componentWeightPercentage ||
      !intervalId
    ) {
      return null;
    }
    const nextCourseNum = this.getNextAvailableCourseNumForInterval(intervalId);
    const courseID = this.buildPlannerMaterialMetadataCourseId({
      intervalNum: subIntervalYear || intervalId,
      subIntervalId: intervalId,
      courseNum: nextCourseNum,
      componentClass: courseComponentId,
    });
    return {
      key: `draft_${intervalId}_${nextCourseNum}_${entryIndex}`,
      courseID,
      courseNum: nextCourseNum,
      courseName,
      courseCode,
      courseWeight,
      courseComponent: courseComponentId,
      componentWeightPercentage,
      componentWeight,
      subIntervalId: intervalId,
      intervalId,
      courseComponents: [
        {
          componentClass: courseComponentId,
          componentWeight,
          componentExams: [],
        },
      ],
      isPreview: true,
    };
  };
  appendHomeCourseMetadataDraftEntry = () => {
    const nextEntry = this.buildHomeCourseMetadataDraftEntry(
      Array.isArray(this.state?.homeCourseDraftList)
        ? this.state.homeCourseDraftList.length
        : 0,
    );
    if (!nextEntry) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeCourseDraftList)
        ? previousState.homeCourseDraftList
        : [];
      return {
        homeCourseDraftList: [...prevList, nextEntry],
        homeCourseNameDraft: "",
        homeCourseCodeDraft: "",
        homeCourseTotalWeightDraft: "",
        homeCourseComponentIdDraft: "",
        homeCourseComponentPartialWeightDraft: "",
        homeCourseComponentStatusDraft: "",
        homeCourseLectureNameDraft: "",
        homeCourseLectureInstructorsDraft: "",
        homeCourseLectureInstructionDateDraft: "",
        homeCourseIntervalIdDraft: "",
        homeCourseSubIntervalYearDraft: "",
        homeCourseSubIntervalTermDraft: "",
      };
    });
  };
  addHomeCourseWithStagedComponents = () => {
    const stagingComponents = (Array.isArray(this.state?.homeCourseComponentDraft)
      ? this.state.homeCourseComponentDraft
      : []
    ).map((entry) => this.normalizeHomeCourseComponentDraftEntry(entry)).filter(Boolean);
    if (stagingComponents.length === 0) {
      return;
    }
    const courseName = String(this.state?.homeCourseNameDraft || "").trim();
    const courseCode = String(this.state?.homeCourseCodeDraft || "").trim();
    const courseWeight = String(this.state?.homeCourseTotalWeightDraft || "").trim();
    const parsedCourseWeight = Number.parseFloat(courseWeight);
    const subIntervalYear = String(this.state?.homeCourseSubIntervalYearDraft || "").trim();
    const subIntervalTerm = String(this.state?.homeCourseSubIntervalTermDraft || "").trim();
    const intervalId = this.resolvePlannerSubIntervalDraftId({
      subIntervalId: this.state?.homeCourseIntervalIdDraft || "",
      intervalNum: subIntervalYear,
      subIntervalNum: subIntervalTerm,
    });
    if (!courseName || !courseCode || !courseWeight || !intervalId) {
      return;
    }
    const nextCourseNum = this.getNextAvailableCourseNumForInterval(intervalId);
    this.setState((previousState) => {
      const prevDraftList = Array.isArray(previousState?.homeCourseDraftList)
        ? previousState.homeCourseDraftList
        : [];
      const courseID = this.buildPlannerMaterialMetadataCourseId({
        intervalNum:
          subIntervalYear || this.parseIntervalIdYearTerm(intervalId)?.intervalNum || "",
        subIntervalId: intervalId,
        courseNum: nextCourseNum,
      });
      const courseComponents = stagingComponents.map((component, componentIndex) => {
        const parsedPercentage = Number.parseFloat(
          String(component?.componentWeightPercentage || component?.componentPartialWeight || "").trim(),
        );
        const componentWeight =
          Number.isFinite(parsedCourseWeight) && Number.isFinite(parsedPercentage)
            ? Number((parsedCourseWeight * (parsedPercentage / 100)).toFixed(4))
            : null;
        const componentNum = Number.isFinite(Number.parseInt(component?.componentNum, 10))
          ? Number.parseInt(component.componentNum, 10)
          : componentIndex + 1;
        const componentID = courseID && componentNum != null
          ? `${courseID}-COMP${componentNum}`
          : "";
        return {
          componentID,
          componentNum,
          componentClass: component.componentId,
          componentWeight,
          componentLocation: {},
          componentExams: [],
        };
      });
      const newEntry = {
        key: `draft_${intervalId}_${nextCourseNum}_${prevDraftList.length}`,
        courseID,
        courseNum: nextCourseNum,
        courseName,
        courseCode,
        courseWeight,
        subIntervalId: intervalId,
        intervalId,
        courseComponents,
        isPreview: true,
      };
      return {
        homeCourseDraftList: [...prevDraftList, newEntry],
        homeCourseComponentDraft: [],
        homeCourseComponentEditingId: "",
        homeCourseNameDraft: "",
        homeCourseCodeDraft: "",
        homeCourseTotalWeightDraft: "",
        homeCourseIntervalIdDraft: "",
        homeCourseSubIntervalYearDraft: "",
        homeCourseSubIntervalTermDraft: "",
        homeCourseIdDraft: "",
      };
    });
  };
  queueHomeCourseEditDraft = () => {
    const stagedFromList = (
      Array.isArray(this.state?.homeCourseComponentDraft)
        ? this.state.homeCourseComponentDraft
        : []
    )
      .map((entry) => this.normalizeHomeCourseComponentDraftEntry(entry))
      .filter(Boolean);
    const courseName = String(this.state?.homeCourseNameDraft || "").trim();
    const courseCode = String(this.state?.homeCourseCodeDraft || "").trim();
    const courseWeight = String(this.state?.homeCourseTotalWeightDraft || "").trim();
    const intervalId = String(this.state?.homeCourseOriginalIntervalId || "").trim();
    const courseNum = String(this.state?.homeCourseOriginalCourseNum || "").trim();
    if (!courseName || !courseCode || !courseWeight || !intervalId || !courseNum) {
      return;
    }
    const parsedCourseWeight = Number.parseFloat(courseWeight);
    const pendingComponentId = String(
      this.state?.homeCourseComponentIdDraft || "",
    ).trim();
    const pendingComponentPct = String(
      this.state?.homeCourseComponentPartialWeightDraft || "",
    ).trim();
    const stagingComponents = (() => {
      if (!pendingComponentId) return stagedFromList;
      const parsedPct = Number.parseFloat(pendingComponentPct);
      const pendingNormalized = this.normalizeHomeCourseComponentDraftEntry({
        componentId: pendingComponentId,
        componentPartialWeight: pendingComponentPct,
        componentWeight:
          Number.isFinite(parsedCourseWeight) && Number.isFinite(parsedPct)
            ? Number((parsedCourseWeight * (parsedPct / 100)).toFixed(4))
            : null,
      });
      if (!pendingNormalized) return stagedFromList;
      const existingIdx = stagedFromList.findIndex(
        (c) => c.componentId === pendingNormalized.componentId,
      );
      if (existingIdx >= 0) {
        return stagedFromList.map((c, i) =>
          i === existingIdx ? pendingNormalized : c,
        );
      }
      return [...stagedFromList, pendingNormalized];
    })();
    if (stagingComponents.length === 0) {
      return;
    }
    const courseID = this.buildPlannerMaterialMetadataCourseId({
      intervalNum: this.parseIntervalIdYearTerm(intervalId)?.intervalNum || "",
      subIntervalId: intervalId,
      courseNum,
    });
    const courseComponents = stagingComponents.map((component, componentIndex) => {
      const parsedPct = Number.parseFloat(
        String(
          component?.componentWeightPercentage ||
            component?.componentPartialWeight ||
            "",
        ).trim(),
      );
      const componentWeight =
        Number.isFinite(parsedCourseWeight) && Number.isFinite(parsedPct)
          ? Number((parsedCourseWeight * (parsedPct / 100)).toFixed(4))
          : null;
      const componentNum = Number.isFinite(Number.parseInt(component?.componentNum, 10))
        ? Number.parseInt(component.componentNum, 10)
        : componentIndex + 1;
      const componentID = componentNum != null
        ? `${courseID}-COMP${componentNum}`
        : "";
      return {
        componentID,
        componentNum,
        componentClass: component.componentId,
        componentWeight,
        componentLocation: {},
        componentExams: [],
      };
    });
    const draftCourseNum = Number.parseInt(courseNum, 10) || null;
    this.setState((previousState) => {
      const prevDraftList = Array.isArray(previousState?.homeCourseDraftList)
        ? previousState.homeCourseDraftList
        : [];
      const editEntry = {
        key: `edit_${intervalId}_${courseNum}`,
        courseID,
        courseNum: draftCourseNum,
        courseName,
        courseCode,
        courseWeight,
        subIntervalId: intervalId,
        intervalId,
        courseComponents,
        isEdit: true,
      };
      const existingIdx = prevDraftList.findIndex(
        (e) => e?.isEdit && String(e?.courseID || "").trim() === courseID,
      );
      const nextDraftList =
        existingIdx >= 0
          ? prevDraftList.map((e, i) => (i === existingIdx ? editEntry : e))
          : [...prevDraftList, editEntry];
      return {
        homeCourseDraftList: nextDraftList,
        homeCourseComponentDraft: [],
        homeCourseComponentEditingId: "",
        homeCourseEditingKey: "",
        homeCourseOriginalIntervalId: "",
        homeCourseOriginalCourseNum: "",
        homeCourseOriginalId: "",
        homeCourseNameDraft: "",
        homeCourseCodeDraft: "",
        homeCourseTotalWeightDraft: "",
        homeCourseIntervalIdDraft: "",
        homeCourseSubIntervalYearDraft: "",
        homeCourseSubIntervalTermDraft: "",
        homeCourseIdDraft: "",
      };
    });
  };
  appendHomeCourseComponentLectureDraftEntry = () => {
    const lectureName = String(
      this.state?.homeCourseComponentLectureNameDraft || "",
    ).trim();
    const courseID = String(
      this.state?.homeCourseComponentLectureCourseIdDraft || "",
    ).trim();
    const intervalId = String(
      this.state?.homeCourseComponentLectureIntervalIdDraft || "",
    ).trim();
    const componentId = String(
      this.state?.homeCourseComponentLectureComponentIdDraft || "",
    ).trim();
    const nextLecture = this.normalizeHomeCourseComponentLectureDraftEntry({
      lectureName,
    });
    if (!nextLecture || !courseID || !intervalId || !componentId) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(
        previousState?.homeCourseComponentLectureDraftList,
      )
        ? previousState.homeCourseComponentLectureDraftList
        : [];
      const lectureKey = `${courseID}_${intervalId}_${componentId}_${lectureName}`;
      const existingIndex = prevList.findIndex(
        (entry) =>
          `${String(entry?.courseID || entry?.courseId || "").trim()}_${String(
            entry?.subIntervalId || entry?.intervalId || "",
          ).trim()}_${String(entry?.componentID || entry?.componentId || "").trim()}_${String(
            entry?.lectureName || entry?.lectureId || "",
          ).trim()}` === lectureKey,
      );
      const nextList =
        existingIndex >= 0
          ? prevList.map((entry, index) =>
              index === existingIndex
                ? {
                    courseID,
                    subIntervalId: intervalId,
                    intervalId,
                    componentID: componentId,
                    componentId,
                    lectureName: nextLecture.lectureName,
                    lectureContent: Array.isArray(nextLecture.lectureContent)
                      ? nextLecture.lectureContent
                      : [],
                  }
                : entry,
            )
          : [
              ...prevList,
              {
                courseID,
                subIntervalId: intervalId,
                intervalId,
                componentID: componentId,
                componentId,
                lectureName: nextLecture.lectureName,
                lectureContent: Array.isArray(nextLecture.lectureContent)
                  ? nextLecture.lectureContent
                  : [],
              },
            ];
      return {
        homeCourseComponentLectureDraftList: nextList,
        homeCourseComponentLectureNameDraft: "",
      };
    });
  };
  handleRepairCourseComponentIDs = async () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    let repairCount = 0;
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const courseEntries = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      const nextCourseEntries = courseEntries.map((courseEntry) => {
        const storedCourseID = String(courseEntry?.courseID || courseEntry?.courseId || "").trim();
        const courseNum = Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10);
        const expectedCourseID = Number.isInteger(courseNum)
          ? this.buildPlannerMaterialMetadataCourseId({
              intervalNum: intervalEntry.intervalNum,
              subIntervalId: intervalEntry.subIntervalId,
              courseNum,
            })
          : storedCourseID;
        const courseID = expectedCourseID || storedCourseID;
        if (courseID !== storedCourseID && courseID) repairCount++;
        const components = Array.isArray(courseEntry?.courseComponents)
          ? courseEntry.courseComponents
          : [];
        if (!courseID || components.length === 0) {
          return courseID !== storedCourseID
            ? { ...courseEntry, courseID }
            : courseEntry;
        }
        const nextComponents = components.map((comp, compIdx) => {
          const storedComponentNum = Number.parseInt(String(comp?.componentNum ?? "").trim(), 10);
          const componentNum = Number.isInteger(storedComponentNum)
            ? storedComponentNum
            : compIdx + 1;
          const componentClass = String(comp?.componentClass || comp?.componentId || "").trim();
          const compSymbol = String(comp?.componentSymbol || "COMP").trim();
          const expectedComponentID = courseID && componentNum != null
            ? `${courseID}-${compSymbol}${componentNum}`
            : courseID && componentClass
              ? `${courseID}_${componentClass}`
              : String(comp?.componentID || "").trim();
          const storedComponentID = String(comp?.componentID || "").trim();
          const componentIDChanged = storedComponentID !== expectedComponentID;
          const componentNumChanged = !Number.isInteger(storedComponentNum) || storedComponentNum !== componentNum;
          if (componentIDChanged || componentNumChanged) repairCount++;
          const nextExams = (Array.isArray(comp?.componentExams) ? comp.componentExams : []).map((exam) => {
            const examsLectures = (Array.isArray(exam?.examsLectures) ? exam.examsLectures : []).map((lecture) => {
              const storedLectureID = String(lecture?.lectureID || "").trim();
              const lectureNum = Number.parseInt(String(lecture?.lectureNum ?? "").trim(), 10);
              if (storedLectureID || !Number.isInteger(lectureNum)) return lecture;
              const autoLectureID = `${expectedComponentID}_L${lectureNum}`;
              repairCount++;
              return { ...lecture, lectureID: autoLectureID };
            });
            return { ...exam, examsLectures };
          });
          return {
            ...comp,
            componentNum,
            componentClass,
            componentID: expectedComponentID,
            componentExams: nextExams,
          };
        });
        return { ...courseEntry, courseID, courseComponents: nextComponents };
      });
      return {
        ...intervalEntry,
        intervalCourses: nextCourseEntries,
        subIntervalCourses: nextCourseEntries,
      };
    });
    if (repairCount === 0) {
      this.props.serverReply?.("All IDs are already correct.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
      });
      this.props.serverReply?.(`Repaired ${repairCount} ID(s).`);
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to repair IDs."),
      );
    }
  };
  handleResetSubIntervalMaterialMetadata = async () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    // Clear subIntervalCourses for every sub-interval in the program
    const nextIntervals = currentIntervals.map((entry) => ({
      ...entry,
      subIntervalCourses: [],
      intervalCourses: [],
    }));
    try {
      const nextPlannerRoot = await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot: nextPlannerRoot && typeof nextPlannerRoot === "object"
          ? nextPlannerRoot
          : this.state?.plannerRoot || {},
      });
      this.props.serverReply?.("Reset all material metadata.");
    } catch (error) {
      this.props.serverReply?.(String(error?.message || "Failed to reset material metadata."));
    }
  };
  handleHomeCoursesSetSubmit = async () => {
    const materialMetadataMode =
      String(this.state?.homeMaterialMetadataMode || "").trim() === "lectures"
        ? "lectures"
        : String(this.state?.homeMaterialMetadataMode || "").trim() === "exams"
          ? "exams"
          : "course";
    const examScheduleEditorOpen = Boolean(
      this.state?.homeCourseExamScheduleEditorOpen,
    );
    if (materialMetadataMode === "exams") {
      const examDraftList = Array.isArray(this.state?.homeCourseExamDraftList)
        ? this.state.homeCourseExamDraftList
            .map((entry) => this.normalizeHomeCourseExamDraftEntry(entry))
            .filter(Boolean)
        : [];
      if (examDraftList.length === 0) {
        this.props.serverReply?.("Add at least one exam row first.");
        return;
      }
      const plannerRoot = this.getResolvedPlannerRoot();
      const materialMetadataCourseRows = this.getPlannerMaterialMetadataCourseRows(plannerRoot);
      const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
      // Group drafts by componentID
      const examsByComponent = new Map();
      examDraftList.forEach((entry) => {
        const cid = String(entry?.componentID || "").trim();
        if (!cid) return;
        if (!examsByComponent.has(cid)) examsByComponent.set(cid, []);
        examsByComponent.get(cid).push(entry);
      });
      // For each component, build the final componentExams array (existing merged with draft)
      const resolveComponentExams = (componentID, existingExams) => {
        const draftForComponent = examsByComponent.get(componentID) || [];
        const mergedMap = new Map();
        // Load existing first
        existingExams.forEach((ex, idx) => {
          const eID = String(ex?.examID || "").trim() || `existing_${idx}`;
          mergedMap.set(eID, ex);
        });
        // Overlay drafts
        draftForComponent.forEach((draft, idx) => {
          const eID = String(draft?.examID || "").trim();
          const counterKey = componentID;
          const autoNum = (idx + 1);
          const resolvedExamID = eID && /^.+_E\d+$/.test(eID)
            ? eID
            : eID || `${componentID}_E${autoNum}`;
          const examEntry = {
            examID: resolvedExamID,
            examNum: draft.examNum ?? autoNum,
            examLocation: draft.examLocation || null,
            examDate: this.formatPlannerDateInputValue(draft.examDate || ""),
            examTime: String(draft.examTime || "").trim(),
            examsLectures: Array.isArray(draft.examsLectures) ? draft.examsLectures : [],
            examWeight: draft.examWeight === 0 ? 0 : Number.isFinite(Number(draft.examWeight)) ? Number(draft.examWeight) : null,
            examGrade: draft.examGrade === 0 ? 0 : Number.isFinite(Number(draft.examGrade)) ? Number(draft.examGrade) : null,
          };
          mergedMap.set(resolvedExamID, examEntry);
        });
        return Array.from(mergedMap.values());
      };
      const nextIntervals = currentIntervals.map((intervalEntry) => {
        const intervalCourses = Array.isArray(intervalEntry?.intervalCourses) ? intervalEntry.intervalCourses : [];
        const nextIntervalCourses = intervalCourses.map((courseEntry) => {
          const nextComponents = (Array.isArray(courseEntry?.courseComponents) ? courseEntry.courseComponents : []).map(
            (comp) => {
              const compID = String(comp?.componentID || "").trim();
              if (!examsByComponent.has(compID)) return comp;
              const existingExams = Array.isArray(comp?.componentExams) ? comp.componentExams : [];
              return { ...comp, componentExams: resolveComponentExams(compID, existingExams) };
            },
          );
          return { ...courseEntry, courseComponents: nextComponents };
        });
        return { ...intervalEntry, intervalCourses: nextIntervalCourses, subIntervalCourses: nextIntervalCourses };
      });
      try {
        const nextPlannerRoot = await this.persistStudyPlannerIntervals(nextIntervals);
        this.setState({
          plannerRoot:
            nextPlannerRoot && typeof nextPlannerRoot === "object"
              ? nextPlannerRoot
              : this.state?.plannerRoot || {},
          homeCoursesEditorOpen: false,
          homeMaterialMetadataMode: "course",
          homeCourseEditingKey: "",
          homeCourseOriginalId: "",
          homeCourseOriginalIntervalId: "",
          homeCourseOriginalCourseNum: "",
          homeCourseOriginalComponentClass: "",
          homeCourseOriginalLectureNum: "",
          homeCourseExamScheduleEditorOpen: false,
          homeCourseExamDraftList: [],
          homeCourseExamComponentIdDraft: "",
          homeCourseExamDateDraft: "",
          homeCourseExamTimeDraft: "",
          homeCourseExamLocationBuildingDraft: "",
          homeCourseExamLocationRoomDraft: "",
          homeCourseExamWeightDraft: "",
          homeCourseExamGradeDraft: "",
        });
        this.props.serverReply?.("Exam saved.");
      } catch (error) {
        this.props.serverReply?.(
          String(error?.message || "Failed to save exam."),
        );
      }
      return;
    }
    if (materialMetadataMode === "lectures") {
      const lectureDraftList = Array.isArray(
        this.state?.homeCourseLectureDraftList,
      )
        ? this.state.homeCourseLectureDraftList
            .map((entry) => this.normalizeHomeCourseLectureDraftEntry(entry))
            .filter(Boolean)
        : [];
      if (lectureDraftList.length > 0) {
        const plannerRoot = this.getResolvedPlannerRoot();
        const currentIntervals =
          this.getPlannerIntervalsWithComponents(plannerRoot);
        let lectureWasMounted = false;
        let nextIntervals = currentIntervals;
        lectureDraftList.forEach((draftEntry) => {
          const parsedCourseContext =
            this.parsePlannerMaterialMetadataCourseId(
              draftEntry?.courseID || draftEntry?.courseId || "",
            );
          const targetSubIntervalId = String(
            parsedCourseContext?.subIntervalId || draftEntry?.subIntervalId || "",
          ).trim();
          const targetCourseNum =
            Number.parseInt(
              String(parsedCourseContext?.courseNum || draftEntry?.courseNum || "").trim(),
              10,
            ) || null;
          const targetComponentClass = String(
            parsedCourseContext?.componentClass || draftEntry?.courseComponent || "",
          ).trim();
          if (
            !targetSubIntervalId ||
            !Number.isInteger(targetCourseNum) ||
            !targetComponentClass
          ) {
            return;
          }
          nextIntervals = nextIntervals.map((intervalEntry) => {
            const currentSubIntervalId = String(
              intervalEntry?.subIntervalID ||
                intervalEntry?.subIntervalId ||
                intervalEntry?.intervalId ||
                "",
            ).trim();
            const currentIntervalCourses = Array.isArray(
              intervalEntry?.intervalCourses,
            )
              ? intervalEntry.intervalCourses
              : [];
            if (currentSubIntervalId !== targetSubIntervalId) {
              return {
                ...intervalEntry,
                intervalCourses: currentIntervalCourses,
                subIntervalCourses: currentIntervalCourses,
              };
            }
            const nextIntervalCourses = currentIntervalCourses.map(
              (courseEntry, courseIndex) => {
                const currentCourseNum =
                  Number.parseInt(
                    String(courseEntry?.courseNum || "").trim(),
                    10,
                  ) || courseIndex + 1;
                if (currentCourseNum !== targetCourseNum) {
                  return courseEntry;
                }
                const currentCourseComponents = Array.isArray(
                  courseEntry?.courseComponents,
                )
                  ? courseEntry.courseComponents
                  : [];
                const nextCourseComponents = (
                  currentCourseComponents.length > 0
                    ? currentCourseComponents
                    : [
                        {
                          componentClass: String(
                            courseEntry?.courseComponentName ||
                              courseEntry?.courseComponentId ||
                              "",
                          ).trim(),
                          componentExams: [],
                        },
                      ]
                ).map((componentEntry) => {
                  const componentClass = String(
                    componentEntry?.componentClass ||
                      courseEntry?.courseComponentName ||
                      courseEntry?.courseComponentId ||
                      "",
                  ).trim();
                  if (componentClass !== targetComponentClass) {
                    return componentEntry;
                  }
                  lectureWasMounted = true;
                  const targetExamID = String(draftEntry?.examID || "").trim();
                  const storedComponentID = String(componentEntry?.componentID || "").trim();
                  const baseCourseId = String(draftEntry?.courseID || draftEntry?.courseId || "").trim();
                  const resolvedComponentID = storedComponentID || "";
                  const currentExams = Array.isArray(componentEntry?.componentExams)
                    ? componentEntry.componentExams
                    : [];
                  const targetExamIndex = targetExamID
                    ? currentExams.findIndex((ex) => String(ex?.examID || "").trim() === targetExamID)
                    : currentExams.length > 0 ? 0 : -1;
                  const targetExam = targetExamIndex >= 0 ? currentExams[targetExamIndex] : null;
                  const existingLectures = Array.isArray(targetExam?.examsLectures)
                    ? targetExam.examsLectures
                    : [];
                  const sanitizedLectures = existingLectures.filter(
                    (lec) => String(lec?.lectureName || "").trim() !== draftEntry.lectureName,
                  );
                  const nextLectureNum =
                    sanitizedLectures.reduce((maxValue, lec) => {
                      const n = Number.parseInt(String(lec?.lectureNum || "").trim(), 10);
                      return Number.isInteger(n) && n > maxValue ? n : maxValue;
                    }, 0) + 1;
                  const newLectureID = resolvedComponentID
                    ? `${resolvedComponentID}-L${nextLectureNum}`
                    : `lecture_${nextLectureNum}_${Date.now()}`;
                  const newLecture = {
                    lectureID: newLectureID,
                    lectureNum: nextLectureNum,
                    lectureName: draftEntry.lectureName,
                    lectureInstructors: [draftEntry.lectureInstructor].filter(Boolean),
                  };
                  let nextExams;
                  if (targetExamIndex >= 0) {
                    nextExams = currentExams.map((ex, idx) =>
                      idx === targetExamIndex
                        ? { ...ex, examsLectures: [...sanitizedLectures, newLecture] }
                        : ex,
                    );
                  } else {
                    // No exam found — create a placeholder exam
                    const autoExamID = resolvedComponentID ? `${resolvedComponentID}-E1` : `exam_${Date.now()}`;
                    nextExams = [
                      ...currentExams,
                      { examID: autoExamID, examNum: 1, examsLectures: [newLecture] },
                    ];
                  }
                  return {
                    ...componentEntry,
                    componentClass,
                    componentExams: nextExams,
                  };
                });
                return {
                  ...courseEntry,
                  courseNum: currentCourseNum,
                  courseComponents: nextCourseComponents,
                };
              },
            );
            return {
              ...intervalEntry,
              intervalCourses: nextIntervalCourses,
              subIntervalCourses: nextIntervalCourses,
            };
          });
        });
        if (!lectureWasMounted) {
          this.props.serverReply?.("The selected Component ID could not be found.");
          return;
        }
        try {
          const nextPlannerRoot =
            await this.persistStudyPlannerIntervals(nextIntervals);
          this.setState({
            plannerRoot:
              nextPlannerRoot && typeof nextPlannerRoot === "object"
                ? nextPlannerRoot
                : this.state?.plannerRoot || {},
            homeCoursesEditorOpen: false,
            homeMaterialMetadataMode: "course",
            homeCourseEditingKey: "",
            homeCourseOriginalId: "",
            homeCourseOriginalIntervalId: "",
            homeCourseOriginalCourseNum: "",
            homeCourseOriginalComponentClass: "",
            homeCourseOriginalLectureNum: "",
            homeCourseLectureCourseContextDraft: "",
            homeCourseLectureCourseNameDraft: "",
            homeCourseLectureNameDraft: "",
            homeCourseLectureInstructorsDraft: "",
            homeCourseLectureInstructionDateDraft: "",
            homeLectureExamIdDraft: "",
            homeCourseLectureDraftList: [],
          });
          this.props.serverReply?.("Lecture info saved.");
        } catch (error) {
          this.props.serverReply?.(
            String(error?.message || "Failed to save lecture info."),
          );
        }
        return;
      }
      const originalSubIntervalId = String(
        this.state?.homeCourseOriginalIntervalId || "",
      ).trim();
      const originalCourseNum =
        Number.parseInt(
          String(this.state?.homeCourseOriginalCourseNum || "").trim(),
          10,
        ) || null;
      const originalComponentClass = String(
        this.state?.homeCourseOriginalComponentClass || "",
      ).trim();
      const originalLectureNum =
        Number.parseInt(
          String(this.state?.homeCourseOriginalLectureNum || "").trim(),
          10,
        ) || null;
      const lectureCourseContextValue = String(
        this.state?.homeCourseLectureCourseContextDraft || "",
      ).trim();
      const lectureName = String(
        this.state?.homeCourseLectureNameDraft || "",
      ).trim();
      const lectureInstructor = String(
        this.state?.homeCourseLectureInstructorsDraft || "",
      ).trim();
      if (!lectureCourseContextValue || !lectureName || !lectureInstructor) {
        this.props.serverReply?.(
          "Select Component ID, then enter lecture name and lecture instructor.",
        );
        return;
      }
      const plannerRoot = this.getResolvedPlannerRoot();
      const courseRows = this.getPlannerMaterialMetadataCourseRows(plannerRoot);
      const targetCourseRow =
        courseRows.find(
          (entry) => String(entry?.key || "").trim() === lectureCourseContextValue,
        ) ||
        courseRows.find(
          (entry) =>
            this.getPlannerCourseSchemaID(entry) === lectureCourseContextValue ||
            this.getPlannerComponentSchemaID(entry) === lectureCourseContextValue,
        ) ||
        null;
      const targetSubIntervalId = this.getPlannerSubIntervalSchemaID(targetCourseRow);
      const targetCourseNum =
        Number.parseInt(String(targetCourseRow?.courseNum || "").trim(), 10) ||
        null;
      const targetComponentID = this.getPlannerComponentSchemaID(targetCourseRow);
      if (
        !targetSubIntervalId ||
        !Number.isInteger(targetCourseNum) ||
        !targetComponentID
      ) {
        this.props.serverReply?.("Selected Component ID is invalid.");
        return;
      }
      const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
      let lectureWasMounted = false;
      const nextIntervals = currentIntervals.map((intervalEntry) => {
        const currentSubIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
        const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
          : [];
        if (currentSubIntervalId !== targetSubIntervalId) {
          return {
            ...intervalEntry,
            intervalCourses: currentIntervalCourses,
            subIntervalCourses: currentIntervalCourses,
          };
        }
        const nextIntervalCourses = currentIntervalCourses.map((courseEntry, courseIndex) => {
          const currentCourseNum =
            Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
            courseIndex + 1;
          if (currentCourseNum !== targetCourseNum) {
            return courseEntry;
          }
          const currentCourseComponents = Array.isArray(courseEntry?.courseComponents)
            ? courseEntry.courseComponents
            : [];
          const nextCourseComponents = (
            currentCourseComponents.length > 0
              ? currentCourseComponents
              : [
                  {
                    componentClass: String(
                      courseEntry?.courseComponentName ||
                        courseEntry?.courseComponentId ||
                        "",
                    ).trim(),
                    componentExams: [],
                  },
                ]
          ).map((componentEntry) => {
            const componentID = this.getPlannerComponentSchemaID(componentEntry);
            if (componentID !== targetComponentID) {
              return componentEntry;
            }
            lectureWasMounted = true;
            const targetExamID = String(this.state?.homeLectureExamIdDraft || "").trim();
            const storedComponentID = String(componentEntry?.componentID || "").trim();
            const resolvedComponentID = storedComponentID || targetComponentID;
            const currentExams = Array.isArray(componentEntry?.componentExams) ? componentEntry.componentExams : [];
            const targetExamIndex = targetExamID
              ? currentExams.findIndex((ex) => String(ex?.examID || "").trim() === targetExamID)
              : currentExams.length > 0 ? 0 : -1;
            const targetExam = targetExamIndex >= 0 ? currentExams[targetExamIndex] : null;
            const existingLectures = Array.isArray(targetExam?.examsLectures) ? targetExam.examsLectures : [];
            const isEditing = Number.isInteger(originalLectureNum);
            const originalLectureEntry = isEditing
              ? existingLectures.find((lec) => {
                  const n = Number.parseInt(String(lec?.lectureNum || "").trim(), 10);
                  return n === originalLectureNum;
                }) || null
              : null;
            const sanitizedLectures = isEditing
              ? existingLectures.filter((lec) => {
                  const n = Number.parseInt(String(lec?.lectureNum || "").trim(), 10);
                  return n !== originalLectureNum;
                })
              : existingLectures;
            const nextLectureNum = isEditing && originalLectureNum
              ? originalLectureNum
              : sanitizedLectures.reduce((maxValue, lec) => {
                  const n = Number.parseInt(String(lec?.lectureNum || "").trim(), 10);
                  return Number.isInteger(n) && n > maxValue ? n : maxValue;
                }, 0) + 1;
            const existingLectureID = String(originalLectureEntry?.lectureID || "").trim();
            const nextLectureID = existingLectureID ||
              (resolvedComponentID ? `${resolvedComponentID}-L${nextLectureNum}` : `lecture_${nextLectureNum}_${Date.now()}`);
            const newLecture = { lectureID: nextLectureID, lectureNum: nextLectureNum, lectureName, lectureInstructors: [lectureInstructor] };
            let nextExams;
            if (targetExamIndex >= 0) {
              nextExams = currentExams.map((ex, idx) =>
                idx === targetExamIndex
                  ? { ...ex, examsLectures: [...sanitizedLectures, newLecture] }
                  : ex,
              );
            } else {
              const autoExamID = resolvedComponentID ? `${resolvedComponentID}-E1` : `exam_${Date.now()}`;
              nextExams = [...currentExams, { examID: autoExamID, examNum: 1, examsLectures: [newLecture] }];
            }
            return {
              ...componentEntry,
              componentID: resolvedComponentID,
              componentExams: nextExams,
            };
            });
          return {
            ...courseEntry,
            courseNum: currentCourseNum,
            courseComponents: nextCourseComponents,
          };
        });
        return {
          ...intervalEntry,
          intervalCourses: nextIntervalCourses,
          subIntervalCourses: nextIntervalCourses,
        };
      });
      if (!lectureWasMounted) {
        this.props.serverReply?.("The selected Component ID could not be found.");
        return;
      }
      try {
        const nextPlannerRoot =
          await this.persistStudyPlannerIntervals(nextIntervals);
        this.setState({
          plannerRoot:
            nextPlannerRoot && typeof nextPlannerRoot === "object"
              ? nextPlannerRoot
              : this.state?.plannerRoot || {},
          homeCourseEditingKey: "",
          homeCourseOriginalIntervalId: "",
          homeCourseOriginalCourseNum: "",
          homeCourseOriginalComponentClass: "",
          homeCourseOriginalLectureNum: "",
          homeCourseLectureCourseContextDraft: "",
          homeCourseLectureNameDraft: "",
          homeCourseLectureInstructorsDraft: "",
        });
        this.props.serverReply?.("Lecture info saved.");
      } catch (error) {
        this.props.serverReply?.(
          String(error?.message || "Failed to save lecture info."),
        );
      }
      return;
    }
    const editingKey = String(this.state?.homeCourseEditingKey || "").trim();
    const originalIntervalId = String(
      this.state?.homeCourseOriginalIntervalId || "",
    ).trim();
    const originalCourseNum =
      Number.parseInt(
        String(this.state?.homeCourseOriginalCourseNum || "").trim(),
        10,
      ) || null;
    const draftCourseId = String(this.state?.homeCourseIdDraft || "").trim();
    const draftCourseName = String(
      this.state?.homeCourseNameDraft || "",
    ).trim();
    const draftCourseCode = String(
      this.state?.homeCourseCodeDraft || "",
    ).trim();
    const resolvedCourse = this.resolvePlannerCourseDraft({
      courseId: draftCourseId,
      courseName: draftCourseName,
      courseCode: draftCourseCode,
    });
    const courseName = String(
      draftCourseName ||
        resolvedCourse?.course_name ||
        resolvedCourse?.name ||
        "",
    ).trim();
    const courseCode = String(
      draftCourseCode ||
        resolvedCourse?.course_code ||
        resolvedCourse?.code ||
        "",
    ).trim();
    const courseWeight = String(
      this.state?.homeCourseTotalWeightDraft || "",
    ).trim();
    const courseComponentId = String(
      this.state?.homeCourseComponentIdDraft || "",
    ).trim();
    const subIntervalYear = String(
      this.state?.homeCourseSubIntervalYearDraft || "",
    ).trim();
    const subIntervalTerm = String(
      this.state?.homeCourseSubIntervalTermDraft || "",
    ).trim();
    const intervalId = this.resolvePlannerSubIntervalDraftId({
      subIntervalId: this.state?.homeCourseIntervalIdDraft || "",
      intervalNum: subIntervalYear,
      subIntervalNum: subIntervalTerm,
    });
    const pendingCourseDraftEntries = Array.isArray(
      this.state?.homeCourseDraftList,
    )
      ? this.state.homeCourseDraftList.filter(Boolean)
      : [];
    const shouldSaveQueuedDraftRows =
      pendingCourseDraftEntries.length > 0 && !editingKey;
    if (shouldSaveQueuedDraftRows) {
      const plannerRoot = this.getResolvedPlannerRoot();
      const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
      let savedEntryCount = 0;
      const nextIntervals = currentIntervals.map((intervalEntry) => {
        const currentSubIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
        const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
          : [];
        const matchingDraftEntries = pendingCourseDraftEntries.filter(
          (draftEntry) =>
            String(draftEntry?.subIntervalId || draftEntry?.intervalId || "").trim() ===
            currentSubIntervalId,
        );
        if (matchingDraftEntries.length === 0) {
          return {
            ...intervalEntry,
            intervalCourses: currentIntervalCourses,
            subIntervalCourses: currentIntervalCourses,
          };
        }
        const existingCourseNums = new Set(
          currentIntervalCourses
            .map((courseEntry, courseIndex) =>
              Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
              courseIndex + 1,
            )
            .filter((entry) => Number.isInteger(entry)),
        );
        const nextIntervalCourses = [...currentIntervalCourses];
        matchingDraftEntries.forEach((draftEntry) => {
          const draftCourseNum =
            Number.parseInt(String(draftEntry?.courseNum || "").trim(), 10) || null;
          if (!Number.isInteger(draftCourseNum)) {
            return;
          }
          const nextCourseID = String(
            draftEntry?.courseID ||
              this.buildPlannerMaterialMetadataCourseId({
                intervalNum: currentSubIntervalId,
                subIntervalId: currentSubIntervalId,
                courseNum: draftCourseNum,
                componentClass:
                  draftEntry?.courseComponent ||
                  draftEntry?.courseComponentId ||
                  "",
              }),
          ).trim();
          const courseComponents = (
            Array.isArray(draftEntry?.courseComponents)
              ? draftEntry.courseComponents
              : []
          ).map((comp, compIdx) => {
            const componentClass = String(
              comp?.componentClass || comp?.componentId || "",
            ).trim();
            const componentNum = Number.isFinite(Number.parseInt(comp?.componentNum, 10))
              ? Number.parseInt(comp.componentNum, 10)
              : compIdx + 1;
            const compSym = String(comp?.componentSymbol || "COMP").trim();
            const componentID = nextCourseID && componentNum != null
              ? `${nextCourseID}-${compSym}${componentNum}`
              : String(comp?.componentID || "").trim();
            return {
              ...comp,
              componentClass,
              componentNum,
              componentID,
            };
          });
          const coursePayload = {
            courseNum: draftCourseNum,
            courseID: nextCourseID,
            courseName: String(draftEntry?.courseName || "").trim(),
            courseCode: String(draftEntry?.courseCode || "").trim(),
            courseWeight: Number.parseFloat(
              String(draftEntry?.courseWeight || "").trim(),
            ),
            subIntervalId: currentSubIntervalId,
            intervalId: currentSubIntervalId,
            courseComponents,
          };
          if (draftEntry?.isEdit) {
            const existingIdx = nextIntervalCourses.findIndex(
              (c) =>
                (Number.parseInt(String(c?.courseNum || "").trim(), 10) || null) ===
                draftCourseNum,
            );
            if (existingIdx >= 0) {
              nextIntervalCourses[existingIdx] = {
                ...nextIntervalCourses[existingIdx],
                ...coursePayload,
              };
              savedEntryCount += 1;
            }
          } else {
            if (existingCourseNums.has(draftCourseNum)) {
              return;
            }
            existingCourseNums.add(draftCourseNum);
            savedEntryCount += 1;
            nextIntervalCourses.push(coursePayload);
          }
        });
        return {
          ...intervalEntry,
          intervalCourses: nextIntervalCourses,
          subIntervalCourses: nextIntervalCourses,
        };
      });
      if (savedEntryCount === 0) {
        this.props.serverReply?.("No preview rows were ready to save.");
        return;
      }
      try {
        const nextPlannerRoot =
          await this.persistStudyPlannerIntervals(nextIntervals);
        this.setState({
          plannerRoot:
            nextPlannerRoot && typeof nextPlannerRoot === "object"
              ? nextPlannerRoot
              : this.state?.plannerRoot || {},
          homeCourseDraftList: [],
          homeCourseNameDraft: "",
          homeCourseIdDraft: "",
          homeCourseCodeDraft: "",
          homeCourseTotalWeightDraft: "",
          homeCourseComponentIdDraft: "",
          homeCourseComponentPartialWeightDraft: "",
          homeCourseComponentStatusDraft: "",
          homeCourseLectureNameDraft: "",
          homeCourseLectureInstructorsDraft: "",
          homeCourseLectureInstructionDateDraft: "",
        });
        this.props.serverReply?.("Course info saved.");
      } catch (error) {
        this.props.serverReply?.(
          String(error?.message || "Failed to save course info."),
        );
      }
      return;
    }
    const stagedComponents = (
      Array.isArray(this.state?.homeCourseComponentDraft)
        ? this.state.homeCourseComponentDraft
        : []
    )
      .map((entry) => this.normalizeHomeCourseComponentDraftEntry(entry))
      .filter(Boolean);
    const hasComponents = stagedComponents.length > 0 || Boolean(courseComponentId);
    if (
      !courseName ||
      !courseCode ||
      !courseWeight ||
      !hasComponents ||
      !intervalId
    ) {
      this.props.serverReply?.(
        "Enter course name, code, course weight, course component, and sub-Interval ID.",
      );
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    let courseWasMounted = false;
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
      const currentIntervalCourses = Array.isArray(
        intervalEntry?.subIntervalCourses,
      )
        ? intervalEntry.subIntervalCourses
        : Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
        : [];
      const sanitizedIntervalCourses = currentIntervalCourses.filter(
        (courseEntry) => {
          if (!editingKey) {
            return true;
          }
          const currentCourseNum = Number.parseInt(
            String(courseEntry?.courseNum || "").trim(),
            10,
          );
          return !(
            currentIntervalId === originalIntervalId &&
            Number.isInteger(originalCourseNum) &&
            currentCourseNum === originalCourseNum
          );
        },
      );
      if (currentIntervalId !== intervalId) {
        return {
          ...intervalEntry,
          intervalCourses: sanitizedIntervalCourses,
          subIntervalCourses: sanitizedIntervalCourses,
        };
      }
      courseWasMounted = true;
      const previousCourseEntry =
        Number.isInteger(originalCourseNum) && currentIntervalId === originalIntervalId
          ? currentIntervalCourses.find(
              (courseEntry, courseIndex) =>
                (Number.parseInt(
                  String(courseEntry?.courseNum || "").trim(),
                  10,
                ) || courseIndex + 1) === originalCourseNum,
            ) || null
          : null;
      const previousCourseComponents = Array.isArray(previousCourseEntry?.courseComponents)
        ? previousCourseEntry.courseComponents
        : [];
      const nextCourseNum =
        Number.isInteger(originalCourseNum) && currentIntervalId === originalIntervalId
          ? originalCourseNum
          : sanitizedIntervalCourses.reduce((maxValue, courseEntry, courseIndex) => {
              const currentCourseNum =
                Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
                courseIndex + 1;
              return currentCourseNum > maxValue ? currentCourseNum : maxValue;
            }, 0) + 1;
      const nextCourseID = String(
        previousCourseEntry?.courseID ||
        previousCourseEntry?.courseId ||
        this.buildPlannerMaterialMetadataCourseId({
          intervalNum: currentIntervalId,
          subIntervalId: intervalId,
          courseNum: nextCourseNum,
        }) ||
        "",
      ).trim();
      const parsedCourseWeightValue = Number.parseFloat(courseWeight);
      const nextCourseComponents = stagedComponents.length > 0
        ? stagedComponents.map((comp, compIdx) => {
            const prevComp = previousCourseComponents.find(
              (p) => String(p?.componentClass || "").trim() === comp.componentId,
            ) || {};
            const parsedPct = Number.parseFloat(
              String(comp?.componentWeightPercentage || comp?.componentPartialWeight || "").trim(),
            );
            const componentWeight =
              Number.isFinite(parsedCourseWeightValue) && Number.isFinite(parsedPct)
                ? Number((parsedCourseWeightValue * (parsedPct / 100)).toFixed(4))
                : (comp.componentWeight ?? null);
            const componentNum = Number.isFinite(Number.parseInt(comp?.componentNum, 10))
              ? Number.parseInt(comp.componentNum, 10)
              : Number.isFinite(Number.parseInt(prevComp?.componentNum, 10))
                ? Number.parseInt(prevComp.componentNum, 10)
                : compIdx + 1;
            const compSym = String(comp?.componentSymbol || "COMP").trim();
            const componentID = `${nextCourseID}-${compSym}${componentNum}`;
            return {
              ...prevComp,
              componentID,
              componentNum,
              componentClass: comp.componentId,
              componentWeight,
              componentLocation: prevComp.componentLocation || {},
              componentExams: Array.isArray(prevComp.componentExams)
                ? prevComp.componentExams
                : [],
            };
          })
        : [
            {
              ...(previousCourseComponents[0] || {}),
              componentID:
                previousCourseComponents[0]?.componentNum != null
                  ? `${nextCourseID}-COMP${previousCourseComponents[0].componentNum}`
                  : `${nextCourseID}-COMP1`,
              componentNum: previousCourseComponents[0]?.componentNum ?? 1,
              componentClass: courseComponentId,
              componentLocation: previousCourseComponents[0]?.componentLocation || {},
              componentExams: Array.isArray(previousCourseComponents[0]?.componentExams)
                ? previousCourseComponents[0].componentExams
                : [],
            },
          ];
      const nextCourseEntry = {
        ...previousCourseEntry,
        courseNum: nextCourseNum,
        courseID: nextCourseID,
        courseName,
        courseCode,
        courseWeight: Number.parseFloat(courseWeight),
        subIntervalId: intervalId,
        intervalId,
        courseComponents: nextCourseComponents,
      };
      const nextIntervalCourses = [...sanitizedIntervalCourses, nextCourseEntry];
      return {
        ...intervalEntry,
        intervalCourses: nextIntervalCourses,
        subIntervalCourses: nextIntervalCourses,
      };
    });
    if (!courseWasMounted) {
      this.props.serverReply?.("The selected sub-Interval ID could not be found.");
      return;
    }
    try {
      const nextPlannerRoot =
        await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeCoursesEditorOpen: false,
        homeMaterialMetadataMode: "course",
        homeCourseEditingKey: "",
        homeCourseOriginalId: "",
        homeCourseOriginalIntervalId: "",
        homeCourseOriginalCourseNum: "",
        homeCourseNameDraft: "",
        homeCourseIdDraft: "",
        homeCourseCodeDraft: "",
        homeCourseComponentDraft: [],
        homeCourseComponentEditingId: "",
        homeCourseTotalWeightDraft: "",
        homeCourseComponentIdDraft: "",
        homeCourseComponentPartialWeightDraft: "",
        homeCourseComponentStatusDraft: "",
        homeCourseLectureCourseContextDraft: "",
        homeCourseLectureNameDraft: "",
        homeCourseLectureInstructorsDraft: "",
        homeCourseLectureInstructionDateDraft: "",
      });
      this.props.serverReply?.("Course saved.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save course."),
      );
    }
  };
  handleHomeCourseComponentLecturesSetSubmit = async () => {
    const lectureDrafts = Array.isArray(
      this.state?.homeCourseComponentLectureDraftList,
    )
      ? this.state.homeCourseComponentLectureDraftList
      : [];
    if (lectureDrafts.length === 0) {
      this.props.serverReply?.("Add at least one lecture name first.");
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const normalizedDrafts = lectureDrafts
      .map((entry) => ({
        courseID: String(entry?.courseID || entry?.courseId || "").trim(),
        intervalId: String(entry?.subIntervalId || entry?.intervalId || "").trim(),
        componentID: String(entry?.componentID || entry?.componentId || "").trim(),
        lectureName: String(
          entry?.lectureName || entry?.lectureId || "",
        ).trim(),
      }))
      .filter(
        (entry) =>
          entry.courseID &&
          entry.intervalId &&
          entry.componentID &&
          entry.lectureName,
      );
    if (normalizedDrafts.length === 0) {
      this.props.serverReply?.("Add at least one lecture name first.");
      return;
    }
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
      const courseEntries = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      const nextCourseEntries = courseEntries.map((courseEntry) => {
        const currentCourseID = this.getPlannerCourseSchemaID(courseEntry);
        if (
          !normalizedDrafts.some(
            (draft) =>
              draft.courseID === currentCourseID &&
              draft.intervalId === currentIntervalId,
          )
        ) {
          return courseEntry;
        }
        const currentCourseComponents = Array.isArray(courseEntry?.courseComponents)
          ? courseEntry.courseComponents
          : [];
        const nextCourseComponents = currentCourseComponents.map(
          (componentEntry) => {
            const currentComponentId = this.getPlannerComponentSchemaID(componentEntry);
            const matchedDrafts = normalizedDrafts.filter(
              (draft) =>
                draft.courseID === currentCourseID &&
                draft.intervalId === currentIntervalId &&
                draft.componentID === currentComponentId,
            );
            if (matchedDrafts.length === 0) {
              return componentEntry;
            }
            const existingExams = Array.isArray(componentEntry?.componentExams)
              ? componentEntry.componentExams
              : [];
            const targetExam = existingExams[0] || { examID: "", examsLectures: [] };
            const targetExamIdx = existingExams.length > 0 ? 0 : -1;
            const existingLectures = Array.isArray(targetExam?.examsLectures)
              ? targetExam.examsLectures
              : [];
            const existingLectureIds = new Set(
              existingLectures
                .map((lecture) =>
                  String(lecture?.lectureName || lecture?.lectureID || "").trim(),
                )
                .filter(Boolean),
            );
            const nextLectures = [...existingLectures];
            matchedDrafts.forEach((draft) => {
              if (!existingLectureIds.has(draft.lectureName)) {
                existingLectureIds.add(draft.lectureName);
                nextLectures.push({
                  lectureName: draft.lectureName,
                  lectureDocuments: [],
                });
              }
            });
            const nextExam = { ...targetExam, examsLectures: nextLectures };
            const nextExams =
              targetExamIdx >= 0
                ? existingExams.map((e, i) => (i === targetExamIdx ? nextExam : e))
                : [nextExam];
            return {
              ...componentEntry,
              componentExams: nextExams,
            };
          },
        );
        return {
          ...courseEntry,
          courseComponents: nextCourseComponents,
        };
      });
      return {
        ...intervalEntry,
        intervalNum:
          Number.isInteger(
            Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10),
          )
            ? Number.parseInt(
                String(intervalEntry?.intervalNum || "").trim(),
                10,
              )
            : Number.parseInt(String(intervalEntry?.intervalId || "").trim(), 10) ||
              null,
        intervalCourses: nextCourseEntries,
        subIntervalCourses: nextCourseEntries,
      };
    });
    try {
      const nextPlannerRoot =
        await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeCourseComponentLecturesEditorOpen: false,
        homeCourseComponentLectureCourseIdDraft: "",
        homeCourseComponentLectureIntervalIdDraft: "",
        homeCourseComponentLectureComponentIdDraft: "",
        homeCourseComponentLectureNameDraft: "",
        homeCourseComponentLectureDraftList: [],
      });
      this.props.serverReply?.("Lecture names saved.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save lecture names."),
      );
    }
  };
  editHomeCourseEntry = (courseEntry = {}) => {
    const courseSchemaID = this.getPlannerCourseSchemaID(courseEntry);
    const matchedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (plannerCourse) =>
          String(plannerCourse?._id || "").trim() ===
          courseSchemaID,
      ) || null;
    const sourceCourseComponents = Array.isArray(courseEntry?.courseComponents)
      ? courseEntry.courseComponents
      : Array.isArray(courseEntry?.components)
        ? courseEntry.components
        : [];
    const primaryCourseComponent = sourceCourseComponents.find((entry) => {
      const nextComponentId = String(
        entry?.componentId || entry?.course_componentId || "",
      ).trim();
      return Boolean(nextComponentId);
    }) || null;
    const parsedCourseWeightValue = Number.parseFloat(
      String(
        courseEntry?.courseWeight ||
          courseEntry?.courseTotalWeight ||
          courseEntry?.course_totalWeight ||
          "",
      ).trim(),
    );
    const componentDrafts = (
      sourceCourseComponents.length > 0
        ? sourceCourseComponents
        : Array.isArray(courseEntry?.componentIds)
          ? courseEntry.componentIds.map((entry) => ({ componentId: entry }))
          : []
    )
      .map((entry, index) => {
        const normalizedEntry = this.normalizeHomeCourseComponentDraftEntry(
          entry,
        );
        if (!normalizedEntry) {
          return null;
        }
        if (normalizedEntry.componentNum == null) {
          normalizedEntry.componentNum = index + 1;
        }
        const parsedStoredComponentWeight = Number.parseFloat(
          String(
            normalizedEntry.componentWeight ||
              normalizedEntry.componentRelativeWeight ||
              normalizedEntry.componentPartialWeight ||
              normalizedEntry.componentWeightPercentage ||
              "",
          ).trim(),
        );
        const derivedComponentWeightPercentage =
          Number.isFinite(parsedCourseWeightValue) &&
          parsedCourseWeightValue !== 0 &&
          Number.isFinite(parsedStoredComponentWeight)
            ? (parsedStoredComponentWeight / parsedCourseWeightValue) * 100
            : null;
        return {
          ...normalizedEntry,
          componentWeightPercentage:
            this.formatPlannerComponentWeightInputValue(
              Number.isFinite(derivedComponentWeightPercentage)
                ? derivedComponentWeightPercentage
                : normalizedEntry.componentWeightPercentage,
            ) || normalizedEntry.componentWeightPercentage,
          componentPartialWeight:
            this.formatPlannerComponentWeightInputValue(
              Number.isFinite(derivedComponentWeightPercentage)
                ? derivedComponentWeightPercentage
                : normalizedEntry.componentWeightPercentage ||
                    normalizedEntry.componentPartialWeight,
            ) || normalizedEntry.componentPartialWeight,
          componentWeight:
            Number.isFinite(parsedStoredComponentWeight)
              ? Number(parsedStoredComponentWeight.toFixed(4))
              : null,
        };
      })
      .filter(Boolean);
    const parsedSubInterval = this.parseIntervalIdYearTerm(
      String(courseEntry?.subIntervalId || courseEntry?.intervalId || "").trim(),
    );
    const primaryLecture = Array.isArray(primaryCourseComponent?.componentExams)
      ? (primaryCourseComponent.componentExams
          .flatMap((exam) =>
            Array.isArray(exam?.examsLectures) ? exam.examsLectures : [],
          )
          .find((entry) =>
            String(entry?.lectureName || entry?.lectureID || "").trim(),
          ) || null)
      : null;
    const parsedCourseWeight = Number.parseFloat(
      String(
        courseEntry?.courseWeight ||
          courseEntry?.courseTotalWeight ||
          courseEntry?.course_totalWeight ||
          "",
      ).trim(),
    );
    const storedComponentWeight = Number.parseFloat(
      String(
        primaryCourseComponent?.componentWeight ||
          primaryCourseComponent?.componentRelativeWeight ||
          primaryCourseComponent?.componentPartialWeight ||
          primaryCourseComponent?.componentWeightPercentage ||
          courseEntry?.componentWeight ||
          courseEntry?.componentRelativeWeight ||
          courseEntry?.componentPartialWeight ||
          courseEntry?.componentWeightPercentage ||
          "",
      ).trim(),
    );
    const derivedComponentWeightPercentage =
      Number.isFinite(parsedCourseWeight) &&
      parsedCourseWeight !== 0 &&
      Number.isFinite(storedComponentWeight)
        ? (storedComponentWeight / parsedCourseWeight) * 100
        : null;
    this.setState({
      homeCoursesEditorOpen: true,
      homeMaterialMetadataMode: "course",
      homeCourseEditingKey: String(courseEntry?.key || "").trim(),
      homeCourseOriginalId: String(
        courseSchemaID || courseEntry?.courseName || "",
      ).trim(),
      homeCourseOriginalIntervalId: String(
        courseEntry?.subIntervalId || courseEntry?.intervalId || "",
      ).trim(),
      homeCourseOriginalCourseNum: String(courseEntry?.courseNum || "").trim(),
      homeCourseNameDraft: String(
        matchedCourse?.course_name ||
          matchedCourse?.name ||
          courseEntry?.courseName ||
          courseEntry?.courseCode ||
          "",
      ).trim(),
      homeCourseIdDraft: String(
        courseSchemaID || "",
      ).trim(),
      homeCourseCodeDraft: String(courseEntry?.courseCode || "").trim(),
      homeCourseComponentIdDraft: String(
        courseEntry?.courseComponent ||
        courseEntry?.courseComponentId ||
          courseEntry?.course_componentId ||
          primaryCourseComponent?.componentId ||
          primaryCourseComponent?.course_componentId ||
          "",
      ).trim(),
      homeCourseComponentDraft: componentDrafts,
      homeCourseComponentEditingId: "",
      homeCourseTotalWeightDraft: String(
        courseEntry?.courseWeight ||
          courseEntry?.courseTotalWeight ||
          courseEntry?.course_totalWeight ||
          "",
      ).trim(),
      homeCourseSubIntervalYearDraft: String(parsedSubInterval?.year || "").trim(),
      homeCourseSubIntervalTermDraft: String(parsedSubInterval?.term || "").trim(),
      homeCourseComponentPartialWeightDraft: String(
        this.formatPlannerComponentWeightInputValue(
          Number.isFinite(derivedComponentWeightPercentage)
            ? derivedComponentWeightPercentage
            : courseEntry?.componentWeightPercentage ||
                courseEntry?.componentPartialWeight ||
                primaryCourseComponent?.componentWeightPercentage ||
                primaryCourseComponent?.componentPartialWeight ||
                "",
        ),
      ).trim(),
      homeCourseComponentStatusDraft: "",
      homeCourseIntervalIdDraft: String(
        courseEntry?.subIntervalId || courseEntry?.intervalId || "",
      ).trim(),
      homeCourseLectureCourseContextDraft: "",
      homeCourseLectureNameDraft: String(
        primaryLecture?.lectureName || primaryLecture?.lectureId || "",
      ).trim(),
      homeCourseLectureInstructorsDraft: Array.isArray(
        primaryLecture?.lectureInstructors,
      )
        ? primaryLecture.lectureInstructors.join(", ")
        : "",
      homeCourseLectureInstructionDateDraft: this.formatPlannerDateInputValue(
        primaryLecture?.lectureInstructionDate ||
          primaryLecture?.lectureGivenDate ||
          "",
      ),
    });
  };
  deleteHomeCourseEntry = async (courseEntry = {}) => {
    const targetCourseID = this.getPlannerCourseSchemaID(courseEntry);
    const parsedTargetCourseID =
      this.parsePlannerMaterialMetadataCourseId(targetCourseID);
    const targetSubIntervalId = String(
      courseEntry?.subIntervalId || parsedTargetCourseID?.subIntervalId || "",
    ).trim();
    const targetCourseNum =
      Number.parseInt(
        String(courseEntry?.courseNum || parsedTargetCourseID?.courseNum || "").trim(),
        10,
      ) || null;
    if (!targetSubIntervalId || !Number.isInteger(targetCourseNum)) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentSubIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
      const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      if (currentSubIntervalId !== targetSubIntervalId) {
        return {
          ...intervalEntry,
          intervalCourses: currentIntervalCourses,
        };
      }
      let hasDeletedMatch = false;
      return {
        ...intervalEntry,
        intervalCourses: currentIntervalCourses.filter(
          (entry) => {
            if (hasDeletedMatch) {
              return true;
            }
            const currentCourseNum =
              Number.parseInt(String(entry?.courseNum || "").trim(), 10) ||
              null;
            const currentCourseID = this.getPlannerCourseSchemaID(entry);
            const matchesTarget = targetCourseID
              ? currentCourseID === targetCourseID
              : currentCourseNum === targetCourseNum;
            if (matchesTarget) {
              hasDeletedMatch = true;
              return false;
            }
            return true;
          },
        ),
      };
    });
    try {
      const nextPlannerRoot =
        await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
      });
      this.props.serverReply?.("Course deleted.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to delete course."),
      );
    }
  };
  editHomeLectureInfoEntry = (lectureEntry = {}) => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const courseRows = this.getPlannerMaterialMetadataCourseRows(plannerRoot);
    const matchingCourseRow = courseRows.find(
      (row) =>
        this.getPlannerCourseSchemaID(row) === this.getPlannerCourseSchemaID(lectureEntry) &&
        this.getPlannerSubIntervalSchemaID(row) === this.getPlannerSubIntervalSchemaID(lectureEntry) &&
        this.getPlannerComponentSchemaID(row) === this.getPlannerComponentSchemaID(lectureEntry),
    );
    this.setState({
      homeCoursesEditorOpen: true,
      homeMaterialMetadataMode: "lectures",
      homeCourseEditingKey: String(lectureEntry?.key || "").trim(),
      homeCourseOriginalIntervalId: String(lectureEntry?.subIntervalId || "").trim(),
      homeCourseOriginalCourseNum: String(lectureEntry?.courseNum || "").trim(),
      homeCourseOriginalComponentClass: String(lectureEntry?.courseComponent || "").trim(),
      homeCourseOriginalLectureNum: String(lectureEntry?.lectureNum || "").trim(),
      homeCourseLectureCourseContextDraft: matchingCourseRow?.key || this.getPlannerCourseSchemaID(lectureEntry),
      homeCourseLectureCourseNameDraft: String(lectureEntry?.courseName || "").trim(),
      homeCourseLectureNameDraft: String(lectureEntry?.lectureName || "").trim(),
      homeCourseLectureInstructorsDraft: String(lectureEntry?.lectureInstructor || "").trim(),
      homeCourseLectureDraftList: [],
    });
  };
  deleteHomeLectureInfoEntry = async (lectureEntry = {}) => {
    const targetSubIntervalId = this.getPlannerSubIntervalSchemaID(lectureEntry);
    const targetCourseNum =
      Number.parseInt(String(lectureEntry?.courseNum || "").trim(), 10) || null;
    const targetComponentID = this.getPlannerComponentSchemaID(lectureEntry);
    const targetLectureNum =
      Number.parseInt(String(lectureEntry?.lectureNum || "").trim(), 10) || null;
    if (
      !targetSubIntervalId ||
      !Number.isInteger(targetCourseNum) ||
      !targetComponentID ||
      !Number.isInteger(targetLectureNum)
    ) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentSubIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
      const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      if (currentSubIntervalId !== targetSubIntervalId) {
        return {
          ...intervalEntry,
          intervalCourses: currentIntervalCourses,
          subIntervalCourses: currentIntervalCourses,
        };
      }
      const nextIntervalCourses = currentIntervalCourses.map((courseEntry, courseIndex) => {
        const currentCourseNum =
          Number.parseInt(String(courseEntry?.courseNum || "").trim(), 10) ||
          courseIndex + 1;
        if (currentCourseNum !== targetCourseNum) {
          return courseEntry;
        }
        const currentCourseComponents = Array.isArray(courseEntry?.courseComponents)
          ? courseEntry.courseComponents
          : [];
        const nextCourseComponents = currentCourseComponents.map((componentEntry) => {
          const componentClass = String(
            this.getPlannerComponentSchemaID(componentEntry),
          ).trim();
          if (componentClass !== targetComponentID) {
            return componentEntry;
          }
          const currentExams = Array.isArray(componentEntry?.componentExams)
            ? componentEntry.componentExams
            : [];
          const nextExams = currentExams.map((exam) => ({
            ...exam,
            examsLectures: (Array.isArray(exam?.examsLectures) ? exam.examsLectures : []).filter(
              (lec) =>
                Number.parseInt(String(lec?.lectureNum || "").trim(), 10) !== targetLectureNum,
            ),
          }));
          return {
            ...componentEntry,
            componentExams: nextExams,
          };
        });
        return { ...courseEntry, courseComponents: nextCourseComponents };
      });
      return {
        ...intervalEntry,
        intervalCourses: nextIntervalCourses,
        subIntervalCourses: nextIntervalCourses,
      };
    });
    try {
      const nextPlannerRoot =
        await this.persistStudyPlannerIntervals(nextIntervals);
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
      });
      this.props.serverReply?.("Lecture deleted.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to delete lecture."),
      );
    }
  };
  savedCourseComponentDraftFieldNames = [
    "component_status",
    "normativeCourseYearNum",
    "normativeCourseYearInterval",
    "normativeCourseTerm",
    "actualCourseYearNum",
    "actualCourseYearInterval",
    "actualCourseTerm",
    "course_class",
    "course_classSelection",
    "course_dayAndTime",
    "course_daySelection",
    "course_timeSelection",
    "course_grade",
    "course_locationBuilding",
    "course_locationRoom",
  ];
  getResetSavedCourseComponentDraftFields = (draft = {}) => ({
    ...draft,
    component_status: "-",
    normativeCourseYearNum: "",
    normativeCourseYearInterval: "",
    normativeCourseTerm: "",
    course_class: "",
    course_classSelection: "",
    course_dayAndTime: "",
    course_daySelection: "",
    course_timeSelection: "",
    course_grade: "",
    course_locationBuilding: "",
    course_locationRoom: "",
  });
  getSavedCourseDraftComponentEntryFromDraft = (draft) =>
    buildSavedCourseComponentEntryFromDraft({
      ...draft,
      course_class:
        String(draft?.course_classSelection || "").trim() ||
        String(draft?.course_class || "").trim(),
    });
  applySavedCourseDraftComponentEntryToDraft = (
    draft = {},
    componentEntry = null,
  ) => {
    if (!componentEntry) {
      return this.getResetSavedCourseComponentDraftFields(draft);
    }
    const location =
      componentEntry?.course_location &&
      typeof componentEntry.course_location === "object"
        ? componentEntry.course_location
        : {};
    return {
      ...draft,
      component_status: String(componentEntry?.component_status || "-").trim(),
      normativeCourseYearNum: normalizeProgramYearValue(
        componentEntry?.normativeCourseYearNum || componentEntry?.programYear,
      ),
      normativeCourseYearInterval: normalizeAcademicYearValue(
        componentEntry?.normativeCourseYearInterval,
      ),
      normativeCourseTerm: String(
        componentEntry?.normativeCourseTerm || "",
      ).trim(),
      actualCourseYearNum: normalizeProgramYearValue(
        componentEntry?.actualCourseYearNum,
      ),
      actualCourseYearInterval: normalizeAcademicYearValue(
        componentEntry?.actualCourseYearInterval || componentEntry?.course_year,
      ),
      actualCourseTerm: String(
        componentEntry?.actualCourseTerm || componentEntry?.course_term || "",
      ).trim(),
      course_class: String(componentEntry?.course_class || "").trim(),
      course_classSelection: String(componentEntry?.course_class || "").trim(),
      course_dayAndTime: formatCourseScheduleDisplay(
        componentEntry?.course_dayAndTime,
      ),
      course_daySelection: "",
      course_timeSelection: "",
      course_grade: String(componentEntry?.course_grade || "").trim(),
      course_locationBuilding: String(
        componentEntry?.course_locationBuilding || location?.building || "",
      ).trim(),
      course_locationRoom: String(
        componentEntry?.course_locationRoom || location?.room || "",
      ).trim(),
    };
  };
  getSavedCourseDraftComponentPickerOptions = (draft) => {
    const stagedComponents = Array.isArray(draft?.course_components)
      ? draft.course_components
      : [];
    return stagedComponents.map((entry, entryIndex) => ({
      value: String(entryIndex),
      label: buildCourseComponentPickerLabel({
        course_name: draft?.course_name,
        course_code: draft?.course_code,
        course_class: entry?.course_class,
      }),
    }));
  };
  selectSavedCourseDraftComponent = (nextValue) => {
    const normalizedValue = String(nextValue || "").trim();
    if (!normalizedValue) {
      this.setState((previousState) => ({
        savedCourseComponentDraftActive: true,
        selectedSavedCourseDraftComponentIndex: -1,
        savedCourseDraft: this.getResetSavedCourseComponentDraftFields(
          previousState.savedCourseDraft,
        ),
      }));
      return;
    }
    const entryIndex = Number(normalizedValue);
    if (!Number.isInteger(entryIndex) || entryIndex < 0) {
      return;
    }
    this.setState((previousState) => {
      const stagedComponents = Array.isArray(
        previousState.savedCourseDraft?.course_components,
      )
        ? previousState.savedCourseDraft.course_components
        : [];
      const componentEntry = stagedComponents[entryIndex] || null;
      if (!componentEntry) {
        return null;
      }
      return {
        selectedSavedCourseDraftComponentIndex: entryIndex,
        savedCourseComponentDraftActive: false,
        savedCourseDraft: this.applySavedCourseDraftComponentEntryToDraft(
          previousState.savedCourseDraft,
          componentEntry,
        ),
      };
    });
  };
  handleWrapperTabChange = (tab) => {
    const nextWrapperTab =
      tab === "home"
        ? "home"
        : tab === "settings"
          ? "settings"
          : tab === "ai"
            ? "ai"
            : tab === "traces"
              ? "traces"
              : tab === "plan"
                ? "plan"
              : tab === "exams"
                ? "exams"
                : tab === "lectures"
                  ? "lectures"
                  : tab === "courses"
                    ? "courses"
                    : "home";
    this.setState((previousState) => ({
      wrapperTab: nextWrapperTab,
      plannerTab: nextWrapperTab,
      plannerSettingsVisible: nextWrapperTab === "settings",
      lastNonSettingsWrapperTab:
        nextWrapperTab === "settings"
          ? String(previousState?.lastNonSettingsWrapperTab || "home").trim() ||
            "home"
          : nextWrapperTab,
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      inlineCourseRowVisible: false,
      inlineCourseDraft: getDefaultInlineCourseDraft(),
      inlineComponentRowVisible: false,
      inlineComponentDraft: getDefaultInlineComponentDraft(),
    }));
    if (nextWrapperTab === "home") {
      this.loadHomePlannerData().catch(() => {});
    }
  };
  handleTabChange = (tab) => {
    this.setState({
      plannerTab: tab,
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      inlineCourseRowVisible: false,
      inlineCourseDraft: getDefaultInlineCourseDraft(),
      inlineComponentRowVisible: false,
      inlineComponentDraft: getDefaultInlineComponentDraft(),
    });
  };
  handleTabItemClick = (id) => {
    const { plannerTab, courses, deleteSelectionMode, deleteSelectionIds } =
      this.state;
    if (deleteSelectionMode) {
      const normalizedId = String(id || "");
      const nextSelection = deleteSelectionIds.includes(normalizedId)
        ? deleteSelectionIds.filter((entry) => entry !== normalizedId)
        : [...deleteSelectionIds, normalizedId];
      this.setState({
        deleteSelectionIds: nextSelection,
      });
      return;
    }
    if (plannerTab === "courses") {
      const selectedCourse = (courses || []).find(
        (course) => String(course?._id) === String(id),
      );
      if (!selectedCourse) {
        return;
      }
      this.setState({
        selectedTabItemId: null,
        wrapperTab: "lectures",
        plannerTab: "lectures",
        selectedCourseForLecturesId: String(selectedCourse._id || ""),
        selectedCourseForLecturesName:
          buildCourseLectureMatchLabel(selectedCourse),
      });
      return;
    }
    this.setState({
      selectedTabItemId: id,
    });
  };
  getLecturesForSelectedCourse = () => {
    const { lectures, selectedCourseForLecturesName } = this.state;
    const normalizedCourseName = String(selectedCourseForLecturesName || "")
      .trim()
      .toLowerCase();
    if (!normalizedCourseName) {
      return Array.isArray(lectures) ? lectures : [];
    }
    return (Array.isArray(lectures) ? lectures : []).filter(
      (lecture) =>
        String(lecture?.lecture_course || "")
          .trim()
          .toLowerCase() === normalizedCourseName,
    );
  };
  handleMiniBarAction = () => {
    const { plannerTab } = this.state;
    if (plannerTab === "courses") {
      this.setState(
        {
          inlineCourseRowVisible: true,
          inlineCourseFormTab: "traditional",
          inlineCourseDraft: this.applyPlannerFieldDefaultsToDraft(
            "inlineCourse",
            getDefaultInlineCourseDraft(),
          ),
          inlineComponentRowVisible: false,
          inlineComponentDraft: getDefaultInlineComponentDraft(),
        },
        () => {
          this.fetchTelegramInstructorSuggestions();
          this.fetchInlineCoursePredictions();
        },
      );
      return;
    }
    this.openInlineLectureRow();
  };
  openInlineComponentRow = () => {
    this.setState({
      inlineComponentRowVisible: true,
      inlineComponentDraft: this.applyPlannerFieldDefaultsToDraft(
        "inlineComponent",
        getDefaultInlineComponentDraft(),
      ),
      inlineCourseRowVisible: false,
    });
  };
  closeInlineComponentRow = () => {
    this.setState({
      inlineComponentRowVisible: false,
      inlineComponentDraft: getDefaultInlineComponentDraft(),
    });
  };
  handleMiniBarEdit = () => {
    const {
      plannerTab,
      selectedTabItemId,
      selectedCourseForLecturesId,
      courses,
    } = this.state;
    const targetId = selectedTabItemId || selectedCourseForLecturesId;
    if (!targetId) {
      return;
    }
    if (plannerTab === "courses") {
      const selectedCourse = (courses || []).find(
        (course) => String(course?._id) === String(targetId),
      );
      if (!selectedCourse) {
        return;
      }
      this.openAddCourseForm({
        buttonName: "Edit",
        course: selectedCourse,
      });
      return;
    }
    const selectedLecture = this.getSelectedTabItem();
    if (!selectedLecture) {
      return;
    }
    this.openAddLectureForm({
      ...selectedLecture,
      buttonName: "Edit",
    });
  };
  deleteCoursesByIds = async (courseIds = []) => {
    const normalizedIds = courseIds
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    for (let index = 0; index < normalizedIds.length; index += 1) {
      const targetCourseId = normalizedIds[index];
      const url =
        apiUrl("/api/user/deleteCourse/") +
        this.props.state.my_id +
        "/" +
        targetCourseId;
      const options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      const request = new Request(url, options);
      await fetch(request);
    }
    this.setState(
      {
        selectedTabItemId: null,
        selectedCourseForLecturesId: "",
        selectedCourseForLecturesName: "",
      },
      () => {
        this.retrieveCourses();
      },
    );
  };
  deleteLecturesByIds = async (lectureIds = []) => {
    checkedLectures = lectureIds
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    await this.deleteLecture();
  };
  handleMiniBarDelete = async () => {
    const { plannerTab, deleteSelectionMode, deleteSelectionIds } = this.state;
    if (!deleteSelectionMode) {
      this.setState({
        deleteSelectionMode: true,
        deleteSelectionIds: [],
        selectedTabItemId: null,
      });
      return;
    }
    if (deleteSelectionIds.length === 0) {
      this.setState({
        deleteSelectionMode: false,
        deleteSelectionIds: [],
      });
      return;
    }
    if (plannerTab === "courses") {
      await this.deleteCoursesByIds(deleteSelectionIds);
    } else {
      await this.deleteLecturesByIds(deleteSelectionIds);
    }
    this.setState({
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
    });
  };
  handleBackToCoursesTab = () => {
    const { selectedCourseForLecturesId } = this.state;
    this.setState({
      wrapperTab: "courses",
      plannerTab: "courses",
      selectedTabItemId: null,
      selectedSavedCourseIds: selectedCourseForLecturesId
        ? [String(selectedCourseForLecturesId)]
        : [],
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
      deleteSelectionMode: false,
      deleteSelectionIds: [],
    });
  };
  openSelectedSavedCourseLectures = () => {
    const selectedCourseId = String(
      this.state?.selectedCourseForLecturesId || "",
    ).trim();
    if (!selectedCourseId) {
      return;
    }
    this.setState({
      wrapperTab: "lectures",
      plannerTab: "lectures",
      selectedTabItemId: null,
      deleteSelectionMode: false,
      deleteSelectionIds: [],
    });
  };
  handleInlineCourseFieldChange = (fieldName, nextValue) => {
    this.setState((previousState) => ({
      inlineCourseDraft: {
        ...previousState.inlineCourseDraft,
        [fieldName]: nextValue,
      },
    }));
  };
  handleInlineCourseMultiEntryEnter = (fieldName, event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const currentValue = String(
      this.state.inlineCourseDraft?.[fieldName] || "",
    );
    const normalizedValue = currentValue.replace(/\s*(\||\n|;)\s*$/, "").trim();
    if (!normalizedValue) {
      return;
    }
    this.handleInlineCourseFieldChange(fieldName, `${normalizedValue} | `);
  };
  appendInlineCourseDayTimeEntry = () => {
    const dayValue = String(
      this.state.inlineCourseDraft?.course_daySelection || "",
    ).trim();
    const timeValue = String(
      this.state.inlineCourseDraft?.course_timeSelection || "",
    ).trim();
    if (!dayValue || !timeValue) {
      return;
    }
    const nextEntry = `${dayValue} ${timeValue}`.trim();
    this.setState((previousState) => {
      const currentUnits = this.splitInlineCourseMultiValue(
        previousState.inlineCourseDraft?.course_dayAndTime,
      );
      return {
        inlineCourseDraft: {
          ...previousState.inlineCourseDraft,
          course_dayAndTime: [...currentUnits, nextEntry].join(" | "),
          course_daySelection: "",
          course_timeSelection: "",
        },
      };
    });
  };
  handleInlineCourseDayTimeEnter = (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.appendInlineCourseDayTimeEntry();
  };
  handleInlineComponentFieldChange = (fieldName, nextValue) => {
    this.setState((previousState) => ({
      inlineComponentDraft: {
        ...previousState.inlineComponentDraft,
        [fieldName]: nextValue,
      },
    }));
  };
  appendInlineComponentDayTimeEntry = () => {
    const dayValue = String(
      this.state.inlineComponentDraft?.course_daySelection || "",
    ).trim();
    const timeValue = String(
      this.state.inlineComponentDraft?.course_timeSelection || "",
    ).trim();
    if (!dayValue || !timeValue) {
      return;
    }
    const nextEntry = `${dayValue} ${timeValue}`.trim();
    this.setState((previousState) => {
      const currentUnits = this.splitInlineCourseMultiValue(
        previousState.inlineComponentDraft?.course_dayAndTime,
      );
      return {
        inlineComponentDraft: {
          ...previousState.inlineComponentDraft,
          course_dayAndTime: [...currentUnits, nextEntry].join(" | "),
          course_daySelection: "",
          course_timeSelection: "",
        },
      };
    });
  };
  handleInlineComponentDayTimeEnter = (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.appendInlineComponentDayTimeEntry();
  };
  submitInlineComponentRow = async () => {
    const { selectedCourseForLecturesId, inlineComponentDraft } = this.state;
    if (!selectedCourseForLecturesId) {
      return;
    }
    const payload = {
      course_class:
        String(inlineComponentDraft?.course_class || "").trim() || "-",
      course_dayAndTime: this.splitInlineCourseMultiValue(
        inlineComponentDraft?.course_dayAndTime,
      ),
      course_year: normalizeAcademicYearValue(
        inlineComponentDraft?.course_year,
      ),
      academicYear: normalizeAcademicYearValue(
        inlineComponentDraft?.course_year,
      ),
      course_term: String(inlineComponentDraft?.course_term || "").trim(),
      term: String(inlineComponentDraft?.course_term || "").trim(),
      course_grade: String(inlineComponentDraft?.course_grade || "").trim(),
      course_locationBuilding: String(
        inlineComponentDraft?.course_locationBuilding || "",
      ).trim(),
      course_locationRoom: String(
        inlineComponentDraft?.course_locationRoom || "",
      ).trim(),
      course_exams: [],
    };
    const url =
      apiUrl("/api/user/addComponent/") +
      this.props.state.my_id +
      "/" +
      selectedCourseForLecturesId;
    const req = new Request(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const response = await fetch(req);
    if (response.status === 201) {
      this.commitPlannerPendingInputMemory();
      this.closeInlineComponentRow();
      this.retrieveCourses(selectedCourseForLecturesId);
      this.retrieveLectures();
      return;
    }
  };
  fetchTelegramInstructorSuggestions = async () => {
    if (!this.props.state?.token) {
      return;
    }
    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/instructor-suggestions?allGroups=true"),
        {
          method: "GET",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load instructors.");
      }
      const instructorNames = (
        Array.isArray(payload?.instructors) ? payload.instructors : []
      )
        .flatMap((entry) => {
          if (typeof entry === "string") {
            return [entry];
          }
          return [entry?.name, entry?.instructorName, entry?.value];
        })
        .map((entry) => String(entry || "").trim())
        .filter(
          (entry) => Boolean(entry) && entry !== "-" && entry !== "(pending)",
        );
      if (this.isComponentMounted) {
        this.setState({
          telegram_instructorSuggestions: Array.from(new Set(instructorNames)),
        });
      }
    } catch {
      if (this.isComponentMounted) {
        this.setState({
          telegram_instructorSuggestions: [],
        });
      }
    }
  };
  fetchInlineCoursePredictions = async () => {
    if (!this.props.state?.token) {
      return;
    }
    this.setState({
      inlineCoursePredictionsLoading: true,
      inlineCoursePredictionsError: "",
    });
    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/course-suggestions?allGroups=true"),
        {
          method: "GET",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load saved course predictions.",
        );
      }
      if (this.isComponentMounted) {
        this.setState({
          inlineCoursePredictions:
            this.sortTelegramCourseSuggestionsByConfidence(
              payload?.suggestions,
            ),
          inlineCoursePredictionsLoading: false,
          inlineCoursePredictionsError: "",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          inlineCoursePredictions: [],
          inlineCoursePredictionsLoading: false,
          inlineCoursePredictionsError:
            error?.message || "Unable to load saved course predictions.",
        });
      }
    }
  };
  applyInlinePredictionToDraft = (suggestion = {}) => {
    const payload = suggestion?.coursePayload || suggestion || {};
    const editableDraft = getEditableCourseDraft(payload);
    this.setState((previousState) => ({
      inlineCourseFormTab: "traditional",
      inlineCourseDraft: {
        ...previousState.inlineCourseDraft,
        ...previousState.inlineCourseDraft,
        course_name: editableDraft.course_name,
        course_component: editableDraft.course_component,
        course_dayAndTime: editableDraft.course_dayAndTime,
        course_class: editableDraft.course_class,
        course_grade: editableDraft.course_grade,
        course_fullGrade: editableDraft.course_fullGrade,
        course_length: editableDraft.course_length,
        course_progress: editableDraft.course_progress,
      },
    }));
  };
  closeInlineCourseRow = () => {
    this.setState({
      inlineCourseRowVisible: false,
      inlineCourseFormTab: "traditional",
      inlineCourseDraft: getDefaultInlineCourseDraft(),
    });
  };
  splitInlineCourseMultiValue = (value = "") =>
    String(value || "")
      .split(/\||\n|;/)
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  loadPlannerInputHistory = () => {
    if (typeof window === "undefined" || !window?.localStorage) {
      this.plannerInputHistory = {};
      return;
    }
    try {
      const rawValue = window.localStorage.getItem(
        this.plannerInputHistoryStorageKey,
      );
      const parsed = rawValue ? JSON.parse(rawValue) : {};
      this.plannerInputHistory =
        parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      this.plannerInputHistory = {};
    }
  };
  persistPlannerInputHistory = () => {
    if (typeof window === "undefined" || !window?.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(
        this.plannerInputHistoryStorageKey,
        JSON.stringify(this.plannerInputHistory || {}),
      );
    } catch {
      // Ignore localStorage errors.
    }
  };
  rememberPlannerInputFieldValue = (fieldKey = "", value = "") => {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const normalizedValue = String(value || "").trim();
    if (!normalizedFieldKey || !normalizedValue || normalizedValue === "-") {
      return;
    }
    const currentValues = Array.isArray(
      this.plannerInputHistory?.[normalizedFieldKey],
    )
      ? this.plannerInputHistory[normalizedFieldKey]
      : [];
    const nextValues = [
      normalizedValue,
      ...currentValues.filter((entry) => entry !== normalizedValue),
    ].slice(0, 25);
    this.plannerInputHistory = {
      ...(this.plannerInputHistory || {}),
      [normalizedFieldKey]: nextValues,
    };
  };
  rememberPlannerInputEntries = (entryMap = {}) => {
    if (!entryMap || typeof entryMap !== "object") {
      return;
    }
    Object.entries(entryMap).forEach(([fieldKey, fieldValue]) => {
      this.rememberPlannerInputFieldValue(fieldKey, fieldValue);
    });
    this.persistPlannerInputHistory();
  };
  serializePlannerInputHistoryToPredictionTool = (
    history = {},
    enabled = true,
  ) => {
    const normalizedHistory =
      history && typeof history === "object" ? history : {};
    const serializedEntries = Object.entries(normalizedHistory)
      .map(([fieldKey, values]) => ({
        tab: "nogaPlanner",
        inputFieldID: String(fieldKey || "").trim(),
        list: (Array.isArray(values) ? values : [])
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      }))
      .filter((entry) => entry.inputFieldID && entry.list.length > 0);
    return [
      {
        tab: "nogaPlanner",
        inputFieldID: this.plannerPredictionToolActivityFieldId,
        list: [enabled ? "on" : "off"],
      },
      ...serializedEntries,
    ];
  };
  deserializePredictionToolToInputHistory = (predictionTool = []) => {
    const rawEntries = Array.isArray(predictionTool) ? predictionTool : [];
    const enabledEntry = rawEntries.find(
      (entry) =>
        String(entry?.inputFieldID || "").trim() ===
        this.plannerPredictionToolActivityFieldId,
    );
    const enabled =
      String(enabledEntry?.list?.[0] || "on")
        .trim()
        .toLowerCase() !== "off";
    const history = rawEntries.reduce((accumulator, entry) => {
      const fieldKey = String(entry?.inputFieldID || "").trim();
      if (!fieldKey || fieldKey === this.plannerPredictionToolActivityFieldId) {
        return accumulator;
      }
      const values = (Array.isArray(entry?.list) ? entry.list : [])
        .map((item) => String(item || "").trim())
        .filter((item) => item && item !== "-");
      if (values.length === 0) {
        return accumulator;
      }
      const currentValues = Array.isArray(accumulator[fieldKey])
        ? accumulator[fieldKey]
        : [];
      accumulator[fieldKey] = [
        ...currentValues,
        ...values.filter((item) => !currentValues.includes(item)),
      ].slice(0, 25);
      return accumulator;
    }, {});
    return { enabled, history };
  };
  schedulePlannerPredictionToolSync = () => {
    if (this.plannerPredictionToolSyncTimeout) {
      clearTimeout(this.plannerPredictionToolSyncTimeout);
      this.plannerPredictionToolSyncTimeout = null;
    }
    this.plannerPredictionToolSyncTimeout = setTimeout(async () => {
      const userId = String(this.props.state?.my_id || "").trim();
      const token = String(this.props.state?.token || "").trim();
      if (!userId || !token) {
        return;
      }
      try {
        const previousSettings = normalizePlannerSelectSettings(
          this.state?.plannerSelectSettings,
        );
        const nextSettings = {
          ...previousSettings,
          predictionTool: this.serializePlannerInputHistoryToPredictionTool(
            this.plannerInputHistory,
            Boolean(this.state?.plannerSettingsPredictionToolEnabled),
          ),
        };
        const persistedResult =
          await this.persistPlannerSelectSettings(nextSettings);
        const persistedSettings = normalizePlannerSelectSettings(
          persistedResult?.settings || nextSettings,
        );
        if (!this.isComponentMounted) {
          return;
        }
        this.setState({
          plannerSelectSettings: persistedSettings,
        });
      } catch (error) {
        console.error("[prediction-tool] settings sync failed:", error);
      }
    }, 300);
  };
  isPlannerInputPredictionEligible = (inputElement) => {
    if (!Boolean(this.state?.plannerSettingsPredictionToolEnabled)) {
      return false;
    }
    if (!inputElement || inputElement.tagName !== "INPUT") {
      return false;
    }
    const inputType = String(inputElement.type || "text").toLowerCase();
    if (
      [
        "checkbox",
        "radio",
        "file",
        "hidden",
        "button",
        "submit",
        "reset",
        "image",
        "password",
      ].includes(inputType)
    ) {
      return false;
    }
    if (inputElement.disabled || inputElement.readOnly) {
      return false;
    }
    return true;
  };
  getPlannerInputPredictionFieldKey = (inputElement) => {
    const fromData = String(inputElement?.dataset?.memoryField || "").trim();
    if (fromData) {
      return fromData;
    }
    const inputId = String(inputElement?.id || "").trim();
    if (!inputId) {
      return "";
    }
    const knownPrefixes = [
      "nogaPlanner_savedCourseInput_",
      "nogaPlanner_inlineCourseInput_",
      "nogaPlanner_inlineLectureInput_",
      "nogaPlanner_addLecture_",
      "nogaPlanner_examInput_",
      "nogaPlanner_settingsInput_",
    ];
    const matchedPrefix = knownPrefixes.find((prefix) =>
      inputId.startsWith(prefix),
    );
    if (matchedPrefix) {
      return inputId.slice(matchedPrefix.length);
    }
    return inputId;
  };
  refreshPlannerInputPredictionOptions = (inputElement) => {
    if (!this.isPlannerInputPredictionEligible(inputElement)) {
      return;
    }
    this.disablePlannerInputNativeSuggestions(inputElement);
    if (inputElement.hasAttribute("list")) {
      inputElement.removeAttribute("list");
    }
  };
  disablePlannerInputNativeSuggestions = (inputElement) => {
    if (!inputElement || inputElement.tagName !== "INPUT") {
      return;
    }
    inputElement.setAttribute("autocomplete", "off");
    inputElement.setAttribute("autocorrect", "off");
    inputElement.setAttribute("autocapitalize", "off");
    inputElement.setAttribute("spellcheck", "false");
    if (!String(inputElement.getAttribute("name") || "").trim()) {
      const memoryField = String(
        this.getPlannerInputPredictionFieldKey(inputElement) || "",
      ).trim();
      if (memoryField) {
        inputElement.setAttribute("name", `noga_no_autofill_${memoryField}`);
      }
    }
  };
  applyPlannerInlinePrediction = (inputElement, latestTypedChunk = "") => {
    if (!this.isPlannerInputPredictionEligible(inputElement)) {
      return;
    }
    const fieldKey = this.getPlannerInputPredictionFieldKey(inputElement);
    if (!fieldKey) {
      return;
    }
    const rawValue = String(inputElement.value || "");
    const caretStart = Number(inputElement.selectionStart);
    const caretEnd = Number(inputElement.selectionEnd);
    if (!Number.isFinite(caretStart) || !Number.isFinite(caretEnd)) {
      return;
    }
    if (caretStart !== caretEnd) {
      return;
    }
    if (caretStart !== rawValue.length || caretEnd !== rawValue.length) {
      return;
    }
    const beforeCaret = rawValue.slice(0, caretStart);
    const tokenStart = (() => {
      for (let index = beforeCaret.length - 1; index >= 0; index -= 1) {
        if (/\s/.test(beforeCaret[index])) {
          return index + 1;
        }
      }
      return 0;
    })();
    const sentenceContext = beforeCaret.slice(0, tokenStart);
    const tokenPrefix = beforeCaret.slice(tokenStart);
    const normalizedTokenPrefix = tokenPrefix.trim().toLowerCase();
    if (!normalizedTokenPrefix || normalizedTokenPrefix === "-") {
      return;
    }
    const normalizedLatestTypedChunk = String(latestTypedChunk || "")
      .trim()
      .toLowerCase();
    const options = this.getPlannerInputPredictions(
      fieldKey,
      normalizedTokenPrefix,
    );
    const normalizedSentenceContext = sentenceContext.toLowerCase();
    let bestWordMatch = "";

    // First pass: respect sentence context before the current token.
    for (const optionEntry of options) {
      const optionText = String(optionEntry || "");
      const optionLower = optionText.toLowerCase();
      if (
        normalizedSentenceContext &&
        !optionLower.startsWith(normalizedSentenceContext)
      ) {
        continue;
      }
      const optionContextWordStart = (() => {
        const contextLength = sentenceContext.length;
        for (let index = contextLength - 1; index >= 0; index -= 1) {
          if (/\s/.test(optionText[index])) {
            return index + 1;
          }
        }
        return 0;
      })();
      const optionRemaining = optionText.slice(optionContextWordStart);
      const nextWord = String(optionRemaining || "")
        .split(/\s+/)
        .map((word) => String(word || "").trim())
        .find((word) => word.toLowerCase().startsWith(normalizedTokenPrefix));
      if (nextWord) {
        bestWordMatch = nextWord;
        break;
      }
    }

    // Fallback pass: token-only match when strict context match is unavailable.
    if (!bestWordMatch) {
      for (const optionEntry of options) {
        const words = String(optionEntry || "")
          .split(/\s+/)
          .map((word) => String(word || "").trim())
          .filter(Boolean);
        const matchedWord = words.find((word) =>
          word.toLowerCase().startsWith(normalizedTokenPrefix),
        );
        if (matchedWord) {
          bestWordMatch = matchedWord;
          break;
        }
      }
    }
    if (!bestWordMatch) {
      return;
    }
    if (bestWordMatch.toLowerCase() === normalizedTokenPrefix) {
      return;
    }
    if (normalizedLatestTypedChunk) {
      const expectedIndex =
        normalizedTokenPrefix.length - normalizedLatestTypedChunk.length;
      if (expectedIndex >= 0) {
        const expectedChunk = bestWordMatch
          .slice(
            expectedIndex,
            expectedIndex + normalizedLatestTypedChunk.length,
          )
          .toLowerCase();
        if (expectedChunk !== normalizedLatestTypedChunk) {
          return;
        }
      }
    }
    const nextValue =
      rawValue.slice(0, tokenStart) + bestWordMatch + rawValue.slice(caretEnd);
    this.plannerInlinePredictionMutating = true;
    this.setPlannerInputValue(inputElement, nextValue, {
      dispatchInput: true,
      inputType: "insertReplacementText",
      data: bestWordMatch,
    });
    this.plannerInlinePredictionMutating = false;
    try {
      inputElement.setSelectionRange(
        tokenStart + tokenPrefix.length,
        tokenStart + bestWordMatch.length,
      );
    } catch {
      // Ignore selection errors on unsupported inputs.
    }
  };
  capturePlannerPendingInputValue = (inputElement) => {
    if (!this.isPlannerInputPredictionEligible(inputElement)) {
      return;
    }
    const fieldKey = this.getPlannerInputPredictionFieldKey(inputElement);
    const fieldValue = String(inputElement.value || "").trim();
    if (!fieldKey || !fieldValue || fieldValue === "-") {
      return;
    }
    this.plannerPendingInputHistory = {
      ...(this.plannerPendingInputHistory || {}),
      [fieldKey]: fieldValue,
    };
  };
  handlePlannerInputPredictionFocus = (event) => {
    const targetInput = event?.target;
    if (!this.isPlannerInputPredictionEligible(targetInput)) {
      return;
    }
    this.disablePlannerInputNativeSuggestions(targetInput);
    this.refreshPlannerInputPredictionOptions(targetInput);
  };
  handlePlannerInputPredictionInput = (event) => {
    if (this.plannerInlinePredictionMutating) {
      return;
    }
    const targetInput = event?.target;
    if (!this.isPlannerInputPredictionEligible(targetInput)) {
      return;
    }
    const sourceEvent =
      event && typeof event === "object" && event.nativeEvent
        ? event.nativeEvent
        : event;
    const inputType = String(sourceEvent?.inputType || "");
    const isInsertEvent = inputType.startsWith("insert");
    const typedChunk =
      isInsertEvent && typeof sourceEvent?.data === "string"
        ? sourceEvent.data
        : "";
    if (isInsertEvent) {
      this.applyPlannerInlinePrediction(targetInput, typedChunk);
    }
    this.capturePlannerPendingInputValue(targetInput);
    this.refreshPlannerInputPredictionOptions(targetInput);
  };
  commitPlannerPendingInputMemory = () => {
    if (!Boolean(this.state?.plannerSettingsPredictionToolEnabled)) {
      this.plannerPendingInputHistory = {};
      return;
    }
    const pendingEntries =
      this.plannerPendingInputHistory &&
      typeof this.plannerPendingInputHistory === "object"
        ? this.plannerPendingInputHistory
        : {};
    if (Object.keys(pendingEntries).length === 0) {
      return;
    }
    this.rememberPlannerInputEntries(pendingEntries);
    this.plannerPendingInputHistory = {};
    const predictionPayloadEntries = Object.entries(pendingEntries)
      .map(([inputFieldID, value]) => ({
        tab: "nogaPlanner",
        inputFieldID: String(inputFieldID || "").trim(),
        value: String(value || "").trim(),
      }))
      .filter((entry) => entry.inputFieldID && entry.value);
    this.persistPlannerPredictionToolInputs(predictionPayloadEntries)
      .then((result) => {
        if (!this.isComponentMounted) {
          return;
        }
        const persistedSettings = normalizePlannerSelectSettings(
          result?.settings || this.state?.plannerSelectSettings,
        );
        this.setState({
          plannerSelectSettings: persistedSettings,
        });
      })
      .catch((error) => {
        console.error("[prediction-tool] incremental save failed:", error);
      });
  };
  getPlannerInputPredictions = (fieldKey = "", query = "") => {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const normalizedQuery = String(query || "")
      .trim()
      .toLowerCase();
    const options = Array.isArray(
      this.plannerInputHistory?.[normalizedFieldKey],
    )
      ? this.plannerInputHistory[normalizedFieldKey]
      : [];
    if (!normalizedQuery) {
      return options.slice(0, 10);
    }
    return options
      .filter((entry) =>
        String(entry || "")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 10);
  };
  submitInlineCourseRow = async () => {
    const { inlineCourseDraft } = this.state;
    const trimmedName = String(inlineCourseDraft?.course_name || "").trim();
    if (!trimmedName) {
      this.props.serverReply(
        NOGAPLANNER_TEXT.messages.submitCourseNameRequired,
      );
      return;
    }
    const payload = {
      course_code: String(inlineCourseDraft?.course_code || "").trim(),
      course_name: trimmedName,
      course_year: normalizeAcademicYearValue(inlineCourseDraft?.course_year),
      academicYear: normalizeAcademicYearValue(inlineCourseDraft?.course_year),
      course_term: String(inlineCourseDraft?.course_term || "").trim(),
      term: String(inlineCourseDraft?.course_term || "").trim(),
    };
    const url = apiUrl("/api/user/addCourse/") + this.props.state.my_id;
    const req = new Request(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const response = await fetch(req);
    if (response.status === 201) {
      this.commitPlannerPendingInputMemory();
      this.rememberPlannerInputEntries({
        course_name: payload.course_name,
        course_code: payload.course_code,
      });
      this.closeInlineCourseRow();
      this.retrieveCourses();
      return;
    }
    this.props.serverReply(NOGAPLANNER_TEXT.messages.submitCourseNameRequired);
  };
  getSelectedTabItem = () => {
    const { plannerTab, selectedTabItemId, courses } = this.state;
    if (plannerTab === "courses") {
      return (
        (courses || []).find(
          (c) => String(c._id) === String(selectedTabItemId),
        ) || null
      );
    } else {
      return (
        this.getLecturesForSelectedCourse().find(
          (l) => String(l._id) === String(selectedTabItemId),
        ) || null
      );
    }
  };
  getVisibleCourseComponents = () => {
    const courseEntries = Array.isArray(this.state?.courses)
      ? this.state.courses
      : [];
    return courseEntries;
  };
  handleSavedCourseGroupClick = (course = {}, courseGroup = []) => {
    const componentId = String(course?._id || "").trim();
    const groupComponentIds = Array.isArray(courseGroup)
      ? courseGroup
          .map((entry) => String(entry?._id || "").trim())
          .filter(Boolean)
      : [];
    const effectiveGroupIds =
      groupComponentIds.length > 0 ? groupComponentIds : [componentId];
    const lectureCourseLabel = buildCourseLectureMatchLabel(course);
    if (!componentId) {
      return;
    }
    this.setState((previousState) => {
      if (!previousState?.savedCourseSelectionMode) {
        return null;
      }
      const previousSelectedIds = Array.isArray(
        previousState?.selectedSavedCourseIds,
      )
        ? previousState.selectedSavedCourseIds
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        : [];
      const isGroupFullySelected = effectiveGroupIds.every((entryId) =>
        previousSelectedIds.includes(entryId),
      );
      if (isGroupFullySelected) {
        const nextSelectedIds = previousSelectedIds.filter(
          (entry) => !effectiveGroupIds.includes(entry),
        );
        const nextActiveId =
          String(previousState?.selectedCourseForLecturesId || "").trim() ===
          componentId
            ? nextSelectedIds[nextSelectedIds.length - 1] || ""
            : String(previousState?.selectedCourseForLecturesId || "").trim();
        const nextActiveCourse = nextActiveId
          ? (Array.isArray(previousState?.courses)
              ? previousState.courses
              : []
            ).find(
              (entry) => String(entry?._id || "").trim() === nextActiveId,
            ) || null
          : null;
        return {
          plannerTab: "courses",
          selectedTabItemId: null,
          selectedSavedCourseIds: nextSelectedIds,
          selectedCourseForLecturesId: nextActiveId,
          selectedCourseForLecturesName: nextActiveCourse
            ? buildCourseLectureMatchLabel(nextActiveCourse)
            : "",
          savedCourseDetailsComponentId:
            String(
              previousState?.savedCourseDetailsComponentId || "",
            ).trim() === componentId
              ? ""
              : previousState?.savedCourseDetailsComponentId || "",
          deleteSelectionMode: false,
          deleteSelectionIds: [],
        };
      }
      return {
        plannerTab: "courses",
        selectedTabItemId: null,
        selectedSavedCourseIds: Array.from(
          new Set([...previousSelectedIds, ...effectiveGroupIds]),
        ),
        selectedCourseForLecturesId:
          previousState?.selectedCourseForLecturesId || componentId,
        selectedCourseForLecturesName:
          previousState?.selectedCourseForLecturesName || lectureCourseLabel,
        savedCourseDetailsComponentId: "",
        deleteSelectionMode: false,
        deleteSelectionIds: [],
      };
    });
  };
  enableSavedCourseSelectionMode = () => {
    this.setState((previousState) => {
      const nextSelectionMode = !previousState.savedCourseSelectionMode;
      return nextSelectionMode
        ? {
            savedCourseSelectionMode: true,
          }
        : {
            savedCourseSelectionMode: false,
            selectedSavedCourseIds: [],
            selectedCourseForLecturesId: "",
            selectedCourseForLecturesName: "",
            selectedTabItemId: null,
            savedCourseDetailsComponentId: "",
            deleteSelectionMode: false,
            deleteSelectionIds: [],
          };
    });
  };
  clearSavedCourseSelection = () => {
    this.setState({
      savedCourseSelectionMode: false,
      selectedSavedCourseIds: [],
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      selectedTabItemId: null,
      savedCourseDetailsComponentId: "",
      deleteSelectionMode: false,
      deleteSelectionIds: [],
    });
  };
  clearLectureSelection = () => {
    this.setState({
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
    });
  };
  toggleLectureSelectionMode = () => {
    this.setState((previousState) => ({
      deleteSelectionMode: !previousState.deleteSelectionMode,
      deleteSelectionIds: [],
      selectedTabItemId: null,
    }));
  };
  deleteSelectedLectures = async () => {
    const selectedLectureIds = (
      Array.isArray(this.state?.deleteSelectionIds)
        ? this.state.deleteSelectionIds
        : []
    )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (selectedLectureIds.length === 0) {
      return;
    }
    await this.deleteLecturesByIds(selectedLectureIds);
    this.setState({
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
    });
  };
  deleteAllVisibleLectures = async () => {
    const allVisibleLectureIds = (this.getLecturesForSelectedCourse() || [])
      .map((entry) => String(entry?._id || "").trim())
      .filter(Boolean);
    if (allVisibleLectureIds.length === 0) {
      return;
    }
    await this.deleteLecturesByIds(allVisibleLectureIds);
    this.setState({
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
    });
  };
  openSavedCourseComponentDetails = (course = {}) => {
    const componentId = String(course?._id || "").trim();
    if (!componentId) {
      return;
    }
    this.setState((previousState) => ({
      savedCourseDetailsComponentId:
        String(previousState?.savedCourseDetailsComponentId || "").trim() ===
        componentId
          ? ""
          : componentId,
    }));
  };
  closeSavedCourseComponentDetails = () => {
    this.setState({
      savedCourseDetailsComponentId: "",
    });
  };
  persistPlannerSelectSettings = async (settings) => {
    const userId = String(this.props.state?.my_id || "").trim();
    const token = String(this.props.state?.token || "").trim();
    if (!userId || !token) {
      throw new Error("Missing auth context for planner settings save.");
    }
    const response = await fetch(
      apiUrl("/api/user/studyOrganizer/settings/") + userId,
      {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendMessage = String(payload?.message || "").trim();
      throw new Error(
        backendMessage || `Planner settings save failed: ${response.status}`,
      );
    }
    return {
      settings: payload?.settings || settings,
      message: String(payload?.message || "").trim(),
    };
  };
  persistPlannerSettingsPatch = async (settingsPatch = {}) => {
    const userId = String(this.props.state?.my_id || "").trim();
    const token = String(this.props.state?.token || "").trim();
    if (!userId || !token) {
      throw new Error("Missing auth context for planner settings save.");
    }
    const response = await fetch(
      apiUrl("/api/user/studyOrganizer/settings/") + userId,
      {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settingsPatch,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendMessage = String(payload?.message || "").trim();
      throw new Error(
        backendMessage ||
          `Planner settings patch save failed: ${response.status}`,
      );
    }
    return {
      settings: payload?.settings || this.state?.plannerSelectSettings || {},
      message: String(payload?.message || "").trim(),
    };
  };
  persistPlannerFieldDefaults = async (fieldDefaults = {}) => {
    const userId = String(this.props.state?.my_id || "").trim();
    const token = String(this.props.state?.token || "").trim();
    if (!userId || !token) {
      throw new Error("Missing auth context for planner defaults save.");
    }
    const normalizedFieldDefaultsEntries = Object.entries(
      fieldDefaults && typeof fieldDefaults === "object" ? fieldDefaults : {},
    )
      .map(([fieldKey, value]) => ({
        fieldKey: String(fieldKey || "").trim(),
        value: String(value ?? "").trim(),
      }))
      .filter((entry) => Boolean(entry.fieldKey));
    const response = await fetch(
      apiUrl("/api/user/studyOrganizer/settings/defaults/") + userId,
      {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldDefaults: normalizedFieldDefaultsEntries,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendMessage = String(payload?.message || "").trim();
      throw new Error(
        backendMessage || `Planner defaults save failed: ${response.status}`,
      );
    }
    return {
      settings: payload?.settings || this.state?.plannerSelectSettings || {},
      fieldDefaults: Array.isArray(payload?.fieldDefaults)
        ? Object.fromEntries(
            payload.fieldDefaults
              .map((entry) => [
                String(entry?.fieldKey || "").trim(),
                String(entry?.value || "").trim(),
              ])
              .filter(([fieldKey]) => Boolean(fieldKey)),
          )
        : payload?.fieldDefaults && typeof payload.fieldDefaults === "object"
          ? payload.fieldDefaults
          : {},
      message: String(payload?.message || "").trim(),
    };
  };
  persistPlannerPredictionToolInputs = async (entries = []) => {
    const userId = String(this.props.state?.my_id || "").trim();
    const token = String(this.props.state?.token || "").trim();
    if (!userId || !token) {
      throw new Error("Missing auth context for planner prediction save.");
    }
    const normalizedEntries = (Array.isArray(entries) ? entries : [])
      .map((entry) => ({
        tab: String(entry?.tab || "").trim(),
        inputFieldID: String(entry?.inputFieldID || "").trim(),
        value: String(entry?.value || "").trim(),
      }))
      .filter(
        (entry) =>
          Boolean(entry.tab) &&
          Boolean(entry.inputFieldID) &&
          Boolean(entry.value) &&
          entry.value !== "-",
      );
    if (normalizedEntries.length === 0) {
      return null;
    }
    const response = await fetch(
      apiUrl("/api/user/studyOrganizer/settings/") + userId,
      {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          predictionToolInputs: normalizedEntries,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendMessage = String(payload?.message || "").trim();
      throw new Error(
        backendMessage || `Prediction tool save failed: ${response.status}`,
      );
    }
    return {
      settings: payload?.settings || null,
      message: String(payload?.message || "").trim(),
    };
  };
  loadPlannerSelectSettings = async () => {
    const userId = String(this.props.state?.my_id || "").trim();
    const token = String(this.props.state?.token || "").trim();
    if (!userId || !token) {
      return;
    }
    try {
      const response = await fetch(apiUrl("/api/user/update/" + userId), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      const nextSettings = normalizePlannerSelectSettings(
        payload?.memory?.studyPlanner?.studyOrganizer?.settings || {},
      );
      const dbPredictionTool = this.deserializePredictionToolToInputHistory(
        nextSettings?.predictionTool,
      );
      const dbPredictionHistory = dbPredictionTool?.history || {};
      const localPredictionHistory =
        this.plannerInputHistory && typeof this.plannerInputHistory === "object"
          ? this.plannerInputHistory
          : {};
      const mergedPredictionHistory = {
        ...dbPredictionHistory,
      };
      Object.entries(localPredictionHistory).forEach(([fieldKey, values]) => {
        const normalizedValues = Array.isArray(values)
          ? values.map((entry) => String(entry || "").trim()).filter(Boolean)
          : [];
        if (normalizedValues.length === 0) {
          return;
        }
        const baseValues = Array.isArray(mergedPredictionHistory[fieldKey])
          ? mergedPredictionHistory[fieldKey]
          : [];
        mergedPredictionHistory[fieldKey] = [
          ...baseValues,
          ...normalizedValues.filter((entry) => !baseValues.includes(entry)),
        ].slice(0, 25);
      });
      this.plannerInputHistory = mergedPredictionHistory;
      this.persistPlannerInputHistory();
      this.setState({
        plannerSelectSettings: nextSettings,
        plannerSettingsDefaultSection:
          String(
            this.state?.plannerSettingsDefaultSection || "Courses",
          ).trim() || "Courses",
        plannerSettingsPredictionToolEnabled:
          typeof dbPredictionTool?.enabled === "boolean"
            ? dbPredictionTool.enabled
            : true,
        plannerSettingsSelectedPredictionFieldId: "",
        plannerSettingsSelectedPredictionTab: "",
        plannerSettingsLogoMotionEnabled:
          typeof nextSettings?.logoMotionEnabled === "boolean"
            ? nextSettings.logoMotionEnabled
            : true,
        plannerSettingsVoiceControlEnabled:
          typeof nextSettings?.voiceControlEnabled === "boolean"
            ? nextSettings.voiceControlEnabled
            : false,
        plannerSettingsVoiceDictationEnabled:
          typeof nextSettings?.voiceDictationEnabled === "boolean"
            ? nextSettings.voiceDictationEnabled
            : false,
        plannerSettingsLogoFixedClock: String(
          nextSettings?.logoFixedClock || "9",
        ).trim(),
        plannerSettingsMessageFromFriendFromId: String(
          nextSettings?.messageFriend?.from?.friendID || "",
        ).trim(),
        plannerSettingsMessageFromFriendToId: "",
        plannerSettingsMessageFromFriendToMessage: "",
        plannerSettingsMessageFromFriendSelectedToIndex: -1,
        plannerSettingsMessageFromFriendToList: Array.isArray(
          nextSettings?.messageFriend?.to,
        )
          ? nextSettings.messageFriend.to
              .map((entry) => ({
                friendID: String(entry?.friendID || "").trim(),
                message: String(entry?.message || "").trim(),
              }))
              .filter((entry) => entry.friendID && entry.message)
          : [],
        plannerSettingsVoiceCommandTab: String(
          this.state?.plannerSettingsVoiceCommandTab || "Courses",
        ).trim(),
        plannerSettingsVoiceCommandButton: "",
        plannerSettingsVoiceCommandInput: "",
        plannerSettingsVoiceDictationLetter: "",
        plannerSettingsVoiceDictationNormalizedLetter: "",
        plannerSettingsVoiceDictationCondition: "endOfWord",
        plannerSettingsSelectedVoiceDictationNormalizationIndex: -1,
        plannerSettingsSelectedVoiceCommandIndex: -1,
        plannerSettingsEditingVoiceCommandIndex: -1,
      });
    } catch (error) {
      console.error("[planner-select-settings] db read failed:", error);
    }
  };
  getPlannerRelationshipForClass = (settings, draft = {}) => {
    const relationships = Array.isArray(settings?.relationships)
      ? settings.relationships
      : [];
    const match = relationships.find((entry) => {
      if (String(entry?.relationScope || "").trim() !== "innerComponent") {
        return false;
      }
      const causeField = String(entry?.causeField || "").trim();
      const causeValue = String(entry?.causeValue || "").trim();
      if (!causeField || !causeValue) {
        return false;
      }
      return String(draft?.[causeField] || "").trim() === causeValue;
    });
    return match || null;
  };
  applyPlannerRelationshipToSavedCourseDraft = (
    draft,
    relationship,
    forceRelationshipValues = true,
  ) => {
    if (!relationship) {
      return {
        ...draft,
      };
    }
    const nextDraft = {
      ...draft,
    };
    const effectField = String(relationship?.effectField || "").trim();
    const effectValue = String(relationship?.effectValue || "").trim();
    if (!effectField || !effectValue) {
      return nextDraft;
    }
    if (
      forceRelationshipValues ||
      !String(nextDraft?.[effectField] || "").trim()
    ) {
      nextDraft[effectField] = effectValue;
    }
    return nextDraft;
  };
  getPlannerProfileAcademicYear = () =>
    normalizeAcademicYearValue(
      this.props.state?.profile?.studying?.time?.currentAcademicYear ??
        this.props.state?.profile?.studying?.currentAcademicYear,
    ) || "";
  readPlannerAcademicIntervalCandidate = (value) => {
    if (!value) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return String(
        value.interval ||
          value.programYearInterval ||
          value.currentAcademicYear ||
          value.year ||
          "",
      ).trim();
    }
    return "";
  };
  getPlannerCurrentAcademicYearIntervalRaw = () => {
    const candidates = [
      this.props.state?.studying?.time?.current?.programYearInterval,
      this.props.state?.studying?.time?.currentAcademicYear,
      this.props.state?.studying?.currentAcademicYear,
      this.props.state?.studying?.academicYearsIntervals?.current?.interval,
      this.props.state?.studying?.academicYearsIntervals?.current,
      this.props.state?.profile?.studying?.time?.current?.programYearInterval,
      this.props.state?.profile?.studying?.time?.currentAcademicYear,
      this.props.state?.profile?.studying?.currentAcademicYear,
      this.props.state?.profile?.studying?.academicYearsIntervals?.current
        ?.interval,
      this.props.state?.profile?.studying?.academicYearsIntervals?.current,
      this.props.state?.currentAcademicYear,
    ];
    for (const candidate of candidates) {
      const parsed = this.readPlannerAcademicIntervalCandidate(candidate);
      if (parsed) {
        return parsed;
      }
    }
    return "";
  };
  normalizePlannerYearDigits = (value = "") =>
    String(value || "")
      .replace(/[-]/g, (digit) => String("".indexOf(digit)))
      .replace(/[-]/g, (digit) => String("".indexOf(digit)));
  getPlannerCurrentAcademicYearRange = () => {
    const rawInterval = this.normalizePlannerYearDigits(
      this.getPlannerCurrentAcademicYearIntervalRaw(),
    );
    const yearMatches = rawInterval.match(/(?:19|20)\d{2}/g) || [];
    if (yearMatches.length >= 2) {
      return {
        startYear: yearMatches[0],
        endYear: yearMatches[1],
      };
    }
    if (yearMatches.length === 1) {
      return {
        startYear: yearMatches[0],
        endYear: yearMatches[0],
      };
    }
    return { startYear: "", endYear: "" };
  };
  prefillStudyPlanIntervalDraftYearsFromProfile = () => {
    const { startYear, endYear } = this.getPlannerCurrentAcademicYearRange();
    if (!startYear && !endYear) {
      return;
    }
    this.setState((previousState) => {
      const previousDraft = previousState?.studyPlanIntervalDraft || {};
      const nextStartYear = String(previousDraft?.startDateYear || "").trim();
      const nextEndYear = String(previousDraft?.endDateYear || "").trim();
      if (nextStartYear && nextEndYear) {
        return null;
      }
      return {
        studyPlanIntervalDraft: {
          ...previousDraft,
          startDateYear: nextStartYear || startYear,
          endDateYear: nextEndYear || endYear || startYear,
          startDate: this.composeStudyPlanIsoDateFromParts({
            day: previousDraft?.startDateDay,
            month: previousDraft?.startDateMonth,
            year: nextStartYear || startYear,
          }),
          endDate: this.composeStudyPlanIsoDateFromParts({
            day: previousDraft?.endDateDay,
            month: previousDraft?.endDateMonth,
            year: nextEndYear || endYear || startYear,
          }),
        },
      };
    });
  };
  resolvePlannerAcademicTermValue = (...candidates) => {
    const rawValue =
      candidates.map((value) => String(value || "").trim()).find(Boolean) || "";
    return formatAcademicTermDisplay(rawValue);
  };
  getPlannerProfileAcademicTerm = () =>
    this.resolvePlannerAcademicTermValue(
      this.props.state?.profile?.studying?.time?.current?.programTerm,
      this.props.state?.profile?.studying?.time?.currentDate?.term,
      this.props.state?.profile?.studying?.time?.currentTerm,
      this.props.state?.profile?.studying?.currentTerm,
    );
  getPlannerCurrentAcademicTerm = () =>
    this.resolvePlannerAcademicTermValue(
      this.props.state?.studying?.time?.current?.programTerm,
      this.props.state?.studying?.time?.currentDate?.term,
      this.props.state?.studying?.time?.currentTerm,
      this.props.state?.studying?.currentTerm,
      this.props.state?.profile?.studying?.time?.current?.programTerm,
      this.props.state?.profile?.studying?.time?.currentDate?.term,
      this.props.state?.profile?.studying?.time?.currentTerm,
      this.props.state?.profile?.studying?.currentTerm,
    );
  classifySavedCourseExamStatus = (value) => {
    const normalizedValue = String(value || "")
      .trim()
      .toLowerCase();
    const statusAliases = {
      passed: "Passed",
      pass: "Passed",
      success: "Passed",
      successful: "Passed",
      failed: "Failed",
      fail: "Failed",
      Passed: "Passed",
      Failed: "Failed",
    };
    return statusAliases[normalizedValue] || "";
  };
  deriveSavedCourseComponentStatus = (draft = {}) => {
    const normativeYearInterval = normalizeAcademicYearValue(
      draft?.normativeCourseYearInterval,
    );
    const normativeTerm = String(draft?.normativeCourseTerm || "").trim();
    const actualYearInterval = normalizeAcademicYearValue(
      String(draft?.actualCourseYearInterval || "").trim() ||
        (this.props.state?.studying?.time?.currentAcademicYear ??
          this.props.state?.studying?.currentAcademicYear ??
          this.props.state?.profile?.studying?.time?.currentAcademicYear ??
          this.props.state?.profile?.studying?.currentAcademicYear ??
          this.props.state?.currentAcademicYear),
    );
    const actualTerm =
      String(draft?.actualCourseTerm || "").trim() ||
      this.getPlannerCurrentAcademicTerm();
    if (
      normativeYearInterval &&
      normativeTerm &&
      actualYearInterval &&
      actualTerm &&
      normativeYearInterval === actualYearInterval &&
      normativeTerm === actualTerm
    ) {
      return "New";
    }
    const exams = Array.isArray(draft?.course_exams) ? draft.course_exams : [];
    if (exams.length === 0) {
      return "Set later";
    }
    const explicitExamStatuses = exams
      .map((exam) =>
        this.classifySavedCourseExamStatus(
          exam?.grade?.status || exam?.resultStatus || exam?.status,
        ),
      )
      .filter(Boolean);
    if (explicitExamStatuses.some((status) => status === "Failed")) {
      return "Failed";
    }
    if (explicitExamStatuses.some((status) => status === "Passed")) {
      return "Passed";
    }
    return "Set later";
  };
  buildSavedCourseDraftWithPlannerSettings = (
    baseDraft = getDefaultSavedCourseDraft(),
  ) => {
    const plannerSelectSettings = normalizePlannerSelectSettings(
      this.state?.plannerSelectSettings,
    );
    let nextDraft = this.applyPlannerFieldDefaultsToDraft(
      "savedCourse",
      {
        ...getDefaultSavedCourseDraft(),
        ...baseDraft,
      },
      plannerSelectSettings,
    );
    const profileAcademicYear = this.getPlannerProfileAcademicYear();
    const profileAcademicTerm = this.getPlannerProfileAcademicTerm();
    const currentAcademicTerm = this.getPlannerCurrentAcademicTerm();
    nextDraft.normativeCourseYearInterval = profileAcademicYear;
    nextDraft.normativeCourseTerm = profileAcademicTerm;
    if (!String(nextDraft?.actualCourseYearInterval || "").trim()) {
      nextDraft.actualCourseYearInterval = profileAcademicYear;
    }
    nextDraft.actualCourseTerm = currentAcademicTerm;
    const relationshipAppliedDraft =
      this.applyPlannerRelationshipToSavedCourseDraft(
        nextDraft,
        this.getPlannerRelationshipForClass(plannerSelectSettings, nextDraft),
        true,
      );
    return {
      ...relationshipAppliedDraft,
      course_status: this.deriveSavedCourseComponentStatus(
        relationshipAppliedDraft,
      ),
      component_status: this.deriveSavedCourseComponentStatus(
        relationshipAppliedDraft,
      ),
    };
  };
  applyPlannerFieldDefaultsToDraft = (
    formKey,
    baseDraft = {},
    plannerSelectSettings = this.state?.plannerSelectSettings,
  ) => {
    const fieldDefaults =
      plannerSelectSettings?.fieldDefaults &&
      typeof plannerSelectSettings.fieldDefaults === "object"
        ? plannerSelectSettings.fieldDefaults
        : {};
    const nextDraft = {
      ...baseDraft,
    };
    getPlannerDefaultFieldsForForm(formKey).forEach((fieldConfig) => {
      const defaultValue = String(
        fieldDefaults?.[fieldConfig.key] || "",
      ).trim();
      const currentValue = nextDraft?.[fieldConfig.fieldName];
      const hasValue = Array.isArray(currentValue)
        ? currentValue.length > 0
        : Boolean(String(currentValue || "").trim());
      if (!hasValue && defaultValue) {
        nextDraft[fieldConfig.fieldName] = defaultValue;
      }
    });
    return nextDraft;
  };
  getLockedSavedCourseDraftFields = (draft = this.state?.savedCourseDraft) => {
    const plannerSelectSettings = this.state?.plannerSelectSettings;
    const relationship = this.getPlannerRelationshipForClass(
      plannerSelectSettings,
      draft,
    );
    if (!relationship?.readOnly || !relationship?.effectField) {
      return new Set();
    }
    return new Set(
      [String(relationship.effectField || "").trim()].filter(Boolean),
    );
  };
  updatePlannerSelectSettings = async (updater) => {
    const previousSettings = normalizePlannerSelectSettings(
      this.state?.plannerSelectSettings,
    );
    const nextSettingsCandidate =
      typeof updater === "function"
        ? updater(previousSettings, this.state)
        : updater;
    const nextSettings = normalizePlannerSelectSettings(nextSettingsCandidate);
    let persistedSettings = nextSettings;
    let backendReplyMessage = "";
    try {
      const saveResult = await this.persistPlannerSelectSettings(nextSettings);
      persistedSettings =
        normalizePlannerSelectSettings(saveResult?.settings) || nextSettings;
      backendReplyMessage = String(saveResult?.message || "").trim();
    } catch (error) {
      const rawFailureMessage = String(
        error?.message || NOGAPLANNER_TEXT.messages.settingsSaveFailed,
      ).trim();
      const failureMessage = rawFailureMessage
        .toLowerCase()
        .includes("failed to fetch")
        ? NOGAPLANNER_TEXT.messages.settingsServerUnreachable
        : rawFailureMessage;
      this.props.serverReply(failureMessage);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: failureMessage,
      });
      return previousSettings;
    }
    await new Promise((resolve) =>
      this.setState(
        {
          plannerSelectSettings: persistedSettings,
          plannerSettingsSaveStatus: "success",
          plannerSettingsSaveMessage:
            backendReplyMessage || NOGAPLANNER_TEXT.messages.settingsSaved,
        },
        resolve,
      ),
    );
    this.props.serverReply(
      backendReplyMessage || NOGAPLANNER_TEXT.messages.settingsSaved,
    );
    return persistedSettings;
  };
  handlePlannerFieldDefaultChange = async (fieldKey, nextValue) => {
    const normalizedFieldKey = String(fieldKey || "").trim();
    const normalizedFieldValue = String(nextValue ?? "").trim();
    if (!normalizedFieldKey) {
      return this.state?.plannerSelectSettings || null;
    }
    const previousSettings = normalizePlannerSelectSettings(
      this.state?.plannerSelectSettings,
    );
    const nextDefaults = {
      ...(previousSettings?.fieldDefaults || {}),
      [normalizedFieldKey]: normalizedFieldValue,
    };
    let persistedSettings = previousSettings;
    let backendReplyMessage = "";
    try {
      const saveResult = await this.persistPlannerFieldDefaults(nextDefaults);
      persistedSettings =
        normalizePlannerSelectSettings(saveResult?.settings) ||
        previousSettings;
      backendReplyMessage = String(saveResult?.message || "").trim();
    } catch (error) {
      const rawFailureMessage = String(
        error?.message || NOGAPLANNER_TEXT.messages.settingsSaveFailed,
      ).trim();
      const failureMessage = rawFailureMessage
        .toLowerCase()
        .includes("failed to fetch")
        ? NOGAPLANNER_TEXT.messages.settingsServerUnreachable
        : rawFailureMessage;
      this.props.serverReply(failureMessage);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: failureMessage,
      });
      return previousSettings;
    }
    this.setState({
      plannerSelectSettings: persistedSettings,
      plannerSettingsSaveStatus: "success",
      plannerSettingsSaveMessage:
        backendReplyMessage || NOGAPLANNER_TEXT.messages.settingsSaved,
    });
    this.props.serverReply(
      backendReplyMessage || NOGAPLANNER_TEXT.messages.settingsSaved,
    );
    return persistedSettings;
  };
  handlePlannerSettingsDefaultSectionChange = (nextSection) => {
    const normalizedSection = String(nextSection || "").trim() || "Courses";
    this.setState({
      plannerSettingsDefaultSection: normalizedSection,
      plannerSettingsDefaultFieldKey: "",
      plannerSettingsDefaultValueInput: "",
      plannerSettingsEditingDefaultFieldKey: "",
      plannerSettingsSelectedDefaultFieldKey: "",
    });
  };
  addOrUpdatePlannerDefaultField = async () => {
    const fieldKey = String(
      this.state?.plannerSettingsDefaultFieldKey || "",
    ).trim();
    const fieldValue = String(
      this.state?.plannerSettingsDefaultValueInput || "",
    ).trim();
    if (!fieldKey || !fieldValue) {
      return;
    }
    await this.handlePlannerFieldDefaultChange(fieldKey, fieldValue);
    this.setState({
      plannerSettingsEditingDefaultFieldKey: "",
      plannerSettingsSelectedDefaultFieldKey: fieldKey,
    });
  };
  editSelectedPlannerDefaultField = () => {
    const selectedFieldKey = String(
      this.state?.plannerSettingsSelectedDefaultFieldKey || "",
    ).trim();
    if (!selectedFieldKey) {
      return;
    }
    const fieldValue = String(
      this.state?.plannerSelectSettings?.fieldDefaults?.[selectedFieldKey] ||
        "",
    ).trim();
    this.setState({
      plannerSettingsDefaultFieldKey: selectedFieldKey,
      plannerSettingsDefaultValueInput: fieldValue,
      plannerSettingsEditingDefaultFieldKey: selectedFieldKey,
    });
  };
  deleteSelectedPlannerDefaultField = async () => {
    const selectedFieldKey = String(
      this.state?.plannerSettingsSelectedDefaultFieldKey || "",
    ).trim();
    if (!selectedFieldKey) {
      return;
    }
    await this.handlePlannerFieldDefaultChange(selectedFieldKey, "");
    this.setState((previousState) => ({
      plannerSettingsSelectedDefaultFieldKey: "",
      plannerSettingsEditingDefaultFieldKey:
        String(
          previousState?.plannerSettingsEditingDefaultFieldKey || "",
        ).trim() === selectedFieldKey
          ? ""
          : previousState?.plannerSettingsEditingDefaultFieldKey || "",
      plannerSettingsDefaultValueInput:
        String(previousState?.plannerSettingsDefaultFieldKey || "").trim() ===
        selectedFieldKey
          ? ""
          : previousState?.plannerSettingsDefaultValueInput || "",
    }));
  };
  clearPlannerDefaultFieldsForSection = async (formKey) => {
    const normalizedFormKey = String(formKey || "").trim();
    if (!normalizedFormKey) {
      return;
    }
    const sectionFieldKeys = getPlannerDefaultFieldsForForm(normalizedFormKey)
      .map((fieldConfig) => String(fieldConfig?.key || "").trim())
      .filter(Boolean);
    if (sectionFieldKeys.length === 0) {
      return;
    }
    const currentSettings = normalizePlannerSelectSettings(
      this.state?.plannerSelectSettings,
    );
    const currentDefaults =
      currentSettings?.fieldDefaults &&
      typeof currentSettings.fieldDefaults === "object"
        ? currentSettings.fieldDefaults
        : {};
    const nextDefaults = {
      ...currentDefaults,
    };
    sectionFieldKeys.forEach((fieldKey) => {
      nextDefaults[String(fieldKey || "").trim()] = "";
    });
    try {
      const saveResult = await this.persistPlannerFieldDefaults(nextDefaults);
      const persistedSettings = normalizePlannerSelectSettings(
        saveResult?.settings,
      );
      this.setState({
        plannerSelectSettings: persistedSettings,
        plannerSettingsSaveStatus: "success",
        plannerSettingsSaveMessage:
          String(saveResult?.message || "").trim() ||
          NOGAPLANNER_TEXT.messages.settingsSaved,
      });
    } catch (error) {
      const rawFailureMessage = String(
        error?.message || NOGAPLANNER_TEXT.messages.settingsSaveFailed,
      ).trim();
      const failureMessage = rawFailureMessage
        .toLowerCase()
        .includes("failed to fetch")
        ? NOGAPLANNER_TEXT.messages.settingsServerUnreachable
        : rawFailureMessage;
      this.props.serverReply(failureMessage);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: failureMessage,
      });
    }
    this.setState({
      plannerSettingsSelectedDefaultFieldKey: "",
      plannerSettingsEditingDefaultFieldKey: "",
      plannerSettingsDefaultValueInput: "",
    });
  };
  togglePlannerDefaultFieldSelection = (fieldKey) => {
    const normalizedFieldKey = String(fieldKey || "").trim();
    if (!normalizedFieldKey) {
      return;
    }
    this.setState((previousState) => ({
      plannerSettingsSelectedDefaultFieldKey:
        String(
          previousState?.plannerSettingsSelectedDefaultFieldKey || "",
        ).trim() === normalizedFieldKey
          ? ""
          : normalizedFieldKey,
    }));
  };
  handlePlannerSettingsInputChange = (fieldName, nextValue) => {
    if (
      fieldName === "plannerSettingsLogoMotionEnabled" ||
      fieldName === "plannerSettingsLogoFixedClock" ||
      fieldName === "plannerSettingsVoiceControlEnabled" ||
      fieldName === "plannerSettingsVoiceDictationEnabled"
    ) {
      const normalizedClock = String(nextValue || "9")
        .trim()
        .replace(/[^\d]/g, "");
      const safeClock = /^[1-9]$|^1[0-2]$/.test(normalizedClock)
        ? normalizedClock
        : "9";
      const normalizedValue =
        fieldName === "plannerSettingsLogoMotionEnabled" ||
        fieldName === "plannerSettingsVoiceControlEnabled" ||
        fieldName === "plannerSettingsVoiceDictationEnabled"
          ? Boolean(nextValue)
          : safeClock;
      this.setState(
        {
          [fieldName]: normalizedValue,
        },
        () => {
          this.updatePlannerSelectSettings((previousSettings) => ({
            ...previousSettings,
            logoMotionEnabled:
              fieldName === "plannerSettingsLogoMotionEnabled"
                ? normalizedValue
                : Boolean(this.state?.plannerSettingsLogoMotionEnabled),
            voiceControlEnabled:
              fieldName === "plannerSettingsVoiceControlEnabled"
                ? normalizedValue
                : Boolean(this.state?.plannerSettingsVoiceControlEnabled),
            voiceDictationEnabled:
              fieldName === "plannerSettingsVoiceDictationEnabled"
                ? normalizedValue
                : Boolean(this.state?.plannerSettingsVoiceDictationEnabled),
            logoFixedClock:
              fieldName === "plannerSettingsLogoFixedClock"
                ? normalizedValue
                : String(this.state?.plannerSettingsLogoFixedClock || "9")
                    .trim()
                    .replace(/[^\d]/g, "") || "9",
          }));
        },
      );
      return;
    }
    if (fieldName === "plannerSettingsLocationRoomBuildingInput") {
      this.setState({
        [fieldName]: nextValue,
        plannerSettingsLocationRoomInput: "",
        plannerSettingsEditingLocationRoomIndex: -1,
        plannerSettingsSelectedLocationRoomIndex: -1,
      });
      return;
    }
    this.setState({
      [fieldName]: nextValue,
    });
  };
  savePlannerPredictionToolSettings = async () => {
    const enabled = Boolean(this.state?.plannerSettingsPredictionToolEnabled);
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        predictionTool: this.serializePlannerInputHistoryToPredictionTool(
          this.plannerInputHistory,
          enabled,
        ),
      }),
    );
    this.setState({
      plannerSettingsPredictionToolEnabled: enabled,
      plannerSettingsSelectedPredictionFieldId: "",
      plannerSettingsSelectedPredictionTab: "",
      plannerSelectSettings: persistedSettings,
    });
  };
  selectPlannerPredictionTab = (tab = "") => {
    const normalizedTab = String(tab || "").trim();
    this.setState((previousState) => ({
      plannerSettingsSelectedPredictionTab:
        String(
          previousState?.plannerSettingsSelectedPredictionTab || "",
        ).trim() === normalizedTab
          ? ""
          : normalizedTab,
    }));
  };
  selectPlannerPredictionField = (fieldId = "") => {
    const normalizedFieldId = String(fieldId || "").trim();
    if (!normalizedFieldId) {
      return;
    }
    this.setState((previousState) => ({
      plannerSettingsSelectedPredictionFieldId:
        String(
          previousState?.plannerSettingsSelectedPredictionFieldId || "",
        ).trim() === normalizedFieldId
          ? ""
          : normalizedFieldId,
    }));
  };
  deleteSelectedPlannerPredictionField = async () => {
    const selectedFieldId = String(
      this.state?.plannerSettingsSelectedPredictionFieldId || "",
    ).trim();
    if (!selectedFieldId) {
      return;
    }
    if (
      this.plannerInputHistory &&
      typeof this.plannerInputHistory === "object"
    ) {
      delete this.plannerInputHistory[selectedFieldId];
      this.persistPlannerInputHistory();
    }
    await this.savePlannerPredictionToolSettings();
  };
  deleteAllPlannerPredictionFields = async () => {
    this.plannerInputHistory = {};
    this.persistPlannerInputHistory();
    await this.savePlannerPredictionToolSettings();
  };
  deletePlannerPredictionByTab = async () => {
    const selectedTab = String(
      this.state?.plannerSettingsSelectedPredictionTab || "",
    ).trim();
    if (!selectedTab) {
      return;
    }
    const predictionToolEntries = Array.isArray(
      this.state?.plannerSelectSettings?.predictionTool,
    )
      ? this.state.plannerSelectSettings.predictionTool
      : [];
    const fieldIdsForTab = new Set(
      predictionToolEntries
        .filter((entry) => String(entry?.tab || "").trim() === selectedTab)
        .map((entry) => String(entry?.inputFieldID || "").trim())
        .filter(Boolean),
    );
    if (fieldIdsForTab.size === 0) {
      return;
    }
    const nextHistory =
      this.plannerInputHistory && typeof this.plannerInputHistory === "object"
        ? { ...this.plannerInputHistory }
        : {};
    fieldIdsForTab.forEach((fieldId) => {
      delete nextHistory[fieldId];
    });
    this.plannerInputHistory = nextHistory;
    this.persistPlannerInputHistory();
    await this.savePlannerPredictionToolSettings();
  };
  addOrUpdatePlannerVoiceCommandEntry = async () => {
    const tab = String(this.state?.plannerSettingsVoiceCommandTab || "").trim();
    const button = String(
      this.state?.plannerSettingsVoiceCommandButton || "",
    ).trim();
    const command = String(
      this.state?.plannerSettingsVoiceCommandInput || "",
    ).trim();
    if (!tab || !button || !command) {
      this.props.serverReply("Please complete the voice command fields.");
      return;
    }
    const currentEntries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceCommands,
    )
      ? this.state.plannerSelectSettings.voiceCommands
      : [];
    const editingIndex = Number(
      this.state?.plannerSettingsEditingVoiceCommandIndex ?? -1,
    );
    const nextEntry = { tab, button, command };
    const nextEntries =
      editingIndex >= 0 && editingIndex < currentEntries.length
        ? currentEntries.map((entry, index) =>
            index === editingIndex ? nextEntry : entry,
          )
        : [...currentEntries, nextEntry];
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        voiceCommands: nextEntries,
      }),
    );
    if (!persistedSettings) {
      return;
    }
    this.setState({
      plannerSettingsVoiceCommandButton: "",
      plannerSettingsVoiceCommandInput: "",
      plannerSettingsSelectedVoiceCommandIndex: -1,
      plannerSettingsEditingVoiceCommandIndex: -1,
    });
  };
  togglePlannerVoiceCommandSelection = (entryIndex) => {
    this.setState((previousState) => ({
      plannerSettingsSelectedVoiceCommandIndex:
        Number(
          previousState?.plannerSettingsSelectedVoiceCommandIndex ?? -1,
        ) === entryIndex
          ? -1
          : entryIndex,
    }));
  };
  editSelectedPlannerVoiceCommandEntry = () => {
    const selectedIndex = Number(
      this.state?.plannerSettingsSelectedVoiceCommandIndex ?? -1,
    );
    const entries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceCommands,
    )
      ? this.state.plannerSelectSettings.voiceCommands
      : [];
    const selectedEntry = entries[selectedIndex];
    if (!selectedEntry) {
      return;
    }
    this.setState({
      plannerSettingsVoiceCommandTab: String(
        selectedEntry?.tab || "Courses",
      ).trim(),
      plannerSettingsVoiceCommandButton: String(
        selectedEntry?.button || "",
      ).trim(),
      plannerSettingsVoiceCommandInput: String(
        selectedEntry?.command || "",
      ).trim(),
      plannerSettingsEditingVoiceCommandIndex: selectedIndex,
    });
  };
  deleteSelectedPlannerVoiceCommandEntry = async () => {
    const selectedIndex = Number(
      this.state?.plannerSettingsSelectedVoiceCommandIndex ?? -1,
    );
    if (selectedIndex < 0) {
      return;
    }
    const entries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceCommands,
    )
      ? this.state.plannerSelectSettings.voiceCommands
      : [];
    const nextEntries = entries.filter((_, index) => index !== selectedIndex);
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        voiceCommands: nextEntries,
      }),
    );
    if (!persistedSettings) {
      return;
    }
    this.setState({
      plannerSettingsSelectedVoiceCommandIndex: -1,
      plannerSettingsEditingVoiceCommandIndex: -1,
    });
  };
  clearPlannerVoiceCommandEntries = async () => {
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        voiceCommands: [],
      }),
    );
    if (!persistedSettings) {
      return;
    }
    this.setState({
      plannerSettingsSelectedVoiceCommandIndex: -1,
      plannerSettingsEditingVoiceCommandIndex: -1,
      plannerSettingsVoiceCommandButton: "",
      plannerSettingsVoiceCommandInput: "",
    });
  };
  addPlannerVoiceDictationNormalizationEntry = async () => {
    const letter = String(
      this.state?.plannerSettingsVoiceDictationLetter || "",
    ).trim();
    const normalizedLetter = String(
      this.state?.plannerSettingsVoiceDictationNormalizedLetter || "",
    ).trim();
    const conditionRaw = String(
      this.state?.plannerSettingsVoiceDictationCondition || "endOfWord",
    )
      .trim()
      .toLowerCase();
    const condition =
      conditionRaw === "startofword"
        ? "startOfWord"
        : conditionRaw === "anywhere"
          ? "anywhere"
          : "endOfWord";
    if (!letter || !normalizedLetter) {
      this.props.serverReply("Please enter the letter and normalized letter.");
      return;
    }
    const currentEntries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceDictationNormalizations,
    )
      ? this.state.plannerSelectSettings.voiceDictationNormalizations
      : [];
    const nextEntry = {
      letter,
      normalizedLetter,
      condition,
    };
    const duplicateExists = currentEntries.some(
      (entry) =>
        String(entry?.letter || "").trim() === nextEntry.letter &&
        String(entry?.normalizedLetter || "").trim() ===
          nextEntry.normalizedLetter &&
        String(entry?.condition || "").trim() === nextEntry.condition,
    );
    if (duplicateExists) {
      this.props.serverReply("The normalization rule already exists.");
      return;
    }
    const nextEntries = [...currentEntries, nextEntry];
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        voiceDictationNormalizations: nextEntries,
      }),
    );
    if (!persistedSettings) {
      return;
    }
    this.setState({
      plannerSettingsVoiceDictationLetter: "",
      plannerSettingsVoiceDictationNormalizedLetter: "",
      plannerSettingsVoiceDictationCondition: "endOfWord",
      plannerSettingsSelectedVoiceDictationNormalizationIndex: -1,
    });
  };
  togglePlannerVoiceDictationNormalizationSelection = (entryIndex) => {
    this.setState((previousState) => ({
      plannerSettingsSelectedVoiceDictationNormalizationIndex:
        Number(
          previousState?.plannerSettingsSelectedVoiceDictationNormalizationIndex ??
            -1,
        ) === entryIndex
          ? -1
          : entryIndex,
    }));
  };
  deleteSelectedPlannerVoiceDictationNormalizationEntry = async () => {
    const selectedIndex = Number(
      this.state?.plannerSettingsSelectedVoiceDictationNormalizationIndex ?? -1,
    );
    if (selectedIndex < 0) {
      return;
    }
    const entries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceDictationNormalizations,
    )
      ? this.state.plannerSelectSettings.voiceDictationNormalizations
      : [];
    const nextEntries = entries.filter((_, index) => index !== selectedIndex);
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        voiceDictationNormalizations: nextEntries,
      }),
    );
    if (!persistedSettings) {
      return;
    }
    this.setState({
      plannerSettingsSelectedVoiceDictationNormalizationIndex: -1,
    });
  };
  togglePlannerVoiceCommandCaptureMode = () => {
    this.setState((previousState) => ({
      plannerVoiceCommandCaptureMode: !Boolean(
        previousState?.plannerVoiceCommandCaptureMode,
      ),
    }));
  };
  getPlannerVoiceCaptureTabLabel = () => {
    if (this.state?.plannerSettingsVisible) {
      return "settings";
    }
    const wrapperTab = String(this.state?.wrapperTab || "").trim();
    if (wrapperTab === "lectures") return "lectures";
    if (wrapperTab === "exams") return "exams";
    if (wrapperTab === "courses") return "courses";
    return "nogaPlanner";
  };
  openPlannerVoiceCommandFooterPrompt = ({ tab = "", button = "" } = {}) => {
    if (typeof window === "undefined" || !tab || !button) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("noga-voice-command-prompt-open", {
        detail: { tab, button, command: "" },
      }),
    );
  };
  handlePlannerVoiceCommandCaptureMouseDown = (event) => {
    if (!this.state?.plannerVoiceCommandCaptureMode) {
      return;
    }
    const root = this.plannerArticleRef?.current;
    const target = event?.target;
    const buttonNode =
      target && typeof target.closest === "function"
        ? target.closest("button")
        : null;
    if (!root || !buttonNode || !root.contains(buttonNode)) {
      return;
    }
    if (
      buttonNode.dataset?.voiceCaptureControl === "true" ||
      buttonNode.id === "server_answer_voicePromptSubmit" ||
      buttonNode.id === "server_answer_voicePromptCancel"
    ) {
      return;
    }
    const elementID = String(buttonNode.id || "").trim();
    const buttonLabel = String(
      buttonNode.getAttribute("aria-label") || buttonNode.textContent || "",
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!elementID || !buttonLabel) {
      return;
    }
    if (this.voiceCapturePressTimer) {
      clearTimeout(this.voiceCapturePressTimer);
      this.voiceCapturePressTimer = null;
    }
    this.voiceCapturePressMeta = { elementID, buttonLabel };
    this.voiceCapturePressTimer = setTimeout(() => {
      const pressMeta = this.voiceCapturePressMeta;
      if (!pressMeta) {
        return;
      }
      this.voiceCaptureSuppressClickElementId = String(
        pressMeta.elementID || "",
      ).trim();
      this.pendingVoiceCommandCaptureMeta = {
        idTree: [this.getPlannerVoiceCaptureTabLabel(), pressMeta.buttonLabel],
        elementID: pressMeta.elementID,
        buttonLabel: pressMeta.buttonLabel,
      };
      this.openPlannerVoiceCommandFooterPrompt({
        tab: this.getPlannerVoiceCaptureTabLabel(),
        button: pressMeta.buttonLabel,
      });
      this.voiceCapturePressMeta = null;
      this.voiceCapturePressTimer = null;
    }, 550);
  };
  handlePlannerVoiceCommandCaptureMouseUp = () => {
    if (this.voiceCapturePressTimer) {
      clearTimeout(this.voiceCapturePressTimer);
      this.voiceCapturePressTimer = null;
    }
    this.voiceCapturePressMeta = null;
  };
  handlePlannerVoiceCommandCaptureClick = (event) => {
    if (!this.state?.plannerVoiceCommandCaptureMode) {
      return;
    }
    const root = this.plannerArticleRef?.current;
    const target = event?.target;
    const buttonNode =
      target && typeof target.closest === "function"
        ? target.closest("button")
        : null;
    if (!root || !buttonNode || !root.contains(buttonNode)) {
      return;
    }
    const buttonId = String(buttonNode.id || "").trim();
    if (
      buttonNode.dataset?.voiceCaptureControl === "true" ||
      buttonId === "server_answer_voicePromptSubmit" ||
      buttonId === "server_answer_voicePromptCancel"
    ) {
      return;
    }
    const suppressId = String(
      this.voiceCaptureSuppressClickElementId || "",
    ).trim();
    if (suppressId && buttonId === suppressId) {
      this.voiceCaptureSuppressClickElementId = "";
      event.preventDefault();
      event.stopPropagation();
    }
  };
  handlePlannerVoiceCommandFooterSubmit = async (event) => {
    const command = String(event?.detail?.command || "").trim();
    const meta = this.pendingVoiceCommandCaptureMeta;
    if (!meta || !command) {
      return;
    }
    const currentEntries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceCommands,
    )
      ? this.state.plannerSelectSettings.voiceCommands
      : [];
    const nextEntry = {
      idTree: Array.isArray(meta.idTree) ? meta.idTree : [],
      elementID: String(meta.elementID || "").trim(),
      voiceCommand: command,
    };
    const exists = currentEntries.some(
      (entry) =>
        String(entry?.elementID || "").trim() === nextEntry.elementID &&
        String(entry?.voiceCommand || "").trim() === nextEntry.voiceCommand,
    );
    if (exists) {
      this.pendingVoiceCommandCaptureMeta = null;
      return;
    }
    await this.updatePlannerSelectSettings((previousSettings) => ({
      ...previousSettings,
      voiceCommands: [...currentEntries, nextEntry],
    }));
    this.pendingVoiceCommandCaptureMeta = null;
    this.setState({ plannerVoiceCommandCaptureMode: false });
  };
  handlePlannerVoiceCommandFooterCancel = () => {
    this.pendingVoiceCommandCaptureMeta = null;
  };
  addPlannerSettingsMessageFriendRecipient = () => {
    const friendID = String(
      this.state?.plannerSettingsMessageFromFriendToId || "",
    ).trim();
    const message = String(
      this.state?.plannerSettingsMessageFromFriendToMessage || "",
    ).trim();
    if (!friendID || !message) {
      return;
    }
    this.setState((previousState) => {
      const currentList = Array.isArray(
        previousState?.plannerSettingsMessageFromFriendToList,
      )
        ? previousState.plannerSettingsMessageFromFriendToList
        : [];
      const duplicateIndex = currentList.findIndex(
        (entry) =>
          String(entry?.friendID || "").trim() === friendID &&
          String(entry?.message || "").trim() === message,
      );
      const nextList =
        duplicateIndex >= 0
          ? currentList
          : [...currentList, { friendID, message }];
      return {
        plannerSettingsMessageFromFriendToList: nextList,
        plannerSettingsMessageFromFriendToId: "",
        plannerSettingsMessageFromFriendToMessage: "",
        plannerSettingsMessageFromFriendSelectedToIndex: -1,
      };
    });
  };
  togglePlannerSettingsMessageFriendRecipientSelection = (entryIndex) => {
    this.setState((previousState) => ({
      plannerSettingsMessageFromFriendSelectedToIndex:
        Number(
          previousState?.plannerSettingsMessageFromFriendSelectedToIndex,
        ) === entryIndex
          ? -1
          : entryIndex,
    }));
  };
  removeSelectedPlannerSettingsMessageFriendRecipient = () => {
    this.setState((previousState) => {
      const selectedIndex = Number(
        previousState?.plannerSettingsMessageFromFriendSelectedToIndex ?? -1,
      );
      if (selectedIndex < 0) {
        return null;
      }
      const currentList = Array.isArray(
        previousState?.plannerSettingsMessageFromFriendToList,
      )
        ? previousState.plannerSettingsMessageFromFriendToList
        : [];
      return {
        plannerSettingsMessageFromFriendToList: currentList.filter(
          (_, index) => index !== selectedIndex,
        ),
        plannerSettingsMessageFromFriendSelectedToIndex: -1,
      };
    });
  };
  savePlannerSettingsMessageFromFriendSelection = async (nextFromFriendId) => {
    const fromFriendID = String(nextFromFriendId || "").trim();
    this.setState({
      plannerSettingsMessageFromFriendFromId: fromFriendID,
    });
    const previousFromMessage = String(
      this.state?.plannerSelectSettings?.messageFriend?.from?.message || "",
    ).trim();
    const toList = Array.isArray(
      this.state?.plannerSettingsMessageFromFriendToList,
    )
      ? this.state.plannerSettingsMessageFromFriendToList
          .map((entry) => ({
            friendID: String(entry?.friendID || "").trim(),
            message: String(entry?.message || "").trim(),
          }))
          .filter((entry) => entry.friendID && entry.message)
      : [];
    const matchedOutgoingMessage =
      toList.find((entry) => entry.friendID === fromFriendID)?.message || "";
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        messageFriend: {
          from: {
            friendID: fromFriendID,
            message: matchedOutgoingMessage || previousFromMessage,
          },
          to: toList,
        },
      }),
    );
    this.setState({
      plannerSettingsMessageFromFriendFromId: String(
        persistedSettings?.messageFriend?.from?.friendID || fromFriendID,
      ).trim(),
    });
  };
  savePlannerSettingsMessageFromFriend = async () => {
    const fromFriendID = String(
      this.state?.plannerSettingsMessageFromFriendFromId || "",
    ).trim();
    const toList = Array.isArray(
      this.state?.plannerSettingsMessageFromFriendToList,
    )
      ? this.state.plannerSettingsMessageFromFriendToList
          .map((entry) => ({
            friendID: String(entry?.friendID || "").trim(),
            message: String(entry?.message || "").trim(),
          }))
          .filter((entry) => entry.friendID && entry.message)
      : [];
    if (!fromFriendID && toList.length === 0) {
      const validationMessage =
        "Please choose a friend to listen to or add an outgoing message.";
      this.props.serverReply(validationMessage);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: validationMessage,
      });
      return;
    }
    const previousFromMessage = String(
      this.state?.plannerSelectSettings?.messageFriend?.from?.message || "",
    ).trim();
    const matchedOutgoingMessage =
      toList.find((entry) => entry.friendID === fromFriendID)?.message || "";
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => ({
        ...previousSettings,
        messageFriend: {
          from: {
            friendID: fromFriendID,
            message: matchedOutgoingMessage || previousFromMessage,
          },
          to: toList,
        },
      }),
    );
    this.setState({
      plannerSettingsMessageFromFriendFromId: String(
        persistedSettings?.messageFriend?.from?.friendID || fromFriendID,
      ).trim(),
      plannerSettingsMessageFromFriendToId: "",
      plannerSettingsMessageFromFriendToMessage: "",
      plannerSettingsMessageFromFriendSelectedToIndex: -1,
      plannerSettingsMessageFromFriendToList: Array.isArray(
        persistedSettings?.messageFriend?.to,
      )
        ? persistedSettings.messageFriend.to
            .map((entry) => ({
              friendID: String(entry?.friendID || "").trim(),
              message: String(entry?.message || "").trim(),
            }))
            .filter((entry) => entry.friendID && entry.message)
        : [],
    });
  };
  addOrUpdatePlannerSettingsListItem = async (listKey) => {
    if (listKey === "locationRoomOptions") {
      await this.addOrUpdatePlannerRoomOption();
      return;
    }
    const fieldMap = {
      componentClassOptions: {
        inputKey: "plannerSettingsComponentClassInput",
        indexKey: "plannerSettingsEditingComponentClassIndex",
        selectedIndexKey: "plannerSettingsSelectedComponentClassIndex",
      },
      weekdayOptions: {
        inputKey: "plannerSettingsWeekdayInput",
        indexKey: "plannerSettingsEditingWeekdayIndex",
        selectedIndexKey: "plannerSettingsSelectedWeekdayIndex",
      },
      hourOptions: {
        inputKey: "plannerSettingsHourInput",
        indexKey: "plannerSettingsEditingHourIndex",
        selectedIndexKey: "plannerSettingsSelectedHourIndex",
      },
      termOptions: {
        inputKey: "plannerSettingsTermInput",
        indexKey: "plannerSettingsEditingTermIndex",
        selectedIndexKey: "plannerSettingsSelectedTermIndex",
      },
      academicYearOptions: {
        inputKey: "plannerSettingsAcademicYearInput",
        indexKey: "plannerSettingsEditingAcademicYearIndex",
        selectedIndexKey: "plannerSettingsSelectedAcademicYearIndex",
      },
      locationBuildingOptions: {
        inputKey: "plannerSettingsLocationBuildingInput",
        indexKey: "plannerSettingsEditingLocationBuildingIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationBuildingIndex",
      },
      locationRoomOptions: {
        inputKey: "plannerSettingsLocationRoomInput",
        indexKey: "plannerSettingsEditingLocationRoomIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationRoomIndex",
      },
    };
    const fieldConfig = fieldMap[listKey];
    if (!fieldConfig) {
      return;
    }
    const nextValue = String(this.state?.[fieldConfig.inputKey] || "").trim();
    if (!nextValue) {
      return;
    }
    const editingIndex = Number(this.state?.[fieldConfig.indexKey] ?? -1);
    await this.updatePlannerSelectSettings((previousSettings) => {
      const currentEntries = Array.isArray(previousSettings?.[listKey])
        ? [...previousSettings[listKey]]
        : [];
      const duplicateIndex = currentEntries.findIndex(
        (entry, entryIndex) =>
          entry === nextValue && entryIndex !== editingIndex,
      );
      if (duplicateIndex !== -1) {
        return previousSettings;
      }
      if (
        Number.isInteger(editingIndex) &&
        editingIndex >= 0 &&
        editingIndex < currentEntries.length
      ) {
        currentEntries[editingIndex] = nextValue;
      } else {
        currentEntries.push(nextValue);
      }
      return {
        ...previousSettings,
        [listKey]: currentEntries,
      };
    });
    this.setState({
      [fieldConfig.inputKey]: "",
      [fieldConfig.indexKey]: -1,
      [fieldConfig.selectedIndexKey]: -1,
    });
  };
  addOrUpdatePlannerRoomOption = async () => {
    const building = String(
      this.state?.plannerSettingsLocationRoomBuildingInput || "",
    ).trim();
    const room = String(
      this.state?.plannerSettingsLocationRoomInput || "",
    ).trim();
    if (!building || !room) {
      return;
    }
    const editingIndex = Number(
      this.state?.plannerSettingsEditingLocationRoomIndex ?? -1,
    );
    await this.updatePlannerSelectSettings((previousSettings) => {
      const grouped = Array.isArray(
        previousSettings?.locationRoomOptionsByBuilding,
      )
        ? previousSettings.locationRoomOptionsByBuilding.map((entry) => ({
            building: String(entry?.building || "").trim(),
            rooms: Array.isArray(entry?.rooms)
              ? entry.rooms
                  .map((value) => String(value || "").trim())
                  .filter(Boolean)
              : [],
          }))
        : [];
      const groupIndex = grouped.findIndex(
        (entry) => entry.building === building,
      );
      const baseGroup =
        groupIndex >= 0 ? grouped[groupIndex] : { building, rooms: [] };
      const nextRooms = [...baseGroup.rooms];
      const duplicateIndex = nextRooms.findIndex(
        (entry, entryIndex) => entry === room && entryIndex !== editingIndex,
      );
      if (duplicateIndex !== -1) {
        return previousSettings;
      }
      if (editingIndex >= 0 && editingIndex < nextRooms.length) {
        nextRooms[editingIndex] = room;
      } else {
        nextRooms.push(room);
      }
      const nextGroup = { building, rooms: Array.from(new Set(nextRooms)) };
      if (groupIndex >= 0) {
        grouped[groupIndex] = nextGroup;
      } else {
        grouped.push(nextGroup);
      }
      return {
        ...previousSettings,
        locationRoomOptionsByBuilding: grouped,
        locationRoomOptions: [],
      };
    });
    this.setState({
      plannerSettingsLocationRoomInput: "",
      plannerSettingsEditingLocationRoomIndex: -1,
      plannerSettingsSelectedLocationRoomIndex: -1,
    });
  };
  editSelectedPlannerRoomOption = () => {
    const building = String(
      this.state?.plannerSettingsLocationRoomBuildingInput || "",
    ).trim();
    const selectedIndex = Number(
      this.state?.plannerSettingsSelectedLocationRoomIndex ?? -1,
    );
    if (!building || selectedIndex < 0) {
      return;
    }
    const grouped = Array.isArray(
      this.state?.plannerSelectSettings?.locationRoomOptionsByBuilding,
    )
      ? this.state.plannerSelectSettings.locationRoomOptionsByBuilding
      : [];
    const rooms =
      grouped.find((entry) => String(entry?.building || "").trim() === building)
        ?.rooms || [];
    this.setState({
      plannerSettingsLocationRoomInput: String(
        rooms[selectedIndex] || "",
      ).trim(),
      plannerSettingsEditingLocationRoomIndex: selectedIndex,
    });
  };
  deleteSelectedPlannerRoomOption = async () => {
    const building = String(
      this.state?.plannerSettingsLocationRoomBuildingInput || "",
    ).trim();
    const selectedIndex = Number(
      this.state?.plannerSettingsSelectedLocationRoomIndex ?? -1,
    );
    if (!building || selectedIndex < 0) {
      return;
    }
    await this.updatePlannerSelectSettings((previousSettings) => {
      const grouped = Array.isArray(
        previousSettings?.locationRoomOptionsByBuilding,
      )
        ? previousSettings.locationRoomOptionsByBuilding.map((entry) => ({
            building: String(entry?.building || "").trim(),
            rooms: Array.isArray(entry?.rooms)
              ? entry.rooms
                  .map((value) => String(value || "").trim())
                  .filter(Boolean)
              : [],
          }))
        : [];
      const groupIndex = grouped.findIndex(
        (entry) => entry.building === building,
      );
      if (groupIndex === -1) {
        return previousSettings;
      }
      grouped[groupIndex].rooms = grouped[groupIndex].rooms.filter(
        (_, index) => index !== selectedIndex,
      );
      const nextGrouped = grouped.filter((entry) => entry.rooms.length > 0);
      return {
        ...previousSettings,
        locationRoomOptionsByBuilding: nextGrouped,
        locationRoomOptions: [],
      };
    });
    this.setState({
      plannerSettingsLocationRoomInput: "",
      plannerSettingsEditingLocationRoomIndex: -1,
      plannerSettingsSelectedLocationRoomIndex: -1,
    });
  };
  clearPlannerRoomOptions = async () => {
    const building = String(
      this.state?.plannerSettingsLocationRoomBuildingInput || "",
    ).trim();
    if (!building) {
      return;
    }
    await this.updatePlannerSelectSettings((previousSettings) => {
      const grouped = Array.isArray(
        previousSettings?.locationRoomOptionsByBuilding,
      )
        ? previousSettings.locationRoomOptionsByBuilding
        : [];
      const nextGrouped = grouped.filter(
        (entry) => String(entry?.building || "").trim() !== building,
      );
      return {
        ...previousSettings,
        locationRoomOptionsByBuilding: nextGrouped,
        locationRoomOptions: [],
      };
    });
    this.setState({
      plannerSettingsLocationRoomInput: "",
      plannerSettingsEditingLocationRoomIndex: -1,
      plannerSettingsSelectedLocationRoomIndex: -1,
    });
  };
  editPlannerSettingsListItem = (listKey, itemIndex) => {
    const fieldMap = {
      componentClassOptions: {
        inputKey: "plannerSettingsComponentClassInput",
        indexKey: "plannerSettingsEditingComponentClassIndex",
        selectedIndexKey: "plannerSettingsSelectedComponentClassIndex",
      },
      weekdayOptions: {
        inputKey: "plannerSettingsWeekdayInput",
        indexKey: "plannerSettingsEditingWeekdayIndex",
        selectedIndexKey: "plannerSettingsSelectedWeekdayIndex",
      },
      hourOptions: {
        inputKey: "plannerSettingsHourInput",
        indexKey: "plannerSettingsEditingHourIndex",
        selectedIndexKey: "plannerSettingsSelectedHourIndex",
      },
      termOptions: {
        inputKey: "plannerSettingsTermInput",
        indexKey: "plannerSettingsEditingTermIndex",
        selectedIndexKey: "plannerSettingsSelectedTermIndex",
      },
      academicYearOptions: {
        inputKey: "plannerSettingsAcademicYearInput",
        indexKey: "plannerSettingsEditingAcademicYearIndex",
        selectedIndexKey: "plannerSettingsSelectedAcademicYearIndex",
      },
      locationBuildingOptions: {
        inputKey: "plannerSettingsLocationBuildingInput",
        indexKey: "plannerSettingsEditingLocationBuildingIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationBuildingIndex",
      },
      locationRoomOptions: {
        inputKey: "plannerSettingsLocationRoomInput",
        indexKey: "plannerSettingsEditingLocationRoomIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationRoomIndex",
      },
    };
    const fieldConfig = fieldMap[listKey];
    if (!fieldConfig) {
      return;
    }
    const currentEntries = Array.isArray(
      this.state?.plannerSelectSettings?.[listKey],
    )
      ? this.state.plannerSelectSettings[listKey]
      : [];
    const nextValue = String(currentEntries[itemIndex] || "").trim();
    this.setState({
      [fieldConfig.inputKey]: nextValue,
      [fieldConfig.indexKey]: itemIndex,
      [fieldConfig.selectedIndexKey]: itemIndex,
    });
  };
  removePlannerSettingsListItem = async (listKey, itemIndex) => {
    await this.updatePlannerSelectSettings((previousSettings) => {
      const currentEntries = Array.isArray(previousSettings?.[listKey])
        ? previousSettings[listKey].filter(
            (_, currentIndex) => currentIndex !== itemIndex,
          )
        : [];
      const nextSettings = {
        ...previousSettings,
        [listKey]: currentEntries,
      };
      if (listKey === "componentClassOptions") {
        nextSettings.relationships = (
          previousSettings.relationships || []
        ).filter(
          (entry) =>
            String(entry?.course_classSelection || "").trim() !==
            String(previousSettings?.[listKey]?.[itemIndex] || "").trim(),
        );
      }
      if (listKey === "weekdayOptions") {
        const removedValue = String(
          previousSettings?.[listKey]?.[itemIndex] || "",
        ).trim();
        nextSettings.relationships = (nextSettings.relationships || []).map(
          (entry) =>
            String(entry?.course_daySelection || "").trim() === removedValue
              ? {
                  ...entry,
                  course_daySelection: "",
                }
              : entry,
        );
      }
      if (listKey === "hourOptions") {
        const removedValue = String(
          previousSettings?.[listKey]?.[itemIndex] || "",
        ).trim();
        nextSettings.relationships = (nextSettings.relationships || []).map(
          (entry) =>
            String(entry?.course_timeSelection || "").trim() === removedValue
              ? {
                  ...entry,
                  course_timeSelection: "",
                }
              : entry,
        );
      }
      if (listKey === "termOptions") {
        const removedValue = String(
          previousSettings?.[listKey]?.[itemIndex] || "",
        ).trim();
        nextSettings.relationships = (nextSettings.relationships || []).map(
          (entry) => ({
            ...entry,
            normativeCourseTerm:
              String(entry?.normativeCourseTerm || "").trim() === removedValue
                ? ""
                : entry?.normativeCourseTerm || "",
            actualCourseTerm:
              String(entry?.actualCourseTerm || "").trim() === removedValue
                ? ""
                : entry?.actualCourseTerm || "",
          }),
        );
      }
      const currentFieldDefaults =
        previousSettings?.fieldDefaults &&
        typeof previousSettings.fieldDefaults === "object"
          ? previousSettings.fieldDefaults
          : {};
      const removedValue = String(
        previousSettings?.[listKey]?.[itemIndex] || "",
      ).trim();
      nextSettings.fieldDefaults = Object.fromEntries(
        Object.entries(currentFieldDefaults).map(([fieldKey, fieldValue]) => [
          String(fieldKey || "").trim(),
          String(fieldValue || "").trim() === removedValue
            ? ""
            : String(fieldValue || "").trim(),
        ]),
      );
      return nextSettings;
    });
    const fieldMap = {
      componentClassOptions: {
        indexKey: "plannerSettingsEditingComponentClassIndex",
        selectedIndexKey: "plannerSettingsSelectedComponentClassIndex",
      },
      weekdayOptions: {
        indexKey: "plannerSettingsEditingWeekdayIndex",
        selectedIndexKey: "plannerSettingsSelectedWeekdayIndex",
      },
      hourOptions: {
        indexKey: "plannerSettingsEditingHourIndex",
        selectedIndexKey: "plannerSettingsSelectedHourIndex",
      },
      termOptions: {
        indexKey: "plannerSettingsEditingTermIndex",
        selectedIndexKey: "plannerSettingsSelectedTermIndex",
      },
      academicYearOptions: {
        indexKey: "plannerSettingsEditingAcademicYearIndex",
        selectedIndexKey: "plannerSettingsSelectedAcademicYearIndex",
      },
      locationBuildingOptions: {
        indexKey: "plannerSettingsEditingLocationBuildingIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationBuildingIndex",
      },
      locationRoomOptions: {
        indexKey: "plannerSettingsEditingLocationRoomIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationRoomIndex",
      },
    };
    const fieldConfig = fieldMap[listKey];
    if (fieldConfig) {
      this.setState((previousState) => {
        const editingIndex = Number(
          previousState?.[fieldConfig.indexKey] ?? -1,
        );
        const selectedIndex = Number(
          previousState?.[fieldConfig.selectedIndexKey] ?? -1,
        );
        return {
          [fieldConfig.indexKey]:
            editingIndex === itemIndex
              ? -1
              : editingIndex > itemIndex
                ? editingIndex - 1
                : editingIndex,
          [fieldConfig.selectedIndexKey]:
            selectedIndex === itemIndex
              ? -1
              : selectedIndex > itemIndex
                ? selectedIndex - 1
                : selectedIndex,
        };
      });
    }
  };
  togglePlannerSettingsListItemSelection = (listKey, itemIndex) => {
    const selectedIndexKeyMap = {
      componentClassOptions: "plannerSettingsSelectedComponentClassIndex",
      weekdayOptions: "plannerSettingsSelectedWeekdayIndex",
      hourOptions: "plannerSettingsSelectedHourIndex",
      termOptions: "plannerSettingsSelectedTermIndex",
      academicYearOptions: "plannerSettingsSelectedAcademicYearIndex",
      locationBuildingOptions: "plannerSettingsSelectedLocationBuildingIndex",
      locationRoomOptions: "plannerSettingsSelectedLocationRoomIndex",
    };
    const selectedIndexKey = selectedIndexKeyMap[listKey];
    if (!selectedIndexKey) {
      return;
    }
    this.setState((previousState) => ({
      [selectedIndexKey]:
        Number(previousState?.[selectedIndexKey] ?? -1) === itemIndex
          ? -1
          : itemIndex,
    }));
  };
  editSelectedPlannerSettingsListItem = (listKey) => {
    const selectedIndexKeyMap = {
      componentClassOptions: "plannerSettingsSelectedComponentClassIndex",
      weekdayOptions: "plannerSettingsSelectedWeekdayIndex",
      hourOptions: "plannerSettingsSelectedHourIndex",
      termOptions: "plannerSettingsSelectedTermIndex",
      academicYearOptions: "plannerSettingsSelectedAcademicYearIndex",
      locationBuildingOptions: "plannerSettingsSelectedLocationBuildingIndex",
      locationRoomOptions: "plannerSettingsSelectedLocationRoomIndex",
    };
    const selectedIndex = Number(
      this.state?.[selectedIndexKeyMap[listKey]] ?? -1,
    );
    if (selectedIndex < 0) {
      return;
    }
    this.editPlannerSettingsListItem(listKey, selectedIndex);
  };
  deleteSelectedPlannerSettingsListItem = async (listKey) => {
    const selectedIndexKeyMap = {
      componentClassOptions: "plannerSettingsSelectedComponentClassIndex",
      weekdayOptions: "plannerSettingsSelectedWeekdayIndex",
      hourOptions: "plannerSettingsSelectedHourIndex",
      termOptions: "plannerSettingsSelectedTermIndex",
      academicYearOptions: "plannerSettingsSelectedAcademicYearIndex",
      locationBuildingOptions: "plannerSettingsSelectedLocationBuildingIndex",
      locationRoomOptions: "plannerSettingsSelectedLocationRoomIndex",
    };
    const selectedIndex = Number(
      this.state?.[selectedIndexKeyMap[listKey]] ?? -1,
    );
    if (selectedIndex < 0) {
      return;
    }
    await this.removePlannerSettingsListItem(listKey, selectedIndex);
  };
  clearPlannerSettingsList = async (listKey) => {
    await this.updatePlannerSelectSettings((previousSettings) => {
      const nextSettings = {
        ...previousSettings,
        [listKey]: [],
      };
      if (listKey === "componentClassOptions") {
        nextSettings.relationships = [];
      }
      if (listKey === "weekdayOptions") {
        nextSettings.relationships = (previousSettings.relationships || []).map(
          (entry) => ({
            ...entry,
            course_daySelection: "",
          }),
        );
      }
      if (listKey === "hourOptions") {
        nextSettings.relationships = (previousSettings.relationships || []).map(
          (entry) => ({
            ...entry,
            course_timeSelection: "",
          }),
        );
      }
      if (listKey === "termOptions") {
        nextSettings.relationships = (previousSettings.relationships || []).map(
          (entry) => ({
            ...entry,
            normativeCourseTerm: "",
            actualCourseTerm: "",
          }),
        );
      }
      const currentFieldDefaults =
        previousSettings?.fieldDefaults &&
        typeof previousSettings.fieldDefaults === "object"
          ? previousSettings.fieldDefaults
          : {};
      nextSettings.fieldDefaults = Object.fromEntries(
        Object.entries(currentFieldDefaults).map(([fieldKey, fieldValue]) => {
          const fieldConfig = PLANNER_DEFAULT_FIELD_REGISTRY.find(
            (entry) => entry.key === fieldKey,
          );
          const shouldClear =
            (listKey === "componentClassOptions" &&
              fieldConfig?.optionsKey === "componentClassOptions") ||
            (listKey === "weekdayOptions" &&
              fieldConfig?.optionsKey === "weekdayOptions") ||
            (listKey === "hourOptions" &&
              fieldConfig?.optionsKey === "hourOptions") ||
            (listKey === "termOptions" &&
              fieldConfig?.optionsKey === "termOptions") ||
            (listKey === "locationBuildingOptions" &&
              fieldConfig?.optionsKey === "locationBuildingOptions") ||
            (listKey === "locationRoomOptions" &&
              fieldConfig?.optionsKey === "locationRoomOptions");
          return [
            String(fieldKey || "").trim(),
            shouldClear ? "" : String(fieldValue || "").trim(),
          ];
        }),
      );
      return nextSettings;
    });
    const fieldMap = {
      componentClassOptions: {
        indexKey: "plannerSettingsEditingComponentClassIndex",
        selectedIndexKey: "plannerSettingsSelectedComponentClassIndex",
      },
      weekdayOptions: {
        indexKey: "plannerSettingsEditingWeekdayIndex",
        selectedIndexKey: "plannerSettingsSelectedWeekdayIndex",
      },
      hourOptions: {
        indexKey: "plannerSettingsEditingHourIndex",
        selectedIndexKey: "plannerSettingsSelectedHourIndex",
      },
      termOptions: {
        indexKey: "plannerSettingsEditingTermIndex",
        selectedIndexKey: "plannerSettingsSelectedTermIndex",
      },
      academicYearOptions: {
        indexKey: "plannerSettingsEditingAcademicYearIndex",
        selectedIndexKey: "plannerSettingsSelectedAcademicYearIndex",
      },
      locationBuildingOptions: {
        indexKey: "plannerSettingsEditingLocationBuildingIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationBuildingIndex",
      },
      locationRoomOptions: {
        indexKey: "plannerSettingsEditingLocationRoomIndex",
        selectedIndexKey: "plannerSettingsSelectedLocationRoomIndex",
      },
    };
    const fieldConfig = fieldMap[listKey];
    if (fieldConfig) {
      this.setState({
        [fieldConfig.indexKey]: -1,
        [fieldConfig.selectedIndexKey]: -1,
      });
    }
  };
  handlePlannerSettingsRelationshipDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => ({
      plannerSettingsRelationshipDraft: {
        ...previousState.plannerSettingsRelationshipDraft,
        [fieldName]: nextValue,
      },
    }));
  };
  submitPlannerSettingsRelationship = async () => {
    const relationshipDraft = normalizePlannerRelationshipEntry({
      ...this.state?.plannerSettingsRelationshipDraft,
      id:
        String(this.state?.plannerSettingsEditingRelationshipId || "").trim() ||
        createPlannerSettingsRelationshipId(),
    });
    const relationshipPayload = {
      ...relationshipDraft,
      mode: relationshipDraft.relationScope,
      active: Boolean(relationshipDraft.readOnly),
      layerLevel:
        relationshipDraft.relationScope === "intercomponent"
          ? "inter-component"
          : "inner-component",
      conditionFormKey: "savedCourse",
      conditionFieldKey: relationshipDraft.causeField,
      conditionValue: relationshipDraft.causeValue,
      conditions:
        relationshipDraft.causeField && relationshipDraft.causeValue
          ? [
              {
                id: `${relationshipDraft.id}-cond-1`,
                conditionType: "field",
                formKey: "savedCourse",
                fieldKey: relationshipDraft.causeField,
                value: relationshipDraft.causeValue,
                logicalOperator: "AND",
                negate: false,
              },
            ]
          : [],
      resultFormKey: "savedCourse",
      resultFieldKey: relationshipDraft.effectField,
      resultValue: relationshipDraft.effectValue,
    };
    if (relationshipDraft.relationScope === "intercomponent") {
      const message = "Nested component relationships will be enabled later.";
      this.props.serverReply(message);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: message,
      });
      return;
    }
    if (
      relationshipDraft.relationScope === "innerComponent" &&
      (!relationshipDraft.causeField ||
        !relationshipDraft.causeValue ||
        !relationshipDraft.effectField ||
        !relationshipDraft.effectValue)
    ) {
      const message =
        "Please complete the relationship: cause field, cause value, effect field, and effect value.";
      this.props.serverReply(message);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: message,
      });
      return;
    }
    const persistedSettings = await this.updatePlannerSelectSettings(
      (previousSettings) => {
        const currentRelationships = Array.isArray(
          previousSettings?.relationships,
        )
          ? [...previousSettings.relationships]
          : [];
        const editingRelationshipId = String(
          this.state?.plannerSettingsEditingRelationshipId || "",
        ).trim();
        const nextRelationships =
          editingRelationshipId.length > 0
            ? currentRelationships.map((entry) =>
                String(entry?.id || "").trim() === editingRelationshipId
                  ? relationshipPayload
                  : entry,
              )
            : [...currentRelationships, relationshipPayload];
        return {
          ...previousSettings,
          relationships: nextRelationships,
        };
      },
    );
    const relationshipWasPersisted = Array.isArray(
      persistedSettings?.relationships,
    )
      ? persistedSettings.relationships.some(
          (entry) =>
            String(entry?.causeField || "").trim() ===
              String(relationshipDraft.causeField || "").trim() &&
            String(entry?.causeValue || "").trim() ===
              String(relationshipDraft.causeValue || "").trim() &&
            String(entry?.effectField || "").trim() ===
              String(relationshipDraft.effectField || "").trim() &&
            String(entry?.effectValue || "").trim() ===
              String(relationshipDraft.effectValue || "").trim() &&
            String(
              entry?.relationScope || entry?.mode || "innerComponent",
            ).trim() === String(relationshipDraft.relationScope).trim(),
        )
      : false;
    if (!relationshipWasPersisted) {
      const message =
        "The relationship was not saved in settings. Complete the fields and try again.";
      this.props.serverReply(message);
      this.setState({
        plannerSettingsSaveStatus: "error",
        plannerSettingsSaveMessage: message,
      });
      return;
    }
    this.setState({
      plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
      plannerSettingsEditingRelationshipId: "",
      plannerSettingsSelectedRelationshipId: "",
      plannerSettingsSaveStatus: "",
      plannerSettingsSaveMessage: "",
    });
    this.setState((previousState) => {
      const activeDraft =
        previousState?.savedCourseDraft || getDefaultSavedCourseDraft();
      const matchingRelationship = this.getPlannerRelationshipForClass(
        persistedSettings,
        activeDraft,
      );
      if (!matchingRelationship) {
        return null;
      }
      const nextDraft = this.applyPlannerRelationshipToSavedCourseDraft(
        activeDraft,
        matchingRelationship,
        true,
      );
      nextDraft.component_status =
        this.deriveSavedCourseComponentStatus(nextDraft);
      nextDraft.course_status = nextDraft.component_status;
      return {
        savedCourseDraft: nextDraft,
      };
    });
  };
  togglePlannerSettingsRelationshipSelection = (relationshipId) => {
    const normalizedId = String(relationshipId || "").trim();
    if (!normalizedId) {
      return;
    }
    this.setState((previousState) => ({
      plannerSettingsSelectedRelationshipId:
        String(
          previousState?.plannerSettingsSelectedRelationshipId || "",
        ).trim() === normalizedId
          ? ""
          : normalizedId,
    }));
  };
  editSelectedPlannerSettingsRelationship = () => {
    const relationshipId = String(
      this.state?.plannerSettingsSelectedRelationshipId || "",
    ).trim();
    if (!relationshipId) {
      return;
    }
    this.editPlannerSettingsRelationship(relationshipId);
  };
  deleteSelectedPlannerSettingsRelationship = async () => {
    const relationshipId = String(
      this.state?.plannerSettingsSelectedRelationshipId || "",
    ).trim();
    if (!relationshipId) {
      return;
    }
    await this.deletePlannerSettingsRelationship(relationshipId);
  };
  clearPlannerSettingsRelationships = async () => {
    await this.updatePlannerSelectSettings((previousSettings) => ({
      ...previousSettings,
      relationships: [],
    }));
    this.setState({
      plannerSettingsSelectedRelationshipId: "",
      plannerSettingsEditingRelationshipId: "",
      plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
    });
  };
  editPlannerSettingsRelationship = (relationshipId) => {
    const relationships = Array.isArray(
      this.state?.plannerSelectSettings?.relationships,
    )
      ? this.state.plannerSelectSettings.relationships
      : [];
    const relationship =
      relationships.find(
        (entry) =>
          String(entry?.id || "").trim() ===
          String(relationshipId || "").trim(),
      ) || null;
    if (!relationship) {
      return;
    }
    this.setState({
      plannerSettingsEditingRelationshipId: String(
        relationship.id || "",
      ).trim(),
      plannerSettingsSelectedRelationshipId: String(
        relationship.id || "",
      ).trim(),
      plannerSettingsRelationshipDraft:
        normalizePlannerRelationshipEntry(relationship),
    });
  };
  deletePlannerSettingsRelationship = async (relationshipId) => {
    await this.updatePlannerSelectSettings((previousSettings) => ({
      ...previousSettings,
      relationships: (previousSettings.relationships || []).filter(
        (entry) =>
          String(entry?.id || "").trim() !==
          String(relationshipId || "").trim(),
      ),
    }));
    if (
      String(this.state?.plannerSettingsEditingRelationshipId || "").trim() ===
      String(relationshipId || "").trim()
    ) {
      this.setState({
        plannerSettingsEditingRelationshipId: "",
        plannerSettingsSelectedRelationshipId: "",
        plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
      });
      return;
    }
    if (
      String(this.state?.plannerSettingsSelectedRelationshipId || "").trim() ===
      String(relationshipId || "").trim()
    ) {
      this.setState({
        plannerSettingsSelectedRelationshipId: "",
      });
    }
  };
  handleSavedCourseDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => {
      const lockedFields = this.getLockedSavedCourseDraftFields(
        previousState.savedCourseDraft,
      );
      if (
        fieldName !== "course_classSelection" &&
        lockedFields.has(fieldName)
      ) {
        return null;
      }
      let nextDraft = {
        ...previousState.savedCourseDraft,
        [fieldName]: nextValue,
      };
      if (fieldName === "course_classSelection") {
        nextDraft = this.applyPlannerRelationshipToSavedCourseDraft(
          nextDraft,
          this.getPlannerRelationshipForClass(
            previousState.plannerSelectSettings,
            nextDraft,
          ),
          true,
        );
      }
      if (fieldName !== "course_classSelection") {
        nextDraft = this.applyPlannerRelationshipToSavedCourseDraft(
          nextDraft,
          this.getPlannerRelationshipForClass(
            previousState.plannerSelectSettings,
            nextDraft,
          ),
          true,
        );
      }
      nextDraft.component_status =
        this.deriveSavedCourseComponentStatus(nextDraft);
      nextDraft.course_status = nextDraft.component_status;
      const selectedSavedCourseDraftComponentIndex = Number(
        previousState?.selectedSavedCourseDraftComponentIndex,
      );
      if (
        Number.isInteger(selectedSavedCourseDraftComponentIndex) &&
        selectedSavedCourseDraftComponentIndex >= 0
      ) {
        const stagedComponents = Array.isArray(
          previousState.savedCourseDraft?.course_components,
        )
          ? [...previousState.savedCourseDraft.course_components]
          : [];
        const nextComponentEntry =
          this.getSavedCourseDraftComponentEntryFromDraft(nextDraft);
        if (nextComponentEntry) {
          stagedComponents[selectedSavedCourseDraftComponentIndex] = {
            ...(stagedComponents[selectedSavedCourseDraftComponentIndex] || {}),
            ...nextComponentEntry,
          };
          nextDraft = {
            ...nextDraft,
            course_components: stagedComponents,
          };
        }
      }
      return {
        savedCourseDraft: nextDraft,
      };
    });
  };
  handleInlineLectureDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => {
      const hasSelectionContext =
        String(previousState.inlineLectureDraft?.lecture_courseId || "").trim()
          .length > 0 &&
        String(
          previousState.inlineLectureDraft?.lecture_componentId || "",
        ).trim().length > 0;
      const requiresSelectionContext = new Set([
        "lecture_name",
        "lecture_instructors",
        "lecture_writers",
        "lecture_date",
        "lecture_volume_total",
        "lecture_volume_done",
        "lecture_volume_remaining",
      ]);
      if (
        requiresSelectionContext.has(String(fieldName || "").trim()) &&
        !hasSelectionContext
      ) {
        return null;
      }
      return {
        inlineLectureDraft: {
          ...previousState.inlineLectureDraft,
          [fieldName]: nextValue,
        },
      };
    });
  };
  handleInlineLectureVolumeTotalChange = (nextValue) => {
    const normalizedTotal = Math.max(0, Number(nextValue || 0) || 0);
    this.setState((previousState) => {
      const hasSelectionContext =
        String(previousState.inlineLectureDraft?.lecture_courseId || "").trim()
          .length > 0 &&
        String(
          previousState.inlineLectureDraft?.lecture_componentId || "",
        ).trim().length > 0;
      if (!hasSelectionContext) {
        return null;
      }
      const previousFinished = Array.isArray(
        previousState.inlineLectureDraft?.lecture_pagesFinished,
      )
        ? previousState.inlineLectureDraft.lecture_pagesFinished
        : [];
      const lecturePagesFinished = previousFinished
        .map((entry) => Number(entry))
        .filter(
          (pageNumber) =>
            Number.isFinite(pageNumber) &&
            pageNumber >= 1 &&
            pageNumber <= normalizedTotal,
        )
        .sort((left, right) => left - right);
      return {
        inlineLectureDraft: {
          ...previousState.inlineLectureDraft,
          lecture_volume_total: nextValue,
          lecture_pagesFinished: lecturePagesFinished,
          lecture_volume_done: String(lecturePagesFinished.length),
          lecture_volume_remaining: String(
            Math.max(normalizedTotal - lecturePagesFinished.length, 0),
          ),
        },
      };
    });
  };
  toggleInlineLecturePageFinished = (pageNumber) => {
    const normalizedPage = Number(pageNumber || 0);
    if (!Number.isFinite(normalizedPage) || normalizedPage < 1) {
      return;
    }
    this.setState((previousState) => {
      const hasSelectionContext =
        String(previousState.inlineLectureDraft?.lecture_courseId || "").trim()
          .length > 0 &&
        String(
          previousState.inlineLectureDraft?.lecture_componentId || "",
        ).trim().length > 0;
      if (!hasSelectionContext) {
        return null;
      }
      const total = Math.max(
        0,
        Number(previousState.inlineLectureDraft?.lecture_volume_total || 0) ||
          0,
      );
      if (normalizedPage > total) {
        return null;
      }
      const previousFinished = Array.isArray(
        previousState.inlineLectureDraft?.lecture_pagesFinished,
      )
        ? previousState.inlineLectureDraft.lecture_pagesFinished
        : [];
      const nextSet = new Set(
        previousFinished
          .map((entry) => Number(entry))
          .filter(
            (entry) => Number.isFinite(entry) && entry >= 1 && entry <= total,
          ),
      );
      if (nextSet.has(normalizedPage)) {
        nextSet.delete(normalizedPage);
      } else {
        nextSet.add(normalizedPage);
      }
      const lecturePagesFinished = Array.from(nextSet).sort(
        (left, right) => left - right,
      );
      return {
        inlineLectureDraft: {
          ...previousState.inlineLectureDraft,
          lecture_pagesFinished: lecturePagesFinished,
          lecture_volume_done: String(lecturePagesFinished.length),
          lecture_volume_remaining: String(
            Math.max(total - lecturePagesFinished.length, 0),
          ),
        },
      };
    });
  };
  togglePlannerSettings = () => {
    this.setState((previousState) => ({
      plannerSettingsVisible: !previousState.plannerSettingsVisible,
    }));
  };
  handleBackFromPlannerSettings = () => {
    const restoreTab =
      String(this.state?.lastNonSettingsWrapperTab || "home").trim() || "home";
    this.setState({
      wrapperTab: restoreTab,
      plannerTab: restoreTab,
      plannerSettingsVisible: false,
    });
  };
  openInlineLectureRow = () => {
    const selectedCourseId = String(
      this.state?.selectedCourseForLecturesId || "",
    ).trim();
    const selectedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (course) => String(course?._id || "").trim() === selectedCourseId,
      ) || null;
    const defaultCourseLabel = selectedCourse
      ? buildCourseLectureMatchLabel(selectedCourse)
      : "";
    this.setState({
      inlineLectureRowVisible: true,
      inlineLectureDraft: this.applyPlannerFieldDefaultsToDraft(
        "inlineLecture",
        {
          ...getDefaultInlineLectureDraft(),
          lecture_courseId: selectedCourseId,
          lecture_componentId: "",
          lecture_component: "",
          lecture_course: defaultCourseLabel,
        },
      ),
      selectedTabItemId: null,
    });
  };
  closeInlineLectureRow = () => {
    this.setState({
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
    });
  };
  getLectureCourseOptions = () => {
    const uniqueByName = new Map();
    (Array.isArray(this.state?.courses) ? this.state.courses : []).forEach(
      (course) => {
        const courseName = String(course?.course_name || "").trim();
        const courseId = String(course?._id || "").trim();
        const hasComponents = Array.isArray(course?.course_components)
          ? course.course_components.length > 0
          : false;
        if (!courseName || !courseId) {
          return;
        }
        const existing = uniqueByName.get(courseName);
        if (existing) {
          if (!existing.hasComponents && hasComponents) {
            uniqueByName.set(courseName, {
              id: courseId,
              label: courseName,
              hasComponents,
            });
          }
          return;
        }
        uniqueByName.set(courseName, {
          id: courseId,
          label: courseName,
          hasComponents,
        });
      },
    );
    return Array.from(uniqueByName.values()).map(({ id, label }) => ({
      id,
      label,
    }));
  };
  getLectureComponentOptionsByCourseId = (courseId = "") => {
    const normalizedCourseValue = String(courseId || "").trim();
    if (!normalizedCourseValue) {
      return [];
    }
    const matchedCourses = (
      Array.isArray(this.state?.courses) ? this.state.courses : []
    ).filter(
      (course) => String(course?._id || "").trim() === normalizedCourseValue,
    );
    if (matchedCourses.length === 0) {
      return [];
    }
    const components = matchedCourses.flatMap((course) => {
      const sourceCourseId = String(course?._id || "").trim();
      const sourceItems = Array.isArray(course?.course_components)
        ? course.course_components
        : [];
      return sourceItems.map((component, index) => ({
        component,
        sourceCourseId,
        index,
      }));
    });
    return components
      .map(({ component, sourceCourseId, index }) => {
        const label = String(component?.course_class || "").trim();
        const id =
          String(component?._id || "").trim() || `${sourceCourseId}:${index}`;
        return { id, label };
      })
      .filter((entry) => entry.label)
      .reduce((accumulator, entry) => {
        if (!accumulator.some((item) => item.label === entry.label)) {
          accumulator.push(entry);
        }
        return accumulator;
      }, []);
  };
  getLectureComponentOptionsByCourseName = (courseId = "") =>
    this.getLectureComponentOptionsByCourseId(courseId);
  getLectureSettingsOptions = (type = "instructor") => {
    const settings =
      this.state?.plannerSelectSettings &&
      typeof this.state.plannerSelectSettings === "object"
        ? this.state.plannerSelectSettings
        : {};
    const listCandidates =
      type === "writer"
        ? [
            settings?.writerOptions,
            settings?.courseWritersOptions,
            settings?.writersOptions,
          ]
        : [
            settings?.instructorOptions,
            settings?.courseInstructorsOptions,
            settings?.instructorsOptions,
          ];
    const firstDefined = listCandidates.find((entry) => Array.isArray(entry));
    const fromSettings = Array.isArray(firstDefined) ? firstDefined : [];
    const fromCourses = (
      Array.isArray(this.state?.courses) ? this.state.courses : []
    )
      .flatMap((course) =>
        splitPlannerTextList(
          type === "writer" ? course?.course_writer : course?.course_instructor,
        ),
      )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    const fromLectures = (
      Array.isArray(this.state?.lectures) ? this.state.lectures : []
    )
      .flatMap((lecture) =>
        splitPlannerTextList(
          type === "writer"
            ? lecture?.lecture_writers || lecture?.lecture_writer
            : lecture?.lecture_instructors || lecture?.lecture_instructor,
        ),
      )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    return Array.from(
      new Set([...fromSettings, ...fromCourses, ...fromLectures]),
    );
  };
  handleInlineLectureCourseChange = (nextCourseId) => {
    const normalizedCourseId = String(nextCourseId || "").trim();
    const selectedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (course) => String(course?._id || "").trim() === normalizedCourseId,
      ) || null;
    this.setState((previousState) => ({
      inlineLectureDraft: {
        ...previousState.inlineLectureDraft,
        lecture_courseId: normalizedCourseId,
        lecture_course: selectedCourse
          ? buildCourseLectureMatchLabel(selectedCourse)
          : "",
        lecture_componentId: "",
        lecture_component: "",
      },
    }));
  };
  handleInlineLectureContentFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      return;
    }
    this.setState((previousState) => ({
      inlineLectureDraft: {
        ...previousState.inlineLectureDraft,
        lecture_contentUploads: [
          ...(Array.isArray(
            previousState.inlineLectureDraft?.lecture_contentUploads,
          )
            ? previousState.inlineLectureDraft.lecture_contentUploads
            : []),
          ...files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: String(file?.name || "").trim(),
            size: Number(file?.size) || 0,
            type: String(file?.type || "").trim(),
            file,
          })),
        ],
      },
    }));
  };
  removeInlineLectureContentFile = (fileId) => {
    const normalizedFileId = String(fileId || "").trim();
    this.setState((previousState) => ({
      inlineLectureDraft: {
        ...previousState.inlineLectureDraft,
        lecture_contentUploads: (Array.isArray(
          previousState.inlineLectureDraft?.lecture_contentUploads,
        )
          ? previousState.inlineLectureDraft.lecture_contentUploads
          : []
        ).filter(
          (entry) => String(entry?.id || "").trim() !== normalizedFileId,
        ),
      },
    }));
  };
  submitInlineLectureRow = async () => {
    const { inlineLectureDraft } = this.state;
    const lectureName = String(inlineLectureDraft?.lecture_name || "").trim();
    if (!lectureName) {
      return;
    }
    const contentUploads = Array.isArray(
      inlineLectureDraft?.lecture_contentUploads,
    )
      ? inlineLectureDraft.lecture_contentUploads
      : [];
    const totalVolume = Math.max(
      0,
      Number(inlineLectureDraft?.lecture_volume_total || 0) || 0,
    );
    const lecturePagesFinished = Array.isArray(
      inlineLectureDraft?.lecture_pagesFinished,
    )
      ? inlineLectureDraft.lecture_pagesFinished
          .map((entry) => Number(entry))
          .filter(
            (pageNumber) =>
              Number.isFinite(pageNumber) &&
              pageNumber >= 1 &&
              pageNumber <= totalVolume,
          )
          .sort((left, right) => left - right)
      : [];
    await this.addLecture({
      lecture_name: lectureName,
      lecture_course:
        String(inlineLectureDraft?.lecture_course || "").trim() ||
        this.state?.selectedCourseForLecturesName,
      lecture_component: String(
        inlineLectureDraft?.lecture_component || "",
      ).trim(),
      lecture_componentId: String(
        inlineLectureDraft?.lecture_componentId || "",
      ).trim(),
      lecture_instructor: splitPlannerTextList(
        inlineLectureDraft?.lecture_instructors,
      ),
      lecture_instructors: splitPlannerTextList(
        inlineLectureDraft?.lecture_instructors,
      ),
      lecture_writer: splitPlannerTextList(inlineLectureDraft?.lecture_writers),
      lecture_writers: splitPlannerTextList(
        inlineLectureDraft?.lecture_writers,
      ),
      lecture_date: String(inlineLectureDraft?.lecture_date || "").trim(),
      volume: {
        total: totalVolume,
        done: lecturePagesFinished.length,
        remaining: Math.max(totalVolume - lecturePagesFinished.length, 0),
      },
      lecture_volume_total: totalVolume,
      lecture_volume_done: lecturePagesFinished.length,
      lecture_volume_remaining: Math.max(
        totalVolume - lecturePagesFinished.length,
        0,
      ),
      lecture_length: totalVolume,
      lecture_content: contentUploads.map((entry, index) => ({
        order: index + 1,
        name: String(entry?.name || "").trim(),
        mimeType: String(entry?.type || "").trim(),
        bytes: Number(entry?.size) || 0,
      })),
      lecture_progress: {},
      lecture_pagesFinished: lecturePagesFinished,
      lecture_outlines: [],
      lecture_corrections: [],
      lecture_partOfPlan: true,
      lecture_hidden: false,
    });
  };
  addLecture = async (lecturePayload = {}) => {
    const userId = String(this.props?.state?.my_id || "").trim();
    const token = String(this.props?.state?.token || "").trim();
    if (!userId || !token) {
      this.props.serverReply(
        "Failed to save lecture: login data is incomplete.",
      );
      return false;
    }
    try {
      const response = await fetch(apiUrl("/api/user/addLecture/") + userId, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lecturePayload),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.props.serverReply(
          String(
            payload?.message || `Failed to save lecture (${response.status}).`,
          ),
        );
        return false;
      }
      this.setState(
        {
          inlineLectureRowVisible: false,
          inlineLectureDraft: getDefaultInlineLectureDraft(),
        },
        () => {
          this.retrieveLectures();
          this.retrieveCourses();
        },
      );
      this.props.serverReply(String(payload?.message || "Lecture saved."));
      return true;
    } catch (error) {
      this.props.serverReply(
        String(
          error?.message ||
            "Failed to save lecture because of a network error.",
        ),
      );
      return false;
    }
  };
  deleteLecture = async () => {
    const userId = String(this.props?.state?.my_id || "").trim();
    const token = String(this.props?.state?.token || "").trim();
    if (!userId || !token) {
      this.props.serverReply(
        "Failed to delete lecture: login data is incomplete.",
      );
      return false;
    }
    const lectureIds = (Array.isArray(checkedLectures) ? checkedLectures : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (lectureIds.length === 0) {
      return false;
    }
    try {
      for (let index = 0; index < lectureIds.length; index += 1) {
        const lectureId = lectureIds[index];
        const response = await fetch(
          apiUrl("/api/user/deleteLecture/") + userId + "/" + lectureId,
          {
            method: "DELETE",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          this.props.serverReply(
            String(
              payload?.message ||
                `Failed to delete lecture (${response.status}).`,
            ),
          );
          return false;
        }
      }
      checkedLectures = [];
      this.setState(
        {
          selectedTabItemId: null,
        },
        () => {
          this.retrieveLectures();
          this.retrieveCourses();
        },
      );
      this.props.serverReply("Lecture deleted.");
      return true;
    } catch (error) {
      this.props.serverReply(
        String(
          error?.message ||
            "Failed to delete lecture because of a network error.",
        ),
      );
      return false;
    }
  };
  appendSavedCourseScheduleEntry = () => {
    const dayValue = String(
      this.state.savedCourseDraft?.course_daySelection || "",
    ).trim();
    const timeValue = String(
      this.state.savedCourseDraft?.course_timeSelection || "",
    ).trim();
    if (!dayValue || !timeValue) {
      return;
    }
    const nextEntry = `${dayValue} (${timeValue})`;
    this.setState((previousState) => {
      const currentUnits = this.splitInlineCourseMultiValue(
        previousState.savedCourseDraft?.course_dayAndTime,
      ).filter((entry) => entry !== "-");
      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_dayAndTime: [...currentUnits, nextEntry].join(" | "),
          course_daySelection: "",
          course_timeSelection: "",
        },
      };
    });
  };
  handleSavedCourseScheduleEnter = (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    this.appendSavedCourseScheduleEntry();
  };
  appendSavedCourseComponentEntry = () => {
    const { savedCourseDraft } = this.state;
    const componentEntry =
      this.getSavedCourseDraftComponentEntryFromDraft(savedCourseDraft);
    if (!componentEntry || componentEntry.course_class === "-") {
      return;
    }
    this.setState((previousState) => {
      const currentComponents = Array.isArray(
        previousState.savedCourseDraft?.course_components,
      )
        ? previousState.savedCourseDraft.course_components
        : [];
      const selectedSavedCourseDraftComponentIndex = Number(
        previousState?.selectedSavedCourseDraftComponentIndex,
      );
      const duplicateExists = currentComponents.some(
        (entry, entryIndex) =>
          entryIndex !== selectedSavedCourseDraftComponentIndex &&
          String(entry?.course_class || "").trim() ===
            String(componentEntry.course_class || "").trim() &&
          String(
            entry?.normativeCourseYearNum || entry?.programYear || "",
          ).trim() ===
            String(
              componentEntry.normativeCourseYearNum ||
                componentEntry.programYear ||
                "",
            ).trim() &&
          String(entry?.normativeCourseTerm || "").trim() ===
            String(componentEntry.normativeCourseTerm || "").trim() &&
          String(entry?.actualCourseYearNum || "").trim() ===
            String(componentEntry.actualCourseYearNum || "").trim() &&
          String(
            entry?.actualCourseYearInterval || entry?.course_year || "",
          ).trim() ===
            String(
              componentEntry.actualCourseYearInterval ||
                componentEntry.course_year ||
                "",
            ).trim() &&
          String(entry?.actualCourseTerm || entry?.course_term || "").trim() ===
            String(
              componentEntry.actualCourseTerm ||
                componentEntry.course_term ||
                "",
            ).trim(),
      );
      if (duplicateExists) {
        return null;
      }
      const nextComponents = [...currentComponents];
      let nextSelectedComponentIndex = selectedSavedCourseDraftComponentIndex;
      if (
        Number.isInteger(selectedSavedCourseDraftComponentIndex) &&
        selectedSavedCourseDraftComponentIndex >= 0
      ) {
        nextComponents[selectedSavedCourseDraftComponentIndex] = {
          ...(nextComponents[selectedSavedCourseDraftComponentIndex] || {}),
          ...componentEntry,
        };
        nextSelectedComponentIndex = selectedSavedCourseDraftComponentIndex;
      } else {
        nextComponents.push(componentEntry);
        nextSelectedComponentIndex = nextComponents.length - 1;
      }
      const nextDraft = this.applySavedCourseDraftComponentEntryToDraft(
        {
          ...previousState.savedCourseDraft,
          course_components: nextComponents,
        },
        nextComponents[nextSelectedComponentIndex] || componentEntry,
      );
      return {
        selectedSavedCourseDraftComponentIndex: nextSelectedComponentIndex,
        savedCourseComponentDraftActive: false,
        savedCourseDraft: nextDraft,
      };
    });
  };
  startAddingNewSavedCourseComponent = () => {
    this.setState((previousState) => ({
      savedCourseComponentDraftActive: true,
      selectedSavedCourseDraftComponentIndex: -1,
      savedCourseDraft: this.getResetSavedCourseComponentDraftFields(
        previousState.savedCourseDraft,
      ),
    }));
  };
  deleteSelectedSavedCourseDraftComponent = () => {
    const selectedIndex = Number(
      this.state?.selectedSavedCourseDraftComponentIndex,
    );
    const stagedComponents = Array.isArray(
      this.state?.savedCourseDraft?.course_components,
    )
      ? this.state.savedCourseDraft.course_components
      : [];
    if (stagedComponents.length === 0) {
      return;
    }
    if (Number.isInteger(selectedIndex) && selectedIndex >= 0) {
      this.removeSavedCourseComponentEntry(selectedIndex);
      return;
    }
    this.removeSavedCourseComponentEntry(stagedComponents.length - 1);
  };
  cancelSavedCourseComponentDraftEdit = () => {
    this.setState((previousState) => {
      const selectedIndex = Number(
        previousState?.selectedSavedCourseDraftComponentIndex,
      );
      const stagedComponents = Array.isArray(
        previousState?.savedCourseDraft?.course_components,
      )
        ? previousState.savedCourseDraft.course_components
        : [];
      if (Number.isInteger(selectedIndex) && selectedIndex >= 0) {
        const selectedEntry = stagedComponents[selectedIndex] || null;
        if (selectedEntry) {
          return {
            savedCourseComponentDraftActive: false,
            savedCourseDraft: this.applySavedCourseDraftComponentEntryToDraft(
              previousState.savedCourseDraft,
              selectedEntry,
            ),
          };
        }
      }
      return {
        savedCourseComponentDraftActive: false,
        selectedSavedCourseDraftComponentIndex: -1,
        savedCourseDraft: this.getResetSavedCourseComponentDraftFields(
          previousState.savedCourseDraft,
        ),
      };
    });
  };
  removeSavedCourseComponentEntry = (entryIndexToRemove) => {
    this.setState((previousState) => {
      const nextComponents = (
        Array.isArray(previousState.savedCourseDraft?.course_components)
          ? previousState.savedCourseDraft.course_components
          : []
      ).filter((_, entryIndex) => entryIndex !== entryIndexToRemove);
      const removedSelectedEntry =
        previousState.selectedSavedCourseDraftComponentIndex ===
        entryIndexToRemove;
      return {
        selectedSavedCourseDraftComponentIndex: removedSelectedEntry
          ? -1
          : previousState.selectedSavedCourseDraftComponentIndex >
              entryIndexToRemove
            ? previousState.selectedSavedCourseDraftComponentIndex - 1
            : previousState.selectedSavedCourseDraftComponentIndex,
        savedCourseDraft: {
          ...(removedSelectedEntry
            ? this.getResetSavedCourseComponentDraftFields(
                previousState.savedCourseDraft,
              )
            : previousState.savedCourseDraft),
          course_components: nextComponents,
        },
      };
    });
  };
  removeSavedCourseScheduleEntry = (entryIndexToRemove) => {
    this.setState((previousState) => {
      const nextUnits = this.splitInlineCourseMultiValue(
        previousState.savedCourseDraft?.course_dayAndTime,
      ).filter(
        (entry, entryIndex) =>
          entry !== "-" && entryIndex !== entryIndexToRemove,
      );
      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_dayAndTime: nextUnits.join(" | "),
        },
      };
    });
  };
  openSavedCourseEditor = (mode = "add") => {
    const safeMode = mode === "edit" ? "edit" : "add";
    const allCourses = Array.isArray(this.state?.courses)
      ? this.state.courses
      : [];
    const selectedComponentId = String(
      this.state?.savedCourseDetailsComponentId ||
        (Array.isArray(this.state?.selectedSavedCourseIds)
          ? this.state.selectedSavedCourseIds[0]
          : "") ||
        this.state?.selectedCourseForLecturesId ||
        "",
    ).trim();
    const selectedCourse =
      allCourses.find(
        (course) => String(course?._id || "").trim() === selectedComponentId,
      ) || null;
    const getNormalizedCourseIdentity = (course = {}) => ({
      parentCourseId: String(course?.parentCourseId || "").trim(),
      compositeKey: [
        String(course?.course_code || "")
          .trim()
          .toLowerCase(),
        String(course?.course_name || "")
          .trim()
          .toLowerCase(),
      ].join("|"),
    });
    const selectedCourseIdentity = getNormalizedCourseIdentity(
      selectedCourse || {},
    );
    const selectedCourseGroup = selectedCourse
      ? allCourses.filter((courseEntry) => {
          const entryIdentity = getNormalizedCourseIdentity(courseEntry);
          if (
            selectedCourseIdentity.parentCourseId &&
            entryIdentity.parentCourseId &&
            selectedCourseIdentity.parentCourseId ===
              entryIdentity.parentCourseId
          ) {
            return true;
          }
          return (
            entryIdentity.compositeKey === selectedCourseIdentity.compositeKey
          );
        })
      : [];
    const selectedCourseGroupComponentIndex = selectedCourse
      ? selectedCourseGroup.findIndex(
          (courseEntry) =>
            String(courseEntry?._id || "").trim() === selectedComponentId,
        )
      : -1;
    const toDraftComponentEntry = (courseEntry = {}) => {
      const courseLocation =
        courseEntry?.course_location &&
        typeof courseEntry.course_location === "object"
          ? courseEntry.course_location
          : {};
      return {
        course_componentId: String(
          courseEntry?.primaryComponentId || courseEntry?._id || "",
        ).trim(),
        course_class: String(
          courseEntry?.course_class || courseEntry?.course_component || "",
        ).trim(),
        component_status: String(courseEntry?.component_status || "").trim(),
        normativeCourseYearNum: normalizeProgramYearValue(
          courseEntry?.normativeCourseYearNum ||
            courseEntry?.time?.Normative?.courseYearNum ||
            courseEntry?.programYear ||
            courseEntry?.course_programYear ||
            courseEntry?.time?.programYear,
        ),
        normativeCourseYearInterval: normalizeAcademicYearValue(
          courseEntry?.normativeCourseYearInterval ||
            courseEntry?.time?.Normative?.courseYearInterval,
        ),
        normativeCourseTerm:
          String(
            courseEntry?.normativeCourseTerm ||
              courseEntry?.time?.Normative?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                courseEntry?.normativeCourseTerm ||
                  courseEntry?.time?.Normative?.courseTerm ||
                  "",
              ).trim(),
        actualCourseYearNum: normalizeProgramYearValue(
          courseEntry?.actualCourseYearNum ||
            courseEntry?.time?.actual?.courseYearNum,
        ),
        actualCourseYearInterval: normalizeAcademicYearValue(
          courseEntry?.actualCourseYearInterval ||
            courseEntry?.course_year ||
            courseEntry?.time?.actual?.courseYearInterval,
        ),
        actualCourseTerm:
          String(
            courseEntry?.actualCourseTerm ||
              courseEntry?.course_term ||
              courseEntry?.time?.actual?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                courseEntry?.actualCourseTerm ||
                  courseEntry?.course_term ||
                  courseEntry?.time?.actual?.courseTerm ||
                  "",
              ).trim(),
        programYear: normalizeProgramYearValue(
          courseEntry?.programYear || courseEntry?.course_programYear,
        ),
        course_dayAndTime: formatCourseScheduleDisplay(
          courseEntry?.course_dayAndTime,
        ),
        course_year: normalizeAcademicYearValue(
          courseEntry?.course_year || courseEntry?.actualCourseYearInterval,
        ),
        course_term: String(
          courseEntry?.course_term || courseEntry?.actualCourseTerm || "",
        ).trim(),
        course_grade: String(courseEntry?.course_grade || "").trim(),
        course_locationBuilding: String(
          courseEntry?.course_locationBuilding ||
            courseLocation?.building ||
            "",
        ).trim(),
        course_locationRoom: String(
          courseEntry?.course_locationRoom || courseLocation?.room || "",
        ).trim(),
      };
    };
    const buildDraftFromCourse = (course = null, groupedCourses = []) => {
      const courseLocation =
        course?.course_location && typeof course.course_location === "object"
          ? course.course_location
          : {};
      return {
        course_code: String(course?.course_code || "").trim(),
        course_status: String(course?.course_status || "").trim(),
        courseWeight: String(
          course?.courseWeight || course?.course_totalWeight || "",
        ).trim(),
        component_status: String(course?.component_status || "").trim(),
        course_exams: Array.isArray(course?.course_exams)
          ? course.course_exams
          : [],
        course_components: Array.isArray(groupedCourses)
          ? groupedCourses.map((courseEntry) =>
              toDraftComponentEntry(courseEntry),
            )
          : [],
        normativeCourseYearNum: normalizeProgramYearValue(
          course?.normativeCourseYearNum ||
            course?.time?.Normative?.courseYearNum ||
            course?.programYear ||
            course?.course_programYear ||
            course?.time?.programYear,
        ),
        normativeCourseYearInterval: normalizeAcademicYearValue(
          course?.normativeCourseYearInterval ||
            course?.time?.Normative?.courseYearInterval,
        ),
        normativeCourseTerm:
          String(
            course?.normativeCourseTerm ||
              course?.time?.Normative?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                course?.normativeCourseTerm ||
                  course?.time?.Normative?.courseTerm ||
                  "",
              ).trim(),
        actualCourseYearNum: normalizeProgramYearValue(
          course?.actualCourseYearNum || course?.time?.actual?.courseYearNum,
        ),
        actualCourseYearInterval: normalizeAcademicYearValue(
          course?.actualCourseYearInterval ||
            course?.course_year ||
            course?.time?.actual?.courseYearInterval,
        ),
        actualCourseTerm:
          String(
            course?.actualCourseTerm ||
              course?.course_term ||
              course?.time?.actual?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                course?.actualCourseTerm ||
                  course?.course_term ||
                  course?.time?.actual?.courseTerm ||
                  "",
              ).trim(),
        course_name: String(course?.course_name || "").trim(),
        course_class: String(
          course?.course_class || course?.course_component || "",
        ).trim(),
        course_classSelection: "",
        course_dayAndTime: formatCourseScheduleDisplay(
          course?.course_dayAndTime,
        ),
        course_daySelection: "",
        course_timeSelection: "",
        course_grade: String(course?.course_grade || "").trim(),
        course_locationBuilding: String(courseLocation?.building || "").trim(),
        course_locationRoom: String(courseLocation?.room || "").trim(),
      };
    };
    const nextDraft =
      safeMode === "edit" && selectedCourse
        ? buildDraftFromCourse(selectedCourse, selectedCourseGroup)
        : this.buildSavedCourseDraftWithPlannerSettings(
            getDefaultSavedCourseDraft(),
          );
    const nextSelectedSavedCourseDraftComponentIndex =
      safeMode === "edit" && selectedCourseGroupComponentIndex >= 0
        ? selectedCourseGroupComponentIndex
        : -1;
    const nextSelectedComponentEntry =
      nextSelectedSavedCourseDraftComponentIndex >= 0 &&
      Array.isArray(nextDraft?.course_components)
        ? nextDraft.course_components[
            nextSelectedSavedCourseDraftComponentIndex
          ] || null
        : null;
    const hydratedDraft =
      safeMode === "edit" && nextSelectedComponentEntry
        ? this.applySavedCourseDraftComponentEntryToDraft(
            { ...nextDraft },
            nextSelectedComponentEntry,
          )
        : nextDraft;
    this.setState({
      plannerTab: safeMode === "edit" ? "courses" : this.state.plannerTab,
      savedCourseEditorVisible: true,
      savedCourseEditorMode: safeMode,
      savedCourseComponentDraftActive: safeMode !== "edit",
      savedCourseDraft: {
        ...hydratedDraft,
        course_status: this.deriveSavedCourseComponentStatus(hydratedDraft),
        component_status: this.deriveSavedCourseComponentStatus(hydratedDraft),
      },
      selectedSavedCourseDraftComponentIndex:
        nextSelectedSavedCourseDraftComponentIndex,
    });
  };
  cloneSelectedSavedCourseToEditor = () => {
    const selectedComponentId = String(
      this.state?.savedCourseDetailsComponentId ||
        (Array.isArray(this.state?.selectedSavedCourseIds)
          ? this.state.selectedSavedCourseIds[0]
          : "") ||
        this.state?.selectedCourseForLecturesId ||
        "",
    ).trim();
    const selectedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (course) => String(course?._id || "").trim() === selectedComponentId,
      ) || null;
    const selectedLocation =
      selectedCourse?.course_location &&
      typeof selectedCourse.course_location === "object"
        ? selectedCourse.course_location
        : {};
    if (!selectedCourse) {
      this.openSavedCourseEditor("add");
      return;
    }
    this.setState({
      savedCourseEditorVisible: true,
      savedCourseEditorMode: "add",
      selectedSavedCourseDraftComponentIndex: -1,
      savedCourseDraft: {
        course_code: String(selectedCourse?.course_code || "").trim(),
        course_status: String(selectedCourse?.course_status || "").trim(),
        courseWeight: String(
          selectedCourse?.courseWeight || selectedCourse?.course_totalWeight || "",
        ).trim(),
        component_status: String(selectedCourse?.component_status || "").trim(),
        course_components: [],
        normativeCourseYearNum: normalizeProgramYearValue(
          selectedCourse?.normativeCourseYearNum ||
            selectedCourse?.time?.Normative?.courseYearNum ||
            selectedCourse?.programYear ||
            selectedCourse?.course_programYear ||
            selectedCourse?.time?.programYear,
        ),
        normativeCourseYearInterval: normalizeAcademicYearValue(
          selectedCourse?.normativeCourseYearInterval ||
            selectedCourse?.time?.Normative?.courseYearInterval,
        ),
        normativeCourseTerm:
          String(
            selectedCourse?.normativeCourseTerm ||
              selectedCourse?.time?.Normative?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                selectedCourse?.normativeCourseTerm ||
                  selectedCourse?.time?.Normative?.courseTerm ||
                  "",
              ).trim(),
        actualCourseYearNum: normalizeProgramYearValue(
          selectedCourse?.actualCourseYearNum ||
            selectedCourse?.time?.actual?.courseYearNum,
        ),
        actualCourseYearInterval: normalizeAcademicYearValue(
          selectedCourse?.actualCourseYearInterval ||
            selectedCourse?.course_year ||
            selectedCourse?.time?.actual?.courseYearInterval,
        ),
        actualCourseTerm:
          String(
            selectedCourse?.actualCourseTerm ||
              selectedCourse?.course_term ||
              selectedCourse?.time?.actual?.courseTerm ||
              "",
          ).trim() === "-"
            ? ""
            : String(
                selectedCourse?.actualCourseTerm ||
                  selectedCourse?.course_term ||
                  selectedCourse?.time?.actual?.courseTerm ||
                  "",
              ).trim(),
        course_name: String(selectedCourse?.course_name || "").trim(),
        course_class: String(
          selectedCourse?.course_class ||
            selectedCourse?.course_component ||
            "",
        ).trim(),
        course_classSelection: "",
        course_dayAndTime: formatCourseScheduleDisplay(
          selectedCourse?.course_dayAndTime,
        ),
        course_daySelection: "",
        course_timeSelection: "",
        course_grade: String(selectedCourse?.course_grade || "").trim(),
        course_locationBuilding: String(
          selectedLocation?.building || "",
        ).trim(),
        course_locationRoom: String(selectedLocation?.room || "").trim(),
      },
    });
  };
  closeSavedCourseEditor = () => {
    this.setState({
      savedCourseEditorVisible: false,
      savedCourseEditorMode: "add",
      savedCourseComponentDraftActive: true,
      savedCourseDraft: getDefaultSavedCourseDraft(),
      selectedSavedCourseDraftComponentIndex: -1,
    });
  };
  handleSavedCourseSort = (sortKey) => {
    this.setState((previousState) => {
      const nextDirection =
        previousState.savedCourseSortKey === sortKey &&
        previousState.savedCourseSortDirection === "asc"
          ? "desc"
          : "asc";
      return {
        savedCourseSortKey: sortKey,
        savedCourseSortDirection: nextDirection,
      };
    });
  };
  getSortedSavedCourses = (entries = []) => {
    const { savedCourseSortKey, savedCourseSortDirection } = this.state;
    const directionMultiplier = savedCourseSortDirection === "desc" ? -1 : 1;
    const normalizedEntries = Array.isArray(entries) ? [...entries] : [];
    const getCourseGroupKey = (course = {}) =>
      String(course?.parentCourseId || "").trim() ||
      [
        String(course?.course_code || "")
          .trim()
          .toLowerCase(),
        String(course?.course_name || "")
          .trim()
          .toLowerCase(),
      ].join("|");
    const getComparableValue = (course) => {
      switch (savedCourseSortKey) {
        case "course_name":
          return formatSavedCourseTitle(course);
        case "course_status":
          return formatPlannerStatusLabel(course?.course_status);
        case "course_class":
          return formatSavedCourseComponent(course, "ar");
        case "course_schedule":
          return formatCourseScheduleDisplay(course?.course_dayAndTime);
        case "course_location":
          return formatCourseLocationDisplay(course?.course_location);
        case "course_grade":
        case "course_weight":
          return String(course?.course_grade || "-");
        default:
          return formatSavedCourseTitle(course);
      }
    };
    const compareSavedCourseValues = (leftCourse, rightCourse) => {
      if (savedCourseSortKey === "program_year") {
        return (
          getProgramYearSortValue(leftCourse) -
          getProgramYearSortValue(rightCourse)
        );
      }
      if (savedCourseSortKey === "course_year_term") {
        const leftProgramYear = getProgramYearSortValue(leftCourse);
        const rightProgramYear = getProgramYearSortValue(rightCourse);
        if (leftProgramYear !== rightProgramYear) {
          return leftProgramYear - rightProgramYear;
        }
        const leftYear = getAcademicYearSortValue(
          normalizeAcademicYearValue(leftCourse?.course_year),
        );
        const rightYear = getAcademicYearSortValue(
          normalizeAcademicYearValue(rightCourse?.course_year),
        );
        if (leftYear !== rightYear) {
          return leftYear - rightYear;
        }
        return (
          getPlannerTermRank(leftCourse?.course_term) -
          getPlannerTermRank(rightCourse?.course_term)
        );
      }
      return String(getComparableValue(leftCourse) || "")
        .trim()
        .localeCompare(
          String(getComparableValue(rightCourse) || "").trim(),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          },
        );
    };
    normalizedEntries.sort((leftCourse, rightCourse) => {
      const leftGroupKey = getCourseGroupKey(leftCourse);
      const rightGroupKey = getCourseGroupKey(rightCourse);
      if (leftGroupKey !== rightGroupKey) {
        return (
          String(leftCourse?.course_name || "")
            .trim()
            .localeCompare(
              String(rightCourse?.course_name || "").trim(),
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            ) ||
          String(leftCourse?.course_code || "")
            .trim()
            .localeCompare(
              String(rightCourse?.course_code || "").trim(),
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            )
        );
      }
      return (
        compareSavedCourseValues(leftCourse, rightCourse) * directionMultiplier
      );
    });
    return normalizedEntries;
  };
  handleExamBoardSort = (sortKey) => {
    this.setState((previousState) => {
      const nextDirection =
        previousState.examBoardSortKey === sortKey &&
        previousState.examBoardSortDirection === "asc"
          ? "desc"
          : "asc";
      return {
        examBoardSortKey: sortKey,
        examBoardSortDirection: nextDirection,
      };
    });
  };
  getSortedExamBoardRows = (entries = []) => {
    const { examBoardSortKey, examBoardSortDirection } = this.state;
    const directionMultiplier = examBoardSortDirection === "desc" ? -1 : 1;
    const normalizedEntries = Array.isArray(entries) ? [...entries] : [];
    const getComparableValue = ({ course, examEntry }) => {
      switch (examBoardSortKey) {
        case "course_name":
          return String(course?.course_name || "").trim();
        case "type":
          return String(examEntry?.type || examEntry?.exam_type || "").trim();
        case "time":
          return formatExamTimingDisplay(examEntry, "ar");
        case "location":
          return formatCourseLocationDisplay(examEntry?.location || {});
        case "volume":
          return formatExamVolumeDisplay(examEntry);
        case "weight":
          return formatExamWeightDisplay(examEntry);
        default:
          return String(course?.course_name || "").trim();
      }
    };
    normalizedEntries.sort((leftEntry, rightEntry) => {
      const leftValue = getComparableValue(leftEntry);
      const rightValue = getComparableValue(rightEntry);
      if (examBoardSortKey === "weight" || examBoardSortKey === "volume") {
        const leftNumber = Number(leftValue);
        const rightNumber = Number(rightValue);
        const leftComparable = Number.isFinite(leftNumber) ? leftNumber : -1;
        const rightComparable = Number.isFinite(rightNumber) ? rightNumber : -1;
        if (leftComparable !== rightComparable) {
          return (leftComparable - rightComparable) * directionMultiplier;
        }
      }
      return (
        leftValue.localeCompare(rightValue, undefined, {
          numeric: true,
          sensitivity: "base",
        }) * directionMultiplier
      );
    });
    return normalizedEntries;
  };
  handleLectureSort = (sortKey) => {
    this.setState((previousState) => {
      const nextDirection =
        previousState.lectureSortKey === sortKey &&
        previousState.lectureSortDirection === "asc"
          ? "desc"
          : "asc";
      return {
        lectureSortKey: sortKey,
        lectureSortDirection: nextDirection,
      };
    });
  };
  getSortedLectures = (entries = []) => {
    const { lectureSortKey, lectureSortDirection } = this.state;
    const directionMultiplier = lectureSortDirection === "desc" ? -1 : 1;
    const normalizedEntries = Array.isArray(entries) ? [...entries] : [];
    const getComparableValue = (lecture) => {
      switch (lectureSortKey) {
        case "lecture_name":
          return String(lecture?.lecture_name || "").trim();
        case "lecture_instructors":
          return formatPlannerTextList(
            lecture?.lecture_instructors || lecture?.lecture_instructor,
          );
        case "lecture_writers":
          return formatPlannerTextList(
            lecture?.lecture_writers || lecture?.lecture_writer,
          );
        case "lecture_date":
          return String(lecture?.lecture_date || "").trim();
        default:
          return String(lecture?.lecture_name || "").trim();
      }
    };
    normalizedEntries.sort((leftLecture, rightLecture) => {
      const leftValue = getComparableValue(leftLecture);
      const rightValue = getComparableValue(rightLecture);
      if (lectureSortKey === "lecture_date") {
        const leftTime = Date.parse(leftValue || "") || 0;
        const rightTime = Date.parse(rightValue || "") || 0;
        if (leftTime !== rightTime) {
          return (leftTime - rightTime) * directionMultiplier;
        }
      }
      return (
        leftValue.localeCompare(rightValue, undefined, {
          numeric: true,
          sensitivity: "base",
        }) * directionMultiplier
      );
    });
    return normalizedEntries;
  };
  submitSavedCourseEditor = async () => {
    const {
      savedCourseDraft,
      savedCourseEditorMode,
      selectedCourseForLecturesId,
      savedCourseDetailsComponentId,
      selectedSavedCourseDraftComponentIndex,
    } = this.state;
    const courseName = String(savedCourseDraft?.course_name || "").trim();
    const courseCode = String(savedCourseDraft?.course_code || "").trim();
    const courseWeight = String(
      savedCourseDraft?.courseWeight ||
        savedCourseDraft?.course_totalWeight ||
        "",
    ).trim();
    if (!courseName) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.genericRetry);
      return;
    }
    if (savedCourseEditorMode === "edit") {
      const selectedComponentId = String(
        savedCourseDetailsComponentId || selectedCourseForLecturesId || "",
      ).trim();
      const selectedCourse =
        (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
          (course) => String(course?._id || "").trim() === selectedComponentId,
        ) || null;
      if (!selectedCourse) {
        return;
      }
      const componentId = String(
        selectedCourse?.primaryComponentId || selectedCourse?._id || "",
      ).trim();
      const editTargetId =
        componentId ||
        String(
          selectedCourse?.parentCourseId || selectedCourse?._id || "",
        ).trim();
      if (!editTargetId) {
        return;
      }
      const stagedComponents = Array.isArray(
        savedCourseDraft?.course_components,
      )
        ? [...savedCourseDraft.course_components]
        : [];
      if (stagedComponents.length === 0) {
        this.props.serverReply(NOGAPLANNER_TEXT.messages.componentTypeRequired);
        return;
      }
      await fetch(
        apiUrl("/api/user/editCourseBundle/") +
          this.props.state.my_id +
          "/" +
          editTargetId,
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: "Bearer " + this.props.state.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_name: courseName,
            course_code: courseCode,
            courseWeight: courseWeight || "",
            components: stagedComponents.map((componentEntry) => ({
              course_componentId:
                String(componentEntry?.course_componentId || "").trim() ||
                undefined,
              course_class: componentEntry?.course_class || "",
              normativeCourseYearNum: componentEntry?.normativeCourseYearNum
                ? Number(componentEntry.normativeCourseYearNum)
                : null,
              normativeCourseYearInterval:
                componentEntry?.normativeCourseYearInterval || "",
              normativeCourseTerm: componentEntry?.normativeCourseTerm || "",
              actualCourseYearNum: componentEntry?.actualCourseYearNum
                ? Number(componentEntry.actualCourseYearNum)
                : null,
              actualCourseYearInterval:
                componentEntry?.actualCourseYearInterval || "",
              actualCourseTerm: componentEntry?.actualCourseTerm || "",
              programYear: componentEntry?.programYear
                ? Number(componentEntry.programYear)
                : null,
              course_dayAndTime: Array.isArray(
                componentEntry?.course_dayAndTime,
              )
                ? componentEntry.course_dayAndTime
                : [],
              course_year: componentEntry?.course_year || "",
              academicYear: componentEntry?.course_year || "",
              course_term: componentEntry?.course_term || "",
              term: componentEntry?.course_term || "",
              course_grade: componentEntry?.course_grade || "",
              course_locationBuilding:
                componentEntry?.course_locationBuilding || "",
              course_locationRoom: componentEntry?.course_locationRoom || "",
            })),
          }),
        },
      );
      this.commitPlannerPendingInputMemory();
      this.rememberPlannerInputEntries({
        course_name: courseName,
        course_code: courseCode,
        courseWeight,
      });
      stagedComponents.forEach((componentEntry) => {
        this.rememberPlannerInputEntries({
          course_grade: componentEntry?.course_grade || "",
        });
      });
      this.closeSavedCourseEditor();
      this.retrieveCourses(editTargetId);
      return;
    }
    const stagedComponents = Array.isArray(savedCourseDraft?.course_components)
      ? [...savedCourseDraft.course_components]
      : [];
    if (stagedComponents.length === 0) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.componentTypeRequired);
      return;
    }
    const courseResponse = await fetch(
      apiUrl("/api/user/addCourse/") + this.props.state.my_id,
      {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_name: courseName,
          course_code: courseCode,
          courseWeight: courseWeight || "",
          course_components: stagedComponents.map((componentEntry) => ({
            course_class: componentEntry.course_class || "-",
            normativeCourseYearNum: componentEntry.normativeCourseYearNum
              ? Number(componentEntry.normativeCourseYearNum)
              : null,
            normativeCourseYearInterval:
              componentEntry.normativeCourseYearInterval || "",
            normativeCourseTerm: componentEntry.normativeCourseTerm || "",
            actualCourseYearNum: componentEntry.actualCourseYearNum
              ? Number(componentEntry.actualCourseYearNum)
              : null,
            actualCourseYearInterval:
              componentEntry.actualCourseYearInterval || "-",
            actualCourseTerm: componentEntry.actualCourseTerm || "-",
            programYear: componentEntry.programYear
              ? Number(componentEntry.programYear)
              : null,
            course_year: componentEntry.course_year || "-",
            academicYear: componentEntry.course_year || "-",
            course_term: componentEntry.course_term || "-",
            term: componentEntry.course_term || "-",
            course_dayAndTime: componentEntry.course_dayAndTime || "-",
            course_grade: componentEntry.course_grade || "-",
            course_locationBuilding:
              componentEntry.course_locationBuilding || "",
            course_locationRoom: componentEntry.course_locationRoom || "",
          })),
        }),
      },
    );
    if (!courseResponse.ok) {
      const errorPayload = await courseResponse.json().catch(() => ({}));
      const serverMessage = String(errorPayload?.message || "").trim();
      this.props.serverReply(
        serverMessage || NOGAPLANNER_TEXT.messages.courseSaveError,
      );
      return;
    }
    this.commitPlannerPendingInputMemory();
    this.props.serverReply(
      `${courseName} ${NOGAPLANNER_TEXT.messages.courseAddedSuffix}`,
    );
    this.rememberPlannerInputEntries({
      course_name: courseName,
      course_code: courseCode,
      courseWeight,
    });
    stagedComponents.forEach((componentEntry) => {
      this.rememberPlannerInputEntries({
        course_grade: componentEntry?.course_grade || "",
      });
    });
    this.closeSavedCourseEditor();
    this.setState({
      selectedSavedCourseIds: [],
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      savedCourseDetailsComponentId: "",
      selectedTabItemId: null,
    });
    this.retrieveCourses();
  };
  deleteSelectedSavedCourse = async () => {
    const selectedComponentIds = (
      Array.isArray(this.state?.selectedSavedCourseIds)
        ? this.state.selectedSavedCourseIds
        : [this.state?.selectedCourseForLecturesId]
    )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (selectedComponentIds.length === 0) {
      return;
    }
    for (let index = 0; index < selectedComponentIds.length; index += 1) {
      const selectedComponentId = selectedComponentIds[index];
      await fetch(
        apiUrl("/api/user/deleteCourse/") +
          this.props.state.my_id +
          "/" +
          selectedComponentId,
        {
          method: "DELETE",
          mode: "cors",
          headers: {
            Authorization: "Bearer " + this.props.state.token,
            "Content-Type": "application/json",
          },
        },
      );
    }
    this.setState({
      selectedSavedCourseIds: [],
      savedCourseSelectionMode: false,
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      savedCourseDetailsComponentId: "",
      selectedTabItemId: null,
      plannerTab: "courses",
    });
    this.retrieveCourses();
  };
  renderSelectedCourseLecturesTable = (renderMode = "full") => {
    return (
      <NogaPlannerLecturesTablePanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
        renderMode={renderMode}
      />
    );
  };
  renderTabDetailsPanel = () => {
    const { plannerTab } = this.state;
    const item = this.getSelectedTabItem();
    if (!item) {
      return (
        <div id="nogaPlanner_monitorEmpty" className="nogaPlanner_monitorEmpty">
          {NOGAPLANNER_TEXT.messages.selectItemForDetails}
        </div>
      );
    }
    if (plannerTab === "courses") {
      // Show course details
      return (
        <section
          id="nogaPlanner_course_detailsSection"
          className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--monitor"
        >
          <div id="nogaPlanner_monitorDetails" className="nogaPlanner_monitorDetails">
            <h2 id="nogaPlanner_course_detailsName">{item.course_name}</h2>
            <p id="nogaPlanner_course_detailsComponent">
              {formatCourseComponentLabel(
                item.course_component || item.course_class,
                "ar",
              )}
            </p>
            <p id="nogaPlanner_course_detailsSchedule">{formatCourseScheduleDisplay(item.course_dayAndTime)}</p>
            <p id="nogaPlanner_course_detailsYear">{`${"Original Year"}: ${normalizeProgramYearValue(item.programYear || item.course_programYear || item.time?.programYear) || "-"}`}</p>
            <p id="nogaPlanner_course_detailsLocation">{formatCourseLocationDisplay(item.course_location)}</p>
            <p id="nogaPlanner_course_detailsWeight">{`${"Weight"}: ${item.course_grade || "-"}`}</p>
            <p id="nogaPlanner_course_detailsGrade">{`${"Grade"}: ${item.course_fullGrade || "-"}`}</p>
            <p id="nogaPlanner_course_detailsVolume">{`${"Volume"}: ${item.course_length || 0}`}</p>
            <p id="nogaPlanner_course_detailsProgress">{`${"Progress"}: ${item.course_progress || 0}`}</p>
          </div>
        </section>
      );
    } else {
      // Show lecture details
      return (
        <section
          id="nogaPlanner_lectures_section"
          className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--monitor"
        >
          <div id="nogaPlanner_lecture_monitorDetails" className="nogaPlanner_monitorDetails">
            <h2 id="nogaPlanner_lecture_detailsTitle">{item.lecture_title}</h2>
            <p id="nogaPlanner_lecture_detailsCourse">{item.lecture_courseName}</p>
            <p id="nogaPlanner_lecture_detailsInstructor">{item.lecture_instructorName}</p>
            <p id="nogaPlanner_lecture_detailsWriter">{item.lecture_writerName}</p>
            {/* Add more lecture fields as needed */}
          </div>
        </section>
      );
    }
  };
  telegramCourseSuggestionsRequestInFlight = false;
  constructor(props) {
    super(props);
    const initialLocale = getDefaultPlannerLocale(props.locale);
    const initialPlannerSelectSettings = buildDefaultPlannerSelectSettings();
    const initialStudyPlanAid =
      props?.state?.studyPlanAid && typeof props.state.studyPlanAid === "object"
        ? props.state.studyPlanAid
        : props?.state?.studyPlanner?.studyPlanAid &&
            typeof props.state.studyPlanner.studyPlanAid === "object"
          ? props.state.studyPlanner.studyPlanAid
          : props?.state?.memory?.MOI?.studyPlanner?.studyPlanAid &&
              typeof props.state.memory.MOI.studyPlanner.studyPlanAid ===
                "object"
            ? props.state.memory.MOI.studyPlanner.studyPlanAid
            : {};
    const initialProfile = props?.state?.profile || props?.state || {};
    const initialStudying =
      initialProfile?.studying && typeof initialProfile.studying === "object"
        ? initialProfile.studying
        : {};
    const initialProgramName = String(
      initialStudying?.programName || initialStudying?.program || "",
    ).trim();
    const initialPlannerRoot = this.extractPlannerRootFromState(
      props?.state || {},
    );
    const initialPlannerProgramId = String(
      initialPlannerRoot?.programID || "",
    ).trim();
    const initialPlannerProgramLanguage = String(
      initialPlannerRoot?.programLanguage || "",
    ).trim();
    const initialPlannerProgramUniversity = String(
      initialPlannerRoot?.programUniversity || "",
    ).trim();
    const initialPlannerProgramFaculty = String(
      initialPlannerRoot?.programFaculty || "",
    ).trim();
    const initialPlannerProgramStartYear = String(
      initialPlannerRoot?.programStartYear ?? "",
    ).trim();
    const initialPlannerProgramTotalYears = String(
      initialPlannerRoot?.programTotalYears ?? "",
    ).trim();
    const initialPlannerProgramTermsPerYear = String(
      initialPlannerRoot?.programTermsPerYear ?? "",
    ).trim();
    const initialPlannerCurrentIntervalTryNumObj =
      initialPlannerRoot?.programCurrentIntervalTryNum &&
      typeof initialPlannerRoot.programCurrentIntervalTryNum === "object"
        ? initialPlannerRoot.programCurrentIntervalTryNum
        : null;
    const initialIntervalNum = String(
      initialPlannerCurrentIntervalTryNumObj?.intervalNum ?? "",
    ).trim();
    const initialIntervalTryNum = String(
      initialPlannerCurrentIntervalTryNumObj?.intervalTryNum ?? "",
    ).trim();
    const initialSubIntervalNum = String(
      initialPlannerCurrentIntervalTryNumObj?.subIntervalNum ?? "",
    ).trim();
    const initialPlannerProgramExams = Array.isArray(
      initialPlannerRoot?.programExamClasses,
    )
      ? initialPlannerRoot.programExamClasses
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const initialPlannerPrimaryFailingRule = this.getPrimaryProgramFailingRule(
      initialPlannerRoot,
    );
    const initialPlannerFailingRules = this.normalizeProgramFailingRuleEntries(
      initialPlannerRoot?.programFailingRules,
    )
      .map((entry, index) => {
        const normalizedEntry =
          this.normalizeProgramFailingRuleDraftValue(entry);
        if (!normalizedEntry) {
          return null;
        }
        return {
          key: String(
            entry?._id ||
              this.buildProgramFailingRuleDraftKey(normalizedEntry) ||
              index,
          ),
          ...normalizedEntry,
        };
      })
      .filter(Boolean);
    const initialPlannerIntervalPassingThresholdMode = String(
      initialPlannerPrimaryFailingRule?.thresholdMode ?? "",
    ).trim();
    const initialPlannerIntervalPassingThresholdUnit = String(
      initialPlannerPrimaryFailingRule?.thresholdUnit ?? "",
    ).trim();
    const initialPlannerIntervalPassingThresholdNumber = String(
      initialPlannerPrimaryFailingRule?.thresholdNumber ?? "",
    ).trim();
    const initialPlannerComponents = Array.isArray(
      initialPlannerRoot?.programComponentClasses,
    )
      ? initialPlannerRoot.programComponentClasses
          .map((entry) => this.normalizeProgramComponentValue(entry))
          .filter(Boolean)
      : [];
    const initialPlannerInstructors = Array.isArray(
      initialPlannerRoot?.programInstructors,
    )
      ? initialPlannerRoot.programInstructors
          .map((entry) => normalizeInstructorEntry(entry))
          .filter(Boolean)
      : [];
    const initialPlannerCoursesNames = Array.isArray(initialPlannerRoot?.programCoursesNamesCodes)
      ? initialPlannerRoot.programCoursesNamesCodes
          .map((entry) => {
            const obj = entry && typeof entry === "object" ? entry : {};
            const courseName = String(obj?.courseName || "").trim();
            if (!courseName) return null;
            return { courseName, courseCode: String(obj?.courseCode || "").trim() };
          })
          .filter(Boolean)
      : [];
    const initialPlannerEditors = Array.isArray(
      initialPlannerRoot?.programEditors,
    )
      ? initialPlannerRoot.programEditors
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const initialPlannerLocations = Array.isArray(
      initialPlannerRoot?.programLocations,
    )
      ? initialPlannerRoot.programLocations
          .map((entry) => this.normalizeHomeProgramLocationDraftEntry(entry))
          .filter((entry) => entry.building && entry.rooms.length > 0)
      : [];
    this.state = {
      ui_locale: initialLocale,
      wrapperTab: "home",
      plannerTab: "home",
      lastNonSettingsWrapperTab: "home",
      plannerCalendarNowMs: Date.now(),
      studyPlanAid: initialStudyPlanAid,
      planSelectedDayKey: "",
      studyPlanAttendanceComponentKey: "all",
      studyPlanAttendanceExcludeMode: false,
      studyPlanExcludedAttendanceDates: [],
      studyPlanIntervalDraft: {
        componentClass: "",
        startDate: "",
        endDate: "",
        startDateDay: "",
        startDateMonth: "",
        startDateYear: "",
        endDateDay: "",
        endDateMonth: "",
        endDateYear: "",
      },
      homeProgramStartYearEditorOpen: false,
      homeProgramStartYearValue: initialPlannerProgramStartYear,
      homeProgramStartYearDraft: initialPlannerProgramStartYear,
      homeProgramTotalYearsEditorOpen: false,
      homeProgramTotalYearsValue: initialPlannerProgramTotalYears,
      homeProgramTotalYearsDraft: initialPlannerProgramTotalYears,
      homeProgramTermsPerYearEditorOpen: false,
      homeProgramTermsPerYearValue: initialPlannerProgramTermsPerYear,
      homeProgramTermsPerYearDraft: initialPlannerProgramTermsPerYear,
      homeProgramCurrentIntervalTryNumEditorOpen: false,
      homeProgramCurrentIntervalNumDraft: initialIntervalNum,
      homeProgramCurrentIntervalTryNumDraft: initialIntervalTryNum,
      homeProgramCurrentSubIntervalNumDraft: initialSubIntervalNum,
      homeExamsCardSet: initialPlannerProgramExams.length > 0,
      homeExamsSetEditorOpen: false,
      homeExamInput: "",
      homeExamsDraftList: initialPlannerProgramExams,
      homeIntervalPassingThresholdEditorOpen: false,
      homeIntervalPassingThresholdModeValue:
        initialPlannerIntervalPassingThresholdMode,
      homeIntervalPassingThresholdModeDraft:
        initialPlannerIntervalPassingThresholdMode,
      homeIntervalPassingThresholdUnitValue:
        initialPlannerIntervalPassingThresholdUnit,
      homeIntervalPassingThresholdUnitDraft:
        initialPlannerIntervalPassingThresholdUnit,
      homeIntervalPassingThresholdNumberValue:
        initialPlannerIntervalPassingThresholdNumber,
      homeIntervalPassingThresholdNumberDraft:
        initialPlannerIntervalPassingThresholdNumber,
      homeIntervalPassingThresholdValueList: initialPlannerFailingRules,
      homeIntervalPassingThresholdDraftList: initialPlannerFailingRules,
      homeExpectedIntervalsGenerated: false,
      homeIntervalStatusDrafts: {},
      homeIntervalPendingRetakingKey: "",
      homeResetPendingAction: null,
      homeResetPasswordDraft: "",
      homeResetPasswordError: "",
      homeResetPasswordLoading: false,
      homeManualIntervalYearDraft: "",
      homeManualIntervalTermDraft: "",
      homeManualIntervalsDraftList: [],
      homeDeletedIntervalIds: [],
      homeGeneratedIntervalNumDraft: "",
      homeGeneratedIntervalTryNumDraft: "",
      homeGeneratedSubIntervalNumDraft: "",
      homeGeneratedStartDateMonthDraft: "",
      homeGeneratedStartDateDayDraft: "",
      homeGeneratedEndDateMonthDraft: "",
      homeGeneratedEndDateDayDraft: "",
      homeCurrentIntervalDraft: "",
      homeCurrentIntervalStatusDraft: "Normal",
      homeCurrentIntervalStartDateDraft: "",
      homeCurrentIntervalEndDateDraft: "",
      homeSubIntervalsDatesEditorOpen: false,
      homeSubIntervalsDatesEditingKey: "",
      plannerRoot:
        initialPlannerRoot && typeof initialPlannerRoot === "object"
          ? initialPlannerRoot
          : {},
      homeProgramCardSet: Boolean(
        initialPlannerProgramId || initialProgramName,
      ),
      homeComponentsCardSet: initialPlannerComponents.length > 0,
      homeComponentsSetEditorOpen: false,
      homeComponentIdInput: "",
      homeComponentsDraftList: initialPlannerComponents,
      homeProgramCoursesNamesCardSet: initialPlannerCoursesNames.length > 0,
      homeProgramCoursesNamesSetEditorOpen: false,
      homeProgramCoursesNamesInput: "",
      homeProgramCoursesCodesInput: "",
      homeProgramCoursesNamesDraftList: initialPlannerCoursesNames,
      homeProgramInstructorsCardSet: initialPlannerInstructors.length > 0,
      homeProgramInstructorsSetEditorOpen: false,
      homeProgramInstructorFirstNameInput: "",
      homeProgramInstructorLastNameInput: "",
      homeProgramInstructorsDraftList: initialPlannerInstructors,
      homeProgramEditorsCardSet: initialPlannerEditors.length > 0,
      homeProgramEditorsSetEditorOpen: false,
      homeProgramEditorInput: "",
      homeProgramEditorsDraftList: initialPlannerEditors,
      homeProgramLocationsCardSet: initialPlannerLocations.length > 0,
      homeProgramLocationsSetEditorOpen: false,
      homeProgramLocationBuildingInput: "",
      homeProgramLocationRoomInputs: {},
      homeProgramLocationsDraftList: initialPlannerLocations,
      homeProgramSetEditorOpen: false,
      homeProgramIdDraft: initialPlannerProgramId || initialProgramName,
      homeLanguageEditorOpen: false,
      homeLanguageDraft: initialPlannerProgramLanguage,
      homeUniversityEditorOpen: false,
      homeUniversityDraft: initialPlannerProgramUniversity,
      homeFacultyEditorOpen: false,
      homeFacultyDraft: initialPlannerProgramFaculty,
      homeCoursesEditorOpen: false,
      homeCourseEditingKey: "",
      homeCourseOriginalId: "",
      homeCourseOriginalIntervalId: "",
      homeCourseNameDraft: "",
      homeCourseIdDraft: "",
      homeCourseCodeDraft: "",
      homeCourseComponentDraft: [],
      homeCourseComponentEditingId: "",
      homeCourseTotalWeightDraft: "",
      homeCourseSubIntervalYearDraft: "",
      homeCourseSubIntervalTermDraft: "",
      homeCourseComponentIdDraft: "",
      homeCourseComponentPartialWeightDraft: "",
      homeCourseComponentStatusDraft: "",
      homeCourseIntervalIdDraft: "",
      homeCourseLectureNameDraft: "",
      homeCourseLectureInstructorsDraft: "",
      homeCourseLectureInstructionDateDraft: "",
      homeCourseLectureDraftList: [],
      homeCourseExamDraftList: [],
      homeCourseExamScheduleEditorOpen: false,
      homeCourseExamComponentIdDraft: "",
      homeCourseExamClassDraft: "",
      homeCourseExamDateDraft: "",
      homeCourseExamTimeDraft: "",
      homeCourseExamLocationBuildingDraft: "",
      homeCourseExamLocationRoomDraft: "",
      homeCourseExamWeightDraft: "",
      homeCourseExamGradeDraft: "",
      homeCourseComponentLecturesEditorOpen: false,
      homeCourseComponentLectureCourseIdDraft: "",
      homeCourseComponentLectureIntervalIdDraft: "",
      homeCourseComponentLectureComponentIdDraft: "",
      homeCourseComponentLectureNameDraft: "",
      homeCourseComponentLectureDraftList: [],
      homePanelModeTab: "intervals",
      plannerPendingRequests: 0,
      plannerPendingLabel: "",
      plannerSettingsVisible: false,
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      selectedTabItemId: null,
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      lectures: [],
      lecture_details: null,
      lecture_detailsPagesExpanded: false,
      show_addCourseForm: false,
      show_addExamForm: false,
      examDraft: getDefaultExamDraft(),
      courses: [],
      selected_course_id: "",
      selected_exam_index: -1,
      exam_form_mode: "Add",
      exam_form_index: -1,
      course_isLoading: false,
      telegram_panelGroupTitle: "Side Panel",
      telegram_isLoading: false,
      telegram_error: "",
      telegram_messages: [],
      telegram_groupTitle: "Telegram Group",
      telegram_groupReference: "",
      telegram_panelGroupReference: "",
      telegram_groupOptions: [],
      telegram_storedGroupOptions: [],
      telegram_deletingGroupReference: "",
      telegram_openingPdfKey: "",
      telegram_pdfViewerOpen: false,
      telegram_pdfViewerUrl: "",
      telegram_pdfViewerMessage: null,
      telegram_pdfViewerLoading: false,
      telegram_pdfViewerError: "",
      telegram_selectedSuggestionPdfId: 0,
      telegram_selectedSuggestionPdfTitle: "",
      telegram_searchSelectedPdfs: false,
      telegram_groupInput: "",
      telegram_feedback: "",
      telegram_isSaving: false,
      telegram_historyStartDate: "",
      telegram_historyImportedAt: "",
      telegram_lastSyncedAt: "",
      telegram_lastStoredMessageDate: "",
      telegram_storedCount: 0,
      telegram_lastSyncStatus: "",
      telegram_lastSyncReason: "",
      telegram_lastSyncMessage: "",
      telegram_lastSyncImportedCount: 0,
      telegram_lastSyncError: "",
      telegram_lastSyncScannedCount: 0,
      telegram_lastSyncNewestMessageDateSeen: "",
      telegram_lastSyncOldestMessageDateSeen: "",
      telegram_lastSyncOldestImportedMessageDate: "",
      telegram_lastSyncFirstSkippedBeforeStartDate: "",
      telegram_lastSyncReachedStartBoundary: false,
      telegram_searchQuery: "",
      telegram_searchStart: "",
      telegram_searchEnd: "",
      telegram_viewMode: "messages",
      telegram_rawCount: 0,
      telegram_courseSuggestions: [],
      telegram_courseSuggestionsLoading: false,
      telegram_courseSuggestionsLoadingMode: "",
      telegram_courseSuggestionsPanelLoading: false,
      telegram_courseSuggestionsView: "saved",
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsFeedback: "",
      telegram_courseSuggestionsProgressSteps: [],
      telegram_courseSuggestionsVisible: false,
      telegram_courseSuggestionsLiveStatus: "",
      telegram_instructorSuggestions: [],
      inlineCourseFormTab: "traditional",
      inlineCoursePredictions: [],
      inlineCoursePredictionsLoading: false,
      inlineCoursePredictionsError: "",
      telegram_approvingSuggestionKey: "",
      telegram_courseAiLoadingCourseId: "",
      telegram_courseAiStatusCourseId: "",
      telegram_courseAiStatusMessage: "",
      telegram_courseAiStatusError: "",
      telegram_courseAiDraftCourseId: "",
      telegram_courseAiDraftPayload: null,
      telegram_courseAiDraftSaving: false,
      planner_swipeView: "main",
      inlineCourseRowVisible: false,
      inlineCourseDraft: getDefaultInlineCourseDraft(),
      plannerSelectSettings: initialPlannerSelectSettings,
      plannerSettingsComponentClassInput: "",
      plannerSettingsWeekdayInput: "",
      plannerSettingsHourInput: "",
      plannerSettingsTermInput: "",
      plannerSettingsAcademicYearInput: "",
      plannerSettingsLocationBuildingInput: "",
      plannerSettingsLocationRoomInput: "",
      plannerSettingsLocationRoomBuildingInput: "",
      plannerSettingsActiveListKey: "componentClassOptions",
      plannerSettingsDefaultSection: "Courses",
      plannerSettingsDefaultFieldKey: "",
      plannerSettingsEditingComponentClassIndex: -1,
      plannerSettingsEditingWeekdayIndex: -1,
      plannerSettingsEditingHourIndex: -1,
      plannerSettingsEditingTermIndex: -1,
      plannerSettingsEditingAcademicYearIndex: -1,
      plannerSettingsEditingLocationBuildingIndex: -1,
      plannerSettingsEditingLocationRoomIndex: -1,
      plannerSettingsSelectedComponentClassIndex: -1,
      plannerSettingsSelectedWeekdayIndex: -1,
      plannerSettingsSelectedHourIndex: -1,
      plannerSettingsSelectedTermIndex: -1,
      plannerSettingsSelectedAcademicYearIndex: -1,
      plannerSettingsSelectedLocationBuildingIndex: -1,
      plannerSettingsSelectedLocationRoomIndex: -1,
      plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
      plannerSettingsEditingRelationshipId: "",
      plannerSettingsSelectedRelationshipId: "",
      plannerSettingsSaveStatus: "",
      plannerSettingsSaveMessage: "",
      plannerSettingsLogoMotionEnabled: true,
      plannerSettingsVoiceControlEnabled: false,
      plannerSettingsVoiceDictationEnabled: false,
      plannerSettingsLogoFixedClock: "9",
      plannerSettingsMessageFromFriendFromId: "",
      plannerSettingsMessageFromFriendToId: "",
      plannerSettingsMessageFromFriendToMessage: "",
      plannerSettingsMessageFromFriendToList: [],
      plannerSettingsMessageFromFriendSelectedToIndex: -1,
      plannerSettingsPredictionToolEnabled: true,
      plannerSettingsSelectedPredictionFieldId: "",
      plannerSettingsSelectedPredictionTab: "",
      plannerSettingsVoiceCommandTab: "Courses",
      plannerSettingsVoiceCommandButton: "",
      plannerSettingsVoiceCommandInput: "",
      plannerSettingsVoiceDictationLetter: "",
      plannerSettingsVoiceDictationNormalizedLetter: "",
      plannerSettingsVoiceDictationCondition: "endOfWord",
      plannerSettingsSelectedVoiceDictationNormalizationIndex: -1,
      plannerSettingsSelectedVoiceCommandIndex: -1,
      plannerSettingsEditingVoiceCommandIndex: -1,
      plannerVoiceCommandCaptureMode: false,
      savedCourseComponentDraftActive: true,
      savedCourseEditorVisible: false,
      savedCourseEditorMode: "add",
      savedCourseDraft: getDefaultSavedCourseDraft(),
      selectedSavedCourseDraftComponentIndex: -1,
      savedCourseSelectionMode: false,
      selectedSavedCourseIds: [],
      savedCourseDetailsComponentId: "",
      savedCourseSortKey: "course_name",
      savedCourseSortDirection: "asc",
      examBoardSortKey: "course_name",
      examBoardSortDirection: "asc",
      lectureSortKey: "lecture_name",
      lectureSortDirection: "asc",
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
      savedCourseFloatingBarPosition: null,
      telegramSelectedGroupReference: "",
      telegramHasStoredGroups: false,
      isTelegramExtractingCourseNames: false,
      isTelegramFindingInstructors: false,
      isTelegramExtractingCourseInfo: false,
      telegramAiPreviewResults: null,
    };
    this.coursePrintAudio = null;
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts = [];
    this.courseActionsPointerState = null;
    this.plannerArticleRef = React.createRef();
    this.courseActionsWindowRef = React.createRef();
    this.lectureActionsWindowRef = React.createRef();
    this.savedCoursesColumnRef = React.createRef();
    this.savedCoursesColumnBodyRef = React.createRef();
    this.savedCourseRowRefs = new Map();
    this.telegramSyncStatusTimeout = null;
    this.courseActionsSnapTimeout = null;
    this.isComponentMounted = false;
    this.plannerSwipeStart = null;
    this.lectureActionsPointerState = null;
    this.lectureActionsSnapTimeout = null;
    this.telegramPdfObjectUrl = "";
    this.telegramCourseSuggestionStatusTimeout = null;
    this.savedCourseFloatingBarRaf = null;
    this.plannerCalendarTickInterval = null;
    this.plannerVoiceRecognition = null;
    this.plannerVoiceStopRequested = false;
    this.plannerVoiceRestartTimeout = null;
    this.plannerInputVoiceRecognition = null;
    this.plannerInputVoiceStopRequested = false;
    this.plannerInputVoiceRestartTimeout = null;
    this.plannerInputVoiceSessionToken = 0;
    this.plannerInputVoiceListeningShown = false;
    this.plannerInputVoiceActiveElement = null;
    this.plannerVoiceWasRunningBeforeInputFocus = false;
    this.plannerInlinePredictionMutating = false;
    this.pendingVoiceCommandCaptureMeta = null;
    this.voiceCapturePressTimer = null;
    this.voiceCapturePressMeta = null;
    this.voiceCaptureSuppressClickElementId = "";
  }
  notifyPresenceMode = (mode = "") => {
    if (typeof this.props?.onPresenceModeChange !== "function") {
      return;
    }

    this.props.onPresenceModeChange(mode);
  };
  enablePlannerBrowserZoom = () => {
    if (this.plannerViewportMetaElement) {
      return;
    }
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      return;
    }
    this.plannerViewportMetaElement = viewportMeta;
    this.plannerViewportMetaOriginalContent =
      viewportMeta.getAttribute("content") || "";
    viewportMeta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes",
    );
  };
  disablePlannerBrowserZoom = () => {
    const viewportMeta = this.plannerViewportMetaElement;
    if (!viewportMeta) {
      return;
    }
    viewportMeta.setAttribute(
      "content",
      this.plannerViewportMetaOriginalContent ||
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
    );
    this.plannerViewportMetaElement = null;
    this.plannerViewportMetaOriginalContent = "";
  };
  _syncCountdownEndDate = () => {
    const currentEntry = this.getPlannerCurrentSubIntervalCalendarEntry();
    const endIso = currentEntry ? this.getPlannerSubIntervalTryDates(currentEntry).end : null;
    updatePlannerCountdownEndDate(endIso || null);
  };

  componentDidMount() {
    this.isComponentMounted = true;
    setPlannerActive(true);
    this._syncCountdownEndDate();
    this.plannerCalendarTickInterval = window.setInterval(() => {
      if (!this.isComponentMounted) {
        return;
      }
      this.setState({ plannerCalendarNowMs: Date.now() });
      this._syncCountdownEndDate();
    }, 1000);
    this.notifyPresenceMode("studying");
    this.enablePlannerBrowserZoom();
    this.prefillStudyPlanIntervalDraftYearsFromProfile();
    this.loadPlannerInputHistory();
    const plannerArticleElement = this.plannerArticleRef?.current;
    if (plannerArticleElement) {
      plannerArticleElement
        .querySelectorAll("input")
        .forEach((inputElement) =>
          this.disablePlannerInputNativeSuggestions(inputElement),
        );
      plannerArticleElement.addEventListener(
        "focusin",
        this.handlePlannerInputPredictionFocus,
      );
      plannerArticleElement.addEventListener(
        "focusin",
        this.handlePlannerInputVoiceFocusIn,
      );
      plannerArticleElement.addEventListener(
        "focusout",
        this.handlePlannerInputVoiceFocusOut,
      );
      plannerArticleElement.addEventListener(
        "input",
        this.handlePlannerInputPredictionInput,
      );
      plannerArticleElement.addEventListener(
        "change",
        this.handlePlannerInputPredictionInput,
      );
      plannerArticleElement.addEventListener(
        "mousedown",
        this.handlePlannerVoiceCommandCaptureMouseDown,
        true,
      );
      plannerArticleElement.addEventListener(
        "mouseup",
        this.handlePlannerVoiceCommandCaptureMouseUp,
        true,
      );
      plannerArticleElement.addEventListener(
        "click",
        this.handlePlannerVoiceCommandCaptureClick,
        true,
      );
    }
    window.addEventListener(
      "resize",
      this.handleSavedCourseFloatingBarViewportChange,
    );
    window.addEventListener(
      "scroll",
      this.handleSavedCourseFloatingBarViewportChange,
      true,
    );
    window.addEventListener(
      "noga-voice-command-prompt-submit",
      this.handlePlannerVoiceCommandFooterSubmit,
    );
    window.addEventListener(
      "noga-voice-command-prompt-cancel",
      this.handlePlannerVoiceCommandFooterCancel,
    );
    if (this.props.state?.my_id) {
      this.loadPlannerSelectSettings();
      this.retrieveCourses();
      this.retrieveLectures();
    }
    if (this.props.state?.my_id) {
      this.loadHomePlannerData().catch(() => {});
    }
    this.syncPlannerVoiceControl();
  }
  componentDidUpdate(prevProps, prevState) {
    if (prevState.plannerRoot !== this.state.plannerRoot) {
      this._syncCountdownEndDate();
    }
    const calSelection = this.getCurrentIntervalTryCalendarSelection();
    if (calSelection.isReady && calSelection.currentIntervalRow) {
      const { currentProgramTry, currentIntervalRow } = calSelection;
      const calKey = [
        currentProgramTry?.intervalNum,
        currentProgramTry?.intervalTryNum,
        this.getPlannerSubIntervalTryDates(currentIntervalRow).start,
        this.getPlannerSubIntervalTryDates(currentIntervalRow).end,
      ].join("|");
      if (calKey !== this._lastAutoCalendarGenKey) {
        this._lastAutoCalendarGenKey = calKey;
        this.generateCurrentIntervalTryCalendar();
      }
    }
    const nextPropsPlannerRoot = this.extractPlannerRootFromState(
      this.props?.state || {},
    );
    const prevPropsPlannerRoot = this.extractPlannerRootFromState(
      prevProps?.state || {},
    );
    const nextPropsProgramId = String(
      nextPropsPlannerRoot?.programID || "",
    ).trim();
    const prevPropsProgramId = String(
      prevPropsPlannerRoot?.programID || "",
    ).trim();
    const currentStateProgramId = String(
      this.state?.plannerRoot?.programID || "",
    ).trim();
    const nextPropsHasComponents =
      Array.isArray(nextPropsPlannerRoot?.programComponentClasses) &&
      nextPropsPlannerRoot.programComponentClasses.length > 0;
    const nextPropsProgramExams = Array.isArray(
      nextPropsPlannerRoot?.programExamClasses,
    )
      ? nextPropsPlannerRoot.programExamClasses
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    if (
      nextPropsProgramId &&
      (nextPropsProgramId !== prevPropsProgramId ||
        nextPropsProgramId !== currentStateProgramId)
    ) {
      const nextComponentIds = Array.isArray(
        nextPropsPlannerRoot?.programComponentClasses,
      )
        ? nextPropsPlannerRoot.programComponentClasses
            .map((entry) => this.normalizeProgramComponentValue(entry))
            .filter(Boolean)
        : [];
      const nextPrimaryFailingRule = this.getPrimaryProgramFailingRule(
        nextPropsPlannerRoot,
      );
      const nextProgramFailingRulesForState = this.normalizeProgramFailingRuleEntries(
        nextPropsPlannerRoot?.programFailingRules,
      )
        .map((entry, index) => {
          const normalizedEntry =
            this.normalizeProgramFailingRuleDraftValue(entry);
          if (!normalizedEntry) {
            return null;
          }
          return {
            key:
              String(entry?._id || "") ||
              this.buildProgramFailingRuleDraftKey(normalizedEntry) ||
              `rule_${index}`,
            ...normalizedEntry,
          };
        })
        .filter(Boolean);
      this.setState((previousState) => ({
        plannerRoot:
          nextPropsPlannerRoot && typeof nextPropsPlannerRoot === "object"
            ? nextPropsPlannerRoot
            : previousState?.plannerRoot || {},
        homeProgramIdDraft: String(
          previousState?.homeProgramIdDraft || nextPropsProgramId,
        ).trim(),
        homeLanguageDraft: String(
          previousState?.homeLanguageDraft ||
            nextPropsPlannerRoot?.programLanguage ||
            "",
        ).trim(),
        homeUniversityDraft: String(
          previousState?.homeUniversityDraft ||
            nextPropsPlannerRoot?.programUniversity ||
            "",
        ).trim(),
        homeFacultyDraft: String(
          previousState?.homeFacultyDraft ||
            nextPropsPlannerRoot?.programFaculty ||
            "",
        ).trim(),
        homeProgramStartYearValue: String(
          nextPropsPlannerRoot?.programStartYear ?? "",
        ).trim(),
        homeProgramStartYearDraft:
          String(previousState?.homeProgramStartYearDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programStartYear ?? "").trim(),
        homeProgramTotalYearsValue: String(
          nextPropsPlannerRoot?.programTotalYears ?? "",
        ).trim(),
        homeProgramTotalYearsDraft:
          String(previousState?.homeProgramTotalYearsDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programTotalYears ?? "").trim(),
        homeProgramTermsPerYearValue: String(
          nextPropsPlannerRoot?.programTermsPerYear ?? "",
        ).trim(),
        homeProgramTermsPerYearDraft:
          String(previousState?.homeProgramTermsPerYearDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programTermsPerYear ?? "").trim(),
        homeProgramCurrentIntervalNumDraft:
          String(previousState?.homeProgramCurrentIntervalNumDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programCurrentIntervalTryNum?.intervalNum ?? "").trim(),
        homeProgramCurrentIntervalTryNumDraft:
          String(previousState?.homeProgramCurrentIntervalTryNumDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programCurrentIntervalTryNum?.intervalTryNum ?? "").trim(),
        homeProgramCurrentSubIntervalNumDraft:
          String(previousState?.homeProgramCurrentSubIntervalNumDraft || "").trim() ||
          String(nextPropsPlannerRoot?.programCurrentIntervalTryNum?.subIntervalNum ?? "").trim(),
        homeIntervalPassingThresholdModeValue: String(
          nextPrimaryFailingRule?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdModeDraft:
          String(
            previousState?.homeIntervalPassingThresholdModeDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdMode ?? "").trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPrimaryFailingRule?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitDraft:
          String(
            previousState?.homeIntervalPassingThresholdUnitDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdUnit ?? "").trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPrimaryFailingRule?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberDraft:
          String(
            previousState?.homeIntervalPassingThresholdNumberDraft || "",
          ).trim() ||
          String(nextPrimaryFailingRule?.thresholdNumber ?? "").trim(),
        homeIntervalPassingThresholdValueList:
          nextProgramFailingRulesForState.length > 0
            ? nextProgramFailingRulesForState
            : previousState?.homeIntervalPassingThresholdValueList || [],
        homeIntervalPassingThresholdDraftList:
          nextProgramFailingRulesForState.length > 0
            ? nextProgramFailingRulesForState
            : previousState?.homeIntervalPassingThresholdDraftList || [],
        homeProgramCardSet: true,
        homeComponentsCardSet:
          Boolean(previousState?.homeComponentsCardSet) ||
          nextPropsHasComponents,
        homeComponentsDraftList:
          nextComponentIds.length > 0
            ? nextComponentIds
            : previousState?.homeComponentsDraftList || [],
        homeExamsCardSet:
          Boolean(previousState?.homeExamsCardSet) ||
          nextPropsProgramExams.length > 0,
        homeExamsDraftList:
          nextPropsProgramExams.length > 0
            ? nextPropsProgramExams
            : previousState?.homeExamsDraftList || [],
        homeProgramCoursesNamesCardSet:
          Boolean(previousState?.homeProgramCoursesNamesCardSet) ||
          Array.isArray(nextPropsPlannerRoot?.programCoursesNamesCodes),
        homeProgramCoursesNamesDraftList:
          Array.isArray(nextPropsPlannerRoot?.programCoursesNamesCodes) &&
          nextPropsPlannerRoot.programCoursesNamesCodes.length > 0
            ? nextPropsPlannerRoot.programCoursesNamesCodes
                .map((entry) => {
                  const obj = entry && typeof entry === "object" ? entry : {};
                  const courseName = String(obj?.courseName || "").trim();
                  if (!courseName) return null;
                  return { courseName, courseCode: String(obj?.courseCode || "").trim() };
                })
                .filter(Boolean)
            : previousState?.homeProgramCoursesNamesDraftList || [],
        homeProgramInstructorsCardSet:
          Boolean(previousState?.homeProgramInstructorsCardSet) ||
          Array.isArray(nextPropsPlannerRoot?.programInstructors),
        homeProgramInstructorsDraftList:
          Array.isArray(nextPropsPlannerRoot?.programInstructors) &&
          nextPropsPlannerRoot.programInstructors.length > 0
            ? nextPropsPlannerRoot.programInstructors
                .map((entry) => normalizeInstructorEntry(entry))
                .filter(Boolean)
            : previousState?.homeProgramInstructorsDraftList || [],
        homeProgramEditorsCardSet:
          Boolean(previousState?.homeProgramEditorsCardSet) ||
          Array.isArray(nextPropsPlannerRoot?.programEditors),
        homeProgramEditorsDraftList:
          Array.isArray(nextPropsPlannerRoot?.programEditors) &&
          nextPropsPlannerRoot.programEditors.length > 0
            ? nextPropsPlannerRoot.programEditors
                .map((entry) => String(entry || "").trim())
                .filter(Boolean)
            : previousState?.homeProgramEditorsDraftList || [],
        homeProgramLocationsCardSet:
          Boolean(previousState?.homeProgramLocationsCardSet) ||
          Array.isArray(nextPropsPlannerRoot?.programLocations),
        homeProgramLocationsDraftList:
          Array.isArray(nextPropsPlannerRoot?.programLocations) &&
          nextPropsPlannerRoot.programLocations.length > 0
            ? nextPropsPlannerRoot.programLocations
                .map((entry) =>
                  this.normalizeHomeProgramLocationDraftEntry(entry),
                )
                .filter((entry) => entry.building && entry.rooms.length > 0)
            : previousState?.homeProgramLocationsDraftList || [],
      }));
      return;
    }
    if (nextPropsHasComponents && !this.state?.homeComponentsCardSet) {
      const nextComponentIds = Array.isArray(
        nextPropsPlannerRoot?.programComponentClasses,
      )
        ? nextPropsPlannerRoot.programComponentClasses
            .map((entry) => this.normalizeProgramComponentValue(entry))
            .filter(Boolean)
        : [];
      this.setState({
        homeComponentsCardSet: true,
        homeComponentsDraftList:
          nextComponentIds.length > 0
            ? nextComponentIds
            : this.state?.homeComponentsDraftList || [],
      });
      return;
    }
    if (nextPropsProgramExams.length > 0 && !this.state?.homeExamsCardSet) {
      this.setState({
        homeExamsCardSet: true,
        homeExamsDraftList:
          nextPropsProgramExams.length > 0
            ? nextPropsProgramExams
            : this.state?.homeExamsDraftList || [],
      });
      return;
    }
    if (
      Array.isArray(nextPropsPlannerRoot?.programCoursesNamesCodes) &&
      nextPropsPlannerRoot.programCoursesNamesCodes.length > 0 &&
      !this.state?.homeProgramCoursesNamesCardSet
    ) {
      const nextProgramCoursesNamesCodes = nextPropsPlannerRoot.programCoursesNamesCodes
        .map((entry) => {
          const obj = entry && typeof entry === "object" ? entry : {};
          const courseName = String(obj?.courseName || "").trim();
          if (!courseName) return null;
          return { courseName, courseCode: String(obj?.courseCode || "").trim() };
        })
        .filter(Boolean);
      this.setState({
        homeProgramCoursesNamesCardSet: true,
        homeProgramCoursesNamesDraftList:
          nextProgramCoursesNamesCodes.length > 0
            ? nextProgramCoursesNamesCodes
            : this.state?.homeProgramCoursesNamesDraftList || [],
      });
      return;
    }
    if (
      Array.isArray(nextPropsPlannerRoot?.programInstructors) &&
      nextPropsPlannerRoot.programInstructors.length > 0 &&
      !this.state?.homeProgramInstructorsCardSet
    ) {
      const nextProgramInstructors = nextPropsPlannerRoot.programInstructors
        .map((entry) => normalizeInstructorEntry(entry))
        .filter(Boolean);
      this.setState({
        homeProgramInstructorsCardSet: true,
        homeProgramInstructorsDraftList:
          nextProgramInstructors.length > 0
            ? nextProgramInstructors
            : this.state?.homeProgramInstructorsDraftList || [],
      });
      return;
    }
    if (
      Array.isArray(nextPropsPlannerRoot?.programEditors) &&
      nextPropsPlannerRoot.programEditors.length > 0 &&
      !this.state?.homeProgramEditorsCardSet
    ) {
      const nextProgramEditors = nextPropsPlannerRoot.programEditors
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      this.setState({
        homeProgramEditorsCardSet: true,
        homeProgramEditorsDraftList:
          nextProgramEditors.length > 0
            ? nextProgramEditors
            : this.state?.homeProgramEditorsDraftList || [],
      });
      return;
    }
    if (
      Array.isArray(nextPropsPlannerRoot?.programLocations) &&
      nextPropsPlannerRoot.programLocations.length > 0 &&
      !this.state?.homeProgramLocationsCardSet
    ) {
      const nextProgramLocations = nextPropsPlannerRoot.programLocations
        .map((entry) => this.normalizeHomeProgramLocationDraftEntry(entry))
        .filter((entry) => entry.building && entry.rooms.length > 0);
      this.setState({
        homeProgramLocationsCardSet: true,
        homeProgramLocationsDraftList:
          nextProgramLocations.length > 0
            ? nextProgramLocations
            : this.state?.homeProgramLocationsDraftList || [],
      });
      return;
    }
    if (
      Array.isArray(nextPropsPlannerRoot?.programExamClasses) &&
      nextPropsPlannerRoot.programExamClasses.length > 0 &&
      !this.state?.homeExamsCardSet
    ) {
      const nextProgramExams = nextPropsPlannerRoot.programExamClasses
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      this.setState({
        homeExamsCardSet: true,
        homeExamsDraftList:
          nextProgramExams.length > 0
            ? nextProgramExams
            : this.state?.homeExamsDraftList || [],
      });
      return;
    }
    if (
      this.state?.wrapperTab === "home" &&
      this.props?.state?.my_id &&
      prevState?.wrapperTab !== "home"
    ) {
      this.loadHomePlannerData().catch(() => {});
    }
    const prevAcademicCandidates = [
      prevProps.state?.studying?.time?.current?.programYearInterval,
      prevProps.state?.studying?.time?.currentAcademicYear,
      prevProps.state?.studying?.currentAcademicYear,
      prevProps.state?.studying?.academicYearsIntervals?.current?.interval,
      prevProps.state?.studying?.academicYearsIntervals?.current,
      prevProps.state?.profile?.studying?.time?.current?.programYearInterval,
      prevProps.state?.profile?.studying?.time?.currentAcademicYear,
      prevProps.state?.profile?.studying?.currentAcademicYear,
      prevProps.state?.profile?.studying?.academicYearsIntervals?.current
        ?.interval,
      prevProps.state?.profile?.studying?.academicYearsIntervals?.current,
      prevProps.state?.currentAcademicYear,
    ];
    let prevAcademicInterval = "";
    for (const candidate of prevAcademicCandidates) {
      const parsed = this.readPlannerAcademicIntervalCandidate(candidate);
      if (parsed) {
        prevAcademicInterval = parsed;
        break;
      }
    }
    const nextAcademicInterval =
      this.getPlannerCurrentAcademicYearIntervalRaw();
    if (prevAcademicInterval !== nextAcademicInterval) {
      this.prefillStudyPlanIntervalDraftYearsFromProfile();
    }
    if (
      this.props.state?.my_id &&
      prevProps.state?.my_id !== this.props.state?.my_id
    ) {
      this.loadPlannerSelectSettings();
      this.retrieveCourses();
      this.retrieveLectures();
    }
    if (
      this.props.state?.my_id &&
      this.props.state?.token &&
      prevProps.state?.token !== this.props.state?.token
    ) {
      this.loadPlannerSelectSettings();
    }
    if (
      prevState?.plannerTab !== this.state?.plannerTab ||
      prevState?.savedCourseEditorVisible !==
        this.state?.savedCourseEditorVisible ||
      prevState?.savedCourseSelectionMode !==
        this.state?.savedCourseSelectionMode ||
      prevState?.selectedCourseForLecturesId !==
        this.state?.selectedCourseForLecturesId ||
      prevState?.savedCourseSortKey !== this.state?.savedCourseSortKey ||
      prevState?.savedCourseSortDirection !==
        this.state?.savedCourseSortDirection ||
      (Array.isArray(prevState?.selectedSavedCourseIds)
        ? prevState.selectedSavedCourseIds.join("|")
        : "") !==
        (Array.isArray(this.state?.selectedSavedCourseIds)
          ? this.state.selectedSavedCourseIds.join("|")
          : "") ||
      (Array.isArray(prevState?.courses) ? prevState.courses.length : 0) !==
        (Array.isArray(this.state?.courses) ? this.state.courses.length : 0)
    ) {
      this.scheduleSavedCourseFloatingBarPositionUpdate();
    }
    if (
      prevState?.plannerSettingsVoiceControlEnabled !==
      this.state?.plannerSettingsVoiceControlEnabled
    ) {
      this.syncPlannerVoiceControl();
    }
    if (
      prevState?.plannerRoot !== this.state?.plannerRoot ||
      prevState?.homeCurrentIntervalDraft !== this.state?.homeCurrentIntervalDraft ||
      prevState?.homeCurrentIntervalKey !== this.state?.homeCurrentIntervalKey ||
      prevState?.homeCurrentIntervalStartDateDraft !==
        this.state?.homeCurrentIntervalStartDateDraft ||
      prevState?.homeCurrentIntervalEndDateDraft !==
        this.state?.homeCurrentIntervalEndDateDraft
    ) {
      this._syncCountdownEndDate();
    }
  }
  componentWillUnmount() {
    this.isComponentMounted = false;
    setPlannerActive(false);
    if (this.plannerCalendarTickInterval) {
      clearInterval(this.plannerCalendarTickInterval);
      this.plannerCalendarTickInterval = null;
    }
    this.notifyPresenceMode("");
    this.disablePlannerBrowserZoom();
    const plannerArticleElement = this.plannerArticleRef?.current;
    if (plannerArticleElement) {
      plannerArticleElement.removeEventListener(
        "focusin",
        this.handlePlannerInputPredictionFocus,
      );
      plannerArticleElement.removeEventListener(
        "focusin",
        this.handlePlannerInputVoiceFocusIn,
      );
      plannerArticleElement.removeEventListener(
        "focusout",
        this.handlePlannerInputVoiceFocusOut,
      );
      plannerArticleElement.removeEventListener(
        "input",
        this.handlePlannerInputPredictionInput,
      );
      plannerArticleElement.removeEventListener(
        "change",
        this.handlePlannerInputPredictionInput,
      );
      plannerArticleElement.removeEventListener(
        "mousedown",
        this.handlePlannerVoiceCommandCaptureMouseDown,
        true,
      );
      plannerArticleElement.removeEventListener(
        "mouseup",
        this.handlePlannerVoiceCommandCaptureMouseUp,
        true,
      );
      plannerArticleElement.removeEventListener(
        "click",
        this.handlePlannerVoiceCommandCaptureClick,
        true,
      );
    }
    window.removeEventListener(
      "resize",
      this.handleSavedCourseFloatingBarViewportChange,
    );
    window.removeEventListener(
      "scroll",
      this.handleSavedCourseFloatingBarViewportChange,
      true,
    );
    window.removeEventListener(
      "noga-voice-command-prompt-submit",
      this.handlePlannerVoiceCommandFooterSubmit,
    );
    window.removeEventListener(
      "noga-voice-command-prompt-cancel",
      this.handlePlannerVoiceCommandFooterCancel,
    );
    if (this.voiceCapturePressTimer) {
      clearTimeout(this.voiceCapturePressTimer);
      this.voiceCapturePressTimer = null;
    }
    if (this.savedCourseFloatingBarRaf) {
      cancelAnimationFrame(this.savedCourseFloatingBarRaf);
      this.savedCourseFloatingBarRaf = null;
    }
    if (this.plannerPredictionToolSyncTimeout) {
      clearTimeout(this.plannerPredictionToolSyncTimeout);
      this.plannerPredictionToolSyncTimeout = null;
    }
    this.stopPlannerVoiceControl();
    this.stopPlannerInputVoiceTranscription(false);
  }
  isPlannerVoiceTranscriptionInput = (inputElement) => {
    if (!inputElement || inputElement.tagName !== "INPUT") {
      return false;
    }
    if (inputElement.disabled || inputElement.readOnly) {
      return false;
    }
    const inputType = String(inputElement.type || "text").toLowerCase();
    return (
      inputType === "text" ||
      inputType === "search" ||
      inputType === "email" ||
      inputType === "tel" ||
      inputType === "url"
    );
  };
  handlePlannerInputVoiceFocusIn = (event) => {
    if (!this.state?.plannerSettingsVoiceDictationEnabled) {
      return;
    }
    const target = event?.target;
    if (!this.isPlannerVoiceTranscriptionInput(target)) {
      return;
    }
    if (this.plannerInputVoiceRecognition) {
      // Handoff between inputs while dictation is running: keep one session.
      this.plannerInputVoiceActiveElement = target;
      return;
    }
    this.plannerInputVoiceActiveElement = target;
    this.plannerInputVoiceListeningShown = false;
    this.startPlannerInputVoiceTranscription();
  };
  handlePlannerInputVoiceFocusOut = (event) => {
    const nextFocusedElement = event?.relatedTarget;
    if (
      this.state?.plannerSettingsVoiceDictationEnabled &&
      this.isPlannerVoiceTranscriptionInput(nextFocusedElement)
    ) {
      // Let focus move to another eligible input without stopping dictation.
      this.plannerInputVoiceActiveElement = nextFocusedElement;
      return;
    }
    const target = event?.target;
    if (target && target === this.plannerInputVoiceActiveElement) {
      this.stopPlannerInputVoiceTranscription(true);
      this.plannerInputVoiceActiveElement = null;
    }
  };
  setPlannerInputValue = (
    inputElement,
    nextValue,
    { dispatchInput = false, inputType = "insertText", data = "" } = {},
  ) => {
    if (!inputElement) {
      return;
    }
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (valueSetter) {
      valueSetter.call(inputElement, String(nextValue ?? ""));
    } else {
      inputElement.value = String(nextValue ?? "");
    }
    if (!dispatchInput) {
      return;
    }
    try {
      inputElement.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType,
          data,
        }),
      );
    } catch {
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  appendTranscriptToPlannerInput = (inputElement, transcript = "") => {
    if (!inputElement || !transcript) {
      return;
    }
    const normalizedTranscript = this.normalizePlannerVoiceText(transcript);
    if (!normalizedTranscript) {
      return;
    }
    const currentValue = String(inputElement.value || "");
    const nextValue = currentValue
      ? `${currentValue} ${normalizedTranscript}`.replace(/\s+/g, " ").trim()
      : normalizedTranscript;
    this.setPlannerInputValue(inputElement, nextValue);
    try {
      inputElement.setSelectionRange(nextValue.length, nextValue.length);
    } catch {
      // Ignore selection errors on unsupported input types.
    }
    this.setPlannerInputValue(inputElement, nextValue, {
      dispatchInput: true,
      inputType: "insertText",
      data: normalizedTranscript,
    });
  };
  startPlannerInputVoiceTranscription = () => {
    if (typeof window === "undefined") {
      return;
    }
    const inputElement = this.plannerInputVoiceActiveElement;
    if (!this.isPlannerVoiceTranscriptionInput(inputElement)) {
      return;
    }
    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor || this.plannerInputVoiceRecognition) {
      return;
    }
    const sessionToken = ++this.plannerInputVoiceSessionToken;
    this.plannerVoiceWasRunningBeforeInputFocus = Boolean(
      this.plannerVoiceRecognition,
    );
    if (this.plannerVoiceWasRunningBeforeInputFocus) {
      this.stopPlannerVoiceControl();
    }
    this.plannerInputVoiceStopRequested = false;
    if (!this.plannerInputVoiceListeningShown) {
      this.props.serverReply("listening ...");
      this.plannerInputVoiceListeningShown = true;
    }
    const recognition = new RecognitionCtor();
    recognition.lang = "ar";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const activeInput = this.plannerInputVoiceActiveElement;
      if (!this.isPlannerVoiceTranscriptionInput(activeInput)) {
        return;
      }
      const result = event?.results?.[event.resultIndex];
      const transcript = String(result?.[0]?.transcript || "").trim();
      if (transcript) {
        this.appendTranscriptToPlannerInput(activeInput, transcript);
      }
    };
    recognition.onend = () => {
      this.plannerInputVoiceRecognition = null;
      if (
        sessionToken === this.plannerInputVoiceSessionToken &&
        this.isComponentMounted &&
        !this.plannerInputVoiceStopRequested &&
        document?.activeElement === this.plannerInputVoiceActiveElement &&
        this.isPlannerVoiceTranscriptionInput(
          this.plannerInputVoiceActiveElement,
        )
      ) {
        if (this.plannerInputVoiceRestartTimeout) {
          clearTimeout(this.plannerInputVoiceRestartTimeout);
        }
        this.plannerInputVoiceRestartTimeout = setTimeout(
          () => this.startPlannerInputVoiceTranscription(),
          300,
        );
      }
    };
    recognition.onerror = () => {};
    this.plannerInputVoiceRecognition = recognition;
    try {
      recognition.start();
    } catch {
      this.plannerInputVoiceRecognition = null;
    }
  };
  stopPlannerInputVoiceTranscription = (resumeCommandVoice = true) => {
    this.plannerInputVoiceSessionToken += 1;
    this.plannerInputVoiceStopRequested = true;
    if (this.plannerInputVoiceRestartTimeout) {
      clearTimeout(this.plannerInputVoiceRestartTimeout);
      this.plannerInputVoiceRestartTimeout = null;
    }
    if (this.plannerInputVoiceRecognition) {
      try {
        this.plannerInputVoiceRecognition.stop();
      } catch {}
      this.plannerInputVoiceRecognition = null;
    }
    this.props.serverReply("");
    this.plannerInputVoiceListeningShown = false;
    if (
      resumeCommandVoice &&
      this.plannerVoiceWasRunningBeforeInputFocus &&
      this.state?.plannerSettingsVoiceControlEnabled
    ) {
      this.startPlannerVoiceControl();
    }
    this.plannerVoiceWasRunningBeforeInputFocus = false;
  };
  normalizePlannerVoiceText = (value = "") =>
    (() => {
      const baseNormalize = (nextValue = "") =>
        String(nextValue || "")
          .toLowerCase()
          .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
          .replace(/\u0629/g, "\u0647")
          .replace(/\u0649/g, "\u064A")
          .replace(/\u0647(?=\s|$)/g, "\u0629")
          .replace(/[\u064B-\u065F\u0670]/g, "")
          .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
      const baseValue = baseNormalize(value);
      const rules = Array.isArray(
        this.state?.plannerSelectSettings?.voiceDictationNormalizations,
      )
        ? this.state.plannerSelectSettings.voiceDictationNormalizations
        : [];
      const escapeRegExp = (text = "") =>
        String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const normalizedByRules = rules.reduce((accumulator, rule) => {
        const letter = escapeRegExp(baseNormalize(rule?.letter || ""));
        const normalizedLetter = baseNormalize(rule?.normalizedLetter || "");
        if (!letter || !normalizedLetter) {
          return accumulator;
        }
        const condition = String(rule?.condition || "endOfWord").trim();
        if (condition === "startOfWord") {
          return accumulator.replace(
            new RegExp(`(^|\\s)${letter}`, "g"),
            `$1${normalizedLetter}`,
          );
        }
        if (condition === "anywhere") {
          return accumulator.replace(new RegExp(letter, "g"), normalizedLetter);
        }
        return accumulator.replace(
          new RegExp(`${letter}(?=\\s|$)`, "g"),
          normalizedLetter,
        );
      }, baseValue);
      return normalizedByRules.replace(/\s+/g, " ").trim();
    })();
  plannerVoiceTextContainsAny = (text = "", terms = []) => {
    const normalizedText = this.normalizePlannerVoiceText(text);
    return (Array.isArray(terms) ? terms : []).some((term) =>
      normalizedText.includes(this.normalizePlannerVoiceText(term)),
    );
  };
  mapVoiceTabToPlannerTab = (tabLabel = "") => {
    const normalized = this.normalizePlannerVoiceText(tabLabel);
    if (!normalized) {
      return "";
    }
    if (
      this.plannerVoiceTextContainsAny(normalized, [
        "\u0645\u062d\u0627\u0636\u0631\u0627\u062a",
        "lectures",
      ])
    ) {
      return "lectures";
    }
    if (
      this.plannerVoiceTextContainsAny(normalized, [
        "\u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a",
        "\u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a",
        "exams",
      ])
    ) {
      return "exams";
    }
    if (
      this.plannerVoiceTextContainsAny(normalized, [
        "ai helper",
        "ai",
      ]) ||
      this.plannerVoiceTextContainsAny(normalized, [
        "\u0627\u0644\u0630\u0643\u0627\u0621",
        "\u0627\u0644\u0645\u0633\u0627\u0639\u062f",
        "helper",
      ])
    ) {
      return "ai";
    }
    return "";
  };
  executePlannerVoiceAction = (tabLabel = "", buttonLabel = "") => {
    const normalizedTab = this.normalizePlannerVoiceText(tabLabel);
    const normalizedButton = this.normalizePlannerVoiceText(buttonLabel);
    const plannerTabFromTarget = this.mapVoiceTabToPlannerTab(tabLabel);
    const plannerTabFromButton = this.mapVoiceTabToPlannerTab(buttonLabel);
    const targetPlannerTab =
      plannerTabFromTarget || this.state?.plannerTab || "courses";

    if (
      this.plannerVoiceTextContainsAny(normalizedTab, [
        "\u0627\u0639\u062f\u0627\u062f\u0627\u062a",
        "settings",
      ]) ||
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u0627\u0639\u062f\u0627\u062f\u0627\u062a",
        "settings",
      ])
    ) {
      this.setState({ plannerSettingsVisible: true });
      return true;
    }
    if (plannerTabFromTarget) {
      this.handleWrapperTabChange(plannerTabFromTarget);
    }
    if (plannerTabFromButton) {
      this.handleWrapperTabChange(plannerTabFromButton);
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "ai helper",
        "ai",
      ]) &&
      !plannerTabFromButton
    ) {
      this.handleWrapperTabChange("ai");
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u0631\u062c\u0648\u0639",
        "\u0639\u0648\u062f\u0629",
        "back",
      ])
    ) {
      if (this.state?.plannerSettingsVisible) {
        this.handleBackFromPlannerSettings();
        return true;
      }
      if (targetPlannerTab === "lectures") {
        this.handleBackToCoursesTab();
      }
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u0627\u0636\u0627\u0641\u0629",
        "\u0627\u0636\u0641",
        "add",
      ])
    ) {
      if (targetPlannerTab === "exams") {
        this.openAddExamForm("Add");
      } else {
        this.handleMiniBarAction();
      }
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u062a\u062d\u062f\u064a\u062f",
        "select",
      ])
    ) {
      if (targetPlannerTab === "lectures") {
        this.toggleLectureSelectionMode();
      } else if (targetPlannerTab === "courses") {
        this.enableSavedCourseSelectionMode();
      }
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u062d\u0630\u0641 \u0627\u0644\u0645\u062d\u062f\u062f",
        "delete selected",
      ])
    ) {
      if (targetPlannerTab === "lectures") {
        this.deleteSelectedLectures();
      } else if (targetPlannerTab === "courses") {
        this.deleteSelectedSavedCourse();
      } else if (targetPlannerTab === "exams") {
        this.deleteSelectedExam();
      }
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u062a\u0639\u062f\u064a\u0644",
        "edit",
      ])
    ) {
      if (targetPlannerTab === "exams") {
        this.openAddExamForm("Edit");
      } else {
        this.handleMiniBarEdit();
      }
      return true;
    }
    if (
      this.plannerVoiceTextContainsAny(normalizedButton, [
        "\u062d\u0630\u0641 \u0627\u0644\u0643\u0644",
        "delete all",
      ])
    ) {
      if (targetPlannerTab === "lectures") {
        this.deleteAllVisibleLectures();
      }
      return true;
    }

    return false;
  };
  executePlannerVoiceCommandByElementId = (elementID = "") => {
    if (typeof document === "undefined") {
      return false;
    }
    const normalizedElementId = String(elementID || "").trim();
    if (!normalizedElementId) {
      return false;
    }
    const targetButton = document.getElementById(normalizedElementId);
    if (!targetButton || typeof targetButton.click !== "function") {
      return false;
    }
    targetButton.click();
    return true;
  };
  executePlannerVoiceCommandByIdTree = (idTree = []) => {
    const normalizedTree = Array.isArray(idTree)
      ? idTree.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    if (normalizedTree.length === 0) {
      return false;
    }
    for (let index = normalizedTree.length - 1; index >= 0; index -= 1) {
      if (this.executePlannerVoiceCommandByElementId(normalizedTree[index])) {
        return true;
      }
    }
    return false;
  };
  executePlannerVoiceActionByIdHints = (idTree = [], elementID = "") => {
    const hints = [
      ...(Array.isArray(idTree) ? idTree : []).map((entry) =>
        this.normalizePlannerVoiceText(entry),
      ),
      this.normalizePlannerVoiceText(elementID),
    ].filter(Boolean);
    const joinedHints = hints.join(" ");
    const hasCourseHint =
      joinedHints.includes("courses") ||
      joinedHints.includes("course") ||
      joinedHints.includes("Courses");
    const hasLectureHint =
      joinedHints.includes("lectures") || joinedHints.includes("Lectures");
    const hasExamHint =
      joinedHints.includes("exams") || joinedHints.includes("Exams");
    const hasAddHint =
      joinedHints.includes("add") ||
      joinedHints.includes("add") ||
      joinedHints.includes("add");

    if (hasCourseHint) {
      this.handleWrapperTabChange("courses");
    } else if (hasLectureHint) {
      this.handleWrapperTabChange("lectures");
    } else if (hasExamHint) {
      this.handleWrapperTabChange("exams");
    }
    if (hasAddHint) {
      if (hasExamHint) {
        this.openAddExamForm("Add");
      } else {
        this.handleMiniBarAction();
      }
      return true;
    }
    return false;
  };
  runPlannerVoiceCommand = (rawTranscript = "") => {
    const transcript = this.normalizePlannerVoiceText(rawTranscript);
    if (!transcript) {
      return;
    }
    const customEntries = Array.isArray(
      this.state?.plannerSelectSettings?.voiceCommands,
    )
      ? this.state.plannerSelectSettings.voiceCommands
      : [];
    const normalizedEntries = customEntries
      .map((entry) => ({
        entry,
        normalizedCommand: this.normalizePlannerVoiceText(
          entry?.voiceCommand || entry?.command || "",
        ),
      }))
      .filter((entry) => entry.normalizedCommand);
    const matchedEntry =
      normalizedEntries.find(
        (entry) => transcript === entry.normalizedCommand,
      ) ||
      normalizedEntries
        .sort(
          (first, second) =>
            second.normalizedCommand.length - first.normalizedCommand.length,
        )
        .find((entry) => transcript.includes(entry.normalizedCommand));
    if (!matchedEntry?.entry) {
      this.props.serverReply(`Voice: no match for "${transcript}"`);
      return;
    }
    if (matchedEntry?.entry) {
      const idTree = Array.isArray(matchedEntry.entry?.idTree)
        ? matchedEntry.entry.idTree
        : [];
      const elementId = String(matchedEntry.entry?.elementID || "").trim();
      this.props.serverReply(
        `Voice matched "${matchedEntry.normalizedCommand}" | elementID="${elementId || "-"}" | idTree=[${idTree.join(" > ")}]`,
      );
      const didRunByElementId = this.executePlannerVoiceCommandByElementId(
        matchedEntry.entry?.elementID,
      );
      if (didRunByElementId) {
        this.props.serverReply("Voice executed by elementID click.");
        return;
      }
      const didRunByIdTree = this.executePlannerVoiceCommandByIdTree(idTree);
      if (didRunByIdTree) {
        this.props.serverReply("Voice executed by idTree id click.");
        return;
      }
      const didRunByIdHints = this.executePlannerVoiceActionByIdHints(
        idTree,
        matchedEntry.entry?.elementID,
      );
      if (didRunByIdHints) {
        this.props.serverReply("Voice executed by id hints fallback.");
        return;
      }
      const idTreeTabLabel =
        idTree.find((entry) => this.mapVoiceTabToPlannerTab(entry)) || "";
      const fallbackButtonLabel =
        idTree[idTree.length - 1] ||
        matchedEntry.entry?.button ||
        matchedEntry.entry?.elementID ||
        "";
      this.executePlannerVoiceAction(
        idTreeTabLabel || matchedEntry.entry?.tab || "",
        fallbackButtonLabel,
      );
      this.props.serverReply("Voice executed by legacy tab/button fallback.");
    }
  };
  syncPlannerVoiceControl = () => {
    if (this.state?.plannerSettingsVoiceControlEnabled) {
      this.startPlannerVoiceControl();
      return;
    }
    this.stopPlannerVoiceControl();
  };
  startPlannerVoiceControl = () => {
    if (typeof window === "undefined") {
      return;
    }
    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor || this.plannerVoiceRecognition) {
      return;
    }
    this.plannerVoiceStopRequested = false;
    const recognition = new RecognitionCtor();
    recognition.lang = "ar";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event?.results?.[event.resultIndex];
      const transcript = String(result?.[0]?.transcript || "").trim();
      if (transcript) {
        this.runPlannerVoiceCommand(transcript);
      }
    };
    recognition.onend = () => {
      this.plannerVoiceRecognition = null;
      if (
        this.isComponentMounted &&
        !this.plannerVoiceStopRequested &&
        this.state?.plannerSettingsVoiceControlEnabled
      ) {
        if (this.plannerVoiceRestartTimeout) {
          clearTimeout(this.plannerVoiceRestartTimeout);
        }
        this.plannerVoiceRestartTimeout = setTimeout(
          () => this.startPlannerVoiceControl(),
          350,
        );
      }
    };
    recognition.onerror = () => {};
    this.plannerVoiceRecognition = recognition;
    try {
      recognition.start();
    } catch {
      this.plannerVoiceRecognition = null;
    }
  };
  stopPlannerVoiceControl = () => {
    this.plannerVoiceStopRequested = true;
    if (this.plannerVoiceRestartTimeout) {
      clearTimeout(this.plannerVoiceRestartTimeout);
      this.plannerVoiceRestartTimeout = null;
    }
    if (!this.plannerVoiceRecognition) {
      return;
    }
    try {
      this.plannerVoiceRecognition.stop();
    } catch {}
    this.plannerVoiceRecognition = null;
  };
  handleSavedCourseFloatingBarViewportChange = () => {
    this.scheduleSavedCourseFloatingBarPositionUpdate();
  };
  handleSavedCoursesBodyScroll = () => {
    this.scheduleSavedCourseFloatingBarPositionUpdate();
  };
  renderSavedCoursesTableColGroup = () => (
    <colgroup>
      {Array.from(
        {
          length: 14,
        },
        (_, index) => (
          <col key={`saved-courses-col-${index}`} />
        ),
      )}
    </colgroup>
  );
  getActiveSavedCourseFloatingRowId = () => {
    const {
      plannerTab,
      savedCourseEditorVisible,
      savedCourseSelectionMode,
      selectedSavedCourseIds,
      selectedCourseForLecturesId,
    } = this.state;
    if (
      plannerTab !== "courses" ||
      savedCourseEditorVisible ||
      savedCourseSelectionMode
    ) {
      return "";
    }
    const normalizedSelectedIds = Array.isArray(selectedSavedCourseIds)
      ? selectedSavedCourseIds
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    return (
      normalizedSelectedIds[0] ||
      String(selectedCourseForLecturesId || "").trim()
    );
  };
  setSavedCourseRowRef = (courseId, node) => {
    const normalizedCourseId = String(courseId || "").trim();
    if (!normalizedCourseId) {
      return;
    }
    if (node) {
      this.savedCourseRowRefs.set(normalizedCourseId, node);
      return;
    }
    this.savedCourseRowRefs.delete(normalizedCourseId);
  };
  scheduleSavedCourseFloatingBarPositionUpdate = () => {
    if (this.savedCourseFloatingBarRaf) {
      cancelAnimationFrame(this.savedCourseFloatingBarRaf);
    }
    this.savedCourseFloatingBarRaf = window.requestAnimationFrame(() => {
      this.savedCourseFloatingBarRaf = null;
      this.updateSavedCourseFloatingBarPosition();
    });
  };
  updateSavedCourseFloatingBarPosition = () => {
    const activeCourseId = this.getActiveSavedCourseFloatingRowId();
    const columnNode = this.savedCoursesColumnRef.current;
    const rowNode = activeCourseId
      ? this.savedCourseRowRefs.get(activeCourseId)
      : null;
    if (!activeCourseId || !columnNode || !rowNode) {
      if (this.state.savedCourseFloatingBarPosition !== null) {
        this.setState({
          savedCourseFloatingBarPosition: null,
        });
      }
      return;
    }
    const anchorCellNode = rowNode.querySelector("td");
    const anchorRect = anchorCellNode
      ? anchorCellNode.getBoundingClientRect()
      : rowNode.getBoundingClientRect();
    const rowRect = rowNode.getBoundingClientRect();
    const nextPosition = {
      top: Math.round(rowRect.bottom + 4),
      left: Math.round(anchorRect.right),
      height: Math.round(anchorRect.height),
    };
    const previousPosition = this.state.savedCourseFloatingBarPosition;
    if (
      previousPosition &&
      previousPosition.top === nextPosition.top &&
      previousPosition.left === nextPosition.left &&
      previousPosition.height === nextPosition.height
    ) {
      return;
    }
    this.setState({
      savedCourseFloatingBarPosition: nextPosition,
    });
  };
  retrieveLectures = async () => {
    if (!this.props.state?.my_id) {
      return;
    }
    this.setState({
      lecture_isLoading: true,
    });
    try {
      const response = await fetch(
        apiUrl("/api/user/update/") + this.props.state.my_id,
        {
          method: "GET",
          mode: "cors",
          headers: this.props.state?.token
            ? {
                Authorization: `Bearer ${this.props.state.token}`,
                "Content-Type": "application/json",
              }
            : undefined,
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to retrieve lectures: ${response.status}`);
      }
      const payload = await response.json();
      const memory = normalizeMemoryPayload(payload);
      const nextLectures = getSafePlannerLectures(memory);
      if (!this.isComponentMounted) {
        return;
      }
      this.setState((previousState) => {
        const selectedLectureId = String(previousState.selectedTabItemId || "");
        const selectedLectureStillExists =
          previousState.plannerTab === "lectures" &&
          nextLectures.some(
            (lecture) => String(lecture?._id || "") === selectedLectureId,
          );
        return {
          lectures: nextLectures,
          lecture_isLoading: false,
          selectedTabItemId: selectedLectureStillExists
            ? previousState.selectedTabItemId
            : previousState.plannerTab === "lectures"
              ? null
              : previousState.selectedTabItemId,
        };
      });
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          lecture_isLoading: false,
        });
      }
      console.error("[retrieveLectures] fetch failed:", error);
    }
  };
  retrieveCourses = async (selectedCourseId = "") => {
    if (!this.props.state?.my_id) {
      return;
    }
    this.setState({
      course_isLoading: true,
    });
    try {
      const response = await fetch(
        apiUrl("/api/user/planner-courses/") + this.props.state.my_id,
        {
          method: "GET",
          mode: "cors",
          headers: this.props.state?.token
            ? {
                Authorization: `Bearer ${this.props.state.token}`,
                "Content-Type": "application/json",
              }
            : undefined,
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to retrieve courses: ${response.status}`);
      }
      const payload = await response.json();
      const nextCourses = Array.isArray(payload?.courses)
        ? payload.courses
        : [];
      if (!this.isComponentMounted) {
        return;
      }
      this.setState((previousState) => {
        const requestedCourseId = String(selectedCourseId || "").trim();
        const previousLectureCourseId = String(
          previousState.selectedCourseForLecturesId || "",
        ).trim();
        const previousDetailsCourseId = String(
          previousState.savedCourseDetailsComponentId || "",
        ).trim();
        const nextSelectedCourseId =
          requestedCourseId || previousLectureCourseId || "";
        const courseExists = (targetId) =>
          Boolean(targetId) &&
          nextCourses.some(
            (course) => String(course?._id || "").trim() === String(targetId),
          );
        const normalizedSelectedSavedCourseIds = Array.isArray(
          previousState.selectedSavedCourseIds,
        )
          ? previousState.selectedSavedCourseIds.filter((courseId) =>
              courseExists(String(courseId || "").trim()),
            )
          : [];
        const activeCourse =
          nextCourses.find(
            (course) =>
              String(course?._id || "").trim() === nextSelectedCourseId,
          ) || null;
        return {
          courses: nextCourses,
          course_isLoading: false,
          selectedSavedCourseIds: normalizedSelectedSavedCourseIds,
          selectedCourseForLecturesId: courseExists(nextSelectedCourseId)
            ? nextSelectedCourseId
            : "",
          selectedCourseForLecturesName: activeCourse
            ? buildCourseLectureMatchLabel(activeCourse)
            : "",
          savedCourseDetailsComponentId: courseExists(previousDetailsCourseId)
            ? previousDetailsCourseId
            : "",
        };
      });
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          course_isLoading: false,
        });
      }
      console.error("[retrieveCourses] fetch failed:", error);
    }
  };
  getRenderableCourseExamEntries = (course) => {
    if (!course) {
      return [];
    }
    if (Array.isArray(course.course_exams) && course.course_exams.length > 0) {
      return course.course_exams.map((entry) =>
        normalizeExamEntryForPlanner(entry, course?._id),
      );
    }
    if (course.exam_date || course.exam_time || course.exam_type) {
      return [
        normalizeExamEntryForPlanner(
          {
            exam_type: course.exam_type || "-",
            exam_date: course.exam_date || "-",
            exam_time: course.exam_time || "-",
            course_grade: course.course_grade || "-",
            course_fullGrade: course.course_fullGrade || "-",
          },
          course?._id,
        ),
      ];
    }
    return [];
  };
  getSelectedCourse = () =>
    (this.state.courses || []).find(
      (course) =>
        String(course?._id || "") ===
        String(this.state.selected_course_id || ""),
    ) || null;
  setSelectedCourseWithExamFocus = (courseId = "", examIndex = -1) => {
    const normalizedCourseId = String(courseId || "").trim();
    const currentSelectedCourseId = String(
      this.state.selected_course_id || "",
    ).trim();
    const currentSelectedExamIndex = Number(this.state.selected_exam_index);
    const parsedExamIndex = Number(examIndex);
    const normalizedExamIndex = Number.isFinite(parsedExamIndex)
      ? parsedExamIndex
      : -1;
    if (
      normalizedCourseId &&
      normalizedCourseId === currentSelectedCourseId &&
      normalizedExamIndex === currentSelectedExamIndex
    ) {
      this.setState({
        selected_course_id: "",
        selected_exam_index: -1,
      });
      return;
    }
    const selectedCourse =
      (this.state.courses || []).find(
        (course) => String(course?._id || "").trim() === normalizedCourseId,
      ) || null;
    const examEntries = this.getRenderableCourseExamEntries(selectedCourse);
    const safeExamIndex =
      examEntries.length === 0
        ? -1
        : Math.min(
            Math.max(0, Number.isFinite(parsedExamIndex) ? parsedExamIndex : 0),
            examEntries.length - 1,
          );
    this.setState({
      selected_course_id: selectedCourse?._id || "",
      selected_exam_index: safeExamIndex,
    });
  };
  handleExamDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => ({
      examDraft: {
        ...previousState.examDraft,
        [fieldName]: nextValue,
      },
    }));
  };
  toggleExamDraftLectureId = (lectureId = "") => {
    const normalizedLectureId = String(lectureId || "").trim();
    if (!normalizedLectureId) {
      return;
    }
    this.setState((previousState) => {
      const currentIds = Array.isArray(
        previousState.examDraft?.linkedLectureIds,
      )
        ? previousState.examDraft.linkedLectureIds
        : [];
      const nextIds = currentIds.includes(normalizedLectureId)
        ? currentIds.filter((entry) => entry !== normalizedLectureId)
        : [...currentIds, normalizedLectureId];
      return {
        examDraft: {
          ...previousState.examDraft,
          linkedLectureIds: nextIds,
        },
      };
    });
  };
  getExamLectureOptionsForCourse = (courseId = "") => {
    const targetCourse =
      (this.state.courses || []).find(
        (course) =>
          String(course?._id || "").trim() === String(courseId || "").trim(),
      ) || null;
    if (!targetCourse) {
      return [];
    }
    const targetCourseLabel = buildCourseLectureMatchLabel(targetCourse);
    return (Array.isArray(this.state.lectures) ? this.state.lectures : [])
      .filter(
        (lecture) =>
          String(lecture?.lecture_course || "").trim() === targetCourseLabel ||
          (String(lecture?.lecture_courseName || "").trim() ===
            String(targetCourse?.course_name || "").trim() &&
            !String(lecture?.lecture_course || "").trim()),
      )
      .map((lecture) => ({
        id: String(lecture?._id || "").trim(),
        label: String(lecture?.lecture_name || "").trim() || "-",
      }))
      .filter((entry) => entry.id);
  };
  openAddExamForm = (mode = "Add") => {
    const selectedCourse = this.getSelectedCourse();
    const examEntries = this.getRenderableCourseExamEntries(selectedCourse);
    const selectedExamIndex = this.state.selected_exam_index;
    const safeMode = mode === "Edit" ? "Edit" : "Add";
    const targetExam =
      safeMode === "Edit" && selectedExamIndex >= 0
        ? examEntries[selectedExamIndex] || null
        : null;
    this.setState({
      show_addExamForm: true,
      exam_form_mode: safeMode,
      exam_form_index: safeMode === "Edit" ? selectedExamIndex : -1,
      examDraft: targetExam
        ? buildExamDraftFromEntry(targetExam, selectedCourse?._id || "")
        : this.applyPlannerFieldDefaultsToDraft("exam", {
            ...getDefaultExamDraft(),
            selectedCourseId: selectedCourse?._id || "",
          }),
    });
  };
  closeAddExamForm = () => {
    this.setState({
      show_addExamForm: false,
      exam_form_mode: "Add",
      exam_form_index: -1,
      examDraft: getDefaultExamDraft(),
    });
  };
  saveCourseExamEntries = async (course, nextExamEntries = []) => {
    if (!course?._id || !this.props.state?.my_id) {
      return;
    }
    const cleanedExamEntries = nextExamEntries.map((examEntry) => {
      const normalizedEntry = normalizeExamEntryForPlanner(
        examEntry,
        course?._id,
      );
      return {
        ...(normalizedEntry?._id
          ? {
              _id: normalizedEntry._id,
            }
          : {}),
        componentId:
          normalizedEntry?.componentId ||
          course?.primaryComponentId ||
          course?._id ||
          null,
        type:
          String(
            normalizedEntry?.type || normalizedEntry?.exam_type || "-",
          ).trim() || "-",
        time:
          normalizedEntry?.time && typeof normalizedEntry.time === "object"
            ? normalizedEntry.time
            : {},
        location:
          normalizedEntry?.location &&
          typeof normalizedEntry.location === "object"
            ? normalizedEntry.location
            : {},
        lectures: Array.isArray(normalizedEntry?.lectures)
          ? normalizedEntry.lectures
          : [],
        volume:
          normalizedEntry?.volume && typeof normalizedEntry.volume === "object"
            ? normalizedEntry.volume
            : {},
        weight:
          normalizedEntry?.weight && typeof normalizedEntry.weight === "object"
            ? normalizedEntry.weight
            : {},
        passGrade:
          normalizedEntry?.passGrade &&
          typeof normalizedEntry.passGrade === "object"
            ? normalizedEntry.passGrade
            : {},
        grade:
          normalizedEntry?.grade && typeof normalizedEntry.grade === "object"
            ? normalizedEntry.grade
            : {},
        studyRecommendation:
          normalizedEntry?.studyRecommendation &&
          typeof normalizedEntry.studyRecommendation === "object"
            ? normalizedEntry.studyRecommendation
            : {},
        exam_type:
          String(
            normalizedEntry?.exam_type || normalizedEntry?.type || "-",
          ).trim() || "-",
        exam_date: String(normalizedEntry?.exam_date || "-").trim() || "-",
        exam_time: String(normalizedEntry?.exam_time || "-").trim() || "-",
        course_grade: String(
          normalizedEntry?.course_grade ?? normalizedEntry?.weight?.value ?? "",
        ).trim(),
        course_fullGrade: String(
          normalizedEntry?.course_fullGrade ??
            normalizedEntry?.grade?.max ??
            "",
        ).trim(),
      };
    });
    const primaryExam = getPrimaryCourseExam(cleanedExamEntries);
    const payload = {
      ...course,
      course_exams: cleanedExamEntries,
      course_grade: primaryExam.course_grade,
      course_fullGrade: primaryExam.course_fullGrade,
      exam_type: primaryExam.exam_type,
      exam_date: primaryExam.exam_date,
      exam_time: primaryExam.exam_time,
    };
    const url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      course._id;
    const req = new Request(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const response = await fetch(req);
    if (response.status !== 201) {
      throw new Error("Unable to save exam changes.");
    }
    this.commitPlannerPendingInputMemory();
  };
  submitExamForm = async () => {
    const selectedCourse =
      (this.state.courses || []).find(
        (course) =>
          String(course?._id || "").trim() ===
          String(
            this.state.examDraft?.selectedCourseId ||
              this.state.selected_course_id ||
              "",
          ).trim(),
      ) || null;
    if (!selectedCourse) {
      return;
    }
    const nextExam = buildExamEntryFromDraft(this.state.examDraft);
    if (!String(nextExam?.type || "").trim()) {
      return;
    }
    const currentExamEntries =
      this.getRenderableCourseExamEntries(selectedCourse);
    const nextExamEntries = currentExamEntries.slice();
    if (
      this.state.exam_form_mode === "Edit" &&
      this.state.exam_form_index >= 0
    ) {
      nextExamEntries[this.state.exam_form_index] = nextExam;
    } else {
      nextExamEntries.push(nextExam);
    }
    await this.saveCourseExamEntries(selectedCourse, nextExamEntries);
    this.closeAddExamForm();
    this.setState({
      selected_course_id: selectedCourse._id || "",
      selected_exam_index:
        this.state.exam_form_mode === "Edit"
          ? this.state.exam_form_index
          : nextExamEntries.length - 1,
    });
    this.retrieveCourses(selectedCourse._id);
  };
  deleteSelectedExam = async () => {
    const selectedCourse = this.getSelectedCourse();
    const selectedExamIndex = this.state.selected_exam_index;
    if (!selectedCourse || selectedExamIndex < 0) {
      return;
    }
    const currentExamEntries =
      this.getRenderableCourseExamEntries(selectedCourse);
    const nextExamEntries = currentExamEntries.filter(
      (_, examIndex) => examIndex !== selectedExamIndex,
    );
    await this.saveCourseExamEntries(selectedCourse, nextExamEntries);
    this.setState({
      selected_exam_index: -1,
    });
    this.retrieveCourses(selectedCourse._id);
  };
  renderSavedCoursesColumn = () => {
    return (
      <NogaPlannerSavedCoursesPanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
      />
    );
  };
  renderPlannerCoursesManager = () => {
    const plannerRoot = this.getResolvedPlannerRoot();
    const plannerProgramId = String(plannerRoot?.programID || "").trim();
    const isProgramSet = Boolean(
      this.state?.homeProgramCardSet || plannerProgramId,
    );
    const isHomeCardsLocked = !isProgramSet;
    const plannerComponentIds = (
      Array.isArray(plannerRoot?.programComponentClasses)
        ? plannerRoot.programComponentClasses
        : []
    )
      .map((entry) => this.normalizeProgramComponentValue(entry))
      .filter(Boolean);
    const plannerIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const homeCoursesRows = plannerIntervals
      .flatMap((intervalEntry) => {
        const intervalID = this.getPlannerIntervalSchemaID(intervalEntry);
        const subIntervalId = this.getPlannerSubIntervalSchemaID(intervalEntry);
        const intervalCourses = Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
          : [];
        return intervalCourses.map((courseEntry, courseIndex) => {
          const courseID = this.getPlannerCourseSchemaID(courseEntry);
          const sourceCourseComponents = Array.isArray(
            courseEntry?.courseComponents,
          )
            ? courseEntry.courseComponents
            : Array.isArray(courseEntry?.componentIds)
              ? courseEntry.componentIds.map((componentId) => ({
                  componentId,
                }))
              : [];
          const courseComponents = sourceCourseComponents
            .map((componentEntry, componentIndex) => {
              const normalizedComponent =
                this.normalizeHomeCourseComponentDraftEntry(componentEntry);
              if (!normalizedComponent) {
                return null;
              }
              return {
                key: `${subIntervalId}_${courseIndex}_${String(
                  courseEntry?.courseName || courseID || "",
                ).trim()}_${String(normalizedComponent.componentID || normalizedComponent.componentId || "").trim()}_${componentIndex}`,
                ...normalizedComponent,
                componentExams: Array.isArray(
                  normalizedComponent?.componentExams,
                )
                  ? normalizedComponent.componentExams
                  : [],
              };
            })
            .filter(Boolean);
        return {
          key: `${subIntervalId}_${courseIndex}_${String(
            courseEntry?.courseName || courseID || "",
          ).trim()}`,
          intervalID,
          subIntervalID: subIntervalId,
          courseID,
          courseId: courseID,
          courseName: String(
            courseEntry?.courseName || courseID || "",
          ).trim(),
          courseCode: String(courseEntry?.courseCode || "").trim(),
          courseComponentId: String(
            courseEntry?.courseComponentId || courseEntry?.course_componentId || "",
          ).trim(),
          subIntervalId,
          intervalId: subIntervalId,
          components:
            courseComponents.length > 0
              ? courseComponents
                : [
                    {
                      key: `${subIntervalId}_${courseIndex}_${String(
                        courseEntry?.courseName || courseEntry?.courseId || "",
                      ).trim()}_empty`,
                      componentId: "-",
                      componentWeightPercentage: "-",
                      componentStatus: "-",
                    },
                  ],
          };
        });
      })
      .filter((entry) => Boolean(entry.courseName) && Boolean(entry.intervalId));
    const coursesHasRegisteredValue = homeCoursesRows.length > 0;
    const coursesEditorOpen = Boolean(this.state?.homeCoursesEditorOpen);
    const courseNameDraftValue = String(
      this.state?.homeCourseNameDraft || "",
    ).trim();
    const courseIdDraftValue = String(
      this.state?.homeCourseIdDraft || "",
    ).trim();
    const courseCodeDraftValue = String(
      this.state?.homeCourseCodeDraft || "",
    ).trim();
    const courseWeightDraftValue = String(
      this.state?.homeCourseTotalWeightDraft || "",
    ).trim();
    const parsedCourseWeightDraftValue = Number.parseFloat(courseWeightDraftValue);
    const resolvedCourseDraft = this.resolvePlannerCourseDraft({
      courseId: courseIdDraftValue,
      courseName: courseNameDraftValue,
      courseCode: courseCodeDraftValue,
    });
    const resolvedCourseIdDraftValue = String(
      resolvedCourseDraft?._id || courseIdDraftValue || "",
    ).trim();
    const resolvedCourseCodeDraftValue = String(
      courseCodeDraftValue ||
        resolvedCourseDraft?.course_code ||
        resolvedCourseDraft?.code ||
        "",
    ).trim();
    const courseSubIntervalYearDraftValue = String(
      this.state?.homeCourseSubIntervalYearDraft || "",
    ).trim();
    const courseSubIntervalTermDraftValue = String(
      this.state?.homeCourseSubIntervalTermDraft || "",
    ).trim();
    const courseIntervalDraftValue = String(
      this.state?.homeCourseIntervalIdDraft ||
        `${courseSubIntervalYearDraftValue}${courseSubIntervalTermDraftValue}`,
    ).trim();
    const courseComponentIdDraftValue = String(
      this.state?.homeCourseComponentIdDraft || "",
    ).trim();
    const componentWeightPercentageDraftValue = String(
      this.state?.homeCourseComponentPartialWeightDraft || "",
    ).trim();
    const courseComponentStatusDraftValue = String(
      this.state?.homeCourseComponentStatusDraft || "",
    ).trim();
    const courseComponentDraftValues = Array.from(
      new Map(
        (Array.isArray(this.state?.homeCourseComponentDraft)
          ? this.state.homeCourseComponentDraft
          : [this.state?.homeCourseComponentDraft]
        )
          .map((entry) => this.normalizeHomeCourseComponentDraftEntry(entry))
          .filter(Boolean)
          .map((entry) => [entry.componentId, entry]),
      ).values(),
    );
    const courseComponentOptions =
      plannerComponentIds.length > 0
        ? plannerComponentIds
        : ["Class", "Lab", "Other"];
    const courseComponentStatusOptions = [
      "pending",
      "new",
      "failed",
      "passed",
      "incomplete",
      "ongoing",
    ];
    const canAddCourseComponentDraft = Boolean(
      courseComponentIdDraftValue && componentWeightPercentageDraftValue,
    );
    const canSubmitCourses = Boolean(
      courseNameDraftValue &&
        courseCodeDraftValue &&
        courseWeightDraftValue &&
        courseComponentIdDraftValue &&
        componentWeightPercentageDraftValue &&
        courseIntervalDraftValue,
    );
    const courseComponentDraftValuesForSubmit =
      courseComponentDraftValues.length > 0
          ? courseComponentDraftValues
          : canAddCourseComponentDraft
            ? [
              this.normalizeHomeCourseComponentDraftEntry({
                  componentId: courseComponentIdDraftValue,
                  componentWeightPercentage: componentWeightPercentageDraftValue,
                  componentWeight:
                    Number.isFinite(parsedCourseWeightDraftValue) &&
                    Number.isFinite(
                      Number.parseFloat(componentWeightPercentageDraftValue),
                    )
                      ? Number(
                          (
                            parsedCourseWeightDraftValue *
                            (Number.parseFloat(componentWeightPercentageDraftValue) / 100)
                          ).toFixed(4),
                        )
                      : null,
                  componentExams: String(
                    this.state?.homeCourseLectureNameDraft || "",
                  ).trim()
                    ? [
                        {
                          examID: "",
                          examsLectures: [
                            {
                              lectureName: String(
                                this.state?.homeCourseLectureNameDraft || "",
                              ).trim(),
                              lectureInstructors: String(
                                this.state?.homeCourseLectureInstructorsDraft || "",
                              )
                                .split(/[,\n|]/)
                                .map((entry) => String(entry || "").trim())
                                .filter(Boolean),
                              lectureInstructionDate: this.formatPlannerDateInputValue(
                                this.state?.homeCourseLectureInstructionDateDraft || "",
                              ),
                            },
                          ],
                        },
                      ]
                    : [],
                }),
              ].filter(Boolean)
            : [];
    const homeCoursesPreviewRows = (() => {
      const editingKey = String(this.state?.homeCourseEditingKey || "").trim();
      const nextRows = editingKey
        ? homeCoursesRows.filter(
            (entry) => String(entry?.key || "").trim() !== editingKey,
          )
        : [...homeCoursesRows];
      const hasDraftValues = Boolean(
        resolvedCourseIdDraftValue ||
          courseNameDraftValue ||
          resolvedCourseCodeDraftValue ||
          courseWeightDraftValue ||
          courseComponentIdDraftValue ||
          componentWeightPercentageDraftValue ||
          courseComponentDraftValues.length > 0 ||
          String(this.state?.homeCourseLectureNameDraft || "").trim() ||
          String(this.state?.homeCourseLectureInstructorsDraft || "").trim() ||
          String(this.state?.homeCourseLectureInstructionDateDraft || "").trim() ||
          courseIntervalDraftValue,
      );
      if (!coursesEditorOpen || !hasDraftValues) {
        return nextRows;
      }
      nextRows.unshift({
        key: `draft_${editingKey || "new"}`,
        courseId: resolvedCourseIdDraftValue || "-",
        courseName: courseNameDraftValue || "-",
        courseCode: resolvedCourseCodeDraftValue || "-",
        courseWeight: courseWeightDraftValue || "-",
        courseComponentId: courseComponentIdDraftValue || "-",
        componentWeightPercentage:
          componentWeightPercentageDraftValue || "-",
        subIntervalId: courseIntervalDraftValue || "-",
        intervalId: courseIntervalDraftValue || "-",
        components:
          courseComponentDraftValuesForSubmit.length > 0
            ? courseComponentDraftValuesForSubmit
            : [
                {
                  componentId: "-",
                  componentWeightPercentage: "-",
                  componentStatus: "-",
                },
              ],
        isPreview: true,
      });
      return nextRows;
    })();
    return (
      <div
        id="nogaPlanner_courses_managerCard"
        className={
          "nogaPlanner_homePanelCard" +
          (isHomeCardsLocked ? " nogaPlanner_homePanelCard--disabled" : "")
        }
      >
        <div id="nogaPlanner_homePanelCardTitleRow" className="nogaPlanner_homePanelCardTitleRow">
          <strong id="nogaPlanner_courses_heading">Courses</strong>
          <div id="nogaPlanner_homePanelCardActions" className="nogaPlanner_homePanelCardActions">
            {coursesEditorOpen ? (
              <button
                id="nogaPlanner_home_button_courses_submit"
                type="button"
                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                disabled={isHomeCardsLocked || !canSubmitCourses}
                onClick={this.handleHomeCoursesSetSubmit}
              >
                Submit
              </button>
            ) : (
              <button
                id="nogaPlanner_home_button_courses_setEdit"
                type="button"
                className="nogaPlanner_homePanelCardSetBtn"
                disabled={isHomeCardsLocked}
                onClick={() =>
                  this.setState({
                    homeCoursesEditorOpen: true,
                    homeCourseEditingKey: "",
                    homeCourseOriginalId: "",
                    homeCourseOriginalIntervalId: "",
                    homeCourseNameDraft: "",
                    homeCourseIdDraft: "",
                    homeCourseCodeDraft: "",
                    homeCourseComponentDraft: [],
                    homeCourseComponentEditingId: "",
                    homeCourseTotalWeightDraft: "",
                    homeCourseSubIntervalYearDraft: "",
                    homeCourseSubIntervalTermDraft: "",
                    homeCourseComponentIdDraft: "",
                    homeCourseComponentPartialWeightDraft: "",
                    homeCourseComponentStatusDraft: "",
                    homeCourseIntervalIdDraft: "",
                  })
                }
              >
                {coursesHasRegisteredValue ? "Edit" : "Set"}
              </button>
            )}
            {coursesEditorOpen ? (
              <button
                id="nogaPlanner_home_button_courses_cancel"
                type="button"
                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                disabled={isHomeCardsLocked}
                onClick={this.cancelHomeCoursesEditor}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
        {coursesEditorOpen ? (
          <div id="nogaPlanner_homeIntervalsMiniForm" className="nogaPlanner_homeIntervalsMiniForm">
            <div id="nogaPlanner_homeIntervalsAddRow" className="nogaPlanner_homeIntervalsAddRow">
              <div id="nogaPlanner_homeIntervalsMiniFormField" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Course name
                </span>
                <input
                  id="nogaPlanner_homeIntervalsInput"
                  type="text"
                  name="homeCourseName"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Course name"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseNameDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeCourseNameDraft: String(event.target.value || ""),
                    })
                  }
                />
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_2" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_2" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Course Code
                </span>
                <input
                  id="nogaPlanner_homeIntervalsInput_2"
                  type="text"
                  name="homeCourseCode"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Course Code"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseCodeDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeCourseCodeDraft: String(event.target.value || ""),
                    })
                  }
                />
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_3" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_3" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Course weight
                </span>
                <input
                  id="nogaPlanner_homeIntervalsInput_3"
                  type="number"
                  name="homeCourseWeight"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Course weight"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseTotalWeightDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeCourseTotalWeightDraft: String(event.target.value || ""),
                    })
                  }
                />
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_4" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_4" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Component Status
                </span>
                <select
                  id="nogaPlanner_homeIntervalsInput_4"
                  name="homeCourseComponentStatus"
                  className="nogaPlanner_homeIntervalsInput"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseComponentStatusDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeCourseComponentStatusDraft: String(
                        event.target.value || "",
                      ),
                    })
                  }
                >
                  <option value="">Status</option>
                  {courseComponentStatusOptions.map((statusValue) => (
                    <option
                      key={`nogaPlanner_homeCourseComponentStatusOption_${statusValue}`}
                      value={statusValue}
                    >
                      {formatPlannerStatusLabel(statusValue)}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_5" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_5" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Component
                </span>
                <select
                  id="nogaPlanner_home_courseComponentSelect"
                  name="homeCourseComponent"
                  className="nogaPlanner_homeIntervalsInput"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseComponentIdDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeCourseComponentIdDraft: String(
                        event.target.value || "",
                      ).trim(),
                    })
                  }
                >
                  <option value="">Component</option>
                  {courseComponentOptions.map((componentId) => (
                    <option
                      key={`nogaPlanner_homeCourseComponentOption_${componentId}`}
                      value={componentId}
                    >
                      {componentId}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_6" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_6" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Component weight percentage
                </span>
                <input
                  id="nogaPlanner_homeIntervalsInput_5"
                  type="number"
                  name="homeCourseComponentPartialWeight"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Component weight percentage"
                  disabled={isHomeCardsLocked}
                  value={String(
                    this.state?.homeCourseComponentPartialWeightDraft || "",
                  )}
                  onChange={(event) =>
                    this.setState({
                      homeCourseComponentPartialWeightDraft: String(
                        event.target.value || "",
                      ),
                    })
                  }
                />
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_7" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_7" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  Interval num
                </span>
                <input
                  id="nogaPlanner_homeIntervalsInput_6"
                  type="text"
                  name="homeCourseSubIntervalNum"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Interval num"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseSubIntervalYearDraft || "")}
                  onChange={(event) =>
                    this.setState((previousState) => {
                      const nextIntervalNum = String(event.target.value || "").trim();
                      const nextSubIntervalNum = String(
                        previousState?.homeCourseSubIntervalTermDraft || "",
                      ).trim();
                      return {
                        homeCourseSubIntervalYearDraft: nextIntervalNum,
                        homeCourseIntervalIdDraft:
                          nextIntervalNum && nextSubIntervalNum
                            ? `${nextIntervalNum}_${nextSubIntervalNum}`
                            : "",
                      };
                    })
                  }
                />
              </div>
              <div id="nogaPlanner_homeIntervalsMiniFormField_8" className="nogaPlanner_homeIntervalsMiniFormField">
                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_8" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                  sub-Interval num
                </span>
                <select
                  id="nogaPlanner_homeIntervalsInput_7"
                  name="homeCourseSubIntervalTerm"
                  className="nogaPlanner_homeIntervalsInput"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeCourseSubIntervalTermDraft || "")}
                  onChange={(event) =>
                    this.setState((previousState) => {
                      const nextSubIntervalNum = String(event.target.value || "").trim();
                      const nextIntervalNum = String(
                        previousState?.homeCourseSubIntervalYearDraft || "",
                      ).trim();
                      return {
                        homeCourseSubIntervalTermDraft: nextSubIntervalNum,
                        homeCourseIntervalIdDraft:
                          nextIntervalNum && nextSubIntervalNum
                            ? `${nextIntervalNum}_${nextSubIntervalNum}`
                            : "",
                      };
                    })
                  }
                >
                  <option value="">Sub-Interval num</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <button
                id="nogaPlanner_home_button_courseComponent_add"
                type="button"
                className="nogaPlanner_homePanelCardSetBtn"
                disabled={isHomeCardsLocked || !canAddCourseComponentDraft}
                onClick={this.appendHomeCourseComponentDraftEntry}
              >
                Add
              </button>
            </div>
          </div>
        ) : null}
        <table id="nogaPlanner_courses_miniTable" className="nogaPlanner_homeIntervalsMiniTable nogaPlanner_homeCoursesMiniTable">
          <thead id="nogaPlanner_courses_tableHead">
            <tr id="nogaPlanner_courses_tableHeadRow1">
              <th id="nogaPlanner_courses_th_courseName" rowSpan={2}>Course name</th>
              <th id="nogaPlanner_courses_th_courseCode" rowSpan={2}>Course Code</th>
              <th id="nogaPlanner_courses_th_courseWeight" rowSpan={2}>Course weight</th>
              <th id="nogaPlanner_courses_th_subInterval" colSpan={2}>Program sub-Interval</th>
              <th id="nogaPlanner_courses_th_components" rowSpan={2}>Components</th>
              <th id="nogaPlanner_courses_th_componentWeight" rowSpan={2}>Component weight</th>
              <th id="nogaPlanner_courses_th_componentStatus" rowSpan={2}>Component status</th>
              <th id="nogaPlanner_courses_th_actions" rowSpan={2}>Actions</th>
            </tr>
            <tr id="nogaPlanner_courses_tableHeadRow2">
              <th id="nogaPlanner_courses_th_intervalNum">Interval num</th>
              <th id="nogaPlanner_courses_th_subIntervalNum">sub-Interval num</th>
            </tr>
          </thead>
          <tbody id="nogaPlanner_courses_tableBody">
            {homeCoursesPreviewRows.length === 0 ? (
              <tr id="nogaPlanner_courses_emptyRow">
                <td id="nogaPlanner_courses_emptyCell" colSpan={9}>No courses yet.</td>
              </tr>
            ) : (
              homeCoursesPreviewRows.flatMap((courseEntry) => {
                const intervalDisplay = this.parseIntervalIdYearTerm(
                  courseEntry?.subIntervalId || courseEntry?.intervalId || "",
                );
                const courseComponents = Array.isArray(courseEntry?.components)
                  ? courseEntry.components
                  : [];
                const displayComponents =
                  courseComponents.length > 0
                    ? courseComponents
                    : [
                        {
                          key: `${courseEntry?.key || "course"}_empty`,
                          componentId: "-",
                          componentWeight: "-",
                          componentWeightPercentage: "-",
                          componentStatus: "-",
                        },
                      ];
                const rowSpan = displayComponents.length;
                return displayComponents.map((componentEntry, index) => (
                  <tr
                    id={`nogaPlanner_courses_tableRow_${courseEntry.key}_${componentEntry.key || index}`}
                    key={`nogaPlanner_homeCourseRow_${courseEntry.key}_${componentEntry.key || index}`}
                    className={courseEntry?.isPreview ? "is-preview" : ""}
                  >
                    {index === 0 ? (
                      <>
                        <td id={`nogaPlanner_courses_td_courseName_${courseEntry.key}`} rowSpan={rowSpan}>{this.formatPlannerTableValue(courseEntry.courseName || courseEntry.courseId)}</td>
                        <td id={`nogaPlanner_courses_td_courseCode_${courseEntry.key}`} rowSpan={rowSpan}>{this.formatPlannerTableValue(courseEntry.courseCode)}</td>
                        <td id={`nogaPlanner_courses_td_courseWeight_${courseEntry.key}`} rowSpan={rowSpan}>{this.formatPlannerTableValue(courseEntry.courseWeight)}</td>
                        <td id={`nogaPlanner_courses_td_intervalNum_${courseEntry.key}`} rowSpan={rowSpan}>
                          {this.formatPlannerTableValue(
                            intervalDisplay.intervalNum ||
                              intervalEntry?.intervalNum ||
                              intervalDisplay.year,
                          )}
                        </td>
                        <td id={`nogaPlanner_courses_td_subIntervalNum_${courseEntry.key}`} rowSpan={rowSpan}>
                          {this.formatPlannerTableValue(
                            intervalDisplay.subIntervalNum ||
                              intervalEntry?.subIntervalNum ||
                              intervalDisplay.term,
                          )}
                        </td>
                      </>
                    ) : null}
                    <td id={`nogaPlanner_courses_td_componentId_${courseEntry.key}_${index}`}>{this.formatPlannerTableValue(componentEntry?.componentId)}</td>
                    <td id={`nogaPlanner_courses_td_componentWeight_${courseEntry.key}_${index}`}>
                      {this.formatPlannerComponentWeightValue(
                        componentEntry?.componentWeight ||
                          componentEntry?.componentRelativeWeight ||
                          componentEntry?.componentPartialWeight ||
                          componentEntry?.componentWeightPercentage ||
                          "",
                      )}
                    </td>
                    <td id={`nogaPlanner_courses_td_componentStatus_${courseEntry.key}_${index}`}>
                      {formatPlannerStatusLabel(componentEntry?.componentStatus)}
                    </td>
                    {index === 0 ? (
                      <td id={`nogaPlanner_courses_td_actions_${courseEntry.key}`} rowSpan={rowSpan}>
                        {courseEntry?.isPreview ? (
                          "-"
                        ) : (
                          <div id={`nogaPlanner_courses_rowActions_${courseEntry.key}`} className="nogaPlanner_homeIntervalRowActions">
                            <button
                              id="nogaPlanner_home_button_course_edit"
                              type="button"
                              className="nogaPlanner_homePanelCardSetBtn"
                              disabled={isHomeCardsLocked}
                              onClick={() => this.editHomeCourseEntry(courseEntry)}
                            >
                              Edit
                            </button>
                            <button
                              id="nogaPlanner_home_button_course_delete"
                              type="button"
                              className="nogaPlanner_homeIntervalsDeleteIconBtn"
                              aria-label="Delete course metadata row"
                              disabled={isHomeCardsLocked}
                              onClick={() => this.deleteHomeCourseEntry(courseEntry)}
                            >
                              <i className="fi fi-br-cross" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };
  renderSelectedCourseExamBoard = (embedded = false) => {
    return (
      <NogaPlannerExamBoardPanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
        embedded={embedded}
      />
    );
  };
  renderSelectedCourseStudyPlan = () => {
    return (
      <NogaPlannerStudyPlanPanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
      />
    );
  };
  renderPlannerHome = () => {
    const profile = this.props?.state?.profile || this.props?.state || {};
    const studying =
      profile?.studying && typeof profile.studying === "object"
        ? profile.studying
        : {};
    const programName = String(
      studying?.programName || studying?.program || "",
    ).trim();
    const components = Array.isArray(studying?.programComponentClasses)
      ? studying.programComponentClasses
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : Array.isArray(studying?.componentsClass)
        ? studying.componentsClass
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        : [];
    const plannerRoot = this.getResolvedPlannerRoot();
    const programLanguage = String(plannerRoot?.programLanguage || "").trim();
    const locationUniversity = String(
      plannerRoot?.programUniversity || "",
    ).trim();
    const locationFaculty = String(plannerRoot?.programFaculty || "").trim();
    const currentInterval = String(
      studying?.programTerms?.current?.interval ||
        studying?.academicYearsIntervals?.current?.interval ||
        studying?.time?.currentAcademicYear ||
        "",
    ).trim();
    const currentTerm = String(
      studying?.programTerms?.current?.term ||
        studying?.academicYearsIntervals?.current?.term ||
        studying?.time?.currentDate?.term ||
        "",
    ).trim();
    const plannerProgramId = String(plannerRoot?.programID || "").trim();
    const isProgramSet = Boolean(
      this.state?.homeProgramCardSet || plannerProgramId,
    );
    const isComponentsCardLocked = !isProgramSet;
    const isHomeCardsLocked = !isProgramSet;
    const plannerComponents = Array.isArray(plannerRoot?.programComponentClasses)
      ? plannerRoot.programComponentClasses
      : [];
    const plannerComponentIds = plannerComponents
      .map((entry) => this.normalizeProgramComponentValue(entry))
      .filter(Boolean);
    const plannerExams = Array.isArray(plannerRoot?.programExamClasses)
      ? plannerRoot.programExamClasses
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const registeredProgramComponents = plannerComponentIds
      .map((entry, index) => ({
        key: String(entry || `${index}`),
        label: String(entry || "").trim(),
      }))
      .filter((entry) => Boolean(entry.label));
    const registeredProgramExams = plannerExams.map((entry, index) => ({
      key: `${entry}_${index}`,
      label: entry,
    }));
    const plannerIntervalsFromComponents =
      this.getPlannerIntervalsWithComponents(plannerRoot)
        .map((intervalEntry) => {
          const intervalId = this.getPlannerIntervalSchemaID(intervalEntry);
          const parsedInterval = this.parseIntervalIdYearTerm(
            this.getPlannerSubIntervalSchemaID(intervalEntry) || intervalId,
          );
          if (!parsedInterval.year || !parsedInterval.term) {
            return null;
          }
          return {
            ...intervalEntry,
            year: parsedInterval.year,
            term: parsedInterval.term,
          };
        })
        .filter(Boolean);
    const plannerIntervals = plannerIntervalsFromComponents;
    const inferTermLabelFromDate = (value = "") => {
      const normalized = String(value || "").trim();
      const match = normalized.match(/^\d{4}-(\d{2})-\d{2}$/);
      const month = Number(match?.[1] || 0);
      if (month >= 9 && month <= 12) {
        return "Term 1";
      }
      if (month >= 1 && month <= 6) {
        return "Term 2";
      }
      if (month >= 7 && month <= 8) {
        return "Summer";
      }
      return currentTerm || "-";
    };
    const mergeIntervalEntriesByKey = (entries = []) =>
      Array.from(
        entries
          .reduce((map, entry) => {
            if (!entry || !entry.key) {
              return map;
            }
            const previousEntry = map.get(entry.key);
            if (!previousEntry) {
              map.set(entry.key, {
                ...entry,
                intervalCourses: Array.isArray(entry.intervalCourses)
                  ? entry.intervalCourses
                  : [],
              });
              return map;
            }
            map.set(entry.key, {
              ...previousEntry,
              ...entry,
              regular:
                typeof entry?.regular === "boolean"
                  ? entry.regular
                  : Boolean(previousEntry?.regular),
              intervalCourses:
                Array.isArray(entry.intervalCourses) &&
                entry.intervalCourses.length > 0
                  ? entry.intervalCourses
                  : Array.isArray(previousEntry.intervalCourses)
                    ? previousEntry.intervalCourses
                    : [],
            });
            return map;
          }, new Map())
          .values(),
      );
    const normalizedIntervals = mergeIntervalEntriesByKey(
      plannerIntervals
        .map((entry, index) => {
          const intervalId = this.getPlannerIntervalSchemaID(entry);
          const subIntervalId = this.getPlannerSubIntervalSchemaID(entry);
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          const intervalNumValue =
            Number.parseInt(String(entry?.intervalNum || "").trim(), 10) || null;
          if (parsedInterval.year && parsedInterval.term) {
            const intervalKey = String(entry?.key || subIntervalId).trim();
            const savedDates = this.getPlannerSubIntervalTryDates(entry);
            const savedStart = String(savedDates.start || "").trim();
            const savedEnd = String(savedDates.end || "").trim();
            const resolvedIntervalId = String(
              this.getPlannerIntervalSchemaID(entry) || intervalId,
            ).trim();
            const resolvedIntervalTryNum =
              Number.parseInt(String(entry?.intervalTryNum || "").trim(), 10) || null;
            const resolvedIntervalTrySymbol = String(
              entry?.intervalTrySymbol || "IT",
            ).trim();
            let resolvedStart = savedStart;
            let resolvedEnd = savedEnd;
            if (!savedStart || !savedEnd) {
              const progStartYear = Number(this.state?.homeProgramStartYearValue || 0);
              const termsPerYr = Number(this.state?.homeProgramTermsPerYearValue || 1) || 1;
              const iNum = Number.isInteger(intervalNumValue) ? intervalNumValue : 0;
              const siNum =
                Number.parseInt(String(entry?.subIntervalNum || "").trim(), 10) || 0;
              const tryNum =
                resolvedIntervalTryNum || 1;
              const tryOffset = Math.max(0, tryNum - 1);
              if (iNum > 0 && siNum > 0 && progStartYear >= 1000) {
                const sYear = progStartYear + (iNum - 1) + Math.ceil((siNum - 1) / termsPerYr) + tryOffset;
                const eYear = progStartYear + iNum + tryOffset;
                resolvedStart = savedStart || `${sYear}`;
                resolvedEnd = savedEnd || `${eYear}`;
              }
            }
            return {
              key: intervalKey,
              intervalId: resolvedIntervalId,
              intervalNum: intervalNumValue,
              intervalSymbol: String(entry?.intervalSymbol || parsedInterval?.intervalSymbol || "INT").trim(),
              intervalTryID: String(entry?.intervalTryID || "").trim(),
              intervalTryNum: resolvedIntervalTryNum,
              intervalTrySymbol: resolvedIntervalTrySymbol,
              subIntervalId,
              subIntervalNum:
                Number.parseInt(String(entry?.subIntervalNum || "").trim(), 10) || null,
              subIntervalSymbol: String(entry?.subIntervalSymbol || parsedInterval?.subIntervalSymbol || "sINT").trim(),
              regular:
                typeof entry?.regular === "boolean"
                  ? entry.regular
                  : Boolean(entry?.expected),
              year: parsedInterval.year || "-",
              term: parsedInterval.term || "-",
              intervalStatus:
                String(entry?.intervalStatus || "Normal").trim() || "Normal",
              subIntervalTryNum:
                Number.parseInt(String(entry?.intervalTryNum || "").trim(), 10) ||
                null,
              subIntervalTryDates: { start: resolvedStart, end: resolvedEnd },
              subIntervalDates: { start: resolvedStart, end: resolvedEnd },
              startDate: resolvedStart,
              endDate: resolvedEnd,
            };
          }
          const explicitYear = String(entry?.year || "").trim();
          const explicitTerm = String(entry?.term || "").trim();
          const startDate = String(entry?.startDate || "").trim();
          const endDate = String(entry?.endDate || "").trim();
          const startYear = startDate.slice(0, 4);
          const endYear = endDate.slice(0, 4);
          const intervalYear =
            explicitYear || (startYear && endYear)
              ? startYear === endYear
                ? startYear
                : `${startYear}-${endYear}`
              : currentInterval || "-";
          const intervalTerm =
            explicitTerm || inferTermLabelFromDate(startDate);
          const intervalKey = String(
            entry?._id || `${startDate}-${endDate}-${index}`,
          ).trim();
          return {
            key: intervalKey,
            intervalId,
            intervalNum: intervalNumValue,
            intervalTryID: String(entry?.intervalTryID || "").trim(),
            subIntervalId,
            regular:
              typeof entry?.regular === "boolean"
                ? entry.regular
                : Boolean(entry?.expected),
            year: intervalYear || "-",
            term: intervalTerm || "-",
            intervalStatus:
              String(entry?.intervalStatus || "Normal").trim() || "Normal",
            subIntervalTryNum: Number.isFinite(Number.parseInt(entry?.subIntervalTryNum, 10))
              ? Number.parseInt(entry.subIntervalTryNum, 10)
              : null,
            subIntervalTryDates: {
              start: String(
                entry?.subIntervalTryDates?.start ||
                  entry?.subIntervalDates?.start ||
                  startDate ||
                  "",
              ).trim(),
              end: String(
                entry?.subIntervalTryDates?.end ||
                  entry?.subIntervalDates?.end ||
                  endDate ||
                  "",
              ).trim(),
            },
            subIntervalDates: {
              start: String(
                entry?.subIntervalTryDates?.start ||
                  entry?.subIntervalDates?.start ||
                  startDate ||
                  "",
              ).trim(),
              end: String(
                entry?.subIntervalTryDates?.end ||
                  entry?.subIntervalDates?.end ||
                  endDate ||
                  "",
              ).trim(),
            },
            startDate: String(
              entry?.subIntervalTryDates?.start ||
                entry?.subIntervalDates?.start ||
                startDate ||
                "",
            ).trim(),
            endDate: String(
              entry?.subIntervalTryDates?.end ||
                entry?.subIntervalDates?.end ||
                endDate ||
                "",
            ).trim(),
          };
        })
        .filter((entry) => Boolean(entry) && (entry.year || entry.term)),
    );
    const currentIntervalKey = String(
      this.state?.homeCurrentIntervalKey || "",
    ).trim();
    const homeCoursesRows = plannerIntervals
      .flatMap((intervalEntry) => {
        const intervalId = String(intervalEntry?.intervalId || "").trim();
        const subIntervalId = String(
          intervalEntry?.subIntervalId || intervalEntry?.subintervalId || intervalId,
        ).trim();
        const intervalCourses = Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
          : [];
        return intervalCourses.map((courseEntry, courseIndex) => {
          const sourceCourseComponents = Array.isArray(
            courseEntry?.courseComponents,
          )
            ? courseEntry.courseComponents
            : Array.isArray(courseEntry?.componentIds)
              ? courseEntry.componentIds.map((componentId) => ({
                  componentId,
                }))
              : [];
          const courseComponents = sourceCourseComponents
            .map((componentEntry, componentIndex) => {
              const normalizedComponent =
                this.normalizeHomeCourseComponentDraftEntry(componentEntry);
              if (!normalizedComponent) {
                return null;
              }
              return {
                key: `${subIntervalId}_${courseIndex}_${String(
                  courseEntry?.courseName || courseEntry?.courseId || "",
                ).trim()}_${normalizedComponent.componentId}_${componentIndex}`,
                ...normalizedComponent,
              };
            })
            .filter(Boolean);
          return {
            key: `${subIntervalId}_${courseIndex}_${String(
              courseEntry?.courseName || courseEntry?.courseId || "",
            ).trim()}`,
            courseId: String(
              courseEntry?.courseName || courseEntry?.courseId || "",
            ).trim(),
            courseName: String(
              courseEntry?.courseName || courseEntry?.courseId || "",
            ).trim(),
            courseCode: String(courseEntry?.courseCode || "").trim(),
            courseWeight: String(
              courseEntry?.courseWeight ||
                courseEntry?.courseTotalWeight ||
                courseEntry?.course_totalWeight ||
                "",
            ).trim(),
            subIntervalId,
            intervalId: subIntervalId,
            components:
              courseComponents.length > 0
                ? courseComponents
                : [
                    {
                      key: `${subIntervalId}_${courseIndex}_${String(
                        courseEntry?.courseName || courseEntry?.courseId || "",
                      ).trim()}_empty`,
                      componentId: "-",
                      componentWeightPercentage: "-",
                      componentStatus: "-",
                    },
                  ],
          };
        });
      })
      .filter((entry) => Boolean(entry.courseName) && Boolean(entry.intervalId));
    const coursesHasRegisteredValue = homeCoursesRows.length > 0;
    const coursesEditorOpen = Boolean(this.state?.homeCoursesEditorOpen);
    const courseEditingKey = String(this.state?.homeCourseEditingKey || "").trim();
    const courseComponentEditingId = String(this.state?.homeCourseComponentEditingId || "").trim();
    const courseNameDraftValueLegacy = String(
      this.state?.homeCourseNameDraft || "",
    ).trim();
    const courseIdDraftValue = String(
      this.state?.homeCourseIdDraft || "",
    ).trim();
    const courseCodeDraftValue = String(
      this.state?.homeCourseCodeDraft || "",
    ).trim();
    const resolvedCourseDraftLegacy = this.resolvePlannerCourseDraft({
      courseId: courseIdDraftValue,
      courseName: courseNameDraftValueLegacy,
      courseCode: courseCodeDraftValue,
    });
    const resolvedCourseIdDraftValueLegacy = String(
      resolvedCourseDraftLegacy?._id || courseIdDraftValue || "",
    ).trim();
    const resolvedCourseCodeDraftValueLegacy = String(
      courseCodeDraftValue ||
        resolvedCourseDraftLegacy?.course_code ||
        resolvedCourseDraftLegacy?.code ||
        "",
    ).trim();
    const courseWeightDraftValue = String(
      this.state?.homeCourseTotalWeightDraft || "",
    ).trim();
    const parsedCourseWeightDraftValue = Number.parseFloat(courseWeightDraftValue);
    const courseSubIntervalYearDraftValue = String(
      this.state?.homeCourseSubIntervalYearDraft || "",
    ).trim();
    const courseSubIntervalTermDraftValue = String(
      this.state?.homeCourseSubIntervalTermDraft || "",
    ).trim();
    const courseIntervalDraftValue = String(
      this.state?.homeCourseIntervalIdDraft ||
        `${courseSubIntervalYearDraftValue}${courseSubIntervalTermDraftValue}`,
    ).trim();
    const courseComponentIdDraftValue = String(
      this.state?.homeCourseComponentIdDraft || "",
    ).trim();
    const componentWeightPercentageDraftValue = String(
      this.state?.homeCourseComponentPartialWeightDraft || "",
    ).trim();
    const courseComponentStatusDraftValue = String(
      this.state?.homeCourseComponentStatusDraft || "",
    ).trim();
    const courseComponentDraftValues = Array.from(
      new Map(
        (Array.isArray(this.state?.homeCourseComponentDraft)
          ? this.state.homeCourseComponentDraft
          : [this.state?.homeCourseComponentDraft]
        )
          .map((entry) => this.normalizeHomeCourseComponentDraftEntry(entry))
          .filter(Boolean)
          .map((entry) => [entry.componentId, entry]),
      ).values(),
    );
    const courseComponentOptions = plannerComponentIds.length > 0
      ? plannerComponentIds
      : ["Class", "Lab", "Other"];
    const courseComponentStatusOptions = [
      "pending",
      "new",
      "failed",
      "passed",
      "incomplete",
      "ongoing",
    ];
    const canAddCourseComponentDraft = Boolean(
      courseComponentIdDraftValue &&
      componentWeightPercentageDraftValue,
    );
    const canAddGlobalCourse = Boolean(
      courseNameDraftValueLegacy &&
      courseCodeDraftValue &&
      courseWeightDraftValue &&
      courseIntervalDraftValue &&
      courseComponentDraftValues.length > 0,
    );
    const canSubmitCourses = Array.isArray(this.state?.homeCourseDraftList)
      ? this.state.homeCourseDraftList.filter(Boolean).length > 0
      : false;
    const courseComponentDraftValuesForSubmit =
      courseComponentDraftValues.length > 0
          ? courseComponentDraftValues
          : canAddCourseComponentDraft
            ? [
              this.normalizeHomeCourseComponentDraftEntry({
                  componentId: courseComponentIdDraftValue,
                  componentWeightPercentage: componentWeightPercentageDraftValue,
                  componentWeight:
                    Number.isFinite(parsedCourseWeightDraftValue) &&
                    Number.isFinite(
                      Number.parseFloat(componentWeightPercentageDraftValue),
                    )
                      ? Number(
                          (
                            parsedCourseWeightDraftValue *
                            (Number.parseFloat(componentWeightPercentageDraftValue) / 100)
                          ).toFixed(4),
                        )
                      : null,
                }),
              ].filter(Boolean)
            : [];
    const programStartYearEditorOpen = Boolean(
      this.state?.homeProgramStartYearEditorOpen,
    );
    const registeredProgramStartYear = String(
      this.state?.homeProgramStartYearValue || "",
    ).trim();
    const programStartYearHasRegisteredValue = Boolean(
      registeredProgramStartYear,
    );
    const programStartYearDraftValue = String(
      this.state?.homeProgramStartYearDraft || "",
    ).trim();
    const isProgramStartYearReady = Boolean(programStartYearDraftValue);
    const isProgramStartYearDirty =
      programStartYearDraftValue !== registeredProgramStartYear;
    const canSubmitProgramStartYear =
      isProgramStartYearReady &&
      (!programStartYearHasRegisteredValue || isProgramStartYearDirty);
    const programTotalYearsEditorOpen = Boolean(
      this.state?.homeProgramTotalYearsEditorOpen,
    );
    const registeredProgramTotalYears = String(
      this.state?.homeProgramTotalYearsValue || "",
    ).trim();
    const programTotalYearsHasRegisteredValue = Boolean(
      registeredProgramTotalYears,
    );
    const programTotalYearsDraftValue = String(
      this.state?.homeProgramTotalYearsDraft || "",
    ).trim();
    const isProgramTotalYearsReady = Boolean(programTotalYearsDraftValue);
    const isProgramTotalYearsDirty =
      programTotalYearsDraftValue !== registeredProgramTotalYears;
    const canSubmitProgramTotalYears =
      isProgramTotalYearsReady &&
      (!programTotalYearsHasRegisteredValue || isProgramTotalYearsDirty);
    const programTermsPerYearEditorOpen = Boolean(
      this.state?.homeProgramTermsPerYearEditorOpen,
    );
    const registeredProgramTermsPerYear = String(
      this.state?.homeProgramTermsPerYearValue || "",
    ).trim();
    const programTermsPerYearHasRegisteredValue = Boolean(
      registeredProgramTermsPerYear,
    );
    const programTermsPerYearDraftValue = String(
      this.state?.homeProgramTermsPerYearDraft || "",
    ).trim();
    const isProgramTermsPerYearReady = Boolean(programTermsPerYearDraftValue);
    const isProgramTermsPerYearDirty =
      programTermsPerYearDraftValue !== registeredProgramTermsPerYear;
    const canSubmitProgramTermsPerYear =
      isProgramTermsPerYearReady &&
      (!programTermsPerYearHasRegisteredValue || isProgramTermsPerYearDirty);
    const currentIntervalTryNumEditorOpen = Boolean(
      this.state?.homeProgramCurrentIntervalTryNumEditorOpen,
    );
    const storedCurrentIntervalTryNum =
      plannerRoot?.programCurrentIntervalTryNum &&
      typeof plannerRoot.programCurrentIntervalTryNum === "object"
        ? plannerRoot.programCurrentIntervalTryNum
        : null;
    const registeredCurrentIntervalNum = String(
      storedCurrentIntervalTryNum?.intervalNum ?? "",
    ).trim();
    const registeredCurrentIntervalTryNum = String(
      storedCurrentIntervalTryNum?.intervalTryNum ?? "",
    ).trim();
    const registeredCurrentSubIntervalNum = String(
      storedCurrentIntervalTryNum?.subIntervalNum ?? "",
    ).trim();
    const hasRegisteredCurrentIntervalTryNum = Boolean(
      registeredCurrentIntervalNum,
    );
    const hasRegisteredCurrentIntervalTryPair = Boolean(
      registeredCurrentIntervalNum && registeredCurrentIntervalTryNum,
    );
    const draftCurrentIntervalNum = String(
      this.state?.homeProgramCurrentIntervalNumDraft || "",
    ).trim();
    const draftCurrentIntervalTryNum = String(
      this.state?.homeProgramCurrentIntervalTryNumDraft || "",
    ).trim();
    const draftCurrentSubIntervalNum = String(
      this.state?.homeProgramCurrentSubIntervalNumDraft || "",
    ).trim();
    const extractIntervalNum = (entry) => {
      const direct = Number.parseInt(String(entry?.intervalNum ?? ""), 10);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const id = String(entry?.intervalID || entry?.intervalId || "").trim();
      const m = id.match(/([A-Za-z]+)(\d+)$/);
      return m ? Number(m[2]) : NaN;
    };
    const extractIntervalTryNum = (t) => {
      const direct = Number.parseInt(String(t?.intervalTryNum ?? ""), 10);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const id = String(t?.intervalTryID || t?.intervalTryId || "").trim();
      const m = id.match(/([A-Za-z]+)(\d+)$/);
      return m ? Number(m[2]) : NaN;
    };
    const currentIntervalNumSelectOptions = Array.isArray(plannerRoot?.programIntervals)
      ? Array.from(
          new Set(
            plannerRoot.programIntervals
              .map(extractIntervalNum)
              .filter((n) => Number.isFinite(n)),
          ),
        ).sort((a, b) => a - b)
      : [];
    const currentIntervalTrySelectedEntry = draftCurrentIntervalNum
      ? (Array.isArray(plannerRoot?.programIntervals)
          ? plannerRoot.programIntervals.find((entry) => {
              const candidateIntervalNum = extractIntervalNum(entry);
              return Number.isFinite(candidateIntervalNum) &&
                String(candidateIntervalNum) === draftCurrentIntervalNum;
            })
          : null)
      : null;
    const currentIntervalTryEntries = Array.isArray(
      currentIntervalTrySelectedEntry?.intervalTry,
    )
      ? currentIntervalTrySelectedEntry.intervalTry
      : Array.isArray(currentIntervalTrySelectedEntry?.intervalTries)
        ? currentIntervalTrySelectedEntry.intervalTries
        : [];
    const currentIntervalTryNumSelectOptions = currentIntervalTryEntries
      .map(extractIntervalTryNum)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const currentSubIntervalTrySelectedEntry = draftCurrentIntervalTryNum
      ? currentIntervalTryEntries.find((tryEntry) => {
          const candidateTryNum = extractIntervalTryNum(tryEntry);
          return Number.isFinite(candidateTryNum) &&
            String(candidateTryNum) === draftCurrentIntervalTryNum;
        }) || null
      : null;
    const currentSubIntervalTryNumSelectOptions = Array.isArray(
      currentSubIntervalTrySelectedEntry?.intervalTrysubIntervals,
    )
      ? currentSubIntervalTrySelectedEntry.intervalTrysubIntervals
          .map((subEntry) =>
            Number.parseInt(String(subEntry?.subIntervalNum ?? "").trim(), 10),
          )
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b)
      : [];
    const isCurrentIntervalTryNumDirty =
      draftCurrentIntervalNum !== registeredCurrentIntervalNum ||
      draftCurrentIntervalTryNum !== registeredCurrentIntervalTryNum ||
      draftCurrentSubIntervalNum !== registeredCurrentSubIntervalNum;
    const canSubmitCurrentIntervalTryNum =
      currentIntervalTryNumEditorOpen &&
      Boolean(draftCurrentIntervalNum) &&
      Boolean(draftCurrentIntervalTryNum) &&
      Boolean(draftCurrentSubIntervalNum) &&
      (!hasRegisteredCurrentIntervalTryNum || isCurrentIntervalTryNumDirty);
    const storedProgramAIExtractions = Array.isArray(plannerRoot?.programAIExtractions)
      ? plannerRoot.programAIExtractions
      : [];
    const aiPreview = this.state?.telegramAiPreviewResults || null;
    const aiPreviewGoal = String(aiPreview?.goal || "").trim();
    const aiPreviewItems = Array.isArray(aiPreview?.items) ? aiPreview.items : [];
    const formatAiHistoryItem = (item, goal = "") => {
      const normalizedGoal = String(goal || "").trim().toLowerCase();
      if (normalizedGoal === "courses" && item && typeof item === "object") {
        return [
          String(item?.courseName || "").trim(),
          String(item?.courseCode || "").trim(),
        ]
          .filter(Boolean)
          .join(" — ");
      }
      if (item && typeof item === "object") {
        const namedValue = String(item?.name || item?.label || "").trim();
        if (namedValue) {
          return namedValue;
        }
        const flattenedParts = Object.values(item)
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
        if (flattenedParts.length > 0) {
          return flattenedParts.join(" — ");
        }
      }
      return String(item || "").trim();
    };
    const intervalPassingThresholdEditorOpen = Boolean(
      this.state?.homeIntervalPassingThresholdEditorOpen,
    );
    const registeredIntervalPassingThresholdMode = String(
      this.state?.homeIntervalPassingThresholdModeValue || "",
    ).trim();
    const registeredIntervalPassingThresholdUnit = String(
      this.state?.homeIntervalPassingThresholdUnitValue || "",
    ).trim();
    const registeredIntervalPassingThresholdNumber = String(
      this.state?.homeIntervalPassingThresholdNumberValue || "",
    ).trim();
    const plannerPrimaryFailingRule = this.getPrimaryProgramFailingRule(
      this.state?.plannerRoot,
    );
    const registeredProgramFailingRulesSource = this.normalizeProgramFailingRuleEntries(
      this.state?.plannerRoot?.programFailingRules,
    );
    const registeredProgramFailingRules = registeredProgramFailingRulesSource
      .map((rule, index) => {
        const normalizedRule = this.normalizeProgramFailingRuleDraftValue(rule);
        if (!normalizedRule) {
          return null;
        }
        return {
          key: String(rule?._id || this.buildProgramFailingRuleDraftKey(normalizedRule) || index),
          ...normalizedRule,
          label: normalizedRule.thresholdMode
            ? `${normalizedRule.thresholdMode}: ${normalizedRule.thresholdNumber || "-"} ${normalizedRule.thresholdUnit}`.trim()
            : `${normalizedRule.thresholdNumber || "-"} ${normalizedRule.thresholdUnit}`.trim(),
        };
      })
      .filter(Boolean);
    const intervalPassingThresholdModeDraftValue = String(
      this.state?.homeIntervalPassingThresholdModeDraft || "",
    ).trim();
    const intervalPassingThresholdUnitDraftValue = String(
      this.state?.homeIntervalPassingThresholdUnitDraft || "",
    ).trim();
    const intervalPassingThresholdNumberDraftValue = String(
      this.state?.homeIntervalPassingThresholdNumberDraft || "",
    ).trim();
    const hasIntervalPassingThresholdDraftValue = Boolean(
      intervalPassingThresholdModeDraftValue ||
      intervalPassingThresholdUnitDraftValue ||
      intervalPassingThresholdNumberDraftValue,
    );
    const isIntervalPassingThresholdReady = Boolean(
      !hasIntervalPassingThresholdDraftValue ||
      (intervalPassingThresholdModeDraftValue &&
        intervalPassingThresholdUnitDraftValue &&
        intervalPassingThresholdNumberDraftValue),
    );
    const draftProgramFailingRules = Array.isArray(
      this.state?.homeIntervalPassingThresholdDraftList,
    )
      ? this.state.homeIntervalPassingThresholdDraftList
          .map((entry, index) => {
            const normalizedRule =
              this.normalizeProgramFailingRuleDraftValue(entry);
            if (!normalizedRule) {
              return null;
            }
            return {
              key:
                String(entry?.key || "") ||
                this.buildProgramFailingRuleDraftKey(normalizedRule) ||
                `rule_${index}`,
              ...normalizedRule,
              label: normalizedRule.thresholdMode
                ? `${normalizedRule.thresholdMode}: ${normalizedRule.thresholdNumber || "-"} ${normalizedRule.thresholdUnit}`.trim()
                : `${normalizedRule.thresholdNumber || "-"} ${normalizedRule.thresholdUnit}`.trim(),
            };
          })
          .filter(Boolean)
      : [];
    const registeredProgramFailingRulesForCompare = registeredProgramFailingRules.map(
      (entry) => ({
        thresholdMode: String(entry?.thresholdMode || "").trim(),
        thresholdUnit: String(entry?.thresholdUnit || "").trim(),
        thresholdNumber: String(entry?.thresholdNumber || "").trim(),
        thresholdRule: String(entry?.thresholdRule || "").trim(),
      }),
    );
    const draftProgramFailingRulesForCompare = draftProgramFailingRules.map(
      (entry) => ({
        thresholdMode: String(entry?.thresholdMode || "").trim(),
        thresholdUnit: String(entry?.thresholdUnit || "").trim(),
        thresholdNumber: String(entry?.thresholdNumber || "").trim(),
        thresholdRule: String(entry?.thresholdRule || "").trim(),
      }),
    );
    const isIntervalPassingThresholdDirty =
      JSON.stringify(draftProgramFailingRulesForCompare) !==
      JSON.stringify(registeredProgramFailingRulesForCompare);
    const canSubmitIntervalPassingThreshold =
      isIntervalPassingThresholdReady &&
      (isIntervalPassingThresholdDirty || Boolean(this.state?.homeIntervalPassingThresholdDraftTouched));
    const intervalPassingThresholdUnitOptions = [
      { value: "Interval", label: "Interval" },
      { value: "subInterval", label: "subInterval" },
      { value: "Course", label: "Course" },
      { value: "Component", label: "Component" },
      { value: "Lecture", label: "Lecture" },
      { value: "Grade (%)", label: "Grade (%)" },
      { value: "Grade (number)", label: "Grade (number)" },
      { value: "Grade (letter)", label: "Grade (letter)" },
      { value: "Amount", label: "Amount" },
    ];
    const visibleProgramFailingRules = intervalPassingThresholdEditorOpen
      ? draftProgramFailingRules.length > 0
        ? draftProgramFailingRules
        : registeredProgramFailingRules
      : registeredProgramFailingRules;
    const materialMetadataMode =
      String(this.state?.homeMaterialMetadataMode || "").trim() === "lectures"
        ? "lectures"
        : String(this.state?.homeMaterialMetadataMode || "").trim() === "exams"
          ? "exams"
          : "course";
    const homeCourseDraftRows = Array.isArray(this.state?.homeCourseDraftList)
      ? this.state.homeCourseDraftList
          .flatMap((entry, index) => {
            const normalizedEntry =
              entry && typeof entry === "object" ? entry : null;
            if (!normalizedEntry || normalizedEntry?.isEdit) {
              return [];
            }
            const courseID = String(normalizedEntry?.courseID || normalizedEntry?.courseId || "").trim() || "-";
            const courseName = String(normalizedEntry?.courseName || "").trim() || "-";
            const courseCode = String(normalizedEntry?.courseCode || "").trim() || "-";
            const courseWeight = String(normalizedEntry?.courseWeight || "").trim() || "-";
            const courseNum = Number.parseInt(String(normalizedEntry?.courseNum || "").trim(), 10) || "-";
            const subIntervalId = String(
              normalizedEntry?.subIntervalID || normalizedEntry?.subIntervalId || "",
            ).trim() || "-";
            const components = Array.isArray(normalizedEntry?.courseComponents) && normalizedEntry.courseComponents.length > 0
              ? normalizedEntry.courseComponents
              : [null];
            return components.map((comp, compIndex) => {
              const componentClass = String(comp?.componentClass || comp?.componentId || "").trim() || "-";
              const componentID = String(comp?.componentID || "").trim() ||
                (courseID !== "-" && comp?.componentNum != null ? `${courseID}-COMP${comp.componentNum}` : "-");
              const componentWeight = comp?.componentWeight != null ? String(comp.componentWeight) : "-";
              return {
                key: `${String(normalizedEntry?.key || `draft_${courseID}_${index}`).trim()}_${compIndex}`,
                courseID,
                subIntervalID: subIntervalId,
                courseNum,
                courseName,
                courseCode,
                courseWeight,
                courseComponent: componentClass,
                componentWeight,
                componentID,
                subIntervalId,
                isPreview: true,
              };
            });
          })
      : [];
    const homeCourseDraftGroupByIndex = (() => {
      const map = new Map();
      let i = 0;
      while (i < homeCourseDraftRows.length) {
        const id = homeCourseDraftRows[i].courseID;
        let span = 1;
        while (
          i + span < homeCourseDraftRows.length &&
          homeCourseDraftRows[i + span].courseID === id
        ) {
          span++;
        }
        map.set(i, span);
        i += span;
      }
      return map;
    })();
    const homeCourseCurrentDraftRow = (() => {
      const draftRow = this.buildHomeCourseMetadataDraftEntry(
        Array.isArray(this.state?.homeCourseDraftList)
          ? this.state.homeCourseDraftList.length
          : 0,
      );
      if (draftRow) {
        return draftRow;
      }
      const hasAnyDraftValue = Boolean(
        String(this.state?.homeCourseNameDraft || "").trim() ||
          String(this.state?.homeCourseCodeDraft || "").trim() ||
          String(this.state?.homeCourseTotalWeightDraft || "").trim() ||
          String(this.state?.homeCourseComponentIdDraft || "").trim() ||
          String(this.state?.homeCourseComponentPartialWeightDraft || "").trim() ||
          String(this.state?.homeCourseSubIntervalYearDraft || "").trim() ||
          String(this.state?.homeCourseSubIntervalTermDraft || "").trim() ||
          String(this.state?.homeCourseLectureNameDraft || "").trim() ||
          String(this.state?.homeCourseLectureInstructorsDraft || "").trim() ||
          String(this.state?.homeCourseLectureInstructionDateDraft || "").trim(),
      );
      if (!hasAnyDraftValue) {
        return null;
      }
      const subIntervalYear = String(
        this.state?.homeCourseSubIntervalYearDraft || "",
      ).trim();
      const subIntervalTerm = String(
        this.state?.homeCourseSubIntervalTermDraft || "",
      ).trim();
      const intervalId = String(
        this.resolvePlannerSubIntervalDraftId({
          subIntervalId: this.state?.homeCourseIntervalIdDraft || "",
          intervalNum: subIntervalYear,
          subIntervalNum: subIntervalTerm,
        }) || "",
      ).trim();
      const partialCourseName = String(this.state?.homeCourseNameDraft || "").trim();
      const partialCourseCode = String(this.state?.homeCourseCodeDraft || "").trim();
      const partialCourseWeight = String(this.state?.homeCourseTotalWeightDraft || "").trim();
      const partialNextCourseNum = this.getNextAvailableCourseNumForInterval(intervalId);
      const partialIntervalNum =
        subIntervalYear || this.parseIntervalIdYearTerm(intervalId)?.intervalNum || "";
      const partialCourseID =
        partialCourseName && partialCourseCode && partialCourseWeight && intervalId
          ? this.buildPlannerMaterialMetadataCourseId({
              intervalNum: partialIntervalNum,
              subIntervalId: intervalId,
              courseNum: partialNextCourseNum,
            })
          : "-";
      return {
        key: "draft_current",
        courseID: partialCourseID,
        courseNum: partialCourseID !== "-" ? partialNextCourseNum : "-",
        courseName: String(this.state?.homeCourseNameDraft || "").trim() || "-",
        courseCode: String(this.state?.homeCourseCodeDraft || "").trim() || "-",
        courseWeight:
          String(this.state?.homeCourseTotalWeightDraft || "").trim() || "-",
        courseComponent: String(
          this.state?.homeCourseComponentIdDraft || "",
        ).trim() || "-",
        componentID: (() => {
          const cls = String(this.state?.homeCourseComponentIdDraft || "").trim();
          return partialCourseID && partialCourseID !== "-" && cls
            ? `${partialCourseID}-COMP1`
            : "-";
        })(),
        componentWeight:
          Number.isFinite(parsedCourseWeightDraftValue) &&
          Number.isFinite(
            Number.parseFloat(componentWeightPercentageDraftValue),
          )
            ? Number(
                (
                  parsedCourseWeightDraftValue *
                  (Number.parseFloat(componentWeightPercentageDraftValue) / 100)
                ).toFixed(4),
              )
            : "-",
        componentWeightPercentage: String(
          this.state?.homeCourseComponentPartialWeightDraft || "",
        ).trim() || "-",
        subIntervalId: intervalId || "-",
        subIntervalID: intervalId || "-",
        intervalId: intervalId || "-",
        courseComponents: [],
        isPreview: true,
      };
    })();
    const homeCoursesPreviewRows = (() => {
      const editingKey = String(this.state?.homeCourseEditingKey || "").trim();
      const nextRows = editingKey
        ? homeCoursesRows.filter(
            (entry) => String(entry?.key || "").trim() !== editingKey,
          )
        : [...homeCoursesRows];
      if (
        coursesEditorOpen &&
        materialMetadataMode === "course" &&
        (homeCourseCurrentDraftRow || homeCourseDraftRows.length > 0)
      ) {
        return [
          ...(homeCourseCurrentDraftRow ? [homeCourseCurrentDraftRow] : []),
          ...homeCourseDraftRows,
          ...nextRows,
        ];
      }
      const hasDraftValues = Boolean(
        resolvedCourseIdDraftValueLegacy ||
          courseNameDraftValueLegacy ||
          resolvedCourseCodeDraftValueLegacy ||
          courseWeightDraftValue ||
          courseComponentIdDraftValue ||
          componentWeightPercentageDraftValue ||
          courseComponentDraftValues.length > 0 ||
          courseIntervalDraftValue,
      );
      if (!coursesEditorOpen || !hasDraftValues) {
        return nextRows;
      }
      nextRows.unshift({
        key: `draft_${editingKey || "new"}`,
        courseID: resolvedCourseIdDraftValueLegacy || "-",
        courseId: resolvedCourseIdDraftValueLegacy || "-",
        courseName: courseNameDraftValueLegacy || "-",
        courseCode: resolvedCourseCodeDraftValueLegacy || "-",
        courseWeight: courseWeightDraftValue || "-",
        courseComponentId: courseComponentIdDraftValue || "-",
        componentWeightPercentage:
          componentWeightPercentageDraftValue || "-",
        subIntervalId: courseIntervalDraftValue || "-",
        subIntervalID: courseIntervalDraftValue || "-",
        intervalId: courseIntervalDraftValue || "-",
        components:
          courseComponentDraftValuesForSubmit.length > 0
            ? courseComponentDraftValuesForSubmit
            : [
                {
                  componentId: "-",
                  componentWeightPercentage: "-",
                  componentStatus: "-",
                },
              ],
        isPreview: true,
      });
      return nextRows;
    })();
    const plannerCoursesById = new Map(
      (Array.isArray(this.state?.courses) ? this.state.courses : [])
        .map((courseEntry) => {
          const courseId = String(courseEntry?._id || "").trim();
          if (!courseId) {
            return null;
          }
          return [courseId, courseEntry];
        })
        .filter(Boolean),
    );
    const plannerCoursesByLookupKey = new Map();
    plannerCoursesById.forEach((courseEntry, courseId) => {
      const courseName = String(courseEntry?.course_name || courseEntry?.name || "").trim();
      const courseCode = String(courseEntry?.course_code || courseEntry?.code || "").trim();
      const lookupKeys = [courseId, courseName, courseCode]
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean);
      lookupKeys.forEach((lookupKey) => {
        if (!plannerCoursesByLookupKey.has(lookupKey)) {
          plannerCoursesByLookupKey.set(lookupKey, courseEntry);
        }
      });
    });
    const resolvePlannerCourseEntry = (courseEntry = {}) => {
      const directCourseId = this.getPlannerCourseSchemaID(courseEntry);
      const directCourseCode = String(courseEntry?.courseCode || "").trim();
      const directCourseName = String(courseEntry?.courseName || "").trim();
      return (
        plannerCoursesByLookupKey.get(directCourseId.toLowerCase()) ||
        plannerCoursesByLookupKey.get(directCourseCode.toLowerCase()) ||
        plannerCoursesByLookupKey.get(directCourseName.toLowerCase()) ||
        null
      );
    };
    const homeCourseNameOptions = Array.from(plannerCoursesById.values())
      .map((courseEntry) => ({
        value: String(courseEntry?._id || "").trim(),
        label: String(courseEntry?.course_name || courseEntry?.name || "").trim(),
        code: String(courseEntry?.course_code || courseEntry?.code || "").trim(),
      }))
      .filter((entry) => entry.value && entry.label)
      .sort((left, right) => left.label.localeCompare(right.label));
    const homeCourseNamesPerSubIntervalRows = homeCoursesPreviewRows.map((courseEntry) => {
      const subIntervalId = String(
        courseEntry?.subIntervalID || courseEntry?.subIntervalId || courseEntry?.intervalId || "",
      ).trim();
      const intervalDisplay = this.parseIntervalIdYearTerm(subIntervalId);
      const mappedCourse = resolvePlannerCourseEntry(courseEntry);
      const sourceCourseComponents = Array.isArray(courseEntry?.courseComponents)
        ? courseEntry.courseComponents
        : Array.isArray(courseEntry?.components)
          ? courseEntry.components
          : [];
      const primaryCourseComponent = sourceCourseComponents.find((entry) => {
        const nextComponentId = this.getPlannerComponentSchemaID(entry);
        return Boolean(nextComponentId);
      }) || null;
      const courseName = String(
        courseEntry?.courseName ||
          mappedCourse?.course_name ||
          mappedCourse?.name ||
          this.getPlannerCourseSchemaID(courseEntry) ||
          "",
      ).trim();
      const primaryLecture = Array.isArray(primaryCourseComponent?.componentExams)
        ? (primaryCourseComponent.componentExams
            .flatMap((exam) =>
              Array.isArray(exam?.examsLectures) ? exam.examsLectures : [],
            )
            .find((entry) =>
              String(entry?.lectureName || entry?.lectureID || "").trim(),
            ) || null)
        : null;
      const parsedCourseWeight = Number.parseFloat(
        String(
          courseEntry?.courseWeight ||
            courseEntry?.courseTotalWeight ||
            courseEntry?.course_totalWeight ||
            "",
        ).trim(),
      );
      const storedComponentWeight = Number.parseFloat(
        String(
          primaryCourseComponent?.componentWeight ||
            primaryCourseComponent?.componentRelativeWeight ||
            primaryCourseComponent?.componentPartialWeight ||
            primaryCourseComponent?.componentWeightPercentage ||
            courseEntry?.componentWeight ||
            courseEntry?.componentRelativeWeight ||
            courseEntry?.componentPartialWeight ||
            courseEntry?.componentWeightPercentage ||
            "",
        ).trim(),
      );
      const derivedComponentWeightPercentage =
        Number.isFinite(parsedCourseWeight) &&
        parsedCourseWeight !== 0 &&
        Number.isFinite(storedComponentWeight)
          ? (storedComponentWeight / parsedCourseWeight) * 100
          : null;
      return {
        key: String(courseEntry?.key || `${courseName}_${subIntervalId}`).trim(),
        courseName: courseName || "-",
        courseCode: String(
          courseEntry?.courseCode || mappedCourse?.course_code || mappedCourse?.code || "",
        ).trim() || "-",
        courseWeight: String(
          courseEntry?.courseWeight ||
            courseEntry?.courseTotalWeight ||
            courseEntry?.course_totalWeight ||
            "",
        ).trim() || "-",
        courseComponentId: String(
          courseEntry?.courseComponentId ||
            mappedCourse?.courseComponentId ||
            this.getPlannerComponentSchemaID(primaryCourseComponent) ||
            primaryCourseComponent?.course_componentId ||
            courseEntry?.course_componentId ||
            "",
        ).trim() || "-",
        componentWeightPercentage: String(
          Number.isFinite(derivedComponentWeightPercentage)
            ? derivedComponentWeightPercentage
            : courseEntry?.componentWeightPercentage ||
              primaryCourseComponent?.componentWeightPercentage ||
              primaryCourseComponent?.componentPartialWeight ||
              courseEntry?.componentPartialWeight ||
              "",
        ).trim() || "-",
        componentWeight:
          Number.isFinite(storedComponentWeight)
            ? Number(storedComponentWeight.toFixed(4))
            : "-",
        lectureName: String(
          primaryLecture?.lectureName || this.getPlannerLectureSchemaID(primaryLecture) || "",
        ).trim() || "-",
        lectureInstructors: Array.isArray(primaryLecture?.lectureInstructors)
          ? primaryLecture.lectureInstructors.join(", ")
          : "-",
        lectureInstructionDate:
          this.formatPlannerDateInputValue(
            primaryLecture?.lectureInstructionDate ||
              primaryLecture?.lectureGivenDate ||
              "",
            ) || "-",
        courseID: this.getPlannerCourseSchemaID(courseEntry) || "-",
        subIntervalID: subIntervalId,
        subIntervalId,
        subIntervalLabel:
          intervalDisplay?.intervalNum && intervalDisplay?.subIntervalNum
            ? `${intervalDisplay.intervalNum}_${intervalDisplay.subIntervalNum}`
            : subIntervalId || "-",
        isPreview: Boolean(courseEntry?.isPreview),
      };
    });
    const materialMetadataCourseRows = (() => {
      const rows = this.getPlannerMaterialMetadataCourseRows(this.state?.plannerRoot || {});
      return [...rows].sort((a, b) => {
        const aInterval = Number.parseInt(String(a?.intervalNum || "").trim(), 10) || 0;
        const bInterval = Number.parseInt(String(b?.intervalNum || "").trim(), 10) || 0;
        if (aInterval !== bInterval) {
          return bInterval - aInterval;
        }
        const aSub = Number.parseInt(this.parseIntervalIdYearTerm(String(a?.subIntervalID || a?.subIntervalId || "").trim())?.subIntervalNum || 0, 10) || 0;
        const bSub = Number.parseInt(this.parseIntervalIdYearTerm(String(b?.subIntervalID || b?.subIntervalId || "").trim())?.subIntervalNum || 0, 10) || 0;
        if (aSub !== bSub) {
          return bSub - aSub;
        }
        const aCourse = Number.parseInt(String(a?.courseNum || "").trim(), 10) || 0;
        const bCourse = Number.parseInt(String(b?.courseNum || "").trim(), 10) || 0;
        return bCourse - aCourse;
      });
    })();
    const liveMetadataCourseRows = (() => {
      const queuedEdits = (
        Array.isArray(this.state?.homeCourseDraftList)
          ? this.state.homeCourseDraftList
          : []
      ).filter((e) => e?.isEdit);
      let baseRows = materialMetadataCourseRows;
      for (const queuedEdit of queuedEdits) {
        const editCourseID = String(queuedEdit?.courseID || "").trim();
        const queuedComponents = Array.isArray(queuedEdit?.courseComponents)
          ? queuedEdit.courseComponents
          : [];
        if (!editCourseID || queuedComponents.length === 0) continue;
        const anchorRow = baseRows.find((r) => r.courseID === editCourseID);
        if (!anchorRow) continue;
        let queueReplaced = false;
        const withEdit = [];
        for (const row of baseRows) {
          if (row.courseID !== editCourseID) {
            withEdit.push(row);
          } else if (!queueReplaced) {
            queuedComponents.forEach((comp, idx) => {
              withEdit.push({
                ...anchorRow,
                key: `${anchorRow.subIntervalId}_${anchorRow.courseNum}_${idx}_${comp.componentClass}`,
                courseName: String(queuedEdit?.courseName || "").trim() || anchorRow.courseName,
                courseCode: String(queuedEdit?.courseCode || "").trim() || anchorRow.courseCode,
                courseWeight: String(queuedEdit?.courseWeight || "").trim() || anchorRow.courseWeight,
                courseComponent: comp.componentClass,
                componentID: String(comp?.componentID || "").trim() || "-",
                componentWeight: comp.componentWeight ?? null,
                isPreview: true,
              });
            });
            queueReplaced = true;
          }
        }
        baseRows = withEdit;
      }
      if (!courseEditingKey) {
        let previewRows = [];
        if (homeCourseCurrentDraftRow) {
          const draftBase = homeCourseCurrentDraftRow;
          const parsedDraftWeight = Number.parseFloat(String(draftBase.courseWeight || "").trim());
          previewRows = courseComponentDraftValues.length > 0
            ? courseComponentDraftValues.map((comp, idx) => {
                const parsedPct = Number.parseFloat(
                  String(comp?.componentWeightPercentage || comp?.componentPartialWeight || "").trim(),
                );
                const cid = String(draftBase.courseID || "").trim();
                const cls = String(comp.componentId || "").trim();
                const compNum = Number.isFinite(Number.parseInt(comp?.componentNum, 10))
                  ? Number.parseInt(comp.componentNum, 10)
                  : idx + 1;
                const compSym = String(comp?.componentSymbol || "COMP").trim();
                return {
                  ...draftBase,
                  key: `draft_current_${idx}_${comp.componentId}`,
                  courseComponent: cls,
                  componentID: cid && cid !== "-" ? `${cid}-${compSym}${compNum}` : "-",
                  componentWeight:
                    Number.isFinite(parsedDraftWeight) && Number.isFinite(parsedPct)
                      ? Number((parsedDraftWeight * (parsedPct / 100)).toFixed(4))
                      : null,
                  isPreview: true,
                };
              })
            : [draftBase];
        }
        if (previewRows.length === 0 && homeCourseDraftRows.length === 0) return baseRows;
        return [...previewRows, ...homeCourseDraftRows, ...baseRows];
      }
      const editingRow = baseRows.find((r) => r.key === courseEditingKey);
      if (!editingRow) return baseRows;
      const editingCourseId = editingRow.courseID;
      const draftCourseName = String(this.state?.homeCourseNameDraft || "").trim() || editingRow.courseName;
      const draftCourseCode = String(this.state?.homeCourseCodeDraft || "").trim() || editingRow.courseCode;
      const draftCourseWeight = String(this.state?.homeCourseTotalWeightDraft || "").trim() || editingRow.courseWeight;
      const parsedDraftWeight = Number.parseFloat(draftCourseWeight);
      const draftComponents = (() => {
        const base = courseComponentDraftValues.length > 0
          ? courseComponentDraftValues
          : [{ componentId: editingRow.courseComponent, componentWeightPercentage: "", componentPartialWeight: "", componentWeight: editingRow.componentWeight, componentNum: null, componentSymbol: "COMP" }];
        const pendingId = String(this.state?.homeCourseComponentIdDraft || "").trim();
        if (!pendingId) return base;
        const pendingPct = String(this.state?.homeCourseComponentPartialWeightDraft || "").trim();
        const parsedPendingPct = Number.parseFloat(pendingPct);
        const pendingWeight = Number.isFinite(parsedDraftWeight) && Number.isFinite(parsedPendingPct)
          ? Number((parsedDraftWeight * (parsedPendingPct / 100)).toFixed(4))
          : null;
        const existingIdx = base.findIndex((c) => c.componentId === pendingId);
        if (existingIdx >= 0) {
          return base.map((c, i) =>
            i === existingIdx
              ? { ...c, componentWeightPercentage: pendingPct, componentPartialWeight: pendingPct, componentWeight: pendingWeight ?? c.componentWeight }
              : c,
          );
        }
        return [...base, { componentId: pendingId, componentWeightPercentage: pendingPct, componentPartialWeight: pendingPct, componentWeight: pendingWeight, componentNum: null, componentSymbol: "COMP" }];
      })();
      let replaced = false;
      const result = [];
      for (const row of baseRows) {
        if (row.courseID !== editingCourseId) {
          result.push(row);
        } else if (!replaced) {
          for (let idx = 0; idx < draftComponents.length; idx++) {
            const comp = draftComponents[idx];
            const parsedPct = Number.parseFloat(String(comp?.componentWeightPercentage || comp?.componentPartialWeight || "").trim());
            const compNum = Number.isFinite(Number.parseInt(comp?.componentNum, 10))
              ? Number.parseInt(comp.componentNum, 10)
              : idx + 1;
            const compSym = String(comp?.componentSymbol || "COMP").trim();
            const editCompID = editingCourseId && editingCourseId !== "-"
              ? `${editingCourseId}-${compSym}${compNum}`
              : String(comp?.componentID || "").trim() || "-";
            result.push({
              ...editingRow,
              key: `${editingRow.subIntervalId}_${editingRow.courseNum}_${idx}_${comp.componentId}`,
              courseName: draftCourseName,
              courseCode: draftCourseCode,
              courseWeight: draftCourseWeight,
              courseComponent: comp.componentId,
              componentID: editCompID,
              componentWeight: Number.isFinite(parsedDraftWeight) && Number.isFinite(parsedPct)
                ? Number((parsedDraftWeight * (parsedPct / 100)).toFixed(4))
                : comp.componentWeight ?? null,
            });
          }
          replaced = true;
        }
      }
      return result;
    })();
    const materialMetadataCourseGroupByIndex = (() => {
      const map = new Map();
      let i = 0;
      while (i < liveMetadataCourseRows.length) {
        const id = liveMetadataCourseRows[i].courseID;
        let span = 1;
        while (
          i + span < liveMetadataCourseRows.length &&
          liveMetadataCourseRows[i + span].courseID === id
        ) {
          span++;
        }
        map.set(i, span);
        i += span;
      }
      return map;
    })();
    const hasDraftChanges = (() => {
      if (!courseEditingKey) return false;
      const originalRow = materialMetadataCourseRows.find((r) => r.key === courseEditingKey);
      if (!originalRow) return true;
      const normalize = (v) => String(v || "").trim().replace(/^-$/, "");
      if (normalize(courseIntervalDraftValue) !== normalize(originalRow.subIntervalId)) return true;
      if (normalize(courseNameDraftValueLegacy) !== normalize(originalRow.courseName)) return true;
      if (normalize(courseCodeDraftValue) !== normalize(originalRow.courseCode)) return true;
      if (normalize(courseWeightDraftValue) !== normalize(originalRow.courseWeight)) return true;
      const originalComponents = materialMetadataCourseRows
        .filter((r) => r.courseID === originalRow.courseID)
        .map((r) => `${r.courseComponent}:${String(r.componentWeight ?? "")}`);
      const pendingComponentId = String(this.state?.homeCourseComponentIdDraft || "").trim();
      const pendingComponentPct = String(this.state?.homeCourseComponentPartialWeightDraft || "").trim();
      const baseForDirty = courseComponentDraftValues.length > 0 ? courseComponentDraftValues : [];
      const mergedForDirty = (() => {
        if (!pendingComponentId) return baseForDirty;
        const parsedPct = Number.parseFloat(pendingComponentPct);
        const w = Number.isFinite(parsedCourseWeightDraftValue) && Number.isFinite(parsedPct)
          ? Number((parsedCourseWeightDraftValue * (parsedPct / 100)).toFixed(4))
          : null;
        const pending = { componentId: pendingComponentId, componentWeightPercentage: pendingComponentPct, componentWeight: w };
        const idx = baseForDirty.findIndex((c) => c.componentId === pendingComponentId);
        if (idx >= 0) return baseForDirty.map((c, i) => i === idx ? { ...c, ...pending } : c);
        return [...baseForDirty, pending];
      })();
      const draftComponentsForDirty = mergedForDirty.map((c) => {
        const pct = Number.parseFloat(String(c?.componentWeightPercentage || c?.componentPartialWeight || "").trim());
        const w = Number.isFinite(parsedCourseWeightDraftValue) && Number.isFinite(pct)
          ? Number((parsedCourseWeightDraftValue * (pct / 100)).toFixed(4))
          : (c.componentWeight ?? "");
        return `${c.componentId}:${String(w)}`;
      });
      if (originalComponents.length !== draftComponentsForDirty.length) return true;
      const sorted = (arr) => [...arr].sort();
      return sorted(originalComponents).join("|") !== sorted(draftComponentsForDirty).join("|");
    })();
    const materialMetadataLectureRows =
      this.getPlannerMaterialMetadataLectureRows(this.state?.plannerRoot || {});
    const materialMetadataExamRows =
      this.getPlannerMaterialMetadataExamRows(this.state?.plannerRoot || {});
    const materialMetadataProgramInstructors = Array.isArray(
      this.state?.plannerRoot?.programInstructors,
    )
      ? this.state.plannerRoot.programInstructors
          .map(normalizeInstructorEntry)
          .filter(Boolean)
      : [];
    const materialMetadataProgramLocations = Array.isArray(
      this.state?.plannerRoot?.programLocations,
    )
      ? this.state.plannerRoot.programLocations
      : [];
    const examLocationOptions = materialMetadataProgramLocations
      .flatMap((entry) =>
        Array.isArray(entry?.rooms) && entry.rooms.length > 0
          ? entry.rooms.map((room) => ({
              value: `${String(entry?.building || "").trim()}|${String(
                room || "",
              ).trim()}`,
              label: formatCourseLocationDisplay({
                building: String(entry?.building || "").trim(),
                room: String(room || "").trim(),
              }),
              location: {
                building: String(entry?.building || "").trim(),
                room: String(room || "").trim(),
              },
            }))
          : [],
      )
      .filter((entry) => entry.value && entry.label);
    const lectureCourseContextDraftValue = String(
      this.state?.homeCourseLectureCourseContextDraft || "",
    ).trim();
    const lectureNameDraftValue = String(
      this.state?.homeCourseLectureNameDraft || "",
    ).trim();
    const lectureInstructorDraftValue = String(
      this.state?.homeCourseLectureInstructorsDraft || "",
    ).trim();
    const homeCourseLectureDraftRows = Array.isArray(
      this.state?.homeCourseLectureDraftList,
    )
      ? this.state.homeCourseLectureDraftList
          .map((entry, index) =>
            this.normalizeHomeCourseLectureDraftEntry({
              ...entry,
              key: String(entry?.key || `lecture_draft_${index}`),
            }),
          )
          .filter(Boolean)
      : [];
    const homeCourseLectureCurrentDraftRow =
      this.buildHomeCourseLectureDraftEntry(homeCourseLectureDraftRows.length);
    const homeCourseExamDraftRows = Array.isArray(
      this.state?.homeCourseExamDraftList,
    )
      ? this.state.homeCourseExamDraftList
          .map((entry, index) =>
            this.normalizeHomeCourseExamDraftEntry({
              ...entry,
              key: String(entry?.key || `exam_draft_${index}`),
            }),
          )
          .filter(Boolean)
      : [];
    const homeCourseExamCurrentPartRow = (() => {
      if (!this.state?.homeCourseExamScheduleEditorOpen) return null;
      const built = this.buildHomeCourseExamDraftEntry(homeCourseExamDraftRows.length);
      if (!built) return null;
      const alreadyStaged = homeCourseExamDraftRows.some(
        (r) => String(r?.examPartID || "").trim() === built.examPartID,
      );
      return alreadyStaged ? null : { ...built, isPreview: true };
    })();
    const examScheduleEditorOpen = Boolean(
      this.state?.homeCourseExamScheduleEditorOpen,
    );
    const liveExamScheduleGroups = (() => {
      const baseRows = examScheduleEditorOpen ? homeCourseExamDraftRows : materialMetadataExamRows;
      const allRows = examScheduleEditorOpen && homeCourseExamCurrentPartRow
        ? [...baseRows, homeCourseExamCurrentPartRow]
        : baseRows;
      const groupMap = new Map();
      allRows.forEach((row) => {
        const cid = String(row?.componentID || "").trim();
        if (!cid) return;
        if (!groupMap.has(cid)) {
          groupMap.set(cid, {
            componentID: cid,
            courseName: String(row?.courseName || "-").trim(),
            courseComponentClass: String(row?.courseComponentClass || "-").trim(),
            parts: [],
          });
        }
        groupMap.get(cid).parts.push(row);
      });
      return Array.from(groupMap.values());
    })();
    const hasHomeCourseExamScheduleRows = liveExamScheduleGroups.length > 0;
    const isExamEntryEditMode = (() => {
      const cid = String(this.state?.homeCourseExamComponentIdDraft || "").trim();
      const cls = String(this.state?.homeCourseExamClassDraft || "").trim();
      if (!cid || !cls) return false;
      const examPartID = `${cid}_exam_${cls}`;
      return homeCourseExamDraftRows.some(
        (row) => String(row?.examPartID || "").trim() === examPartID,
      );
    })();
    const hasQueuedMaterialMetadataCourseRows = Array.isArray(
      this.state?.homeCourseDraftList,
    )
      ? this.state.homeCourseDraftList.filter(Boolean).length > 0
      : false;
    const hasQueuedMaterialMetadataLectureRows =
      homeCourseLectureDraftRows.length > 0;
    const hasQueuedMaterialMetadataExamRows =
      homeCourseExamDraftRows.length > 0;
    const canSubmitMaterialMetadataCourseInfo =
      hasQueuedMaterialMetadataCourseRows || Boolean(courseEditingKey);
    const canSubmitMaterialMetadataLectureInfo = Boolean(
      hasQueuedMaterialMetadataLectureRows,
    );
    const canSubmitMaterialMetadataExamInfo = Boolean(
      hasQueuedMaterialMetadataExamRows,
    );
    const canSubmitMaterialMetadata =
      materialMetadataMode === "lectures"
        ? canSubmitMaterialMetadataLectureInfo
        : materialMetadataMode === "exams"
          ? canSubmitMaterialMetadataExamInfo
          : canSubmitMaterialMetadataCourseInfo;
    const courseNameById = new Map(
      homeCoursesRows
        .map((courseEntry) => [
          this.getPlannerCourseSchemaID(courseEntry),
          String(courseEntry?.courseName || "").trim(),
        ])
        .filter(([courseId, courseName]) => courseId && courseName),
    );
    const homeCourseComponentLectureRows = homeCoursesRows
      .flatMap((courseEntry) => {
        const subIntervalId = String(
          courseEntry?.subIntervalID || courseEntry?.subIntervalId || "",
        ).trim();
        const intervalDisplay = this.parseIntervalIdYearTerm(subIntervalId);
        const mappedCourse = resolvePlannerCourseEntry(courseEntry);
        const courseName = String(
          courseEntry?.courseName ||
            courseNameById.get(this.getPlannerCourseSchemaID(courseEntry)) ||
            mappedCourse?.course_name ||
            mappedCourse?.name ||
            this.getPlannerCourseSchemaID(courseEntry) ||
            "",
        ).trim();
        return (Array.isArray(courseEntry?.components)
          ? courseEntry.components
          : []
        ).flatMap((componentEntry, componentIndex) => {
          const lectures = (
            Array.isArray(componentEntry?.componentExams) ? componentEntry.componentExams : []
          ).flatMap((exam) => Array.isArray(exam?.examsLectures) ? exam.examsLectures : []);
          return lectures.map((lectureEntry, lectureIndex) => ({
            key: `${courseEntry.key}_${componentEntry.key || componentIndex}_${lectureIndex}`,
            courseID: this.getPlannerCourseSchemaID(courseEntry),
            courseId: this.getPlannerCourseSchemaID(courseEntry),
            courseName: courseName || "-",
            courseCode: String(courseEntry?.courseCode || "").trim() || "-",
            subIntervalID: subIntervalId,
            subIntervalId,
            subIntervalLabel:
              intervalDisplay?.intervalNum && intervalDisplay?.subIntervalNum
                ? `${intervalDisplay.intervalNum}_${intervalDisplay.subIntervalNum}`
                : subIntervalId || "-",
            componentID: this.getPlannerComponentSchemaID(componentEntry) || "-",
            componentId: this.getPlannerComponentSchemaID(componentEntry) || "-",
            lectureName:
              String(lectureEntry?.lectureName || lectureEntry?.lectureId || "")
                .trim() || "-",
          }));
        });
      })
      .filter(Boolean);
    const homeCourseComponentLectureEditorOpen = Boolean(
      this.state?.homeCourseComponentLecturesEditorOpen,
    );
    const homeCourseComponentLectureCourseIdDraftValue = String(
      this.state?.homeCourseComponentLectureCourseIdDraft || "",
    ).trim();
    const homeCourseComponentLectureIntervalDraftValue = String(
      this.state?.homeCourseComponentLectureIntervalIdDraft || "",
    ).trim();
    const homeCourseComponentLectureComponentIdDraftValue = String(
      this.state?.homeCourseComponentLectureComponentIdDraft || "",
    ).trim();
    const homeCourseComponentLectureNameDraftValue = String(
      this.state?.homeCourseComponentLectureNameDraft || "",
    ).trim();
    const homeCourseComponentLectureDraftValues = Array.from(
      new Map(
        (Array.isArray(this.state?.homeCourseComponentLectureDraftList)
          ? this.state.homeCourseComponentLectureDraftList
          : []
        )
          .map((entry) => ({
            courseId: String(entry?.courseID || entry?.courseId || "").trim(),
            intervalId: String(entry?.subIntervalID || entry?.intervalId || "").trim(),
            componentId: String(entry?.componentID || entry?.componentId || "").trim(),
            lectureId: String(
              entry?.lectureName || entry?.lectureId || "",
            ).trim(),
            lectureContent: Array.isArray(entry?.lectureContent)
              ? entry.lectureContent
              : [],
          }))
          .filter(
            (entry) =>
              entry.courseId &&
              entry.intervalId &&
              entry.componentId &&
              entry.lectureId,
          )
          .map((entry) => [
            `${entry.courseId}_${entry.intervalId}_${entry.componentId}_${entry.lectureId}`,
            entry,
          ]),
      ).values(),
    );
    const homeCourseComponentLectureCourseOptions = homeCoursesRows
      .filter(
        (entry) =>
          !homeCourseComponentLectureIntervalDraftValue ||
          String(entry?.subIntervalID || entry?.intervalId || "").trim() ===
            homeCourseComponentLectureIntervalDraftValue,
      )
      .map((entry) => {
        const selectedCourseName = String(
          entry?.courseName || entry?.courseId || "",
        ).trim();
        if (!selectedCourseName) {
          return null;
        }
        const mappedCourse = plannerCoursesById.get(
          String(entry?.courseID || entry?.courseId || "").trim(),
        );
        const intervalDisplay = this.parseIntervalIdYearTerm(
          String(entry?.subIntervalID || entry?.subIntervalId || entry?.intervalId || "").trim(),
        );
        const courseLabel = String(
          mappedCourse?.course_name ||
            mappedCourse?.name ||
            entry?.courseName ||
            entry?.courseCode ||
            selectedCourseName,
        ).trim();
        return {
          value: String(entry?.courseID || "").trim(),
          label:
            `${courseLabel || entry?.courseCode || "-"} ${intervalDisplay.intervalNum && intervalDisplay.subIntervalNum ? `(${intervalDisplay.intervalNum}_${intervalDisplay.subIntervalNum})` : ""}`.trim(),
        };
      })
      .filter(Boolean);
    const homeCourseComponentLectureComponentOptions = homeCoursesRows
      .filter(
        (entry) =>
          (!homeCourseComponentLectureCourseIdDraftValue ||
            String(entry?.courseID || entry?.courseId || "").trim() ===
              homeCourseComponentLectureCourseIdDraftValue) &&
          (!homeCourseComponentLectureIntervalDraftValue ||
            String(entry?.subIntervalID || entry?.intervalId || "").trim() ===
              homeCourseComponentLectureIntervalDraftValue),
      )
      .flatMap((entry) =>
        (Array.isArray(entry?.components) ? entry.components : []).map(
          (componentEntry) => ({
            value: this.getPlannerComponentSchemaID(componentEntry),
            label: this.getPlannerComponentSchemaID(componentEntry),
          }),
        ),
      )
      .filter((entry) => entry.value);
    const canAddCourseComponentLectureDraft = Boolean(
      homeCourseComponentLectureCourseIdDraftValue &&
        homeCourseComponentLectureIntervalDraftValue &&
        homeCourseComponentLectureComponentIdDraftValue &&
        homeCourseComponentLectureNameDraftValue,
    );
    const canSubmitCourseComponentLectures = Boolean(
      homeCourseComponentLectureDraftValues.length > 0,
    );
    const homeCourseComponentLecturePreviewRows = (() => {
      const draftRows = homeCourseComponentLectureDraftValues.map((entry) => {
        const courseEntry = homeCoursesRows.find(
          (row) =>
            String(row?.courseID || row?.courseId || "").trim() ===
              entry.courseId &&
            String(row?.subIntervalID || row?.intervalId || "").trim() === entry.intervalId,
        );
        const courseName = String(
          courseEntry?.courseName ||
            courseEntry?.courseCode ||
            entry.courseId,
        ).trim();
        const intervalDisplay = this.parseIntervalIdYearTerm(entry.intervalId);
        return {
          key: `draft_${entry.courseId}_${entry.intervalId}_${entry.componentId}_${entry.lectureId}`,
          courseId: entry.courseId,
          courseName: courseName || "-",
          courseCode: String(courseEntry?.courseCode || "").trim() || "-",
          subIntervalId: entry.intervalId,
          subIntervalLabel:
            intervalDisplay?.intervalNum && intervalDisplay?.subIntervalNum
              ? `${intervalDisplay.intervalNum}_${intervalDisplay.subIntervalNum}`
              : entry.intervalId || "-",
          componentId: entry.componentId,
          lectureName: entry.lectureId,
          isPreview: true,
        };
      });
      return [...homeCourseComponentLectureRows, ...draftRows];
    })();
    const { startYear: intervalStartYear, endYear: intervalEndYear } =
      this.getPlannerCurrentAcademicYearRange();
    const startYearValue =
      String(this.state?.studyPlanIntervalDraft?.startDateYear || "").trim() ||
      intervalStartYear;
    const endYearValue =
      String(this.state?.studyPlanIntervalDraft?.endDateYear || "").trim() ||
      intervalEndYear ||
      intervalStartYear;
    const isHomeIntervalGeneratorReady = Boolean(
      String(this.state?.homeProgramStartYearValue || "").trim() &&
      String(this.state?.homeProgramTotalYearsValue || "").trim() &&
      String(this.state?.homeProgramTermsPerYearValue || "").trim(),
    );
    const hasGeneratedExpectedIntervalsPreview = Boolean(
      this.state?.homeExpectedIntervalsGenerated &&
      isHomeIntervalGeneratorReady,
    );
    const manualIntervalsDraftList = this.getNormalizedHomeManualIntervals();
    const manualIntervalOptions = Array.from(
      new Set(
        normalizedIntervals
          .filter((entry) => entry?.regular !== false)
          .map((entry) => String(entry?.intervalID || entry?.intervalId || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => Number(left || 0) - Number(right || 0));
    const isHomeIntervalsReady =
      hasGeneratedExpectedIntervalsPreview ||
      manualIntervalsDraftList.length > 0;
    const deletedIntervalIds = Array.from(
      new Set(
        (Array.isArray(this.state?.homeDeletedIntervalIds)
          ? this.state.homeDeletedIntervalIds
          : []
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const homeIntervalsPreview = (() => {
      const generatedIntervals = hasGeneratedExpectedIntervalsPreview
        ? this.buildHomeGeneratedIntervalRows(
            this.state?.homeProgramStartYearValue,
            this.state?.homeProgramTotalYearsValue,
            this.state?.homeProgramTermsPerYearValue,
            String(plannerRoot?.programID || this.state?.homeProgramIdDraft || "").trim(),
            String(plannerRoot?.intervalSymbol || "INT").trim(),
            String(plannerRoot?.intervalTrySymbol || "IT").trim(),
            String(plannerRoot?.subIntervalSymbol || "sINT").trim(),
          )
        : [];
      const previewGeneratedEntries = generatedIntervals
        .map((entry) => {
          const intervalId = this.getPlannerIntervalSchemaID(entry);
          const intervalNumValue = Number.isInteger(entry?.intervalNum)
            ? entry.intervalNum
            : Number.parseInt(intervalId, 10);
          const subIntervalId = this.getPlannerSubIntervalSchemaID(entry);
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          if (!parsedInterval.year || !parsedInterval.term) {
            return null;
          }
          const savedDates = this.getPlannerSubIntervalTryDates(entry);
          const subIntervalNumValue =
            Number(entry?.subIntervalNum || 0) ||
            Number(parsedInterval?.term || 0) ||
            0;
          const resolvedIntervalId = this.getPlannerIntervalSchemaID(entry) || intervalId;
          const resolvedIntervalTryNum = Number.isFinite(
            Number.parseInt(entry?.intervalTryNum ?? entry?.subIntervalTryNum, 10),
          )
            ? Number.parseInt(entry?.intervalTryNum ?? entry?.subIntervalTryNum, 10)
            : 1;
          const resolvedIntervalTrySymbol = String(
            entry?.intervalTrySymbol || "IT",
          ).trim();
          return {
            key: subIntervalId,
            intervalID: resolvedIntervalId,
            intervalId: resolvedIntervalId,
            intervalNum: Number.isInteger(intervalNumValue) ? intervalNumValue : null,
            intervalSymbol: String(entry?.intervalSymbol || "INT").trim(),
            intervalTryID: String(entry?.intervalTryID || "").trim(),
            intervalTryNum: resolvedIntervalTryNum,
            intervalTrySymbol: resolvedIntervalTrySymbol,
            subIntervalID: subIntervalId,
            subIntervalId,
            subIntervalNum: subIntervalNumValue || null,
            subIntervalSymbol: String(entry?.subIntervalSymbol || "sINT").trim(),
            regular: typeof entry?.regular === "boolean" ? entry.regular : true,
            year: parsedInterval.year || "-",
            term: parsedInterval.term || "-",
            intervalStatus:
              String(entry?.intervalStatus || "Normal").trim() || "Normal",
            subIntervalTryNum: resolvedIntervalTryNum,
            subIntervalTryDates: {
              start: String(savedDates.start || "").trim(),
              end: String(savedDates.end || "").trim(),
            },
            subIntervalDates: {
              start: String(savedDates.start || "").trim(),
              end: String(savedDates.end || "").trim(),
            },
            startDate: String(savedDates.start || "").trim(),
            endDate: String(savedDates.end || "").trim(),
            isPreview: true,
            previewType: "expected",
          };
        })
        .filter(Boolean);
      const previewManualEntries = manualIntervalsDraftList
        .map((entry) => {
          const intervalId = String(entry?.intervalID || entry?.intervalId || "").trim();
          const intervalNumValue = Number.parseInt(intervalId, 10);
          const subIntervalId = String(
            entry?.subIntervalID || entry?.subIntervalId || entry?.intervalID || entry?.intervalId || "",
          ).trim();
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          if (!parsedInterval.year || !parsedInterval.term) {
            return null;
          }
          return {
            key: subIntervalId,
            intervalID: intervalId,
            intervalId,
            intervalNum: Number.isInteger(intervalNumValue) ? intervalNumValue : null,
            subIntervalID: subIntervalId,
            subIntervalId,
            regular:
              typeof entry?.regular === "boolean" ? entry.regular : false,
            year: parsedInterval.year || "-",
            term: parsedInterval.term || "-",
            intervalStatus:
              String(entry?.intervalStatus || "Normal").trim() || "Normal",
            startDate: "",
            endDate: "",
            isPreview: true,
            previewType: "unusual",
          };
        })
        .filter(Boolean);
      return mergeIntervalEntriesByKey([
        ...normalizedIntervals,
        ...previewGeneratedEntries,
        ...previewManualEntries,
      ])
        .filter(
          (entry) =>
            Boolean(entry) &&
            !deletedIntervalIds.includes(
              String(entry?.key || entry?.subIntervalID || entry?.subIntervalId || entry?.intervalID || entry?.intervalId || "").trim(),
            ),
        );
    })();
    const homeIntervalsDisplayRows = [
      ...((this.state?.homeIntervalToolbarOpen &&
      homeIntervalsPreview.length > 0
        ? homeIntervalsPreview
        : normalizedIntervals)),
    ].reverse();
    const buildIntervalOptionLabel = (intervalEntry) => {
      const optionValue = String(
        intervalEntry?.key || intervalEntry?.subIntervalID || intervalEntry?.subIntervalId || intervalEntry?.intervalID || intervalEntry?.intervalId || "",
      ).trim();
      const parsed = this.parseIntervalIdYearTerm(
        intervalEntry?.subIntervalID || intervalEntry?.subIntervalId || intervalEntry?.key,
      );
      const iSym = intervalEntry?.intervalSymbol || parsed.intervalSymbol || "INT";
      const iNum = intervalEntry?.intervalNum || parsed.intervalNum || "";
      const tSym = intervalEntry?.intervalTrySymbol || parsed.intervalTrySymbol || "IT";
      const tNum = intervalEntry?.subIntervalTryNum ?? intervalEntry?.intervalTryNum ?? parsed.tryNum ?? "";
      const sSym = intervalEntry?.subIntervalSymbol || parsed.subIntervalSymbol || "sINT";
      const sNum = intervalEntry?.subIntervalNum || parsed.subIntervalNum || "";
      if (iNum && tNum && sNum) return `${iSym}${iNum}-${tSym}${tNum}-${sSym}${sNum}`;
      if (iNum && sNum) return `${iSym}${iNum}-${sSym}${sNum}`;
      return optionValue || "-";
    };
    const homeCourseComponentLectureIntervalOptions = homeIntervalsDisplayRows
      .map((intervalEntry) => {
        const optionValue = String(
          intervalEntry?.key ||
            intervalEntry?.subIntervalId ||
            intervalEntry?.intervalId ||
            "",
        ).trim();
        if (!optionValue) return null;
        return { value: optionValue, label: buildIntervalOptionLabel(intervalEntry) };
      })
      .filter(Boolean);
    const currentHomeIntervalRow = homeIntervalsDisplayRows.find((intervalEntry) => {
      const intervalStatusValue = String(
        intervalEntry?.intervalStatus || "",
      )
        .trim()
        .toLowerCase();
      return (
        Boolean(intervalEntry?.subIntervalCurrent) ||
        intervalStatusValue === "current" ||
        (currentIntervalKey
          ? currentIntervalKey === intervalEntry.key
          : (intervalEntry.intervalNum || intervalEntry.year) === currentInterval &&
            (intervalEntry.subIntervalNum || intervalEntry.term) === currentTerm)
      );
    });
    const homeCurrentIntervalDraftValue = String(
      this.state?.homeCurrentIntervalDraft || "",
    ).trim();
    const homeCurrentIntervalOptions = homeIntervalsDisplayRows
      .map((intervalEntry) => {
        const optionValue = String(
          intervalEntry?.key ||
            intervalEntry?.subIntervalId ||
            intervalEntry?.intervalId ||
            "",
        ).trim();
        if (!optionValue) {
          return null;
        }
        return {
          value: optionValue,
          label: buildIntervalOptionLabel(intervalEntry),
          intervalStatus:
            String(intervalEntry?.intervalStatus || "Normal").trim() || "Normal",
          subIntervalCurrent: Boolean(intervalEntry?.subIntervalCurrent),
          startDate: this.getPlannerSubIntervalTryDates(intervalEntry).start,
          endDate: this.getPlannerSubIntervalTryDates(intervalEntry).end,
          tryNum: Number.isFinite(Number.parseInt(intervalEntry?.intervalTryNum ?? intervalEntry?.subIntervalTryNum, 10))
            ? Number.parseInt(intervalEntry?.intervalTryNum ?? intervalEntry?.subIntervalTryNum, 10)
            : null,
          isCurrent:
            Boolean(intervalEntry?.subIntervalCurrent) ||
            String(intervalEntry?.intervalStatus || "")
              .trim()
              .toLowerCase() === "current" ||
            (currentIntervalKey
              ? currentIntervalKey === intervalEntry.key
              : (intervalEntry.intervalNum || intervalEntry.year) === currentInterval &&
                (intervalEntry.subIntervalNum || intervalEntry.term) === currentTerm),
        };
      })
      .filter(Boolean);
    const homeCurrentIntervalSelectValue = homeCurrentIntervalOptions.some(
      (option) => option.value === homeCurrentIntervalDraftValue,
    )
      ? homeCurrentIntervalDraftValue
      : "";
    const homeCurrentIntervalSelectedOption =
      homeCurrentIntervalOptions.find(
        (option) => option.value === homeCurrentIntervalSelectValue,
      ) || null;
    const homeSubIntervalsDatesEditingKey = String(
      this.state?.homeSubIntervalsDatesEditingKey || "",
    ).trim();
    const homeSubIntervalsDatesEditingOption =
      homeCurrentIntervalOptions.find(
        (option) => option.value === homeSubIntervalsDatesEditingKey,
      ) || null;
    const splitDateValue = (value = "") => {
      const normalizedValue = String(value || "").trim();
      if (!normalizedValue) {
        return {
          year: "-",
          month: "-",
          day: "-",
        };
      }
      const normalizedInput = this.formatPlannerDateInputValue(normalizedValue) ||
        normalizedValue;
      const dateParts = String(normalizedInput || "")
        .split("T")[0]
        .split("-");
      if (dateParts.length >= 3) {
        return {
          year: dateParts[0] || "-",
          month: dateParts[1] || "-",
          day: dateParts[2] || "-",
        };
      }
      return {
        year: "-",
        month: "-",
        day: "-",
      };
    };
    const homeSubIntervalsDatesRows = homeCurrentIntervalOptions.map((option) => {
      const parsedSubInterval = this.parseIntervalIdYearTerm(option.value);
      const startDateParts = splitDateValue(option.startDate);
      const endDateParts = splitDateValue(option.endDate);
      return {
        subIntervalId: String(option.value || "").trim(),
        subIntervalNum:
          String(parsedSubInterval?.subIntervalNum || "").trim() ||
          "-",
        tryNum: option.tryNum ?? null,
        startDateParts,
        endDateParts,
      };
    });
    const hasHomeSubIntervalDatesRows = homeSubIntervalsDatesRows.length > 0;
    const homeGeneratedIntervalNumOptions = Array.from(
      new Set(
        homeIntervalsDisplayRows
          .map((entry) =>
            Number.parseInt(String(entry?.intervalNum || "").trim(), 10),
          )
          .filter((n) => Number.isFinite(n)),
      ),
    ).sort((left, right) => left - right);
    const homeGeneratedIntervalNumDraftValue = String(
      this.state?.homeGeneratedIntervalNumDraft || "",
    ).trim();
    const homeGeneratedIntervalNumSelectValue = homeGeneratedIntervalNumOptions.includes(
      Number.parseInt(homeGeneratedIntervalNumDraftValue, 10),
    )
      ? homeGeneratedIntervalNumDraftValue
      : "";
    const homeGeneratedIntervalTryOptions = Array.from(
      new Set(
        homeIntervalsDisplayRows
          .filter(
            (entry) =>
              String(entry?.intervalNum || "").trim() ===
              homeGeneratedIntervalNumSelectValue,
          )
          .map((entry) =>
            Number.parseInt(
              String(
                entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "",
              ).trim(),
              10,
            ),
          )
          .filter((n) => Number.isFinite(n)),
      ),
    ).sort((left, right) => left - right);
    const homeGeneratedIntervalTryNumDraftValue = String(
      this.state?.homeGeneratedIntervalTryNumDraft || "",
    ).trim();
    const homeGeneratedIntervalTryNumSelectValue = homeGeneratedIntervalTryOptions.includes(
      Number.parseInt(homeGeneratedIntervalTryNumDraftValue, 10),
    )
      ? homeGeneratedIntervalTryNumDraftValue
      : "";
    const homeGeneratedSubIntervalNumOptions = Array.from(
      new Set(
        homeIntervalsDisplayRows
          .filter(
            (entry) =>
              String(entry?.intervalNum || "").trim() ===
                homeGeneratedIntervalNumSelectValue &&
              String(
                entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "",
              ).trim() === homeGeneratedIntervalTryNumSelectValue,
          )
          .map((entry) =>
            Number.parseInt(
              String(entry?.subIntervalNum ?? entry?.term ?? "").trim(),
              10,
            ),
          )
          .filter((n) => Number.isFinite(n)),
      ),
    ).sort((left, right) => left - right);
    const homeGeneratedSubIntervalNumDraftValue = String(
      this.state?.homeGeneratedSubIntervalNumDraft || "",
    ).trim();
    const homeGeneratedSubIntervalNumSelectValue = homeGeneratedSubIntervalNumOptions.includes(
      Number.parseInt(homeGeneratedSubIntervalNumDraftValue, 10),
    )
      ? homeGeneratedSubIntervalNumDraftValue
      : "";
    const homeGeneratedSelectedIntervalRow =
      homeIntervalsDisplayRows.find(
        (entry) =>
          String(entry?.intervalNum || "").trim() ===
            homeGeneratedIntervalNumSelectValue &&
          String(
            entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "",
          ).trim() === homeGeneratedIntervalTryNumSelectValue &&
          String(entry?.subIntervalNum || "").trim() ===
            homeGeneratedSubIntervalNumSelectValue,
      ) || null;
    const homeGeneratedStartDateMonthDraftValue = String(
      this.state?.homeGeneratedStartDateMonthDraft || "",
    ).trim();
    const homeGeneratedStartDateDayDraftValue = String(
      this.state?.homeGeneratedStartDateDayDraft || "",
    ).trim();
    const homeGeneratedEndDateMonthDraftValue = String(
      this.state?.homeGeneratedEndDateMonthDraft || "",
    ).trim();
    const homeGeneratedEndDateDayDraftValue = String(
      this.state?.homeGeneratedEndDateDayDraft || "",
    ).trim();
    const setGeneratedIntervalDraftFromSelection = ({
      intervalNum = homeGeneratedIntervalNumSelectValue,
      intervalTryNum = homeGeneratedIntervalTryNumSelectValue,
      subIntervalNum = homeGeneratedSubIntervalNumSelectValue,
    } = {}) => {
      const normalizedIntervalNum = String(intervalNum || "").trim();
      const normalizedIntervalTryNum = String(intervalTryNum || "").trim();
      const normalizedSubIntervalNum = String(subIntervalNum || "").trim();
      const selectedIntervalRow =
        homeIntervalsDisplayRows.find(
          (entry) =>
            String(entry?.intervalNum || "").trim() === normalizedIntervalNum &&
            String(
              entry?.intervalTryNum ?? entry?.subIntervalTryNum ?? "",
            ).trim() === normalizedIntervalTryNum &&
            String(entry?.subIntervalNum || "").trim() ===
              normalizedSubIntervalNum,
        ) || null;
      const selectedStartParts = splitDateValue(
        this.getPlannerSubIntervalTryDates(selectedIntervalRow).start,
      );
      const selectedEndParts = splitDateValue(
        this.getPlannerSubIntervalTryDates(selectedIntervalRow).end,
      );
      this.setState({
        homeGeneratedIntervalNumDraft: normalizedIntervalNum,
        homeGeneratedIntervalTryNumDraft: normalizedIntervalTryNum,
        homeGeneratedSubIntervalNumDraft: normalizedSubIntervalNum,
        homeGeneratedStartDateMonthDraft:
          selectedStartParts.month === "-" ? "" : selectedStartParts.month,
        homeGeneratedStartDateDayDraft:
          selectedStartParts.day === "-" ? "" : selectedStartParts.day,
        homeGeneratedEndDateMonthDraft:
          selectedEndParts.month === "-" ? "" : selectedEndParts.month,
        homeGeneratedEndDateDayDraft:
          selectedEndParts.day === "-" ? "" : selectedEndParts.day,
      });
    };
    const homeCurrentIntervalStatusOptions = [
      { value: "Normal", label: "Normal" },
      { value: "current", label: "Current" },
      { value: "Failed", label: "Failed" },
      { value: "Makeup", label: "Makeup" },
    ];
    const homeCurrentIntervalStatusDraftValue = homeCurrentIntervalSelectedOption
      ? String(
          this.state?.homeCurrentIntervalStatusDraft ||
            homeCurrentIntervalSelectedOption?.intervalStatus ||
            "Normal",
        ).trim() || "Normal"
      : String(this.state?.homeCurrentIntervalStatusDraft || "Normal").trim() ||
        "Normal";
    const homeCurrentIntervalStatusSelectValue =
      homeCurrentIntervalStatusOptions.some(
        (option) => option.value === homeCurrentIntervalStatusDraftValue,
      )
        ? homeCurrentIntervalStatusDraftValue
        : "Normal";
    const intervalYearGroupRows = (() => {
      const groupedRows = [];
      let rowIndex = 0;
      while (rowIndex < homeIntervalsDisplayRows.length) {
        const intervalEntry = homeIntervalsDisplayRows[rowIndex] || {};
        if (intervalEntry?.regular === false) {
          const intervalNumValue =
            Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10) ||
            null;
          groupedRows.push({
            rowIndex,
            rowSpan: 1,
            groupIndex: 0,
            groupLabel: intervalNumValue ? String(intervalNumValue) : "-",
            intervalNum: intervalNumValue,
          });
          rowIndex += 1;
          continue;
        }
        const programIntervalNumValue =
          Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10) ||
          null;
        if (!programIntervalNumValue) {
          groupedRows.push({
            rowIndex,
            rowSpan: 1,
            groupIndex: 0,
            groupLabel: "-",
            intervalNum: null,
          });
          rowIndex += 1;
          continue;
        }
        let rowSpan = 1;
        while (rowIndex + rowSpan < homeIntervalsDisplayRows.length) {
          const nextEntry = homeIntervalsDisplayRows[rowIndex + rowSpan] || {};
          if (nextEntry?.regular === false) {
            break;
          }
          if (
            (Number.parseInt(
              String(nextEntry?.intervalNum || "").trim(),
              10,
            ) || null) !== programIntervalNumValue
          ) {
            break;
          }
          rowSpan += 1;
        }
        groupedRows.push({
          rowIndex,
          rowSpan,
          groupIndex: programIntervalNumValue,
          groupLabel: String(programIntervalNumValue),
          intervalNum: programIntervalNumValue,
        });
        rowIndex += rowSpan;
      }
      return groupedRows;
    })();
    const intervalYearGroupMetaByRowIndex = new Map(
      intervalYearGroupRows.map((groupEntry) => [
        groupEntry.rowIndex,
        groupEntry,
      ]),
    );
    const intervalTryGroupRows = (() => {
      const groupedRows = [];
      let rowIndex = 0;
      while (rowIndex < homeIntervalsDisplayRows.length) {
        const intervalEntry = homeIntervalsDisplayRows[rowIndex] || {};
        const intervalNum = Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10) || null;
        const tryNum = intervalEntry?.subIntervalTryNum ?? null;
        let rowSpan = 1;
        if (intervalNum != null) {
          while (rowIndex + rowSpan < homeIntervalsDisplayRows.length) {
            const nextEntry = homeIntervalsDisplayRows[rowIndex + rowSpan] || {};
            const nextIntervalNum = Number.parseInt(String(nextEntry?.intervalNum || "").trim(), 10) || null;
            const nextTryNum = nextEntry?.subIntervalTryNum ?? null;
            if (nextIntervalNum !== intervalNum || nextTryNum !== tryNum) break;
            rowSpan += 1;
          }
        }
        groupedRows.push({ rowIndex, rowSpan, tryNum, tryID: intervalEntry?.intervalTryID || null });
        rowIndex += rowSpan;
      }
      return groupedRows;
    })();
    const intervalTryGroupMetaByRowIndex = new Map(
      intervalTryGroupRows.map((groupEntry) => [groupEntry.rowIndex, groupEntry]),
    );
    const normalizeIdListForCompare = (values = []) =>
      Array.from(
        new Set(
          (Array.isArray(values) ? values : [])
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        ),
      ).sort();
    const registeredProgramId = plannerProgramId;
    const programEditorOpen = Boolean(this.state?.homeProgramSetEditorOpen);
    const programHasRegisteredValue = Boolean(registeredProgramId);
    const programDraftValue = String(
      this.state?.homeProgramIdDraft || "",
    ).trim();
    const isProgramReady = Boolean(programDraftValue);
    const isProgramDirty = programDraftValue !== registeredProgramId;
    const canSubmitProgram =
      isProgramReady && (!programHasRegisteredValue || isProgramDirty);
    const plannerProgramName = String(plannerRoot?.programName || "").trim();
    const programNameEditorOpen = Boolean(this.state?.homeProgramNameEditorOpen);
    const programNameHasRegisteredValue = Boolean(plannerProgramName);
    const programNameDraftValue = String(this.state?.homeProgramNameDraft || "").trim();
    const canSubmitProgramName = Boolean(programNameDraftValue) &&
      (!programNameHasRegisteredValue || programNameDraftValue !== plannerProgramName);
    const languageEditorOpen = Boolean(this.state?.homeLanguageEditorOpen);
    const languageHasRegisteredValue = Boolean(programLanguage);
    const languageDraftValue = String(
      this.state?.homeLanguageDraft || "",
    ).trim();
    const isLanguageReady = Boolean(languageDraftValue);
    const isLanguageDirty = languageDraftValue !== programLanguage;
    const canSubmitLanguage =
      isLanguageReady && (!languageHasRegisteredValue || isLanguageDirty);
    const universityEditorOpen = Boolean(this.state?.homeUniversityEditorOpen);
    const universityHasRegisteredValue = Boolean(locationUniversity);
    const universityDraftValue = String(
      this.state?.homeUniversityDraft || "",
    ).trim();
    const isUniversityReady = Boolean(universityDraftValue);
    const isUniversityDirty = universityDraftValue !== locationUniversity;
    const canSubmitUniversity =
      isUniversityReady && (!universityHasRegisteredValue || isUniversityDirty);
    const facultyEditorOpen = Boolean(this.state?.homeFacultyEditorOpen);
    const facultyHasRegisteredValue = Boolean(locationFaculty);
    const facultyDraftValue = String(this.state?.homeFacultyDraft || "").trim();
    const isFacultyReady = Boolean(facultyDraftValue);
    const isFacultyDirty = facultyDraftValue !== locationFaculty;
    const canSubmitFaculty =
      isFacultyReady && (!facultyHasRegisteredValue || isFacultyDirty);
    const registeredComponentIdsForCompare = normalizeIdListForCompare(
      plannerComponentIds,
    );
    const componentEditorOpen = Boolean(
      this.state?.homeComponentsSetEditorOpen,
    );
    const componentsHasRegisteredValue =
      registeredComponentIdsForCompare.length > 0;
    const draftComponentIdsForCompare = normalizeIdListForCompare(
      (Array.isArray(this.state?.homeComponentsDraftList)
        ? this.state.homeComponentsDraftList
        : []
      ).map((entry) => this.normalizeProgramComponentValue(entry)),
    );
    const isComponentsReady = componentEditorOpen
      ? true
      : draftComponentIdsForCompare.length > 0;
    const isComponentsDirty =
      JSON.stringify(draftComponentIdsForCompare) !==
      JSON.stringify(registeredComponentIdsForCompare);
    const canSubmitComponents =
      isComponentsReady && (!componentsHasRegisteredValue || isComponentsDirty);
    const examsEditorOpen = Boolean(this.state?.homeExamsSetEditorOpen);
    const registeredExamIdsForCompare = normalizeIdListForCompare(
      plannerExams,
    );
    const examsHasRegisteredValue = registeredExamIdsForCompare.length > 0;
    const draftExamIdsForCompare = normalizeIdListForCompare(
      (Array.isArray(this.state?.homeExamsDraftList)
        ? this.state.homeExamsDraftList
        : []
      ).map((entry) => String(entry || "").trim()),
    );
    const isExamsReady = examsEditorOpen ? true : draftExamIdsForCompare.length > 0;
    const isExamsDirty =
      JSON.stringify(draftExamIdsForCompare) !==
      JSON.stringify(registeredExamIdsForCompare);
    const canSubmitExams =
      isExamsReady && (!examsHasRegisteredValue || isExamsDirty);
    const visibleProgramComponents = (
      componentEditorOpen
        ? Array.isArray(this.state?.homeComponentsDraftList)
          ? this.state.homeComponentsDraftList
          : []
        : registeredProgramComponents
    )
      .map((entry, index) => {
        const componentId = this.normalizeProgramComponentValue(entry);
        if (!componentId) {
          return null;
        }
        return {
          key: String(componentEditorOpen ? `draft_${componentId}` : componentId),
          componentId,
          isDraft: componentEditorOpen,
          index,
        };
      })
      .filter(Boolean);
    const visibleProgramExams = (
      examsEditorOpen
        ? Array.isArray(this.state?.homeExamsDraftList)
          ? this.state.homeExamsDraftList
          : []
        : registeredProgramExams
    )
      .map((entry, index) => {
        const examValue = String(
          entry && typeof entry === "object" ? entry?.label : entry,
        ).trim();
        if (!examValue) {
          return null;
        }
        return {
          key: String(entry?.key || `${examValue}_${index}`),
          examValue,
        };
      })
      .filter(Boolean);
    const registeredProgramInstructors = Array.isArray(
      plannerRoot?.programInstructors,
    )
      ? plannerRoot.programInstructors
          .map((entry) => normalizeInstructorEntry(entry))
          .filter(Boolean)
      : [];
    const programInstructorsEditorOpen = Boolean(
      this.state?.homeProgramInstructorsSetEditorOpen,
    );
    const draftProgramInstructors = Array.isArray(
      this.state?.homeProgramInstructorsDraftList,
    )
      ? this.state.homeProgramInstructorsDraftList
          .map((entry) => normalizeInstructorEntry(entry))
          .filter(Boolean)
      : [];
    const canSubmitProgramInstructors = Boolean(
      programInstructorsEditorOpen
        ? draftProgramInstructors.length > 0
        : draftProgramInstructors.length > 0,
    );
    const visibleProgramInstructors = programInstructorsEditorOpen
      ? draftProgramInstructors
      : registeredProgramInstructors;
    const normalizeCoursesNamesCodes = (arr) =>
      Array.isArray(arr)
        ? arr.map((e) => {
            const obj = e && typeof e === "object" ? e : {};
            const courseName = String(obj?.courseName || "").trim();
            if (!courseName) return null;
            return { courseName, courseCode: String(obj?.courseCode || "").trim() };
          }).filter(Boolean)
        : [];
    const registeredProgramCoursesNames = normalizeCoursesNamesCodes(plannerRoot?.programCoursesNamesCodes);
    const programCoursesNamesEditorOpen = Boolean(this.state?.homeProgramCoursesNamesSetEditorOpen);
    const draftProgramCoursesNames = normalizeCoursesNamesCodes(this.state?.homeProgramCoursesNamesDraftList);
    const canSubmitProgramCoursesNames = programCoursesNamesEditorOpen
      ? draftProgramCoursesNames.length > 0
      : false;
    const visibleProgramCoursesNames = programCoursesNamesEditorOpen
      ? draftProgramCoursesNames
      : registeredProgramCoursesNames;
    const registeredProgramEditors = Array.isArray(plannerRoot?.programEditors)
      ? plannerRoot.programEditors
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const programEditorsEditorOpen = Boolean(
      this.state?.homeProgramEditorsSetEditorOpen,
    );
    const draftProgramEditors = Array.isArray(
      this.state?.homeProgramEditorsDraftList,
    )
      ? this.state.homeProgramEditorsDraftList
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const canSubmitProgramEditors = Boolean(draftProgramEditors.length > 0);
    const visibleProgramEditors = programEditorsEditorOpen
      ? draftProgramEditors
      : registeredProgramEditors;
    const registeredProgramLocations = Array.isArray(
      plannerRoot?.programLocations,
    )
      ? plannerRoot.programLocations
          .map((entry) => this.normalizeHomeProgramLocationDraftEntry(entry))
          .filter((entry) => entry.building && entry.rooms.length > 0)
      : [];
    const programLocationsEditorOpen = Boolean(
      this.state?.homeProgramLocationsSetEditorOpen,
    );
    const draftProgramLocations = Array.isArray(
      this.state?.homeProgramLocationsDraftList,
    )
      ? this.state.homeProgramLocationsDraftList
          .map((entry) => this.normalizeHomeProgramLocationDraftEntry(entry))
          .filter((entry) => entry.building)
      : [];
    const canSubmitProgramLocations = Boolean(draftProgramLocations.length > 0);
    const visibleProgramLocations = programLocationsEditorOpen
      ? draftProgramLocations
      : registeredProgramLocations;
    const visibleProgramLocationsByBuilding = Array.from(
      visibleProgramLocations.reduce((map, entry) => {
        const building = String(entry?.building || "").trim();
        if (!building) {
          return map;
        }
        const previous = map.get(building) || { building, rooms: [] };
        const nextRooms = Array.from(
          new Set([
            ...(Array.isArray(previous.rooms) ? previous.rooms : []),
            ...(Array.isArray(entry?.rooms) ? entry.rooms : []),
          ]
            .map((roomEntry) => String(roomEntry || "").trim())
            .filter(Boolean)),
        );
        map.set(building, { building, rooms: nextRooms });
        return map;
      }, new Map()).values(),
    );
    const intervalEditorOpen = Boolean(this.state?.homeIntervalToolbarOpen);
    const intervalsHasRegisteredValue = normalizedIntervals.length > 0;
    const registeredIntervalsForCompare = normalizedIntervals
      .map((entry) => ({
        intervalId: String(entry?.intervalId || "").trim(),
        subIntervalId: String(
          entry?.key || entry?.subIntervalId || entry?.intervalId || "",
        ).trim(),
        regular: Boolean(entry?.regular),
        intervalStatus: String(entry?.intervalStatus || "Normal").trim() || "Normal",
      }))
      .filter((entry) => entry.subIntervalId)
      .sort((left, right) =>
        left.subIntervalId.localeCompare(right.subIntervalId),
      );
    const previewIntervalsForCompare = homeIntervalsPreview
      .map((entry) => ({
        intervalId: String(entry?.intervalId || "").trim(),
        subIntervalId: String(
          entry?.key || entry?.subIntervalId || entry?.intervalId || "",
        ).trim(),
        regular: Boolean(entry?.regular),
        intervalStatus: String(entry?.intervalStatus || "Normal").trim() || "Normal",
      }))
      .filter((entry) => entry.subIntervalId)
      .sort((left, right) =>
        left.subIntervalId.localeCompare(right.subIntervalId),
      );
    const hasPreviewIntervals = previewIntervalsForCompare.length > 0;
    const isIntervalsReady = hasPreviewIntervals || intervalsHasRegisteredValue;
    const isIntervalsDirty =
      JSON.stringify(previewIntervalsForCompare) !==
      JSON.stringify(registeredIntervalsForCompare);
    const canSubmitIntervals = intervalsHasRegisteredValue
      ? isIntervalsReady && isIntervalsDirty
      : hasPreviewIntervals && isIntervalsReady;
    const homePanelModeTabs = [
      { key: "intervals", label: "Intervals" },
      { key: "lectures", label: "Lectures" },
      { key: "documents", label: "Documents" },
    ];
    const rawHomePanelModeTab =
      String(this.state?.homePanelModeTab || "intervals").trim() ||
      "intervals";
    const activeHomePanelModeTab = homePanelModeTabs.some(
      (entry) => entry.key === rawHomePanelModeTab,
    )
      ? rawHomePanelModeTab
      : "intervals";
    return (
      <section id="nogaPlanner_homePanel" className="nogaPlanner_homePanel">
        <div id="nogaPlanner_homePanelGrid" className="nogaPlanner_homePanelGrid">
          <div id="nogaPlanner_homePanelColumn" className="nogaPlanner_homePanelColumn nogaPlanner_homePanelColumn--left">
            <div id="nogaPlanner_home_programName_card" className="nogaPlanner_homePanelCard">
              <div id="nogaPlanner_homePanelCardTitleRow_2" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programName">Program Name</strong>
                <div id="nogaPlanner_homePanelCardActions_2" className="nogaPlanner_homePanelCardActions">
                  {programNameEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programName_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={!canSubmitProgramName}
                      onClick={this.handleHomeProgramNameSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_programName_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      onClick={() =>
                        this.setState({
                          homeProgramNameEditorOpen: true,
                          homeProgramNameDraft: String(
                            this.state?.homeProgramNameDraft || plannerProgramName || "",
                          ),
                        })
                      }
                    >
                      {programNameHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programNameEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programName_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      onClick={this.cancelHomeProgramNameEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programNameEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_programName"
                  type="text"
                  name="homeProgramName"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program name"
                  value={String(this.state?.homeProgramNameDraft || "")}
                  onChange={(event) =>
                    this.setState({ homeProgramNameDraft: String(event.target.value || "") })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_programName_displayValue">
                  {plannerProgramName || "-"}
                </span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programID_card"
              className="nogaPlanner_homePanelCard"
            >
              <div id="nogaPlanner_homePanelCardTitleRow_programID" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programID">Program ID</strong>
                <div id="nogaPlanner_homePanelCardActions_programID" className="nogaPlanner_homePanelCardActions">
                  {programEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programID_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={!canSubmitProgram}
                      onClick={this.handleHomeProgramSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_programID_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      onClick={() =>
                        this.setState({
                          homeProgramSetEditorOpen: true,
                          homeProgramIdDraft: String(
                            this.state?.homeProgramIdDraft || plannerProgramId || "",
                          ),
                        })
                      }
                    >
                      {programHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programID_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      onClick={this.cancelHomeProgramEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_programID"
                  type="text"
                  name="homeProgramID"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program ID"
                  value={String(this.state?.homeProgramIdDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeProgramIdDraft: String(event.target.value || ""),
                    })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_programID_displayValue">
                  {plannerProgramId || "-"}
                </span>
              )}
            </div>
            <div
              id="nogaPlanner_home_language_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_3" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_language">Language</strong>
                <div id="nogaPlanner_homePanelCardActions_3" className="nogaPlanner_homePanelCardActions">
                  {languageEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_language_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitLanguage}
                      onClick={this.handleHomeLanguageSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_language_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeLanguageEditorOpen: true,
                          homeLanguageDraft: String(
                            this.state?.homeLanguageDraft ||
                              programLanguage ||
                              "",
                          ),
                        });
                      }}
                    >
                      {languageHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {languageEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_language_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeLanguageEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {languageEditorOpen ? (
                <select
                  id="nogaPlanner_homeIntervalsInput_9"
                  name="homeLanguage"
                  className="nogaPlanner_homeIntervalsInput"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeLanguageDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeLanguageDraft: String(event.target.value || ""),
                    })
                  }
                >
                  <option value="">Select language</option>
                  {this.plannerLanguageOptions.map((languageOption) => (
                    <option
                      key={`nogaPlanner_languageOption_${languageOption}`}
                      value={languageOption}
                    >
                      {languageOption}
                    </option>
                  ))}
                </select>
              ) : (
                <span id="nogaPlanner_home_language_displayValue">{programLanguage || "-"}</span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programStartYear_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_4" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programStartYear">Program Start Year</strong>
                <div id="nogaPlanner_homePanelCardActions_4" className="nogaPlanner_homePanelCardActions">
                  {programStartYearEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programStartYear_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramStartYear}
                      onClick={this.handleHomeProgramStartYearSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_programStartYear_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeProgramStartYearEditorOpen: true,
                          homeProgramStartYearDraft: String(
                            this.state?.homeProgramStartYearValue || "",
                          ),
                        });
                      }}
                    >
                      {programStartYearHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programStartYearEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programStartYear_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramStartYearEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programStartYearEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_10"
                  type="number"
                  name="homeProgramStartYear"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program Start Year"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeProgramStartYearDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeProgramStartYearDraft: String(
                        event.target.value || "",
                      ),
                    })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_programStartYear_displayValue">{registeredProgramStartYear || "-"}</span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programTotalYears_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_5" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programTotalYears">Program Total Years</strong>
                <div id="nogaPlanner_homePanelCardActions_5" className="nogaPlanner_homePanelCardActions">
                  {programTotalYearsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programTotalYears_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={
                        isHomeCardsLocked || !canSubmitProgramTotalYears
                      }
                      onClick={this.handleHomeProgramTotalYearsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_programTotalYears_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeProgramTotalYearsEditorOpen: true,
                          homeProgramTotalYearsDraft: String(
                            this.state?.homeProgramTotalYearsValue || "",
                          ),
                        });
                      }}
                    >
                      {programTotalYearsHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programTotalYearsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programTotalYears_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramTotalYearsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programTotalYearsEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_11"
                  type="number"
                  name="homeProgramTotalYears"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program Total Years"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeProgramTotalYearsDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeProgramTotalYearsDraft: String(
                        event.target.value || "",
                      ),
                    })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_programTotalYears_displayValue">{registeredProgramTotalYears || "-"}</span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programTermsPerYear_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_6" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programTermsPerYear">Program Terms Per Year</strong>
                <div id="nogaPlanner_homePanelCardActions_6" className="nogaPlanner_homePanelCardActions">
                  {programTermsPerYearEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programTermsPerYear_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={
                        isHomeCardsLocked || !canSubmitProgramTermsPerYear
                      }
                      onClick={this.handleHomeProgramTermsPerYearSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_programTermsPerYear_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeProgramTermsPerYearEditorOpen: true,
                          homeProgramTermsPerYearDraft: String(
                            this.state?.homeProgramTermsPerYearValue || "",
                          ),
                        });
                      }}
                    >
                      {programTermsPerYearHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programTermsPerYearEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_programTermsPerYear_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramTermsPerYearEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programTermsPerYearEditorOpen ? (
                <select
                  id="nogaPlanner_homeIntervalsInput_12"
                  name="homeProgramTermsPerYear"
                  className="nogaPlanner_homeIntervalsInput"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeProgramTermsPerYearDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeProgramTermsPerYearDraft: String(
                        event.target.value || "",
                      ),
                    })
                  }
                >
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              ) : (
                <span id="nogaPlanner_home_programTermsPerYear_displayValue">{registeredProgramTermsPerYear || "-"}</span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programFailingRules_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_7" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programFailingRules">Program Failing Rules</strong>
                <div id="nogaPlanner_homePanelCardActions_7" className="nogaPlanner_homePanelCardActions">
                  {intervalPassingThresholdEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_failingRules_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={
                        isHomeCardsLocked ||
                        !canSubmitIntervalPassingThreshold
                      }
                      onClick={this.handleHomeIntervalPassingThresholdSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_failingRules_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeIntervalPassingThresholdEditorOpen: true,
                          homeIntervalPassingThresholdModeDraft: "",
                          homeIntervalPassingThresholdUnitDraft: "",
                          homeIntervalPassingThresholdNumberDraft: "",
                          homeIntervalPassingThresholdRuleDraft: "",
                          homeIntervalPassingThresholdIsEditing: false,
                          homeIntervalPassingThresholdDraftTouched: false,
                          homeIntervalPassingThresholdDraftList: registeredProgramFailingRules.map(
                            (entry) => ({
                              key: String(entry?.key || "").trim(),
                              thresholdMode: String(entry?.thresholdMode || "").trim(),
                              thresholdUnit: String(entry?.thresholdUnit || "").trim(),
                              thresholdNumber: String(entry?.thresholdNumber ?? "").trim(),
                              thresholdRule: String(entry?.thresholdRule || "").trim(),
                            }),
                          ),
                        });
                      }}
                    >
                      {registeredProgramFailingRules.length > 0
                        ? "Edit"
                        : "Set"}
                    </button>
                  )}
                  {intervalPassingThresholdEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_failingRules_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeIntervalPassingThresholdEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {intervalPassingThresholdEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsAddRow_2" className="nogaPlanner_homeIntervalsAddRow">
                  <select
                    id="nogaPlanner_homeIntervalsInput_13"
                    name="homeIntervalPassingThresholdMode"
                    className="nogaPlanner_homeIntervalsInput"
                    disabled={isHomeCardsLocked}
                    value={String(
                      this.state?.homeIntervalPassingThresholdModeDraft || "",
                    )}
                    onChange={(event) =>
                      this.setState({
                        homeIntervalPassingThresholdModeDraft: String(
                          event.target.value || "",
                        ),
                      })
                    }
                  >
                    <option value="">Mode</option>
                    <option value="Interval">Interval</option>
                    <option value="subInterval">subInterval</option>
                    <option value="Course">Course</option>
                    {plannerComponentIds.length > 0 ? (
                      plannerComponentIds.map((componentId) => (
                        <option
                          key={`programFailingRuleComponent_${componentId}`}
                          value={`Component: ${componentId}`}
                        >
                          {`Component: ${componentId}`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No program components
                      </option>
                    )}
                    <option value="Lecture">Lecture</option>
                  </select>
                  <select
                    id="nogaPlanner_homeIntervalsInput_14"
                    name="homeIntervalPassingThresholdUnit"
                    className="nogaPlanner_homeIntervalsInput"
                    disabled={isHomeCardsLocked}
                    value={String(
                      this.state?.homeIntervalPassingThresholdUnitDraft || "",
                    )}
                    onChange={(event) =>
                      this.setState({
                        homeIntervalPassingThresholdUnitDraft: String(
                          event.target.value || "",
                        ),
                      })
                    }
                  >
                    <option value="">Unit</option>
                    {intervalPassingThresholdUnitOptions.map((unitOption) => (
                      <option
                        key={`homeIntervalPassingThresholdUnitOption_${unitOption.value}`}
                        value={unitOption.value}
                      >
                        {unitOption.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="nogaPlanner_homeIntervalsInput_15"
                    type="number"
                    name="homeIntervalPassingThresholdNumber"
                    className="nogaPlanner_homeIntervalsInput"
                    placeholder="Threshold"
                    disabled={isHomeCardsLocked}
                    value={String(
                      this.state?.homeIntervalPassingThresholdNumberDraft || "",
                    )}
                    onChange={(event) =>
                      this.setState({
                        homeIntervalPassingThresholdNumberDraft: String(
                          event.target.value || "",
                        ),
                      })
                    }
                  />
                  <select
                    id="nogaPlanner_homeIntervalsInput_15b"
                    name="homeIntervalPassingThresholdRule"
                    className="nogaPlanner_homeIntervalsInput"
                    disabled={isHomeCardsLocked}
                    value={String(
                      this.state?.homeIntervalPassingThresholdRuleDraft || "",
                    )}
                    onChange={(event) =>
                      this.setState({
                        homeIntervalPassingThresholdRuleDraft: String(
                          event.target.value || "",
                        ),
                      })
                    }
                  >
                    <option value="">Rule</option>
                    <option value="less than">less than</option>
                    <option value="equal">equal</option>
                    <option value="more than">more than</option>
                  </select>
                  <button
                    id="nogaPlanner_home_button_failingRule_add"
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn"
                    disabled={
                      isHomeCardsLocked ||
                      !hasIntervalPassingThresholdDraftValue ||
                      !isIntervalPassingThresholdReady
                    }
                    onClick={this.appendHomeIntervalPassingThresholdDraftEntry}
                  >
                    {this.state?.homeIntervalPassingThresholdIsEditing ? "Apply changes" : "Add"}
                  </button>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel" className="nogaPlanner_homePanelCardStoredLabel">
                  {intervalPassingThresholdEditorOpen
                    ? "Draft Rules"
                    : "Stored Rules"}
                </span>
                {visibleProgramFailingRules.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_head">
                      <tr id="nogaPlanner_homeComponentsTable_row1">
                        <th id="nogaPlanner_homeComponentsTable_th_Mode">Mode</th>
                        <th id="nogaPlanner_homeComponentsTable_th_Unit">Unit</th>
                        <th id="nogaPlanner_homeComponentsTable_th_Threshold">Threshold</th>
                        <th id="nogaPlanner_homeComponentsTable_th_Rule">Rule</th>
                        {intervalPassingThresholdEditorOpen ? (
                          <th id="nogaPlanner_homeComponentsTable_th_Actions">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_body">
                      {visibleProgramFailingRules.map((rule) => (
                        <tr id={`nogaPlanner_failingRule_row_${rule.key}`} key={rule.key}>
                          <td id={`nogaPlanner_failingRule_${rule.key}_mode`}>{this.formatPlannerTableValue(rule.thresholdMode)}</td>
                          <td id={`nogaPlanner_failingRule_${rule.key}_unit`}>{this.formatPlannerTableValue(rule.thresholdUnit)}</td>
                          <td id={`nogaPlanner_failingRule_${rule.key}_number`}>{this.formatPlannerTableValue(rule.thresholdNumber)}</td>
                          <td id={`nogaPlanner_failingRule_${rule.key}_rule`}>{this.formatPlannerTableValue(rule.thresholdRule)}</td>
                          {intervalPassingThresholdEditorOpen ? (
                            <td id={`nogaPlanner_failingRule_${rule.key}_actions`}>
                              <button
                                id="nogaPlanner_home_button_failingRule_edit"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeIntervalPassingThresholdDraftEntry(
                                    rule,
                                  )
                                }
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_home_button_failingRule_remove"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeIntervalPassingThresholdDraftEntry(
                                    rule,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  intervalPassingThresholdEditorOpen ? (
                    <table id="nogaPlanner_homeComponentsTable_2" className="nogaPlanner_homeComponentsTable">
                      <thead id="nogaPlanner_homeComponentsTable_2_head">
                        <tr id="nogaPlanner_homeComponentsTable_2_row1">
                          <th id="nogaPlanner_homeComponentsTable_2_th_Mode">Mode</th>
                          <th id="nogaPlanner_homeComponentsTable_2_th_Unit">Unit</th>
                          <th id="nogaPlanner_homeComponentsTable_2_th_Threshold">Threshold</th>
                          <th id="nogaPlanner_homeComponentsTable_2_th_Rule">Rule</th>
                          <th id="nogaPlanner_homeComponentsTable_2_th_Actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody id="nogaPlanner_homeComponentsTable_2_body">
                        <tr id="nogaPlanner_homeComponentsTable_2_row2">
                          <td id="nogaPlanner_noDraftRules_emptyCell" colSpan={5}>
                            <span id="nogaPlanner_homePanelCardEmptyValue" className="nogaPlanner_homePanelCardEmptyValue">
                              No draft rules
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <span id="nogaPlanner_homePanelCardEmptyValue_2" className="nogaPlanner_homePanelCardEmptyValue">
                      {registeredProgramFailingRules.length > 0
                        ? `${registeredIntervalPassingThresholdMode}: ${registeredIntervalPassingThresholdNumber} ${registeredIntervalPassingThresholdUnit}`
                        : "No stored rules"}
                    </span>
                  )
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_university_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_8" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_university">University</strong>
                <div id="nogaPlanner_homePanelCardActions_8" className="nogaPlanner_homePanelCardActions">
                  {universityEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_university_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitUniversity}
                      onClick={this.handleHomeUniversitySetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_university_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeUniversityEditorOpen: true,
                          homeUniversityDraft: String(
                            this.state?.homeUniversityDraft ||
                              locationUniversity ||
                              "",
                          ),
                        });
                      }}
                    >
                      {universityHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {universityEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_university_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeUniversityEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {universityEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_16"
                  type="text"
                  name="homeUniversity"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program university"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeUniversityDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeUniversityDraft: String(event.target.value || ""),
                    })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_university_displayValue">{this.formatPlannerTableValue(locationUniversity)}</span>
              )}
            </div>
            <div
              id="nogaPlanner_home_faculty_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_9" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_faculty">Faculty</strong>
                <div id="nogaPlanner_homePanelCardActions_9" className="nogaPlanner_homePanelCardActions">
                  {facultyEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_faculty_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitFaculty}
                      onClick={this.handleHomeFacultySetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_faculty_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeFacultyEditorOpen: true,
                          homeFacultyDraft: String(
                            this.state?.homeFacultyDraft ||
                              locationFaculty ||
                              "",
                          ),
                        });
                      }}
                    >
                      {facultyHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {facultyEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_faculty_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeFacultyEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {facultyEditorOpen ? (
                <input
                  id="nogaPlanner_homeIntervalsInput_17"
                  type="text"
                  name="homeFaculty"
                  className="nogaPlanner_homeIntervalsInput"
                  placeholder="Program faculty"
                  disabled={isHomeCardsLocked}
                  value={String(this.state?.homeFacultyDraft || "")}
                  onChange={(event) =>
                    this.setState({
                      homeFacultyDraft: String(event.target.value || ""),
                    })
                  }
                />
              ) : (
                <span id="nogaPlanner_home_faculty_displayValue">
                  {locationFaculty ? `The Faculty of ${locationFaculty}` : ""}
                </span>
              )}
            </div>
            <div
              id="nogaPlanner_home_programComponents_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isComponentsCardLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_10" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programComponents">Program Component Classes</strong>
                <div id="nogaPlanner_homePanelCardActions_10" className="nogaPlanner_homePanelCardActions">
                  {componentEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_components_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitComponents}
                      onClick={this.handleHomeComponentsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_components_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeComponentsSetEditorOpen: true,
                          homeComponentIdInput: "",
                          homeComponentsDraftList: plannerComponentIds,
                        });
                      }}
                    >
                      {componentsHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {componentEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_components_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeComponentsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {componentEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_2" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_3" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_18"
                      type="text"
                      name="homeComponentId"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Component Class"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeComponentIdInput || "")}
                      onChange={(event) =>
                        this.setState({
                          homeComponentIdInput: String(
                            event.target.value || "",
                          ),
                        })
                      }
                    />
                    <button
                      id="nogaPlanner_home_button_component_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeComponentDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_2" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_2" className="nogaPlanner_homePanelCardStoredLabel">
                  {componentEditorOpen ? "Draft Components" : "Stored Components"}
                </span>
                {visibleProgramComponents.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_3" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_3_head">
                      <tr id="nogaPlanner_homeComponentsTable_3_row1">
                        <th id="nogaPlanner_homeComponentsTable_3_th_Component">Component</th>
                        {componentEditorOpen ? <th id="nogaPlanner_programComponents_th_actions">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_3_body">
                      {visibleProgramComponents.map((componentEntry) => (
                        <tr id={`nogaPlanner_programComponent_row_${componentEntry.key}`} key={componentEntry.key}>
                          <td id={`nogaPlanner_programComponent_${componentEntry.key}_id`}>{componentEntry.componentId}</td>
                          {componentEditorOpen ? (
                            <td id={`nogaPlanner_programComponent_${componentEntry.key}_actions`}>
                              <button
                                id="nogaPlanner_home_button_component_edit"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeComponentDraftEntry(
                                    componentEntry.componentId,
                                  )
                                }
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_home_button_component_remove"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeComponentDraftEntry(
                                    componentEntry.componentId,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_3" className="nogaPlanner_homePanelCardEmptyValue">
                    {componentEditorOpen ? "Add at least one component." : "No stored components"}
                  </span>
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_programExamClasses_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isComponentsCardLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_11" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programExamClasses">Program Exam Classes</strong>
                <div id="nogaPlanner_homePanelCardActions_11" className="nogaPlanner_homePanelCardActions">
                  {examsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_exams_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitExams}
                      onClick={this.handleHomeExamsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_exams_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeExamsSetEditorOpen: true,
                          homeExamInput: "",
                          homeExamsDraftList: plannerExams,
                        });
                      }}
                    >
                      {examsHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {examsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_exams_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeExamsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {examsEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_3" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_4" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_19"
                      type="text"
                      name="homeExam"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Exam class"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeExamInput || "")}
                      onChange={(event) =>
                        this.setState({
                          homeExamInput: String(event.target.value || ""),
                        })
                      }
                    />
                    <button
                      id="nogaPlanner_home_button_exam_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeExamDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_3" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_3" className="nogaPlanner_homePanelCardStoredLabel">
                  {examsEditorOpen ? "Draft Exam Classes" : "Stored Exam Classes"}
                </span>
                {visibleProgramExams.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_4" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_4_head">
                      <tr id="nogaPlanner_homeComponentsTable_4_row1">
                        <th id="nogaPlanner_homeComponentsTable_4_th_Exam_Class">Exam Class</th>
                        {examsEditorOpen ? <th id="nogaPlanner_examClasses_th_actions">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_4_body">
                      {visibleProgramExams.map((examEntry) => (
                        <tr id={`nogaPlanner_examClass_row_${examEntry.key}`} key={examEntry.key}>
                          <td id={`nogaPlanner_examClass_${examEntry.key}_value`}>{examEntry.examValue}</td>
                          {examsEditorOpen ? (
                            <td id={`nogaPlanner_examClass_${examEntry.key}_actions`}>
                              <button
                                id="nogaPlanner_home_button_exam_edit"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeExamDraftEntry(
                                    examEntry.examValue,
                                  )
                                }
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_home_button_exam_remove"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeExamDraftEntry(
                                    examEntry.examValue,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_4" className="nogaPlanner_homePanelCardEmptyValue">
                    {examsEditorOpen
                      ? "Add at least one exam class."
                      : "No stored exam classes"}
                  </span>
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_programInstructors_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_12" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programInstructors">Program instructors</strong>
                <div id="nogaPlanner_homePanelCardActions_12" className="nogaPlanner_homePanelCardActions">
                  {programInstructorsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_instructors_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramInstructors}
                      onClick={this.handleHomeProgramInstructorsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_instructors_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeProgramInstructorsSetEditorOpen: true,
                          homeProgramInstructorFirstNameInput: "",
                          homeProgramInstructorLastNameInput: "",
                          homeProgramInstructorsDraftList:
                            registeredProgramInstructors,
                        })
                      }
                    >
                      {registeredProgramInstructors.length > 0 ? "Edit" : "Set"}
                    </button>
                  )}
                  {programInstructorsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_instructors_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramInstructorsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {!programInstructorsEditorOpen && registeredProgramInstructors.length > 0 ? (
                    <button
                      id="nogaPlanner_home_button_instructors_reset"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={() => this.requestResetWithPassword("Reset Instructors", this.handleHomeProgramInstructorsReset)}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
              {programInstructorsEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_4" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_5" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_20_firstName"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="First name"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeProgramInstructorFirstNameInput || "")}
                      onChange={(event) =>
                        this.setState({
                          homeProgramInstructorFirstNameInput: String(
                            event.target.value || "",
                          ),
                        })
                      }
                    />
                    <input
                      id="nogaPlanner_homeIntervalsInput_20_lastName"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Last name"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeProgramInstructorLastNameInput || "")}
                      onChange={(event) =>
                        this.setState({
                          homeProgramInstructorLastNameInput: String(
                            event.target.value || "",
                          ),
                        })
                      }
                    />
                    <button
                      id="nogaPlanner_home_button_instructor_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeProgramInstructorDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_4" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_4" className="nogaPlanner_homePanelCardStoredLabel">
                  {programInstructorsEditorOpen
                    ? "Draft Instructors"
                    : "Stored Instructors"}
                </span>
                {visibleProgramInstructors.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_5" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_5_head">
                      <tr id="nogaPlanner_homeComponentsTable_5_row1">
                        <th id="nogaPlanner_homeComponentsTable_5_th_InstructorFirstName">First name</th>
                        <th id="nogaPlanner_homeComponentsTable_5_th_InstructorLastName">Last name</th>
                        {programInstructorsEditorOpen ? <th id="nogaPlanner_programInstructors_th_actions">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_5_body">
                      {visibleProgramInstructors.map((instructorEntry, index) => {
                        const normalizedInstructorEntry = normalizeInstructorEntry(instructorEntry);
                        const displayKey =
                          formatInstructorDisplayName(normalizedInstructorEntry) ||
                          `instructor_${index}`;
                        return (
                        <tr id={`nogaPlanner_instructor_row_${displayKey}`} key={displayKey}>
                          <td id={`nogaPlanner_instructor_${displayKey}_firstName`}>
                            {this.formatPlannerTableValue(normalizedInstructorEntry?.firstName)}
                          </td>
                          <td id={`nogaPlanner_instructor_${displayKey}_lastName`}>
                            {this.formatPlannerTableValue(normalizedInstructorEntry?.lastName)}
                          </td>
                          {programInstructorsEditorOpen ? (
                            <td id={`nogaPlanner_instructor_${displayKey}_actions`}>
                              <button
                                id="nogaPlanner_home_button_instructor_edit"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeProgramInstructorDraftEntry(
                                    normalizedInstructorEntry,
                                  )
                                }
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_home_button_instructor_remove"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeProgramInstructorDraftEntry(
                                    normalizedInstructorEntry,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      )})}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_5" className="nogaPlanner_homePanelCardEmptyValue">
                    {programInstructorsEditorOpen
                      ? "Add at least one instructor."
                      : "No stored instructors"}
                  </span>
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_programCoursesNames_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked ? " nogaPlanner_homePanelCard--disabled" : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_coursesNames" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programCoursesNames">Program courses names &amp; codes</strong>
                <div id="nogaPlanner_homePanelCardActions_coursesNames" className="nogaPlanner_homePanelCardActions">
                  {programCoursesNamesEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_coursesNames_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramCoursesNames}
                      onClick={this.handleHomeProgramCoursesNamesSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_coursesNames_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeProgramCoursesNamesSetEditorOpen: true,
                          homeProgramCoursesNamesInput: "",
                          homeProgramCoursesCodesInput: "",
                          homeProgramCoursesNamesDraftList: registeredProgramCoursesNames,
                        })
                      }
                    >
                      {registeredProgramCoursesNames.length > 0 ? "Edit" : "Set"}
                    </button>
                  )}
                  {programCoursesNamesEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_coursesNames_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramCoursesNamesEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {!programCoursesNamesEditorOpen && registeredProgramCoursesNames.length > 0 ? (
                    <button
                      id="nogaPlanner_home_button_coursesNames_reset"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={() => this.requestResetWithPassword("Reset Courses Names", this.handleHomeProgramCoursesNamesReset)}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
              {programCoursesNamesEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_coursesNames" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_coursesNames" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_coursesNames"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Course name"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeProgramCoursesNamesInput || "")}
                      onChange={(event) =>
                        this.setState({ homeProgramCoursesNamesInput: String(event.target.value || "") })
                      }
                      onKeyDown={(e) => { if (e.key === "Enter") this.appendHomeProgramCourseNameDraftEntry(); }}
                    />
                    <input
                      id="nogaPlanner_homeIntervalsInput_coursesCodes"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Course code"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeProgramCoursesCodesInput || "")}
                      onChange={(event) =>
                        this.setState({ homeProgramCoursesCodesInput: String(event.target.value || "") })
                      }
                      onKeyDown={(e) => { if (e.key === "Enter") this.appendHomeProgramCourseNameDraftEntry(); }}
                    />
                    <button
                      id="nogaPlanner_home_button_coursesNames_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeProgramCourseNameDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_coursesNames" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_coursesNames" className="nogaPlanner_homePanelCardStoredLabel">
                  {programCoursesNamesEditorOpen ? "Draft courses names & codes" : "Stored courses names & codes"}
                </span>
                {visibleProgramCoursesNames.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_coursesNames" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_coursesNames_head">
                      <tr id="nogaPlanner_homeComponentsTable_coursesNames_row1">
                        <th id="nogaPlanner_homeComponentsTable_coursesNames_th_name">Course name</th>
                        <th id="nogaPlanner_homeComponentsTable_coursesNames_th_code">Code</th>
                        {programCoursesNamesEditorOpen ? (
                          <th id="nogaPlanner_homeComponentsTable_coursesNames_th_actions">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_coursesNames_body">
                      {visibleProgramCoursesNames.map((entry) => {
                        const rowKey = String(entry?.courseName || "");
                        return (
                          <tr
                            id={`nogaPlanner_courseName_row_${rowKey}`}
                            key={rowKey}
                          >
                            <td id={`nogaPlanner_courseName_${rowKey}_name`}>{entry.courseName}</td>
                            <td id={`nogaPlanner_courseName_${rowKey}_code`}>{entry.courseCode || ""}</td>
                            {programCoursesNamesEditorOpen ? (
                              <td id={`nogaPlanner_courseName_${rowKey}_actions`}>
                                <button
                                  id={`nogaPlanner_home_button_courseName_edit_${rowKey}`}
                                  type="button"
                                  className="nogaPlanner_homePanelCardSetBtn"
                                  disabled={isHomeCardsLocked}
                                  onClick={() => this.editHomeProgramCourseNameDraftEntry(entry)}
                                >
                                  Edit
                                </button>
                                <button
                                  id={`nogaPlanner_home_button_courseName_remove_${rowKey}`}
                                  type="button"
                                  className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                  disabled={isHomeCardsLocked}
                                  onClick={() => this.removeHomeProgramCourseNameDraftEntry(entry.courseName)}
                                >
                                  Remove
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_coursesNames" className="nogaPlanner_homePanelCardEmptyValue">
                    {programCoursesNamesEditorOpen ? "Add at least one course name." : "No stored course names & codes"}
                  </span>
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_programCurrentIntervalTryNum_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked ? " nogaPlanner_homePanelCard--disabled" : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_currentIntervalTryNum" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_currentIntervalTryNum">Current sub-Interval try</strong>
                <div id="nogaPlanner_homePanelCardActions_currentIntervalTryNum" className="nogaPlanner_homePanelCardActions">
                  {currentIntervalTryNumEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_currentIntervalTryNum_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitCurrentIntervalTryNum}
                      onClick={this.handleHomeProgramCurrentIntervalTryNumSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_currentIntervalTryNum_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeProgramCurrentIntervalTryNumEditorOpen: true,
                          homeProgramCurrentIntervalNumDraft: registeredCurrentIntervalNum,
                          homeProgramCurrentIntervalTryNumDraft: registeredCurrentIntervalTryNum,
                          homeProgramCurrentSubIntervalNumDraft: registeredCurrentSubIntervalNum,
                        })
                      }
                    >
                      {hasRegisteredCurrentIntervalTryNum ? "Edit" : "Set"}
                    </button>
                  )}
                  {currentIntervalTryNumEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_currentIntervalTryNum_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramCurrentIntervalTryNumEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {!currentIntervalTryNumEditorOpen && hasRegisteredCurrentIntervalTryNum ? (
                    <button
                      id="nogaPlanner_home_button_currentIntervalTryNum_reset"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.requestResetWithPassword(
                          "Reset Current Interval",
                          this.handleHomeProgramCurrentIntervalTryNumReset,
                        )
                      }
                      >
                        Reset
                      </button>
                  ) : null}
                </div>
              </div>
              {currentIntervalTryNumEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_currentIntervalTryNum" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_currentIntervalTryNum" className="nogaPlanner_homeIntervalsAddRow">
                    <select
                      id="nogaPlanner_homeIntervalsSelect_intervalNum"
                      className="nogaPlanner_homeIntervalsInput"
                      disabled={isHomeCardsLocked}
                      value={draftCurrentIntervalNum}
                      onChange={(event) =>
                        this.setState({
                          homeProgramCurrentIntervalNumDraft: String(event.target.value || ""),
                          homeProgramCurrentIntervalTryNumDraft: "",
                          homeProgramCurrentSubIntervalNumDraft: "",
                        })
                      }
                    >
                      <option value="">Interval №</option>
                      {currentIntervalNumSelectOptions.map((n) => (
                        <option key={n} value={String(n)}>{n}</option>
                      ))}
                    </select>
                    <select
                      id="nogaPlanner_homeIntervalsSelect_intervalTryNum"
                      className="nogaPlanner_homeIntervalsInput"
                      disabled={isHomeCardsLocked || !draftCurrentIntervalNum}
                      value={draftCurrentIntervalTryNum}
                      onChange={(event) =>
                        this.setState({
                          homeProgramCurrentIntervalTryNumDraft: String(event.target.value || ""),
                          homeProgramCurrentSubIntervalNumDraft: "",
                        })
                      }
                    >
                      <option value="">Interval Try Number</option>
                      {currentIntervalTryNumSelectOptions.map((n) => (
                        <option key={n} value={String(n)}>{n}</option>
                      ))}
                    </select>
                    <select
                      id="nogaPlanner_homeIntervalsSelect_subIntervalTryNum"
                      className="nogaPlanner_homeIntervalsInput"
                      disabled={isHomeCardsLocked || !draftCurrentIntervalTryNum}
                      value={draftCurrentSubIntervalNum}
                      onChange={(event) =>
                        this.setState({
                          homeProgramCurrentSubIntervalNumDraft: String(event.target.value || ""),
                        })
                      }
                    >
                      <option value="">sub-Interval Try Number</option>
                      {currentSubIntervalTryNumSelectOptions.map((n) => (
                        <option key={n} value={String(n)}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div id="nogaPlanner_homePanelCardStoredBlock_currentIntervalTryNum" className="nogaPlanner_homePanelCardStoredBlock">
                  {hasRegisteredCurrentIntervalTryNum ? (
                    <table id="nogaPlanner_homeComponentsTable_currentIntervalTryNum" className="nogaPlanner_homeComponentsTable">
                      <thead>
                        <tr>
                          <th>Interval №</th>
                          <th>Interval Try Number</th>
                          <th>sub-Interval Try Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td id="nogaPlanner_currentIntervalTryNum_intervalNum">{this.formatPlannerTableValue(registeredCurrentIntervalNum)}</td>
                          <td id="nogaPlanner_currentIntervalTryNum_intervalTryNum">{this.formatPlannerTableValue(registeredCurrentIntervalTryNum)}</td>
                          <td id="nogaPlanner_currentIntervalTryNum_subIntervalTryNum">{this.formatPlannerTableValue(registeredCurrentSubIntervalNum)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <span id="nogaPlanner_homePanelCardEmptyValue_currentIntervalTryNum" className="nogaPlanner_homePanelCardEmptyValue">
                      Not set
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              id="nogaPlanner_home_programEditors_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_13" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programEditors">Program editors</strong>
                <div id="nogaPlanner_homePanelCardActions_13" className="nogaPlanner_homePanelCardActions">
                  {programEditorsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_editors_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramEditors}
                      onClick={this.handleHomeProgramEditorsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_editors_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeProgramEditorsSetEditorOpen: true,
                          homeProgramEditorInput: "",
                          homeProgramEditorsDraftList: registeredProgramEditors,
                        })
                      }
                    >
                      {registeredProgramEditors.length > 0 ? "Edit" : "Set"}
                    </button>
                  )}
                  {programEditorsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_editors_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramEditorsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programEditorsEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_5" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_6" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_21"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Program editor"
                      disabled={isHomeCardsLocked}
                      value={String(this.state?.homeProgramEditorInput || "")}
                      onChange={(event) =>
                        this.setState({
                          homeProgramEditorInput: String(
                            event.target.value || "",
                          ),
                        })
                      }
                    />
                    <button
                      id="nogaPlanner_home_button_editor_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeProgramEditorDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_5" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_5" className="nogaPlanner_homePanelCardStoredLabel">
                  {programEditorsEditorOpen ? "Draft Editors" : "Stored Editors"}
                </span>
                {visibleProgramEditors.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_6" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_6_head">
                      <tr id="nogaPlanner_homeComponentsTable_6_row1">
                        <th id="nogaPlanner_homeComponentsTable_6_th_Editor">Editor</th>
                        {programEditorsEditorOpen ? <th id="nogaPlanner_programEditors_th_actions">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_6_body">
                      {visibleProgramEditors.map((editorValue) => (
                        <tr id={`nogaPlanner_editor_row_${editorValue}`} key={editorValue}>
                          <td id={`nogaPlanner_editor_${editorValue}_name`}>{editorValue}</td>
                          {programEditorsEditorOpen ? (
                            <td id={`nogaPlanner_editor_${editorValue}_actions`}>
                              <button
                                id="nogaPlanner_home_button_editor_edit"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeProgramEditorDraftEntry(
                                    editorValue,
                                  )
                                }
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_home_button_editor_remove"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeProgramEditorDraftEntry(
                                    editorValue,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_6" className="nogaPlanner_homePanelCardEmptyValue">
                    {programEditorsEditorOpen
                      ? "Add at least one editor."
                      : "No stored editors"}
                  </span>
                )}
              </div>
            </div>
            <div
              id="nogaPlanner_home_programLocations_card"
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_14" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_programLocations">Program locations</strong>
                <div id="nogaPlanner_homePanelCardActions_14" className="nogaPlanner_homePanelCardActions">
                  {programLocationsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_locations_submit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramLocations}
                      onClick={this.handleHomeProgramLocationsSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_home_button_locations_setEdit"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeProgramLocationsSetEditorOpen: true,
                          homeProgramLocationBuildingInput: "",
                          homeProgramLocationRoomInputs: {},
                          homeProgramLocationsDraftList: registeredProgramLocations,
                        })
                      }
                    >
                      {registeredProgramLocations.length > 0 ? "Edit" : "Set"}
                    </button>
                  )}
                  {programLocationsEditorOpen ? (
                    <button
                      id="nogaPlanner_home_button_locations_cancel"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeProgramLocationsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {programLocationsEditorOpen ? (
                <div id="nogaPlanner_homeIntervalsMiniForm_6" className="nogaPlanner_homeIntervalsMiniForm">
                  <div id="nogaPlanner_homeIntervalsAddRow_7" className="nogaPlanner_homeIntervalsAddRow">
                    <input
                      id="nogaPlanner_homeIntervalsInput_22"
                      type="text"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="Building"
                      disabled={isHomeCardsLocked}
                      value={String(
                        this.state?.homeProgramLocationBuildingInput || "",
                      )}
                      onChange={(event) =>
                        this.setState({
                          homeProgramLocationBuildingInput: String(
                            event.target.value || "",
                          ),
                        })
                      }
                    />
                    <button
                      id="nogaPlanner_home_button_location_add"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeProgramLocationDraftEntry}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
              <div id="nogaPlanner_homePanelCardStoredBlock_6" className="nogaPlanner_homePanelCardStoredBlock">
                <span id="nogaPlanner_homePanelCardStoredLabel_6" className="nogaPlanner_homePanelCardStoredLabel">
                  {programLocationsEditorOpen ? "Draft Locations" : "Stored Locations"}
                </span>
                {visibleProgramLocationsByBuilding.length > 0 ? (
                  <table id="nogaPlanner_homeComponentsTable_7" className="nogaPlanner_homeComponentsTable">
                    <thead id="nogaPlanner_homeComponentsTable_7_head">
                      <tr id="nogaPlanner_homeComponentsTable_7_row1">
                        <th id="nogaPlanner_homeComponentsTable_7_th_Building">Building</th>
                        <th id="nogaPlanner_homeComponentsTable_7_th_Rooms">Rooms</th>
                        {programLocationsEditorOpen ? <th id="nogaPlanner_programLocations_th_actions">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeComponentsTable_7_body">
                      {visibleProgramLocationsByBuilding.map((locationEntry) => (
                        <tr id={`nogaPlanner_location_row_${locationEntry.building}`} key={locationEntry.building}>
                          <td id={`nogaPlanner_location_${locationEntry.building}_building`}>{this.formatPlannerTableValue(locationEntry.building)}</td>
                          <td id={`nogaPlanner_location_${locationEntry.building}_rooms`}>
                            {Array.isArray(locationEntry.rooms) && locationEntry.rooms.length > 0 ? (
                              programLocationsEditorOpen ? (
                                <ul id={`nogaPlanner_location_${locationEntry.building}_roomsList`} className="nogaPlanner_locationRoomsList">
                                  {locationEntry.rooms.map((room) => (
                                    <li key={room} id={`nogaPlanner_location_${locationEntry.building}_room_${room}`} className="nogaPlanner_locationRoomsListItem">
                                      <span>{room}</span>
                                      <button
                                        id={`nogaPlanner_home_button_location_removeRoom_${locationEntry.building}_${room}`}
                                        type="button"
                                        className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                        disabled={isHomeCardsLocked}
                                        onClick={() =>
                                          this.setState((prev) => ({
                                            homeProgramLocationsDraftList: (
                                              Array.isArray(prev?.homeProgramLocationsDraftList)
                                                ? prev.homeProgramLocationsDraftList
                                                : []
                                            ).map((e) =>
                                              String(e?.building || "").trim() === locationEntry.building
                                                ? { ...e, rooms: (Array.isArray(e.rooms) ? e.rooms : []).filter((r) => r !== room) }
                                                : e
                                            ),
                                          }))
                                        }
                                      >
                                        ×
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : locationEntry.rooms.join(", ")
                            ) : ""}
                            {programLocationsEditorOpen ? (
                              <div id={`nogaPlanner_location_${locationEntry.building}_addRoom`} className="nogaPlanner_locationAddRoomRow">
                                <input
                                  id={`nogaPlanner_homeIntervalsInput_addRoom_${locationEntry.building}`}
                                  type="text"
                                  className="nogaPlanner_homeIntervalsInput"
                                  placeholder="Add room"
                                  disabled={isHomeCardsLocked}
                                  value={String(
                                    (this.state?.homeProgramLocationRoomInputs &&
                                      this.state.homeProgramLocationRoomInputs[locationEntry.building]) || "",
                                  )}
                                  onChange={(event) =>
                                    this.setState((prev) => ({
                                      homeProgramLocationRoomInputs: {
                                        ...(prev?.homeProgramLocationRoomInputs || {}),
                                        [locationEntry.building]: String(event.target.value || ""),
                                      },
                                    }))
                                  }
                                />
                                <button
                                  id={`nogaPlanner_home_button_location_addRoom_${locationEntry.building}`}
                                  type="button"
                                  className="nogaPlanner_homePanelCardSetBtn"
                                  disabled={isHomeCardsLocked || !String(
                                    (this.state?.homeProgramLocationRoomInputs &&
                                      this.state.homeProgramLocationRoomInputs[locationEntry.building]) || "",
                                  ).trim()}
                                  onClick={() =>
                                    this.appendRoomToLocationDraftEntry(
                                      locationEntry.building,
                                      (this.state?.homeProgramLocationRoomInputs &&
                                        this.state.homeProgramLocationRoomInputs[locationEntry.building]) || "",
                                    )
                                  }
                                >
                                  Add room
                                </button>
                              </div>
                            ) : null}
                          </td>
                          {programLocationsEditorOpen ? (
                            <td id={`nogaPlanner_location_${locationEntry.building}_actions`}>
                              <button
                                id={`nogaPlanner_home_button_location_remove_${locationEntry.building}`}
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.removeHomeProgramLocationDraftEntry(
                                    locationEntry,
                                  )
                                }
                              >
                                Remove
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span id="nogaPlanner_homePanelCardEmptyValue_7" className="nogaPlanner_homePanelCardEmptyValue">
                    {programLocationsEditorOpen
                      ? "Add at least one location."
                      : "No stored locations"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div id="nogaPlanner_homePanelColumn_2" className="nogaPlanner_homePanelColumn nogaPlanner_homePanelColumn--right">
            <div
              id="nogaPlanner_home_intervals_card"
              className={
                "nogaPlanner_homePanelCard nogaPlanner_homePanelCard--intervals" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
              style={
                activeHomePanelModeTab === "intervals"
                  ? undefined
                  : { display: "none" }
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_15" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_intervals">Intervals & Tries</strong>
                <div id="nogaPlanner_homePanelCardActions_15" className="nogaPlanner_homePanelCardActions">
                  {intervalEditorOpen ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitIntervals}
                      onClick={this.addHomeTableInterval}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_2"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeIntervalToolbarOpen: true,
                          homeExpectedIntervalsGenerated: false,
                          homeIntervalStatusDrafts: {},
                        });
                      }}
                      >
                      {intervalsHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  <button
                    id="nogaPlanner_homePanelCardSetBtn_5"
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                    disabled={homeIntervalsPreview.length === 0}
                    onClick={() =>
                      this.requestResetWithPassword(
                        "Reset All Intervals",
                        () => this.deleteAllHomeIntervals(),
                      )
                    }
                  >
                    Reset
                  </button>
                  {intervalEditorOpen ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_3"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeIntervalsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                  {this.state?.homeIntervalToolbarOpen ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_4"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={
                        isHomeCardsLocked || !isHomeIntervalGeneratorReady
                      }
                      onClick={() =>
                        this.setState({
                          homeExpectedIntervalsGenerated: true,
                        })
                      }
                    >
                      Generate Expected intervals
                    </button>
                  ) : null}
                </div>
              </div>
              <div id="nogaPlanner_homeIntervalsDangerRow" className="nogaPlanner_homeIntervalsDangerRow">
                {hasPreviewIntervals ? (
                  <div className="nogaPlanner_homeIntervalsDangerRowFields">
                    <div className="nogaPlanner_homeIntervalsMiniFormField">
                      <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Interval №</span>
                      <select
                        id="nogaPlanner_homeIntervalsSelect_generatedIntervalNum"
                        className="nogaPlanner_homeIntervalsInput"
                        value={homeGeneratedIntervalNumSelectValue}
                        onChange={(event) =>
                          setGeneratedIntervalDraftFromSelection({
                            intervalNum: event.target.value,
                            intervalTryNum: "",
                            subIntervalNum: "",
                          })
                        }
                      >
                        <option value="">Interval №</option>
                        {homeGeneratedIntervalNumOptions.map((n) => (
                          <option key={`nogaPlanner_homeGeneratedIntervalNumOption_${n}`} value={String(n)}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nogaPlanner_homeIntervalsMiniFormField">
                      <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Interval Try №</span>
                      <select
                        id="nogaPlanner_homeIntervalsSelect_generatedIntervalTryNum"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={!homeGeneratedIntervalNumSelectValue}
                        value={homeGeneratedIntervalTryNumSelectValue}
                        onChange={(event) =>
                          setGeneratedIntervalDraftFromSelection({
                            intervalNum: homeGeneratedIntervalNumSelectValue,
                            intervalTryNum: event.target.value,
                            subIntervalNum: "",
                          })
                        }
                      >
                        <option value="">Try №</option>
                        {homeGeneratedIntervalTryOptions.map((n) => (
                          <option key={`nogaPlanner_homeGeneratedIntervalTryNumOption_${n}`} value={String(n)}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nogaPlanner_homeIntervalsMiniFormField">
                      <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">subInterval №</span>
                      <select
                        id="nogaPlanner_homeIntervalsSelect_generatedSubIntervalNum"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={!homeGeneratedIntervalTryNumSelectValue}
                        value={homeGeneratedSubIntervalNumSelectValue}
                        onChange={(event) =>
                          setGeneratedIntervalDraftFromSelection({
                            intervalNum: homeGeneratedIntervalNumSelectValue,
                            intervalTryNum: homeGeneratedIntervalTryNumSelectValue,
                            subIntervalNum: event.target.value,
                          })
                        }
                      >
                        <option value="">subInterval №</option>
                        {homeGeneratedSubIntervalNumOptions.map((n) => (
                          <option key={`nogaPlanner_homeGeneratedSubIntervalNumOption_${n}`} value={String(n)}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nogaPlanner_homeIntervalsMiniFormField">
                      <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Start Date</span>
                      <div className="nogaPlanner_homeIntervalsDatePair">
                        <select
                          id="nogaPlanner_homeIntervalsSelect_generatedStartMonth"
                          className="nogaPlanner_homeIntervalsInput"
                          value={homeGeneratedStartDateMonthDraftValue}
                          onChange={(event) =>
                            this.setState({ homeGeneratedStartDateMonthDraft: String(event.target.value || "").trim() })
                          }
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, index) => {
                            const monthNumber = String(index + 1).padStart(2, "0");
                            return (
                              <option key={`nogaPlanner_homeGeneratedStartMonthOption_${monthNumber}`} value={monthNumber}>
                                {monthNumber}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          id="nogaPlanner_homeIntervalsSelect_generatedStartDay"
                          className="nogaPlanner_homeIntervalsInput"
                          value={homeGeneratedStartDateDayDraftValue}
                          onChange={(event) =>
                            this.setState({ homeGeneratedStartDateDayDraft: String(event.target.value || "").trim() })
                          }
                        >
                          <option value="">DD</option>
                          {Array.from({ length: 31 }, (_, index) => {
                            const dayNumber = String(index + 1).padStart(2, "0");
                            return (
                              <option key={`nogaPlanner_homeGeneratedStartDayOption_${dayNumber}`} value={dayNumber}>
                                {dayNumber}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="nogaPlanner_homeIntervalsMiniFormField">
                      <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">End Date</span>
                      <div className="nogaPlanner_homeIntervalsDatePair">
                        <select
                          id="nogaPlanner_homeIntervalsSelect_generatedEndMonth"
                          className="nogaPlanner_homeIntervalsInput"
                          value={homeGeneratedEndDateMonthDraftValue}
                          onChange={(event) =>
                            this.setState({ homeGeneratedEndDateMonthDraft: String(event.target.value || "").trim() })
                          }
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, index) => {
                            const monthNumber = String(index + 1).padStart(2, "0");
                            return (
                              <option key={`nogaPlanner_homeGeneratedEndMonthOption_${monthNumber}`} value={monthNumber}>
                                {monthNumber}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          id="nogaPlanner_homeIntervalsSelect_generatedEndDay"
                          className="nogaPlanner_homeIntervalsInput"
                          value={homeGeneratedEndDateDayDraftValue}
                          onChange={(event) =>
                            this.setState({ homeGeneratedEndDateDayDraft: String(event.target.value || "").trim() })
                          }
                        >
                          <option value="">DD</option>
                          {Array.from({ length: 31 }, (_, index) => {
                            const dayNumber = String(index + 1).padStart(2, "0");
                            return (
                              <option key={`nogaPlanner_homeGeneratedEndDayOption_${dayNumber}`} value={dayNumber}>
                                {dayNumber}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    <button
                      id="nogaPlanner_homeIntervalsSetMonthDayBtn"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={!homeGeneratedSelectedIntervalRow}
                      onClick={this.setHomeGeneratedIntervalMonthDay}
                    >
                      Set Month/Day
                    </button>
                  </div>
                ) : null}
              </div>
              <table id="nogaPlanner_homeIntervalsMiniTable_2" className="nogaPlanner_homeIntervalsMiniTable">
                <colgroup>
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead id="nogaPlanner_homeIntervalsMiniTable_2_head">
                  <tr id="nogaPlanner_homeIntervalsMiniTable_2_row1">
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_Interval_num" rowSpan={3}>Interval Number</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_Try_num" rowSpan={3}>Interval Try Number</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_sub-Interval_Try_Number" rowSpan={3}>sub-Interval Try Number</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_sub-Interval_Try_Dates" colSpan={6}>sub-Interval Try Dates</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_Interval_status" rowSpan={3}>Interval status</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_Interval_action" rowSpan={3}>Action</th>
                  </tr>
                  <tr id="nogaPlanner_homeIntervalsMiniTable_2_row1b">
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_sub-Interval_start" colSpan={3}>Start</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_sub-Interval_end" colSpan={3}>End</th>
                  </tr>
                  <tr id="nogaPlanner_homeIntervalsMiniTable_2_row1c">
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_start_year">Year</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_start_month">Month</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_start_day">Day</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_end_year">Year</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_end_month">Month</th>
                    <th id="nogaPlanner_homeIntervalsMiniTable_2_th_end_day">Day</th>
                  </tr>
                </thead>
                <tbody id="nogaPlanner_homeIntervalsMiniTable_2_body">
                  {homeIntervalsDisplayRows.length === 0 ? (
                    <tr id="nogaPlanner_homeIntervalsMiniTable_2_row2">
                      <td id="nogaPlanner_intervals_emptyCell" colSpan={11}>No intervals yet.</td>
                    </tr>
                  ) : (
                    homeIntervalsDisplayRows.map((intervalEntry, rowIndex) => {
                      const intervalDisplay = this.parseIntervalIdYearTerm(
                        intervalEntry?.subIntervalId ||
                          intervalEntry?.subintervalId ||
                          intervalEntry?.key,
                      );
                      const intervalYearGroupMeta =
                        intervalYearGroupMetaByRowIndex.get(rowIndex) || null;
                      const intervalStatusValue = String(
                        intervalYearGroupMeta?.intervalStatus ||
                          intervalEntry?.intervalStatus ||
                          "",
                      )
                        .trim()
                        .toLowerCase();
                      const rowIntervalNum = Number.parseInt(
                        String(intervalEntry?.intervalNum || "").trim(),
                        10,
                      ) || null;
                      const rowTryNum =
                        intervalTryGroupMetaByRowIndex.get(rowIndex)?.tryNum ||
                        Number.parseInt(
                          String(
                            intervalEntry?.subIntervalTryNum ??
                              intervalEntry?.intervalTryNum ??
                              "",
                          ).trim(),
                          10,
                        ) ||
                        null;
                      const isRegisteredCurrentIntervalTry =
                        Number.isFinite(
                          Number.parseInt(registeredCurrentIntervalNum, 10),
                        ) &&
                        Number.isFinite(
                          Number.parseInt(registeredCurrentIntervalTryNum, 10),
                        ) &&
                        rowIntervalNum ===
                          Number.parseInt(registeredCurrentIntervalNum, 10) &&
                        rowTryNum ===
                          Number.parseInt(registeredCurrentIntervalTryNum, 10);
                      const isCurrent =
                        isRegisteredCurrentIntervalTry ||
                        intervalStatusValue === "current" ||
                        (currentIntervalKey
                          ? currentIntervalKey === intervalEntry.key
                          : (intervalEntry.intervalNum || intervalEntry.year) === currentInterval &&
                            (intervalEntry.subIntervalNum || intervalEntry.term) === currentTerm);
                      return (
                        <tr
                          id={`nogaPlanner_interval_row_${intervalEntry.key}`}
                          key={`nogaPlanner_homeIntervalRow_${intervalEntry.key}`}
                          className={
                            (isCurrent ? "is-current" : "") +
                            (intervalEntry.isPreview ? " is-preview" : "") +
                            (intervalEntry.previewType === "unusual"
                              ? " is-manual-preview"
                              : "")
                          }
                        >
                          {intervalYearGroupMeta ? (
                            <td
                              id={`nogaPlanner_interval_${intervalEntry.key}_num`}
                              rowSpan={intervalYearGroupMeta.rowSpan}
                            >
                              {this.formatPlannerTableValue(
                                intervalYearGroupMeta?.intervalNum ??
                                  intervalEntry?.intervalNum,
                              )}
                            </td>
                          ) : null}
                          {(() => {
                            const tryGroupMeta = intervalTryGroupMetaByRowIndex.get(rowIndex);
                            return tryGroupMeta ? (
                              <td
                                id={`nogaPlanner_interval_${intervalEntry.key}_tryNum`}
                                rowSpan={tryGroupMeta.rowSpan}
                              >
                                {this.formatPlannerTableValue(tryGroupMeta.tryNum)}
                              </td>
                            ) : null;
                          })()}
                          <td id={`nogaPlanner_interval_${intervalEntry.key}_subNumber`}>
                            {this.formatPlannerTableValue(intervalEntry.subIntervalNum)}
                          </td>
                          {(() => {
                            const startParts = this.splitStudyPlanIsoDateParts(
                              this.getPlannerSubIntervalTryDates(intervalEntry).start,
                            );
                            const endParts = this.splitStudyPlanIsoDateParts(
                              this.getPlannerSubIntervalTryDates(intervalEntry).end,
                            );
                            return (
                              <>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_startYear`}>{this.formatPlannerTableValue(startParts.year)}</td>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_startMonth`}>{this.formatPlannerTableValue(startParts.month)}</td>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_startDay`}>{this.formatPlannerTableValue(startParts.day)}</td>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_endYear`}>{this.formatPlannerTableValue(endParts.year)}</td>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_endMonth`}>{this.formatPlannerTableValue(endParts.month)}</td>
                                <td id={`nogaPlanner_interval_${intervalEntry.key}_endDay`}>{this.formatPlannerTableValue(endParts.day)}</td>
                              </>
                            );
                          })()}
                          {intervalYearGroupMeta ? (() => {
                            const intervalKey =
                              intervalEntry?.key ||
                              this.getPlannerSubIntervalSchemaID(intervalEntry) ||
                              "";
                            const isPendingRetaking = this.state?.homeIntervalPendingRetakingKey === intervalKey;
                            const effectiveStatusValue = isPendingRetaking ? "failed" : intervalStatusValue;
                            const effectiveStatusDisplay = isPendingRetaking
                              ? "Failed"
                              : intervalStatusValue === "failed"
                                ? "Failed: Retaking"
                                : intervalStatusValue === "failedretook"
                                  ? "Failed: Retook"
                                  : intervalStatusValue === "passedretook"
                                    ? "Passed: Retook"
                                    : (intervalEntry?.intervalStatus || "Normal");
                            const btn = (label, onClick) => (
                              <button
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={onClick}
                              >
                                {label}
                              </button>
                            );
                            return (
                              <>
                                <td
                                  id={`nogaPlanner_interval_${intervalEntry.key}_status`}
                                  rowSpan={intervalYearGroupMeta.rowSpan}
                                >
                                  {effectiveStatusDisplay}
                                </td>
                                <td
                                  id={`nogaPlanner_interval_${intervalEntry.key}_action`}
                                  rowSpan={intervalYearGroupMeta.rowSpan}
                                >
                                  <div className="nogaPlanner_homeIntervalStatusCell">
                                    {/* Normal */}
                                    {effectiveStatusValue === "normal" || !effectiveStatusValue ? (<>
                                      {btn("Passed?", () => this.setHomeIntervalStatus(intervalEntry, "Passed"))}
                                      {btn("Failed?", () => this.setState({ homeIntervalPendingRetakingKey: intervalKey }))}
                                    </>) : null}

                                    {/* Passed */}
                                    {effectiveStatusValue === "passed" ? (
                                      btn("Reset to Normal", () => this.requestResetWithPassword("Reset to Normal", () => this.setHomeIntervalStatus(intervalEntry, "Normal")))
                                    ) : null}

                                    {/* Failed: Retaking (persisted or pending) */}
                                    {effectiveStatusValue === "failed" ? (<>
                                      {btn("Reset to Normal", () => this.requestResetWithPassword("Reset to Normal", () => {
                                        this.setState({ homeIntervalPendingRetakingKey: "" });
                                        if (!isPendingRetaking) this.setHomeIntervalStatus(intervalEntry, "Normal");
                                      }))}
                                      {isPendingRetaking
                                        ? btn("Retaking?", () => {
                                            this.setState({ homeIntervalPendingRetakingKey: "" });
                                            this.triggerHomeIntervalRetaking(
                                              this.getPlannerIntervalSchemaID(intervalEntry),
                                              this.getPlannerSubIntervalSchemaID(intervalEntry),
                                            );
                                          })
                                        : (<>
                                            {btn("Cancel Retaking", () => {
                                              this.setState({ homeIntervalPendingRetakingKey: "" });
                                              this.setHomeIntervalStatus(intervalEntry, "CancelRetaking");
                                            })}
                                            {btn("Passed?", () => this.setHomeIntervalStatus(intervalEntry, "PassedRetook"))}
                                            {btn("Failed?", () => this.setHomeIntervalStatus(intervalEntry, "FailedRetook"))}
                                          </>)
                                      }
                                    </>) : null}

                                    {/* Failed: Retook */}
                                    {effectiveStatusValue === "failedretook" ? (
                                      btn("Retake?", () => this.triggerHomeIntervalRetaking(
                                        this.getPlannerIntervalSchemaID(intervalEntry),
                                        this.getPlannerSubIntervalSchemaID(intervalEntry),
                                      ))
                                    ) : null}

                                    {/* Passed: Retook */}
                                    {effectiveStatusValue === "passedretook" ? (
                                      btn("Back to Normal", () => this.requestResetWithPassword("Back to Normal", () => this.setHomeIntervalStatus(intervalEntry, "Normal")))
                                    ) : null}

                                    {intervalEntry?.regular === false ? (
                                      <button
                                        type="button"
                                        className="nogaPlanner_homeIntervalsDeleteIconBtn"
                                        aria-label="Delete unusual sub interval"
                                        disabled={isHomeCardsLocked}
                                        onClick={() =>
                                          this.deleteHomeIntervalEntry(
                                            intervalEntry?.key ||
                                              intervalEntry?.subIntervalId ||
                                              intervalEntry?.intervalId,
                                          )
                                        }
                                      >
                                        <i className="fi fi-br-cross" aria-hidden="true" />
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </>
                            );
                          })() : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div
              id="nogaPlanner_home_materialMetadata_card"
              className={
                "nogaPlanner_homePanelCard nogaPlanner_homePanelCard--intervalCourses" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
              style={
                activeHomePanelModeTab === "intervals"
                  ? undefined
                  : { display: "none" }
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_17" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_materialMetadata">Material Metadata per sub-Interval</strong>
                <div id="nogaPlanner_homePanelCardActions_17" className="nogaPlanner_homePanelCardActions">
                  {!coursesEditorOpen && !examScheduleEditorOpen && materialMetadataMode === "course" ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_resetSubIntervalMaterial"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={() => this.requestResetWithPassword("Reset Material Metadata", this.handleResetSubIntervalMaterialMetadata)}
                    >
                      Reset
                    </button>
                  ) : null}
                  {coursesEditorOpen || examScheduleEditorOpen ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_13"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitMaterialMetadata}
                      onClick={this.handleHomeCoursesSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_14"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        materialMetadataMode === "exams"
                          ? this.setState({
                              homeCoursesEditorOpen: false,
                              homeCourseExamScheduleEditorOpen: true,
                              homeMaterialMetadataMode: "exams",
                              homeCourseExamDraftList: Array.isArray(
                                materialMetadataExamRows,
                              )
                                ? materialMetadataExamRows.map((entry) => ({
                                    ...entry,
                                    key: String(entry?.key || "").trim(),
                                  }))
                                : [],
                            })
                          : this.setState({
                              homeCoursesEditorOpen: true,
                              homeMaterialMetadataMode: materialMetadataMode,
                              homeCourseExamScheduleEditorOpen: false,
                              homeCourseEditingKey: "",
                              homeCourseOriginalId: "",
                              homeCourseOriginalIntervalId: "",
                              homeCourseOriginalCourseNum: "",
                              homeCourseOriginalComponentClass: "",
                              homeCourseOriginalLectureNum: "",
                              homeCourseDraftList: Array.isArray(
                                this.state?.homeCourseDraftList,
                              )
                                ? this.state.homeCourseDraftList
                                : [],
                              homeCourseLectureDraftList: Array.isArray(
                                this.state?.homeCourseLectureDraftList,
                              )
                                ? this.state.homeCourseLectureDraftList
                                : [],
                              homeCourseNameDraft: "",
                              homeCourseIdDraft: "",
                              homeCourseCodeDraft: "",
                              homeCourseComponentDraft: [],
                              homeCourseComponentEditingId: "",
                              homeCourseTotalWeightDraft: "",
                              homeCourseSubIntervalYearDraft: "",
                              homeCourseSubIntervalTermDraft: "",
                              homeCourseComponentIdDraft: "",
                              homeCourseComponentPartialWeightDraft: "",
                              homeCourseComponentStatusDraft: "",
                              homeCourseIntervalIdDraft: "",
                              homeCourseLectureCourseContextDraft: "",
                              homeCourseLectureNameDraft: "",
                              homeCourseLectureInstructorsDraft: "",
                              homeCourseLectureInstructionDateDraft: "",
                              homeCourseLectureCourseNameDraft: "",
                              homeCourseExamDraftList: Array.isArray(
                                this.state?.homeCourseExamDraftList,
                              )
                                ? this.state.homeCourseExamDraftList
                                : [],
                              homeCourseExamComponentIdDraft: "",
                              homeCourseExamClassDraft: "",
                              homeCourseExamDateDraft: "",
                              homeCourseExamTimeDraft: "",
                              homeCourseExamLocationBuildingDraft: "",
      homeCourseExamLocationRoomDraft: "",
                              homeCourseExamWeightDraft: "",
                                                      homeCourseExamGradeDraft: "",
                            })
                      }
                    >
                      {materialMetadataMode === "lectures"
                        ? materialMetadataLectureRows.length > 0
                          ? "Edit"
                          : "Set"
                        : materialMetadataMode === "exams"
                          ? materialMetadataExamRows.length > 0
                            ? "Edit"
                            : "Set"
                          : homeCourseNamesPerSubIntervalRows.length > 0
                            ? "Edit"
                            : "Set"}
                    </button>
                  )}
                  {coursesEditorOpen || examScheduleEditorOpen ? (
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_15"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeCoursesEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              <div
                id="nogaPlanner_home_materialMetadata_modeRow"
              >
                <button
                  id="nogaPlanner_homePanelCardSetBtn_11"
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn"
                  disabled={isHomeCardsLocked}
                  onClick={() =>
                    this.setState({
                      homeMaterialMetadataMode: "course",
                    })
                  }
                >
                  Course Info
                </button>
                <button
                  id="nogaPlanner_homePanelCardSetBtn_11b"
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn"
                  disabled={isHomeCardsLocked}
                  onClick={() =>
                    this.setState({
                      homeMaterialMetadataMode: "exams",
                    })
                  }
                >
                  Exam Info
                </button>
                <button
                  id="nogaPlanner_homePanelCardSetBtn_12"
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn"
                  disabled={isHomeCardsLocked}
                  onClick={() =>
                    this.setState({
                      homeMaterialMetadataMode: "lectures",
                    })
                  }
                >
                  Lectures Info
                </button>
              </div>
              <div id="nogaPlanner_homePanelCardBody_2" className="nogaPlanner_homePanelCardBody">
                {coursesEditorOpen ? (
                  <div id="nogaPlanner_homeIntervalsMiniForm_7" className="nogaPlanner_homeIntervalsMiniForm nogaPlanner_homeIntervalCoursesForm">
                    {materialMetadataMode === "course" ? (
                      <>
                        <div
                          id="nogaPlanner_homeIntervalsMiniFormRow"
                        >
                          <div id="nogaPlanner_homeIntervalsMiniFormFields_course">
                            <div id="nogaPlanner_homeIntervalsMiniFormField_14" className="nogaPlanner_homeIntervalsMiniFormField">
                              <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_16" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                sub-Interval ID
                              </span>
                              <select
                                id="nogaPlanner_homeIntervalsInput_31"
                                name="homeCourseSubIntervalMini"
                                className="nogaPlanner_homeIntervalsInput"
                                disabled={isHomeCardsLocked}
                                value={courseIntervalDraftValue}
                                onChange={(event) => {
                                  const nextIntervalId = String(
                                    event.target.value || "",
                                  ).trim();
                                  const parsedInterval =
                                    this.parseIntervalIdYearTerm(nextIntervalId);
                                  this.setState({
                                    homeCourseIntervalIdDraft: nextIntervalId,
                                    homeCourseSubIntervalYearDraft: String(
                                      parsedInterval?.year || "",
                                    ).trim(),
                                    homeCourseSubIntervalTermDraft: String(
                                      parsedInterval?.term || "",
                                    ).trim(),
                                  });
                                }}
                              >
                                <option value="">Select sub-Interval ID</option>
                                {homeCurrentIntervalOptions.map((intervalOption) => (
                                  <option
                                    key={`nogaPlanner_homeCourseSubIntervalMini_${intervalOption.value}`}
                                    value={intervalOption.value}
                                  >
                                    {intervalOption.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div id="nogaPlanner_homeIntervalsMiniFormField_9" className="nogaPlanner_homeIntervalsMiniFormField">
                              <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_11" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                Course name
                              </span>
                              <select
                                id="nogaPlanner_homeIntervalsInput_26"
                                name="homeCourseNameMini"
                                className="nogaPlanner_homeIntervalsInput"
                                disabled={isHomeCardsLocked}
                                value={String(this.state?.homeCourseNameDraft || "")}
                                onChange={(event) => {
                                  const nextCourseName = String(event.target.value || "");
                                  const registryMatch = registeredProgramCoursesNames.find(
                                    (c) => String(c?.courseName || "").trim() === nextCourseName,
                                  );
                                  const matchedCourse = this.resolvePlannerCourseDraft({
                                    courseName: nextCourseName,
                                    courseCode: String(registryMatch?.courseCode || this.state?.homeCourseCodeDraft || "").trim(),
                                  });
                                  this.setState({
                                    homeCourseNameDraft: nextCourseName,
                                    homeCourseIdDraft: String(matchedCourse?._id || "").trim(),
                                    homeCourseCodeDraft: String(
                                      registryMatch?.courseCode ||
                                        matchedCourse?.course_code ||
                                        matchedCourse?.code ||
                                        "",
                                    ).trim(),
                                  });
                                }}
                              >
                                <option value="">Course name</option>
                                {registeredProgramCoursesNames.map((c, i) => (
                                  <option key={i} value={String(c?.courseName || "").trim()}>
                                    {String(c?.courseName || "").trim()}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div id="nogaPlanner_homeIntervalsMiniFormField_10" className="nogaPlanner_homeIntervalsMiniFormField">
                              <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_12" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                Course code
                              </span>
                              <input
                                id="nogaPlanner_homeIntervalsInput_27"
                                type="text"
                                name="homeCourseCodeMini"
                                className="nogaPlanner_homeIntervalsInput nogaPlanner_homeIntervalsInput--readonly"
                                placeholder="Course code"
                                readOnly
                                value={String(this.state?.homeCourseCodeDraft || "")}
                                onChange={(event) => {
                                  const nextCourseCode = String(
                                    event.target.value || "",
                                  );
                                  const matchedCourse = this.resolvePlannerCourseDraft({
                                    courseName: String(
                                      this.state?.homeCourseNameDraft || "",
                                    ).trim(),
                                    courseCode: nextCourseCode,
                                  });
                                  this.setState((previousState) => ({
                                    homeCourseCodeDraft: nextCourseCode,
                                    homeCourseIdDraft: String(
                                      matchedCourse?._id || "",
                                    ).trim(),
                                    homeCourseNameDraft:
                                      String(previousState?.homeCourseNameDraft || "") ||
                                      String(
                                        matchedCourse?.course_name ||
                                          matchedCourse?.name ||
                                          "",
                                      ).trim(),
                                  }));
                                }}
                              />
                            </div>
                            <div id="nogaPlanner_homeIntervalsMiniFormField_11" className="nogaPlanner_homeIntervalsMiniFormField">
                              <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_13" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                Course weight
                              </span>
                              <input
                                id="nogaPlanner_homeIntervalsInput_28"
                                type="number"
                                name="homeCourseWeightMini"
                                className="nogaPlanner_homeIntervalsInput"
                                placeholder="Course weight"
                                disabled={isHomeCardsLocked}
                                value={String(this.state?.homeCourseTotalWeightDraft || "")}
                                onChange={(event) =>
                                  this.setState({
                                    homeCourseTotalWeightDraft: String(
                                      event.target.value || "",
                                    ),
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div id="nogaPlanner_homeIntervalsMiniFormFields_component">
                            <div id="nogaPlanner_homeIntervalsMiniFormFields_componentInputs">
                              <div id="nogaPlanner_homeIntervalsMiniFormField_12" className="nogaPlanner_homeIntervalsMiniFormField">
                                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_14" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                  Course component
                                </span>
                                <select
                                  id="nogaPlanner_homeIntervalsInput_29"
                                  name="homeCourseComponentMini"
                                  className="nogaPlanner_homeIntervalsInput"
                                  disabled={isHomeCardsLocked}
                                  value={courseComponentIdDraftValue}
                                  onChange={(event) =>
                                    this.setState({
                                      homeCourseComponentIdDraft: String(
                                        event.target.value || "",
                                      ).trim(),
                                    })
                                  }
                                >
                                  <option value="">Select component</option>
                                  {courseComponentOptions.map((componentId) => (
                                    <option
                                      key={`nogaPlanner_homeCourseComponentMini_${componentId}`}
                                      value={componentId}
                                    >
                                      {componentId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div id="nogaPlanner_homeIntervalsMiniFormField_13" className="nogaPlanner_homeIntervalsMiniFormField">
                                <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_15" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                  Component weight %
                                </span>
                                <input
                                  id="nogaPlanner_homeIntervalsInput_30"
                                  type="number"
                                  name="homeCourseComponentPartialWeightMini"
                                  className="nogaPlanner_homeIntervalsInput"
                                  placeholder="Component weight %"
                                  disabled={isHomeCardsLocked}
                                  value={String(
                                    this.state?.homeCourseComponentPartialWeightDraft || "",
                                  )}
                                  onChange={(event) =>
                                    this.setState({
                                      homeCourseComponentPartialWeightDraft: String(
                                        event.target.value || "",
                                      ),
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div id="nogaPlanner_homeCourseStagedComponentsWrapper">
                              <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_components" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                                Components
                              </span>
                              <ul id="nogaPlanner_homeCourseStagedComponentsList">
                                {courseComponentDraftValues.map((component) => (
                                  <li
                                    id={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}`}
                                    key={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}`}
                                    className="nogaPlanner_homeCourseStagedComponentItem"
                                  >
                                    <span id={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}_name`}>
                                      {component.componentId}
                                    </span>
                                    <span id={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}_weight`}>
                                      {component.componentWeightPercentage || component.componentPartialWeight}%
                                    </span>
                                    <button
                                      id={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}_edit`}
                                      type="button"
                                      className="nogaPlanner_homePanelCardSetBtn"
                                      aria-label={`Edit ${component.componentId}`}
                                      disabled={isHomeCardsLocked}
                                      onClick={() => this.editHomeCourseComponentDraftEntry(component)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      id={`nogaPlanner_homeCourseStagedComponentItem_${component.componentId}_delete`}
                                      type="button"
                                      className="nogaPlanner_homeIntervalsDeleteIconBtn"
                                      aria-label={`Remove ${component.componentId}`}
                                      disabled={isHomeCardsLocked}
                                      onClick={() => this.removeHomeCourseComponentDraftEntry(component.componentId)}
                                    >
                                      <i className="fi fi-br-cross" aria-hidden="true" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <button
                                id="nogaPlanner_homePanelCardSetBtn_16"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked || !canAddCourseComponentDraft}
                                onClick={this.appendHomeCourseComponentDraftEntry}
                              >
                                {courseComponentEditingId ? "Edit component" : "Add component"}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          id="nogaPlanner_homePanelCardSetBtn_16b"
                          type="button"
                          className="nogaPlanner_homePanelCardSetBtn"
                          disabled={isHomeCardsLocked || (courseEditingKey ? !hasDraftChanges : !canAddGlobalCourse)}
                          onClick={courseEditingKey ? this.queueHomeCourseEditDraft : this.addHomeCourseWithStagedComponents}
                        >
                          {courseEditingKey ? "Apply changes" : "Add"}
                        </button>
                      </>
                    ) : materialMetadataMode === "lectures" ? (
                      <>
                        <div id="nogaPlanner_homeIntervalsMiniFormField_15" className="nogaPlanner_homeIntervalsMiniFormField">
                          <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_17" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                            Component ID
                          </span>
                          <select
                            id="nogaPlanner_homeIntervalsInput_32"
                            name="homeCourseLectureCourseContextMini"
                            className="nogaPlanner_homeIntervalsInput"
                            disabled={isHomeCardsLocked}
                            value={lectureCourseContextDraftValue}
                            onChange={(event) => {
                              const nextKey = String(
                                event.target.value || "",
                              ).trim();
                              const selectedOption =
                                event.target.selectedOptions?.[0] || null;
                              const selectedLabel = String(
                                selectedOption?.textContent || "",
                              ).trim();
                              const parsedLabel = selectedLabel.match(
                                /^(.*)\s+\((.*)\)$/,
                              );
                              this.setState({
                                homeCourseLectureCourseContextDraft: nextKey,
                                homeCourseLectureCourseNameDraft: parsedLabel
                                  ? String(parsedLabel[1] || "").trim()
                                  : selectedLabel.replace(/\s+\([^)]*\)$/, "").trim(),
                              });
                            }}
                          >
                            <option value="">Select Component ID</option>
                            {materialMetadataCourseRows.map((courseRow) => (
                              <option
                                key={`nogaPlanner_homeCourseLectureCourseContextMini_${courseRow.key}`}
                                value={courseRow.key}
                              >
                                {this.formatPlannerTableValue(courseRow.courseName)} ({this.formatPlannerTableValue(courseRow.componentID || courseRow.courseComponent)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div id="nogaPlanner_homeIntervalsMiniFormField_16" className="nogaPlanner_homeIntervalsMiniFormField">
                          <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_18" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                            Lecture name
                          </span>
                          <input
                            id="nogaPlanner_homeIntervalsInput_33"
                            type="text"
                            name="homeCourseLectureNameMini"
                            className="nogaPlanner_homeIntervalsInput"
                            placeholder="Lecture name"
                            disabled={isHomeCardsLocked}
                            value={lectureNameDraftValue}
                            onChange={(event) =>
                              this.setState({
                                homeCourseLectureNameDraft: String(
                                  event.target.value || "",
                                ),
                              })
                            }
                          />
                        </div>
                        <div id="nogaPlanner_homeIntervalsMiniFormField_17" className="nogaPlanner_homeIntervalsMiniFormField">
                          <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_19" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                            Lecture Instructor
                          </span>
                          <select
                            id="nogaPlanner_homeIntervalsInput_34"
                            name="homeCourseLectureInstructorMini"
                            className="nogaPlanner_homeIntervalsInput"
                            disabled={isHomeCardsLocked}
                            value={lectureInstructorDraftValue}
                            onChange={(event) =>
                              this.setState({
                                homeCourseLectureInstructorsDraft: String(
                                  event.target.value || "",
                                ).trim(),
                              })
                            }
                          >
                            <option value="">Select instructor</option>
                            {materialMetadataProgramInstructors.map((entry) => (
                              <option
                                key={`nogaPlanner_homeCourseLectureInstructorMini_${entry}`}
                                value={entry}
                              >
                                {entry}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          id="nogaPlanner_homePanelCardSetBtn_17"
                          type="button"
                          className="nogaPlanner_homePanelCardSetBtn"
                          disabled={
                            isHomeCardsLocked ||
                            !Boolean(
                              lectureCourseContextDraftValue &&
                                lectureNameDraftValue &&
                                lectureInstructorDraftValue,
                            )
                          }
                          onClick={this.appendHomeCourseLectureDraftEntry}
                        >
                          Add
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {materialMetadataMode === "course" &&
                materialMetadataCourseRows.length === 0 &&
                !coursesEditorOpen ? (
                  <span id="nogaPlanner_homePanelCardEmptyValue_8" className="nogaPlanner_homePanelCardEmptyValue">
                    No course info mapped to sub-Intervals yet.
                  </span>
                ) : null}
                {materialMetadataMode === "lectures" &&
                materialMetadataLectureRows.length === 0 ? (
                  <span id="nogaPlanner_homePanelCardEmptyValue_9" className="nogaPlanner_homePanelCardEmptyValue">
                    No lectures info saved yet.
                  </span>
                ) : null}
                {materialMetadataMode === "course" && liveMetadataCourseRows.length > 0 ? (
                  <table id="nogaPlanner_homeIntervalsMiniTable_6" className="nogaPlanner_homeIntervalsMiniTable nogaPlanner_homeIntervalCoursesMiniTable">
                    <thead id="nogaPlanner_homeIntervalsMiniTable_6_head">
                      <tr id="nogaPlanner_homeIntervalsMiniTable_6_row1">
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Course_ID">Course ID</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Course_name">Course name (Course code)</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Course_weight">Course weight</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Component_ID">Component ID</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Course_component">Course component</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Component_weight">Component weight %</th>
                        {coursesEditorOpen ? (
                          <th id="nogaPlanner_homeIntervalsMiniTable_6_th_Actions">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeIntervalsMiniTable_6_body">
                      {liveMetadataCourseRows.map((intervalEntry, rowIndex) => {
                        const rowSpan = materialMetadataCourseGroupByIndex.get(rowIndex);
                        const isGroupFirst = rowSpan !== undefined;
                        return (
                          <tr
                            id={`nogaPlanner_materialMetadata_row_${intervalEntry.key}`}
                            key={`nogaPlanner_homeIntervalCourseNames_${intervalEntry.key}`}
                            className={intervalEntry.isPreview ? "is-preview" : undefined}
                          >
                            {isGroupFirst ? (
                              <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_courseId`} rowSpan={rowSpan}>{intervalEntry.courseID}</td>
                            ) : null}
                            {isGroupFirst ? (
                              <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_courseName`} rowSpan={rowSpan}>
                                {this.formatPlannerTableValue(intervalEntry.courseName)}
                                {this.formatPlannerTableValue(intervalEntry.courseCode)
                                  ? ` (${this.formatPlannerTableValue(intervalEntry.courseCode)})`
                                  : ""}
                              </td>
                            ) : null}
                            {isGroupFirst ? (
                              <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_courseWeight`} rowSpan={rowSpan}>{this.formatPlannerTableValue(intervalEntry.courseWeight)}</td>
                            ) : null}
                            <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_componentID`}>
                              {this.formatPlannerTableValue(intervalEntry.componentID)}
                            </td>
                            <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_courseComponent`}>{this.formatPlannerTableValue(intervalEntry.courseComponent)}</td>
                            <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_componentWeight`}>
                              {this.formatPlannerComponentWeightValue(intervalEntry.componentWeight)}
                            </td>
                            {coursesEditorOpen ? (
                              <td id={`nogaPlanner_materialMetadata_${intervalEntry.key}_actions`}>
                                <div id={`nogaPlanner_materialMetadata_rowActions_${intervalEntry.key}`} className="nogaPlanner_homeIntervalRowActions">
                                  <button
                                    id="nogaPlanner_homePanelCardSetBtn_18"
                                    type="button"
                                    className="nogaPlanner_homePanelCardSetBtn"
                                    onClick={() => this.editHomeCourseEntry(intervalEntry)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    id="nogaPlanner_homeIntervalsDeleteIconBtn_2"
                                    type="button"
                                    className="nogaPlanner_homeIntervalsDeleteIconBtn"
                                    aria-label="Delete material metadata row"
                                    onClick={() => this.deleteHomeCourseEntry(intervalEntry)}
                                  >
                                    <i className="fi fi-br-cross" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
                {materialMetadataMode === "lectures" &&
                (materialMetadataLectureRows.length > 0 || homeCourseLectureCurrentDraftRow || homeCourseLectureDraftRows.length > 0) ? (
                  <table id="nogaPlanner_homeIntervalsMiniTable_7" className="nogaPlanner_homeIntervalsMiniTable nogaPlanner_homeIntervalCoursesMiniTable">
                    <thead id="nogaPlanner_homeIntervalsMiniTable_7_head">
                      <tr id="nogaPlanner_homeIntervalsMiniTable_7_row1">
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Lecture_ID">Lecture ID</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Course_ID">Component ID</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Course_name">Course name</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Lecture_num">Lecture num</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Lecture_name">Lecture name</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Lecture_Instructor">Lecture Instructor</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_7_th_Actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeIntervalsMiniTable_7_body">
                      {materialMetadataLectureRows.map((lectureEntry) => (
                        <tr id={`nogaPlanner_lectureInfo_row_${lectureEntry.key}`} key={`nogaPlanner_homeIntervalLectureInfo_${lectureEntry.key}`}>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_lectureID`}>{this.formatPlannerTableValue(lectureEntry.lectureID)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_courseId`}>{this.formatPlannerTableValue(lectureEntry.componentID || lectureEntry.courseComponent || lectureEntry.courseID)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_courseName`}>{this.formatPlannerTableValue(lectureEntry.courseName)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_lectureNum`}>{this.formatPlannerTableValue(lectureEntry.lectureNum)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_lectureName`}>{this.formatPlannerTableValue(lectureEntry.lectureName)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_instructor`}>{this.formatPlannerTableValue(lectureEntry.lectureInstructor)}</td>
                          <td id={`nogaPlanner_lectureInfo_${lectureEntry.key}_actions`}>
                            <div id={`nogaPlanner_lectureInfo_rowActions_${lectureEntry.key}`} className="nogaPlanner_homeIntervalRowActions">
                              <button
                                id="nogaPlanner_homePanelCardSetBtn_19"
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() => this.editHomeLectureInfoEntry(lectureEntry)}
                              >
                                Edit
                              </button>
                              <button
                                id="nogaPlanner_homeIntervalsDeleteIconBtn_3"
                                type="button"
                                className="nogaPlanner_homeIntervalsDeleteIconBtn"
                                aria-label="Delete lecture info row"
                                disabled={isHomeCardsLocked}
                                onClick={() => this.deleteHomeLectureInfoEntry(lectureEntry)}
                              >
                                <i className="fi fi-br-cross" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {homeCourseLectureDraftRows.map((draftRow) => (
                        <tr
                          id={`nogaPlanner_lectureDraftRow_${draftRow.key}`}
                          key={`nogaPlanner_homeCourseLectureDraftRow_${draftRow.key}`}
                          className="is-preview"
                        >
                          <td>{this.formatPlannerTableValue(draftRow.lectureID)}</td>
                          <td>{this.formatPlannerTableValue(draftRow.courseComponent || draftRow.courseID)}</td>
                          <td>{this.formatPlannerTableValue(draftRow.courseName)}</td>
                          <td>{this.formatPlannerTableValue(draftRow.lectureNum)}</td>
                          <td>{this.formatPlannerTableValue(draftRow.lectureName)}</td>
                          <td>{this.formatPlannerTableValue(draftRow.lectureInstructor)}</td>
                          <td />
                        </tr>
                      ))}
                      {homeCourseLectureCurrentDraftRow ? (
                        <tr id="nogaPlanner_lectureCurrentDraftRow" className="is-preview">
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.lectureID)}</td>
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.courseComponent || homeCourseLectureCurrentDraftRow.courseID)}</td>
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.courseName)}</td>
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.lectureNum)}</td>
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.lectureName)}</td>
                          <td>{this.formatPlannerTableValue(homeCourseLectureCurrentDraftRow.lectureInstructor)}</td>
                          <td />
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                ) : null}
                {materialMetadataMode === "exams" && examScheduleEditorOpen ? (
                  <div id="nogaPlanner_homeIntervalsMiniForm_8" className="nogaPlanner_homeIntervalsMiniForm nogaPlanner_homeIntervalCoursesForm">
                    <div id="nogaPlanner_homeIntervalsMiniFormField_18" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_20" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Component ID
                      </span>
                      <select
                        id="nogaPlanner_homeIntervalsInput_35"
                        name="homeCourseExamComponentMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked}
                        value={String(
                          this.state?.homeCourseExamComponentIdDraft || "",
                        )}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamComponentIdDraft: String(
                              event.target.value || "",
                            ).trim(),
                          })
                        }
                      >
                        <option value="">Select component</option>
                        {materialMetadataCourseRows
                          .filter((courseRow) => {
                            const comp = String(courseRow.courseComponent || "").trim().toLowerCase();
                            return !comp.includes("exam");
                          })
                          .map((courseRow) => {
                          const cid = String(courseRow.courseID || "").trim();
                          const comp = String(courseRow.courseComponent || "").trim();
                          const componentID = String(courseRow.componentID || "").trim();
                          const displayId = componentID && componentID !== "-"
                            ? componentID
                            : cid && comp && comp !== "-"
                              ? `${cid}_${comp}`
                              : comp || "-";
                          const optionValue = componentID && componentID !== "-" ? componentID : displayId;
                          return (
                            <option
                              key={`nogaPlanner_homeCourseExamComponentStandalone_${optionValue}`}
                              value={optionValue}
                            >
                              {courseRow.courseName || "-"} ({displayId})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {String(this.state?.homeCourseExamComponentIdDraft || "").trim() ? (
                    <><div id="nogaPlanner_homeIntervalsMiniFormField_19" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_21" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Exam class
                      </span>
                      <select
                        id="nogaPlanner_homeIntervalsInput_36"
                        name="homeCourseExamClassMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked}
                        value={String(this.state?.homeCourseExamClassDraft || "")}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamClassDraft: String(
                              event.target.value || "",
                            ).trim(),
                          })
                        }
                      >
                        <option value="">Select exam class</option>
                        {plannerExams.map((examClass) => (
                          <option
                            key={`nogaPlanner_examClassOption_${examClass}`}
                            value={examClass}
                          >
                            {examClass}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_20" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_22" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Exam date
                      </span>
                      <input
                        id="nogaPlanner_homeIntervalsInput_37"
                        type="date"
                        name="homeCourseExamDateMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked}
                        value={String(this.state?.homeCourseExamDateDraft || "")}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamDateDraft: String(
                              event.target.value || "",
                            ),
                          })
                        }
                      />
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_21" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_23" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Exam time
                      </span>
                      <input
                        id="nogaPlanner_homeIntervalsInput_38"
                        type="time"
                        name="homeCourseExamTimeMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked}
                        value={String(this.state?.homeCourseExamTimeDraft || "")}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamTimeDraft: String(
                              event.target.value || "",
                            ),
                          })
                        }
                      />
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_22" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_24" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Building
                      </span>
                      <select
                        id="nogaPlanner_homeIntervalsInput_39"
                        name="homeCourseExamLocationBuildingMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked}
                        value={String(
                          this.state?.homeCourseExamLocationBuildingDraft || "",
                        )}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamLocationBuildingDraft: String(event.target.value || "").trim(),
                            homeCourseExamLocationRoomDraft: "",
                          })
                        }
                      >
                        <option value="">Select building</option>
                        {materialMetadataProgramLocations.map((loc) => (
                          <option
                            key={`nogaPlanner_examLocationBuilding_${loc.building}`}
                            value={String(loc.building || "")}
                          >
                            {loc.building}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_22b" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_24b" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Room
                      </span>
                      <select
                        id="nogaPlanner_homeIntervalsInput_39b"
                        name="homeCourseExamLocationRoomMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        disabled={isHomeCardsLocked || !String(this.state?.homeCourseExamLocationBuildingDraft || "").trim()}
                        value={String(
                          this.state?.homeCourseExamLocationRoomDraft || "",
                        )}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamLocationRoomDraft: String(event.target.value || "").trim(),
                          })
                        }
                      >
                        <option value="">Select room</option>
                        {(() => {
                          const selectedBuilding = String(this.state?.homeCourseExamLocationBuildingDraft || "").trim();
                          const matchedLoc = materialMetadataProgramLocations.find(
                            (loc) => String(loc.building || "") === selectedBuilding,
                          );
                          return Array.isArray(matchedLoc?.rooms) ? matchedLoc.rooms : [];
                        })().map((room) => (
                          <option
                            key={`nogaPlanner_examLocationRoom_${room}`}
                            value={room}
                          >
                            {room}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_23" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_25" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Exam weight
                      </span>
                      <input
                        id="nogaPlanner_homeIntervalsInput_40"
                        type="number"
                        name="homeCourseExamWeightMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        placeholder="Exam weight"
                        disabled={isHomeCardsLocked}
                        value={String(this.state?.homeCourseExamWeightDraft || "")}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamWeightDraft: String(
                              event.target.value || "",
                            ),
                          })
                        }
                      />
                    </div>
                    <div id="nogaPlanner_homeIntervalsMiniFormField_25" className="nogaPlanner_homeIntervalsMiniFormField">
                      <span id="nogaPlanner_homeIntervalsMiniFormEyebrow_27" className="nogaPlanner_homeIntervalsMiniFormEyebrow">
                        Exam grade
                      </span>
                      <input
                        id="nogaPlanner_homeIntervalsInput_42"
                        type="number"
                        name="homeCourseExamGradeMiniStandalone"
                        className="nogaPlanner_homeIntervalsInput"
                        placeholder="Exam grade"
                        disabled={isHomeCardsLocked}
                        value={String(
                          this.state?.homeCourseExamGradeDraft || "",
                        )}
                        onChange={(event) =>
                          this.setState({
                            homeCourseExamGradeDraft: String(
                              event.target.value || "",
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      id="nogaPlanner_homePanelCardSetBtn_23"
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={
                        isHomeCardsLocked ||
                        !Boolean(
                          String(this.state?.homeCourseExamComponentIdDraft || "").trim() &&
                            String(this.state?.homeCourseExamClassDraft || "").trim(),
                        )
                      }
                      onClick={this.appendHomeCourseExamDraftEntry}
                    >
                      {isExamEntryEditMode ? "Apply changes" : "Add exam part"}
                    </button>
                    </>) : null}
                  </div>
                ) : null}
                {materialMetadataMode === "exams" && hasHomeCourseExamScheduleRows ? (
                  <table id="nogaPlanner_homeIntervalsMiniTable_8" className="nogaPlanner_homeIntervalsMiniTable nogaPlanner_homeCoursesMiniTable">
                    <thead id="nogaPlanner_homeIntervalsMiniTable_8_head">
                      <tr id="nogaPlanner_homeIntervalsMiniTable_8_row1">
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_ID" rowSpan={2}>Exam ID</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Course_name" rowSpan={2}>Course name</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Course_Component_Class" rowSpan={2}>Component class</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_class" rowSpan={2}>Exam class</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_date" rowSpan={2}>Exam date</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_time" rowSpan={2}>Exam time</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_location" colSpan={2}>Exam location</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_weight" rowSpan={2}>Exam weight</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_grade" rowSpan={2}>Exam grade</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Actions" rowSpan={2}>Actions</th>
                      </tr>
                      <tr id="nogaPlanner_homeIntervalsMiniTable_8_row2">
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_location_building">Building</th>
                        <th id="nogaPlanner_homeIntervalsMiniTable_8_th_Exam_location_room">Room</th>
                      </tr>
                    </thead>
                    <tbody id="nogaPlanner_homeIntervalsMiniTable_8_body">
                      {liveExamScheduleGroups.flatMap((group) =>
                        group.parts.map((row, partIndex) => (
                          <tr
                            id={`nogaPlanner_examSchedule_row_${row.key}`}
                            key={`nogaPlanner_homeExamScheduleRow_${row.key}`}
                            className={row?.isPreview ? "is-preview" : ""}
                          >
                            <td id={`nogaPlanner_examSchedule_${row.key}_examID`}>{this.formatPlannerTableValue(row.examID || row.examPartID)}</td>
                            {partIndex === 0 ? (
                              <>
                                <td
                                  id={`nogaPlanner_examSchedule_${group.componentID}_courseName`}
                                  rowSpan={group.parts.length}
                                >
                                  {this.formatPlannerTableValue(group.courseName)}
                                </td>
                                <td
                                  id={`nogaPlanner_examSchedule_${group.componentID}_componentClass`}
                                  rowSpan={group.parts.length}
                                >
                                  {this.formatPlannerTableValue(group.courseComponentClass)}
                                </td>
                              </>
                            ) : null}
                            <td id={`nogaPlanner_examSchedule_${row.key}_examClass`}>{this.formatPlannerTableValue(row.examClass)}</td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examDate`}>{this.formatPlannerTableValue(row.examDate)}</td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examTime`}>{this.formatPlannerTableValue(row.examTime)}</td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examLocation_building`}>
                              {this.formatPlannerTableValue(row.examLocation?.building)}
                            </td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examLocation_room`}>
                              {this.formatPlannerTableValue(
                                Array.isArray(row.examLocation?.rooms) && row.examLocation.rooms.length > 0
                                  ? row.examLocation.rooms[0]
                                  : String(row.examLocation?.room || "").trim(),
                              )}
                            </td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examWeight`}>{this.formatPlannerTableValue(row.examWeight)}</td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_examGrade`}>{this.formatPlannerTableValue(row.examGrade)}</td>
                            <td id={`nogaPlanner_examSchedule_${row.key}_actions`}>
                              {!row.isPreview ? (
                                <div id={`nogaPlanner_examSchedule_rowActions_${row.key}`} className="nogaPlanner_homeIntervalRowActions">
                                  <button
                                    id={`nogaPlanner_homePanelCardSetBtn_24_${row.key}`}
                                    type="button"
                                    className="nogaPlanner_homePanelCardSetBtn"
                                    disabled={isHomeCardsLocked}
                                    onClick={() => this.editHomeCourseExamScheduleEntry(row)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    id={`nogaPlanner_homeIntervalsDeleteIconBtn_4_${row.key}`}
                                    type="button"
                                    className="nogaPlanner_homeIntervalsDeleteIconBtn"
                                    aria-label="Delete exam part"
                                    disabled={isHomeCardsLocked}
                                    onClick={() => this.deleteHomeCourseExamScheduleEntry(row)}
                                  >
                                    <i className="fi fi-br-cross" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : null}
                {materialMetadataMode === "exams" && !hasHomeCourseExamScheduleRows ? (
                  <span id="nogaPlanner_homePanelCardEmptyValue_10" className="nogaPlanner_homePanelCardEmptyValue">
                    No exam schedule saved yet.
                  </span>
                ) : null}
              </div>
            </div>
            <div
              id="nogaPlanner_home_lecturesMode_card"
              className={
                "nogaPlanner_homePanelCard nogaPlanner_homePanelCard--modeContent" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
              style={
                activeHomePanelModeTab === "lectures"
                  ? undefined
                  : { display: "none" }
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_19" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_lectures">Lectures</strong>
              </div>
              <div id="nogaPlanner_homePanelCardBody_4" className="nogaPlanner_homePanelCardBody">
                {this.renderSelectedCourseLecturesTable("full")}
              </div>
            </div>
            <div
              id="nogaPlanner_home_documentsMode_card"
              className={
                "nogaPlanner_homePanelCard nogaPlanner_homePanelCard--modeContent" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
              style={
                activeHomePanelModeTab === "documents"
                  ? undefined
                  : { display: "none" }
              }
            >
              <div id="nogaPlanner_homePanelCardTitleRow_20" className="nogaPlanner_homePanelCardTitleRow">
                <strong id="nogaPlanner_home_heading_documents">Documents</strong>
              </div>
              <div id="nogaPlanner_homePanelCardBody_5" className="nogaPlanner_homePanelCardBody">
                <NogaPlannerTelegramPanel
                  planner={this}
                  runtime={NOGAPLANNER_PANEL_RUNTIME}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };
  getPlannerMainTabTitle = (wrapperTab = "home") => {
    const plannerText = NOGAPLANNER_PANEL_RUNTIME.NOGAPLANNER_TEXT || {};
    if (wrapperTab === "home") {
      return "Home";
    }
    if (wrapperTab === "plan") {
      return String(plannerText?.studyPlan?.title || "Plan");
    }
    if (wrapperTab === "traces") {
      return "Study Materials";
    }
    if (wrapperTab === "ai") {
      return "AI Helper";
    }
    if (wrapperTab === "settings") {
      return String(plannerText?.savedCourses?.plannerSettings || "Settings");
    }
    if (wrapperTab === "lectures") {
      return String(plannerText?.savedCourses?.lecturesTitle || "Lectures");
    }
    if (wrapperTab === "exams") {
      return String(plannerText?.examBoard?.tabExams || "Exams");
    }
    if (wrapperTab === "courses") {
      return String(plannerText?.savedCourses?.coursesTitle || "Courses");
    }
    return String(plannerText?.studyPlan?.title || "Plan");
  };
  renderPlannerMainTabContent = (wrapperTab = "home") => {
    if (wrapperTab === "home") {
      return this.renderPlannerHome();
    }
    if (wrapperTab === "plan") {
      return this.renderPlannerCurrentSubIntervalCalendar();
    }
    if (wrapperTab === "traces") {
      return <NogaPlannerTelegramPanel planner={this} />;
    }
    if (wrapperTab === "ai") {
      return <NogaPlannerAIHelperPanel planner={this} />;
    }
    if (wrapperTab === "settings") {
      return (
        <NogaPlannerSettings
          planner={this}
          runtime={NOGAPLANNER_PANEL_RUNTIME}
        />
      );
    }
    if (wrapperTab === "lectures") {
      return this.renderSelectedCourseLecturesTable("lecture-tab");
    }
    if (wrapperTab === "exams") {
      return this.renderSelectedCourseExamBoard(true);
    }
    if (wrapperTab === "courses") {
      return (
        <div id="nogaPlanner_coursesTabMount" className="nogaPlanner_coursesTabMount">
          {this.renderPlannerCoursesManager()}
          {this.renderSavedCoursesColumn()}
          <NogaPlannerTelegramPanel
            planner={this}
            mode="language-only"
            languageSection="courses"
          />
        </div>
      );
    }
    return this.renderPlannerCurrentSubIntervalCalendar();
  };
  renderStudyPlanControlsBar = () => {
    const profile = this.props?.state?.profile || this.props?.state || {};
    const profileComponentsClass = Array.from(
      new Set(
        (Array.isArray(profile?.studying?.componentsClass)
          ? profile.studying.componentsClass
          : [profile?.studying?.componentsClass]
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const attendanceComponentTabs = [
      { key: "all", label: "All" },
      ...profileComponentsClass.map((entry) => ({
        key: String(entry || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " "),
        label: entry,
      })),
    ];
    const { startYear: intervalStartYear, endYear: intervalEndYear } =
      this.getPlannerCurrentAcademicYearRange();
    const startYearValue =
      String(this.state?.studyPlanIntervalDraft?.startDateYear || "").trim() ||
      intervalStartYear;
    const endYearValue =
      String(this.state?.studyPlanIntervalDraft?.endDateYear || "").trim() ||
      intervalEndYear ||
      intervalStartYear;
    return (
      <>
        <div id="nogaPlanner_studyPlanAttendanceMiniBar" className="nogaPlanner_studyPlanAttendanceMiniBar">
              <label id="nogaPlanner_studyPlanTopField" className="nogaPlanner_studyPlanTopField">
                <span id="nogaPlanner_studyPlanTopFieldEyebrow" className="nogaPlanner_studyPlanTopFieldEyebrow">
                  Start date
                </span>
                <div id="nogaPlanner_savedCoursesDetailsInputs" className="nogaPlanner_savedCoursesDetailsInputs">
                  <select
                    id="nogaPlanner_savedCoursesDetailsInput"
                    name="studyPlanStartDateDay"
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={String(
                      this.state?.studyPlanIntervalDraft?.startDateDay || "",
                )}
                onChange={(event) =>
                  this.setStudyPlanIntervalDraft({
                    startDateDay: String(event.target.value || "").trim(),
                  })
                }
              >
                <option value="">DD</option>
                {Array.from({ length: 31 }, (_, index) => {
                  const dayNumber = String(index + 1).padStart(2, "0");
                  return (
                    <option
                      key={`nogaPlanner_studyPlanStartDayOption_${dayNumber}`}
                      value={dayNumber}
                    >
                      {dayNumber}
                    </option>
                  );
                })}
              </select>
              <select
                id="nogaPlanner_savedCoursesDetailsInput_2"
                name="studyPlanStartDateMonth"
                className="nogaPlanner_savedCoursesDetailsInput"
                value={String(
                  this.state?.studyPlanIntervalDraft?.startDateMonth || "",
                )}
                onChange={(event) =>
                  this.setStudyPlanIntervalDraft({
                    startDateMonth: String(event.target.value || "").trim(),
                  })
                }
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, index) => {
                  const monthNumber = String(index + 1).padStart(2, "0");
                  return (
                    <option
                      key={`nogaPlanner_studyPlanStartMonthOption_${monthNumber}`}
                      value={monthNumber}
                    >
                      {monthNumber}
                    </option>
                  );
                })}
              </select>
              <input
                id="nogaPlanner_savedCoursesDetailsInput_3"
                type="number"
                name="studyPlanStartDateYear"
                min="1000"
                max="9999"
                placeholder="YEAR"
                className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
                value={startYearValue}
                readOnly
              />
            </div>
          </label>
              <label id="nogaPlanner_studyPlanTopField_2" className="nogaPlanner_studyPlanTopField">
                <span id="nogaPlanner_studyPlanTopFieldEyebrow_2" className="nogaPlanner_studyPlanTopFieldEyebrow">
                  End date
                </span>
                <div id="nogaPlanner_savedCoursesDetailsInputs_2" className="nogaPlanner_savedCoursesDetailsInputs">
                  <select
                    id="nogaPlanner_savedCoursesDetailsInput_4"
                    name="studyPlanEndDateDay"
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={String(
                      this.state?.studyPlanIntervalDraft?.endDateDay || "",
                )}
                onChange={(event) =>
                  this.setStudyPlanIntervalDraft({
                    endDateDay: String(event.target.value || "").trim(),
                  })
                }
              >
                <option value="">DD</option>
                {Array.from({ length: 31 }, (_, index) => {
                  const dayNumber = String(index + 1).padStart(2, "0");
                  return (
                    <option
                      key={`nogaPlanner_studyPlanEndDayOption_${dayNumber}`}
                      value={dayNumber}
                    >
                      {dayNumber}
                    </option>
                  );
                })}
              </select>
                  <select
                    id="nogaPlanner_savedCoursesDetailsInput_5"
                    name="studyPlanEndDateMonth"
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={String(
                      this.state?.studyPlanIntervalDraft?.endDateMonth || "",
                )}
                onChange={(event) =>
                  this.setStudyPlanIntervalDraft({
                    endDateMonth: String(event.target.value || "").trim(),
                  })
                }
              >
                <option value="">MM</option>
                {Array.from({ length: 12 }, (_, index) => {
                  const monthNumber = String(index + 1).padStart(2, "0");
                  return (
                    <option
                      key={`nogaPlanner_studyPlanEndMonthOption_${monthNumber}`}
                      value={monthNumber}
                    >
                      {monthNumber}
                    </option>
                  );
                })}
              </select>
              <input
                id="nogaPlanner_savedCoursesDetailsInput_6"
                type="number"
                name="studyPlanEndDateYear"
                min="1000"
                max="9999"
                placeholder="YEAR"
                className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
                value={endYearValue}
                readOnly
              />
            </div>
          </label>
          <button
            id="nogaPlanner_studyPlanAttendanceMiniBarBtn"
            type="button"
            className="nogaPlanner_studyPlanAttendanceMiniBarBtn"
            onClick={async () => {
              try {
                await this.addStudyPlanInterval();
              } catch (error) {
                this.props.serverReply?.(
                  String(error?.message || "Failed to add interval."),
                );
              }
            }}
          >
            Add interval
          </button>
        </div>
        <label id="nogaPlanner_studyPlanTopField_3" className="nogaPlanner_studyPlanTopField nogaPlanner_studyPlanAttendanceComponentField">
          <span id="nogaPlanner_studyPlanTopFieldEyebrow_3" className="nogaPlanner_studyPlanTopFieldEyebrow">
            Component class
          </span>
          <select
            id="nogaPlanner_studyPlanAttendanceComponentSelect"
            name="studyPlanAttendanceComponent"
            className="nogaPlanner_savedCoursesDetailsInput"
            value={String(this.state?.studyPlanAttendanceComponentKey || "all")}
            onChange={(event) =>
              this.setStudyPlanAttendanceComponentKey(event.target.value)
            }
          >
            {attendanceComponentTabs.map((tabEntry) => (
              <option
                key={`nogaPlanner_studyPlanAttendanceComponentTab_${tabEntry.key}`}
                value={tabEntry.key}
              >
                {tabEntry.label}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  };
  render() {
    const wrapperTab =
      this.state.wrapperTab === "home"
        ? "home"
        : this.state.wrapperTab === "plan"
          ? "plan"
        : this.state.wrapperTab === "traces"
          ? "traces"
          : this.state.wrapperTab === "ai"
            ? "ai"
          : this.state.wrapperTab === "exams"
            ? "exams"
            : this.state.wrapperTab === "lectures"
              ? "lectures"
              : this.state.wrapperTab === "courses"
                ? "courses"
                : this.state.wrapperTab === "settings"
                  ? "settings"
                  : "home";
    const plannerBackgroundUrl = `${import.meta.env.BASE_URL}img/NogaPlannerBG.png`;
    const isPlannerPending =
      Number(this.state?.plannerPendingRequests || 0) > 0;
    const plannerPendingLabel =
      String(this.state?.plannerPendingLabel || "").trim() || "Working...";
    return (
      <React.Fragment>
        {this.state?.homeResetPendingAction ? (
          <div className="nogaPlanner_resetPasswordOverlay" role="dialog" aria-modal="true">
            <div className="nogaPlanner_resetPasswordDialog">
              <p className="nogaPlanner_resetPasswordTitle">
                Confirm: {this.state.homeResetPendingAction.label}
              </p>
              <input
                type="password"
                className="nogaPlanner_homeIntervalsInput"
                placeholder="Enter your password to confirm"
                value={this.state?.homeResetPasswordDraft || ""}
                disabled={this.state?.homeResetPasswordLoading}
                autoFocus
                onChange={(e) => this.setState({ homeResetPasswordDraft: e.target.value, homeResetPasswordError: "" })}
                onKeyDown={(e) => { if (e.key === "Enter") this.confirmResetWithPassword(); }}
              />
              {this.state?.homeResetPasswordError ? (
                <span className="nogaPlanner_resetPasswordError">{this.state.homeResetPasswordError}</span>
              ) : null}
              <div className="nogaPlanner_resetPasswordActions">
                <button
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                  disabled={this.state?.homeResetPasswordLoading}
                  onClick={() => this.setState({ homeResetPendingAction: null, homeResetPasswordDraft: "", homeResetPasswordError: "" })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                  disabled={!String(this.state?.homeResetPasswordDraft || "").trim() || this.state?.homeResetPasswordLoading}
                  onClick={this.confirmResetWithPassword}
                >
                  {this.state?.homeResetPasswordLoading ? "Verifying..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <article
          id="nogaPlanner_article"
          ref={this.plannerArticleRef}
          className="fr"
          dir="ltr"
          lang="en"
          data-locale="en"
          data-swipe-view={this.state.planner_swipeView}
          style={{
            "--nogaPlanner-day-bg-image": `url("${plannerBackgroundUrl}")`,
            "--nogaPlanner-bg-image": `url("${plannerBackgroundUrl}")`,
            display: undefined,
          }}
        >
          <NogaPlannerSavedCoursesPanel
            planner={this}
            runtime={NOGAPLANNER_PANEL_RUNTIME}
            shellOnly={true}
          />
          <div
            id="nogaPlanner_mainTabPanel"
            className="nogaPlanner_mainTabPanel"
          >
            <div
              id="nogaPlanner_mainTabPanelTitle"
              className="nogaPlanner_mainTabPanelTitle"
            >
              <p id="nogaPlanner_mainTabPanelTitle_text">{this.getPlannerMainTabTitle(wrapperTab)}</p>
              {isPlannerPending ? (
                <div
                  id="nogaPlanner_pendingIndicator"
                  className="nogaPlanner_pendingIndicator"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    id="nogaPlanner_pendingSpinner"
                    className="nogaPlanner_pendingSpinner"
                    aria-hidden="true"
                  />
                  <span id="nogaPlanner_pendingLabel" className="nogaPlanner_pendingLabel">
                    {plannerPendingLabel}
                  </span>
                </div>
              ) : null}
            </div>
            {this.renderPlannerMainTabContent(wrapperTab)}
          </div>
        </article>
      </React.Fragment>
    );
  }
}
export const getPlannerMusicSnapshot = () => ({});
export const playNextSharedPlannerMusicTrack = () => {};
export const playPreviousSharedPlannerMusicTrack = () => {};
export const toggleSharedPlannerMusic = () => {};
