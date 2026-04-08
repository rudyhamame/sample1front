//..............IMPORT................
import React, { Component } from "react";
import ReactDOM from "react-dom";
import "./nogaPlanner.css";
import "./nogaPlanner.dark.css";
import { apiUrl } from "../config/api";
import Nav from "../Nav/Nav";
import { getHomeSubApps } from "../utils/homeSubApps";

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

const getDefaultInlineCourseDraft = () => ({
  course_component: "",
  course_name: "",
  course_class: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_instructorSelection: "",
  course_instructorCustomInput: "",
  course_year: "",
  course_term: "",
  course_status: "",
  course_instructors: "",
  course_grade: "",
  course_fullGrade: "",
  course_length: "0",
  course_progress: "0",
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
    course_year: String(course?.course_year || "-").trim() || "-",
    course_term: String(course?.course_term || "-").trim() || "-",
    course_class: String(course?.course_class || "-").trim() || "-",
    course_status: String(course?.course_status || "-").trim() || "-",
    course_instructors: formatCourseStringListDisplay(
      course?.course_instructors,
    ),
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
    course_year: String(draft?.course_year || "-").trim() || "-",
    course_term: String(draft?.course_term || "-").trim() || "-",
    course_class: String(draft?.course_class || "-").trim() || "-",
    course_status: String(draft?.course_status || "-").trim() || "-",
    course_instructors: splitCourseTextList(draft?.course_instructors),
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

const SCHOOLPLANNER_TRANSLATIONS = {
  en: {
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    close: "Close",
    send: "Send",
    search: "Search",
    reset: "Reset",
    save: "Save",
    saving: "Saving...",
    loadMore: "Load more",
    loadingArchive: "Loading Archive",
    timer: "Timer",
    minutesShort: "Min",
    secondsShort: "Sec",
    startTimer: "Start timer",
    pauseTimer: "Pause timer",
    resetTimer: "Reset timer",
    timerFinished: "Time is over",
    loadingTelegramMessages: "Loading Telegram messages...",
    noTelegramMessagesYet: "No Telegram messages found yet.",
    noTelegramPdfsYet: "No synced PDFs found yet.",
    noStoredMessagesYet: "No stored messages yet",
    notSyncedYet: "Not synced yet",
    plannerControl: "Planner Control",
    planDays: "Plan days",
    dailyLoad: "Daily load",
    messageDesk: "Message Desk",
    telegram: "Telegram",
    archiveAndSearch: "Archive + search",
    planDaysCopy:
      "Review the study load for each day and keep the week balanced before printing or sending updates.",
    telegramDeskCopy:
      "Connect one group, archive its history, search it cheaply, and send planner notes from the same control side.",
    telegramControl: "Telegram Control",
    groupReference: "Group / Channel reference",
    historyStartDate: "History start date",
    groupReferencePlaceholder: "@groupname, @channelname, or chat link",
    telegramGroupsLabel: "Groups",
    telegramSupergroupsLabel: "Supergroups",
    telegramChannelsLabel: "Channels",
    telegramSearchPlaceholder: "Search messages",
    telegramMessagesTab: "Messages",
    telegramPdfsTab: "PDFs",
    telegramHint:
      "Save a group reference and a history start date once. The backend will archive old messages from that date and keep storing new ones automatically.",
    storedMessages: "Stored messages",
    lastSync: "Last sync",
    lastStoredMessage: "Last stored message",
    courseInformation: "Course information",
    examInformation: "Exam information",
    noExamEntries: "No exam entries.",
    courseNote: "Course note",
    courseName: "Course name",
    courseTime: "Course time",
    courseYear: "Course year",
    courseTerm: "Course term",
    courseYearTerm: "Course year/term",
    courseClass: "Course class",
    courseStatus: "Course status",
    courseInstructors: "Course instructors",
    actualGrade: "Actual grade",
    courseLength: "Course length",
    courseProgress: "Course progress",
    fullGrade: "Full grade",
    coursePages: "Course pages",
    targetPagesPerDay: "Target pages to study per day",
    examType: "Exam type",
    examDate: "Exam date",
    examTime: "Exam time",
    grades: "Grades",
    examDue: "Exam due",
    lectureDetails: "Lecture details",
    title: "Title",
    course: "Course",
    instructor: "Instructor",
    writer: "Writer",
    date: "Date",
    corrections: "Corrections",
    noCorrectionsYet: "No corrections yet.",
    noCorrectionsForLectureYet:
      "No corrections were added for this lecture yet.",
    writerLabel: "Writer",
    page: "Page {page}",
    toggleFinishedPages: "Toggle finished pages",
    hideLecturePages: "Hide lecture pages",
    showLecturePages: "Show lecture pages",
    telegramSummary: "Telegram summary",
    noLectureTelegramMatchesYet:
      "No lecture-specific Telegram notes were matched yet.",
    matchedTerms: "Matched terms",
    matchedTermsUnavailable: "Matched terms unavailable",
    latestRelatedMessage: "Latest related message",
    unknownTime: "Unknown time",
    unknown: "Unknown",
    noText: "[No text]",
    addLecture: "Add lecture",
    deleteLecture: "Delete lecture",
    hideUncheckedLectures: "Hide unchecked lectures",
    unhideUncheckedLectures: "Unhide unchecked lectures",
    searchPlaceholder: "search",
    titleHeader: "Title",
    courseHeader: "Course",
    instructorNameHeader: "Instructor name",
    writerNameHeader: "Writer name",
    lectureNamePlaceholder: "Lecture name",
    lectureCoursePlaceholder: "Lecture course",
    lectureInstructorPlaceholder: "Lecture instructor name",
    lectureWriterPlaceholder: "Lecture writer name",
    lectureLengthPlaceholder: "Lecture length",
    correctionPagePlaceholder: "Correction page",
    correctionNotePlaceholder: "Correction note",
    lectureOutlinePlaceholder: "Lecture outline",
    courseNamePlaceholder: "Course name",
    courseComponentPlaceholder: "Course component",
    inClass: "In-class",
    outOfClass: "Out-of-class",
    courseDayPlaceholder: "Course day",
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    courseYearPlaceholder: "Course year",
    courseTermPlaceholder: "Course term",
    fall: "Fall",
    winter: "Winter",
    summer: "Summer",
    courseClassificationPlaceholder: "Course classification",
    inClassGroup: "IN-CLASS",
    outOfClassGroup: "OUT-OF-CLASS",
    basicScience: "Basic science",
    appliedScience: "Applied science",
    lab: "Lab",
    clinicalRotation: "Clinical rotation",
    courseStatusPlaceholder: "Course status",
    unstarted: "Unstarted",
    ongoing: "Ongoing",
    pass: "Pass",
    fail: "Fail",
    courseInstructorsPlaceholder: "Course instructors",
    examDateLabel: "Exam date",
    examTimeLabel: "Exam time",
    examTypeLabel: "Exam type",
    gradesLabel: "Grades",
    quiz: "Quiz",
    midterm: "Midterm",
    final: "Final",
    practical: "Practical",
    oral: "Oral",
    postingFailedPleaseAddCourseName: "Posting failed. Please add course name",
    music: "Music",
    telegramGroup: "Telegram Group",
    showingResults:
      "Showing {count} result(s) from {rawCount} fetched message(s)",
    pagesFinishedSummary:
      "{progress} / {length} pages finished | {remaining} remaining | {percent}%",
    finishedPages: "Finished pages",
    remainingPages: "Remaining pages",
    none: "None",
    unknownDay: "Unknown day",
  },
  ar: {
    add: "اضافة",
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
    startTimer: "ابدأ المؤقت",
    pauseTimer: "أوقف المؤقت",
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
        selectedCourseForLecturesName: String(
          selectedCourse.course_name || "",
        ).trim(),
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
        },
        () => {
          this.fetchTelegramInstructorSuggestions();
          this.fetchInlineCoursePredictions();
        },
      );
      return;
    }

    this.openAddLectureForm({ buttonName: "Add" });
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

    const currentValue = String(this.state.inlineCourseDraft?.[fieldName] || "");
    const normalizedValue = currentValue
      .replace(/\s*(\||\n|;)\s*$/, "")
      .trim();

    if (!normalizedValue) {
      return;
    }

    this.handleInlineCourseFieldChange(fieldName, `${normalizedValue} | `);
  };

  appendInlineCourseDayTimeEntry = () => {
    const dayValue = String(this.state.inlineCourseDraft?.course_daySelection || "").trim();
    const timeValue = String(this.state.inlineCourseDraft?.course_timeSelection || "").trim();

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

      const instructorNames = (Array.isArray(payload?.instructors)
        ? payload.instructors
        : []
      )
        .flatMap((entry) => {
          if (typeof entry === "string") {
            return [entry];
          }

          return [entry?.name, entry?.instructorName, entry?.value];
        })
        .map((entry) => String(entry || "").trim())
        .filter((entry) => Boolean(entry) && entry !== "-" && entry !== "(pending)");

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
          inlineCoursePredictions: this.sortTelegramCourseSuggestionsByConfidence(
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
        course_year: editableDraft.course_year,
        course_term: editableDraft.course_term,
        course_class: editableDraft.course_class,
        course_status: editableDraft.course_status,
        course_instructors: editableDraft.course_instructors,
        course_grade: editableDraft.course_grade,
        course_fullGrade: editableDraft.course_fullGrade,
        course_length: editableDraft.course_length,
        course_progress: editableDraft.course_progress,
      },
    }));
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

    const normalizedComponent =
      String(inlineCourseDraft?.course_component || "").trim() || "-";
    const parsedLength = Number(inlineCourseDraft?.course_length);
    const parsedProgress = Number(inlineCourseDraft?.course_progress);

    const payload = {
      course_name:
        normalizedComponent === "-"
          ? trimmedName
          : `${trimmedName} (${normalizedComponent})`,
      course_component: normalizedComponent,
      course_dayAndTime: this.splitInlineCourseMultiValue(
        inlineCourseDraft?.course_dayAndTime,
      ),
      course_year: String(inlineCourseDraft?.course_year || "").trim() || "-",
      course_term: String(inlineCourseDraft?.course_term || "").trim() || "-",
      course_class: String(inlineCourseDraft?.course_class || "").trim() || "-",
      course_status:
        String(inlineCourseDraft?.course_status || "").trim() || "-",
      course_instructors: this.splitInlineCourseMultiValue(
        inlineCourseDraft?.course_instructors,
      ),
      course_grade: String(inlineCourseDraft?.course_grade || "").trim(),
      course_fullGrade: String(
        inlineCourseDraft?.course_fullGrade || "",
      ).trim(),
      course_length: Number.isFinite(parsedLength) ? parsedLength : 0,
      course_progress: Number.isFinite(parsedProgress) ? parsedProgress : 0,
      course_exams: [],
      exam_type: "-",
      exam_date: "-",
      exam_time: "-",
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
      inlineCourseFormTab,
      inlineCoursePredictions,
      inlineCoursePredictionsLoading,
      inlineCoursePredictionsError,
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
              <div className="fr" style={{ gap: "6px" }}>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() => this.setState({ inlineCourseFormTab: "traditional" })}
                  style={{
                    opacity: inlineCourseFormTab === "traditional" ? 1 : 0.7,
                  }}
                >
                  {this.isArabic() ? "تقليدي" : "Traditional"}
                </button>
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={() => {
                    this.setState({ inlineCourseFormTab: "predictions" });
                    this.fetchInlineCoursePredictions();
                  }}
                  style={{
                    opacity: inlineCourseFormTab === "predictions" ? 1 : 0.7,
                  }}
                >
                  {this.isArabic() ? "بالتوقعات" : "By predictions"}
                </button>
              </div>
              {inlineCourseFormTab === "traditional" ? (
                <>
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
                </>
              ) : (
                <div className="fc" style={{ gap: "8px" }}>
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={this.fetchInlineCoursePredictions}
                  >
                    {this.isArabic() ? "تحديث التوقعات" : "Refresh predictions"}
                  </button>
                  {inlineCoursePredictionsLoading && (
                    <p style={{ opacity: 0.8 }}>
                      {this.isArabic() ? "جارٍ التحميل..." : "Loading..."}
                    </p>
                  )}
                  {!inlineCoursePredictionsLoading &&
                    inlineCoursePredictionsError && (
                      <p style={{ color: "var(--red2)" }}>
                        {inlineCoursePredictionsError}
                      </p>
                    )}
                  {!inlineCoursePredictionsLoading &&
                    !inlineCoursePredictionsError &&
                    (Array.isArray(inlineCoursePredictions)
                      ? inlineCoursePredictions
                      : []
                    ).length === 0 && (
                      <p style={{ opacity: 0.7 }}>
                        {this.isArabic()
                          ? "لا توجد توقعات محفوظة بعد."
                          : "No saved predictions yet."}
                      </p>
                    )}
                  {(Array.isArray(inlineCoursePredictions)
                    ? inlineCoursePredictions
                    : []
                  )
                    .slice(0, 10)
                    .map((suggestion, suggestionIndex) => {
                      const payload = suggestion?.coursePayload || suggestion || {};
                      const suggestionTitle = String(payload?.course_name || "").trim();
                      const suggestionComponent = String(
                        payload?.course_component || "",
                      ).trim();

                      return (
                        <div
                          key={
                            suggestion?.suggestionKey ||
                            `${suggestionTitle || "prediction"}-${suggestionIndex}`
                          }
                          className="fc"
                          style={{
                            gap: "4px",
                            padding: "8px",
                            border: "1px solid var(--nogaPlanner-border)",
                            borderRadius: "10px",
                          }}
                        >
                          <strong>{suggestionTitle || "-"}</strong>
                          <span style={{ opacity: 0.8 }}>
                            {suggestionComponent || "-"}
                          </span>
                          <button
                            type="button"
                            className="nogaPlanner_coursesMiniBarBtn"
                            onClick={() => this.applyInlinePredictionToDraft(suggestion)}
                          >
                            {this.isArabic() ? "استخدم" : "Use prediction"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </aside>
          )}
        </div>
      </aside>
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
              ? "اختر مقررًا أو محاضرة من القائمة لعرض التفاصيل."
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
            <p>{item.course_component}</p>
            <p>
              {item.course_instructors && item.course_instructors.join(", ")}
            </p>
            <p>
              {item.course_year} {item.course_term}
            </p>
            {/* Add more course fields as needed */}
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

  renderSelectedCourseExamBoard = () => {
    const selectedCourse = this.getSelectedCourse();
    const examEntries = this.getRenderableCourseExamEntries(selectedCourse);
    const examActionItems = [
      {
        key: "add",
        label: this.t("add"),
        onClick: () => this.openAddExamForm("Add"),
      },
      {
        key: "edit",
        label: this.t("edit"),
        onClick: () => this.openAddExamForm("Edit"),
      },
      {
        key: "delete",
        label: this.t("delete"),
        onClick: this.deleteSelectedExam,
      },
    ];
    const orderedExamActionItems = this.isArabic()
      ? [...examActionItems].reverse()
      : examActionItems;

    return (
      <section
        id="nogaPlanner_exam_section"
        className="nogaPlanner_homeSoulPanel nogaPlanner_homeSoulPanel--exam"
      >
        <nav id="nogaPlanner_exam_nav" className="fc">
          <div className="nogaPlanner_examHeaderTop fr">
            <div className="nogaPlanner_examHeaderCopy fc">
              <p className="nogaPlanner_homeSoulEyebrow">
                {this.isArabic() ? "الامتحانات" : "Exams"}
              </p>
              <h2 className="nogaPlanner_homeSoulTitle">
                {this.isArabic() ? "لوحة الامتحانات" : "Exam board"}
              </h2>
              <p className="nogaPlanner_homeSoulSubtitle">
                {selectedCourse
                  ? this.isArabic()
                    ? `المقرر الحالي: ${selectedCourse.course_name || "-"}`
                    : `Current course: ${selectedCourse.course_name || "-"}`
                  : this.isArabic()
                    ? "احتفظ بمواعيد الامتحانات ودرجات المقرر المحدد بجانب لوحة المحاضرات."
                    : "Keep the selected course exams and grades visible beside the lecture board."}
              </p>
            </div>
          </div>
        </nav>
        <div id="nogaPlanner_exam_body" className="fc">
          {!selectedCourse ? (
            <p id="nogaPlanner_exam_empty">
              {this.isArabic() ? "لم يتم اختيار مقرر." : "No course selected."}
            </p>
          ) : examEntries.length === 0 ? (
            <p id="nogaPlanner_exam_empty">{this.t("noExamEntries")}</p>
          ) : (
            <ul id="nogaPlanner_exam_ul" className="fc">
              {examEntries.map((examEntry, examIndex) => (
                <li
                  key={`${selectedCourse._id || "course"}-exam-${examIndex}`}
                  className={`nogaPlanner_exam_li fc ${
                    this.state.selected_exam_index === examIndex
                      ? "nogaPlanner_exam_li--selected"
                      : ""
                  }`.trim()}
                  onClick={() =>
                    this.setState({ selected_exam_index: examIndex })
                  }
                >
                  <div className="nogaPlanner_exam_liHeader fr">
                    <p className="nogaPlanner_exam_courseName">
                      {selectedCourse.course_name || "-"}
                    </p>
                    <span className="nogaPlanner_exam_typeBadge">
                      {examEntry.exam_type || "-"}
                    </span>
                  </div>
                  <div className="nogaPlanner_exam_metaGrid">
                    <div className="nogaPlanner_exam_metaItem fc">
                      <span className="nogaPlanner_exam_metaLabel">
                        {this.t("examDate")}
                      </span>
                      <strong className="nogaPlanner_exam_metaValue">
                        {examEntry.exam_date || "-"}
                      </strong>
                    </div>
                    <div className="nogaPlanner_exam_metaItem fc">
                      <span className="nogaPlanner_exam_metaLabel">
                        {this.t("examTime")}
                      </span>
                      <strong className="nogaPlanner_exam_metaValue">
                        {examEntry.exam_time || "-"}
                      </strong>
                    </div>
                    <div className="nogaPlanner_exam_metaItem fc">
                      <span className="nogaPlanner_exam_metaLabel">
                        {this.t("grades")}
                      </span>
                      <strong className="nogaPlanner_exam_metaValue">
                        {examEntry.course_grade || "-"} /{" "}
                        {examEntry.course_fullGrade || "-"}
                      </strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="nogaPlanner_exam_actionsShell" className="fc">
          <div id="nogaPlanner_exam_actionsWindow" className="fr">
            {orderedExamActionItems.map((actionItem) => (
              <button
                key={actionItem.key}
                className="nogaPlanner_courses_actionChip fr"
                type="button"
                data-action-key={actionItem.key}
                onClick={actionItem.onClick}
              >
                <span>{actionItem.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
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

  t = (key, replacements = {}) => {
    const localeKey = this.isArabic() ? "ar" : "en";
    const translatedValue = SCHOOLPLANNER_TRANSLATIONS[localeKey]?.[key];
    const fallbackValue = typeof key === "string" ? key : String(key || "");
    const baseText = translatedValue || fallbackValue;

    return Object.entries(replacements).reduce(
      (nextText, [replacementKey, replacementValue]) =>
        nextText.replaceAll(`{${replacementKey}}`, String(replacementValue)),
      baseText,
    );
  };

  isActionLabel = (buttonText, actionText) =>
    String(buttonText || "").trim() === actionText ||
    String(buttonText || "").trim() === this.t(actionText.toLowerCase());

  componentDidMount() {
    this.isComponentMounted = true;
    this.syncLocaleDependentLabels();
    window.addEventListener("popstate", this.handlePlannerBrowserBack);
    if (this.plannerArticleRef.current) {
      this.plannerArticleRef.current.addEventListener(
        "touchstart",
        this.handlePlannerTouchStart,
        {
          passive: false,
        },
      );
      this.plannerArticleRef.current.addEventListener(
        "touchmove",
        this.handlePlannerTouchMove,
        {
          passive: false,
        },
      );
    }
    if (this.props.state?.my_id) {
      this.retrieveLectures();
      this.retrieveCourses();
    }
    this.fetchTelegramConfig();
    window.requestAnimationFrame(() => {
      this.alignActionsWindowToLocale(
        this.lectureActionsWindowRef.current,
        this.snapLectureActionsToNearest,
      );
    });
  }

  componentWillUnmount() {
    this.coursePrintSoundTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.courseDetailsTypingTimeouts = [];
    this.isComponentMounted = false;
    this.stopTelegramCourseSuggestionStatusPolling();
    this.stopCoursePrintSound();
    if (this.lectureActionsSnapTimeout) {
      clearTimeout(this.lectureActionsSnapTimeout);
      this.lectureActionsSnapTimeout = null;
    }
    if (this.courseActionsSnapTimeout) {
      clearTimeout(this.courseActionsSnapTimeout);
      this.courseActionsSnapTimeout = null;
    }
    if (this.telegramSyncStatusTimeout) {
      clearTimeout(this.telegramSyncStatusTimeout);
      this.telegramSyncStatusTimeout = null;
    }
    if (this.plannerArticleRef.current) {
      this.plannerArticleRef.current.removeEventListener(
        "touchstart",
        this.handlePlannerTouchStart,
      );
      this.plannerArticleRef.current.removeEventListener(
        "touchmove",
        this.handlePlannerTouchMove,
      );
    }
    window.removeEventListener("popstate", this.handlePlannerBrowserBack);
    this.plannerSwipeStart = null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.state?.my_id &&
      prevProps.state?.my_id !== this.props.state?.my_id
    ) {
      this.retrieveCourses();
      this.retrieveLectures();
    }
    if (prevState.ui_locale !== this.state.ui_locale) {
      this.alignActionsWindowToLocale(
        this.courseActionsWindowRef.current,
        this.snapCourseActionsToNearest,
      );
      this.alignActionsWindowToLocale(
        this.lectureActionsWindowRef.current,
        this.snapLectureActionsToNearest,
      );
    }
  }

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
    const plannerSubApps = getHomeSubApps(this.props.state?.username);
    const wrapperTab = this.state.wrapperTab === "exams" ? "exams" : "courses";
    const lectureActionItems = [
      {
        key: "add",
        label: this.t("addLecture"),
        onClick: () =>
          this.openAddLectureForm({
            buttonName: "Add",
          }),
      },
      {
        key: "delete",
        label: this.t("deleteLecture"),
        onClick: () => this.deleteLecture(checkedLectures),
      },
    ];
    const orderedLectureActionItems = this.isArabic()
      ? [...lectureActionItems].reverse()
      : lectureActionItems;

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
          data-reduced-motion={this.isReducedMotionEnabled() ? "true" : "false"}
        >
          <div id="nogaPlanner_navWrap">
            <Nav
              state={this.props.state}
              logOut={this.props.logOut}
              acceptFriend={this.props.acceptFriend}
              makeNotificationsRead={this.props.makeNotificationsRead}
              subApps={plannerSubApps}
            />
          </div>
          <button
            id="nogaPlanner_localeToggle"
            type="button"
            onClick={this.togglePlannerLocale}
            aria-label={
              this.isArabic() ? "Switch to English" : "الانتقال إلى العربية"
            }
            title={
              this.isArabic() ? "Switch to English" : "الانتقال إلى العربية"
            }
          >
            {this.isArabic() ? "EN" : "AR"}
          </button>
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
            {/* <div id="nogaPlanner_courses_headerBlock" className="fc">
              <h2 className="nogaPlanner_homeSoulTitle">
                {this.isArabic() ? "خزانة المقررات" : "Course cabinet"}
              </h2>
              <p className="nogaPlanner_homeSoulSubtitle">
                {this.isArabic()
                  ? "واجهة مقررات بروح صفحة نوغا الرئيسية."
                  : "A softer course panel shaped in the spirit of Noga Home."}
              </p>
            </div> */}
            <div className="nogaPlanner_wrapperTabPanel fc">
              {wrapperTab === "courses" ? (
                <div id="nogaPlanner_courses_panelWrapper" className="fc">
                  {this.state.course_isLoading === true && (
                    <div id="course_loaderImg" className="loaderImg_div fc">
                      <img src="/img/loader.gif" alt="" width="50px" />
                    </div>
                  )}
                  {this.renderCoursesLecturesTabs()}
                </div>
              ) : (
                <div id="nogaPlanner_lecturesExamCluster" className="fr">
                  {/* {this.renderTabDetailsPanel()} */}
                  {this.renderSelectedCourseExamBoard()}
                </div>
              )}
            </div>
          </div>{" "}
          {/* Close nogaPlanner_coursesLectures_wrapper */}
          <div id="nogaPlanner_addLecture_div" className="fc">
            <label onClick={this.closeAddLectureForm}>{this.t("close")}</label>
            <form id="nogaPlanner_addLecture_form" className="fc">
              <div className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowWide">
                <input
                  id="nogaPlanner_addLecture_name_input"
                  placeholder={this.t("lectureNamePlaceholder")}
                />
              </div>
              <div className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowSplit">
                <select
                  id="nogaPlanner_addLecture_course_input"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {this.t("lectureCoursePlaceholder")}
                  </option>
                </select>
                <select
                  id="nogaPlanner_addLecture_instructorName_input"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {this.t("lectureInstructorPlaceholder")}
                  </option>
                </select>
              </div>
              <div className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowSplit">
                <input
                  id="nogaPlanner_addLecture_writerName_input"
                  placeholder={this.t("lectureWriterPlaceholder")}
                />
                <input id="nogaPlanner_addLecture_date_input" type="date" />
              </div>
              <div className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowNarrow">
                <input
                  id="nogaPlanner_addLecture_length_input"
                  placeholder={this.t("lectureLengthPlaceholder")}
                />
              </div>
              <div
                id="nogaPlanner_addLecture_corrections_div"
                className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowWide"
              >
                <div className="fc">
                  <div
                    id="nogaPlanner_addLecture_corrections_inputs"
                    className="nogaPlanner_addLecture_row nogaPlanner_addLecture_rowSplit"
                  >
                    <input
                      id="nogaPlanner_addLecture_correctionPage_input"
                      placeholder={this.t("correctionPagePlaceholder")}
                      type="number"
                      min="1"
                    />
                    <input
                      id="nogaPlanner_addLecture_correctionText_input"
                      placeholder={this.t("correctionNotePlaceholder")}
                    />
                  </div>
                  <ul
                    id="nogaPlanner_addLecture_corrections_ul"
                    className="fr"
                  ></ul>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    this.addLectureCorrection();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      this.addLectureCorrection();
                    }
                  }}
                >
                  {this.t("add")}
                </div>
              </div>
              <div id="nogaPlanner_addLecture_outlines_div" className="fr">
                <div className="fc">
                  <textarea
                    id="nogaPlanner_addLecture_outlines_input"
                    placeholder={this.t("lectureOutlinePlaceholder")}
                  />
                  <ul
                    id="nogaPlanner_addLecture_outlines_ul"
                    className="fr"
                  ></ul>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    this.addLectureOutline();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      this.addLectureOutline();
                    }
                  }}
                >
                  {this.t("add")}
                </div>
              </div>
            </form>
            <label
              id="nogaPlanner_addLecture_addButton_label"
              onClick={() => {
                let buttonName = document.getElementById(
                  "nogaPlanner_addLecture_addButton_label",
                ).textContent;
                let lecture_name = document.getElementById(
                  "nogaPlanner_addLecture_name_input",
                ).value;
                let lecture_course = document.getElementById(
                  "nogaPlanner_addLecture_course_input",
                ).value;
                let lecture_instructor = document.getElementById(
                  "nogaPlanner_addLecture_instructorName_input",
                ).value;
                let lecture_writer = document.getElementById(
                  "nogaPlanner_addLecture_writerName_input",
                ).value;
                let lecture_date = document.getElementById(
                  "nogaPlanner_addLecture_date_input",
                ).value;
                let lecture_length = document.getElementById(
                  "nogaPlanner_addLecture_length_input",
                ).value;
                const lecture_corrections =
                  normalizeLectureCorrections(lectureCorrections);

                if (this.isActionLabel(buttonName, "Add")) {
                  this.addLecture({
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: {},
                    lecture_pagesFinished: [],
                    lecture_outlines: [],
                    lecture_corrections: lecture_corrections,
                    lecture_partOfPlan: true,
                    lecture_hidden: false,
                  });
                }
                if (this.isActionLabel(buttonName, "Edit")) {
                  this.editLecture({
                    _id: selectedLecture,
                    lecture_name: lecture_name,
                    lecture_course: lecture_course,
                    lecture_instructor: lecture_instructor,
                    lecture_writer: lecture_writer,
                    lecture_date: lecture_date,
                    lecture_length: lecture_length,
                    lecture_progress: lectureInEdit.lecture_progress,
                    lecture_pagesFinished: lectureInEdit.lecture_pagesFinished,
                    lecture_outlines: lectureOutlines,
                    lecture_corrections: lecture_corrections,
                    lecture_partOfPlan: lectureInEdit.lecture_partOfPlan,
                    lecture_hidden: lectureInEdit.lecture_hidden,
                  });
                }
              }}
            >
              {this.t("add")}
            </label>
          </div>
        </article>
      </React.Fragment>
    );
  }
}

// Music was removed. Named exports kept as no-ops for backward compatibility.
export const getPlannerMusicSnapshot = () => ({});
export const playNextSharedPlannerMusicTrack = () => {};
export const playPreviousSharedPlannerMusicTrack = () => {};
export const toggleSharedPlannerMusic = () => {};
