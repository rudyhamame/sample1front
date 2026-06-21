import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../../config/api";

const formatDocumentSize = (value = 0) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return "";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDocumentVolume = (documentEntry = {}) => {
  const volume = resolveDocumentVolumeNumber(documentEntry);
  const unit = String(documentEntry?.documentVolumeUnit || "").trim();
  if (!Number.isFinite(volume) || volume <= 0) {
    return unit || "";
  }
  return unit ? `${volume} ${unit}` : String(volume);
};

const formatStringList = (value = []) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(", ");

const getDocumentInfoForEntry = (entry = {}) =>
  entry?.documentInfo && typeof entry.documentInfo === "object"
    ? entry.documentInfo
    : entry && typeof entry === "object"
      ? entry
      : {};

const resolveDocumentVolumeNumber = (documentInfo = {}) => {
  const rawVolume = documentInfo?.documentVolume;
  if (Number.isFinite(Number(rawVolume))) {
    return Number(rawVolume);
  }
  return null;
};

const buildDocumentPagesFromVolume = (volumeValue, existingPages = []) => {
  const normalizedVolume = Number(volumeValue);
  if (!Number.isFinite(normalizedVolume) || normalizedVolume <= 0) {
    return [];
  }
  const maxPages = Math.max(0, Math.trunc(normalizedVolume));
  return Array.from({ length: maxPages }, (_, index) => {
    const pageOrder = index + 1;
    const existingPage =
      (Array.isArray(existingPages) ? existingPages : []).find(
        (entry) => Number(entry?.pageOrder) === pageOrder,
      ) || {};
    return {
      pageOrder,
      pageStatus: String(existingPage?.pageStatus || "").trim() || null,
      pageNotes: Array.isArray(existingPage?.pageNotes)
        ? existingPage.pageNotes
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        : [],
    };
  });
};

const getDocumentPagesForUi = (documentInfo = {}) => {
  const normalizedVolume = resolveDocumentVolumeNumber(documentInfo);
  const explicitPages = Array.isArray(documentInfo?.documentPages)
    ? documentInfo.documentPages
    : [];
  if (!Number.isFinite(normalizedVolume) || normalizedVolume <= 0) {
    return [];
  }
  return buildDocumentPagesFromVolume(normalizedVolume, explicitPages);
};

const hasStoredDocumentDraftValues = (draft = {}) =>
  Boolean(
    String(draft?.documentName || "").trim() ||
      String(draft?.documentType || "").trim() ||
      String(draft?.documentVolumeUnit || "").trim() ||
      String(draft?.documentVolume || "").trim() ||
      (Array.isArray(draft?.documentEditors) && draft.documentEditors.length > 0),
  );

const containsArabicText = (value = "") =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(value ?? ""));

const renderLocalizedDocumentText = (value = "") => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return "—";
  }
  if (!containsArabicText(normalizedValue)) {
    return normalizedValue;
  }
  return (
    <span
      className="nogaPlanner_arabicText"
      lang="ar"
      dir="rtl"
      style={{
        fontFamily: '"Parastoo", serif',
        fontOpticalSizing: "auto",
        fontStyle: "normal",
      }}
    >
      {normalizedValue}
    </span>
  );
};

const buildLectureOptions = (planner) => {
  const plannerRoot =
    typeof planner?.getResolvedPlannerRoot === "function"
      ? planner.getResolvedPlannerRoot()
      : planner?.state?.plannerRoot || {};
  const normalized =
    typeof planner?.normalizePlannerRootForUi === "function"
      ? planner.normalizePlannerRootForUi(plannerRoot)
      : plannerRoot;
  const options = [];
  (Array.isArray(normalized?.programIntervals) ? normalized.programIntervals : []).forEach(
    (intervalEntry) => {
      const intervalLabel = String(intervalEntry?.intervalID || "").trim();
      (Array.isArray(intervalEntry?.intervalSubIntervals)
        ? intervalEntry.intervalSubIntervals
        : []
      ).forEach((subEntry) => {
        const subLabel = String(subEntry?.subIntervalID || "").trim();
        (Array.isArray(subEntry?.subIntervalCourses) ? subEntry.subIntervalCourses : []).forEach(
          (courseEntry) => {
            const courseLabel = [
              String(courseEntry?.courseName || courseEntry?.course_name || "").trim(),
              String(courseEntry?.courseCode || courseEntry?.course_code || "").trim(),
            ]
              .filter(Boolean)
              .join(" | ");
            (Array.isArray(courseEntry?.courseComponents) ? courseEntry.courseComponents : []).forEach(
              (compEntry) => {
                const compLabel = String(
                  compEntry?.course_classSelection ||
                    compEntry?.componentClass ||
                    compEntry?.componentID ||
                    "",
                ).trim();
                (Array.isArray(compEntry?.componentExams) ? compEntry.componentExams : []).forEach(
                  (examEntry) => {
                    const examLabel = String(
                      examEntry?.exam_name || examEntry?.taskID || "",
                    ).trim();
                    (Array.isArray(examEntry?.tasksLectures) ? examEntry.tasksLectures : []).forEach(
                      (lecEntry) => {
                        const lectureId = String(
                          lecEntry?.lectureID || lecEntry?.lectureInfo?.lectureID || "",
                        ).trim();
                        if (!lectureId) return;
                        const lectureName = String(
                          lecEntry?.lectureName || lecEntry?.lectureInfo?.lectureName || "",
                        ).trim();
                        const label = [subLabel, courseLabel, compLabel, examLabel, lectureName || lectureId]
                          .filter(Boolean)
                          .join(" › ");
                        options.push({ value: lectureId, label });
                      },
                    );
                  },
                );
              },
            );
          },
        );
      });
    },
  );
  return options;
};

const StagedDocumentForm = ({ planner }) => {
  const draft = planner.state?.stagedDocumentDraft;
  const info = draft?.documentInfo || {};
  const plannerToken = String(planner?.props?.state?.token || "").trim();
  const [uploadState, setUploadState] = useState({ loading: false, error: "" });
  const [selectedLectureId, setSelectedLectureId] = useState("");
  const [submitState, setSubmitState] = useState({ loading: false, error: "" });
  const lectureOptions = draft ? buildLectureOptions(planner) : [];

  if (!draft) return null;

  const telegramSource = draft._telegramSource || {};
  const hasTelegramSource = Boolean(telegramSource.groupReference && telegramSource.messageId);

  const handleInfoChange = (field, value) => {
    planner.updateStagedDocumentInfo({ [field]: value });
  };

  const handleUploadFromTelegram = async () => {
    setUploadState({ loading: true, error: "" });
    try {
      const response = await fetch(
        apiUrl("/api/telegram/document-to-cloudinary"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${plannerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupReference: telegramSource.groupReference,
            messageId: telegramSource.messageId,
            fileName: telegramSource.fileName || "document.pdf",
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.message || "Upload failed."));
      }
      planner.updateStagedDocumentDraft({
        documentURL: String(payload?.url || ""),
        documentInfo: {
          ...info,
          documentByteSize: Number(payload?.bytes || 0) || info.documentByteSize || 0,
        },
      });
      setUploadState({ loading: false, error: "" });
    } catch (err) {
      setUploadState({ loading: false, error: String(err?.message || "Upload failed.") });
    }
  };

  return (
    <div
      id="nogaPlanner_documentsStagedForm"
      className="nogaPlanner_documentsStagedForm"
    >
      <div className="nogaPlanner_documentsStagedFormHeader">
        <span className="nogaPlanner_documentsStagedFormTitle">New Document (Staged)</span>
      </div>

      {draft._telegramSource?.groupReference ? (
        <p className="nogaPlanner_documentsStagedSource">
          {`From Telegram: ${draft._telegramSource.fileName || ""} (group: ${draft._telegramSource.groupReference})`}
        </p>
      ) : null}

      <div className="nogaPlanner_documentsStagedFields">
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Name</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={String(info.documentName || "")}
            onChange={(e) => handleInfoChange("documentName", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Type</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={String(info.documentType || "")}
            onChange={(e) => handleInfoChange("documentType", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Volume Unit</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            placeholder="page / image / words"
            value={String(info.documentVolumeUnit || "")}
            onChange={(e) => handleInfoChange("documentVolumeUnit", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Volume</span>
          <input
            type="number"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={info.documentVolume ?? ""}
            onChange={(e) =>
              handleInfoChange(
                "documentVolume",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Concepts (comma-separated)</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={Array.isArray(info.documentConcepts) ? info.documentConcepts.join(", ") : ""}
            onChange={(e) =>
              handleInfoChange(
                "documentConcepts",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Editors (comma-separated)</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={Array.isArray(info.documentEditors) ? info.documentEditors.join(", ") : ""}
            onChange={(e) =>
              handleInfoChange(
                "documentEditors",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel nogaPlanner_documentsStagedLabel--url">
          <span>Cloudinary URL</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            readOnly
            value={String(draft.documentURL || "")}
            placeholder="Upload the PDF to fill this"
          />
        </label>
      </div>

      <label className="nogaPlanner_documentsStagedLabel nogaPlanner_documentsStagedLabel--url">
        <span>Lecture</span>
        <select
          className="nogaPlanner_homeIntervalsInput"
          dir="auto"
          value={selectedLectureId}
          onChange={(e) => setSelectedLectureId(e.target.value)}
        >
          <option value="">Select lecture…</option>
          {lectureOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div className="nogaPlanner_documentsStagedActions">
        {hasTelegramSource ? (
          <button
            type="button"
            className="nogaPlanner_tracesActionBtn nogaPlanner_tracesActionBtn--highlight"
            disabled={uploadState.loading || Boolean(draft.documentURL)}
            onClick={handleUploadFromTelegram}
          >
            {uploadState.loading
              ? "Uploading…"
              : draft.documentURL
                ? "Uploaded"
                : "Upload PDF to Cloudinary"}
          </button>
        ) : null}
        {draft.documentURL ? (
          <a
            href={draft.documentURL}
            target="_blank"
            rel="noreferrer"
            className="nogaPlanner_documentsTableLink"
          >
            Preview
          </a>
        ) : null}
        <button
          type="button"
          className="nogaPlanner_tracesActionBtn nogaPlanner_tracesActionBtn--highlight"
          disabled={submitState.loading || !selectedLectureId}
          onClick={async () => {
            setSubmitState({ loading: true, error: "" });
            try {
              await planner.saveDocumentToLecture({ lectureId: selectedLectureId, draft });
            } catch (err) {
              setSubmitState({ loading: false, error: String(err?.message || "Failed to save.") });
            }
          }}
        >
          {submitState.loading ? "Saving…" : "Save to Lecture"}
        </button>
        <button
          type="button"
          className="nogaPlanner_tracesActionBtn"
          onClick={() => planner.clearStagedDocumentDraft()}
        >
          Discard
        </button>
      </div>
      {uploadState.error ? (
        <p className="nogaPlanner_documentsStagedError">{uploadState.error}</p>
      ) : null}
      {submitState.error ? (
        <p className="nogaPlanner_documentsStagedError">{submitState.error}</p>
      ) : null}
    </div>
  );
};

const EMPTY_STORED_DOC_DRAFT = {
  documentName: "",
  documentType: "",
  documentVolumeUnit: "",
  documentVolume: "",
  documentEditors: [],
  documentLectureID: "",
  documentLectureName: "",
};

const StoredDocumentFormFields = ({
  draft,
  setDraft,
  documentTypes,
  volumeUnits,
  programEditors,
  lectureOptions,
}) => {
  const [editorSelection, setEditorSelection] = useState("");

  const availableEditors = useMemo(
    () => programEditors.filter((e) => !draft.documentEditors.includes(e)),
    [programEditors, draft.documentEditors],
  );

  const addEditor = () => {
    const value = String(editorSelection || "").trim();
    if (!value || draft.documentEditors.includes(value)) return;
    setDraft((prev) => ({ ...prev, documentEditors: [...prev.documentEditors, value] }));
    setEditorSelection("");
  };

  const removeEditor = (editor) => {
    setDraft((prev) => ({
      ...prev,
      documentEditors: prev.documentEditors.filter((e) => e !== editor),
    }));
  };

  return (
    <div id="nogaPlanner_storedDocumentForm" className="nogaPlanner_storedDocumentForm">
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Name</span>
          <input
            type="text"
            className="nogaPlanner_homeIntervalsInput"
            value={draft.documentName}
            onChange={(e) => setDraft((prev) => ({ ...prev, documentName: e.target.value }))}
            placeholder="Enter document name"
          />
        </label>
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Lecture</span>
          <select
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={draft.documentLectureID}
            onChange={(e) => {
              const nextLectureId = String(e.target.value || "");
              const selectedOption = e.target.selectedOptions?.[0] || null;
              const nextLectureName = String(
                selectedOption?.dataset?.lectureName ||
                  selectedOption?.textContent ||
                  "",
              ).trim();
              setDraft((prev) => ({
                ...prev,
                documentLectureID: nextLectureId,
                documentLectureName: nextLectureId ? nextLectureName : "",
              }));
            }}
          >
            <option value="">— select lecture —</option>
            {lectureOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                data-lecture-name={option.lectureName}
              >
                {option.lectureName || option.value}
              </option>
            ))}
          </select>
        </label>
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Type</span>
          <select
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={draft.documentType}
            onChange={(e) => setDraft((prev) => ({ ...prev, documentType: e.target.value }))}
          >
            <option value="">— select type —</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Volume Unit</span>
          <select
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={draft.documentVolumeUnit}
            onChange={(e) => setDraft((prev) => ({ ...prev, documentVolumeUnit: e.target.value }))}
          >
            <option value="">— select unit —</option>
            {volumeUnits.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Volume</span>
          <input
            type="number"
            className="nogaPlanner_homeIntervalsInput"
            dir="auto"
            value={draft.documentVolume}
            min={0}
            onChange={(e) => setDraft((prev) => ({ ...prev, documentVolume: e.target.value }))}
            placeholder="Total volume"
          />
        </label>
        <div className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Editors</span>
          <div className="nogaPlanner_storedDocumentEditorRow">
            <select
              className="nogaPlanner_homeIntervalsInput"
              dir="auto"
              value={editorSelection}
              onChange={(e) => setEditorSelection(e.target.value)}
            >
              <option value="">— select editor —</option>
              {availableEditors.map((editor) => (
                <option key={editor} value={editor}>{editor}</option>
              ))}
            </select>
            <button
              type="button"
              className="nogaPlanner_homePanelCardSetBtn"
              disabled={!editorSelection}
              onClick={addEditor}
            >
              Add
            </button>
          </div>
          {draft.documentEditors.length > 0 ? (
            <div className="nogaPlanner_storedDocumentEditorList">
              {draft.documentEditors.map((editor) => (
                <span key={editor} className="nogaPlanner_storedDocumentEditorTag">
                  {editor}
                  <button
                    type="button"
                    className="nogaPlanner_storedDocumentEditorRemoveBtn"
                    onClick={() => removeEditor(editor)}
                    aria-label={`Remove ${editor}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
    </div>
  );
};

export const StoredDocumentsCard = ({
  planner,
  titleActionsId = "",
  showDocumentIds = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRef, setEditingRef] = useState(null); // { source: "existing"|"staged", idx }
  const [draft, setDraft] = useState(EMPTY_STORED_DOC_DRAFT);
  const [stagedDocs, setStagedDocs] = useState([]);
  const [showSubmitAction, setShowSubmitAction] = useState(false);
  const [submitState, setSubmitState] = useState({ loading: false, error: "" });
  const [titleActionsHost, setTitleActionsHost] = useState(null);

  const plannerRoot = useMemo(() => {
    const root =
      typeof planner?.getResolvedPlannerRoot === "function"
        ? planner.getResolvedPlannerRoot()
        : planner?.state?.plannerRoot || {};
    return root;
  }, [planner?.state?.plannerRoot]);

  const documentTypes = useMemo(
    () =>
      Array.isArray(plannerRoot?.programDocumentTypes)
        ? plannerRoot.programDocumentTypes.map((v) => String(v || "").trim()).filter(Boolean)
        : [],
    [plannerRoot],
  );

  const volumeUnits = useMemo(
    () =>
      Array.isArray(plannerRoot?.programDocumentVolumeUnit)
        ? plannerRoot.programDocumentVolumeUnit.map((v) => String(v || "").trim()).filter(Boolean)
        : [],
    [plannerRoot],
  );

  const programEditors = useMemo(
    () =>
      Array.isArray(plannerRoot?.programEditors)
        ? plannerRoot.programEditors.map((v) => String(v || "").trim()).filter(Boolean)
        : [],
    [plannerRoot],
  );
  const lectureOptions = useMemo(
    () =>
      (Array.isArray(plannerRoot?.programLectures) ? plannerRoot.programLectures : [])
        .map((entry, index) => {
          const lectureInfo =
            entry?.lectureInfo && typeof entry.lectureInfo === "object"
              ? entry.lectureInfo
              : entry || {};
          const lectureId = String(lectureInfo?.lectureID || "").trim();
          const lectureName = String(lectureInfo?.lectureName || "").trim();
          const courseName = String(lectureInfo?.lectureCourseName || "").trim();
          const componentName = String(lectureInfo?.lectureComponentName || "").trim();
          if (!lectureId) {
            return null;
          }
          return {
            value: lectureId,
            lectureName: lectureName || lectureId,
            label: [lectureName || lectureId, courseName, componentName]
              .filter(Boolean)
              .join(" | "),
            sortKey: `${String(lectureInfo?.lectureOrder || index + 1).padStart(4, "0")}|${lectureName}|${lectureId}`,
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.sortKey.localeCompare(right.sortKey)),
    [plannerRoot],
  );

  const existingProgramDocuments = useMemo(
    () =>
      Array.isArray(plannerRoot?.programDocuments) ? plannerRoot.programDocuments : [],
    [plannerRoot],
  );
  const isDraftPopulated = hasStoredDocumentDraftValues(draft);
  const isEditingExistingDocument = editingRef?.source === "existing";

  const handleStartEdit = (entry, source, idx) => {
    const info = getDocumentInfoForEntry(entry);
    const storedLectureId = String(
      entry?.documentLectureID || info?.documentLectureID || "",
    ).trim();
    const storedLectureName = String(
      info?.documentLectureName || entry?.documentLectureName || "",
    ).trim();
    setDraft({
      documentName: String(info.documentName || ""),
      documentType: String(info.documentType || ""),
      documentVolumeUnit: String(info.documentVolumeUnit || ""),
      documentVolume:
        resolveDocumentVolumeNumber(info) != null
          ? String(resolveDocumentVolumeNumber(info))
          : "",
      documentEditors: Array.isArray(info.documentEditors) ? info.documentEditors : [],
      documentLectureID: storedLectureId,
      documentLectureName: storedLectureName,
    });
    setEditingRef({ source, idx });
    setShowSubmitAction(false);
    setIsEditing(true);
  };

  const handleDeleteExisting = async (idx) => {
    setSubmitState({ loading: true, error: "" });
    try {
      const targetEntry = existingProgramDocuments[idx] || {};
      const targetInfo = getDocumentInfoForEntry(targetEntry);
      if (planner?.archivePlannerMissedConnection && targetInfo) {
        await planner.archivePlannerMissedConnection({
          itemType: "document",
          itemId: String(targetInfo?.documentID || targetInfo?.documentName || idx).trim(),
          itemLabel: String(targetInfo?.documentName || targetInfo?.documentID || `Document ${idx + 1}`),
          itemPayload: targetEntry,
          restoreInfo: {
            documentID: String(targetInfo?.documentID || "").trim(),
          },
        });
      }
      const updated = existingProgramDocuments.filter((_, i) => i !== idx);
      const nextPlannerRoot = await planner.persistStudyPlannerDocuments([
        ...updated.map(sanitizeDocumentEntry),
        ...stagedDocs.map(({ _staged, ...rest }) => sanitizeDocumentEntry(rest)),
      ]);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      setSubmitState({ loading: false, error: "" });
    } catch (err) {
      setSubmitState({ loading: false, error: String(err?.message || "Failed to delete.") });
    }
  };

  const handleDeleteStaged = (idx) => {
    setStagedDocs((prev) => {
      const nextDocs = prev.filter((_, i) => i !== idx);
      if (nextDocs.length === 0) {
        setShowSubmitAction(false);
      }
      return nextDocs;
    });
  };

  const sanitizeDocumentEntry = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    return entry;
  };

  const buildEntryFromDraft = (previousEntry = null, existingPages = [], nextDocNum = null) => {
    const previousInfo = getDocumentInfoForEntry(previousEntry);
    const docSymbol = String(previousInfo?.documentSymbol || "DOC");
    const storedDocNum = Number.isFinite(Number(previousInfo?.documentNum)) && Number(previousInfo.documentNum) > 0
      ? Number(previousInfo.documentNum)
      : null;
    const docNum = storedDocNum ?? nextDocNum;
    const lectureIdRaw = String(draft.documentLectureID || "").trim();
    let documentID = String(previousInfo?.documentID || "");
    if (lectureIdRaw) {
      documentID = [lectureIdRaw, docSymbol, docNum != null ? String(docNum) : ""]
        .filter(Boolean)
        .join("")
        .replace(/[-_]/g, "");
    }
    const { documentLectureID: _lid, documentLectureName: _lname, ...previousEntryClean } =
      previousEntry && typeof previousEntry === "object" ? previousEntry : {};
    return {
      ...previousEntryClean,
      documentInfo: {
        documentSymbol: docSymbol,
        documentNum: docNum,
        documentID,
        documentLectureID: lectureIdRaw,
        documentLectureName: String(
          draft.documentLectureName ||
            lectureOptions.find((option) => String(option?.value || "").trim() === lectureIdRaw)
              ?.lectureName ||
            "",
        ).trim(),
        documentName: String(draft.documentName || "").trim(),
        documentType: draft.documentType,
        documentVolumeUnit: draft.documentVolumeUnit,
        documentVolume: draft.documentVolume !== "" ? Number(draft.documentVolume) : null,
        documentPages: buildDocumentPagesFromVolume(
          draft.documentVolume,
          existingPages,
        ),
        documentEditors: draft.documentEditors,
      },
      documentURL: String(previousEntry?.documentURL || "").trim(),
    };
  };

  const handleAddOrEditDocument = async () => {
    const documentName = String(draft.documentName || "").trim();
    if (!documentName) return;

    if (editingRef === null) {
      const nextDocNum = existingProgramDocuments.length + stagedDocs.length + 1;
      const newEntry = buildEntryFromDraft(null, [], nextDocNum);
      setStagedDocs((prev) => [...prev, { ...newEntry, _staged: true }]);
      setDraft(EMPTY_STORED_DOC_DRAFT);
      setShowSubmitAction(true);
    } else if (editingRef.source === "staged") {
      const currentStagedEntry = stagedDocs[editingRef.idx] || {};
      const currentStagedPages = Array.isArray(
        getDocumentInfoForEntry(currentStagedEntry)?.documentPages,
      )
        ? getDocumentInfoForEntry(currentStagedEntry).documentPages
        : [];
      const stagedEntryWithPages = buildEntryFromDraft(
        currentStagedEntry,
        currentStagedPages,
        existingProgramDocuments.length + editingRef.idx + 1,
      );
      setStagedDocs((prev) =>
        prev.map((e, i) =>
          i === editingRef.idx ? { ...stagedEntryWithPages, _staged: true } : e,
        ),
      );
      setDraft({
        documentName: String(stagedEntryWithPages?.documentInfo?.documentName || ""),
        documentType: String(stagedEntryWithPages?.documentInfo?.documentType || ""),
        documentVolumeUnit: String(
          stagedEntryWithPages?.documentInfo?.documentVolumeUnit || "",
        ),
        documentVolume:
          stagedEntryWithPages?.documentInfo?.documentVolume != null
            ? String(stagedEntryWithPages.documentInfo.documentVolume)
            : "",
        documentEditors: Array.isArray(
          stagedEntryWithPages?.documentInfo?.documentEditors,
        )
          ? stagedEntryWithPages.documentInfo.documentEditors
          : [],
        documentLectureID: String(stagedEntryWithPages?.documentInfo?.documentLectureID || ""),
        documentLectureName: String(stagedEntryWithPages?.documentInfo?.documentLectureName || ""),
      });
      setShowSubmitAction(false);
    } else {
      setSubmitState({ loading: true, error: "" });
      try {
        const currentExistingEntry = existingProgramDocuments[editingRef.idx] || {};
        const currentExistingPages = Array.isArray(
          getDocumentInfoForEntry(currentExistingEntry)?.documentPages,
        )
          ? getDocumentInfoForEntry(currentExistingEntry).documentPages
          : [];
        const existingEntryWithPages = buildEntryFromDraft(
          currentExistingEntry,
          currentExistingPages,
          editingRef.idx + 1,
        );
        const updatedExisting = existingProgramDocuments.map((e, i) =>
          i === editingRef.idx ? existingEntryWithPages : e,
        );
        const nextPlannerRoot = await planner.persistStudyPlannerDocuments([
          ...updatedExisting.map(sanitizeDocumentEntry),
          ...stagedDocs.map(({ _staged, ...rest }) => sanitizeDocumentEntry(rest)),
        ]);
        if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
          planner.setState({ plannerRoot: nextPlannerRoot });
        }
        setDraft(EMPTY_STORED_DOC_DRAFT);
        setEditingRef(null);
        setShowSubmitAction(false);
        setSubmitState({ loading: false, error: "" });
      } catch (err) {
        setSubmitState({ loading: false, error: String(err?.message || "Failed to save.") });
      }
    }
  };

  const handleSubmit = async () => {
    if (stagedDocs.length === 0) return;
    setSubmitState({ loading: true, error: "" });
    try {
      const allDocs = [
        ...existingProgramDocuments.map(sanitizeDocumentEntry),
        ...stagedDocs.map(({ _staged, ...rest }) => sanitizeDocumentEntry(rest)),
      ];
      const nextPlannerRoot = await planner.persistStudyPlannerDocuments(allDocs);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      setStagedDocs([]);
      setIsEditing(false);
      setShowSubmitAction(false);
      setDraft(EMPTY_STORED_DOC_DRAFT);
      setSubmitState({ loading: false, error: "" });
    } catch (err) {
      setSubmitState({ loading: false, error: String(err?.message || "Failed to save.") });
    }
  };

  const formatDocumentPageNumbers = (documentInfo = {}) => {
    const pageNumbers = getDocumentPagesForUi(documentInfo)
      .map((pageEntry) => Number(pageEntry?.pageOrder))
      .filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0);
    return pageNumbers.length > 0 ? pageNumbers.join(", ") : "—";
  };
  const toggleExistingDocumentPageDone = async (documentIndex, pageNumber) => {
    if (!Number.isInteger(documentIndex) || documentIndex < 0) {
      return;
    }
    if (!Number.isFinite(Number(pageNumber)) || Number(pageNumber) <= 0) {
      return;
    }
    setSubmitState({ loading: true, error: "" });
    try {
      const updatedExisting = existingProgramDocuments.map((entry, idx) => {
        if (idx !== documentIndex) {
          return entry;
        }
        const info = getDocumentInfoForEntry(entry);
        const currentPages = getDocumentPagesForUi(info);
        const nextPages = currentPages.map((pageEntry) => {
          if (Number(pageEntry?.pageOrder) !== Number(pageNumber)) {
            return pageEntry;
          }
          const isDone =
            String(pageEntry?.pageStatus || "").trim().toLowerCase() === "done";
          return {
            ...pageEntry,
            pageStatus: isDone ? null : "done",
          };
        });
        return {
          ...entry,
          documentInfo: {
            ...info,
            documentVolume: resolveDocumentVolumeNumber(info),
            documentPages: nextPages,
          },
        };
      });
      const nextPlannerRoot = await planner.persistStudyPlannerDocuments([
        ...updatedExisting.map(sanitizeDocumentEntry),
        ...stagedDocs.map(({ _staged, ...rest }) => sanitizeDocumentEntry(rest)),
      ]);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      setSubmitState({ loading: false, error: "" });
    } catch (err) {
      setSubmitState({
        loading: false,
        error: String(err?.message || "Failed to update document progress."),
      });
    }
  };
  const renderDocumentPageButtons = (documentInfo = {}, options = {}) => {
    const pages = getDocumentPagesForUi(documentInfo);
    if (pages.length === 0) {
      return "—";
    }
    const { onPageClick = null, disabled = false } = options;
    return (
      <div className="nogaPlanner_documentsPageList">
        {pages.map((pageEntry) => {
          const pageNumber = Number(pageEntry?.pageOrder);
          const isDone =
            String(pageEntry?.pageStatus || "").trim().toLowerCase() === "done";
          return (
            <button
              key={`nogaPlanner_documentsPageBtn_${pageNumber}`}
              type="button"
              className={
                "nogaPlanner_documentsPageBtn" +
                (isDone ? " nogaPlanner_documentsPageBtn--done" : "")
              }
              disabled={disabled}
              onClick={
                typeof onPageClick === "function"
                  ? () => onPageClick(pageNumber)
                  : undefined
              }
            >
              {pageNumber}
            </button>
          );
        })}
      </div>
    );
  };

  const documentRows = useMemo(() => {
    const normalizedPlannerRoot =
      typeof planner?.normalizePlannerRootForUi === "function"
        ? planner.normalizePlannerRootForUi(plannerRoot)
        : plannerRoot;
    const programIntervals = Array.isArray(normalizedPlannerRoot?.programIntervals)
      ? normalizedPlannerRoot.programIntervals
      : [];

    const rows = [];

    programIntervals.forEach((intervalEntry) => {
      const intervalLabel =
        String(intervalEntry?.intervalID || "").trim() ||
        [intervalEntry?.intervalSymbol, intervalEntry?.intervalNum]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join("");
      const subIntervals = Array.isArray(intervalEntry?.intervalSubIntervals)
        ? intervalEntry.intervalSubIntervals
        : [];

      subIntervals.forEach((subIntervalEntry) => {
        const subIntervalLabel =
          String(subIntervalEntry?.subIntervalID || "").trim() ||
          [subIntervalEntry?.subIntervalSymbol, subIntervalEntry?.subIntervalNum]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join("");
        const courses = Array.isArray(subIntervalEntry?.subIntervalCourses)
          ? subIntervalEntry.subIntervalCourses
          : [];

        courses.forEach((courseEntry) => {
          const courseName = String(courseEntry?.course_name || "").trim();
          const courseCode = String(courseEntry?.course_code || "").trim();
          const courseLabel = [courseName, courseCode].filter(Boolean).join(" | ");
          const courseComponents = Array.isArray(courseEntry?.courseComponents)
            ? courseEntry.courseComponents
            : [];

          courseComponents.forEach((componentEntry) => {
            const componentLabel = String(
              componentEntry?.course_classSelection ||
                componentEntry?.course_class ||
                componentEntry?.componentID ||
                "",
            ).trim();
            const componentExams = Array.isArray(componentEntry?.componentExams)
              ? componentEntry.componentExams
              : [];

            componentExams.forEach((examEntry) => {
              const examLabel = String(
                examEntry?.exam_name ||
                  examEntry?.taskID ||
                  examEntry?.examClass ||
                  "",
              ).trim();
              const lectures = Array.isArray(examEntry?.tasksLectures)
                ? examEntry.tasksLectures
                : [];

              lectures.forEach((lectureEntry) => {
                const lectureLabel = String(
                  lectureEntry?.lecture_name ||
                    lectureEntry?.lectureName ||
                    lectureEntry?.lectureID ||
                    "",
                ).trim();
                const lectureDocuments = Array.isArray(lectureEntry?.lectureDocuments)
                  ? lectureEntry.lectureDocuments
                  : [];

                lectureDocuments.forEach((documentEntry, documentIndex) => {
                  const documentInfo = getDocumentInfoForEntry(documentEntry);
                  const documentId = String(
                    documentInfo?.documentID || "",
                  ).trim();
                  const documentName = String(
                    documentInfo?.documentName || "",
                  ).trim();
                  const documentUrl = String(
                    documentEntry?.documentURL || "",
                  ).trim();

                  rows.push({
                    key:
                      documentId ||
                      [
                        subIntervalLabel,
                        courseLabel,
                        componentLabel,
                        lectureLabel,
                        documentName,
                        documentIndex,
                      ].join("|"),
                    documentID: documentId,
                    documentName,
                    documentType: String(
                      documentInfo?.documentType || "",
                    ).trim(),
                    documentVolume: formatDocumentVolume(documentInfo),
                    documentByteSize: formatDocumentSize(
                      documentInfo?.documentByteSize,
                    ),
                    documentEditors: formatStringList(
                      documentInfo?.documentEditors,
                    ),
                    documentConcepts: formatStringList(
                      documentInfo?.documentConcepts,
                    ),
                    documentURL: documentUrl,
                    lectureLabel,
                    examLabel,
                    componentLabel,
                    courseLabel,
                    subIntervalLabel,
                    intervalLabel,
                  });
                });
              });
            });
          });
        });
      });
    });

    return rows.sort((left, right) =>
      [
        left.intervalLabel,
        left.subIntervalLabel,
        left.courseLabel,
        left.lectureLabel,
        left.documentName,
        left.documentID,
      ]
        .join("|")
        .localeCompare(
          [
            right.intervalLabel,
            right.subIntervalLabel,
            right.courseLabel,
            right.lectureLabel,
            right.documentName,
            right.documentID,
          ].join("|"),
        ),
    );
  }, [planner, plannerRoot]);

  useEffect(() => {
    if (!titleActionsId || typeof document === "undefined") {
      setTitleActionsHost(null);
      return;
    }
    setTitleActionsHost(document.getElementById(titleActionsId));
  }, [
    titleActionsId,
    isEditing,
    editingRef,
    draft.documentName,
    showSubmitAction,
    submitState.loading,
    stagedDocs.length,
    existingProgramDocuments.length,
  ]);

  return (
    <div
      id="nogaPlanner_documentsPanel"
      className="nogaPlanner_documentsPanel"
    >
      {submitState.loading ? (
        <div className="nogaPlanner_homePanelCardPendingOverlay" role="status" aria-live="polite">
          <div className="nogaPlanner_homePanelCardBodyLoaderBox">
            <span className="nogaPlanner_homePanelCardBodyLoaderSpinner" />
            <span className="nogaPlanner_homePanelCardBodyLoaderText">
              Saving documents...
            </span>
          </div>
        </div>
      ) : null}
      {titleActionsHost
        ? createPortal(
            <div className="nogaPlanner_homePanelCardActions">
              {isEditing ? (
                editingRef !== null || isDraftPopulated || !showSubmitAction ? (
                  <button
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn"
                    disabled={!String(draft.documentName || "").trim()}
                    onClick={handleAddOrEditDocument}
                  >
                    {isEditingExistingDocument ? "Apply Changes" : "Add Document"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
                    disabled={submitState.loading || stagedDocs.length === 0}
                    onClick={handleSubmit}
                  >
                    {submitState.loading ? "Saving…" : "Submit"}
                  </button>
                )
              ) : existingProgramDocuments.length === 0 ? (
                <button
                  type="button"
                  className="nogaPlanner_homePanelCardSetBtn"
                  onClick={() => {
                    setShowSubmitAction(false);
                    setEditingRef(null);
                    setIsEditing(true);
                  }}
                >
                  Add
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn"
                    onClick={() => {
                      setShowSubmitAction(false);
                      setEditingRef(null);
                      setIsEditing(true);
                    }}
                  >
                    Add
                  </button>
                </>
              )}
            </div>,
            titleActionsHost,
          )
        : null}
      {submitState.error ? (
        <p className="nogaPlanner_documentsStagedError">{submitState.error}</p>
      ) : null}
      <div className="nogaPlanner_documentsEditorOverviewRow">
        {isEditing ? (
          <div className="nogaPlanner_storedDocumentFormScrollWrap">
            <StoredDocumentFormFields
              draft={draft}
              setDraft={setDraft}
              documentTypes={documentTypes}
              volumeUnits={volumeUnits}
              programEditors={programEditors}
              lectureOptions={lectureOptions}
            />
          </div>
        ) : null}
        <div className="nogaPlanner_documentsOverviewLayout">
          <div
            id="nogaPlanner_documentsTableWrap"
            className="nogaPlanner_homeIntervalsTableWrap nogaPlanner_documentsTableWrap"
          >
          <table
            id="nogaPlanner_documentsTable"
            className="nogaPlanner_homeIntervalsMiniTable nogaPlanner_documentsTable"
          >
            <thead id="nogaPlanner_documentsTableHead">
              <tr>
                {showDocumentIds ? <th rowSpan={2}>Document ID</th> : null}
                <th rowSpan={2}>Document Name</th>
                <th rowSpan={2}>Lecture</th>
                <th rowSpan={2}>Type</th>
                <th rowSpan={2}>Volume Unit</th>
                <th colSpan={3}>Volume</th>
                <th rowSpan={2}>Pages</th>
                <th rowSpan={2}>Editors</th>
                <th rowSpan={2}>Actions</th>
              </tr>
              <tr>
                <th>Total</th>
                <th>Done</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody id="nogaPlanner_documentsTableBody">
              {existingProgramDocuments.length > 0 || stagedDocs.length > 0 ? (
                <>
                  {existingProgramDocuments.map((entry, idx) => {
                    const isBeingEdited = editingRef?.source === "existing" && editingRef?.idx === idx;
                    const storedInfo = entry?.documentInfo || {};
                    const info = isBeingEdited
                      ? {
                          ...storedInfo,
                          documentName: draft.documentName,
                          documentType: draft.documentType,
                          documentVolumeUnit: draft.documentVolumeUnit,
                          documentVolume: draft.documentVolume !== "" ? Number(draft.documentVolume) : null,
                          documentEditors: draft.documentEditors,
                        }
                      : storedInfo;
                    const totalVolume = resolveDocumentVolumeNumber(info);
                    const doneVolume = getDocumentPagesForUi(info).filter(
                      (pageEntry) =>
                        String(pageEntry?.pageStatus || "")
                          .trim()
                          .toLowerCase() === "done",
                    ).length;
                    const remainingVolume =
                      totalVolume != null && doneVolume != null
                        ? Math.max(0, totalVolume - doneVolume)
                        : totalVolume != null
                          ? totalVolume
                          : null;
                    return (
                      <tr
                        key={`prog-doc-${idx}`}
                        className={
                          "nogaPlanner_tabTableRow" +
                          (isBeingEdited ? " nogaPlanner_documentsTableRow--editing" : "")
                        }
                      >
                        {showDocumentIds ? (
                          <td className="nogaPlanner_homePanelRowIdCell">
                            {renderLocalizedDocumentText(info.documentID || "—")}
                          </td>
                        ) : null}
                        <td>{renderLocalizedDocumentText(info.documentName || "—")}</td>
                        <td>{isBeingEdited
                          ? String(draft.documentLectureName || storedInfo.documentLectureName || "—")
                          : String(storedInfo.documentLectureName || "—")}
                        </td>
                        <td>{String(info.documentType || "—")}</td>
                        <td>{String(info.documentVolumeUnit || "—")}</td>
                        <td>{totalVolume != null ? totalVolume : "—"}</td>
                        <td>{doneVolume != null ? doneVolume : "—"}</td>
                        <td>{remainingVolume != null ? remainingVolume : "—"}</td>
                        <td>
                          {renderDocumentPageButtons(info, {
                            disabled: submitState.loading,
                            onPageClick: (pageNumber) =>
                              toggleExistingDocumentPageDone(idx, pageNumber),
                          })}
                        </td>
                        <td>{formatStringList(info.documentEditors) || "—"}</td>
                        <td className="nogaPlanner_documentsActionsCell">
                          <div className="nogaPlanner_materialMetadataActionsGroup">
                            <button
                              type="button"
                              className="nogaPlanner_homeIntervalsDeleteIconBtn"
                              aria-label="Edit document"
                              disabled={submitState.loading}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleStartEdit(entry, "existing", idx);
                              }}
                            >
                              <i className="fi fi-rr-pencil" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="nogaPlanner_homeIntervalsDeleteIconBtn"
                              aria-label="Delete document"
                              disabled={submitState.loading}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteExisting(idx);
                              }}
                            >
                              <i className="fi fi-br-cross" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {stagedDocs.map((entry, idx) => {
                    const isBeingEdited = editingRef?.source === "staged" && editingRef?.idx === idx;
                    const storedInfo = entry?.documentInfo || {};
                    const info = isBeingEdited
                      ? {
                          ...storedInfo,
                          documentName: draft.documentName,
                          documentType: draft.documentType,
                          documentVolumeUnit: draft.documentVolumeUnit,
                          documentVolume: draft.documentVolume !== "" ? Number(draft.documentVolume) : null,
                          documentEditors: draft.documentEditors,
                        }
                      : storedInfo;
                    const totalVolume = resolveDocumentVolumeNumber(info);
                    const doneVolume = getDocumentPagesForUi(info).filter(
                      (pageEntry) =>
                        String(pageEntry?.pageStatus || "")
                          .trim()
                          .toLowerCase() === "done",
                    ).length;
                    const remainingVolume =
                      totalVolume != null && doneVolume != null
                        ? Math.max(0, totalVolume - doneVolume)
                        : totalVolume != null
                          ? totalVolume
                          : null;
                    return (
                      <tr
                        key={`staged-doc-${idx}`}
                        className={
                          "nogaPlanner_tabTableRow nogaPlanner_tabTableRow--staged" +
                          (isBeingEdited ? " nogaPlanner_documentsTableRow--editing" : "")
                        }
                      >
                        {showDocumentIds ? (
                          <td className="nogaPlanner_homePanelRowIdCell">
                            {renderLocalizedDocumentText(info.documentID || "—")}
                          </td>
                        ) : null}
                        <td>{renderLocalizedDocumentText(info.documentName || "—")}</td>
                        <td>{isBeingEdited
                          ? String(draft.documentLectureName || storedInfo.documentLectureName || "—")
                          : String(storedInfo.documentLectureName || "—")}
                        </td>
                        <td>{String(info.documentType || "—")}</td>
                        <td>{String(info.documentVolumeUnit || "—")}</td>
                        <td>{totalVolume != null ? totalVolume : "—"}</td>
                        <td>{doneVolume != null ? doneVolume : "—"}</td>
                        <td>{remainingVolume != null ? remainingVolume : "—"}</td>
                        <td>
                          {renderDocumentPageButtons(info, {
                            disabled: true,
                          })}
                        </td>
                        <td>{formatStringList(info.documentEditors) || "—"}</td>
                        <td className="nogaPlanner_documentsActionsCell">
                          <div className="nogaPlanner_materialMetadataActionsGroup">
                            <button
                              type="button"
                              className="nogaPlanner_homeIntervalsDeleteIconBtn"
                              aria-label="Edit staged document"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleStartEdit(entry, "staged", idx);
                              }}
                            >
                              <i className="fi fi-rr-pencil" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="nogaPlanner_homeIntervalsDeleteIconBtn"
                              aria-label="Delete staged document"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteStaged(idx);
                              }}
                            >
                              <i className="fi fi-br-cross" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ) : (
                <tr id="nogaPlanner_documentsTableEmptyRow">
                <td
                  id="nogaPlanner_documentsTableEmptyCell"
                  colSpan={showDocumentIds ? 11 : 10}
                >
                  No stored documents found in lectureDocuments.
                </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};

const NogaPlannerDocumentsPanel = ({ planner }) => (
  <div id="nogaPlanner_documentsPanel" className="nogaPlanner_documentsPanel">
    <StagedDocumentForm planner={planner} />
  </div>
);

export default NogaPlannerDocumentsPanel;
