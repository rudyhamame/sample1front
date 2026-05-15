import React from "react";
import { apiUrl } from "./config/api";
import "./telegramControlPage.css";

const DEFAULT_DEPENDENCY_KEYS = [
  "username",
  "program",
  "university",
  "study_year",
  "term",
  "important_messages",
];

const DEPENDENCY_OPTIONS = [
  { key: "username", label: "Username" },
  { key: "program", label: "Program" },
  { key: "university", label: "University" },
  { key: "study_year", label: "Study year" },
  { key: "term", label: "Term" },
  { key: "important_messages", label: "Pins" },
];

const TELEGRAM_MESSAGES_FETCH_LIMIT = "all";
const TELEGRAM_MESSAGE_TYPE_TABS = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "texts", labelEn: "Texts", labelAr: "نصوص" },
  { key: "photos", labelEn: "Photos", labelAr: "صور" },
  { key: "videos", labelEn: "Videos", labelAr: "فيديو" },
  { key: "audios", labelEn: "Audios", labelAr: "صوتيات" },
  { key: "documents", labelEn: "Documents", labelAr: "ملفات" },
];

const classifyTelegramMemberRole = (sender = "") => {
  const normalized = String(sender || "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") {
    return "Unknown";
  }
  if (normalized.includes("channel")) {
    return "Channel";
  }
  if (normalized.endsWith("bot") || normalized.includes(" bot")) {
    return "Bot";
  }
  return "Member";
};
const ALL_IMPORTANT_MESSAGES_VALUE = "__all_important_messages__";
const CONCEPT_PROGRESS_STAGES = {
  lecture: [
    "Preparing stored Telegram message context...",
    "Collecting matching messages from the selected scope...",
    "Sending the conceptualization request to the AI provider...",
    "Waiting for the AI reply and normalizing lecture results...",
  ],
  important: [
    "Preparing the pinned message context...",
    "Collecting supporting stored messages and dependencies...",
    "Sending the conceptualization request to the AI provider...",
    "Waiting for the AI reply and shaping the final concept...",
  ],
};

const DEPENDENCY_LABELS = {
  en: {
    username: "Username",
    program: "Program",
    university: "University",
    study_year: "Study year",
    term: "Term",
    important_messages: "Pins",
  },
  ar: {
    username: "اسم المستخدم",
    program: "البرنامج",
    university: "الجامعة",
    study_year: "السنة الدراسية",
    term: "الفصل",
    important_messages: "المثبّتات",
  },
};

const STORAGE_COPY = {
  en: {
    storage: "Storage",
    searchStoredMessages: "Search stored messages",
    searchPlaceholder: "Search all stored groups",
    selectedOnly: "Search only one stored group",
    noStoredGroups: "No stored groups available",
    searchStorage: "Search storage",
    searching: "Searching...",
    language: "Language",
    aiScope: "Stored group scope",
    allGroups: "All Groups",
    conceptualizationLanguage: "AI reply language",
    conceptualizationArabic: "Arabic",
    conceptualizationEnglish: "English",
    conceptualizationBoth: "Both",
    dependencies: "Dependencies",
    addDependencyPlaceholder: "Add dependency to the AI prompt",
    add: "Add",
    predictCourses: "Conceptualize course names by AI",
    predictLectures: "Conceptualize lecture names by AI",
    predictInstructors: "Conceptualize instructor names by AI",
    predictionsSettingsTab: "Settings",
    predictionsCoursesTab: "Courses",
    predictionsLecturesTab: "Lectures",
    predictionsInstructorsTab: "Instructors",
    predictionsPinsTab: "Pins",
    predict: "Conceptualize",
    predicting: "Conceptualizing...",
    conceptualize: "Conceptualize",
    thinking: "Thinking...",
    noSavedCourses: "No saved courses yet",
    noCoursePredictions: "No course conceptualizations yet",
    noLecturePredictions: "No lecture conceptualizations yet",
    noInstructorPredictions: "No instructor conceptualizations yet",
    predictedBucket: "Conceptualized",
    deletePredicted: "Delete conceptualized",
    acceptedBucket: "Accepted",
    clearAccepted: "Clear accepted",
    noImportantMessages: "No important messages pinned yet",
    loadStoredPrompt:
      "Search storage to open the stored Telegram message monitor.",
    loadingStored: "Loading stored Telegram messages...",
    pin: "Pin",
    pinned: "Pinned",
    storedGroup: "Stored group",
    interval: "Interval",
    storedMessagesNumber: "Stored messages number",
    liveIntervalValue: "Live (new messages only)",
    notSet: "Not set",
    present: "Present",
    viewAction: "View",
    editAction: "Edit",
    deleteAction: "Delete",
    shown: "shown",
    builtCourses: (count) =>
      `Built ${count} course conceptualization(s) from Telegram storage.`,
    builtLectures: (count, courseName) =>
      `Built ${count} lecture conceptualization(s) for ${courseName}.`,
    builtInstructors: (count) =>
      `Built ${count} instructor conceptualization(s) from Telegram storage.`,
    conceptualized: "Important message conceptualized.",
    conceptSummary: "Summary",
    conceptKeyIdeas: "Key ideas",
    conceptAcademicRelevance: "Academic relevance",
    conceptNextAction: "Next action",
    conceptKeyIdeasPlaceholder: "One key idea per line",
    saveConcept: "Save concept",
    savingConcept: "Saving...",
    deleteConcept: "Delete concept",
    deletingConcept: "Deleting...",
    conceptSaved: "Important message concept saved.",
    conceptDeleted: "Important message concept deleted.",
    chooseCourse: "Choose one of your saved courses first.",
    chooseImportant: "Choose an important message first.",
    chooseSingleImportant: "Choose one pinned message to conceptualize.",
    pinnedMessagesTable: "Pinned messages table",
    pinnedMessageColumn: "Pinned message",
    groupNameColumn: "Group name",
    targetCourseColumn: "Targeted course",
    targetInstructorColumn: "Targeted instructor",
    targetComponentColumn: "Targeted component",
    targetLectureColumn: "Targeted lecture",
    conceptColumn: "Concept",
    goalColumn: "Goal",
    notApplicable: "-",
    allCourses: "All Courses",
  },
  ar: {
    storage: "التخزين",
    searchStoredMessages: "البحث في الرسائل المخزنة",
    searchPlaceholder: "ابحث في كل المجموعات المخزنة",
    selectedOnly: "ابحث داخل مجموعة مخزنة واحدة فقط",
    noStoredGroups: "لا توجد مجموعات مخزنة",
    searchStorage: "ابحث في التخزين",
    searching: "جارٍ البحث...",
    language: "اللغة",
    aiScope: "نطاق المجموعات المخزنة",
    allGroups: "كل المجموعات",
    conceptualizationLanguage: "لغة رد الذكاء الاصطناعي",
    conceptualizationArabic: "العربية",
    conceptualizationEnglish: "الإنجليزية",
    conceptualizationBoth: "كلتاهما",
    dependencies: "الاعتماديات",
    addDependencyPlaceholder: "أضف اعتمادًا إلى طلب الذكاء الاصطناعي",
    add: "إضافة",
    predictCourses: "بلورة أسماء المواد بالذكاء الاصطناعي",
    predictLectures: "بلورة أسماء المحاضرات بالذكاء الاصطناعي",
    predictInstructors: "بلورة أسماء الأساتذة بالذكاء الاصطناعي",
    predictionsSettingsTab: "الإعدادات",
    predictionsCoursesTab: "المواد",
    predictionsLecturesTab: "المحاضرات",
    predictionsInstructorsTab: "الأساتذة",
    predictionsPinsTab: "المثبّتات",
    predict: "بلور",
    predicting: "جارٍ البلورة...",
    conceptualize: "بلورة الفكرة",
    thinking: "جارٍ التفكير...",
    noSavedCourses: "لا توجد مواد محفوظة بعد",
    noCoursePredictions: "لا توجد بلورات مواد بعد",
    noLecturePredictions: "لا توجد بلورات محاضرات بعد",
    noInstructorPredictions: "لا توجد بلورات أساتذة بعد",
    predictedBucket: "تمت البلورة",
    deletePredicted: "حذف ما تمت بلورته",
    acceptedBucket: "المقبول",
    clearAccepted: "مسح المقبول",
    noImportantMessages: "لا توجد رسائل مهمة مثبّتة بعد",
    loadStoredPrompt: "ابحث في التخزين لفتح مراقب الرسائل المخزنة من تيليجرام.",
    loadingStored: "جارٍ تحميل رسائل تيليجرام المخزنة...",
    pin: "تثبيت",
    pinned: "مثبّتة",
    storedGroup: "مجموعة مخزنة",
    interval: "الفترة",
    storedMessagesNumber: "عدد الرسائل المخزنة",
    liveIntervalValue: "مباشر (رسائل جديدة فقط)",
    notSet: "غير محدد",
    present: "مستمر",
    viewAction: "عرض",
    editAction: "تعديل",
    deleteAction: "حذف",
    shown: "معروضة",
    builtCourses: (count) =>
      `تم إنشاء ${count} بلورة/بلورات لمواد من تخزين تيليجرام.`,
    builtLectures: (count, courseName) =>
      `تم إنشاء ${count} بلورة/بلورات لمحاضرات خاصة بـ ${courseName}.`,
    builtInstructors: (count) =>
      `تم إنشاء ${count} بلورة/بلورات لأسماء الأساتذة من تخزين تيليجرام.`,
    conceptualized: "تمت بلورة الرسالة المهمة.",
    conceptSummary: "الملخص",
    conceptKeyIdeas: "الأفكار الأساسية",
    conceptAcademicRelevance: "الصلة الأكاديمية",
    conceptNextAction: "الخطوة التالية",
    conceptKeyIdeasPlaceholder: "فكرة واحدة في كل سطر",
    saveConcept: "حفظ البلورة",
    savingConcept: "جارٍ الحفظ...",
    deleteConcept: "حذف البلورة",
    deletingConcept: "جارٍ الحذف...",
    conceptSaved: "تم حفظ بلورة الرسالة المهمة.",
    conceptDeleted: "تم حذف بلورة الرسالة المهمة.",
    chooseCourse: "اختر مادة محفوظة أولًا.",
    chooseImportant: "اختر رسالة مهمة أولًا.",
    chooseSingleImportant: "اختر رسالة مثبتة واحدة لبلورة الفكرة.",
    pinnedMessagesTable: "جدول الرسائل المثبتة",
    pinnedMessageColumn: "الرسالة المثبتة",
    groupNameColumn: "اسم المجموعة",
    targetCourseColumn: "المادة المستهدفة",
    targetInstructorColumn: "الأستاذ المستهدف",
    targetComponentColumn: "مكوّن المادة المستهدف",
    targetLectureColumn: "المحاضرة المستهدفة",
    conceptColumn: "البلورة",
    goalColumn: "الهدف",
    notApplicable: "-",
    allCourses: "كل المواد",
  },
};

const getTelegramMessageDate = (value) => {
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

const formatDateInputValue = (value) => {
  if (typeof value === "string" && value.trim()) {
    const normalizedValue = value.trim();
    const matchedDateParts = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (matchedDateParts) {
      return `${matchedDateParts[1]}-${matchedDateParts[2]}-${matchedDateParts[3]}`;
    }
  }

  const nextDate = getTelegramMessageDate(value);
  if (!nextDate) {
    return "";
  }

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTodayDateInputValue = () => formatDateInputValue(new Date());

const formatTelegramDayLabel = (value) => {
  const nextDate = getTelegramMessageDate(value);
  if (!nextDate) {
    return "Unknown day";
  }
  return nextDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTelegramDateTime = (value) => {
  const nextDate = getTelegramMessageDate(value);
  if (!nextDate) {
    return "";
  }
  return nextDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const groupTelegramMessagesByDay = (messages = []) => {
  const groupedMessagesMap = new Map();

  messages.forEach((message) => {
    const dayKey = formatTelegramDayLabel(message?.date);
    if (!groupedMessagesMap.has(dayKey)) {
      groupedMessagesMap.set(dayKey, []);
    }
    groupedMessagesMap.get(dayKey).push(message);
  });

  return Array.from(groupedMessagesMap.entries()).map(([dayLabel, items]) => ({
    dayLabel,
    items,
  }));
};

const isNumericTelegramReference = (value) =>
  /^-?\d+$/.test(String(value || "").trim());

const formatTelegramGroupOptionLabel = (
  group,
  fallbackLabel = "Telegram group",
) => {
  const title = String(group?.title || "").trim();
  const username = String(group?.username || "").trim();
  const groupReference = String(group?.groupReference || "").trim();

  if (title && username && title !== username) {
    return `${title} (${username})`;
  }
  if (title) {
    return title;
  }
  if (username) {
    return username;
  }
  if (groupReference && !isNumericTelegramReference(groupReference)) {
    return groupReference;
  }
  return fallbackLabel;
};

const getTelegramGroupOptionGroups = (
  options = [],
  configuredReference = "",
) => {
  const trimmedReference = String(configuredReference || "").trim();
  const hasConfiguredReference =
    trimmedReference.length > 0 &&
    !isNumericTelegramReference(trimmedReference);
  const mergedOptions = hasConfiguredReference
    ? [
        ...options,
        ...(!options.some(
          (group) =>
            String(group?.groupReference || "").trim() === trimmedReference,
        )
          ? [
              {
                groupReference: trimmedReference,
                title: trimmedReference,
                username: "",
                type: "group",
              },
            ]
          : []),
      ]
    : options;

  return mergedOptions.reduce(
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
};

const parseStoredConceptSummary = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

const normalizeConceptDraft = (value) => {
  const parsed = parseStoredConceptSummary(value) || {};

  return {
    summary: String(parsed?.summary || "").trim(),
    keyIdeasText: Array.isArray(parsed?.keyIdeas)
      ? parsed.keyIdeas
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
          .join("\n")
      : "",
    academicRelevance: String(parsed?.academicRelevance || "").trim(),
    nextAction: String(parsed?.nextAction || "").trim(),
  };
};

const buildImportantMessageValue = (message) =>
  `${String(message?.groupReference || "").trim()}::${Number(message?.id || 0)}`;

const getCourseSuggestionIdentity = (suggestion) =>
  String(
    suggestion?.suggestionKey ||
      suggestion?.duplicateKey ||
      suggestion?.coursePayload?.course_name ||
      "",
  ).trim();

const getLectureSuggestionIdentity = (suggestion) =>
  String(
    suggestion?.suggestionKey ||
      suggestion?.duplicateKey ||
      suggestion?.lectureName ||
      "",
  ).trim();

const getInstructorSuggestionIdentity = (suggestion) =>
  String(
    suggestion?.suggestionKey ||
      suggestion?.duplicateKey ||
      suggestion?.name ||
      "",
  ).trim();

const normalizeCourseField = (value) => String(value || "").trim();

const buildCourseComponentIdentity = (value) => {
  const courseName = normalizeCourseField(value?.course_name);
  const courseComponent = normalizeCourseField(value?.course_component);

  if (!courseName) {
    return "";
  }

  return `${courseName}::${courseComponent || "-"}`;
};

const buildCourseComponentLabel = (value) => {
  const courseName = normalizeCourseField(value?.course_name);
  const courseComponent = normalizeCourseField(value?.course_component);

  if (!courseName) {
    return "";
  }

  if (!courseComponent || courseComponent === "-" || courseComponent === courseName) {
    return courseName;
  }

  return `${courseName} (${courseComponent})`;
};
const buildCourseSelectOptionsFromEntries = (entries = []) => {
  const optionMap = new Map();

  const appendOption = (value) => {
    const identity = buildCourseComponentIdentity(value);
    const label = buildCourseComponentLabel(value);

    if (!identity || !label || optionMap.has(identity)) {
      return;
    }

    optionMap.set(identity, {
      identity,
      label,
      course_name: normalizeCourseField(value?.course_name),
      course_component: normalizeCourseField(value?.course_component),
    });
  };

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (normalizeCourseField(entry?.course_name)) {
      appendOption(entry);
      return;
    }

    const courseName = normalizeCourseField(
      entry?.name || entry?.courseName || entry?.title,
    );
    const components = Array.isArray(entry?.components) ? entry.components : [];

    if (!courseName) {
      return;
    }

    if (components.length === 0) {
      appendOption({
        course_name: courseName,
        course_component: "-",
      });
      return;
    }

    components.forEach((component) => {
      appendOption({
        course_name: courseName,
        course_component:
          normalizeCourseField(component?.class || component?.name) || "-",
      });
    });
  });

  return Array.from(optionMap.values());
};

const formatPredictionArrayText = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(" | ");

const buildLectureTranslationRequestPayload = (lecture) => {
  const payload = lecture?.lecturePayload || {};

  return {
    suggestionKey: getLectureSuggestionIdentity(lecture),
    lectureName: String(lecture?.lectureName || "").trim(),
    lecturePayload: {
      lecture_instructors: Array.isArray(payload?.lecture_instructors)
        ? payload.lecture_instructors
        : [],
      prediction_writer_group: String(payload?.prediction_writer_group || "").trim(),
      prediction_volume: String(payload?.prediction_volume || "").trim(),
      prediction_reference: String(payload?.prediction_reference || "").trim(),
      prediction_logic: String(payload?.prediction_logic || "").trim(),
    },
  };
};

const applyLectureTranslation = (lecture, translation) => {
  if (!translation || typeof translation !== "object") {
    return lecture;
  }

  const payload = lecture?.lecturePayload || {};

  return {
    ...lecture,
    lectureName: String(translation?.lectureName || lecture?.lectureName || "").trim(),
    lecturePayload: {
      ...payload,
      lecture_instructors: Array.isArray(translation?.instructors)
        ? translation.instructors
        : payload?.lecture_instructors,
      prediction_writer_group:
        String(
          translation?.writerGroup || payload?.prediction_writer_group || "",
        ).trim() || "-",
      prediction_volume:
        String(translation?.volume || payload?.prediction_volume || "").trim() || "-",
      prediction_reference:
        String(
          translation?.reference || payload?.prediction_reference || "",
        ).trim() || "-",
      prediction_logic:
        String(translation?.logic || payload?.prediction_logic || "").trim() || "-",
    },
  };
};

const formatLecturePageCount = (lecture) => {
  const payload = lecture?.lecturePayload || {};
  const pageCount = Number(payload?.lecture_length || 0);

  if (!Number.isFinite(pageCount) || pageCount <= 0) {
    return "-";
  }

  return String(pageCount);
};

const getLecturePdfFileName = (lecture) => {
  const payload = lecture?.lecturePayload || {};
  const pdfAttachment =
    payload?.lecture_pdf_attachment && typeof payload.lecture_pdf_attachment === "object"
      ? payload.lecture_pdf_attachment
      : lecture?.pdfAttachment && typeof lecture.pdfAttachment === "object"
        ? lecture.pdfAttachment
        : null;

  return String(pdfAttachment?.fileName || "").trim() || "-";
};

const ARABIC_TEXT_CHARACTER_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_TEXT_CHARACTER_PATTERN = /[A-Za-z]/;
const ALL_GROUPS_VALUE = "__all_groups__";
const EMPTY_TELEGRAM_ARRAY = [];

const getTelegramMessageTextDirection = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "ltr";
  }

  for (const character of text) {
    if (ARABIC_TEXT_CHARACTER_PATTERN.test(character)) {
      return "rtl";
    }

    if (LATIN_TEXT_CHARACTER_PATTERN.test(character)) {
      return "ltr";
    }
  }

  return "ltr";
};

const removeSuggestionFromList = (
  currentList = [],
  suggestion,
  getIdentity = () => "",
) => {
  const suggestionIdentity = getIdentity(suggestion);

  if (!suggestionIdentity) {
    return currentList.filter((entry) => entry !== suggestion);
  }

  return currentList.filter(
    (entry) => getIdentity(entry) !== suggestionIdentity,
  );
};

const prependSuggestionToList = (
  currentList = [],
  suggestion,
  getIdentity = () => "",
) => {
  const filteredList = removeSuggestionFromList(
    currentList,
    suggestion,
    getIdentity,
  );

  return [suggestion, ...filteredList];
};

const isPlainObjectRecord = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === "[object Object]";

const buildObjectKeyTree = (
  value,
  parentPath = "",
  seen = new WeakSet(),
  depth = 0,
) => {
  if (!isPlainObjectRecord(value) || depth > 6 || seen.has(value)) {
    return [];
  }

  seen.add(value);

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const nextPath = parentPath ? `${parentPath}.${key}` : key;
      const nextValue = value[key];
      let children = [];

      if (isPlainObjectRecord(nextValue)) {
        children = buildObjectKeyTree(nextValue, nextPath, seen, depth + 1);
      } else if (Array.isArray(nextValue)) {
        const nestedObject = nextValue.find((entry) =>
          isPlainObjectRecord(entry),
        );

        if (nestedObject) {
          children = buildObjectKeyTree(
            nestedObject,
            `${nextPath}[]`,
            seen,
            depth + 1,
          );
        }
      }

      return {
        key,
        path: nextPath,
        children,
      };
    });
};

const TelegramControlPage = ({ state, memory, serverReply }) => {
  const [groupInput, setGroupInput] = React.useState("");
  const [groupReference, setGroupReference] = React.useState("");
  const [migrationGroupTitle, setMigrationGroupTitle] =
    React.useState("Telegram Migration");
  const [storeMessagesMode, setStoreMessagesMode] = React.useState("all");
  const [migrationFromDate, setMigrationFromDate] = React.useState(
    getTodayDateInputValue(),
  );
  const [migrationToDate, setMigrationToDate] = React.useState("");
  const [isMigrationToPresent, setIsMigrationToPresent] = React.useState(true);
  const [activeScopeTableGroupReference, setActiveScopeTableGroupReference] =
    React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [telegramImportSummary, setTelegramImportSummary] = React.useState(null);
  const [storageFeedback, setStorageFeedback] = React.useState("");
  const [storageDebugFeedback, setStorageDebugFeedback] = React.useState("");
  const [telegramConfigFeedback, setTelegramConfigFeedback] =
    React.useState("");
  const publishFeedback = React.useCallback(
    (message) => {
      const nextMessage = String(message || "").trim();
      setFeedback(nextMessage);
      if (nextMessage) {
        serverReply?.(nextMessage);
      }
    },
    [serverReply],
  );
  const [messages, setMessages] = React.useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [groupOptions, setGroupOptions] = React.useState([]);
  const [storedGroupOptions, setStoredGroupOptions] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [importantMessages, setImportantMessages] = React.useState([]);
  const [streamTitle, setStreamTitle] = React.useState("Telegram messages");
  const [activeMessageTypeTab, setActiveMessageTypeTab] = React.useState("all");
  const [storageRangeStartDate, setStorageRangeStartDate] = React.useState("");
  const [storageRangeEndDate, setStorageRangeEndDate] = React.useState("");
  const [storageSearchQuery, setStorageSearchQuery] = React.useState("");
  const [selectedStoredGroupReference, setSelectedStoredGroupReference] =
    React.useState(ALL_GROUPS_VALUE);
  const storageSearchDirection =
    getTelegramMessageTextDirection(storageSearchQuery);
  const isSearchingAllGroups =
    String(selectedStoredGroupReference || "").trim() === ALL_GROUPS_VALUE;
  const selectedStoredGroupScope = isSearchingAllGroups
    ? ""
    : String(selectedStoredGroupReference || "").trim();
  const [activeStorageScope, setActiveStorageScope] = React.useState({
    query: "",
    allGroups: true,
    groupReference: "",
    start: "",
    end: "",
  });
  const [selectedDependencyKeys, setSelectedDependencyKeys] = React.useState(
    DEFAULT_DEPENDENCY_KEYS,
  );
  const storageLanguage = "en";
  const [conceptualizationLanguage, setConceptualizationLanguage] =
    React.useState("en");
  const [manualDependencyInput, setManualDependencyInput] = React.useState("");
  const [manualDependencies, setManualDependencies] = React.useState([]);
  const [isCoursePredicting, setIsCoursePredicting] = React.useState(false);
  const [courseSuggestions, setCourseSuggestions] = React.useState([]);
  const [storedCourseSuggestions, setStoredCourseSuggestions] = React.useState(
    [],
  );
  const [rejectedCourseSuggestions, setRejectedCourseSuggestions] =
    React.useState([]);
  const [acceptedCourseSuggestions, setAcceptedCourseSuggestions] =
    React.useState([]);
  const [isLecturePredicting, setIsLecturePredicting] = React.useState(false);
  const [selectedCourseIdentity, setSelectedCourseIdentity] = React.useState("");
  const [lectureSuggestions, setLectureSuggestions] = React.useState([]);
  const [storedLectureSuggestions, setStoredLectureSuggestions] =
    React.useState([]);
  const [rejectedLectureSuggestions, setRejectedLectureSuggestions] =
    React.useState([]);
  const [acceptedLectureSuggestions, setAcceptedLectureSuggestions] =
    React.useState([]);
  const [isInstructorPredicting, setIsInstructorPredicting] =
    React.useState(false);
  const [instructorSuggestions, setInstructorSuggestions] = React.useState([]);
  const [storedInstructorSuggestions, setStoredInstructorSuggestions] =
    React.useState([]);
  const [rejectedInstructorSuggestions, setRejectedInstructorSuggestions] =
    React.useState([]);
  const [acceptedInstructorSuggestions, setAcceptedInstructorSuggestions] =
    React.useState([]);
  const [selectedImportantMessage, setSelectedImportantMessage] =
    React.useState("");
  const [isConceptualizing, setIsConceptualizing] = React.useState(false);
  const [isSavingConcept, setIsSavingConcept] = React.useState(false);
  const [isDeletingConcept, setIsDeletingConcept] = React.useState(false);
  const [importantMessageConcept, setImportantMessageConcept] =
    React.useState(null);
  const [importantMessageConceptDraft, setImportantMessageConceptDraft] =
    React.useState(() => normalizeConceptDraft(null));
  const [liveConceptStatus, setLiveConceptStatus] = React.useState("");
  const [activeLeftPanel, setActiveLeftPanel] = React.useState("migration");
  const [activePredictionTab, setActivePredictionTab] =
    React.useState("settings");
  const [telegramConfigStatus, setTelegramConfigStatus] = React.useState({
    configured: false,
    hasApiId: false,
    hasApiHash: false,
    hasStringSession: false,
    groupReference: "",
  });
  const [telegramAuthStage, setTelegramAuthStage] = React.useState("idle");
  const [telegramApiIdInput, setTelegramApiIdInput] = React.useState("");
  const [telegramApiHashInput, setTelegramApiHashInput] = React.useState("");
  const [telegramPhoneNumberInput, setTelegramPhoneNumberInput] =
    React.useState("");
  const [telegramPhoneCodeInput, setTelegramPhoneCodeInput] =
    React.useState("");
  const [telegramPasswordInput, setTelegramPasswordInput] = React.useState("");
  const storedGroupOptionsRef = React.useRef([]);
  const telegramShellRef = React.useRef(null);
  const telegramGridRef = React.useRef(null);
  const leftColumnRef = React.useRef(null);
  const predictionsColumnRef = React.useRef(null);
  const streamColumnRef = React.useRef(null);
  const gridDragStateRef = React.useRef(null);
  const [gridColumnWidths, setGridColumnWidths] = React.useState({
    left: 420,
    center: 420,
  });
  const [activeGridResizer, setActiveGridResizer] = React.useState("");

  const token = String(state?.token || "").trim();
  const storageCopy = STORAGE_COPY[storageLanguage] || STORAGE_COPY.en;
  const fallbackPlannerCourses = Array.isArray(memory?.courses)
    ? memory.courses
    : EMPTY_TELEGRAM_ARRAY;
  const fallbackImportantMessages = Array.isArray(memory?.importantMessages)
    ? memory.importantMessages
    : EMPTY_TELEGRAM_ARRAY;

  React.useEffect(() => {
    storedGroupOptionsRef.current = Array.isArray(storedGroupOptions)
      ? storedGroupOptions
      : [];
  }, [storedGroupOptions]);

  React.useEffect(() => {
    const fallbackCourseOptions =
      buildCourseSelectOptionsFromEntries(fallbackPlannerCourses);

    if (fallbackCourseOptions.length === 0) {
      return;
    }

    setCourses(fallbackPlannerCourses);
    setSelectedCourseIdentity((currentValue) => {
      const hasCurrentValue = fallbackCourseOptions.some(
        (courseOption) =>
          courseOption.identity === String(currentValue || "").trim(),
      );

      return hasCurrentValue
        ? currentValue
        : String(fallbackCourseOptions[0]?.identity || "");
    });
  }, [fallbackPlannerCourses]);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const trackedColumns = [
      leftColumnRef.current,
      predictionsColumnRef.current,
      streamColumnRef.current,
    ].filter(Boolean);

    if (trackedColumns.length === 0) {
      return undefined;
    }

    const previousWidths = new WeakMap();
    const settleTimers = new WeakMap();

    const markShrinking = (element) => {
      element.classList.add("is-shrinking");
      const existingTimer = settleTimers.get(element);

      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const nextTimer = window.setTimeout(() => {
        element.classList.remove("is-shrinking");
        settleTimers.delete(element);
      }, 180);

      settleTimers.set(element, nextTimer);
    };

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        const nextWidth = Number(entry.contentRect.width || 0);
        const previousWidth = previousWidths.get(element) ?? nextWidth;

        previousWidths.set(element, nextWidth);

        if (nextWidth < previousWidth - 1) {
          markShrinking(element);
          return;
        }

        if (nextWidth >= previousWidth) {
          const existingTimer = settleTimers.get(element);
          if (existingTimer) {
            window.clearTimeout(existingTimer);
            settleTimers.delete(element);
          }
          element.classList.remove("is-shrinking");
        }
      });
    });

    trackedColumns.forEach((element) => {
      previousWidths.set(element, element.getBoundingClientRect().width || 0);
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      trackedColumns.forEach((element) => {
        const timer = settleTimers.get(element);
        if (timer) {
          window.clearTimeout(timer);
        }
        element.classList.remove("is-shrinking");
      });
    };
  }, []);

  React.useEffect(() => {
    if (!telegramGridRef.current) {
      return;
    }

    const HANDLE_WIDTH = 12;
    const totalAvailableWidth = Math.max(
      0,
      Number(telegramGridRef.current.getBoundingClientRect().width || 0) -
        HANDLE_WIDTH * 2,
    );
    if (totalAvailableWidth <= 0) {
      return;
    }

    const equalWidth = Math.max(260, Math.floor(totalAvailableWidth / 3));
    setGridColumnWidths({
      left: equalWidth,
      center: equalWidth,
    });
  }, []);

  const applyGridDrag = React.useCallback((clientX) => {
    if (!telegramGridRef.current || !gridDragStateRef.current) {
      return;
    }

    const MIN_LEFT_WIDTH = 260;
    const MIN_CENTER_WIDTH = 320;
    const MIN_RIGHT_WIDTH = 0;
    const HANDLE_WIDTH = 12;

    const gridRect = telegramGridRef.current.getBoundingClientRect();
    const dragState = gridDragStateRef.current;
    const totalAvailableWidth = Math.max(0, gridRect.width - HANDLE_WIDTH * 2);

    const clamp = (value, minValue, maxValue) =>
      Math.max(minValue, Math.min(maxValue, value));

    setGridColumnWidths((currentValue) => {
      const currentLeft = Number(currentValue?.left || MIN_LEFT_WIDTH);
      const currentCenter = Number(currentValue?.center || MIN_CENTER_WIDTH);

      if (dragState.type === "left") {
        const rawLeft = clientX - gridRect.left - HANDLE_WIDTH / 2;
        const maxLeft = Math.max(
          MIN_LEFT_WIDTH,
          totalAvailableWidth - MIN_CENTER_WIDTH - MIN_RIGHT_WIDTH,
        );
        const nextLeft = clamp(rawLeft, MIN_LEFT_WIDTH, maxLeft);
        const maxCenter = Math.max(
          MIN_CENTER_WIDTH,
          totalAvailableWidth - nextLeft - MIN_RIGHT_WIDTH,
        );

        return {
          left: Math.round(nextLeft),
          center: Math.round(clamp(currentCenter, MIN_CENTER_WIDTH, maxCenter)),
        };
      }

      const rawCenterBoundary =
        clientX - gridRect.left - currentLeft - HANDLE_WIDTH - HANDLE_WIDTH / 2;
      const maxCenter = Math.max(
        MIN_CENTER_WIDTH,
        totalAvailableWidth - currentLeft - MIN_RIGHT_WIDTH,
      );

      return {
        left: Math.round(currentLeft),
        center: Math.round(
          clamp(rawCenterBoundary, MIN_CENTER_WIDTH, maxCenter),
        ),
      };
    });
  }, []);

  const handleGridResizerPointerDown = React.useCallback(
    (event, type) => {
      event.preventDefault();
      event.stopPropagation();

      gridDragStateRef.current = { type };
      setActiveGridResizer(type);

      const handlePointerMove = (moveEvent) => {
        applyGridDrag(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        gridDragStateRef.current = null;
        setActiveGridResizer("");
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [applyGridDrag],
  );

  const telegramGridStyle = React.useMemo(
    () => ({
      "--telegram-grid-left": `${Math.round(gridColumnWidths.left)}px`,
      "--telegram-grid-center": `${Math.round(gridColumnWidths.center)}px`,
    }),
    [gridColumnWidths.center, gridColumnWidths.left],
  );

  React.useEffect(() => {
    if (activeLeftPanel === "storage") {
      setActiveLeftPanel("migration");
    }
  }, [activeLeftPanel]);

  React.useEffect(() => {
    const activeStages = isLecturePredicting
      ? CONCEPT_PROGRESS_STAGES.lecture
      : isConceptualizing
        ? CONCEPT_PROGRESS_STAGES.important
        : [];

    if (activeStages.length === 0) {
      setLiveConceptStatus("");
      return;
    }

    let stageIndex = 0;
    setLiveConceptStatus(activeStages[stageIndex] || storageCopy.thinking);

    const timerId = window.setInterval(() => {
      stageIndex = (stageIndex + 1) % activeStages.length;
      setLiveConceptStatus(activeStages[stageIndex] || storageCopy.thinking);
    }, 3500);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isConceptualizing, isLecturePredicting, storageCopy.thinking]);

  const fetchTelegramGroups = React.useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/groups"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
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

      const nextOptions = Array.isArray(payload?.groups) ? payload.groups : [];
      const nextCourses =
        Array.isArray(payload?.courses) && payload.courses.length > 0
          ? payload.courses
          : null;
      const fallbackStoredOptions = storedGroupOptionsRef.current;
      const resolvedOptions =
        nextOptions.length > 0 ? nextOptions : fallbackStoredOptions;

      setGroupOptions(resolvedOptions);
      if (nextCourses) {
        setCourses(nextCourses);
        const nextCourseOptions = buildCourseSelectOptionsFromEntries(nextCourses);
        setSelectedCourseIdentity((currentValue) => {
          const hasCurrentValue = nextCourseOptions.some(
            (courseOption) =>
              courseOption.identity === String(currentValue || "").trim(),
          );

          return hasCurrentValue
            ? currentValue
            : String(nextCourseOptions[0]?.identity || "");
        });
      }
      setGroupInput((currentValue) => {
        const currentReference = String(currentValue || "").trim();
        const matchingOption = resolvedOptions.find(
          (group) =>
            String(group?.groupReference || "").trim() === currentReference,
        );
        const fallbackOption = matchingOption || resolvedOptions[0] || null;

        return fallbackOption
          ? String(fallbackOption.groupReference || currentValue)
          : currentValue;
      });
    } catch (nextError) {
      if (storedGroupOptionsRef.current.length > 0) {
        setGroupOptions(storedGroupOptionsRef.current);
      } else {
        setError(nextError?.message || "Unable to load Telegram groups.");
      }
    }
  }, [token]);

  const fetchStorageContext = React.useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setStorageDebugFeedback("");
      let payload = {};
      let nextGroups = [];
      let nextCourses = [];
      let nextImportantMessages = [];

      const response = await fetch(apiUrl("/api/telegram/storage/context"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      payload = await response.json().catch(() => ({}));

      if (response.ok) {
        nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
        nextCourses =
          Array.isArray(payload?.courses) && payload.courses.length > 0
            ? payload.courses
            : fallbackPlannerCourses;
        nextImportantMessages = Array.isArray(payload?.importantMessages)
          ? payload.importantMessages
          : fallbackImportantMessages;
        const debug = payload?.debug && typeof payload.debug === "object"
          ? payload.debug
          : null;
        if (debug) {
          setStorageDebugFeedback(
            `debug user=${String(debug?.userId || "-")} groups=${Number(debug?.storedGroupsCount || 0)} messages=${Number(debug?.storedMessagesCount || 0)} rawType=${String(debug?.rawGroupsType || "-")} rawGroups=${Number(debug?.rawGroupsCount || 0)} rawMessages=${Number(debug?.rawMessagesCount || 0)}`,
          );
        }
      } else {
        throw new Error(payload?.message || "Unable to load Telegram storage.");
      }

      setStoredGroupOptions(nextGroups);
      setCourses(nextCourses);
      setImportantMessages(nextImportantMessages);
      const nextCourseOptions = buildCourseSelectOptionsFromEntries(nextCourses);
      setSelectedStoredGroupReference((currentValue) => {
        if (String(currentValue || "").trim() === ALL_GROUPS_VALUE) {
          return ALL_GROUPS_VALUE;
        }

        const hasCurrentValue = nextGroups.some(
          (group) =>
            String(group?.groupReference || "").trim() ===
            String(currentValue || "").trim(),
        );

        return hasCurrentValue
          ? currentValue
          : String(nextGroups[0]?.groupReference || "");
      });
      setSelectedImportantMessage((currentValue) => {
        if (currentValue === ALL_IMPORTANT_MESSAGES_VALUE) {
          return currentValue;
        }

        const hasCurrentValue = nextImportantMessages.some(
          (message) => buildImportantMessageValue(message) === currentValue,
        );

        return hasCurrentValue
          ? currentValue
          : nextImportantMessages.length > 0
            ? ALL_IMPORTANT_MESSAGES_VALUE
            : "";
      });
      setSelectedCourseIdentity((currentValue) => {
        const hasCurrentValue = nextCourseOptions.some(
          (courseOption) =>
            courseOption.identity === String(currentValue || "").trim(),
        );

        return hasCurrentValue
          ? currentValue
          : String(nextCourseOptions[0]?.identity || "");
      });
    } catch (nextError) {
      setCourses(fallbackPlannerCourses);
      setImportantMessages(fallbackImportantMessages);
      setStorageFeedback(
        nextError?.message || "Unable to load Telegram storage context.",
      );
    }
  }, [fallbackImportantMessages, fallbackPlannerCourses, token]);

  const fetchTelegramConfig = React.useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram config.");
      }

      const nextReference = String(payload?.groupReference || "");
      setTelegramConfigStatus({
        configured: Boolean(payload?.configured),
        hasApiId: Boolean(payload?.hasApiId),
        hasApiHash: Boolean(payload?.hasApiHash),
        hasStringSession: Boolean(payload?.hasStringSession),
        groupReference: nextReference,
      });
      setTelegramAuthStage(payload?.hasStringSession ? "connected" : "idle");
      setStoreMessagesMode(
        payload?.historyStartDate || payload?.historyEndDate ? "interval" : "all",
      );
      setGroupReference(nextReference);
      setGroupInput(nextReference);
      setMigrationFromDate(
        formatDateInputValue(payload?.historyStartDate) ||
          getTodayDateInputValue(),
      );
      const nextHistoryEndDate = formatDateInputValue(payload?.historyEndDate);
      setMigrationToDate(nextHistoryEndDate);
      setIsMigrationToPresent(!nextHistoryEndDate);
      setMigrationGroupTitle(nextReference || "Telegram Migration");
    } catch (nextError) {
      setError(nextError?.message || "Unable to load Telegram configuration.");
      setTelegramConfigFeedback(
        nextError?.message || "Unable to load Telegram config status.",
      );
    }
  }, [token]);

  const startTelegramAuth = React.useCallback(async () => {
    if (!token) {
      return;
    }

    const apiId = String(telegramApiIdInput || "").trim();
    const apiHash = String(telegramApiHashInput || "").trim();
    const phoneNumber = String(telegramPhoneNumberInput || "").trim();

    if (!apiId || !apiHash || !phoneNumber) {
      setTelegramConfigFeedback(
        "Please fill Telegram API ID, API Hash, and phone number.",
      );
      return;
    }

    try {
      setTelegramAuthStage("idle");
      setTelegramPhoneCodeInput("");
      setTelegramPasswordInput("");
      const response = await fetch(apiUrl("/api/telegram/auth/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiId,
          apiHash,
          phoneNumber,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to start Telegram login.",
        );
      }

      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        payload?.message || "Telegram login code sent.",
      );
    } catch (nextError) {
      setTelegramAuthStage("idle");
      setTelegramConfigFeedback(
        nextError?.message || "Unable to start Telegram login.",
      );
    }
  }, [telegramApiHashInput, telegramApiIdInput, telegramPhoneNumberInput, token]);

  const verifyTelegramCode = React.useCallback(async () => {
    if (!token) {
      return;
    }

    const phoneCode = String(telegramPhoneCodeInput || "").trim();

    if (!phoneCode) {
      setTelegramConfigFeedback("Please enter the Telegram login code.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/telegram/auth/verify-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneCode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to verify Telegram code.",
        );
      }

      if (payload?.requiresPassword) {
        setTelegramAuthStage("password");
      } else {
        setTelegramAuthStage("connected");
        setTelegramConfigStatus((currentStatus) => ({
          ...currentStatus,
          configured: Boolean(payload?.configured),
          hasApiId: Boolean(payload?.hasApiId),
          hasApiHash: Boolean(payload?.hasApiHash),
          hasStringSession: Boolean(payload?.hasStringSession),
        }));
        fetchTelegramConfig();
      }

      setTelegramConfigFeedback(payload?.message || "Telegram code verified.");
      setTelegramPhoneCodeInput("");
    } catch (nextError) {
      setTelegramAuthStage("code");
      setTelegramConfigFeedback(
        nextError?.message || "Unable to verify Telegram code.",
      );
    }
  }, [fetchTelegramConfig, telegramPhoneCodeInput, token]);

  const verifyTelegramPassword = React.useCallback(async () => {
    if (!token) {
      return;
    }

    const password = String(telegramPasswordInput || "");

    if (!password.trim()) {
      setTelegramConfigFeedback(
        "Please enter the Telegram 2-step verification password.",
      );
      return;
    }

    try {
      const response = await fetch(
        apiUrl("/api/telegram/auth/verify-password"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to verify Telegram password.",
        );
      }

      setTelegramAuthStage("connected");
      setTelegramConfigStatus((currentStatus) => ({
        ...currentStatus,
        configured: Boolean(payload?.configured),
        hasApiId: Boolean(payload?.hasApiId),
        hasApiHash: Boolean(payload?.hasApiHash),
        hasStringSession: Boolean(payload?.hasStringSession),
      }));
      setTelegramConfigFeedback(
        payload?.message || "Telegram connected successfully.",
      );
      setTelegramPasswordInput("");
      fetchTelegramConfig();
    } catch (nextError) {
      setTelegramAuthStage("password");
      setTelegramConfigFeedback(
        nextError?.message || "Unable to verify Telegram password.",
      );
    }
  }, [fetchTelegramConfig, telegramPasswordInput, token]);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    fetchStorageContext();
    fetchTelegramGroups();
    fetchTelegramConfig();
  }, [token]);

  const loadStoredMessages = React.useCallback(
    async (nextLimit = TELEGRAM_MESSAGES_FETCH_LIMIT, scopeOverride = null) => {
      if (!token) {
        setIsLoading(false);
        setError("Telegram messages need a valid login token.");
        setMessages([]);
        return;
      }

      const nextScope = scopeOverride || activeStorageScope;
      const searchParams = new URLSearchParams();
      searchParams.set("limit", String(nextLimit));

      if (String(nextScope?.query || "").trim()) {
        searchParams.set("q", String(nextScope.query).trim());
      }

      if (nextScope?.allGroups) {
        searchParams.set("allGroups", "true");
      } else if (String(nextScope?.groupReference || "").trim()) {
        searchParams.set("group", String(nextScope.groupReference).trim());
      }
      if (String(nextScope?.start || "").trim()) {
        searchParams.set("start", String(nextScope.start).trim());
      }
      if (String(nextScope?.end || "").trim()) {
        searchParams.set("end", String(nextScope.end).trim());
      }

      setIsLoading(true);
      setError("");
      setStorageFeedback("");

      try {
        const response = await fetch(
          apiUrl(
            `/api/telegram/stored-group-messages?${searchParams.toString()}`,
          ),
          {
            method: "GET",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load stored Telegram messages.",
          );
        }

        const nextMessages = Array.isArray(payload?.messages)
          ? payload.messages
          : [];

        setMessages(nextMessages);
        setStreamTitle(String(payload?.group?.title || "Telegram messages"));
        setActiveStorageScope(nextScope);
      } catch (nextError) {
        setError(
          nextError?.message || "Unable to load stored Telegram messages.",
        );
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeStorageScope, token],
  );

  const handleSaveTelegramConfig = async () => {
    if (!token || isSaving) {
      return;
    }

    const nextGroupReference = String(groupInput || "").trim();
    const nextHistoryStartDate =
      storeMessagesMode === "all"
        ? ""
        : String(migrationFromDate || "").trim() || getTodayDateInputValue();
    const nextHistoryEndDate =
      storeMessagesMode === "all"
        ? ""
        : isMigrationToPresent
          ? ""
          : String(migrationToDate || "").trim();

    setIsSaving(true);
    setFeedback("");
    setTelegramImportSummary(null);

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupReference: nextGroupReference,
          syncEnabled: false,
          syncMode: "one-time",
          historyStartDate: nextHistoryStartDate,
          historyEndDate: nextHistoryEndDate,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.error?.message ||
            "Unable to save Telegram settings.",
        );
      }

      const nextReference = String(payload?.groupReference || "");
      publishFeedback(payload?.message || "");
      setTelegramImportSummary(
        Boolean(payload?.importStarted ?? payload?.syncStarted)
          ? {
              started: Boolean(payload?.importStarted ?? payload?.syncStarted),
              succeeded: Boolean(payload?.importSucceeded ?? payload?.syncSucceeded),
              reason: String(payload?.importReason || payload?.syncReason || "").trim(),
              importedCount: Number(payload?.importedCount || 0),
              scannedCount: Number(payload?.scannedCount || 0),
              storedCount: Number(payload?.storedCount || 0),
            }
          : null,
      );
      setGroupReference(nextReference);
      setStoreMessagesMode(
        payload?.historyStartDate || payload?.historyEndDate ? "interval" : "all",
      );
      setGroupInput(nextReference);
      setMigrationFromDate(
        formatDateInputValue(payload?.historyStartDate) ||
          getTodayDateInputValue(),
      );
      const savedHistoryEndDate = formatDateInputValue(payload?.historyEndDate);
      setMigrationToDate(savedHistoryEndDate);
      setIsMigrationToPresent(!savedHistoryEndDate);
      setMigrationGroupTitle(nextReference || "Telegram Migration");
      fetchStorageContext();
      fetchTelegramGroups();
      fetchTelegramConfig();
    } catch (nextError) {
      publishFeedback(
        nextError?.message ||
          nextError?.error?.message ||
          "Unable to save Telegram settings.",
      );
      setTelegramImportSummary(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStorageSearch = () => {
    const nextScope = {
      query: storageSearchQuery,
      allGroups: isSearchingAllGroups,
      groupReference: selectedStoredGroupScope,
      start: storageRangeStartDate,
      end: storageRangeEndDate,
    };

    loadStoredMessages(TELEGRAM_MESSAGES_FETCH_LIMIT, nextScope);
  };

  const handleAddDependency = () => {
    const nextDependency = String(manualDependencyInput || "").trim();

    if (!nextDependency) {
      return;
    }

    setManualDependencies((currentValue) =>
      currentValue.includes(nextDependency)
        ? currentValue
        : [...currentValue, nextDependency],
    );
    setManualDependencyInput("");
  };

  const handleToggleDependency = (dependencyKey) => {
    setSelectedDependencyKeys((currentValue) => {
      return currentValue.includes(dependencyKey)
        ? currentValue.filter((value) => value !== dependencyKey)
        : [...currentValue, dependencyKey];
    });
  };

  const handleToggleImportantMessage = async (message) => {
    const groupReferenceValue = String(message?.groupReference || "").trim();
    const messageId = Number(message?.id || 0);

    if (!token || !groupReferenceValue || !messageId) {
      return;
    }

    try {
      const response = await fetch(
        apiUrl(
          `/api/telegram/stored-messages/${encodeURIComponent(
            groupReferenceValue,
          )}/${messageId}/pin`,
        ),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update message pin.");
      }

      setMessages((currentValue) =>
        currentValue.map((currentMessage) =>
          Number(currentMessage?.id || 0) === messageId &&
          String(currentMessage?.groupReference || "").trim() ===
            groupReferenceValue
            ? {
                ...currentMessage,
                isPinned: Boolean(payload?.isPinned),
                pinnedAt: payload?.pinnedAt || null,
              }
            : currentMessage,
        ),
      );
      setStorageFeedback(payload?.message || "");
      fetchStorageContext();
    } catch (nextError) {
      setStorageFeedback(nextError?.message || "Unable to update message pin.");
    }
  };

  const handleOpenLectureReferenceMessages = React.useCallback((lecture) => {
    const referenceMessages = Array.isArray(lecture?.referenceMessages)
      ? lecture.referenceMessages
      : [];

    if (referenceMessages.length === 0) {
      setStorageFeedback("No reference messages were attached to this prediction.");
      return;
    }

    setMessages(referenceMessages);
    setStreamTitle(
      `Reference messages for ${String(
        lecture?.lectureName || "predicted lecture",
      )}`,
    );
    setError("");
    setStorageFeedback("");
  }, []);

  const handlePredictCourses = async () => {
    if (!token) {
      return;
    }

    setIsCoursePredicting(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/course-suggestions"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aiProvider: selectedAiProvider,
            allGroups: isSearchingAllGroups,
            groupReference: selectedStoredGroupScope,
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to generate course conceptualizations.",
        );
      }

      const nextSuggestions = Array.isArray(payload?.newSuggestions)
        ? payload.newSuggestions
        : Array.isArray(payload?.suggestions)
          ? payload.suggestions
          : [];

      setCourseSuggestions(nextSuggestions);
      if (nextSuggestions.length > 0) {
        setSelectedCourseIdentity(
          buildCourseComponentIdentity(nextSuggestions[0]?.coursePayload || {}),
        );
      }
      setStorageFeedback(storageCopy.builtCourses(nextSuggestions.length));
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to generate course conceptualizations.",
      );
    } finally {
      setIsCoursePredicting(false);
    }
  };

  const handlePredictLectures = async () => {
    const nextCourseIdentity = String(selectedCourseIdentity || "").trim();
    const selectedCourseRecord = (Array.isArray(courseSelectOptions)
      ? courseSelectOptions
      : []
    ).find((course) => course.identity === nextCourseIdentity);
    const nextCourseName = normalizeCourseField(selectedCourseRecord?.course_name);
    const nextCourseComponent = normalizeCourseField(
      selectedCourseRecord?.course_component,
    );
    const nextCourseLabel =
      selectedCourseRecord?.label ||
      buildCourseComponentLabel({
        course_name: nextCourseName,
        course_component: nextCourseComponent,
      });

    if (!token || !nextCourseIdentity || !nextCourseName) {
      setStorageFeedback(storageCopy.chooseCourse);
      return;
    }

    setIsLecturePredicting(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/lecture-suggestions"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...buildLecturePredictionScopeBody(),
            groupReferences: selectedStoredGroupScope
              ? [selectedStoredGroupScope]
              : [],
            chatLanguage: conceptualizationLanguage,
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to generate lecture conceptualizations.",
        );
      }

      const nextLectures = Array.isArray(payload?.lectures)
        ? payload.lectures
        : [];

      setLectureSuggestions([]);
      setStoredLectureSuggestions(nextLectures);
      setStorageFeedback(
        storageCopy.builtLectures(nextLectures.length, nextCourseLabel),
      );
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to generate lecture conceptualizations.",
      );
    } finally {
      setIsLecturePredicting(false);
    }
  };

  const handleConceptualizeImportantMessage = async () => {
    if (!token || !selectedImportantMessage) {
      setStorageFeedback(storageCopy.chooseImportant);
      return;
    }

    if (selectedImportantMessage === ALL_IMPORTANT_MESSAGES_VALUE) {
      setStorageFeedback(storageCopy.chooseSingleImportant);
      return;
    }

    const [selectedGroupReference, selectedMessageId] = String(
      selectedImportantMessage || "",
    ).split("::");

    setIsConceptualizing(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/important-message-concept"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aiProvider: selectedAiProvider,
            groupReference: selectedGroupReference,
            messageId: Number(selectedMessageId || 0),
            extraDependencies: manualDependencies,
            chatLanguage: conceptualizationLanguage,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to conceptualize the important message.",
        );
      }

      setImportantMessageConcept({
        summary: String(payload?.summary || "").trim(),
        keyIdeas: Array.isArray(payload?.keyIdeas) ? payload.keyIdeas : [],
        academicRelevance: String(payload?.academicRelevance || "").trim(),
        nextAction: String(payload?.nextAction || "").trim(),
      });
      setStorageFeedback(storageCopy.conceptualized);
      fetchStorageContext();
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to conceptualize the important message.",
      );
    } finally {
      setIsConceptualizing(false);
    }
  };

  const handleSaveImportantMessageConcept = async () => {
    if (
      !token ||
      !selectedImportantMessage ||
      selectedImportantMessage === ALL_IMPORTANT_MESSAGES_VALUE
    ) {
      setStorageFeedback(storageCopy.chooseSingleImportant);
      return;
    }

    const [selectedGroupReference, selectedMessageId] = String(
      selectedImportantMessage || "",
    ).split("::");

    setIsSavingConcept(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/important-message-concept"),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            groupReference: selectedGroupReference,
            messageId: Number(selectedMessageId || 0),
            summary: importantMessageConceptDraft.summary,
            keyIdeas: String(importantMessageConceptDraft.keyIdeasText || "")
              .split("\n")
              .map((entry) => String(entry || "").trim())
              .filter(Boolean),
            academicRelevance: importantMessageConceptDraft.academicRelevance,
            nextAction: importantMessageConceptDraft.nextAction,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to save the important message concept.",
        );
      }

      const nextConcept = {
        summary: String(payload?.summary || "").trim(),
        keyIdeas: Array.isArray(payload?.keyIdeas) ? payload.keyIdeas : [],
        academicRelevance: String(payload?.academicRelevance || "").trim(),
        nextAction: String(payload?.nextAction || "").trim(),
      };

      setImportantMessageConcept(nextConcept);
      setImportantMessageConceptDraft(normalizeConceptDraft(nextConcept));
      setStorageFeedback(storageCopy.conceptSaved);
      fetchStorageContext();
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to save the important message concept.",
      );
    } finally {
      setIsSavingConcept(false);
    }
  };

  const handleDeleteImportantMessageConcept = async () => {
    if (
      !token ||
      !selectedImportantMessage ||
      selectedImportantMessage === ALL_IMPORTANT_MESSAGES_VALUE
    ) {
      setStorageFeedback(storageCopy.chooseSingleImportant);
      return;
    }

    const [selectedGroupReference, selectedMessageId] = String(
      selectedImportantMessage || "",
    ).split("::");

    setIsDeletingConcept(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/important-message-concept"),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            groupReference: selectedGroupReference,
            messageId: Number(selectedMessageId || 0),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete the important message concept.",
        );
      }

      setImportantMessageConcept(null);
      setImportantMessageConceptDraft(normalizeConceptDraft(null));
      setStorageFeedback(storageCopy.conceptDeleted);
      fetchStorageContext();
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to delete the important message concept.",
      );
    } finally {
      setIsDeletingConcept(false);
    }
  };

  const handlePredictInstructors = async () => {
    if (!token) {
      return;
    }

    setIsInstructorPredicting(true);
    setStorageFeedback("");

    try {
      const response = await fetch(
        apiUrl("/api/telegram/ai/instructor-suggestions"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            aiProvider: selectedAiProvider,
            groupReferences: selectedStoredGroupScope
              ? [selectedStoredGroupScope]
              : [],
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Unable to generate instructor conceptualizations.",
        );
      }

      const nextInstructors = Array.isArray(payload?.instructors)
        ? payload.instructors
        : [];

      setInstructorSuggestions(nextInstructors);
      setStorageFeedback(storageCopy.builtInstructors(nextInstructors.length));
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message ||
          "Unable to generate instructor conceptualizations.",
      );
    } finally {
      setIsInstructorPredicting(false);
    }
  };

  const predictionScope = React.useMemo(
    () => ({
      allGroups: isSearchingAllGroups,
      groupReference: selectedStoredGroupScope,
      groupTitle: selectedStoredGroupScope
        ? formatTelegramGroupOptionLabel(
            storedGroupOptions.find(
              (group) =>
                String(group?.groupReference || "").trim() ===
                selectedStoredGroupScope,
            ) || {
              groupReference: selectedStoredGroupScope,
              title: selectedStoredGroupScope,
            },
          )
        : "Telegram messages",
    }),
    [isSearchingAllGroups, selectedStoredGroupScope, storedGroupOptions],
  );
  const selectedAiProvider = React.useMemo(() => {
    const normalizedProvider = String(state?.aiProvider || "")
      .trim()
      .toLowerCase();

    return ["openai", "groq", "gemini", "kimi"].includes(normalizedProvider)
      ? normalizedProvider
      : "openai";
  }, [state?.aiProvider]);

  const buildPredictionScopeBody = () => ({
    aiProvider: selectedAiProvider,
    allGroups: predictionScope.allGroups,
    groupReference: predictionScope.groupReference,
    groupTitle: predictionScope.groupTitle,
  });

  const buildLecturePredictionScopeBody = () => {
    const selectedCourseRecord = (Array.isArray(courseSelectOptions)
      ? courseSelectOptions
      : []
    ).find(
      (course) => course.identity === String(selectedCourseIdentity || "").trim(),
    );

    return {
      ...buildPredictionScopeBody(),
      courseIdentity: String(selectedCourseRecord?.identity || ""),
      courseName: String(selectedCourseRecord?.course_name || ""),
      courseComponent: String(selectedCourseRecord?.course_component || ""),
    };
  };

  const buildLectureBucketScopeBody = () => ({
    ...buildLecturePredictionScopeBody(),
    acrossAllGroups: true,
  });

  const buildPredictionScopeParams = React.useCallback(() => {
    const params = new URLSearchParams();
    if (predictionScope.allGroups) {
      params.set("allGroups", "true");
    } else if (predictionScope.groupReference) {
      params.set("groupReference", predictionScope.groupReference);
    }
    return params;
  }, [predictionScope]);

  const buildLecturePredictionScopeParams = React.useCallback(() => {
    const params = new URLSearchParams();
    params.set("acrossAllGroups", "true");
    const selectedCourseRecord = (Array.isArray(courseSelectOptions)
      ? courseSelectOptions
      : []
    ).find((course) => course.identity === String(selectedCourseIdentity || "").trim());

    if (selectedCourseRecord?.identity) {
      params.set("courseIdentity", String(selectedCourseRecord.identity));
    }
    if (selectedCourseRecord?.course_name) {
      params.set("courseName", String(selectedCourseRecord.course_name));
    }
    if (selectedCourseRecord?.course_component) {
      params.set("courseComponent", String(selectedCourseRecord.course_component));
    }

    return params;
  }, [
    selectedCourseIdentity,
    courseSuggestions,
    courses,
  ]);

  const handleDeleteStoredCoursePredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(`/api/telegram/ai/course-suggestions?${params.toString()}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setStoredCourseSuggestions([]);
    }
  };

  const handleClearRejectedCoursePredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/course-suggestions/rejected?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setRejectedCourseSuggestions([]);
    }
  };

  const handleClearAcceptedCoursePredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/course-suggestions/accepted?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setAcceptedCourseSuggestions([]);
    }
  };

  const handleRejectCoursePrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/course-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildLecturePredictionScopeBody(),
          decision: "rejected",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setStoredCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setAcceptedCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setRejectedCourseSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      fetchCoursePredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to reject course prediction.",
      );
    }
  };

  const handleAcceptCoursePrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/course-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildLecturePredictionScopeBody(),
          decision: "accepted",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setStoredCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setRejectedCourseSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      setAcceptedCourseSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getCourseSuggestionIdentity,
        ),
      );
      fetchCoursePredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to accept course prediction.",
      );
    }
  };

  const handleDeleteStoredLecturePredictions = async () => {
    if (!token) return;
    const params = buildLecturePredictionScopeParams();
    const response = await fetch(
      apiUrl(`/api/telegram/ai/lecture-suggestions?${params.toString()}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setStoredLectureSuggestions(
        Array.isArray(payload?.lectures) ? payload.lectures : [],
      );
    }
  };

  const handleDeleteStoredLecturePrediction = async (suggestion) => {
    if (!token) return;
    const params = buildLecturePredictionScopeParams();
    params.set(
      "suggestionKey",
      String(
        suggestion?.suggestionKey ||
          suggestion?.duplicateKey ||
          suggestion?.lectureName ||
          "",
      ),
    );
    const response = await fetch(
      apiUrl(`/api/telegram/ai/lecture-suggestions?${params.toString()}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setStoredLectureSuggestions(
        Array.isArray(payload?.lectures) ? payload.lectures : [],
      );
    }
  };

  const handleClearRejectedLecturePredictions = async () => {
    if (!token) return;
    const params = buildLecturePredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/lecture-suggestions/rejected?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setRejectedLectureSuggestions([]);
    }
  };

  const handleClearAcceptedLecturePredictions = async () => {
    if (!token) return;
    const params = buildLecturePredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/lecture-suggestions/accepted?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setAcceptedLectureSuggestions([]);
    }
  };

  const handleRejectLecturePrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/lecture-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildLectureBucketScopeBody(),
          decision: "rejected",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setStoredLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setAcceptedLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setRejectedLectureSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      fetchLecturePredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to reject lecture prediction.",
      );
    }
  };

  const handleAcceptLecturePrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/lecture-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildLectureBucketScopeBody(),
          decision: "accepted",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setStoredLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setRejectedLectureSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      setAcceptedLectureSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getLectureSuggestionIdentity,
        ),
      );
      fetchLecturePredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to accept lecture prediction.",
      );
    }
  };

  const handleDeleteStoredInstructorPredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(`/api/telegram/ai/instructor-suggestions?${params.toString()}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setStoredInstructorSuggestions([]);
    }
  };

  const handleClearRejectedInstructorPredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/instructor-suggestions/rejected?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setRejectedInstructorSuggestions([]);
    }
  };

  const handleClearAcceptedInstructorPredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(
        `/api/telegram/ai/instructor-suggestions/accepted?${params.toString()}`,
      ),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setAcceptedInstructorSuggestions([]);
    }
  };

  const handleRejectInstructorPrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/instructor-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildPredictionScopeBody(),
          decision: "rejected",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setStoredInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setAcceptedInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setRejectedInstructorSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      fetchInstructorPredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to reject instructor prediction.",
      );
    }
  };

  const handleAcceptInstructorPrediction = async (suggestion) => {
    if (!token) return;
    const response = await fetch(
      apiUrl("/api/telegram/ai/instructor-suggestions/feedback"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...buildPredictionScopeBody(),
          decision: "accepted",
          suggestion,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setStoredInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setRejectedInstructorSuggestions((currentValue) =>
        removeSuggestionFromList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      setAcceptedInstructorSuggestions((currentValue) =>
        prependSuggestionToList(
          currentValue,
          suggestion,
          getInstructorSuggestionIdentity,
        ),
      );
      fetchInstructorPredictionBuckets();
    } else {
      setStorageFeedback(
        payload?.message || "Unable to accept instructor prediction.",
      );
    }
  };

  const fetchCoursePredictionBuckets = React.useCallback(async () => {
    if (!token) {
      return;
    }

    const params = new URLSearchParams();
    if (predictionScope.allGroups) {
      params.set("allGroups", "true");
    } else if (predictionScope.groupReference) {
      params.set("groupReference", predictionScope.groupReference);
    } else {
      return;
    }

    try {
      const [savedResponse, rejectedResponse, acceptedResponse] =
        await Promise.all([
          fetch(
            apiUrl(`/api/telegram/ai/course-suggestions?${params.toString()}`),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/course-suggestions/rejected?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/course-suggestions/accepted?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
      const savedPayload = await savedResponse.json().catch(() => ({}));
      const rejectedPayload = await rejectedResponse.json().catch(() => ({}));
      const acceptedPayload = await acceptedResponse.json().catch(() => ({}));
      if (savedResponse.ok) {
        setStoredCourseSuggestions(
          Array.isArray(savedPayload?.suggestions)
            ? savedPayload.suggestions
            : [],
        );
      }
      if (rejectedResponse.ok) {
        setRejectedCourseSuggestions(
          Array.isArray(rejectedPayload?.suggestions)
            ? rejectedPayload.suggestions
            : [],
        );
      } else if (rejectedResponse.status === 404) {
        setRejectedCourseSuggestions([]);
      }
      if (acceptedResponse.ok) {
        setAcceptedCourseSuggestions(
          Array.isArray(acceptedPayload?.suggestions)
            ? acceptedPayload.suggestions
            : [],
        );
      } else if (acceptedResponse.status === 404) {
        setAcceptedCourseSuggestions([]);
      }
    } catch {}
  }, [predictionScope, token]);

  const fetchLecturePredictionBuckets = React.useCallback(async () => {
    if (!token) {
      return;
    }
    const params = buildLecturePredictionScopeParams();
    if (!params.get("courseIdentity") && !params.get("courseName")) {
      return;
    }
    try {
      const [savedResponse, rejectedResponse, acceptedResponse] =
        await Promise.all([
          fetch(
            apiUrl(`/api/telegram/ai/lecture-suggestions?${params.toString()}`),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/lecture-suggestions/rejected?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/lecture-suggestions/accepted?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
      const savedPayload = await savedResponse.json().catch(() => ({}));
      const rejectedPayload = await rejectedResponse.json().catch(() => ({}));
      const acceptedPayload = await acceptedResponse.json().catch(() => ({}));
      if (savedResponse.ok) {
        setStoredLectureSuggestions(
          Array.isArray(savedPayload?.lectures) ? savedPayload.lectures : [],
        );
      }
      if (rejectedResponse.ok) {
        setRejectedLectureSuggestions(
          Array.isArray(rejectedPayload?.lectures)
            ? rejectedPayload.lectures
            : [],
        );
      } else if (rejectedResponse.status === 404) {
        setRejectedLectureSuggestions([]);
      }
      if (acceptedResponse.ok) {
        setAcceptedLectureSuggestions(
          Array.isArray(acceptedPayload?.lectures)
            ? acceptedPayload.lectures
            : [],
        );
      } else if (acceptedResponse.status === 404) {
        setAcceptedLectureSuggestions([]);
      }
    } catch {}
  }, [buildLecturePredictionScopeParams, token]);

  const fetchInstructorPredictionBuckets = React.useCallback(async () => {
    if (!token) {
      return;
    }
    const params = new URLSearchParams();
    if (predictionScope.allGroups) {
      params.set("allGroups", "true");
    } else if (predictionScope.groupReference) {
      params.set("groupReference", predictionScope.groupReference);
    } else {
      return;
    }
    try {
      const [savedResponse, rejectedResponse, acceptedResponse] =
        await Promise.all([
          fetch(
            apiUrl(
              `/api/telegram/ai/instructor-suggestions?${params.toString()}`,
            ),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/instructor-suggestions/rejected?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetch(
            apiUrl(
              `/api/telegram/ai/instructor-suggestions/accepted?${params.toString()}`,
            ),
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
      const savedPayload = await savedResponse.json().catch(() => ({}));
      const rejectedPayload = await rejectedResponse.json().catch(() => ({}));
      const acceptedPayload = await acceptedResponse.json().catch(() => ({}));
      if (savedResponse.ok) {
        setStoredInstructorSuggestions(
          Array.isArray(savedPayload?.instructors)
            ? savedPayload.instructors
            : [],
        );
      }
      if (rejectedResponse.ok) {
        setRejectedInstructorSuggestions(
          Array.isArray(rejectedPayload?.instructors)
            ? rejectedPayload.instructors
            : [],
        );
      } else if (rejectedResponse.status === 404) {
        setRejectedInstructorSuggestions([]);
      }
      if (acceptedResponse.ok) {
        setAcceptedInstructorSuggestions(
          Array.isArray(acceptedPayload?.instructors)
            ? acceptedPayload.instructors
            : [],
        );
      } else if (acceptedResponse.status === 404) {
        setAcceptedInstructorSuggestions([]);
      }
    } catch {}
  }, [predictionScope, token]);

  React.useEffect(() => {
    fetchLecturePredictionBuckets();
    fetchInstructorPredictionBuckets();
  }, [
    fetchLecturePredictionBuckets,
    fetchInstructorPredictionBuckets,
  ]);

  const filteredMessages = React.useMemo(() => {
    if (activeMessageTypeTab === "all") {
      return Array.isArray(messages) ? messages : [];
    }
    return (Array.isArray(messages) ? messages : []).filter((message) => {
      const kind = String(message?.attachmentKind || "").toLowerCase();
      if (activeMessageTypeTab === "texts") {
        return !kind || kind === "text";
      }
      if (activeMessageTypeTab === "photos") {
        return kind === "photo";
      }
      if (activeMessageTypeTab === "videos") {
        return kind === "video";
      }
      if (activeMessageTypeTab === "audios") {
        return kind === "audio";
      }
      if (activeMessageTypeTab === "documents") {
        return kind === "document" || kind === "pdf";
      }
      return true;
    });
  }, [activeMessageTypeTab, messages]);

  const messageTypeCounts = React.useMemo(() => {
    const source = Array.isArray(messages) ? messages : [];
    const counts = {
      all: source.length,
      texts: 0,
      photos: 0,
      videos: 0,
      audios: 0,
      documents: 0,
    };

    source.forEach((message) => {
      const kind = String(message?.attachmentKind || "").toLowerCase();
      if (!kind || kind === "text") {
        counts.texts += 1;
      } else if (kind === "photo") {
        counts.photos += 1;
      } else if (kind === "video") {
        counts.videos += 1;
      } else if (kind === "audio") {
        counts.audios += 1;
      } else if (kind === "document" || kind === "pdf") {
        counts.documents += 1;
      }
    });

    return counts;
  }, [messages]);

  const groupedMessages = React.useMemo(
    () => groupTelegramMessagesByDay(filteredMessages),
    [filteredMessages],
  );

  const groupMembers = React.useMemo(() => {
    const memberMap = new Map();
    (Array.isArray(filteredMessages) ? filteredMessages : []).forEach((message) => {
      const sender = String(message?.sender || "Unknown").trim() || "Unknown";
      const key = sender.toLowerCase();
      const existing = memberMap.get(key) || {
        sender,
        role: classifyTelegramMemberRole(sender),
        messagesCount: 0,
      };
      existing.messagesCount += 1;
      memberMap.set(key, existing);
    });

    return Array.from(memberMap.values()).sort(
      (left, right) =>
        Number(right?.messagesCount || 0) - Number(left?.messagesCount || 0) ||
        String(left?.sender || "").localeCompare(String(right?.sender || "")),
    );
  }, [filteredMessages]);

  React.useEffect(() => {
    const photoMessages = (Array.isArray(messages) ? messages : []).filter(
      (message) => String(message?.attachmentKind || "").toLowerCase() === "photo",
    );
    if (!token || photoMessages.length === 0) {
      return undefined;
    }

    let isCancelled = false;
    const createdUrls = [];

    const run = async () => {
      const nextEntries = {};
      await Promise.all(
        photoMessages.map(async (message) => {
          const groupReference = String(message?.groupReference || "").trim();
          const messageId = Number(message?.id || 0);
          if (!groupReference || !messageId) {
            return;
          }
          const key = `${groupReference}::${messageId}`;
          if (photoPreviewUrls[key]) {
            return;
          }
          const inlinePhotoDataUrl = String(message?.photoDataUrl || "").trim();
          if (inlinePhotoDataUrl) {
            nextEntries[key] = inlinePhotoDataUrl;
            return;
          }

          try {
            const params = new URLSearchParams({
              groupReference,
              messageId: String(messageId),
            });
            const response = await fetch(
              apiUrl(`/api/telegram/stored-media?${params.toString()}`),
              {
                method: "GET",
                mode: "cors",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (!response.ok) {
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            nextEntries[key] = url;
          } catch {}
        }),
      );

      if (isCancelled || Object.keys(nextEntries).length === 0) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setPhotoPreviewUrls((current) => ({
        ...current,
        ...nextEntries,
      }));
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [messages, photoPreviewUrls, token]);

  React.useEffect(() => {
    return () => {
      Object.values(photoPreviewUrls).forEach((url) => {
        if (typeof url === "string" && url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [photoPreviewUrls]);

  const migrationOptionGroups = React.useMemo(
    () =>
      getTelegramGroupOptionGroups(
        Array.isArray(groupOptions) ? groupOptions : [],
        groupInput || groupReference,
      ),
    [groupInput, groupOptions, groupReference],
  );

  const selectedImportantMessageRecord = React.useMemo(
    () =>
      importantMessages.find(
        (message) =>
          buildImportantMessageValue(message) === selectedImportantMessage,
      ) || null,
    [importantMessages, selectedImportantMessage],
  );

  const isAllImportantMessagesSelected =
    selectedImportantMessage === ALL_IMPORTANT_MESSAGES_VALUE;

  const pinnedMessagesTableRows = React.useMemo(
    () =>
      (Array.isArray(importantMessages) ? importantMessages : []).map(
        (message) => {
          const concept =
            parseStoredConceptSummary(message?.aiConceptSummary) || {};
          const targetCourseName = String(
            concept?.targetCourseName || concept?.courseName || "",
          ).trim();
          const targetInstructorName = String(
            concept?.targetInstructorName || concept?.instructorName || "",
          ).trim();
          const targetCourseComponent = String(
            concept?.targetCourseComponent || concept?.courseComponent || "",
          ).trim();
          const targetLectureName = String(
            concept?.targetLectureName || concept?.lectureName || "",
          ).trim();
          const conceptSummary = String(concept?.summary || "").trim();
          const goal = String(
            concept?.goal || concept?.nextAction || "",
          ).trim();

          return {
            id: Number(message?.id || 0),
            groupReference: String(message?.groupReference || "").trim(),
            pinnedMessage: String(message?.text || "").trim(),
            groupName: String(
              message?.groupTitle || message?.groupReference || "",
            ).trim(),
            targetCourseName,
            targetInstructorName,
            targetCourseComponent,
            targetLectureName,
            conceptSummary,
            goal,
          };
        },
      ),
    [importantMessages],
  );

  const savedConcept = React.useMemo(
    () =>
      parseStoredConceptSummary(
        selectedImportantMessageRecord?.aiConceptSummary,
      ),
    [selectedImportantMessageRecord],
  );

  React.useEffect(() => {
    if (isAllImportantMessagesSelected) {
      setImportantMessageConceptDraft(normalizeConceptDraft(null));
      return;
    }

    setImportantMessageConceptDraft(
      normalizeConceptDraft(importantMessageConcept || savedConcept),
    );
  }, [importantMessageConcept, isAllImportantMessagesSelected, savedConcept]);

  React.useEffect(() => {
    setImportantMessageConcept(null);
  }, [selectedImportantMessage]);

  const courseSelectOptions = React.useMemo(() => {
    const optionMap = new Map(
      buildCourseSelectOptionsFromEntries(courses).map((courseOption) => [
        courseOption.identity,
        courseOption,
      ]),
    );

    (Array.isArray(courseSuggestions) ? courseSuggestions : []).forEach(
      (suggestion) => {
        const payload = suggestion?.coursePayload || {};
        const identity = buildCourseComponentIdentity(payload);
        const label = buildCourseComponentLabel(payload);

        if (identity && label && !optionMap.has(identity)) {
          optionMap.set(identity, {
            identity,
            label,
            course_name: normalizeCourseField(payload?.course_name),
            course_component: normalizeCourseField(payload?.course_component),
          });
        }
      },
    );

    return Array.from(optionMap.values());
  }, [courseSuggestions, courses]);

  const visibleStoredCourseSuggestions = React.useMemo(() => {
    const predictedKeys = new Set(
      (Array.isArray(courseSuggestions) ? courseSuggestions : [])
        .map((suggestion) =>
          String(
            suggestion?.suggestionKey ||
              suggestion?.duplicateKey ||
              suggestion?.coursePayload?.course_name ||
              "",
          ).trim(),
        )
        .filter(Boolean),
    );

    return (
      Array.isArray(storedCourseSuggestions) ? storedCourseSuggestions : []
    ).filter((suggestion) => {
      const suggestionKey = String(
        suggestion?.suggestionKey ||
          suggestion?.duplicateKey ||
          suggestion?.coursePayload?.course_name ||
          "",
      ).trim();
      return !suggestionKey || !predictedKeys.has(suggestionKey);
    });
  }, [courseSuggestions, storedCourseSuggestions]);

  const visibleStoredLectureSuggestions = React.useMemo(() => {
    const predictedKeys = new Set(
      (Array.isArray(lectureSuggestions) ? lectureSuggestions : [])
        .map((lecture) =>
          String(
            lecture?.suggestionKey ||
              lecture?.duplicateKey ||
              lecture?.lectureName ||
              "",
          ).trim(),
        )
        .filter(Boolean),
    );

    return (
      Array.isArray(storedLectureSuggestions) ? storedLectureSuggestions : []
    ).filter((lecture) => {
      const suggestionKey = String(
        lecture?.suggestionKey ||
          lecture?.duplicateKey ||
          lecture?.lectureName ||
          "",
      ).trim();
      return !suggestionKey || !predictedKeys.has(suggestionKey);
    });
  }, [lectureSuggestions, storedLectureSuggestions]);

  const displayedLectureSuggestions = lectureSuggestions;

  const displayedStoredLectureSuggestions = visibleStoredLectureSuggestions;

  const displayedAcceptedLectureSuggestions = acceptedLectureSuggestions;

  const displayedRejectedLectureSuggestions = rejectedLectureSuggestions;

  const visibleStoredInstructorSuggestions = React.useMemo(() => {
    const predictedKeys = new Set(
      (Array.isArray(instructorSuggestions) ? instructorSuggestions : [])
        .map((instructor) =>
          String(
            instructor?.suggestionKey ||
              instructor?.duplicateKey ||
              instructor?.name ||
              "",
          ).trim(),
        )
        .filter(Boolean),
    );

    return (
      Array.isArray(storedInstructorSuggestions)
        ? storedInstructorSuggestions
        : []
    ).filter((instructor) => {
      const suggestionKey = String(
        instructor?.suggestionKey ||
          instructor?.duplicateKey ||
          instructor?.name ||
          "",
      ).trim();
      return !suggestionKey || !predictedKeys.has(suggestionKey);
    });
  }, [instructorSuggestions, storedInstructorSuggestions]);

  const selectedOptionalDependencies = React.useMemo(
    () =>
      DEPENDENCY_OPTIONS.filter((dependency) =>
        selectedDependencyKeys.includes(dependency.key),
      ),
    [selectedDependencyKeys],
  );

  const availableDependencyOptions = React.useMemo(
    () =>
      DEPENDENCY_OPTIONS.filter(
        (dependency) => !selectedDependencyKeys.includes(dependency.key),
      ),
    [selectedDependencyKeys],
  );

  const loggedInUserObject = React.useMemo(() => {
    if (isPlainObjectRecord(state?.user)) {
      return state.user;
    }

    if (isPlainObjectRecord(state)) {
      const { token: _token, ...stateWithoutToken } = state;
      return stateWithoutToken;
    }

    return {};
  }, [state]);

  const userObjectDependencyTree = React.useMemo(
    () => buildObjectKeyTree(loggedInUserObject),
    [loggedInUserObject],
  );

  const handleToggleUserObjectDependency = React.useCallback((path) => {
    const dependencyPath = `user.${String(path || "").trim()}`;

    if (!dependencyPath || dependencyPath === "user.") {
      return;
    }

    setManualDependencies((currentValue) =>
      currentValue.includes(dependencyPath)
        ? currentValue.filter((value) => value !== dependencyPath)
        : [...currentValue, dependencyPath],
    );
  }, []);

  const renderDependencyTreeNodes = React.useCallback(
    (nodes = [], depth = 0) =>
      nodes.map((node) => {
        const nodePath = String(node?.path || "").trim();
        const dependencyPath = `user.${nodePath}`;
        const isChecked = manualDependencies.includes(dependencyPath);
        const hasChildren =
          Array.isArray(node?.children) && node.children.length > 0;

        return (
          <div
            key={nodePath}
            className="telegramControlPage_dependencyTreeNode"
          >
            <label
              className="telegramControlPage_dependencyTreeLabel"
              style={{ "--dependency-tree-depth": depth }}
              title={dependencyPath}
            >
              <input
                type="checkbox"
                className="telegramControlPage_dependencyTokenInput"
                checked={isChecked}
                onChange={() => handleToggleUserObjectDependency(nodePath)}
              />
              <span className="telegramControlPage_dependencyTreeKey">
                {String(node?.key || "")}
              </span>
            </label>
            {hasChildren ? (
              <div className="telegramControlPage_dependencyTreeChildren">
                {renderDependencyTreeNodes(node.children, depth + 1)}
              </div>
            ) : null}
          </div>
        );
      }),
    [handleToggleUserObjectDependency, manualDependencies],
  );

  const migrationIntervalLabel = React.useMemo(() => {
    if (storeMessagesMode === "all") {
      return "All messages";
    }

    const fromValue = String(migrationFromDate || "").trim();
    const toValue = isMigrationToPresent
      ? ""
      : String(migrationToDate || "").trim();

    if (fromValue && toValue) {
      return `${fromValue} -> ${toValue} (continues)`;
    }

    if (fromValue) {
      return `${fromValue} -> ${
        isMigrationToPresent ? storageCopy.present : storageCopy.notSet
      }`;
    }

    if (toValue) {
      return `${storageCopy.notSet} -> ${toValue} (continues)`;
    }

    return storageCopy.notSet;
  }, [
    isMigrationToPresent,
    migrationFromDate,
    migrationToDate,
    storeMessagesMode,
    storageCopy,
  ]);

  const handleScopeTableRowClick = React.useCallback(
    (_event, groupReference) => {
      const normalizedGroupReference = String(groupReference || "");

      if (activeScopeTableGroupReference === normalizedGroupReference) {
        setActiveScopeTableGroupReference("");
        return;
      }

      setActiveScopeTableGroupReference(normalizedGroupReference);
    },
    [activeScopeTableGroupReference],
  );

  const handleEditScopeStoredGroup = React.useCallback(() => {
    const targetReference = String(activeScopeTableGroupReference || "").trim();

    if (!targetReference) {
      return;
    }

    const matchedGroup = (
      Array.isArray(storedGroupOptions) ? storedGroupOptions : []
    ).find(
      (group) => String(group?.groupReference || "").trim() === targetReference,
    );

    setGroupInput(targetReference);
    setMigrationGroupTitle(
      matchedGroup
        ? formatTelegramGroupOptionLabel(matchedGroup)
        : targetReference,
    );
    setFeedback("");
    setActiveScopeTableGroupReference("");
  }, [
    activeScopeTableGroupReference,
    storedGroupOptions,
  ]);

  const handleViewScopeStoredGroup = React.useCallback(async () => {
    const targetReference = String(activeScopeTableGroupReference || "").trim();

    if (!targetReference) {
      return;
    }

    const nextScope = {
      query: String(activeStorageScope?.query || "").trim(),
      allGroups: false,
      groupReference: targetReference,
    };

    setSelectedStoredGroupReference(targetReference);
    setActiveScopeTableGroupReference("");
    await loadStoredMessages(TELEGRAM_MESSAGES_FETCH_LIMIT, nextScope);
  }, [activeScopeTableGroupReference, activeStorageScope, loadStoredMessages]);

  const handleDeleteScopeStoredGroup = React.useCallback(async () => {
    const targetReference = String(activeScopeTableGroupReference || "").trim();

    if (!token || !targetReference) {
      return;
    }

    try {
      const response = await fetch(
        apiUrl(
          `/api/telegram/stored-groups/${encodeURIComponent(targetReference)}`,
        ),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete stored group.");
      }

      setStoredGroupOptions(
        Array.isArray(payload?.groups) ? payload.groups : [],
      );
      publishFeedback(payload?.message || "");
      setActiveScopeTableGroupReference("");
      fetchStorageContext();
      fetchTelegramGroups();
    } catch (nextError) {
      publishFeedback(nextError?.message || "Unable to delete stored group.");
    }
  }, [
    activeScopeTableGroupReference,
    fetchStorageContext,
    fetchTelegramGroups,
    token,
  ]);

  const renderTelegramConnectionCard = () => (
    <div className="telegramControlPage_connectionCard">
      <div className="telegramControlPage_connectionHeader">
        <div>
          <span className="telegramControlPage_label">Telegram login</span>
          <p className="telegramControlPage_status">
            {telegramAuthStage === "password"
              ? "Telegram is asking for the 2-step verification password."
              : telegramAuthStage === "connected"
                ? "Telegram login is connected for this account."
                : "Connect Telegram with API ID, API Hash, and phone number."}
          </p>
        </div>
        <div className="telegramControlPage_connectionBadges">
          <span className="telegramControlPage_connectionBadge">
            API ID: {telegramConfigStatus.hasApiId ? "Present" : "Missing"}
          </span>
          <span className="telegramControlPage_connectionBadge">
            API Hash: {telegramConfigStatus.hasApiHash ? "Present" : "Missing"}
          </span>
          <span className="telegramControlPage_connectionBadge">
            Session:{" "}
            {telegramConfigStatus.hasStringSession ? "Connected" : "Missing"}
          </span>
        </div>
      </div>
      <div className="telegramControlPage_connectionGrid">
        <input
          type="text"
          value={telegramApiIdInput}
          onChange={(event) => {
            setTelegramApiIdInput(event.target.value);
            if (telegramConfigFeedback) {
              setTelegramConfigFeedback("");
            }
          }}
          placeholder="TELEGRAM_API_ID"
          className="telegramControlPage_input"
        />
        <input
          type="text"
          value={telegramApiHashInput}
          onChange={(event) => {
            setTelegramApiHashInput(event.target.value);
            if (telegramConfigFeedback) {
              setTelegramConfigFeedback("");
            }
          }}
          placeholder="TELEGRAM_API_HASH"
          className="telegramControlPage_input"
        />
        <input
          type="text"
          value={telegramPhoneNumberInput}
          onChange={(event) => {
            setTelegramPhoneNumberInput(event.target.value);
            if (telegramConfigFeedback) {
              setTelegramConfigFeedback("");
            }
          }}
          placeholder="Telegram phone number with country code"
          className="telegramControlPage_input telegramControlPage_connectionField--full"
        />
        <button
          type="button"
          className="telegramControlPage_button telegramControlPage_button--primary telegramControlPage_connectionField--full"
          onClick={startTelegramAuth}
        >
          Send Telegram code
        </button>
        {telegramAuthStage === "code" ||
        telegramAuthStage === "password" ||
        telegramAuthStage === "connected" ? (
          <>
            <input
              type="text"
              value={telegramPhoneCodeInput}
              onChange={(event) => {
                setTelegramPhoneCodeInput(event.target.value);
                if (telegramConfigFeedback) {
                  setTelegramConfigFeedback("");
                }
              }}
              placeholder="Telegram login code"
              className="telegramControlPage_input"
            />
            <button
              type="button"
              className="telegramControlPage_button"
              onClick={verifyTelegramCode}
            >
              Verify code
            </button>
          </>
        ) : null}
        {telegramAuthStage === "password" ? (
          <>
            <input
              type="password"
              value={telegramPasswordInput}
              onChange={(event) => {
                setTelegramPasswordInput(event.target.value);
                if (telegramConfigFeedback) {
                  setTelegramConfigFeedback("");
                }
              }}
              placeholder="Telegram 2-step password if needed"
              className="telegramControlPage_input"
            />
            <button
              type="button"
              className="telegramControlPage_button"
              onClick={verifyTelegramPassword}
            >
              Verify password
            </button>
          </>
        ) : null}
      </div>
      {telegramConfigFeedback ? (
        <p className="telegramControlPage_feedback">{telegramConfigFeedback}</p>
      ) : null}
    </div>
  );

  return (
    <section
      id="telegramControlPage"
      className="telegramControlPage"
      ref={telegramShellRef}
    >
        <header className="telegramControlPage_header">
          <h1>Telegram Control</h1>
          <p>
            Manage Telegram migration, storage search, and focused AI helpers in
            one compact standalone page.
          </p>
        </header>
        <section
          className="telegramControlPage_grid"
          style={telegramGridStyle}
          ref={telegramGridRef}
        >
          <div
            className="telegramControlPage_leftColumn telegramControlPage_gridColumn telegramControlPage_gridColumn--left telegramControlPage_card telegramControlPage_card--control"
            ref={leftColumnRef}
          >
            {/* Removed telegramControlPage_mountBar */}
            {activeLeftPanel === "migration" ? (
              <>
                <div className="telegramControlPage_cardHeader">
                  <h2>Migration</h2>
                  <span>{token ? "Signed in" : "No token"}</span>
                </div>
                <div className="telegramControlPage_leftPool" id="left-pool">
                  <div className="telegramControlPage_controlCardBody">
                    {renderTelegramConnectionCard()}
                    <label
                      className="telegramControlPage_label"
                      htmlFor="telegramControlPage_groupInput"
                    >
                      Source group
                    </label>
                    <select
                      id="telegramControlPage_groupInput"
                      value={groupInput}
                      onChange={(event) => {
                        const nextGroupReference = String(event.target.value || "");
                        setGroupInput(nextGroupReference);
                        setFeedback("");
                        setTelegramImportSummary(null);
                      }}
                      className="telegramControlPage_input"
                    >
                      {migrationOptionGroups.groups.length === 0 &&
                      migrationOptionGroups.supergroups.length === 0 &&
                      migrationOptionGroups.channels.length === 0 ? (
                        <option value="">
                          No new Telegram groups available for migration
                        </option>
                      ) : (
                        <>
                          {migrationOptionGroups.groups.length > 0 ? (
                            <optgroup label="Groups">
                              {migrationOptionGroups.groups.map((group) => (
                                <option
                                  key={String(
                                    group?.groupReference || group?.title || "",
                                  )}
                                  value={String(group?.groupReference || "")}
                                >
                                  {formatTelegramGroupOptionLabel(group)}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          {migrationOptionGroups.supergroups.length > 0 ? (
                            <optgroup label="Supergroups">
                              {migrationOptionGroups.supergroups.map(
                                (group) => (
                                  <option
                                    key={String(
                                      group?.groupReference ||
                                        group?.title ||
                                        "",
                                    )}
                                    value={String(group?.groupReference || "")}
                                  >
                                    {formatTelegramGroupOptionLabel(group)}
                                  </option>
                                ),
                              )}
                            </optgroup>
                          ) : null}
                          {migrationOptionGroups.channels.length > 0 ? (
                            <optgroup label="Channels">
                              {migrationOptionGroups.channels.map((group) => (
                                <option
                                  key={String(
                                    group?.groupReference || group?.title || "",
                                  )}
                                  value={String(group?.groupReference || "")}
                                >
                                  {formatTelegramGroupOptionLabel(group)}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                        </>
                      )}
                    </select>

                    <div className="telegramControlPage_migrationModeBlock">
                      <span className="telegramControlPage_label">
                        Migration mode
                      </span>
                      <div className="telegramControlPage_storeModeTabs">
                        <button
                          type="button"
                          className={`telegramControlPage_migrationModeButton${storeMessagesMode === "all" ? " is-active" : ""}`}
                          onClick={() => {
                            setStoreMessagesMode("all");
                            setFeedback("");
                            setTelegramImportSummary(null);
                          }}
                        >
                          All messages
                        </button>
                        <button
                          type="button"
                          className={`telegramControlPage_migrationModeButton${storeMessagesMode === "interval" ? " is-active" : ""}`}
                          onClick={() => {
                            setStoreMessagesMode("interval");
                            setFeedback("");
                            setTelegramImportSummary(null);
                          }}
                        >
                          Messages within interval
                        </button>
                      </div>
                      <p className="telegramControlPage_hint">
                        Save this group's messages within the selected scope.
                      </p>
                    </div>

                    <div className="telegramControlPage_dateGrid">
                      {storeMessagesMode === "interval" ? (
                        <>
                          <label className="telegramControlPage_dateField">
                            <span className="telegramControlPage_label">
                              From date
                            </span>
                            <input
                              type="date"
                              value={migrationFromDate}
                              onChange={(event) =>
                                setMigrationFromDate(event.target.value)
                              }
                              className="telegramControlPage_input"
                            />
                          </label>
                          <label className="telegramControlPage_dateField">
                            <span className="telegramControlPage_label">
                              To date
                            </span>
                            <div className="telegramControlPage_dateFieldRow">
                              <input
                                type="date"
                                value={migrationToDate}
                                onChange={(event) => {
                                  setMigrationToDate(event.target.value);
                                  if (event.target.value) {
                                    setIsMigrationToPresent(false);
                                  }
                                }}
                                className="telegramControlPage_input"
                                disabled={isMigrationToPresent}
                              />
                              <button
                                type="button"
                                className={`telegramControlPage_toggleButton${isMigrationToPresent ? " is-active" : ""}`}
                                onClick={() => {
                                  setIsMigrationToPresent(
                                    (currentValue) => !currentValue,
                                  );
                                  setFeedback("");
                                }}
                              >
                                {storageCopy.present}
                              </button>
                            </div>
                          </label>
                        </>
                      ) : (
                        <div className="telegramControlPage_syncModeNote">
                          <span className="telegramControlPage_label">
                            Store scope
                          </span>
                          <p className="telegramControlPage_status">
                            All available messages from this group will be stored.
                          </p>
                        </div>
                      )}
                      <div className="telegramControlPage_actions telegramControlPage_actions--dateGrid">
                        <button
                          type="button"
                          className="telegramControlPage_button telegramControlPage_button--primary"
                          onClick={handleSaveTelegramConfig}
                          disabled={isSaving || !token}
                        >
                          {isSaving ? "Storing..." : "Store group"}
                        </button>
                      </div>
                    </div>

                    {feedback ? (
                      <p className="telegramControlPage_feedback">{feedback}</p>
                    ) : null}
                    {telegramImportSummary?.started ? (
                      <p className="telegramControlPage_status">
                        {telegramImportSummary.reason === "background-started" ? (
                          <>Import started in background. Refresh shortly to see updated stored counts.</>
                        ) : (
                          <>
                            Import {telegramImportSummary.succeeded ? "succeeded" : "failed"}.
                            {" "}
                            Imported {telegramImportSummary.importedCount} message(s)
                            after scanning {telegramImportSummary.scannedCount}.
                            {" "}
                            Stored total: {telegramImportSummary.storedCount}.
                            {telegramImportSummary.reason
                              ? ` Reason: ${telegramImportSummary.reason}.`
                              : ""}
                          </>
                        )}
                      </p>
                    ) : null}
                    <div className="telegramControlPage_scopeTableWrap">
                      <table className="telegramControlPage_scopeTable">
                        <thead>
                          <tr>
                            <th>{storageCopy.storedGroup}</th>
                            <th>{storageCopy.interval}</th>
                            <th>{storageCopy.storedMessagesNumber}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storedGroupOptions.length > 0 ? (
                            storedGroupOptions.map((group, groupIndex) => {
                              const groupReference = String(
                                group?.groupReference || "",
                              );
                              const rowKey = String(
                                group?.rowKey ||
                                  group?.groupReference ||
                                  group?.id ||
                                  `stored-group-row-${groupIndex + 1}`,
                              );
                              const isMenuOpen =
                                activeScopeTableGroupReference ===
                                groupReference;

                              return (
                                <React.Fragment key={rowKey}>
                                  <tr
                                    className={`telegramControlPage_scopeTableRow${isMenuOpen ? " is-active" : ""}`}
                                    onClick={(event) =>
                                      handleScopeTableRowClick(
                                        event,
                                        groupReference,
                                      )
                                    }
                                  >
                                    <td className="telegramControlPage_scopeGroupCell">
                                      {isMenuOpen ? (
                                        <div
                                          className="telegramControlPage_scopeMiniBar telegramControlPage_scopeMiniBar--inline"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                          }}
                                        >
                                          <button
                                            type="button"
                                            className="telegramControlPage_scopeMiniBarButton"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleViewScopeStoredGroup();
                                            }}
                                          >
                                            {storageCopy.viewAction}
                                          </button>
                                          <button
                                            type="button"
                                            className="telegramControlPage_scopeMiniBarButton"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleDeleteScopeStoredGroup();
                                            }}
                                          >
                                            {storageCopy.deleteAction}
                                          </button>
                                          <button
                                            type="button"
                                            className="telegramControlPage_scopeMiniBarButton"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleEditScopeStoredGroup();
                                            }}
                                          >
                                            {storageCopy.editAction}
                                          </button>
                                        </div>
                                      ) : null}
                                      {formatTelegramGroupOptionLabel(group)}
                                    </td>
                                    <td>{migrationIntervalLabel}</td>
                                    <td>{Number(group?.storedCount || 0)}</td>
                                  </tr>
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3}>{storageCopy.noStoredGroups}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Resize migration and messages columns"
            className={`telegramControlPage_gridResizer telegramControlPage_gridResizer--right${activeGridResizer === "right" ? " is-active" : ""}`}
            onPointerDown={(event) =>
              handleGridResizerPointerDown(event, "right")
            }
          />
          <section
            className="telegramControlPage_card telegramControlPage_card--stream telegramControlPage_gridColumn telegramControlPage_gridColumn--right"
            ref={streamColumnRef}
          >
            <div className="telegramControlPage_cardHeader">
              <h2>Telegram messages</h2>
              <span>{`${filteredMessages.length} ${storageCopy.shown}`}</span>
            </div>
            <div className="telegramControlPage_streamToolbar">
              <div className="telegramControlPage_messageTypeTabs">
                {TELEGRAM_MESSAGE_TYPE_TABS.map((tab) => {
                  const isActive = activeMessageTypeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`telegramControlPage_messageTypeTab${isActive ? " is-active" : ""}`}
                      onClick={() => setActiveMessageTypeTab(tab.key)}
                    >
                      {(storageLanguage === "ar" ? tab.labelAr : tab.labelEn) +
                        ` (${Number(messageTypeCounts?.[tab.key] || 0)})`}
                    </button>
                  );
                })}
              </div>
              <div className="telegramControlPage_streamInterval">
                <input
                  type="date"
                  value={storageRangeStartDate}
                  onChange={(event) => setStorageRangeStartDate(event.target.value)}
                  className="telegramControlPage_input"
                  aria-label="From date"
                />
                <span className="telegramControlPage_streamIntervalDash">-</span>
                <input
                  type="date"
                  value={storageRangeEndDate}
                  onChange={(event) => setStorageRangeEndDate(event.target.value)}
                  className="telegramControlPage_input"
                  aria-label="To date"
                />
              </div>
            </div>
            <div className="telegramControlPage_rightPool" id="right-pool">
              <div className="telegramControlPage_streamControls">
                <label
                  htmlFor="telegramControlPage_storageSearchInput"
                  className="telegramControlPage_label"
                >
                  {storageCopy.searchStoredMessages}
                </label>
                <div className="telegramControlPage_streamControlsRow">
                  <input
                    id="telegramControlPage_storageSearchInput"
                    type="search"
                    value={storageSearchQuery}
                    onChange={(event) =>
                      setStorageSearchQuery(event.target.value)
                    }
                    placeholder={storageCopy.searchPlaceholder}
                    className={`telegramControlPage_input telegramControlPage_input--${storageSearchDirection}`}
                    dir={storageSearchDirection}
                    style={{
                      textAlign:
                        storageSearchDirection === "rtl" ? "right" : "left",
                    }}
                  />
                  <button
                    type="button"
                    className="telegramControlPage_button telegramControlPage_button--primary"
                    onClick={handleStorageSearch}
                    disabled={isLoading || !token}
                  >
                    {isLoading
                      ? storageCopy.searching
                      : storageCopy.searchStorage}
                  </button>
                </div>

                {storageFeedback ? (
                  <p className="telegramControlPage_feedback">
                    {storageFeedback}
                  </p>
                ) : null}
              </div>

              <div className="telegramControlPage_stream">
                <div className="telegramControlPage_streamMessagesPane">
                  {isLoading ? (
                    <p className="telegramControlPage_status">
                      {storageCopy.loadingStored}
                    </p>
                  ) : error ? (
                    <p className="telegramControlPage_status">{error}</p>
                  ) : groupedMessages.length === 0 ? (
                    <p className="telegramControlPage_status">
                      {storageCopy.loadStoredPrompt}
                    </p>
                  ) : (
                    groupedMessages.map((messageGroup) => (
                      <div
                        key={messageGroup.dayLabel}
                        className="telegramControlPage_dayGroup"
                      >
                        <p className="telegramControlPage_dayLabel">
                          {messageGroup.dayLabel}
                        </p>
                        <div className="telegramControlPage_messageStack">
                          {messageGroup.items.map((message) => {
                          const messageDirection =
                            getTelegramMessageTextDirection(message?.text);
                          const photoPreviewKey = `${String(
                            message?.groupReference || "",
                          ).trim()}::${Number(message?.id || 0)}`;
                          const photoPreviewUrl =
                            photoPreviewUrls[photoPreviewKey] || "";
                          const isPhotoMessage =
                            String(message?.attachmentKind || "").toLowerCase() ===
                            "photo";

                            return (
                              <article
                                key={`${String(message?.groupReference || "")}-${message.id || `${message.sender || "unknown"}-${message.date || ""}`}`}
                                className={`telegramControlPage_message${
                                  message?.isPinned ? " is-pinned" : ""
                                } telegramControlPage_message--${messageDirection}`}
                                data-message-direction={messageDirection}
                                dir={messageDirection}
                                style={{
                                  textAlign:
                                    messageDirection === "rtl" ? "right" : "left",
                                  alignSelf:
                                    messageDirection === "rtl"
                                      ? "flex-end"
                                      : "flex-start",
                                }}
                              >
                              <div className="telegramControlPage_messageMeta">
                                <span>
                                  {message.groupTitle ||
                                    message.groupReference ||
                                    storageCopy.storedGroup}
                                </span>
                                <span>
                                  {formatTelegramDateTime(message.date)}
                                </span>
                              </div>
                              <div className="telegramControlPage_messageMeta">
                                <span>{message.sender || "Unknown"}</span>
                                <button
                                  type="button"
                                  className={`telegramControlPage_pinButton${
                                    message?.isPinned ? " is-active" : ""
                                  }`}
                                  onClick={() =>
                                    handleToggleImportantMessage(message)
                                  }
                                >
                                  {message?.isPinned
                                    ? storageCopy.pinned
                                    : storageCopy.pin}
                                </button>
                              </div>
                              <p
                                className={`telegramControlPage_messageText telegramControlPage_messageText--${messageDirection}`}
                                dir={messageDirection}
                                style={{
                                  direction: messageDirection,
                                  textAlign:
                                    messageDirection === "rtl"
                                      ? "right"
                                      : "left",
                                }}
                              >
                                {message.text || "[No text]"}
                              </p>
                              {isPhotoMessage && photoPreviewUrl ? (
                                <img
                                  src={photoPreviewUrl}
                                  alt={message.attachmentFileName || "Telegram photo"}
                                  className="telegramControlPage_messagePhoto"
                                />
                              ) : null}
                              {message.attachmentFileName ? (
                                <span className="telegramControlPage_attachmentLabel">
                                  {message.attachmentFileName}
                                </span>
                              ) : null}
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <aside className="telegramControlPage_streamMembersPane">
                  <h3 className="telegramControlPage_streamMembersTitle">
                    Group Members
                  </h3>
                  {groupMembers.length === 0 ? (
                    <p className="telegramControlPage_status">No members to list.</p>
                  ) : (
                    <ul className="telegramControlPage_streamMembersList">
                      {groupMembers.map((member) => (
                        <li
                          key={`${member.sender}-${member.role}`}
                          className="telegramControlPage_streamMemberItem"
                        >
                          <span className="telegramControlPage_streamMemberName">
                            {member.sender}
                          </span>
                          <span className="telegramControlPage_streamMemberRole">
                            {member.role}
                          </span>
                          <span className="telegramControlPage_streamMemberCount">
                            {member.messagesCount}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>
              </div>
            </div>{" "}
            {/* close telegramControlPage_rightPool */}
          </section>{" "}
          {/* close telegramControlPage_card--stream */}
        </section>{" "}
        {/* close telegramControlPage_grid */}
    </section>
  );
};

export default TelegramControlPage;
