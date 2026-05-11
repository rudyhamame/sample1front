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

const formatPlannerStatusLabel = (value, locale = "en") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalizedValue || normalizedValue === "-") {
    return "-";
  }

  const labels = {
    new: { ar: "جديد", en: "New" },
    failed: { ar: "راسب", en: "Failed" },
    incomplete: { ar: "غير مكتمل", en: "Incomplete" },
    passed: { ar: "ناجح", en: "Passed" },
    ongoing: { ar: "قيد المتابعة", en: "Ongoing" },
  };

  const localizedLabel = labels[normalizedValue];
  if (!localizedLabel) {
    return String(value || "").trim() || "-";
  }

  return locale === "ar" ? localizedLabel.ar : localizedLabel.en;
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
  course_status: "",
  course_totalWeight: "",
  component_status: "",
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
  course_locationBuilding: "",
  course_locationRoom: "",
});

const buildSavedCourseComponentEntryFromDraft = (draft = {}) => {
  const courseClass = String(draft?.course_class || "").trim();
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
    course_class: courseClass || "-",
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

const PLANNER_DEFAULT_FIELD_REGISTRY = [
  {
    key: "savedCourse.course_name",
    formKey: "savedCourse",
    fieldName: "course_name",
    labelAr: "اسم المقرر",
    labelEn: "Course name",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "savedCourse.course_code",
    formKey: "savedCourse",
    fieldName: "course_code",
    labelAr: "رمز المقرر",
    labelEn: "Course code",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "savedCourse.course_classSelection",
    formKey: "savedCourse",
    fieldName: "course_classSelection",
    labelAr: "نوع المكوّن",
    labelEn: "Component class",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "componentClassOptions",
  },
  {
    key: "savedCourse.normativeCourseYearNum",
    formKey: "savedCourse",
    fieldName: "normativeCourseYearNum",
    labelAr: "رقم السنة المفترضة",
    labelEn: "Normative year number",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "number",
  },
  {
    key: "savedCourse.normativeCourseTerm",
    formKey: "savedCourse",
    fieldName: "normativeCourseTerm",
    labelAr: "الفصل المفترض",
    labelEn: "Normative term",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "termOptions",
  },
  {
    key: "savedCourse.actualCourseYearNum",
    formKey: "savedCourse",
    fieldName: "actualCourseYearNum",
    labelAr: "رقم السنة الفعلية",
    labelEn: "Actual year number",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "number",
  },
  {
    key: "savedCourse.actualCourseYearInterval",
    formKey: "savedCourse",
    fieldName: "actualCourseYearInterval",
    labelAr: "الفترة الفعلية",
    labelEn: "Actual year interval",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "academicYearOptions",
  },
  {
    key: "savedCourse.actualCourseTerm",
    formKey: "savedCourse",
    fieldName: "actualCourseTerm",
    labelAr: "الفصل الفعلي",
    labelEn: "Actual term",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "termOptions",
  },
  {
    key: "savedCourse.course_daySelection",
    formKey: "savedCourse",
    fieldName: "course_daySelection",
    labelAr: "اليوم",
    labelEn: "Day",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "weekdayOptions",
  },
  {
    key: "savedCourse.course_timeSelection",
    formKey: "savedCourse",
    fieldName: "course_timeSelection",
    labelAr: "الساعة",
    labelEn: "Hour",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "select",
    optionsKey: "hourOptions",
  },
  {
    key: "savedCourse.course_locationBuilding",
    formKey: "savedCourse",
    fieldName: "course_locationBuilding",
    labelAr: "المبنى",
    labelEn: "Building",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "savedCourse.course_locationRoom",
    formKey: "savedCourse",
    fieldName: "course_locationRoom",
    labelAr: "القاعة",
    labelEn: "Room",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "savedCourse.course_grade",
    formKey: "savedCourse",
    fieldName: "course_grade",
    labelAr: "الوزن",
    labelEn: "Weight",
    formLabelAr: "إضافة/تعديل مقرر",
    formLabelEn: "Saved course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.type",
    formKey: "exam",
    fieldName: "type",
    labelAr: "نوع الامتحان",
    labelEn: "Exam type",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.normativeCourseYearNum",
    formKey: "exam",
    fieldName: "normativeCourseYearNum",
    labelAr: "رقم السنة المفترضة",
    labelEn: "Normative year number",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.normativeCourseTerm",
    formKey: "exam",
    fieldName: "normativeCourseTerm",
    labelAr: "الفصل المفترض",
    labelEn: "Normative term",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    optionsKey: "termOptions",
  },
  {
    key: "exam.actualCourseYearNum",
    formKey: "exam",
    fieldName: "actualCourseYearNum",
    labelAr: "رقم السنة الفعلية",
    labelEn: "Actual year number",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.actualCourseYearInterval",
    formKey: "exam",
    fieldName: "actualCourseYearInterval",
    labelAr: "الفترة الفعلية",
    labelEn: "Actual year interval",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    optionsKey: "academicYearOptions",
  },
  {
    key: "exam.actualCourseTerm",
    formKey: "exam",
    fieldName: "actualCourseTerm",
    labelAr: "الفصل الفعلي",
    labelEn: "Actual term",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    optionsKey: "termOptions",
  },
  {
    key: "exam.locationBuilding",
    formKey: "exam",
    fieldName: "locationBuilding",
    labelAr: "المبنى",
    labelEn: "Building",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.locationRoom",
    formKey: "exam",
    fieldName: "locationRoom",
    labelAr: "القاعة",
    labelEn: "Room",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.volumeValue",
    formKey: "exam",
    fieldName: "volumeValue",
    labelAr: "قيمة الحجم",
    labelEn: "Volume value",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.volumeUnit",
    formKey: "exam",
    fieldName: "volumeUnit",
    labelAr: "وحدة الحجم",
    labelEn: "Volume unit",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_VOLUME_UNIT_OPTIONS,
  },
  {
    key: "exam.volumeScope",
    formKey: "exam",
    fieldName: "volumeScope",
    labelAr: "نطاق الحجم",
    labelEn: "Volume scope",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.volumeNote",
    formKey: "exam",
    fieldName: "volumeNote",
    labelAr: "ملاحظة الحجم",
    labelEn: "Volume note",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.weightValue",
    formKey: "exam",
    fieldName: "weightValue",
    labelAr: "قيمة الوزن",
    labelEn: "Weight value",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.weightUnit",
    formKey: "exam",
    fieldName: "weightUnit",
    labelAr: "وحدة الوزن",
    labelEn: "Weight unit",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_WEIGHT_UNIT_OPTIONS,
  },
  {
    key: "exam.passGradeValue",
    formKey: "exam",
    fieldName: "passGradeValue",
    labelAr: "قيمة النجاح",
    labelEn: "Pass grade value",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.passGradeMin",
    formKey: "exam",
    fieldName: "passGradeMin",
    labelAr: "النجاح الأدنى",
    labelEn: "Pass grade min",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.passGradeMax",
    formKey: "exam",
    fieldName: "passGradeMax",
    labelAr: "النجاح الأقصى",
    labelEn: "Pass grade max",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.passGradeUnit",
    formKey: "exam",
    fieldName: "passGradeUnit",
    labelAr: "وحدة النجاح",
    labelEn: "Pass grade unit",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_GRADE_UNIT_OPTIONS,
  },
  {
    key: "exam.gradeValue",
    formKey: "exam",
    fieldName: "gradeValue",
    labelAr: "قيمة العلامة",
    labelEn: "Grade value",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.gradeMin",
    formKey: "exam",
    fieldName: "gradeMin",
    labelAr: "العلامة الأدنى",
    labelEn: "Grade min",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.gradeMax",
    formKey: "exam",
    fieldName: "gradeMax",
    labelAr: "العلامة القصوى",
    labelEn: "Grade max",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.gradeUnit",
    formKey: "exam",
    fieldName: "gradeUnit",
    labelAr: "وحدة العلامة",
    labelEn: "Grade unit",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_GRADE_UNIT_OPTIONS,
  },
  {
    key: "exam.recommendationTiming",
    formKey: "exam",
    fieldName: "recommendationTiming",
    labelAr: "توقيت التوصية",
    labelEn: "Recommendation timing",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_RECOMMENDATION_TIMING_OPTIONS,
  },
  {
    key: "exam.recommendationIntensity",
    formKey: "exam",
    fieldName: "recommendationIntensity",
    labelAr: "شدة التوصية",
    labelEn: "Recommendation intensity",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "select",
    options: EXAM_RECOMMENDATION_INTENSITY_OPTIONS,
  },
  {
    key: "exam.recommendationSuggestedHours",
    formKey: "exam",
    fieldName: "recommendationSuggestedHours",
    labelAr: "الساعات المقترحة",
    labelEn: "Suggested hours",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "number",
  },
  {
    key: "exam.recommendationReason",
    formKey: "exam",
    fieldName: "recommendationReason",
    labelAr: "سبب التوصية",
    labelEn: "Recommendation reason",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "exam.recommendationNote",
    formKey: "exam",
    fieldName: "recommendationNote",
    labelAr: "ملاحظة التوصية",
    labelEn: "Recommendation note",
    formLabelAr: "إضافة/تعديل امتحان",
    formLabelEn: "Exam form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineCourse.course_name",
    formKey: "inlineCourse",
    fieldName: "course_name",
    labelAr: "اسم المقرر",
    labelEn: "Course name",
    formLabelAr: "إضافة مقرر سريع",
    formLabelEn: "Inline course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineCourse.course_code",
    formKey: "inlineCourse",
    fieldName: "course_code",
    labelAr: "رمز المقرر",
    labelEn: "Course code",
    formLabelAr: "إضافة مقرر سريع",
    formLabelEn: "Inline course form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineComponent.course_class",
    formKey: "inlineComponent",
    fieldName: "course_class",
    labelAr: "نوع المكوّن",
    labelEn: "Component class",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "select",
    optionsKey: "componentClassOptions",
  },
  {
    key: "inlineComponent.course_daySelection",
    formKey: "inlineComponent",
    fieldName: "course_daySelection",
    labelAr: "اليوم",
    labelEn: "Day",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "select",
    optionsKey: "weekdayOptions",
  },
  {
    key: "inlineComponent.course_timeSelection",
    formKey: "inlineComponent",
    fieldName: "course_timeSelection",
    labelAr: "الساعة",
    labelEn: "Hour",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "select",
    optionsKey: "hourOptions",
  },
  {
    key: "inlineComponent.course_year",
    formKey: "inlineComponent",
    fieldName: "course_year",
    labelAr: "السنة الأكاديمية",
    labelEn: "Academic year",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "select",
    optionsKey: "academicYearOptions",
  },
  {
    key: "inlineComponent.course_term",
    formKey: "inlineComponent",
    fieldName: "course_term",
    labelAr: "الفصل",
    labelEn: "Term",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "select",
    optionsKey: "termOptions",
  },
  {
    key: "inlineComponent.course_grade",
    formKey: "inlineComponent",
    fieldName: "course_grade",
    labelAr: "الوزن",
    labelEn: "Weight",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineComponent.course_locationBuilding",
    formKey: "inlineComponent",
    fieldName: "course_locationBuilding",
    labelAr: "المبنى",
    labelEn: "Building",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineComponent.course_locationRoom",
    formKey: "inlineComponent",
    fieldName: "course_locationRoom",
    labelAr: "القاعة",
    labelEn: "Room",
    formLabelAr: "إضافة مكوّن سريع",
    formLabelEn: "Inline component form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineLecture.lecture_name",
    formKey: "inlineLecture",
    fieldName: "lecture_name",
    labelAr: "اسم المحاضرة",
    labelEn: "Lecture name",
    formLabelAr: "إضافة محاضرة سريعة",
    formLabelEn: "Inline lecture form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineLecture.lecture_instructors",
    formKey: "inlineLecture",
    fieldName: "lecture_instructors",
    labelAr: "المحاضرون",
    labelEn: "Instructors",
    formLabelAr: "إضافة محاضرة سريعة",
    formLabelEn: "Inline lecture form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineLecture.lecture_writers",
    formKey: "inlineLecture",
    fieldName: "lecture_writers",
    labelAr: "الكتّاب",
    labelEn: "Writers",
    formLabelAr: "إضافة محاضرة سريعة",
    formLabelEn: "Inline lecture form",
    control: "input",
    inputType: "text",
  },
  {
    key: "inlineLecture.lecture_date",
    formKey: "inlineLecture",
    fieldName: "lecture_date",
    labelAr: "تاريخ المحاضرة",
    labelEn: "Lecture date",
    formLabelAr: "إضافة محاضرة سريعة",
    formLabelEn: "Inline lecture form",
    control: "input",
    inputType: "date",
  },
];

const PLANNER_SELECT_SETTINGS_STORAGE_KEY = "nogaPlanner.selectSettings.v1";

const buildDefaultPlannerWeekdayOptions = (locale = "en") =>
  WEEKDAY_OPTIONS.map((optionValue) =>
    locale === "ar" ? optionValue.labelAr : optionValue.labelEn,
  );

const buildDefaultPlannerSelectSettings = (locale = "en") => ({
  componentClassOptions: [...SAVED_COMPONENT_CLASS_OPTIONS],
  weekdayOptions: buildDefaultPlannerWeekdayOptions(locale),
  hourOptions: HOUR_OPTIONS.map((optionValue) => optionValue.value),
  termOptions: TERM_OPTIONS.map((optionValue) => optionValue.value),
  academicYearOptions: [...ACADEMIC_YEAR_OPTIONS],
  fieldDefaults: {},
  relationships: [],
});

const getDefaultPlannerRelationshipDraft = () => ({
  course_classSelection: "",
  normativeCourseTerm: "",
  actualCourseTerm: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_locationBuilding: "",
  course_locationRoom: "",
  course_grade: "",
  readOnly: false,
});

const createPlannerSettingsRelationshipId = () =>
  `planner-rel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizePlannerSettingsStringList = (entries = [], fallback = []) => {
  const normalizedEntries = Array.isArray(entries)
    ? entries
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .filter(
          (entry, entryIndex, sourceEntries) =>
            sourceEntries.indexOf(entry) === entryIndex,
        )
    : [];

  return normalizedEntries.length > 0 ? normalizedEntries : [...fallback];
};

const normalizePlannerRelationshipEntry = (entry = {}) => ({
  id: String(entry?.id || "").trim() || createPlannerSettingsRelationshipId(),
  course_classSelection: String(entry?.course_classSelection || "").trim(),
  normativeCourseTerm: String(entry?.normativeCourseTerm || "").trim(),
  actualCourseTerm: String(entry?.actualCourseTerm || "").trim(),
  course_daySelection: String(entry?.course_daySelection || "").trim(),
  course_timeSelection: String(entry?.course_timeSelection || "").trim(),
  course_locationBuilding: String(entry?.course_locationBuilding || "").trim(),
  course_locationRoom: String(entry?.course_locationRoom || "").trim(),
  course_grade: String(entry?.course_grade || "").trim(),
  readOnly: Boolean(entry?.readOnly),
});

const normalizePlannerSelectSettings = (value, locale = "en") => {
  const fallbackSettings = buildDefaultPlannerSelectSettings(locale);
  const nextValue = value && typeof value === "object" ? value : {};

  return {
    componentClassOptions: normalizePlannerSettingsStringList(
      nextValue.componentClassOptions,
      fallbackSettings.componentClassOptions,
    ),
    weekdayOptions: normalizePlannerSettingsStringList(
      nextValue.weekdayOptions,
      fallbackSettings.weekdayOptions,
    ),
    hourOptions: normalizePlannerSettingsStringList(
      nextValue.hourOptions,
      fallbackSettings.hourOptions,
    ),
    termOptions: normalizePlannerSettingsStringList(
      nextValue.termOptions,
      fallbackSettings.termOptions,
    ),
    academicYearOptions: normalizePlannerSettingsStringList(
      nextValue.academicYearOptions,
      fallbackSettings.academicYearOptions,
    ),
    fieldDefaults: {
      ...(nextValue?.fieldDefaults &&
      typeof nextValue.fieldDefaults === "object"
        ? Object.fromEntries(
            Object.entries(nextValue.fieldDefaults)
              .map(([fieldKey, fieldValue]) => [
                String(fieldKey || "").trim(),
                String(fieldValue || "").trim(),
              ])
              .filter(([fieldKey]) => Boolean(fieldKey)),
          )
        : {}),
      "savedCourse.course_classSelection": String(
        nextValue?.defaults?.course_classSelection || "",
      ).trim(),
      "savedCourse.normativeCourseTerm": String(
        nextValue?.defaults?.normativeCourseTerm || "",
      ).trim(),
      "savedCourse.actualCourseTerm": String(
        nextValue?.defaults?.actualCourseTerm || "",
      ).trim(),
      "savedCourse.course_daySelection": String(
        nextValue?.defaults?.course_daySelection || "",
      ).trim(),
      "savedCourse.course_timeSelection": String(
        nextValue?.defaults?.course_timeSelection || "",
      ).trim(),
    },
    relationships: Array.isArray(nextValue?.relationships)
      ? nextValue.relationships
          .map((entry) => normalizePlannerRelationshipEntry(entry))
          .filter((entry) => Boolean(entry.course_classSelection))
      : [],
  };
};

const readPlannerSelectSettingsFromStorage = (locale = "en") => {
  if (typeof window === "undefined" || !window.localStorage) {
    return buildDefaultPlannerSelectSettings(locale);
  }

  try {
    const storedValue = window.localStorage.getItem(
      PLANNER_SELECT_SETTINGS_STORAGE_KEY,
    );

    if (!storedValue) {
      return buildDefaultPlannerSelectSettings(locale);
    }

    return normalizePlannerSelectSettings(JSON.parse(storedValue), locale);
  } catch (error) {
    console.error("[planner-select-settings] read failed:", error);
    return buildDefaultPlannerSelectSettings(locale);
  }
};

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

  persistPlannerSelectSettings = (settings) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(
        PLANNER_SELECT_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch (error) {
      console.error("[planner-select-settings] write failed:", error);
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
      return { ...draft };
    }

    const nextDraft = { ...draft };
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

  buildSavedCourseDraftWithPlannerSettings = (
    baseDraft = getDefaultSavedCourseDraft(),
  ) => {
    const plannerSelectSettings = normalizePlannerSelectSettings(
      this.state?.plannerSelectSettings,
      this.state?.ui_locale || "en",
    );
    let nextDraft = this.applyPlannerFieldDefaultsToDraft(
      "savedCourse",
      {
        ...getDefaultSavedCourseDraft(),
        ...baseDraft,
      },
      plannerSelectSettings,
    );

    const currentAcademicYear = normalizeAcademicYearValue(
      this.props.state?.studying?.time?.currentAcademicYear ??
        this.props.state?.studying?.currentAcademicYear ??
        this.props.state?.profile?.studying?.time?.currentAcademicYear ??
        this.props.state?.profile?.studying?.currentAcademicYear ??
        this.props.state?.currentAcademicYear,
    );
    const currentAcademicTerm = String(
      this.props.state?.studying?.time?.currentTerm ??
        this.props.state?.studying?.currentTerm ??
        this.props.state?.profile?.studying?.time?.currentTerm ??
        this.props.state?.profile?.studying?.currentTerm ??
        "",
    ).trim();

    if (!String(nextDraft?.actualCourseYearInterval || "").trim()) {
      nextDraft.actualCourseYearInterval = currentAcademicYear;
    }

    if (!String(nextDraft?.actualCourseTerm || "").trim()) {
      nextDraft.actualCourseTerm = currentAcademicTerm;
    }

    return this.applyPlannerRelationshipToSavedCourseDraft(
      nextDraft,
      this.getPlannerRelationshipForClass(
        plannerSelectSettings,
        nextDraft.course_classSelection || nextDraft.course_class,
      ),
      true,
    );
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

    PLANNER_DEFAULT_FIELD_REGISTRY.filter(
      (entry) => entry.formKey === formKey,
    ).forEach((fieldConfig) => {
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

  updatePlannerSelectSettings = (updater) => {
    this.setState((previousState) => {
      const previousSettings = normalizePlannerSelectSettings(
        previousState.plannerSelectSettings,
        previousState.ui_locale || "en",
      );
      const nextSettingsCandidate =
        typeof updater === "function"
          ? updater(previousSettings, previousState)
          : updater;
      const nextSettings = normalizePlannerSelectSettings(
        nextSettingsCandidate,
        previousState.ui_locale || "en",
      );

      this.persistPlannerSelectSettings(nextSettings);

      return {
        plannerSelectSettings: nextSettings,
      };
    });
  };

  handlePlannerFieldDefaultChange = (fieldKey, nextValue) => {
    this.updatePlannerSelectSettings((previousSettings) => ({
      ...previousSettings,
      fieldDefaults: {
        ...(previousSettings.fieldDefaults || {}),
        [fieldKey]: nextValue,
      },
    }));
  };

  handlePlannerSettingsInputChange = (fieldName, nextValue) => {
    this.setState({
      [fieldName]: nextValue,
    });
  };

  addOrUpdatePlannerSettingsListItem = (listKey) => {
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

    this.updatePlannerSelectSettings((previousSettings) => {
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

  removePlannerSettingsListItem = (listKey, itemIndex) => {
    this.updatePlannerSelectSettings((previousSettings) => {
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
    };
    const selectedIndex = Number(
      this.state?.[selectedIndexKeyMap[listKey]] ?? -1,
    );

    if (selectedIndex < 0) {
      return;
    }

    this.editPlannerSettingsListItem(listKey, selectedIndex);
  };

  deleteSelectedPlannerSettingsListItem = (listKey) => {
    const selectedIndexKeyMap = {
      componentClassOptions: "plannerSettingsSelectedComponentClassIndex",
      weekdayOptions: "plannerSettingsSelectedWeekdayIndex",
      hourOptions: "plannerSettingsSelectedHourIndex",
      termOptions: "plannerSettingsSelectedTermIndex",
      academicYearOptions: "plannerSettingsSelectedAcademicYearIndex",
    };
    const selectedIndex = Number(
      this.state?.[selectedIndexKeyMap[listKey]] ?? -1,
    );

    if (selectedIndex < 0) {
      return;
    }

    this.removePlannerSettingsListItem(listKey, selectedIndex);
  };

  clearPlannerSettingsList = (listKey) => {
    this.updatePlannerSelectSettings((previousSettings) => {
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
              fieldConfig?.optionsKey === "termOptions");

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

  submitPlannerSettingsRelationship = () => {
    const relationshipDraft = normalizePlannerRelationshipEntry({
      ...this.state?.plannerSettingsRelationshipDraft,
      id:
        String(this.state?.plannerSettingsEditingRelationshipId || "").trim() ||
        createPlannerSettingsRelationshipId(),
    });

    if (!relationshipDraft.course_classSelection) {
      return;
    }

    this.updatePlannerSelectSettings((previousSettings) => {
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

  deletePlannerSettingsRelationship = (relationshipId) => {
    this.updatePlannerSelectSettings((previousSettings) => ({
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
    if (!String(this.state?.selectedCourseForLecturesId || "").trim()) {
      return;
    }

    this.setState({
      inlineLectureRowVisible: true,
      inlineLectureDraft: this.applyPlannerFieldDefaultsToDraft(
        "inlineLecture",
        getDefaultInlineLectureDraft(),
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
          savedCourseDraft: {
            ...previousState.savedCourseDraft,
            course_class: "",
            course_classSelection: "",
            normativeCourseYearNum: "",
            normativeCourseTerm: "",
            actualCourseYearNum: "",
            actualCourseYearInterval: "",
            actualCourseTerm: "",
            course_dayAndTime: "",
            course_daySelection: "",
            course_timeSelection: "",
            course_grade: "",
            course_locationBuilding: "",
            course_locationRoom: "",
          },
        };
      }

      return {
        savedCourseDraft: {
          ...previousState.savedCourseDraft,
          course_components: [...currentComponents, componentEntry],
          course_class: "",
          course_classSelection: "",
          normativeCourseYearNum: "",
          normativeCourseTerm: "",
          actualCourseYearNum: "",
          actualCourseYearInterval: "",
          actualCourseTerm: "",
          course_dayAndTime: "",
          course_daySelection: "",
          course_timeSelection: "",
          course_grade: "",
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

    this.setState({
      plannerTab: safeMode === "edit" ? "courses" : this.state.plannerTab,
      savedCourseEditorVisible: true,
      savedCourseEditorMode: safeMode,
      savedCourseDraft:
        safeMode === "edit" && selectedCourse
          ? buildDraftFromCourse(selectedCourse)
          : this.buildSavedCourseDraftWithPlannerSettings(
              getDefaultSavedCourseDraft(),
            ),
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
          return formatPlannerStatusLabel(
            course?.course_status,
            this.isArabic() ? "ar" : "en",
          );
        case "course_class":
          return formatSavedCourseComponent(
            course,
            this.isArabic() ? "ar" : "en",
          );
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
    const {
      savedCourseDraft,
      savedCourseEditorMode,
      selectedCourseForLecturesId,
      savedCourseDetailsComponentId,
    } = this.state;
    const courseName = String(savedCourseDraft?.course_name || "").trim();
    const courseCode = String(savedCourseDraft?.course_code || "").trim();
    const courseTotalWeight = String(
      savedCourseDraft?.course_totalWeight || "",
    ).trim();
    const componentToPersist = buildSavedCourseComponentEntryFromDraft({
      ...savedCourseDraft,
      course_class:
        String(savedCourseDraft?.course_classSelection || "").trim() ||
        String(savedCourseDraft?.course_class || "").trim(),
    });

    if (!courseName) {
      this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
      return;
    }

    if (
      !componentToPersist ||
      !String(componentToPersist?.course_class || "").trim()
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
          course_year: componentToPersist.course_year || "-",
          academicYear: componentToPersist.course_year || "-",
          course_term: componentToPersist.course_term || "-",
          term: componentToPersist.course_term || "-",
          course_dayAndTime: Array.isArray(componentToPersist.course_dayAndTime)
            ? componentToPersist.course_dayAndTime
            : [],
          course_grade: componentToPersist.course_grade || "-",
          course_locationBuilding:
            componentToPersist.course_locationBuilding || "-",
          course_locationRoom: componentToPersist.course_locationRoom || "-",
          course_exams: [],
        }),
      },
    );

    if (!courseResponse.ok) {
      this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
      return;
    }

    const createdCoursePayload = await courseResponse.json().catch(() => ({}));
    const createdCourseId = String(
      createdCoursePayload?.course?._id || "",
    ).trim();

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
    const {
      selectedTabItemId,
      deleteSelectionMode,
      deleteSelectionIds,
      inlineLectureRowVisible,
      inlineLectureDraft,
      lectureSortKey,
      lectureSortDirection,
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
                {this.isArabic() ? "لا توجد محاضرات" : "No lectures"}
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
    const initialPlannerSelectSettings =
      readPlannerSelectSettingsFromStorage(initialLocale);

    this.state = {
      ui_locale: initialLocale,
      wrapperTab: "courses",
      plannerTab: "courses",
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
      plannerSelectSettings: initialPlannerSelectSettings,
      plannerSettingsComponentClassInput: "",
      plannerSettingsWeekdayInput: "",
      plannerSettingsHourInput: "",
      plannerSettingsTermInput: "",
      plannerSettingsAcademicYearInput: "",
      plannerSettingsActiveListKey: "componentClassOptions",
      plannerSettingsEditingComponentClassIndex: -1,
      plannerSettingsEditingWeekdayIndex: -1,
      plannerSettingsEditingHourIndex: -1,
      plannerSettingsEditingTermIndex: -1,
      plannerSettingsEditingAcademicYearIndex: -1,
      plannerSettingsSelectedComponentClassIndex: -1,
      plannerSettingsSelectedWeekdayIndex: -1,
      plannerSettingsSelectedHourIndex: -1,
      plannerSettingsSelectedTermIndex: -1,
      plannerSettingsSelectedAcademicYearIndex: -1,
      plannerSettingsRelationshipDraft: getDefaultPlannerRelationshipDraft(),
      plannerSettingsEditingRelationshipId: "",
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

  renderSavedCoursesTableColGroup = () => (
    <colgroup>
      {Array.from({ length: 12 }, (_, index) => (
        <col key={`saved-courses-col-${index}`} />
      ))}
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
        this.setState({ savedCourseFloatingBarPosition: null });
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

    this.setState({ savedCourseFloatingBarPosition: nextPosition });
  };

  retrieveLectures = async () => {
    if (!this.props.state?.my_id) {
      return;
    }

    this.setState({ lecture_isLoading: true });

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
        this.setState({ course_isLoading: false });
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
      plannerSettingsVisible,
      plannerSelectSettings,
      plannerSettingsComponentClassInput,
      plannerSettingsWeekdayInput,
      plannerSettingsHourInput,
      plannerSettingsTermInput,
      plannerSettingsAcademicYearInput,
      plannerSettingsActiveListKey,
      plannerSettingsEditingComponentClassIndex,
      plannerSettingsEditingWeekdayIndex,
      plannerSettingsEditingHourIndex,
      plannerSettingsEditingTermIndex,
      plannerSettingsEditingAcademicYearIndex,
      plannerSettingsSelectedComponentClassIndex,
      plannerSettingsSelectedWeekdayIndex,
      plannerSettingsSelectedHourIndex,
      plannerSettingsSelectedTermIndex,
      plannerSettingsSelectedAcademicYearIndex,
      plannerSettingsRelationshipDraft,
      plannerSettingsEditingRelationshipId,
      savedCourseEditorVisible,
      savedCourseEditorMode,
      savedCourseDraft,
      savedCourseSelectionMode,
      deleteSelectionMode,
      deleteSelectionIds,
      savedCourseSortKey,
      savedCourseSortDirection,
      savedCourseFloatingBarPosition,
      savedCoursesColumnHeaderWidth,
    } = this.state;
    const componentClassOptions = Array.isArray(
      plannerSelectSettings?.componentClassOptions,
    )
      ? plannerSelectSettings.componentClassOptions
      : SAVED_COMPONENT_CLASS_OPTIONS;
    const weekdayOptions = Array.isArray(plannerSelectSettings?.weekdayOptions)
      ? plannerSelectSettings.weekdayOptions
      : buildDefaultPlannerWeekdayOptions(this.state?.ui_locale || "en");
    const hourOptions = Array.isArray(plannerSelectSettings?.hourOptions)
      ? plannerSelectSettings.hourOptions
      : HOUR_OPTIONS.map((optionValue) => optionValue.value);
    const termOptions = Array.isArray(plannerSelectSettings?.termOptions)
      ? plannerSelectSettings.termOptions
      : TERM_OPTIONS.map((optionValue) => optionValue.value);
    const academicYearOptions = Array.isArray(
      plannerSelectSettings?.academicYearOptions,
    )
      ? plannerSelectSettings.academicYearOptions
      : [...ACADEMIC_YEAR_OPTIONS];
    const plannerSettingsOptionGroupConfigs = [
      {
        key: "componentClassOptions",
        label: this.isArabic() ? "أنواع المكوّن" : "Component classes",
        inputValue: plannerSettingsComponentClassInput,
        editingIndex: plannerSettingsEditingComponentClassIndex,
        selectedIndex: plannerSettingsSelectedComponentClassIndex,
        options: componentClassOptions,
        placeholder: this.isArabic()
          ? "أدخل نوع مكوّن"
          : "Enter component class",
      },
      {
        key: "weekdayOptions",
        label: this.isArabic() ? "الجدول" : "Days",
        inputValue: plannerSettingsWeekdayInput,
        editingIndex: plannerSettingsEditingWeekdayIndex,
        selectedIndex: plannerSettingsSelectedWeekdayIndex,
        options: weekdayOptions,
        placeholder: this.isArabic() ? "أدخل يوماً" : "Enter day",
      },
      {
        key: "hourOptions",
        label: this.isArabic() ? "الساعات" : "Hours",
        inputValue: plannerSettingsHourInput,
        editingIndex: plannerSettingsEditingHourIndex,
        selectedIndex: plannerSettingsSelectedHourIndex,
        options: hourOptions,
        placeholder: this.isArabic() ? "مثال 08:00" : "Example 08:00",
      },
      {
        key: "termOptions",
        label: this.isArabic() ? "الفصول" : "Terms",
        inputValue: plannerSettingsTermInput,
        editingIndex: plannerSettingsEditingTermIndex,
        selectedIndex: plannerSettingsSelectedTermIndex,
        options: termOptions,
        placeholder: this.isArabic() ? "أدخل فصلاً" : "Enter term",
      },
      {
        key: "academicYearOptions",
        label: this.isArabic() ? "السنوات الأكاديمية" : "Academic years",
        inputValue: plannerSettingsAcademicYearInput,
        editingIndex: plannerSettingsEditingAcademicYearIndex,
        selectedIndex: plannerSettingsSelectedAcademicYearIndex,
        options: academicYearOptions,
        placeholder: this.isArabic()
          ? "أدخل سنة أكاديمية"
          : "Enter academic year",
      },
    ];
    const activePlannerSettingsOptionGroup =
      plannerSettingsOptionGroupConfigs.find(
        (entry) => entry.key === plannerSettingsActiveListKey,
      ) || plannerSettingsOptionGroupConfigs[0];
    const plannerOptionsByKey = {
      componentClassOptions,
      weekdayOptions,
      hourOptions,
      termOptions,
      academicYearOptions,
    };
    const plannerDefaultFields = PLANNER_DEFAULT_FIELD_REGISTRY.map(
      (fieldConfig) => ({
        ...fieldConfig,
        value: String(
          plannerSelectSettings?.fieldDefaults?.[fieldConfig.key] || "",
        ).trim(),
        options: fieldConfig.optionsKey
          ? plannerOptionsByKey[fieldConfig.optionsKey] || []
          : Array.isArray(fieldConfig.options)
            ? fieldConfig.options
            : [],
      }),
    );
    const savedCourseLockedFields =
      this.getLockedSavedCourseDraftFields(savedCourseDraft);
    const plannerRelationships = Array.isArray(
      plannerSelectSettings?.relationships,
    )
      ? plannerSelectSettings.relationships
      : [];
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
    const shouldBlurUnselectedSavedCourseRows =
      shouldShowFloatingCourseRowActions && selectedSavedCourseIds.length > 0;
    const selectedLectureDeleteCount = Array.isArray(deleteSelectionIds)
      ? deleteSelectionIds.length
      : 0;
    const sortedSavedCourses = this.getSortedSavedCourses(savedCourses);
    const currentAcademicYearNumber = getComparableProgramYearNumber(
      this.props.state?.studying?.time?.currentAcademicYear ??
        this.props.state?.studying?.currentAcademicYear ??
        this.props.state?.profile?.studying?.time?.currentAcademicYear ??
        this.props.state?.profile?.studying?.currentAcademicYear ??
        this.props.state?.currentAcademicYear,
    );
    const savedCourseCounts = savedCourses.reduce(
      (accumulator, course) => {
        const normalizedCourseName =
          String(course?.course_name || "")
            .trim()
            .toLowerCase() || "-";
        const programYearNumber = getComparableProgramYearNumber(
          course?.programYear ||
            course?.course_programYear ||
            course?.time?.programYear,
        );

        accumulator.componentCount += 1;
        accumulator.courseNames.add(normalizedCourseName);

        if (currentAcademicYearNumber !== null && programYearNumber !== null) {
          if (programYearNumber < currentAcademicYearNumber) {
            accumulator.failedComponentsCount += 1;
          } else if (programYearNumber === currentAcademicYearNumber) {
            accumulator.ongoingComponentsCount += 1;
          }
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
    const savedCourseRowSpanById = new Map();
    const savedCourseGroupSelectedById = new Map();
    for (let courseIndex = 0; courseIndex < sortedSavedCourses.length; ) {
      const courseEntry = sortedSavedCourses[courseIndex] || {};
      const groupKey =
        String(courseEntry?.parentCourseId || "").trim() ||
        [
          String(courseEntry?.course_code || "")
            .trim()
            .toLowerCase(),
          String(courseEntry?.course_name || "")
            .trim()
            .toLowerCase(),
        ].join("|");
      let spanCount = 1;

      for (
        let nextIndex = courseIndex + 1;
        nextIndex < sortedSavedCourses.length;
        nextIndex += 1
      ) {
        const nextEntry = sortedSavedCourses[nextIndex] || {};
        const nextGroupKey =
          String(nextEntry?.parentCourseId || "").trim() ||
          [
            String(nextEntry?.course_code || "")
              .trim()
              .toLowerCase(),
            String(nextEntry?.course_name || "")
              .trim()
              .toLowerCase(),
          ].join("|");

        if (nextGroupKey !== groupKey) {
          break;
        }

        spanCount += 1;
      }

      savedCourseRowSpanById.set(
        String(courseEntry?._id || buildCourseDuplicateKey(courseEntry)),
        spanCount,
      );
      savedCourseGroupSelectedById.set(
        String(courseEntry?._id || buildCourseDuplicateKey(courseEntry)),
        sortedSavedCourses
          .slice(courseIndex, courseIndex + spanCount)
          .some((entry) => {
            const entryId = String(entry?._id || "").trim();
            return (
              selectedSavedCourseIds.includes(entryId) ||
              selectedComponentId === entryId ||
              selectedDetailsComponentId === entryId
            );
          }),
      );
      courseIndex += spanCount;
    }
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
    const renderSavedCourseFieldEyebrow = (arabicLabel, englishLabel) => (
      <span className="nogaPlanner_savedCourseFieldEyebrow">
        {this.isArabic() ? arabicLabel : englishLabel}
      </span>
    );
    const savedCoursePendingStatusLabel = this.isArabic()
      ? "تحدّد لاحقاً"
      : "Set later";
    const savedCourseProfileActualAcademicYear =
      normalizeAcademicYearValue(
        String(savedCourseDraft?.actualCourseYearInterval || "").trim() ||
          (this.props.state?.studying?.time?.currentAcademicYear ??
            this.props.state?.studying?.currentAcademicYear ??
            this.props.state?.profile?.studying?.time?.currentAcademicYear ??
            this.props.state?.profile?.studying?.currentAcademicYear ??
            this.props.state?.currentAcademicYear),
      ) || "";
    const savedCourseProfileActualTerm = String(
      String(savedCourseDraft?.actualCourseTerm || "").trim() ||
        (this.props.state?.studying?.time?.currentTerm ??
          this.props.state?.studying?.currentTerm ??
          this.props.state?.profile?.studying?.time?.currentTerm ??
          this.props.state?.profile?.studying?.currentTerm ??
          ""),
    ).trim();
    const savedCourseLocationEntries = Array.isArray(this.state?.courses)
      ? this.state.courses
      : [];
    const locationBuildingOptions = Array.from(
      new Set(
        savedCourseLocationEntries
          .map((entry) => String(entry?.course_location?.building || "").trim())
          .concat(
            String(savedCourseDraft?.course_locationBuilding || "").trim(),
          )
          .filter(Boolean),
      ),
    );
    const locationRoomOptions = Array.from(
      new Set(
        savedCourseLocationEntries
          .filter((entry) => {
            const buildingValue = String(
              entry?.course_location?.building || "",
            ).trim();
            const selectedBuilding = String(
              savedCourseDraft?.course_locationBuilding || "",
            ).trim();
            return !selectedBuilding || buildingValue === selectedBuilding;
          })
          .map((entry) => String(entry?.course_location?.room || "").trim())
          .concat(String(savedCourseDraft?.course_locationRoom || "").trim())
          .filter(Boolean),
      ),
    );
    const renderSavedCourseEditorPanel = () => (
      <div className="nogaPlanner_savedCourseEditor">
        <div className="nogaPlanner_savedCourseEditorGrid nogaPlanner_savedCourseEditorGrid--courseComposer">
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--courseCard">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "بيانات المقرر" : "Course"}
            </p>
            {renderSavedCourseFieldEyebrow("اسم المقرر", "Course name")}
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
            {renderSavedCourseFieldEyebrow("رمز المقرر", "Course code")}
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
            {renderSavedCourseFieldEyebrow("حالة المقرر", "Course status")}
            <input
              className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
              type="text"
              value={
                formatPlannerStatusLabel(
                  savedCourseDraft.course_status,
                  this.isArabic() ? "ar" : "en",
                ) === "-"
                  ? savedCoursePendingStatusLabel
                  : formatPlannerStatusLabel(
                      savedCourseDraft.course_status,
                      this.isArabic() ? "ar" : "en",
                    )
              }
              readOnly
              placeholder={this.isArabic() ? "حالة المقرر" : "Course status"}
            />
            {renderSavedCourseFieldEyebrow("وزن المقرر", "Course weight")}
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="number"
              min="0"
              step="0.01"
              value={savedCourseDraft.course_totalWeight}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "course_totalWeight",
                  event.target.value,
                )
              }
              placeholder={this.isArabic() ? "وزن المقرر" : "Course weight"}
            />
          </div>
          <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentCard">
            <p className="nogaPlanner_savedCourseEditorLabel">
              {this.isArabic() ? "بيانات المكوّن" : "Component details"}
            </p>
            {renderSavedCourseFieldEyebrow("نوع المكوّن", "Component class")}
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
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
              {componentClassOptions.map((optionValue) => (
                <option key={optionValue} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
            {renderSavedCourseFieldEyebrow("حالة المكوّن", "Component status")}
            <input
              className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_savedCoursesDetailsInput--pending"
              type="text"
              value={
                formatPlannerStatusLabel(
                  savedCourseDraft.component_status,
                  this.isArabic() ? "ar" : "en",
                ) === "-"
                  ? savedCoursePendingStatusLabel
                  : formatPlannerStatusLabel(
                      savedCourseDraft.component_status,
                      this.isArabic() ? "ar" : "en",
                    )
              }
              readOnly
              placeholder={
                this.isArabic() ? "حالة المكوّن" : "Component status"
              }
            />
            {renderSavedCourseFieldEyebrow(
              "الفترة السنوية المفترضة",
              "Normative year interval",
            )}
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={savedCourseDraft.normativeCourseYearInterval}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "normativeCourseYearInterval",
                  event.target.value,
                )
              }
            >
              <option value="">
                {this.isArabic()
                  ? "الفترة السنوية المفترضة"
                  : "Normative year interval"}
              </option>
              {academicYearOptions.map((optionValue) => (
                <option
                  key={`normative-year-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            {renderSavedCourseFieldEyebrow("الفصل المفترض", "Normative term")}
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={savedCourseDraft.normativeCourseTerm}
              disabled={savedCourseLockedFields.has("normativeCourseTerm")}
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
              {termOptions.map((optionValue) => (
                <option key={`normative-${optionValue}`} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
            {renderSavedCourseFieldEyebrow(
              "الفترة السنوية الفعلية",
              "Actual year interval",
            )}
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={savedCourseProfileActualAcademicYear}
              readOnly
              placeholder={
                this.isArabic()
                  ? "الفترة السنوية الفعلية"
                  : "Actual year interval"
              }
            />
            {renderSavedCourseFieldEyebrow("الفصل الفعلي", "Actual term")}
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={savedCourseProfileActualTerm}
              readOnly
              placeholder={this.isArabic() ? "الفصل الفعلي" : "Actual term"}
            />
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "جدول الدوام" : "Schedule"}
              </span>
              <div className="nogaPlanner_savedCoursesDetailsInputs">
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="date"
                  value={savedCourseDraft.course_daySelection}
                  disabled={savedCourseLockedFields.has("course_daySelection")}
                  onChange={(event) =>
                    this.handleSavedCourseDraftChange(
                      "course_daySelection",
                      event.target.value,
                    )
                  }
                />
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={savedCourseDraft.course_timeSelection}
                  disabled={savedCourseLockedFields.has("course_timeSelection")}
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
                  {hourOptions.map((optionValue) => (
                    <option key={optionValue} value={optionValue}>
                      {optionValue}
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
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {this.isArabic() ? "الموقع" : "Location"}
              </span>
              <div className="nogaPlanner_savedCoursesDetailsInputs">
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={savedCourseDraft.course_locationBuilding}
                  disabled={savedCourseLockedFields.has(
                    "course_locationBuilding",
                  )}
                  onChange={(event) =>
                    this.handleSavedCourseDraftChange(
                      "course_locationBuilding",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {this.isArabic() ? "المبنى" : "Building"}
                  </option>
                  {locationBuildingOptions.map((optionValue) => (
                    <option key={`building-${optionValue}`} value={optionValue}>
                      {optionValue}
                    </option>
                  ))}
                </select>
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={savedCourseDraft.course_locationRoom}
                  disabled={savedCourseLockedFields.has("course_locationRoom")}
                  onChange={(event) =>
                    this.handleSavedCourseDraftChange(
                      "course_locationRoom",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {this.isArabic() ? "القاعة" : "Room"}
                  </option>
                  {locationRoomOptions.map((optionValue) => (
                    <option key={`room-${optionValue}`} value={optionValue}>
                      {optionValue}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {renderSavedCourseFieldEyebrow("وزن المكوّن", "Component weight")}
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="number"
              min="0"
              step="0.01"
              value={savedCourseDraft.course_grade}
              disabled={savedCourseLockedFields.has("course_grade")}
              onChange={(event) =>
                this.handleSavedCourseDraftChange(
                  "course_grade",
                  event.target.value,
                )
              }
              placeholder={this.isArabic() ? "وزن المكوّن" : "Component weight"}
            />
          </div>
        </div>
      </div>
    );

    const plannerSettingsPanel = (
      <div className="nogaPlanner_selectSettingsPanel">
        <div className="nogaPlanner_selectSettingsHeader">
          <button
            type="button"
            className="nogaPlanner_coursesMiniBarBtn nogaPlanner_selectSettingsBackBtn"
            onClick={this.handleBackFromPlannerSettings}
          >
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            <span>{this.isArabic() ? "رجوع" : "Back"}</span>
          </button>
          <span className="nogaPlanner_selectSettingsTitle">
            {this.isArabic() ? "إعدادات القوائم" : "Select settings"}
          </span>
        </div>
        <div className="nogaPlanner_selectSettingsColumns">
          <div className="nogaPlanner_selectSettingsColumn">
            <span className="nogaPlanner_selectSettingsColumnTitle">
              {this.isArabic() ? "خيارات القوائم" : "Select options"}
            </span>
            <div className="nogaPlanner_selectSettingsFields">
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsActiveListKey}
                onChange={(event) =>
                  this.handlePlannerSettingsInputChange(
                    "plannerSettingsActiveListKey",
                    event.target.value,
                  )
                }
              >
                {plannerSettingsOptionGroupConfigs.map((optionGroup) => (
                  <option key={optionGroup.key} value={optionGroup.key}>
                    {optionGroup.label}
                  </option>
                ))}
              </select>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={activePlannerSettingsOptionGroup?.inputValue || ""}
                onChange={(event) =>
                  this.handlePlannerSettingsInputChange(
                    activePlannerSettingsOptionGroup.key ===
                      "componentClassOptions"
                      ? "plannerSettingsComponentClassInput"
                      : activePlannerSettingsOptionGroup.key ===
                          "weekdayOptions"
                        ? "plannerSettingsWeekdayInput"
                        : activePlannerSettingsOptionGroup.key === "hourOptions"
                          ? "plannerSettingsHourInput"
                          : activePlannerSettingsOptionGroup.key ===
                              "termOptions"
                            ? "plannerSettingsTermInput"
                            : "plannerSettingsAcademicYearInput",
                    event.target.value,
                  )
                }
                placeholder={
                  activePlannerSettingsOptionGroup?.placeholder || ""
                }
              />
              <div className="nogaPlanner_selectSettingsActions">
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() =>
                    this.addOrUpdatePlannerSettingsListItem(
                      activePlannerSettingsOptionGroup.key,
                    )
                  }
                >
                  {activePlannerSettingsOptionGroup?.editingIndex >= 0
                    ? this.isArabic()
                      ? "تحديث"
                      : "Update"
                    : this.isArabic()
                      ? "إضافة"
                      : "Add"}
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() =>
                    this.deleteSelectedPlannerSettingsListItem(
                      activePlannerSettingsOptionGroup.key,
                    )
                  }
                  disabled={activePlannerSettingsOptionGroup?.selectedIndex < 0}
                >
                  {this.isArabic() ? "حذف المحدد" : "Delete selected"}
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() =>
                    this.clearPlannerSettingsList(
                      activePlannerSettingsOptionGroup.key,
                    )
                  }
                  disabled={
                    (activePlannerSettingsOptionGroup?.options || []).length ===
                    0
                  }
                >
                  {this.isArabic() ? "حذف الكل" : "Delete all"}
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() =>
                    this.editSelectedPlannerSettingsListItem(
                      activePlannerSettingsOptionGroup.key,
                    )
                  }
                  disabled={activePlannerSettingsOptionGroup?.selectedIndex < 0}
                >
                  {this.isArabic() ? "تعديل" : "Edit"}
                </button>
              </div>
              <ul className="nogaPlanner_selectSettingsList">
                {(activePlannerSettingsOptionGroup?.options || []).map(
                  (optionValue, optionIndex) => (
                    <li
                      key={`planner-option-${activePlannerSettingsOptionGroup.key}-${optionValue}-${optionIndex}`}
                      className={
                        "nogaPlanner_selectSettingsItem" +
                        (activePlannerSettingsOptionGroup?.selectedIndex ===
                        optionIndex
                          ? " nogaPlanner_selectSettingsItem--selected"
                          : "")
                      }
                      onClick={() =>
                        this.togglePlannerSettingsListItemSelection(
                          activePlannerSettingsOptionGroup.key,
                          optionIndex,
                        )
                      }
                    >
                      <span className="nogaPlanner_selectSettingsItemLabel">
                        {optionValue}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
          <div className="nogaPlanner_selectSettingsColumn">
            <span className="nogaPlanner_selectSettingsColumnTitle">
              {this.isArabic() ? "الافتراضيات" : "Defaults"}
            </span>
            <div className="nogaPlanner_selectSettingsFields">
              <div className="nogaPlanner_selectSettingsDefaultsCard">
                <span className="nogaPlanner_selectSettingsDefaultsTitle">
                  {this.isArabic()
                    ? "جميع حقول النماذج مع اسم النموذج"
                    : "All planner form fields with their form tags"}
                </span>
                <div className="nogaPlanner_selectSettingsDefaultsGrid">
                  {plannerDefaultFields.map((fieldConfig) => (
                    <div
                      key={`planner-default-${fieldConfig.key}`}
                      className="nogaPlanner_selectSettingsDefaultField"
                    >
                      <span className="nogaPlanner_selectSettingsDefaultLabel">
                        {this.isArabic()
                          ? `${fieldConfig.formLabelAr} • ${fieldConfig.labelAr}`
                          : `${fieldConfig.formLabelEn} • ${fieldConfig.labelEn}`}
                      </span>
                      {fieldConfig.control === "select" ? (
                        <select
                          className="nogaPlanner_savedCoursesDetailsInput"
                          value={fieldConfig.value}
                          onChange={(event) =>
                            this.handlePlannerFieldDefaultChange(
                              fieldConfig.key,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">
                            {this.isArabic() ? "بدون" : "None"}
                          </option>
                          {fieldConfig.options.map((optionValue) => (
                            <option
                              key={`planner-default-option-${fieldConfig.key}-${optionValue}`}
                              value={optionValue}
                            >
                              {optionValue}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="nogaPlanner_savedCoursesDetailsInput"
                          type={fieldConfig.inputType || "text"}
                          value={fieldConfig.value}
                          onChange={(event) =>
                            this.handlePlannerFieldDefaultChange(
                              fieldConfig.key,
                              event.target.value,
                            )
                          }
                          placeholder={
                            this.isArabic()
                              ? `${fieldConfig.formLabelAr} • ${fieldConfig.labelAr}`
                              : `${fieldConfig.formLabelEn} • ${fieldConfig.labelEn}`
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="nogaPlanner_selectSettingsColumn">
            <span className="nogaPlanner_selectSettingsColumnTitle">
              {this.isArabic() ? "علاقات المكوّن" : "Component presets"}
            </span>
            <div className="nogaPlanner_selectSettingsFields">
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsRelationshipDraft.course_classSelection}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_classSelection",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {this.isArabic() ? "نوع المكوّن" : "Component class"}
                </option>
                {componentClassOptions.map((optionValue) => (
                  <option
                    key={`relationship-class-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsRelationshipDraft.normativeCourseTerm}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "normativeCourseTerm",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {this.isArabic() ? "الفصل المفترض" : "Normative term"}
                </option>
                {termOptions.map((optionValue) => (
                  <option
                    key={`relationship-normative-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsRelationshipDraft.actualCourseTerm}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "actualCourseTerm",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {this.isArabic() ? "الفصل الفعلي" : "Actual term"}
                </option>
                {termOptions.map((optionValue) => (
                  <option
                    key={`relationship-actual-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsRelationshipDraft.course_daySelection}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_daySelection",
                    event.target.value,
                  )
                }
              >
                <option value="">{this.isArabic() ? "اليوم" : "Day"}</option>
                {weekdayOptions.map((optionValue) => (
                  <option
                    key={`relationship-day-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsRelationshipDraft.course_timeSelection}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_timeSelection",
                    event.target.value,
                  )
                }
              >
                <option value="">{this.isArabic() ? "الساعة" : "Hour"}</option>
                {hourOptions.map((optionValue) => (
                  <option
                    key={`relationship-hour-${optionValue}`}
                    value={optionValue}
                  >
                    {optionValue}
                  </option>
                ))}
              </select>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={plannerSettingsRelationshipDraft.course_locationBuilding}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_locationBuilding",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "المبنى" : "Building"}
              />
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={plannerSettingsRelationshipDraft.course_locationRoom}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_locationRoom",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "القاعة" : "Room"}
              />
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={plannerSettingsRelationshipDraft.course_grade}
                onChange={(event) =>
                  this.handlePlannerSettingsRelationshipDraftChange(
                    "course_grade",
                    event.target.value,
                  )
                }
                placeholder={this.isArabic() ? "الوزن" : "Weight"}
              />
              <label className="nogaPlanner_selectSettingsCheckboxRow">
                <input
                  type="checkbox"
                  checked={Boolean(plannerSettingsRelationshipDraft.readOnly)}
                  onChange={(event) =>
                    this.handlePlannerSettingsRelationshipDraftChange(
                      "readOnly",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  {this.isArabic()
                    ? "قفل هذه القيم داخل المحرر"
                    : "Lock these values in the editor"}
                </span>
              </label>
              <div className="nogaPlanner_selectSettingsActions">
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={this.submitPlannerSettingsRelationship}
                >
                  {plannerSettingsEditingRelationshipId
                    ? this.isArabic()
                      ? "تحديث العلاقة"
                      : "Update preset"
                    : this.isArabic()
                      ? "إضافة العلاقة"
                      : "Add preset"}
                </button>
              </div>
              <ul className="nogaPlanner_selectSettingsRelationshipsList">
                {plannerRelationships.map((relationship) => (
                  <li
                    key={relationship.id}
                    className="nogaPlanner_selectSettingsRelationshipItem"
                  >
                    <div className="nogaPlanner_selectSettingsRelationshipBody">
                      <span className="nogaPlanner_selectSettingsRelationshipText">
                        {relationship.course_classSelection}
                      </span>
                      <span className="nogaPlanner_selectSettingsRelationshipText">
                        {[
                          relationship.normativeCourseTerm
                            ? `${
                                this.isArabic() ? "المفترض" : "Normative"
                              }: ${relationship.normativeCourseTerm}`
                            : "",
                          relationship.actualCourseTerm
                            ? `${this.isArabic() ? "الفعلي" : "Actual"}: ${
                                relationship.actualCourseTerm
                              }`
                            : "",
                          relationship.course_daySelection
                            ? `${this.isArabic() ? "اليوم" : "Day"}: ${
                                relationship.course_daySelection
                              }`
                            : "",
                          relationship.course_timeSelection
                            ? `${this.isArabic() ? "الساعة" : "Hour"}: ${
                                relationship.course_timeSelection
                              }`
                            : "",
                          relationship.course_locationBuilding
                            ? `${this.isArabic() ? "المبنى" : "Building"}: ${
                                relationship.course_locationBuilding
                              }`
                            : "",
                          relationship.course_locationRoom
                            ? `${this.isArabic() ? "القاعة" : "Room"}: ${
                                relationship.course_locationRoom
                              }`
                            : "",
                          relationship.course_grade
                            ? `${this.isArabic() ? "الوزن" : "Weight"}: ${
                                relationship.course_grade
                              }`
                            : "",
                          relationship.readOnly
                            ? this.isArabic()
                              ? "مقفل"
                              : "Locked"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" • ") ||
                          (this.isArabic()
                            ? "بدون قيم إضافية"
                            : "No extra values")}
                      </span>
                    </div>
                    <span className="nogaPlanner_selectSettingsItemActions">
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={() =>
                          this.editPlannerSettingsRelationship(relationship.id)
                        }
                      >
                        {this.isArabic() ? "تعديل" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={() =>
                          this.deletePlannerSettingsRelationship(
                            relationship.id,
                          )
                        }
                      >
                        {this.isArabic() ? "حذف" : "Delete"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
        <div
          className="nogaPlanner_savedCoursesColumnHeader"
          ref={this.savedCoursesColumnHeaderRef}
          style={
            savedCoursesColumnHeaderWidth
              ? { minWidth: `${savedCoursesColumnHeaderWidth}px` }
              : undefined
          }
        >
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
                      {this.isArabic() ? "حملة" : "Failed"}
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
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                onClick={this.togglePlannerSettings}
                aria-label={
                  this.isArabic() ? "إعدادات القوائم" : "Select settings"
                }
                title={this.isArabic() ? "إعدادات القوائم" : "Select settings"}
              >
                <i className="fas fa-sliders-h" aria-hidden="true"></i>
              </button>
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
                    aria-label={this.t("save")}
                    title={this.t("save")}
                  >
                    <i className="fas fa-save" aria-hidden="true"></i>
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
                  {selectedDetailsCourse ? (
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
          {plannerSettingsVisible ? (
            plannerSettingsPanel
          ) : (
            <div className="nogaPlanner_savedCoursesWorkspace">
              <div className="nogaPlanner_savedCoursesWorkspaceRow">
                {savedCourseEditorVisible
                  ? renderSavedCourseEditorPanel()
                  : null}
                <div className="nogaPlanner_savedCoursesColumnBody">
                  {shouldShowSelectedCourseLectures ? (
                    this.renderSelectedCourseLecturesTable()
                  ) : (
                    <div
                      className="nogaPlanner_savedCoursesTableBodyScroll"
                      ref={this.savedCoursesColumnBodyRef}
                      onScroll={this.handleSavedCoursesBodyScroll}
                    >
                      <table
                        className={
                          "nogaPlanner_tabTable nogaPlanner_savedCoursesTable" +
                          (shouldBlurUnselectedSavedCourseRows
                            ? " nogaPlanner_savedCoursesTable--rowFocus"
                            : "")
                        }
                      >
                        {this.renderSavedCoursesTableColGroup()}
                        <thead>
                          <tr>
                            <th colSpan={3}>
                              {this.isArabic() ? "المقرر" : "Course"}
                            </th>
                            <th colSpan={9}>
                              {this.isArabic()
                                ? "مكوّنات المقرر"
                                : "Course components"}
                            </th>
                          </tr>
                          <tr>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_name")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort("course_name");
                                  }
                                }}
                              >
                                {renderSavedCourseSortLabel(
                                  "course_name",
                                  this.isArabic()
                                    ? "اسم المقرر"
                                    : "Course Name",
                                )}
                              </span>
                            </th>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_class")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort("course_class");
                                  }
                                }}
                              >
                                {renderSavedCourseSortLabel(
                                  "course_status",
                                  this.isArabic()
                                    ? "حالة المقرر"
                                    : "Course status",
                                )}
                              </span>
                            </th>
                            <th rowSpan={3}>
                              {this.isArabic() ? "الوزن الكلي" : "Total weight"}
                            </th>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_class")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort("course_class");
                                  }
                                }}
                              >
                                {renderSavedCourseSortLabel(
                                  "course_class",
                                  this.isArabic()
                                    ? "نوع المكون"
                                    : "Component Class",
                                )}
                              </span>
                            </th>
                            <th rowSpan={3}>
                              {this.isArabic()
                                ? "حالة المكوّن"
                                : "Component status"}
                            </th>
                            <th colSpan={4}>
                              {this.isArabic() ? "التوقيت" : "Timing"}
                            </th>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_schedule")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_schedule",
                                    );
                                  }
                                }}
                              >
                                {renderSavedCourseSortLabel(
                                  "course_schedule",
                                  this.isArabic() ? "الجدول" : "Schedule",
                                )}
                              </span>
                            </th>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_location")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_location",
                                    );
                                  }
                                }}
                              >
                                {renderSavedCourseSortLabel(
                                  "course_location",
                                  this.isArabic() ? "الموقع" : "Location",
                                )}
                              </span>
                            </th>
                            <th rowSpan={3}>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_grade")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
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
                          <tr>
                            <th colSpan={2}>
                              {this.isArabic() ? "المفترض" : "Normative"}
                            </th>
                            <th colSpan={2}>
                              {this.isArabic() ? "الفعلي" : "Actual"}
                            </th>
                          </tr>
                          <tr>
                            <th>
                              <span
                                className="nogaPlanner_tabTableSortLabel"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  this.handleSavedCourseSort("course_year_term")
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_year_term",
                                    );
                                  }
                                }}
                              >
                                {this.isArabic()
                                  ? "الفترة السنوية"
                                  : "Year interval"}
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
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_year_term",
                                    );
                                  }
                                }}
                              >
                                {this.isArabic() ? "الفصل" : "Term"}
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
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_year_term",
                                    );
                                  }
                                }}
                              >
                                {this.isArabic()
                                  ? "الفترة السنوية"
                                  : "Year interval"}
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
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    this.handleSavedCourseSort(
                                      "course_year_term",
                                    );
                                  }
                                }}
                              >
                                {this.isArabic() ? "الفصل" : "Term"}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSavedCourses.length === 0 ? (
                            <tr>
                              <td
                                colSpan={12}
                                style={{
                                  textAlign: "center",
                                  opacity: 0.6,
                                  padding: "18px",
                                }}
                              >
                                {this.isArabic()
                                  ? "لا توجد مقررات محفوظة"
                                  : "No saved courses"}
                              </td>
                            </tr>
                          ) : null}
                          {sortedSavedCourses.map((course) => {
                            const courseId = String(course?._id || "").trim();
                            const courseRowSpan =
                              savedCourseRowSpanById.get(
                                courseId || buildCourseDuplicateKey(course),
                              ) || 0;
                            const mergedCourseCellSelected =
                              savedCourseGroupSelectedById.get(
                                courseId || buildCourseDuplicateKey(course),
                              ) || false;
                            const isSelected =
                              selectedSavedCourseIds.includes(courseId) ||
                              selectedComponentId === courseId ||
                              selectedDetailsComponentId === courseId;

                            return (
                              <tr
                                key={
                                  courseId || buildCourseDuplicateKey(course)
                                }
                                className={
                                  "nogaPlanner_tabTableRow" +
                                  (isSelected ? " selected" : "")
                                }
                                ref={(node) =>
                                  this.setSavedCourseRowRef(courseId, node)
                                }
                                onClick={() =>
                                  this.handleSavedCourseGroupClick(course)
                                }
                              >
                                {courseRowSpan > 0 ? (
                                  <td
                                    rowSpan={courseRowSpan}
                                    className={
                                      "nogaPlanner_savedCoursesTableCell--merged" +
                                      (mergedCourseCellSelected
                                        ? " nogaPlanner_savedCoursesTableCell--mergedSelected"
                                        : "")
                                    }
                                    style={getCellAlignmentStyle(
                                      course.course_name,
                                    )}
                                  >
                                    {course.course_name || "-"}
                                  </td>
                                ) : null}
                                {courseRowSpan > 0 ? (
                                  <td
                                    rowSpan={courseRowSpan}
                                    className={
                                      "nogaPlanner_savedCoursesTableCell--merged" +
                                      (mergedCourseCellSelected
                                        ? " nogaPlanner_savedCoursesTableCell--mergedSelected"
                                        : "")
                                    }
                                    style={getCellAlignmentStyle(
                                      formatPlannerStatusLabel(
                                        course.course_status,
                                        this.isArabic() ? "ar" : "en",
                                      ),
                                    )}
                                  >
                                    {formatPlannerStatusLabel(
                                      course.course_status,
                                      this.isArabic() ? "ar" : "en",
                                    )}
                                  </td>
                                ) : null}
                                {courseRowSpan > 0 ? (
                                  <td
                                    rowSpan={courseRowSpan}
                                    className={
                                      "nogaPlanner_savedCoursesTableCell--merged" +
                                      (mergedCourseCellSelected
                                        ? " nogaPlanner_savedCoursesTableCell--mergedSelected"
                                        : "")
                                    }
                                    style={getCellAlignmentStyle(
                                      course.course_totalWeight || "-",
                                    )}
                                  >
                                    {course.course_totalWeight || "-"}
                                  </td>
                                ) : null}
                                <td
                                  style={getCellAlignmentStyle(
                                    formatCourseComponentLabel(
                                      course.course_class ||
                                        course.course_component,
                                      this.isArabic() ? "ar" : "en",
                                    ),
                                  )}
                                >
                                  {formatCourseComponentLabel(
                                    course.course_class ||
                                      course.course_component,
                                    this.isArabic() ? "ar" : "en",
                                  ) || "-"}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    formatPlannerStatusLabel(
                                      course.component_status,
                                      this.isArabic() ? "ar" : "en",
                                    ),
                                  )}
                                >
                                  {formatPlannerStatusLabel(
                                    course.component_status,
                                    this.isArabic() ? "ar" : "en",
                                  )}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    course.normativeCourseYearInterval || "-",
                                  )}
                                >
                                  {course.normativeCourseYearInterval || "-"}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    formatAcademicTermDisplay(
                                      course.normativeCourseTerm,
                                      this.isArabic() ? "ar" : "en",
                                    ),
                                  )}
                                >
                                  {formatAcademicTermDisplay(
                                    course.normativeCourseTerm,
                                    this.isArabic() ? "ar" : "en",
                                  )}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    course.actualCourseYearInterval ||
                                      course.course_year ||
                                      "-",
                                  )}
                                >
                                  {course.actualCourseYearInterval ||
                                    course.course_year ||
                                    "-"}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    formatAcademicTermDisplay(
                                      course.actualCourseTerm ||
                                        course.course_term,
                                      this.isArabic() ? "ar" : "en",
                                    ),
                                  )}
                                >
                                  {formatAcademicTermDisplay(
                                    course.actualCourseTerm ||
                                      course.course_term,
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
                                    formatCourseLocationDisplay(
                                      course.course_location,
                                    ),
                                  )}
                                >
                                  {formatCourseLocationDisplay(
                                    course.course_location,
                                  )}
                                </td>
                                <td
                                  style={getCellAlignmentStyle(
                                    course.course_grade || "-",
                                  )}
                                >
                                  {course.course_grade || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {shouldShowFloatingCourseRowActions &&
          savedCourseFloatingBarPosition ? (
            <div className="nogaPlanner_savedCoursesFloatingBarPortal">
              <div
                className="nogaPlanner_rowFloatingMiniBar"
                style={savedCourseFloatingBarPosition}
              >
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                  onClick={(event) => {
                    event.stopPropagation();
                    this.openSelectedSavedCourseLectures();
                  }}
                  aria-label={
                    this.isArabic() ? "فتح المحاضرات" : "Open lectures"
                  }
                  title={this.isArabic() ? "فتح المحاضرات" : "Open lectures"}
                >
                  <i className="fas fa-book-open" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                  onClick={(event) => {
                    event.stopPropagation();
                    this.openSavedCourseEditor("edit");
                  }}
                  disabled={!canEditSelectedCourse}
                  aria-label={this.isArabic() ? "تعديل" : "Edit"}
                  title={this.isArabic() ? "تعديل" : "Edit"}
                >
                  <i className="fas fa-pen" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                  onClick={(event) => {
                    event.stopPropagation();
                    this.cloneSelectedSavedCourseToEditor();
                  }}
                  disabled={!canEditSelectedCourse}
                  aria-label={this.isArabic() ? "استنساخ" : "Clone row"}
                  title={this.isArabic() ? "استنساخ" : "Clone row"}
                >
                  <i className="fas fa-copy" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly"
                  onClick={(event) => {
                    event.stopPropagation();
                    this.deleteSelectedSavedCourse();
                  }}
                  disabled={!canDeleteSelectedCourses}
                  aria-label={this.isArabic() ? "حذف" : "Delete"}
                  title={this.isArabic() ? "حذف" : "Delete"}
                >
                  <i className="fas fa-trash-alt" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          ) : null}
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
                  {termOptions.map((optionValue) => (
                    <option
                      key={`exam-normative-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
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
                  {academicYearOptions.map((optionValue) => (
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
                  {termOptions.map((optionValue) => (
                    <option
                      key={`exam-actual-term-${optionValue}`}
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
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("course_name")}
                  >
                    {renderExamBoardSortLabel(
                      "course_name",
                      this.isArabic() ? "المقرر" : "Course",
                    )}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("type")}
                  >
                    {renderExamBoardSortLabel(
                      "type",
                      this.isArabic() ? "النوع" : "Type",
                    )}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("time")}
                  >
                    {renderExamBoardSortLabel(
                      "time",
                      this.isArabic() ? "التوقيت" : "Timing",
                    )}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("location")}
                  >
                    {renderExamBoardSortLabel(
                      "location",
                      this.isArabic() ? "الموقع" : "Location",
                    )}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("volume")}
                  >
                    {renderExamBoardSortLabel(
                      "volume",
                      this.isArabic() ? "الحجم" : "Volume",
                    )}
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="nogaPlanner_tabTableSortButton"
                    onClick={() => this.handleExamBoardSort("weight")}
                  >
                    {renderExamBoardSortLabel(
                      "weight",
                      this.isArabic() ? "الوزن" : "Weight",
                    )}
                  </button>
                </th>
                <th>{this.isArabic() ? "النجاح" : "Pass grade"}</th>
                <th>{this.isArabic() ? "العلامة" : "Grade"}</th>
                <th>{this.isArabic() ? "التوصية" : "Recommendation"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedExamRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      opacity: 0.6,
                      padding: "18px",
                    }}
                  >
                    {this.isArabic() ? "لا توجد امتحانات" : "No exams"}
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
                        ? " nogaPlanner_tabTableRow--active"
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
                        formatExamVolumeDisplay(examEntry),
                      )}
                    >
                      {formatExamVolumeDisplay(examEntry)}
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
                    <td
                      style={getCellAlignmentStyle(
                        formatExamRecommendationDisplay(
                          examEntry,
                          this.isArabic() ? "ar" : "en",
                        ),
                      )}
                    >
                      {formatExamRecommendationDisplay(
                        examEntry,
                        this.isArabic() ? "ar" : "en",
                      )}
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

  getInlineInstructorOptions = () => {
    const fromCourses = (Array.isArray(this.state.courses)
      ? this.state.courses
      : []
    )
      .flatMap((course) =>
        Array.isArray(course?.course_instructors)
          ? course.course_instructors
          : [course?.course_instructors],
      )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);

    const fromCourseSuggestions = (Array.isArray(this.state.telegram_courseSuggestions)
      ? this.state.telegram_courseSuggestions
      : []
    )
      .flatMap((suggestion) => {
        const payload = suggestion?.coursePayload || suggestion || {};
        const instructors = payload?.course_instructors;

        return Array.isArray(instructors) ? instructors : [instructors];
      })
      .map((entry) => String(entry || "").trim())
      .filter((entry) => Boolean(entry) && entry !== "-" && entry !== "(pending)");

    const fromStoredInstructorSuggestions = (
      Array.isArray(this.state.telegram_instructorSuggestions)
        ? this.state.telegram_instructorSuggestions
        : []
    )
      .map((entry) => String(entry || "").trim())
      .filter((entry) => Boolean(entry) && entry !== "-" && entry !== "(pending)");

    return Array.from(
      new Set([
        ...fromCourses,
        ...fromCourseSuggestions,
        ...fromStoredInstructorSuggestions,
      ]),
    );
  };

  appendInlineInstructorEntry = (rawName = "") => {
    const instructorName = String(rawName || "").trim();

    if (!instructorName) {
      return;
    }

    this.setState((previousState) => {
      const existingEntries = this.splitInlineCourseMultiValue(
        previousState.inlineCourseDraft?.course_instructors,
      );
      const hasDuplicate = existingEntries.some(
        (entry) =>
          String(entry || "").trim().toLowerCase() ===
          instructorName.toLowerCase(),
      );
      const nextEntries = hasDuplicate
        ? existingEntries
        : [...existingEntries, instructorName];

      return {
        inlineCourseDraft: {
          ...previousState.inlineCourseDraft,
          course_instructors: nextEntries.join(" | "),
          course_instructorSelection: "",
          course_instructorCustomInput: "",
        },
      };
    });
  };

  handleInlineInstructorSelectChange = (event) => {
    const selectedInstructor = String(event.target.value || "").trim();

    if (!selectedInstructor) {
      this.handleInlineCourseFieldChange("course_instructorSelection", "");
      return;
    }

    this.appendInlineInstructorEntry(selectedInstructor);
  };

  handleInlineInstructorCustomEnter = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    this.appendInlineInstructorEntry(
      this.state.inlineCourseDraft?.course_instructorCustomInput,
    );
  };

  renderCoursesLecturesTabs = () => {
    const {
      plannerTab,
      courses,
      selectedTabItemId,
      selectedCourseForLecturesId,
      deleteSelectionMode,
      deleteSelectionIds,
      inlineCourseRowVisible,
      inlineCourseDraft,
    } = this.state;
    const deleteSelectionCount = deleteSelectionIds.length;
    const deleteButtonLabel = deleteSelectionMode
      ? this.isArabic()
        ? `حذف المحدد "${deleteSelectionCount}"`
        : `delete selected "${deleteSelectionCount}"`
      : this.isArabic()
        ? "حذف"
        : "Delete";
    const visibleLectures = this.getLecturesForSelectedCourse();
    const currentYear = new Date().getFullYear();
    const inlineYearOptions = Array.from({ length: 12 }, (_, yearOffset) =>
      String(currentYear - 1 + yearOffset),
    );
    const inlineInstructorOptions = this.getInlineInstructorOptions();
    return (
      <aside
        id="nogaPlanner_courses_aside"
        className="nogaPlanner_courses_aside_tabbed fc"
      >
        <div className="nogaPlanner_coursesTitleRow fr">
          {plannerTab === "lectures" && (
            <button
              type="button"
              className="nogaPlanner_coursesMiniBarBtn"
              onClick={this.handleBackToCoursesTab}
            >
              {this.isArabic() ? "رجوع" : "Back"}
            </button>
          )}
          <div className="nogaPlanner_coursesMiniBar fr">
            {plannerTab === "courses" && inlineCourseRowVisible ? (
              <div className="fr" style={{ gap: "6px" }}>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={this.submitInlineCourseRow}
                >
                  {this.t("save")}
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={this.closeInlineCourseRow}
                >
                  {this.t("close")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn"
                onClick={this.handleMiniBarAction}
              >
                {this.isArabic() ? "جديد" : "New"}
              </button>
            )}
            <button
              type="button"
              className="nogaPlanner_coursesMiniBarBtn"
              onClick={this.handleMiniBarDelete}
            >
              {deleteButtonLabel}
            </button>
            <button
              type="button"
              className="nogaPlanner_coursesMiniBarBtn"
              onClick={this.handleMiniBarEdit}
            >
              {this.isArabic() ? "تعديل" : "Edit"}
            </button>
          </div>
        </div>
        <div className="nogaPlanner_tabBody">
          <table className="nogaPlanner_tabTable">
            {plannerTab === "courses" ? (
              <>
                <thead>
                  <tr>
                    <th>{this.isArabic() ? "المركبّة" : "Component"}</th>
                    <th>{this.isArabic() ? "اسم المقرر" : "Name"}</th>
                    <th>{this.isArabic() ? "اليوم والوقت" : "Day & Time"}</th>
                    <th>{this.isArabic() ? "السنة" : "Year"}</th>
                    <th>{this.isArabic() ? "الفصل" : "Term"}</th>
                    <th>{this.isArabic() ? "المدرسون" : "Instructors"}</th>
                    <th>{this.isArabic() ? "الوزن" : "Weight"}</th>
                    <th>
                      {this.isArabic() ? "الدرجة النهائية" : "Final Result"}
                    </th>
                    <th>{this.isArabic() ? "الحجم" : "Volume"}</th>
                    <th>{this.isArabic() ? "التقدم" : "Progress"}</th>
                  </tr>
                </thead>
                <tbody>
                  {inlineCourseRowVisible && (
                    <tr className="nogaPlanner_tabTableRow selected">
                      <td
                        style={getCellAlignmentStyle(
                          inlineCourseDraft.course_component,
                        )}
                      >
                        {String(inlineCourseDraft.course_component || "").trim() ||
                          "-"}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_name)}>
                        {String(inlineCourseDraft.course_name || "").trim() || "-"}
                      </td>
                      <td
                        className="nogaPlanner_tabTableCell--stacked"
                        style={getCellAlignmentStyle(
                          inlineCourseDraft.course_dayAndTime,
                        )}
                      >
                        {(() => {
                          const dayAndTimeUnits = this.splitInlineCourseMultiValue(
                            inlineCourseDraft.course_dayAndTime,
                          );

                          return dayAndTimeUnits.length > 0
                            ? dayAndTimeUnits.map((unit, unitIndex) => (
                                <div
                                  key={`inline-daytime-${unitIndex}`}
                                  className="nogaPlanner_tabTableCellLine"
                                >
                                  {unit}
                                </div>
                              ))
                            : "-";
                        })()}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_year)}>
                        {String(inlineCourseDraft.course_year || "").trim() || "-"}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_term)}>
                        {String(inlineCourseDraft.course_term || "").trim() || "-"}
                      </td>
                      <td
                        className="nogaPlanner_tabTableCell--stacked"
                        style={getCellAlignmentStyle(
                          inlineCourseDraft.course_instructors,
                        )}
                      >
                        {(() => {
                          const instructorUnits = this.splitInlineCourseMultiValue(
                            inlineCourseDraft.course_instructors,
                          );

                          return instructorUnits.length > 0
                            ? instructorUnits.map((unit, unitIndex) => (
                                <div
                                  key={`inline-instructor-${unitIndex}`}
                                  className="nogaPlanner_tabTableCellLine"
                                >
                                  {unit}
                                </div>
                              ))
                            : "-";
                        })()}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_grade)}>
                        {String(inlineCourseDraft.course_grade || "").trim() || "-"}
                      </td>
                      <td
                        style={getCellAlignmentStyle(
                          inlineCourseDraft.course_fullGrade,
                        )}
                      >
                        {String(inlineCourseDraft.course_fullGrade || "").trim() ||
                          "-"}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_length)}>
                        {String(inlineCourseDraft.course_length || "").trim() || "0"}
                      </td>
                      <td style={getCellAlignmentStyle(inlineCourseDraft.course_progress)}>
                        {String(inlineCourseDraft.course_progress || "").trim() ||
                          "0"}
                      </td>
                    </tr>
                  )}
                  {courses.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          textAlign: "center",
                          opacity: 0.5,
                          padding: "18px",
                        }}
                      >
                        No courses
                      </td>
                    </tr>
                  )}
                  {courses.map((item) => (
                    <tr
                      key={item._id}
                      className={
                        "nogaPlanner_tabTableRow" +
                        ((
                          deleteSelectionMode
                            ? deleteSelectionIds.includes(String(item._id))
                            : String(
                                selectedTabItemId ||
                                  selectedCourseForLecturesId,
                              ) === String(item._id)
                        )
                          ? " selected"
                          : "")
                      }
                      onClick={() => this.handleTabItemClick(item._id)}
                    >
                      <td style={getCellAlignmentStyle(item.course_component)}>
                        {item.course_component}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_name)}>
                        {item.course_name}
                      </td>
                      <td
                        className="nogaPlanner_tabTableCell--stacked"
                        style={getCellAlignmentStyle(
                          formatCourseScheduleDisplay(item.course_dayAndTime),
                        )}
                      >
                        {(() => {
                          const dayAndTimeUnits = Array.isArray(
                            item.course_dayAndTime,
                          )
                            ? item.course_dayAndTime
                                .map((slot) =>
                                  slot && typeof slot === "object"
                                    ? [slot.day, slot.time]
                                        .filter(Boolean)
                                        .join(" ")
                                    : String(slot ?? ""),
                                )
                                .map((value) => String(value || "").trim())
                                .filter(Boolean)
                            : [
                                String(item.course_dayAndTime ?? "").trim(),
                              ].filter(Boolean);

                          return dayAndTimeUnits.length > 0
                            ? dayAndTimeUnits.map((unit, unitIndex) => (
                                <div
                                  key={`${item._id}-daytime-${unitIndex}`}
                                  className="nogaPlanner_tabTableCellLine"
                                >
                                  {unit}
                                </div>
                              ))
                            : "-";
                        })()}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_year)}>
                        {item.course_year}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_term)}>
                        {item.course_term}
                      </td>
                      <td
                        className="nogaPlanner_tabTableCell--stacked"
                        style={getCellAlignmentStyle(
                          formatCourseStringListDisplay(
                            item.course_instructors,
                          ),
                        )}
                      >
                        {(() => {
                          const instructorUnits = Array.isArray(
                            item.course_instructors,
                          )
                            ? item.course_instructors
                                .map((value) => String(value || "").trim())
                                .filter(Boolean)
                            : [
                                String(item.course_instructors ?? "").trim(),
                              ].filter(Boolean);

                          return instructorUnits.length > 0
                            ? instructorUnits.map((unit, unitIndex) => (
                                <div
                                  key={`${item._id}-instructor-${unitIndex}`}
                                  className="nogaPlanner_tabTableCellLine"
                                >
                                  {unit}
                                </div>
                              ))
                            : "-";
                        })()}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_grade)}>
                        {item.course_grade}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_fullGrade)}>
                        {item.course_fullGrade}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_length)}>
                        {item.course_length}
                      </td>
                      <td style={getCellAlignmentStyle(item.course_progress)}>
                        {item.course_progress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>{this.isArabic() ? "عنوان المحاضرة" : "Title"}</th>
                    <th>{this.isArabic() ? "المقرر" : "Course"}</th>
                    <th>{this.isArabic() ? "المدرس" : "Instructor"}</th>
                    <th>{this.isArabic() ? "الكاتب" : "Writer"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLectures.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          opacity: 0.5,
                          padding: "18px",
                        }}
                      >
                        {this.isArabic() ? "لا توجد محاضرات" : "No lectures"}
                      </td>
                    </tr>
                  )}
                  {visibleLectures.map((item) => (
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
                      <td style={getCellAlignmentStyle(item.lecture_course)}>
                        {item.lecture_course}
                      </td>
                      <td
                        style={getCellAlignmentStyle(item.lecture_instructor)}
                      >
                        {item.lecture_instructor}
                      </td>
                      <td style={getCellAlignmentStyle(item.lecture_writer)}>
                        {item.lecture_writer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
          {plannerTab === "courses" && inlineCourseRowVisible && (
            <aside className="nogaPlanner_inlineCourseForm fc">
              <p className="nogaPlanner_inlineCourseFormTitle">
                {this.isArabic() ? "مقرر جديد" : "New course"}
              </p>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <input
                  type="text"
                  value={inlineCourseDraft.course_name}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_name",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "اسم المقرر" : "Name"}
                />
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <select
                  value={inlineCourseDraft.course_component}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_component",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {this.isArabic() ? "المركبّة" : "Course component"}
                  </option>
                  <option value="Lecture">
                    {this.isArabic() ? "محاضرة" : "Lecture"}
                  </option>
                  <option value="Lab">
                    {this.isArabic() ? "مختبر" : "Lab"}
                  </option>
                  <option value="Clinical rotation">
                    {this.isArabic() ? "دورة سريرية" : "Clinical rotation"}
                  </option>
                  <option value="Pharmacy training">
                    {this.isArabic() ? "تدريب صيدلي" : "Pharmacy training"}
                  </option>
                </select>
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <div className="fr" style={{ gap: "6px" }}>
                  <select
                    value={inlineCourseDraft.course_daySelection}
                    onChange={(event) =>
                      this.handleInlineCourseFieldChange(
                        "course_daySelection",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {this.isArabic() ? "اختر اليوم" : "Select day"}
                    </option>
                    {(this.isArabic()
                      ? [
                          "الاثنين",
                          "الثلاثاء",
                          "الأربعاء",
                          "الخميس",
                          "الجمعة",
                          "السبت",
                          "الأحد",
                        ]
                      : [
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                          "Sunday",
                        ]
                    ).map((dayLabel) => (
                      <option key={dayLabel} value={dayLabel}>
                        {dayLabel}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={inlineCourseDraft.course_timeSelection}
                    onChange={(event) =>
                      this.handleInlineCourseFieldChange(
                        "course_timeSelection",
                        event.target.value,
                      )
                    }
                    onKeyDown={this.handleInlineCourseDayTimeEnter}
                  />
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.appendInlineCourseDayTimeEntry}
                    title={this.isArabic() ? "إضافة" : "Add"}
                  >
                    +
                  </button>
                </div>
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <select
                  value={inlineCourseDraft.course_year}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_year",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {this.isArabic() ? "السنة" : "Year"}
                  </option>
                  {inlineYearOptions.map((yearValue) => (
                    <option key={yearValue} value={yearValue}>
                      {yearValue}
                    </option>
                  ))}
                </select>
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <select
                  value={inlineCourseDraft.course_term}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_term",
                      event.target.value,
                    )
                  }
                >
                  <option value="">{this.isArabic() ? "الفصل" : "Term"}</option>
                  <option value="Fall">{this.isArabic() ? "خريف" : "Fall"}</option>
                  <option value="Winter">{this.isArabic() ? "شتاء" : "Winter"}</option>
                  <option value="Summer">{this.isArabic() ? "صيف" : "Summer"}</option>
                </select>
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <div className="fc" style={{ gap: "6px" }}>
                  <div className="fr" style={{ gap: "6px" }}>
                    <select
                      value={inlineCourseDraft.course_instructorSelection}
                      onChange={this.handleInlineInstructorSelectChange}
                    >
                      <option value="">
                        {this.isArabic()
                          ? "اختر مدرسًا من المحفوظ"
                          : "Select saved instructor"}
                      </option>
                      {inlineInstructorOptions.map((instructorName) => (
                        <option key={instructorName} value={instructorName}>
                          {instructorName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fr" style={{ gap: "6px" }}>
                    <input
                      type="text"
                      value={inlineCourseDraft.course_instructorCustomInput}
                      onChange={(event) =>
                        this.handleInlineCourseFieldChange(
                          "course_instructorCustomInput",
                          event.target.value,
                        )
                      }
                      onKeyDown={this.handleInlineInstructorCustomEnter}
                      placeholder={
                        this.isArabic()
                          ? "أدخل اسم مدرس جديد"
                          : "Enter a new instructor name"
                      }
                    />
                    <button
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={() =>
                        this.appendInlineInstructorEntry(
                          inlineCourseDraft.course_instructorCustomInput,
                        )
                      }
                      title={this.isArabic() ? "إضافة" : "Add"}
                    >
                      +
                    </button>
                  </div>
                  <input
                    type="text"
                    value={inlineCourseDraft.course_instructors}
                    onChange={(event) =>
                      this.handleInlineCourseFieldChange(
                        "course_instructors",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      this.handleInlineCourseMultiEntryEnter(
                        "course_instructors",
                        event,
                      )
                    }
                    placeholder={
                      this.isArabic()
                        ? "قائمة المدرسين (Enter أو |)"
                        : "Instructors list (Enter or |)"
                    }
                  />
                </div>
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <input
                  type="text"
                  value={inlineCourseDraft.course_grade}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_grade",
                      event.target.value,
                    )
                  }
                  placeholder={this.isArabic() ? "الوزن" : "Weight"}
                />
              </label>
              <label className="nogaPlanner_inlineCourseFormField fc">
                <input
                  type="text"
                  value={inlineCourseDraft.course_fullGrade}
                  onChange={(event) =>
                    this.handleInlineCourseFieldChange(
                      "course_fullGrade",
                      event.target.value,
                    )
                  }
                  placeholder={
                    this.isArabic() ? "الدرجة النهائية" : "Final Result"
                  }
                />
              </label>
            </aside>
          )}
        </div>
      </aside>
    );
  };

  syncLocaleDependentLabels = () => {
    this.setState((currentState) => {
      const nextIsArabic = currentState.ui_locale === "ar";

      return {
        telegram_groupTitle: nextIsArabic
          ? "مجموعة تيليجرام"
          : "Telegram Group",
        telegram_panelGroupTitle: nextIsArabic
          ? "مجموعة تيليجرام"
          : "Telegram Group",
      };
    });
  };

  setPlannerLocale = (nextLocale) => {
    const normalizedLocale = String(nextLocale || "ar")
      .trim()
      .toLowerCase();
    const safeLocale = normalizedLocale === "en" ? "en" : "ar";

    this.setState(
      {
        ui_locale: safeLocale,
        planner_swipeView: "main",
      },
      () => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            NOGA_PLANNER_UI_LOCALE_STORAGE_KEY,
            safeLocale,
          );
        }

        this.syncLocaleDependentLabels();
      },
    );
  };

  togglePlannerLocale = () => {
    this.setPlannerLocale(this.isArabic() ? "en" : "ar");
  };

  alignActionsWindowToLocale = (actionsWindow, snapCallback) => {
    if (!actionsWindow) {
      return;
    }

    const targetLeft = this.isArabic()
      ? Math.max(0, actionsWindow.scrollWidth - actionsWindow.clientWidth)
      : 0;

    actionsWindow.scrollTo({
      left: targetLeft,
      behavior: "auto",
    });

    if (typeof snapCallback === "function") {
      window.requestAnimationFrame(() => {
        snapCallback("auto");
      });
    }
  };

  isReducedMotionEnabled = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      String(
        window.localStorage.getItem(SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY) ||
          "",
      ).trim() === "true"
    );
  };

  getUiLocale = () => (this.isArabic() ? "ar-SY" : undefined);

  isActionLabel = (buttonText, actionText) =>
    String(buttonText || "").trim() === actionText ||
    String(buttonText || "").trim() === this.t(actionText.toLowerCase());

  handlePlannerBrowserBack = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.location.pathname === "/") {
      window.location.reload();
    }
  };

  fetchTelegramConfig = async (options = {}) => {
    const { refreshMessages = true, preserveFeedback = false } = options;

    if (!this.props.state?.token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram config.");
      }

      if (this.isComponentMounted) {
        this.setState(
          (currentState) => ({
            telegram_groupReference: String(payload?.groupReference || ""),
            telegram_panelGroupReference: String(
              currentState.telegram_panelGroupReference || "",
            ),
            telegram_groupInput: String(payload?.groupReference || ""),
            telegram_historyStartDate: payload?.historyStartDate
              ? new Date(payload.historyStartDate).toISOString().slice(0, 10)
              : "",
            telegram_historyImportedAt: payload?.historyImportedAt || "",
            telegram_lastSyncedAt: payload?.lastSyncedAt || "",
            telegram_lastStoredMessageDate:
              payload?.lastStoredMessageDate || "",
            telegram_storedCount: Number(payload?.storedCount) || 0,
            telegram_lastSyncStatus: String(payload?.lastSyncStatus || ""),
            telegram_lastSyncReason: String(payload?.lastSyncReason || ""),
            telegram_lastSyncMessage: String(payload?.lastSyncMessage || ""),
            telegram_lastSyncImportedCount:
              Number(payload?.lastSyncImportedCount) || 0,
            telegram_lastSyncError: String(payload?.lastSyncError || ""),
            telegram_lastSyncScannedCount:
              Number(payload?.lastSyncScannedCount) || 0,
            telegram_lastSyncNewestMessageDateSeen:
              payload?.lastSyncNewestMessageDateSeen || "",
            telegram_lastSyncOldestMessageDateSeen:
              payload?.lastSyncOldestMessageDateSeen || "",
            telegram_lastSyncOldestImportedMessageDate:
              payload?.lastSyncOldestImportedMessageDate || "",
            telegram_lastSyncFirstSkippedBeforeStartDate:
              payload?.lastSyncFirstSkippedBeforeStartDate || "",
            telegram_lastSyncReachedStartBoundary: Boolean(
              payload?.lastSyncReachedStartBoundary,
            ),
            telegram_groupTitle: payload?.groupReference
              ? String(payload.groupReference)
              : "Telegram Group",
            telegram_panelGroupTitle:
              currentState.telegram_panelGroupTitle &&
              currentState.telegram_panelGroupTitle !== "Telegram Group"
                ? currentState.telegram_panelGroupTitle
                : "Telegram Group",
            telegram_feedback: preserveFeedback
              ? this.state.telegram_feedback
              : this.state.telegram_feedback,
          }),
          () => {
            this.fetchTelegramGroups();
            this.fetchStoredTelegramGroups();
            if (refreshMessages) {
              this.fetchTelegramGroupMessages();
            }
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_error:
            error?.message || "Unable to load Telegram configuration.",
        });
      }
    }
  };

  fetchTelegramGroupMessages = async () => {
    const panelGroupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();

    if (!this.props.state?.token) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error: "Telegram messages need a valid login token.",
          telegram_messages: [],
          telegram_rawCount: 0,
          telegram_panelGroupTitle: "Telegram Group",
        });
      }
      return;
    }

    if (!panelGroupReference) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error: "",
          telegram_messages: [],
          telegram_rawCount: 0,
          telegram_panelGroupTitle: "Telegram Group",
        });
      }
      return;
    }

    if (this.isComponentMounted) {
      this.setState({
        telegram_isLoading: true,
        telegram_error: "",
      });
    }

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("limit", "all");
      searchParams.set(
        "view",
        String(this.state.telegram_viewMode || "messages"),
      );

      searchParams.set("group", panelGroupReference);

      if (String(this.state.telegram_searchQuery || "").trim()) {
        searchParams.set(
          "q",
          String(this.state.telegram_searchQuery || "").trim(),
        );
      }

      if (String(this.state.telegram_searchStart || "").trim()) {
        searchParams.set(
          "start",
          String(this.state.telegram_searchStart || "").trim(),
        );
      }

      if (String(this.state.telegram_searchEnd || "").trim()) {
        searchParams.set(
          "end",
          String(this.state.telegram_searchEnd || "").trim(),
        );
      }

      const response = await fetch(
        apiUrl(
          `/api/telegram/stored-group-messages?${searchParams.toString()}`,
        ),
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
          payload?.message || "Unable to load stored conversation messages.",
        );
      }

      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error: "",
          telegram_messages: Array.isArray(payload?.messages)
            ? payload.messages
            : [],
          telegram_storedCount: Number(payload?.storedCount) || 0,
          telegram_rawCount: Number(payload?.rawCount) || 0,
          telegram_panelGroupTitle:
            payload?.group?.title ||
            payload?.group?.username ||
            "Telegram Group",
          telegram_lastSyncedAt: payload?.sync?.lastSyncedAt || "",
          telegram_lastStoredMessageDate:
            payload?.sync?.lastStoredMessageDate || "",
          telegram_lastSyncStatus: String(payload?.sync?.lastSyncStatus || ""),
          telegram_lastSyncReason: String(payload?.sync?.lastSyncReason || ""),
          telegram_lastSyncMessage: String(
            payload?.sync?.lastSyncMessage || "",
          ),
          telegram_lastSyncImportedCount:
            Number(payload?.sync?.lastSyncImportedCount) || 0,
          telegram_lastSyncError: String(payload?.sync?.lastSyncError || ""),
          telegram_lastSyncScannedCount:
            Number(payload?.sync?.lastSyncScannedCount) || 0,
          telegram_lastSyncNewestMessageDateSeen:
            payload?.sync?.lastSyncNewestMessageDateSeen || "",
          telegram_lastSyncOldestMessageDateSeen:
            payload?.sync?.lastSyncOldestMessageDateSeen || "",
          telegram_lastSyncOldestImportedMessageDate:
            payload?.sync?.lastSyncOldestImportedMessageDate || "",
          telegram_lastSyncFirstSkippedBeforeStartDate:
            payload?.sync?.lastSyncFirstSkippedBeforeStartDate || "",
          telegram_lastSyncReachedStartBoundary: Boolean(
            payload?.sync?.lastSyncReachedStartBoundary,
          ),
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isLoading: false,
          telegram_error:
            error?.message || "Unable to load stored conversation messages.",
          telegram_messages: [],
          telegram_rawCount: 0,
        });
      }
    }
  };

  updateTelegramGroupInput = (event) => {
    const nextValue = String(event.target.value || "").trim();

    this.setState((currentState) => ({
      telegram_groupInput: nextValue,
      telegram_feedback:
        currentState.telegram_feedback &&
        currentState.telegram_feedback.startsWith("Saved")
          ? ""
          : currentState.telegram_feedback,
      telegram_error: "",
    }));
    this.replaceTelegramPdfObjectUrl("");
  };

  deleteStoredTelegramGroup = async (groupReference) => {
    const nextReference = String(groupReference || "").trim();

    if (!this.props.state?.token || !nextReference) {
      return;
    }

    this.setState({
      telegram_deletingGroupReference: nextReference,
      telegram_feedback: "",
      telegram_error: "",
    });

    try {
      const response = await fetch(
        apiUrl(
          `/api/telegram/stored-groups/${encodeURIComponent(nextReference)}`,
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete stored conversation.",
        );
      }

      if (this.isComponentMounted) {
        const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
        this.setState(
          (currentState) => {
            const removedCurrentPanelGroup =
              String(currentState.telegram_panelGroupReference || "").trim() ===
              nextReference;
            const fallbackPanelGroup = removedCurrentPanelGroup
              ? nextGroups[0] || null
              : null;

            return {
              telegram_deletingGroupReference: "",
              telegram_storedGroupOptions: nextGroups,
              telegram_feedback:
                payload?.message || "Stored conversation deleted.",
              telegram_panelGroupReference: fallbackPanelGroup
                ? String(fallbackPanelGroup.groupReference || "")
                : removedCurrentPanelGroup
                  ? ""
                  : currentState.telegram_panelGroupReference,
              telegram_panelGroupTitle: fallbackPanelGroup
                ? String(
                    fallbackPanelGroup.title ||
                      fallbackPanelGroup.username ||
                      fallbackPanelGroup.groupReference ||
                      "Telegram Group",
                  )
                : removedCurrentPanelGroup
                  ? "Telegram Group"
                  : currentState.telegram_panelGroupTitle,
              telegram_messages: removedCurrentPanelGroup
                ? []
                : currentState.telegram_messages,
              telegram_rawCount: removedCurrentPanelGroup
                ? 0
                : currentState.telegram_rawCount,
            };
          },
          () => {
            if (String(this.state.telegram_panelGroupReference || "").trim()) {
              this.fetchTelegramGroupMessages();
            }
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_deletingGroupReference: "",
          telegram_error:
            error?.message || "Unable to delete stored conversation.",
        });
      }
    }
  };

  replaceTelegramPdfObjectUrl = (nextUrl = "") => {
    if (
      this.telegramPdfObjectUrl &&
      this.telegramPdfObjectUrl !== nextUrl &&
      typeof window !== "undefined"
    ) {
      window.URL.revokeObjectURL(this.telegramPdfObjectUrl);
    }

    this.telegramPdfObjectUrl = nextUrl;
  };

  getTelegramPdfMessageKey = (message) => {
    const messageGroupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);

    if (!messageGroupReference || !messageId) {
      return "";
    }

    return `${messageGroupReference}:${messageId}`;
  };

  persistTelegramPdfReaderState = (message, nextState = {}) => {
    const messageKey = this.getTelegramPdfMessageKey(message);

    if (!messageKey) {
      return;
    }

    setStoredPdfReaderState(messageKey, {
      page: nextState?.page,
      zoom: nextState?.zoom,
    });
  };

  fetchStoredTelegramPdfBlob = async ({ groupReference, messageId }) => {
    const response = await fetch(
      apiUrl(
        `/api/telegram/stored-group-pdfs/${encodeURIComponent(groupReference)}/${messageId}/open`,
      ),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
        },
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || "Unable to open stored PDF.");
    }

    return response.blob();
  };

  closeTelegramPdfViewer = () => {
    this.replaceTelegramPdfObjectUrl("");

    if (this.isComponentMounted) {
      this.setState({
        telegram_pdfViewerOpen: false,
        telegram_pdfViewerUrl: "",
        telegram_pdfViewerMessage: null,
        telegram_pdfViewerLoading: false,
        telegram_pdfViewerError: "",
      });
    }
  };

  openStoredTelegramPdfInNewTab = async (message) => {
    const groupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);
    const openingKey = `${groupReference}:${messageId}`;

    if (!this.props.state?.token || !groupReference || !messageId) {
      return;
    }

    this.setState({
      telegram_openingPdfKey: openingKey,
      telegram_error: "",
    });

    try {
      const pdfBlob = await this.fetchStoredTelegramPdfBlob({
        groupReference,
        messageId,
      });
      const objectUrl = window.URL.createObjectURL(pdfBlob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60 * 1000);

      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
          telegram_error: error?.message || "Unable to open stored PDF.",
        });
      }
    }
  };

  downloadStoredTelegramPdf = async (message) => {
    const groupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);
    const openingKey = `${groupReference}:${messageId}`;

    if (!this.props.state?.token || !groupReference || !messageId) {
      return;
    }

    this.setState({
      telegram_openingPdfKey: openingKey,
      telegram_error: "",
    });

    try {
      const response = await fetch(
        apiUrl(
          `/api/telegram/stored-group-pdfs/${encodeURIComponent(groupReference)}/${messageId}/download`,
        ),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to download stored PDF.");
      }

      const contentDisposition = String(
        response.headers.get("content-disposition") || "",
      );
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fallbackFileName =
        String(message?.attachmentFileName || "").trim() || "telegram.pdf";
      const fileName =
        String(fileNameMatch?.[1] || "").trim() || fallbackFileName;
      const pdfBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(pdfBlob);
      const temporaryAnchor = document.createElement("a");

      temporaryAnchor.href = objectUrl;
      temporaryAnchor.download = fileName;
      temporaryAnchor.style.display = "none";
      document.body.appendChild(temporaryAnchor);
      temporaryAnchor.click();
      temporaryAnchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
          telegram_error: error?.message || "Unable to download stored PDF.",
        });
      }
    }
  };

  openStoredTelegramPdf = async (message) => {
    const groupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);
    const openingKey = `${groupReference}:${messageId}`;

    if (!this.props.state?.token || !groupReference || !messageId) {
      return;
    }

    this.setState({
      telegram_openingPdfKey: openingKey,
      telegram_pdfViewerOpen: true,
      telegram_pdfViewerLoading: true,
      telegram_pdfViewerError: "",
      telegram_pdfViewerMessage: {
        ...(message || {}),
        groupReference,
      },
      telegram_error: "",
    });

    try {
      const pdfBlob = await this.fetchStoredTelegramPdfBlob({
        groupReference,
        messageId,
      });
      const objectUrl = window.URL.createObjectURL(pdfBlob);
      this.replaceTelegramPdfObjectUrl(objectUrl);

      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
          telegram_pdfViewerUrl: objectUrl,
          telegram_pdfViewerLoading: false,
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_openingPdfKey: "",
          telegram_pdfViewerLoading: false,
          telegram_pdfViewerError:
            error?.message || "Unable to open stored PDF.",
          telegram_error: error?.message || "Unable to open stored PDF.",
        });
      }
    }
  };

  saveTelegramConfig = async () => {
    if (!this.props.state?.token || this.state.telegram_isSaving) {
      return;
    }

    this.setState({
      telegram_isSaving: true,
      telegram_feedback: "",
    });

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.props.state.token}`,
        },
        body: JSON.stringify({
          groupReference: String(this.state.telegram_groupInput || "").trim(),
          historyStartDate: String(
            this.state.telegram_historyStartDate || "",
          ).trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to save Telegram settings.",
        );
      }

      if (this.isComponentMounted) {
        this.setState(
          (currentState) => ({
            telegram_isSaving: false,
            telegram_feedback:
              payload?.message || "Saved NogaPlanner Telegram settings.",
            telegram_groupInput: String(payload?.groupReference || ""),
            telegram_historyStartDate: payload?.historyStartDate
              ? new Date(payload.historyStartDate).toISOString().slice(0, 10)
              : "",
            telegram_historyImportedAt: payload?.historyImportedAt || "",
            telegram_lastSyncedAt: payload?.lastSyncedAt || "",
            telegram_lastStoredMessageDate:
              payload?.lastStoredMessageDate || "",
            telegram_storedCount: Number(payload?.storedCount) || 0,
            telegram_lastSyncStatus: String(payload?.lastSyncStatus || ""),
            telegram_lastSyncReason: String(payload?.lastSyncReason || ""),
            telegram_lastSyncMessage: String(payload?.lastSyncMessage || ""),
            telegram_lastSyncImportedCount:
              Number(payload?.lastSyncImportedCount) || 0,
            telegram_lastSyncError: String(payload?.lastSyncError || ""),
            telegram_lastSyncScannedCount:
              Number(payload?.lastSyncScannedCount) || 0,
            telegram_lastSyncNewestMessageDateSeen:
              payload?.lastSyncNewestMessageDateSeen || "",
            telegram_lastSyncOldestMessageDateSeen:
              payload?.lastSyncOldestMessageDateSeen || "",
            telegram_lastSyncOldestImportedMessageDate:
              payload?.lastSyncOldestImportedMessageDate || "",
            telegram_lastSyncFirstSkippedBeforeStartDate:
              payload?.lastSyncFirstSkippedBeforeStartDate || "",
            telegram_lastSyncReachedStartBoundary: Boolean(
              payload?.lastSyncReachedStartBoundary,
            ),
            telegram_groupReference: String(payload?.groupReference || ""),
            telegram_groupTitle:
              String(payload?.groupReference || "") || "Telegram Group",
          }),
          () => {
            if (
              !this.state.telegram_messages.length &&
              !String(this.state.telegram_panelGroupReference || "").trim()
            ) {
              this.fetchTelegramGroupMessages();
            }
            if (
              String(payload?.message || "").includes(
                "Background history sync started",
              )
            ) {
              this.startTelegramSyncStatusPolling();
            } else {
              this.stopTelegramSyncStatusPolling();
            }
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_isSaving: false,
          telegram_feedback:
            error?.message || "Unable to save Telegram settings.",
        });
      }
    }
  };

  getTelegramMessageDate = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      const normalizedValue =
        Math.abs(value) < 1000000000000 ? value * 1000 : value;
      return new Date(normalizedValue);
    }

    if (typeof value === "string" && value.trim()) {
      const nextDate = new Date(value);
      return Number.isNaN(nextDate.getTime()) ? null : nextDate;
    }

    return null;
  };

  formatTelegramDayLabel = (value) => {
    const nextDate = this.getTelegramMessageDate(value);

    if (!nextDate) {
      return this.t("unknownDay");
    }

    return nextDate.toLocaleDateString(this.getUiLocale(), {
      timeZone: TELEGRAM_DISPLAY_TIMEZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  formatTelegramDateTime = (value) => {
    const nextDate = this.getTelegramMessageDate(value);

    if (!nextDate) {
      return "";
    }

    return nextDate.toLocaleString(this.getUiLocale(), {
      timeZone: TELEGRAM_DISPLAY_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  formatTelegramTimeOnly = (value) => {
    const nextDate = this.getTelegramMessageDate(value);

    if (!nextDate) {
      return "";
    }

    return nextDate.toLocaleTimeString(this.getUiLocale(), {
      timeZone: TELEGRAM_DISPLAY_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  formatTelegramGroupOptionLabel = (group, fallbackLabel = "") => {
    const baseLabel = String(
      group?.title || group?.username || group?.groupReference || fallbackLabel,
    ).trim();
    const nextType = String(group?.type || "")
      .trim()
      .toLowerCase();

    if (!baseLabel) {
      return fallbackLabel;
    }

    if (nextType === "channel") {
      return `${baseLabel} (channel)`;
    }

    if (nextType === "supergroup") {
      return `${baseLabel} (supergroup)`;
    }

    if (nextType === "group") {
      return `${baseLabel} (group)`;
    }

    return baseLabel;
  };

  isNumericTelegramReference = (value) =>
    /^-?\d+$/.test(String(value || "").trim());

  hasVisibleTelegramGroupLabel = (group) => {
    const groupReference = String(group?.groupReference || "").trim();
    const title = String(group?.title || "").trim();
    const username = String(group?.username || "").trim();

    return [title, username].some(
      (value) => Boolean(value) && value !== groupReference,
    );
  };

  renderTelegramGroupOptions = (fallbackLabel = "", optionsOverride = null) => {
    const nextOptions = Array.isArray(optionsOverride)
      ? optionsOverride
      : Array.isArray(this.state.telegram_groupOptions)
        ? this.state.telegram_groupOptions
        : [];
    const configuredReference = String(
      this.state.telegram_groupInput ||
        this.state.telegram_groupReference ||
        "",
    ).trim();
    const hasConfiguredReference =
      configuredReference.length > 0 &&
      !this.isNumericTelegramReference(configuredReference);
    const mergedOptions = hasConfiguredReference
      ? [
          ...nextOptions,
          ...(!nextOptions.some(
            (group) =>
              String(group?.groupReference || "").trim() ===
              configuredReference,
          )
            ? [
                {
                  groupReference: configuredReference,
                  title: configuredReference,
                  username: "",
                  type: "group",
                },
              ]
            : []),
        ]
      : nextOptions;

    if (mergedOptions.length === 0) {
      return <option value="">{fallbackLabel}</option>;
    }

    const groupedOptions = mergedOptions.reduce(
      (accumulator, group) => {
        const nextType = String(group?.type || "")
          .trim()
          .toLowerCase();

        if (nextType === "channel") {
          accumulator.channels.push(group);
        } else if (nextType === "supergroup") {
          accumulator.supergroups.push(group);
        } else {
          accumulator.groups.push(group);
        }

        return accumulator;
      },
      { groups: [], supergroups: [], channels: [] },
    );

    return [
      groupedOptions.groups.length > 0 ? (
        <optgroup key="telegram-groups" label={this.t("telegramGroupsLabel")}>
          {groupedOptions.groups.map((group) => (
            <option
              key={String(group?.groupReference || group?.title || "")}
              value={String(group?.groupReference || "")}
            >
              {this.formatTelegramGroupOptionLabel(group, fallbackLabel)}
            </option>
          ))}
        </optgroup>
      ) : null,
      groupedOptions.supergroups.length > 0 ? (
        <optgroup
          key="telegram-supergroups"
          label={this.t("telegramSupergroupsLabel")}
        >
          {groupedOptions.supergroups.map((group) => (
            <option
              key={String(group?.groupReference || group?.title || "")}
              value={String(group?.groupReference || "")}
            >
              {this.formatTelegramGroupOptionLabel(group, fallbackLabel)}
            </option>
          ))}
        </optgroup>
      ) : null,
      groupedOptions.channels.length > 0 ? (
        <optgroup
          key="telegram-channels"
          label={this.t("telegramChannelsLabel")}
        >
          {groupedOptions.channels.map((group) => (
            <option
              key={String(group?.groupReference || group?.title || "")}
              value={String(group?.groupReference || "")}
            >
              {this.formatTelegramGroupOptionLabel(group, fallbackLabel)}
            </option>
          ))}
        </optgroup>
      ) : null,
    ];
  };

  getStoredTelegramGroupOptions = () => {
    const storedOptions = Array.isArray(this.state.telegram_storedGroupOptions)
      ? this.state.telegram_storedGroupOptions.filter(
          (group) =>
            this.hasVisibleTelegramGroupLabel(group) ||
            !this.isNumericTelegramReference(group?.groupReference),
        )
      : [];
    const currentReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();

    if (
      !currentReference ||
      Number(this.state.telegram_storedCount || 0) <= 0
    ) {
      return storedOptions;
    }

    const hasCurrentOption = storedOptions.some(
      (group) =>
        String(group?.groupReference || "").trim() === currentReference,
    );

    if (hasCurrentOption) {
      return storedOptions;
    }

    const currentTitle = String(
      this.state.telegram_panelGroupTitle || "",
    ).trim();
    const hasVisibleCurrentLabel =
      Boolean(currentTitle) && currentTitle !== currentReference;

    if (
      !hasVisibleCurrentLabel &&
      this.isNumericTelegramReference(currentReference)
    ) {
      return storedOptions;
    }

    return [
      {
        groupReference: currentReference,
        title: hasVisibleCurrentLabel ? currentTitle : "",
        username: "",
        type: "group",
        storedCount: Number(this.state.telegram_storedCount || 0),
      },
      ...storedOptions,
    ];
  };

  getSortedTelegramPdfs = () =>
    (Array.isArray(this.state.telegram_messages)
      ? this.state.telegram_messages
      : []
    )
      .filter((message) => Boolean(message?.attachmentIsPdf))
      .sort((firstMessage, secondMessage) => {
        const dateDifference =
          (Number(secondMessage?.date) || 0) -
          (Number(firstMessage?.date) || 0);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return String(
          firstMessage?.attachmentFileName || firstMessage?.text || "",
        ).localeCompare(
          String(
            secondMessage?.attachmentFileName || secondMessage?.text || "",
          ),
        );
      });

  formatTelegramAttachmentSize = (value) => {
    const sizeBytes = Number(value || 0);

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return "";
    }

    if (sizeBytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  updateTelegramViewMode = (nextViewMode = "messages") => {
    const normalizedViewMode = nextViewMode === "pdfs" ? "pdfs" : "messages";

    this.setState(
      (currentState) => ({
        telegram_viewMode: normalizedViewMode,
        telegram_courseSuggestionsVisible: false,
        telegram_messages:
          normalizedViewMode === currentState.telegram_viewMode
            ? currentState.telegram_messages
            : [],
      }),
      () => {
        this.fetchTelegramGroupMessages();
      },
    );
  };

  groupTelegramMessagesByDay = (messages = []) => {
    const groupedMessagesMap = new Map();

    messages.forEach((message) => {
      const dayKey = this.formatTelegramDayLabel(message?.date);

      if (!groupedMessagesMap.has(dayKey)) {
        groupedMessagesMap.set(dayKey, []);
      }

      groupedMessagesMap.get(dayKey).push(message);
    });

    return Array.from(groupedMessagesMap.entries()).map(
      ([dayLabel, items]) => ({
        dayLabel,
        items,
      }),
    );
  };

  getLectureTelegramKeywords = (lecture) => {
    if (!lecture) {
      return [];
    }

    const sourceValues = [
      lecture.lecture_name,
      lecture.lecture_course,
      lecture.lecture_instructor,
      lecture.lecture_writer,
      ...(Array.isArray(lecture.lecture_outlines)
        ? lecture.lecture_outlines.slice(0, 8)
        : []),
    ];

    const keywords = new Set();

    sourceValues.forEach((value) => {
      normalizeTelegramSearchText(value)
        .split(" ")
        .filter((part) => part.length >= 3)
        .filter((part) => !TELEGRAM_LECTURE_STOP_WORDS.has(part))
        .forEach((part) => {
          keywords.add(part);
        });
    });

    return Array.from(keywords);
  };

  getLectureTelegramSummary = (lecture) => {
    const messages = Array.isArray(this.state.telegram_messages)
      ? this.state.telegram_messages
      : [];

    if (!lecture || messages.length === 0) {
      return {
        relevantMessages: [],
        matchedKeywords: [],
        latestRelevantMessage: null,
      };
    }

    const keywords = this.getLectureTelegramKeywords(lecture);

    const scoredMessages = messages
      .map((message) => {
        const normalizedText = normalizeTelegramSearchText(message?.text);

        if (!normalizedText) {
          return null;
        }

        const matchedKeywords = keywords.filter(
          (keyword) =>
            normalizedText.includes(keyword) ||
            normalizedText.includes(keyword.replace(/\s+/g, "")),
        );

        if (matchedKeywords.length === 0) {
          return null;
        }

        const lectureName = normalizeTelegramSearchText(lecture.lecture_name);
        const courseName = normalizeTelegramSearchText(lecture.lecture_course);
        let score = matchedKeywords.length;

        if (lectureName && normalizedText.includes(lectureName)) {
          score += 4;
        }

        if (courseName && normalizedText.includes(courseName)) {
          score += 3;
        }

        return {
          ...message,
          score,
          matchedKeywords,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          (this.getTelegramMessageDate(b.date)?.getTime() || 0) -
          (this.getTelegramMessageDate(a.date)?.getTime() || 0)
        );
      });

    const relevantMessages = scoredMessages.slice(0, 3);
    const matchedKeywords = [
      ...new Set(
        relevantMessages.flatMap((message) => message.matchedKeywords),
      ),
    ].slice(0, 8);

    return {
      relevantMessages,
      matchedKeywords,
      latestRelevantMessage: relevantMessages[0] || null,
    };
  };

  playCoursePrintSound = (printDurationMs = 0) => {
    if (!this.coursePrintAudio) {
      this.coursePrintAudio = new Audio("/sounds/schoolplanner-typing.wav");
      this.coursePrintAudio.preload = "auto";
    }

    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];

    this.coursePrintAudio.pause();
    this.coursePrintAudio.currentTime = COURSE_PRINT_SOUND_START_OFFSET;
    this.coursePrintAudio.volume = 0.42;
    if (printDurationMs > 0) {
      const printDurationSeconds = printDurationMs / 1000;
      const playbackRate = Math.min(
        2.5,
        Math.max(0.45, COURSE_PRINT_SOUND_BASE_DURATION / printDurationSeconds),
      );
      this.coursePrintAudio.playbackRate = playbackRate;
      this.coursePrintAudio.loop =
        printDurationSeconds > COURSE_PRINT_SOUND_BASE_DURATION / playbackRate;
    } else {
      this.coursePrintAudio.playbackRate = 1;
      this.coursePrintAudio.loop = true;
    }
    this.coursePrintAudio.play().catch(() => {});
  };

  stopCoursePrintSound = () => {
    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];

    if (!this.coursePrintAudio) return;

    this.coursePrintAudio.pause();
    this.coursePrintAudio.currentTime = COURSE_PRINT_SOUND_START_OFFSET;
  };

  getNaghamCourseLetter = (course) => {
    if (typeof window === "undefined") {
      return DEFAULT_NAGHAM_COURSE_LETTER;
    }

    try {
      const storedLetters = JSON.parse(
        window.localStorage.getItem(NAGHAM_COURSE_LETTERS_STORAGE_KEY) || "{}",
      );

      return (
        storedLetters?.[course?._id] ||
        storedLetters?.[course?.course_name] ||
        ""
      );
    } catch (error) {
      return "";
    }
  };

  updateCoursePrintReveal = (node, immediate = false) => {
    let detailsDiv = document.getElementById("nogaPlanner_courses_details_div");
    if (!detailsDiv) return;
    const shouldReduceMotion = this.isReducedMotionEnabled();

    if (shouldReduceMotion) {
      detailsDiv.style.transition = "none";
      detailsDiv.style.clipPath = "inset(0 0 0 0)";
      detailsDiv.style.opacity = "1";
      detailsDiv.style.filter = "none";
      return;
    }

    if (!node) {
      detailsDiv.style.transition = immediate
        ? "none"
        : "clip-path 130ms ease-out, opacity 100ms linear, filter 120ms linear";
      detailsDiv.style.clipPath = "inset(0 0 100% 0)";
      detailsDiv.style.opacity = "0.42";
      detailsDiv.style.filter = "saturate(0.7) brightness(1.08)";
      return;
    }

    const detailsRect = detailsDiv.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const trailingPaperSpace =
      detailsDiv
        .querySelector(".nogaPlanner_courses_printSpacer")
        ?.getBoundingClientRect().height || 56;
    const revealedHeight = Math.max(
      0,
      nodeRect.bottom - detailsRect.top + 12 + trailingPaperSpace,
    );
    const hiddenBottom = Math.max(0, detailsRect.height - revealedHeight);

    const targetOpacity = hiddenBottom > 0 ? "0.78" : "1";
    const targetFilter =
      hiddenBottom > 0
        ? "saturate(0.88) brightness(1.03)"
        : "saturate(1) brightness(1)";

    if (immediate) {
      detailsDiv.style.transition = "none";
      detailsDiv.style.clipPath = `inset(0 0 ${hiddenBottom}px 0)`;
      detailsDiv.style.opacity = targetOpacity;
      detailsDiv.style.filter = targetFilter;
      return;
    }

    const hesitationBottom = Math.max(0, hiddenBottom + 10);
    detailsDiv.style.transition =
      "clip-path 58ms ease-out, opacity 58ms linear, filter 58ms linear";
    detailsDiv.style.clipPath = `inset(0 0 ${hesitationBottom}px 0)`;
    detailsDiv.style.opacity = targetOpacity;
    detailsDiv.style.filter = targetFilter;

    const timeoutId = window.setTimeout(() => {
      detailsDiv.style.transition =
        "clip-path 92ms ease-out, opacity 92ms linear, filter 92ms linear";
      detailsDiv.style.clipPath = `inset(0 0 ${hiddenBottom}px 0)`;
      detailsDiv.style.opacity = targetOpacity;
      detailsDiv.style.filter = targetFilter;
    }, 72);
    this.courseDetailsTypingTimeouts.push(timeoutId);
  };

  keepCoursePrintLineVisible = (node) => {
    let detailsDiv = document.getElementById("nogaPlanner_courses_details_div");
    if (!detailsDiv || !node) return;

    let actionsMount = document.getElementById(
      "nogaPlanner_courses_actions_mount",
    );
    const detailsRect = detailsDiv.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const actionsRect = actionsMount
      ? actionsMount.getBoundingClientRect()
      : null;
    const visibleTop = detailsRect.top + 12;
    const visibleBottom = actionsRect
      ? Math.min(detailsRect.bottom, actionsRect.top - 12)
      : detailsRect.bottom - 12;

    if (nodeRect.bottom > visibleBottom) {
      detailsDiv.scrollTop += nodeRect.bottom - visibleBottom;
    } else if (nodeRect.top < visibleTop) {
      detailsDiv.scrollTop -= visibleTop - nodeRect.top;
    }
  };

  setPageFinishLecture = async (lecture, pageNum, boolean) => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/setPageFinishLecture/") +
      this.props.state.my_id +
      "/" +
      lecture._id +
      "/" +
      boolean;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageNum: pageNum,
      }),
    };
    let req = new Request(url, options);
    await fetch(req)
      .then((result) => {
        if (result.status === 201) {
          return result.json();
        }
      })
      .then((result) => {
        let updatedLecture = result.lectureFound;
        this.setState({
          lecture_isLoading: false,
          lectures: this.state.lectures.map((existingLecture) =>
            existingLecture._id === updatedLecture._id
              ? updatedLecture
              : existingLecture,
          ),
          lecture_details: updatedLecture,
        });
      });
  };

  hideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/hideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("nogaPlanner_lectures_hideUnchecked_button").style.display="none"
        // document.getElementById("nogaPlanner_lectures_hideUnchecked_button").style.display="inline"
      }
    });
  };

  unhideUncheckedLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/unhideUncheckedLectures/") + this.props.state.my_id;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        this.setState({
          lecture_isLoading: false,
        });
        this.retrieveLectures();
        // document.getElementById("nogaPlanner_lectures_hideUnchecked_button").style.display="inline"
        // document.getElementById("nogaPlanner_lectures_hideUnchecked_button").style.display="none"
      }
    });
  };

  calculateLectureNum = () => {
    return;
  };

  openLectureDetails = (lecture) => {
    this.setState({
      lecture_details: lecture,
      lecture_detailsPagesExpanded: false,
    });
  };

  closeLectureDetails = () => {
    this.setState({
      lecture_details: null,
      lecture_detailsPagesExpanded: false,
    });
  };

  toggleLectureDetailsPages = () => {
    this.setState((currentState) => ({
      lecture_detailsPagesExpanded: !currentState.lecture_detailsPagesExpanded,
    }));
  };

  updateTelegramSearchField = (event) => {
    const fieldName = String(event.target.name || "");
    const fieldValue = String(event.target.value || "");

    this.setState({
      [fieldName]: fieldValue,
    });
  };

  submitTelegramSearch = () => {
    this.fetchTelegramGroupMessages();
  };

  resetTelegramSearch = () => {
    this.setState(
      {
        telegram_searchQuery: "",
        telegram_searchStart: "",
        telegram_searchEnd: "",
      },
      () => {
        this.fetchTelegramGroupMessages();
      },
    );
  };

  sendPlannerInfoToTelegram = async (noteText) => {
    if (!this.props.state?.token) {
      this.setState({
        telegram_feedback: "Telegram sending needs a valid login token.",
      });
      return false;
    }

    const trimmedText = String(noteText || "").trim();

    if (!trimmedText) {
      this.setState({
        telegram_feedback: "Planner note is empty, so nothing was sent.",
      });
      return false;
    }

    this.setState({
      telegram_feedback: "Sending planner note to Telegram...",
    });

    try {
      const response = await fetch(apiUrl("/api/telegram/send-note"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.props.state.token}`,
        },
        body: JSON.stringify({
          text: trimmedText,
          targetMode: "saved",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to send planner note.");
      }

      this.setState({
        telegram_feedback: payload?.message || "Planner note sent to Telegram.",
      });
      return true;
    } catch (error) {
      this.setState({
        telegram_feedback:
          error?.message || "Unable to send planner note to Telegram.",
      });
      return false;
    }
  };

  openMainPlannerSwipeView = () => {
    this.setState({
      planner_swipeView: "main",
    });
  };

  getTelegramSyncFeedback = ({
    storedCount = 0,
    historyImportedAt = "",
    lastSyncedAt = "",
    lastSyncStatus = "",
    lastSyncReason = "",
    lastSyncMessage = "",
    lastSyncImportedCount = 0,
    lastSyncError = "",
  }) => {
    if (lastSyncStatus === "error") {
      return lastSyncError
        ? `History sync failed: ${lastSyncError}`
        : "History sync failed.";
    }

    if (lastSyncStatus === "running") {
      return `Background history sync running. Stored ${storedCount} message(s) so far${lastSyncedAt ? `, last sync ${this.formatTelegramDateTime(lastSyncedAt)}.` : "."}`;
    }

    if (lastSyncMessage) {
      return lastSyncReason === "messages-imported"
        ? `${lastSyncMessage} Stored total: ${storedCount}.`
        : lastSyncMessage;
    }

    if (historyImportedAt) {
      return storedCount > 0
        ? `History sync complete. Stored ${storedCount} message(s).`
        : "History sync finished, but the backend did not report a reason. Restart the backend to load the new Telegram sync diagnostics, then run the sync again.";
    }

    return `Background history sync running. Stored ${storedCount} message(s) so far${lastSyncedAt ? `, last sync ${this.formatTelegramDateTime(lastSyncedAt)}.` : "."}`;
  };

  stopTelegramSyncStatusPolling = () => {
    if (this.telegramSyncStatusTimeout) {
      clearTimeout(this.telegramSyncStatusTimeout);
      this.telegramSyncStatusTimeout = null;
    }
  };

  startTelegramSyncStatusPolling = () => {
    this.stopTelegramSyncStatusPolling();

    let attemptsRemaining = 18;

    const runPoll = async () => {
      if (!this.isComponentMounted || attemptsRemaining <= 0) {
        this.stopTelegramSyncStatusPolling();
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/telegram/config"), {
          method: "GET",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load Telegram config.",
          );
        }

        if (this.isComponentMounted) {
          const storedCount = Number(payload?.storedCount) || 0;
          const historyImportedAt = payload?.historyImportedAt || "";
          const lastSyncedAt = payload?.lastSyncedAt || "";
          const lastSyncStatus = String(payload?.lastSyncStatus || "");
          const lastSyncReason = String(payload?.lastSyncReason || "");
          const lastSyncMessage = String(payload?.lastSyncMessage || "");
          const lastSyncImportedCount =
            Number(payload?.lastSyncImportedCount) || 0;
          const lastSyncError = String(payload?.lastSyncError || "");
          const lastSyncScannedCount =
            Number(payload?.lastSyncScannedCount) || 0;
          const lastSyncNewestMessageDateSeen =
            payload?.lastSyncNewestMessageDateSeen || "";
          const lastSyncOldestMessageDateSeen =
            payload?.lastSyncOldestMessageDateSeen || "";
          const lastSyncOldestImportedMessageDate =
            payload?.lastSyncOldestImportedMessageDate || "";
          const lastSyncFirstSkippedBeforeStartDate =
            payload?.lastSyncFirstSkippedBeforeStartDate || "";
          const lastSyncReachedStartBoundary = Boolean(
            payload?.lastSyncReachedStartBoundary,
          );

          this.setState({
            telegram_groupReference: String(payload?.groupReference || ""),
            telegram_groupInput: String(payload?.groupReference || ""),
            telegram_historyStartDate: payload?.historyStartDate
              ? new Date(payload.historyStartDate).toISOString().slice(0, 10)
              : "",
            telegram_historyImportedAt: historyImportedAt,
            telegram_lastSyncedAt: lastSyncedAt,
            telegram_lastStoredMessageDate:
              payload?.lastStoredMessageDate || "",
            telegram_storedCount: storedCount,
            telegram_lastSyncStatus: lastSyncStatus,
            telegram_lastSyncReason: lastSyncReason,
            telegram_lastSyncMessage: lastSyncMessage,
            telegram_lastSyncImportedCount: lastSyncImportedCount,
            telegram_lastSyncError: lastSyncError,
            telegram_lastSyncScannedCount: lastSyncScannedCount,
            telegram_lastSyncNewestMessageDateSeen:
              lastSyncNewestMessageDateSeen,
            telegram_lastSyncOldestMessageDateSeen:
              lastSyncOldestMessageDateSeen,
            telegram_lastSyncOldestImportedMessageDate:
              lastSyncOldestImportedMessageDate,
            telegram_lastSyncFirstSkippedBeforeStartDate:
              lastSyncFirstSkippedBeforeStartDate,
            telegram_lastSyncReachedStartBoundary: lastSyncReachedStartBoundary,
            telegram_groupTitle: payload?.groupReference
              ? String(payload.groupReference)
              : this.state.telegram_groupTitle,
            telegram_feedback: this.getTelegramSyncFeedback({
              storedCount,
              historyImportedAt,
              lastSyncedAt,
              lastSyncStatus,
              lastSyncReason,
              lastSyncMessage,
              lastSyncImportedCount,
              lastSyncError,
            }),
          });
        }

        attemptsRemaining -= 1;

        if (
          payload?.lastSyncStatus === "completed" ||
          payload?.lastSyncStatus === "error" ||
          payload?.historyImportedAt
        ) {
          this.stopTelegramSyncStatusPolling();
          return;
        }
      } catch (error) {
        attemptsRemaining -= 1;
      }

      if (attemptsRemaining > 0 && this.isComponentMounted) {
        this.telegramSyncStatusTimeout = setTimeout(runPoll, 4000);
      } else {
        this.stopTelegramSyncStatusPolling();
      }
    };

    this.telegramSyncStatusTimeout = setTimeout(runPoll, 2500);
  };

  openScheduleSwipeView = () => {
    this.setState({
      planner_swipeView: "schedule",
    });
  };

  toggleScheduleSwipeView = () => {
    this.setState((currentState) => ({
      planner_swipeView:
        currentState.planner_swipeView === "schedule" ? "main" : "schedule",
    }));
  };

  handlePlannerTouchStart = (event) => {
    const firstTouch = event.touches?.[0];

    if (!firstTouch) {
      this.plannerSwipeStart = null;
      return;
    }

    const actionSlider = event.target?.closest?.(
      "#nogaPlanner_courses_actions",
    );
    if (actionSlider) {
      this.plannerSwipeStart = null;
      return;
    }

    const nearLeftBrowserEdge = firstTouch.clientX <= 24;
    if (nearLeftBrowserEdge) {
      event.preventDefault();
    }

    this.plannerSwipeStart = {
      x: firstTouch.clientX,
      y: firstTouch.clientY,
      startedNearLeftEdge: nearLeftBrowserEdge,
    };
  };

  handlePlannerTouchEnd = (event) => {
    const firstTouch = event.changedTouches?.[0];

    if (!this.plannerSwipeStart || !firstTouch) {
      this.plannerSwipeStart = null;
      return;
    }

    const deltaX = firstTouch.clientX - this.plannerSwipeStart.x;
    const deltaY = firstTouch.clientY - this.plannerSwipeStart.y;

    this.plannerSwipeStart = null;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) >= 60) {
      if (deltaY < 0) {
        this.openScheduleSwipeView();
        return;
      }

      this.openMainPlannerSwipeView();
      return;
    }

    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX > 0) {
      this.openMainPlannerSwipeView();
    }
  };

  handlePlannerTouchMove = (event) => {
    const firstTouch = event.touches?.[0];

    if (!this.plannerSwipeStart || !firstTouch) {
      return;
    }

    const deltaX = firstTouch.clientX - this.plannerSwipeStart.x;
    const deltaY = firstTouch.clientY - this.plannerSwipeStart.y;

    if (
      (this.plannerSwipeStart.startedNearLeftEdge && deltaX > 0) ||
      (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) ||
      (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12)
    ) {
      event.preventDefault();
    }
  };

  appendLectureRow = (tbody, lecture, progressionStats, interactivePages) => {
    let titleCell = document.createElement("td");
    let courseCell = document.createElement("td");
    let instructorCell = document.createElement("td");
    let writerCell = document.createElement("td");
    let row = document.createElement("tr");
    let titleText = document.createElement("p");

    titleText.textContent = lecture.lecture_name;
    courseCell.textContent = lecture.lecture_course;
    instructorCell.textContent = lecture.lecture_instructor;
    writerCell.textContent = lecture.lecture_writer;

    row.setAttribute("class", "menuLi_div nogaPlanner_lecture_row");
    row.setAttribute("id", lecture._id + "li");
    titleCell.setAttribute("class", "nogaPlanner_lecture_titleCell");
    titleText.setAttribute("class", "nogaPlanner_lecture_titleText");
    titleText.setAttribute("role", "button");
    titleText.setAttribute("tabindex", "0");
    titleText.setAttribute(
      "title",
      this.isArabic() ? "افتح تفاصيل المحاضرة" : "Open lecture details",
    );
    titleText.addEventListener("click", () => {
      this.openLectureDetails(lecture);
    });
    titleText.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.openLectureDetails(lecture);
      }
    });

    titleCell.append(titleText);
    row.append(titleCell, courseCell, instructorCell, writerCell);
    tbody.prepend(row);
  };

  renderLectureDetailsPanel = () => {
    const lecture = this.state.lecture_details;
    const isOpen = lecture !== null;
    const progressionStats = lecture
      ? getProgressStats(lecture.lecture_progress, lecture.lecture_length)
      : getProgressStats(0, 0);
    const finishedPages = Array.isArray(lecture?.lecture_pagesFinished)
      ? lecture.lecture_pagesFinished
      : [];
    const lectureTelegramSummary = this.getLectureTelegramSummary(lecture);
    const pagesAreExpanded = this.state.lecture_detailsPagesExpanded === true;
    const lectureCorrectionsList = normalizeLectureCorrections(
      lecture?.lecture_corrections,
    ).sort((firstCorrection, secondCorrection) => {
      return Number(firstCorrection.page) - Number(secondCorrection.page);
    });

    return (
      <div
        id="nogaPlanner_lectureDetailsMount"
        className={isOpen ? "nogaPlanner_lectureDetailsMount--open" : ""}
      >
        <div
          id="nogaPlanner_lectureDetailsCard"
          className={`fc ${
            isOpen
              ? "nogaPlanner_lectureDetailsCard--open"
              : "nogaPlanner_lectureDetailsCard--closed"
          }`}
        >
          {lecture && (
            <React.Fragment>
              <div id="nogaPlanner_lectureDetailsHeader" className="fr">
                <div id="nogaPlanner_lectureDetailsTitleBlock" className="fc">
                  <p id="nogaPlanner_lectureDetailsEyebrow">
                    {this.t("lectureDetails")}
                  </p>
                  <h3 id="nogaPlanner_lectureDetailsTitle">
                    {lecture.lecture_name}
                  </h3>
                  <p id="nogaPlanner_lectureDetailsMeta">
                    {lecture.lecture_course} | {lecture.lecture_instructor} |{" "}
                    {lecture.lecture_writer}
                  </p>
                </div>
                <div
                  id="nogaPlanner_lectureDetailsHeaderActions"
                  className="fr"
                >
                  <button
                    type="button"
                    className="nogaPlanner_telegramSendButton"
                    onClick={() =>
                      this.sendPlannerInfoToTelegram(
                        [
                          `Lecture details`,
                          `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                          `${this.t("course")}: ${lecture.lecture_course || "-"}`,
                          `${this.t("instructor")}: ${lecture.lecture_instructor || "-"}`,
                          `${this.t("writer")}: ${lecture.lecture_writer || "-"}`,
                          `${this.t("date")}: ${lecture.lecture_date || "-"}`,
                        ].join("\n"),
                      )
                    }
                  >
                    {this.t("send")}
                  </button>
                  <button
                    type="button"
                    id="nogaPlanner_lectureDetailsClose"
                    onClick={this.closeLectureDetails}
                  >
                    <i className="fi fi-rr-x"></i>
                  </button>
                </div>
              </div>
              <div id="nogaPlanner_lectureDetailsProgressBlock" className="fc">
                <div className="fr nogaPlanner_lectureDetailsSectionHeader">
                  <p id="nogaPlanner_lectureDetailsProgressText">
                    {this.t("pagesFinishedSummary", {
                      progress: progressionStats.progress,
                      length: progressionStats.length,
                      remaining: progressionStats.remaining,
                      percent: progressionStats.percent,
                    })}
                  </p>
                  <button
                    type="button"
                    className="nogaPlanner_telegramSendButton"
                    onClick={() =>
                      this.sendPlannerInfoToTelegram(
                        [
                          this.t("lectureDetails"),
                          `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                          `${this.t("finishedPages")}: ${progressionStats.progress}/${progressionStats.length}`,
                          `${this.t("remainingPages")}: ${progressionStats.remaining}`,
                          `Progress: ${progressionStats.percent}%`,
                        ].join("\n"),
                      )
                    }
                  >
                    {this.t("send")}
                  </button>
                </div>
                <div
                  id="nogaPlanner_lectureDetailsProgressBar"
                  className="div_indicatorBox_progression"
                >
                  <div
                    className="div_indicator_progression"
                    style={{
                      width: `${progressionStats.indicatorWidth}px`,
                      backgroundColor:
                        progressionStats.percent < 50
                          ? "var(--red2)"
                          : "var(--planner-accent)",
                    }}
                  ></div>
                </div>
              </div>
              <div id="nogaPlanner_lectureDetailsCorrections" className="fc">
                <div className="fr nogaPlanner_lectureDetailsSectionHeader">
                  <p id="nogaPlanner_lectureDetailsCorrectionsLabel">
                    {this.t("corrections")}
                  </p>
                  <button
                    type="button"
                    className="nogaPlanner_telegramSendButton"
                    onClick={() =>
                      this.sendPlannerInfoToTelegram(
                        [
                          this.t("corrections"),
                          `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                          `${this.t("writerLabel")}: ${lecture.lecture_writer || "-"}`,
                          ...(lectureCorrectionsList.length > 0
                            ? lectureCorrectionsList.map(
                                (correction) =>
                                  `${this.t("page", { page: correction.page })}: ${correction.text}`,
                              )
                            : [this.t("noCorrectionsYet")]),
                        ].join("\n"),
                      )
                    }
                  >
                    {this.t("send")}
                  </button>
                </div>
                <p id="nogaPlanner_lectureDetailsCorrectionsMeta">
                  {this.t("writerLabel")}: {lecture.lecture_writer || "-"}
                </p>
                {lectureCorrectionsList.length === 0 ? (
                  <p className="nogaPlanner_lectureDetailsCorrectionsEmpty">
                    {this.t("noCorrectionsForLectureYet")}
                  </p>
                ) : (
                  <div
                    id="nogaPlanner_lectureDetailsCorrectionsList"
                    className="fc"
                  >
                    {lectureCorrectionsList.map(
                      (correction, correctionIndex) => (
                        <div
                          key={`${correction.page}-${correctionIndex}`}
                          className="nogaPlanner_lectureDetailsCorrectionItem fc"
                        >
                          <div className="fr nogaPlanner_lectureDetailsCorrectionHeader">
                            <p className="nogaPlanner_lectureDetailsCorrectionPage">
                              {this.t("page", { page: correction.page })}
                            </p>
                            <button
                              type="button"
                              className="nogaPlanner_telegramSendButton"
                              onClick={() =>
                                this.sendPlannerInfoToTelegram(
                                  [
                                    this.t("corrections"),
                                    `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                                    `${this.t("writerLabel")}: ${lecture.lecture_writer || "-"}`,
                                    `${this.t("page", { page: correction.page })}: ${correction.text}`,
                                  ].join("\n"),
                                )
                              }
                            >
                              {this.t("send")}
                            </button>
                          </div>
                          <p className="nogaPlanner_lectureDetailsCorrectionText">
                            {correction.text}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              <div id="nogaPlanner_lectureDetailsPages" className="fc">
                <div id="nogaPlanner_lectureDetailsPagesHeader" className="fr">
                  <p id="nogaPlanner_lectureDetailsPagesLabel">
                    {this.t("toggleFinishedPages")}
                  </p>
                  <div className="fr nogaPlanner_lectureDetailsPagesActions">
                    <button
                      type="button"
                      className="nogaPlanner_telegramSendButton"
                      onClick={() =>
                        this.sendPlannerInfoToTelegram(
                          [
                            this.t("toggleFinishedPages"),
                            `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                            `${this.t("finishedPages")}: ${
                              finishedPages.length > 0
                                ? finishedPages.join(", ")
                                : this.t("none")
                            }`,
                            `${this.t("remainingPages")}: ${progressionStats.remaining}`,
                          ].join("\n"),
                        )
                      }
                    >
                      {this.t("send")}
                    </button>
                    <button
                      type="button"
                      id="nogaPlanner_lectureDetailsPagesToggle"
                      aria-expanded={pagesAreExpanded}
                      aria-label={
                        pagesAreExpanded
                          ? this.t("hideLecturePages")
                          : this.t("showLecturePages")
                      }
                      onClick={this.toggleLectureDetailsPages}
                    >
                      <i
                        className={
                          pagesAreExpanded
                            ? "fi fi-rr-angle-small-up"
                            : "fi fi-rr-angle-small-down"
                        }
                      ></i>
                    </button>
                  </div>
                </div>
                <div
                  id="nogaPlanner_lectureDetailsPagesBody"
                  className={
                    pagesAreExpanded
                      ? "nogaPlanner_lectureDetailsPagesBody--open"
                      : ""
                  }
                >
                  <div id="nogaPlanner_lectureDetailsPagesGrid">
                    {Array.from(
                      { length: Number(lecture.lecture_length) || 0 },
                      (_, pageIndex) => {
                        const pageNumber = pageIndex + 1;
                        const isFinished =
                          finishedPages.indexOf(pageNumber) !== -1;

                        return (
                          <button
                            type="button"
                            key={pageNumber}
                            className={`nogaPlanner_lecturePageButton ${
                              isFinished
                                ? "nogaPlanner_lecturePageButton--finished"
                                : ""
                            }`}
                            disabled={this.state.lecture_isLoading === true}
                            onClick={() =>
                              this.setPageFinishLecture(
                                lecture,
                                pageNumber,
                                !isFinished,
                              )
                            }
                          >
                            {pageNumber}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
              <div id="nogaPlanner_lectureDetailsTelegram" className="fc">
                <div className="fr nogaPlanner_lectureDetailsSectionHeader">
                  <p id="nogaPlanner_lectureDetailsTelegramLabel">
                    {this.t("telegramSummary")}
                  </p>
                  <button
                    type="button"
                    className="nogaPlanner_telegramSendButton"
                    onClick={() =>
                      this.sendPlannerInfoToTelegram(
                        [
                          this.t("telegramSummary"),
                          `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                          `${this.t("matchedTerms")}: ${
                            lectureTelegramSummary.matchedKeywords.length > 0
                              ? lectureTelegramSummary.matchedKeywords.join(
                                  ", ",
                                )
                              : this.t("none")
                          }`,
                          ...(lectureTelegramSummary.relevantMessages.length > 0
                            ? lectureTelegramSummary.relevantMessages.map(
                                (message) =>
                                  `${message.sender || this.t("unknown")} | ${this.formatTelegramDateTime(message.date) || "-"} | ${message.text || this.t("noText")}`,
                              )
                            : [this.t("noLectureTelegramMatchesYet")]),
                        ].join("\n"),
                      )
                    }
                  >
                    {this.t("send")}
                  </button>
                </div>
                {lectureTelegramSummary.relevantMessages.length === 0 ? (
                  <p className="nogaPlanner_lectureDetailsTelegramEmpty">
                    {this.t("noLectureTelegramMatchesYet")}
                  </p>
                ) : (
                  <React.Fragment>
                    <p id="nogaPlanner_lectureDetailsTelegramMeta">
                      {lectureTelegramSummary.matchedKeywords.length > 0
                        ? `${this.t("matchedTerms")}: ${lectureTelegramSummary.matchedKeywords.join(", ")}`
                        : this.t("matchedTermsUnavailable")}
                    </p>
                    {lectureTelegramSummary.latestRelevantMessage ? (
                      <p id="nogaPlanner_lectureDetailsTelegramLatest">
                        {this.t("latestRelatedMessage")}:{" "}
                        {this.formatTelegramDateTime(
                          lectureTelegramSummary.latestRelevantMessage.date,
                        ) || this.t("unknownTime")}
                      </p>
                    ) : null}
                    <div
                      id="nogaPlanner_lectureDetailsTelegramList"
                      className="fc"
                    >
                      {lectureTelegramSummary.relevantMessages.map(
                        (message) => (
                          <div
                            key={
                              message.id || `${message.sender}-${message.date}`
                            }
                            className="nogaPlanner_lectureDetailsTelegramMessage fc"
                          >
                            <div className="fr nogaPlanner_lectureDetailsTelegramMessageMeta">
                              <span>{message.sender || this.t("unknown")}</span>
                              <span>
                                {this.formatTelegramDateTime(message.date)}
                              </span>
                              <button
                                type="button"
                                className="nogaPlanner_telegramSendButton"
                                onClick={() =>
                                  this.sendPlannerInfoToTelegram(
                                    [
                                      this.t("telegramSummary"),
                                      `${this.t("title")}: ${lecture.lecture_name || "-"}`,
                                      `Sender: ${message.sender || this.t("unknown")}`,
                                      `Time: ${this.formatTelegramDateTime(message.date) || "-"}`,
                                      `${message.text || this.t("noText")}`,
                                    ].join("\n"),
                                  )
                                }
                              >
                                {this.t("send")}
                              </button>
                            </div>
                            <p>{message.text || this.t("noText")}</p>
                          </div>
                        ),
                      )}
                    </div>
                  </React.Fragment>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    );
  };

  openAddLectureForm = (object) => {
    document.getElementById("nogaPlanner_addLecture_div").style.display =
      "flex";
    document.getElementById(
      "nogaPlanner_addLecture_addButton_label",
    ).textContent =
      object.buttonName === "Edit" ? this.t("edit") : this.t("add");
    //.........
    if (object.buttonName === "Add") {
      lectureOutlines = [];
      lectureCorrections = [];
      document.getElementById("nogaPlanner_addLecture_name_input").value = "";
      document.getElementById("nogaPlanner_addLecture_course_input").value =
        "Lecture course";
      document.getElementById(
        "nogaPlanner_addLecture_instructorName_input",
      ).value = "Lecture instructor name";
      document.getElementById("nogaPlanner_addLecture_writerName_input").value =
        "";
      document.getElementById("nogaPlanner_addLecture_date_input").value =
        "Lecture date";
      document.getElementById("nogaPlanner_addLecture_length_input").value = "";
      document.getElementById(
        "nogaPlanner_addLecture_correctionPage_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addLecture_correctionText_input",
      ).value = "";
      document.getElementById("nogaPlanner_addLecture_outlines_input").value =
        "";
      document.getElementById(
        "nogaPlanner_addLecture_corrections_ul",
      ).innerHTML = "";
    }
    if (object.buttonName === "Edit") {
      selectedLecture = object._id;
      lectureOutlines = object.lecture_outlines;
      lectureCorrections = normalizeLectureCorrections(
        object.lecture_corrections,
      );
      document.getElementById("nogaPlanner_addLecture_name_input").value =
        object.lecture_name;
      document.getElementById("nogaPlanner_addLecture_course_input").value =
        object.lecture_course;
      document.getElementById(
        "nogaPlanner_addLecture_instructorName_input",
      ).value = object.lecture_instructor;
      document.getElementById("nogaPlanner_addLecture_writerName_input").value =
        object.lecture_writer;
      document.getElementById("nogaPlanner_addLecture_date_input").value =
        object.lecture_date;
      document.getElementById("nogaPlanner_addLecture_length_input").value =
        object.lecture_length;
      document.getElementById(
        "nogaPlanner_addLecture_correctionPage_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addLecture_correctionText_input",
      ).value = "";
      document.getElementById("nogaPlanner_addLecture_outlines_input").value =
        "";

      this.retrieveLectureOutlines();
      this.retrieveLectureCorrections();
    }
  };

  closeAddLectureForm = () => {
    document.getElementById("nogaPlanner_addLecture_div").style.display =
      "none";
  };

  setElementValueById = (elementId, value) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value;
    }
  };

  setElementHtmlById = (elementId, html) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = html;
    }
  };

  openAddCourseForm = (object) => {
    this.setState({ show_addCourseForm: true }, () => {
      const detailsDiv = document.getElementById(
        "nogaPlanner_courses_details_div",
      );
      const actionsMount = document.getElementById(
        "nogaPlanner_courses_actions_mount",
      );

      if (detailsDiv) {
        detailsDiv.classList.remove("nogaPlanner_courses_panel--hidden");
        detailsDiv.scrollTop = 0;
      }

      if (actionsMount) {
        actionsMount.classList.remove("nogaPlanner_courses_panel--hidden");
      }

      const addCourseButtonLabel = document.getElementById(
        "nogaPlanner_addCourse_addButton_label",
      );

      if (addCourseButtonLabel) {
        addCourseButtonLabel.textContent =
          object.buttonName === "Edit" ? this.t("edit") : this.t("add");
      }
      if (object.buttonName === "Add") {
        courseDayAndTime = [];
        courseInstructorsNames = [];
        courseExams = [];
        this.setElementValueById("nogaPlanner_addCourse_name_input", "");
        this.setElementValueById(
          "nogaPlanner_addCourse_component_input",
          "Course component",
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_day_input",
          "Course day",
        );
        this.setElementValueById("nogaPlanner_addCourse_time_hour_input", "");
        this.setElementValueById("nogaPlanner_addCourse_time_minute_input", "");
        this.setElementValueById(
          "nogaPlanner_addCourse_year_input",
          "Course year",
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_term_input",
          "Course term",
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_class_input",
          "Course classification",
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_status_input",
          "Course status",
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_instructorName_input",
          "",
        );
        this.setElementHtmlById(
          "nogaPlanner_addCourse_instructorsNames_ul",
          "",
        );
        this.setElementHtmlById("nogaPlanner_addCourse_dayAndTime_ul", "");
      }
      if (object.buttonName === "Edit") {
        courseDayAndTime = object.course.course_dayAndTime;
        courseInstructorsNames = object.course.course_instructors;
        courseExams =
          object.course.course_exams && object.course.course_exams.length > 0
            ? object.course.course_exams
            : object.course.exam_date ||
                object.course.exam_time ||
                object.course.exam_type ||
                object.course.course_grade ||
                object.course.course_fullGrade
              ? [
                  {
                    exam_type: object.course.exam_type || "-",
                    exam_date: object.course.exam_date || "-",
                    exam_time: object.course.exam_time || "-",
                    course_grade: object.course.course_grade || "",
                    course_fullGrade: object.course.course_fullGrade || "",
                  },
                ]
              : [];
        this.setElementValueById(
          "nogaPlanner_addCourse_name_input",
          object.course.course_name.split(" (")[0],
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_component_input",
          object.course.course_component,
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_day_input",
          "Course day",
        );
        this.setElementValueById("nogaPlanner_addCourse_time_hour_input", "");
        this.setElementValueById("nogaPlanner_addCourse_time_minute_input", "");
        this.setElementHtmlById("nogaPlanner_addCourse_dayAndTime_ul", "");
        this.setElementValueById(
          "nogaPlanner_addCourse_year_input",
          object.course.course_year,
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_term_input",
          object.course.course_term,
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_class_input",
          object.course.course_class,
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_status_input",
          object.course.course_status,
        );
        this.setElementValueById(
          "nogaPlanner_addCourse_instructorName_input",
          "",
        );
        this.setElementHtmlById(
          "nogaPlanner_addCourse_instructorsNames_ul",
          "",
        );
        if (document.getElementById("nogaPlanner_addCourse_dayAndTime_ul")) {
          this.retrieveCourseDayAndTime();
        }
        if (
          document.getElementById("nogaPlanner_addCourse_instructorsNames_ul")
        ) {
          this.retrieveCourseInstructorsNames();
        }
      }
    });
  };

  closeAddCourseForm = () => {
    this.setState({
      show_addCourseForm: false,
    });
  };

  addCourseDayAndTime = (object) => {
    if (object.day && object.time) {
      courseDayAndTime.push({
        day: object.day,
        time: object.time,
      });
      document.getElementById("nogaPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("nogaPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById("nogaPlanner_addCourse_time_minute_input").value =
        "";
      this.retrieveCourseDayAndTime();
    }
  };

  addLectureOutline = () => {
    let outline = document.getElementById(
      "nogaPlanner_addLecture_outlines_input",
    ).value;
    lectureOutlines.push(outline);
    this.retrieveLectureOutlines();
  };

  addLectureCorrection = () => {
    const pageValue = document.getElementById(
      "nogaPlanner_addLecture_correctionPage_input",
    ).value;
    const textValue = document.getElementById(
      "nogaPlanner_addLecture_correctionText_input",
    ).value;
    const nextCorrection = {
      page: Number(pageValue),
      text: String(textValue || "").trim(),
    };

    if (!nextCorrection.page || !nextCorrection.text) {
      return;
    }

    lectureCorrections.push(nextCorrection);
    document.getElementById(
      "nogaPlanner_addLecture_correctionPage_input",
    ).value = "";
    document.getElementById(
      "nogaPlanner_addLecture_correctionText_input",
    ).value = "";
    this.retrieveLectureCorrections();
  };

  addCourseInstructorsNames = () => {
    let instructorName = document.getElementById(
      "nogaPlanner_addCourse_instructorName_input",
    ).value;
    courseInstructorsNames.push(instructorName);
    this.retrieveCourseInstructorsNames();
  };

  addCourseExam = () => {
    const exam_type = document.getElementById(
      "nogaPlanner_addCourse_examType_input",
    ).value;
    const exam_date = buildExamDateValue({
      day: document.getElementById("nogaPlanner_addCourse_examDate_day_input")
        .value,
      month: document.getElementById(
        "nogaPlanner_addCourse_examDate_month_input",
      ).value,
      year: document.getElementById("nogaPlanner_addCourse_examDate_year_input")
        .value,
    });
    const exam_time = buildExamTimeValue({
      hour: document.getElementById("nogaPlanner_addCourse_examTime_hour_input")
        .value,
      minute: document.getElementById(
        "nogaPlanner_addCourse_examTime_minute_input",
      ).value,
    });
    const course_grade = document.getElementById(
      "nogaPlanner_addCourse_grade_input",
    ).value;
    const course_fullGrade = document.getElementById(
      "nogaPlanner_addCourse_fullGrade_input",
    ).value;

    if (exam_type && exam_date && exam_time) {
      courseExams.push({
        exam_type,
        exam_date,
        exam_time,
        course_grade,
        course_fullGrade,
      });
      document.getElementById("nogaPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "nogaPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "nogaPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById("nogaPlanner_addCourse_grade_input").value = "";
      document.getElementById("nogaPlanner_addCourse_fullGrade_input").value =
        "";
      this.retrieveCourseExams();
    }
  };

  retrieveCourseDayAndTime = () => {
    var courseDayAndTime_ul = document.getElementById(
      "nogaPlanner_addCourse_dayAndTime_ul",
    );
    courseDayAndTime_ul.innerHTML = "";
    for (var i = 0; i < courseDayAndTime.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_dayAndTime = document.createElement("div");

      p.textContent = courseDayAndTime[i].day + " " + courseDayAndTime[i].time;

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIdayAndTime");
      div_dayAndTime.setAttribute(
        "class",
        "nogaPlanner_addCourse_dayAndTime_div fr",
      );

      const removeDayAndTimeItem = () => {
        div_dayAndTime.remove();
        courseDayAndTime.splice(parseInt(deleteIcon.id), 1);
      };

      deleteIcon.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      p.addEventListener("click", () => {
        removeDayAndTimeItem();
      });
      div_dayAndTime.append(deleteIcon, p);
      courseDayAndTime_ul.appendChild(div_dayAndTime);
    }
  };

  retrieveLectureOutlines = () => {
    var ul_outlines = document.getElementById(
      "nogaPlanner_addLecture_outlines_ul",
    );
    ul_outlines.innerHTML = "";
    for (var i = 0; i < lectureOutlines.length; i++) {
      let p_lectureOutlines = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_lectureOutlines = document.createElement("div");

      p_lectureOutlines.textContent = lectureOutlines[i];

      div_lectureOutlines.setAttribute(
        "class",
        "nogaPlanner_addCourse_outlines_div fr",
      );
      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIlectureOutlines");
      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        lectureOutlines.splice(parseInt(deleteIcon.id), 1);
      });
      div_lectureOutlines.append(deleteIcon, p_lectureOutlines);
      ul_outlines.append(div_lectureOutlines);
    }
  };

  retrieveLectureCorrections = () => {
    const correctionsUl = document.getElementById(
      "nogaPlanner_addLecture_corrections_ul",
    );

    if (!correctionsUl) {
      return;
    }

    correctionsUl.innerHTML = "";
    lectureCorrections
      .slice()
      .sort((firstCorrection, secondCorrection) => {
        return Number(firstCorrection.page) - Number(secondCorrection.page);
      })
      .forEach((correction, index) => {
        const correctionText = document.createElement("p");
        const deleteIcon = document.createElement("i");
        const correctionItem = document.createElement("div");

        correctionText.textContent = `${this.t("page", {
          page: correction.page,
        })}: ${correction.text}`;
        correctionItem.setAttribute(
          "class",
          "nogaPlanner_addLecture_correctionItem fr",
        );
        deleteIcon.setAttribute("class", "fi fi-rr-x");
        deleteIcon.addEventListener("click", () => {
          lectureCorrections.splice(index, 1);
          this.retrieveLectureCorrections();
        });
        correctionItem.append(deleteIcon, correctionText);
        correctionsUl.append(correctionItem);
      });
  };

  retrieveCourseInstructorsNames = () => {
    let courseInstructorsNames_ul = document.getElementById(
      "nogaPlanner_addCourse_instructorsNames_ul",
    );
    courseInstructorsNames_ul.innerHTML = "";
    for (var i = 0; i < courseInstructorsNames.length; i++) {
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_instructorsNames = document.createElement("div");

      p.textContent = courseInstructorsNames[i];

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      deleteIcon.setAttribute("id", i + "DIinstructorsNames");
      div_instructorsNames.setAttribute(
        "class",
        "nogaPlanner_addCourse_instructorsNames_div fr",
      );

      deleteIcon.addEventListener("click", () => {
        deleteIcon.parentElement.remove();
        courseInstructorsNames.splice(parseInt(deleteIcon.id), 1);
      });
      div_instructorsNames.append(deleteIcon, p);
      courseInstructorsNames_ul.appendChild(div_instructorsNames);
    }
  };

  retrieveCourseExams = () => {
    let courseExams_ul = document.getElementById(
      "nogaPlanner_addCourse_exams_ul",
    );
    courseExams_ul.innerHTML = "";
    for (var i = 0; i < courseExams.length; i++) {
      const examIndex = i;
      let p = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_exam = document.createElement("div");

      p.textContent =
        courseExams[i].exam_type +
        " | " +
        courseExams[i].exam_date +
        " | " +
        courseExams[i].exam_time +
        " | " +
        courseExams[i].course_grade +
        "/" +
        courseExams[i].course_fullGrade;

      deleteIcon.setAttribute("class", "fi fi-rr-x");
      div_exam.setAttribute("class", "nogaPlanner_addCourse_exams_div fr");

      const removeCourseExamItem = () => {
        courseExams.splice(examIndex, 1);
        this.retrieveCourseExams();
      };

      deleteIcon.addEventListener("click", () => {
        removeCourseExamItem();
      });
      p.addEventListener("click", () => {
        removeCourseExamItem();
      });
      div_exam.append(deleteIcon, p);
      courseExams_ul.appendChild(div_exam);
    }
  };

  buildCourseInformationNote = (course, courseRows = []) => {
    return [
      this.t("courseInformation"),
      ...courseRows.map(
        ([labelText, valueText]) => `${labelText}: ${valueText}`,
      ),
    ].join("\n");
  };

  renderCourseActionDock = (
    actionsMount,
    course,
    courseRows = [],
    isIdle = false,
  ) => {
    if (!actionsMount) return;

    actionsMount.innerHTML = "";
    const actionsShell = document.createElement("div");
    const actionsWindow = document.createElement("div");
    const actionRail = document.createElement("div");
    let activeTimerId = null;

    const triggerAction = (actionConfig) => {
      if (
        !actionConfig ||
        (isIdle && !actionConfig.allowWhenIdle) ||
        typeof actionConfig.run !== "function"
      ) {
        return;
      }

      window.clearTimeout(activeTimerId);
      activeTimerId = window.setTimeout(() => {
        actionConfig.run();
      }, 180);
    };

    const courseNote = this.buildCourseInformationNote(course, courseRows);
    const actionItems = [
      {
        key: "add",
        label: this.t("add"),
        iconClass: "fi fi-rr-plus",
        allowWhenIdle: true,
        run: () => {
          this.openAddCourseForm({
            buttonName: this.t("add"),
          });
        },
      },
      {
        key: "delete-all",
        label: this.isArabic() ? "حذف الكل" : "Delete All",
        iconClass: "fi fi-rr-trash",
        allowWhenIdle: true,
        run: () => {
          this.deleteAllCourses();
        },
      },
      {
        key: "edit",
        label: this.t("edit"),
        iconClass: "fi fi-rr-pen-clip",
        run: () => {
          target_editCourse = course._id;
          this.openAddCourseForm({
            buttonName: "Edit",
            course: course,
          });
        },
      },
      {
        key: "plan",
        label: course?.course_partOfPlan
          ? this.isArabic()
            ? "إزالة من الخطة"
            : "Remove from plan"
          : this.isArabic()
            ? "إضافة إلى الخطة"
            : "Add to plan",
        iconClass: "fi fi-rr-layer-plus",
        run: () => {
          target_editCourse = course._id;
          this.partOfPlanCourse(
            course,
            `${course._id}menu_partOfPlan`,
            !course.course_partOfPlan,
          );
        },
      },
      {
        key: "send",
        label: this.isArabic() ? "إرسال إلى تيليجرام" : "Send to Telegram",
        iconClass: "fi fi-rr-paper-plane",
        run: () => {
          this.sendPlannerInfoToTelegram(courseNote);
        },
      },
      {
        key: "ai-update",
        label: this.isArabic() ? "تحديث بالذكاء" : "Update by AI",
        iconClass: "fi fi-rr-sparkles",
        run: () => {
          this.fillCourseDetailsWithTelegramAi(course);
        },
      },
      {
        key: "delete",
        label: this.t("delete"),
        iconClass: "fi fi-rr-trash",
        run: () => {
          this.deleteCourseById(course._id);
        },
      },
    ];
    const orderedActionItems = this.isArabic()
      ? [...actionItems].reverse()
      : actionItems;

    actionsShell.setAttribute("id", "nogaPlanner_courses_actions");
    actionsShell.setAttribute(
      "class",
      `fc${isIdle ? " nogaPlanner_courses_actions--idle" : ""}`,
    );

    actionsWindow.setAttribute("class", "nogaPlanner_courses_actionsWindow");
    this.courseActionsWindowRef.current = actionsWindow;
    actionsWindow.addEventListener("pointerdown", this.startCourseActionsDrag);
    actionsWindow.addEventListener("pointermove", this.moveCourseActionsDrag);
    actionsWindow.addEventListener("pointerup", this.stopCourseActionsDrag);
    actionsWindow.addEventListener("pointercancel", this.stopCourseActionsDrag);
    actionsWindow.addEventListener("pointerleave", this.stopCourseActionsDrag);
    actionsWindow.addEventListener("scroll", this.queueCourseActionsSnap, {
      passive: true,
    });

    actionRail.setAttribute("id", "nogaPlanner_courses_actionRail");
    actionRail.setAttribute("class", "fr");

    orderedActionItems.forEach((actionConfig) => {
      const actionButton = document.createElement("button");
      const actionText = document.createElement("span");

      actionButton.type = "button";
      actionButton.draggable = !isIdle;
      actionButton.disabled = isIdle && !actionConfig.allowWhenIdle;
      actionButton.tabIndex = isIdle && !actionConfig.allowWhenIdle ? -1 : 0;
      actionButton.setAttribute(
        "aria-disabled",
        isIdle && !actionConfig.allowWhenIdle ? "true" : "false",
      );
      actionButton.dataset.actionKey = actionConfig.key;
      actionButton.setAttribute("class", "nogaPlanner_courses_actionChip fr");
      actionButton.addEventListener("dragstart", (event) => {
        if (isIdle) return;
        event.dataTransfer.setData("text/plain", actionConfig.key);
        actionButton.classList.add("nogaPlanner_courses_actionChip--dragging");
      });
      actionButton.addEventListener("dragend", () => {
        actionButton.classList.remove(
          "nogaPlanner_courses_actionChip--dragging",
        );
      });
      actionButton.addEventListener("click", () => {
        triggerAction(actionConfig);
      });

      actionText.textContent = actionConfig.label;
      actionButton.append(actionText);
      actionRail.appendChild(actionButton);
    });

    actionsWindow.append(actionRail);
    actionsShell.append(actionsWindow);
    actionsMount.append(actionsShell);
    window.requestAnimationFrame(() => {
      this.alignActionsWindowToLocale(
        actionsWindow,
        this.snapCourseActionsToNearest,
      );
    });
  };

  renderCourseDetailsCard = (course) => {
    let detailsDiv = document.getElementById("nogaPlanner_courses_details_div");
    let actionsMount = document.getElementById(
      "nogaPlanner_courses_actions_mount",
    );
    if (!detailsDiv) return;

    detailsDiv.innerHTML = "";
    if (actionsMount) actionsMount.innerHTML = "";

    if (!course) {
      this.hideCourseDetailsPanels();
      return;
    }

    const courseProgressStats = getProgressStats(
      course.course_progress,
      course.course_length,
    );
    const isAiDraftActive =
      this.state.telegram_courseAiDraftCourseId === String(course?._id || "") &&
      Boolean(this.state.telegram_courseAiDraftPayload);
    const draftPayload = isAiDraftActive
      ? this.state.telegram_courseAiDraftPayload
      : null;
    const courseInformationRows = [
      {
        label: this.t("courseName"),
        field: "course_name",
        value: draftPayload?.course_name ?? (course.course_name || "-"),
      },
      {
        label: this.t("courseTime"),
        field: "course_dayAndTime",
        value:
          draftPayload?.course_dayAndTime ??
          formatCourseScheduleDisplay(course.course_dayAndTime),
      },
      {
        label: this.t("courseYear"),
        field: "course_year",
        value: draftPayload?.course_year ?? (course.course_year || "-"),
      },
      {
        label: this.t("courseTerm"),
        field: "course_term",
        value: draftPayload?.course_term ?? (course.course_term || "-"),
      },
      {
        label: this.t("courseClass"),
        field: "course_class",
        value: draftPayload?.course_class ?? (course.course_class || "-"),
      },
      {
        label: this.t("courseStatus"),
        field: "course_status",
        value: draftPayload?.course_status ?? (course.course_status || "-"),
      },
      {
        label: this.t("courseInstructors"),
        field: "course_instructors",
        value:
          draftPayload?.course_instructors ??
          formatCourseStringListDisplay(course.course_instructors),
      },
      {
        label: this.t("actualGrade"),
        field: "course_grade",
        value: draftPayload?.course_grade ?? (course.course_grade || ""),
      },
      {
        label: this.t("fullGrade"),
        field: "course_fullGrade",
        value:
          draftPayload?.course_fullGrade ?? (course.course_fullGrade || ""),
      },
      {
        label: this.t("courseLength"),
        field: "course_length",
        value:
          draftPayload?.course_length ??
          String(Number(course.course_length || 0)),
      },
      {
        label: this.t("courseProgress"),
        field: "course_progress",
        value:
          draftPayload?.course_progress ??
          String(Number(course.course_progress || 0)),
      },
    ];
    const courseRows = [
      [this.t("courseName"), course.course_name || "-"],
      [
        this.t("courseTime"),
        formatCourseScheduleDisplay(course.course_dayAndTime),
      ],
      [
        this.t("courseYearTerm"),
        `${course.course_term || "-"} ${course.course_year || "-"}`.trim(),
      ],
      [this.t("courseClass"), course.course_class || "-"],
      [this.t("courseStatus"), course.course_status || "-"],
      [
        this.t("courseInstructors"),
        formatCourseStringListDisplay(course.course_instructors),
      ],
      [
        this.t("actualGrade"),
        `${course.course_grade || "-"} / ${course.course_fullGrade || "-"}`,
      ],
      [
        this.t("coursePages"),
        `${courseProgressStats.progress}/${courseProgressStats.length} (${courseProgressStats.percent}%)`,
      ],
      [
        this.t("targetPagesPerDay"),
        String(
          getSafePagesPerDay(
            course.course_length,
            course.course_progress,
            Math.floor((new Date(course.exam_date) - todayDate) / 86400000),
          ),
        ),
      ],
    ];
    const examEntries =
      isAiDraftActive && Array.isArray(draftPayload?.course_exams)
        ? draftPayload.course_exams
        : course.course_exams && course.course_exams.length > 0
          ? course.course_exams
          : course.exam_date || course.exam_time || course.exam_type
            ? [
                {
                  exam_type: course.exam_type || "-",
                  exam_date: course.exam_date || "-",
                  exam_time: course.exam_time || "-",
                  course_grade: course.course_grade || "-",
                  course_fullGrade: course.course_fullGrade || "-",
                },
              ]
            : [];

    this.renderCourseActionDock(actionsMount, course, courseRows);

    let courseSectionTitle = document.createElement("h3");
    courseSectionTitle.setAttribute(
      "class",
      "nogaPlanner_courses_sectionTitle",
    );
    courseSectionTitle.textContent = this.t("courseInformation");
    detailsDiv.appendChild(courseSectionTitle);

    let sendButton = document.createElement("button");
    sendButton.type = "button";
    sendButton.textContent = this.t("send");
    sendButton.setAttribute("class", "nogaPlanner_telegramSendButton");
    sendButton.addEventListener("click", () => {
      this.sendPlannerInfoToTelegram(
        this.buildCourseInformationNote(course, courseRows),
      );
    });
    detailsDiv.appendChild(sendButton);

    if (
      this.state.telegram_courseAiStatusCourseId ===
        String(course?._id || "") &&
      this.state.telegram_courseAiStatusMessage
    ) {
      let aiStatusMessage = document.createElement("p");
      aiStatusMessage.setAttribute(
        "class",
        "nogaPlanner_courseAiStatus nogaPlanner_courseAiStatus--success",
      );
      aiStatusMessage.textContent = this.state.telegram_courseAiStatusMessage;
      detailsDiv.appendChild(aiStatusMessage);
    }

    if (
      this.state.telegram_courseAiStatusCourseId ===
        String(course?._id || "") &&
      this.state.telegram_courseAiStatusError
    ) {
      let aiStatusError = document.createElement("p");
      aiStatusError.setAttribute(
        "class",
        "nogaPlanner_courseAiStatus nogaPlanner_courseAiStatus--error",
      );
      aiStatusError.textContent = this.state.telegram_courseAiStatusError;
      detailsDiv.appendChild(aiStatusError);
    }

    if (isAiDraftActive) {
      let aiDraftActions = document.createElement("div");
      aiDraftActions.setAttribute(
        "class",
        "fr nogaPlanner_courseAiDraftActions",
      );

      let saveDraftButton = document.createElement("button");
      saveDraftButton.type = "button";
      saveDraftButton.setAttribute(
        "class",
        "nogaPlanner_telegramSendButton nogaPlanner_courseAiDraftButton",
      );
      saveDraftButton.disabled = Boolean(
        this.state.telegram_courseAiDraftSaving,
      );
      saveDraftButton.textContent = this.state.telegram_courseAiDraftSaving
        ? this.t("saving")
        : this.t("save");
      saveDraftButton.addEventListener("click", () => {
        this.saveCourseAiDraft(course);
      });

      let cancelDraftButton = document.createElement("button");
      cancelDraftButton.type = "button";
      cancelDraftButton.setAttribute(
        "class",
        "nogaPlanner_telegramSendButton nogaPlanner_courseAiDraftButton nogaPlanner_courseAiDraftButton--secondary",
      );
      cancelDraftButton.disabled = Boolean(
        this.state.telegram_courseAiDraftSaving,
      );
      cancelDraftButton.textContent = this.t("close");
      cancelDraftButton.addEventListener("click", () => {
        this.clearCourseAiDraft(String(course?._id || ""));
      });

      aiDraftActions.append(saveDraftButton, cancelDraftButton);
      detailsDiv.appendChild(aiDraftActions);
    }

    courseInformationRows.forEach((rowConfig) => {
      let row = document.createElement("div");
      row.setAttribute("class", "nogaPlanner_courseDetail_row");

      let label = document.createElement("p");
      label.textContent = rowConfig.label;

      let value = isAiDraftActive
        ? document.createElement("input")
        : document.createElement("p");

      if (isAiDraftActive) {
        value.type = "text";
        value.value = String(rowConfig.value || "");
        value.setAttribute("class", "nogaPlanner_courseDetail_input");
        value.addEventListener("input", (event) => {
          this.updateCourseAiDraftField(
            String(course?._id || ""),
            rowConfig.field,
            event.target.value,
          );
        });
      } else {
        value.textContent = String(rowConfig.value || "-");
      }

      row.append(label, value);
      detailsDiv.appendChild(row);
    });

    let examSectionTitle = document.createElement("h3");
    examSectionTitle.setAttribute("class", "nogaPlanner_courses_sectionTitle");
    examSectionTitle.textContent = this.t("examInformation");
    detailsDiv.appendChild(examSectionTitle);

    let examBlock = document.createElement("div");
    examBlock.setAttribute("id", "nogaPlanner_courses_examBlock");

    if (examEntries.length === 0) {
      let emptyExamState = document.createElement("p");
      emptyExamState.setAttribute("id", "nogaPlanner_courses_examEmpty");
      emptyExamState.textContent = this.t("noExamEntries");
      examBlock.appendChild(emptyExamState);
    } else {
      let examList = document.createElement("ul");
      examList.setAttribute("id", "nogaPlanner_courses_exam_ul");

      examEntries.forEach((examEntry, examIndex) => {
        let examItem = document.createElement("li");
        examItem.setAttribute("class", "nogaPlanner_courses_exam_li");

        const examRows = [
          [this.t("examType"), examEntry.exam_type || "-", "exam_type"],
          [this.t("examDate"), examEntry.exam_date || "-", "exam_date"],
          [this.t("examTime"), examEntry.exam_time || "-", "exam_time"],
          [this.t("grades"), examEntry.course_grade || "", "course_grade"],
          [
            this.t("fullGrade"),
            examEntry.course_fullGrade || "",
            "course_fullGrade",
          ],
        ];

        examRows.forEach(([labelText, valueText, fieldName]) => {
          let row = document.createElement("div");
          row.setAttribute(
            "class",
            "nogaPlanner_courseDetail_row nogaPlanner_courseDetail_row_exam",
          );

          let label = document.createElement("p");
          label.textContent = labelText;

          let value = isAiDraftActive
            ? document.createElement("input")
            : document.createElement("p");

          if (isAiDraftActive) {
            value.type = "text";
            value.value = String(valueText || "");
            value.setAttribute("class", "nogaPlanner_courseDetail_input");
            value.addEventListener("input", (event) => {
              this.updateCourseAiDraftExamField(
                String(course?._id || ""),
                examIndex,
                fieldName,
                event.target.value,
              );
            });
          } else {
            value.textContent = valueText;
          }

          row.append(label, value);
          examItem.appendChild(row);
        });

        examList.appendChild(examItem);
      });

      examBlock.appendChild(examList);
    }

    detailsDiv.appendChild(examBlock);

    if (
      String(this.props.state?.username || "").toLowerCase() === "naghamtrkmani"
    ) {
      const assignedLetter = this.getNaghamCourseLetter(course);

      if (assignedLetter) {
        let noteBlock = document.createElement("div");
        noteBlock.setAttribute("class", "nogaPlanner_courseLetterBlock");

        let noteText = document.createElement("p");
        noteText.setAttribute("class", "nogaPlanner_courseLetterText");
        noteText.textContent = assignedLetter;

        noteBlock.appendChild(noteText);
        detailsDiv.appendChild(noteBlock);
      }
    }

    this.playCourseDetailsPrintAnimation();
  };

  fetchTelegramGroups = async () => {
    if (!this.props.state?.token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/groups"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to load Telegram groups.",
        );
      }

      if (this.isComponentMounted) {
        const nextOptions = Array.isArray(payload?.groups)
          ? payload.groups
          : [];
        this.setState((currentState) => {
          const fallbackStoredOptions = Array.isArray(
            currentState.telegram_storedGroupOptions,
          )
            ? currentState.telegram_storedGroupOptions
            : [];
          const resolvedOptions =
            nextOptions.length > 0 ? nextOptions : fallbackStoredOptions;
          const currentInputReference = String(
            currentState.telegram_groupInput || "",
          ).trim();
          const matchingInputOption = resolvedOptions.find(
            (group) =>
              String(group?.groupReference || "").trim() ===
              currentInputReference,
          );
          const inputFallbackOption =
            matchingInputOption || resolvedOptions[0] || null;

          return {
            telegram_groupOptions: resolvedOptions,
            telegram_groupInput: inputFallbackOption
              ? String(
                  inputFallbackOption.groupReference ||
                    currentState.telegram_groupInput,
                )
              : currentState.telegram_groupInput,
          };
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState((currentState) => {
          const fallbackStoredOptions = Array.isArray(
            currentState.telegram_storedGroupOptions,
          )
            ? currentState.telegram_storedGroupOptions
            : [];
          const currentInputReference = String(
            currentState.telegram_groupInput || "",
          ).trim();
          const matchingInputOption = fallbackStoredOptions.find(
            (group) =>
              String(group?.groupReference || "").trim() ===
              currentInputReference,
          );
          const inputFallbackOption =
            matchingInputOption || fallbackStoredOptions[0] || null;

          return {
            telegram_groupOptions:
              fallbackStoredOptions.length > 0
                ? fallbackStoredOptions
                : currentState.telegram_groupOptions,
            telegram_groupInput: inputFallbackOption
              ? String(
                  inputFallbackOption.groupReference ||
                    currentState.telegram_groupInput,
                )
              : currentState.telegram_groupInput,
            telegram_error:
              fallbackStoredOptions.length > 0
                ? ""
                : error?.message || "Unable to load Telegram groups.",
          };
        });
      }
    }
  };

  fetchStoredTelegramGroups = async () => {
    if (!this.props.state?.token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/stored-groups"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load stored Telegram groups.",
        );
      }

      if (this.isComponentMounted) {
        const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
        let shouldFetchPanelMessages = false;
        this.setState(
          (currentState) => {
            const hasCurrentPanelGroup = nextGroups.some(
              (group) =>
                String(group?.groupReference || "").trim() ===
                String(currentState.telegram_panelGroupReference || "").trim(),
            );
            const fallbackPanelGroup =
              hasCurrentPanelGroup ||
              String(currentState.telegram_panelGroupReference || "").trim()
                ? null
                : nextGroups[0] || null;

            shouldFetchPanelMessages = Boolean(fallbackPanelGroup);

            return {
              telegram_storedGroupOptions: nextGroups,
              telegram_panelGroupReference: fallbackPanelGroup
                ? String(fallbackPanelGroup.groupReference || "")
                : currentState.telegram_panelGroupReference,
              telegram_panelGroupTitle: fallbackPanelGroup
                ? String(
                    fallbackPanelGroup.title ||
                      fallbackPanelGroup.username ||
                      fallbackPanelGroup.groupReference ||
                      currentState.telegram_panelGroupTitle,
                  )
                : currentState.telegram_panelGroupTitle,
            };
          },
          () => {
            if (shouldFetchPanelMessages) {
              this.fetchTelegramGroupMessages();
            }
          },
        );
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_storedGroupOptions: [],
          telegram_panelGroupReference: "",
          telegram_panelGroupTitle: "Telegram Group",
          telegram_error: "",
        });
      }
    }
  };

  updateTelegramPanelGroup = (event) => {
    const nextReference = String(event.target.value || "").trim();
    const matchingGroup = this.getStoredTelegramGroupOptions().find(
      (group) => String(group?.groupReference || "").trim() === nextReference,
    );

    this.setState(
      {
        telegram_panelGroupReference: nextReference,
        telegram_panelGroupTitle: matchingGroup
          ? String(
              matchingGroup.title ||
                matchingGroup.username ||
                matchingGroup.groupReference ||
                this.state.telegram_panelGroupTitle,
            )
          : this.state.telegram_panelGroupTitle,
        telegram_courseSuggestions: [],
        telegram_courseSuggestionsPanelLoading: false,
        telegram_courseSuggestionsError: "",
        telegram_courseSuggestionsFeedback: "",
        telegram_courseSuggestionsProgressSteps: [],
        telegram_courseSuggestionsVisible: false,
        telegram_courseSuggestionsLiveStatus: "",
        telegram_selectedSuggestionPdfId: 0,
        telegram_selectedSuggestionPdfTitle: "",
      },
      () => {
        this.fetchTelegramGroupMessages();
      },
    );
  };

  stopTelegramCourseSuggestionStatusPolling = () => {
    if (this.telegramCourseSuggestionStatusTimeout) {
      clearTimeout(this.telegramCourseSuggestionStatusTimeout);
      this.telegramCourseSuggestionStatusTimeout = null;
    }
  };

  sortTelegramCourseSuggestionsByConfidence = (suggestions = []) =>
    (Array.isArray(suggestions) ? [...suggestions] : []).sort(
      (left, right) =>
        Math.max(0, Number(right?.confidence || 0)) -
        Math.max(0, Number(left?.confidence || 0)),
    );

  getSuggestionCoursePayloadForApproval = (suggestion) => {
    const preferredPayload = this.isArabic()
      ? suggestion?.courseArabic
      : suggestion?.courseEnglish;
    const fallbackPayload = this.isArabic()
      ? suggestion?.courseEnglish
      : suggestion?.courseArabic;

    if (preferredPayload?.course_name) {
      return preferredPayload;
    }

    if (fallbackPayload?.course_name) {
      return fallbackPayload;
    }

    return suggestion?.coursePayload || {};
  };

  startCourseActionsDrag = (event) => {
    const actionRail = this.courseActionsWindowRef.current;

    if (!actionRail) {
      return;
    }

    this.courseActionsPointerState = {
      pointerId: event.pointerId,
      startClientX: Number(event.clientX || 0),
      startScrollLeft: actionRail.scrollLeft,
    };

    if (this.courseActionsSnapTimeout) {
      clearTimeout(this.courseActionsSnapTimeout);
      this.courseActionsSnapTimeout = null;
    }

    actionRail.classList.add("nogaPlanner_actionsRail--dragging");
    if (actionRail.setPointerCapture) {
      actionRail.setPointerCapture(event.pointerId);
    }
  };

  moveCourseActionsDrag = (event) => {
    const actionRail = this.courseActionsWindowRef.current;
    const pointerState = this.courseActionsPointerState;

    if (!actionRail || !pointerState) {
      return;
    }

    const deltaX = Number(event.clientX || 0) - pointerState.startClientX;
    actionRail.scrollLeft = pointerState.startScrollLeft - deltaX;
  };

  stopCourseActionsDrag = (event) => {
    const actionRail = this.courseActionsWindowRef.current;

    if (!actionRail) {
      this.courseActionsPointerState = null;
      return;
    }

    if (
      this.courseActionsPointerState &&
      actionRail.releasePointerCapture &&
      typeof event?.pointerId !== "undefined"
    ) {
      try {
        actionRail.releasePointerCapture(event.pointerId);
      } catch {}
    }

    actionRail.classList.remove("nogaPlanner_actionsRail--dragging");
    this.courseActionsPointerState = null;
    this.queueCourseActionsSnap();
  };

  snapCourseActionsToNearest = (behavior = "smooth") => {
    const actionsWindow = this.courseActionsWindowRef.current;

    if (!actionsWindow) {
      return;
    }

    const actionButtons = Array.from(
      actionsWindow.querySelectorAll(".nogaPlanner_courses_actionChip"),
    );

    if (actionButtons.length === 0) {
      return;
    }

    const windowRect = actionsWindow.getBoundingClientRect();
    const windowCenter = windowRect.left + windowRect.width / 2;
    let nearestButton = actionButtons[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    actionButtons.forEach((button) => {
      const buttonRect = button.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const distance = Math.abs(buttonCenter - windowCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestButton = button;
      }
    });

    const buttonRect = nearestButton.getBoundingClientRect();
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const targetLeft = actionsWindow.scrollLeft + (buttonCenter - windowCenter);

    actionsWindow.scrollTo({
      left: Math.max(0, targetLeft),
      behavior,
    });
  };

  queueCourseActionsSnap = () => {
    if (this.courseActionsPointerState) {
      return;
    }

    if (this.courseActionsSnapTimeout) {
      clearTimeout(this.courseActionsSnapTimeout);
    }

    this.courseActionsSnapTimeout = setTimeout(() => {
      this.courseActionsSnapTimeout = null;
      this.snapCourseActionsToNearest("smooth");
    }, 120);
  };

  startLectureActionsDrag = (event) => {
    const actionsWindow = this.lectureActionsWindowRef.current;

    if (!actionsWindow) {
      return;
    }

    this.lectureActionsPointerState = {
      pointerId: event.pointerId,
      startClientX: Number(event.clientX || 0),
      startScrollLeft: actionsWindow.scrollLeft,
    };
    if (this.lectureActionsSnapTimeout) {
      clearTimeout(this.lectureActionsSnapTimeout);
      this.lectureActionsSnapTimeout = null;
    }

    actionsWindow.classList.add("nogaPlanner_lectures_actionsWindow--dragging");
    if (actionsWindow.setPointerCapture) {
      actionsWindow.setPointerCapture(event.pointerId);
    }
  };

  moveLectureActionsDrag = (event) => {
    const actionsWindow = this.lectureActionsWindowRef.current;
    const pointerState = this.lectureActionsPointerState;

    if (!actionsWindow || !pointerState) {
      return;
    }

    const deltaX = Number(event.clientX || 0) - pointerState.startClientX;
    actionsWindow.scrollLeft = pointerState.startScrollLeft - deltaX;
  };

  snapLectureActionsToNearest = (behavior = "smooth") => {
    const actionsWindow = this.lectureActionsWindowRef.current;

    if (!actionsWindow) {
      return;
    }

    const actionButtons = Array.from(
      actionsWindow.querySelectorAll(".nogaPlanner_courses_actionChip"),
    );

    if (actionButtons.length === 0) {
      return;
    }

    const windowRect = actionsWindow.getBoundingClientRect();
    const windowCenter = windowRect.left + windowRect.width / 2;
    let nearestButton = actionButtons[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    actionButtons.forEach((button) => {
      const buttonRect = button.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const distance = Math.abs(buttonCenter - windowCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestButton = button;
      }
    });

    const buttonRect = nearestButton.getBoundingClientRect();
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const targetLeft = actionsWindow.scrollLeft + (buttonCenter - windowCenter);

    actionsWindow.scrollTo({
      left: Math.max(0, targetLeft),
      behavior,
    });
  };

  queueLectureActionsSnap = () => {
    if (this.lectureActionsPointerState) {
      return;
    }

    if (this.lectureActionsSnapTimeout) {
      clearTimeout(this.lectureActionsSnapTimeout);
    }

    this.lectureActionsSnapTimeout = setTimeout(() => {
      this.lectureActionsSnapTimeout = null;
      this.snapLectureActionsToNearest("smooth");
    }, 120);
  };

  stopLectureActionsDrag = (event) => {
    const actionsWindow = this.lectureActionsWindowRef.current;

    if (!actionsWindow) {
      this.lectureActionsPointerState = null;
      return;
    }

    if (
      this.lectureActionsPointerState &&
      actionsWindow.releasePointerCapture &&
      typeof event?.pointerId !== "undefined"
    ) {
      try {
        actionsWindow.releasePointerCapture(event.pointerId);
      } catch {}
    }

    actionsWindow.classList.remove(
      "nogaPlanner_lectures_actionsWindow--dragging",
    );
    this.lectureActionsPointerState = null;
    this.queueLectureActionsSnap();
  };

  updateCourseAiDraftField = (courseId, fieldName, value) => {
    this.setState(
      (currentState) => {
        if (
          currentState.telegram_courseAiDraftCourseId !== courseId ||
          !currentState.telegram_courseAiDraftPayload
        ) {
          return null;
        }

        return {
          telegram_courseAiDraftPayload: {
            ...currentState.telegram_courseAiDraftPayload,
            [fieldName]: value,
          },
        };
      },
      () => {
        const selectedCourse = (this.state.courses || []).find(
          (entry) => String(entry?._id || "") === String(courseId || ""),
        );
        if (selectedCourse) {
          this.renderCourseDetailsCard(selectedCourse);
        }
      },
    );
  };

  updateCourseAiDraftExamField = (courseId, examIndex, fieldName, value) => {
    this.setState(
      (currentState) => {
        if (
          currentState.telegram_courseAiDraftCourseId !== courseId ||
          !currentState.telegram_courseAiDraftPayload
        ) {
          return null;
        }

        const nextExamEntries = (
          Array.isArray(currentState.telegram_courseAiDraftPayload.course_exams)
            ? currentState.telegram_courseAiDraftPayload.course_exams
            : []
        ).map((examEntry, currentExamIndex) =>
          currentExamIndex === examIndex
            ? {
                ...examEntry,
                [fieldName]: value,
              }
            : examEntry,
        );

        return {
          telegram_courseAiDraftPayload: {
            ...currentState.telegram_courseAiDraftPayload,
            course_exams: nextExamEntries,
          },
        };
      },
      () => {
        const selectedCourse = (this.state.courses || []).find(
          (entry) => String(entry?._id || "") === String(courseId || ""),
        );
        if (selectedCourse) {
          this.renderCourseDetailsCard(selectedCourse);
        }
      },
    );
  };

  clearCourseAiDraft = (courseId = "") => {
    this.setState(
      {
        telegram_courseAiDraftCourseId: "",
        telegram_courseAiDraftPayload: null,
        telegram_courseAiDraftSaving: false,
      },
      () => {
        const selectedCourse = (this.state.courses || []).find(
          (entry) => String(entry?._id || "") === String(courseId || ""),
        );
        if (selectedCourse) {
          this.renderCourseDetailsCard(selectedCourse);
        }
      },
    );
  };

  saveCourseAiDraft = async (course) => {
    const courseId = String(course?._id || "").trim();
    const draftPayload = this.state.telegram_courseAiDraftPayload;

    if (
      !this.props.state?.token ||
      !this.props.state?.my_id ||
      !courseId ||
      this.state.telegram_courseAiDraftCourseId !== courseId ||
      !draftPayload
    ) {
      return;
    }

    this.setState({
      telegram_courseAiDraftSaving: true,
      telegram_courseAiStatusCourseId: courseId,
      telegram_courseAiStatusError: "",
      telegram_courseAiStatusMessage: this.isArabic()
        ? "جارٍ حفظ تحديثات الذكاء..."
        : "Saving AI updates...",
    });

    try {
      const nextCoursePayload = buildCoursePayloadFromDraft(
        draftPayload,
        course,
      );
      const response = await fetch(
        `${apiUrl("/api/user/editCourse/")}${this.props.state.my_id}/${courseId}`,
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextCoursePayload),
        },
      );

      if (!response.ok && response.status !== 201) {
        throw new Error("Unable to save the AI-updated course.");
      }

      this.setState({
        telegram_courseAiDraftCourseId: "",
        telegram_courseAiDraftPayload: null,
        telegram_courseAiDraftSaving: false,
        telegram_courseAiStatusCourseId: courseId,
        telegram_courseAiStatusMessage: this.isArabic()
          ? "تم حفظ تحديثات الذكاء في المقرر."
          : "AI updates were saved to the course.",
        telegram_courseAiStatusError: "",
      });

      this.retrieveLectures();
      this.retrieveCourses(courseId);
    } catch (error) {
      this.setState({
        telegram_courseAiDraftSaving: false,
        telegram_courseAiStatusCourseId: courseId,
        telegram_courseAiStatusMessage: "",
        telegram_courseAiStatusError:
          error?.message || "Unable to save the AI-updated course.",
      });
    }
  };

  fillCourseDetailsWithTelegramAi = async (course) => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const groupTitle = String(this.state.telegram_panelGroupTitle || "").trim();
    const sourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const sourceAttachmentFileName = String(
      this.state.telegram_selectedSuggestionPdfTitle || "",
    ).trim();
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const courseId = String(course?._id || "").trim();
    const courseName = String(course?.course_name || "").trim();

    if (!this.props.state?.token || !this.props.state?.my_id || !courseId) {
      return;
    }

    if (!groupReference || !courseName) {
      this.setState({
        telegram_courseAiStatusCourseId: courseId,
        telegram_courseAiStatusMessage: "",
        telegram_courseAiStatusError: this.isArabic()
          ? "احفظ أو اختر مجموعة تيليجرام واسم مقرر أولاً."
          : "Select a Telegram group and a course name first.",
      });
      return;
    }

    this.setState({
      telegram_courseAiLoadingCourseId: courseId,
      telegram_courseAiStatusCourseId: courseId,
      telegram_courseAiStatusMessage: this.isArabic()
        ? "جارٍ البحث عن تفاصيل المقرر من رسائل تيليجرام..."
        : "Searching Telegram evidence for the remaining course details...",
      telegram_courseAiStatusError: "",
    });

    try {
      const response = await fetch(apiUrl("/api/telegram/ai/course-details"), {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupReference,
          groupTitle,
          ...(sourceMessageId
            ? {
                sourceMessageId,
                sourceAttachmentFileName,
              }
            : {}),
          courseName,
          coursePayload: course,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to search Telegram for course details.",
        );
      }

      const mergedCoursePayload = mergeCoursePayloadWithAiResult(
        course,
        payload?.coursePayload || {},
      );
      this.setState(
        {
          telegram_courseAiLoadingCourseId: "",
          telegram_courseAiStatusCourseId: courseId,
          telegram_courseAiDraftCourseId: courseId,
          telegram_courseAiDraftPayload:
            getEditableCourseDraft(mergedCoursePayload),
          telegram_courseAiStatusMessage: this.isArabic()
            ? "تم تجهيز نتائج الذكاء داخل حقول قابلة للتعديل. راجعها ثم احفظها."
            : "AI results are ready in editable inputs. Review them, then save.",
          telegram_courseAiStatusError: "",
        },
        () => {
          this.renderCourseDetailsCard(course);
        },
      );
    } catch (error) {
      this.setState({
        telegram_courseAiLoadingCourseId: "",
        telegram_courseAiStatusCourseId: courseId,
        telegram_courseAiStatusMessage: "",
        telegram_courseAiStatusError:
          error?.message || "Unable to search Telegram for course details.",
      });
    }
  };

  selectTelegramPdfForSuggestions = (message) => {
    const selectedPdfId = Number(message?.id || 0);
    const selectedPdfTitle = String(
      message?.attachmentFileName || message?.text || "",
    ).trim();

    if (!selectedPdfId) {
      return;
    }

    this.setState(
      {
        telegram_selectedSuggestionPdfId: selectedPdfId,
        telegram_selectedSuggestionPdfTitle: selectedPdfTitle,
        telegram_courseSuggestions: [],
        telegram_courseSuggestionsError: "",
        telegram_courseSuggestionsFeedback: "",
        telegram_courseSuggestionsVisible: true,
      },
      () => {
        this.openTelegramCourseSuggestions();
      },
    );
  };

  pollTelegramCourseSuggestionStatus = () => {
    this.stopTelegramCourseSuggestionStatusPolling();

    const runPoll = async () => {
      if (
        !this.isComponentMounted ||
        !this.state.telegram_courseSuggestionsLoading
      ) {
        this.stopTelegramCourseSuggestionStatusPolling();
        return;
      }

      try {
        const response = await fetch(
          apiUrl("/api/telegram/ai/course-suggestions/status"),
          {
            method: "GET",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${this.props.state.token}`,
            },
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (response.ok) {
          const liveMessage = String(payload?.status?.message || "").trim();

          if (liveMessage) {
            this.setState({
              telegram_courseSuggestionsLiveStatus: liveMessage,
            });
          }

          if (!payload?.status?.active) {
            this.stopTelegramCourseSuggestionStatusPolling();
            return;
          }
        }
      } catch {}

      if (
        this.isComponentMounted &&
        this.state.telegram_courseSuggestionsLoading
      ) {
        this.telegramCourseSuggestionStatusTimeout = setTimeout(runPoll, 900);
      }
    };

    this.telegramCourseSuggestionStatusTimeout = setTimeout(runPoll, 200);
  };

  fetchTelegramCourseSuggestions = async (mode = "ai") => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const groupTitle = String(this.state.telegram_panelGroupTitle || "").trim();
    const selectedSourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const allGroups = !searchSelectedPdfs;
    const sourceMessageId = searchSelectedPdfs ? selectedSourceMessageId : 0;
    const sourceAttachmentFileName = String(
      this.state.telegram_selectedSuggestionPdfTitle || "",
    ).trim();
    if (
      !this.props.state?.token ||
      !groupReference ||
      this.telegramCourseSuggestionsRequestInFlight
    ) {
      return;
    }

    const appendSuggestions = mode === "more";

    this.telegramCourseSuggestionsRequestInFlight = true;

    this.setState({
      telegram_courseSuggestionsVisible: true,
      telegram_courseSuggestionsLoading: true,
      telegram_courseSuggestionsLoadingMode: appendSuggestions ? "more" : "ai",
      telegram_courseSuggestionsView: "saved",
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsFeedback: appendSuggestions
        ? "Requesting more AI course name predictions..."
        : "Generating AI course name predictions...",
      telegram_courseSuggestionsProgressSteps: [],
      telegram_courseSuggestionsLiveStatus: "",
    });
    this.pollTelegramCourseSuggestionStatus();

    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/course-suggestions"),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupReference,
            groupTitle,
            appendSuggestions,
            searchSelectedPdfs,
            allGroups,
            ...(searchSelectedPdfs && sourceMessageId
              ? {
                  sourceMessageId,
                  sourceAttachmentFileName,
                }
              : {}),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to generate course name predictions.",
        );
      }

      this.stopTelegramCourseSuggestionStatusPolling();
      this.telegramCourseSuggestionsRequestInFlight = false;

      if (this.isComponentMounted) {
        const analyzedMessagesCount = Number(
          payload?.analyzedMessagesCount || 0,
        );
        const searchedKeys = Array.isArray(payload?.searchedKeys)
          ? payload.searchedKeys
          : [];
        const providerLabel = String(payload?.aiProvider || "").trim();
        const newSuggestionsCount = Number(payload?.newSuggestionsCount || 0);
        const totalSuggestionsCount = Number(
          payload?.totalSuggestionsCount ||
            (Array.isArray(payload?.suggestions)
              ? payload.suggestions.length
              : 0),
        );
        const appendCompletionLine = appendSuggestions
          ? newSuggestionsCount > 0
            ? `Analysis complete. Added ${newSuggestionsCount} new suggestion(s).`
            : "Analysis complete. No additional course names were found."
          : "";
        const appendFeedbackMessage = appendSuggestions
          ? newSuggestionsCount > 0
            ? `Added ${newSuggestionsCount} new course name prediction(s).`
            : "No additional course name predictions were found."
          : "";
        const completionLine =
          Array.isArray(payload?.suggestions) && payload.suggestions.length > 0
            ? this.isArabic()
              ? "اكتمل التحليل وتم تجهيز توقعات الأسماء للمراجعة."
              : "Analysis complete. Name predictions are ready for review."
            : this.isArabic()
              ? "اكتمل التحليل ولم يتم العثور على أسماء جديدة."
              : "Analysis complete. No new course names were found.";
        this.setState({
          telegram_courseSuggestions:
            this.sortTelegramCourseSuggestionsByConfidence(
              payload?.suggestions,
            ),
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsLoading: false,
          telegram_courseSuggestionsLoadingMode: "",
          telegram_courseSuggestionsError: "",
          telegram_courseSuggestionsProgressSteps: [
            ...this.state.telegram_courseSuggestionsProgressSteps,
            ...(analyzedMessagesCount > 0
              ? [
                  this.isArabic()
                    ? `تم تحليل ${analyzedMessagesCount} رسالة/مقطع محتمل.`
                    : `Analyzed ${analyzedMessagesCount} candidate message chunks.`,
                ]
              : []),
            ...(searchedKeys.length > 0
              ? [
                  this.isArabic()
                    ? `تمت المطابقة باستخدام ${searchedKeys.length} مفتاحاً من JSON.`
                    : `Matched against ${searchedKeys.length} course JSON keys.`,
                ]
              : []),
            ...(providerLabel
              ? [
                  this.isArabic()
                    ? `المسار المستخدم: ${providerLabel}.`
                    : `Execution path: ${providerLabel}.`,
                ]
              : []),
            ...(appendSuggestions
              ? [`Saved cards now total ${totalSuggestionsCount}.`]
              : []),
            appendSuggestions ? appendCompletionLine : completionLine,
          ],
          telegram_courseSuggestionsLiveStatus: appendSuggestions
            ? appendCompletionLine
            : completionLine,
          telegram_courseSuggestionsFeedback: appendSuggestions
            ? appendFeedbackMessage
            : Array.isArray(payload?.suggestions) &&
                payload.suggestions.length > 0
              ? "AI course name predictions are ready for review."
              : "No new course name predictions were found.",
        });
      }
    } catch (error) {
      this.stopTelegramCourseSuggestionStatusPolling();
      this.telegramCourseSuggestionsRequestInFlight = false;
      if (this.isComponentMounted) {
        const errorMessage =
          error?.message || "Unable to generate course name predictions.";
        this.setState({
          telegram_courseSuggestionsLoading: false,
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsLoadingMode: "",
          telegram_courseSuggestionsError: errorMessage,
          telegram_courseSuggestionsProgressSteps: [],
          telegram_courseSuggestionsVisible: true,
          telegram_courseSuggestionsLiveStatus: "",
        });
      }
    }
  };

  openTelegramCourseSuggestions = async () => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const selectedSourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const allGroups = !searchSelectedPdfs;
    const sourceMessageId = searchSelectedPdfs ? selectedSourceMessageId : 0;

    if (!this.props.state?.token || !groupReference) {
      return;
    }

    this.stopTelegramCourseSuggestionStatusPolling();
    this.setState({
      telegram_courseSuggestionsVisible: true,
      telegram_courseSuggestionsPanelLoading: true,
      telegram_courseSuggestionsLoading: false,
      telegram_courseSuggestionsLoadingMode: "",
      telegram_courseSuggestionsView: "saved",
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsFeedback: "",
      telegram_courseSuggestionsProgressSteps: [],
      telegram_courseSuggestionsLiveStatus: "",
    });

    try {
      const querySuffix = allGroups
        ? "allGroups=true"
        : `groupReference=${encodeURIComponent(groupReference)}${
            sourceMessageId
              ? `&sourceMessageId=${encodeURIComponent(sourceMessageId)}`
              : ""
          }`;
      const response = await fetch(
        apiUrl(`/api/telegram/ai/course-suggestions?${querySuffix}`),
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
          payload?.message || "Unable to load saved course name predictions.",
        );
      }

      if (this.isComponentMounted) {
        const savedCount = Array.isArray(payload?.suggestions)
          ? payload.suggestions.length
          : 0;
        this.setState({
          telegram_courseSuggestions:
            this.sortTelegramCourseSuggestionsByConfidence(
              payload?.suggestions,
            ),
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsError: "",
          telegram_courseSuggestionsFeedback: savedCount
            ? `Loaded ${savedCount} saved name prediction(s).`
            : allGroups
              ? "No saved name predictions across stored groups yet."
              : "No saved name predictions for this group yet.",
          telegram_courseSuggestionsProgressSteps: [],
          telegram_courseSuggestionsLiveStatus: "",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_courseSuggestions: [],
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsError:
            error?.message || "Unable to load saved course name predictions.",
          telegram_courseSuggestionsFeedback: "",
        });
      }
    }
  };

  submitTelegramCourseSuggestionFeedback = async (
    suggestion,
    decision = "rejected",
  ) => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const groupTitle = String(this.state.telegram_panelGroupTitle || "").trim();
    const selectedSourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const sourceAttachmentFileName = String(
      this.state.telegram_selectedSuggestionPdfTitle || "",
    ).trim();
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const allGroups = !searchSelectedPdfs;
    const sourceMessageId = searchSelectedPdfs ? selectedSourceMessageId : 0;

    if (
      !this.props.state?.token ||
      !groupReference ||
      !suggestion ||
      !["accepted", "rejected"].includes(decision)
    ) {
      return;
    }

    try {
      await fetch(apiUrl("/api/telegram/ai/course-suggestions/feedback"), {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${this.props.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupReference,
          groupTitle,
          allGroups,
          ...(sourceMessageId
            ? {
                sourceMessageId,
                sourceAttachmentFileName,
              }
            : {}),
          decision,
          suggestion,
        }),
      });
    } catch {}
  };

  dismissTelegramCourseSuggestion = (suggestionKey) => {
    const dismissedSuggestion = (
      Array.isArray(this.state.telegram_courseSuggestions)
        ? this.state.telegram_courseSuggestions
        : []
    ).find((suggestion) => suggestion.suggestionKey === suggestionKey);

    if (dismissedSuggestion) {
      this.submitTelegramCourseSuggestionFeedback(
        dismissedSuggestion,
        "rejected",
      );
    }

    this.setState((currentState) => ({
      telegram_courseSuggestions:
        currentState.telegram_courseSuggestions.filter(
          (suggestion) => suggestion.suggestionKey !== suggestionKey,
        ),
    }));
  };

  clearTelegramCourseSuggestions = () => {
    this.setState({
      telegram_courseSuggestions: [],
      telegram_courseSuggestionsFeedback: this.isArabic()
        ? "تم مسح بطاقات الاقتراح الحالية."
        : "Cleared the current suggestion cards.",
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsProgressSteps: [],
      telegram_courseSuggestionsLiveStatus: "",
    });
  };

  clearSavedTelegramCourseSuggestions = async () => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const selectedSourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const allGroups = !searchSelectedPdfs;
    const sourceMessageId = searchSelectedPdfs ? selectedSourceMessageId : 0;

    if (!this.props.state?.token || !groupReference) {
      return;
    }

    try {
      const querySuffix = allGroups
        ? "allGroups=true"
        : `groupReference=${encodeURIComponent(groupReference)}${
            sourceMessageId
              ? `&sourceMessageId=${encodeURIComponent(sourceMessageId)}`
              : ""
          }`;
      const isRejectedView =
        this.state.telegram_courseSuggestionsView === "rejected";
      const response = await fetch(
        apiUrl(
          isRejectedView
            ? `/api/telegram/ai/course-suggestions/rejected?${querySuffix}`
            : `/api/telegram/ai/course-suggestions?${querySuffix}`,
        ),
        {
          method: "DELETE",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            (isRejectedView
              ? "Unable to clear rejected course suggestions."
              : "Unable to clear saved course suggestions."),
        );
      }

      this.setState({
        telegram_courseSuggestions: [],
        telegram_courseSuggestionsFeedback: isRejectedView
          ? "Cleared rejected suggestion cards."
          : "Cleared stored suggestion cards.",
        telegram_courseSuggestionsError: "",
        telegram_courseSuggestionsProgressSteps: [],
        telegram_courseSuggestionsLiveStatus: "",
      });
    } catch (error) {
      this.setState({
        telegram_courseSuggestionsError:
          error?.message || "Unable to clear saved course suggestions.",
      });
    }
  };

  approveTelegramCourseSuggestion = async (suggestionKey) => {
    const nextSuggestion = (
      Array.isArray(this.state.telegram_courseSuggestions)
        ? this.state.telegram_courseSuggestions
        : []
    ).find((suggestion) => suggestion.suggestionKey === suggestionKey);
    const approvedCoursePayload =
      this.getSuggestionCoursePayloadForApproval(nextSuggestion);

    if (!approvedCoursePayload?.course_name || !this.props.state?.my_id) {
      return;
    }

    const existingDuplicate = (
      Array.isArray(this.state.courses) ? this.state.courses : []
    ).some(
      (course) =>
        buildCourseDuplicateKey(course) ===
        buildCourseDuplicateKey(approvedCoursePayload),
    );

    if (existingDuplicate) {
      this.setState({
        telegram_courseSuggestions:
          this.state.telegram_courseSuggestions.filter(
            (suggestion) => suggestion.suggestionKey !== suggestionKey,
          ),
        telegram_courseSuggestionsFeedback: this.isArabic()
          ? "تم تخطي اقتراح مكرر لأنه موجود بالفعل."
          : "Skipped a duplicate suggestion because the course already exists.",
      });
      return;
    }

    this.setState({
      telegram_approvingSuggestionKey: suggestionKey,
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsFeedback: "",
    });

    try {
      const response = await fetch(
        apiUrl("/api/user/addCourse/") + this.props.state.my_id,
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${this.props.state.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(approvedCoursePayload),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 201) {
        throw new Error("Unable to add the approved course.");
      }

      await this.submitTelegramCourseSuggestionFeedback(
        nextSuggestion,
        "accepted",
      );

      if (this.isComponentMounted) {
        this.setState((currentState) => ({
          telegram_approvingSuggestionKey: "",
          telegram_courseSuggestions:
            currentState.telegram_courseSuggestions.filter(
              (suggestion) => suggestion.suggestionKey !== suggestionKey,
            ),
          telegram_courseSuggestionsFeedback: this.isArabic()
            ? "تمت إضافة المقرر الموافق عليه."
            : "Approved course added.",
        }));
      }

      this.retrieveCourses(
        String(payload?.course?._id || "").trim() || undefined,
      );
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_approvingSuggestionKey: "",
          telegram_courseSuggestionsError:
            error?.message || "Unable to add the approved course.",
        });
      }
    }
  };

  renderCourseDetailsLoader = () => {
    return;
  };

  hideCourseDetailsPanels = () => {
    let detailsDiv = document.getElementById("nogaPlanner_courses_details_div");
    let actionsMount = document.getElementById(
      "nogaPlanner_courses_actions_mount",
    );

    this.courseDetailsTypingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.courseDetailsTypingTimeouts = [];
    this.stopCoursePrintSound();
    if (detailsDiv) {
      detailsDiv.classList.remove("nogaPlanner_courses_panel--printing");
      detailsDiv.classList.add("nogaPlanner_courses_panel--hidden");
      detailsDiv.innerHTML = "";
      detailsDiv.style.transition = "";
      detailsDiv.style.clipPath = "";
      detailsDiv.style.opacity = "";
      detailsDiv.style.filter = "";
    }

    if (actionsMount) {
      actionsMount.classList.remove("nogaPlanner_courses_panel--printing");
      actionsMount.classList.remove("nogaPlanner_courses_panel--hidden");
      this.renderCourseActionDock(actionsMount, null, [], true);
    }
  };

  playCourseDetailsPrintAnimation = () => {
    let detailsDiv = document.getElementById("nogaPlanner_courses_details_div");
    let actionsMount = document.getElementById(
      "nogaPlanner_courses_actions_mount",
    );
    const shouldReduceMotion = this.isReducedMotionEnabled();

    if (detailsDiv) {
      detailsDiv.classList.remove("nogaPlanner_courses_panel--hidden");
      detailsDiv.classList.remove("nogaPlanner_courses_panel--printing");
      detailsDiv.scrollTop = 0;
      this.updateCoursePrintReveal(null, true);
    }

    if (actionsMount) {
      actionsMount.classList.remove("nogaPlanner_courses_panel--hidden");
      actionsMount.classList.remove("nogaPlanner_courses_panel--printing");
    }

    let textTargets = [];
    [detailsDiv].forEach((panel) => {
      if (!panel) return;
      panel.querySelectorAll("h3, p, button").forEach((node) => {
        const fullText = node.textContent || "";
        node.dataset.printText = fullText;
        node.textContent = "";
        textTargets.push(node);
      });
    });

    if (shouldReduceMotion) {
      this.stopCoursePrintSound();
      textTargets.forEach((node) => {
        node.textContent = node.dataset.printText || "";
      });

      if (detailsDiv) {
        const existingSpacer = detailsDiv.querySelector(
          ".nogaPlanner_courses_printSpacer",
        );
        if (existingSpacer) {
          existingSpacer.remove();
        }
        detailsDiv.style.transition = "none";
        detailsDiv.style.clipPath = "inset(0 0 0 0)";
        detailsDiv.style.opacity = "1";
        detailsDiv.style.filter = "none";
      }

      return;
    }

    textTargets.sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
    });

    let endLineSpacer = null;
    if (detailsDiv) {
      const existingSpacer = detailsDiv.querySelector(
        ".nogaPlanner_courses_printSpacer",
      );
      if (existingSpacer) existingSpacer.remove();

      endLineSpacer = document.createElement("div");
      endLineSpacer.className = "nogaPlanner_courses_printSpacer";
      detailsDiv.append(endLineSpacer);
    }

    const characterDelay = 95;
    const nodeGapDelay = 140;
    const initialDelay = 36;
    const totalChars = textTargets.reduce((count, node) => {
      return count + (node.dataset.printText || "").length;
    }, 0);
    const totalTypingDuration =
      initialDelay +
      totalChars * characterDelay +
      Math.max(0, textTargets.length - 1) * nodeGapDelay;
    let step = 0;
    const printNext = () => {
      if (step >= textTargets.length) {
        this.stopCoursePrintSound();
        if (detailsDiv) {
          this.updateCoursePrintReveal(endLineSpacer || detailsDiv);
          detailsDiv.style.transition =
            "clip-path 130ms ease-out, opacity 100ms linear, filter 120ms linear";
          detailsDiv.style.clipPath = "inset(0 0 0 0)";
          detailsDiv.style.opacity = "1";
          detailsDiv.style.filter = "saturate(1) brightness(1)";
        }
        return;
      }
      const node = textTargets[step];
      const fullText = node.dataset.printText || "";
      let charIndex = 0;

      this.updateCoursePrintReveal(node, step === 0);

      const typeCharacter = () => {
        node.textContent = fullText.slice(0, charIndex + 1);
        this.keepCoursePrintLineVisible(node);
        charIndex += 1;

        if (charIndex < fullText.length) {
          const timeoutId = window.setTimeout(typeCharacter, characterDelay);
          this.courseDetailsTypingTimeouts.push(timeoutId);
        } else {
          step += 1;
          const timeoutId = window.setTimeout(printNext, nodeGapDelay);
          this.courseDetailsTypingTimeouts.push(timeoutId);
        }
      };

      if (fullText.length === 0) {
        step += 1;
        printNext();
        return;
      }

      typeCharacter();
    };

    if (totalChars > 0) {
      this.playCoursePrintSound(totalTypingDuration);
    }
    const timeoutId = window.setTimeout(printNext, initialDelay);
    this.courseDetailsTypingTimeouts.push(timeoutId);
  };

  retrieveLecturesSearched = (searchKeyword) => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("nogaPlanner_lectures_ul");
    if (!ul) {
      this.setState({
        lecture_isLoading: false,
      });
      return;
    }
    ul.innerHTML = "";
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        if (!this.isComponentMounted || !ul) {
          return;
        }
        const selectedLectureId = this.state.lecture_details?._id;
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          if (searchKeyword) {
            if (
              String(lecture.lecture_name).includes(searchKeyword) ||
              String(lecture.lecture_course).includes(searchKeyword) ||
              String(lecture.lecture_instructor).includes(searchKeyword) ||
              String(lecture.lecture_outlines).includes(searchKeyword)
            ) {
              let progressionStats = getProgressStats(
                lecture.lecture_progress,
                lecture.lecture_length,
              );
              lecture_courses.push(lecture.lecture_course);
              this.appendLectureRow(ul, lecture, progressionStats, true);
            }
          }
        });
        const matchedLecture = lecture_sorted.find(
          (lecture) => lecture._id === selectedLectureId,
        );
        this.setState({
          lectures: jsonData.schoolPlanner.lectures,
          lecture_details: matchedLecture || null,
        });
      })
      .then(() => {
        if (this.isComponentMounted) {
          this.calculateLectureNum();
        }
      });
  };

  retrieveLectures = () => {
    this.setState({
      lecture_isLoading: true,
    });
    let ul = document.getElementById("nogaPlanner_lectures_ul");
    if (ul) {
      ul.innerHTML = "";
    }
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status === 200) {
          this.setState({
            lecture_isLoading: false,
          });
          return response.json();
        }
      })
      .then((jsonData) => {
        if (!this.isComponentMounted) {
          return null;
        }
        const selectedLectureId = this.state.lecture_details?._id;
        var lecture_sorted = jsonData.schoolPlanner.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          let progressionStats = getProgressStats(
            lecture.lecture_progress,
            lecture.lecture_length,
          );
          lecture_courses.push(lecture.lecture_course);
          if (ul && lecture.lecture_hidden === false) {
            this.appendLectureRow(ul, lecture, progressionStats, true);
          }
        });
        const matchedLecture = lecture_sorted.find(
          (lecture) =>
            lecture._id === selectedLectureId &&
            lecture.lecture_hidden === false,
        );
        this.setState({
          lectures: jsonData.schoolPlanner.lectures,
          lecture_details: matchedLecture || null,
        });
        return {
          lecture_courses: lecture_courses,
          jsonData: jsonData,
        };
      })
      .then((object) => {
        if (!this.isComponentMounted || !object) {
          return;
        }
        course_pages = [];
        let unique_lecture_courses = [...new Set(object.lecture_courses)];
        unique_lecture_courses.forEach((unique_lecture_course) => {
          let course_length = 0;
          let course_progress = 0;
          object.jsonData.schoolPlanner.lectures.forEach((lecture) => {
            if (
              lecture.lecture_course === unique_lecture_course &&
              lecture.lecture_partOfPlan === true
            ) {
              course_length =
                Number(course_length) + Number(lecture.lecture_length);
              course_progress =
                Number(course_progress) + Number(lecture.lecture_progress);
            }
          });
          course_pages.push({
            course_name: unique_lecture_course,
            course_length: course_length,
            course_progress: course_progress,
          });
        });
        this.calculateLectureNum();
      })
      .catch((err) => {
        if (err.message === "Cannot read property 'credentials' of null")
          console.log("Error", err.message);
      });

    // });
  };

  //.........RETRIEVE COURSES.................

  retrieveCourses = (selectedCourseId) => {
    this.setState({
      course_isLoading: true,
    });
    let courseSelect = document.getElementById("nogaPlanner_courses_select");
    let courseDetails = document.getElementById(
      "nogaPlanner_courses_details_div",
    );
    const activeCourseId =
      selectedCourseId || (courseSelect ? courseSelect.value : "");
    const noCourseSelectedText = this.isArabic()
      ? "لم يتم اختيار مقرر"
      : "No course selected";
    const ensureCourseSelectPlaceholder = () => {
      if (!courseSelect) {
        return;
      }

      courseSelect.innerHTML = "";
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = noCourseSelectedText;
      placeholderOption.selected = true;
      courseSelect.append(placeholderOption);
      courseSelect.setAttribute("data-empty", "true");
    };
    if (courseSelect) {
      ensureCourseSelectPlaceholder();
    }
    if (courseDetails) {
      this.renderCourseDetailsLoader();
    }
    let url = apiUrl("/api/user/update/") + this.props.state.my_id;
    let req = new Request(url, {
      method: "GET",
      mode: "cors",
    });
    fetch(req)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Failed to retrieve courses: ${response.status}`);
        }

        courseNames = [];
        courseInstructorsNames = [];
        courses_partOfPlan = [];
        return response.json();
      })
      .then((jsonData) => {
        if (!this.isComponentMounted) {
          return null;
        }
        const incomingCourses = Array.isArray(jsonData?.schoolPlanner?.courses)
          ? jsonData.schoolPlanner.courses
          : [];
        console.log(
          "[retrieveCourses] schoolPlanner:",
          jsonData?.schoolPlanner,
          "courses count:",
          incomingCourses.length,
        );
        courses = incomingCourses;
        if (this.isComponentMounted) {
          this.setState({ courses: incomingCourses });
        }
        if (
          String(this.props.state?.username || "").toLowerCase() ===
          "naghamtrkmani"
        ) {
          const exportedCourses = incomingCourses
            .filter((course) => course?._id && course?.course_name)
            .map((course) => ({
              id: course._id,
              name: course.course_name,
            }));

          window.localStorage.setItem(
            NAGHAM_COURSE_LIST_STORAGE_KEY,
            JSON.stringify(exportedCourses),
          );
        }
        incomingCourses.forEach((course) => {
          if (course.course_name !== "-") courseNames.push(course.course_name);
          course.course_instructors.forEach((instructor) => {
            courseInstructorsNames.push(instructor);
          });

          courseNames_filtered = courseNames.filter((value, index) => {
            return courseNames.indexOf(value) === index;
          });
          courseInstructorsNames_filtered = courseInstructorsNames.filter(
            (value, index) => {
              return courseInstructorsNames.indexOf(value) === index;
            },
          );
          if (course.course_partOfPlan === true) {
            courses_partOfPlan.push(course);
          }
        });

        if (courseSelect) {
          ensureCourseSelectPlaceholder();
          courses.forEach((course) => {
            let option = document.createElement("option");
            option.value = course._id;
            option.textContent = course.course_name;
            courseSelect.append(option);
          });

          if (courses.length > 0) {
            const selectedCourse = courses.find(
              (course) => course._id === activeCourseId,
            );
            if (selectedCourse) {
              courseSelect.value = selectedCourse._id;
              courseSelect.setAttribute("data-empty", "false");
              this.renderCourseDetailsCard(selectedCourse);
              this.setSelectedCourseWithExamFocus(selectedCourse._id, 0);
            } else {
              courseSelect.selectedIndex = 0;
              courseSelect.setAttribute("data-empty", "true");
              this.renderCourseDetailsCard(null);
              this.setSelectedCourseWithExamFocus("", -1);
            }
          } else {
            courseSelect.setAttribute("data-empty", "true");
            this.renderCourseDetailsCard(null);
            this.setSelectedCourseWithExamFocus("", -1);
          }

          courseSelect.onchange = (event) => {
            const selectedCourse = courses.find(
              (course) => course._id === event.target.value,
            );
            event.target.setAttribute(
              "data-empty",
              selectedCourse ? "false" : "true",
            );
            this.renderCourseDetailsCard(selectedCourse);
            this.setSelectedCourseWithExamFocus(selectedCourse?._id || "", 0);
          };
        }
      })
      .then(() => {
        if (!this.isComponentMounted) {
          return;
        }
        this.setState({
          course_isLoading: false,
        });
        console.log(courses_partOfPlan);
        //....TO ADD COURSE NAMES OPTIONS TO SELECT COURSE IN LECTURE ADD FORM
        var select_courseNames = document.getElementById(
          "nogaPlanner_addLecture_course_input",
        );
        if (select_courseNames) {
          select_courseNames.innerHTML =
            " <option selected disabled>Lecture course</option>";
          for (var i = 0; i < courseNames_filtered.length; i++) {
            let option = document.createElement("option");
            option.innerHTML = courseNames_filtered[i];
            select_courseNames.append(option);
          }
        }
        var select_courseInstructorsNames = document.getElementById(
          "nogaPlanner_addLecture_instructorName_input",
        );
        if (select_courseInstructorsNames) {
          select_courseInstructorsNames.innerHTML =
            " <option selected disabled>Lecture instructor name</option>";
          for (var i = 0; i < courseInstructorsNames_filtered.length; i++) {
            let option = document.createElement("option");
            option.innerHTML = courseInstructorsNames_filtered[i];
            select_courseInstructorsNames.append(option);
          }
        }
      })
      .catch((err) => {
        console.error("[retrieveCourses] fetch failed:", err);
        if (this.isComponentMounted) {
          if (courseSelect) {
            ensureCourseSelectPlaceholder();
          }
          this.setState({
            course_isLoading: false,
          });
          this.renderCourseDetailsCard(null);
        }
      });
  };
  //.............................................

  deleteLecture = async () => {
    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedLectures.length; i++) {
      let url =
        apiUrl("/api/user/deleteLecture/") +
        this.props.state.my_id +
        "/" +
        checkedLectures[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req);
    }

    checkedLectures = [];
    this.setState({ selectedTabItemId: null });
    this.retrieveLectures();
  };

  //.............DELETE COURSE.....................
  deleteCourse = async () => {
    alert("afsd");
    if (checkedCourses.length === 0) {
      const courseSelect = document.getElementById(
        "nogaPlanner_courses_select",
      );
      if (courseSelect && courseSelect.value) {
        checkedCourses = [courseSelect.value];
      }
    }

    //......DELETEING item FROM itemS DB
    for (var i = 0; i < checkedCourses.length; i++) {
      let url =
        apiUrl("/api/user/deleteCourse/") +
        this.props.state.my_id +
        "/" +
        checkedCourses[i];
      let options = {
        method: "DELETE",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.retrieveCourses();
        }
      });
    }

    checkedCourses = [];
  };
  deleteCourseById = async (courseId) => {
    let url =
      apiUrl("/api/user/deleteCourse/") +
      this.props.state.my_id +
      "/" +
      courseId;
    let options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    await fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveCourses();
      }
    });
  };

  openRejectedTelegramCourseSuggestions = async () => {
    const groupReference = String(
      this.state.telegram_panelGroupReference || "",
    ).trim();
    const selectedSourceMessageId = Number(
      this.state.telegram_selectedSuggestionPdfId || 0,
    );
    const searchSelectedPdfs = Boolean(this.state.telegram_searchSelectedPdfs);
    const allGroups = !searchSelectedPdfs;
    const sourceMessageId = searchSelectedPdfs ? selectedSourceMessageId : 0;

    if (!this.props.state?.token || !groupReference) {
      return;
    }

    this.stopTelegramCourseSuggestionStatusPolling();
    this.setState({
      telegram_courseSuggestionsVisible: true,
      telegram_courseSuggestionsPanelLoading: true,
      telegram_courseSuggestionsLoading: false,
      telegram_courseSuggestionsLoadingMode: "",
      telegram_courseSuggestionsView: "rejected",
      telegram_courseSuggestionsError: "",
      telegram_courseSuggestionsFeedback: "",
      telegram_courseSuggestionsProgressSteps: [],
      telegram_courseSuggestionsLiveStatus: "",
    });

    try {
      const querySuffix = allGroups
        ? "allGroups=true"
        : `groupReference=${encodeURIComponent(groupReference)}${
            sourceMessageId
              ? `&sourceMessageId=${encodeURIComponent(sourceMessageId)}`
              : ""
          }`;
      const response = await fetch(
        apiUrl(`/api/telegram/ai/course-suggestions/rejected?${querySuffix}`),
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
          payload?.message || "Unable to load rejected course suggestions.",
        );
      }

      if (this.isComponentMounted) {
        const rejectedCount = Array.isArray(payload?.suggestions)
          ? payload.suggestions.length
          : 0;
        this.setState({
          telegram_courseSuggestions:
            this.sortTelegramCourseSuggestionsByConfidence(
              payload?.suggestions,
            ),
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsError: "",
          telegram_courseSuggestionsFeedback: rejectedCount
            ? `Loaded ${rejectedCount} rejected suggestion(s).`
            : allGroups
              ? "No rejected course suggestions across stored groups yet."
              : "No rejected course suggestions for this scope yet.",
          telegram_courseSuggestionsProgressSteps: [],
          telegram_courseSuggestionsLiveStatus: "",
        });
      }
    } catch (error) {
      if (this.isComponentMounted) {
        this.setState({
          telegram_courseSuggestions: [],
          telegram_courseSuggestionsPanelLoading: false,
          telegram_courseSuggestionsError:
            error?.message || "Unable to load rejected course suggestions.",
          telegram_courseSuggestionsFeedback: "",
        });
      }
    }
  };
  deleteAllCourses = async () => {
    if (!Array.isArray(courses) || courses.length === 0) {
      return;
    }

    const shouldDeleteAll =
      typeof window === "undefined"
        ? true
        : window.confirm(
            this.isArabic()
              ? "هل تريد حذف جميع المقررات؟"
              : "Delete all added courses?",
          );

    if (!shouldDeleteAll) {
      return;
    }

    const url = apiUrl("/api/user/deleteAllCourses/") + this.props.state.my_id;
    const options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    const req = new Request(url, options);

    await fetch(req).then((result) => {
      if (result.status === 201) {
        checkedCourses = [];
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................

  editCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    this.setState({
      show_addCourseForm: false,
    });
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: courseDayAndTime,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: courseInstructorsNames,
        course_grade: primaryExam.course_grade,
        course_fullGrade: primaryExam.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: false,
        course_exams: courseExams,
        exam_type: primaryExam.exam_type,
        exam_date: primaryExam.exam_date,
        exam_time: primaryExam.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //..............PartofPlan COURSE....................

  partOfPlanCourse = (object, partOfPlanID, boolean) => {
    const storedCourseExams = object.course_exams || [];
    const primaryExam = getPrimaryCourseExam(storedCourseExams);
    this.setState({
      show_addCourseForm: false,
    });
    let url =
      apiUrl("/api/user/editCourse/") +
      this.props.state.my_id +
      "/" +
      target_editCourse;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_name: object.course_name,
        course_component: object.course_component,
        course_dayAndTime: object.course_component,
        course_term: object.course_term,
        course_year: object.course_year,
        course_class: object.course_class,
        course_status: object.course_status,
        course_instructors: object.course_instructors,
        course_grade: primaryExam.course_grade || object.course_grade,
        course_fullGrade:
          primaryExam.course_fullGrade || object.course_fullGrade,
        course_length: object.course_length,
        course_progress: object.course_progress,
        course_partOfPlan: boolean,
        course_exams: storedCourseExams,
        exam_type: primaryExam.exam_type || object.exam_type,
        exam_date: primaryExam.exam_date || object.exam_date,
        exam_time: primaryExam.exam_time || object.exam_time,
      }),
    };
    let req = new Request(url, options);
    fetch(req).then((result) => {
      if (result.status === 201) {
        this.retrieveLectures();
        this.retrieveCourses();
      }
    });
  };
  //...............................................
  //..............EDIT COURSE....................
  editCoursePages = async () => {
    this.setState({
      course_isLoading: true,
    });
    for (var i = 0; i < course_pages.length; i++) {
      let url =
        apiUrl("/api/user/editCoursePages/") +
        this.props.state.my_id +
        "/" +
        course_pages[i].course_name;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_length: course_pages[i].course_length,
          course_progress: course_pages[i].course_progress,
        }),
      };
      let req = new Request(url, options);
      await fetch(req).then((result) => {
        if (result.status === 201) {
          this.setState({
            course_isLoading: false,
          });
          if (i === course_pages.length - 1) this.retrieveCourses();
        }
      });
    }
  };
  //...............................................

  //......................................

  //......................................

  //........................EDIT item......................

  editLecture = (object) => {
    this.setState({
      lecture_isLoading: true,
    });
    let url =
      apiUrl("/api/user/editLecture/") +
      this.props.state.my_id +
      "/" +
      object._id;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(object),
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        const selectedCourseId = document.getElementById(
          "nogaPlanner_courses_select",
        )?.value;
        this.setState({
          lecture_isLoading: false,
        });
        lectureInEdit = {};
        document.getElementById("nogaPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
        this.retrieveCourses(selectedCourseId);
      }
    });
  };
  //..............EDIT COURSE PAGES............
  //........................ADD item.......................

  addLecture = (object) => {
    if (!object.lecture_name) object.lecture_name = "-";
    if (object.lecture_course === "Lecture course") object.lecture_course = "-";
    if (object.lecture_instructor === "Lecture instructor name")
      object.lecture_instructor = "-";
    if (!object.lecture_writer) object.lecture_writer = "-";
    if (!object.lecture_date) object.lecture_date = "-";
    if (!object.lecture_length) object.lecture_length = 0;
    if (!object.lecture_progress) object.lecture_progress = 0;
    object.lecture_corrections = normalizeLectureCorrections(
      object.lecture_corrections,
    );
    let url = apiUrl("/api/user/addLecture/") + this.props.state.my_id;
    let options = {
      method: "POST",
      mode: "cors",
      body: JSON.stringify(object),
      headers: {
        Authorization: "Bearer " + this.props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((lecture) => {
      if (lecture.status === 201) {
        const selectedCourseId = document.getElementById(
          "nogaPlanner_courses_select",
        )?.value;
        document.getElementById("nogaPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
        this.retrieveCourses(selectedCourseId);
      }
    });
  };

  //.........ADD COURSE............

  addCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    if (object.course_name) {
      if (object.course_component === "Course component")
        object.course_component = "-";
      if (object.course_year === "Course year") object.course_year = "-";
      if (object.course_term === "Course term") object.course_term = "-";
      if (object.course_class === "Course classification")
        object.course_class = "-";
      if (object.course_status === "Course status") object.course_status = "-";
      if (object.exam_type === "Exam type") object.exam_type = "-";

      let url = apiUrl("/api/user/addCourse/") + this.props.state.my_id;
      let options = {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + this.props.state.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_name: object.course_name,
          course_component: object.course_component,
          course_dayAndTime: courseDayAndTime,
          course_year: object.course_year,
          course_term: object.course_term,
          course_class: object.course_class,
          course_status: object.course_status,
          course_instructors: courseInstructorsNames,
          course_grade: primaryExam.course_grade,
          course_fullGrade: primaryExam.course_fullGrade,
          course_length: 0,
          course_progress: 0,
          course_exams: courseExams,
          exam_type: primaryExam.exam_type,
          exam_date: primaryExam.exam_date,
          exam_time: primaryExam.exam_time,
        }),
      };
      let req = new Request(url, options);
      fetch(req).then((course) => {
        if (course.status === 201) {
          this.setState({
            show_addCourseForm: false,
          });
          this.retrieveCourses();
        }
      });
    } else {
      this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
    }
  };

  submitAddCourseForm = () => {
    const buttonName = document.getElementById(
      "nogaPlanner_addCourse_addButton_label",
    )?.textContent;
    const course_name =
      document.getElementById("nogaPlanner_addCourse_name_input")?.value || "";
    const course_component =
      document.getElementById("nogaPlanner_addCourse_component_input")?.value ||
      "";
    const course_year =
      document.getElementById("nogaPlanner_addCourse_year_input")?.value || "";
    const course_term =
      document.getElementById("nogaPlanner_addCourse_term_input")?.value || "";
    const course_class =
      document.getElementById("nogaPlanner_addCourse_class_input")?.value || "";
    const course_status =
      document.getElementById("nogaPlanner_addCourse_status_input")?.value ||
      "";
    const primaryExam = getPrimaryCourseExam(courseExams);
    const nextCourse = {
      course_name: `${course_name} (${course_component})`,
      course_component,
      course_year,
      course_term,
      course_class,
      course_status,
      course_grade: primaryExam.course_grade,
      course_fullGrade: primaryExam.course_fullGrade,
      course_length: 0,
      course_progress: 0,
      exam_type: primaryExam.exam_type,
      exam_date: primaryExam.exam_date,
      exam_time: primaryExam.exam_time,
    };

    if (this.isActionLabel(buttonName, "Add")) {
      this.addCourse(nextCourse);
    }

    if (this.isActionLabel(buttonName, "Edit")) {
      this.editCourse(nextCourse);
    }
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

export const getPlannerMusicSnapshot = () => ({});
export const playNextSharedPlannerMusicTrack = () => {};
export const playPreviousSharedPlannerMusicTrack = () => {};
export const toggleSharedPlannerMusic = () => {};
