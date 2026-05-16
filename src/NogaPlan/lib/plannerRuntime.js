export const toSafeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const getDefaultPlannerLocale = () => "ar";

export const getSafePlannerCourses = (memory = {}) =>
  Array.isArray(memory?.courses)
    ? memory.courses
    : Array.isArray(memory?.studyOrganizer?.courses)
      ? memory.studyOrganizer.courses
      : [];

export const getSafePlannerLectures = (memory = {}) =>
  Array.isArray(memory?.lectures) ? memory.lectures : [];

export const getSafePagesPerDay = (lengthValue, progressValue, daysValue) => {
  const length = toSafeNumber(lengthValue);
  const progress = toSafeNumber(progressValue);
  const days = Math.max(0, toSafeNumber(daysValue));

  if (days <= 0) {
    return 0;
  }

  return Math.max(0, Math.ceil((length - progress) / days));
};

export const getPrimaryCourseExam = (examEntries = []) => {
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

export const normalizeCourseDuplicateKeyPart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildCourseDuplicateKey = (course = {}) =>
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

export const formatExamDateParts = (value) => {
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

export const buildExamDateValue = ({ day, month, year }) => {
  const normalizedDay = String(day || "").trim();
  const normalizedMonth = String(month || "").trim();
  const normalizedYear = String(year || "").trim();

  if (!normalizedDay || !normalizedMonth || !normalizedYear) {
    return "";
  }

  return `بعد ${diffDaysWithoutDecimals} يوم و${diffHoursWithoutDecimals} ساعة و${diffMinsWithoutDecimals} دقيقة عن ${examTime_hour} ساعة و${examTime_mins} دقيقة من الآن تقريباً`;
};

export const getPlannerTermRank = (value = "") => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();
  if (normalizedValue === "first") return 1;
  if (normalizedValue === "second") return 2;
  if (normalizedValue === "third") return 3;
  return 99;
};

export const getAcademicYearSortValue = (value = "") => {
  const normalizedValue = String(value || "").trim();
  const match = normalizedValue.match(/^(\d{4})/);
  return match ? Number(match[1]) : -1;
};

export const normalizeProgramYearValue = (value) => {
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

export const getProgramYearSortValue = (course = {}) => {
  const normalizedValue = normalizeProgramYearValue(
    course?.programYear ||
      course?.course_programYear ||
      course?.time?.programYear,
  );
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : -1;
};

export const getComparableProgramYearNumber = (value) => {
  const normalizedValue = normalizeProgramYearValue(value);
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const formatExamTimeParts = (value) => {
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

export const buildExamTimeValue = ({ hour, minute }) => {
  const normalizedHour = String(hour || "").trim();
  const normalizedMinute = String(minute || "").trim();

  if (!normalizedHour || !normalizedMinute) {
    return "";
  }

  return `${normalizedHour.padStart(2, "0")}:${normalizedMinute.padStart(2, "0")}`;
};

export const TELEGRAM_PENDING_VALUE = "(pending)";
export const TELEGRAM_COURSE_PAYLOAD_FIELDS = [
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

export const NOGAPLANNER_WRAPPER_TABS = [
  { key: "courses", label: "المقررات" },
  { key: "lectures", label: "المحاضرات" },
  { key: "exams", label: "الامتحانات" },
];

export const NOGAPLANNER_TEXT = {
  common: {
    appEyebrow: "نوغا بلان",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    cancel: "إلغاء",
    save: "حفظ",
    close: "إغلاق",
    none: "بدون",
  },
  messages: {
    submitCourseNameRequired: "فشل الإرسال. الرجاء إضافة اسم المقرر",
    genericRetry: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    componentTypeRequired: "أدخل نوع المكوّن أولاً",
    courseSaveError: "حدث خطأ في حفظ المقرر. يرجى المحاولة مرة أخرى.",
    courseAddedSuffix: "تمت إضافته",
    selectItemForDetails: "اختر مقرراً أو محاضرة من القائمة لعرض التفاصيل.",
    settingsSaveFailed: "تعذّر حفظ الإعدادات في قاعدة البيانات.",
    settingsServerUnreachable: "تعذّر الاتصال بالخادم أثناء حفظ الإعدادات.",
    settingsSaved: "تم حفظ الإعدادات بنجاح.",
    noLectures: "لا توجد محاضرات",
  },
  lectures: {
    formTitle: "إضافة محاضرة",
    courseName: "اسم المقرر",
    componentType: "نوع المكوّن",
    lectureTitle: "عنوان المحاضرة",
    instructors: "المدرسون",
    writers: "الكتّاب",
    publishDate: "تاريخ النشر",
    content: "المحتوى",
    uploadContent: "رفع محتوى",
    uploadedList: "الملفات المرفوعة",
    noUploadedFiles: "لا توجد ملفات مرفوعة",
    chooseCourse: "اختر المقرر",
    chooseComponent: "اختر المكوّن",
    chooseInstructor: "اختر المدرّس",
    chooseWriter: "اختر الكاتب",
  },
  settings: {
    back: "رجوع",
    backEn: "back",
    title: "إعدادات القوائم",
    lists: "خيارات القوائم",
    defaults: "الافتراضيات",
    relationships: "علاقات المكوّن",
    noListsForTab: "لا توجد قوائم لهذا التبويب",
    chooseBuilding: "اختر المبنى",
    chooseBuildingFirst: "اختر المبنى أولاً",
    noSavedItems: "لا توجد عناصر محفوظة",
    update: "تحديث",
    add: "إضافة",
    deleteSelected: "حذف المحدد",
    deleteAll: "حذف الكل",
    edit: "تعديل",
    logoMotionListener: "استماع حركة المؤشر",
    voiceControlListener: "التحكم الصوتي",
    fixedLogoClock: "تثبيت اتجاه الشعار",
    messageFromFriend: "رسالة من صديق",
    messageFromFriendChoose: "اختر صديقاً",
    messageFromFriendInput: "اكتب رسالة مشجعة",
    messageFromFriendSave: "حفظ الرسائل",
    messageFromFriendFrom: "من صديق (الاستماع)",
    messageFromFriendTo: "إرسال إلى صديق",
    messageFromFriendToList: "قائمة الإرسال",
    messageFromFriendAddToList: "إضافة",
    messageFromFriendDeleteSelected: "حذف المحدد",
    messageFromFriendNoEntries: "لا يوجد أي إدخال",
    motionOn: "مفعّل",
    motionOff: "متوقف",
    selectClock: "اختر الساعة",
    optionGroups: {
      componentClassOptions: {
        label: "أنواع المكوّن",
        placeholder: "أدخل نوع مكوّن",
      },
      weekdayOptions: { label: "الأيام", placeholder: "أدخل يوماً" },
      hourOptions: { label: "الساعات", placeholder: "مثال 08:00" },
      termOptions: { label: "الفصول", placeholder: "أدخل فصلاً" },
      academicYearOptions: {
        label: "السنوات الأكاديمية",
        placeholder: "أدخل سنة أكاديمية",
      },
      locationBuildingOptions: { label: "المبنى", placeholder: "أدخل المبنى" },
      locationRoomOptions: { label: "القاعة", placeholder: "أدخل القاعة" },
    },
  },
  savedCourses: {
    plannerSettings: "الإعدادات",
    restoreDefaultTitle: "Restore default value",
    save: "حفظ",
    close: "إغلاق",
    addLecture: "إضافة محاضرة",
    deleteLecture: "حذف محاضرة",
    clearSelection: "إلغاء التحديد",
    add: "إضافة",
    edit: "تعديل",
    openLectures: "فتح المحاضرات",
    select: "تحديد",
    finishSelection: "إنهاء التحديد",
    closeDetails: "إغلاق التفاصيل",
    showPanelTitle: "إظهار عنوان اللوحة",
    hidePanelTitle: "إخفاء عنوان اللوحة",
    lecturesTitle: "المحاضرات",
    coursesTitle: "المقررات",
    lecturesSubtitle: "أدر المحاضرات مباشرة أو اربطها بالمقرر المحدد.",
    coursesSubtitle: "أدر المقررات ومكوّناتها من نفس اللوحة.",
  },
  examBoard: {
    title: "جدول الامتحانات",
    subtitle: "أدر الامتحانات المحفوظة لنفس المقررات.",
    tabCourses: "المقررات",
    tabLectures: "المحاضرات",
    tabExams: "الامتحانات",
    countExams: "امتحانات",
    countCourses: "مقررات",
    tableCourse: "المقرر",
    tableCourseName: "اسم المقرر",
    tableComponentType: "نوع المكوّن",
    tableType: "النوع",
    tableTime: "التوقيت",
    tableDate: "التاريخ",
    tableStartTime: "ساعة البدء",
    tableEndTime: "ساعة الانتهاء",
    tableLocation: "الموقع",
    tableBuilding: "المبنى",
    tableRoom: "القاعة",
    tableVolume: "الحجم",
    tableWeight: "الوزن",
    tablePass: "النجاح",
    tableGrade: "العلامة",
    tableRecommendation: "التوصية",
    empty: "لا توجد امتحانات",
    saveExam: "حفظ الامتحان",
    addExam: "إضافة امتحان",
    linkedCourseLabel: "بيانات الامتحان",
    linkedCoursePlaceholder: "المقرر المرتبط",
    examTypePlaceholder: "نوع الامتحان",
    timingLabel: "التوقيت",
    normativeLabel: "المفترض",
    actualLabel: "الفعلي",
    yearPlaceholder: "رقم السنة",
    termPlaceholder: "الفصل",
    intervalPlaceholder: "الفترة",
    locationLabel: "الموقع",
    buildingPlaceholder: "المبنى",
    roomPlaceholder: "القاعة",
    linkedLecturesLabel: "المحاضرات المرتبطة",
    noLinkedLectures: "لا توجد محاضرات متاحة لهذا المقرر",
    volumeLabel: "الحجم",
    valuePlaceholder: "القيمة",
    scopePlaceholder: "النطاق",
    notePlaceholder: "ملاحظة",
    weightLabel: "الوزن",
    passGradeLabel: "علامة النجاح",
    minPlaceholder: "الحد الأدنى",
    maxPlaceholder: "الحد الأعلى",
    gradeLabel: "العلامة",
    recommendationLabel: "التوصية",
    suggestedHoursPlaceholder: "الساعات المقترحة",
    reasonPlaceholder: "السبب",
  },
};

export const isPendingCourseValue = (value) =>
  String(value || "").trim() === TELEGRAM_PENDING_VALUE;

export const hasMeaningfulCourseFieldValue = (value) => {
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

export const formatCourseScheduleDisplay = (value) => {
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

export const formatCourseStringListDisplay = (value) => {
  if (Array.isArray(value)) {
    const normalizedEntries = value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);

    return normalizedEntries.length > 0 ? normalizedEntries.join(" | ") : "-";
  }

  const normalizedValue = String(value || "").trim();
  return normalizedValue || "-";
};

export const formatCourseLocationDisplay = (value) => {
  if (!value || typeof value !== "object") {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || "-";
  }

  const locationParts = [value?.building, value?.room]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  return locationParts.length > 0 ? locationParts.join(" | ") : "-";
};

export const formatPlannerStatusLabel = (value) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalizedValue || normalizedValue === "-") {
    return "-";
  }

  const labels = {
    new: "جديد",
    failed: "راسب",
    incomplete: "غير مكتمل",
    passed: "ناجح",
    ongoing: "مستمر",
  };

  return labels[normalizedValue] || String(value || "").trim() || "-";
};
export const detectContentDirection = (value) => {
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

export const getCellAlignmentStyle = (value) => {
  const direction = detectContentDirection(value);
  return {
    direction,
    textAlign: direction === "rtl" ? "right" : "left",
  };
};

export const formatCourseComponentLabel = (value) => {
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
    "clinical rotation": "عملي: دوام مشفى",
    "pharmacy training": "عملي: دوام صيدلية",
  };
  return componentLabels[normalizedValue] || value;
};

export const mergeCoursePayloadWithAiResult = (
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

export const splitCourseTextList = (value = "") =>
  String(value || "")
    .split("|")
    .map((entry) => String(entry || "").trim())
    .filter((entry) => entry && entry !== "-");

export const splitPlannerTextList = (value = "") =>
  (Array.isArray(value) ? value : String(value || "").split(/\||,|\n|;/))
    .flatMap((entry) =>
      Array.isArray(entry) ? entry : String(entry || "").split(/\||,|\n|;/),
    )
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

export const formatPlannerTextList = (value = "") => {
  const entries = splitPlannerTextList(value);
  return entries.length > 0 ? entries.join(" | ") : "-";
};

export const getDefaultInlineCourseDraft = () => ({
  course_code: "",
  course_name: "",
});

export const getDefaultSavedCourseDraft = () => ({
  course_code: "",
  course_components: [],
  course_exams: [],
  course_status: "-",
  course_totalWeight: "",
  component_status: "-",
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

export const buildSavedCourseComponentEntryFromDraft = (draft = {}) => {
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

export const getDefaultInlineLectureDraft = () => ({
  lecture_courseId: "",
  lecture_componentId: "",
  lecture_component: "",
  lecture_volume_total: "",
  lecture_volume_done: "",
  lecture_volume_remaining: "",
  lecture_pagesFinished: [],
  lecture_name: "",
  lecture_instructors: "",
  lecture_writers: "",
  lecture_date: "",
  lecture_contentUploads: [],
});

export const EXAM_WEIGHT_UNIT_OPTIONS = ["نسبة مئوية", "نقاط"];
export const EXAM_GRADE_UNIT_OPTIONS = ["نقاط", "نسبة مئوية"];
export const EXAM_VOLUME_UNIT_OPTIONS = ["صفحات", "أسئلة", "ساعات", "فصول"];
export const EXAM_RECOMMENDATION_TIMING_OPTIONS = [
  "الآن",
  "قريباً",
  "لاحقاً",
  "مراجعة",
];
export const EXAM_RECOMMENDATION_INTENSITY_OPTIONS = [
  "منخفضة",
  "متوسطة",
  "مرتفعة",
];

export const getDefaultExamDraft = () => ({
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
  volumeUnit: "صفحات",
  volumeScope: "",
  volumeNote: "",
  weightValue: "",
  weightUnit: "نسبة مئوية",
  passGradeValue: "",
  passGradeMin: "",
  passGradeMax: "",
  passGradeUnit: "نقاط",
  gradeValue: "",
  gradeMin: "",
  gradeMax: "",
  gradeUnit: "نقاط",
  recommendationTiming: "لاحقاً",
  recommendationIntensity: "متوسطة",
  recommendationSuggestedHours: "",
  recommendationReason: "",
  recommendationNote: "",
});

export const normalizeExamEntryForPlanner = (
  entry = {},
  selectedCourseId = "",
) => ({
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

export const buildExamDraftFromEntry = (entry = {}, selectedCourseId = "") => {
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
      String(normalizedEntry?.volume?.unit || "صفحات").trim() || "صفحات",
    volumeScope: String(normalizedEntry?.volume?.scope || "").trim(),
    volumeNote: String(normalizedEntry?.volume?.note || "").trim(),
    weightValue: String(
      normalizedEntry?.weight?.value ?? normalizedEntry?.course_grade ?? "",
    ).trim(),
    weightUnit:
      String(normalizedEntry?.weight?.unit || "نسبة مئوية").trim() ||
      "نسبة مئوية",
    passGradeValue: String(normalizedEntry?.passGrade?.value ?? "").trim(),
    passGradeMin: String(normalizedEntry?.passGrade?.min ?? "").trim(),
    passGradeMax: String(normalizedEntry?.passGrade?.max ?? "").trim(),
    passGradeUnit:
      String(normalizedEntry?.passGrade?.unit || "نقاط").trim() || "نقاط",
    gradeValue: String(normalizedEntry?.grade?.value ?? "").trim(),
    gradeMin: String(normalizedEntry?.grade?.min ?? "").trim(),
    gradeMax: String(
      normalizedEntry?.grade?.max ?? normalizedEntry?.course_fullGrade ?? "",
    ).trim(),
    gradeUnit: String(normalizedEntry?.grade?.unit || "نقاط").trim() || "نقاط",
    recommendationTiming:
      String(normalizedEntry?.studyRecommendation?.timing || "لاحقاً").trim() ||
      "لاحقاً",
    recommendationIntensity:
      String(
        normalizedEntry?.studyRecommendation?.intensity || "متوسطة",
      ).trim() || "متوسطة",
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

export const buildExamEntryFromDraft = (draft = {}) => {
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
    unit: String(draft?.volumeUnit || "صفحات").trim() || "صفحات",
    scope: String(draft?.volumeScope || "").trim(),
    note: String(draft?.volumeNote || "").trim(),
  };
  const weightValue = Number.isFinite(Number(draft?.weightValue))
    ? Number(draft.weightValue)
    : 0;
  const weight = {
    value: weightValue,
    unit: String(draft?.weightUnit || "نسبة مئوية").trim() || "نسبة مئوية",
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
    unit: String(draft?.passGradeUnit || "نقاط").trim() || "نقاط",
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
    unit: String(draft?.gradeUnit || "نقاط").trim() || "نقاط",
  };
  const studyRecommendation = {
    timing: String(draft?.recommendationTiming || "لاحقاً").trim() || "لاحقاً",
    intensity:
      String(draft?.recommendationIntensity || "متوسطة").trim() || "متوسطة",
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

export const formatExamTimingDisplay = (entry = {}) => {
  const normalizedEntry = normalizeExamEntryForPlanner(entry);
  const normativeYear = normalizeProgramYearValue(
    normalizedEntry?.time?.Normative?.courseYearNum,
  );
  const normativeTerm = formatAcademicTermDisplay(
    normalizedEntry?.time?.Normative?.courseTerm,
  );
  const actualYear = normalizeProgramYearValue(
    normalizedEntry?.time?.actual?.courseYearNum,
  );
  const actualInterval = normalizeAcademicYearValue(
    normalizedEntry?.time?.actual?.courseYearInterval,
  );
  const actualTerm = formatAcademicTermDisplay(
    normalizedEntry?.time?.actual?.courseTerm,
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

export const formatExamVolumeDisplay = (entry = {}) => {
  const volume =
    entry?.volume && typeof entry.volume === "object" ? entry.volume : {};
  const value = Number.isFinite(Number(volume?.value))
    ? String(volume.value)
    : "";
  const unit = String(volume?.unit || "").trim();
  const scope = String(volume?.scope || "").trim();
  return [value, unit, scope].filter(Boolean).join(" | ") || "-";
};

export const formatExamWeightDisplay = (entry = {}) => {
  const weight =
    entry?.weight && typeof entry.weight === "object" ? entry.weight : {};
  const value = Number.isFinite(Number(weight?.value))
    ? String(weight.value)
    : String(entry?.course_grade || "").trim();
  const unit = String(weight?.unit || "").trim();
  return [value, unit].filter(Boolean).join(" | ") || "-";
};

export const formatExamGradeDisplay = (grade = {}) => {
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

export const formatExamRecommendationDisplay = (entry = {}) => {
  const recommendation =
    entry?.studyRecommendation && typeof entry.studyRecommendation === "object"
      ? entry.studyRecommendation
      : {};
  const timing = String(recommendation?.timing || "").trim();
  const intensity = String(recommendation?.intensity || "").trim();
  const suggestedHours = Number.isFinite(Number(recommendation?.suggestedHours))
    ? String(recommendation.suggestedHours)
    : "";
  const localizedTiming =
    { now: "الآن", soon: "قريباً", later: "لاحقاً", review: "مراجعة" }[
      timing
    ] || timing;
  const localizedIntensity =
    { low: "منخفضة", medium: "متوسطة", high: "مرتفعة" }[intensity] || intensity;
  return (
    [
      localizedTiming,
      localizedIntensity,
      suggestedHours ? `${suggestedHours} ساعة` : "",
    ]
      .filter(Boolean)
      .join(" | ") || "-"
  );
};

export const buildAcademicYearOptions = (startYear = 2000, endYear = 2030) => {
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

export const ACADEMIC_YEAR_OPTIONS = buildAcademicYearOptions(2000);
export const normalizeAcademicYearValue = (value) => {
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
export const formatAcademicTermDisplay = (value) => {
  const normalizedValue = String(value || "").trim();
  const arabicTerms = { First: "الأول", Second: "الثاني", Third: "الثالث" };

  return arabicTerms[normalizedValue] || normalizedValue;
};
export const formatAcademicYearAndTerm = (course) => {
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
  const displayedTerm = formatAcademicTermDisplay(term);
  const displayedProgramYear = programYear ? `السنة ${programYear}` : "";
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
export const TERM_OPTIONS = ["الأول", "الثاني", "الثالث"];

export const WEEKDAY_OPTIONS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const buildHalfHour12hOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute <= 30; minute += 30) {
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      options.push(`${hour12}:${String(minute).padStart(2, "0")} ${period}`);
    }
  }
  return options;
};

export const HOUR_OPTIONS = buildHalfHour12hOptions();

export const SAVED_COMPONENT_CLASS_OPTIONS = [
  "نظري",
  "عملي (مخبر)",
  "عملي (مشفى)",
  "عملي (صيدلية)",
];

export const PLANNER_COURSE_UI = {
  editor: {
    courseCardTitle: "بيانات المقرر",
    componentCardTitle: "بيانات المكوّن",
    newComponent: "مكوّن جديد",
    currentComponent: "المكوّن الحالي",
    scheduleGroupTitle: "جدول الدوام",
    locationGroupTitle: "الموقع",
    pendingStatus: "يحدّد لاحقاً",
  },
  fields: {
    course_name: "اسم المقرر",
    course_code: "رمز المقرر",
    course_status: "حالة المقرر",
    course_totalWeight: "وزن المقرر",
    course_classSelection: "نوع المكوّن",
    component_status: "حالة المكوّن",
    normativeCourseYearInterval: "الفترة السنوية المفترضة",
    normativeCourseTerm: "الفصل المفترض",
    actualCourseYearInterval: "الفترة السنوية الفعلية",
    actualCourseTerm: "الفصل الفعلي",
    course_daySelection: "اليوم",
    course_timeSelection: "الساعة",
    course_locationBuilding: "المبنى",
    course_locationRoom: "القاعة",
    course_grade: "وزن المكوّن",
  },
  table: {
    courseGroup: "المقرر",
    componentsGroup: "مكوّنات المقرر",
    timing: "التوقيت",
    schedule: "جدول الدوام",
    location: "الموقع",
    normative: "المفترض",
    actual: "الفعلي",
    academicYear: "الفترة السنوية",
    term: "الفصل",
    empty: "لا توجد مقررات محفوظة",
  },
};

export const PLANNER_FORM_FIELD_REGISTRY = {
  savedCourse: [
    {
      key: "savedCourse.course_name",
      formKey: "savedCourse",
      fieldName: "course_name",
      label: PLANNER_COURSE_UI.fields.course_name,
      control: "input",
      inputType: "text",
    },
    {
      key: "savedCourse.course_code",
      formKey: "savedCourse",
      fieldName: "course_code",
      label: PLANNER_COURSE_UI.fields.course_code,
      control: "input",
      inputType: "text",
    },
    {
      key: "savedCourse.course_totalWeight",
      formKey: "savedCourse",
      fieldName: "course_totalWeight",
      label: PLANNER_COURSE_UI.fields.course_totalWeight,
      control: "input",
      inputType: "number",
    },
    {
      key: "savedCourse.course_classSelection",
      formKey: "savedCourse",
      fieldName: "course_classSelection",
      label: PLANNER_COURSE_UI.fields.course_classSelection,
      control: "select",
      optionsKey: "componentClassOptions",
    },
    {
      key: "savedCourse.actualCourseYearInterval",
      formKey: "savedCourse",
      fieldName: "actualCourseYearInterval",
      label: PLANNER_COURSE_UI.fields.actualCourseYearInterval,
      control: "select",
      optionsKey: "academicYearOptions",
    },
    {
      key: "savedCourse.course_daySelection",
      formKey: "savedCourse",
      fieldName: "course_daySelection",
      label: PLANNER_COURSE_UI.fields.course_daySelection,
      control: "select",
      optionsKey: "weekdayOptions",
    },
    {
      key: "savedCourse.course_timeSelection",
      formKey: "savedCourse",
      fieldName: "course_timeSelection",
      label: PLANNER_COURSE_UI.fields.course_timeSelection,
      control: "select",
      optionsKey: "hourOptions",
    },
    {
      key: "savedCourse.course_locationBuilding",
      formKey: "savedCourse",
      fieldName: "course_locationBuilding",
      label: PLANNER_COURSE_UI.fields.course_locationBuilding,
      control: "select",
      optionsKey: "locationBuildingOptions",
    },
    {
      key: "savedCourse.course_locationRoom",
      formKey: "savedCourse",
      fieldName: "course_locationRoom",
      label: PLANNER_COURSE_UI.fields.course_locationRoom,
      control: "select",
      optionsKey: "locationRoomOptions",
    },
    {
      key: "savedCourse.course_grade",
      formKey: "savedCourse",
      fieldName: "course_grade",
      label: PLANNER_COURSE_UI.fields.course_grade,
      control: "input",
      inputType: "number",
    },
  ],
  exam: [
    {
      key: "exam.type",
      formKey: "exam",
      fieldName: "type",
      label:
        "\u0646\u0648\u0639 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646",
      control: "input",
      inputType: "text",
    },
    {
      key: "exam.normativeCourseYearNum",
      formKey: "exam",
      fieldName: "normativeCourseYearNum",
      label:
        "\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0641\u062a\u0631\u0636\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.normativeCourseTerm",
      formKey: "exam",
      fieldName: "normativeCourseTerm",
      label:
        "\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0645\u0641\u062a\u0631\u0636",
      control: "select",
      optionsKey: "termOptions",
    },
    {
      key: "exam.actualCourseYearNum",
      formKey: "exam",
      fieldName: "actualCourseYearNum",
      label:
        "\u0631\u0642\u0645 \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0641\u0639\u0644\u064a\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.actualCourseYearInterval",
      formKey: "exam",
      fieldName: "actualCourseYearInterval",
      label:
        "\u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0633\u0646\u0648\u064a\u0629 \u0627\u0644\u0641\u0639\u0644\u064a\u0629",
      control: "select",
      optionsKey: "academicYearOptions",
    },
    {
      key: "exam.actualCourseTerm",
      formKey: "exam",
      fieldName: "actualCourseTerm",
      label:
        "\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u0641\u0639\u0644\u064a",
      control: "select",
      optionsKey: "termOptions",
    },
    {
      key: "exam.locationBuilding",
      formKey: "exam",
      fieldName: "locationBuilding",
      label: "\u0627\u0644\u0645\u0628\u0646\u0649",
      control: "select",
      optionsKey: "locationBuildingOptions",
    },
    {
      key: "exam.locationRoom",
      formKey: "exam",
      fieldName: "locationRoom",
      label: "\u0627\u0644\u0642\u0627\u0639\u0629",
      control: "select",
      optionsKey: "locationRoomOptions",
    },
    {
      key: "exam.volumeValue",
      formKey: "exam",
      fieldName: "volumeValue",
      label: "\u0642\u064a\u0645\u0629 \u0627\u0644\u062d\u062c\u0645",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.volumeUnit",
      formKey: "exam",
      fieldName: "volumeUnit",
      label: "\u0648\u062d\u062f\u0629 \u0627\u0644\u062d\u062c\u0645",
      control: "select",
      options: EXAM_VOLUME_UNIT_OPTIONS,
    },
    {
      key: "exam.volumeScope",
      formKey: "exam",
      fieldName: "volumeScope",
      label: "\u0646\u0637\u0627\u0642 \u0627\u0644\u062d\u062c\u0645",
      control: "input",
      inputType: "text",
    },
    {
      key: "exam.volumeNote",
      formKey: "exam",
      fieldName: "volumeNote",
      label:
        "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u062d\u062c\u0645",
      control: "input",
      inputType: "text",
    },
    {
      key: "exam.weightValue",
      formKey: "exam",
      fieldName: "weightValue",
      label: "\u0642\u064a\u0645\u0629 \u0627\u0644\u0648\u0632\u0646",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.weightUnit",
      formKey: "exam",
      fieldName: "weightUnit",
      label: "\u0648\u062d\u062f\u0629 \u0627\u0644\u0648\u0632\u0646",
      control: "select",
      options: EXAM_WEIGHT_UNIT_OPTIONS,
    },
    {
      key: "exam.passGradeValue",
      formKey: "exam",
      fieldName: "passGradeValue",
      label: "\u0642\u064a\u0645\u0629 \u0627\u0644\u0646\u062c\u0627\u062d",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.passGradeMin",
      formKey: "exam",
      fieldName: "passGradeMin",
      label:
        "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0646\u062c\u0627\u062d",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.passGradeMax",
      formKey: "exam",
      fieldName: "passGradeMax",
      label:
        "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0639\u0644\u0649 \u0644\u0644\u0646\u062c\u0627\u062d",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.passGradeUnit",
      formKey: "exam",
      fieldName: "passGradeUnit",
      label: "\u0648\u062d\u062f\u0629 \u0627\u0644\u0646\u062c\u0627\u062d",
      control: "select",
      options: EXAM_GRADE_UNIT_OPTIONS,
    },
    {
      key: "exam.gradeValue",
      formKey: "exam",
      fieldName: "gradeValue",
      label:
        "\u0642\u064a\u0645\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.gradeMin",
      formKey: "exam",
      fieldName: "gradeMin",
      label:
        "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0639\u0644\u0627\u0645\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.gradeMax",
      formKey: "exam",
      fieldName: "gradeMax",
      label:
        "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0639\u0644\u0649 \u0644\u0644\u0639\u0644\u0627\u0645\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.gradeUnit",
      formKey: "exam",
      fieldName: "gradeUnit",
      label:
        "\u0648\u062d\u062f\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629",
      control: "select",
      options: EXAM_GRADE_UNIT_OPTIONS,
    },
    {
      key: "exam.recommendationTiming",
      formKey: "exam",
      fieldName: "recommendationTiming",
      label:
        "\u062a\u0648\u0642\u064a\u062a \u0627\u0644\u062a\u0648\u0635\u064a\u0629",
      control: "select",
      options: EXAM_RECOMMENDATION_TIMING_OPTIONS,
    },
    {
      key: "exam.recommendationIntensity",
      formKey: "exam",
      fieldName: "recommendationIntensity",
      label: "\u0634\u062f\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0629",
      control: "select",
      options: EXAM_RECOMMENDATION_INTENSITY_OPTIONS,
    },
    {
      key: "exam.recommendationSuggestedHours",
      formKey: "exam",
      fieldName: "recommendationSuggestedHours",
      label:
        "\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d\u0629",
      control: "input",
      inputType: "number",
    },
    {
      key: "exam.recommendationReason",
      formKey: "exam",
      fieldName: "recommendationReason",
      label: "\u0633\u0628\u0628 \u0627\u0644\u062a\u0648\u0635\u064a\u0629",
      control: "input",
      inputType: "text",
    },
    {
      key: "exam.recommendationNote",
      formKey: "exam",
      fieldName: "recommendationNote",
      label:
        "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0629",
      control: "input",
      inputType: "text",
    },
  ],
  inlineLecture: [
    {
      key: "inlineLecture.lecture_course",
      formKey: "inlineLecture",
      fieldName: "lecture_course",
      label: NOGAPLANNER_TEXT.lectures.courseName,
      control: "select",
      options: [],
    },
    {
      key: "inlineLecture.lecture_component",
      formKey: "inlineLecture",
      fieldName: "lecture_component",
      label: NOGAPLANNER_TEXT.lectures.componentType,
      control: "select",
      optionsKey: "componentClassOptions",
    },
    {
      key: "inlineLecture.lecture_name",
      formKey: "inlineLecture",
      fieldName: "lecture_name",
      label:
        "\u0627\u0633\u0645 \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0629",
      control: "input",
      inputType: "text",
    },
    {
      key: "inlineLecture.lecture_instructors",
      formKey: "inlineLecture",
      fieldName: "lecture_instructors",
      label: "\u0627\u0644\u0645\u062f\u0631\u0651\u0633\u0648\u0646",
      control: "input",
      inputType: "text",
    },
    {
      key: "inlineLecture.lecture_writers",
      formKey: "inlineLecture",
      fieldName: "lecture_writers",
      label: "\u0627\u0644\u0643\u062a\u0651\u0627\u0628",
      control: "input",
      inputType: "text",
    },
    {
      key: "inlineLecture.lecture_date",
      formKey: "inlineLecture",
      fieldName: "lecture_date",
      label:
        "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0629",
      control: "input",
      inputType: "date",
    },
  ],
};

export const getPlannerDefaultFieldsForForm = (formKey) => {
  const safeFormKey = String(formKey || "").trim();
  return Array.isArray(PLANNER_FORM_FIELD_REGISTRY?.[safeFormKey])
    ? PLANNER_FORM_FIELD_REGISTRY[safeFormKey].map((fieldConfig) => ({
        ...fieldConfig,
      }))
    : [];
};

export const PLANNER_DEFAULT_FIELD_REGISTRY = Object.values(
  PLANNER_FORM_FIELD_REGISTRY,
).flatMap((entries) =>
  Array.isArray(entries)
    ? entries.map((fieldConfig) => ({ ...fieldConfig }))
    : [],
);

export const NOGAPLANNER_TAB_SELECT_FIELDS = {
  courses: getPlannerDefaultFieldsForForm("savedCourse").filter(
    (fieldConfig) => String(fieldConfig?.control || "").trim() === "select",
  ),
  lectures: getPlannerDefaultFieldsForForm("inlineLecture").filter(
    (fieldConfig) => String(fieldConfig?.control || "").trim() === "select",
  ),
  exams: getPlannerDefaultFieldsForForm("exam").filter(
    (fieldConfig) => String(fieldConfig?.control || "").trim() === "select",
  ),
  settings: [],
};

export const PLANNER_SELECT_SETTINGS_STORAGE_KEY =
  "nogaPlanner.selectSettings.v1";

export const buildDefaultPlannerWeekdayOptions = () => [...WEEKDAY_OPTIONS];

export const buildDefaultPlannerSelectSettings = () => ({
  componentClassOptions: [...SAVED_COMPONENT_CLASS_OPTIONS],
  weekdayOptions: buildDefaultPlannerWeekdayOptions(),
  hourOptions: [...HOUR_OPTIONS],
  termOptions: [...TERM_OPTIONS],
  academicYearOptions: [...ACADEMIC_YEAR_OPTIONS],
  locationBuildingOptions: [],
  locationRoomOptions: [],
  locationRoomOptionsByBuilding: [],
  logoMotionEnabled: true,
  voiceControlEnabled: false,
  voiceDictationEnabled: false,
  logoFixedClock: "9",
  messageFriend: {
    from: {
      friendID: "",
      message: "",
    },
    to: [],
  },
  fieldDefaults: {},
  relationships: [],
  predictionTool: [],
  voiceCommands: [],
  voiceDictationNormalizations: [],
});
export const getDefaultPlannerRelationshipDraft = () => ({
  relationScope: "innerComponent",
  causeField: "",
  causeValue: "",
  effectField: "",
  effectValue: "",
  readOnly: false,
});

export const createPlannerSettingsRelationshipId = () =>
  `planner-rel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const normalizePlannerSettingsStringList = (
  entries = [],
  fallback = [],
) => {
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

const normalizePlannerRoomOptionsByBuilding = (entries = []) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const building = String(entry?.building || "").trim();
      const rooms = normalizePlannerSettingsStringList(entry?.rooms, []);
      return { building, rooms };
    })
    .filter((entry) => Boolean(entry.building))
    .reduce((accumulator, entry) => {
      const existingIndex = accumulator.findIndex(
        (item) => item.building === entry.building,
      );
      if (existingIndex === -1) {
        accumulator.push({
          building: entry.building,
          rooms: [...entry.rooms],
        });
        return accumulator;
      }
      accumulator[existingIndex].rooms = normalizePlannerSettingsStringList(
        [...accumulator[existingIndex].rooms, ...entry.rooms],
        [],
      );
      return accumulator;
    }, []);

export const normalizePlannerRelationshipEntry = (entry = {}) => ({
  id: String(entry?.id || "").trim() || createPlannerSettingsRelationshipId(),
  mode:
    String(entry?.mode || "").trim() === "intercomponent"
      ? "intercomponent"
      : "innerComponent",
  relationScope:
    String(entry?.relationScope || "").trim() === "intercomponent" ||
    String(entry?.mode || "").trim() === "intercomponent" ||
    String(entry?.layerLevel || entry?.layer || "").trim() === "inter-component"
      ? "intercomponent"
      : "innerComponent",
  causeField: String(
    entry?.causeField ||
      entry?.conditionFieldKey ||
      entry?.conditions?.[0]?.fieldKey ||
      "",
  ).trim(),
  causeValue: String(
    entry?.causeValue ||
      entry?.conditionValue ||
      entry?.conditions?.[0]?.value ||
      "",
  ).trim(),
  effectField: String(entry?.effectField || entry?.resultFieldKey || "").trim(),
  effectValue: String(entry?.effectValue || entry?.resultValue || "").trim(),
  active:
    typeof entry?.active === "boolean"
      ? entry.active
      : Boolean(entry?.readOnly),
  readOnly:
    typeof entry?.readOnly === "boolean"
      ? entry.readOnly
      : Boolean(entry?.active),
});

export const normalizePlannerSelectSettings = (value) => {
  const fallbackSettings = buildDefaultPlannerSelectSettings();
  const nextValue = value && typeof value === "object" ? value : {};

  const locationRoomOptionsByBuilding = normalizePlannerRoomOptionsByBuilding(
    nextValue.locationRoomOptionsByBuilding,
  );
  const normalizedLogoFixedClock = String(nextValue?.logoFixedClock || "9")
    .trim()
    .replace(/[^\d]/g, "");
  const logoFixedClock = /^[1-9]$|^1[0-2]$/.test(normalizedLogoFixedClock)
    ? normalizedLogoFixedClock
    : "9";
  const rawMessageFriend =
    nextValue?.messageFriend && typeof nextValue.messageFriend === "object"
      ? nextValue.messageFriend
      : {};
  const normalizedMessageFrom = {
    friendID: String(rawMessageFriend?.from?.friendID || "").trim(),
    message: String(rawMessageFriend?.from?.message || "").trim(),
  };
  const normalizedMessageTo = (
    Array.isArray(rawMessageFriend?.to)
      ? rawMessageFriend.to
      : rawMessageFriend?.to && typeof rawMessageFriend.to === "object"
        ? [rawMessageFriend.to]
        : []
  )
    .map((entry) => ({
      friendID: String(entry?.friendID || "").trim(),
      message: String(entry?.message || "").trim(),
    }))
    .filter((entry) => entry.friendID && entry.message);
  const normalizedPredictionTool = (Array.isArray(nextValue?.predictionTool)
    ? nextValue.predictionTool
    : []
  )
    .map((entry) => ({
      tab: String(entry?.tab || "").trim(),
      inputFieldID: String(entry?.inputFieldID || "").trim(),
      list: normalizePlannerSettingsStringList(entry?.list, []),
    }))
    .filter((entry) => Boolean(entry.inputFieldID));
  const normalizedVoiceCommands = (Array.isArray(nextValue?.voiceCommands)
    ? nextValue.voiceCommands
    : Array.isArray(nextValue?.voiceCommandEntries)
      ? nextValue.voiceCommandEntries
      : []
  )
    .map((entry) => ({
      idTree: Array.isArray(entry?.idTree)
        ? entry.idTree
            .map((treeEntry) => String(treeEntry || "").trim())
            .filter(Boolean)
        : [],
      elementID: String(entry?.elementID || entry?.button || "").trim(),
      voiceCommand: String(entry?.voiceCommand || entry?.command || "").trim(),
    }))
    .filter((entry) => entry.elementID && entry.voiceCommand)
    .reduce((accumulator, entry) => {
      const exists = accumulator.some(
        (item) =>
          item.elementID === entry.elementID &&
          item.voiceCommand === entry.voiceCommand,
      );
      if (!exists) {
        accumulator.push(entry);
      }
      return accumulator;
    }, []);
  const normalizedVoiceDictationNormalizations = (
    Array.isArray(nextValue?.voiceDictationNormalizations)
      ? nextValue.voiceDictationNormalizations
      : []
  )
    .map((entry) => {
      const conditionRaw = String(entry?.condition || "").trim().toLowerCase();
      const condition =
        conditionRaw === "startofword"
          ? "startOfWord"
          : conditionRaw === "anywhere"
            ? "anywhere"
            : "endOfWord";
      return {
        letter: String(entry?.letter || "").trim(),
        normalizedLetter: String(entry?.normalizedLetter || "").trim(),
        condition,
      };
    })
    .filter((entry) => entry.letter && entry.normalizedLetter)
    .reduce((accumulator, entry) => {
      const exists = accumulator.some(
        (item) =>
          item.letter === entry.letter &&
          item.normalizedLetter === entry.normalizedLetter &&
          item.condition === entry.condition,
      );
      if (!exists) {
        accumulator.push(entry);
      }
      return accumulator;
    }, []);
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
    locationBuildingOptions: normalizePlannerSettingsStringList(
      nextValue.locationBuildingOptions,
      fallbackSettings.locationBuildingOptions,
    ),
    locationRoomOptions: [],
    locationRoomOptionsByBuilding,
    logoMotionEnabled:
      typeof nextValue?.logoMotionEnabled === "boolean"
        ? nextValue.logoMotionEnabled
        : true,
    voiceControlEnabled:
      typeof nextValue?.voiceControlEnabled === "boolean"
        ? nextValue.voiceControlEnabled
        : false,
    voiceDictationEnabled:
      typeof nextValue?.voiceDictationEnabled === "boolean"
        ? nextValue.voiceDictationEnabled
        : false,
    logoFixedClock,
    messageFriend: {
      from: normalizedMessageFrom,
      to: normalizedMessageTo,
    },
    fieldDefaults: {
      ...(Array.isArray(nextValue?.fieldDefaults)
        ? Object.fromEntries(
            nextValue.fieldDefaults
              .map((entry) => [
                String(entry?.fieldKey || "").trim(),
                String(entry?.value || "").trim(),
              ])
              .filter(([fieldKey]) => Boolean(fieldKey)),
          )
        : nextValue?.fieldDefaults && typeof nextValue.fieldDefaults === "object"
          ? Object.fromEntries(
              Object.entries(nextValue.fieldDefaults)
                .map(([fieldKey, fieldValue]) => [
                  String(fieldKey || "").trim(),
                  String(fieldValue || "").trim(),
                ])
                .filter(([fieldKey]) => Boolean(fieldKey)),
            )
          : {}),
    },
    predictionTool: normalizedPredictionTool,
    voiceCommands: normalizedVoiceCommands,
    voiceDictationNormalizations: normalizedVoiceDictationNormalizations,
    relationships: Array.isArray(nextValue?.relationships)
      ? nextValue.relationships
          .map((entry) => normalizePlannerRelationshipEntry(entry))
          .filter(
            (entry) =>
              entry.relationScope === "intercomponent" ||
              (Boolean(entry.causeField) && Boolean(entry.effectField)),
          )
      : [],
  };
};

export const readPlannerSelectSettingsFromStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return buildDefaultPlannerSelectSettings();
  }

  try {
    const storedValue = window.localStorage.getItem(
      PLANNER_SELECT_SETTINGS_STORAGE_KEY,
    );

    if (!storedValue) {
      return buildDefaultPlannerSelectSettings();
    }

    return normalizePlannerSelectSettings(JSON.parse(storedValue));
  } catch (error) {
    console.error("[planner-select-settings] read failed:", error);
    return buildDefaultPlannerSelectSettings();
  }
};

export const getDefaultInlineComponentDraft = () => ({
  course_class: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_grade: "",
  course_locationBuilding: "",
  course_locationRoom: "",
});

export const getEditableCourseDraft = (course = {}) => {
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

export const buildCoursePayloadFromDraft = (
  draft = {},
  existingCourse = {},
) => {
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

export const formatSavedCourseTitle = (course = {}) => {
  const courseName = String(course?.course_name || "").trim() || "-";
  const courseCode = String(course?.course_code || "").trim();

  return courseCode ? `${courseName} (${courseCode})` : courseName;
};

export const formatSavedCourseComponent = (course = {}) => {
  const componentValue =
    String(course?.course_component || "").trim() ||
    String(course?.course_class || "").trim() ||
    "-";

  return formatCourseComponentLabel(componentValue);
};

export const buildSavedCourseGroupKey = (course = {}) =>
  String(course?.parentCourseId || "").trim() ||
  `${String(course?.course_name || "").trim()}::${String(course?.course_code || "").trim()}`;

export const buildCourseComponentPickerLabel = (course = {}) => {
  const courseTitle = formatSavedCourseTitle(course);
  const componentTitle = formatSavedCourseComponent(course);

  return componentTitle && componentTitle !== "-"
    ? `${courseTitle} - ${componentTitle}`
    : courseTitle;
};

export const buildCourseLectureMatchLabel = (course = {}) => {
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

export const getCourseDueText = (course) => {
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

  return `• أيام ${diffDaysWithoutDecimals} • ساعات ${diffHoursWithoutDecimals} • دقائق ${diffMinsWithoutDecimals} • الوقت ${examTime_hour}:${examTime_mins} • نمط نظري`;
};
export const COURSE_PRINT_SOUND_START_OFFSET = 0.109;
export const COURSE_PRINT_SOUND_BASE_DURATION = 26.204;
export const NAGHAM_COURSE_LETTERS_STORAGE_KEY =
  "nogaPlanner_nagham_course_letters";
export const NAGHAM_COURSE_LIST_STORAGE_KEY = "nogaPlanner_nagham_course_list";
export const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY =
  "nogaPlanner_reducedMotion";
export const DEFAULT_NAGHAM_COURSE_LETTER =
  "هذه هي المحاضرة: اجعلها دراسة سهلة ثم اجعل بعدها سهرة ثم اجعل بعدها راحة.";
export const TELEGRAM_DISPLAY_TIMEZONE = "Asia/Damascus";

export const TELEGRAM_LECTURE_STOP_WORDS = new Set([
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

export const normalizeTelegramSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeLectureCorrections = (entries = []) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      page: Math.max(1, Number(entry?.page) || 0),
      text: String(entry?.text || "").trim(),
    }))
    .filter((entry) => entry.page > 0 && entry.text);
