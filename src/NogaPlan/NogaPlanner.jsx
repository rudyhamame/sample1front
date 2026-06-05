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
import NogaPlannerStudyPlanPanel from "./components/NogaPlannerStudyPlanPanel";
import NogaPlannerSettings from "./components/NogaPlannerSettings";
import NogaPlannerTelegramPanel from "./components/NogaPlannerTelegramPanel";
import * as plannerRuntimeHelpers from "./lib/plannerRuntime";
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
  normalizeStudyPlanAid,
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
      return normalizeStudyPlanAid(localStudyPlanAid);
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
    return normalizeStudyPlanAid(propsStudyPlanAid);
  };
  setPlannerStudyPlanAidState = (nextStudyPlanAid = {}) => {
    const normalizedStudyPlanAid = normalizeStudyPlanAid(nextStudyPlanAid);
    this.setState({ studyPlanAid: normalizedStudyPlanAid });
    return normalizedStudyPlanAid;
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
      return normalizeStudyPlanAid(
        payload?.updatedStudyPlanAid ||
          payload?.studyPlanAid ||
          nextStudyPlanAid,
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
          body: JSON.stringify({ programId }),
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
  cancelHomeIntervalPassingThresholdEditor = () => {
    this.setState((previousState) => ({
      homeIntervalPassingThresholdEditorOpen: false,
      homeIntervalPassingThresholdModeDraft: String(
        previousState?.homeIntervalPassingThresholdModeValue || "",
      ),
      homeIntervalPassingThresholdUnitDraft: String(
        previousState?.homeIntervalPassingThresholdUnitValue || "",
      ),
      homeIntervalPassingThresholdNumberDraft: String(
        previousState?.homeIntervalPassingThresholdNumberValue || "",
      ),
    }));
  };
  cancelHomeCoursesEditor = () => {
    this.setState({
      homeCoursesEditorOpen: false,
      homeCourseEditingKey: "",
      homeCourseOriginalId: "",
      homeCourseOriginalIntervalId: "",
      homeCourseIdDraft: "",
      homeCourseCodeDraft: "",
      homeCourseComponentDraft: [],
      homeCourseIntervalIdDraft: "",
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
    });
  };
  persistStudyPlannerIntervals = async (intervals = []) => {
    return this.runPlannerPendingTask("Saving intervals...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedIntervals = Array.from(
        (Array.isArray(intervals) ? intervals : [])
          .reduce((map, entry) => {
            const subIntervalId = String(
              entry && typeof entry === "object"
                ? entry?.subIntervalId || entry?.subintervalId || entry?.key || ""
                : entry,
            ).trim();
            if (!subIntervalId) {
              return map;
            }
            const intervalId = String(
              entry?.intervalId ||
                (entry?.regular === false ? subIntervalId : ""),
            ).trim() || subIntervalId;
            const storageIntervalId =
              entry?.regular === false ? subIntervalId : intervalId;
            const intervalMapKey = storageIntervalId || subIntervalId;
            const previousInterval = map.get(intervalMapKey) || {
              intervalId: intervalMapKey,
              intervalStatus: "TBD",
              intervalsubIntervals: [],
            };
            const previousStatus = String(previousInterval?.intervalStatus || "")
              .trim()
              .toLowerCase();
            const nextStatus =
              String(entry?.intervalStatus || "TBD").trim() || "TBD";
            const nextSubIntervals = Array.from(
              new Map(
                [
                  ...(Array.isArray(previousInterval?.intervalsubIntervals)
                    ? previousInterval.intervalsubIntervals
                    : []),
                  {
                    subIntervalId,
                    subIntervalCourses: Array.isArray(entry?.intervalCourses)
                      ? entry.intervalCourses
                      : [],
                  },
                ].map((subEntry) => [
                  String(subEntry?.subIntervalId || "").trim(),
                  {
                    subIntervalId: String(
                      subEntry?.subIntervalId || "",
                    ).trim(),
                    subIntervalCourses: Array.isArray(
                      subEntry?.subIntervalCourses,
                    )
                      ? subEntry.subIntervalCourses
                      : [],
                  },
                ]),
              ).values(),
            ).filter((subEntry) => Boolean(subEntry?.subIntervalId));
            map.set(intervalMapKey, {
              intervalId: intervalMapKey,
              intervalStatus:
                previousStatus === "current" ||
                nextStatus.toLowerCase() === "current"
                  ? "current"
                  : nextStatus,
              intervalsubIntervals: nextSubIntervals,
            });
            return map;
          }, new Map())
          .values(),
      );
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
          body: JSON.stringify({ intervals: normalizedIntervals }),
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
      return payload?.studyPlanner || {};
    });
  };
  persistStudyPlannerIntervalStatus = async ({
    intervalId = "",
    subIntervalId = "",
    intervalStatus = "TBD",
  } = {}) => {
    return this.runPlannerPendingTask("Saving interval status...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedIntervalId = String(intervalId || "").trim();
      const normalizedSubIntervalId = String(subIntervalId || "").trim();
      const normalizedIntervalStatus =
        String(intervalStatus || "")
          .trim()
          .toLowerCase() === "current"
          ? "current"
          : "TBD";
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

    const generatedIntervals = [];
    const totalYearsWithEndpoints = safeTotalYears + 1;
    let termCursor = 0;
    for (
      let yearOffset = 0;
      yearOffset < totalYearsWithEndpoints;
      yearOffset += 1
    ) {
      const nextYear = safeStartYear + yearOffset;
      let rowCount = 1;
      if (yearOffset > 0 && yearOffset < totalYearsWithEndpoints - 1) {
        rowCount = safeTotalTermsPerYear;
      } else if (yearOffset === totalYearsWithEndpoints - 1) {
        rowCount = Math.max(1, safeTotalTermsPerYear - 1);
      }
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const term = (termCursor % safeTotalTermsPerYear) + 1;
        const programIntervalId = String(
          Math.floor(termCursor / safeTotalTermsPerYear) + 1,
        );
        generatedIntervals.push({
          intervalId: programIntervalId,
          subIntervalId: `${nextYear}${term}`,
          regular: true,
          intervalStatus: "TBD",
          intervalCourses: [],
        });
        termCursor += 1;
      }
    }

    return generatedIntervals;
  };
  parseIntervalIdYearTerm = (subIntervalId = "") => {
    const normalizedIntervalId = String(subIntervalId || "")
      .trim()
      .replace(/\D/g, "");
    if (normalizedIntervalId.length < 5) {
      return {
        year: "",
        term: "",
      };
    }
    return {
      year: normalizedIntervalId.slice(0, 4),
      term: normalizedIntervalId.slice(4, 5),
    };
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
                subIntervalId,
                regular:
                  typeof entry?.regular === "boolean"
                    ? entry.regular
                    : typeof entry?.expected === "boolean"
                      ? entry.expected
                      : false,
                intervalStatus:
                  String(entry?.intervalStatus || "TBD").trim() || "TBD",
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
    const intervalIdValue = String(
      this.state?.homeManualIntervalIdDraft || "",
    ).trim();
    const yearValue = String(
      this.state?.homeManualIntervalYearDraft || "",
    ).trim();
    const termValue = String(
      this.state?.homeManualIntervalTermDraft || "",
    ).trim();
    const yearIsValid = /^\d{4}$/.test(yearValue);
    const termIsValid = /^\d+$/.test(termValue) && Number(termValue) >= 1;
    if (!intervalIdValue || !yearIsValid || !termIsValid) {
      this.props.serverReply?.("Select Interval and enter valid Year and Term.");
      return;
    }
    const subIntervalId = `${yearValue}${termValue}`;
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
            ).trim() === subIntervalId,
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
            intervalId: intervalIdValue,
            subIntervalId,
            regular: false,
            intervalStatus: "TBD",
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
      (entry) =>
        String(entry?.key || entry?.intervalId || "").trim() ===
        normalizedIntervalKey,
    );
    const selectedEntryIsCurrent =
      String(selectedEntry?.intervalStatus || "TBD")
        .trim()
        .toLowerCase() === "current";
    const targetIntervalId = String(selectedEntry?.intervalId || "").trim();
    if (!targetIntervalId) {
      this.props.serverReply?.("Failed to resolve the selected interval.");
      return;
    }
    const nextStatus = selectedEntryIsCurrent ? "TBD" : "current";
    const persistedStudyPlanner = await this.persistStudyPlannerIntervals(
      sourceEntries.map((entry) => ({
        ...entry,
        intervalStatus:
          String(entry?.intervalId || "").trim() === targetIntervalId
            ? nextStatus
            : String(entry?.intervalStatus || "TBD").trim().toLowerCase() ===
                "current"
              ? "TBD"
              : String(entry?.intervalStatus || "TBD").trim() || "TBD",
      })),
    );
    this.setState({
      plannerRoot: persistedStudyPlanner,
      homeCurrentIntervalKey: selectedEntryIsCurrent
        ? ""
        : normalizedIntervalKey,
    });
  };
  triggerHomeIntervalRetaking = async (intervalId = "") => {
    const targetIntervalId = String(intervalId || "").trim();
    if (!targetIntervalId) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const sourceEntries = this.getPlannerIntervalsWithComponents(plannerRoot);
    const targetEntries = sourceEntries.filter(
      (entry) => String(entry?.intervalId || "").trim() === targetIntervalId,
    );
    if (targetEntries.length === 0) {
      this.props.serverReply?.("Failed to resolve the selected interval.");
      return;
    }
    const parsedSubIntervals = targetEntries
      .map((entry) => {
        const parsedInterval = this.parseIntervalIdYearTerm(
          entry?.subIntervalId || entry?.key,
        );
        const year = Number(parsedInterval?.year || 0);
        const term = String(parsedInterval?.term || "").trim();
        if (!Number.isInteger(year) || year < 1 || !term) {
          return null;
        }
        return {
          year,
          term,
        };
      })
      .filter(Boolean);
    if (parsedSubIntervals.length === 0) {
      this.props.serverReply?.("Failed to resolve the selected subintervals.");
      return;
    }
    const targetIntervalNumber = Number(targetIntervalId || 0);
    const shiftSubIntervalIdYear = (subIntervalId = "", yearOffset = 0) => {
      const parsedInterval = this.parseIntervalIdYearTerm(subIntervalId);
      const year = Number(parsedInterval?.year || 0);
      const term = String(parsedInterval?.term || "").trim();
      if (!Number.isInteger(year) || year < 1 || !term || !yearOffset) {
        return String(subIntervalId || "").trim();
      }
      return `${year + yearOffset}${term}`;
    };
    const shiftedSourceEntries = sourceEntries.map((entry) => {
      const entryIntervalId = String(entry?.intervalId || "").trim();
      const entryIntervalNumber = Number(entryIntervalId || 0);
      const shouldShiftForward =
        Number.isInteger(targetIntervalNumber) &&
        Number.isInteger(entryIntervalNumber) &&
        entryIntervalNumber > targetIntervalNumber;
      return {
        ...entry,
        subIntervalId: shouldShiftForward
          ? shiftSubIntervalIdYear(entry?.subIntervalId || entry?.key, 1)
          : String(entry?.subIntervalId || entry?.key || "").trim(),
        intervalStatus:
          entryIntervalId === targetIntervalId
            ? "Retaking"
            : entry?.intervalStatus,
      };
    });
    const existingSubIntervalIds = new Set(
      shiftedSourceEntries
        .map((entry) => String(entry?.subIntervalId || entry?.key || "").trim())
        .filter(Boolean),
    );
    const retakeEntries = parsedSubIntervals
      .map(({ year, term }) => ({
        intervalId: targetIntervalId,
        subIntervalId: `${year + 1}${term}`,
        regular: true,
        intervalStatus: "Retaking",
        intervalCourses: [],
      }))
      .filter(
        (entry) =>
          !existingSubIntervalIds.has(String(entry?.subIntervalId || "").trim()),
      );
    const nextEntries = [...shiftedSourceEntries, ...retakeEntries];
    try {
      const persistedStudyPlanner =
        await this.persistStudyPlannerIntervals(nextEntries);
      this.setState({
        plannerRoot: persistedStudyPlanner,
      });
      this.props.serverReply?.("Retaking subintervals added.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to add retaking subintervals."),
      );
    }
  };
  getPlannerIntervalsWithComponents = (plannerRoot = {}) => {
    const plannerIntervals = Array.isArray(plannerRoot?.programIntervals)
      ? plannerRoot.programIntervals
      : [];
    return plannerIntervals
      .flatMap((intervalEntry) => {
        const intervalId = String(intervalEntry?.intervalId || "").trim();
        const intervalStatus = Array.isArray(intervalEntry?.intervalStatus)
          ? String(intervalEntry?.intervalStatus?.[0] || "TBD").trim() || "TBD"
          : String(intervalEntry?.intervalStatus || "TBD").trim() || "TBD";
        const subIntervals = Array.isArray(intervalEntry?.intervalsubIntervals)
          ? intervalEntry.intervalsubIntervals
          : [];
        return subIntervals
          .map((subIntervalEntry) => {
            const subIntervalId = String(
              subIntervalEntry?.subIntervalId || "",
            ).trim();
            if (!subIntervalId) {
              return null;
            }
            return {
              key: subIntervalId,
              intervalId,
              subIntervalId,
              regular: intervalId !== subIntervalId,
              intervalStatus,
              intervalCourses: Array.isArray(
                subIntervalEntry?.subIntervalCourses,
              )
                ? subIntervalEntry.subIntervalCourses
                : [],
            };
          })
          .filter(Boolean);
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
      const nextProgramId = String(nextPlannerRoot?.programId || "").trim();
      const nextProgramComponents = Array.isArray(
        nextPlannerRoot?.programComponents,
      )
        ? nextPlannerRoot.programComponents
            .map((entry) => ({
              componentId: String(entry?.componentId || "").trim(),
              componentIntervals: Array.isArray(entry?.componentIntervals)
                ? entry.componentIntervals
                : [],
            }))
            .filter((entry) => Boolean(entry.componentId))
        : [];
      this.setState((previousState) => ({
        plannerRoot: nextPlannerRoot,
        homeProgramIdDraft:
          String(previousState?.homeProgramIdDraft || "").trim() ||
          nextProgramId,
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
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdModeDraft:
          String(
            previousState?.homeIntervalPassingThresholdModeDraft || "",
          ).trim() ||
          String(
            nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdMode ??
              "",
          ).trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitDraft:
          String(
            previousState?.homeIntervalPassingThresholdUnitDraft || "",
          ).trim() ||
          String(
            nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdUnit ??
              "",
          ).trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberDraft:
          String(
            previousState?.homeIntervalPassingThresholdNumberDraft || "",
          ).trim() ||
          String(
            nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdNumber ??
              "",
          ).trim(),
        homeProgramCardSet:
          Boolean(previousState?.homeProgramCardSet) || Boolean(nextProgramId),
        homeComponentsCardSet:
          Boolean(previousState?.homeComponentsCardSet) ||
          nextProgramComponents.length > 0,
        homeComponentsDraftList:
          nextProgramComponents.length > 0
            ? nextProgramComponents
            : previousState?.homeComponentsDraftList || [],
        homeManualIntervalsDraftList:
          previousState?.homeManualIntervalsDraftList || [],
      }));
    }
    return nextPlannerRoot;
  };
  persistStudyPlannerComponents = async (componentIds = []) => {
    return this.runPlannerPendingTask("Saving components...", async () => {
      const userId = String(this.props?.state?.my_id || "").trim();
      const token = String(this.props?.state?.token || "").trim();
      const normalizedComponentIds = Array.from(
        new Map(
          (Array.isArray(componentIds) ? componentIds : [])
            .map((entry) => ({
              componentId: String(
                entry && typeof entry === "object" ? entry?.componentId : entry,
              ).trim(),
              componentIntervals: Array.isArray(entry?.componentIntervals)
                ? entry.componentIntervals
                : [],
            }))
            .filter((entry) => Boolean(entry.componentId))
            .map((entry) => [entry.componentId, entry]),
        ).values(),
      );
      if (!userId || !token) {
        throw new Error("Failed to save components: login data is incomplete.");
      }
      if (normalizedComponentIds.length === 0) {
        throw new Error("At least one component ID is required.");
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
          body: JSON.stringify({ componentIds: normalizedComponentIds }),
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
    if (String(plannerRoot?.programId || "").trim()) {
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
    if (Array.isArray(plannerRoot?.programComponents)) {
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
    const componentEntries = draftList
      .map((entry) => ({
        componentId: String(
          entry && typeof entry === "object" ? entry?.componentId : entry,
        ).trim(),
        componentIntervals: Array.isArray(entry?.componentIntervals)
          ? entry.componentIntervals
          : [],
      }))
      .filter((entry) => Boolean(entry.componentId));
    if (componentEntries.length === 0) {
      this.props.serverReply?.("Add at least one component ID.");
      return;
    }
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
  appendHomeComponentDraftEntry = () => {
    const inputValue = String(this.state?.homeComponentIdInput || "").trim();
    if (!inputValue) {
      return;
    }
    this.setState((previousState) => {
      const prevList = Array.isArray(previousState?.homeComponentsDraftList)
        ? previousState.homeComponentsDraftList
        : [];
      const normalizedExists = prevList.some((entry) => {
        const componentId = String(
          entry && typeof entry === "object" ? entry?.componentId : entry,
        ).trim();
        return componentId === inputValue;
      });
      if (normalizedExists) {
        return {
          homeComponentIdInput: "",
        };
      }
      return {
        homeComponentsDraftList: [
          ...prevList,
          { componentId: inputValue, componentIntervals: [] },
        ],
        homeComponentIdInput: "",
      };
    });
  };
  removeHomeComponentDraftEntry = (componentId = "") => {
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
          String(
            entry && typeof entry === "object" ? entry?.componentId : entry,
          ).trim() !== normalizedComponentId,
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
    const match = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return { day: "", month: "", year: "" };
    }
    return {
      day: String(Number(match[3])),
      month: String(Number(match[2])),
      year: match[1],
    };
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
    const generatedIntervals = this.buildHomeGeneratedIntervals(
      startYear,
      totalYears,
      totalTermsPerYear,
    );
    const manualIntervals = this.getNormalizedHomeManualIntervals();
    const plannerRoot = this.getResolvedPlannerRoot();
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
    const intervalStatusDrafts =
      this.state?.homeIntervalStatusDrafts &&
      typeof this.state.homeIntervalStatusDrafts === "object"
        ? this.state.homeIntervalStatusDrafts
        : {};
    const existingIntervals =
      this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = [...generatedIntervals, ...manualIntervals].map(
      (intervalEntry) => {
        const intervalKey = String(intervalEntry?.key || "").trim();
        const intervalDraftKey =
          intervalEntry?.regular === false
            ? `sub:${intervalKey}`
            : `interval:${String(intervalEntry?.intervalId || "").trim()}`;
        const draftedStatus = String(
          intervalStatusDrafts?.[intervalDraftKey] || "",
        ).trim();
        return draftedStatus
          ? {
              ...intervalEntry,
              intervalStatus: draftedStatus,
            }
          : intervalEntry;
      },
    );
    const remainingExistingIntervals = existingIntervals
      .filter((intervalEntry) => {
        const intervalKey = String(
          intervalEntry?.key || intervalEntry?.intervalId || "",
        ).trim();
        return intervalKey && !deletedIntervalIds.includes(intervalKey);
      })
      .map((intervalEntry) => {
        const intervalKey = String(intervalEntry?.key || "").trim();
        const intervalDraftKey =
          intervalEntry?.regular === false
            ? `sub:${intervalKey}`
            : `interval:${String(intervalEntry?.intervalId || "").trim()}`;
        const draftedStatus = String(
          intervalStatusDrafts?.[intervalDraftKey] || "",
        ).trim();
        return draftedStatus
          ? {
              ...intervalEntry,
              intervalStatus: draftedStatus,
            }
          : intervalEntry;
      });
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
      homeExpectedIntervalsGenerated: false,
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
    const thresholdMode = String(
      this.state?.homeIntervalPassingThresholdModeDraft || "",
    ).trim();
    const thresholdUnit = String(
      this.state?.homeIntervalPassingThresholdUnitDraft || "",
    ).trim();
    const thresholdNumber = String(
      this.state?.homeIntervalPassingThresholdNumberDraft || "",
    ).trim();
    if (!thresholdMode || !thresholdUnit || !thresholdNumber) {
      this.props.serverReply?.("Enter program passing rules first.");
      return;
    }
    try {
      const nextPlannerRoot = await this.persistStudyPlannerMeta({
        programPassingThresholdPerInterval: {
          thresholdMode,
          thresholdUnit,
          thresholdNumber: Number(thresholdNumber),
        },
      });
      this.setState({
        plannerRoot:
          nextPlannerRoot && typeof nextPlannerRoot === "object"
            ? nextPlannerRoot
            : this.state?.plannerRoot || {},
        homeIntervalPassingThresholdModeValue: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdMode ??
            thresholdMode,
        ).trim(),
        homeIntervalPassingThresholdModeDraft: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdMode ??
            thresholdMode,
        ).trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdUnit ??
            thresholdUnit,
        ).trim(),
        homeIntervalPassingThresholdUnitDraft: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdUnit ??
            thresholdUnit,
        ).trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdNumber ??
            thresholdNumber,
        ).trim(),
        homeIntervalPassingThresholdNumberDraft: String(
          nextPlannerRoot?.programPassingThresholdPerInterval?.thresholdNumber ??
            thresholdNumber,
        ).trim(),
        homeIntervalPassingThresholdEditorOpen: false,
      });
      this.props.serverReply?.("Program passing rules set.");
    } catch (error) {
      this.props.serverReply?.(
        String(
          error?.message || "Failed to save program passing rules.",
        ),
      );
    }
  };
  handleHomeCoursesSetSubmit = async () => {
    const editingKey = String(this.state?.homeCourseEditingKey || "").trim();
    const originalCourseId = String(
      this.state?.homeCourseOriginalId || "",
    ).trim();
    const originalIntervalId = String(
      this.state?.homeCourseOriginalIntervalId || "",
    ).trim();
    const courseId = String(this.state?.homeCourseIdDraft || "").trim();
    const courseCode = String(this.state?.homeCourseCodeDraft || "").trim();
    const componentIds = Array.from(
      new Set(
        (Array.isArray(this.state?.homeCourseComponentDraft)
          ? this.state.homeCourseComponentDraft
          : [this.state?.homeCourseComponentDraft]
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const intervalId = String(
      this.state?.homeCourseIntervalIdDraft || "",
    ).trim();
    if (!courseId || !componentIds.length || !intervalId) {
      this.props.serverReply?.("Enter course ID, component, and interval.");
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentIntervalId = String(
        intervalEntry?.subIntervalId || intervalEntry?.intervalId || "",
      ).trim();
      const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      const sanitizedIntervalCourses = currentIntervalCourses.filter(
        (courseEntry) => {
          if (!editingKey) {
            return true;
          }
          const currentCourseId = String(courseEntry?.courseId || "").trim();
          return !(
            currentCourseId === originalCourseId &&
            currentIntervalId === originalIntervalId
          );
        },
      );
      if (currentIntervalId !== intervalId) {
        return {
          ...intervalEntry,
          intervalCourses: sanitizedIntervalCourses,
        };
      }
      const existingCourseIndex = sanitizedIntervalCourses.findIndex(
        (courseEntry) =>
          String(courseEntry?.courseId || "").trim() === courseId,
      );
      if (existingCourseIndex === -1) {
        return {
          ...intervalEntry,
          intervalCourses: [
            ...sanitizedIntervalCourses,
            {
              courseId,
              courseCode,
              courseComponents: componentIds.map((componentId) => ({
                componentId,
                componentLectures: [],
              })),
            },
          ],
        };
      }
      const nextIntervalCourses = sanitizedIntervalCourses.map(
        (courseEntry, courseIndex) => {
          if (courseIndex !== existingCourseIndex) {
            return courseEntry;
          }
          const currentCourseComponents = Array.isArray(
            courseEntry?.courseComponents,
          )
            ? courseEntry.courseComponents
            : [];
          const currentComponentIds = new Set(
            currentCourseComponents
              .map((componentEntry) =>
                String(componentEntry?.componentId || "").trim(),
              )
              .filter(Boolean),
          );
          const nextCourseComponents = [...currentCourseComponents];
          componentIds.forEach((componentId) => {
            if (!currentComponentIds.has(componentId)) {
              nextCourseComponents.push({
                componentId,
                componentLectures: [],
              });
            }
          });
          return {
            ...courseEntry,
            courseCode:
              courseCode || String(courseEntry?.courseCode || "").trim(),
            courseComponents: nextCourseComponents,
          };
        },
      );
      return {
        ...intervalEntry,
        intervalCourses: nextIntervalCourses,
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
        homeCoursesEditorOpen: false,
        homeCourseEditingKey: "",
        homeCourseOriginalId: "",
        homeCourseOriginalIntervalId: "",
        homeCourseIdDraft: "",
        homeCourseCodeDraft: "",
        homeCourseComponentDraft: [],
        homeCourseIntervalIdDraft: "",
      });
      this.props.serverReply?.("Course saved.");
    } catch (error) {
      this.props.serverReply?.(
        String(error?.message || "Failed to save course."),
      );
    }
  };
  editHomeCourseEntry = (courseEntry = {}) => {
    const componentIds = Array.isArray(courseEntry?.componentIds)
      ? courseEntry.componentIds
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    this.setState({
      homeCoursesEditorOpen: true,
      homeCourseEditingKey: String(courseEntry?.key || "").trim(),
      homeCourseOriginalId: String(courseEntry?.courseId || "").trim(),
      homeCourseOriginalIntervalId: String(
        courseEntry?.intervalId || "",
      ).trim(),
      homeCourseIdDraft: String(courseEntry?.courseId || "").trim(),
      homeCourseCodeDraft: String(courseEntry?.courseCode || "").trim(),
      homeCourseComponentDraft: componentIds,
      homeCourseIntervalIdDraft: String(courseEntry?.intervalId || "").trim(),
    });
  };
  deleteHomeCourseEntry = async (courseEntry = {}) => {
    const targetCourseId = String(courseEntry?.courseId || "").trim();
    const targetIntervalId = String(courseEntry?.intervalId || "").trim();
    if (!targetCourseId || !targetIntervalId) {
      return;
    }
    const plannerRoot = this.getResolvedPlannerRoot();
    const currentIntervals = this.getPlannerIntervalsWithComponents(plannerRoot);
    const nextIntervals = currentIntervals.map((intervalEntry) => {
      const currentIntervalId = String(
        intervalEntry?.subIntervalId || intervalEntry?.intervalId || "",
      ).trim();
      const currentIntervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      if (currentIntervalId !== targetIntervalId) {
        return {
          ...intervalEntry,
          intervalCourses: currentIntervalCourses,
        };
      }
      return {
        ...intervalEntry,
        intervalCourses: currentIntervalCourses.filter(
          (entry) => String(entry?.courseId || "").trim() !== targetCourseId,
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
          : tab === "traces"
            ? "traces"
            : tab === "exams"
              ? "exams"
              : tab === "lectures"
                ? "lectures"
                : tab === "courses"
                  ? "courses"
                  : "plan";
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
      String(this.state?.lastNonSettingsWrapperTab || "plan").trim() || "plan";
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
        course_totalWeight: String(course?.course_totalWeight || "").trim(),
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
        course_totalWeight: String(
          selectedCourse?.course_totalWeight || "",
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
    const courseTotalWeight = String(
      savedCourseDraft?.course_totalWeight || "",
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
            course_totalWeight: courseTotalWeight || "",
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
        course_totalWeight: courseTotalWeight,
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
          course_totalWeight: courseTotalWeight || "",
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
      course_totalWeight: courseTotalWeight,
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
        <div className="nogaPlanner_monitorEmpty">
          {NOGAPLANNER_TEXT.messages.selectItemForDetails}
        </div>
      );
    }
    if (plannerTab === "courses") {
      // Show course details
      return (
        <section
          id="nogaPlanner_lectures_section"
          className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--monitor"
        >
          <div className="nogaPlanner_monitorDetails">
            <h2>{item.course_name}</h2>
            <p>
              {formatCourseComponentLabel(
                item.course_component || item.course_class,
                "ar",
              )}
            </p>
            <p>{formatCourseScheduleDisplay(item.course_dayAndTime)}</p>
            <p>{`${"Original Year"}: ${normalizeProgramYearValue(item.programYear || item.course_programYear || item.time?.programYear) || "-"}`}</p>
            <p>{formatCourseLocationDisplay(item.course_location)}</p>
            <p>{`${"Weight"}: ${item.course_grade || "-"}`}</p>
            <p>{`${"Grade"}: ${item.course_fullGrade || "-"}`}</p>
            <p>{`${"Volume"}: ${item.course_length || 0}`}</p>
            <p>{`${"Progress"}: ${item.course_progress || 0}`}</p>
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
          <div className="nogaPlanner_monitorDetails">
            <h2>{item.lecture_title}</h2>
            <p>{item.lecture_courseName}</p>
            <p>{item.lecture_instructorName}</p>
            <p>{item.lecture_writerName}</p>
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
    const initialStudyPlanAid = normalizeStudyPlanAid(
      props?.state?.studyPlanAid && typeof props.state.studyPlanAid === "object"
        ? props.state.studyPlanAid
        : props?.state?.studyPlanner?.studyPlanAid &&
            typeof props.state.studyPlanner.studyPlanAid === "object"
          ? props.state.studyPlanner.studyPlanAid
          : props?.state?.memory?.MOI?.studyPlanner?.studyPlanAid &&
              typeof props.state.memory.MOI.studyPlanner.studyPlanAid ===
                "object"
            ? props.state.memory.MOI.studyPlanner.studyPlanAid
            : {},
    );
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
      initialPlannerRoot?.programId || "",
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
    const initialPlannerIntervalPassingThresholdMode = String(
      initialPlannerRoot?.programPassingThresholdPerInterval?.thresholdMode ?? "",
    ).trim();
    const initialPlannerIntervalPassingThresholdUnit = String(
      initialPlannerRoot?.programPassingThresholdPerInterval?.thresholdUnit ?? "",
    ).trim();
    const initialPlannerIntervalPassingThresholdNumber = String(
      initialPlannerRoot?.programPassingThresholdPerInterval?.thresholdNumber ?? "",
    ).trim();
    const initialPlannerComponents = Array.isArray(
      initialPlannerRoot?.programComponents,
    )
      ? initialPlannerRoot.programComponents
      : [];
    const initialPlannerComponentIds = initialPlannerComponents
      .map((entry) => ({
        componentId: String(entry?.componentId || "").trim(),
        componentIntervals: Array.isArray(entry?.componentIntervals)
          ? entry.componentIntervals
          : [],
      }))
      .filter((entry) => Boolean(entry.componentId));
    this.state = {
      ui_locale: initialLocale,
      wrapperTab: "home",
      plannerTab: "home",
      lastNonSettingsWrapperTab: "home",
      studyPlanAid: initialStudyPlanAid,
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
      homeExpectedIntervalsGenerated: false,
      homeIntervalStatusDrafts: {},
      homeManualIntervalYearDraft: "",
      homeManualIntervalTermDraft: "",
      homeManualIntervalsDraftList: [],
      homeDeletedIntervalIds: [],
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
      homeComponentsDraftList: initialPlannerComponentIds,
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
      homeCourseIdDraft: "",
      homeCourseCodeDraft: "",
      homeCourseComponentDraft: [],
      homeCourseIntervalIdDraft: "",
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
    this.plannerAutoGeneratedIdCounter = 0;
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
  assignMissingPlannerElementIds = () => {
    const plannerRoot = this.plannerArticleRef?.current;
    if (!plannerRoot || typeof plannerRoot.querySelectorAll !== "function") {
      return;
    }
    if (!plannerRoot.id) {
      plannerRoot.id = "nogaPlanner_article";
    }
    const elementsWithoutIds = plannerRoot.querySelectorAll("*:not([id])");
    elementsWithoutIds.forEach((element) => {
      const tagName = String(element?.tagName || "node").toLowerCase();
      if (!tagName || tagName === "script" || tagName === "style") {
        return;
      }
      this.plannerAutoGeneratedIdCounter += 1;
      element.id = `nogaPlanner_auto_${tagName}_${this.plannerAutoGeneratedIdCounter}`;
    });
  };
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
  componentDidMount() {
    this.isComponentMounted = true;
    this.notifyPresenceMode("studying");
    this.enablePlannerBrowserZoom();
    this.assignMissingPlannerElementIds();
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
    if (this.state?.wrapperTab === "home") {
      this.loadHomePlannerData().catch(() => {});
    }
    this.syncPlannerVoiceControl();
  }
  componentDidUpdate(prevProps, prevState) {
    this.assignMissingPlannerElementIds();
    const nextPropsPlannerRoot = this.extractPlannerRootFromState(
      this.props?.state || {},
    );
    const prevPropsPlannerRoot = this.extractPlannerRootFromState(
      prevProps?.state || {},
    );
    const nextPropsProgramId = String(
      nextPropsPlannerRoot?.programId || "",
    ).trim();
    const prevPropsProgramId = String(
      prevPropsPlannerRoot?.programId || "",
    ).trim();
    const currentStateProgramId = String(
      this.state?.plannerRoot?.programId || "",
    ).trim();
    const nextPropsHasComponents =
      Array.isArray(nextPropsPlannerRoot?.programComponents) &&
      nextPropsPlannerRoot.programComponents.length > 0;
    if (
      nextPropsProgramId &&
      (nextPropsProgramId !== prevPropsProgramId ||
        nextPropsProgramId !== currentStateProgramId)
    ) {
      const nextComponentIds = Array.isArray(
        nextPropsPlannerRoot?.programComponents,
      )
        ? nextPropsPlannerRoot.programComponents
            .map((entry) => ({
              componentId: String(entry?.componentId || "").trim(),
              componentIntervals: Array.isArray(entry?.componentIntervals)
                ? entry.componentIntervals
                : [],
            }))
            .filter((entry) => Boolean(entry.componentId))
        : [];
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
        homeIntervalPassingThresholdModeValue: String(
          nextPropsPlannerRoot?.programPassingThresholdPerInterval
            ?.thresholdMode ?? "",
        ).trim(),
        homeIntervalPassingThresholdModeDraft:
          String(
            previousState?.homeIntervalPassingThresholdModeDraft || "",
          ).trim() ||
          String(
            nextPropsPlannerRoot?.programPassingThresholdPerInterval
              ?.thresholdMode ?? "",
          ).trim(),
        homeIntervalPassingThresholdUnitValue: String(
          nextPropsPlannerRoot?.programPassingThresholdPerInterval
            ?.thresholdUnit ?? "",
        ).trim(),
        homeIntervalPassingThresholdUnitDraft:
          String(
            previousState?.homeIntervalPassingThresholdUnitDraft || "",
          ).trim() ||
          String(
            nextPropsPlannerRoot?.programPassingThresholdPerInterval
              ?.thresholdUnit ?? "",
          ).trim(),
        homeIntervalPassingThresholdNumberValue: String(
          nextPropsPlannerRoot?.programPassingThresholdPerInterval
            ?.thresholdNumber ?? "",
        ).trim(),
        homeIntervalPassingThresholdNumberDraft:
          String(
            previousState?.homeIntervalPassingThresholdNumberDraft || "",
          ).trim() ||
          String(
            nextPropsPlannerRoot?.programPassingThresholdPerInterval
              ?.thresholdNumber ?? "",
          ).trim(),
        homeProgramCardSet: true,
        homeComponentsCardSet:
          Boolean(previousState?.homeComponentsCardSet) ||
          nextPropsHasComponents,
        homeComponentsDraftList:
          nextComponentIds.length > 0
            ? nextComponentIds
            : previousState?.homeComponentsDraftList || [],
      }));
      return;
    }
    if (nextPropsHasComponents && !this.state?.homeComponentsCardSet) {
      const nextComponentIds = Array.isArray(
        nextPropsPlannerRoot?.programComponents,
      )
        ? nextPropsPlannerRoot.programComponents
            .map((entry) => ({
              componentId: String(entry?.componentId || "").trim(),
              componentIntervals: Array.isArray(entry?.componentIntervals)
                ? entry.componentIntervals
                : [],
            }))
            .filter((entry) => Boolean(entry.componentId))
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
  }
  componentWillUnmount() {
    this.isComponentMounted = false;
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
        "\u0645\u0642\u0631\u0631\u0627\u062a",
        "\u0645\u0648\u0627\u062f",
        "courses",
      ])
    ) {
      return "courses";
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
    const components = Array.isArray(studying?.programComponents)
      ? studying.programComponents
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
    const plannerProgramId = String(plannerRoot?.programId || "").trim();
    const isProgramSet = Boolean(
      this.state?.homeProgramCardSet || plannerProgramId,
    );
    const isComponentsCardLocked = !isProgramSet;
    const isHomeCardsLocked = !isProgramSet;
    const plannerComponents = Array.isArray(plannerRoot?.programComponents)
      ? plannerRoot.programComponents
      : [];
    const plannerComponentIds = plannerComponents
      .map((entry) => ({
        componentId: String(entry?.componentId || "").trim(),
        componentIntervals: Array.isArray(entry?.componentIntervals)
          ? entry.componentIntervals
          : [],
      }))
      .filter((entry) => Boolean(entry.componentId));
    const plannerIntervalsFromComponents =
      this.getPlannerIntervalsWithComponents(plannerRoot)
        .map((intervalEntry) => {
          const intervalId = String(intervalEntry?.intervalId || "").trim();
          const parsedInterval = this.parseIntervalIdYearTerm(
            String(
              intervalEntry?.subIntervalId ||
                intervalEntry?.subintervalId ||
                intervalId,
            ).trim(),
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
          const intervalId = String(entry?.intervalId || "").trim();
          const subIntervalId = String(
            entry?.subIntervalId || entry?.subintervalId || entry?.intervalId || "",
          ).trim();
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          if (parsedInterval.year && parsedInterval.term) {
            const intervalKey = String(entry?.key || subIntervalId).trim();
            return {
              key: intervalKey,
              intervalId,
              subIntervalId,
              regular:
                typeof entry?.regular === "boolean"
                  ? entry.regular
                  : Boolean(entry?.expected),
              year: parsedInterval.year || "-",
              term: parsedInterval.term || "-",
              intervalStatus:
                String(entry?.intervalStatus || "TBD").trim() || "TBD",
              startDate: "",
              endDate: "",
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
            subIntervalId,
            regular:
              typeof entry?.regular === "boolean"
                ? entry.regular
                : Boolean(entry?.expected),
            year: intervalYear || "-",
            term: intervalTerm || "-",
            intervalStatus:
              String(entry?.intervalStatus || "TBD").trim() || "TBD",
            startDate,
            endDate,
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
        return intervalCourses.map((courseEntry, courseIndex) => ({
          key: `${subIntervalId}_${courseIndex}_${String(
            courseEntry?.courseId || "",
          ).trim()}`,
          courseId: String(courseEntry?.courseId || "").trim(),
          courseCode: String(courseEntry?.courseCode || "").trim(),
          componentIds: (Array.isArray(courseEntry?.courseComponents)
            ? courseEntry.courseComponents
            : []
          )
            .map((componentEntry) =>
              String(componentEntry?.componentId || "").trim(),
            )
            .filter(Boolean),
          intervalId: subIntervalId,
        }));
      })
      .filter((entry) => Boolean(entry.courseId) && Boolean(entry.intervalId));
    const coursesHasRegisteredValue = homeCoursesRows.length > 0;
    const coursesEditorOpen = Boolean(this.state?.homeCoursesEditorOpen);
    const courseIdDraftValue = String(
      this.state?.homeCourseIdDraft || "",
    ).trim();
    const courseCodeDraftValue = String(
      this.state?.homeCourseCodeDraft || "",
    ).trim();
    const courseComponentDraftValues = Array.from(
      new Set(
        (Array.isArray(this.state?.homeCourseComponentDraft)
          ? this.state.homeCourseComponentDraft
          : [this.state?.homeCourseComponentDraft]
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    const courseIntervalDraftValue = String(
      this.state?.homeCourseIntervalIdDraft || "",
    ).trim();
    const canSubmitCourses = Boolean(
      courseIdDraftValue &&
      courseCodeDraftValue &&
      courseComponentDraftValues.length > 0 &&
      courseIntervalDraftValue,
    );
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
    const intervalPassingThresholdHasRegisteredValue = Boolean(
      registeredIntervalPassingThresholdMode &&
      registeredIntervalPassingThresholdUnit &&
        registeredIntervalPassingThresholdNumber,
    );
    const intervalPassingThresholdModeDraftValue = String(
      this.state?.homeIntervalPassingThresholdModeDraft || "",
    ).trim();
    const intervalPassingThresholdUnitDraftValue = String(
      this.state?.homeIntervalPassingThresholdUnitDraft || "",
    ).trim();
    const intervalPassingThresholdNumberDraftValue = String(
      this.state?.homeIntervalPassingThresholdNumberDraft || "",
    ).trim();
    const isIntervalPassingThresholdReady = Boolean(
      intervalPassingThresholdModeDraftValue &&
      intervalPassingThresholdUnitDraftValue &&
        intervalPassingThresholdNumberDraftValue,
    );
    const isIntervalPassingThresholdDirty =
      intervalPassingThresholdModeDraftValue !==
        registeredIntervalPassingThresholdMode ||
      intervalPassingThresholdUnitDraftValue !==
        registeredIntervalPassingThresholdUnit ||
      intervalPassingThresholdNumberDraftValue !==
        registeredIntervalPassingThresholdNumber;
    const canSubmitIntervalPassingThreshold =
      isIntervalPassingThresholdReady &&
      (!intervalPassingThresholdHasRegisteredValue ||
        isIntervalPassingThresholdDirty);
    const homeCoursesPreviewRows = (() => {
      const editingKey = String(this.state?.homeCourseEditingKey || "").trim();
      const nextRows = editingKey
        ? homeCoursesRows.filter(
            (entry) => String(entry?.key || "").trim() !== editingKey,
          )
        : [...homeCoursesRows];
      const hasDraftValues = Boolean(
        courseIdDraftValue ||
        courseCodeDraftValue ||
        courseComponentDraftValues.length > 0 ||
        courseIntervalDraftValue,
      );
      if (!coursesEditorOpen || !hasDraftValues) {
        return nextRows;
      }
      nextRows.unshift({
        key: `draft_${editingKey || "new"}`,
        courseId: courseIdDraftValue || "-",
        courseCode: courseCodeDraftValue || "-",
        componentIds: courseComponentDraftValues,
        intervalId: courseIntervalDraftValue || "-",
        isPreview: true,
      });
      return nextRows;
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
          .map((entry) => String(entry?.intervalId || "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => Number(left || 0) - Number(right || 0));
    const isHomeIntervalsReady =
      hasGeneratedExpectedIntervalsPreview ||
      manualIntervalsDraftList.length > 0;
    const intervalStatusDrafts =
      this.state?.homeIntervalStatusDrafts &&
      typeof this.state.homeIntervalStatusDrafts === "object"
        ? this.state.homeIntervalStatusDrafts
        : {};
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
        ? this.buildHomeGeneratedIntervals(
            this.state?.homeProgramStartYearValue,
            this.state?.homeProgramTotalYearsValue,
            this.state?.homeProgramTermsPerYearValue,
          )
        : [];
      const previewGeneratedEntries = generatedIntervals
        .map((entry) => {
          const intervalId = String(entry?.intervalId || "").trim();
          const subIntervalId = String(
            entry?.subIntervalId || entry?.subintervalId || "",
          ).trim();
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          if (!parsedInterval.year || !parsedInterval.term) {
            return null;
          }
          return {
            key: subIntervalId,
            intervalId,
            subIntervalId,
            regular: typeof entry?.regular === "boolean" ? entry.regular : true,
            year: parsedInterval.year || "-",
            term: parsedInterval.term || "-",
            intervalStatus:
              String(entry?.intervalStatus || "TBD").trim() || "TBD",
            startDate: "",
            endDate: "",
            isPreview: true,
            previewType: "expected",
          };
        })
        .filter(Boolean);
      const previewManualEntries = manualIntervalsDraftList
        .map((entry) => {
          const intervalId = String(entry?.intervalId || "").trim();
          const subIntervalId = String(
            entry?.subIntervalId || entry?.subintervalId || entry?.intervalId || "",
          ).trim();
          const parsedInterval = this.parseIntervalIdYearTerm(
            subIntervalId || entry?.key,
          );
          if (!parsedInterval.year || !parsedInterval.term) {
            return null;
          }
          return {
            key: subIntervalId,
            intervalId,
            subIntervalId,
            regular:
              typeof entry?.regular === "boolean" ? entry.regular : false,
            year: parsedInterval.year || "-",
            term: parsedInterval.term || "-",
            intervalStatus:
              String(entry?.intervalStatus || "TBD").trim() || "TBD",
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
        .map((entry) => {
          const intervalKey = String(entry?.key || "").trim();
          const intervalDraftKey =
            entry?.regular === false
              ? `sub:${intervalKey}`
              : `interval:${String(entry?.intervalId || "").trim()}`;
          const draftedStatus = String(
            intervalStatusDrafts?.[intervalDraftKey] || "",
          ).trim();
          return draftedStatus
            ? {
                ...entry,
                intervalStatus: draftedStatus,
              }
            : entry;
        })
        .filter(
          (entry) =>
            Boolean(entry) &&
            !deletedIntervalIds.includes(
              String(entry?.key || entry?.intervalId || "").trim(),
            ),
        );
    })();
    const homeIntervalsDisplayRows = [...homeIntervalsPreview].reverse();
    const intervalYearGroupRows = (() => {
      const groupedRows = [];
      let rowIndex = 0;
      while (rowIndex < homeIntervalsDisplayRows.length) {
        const intervalEntry = homeIntervalsDisplayRows[rowIndex] || {};
        if (intervalEntry?.regular === false) {
          groupedRows.push({
            rowIndex,
            rowSpan: 1,
            groupIndex: 0,
            groupLabel: "+",
          });
          rowIndex += 1;
          continue;
        }
        const programIntervalId = String(intervalEntry?.intervalId || "").trim();
        if (!programIntervalId) {
          groupedRows.push({
            rowIndex,
            rowSpan: 1,
            groupIndex: 0,
            groupLabel: "-",
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
          if (String(nextEntry?.intervalId || "").trim() !== programIntervalId) {
            break;
          }
          rowSpan += 1;
        }
        groupedRows.push({
          rowIndex,
          rowSpan,
          groupIndex: Number(programIntervalId) || 0,
          groupLabel: programIntervalId,
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
      plannerComponentIds.map((entry) => entry?.componentId),
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
      ).map((entry) =>
        entry && typeof entry === "object" ? entry?.componentId : entry,
      ),
    );
    const isComponentsReady = draftComponentIdsForCompare.length > 0;
    const isComponentsDirty =
      JSON.stringify(draftComponentIdsForCompare) !==
      JSON.stringify(registeredComponentIdsForCompare);
    const canSubmitComponents =
      isComponentsReady && (!componentsHasRegisteredValue || isComponentsDirty);
    const intervalEditorOpen = Boolean(this.state?.homeIntervalToolbarOpen);
    const intervalsHasRegisteredValue = normalizedIntervals.length > 0;
    const registeredIntervalsForCompare = normalizedIntervals
      .map((entry) => ({
        intervalId: String(entry?.intervalId || "").trim(),
        subIntervalId: String(
          entry?.key || entry?.subIntervalId || entry?.intervalId || "",
        ).trim(),
        regular: Boolean(entry?.regular),
        intervalStatus: String(entry?.intervalStatus || "TBD").trim() || "TBD",
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
        intervalStatus: String(entry?.intervalStatus || "TBD").trim() || "TBD",
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
      { key: "courses", label: "Courses" },
      { key: "lectures", label: "Lectures" },
      { key: "documents", label: "Documents" },
    ];
    const activeHomePanelModeTab =
      String(this.state?.homePanelModeTab || "intervals").trim() ||
      "intervals";
    return (
      <section id="nogaPlanner_homePanel" className="nogaPlanner_homePanel">
        <div className="nogaPlanner_homePanelGrid">
          <div className="nogaPlanner_homePanelColumn nogaPlanner_homePanelColumn--left">
            <div className="nogaPlanner_homePanelCard">
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Program</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {programEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={!canSubmitProgram}
                      onClick={this.handleHomeProgramSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      onClick={() => {
                        this.setState({
                          homeProgramSetEditorOpen: true,
                          homeProgramIdDraft: String(
                            this.state?.homeProgramIdDraft ||
                              plannerProgramId ||
                              programName,
                          ),
                        });
                      }}
                    >
                      {programHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {programEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      onClick={this.cancelHomeProgramEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {this.state?.homeProgramSetEditorOpen ? (
                <input
                  type="text"
                  name="homeProgramId"
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
                <span id="nogaPlanner_auto_span_140">
                  {plannerProgramId || programName || "-"}
                </span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Language</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {languageEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitLanguage}
                      onClick={this.handleHomeLanguageSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
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
                <span>{programLanguage || "-"}</span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Program Start Year</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {programStartYearEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitProgramStartYear}
                      onClick={this.handleHomeProgramStartYearSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
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
                <span>{registeredProgramStartYear || "-"}</span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Program Total Years</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {programTotalYearsEditorOpen ? (
                    <button
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
                <span>{registeredProgramTotalYears || "-"}</span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Program Terms Per Year</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {programTermsPerYearEditorOpen ? (
                    <button
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
                <span>{registeredProgramTermsPerYear || "-"}</span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Program Passing Rules</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {intervalPassingThresholdEditorOpen ? (
                    <button
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
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() => {
                        this.setState({
                          homeIntervalPassingThresholdEditorOpen: true,
                          homeIntervalPassingThresholdModeDraft: String(
                            this.state?.homeIntervalPassingThresholdModeValue ||
                              "",
                          ),
                          homeIntervalPassingThresholdUnitDraft: String(
                            this.state?.homeIntervalPassingThresholdUnitValue ||
                              "",
                          ),
                          homeIntervalPassingThresholdNumberDraft: String(
                            this.state?.homeIntervalPassingThresholdNumberValue ||
                              "",
                          ),
                        });
                      }}
                    >
                      {intervalPassingThresholdHasRegisteredValue
                        ? "Edit"
                        : "Set"}
                    </button>
                  )}
                  {intervalPassingThresholdEditorOpen ? (
                    <button
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
                <div className="nogaPlanner_homeIntervalsAddRow">
                  <select
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
                    <option value="Component">Component</option>
                    <option value="Lecture">Lecture</option>
                  </select>
                  <select
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
                    <option value="Grade (%)">Grade (%)</option>
                    <option value="Grade (number)">Grade (number)</option>
                    <option value="Grade (letter)">Grade (letter)</option>
                    <option value="Amount">Amount</option>
                  </select>
                  <input
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
                </div>
              ) : (
                <span>
                  {intervalPassingThresholdHasRegisteredValue
                    ? `${registeredIntervalPassingThresholdMode}: ${registeredIntervalPassingThresholdNumber} ${registeredIntervalPassingThresholdUnit}`
                    : "-"}
                </span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>University</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {universityEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitUniversity}
                      onClick={this.handleHomeUniversitySetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
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
                <span>{locationUniversity || "-"}</span>
              )}
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Faculty</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {facultyEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitFaculty}
                      onClick={this.handleHomeFacultySetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
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
                <span>
                  {locationFaculty ? `The Faculty of ${locationFaculty}` : "-"}
                </span>
              )}
            </div>
          </div>
          <div className="nogaPlanner_homePanelColumn nogaPlanner_homePanelColumn--right">
            <div className="nogaPlanner_homePanelModesHeader">
              <strong>Modes of Program</strong>
              <div className="nogaPlanner_homePanelModeTabs">
                {homePanelModeTabs.map((tabEntry) => (
                  <button
                    key={`nogaPlanner_homePanelModeTab_${tabEntry.key}`}
                    type="button"
                    className={
                      "nogaPlanner_homePanelModeTab" +
                      (activeHomePanelModeTab === tabEntry.key
                        ? " is-active"
                        : "")
                    }
                    onClick={() =>
                      this.setState({ homePanelModeTab: tabEntry.key })
                    }
                  >
                    {tabEntry.label}
                  </button>
                ))}
              </div>
            </div>
            <div
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
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Intervals</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {intervalEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitIntervals}
                      onClick={this.addHomeTableInterval}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
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
                  {intervalEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                      disabled={isHomeCardsLocked}
                      onClick={this.cancelHomeIntervalsEditor}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
              {this.state?.homeIntervalToolbarOpen ? (
                <div
                  className="nogaPlanner_homeIntervalsMiniForm"
                  id="nogaPlanner_auto_tr_150"
                >
                  <button
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
                </div>
              ) : null}
              {this.state?.homeIntervalToolbarOpen ? (
                <div className="nogaPlanner_homeIntervalsManualBlock">
                  <span className="nogaPlanner_homeIntervalsHelper">
                    Unusual sub-Intervals
                  </span>
                  <div className="nogaPlanner_homeIntervalsAddRow">
                  <select
                      name="homeManualIntervalId"
                      className="nogaPlanner_homeIntervalsInput"
                      disabled={isHomeCardsLocked}
                      value={String(
                        this.state?.homeManualIntervalIdDraft || "",
                      )}
                      onChange={(event) =>
                        this.setState({
                          homeManualIntervalIdDraft: String(
                            event.target.value || "",
                          ).trim(),
                        })
                      }
                    >
                      <option value="">Interval</option>
                      {manualIntervalOptions.map((intervalOption) => (
                        <option
                          key={`nogaPlanner_homeManualIntervalOption_${intervalOption}`}
                          value={intervalOption}
                        >
                          {intervalOption}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="homeManualIntervalYear"
                      className="nogaPlanner_homeIntervalsInput"
                      placeholder="YEAR"
                      disabled={isHomeCardsLocked}
                      value={String(
                        this.state?.homeManualIntervalYearDraft || "",
                      )}
                      onChange={(event) =>
                        this.setState({
                          homeManualIntervalYearDraft: String(
                            event.target.value || "",
                          ).trim(),
                        })
                      }
                    />
                    <select
                      name="homeManualIntervalTerm"
                      className="nogaPlanner_homeIntervalsInput"
                      disabled={isHomeCardsLocked}
                      value={String(
                        this.state?.homeManualIntervalTermDraft || "",
                      )}
                      onChange={(event) =>
                        this.setState({
                          homeManualIntervalTermDraft: String(
                            event.target.value || "",
                          ).trim(),
                        })
                      }
                    >
                      <option value="">TERM</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={this.appendHomeManualIntervalEntry}
                    >
                      Add
                    </button>
                  </div>
                  {manualIntervalsDraftList.length > 0 ? (
                    <div className="nogaPlanner_homeIntervalsManualList">
                      {manualIntervalsDraftList.map((entry) => (
                        <div
                          key={`nogaPlanner_homeManualInterval_${entry.intervalId}_${entry.subIntervalId}`}
                          className="nogaPlanner_homeIntervalsManualItem"
                        >
                          <span>
                            {String(entry?.intervalId || "").trim() || "-"}:{" "}
                            {String(entry?.subIntervalId || "").trim() || "-"}
                          </span>
                          <button
                            type="button"
                            className="nogaPlanner_homeIntervalsManualRemoveBtn"
                            disabled={isHomeCardsLocked}
                            onClick={() =>
                              this.removeHomeManualIntervalEntry(
                                entry.subIntervalId,
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="nogaPlanner_homeIntervalsDangerRow">
                <button
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                  disabled={homeIntervalsPreview.length === 0}
                  onClick={() =>
                    this.deleteAllHomeIntervals(
                      homeIntervalsPreview.map(
                        (entry) => entry?.key || entry?.intervalId,
                      ),
                    )
                  }
                >
                  Delete All
                </button>
              </div>
              <table className="nogaPlanner_homeIntervalsMiniTable">
                <thead>
                  <tr>
                    <th
                      className="nogaPlanner_homeIntervalsYearIndexCell"
                      rowSpan={2}
                    >
                      Intervals
                    </th>
                    <th colSpan={2}>subIntervals</th>
                    <th rowSpan={2}>Status</th>
                    <th rowSpan={2}>Actions</th>
                  </tr>
                  <tr>
                    <th>YEAR</th>
                    <th>TERM</th>
                  </tr>
                </thead>
                <tbody>
                  {homeIntervalsDisplayRows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No intervals yet.</td>
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
                        intervalEntry?.intervalStatus || "",
                      )
                        .trim()
                        .toLowerCase();
                      const isCurrent =
                        intervalStatusValue === "current" ||
                        (currentIntervalKey
                          ? currentIntervalKey === intervalEntry.key
                          : intervalEntry.year === currentInterval &&
                            intervalEntry.term === currentTerm);
                      return (
                        <tr
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
                              rowSpan={intervalYearGroupMeta.rowSpan}
                            >
                              <span className="nogaPlanner_homeIntervalsYearIndexCellInner">
                                {intervalYearGroupMeta.groupLabel || "-"}
                              </span>
                            </td>
                          ) : null}
                          <td>
                            {intervalDisplay.year || intervalEntry.year || "-"}
                          </td>
                          <td>
                            {intervalDisplay.term || intervalEntry.term || "-"}
                          </td>
                          {intervalYearGroupMeta ? (
                            <td rowSpan={intervalYearGroupMeta.rowSpan}>
                              {this.state?.homeIntervalToolbarOpen ? (
                                <select
                                  name="homeIntervalStatus"
                                  className="nogaPlanner_homeIntervalsInput"
                                  value={String(
                                    intervalEntry?.intervalStatus || "TBD",
                                  )}
                                  onChange={(event) =>
                                    this.setState((previousState) => ({
                                      homeIntervalStatusDrafts: {
                                        ...(previousState?.homeIntervalStatusDrafts &&
                                        typeof previousState.homeIntervalStatusDrafts ===
                                          "object"
                                          ? previousState.homeIntervalStatusDrafts
                                          : {}),
                                        [intervalEntry?.regular === false
                                          ? `sub:${String(
                                              intervalEntry?.key ||
                                                intervalEntry?.subIntervalId ||
                                                intervalEntry?.intervalId ||
                                                "",
                                            ).trim()}`
                                          : `interval:${String(
                                              intervalEntry?.intervalId || "",
                                            ).trim()}`]:
                                          String(
                                            event.target.value || "TBD",
                                          ).trim() || "TBD",
                                      },
                                    }))
                                  }
                                >
                                  <option value="TBD">TBD</option>
                                  <option value="pending">Pending</option>
                                  <option value="Retaking">Retaking</option>
                                  <option value="passed">Passed</option>
                                  <option value="failed">Failed</option>
                                </select>
                              ) : (
                                intervalEntry.intervalStatus || "TBD"
                              )}
                              {String(intervalEntry?.intervalStatus || "")
                                .trim()
                                .toLowerCase() === "failed" ? (
                                <button
                                  type="button"
                                  className="nogaPlanner_homePanelCardSetBtn"
                                  disabled={isHomeCardsLocked}
                                  onClick={() =>
                                    this.triggerHomeIntervalRetaking(
                                      intervalEntry?.intervalId,
                                    )
                                  }
                                >
                                  Retaking?
                                </button>
                              ) : null}
                            </td>
                          ) : null}
                          <td>
                            <div className="nogaPlanner_homeIntervalRowActions">
                              <button
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.setHomeCurrentInterval(
                                    intervalEntry?.key ||
                                      intervalEntry?.subIntervalId ||
                                      intervalEntry?.intervalId,
                                  )
                                }
                              >
                                {isCurrent ? "Current" : "Set Current"}
                              </button>
                              <button
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                onClick={() =>
                                  this.deleteHomeIntervalEntry(
                                    intervalEntry?.key ||
                                      intervalEntry?.subIntervalId ||
                                      intervalEntry?.intervalId,
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div
              className={
                "nogaPlanner_homePanelCard" +
                (isHomeCardsLocked
                  ? " nogaPlanner_homePanelCard--disabled"
                  : "")
              }
              style={
                activeHomePanelModeTab === "courses"
                  ? undefined
                  : { display: "none" }
              }
            >
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Courses</strong>
                <div className="nogaPlanner_homePanelCardActions">
                  {coursesEditorOpen ? (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                      disabled={isHomeCardsLocked || !canSubmitCourses}
                      onClick={this.handleHomeCoursesSetSubmit}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nogaPlanner_homePanelCardSetBtn"
                      disabled={isHomeCardsLocked}
                      onClick={() =>
                        this.setState({
                          homeCoursesEditorOpen: true,
                          homeCourseEditingKey: "",
                          homeCourseOriginalId: "",
                          homeCourseOriginalIntervalId: "",
                          homeCourseIdDraft: "",
                          homeCourseCodeDraft: "",
                          homeCourseComponentDraft: [],
                          homeCourseIntervalIdDraft: "",
                        })
                      }
                    >
                      {coursesHasRegisteredValue ? "Edit" : "Set"}
                    </button>
                  )}
                  {coursesEditorOpen ? (
                    <button
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
                <div className="nogaPlanner_homeIntervalsAddRow">
                  <input
                    type="text"
                    name="homeCourseId"
                    className="nogaPlanner_homeIntervalsInput"
                    placeholder="Course ID"
                    disabled={isHomeCardsLocked}
                    value={String(this.state?.homeCourseIdDraft || "")}
                    onChange={(event) =>
                      this.setState({
                        homeCourseIdDraft: String(event.target.value || ""),
                      })
                    }
                  />
                  <input
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
                  <select
                    id="nogaPlanner_auto_select_154"
                    name="homeCourseComponent"
                    className="nogaPlanner_homeIntervalsInput"
                    disabled={isHomeCardsLocked}
                    value=""
                    onChange={(event) =>
                      this.setState((previousState) => {
                        const nextComponentId = String(
                          event.target.value || "",
                        ).trim();
                        const previousComponents = Array.isArray(
                          previousState?.homeCourseComponentDraft,
                        )
                          ? previousState.homeCourseComponentDraft
                              .map((entry) => String(entry || "").trim())
                              .filter(Boolean)
                          : [];
                        if (
                          !nextComponentId ||
                          previousComponents.includes(nextComponentId)
                        ) {
                          return null;
                        }
                        return {
                          homeCourseComponentDraft: [
                            ...previousComponents,
                            nextComponentId,
                          ],
                        };
                      })
                    }
                  >
                    <option value="">Component</option>
                    <option value="Class">Class</option>
                    <option value="Lab">Lab</option>
                    <option value="Other">Other</option>
                  </select>
                  {courseComponentDraftValues.length > 0 ? (
                    <div className="nogaPlanner_homeCourseComponentsDraftList">
                      {courseComponentDraftValues.map((componentId) => (
                        <span
                          key={`nogaPlanner_homeCourseDraftComponent_${componentId}`}
                          className="nogaPlanner_homeCourseComponentsDraftItem"
                        >
                          <span>{componentId}</span>
                          <button
                            type="button"
                            className="nogaPlanner_homeIntervalsManualRemoveBtn"
                            disabled={isHomeCardsLocked}
                            onClick={() =>
                              this.setState((previousState) => ({
                                homeCourseComponentDraft: (Array.isArray(
                                  previousState?.homeCourseComponentDraft,
                                )
                                  ? previousState.homeCourseComponentDraft
                                  : []
                                ).filter(
                                  (entry) =>
                                    String(entry || "").trim() !== componentId,
                                ),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <select
                    name="homeCourseIntervalId"
                    className="nogaPlanner_homeIntervalsInput"
                    disabled={isHomeCardsLocked}
                    value={String(this.state?.homeCourseIntervalIdDraft || "")}
                    onChange={(event) =>
                      this.setState({
                        homeCourseIntervalIdDraft: String(
                          event.target.value || "",
                        ),
                      })
                    }
                  >
                    <option value="">YEAR-TERM</option>
                    {normalizedIntervals.map((intervalEntry) => {
                      const subIntervalId = String(
                        intervalEntry?.subIntervalId ||
                          intervalEntry?.subintervalId ||
                          intervalEntry?.intervalId ||
                          "",
                      ).trim();
                      const intervalParts =
                        this.parseIntervalIdYearTerm(subIntervalId);
                      return (
                        <option
                          key={`nogaPlanner_homeCourseInterval_${subIntervalId}`}
                          value={subIntervalId}
                        >
                          {`${intervalParts.year || "-"}-${intervalParts.term || "-"}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}
              <table className="nogaPlanner_homeIntervalsMiniTable">
                <thead>
                  <tr>
                    <th>Course ID</th>
                    <th>Course Code</th>
                    <th>Components</th>
                    <th>Interval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {homeCoursesPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No courses yet.</td>
                    </tr>
                  ) : (
                    homeCoursesPreviewRows.map((courseEntry) => (
                      <tr
                        key={`nogaPlanner_homeCourseRow_${courseEntry.key}`}
                        className={courseEntry?.isPreview ? "is-preview" : ""}
                      >
                        <td>{courseEntry.courseId}</td>
                        <td>{courseEntry.courseCode || "-"}</td>
                        <td>
                          {courseEntry.componentIds.length > 0
                            ? courseEntry.componentIds.join(", ")
                            : "-"}
                        </td>
                        <td>{courseEntry.intervalId}</td>
                        <td>
                          {courseEntry?.isPreview ? (
                            <span>Preview</span>
                          ) : (
                            <div className="nogaPlanner_homeIntervalRowActions">
                              <button
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.editHomeCourseEntry(courseEntry)
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel"
                                disabled={isHomeCardsLocked}
                                onClick={() =>
                                  this.deleteHomeCourseEntry(courseEntry)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div
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
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Lectures</strong>
              </div>
              <div className="nogaPlanner_homePanelCardBody">
                {this.renderSelectedCourseLecturesTable("full")}
              </div>
            </div>
            <div
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
              <div className="nogaPlanner_homePanelCardTitleRow">
                <strong>Documents</strong>
              </div>
              <div className="nogaPlanner_homePanelCardBody">
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
  getPlannerMainTabTitle = (wrapperTab = "plan") => {
    const plannerText = NOGAPLANNER_PANEL_RUNTIME.NOGAPLANNER_TEXT || {};
    if (wrapperTab === "home") {
      return "Home";
    }
    if (wrapperTab === "traces") {
      return "Study Materials";
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
  renderPlannerMainTabContent = (wrapperTab = "plan") => {
    if (wrapperTab === "home") {
      return this.renderPlannerHome();
    }
    if (wrapperTab === "traces") {
      return <NogaPlannerTelegramPanel planner={this} />;
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
      return (
        <div className="nogaPlanner_coursesTabMount">
          {this.renderSelectedCourseLecturesTable("full")}
          <NogaPlannerTelegramPanel
            planner={this}
            mode="language-only"
            languageSection="lectures"
          />
        </div>
      );
    }
    if (wrapperTab === "exams") {
      return this.renderSelectedCourseExamBoard(true);
    }
    if (wrapperTab === "courses") {
      return (
        <div className="nogaPlanner_coursesTabMount">
          {this.renderSavedCoursesColumn()}
          <NogaPlannerTelegramPanel
            planner={this}
            mode="language-only"
            languageSection="courses"
          />
        </div>
      );
    }
    return this.renderSelectedCourseStudyPlan();
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
      <div
        id="nogaPlanner_studyPlanTopControls"
        className="nogaPlanner_studyPlanTopControls"
      >
        <div className="nogaPlanner_studyPlanAttendanceMiniBar">
              <label className="nogaPlanner_studyPlanTopField">
                <span className="nogaPlanner_studyPlanTopFieldEyebrow">
                  Start date
                </span>
                <div className="nogaPlanner_savedCoursesDetailsInputs">
                  <select
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
              <label className="nogaPlanner_studyPlanTopField">
                <span className="nogaPlanner_studyPlanTopFieldEyebrow">
                  End date
                </span>
                <div className="nogaPlanner_savedCoursesDetailsInputs">
                  <select
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
        <div
          id="nogaPlanner_studyPlanAttendanceComponentTabs"
          className="nogaPlanner_studyPlanAttendanceComponentTabs"
        >
          <label className="nogaPlanner_studyPlanTopField">
            <span className="nogaPlanner_studyPlanTopFieldEyebrow">
              Component class
            </span>
            <select
              id="nogaPlanner_studyPlanAttendanceComponentSelect"
              name="studyPlanAttendanceComponent"
              className="nogaPlanner_savedCoursesDetailsInput"
              value={String(
                this.state?.studyPlanAttendanceComponentKey || "all",
              )}
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
        </div>
      </div>
    );
  };
  render() {
    const wrapperTab =
      this.state.wrapperTab === "home"
        ? "home"
        : this.state.wrapperTab === "traces"
          ? "traces"
          : this.state.wrapperTab === "exams"
            ? "exams"
            : this.state.wrapperTab === "lectures"
              ? "lectures"
              : this.state.wrapperTab === "courses"
                ? "courses"
                : this.state.wrapperTab === "settings"
                  ? "settings"
                  : "plan";
    const plannerBackgroundUrl = `${import.meta.env.BASE_URL}img/NogaPlannerBG.png`;
    const isPlannerPending =
      Number(this.state?.plannerPendingRequests || 0) > 0;
    const plannerPendingLabel =
      String(this.state?.plannerPendingLabel || "").trim() || "Working...";
    return (
      <React.Fragment>
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
              <p>{this.getPlannerMainTabTitle(wrapperTab)}</p>
              {isPlannerPending ? (
                <div
                  className="nogaPlanner_pendingIndicator"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="nogaPlanner_pendingSpinner"
                    aria-hidden="true"
                  />
                  <span className="nogaPlanner_pendingLabel">
                    {plannerPendingLabel}
                  </span>
                </div>
              ) : null}
            </div>
            {wrapperTab === "plan" ? this.renderStudyPlanControlsBar() : null}
            <div
              id="nogaPlanner_tablesMount"
              className="nogaPlanner_tablesMount"
            >
              {this.renderPlannerMainTabContent(wrapperTab)}
            </div>
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
