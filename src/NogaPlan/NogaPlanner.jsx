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

  return {
    exam_type: firstExam.exam_type || "-",
    exam_date: firstExam.exam_date || "-",
    exam_time: firstExam.exam_time || "-",
    course_grade: firstExam.course_grade || "",
    course_fullGrade: firstExam.course_fullGrade || "",
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
  const normalizedValue = String(value || "").trim().toLowerCase();
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
    .filter(Boolean);

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
  course_year: "",
  course_term: "",
  course_name: "",
  course_class: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_grade: "",
  course_locationBuilding: "",
  course_locationRoom: "",
});

const getDefaultInlineLectureDraft = () => ({
  lecture_name: "",
  lecture_instructors: "",
  lecture_writers: "",
  lecture_date: "",
});

const buildAcademicYearOptions = (startYear = 2000, endYear = null) => {
  const currentYear = new Date().getFullYear();
  const parsedEndYear = Number(endYear);
  const end =
    endYear !== null &&
    endYear !== undefined &&
    String(endYear).trim() !== "" &&
    Number.isFinite(parsedEndYear)
      ? parsedEndYear
      : currentYear + 1;
  const start = Math.min(Math.max(1900, Number(startYear) || 2000), end);
  const options = [];

  for (let year = start; year <= end; year += 1) {
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
  const academicYear =
    normalizeAcademicYearValue(course?.course_year) ||
    normalizeAcademicYearValue(course?.academicYear) ||
    normalizeAcademicYearValue(course?.time?.academicYear);
  const term = String(
    course?.course_term || course?.term || course?.time?.term || "",
  ).trim();
  const displayedTerm = formatAcademicTermDisplay(term, locale);

  if (academicYear && displayedTerm && displayedTerm !== "-") {
    return `${academicYear} (${displayedTerm})`;
  }

  return (
    academicYear ||
    (displayedTerm && displayedTerm !== "-" ? `(${displayedTerm})` : "-")
  );
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
      selectedTabItemId: selectedCourseForLecturesId || null,
      selectedCourseForLecturesId: "",
      selectedCourseForLecturesName: "",
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
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
        return {
          plannerTab: "lectures",
          selectedTabItemId: null,
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

  handleSavedCourseDraftChange = (fieldName, nextValue) => {
    this.setState((previousState) => ({
      savedCourseDraft: {
        ...previousState.savedCourseDraft,
        [fieldName]: nextValue,
      },
    }));
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
    const selectedLocation =
      selectedCourse?.course_location &&
      typeof selectedCourse.course_location === "object"
        ? selectedCourse.course_location
        : {};

    this.setState({
      plannerTab: safeMode === "edit" ? "courses" : this.state.plannerTab,
      savedCourseEditorVisible: true,
      savedCourseEditorMode: safeMode,
      savedCourseDraft:
        safeMode === "edit" && selectedCourse
          ? {
              course_code: String(selectedCourse?.course_code || "").trim(),
              course_year: normalizeAcademicYearValue(
                selectedCourse?.course_year,
              ),
              course_term:
                String(selectedCourse?.course_term || "").trim() === "-"
                  ? ""
                  : String(selectedCourse?.course_term || "").trim(),
              course_name: String(selectedCourse?.course_name || "").trim(),
              course_class: String(
                selectedCourse?.course_class ||
                  selectedCourse?.course_component ||
                  "",
              ).trim(),
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
            }
          : getDefaultSavedCourseDraft(),
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
    const directionMultiplier =
      savedCourseSortDirection === "desc" ? -1 : 1;
    const normalizedEntries = Array.isArray(entries) ? [...entries] : [];

    normalizedEntries.sort((leftCourse, rightCourse) => {
      if (savedCourseSortKey === "course_year_term") {
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
            return formatSavedCourseComponent(course, this.isArabic() ? "ar" : "en");
          case "course_schedule":
            return formatCourseScheduleDisplay(course?.course_dayAndTime);
          case "course_location":
            return formatCourseLocationDisplay(course?.course_location);
          case "course_weight":
            return String(course?.course_grade || "-");
          default:
            return formatSavedCourseTitle(course);
        }
      };

      const leftValue = String(getComparableValue(leftCourse) || "").trim();
      const rightValue = String(getComparableValue(rightCourse) || "").trim();

      return leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      }) * directionMultiplier;
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
    const courseClass = String(savedCourseDraft?.course_class || "").trim();
    const courseAcademicYear = normalizeAcademicYearValue(
      savedCourseDraft?.course_year,
    );
    const courseTerm = String(savedCourseDraft?.course_term || "").trim();
    const courseSchedule = this.splitInlineCourseMultiValue(
      savedCourseDraft?.course_dayAndTime,
    );
    const courseGrade = String(savedCourseDraft?.course_grade || "").trim();
    const courseLocationBuilding = String(
      savedCourseDraft?.course_locationBuilding || "",
    ).trim();
    const courseLocationRoom = String(
      savedCourseDraft?.course_locationRoom || "",
    ).trim();

    if (!courseName) {
      this.props.serverReply(this.t("postingFailedPleaseAddCourseName"));
      return;
    }

    if (!courseClass) {
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

      const parentCourseId = String(
        selectedCourse?.parentCourseId || selectedCourse?._id || "",
      ).trim();
      const componentId = String(
        selectedCourse?.primaryComponentId || selectedCourse?._id || "",
      ).trim();
      const shouldPersistComponent = true;

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
            }),
          },
        );
      }

      if (componentId) {
        await fetch(
          apiUrl("/api/user/editCourse/") +
            this.props.state.my_id +
            "/" +
            componentId,
          {
            method: "POST",
            mode: "cors",
            headers: {
              Authorization: "Bearer " + this.props.state.token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              course_class: courseClass || "-",
              course_dayAndTime: courseSchedule,
              course_year: courseAcademicYear || "-",
              academicYear: courseAcademicYear || "-",
              course_term: courseTerm || "-",
              term: courseTerm || "-",
              course_grade: courseGrade || "-",
              course_locationBuilding: courseLocationBuilding || "-",
              course_locationRoom: courseLocationRoom || "-",
            }),
          },
        );
      } else if (parentCourseId && shouldPersistComponent) {
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
            body: JSON.stringify({
              course_class: courseClass || "-",
              course_year: courseAcademicYear || "-",
              academicYear: courseAcademicYear || "-",
              course_term: courseTerm || "-",
              term: courseTerm || "-",
              course_dayAndTime: courseSchedule,
              course_grade: courseGrade || "-",
              course_locationBuilding: courseLocationBuilding || "-",
              course_locationRoom: courseLocationRoom || "-",
              course_exams: [],
            }),
          },
        );
      }

      this.closeSavedCourseEditor();
      this.retrieveCourses(componentId || parentCourseId);
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
            course_class: courseClass || "-",
            course_year: courseAcademicYear || "-",
            academicYear: courseAcademicYear || "-",
            course_term: courseTerm || "-",
            term: courseTerm || "-",
            course_dayAndTime: courseSchedule,
            course_grade: courseGrade || "-",
            course_locationBuilding: courseLocationBuilding || "-",
            course_locationRoom: courseLocationRoom || "-",
            course_exams: [],
          }),
        },
      );

      const componentPayload = await componentResponse.json().catch(() => ({}));

      if (!componentResponse.ok && componentResponse.status !== 201) {
        this.props.serverReply(
          componentPayload?.message ||
            this.t("postingFailedPleaseAddCourseName"),
        );
        return;
      }

      createdComponentId = String(
        componentPayload?.component?._id || "",
      ).trim();
    }

    this.closeSavedCourseEditor();
    this.retrieveCourses(createdComponentId || createdCourseId);
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
    } = this.state;
    const visibleLectures = this.getLecturesForSelectedCourse();

    return (
      <table className="nogaPlanner_tabTable nogaPlanner_lecturesTable">
        <thead>
          <tr>
            <th>
              {this.isArabic()
                ? "\u0627\u0644\u0639\u0646\u0648\u0627\u0646"
                : "Title"}
            </th>
            <th>
              {this.isArabic()
                ? "\u0627\u0644\u0645\u062f\u0631\u0633\u0648\u0646"
                : "Instructors"}
            </th>
            <th>
              {this.isArabic()
                ? "\u0627\u0644\u0643\u062a\u0651\u0627\u0628"
                : "Writer"}
            </th>
            <th>
              {this.isArabic()
                ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0634\u0631"
                : "Publish Date"}
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
          {visibleLectures.length === 0 && !inlineLectureRowVisible && (
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
        <section
          id="nogaPlanner_lectures_section"
          className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--monitor"
        >
          <div className="nogaPlanner_monitorEmpty fc">
            {this.isArabic()
              ? "اختر مقرراً أو محاضرة من القائمة لعرض التفاصيل."
              : "Select a course or lecture from the list to view details."}
          </div>
        </section>
      );
    }
    if (plannerTab === "courses") {
      // Show course details
      return (
        <section
          id="nogaPlanner_lectures_section"
          className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--monitor"
        >
          <div className="nogaPlanner_monitorDetails fc">
            <h2>{item.course_name}</h2>
            <p>
              {formatCourseComponentLabel(
                item.course_component || item.course_class,
                this.isArabic() ? "ar" : "en",
              )}
            </p>
            <p>{formatCourseScheduleDisplay(item.course_dayAndTime)}</p>
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
          <div className="nogaPlanner_monitorDetails fc">
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
      savedCourseEditorVisible: false,
      savedCourseEditorMode: "add",
      savedCourseDraft: getDefaultSavedCourseDraft(),
      savedCourseSelectionMode: false,
      selectedSavedCourseIds: [],
      savedCourseDetailsComponentId: "",
      savedCourseSortKey: "course_name",
      savedCourseSortDirection: "asc",
      inlineLectureRowVisible: false,
      inlineLectureDraft: getDefaultInlineLectureDraft(),
    };

    this.coursePrintAudio = null;
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts = [];
    this.courseActionsPointerState = null;
    this.plannerArticleRef = React.createRef();
    this.courseActionsWindowRef = React.createRef();
    this.lectureActionsWindowRef = React.createRef();
    this.telegramSyncStatusTimeout = null;
    this.courseActionsSnapTimeout = null;
    this.isComponentMounted = false;
    this.plannerSwipeStart = null;
    this.lectureActionsPointerState = null;
    this.lectureActionsSnapTimeout = null;
    this.telegramPdfObjectUrl = "";
    this.telegramCourseSuggestionStatusTimeout = null;
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
    if (this.props.state?.my_id) {
      this.retrieveCourses();
      this.retrieveLectures();
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.state?.my_id &&
      prevProps.state?.my_id !== this.props.state?.my_id
    ) {
      this.retrieveCourses();
      this.retrieveLectures();
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

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
      return course.course_exams;
    }

    if (course.exam_date || course.exam_time || course.exam_type) {
      return [
        {
          exam_type: course.exam_type || "-",
          exam_date: course.exam_date || "-",
          exam_time: course.exam_time || "-",
          course_grade: course.course_grade || "-",
          course_fullGrade: course.course_fullGrade || "-",
        },
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

  openAddExamForm = (mode = "Add") => {
    const selectedCourse = this.getSelectedCourse();
    const examEntries = this.getRenderableCourseExamEntries(selectedCourse);
    const selectedExamIndex = this.state.selected_exam_index;
    const safeMode = mode === "Edit" ? "Edit" : "Add";
    const targetExam =
      safeMode === "Edit" && selectedExamIndex >= 0
        ? examEntries[selectedExamIndex] || null
        : null;

    this.setState(
      {
        show_addExamForm: true,
        exam_form_mode: safeMode,
        exam_form_index: safeMode === "Edit" ? selectedExamIndex : -1,
      },
      () => {
        this.setElementValueById(
          "nogaPlanner_addExam_examType_input",
          targetExam?.exam_type || "Exam type",
        );
        const examDateParts = formatExamDateParts(targetExam?.exam_date);
        this.setElementValueById(
          "nogaPlanner_addExam_examDate_day_input",
          examDateParts.day,
        );
        this.setElementValueById(
          "nogaPlanner_addExam_examDate_month_input",
          examDateParts.month,
        );
        this.setElementValueById(
          "nogaPlanner_addExam_examDate_year_input",
          examDateParts.year,
        );
        const examTimeParts = formatExamTimeParts(targetExam?.exam_time);
        this.setElementValueById(
          "nogaPlanner_addExam_examTime_hour_input",
          examTimeParts.hour,
        );
        this.setElementValueById(
          "nogaPlanner_addExam_examTime_minute_input",
          examTimeParts.minute,
        );
        this.setElementValueById(
          "nogaPlanner_addExam_grade_input",
          targetExam?.course_grade || "",
        );
        this.setElementValueById(
          "nogaPlanner_addExam_fullGrade_input",
          targetExam?.course_fullGrade || "",
        );
      },
    );
  };

  closeAddExamForm = () => {
    this.setState({
      show_addExamForm: false,
      exam_form_mode: "Add",
      exam_form_index: -1,
    });
  };

  saveCourseExamEntries = async (course, nextExamEntries = []) => {
    if (!course?._id || !this.props.state?.my_id) {
      return;
    }

    const cleanedExamEntries = nextExamEntries.map((examEntry) => ({
      exam_type: String(examEntry?.exam_type || "-").trim() || "-",
      exam_date: String(examEntry?.exam_date || "-").trim() || "-",
      exam_time: String(examEntry?.exam_time || "-").trim() || "-",
      course_grade: String(examEntry?.course_grade || "").trim(),
      course_fullGrade: String(examEntry?.course_fullGrade || "").trim(),
    }));
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
    const selectedCourse = this.getSelectedCourse();

    if (!selectedCourse) {
      return;
    }

    const exam_type =
      document.getElementById("nogaPlanner_addExam_examType_input")?.value ||
      "";
    const exam_date = buildExamDateValue({
      day:
        document.getElementById("nogaPlanner_addExam_examDate_day_input")
          ?.value || "",
      month:
        document.getElementById("nogaPlanner_addExam_examDate_month_input")
          ?.value || "",
      year:
        document.getElementById("nogaPlanner_addExam_examDate_year_input")
          ?.value || "",
    });
    const exam_time = buildExamTimeValue({
      hour:
        document.getElementById("nogaPlanner_addExam_examTime_hour_input")
          ?.value || "",
      minute:
        document.getElementById("nogaPlanner_addExam_examTime_minute_input")
          ?.value || "",
    });
    const course_grade =
      document.getElementById("nogaPlanner_addExam_grade_input")?.value || "";
    const course_fullGrade =
      document.getElementById("nogaPlanner_addExam_fullGrade_input")?.value ||
      "";

    if (!exam_type || !exam_date || !exam_time) {
      return;
    }

    const currentExamEntries =
      this.getRenderableCourseExamEntries(selectedCourse);
    const nextExamEntries = currentExamEntries.slice();
    const nextExam = {
      exam_type,
      exam_date,
      exam_time,
      course_grade,
      course_fullGrade,
    };

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
    const editingCourseId = String(
      this.state?.savedCourseDetailsComponentId ||
        selectedSavedCourseIds[0] ||
        this.state?.selectedCourseForLecturesId ||
        "",
    ).trim();
    const shouldShowSelectedCourseLectures =
      Boolean(selectedComponentId) &&
      !savedCourseSelectionMode &&
      !(savedCourseEditorVisible && savedCourseEditorMode === "edit");
    const shouldShowInlineCourseRow =
      savedCourseEditorVisible && savedCourseEditorMode === "add";
    const selectedLectureDeleteCount = Array.isArray(deleteSelectionIds)
      ? deleteSelectionIds.length
      : 0;
    const sortedSavedCourses = this.getSortedSavedCourses(savedCourses);
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
    const renderSavedCourseEditorRow = (rowKey = "editor") => (
      <tr
        key={rowKey}
        className="nogaPlanner_tabTableRow nogaPlanner_tabTableRow--editor"
      >
        <td className="nogaPlanner_tabTableCell--stacked">
          <input
            className="nogaPlanner_savedCoursesDetailsInput"
            type="text"
            value={savedCourseDraft.course_name}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_name", event.target.value)
            }
            placeholder={this.isArabic() ? "اسم المقرر" : "Course name"}
          />
          <input
            className="nogaPlanner_savedCoursesDetailsInput"
            type="text"
            value={savedCourseDraft.course_code}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_code", event.target.value)
            }
            placeholder={this.isArabic() ? "رمز المقرر" : "Course code"}
          />
        </td>
        <td className="nogaPlanner_tabTableCell--stacked">
          <select
            className="nogaPlanner_savedCoursesDetailsInput"
            value={savedCourseDraft.course_class}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_class", event.target.value)
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
        </td>
        <td className="nogaPlanner_tabTableCell--stacked">
          <select
            className="nogaPlanner_savedCoursesDetailsInput"
            value={savedCourseDraft.course_year}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_year", event.target.value)
            }
          >
            <option value="">
              {this.isArabic() ? "السنة الأكاديمية" : "Academic year"}
            </option>
            {ACADEMIC_YEAR_OPTIONS.map((optionValue) => (
              <option key={optionValue} value={optionValue}>
                {optionValue}
              </option>
            ))}
          </select>
          <select
            className="nogaPlanner_savedCoursesDetailsInput"
            value={savedCourseDraft.course_term}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_term", event.target.value)
            }
          >
            <option value="">{this.isArabic() ? "الفصل" : "Term"}</option>
            {TERM_OPTIONS.map((optionValue) => (
              <option key={optionValue.value} value={optionValue.value}>
                {this.isArabic() ? optionValue.labelAr : optionValue.labelEn}
              </option>
            ))}
          </select>
        </td>
        <td className="nogaPlanner_tabTableCell--stacked">
          <div className="nogaPlanner_savedCoursesDetailsInputs">
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
              <option value="">{this.isArabic() ? "اليوم" : "Day"}</option>
              {WEEKDAY_OPTIONS.map((optionValue) => (
                <option
                  key={optionValue.key}
                  value={
                    this.isArabic() ? optionValue.labelAr : optionValue.labelEn
                  }
                >
                  {this.isArabic() ? optionValue.labelAr : optionValue.labelEn}
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
              <option value="">{this.isArabic() ? "الساعة" : "Hour"}</option>
              {HOUR_OPTIONS.map((optionValue) => (
                <option key={optionValue.value} value={optionValue.value}>
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
          <div className="nogaPlanner_savedCoursesScheduleChips fr">
            {splitCourseTextList(savedCourseDraft.course_dayAndTime).map(
              (entry, entryIndex) => (
                <button
                  key={`${rowKey}-schedule-${entryIndex}`}
                  type="button"
                  className="nogaPlanner_savedCoursesScheduleChip"
                  onClick={() => this.removeSavedCourseScheduleEntry(entryIndex)}
                >
                  {entry}
                </button>
              ),
            )}
          </div>
        </td>
        <td className="nogaPlanner_tabTableCell--stacked">
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
        </td>
        <td className="nogaPlanner_tabTableCell--stacked">
          <input
            className="nogaPlanner_savedCoursesDetailsInput"
            type="text"
            value={savedCourseDraft.course_grade}
            onChange={(event) =>
              this.handleSavedCourseDraftChange("course_grade", event.target.value)
            }
            placeholder={this.isArabic() ? "الوزن" : "Weight"}
          />
        </td>
      </tr>
    );

    return (
      <section
        id="nogaPlanner_savedCoursesColumn"
        className="nogaPlanner_homeSoulPanel fc"
      >
        <div className="nogaPlanner_savedCoursesColumnHeader fc">
          <div className="nogaPlanner_coursesTitleRow fr">
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
            <div className="nogaPlanner_coursesMiniBar fr">
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
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.handleMiniBarDelete}
                    aria-pressed={deleteSelectionMode}
                  >
                    {deleteSelectionMode
                      ? this.isArabic()
                        ? `حذف (${selectedLectureDeleteCount})`
                        : `Delete (${selectedLectureDeleteCount})`
                      : this.t("deleteLecture")}
                  </button>
                  {deleteSelectionMode ? (
                    <button
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={this.clearLectureSelection}
                    >
                      {this.isArabic() ? "إلغاء التحديد" : "De-select"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.handleBackToCoursesTab}
                  >
                    {this.isArabic() ? "رجوع للمواد" : "Back to Courses"}
                  </button>
                </>
              ) : savedCourseEditorVisible ? (
                <>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.submitSavedCourseEditor}
                  >
                    {this.t("save")}
                  </button>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.closeSavedCourseEditor}
                  >
                    {this.t("close")}
                  </button>
                </>
              ) : (
                <>
                  {selectedDetailsCourse ? (
                    <>
                      <div className="nogaPlanner_coursesMiniBarGroup fr">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={() => this.openSavedCourseEditor("edit")}
                          disabled={!canEditSelectedCourse}
                        >
                          {this.isArabic() ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={this.closeSavedCourseComponentDetails}
                        >
                          {this.isArabic()
                            ? "إغلاق التفاصيل"
                            : "Close Details"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="nogaPlanner_coursesMiniBarGroup fr">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={this.enableSavedCourseSelectionMode}
                          aria-pressed={savedCourseSelectionMode}
                        >
                          {savedCourseSelectionMode
                            ? this.isArabic()
                              ? `إلغاء التحديد (${selectedSavedCoursesCount})`
                              : `De-select (${selectedSavedCoursesCount})`
                            : this.isArabic()
                              ? "تحديد"
                              : "Select"}
                        </button>
                      </div>
                      <div className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete fr">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={
                            shouldShowSelectedCourseLectures
                              ? this.openInlineLectureRow
                              : () => this.openSavedCourseEditor("add")
                          }
                        >
                          {shouldShowSelectedCourseLectures
                            ? this.isArabic()
                              ? "إضافة محاضرة"
                              : "Add Lecture"
                            : this.isArabic()
                              ? "إضافة"
                              : "Add"}
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={() => this.openSavedCourseEditor("edit")}
                          disabled={!canEditSelectedCourse}
                        >
                          {this.isArabic() ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={this.deleteSelectedSavedCourse}
                          disabled={!canDeleteSelectedCourses}
                        >
                          {this.isArabic() ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="nogaPlanner_savedCoursesColumnBody">
            {shouldShowSelectedCourseLectures ? (
              this.renderSelectedCourseLecturesTable()
            ) : (
              <table className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() => this.handleSavedCourseSort("course_name")}
                      >
                        {renderSavedCourseSortLabel(
                          "course_name",
                          this.isArabic() ? "اسم المقرر" : "Course Name",
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() => this.handleSavedCourseSort("course_class")}
                      >
                        {renderSavedCourseSortLabel(
                          "course_class",
                          this.isArabic() ? "نوع المكون" : "Component Class",
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() =>
                          this.handleSavedCourseSort("course_year_term")
                        }
                      >
                        {renderSavedCourseSortLabel(
                          "course_year_term",
                          this.isArabic()
                            ? "السنة الأكاديمية والفصل"
                            : "Academic Year and Term",
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() => this.handleSavedCourseSort("course_schedule")}
                      >
                        {renderSavedCourseSortLabel(
                          "course_schedule",
                          this.isArabic() ? "الجدول" : "Schedule",
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() => this.handleSavedCourseSort("course_location")}
                      >
                        {renderSavedCourseSortLabel(
                          "course_location",
                          this.isArabic() ? "الموقع" : "Location",
                        )}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="nogaPlanner_tabTableSortButton"
                        onClick={() => this.handleSavedCourseSort("course_grade")}
                      >
                        {renderSavedCourseSortLabel(
                          "course_grade",
                          this.isArabic() ? "الوزن" : "Weight",
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shouldShowInlineCourseRow
                    ? renderSavedCourseEditorRow("saved-course-add-row")
                    : null}
                  {sortedSavedCourses.length === 0 && !shouldShowInlineCourseRow ? (
                    <tr>
                      <td
                        colSpan={6}
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
                    const isEditingRow =
                      savedCourseEditorVisible &&
                      savedCourseEditorMode === "edit" &&
                      courseId === editingCourseId;
                    const isSelected =
                      selectedSavedCourseIds.includes(courseId) ||
                      selectedComponentId === courseId ||
                      selectedDetailsComponentId === courseId;

                    if (isEditingRow) {
                      return renderSavedCourseEditorRow(
                        `saved-course-edit-${courseId}`,
                      );
                    }

                    return (
                      <tr
                        key={courseId || buildCourseDuplicateKey(course)}
                        className={
                          "nogaPlanner_tabTableRow" +
                          (isSelected ? " selected" : "")
                        }
                        onClick={() => this.handleSavedCourseGroupClick(course)}
                      >
                        <td style={getCellAlignmentStyle(course.course_name)}>
                          {course.course_name || "-"}
                        </td>
                        <td
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
                            formatAcademicYearAndTerm(
                              course,
                              this.isArabic() ? "ar" : "en",
                            ),
                          )}
                        >
                          {formatAcademicYearAndTerm(
                            course,
                            this.isArabic() ? "ar" : "en",
                          )}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            formatCourseScheduleDisplay(course.course_dayAndTime),
                          )}
                        >
                          {formatCourseScheduleDisplay(course.course_dayAndTime)}
                        </td>
                        <td
                          style={getCellAlignmentStyle(
                            formatCourseLocationDisplay(course.course_location),
                          )}
                        >
                          {formatCourseLocationDisplay(course.course_location)}
                        </td>
                        <td style={getCellAlignmentStyle(course.course_grade || "-")}>
                          {course.course_grade || "-"}
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
    const courseEntries = Array.isArray(this.state?.courses) ? this.state.courses : [];
    const examRows = courseEntries.flatMap((course) =>
      this.getRenderableCourseExamEntries(course).map((examEntry, examIndex) => ({
        course,
        examEntry,
        examIndex,
      })),
    );

    return (
      <section className="nogaPlanner_homeSoulPanel fc">
        <div className="nogaPlanner_savedCoursesColumnHeader fc">
          <div className="nogaPlanner_coursesTitleRow fr">
            <div className="fc">
              <p className="nogaPlanner_homeSoulEyebrow">
                {this.isArabic() ? "الامتحانات" : "Exams"}
              </p>
              <h2 className="nogaPlanner_homeSoulTitle">
                {this.isArabic() ? "لوحة الامتحانات" : "Exams board"}
              </h2>
            </div>
          </div>
          <div className="nogaPlanner_savedCoursesColumnBody">
            <table className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable">
              <thead>
                <tr>
                  <th>{this.isArabic() ? "المقرر" : "Course"}</th>
                  <th>{this.isArabic() ? "النوع" : "Type"}</th>
                  <th>{this.isArabic() ? "التاريخ" : "Date"}</th>
                  <th>{this.isArabic() ? "الوقت" : "Time"}</th>
                  <th>{this.isArabic() ? "الوزن" : "Weight"}</th>
                </tr>
              </thead>
              <tbody>
                {examRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
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
                  examRows.map(({ course, examEntry, examIndex }) => (
                    <tr
                      key={`${course?._id || course?.course_name || "course"}-${examIndex}`}
                      className="nogaPlanner_tabTableRow"
                      onClick={() =>
                        this.setSelectedCourseWithExamFocus(course?._id, examIndex)
                      }
                    >
                      <td style={getCellAlignmentStyle(course?.course_name || "-")}>
                        {course?.course_name || "-"}
                      </td>
                      <td style={getCellAlignmentStyle(examEntry?.exam_type || "-")}>
                        {examEntry?.exam_type || "-"}
                      </td>
                      <td style={getCellAlignmentStyle(examEntry?.exam_date || "-")}>
                        {examEntry?.exam_date || "-"}
                      </td>
                      <td style={getCellAlignmentStyle(examEntry?.exam_time || "-")}>
                        {examEntry?.exam_time || "-"}
                      </td>
                      <td
                        style={getCellAlignmentStyle(
                          examEntry?.course_grade || course?.course_grade || "-",
                        )}
                      >
                        {examEntry?.course_grade || course?.course_grade || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  render() {
    const wrapperTab = this.state.wrapperTab === "exams" ? "exams" : "courses";

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
        >
          <div className="fc" id="nogaPlanner_coursesLectures_wrapper">
            <div className="nogaPlanner_wrapperTabs fr">
              <button
                type="button"
                className={
                  "nogaPlanner_wrapperTabBtn" +
                  (wrapperTab === "courses"
                    ? " nogaPlanner_wrapperTabBtn--active"
                    : "")
                }
                onClick={() => this.handleWrapperTabChange("courses")}
              >
                {this.isArabic() ? "المقررات" : "Courses"}
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_wrapperTabBtn" +
                  (wrapperTab === "exams"
                    ? " nogaPlanner_wrapperTabBtn--active"
                    : "")
                }
                onClick={() => this.handleWrapperTabChange("exams")}
              >
                {this.isArabic() ? "الامتحانات" : "Exams"}
              </button>
            </div>
            <div className="nogaPlanner_wrapperTabPanel fc">
              {wrapperTab === "courses"
                ? this.renderSavedCoursesColumn()
                : this.renderSelectedCourseExamBoard()}
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
