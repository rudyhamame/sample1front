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

  return `About ${diffDaysWithoutDecimals} days, ${diffHoursWithoutDecimals} hours, and ${diffMinsWithoutDecimals} minutes before ${examTime_hour}:${examTime_mins} from now`;
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

export const NOGAPLANNER_TEXT = {
  // Shared labels and actions reused across planner panels.
  common: {
    appEyebrow: "Noga Plan",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    none: "None",
  },
  // Top-level planner tab labels used by the shared wrapper navigation.
  wrapperTabs: {
    plan: "Plan",
    courses: "Courses",
    lectures: "Lectures",
    exams: "Exams",
  },
  // User-facing status and failure messages surfaced by planner workflows.
  messages: {
    submitCourseNameRequired: "Submission failed. Please add a course name.",
    genericRetry: "Something went wrong. Please try again.",
    componentTypeRequired: "Enter the component type first.",
    courseSaveError: "Failed to save the course. Please try again.",
    courseAddedSuffix: "added",
    selectItemForDetails: "Select a course or lecture from the list to view details.",
    settingsSaveFailed: "Failed to save settings to the database.",
    settingsServerUnreachable: "Could not reach the server while saving settings.",
    settingsSaved: "Settings saved successfully.",
    noLectures: "No lectures",
  },
  // Labels and placeholders used by the inline lecture form and lecture lists.
  lectures: {
    formTitle: "Add Lecture",
    courseReferenceTitle: "Course Reference",
    lectureInfoTitle: "Lecture Information",
    courseName: "Course Name",
    componentType: "Component Type",
    lectureTitle: "Lecture Title",
    instructors: "Instructors",
    writers: "Writers",
    publishDate: "Publish Date",
    content: "Content",
    uploadContent: "Upload Content",
    uploadedList: "Uploaded Files",
    noUploadedFiles: "No uploaded files",
    chooseCourse: "Choose course",
    chooseComponent: "Choose component",
    chooseInstructor: "Choose instructor",
    chooseWriter: "Choose writer",
  },
  // Labels and placeholders used by planner settings sections.
  settings: {
    back: "Back",
    backEn: "back",
    title: "List Settings",
    lists: "Lists",
    defaults: "Defaults",
    relationships: "Component Relationships",
    noListsForTab: "No lists for this tab",
    listFieldLabel: "Field",
    listModeLabel: "Mode",
    dependentSelectLabel: "Independent Field",
    dependentOptionLabel: "Independent Option",
    listValueLabel: "Value",
    chooseListField: "Choose field",
    chooseMode: "Choose mode",
    modeIndependent: "Independent",
    modeDependent: "Dependent",
    chooseIndependentSelect: "Choose independent field",
    chooseIndependentOption: "Choose independent option",
    chooseBuilding: "Choose building",
    chooseBuildingFirst: "Choose building first",
    noSavedItems: "No saved items",
    update: "Update",
    add: "Add",
    deleteSelected: "Delete selected",
    deleteAll: "Delete all",
    edit: "Edit",
    logoMotionListener: "Pointer motion listener",
    voiceControlListener: "Voice control",
    fixedLogoClock: "Lock logo direction",
    messageFromFriend: "Message from a friend",
    messageFromFriendChoose: "Choose a friend",
    messageFromFriendInput: "Write an encouraging message",
    messageFromFriendSave: "Save messages",
    messageFromFriendFrom: "From friend (listen)",
    messageFromFriendTo: "Send to friend",
    messageFromFriendToList: "Delivery list",
    messageFromFriendAddToList: "Add",
    messageFromFriendDeleteSelected: "Delete selected",
    messageFromFriendNoEntries: "No entries",
    motionOn: "On",
    motionOff: "Off",
    selectClock: "Choose clock",
    optionGroups: {
      componentClassOptions: {
        label: "Component Types",
        placeholder: "Enter a component type",
      },
      weekdayOptions: { label: "Days", placeholder: "Enter a day" },
      hourOptions: { label: "Hours", placeholder: "Example 08:00" },
      termOptions: { label: "Terms", placeholder: "Enter a term" },
      academicYearOptions: {
        label: "Academic Years",
        placeholder: "Enter an academic year",
      },
      locationBuildingOptions: { label: "Building", placeholder: "Enter building" },
      locationRoomOptions: { label: "Room", placeholder: "Enter room" },
      lectureInstructorOptions: {
        label: "Instructors",
        placeholder: "Enter instructor",
      },
      lectureWriterOptions: {
        label: "Writers",
        placeholder: "Enter writer",
      },
    },
  },
  savedCourses: {
    plannerSettings: "Settings",
    restoreDefaultTitle: "Restore default value",
    save: "Save",
    close: "Close",
    addLecture: "Add Lecture",
    addLectureToPlan: "Add to Plan",
    deleteLecture: "Delete Lecture",
    clearSelection: "Clear Selection",
    add: "Add",
    edit: "Edit",
    openLectures: "Open Lectures",
    select: "Select",
    finishSelection: "Finish Selection",
    closeDetails: "Close Details",
    showPanelTitle: "Show Panel Title",
    hidePanelTitle: "Hide Panel Title",
    planTitle: "Plan",
    lecturesTitle: "Lectures",
    coursesTitle: "Courses",
    planSubtitle: "Distribute daily study hours across components and lectures until exam dates.",
    lecturesSubtitle: "Manage lectures directly or link them to the selected course.",
    coursesSubtitle: "Manage your courses, components, and study schedule here.",
    openCourseManager: "Open Course Manager",
    backToPlan: "Back to Plan",
    editor: {
      courseCardTitle: "Course Data",
      componentCardTitle: "Component Data",
      newComponent: "New Component",
      currentComponent: "Current Component",
      scheduleGroupTitle: "Schedule",
      locationGroupTitle: "Location",
      pendingStatus: "Set later",
    },
    fields: {},
    table: {
      courseGroup: "Course",
      componentsGroup: "Course Components",
      timing: "Timing",
      schedule: "Schedule",
      location: "Location",
      normative: "Normative",
      actual: "Actual",
      academicYear: "Academic Year",
      term: "Term",
      empty: "No saved courses",
    },
  },
  studyPlan: {
    title: "Plan",
    subtitle: "Plan daily hours for components and lectures until upcoming exams.",
    preExamPeriodOfStudy: "Pre-exam study period",
    examPeriodOfStudy: "Exam study period",
    nextStudyPeriod: "Next study period",
    previousStudyPeriod: "Previous study period",
    defaultsTitle: "Global defaults",
    rowsTitle: "Daily plan",
    addPlanInfoTitle: "Add plan information",
    noCourses: "No organized courses yet.",
    noRows: "No items can be planned right now.",
    globalDefaults: "Defaults",
    componentPlan: "Component plan",
    openCourseManager: "Open Course Manager",
    closeCourseManager: "Close Course Manager",
    selectCourse: "Choose course",
    selectComponent: "Choose component",
    selectLecture: "Choose lecture",
    savePlan: "Save Plan",
    noLectureOverrides: "No linked lectures for this component.",
    deadlineMissing: "No deadline",
    todayHoursHint: "Daily suggestion",
    remainingHours: "Remaining hours",
    remainingDays: "Remaining days",
    resolvedDeadline: "Deadline",
    sourceExam: "Component exam date",
    sourceTerm: "Term exam window",
    tableCourse: "Course",
    tableComponent: "Component",
    tableLecture: "Lecture",
    tableDeadline: "Deadline",
    tableRemainingDays: "Days",
    tableRemainingHours: "Hours",
    tableSuggestedDailyHours: "Today hours",
    tablePriority: "Priority",
    tableDifficulty: "Difficulty",
    tableMastery: "Mastery",
    tableSource: "Source",
  },
  // Labels used by exam rows and exam editor fields.
  examBoard: {
    title: "Exam Board",
    subtitle: "Manage saved exams for the same courses.",
    tabCourses: "Courses",
    tabLectures: "Lectures",
    tabExams: "Exams",
    countExams: "Exams",
    countCourses: "Courses",
    tableCourse: "Course",
    tableCourseName: "Course Name",
    tableComponentType: "Component Type",
    tableType: "Type",
    tableTime: "Timing",
    tableDate: "Date",
    tableStartTime: "Start Time",
    tableEndTime: "End Time",
    tableLocation: "Location",
    tableBuilding: "Building",
    tableRoom: "Room",
    tableVolume: "Volume",
    tableWeight: "Weight",
    tablePass: "Pass",
    tableGrade: "Grade",
    tableRecommendation: "Recommendation",
    empty: "No exams",
    saveExam: "Save Exam",
    addExam: "Add Exam",
    linkedCourseLabel: "Exam Data",
    linkedCoursePlaceholder: "Linked course",
    examTypePlaceholder: "Exam type",
    timingLabel: "Timing",
    dateLabel: "Date",
    timeLabel: "Time",
    datePlaceholder: "Exam date",
    timePlaceholder: "Exam time",
    locationLabel: "Location",
    buildingPlaceholder: "Building",
    roomPlaceholder: "Room",
    linkedLecturesLabel: "Linked Lectures",
    noLinkedLectures: "No lectures available for this course",
    volumeLabel: "Volume",
    valuePlaceholder: "Value",
    scopePlaceholder: "Scope",
    notePlaceholder: "Note",
    weightLabel: "Weight",
    passGradeLabel: "Pass Grade",
    minPlaceholder: "Minimum",
    maxPlaceholder: "Maximum",
    gradeLabel: "Grade",
    recommendationLabel: "Recommendation",
    suggestedHoursPlaceholder: "Suggested hours",
    reasonPlaceholder: "Reason",
  },
  // The only text-owned option/value source for planner selects and defaults.
  selectsOptions: {
    common: {
      componentClassOptions: [
        "Class",
        "Lab",
        "Clinical Rotations",
        "Pharmacy",
      ],
      weekdayOptions: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      hourOptions: Array.from({ length: 48 }, (_, index) => {
        const totalMinutes = index * 30;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const period = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
      }),
      termOptions: ["First", "Second", "Third"],
      academicYearOptions: Array.from(
        { length: 31 },
        (_, index) => `${2030 - index} - ${2031 - index}`,
      ),
      locationBuildingOptions: [],
      locationRoomOptions: [],
      lectureInstructorOptions: [],
      lectureWriterOptions: [],
      planDifficultyOptions: ["Low", "Medium", "High"],
      planMasteryOptions: ["Weak", "Average", "Good"],
      planPriorityOptions: ["Low", "Medium", "High"],
      volumeUnitOptions: ["Pages", "Questions", "Hours", "Chapters"],
      weightUnitOptions: ["Percentage", "Points"],
      gradeUnitOptions: ["Points", "Percentage"],
    },
    defaults: {
      inputValue: "",
    },
    inlineLecture: {
      lecture_course: [],
    },
  },
  // The only text-owned label source for registry-backed planner fields.
  registryLabels: {
    savedCourse: {},
    exam: {},
    inlineLecture: {},
    shared: {},
  },
};

export const NOGAPLANNER_WRAPPER_TABS = [
  { key: "plan", label: NOGAPLANNER_TEXT.wrapperTabs.plan },
  { key: "courses", label: NOGAPLANNER_TEXT.wrapperTabs.courses },
  { key: "lectures", label: NOGAPLANNER_TEXT.wrapperTabs.lectures },
  { key: "exams", label: NOGAPLANNER_TEXT.wrapperTabs.exams },
];

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
  const rawValue = String(value || "").trim();
  const normalizedValue = rawValue.toLowerCase();

  if (!normalizedValue || normalizedValue === "-") {
    return "-";
  }

  const aliases = {
    pending: "pending",
    new: "new",
    failed: "failed",
    passed: "passed",
    incomplete: "incomplete",
    ongoing: "ongoing",
  };
  const normalizedStatus = aliases[normalizedValue] || normalizedValue;

  const labels = {
    pending: "Set later",
    new: "New",
    failed: "Failed",
    incomplete: "Incomplete",
    passed: "Passed",
    ongoing: "Ongoing",
  };

  return labels[normalizedStatus] || "Set later";
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
  // Map normalized component types to display labels.
  const componentLabels = {
    lecture: "Class",
    theoretical: "Class",
    class: "Class",
    lab: "Lab",
    "practical (lab)": "Lab",
    "clinical rotation": "Clinical Rotations",
    "clinical rotations": "Clinical Rotations",
    "practical (hospital)": "Clinical Rotations",
    "pharmacy training": "Pharmacy",
    "practical (pharmacy)": "Pharmacy",
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
  dailyHoursCap: "",
  locationBuilding: "",
  locationRoom: "",
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
  const dailyHoursCap = String(draft?.dailyHoursCap || "").trim();
  const courseLocationBuilding = String(
    draft?.locationBuilding || draft?.course_locationBuilding || "",
  ).trim();
  const courseLocationRoom = String(
    draft?.locationRoom || draft?.course_locationRoom || "",
  ).trim();

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
    dailyHoursCap ||
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
    dailyHoursCap,
    locationBuilding: courseLocationBuilding,
    locationRoom: courseLocationRoom,
  };
};

// Build the empty lecture draft used by inline lecture creation and reset flows.
export const getDefaultInlineLectureDraft = () => ({
  lecture_courseId: "",
  lecture_componentId: "",
  lecture_component: "",
  lecture_volume_total: "",
  lecture_volume_done: "",
  lecture_volume_remaining: "",
  lecture_pagesFinished: [],
  lecture_pageStudyTimes: {},
  lecture_name: "",
  lecture_instructors: "",
  lecture_writers: "",
  lecture_date: "",
  lecture_contentUploads: [],
  lectureDailyHoursCap: "",
  lectureTargetHours: "",
  lectureDifficulty: "",
  lectureMastery: "",
  lecturePriority: "",
  lectureNote: "",
});

// Build the empty exam draft used by add/edit exam flows.
export const getDefaultExamDraft = () => ({
  selectedCourseId: "",
  type: "",
  exam_date: "",
  exam_time: "",
  locationBuilding: "",
  locationRoom: "",
  linkedLectureIds: [],
  volumeValue: "",
  volumeUnit: "Pages",
  volumeScope: "",
  volumeNote: "",
  weightValue: "",
  weightUnit: "Percentage",
  passGradeValue: "",
  passGradeMin: "",
  passGradeMax: "",
  passGradeUnit: "Points",
  gradeValue: "",
  gradeMin: "",
  gradeMax: "",
  gradeUnit: "Points",
  recommendationTiming: "Later",
  recommendationIntensity: "Medium",
  recommendationSuggestedHours: "",
  recommendationReason: "",
  recommendationNote: "",
});

// Normalize raw stored exam rows into the shape expected by planner editing and display helpers.
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

// Convert a normalized exam entry into an editable exam draft.
export const buildExamDraftFromEntry = (entry = {}, selectedCourseId = "") => {
  const normalizedEntry = normalizeExamEntryForPlanner(entry, selectedCourseId);

  return {
    selectedCourseId:
      String(selectedCourseId || "").trim() ||
      String(normalizedEntry?.componentId || "").trim(),
    type: String(normalizedEntry?.type || "").trim(),
    exam_date: String(normalizedEntry?.exam_date || "").trim(),
    exam_time: String(
      normalizedEntry?.time?.start ||
        normalizedEntry?.startTime ||
        normalizedEntry?.exam_time ||
        "",
    ).trim(),
    locationBuilding: String(normalizedEntry?.location?.building || "").trim(),
    locationRoom: String(normalizedEntry?.location?.room || "").trim(),
    linkedLectureIds: Array.isArray(normalizedEntry?.lectures)
      ? normalizedEntry.lectures
      : [],
    volumeValue: String(normalizedEntry?.volume?.value ?? "").trim(),
    volumeUnit:
      String(normalizedEntry?.volume?.unit || "Pages").trim() || "Pages",
    volumeScope: String(normalizedEntry?.volume?.scope || "").trim(),
    volumeNote: String(normalizedEntry?.volume?.note || "").trim(),
    weightValue: String(
      normalizedEntry?.weight?.value ?? normalizedEntry?.course_grade ?? "",
    ).trim(),
    weightUnit:
      String(normalizedEntry?.weight?.unit || "Percentage").trim() ||
      "Percentage",
    passGradeValue: String(normalizedEntry?.passGrade?.value ?? "").trim(),
    passGradeMin: String(normalizedEntry?.passGrade?.min ?? "").trim(),
    passGradeMax: String(normalizedEntry?.passGrade?.max ?? "").trim(),
    passGradeUnit:
      String(normalizedEntry?.passGrade?.unit || "Points").trim() || "Points",
    gradeValue: String(normalizedEntry?.grade?.value ?? "").trim(),
    gradeMin: String(normalizedEntry?.grade?.min ?? "").trim(),
    gradeMax: String(
      normalizedEntry?.grade?.max ?? normalizedEntry?.course_fullGrade ?? "",
    ).trim(),
    gradeUnit: String(normalizedEntry?.grade?.unit || "Points").trim() || "Points",
    recommendationTiming:
      String(normalizedEntry?.studyRecommendation?.timing || "Later").trim() ||
      "Later",
    recommendationIntensity:
      String(
        normalizedEntry?.studyRecommendation?.intensity || "Medium",
      ).trim() || "Medium",
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

// Convert an editable exam draft back into the persisted exam payload shape.
export const buildExamEntryFromDraft = (draft = {}) => {
  const type = String(draft?.type || "").trim();
  const examDate = String(draft?.exam_date || "").trim();
  const examTime = String(draft?.exam_time || "").trim();
  const time = {
    start: examTime || null,
  };
  const location = {
    building: String(draft?.locationBuilding || "").trim(),
    room: String(draft?.locationRoom || "").trim(),
  };
  const volume = {
    value: Number.isFinite(Number(draft?.volumeValue))
      ? Number(draft.volumeValue)
      : 0,
    unit: String(draft?.volumeUnit || "Pages").trim() || "Pages",
    scope: String(draft?.volumeScope || "").trim(),
    note: String(draft?.volumeNote || "").trim(),
  };
  const weightValue = Number.isFinite(Number(draft?.weightValue))
    ? Number(draft.weightValue)
    : 0;
  const weight = {
    value: weightValue,
    unit: String(draft?.weightUnit || "Percentage").trim() || "Percentage",
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
    unit: String(draft?.passGradeUnit || "Points").trim() || "Points",
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
    unit: String(draft?.gradeUnit || "Points").trim() || "Points",
  };
  const studyRecommendation = {
    timing: String(draft?.recommendationTiming || "Later").trim() || "Later",
    intensity:
      String(draft?.recommendationIntensity || "Medium").trim() || "Medium",
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
    exam_date: examDate || "-",
    exam_time: examTime || "-",
    course_grade: Number.isFinite(weightValue) ? String(weightValue) : "",
    course_fullGrade:
      Number.isFinite(Number(grade.max)) && grade.max !== null
        ? String(grade.max)
        : "",
  };
};

// Format exam timing values for compact table rendering.
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

// Format exam volume values for compact table rendering.
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

// Format exam weight values for compact table rendering.
export const formatExamWeightDisplay = (entry = {}) => {
  const weight =
    entry?.weight && typeof entry.weight === "object" ? entry.weight : {};
  const value = Number.isFinite(Number(weight?.value))
    ? String(weight.value)
    : String(entry?.course_grade || "").trim();
  const unit = String(weight?.unit || "").trim();
  return [value, unit].filter(Boolean).join(" | ") || "-";
};

// Format exam grade values for compact table rendering.
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
// Normalize mixed academic-year formats coming from storage or the UI.
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

  return Array.isArray(
    NOGAPLANNER_TEXT?.selectsOptions?.common?.academicYearOptions,
  ) &&
    NOGAPLANNER_TEXT.selectsOptions.common.academicYearOptions.includes(
      normalizedValue,
    )
    ? normalizedValue
    : "";
};
// Normalize academic-term text for display.
export const formatAcademicTermDisplay = (value) => {
  const normalizedValue = String(value || "").trim();
  const arabicTerms = { First: "First", Second: "Second", Third: "Third" };

  return arabicTerms[normalizedValue] || normalizedValue;
};
// Build the combined academic-year display used by course cards and tables.
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
  const displayedProgramYear = programYear ? `Year ${programYear}` : "";
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

// Keep all planner field labels in `NOGAPLANNER_TEXT` so text has one owner.
NOGAPLANNER_TEXT.registryLabels = {
  savedCourse: {
    course_name: "Course Name",
    course_code: "Course Code",
    course_status: "Course Status",
    course_totalWeight: "Course Weight",
    course_classSelection: "Component Type",
    component_status: "Component Status",
    normativeCourseYearInterval: "Academic Year",
    normativeCourseTerm: "Term",
    actualCourseYearInterval: "Actual Academic Year",
    actualCourseTerm: "Actual Term",
    course_daySelection: "Day",
    course_timeSelection: "Time",
    locationBuilding: "Building",
    locationRoom: "Room",
    course_grade: "Component Weight",
  },
  exam: {
    type: "Exam Type",
    exam_date: "Exam Date",
    exam_time: "Exam Time",
    locationBuilding: "Building",
    locationRoom: "Room",
    volumeValue: "Volume Value",
    volumeUnit: "Volume Unit",
    volumeScope: "Volume Scope",
    volumeNote: "Volume Note",
    weightValue: "Weight Value",
    weightUnit: "Weight Unit",
    passGradeValue: "Pass Value",
    passGradeMin: "Minimum Pass",
    passGradeMax: "Maximum Pass",
    passGradeUnit: "Pass Unit",
    gradeValue: "Grade Value",
    gradeMin: "Minimum Grade",
    gradeMax: "Maximum Grade",
    gradeUnit: "Grade Unit",
  },
  inlineLecture: {
    lecture_course: NOGAPLANNER_TEXT.lectures.courseName,
    lecture_component: NOGAPLANNER_TEXT.lectures.componentType,
    lecture_name: "Lecture Name",
    lecture_instructors: "Instructors",
    lecture_writers: "Writers",
    lecture_date: "Lecture Date",
  },
  shared: {
    locationBuilding: "Building",
    locationRoom: "Room",
  },
  studyPlanAid: {
    defaultDailyHours: "Default Daily Hours",
    defaultDifficulty: "Default Difficulty",
    defaultMastery: "Default Mastery",
    defaultPriority: "Default Priority",
    targetHours: "Target Hours",
    difficulty: "Difficulty",
    mastery: "Mastery",
    priority: "Priority",
    dailyHoursCap: "Daily Cap",
    lectureDailyHoursCap: "Lecture Daily Cap",
    note: "Note",
    lectureTargetHours: "Lecture Hours",
    lectureDifficulty: "Lecture Difficulty",
    lectureMastery: "Lecture Mastery",
    lecturePriority: "Lecture Priority",
    lectureNote: "Lecture Note",
  },
};
NOGAPLANNER_TEXT.savedCourses.fields =
  NOGAPLANNER_TEXT.registryLabels.savedCourse;

// `PLANNER_FORM_FIELD_REGISTRY` is the single source of truth for planner form fields.
export const PLANNER_FORM_FIELD_REGISTRY = [
  {
    element: "input",
    id: "nogaPlanner_planInput_defaultDailyHours",
    form: ["studyPlanAid"],
    field: ["defaultDailyHours"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.defaultDailyHours,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_defaultDifficulty",
    form: ["studyPlanAid"],
    field: ["defaultDifficulty"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.defaultDifficulty,
    options: [],
    settingsKey: "planDifficultyOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_defaultMastery",
    form: ["studyPlanAid"],
    field: ["defaultMastery"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.defaultMastery,
    options: [],
    settingsKey: "planMasteryOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_defaultPriority",
    form: ["studyPlanAid"],
    field: ["defaultPriority"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.defaultPriority,
    options: [],
    settingsKey: "planPriorityOptions",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_planInput_targetHours",
    form: ["studyPlanAid"],
    field: ["targetHours"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.targetHours,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_difficulty",
    form: ["studyPlanAid"],
    field: ["difficulty"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.difficulty,
    options: [],
    settingsKey: "planDifficultyOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_mastery",
    form: ["studyPlanAid"],
    field: ["mastery"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.mastery,
    options: [],
    settingsKey: "planMasteryOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_priority",
    form: ["studyPlanAid"],
    field: ["priority"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.priority,
    options: [],
    settingsKey: "planPriorityOptions",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_planInput_dailyHoursCap",
    form: ["studyPlanAid"],
    field: ["dailyHoursCap"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.dailyHoursCap,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_planInput_note",
    form: ["studyPlanAid"],
    field: ["note"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.note,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_planInput_lectureTargetHours",
    form: ["studyPlanAid"],
    field: ["lectureTargetHours"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.lectureTargetHours,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_lectureDifficulty",
    form: ["studyPlanAid"],
    field: ["lectureDifficulty"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.lectureDifficulty,
    options: [],
    settingsKey: "planDifficultyOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_lectureMastery",
    form: ["studyPlanAid"],
    field: ["lectureMastery"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.lectureMastery,
    options: [],
    settingsKey: "planMasteryOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_planSelect_lecturePriority",
    form: ["studyPlanAid"],
    field: ["lecturePriority"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.lecturePriority,
    options: [],
    settingsKey: "planPriorityOptions",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_planInput_lectureNote",
    form: ["studyPlanAid"],
    field: ["lectureNote"],
    label: NOGAPLANNER_TEXT.registryLabels.studyPlanAid.lectureNote,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_coursesInput_name",
    form: ["savedCourse"],
    field: ["course_name"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_name,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_coursesInput_code",
    form: ["savedCourse"],
    field: ["course_code"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_code,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_coursesInput_totalWeight",
    form: ["savedCourse"],
    field: ["course_totalWeight"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_totalWeight,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_coursesSelect_component",
    form: ["savedCourse"],
    field: ["course_classSelection"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_classSelection,
    options: [],
    settingsKey: "componentClassOptions",
    read_only: true,
  },
  {
    element: "select",
    id: "nogaPlanner_coursesSelect_courseYearInterval",
    form: ["savedCourse"],
    field: ["normativeCourseYearInterval"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.normativeCourseYearInterval,
    options: [],
    settingsKey: "academicYearOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_coursesSelect_courseTerm",
    form: ["savedCourse"],
    field: ["normativeCourseTerm"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.normativeCourseTerm,
    options: [],
    settingsKey: "termOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_coursesSelect_day",
    form: ["savedCourse"],
    field: ["course_daySelection"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_daySelection,
    options: [],
    settingsKey: "weekdayOptions",
    read_only: true,
  },
  {
    element: "select",
    id: "nogaPlanner_coursesSelect_time",
    form: ["savedCourse"],
    field: ["course_timeSelection"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_timeSelection,
    options: [],
    settingsKey: "hourOptions",
    read_only: true,
  },
  {
    element: "input",
    id: "nogaPlanner_coursesInput_grade",
    form: ["savedCourse"],
    field: ["course_grade"],
    label: NOGAPLANNER_TEXT.registryLabels.savedCourse.course_grade,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_type",
    form: ["exam"],
    field: ["type"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.type,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_date",
    form: ["exam"],
    field: ["exam_date"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.exam_date,
    value: "",
    inputType: "date",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_time",
    form: ["exam"],
    field: ["exam_time"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.exam_time,
    value: "",
    inputType: "time",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_volumeValue",
    form: ["exam"],
    field: ["volumeValue"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.volumeValue,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_volumeScope",
    form: ["exam"],
    field: ["volumeScope"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.volumeScope,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_volumeNote",
    form: ["exam"],
    field: ["volumeNote"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.volumeNote,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_weightValue",
    form: ["exam"],
    field: ["weightValue"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.weightValue,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_passGradeValue",
    form: ["exam"],
    field: ["passGradeValue"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.passGradeValue,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_passGradeMin",
    form: ["exam"],
    field: ["passGradeMin"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.passGradeMin,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_passGradeMax",
    form: ["exam"],
    field: ["passGradeMax"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.passGradeMax,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_gradeValue",
    form: ["exam"],
    field: ["gradeValue"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.gradeValue,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_gradeMin",
    form: ["exam"],
    field: ["gradeMin"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.gradeMin,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_examsInput_gradeMax",
    form: ["exam"],
    field: ["gradeMax"],
    label: NOGAPLANNER_TEXT.registryLabels.exam.gradeMax,
    value: "",
    inputType: "number",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_lecturesSelect_course",
    form: ["inlineLecture"],
    field: ["lecture_course"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_course,
    options: NOGAPLANNER_TEXT.selectsOptions.inlineLecture.lecture_course,
    read_only: true,
  },
  {
    element: "select",
    id: "nogaPlanner_lecturesSelect_component",
    form: ["inlineLecture"],
    field: ["lecture_component"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_component,
    options: [],
    settingsKey: "componentClassOptions",
    read_only: true,
  },
  {
    element: "input",
    id: "nogaPlanner_lecturesInput_name",
    form: ["inlineLecture"],
    field: ["lecture_name"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_name,
    value: "",
    inputType: "text",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_lecturesSelect_instructors",
    form: ["inlineLecture"],
    field: ["lecture_instructors"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_instructors,
    options: [],
    settingsKey: "lectureInstructorOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_lecturesSelect_writers",
    form: ["inlineLecture"],
    field: ["lecture_writers"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_writers,
    options: [],
    settingsKey: "lectureWriterOptions",
    read_only: false,
  },
  {
    element: "input",
    id: "nogaPlanner_lecturesInput_date",
    form: ["inlineLecture"],
    field: ["lecture_date"],
    label: NOGAPLANNER_TEXT.registryLabels.inlineLecture.lecture_date,
    value: "",
    inputType: "date",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_sharedSelect_locationBuilding",
    form: ["shared", "savedCourse", "exam"],
    field: ["locationBuilding"],
    label: NOGAPLANNER_TEXT.registryLabels.shared.locationBuilding,
    options: [],
    settingsKey: "locationBuildingOptions",
    read_only: false,
  },
  {
    element: "select",
    id: "nogaPlanner_sharedSelect_locationRoom",
    form: ["shared", "savedCourse", "exam"],
    field: ["locationRoom"],
    label: NOGAPLANNER_TEXT.registryLabels.shared.locationRoom,
    options: [],
    settingsKey: "locationRoomOptions",
    read_only: false,
  },
];

// Keep one canonical form name per planner section and avoid alias indirection.
const getNormalizedPlannerRegistryFormKey = (formKey) =>
  String(formKey || "").trim();

// Resolve the canonical field array to the concrete field name for the requested form.
const getPlannerRegistryFieldName = (fieldConfig, formKey) => {
  if (Array.isArray(fieldConfig?.field)) {
    return String(fieldConfig.field[0] || "").trim();
  }
  if (fieldConfig?.field && typeof fieldConfig.field === "object") {
    const mappedField =
      fieldConfig.field?.[formKey] ??
      fieldConfig.field?.shared ??
      fieldConfig.field?.savedCourse ??
      [];
    if (Array.isArray(mappedField)) {
      return String(mappedField[0] || "").trim();
    }
    return String(
      mappedField ??
        "",
    ).trim();
  }
  return String(fieldConfig?.field || "").trim();
};

// Fill select entries from the registry first, then fall back to text-owned option lists.
const hydratePlannerRegistryOptions = (fieldConfig) => {
  const explicitOptions = Array.isArray(fieldConfig?.options)
    ? fieldConfig.options
    : [];
  const selectSettingsKey = String(fieldConfig?.settingsKey || "").trim();
  if (explicitOptions.length > 0) {
    return explicitOptions;
  }
  if (!selectSettingsKey) {
    return [];
  }
  return Array.isArray(
    NOGAPLANNER_TEXT?.selectsOptions?.common?.[selectSettingsKey],
  )
    ? NOGAPLANNER_TEXT.selectsOptions.common[selectSettingsKey]
    : [];
};

// Expand a compact registry entry into the legacy runtime shape expected by existing components.
const normalizePlannerRegistryEntry = (
  fieldConfig = {},
  requestedFormKey = "",
) => {
  const formKey = getNormalizedPlannerRegistryFormKey(requestedFormKey);
  const fieldName = getPlannerRegistryFieldName(fieldConfig, formKey);
  const key = fieldName ? `${formKey}.${fieldName}` : "";
  const element = String(fieldConfig?.element || "").trim() || "input";
  const resolvedReadOnly = Boolean(fieldConfig?.read_only);
  return {
    ...fieldConfig,
    key,
    formKey,
    fieldName,
    control: element,
    element,
    ID: String(fieldConfig?.id || "").trim(),
    id: String(fieldConfig?.id || "").trim(),
    selectID: String(fieldConfig?.settingsKey || fieldConfig?.id || key).trim(),
    selectSettingsKey: String(fieldConfig?.settingsKey || "").trim(),
    inputType: String(fieldConfig?.inputType || "text").trim(),
    options: hydratePlannerRegistryOptions(fieldConfig),
    value: String(fieldConfig?.value || "").trim(),
    read_only: resolvedReadOnly,
    readonly: resolvedReadOnly,
  };
};

// Derive the field list for one planner form directly from the central registry.
export const getPlannerDefaultFieldsForForm = (formKey) => {
  const normalizedFormKey = getNormalizedPlannerRegistryFormKey(formKey);
  return PLANNER_FORM_FIELD_REGISTRY.filter((fieldConfig) =>
    Array.isArray(fieldConfig?.form)
      ? fieldConfig.form.includes(normalizedFormKey)
      : false,
  ).map((fieldConfig) =>
    normalizePlannerRegistryEntry(fieldConfig, normalizedFormKey),
  );
};

// Resolve one field config by key without storing a second registry copy.
export const getPlannerFieldConfigByKey = (fieldKey) => {
  const normalizedFieldKey = String(fieldKey || "").trim();
  if (!normalizedFieldKey) {
    return null;
  }
  const [rawFormKey] = normalizedFieldKey.split(".");
  const normalizedFormKey = getNormalizedPlannerRegistryFormKey(rawFormKey);
  return (
    getPlannerDefaultFieldsForForm(normalizedFormKey).find(
      (fieldConfig) =>
        String(fieldConfig?.key || "").trim() === normalizedFieldKey,
    ) || null
  );
};

// Read default select options for a settings key from the central field registry.
export const getPlannerRegistrySelectOptionsBySettingsKey = (settingsKey) => {
  const normalizedSettingsKey = String(settingsKey || "").trim();
  if (!normalizedSettingsKey) {
    return [];
  }
  const matchedEntry = PLANNER_FORM_FIELD_REGISTRY.find(
    (fieldConfig) =>
      String(fieldConfig?.settingsKey || "").trim() === normalizedSettingsKey,
  );
  return matchedEntry ? hydratePlannerRegistryOptions(matchedEntry) : [];
};

// Derive tab-select groupings on demand instead of storing another field object.
const PLANNER_SELECT_SETTINGS_STORAGE_KEY = "nogaPlanner.selectSettings.v1";

// Build defaults from the registry so settings and forms always start from the same option source.
export const buildDefaultPlannerWeekdayOptions = () => [
  ...getPlannerRegistrySelectOptionsBySettingsKey("weekdayOptions"),
];

// Build the default planner settings object from registry-backed option sources.
export const buildDefaultPlannerSelectSettings = () => ({
  componentClassOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("componentClassOptions"),
  ],
  weekdayOptions: buildDefaultPlannerWeekdayOptions(),
  hourOptions: [...getPlannerRegistrySelectOptionsBySettingsKey("hourOptions")],
  termOptions: [...getPlannerRegistrySelectOptionsBySettingsKey("termOptions")],
  academicYearOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("academicYearOptions"),
  ],
  locationBuildingOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("locationBuildingOptions"),
  ],
  locationRoomOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("locationRoomOptions"),
  ],
  locationRoomOptionsByBuilding: [],
  lectureInstructorOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("lectureInstructorOptions"),
  ],
  lectureWriterOptions: [
    ...getPlannerRegistrySelectOptionsBySettingsKey("lectureWriterOptions"),
  ],
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

// Build the empty persisted planning-input payload for the main planner tab.
export const getDefaultStudyPlanAid = () => ({
  enabled: true,
  viewMode: "timeline",
  timelineUnit: "day",
  defaults: {
    defaultDailyHours: 0,
    defaultDifficulty: "",
    defaultMastery: "",
    defaultPriority: "",
  },
  coursePlans: [],
  dayPlans: [],
  note: "",
});

const normalizeStudyPlanAidNumber = (value, fallbackValue = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallbackValue;
};

const normalizeStudyPlanAidId = (value = "") => String(value || "").trim();

// Normalize the persisted planning-input payload used by the new main tab.
export const normalizeStudyPlanAid = (value = {}) => {
  const nextValue = value && typeof value === "object" ? value : {};
  const fallback = getDefaultStudyPlanAid();

  return {
    enabled:
      typeof nextValue?.enabled === "boolean"
        ? nextValue.enabled
        : fallback.enabled,
    viewMode: String(nextValue?.viewMode || fallback.viewMode).trim() || fallback.viewMode,
    timelineUnit:
      String(nextValue?.timelineUnit || fallback.timelineUnit).trim() ||
      fallback.timelineUnit,
    defaults: {
      defaultDailyHours: normalizeStudyPlanAidNumber(
        nextValue?.defaults?.defaultDailyHours,
        fallback.defaults.defaultDailyHours,
      ),
      defaultDifficulty: String(
        nextValue?.defaults?.defaultDifficulty ||
          fallback.defaults.defaultDifficulty,
      ).trim(),
      defaultMastery: String(
        nextValue?.defaults?.defaultMastery || fallback.defaults.defaultMastery,
      ).trim(),
      defaultPriority: String(
        nextValue?.defaults?.defaultPriority ||
          fallback.defaults.defaultPriority,
      ).trim(),
    },
    coursePlans: (Array.isArray(nextValue?.coursePlans) ? nextValue.coursePlans : [])
      .map((coursePlanEntry) => {
        const courseId = normalizeStudyPlanAidId(coursePlanEntry?.courseId);
        if (!courseId) {
          return null;
        }
        return {
          _id: coursePlanEntry?._id || null,
          courseId,
          note: String(coursePlanEntry?.note || "").trim(),
          componentPlans: (
            Array.isArray(coursePlanEntry?.componentPlans)
              ? coursePlanEntry.componentPlans
              : []
          )
            .map((componentPlanEntry) => {
              const componentId = normalizeStudyPlanAidId(
                componentPlanEntry?.componentId,
              );
              if (!componentId) {
                return null;
              }
              return {
                _id: componentPlanEntry?._id || null,
                componentId,
                targetHours: normalizeStudyPlanAidNumber(
                  componentPlanEntry?.targetHours,
                  0,
                ),
                difficulty: String(componentPlanEntry?.difficulty || "").trim(),
                mastery: String(componentPlanEntry?.mastery || "").trim(),
                priority: String(componentPlanEntry?.priority || "").trim(),
                dailyHoursCap: normalizeStudyPlanAidNumber(
                  componentPlanEntry?.dailyHoursCap,
                  0,
                ),
                note: String(componentPlanEntry?.note || "").trim(),
                lectureOverrides: (
                  Array.isArray(componentPlanEntry?.lectureOverrides)
                    ? componentPlanEntry.lectureOverrides
                    : []
                )
                  .map((lectureOverrideEntry) => {
                    const lectureId = normalizeStudyPlanAidId(
                      lectureOverrideEntry?.lectureId,
                    );
                    if (!lectureId) {
                      return null;
                    }
                    return {
                      _id: lectureOverrideEntry?._id || null,
                      lectureId,
                      targetHours: normalizeStudyPlanAidNumber(
                        lectureOverrideEntry?.targetHours,
                        0,
                      ),
                      difficulty: String(
                        lectureOverrideEntry?.difficulty || "",
                      ).trim(),
                      mastery: String(lectureOverrideEntry?.mastery || "").trim(),
                      priority: String(
                        lectureOverrideEntry?.priority || "",
                      ).trim(),
                      dailyHoursCap: normalizeStudyPlanAidNumber(
                        lectureOverrideEntry?.dailyHoursCap,
                        0,
                      ),
                      note: String(lectureOverrideEntry?.note || "").trim(),
                    };
                  })
                  .filter(Boolean),
              };
            })
            .filter(Boolean),
        };
      })
      .filter(Boolean),
    dayPlans: (Array.isArray(nextValue?.dayPlans) ? nextValue.dayPlans : [])
      .map((dayPlanEntry) => {
        const periodType = String(dayPlanEntry?.periodType || "").trim();
        const groupKey = String(dayPlanEntry?.groupKey || "").trim();
        const dayNumber = normalizeStudyPlanAidNumber(dayPlanEntry?.dayNumber, 0);
        if (!periodType || !groupKey || dayNumber <= 0) {
          return null;
        }
        return {
          _id: dayPlanEntry?._id || null,
          periodType,
          groupKey,
          label: String(dayPlanEntry?.label || "").trim(),
          dayNumber,
          dailyHoursCap: normalizeStudyPlanAidNumber(
            dayPlanEntry?.dailyHoursCap,
            0,
          ),
          lectureIds: (Array.isArray(dayPlanEntry?.lectureIds)
            ? dayPlanEntry.lectureIds
            : []
          )
            .map((lectureId) => normalizeStudyPlanAidId(lectureId))
            .filter(Boolean),
        };
      })
      .filter(Boolean),
    note: String(nextValue?.note || "").trim(),
  };
};

const getPlannerTermExamWindows = (profile = {}) =>
  Array.isArray(profile?.studying?.time?.current?.programTerm?.examDate)
    ? profile.studying.time.current.programTerm.examDate
    : [];

const parsePlannerDateValue = (value) => {
  if (!value) {
    return null;
  }
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const resolvePlannerComponentDeadline = (component = {}, profile = {}) => {
  const exams = Array.isArray(component?.course_exams) ? component.course_exams : [];
  const explicitExamDates = exams
    .map((examEntry) =>
      parsePlannerDateValue(
        examEntry?.exam_date ||
          examEntry?.time?.start_date ||
          examEntry?.time?.startsAt,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime());
  if (explicitExamDates.length > 0) {
    return {
      date: explicitExamDates[0],
      source: "componentExam",
    };
  }

  const componentClass = String(component?.course_class || "").trim();
  const matchingTermDates = getPlannerTermExamWindows(profile)
    .filter(
      (entry) =>
        String(entry?.component_class || "").trim() === componentClass,
    )
    .map((entry) => parsePlannerDateValue(entry?.start_date))
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime());

  return matchingTermDates.length > 0
    ? {
        date: matchingTermDates[0],
        source: "termExam",
      }
    : {
        date: null,
        source: "",
      };
};

const getPlannerStudyPlanLookupMaps = (studyPlanAid = {}) => {
  const normalizedAid = normalizeStudyPlanAid(studyPlanAid);
  const coursePlanMap = new Map();
  const componentPlanMap = new Map();
  const lectureOverrideMap = new Map();

  normalizedAid.coursePlans.forEach((coursePlanEntry) => {
    coursePlanMap.set(coursePlanEntry.courseId, coursePlanEntry);
    coursePlanEntry.componentPlans.forEach((componentPlanEntry) => {
      componentPlanMap.set(componentPlanEntry.componentId, componentPlanEntry);
      componentPlanEntry.lectureOverrides.forEach((lectureOverrideEntry) => {
        lectureOverrideMap.set(lectureOverrideEntry.lectureId, lectureOverrideEntry);
      });
    });
  });

  return {
    normalizedAid,
    coursePlanMap,
    componentPlanMap,
    lectureOverrideMap,
  };
};

// Derive the runtime daily timeline rows from organizer courses, profile term windows, and manual studyPlanAid inputs.
export const buildPlannerStudyPlanTimeline = ({
  courses = [],
  lectures = [],
  profile = {},
  studyPlanAid = {},
  now = new Date(),
} = {}) => {
  const {
    normalizedAid,
    coursePlanMap,
    componentPlanMap,
    lectureOverrideMap,
  } = getPlannerStudyPlanLookupMaps(studyPlanAid);
  const allLectures = Array.isArray(lectures) ? lectures : [];

  const uniqueCourses = Array.from(
    new Map(
      (Array.isArray(courses) ? courses : []).map((courseEntry) => [
        String(courseEntry?._id || courseEntry?.parentCourseId || "").trim(),
        courseEntry,
      ]),
    ).values(),
  );

  const timelineRows = uniqueCourses.flatMap((courseEntry) => {
    const courseId = String(courseEntry?._id || courseEntry?.parentCourseId || "").trim();
    const courseName = formatSavedCourseTitle(courseEntry);
    const coursePlan = coursePlanMap.get(courseId) || null;
    const componentEntries = Array.isArray(courseEntry?.course_components)
      ? courseEntry.course_components
      : [];

    return componentEntries.flatMap((componentEntry) => {
      const componentId = String(componentEntry?._id || "").trim();
      if (!componentId) {
        return [];
      }
      const componentPlan = componentPlanMap.get(componentId) || null;
      const resolvedDeadline = resolvePlannerComponentDeadline(componentEntry, profile);
      const deadlineDate = resolvedDeadline.date;
      const remainingDays = deadlineDate
        ? Math.max(
            0,
            Math.ceil(
              (deadlineDate.getTime() - new Date(now).setHours(0, 0, 0, 0)) /
                86400000,
            ),
          )
        : null;
      const targetHours = normalizeStudyPlanAidNumber(
        componentPlan?.targetHours,
        normalizedAid.defaults.defaultDailyHours,
      );
      const suggestedDailyHours =
        remainingDays && remainingDays > 0
          ? Number((targetHours / remainingDays).toFixed(2))
          : targetHours;
      const matchingLectures = allLectures.filter((lectureEntry) => {
        const lectureCourseId = String(
          lectureEntry?.lecture_courseId || lectureEntry?.courseId || "",
        ).trim();
        const lectureComponentId = String(
          lectureEntry?.lecture_componentId || lectureEntry?.componentId || "",
        ).trim();
        return lectureCourseId === courseId && lectureComponentId === componentId;
      });

      const componentRow = {
        rowType: "component",
        courseId,
        componentId,
        lectureId: "",
        courseName,
        componentName: formatCourseComponentLabel(
          String(componentEntry?.course_class || "").trim() || "-",
        ),
        lectureName: "",
        deadlineDate: deadlineDate ? deadlineDate.toISOString() : "",
        deadlineSource: resolvedDeadline.source,
        remainingDays,
        remainingHours: targetHours,
        suggestedDailyHours,
        difficulty:
          String(componentPlan?.difficulty || normalizedAid.defaults.defaultDifficulty).trim(),
        mastery:
          String(componentPlan?.mastery || normalizedAid.defaults.defaultMastery).trim(),
        priority:
          String(componentPlan?.priority || normalizedAid.defaults.defaultPriority).trim(),
        dailyHoursCap: normalizeStudyPlanAidNumber(componentPlan?.dailyHoursCap, 0),
        note: String(componentPlan?.note || "").trim(),
        coursePlanNote: String(coursePlan?.note || "").trim(),
      };

      const lectureRows = matchingLectures
        .map((lectureEntry) => {
          const lectureId = String(lectureEntry?._id || "").trim();
          const lectureOverride = lectureOverrideMap.get(lectureId);
          if (!lectureId || !lectureOverride) {
            return null;
          }
          return {
            rowType: "lecture",
            courseId,
            componentId,
            lectureId,
            courseName,
            componentName: componentRow.componentName,
            lectureName: String(
              lectureEntry?.lecture_name || lectureEntry?.title || "-",
            ).trim(),
            deadlineDate: componentRow.deadlineDate,
            deadlineSource: componentRow.deadlineSource,
            remainingDays,
            remainingHours: normalizeStudyPlanAidNumber(
              lectureOverride?.targetHours,
              0,
            ),
            suggestedDailyHours:
              remainingDays && remainingDays > 0
                ? Number(
                    (
                      normalizeStudyPlanAidNumber(lectureOverride?.targetHours, 0) /
                      remainingDays
                    ).toFixed(2),
                  )
                : normalizeStudyPlanAidNumber(lectureOverride?.targetHours, 0),
            difficulty: String(
              lectureOverride?.difficulty ||
                componentRow.difficulty ||
                normalizedAid.defaults.defaultDifficulty,
            ).trim(),
            mastery: String(
              lectureOverride?.mastery ||
                componentRow.mastery ||
                normalizedAid.defaults.defaultMastery,
            ).trim(),
            priority: String(
              lectureOverride?.priority ||
                componentRow.priority ||
                normalizedAid.defaults.defaultPriority,
            ).trim(),
            dailyHoursCap: normalizeStudyPlanAidNumber(
              lectureOverride?.dailyHoursCap,
              0,
            ),
            note: String(lectureOverride?.note || "").trim(),
            coursePlanNote: componentRow.coursePlanNote,
          };
        })
        .filter(Boolean);

      return [componentRow, ...lectureRows];
    });
  });

  return {
    studyPlanAid: normalizedAid,
    rows: timelineRows,
  };
};
// Build the empty relationship draft used by planner component rules in settings.
export const getDefaultPlannerRelationshipDraft = () => ({
  relationScope: "innerComponent",
  causeField: "",
  causeValue: "",
  effectField: "",
  effectValue: "",
  readOnly: false,
});

// Create stable client-side ids for settings relationships before persistence.
export const createPlannerSettingsRelationshipId = () =>
  `planner-rel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Normalize generic string-list settings while removing empty and duplicate values.
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

// Normalize grouped room options so each building owns one deduplicated room list.
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

// Normalize one relationship entry regardless of whether it came from legacy or current settings.
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

// Normalize the entire planner settings payload into the runtime shape consumed by the UI.
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
  const normalizedPredictionTool = (
    Array.isArray(nextValue?.predictionTool) ? nextValue.predictionTool : []
  )
    .map((entry) => ({
      tab: String(entry?.tab || "").trim(),
      inputFieldID: String(entry?.inputFieldID || "").trim(),
      list: normalizePlannerSettingsStringList(entry?.list, []),
    }))
    .filter((entry) => Boolean(entry.inputFieldID));
  const normalizedVoiceCommands = (
    Array.isArray(nextValue?.voiceCommands)
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
      const conditionRaw = String(entry?.condition || "")
        .trim()
        .toLowerCase();
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
    lectureInstructorOptions: normalizePlannerSettingsStringList(
      nextValue.lectureInstructorOptions,
      fallbackSettings.lectureInstructorOptions,
    ),
    lectureWriterOptions: normalizePlannerSettingsStringList(
      nextValue.lectureWriterOptions,
      fallbackSettings.lectureWriterOptions,
    ),
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
        : nextValue?.fieldDefaults &&
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

export const getDefaultInlineComponentDraft = () => ({
  course_class: "",
  course_dayAndTime: "",
  course_daySelection: "",
  course_timeSelection: "",
  course_grade: "",
  locationBuilding: "",
  locationRoom: "",
});

export const getEditableCourseDraft = (course = {}) => {
  const examEntries =
    Array.isArray(course?.course_exams) && course.course_exams.length > 0
      ? course.course_exams
      : [];

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

  return `• Days ${diffDaysWithoutDecimals} • Hours ${diffHoursWithoutDecimals} • Minutes ${diffMinsWithoutDecimals} • Time ${examTime_hour}:${examTime_mins} • Theoretical mode`;
};
export const COURSE_PRINT_SOUND_START_OFFSET = 0.109;
export const COURSE_PRINT_SOUND_BASE_DURATION = 26.204;
export const NAGHAM_COURSE_LETTERS_STORAGE_KEY =
  "nogaPlanner_nagham_course_letters";
export const NAGHAM_COURSE_LIST_STORAGE_KEY = "nogaPlanner_nagham_course_list";
export const SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY =
  "nogaPlanner_reducedMotion";
export const DEFAULT_NAGHAM_COURSE_LETTER =
  "This is the lecture: make it light study, then leisure, then rest.";
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

