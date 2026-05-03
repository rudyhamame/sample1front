//..............IMPORT................
import React, { Component } from "react";
import "./schoolPlanner.css";
import { apiUrl } from "../config/api";
import PdfReaderModal from "../App/components/pdf-reader/PdfReaderModal";
import { normalizeMemoryPayload } from "../utils/backendUser";
import {
  getStoredPdfReaderState,
  setStoredPdfReaderState,
} from "../utils/PDF/pdfReaderState";
import { readStoredSession } from "../utils/sessionCleanup";
//.........VARIABLES................
var courses = [];
var lectures = [];
var courses_partOfPlan = [];
var checkedLectures = [];
var checkedCourses = [];
var courseComponents = [];
var courseDayAndTime = [];
var courseExams = [];
var lectureOutlines = [];
var courseNames = [];
var courseNames_filtered = [];
var courseInstructorsNames = [];
var courseInstructorsNames_filtered = [];
var target_editCourse;
var selectedLecture;
var course_pages = [];
var lectureInEdit = {};
var lectureCorrections = [];
const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY = "schoolPlanner_reduce_motion";

var timezone = new Date().getTimezoneOffset();
var todayDate = Date.now() - timezone * 60000;

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getProgressStats = (progressValue, lengthValue) => {
  const progress = Math.max(0, toSafeNumber(progressValue));
  const length = Math.max(0, toSafeNumber(lengthValue));
  const remaining = Math.max(0, length - progress);
  const percent = length > 0 ? Math.round((progress * 100) / length) : 0;

  return {
    progress,
    length,
    remaining,
    percent,
    indicatorWidth: (150 * percent) / 100,
  };
};

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

const normalizeCourseComponentValue = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue && normalizedValue !== "Course component"
    ? normalizedValue
    : "";
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

  const timeParts = String(value).split(":");
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
const NAGHAM_COURSE_LETTERS_STORAGE_KEY = "schoolPlanner_nagham_course_letters";
const NAGHAM_COURSE_LIST_STORAGE_KEY = "schoolPlanner_nagham_course_list";
const SCHOOLPLANNER_MUSIC_STORAGE_KEY = "schoolPlanner_music_archive_items";
const DEFAULT_NAGHAM_COURSE_LETTER =
  "For dear naghamtrkmani: keep going, keep glowing, and let every page carry you a little closer to your beautiful goal.";
const TELEGRAM_DISPLAY_TIMEZONE = "Asia/Damascus";
const INTERNET_ARCHIVE_CLASSICAL_ITEMS = [
  {
    identifier: "MoonlightSonata_755",
    fallbackTitle: "Moonlight Sonata",
    fallbackCreator: "Beethoven",
  },
  {
    identifier: "fur-elise-by-beethoven-beethoven",
    fallbackTitle: "Fur Elise",
    fallbackCreator: "Beethoven",
  },
  {
    identifier: "gymnopedie-no.-1",
    fallbackTitle: "Gymnopedie No. 1",
    fallbackCreator: "Erik Satie",
  },
  {
    identifier: "NocturneCSharpMinor",
    fallbackTitle: "Nocturne in C# Minor",
    fallbackCreator: "Chopin",
  },
];

const buildInternetArchiveDownloadUrl = (identifier, fileName) =>
  `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;

const PLANNER_MUSIC_PALETTES = [
  ["#16333a", "#1f6a70", "#d8b16d"],
  ["#1d3048", "#2f847c", "#c86b5b"],
  ["#23314a", "#3f7890", "#e0c27a"],
  ["#2b2644", "#4b6f8f", "#b96b78"],
  ["#223b3c", "#3f7a6f", "#d7a48f"],
  ["#182f33", "#497f97", "#e1d0a8"],
];

const hexToRgb = (hexValue) => {
  const normalized = String(hexValue || "").replace("#", "");
  const padded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  return {
    r: parseInt(padded.slice(0, 2), 16) || 0,
    g: parseInt(padded.slice(2, 4), 16) || 0,
    b: parseInt(padded.slice(4, 6), 16) || 0,
  };
};

const interpolateRgb = (startColor, endColor, amount) => {
  const clampedAmount = Math.max(0, Math.min(1, Number(amount) || 0));

  return {
    r: Math.round(startColor.r + (endColor.r - startColor.r) * clampedAmount),
    g: Math.round(startColor.g + (endColor.g - startColor.g) * clampedAmount),
    b: Math.round(startColor.b + (endColor.b - startColor.b) * clampedAmount),
  };
};

const rgbToCss = ({ r, g, b }, alpha = 1) =>
  `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;

const getInternetArchivePlayableFile = (files = []) => {
  const preferredFile = files.find((file) => {
    const format = String(file?.format || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();

    return (
      name.endsWith(".mp3") &&
      !name.endsWith(".zip") &&
      !name.endsWith(".m3u") &&
      (format.includes("vbr mp3") ||
        format.includes("192kbps mp3") ||
        format.includes("64kbps mp3") ||
        format.includes("mp3"))
    );
  });

  return preferredFile || null;
};

const buildInternetArchiveSearchUrl = (queryText) => {
  const normalizedQuery = String(queryText || "").trim();
  const searchQuery = `mediatype:audio AND collection:opensource_audio AND (${[
    `identifier:"${normalizedQuery}"`,
    `title:"${normalizedQuery}"`,
    `subject:"${normalizedQuery}"`,
    `creator:"${normalizedQuery}"`,
  ].join(" OR ")})`;

  return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    searchQuery,
  )}&fl[]=identifier,title,creator&sort[]=downloads desc&rows=1&page=1&output=json`;
};

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

const buildResolvedArchiveTrack = (item, payload) => {
  const playableFile = getInternetArchivePlayableFile(payload?.files);

  if (!playableFile?.name) {
    return null;
  }

  const title =
    playableFile.title ||
    payload?.metadata?.title ||
    item.fallbackTitle ||
    item.identifier;
  const artist =
    playableFile.creator ||
    playableFile.artist ||
    payload?.metadata?.creator ||
    item.fallbackCreator ||
    "Internet Archive";

  return {
    identifier: item.identifier,
    title,
    artist: Array.isArray(artist) ? artist.join(", ") : artist,
    src: buildInternetArchiveDownloadUrl(item.identifier, playableFile.name),
  };
};

const getConfiguredInternetArchiveItems = () => {
  if (typeof window === "undefined") {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }

  try {
    const storedIdentifiers = JSON.parse(
      window.localStorage.getItem(SCHOOLPLANNER_MUSIC_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(storedIdentifiers) || storedIdentifiers.length === 0) {
      return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
    }

    return storedIdentifiers
      .map((identifier) => String(identifier || "").trim())
      .filter(Boolean)
      .map((identifier) => {
        const matchingDefaultItem = INTERNET_ARCHIVE_CLASSICAL_ITEMS.find(
          (item) => item.identifier === identifier,
        );

        return (
          matchingDefaultItem || {
            identifier,
            fallbackTitle: identifier.replace(/[-_]+/g, " "),
            fallbackCreator: "Internet Archive",
          }
        );
      });
  } catch (error) {
    return INTERNET_ARCHIVE_CLASSICAL_ITEMS;
  }
};

export default class SchoolPlanner extends Component {
  telegramCourseSuggestionsRequestInFlight = false;

  constructor(props) {
    super(props);

    this.state = {
      lectures: [],
      lecture_details: null,
      lecture_detailsPagesExpanded: false,
      show_addCourseForm: false,
      courses: [],
      course_isLoading: false,
      lecture_isLoading: false,
      music_isPlaying: false,
      music_volume: 0.42,
      music_trackTitle:
        props.locale === "ar" ? "كلاسيكيات الأرشيف" : "Archive Classics",
      music_trackArtist: "Internet Archive",
      music_isLoading: false,
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
      telegram_cloudUploadPdfKey: "",
      telegram_cloudAddedPdfKeys: {},
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
      telegram_approvingSuggestionKey: "",
      telegram_courseAiLoadingCourseId: "",
      telegram_courseAiStatusCourseId: "",
      telegram_courseAiStatusMessage: "",
      telegram_courseAiStatusError: "",
      telegram_courseAiDraftCourseId: "",
      telegram_courseAiDraftPayload: null,
      telegram_courseAiDraftSaving: false,
      planner_swipeView: "main",
    };

    this.coursePrintAudio = null;
    this.coursePrintSoundTimeouts = [];
    this.courseDetailsTypingTimeouts = [];
    this.musicAudioRef = React.createRef();
    this.plannerArticleRef = React.createRef();
    this.lectureActionsWindowRef = React.createRef();
    this.musicPlaylist = [];
    this.musicTrackIndex = 0;
    this.musicLibraryPromise = null;
    this.telegramSyncStatusTimeout = null;
    this.musicAudioContext = null;
    this.musicAnalyser = null;
    this.musicAnalyserData = null;
    this.musicSourceNode = null;
    this.musicPaletteFrame = null;
    this.musicPaletteCursor = 0;
    this.isComponentMounted = false;
    this.plannerSwipeStart = null;
    this.lectureActionsPointerState = null;
    this.lectureActionsSnapTimeout = null;
    this.telegramPdfObjectUrl = "";
    this.telegramCourseSuggestionStatusTimeout = null;
  }

  isArabic = () => this.props.locale === "ar";

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
    const addCoursePanel = document.getElementById(
      "schoolPlanner_addCourse_div",
    );
    if (addCoursePanel) {
      addCoursePanel.style.display = "none";
    }
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
    this.retrieveLectures();
    this.retrieveCourses();
    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.volume = this.state.music_volume;
    }
    this.loadPlannerMusicLibrary();
    this.fetchTelegramConfig();
    this.fetchTelegramGroups();
    this.fetchStoredTelegramGroups();
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
    if (this.telegramSyncStatusTimeout) {
      clearTimeout(this.telegramSyncStatusTimeout);
      this.telegramSyncStatusTimeout = null;
    }
    this.stopPlannerMusicReactivePalette();
    if (this.musicSourceNode) {
      this.musicSourceNode.disconnect();
      this.musicSourceNode = null;
    }
    if (this.musicAnalyser) {
      this.musicAnalyser.disconnect();
      this.musicAnalyser = null;
    }
    if (this.musicAudioContext) {
      this.musicAudioContext.close().catch(() => {});
      this.musicAudioContext = null;
    }
    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.pause();
      this.musicAudioRef.current.currentTime = 0;
      this.musicAudioRef.current.removeAttribute("src");
      this.musicAudioRef.current.load();
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

  handlePlannerBrowserBack = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.location.pathname === "/") {
      window.location.reload();
    }
  };

  resolveInternetArchiveTrack = async (item) => {
    try {
      const metadataResponse = await fetch(
        `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`,
      );

      if (metadataResponse.ok) {
        const metadataPayload = await metadataResponse.json();
        const resolvedFromIdentifier = buildResolvedArchiveTrack(
          item,
          metadataPayload,
        );

        if (resolvedFromIdentifier) {
          return resolvedFromIdentifier;
        }
      }

      ensurePlannerMusicAnalyser = async () => {
        const musicAudio = this.musicAudioRef.current;

        if (!musicAudio || typeof window === "undefined") {
          return false;
        }

        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext || null;

        if (!AudioContextClass) {
          return false;
        }

        try {
          if (!this.musicAudioContext) {
            this.musicAudioContext = new AudioContextClass();
          }

          if (this.musicAudioContext.state === "suspended") {
            await this.musicAudioContext.resume();
          }

          if (!this.musicSourceNode) {
            this.musicSourceNode =
              this.musicAudioContext.createMediaElementSource(musicAudio);
          }

          if (!this.musicAnalyser) {
            this.musicAnalyser = this.musicAudioContext.createAnalyser();
            this.musicAnalyser.fftSize = 256;
            this.musicAnalyser.smoothingTimeConstant = 0.84;
            this.musicAnalyserData = new Uint8Array(
              this.musicAnalyser.frequencyBinCount,
            );
            this.musicSourceNode.connect(this.musicAnalyser);
            this.musicAnalyser.connect(this.musicAudioContext.destination);
          }

          return true;
        } catch {
          return false;
        }
      };

      applyPlannerMusicPalette = ({
        energy = 0,
        bass = 0,
        treble = 0,
        speed = 0.01,
        fallbackTime = 0,
      } = {}) => {
        const articleNode = this.plannerArticleRef.current;

        if (!articleNode) {
          return;
        }

        const boundedEnergy = Math.max(0, Math.min(1, energy));
        const boundedBass = Math.max(0, Math.min(1, bass));
        const boundedTreble = Math.max(0, Math.min(1, treble));
        const boundedSpeed = Math.max(0.004, Math.min(0.045, speed));

        this.musicPaletteCursor =
          (this.musicPaletteCursor + boundedSpeed + boundedTreble * 0.012) %
          PLANNER_MUSIC_PALETTES.length;

        const paletteIndex = Math.floor(this.musicPaletteCursor);
        const nextPaletteIndex =
          (paletteIndex + 1) % PLANNER_MUSIC_PALETTES.length;
        const mixAmount = this.musicPaletteCursor - paletteIndex;

        const currentPalette =
          PLANNER_MUSIC_PALETTES[paletteIndex].map(hexToRgb);
        const nextPalette =
          PLANNER_MUSIC_PALETTES[nextPaletteIndex].map(hexToRgb);
        const mixedPalette = currentPalette.map((color, colorIndex) =>
          interpolateRgb(color, nextPalette[colorIndex], mixAmount),
        );
        const glowStrength = 0.14 + boundedEnergy * 0.26 + boundedBass * 0.08;
        const highlightStrength = 0.1 + boundedTreble * 0.18;
        const grainShift = `${Math.round((fallbackTime * 22) % 260)}px ${Math.round(
          (fallbackTime * 14) % 200,
        )}px`;

        articleNode.style.setProperty(
          "--planner-audio-bg",
          rgbToCss(mixedPalette[0], 1),
        );
        articleNode.style.setProperty(
          "--planner-audio-wave-a",
          rgbToCss(mixedPalette[1], 0.28 + boundedEnergy * 0.22),
        );
        articleNode.style.setProperty(
          "--planner-audio-wave-b",
          rgbToCss(mixedPalette[2], 0.18 + boundedTreble * 0.2),
        );
        articleNode.style.setProperty(
          "--planner-audio-glow",
          rgbToCss(mixedPalette[1], glowStrength),
        );
        articleNode.style.setProperty(
          "--planner-audio-highlight",
          rgbToCss(mixedPalette[2], highlightStrength),
        );
        articleNode.style.setProperty(
          "--planner-audio-sheen",
          rgbToCss(mixedPalette[0], 0.08 + boundedBass * 0.1),
        );
        articleNode.style.setProperty(
          "--planner-audio-grain-offset",
          grainShift,
        );
      };

      stopPlannerMusicReactivePalette = () => {
        if (this.musicPaletteFrame) {
          window.cancelAnimationFrame(this.musicPaletteFrame);
          this.musicPaletteFrame = null;
        }

        const articleNode = this.plannerArticleRef.current;
        if (articleNode) {
          articleNode.style.removeProperty("--planner-audio-bg");
          articleNode.style.removeProperty("--planner-audio-wave-a");
          articleNode.style.removeProperty("--planner-audio-wave-b");
          articleNode.style.removeProperty("--planner-audio-glow");
          articleNode.style.removeProperty("--planner-audio-highlight");
          articleNode.style.removeProperty("--planner-audio-sheen");
          articleNode.style.removeProperty("--planner-audio-grain-offset");
        }
      };

      startPlannerMusicReactivePalette = async () => {
        if (this.isReducedMotionEnabled()) {
          this.stopPlannerMusicReactivePalette();
          return;
        }

        const musicAudio = this.musicAudioRef.current;

        if (!musicAudio) {
          return;
        }

        await this.ensurePlannerMusicAnalyser();
        this.stopPlannerMusicReactivePalette();

        const step = () => {
          if (!this.isComponentMounted || !this.musicAudioRef.current) {
            this.stopPlannerMusicReactivePalette();
            return;
          }

          const activeAudio = this.musicAudioRef.current;
          let bass = 0;
          let mid = 0;
          let treble = 0;
          let energy = 0;

          if (this.musicAnalyser && this.musicAnalyserData) {
            this.musicAnalyser.getByteFrequencyData(this.musicAnalyserData);
            const bucketCount = this.musicAnalyserData.length;
            const bassEnd = Math.max(1, Math.floor(bucketCount * 0.18));
            const midEnd = Math.max(
              bassEnd + 1,
              Math.floor(bucketCount * 0.55),
            );
            let bassTotal = 0;
            let midTotal = 0;
            let trebleTotal = 0;

            for (let index = 0; index < bucketCount; index += 1) {
              const sample = this.musicAnalyserData[index] / 255;
              energy += sample;

              if (index < bassEnd) {
                bassTotal += sample;
              } else if (index < midEnd) {
                midTotal += sample;
              } else {
                trebleTotal += sample;
              }
            }

            energy /= bucketCount || 1;
            bass = bassTotal / bassEnd;
            mid = midTotal / Math.max(1, midEnd - bassEnd);
            treble = trebleTotal / Math.max(1, bucketCount - midEnd);
          } else {
            const fallbackBeat = Math.abs(
              Math.sin(
                (activeAudio.currentTime || 0) *
                  (1.2 + this.state.music_volume * 2),
              ),
            );
            energy = 0.18 + fallbackBeat * 0.42;
            bass = 0.22 + fallbackBeat * 0.34;
            mid = 0.16 + fallbackBeat * 0.26;
            treble = 0.12 + fallbackBeat * 0.22;
          }

          this.applyPlannerMusicPalette({
            energy,
            bass,
            treble,
            speed: 0.006 + energy * 0.018 + mid * 0.01,
            fallbackTime: activeAudio.currentTime || 0,
          });

          if (!activeAudio.paused && !activeAudio.ended) {
            this.musicPaletteFrame = window.requestAnimationFrame(step);
          } else {
            this.stopPlannerMusicReactivePalette();
          }
        };

        this.musicPaletteFrame = window.requestAnimationFrame(step);
      };
    } catch (error) {
      // Fall through to search mode.
    }

    try {
      const searchResponse = await fetch(
        buildInternetArchiveSearchUrl(
          item.fallbackTitle || item.identifier || item.fallbackCreator,
        ),
      );

      if (!searchResponse.ok) {
        return null;
      }

      const searchPayload = await searchResponse.json();
      const matchedDoc = searchPayload?.response?.docs?.[0];

      if (!matchedDoc?.identifier) {
        return null;
      }

      const matchedIdentifier = String(matchedDoc.identifier).trim();
      const metadataResponse = await fetch(
        `https://archive.org/metadata/${encodeURIComponent(matchedIdentifier)}`,
      );

      if (!metadataResponse.ok) {
        return null;
      }

      const metadataPayload = await metadataResponse.json();

      return buildResolvedArchiveTrack(
        {
          ...item,
          identifier: matchedIdentifier,
          fallbackTitle:
            matchedDoc.title || item.fallbackTitle || matchedIdentifier,
          fallbackCreator:
            matchedDoc.creator || item.fallbackCreator || "Internet Archive",
        },
        metadataPayload,
      );
    } catch (error) {
      return null;
    }
  };

  loadPlannerMusicLibrary = async () => {
    if (this.musicPlaylist.length > 0) {
      return this.musicPlaylist;
    }

    if (this.musicLibraryPromise) {
      return this.musicLibraryPromise;
    }

    this.setState({
      music_isLoading: true,
    });

    const configuredArchiveItems = getConfiguredInternetArchiveItems();

    this.musicLibraryPromise = Promise.all(
      configuredArchiveItems.map((item) =>
        this.resolveInternetArchiveTrack(item),
      ),
    )
      .then((tracks) => tracks.filter(Boolean))
      .catch(() => [])
      .finally(() => {
        this.musicLibraryPromise = null;
      });

    const resolvedTracks = await this.musicLibraryPromise;

    if (!this.isComponentMounted) {
      return resolvedTracks;
    }

    this.musicPlaylist = resolvedTracks;
    this.setState({
      music_isLoading: false,
    });

    if (this.musicPlaylist.length > 0 && this.musicAudioRef.current) {
      this.setPlannerMusicTrack(0);
    } else if (this.isComponentMounted) {
      this.setState({
        music_trackTitle: "Archive Unavailable",
        music_trackArtist: "Try again later",
      });
    }

    return this.musicPlaylist;
  };

  setPlannerMusicTrack = (trackIndex, autoplay = false) => {
    const musicAudio = this.musicAudioRef.current;
    const track = this.musicPlaylist[trackIndex];

    if (!musicAudio || !track) return;

    this.musicTrackIndex = trackIndex;
    musicAudio.pause();
    musicAudio.src = track.src;
    musicAudio.load();
    musicAudio.volume = this.state.music_volume;

    this.setState({
      music_trackTitle: track.title,
      music_trackArtist: track.artist,
    });

    if (autoplay) {
      musicAudio
        .play()
        .then(() => {
          this.startPlannerMusicReactivePalette();
        })
        .catch(() => {});
    }
  };

  playPreviousPlannerMusicTrack = async (autoplay = true) => {
    const playlist =
      this.musicPlaylist.length > 0
        ? this.musicPlaylist
        : await this.loadPlannerMusicLibrary();

    if (!playlist || playlist.length === 0) {
      return;
    }

    const previousIndex =
      (this.musicTrackIndex - 1 + playlist.length) % playlist.length;
    this.setPlannerMusicTrack(previousIndex, autoplay);
  };

  playNextPlannerMusicTrack = async (autoplay = true) => {
    const playlist =
      this.musicPlaylist.length > 0
        ? this.musicPlaylist
        : await this.loadPlannerMusicLibrary();

    if (!playlist || playlist.length === 0) {
      return;
    }

    const nextIndex = (this.musicTrackIndex + 1) % playlist.length;
    this.setPlannerMusicTrack(nextIndex, autoplay);
  };

  togglePlannerMusic = async () => {
    const musicAudio = this.musicAudioRef.current;
    if (!musicAudio) return;

    if (musicAudio.paused) {
      if (!musicAudio.src) {
        const playlist = await this.loadPlannerMusicLibrary();
        if (!playlist || playlist.length === 0) {
          return;
        }
      }
      musicAudio.volume = this.state.music_volume;
      musicAudio
        .play()
        .then(() => {
          this.startPlannerMusicReactivePalette();
        })
        .catch(() => {});
    } else {
      musicAudio.pause();
      this.stopPlannerMusicReactivePalette();
    }
  };

  updatePlannerMusicVolume = (event) => {
    const nextVolume = Number(event.target.value);

    this.setState({
      music_volume: nextVolume,
    });

    if (this.musicAudioRef.current) {
      this.musicAudioRef.current.volume = nextVolume;
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
    const token = this.getAuthToken();

    if (!token) {
      throw new Error("Stored PDFs need a valid login token.");
    }

    const response = await fetch(
      apiUrl(
        `/api/telegram/stored-group-pdfs/${encodeURIComponent(groupReference)}/${messageId}/open`,
      ),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
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
    const token = this.getAuthToken();

    if (!token || !groupReference || !messageId) {
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
    const token = this.getAuthToken();

    if (!token || !groupReference || !messageId) {
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
            Authorization: `Bearer ${token}`,
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

  getAuthToken = () =>
    String(this.props.state?.token || readStoredSession()?.token || "").trim();

  uploadStoredTelegramPdfToCloud = async (message) => {
    const groupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);
    const uploadKey = `${groupReference}:${messageId}`;
    const token = this.getAuthToken();

    if (!token || !groupReference || !messageId) {
      return;
    }

    this.setState({
      telegram_cloudUploadPdfKey: uploadKey,
      telegram_error: "",
      telegram_feedback: "",
    });

    try {
      const pdfBlob = await this.fetchStoredTelegramPdfBlob({
        groupReference,
        messageId,
      });
      const fallbackFileName =
        String(message?.attachmentFileName || "").trim() || "telegram.pdf";
      const fileName = fallbackFileName.toLowerCase().endsWith(".pdf")
        ? fallbackFileName
        : `${fallbackFileName}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, {
        type: pdfBlob.type || "application/pdf",
      });
      const publicIdSeed = `${groupReference}-${messageId}-${fileName}`
        .trim()
        .replace(/[^a-zA-Z0-9/_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 180);
      const signatureResponse = await fetch(
        apiUrl("/api/user/image-gallery/signature"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicId: publicIdSeed || `telegram-pdf-${messageId}`,
            resourceType: "raw",
          }),
        },
      );
      const signaturePayload = await signatureResponse.json().catch(() => ({}));

      if (!signatureResponse.ok) {
        throw new Error(
          signaturePayload?.message || "Unable to prepare Cloud upload.",
        );
      }

      const cloudinaryBody = new FormData();
      cloudinaryBody.append("file", pdfFile);
      cloudinaryBody.append("api_key", signaturePayload.apiKey);
      cloudinaryBody.append("timestamp", String(signaturePayload.timestamp));
      cloudinaryBody.append("signature", signaturePayload.signature);
      cloudinaryBody.append("folder", signaturePayload.folder);
      cloudinaryBody.append("public_id", signaturePayload.publicId);

      const cloudinaryResponse = await fetch(signaturePayload.uploadUrl, {
        method: "POST",
        body: cloudinaryBody,
      });
      const cloudinaryPayload = await cloudinaryResponse
        .json()
        .catch(() => ({}));

      if (!cloudinaryResponse.ok) {
        throw new Error(
          cloudinaryPayload?.error?.message || "Cloud upload failed.",
        );
      }

      const saveResponse = await fetch(apiUrl("/api/user/image-gallery"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: cloudinaryPayload.secure_url,
          publicId: cloudinaryPayload.public_id,
          assetId: cloudinaryPayload.asset_id,
          folder: cloudinaryPayload.folder,
          resourceType: cloudinaryPayload.resource_type || "raw",
          mimeType: pdfFile.type || "application/pdf",
          format: cloudinaryPayload.format || "pdf",
          bytes: cloudinaryPayload.bytes || pdfFile.size || 0,
          createdAt: new Date().toISOString(),
        }),
      });
      const savePayload = await saveResponse.json().catch(() => ({}));

      if (!saveResponse.ok) {
        throw new Error(savePayload?.message || "Unable to save uploaded PDF.");
      }

      this.setState({
        telegram_cloudUploadPdfKey: "",
        telegram_cloudAddedPdfKeys: {
          ...(this.state.telegram_cloudAddedPdfKeys || {}),
          [uploadKey]: true,
        },
        telegram_feedback:
          savePayload?.message || "PDF added to Cloud successfully.",
      });
    } catch (error) {
      this.setState({
        telegram_cloudUploadPdfKey: "",
        telegram_error: error?.message || "Unable to add PDF to Cloud.",
      });
    }
  };

  openStoredTelegramPdf = async (message) => {
    const groupReference = String(
      message?.groupReference || this.state.telegram_panelGroupReference || "",
    ).trim();
    const messageId = Number(message?.id || 0);
    const openingKey = `${groupReference}:${messageId}`;
    const token = this.getAuthToken();

    if (!token || !groupReference || !messageId) {
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
              payload?.message || "Saved SchoolPlanner Telegram settings.",
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
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
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
        .querySelector(".schoolPlanner_courses_printSpacer")
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
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    if (!detailsDiv || !node) return;

    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
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
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
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
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="inline"
        // document.getElementById("schoolPlanner_lectures_hideUnchecked_button").style.display="none"
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

  openTelegramSwipeView = () => {
    this.setState({
      planner_swipeView: "telegram",
    });
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

  toggleTelegramSwipeView = () => {
    this.setState((currentState) => ({
      planner_swipeView:
        currentState.planner_swipeView === "telegram" ? "main" : "telegram",
    }));
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
      "#schoolPlanner_courses_actions",
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

    if (deltaX < 0) {
      this.openTelegramSwipeView();
      return;
    }

    this.openMainPlannerSwipeView();
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

    row.setAttribute("class", "menuLi_div schoolPlanner_lecture_row");
    row.setAttribute("id", lecture._id + "li");
    titleCell.setAttribute("class", "schoolPlanner_lecture_titleCell");
    titleText.setAttribute("class", "schoolPlanner_lecture_titleText");
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
        id="schoolPlanner_lectureDetailsMount"
        className={isOpen ? "schoolPlanner_lectureDetailsMount--open" : ""}
      >
        <div
          id="schoolPlanner_lectureDetailsCard"
          className={`fc ${
            isOpen
              ? "schoolPlanner_lectureDetailsCard--open"
              : "schoolPlanner_lectureDetailsCard--closed"
          }`}
        >
          {lecture && (
            <React.Fragment>
              <div id="schoolPlanner_lectureDetailsHeader" className="fr">
                <div id="schoolPlanner_lectureDetailsTitleBlock" className="fc">
                  <p id="schoolPlanner_lectureDetailsEyebrow">
                    {this.t("lectureDetails")}
                  </p>
                  <h3 id="schoolPlanner_lectureDetailsTitle">
                    {lecture.lecture_name}
                  </h3>
                  <p id="schoolPlanner_lectureDetailsMeta">
                    {lecture.lecture_course} | {lecture.lecture_instructor} |{" "}
                    {lecture.lecture_writer}
                  </p>
                </div>
                <div
                  id="schoolPlanner_lectureDetailsHeaderActions"
                  className="fr"
                >
                  <button
                    type="button"
                    className="schoolPlanner_telegramSendButton"
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
                    id="schoolPlanner_lectureDetailsClose"
                    onClick={this.closeLectureDetails}
                  >
                    <i className="fi fi-rr-x"></i>
                  </button>
                </div>
              </div>
              <div
                id="schoolPlanner_lectureDetailsProgressBlock"
                className="fc"
              >
                <div className="fr schoolPlanner_lectureDetailsSectionHeader">
                  <p id="schoolPlanner_lectureDetailsProgressText">
                    {this.t("pagesFinishedSummary", {
                      progress: progressionStats.progress,
                      length: progressionStats.length,
                      remaining: progressionStats.remaining,
                      percent: progressionStats.percent,
                    })}
                  </p>
                  <button
                    type="button"
                    className="schoolPlanner_telegramSendButton"
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
                  id="schoolPlanner_lectureDetailsProgressBar"
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
              <div id="schoolPlanner_lectureDetailsCorrections" className="fc">
                <div className="fr schoolPlanner_lectureDetailsSectionHeader">
                  <p id="schoolPlanner_lectureDetailsCorrectionsLabel">
                    {this.t("corrections")}
                  </p>
                  <button
                    type="button"
                    className="schoolPlanner_telegramSendButton"
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
                <p id="schoolPlanner_lectureDetailsCorrectionsMeta">
                  {this.t("writerLabel")}: {lecture.lecture_writer || "-"}
                </p>
                {lectureCorrectionsList.length === 0 ? (
                  <p className="schoolPlanner_lectureDetailsCorrectionsEmpty">
                    {this.t("noCorrectionsForLectureYet")}
                  </p>
                ) : (
                  <div
                    id="schoolPlanner_lectureDetailsCorrectionsList"
                    className="fc"
                  >
                    {lectureCorrectionsList.map(
                      (correction, correctionIndex) => (
                        <div
                          key={`${correction.page}-${correctionIndex}`}
                          className="schoolPlanner_lectureDetailsCorrectionItem fc"
                        >
                          <div className="fr schoolPlanner_lectureDetailsCorrectionHeader">
                            <p className="schoolPlanner_lectureDetailsCorrectionPage">
                              {this.t("page", { page: correction.page })}
                            </p>
                            <button
                              type="button"
                              className="schoolPlanner_telegramSendButton"
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
                          <p className="schoolPlanner_lectureDetailsCorrectionText">
                            {correction.text}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              <div id="schoolPlanner_lectureDetailsPages" className="fc">
                <div
                  id="schoolPlanner_lectureDetailsPagesHeader"
                  className="fr"
                >
                  <p id="schoolPlanner_lectureDetailsPagesLabel">
                    {this.t("toggleFinishedPages")}
                  </p>
                  <div className="fr schoolPlanner_lectureDetailsPagesActions">
                    <button
                      type="button"
                      className="schoolPlanner_telegramSendButton"
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
                      id="schoolPlanner_lectureDetailsPagesToggle"
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
                  id="schoolPlanner_lectureDetailsPagesBody"
                  className={
                    pagesAreExpanded
                      ? "schoolPlanner_lectureDetailsPagesBody--open"
                      : ""
                  }
                >
                  <div id="schoolPlanner_lectureDetailsPagesGrid">
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
                            className={`schoolPlanner_lecturePageButton ${
                              isFinished
                                ? "schoolPlanner_lecturePageButton--finished"
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
              <div id="schoolPlanner_lectureDetailsTelegram" className="fc">
                <div className="fr schoolPlanner_lectureDetailsSectionHeader">
                  <p id="schoolPlanner_lectureDetailsTelegramLabel">
                    {this.t("telegramSummary")}
                  </p>
                  <button
                    type="button"
                    className="schoolPlanner_telegramSendButton"
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
                  <p className="schoolPlanner_lectureDetailsTelegramEmpty">
                    {this.t("noLectureTelegramMatchesYet")}
                  </p>
                ) : (
                  <React.Fragment>
                    <p id="schoolPlanner_lectureDetailsTelegramMeta">
                      {lectureTelegramSummary.matchedKeywords.length > 0
                        ? `${this.t("matchedTerms")}: ${lectureTelegramSummary.matchedKeywords.join(", ")}`
                        : this.t("matchedTermsUnavailable")}
                    </p>
                    {lectureTelegramSummary.latestRelevantMessage ? (
                      <p id="schoolPlanner_lectureDetailsTelegramLatest">
                        {this.t("latestRelatedMessage")}:{" "}
                        {this.formatTelegramDateTime(
                          lectureTelegramSummary.latestRelevantMessage.date,
                        ) || this.t("unknownTime")}
                      </p>
                    ) : null}
                    <div
                      id="schoolPlanner_lectureDetailsTelegramList"
                      className="fc"
                    >
                      {lectureTelegramSummary.relevantMessages.map(
                        (message) => (
                          <div
                            key={
                              message.id || `${message.sender}-${message.date}`
                            }
                            className="schoolPlanner_lectureDetailsTelegramMessage fc"
                          >
                            <div className="fr schoolPlanner_lectureDetailsTelegramMessageMeta">
                              <span>{message.sender || this.t("unknown")}</span>
                              <span>
                                {this.formatTelegramDateTime(message.date)}
                              </span>
                              <button
                                type="button"
                                className="schoolPlanner_telegramSendButton"
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
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "flex";
    document.getElementById(
      "schoolPlanner_addLecture_addButton_label",
    ).textContent =
      object.buttonName === "Edit" ? this.t("edit") : this.t("add");
    //.........
    if (object.buttonName === "Add") {
      lectureOutlines = [];
      lectureCorrections = [];
      document.getElementById("schoolPlanner_addLecture_name_input").value = "";
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        "Lecture course";
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = "Lecture instructor name";
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = "";
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        "Lecture date";
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addLecture_correctionPage_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addLecture_correctionText_input",
      ).value = "";
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addLecture_corrections_ul",
      ).innerHTML = "";
    }
    if (object.buttonName === "Edit") {
      selectedLecture = object._id;
      lectureOutlines = object.lecture_outlines;
      lectureCorrections = normalizeLectureCorrections(
        object.lecture_corrections,
      );
      document.getElementById("schoolPlanner_addLecture_name_input").value =
        object.lecture_name;
      document.getElementById("schoolPlanner_addLecture_course_input").value =
        object.lecture_course;
      document.getElementById(
        "schoolPlanner_addLecture_instructorName_input",
      ).value = object.lecture_instructor;
      document.getElementById(
        "schoolPlanner_addLecture_writerName_input",
      ).value = object.lecture_writer;
      document.getElementById("schoolPlanner_addLecture_date_input").value =
        object.lecture_date;
      document.getElementById("schoolPlanner_addLecture_length_input").value =
        object.lecture_length;
      document.getElementById(
        "schoolPlanner_addLecture_correctionPage_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addLecture_correctionText_input",
      ).value = "";
      document.getElementById("schoolPlanner_addLecture_outlines_input").value =
        "";

      this.retrieveLectureOutlines();
      this.retrieveLectureCorrections();
    }
  };
  closeAddLectureForm = () => {
    document.getElementById("schoolPlanner_addLecture_div").style.display =
      "none";
  };
  openAddCourseForm = (object) => {
    this.setState({ show_addCourseForm: true }, () => {
      document.getElementById(
        "schoolPlanner_addCourse_addButton_label",
      ).textContent =
        object.buttonName === "Edit" ? this.t("edit") : this.t("add");
      if (object.buttonName === "Add") {
        courseComponents = [];
        courseDayAndTime = [];
        courseInstructorsNames = [];
        courseExams = [];
        document.getElementById("schoolPlanner_addCourse_name_input").value =
          "";
        document.getElementById(
          "schoolPlanner_addCourse_component_input",
        ).value = "Course component";
        document.getElementById(
          "schoolPlanner_addCourse_components_ul",
        ).innerHTML = "";
        document.getElementById("schoolPlanner_addCourse_day_input").value =
          "Course day";
        document.getElementById(
          "schoolPlanner_addCourse_time_hour_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_time_minute_input",
        ).value = "";
        document.getElementById("schoolPlanner_addCourse_year_input").value =
          "Course year";
        document.getElementById("schoolPlanner_addCourse_term_input").value =
          "Course term";
        document.getElementById("schoolPlanner_addCourse_class_input").value =
          "Course classification";
        document.getElementById("schoolPlanner_addCourse_status_input").value =
          "Course status";
        document.getElementById("schoolPlanner_addCourse_grade_input").value =
          "";
        document.getElementById(
          "schoolPlanner_addCourse_fullGrade_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_examType_input",
        ).value = "Exam type";
        document.getElementById(
          "schoolPlanner_addCourse_examDate_day_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_examDate_month_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_examDate_year_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_examTime_hour_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_examTime_minute_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_instructorName_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_instructorsNames_ul",
        ).innerHTML = "";
        document.getElementById(
          "schoolPlanner_addCourse_dayAndTime_ul",
        ).innerHTML = "";
        document.getElementById("schoolPlanner_addCourse_exams_ul").innerHTML =
          "";
      }
      if (object.buttonName === "Edit") {
        courseComponents = [
          normalizeCourseComponentValue(object.course.course_component),
        ].filter(Boolean);
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
        document.getElementById("schoolPlanner_addCourse_name_input").value =
          object.course.course_name.split(" (")[0];
        document.getElementById(
          "schoolPlanner_addCourse_component_input",
        ).value = object.course.course_component;
        this.syncCourseComponentsList();
        document.getElementById("schoolPlanner_addCourse_day_input").value =
          "Course day";
        document.getElementById(
          "schoolPlanner_addCourse_time_hour_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_time_minute_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_dayAndTime_ul",
        ).innerHTML = "";
        document.getElementById("schoolPlanner_addCourse_year_input").value =
          object.course.course_year;
        document.getElementById("schoolPlanner_addCourse_term_input").value =
          object.course.course_term;
        document.getElementById("schoolPlanner_addCourse_class_input").value =
          object.course.course_class;
        document.getElementById("schoolPlanner_addCourse_status_input").value =
          object.course.course_status;
        document.getElementById(
          "schoolPlanner_addCourse_instructorName_input",
        ).value = "";
        document.getElementById(
          "schoolPlanner_addCourse_instructorsNames_ul",
        ).innerHTML = "";
        document.getElementById("schoolPlanner_addCourse_grade_input").value =
          object.course.course_grade;
        document.getElementById(
          "schoolPlanner_addCourse_fullGrade_input",
        ).value = object.course.course_fullGrade;
        document.getElementById(
          "schoolPlanner_addCourse_examType_input",
        ).value = object.course.exam_type || "Exam type";
        const examDateParts = formatExamDateParts(object.course.exam_date);
        document.getElementById(
          "schoolPlanner_addCourse_examDate_day_input",
        ).value = examDateParts.day;
        document.getElementById(
          "schoolPlanner_addCourse_examDate_month_input",
        ).value = examDateParts.month;
        document.getElementById(
          "schoolPlanner_addCourse_examDate_year_input",
        ).value = examDateParts.year;
        const examTimeParts = formatExamTimeParts(object.course.exam_time);
        document.getElementById(
          "schoolPlanner_addCourse_examTime_hour_input",
        ).value = examTimeParts.hour;
        document.getElementById(
          "schoolPlanner_addCourse_examTime_minute_input",
        ).value = examTimeParts.minute;
        this.retrieveCourseDayAndTime();
        this.retrieveCourseInstructorsNames();
        this.retrieveCourseExams();
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
      document.getElementById("schoolPlanner_addCourse_day_input").value =
        "Course day";
      document.getElementById("schoolPlanner_addCourse_time_hour_input").value =
        "";
      document.getElementById(
        "schoolPlanner_addCourse_time_minute_input",
      ).value = "";
      this.retrieveCourseDayAndTime();
    }
  };

  addLectureOutline = () => {
    let outline = document.getElementById(
      "schoolPlanner_addLecture_outlines_input",
    ).value;
    lectureOutlines.push(outline);
    this.retrieveLectureOutlines();
  };

  addLectureCorrection = () => {
    const pageValue = document.getElementById(
      "schoolPlanner_addLecture_correctionPage_input",
    ).value;
    const textValue = document.getElementById(
      "schoolPlanner_addLecture_correctionText_input",
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
      "schoolPlanner_addLecture_correctionPage_input",
    ).value = "";
    document.getElementById(
      "schoolPlanner_addLecture_correctionText_input",
    ).value = "";
    this.retrieveLectureCorrections();
  };

  addCourseInstructorsNames = () => {
    let instructorName = document.getElementById(
      "schoolPlanner_addCourse_instructorName_input",
    ).value;
    courseInstructorsNames.push(instructorName);
    this.retrieveCourseInstructorsNames();
  };
  addCourseExam = () => {
    const exam_type = document.getElementById(
      "schoolPlanner_addCourse_examType_input",
    ).value;
    const exam_date = buildExamDateValue({
      day: document.getElementById("schoolPlanner_addCourse_examDate_day_input")
        .value,
      month: document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value,
      year: document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value,
    });
    const exam_time = buildExamTimeValue({
      hour: document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value,
      minute: document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value,
    });
    const course_grade = document.getElementById(
      "schoolPlanner_addCourse_grade_input",
    ).value;
    const course_fullGrade = document.getElementById(
      "schoolPlanner_addCourse_fullGrade_input",
    ).value;

    if (exam_type && exam_date && exam_time) {
      courseExams.push({
        exam_type,
        exam_date,
        exam_time,
        course_grade,
        course_fullGrade,
      });
      document.getElementById("schoolPlanner_addCourse_examType_input").value =
        "Exam type";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_day_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_month_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examDate_year_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_hour_input",
      ).value = "";
      document.getElementById(
        "schoolPlanner_addCourse_examTime_minute_input",
      ).value = "";
      document.getElementById("schoolPlanner_addCourse_grade_input").value = "";
      document.getElementById("schoolPlanner_addCourse_fullGrade_input").value =
        "";
      this.retrieveCourseExams();
    }
  };
  retrieveCourseDayAndTime = () => {
    var courseDayAndTime_ul = document.getElementById(
      "schoolPlanner_addCourse_dayAndTime_ul",
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
        "schoolPlanner_addCourse_dayAndTime_div fr",
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
      "schoolPlanner_addLecture_outlines_ul",
    );
    ul_outlines.innerHTML = "";
    for (var i = 0; i < lectureOutlines.length; i++) {
      let p_lectureOutlines = document.createElement("p");
      let deleteIcon = document.createElement("i");
      let div_lectureOutlines = document.createElement("div");

      p_lectureOutlines.textContent = lectureOutlines[i];

      div_lectureOutlines.setAttribute(
        "class",
        "schoolPlanner_addCourse_outlines_div fr",
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
      "schoolPlanner_addLecture_corrections_ul",
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
          "schoolPlanner_addLecture_correctionItem fr",
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
      "schoolPlanner_addCourse_instructorsNames_ul",
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
        "schoolPlanner_addCourse_instructorsNames_div fr",
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
      "schoolPlanner_addCourse_exams_ul",
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
      div_exam.setAttribute("class", "schoolPlanner_addCourse_exams_div fr");

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
    const actionRail = document.createElement("div");
    const actionsOverlay = document.createElement("div");
    const overlayWindow = document.createElement("div");
    let activeTimerId = null;
    let lastCenteredActionKey = null;

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
        label: "Add",
        iconClass: "fi fi-rr-plus",
        allowWhenIdle: true,
        run: () => {
          this.openAddCourseForm({
            buttonName: "Add",
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

    actionsShell.setAttribute("id", "schoolPlanner_courses_actions");
    actionsShell.setAttribute(
      "class",
      `fc${isIdle ? " schoolPlanner_courses_actions--idle" : ""}`,
    );

    actionsOverlay.setAttribute(
      "class",
      "schoolPlanner_courses_actionsOverlay",
    );
    overlayWindow.setAttribute("class", "schoolPlanner_courses_actionsWindow");
    actionsOverlay.appendChild(overlayWindow);

    actionRail.setAttribute("id", "schoolPlanner_courses_actionRail");
    actionRail.setAttribute("class", "fr");

    actionItems.forEach((actionConfig) => {
      const actionButton = document.createElement("button");
      const actionText = document.createElement("span");

      actionButton.type = "button";
      actionButton.draggable = !isIdle;
      actionButton.tabIndex = isIdle && !actionConfig.allowWhenIdle ? -1 : 0;
      actionButton.setAttribute(
        "aria-disabled",
        isIdle && !actionConfig.allowWhenIdle ? "true" : "false",
      );
      actionButton.dataset.actionKey = actionConfig.key;
      actionButton.setAttribute("class", "schoolPlanner_courses_actionChip fr");
      actionButton.addEventListener("dragstart", (event) => {
        if (isIdle) return;
        event.dataTransfer.setData("text/plain", actionConfig.key);
        actionButton.classList.add(
          "schoolPlanner_courses_actionChip--dragging",
        );
      });
      actionButton.addEventListener("dragend", () => {
        actionButton.classList.remove(
          "schoolPlanner_courses_actionChip--dragging",
        );
      });
      actionButton.addEventListener("click", () => {
        triggerAction(actionConfig);
      });

      actionText.textContent = actionConfig.label;
      actionButton.append(actionText);
      actionRail.appendChild(actionButton);
    });

    const syncIdleWindowSelection = () => {
      if (!isIdle) return;

      const windowRect = overlayWindow.getBoundingClientRect();
      const actionButtons = Array.from(
        actionRail.querySelectorAll(".schoolPlanner_courses_actionChip"),
      );

      let centeredButton = null;
      actionButtons.forEach((button) => {
        const buttonRect = button.getBoundingClientRect();
        const isFullyVisibleInWindow =
          buttonRect.left >= windowRect.left &&
          buttonRect.right <= windowRect.right &&
          buttonRect.top >= windowRect.top &&
          buttonRect.bottom <= windowRect.bottom;

        button.classList.toggle(
          "schoolPlanner_courses_actionChip--windowActive",
          isFullyVisibleInWindow,
        );

        if (isFullyVisibleInWindow && !centeredButton) {
          centeredButton = button;
        }
      });

      const centeredActionKey = centeredButton?.dataset?.actionKey || null;
      if (
        centeredButton &&
        centeredActionKey &&
        centeredActionKey !== lastCenteredActionKey
      ) {
        lastCenteredActionKey = centeredActionKey;
        centeredButton.click();
      } else if (!centeredButton) {
        lastCenteredActionKey = null;
      }
    };

    actionsShell.append(actionRail);
    actionsMount.append(actionsShell, actionsOverlay);

    if (isIdle) {
      actionsShell.addEventListener("scroll", syncIdleWindowSelection, {
        passive: true,
      });
      window.requestAnimationFrame(syncIdleWindowSelection);
    }
  };
  renderCourseDetailsCard = (course) => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
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
      "schoolPlanner_courses_sectionTitle",
    );
    courseSectionTitle.textContent = this.t("courseInformation");
    detailsDiv.appendChild(courseSectionTitle);

    let sendButton = document.createElement("button");
    sendButton.type = "button";
    sendButton.textContent = this.t("send");
    sendButton.setAttribute("class", "schoolPlanner_telegramSendButton");
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
        "schoolPlanner_courseAiStatus schoolPlanner_courseAiStatus--success",
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
        "schoolPlanner_courseAiStatus schoolPlanner_courseAiStatus--error",
      );
      aiStatusError.textContent = this.state.telegram_courseAiStatusError;
      detailsDiv.appendChild(aiStatusError);
    }

    if (isAiDraftActive) {
      let aiDraftActions = document.createElement("div");
      aiDraftActions.setAttribute(
        "class",
        "fr schoolPlanner_courseAiDraftActions",
      );

      let saveDraftButton = document.createElement("button");
      saveDraftButton.type = "button";
      saveDraftButton.setAttribute(
        "class",
        "schoolPlanner_telegramSendButton schoolPlanner_courseAiDraftButton",
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
        "schoolPlanner_telegramSendButton schoolPlanner_courseAiDraftButton schoolPlanner_courseAiDraftButton--secondary",
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
      row.setAttribute("class", "schoolPlanner_courseDetail_row");

      let label = document.createElement("p");
      label.textContent = rowConfig.label;

      let value = isAiDraftActive
        ? document.createElement("input")
        : document.createElement("p");

      if (isAiDraftActive) {
        value.type = "text";
        value.value = String(rowConfig.value || "");
        value.setAttribute("class", "schoolPlanner_courseDetail_input");
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
    examSectionTitle.setAttribute(
      "class",
      "schoolPlanner_courses_sectionTitle",
    );
    examSectionTitle.textContent = this.t("examInformation");
    detailsDiv.appendChild(examSectionTitle);

    let examBlock = document.createElement("div");
    examBlock.setAttribute("id", "schoolPlanner_courses_examBlock");

    if (examEntries.length === 0) {
      let emptyExamState = document.createElement("p");
      emptyExamState.setAttribute("id", "schoolPlanner_courses_examEmpty");
      emptyExamState.textContent = this.t("noExamEntries");
      examBlock.appendChild(emptyExamState);
    } else {
      let examList = document.createElement("ul");
      examList.setAttribute("id", "schoolPlanner_courses_exam_ul");

      examEntries.forEach((examEntry, examIndex) => {
        let examItem = document.createElement("li");
        examItem.setAttribute("class", "schoolPlanner_courses_exam_li");

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
            "schoolPlanner_courseDetail_row schoolPlanner_courseDetail_row_exam",
          );

          let label = document.createElement("p");
          label.textContent = labelText;

          let value = isAiDraftActive
            ? document.createElement("input")
            : document.createElement("p");

          if (isAiDraftActive) {
            value.type = "text";
            value.value = String(valueText || "");
            value.setAttribute("class", "schoolPlanner_courseDetail_input");
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
        noteBlock.setAttribute("class", "schoolPlanner_courseLetterBlock");

        let noteText = document.createElement("p");
        noteText.setAttribute("class", "schoolPlanner_courseLetterText");
        noteText.textContent = assignedLetter;

        noteBlock.appendChild(noteText);
        detailsDiv.appendChild(noteBlock);
      }
    }

    this.playCourseDetailsPrintAnimation();
  };

  renderScheduleSwipePage = () => {
    return (
      <section id="schoolPlanner_scheduleSwipePage" className="fc">
        <div id="schoolPlanner_plan_scheduleBoard" className="fc">
          <div className="schoolPlanner_plan_boardHeader fc">
            <p className="schoolPlanner_plan_boardEyebrow">
              {this.t("plannerControl")}
            </p>
            <div className="schoolPlanner_plan_boardTitleRow fr">
              <p className="schoolPlanner_plan_boardTitle">
                {this.t("planDays")}
              </p>
              <span className="schoolPlanner_plan_boardBadge">
                {this.t("dailyLoad")}
              </span>
            </div>
            <p className="schoolPlanner_plan_boardCopy">
              {this.t("planDaysCopy")}
            </p>
          </div>
          <ul id="schoolPlanner_plan_days_list"></ul>
        </div>
      </section>
    );
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

    actionsWindow.classList.add(
      "schoolPlanner_lectures_actionsWindow--dragging",
    );
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
      actionsWindow.querySelectorAll(".schoolPlanner_courses_actionChip"),
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

    const targetLeft =
      nearestButton.offsetLeft +
      nearestButton.offsetWidth / 2 -
      actionsWindow.clientWidth / 2;

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
      "schoolPlanner_lectures_actionsWindow--dragging",
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
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );
    if (!detailsDiv) return;

    detailsDiv.classList.remove("schoolPlanner_courses_panel--hidden");
    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
    }
    detailsDiv.innerHTML = `
      <div id="schoolPlanner_courses_details_loader" class="fc">
        <img src="/img/loader.gif" alt="" width="50px" />
      </div>
    `;
  };

  hideCourseDetailsPanels = () => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );

    this.courseDetailsTypingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.courseDetailsTypingTimeouts = [];
    this.stopCoursePrintSound();
    if (detailsDiv) {
      detailsDiv.classList.remove("schoolPlanner_courses_panel--printing");
      detailsDiv.classList.add("schoolPlanner_courses_panel--hidden");
      detailsDiv.innerHTML = "";
      detailsDiv.style.transition = "";
      detailsDiv.style.clipPath = "";
      detailsDiv.style.opacity = "";
      detailsDiv.style.filter = "";
    }

    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--printing");
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
      this.renderCourseActionDock(actionsMount, null, [], true);
    }
  };

  playCourseDetailsPrintAnimation = () => {
    let detailsDiv = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    let actionsMount = document.getElementById(
      "schoolPlanner_courses_actions_mount",
    );
    const shouldReduceMotion = this.isReducedMotionEnabled();

    if (detailsDiv) {
      detailsDiv.classList.remove("schoolPlanner_courses_panel--hidden");
      detailsDiv.classList.remove("schoolPlanner_courses_panel--printing");
      detailsDiv.scrollTop = 0;
      this.updateCoursePrintReveal(null, true);
    }

    if (actionsMount) {
      actionsMount.classList.remove("schoolPlanner_courses_panel--hidden");
      actionsMount.classList.remove("schoolPlanner_courses_panel--printing");
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
          ".schoolPlanner_courses_printSpacer",
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
        ".schoolPlanner_courses_printSpacer",
      );
      if (existingSpacer) existingSpacer.remove();

      endLineSpacer = document.createElement("div");
      endLineSpacer.className = "schoolPlanner_courses_printSpacer";
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
    let ul = document.getElementById("schoolPlanner_lectures_ul");
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
        const memory = normalizeMemoryPayload(jsonData);
        const selectedLectureId = this.state.lecture_details?._id;
        var lecture_sorted = memory.lectures.sort((a, b) =>
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
          lectures: memory.lectures,
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
    let ul = document.getElementById("schoolPlanner_lectures_ul");
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
          return null;
        }
        const memory = normalizeMemoryPayload(jsonData);
        console.log(memory.lectures);
        const selectedLectureId = this.state.lecture_details?._id;
        var lecture_sorted = memory.lectures.sort((a, b) =>
          a.lecture_course > b.lecture_course ? -1 : 1,
        );
        var lecture_courses = [];
        lecture_sorted.forEach((lecture) => {
          let progressionStats = getProgressStats(
            lecture.lecture_progress,
            lecture.lecture_length,
          );
          lecture_courses.push(lecture.lecture_course);
          if (lecture.lecture_hidden === false) {
            this.appendLectureRow(ul, lecture, progressionStats, true);
          }
        });
        const matchedLecture = lecture_sorted.find(
          (lecture) =>
            lecture._id === selectedLectureId &&
            lecture.lecture_hidden === false,
        );
        this.setState({
          lectures: memory.lectures,
          lecture_details: matchedLecture || null,
        });
        return {
          lecture_courses: lecture_courses,
          memory,
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
          object.memory.lectures.forEach((lecture) => {
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
    let courseSelect = document.getElementById("schoolPlanner_courses_select");
    let courseDetails = document.getElementById(
      "schoolPlanner_courses_details_div",
    );
    const activeCourseId =
      selectedCourseId || (courseSelect ? courseSelect.value : "");
    if (courseSelect) {
      courseSelect.innerHTML = "";
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
        if (response.status === 200) {
          courseNames = [];
          courseInstructorsNames = [];
          courses_partOfPlan = [];
          return response.json();
        }
      })
      .then((jsonData) => {
        if (!this.isComponentMounted) {
          return null;
        }
        const memory = normalizeMemoryPayload(jsonData);
        courses = memory.courses;
        if (
          String(this.props.state?.username || "").toLowerCase() ===
          "naghamtrkmani"
        ) {
          const exportedCourses = memory.courses
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
        memory.courses.forEach((course) => {
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
          courseSelect.innerHTML =
            "<option selected disabled>Select a course</option>";
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
              this.renderCourseDetailsCard(selectedCourse);
            } else {
              courseSelect.selectedIndex = 0;
              this.renderCourseDetailsCard(null);
            }
          } else {
            this.renderCourseDetailsCard(null);
          }

          courseSelect.onchange = (event) => {
            const selectedCourse = courses.find(
              (course) => course._id === event.target.value,
            );
            this.renderCourseDetailsCard(selectedCourse);
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
          "schoolPlanner_addLecture_course_input",
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
          "schoolPlanner_addLecture_instructorName_input",
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
      .catch(() => {
        if (this.isComponentMounted) {
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
      console.log(checkedLectures[i]);
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
      await fetch(req).then((result) => {
        if (result.status === 201) {
          document.getElementById(checkedLectures[i] + "menuLi_div").remove();
        }
      });
    }

    checkedLectures = [];
  };

  //.............DELETE COURSE.....................
  deleteCourse = async () => {
    alert("afsd");
    if (checkedCourses.length === 0) {
      const courseSelect = document.getElementById(
        "schoolPlanner_courses_select",
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
  syncCourseComponentsList = () => {
    const componentsListNode = document.getElementById(
      "schoolPlanner_addCourse_components_ul",
    );

    if (!componentsListNode) {
      return;
    }

    componentsListNode.innerHTML = "";

    courseComponents.forEach((componentName) => {
      const itemNode = document.createElement("li");
      itemNode.className = "schoolPlanner_addCourse_components_item";

      const labelNode = document.createElement("span");
      labelNode.textContent = componentName;

      const removeNode = document.createElement("button");
      removeNode.type = "button";
      removeNode.textContent = "×";
      removeNode.setAttribute("aria-label", `Remove ${componentName}`);
      removeNode.onclick = () => {
        courseComponents = courseComponents.filter(
          (entry) => entry !== componentName,
        );
        this.syncCourseComponentsList();
      };

      itemNode.appendChild(labelNode);
      itemNode.appendChild(removeNode);
      componentsListNode.appendChild(itemNode);
    });
  };

  addCourseComponent = () => {
    const componentInput = document.getElementById(
      "schoolPlanner_addCourse_component_input",
    );

    if (!componentInput) {
      return;
    }

    const nextComponent = normalizeCourseComponentValue(componentInput.value);

    if (!nextComponent) {
      return;
    }

    if (!courseComponents.includes(nextComponent)) {
      courseComponents = [...courseComponents, nextComponent];
    }

    componentInput.value = "Course component";
    this.syncCourseComponentsList();
  };

  getSelectedCourseComponents = () => {
    const componentInput = document.getElementById(
      "schoolPlanner_addCourse_component_input",
    );
    const draftComponent = normalizeCourseComponentValue(componentInput?.value);
    const selectedComponents = Array.isArray(courseComponents)
      ? [...courseComponents]
      : [];

    if (draftComponent && !selectedComponents.includes(draftComponent)) {
      selectedComponents.push(draftComponent);
    }

    return selectedComponents;
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
          "schoolPlanner_courses_select",
        )?.value;
        this.setState({
          lecture_isLoading: false,
        });
        lectureInEdit = {};
        document.getElementById("schoolPlanner_addLecture_div").style.display =
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
          "schoolPlanner_courses_select",
        )?.value;
        document.getElementById("schoolPlanner_addLecture_div").style.display =
          "none";
        this.retrieveLectures();
        this.retrieveCourses(selectedCourseId);
      }
    });
  };

  //.........ADD COURSE............
  addCourse = (object) => {
    const primaryExam = getPrimaryCourseExam(courseExams);
    const selectedCourseComponents = this.getSelectedCourseComponents();
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
          course_components: selectedCourseComponents,
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
  render() {
    const activeTelegramPdfMessage = this.state.telegram_pdfViewerMessage;
    const activeTelegramPdfKey = this.getTelegramPdfMessageKey(
      activeTelegramPdfMessage,
    );
    const activeTelegramPdfReaderState =
      getStoredPdfReaderState(activeTelegramPdfKey);

    return (
      <React.Fragment>
        <article
          id="schoolPlanner_article"
          ref={this.plannerArticleRef}
          className={`fr ${this.isArabic() ? "schoolPlanner--arabic" : ""}`.trim()}
          dir={this.isArabic() ? "rtl" : "ltr"}
          lang={this.isArabic() ? "ar" : "en"}
          data-locale={this.isArabic() ? "ar" : "en"}
          data-swipe-view={this.state.planner_swipeView}
          data-reduced-motion={this.isReducedMotionEnabled() ? "true" : "false"}
        >
          <div className="fr" id="schoolPlanner_coursesLectures_wrapper">
            <aside id="schoolPlanner_courses_aside" className="fc">
              <div id="schoolPlanner_courses_headerBlock" className="fc"></div>
              <div id="schoolPlanner_courses_panelWrapper" className="fc">
                <div id="schoolPlanner_courses_select_shell">
                  <select id="schoolPlanner_courses_select"></select>
                </div>
                <div
                  id="schoolPlanner_courses_details_div"
                  className="fc schoolPlanner_courses_panel--hidden"
                ></div>
                <div
                  id="schoolPlanner_courses_actions_mount"
                  className="fc schoolPlanner_courses_panel--hidden"
                ></div>
              </div>
              {}
            </aside>
            <div id="schoolPlanner_musicColumn" className="fc">
              <div
                id="schoolPlanner_musicColumn_panel"
                className={`schoolPlanner_stripMonogram${this.state.music_isPlaying ? " schoolPlanner_musicColumn_panel--playing" : ""}`}
              >
                <p id="schoolPlanner_musicColumn_title">{this.t("music")}</p>
                <button
                  id="schoolPlanner_musicColumn_prev"
                  className="schoolPlanner_musicColumn_skip"
                  type="button"
                  aria-label="Previous track"
                  title="Previous track"
                  onClick={() =>
                    this.playPreviousPlannerMusicTrack(
                      this.state.music_isPlaying,
                    )
                  }
                >
                  <i className="fi fi-rr-angle-small-up"></i>
                </button>
                <button
                  id="schoolPlanner_musicColumn_toggle"
                  type="button"
                  aria-label={
                    this.state.music_isPlaying ? "Pause music" : "Play music"
                  }
                  onClick={this.togglePlannerMusic}
                >
                  <i
                    className={
                      this.state.music_isPlaying
                        ? "fi fi-rr-pause"
                        : "fi fi-rr-play"
                    }
                  ></i>
                </button>
                <button
                  id="schoolPlanner_musicColumn_next"
                  className="schoolPlanner_musicColumn_skip"
                  type="button"
                  aria-label="Next track"
                  title="Next track"
                  onClick={() =>
                    this.playNextPlannerMusicTrack(this.state.music_isPlaying)
                  }
                >
                  <i className="fi fi-rr-angle-small-down"></i>
                </button>
                <div
                  id="schoolPlanner_musicColumn_bars"
                  className={
                    this.state.music_isPlaying
                      ? "schoolPlanner_musicColumn_bars--playing"
                      : ""
                  }
                  aria-hidden="true"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div id="schoolPlanner_musicColumn_volumeShell">
                  <input
                    id="schoolPlanner_musicColumn_volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={this.state.music_volume}
                    onChange={this.updatePlannerMusicVolume}
                    aria-label="Music volume"
                  />
                </div>
                <p
                  id="schoolPlanner_musicColumn_track"
                  title={`${this.state.music_trackTitle} - ${this.state.music_trackArtist}`}
                >
                  {this.state.music_isLoading
                    ? this.t("loadingArchive")
                    : this.state.music_trackTitle}
                </p>
              </div>
              <audio
                ref={this.musicAudioRef}
                crossOrigin="anonymous"
                onPlay={() => {
                  this.setState({ music_isPlaying: true });
                  this.startPlannerMusicReactivePalette();
                }}
                onPause={() => {
                  this.setState({ music_isPlaying: false });
                  this.stopPlannerMusicReactivePalette();
                }}
                onEnded={() => this.playNextPlannerMusicTrack(true)}
                onError={() => {
                  this.stopPlannerMusicReactivePalette();
                  this.playNextPlannerMusicTrack(false);
                }}
              />
            </div>
            <section id="schoolPlanner_lectures_section">
              {this.state.lecture_isLoading === true && (
                <div id="lecture_loaderImg" className="loaderImg_div fc">
                  <img src="/img/loader.gif" alt="" width="50px" />
                </div>
              )}
              <nav id="schoolPlanner_lectures_nav" className="fr">
                <div id="schoolPlanner_lectures_actionsShell" className="fc">
                  <div
                    id="schoolPlanner_lectures_actions"
                    className="fc schoolPlanner_courses_actions--idle"
                  >
                    <div
                      id="schoolPlanner_lectures_actionsWindow"
                      className="fr"
                      ref={this.lectureActionsWindowRef}
                      onPointerDown={this.startLectureActionsDrag}
                      onPointerMove={this.moveLectureActionsDrag}
                      onPointerUp={this.stopLectureActionsDrag}
                      onPointerCancel={this.stopLectureActionsDrag}
                      onPointerLeave={this.stopLectureActionsDrag}
                      onScroll={this.queueLectureActionsSnap}
                    >
                      <button
                        className="schoolPlanner_courses_actionChip fr"
                        type="button"
                        data-action-key="add"
                        aria-disabled="false"
                        tabIndex={0}
                        draggable={false}
                        onClick={() =>
                          this.openAddLectureForm({
                            buttonName: "Add",
                          })
                        }
                      >
                        <span>{this.t("addLecture")}</span>
                      </button>
                      <button
                        className="schoolPlanner_courses_actionChip fr"
                        type="button"
                        data-action-key="delete"
                        aria-disabled="false"
                        tabIndex={0}
                        draggable={false}
                        onClick={() => this.deleteLecture(checkedLectures)}
                      >
                        <span>{this.t("deleteLecture")}</span>
                      </button>
                      <button
                        className="schoolPlanner_courses_actionChip fr"
                        type="button"
                        id="schoolPlanner_lectures_hideUnchecked_button"
                        data-action-key="hide-unchecked"
                        aria-disabled="false"
                        tabIndex={0}
                        draggable={false}
                        onClick={() => this.hideUncheckedLectures()}
                      >
                        <span>{this.t("hideUncheckedLectures")}</span>
                      </button>
                      <button
                        className="schoolPlanner_courses_actionChip fr"
                        type="button"
                        id="schoolPlanner_lectures_unhideUnchecked_button"
                        data-action-key="unhide-unchecked"
                        aria-disabled="false"
                        tabIndex={0}
                        draggable={false}
                        onClick={() => this.unhideUncheckedLectures()}
                      >
                        <span>{this.t("unhideUncheckedLectures")}</span>
                      </button>
                    </div>
                    <div className="schoolPlanner_courses_actionsOverlay">
                      <div className="schoolPlanner_courses_actionsWindow"></div>
                    </div>
                  </div>
                </div>
                <div id="schoolPlanner_lectures_search_div" className="fr">
                  <input
                    placeholder={this.t("searchPlaceholder")}
                    id="schoolPlanner_lectures_search_input"
                    onKeyUp={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        this.retrieveLecturesSearched(
                          document.getElementById(
                            "schoolPlanner_lectures_search_input",
                          ).value,
                        );
                      }
                    }}
                    onChange={() => {
                      if (
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value === ""
                      )
                        this.retrieveLectures();
                    }}
                  />
                  <button
                    id="schoolPlanner_lectures_search_button"
                    onClick={() => {
                      this.retrieveLecturesSearched(
                        document.getElementById(
                          "schoolPlanner_lectures_search_input",
                        ).value,
                      );
                    }}
                  >
                    <i className="fi fi-rr-search"></i>
                  </button>
                </div>
              </nav>
              <div id="schoolPlanner_lectures_tableShell">
                <table id="schoolPlanner_lectures_table">
                  <thead id="schoolPlanner_lectures_tableLabels_section">
                    <tr id="schoolPlanner_lectures_tableLabels_div">
                      <th>{this.t("titleHeader")}</th>
                      <th>{this.t("courseHeader")}</th>
                      <th>{this.t("instructorNameHeader")}</th>
                      <th>{this.t("writerNameHeader")}</th>
                    </tr>
                  </thead>
                  <tbody id="schoolPlanner_lectures_ul"></tbody>
                </table>
              </div>
            </section>
          </div>
          <div
            id="schoolPlanner_planDoor_div"
            className="fc"
            data-open={this.state.lecture_details ? "true" : "false"}
          >
            {this.renderLectureDetailsPanel()}
          </div>
          <aside id="schoolPlanner_plan_aside" className="fc">
            <div id="schoolPlanner_plan_wrapper" className="fc">
              <div id="schoolPlanner_plan_commsBoard" className="fc">
                <div
                  id="schoolPlanner_plan_telegramShell"
                  data-suggestions-active={
                    this.state.telegram_courseSuggestionsVisible
                      ? "true"
                      : "false"
                  }
                >
                  <div id="schoolPlanner_plan_telegramControl" className="fc">
                    <div className="schoolPlanner_plan_boardHeader fc">
                      <p className="schoolPlanner_plan_boardEyebrow">
                        {this.t("messageDesk")}
                      </p>
                      <div className="schoolPlanner_plan_boardTitleRow fr">
                        <p className="schoolPlanner_plan_boardTitle">
                          {this.t("telegram")}
                        </p>
                        <span className="schoolPlanner_plan_boardBadge">
                          {this.t("archiveAndSearch")}
                        </span>
                      </div>
                      <p className="schoolPlanner_plan_boardCopy">
                        {this.t("telegramDeskCopy")}
                      </p>
                    </div>
                    <div
                      id="schoolPlanner_plan_telegramControlHeader"
                      className="fc"
                    >
                      <div className="schoolPlanner_plan_telegramControlTitleRow fr">
                        <p id="schoolPlanner_plan_telegramControlTitle">
                          {this.t("telegramControl")}
                        </p>
                        <span className="schoolPlanner_plan_telegramControlBadge">
                          {this.t("save")}
                        </span>
                      </div>
                      <p className="schoolPlanner_plan_telegramControlCopy">
                        {this.t("telegramHint")}
                      </p>
                    </div>
                    <div
                      id="schoolPlanner_plan_telegramConfigGrid"
                      className="fr"
                    >
                      <div
                        id="schoolPlanner_plan_telegramConfigForm"
                        className="fc"
                      >
                        <label
                          htmlFor="schoolPlanner_plan_telegramInput"
                          className="schoolPlanner_plan_telegramControlLabel"
                        >
                          {this.t("groupReference")}
                        </label>
                        <div
                          id="schoolPlanner_plan_telegramConfigRow"
                          className="fr"
                        >
                          <select
                            id="schoolPlanner_plan_telegramInput"
                            value={this.state.telegram_groupInput}
                            onChange={this.updateTelegramGroupInput}
                            onFocus={this.fetchTelegramGroups}
                          >
                            {this.renderTelegramGroupOptions(
                              this.t("groupReferencePlaceholder"),
                            )}
                          </select>
                          <div
                            id="schoolPlanner_plan_telegramHistoryField"
                            className="fc"
                          >
                            <label
                              htmlFor="schoolPlanner_plan_telegramHistoryStart"
                              className="schoolPlanner_plan_telegramControlLabel"
                            >
                              {this.t("historyStartDate")}
                            </label>
                            <input
                              id="schoolPlanner_plan_telegramHistoryStart"
                              name="telegram_historyStartDate"
                              type="date"
                              value={this.state.telegram_historyStartDate}
                              onChange={this.updateTelegramSearchField}
                            />
                          </div>
                        </div>
                        <button
                          id="schoolPlanner_plan_telegramSave"
                          type="button"
                          onClick={this.saveTelegramConfig}
                          disabled={this.state.telegram_isSaving}
                        >
                          {this.state.telegram_isSaving
                            ? this.t("saving")
                            : this.t("save")}
                        </button>
                      </div>
                      <div
                        id="schoolPlanner_plan_telegramStoredGroups"
                        className="fc"
                      >
                        <p className="schoolPlanner_plan_telegramControlLabel">
                          Stored conversations
                        </p>
                        <div
                          id="schoolPlanner_plan_telegramStoredGroupsList"
                          className="fc"
                        >
                          {this.state.telegram_storedGroupOptions.length ===
                          0 ? (
                            <p className="schoolPlanner_plan_telegramStoredGroupEmpty">
                              {this.t("noStoredMessagesYet")}
                            </p>
                          ) : (
                            this.state.telegram_storedGroupOptions.map(
                              (group) => {
                                const groupReference = String(
                                  group?.groupReference || "",
                                ).trim();

                                return (
                                  <div
                                    key={
                                      groupReference ||
                                      String(group?.title || "")
                                    }
                                    className="schoolPlanner_plan_telegramStoredGroupRow fr"
                                  >
                                    <span className="schoolPlanner_plan_telegramStoredGroupName">
                                      {String(
                                        group?.title ||
                                          group?.username ||
                                          groupReference ||
                                          "Telegram Group",
                                      )}
                                    </span>
                                    <span className="schoolPlanner_plan_telegramStoredGroupCount">
                                      {Number(group?.storedCount || 0)}
                                    </span>
                                    <button
                                      type="button"
                                      className="schoolPlanner_plan_telegramStoredGroupDelete"
                                      onClick={() =>
                                        this.deleteStoredTelegramGroup(
                                          groupReference,
                                        )
                                      }
                                      disabled={
                                        this.state
                                          .telegram_deletingGroupReference ===
                                        groupReference
                                      }
                                      aria-label="Delete stored conversation"
                                      title="Delete stored conversation"
                                    >
                                      <i className="fi fi-rr-trash"></i>
                                    </button>
                                  </div>
                                );
                              },
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="schoolPlanner_plan_telegramControlHint">
                      {this.t("telegramHint")}
                    </p>
                    <div
                      id="schoolPlanner_plan_telegramArchiveStatus"
                      className="fc"
                    >
                      <p className="schoolPlanner_plan_telegramArchiveLine">
                        {this.t("storedMessages")}:{" "}
                        {this.state.telegram_storedCount}
                      </p>
                      <p className="schoolPlanner_plan_telegramArchiveLine">
                        {this.t("lastSync")}:{" "}
                        {this.state.telegram_lastSyncedAt
                          ? this.formatTelegramDateTime(
                              this.state.telegram_lastSyncedAt,
                            )
                          : this.t("notSyncedYet")}
                      </p>
                      <p className="schoolPlanner_plan_telegramArchiveLine">
                        {this.isArabic()
                          ? "نتيجة آخر مزامنة"
                          : "Last sync result"}
                        :{" "}
                        {this.state.telegram_lastSyncMessage ||
                          (this.state.telegram_lastSyncError
                            ? `History sync failed: ${this.state.telegram_lastSyncError}`
                            : this.t("notSyncedYet"))}
                      </p>
                      <p className="schoolPlanner_plan_telegramArchiveLine">
                        {this.t("lastStoredMessage")}:{" "}
                        {this.state.telegram_lastStoredMessageDate
                          ? this.formatTelegramDateTime(
                              this.state.telegram_lastStoredMessageDate,
                            )
                          : this.t("noStoredMessagesYet")}
                      </p>
                      <p className="schoolPlanner_plan_telegramArchiveLine">
                        {this.isArabic()
                          ? "الرسائل المفحوصة"
                          : "Scanned messages"}
                        : {this.state.telegram_lastSyncScannedCount}
                      </p>
                    </div>
                    {this.state.telegram_feedback ? (
                      <p className="schoolPlanner_plan_telegramControlFeedback">
                        {this.state.telegram_feedback}
                      </p>
                    ) : null}
                  </div>
                  <div id="schoolPlanner_plan_telegramPanel" className="fc">
                    <div id="schoolPlanner_plan_telegramHeader" className="fr">
                      <select
                        id="schoolPlanner_plan_telegramGroupSelect"
                        value={this.state.telegram_panelGroupReference}
                        onChange={this.updateTelegramPanelGroup}
                        onFocus={this.fetchStoredTelegramGroups}
                      >
                        {this.renderTelegramGroupOptions(
                          this.t("noStoredMessagesYet"),
                          this.getStoredTelegramGroupOptions(),
                        )}
                      </select>
                      <div
                        id="schoolPlanner_plan_telegramButtons"
                        className="fr"
                      >
                        <button
                          id="schoolPlanner_plan_telegramSuggestCourses"
                          type="button"
                          onClick={this.openTelegramCourseSuggestions}
                          disabled={
                            this.state.telegram_courseSuggestionsLoading ||
                            this.state.telegram_courseSuggestionsPanelLoading ||
                            !String(
                              this.state.telegram_panelGroupReference || "",
                            ).trim()
                          }
                        >
                          {this.state.telegram_courseSuggestionsLoading
                            ? this.isArabic()
                              ? "جاري التحليل..."
                              : "Analyzing..."
                            : this.isArabic()
                              ? "توقعات أسماء"
                              : "Name Predictions"}
                        </button>
                        <button
                          id="schoolPlanner_plan_telegramRefresh"
                          type="button"
                          onClick={this.fetchTelegramGroupMessages}
                          title={this.t("telegram")}
                          aria-label={this.t("telegram")}
                        >
                          <i className="fi fi-rr-rotate-right"></i>
                        </button>
                      </div>
                    </div>
                    {!this.state.telegram_courseSuggestionsVisible ? (
                      <>
                        <input
                          id="schoolPlanner_plan_telegramSearchInput"
                          name="telegram_searchQuery"
                          type="text"
                          value={this.state.telegram_searchQuery}
                          onChange={this.updateTelegramSearchField}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              this.submitTelegramSearch();
                            }
                          }}
                          placeholder={this.t("telegramSearchPlaceholder")}
                        />
                        <div
                          id="schoolPlanner_plan_telegramViewToggle"
                          className="fr"
                        >
                          <button
                            type="button"
                            className="schoolPlanner_plan_telegramViewButton"
                            data-active={
                              this.state.telegram_viewMode === "messages"
                                ? "true"
                                : "false"
                            }
                            onClick={() =>
                              this.updateTelegramViewMode("messages")
                            }
                          >
                            {this.t("telegramMessagesTab")}
                          </button>
                          <button
                            type="button"
                            className="schoolPlanner_plan_telegramViewButton"
                            data-active={
                              this.state.telegram_viewMode === "pdfs"
                                ? "true"
                                : "false"
                            }
                            onClick={() => this.updateTelegramViewMode("pdfs")}
                          >
                            {this.t("telegramPdfsTab")}
                          </button>
                        </div>
                      </>
                    ) : null}
                    <div id="schoolPlanner_plan_telegramContent" className="fr">
                      {this.state.telegram_courseSuggestionsVisible ? (
                        <div
                          id="schoolPlanner_plan_telegramSuggestions"
                          className="fc"
                        >
                          <div className="fc schoolPlanner_plan_telegramSuggestionsHeader">
                            <p className="schoolPlanner_plan_telegramSuggestionsTitle">
                              {this.isArabic()
                                ? "توقعات أسماء المقررات"
                                : this.state.telegram_courseSuggestionsView ===
                                    "rejected"
                                  ? "Rejected Course Suggestions"
                                  : "Course Name Predictions"}
                            </p>
                            <p className="schoolPlanner_plan_telegramSuggestionsSubtitle">
                              {this.isArabic()
                                ? "استخرج الاسم فقط أولاً، ثم اعتمد البطاقة المعلقة قبل طلب بقية التفاصيل لنفس المقرر."
                                : "Extract the course name first, approve the pending card, then request the remaining details for that same course."}
                            </p>
                            <p className="schoolPlanner_plan_telegramSuggestionsSelectedPdf">
                              {this.state.telegram_selectedSuggestionPdfTitle
                                ? `Selected PDF: ${this.state.telegram_selectedSuggestionPdfTitle}`
                                : "Select one PDF from the PDFs tab to generate name predictions."}
                            </p>
                            <label className="schoolPlanner_plan_telegramControlLabel">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  this.state.telegram_searchSelectedPdfs,
                                )}
                                onChange={(event) =>
                                  this.setState({
                                    telegram_searchSelectedPdfs:
                                      event.target.checked,
                                  })
                                }
                              />{" "}
                              {this.isArabic()
                                ? "Ø§Ù„Ø¨Ø­Ø« ÙÙŠ PDF Ø§Ù„Ù…Ø­Ø¯Ø¯"
                                : "Search in selected PDFs"}
                            </label>
                            <div className="fr schoolPlanner_plan_telegramSuggestionsActions">
                              <button
                                type="button"
                                className="schoolPlanner_plan_telegramSuggestCoursesInline"
                                onClick={() =>
                                  this.fetchTelegramCourseSuggestions("ai")
                                }
                                disabled={
                                  this.state
                                    .telegram_courseSuggestionsLoading ||
                                  !String(
                                    this.state.telegram_panelGroupReference ||
                                      "",
                                  ).trim()
                                }
                              >
                                {this.state.telegram_courseSuggestionsLoading &&
                                this.state
                                  .telegram_courseSuggestionsLoadingMode ===
                                  "ai"
                                  ? "Analyzing stored..."
                                  : this.isArabic()
                                    ? "توقعات بالذكاء"
                                    : "Stored AI Suggestions"}
                              </button>
                              <button
                                type="button"
                                className="schoolPlanner_plan_telegramSuggestCoursesInline"
                                onClick={this.openTelegramCourseSuggestions}
                                disabled={
                                  this.state
                                    .telegram_courseSuggestionsPanelLoading ||
                                  !String(
                                    this.state.telegram_panelGroupReference ||
                                      "",
                                  ).trim()
                                }
                              >
                                {this.isArabic()
                                  ? "ØªØµÙØ­ Ø§Ù„Ù…Ø­ÙÙˆØ¸"
                                  : "Browse Stored"}
                              </button>
                              <button
                                type="button"
                                className="schoolPlanner_plan_telegramSuggestCoursesInline"
                                onClick={() =>
                                  this.fetchTelegramCourseSuggestions("more")
                                }
                                disabled={
                                  this.state
                                    .telegram_courseSuggestionsLoading ||
                                  this.state.telegram_courseSuggestionsView ===
                                    "rejected" ||
                                  !String(
                                    this.state.telegram_panelGroupReference ||
                                      "",
                                  ).trim() ||
                                  !Array.isArray(
                                    this.state.telegram_courseSuggestions,
                                  ) ||
                                  this.state.telegram_courseSuggestions
                                    .length === 0
                                }
                              >
                                {this.state.telegram_courseSuggestionsLoading &&
                                this.state
                                  .telegram_courseSuggestionsLoadingMode ===
                                  "more"
                                  ? "Loading more..."
                                  : this.isArabic()
                                    ? "Ø§Ù‚ØªØ±Ø§Ø­Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©"
                                    : "More Stored Suggestions"}
                              </button>
                              <button
                                type="button"
                                className="schoolPlanner_plan_telegramSuggestCoursesInline schoolPlanner_plan_telegramSuggestCoursesLocal"
                                onClick={
                                  this.openRejectedTelegramCourseSuggestions
                                }
                                disabled={
                                  this.state
                                    .telegram_courseSuggestionsPanelLoading ||
                                  !String(
                                    this.state.telegram_panelGroupReference ||
                                      "",
                                  ).trim()
                                }
                              >
                                {this.isArabic()
                                  ? "ØªØµÙØ­ Ø§Ù„Ù…Ø±ÙÙˆØ¶"
                                  : "Browse Rejected"}
                              </button>
                              <button
                                type="button"
                                className="schoolPlanner_plan_telegramSuggestCoursesInline schoolPlanner_plan_telegramSuggestCoursesClear"
                                onClick={
                                  this.clearSavedTelegramCourseSuggestions
                                }
                                disabled={
                                  !Array.isArray(
                                    this.state.telegram_courseSuggestions,
                                  ) ||
                                  this.state.telegram_courseSuggestions
                                    .length === 0
                                }
                              >
                                {this.isArabic() ? "مسح" : "Clear"}
                              </button>
                            </div>
                          </div>
                          {this.state.telegram_courseSuggestionsPanelLoading ? (
                            <p className="schoolPlanner_plan_telegramSuggestionStatus">
                              {this.isArabic()
                                ? "جارٍ تحميل توقعات الأسماء المحفوظة..."
                                : "Loading saved name predictions..."}
                            </p>
                          ) : null}
                          {this.state.telegram_courseSuggestionsError ? (
                            <p className="schoolPlanner_plan_telegramSuggestionStatus">
                              {this.state.telegram_courseSuggestionsError}
                            </p>
                          ) : null}
                          {this.state.telegram_courseSuggestionsFeedback ? (
                            <p className="schoolPlanner_plan_telegramSuggestionStatus">
                              {this.state.telegram_courseSuggestionsFeedback}
                            </p>
                          ) : null}
                          {this.state.telegram_courseSuggestionsLiveStatus ? (
                            <p className="schoolPlanner_plan_telegramSuggestionLiveLine">
                              {this.state.telegram_courseSuggestionsLiveStatus}
                            </p>
                          ) : null}
                          {this.state.telegram_courseSuggestions.length > 0 ? (
                            <div className="schoolPlanner_plan_telegramSuggestionGrid">
                              {this.state.telegram_courseSuggestions.map(
                                (suggestion) => {
                                  const coursePayload =
                                    suggestion.coursePayload || {};
                                  const courseArabic =
                                    suggestion.courseArabic || {};
                                  const courseEnglish =
                                    suggestion.courseEnglish || {};
                                  const duplicateKey =
                                    buildCourseDuplicateKey(coursePayload);
                                  const openingSuggestion =
                                    this.state
                                      .telegram_approvingSuggestionKey ===
                                    suggestion.suggestionKey;
                                  const rawCourseName = String(
                                    coursePayload.course_name || "",
                                  ).trim();
                                  const arabicTitle =
                                    String(
                                      courseArabic.course_name || "",
                                    ).trim() ||
                                    (/[ء-ي]/.test(rawCourseName)
                                      ? rawCourseName
                                      : "");
                                  const englishTitle =
                                    String(
                                      courseEnglish.course_name || "",
                                    ).trim() ||
                                    (/[A-Za-z]/.test(rawCourseName)
                                      ? rawCourseName
                                      : "");
                                  const displayMatchedKeys = Array.isArray(
                                    suggestion.matchedKeys,
                                  )
                                    ? [
                                        ...new Set(
                                          suggestion.matchedKeys
                                            .map((key) =>
                                              String(key || "").trim(),
                                            )
                                            .filter(Boolean),
                                        ),
                                      ]
                                    : [];

                                  return (
                                    <div
                                      key={
                                        suggestion.suggestionKey || duplicateKey
                                      }
                                      className="schoolPlanner_plan_telegramSuggestionCard fc"
                                    >
                                      <div className="fr schoolPlanner_plan_telegramSuggestionHeader">
                                        <div className="fc schoolPlanner_plan_telegramSuggestionTitleWrap">
                                          <p className="schoolPlanner_plan_telegramSuggestionTitle">
                                            {arabicTitle || this.t("noText")}
                                          </p>
                                          <p className="schoolPlanner_plan_telegramSuggestionMetaLine">
                                            {englishTitle || this.t("noText")}
                                          </p>
                                        </div>
                                        <span className="schoolPlanner_plan_telegramSuggestionConfidence">
                                          {Number(suggestion.confidence || 0)}%
                                        </span>
                                      </div>
                                      <div className="fc schoolPlanner_plan_telegramSuggestionBody">
                                        <p className="schoolPlanner_plan_telegramSuggestionRow">
                                          <strong>
                                            {this.isArabic()
                                              ? "المفاتيح المطابقة"
                                              : "Matched keys"}
                                            :
                                          </strong>{" "}
                                          {displayMatchedKeys.length > 0
                                            ? displayMatchedKeys.join(", ")
                                            : "-"}
                                        </p>
                                        {Array.isArray(suggestion.reasons) &&
                                        suggestion.reasons.length > 0 ? (
                                          <div className="fc schoolPlanner_plan_telegramSuggestionReasons">
                                            {suggestion.reasons.map(
                                              (reason, reasonIndex) => (
                                                <p
                                                  key={`${suggestion.suggestionKey}-reason-${reasonIndex}`}
                                                  className="schoolPlanner_plan_telegramSuggestionReason"
                                                >
                                                  {reason}
                                                </p>
                                              ),
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                      {this.state
                                        .telegram_courseSuggestionsView !==
                                      "rejected" ? (
                                        <div className="fr schoolPlanner_plan_telegramSuggestionActions">
                                          <button
                                            type="button"
                                            className="schoolPlanner_plan_telegramSuggestApprove"
                                            onClick={() =>
                                              this.approveTelegramCourseSuggestion(
                                                suggestion.suggestionKey,
                                              )
                                            }
                                            disabled={openingSuggestion}
                                          >
                                            {openingSuggestion
                                              ? this.isArabic()
                                                ? "جاري الإضافة..."
                                                : "Adding..."
                                              : this.isArabic()
                                                ? "اعتماد بطاقة معلقة"
                                                : "Approve Pending Card"}
                                          </button>
                                          <button
                                            type="button"
                                            className="schoolPlanner_plan_telegramSuggestDismiss"
                                            onClick={() =>
                                              this.dismissTelegramCourseSuggestion(
                                                suggestion.suggestionKey,
                                              )
                                            }
                                          >
                                            {this.isArabic() ? "رفض" : "Reject"}
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {!this.state.telegram_courseSuggestionsVisible ? (
                        <div
                          id="schoolPlanner_plan_telegramBody"
                          className="fc"
                        >
                          {this.state.telegram_isLoading ? (
                            <p className="schoolPlanner_plan_telegramStatus">
                              {this.t("loadingTelegramMessages")}
                            </p>
                          ) : this.state.telegram_error ? (
                            <p className="schoolPlanner_plan_telegramStatus">
                              {this.state.telegram_error}
                            </p>
                          ) : this.state.telegram_viewMode === "pdfs" &&
                            this.getSortedTelegramPdfs().length === 0 ? (
                            <p className="schoolPlanner_plan_telegramStatus">
                              {this.t("noTelegramPdfsYet")}
                            </p>
                          ) : this.state.telegram_viewMode === "pdfs" ? (
                            <>
                              {this.getSortedTelegramPdfs().map((message) => (
                                <div
                                  key={
                                    message.id ||
                                    message.attachmentFileName ||
                                    `${message.sender}-${message.date}`
                                  }
                                  className="schoolPlanner_plan_telegramPdfCard fc"
                                >
                                  <div className="fr schoolPlanner_plan_telegramPdfHeader">
                                    <span className="schoolPlanner_plan_telegramPdfBadge">
                                      PDF
                                    </span>
                                    <span className="schoolPlanner_plan_telegramPdfTime">
                                      {this.formatTelegramDateTime(
                                        message.date,
                                      )}
                                    </span>
                                  </div>
                                  <p className="schoolPlanner_plan_telegramPdfTitle">
                                    {message.attachmentFileName ||
                                      message.text ||
                                      this.t("noText")}
                                  </p>
                                  {message.text &&
                                  message.text !==
                                    message.attachmentFileName ? (
                                    <p className="schoolPlanner_plan_telegramPdfCaption">
                                      {message.text}
                                    </p>
                                  ) : null}
                                  {message.attachmentTextExtracted ? (
                                    <p className="schoolPlanner_plan_telegramPdfExtract">
                                      {message.attachmentTextExtracted.slice(
                                        0,
                                        280,
                                      )}
                                      {message.attachmentTextExtracted.length >
                                      280
                                        ? "..."
                                        : ""}
                                    </p>
                                  ) : null}
                                  <div className="fr schoolPlanner_plan_telegramMeta">
                                    <span>
                                      {message.sender || this.t("unknown")}
                                    </span>
                                    <span>
                                      {this.formatTelegramAttachmentSize(
                                        message.attachmentSizeBytes,
                                      ) ||
                                        String(
                                          message.attachmentMimeType ||
                                            "application/pdf",
                                        )}
                                    </span>
                                  </div>
                                  <div className="fr schoolPlanner_plan_telegramPdfActions">
                                    <button
                                      type="button"
                                      className="schoolPlanner_plan_telegramPdfOpen schoolPlanner_plan_telegramPdfSuggest"
                                      onClick={() =>
                                        this.selectTelegramPdfForSuggestions(
                                          message,
                                        )
                                      }
                                    >
                                      {Number(
                                        this.state
                                          .telegram_selectedSuggestionPdfId ||
                                          0,
                                      ) === Number(message?.id || 0)
                                        ? "Selected for Suggestions"
                                        : "Use for Suggestions"}
                                    </button>
                                    <button
                                      type="button"
                                      className="schoolPlanner_plan_telegramPdfOpen"
                                      onClick={() =>
                                        this.openStoredTelegramPdf(message)
                                      }
                                      disabled={
                                        this.state.telegram_openingPdfKey ===
                                        `${String(
                                          this.state
                                            .telegram_panelGroupReference || "",
                                        ).trim()}:${Number(message?.id || 0)}`
                                      }
                                    >
                                      {this.state.telegram_openingPdfKey ===
                                      `${String(
                                        this.state
                                          .telegram_panelGroupReference || "",
                                      ).trim()}:${Number(message?.id || 0)}`
                                        ? "Opening..."
                                        : this.isArabic()
                                          ? "افتح"
                                          : "Open"}
                                    </button>
                                    <button
                                      type="button"
                                      className="schoolPlanner_plan_telegramPdfOpen schoolPlanner_plan_telegramPdfOpenAlt"
                                      onClick={() =>
                                        this.uploadStoredTelegramPdfToCloud(
                                          message,
                                        )
                                      }
                                      disabled={
                                        this.state
                                          .telegram_cloudUploadPdfKey ===
                                          `${String(
                                            this.state
                                              .telegram_panelGroupReference ||
                                              "",
                                          ).trim()}:${Number(message?.id || 0)}` ||
                                        Boolean(
                                          this.state
                                            .telegram_cloudAddedPdfKeys?.[
                                            `${String(
                                              this.state
                                                .telegram_panelGroupReference ||
                                                "",
                                            ).trim()}:${Number(message?.id || 0)}`
                                          ],
                                        )
                                      }
                                    >
                                      {this.state.telegram_cloudAddedPdfKeys?.[
                                        `${String(
                                          this.state
                                            .telegram_panelGroupReference || "",
                                        ).trim()}:${Number(message?.id || 0)}`
                                      ]
                                        ? "Added to Cloud"
                                        : this.state
                                              .telegram_cloudUploadPdfKey ===
                                            `${String(
                                              this.state
                                                .telegram_panelGroupReference ||
                                                "",
                                            ).trim()}:${Number(message?.id || 0)}`
                                          ? "Adding..."
                                          : "Add to Cloud"}
                                    </button>
                                    <button
                                      type="button"
                                      className="schoolPlanner_plan_telegramPdfOpen schoolPlanner_plan_telegramPdfOpenAlt"
                                      onClick={() =>
                                        this.openStoredTelegramPdfInNewTab(
                                          message,
                                        )
                                      }
                                    >
                                      {this.isArabic()
                                        ? "علامة تبويب"
                                        : "Open Tab"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : this.state.telegram_messages.length === 0 ? (
                            <p className="schoolPlanner_plan_telegramStatus">
                              {this.t("noTelegramMessagesYet")}
                            </p>
                          ) : (
                            <>
                              {this.groupTelegramMessagesByDay(
                                this.state.telegram_messages,
                              ).flatMap((messageGroup) => [
                                <div
                                  key={`${messageGroup.dayLabel}-separator`}
                                  className="schoolPlanner_plan_telegramDaySeparator"
                                >
                                  <span className="schoolPlanner_plan_telegramDaySeparatorText">
                                    {messageGroup.dayLabel}
                                  </span>
                                </div>,
                                ...messageGroup.items.map((message) => (
                                  <div
                                    key={
                                      message.id ||
                                      `${message.sender}-${message.date}`
                                    }
                                    className="schoolPlanner_plan_telegramMessageRow fc"
                                  >
                                    <div
                                      className="schoolPlanner_plan_telegramMessage fc"
                                      dir="auto"
                                    >
                                      <p>{message.text || this.t("noText")}</p>
                                      <div className="fr schoolPlanner_plan_telegramMeta">
                                        <span>
                                          {message.sender || this.t("unknown")}
                                        </span>
                                        <span>
                                          {this.formatTelegramTimeOnly(
                                            message.date,
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )),
                              ])}
                            </>
                          )}
                          <p id="schoolPlanner_plan_telegramSearchSummary">
                            {this.t("showingResults", {
                              count: this.state.telegram_messages.length,
                              rawCount: this.state.telegram_rawCount,
                            })}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          {this.renderScheduleSwipePage()}
          <button
            id="schoolPlanner_navStrip_left"
            type="button"
            className="schoolPlanner_navStrip schoolPlanner_navStrip--left"
            data-active={
              this.state.planner_swipeView === "telegram" ? "true" : "false"
            }
            onClick={this.toggleTelegramSwipeView}
            aria-label={
              this.state.planner_swipeView === "telegram"
                ? this.isArabic()
                  ? "العودة إلى المخطط"
                  : "Return to planner"
                : this.isArabic()
                  ? "افتح صفحة تيليجرام"
                  : "Open Telegram page"
            }
            title={
              this.state.planner_swipeView === "telegram"
                ? this.isArabic()
                  ? "العودة إلى المخطط"
                  : "Return to planner"
                : this.isArabic()
                  ? "افتح صفحة تيليجرام"
                  : "Open Telegram page"
            }
          >
            <span className="schoolPlanner_navStrip_label">
              {this.t("telegram")}
            </span>
            <i
              className={
                this.state.planner_swipeView === "telegram"
                  ? "fi fi-rr-angle-small-right"
                  : "fi fi-rr-angle-small-left"
              }
            ></i>
          </button>
          <button
            id="schoolPlanner_navStrip_bottom"
            type="button"
            className="schoolPlanner_navStrip schoolPlanner_navStrip--bottom"
            data-active={
              this.state.planner_swipeView === "schedule" ? "true" : "false"
            }
            onClick={this.toggleScheduleSwipeView}
            aria-label={
              this.state.planner_swipeView === "schedule"
                ? this.isArabic()
                  ? "العودة إلى المخطط"
                  : "Return to planner"
                : this.isArabic()
                  ? "افتح صفحة الجدول"
                  : "Open schedule page"
            }
            title={
              this.state.planner_swipeView === "schedule"
                ? this.isArabic()
                  ? "العودة إلى المخطط"
                  : "Return to planner"
                : this.isArabic()
                  ? "افتح صفحة الجدول"
                  : "Open schedule page"
            }
          >
            <span className="schoolPlanner_navStrip_label">
              {this.t("planDays")}
            </span>
            <i
              className={
                this.state.planner_swipeView === "schedule"
                  ? "fi fi-rr-angle-small-down"
                  : "fi fi-rr-angle-small-up"
              }
            ></i>
          </button>
          <div id="schoolPlanner_addLecture_div" className="fc">
            <label onClick={this.closeAddLectureForm}>{this.t("close")}</label>
            <form id="schoolPlanner_addLecture_form" className="fc">
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowWide">
                <input
                  id="schoolPlanner_addLecture_name_input"
                  placeholder={this.t("lectureNamePlaceholder")}
                />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <select id="schoolPlanner_addLecture_course_input">
                  <option selected disabled>
                    {this.t("lectureCoursePlaceholder")}
                  </option>
                </select>
                <select id="schoolPlanner_addLecture_instructorName_input">
                  <option selected disabled>
                    {this.t("lectureInstructorPlaceholder")}
                  </option>
                </select>
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit">
                <input
                  id="schoolPlanner_addLecture_writerName_input"
                  placeholder={this.t("lectureWriterPlaceholder")}
                />
                <input id="schoolPlanner_addLecture_date_input" type="date" />
              </div>
              <div className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowNarrow">
                <input
                  id="schoolPlanner_addLecture_length_input"
                  placeholder={this.t("lectureLengthPlaceholder")}
                />
              </div>
              <div
                id="schoolPlanner_addLecture_corrections_div"
                className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowWide"
              >
                <div className="fc">
                  <div
                    id="schoolPlanner_addLecture_corrections_inputs"
                    className="schoolPlanner_addLecture_row schoolPlanner_addLecture_rowSplit"
                  >
                    <input
                      id="schoolPlanner_addLecture_correctionPage_input"
                      placeholder={this.t("correctionPagePlaceholder")}
                      type="number"
                      min="1"
                    />
                    <input
                      id="schoolPlanner_addLecture_correctionText_input"
                      placeholder={this.t("correctionNotePlaceholder")}
                    />
                  </div>
                  <ul
                    id="schoolPlanner_addLecture_corrections_ul"
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
              <div id="schoolPlanner_addLecture_outlines_div" className="fr">
                <div className="fc">
                  <textarea
                    id="schoolPlanner_addLecture_outlines_input"
                    placeholder={this.t("lectureOutlinePlaceholder")}
                  />
                  <ul
                    id="schoolPlanner_addLecture_outlines_ul"
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
              id="schoolPlanner_addLecture_addButton_label"
              onClick={() => {
                let buttonName = document.getElementById(
                  "schoolPlanner_addLecture_addButton_label",
                ).textContent;
                let lecture_name = document.getElementById(
                  "schoolPlanner_addLecture_name_input",
                ).value;
                let lecture_course = document.getElementById(
                  "schoolPlanner_addLecture_course_input",
                ).value;
                let lecture_instructor = document.getElementById(
                  "schoolPlanner_addLecture_instructorName_input",
                ).value;
                let lecture_writer = document.getElementById(
                  "schoolPlanner_addLecture_writerName_input",
                ).value;
                let lecture_date = document.getElementById(
                  "schoolPlanner_addLecture_date_input",
                ).value;
                let lecture_length = document.getElementById(
                  "schoolPlanner_addLecture_length_input",
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
              Add
            </label>
          </div>
          {this.state.show_addCourseForm ? (
            <div id="schoolPlanner_addCourse_div" className="fc">
              <div
                id="schoolPlanner_addCourse_closeButton"
                role="button"
                tabIndex={0}
                onClick={this.closeAddCourseForm}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    this.closeAddCourseForm();
                  }
                }}
              >
                {this.t("close")}
              </div>
              <div id="schoolPlanner_addCourse_scrollArea" className="fc">
                <form id="schoolPlanner_addCourse_form" className="fc">
                  <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowSplit">
                    <input
                      id="schoolPlanner_addCourse_name_input"
                      placeholder={this.t("courseNamePlaceholder")}
                    />
                    <div
                      id="schoolPlanner_addCourse_components_div"
                      className="fc"
                    >
                      <div
                        id="schoolPlanner_addCourse_component_input_section"
                        className="fr"
                      >
                        <select id="schoolPlanner_addCourse_component_input">
                          <option
                            selected={true}
                            disabled="disabled"
                            value="Course component"
                          >
                            {this.t("courseComponentPlaceholder")}
                          </option>
                          <option value="In-class">{this.t("inClass")}</option>
                          <option value="Out-of-class">
                            {this.t("outOfClass")}
                          </option>
                        </select>
                        <button
                          type="button"
                          id="schoolPlanner_addCourse_component_addButton"
                          onClick={() => {
                            this.addCourseComponent();
                          }}
                        >
                          {this.t("add")}
                        </button>
                      </div>
                      <ul id="schoolPlanner_addCourse_components_ul"></ul>
                    </div>
                  </div>
                  <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                    <div
                      id="schoolPlanner_addCourse_dayAndTime_div"
                      className="fr"
                    >
                      <section
                        id="schoolPlanner_addCourse_dayAndTime_input_section"
                        className="fc"
                      >
                        <div className="fc">
                          <select id="schoolPlanner_addCourse_day_input">
                            <option
                              selected={true}
                              disabled="disabled"
                              value="Course day"
                            >
                              {this.t("courseDayPlaceholder")}
                            </option>
                            <option value="Sunday">{this.t("sunday")}</option>
                            <option value="Monday">{this.t("monday")}</option>
                            <option value="Tuesday">{this.t("tuesday")}</option>
                            <option value="Wednesday">
                              {this.t("wednesday")}
                            </option>
                            <option value="Thursday">
                              {this.t("thursday")}
                            </option>
                            <option value="Friday">{this.t("friday")}</option>
                            <option value="Saturday">
                              {this.t("saturday")}
                            </option>
                          </select>
                          <div
                            id="schoolPlanner_addCourse_time_inputs"
                            className="fr"
                          >
                            <input
                              placeholder="hh"
                              id="schoolPlanner_addCourse_time_hour_input"
                            />
                            <input
                              placeholder="mm"
                              id="schoolPlanner_addCourse_time_minute_input"
                            />
                          </div>
                        </div>
                      </section>
                      <ul
                        id="schoolPlanner_addCourse_dayAndTime_ul"
                        className="fr"
                      ></ul>
                      <div id="schoolPlanner_addCourse_dayAndTime_label">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            this.addCourseDayAndTime({
                              day: document.getElementById(
                                "schoolPlanner_addCourse_day_input",
                              ).value,
                              time: buildExamTimeValue({
                                hour: document.getElementById(
                                  "schoolPlanner_addCourse_time_hour_input",
                                ).value,
                                minute: document.getElementById(
                                  "schoolPlanner_addCourse_time_minute_input",
                                ).value,
                              }),
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              this.addCourseDayAndTime({
                                day: document.getElementById(
                                  "schoolPlanner_addCourse_day_input",
                                ).value,
                                time: buildExamTimeValue({
                                  hour: document.getElementById(
                                    "schoolPlanner_addCourse_time_hour_input",
                                  ).value,
                                  minute: document.getElementById(
                                    "schoolPlanner_addCourse_time_minute_input",
                                  ).value,
                                }),
                              });
                            }
                          }}
                        >
                          {this.t("add")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowQuad">
                    <select
                      class="form-select"
                      name="year"
                      id="schoolPlanner_addCourse_year_input"
                    >
                      <option
                        selected={true}
                        disabled="disabled"
                        value="Course year"
                      >
                        {this.t("courseYearPlaceholder")}
                      </option>
                      <option value="1940">1940</option>
                      <option value="1941">1941</option>
                      <option value="1942">1942</option>
                      <option value="1943">1943</option>
                      <option value="1944">1944</option>
                      <option value="1945">1945</option>
                      <option value="1946">1946</option>
                      <option value="1947">1947</option>
                      <option value="1948">1948</option>
                      <option value="1949">1949</option>
                      <option value="1950">1950</option>
                      <option value="1951">1951</option>
                      <option value="1952">1952</option>
                      <option value="1953">1953</option>
                      <option value="1954">1954</option>
                      <option value="1955">1955</option>
                      <option value="1956">1956</option>
                      <option value="1957">1957</option>
                      <option value="1958">1958</option>
                      <option value="1959">1959</option>
                      <option value="1960">1960</option>
                      <option value="1961">1961</option>
                      <option value="1962">1962</option>
                      <option value="1963">1963</option>
                      <option value="1964">1964</option>
                      <option value="1965">1965</option>
                      <option value="1966">1966</option>
                      <option value="1967">1967</option>
                      <option value="1968">1968</option>
                      <option value="1969">1969</option>
                      <option value="1970">1970</option>
                      <option value="1971">1971</option>
                      <option value="1972">1972</option>
                      <option value="1973">1973</option>
                      <option value="1974">1974</option>
                      <option value="1975">1975</option>
                      <option value="1976">1976</option>
                      <option value="1977">1977</option>
                      <option value="1978">1978</option>
                      <option value="1979">1979</option>
                      <option value="1980">1980</option>
                      <option value="1981">1981</option>
                      <option value="1982">1982</option>
                      <option value="1983">1983</option>
                      <option value="1984">1984</option>
                      <option value="1985">1985</option>
                      <option value="1986">1986</option>
                      <option value="1987">1987</option>
                      <option value="1988">1988</option>
                      <option value="1989">1989</option>
                      <option value="1990">1990</option>
                      <option value="1991">1991</option>
                      <option value="1992">1992</option>
                      <option value="1993">1993</option>
                      <option value="1994">1994</option>
                      <option value="1995">1995</option>
                      <option value="1996">1996</option>
                      <option value="1997">1997</option>
                      <option value="1998">1998</option>
                      <option value="1999">1999</option>
                      <option value="2000">2000</option>
                      <option value="2001">2001</option>
                      <option value="2002">2002</option>
                      <option value="2003">2003</option>
                      <option value="2004">2004</option>
                      <option value="2005">2005</option>
                      <option value="2006">2006</option>
                      <option value="2007">2007</option>
                      <option value="2008">2008</option>
                      <option value="2009">2009</option>
                      <option value="2010">2010</option>
                      <option value="2011">2011</option>
                      <option value="2012">2012</option>
                      <option value="2013">2013</option>
                      <option value="2014">2014</option>
                      <option value="2015">2015</option>
                      <option value="2016">2016</option>
                      <option value="2017">2017</option>
                      <option value="2018">2018</option>
                      <option value="2019">2019</option>
                      <option value="2020">2020</option>
                      <option value="2021">2021</option>
                      <option value="2022">2022</option>
                      <option value="2023">2023</option>
                    </select>
                    <select name="" id="schoolPlanner_addCourse_term_input">
                      <option
                        selected={true}
                        disabled="disabled"
                        value="Course term"
                      >
                        {this.t("courseTermPlaceholder")}
                      </option>
                      <option value="Fall">{this.t("fall")}</option>
                      <option value="Winter">{this.t("winter")}</option>
                      <option value="Summer">{this.t("summer")}</option>
                    </select>
                    <select id="schoolPlanner_addCourse_class_input">
                      <option
                        selected={true}
                        disabled="disabled"
                        value="Course classification"
                      >
                        {this.t("courseClassificationPlaceholder")}
                      </option>
                      <option disabled="disabled">
                        {this.t("inClassGroup")}
                      </option>
                      <option value="Basic science">
                        {this.t("basicScience")}
                      </option>
                      <option value="Applied science">
                        {this.t("appliedScience")}
                      </option>
                      <option disabled="disabled">
                        {this.t("outOfClassGroup")}
                      </option>
                      <option value="Lab">{this.t("lab")}</option>
                      <option value="Clinical rotation">
                        {this.t("clinicalRotation")}
                      </option>
                    </select>
                    <select name="" id="schoolPlanner_addCourse_status_input">
                      <option
                        selected={true}
                        disabled="disabled"
                        value="Course status"
                      >
                        {this.t("courseStatusPlaceholder")}
                      </option>
                      <option value="Unstarted">{this.t("unstarted")}</option>
                      <option value="Ongoing">{this.t("ongoing")}</option>
                      <option value="Pass">{this.t("pass")}</option>
                      <option value="Fail">{this.t("fail")}</option>
                    </select>
                  </div>
                  <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide">
                    <div
                      id="schoolPlanner_addCourse_instructorsNames_div"
                      className="fr"
                    >
                      <div
                        id="schoolPlanner_addCourse_instructorName_section"
                        className="fr"
                      >
                        <input
                          id="schoolPlanner_addCourse_instructorName_input"
                          placeholder={this.t("courseInstructorsPlaceholder")}
                        />
                        <ul
                          id="schoolPlanner_addCourse_instructorsNames_ul"
                          className="fr"
                        ></ul>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          this.addCourseInstructorsNames();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            this.addCourseInstructorsNames();
                          }
                        }}
                      >
                        {this.t("add")}
                      </div>
                    </div>
                  </div>
                  <div className="schoolPlanner_addCourse_row schoolPlanner_addCourse_rowWide schoolPlanner_addCourse_rowMeta">
                    <div
                      id="schoolPlanner_addCourse_examSection"
                      className="fc"
                    >
                      <div id="schoolPlanner_addCourse_exam_div" className="fr">
                        <section
                          id="schoolPlanner_addCourse_exam_input_section"
                          className="fc"
                        >
                          <div
                            id="schoolPlanner_addCourse_exam_input_section_inner"
                            className="fc"
                          >
                            <label
                              htmlFor="schoolPlanner_addCourse_examDate_day_input"
                              className="schoolPlanner_addCourse_examFieldLabel"
                            >
                              {this.t("examDateLabel")}
                            </label>
                            <div
                              id="schoolPlanner_addCourse_examDate_inputs"
                              className="fr"
                            >
                              <input
                                placeholder="DD"
                                id="schoolPlanner_addCourse_examDate_day_input"
                              />
                              <input
                                placeholder="MM"
                                id="schoolPlanner_addCourse_examDate_month_input"
                              />
                              <input
                                placeholder="YYYY"
                                id="schoolPlanner_addCourse_examDate_year_input"
                              />
                            </div>
                            <label
                              htmlFor="schoolPlanner_addCourse_examTime_hour_input"
                              className="schoolPlanner_addCourse_examFieldLabel"
                            >
                              {this.t("examTimeLabel")}
                            </label>
                            <div
                              id="schoolPlanner_addCourse_examTime_inputs"
                              className="fr"
                            >
                              <input
                                placeholder="hh"
                                id="schoolPlanner_addCourse_examTime_hour_input"
                              />
                              <input
                                placeholder="mm"
                                id="schoolPlanner_addCourse_examTime_minute_input"
                              />
                            </div>
                            <label
                              htmlFor="schoolPlanner_addCourse_examType_input"
                              className="schoolPlanner_addCourse_examFieldLabel"
                            >
                              {this.t("examTypeLabel")}
                            </label>
                            <select id="schoolPlanner_addCourse_examType_input">
                              <option
                                selected={true}
                                disabled="disabled"
                                value="Exam type"
                              >
                                {this.t("examTypeLabel")}
                              </option>
                              <option value="Quiz">{this.t("quiz")}</option>
                              <option value="Midterm">
                                {this.t("midterm")}
                              </option>
                              <option value="Final">{this.t("final")}</option>
                              <option value="Practical">
                                {this.t("practical")}
                              </option>
                              <option value="Oral">{this.t("oral")}</option>
                            </select>
                            <label
                              htmlFor="schoolPlanner_addCourse_grade_input"
                              className="schoolPlanner_addCourse_examFieldLabel"
                            >
                              {this.t("gradesLabel")}
                            </label>
                            <div
                              id="schoolPlanner_addCourse_grade_div"
                              className="fr"
                            >
                              <input
                                placeholder={this.t("actualGrade")}
                                id="schoolPlanner_addCourse_grade_input"
                              />
                              <input
                                placeholder={this.t("fullGrade")}
                                id="schoolPlanner_addCourse_fullGrade_input"
                              />
                            </div>
                          </div>
                        </section>
                        <ul
                          id="schoolPlanner_addCourse_exams_ul"
                          className="fr"
                        ></ul>
                        <div id="schoolPlanner_addCourse_exam_label">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              this.addCourseExam();
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                this.addCourseExam();
                              }
                            }}
                          >
                            {this.t("add")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div
                id="schoolPlanner_addCourse_addButton_label"
                role="button"
                tabIndex={0}
                onClick={() => {
                  let buttonName = document.getElementById(
                    "schoolPlanner_addCourse_addButton_label",
                  ).textContent;
                  let course_name = document.getElementById(
                    "schoolPlanner_addCourse_name_input",
                  ).value;
                  let course_component = document.getElementById(
                    "schoolPlanner_addCourse_component_input",
                  ).value;
                  let course_year = document.getElementById(
                    "schoolPlanner_addCourse_year_input",
                  ).value;
                  let course_term = document.getElementById(
                    "schoolPlanner_addCourse_term_input",
                  ).value;
                  let course_class = document.getElementById(
                    "schoolPlanner_addCourse_class_input",
                  ).value;
                  let course_status = document.getElementById(
                    "schoolPlanner_addCourse_status_input",
                  ).value;
                  let course_grade = document.getElementById(
                    "schoolPlanner_addCourse_grade_input",
                  ).value;
                  let course_fullGrade = document.getElementById(
                    "schoolPlanner_addCourse_fullGrade_input",
                  ).value;
                  let exam_date = buildExamDateValue({
                    day: document.getElementById(
                      "schoolPlanner_addCourse_examDate_day_input",
                    ).value,
                    month: document.getElementById(
                      "schoolPlanner_addCourse_examDate_month_input",
                    ).value,
                    year: document.getElementById(
                      "schoolPlanner_addCourse_examDate_year_input",
                    ).value,
                  });
                  let exam_time = buildExamTimeValue({
                    hour: document.getElementById(
                      "schoolPlanner_addCourse_examTime_hour_input",
                    ).value,
                    minute: document.getElementById(
                      "schoolPlanner_addCourse_examTime_minute_input",
                    ).value,
                  });
                  if (this.isActionLabel(buttonName, "Add")) {
                    this.addCourse({
                      course_name: course_name,
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                  if (this.isActionLabel(buttonName, "Edit")) {
                    this.editCourse({
                      course_name: course_name + " (" + course_component + ")",
                      course_component: course_component,
                      course_year: course_year,
                      course_term: course_term,
                      course_class: course_class,
                      course_status: course_status,
                      course_grade: course_grade,
                      course_fullGrade: course_fullGrade,
                      course_length: 0,
                      course_progress: 0,
                      exam_date: exam_date,
                      exam_time: exam_time,
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    let buttonName = document.getElementById(
                      "schoolPlanner_addCourse_addButton_label",
                    ).textContent;
                    let course_name = document.getElementById(
                      "schoolPlanner_addCourse_name_input",
                    ).value;
                    let course_component = document.getElementById(
                      "schoolPlanner_addCourse_component_input",
                    ).value;
                    let course_year = document.getElementById(
                      "schoolPlanner_addCourse_year_input",
                    ).value;
                    let course_term = document.getElementById(
                      "schoolPlanner_addCourse_term_input",
                    ).value;
                    let course_class = document.getElementById(
                      "schoolPlanner_addCourse_class_input",
                    ).value;
                    let course_status = document.getElementById(
                      "schoolPlanner_addCourse_status_input",
                    ).value;
                    let course_grade = document.getElementById(
                      "schoolPlanner_addCourse_grade_input",
                    ).value;
                    let course_fullGrade = document.getElementById(
                      "schoolPlanner_addCourse_fullGrade_input",
                    ).value;
                    let exam_type = document.getElementById(
                      "schoolPlanner_addCourse_examType_input",
                    ).value;
                    let exam_date = buildExamDateValue({
                      day: document.getElementById(
                        "schoolPlanner_addCourse_examDate_day_input",
                      ).value,
                      month: document.getElementById(
                        "schoolPlanner_addCourse_examDate_month_input",
                      ).value,
                      year: document.getElementById(
                        "schoolPlanner_addCourse_examDate_year_input",
                      ).value,
                    });
                    let exam_time = buildExamTimeValue({
                      hour: document.getElementById(
                        "schoolPlanner_addCourse_examTime_hour_input",
                      ).value,
                      minute: document.getElementById(
                        "schoolPlanner_addCourse_examTime_minute_input",
                      ).value,
                    });
                    if (this.isActionLabel(buttonName, "Add")) {
                      this.addCourse({
                        course_name: course_name,
                        course_component: course_component,
                        course_year: course_year,
                        course_term: course_term,
                        course_class: course_class,
                        course_status: course_status,
                        course_grade: course_grade,
                        course_fullGrade: course_fullGrade,
                        course_length: 0,
                        course_progress: 0,
                        exam_type: exam_type,
                        exam_date: exam_date,
                        exam_time: exam_time,
                      });
                    }
                    if (this.isActionLabel(buttonName, "Edit")) {
                      this.editCourse({
                        course_name:
                          course_name + " (" + course_component + ")",
                        course_component: course_component,
                        course_year: course_year,
                        course_term: course_term,
                        course_class: course_class,
                        course_status: course_status,
                        course_grade: course_grade,
                        course_fullGrade: course_fullGrade,
                        course_length: 0,
                        course_progress: 0,
                        exam_type: exam_type,
                        exam_date: exam_date,
                        exam_time: exam_time,
                      });
                    }
                  }
                }}
              >
                {this.t("add")}
              </div>
            </div>
          ) : null}
        </article>
        <PdfReaderModal
          isOpen={this.state.telegram_pdfViewerOpen}
          fileUrl={this.state.telegram_pdfViewerUrl}
          title={
            activeTelegramPdfMessage?.attachmentFileName ||
            activeTelegramPdfMessage?.text ||
            "Telegram PDF"
          }
          metadata={{
            sender: activeTelegramPdfMessage?.sender || "",
            sizeBytes: activeTelegramPdfMessage?.attachmentSizeBytes,
          }}
          initialPage={activeTelegramPdfReaderState.page}
          initialZoom={activeTelegramPdfReaderState.zoom}
          isLoading={this.state.telegram_pdfViewerLoading}
          error={this.state.telegram_pdfViewerError}
          onClose={this.closeTelegramPdfViewer}
          onOpenInNewTab={() => {
            if (this.state.telegram_pdfViewerUrl) {
              window.open(
                this.state.telegram_pdfViewerUrl,
                "_blank",
                "noopener,noreferrer",
              );
              return;
            }

            if (activeTelegramPdfMessage) {
              this.openStoredTelegramPdfInNewTab(activeTelegramPdfMessage);
            }
          }}
          onDownload={() => {
            if (activeTelegramPdfMessage) {
              this.downloadStoredTelegramPdf(activeTelegramPdfMessage);
            }
          }}
          onReaderStateChange={(nextState) => {
            if (activeTelegramPdfMessage) {
              this.persistTelegramPdfReaderState(
                activeTelegramPdfMessage,
                nextState,
              );
            }
          }}
        />
      </React.Fragment>
    );
  }
}
