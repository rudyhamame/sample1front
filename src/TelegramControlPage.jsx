import React from "react";
import Nav from "./Nav/Nav";
import { apiUrl } from "./config/api";
import { getHomeSubApps } from "./utils/homeSubApps";
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
    dependencies: "Dependencies",
    addDependencyPlaceholder: "Add dependency to the AI prompt",
    add: "Add",
    predictCourses: "Predict course names by AI",
    predictLectures: "Predict lecture names by AI",
    predictInstructors: "Predict instructor names by AI",
    predictionsSettingsTab: "Settings",
    predictionsCoursesTab: "Courses",
    predictionsLecturesTab: "Lectures",
    predictionsInstructorsTab: "Instructors",
    predictionsPinsTab: "Pins",
    predict: "Predict",
    predicting: "Predicting...",
    conceptualize: "Conceptualize",
    thinking: "Thinking...",
    noSavedCourses: "No saved courses yet",
    noCoursePredictions: "No course predictions yet",
    noLecturePredictions: "No lecture predictions yet",
    noInstructorPredictions: "No instructor predictions yet",
    predictedBucket: "Predicted",
    deletePredicted: "Delete predicted",
    acceptedBucket: "Accepted",
    clearAccepted: "Clear accepted",
    noImportantMessages: "No important messages pinned yet",
    loadStoredPrompt:
      "Search storage to open the stored Telegram message monitor.",
    loadingStored: "Loading stored Telegram messages...",
    pin: "Pin",
    pinned: "Pinned",
    storedGroup: "Stored group",
    shown: "shown",
    builtCourses: (count) =>
      `Built ${count} course prediction(s) from Telegram storage.`,
    builtLectures: (count, courseName) =>
      `Built ${count} lecture prediction(s) for ${courseName}.`,
    builtInstructors: (count) =>
      `Built ${count} instructor prediction(s) from Telegram storage.`,
    conceptualized: "Important message conceptualized.",
    chooseCourse: "Choose one of your saved courses first.",
    chooseImportant: "Choose an important message first.",
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
    dependencies: "الاعتماديات",
    addDependencyPlaceholder: "أضف اعتمادًا إلى طلب الذكاء الاصطناعي",
    add: "إضافة",
    predictCourses: "توقّع أسماء المواد بالذكاء الاصطناعي",
    predictLectures: "توقّع أسماء المحاضرات بالذكاء الاصطناعي",
    predictInstructors: "توقّع أسماء الأساتذة بالذكاء الاصطناعي",
    predictionsSettingsTab: "الإعدادات",
    predictionsCoursesTab: "المواد",
    predictionsLecturesTab: "المحاضرات",
    predictionsInstructorsTab: "الأساتذة",
    predictionsPinsTab: "المثبّتات",
    predict: "توقّع",
    predicting: "جارٍ التوقّع...",
    conceptualize: "بلورة الفكرة",
    thinking: "جارٍ التفكير...",
    noSavedCourses: "لا توجد مواد محفوظة بعد",
    noCoursePredictions: "لا توجد اقتراحات مواد بعد",
    noLecturePredictions: "لا توجد اقتراحات محاضرات بعد",
    noInstructorPredictions: "لا توجد اقتراحات أساتذة بعد",
    predictedBucket: "التوقعات",
    deletePredicted: "حذف التوقعات",
    acceptedBucket: "المقبول",
    clearAccepted: "مسح المقبول",
    noImportantMessages: "لا توجد رسائل مهمة مثبّتة بعد",
    loadStoredPrompt: "ابحث في التخزين لفتح مراقب الرسائل المخزنة من تيليجرام.",
    loadingStored: "جارٍ تحميل رسائل تيليجرام المخزنة...",
    pin: "تثبيت",
    pinned: "مثبّتة",
    storedGroup: "مجموعة مخزنة",
    shown: "معروضة",
    builtCourses: (count) =>
      `تم إنشاء ${count} اقتراح/اقتراحات لمواد من تخزين تيليجرام.`,
    builtLectures: (count, courseName) =>
      `تم إنشاء ${count} اقتراح/اقتراحات لمحاضرات خاصة بـ ${courseName}.`,
    builtInstructors: (count) =>
      `تم إنشاء ${count} اقتراح/اقتراحات لأسماء الأساتذة من تخزين تيليجرام.`,
    conceptualized: "تمت بلورة الرسالة المهمة.",
    chooseCourse: "اختر مادة محفوظة أولًا.",
    chooseImportant: "اختر رسالة مهمة أولًا.",
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
  const nextDate = getTelegramMessageDate(value);
  return nextDate ? nextDate.toISOString().slice(0, 10) : "";
};

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

const TelegramControlPage = ({
  state,
  logOut,
  acceptFriend,
  makeNotificationsRead,
}) => {
  const [groupInput, setGroupInput] = React.useState("");
  const [groupReference, setGroupReference] = React.useState("");
  const [migrationGroupTitle, setMigrationGroupTitle] =
    React.useState("Telegram Migration");
  const [syncMode, setSyncMode] = React.useState("live");
  const [migrationFromDate, setMigrationFromDate] = React.useState("");
  const [migrationToDate, setMigrationToDate] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [storageFeedback, setStorageFeedback] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [limit, setLimit] = React.useState(20);
  const [hasMore, setHasMore] = React.useState(true);
  const [groupOptions, setGroupOptions] = React.useState([]);
  const [storedGroupOptions, setStoredGroupOptions] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [importantMessages, setImportantMessages] = React.useState([]);
  const [streamTitle, setStreamTitle] = React.useState("Telegram messages");
  const [storageSearchQuery, setStorageSearchQuery] = React.useState("");
  const [searchWithinSelectedGroup, setSearchWithinSelectedGroup] =
    React.useState(false);
  const [selectedStoredGroupReference, setSelectedStoredGroupReference] =
    React.useState("");
  const [activeStorageScope, setActiveStorageScope] = React.useState({
    query: "",
    allGroups: true,
    groupReference: "",
  });
  const [selectedDependencyKeys, setSelectedDependencyKeys] = React.useState(
    DEFAULT_DEPENDENCY_KEYS,
  );
  const [storageLanguage, setStorageLanguage] = React.useState("en");
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
  const [selectedCourseName, setSelectedCourseName] = React.useState("");
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
  const [importantMessageConcept, setImportantMessageConcept] =
    React.useState(null);
  const [activeLeftPanel, setActiveLeftPanel] = React.useState("migration");
  const [activePredictionTab, setActivePredictionTab] =
    React.useState("settings");
  const storedGroupOptionsRef = React.useRef([]);

  const token = String(state?.token || "").trim();
  const storageCopy = STORAGE_COPY[storageLanguage] || STORAGE_COPY.en;
  const subApps = React.useMemo(
    () => getHomeSubApps(state?.username),
    [state?.username],
  );

  React.useEffect(() => {
    storedGroupOptionsRef.current = Array.isArray(storedGroupOptions)
      ? storedGroupOptions
      : [];
  }, [storedGroupOptions]);

  React.useEffect(() => {
    if (activeLeftPanel === "storage") {
      setActiveLeftPanel("migration");
    }
  }, [activeLeftPanel]);

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
      const fallbackStoredOptions = storedGroupOptionsRef.current;
      const resolvedOptions =
        nextOptions.length > 0 ? nextOptions : fallbackStoredOptions;

      setGroupOptions(resolvedOptions);
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
      const response = await fetch(apiUrl("/api/telegram/storage/context"), {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram storage.");
      }

      const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
      const nextCourses = Array.isArray(payload?.courses)
        ? payload.courses
        : [];
      const nextImportantMessages = Array.isArray(payload?.importantMessages)
        ? payload.importantMessages
        : [];

      setStoredGroupOptions(nextGroups);
      setCourses(nextCourses);
      setImportantMessages(nextImportantMessages);
      setSelectedStoredGroupReference((currentValue) => {
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
        const hasCurrentValue = nextImportantMessages.some(
          (message) => buildImportantMessageValue(message) === currentValue,
        );

        return hasCurrentValue
          ? currentValue
          : nextImportantMessages[0]
            ? buildImportantMessageValue(nextImportantMessages[0])
            : "";
      });
      setSelectedCourseName((currentValue) => {
        const hasCurrentValue = nextCourses.some(
          (course) =>
            String(course?.course_name || "").trim() ===
            String(currentValue || "").trim(),
        );

        return hasCurrentValue
          ? currentValue
          : String(nextCourses[0]?.course_name || "");
      });
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to load Telegram storage context.",
      );
    }
  }, [token]);

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
      setGroupReference(nextReference);
      setGroupInput(nextReference);
      setSyncMode(
        String(payload?.syncMode || "live").trim() === "one-time"
          ? "one-time"
          : "live",
      );
      setMigrationFromDate(formatDateInputValue(payload?.historyStartDate));
      setMigrationToDate(formatDateInputValue(payload?.historyEndDate));
      setMigrationGroupTitle(nextReference || "Telegram Migration");
    } catch (nextError) {
      setError(nextError?.message || "Unable to load Telegram configuration.");
    }
  }, [token]);

  React.useEffect(() => {
    setLimit(20);
    fetchStorageContext();
    fetchTelegramGroups();
    fetchTelegramConfig();
  }, [fetchStorageContext, fetchTelegramConfig, fetchTelegramGroups]);

  const loadStoredMessages = React.useCallback(
    async (nextLimit = limit, scopeOverride = null) => {
      if (!token) {
        setIsLoading(false);
        setError("Telegram messages need a valid login token.");
        setMessages([]);
        setHasMore(false);
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
        setHasMore(nextMessages.length >= nextLimit && Number(nextLimit) < 100);
        setActiveStorageScope(nextScope);
      } catch (nextError) {
        setError(
          nextError?.message || "Unable to load stored Telegram messages.",
        );
        setMessages([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [activeStorageScope, limit, token],
  );

  const handleSaveTelegramConfig = async () => {
    if (!token || isSaving) {
      return;
    }

    const nextGroupReference = String(groupInput || "").trim();
    const isOneTimeMigration = syncMode === "one-time";
    const nextHistoryStartDate = isOneTimeMigration
      ? String(migrationFromDate || "").trim()
      : new Date().toISOString();
    const nextHistoryEndDate = isOneTimeMigration
      ? String(migrationToDate || "").trim()
      : "";

    if (!nextGroupReference) {
      setFeedback("Choose a Telegram group to migrate first.");
      return;
    }

    if (isOneTimeMigration && (!nextHistoryStartDate || !nextHistoryEndDate)) {
      setFeedback("One-time migration needs both from and to dates.");
      return;
    }

    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch(apiUrl("/api/telegram/config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupReference: nextGroupReference,
          syncMode,
          historyStartDate: nextHistoryStartDate,
          historyEndDate: nextHistoryEndDate,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to save Telegram settings.",
        );
      }

      const nextReference = String(payload?.groupReference || "");
      setFeedback(payload?.message || "Saved Telegram settings.");
      setGroupReference(nextReference);
      setGroupInput(nextReference);
      setSyncMode(
        String(payload?.syncMode || syncMode).trim() === "one-time"
          ? "one-time"
          : "live",
      );
      setMigrationFromDate(formatDateInputValue(payload?.historyStartDate));
      setMigrationToDate(formatDateInputValue(payload?.historyEndDate));
      setMigrationGroupTitle(nextReference || "Telegram Migration");
    } catch (nextError) {
      setFeedback(nextError?.message || "Unable to save Telegram settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStorageSearch = () => {
    const nextScope = {
      query: storageSearchQuery,
      allGroups: !searchWithinSelectedGroup,
      groupReference: searchWithinSelectedGroup
        ? selectedStoredGroupReference
        : "",
    };

    setLimit(20);
    loadStoredMessages(20, nextScope);
  };

  const handleLoadMore = () => {
    if (isLoading || !hasMore) {
      return;
    }

    const nextLimit = Math.min(100, limit + 20);
    setLimit(nextLimit);
    loadStoredMessages(nextLimit);
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
            allGroups: !searchWithinSelectedGroup,
            groupReference: searchWithinSelectedGroup
              ? selectedStoredGroupReference
              : "",
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
            language: storageLanguage,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to generate course predictions.",
        );
      }

      const nextSuggestions = Array.isArray(payload?.newSuggestions)
        ? payload.newSuggestions
        : Array.isArray(payload?.suggestions)
          ? payload.suggestions
          : [];

      setCourseSuggestions(nextSuggestions);
      if (nextSuggestions.length > 0) {
        setSelectedCourseName(
          String(nextSuggestions[0]?.coursePayload?.course_name || ""),
        );
      }
      setStorageFeedback(storageCopy.builtCourses(nextSuggestions.length));
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to generate course predictions.",
      );
    } finally {
      setIsCoursePredicting(false);
    }
  };

  const handlePredictLectures = async () => {
    const nextCourseName = String(selectedCourseName || "").trim();

    if (!token || !nextCourseName) {
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
            courseName: nextCourseName,
            groupReferences: searchWithinSelectedGroup
              ? [selectedStoredGroupReference]
              : [],
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
            language: storageLanguage,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to generate lecture predictions.",
        );
      }

      const nextLectures = Array.isArray(payload?.lectures)
        ? payload.lectures
        : [];

      setLectureSuggestions(nextLectures);
      setStorageFeedback(
        storageCopy.builtLectures(nextLectures.length, nextCourseName),
      );
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to generate lecture predictions.",
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
            groupReference: selectedGroupReference,
            messageId: Number(selectedMessageId || 0),
            extraDependencies: manualDependencies,
            language: storageLanguage,
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
            groupReferences: searchWithinSelectedGroup
              ? [selectedStoredGroupReference]
              : [],
            selectedDependencyKeys,
            extraDependencies: manualDependencies,
            language: storageLanguage,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to generate instructor predictions.",
        );
      }

      const nextInstructors = Array.isArray(payload?.instructors)
        ? payload.instructors
        : [];

      setInstructorSuggestions(nextInstructors);
      setStorageFeedback(storageCopy.builtInstructors(nextInstructors.length));
    } catch (nextError) {
      setStorageFeedback(
        nextError?.message || "Unable to generate instructor predictions.",
      );
    } finally {
      setIsInstructorPredicting(false);
    }
  };

  const predictionScope = React.useMemo(
    () => ({
      allGroups: !searchWithinSelectedGroup,
      groupReference: searchWithinSelectedGroup
        ? String(selectedStoredGroupReference || "").trim()
        : "",
      groupTitle: searchWithinSelectedGroup
        ? formatTelegramGroupOptionLabel(
            storedGroupOptions.find(
              (group) =>
                String(group?.groupReference || "").trim() ===
                String(selectedStoredGroupReference || "").trim(),
            ) || {
              groupReference: selectedStoredGroupReference,
              title: selectedStoredGroupReference,
            },
          )
        : "Telegram messages",
    }),
    [
      searchWithinSelectedGroup,
      selectedStoredGroupReference,
      storedGroupOptions,
    ],
  );

  const buildPredictionScopeBody = () => ({
    allGroups: predictionScope.allGroups,
    groupReference: predictionScope.groupReference,
    groupTitle: predictionScope.groupTitle,
  });

  const buildPredictionScopeParams = () => {
    const params = new URLSearchParams();
    if (predictionScope.allGroups) {
      params.set("allGroups", "true");
    } else if (predictionScope.groupReference) {
      params.set("groupReference", predictionScope.groupReference);
    }
    return params;
  };

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
          ...buildPredictionScopeBody(),
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
          ...buildPredictionScopeBody(),
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
    const params = buildPredictionScopeParams();
    const response = await fetch(
      apiUrl(`/api/telegram/ai/lecture-suggestions?${params.toString()}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      setStoredLectureSuggestions([]);
    }
  };

  const handleClearRejectedLecturePredictions = async () => {
    if (!token) return;
    const params = buildPredictionScopeParams();
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
    const params = buildPredictionScopeParams();
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
          ...buildPredictionScopeBody(),
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
          ...buildPredictionScopeBody(),
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
  }, [predictionScope, token]);

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
    fetchCoursePredictionBuckets();
    fetchLecturePredictionBuckets();
    fetchInstructorPredictionBuckets();
  }, [
    fetchCoursePredictionBuckets,
    fetchLecturePredictionBuckets,
    fetchInstructorPredictionBuckets,
  ]);

  const groupedMessages = React.useMemo(
    () => groupTelegramMessagesByDay(messages),
    [messages],
  );

  const migrationOptionGroups = React.useMemo(
    () =>
      getTelegramGroupOptionGroups(
        Array.isArray(groupOptions)
          ? groupOptions.filter((group) => {
              const nextReference = String(group?.groupReference || "").trim();
              const isStored = storedGroupOptions.some(
                (storedGroup) =>
                  String(storedGroup?.groupReference || "").trim() ===
                  nextReference,
              );

              return (
                !isStored ||
                nextReference ===
                  String(groupInput || groupReference || "").trim()
              );
            })
          : [],
        groupInput || groupReference,
      ),
    [groupInput, groupOptions, groupReference, storedGroupOptions],
  );

  const selectedImportantMessageRecord = React.useMemo(
    () =>
      importantMessages.find(
        (message) =>
          buildImportantMessageValue(message) === selectedImportantMessage,
      ) || null,
    [importantMessages, selectedImportantMessage],
  );

  const savedConcept = React.useMemo(
    () =>
      parseStoredConceptSummary(
        selectedImportantMessageRecord?.aiConceptSummary,
      ),
    [selectedImportantMessageRecord],
  );

  const courseSelectOptions = React.useMemo(() => {
    const storedCourseNames = (Array.isArray(courses) ? courses : [])
      .map((course) => String(course?.course_name || "").trim())
      .filter(Boolean);
    const predictedCourseNames = (
      Array.isArray(courseSuggestions) ? courseSuggestions : []
    )
      .map((suggestion) =>
        String(suggestion?.coursePayload?.course_name || "").trim(),
      )
      .filter(Boolean);

    return [...new Set([...storedCourseNames, ...predictedCourseNames])];
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

  return (
    <section id="telegramControlPage" className="telegramControlPage">
      <div className="telegramControlPage_navWrap">
        <Nav
          state={state}
          logOut={logOut}
          acceptFriend={acceptFriend}
          makeNotificationsRead={makeNotificationsRead}
          subApps={subApps}
        />
      </div>
      <div className="telegramControlPage_shell">
        <header className="telegramControlPage_header">
          <div className="telegramControlPage_eyebrow">Telegram</div>
          <h1>Telegram Control</h1>
          <p>
            Manage Telegram migration, storage search, and focused AI helpers in
            one compact standalone page.
          </p>
        </header>
        <section className="telegramControlPage_grid">
          <div className="telegramControlPage_leftColumn">
            {/* Removed telegramControlPage_mountBar */}
            {activeLeftPanel === "migration" ? (
              <aside className="telegramControlPage_card telegramControlPage_card--control">
                <div className="telegramControlPage_cardHeader">
                  <h2>Migration</h2>
                  <span>{token ? "Signed in" : "No token"}</span>
                </div>
                <div className="telegramControlPage_leftPool" id="left-pool">
                  <div className="telegramControlPage_controlCardBody">
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
                        setGroupInput(String(event.target.value || ""));
                        setFeedback("");
                      }}
                      onFocus={fetchTelegramGroups}
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

                    <div className="telegramControlPage_modeBlock">
                      <span className="telegramControlPage_label">
                        Migration mode
                      </span>
                      <div className="telegramControlPage_toggleRow">
                        <button
                          type="button"
                          className={`telegramControlPage_toggleButton${syncMode === "one-time" ? " is-active" : ""}`}
                          onClick={() => {
                            setSyncMode("one-time");
                            setFeedback("");
                          }}
                        >
                          One-time migration
                        </button>
                        <button
                          type="button"
                          className={`telegramControlPage_toggleButton${syncMode === "live" ? " is-active" : ""}`}
                          onClick={() => {
                            setSyncMode("live");
                            setFeedback("");
                          }}
                        >
                          Live migration
                        </button>
                      </div>
                    </div>

                    {syncMode === "one-time" ? (
                      <div className="telegramControlPage_dateGrid">
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
                          <input
                            type="date"
                            value={migrationToDate}
                            onChange={(event) =>
                              setMigrationToDate(event.target.value)
                            }
                            className="telegramControlPage_input"
                          />
                        </label>
                      </div>
                    ) : (
                      <p className="telegramControlPage_hint">
                        Live migration starts from the moment you save and
                        imports only new messages going forward.
                      </p>
                    )}

                    <div className="telegramControlPage_actions">
                      <button
                        type="button"
                        className="telegramControlPage_button telegramControlPage_button--primary"
                        onClick={handleSaveTelegramConfig}
                        disabled={isSaving || !token}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>

                    <p className="telegramControlPage_hint">
                      One-time migration imports only messages inside the chosen
                      date range. Live migration keeps importing only future
                      messages.
                    </p>
                    {feedback ? (
                      <p className="telegramControlPage_feedback">{feedback}</p>
                    ) : null}
                    <dl className="telegramControlPage_meta">
                      <div>
                        <dt>Saved reference</dt>
                        <dd>{groupReference || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Mode</dt>
                        <dd>
                          {syncMode === "one-time"
                            ? "One-time migration"
                            : "Live migration"}
                        </dd>
                      </div>
                      <div>
                        <dt>Target title</dt>
                        <dd>{migrationGroupTitle || "Telegram Migration"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
          <aside className="telegramControlPage_card telegramControlPage_card--predictions">
            <div className="telegramControlPage_cardHeader">
              <h2>Predictions</h2>
              <span>AI tools</span>
            </div>
            <div className="telegramControlPage_centerPool" id="center-pool">
              <div className="telegramControlPage_aiBlock">
                <div
                  className="telegramControlPage_predictionTabs"
                  role="tablist"
                  aria-label="Prediction categories"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePredictionTab === "settings"}
                    className={`telegramControlPage_predictionTab${activePredictionTab === "settings" ? " is-active" : ""}`}
                    onClick={() => setActivePredictionTab("settings")}
                  >
                    {storageCopy.predictionsSettingsTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePredictionTab === "courses"}
                    className={`telegramControlPage_predictionTab${activePredictionTab === "courses" ? " is-active" : ""}`}
                    onClick={() => setActivePredictionTab("courses")}
                  >
                    {storageCopy.predictionsCoursesTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePredictionTab === "lectures"}
                    className={`telegramControlPage_predictionTab${activePredictionTab === "lectures" ? " is-active" : ""}`}
                    onClick={() => setActivePredictionTab("lectures")}
                  >
                    {storageCopy.predictionsLecturesTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePredictionTab === "instructors"}
                    className={`telegramControlPage_predictionTab${activePredictionTab === "instructors" ? " is-active" : ""}`}
                    onClick={() => setActivePredictionTab("instructors")}
                  >
                    {storageCopy.predictionsInstructorsTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activePredictionTab === "pins"}
                    className={`telegramControlPage_predictionTab${activePredictionTab === "pins" ? " is-active" : ""}`}
                    onClick={() => setActivePredictionTab("pins")}
                  >
                    {storageCopy.predictionsPinsTab}
                  </button>
                </div>

                {activePredictionTab === "settings" ? (
                  <div className="telegramControlPage_aiSection">
                    <div className="telegramControlPage_languageRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.language}
                      </span>
                      <div className="telegramControlPage_languageToggle">
                        <button
                          type="button"
                          className={`telegramControlPage_languageButton${
                            storageLanguage === "ar" ? " is-active" : ""
                          }`}
                          onClick={() => setStorageLanguage("ar")}
                        >
                          AR
                        </button>
                        <button
                          type="button"
                          className={`telegramControlPage_languageButton${
                            storageLanguage === "en" ? " is-active" : ""
                          }`}
                          onClick={() => setStorageLanguage("en")}
                        >
                          EN
                        </button>
                      </div>
                    </div>

                    <div className="telegramControlPage_dependencyBlock">
                      <span className="telegramControlPage_label">
                        {storageCopy.dependencies}
                      </span>
                      <div className="telegramControlPage_dependencyPicker">
                        <div className="telegramControlPage_dependencySection">
                          <span className="telegramControlPage_dependencySectionTitle">
                            Active
                          </span>
                          <div className="telegramControlPage_dependencyChipRow">
                            {selectedOptionalDependencies.length > 0
                              ? selectedOptionalDependencies.map(
                                  (dependency) => (
                                    <label
                                      key={dependency.key}
                                      className="telegramControlPage_dependencyToken is-active"
                                      title="Remove dependency"
                                    >
                                      <input
                                        type="checkbox"
                                        className="telegramControlPage_dependencyTokenInput"
                                        checked={true}
                                        onChange={() =>
                                          handleToggleDependency(dependency.key)
                                        }
                                      />
                                      <span>
                                        {(DEPENDENCY_LABELS[storageLanguage] ||
                                          DEPENDENCY_LABELS.en)[
                                          dependency.key
                                        ] || dependency.label}
                                      </span>
                                    </label>
                                  ),
                                )
                              : null}
                          </div>
                        </div>

                        <div className="telegramControlPage_dependencySection">
                          <span className="telegramControlPage_dependencySectionTitle">
                            Available
                          </span>
                          <div className="telegramControlPage_dependencyChipRow">
                            {availableDependencyOptions.map((dependency) => (
                              <label
                                key={dependency.key}
                                className="telegramControlPage_dependencyToken"
                                title="Add dependency"
                              >
                                <input
                                  type="checkbox"
                                  className="telegramControlPage_dependencyTokenInput"
                                  checked={false}
                                  onChange={() =>
                                    handleToggleDependency(dependency.key)
                                  }
                                />
                                <span>
                                  {(DEPENDENCY_LABELS[storageLanguage] ||
                                    DEPENDENCY_LABELS.en)[dependency.key] ||
                                    dependency.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="telegramControlPage_dependencyAddRow">
                        <input
                          type="text"
                          value={manualDependencyInput}
                          onChange={(event) =>
                            setManualDependencyInput(event.target.value)
                          }
                          placeholder={storageCopy.addDependencyPlaceholder}
                          className="telegramControlPage_input"
                        />
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleAddDependency}
                        >
                          {storageCopy.add}
                        </button>
                      </div>

                      {manualDependencies.length > 0 ? (
                        <div className="telegramControlPage_chipRow">
                          {manualDependencies.map((dependency) => (
                            <button
                              key={dependency}
                              type="button"
                              className="telegramControlPage_chip"
                              onClick={() =>
                                setManualDependencies((currentValue) =>
                                  currentValue.filter(
                                    (value) => value !== dependency,
                                  ),
                                )
                              }
                              title="Remove dependency"
                            >
                              {dependency}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activePredictionTab === "courses" ? (
                  <div className="telegramControlPage_aiSection">
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictCourses}
                      </span>
                      <div className="telegramControlPage_inlineActions">
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handlePredictCourses}
                          disabled={isCoursePredicting || !token}
                        >
                          {isCoursePredicting
                            ? storageCopy.predicting
                            : storageCopy.predict}
                        </button>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleDeleteStoredCoursePredictions}
                          disabled={
                            !token || storedCourseSuggestions.length === 0
                          }
                        >
                          {storageCopy.deletePredicted}
                        </button>
                      </div>
                    </div>

                    {courseSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {courseSuggestions.map((suggestion, index) => (
                          <article
                            key={`${String(
                              suggestion?.coursePayload?.course_name || "",
                            )}-${index}`}
                            className="telegramControlPage_predictionCard"
                          >
                            <div className="telegramControlPage_predictionCardTopRow">
                              <div className="telegramControlPage_predictionCardInfo">
                                <strong>
                                  {String(
                                    suggestion?.coursePayload?.course_name ||
                                      "Unnamed course",
                                  )}
                                </strong>
                                <span>
                                  Confidence:{" "}
                                  {Number(suggestion?.confidence || 0)}%
                                </span>
                              </div>
                              <div
                                className="telegramControlPage_decisionToggle"
                                role="group"
                                aria-label="Course prediction decision"
                              >
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                  onClick={() =>
                                    handleAcceptCoursePrediction(suggestion)
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                  onClick={() =>
                                    handleRejectCoursePrediction(suggestion)
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                            <div className="telegramControlPage_predictionMeta">
                              {Object.entries(suggestion?.coursePayload || {})
                                .filter(([, value]) =>
                                  Array.isArray(value)
                                    ? value.length > 0
                                    : String(value ?? "").trim() !== "",
                                )
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="telegramControlPage_predictionMetaRow"
                                  >
                                    <strong>{key}</strong>
                                    <span>
                                      {Array.isArray(value)
                                        ? value
                                            .map((item) =>
                                              typeof item === "object"
                                                ? JSON.stringify(item)
                                                : String(item),
                                            )
                                            .join(" | ")
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="telegramControlPage_hint">
                        {storageCopy.noCoursePredictions}
                      </p>
                    )}
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictedBucket}
                      </span>
                    </div>
                    {visibleStoredCourseSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {visibleStoredCourseSuggestions.map(
                          (suggestion, index) => (
                            <article
                              key={`stored-course-${String(
                                suggestion?.suggestionKey ||
                                  suggestion?.coursePayload?.course_name ||
                                  index,
                              )}`}
                              className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                            >
                              <div className="telegramControlPage_predictionCardTopRow">
                                <div className="telegramControlPage_predictionCardInfo">
                                  <strong>
                                    {String(
                                      suggestion?.coursePayload?.course_name ||
                                        "Unnamed course",
                                    )}
                                  </strong>
                                </div>
                                <div
                                  className="telegramControlPage_decisionToggle"
                                  role="group"
                                  aria-label="Stored course prediction decision"
                                >
                                  <button
                                    type="button"
                                    className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                    onClick={() =>
                                      handleAcceptCoursePrediction(suggestion)
                                    }
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                    onClick={() =>
                                      handleRejectCoursePrediction(suggestion)
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          {storageCopy.acceptedBucket}
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearAcceptedCoursePredictions}
                          disabled={
                            !token || acceptedCourseSuggestions.length === 0
                          }
                        >
                          {storageCopy.clearAccepted}
                        </button>
                      </div>
                      {acceptedCourseSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {acceptedCourseSuggestions.map(
                            (suggestion, index) => (
                              <article
                                key={`accepted-course-${String(
                                  suggestion?.suggestionKey ||
                                    suggestion?.coursePayload?.course_name ||
                                    index,
                                )}`}
                                className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                              >
                                <strong>
                                  {String(
                                    suggestion?.coursePayload?.course_name ||
                                      "Unnamed course",
                                  )}
                                </strong>
                              </article>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          Rejected
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearRejectedCoursePredictions}
                          disabled={
                            !token || rejectedCourseSuggestions.length === 0
                          }
                        >
                          Clear rejected
                        </button>
                      </div>
                      {rejectedCourseSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {rejectedCourseSuggestions.map(
                            (suggestion, index) => (
                              <article
                                key={`rejected-course-${String(
                                  suggestion?.suggestionKey ||
                                    suggestion?.coursePayload?.course_name ||
                                    index,
                                )}`}
                                className="telegramControlPage_predictionCard telegramControlPage_predictionCard--rejected"
                              >
                                <strong>
                                  {String(
                                    suggestion?.coursePayload?.course_name ||
                                      "Unnamed course",
                                  )}
                                </strong>
                              </article>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activePredictionTab === "lectures" ? (
                  <div className="telegramControlPage_aiSection">
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictLectures}
                      </span>
                      <div className="telegramControlPage_inlineActions">
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handlePredictLectures}
                          disabled={isLecturePredicting || !token}
                        >
                          {isLecturePredicting
                            ? storageCopy.predicting
                            : storageCopy.predict}
                        </button>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleDeleteStoredLecturePredictions}
                          disabled={
                            !token || storedLectureSuggestions.length === 0
                          }
                        >
                          {storageCopy.deletePredicted}
                        </button>
                      </div>
                    </div>

                    <select
                      value={selectedCourseName}
                      onChange={(event) =>
                        setSelectedCourseName(event.target.value)
                      }
                      className="telegramControlPage_input"
                    >
                      {courseSelectOptions.length === 0 ? (
                        <option value="">{storageCopy.noSavedCourses}</option>
                      ) : (
                        courseSelectOptions.map((courseName) => (
                          <option key={courseName} value={courseName}>
                            {courseName}
                          </option>
                        ))
                      )}
                    </select>

                    {lectureSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {lectureSuggestions.map((lecture, index) => (
                          <article
                            key={`${String(lecture?.lectureName || "")}-${index}`}
                            className="telegramControlPage_predictionCard"
                          >
                            <div className="telegramControlPage_predictionCardTopRow">
                              <div className="telegramControlPage_predictionCardInfo">
                                <strong>
                                  {String(
                                    lecture?.lectureName || "Unnamed lecture",
                                  )}
                                </strong>
                                <span>
                                  Confidence: {Number(lecture?.confidence || 0)}
                                  %
                                </span>
                              </div>
                              <div
                                className="telegramControlPage_decisionToggle"
                                role="group"
                                aria-label="Lecture prediction decision"
                              >
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                  onClick={() =>
                                    handleAcceptLecturePrediction(lecture)
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                  onClick={() =>
                                    handleRejectLecturePrediction(lecture)
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                            <div className="telegramControlPage_predictionMeta">
                              {Object.entries(lecture?.lecturePayload || {})
                                .filter(
                                  ([, value]) =>
                                    String(value ?? "").trim() !== "",
                                )
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="telegramControlPage_predictionMetaRow"
                                  >
                                    <strong>{key}</strong>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="telegramControlPage_hint">
                        {storageCopy.noLecturePredictions}
                      </p>
                    )}
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictedBucket}
                      </span>
                    </div>
                    {visibleStoredLectureSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {visibleStoredLectureSuggestions.map(
                          (lecture, index) => (
                            <article
                              key={`stored-lecture-${String(
                                lecture?.suggestionKey ||
                                  lecture?.lectureName ||
                                  index,
                              )}`}
                              className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                            >
                              <div className="telegramControlPage_predictionCardTopRow">
                                <div className="telegramControlPage_predictionCardInfo">
                                  <strong>
                                    {String(
                                      lecture?.lectureName || "Unnamed lecture",
                                    )}
                                  </strong>
                                </div>
                                <div
                                  className="telegramControlPage_decisionToggle"
                                  role="group"
                                  aria-label="Stored lecture prediction decision"
                                >
                                  <button
                                    type="button"
                                    className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                    onClick={() =>
                                      handleAcceptLecturePrediction(lecture)
                                    }
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                    onClick={() =>
                                      handleRejectLecturePrediction(lecture)
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          {storageCopy.acceptedBucket}
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearAcceptedLecturePredictions}
                          disabled={
                            !token || acceptedLectureSuggestions.length === 0
                          }
                        >
                          {storageCopy.clearAccepted}
                        </button>
                      </div>
                      {acceptedLectureSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {acceptedLectureSuggestions.map((lecture, index) => (
                            <article
                              key={`accepted-lecture-${String(
                                lecture?.suggestionKey ||
                                  lecture?.lectureName ||
                                  index,
                              )}`}
                              className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                            >
                              <strong>
                                {String(
                                  lecture?.lectureName || "Unnamed lecture",
                                )}
                              </strong>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          Rejected
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearRejectedLecturePredictions}
                          disabled={
                            !token || rejectedLectureSuggestions.length === 0
                          }
                        >
                          Clear rejected
                        </button>
                      </div>
                      {rejectedLectureSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {rejectedLectureSuggestions.map((lecture, index) => (
                            <article
                              key={`rejected-lecture-${String(
                                lecture?.suggestionKey ||
                                  lecture?.lectureName ||
                                  index,
                              )}`}
                              className="telegramControlPage_predictionCard telegramControlPage_predictionCard--rejected"
                            >
                              <strong>
                                {String(
                                  lecture?.lectureName || "Unnamed lecture",
                                )}
                              </strong>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activePredictionTab === "instructors" ? (
                  <div className="telegramControlPage_aiSection">
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictInstructors}
                      </span>
                      <div className="telegramControlPage_inlineActions">
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handlePredictInstructors}
                          disabled={isInstructorPredicting || !token}
                        >
                          {isInstructorPredicting
                            ? storageCopy.predicting
                            : storageCopy.predict}
                        </button>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleDeleteStoredInstructorPredictions}
                          disabled={
                            !token || storedInstructorSuggestions.length === 0
                          }
                        >
                          {storageCopy.deletePredicted}
                        </button>
                      </div>
                    </div>

                    {instructorSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {instructorSuggestions.map((instructor, index) => (
                          <article
                            key={`${String(instructor?.name || "")}-${index}`}
                            className="telegramControlPage_predictionCard"
                          >
                            <div className="telegramControlPage_predictionCardTopRow">
                              <div className="telegramControlPage_predictionCardInfo">
                                <strong>
                                  {String(
                                    instructor?.name || "Unnamed instructor",
                                  )}
                                </strong>
                                <span>
                                  {String(instructor?.role || "Instructor")} |
                                  Confidence:{" "}
                                  {Number(instructor?.confidence || 0)}%
                                </span>
                              </div>
                              <div
                                className="telegramControlPage_decisionToggle"
                                role="group"
                                aria-label="Instructor prediction decision"
                              >
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                  onClick={() =>
                                    handleAcceptInstructorPrediction(instructor)
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                  onClick={() =>
                                    handleRejectInstructorPrediction(instructor)
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                            <div className="telegramControlPage_predictionMeta">
                              <div className="telegramControlPage_predictionMetaRow">
                                <strong>courses</strong>
                                <span>
                                  {(Array.isArray(instructor?.courses)
                                    ? instructor.courses
                                    : []
                                  ).join(" | ") || "-"}
                                </span>
                              </div>
                              <div className="telegramControlPage_predictionMetaRow">
                                <strong>personality</strong>
                                <span>
                                  {String(instructor?.personality || "-")}
                                </span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="telegramControlPage_hint">
                        {storageCopy.noInstructorPredictions}
                      </p>
                    )}
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictedBucket}
                      </span>
                    </div>
                    {visibleStoredInstructorSuggestions.length > 0 ? (
                      <div className="telegramControlPage_predictionList">
                        {visibleStoredInstructorSuggestions.map(
                          (instructor, index) => (
                            <article
                              key={`stored-instructor-${String(
                                instructor?.suggestionKey ||
                                  instructor?.name ||
                                  index,
                              )}`}
                              className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                            >
                              <strong>
                                {String(
                                  instructor?.name || "Unnamed instructor",
                                )}
                              </strong>
                            </article>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          {storageCopy.acceptedBucket}
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearAcceptedInstructorPredictions}
                          disabled={
                            !token || acceptedInstructorSuggestions.length === 0
                          }
                        >
                          {storageCopy.clearAccepted}
                        </button>
                      </div>
                      {acceptedInstructorSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {acceptedInstructorSuggestions.map(
                            (instructor, index) => (
                              <article
                                key={`accepted-instructor-${String(
                                  instructor?.suggestionKey ||
                                    instructor?.name ||
                                    index,
                                )}`}
                                className="telegramControlPage_predictionCard telegramControlPage_predictionCard--stored"
                              >
                                <div className="telegramControlPage_predictionCardTopRow">
                                  <div className="telegramControlPage_predictionCardInfo">
                                    <strong>
                                      {String(
                                        instructor?.name ||
                                          "Unnamed instructor",
                                      )}
                                    </strong>
                                  </div>
                                  <div
                                    className="telegramControlPage_decisionToggle"
                                    role="group"
                                    aria-label="Stored instructor prediction decision"
                                  >
                                    <button
                                      type="button"
                                      className="telegramControlPage_decisionButton telegramControlPage_decisionButton--accept"
                                      onClick={() =>
                                        handleAcceptInstructorPrediction(
                                          instructor,
                                        )
                                      }
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      className="telegramControlPage_decisionButton telegramControlPage_decisionButton--reject"
                                      onClick={() =>
                                        handleRejectInstructorPrediction(
                                          instructor,
                                        )
                                      }
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="telegramControlPage_rejectedBlock">
                      <div className="telegramControlPage_sectionTitleRow">
                        <span className="telegramControlPage_label">
                          Rejected
                        </span>
                        <button
                          type="button"
                          className="telegramControlPage_button"
                          onClick={handleClearRejectedInstructorPredictions}
                          disabled={
                            !token || rejectedInstructorSuggestions.length === 0
                          }
                        >
                          Clear rejected
                        </button>
                      </div>
                      {rejectedInstructorSuggestions.length > 0 ? (
                        <div className="telegramControlPage_predictionList">
                          {rejectedInstructorSuggestions.map(
                            (instructor, index) => (
                              <article
                                key={`rejected-instructor-${String(
                                  instructor?.suggestionKey ||
                                    instructor?.name ||
                                    index,
                                )}`}
                                className="telegramControlPage_predictionCard telegramControlPage_predictionCard--rejected"
                              >
                                <strong>
                                  {String(
                                    instructor?.name || "Unnamed instructor",
                                  )}
                                </strong>
                              </article>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activePredictionTab === "pins" ? (
                  <div className="telegramControlPage_aiSection">
                    <div className="telegramControlPage_sectionTitleRow">
                      <span className="telegramControlPage_label">
                        {storageCopy.predictionsPinsTab}
                      </span>
                      <button
                        type="button"
                        className="telegramControlPage_button"
                        onClick={handleConceptualizeImportantMessage}
                        disabled={isConceptualizing || !token}
                      >
                        {isConceptualizing
                          ? storageCopy.thinking
                          : storageCopy.conceptualize}
                      </button>
                    </div>

                    <select
                      value={selectedImportantMessage}
                      onChange={(event) =>
                        setSelectedImportantMessage(event.target.value)
                      }
                      className="telegramControlPage_input"
                    >
                      {importantMessages.length === 0 ? (
                        <option value="">
                          {storageCopy.noImportantMessages}
                        </option>
                      ) : (
                        importantMessages.map((message) => (
                          <option
                            key={buildImportantMessageValue(message)}
                            value={buildImportantMessageValue(message)}
                          >
                            {`${String(
                              message?.groupTitle ||
                                message?.groupReference ||
                                "Stored group",
                            )} • ${String(message?.sender || "Unknown")}`}
                          </option>
                        ))
                      )}
                    </select>

                    {selectedImportantMessageRecord ? (
                      <p className="telegramControlPage_hint">
                        {String(
                          selectedImportantMessageRecord?.text || "[No text]",
                        ).slice(0, 180)}
                      </p>
                    ) : null}

                    {importantMessageConcept ? (
                      <div className="telegramControlPage_conceptCard">
                        <strong>
                          {importantMessageConcept.summary || "Summary"}
                        </strong>
                        {importantMessageConcept.keyIdeas?.length ? (
                          <ul>
                            {importantMessageConcept.keyIdeas.map((idea) => (
                              <li key={idea}>{idea}</li>
                            ))}
                          </ul>
                        ) : null}
                        {importantMessageConcept.academicRelevance ? (
                          <p>{importantMessageConcept.academicRelevance}</p>
                        ) : null}
                        {importantMessageConcept.nextAction ? (
                          <p>{importantMessageConcept.nextAction}</p>
                        ) : null}
                      </div>
                    ) : savedConcept ? (
                      <div className="telegramControlPage_conceptCard">
                        <strong>
                          {savedConcept.summary || "Saved concept"}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {storageFeedback ? (
              <p className="telegramControlPage_feedback">{storageFeedback}</p>
            ) : null}
          </aside>
          <section className="telegramControlPage_card telegramControlPage_card--stream">
            <div className="telegramControlPage_cardHeader">
              <h2>Telegram messages</h2>
              <span>{`${messages.length} ${storageCopy.shown}`}</span>
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
                    className="telegramControlPage_input"
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

                <label className="telegramControlPage_checkboxRow">
                  <input
                    type="checkbox"
                    checked={searchWithinSelectedGroup}
                    onChange={(event) =>
                      setSearchWithinSelectedGroup(event.target.checked)
                    }
                  />
                  <span>{storageCopy.selectedOnly}</span>
                </label>

                {searchWithinSelectedGroup ? (
                  <select
                    value={selectedStoredGroupReference}
                    onChange={(event) =>
                      setSelectedStoredGroupReference(event.target.value)
                    }
                    className="telegramControlPage_input"
                  >
                    {storedGroupOptions.length === 0 ? (
                      <option value="">{storageCopy.noStoredGroups}</option>
                    ) : (
                      storedGroupOptions.map((group) => (
                        <option
                          key={String(group?.groupReference || "")}
                          value={String(group?.groupReference || "")}
                        >
                          {formatTelegramGroupOptionLabel(group)}
                        </option>
                      ))
                    )}
                  </select>
                ) : null}

                {storageFeedback ? (
                  <p className="telegramControlPage_feedback">
                    {storageFeedback}
                  </p>
                ) : null}
              </div>

              <div className="telegramControlPage_stream">
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
                        {messageGroup.items.map((message) => (
                          <article
                            key={`${String(message?.groupReference || "")}-${message.id || `${message.sender || "unknown"}-${message.date || ""}`}`}
                            className={`telegramControlPage_message${
                              message?.isPinned ? " is-pinned" : ""
                            }`}
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
                            <p>{message.text || "[No text]"}</p>
                            {message.attachmentFileName ? (
                              <span className="telegramControlPage_attachmentLabel">
                                {message.attachmentFileName}
                              </span>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {hasMore && !isLoading && !error ? (
                <button
                  type="button"
                  className="telegramControlPage_button telegramControlPage_button--loadMore"
                  onClick={handleLoadMore}
                >
                  Load more
                </button>
              ) : null}
            </div>{" "}
            {/* close telegramControlPage_rightPool */}
          </section>{" "}
          {/* close telegramControlPage_card--stream */}
        </section>{" "}
        {/* close telegramControlPage_grid */}
      </div>{" "}
      {/* close telegramControlPage_shell */}
    </section>
  );
};

export default TelegramControlPage;
