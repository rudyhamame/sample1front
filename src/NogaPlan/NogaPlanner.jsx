//..............IMPORT................
import React, { Component } from "react";
import ReactDOM from "react-dom";
import "./nogaPlanner.css";
import "./nogaPlanner.dark.css";
import { apiUrl } from "../config/api";
import { normalizeMemoryPayload } from "../utils/backendUser";

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

const getSafePlannerCourses = (memory = {}) =>
  Array.isArray(memory?.courses)
    ? memory.courses
    : Array.isArray(memory?.studyOrganizer?.courses)
      ? memory.studyOrganizer.courses
      : [];

const getSafePlannerLectures = (memory = {}) =>
  Array.isArray(memory?.lectures) ? memory.lectures : [];

const getSafePagesPerDay = (lengthValue, progressValue, daysValue) => {
  const length = toSafeNumber(lengthValue);
  const progress = toSafeNumber(progressValue);
  const days = Math.max(0, toSafeNumber(daysValue));

  if (days <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((length - progress) / days));
};

const getPrimaryCourseExam = (examEntries = []) => {
  const firstExam = examEntries[0] || {};
  const weightValue = firstExam?.weight?.value ?? firstExam?.course_grade ?? "";
  const gradeMax = firstExam?.grade?.max ?? firstExam?.course_fullGrade ?? "";
  const examType =
    String(firstExam?.type || firstExam?.exam_type || "-").trim() || "-";
  const examDate =
    String(firstExam?.exam_date || "").trim() ||
    (firstExam?.time?.startsAt
      ? new Date(firstExam.time.startsAt).toISOString().slice(0, 10)
      : "-");
  const examTime =
    String(firstExam?.exam_time || "").trim() ||
    (firstExam?.time?.startsAt
      ? new Date(firstExam.time.startsAt).toISOString().slice(11, 16)
      : "-");

  return {
    exam_type: examType,
    exam_date: examDate || "-",
    exam_time: examTime || "-",
    course_grade: String(weightValue || "").trim(),
    course_fullGrade: String(gradeMax || "").trim(),
  };
};

const normalizeCourseDuplicateKeyPart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildCourseDuplicateKey = (course = {}) =>
  [
    normalizeCourseDuplicateKeyPart(course?.course_name),
    normalizeCourseDuplicateKeyPart(course?.course_component),
    normalizeCourseDuplicateKeyPart(
      course?.programYear ||
        course?.course_programYear ||
        course?.time?.programYear,
    ),
    normalizeCourseDuplicateKeyPart(course?.course_year),
    normalizeCourseDuplicateKeyPart(course?.course_term),
  ]
    .filter(Boolean)
    .join("|");

const formatExamDateParts = (value) => {
  if (!value || value === "-") {
    return { day: "", month: "", year: "" };
  }

  const dateParts = String(value).split("-");
  if (dateParts.length === 3) {
    return {
      year: dateParts[0] || "",
      month: dateParts[1] || "",
      day: dateParts[2] || "",
    };
  }

  return { day: "", month: "", year: "" };
};

const buildExamDateValue = ({ day, month, year }) => {
  const normalizedDay = String(day || "").trim();
  const normalizedMonth = String(month || "").trim();
  const normalizedYear = String(year || "").trim();

  if (!normalizedDay || !normalizedMonth || !normalizedYear) {
    return "";
  }

  return `${normalizedYear.padStart(4, "0")}-${normalizedMonth.padStart(2, "0")}-${normalizedDay.padStart(2, "0")}`;
};

const getPlannerTermRank = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();
  if (normalizedValue === "first") return 1;
  if (normalizedValue === "second") return 2;
  if (normalizedValue === "third") return 3;
  return 99;
};

const getAcademicYearSortValue = (value = "") => {
  const normalizedValue = String(value || "").trim();
  const match = normalizedValue.match(/^(\d{4})/);
  return match ? Number(match[1]) : -1;
};

const normalizeProgramYearValue = (value) => {
  if (value === null || value === undefined || value === "" || value === "-") {
    return "";
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return "";
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? String(Math.trunc(parsedValue))
    : "";
};

const getProgramYearSortValue = (course = {}) => {
  const normalizedValue = normalizeProgramYearValue(
    course?.programYear ||
      course?.course_programYear ||
      course?.time?.programYear,
  );
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : -1;
};

const getComparableProgramYearNumber = (value) => {
  const normalizedValue = normalizeProgramYearValue(value);
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const isSavedCourseComponentFailed = (course = {}) => {
  const normativeYearNumber = getComparableProgramYearNumber(
    course?.normativeCourseYearNum || course?.time?.Normative?.courseYearNum,
  );
  const actualYearNumber = getComparableProgramYearNumber(
    course?.actualCourseYearNum || course?.time?.actual?.courseYearNum,
  );
  const normativeTerm = String(
    course?.normativeCourseTerm || course?.time?.Normative?.courseTerm || "",
  ).trim();
  const actualTerm = String(
    course?.actualCourseTerm || course?.time?.actual?.courseTerm || "",
  ).trim();

  if (normativeYearNumber === null || actualYearNumber === null) {
    return false;
  }

  if (actualYearNumber > normativeYearNumber) {
    return true;
  }

  return (
    actualYearNumber === normativeYearNumber &&
    Boolean(normativeTerm) &&
    Boolean(actualTerm) &&
    normativeTerm !== actualTerm
  );
};

const isSavedCourseComponentOngoing = (course = {}) => {
  const normativeYearNumber = getComparableProgramYearNumber(
    course?.normativeCourseYearNum || course?.time?.Normative?.courseYearNum,
  );
  const actualYearNumber = getComparableProgramYearNumber(
    course?.actualCourseYearNum || course?.time?.actual?.courseYearNum,
  );
  const normativeTerm = String(
    course?.normativeCourseTerm || course?.time?.Normative?.courseTerm || "",
  ).trim();
  const actualTerm = String(
    course?.actualCourseTerm || course?.time?.actual?.courseTerm || "",
  ).trim();

  return (
    normativeYearNumber !== null &&
    actualYearNumber !== null &&
    normativeYearNumber === actualYearNumber &&
    Boolean(normativeTerm) &&
    normativeTerm === actualTerm
  );
};

const formatExamTimeParts = (value) => {
  if (!value || value === "-") {
    return { hour: "", minute: "" };
  }

  const normalizedValue = String(value).trim();
  const digitGroups = normalizedValue.match(/\d+/g) || [];

  if (digitGroups.length >= 2) {
    return {
      hour: digitGroups[0] || "",
      minute: digitGroups[1] || "",
    };
  }

  if (digitGroups.length === 1) {
    const compactValue = digitGroups[0];

    if (compactValue.length >= 4) {
      return {
        hour: compactValue.slice(0, 2),
        minute: compactValue.slice(2, 4),
      };
    }
  }

  const timeParts = normalizedValue.split(/\s+/);
  return {
    hour: timeParts[0] || "",
    minute: timeParts[1] || "",
  };
};

const buildExamTimeValue = ({ hour, minute }) => {
  const normalizedHour = String(hour || "").trim();
  const normalizedMinute = String(minute || "").trim();

  if (!normalizedHour || !normalizedMinute) {
    return "";
  }

  return `${normalizedHour.padStart(2, "0")}:${normalizedMinute.padStart(2, "0")}`;
};

const TELEGRAM_PENDING_VALUE = "(pending)";
const TELEGRAM_COURSE_PAYLOAD_FIELDS = [
  "course_name",
  "course_component",
  "course_dayAndTime",
  "course_year",
  "course_term",
  "course_class",
  "course_status",
  "course_instructors",
  "course_grade",
  "course_fullGrade",
  "course_length",
  "course_progress",
  "course_exams",
  "exam_type",
  "exam_date",
  "exam_time",
];

const isPendingCourseValue = (value) =>
  String(value || "").trim() === TELEGRAM_PENDING_VALUE;

const hasMeaningfulCourseFieldValue = (value) => {
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulCourseFieldValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((entry) =>
      hasMeaningfulCourseFieldValue(entry),
    );
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  const normalizedValue = String(value || "").trim();

  return (
    Boolean(normalizedValue) &&
    normalizedValue !== "-" &&
    !isPendingCourseValue(normalizedValue)
  );
};

const formatCourseScheduleDisplay = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return "-";
  }

  const formattedEntries = value
    .map((entry) => {
      if (typeof entry === "string") {
        return String(entry || "").trim();
      }

      const day = String(entry?.day || "").trim();
      const time = String(entry?.time || "").trim();

      if (isPendingCourseValue(day) || isPendingCourseValue(time)) {
        return TELEGRAM_PENDING_VALUE;
      }

      return [day, time].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);

  return formattedEntries.length > 0 ? formattedEntries.join(" | ") : "-";
};

const formatCourseStringListDisplay = (value) => {
  if (Array.isArray(value)) {
    const normalizedEntries = value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);

    return normalizedEntries.length > 0 ? normalizedEntries.join(" | ") : "-";
  }

  const normalizedValue = String(value || "").trim();
  return normalizedValue || "-";
};

const formatCourseLocationDisplay = (value) => {
  if (!value || typeof value !== "object") {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || "-";
  }

  const locationParts = [value?.building, value?.room]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  return locationParts.length > 0 ? locationParts.join(" | ") : "-";
};

const detectContentDirection = (value) => {
  const normalizedValue = String(value || "").trim();

  const isLatinCodePoint = (codePoint) =>
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122);

  const isArabicCodePoint = (codePoint) =>
    (codePoint >= 0x0600 && codePoint <= 0x06ff) ||
    (codePoint >= 0x0750 && codePoint <= 0x077f) ||
    (codePoint >= 0x08a0 && codePoint <= 0x08ff) ||
    (codePoint >= 0xfb50 && codePoint <= 0xfdff) ||
    (codePoint >= 0xfe70 && codePoint <= 0xfeff);

  for (const char of normalizedValue) {
    const codePoint = char.codePointAt(0) || 0;

    if (isLatinCodePoint(codePoint)) {
      return "ltr";
    }

    if (isArabicCodePoint(codePoint)) {
      return "rtl";
    }
  }

  return "ltr";
};

const getCellAlignmentStyle = (value) => {
  const direction = detectContentDirection(value);
  return {
    direction,
    textAlign: direction === "rtl" ? "right" : "left",
  };
};

const formatCourseComponentLabel = (value, locale = "en") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalizedValue || normalizedValue === "-") {
    return normalizedValue || "-";
  }
  // Map all possible cases to Arabic
  const componentLabels = {
    lecture: "نظري",
    lab: "عملي: مخبر",
    "clinical rotation": "عملي: تدريب سريري",
    "pharmacy training": "عملي: تدريب صيدلي",
  };
  return componentLabels[normalizedValue] || value;
};

const normalizeSavedComponentClassLabel = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  const componentClassMap = {
    lecture: "نظري",
    نظري: "نظري",
    lab: "عملي (مخبر)",
    "عملي: مخبر": "عملي (مخبر)",
    "عملي (مخبر)": "عملي (مخبر)",
    "clinical rotation": "عملي (مشفى)",
    "عملي: تدريب سريري": "عملي (مشفى)",
    "عملي (مشفى)": "عملي (مشفى)",
    "pharmacy training": "عملي (صيدلية)",
    "عملي: تدريب صيدلي": "عملي (صيدلية)",
    "عملي (صيدلية)": "عملي (صيدلية)",
  };

  return componentClassMap[normalizedValue] || String(value || "").trim();
};

const COMPONENT_STATUS_OPTIONS = [
  { value: "new", labelAr: "أساسية", labelEn: "New" },
  { value: "failed", labelAr: "راسبة", labelEn: "Failed" },
  { value: "passed", labelAr: "ناجحة", labelEn: "Passed" },
];

const COURSE_STATUS_OPTIONS = [
  { value: "new", labelAr: "اساسي", labelEn: "New" },
  { value: "failed", labelAr: "راسب", labelEn: "Failed" },
  { value: "incomplete", labelAr: "غير مكتمل", labelEn: "Incomplete" },
  { value: "passed", labelAr: "ناجح", labelEn: "Passed" },
];

const normalizeSavedComponentStatusValue = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  const statusMap = {
    new: "new",
    أساسية: "new",
    جديد: "new",
    failed: "failed",
    راسبة: "failed",
    passed: "passed",
    ناجحة: "passed",
    "not started": "new",
    "لم يبدأ": "new",
    "in progress": "new",
    "قيد الإنجاز": "new",
    completed: "passed",
    مكتمل: "passed",
  };

  return statusMap[normalizedValue] || "new";
};

const formatSavedComponentStatusLabel = (value = "", locale = "en") => {
  const normalizedValue = normalizeSavedComponentStatusValue(value);
  const matchedOption = COMPONENT_STATUS_OPTIONS.find(
    (option) => option.value === normalizedValue,
  );

  if (!matchedOption) {
    return locale === "ar" ? "أساسية" : "New";
  }

  return locale === "ar" ? matchedOption.labelAr : matchedOption.labelEn;
};

const normalizeSavedCourseStatusValue = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  const statusMap = {
    new: "new",
    اساسي: "new",
    failed: "failed",
    راسب: "failed",
    incomplete: "incomplete",
    "غير مكتمل": "incomplete",
    passed: "passed",
    ناجح: "passed",
    "not started": "new",
    completed: "passed",
  };

  return statusMap[normalizedValue] || "new";
};

const formatSavedCourseStatusLabel = (value = "", locale = "en") => {
  const normalizedValue = normalizeSavedCourseStatusValue(value);
  const matchedOption = COURSE_STATUS_OPTIONS.find(
    (option) => option.value === normalizedValue,
  );

  if (!matchedOption) {
    return locale === "ar" ? "اساسي" : "New";
  }

  return locale === "ar" ? matchedOption.labelAr : matchedOption.labelEn;
};

const mergeCoursePayloadWithAiResult = (
  existingCourse = {},
  nextCoursePayload = {},
) => {
  const mergedCourse = {
    ...existingCourse,
  };

  TELEGRAM_COURSE_PAYLOAD_FIELDS.forEach((fieldName) => {
    const nextValue = nextCoursePayload?.[fieldName];

    if (hasMeaningfulCourseFieldValue(nextValue)) {
      mergedCourse[fieldName] = nextValue;
    }
  });

  mergedCourse.course_name =
    String(nextCoursePayload?.course_name || "").trim() ||
    String(existingCourse?.course_name || "").trim();

  return mergedCourse;
};

const splitCourseTextList = (value = "") =>
  String(value || "")
    .split("|")
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry && entry !== "-");

const splitPlannerTextList = (value = "") =>
  (Array.isArray(value) ? value : String(value || "").split(/\||,|\n|;/))
    .flatMap((entry) =>
      Array.isArray(entry) ? entry : String(entry || "").split(/\||,|\n|;/),
    )
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

const formatPlannerTextList = (value = "") => {
  const entries = splitPlannerTextList(value);
  return entries.length > 0 ? entries.join(" | ") : "-";
};

const getDefaultInlineCourseDraft = () => ({
  course_code: "",
  course_name: "",
});

const getDefaultSavedCourseDraft = () => ({
  course_code: "",
  course_components: [],
  course_componentId: "",
  course_status: "new",
  component_status: "new",
  normativeCourseYearNum: "",
  normativeCourseYearInterval: "",
  normativeCourseTerm: "",
  actualCourseYearNum: "",
  actualCourseYearInterval: "",
  actualCourseTerm: "",
  course_name: "",
  course_class: "",
  course_classSelection: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_grade: "",
  course_weightTotal: "100",
  course_locationBuilding: "",
  course_locationRoom: "",
});

const buildSavedCourseComponentEntryFromDraft = (draft = {}) => {
  const courseComponentId = String(
    draft?.course_componentId || draft?._id || "",
  ).trim();
  const courseClass = normalizeSavedComponentClassLabel(draft?.course_class);
  const componentStatus = normalizeSavedComponentStatusValue(
    draft?.component_status,
  );
  const normativeCourseYearNum = normalizeProgramYearValue(
    draft?.normativeCourseYearNum,
  );
  const normativeCourseYearInterval = normalizeAcademicYearValue(
    draft?.normativeCourseYearInterval,
  );
  const normativeCourseTerm = String(draft?.normativeCourseTerm || "").trim();
  const actualCourseYearNum = normalizeProgramYearValue(
    draft?.actualCourseYearNum,
  );
  const actualCourseYearInterval = normalizeAcademicYearValue(
    draft?.actualCourseYearInterval,
  );
  const actualCourseTerm = String(draft?.actualCourseTerm || "").trim();
  const courseDayAndTime = splitCourseTextList(draft?.course_dayAndTime).filter(
    (entry) => entry !== "-",
  );
  const courseGrade = String(draft?.course_grade || "").trim();
  const courseWeightTotal = String(draft?.course_weightTotal || "100").trim();
  const courseLocationBuilding = String(
    draft?.course_locationBuilding || "",
  ).trim();
  const courseLocationRoom = String(draft?.course_locationRoom || "").trim();

  const hasMeaningfulValue = Boolean(
    courseClass ||
    normativeCourseYearNum ||
    normativeCourseYearInterval ||
    normativeCourseTerm ||
    actualCourseYearNum ||
    actualCourseYearInterval ||
    actualCourseTerm ||
    courseDayAndTime.length > 0 ||
    courseGrade ||
    courseLocationBuilding ||
    courseLocationRoom,
  );

  if (!hasMeaningfulValue) {
    return null;
  }

  return {
    ...(courseComponentId ? { course_componentId: courseComponentId } : {}),
    course_class: courseClass || "-",
    component_status: componentStatus,
    normativeCourseYearNum,
    normativeCourseYearInterval,
    normativeCourseTerm,
    actualCourseYearNum,
    actualCourseYearInterval,
    actualCourseTerm,
    programYear: normativeCourseYearNum,
    course_year: actualCourseYearInterval,
    course_term: actualCourseTerm,
    course_dayAndTime: courseDayAndTime,
    course_grade: courseGrade,
    course_weightTotal: courseWeightTotal || "100",
    course_locationBuilding: courseLocationBuilding,
    course_locationRoom: courseLocationRoom,
  };
};

const getDefaultInlineLectureDraft = () => ({
  lecture_name: "",
  lecture_instructors: "",
  lecture_writers: "",
  lecture_date: "",
});

const EXAM_WEIGHT_UNIT_OPTIONS = ["percent", "points"];
const EXAM_GRADE_UNIT_OPTIONS = ["points", "percent"];
const EXAM_VOLUME_UNIT_OPTIONS = ["pages", "questions", "hours", "chapters"];
const EXAM_RECOMMENDATION_TIMING_OPTIONS = ["now", "soon", "later", "review"];
const EXAM_RECOMMENDATION_INTENSITY_OPTIONS = ["low", "medium", "high"];

const getDefaultExamDraft = () => ({
  selectedCourseId: "",
  type: "",
  normativeCourseYearNum: "",
  normativeCourseTerm: "",
  actualCourseYearNum: "",
  actualCourseYearInterval: "",
  actualCourseTerm: "",
  locationBuilding: "",
  locationRoom: "",
  linkedLectureIds: [],
  volumeValue: "",
  volumeUnit: "pages",
  volumeScope: "",
  volumeNote: "",
  weightValue: "",
  weightUnit: "percent",
  passGradeValue: "",
  passGradeMin: "",
  passGradeMax: "",
  passGradeUnit: "points",
  gradeValue: "",
  gradeMin: "",
  gradeMax: "",
  gradeUnit: "points",
  recommendationTiming: "later",
  recommendationIntensity: "medium",
  recommendationSuggestedHours: "",
  recommendationReason: "",
  recommendationNote: "",
});

const normalizeExamEntryForPlanner = (entry = {}, selectedCourseId = "") => ({
  _id: entry?._id || null,
  componentId: entry?.componentId || null,
  selectedCourseId: String(selectedCourseId || "").trim(),
  type: String(entry?.type || entry?.exam_type || "").trim(),
  time: entry?.time && typeof entry.time === "object" ? entry.time : {},
  location:
    entry?.location && typeof entry.location === "object" ? entry.location : {},
  lectures: Array.isArray(entry?.lectures)
    ? entry.lectures
        .map((lectureId) => String(lectureId || "").trim())
        .filter(Boolean)
    : [],
  volume: entry?.volume && typeof entry.volume === "object" ? entry.volume : {},
  weight: entry?.weight && typeof entry.weight === "object" ? entry.weight : {},
  passGrade:
    entry?.passGrade && typeof entry.passGrade === "object"
      ? entry.passGrade
      : {},
  grade: entry?.grade && typeof entry.grade === "object" ? entry.grade : {},
  studyRecommendation:
    entry?.studyRecommendation && typeof entry.studyRecommendation === "object"
      ? entry.studyRecommendation
      : {},
  exam_type: String(entry?.exam_type || entry?.type || "").trim(),
  exam_date: String(entry?.exam_date || "").trim(),
  exam_time: String(entry?.exam_time || "").trim(),
  course_grade: String(
    entry?.course_grade ?? entry?.weight?.value ?? "",
  ).trim(),
  course_fullGrade: String(
    entry?.course_fullGrade ?? entry?.grade?.max ?? "",
  ).trim(),
});

const buildExamDraftFromEntry = (entry = {}, selectedCourseId = "") => {
  const normalizedEntry = normalizeExamEntryForPlanner(entry, selectedCourseId);

  return {
    selectedCourseId:
      String(selectedCourseId || "").trim() ||
      String(normalizedEntry?.componentId || "").trim(),
    type: String(normalizedEntry?.type || "").trim(),
    normativeCourseYearNum: normalizeProgramYearValue(
      normalizedEntry?.time?.Normative?.courseYearNum,
    ),
    normativeCourseTerm: String(
      normalizedEntry?.time?.Normative?.courseTerm || "",
    ).trim(),
    actualCourseYearNum: normalizeProgramYearValue(
      normalizedEntry?.time?.actual?.courseYearNum,
    ),
    actualCourseYearInterval: normalizeAcademicYearValue(
      normalizedEntry?.time?.actual?.courseYearInterval,
    ),
    actualCourseTerm: String(
      normalizedEntry?.time?.actual?.courseTerm || "",
    ).trim(),
    locationBuilding: String(normalizedEntry?.location?.building || "").trim(),
    locationRoom: String(normalizedEntry?.location?.room || "").trim(),
    linkedLectureIds: Array.isArray(normalizedEntry?.lectures)
      ? normalizedEntry.lectures
      : [],
    volumeValue: String(normalizedEntry?.volume?.value ?? "").trim(),
    volumeUnit:
      String(normalizedEntry?.volume?.unit || "pages").trim() || "pages",
    volumeScope: String(normalizedEntry?.volume?.scope || "").trim(),
    volumeNote: String(normalizedEntry?.volume?.note || "").trim(),
    weightValue: String(
      normalizedEntry?.weight?.value ?? normalizedEntry?.course_grade ?? "",
    ).trim(),
    weightUnit:
      String(normalizedEntry?.weight?.unit || "percent").trim() || "percent",
    passGradeValue: String(normalizedEntry?.passGrade?.value ?? "").trim(),
    passGradeMin: String(normalizedEntry?.passGrade?.min ?? "").trim(),
    passGradeMax: String(normalizedEntry?.passGrade?.max ?? "").trim(),
    passGradeUnit:
      String(normalizedEntry?.passGrade?.unit || "points").trim() || "points",
    gradeValue: String(normalizedEntry?.grade?.value ?? "").trim(),
    gradeMin: String(normalizedEntry?.grade?.min ?? "").trim(),
    gradeMax: String(
      normalizedEntry?.grade?.max ?? normalizedEntry?.course_fullGrade ?? "",
    ).trim(),
    gradeUnit:
      String(normalizedEntry?.grade?.unit || "points").trim() || "points",
    recommendationTiming:
      String(normalizedEntry?.studyRecommendation?.timing || "later").trim() ||
      "later",
    recommendationIntensity:
      String(
        normalizedEntry?.studyRecommendation?.intensity || "medium",
      ).trim() || "medium",
    recommendationSuggestedHours: String(
      normalizedEntry?.studyRecommendation?.suggestedHours ?? "",
    ).trim(),
    recommendationReason: String(
      normalizedEntry?.studyRecommendation?.reason || "",
    ).trim(),
    recommendationNote: String(
      normalizedEntry?.studyRecommendation?.note || "",
    ).trim(),
  };
};

const buildExamEntryFromDraft = (draft = {}) => {
  const type = String(draft?.type || "").trim();
  const time = {
    Normative: {
      courseYearNum: Number.isFinite(Number(draft?.normativeCourseYearNum))
        ? Number(draft.normativeCourseYearNum)
        : null,
      courseTerm: String(draft?.normativeCourseTerm || "").trim() || null,
    },
    actual: {
      courseYearNum: Number.isFinite(Number(draft?.actualCourseYearNum))
        ? Number(draft.actualCourseYearNum)
        : null,
      courseYearInterval:
        normalizeAcademicYearValue(draft?.actualCourseYearInterval) || null,
      courseTerm: String(draft?.actualCourseTerm || "").trim() || null,
    },
  };
  const location = {
    building: String(draft?.locationBuilding || "").trim(),
    room: String(draft?.locationRoom || "").trim(),
  };
  const volume = {
    value: Number.isFinite(Number(draft?.volumeValue))
      ? Number(draft.volumeValue)
      : 0,
    unit: String(draft?.volumeUnit || "pages").trim() || "pages",
    scope: String(draft?.volumeScope || "").trim(),
    note: String(draft?.volumeNote || "").trim(),
  };
  const weightValue = Number.isFinite(Number(draft?.weightValue))
    ? Number(draft.weightValue)
    : 0;
  const weight = {
    value: weightValue,
    unit: String(draft?.weightUnit || "percent").trim() || "percent",
  };
  const passGrade = {
    value: Number.isFinite(Number(draft?.passGradeValue))
      ? Number(draft.passGradeValue)
      : null,
    min: Number.isFinite(Number(draft?.passGradeMin))
      ? Number(draft.passGradeMin)
      : null,
    max: Number.isFinite(Number(draft?.passGradeMax))
      ? Number(draft.passGradeMax)
      : null,
    unit: String(draft?.passGradeUnit || "points").trim() || "points",
  };
  const grade = {
    value: Number.isFinite(Number(draft?.gradeValue))
      ? Number(draft.gradeValue)
      : null,
    min: Number.isFinite(Number(draft?.gradeMin))
      ? Number(draft.gradeMin)
      : null,
    max: Number.isFinite(Number(draft?.gradeMax))
      ? Number(draft.gradeMax)
      : null,
    unit: String(draft?.gradeUnit || "points").trim() || "points",
  };
  const studyRecommendation = {
    timing: String(draft?.recommendationTiming || "later").trim() || "later",
    intensity:
      String(draft?.recommendationIntensity || "medium").trim() || "medium",
    suggestedHours: Number.isFinite(Number(draft?.recommendationSuggestedHours))
      ? Number(draft.recommendationSuggestedHours)
      : 0,
    reason: String(draft?.recommendationReason || "").trim(),
    note: String(draft?.recommendationNote || "").trim(),
  };
  const lectureIds = Array.isArray(draft?.linkedLectureIds)
    ? draft.linkedLectureIds
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];

  return {
    type,
    time,
    location,
    lectures: lectureIds,
    volume,
    weight,
    passGrade,
    grade,
    studyRecommendation,
    exam_type: type || "-",
    exam_date: "-",
    exam_time: "-",
    course_grade: Number.isFinite(weightValue) ? String(weightValue) : "",
    course_fullGrade:
      Number.isFinite(Number(grade.max)) && grade.max !== null
        ? String(grade.max)
        : "",
  };
};

const formatExamTimingDisplay = (entry = {}, locale = "en") => {
  const normalizedEntry = normalizeExamEntryForPlanner(entry);
  const normativeYear = normalizeProgramYearValue(
    normalizedEntry?.time?.Normative?.courseYearNum,
  );
  const normativeTerm = formatAcademicTermDisplay(
    normalizedEntry?.time?.Normative?.courseTerm,
    locale,
  );
  const actualYear = normalizeProgramYearValue(
    normalizedEntry?.time?.actual?.courseYearNum,
  );
  const actualInterval = normalizeAcademicYearValue(
    normalizedEntry?.time?.actual?.courseYearInterval,
  );
  const actualTerm = formatAcademicTermDisplay(
    normalizedEntry?.time?.actual?.courseTerm,
    locale,
  );
  const hasStructuredTime =
    normativeYear ||
    normativeTerm ||
    actualYear ||
    actualInterval ||
    actualTerm;

  if (hasStructuredTime) {
    return [
      [normativeYear || "-", normativeTerm || "-"].join(" | "),
      [actualYear || "-", actualInterval || "-", actualTerm || "-"].join(" | "),
    ].join(" | ");
  }

  const fallbackDate = String(normalizedEntry?.exam_date || "").trim();
  const fallbackTime = String(normalizedEntry?.exam_time || "").trim();
  return [fallbackDate, fallbackTime].filter(Boolean).join(" | ") || "-";
};

const formatExamVolumeDisplay = (entry = {}) => {
  const volume =
    entry?.volume && typeof entry.volume === "object" ? entry.volume : {};
  const value = Number.isFinite(Number(volume?.value))
    ? String(volume.value)
    : "";
  const unit = String(volume?.unit || "").trim();
  const scope = String(volume?.scope || "").trim();
  return [value, unit, scope].filter(Boolean).join(" | ") || "-";
};

const formatExamWeightDisplay = (entry = {}) => {
  const weight =
    entry?.weight && typeof entry.weight === "object" ? entry.weight : {};
  const value = Number.isFinite(Number(weight?.value))
    ? String(weight.value)
    : String(entry?.course_grade || "").trim();
  const unit = String(weight?.unit || "").trim();
  return [value, unit].filter(Boolean).join(" | ") || "-";
};

const formatExamGradeDisplay = (grade = {}) => {
  const normalizedGrade = grade && typeof grade === "object" ? grade : {};
  const value = normalizedGrade?.value;
  const min = normalizedGrade?.min;
  const max = normalizedGrade?.max;
  const unit = String(normalizedGrade?.unit || "").trim();
  const parts = [value, min, max]
    .map((entry) =>
      entry === null ||
      entry === undefined ||
      entry === "" ||
      !Number.isFinite(Number(entry))
        ? ""
        : String(entry),
    )
    .filter(Boolean);
  return [...parts, unit].filter(Boolean).join(" | ") || "-";
};

const formatExamRecommendationDisplay = (entry = {}, locale = "en") => {
  const recommendation =
    entry?.studyRecommendation && typeof entry.studyRecommendation === "object"
      ? entry.studyRecommendation
      : {};
  const timing = String(recommendation?.timing || "").trim();
  const intensity = String(recommendation?.intensity || "").trim();
  const hours = Number.isFinite(Number(recommendation?.suggestedHours))
    ? String(recommendation.suggestedHours)
    : "";
  const localizedTiming =
    locale === "ar"
      ? { now: "الآن", soon: "قريبًا", later: "لاحقًا", review: "مراجعة" }[
          timing
        ] || timing
      : timing;
  const localizedIntensity =
    locale === "ar"
      ? { low: "منخفض", medium: "متوسط", high: "مرتفع" }[intensity] || intensity
      : intensity;
  return (
    [localizedTiming, localizedIntensity, hours ? `${hours}h` : ""]
      .filter(Boolean)
      .join(" | ") || "-"
  );
};

const buildAcademicYearOptions = (startYear = 2000, endYear = 2030) => {
  const parsedEndYear = Number(endYear);
  const end =
    endYear !== null &&
    endYear !== undefined &&
    String(endYear).trim() !== "" &&
    Number.isFinite(parsedEndYear)
      ? parsedEndYear
      : 2030;
  const start = Math.min(Math.max(1900, Number(startYear) || 2000), end);
  const options = [];

  for (let year = end; year >= start; year -= 1) {
    options.push(`${year} - ${year + 1}`);
  }

  return options;
};

const ACADEMIC_YEAR_OPTIONS = buildAcademicYearOptions(2000);
const normalizeAcademicYearValue = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue || normalizedValue === "-") {
    return "";
  }

  const slashMatch = normalizedValue.match(/^(\d{4})\s*\/\s*(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[1]} - ${slashMatch[2]}`;
  }

  const shortSlashMatch = normalizedValue.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
  if (shortSlashMatch) {
    const startYear = Number(shortSlashMatch[1]);
    const endYear = Number(shortSlashMatch[2]);

    if (Number.isFinite(startYear) && endYear === startYear + 1) {
      return `${2000 + startYear} - ${2000 + endYear}`;
    }
  }

  const rangeMatch = normalizedValue.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) {
    return `${rangeMatch[1]} - ${rangeMatch[2]}`;
  }

  const shortRangeMatch = normalizedValue.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (shortRangeMatch) {
    const startYear = Number(shortRangeMatch[1]);
    const endYear = Number(shortRangeMatch[2]);

    if (Number.isFinite(startYear) && endYear === startYear + 1) {
      return `${2000 + startYear} - ${2000 + endYear}`;
    }
  }

  return ACADEMIC_YEAR_OPTIONS.includes(normalizedValue) ? normalizedValue : "";
};

const buildNormativeCourseYearInterval = (
  programStartInterval = "",
  courseYearNum = "",
) => {
  const normalizedProgramStartInterval =
    normalizeAcademicYearValue(programStartInterval);
  const normalizedCourseYearNum = normalizeProgramYearValue(courseYearNum);

  if (!normalizedProgramStartInterval || !normalizedCourseYearNum) {
    return "";
  }

  const startYearMatch = normalizedProgramStartInterval.match(/^(\d{4})/);
  const parsedCourseYearNum = Number(normalizedCourseYearNum);

  if (!startYearMatch || !Number.isFinite(parsedCourseYearNum)) {
    return "";
  }

  const baseStartYear = Number(startYearMatch[1]);
  const nextStartYear = baseStartYear + Math.max(parsedCourseYearNum - 1, 0);
  return `${nextStartYear} - ${nextStartYear + 1}`;
};
const formatAcademicTermDisplay = (value, locale = "en") => {
  const normalizedValue = String(value || "").trim();
  const arabicTerms = {
    First: "الأول",
    Second: "الثاني",
    Third: "الثالث",
  };

  return locale === "ar"
    ? arabicTerms[normalizedValue] || normalizedValue
    : normalizedValue;
};

const formatAcademicYearAndTerm = (course, locale = "en") => {
  const programYear = normalizeProgramYearValue(
    course?.programYear ||
      course?.course_programYear ||
      course?.time?.programYear,
  );
  const academicYear =
    normalizeAcademicYearValue(course?.course_year) ||
    normalizeAcademicYearValue(course?.academicYear) ||
    normalizeAcademicYearValue(course?.time?.academicYear);
  const term = String(
    course?.course_term || course?.term || course?.time?.term || "",
  ).trim();
  const displayedTerm = formatAcademicTermDisplay(term, locale);
  const displayedProgramYear = programYear
    ? locale === "ar"
      ? `السنة ${programYear}`
      : `Year ${programYear}`
    : "";
  const displayedAcademicYear =
    academicYear && displayedTerm && displayedTerm !== "-"
      ? `${academicYear} (${displayedTerm})`
      : academicYear ||
        (displayedTerm && displayedTerm !== "-" ? `(${displayedTerm})` : "");

  if (displayedProgramYear && displayedAcademicYear) {
    return `${displayedProgramYear} • ${displayedAcademicYear}`;
  }

  return displayedProgramYear || displayedAcademicYear || "-";
};

const formatNormativeTimingDisplay = (entry = {}, locale = "en") => {
  const programYear = normalizeProgramYearValue(
    entry?.normativeCourseYearNum || entry?.programYear,
  );
  const academicYear = normalizeAcademicYearValue(
    entry?.normativeCourseYearInterval,
  );
  const rawTerm = String(entry?.normativeCourseTerm || "").trim();
  const term =
    rawTerm && rawTerm !== "-"
      ? formatAcademicTermDisplay(rawTerm, locale)
      : "";

  const yearLabel = programYear
    ? locale === "ar"
      ? `السنة ${programYear}`
      : `Year ${programYear}`
    : "";
  const intervalLabel = academicYear
    ? locale === "ar"
      ? `الفترة الدراسية ${academicYear}`
      : `Academic interval ${academicYear}`
    : "";
  const termLabel = term
    ? locale === "ar"
      ? `(الفصل ${term})`
      : `(${term})`
    : "";

  if (yearLabel && intervalLabel && termLabel) {
    return `${yearLabel} | ${intervalLabel} ${termLabel}`;
  }

  if (yearLabel && intervalLabel) {
    return `${yearLabel} | ${intervalLabel}`;
  }

  if (intervalLabel && termLabel) {
    return `${intervalLabel} ${termLabel}`;
  }

  const nextValue = yearLabel || intervalLabel || termLabel;

  if (nextValue) {
    return nextValue;
  }

  return formatAcademicYearAndTerm(entry, locale);
};

const formatActualTimingDisplay = (entry = {}, locale = "en") => {
  const actualYearNum = normalizeProgramYearValue(entry?.actualCourseYearNum);
  const academicYear = normalizeAcademicYearValue(
    entry?.actualCourseYearInterval || entry?.course_year,
  );
  const rawTerm = String(
    entry?.actualCourseTerm || entry?.course_term || "",
  ).trim();
  const term =
    rawTerm && rawTerm !== "-"
      ? formatAcademicTermDisplay(rawTerm, locale)
      : "";

  const yearLabel = actualYearNum
    ? locale === "ar"
      ? `السنة ${actualYearNum}`
      : `Year ${actualYearNum}`
    : "";
  const intervalLabel = academicYear
    ? locale === "ar"
      ? `الفترة الدراسية ${academicYear}`
      : `Academic interval ${academicYear}`
    : "";
  const termLabel = term
    ? locale === "ar"
      ? `(الفصل ${term})`
      : `(${term})`
    : "";

  if (yearLabel && intervalLabel && termLabel) {
    return `${yearLabel} | ${intervalLabel} ${termLabel}`;
  }

  if (yearLabel && intervalLabel) {
    return `${yearLabel} | ${intervalLabel}`;
  }

  if (intervalLabel && termLabel) {
    return `${intervalLabel} ${termLabel}`;
  }

  const nextValue = yearLabel || intervalLabel || termLabel;

  if (nextValue) {
    return nextValue;
  }

  return formatAcademicYearAndTerm(entry, locale);
};
const TERM_OPTIONS = [
  { value: "First", labelEn: "First", labelAr: "الأول" },
  { value: "Second", labelEn: "Second", labelAr: "الثاني" },
  { value: "Third", labelEn: "Third", labelAr: "الثالث" },
];

const WEEKDAY_OPTIONS = [
  { key: "sunday", labelEn: "Sunday", labelAr: "الأحد" },
  { key: "monday", labelEn: "Monday", labelAr: "الاثنين" },
  { key: "tuesday", labelEn: "Tuesday", labelAr: "الثلاثاء" },
  { key: "wednesday", labelEn: "Wednesday", labelAr: "الأربعاء" },
  { key: "thursday", labelEn: "Thursday", labelAr: "الخميس" },
  { key: "friday", labelEn: "Friday", labelAr: "الجمعة" },
  { key: "saturday", labelEn: "Saturday", labelAr: "السبت" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, "0")}:00`;
  return { value, label: value };
});

const SAVED_COMPONENT_CLASS_OPTIONS = [
  "نظري",
  "عملي (مخبر)",
  "عملي (مشفى)",
  "عملي (صيدلية)",
];

const getDefaultInlineComponentDraft = () => ({
  course_class: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_grade: "",
  course_locationBuilding: "",
  course_locationRoom: "",
});

const getEditableCourseDraft = (course = {}) => {
  const examEntries =
    Array.isArray(course?.course_exams) && course.course_exams.length > 0
      ? course.course_exams
      : [
          {
            exam_type: course?.exam_type || "-",
            exam_date: course?.exam_date || "-",
            exam_time: course?.exam_time || "-",
            course_grade: course?.course_grade || "",
            course_fullGrade: course?.course_fullGrade || "",
          },
        ];

  return {
    course_name: String(course?.course_name || "").trim(),
    course_component: String(course?.course_component || "-").trim() || "-",
    course_dayAndTime: formatCourseScheduleDisplay(course?.course_dayAndTime),
    course_class: String(course?.course_class || "-").trim() || "-",
    course_grade: String(course?.course_grade || "").trim(),
    course_fullGrade: String(course?.course_fullGrade || "").trim(),
    course_length: String(
      Number.isFinite(Number(course?.course_length))
        ? Number(course.course_length)
        : 0,
    ),
    course_progress: String(
      Number.isFinite(Number(course?.course_progress))
        ? Number(course.course_progress)
        : 0,
    ),
    course_exams: examEntries.map((examEntry) => ({
      exam_type: String(examEntry?.exam_type || "-").trim() || "-",
      exam_date: String(examEntry?.exam_date || "-").trim() || "-",
      exam_time: String(examEntry?.exam_time || "-").trim() || "-",
      course_grade: String(examEntry?.course_grade || "").trim(),
      course_fullGrade: String(examEntry?.course_fullGrade || "").trim(),
    })),
  };
};

const buildCoursePayloadFromDraft = (draft = {}, existingCourse = {}) => {
  const parsedCourseLength = Number(draft?.course_length);
  const parsedCourseProgress = Number(draft?.course_progress);
  const parsedExamEntries = (
    Array.isArray(draft?.course_exams) ? draft.course_exams : []
  )
    .map((examEntry) => ({
      exam_type: String(examEntry?.exam_type || "-").trim() || "-",
      exam_date: String(examEntry?.exam_date || "-").trim() || "-",
      exam_time: String(examEntry?.exam_time || "-").trim() || "-",
      course_grade: String(examEntry?.course_grade || "").trim(),
      course_fullGrade: String(examEntry?.course_fullGrade || "").trim(),
    }))
    .filter((examEntry) =>
      Boolean(
        String(examEntry.exam_type || "").trim() ||
        String(examEntry.exam_date || "").trim() ||
        String(examEntry.exam_time || "").trim() ||
        String(examEntry.course_grade || "").trim() ||
        String(examEntry.course_fullGrade || "").trim(),
      ),
    );
  const primaryExam = parsedExamEntries[0] || {};

  return {
    ...existingCourse,
    course_name:
      String(draft?.course_name || "").trim() ||
      String(existingCourse?.course_name || "").trim(),
    course_component: String(draft?.course_component || "-").trim() || "-",
    course_dayAndTime: splitCourseTextList(draft?.course_dayAndTime),
    course_class: String(draft?.course_class || "-").trim() || "-",
    course_grade: String(draft?.course_grade || "").trim(),
    course_fullGrade: String(draft?.course_fullGrade || "").trim(),
    course_length: Number.isFinite(parsedCourseLength) ? parsedCourseLength : 0,
    course_progress: Number.isFinite(parsedCourseProgress)
      ? parsedCourseProgress
      : 0,
    course_exams: parsedExamEntries,
    exam_type: String(primaryExam?.exam_type || "-").trim() || "-",
    exam_date: String(primaryExam?.exam_date || "-").trim() || "-",
    exam_time: String(primaryExam?.exam_time || "-").trim() || "-",
  };
};

const formatSavedCourseTitle = (course = {}) => {
  const courseName = String(course?.course_name || "").trim() || "-";
  const courseCode = String(course?.course_code || "").trim();

  return courseCode ? `${courseName} (${courseCode})` : courseName;
};

const formatSavedCourseComponent = (course = {}, locale = "en") => {
  const componentValue =
    String(course?.course_component || "").trim() ||
    String(course?.course_class || "").trim() ||
    "-";

  return formatCourseComponentLabel(componentValue, locale);
};

const buildSavedCourseGroupKey = (course = {}) =>
  String(course?.parentCourseId || "").trim() ||
  `${String(course?.course_name || "").trim()}::${String(course?.course_code || "").trim()}`;

const buildCourseComponentPickerLabel = (course = {}, locale = "en") => {
  const courseTitle = formatSavedCourseTitle(course);
  const componentTitle = formatSavedCourseComponent(course, locale);

  return componentTitle && componentTitle !== "-"
    ? `${courseTitle} - ${componentTitle}`
    : courseTitle;
};

const buildCourseLectureMatchLabel = (course = {}) => {
  const courseName = String(course?.course_name || "").trim() || "-";
  const componentClass =
    String(course?.course_component || "").trim() ||
    String(course?.course_class || "").trim();

  if (
    componentClass &&
    componentClass !== "-" &&
    componentClass !== courseName
  ) {
    return `${courseName} (${componentClass})`;
  }

  return courseName;
};

const SCHOOLPLANNER_TRANSLATIONS = {
  // English removed, only Arabic kept
  ar: {
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    close: "إغلاق",
    send: "إرسال",
    search: "بحث",
    reset: "إعادة ضبط",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    loadMore: "تحميل المزيد",
    loadingArchive: "جارٍ تحميل الأرشيف",
    timer: "المؤقت",
    minutesShort: "د",
    secondsShort: "ث",
    startTimer: "بدء المؤقت",
    pauseTimer: "إيقاف المؤقت",
    resetTimer: "إعادة ضبط المؤقت",
    timerFinished: "انتهى الوقت",
    loadingTelegramMessages: "جارٍ تحميل رسائل تيليجرام...",
    noTelegramMessagesYet: "لا توجد رسائل تيليجرام بعد.",
    noStoredMessagesYet: "لا توجد رسائل محفوظة بعد",
    notSyncedYet: "لم تتم المزامنة بعد",
    plannerControl: "لوحة التخطيط",
    planDays: "أيام الخطة",
    dailyLoad: "الحمل اليومي",
    messageDesk: "مكتب الرسائل",
    telegram: "تيليجرام",
    archiveAndSearch: "الأرشفة + البحث",
    planDaysCopy:
      "راجع عبء الدراسة لكل يوم وحافظ على توازن الأسبوع قبل الطباعة أو إرسال التحديثات.",
    telegramDeskCopy:
      "اربط مجموعة واحدة، وأرشف سجلها، وابحث فيها بتكلفة منخفضة، وأرسل ملاحظات المخطط من نفس اللوحة.",
    telegramControl: "تحكم تيليجرام",
    groupReference: "مرجع المجموعة / القناة",
    historyStartDate: "تاريخ بدء الأرشيف",
    groupReferencePlaceholder: "@اسم_المجموعة أو @اسم_القناة أو رابط المحادثة",
    telegramGroupsLabel: "المجموعات",
    telegramSupergroupsLabel: "المجموعات الكبرى",
    telegramChannelsLabel: "القنوات",
    telegramSearchPlaceholder: "ابحث في الرسائل",
    telegramHint:
      "احفظ مرجع المجموعة وتاريخ بدء الأرشيف مرة واحدة. سيقوم الخادم بأرشفة الرسائل القديمة من ذلك التاريخ ومتابعة حفظ الرسائل الجديدة تلقائياً.",
    storedMessages: "الرسائل المحفوظة",
    lastSync: "آخر مزامنة",
    lastStoredMessage: "آخر رسالة محفوظة",
    courseInformation: "معلومات المقرر",
    examInformation: "معلومات الامتحان",
    noExamEntries: "لا توجد بيانات امتحان.",
    courseNote: "ملاحظة المقرر",
    courseName: "اسم المقرر",
    courseTime: "وقت المقرر",
    courseYear: "سنة المقرر",
    courseTerm: "فصل المقرر",
    courseYearTerm: "سنة/فصل المقرر",
    courseClass: "تصنيف المقرر",
    courseStatus: "حالة المقرر",
    courseInstructors: "مدرسو المقرر",
    actualGrade: "الدرجة الفعلية",
    courseLength: "طول المقرر",
    courseProgress: "تقدم المقرر",
    fullGrade: "الدرجة الكاملة",
    coursePages: "صفحات المقرر",
    targetPagesPerDay: "الصفحات المستهدفة يومياً",
    examType: "نوع الامتحان",
    examDate: "تاريخ الامتحان",
    examTime: "وقت الامتحان",
    grades: "الدرجات",
    examDue: "موعد الامتحان",
    lectureDetails: "تفاصيل المحاضرة",
    title: "العنوان",
    course: "المقرر",
    instructor: "اسم المدرس",
    writer: "اسم الكاتب",
    date: "التاريخ",
    corrections: "التصحيحات",
    noCorrectionsYet: "لا توجد تصحيحات بعد.",
    noCorrectionsForLectureYet: "لم تُضف تصحيحات لهذه المحاضرة بعد.",
    writerLabel: "الكاتب",
    page: "الصفحة {page}",
    toggleFinishedPages: "إظهار الصفحات المنجزة",
    hideLecturePages: "إخفاء صفحات المحاضرة",
    showLecturePages: "إظهار صفحات المحاضرة",
    telegramSummary: "ملخص تيليجرام",
    noLectureTelegramMatchesYet:
      "لم يتم العثور بعد على ملاحظات تيليجرام مرتبطة بهذه المحاضرة.",
    matchedTerms: "الكلمات المطابقة",
    matchedTermsUnavailable: "الكلمات المطابقة غير متاحة",
    latestRelatedMessage: "آخر رسالة مرتبطة",
    unknownTime: "وقت غير معروف",
    unknown: "غير معروف",
    noText: "[بلا نص]",
    addLecture: "إضافة محاضرة",
    deleteLecture: "حذف محاضرة",
    hideUncheckedLectures: "إخفاء المحاضرات غير المحددة",
    unhideUncheckedLectures: "إظهار المحاضرات غير المحددة",
    searchPlaceholder: "بحث",
    titleHeader: "العنوان",
    courseHeader: "المقرر",
    instructorNameHeader: "اسم المدرس",
    writerNameHeader: "اسم الكاتب",
    lectureNamePlaceholder: "اسم المحاضرة",
    lectureCoursePlaceholder: "مقرر المحاضرة",
    lectureInstructorPlaceholder: "مدرس المحاضرة",
    lectureWriterPlaceholder: "كاتب المحاضرة",
    lectureLengthPlaceholder: "عدد صفحات المحاضرة",
    correctionPagePlaceholder: "صفحة التصحيح",
    correctionNotePlaceholder: "ملاحظة التصحيح",
    lectureOutlinePlaceholder: "محور المحاضرة",
    courseNamePlaceholder: "اسم المقرر",
    courseComponentPlaceholder: "مكوّن المقرر",
    inClass: "داخل القاعة",
    outOfClass: "خارج القاعة",
    courseDayPlaceholder: "يوم المقرر",
    sunday: "الأحد",
    monday: "الاثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    courseYearPlaceholder: "سنة المقرر",
    courseTermPlaceholder: "فصل المقرر",
    fall: "خريف",
    winter: "شتاء",
    summer: "صيف",
    courseClassificationPlaceholder: "تصنيف المقرر",
    inClassGroup: "داخل القاعة",
    outOfClassGroup: "خارج القاعة",
    basicScience: "علوم أساسية",
    appliedScience: "علوم تطبيقية",
    lab: "مختبر",
    clinicalRotation: "دورة سريرية",
    courseStatusPlaceholder: "حالة المقرر",
    unstarted: "لم يبدأ",
    ongoing: "مستمر",
    pass: "ناجح",
    fail: "راسب",
    courseInstructorsPlaceholder: "مدرسو المقرر",
    examDateLabel: "تاريخ الامتحان",
    examTimeLabel: "وقت الامتحان",
    examTypeLabel: "نوع الامتحان",
    gradesLabel: "الدرجات",
    quiz: "كويز",
    midterm: "نصفي",
    final: "نهائي",
    practical: "عملي",
    oral: "شفهي",
    postingFailedPleaseAddCourseName: "فشل الإرسال. الرجاء إضافة اسم المقرر",
    music: "الموسيقى",
    telegramGroup: "مجموعة تيليجرام",
    showingResults: "عرض {count} نتيجة من أصل {rawCount} رسالة تم جلبها",
    pagesFinishedSummary:
      "{progress} / {length} صفحة منجزة | {remaining} متبقية | {percent}%",
    finishedPages: "الصفحات المنجزة",
    remainingPages: "الصفحات المتبقية",
    none: "لا يوجد",
    unknownDay: "يوم غير معروف",
    dueIn:
      "متبقٍ {days} يوم و{hours} ساعة و{mins} دقيقة، مع {examHour} ساعة و{examMins} دقيقة في يوم الامتحان",
  },
};

const getCourseDueText = (course, locale = "en") => {
  const examDateinMillisec = new Date(course.exam_date);
  const diffDaysWithDecimals = (examDateinMillisec - todayDate) / 86400000;
  const diffDaysWithoutDecimals = Math.floor(diffDaysWithDecimals);
  const dayDecimals = diffDaysWithDecimals - diffDaysWithoutDecimals;
  const diffHoursWithDecimals = dayDecimals * 24;
  const diffHoursWithoutDecimals = Math.floor(diffHoursWithDecimals);
  const hourDecimals = diffHoursWithDecimals - diffHoursWithoutDecimals;
  const diffMinsWithDecimals = hourDecimals * 60;
  const diffMinsWithoutDecimals = Math.ceil(diffMinsWithDecimals);
  const examTime_hour = Number(String(course.exam_time).split(":")[0]);
  const examTime_mins = Number(String(course.exam_time).split(":")[1]);

  if (!Number.isFinite(diffDaysWithoutDecimals)) {
    return "-";
  }

  if (locale === "ar") {
    return `متبقٍ ${diffDaysWithoutDecimals} يوم و${diffHoursWithoutDecimals} ساعة و${diffMinsWithoutDecimals} دقيقة، مع ${examTime_hour} ساعة و${examTime_mins} دقيقة في يوم الامتحان`;
  }

  return (
    "Due in " +
    diffDaysWithoutDecimals +
    " day(s) and " +
    diffHoursWithoutDecimals +
    " hour(s) and " +
    diffMinsWithoutDecimals +
    " min(s) with " +
    examTime_hour +
    " more hour(s) and " +
    examTime_mins +
    " min(s) on the exam day"
  );
};

//..................................

const COURSE_PRINT_SOUND_START_OFFSET = 0.109;
const COURSE_PRINT_SOUND_BASE_DURATION = 26.204;
const NAGHAM_COURSE_LETTERS_STORAGE_KEY = "nogaPlanner_nagham_course_letters";
const NAGHAM_COURSE_LIST_STORAGE_KEY = "nogaPlanner_nagham_course_list";
const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY = "nogaPlanner_reducedMotion";
const DEFAULT_NAGHAM_COURSE_LETTER =
  "For dear naghamtrkmani: keep going, keep glowing, and let every page carry you a little closer to your beautiful goal.";
const TELEGRAM_DISPLAY_TIMEZONE = "Asia/Damascus";

const TELEGRAM_LECTURE_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "have",
  "your",
  "about",
  "into",
  "after",
  "before",
  "under",
  "over",
  "name",
  "course",
  "lecture",
  "writer",
  "instructor",
]);

const normalizeTelegramSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeLectureCorrections = (entries = []) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      page: Math.max(1, Number(entry?.page) || 0),
      text: String(entry?.text || "").trim(),
    }))
    .filter((entry) => entry.page > 0 && entry.text);

const getDefaultPlannerLocale = (localeProp) => {
  const normalized = String(localeProp || "")
    .trim()
    .toLowerCase();
  return normalized === "ar" ? "ar" : "en";
};

export default class NogaPlanner extends Component {
  handleWrapperTabChange = (tab) => {
    this.setState({
      wrapperTab: tab === "exams" ? "exams" : "courses",
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

      this.setState({ deleteSelectionIds: nextSelection });
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
        plannerTab: "lectures",
        selectedCourseForLecturesId: String(selectedCourse._id || ""),
        selectedCourseForLecturesName:
          buildCourseLectureMatchLabel(selectedCourse),
      });
      return;
    }

    this.setState({ selectedTabItemId: id });
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
          inlineCourseDraft: getDefaultInlineCourseDraft(),
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
      inlineComponentDraft: getDefaultInlineComponentDraft(),
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
      this.setState({ deleteSelectionMode: false, deleteSelectionIds: [] });
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
        this.setState({ telegram_instructorSuggestions: [] });
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
      this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
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

    this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
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

  getProgramStartYearInterval = () =>
    normalizeAcademicYearValue(
      this.props.state?.profile?.studying?.time?.start?.programYearInterval ||
        this.props.state?.studying?.time?.start?.programYearInterval ||
        "",
    );

  getCurrentProgramTiming = () => {
    const currentStudyTime =
      this.props.state?.profile?.studying?.time?.current ||
      this.props.state?.studying?.time?.current ||
      {};

    return {
      actualCourseYearNum: normalizeProgramYearValue(
        currentStudyTime?.programYearNum,
      ),
      actualCourseYearInterval: normalizeAcademicYearValue(
        currentStudyTime?.programYearInterval || "",
      ),
      actualCourseTerm: String(
        currentStudyTime?.programTerm ||
          this.props.state?.profile?.studying?.term ||
          this.props.state?.studying?.term ||
          "",
      ).trim(),
    };
  };

  handleSavedCourseDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => {
      const nextDraft = {
        ...previousState.savedCourseDraft,
        [fieldName]: nextValue,
        ...this.getCurrentProgramTiming(),
      };

      if (fieldName === "normativeCourseYearNum") {
        nextDraft.normativeCourseYearInterval =
          buildNormativeCourseYearInterval(
            this.getProgramStartYearInterval(),
            nextValue,
          );
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

  openInlineLectureRow = () => {
    if (!String(this.state?.selectedCourseForLecturesId || "").trim()) {
      return;
    }

    this.setState({
      inlineLectureRowVisible: true,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
      selectedTabItemId: null,
    });
  };

  closeInlineLectureRow = () => {
    this.setState({
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
    });
  };

  submitInlineLectureRow = async () => {
    const { inlineLectureDraft, selectedCourseForLecturesName } = this.state;
    const lectureName = String(inlineLectureDraft?.lecture_name || "").trim();

    if (!lectureName) {
      return;
    }

    await this.addLecture({
      lecture_name: lectureName,
      lecture_course: selectedCourseForLecturesName,
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
      lecture_length: 0,
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
    const componentEntry = buildSavedCourseComponentEntryFromDraft({
      ...savedCourseDraft,
      course_class:
        String(savedCourseDraft?.course_classSelection || "").trim() ||
        String(savedCourseDraft?.course_class || "").trim(),
    });

    if (!componentEntry || componentEntry.course_class === "-") {
      return;
    }

    this.setState((previousState) => {
      const currentComponents = Array.isArray(
        previousState.savedCourseDraft?.course_components,
      )
        ? previousState.savedCourseDraft.course_components
        : [];
      const duplicateExists = currentComponents.some(
        (entry) =>
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
          String(entry?.normativeCourseYearInterval || "").trim() ===
            String(componentEntry.normativeCourseYearInterval || "").trim() &&
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
        const currentProgramTiming = this.getCurrentProgramTiming();
        return {
          savedCourseDraft: {
            ...previousState.savedCourseDraft,
            course_componentId: "",
            component_status: "new",
            course_class: "",
            course_classSelection: "",
            normativeCourseYearNum: "",
            normativeCourseYearInterval: "",
            normativeCourseTerm: "",
            ...currentProgramTiming,
            course_dayAndTime: "",
            course_daySelection: "",
            course_timeSelection: "",
            course_grade: "",
            course_weightTotal: "100",
            course_locationBuilding: "",
            course_locationRoom: "",
          },
        };
      }

      const currentProgramTiming = this.getCurrentProgramTiming();
      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_componentId: "",
          course_components: [...currentComponents, componentEntry],
          component_status: "new",
          course_class: "",
          course_classSelection: "",
          normativeCourseYearNum: "",
          normativeCourseYearInterval: "",
          normativeCourseTerm: "",
          ...currentProgramTiming,
          course_dayAndTime: "",
          course_daySelection: "",
          course_timeSelection: "",
          course_grade: "",
          course_weightTotal: "100",
          course_locationBuilding: "",
          course_locationRoom: "",
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

      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_components: nextComponents,
        },
      };
    });
  };

  moveSavedCourseComponentEntry = (entryIndexToMove, direction = 0) => {
    this.setState((previousState) => {
      const currentComponents = Array.isArray(
        previousState.savedCourseDraft?.course_components,
      )
        ? [...previousState.savedCourseDraft.course_components]
        : [];
      const nextIndex = entryIndexToMove + direction;

      if (
        entryIndexToMove < 0 ||
        entryIndexToMove >= currentComponents.length ||
        nextIndex < 0 ||
        nextIndex >= currentComponents.length
      ) {
        return null;
      }

      const swappedEntry = currentComponents[entryIndexToMove];
      currentComponents[entryIndexToMove] = currentComponents[nextIndex];
      currentComponents[nextIndex] = swappedEntry;

      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_components: currentComponents,
        },
      };
    });
  };

  editSavedCourseComponentEntry = (entryIndexToEdit) => {
    this.setState((previousState) => {
      const currentComponents = Array.isArray(
        previousState.savedCourseDraft?.course_components,
      )
        ? previousState.savedCourseDraft.course_components
        : [];
      const entryToEdit = currentComponents[entryIndexToEdit];

      if (!entryToEdit) {
        return null;
      }

      const nextComponents = currentComponents.filter(
        (_, entryIndex) => entryIndex !== entryIndexToEdit,
      );
      const nextScheduleUnits = Array.isArray(entryToEdit?.course_dayAndTime)
        ? entryToEdit.course_dayAndTime
        : splitCourseTextList(entryToEdit?.course_dayAndTime).filter(
            (entry) => entry !== "-",
          );

      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_components: nextComponents,
          course_componentId: String(
            entryToEdit?.course_componentId || entryToEdit?._id || "",
          ).trim(),
          component_status: normalizeSavedComponentStatusValue(
            entryToEdit?.component_status || entryToEdit?.status || "",
          ),
          course_class: normalizeSavedComponentClassLabel(
            entryToEdit?.course_class,
          ),
          course_classSelection: normalizeSavedComponentClassLabel(
            entryToEdit?.course_class,
          ),
          normativeCourseYearNum: String(
            entryToEdit?.normativeCourseYearNum ||
              entryToEdit?.programYear ||
              "",
          ).trim(),
          normativeCourseYearInterval: String(
            entryToEdit?.normativeCourseYearInterval || "",
          ).trim(),
          normativeCourseTerm: String(
            entryToEdit?.normativeCourseTerm || "",
          ).trim(),
          ...this.getCurrentProgramTiming(),
          course_dayAndTime: nextScheduleUnits.join(" | "),
          course_daySelection: "",
          course_timeSelection: "",
          course_grade: String(entryToEdit?.course_grade || "").trim(),
          course_weightTotal: String(
            entryToEdit?.course_weightTotal || "100",
          ).trim(),
          course_locationBuilding: String(
            entryToEdit?.course_locationBuilding || "",
          ).trim(),
          course_locationRoom: String(
            entryToEdit?.course_locationRoom || "",
          ).trim(),
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
      const currentProgramTiming = this.getCurrentProgramTiming();
      const courseLocation =
        course?.course_location && typeof course.course_location === "object"
          ? course.course_location
          : {};
      const savedComponents =
        Array.isArray(course?.components) && course.components.length > 0
          ? course.components.map((component) => {
              const componentLocation =
                component?.course_location &&
                typeof component.course_location === "object"
                  ? component.course_location
                  : {};

              return {
                course_componentId: String(
                  component?.course_componentId ||
                    component?._id ||
                    component?.primaryComponentId ||
                    "",
                ).trim(),
                component_status: normalizeSavedComponentStatusValue(
                  component?.component_status || component?.status || "",
                ),
                course_class: String(
                  normalizeSavedComponentClassLabel(
                    component?.course_class ||
                      component?.course_component ||
                      "",
                  ),
                ).trim(),
                normativeCourseYearNum: normalizeProgramYearValue(
                  component?.normativeCourseYearNum ||
                    component?.time?.Normative?.courseYearNum ||
                    component?.programYear ||
                    component?.course_programYear ||
                    component?.time?.programYear,
                ),
                normativeCourseYearInterval: normalizeAcademicYearValue(
                  component?.normativeCourseYearInterval ||
                    component?.time?.Normative?.courseYearInterval,
                ),
                normativeCourseTerm:
                  String(
                    component?.normativeCourseTerm ||
                      component?.time?.Normative?.courseTerm ||
                      "",
                  ).trim() === "-"
                    ? ""
                    : String(
                        component?.normativeCourseTerm ||
                          component?.time?.Normative?.courseTerm ||
                          "",
                      ).trim(),
                ...currentProgramTiming,
                course_dayAndTime: splitCourseTextList(
                  formatCourseScheduleDisplay(component?.course_dayAndTime),
                ).filter((entry) => entry !== "-"),
                course_grade: String(component?.course_grade || "").trim(),
                course_weightTotal: String(
                  component?.course_weightTotal || "100",
                ).trim(),
                course_locationBuilding: String(
                  componentLocation?.building || "",
                ).trim(),
                course_locationRoom: String(
                  componentLocation?.room || "",
                ).trim(),
              };
            })
          : [
              {
                course_componentId: String(
                  course?.course_componentId ||
                    course?._id ||
                    course?.primaryComponentId ||
                    "",
                ).trim(),
                component_status: normalizeSavedComponentStatusValue(
                  course?.component_status || course?.status || "",
                ),
                course_class: String(
                  normalizeSavedComponentClassLabel(
                    course?.course_class || course?.course_component || "",
                  ),
                ).trim(),
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
                ...currentProgramTiming,
                course_dayAndTime: splitCourseTextList(
                  formatCourseScheduleDisplay(course?.course_dayAndTime),
                ).filter((entry) => entry !== "-"),
                course_grade: String(course?.course_grade || "").trim(),
                course_weightTotal: String(
                  course?.course_weightTotal || "100",
                ).trim(),
                course_locationBuilding: String(
                  courseLocation?.building || "",
                ).trim(),
                course_locationRoom: String(courseLocation?.room || "").trim(),
              },
            ];

      return {
        course_code: String(course?.course_code || "").trim(),
        course_components: savedComponents,
        course_componentId: "",
        course_status: normalizeSavedCourseStatusValue(
          course?.course_status || course?.status || "",
        ),
        component_status: "new",
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
        ...currentProgramTiming,
        course_name: String(course?.course_name || "").trim(),
        course_class: String(
          normalizeSavedComponentClassLabel(
            course?.course_class || course?.course_component || "",
          ),
        ).trim(),
        course_classSelection: "",
        course_dayAndTime: formatCourseScheduleDisplay(
          course?.course_dayAndTime,
        ),
        course_daySelection: "",
        course_timeSelection: "",
        course_grade: String(course?.course_grade || "").trim(),
        course_weightTotal: String(course?.course_weightTotal || "100").trim(),
        course_locationBuilding: String(courseLocation?.building || "").trim(),
        course_locationRoom: String(courseLocation?.room || "").trim(),
      };
    };

    this.setState({
      plannerTab: safeMode === "edit" ? "courses" : this.state.plannerTab,
      savedCourseEditorVisible: true,
      savedCourseEditorMode: safeMode,
      savedCourseDraft:
        safeMode === "edit" && selectedCourse
          ? buildDraftFromCourse(selectedCourse)
          : {
              ...getDefaultSavedCourseDraft(),
              ...this.getCurrentProgramTiming(),
            },
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
    const currentProgramTiming = this.getCurrentProgramTiming();
    const clonedComponents =
      Array.isArray(selectedCourse?.components) &&
      selectedCourse.components.length > 0
        ? selectedCourse.components.map((component) => {
            const componentLocation =
              component?.course_location &&
              typeof component.course_location === "object"
                ? component.course_location
                : {};

            return {
              component_status: normalizeSavedComponentStatusValue(
                component?.component_status || component?.status || "",
              ),
              course_class: String(
                normalizeSavedComponentClassLabel(
                  component?.course_class || component?.course_component || "",
                ),
              ).trim(),
              normativeCourseYearNum: normalizeProgramYearValue(
                component?.normativeCourseYearNum ||
                  component?.time?.Normative?.courseYearNum ||
                  component?.programYear ||
                  component?.course_programYear ||
                  component?.time?.programYear,
              ),
              normativeCourseYearInterval: normalizeAcademicYearValue(
                component?.normativeCourseYearInterval ||
                  component?.time?.Normative?.courseYearInterval,
              ),
              normativeCourseTerm:
                String(
                  component?.normativeCourseTerm ||
                    component?.time?.Normative?.courseTerm ||
                    "",
                ).trim() === "-"
                  ? ""
                  : String(
                      component?.normativeCourseTerm ||
                        component?.time?.Normative?.courseTerm ||
                        "",
                    ).trim(),
              ...currentProgramTiming,
              course_dayAndTime: splitCourseTextList(
                formatCourseScheduleDisplay(component?.course_dayAndTime),
              ).filter((entry) => entry !== "-"),
              course_grade: String(component?.course_grade || "").trim(),
              course_weightTotal: String(
                component?.course_weightTotal || "100",
              ).trim(),
              course_locationBuilding: String(
                componentLocation?.building || "",
              ).trim(),
              course_locationRoom: String(componentLocation?.room || "").trim(),
            };
          })
        : [
            {
              component_status: normalizeSavedComponentStatusValue(
                selectedCourse?.component_status ||
                  selectedCourse?.status ||
                  "",
              ),
              course_class: String(
                normalizeSavedComponentClassLabel(
                  selectedCourse?.course_class ||
                    selectedCourse?.course_component ||
                    "",
                ),
              ).trim(),
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
              ...currentProgramTiming,
              course_dayAndTime: splitCourseTextList(
                formatCourseScheduleDisplay(selectedCourse?.course_dayAndTime),
              ).filter((entry) => entry !== "-"),
              course_grade: String(selectedCourse?.course_grade || "").trim(),
              course_weightTotal: String(
                selectedCourse?.course_weightTotal || "100",
              ).trim(),
              course_locationBuilding: String(
                selectedLocation?.building || "",
              ).trim(),
              course_locationRoom: String(selectedLocation?.room || "").trim(),
            },
          ];

    if (!selectedCourse) {
      this.openSavedCourseEditor("add");
      return;
    }

    this.setState({
      savedCourseEditorVisible: true,
      savedCourseEditorMode: "add",
      savedCourseDraft: {
        course_code: String(selectedCourse?.course_code || "").trim(),
        course_components: clonedComponents,
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
        ...currentProgramTiming,
        course_name: String(selectedCourse?.course_name || "").trim(),
        course_status: normalizeSavedCourseStatusValue(
          selectedCourse?.course_status || selectedCourse?.status || "",
        ),
        course_class: String(
          normalizeSavedComponentClassLabel(
            selectedCourse?.course_class ||
              selectedCourse?.course_component ||
              "",
          ),
        ).trim(),
        course_classSelection: "",
        course_dayAndTime: formatCourseScheduleDisplay(
          selectedCourse?.course_dayAndTime,
        ),
        course_daySelection: "",
        course_timeSelection: "",
        course_grade: String(selectedCourse?.course_grade || "").trim(),
        course_weightTotal: String(
          selectedCourse?.course_weightTotal || "100",
        ).trim(),
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
      savedCourse_isSaving: false,
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

    normalizedEntries.sort((leftCourse, rightCourse) => {
      if (savedCourseSortKey === "program_year") {
        return (
          (getProgramYearSortValue(leftCourse) -
            getProgramYearSortValue(rightCourse)) *
          directionMultiplier
        );
      }

      if (savedCourseSortKey === "course_year_term") {
        const leftProgramYear = getProgramYearSortValue(leftCourse);
        const rightProgramYear = getProgramYearSortValue(rightCourse);

        if (leftProgramYear !== rightProgramYear) {
          return (leftProgramYear - rightProgramYear) * directionMultiplier;
        }

        const leftYear = getAcademicYearSortValue(
          normalizeAcademicYearValue(leftCourse?.course_year),
        );
        const rightYear = getAcademicYearSortValue(
          normalizeAcademicYearValue(rightCourse?.course_year),
        );

        if (leftYear !== rightYear) {
          return (leftYear - rightYear) * directionMultiplier;
        }

        return (
          (getPlannerTermRank(leftCourse?.course_term) -
            getPlannerTermRank(rightCourse?.course_term)) *
          directionMultiplier
        );
      }

      const getComparableValue = (course) => {
        switch (savedCourseSortKey) {
          case "course_name":
            return formatSavedCourseTitle(course);
          case "course_class":
            return formatSavedCourseComponent(
              course,
              this.isArabic() ? "ar" : "en",
            );
          case "course_schedule":
            return formatCourseScheduleDisplay(course?.course_dayAndTime);
          case "course_location":
            return formatCourseLocationDisplay(course?.course_location);
          case "course_weight":
          case "course_grade":
            return String(course?.course_grade || "-");
          default:
            return formatSavedCourseTitle(course);
        }
      };

      const leftValue = String(getComparableValue(leftCourse) || "").trim();
      const rightValue = String(getComparableValue(rightCourse) || "").trim();

      return (
        leftValue.localeCompare(rightValue, undefined, {
          numeric: true,
          sensitivity: "base",
        }) * directionMultiplier
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
          return formatExamTimingDisplay(
            examEntry,
            this.isArabic() ? "ar" : "en",
          );
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
    if (this.state.savedCourse_isSaving) {
      return;
    }

    this.setState({
      savedCourse_isSaving: true,
    });

    try {
      const {
        savedCourseDraft,
        savedCourseEditorMode,
        selectedCourseForLecturesId,
        savedCourseDetailsComponentId,
      } = this.state;
      const courseName = String(savedCourseDraft?.course_name || "").trim();
      const courseCode = String(savedCourseDraft?.course_code || "").trim();
      const pendingComponent = buildSavedCourseComponentEntryFromDraft({
        ...savedCourseDraft,
        course_class:
          String(savedCourseDraft?.course_classSelection || "").trim() ||
          String(savedCourseDraft?.course_class || "").trim(),
      });
      const persistedComponents = Array.isArray(
        savedCourseDraft?.course_components,
      )
        ? savedCourseDraft.course_components.filter(Boolean)
        : [];
      const componentsToPersist =
        persistedComponents.length > 0
          ? persistedComponents
          : pendingComponent
            ? [pendingComponent]
            : [];

      if (!courseName) {
        this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
        return;
      }

      if (
        componentsToPersist.length === 0 ||
        !String(componentsToPersist[0]?.course_class || "").trim()
      ) {
        this.props.serverReply(
          this.isArabic()
            ? "يرجى إضافة تصنيف المكوّن"
            : "Please add component class",
        );
        return;
      }

      if (savedCourseEditorMode === "edit") {
        const selectedComponentId = String(
          savedCourseDetailsComponentId || selectedCourseForLecturesId || "",
        ).trim();
        const selectedCourse =
          (Array.isArray(this.state?.courses) ? this.state.courses : []).find(
            (course) =>
              String(course?._id || "").trim() === selectedComponentId,
          ) || null;

        if (!selectedCourse) {
          return;
        }

        const parentCourseId = String(
          selectedCourse?.parentCourseId || selectedCourse?._id || "",
        ).trim();
        const componentId = String(
          selectedCourse?.primaryComponentId || selectedCourse?._id || "",
        ).trim();
        const existingComponents = Array.isArray(selectedCourse?.components)
          ? selectedCourse.components
          : [];
        const existingComponentIds = existingComponents
          .map((component, componentIndex) =>
            String(
              component?.course_componentId ||
                component?._id ||
                (componentIndex === 0 ? componentId : "") ||
                "",
            ).trim(),
          )
          .filter(Boolean);
        const buildComponentRequestPayload = (componentEntry = {}) => ({
          course_class: componentEntry.course_class || "-",
          course_status: componentEntry.component_status || "new",
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
          course_dayAndTime: Array.isArray(componentEntry.course_dayAndTime)
            ? componentEntry.course_dayAndTime
            : [],
          course_year: componentEntry.course_year || "-",
          academicYear: componentEntry.course_year || "-",
          course_term: componentEntry.course_term || "-",
          term: componentEntry.course_term || "-",
          course_grade: componentEntry.course_grade || "-",
          course_weightTotal: componentEntry.course_weightTotal || "100",
          course_locationBuilding:
            componentEntry.course_locationBuilding || "-",
          course_locationRoom: componentEntry.course_locationRoom || "-",
          course_exams: [],
        });
        const keptExistingComponentIds = new Set();

        if (parentCourseId) {
          await fetch(
            apiUrl("/api/user/editCourse/") +
              this.props.state.my_id +
              "/" +
              parentCourseId,
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
                course_status: savedCourseDraft.course_status || "new",
              }),
            },
          );
        }

        for (
          let componentIndexToPersist = 0;
          componentIndexToPersist < componentsToPersist.length;
          componentIndexToPersist += 1
        ) {
          const componentEntry = componentsToPersist[componentIndexToPersist];
          const targetComponentId = String(
            componentEntry?.course_componentId ||
              existingComponentIds[componentIndexToPersist] ||
              "",
          ).trim();
          const requestPayload = buildComponentRequestPayload(componentEntry);

          if (targetComponentId) {
            keptExistingComponentIds.add(targetComponentId);
            await fetch(
              apiUrl("/api/user/editCourse/") +
                this.props.state.my_id +
                "/" +
                targetComponentId,
              {
                method: "POST",
                mode: "cors",
                headers: {
                  Authorization: "Bearer " + this.props.state.token,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
              },
            );
            continue;
          }

          if (parentCourseId) {
            await fetch(
              apiUrl("/api/user/addComponent/") +
                this.props.state.my_id +
                "/" +
                parentCourseId,
              {
                method: "POST",
                mode: "cors",
                headers: {
                  Authorization: "Bearer " + this.props.state.token,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestPayload),
              },
            );
          }
        }

        const componentIdsToDelete = existingComponentIds.filter(
          (existingId) => !keptExistingComponentIds.has(existingId),
        );

        for (const componentIdToDelete of componentIdsToDelete) {
          await fetch(
            apiUrl("/api/user/deleteCourse/") +
              this.props.state.my_id +
              "/" +
              componentIdToDelete,
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

        this.closeSavedCourseEditor();
        this.retrieveCourses(parentCourseId || componentId);
        return;
      }

      const courseInfoResponse = await fetch(
        apiUrl("/api/user/addCourseInfo/") + this.props.state.my_id,
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
          }),
        },
      );

      if (!courseInfoResponse.ok) {
        this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
        return;
      }

      const createdCoursePayload = await courseInfoResponse
        .json()
        .catch(() => ({}));
      const createdCourseId = String(
        createdCoursePayload?.course?._id || "",
      ).trim();

      let createdComponentId = "";

      if (createdCourseId) {
        for (const componentEntry of componentsToPersist) {
          const componentResponse = await fetch(
            apiUrl("/api/user/addComponent/") +
              this.props.state.my_id +
              "/" +
              createdCourseId,
            {
              method: "POST",
              mode: "cors",
              headers: {
                Authorization: "Bearer " + this.props.state.token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                course_class: componentEntry.course_class || "-",
                course_status: componentEntry.component_status || "new",
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
                course_dayAndTime: Array.isArray(
                  componentEntry.course_dayAndTime,
                )
                  ? componentEntry.course_dayAndTime
                  : [],
                course_grade: componentEntry.course_grade || "-",
                course_locationBuilding:
                  componentEntry.course_locationBuilding || "-",
                course_locationRoom: componentEntry.course_locationRoom || "-",
                course_exams: [],
              }),
            },
          );

          const componentPayload = await componentResponse
            .json()
            .catch(() => ({}));

          if (!componentResponse.ok && componentResponse.status !== 201) {
            this.props.serverReply(
              componentPayload?.message ||
                this.t("postingFailedPleaseAddCourseName"),
            );
            return;
          }

          if (!createdComponentId) {
            createdComponentId = String(
              componentPayload?.component?._id || "",
            ).trim();
          }
        }
      }

      this.closeSavedCourseEditor();
      this.retrieveCourses(createdComponentId || createdCourseId);
    } finally {
      this.setState({
        savedCourse_isSaving: false,
      });
    }
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
    const {
      selectedTabItemId,
      deleteSelectionMode,
      deleteSelectionIds,
      inlineLectureRowVisible,
      inlineLectureDraft,
      lectureSortKey,
      lectureSortDirection,
      lecture_isLoading,
    } = this.state;
    const visibleLectures = this.getLecturesForSelectedCourse();
    const sortedLectures = this.getSortedLectures(visibleLectures);
    const renderLectureSortLabel = (sortKey, fallbackLabel) => {
      const isActive = lectureSortKey === sortKey;
      const sortMarker = isActive
        ? lectureSortDirection === "asc"
          ? " ▲"
          : " ▼"
        : "";

      return `${fallbackLabel}${sortMarker}`;
    };

    return (
      <table className="nogaPlanner_tabTable nogaPlanner_lecturesTable">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className="nogaPlanner_tabTableSortButton"
                onClick={() => this.handleLectureSort("lecture_name")}
              >
                {renderLectureSortLabel(
                  "lecture_name",
                  this.isArabic()
                    ? "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"
                    : "Title",
                )}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="nogaPlanner_tabTableSortButton"
                onClick={() => this.handleLectureSort("lecture_instructors")}
              >
                {renderLectureSortLabel(
                  "lecture_instructors",
                  this.isArabic()
                    ? "\u0627\u0644\u0645\u062f\u0631\u0633\u0648\u0646"
                    : "Instructors",
                )}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="nogaPlanner_tabTableSortButton"
                onClick={() => this.handleLectureSort("lecture_writers")}
              >
                {renderLectureSortLabel(
                  "lecture_writers",
                  this.isArabic()
                    ? "\u0627\u0644\u0643\u062a\u0651\u0627\u0628"
                    : "Writer",
                )}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="nogaPlanner_tabTableSortButton"
                onClick={() => this.handleLectureSort("lecture_date")}
              >
                {renderLectureSortLabel(
                  "lecture_date",
                  this.isArabic()
                    ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0634\u0631"
                    : "Publish Date",
                )}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {inlineLectureRowVisible ? (
            <tr className="nogaPlanner_tabTableRow nogaPlanner_tabTableRow--editor">
              <td>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  value={inlineLectureDraft.lecture_name}
                  onChange={(event) =>
                    this.handleInlineLectureDraftChange(
                      "lecture_name",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "العنوان" : "Title"}
                />
              </td>
              <td>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  value={inlineLectureDraft.lecture_instructors}
                  onChange={(event) =>
                    this.handleInlineLectureDraftChange(
                      "lecture_instructors",
                      event.target.value,
                    )
                  }
                  placeholder={
                    this.isArabic()
                      ? "المدرسون، افصل بـ |"
                      : "Instructors, separate with |"
                  }
                />
              </td>
              <td>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  value={inlineLectureDraft.lecture_writers}
                  onChange={(event) =>
                    this.handleInlineLectureDraftChange(
                      "lecture_writers",
                      event.target.value,
                    )
                  }
                  placeholder={
                    this.isArabic()
                      ? "الكتّاب، افصل بـ |"
                      : "Writers, separate with |"
                  }
                />
              </td>
              <td>
                <div className="nogaPlanner_savedCoursesDetailsInputs">
                  <input
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="date"
                    value={inlineLectureDraft.lecture_date}
                    onChange={(event) =>
                      this.handleInlineLectureDraftChange(
                        "lecture_date",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </td>
            </tr>
          ) : null}
          {sortedLectures.length === 0 && !inlineLectureRowVisible && (
            <tr>
              <td
                colSpan={4}
                style={{
                  textAlign: "center",
                  opacity: 0.5,
                  padding: "18px",
                }}
              >
                {lecture_isLoading
                  ? this.isArabic()
                    ? "جارٍ تحميل المحاضرات..."
                    : "Loading lectures..."
                  : this.isArabic()
                    ? "لا توجد محاضرات"
                    : "No lectures"}
              </td>
            </tr>
          )}
          {sortedLectures.map((item) => (
            <tr
              key={item._id}
              className={
                "nogaPlanner_tabTableRow" +
                ((
                  deleteSelectionMode
                    ? deleteSelectionIds.includes(String(item._id))
                    : String(selectedTabItemId) === String(item._id)
                )
                  ? " selected"
                  : "")
              }
              onClick={() => this.handleTabItemClick(item._id)}
            >
              <td style={getCellAlignmentStyle(item.lecture_name)}>
                {item.lecture_name}
              </td>
              <td
                style={getCellAlignmentStyle(
                  formatPlannerTextList(
                    item.lecture_instructors || item.lecture_instructor,
                  ),
                )}
              >
                {formatPlannerTextList(
                  item.lecture_instructors || item.lecture_instructor,
                )}
              </td>
              <td
                style={getCellAlignmentStyle(
                  formatPlannerTextList(
                    item.lecture_writers || item.lecture_writer,
                  ),
                )}
              >
                {formatPlannerTextList(
                  item.lecture_writers || item.lecture_writer,
                )}
              </td>
              <td style={getCellAlignmentStyle(item.lecture_date || "-")}>
                {item.lecture_date || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  renderTabDetailsPanel = () => {
    const { plannerTab } = this.state;
    const item = this.getSelectedTabItem();
    if (!item) {
      return (
        <div className="nogaPlanner_monitorEmpty">
          {this.isArabic()
            ? "اختر مقرراً أو محاضرة من القائمة لعرض التفاصيل."
            : "Select a course or lecture from the list to view details."}
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
                this.isArabic() ? "ar" : "en",
              )}
            </p>
            <p>{formatCourseScheduleDisplay(item.course_dayAndTime)}</p>
            <p>{`${this.isArabic() ? "السنة الأصلية" : "Program year"}: ${
              normalizeProgramYearValue(
                item.programYear ||
                  item.course_programYear ||
                  item.time?.programYear,
              ) || "-"
            }`}</p>
            <p>{formatCourseLocationDisplay(item.course_location)}</p>
            <p>{`${this.isArabic() ? "الوزن" : "Weight"}: ${item.course_grade || "-"}`}</p>
            <p>{`${this.isArabic() ? "الدرجة" : "Grade"}: ${item.course_fullGrade || "-"}`}</p>
            <p>{`${this.isArabic() ? "الحجم" : "Volume"}: ${item.course_length || 0}`}</p>
            <p>{`${this.isArabic() ? "التقدم" : "Progress"}: ${item.course_progress || 0}`}</p>
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

    this.state = {
      ui_locale: initialLocale,
      wrapperTab: "courses",
      plannerTab: "courses",
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
      savedCourse_isSaving: false,
      lecture_isLoading: false,
      telegram_isLoading: false,
      telegram_error: "",
      telegram_messages: [],
      telegram_groupTitle:
        props.locale === "ar" ? "مجموعة تيليجرام" : "Telegram Group",
      telegram_groupReference: "",
      telegram_panelGroupTitle: "Telegram Group",
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
      savedCourseEditorVisible: false,
      savedCourseEditorMode: "add",
      savedCourseDraft: getDefaultSavedCourseDraft(),
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
    this.plannerSnapshotRequest = null;
  }

  isArabic = () => this.state.ui_locale === "ar";

  t = (key, values = {}) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      return "";
    }

    const arabicCatalog = SCHOOLPLANNER_TRANSLATIONS.ar || {};
    const template = this.isArabic()
      ? arabicCatalog[normalizedKey] || normalizedKey
      : normalizedKey;

    return String(template).replace(/\{(\w+)\}/g, (_, tokenName) => {
      const tokenValue = values?.[tokenName];
      return tokenValue === undefined || tokenValue === null
        ? `{${tokenName}}`
        : String(tokenValue);
    });
  };

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
      this.retrieveCourses();
      this.retrieveLectures();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.state?.my_id &&
      prevProps.state?.my_id !== this.props.state?.my_id
    ) {
      this.retrieveCourses();
      this.retrieveLectures();
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
        this.setState({ savedCourseFloatingBarPosition: null });
      }
      return;
    }

    const anchorCellNode = rowNode.querySelector(
      ".nogaPlanner_savedCoursesTableCell--component",
    );
    const anchorRect = anchorCellNode
      ? anchorCellNode.getBoundingClientRect()
      : rowNode.getBoundingClientRect();
    const nextPosition = {
      top: Math.round(anchorRect.bottom),
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

    this.setState({ savedCourseFloatingBarPosition: nextPosition });
  };

  retrieveLectures = async () => {
    if (!this.props.state?.my_id) {
      return;
    }

    this.setState({ lecture_isLoading: true });

    try {
      const { lectures: nextLectures } = await this.fetchPlannerSnapshot();

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
        this.setState({ lecture_isLoading: false });
      }
      console.error("[retrieveLectures] fetch failed:", error);
    }
  };

  retrieveCourses = async (selectedCourseId = "") => {
    if (!this.props.state?.my_id) {
      return;
    }

    this.setState({ course_isLoading: true });

    try {
      const { courses: nextCourses } = await this.fetchPlannerSnapshot();

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
        this.setState({ course_isLoading: false });
      }
      console.error("[retrieveCourses] fetch failed:", error);
    }
  };

  fetchPlannerSnapshot = async () => {
    if (!this.props.state?.my_id) {
      return { courses: [], lectures: [] };
    }

    if (!this.plannerSnapshotRequest) {
      this.plannerSnapshotRequest = fetch(
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
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to retrieve planner snapshot: ${response.status}`,
            );
          }

          const payload = await response.json();
          const memory = normalizeMemoryPayload(payload);
          return {
            courses: getSafePlannerCourses(memory),
            lectures: getSafePlannerLectures(memory),
          };
        })
        .finally(() => {
          this.plannerSnapshotRequest = null;
        });
    }

    return this.plannerSnapshotRequest;
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
    const selectedCourse =
      (this.state.courses || []).find(
        (course) => String(course?._id || "") === String(courseId || ""),
      ) || null;
    const examEntries = this.getRenderableCourseExamEntries(selectedCourse);
    const parsedExamIndex = Number(examIndex);
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

  getLectureLabelById = (lectureId = "") => {
    const normalizedLectureId = String(lectureId || "").trim();
    if (!normalizedLectureId) {
      return "";
    }

    const matchedLecture =
      (Array.isArray(this.state.lectures) ? this.state.lectures : []).find(
        (lecture) => String(lecture?._id || "").trim() === normalizedLectureId,
      ) || null;

    return (
      String(matchedLecture?.lecture_name || "").trim() || normalizedLectureId
    );
  };

  openExamLectures = (course = {}, examEntry = {}) => {
    const selectedCourseId = String(course?._id || "").trim();
    if (!selectedCourseId) {
      return;
    }

    const linkedLectureIds = Array.isArray(examEntry?.lectures)
      ? examEntry.lectures
          .map((lectureId) => String(lectureId || "").trim())
          .filter(Boolean)
      : [];

    this.setState({
      plannerTab: "lectures",
      selectedCourseForLecturesId: selectedCourseId,
      selectedCourseForLecturesName: buildCourseLectureMatchLabel(course),
      selectedTabItemId: linkedLectureIds[0] || null,
      deleteSelectionMode: false,
      deleteSelectionIds: [],
    });
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
        : {
            ...getDefaultExamDraft(),
            selectedCourseId: selectedCourse?._id || "",
          },
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
        ...(normalizedEntry?._id ? { _id: normalizedEntry._id } : {}),
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
    this.setState({ selected_exam_index: -1 });
    this.retrieveCourses(selectedCourse._id);
  };

  renderSavedCoursesColumn = () => {
    const savedCourses = Array.isArray(this.state?.courses)
      ? this.state.courses
      : [];
    const isCoursesLoading = Boolean(this.state?.course_isLoading);
    const selectedComponentId = String(
      this.state?.selectedCourseForLecturesId || "",
    ).trim();
    const selectedSavedCourseIds = Array.isArray(
      this.state?.selectedSavedCourseIds,
    )
      ? this.state.selectedSavedCourseIds
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    const selectedDetailsComponentId = String(
      this.state?.savedCourseDetailsComponentId || "",
    ).trim();
    const {
      plannerTab,
      savedCourseEditorVisible,
      savedCourseEditorMode,
      savedCourseDraft,
      savedCourseSelectionMode,
      deleteSelectionMode,
      deleteSelectionIds,
      savedCourseSortKey,
      savedCourseSortDirection,
    } = this.state;
    const selectedDetailsCourse =
      savedCourses.find(
        (course) =>
          String(course?._id || "").trim() === selectedDetailsComponentId,
      ) || null;
    const selectedSavedCoursesCount = selectedSavedCourseIds.length;
    const canEditSelectedCourse = selectedSavedCoursesCount === 1;
    const canDeleteSelectedCourses = selectedSavedCoursesCount > 0;
    const shouldShowSelectedCourseLectures =
      plannerTab === "lectures" &&
      Boolean(selectedComponentId) &&
      !savedCourseSelectionMode &&
      !(savedCourseEditorVisible && savedCourseEditorMode === "edit");
    const shouldShowFloatingCourseRowActions =
      plannerTab === "courses" &&
      !savedCourseSelectionMode &&
      !savedCourseEditorVisible;
    const selectedLectureDeleteCount = Array.isArray(deleteSelectionIds)
      ? deleteSelectionIds.length
      : 0;
    const sortedSavedCourses = this.getSortedSavedCourses(savedCourses);
    const savedCourseRowSpanByIndex = new Map();
    for (let index = 0; index < sortedSavedCourses.length; index += 1) {
      const currentCourse = sortedSavedCourses[index];
      const currentGroupKey =
        String(currentCourse?.parentCourseId || "").trim() ||
        String(currentCourse?.course_name || "").trim();
      const previousCourse = index > 0 ? sortedSavedCourses[index - 1] : null;
      const previousGroupKey =
        String(previousCourse?.parentCourseId || "").trim() ||
        String(previousCourse?.course_name || "").trim();

      if (
        index > 0 &&
        currentGroupKey &&
        currentGroupKey === previousGroupKey
      ) {
        savedCourseRowSpanByIndex.set(index, 0);
        continue;
      }

      let rowSpan = 1;
      for (
        let nextIndex = index + 1;
        nextIndex < sortedSavedCourses.length;
        nextIndex += 1
      ) {
        const nextCourse = sortedSavedCourses[nextIndex];
        const nextGroupKey =
          String(nextCourse?.parentCourseId || "").trim() ||
          String(nextCourse?.course_name || "").trim();

        if (!currentGroupKey || nextGroupKey !== currentGroupKey) {
          break;
        }

        rowSpan += 1;
      }

      savedCourseRowSpanByIndex.set(index, rowSpan);
    }
    const savedCourseCounts = savedCourses.reduce(
      (accumulator, course) => {
        const normalizedCourseName =
          String(course?.course_name || "")
            .trim()
            .toLowerCase() || "-";

        accumulator.componentCount += 1;
        accumulator.courseNames.add(normalizedCourseName);

        if (isSavedCourseComponentFailed(course)) {
          accumulator.failedComponentsCount += 1;
        } else if (isSavedCourseComponentOngoing(course)) {
          accumulator.ongoingComponentsCount += 1;
        }

        return accumulator;
      },
      {
        componentCount: 0,
        failedComponentsCount: 0,
        ongoingComponentsCount: 0,
        courseNames: new Set(),
      },
    );
    const uniqueSavedCoursesCount = savedCourseCounts.courseNames.size;
    const savedCourseComponentsCount = savedCourseCounts.componentCount;
    const failedSavedCourseComponentsCount =
      savedCourseCounts.failedComponentsCount;
    const ongoingSavedCourseComponentsCount =
      savedCourseCounts.ongoingComponentsCount;
    const isEditingSelectedDetails = Boolean(
      savedCourseEditorVisible &&
      savedCourseEditorMode === "edit" &&
      selectedDetailsCourse,
    );
    const renderSavedCourseSortLabel = (sortKey, fallbackLabel) => {
      const isActive = savedCourseSortKey === sortKey;
      const sortMarker = isActive
        ? savedCourseSortDirection === "asc"
          ? " ▲"
          : " ▼"
        : "";

      return `${fallbackLabel}${sortMarker}`;
    };
    const renderSavedCourseEditorPanel = () => (
      <div className="nogaPlanner_savedCourseEditor">
        <div className="nogaPlanner_savedCourseEditorGrid">
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--course nogaPlanner_savedCourseEditorCell--courseBlock">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "بيانات المقرر" : "Course"}
            </p>
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={savedCourseDraft.course_name}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "course_name",
                  event.target.value,
                )
              }
              placeholder={this.isArabic() ? "اسم المقرر" : "Course name"}
            />
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={savedCourseDraft.course_code}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "course_code",
                  event.target.value,
                )
              }
              placeholder={this.isArabic() ? "رمز المقرر" : "Course code"}
            />
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={savedCourseDraft.course_status}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "course_status",
                  event.target.value,
                )
              }
            >
              {COURSE_STATUS_OPTIONS.map((optionValue) => (
                <option key={optionValue.value} value={optionValue.value}>
                  {this.isArabic() ? optionValue.labelAr : optionValue.labelEn}
                </option>
              ))}
            </select>
          </div>
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentDetails nogaPlanner_savedCourseEditorCell--componentBlock">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "بيانات المكوّن" : "Component details"}
            </p>
            <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "التوقيت" : "Timing"}
              </span>
              <div className="nogaPlanner_savedCourseDetailGroupsGrid">
                <div className="nogaPlanner_savedCourseDetailGroup">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "المفترض" : "Normative"}
                  </span>
                  <input
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="number"
                    min="0"
                    step="1"
                    value={savedCourseDraft.normativeCourseYearNum}
                    onChange={(event) =>
                      this.handleSavedCourseDraftChange(
                        "normativeCourseYearNum",
                        event.target.value,
                      )
                    }
                    placeholder={
                      this.isArabic()
                        ? "رقم السنة المفترضة"
                        : "Normative year number"
                    }
                  />
                  <input
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="text"
                    value={savedCourseDraft.normativeCourseYearInterval}
                    readOnly
                    placeholder={
                      this.isArabic()
                        ? "الفترة المفترضة"
                        : "Normative year interval"
                    }
                  />
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={savedCourseDraft.normativeCourseTerm}
                    onChange={(event) =>
                      this.handleSavedCourseDraftChange(
                        "normativeCourseTerm",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {this.isArabic() ? "الفصل المفترض" : "Normative term"}
                    </option>
                    {TERM_OPTIONS.map((optionValue) => (
                      <option
                        key={`normative-${optionValue.value}`}
                        value={optionValue.value}
                      >
                        {this.isArabic()
                          ? optionValue.labelAr
                          : optionValue.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nogaPlanner_savedCourseDetailGroup">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "الحقيقي" : "Actual"}
                  </span>
                  <input
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="number"
                    min="0"
                    step="1"
                    value={savedCourseDraft.actualCourseYearNum}
                    readOnly
                    placeholder={
                      this.isArabic()
                        ? "رقم السنة الفعلية"
                        : "Actual year number"
                    }
                  />
                  <input
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="text"
                    value={savedCourseDraft.actualCourseYearInterval}
                    readOnly
                    placeholder={
                      this.isArabic()
                        ? "الفترة الفعلية"
                        : "Actual year interval"
                    }
                  />
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={savedCourseDraft.actualCourseTerm}
                    disabled
                  >
                    <option value="">
                      {this.isArabic() ? "الفصل الفعلي" : "Actual term"}
                    </option>
                    {TERM_OPTIONS.map((optionValue) => (
                      <option
                        key={`actual-term-${optionValue.value}`}
                        value={optionValue.value}
                      >
                        {this.isArabic()
                          ? optionValue.labelAr
                          : optionValue.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseMetaColumns nogaPlanner_savedCourseEditorFieldFull">
              <div className="nogaPlanner_savedCourseMetaColumn">
                <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "النوع" : "Type"}
                  </span>
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCourseEditorFieldFull"
                    value={savedCourseDraft.course_classSelection}
                    onChange={(event) =>
                      this.handleSavedCourseDraftChange(
                        "course_classSelection",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {this.isArabic() ? "نوع المكون" : "Component class"}
                    </option>
                    {SAVED_COMPONENT_CLASS_OPTIONS.map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "الحالة" : "Status"}
                  </span>
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCourseEditorFieldFull"
                    value={savedCourseDraft.component_status}
                    onChange={(event) =>
                      this.handleSavedCourseDraftChange(
                        "component_status",
                        event.target.value,
                      )
                    }
                  >
                    {COMPONENT_STATUS_OPTIONS.map((optionValue) => (
                      <option key={optionValue.value} value={optionValue.value}>
                        {this.isArabic()
                          ? optionValue.labelAr
                          : optionValue.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "الوزن" : "Weight"}
                  </span>
                  <div className="nogaPlanner_savedCoursesDetailsInputs nogaPlanner_savedCourseEditorFieldFull">
                    <input
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="number"
                      min="0"
                      step="0.01"
                      value={savedCourseDraft.course_grade}
                      onChange={(event) =>
                        this.handleSavedCourseDraftChange(
                          "course_grade",
                          event.target.value,
                        )
                      }
                      placeholder={this.isArabic() ? "القيمة" : "Value"}
                    />
                    <input
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="number"
                      min="0"
                      step="0.01"
                      value={savedCourseDraft.course_weightTotal}
                      onChange={(event) =>
                        this.handleSavedCourseDraftChange(
                          "course_weightTotal",
                          event.target.value,
                        )
                      }
                      placeholder={this.isArabic() ? "المجموع" : "Total"}
                    />
                  </div>
                </div>
              </div>
              <div className="nogaPlanner_savedCourseMetaColumn">
                <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
                  <span className="nogaPlanner_savedCourseDetailGroupTitle">
                    {this.isArabic() ? "الدوام" : "Attendance"}
                  </span>
                  <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
                    <span className="nogaPlanner_savedCourseDetailGroupTitle">
                      {this.isArabic() ? "الجدول" : "Schedule"}
                    </span>
                    <div className="nogaPlanner_savedCoursesDetailsInputs nogaPlanner_savedCourseEditorFieldFull">
                      <select
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={savedCourseDraft.course_daySelection}
                        onChange={(event) =>
                          this.handleSavedCourseDraftChange(
                            "course_daySelection",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {this.isArabic() ? "اليوم" : "Day"}
                        </option>
                        {WEEKDAY_OPTIONS.map((optionValue) => (
                          <option
                            key={optionValue.key}
                            value={
                              this.isArabic()
                                ? optionValue.labelAr
                                : optionValue.labelEn
                            }
                          >
                            {this.isArabic()
                              ? optionValue.labelAr
                              : optionValue.labelEn}
                          </option>
                        ))}
                      </select>
                      <select
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={savedCourseDraft.course_timeSelection}
                        onChange={(event) =>
                          this.handleSavedCourseDraftChange(
                            "course_timeSelection",
                            event.target.value,
                          )
                        }
                        onKeyDown={this.handleSavedCourseScheduleEnter}
                      >
                        <option value="">
                          {this.isArabic() ? "الساعة" : "Hour"}
                        </option>
                        {HOUR_OPTIONS.map((optionValue) => (
                          <option
                            key={optionValue.value}
                            value={optionValue.value}
                          >
                            {optionValue.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={this.appendSavedCourseScheduleEntry}
                      >
                        +
                      </button>
                    </div>
                    <ul className="nogaPlanner_savedCoursesScheduleChips">
                      {splitCourseTextList(savedCourseDraft.course_dayAndTime).map(
                        (entry, entryIndex) => (
                          <li
                            key={`saved-course-schedule-${entryIndex}`}
                            className="nogaPlanner_savedCoursesScheduleChip"
                            onClick={() =>
                              this.removeSavedCourseScheduleEntry(entryIndex)
                            }
                          >
                            {entry}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                  <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseDetailGroup--location nogaPlanner_savedCourseEditorFieldFull">
                    <span className="nogaPlanner_savedCourseDetailGroupTitle">
                      {this.isArabic() ? "الموقع" : "Location"}
                    </span>
                    <input
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="text"
                      value={savedCourseDraft.course_locationBuilding}
                      onChange={(event) =>
                        this.handleSavedCourseDraftChange(
                          "course_locationBuilding",
                          event.target.value,
                        )
                      }
                      placeholder={this.isArabic() ? "المبنى" : "Building"}
                    />
                    <input
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="text"
                      value={savedCourseDraft.course_locationRoom}
                      onChange={(event) =>
                        this.handleSavedCourseDraftChange(
                          "course_locationRoom",
                          event.target.value,
                        )
                      }
                      placeholder={this.isArabic() ? "القاعة" : "Room"}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseEditorActionRow">
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn"
                onClick={this.appendSavedCourseComponentEntry}
              >
                {savedCourseEditorMode === "edit"
                  ? this.isArabic()
                    ? "تعديل مكوّن"
                    : "Edit component"
                  : this.isArabic()
                    ? "إضافة مكوّن"
                    : "Add component"}
              </button>
            </div>
          </div>
        </div>
        <div className="nogaPlanner_savedCourseComponentsTableWrap">
          <table className="nogaPlanner_savedCourseComponentsTable">
            <thead>
              <tr>
                <th>{this.isArabic() ? "المكوّن" : "Component"}</th>
                <th>{this.isArabic() ? "الحالة" : "Status"}</th>
                <th>{this.isArabic() ? "التوقيت المفترض" : "Normative"}</th>
                <th>{this.isArabic() ? "التوقيت الحقيقي" : "Actual"}</th>
                <th>{this.isArabic() ? "الجدول" : "Schedule"}</th>
                <th>{this.isArabic() ? "الموقع" : "Location"}</th>
                <th>{this.isArabic() ? "الوزن" : "Weight"}</th>
                <th>{this.isArabic() ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(savedCourseDraft.course_components)
                ? savedCourseDraft.course_components
                : []
              ).length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="nogaPlanner_savedCourseComponentsTableEmpty"
                  >
                    {this.isArabic()
                      ? "لم تتم إضافة مكونات بعد"
                      : "No components added yet"}
                  </td>
                </tr>
              ) : (
                (Array.isArray(savedCourseDraft.course_components)
                  ? savedCourseDraft.course_components
                  : []
                ).map((entry, entryIndex) => (
                  <tr
                    key={`saved-course-component-${entryIndex}`}
                    className="nogaPlanner_savedCourseComponentsTableRow"
                  >
                    <td>{entry.course_class || "-"}</td>
                    <td>
                      {formatSavedComponentStatusLabel(
                        entry.component_status || entry.status || "",
                        this.isArabic() ? "ar" : "en",
                      )}
                    </td>
                    <td>
                      {formatNormativeTimingDisplay(
                        entry,
                        this.isArabic() ? "ar" : "en",
                      )}
                    </td>
                    <td>
                      {formatActualTimingDisplay(
                        entry,
                        this.isArabic() ? "ar" : "en",
                      )}
                    </td>
                    <td>
                      {formatCourseScheduleDisplay(entry.course_dayAndTime)}
                    </td>
                    <td>
                      {formatCourseLocationDisplay({
                        building: entry.course_locationBuilding,
                        room: entry.course_locationRoom,
                      })}
                    </td>
                    <td>
                      {entry.course_grade
                        ? `${entry.course_grade}/${entry.course_weightTotal || "100"}`
                        : "-"}
                    </td>
                    <td className="nogaPlanner_savedCourseComponentsTableActions">
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_savedCourseComponentsActionBtn"
                        onClick={(event) => {
                          event.preventDefault();
                          this.moveSavedCourseComponentEntry(entryIndex, -1);
                        }}
                        disabled={entryIndex === 0}
                        aria-label={
                          this.isArabic() ? "تحريك للأعلى" : "Move up"
                        }
                        title={this.isArabic() ? "تحريك للأعلى" : "Move up"}
                      >
                        <i className="fas fa-arrow-up" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_savedCourseComponentsActionBtn"
                        onClick={(event) => {
                          event.preventDefault();
                          this.moveSavedCourseComponentEntry(entryIndex, 1);
                        }}
                        disabled={
                          entryIndex ===
                          (Array.isArray(savedCourseDraft.course_components)
                            ? savedCourseDraft.course_components.length
                            : 0) -
                            1
                        }
                        aria-label={
                          this.isArabic() ? "تحريك للأسفل" : "Move down"
                        }
                        title={this.isArabic() ? "تحريك للأسفل" : "Move down"}
                      >
                        <i className="fas fa-arrow-down" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_savedCourseComponentsActionBtn"
                        onClick={(event) => {
                          event.preventDefault();
                          this.editSavedCourseComponentEntry(entryIndex);
                        }}
                        aria-label={this.isArabic() ? "تعديل" : "Edit"}
                        title={this.isArabic() ? "تعديل" : "Edit"}
                      >
                        <i className="fas fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_savedCourseComponentsActionBtn nogaPlanner_savedCourseComponentsActionBtn--danger"
                        onClick={(event) => {
                          event.preventDefault();
                          this.removeSavedCourseComponentEntry(entryIndex);
                        }}
                        aria-label={this.isArabic() ? "حذف" : "Delete"}
                        title={this.isArabic() ? "حذف" : "Delete"}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
    const renderWrapperTabs = () => (
      <div className="nogaPlanner_wrapperTabs">
        <button
          type="button"
          className={
            "nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" +
            (this.state.wrapperTab === "courses"
              ? " nogaPlanner_wrapperTabBtn--active"
              : "")
          }
          onClick={() => this.handleWrapperTabChange("courses")}
          aria-label={this.isArabic() ? "المقررات" : "Courses"}
          title={this.isArabic() ? "المقررات" : "Courses"}
        >
          <i className="fas fa-book-open" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          className={
            "nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" +
            (this.state.wrapperTab === "exams"
              ? " nogaPlanner_wrapperTabBtn--active"
              : "")
          }
          onClick={() => this.handleWrapperTabChange("exams")}
          aria-label={this.isArabic() ? "الامتحانات" : "Exams"}
          title={this.isArabic() ? "الامتحانات" : "Exams"}
        >
          <i className="fas fa-file-alt" aria-hidden="true"></i>
        </button>
      </div>
    );

    return (
      <section
        id="nogaPlanner_savedCoursesColumn"
        className="nogaPlanner_homeSoulPanel"
        ref={this.savedCoursesColumnRef}
      >
        <div className="nogaPlanner_savedCoursesColumnHeader">
          <div className="nogaPlanner_coursesTitleRow">
            <div className="fc">
              <p className="nogaPlanner_homeSoulEyebrow">
                {this.isArabic() ? "المواد المحفوظة" : "Saved courses"}
              </p>
              <h2 className="nogaPlanner_homeSoulTitle">
                {this.isArabic()
                  ? "جدول مكونات المواد"
                  : "Courses Components table"}
              </h2>
              <p className="nogaPlanner_homeSoulSubtitle">
                {this.isArabic()
                  ? "اختر مكون مادة لعرض محاضراتها."
                  : "Select a course component to render its lectures."}
              </p>
            </div>
            {renderWrapperTabs()}
            <div className="nogaPlanner_savedCoursesCounters">
              <div className="nogaPlanner_savedCoursesCounter">
                <span className="nogaPlanner_savedCoursesCounterValue">
                  {uniqueSavedCoursesCount}
                </span>
                <span className="nogaPlanner_savedCoursesCounterLabel">
                  {this.isArabic() ? "مواد" : "Courses"}
                </span>
              </div>
              <div className="nogaPlanner_savedCoursesCounter">
                <span className="nogaPlanner_savedCoursesCounterValue">
                  {savedCourseComponentsCount}
                </span>
                <span className="nogaPlanner_savedCoursesCounterLabel">
                  {this.isArabic() ? "مكونات" : "Components"}
                </span>
                <span className="nogaPlanner_savedCoursesCounterDetails">
                  <span className="nogaPlanner_savedCoursesCounterDetail nogaPlanner_savedCoursesCounterDetail--failed">
                    <span className="nogaPlanner_savedCoursesCounterDetailValue">
                      {failedSavedCourseComponentsCount}
                    </span>
                    <span className="nogaPlanner_savedCoursesCounterDetailLabel">
                      {this.isArabic() ? "راسبة" : "Failed"}
                    </span>
                  </span>
                  <span className="nogaPlanner_savedCoursesCounterDetail nogaPlanner_savedCoursesCounterDetail--ongoing">
                    <span className="nogaPlanner_savedCoursesCounterDetailValue">
                      {ongoingSavedCourseComponentsCount}
                    </span>
                    <span className="nogaPlanner_savedCoursesCounterDetailLabel">
                      {this.isArabic() ? "أساسية" : "Ongoing"}
                    </span>
                  </span>
                </span>
              </div>
            </div>
            <div className="nogaPlanner_coursesMiniBar">
              {shouldShowSelectedCourseLectures ? (
                <>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.openInlineLectureRow}
                  >
                    {this.t("addLecture")}
                  </button>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                    onClick={this.handleMiniBarDelete}
                    aria-pressed={deleteSelectionMode}
                    aria-label={
                      deleteSelectionMode
                        ? this.isArabic()
                          ? `حذف (${selectedLectureDeleteCount})`
                          : `Delete (${selectedLectureDeleteCount})`
                        : this.t("deleteLecture")
                    }
                    title={
                      deleteSelectionMode
                        ? this.isArabic()
                          ? `حذف (${selectedLectureDeleteCount})`
                          : `Delete (${selectedLectureDeleteCount})`
                        : this.t("deleteLecture")
                    }
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true"></i>
                  </button>
                  {deleteSelectionMode ? (
                    <button
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                      onClick={this.clearLectureSelection}
                      aria-label={
                        this.isArabic() ? "إلغاء التحديد" : "De-select"
                      }
                      title={this.isArabic() ? "إلغاء التحديد" : "De-select"}
                    >
                      <i className="fas fa-times" aria-hidden="true"></i>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                    onClick={this.handleBackToCoursesTab}
                    aria-label={
                      this.isArabic() ? "رجوع للمواد" : "Back to Courses"
                    }
                    title={this.isArabic() ? "رجوع للمواد" : "Back to Courses"}
                  >
                    <i className="fas fa-arrow-left" aria-hidden="true"></i>
                  </button>
                </>
              ) : savedCourseEditorVisible ? (
                <>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                    onClick={this.submitSavedCourseEditor}
                    disabled={this.state.savedCourse_isSaving}
                    aria-label={this.t("save")}
                    title={this.t("save")}
                  >
                    <i
                      className={
                        this.state.savedCourse_isSaving
                          ? "fas fa-spinner fa-spin"
                          : "fas fa-save"
                      }
                      aria-hidden="true"
                    ></i>
                  </button>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                    onClick={this.closeSavedCourseEditor}
                    aria-label={this.t("close")}
                    title={this.t("close")}
                  >
                    <i className="fas fa-times" aria-hidden="true"></i>
                  </button>
                </>
              ) : (
                <>
                  {shouldShowFloatingCourseRowActions &&
                  selectedSavedCourseIds.length > 0 ? (
                    <div className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete">
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                        onClick={this.openSelectedSavedCourseLectures}
                        aria-label={
                          this.isArabic() ? "فتح المحاضرات" : "Open lectures"
                        }
                        title={
                          this.isArabic() ? "فتح المحاضرات" : "Open lectures"
                        }
                      >
                        <i className="fas fa-book-open" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                        onClick={() => this.openSavedCourseEditor("edit")}
                        disabled={!canEditSelectedCourse}
                        aria-label={this.isArabic() ? "تعديل" : "Edit"}
                        title={this.isArabic() ? "تعديل" : "Edit"}
                      >
                        <i className="fas fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                        onClick={this.cloneSelectedSavedCourseToEditor}
                        disabled={!canEditSelectedCourse}
                        aria-label={this.isArabic() ? "استنساخ" : "Clone row"}
                        title={this.isArabic() ? "استنساخ" : "Clone row"}
                      >
                        <i className="fas fa-copy" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                        onClick={this.deleteSelectedSavedCourse}
                        disabled={!canDeleteSelectedCourses}
                        aria-label={this.isArabic() ? "حذف" : "Delete"}
                        title={this.isArabic() ? "حذف" : "Delete"}
                      >
                        <i className="fas fa-trash-alt" aria-hidden="true"></i>
                      </button>
                    </div>
                  ) : selectedDetailsCourse ? (
                    <>
                      <div className="nogaPlanner_coursesMiniBarGroup">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                          onClick={() => this.openSavedCourseEditor("edit")}
                          disabled={!canEditSelectedCourse}
                          aria-label={this.isArabic() ? "تعديل" : "Edit"}
                          title={this.isArabic() ? "تعديل" : "Edit"}
                        >
                          <i className="fas fa-pen" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                          onClick={this.closeSavedCourseComponentDetails}
                          aria-label={
                            this.isArabic() ? "إغلاق التفاصيل" : "Close Details"
                          }
                          title={
                            this.isArabic() ? "إغلاق التفاصيل" : "Close Details"
                          }
                        >
                          <i
                            className="fas fa-eye-slash"
                            aria-hidden="true"
                          ></i>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly nogaPlanner_coursesMiniBarBtn--add"
                          onClick={() => this.openSavedCourseEditor("add")}
                          aria-label={this.isArabic() ? "إضافة" : "Add"}
                          title={this.isArabic() ? "إضافة" : "Add"}
                        >
                          <i className="fas fa-plus" aria-hidden="true"></i>
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {savedCourseEditorVisible ? renderSavedCourseEditorPanel() : null}
          <div
            className="nogaPlanner_savedCoursesColumnBody"
            ref={this.savedCoursesColumnBodyRef}
            onScroll={this.handleSavedCoursesBodyScroll}
          >
            {shouldShowSelectedCourseLectures ? (
              this.renderSelectedCourseLecturesTable()
            ) : (
              <table className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable">
                <thead>
                  <tr>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_name")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_name");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_name",
                          this.isArabic() ? "اسم المقرر" : "Course Name",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_class")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_class");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_class",
                          this.isArabic() ? "نوع المكون" : "Component Class",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_year_term")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_year_term");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_year_term",
                          this.isArabic()
                            ? "التوقيت المفترض"
                            : "Normative Timing",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_status")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_status");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_status",
                          this.isArabic() ? "الحالة" : "Status",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_year_term")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_year_term");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_year_term",
                          this.isArabic() ? "التوقيت الحقيقي" : "Actual Timing",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_schedule")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_schedule");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_schedule",
                          this.isArabic() ? "الجدول" : "Schedule",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_location")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_location");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_location",
                          this.isArabic() ? "الموقع" : "Location",
                        )}
                      </span>
                    </th>
                    <th>
                      <span
                        className="nogaPlanner_tabTableSortLabel"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          this.handleSavedCourseSort("course_grade")
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.handleSavedCourseSort("course_grade");
                          }
                        }}
                      >
                        {renderSavedCourseSortLabel(
                          "course_grade",
                          this.isArabic() ? "الوزن" : "Weight",
                        )}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSavedCourses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          opacity: 0.6,
                          padding: "18px",
                        }}
                      >
                        {isCoursesLoading
                          ? this.isArabic()
                            ? "جارٍ تحميل المقررات..."
                            : "Loading courses..."
                          : this.isArabic()
                            ? "لا توجد مقررات محفوظة"
                            : "No saved courses"}
                      </td>
                    </tr>
                  ) : null}
                  {sortedSavedCourses.map((course, courseIndex) => {
                    const courseId = String(course?._id || "").trim();
                    const courseNameRowSpan =
                      savedCourseRowSpanByIndex.get(courseIndex) || 0;
                    const isCourseNameSelected =
                      selectedSavedCourseIds.includes(courseId) ||
                      selectedComponentId === courseId ||
                      selectedDetailsComponentId === courseId;

                    return (
                      <tr
                        key={courseId || buildCourseDuplicateKey(course)}
                        className="nogaPlanner_tabTableRow"
                        ref={(node) =>
                          this.setSavedCourseRowRef(courseId, node)
                        }
                      >
                        {courseNameRowSpan > 0 ? (
                          <td
                            rowSpan={courseNameRowSpan}
                            className={
                              "nogaPlanner_savedCoursesTableCell--merged" +
                              (isCourseNameSelected
                                ? " nogaPlanner_savedCoursesTableCell--mergedSelected"
                                : "")
                            }
                            style={getCellAlignmentStyle(course.course_name)}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              this.handleSavedCourseGroupClick(course)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                this.handleSavedCourseGroupClick(course);
                              }
                            }}
                          >
                            {course.course_name || "-"}
                          </td>
                        ) : null}
                        <td
                          className="nogaPlanner_savedCoursesTableCell--component"
                          style={getCellAlignmentStyle(
                            formatCourseComponentLabel(
                              course.course_class || course.course_component,
                              this.isArabic() ? "ar" : "en",
                            ),
                          )}
                        >
                          {formatCourseComponentLabel(
                            course.course_class || course.course_component,
                            this.isArabic() ? "ar" : "en",
                          ) || "-"}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            formatSavedCourseStatusLabel(
                              course.course_status || course.status || "",
                              this.isArabic() ? "ar" : "en",
                            ),
                          )}
                        >
                          {formatSavedCourseStatusLabel(
                            course.course_status || course.status || "",
                            this.isArabic() ? "ar" : "en",
                          )}
                        </td>
                        <td
                          className="nogaPlanner_tabTableCell--stacked"
                          style={getCellAlignmentStyle(
                            formatNormativeTimingDisplay(
                              course,
                              this.isArabic() ? "ar" : "en",
                            ),
                          )}
                        >
                          {formatNormativeTimingDisplay(
                            course,
                            this.isArabic() ? "ar" : "en",
                          )}
                        </td>
                        <td
                          className="nogaPlanner_tabTableCell--stacked"
                          style={getCellAlignmentStyle(
                            formatActualTimingDisplay(
                              course,
                              this.isArabic() ? "ar" : "en",
                            ),
                          )}
                        >
                          {formatActualTimingDisplay(
                            course,
                            this.isArabic() ? "ar" : "en",
                          )}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            formatCourseScheduleDisplay(
                              course.course_dayAndTime,
                            ),
                          )}
                        >
                          {formatCourseScheduleDisplay(
                            course.course_dayAndTime,
                          )}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            formatCourseLocationDisplay(course.course_location),
                          )}
                        >
                          {formatCourseLocationDisplay(course.course_location)}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            course.course_grade
                              ? `${course.course_grade}/${course.course_weightTotal || "100"}`
                              : "-",
                          )}
                        >
                          {course.course_grade
                            ? `${course.course_grade}/${course.course_weightTotal || "100"}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    );
  };

  renderSelectedCourseExamBoard = () => {
    const courseEntries = Array.isArray(this.state?.courses)
      ? this.state.courses
      : [];
    const examRows = courseEntries.flatMap((course) =>
      this.getRenderableCourseExamEntries(course).map(
        (examEntry, examIndex) => ({
          course,
          examEntry,
          examIndex,
        }),
      ),
    );
    const sortedExamRows = this.getSortedExamBoardRows(examRows);
    const {
      course_isLoading,
      examBoardSortKey,
      examBoardSortDirection,
      show_addExamForm,
      exam_form_mode,
      examDraft,
      selected_course_id,
      selected_exam_index,
    } = this.state;
    const selectedCourse =
      courseEntries.find(
        (course) =>
          String(course?._id || "").trim() ===
          String(selected_course_id || "").trim(),
      ) || null;
    const selectedExam =
      selectedCourse && selected_exam_index >= 0
        ? this.getRenderableCourseExamEntries(selectedCourse)[
            selected_exam_index
          ] || null
        : null;
    const linkedLectureOptions = this.getExamLectureOptionsForCourse(
      examDraft?.selectedCourseId || "",
    );
    const examComponentsCount = courseEntries.filter(
      (course) => this.getRenderableCourseExamEntries(course).length > 0,
    ).length;
    const renderExamBoardSortLabel = (sortKey, fallbackLabel) => {
      const isActive = examBoardSortKey === sortKey;
      const sortMarker = isActive
        ? examBoardSortDirection === "asc"
          ? " ▲"
          : " ▼"
        : "";

      return `${fallbackLabel}${sortMarker}`;
    };
    const renderExamEditorPanel = () => (
      <div className="nogaPlanner_savedCourseEditor nogaPlanner_examEditor">
        <div className="nogaPlanner_savedCourseEditorGrid">
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--course">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "بيانات الامتحان" : "Exam details"}
            </p>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={examDraft.selectedCourseId}
              onChange={(event) =>
                this.handleExamDraftChange(
                  "selectedCourseId",
                  event.target.value,
                )
              }
            >
              <option value="">
                {this.isArabic() ? "المكوّن المرتبط" : "Linked component"}
              </option>
              {courseEntries.map((course) => (
                <option
                  key={course?._id || Math.random()}
                  value={course?._id || ""}
                >
                  {buildCourseComponentPickerLabel(
                    course,
                    this.isArabic() ? "ar" : "en",
                  )}
                </option>
              ))}
            </select>
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={examDraft.type}
              onChange={(event) =>
                this.handleExamDraftChange("type", event.target.value)
              }
              placeholder={this.isArabic() ? "نوع الامتحان" : "Exam type"}
            />
          </div>
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentDetails">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "التوقيت" : "Timing"}
            </p>
            <div className="nogaPlanner_savedCourseDetailGroupsGrid">
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "المفترض" : "Normative"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={examDraft.normativeCourseYearNum}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "normativeCourseYearNum",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "رقم السنة" : "Year number"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.normativeCourseTerm}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "normativeCourseTerm",
                      event.target.value,
                    )
                  }
                >
                  <option value="">{this.isArabic() ? "الفصل" : "Term"}</option>
                  {TERM_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-normative-${optionValue.value}`}
                      value={optionValue.value}
                    >
                      {this.isArabic()
                        ? optionValue.labelAr
                        : optionValue.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "الحقيقي" : "Actual"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={examDraft.actualCourseYearNum}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "actualCourseYearNum",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "رقم السنة" : "Year number"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.actualCourseYearInterval}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "actualCourseYearInterval",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {this.isArabic() ? "الفترة" : "Interval"}
                  </option>
                  {ACADEMIC_YEAR_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-actual-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.actualCourseTerm}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "actualCourseTerm",
                      event.target.value,
                    )
                  }
                >
                  <option value="">{this.isArabic() ? "الفصل" : "Term"}</option>
                  {TERM_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-actual-term-${optionValue.value}`}
                      value={optionValue.value}
                    >
                      {this.isArabic()
                        ? optionValue.labelAr
                        : optionValue.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "الموقع" : "Location"}
              </span>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={examDraft.locationBuilding}
                onChange={(event) =>
                  this.handleExamDraftChange(
                    "locationBuilding",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "المبنى" : "Building"}
              />
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={examDraft.locationRoom}
                onChange={(event) =>
                  this.handleExamDraftChange("locationRoom", event.target.value)
                }
                placeholder={this.isArabic() ? "القاعة" : "Room"}
              />
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "المحاضرات المرتبطة" : "Linked lectures"}
              </span>
              <div className="nogaPlanner_examLectureTokens">
                {linkedLectureOptions.length === 0 ? (
                  <span className="nogaPlanner_examLectureEmpty">
                    {this.isArabic()
                      ? "لا توجد محاضرات متاحة لهذا المكوّن"
                      : "No lectures available for this component"}
                  </span>
                ) : (
                  linkedLectureOptions.map((lectureOption) => {
                    const isActive = Array.isArray(examDraft.linkedLectureIds)
                      ? examDraft.linkedLectureIds.includes(lectureOption.id)
                      : false;

                    return (
                      <button
                        key={lectureOption.id}
                        type="button"
                        className={
                          "nogaPlanner_examLectureToken" +
                          (isActive ? " is-active" : "")
                        }
                        onClick={() =>
                          this.toggleExamDraftLectureId(lectureOption.id)
                        }
                      >
                        {lectureOption.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroupsGrid">
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "الحجم" : "Volume"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={examDraft.volumeValue}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "volumeValue",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "القيمة" : "Value"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.volumeUnit}
                  onChange={(event) =>
                    this.handleExamDraftChange("volumeUnit", event.target.value)
                  }
                >
                  {EXAM_VOLUME_UNIT_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-volume-unit-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  value={examDraft.volumeScope}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "volumeScope",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "النطاق" : "Scope"}
                />
                <textarea
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.volumeNote}
                  onChange={(event) =>
                    this.handleExamDraftChange("volumeNote", event.target.value)
                  }
                  placeholder={this.isArabic() ? "ملاحظة" : "Note"}
                />
              </div>
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "الوزن" : "Weight"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={examDraft.weightValue}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "weightValue",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "القيمة" : "Value"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.weightUnit}
                  onChange={(event) =>
                    this.handleExamDraftChange("weightUnit", event.target.value)
                  }
                >
                  {EXAM_WEIGHT_UNIT_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-weight-unit-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroupsGrid">
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "علامة النجاح" : "Pass grade"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.passGradeValue}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "passGradeValue",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "القيمة" : "Value"}
                />
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.passGradeMin}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "passGradeMin",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "الحد الأدنى" : "Min"}
                />
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.passGradeMax}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "passGradeMax",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "الحد الأعلى" : "Max"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.passGradeUnit}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "passGradeUnit",
                      event.target.value,
                    )
                  }
                >
                  {EXAM_GRADE_UNIT_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-pass-unit-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              </div>
              <div className="nogaPlanner_savedCourseDetailGroup">
                <span className="nogaPlanner_savedCourseDetailGroupTitle">
                  {this.isArabic() ? "العلامة" : "Grade"}
                </span>
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.gradeValue}
                  onChange={(event) =>
                    this.handleExamDraftChange("gradeValue", event.target.value)
                  }
                  placeholder={this.isArabic() ? "القيمة" : "Value"}
                />
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.gradeMin}
                  onChange={(event) =>
                    this.handleExamDraftChange("gradeMin", event.target.value)
                  }
                  placeholder={this.isArabic() ? "الحد الأدنى" : "Min"}
                />
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  value={examDraft.gradeMax}
                  onChange={(event) =>
                    this.handleExamDraftChange("gradeMax", event.target.value)
                  }
                  placeholder={this.isArabic() ? "الحد الأعلى" : "Max"}
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.gradeUnit}
                  onChange={(event) =>
                    this.handleExamDraftChange("gradeUnit", event.target.value)
                  }
                >
                  {EXAM_GRADE_UNIT_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-grade-unit-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "التوصية" : "Recommendation"}
              </span>
              <div className="nogaPlanner_savedCourseDetailGroupsGrid">
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.recommendationTiming}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "recommendationTiming",
                      event.target.value,
                    )
                  }
                >
                  {EXAM_RECOMMENDATION_TIMING_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-rec-timing-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={examDraft.recommendationIntensity}
                  onChange={(event) =>
                    this.handleExamDraftChange(
                      "recommendationIntensity",
                      event.target.value,
                    )
                  }
                >
                  {EXAM_RECOMMENDATION_INTENSITY_OPTIONS.map((optionValue) => (
                    <option
                      key={`exam-rec-intensity-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="number"
                min="0"
                step="1"
                value={examDraft.recommendationSuggestedHours}
                onChange={(event) =>
                  this.handleExamDraftChange(
                    "recommendationSuggestedHours",
                    event.target.value,
                  )
                }
                placeholder={
                  this.isArabic() ? "الساعات المقترحة" : "Suggested hours"
                }
              />
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={examDraft.recommendationReason}
                onChange={(event) =>
                  this.handleExamDraftChange(
                    "recommendationReason",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "السبب" : "Reason"}
              />
              <textarea
                className="nogaPlanner_savedCoursesDetailsInput"
                value={examDraft.recommendationNote}
                onChange={(event) =>
                  this.handleExamDraftChange(
                    "recommendationNote",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "ملاحظة" : "Note"}
              />
            </div>
            <div className="nogaPlanner_savedCourseEditorActionRow">
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn"
                onClick={this.submitExamForm}
              >
                {this.isArabic()
                  ? exam_form_mode === "Edit"
                    ? "حفظ الامتحان"
                    : "إضافة امتحان"
                  : exam_form_mode === "Edit"
                    ? "Save exam"
                    : "Add exam"}
              </button>
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn"
                onClick={this.closeAddExamForm}
              >
                {this.isArabic() ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <section
        id="nogaPlanner_exam_section"
        className="nogaPlanner_homeSoulPanel"
      >
        <div className="nogaPlanner_savedCoursesColumnHeader">
          <div className="nogaPlanner_coursesTitleRow">
            <div className="fc">
              <p className="nogaPlanner_homeSoulEyebrow">
                {this.isArabic() ? "الامتحانات" : "Exams"}
              </p>
              <h2 className="nogaPlanner_homeSoulTitle">
                {this.isArabic() ? "جدول الامتحانات" : "Exams table"}
              </h2>
              <p className="nogaPlanner_homeSoulSubtitle">
                {this.isArabic()
                  ? "أدر الامتحانات المحفوظة لكل مكوّن دراسي."
                  : "Manage saved exams for each study component."}
              </p>
            </div>
            <div className="nogaPlanner_wrapperTabs">
              <button
                type="button"
                className={
                  "nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" +
                  (this.state.wrapperTab === "courses"
                    ? " nogaPlanner_wrapperTabBtn--active"
                    : "")
                }
                onClick={() => this.handleWrapperTabChange("courses")}
                aria-label={this.isArabic() ? "المقررات" : "Courses"}
                title={this.isArabic() ? "المقررات" : "Courses"}
              >
                <i className="fas fa-book-open" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" +
                  (this.state.wrapperTab === "exams"
                    ? " nogaPlanner_wrapperTabBtn--active"
                    : "")
                }
                onClick={() => this.handleWrapperTabChange("exams")}
                aria-label={this.isArabic() ? "الامتحانات" : "Exams"}
                title={this.isArabic() ? "الامتحانات" : "Exams"}
              >
                <i className="fas fa-file-alt" aria-hidden="true"></i>
              </button>
            </div>
            <div className="nogaPlanner_savedCoursesCounters">
              <div className="nogaPlanner_savedCoursesCounter">
                <span className="nogaPlanner_savedCoursesCounterValue">
                  {sortedExamRows.length}
                </span>
                <span className="nogaPlanner_savedCoursesCounterLabel">
                  {this.isArabic() ? "امتحانات" : "Exams"}
                </span>
              </div>
              <div className="nogaPlanner_savedCoursesCounter">
                <span className="nogaPlanner_savedCoursesCounterValue">
                  {examComponentsCount}
                </span>
                <span className="nogaPlanner_savedCoursesCounterLabel">
                  {this.isArabic() ? "مكونات" : "Components"}
                </span>
              </div>
            </div>
            <div className="nogaPlanner_coursesMiniBar">
              <div className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete">
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly nogaPlanner_coursesMiniBarBtn--add"
                  aria-label={this.isArabic() ? "إضافة" : "Add"}
                  title={this.isArabic() ? "إضافة" : "Add"}
                  onClick={() => this.openAddExamForm("Add")}
                >
                  <i className="fas fa-plus" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                  aria-label={this.isArabic() ? "تعديل" : "Edit"}
                  title={this.isArabic() ? "تعديل" : "Edit"}
                  onClick={() => this.openAddExamForm("Edit")}
                  disabled={!selectedExam}
                >
                  <i className="fas fa-pen" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly nogaPlanner_coursesMiniBarBtn--danger"
                  aria-label={this.isArabic() ? "حذف" : "Delete"}
                  title={this.isArabic() ? "حذف" : "Delete"}
                  onClick={this.deleteSelectedExam}
                  disabled={!selectedExam}
                >
                  <i className="fas fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          className="nogaPlanner_savedCoursesColumnBody"
          ref={this.savedCoursesColumnBodyRef}
          onScroll={this.handleSavedCoursesBodyScroll}
        >
          <table className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable">
            <thead>
              <tr>
                <th>
                  <span
                    className="nogaPlanner_tabTableSortLabel"
                    role="button"
                    tabIndex={0}
                    onClick={() => this.handleExamBoardSort("course_name")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.handleExamBoardSort("course_name");
                      }
                    }}
                  >
                    {renderExamBoardSortLabel(
                      "course_name",
                      this.isArabic() ? "المقرر" : "Course",
                    )}
                  </span>
                </th>
                <th>
                  <span
                    className="nogaPlanner_tabTableSortLabel"
                    role="button"
                    tabIndex={0}
                    onClick={() => this.handleExamBoardSort("type")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.handleExamBoardSort("type");
                      }
                    }}
                  >
                    {renderExamBoardSortLabel(
                      "type",
                      this.isArabic() ? "النوع" : "Type",
                    )}
                  </span>
                </th>
                <th>
                  <span
                    className="nogaPlanner_tabTableSortLabel"
                    role="button"
                    tabIndex={0}
                    onClick={() => this.handleExamBoardSort("time")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.handleExamBoardSort("time");
                      }
                    }}
                  >
                    {renderExamBoardSortLabel(
                      "time",
                      this.isArabic() ? "التوقيت" : "Timing",
                    )}
                  </span>
                </th>
                <th>
                  <span
                    className="nogaPlanner_tabTableSortLabel"
                    role="button"
                    tabIndex={0}
                    onClick={() => this.handleExamBoardSort("location")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.handleExamBoardSort("location");
                      }
                    }}
                  >
                    {renderExamBoardSortLabel(
                      "location",
                      this.isArabic() ? "الموقع" : "Location",
                    )}
                  </span>
                </th>
                <th>{this.isArabic() ? "المحاضرات" : "Lectures"}</th>
                <th>
                  <span
                    className="nogaPlanner_tabTableSortLabel"
                    role="button"
                    tabIndex={0}
                    onClick={() => this.handleExamBoardSort("weight")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.handleExamBoardSort("weight");
                      }
                    }}
                  >
                    {renderExamBoardSortLabel(
                      "weight",
                      this.isArabic() ? "الوزن" : "Weight",
                    )}
                  </span>
                </th>
                <th>{this.isArabic() ? "النجاح" : "Pass grade"}</th>
                <th>{this.isArabic() ? "العلامة" : "Grade"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedExamRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      opacity: 0.6,
                      padding: "18px",
                    }}
                  >
                    {course_isLoading
                      ? this.isArabic()
                        ? "جارٍ تحميل الامتحانات..."
                        : "Loading exams..."
                      : this.isArabic()
                        ? "لا توجد امتحانات"
                        : "No exams"}
                  </td>
                </tr>
              ) : (
                sortedExamRows.map(({ course, examEntry, examIndex }) => (
                  <tr
                    key={`${course?._id || course?.course_name || "course"}-${examIndex}`}
                    className={
                      "nogaPlanner_tabTableRow" +
                      (String(course?._id || "").trim() ===
                        String(selected_course_id || "").trim() &&
                      examIndex === selected_exam_index
                        ? " selected"
                        : "")
                    }
                    onClick={() =>
                      this.setSelectedCourseWithExamFocus(
                        course?._id,
                        examIndex,
                      )
                    }
                  >
                    <td
                      style={getCellAlignmentStyle(course?.course_name || "-")}
                    >
                      {course?.course_name || "-"}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        examEntry?.type || examEntry?.exam_type || "-",
                      )}
                    >
                      {examEntry?.type || examEntry?.exam_type || "-"}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        formatExamTimingDisplay(
                          examEntry,
                          this.isArabic() ? "ar" : "en",
                        ),
                      )}
                    >
                      {formatExamTimingDisplay(
                        examEntry,
                        this.isArabic() ? "ar" : "en",
                      )}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        formatCourseLocationDisplay(examEntry?.location || {}),
                      )}
                    >
                      {formatCourseLocationDisplay(examEntry?.location || {})}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        Array.isArray(examEntry?.lectures) &&
                          examEntry.lectures.length > 0
                          ? examEntry.lectures
                              .map((lectureId) =>
                                this.getLectureLabelById(lectureId),
                              )
                              .join(" | ")
                          : "-",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        this.openExamLectures(course, examEntry);
                      }}
                    >
                      {Array.isArray(examEntry?.lectures) &&
                      examEntry.lectures.length > 0
                        ? examEntry.lectures
                            .map((lectureId) =>
                              this.getLectureLabelById(lectureId),
                            )
                            .join(" | ")
                        : "-"}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        formatExamWeightDisplay(examEntry),
                      )}
                    >
                      {formatExamWeightDisplay(examEntry)}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        formatExamGradeDisplay(examEntry?.passGrade || {}),
                      )}
                    >
                      {formatExamGradeDisplay(examEntry?.passGrade || {})}
                    </td>
                    <td
                      style={getCellAlignmentStyle(
                        formatExamGradeDisplay(examEntry?.grade || {}),
                      )}
                    >
                      {formatExamGradeDisplay(examEntry?.grade || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {show_addExamForm ? renderExamEditorPanel() : null}
      </section>
    );
  };

  render() {
    const wrapperTab = this.state.wrapperTab === "exams" ? "exams" : "courses";
    const plannerBackgroundUrl = `${import.meta.env.BASE_URL}img/NogaPlannerBG.png`;

    return (
      <React.Fragment>
        <article
          id="nogaPlanner_article"
          ref={this.plannerArticleRef}
          className={`fr ${this.isArabic() ? "nogaPlanner--arabic" : ""}`.trim()}
          dir={this.isArabic() ? "rtl" : "ltr"}
          lang={this.isArabic() ? "ar" : "en"}
          data-locale={this.isArabic() ? "ar" : "en"}
          data-swipe-view={this.state.planner_swipeView}
          style={{
            "--nogaPlanner-day-bg-image": `url("${plannerBackgroundUrl}")`,
            "--nogaPlanner-bg-image": `url("${plannerBackgroundUrl}")`,
          }}
        >
          {wrapperTab === "courses"
            ? this.renderSavedCoursesColumn()
            : this.renderSelectedCourseExamBoard()}
        </article>
      </React.Fragment>
    );
  }
}
