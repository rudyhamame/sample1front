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
        savedCourseDraft: this.applySavedCourseDraftComponentEntryToDraft(
          previousState.savedCourseDraft,
          componentEntry,
        ),
      };
    });
  };
  handleWrapperTabChange = (tab) => {
    const nextWrapperTab =
      tab === "exams" ? "exams" : tab === "lectures" ? "lectures" : "courses";
    this.setState({
      wrapperTab: nextWrapperTab,
      plannerTab: nextWrapperTab === "lectures" ? "lectures" : "courses",
      deleteSelectionMode: false,
      deleteSelectionIds: [],
      inlineCourseRowVisible: false,
      inlineCourseDraft: getDefaultInlineCourseDraft(),
      inlineComponentRowVisible: false,
      inlineComponentDraft: getDefaultInlineComponentDraft(),
    });
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
  submitInlineCourseRow = async () => {
    const { inlineCourseDraft } = this.state;
    const trimmedName = String(inlineCourseDraft?.course_name || "").trim();
    if (!trimmedName) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.submitCourseNameRequired);
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
  handleSavedCourseGroupClick = (course = {}) => {
    const componentId = String(course?._id || "").trim();
    const lectureCourseLabel = buildCourseLectureMatchLabel(course);
    if (!componentId) {
      return;
    }
    this.setState((previousState) => {
      if (!previousState?.savedCourseSelectionMode) {
        const previousSelectedIds = Array.isArray(
          previousState?.selectedSavedCourseIds,
        )
          ? previousState.selectedSavedCourseIds
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
          : [];
        const isAlreadySelected = previousSelectedIds.includes(componentId);
        if (isAlreadySelected && previousSelectedIds.length === 1) {
          return {
            plannerTab: "courses",
            selectedTabItemId: null,
            selectedSavedCourseIds: [],
            selectedCourseForLecturesId: "",
            selectedCourseForLecturesName: "",
            savedCourseDetailsComponentId: "",
            deleteSelectionMode: false,
            deleteSelectionIds: [],
          };
        }
        return {
          plannerTab: "courses",
          selectedTabItemId: null,
          selectedSavedCourseIds: [componentId],
          selectedCourseForLecturesId: componentId,
          selectedCourseForLecturesName: lectureCourseLabel,
          savedCourseDetailsComponentId: "",
          deleteSelectionMode: false,
          deleteSelectionIds: [],
        };
      }
      const previousSelectedIds = Array.isArray(
        previousState?.selectedSavedCourseIds,
      )
        ? previousState.selectedSavedCourseIds
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        : [];
      const isAlreadySelected = previousSelectedIds.includes(componentId);
      if (isAlreadySelected) {
        const nextSelectedIds = previousSelectedIds.filter(
          (entry) => entry !== componentId,
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
        selectedSavedCourseIds: [...previousSelectedIds, componentId],
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
    const response = await fetch(apiUrl("/api/user/studyOrganizer/settings/") + userId, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settings,
      }),
    });
    if (!response.ok) {
      throw new Error(`Planner settings save failed: ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    return payload?.settings || settings;
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
      this.setState({
        plannerSelectSettings: nextSettings,
        plannerSettingsLogoMotionEnabled:
          typeof nextSettings?.logoMotionEnabled === "boolean"
            ? nextSettings.logoMotionEnabled
            : true,
        plannerSettingsLogoFixedClock: String(
          nextSettings?.logoFixedClock || "9",
        ).trim(),
      });
    } catch (error) {
      console.error("[planner-select-settings] db read failed:", error);
    }
  };
  getPlannerRelationshipForClass = (settings, courseClassValue) => {
    const normalizedCourseClass = String(courseClassValue || "").trim();
    if (!normalizedCourseClass) {
      return null;
    }
    const relationships = Array.isArray(settings?.relationships)
      ? settings.relationships
      : [];
    return (
      relationships.find(
        (entry) =>
          String(entry?.course_classSelection || "").trim() ===
          normalizedCourseClass,
      ) || null
    );
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
    const relationshipFields = [
      "normativeCourseTerm",
      "actualCourseTerm",
      "course_daySelection",
      "course_timeSelection",
      "course_locationBuilding",
      "course_locationRoom",
      "course_grade",
    ];
    relationshipFields.forEach((fieldName) => {
      const relationshipValue = String(relationship?.[fieldName] || "").trim();
      if (!relationshipValue) {
        return;
      }
      if (
        forceRelationshipValues ||
        !String(nextDraft?.[fieldName] || "").trim()
      ) {
        nextDraft[fieldName] = relationshipValue;
      }
    });
    return nextDraft;
  };
  getPlannerProfileAcademicYear = () =>
    normalizeAcademicYearValue(
      this.props.state?.profile?.studying?.time?.currentAcademicYear ??
        this.props.state?.profile?.studying?.currentAcademicYear,
    ) || "";
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
      passed: "ناجح",
      pass: "ناجح",
      success: "ناجح",
      successful: "ناجح",
      failed: "راسب",
      fail: "راسب",
      ناجح: "ناجح",
      ناجحة: "ناجح",
      راسب: "راسب",
      راسبة: "راسب",
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
      return "جديد";
    }
    const exams = Array.isArray(draft?.course_exams) ? draft.course_exams : [];
    if (exams.length === 0) {
      return "يحدّد لاحقاً";
    }
    const explicitExamStatuses = exams
      .map((exam) =>
        this.classifySavedCourseExamStatus(
          exam?.grade?.status || exam?.resultStatus || exam?.status,
        ),
      )
      .filter(Boolean);
    if (explicitExamStatuses.some((status) => status === "راسب")) {
      return "راسب";
    }
    if (explicitExamStatuses.some((status) => status === "ناجح")) {
      return "ناجح";
    }
    return "يحدّد لاحقاً";
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
        this.getPlannerRelationshipForClass(
          plannerSelectSettings,
          nextDraft.course_classSelection || nextDraft.course_class,
        ),
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
      draft?.course_classSelection || draft?.course_class,
    );
    if (!relationship?.readOnly) {
      return new Set();
    }
    return new Set(
      [
        "normativeCourseTerm",
        "actualCourseTerm",
        "course_daySelection",
        "course_timeSelection",
        "course_locationBuilding",
        "course_locationRoom",
        "course_grade",
      ].filter((fieldName) =>
        Boolean(String(relationship?.[fieldName] || "").trim()),
      ),
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
    try {
      persistedSettings =
        normalizePlannerSelectSettings(
          await this.persistPlannerSelectSettings(nextSettings),
        ) || nextSettings;
    } catch (error) {
      const rawFailureMessage = String(
        error?.message || NOGAPLANNER_TEXT.messages.settingsSaveFailed,
      ).trim();
      const failureMessage =
        rawFailureMessage.toLowerCase().includes("failed to fetch")
          ? NOGAPLANNER_TEXT.messages.settingsServerUnreachable
          : rawFailureMessage;
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
          plannerSettingsSaveMessage: NOGAPLANNER_TEXT.messages.settingsSaved,
        },
        resolve,
      ),
    );
    return persistedSettings;
  };
  handlePlannerFieldDefaultChange = async (fieldKey, nextValue) => {
    return this.updatePlannerSelectSettings((previousSettings) => ({
      ...previousSettings,
      fieldDefaults: {
        ...(previousSettings.fieldDefaults || {}),
        [fieldKey]: nextValue,
      },
    }));
  };
  handlePlannerSettingsDefaultSectionChange = (nextSection) => {
    this.setState({
      plannerSettingsDefaultSection: nextSection,
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
    await this.updatePlannerSelectSettings((previousSettings) => {
      const currentDefaults =
        previousSettings?.fieldDefaults &&
        typeof previousSettings.fieldDefaults === "object"
          ? previousSettings.fieldDefaults
          : {};
      const nextDefaults = {
        ...currentDefaults,
      };
      sectionFieldKeys.forEach((fieldKey) => {
        nextDefaults[fieldKey] = "";
      });
      return {
        ...previousSettings,
        fieldDefaults: nextDefaults,
      };
    });
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
      fieldName === "plannerSettingsLogoFixedClock"
    ) {
      const normalizedClock = String(nextValue || "9")
        .trim()
        .replace(/[^\d]/g, "");
      const safeClock = /^[1-9]$|^1[0-2]$/.test(normalizedClock)
        ? normalizedClock
        : "9";
      const normalizedValue =
        fieldName === "plannerSettingsLogoMotionEnabled"
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
    const room = String(this.state?.plannerSettingsLocationRoomInput || "").trim();
    if (!building || !room) {
      return;
    }
    const editingIndex = Number(this.state?.plannerSettingsEditingLocationRoomIndex ?? -1);
    await this.updatePlannerSelectSettings((previousSettings) => {
      const grouped = Array.isArray(previousSettings?.locationRoomOptionsByBuilding)
        ? previousSettings.locationRoomOptionsByBuilding.map((entry) => ({
            building: String(entry?.building || "").trim(),
            rooms: Array.isArray(entry?.rooms)
              ? entry.rooms.map((value) => String(value || "").trim()).filter(Boolean)
              : [],
          }))
        : [];
      const groupIndex = grouped.findIndex((entry) => entry.building === building);
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
      plannerSettingsLocationRoomInput: String(rooms[selectedIndex] || "").trim(),
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
      const grouped = Array.isArray(previousSettings?.locationRoomOptionsByBuilding)
        ? previousSettings.locationRoomOptionsByBuilding.map((entry) => ({
            building: String(entry?.building || "").trim(),
            rooms: Array.isArray(entry?.rooms)
              ? entry.rooms.map((value) => String(value || "").trim()).filter(Boolean)
              : [],
          }))
        : [];
      const groupIndex = grouped.findIndex((entry) => entry.building === building);
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
      const grouped = Array.isArray(previousSettings?.locationRoomOptionsByBuilding)
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
          fieldKey,
          String(fieldValue || "").trim() === removedValue ? "" : fieldValue,
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
          return [fieldKey, shouldClear ? "" : fieldValue];
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
    if (!relationshipDraft.course_classSelection) {
      return;
    }
    await this.updatePlannerSelectSettings((previousSettings) => {
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
                ? relationshipDraft
                : entry,
            )
          : [
              ...currentRelationships.filter(
                (entry) =>
                  String(entry?.course_classSelection || "").trim() !==
                  relationshipDraft.course_classSelection,
              ),
              relationshipDraft,
            ];
      return {
        ...previousSettings,
        relationships: nextRelationships,
      };
    });
    this.setState({
      plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
      plannerSettingsEditingRelationshipId: "",
      plannerSettingsSaveStatus: "",
      plannerSettingsSaveMessage: "",
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
        plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
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
            nextValue,
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
    this.setState((previousState) => ({
      inlineLectureDraft: {
        ...previousState.inlineLectureDraft,
        [fieldName]: nextValue,
      },
    }));
  };
  togglePlannerSettings = () => {
    this.setState((previousState) => ({
      plannerSettingsVisible: !previousState.plannerSettingsVisible,
    }));
  };
  handleBackFromPlannerSettings = () => {
    this.setState({
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
    const componentOptions = this.getLectureComponentOptionsByCourseId(
      selectedCourseId,
    );
    const firstComponent = componentOptions[0] || null;
    const defaultCourseLabel = selectedCourse
      ? buildCourseLectureMatchLabel(selectedCourse)
      : "";
    this.setState({
      inlineLectureRowVisible: true,
      inlineLectureDraft: this.applyPlannerFieldDefaultsToDraft("inlineLecture", {
        ...getDefaultInlineLectureDraft(),
        lecture_courseId: selectedCourseId,
        lecture_componentId: firstComponent ? firstComponent.id : "",
        lecture_component: firstComponent ? firstComponent.label : "",
        lecture_course: defaultCourseLabel,
      }),
      selectedTabItemId: null,
    });
  };
  closeInlineLectureRow = () => {
    this.setState({
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
    });
  };
  getLectureCourseOptions = () =>
    (Array.isArray(this.state?.courses) ? this.state.courses : [])
      .map((course) => ({
        id: String(course?._id || "").trim(),
        label: String(course?.course_name || "").trim(),
      }))
      .filter((entry) => entry.id && entry.label);
  getLectureComponentOptionsByCourseId = (courseId = "") => {
    const selectedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (course) =>
          String(course?._id || "").trim() === String(courseId || "").trim(),
      ) || null;
    if (!selectedCourse) {
      return [];
    }
    const components = Array.isArray(selectedCourse?.course_components)
      ? selectedCourse.course_components
      : [];
    return components
      .map((component, index) => {
        const label = String(
          component?.course_class || component?.course_component || "",
        ).trim();
        const id = String(component?._id || `component-${index}`).trim();
        return {
          id,
          label,
        };
      })
      .filter((entry) => entry.label);
  };
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
    const fromCourses = (Array.isArray(this.state?.courses) ? this.state.courses : [])
      .flatMap((course) =>
        splitPlannerTextList(
          type === "writer" ? course?.course_writer : course?.course_instructor,
        ),
      )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    const fromLectures = (Array.isArray(this.state?.lectures)
      ? this.state.lectures
      : []
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
    return Array.from(new Set([...fromSettings, ...fromCourses, ...fromLectures]));
  };
  handleInlineLectureCourseChange = (nextCourseId) => {
    const normalizedCourseId = String(nextCourseId || "").trim();
    const selectedCourse =
      (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
        (course) => String(course?._id || "").trim() === normalizedCourseId,
      ) || null;
    const components = this.getLectureComponentOptionsByCourseId(
      normalizedCourseId,
    );
    const firstComponent = components[0] || null;
    this.setState((previousState) => ({
      inlineLectureDraft: {
        ...previousState.inlineLectureDraft,
        lecture_courseId: normalizedCourseId,
        lecture_course: selectedCourse ? buildCourseLectureMatchLabel(selectedCourse) : "",
        lecture_componentId: firstComponent ? firstComponent.id : "",
        lecture_component: firstComponent ? firstComponent.label : "",
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
          ...(Array.isArray(previousState.inlineLectureDraft?.lecture_contentUploads)
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
        ).filter((entry) => String(entry?.id || "").trim() !== normalizedFileId),
      },
    }));
  };
  submitInlineLectureRow = async () => {
    const { inlineLectureDraft } = this.state;
    const lectureName = String(inlineLectureDraft?.lecture_name || "").trim();
    if (!lectureName) {
      return;
    }
    const contentUploads = Array.isArray(inlineLectureDraft?.lecture_contentUploads)
      ? inlineLectureDraft.lecture_contentUploads
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
      lecture_instructor: splitPlannerTextList(inlineLectureDraft?.lecture_instructors),
      lecture_instructors: splitPlannerTextList(inlineLectureDraft?.lecture_instructors),
      lecture_writer: splitPlannerTextList(inlineLectureDraft?.lecture_writers),
      lecture_writers: splitPlannerTextList(inlineLectureDraft?.lecture_writers),
      lecture_date: String(inlineLectureDraft?.lecture_date || "").trim(),
      lecture_length: contentUploads.length,
      lecture_content: contentUploads.map((entry, index) => ({
        order: index + 1,
        name: String(entry?.name || "").trim(),
        mimeType: String(entry?.type || "").trim(),
        bytes: Number(entry?.size) || 0,
      })),
      lecture_progress: {},
      lecture_pagesFinished: [],
      lecture_outlines: [],
      lecture_corrections: [],
      lecture_partOfPlan: true,
      lecture_hidden: false,
    });
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
        return {
          selectedSavedCourseDraftComponentIndex: -1,
          savedCourseDraft: this.getResetSavedCourseComponentDraftFields(
            previousState.savedCourseDraft,
          ),
        };
      }
      const nextComponents = [...currentComponents];
      if (
        Number.isInteger(selectedSavedCourseDraftComponentIndex) &&
        selectedSavedCourseDraftComponentIndex >= 0
      ) {
        nextComponents[selectedSavedCourseDraftComponentIndex] = {
          ...(nextComponents[selectedSavedCourseDraftComponentIndex] || {}),
          ...componentEntry,
        };
      } else {
        nextComponents.push(componentEntry);
      }
      return {
        selectedSavedCourseDraftComponentIndex: -1,
        savedCourseDraft: {
          ...this.getResetSavedCourseComponentDraftFields(
            previousState.savedCourseDraft,
          ),
          course_components: nextComponents,
        },
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
    const buildDraftFromCourse = (course = null) => {
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
        course_components: [],
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
        ? buildDraftFromCourse(selectedCourse)
        : this.buildSavedCourseDraftWithPlannerSettings(
            getDefaultSavedCourseDraft(),
          );
    this.setState({
      plannerTab: safeMode === "edit" ? "courses" : this.state.plannerTab,
      savedCourseEditorVisible: true,
      savedCourseEditorMode: safeMode,
      savedCourseDraft: {
        ...nextDraft,
        course_status: this.deriveSavedCourseComponentStatus(nextDraft),
        component_status: this.deriveSavedCourseComponentStatus(nextDraft),
      },
      selectedSavedCourseDraftComponentIndex: -1,
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
          return formatPlannerStatusLabel(course?.course_status, "ar");
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
    const componentToPersist =
      this.getSavedCourseDraftComponentEntryFromDraft(savedCourseDraft);
    if (!courseName) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.genericRetry);
      return;
    }
    if (
      !componentToPersist ||
      !String(componentToPersist?.course_class || "").trim()
    ) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.componentTypeRequired);
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
      await fetch(
        apiUrl("/api/user/editCourse/") +
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
            course_totalWeight: courseTotalWeight || "-",
            course_class: componentToPersist.course_class || "-",
            normativeCourseYearNum: componentToPersist.normativeCourseYearNum
              ? Number(componentToPersist.normativeCourseYearNum)
              : null,
            normativeCourseYearInterval:
              componentToPersist.normativeCourseYearInterval || "-",
            normativeCourseTerm: componentToPersist.normativeCourseTerm || "-",
            actualCourseYearNum: componentToPersist.actualCourseYearNum
              ? Number(componentToPersist.actualCourseYearNum)
              : null,
            actualCourseYearInterval:
              componentToPersist.actualCourseYearInterval || "-",
            actualCourseTerm: componentToPersist.actualCourseTerm || "-",
            programYear: componentToPersist.programYear
              ? Number(componentToPersist.programYear)
              : null,
            course_dayAndTime: Array.isArray(
              componentToPersist.course_dayAndTime,
            )
              ? componentToPersist.course_dayAndTime
              : [],
            course_year: componentToPersist.course_year || "-",
            academicYear: componentToPersist.course_year || "-",
            course_term: componentToPersist.course_term || "-",
            term: componentToPersist.course_term || "-",
            course_grade: componentToPersist.course_grade || "-",
            course_locationBuilding:
              componentToPersist.course_locationBuilding || "-",
            course_locationRoom: componentToPersist.course_locationRoom || "-",
          }),
        },
      );
      this.closeSavedCourseEditor();
      this.retrieveCourses(editTargetId);
      return;
    }
    const stagedComponents = Array.isArray(savedCourseDraft?.course_components)
      ? [...savedCourseDraft.course_components]
      : [];
    if (
      Number.isInteger(selectedSavedCourseDraftComponentIndex) &&
      selectedSavedCourseDraftComponentIndex >= 0
    ) {
      stagedComponents[selectedSavedCourseDraftComponentIndex] = {
        ...(stagedComponents[selectedSavedCourseDraftComponentIndex] || {}),
        ...componentToPersist,
      };
    } else if (
      !stagedComponents.some(
        (entry) =>
          String(entry?.course_class || "").trim() ===
            String(componentToPersist.course_class || "").trim() &&
          String(
            entry?.normativeCourseYearNum || entry?.programYear || "",
          ).trim() ===
            String(
              componentToPersist.normativeCourseYearNum ||
                componentToPersist.programYear ||
                "",
            ).trim() &&
          String(entry?.normativeCourseTerm || "").trim() ===
            String(componentToPersist.normativeCourseTerm || "").trim() &&
          String(entry?.actualCourseYearNum || "").trim() ===
            String(componentToPersist.actualCourseYearNum || "").trim() &&
          String(
            entry?.actualCourseYearInterval || entry?.course_year || "",
          ).trim() ===
            String(
              componentToPersist.actualCourseYearInterval ||
                componentToPersist.course_year ||
                "",
            ).trim() &&
          String(entry?.actualCourseTerm || entry?.course_term || "").trim() ===
            String(
              componentToPersist.actualCourseTerm ||
                componentToPersist.course_term ||
                "",
            ).trim(),
      )
    ) {
      stagedComponents.push(componentToPersist);
    }
    if (stagedComponents.length === 0) {
      this.props.serverReply(NOGAPLANNER_TEXT.messages.componentTypeRequired);
      return;
    }
    let createdCourseId = "";
    for (
      let componentIndex = 0;
      componentIndex < stagedComponents.length;
      componentIndex += 1
    ) {
      const componentEntry = stagedComponents[componentIndex];
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
            course_totalWeight: courseTotalWeight || "-",
            course_class: componentEntry.course_class || "-",
            normativeCourseYearNum: componentEntry.normativeCourseYearNum
              ? Number(componentEntry.normativeCourseYearNum)
              : null,
            normativeCourseYearInterval:
              componentEntry.normativeCourseYearInterval || "-",
            normativeCourseTerm: componentEntry.normativeCourseTerm || "-",
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
              componentEntry.course_locationBuilding || "-",
            course_locationRoom: componentEntry.course_locationRoom || "-",
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
      const createdCoursePayload = await courseResponse
        .json()
        .catch(() => ({}));
      createdCourseId =
        String(createdCoursePayload?.course?._id || "").trim() ||
        createdCourseId;
      this.props.serverReply(`${courseName} ${NOGAPLANNER_TEXT.messages.courseAddedSuffix}`);
    }
    this.closeSavedCourseEditor();
    this.retrieveCourses(createdCourseId);
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
  renderSelectedCourseLecturesTable = () => {
    return (
      <NogaPlannerLecturesTablePanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
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
            <p>{`${"السنة الأصلية"}: ${normalizeProgramYearValue(item.programYear || item.course_programYear || item.time?.programYear) || "-"}`}</p>
            <p>{formatCourseLocationDisplay(item.course_location)}</p>
            <p>{`${"الوزن"}: ${item.course_grade || "-"}`}</p>
            <p>{`${"الدرجة"}: ${item.course_fullGrade || "-"}`}</p>
            <p>{`${"الحجم"}: ${item.course_length || 0}`}</p>
            <p>{`${"التقدم"}: ${item.course_progress || 0}`}</p>
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
    this.state = {
      ui_locale: initialLocale,
      wrapperTab: "",
      plannerTab: "",
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
      telegram_panelGroupTitle: "اللوحة الجانبية",
      telegram_isLoading: false,
      telegram_error: "",
      telegram_messages: [],
      telegram_groupTitle: "مجموعة تيليجرام",
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
      plannerSettingsDefaultSection: "المقررات",
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
      plannerSettingsSaveStatus: "",
      plannerSettingsSaveMessage: "",
      plannerSettingsLogoMotionEnabled: true,
      plannerSettingsLogoFixedClock: "9",
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
  }
  componentDidMount() {
    this.isComponentMounted = true;
    window.addEventListener(
      "resize",
      this.handleSavedCourseFloatingBarViewportChange,
    );
    window.addEventListener(
      "scroll",
      this.handleSavedCourseFloatingBarViewportChange,
      true,
    );
    if (this.props.state?.my_id) {
      this.loadPlannerSelectSettings();
      this.retrieveCourses();
      this.retrieveLectures();
    }
  }
  componentDidUpdate(prevProps, prevState) {
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
  }
  componentWillUnmount() {
    this.isComponentMounted = false;
    window.removeEventListener(
      "resize",
      this.handleSavedCourseFloatingBarViewportChange,
    );
    window.removeEventListener(
      "scroll",
      this.handleSavedCourseFloatingBarViewportChange,
      true,
    );
    if (this.savedCourseFloatingBarRaf) {
      cancelAnimationFrame(this.savedCourseFloatingBarRaf);
      this.savedCourseFloatingBarRaf = null;
    }
  }
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
        throw new Error(`Failed to retrieve courses: ${response.status}`);
      }
      const payload = await response.json();
      const memory = normalizeMemoryPayload(payload);
      const nextCourses = getSafePlannerCourses(memory);
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
    const currentSelectedCourseId = String(this.state.selected_course_id || "").trim();
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
  renderSelectedCourseExamBoard = () => {
    return (
      <NogaPlannerExamBoardPanel
        planner={this}
        runtime={NOGAPLANNER_PANEL_RUNTIME}
      />
    );
  };
  render() {
    const wrapperTab =
      this.state.wrapperTab === "exams"
        ? "exams"
        : this.state.wrapperTab === "lectures"
          ? "lectures"
          : this.state.wrapperTab === "courses"
            ? "courses"
            : "";
    const plannerBackgroundUrl = `${import.meta.env.BASE_URL}img/NogaPlannerBG.png`;
    return (
      <React.Fragment>
        <article
          id="nogaPlanner_article"
          ref={this.plannerArticleRef}
          className={`fr ${"nogaPlanner--arabic"}`.trim()}
          dir={"rtl"}
          lang={"ar"}
          data-locale={"ar"}
          data-swipe-view={this.state.planner_swipeView}
          style={{
            "--nogaPlanner-day-bg-image": `url("${plannerBackgroundUrl}")`,
            "--nogaPlanner-bg-image": `url("${plannerBackgroundUrl}")`,
          }}
        >
          {wrapperTab === "exams" || wrapperTab === "lectures" || wrapperTab === "courses"
            ? wrapperTab === "exams"
              ? this.renderSelectedCourseExamBoard()
              : this.renderSavedCoursesColumn()
            : this.renderSavedCoursesColumn()}
        </article>
      </React.Fragment>
    );
  }
}
export const getPlannerMusicSnapshot = () => ({});
export const playNextSharedPlannerMusicTrack = () => {};
export const playPreviousSharedPlannerMusicTrack = () => {};
export const toggleSharedPlannerMusic = () => {};
