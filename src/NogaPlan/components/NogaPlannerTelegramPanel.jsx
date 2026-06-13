import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.js?url";
import { apiUrl } from "../../config/api";
import { formatPlannerStatusLabel } from "../lib/plannerRuntime";
import { createWorker } from "tesseract.js";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const TRACE_MAIN_TABS = [
  { key: "material", label: "material of study" },
];

const MATERIAL_SOURCE_TABS = [
  { key: "telegram", label: "Telegram Documents" },
  { key: "upload", label: "User Upload" },
  { key: "physical", label: "Physical Document" },
];

const LANGUAGE_COMPONENT_CLASS_OPTIONS = ["Class", "Lab", "Pharmacy"];

const TELEGRAM_DOCUMENT_TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "text", label: "Text" },
  { key: "image", label: "Images" },
  { key: "pdf", label: "PDF" },
  { key: "word", label: "Word" },
  { key: "excel", label: "Excel" },
  { key: "powerpoint", label: "PowerPoint" },
  { key: "archive", label: "Archive" },
  { key: "code", label: "Code" },
  { key: "other", label: "Other" },
];

const TELEGRAM_STORED_MESSAGES_PAGE_SIZE = 40;

const normalizeInstructorSchemaEntry = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const firstName = String(entry?.firstName || "").trim();
  const lastName = String(entry?.lastName || "").trim();
  if (!firstName && !lastName) {
    return null;
  }
  return { firstName, lastName };
};

const buildInstructorSchemaEntry = (value = "") => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return null;
  }
  const separatorIndex = normalizedValue.indexOf(" ");
  return separatorIndex === -1
    ? { firstName: normalizedValue, lastName: "" }
    : {
        firstName: normalizedValue.slice(0, separatorIndex).trim(),
        lastName: normalizedValue.slice(separatorIndex + 1).trim(),
      };
};

const serializeInstructorSchemaEntry = (entry) => {
  const normalizedEntry = normalizeInstructorSchemaEntry(entry);
  if (!normalizedEntry) {
    return "";
  }
  return [normalizedEntry.firstName, normalizedEntry.lastName].filter(Boolean).join(" ");
};

const normalizeAiInstructorRecord = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const firstName = String(entry?.firstName || "").trim() || null;
  const lastName = String(entry?.lastName || "").trim() || null;
  const fullName = String(
    entry?.fullName || [firstName, lastName].filter(Boolean).join(" "),
  ).trim();

  if (!fullName) {
    return null;
  }

  return {
    firstName,
    lastName,
    fullName,
    personality: String(entry?.personality || "").trim() || null,
    evidence: Array.isArray(entry?.evidence)
      ? entry.evidence.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    confidence: ["high", "medium", "low"].includes(
      String(entry?.confidence || "").trim().toLowerCase(),
    )
      ? String(entry.confidence).trim().toLowerCase()
      : "low",
  };
};

const formatFileSize = (size = 0) => {
  const nextSize = Number(size || 0);
  if (!Number.isFinite(nextSize) || nextSize <= 0) {
    return "";
  }
  if (nextSize < 1024) {
    return `${nextSize} B`;
  }
  if (nextSize < 1024 * 1024) {
    return `${(nextSize / 1024).toFixed(1)} KB`;
  }
  return `${(nextSize / (1024 * 1024)).toFixed(1)} MB`;
};

const buildTelegramDocumentFilename = (message = {}) => {
  const explicitName = String(
    message?.attachmentFileName ||
      message?.telegramFileName ||
      message?.fileName ||
      message?.name ||
      message?.documentName ||
      message?.title ||
      "",
  ).trim();
  if (explicitName) {
    return explicitName;
  }
  const explicitExtension = String(
    message?.attachmentFileExtension || "",
  ).trim().toLowerCase();
  if (explicitExtension) {
    const messageId = Number(message?.id || 0) || Date.now();
    return `telegram-document-${messageId}.${explicitExtension.replace(/^\./, "")}`;
  }
  const mimeType = String(
    message?.attachmentMimeType || message?.mimeType || "",
  )
    .trim()
    .toLowerCase();
  const extension =
    mimeType.startsWith("image/")
      ? mimeType.split("/").pop() || "jpg"
      : mimeType === "application/pdf"
        ? "pdf"
        : mimeType.includes("word")
          ? "docx"
          : mimeType.includes("excel") || mimeType.includes("spreadsheet")
            ? "xlsx"
            : mimeType.includes("powerpoint") || mimeType.includes("presentation")
              ? "pptx"
              : mimeType.includes("zip") || mimeType.includes("rar")
                ? "zip"
                : "bin";
  const messageId = Number(message?.id || 0) || Date.now();
  return `telegram-document-${messageId}.${extension}`;
};

const getFileNameWithoutExtension = (filename = "") => {
  const nextFilename = String(filename || "").trim();
  if (!nextFilename) {
    return "";
  }
  const lastDotIndex = nextFilename.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return nextFilename;
  }
  return nextFilename.slice(0, lastDotIndex);
};

const classifyTelegramDocumentType = (message = {}) => {
  const attachmentKind = String(message?.attachmentKind || "")
    .trim()
    .toLowerCase();
  const fileName = buildTelegramDocumentFilename(message).toLowerCase();
  const mimeType = String(
    message?.attachmentMimeType || message?.mimeType || "",
  )
    .trim()
    .toLowerCase();
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()
    : String(message?.attachmentFileExtension || "")
        .trim()
        .toLowerCase()
        .replace(/^\./, "");

  if (!attachmentKind || attachmentKind === "text") {
    return "text";
  }
  if (attachmentKind === "photo" || mimeType.startsWith("image/")) {
    return "image";
  }
  if (
    extension === "pdf" ||
    mimeType === "application/pdf"
  ) {
    return "pdf";
  }
  if (
    ["doc", "docx", "odt", "rtf"].includes(extension) ||
    mimeType.includes("word") ||
    mimeType.includes("officedocument.wordprocessingml") ||
    mimeType.includes("opendocument.text") ||
    mimeType.includes("rtf")
  ) {
    return "word";
  }
  if (
    ["xls", "xlsx", "csv", "ods"].includes(extension) ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("csv")
  ) {
    return "excel";
  }
  if (
    ["ppt", "pptx", "odp"].includes(extension) ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation")
  ) {
    return "powerpoint";
  }
  if (
    ["zip", "rar", "7z", "tar", "gz"].includes(extension) ||
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("compressed")
  ) {
    return "archive";
  }
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "cs",
      "php",
      "html",
      "css",
      "json",
      "xml",
      "yml",
      "yaml",
      "md",
      "sql",
      "sh",
    ].includes(extension) ||
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml")
  ) {
    return "code";
  }
  if (attachmentKind === "pdf") {
    return "pdf";
  }
  return "other";
};

const formatKnownTelegramDocumentType = (typeKey = "") => {
  const normalized = String(typeKey || "").trim().toLowerCase();
  const labelMap = {
    text: "Text",
    image: "Image",
    pdf: "PDF",
    word: "Word",
    excel: "Excel",
    powerpoint: "PowerPoint",
    archive: "Archive",
    code: "Code",
    other: "Other",
    all: "All",
  };
  return labelMap[normalized] || "Other";
};

const formatStoredMediaErrorMessage = (payload = {}, fallbackMessage = "") => {
  const reason = String(payload?.reason || "")
    .trim()
    .toLowerCase();
  if (reason === "stored-message-mismatch") {
    return "Media entry does not match stored group/message id.";
  }
  if (reason === "telegram-download-empty") {
    return "Telegram returned no media bytes for this message.";
  }
  if (reason === "telegram-timeout") {
    return "Telegram media fetch timed out. Try again.";
  }
  if (reason === "telegram-download-failed") {
    return "Telegram media download failed. Reconnect Telegram and try again.";
  }
  return String(payload?.message || fallbackMessage || "Unable to load Telegram media.");
};

const isTelegramPdfDocument = (message = {}) =>
  classifyTelegramDocumentType(message) === "pdf";

const isTelegramImageDocument = (message = {}) =>
  classifyTelegramDocumentType(message) === "image";

const NogaPlannerTelegramPanel = ({
  planner,
  mode = "default",
  languageSection = "all",
}) => {
  const [traceMainTab, setTraceMainTab] = useState("material");
  const [materialSourceTab, setMaterialSourceTab] = useState("telegram");
  const [documentTypeTab, setDocumentTypeTab] = useState("all");
  const [storedGroups, setStoredGroups] = useState([]);
  const [selectedGroupReference, setSelectedGroupReference] = useState("");
  const [selectedLectureKey, setSelectedLectureKey] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [messagesFilteredTotalCount, setMessagesFilteredTotalCount] = useState(0);
  const [messagesRawCount, setMessagesRawCount] = useState(0);
  const [messagesTypeCounts, setMessagesTypeCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingMessageId, setDownloadingMessageId] = useState("");
  const [activeTelegramRowActionKey, setActiveTelegramRowActionKey] = useState("");
  const [telegramImagePreviewUrls, setTelegramImagePreviewUrls] = useState({});
  const [ocrLoadingMessageId, setOcrLoadingMessageId] = useState("");
  const [ocrExtractedByMessageId, setOcrExtractedByMessageId] = useState({});
  const [zoomedTraceImageUrl, setZoomedTraceImageUrl] = useState("");
  const [selectedPreviewMessageKey, setSelectedPreviewMessageKey] = useState("");
  const [previewFileUrl, setPreviewFileUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewPdfDocument, setPreviewPdfDocument] = useState(null);
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const [previewPageNumber, setPreviewPageNumber] = useState(1);
  const [pdfPaneMode, setPdfPaneMode] = useState("pdf");
  const [selectedTextPreviewMessage, setSelectedTextPreviewMessage] = useState(null);
  const [findInstructorsResults, setFindInstructorsResults] = useState([]);
  const [isFindingInstructors, setIsFindingInstructors] = useState(false);
  const [findInstructorsError, setFindInstructorsError] = useState("");
  const [extractCourseNamesResults, setExtractCourseNamesResults] = useState([]);
  const [isExtractingCourseNames, setIsExtractingCourseNames] = useState(false);
  const [extractCourseNamesError, setExtractCourseNamesError] = useState("");
  const [isSyncingPinned, setIsSyncingPinned] = useState(false);
  const telegramImagePreviewUrlsRef = useRef({});
  const telegramImagePreviewBlobUrlsRef = useRef(new Set());
  const previewObjectUrlRef = useRef("");
  const previewCanvasRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [physicalDraft, setPhysicalDraft] = useState({
    title: "",
    volume: "",
    note: "",
  });
  const [physicalDocuments, setPhysicalDocuments] = useState([]);
  const [languageCourseDraft, setLanguageCourseDraft] = useState({
    name: "",
    code: "",
    componentClass: "",
    componentClasses: [],
  });
  const [languageLectureDraft, setLanguageLectureDraft] = useState({
    name: "",
    order: "",
  });
  const [languageLectures, setLanguageLectures] = useState([]);
  const [selectedLanguageCourseId, setSelectedLanguageCourseId] = useState("");
  const [selectedLanguageLectureId, setSelectedLanguageLectureId] = useState("");
  const plannerToken = String(planner?.props?.state?.token || "").trim();
  const plannerUserId = String(planner?.props?.state?.my_id || "").trim();

  const languageCourses = useMemo(() => {
    const plannerCourses = Array.isArray(planner?.state?.courses)
      ? planner.state.courses
      : [];
    const mappedCourses = plannerCourses.map((entry) => {
        const componentClasses = Array.from(
          new Set(
            (Array.isArray(entry?.components) ? entry.components : [])
              .map((componentEntry) =>
                String(
                  componentEntry?.component_class || componentEntry?.class || "",
                ).trim(),
              )
              .filter(Boolean),
          ),
        );
        const fallbackComponentClassValue = String(
          entry?.course_class || entry?.course_component || "",
        ).trim();
        const resolvedComponentClasses =
          componentClasses.length > 0
            ? componentClasses
            : fallbackComponentClassValue
              ? [fallbackComponentClassValue]
              : [];
        return {
          id: String(entry?.parentCourseId || entry?._id || "").trim(),
          name: String(entry?.name || entry?.course_name || "").trim(),
          code: String(entry?.code || entry?.course_code || "").trim(),
          componentClass: String(resolvedComponentClasses[0] || "").trim(),
          componentClasses: resolvedComponentClasses,
          raw: entry,
        };
      });

    const dedupedById = new Map();
    mappedCourses.forEach((entry) => {
      if (!entry?.id) {
        return;
      }
      const existing = dedupedById.get(entry.id);
      if (!existing) {
        dedupedById.set(entry.id, entry);
        return;
      }
      const nextComponentClasses = Array.from(
        new Set([
          ...(Array.isArray(existing?.componentClasses)
            ? existing.componentClasses
            : []),
          ...(Array.isArray(entry?.componentClasses)
            ? entry.componentClasses
            : []),
        ]),
      ).filter((value) => String(value || "").trim());
      dedupedById.set(entry.id, {
        ...existing,
        name: String(existing?.name || "").trim() || String(entry?.name || "").trim(),
        code: String(existing?.code || "").trim() || String(entry?.code || "").trim(),
        componentClass: String(nextComponentClasses[0] || "").trim(),
        componentClasses: nextComponentClasses,
      });
    });

    return Array.from(dedupedById.values());
  }, [planner?.state?.courses]);

  const plannerLectureRows = useMemo(() => {
    if (!planner?.getPlannerMaterialMetadataLectureRows || !planner?.getResolvedPlannerRoot) {
      return [];
    }
    try {
      return planner.getPlannerMaterialMetadataLectureRows(planner.getResolvedPlannerRoot()) || [];
    } catch {
      return [];
    }
  }, [planner?.state?.plannerRoot]);

  const plannerCourseOptions = useMemo(() => {
    if (!planner?.getPlannerMaterialMetadataCourseRows || !planner?.getResolvedPlannerRoot) {
      return [];
    }
    try {
      const rows = planner.getPlannerMaterialMetadataCourseRows(planner.getResolvedPlannerRoot()) || [];
      const seen = new Set();
      return rows.reduce((acc, row) => {
        const name = String(row?.courseName || "").trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          acc.push({ name, code: String(row?.courseCode || "").trim() });
        }
        return acc;
      }, []);
    } catch {
      return [];
    }
  }, [planner?.state?.plannerRoot]);

  const activeTraceSourceLabel = useMemo(
    () =>
      MATERIAL_SOURCE_TABS.find((entry) => entry.key === materialSourceTab)?.label ||
      "Trace Source",
    [materialSourceTab],
  );
  const telegramDocumentMessages = useMemo(
    () => (Array.isArray(messages) ? messages : []),
    [messages],
  );
  const telegramDocumentTypeCounts = useMemo(() => {
    const counts = {
      all: telegramDocumentMessages.length,
      text: 0,
      image: 0,
      pdf: 0,
      word: 0,
      excel: 0,
      powerpoint: 0,
      archive: 0,
      code: 0,
      other: 0,
    };
    telegramDocumentMessages.forEach((message) => {
      const typeKey = classifyTelegramDocumentType(message);
      counts[typeKey] = Number(counts[typeKey] || 0) + 1;
    });
    return counts;
  }, [telegramDocumentMessages]);
  const filteredTelegramDocumentMessages = useMemo(() => {
    const base = documentTypeTab === "all"
      ? telegramDocumentMessages
      : documentTypeTab === "pinned"
        ? telegramDocumentMessages.filter((message) => Boolean(message?.pinned))
        : telegramDocumentMessages.filter(
            (message) => classifyTelegramDocumentType(message) === documentTypeTab,
          );
    const groupedIdCounts = new Map();
    base.forEach((message) => {
      const gid = String(message?.groupedId || "").trim();
      if (gid) groupedIdCounts.set(gid, (groupedIdCounts.get(gid) || 0) + 1);
    });
    const seenGroupedIds = new Set();
    return base.map((message) => {
      const gid = String(message?.groupedId || "").trim();
      if (!gid || groupedIdCounts.get(gid) <= 1) return message;
      const count = groupedIdCounts.get(gid);
      const isFirst = !seenGroupedIds.has(gid);
      if (isFirst) seenGroupedIds.add(gid);
      return {
        ...message,
        _groupRowSpan: isFirst ? count : 0,
        _groupIsFirst: isFirst,
      };
    });
  }, [documentTypeTab, telegramDocumentMessages]);

  useEffect(() => {
    telegramImagePreviewUrlsRef.current = telegramImagePreviewUrls;
  }, [telegramImagePreviewUrls]);

  useEffect(() => {
    return () => {
      const previewObjectUrl = String(previewObjectUrlRef.current || "").trim();
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (planner) {
      planner.setState({
        telegramSelectedGroupReference: selectedGroupReference,
        telegramHasStoredGroups: storedGroups.length > 0,
      });
    }
  }, [selectedGroupReference, storedGroups]);

  const getTelegramMessageMediaKey = (message = {}) =>
    `${String(message?.groupReference || "").trim()}::${Number(message?.id || 0)}`;

  const selectedPreviewMessage = useMemo(
    () =>
      filteredTelegramDocumentMessages.find(
        (message) =>
          getTelegramMessageMediaKey(message) === selectedPreviewMessageKey,
      ) || null,
    [filteredTelegramDocumentMessages, selectedPreviewMessageKey],
  );
  const selectedPreviewSourceKey = useMemo(() => {
    if (!selectedPreviewMessage) return "";
    if (isTelegramPdfDocument(selectedPreviewMessage) || isTelegramImageDocument(selectedPreviewMessage)) {
      return getTelegramMessageMediaKey(selectedPreviewMessage);
    }
    return "";
  }, [selectedPreviewMessage]);

  const languageComponentClassOptions = LANGUAGE_COMPONENT_CLASS_OPTIONS;

  const formatStoredGroupOptionLabel = (group = {}) => {
    const title = String(group?.title || "").trim();
    const reference = String(
      group?.groupReference || group?.reference || group?.username || "",
    ).trim();
    if (title && reference) {
      return `${title} (${reference})`;
    }
    return title || reference || "Telegram group";
  };

  const formatTelegramMessageDate = (value) => {
    const nextDate = value ? new Date(value) : null;
    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return "";
    }
    return nextDate.toLocaleString();
  };

  const getStoredGroupLabelByReference = (groupReferenceValue = "") => {
    const targetRef = String(groupReferenceValue || "").trim();
    if (!targetRef) {
      return "-";
    }
    const matchedGroup = storedGroups.find(
      (groupEntry) =>
        String(groupEntry?.groupReference || "").trim() === targetRef,
    );
    return matchedGroup
      ? formatStoredGroupOptionLabel(matchedGroup)
      : targetRef;
  };

  const normalizeArabicName = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word
          .replace(/^[أإآٱ]/u, "ا")
          .replace(/ة$/u, "ه")
          .replace(/ى$/u, "ي"),
      )
      .join(" ");

  // Matches instructor keyword as a whole word; slices message text at the keyword
  // so any sender name preceding it is excluded from the AI input.
  const INSTRUCTOR_KW_RE =
    /(?:^|(?<=\s))(الدكتورة|الدكتوره|الدكتور|دكتورة|دكتوره|دكتور|الأستاذة|الأستاذه|الأستاذ|الاستاذة|الاستاذه|الاستاذ|أستاذة|أستاذه|أستاذ|استاذة|استاذه|استاذ|د\.?)(?=\s|$)/u;

  const findInstructors = async () => {
    setPdfPaneMode("instructors");
    setFindInstructorsResults([]);
    setFindInstructorsError("");
    if (!plannerToken) {
      setFindInstructorsError("Login token is missing.");
      return;
    }
    const groupReference = String(selectedGroupReference || "").trim();
    if (!groupReference) {
      setFindInstructorsError("Select a group first.");
      return;
    }
    setIsFindingInstructors(true);
    try {
      // Step 1: fetch messages from the selected group only
      const searchParams = new URLSearchParams();
      searchParams.set("group", groupReference);
      searchParams.set("limit", "all");
      searchParams.set("offset", "0");
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        { headers: { Authorization: `Bearer ${plannerToken}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFindInstructorsError(String(payload?.error || "Failed to load group messages."));
        return;
      }
      const groupMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const allTexts = [];
      for (const message of groupMessages) {
        const rawText = String(message?.text || "").trim();
        if (!rawText) continue;
        const match = INSTRUCTOR_KW_RE.exec(rawText);
        if (!match) continue;
        allTexts.push(rawText.slice(match.index).trim());
      }

      if (allTexts.length === 0) {
        setFindInstructorsResults([]);
        return;
      }

      // Step 2: send all texts to the AI endpoint in one call
      const aiResponse = await fetch(apiUrl("/api/telegram/ai/extract-instructors"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${plannerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: allTexts }),
      });
      const aiPayload = await aiResponse.json().catch(() => ({}));
      if (!aiResponse.ok) {
        setFindInstructorsError(String(aiPayload?.error || "AI extraction failed."));
        return;
      }

      const programInstructorNames = Array.isArray(aiPayload?.programInstructorNames)
        ? aiPayload.programInstructorNames
        : [];
      const nameSet = new Set();
      const results = [];
      for (const raw of programInstructorNames) {
        const normalizedRecord = normalizeAiInstructorRecord(raw);
        const name = normalizeArabicName(String(normalizedRecord?.fullName || "").trim());
        if (!name || nameSet.has(name)) continue;
        nameSet.add(name);
        results.push({
          ...normalizedRecord,
          fullName: String(normalizedRecord?.fullName || "").trim(),
          displayName: String(normalizedRecord?.fullName || "").trim(),
          groupLabel: "",
        });
      }
      setFindInstructorsResults(results);
      if (results.length > 0 && planner?.persistStudyPlannerMeta) {
        try {
          const currentExtractions = Array.isArray(planner?.state?.plannerRoot?.programAIExtractions)
            ? planner.state.plannerRoot.programAIExtractions
            : [];
          const nextExtractions = [
            ...currentExtractions,
            {
              extractionGoal: "instructors",
              programInstructorNames: results.map((result) => ({
                firstName: result?.firstName || null,
                lastName: result?.lastName || null,
                fullName: String(result?.fullName || "").trim(),
                personality: result?.personality || null,
                evidence: Array.isArray(result?.evidence) ? result.evidence : [],
                confidence: result?.confidence || "low",
              })),
              extractionTimestamp: new Date().toISOString(),
            },
          ];
          const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programAIExtractions: nextExtractions });
          if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
            planner.setState({ plannerRoot: nextPlannerRoot });
          }
        } catch (_) {}
      }
    } catch (err) {
      setFindInstructorsError(err?.message || "Search failed.");
    } finally {
      setIsFindingInstructors(false);
    }
  };

  const syncPinnedMessages = async () => {
    const groupReference = String(selectedGroupReference || "").trim();
    if (!plannerToken || !groupReference) return;
    setIsSyncingPinned(true);
    try {
      const response = await fetch(
        apiUrl(`/api/telegram/stored-groups/${encodeURIComponent(groupReference)}/sync-pinned`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${plannerToken}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(String(payload?.message || "Pinned sync failed."));
        return;
      }
      await searchStoredMessages({ reset: true });
    } catch (err) {
      setError(String(err?.message || "Pinned sync failed."));
    } finally {
      setIsSyncingPinned(false);
    }
  };

  const addInstructorToPlanner = async (result) => {
    const currentInstructors = Array.isArray(planner?.state?.plannerRoot?.programInstructors)
      ? planner.state.plannerRoot.programInstructors
      : [];
    const nextInstructorEntry =
      normalizeInstructorSchemaEntry({
        firstName: String(result?.firstName || "").trim(),
        lastName: String(result?.lastName || "").trim(),
      }) || buildInstructorSchemaEntry(String(result?.fullName || "").trim());
    if (!nextInstructorEntry) {
      return;
    }
    const nextInstructors = [...currentInstructors, nextInstructorEntry];
    try {
      const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programInstructors: nextInstructors });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
    } catch (err) {
      planner.props?.serverReply?.(String(err?.message || "Failed to add instructor."));
    }
  };

  const deleteDuplicateInstructors = async () => {
    const currentInstructors = Array.isArray(planner?.state?.plannerRoot?.programInstructors)
      ? planner.state.plannerRoot.programInstructors
      : [];
    const deduped = Array.from(
      new Map(
        currentInstructors
          .map((entry) => {
            const normalizedEntry = normalizeInstructorSchemaEntry(entry);
            if (!normalizedEntry) {
              return null;
            }
            const key = serializeInstructorSchemaEntry(normalizedEntry);
            return key ? [key, normalizedEntry] : null;
          })
          .filter(Boolean),
      ).values(),
    );
    try {
      const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programInstructors: deduped });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
    } catch (err) {
      planner.props?.serverReply?.(String(err?.message || "Failed to deduplicate instructors."));
    }
  };

  const extractCourseNames = async () => {
    setPdfPaneMode("courses");
    setExtractCourseNamesResults([]);
    setExtractCourseNamesError("");
    if (!plannerToken) {
      setExtractCourseNamesError("Login token is missing.");
      return;
    }
    const groupReference = String(selectedGroupReference || "").trim();
    if (!groupReference) {
      setExtractCourseNamesError("Select a group first.");
      return;
    }
    setIsExtractingCourseNames(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("group", groupReference);
      searchParams.set("limit", "all");
      searchParams.set("offset", "0");
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        { headers: { Authorization: `Bearer ${plannerToken}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setExtractCourseNamesError(String(payload?.error || "Failed to load group messages."));
        return;
      }
      const groupMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const allTexts = groupMessages
        .map((m) => String(m?.text || "").trim())
        .filter(Boolean);
      if (allTexts.length === 0) {
        setExtractCourseNamesResults([]);
        return;
      }
      const aiResponse = await fetch(apiUrl("/api/telegram/ai/extract-courses"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${plannerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: allTexts }),
      });
      const aiPayload = await aiResponse.json().catch(() => ({}));
      if (!aiResponse.ok) {
        setExtractCourseNamesError(String(aiPayload?.error || "AI extraction failed."));
        return;
      }
      const courses = Array.isArray(aiPayload?.courses) ? aiPayload.courses : [];
      const nameSet = new Set();
      const results = [];
      for (const entry of courses) {
        const courseName = String(entry?.courseName || "").trim();
        if (!courseName || nameSet.has(courseName)) continue;
        nameSet.add(courseName);
        results.push({ courseName, courseCode: String(entry?.courseCode || "").trim() });
      }
      setExtractCourseNamesResults(results);
      if (results.length > 0 && planner?.persistStudyPlannerMeta) {
        try {
          const currentExtractions = Array.isArray(planner?.state?.plannerRoot?.programAIExtractions)
            ? planner.state.plannerRoot.programAIExtractions
            : [];
          const nextExtractions = [
            ...currentExtractions,
            {
              extractionGoal: "courses",
              extractionItems: results.map((r) =>
                [String(r?.courseName || "").trim(), String(r?.courseCode || "").trim()]
                  .filter(Boolean)
                  .join(" — ")
              ),
              extractionTimestamp: new Date().toISOString(),
            },
          ];
          const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programAIExtractions: nextExtractions });
          if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
            planner.setState({ plannerRoot: nextPlannerRoot });
          }
        } catch (_) {}
      }
    } catch (err) {
      setExtractCourseNamesError(String(err?.message || "Extraction failed."));
    } finally {
      setIsExtractingCourseNames(false);
    }
  };

  const addCourseToPlanner = async ({ courseName, courseCode }) => {
    const current = Array.isArray(planner?.state?.plannerRoot?.programCoursesNamesCodes)
      ? planner.state.plannerRoot.programCoursesNamesCodes
      : [];
    const next = [...current, { courseName, courseCode }];
    try {
      const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programCoursesNamesCodes: next });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
    } catch (err) {
      planner.props?.serverReply?.(String(err?.message || "Failed to add course."));
    }
  };

  const deleteDuplicateCourseNames = async () => {
    const current = Array.isArray(planner?.state?.plannerRoot?.programCoursesNamesCodes)
      ? planner.state.plannerRoot.programCoursesNamesCodes
      : [];
    const seen = new Set();
    const deduped = current.filter((entry) => {
      const key = `${String(entry?.courseName || "").trim()}|${String(entry?.courseCode || "").trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    try {
      const nextPlannerRoot = await planner.persistStudyPlannerMeta({ programCoursesNamesCodes: deduped });
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
    } catch (err) {
      planner.props?.serverReply?.(String(err?.message || "Failed to deduplicate course names."));
    }
  };

  const fetchStoredGroups = async () => {
    if (!plannerToken) {
      setError("Telegram login token is missing.");
      setStoredGroups([]);
      return [];
    }
    try {
      const response = await fetch(apiUrl("/api/telegram/stored-groups"), {
        headers: {
          Authorization: `Bearer ${plannerToken}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram groups.");
      }
      const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
      setStoredGroups(nextGroups);
      setSelectedGroupReference((currentValue) => {
        const currentRef = String(currentValue || "").trim();
        if (
          currentRef &&
          nextGroups.some(
            (group) => String(group?.groupReference || "").trim() === currentRef,
          )
        ) {
          return currentValue;
        }
        return String(nextGroups[0]?.groupReference || "");
      });
      return nextGroups;
    } catch (nextError) {
      setStoredGroups([]);
      setError(nextError?.message || "Unable to load Telegram groups.");
      return [];
    }
  };

  const searchStoredMessages = async ({
    groupReferenceOverride = "",
    reset = true,
  } = {}) => {
    const groupReference = String(
      groupReferenceOverride || selectedGroupReference || "",
    ).trim();
    if (!plannerToken) {
      setError("Telegram login token is missing.");
      return;
    }
    if (!groupReference) {
      setMessages([]);
      setMessagesTypeCounts({});
      setError("Choose a stored group first.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const searchParams = new URLSearchParams();
      const nextOffset = reset ? 0 : Math.max(0, Number(messagesOffset || 0));
      searchParams.set("limit", String(TELEGRAM_STORED_MESSAGES_PAGE_SIZE));
      searchParams.set("offset", String(nextOffset));
      searchParams.set("group", groupReference);
      const selectedLecture = selectedLectureKey
        ? plannerLectureRows.find((l) => String(l?.key || "").trim() === selectedLectureKey) || null
        : null;
      const lectureTerm = selectedLecture
        ? String(selectedLecture.lectureName || "").trim()
        : "";
      const courseTerm = String(selectedCourseName || "").trim();
      const combinedQuery = [String(searchQuery || "").trim(), courseTerm, lectureTerm]
        .filter(Boolean)
        .join(" ");
      if (combinedQuery) {
        searchParams.set("q", combinedQuery);
      }
      if (documentTypeTab && documentTypeTab !== "all") {
        searchParams.set("attachmentType", documentTypeTab);
        searchParams.set("limit", "all");
      }
      const response = await fetch(
        apiUrl(`/api/telegram/stored-group-messages?${searchParams.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${plannerToken}`,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load Telegram messages.");
      }
      const nextMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      setMessages((currentValue) =>
        reset ? nextMessages : [...currentValue, ...nextMessages],
      );
      setMessagesOffset(Number(payload?.nextOffset || 0));
      setMessagesHasMore(Boolean(payload?.hasMore));
      setMessagesFilteredTotalCount(
        Number(payload?.filteredTotalCount || nextMessages.length || 0),
      );
      setMessagesRawCount(Number(payload?.rawCount || 0));
      if (payload?.typeCounts && typeof payload.typeCounts === "object") {
        setMessagesTypeCounts(reset ? payload.typeCounts : (prev) => {
          const merged = { ...prev };
          Object.entries(payload.typeCounts).forEach(([k, v]) => {
            merged[k] = Number(v || 0);
          });
          return merged;
        });
      }
    } catch (nextError) {
      setMessages([]);
      setMessagesOffset(0);
      setMessagesHasMore(false);
      setMessagesFilteredTotalCount(0);
      setMessagesRawCount(0);
      setMessagesTypeCounts({});
      setError(nextError?.message || "Unable to load Telegram messages.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTelegramDocument = async (message = {}) => {
    const groupReference = String(message?.groupReference || "").trim();
    const messageId = Number(message?.id || 0);
    if (!plannerToken || !groupReference || !messageId) {
      return;
    }
    const downloadKey = `${groupReference}::${messageId}`;
    setDownloadingMessageId(downloadKey);
    try {
      const params = new URLSearchParams({
        groupReference,
        messageId: String(messageId),
      });
      const response = await fetch(
        apiUrl(`/api/telegram/stored-media?${params.toString()}`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
          },
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          formatStoredMediaErrorMessage(
            payload,
            "Unable to download Telegram document.",
          ),
        );
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = buildTelegramDocumentFilename(message);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (nextError) {
      setError(
        String(nextError?.message || "Unable to download Telegram document."),
      );
    } finally {
      setDownloadingMessageId("");
    }
  };

  const runTelegramImageOcr = async (message = {}) => {
    const groupReference = String(message?.groupReference || "").trim();
    const messageId = Number(message?.id || 0);
    if (!plannerToken || !groupReference || !messageId || !isTelegramImageDocument(message)) {
      return;
    }
    const messageKey = getTelegramMessageMediaKey(message);
    setOcrLoadingMessageId(messageKey);
    try {
      const params = new URLSearchParams({
        groupReference,
        messageId: String(messageId),
      });
      const response = await fetch(
        apiUrl(`/api/telegram/stored-media?${params.toString()}`),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
          },
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          formatStoredMediaErrorMessage(payload, "Unable to load image for OCR."),
        );
      }
      const imageBlob = await response.blob();
      const worker = await createWorker("ara+eng");
      const {
        data: { text: extractedText },
      } = await worker.recognize(imageBlob);
      await worker.terminate();
      const normalizedText = String(extractedText || "").trim();
      setOcrExtractedByMessageId((currentValue) => ({
        ...currentValue,
        [messageKey]: normalizedText || "(No text detected)",
      }));
    } catch (nextError) {
      setError(String(nextError?.message || "Unable to extract OCR text."));
    } finally {
      setOcrLoadingMessageId("");
    }
  };

  const viewTelegramDocument = async (message = {}) => {
    const groupReference = String(message?.groupReference || "").trim();
    const messageId = Number(message?.id || 0);
    if (!groupReference || !messageId) {
      return;
    }
    if (isTelegramPdfDocument(message)) {
      const params = new URLSearchParams({
        source: "telegram",
        groupReference,
        messageId: String(messageId),
        title: buildTelegramDocumentFilename(message),
      });
      window.open(`/phenomed/pdf-reader?${params.toString()}`, "_blank");
      return;
    }
    if (!isTelegramImageDocument(message)) {
      return;
    }
    const params = new URLSearchParams({
      source: "telegram",
      groupReference,
      messageId: String(messageId),
      title: buildTelegramDocumentFilename(message),
    });
    window.open(`/phenomed/pdf-reader?${params.toString()}`, "_blank");
  };

  useEffect(() => {
    if (traceMainTab !== "material" || materialSourceTab !== "telegram") {
      setSelectedPreviewMessageKey("");
      setPreviewError("");
      return;
    }

    const availablePdfMessages = filteredTelegramDocumentMessages.filter((message) =>
      isTelegramPdfDocument(message),
    );

    const availablePreviewMessages = filteredTelegramDocumentMessages.filter(
      (message) => isTelegramPdfDocument(message) || isTelegramImageDocument(message),
    );

    if (availablePreviewMessages.length === 0) {
      setSelectedPreviewMessageKey("");
      return;
    }

    const selectedStillExists = availablePreviewMessages.some(
      (message) =>
        getTelegramMessageMediaKey(message) === selectedPreviewMessageKey,
    );

    if (!selectedStillExists) {
      setSelectedPreviewMessageKey(
        getTelegramMessageMediaKey(availablePdfMessages[0] || availablePreviewMessages[0]),
      );
    }
  }, [
    filteredTelegramDocumentMessages,
    materialSourceTab,
    selectedPreviewMessageKey,
    traceMainTab,
  ]);

  useEffect(() => {
    let isCancelled = false;
    const currentPreviewObjectUrl = String(previewObjectUrlRef.current || "").trim();
    if (currentPreviewObjectUrl) {
      URL.revokeObjectURL(currentPreviewObjectUrl);
      previewObjectUrlRef.current = "";
    }

    setPreviewFileUrl("");
    setPreviewError("");
    setPreviewLoading(false);
    setPreviewPdfDocument((currentDocument) => {
      currentDocument?.destroy?.().catch?.(() => {});
      return null;
    });
    setPreviewPageCount(0);
    setPreviewPageNumber(1);
    const canvasNode = previewCanvasRef.current;
    const canvasContext = canvasNode?.getContext?.("2d");
    if (canvasNode && canvasContext) {
      canvasContext.clearRect(0, 0, canvasNode.width || 0, canvasNode.height || 0);
      canvasNode.width = 0;
      canvasNode.height = 0;
    }

    if (!selectedPreviewMessage || !isTelegramPdfDocument(selectedPreviewMessage)) {
      return undefined;
    }

    const groupReference = String(selectedPreviewMessage?.groupReference || "").trim();
    const messageId = Number(selectedPreviewMessage?.id || 0);

    if (!plannerToken || !groupReference || !messageId) {
      setPreviewError("Stored PDF is missing its identifiers.");
      return undefined;
    }

    const loadPreviewPdf = async () => {
      setPreviewLoading(true);
      try {
        const params = new URLSearchParams({
          groupReference,
          messageId: String(messageId),
        });
        const response = await fetch(
          apiUrl(`/api/telegram/stored-media?${params.toString()}`),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${plannerToken}`,
            },
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            formatStoredMediaErrorMessage(
              payload,
              "Unable to load the selected PDF.",
            ),
          );
        }
        const blob = await response.blob();
        if (isCancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        previewObjectUrlRef.current = objectUrl;
        setPreviewFileUrl(objectUrl);
      } catch (nextError) {
        if (!isCancelled) {
          setPreviewError(
            String(nextError?.message || "Unable to load the selected PDF."),
          );
        }
      } finally {
        if (!isCancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreviewPdf();

    return () => {
      isCancelled = true;
    };
  }, [plannerToken, selectedPreviewMessage, selectedPreviewSourceKey]);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask = null;

    if (!previewFileUrl) {
      setPreviewPdfDocument((currentDocument) => {
        currentDocument?.destroy?.().catch?.(() => {});
        return null;
      });
      setPreviewPageCount(0);
      return undefined;
    }

    const loadPreviewDocument = async () => {
      try {
        loadingTask = pdfjs.getDocument(previewFileUrl);
        const nextDocument = await loadingTask.promise;
        if (isCancelled) {
          await nextDocument.destroy();
          return;
        }
        setPreviewPdfDocument((currentDocument) => {
          currentDocument?.destroy?.().catch?.(() => {});
          return nextDocument;
        });
        setPreviewPageCount(Number(nextDocument.numPages || 0));
        setPreviewPageNumber(1);
      } catch (nextError) {
        if (!isCancelled) {
          setPreviewPdfDocument(null);
          setPreviewPageCount(0);
          setPreviewError(
            String(nextError?.message || "Unable to open this PDF preview."),
          );
        }
      }
    };

    loadPreviewDocument();

    return () => {
      isCancelled = true;
      loadingTask?.destroy?.();
    };
  }, [previewFileUrl, selectedPreviewSourceKey]);

  useEffect(() => {
    let renderTask = null;

    if (!previewPdfDocument || !previewCanvasRef.current || previewPageNumber <= 0) {
      return undefined;
    }

    const renderPreviewPage = async () => {
      try {
        const page = await previewPdfDocument.getPage(previewPageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = 680;
        const scale =
          viewport.width > 0 ? Math.min(maxWidth / viewport.width, 1.5) : 1;
        const scaledViewport = page.getViewport({ scale });
        const canvas = previewCanvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) {
          return;
        }
        canvas.width = Math.ceil(scaledViewport.width);
        canvas.height = Math.ceil(scaledViewport.height);
        renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });
        await renderTask.promise;
      } catch (nextError) {
        if (nextError?.name !== "RenderingCancelledException") {
          setPreviewError(
            String(nextError?.message || "Unable to render this PDF page."),
          );
        }
      }
    };

    renderPreviewPage();

    return () => {
      renderTask?.cancel?.();
    };
  }, [previewPdfDocument, previewPageNumber]);

  const renderPdfPreviewPanel = () => (
    <aside className="nogaPlanner_tracesPdfPane">
      <div className="nogaPlanner_tracesPdfPaneHeader">
        <div className="nogaPlanner_tracesPdfPaneCopy">
          <span className="nogaPlanner_tracesPdfPaneEyebrow">Read-only</span>
          <strong className="nogaPlanner_tracesPdfPaneTitle">
            {pdfPaneMode === "instructors" ? "Found Instructors" : pdfPaneMode === "courses" ? "Extracted Course Names" : pdfPaneMode === "text" ? "Text Preview" : "PDF Reader"}
          </strong>
        </div>
        {pdfPaneMode === "text" ? (
          <button
            type="button"
            className="nogaPlanner_tracesDeleteBtn"
            onClick={() => { setSelectedTextPreviewMessage(null); setPdfPaneMode("pdf"); }}
          >
            Close
          </button>
        ) : pdfPaneMode === "instructors" ? (
          <>
            <button
              type="button"
              className="nogaPlanner_tracesDeleteBtn"
              onClick={deleteDuplicateInstructors}
            >
              Delete duplicated items
            </button>
            <button
              type="button"
              className="nogaPlanner_tracesMiniTabBtn"
              onClick={() => setPdfPaneMode("pdf")}
            >
              PDF Reader
            </button>
          </>
        ) : pdfPaneMode === "courses" ? (
          <>
            <button
              type="button"
              className="nogaPlanner_tracesDeleteBtn"
              onClick={deleteDuplicateCourseNames}
            >
              Delete duplicated items
            </button>
            <button
              type="button"
              className="nogaPlanner_tracesMiniTabBtn"
              onClick={() => setPdfPaneMode("pdf")}
            >
              PDF Reader
            </button>
          </>
        ) : previewPageCount > 0 ? (
          <div className="nogaPlanner_tracesPdfPager">
            <button
              type="button"
              className="nogaPlanner_tracesMiniTabBtn"
              onClick={() =>
                setPreviewPageNumber((currentValue) => Math.max(1, currentValue - 1))
              }
              disabled={previewPageNumber <= 1}
            >
              Prev
            </button>
            <span className="nogaPlanner_tracesPdfPagerLabel">
              {`${previewPageNumber}/${previewPageCount}`}
            </span>
            <button
              type="button"
              className="nogaPlanner_tracesMiniTabBtn"
              onClick={() =>
                setPreviewPageNumber((currentValue) =>
                  Math.min(previewPageCount, currentValue + 1),
                )
              }
              disabled={previewPageNumber >= previewPageCount}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      <div className="nogaPlanner_tracesPdfPaneBody">
        {pdfPaneMode === "text" ? (
          selectedTextPreviewMessage ? (
            <div className="nogaPlanner_tracesTextPreview">
              <div className="nogaPlanner_tracesTextPreviewMeta">
                <span>{formatTelegramMessageDate(selectedTextPreviewMessage?.date) || "-"}</span>
                <span>{String(selectedTextPreviewMessage?.senderName || selectedTextPreviewMessage?.sender || selectedTextPreviewMessage?.from || "").trim() || "Unknown sender"}</span>
              </div>
              <p className="nogaPlanner_tracesTextPreviewBody">
                {String(selectedTextPreviewMessage?.text || "").trim() || "(empty)"}
              </p>
            </div>
          ) : (
            <p className="nogaPlanner_tracesStatus">Select a text message to preview.</p>
          )
        ) : pdfPaneMode === "instructors" ? (
          isFindingInstructors ? (
            <p className="nogaPlanner_tracesStatus">Searching all groups...</p>
          ) : findInstructorsError ? (
            <p className="nogaPlanner_tracesStatus">{findInstructorsError}</p>
          ) : findInstructorsResults.length === 0 ? (
            <p className="nogaPlanner_tracesStatus">No instructor mentions found.</p>
          ) : (
            <div className="nogaPlanner_tracesPdfStageWrap">
              <p className="nogaPlanner_tracesStatus--summary">
                {findInstructorsResults.length} instructors found
              </p>
              {findInstructorsResults.map((result, idx) => (
                <div
                  key={`instructor-result-${idx}`}
                  className="nogaPlanner_tracesMessage"
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "0.82rem", color: "#3f2b22" }}>
                    {result.fullName}
                    {result.confidence ? ` (${result.confidence})` : ""}
                  </span>
                  <button
                    type="button"
                    className="nogaPlanner_tracesActionBtn"
                    style={{ minWidth: "auto", padding: "6px 10px" }}
                    onClick={() => addInstructorToPlanner(result)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )
        ) : pdfPaneMode === "courses" ? (
          isExtractingCourseNames ? (
            <p className="nogaPlanner_tracesStatus">Extracting course names...</p>
          ) : extractCourseNamesError ? (
            <p className="nogaPlanner_tracesStatus">{extractCourseNamesError}</p>
          ) : extractCourseNamesResults.length === 0 ? (
            <p className="nogaPlanner_tracesStatus">No course names found.</p>
          ) : (
            <div className="nogaPlanner_tracesPdfStageWrap">
              <p className="nogaPlanner_tracesStatus--summary">
                {extractCourseNamesResults.length} courses found
              </p>
              {extractCourseNamesResults.map((entry, idx) => (
                <div
                  key={`course-result-${idx}`}
                  className="nogaPlanner_tracesMessage nogaPlanner_tracesCourseResult"
                >
                  <div className="nogaPlanner_tracesCourseResultInfo">
                    <span className="nogaPlanner_tracesCourseResultName">{entry.courseName}</span>
                    {entry.courseCode ? (
                      <span className="nogaPlanner_tracesCourseResultCode">{entry.courseCode}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="nogaPlanner_tracesActionBtn"
                    style={{ minWidth: "auto", padding: "6px 10px", flexShrink: 0 }}
                    onClick={() => addCourseToPlanner(entry)}
                  >
                    Save
                  </button>
                </div>
              ))}
            </div>
          )
        ) : traceMainTab !== "material" || materialSourceTab !== "telegram" ? (
          <p className="nogaPlanner_tracesStatus">
            PDF preview is available for Telegram documents only.
          </p>
        ) : !selectedPreviewMessage ? (
          <p className="nogaPlanner_tracesStatus">
            Select a PDF or image row from the table to preview it here.
          </p>
        ) : isTelegramImageDocument(selectedPreviewMessage) ? (
          (() => {
            const mediaKey = getTelegramMessageMediaKey(selectedPreviewMessage);
            const imgUrl = telegramImagePreviewUrls[mediaKey] || "";
            return (
              <div className="nogaPlanner_tracesPdfStageWrap">
                <div className="nogaPlanner_tracesPdfMeta">
                  <strong>{getStoredGroupLabelByReference(selectedPreviewMessage?.groupReference)}</strong>
                </div>
                {imgUrl ? (
                  <div className="nogaPlanner_tracesPdfCanvasShell">
                    <img
                      key={selectedPreviewSourceKey}
                      src={imgUrl}
                      alt="preview"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", margin: "0 auto" }}
                    />
                  </div>
                ) : (
                  <p className="nogaPlanner_tracesStatus">Loading image...</p>
                )}
              </div>
            );
          })()
        ) : previewLoading ? (
          <p className="nogaPlanner_tracesStatus">Opening selected PDF...</p>
        ) : previewError ? (
          <p className="nogaPlanner_tracesStatus">{previewError}</p>
        ) : !previewPdfDocument ? (
          <p className="nogaPlanner_tracesStatus">No PDF loaded yet.</p>
        ) : (
          <div className="nogaPlanner_tracesPdfStageWrap">
            <div className="nogaPlanner_tracesPdfMeta">
              <strong>{getFileNameWithoutExtension(buildTelegramDocumentFilename(selectedPreviewMessage)) || buildTelegramDocumentFilename(selectedPreviewMessage)}</strong>
              <span>
                {getStoredGroupLabelByReference(selectedPreviewMessage?.groupReference)}
              </span>
            </div>
            <div className="nogaPlanner_tracesPdfCanvasShell">
              <canvas
                key={selectedPreviewSourceKey || "empty-preview"}
                ref={previewCanvasRef}
                className="nogaPlanner_tracesPdfCanvas"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  useEffect(() => {
    if (
      traceMainTab !== "material" ||
      materialSourceTab !== "telegram" ||
      !plannerToken
    ) {
      return undefined;
    }
    const imageMessages = filteredTelegramDocumentMessages.filter((message) =>
      isTelegramImageDocument(message),
    );
    if (imageMessages.length === 0) {
      return undefined;
    }
    let isCancelled = false;
    const run = async () => {
      for (const message of imageMessages) {
        if (isCancelled) {
          return;
        }
        const groupReference = String(message?.groupReference || "").trim();
        const messageId = Number(message?.id || 0);
        const mediaKey = getTelegramMessageMediaKey(message);
        if (
          !groupReference ||
          !messageId ||
          telegramImagePreviewUrlsRef.current[mediaKey]
        ) {
          continue;
        }
        const inlineDataUrl = String(message?.photoDataUrl || "").trim();
        if (inlineDataUrl.startsWith("data:image/")) {
          setTelegramImagePreviewUrls((currentValue) => ({
            ...currentValue,
            [mediaKey]: inlineDataUrl,
          }));
          continue;
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
              headers: {
                Authorization: `Bearer ${plannerToken}`,
              },
            },
          );
          if (!response.ok) {
            continue;
          }
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          telegramImagePreviewBlobUrlsRef.current.add(objectUrl);
          if (!isCancelled) {
            setTelegramImagePreviewUrls((currentValue) => ({
              ...currentValue,
              [mediaKey]: objectUrl,
            }));
          }
        } catch {
          // Keep silent for preview failures; view/download still available.
        }
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [
    filteredTelegramDocumentMessages,
    materialSourceTab,
    plannerToken,
    traceMainTab,
  ]);

  useEffect(
    () => () => {
      telegramImagePreviewBlobUrlsRef.current.forEach((url) => {
        if (String(url || "").startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      telegramImagePreviewBlobUrlsRef.current.clear();
    },
    [],
  );

  const handleUploadFiles = (fileList) => {
    const nextFiles = Array.from(fileList || [])
      .filter((file) => file)
      .map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        name: String(file.name || "").trim() || `file-${index + 1}`,
        size: Number(file.size || 0),
        type: String(file.type || "").trim(),
        file,
      }));
    if (nextFiles.length === 0) {
      return;
    }
    setUploadedFiles((currentValue) => [...currentValue, ...nextFiles]);
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles((currentValue) =>
      currentValue.filter((entry) => entry.id !== fileId),
    );
  };

  const addPhysicalDocument = () => {
    const title = String(physicalDraft.title || "").trim();
    const volume = String(physicalDraft.volume || "").trim();
    const note = String(physicalDraft.note || "").trim();
    if (!volume) {
      return;
    }
    setPhysicalDocuments((currentValue) => [
      ...currentValue,
      {
        id: `physical-${Date.now()}-${currentValue.length}`,
        title: title || "Untitled physical document",
        volume,
        note,
      },
    ]);
    setPhysicalDraft({
      title: "",
      volume: "",
      note: "",
    });
  };

  const removePhysicalDocument = (entryId) => {
    setPhysicalDocuments((currentValue) =>
      currentValue.filter((entry) => entry.id !== entryId),
    );
  };

  const addLanguageCourseComponentClass = () => {
    const nextValue = String(languageCourseDraft.componentClass || "").trim();
    if (!nextValue) {
      return;
    }
    setLanguageCourseDraft((currentValue) => {
      const currentList = Array.isArray(currentValue?.componentClasses)
        ? currentValue.componentClasses
        : [];
      if (currentList.includes(nextValue)) {
        return currentValue;
      }
      return {
        ...currentValue,
        componentClasses: [...currentList, nextValue],
      };
    });
  };

  const removeLanguageCourseComponentClass = (targetValue = "") => {
    const normalizedTarget = String(targetValue || "").trim();
    if (!normalizedTarget) {
      return;
    }
    setLanguageCourseDraft((currentValue) => ({
      ...currentValue,
      componentClasses: (Array.isArray(currentValue?.componentClasses)
        ? currentValue.componentClasses
        : []
      ).filter((entry) => String(entry || "").trim() !== normalizedTarget),
    }));
  };

  const addLanguageCourse = async () => {
    const name = String(languageCourseDraft.name || "").trim();
    const code = String(languageCourseDraft.code || "").trim();
    const selectedComponentClasses = Array.from(
      new Set(
        (Array.isArray(languageCourseDraft?.componentClasses)
          ? languageCourseDraft.componentClasses
          : []
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    if (
      !name ||
      !code ||
      selectedComponentClasses.length === 0 ||
      !plannerToken ||
      !plannerUserId
    ) {
      return;
    }
    try {
      const response = await fetch(
        apiUrl(`/api/user/addCourse/${plannerUserId}`),
        {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_code: code,
            course_name: name,
            course_status: "NEW",
            course_component: selectedComponentClasses[0],
            course_class: selectedComponentClasses[0],
            course_components: selectedComponentClasses.map((componentClass) => ({
              component_class: componentClass,
              course_class: componentClass,
              class: componentClass,
              status: "",
            })),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.message || "Failed to add language course."));
      }
      await planner?.retrieveCourses?.();
      const createdId = String(payload?.course?._id || "").trim();
      if (createdId) {
        setSelectedLanguageCourseId(createdId);
      }
      setLanguageCourseDraft({
        name: "",
        code: "",
        componentClass: "",
        componentClasses: [],
      });
      planner?.props?.serverReply?.(String(payload?.message || "Language course saved."));
    } catch (nextError) {
      planner?.props?.serverReply?.(
        String(nextError?.message || "Failed to save language course."),
      );
    }
  };

  const deleteSelectedLanguageCourse = async () => {
    const selectedId = String(selectedLanguageCourseId || "").trim();
    if (!selectedId || !plannerToken || !plannerUserId) {
      return;
    }
    try {
      const response = await fetch(
        apiUrl(`/api/user/deleteCourse/${plannerUserId}/${selectedId}`),
        {
          method: "DELETE",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.message || "Failed to delete language course."));
      }
      await planner?.retrieveCourses?.();
      setSelectedLanguageCourseId("");
      planner?.props?.serverReply?.(String(payload?.message || "Language course deleted."));
    } catch (nextError) {
      planner?.props?.serverReply?.(
        String(nextError?.message || "Failed to delete language course."),
      );
    }
  };

  const editSelectedLanguageCourse = async () => {
    const selectedEntry = languageCourses.find(
      (entry) => String(entry?.id || "") === String(selectedLanguageCourseId || ""),
    );
    if (!selectedEntry) {
      return;
    }
    const editedName = String(languageCourseDraft.name || "").trim();
    const editedCode = String(languageCourseDraft.code || "").trim();
    const editedComponentClasses = Array.from(
      new Set(
        (Array.isArray(languageCourseDraft?.componentClasses)
          ? languageCourseDraft.componentClasses
          : []
        )
          .map((entry) => String(entry || "").trim())
          .filter(Boolean),
      ),
    );
    if (
      editedName &&
      editedCode &&
      editedComponentClasses.length > 0 &&
      plannerToken &&
      plannerUserId
    ) {
      try {
        const response = await fetch(
          apiUrl(`/api/user/editCourseBundle/${plannerUserId}/${selectedEntry.id}`),
          {
            method: "POST",
            mode: "cors",
            headers: {
              Authorization: `Bearer ${plannerToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              course_name: editedName,
              course_code: editedCode,
              status: "NEW",
              components: editedComponentClasses.map((componentClass) => ({
                component_class: componentClass,
                class: componentClass,
                status: "",
              })),
            }),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(payload?.message || "Failed to edit language course."));
        }
        await planner?.retrieveCourses?.(selectedEntry.id);
        planner?.props?.serverReply?.(String(payload?.message || "Language course updated."));
        return;
      } catch (nextError) {
        planner?.props?.serverReply?.(
          String(nextError?.message || "Failed to update language course."),
        );
        return;
      }
    }
    setLanguageCourseDraft({
      name: String(selectedEntry.name || ""),
      code: String(selectedEntry.code || ""),
      componentClass: String(selectedEntry.componentClass || ""),
      componentClasses: Array.isArray(selectedEntry.componentClasses)
        ? selectedEntry.componentClasses
        : String(selectedEntry.componentClass || "").trim()
          ? [String(selectedEntry.componentClass || "").trim()]
          : [],
    });
  };

  const addLanguageLecture = () => {
    const name = String(languageLectureDraft.name || "").trim();
    const order = String(languageLectureDraft.order || "").trim();
    if (!name || !order) {
      return;
    }
    const nextEntry = {
      id: `lecture-language-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      order,
    };
    setLanguageLectures((currentValue) => [...currentValue, nextEntry]);
    setSelectedLanguageLectureId(nextEntry.id);
    setLanguageLectureDraft({ name: "", order: "" });
  };

  const deleteSelectedLanguageLecture = () => {
    const selectedId = String(selectedLanguageLectureId || "").trim();
    if (!selectedId) {
      return;
    }
    setLanguageLectures((currentValue) =>
      currentValue.filter((entry) => entry.id !== selectedId),
    );
    setSelectedLanguageLectureId("");
  };

  const editSelectedLanguageLecture = () => {
    const selectedEntry = languageLectures.find(
      (entry) => String(entry?.id || "") === String(selectedLanguageLectureId || ""),
    );
    if (!selectedEntry) {
      return;
    }
    setLanguageLectureDraft({
      name: String(selectedEntry.name || ""),
      order: String(selectedEntry.order || ""),
    });
  };

  useEffect(() => {
    if (traceMainTab !== "material" || materialSourceTab !== "telegram") {
      return;
    }
    fetchStoredGroups();
  }, [materialSourceTab, traceMainTab]);

  useEffect(() => {
    if (traceMainTab !== "material" || materialSourceTab !== "telegram") {
      return;
    }
    if (!String(selectedGroupReference || "").trim()) {
      setMessages([]);
      setMessagesOffset(0);
      setMessagesHasMore(false);
      setMessagesFilteredTotalCount(0);
      setMessagesRawCount(0);
      return;
    }
    searchStoredMessages({
      groupReferenceOverride: selectedGroupReference,
      reset: true,
    });
  }, [materialSourceTab, selectedCourseName, selectedGroupReference, selectedLectureKey, traceMainTab, documentTypeTab]);
  useEffect(() => {
    if (
      (traceMainTab !== "material" || materialSourceTab !== "telegram") &&
      documentTypeTab !== "all"
    ) {
      setDocumentTypeTab("all");
    }
  }, [documentTypeTab, materialSourceTab, traceMainTab]);

  const renderMaterialSourceTabs = () => (
    <div className="nogaPlanner_tracesSourceTabs">
      {MATERIAL_SOURCE_TABS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          className={
            "nogaPlanner_tracesMiniTabBtn" +
            (materialSourceTab === entry.key
              ? " nogaPlanner_tracesMiniTabBtn--active"
              : "")
          }
          onClick={() => setMaterialSourceTab(entry.key)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );

  const renderTelegramSource = () => (
    <div id="telegramTrace" className="telegramTrace">
      {renderMaterialSourceTabs()}
      <div
        id="nogaPlanner_traces_controlsContainer"
        className="nogaPlanner_tracesControls"
      >
        <select
          id="nogaPlanner_tracesTelegramGroupSelect"
          className="nogaPlanner_tracesInput"
          value={selectedGroupReference}
          onChange={(event) => setSelectedGroupReference(event.target.value)}
        >
          <option value="">Select stored group</option>
          {storedGroups.map((group) => {
            const reference = String(group?.groupReference || "").trim();
            if (!reference) {
              return null;
            }
            return (
              <option key={`traces-telegram-group-${reference}`} value={reference}>
                {formatStoredGroupOptionLabel(group)}
              </option>
            );
          })}
        </select>
        <div
          id="nogaPlanner_traces_searchRow"
          className="nogaPlanner_tracesSearchRow"
        >
          <input
            id="nogaPlanner_tracesTelegramSearch"
            className="nogaPlanner_tracesInput"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search stored messages"
          />
          <button
            id="nogaPlanner_tracesTelegramSearchBtn"
            type="button"
            className="nogaPlanner_tracesActionBtn"
            onClick={() => searchStoredMessages({ reset: true })}
            disabled={isLoading}
          >
            Search
          </button>
          <button
            id="nogaPlanner_tracesFindInstructorsBtn"
            type="button"
            className="nogaPlanner_tracesActionBtn"
            onClick={findInstructors}
            disabled={isFindingInstructors || storedGroups.length === 0}
          >
            {isFindingInstructors ? "Searching..." : "Find Instructors"}
          </button>
        </div>
      </div>
      <div className="nogaPlanner_tracesMiniTabsAndViewer">
        <div className="nogaPlanner_tracesMiniTabs">
          {TELEGRAM_DOCUMENT_TYPE_TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={
                "nogaPlanner_tracesMiniTabBtn" +
                (documentTypeTab === entry.key
                  ? " nogaPlanner_tracesMiniTabBtn--active"
                  : "")
              }
              onClick={() => setDocumentTypeTab(entry.key)}
            >
              {`${entry.label} (${Object.keys(messagesTypeCounts).length > 0 ? Number(messagesTypeCounts[entry.key] || 0) : Number(telegramDocumentTypeCounts[entry.key] || 0)})`}
            </button>
          ))}
          {documentTypeTab === "pinned" && selectedGroupReference && (
            <button
              type="button"
              className="nogaPlanner_tracesActionBtn"
              onClick={syncPinnedMessages}
              disabled={isSyncingPinned}
            >
              {isSyncingPinned ? "Syncing..." : "Sync Pinned"}
            </button>
          )}
        </div>
        <div id="nogaPlanner_tracesViewer" className="nogaPlanner_tracesViewer">
          {isLoading ? (
            <p className="nogaPlanner_tracesStatus">Loading messages...</p>
          ) : error ? (
            <p className="nogaPlanner_tracesStatus">{error}</p>
          ) : filteredTelegramDocumentMessages.length === 0 ? (
            <p className="nogaPlanner_tracesStatus">No documents found.</p>
          ) : (
            <table className="nogaPlanner_tracesTable">
              <thead>
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>ID</th>
                  <th>Name</th>
                  <th>Uploader</th>
                  <th>Type</th>
                  <th>Telegram group</th>
                  <th>Created at</th>
                  <th>Hashtags</th>
                </tr>
              </thead>
              <tbody>
                {filteredTelegramDocumentMessages.map((message, index) => {
                  const messageKey = String(
                    message?._id || message?.id || `${message?.date || ""}-${index}`,
                  );
                  const sender = String(
                    message?.senderName ||
                      message?.sender ||
                      message?.from ||
                      message?.author ||
                      "Unknown sender",
                  ).trim();
                  const fileName = buildTelegramDocumentFilename(message);
                  const fileNameNoExt = getFileNameWithoutExtension(fileName);
                  const mediaKey = getTelegramMessageMediaKey(message);
                  const downloadKey = mediaKey;
                  const documentType = classifyTelegramDocumentType(message);
                  const groupReference = String(
                    message?.groupReference || selectedGroupReference || "",
                  ).trim();
                  const text = String(message?.text || "").trim();
                  const hashtagEntities = Array.isArray(message?.entities)
                    ? message.entities.filter((e) => e?.type === "hashtag")
                    : [];
                  const hashtags = hashtagEntities.length > 0
                    ? hashtagEntities.map((e) => text.slice(e.offset, e.offset + e.length))
                    : (text.match(/#[^\s#]+/g) || []);
                  const isOpenSupported =
                    isTelegramPdfDocument(message) || isTelegramImageDocument(message);
                  return (
                    <tr
                      key={`traces-telegram-message-row-${messageKey}`}
                      className={`nogaPlanner_tracesTableRow${activeTelegramRowActionKey === messageKey ? " is-active" : ""}${selectedPreviewMessageKey === mediaKey ? " is-previewing" : ""}`}
                      onClick={() => {
                        if (isTelegramPdfDocument(message) || isTelegramImageDocument(message)) {
                          setSelectedPreviewMessageKey(mediaKey);
                          setPdfPaneMode("pdf");
                        } else if (documentType === "text") {
                          setSelectedTextPreviewMessage((current) =>
                            current?._id === message?._id && current?.date === message?.date ? null : message
                          );
                          setPdfPaneMode("text");
                        }
                        setActiveTelegramRowActionKey((currentValue) =>
                          currentValue === messageKey ? "" : messageKey,
                        );
                      }}
                    >
                      {message?._groupRowSpan !== 0 ? (
                        <td
                          style={{ whiteSpace: "nowrap" }}
                          rowSpan={message?._groupRowSpan > 1 ? message._groupRowSpan : undefined}
                        >
                          {Number(message?.id || 0) || "-"}
                        </td>
                      ) : null}
                      <td title={documentType === "text" ? text : (fileNameNoExt || fileName)}>
                        {documentType === "text"
                          ? (text ? (text.length > 60 ? `${text.slice(0, 60)}…` : text) : "-")
                          : (fileNameNoExt || fileName || "-")}
                      </td>
                      <td>{sender || "-"}</td>
                      <td>{formatKnownTelegramDocumentType(documentType)}</td>
                      <td>{getStoredGroupLabelByReference(groupReference)}</td>
                      <td>{formatTelegramMessageDate(message?.date) || "-"}</td>
                      <td className="nogaPlanner_tracesTableTagCell">
                        <div className="nogaPlanner_tracesTableTagList">
                          {hashtags.length > 0 ? hashtags.map((tag, i) => (
                            <span key={i} className="nogaPlanner_tracesTableTag">{tag}</span>
                          )) : <span className="nogaPlanner_tracesTableTag">-</span>}
                        </div>
                        {activeTelegramRowActionKey === messageKey ? (
                          <div className="nogaPlanner_tracesMessageActionsPopover">
                            <button
                              id={`nogaPlanner_tracesTelegramView_${index}`}
                              type="button"
                              className="nogaPlanner_tracesActionBtn"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isOpenSupported) {
                                  viewTelegramDocument(message);
                                }
                              }}
                              disabled={!isOpenSupported}
                            >
                              Open
                            </button>
                            <button
                              id={`nogaPlanner_tracesTelegramDownload_${index}`}
                              type="button"
                              className="nogaPlanner_tracesActionBtn"
                              onClick={(event) => {
                                event.stopPropagation();
                                downloadTelegramDocument(message);
                              }}
                              disabled={downloadingMessageId === downloadKey}
                            >
                              {downloadingMessageId === downloadKey
                                ? "Downloading..."
                                : "Download"}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!isLoading &&
          !error &&
          filteredTelegramDocumentMessages.length > 0 &&
          messagesHasMore && (!documentTypeTab || documentTypeTab === "all") ? (
            <div className="nogaPlanner_tracesLoadMoreRow">
              <button
                type="button"
                className="nogaPlanner_tracesActionBtn"
                onClick={() => searchStoredMessages({ reset: false })}
              >
                Load more
              </button>
            </div>
          ) : null}
          {!isLoading &&
          !error &&
          (messagesFilteredTotalCount > 0 || messagesRawCount > 0) ? (
            <p className="nogaPlanner_tracesStatus nogaPlanner_tracesStatus--summary">
              {`Showing ${filteredTelegramDocumentMessages.length} of ${
                Number(
                  Object.keys(messagesTypeCounts).length > 0
                    ? (messagesTypeCounts[documentTypeTab] ?? messagesTypeCounts.all)
                    : (telegramDocumentTypeCounts[documentTypeTab] ?? telegramDocumentTypeCounts.all),
                ) || filteredTelegramDocumentMessages.length
              } ${documentTypeTab === "all" ? "items" : documentTypeTab === "text" ? "text messages" : "documents"} from ${messagesRawCount || 0} stored messages.`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderUploadSource = () => (
    <div id="telegramTrace" className="telegramTrace">
      {renderMaterialSourceTabs()}
      <div className="nogaPlanner_tracesControls">
        <button
          id="nogaPlanner_tracesUploadBtn"
          type="button"
          className="nogaPlanner_tracesActionBtn"
          onClick={() => {
            const input = document.getElementById("nogaPlanner_tracesUploadInput");
            if (input) {
              input.click();
            }
          }}
        >
          Upload documents
        </button>
        <input
          id="nogaPlanner_tracesUploadInput"
          type="file"
          multiple
          hidden
          onChange={(event) => {
            handleUploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <div className="nogaPlanner_tracesViewer">
        {uploadedFiles.length === 0 ? (
          <p className="nogaPlanner_tracesStatus">No uploaded documents.</p>
        ) : (
          <ul className="nogaPlanner_tracesList">
            {uploadedFiles.map((entry, index) => (
              <li key={entry.id} className="nogaPlanner_tracesListItem">
                <div className="nogaPlanner_tracesListItemMeta">
                  <strong>{entry.name}</strong>
                  <span>{[formatFileSize(entry.size), entry.type].filter(Boolean).join(" | ")}</span>
                </div>
                <button
                  id={`nogaPlanner_tracesUploadDelete_${index}`}
                  type="button"
                  className="nogaPlanner_tracesDeleteBtn"
                  onClick={() => removeUploadedFile(entry.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderPhysicalSource = () => (
    <div id="telegramTrace" className="telegramTrace">
      {renderMaterialSourceTabs()}
      <div className="nogaPlanner_tracesControls nogaPlanner_tracesControls--form">
        <input
          id="nogaPlanner_tracesPhysicalTitle"
          className="nogaPlanner_tracesInput"
          type="text"
          value={physicalDraft.title}
          onChange={(event) =>
            setPhysicalDraft((currentValue) => ({
              ...currentValue,
              title: event.target.value,
            }))
          }
          placeholder="Document title"
        />
        <input
          id="nogaPlanner_tracesPhysicalVolume"
          className="nogaPlanner_tracesInput"
          type="number"
          min="0"
          value={physicalDraft.volume}
          onChange={(event) =>
            setPhysicalDraft((currentValue) => ({
              ...currentValue,
              volume: event.target.value,
            }))
          }
          placeholder="Volume"
        />
        <input
          id="nogaPlanner_tracesPhysicalNote"
          className="nogaPlanner_tracesInput"
          type="text"
          value={physicalDraft.note}
          onChange={(event) =>
            setPhysicalDraft((currentValue) => ({
              ...currentValue,
              note: event.target.value,
            }))
          }
          placeholder="Note"
        />
        <button
          id="nogaPlanner_tracesPhysicalAddBtn"
          type="button"
          className="nogaPlanner_tracesActionBtn"
          onClick={addPhysicalDocument}
        >
          Add physical document
        </button>
      </div>
      <div className="nogaPlanner_tracesViewer">
        {physicalDocuments.length === 0 ? (
          <p className="nogaPlanner_tracesStatus">
            No physical documents registered.
          </p>
        ) : (
          <ul className="nogaPlanner_tracesList">
            {physicalDocuments.map((entry, index) => (
              <li key={entry.id} className="nogaPlanner_tracesListItem">
                <div className="nogaPlanner_tracesListItemMeta">
                  <strong>{entry.title}</strong>
                  <span>{`Volume: ${entry.volume}`}</span>
                  {entry.note ? <span>{entry.note}</span> : null}
                </div>
                <button
                  id={`nogaPlanner_tracesPhysicalDelete_${index}`}
                  type="button"
                  className="nogaPlanner_tracesDeleteBtn"
                  onClick={() => removePhysicalDocument(entry.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderLanguageSource = () => (
    <div className="nogaPlanner_tracesLanguageGrid">
      {languageSection === "all" || languageSection === "lectures" ? (
      <article className="nogaPlanner_tracesLanguageCard">
        <h4 className="nogaPlanner_tracesLanguageCardTitle">Lectures</h4>
        <div className="nogaPlanner_tracesControls nogaPlanner_tracesControls--form">
          <input
            id="nogaPlanner_tracesLanguageLectureName"
            className="nogaPlanner_tracesInput"
            type="text"
            value={languageLectureDraft.name}
            onChange={(event) =>
              setLanguageLectureDraft((currentValue) => ({
                ...currentValue,
                name: event.target.value,
              }))
            }
            placeholder="Lecture name"
          />
          <input
            id="nogaPlanner_tracesLanguageLectureOrder"
            className="nogaPlanner_tracesInput"
            type="number"
            min="0"
            value={languageLectureDraft.order}
            onChange={(event) =>
              setLanguageLectureDraft((currentValue) => ({
                ...currentValue,
                order: event.target.value,
              }))
            }
            placeholder="Lecture order"
          />
          <div className="nogaPlanner_tracesLanguageMiniBar">
            <button type="button" className="nogaPlanner_tracesActionBtn" onClick={addLanguageLecture}>
              Add
            </button>
            <button
              type="button"
              className="nogaPlanner_tracesDeleteBtn"
              onClick={deleteSelectedLanguageLecture}
              disabled={!selectedLanguageLectureId}
            >
              Delete (selected)
            </button>
            <button
              type="button"
              className="nogaPlanner_tracesActionBtn"
              onClick={editSelectedLanguageLecture}
              disabled={!selectedLanguageLectureId}
            >
              Edit (selected)
            </button>
          </div>
        </div>
        <div className="nogaPlanner_tracesViewer">
          {languageLectures.length === 0 ? (
            <p className="nogaPlanner_tracesStatus">No saved lecture labels.</p>
          ) : (
            <ul className="nogaPlanner_tracesList">
              {languageLectures.map((entry) => (
                <li
                  key={entry.id}
                  className={
                    "nogaPlanner_tracesListItem" +
                    (selectedLanguageLectureId === entry.id
                      ? " nogaPlanner_tracesListItem--selected"
                      : "")
                  }
                  onClick={() => setSelectedLanguageLectureId(entry.id)}
                >
                  <div className="nogaPlanner_tracesListItemMeta">
                    <strong>{entry.name}</strong>
                    <span>{`Order: ${entry.order}`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
      ) : null}
    </div>
  );

  if (mode === "language-only") {
    return renderLanguageSource();
  }

  return (
    <section id="nogaPlanner_traces" className="nogaPlanner_traces">
      <div className="nogaPlanner_tracesColumns">
        <div className="nogaPlanner_tracesMainColumn">
          <div className="nogaPlanner_tracesTabs">
            <div className="nogaPlanner_tracesTabsButtons">
              {TRACE_MAIN_TABS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={
                    "nogaPlanner_tracesTabBtn" +
                    (traceMainTab === entry.key
                      ? " nogaPlanner_tracesTabBtn--active"
                      : "")
                  }
                  onClick={() => setTraceMainTab(entry.key)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <span className="nogaPlanner_tracesTabsStatus">
              {traceMainTab === "material" && materialSourceTab === "telegram"
                ? `${filteredTelegramDocumentMessages.length} documents`
                : traceMainTab === "material"
                  ? activeTraceSourceLabel
                  : "Language traces"}
            </span>
          </div>
          {materialSourceTab === "telegram"
            ? renderTelegramSource()
            : materialSourceTab === "upload"
              ? renderUploadSource()
              : renderPhysicalSource()}
        </div>
        {renderPdfPreviewPanel()}
      </div>
      {zoomedTraceImageUrl ? (
        <div
          className="nogaPlanner_tracesImageZoomOverlay"
          onClick={() => setZoomedTraceImageUrl("")}
        >
          <img
            className="nogaPlanner_tracesImageZoomed"
            src={zoomedTraceImageUrl}
            alt="Zoomed Telegram preview"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
};

export default NogaPlannerTelegramPanel;
