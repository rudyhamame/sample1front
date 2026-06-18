import React, { useMemo, useState } from "react";
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
  const volume = Number(documentEntry?.documentVolume);
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
            className="nogaPlanner_savedCoursesDetailsInput"
            value={String(info.documentName || "")}
            onChange={(e) => handleInfoChange("documentName", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Type</span>
          <input
            type="text"
            className="nogaPlanner_savedCoursesDetailsInput"
            value={String(info.documentType || "")}
            onChange={(e) => handleInfoChange("documentType", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Volume Unit</span>
          <input
            type="text"
            className="nogaPlanner_savedCoursesDetailsInput"
            placeholder="page / image / words"
            value={String(info.documentVolumeUnit || "")}
            onChange={(e) => handleInfoChange("documentVolumeUnit", e.target.value)}
          />
        </label>
        <label className="nogaPlanner_documentsStagedLabel">
          <span>Volume</span>
          <input
            type="number"
            className="nogaPlanner_savedCoursesDetailsInput"
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
            className="nogaPlanner_savedCoursesDetailsInput"
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
            className="nogaPlanner_savedCoursesDetailsInput"
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
            className="nogaPlanner_savedCoursesDetailsInput"
            readOnly
            value={String(draft.documentURL || "")}
            placeholder="Upload the PDF to fill this"
          />
        </label>
      </div>

      <label className="nogaPlanner_documentsStagedLabel nogaPlanner_documentsStagedLabel--url">
        <span>Lecture</span>
        <select
          className="nogaPlanner_savedCoursesDetailsInput"
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
};

const StoredDocumentFormFields = ({ draft, setDraft, documentTypes, volumeUnits, programEditors }) => {
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
      <div className="nogaPlanner_storedDocumentFormRow">
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Name</span>
          <input
            type="text"
            className="nogaPlanner_savedCoursesDetailsInput"
            value={draft.documentName}
            onChange={(e) => setDraft((prev) => ({ ...prev, documentName: e.target.value }))}
            placeholder="Enter document name"
          />
        </label>
        <label className="nogaPlanner_storedDocumentFormField">
          <span className="nogaPlanner_homeIntervalsMiniFormEyebrow">Document Type</span>
          <select
            className="nogaPlanner_savedCoursesDetailsInput"
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
            className="nogaPlanner_savedCoursesDetailsInput"
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
            className="nogaPlanner_savedCoursesDetailsInput"
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
              className="nogaPlanner_savedCoursesDetailsInput"
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
    </div>
  );
};

export const StoredDocumentsCard = ({ planner }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRef, setEditingRef] = useState(null); // { source: "existing"|"staged", idx }
  const [draft, setDraft] = useState(EMPTY_STORED_DOC_DRAFT);
  const [stagedDocs, setStagedDocs] = useState([]);
  const [submitState, setSubmitState] = useState({ loading: false, error: "" });

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

  const existingProgramDocuments = useMemo(
    () =>
      Array.isArray(plannerRoot?.programDocuments) ? plannerRoot.programDocuments : [],
    [plannerRoot],
  );

  const handleStartEdit = (entry, source, idx) => {
    const info = entry?.documentInfo || {};
    setDraft({
      documentName: String(info.documentName || ""),
      documentType: String(info.documentType || ""),
      documentVolumeUnit: String(info.documentVolumeUnit || ""),
      documentVolume: info.documentVolume?.total != null ? String(info.documentVolume.total) : "",
      documentEditors: Array.isArray(info.documentEditors) ? info.documentEditors : [],
    });
    setEditingRef({ source, idx });
    setIsEditing(true);
  };

  const handleDeleteExisting = async (idx) => {
    setSubmitState({ loading: true, error: "" });
    try {
      const updated = existingProgramDocuments.filter((_, i) => i !== idx);
      const nextPlannerRoot = await planner.persistStudyPlannerDocuments([...updated, ...stagedDocs.map(({ _staged, ...rest }) => rest)]);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      setSubmitState({ loading: false, error: "" });
    } catch (err) {
      setSubmitState({ loading: false, error: String(err?.message || "Failed to delete.") });
    }
  };

  const handleDeleteStaged = (idx) => {
    setStagedDocs((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildEntryFromDraft = () => ({
    documentInfo: {
      documentName: String(draft.documentName || "").trim(),
      documentType: draft.documentType,
      documentVolumeUnit: draft.documentVolumeUnit,
      documentVolume: {
        total: draft.documentVolume !== "" ? Number(draft.documentVolume) : null,
        done: null,
      },
      documentEditors: draft.documentEditors,
    },
    documentURL: "",
  });

  const handleAddOrEditDocument = async () => {
    const documentName = String(draft.documentName || "").trim();
    if (!documentName) return;
    const newEntry = buildEntryFromDraft();

    if (editingRef === null) {
      setStagedDocs((prev) => [...prev, { ...newEntry, _staged: true }]);
      setDraft(EMPTY_STORED_DOC_DRAFT);
    } else if (editingRef.source === "staged") {
      setStagedDocs((prev) =>
        prev.map((e, i) => (i === editingRef.idx ? { ...newEntry, _staged: true } : e)),
      );
      setEditingRef(null);
      setDraft(EMPTY_STORED_DOC_DRAFT);
    } else {
      setSubmitState({ loading: true, error: "" });
      try {
        const updatedExisting = existingProgramDocuments.map((e, i) =>
          i === editingRef.idx ? newEntry : e,
        );
        const nextPlannerRoot = await planner.persistStudyPlannerDocuments([
          ...updatedExisting,
          ...stagedDocs.map(({ _staged, ...rest }) => rest),
        ]);
        if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
          planner.setState({ plannerRoot: nextPlannerRoot });
        }
        setEditingRef(null);
        setDraft(EMPTY_STORED_DOC_DRAFT);
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
        ...existingProgramDocuments,
        ...stagedDocs.map(({ _staged, ...rest }) => rest),
      ];
      const nextPlannerRoot = await planner.persistStudyPlannerDocuments(allDocs);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      setStagedDocs([]);
      setIsEditing(false);
      setDraft(EMPTY_STORED_DOC_DRAFT);
      setSubmitState({ loading: false, error: "" });
    } catch (err) {
      setSubmitState({ loading: false, error: String(err?.message || "Failed to save.") });
    }
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
                  const documentId = String(
                    documentEntry?.documentID || "",
                  ).trim();
                  const documentName = String(
                    documentEntry?.documentName || "",
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
                      documentEntry?.documentType || "",
                    ).trim(),
                    documentVolume: formatDocumentVolume(documentEntry),
                    documentByteSize: formatDocumentSize(
                      documentEntry?.documentByteSize,
                    ),
                    documentEditors: formatStringList(
                      documentEntry?.documentEditors,
                    ),
                    documentConcepts: formatStringList(
                      documentEntry?.documentConcepts,
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
  }, [planner]);

  return (
    <div
      id="nogaPlanner_documentsPanel"
      className="nogaPlanner_documentsPanel"
    >
      <div className="nogaPlanner_homePanelCardTitleRow">
        <strong>Program Documents</strong>
        {isEditing ? (
          <>
            <button
              type="button"
              className="nogaPlanner_homePanelCardSetBtn"
              disabled={!String(draft.documentName || "").trim()}
              onClick={handleAddOrEditDocument}
            >
              {editingRef !== null ? "Edit Document" : "Add Document"}
            </button>
            <button
              type="button"
              className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--submit"
              disabled={submitState.loading || stagedDocs.length === 0}
              onClick={handleSubmit}
            >
              {submitState.loading ? "Saving…" : "Submit"}
            </button>
          </>
        ) : existingProgramDocuments.length === 0 ? (
          <button
            type="button"
            className="nogaPlanner_homePanelCardSetBtn"
            onClick={() => setIsEditing(true)}
          >
            Set
          </button>
        ) : (
          <button
            type="button"
            className="nogaPlanner_homePanelCardSetBtn"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        )}
      </div>
      {submitState.error ? (
        <p className="nogaPlanner_documentsStagedError">{submitState.error}</p>
      ) : null}
      {isEditing ? (
        <StoredDocumentFormFields
          draft={draft}
          setDraft={setDraft}
          documentTypes={documentTypes}
          volumeUnits={volumeUnits}
          programEditors={programEditors}
        />
      ) : null}
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
              <th>Document Name</th>
              <th>Type</th>
              <th>Volume Unit</th>
              <th>Volume</th>
              <th>Editors</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="nogaPlanner_documentsTableBody">
            {existingProgramDocuments.length > 0 || stagedDocs.length > 0 ? (
              <>
                {existingProgramDocuments.map((entry, idx) => {
                  const info = entry?.documentInfo || {};
                  return (
                    <tr key={`prog-doc-${idx}`} className="nogaPlanner_tabTableRow">
                      <td>{String(info.documentName || "—")}</td>
                      <td>{String(info.documentType || "—")}</td>
                      <td>{String(info.documentVolumeUnit || "—")}</td>
                      <td>{info.documentVolume?.total != null ? info.documentVolume.total : "—"}</td>
                      <td>{formatStringList(info.documentEditors) || "—"}</td>
                      <td className="nogaPlanner_documentsActionsCell">
                        <button
                          type="button"
                          className="nogaPlanner_documentsActionBtn nogaPlanner_documentsActionBtn--edit"
                          disabled={submitState.loading}
                          onClick={() => handleStartEdit(entry, "existing", idx)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_documentsActionBtn nogaPlanner_documentsActionBtn--delete"
                          disabled={submitState.loading}
                          onClick={() => handleDeleteExisting(idx)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {stagedDocs.map((entry, idx) => {
                  const info = entry?.documentInfo || {};
                  return (
                    <tr key={`staged-doc-${idx}`} className="nogaPlanner_tabTableRow nogaPlanner_tabTableRow--staged">
                      <td>{String(info.documentName || "—")}</td>
                      <td>{String(info.documentType || "—")}</td>
                      <td>{String(info.documentVolumeUnit || "—")}</td>
                      <td>{info.documentVolume?.total != null ? info.documentVolume.total : "—"}</td>
                      <td>{formatStringList(info.documentEditors) || "—"}</td>
                      <td className="nogaPlanner_documentsActionsCell">
                        <button
                          type="button"
                          className="nogaPlanner_documentsActionBtn nogaPlanner_documentsActionBtn--edit"
                          onClick={() => handleStartEdit(entry, "staged", idx)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="nogaPlanner_documentsActionBtn nogaPlanner_documentsActionBtn--delete"
                          onClick={() => handleDeleteStaged(idx)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </>
            ) : (
              <tr id="nogaPlanner_documentsTableEmptyRow">
                <td
                  id="nogaPlanner_documentsTableEmptyCell"
                  colSpan={6}
                >
                  No stored documents found in lectureDocuments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
