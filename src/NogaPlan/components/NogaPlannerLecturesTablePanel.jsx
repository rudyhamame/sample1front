import React from "react";

const NogaPlannerLecturesTablePanel = ({
  planner,
  runtime,
  renderMode = "full",
}) => {
  const formatInstructorName = (entry) => {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    return [String(entry?.firstName || "").trim(), String(entry?.lastName || "").trim()]
      .filter(Boolean)
      .join(" ");
  };
  const {
    getCellAlignmentStyle,
    formatPlannerTextList,
    formatCourseLocationDisplay,
    buildCourseLectureMatchLabel,
    NOGAPLANNER_TEXT,
  } = runtime;
  const STUDY_PLAN_LABELS = NOGAPLANNER_TEXT.registryLabels.studyPlanAid;
  const STUDY_PLAN_OPTIONS = NOGAPLANNER_TEXT.selectsOptions.common;

  const {
    selectedTabItemId,
    deleteSelectionMode,
    deleteSelectionIds,
    lectureSortKey,
    lectureSortDirection,
    inlineLectureRowVisible,
    inlineLectureDraft,
  } = planner.state;
  const inlineLectureFormId = String(selectedTabItemId || "").trim()
    ? "nogaPlanner_form_editLecture"
    : "nogaPlanner_form_addLecture";
  let lecturesFormEditor = null;

  const courseEntries = Array.isArray(planner.state?.courses)
    ? planner.state.courses
    : [];
  const visibleLectures = planner.getLecturesForSelectedCourse();
  const sortedLectures = planner.getSortedLectures(visibleLectures);

  const courseByLectureLabel = new Map();
  const courseByName = new Map();
  courseEntries.forEach((course) => {
    const lectureLabel = String(
      buildCourseLectureMatchLabel(course) || "",
    ).trim();
    const courseName = String(course?.course_name || "").trim();
    if (lectureLabel && !courseByLectureLabel.has(lectureLabel)) {
      courseByLectureLabel.set(lectureLabel, course);
    }
    if (courseName && !courseByName.has(courseName)) {
      courseByName.set(courseName, course);
    }
  });

  const resolveLectureCourse = (lecture = {}) => {
    const lectureCourseLabel = String(lecture?.lecture_course || "").trim();
    if (lectureCourseLabel && courseByLectureLabel.has(lectureCourseLabel)) {
      return courseByLectureLabel.get(lectureCourseLabel) || null;
    }
    const lectureCourseName = String(
      lecture?.lecture_courseName || lecture?.course_name || "",
    ).trim();
    if (lectureCourseName && courseByName.has(lectureCourseName)) {
      return courseByName.get(lectureCourseName) || null;
    }
    return null;
  };

  const resolveLectureCourseName = (lecture = {}) => {
    const lectureCourseName = String(
      lecture?.lecture_courseName || lecture?.course_name || "",
    ).trim();
    if (lectureCourseName) {
      return lectureCourseName;
    }
    const matchedCourse = resolveLectureCourse(lecture);
    return String(matchedCourse?.course_name || "-").trim() || "-";
  };

  const resolveLectureComponentType = (lecture = {}) => {
    const directValue = String(
      lecture?.course_class ||
        lecture?.course_component ||
        lecture?.lecture_component ||
        "",
    ).trim();
    if (directValue) {
      return directValue;
    }

    const lectureComponentId = String(
      lecture?.lecture_componentId || lecture?.course_componentId || "",
    ).trim();
    if (lectureComponentId) {
      const matchedCourse = resolveLectureCourse(lecture);
      const matchedComponent = Array.isArray(matchedCourse?.course_components)
        ? matchedCourse.course_components.find(
            (component) =>
              String(component?._id || "").trim() === lectureComponentId,
          )
        : null;
      const fromMatchedComponent = String(
        matchedComponent?.course_class || "",
      ).trim();
      if (fromMatchedComponent) {
        return fromMatchedComponent;
      }
    }

    const matchedCourse = resolveLectureCourse(lecture);
    return String(matchedCourse?.course_class || "-").trim() || "-";
  };

  const renderLectureSortLabel = (sortKey, fallbackLabel) => {
    const isActive = lectureSortKey === sortKey;
    const sortMarker = isActive
      ? lectureSortDirection === "asc"
        ? " ?"
        : " ?"
      : "";
    return `${fallbackLabel}${sortMarker}`;
  };

  const lectureCourseOptions = planner.getLectureCourseOptions();
  const lectureComponentOptions =
    planner.getLectureComponentOptionsByCourseName(
      inlineLectureDraft?.lecture_courseId,
    );
  const lectureInstructorOptions = (
    planner.getLectureInstructorOptionsByCourseAndComponentId(
      inlineLectureDraft?.lecture_courseId,
      inlineLectureDraft?.lecture_componentId,
    ) || []
  ).filter(Boolean);
  const lectureFallbackInstructorOptions = planner.getLectureSettingsOptions("instructor");
  const resolvedLectureInstructorOptions =
    lectureInstructorOptions.length > 0
      ? lectureInstructorOptions
      : lectureFallbackInstructorOptions;
  const lectureWriterOptions = planner.getLectureSettingsOptions("writer");
  const lectureContentUploads = Array.isArray(
    inlineLectureDraft?.lecture_contentUploads,
  )
    ? inlineLectureDraft.lecture_contentUploads
    : [];
  const lectureVolumeTotal = Math.max(
    0,
    Number(inlineLectureDraft?.lecture_volume_total || 0) || 0,
  );
  const hasLectureSelectionContext =
    String(inlineLectureDraft?.lecture_courseId || "").trim().length > 0 &&
    String(inlineLectureDraft?.lecture_componentId || "").trim().length > 0;
  const hasLectureCourseSelection =
    String(inlineLectureDraft?.lecture_courseId || "").trim().length > 0;
  const lecturePagesFinishedSet = new Set(
    (Array.isArray(inlineLectureDraft?.lecture_pagesFinished)
      ? inlineLectureDraft.lecture_pagesFinished
      : []
    )
      .map((entry) => Number(entry))
      .filter(
        (entry) =>
          Number.isFinite(entry) && entry >= 1 && entry <= lectureVolumeTotal,
      ),
  );
  const lectureVolumeDone = lecturePagesFinishedSet.size;
  const lectureVolumeRemaining = Math.max(
    lectureVolumeTotal - lectureVolumeDone,
    0,
  );
  if (renderMode === "lecture-tab") {
    const plannerRoot = planner.getResolvedPlannerRoot();
    const plannerIntervals =
      typeof planner.getPlannerIntervalsWithComponents === "function"
        ? planner.getPlannerIntervalsWithComponents(plannerRoot)
        : [];
    const programInstructors = Array.isArray(plannerRoot?.programInstructors)
      ? plannerRoot.programInstructors.map((entry) => formatInstructorName(entry)).filter(Boolean)
      : [];
    const programEditors = Array.isArray(plannerRoot?.programEditors)
      ? plannerRoot.programEditors.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    const programLocations = Array.isArray(plannerRoot?.programLocations)
      ? plannerRoot.programLocations
      : [];
    const buildContextValue = (intervalId, subIntervalId, courseName, courseCode, componentId) =>
      `${intervalId}|${subIntervalId}|${courseName}|${courseCode}|${componentId}`;
    const normalizeLecturePagesFinished = (value = []) =>
      Array.from(
        new Set(
          (Array.isArray(value) ? value : [])
            .map((entry) => Number.parseInt(String(entry || "").trim(), 10))
            .filter((entry) => Number.isFinite(entry) && entry > 0),
        ),
      ).sort((left, right) => left - right);
    const buildLectureRowKey = (contextValue, lectureEntry, lectureIndex) => {
      const lectureId = String(lectureEntry?._id || "").trim();
      if (lectureId) {
        return lectureId;
      }
      return `${String(contextValue || "").trim()}_${lectureIndex}_${String(lectureEntry?.lectureName || "").trim()}`;
    };
    const contextOptions = [];
    const lectureRows = [];
    plannerIntervals.forEach((intervalEntry) => {
      const intervalId = String(
        intervalEntry?.intervalID || intervalEntry?.intervalId || "",
      ).trim();
      const subIntervalId = String(
        intervalEntry?.subIntervalID ||
          intervalEntry?.subIntervalId ||
          "",
      ).trim();
      const intervalCourses = Array.isArray(intervalEntry?.intervalCourses)
        ? intervalEntry.intervalCourses
        : [];
      intervalCourses.forEach((courseEntry) => {
          const courseName = String(courseEntry?.courseName || "").trim();
          const courseCode = String(courseEntry?.courseCode || "").trim();
          const courseComponents = Array.isArray(courseEntry?.courseComponents)
            ? courseEntry.courseComponents
            : [];
          courseComponents.forEach((componentEntry) => {
            const componentId = String(
              componentEntry?.componentClass ||
                componentEntry?.componentName ||
                componentEntry?.componentId ||
                "",
            ).trim();
            if (!courseName || !courseCode || !subIntervalId || !componentId) {
              return;
            }
            const contextValue = buildContextValue(
              intervalId,
              subIntervalId,
              courseName,
              courseCode,
              componentId,
            );
            contextOptions.push({
              value: contextValue,
              label: `${courseName} (${courseCode}): ${componentId} | ${subIntervalId}`,
              intervalId,
              subIntervalId,
              courseName,
              courseCode,
              componentId,
            });
            (Array.isArray(componentEntry?.componentLectures)
              ? componentEntry.componentLectures
              : []
            ).forEach((lectureEntry, lectureIndex) => {
              const lectureId = String(lectureEntry?._id || "").trim();
              const lectureKey = buildLectureRowKey(
                contextValue,
                lectureEntry,
                lectureIndex,
              );
              const lecturePagesFinished = normalizeLecturePagesFinished(
                lectureEntry?.lecture_pagesFinished,
              );
              const lectureVolumeTotal = Math.max(
                0,
                Number(lectureEntry?.lectureVolume?.total || 0) || 0,
              );
              const lectureVolumeDone = Math.min(
                lecturePagesFinished.length,
                lectureVolumeTotal,
              );
              const lectureVolumeRemaining = Math.max(
                lectureVolumeTotal - lectureVolumeDone,
                0,
              );
              lectureRows.push({
                key: lectureKey,
                lectureId,
                contextValue,
                contextLabel: `${courseName} (${courseCode}): ${componentId} | ${subIntervalId}`,
                lectureName: String(lectureEntry?.lectureName || "").trim(),
                lectureInstructors: Array.isArray(lectureEntry?.lectureInstructors)
                  ? lectureEntry.lectureInstructors
                  : [],
                lectureEditors: Array.isArray(lectureEntry?.lectureEditors)
                  ? lectureEntry.lectureEditors
                  : [],
                lectureVolume: {
                  ...(lectureEntry?.lectureVolume || {}),
                  unit: String(lectureEntry?.lectureVolume?.unit || "page"),
                  total: String(lectureVolumeTotal || ""),
                  done: String(lectureVolumeDone),
                  remaining: String(lectureVolumeRemaining),
                },
                lecturePagesFinished,
                lectureLocation: lectureEntry?.lectureLocation || {},
              });
            });
          });
      });
    });
    const [lectureDraft, setLectureDraft] = React.useState({
      lectureMetadataId: "",
      lectureName: "",
      lectureInstructor: "",
      lectureEditor: "",
      lectureVolumeTotal: "",
      lecturePagesFinished: [],
      lectureLocationKey: "",
    });
    const [editingLectureKey, setEditingLectureKey] = React.useState("");
    const [selectedLectureKey, setSelectedLectureKey] = React.useState("");
    const resolveLocationKey = (location = {}) =>
      `${String(location?.building || "").trim()}|${String(location?.room || "").trim()}`;
    const locationOptions = programLocations
      .map((entry) => ({
        key: resolveLocationKey(entry),
        value: resolveLocationKey(entry),
        label: formatCourseLocationDisplay(entry || {}),
        location: entry,
      }))
      .filter((entry) => entry.value && entry.label);
    const lectureDraftPagesFinished = normalizeLecturePagesFinished(
      lectureDraft?.lecturePagesFinished,
    );
    const lectureDraftTotalValue = Math.max(
      0,
      Number(lectureDraft.lectureVolumeTotal || 0) || 0,
    );
    const lectureDraftPagesFinishedWithinTotal = lectureDraftPagesFinished.filter(
      (pageNumber) => pageNumber <= lectureDraftTotalValue,
    );
    const lectureDraftDone = lectureDraftPagesFinishedWithinTotal.length;
    const lectureDraftRemaining = Math.max(
      0,
      lectureDraftTotalValue - lectureDraftDone,
    );
    const canSubmitLecture = Boolean(
      lectureDraft.lectureMetadataId &&
        lectureDraft.lectureName &&
        lectureDraft.lectureVolumeTotal !== "",
    );
    const getDraftPayload = () => ({
      lectureName: String(lectureDraft.lectureName || "").trim(),
      lectureInstructors: [String(lectureDraft.lectureInstructor || "").trim()].filter(Boolean),
      lectureEditors: [String(lectureDraft.lectureEditor || "").trim()].filter(Boolean),
      lectureGivenDate: null,
      lectureEditedDate: new Date(),
      lectureLocation:
        locationOptions.find((entry) => entry.value === lectureDraft.lectureLocationKey)
          ?.location || null,
      lecture_pagesFinished: lectureDraftPagesFinishedWithinTotal,
      lectureVolume: {
        unit: "page",
        total: String(lectureDraft.lectureVolumeTotal || ""),
        done: String(lectureDraftDone),
        remaining: String(lectureDraftRemaining || ""),
      },
      lectureContent: [],
    });
    const updateAllLectures = async (transform) => {
      const nextIntervals = plannerIntervals.map((intervalEntry) => {
        const intervalId = String(
          intervalEntry?.intervalID || intervalEntry?.intervalId || "",
        ).trim();
        const intervalNum = Number.isFinite(Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10))
          ? Number.parseInt(String(intervalEntry?.intervalNum || "").trim(), 10)
          : null;
        const intervalStatus = String(intervalEntry?.intervalStatus || "Normal").trim() || "Normal";
        const subIntervalId = String(
          intervalEntry?.subIntervalID ||
            intervalEntry?.subIntervalId ||
            "",
        ).trim();
        const nextSubIntervalCourses = (Array.isArray(intervalEntry?.intervalCourses)
          ? intervalEntry.intervalCourses
          : []
        ).map((courseEntry) => ({
            ...courseEntry,
            courseComponents: (Array.isArray(courseEntry?.courseComponents)
              ? courseEntry.courseComponents
              : []
            ).map((componentEntry) => ({
              ...componentEntry,
              componentClass: String(
                componentEntry?.componentClass ||
                  componentEntry?.componentName ||
                  componentEntry?.componentId ||
                  "",
              ).trim(),
              componentLectures: transform(
                Array.isArray(componentEntry?.componentLectures)
                  ? componentEntry.componentLectures
                  : [],
                buildContextValue(
                  intervalId,
                  subIntervalId,
                  String(courseEntry?.courseName || "").trim(),
                  String(courseEntry?.courseCode || "").trim(),
                  String(
                    componentEntry?.componentClass ||
                      componentEntry?.componentName ||
                      componentEntry?.componentId ||
                      "",
                  ).trim(),
                ),
              ),
            })),
          }));
        return {
          intervalId,
          intervalNum,
          intervalStatus,
          subIntervalID: subIntervalId,
          subIntervalNum: intervalEntry?.subIntervalNum ?? subIntervalId,
          subIntervalCourses: nextSubIntervalCourses,
        };
      });
      const nextPlannerRoot = await planner.persistStudyPlannerIntervals(nextIntervals);
      if (nextPlannerRoot && typeof nextPlannerRoot === "object") {
        planner.setState({ plannerRoot: nextPlannerRoot });
      }
      return nextPlannerRoot;
    };
    const clearLectureDraft = () => {
      setLectureDraft({
        lectureMetadataId: "",
        lectureName: "",
        lectureInstructor: "",
        lectureEditor: "",
        lectureVolumeTotal: "",
        lecturePagesFinished: [],
        lectureLocationKey: "",
      });
      setEditingLectureKey("");
    };
    const beginEditLecture = (rowEntry = {}) => {
      setLectureDraft({
        lectureMetadataId: String(rowEntry?.contextValue || "").trim(),
        lectureName: String(rowEntry?.lectureName || "").trim(),
        lectureInstructor: String(
          Array.isArray(rowEntry?.lectureInstructors)
            ? rowEntry.lectureInstructors[0] || ""
            : "",
        ).trim(),
        lectureEditor: String(
          Array.isArray(rowEntry?.lectureEditors)
            ? rowEntry.lectureEditors[0] || ""
            : "",
        ).trim(),
        lectureVolumeTotal: String(rowEntry?.lectureVolume?.total || ""),
        lecturePagesFinished: normalizeLecturePagesFinished(
          rowEntry?.lecturePagesFinished,
        ),
        lectureLocationKey: resolveLocationKey(rowEntry?.lectureLocation || {}),
      });
      setEditingLectureKey(String(rowEntry?.lectureId || rowEntry?.key || "").trim());
    };
    const selectedLectureRow =
      lectureRows.find((rowEntry) => String(rowEntry?.key || "") === selectedLectureKey) ||
      null;
    const selectedLectureTotal = Math.max(
      0,
      Number(selectedLectureRow?.lectureVolume?.total || 0) || 0,
    );
    const selectedLecturePagesFinished = normalizeLecturePagesFinished(
      selectedLectureRow?.lecturePagesFinished,
    ).filter((pageNumber) => pageNumber <= selectedLectureTotal);
    const selectedLectureDone = selectedLecturePagesFinished.length;
    const selectedLectureRemaining = Math.max(
      selectedLectureTotal - selectedLectureDone,
      0,
    );
    const toggleSelectedLecturePageFinished = async (pageNumber) => {
      if (!selectedLectureKey || !selectedLectureRow || selectedLectureTotal <= 0) {
        return;
      }

      try {
        await updateAllLectures((lectures, contextValue) =>
          lectures.map((lectureEntry, lectureIndex) => {
            const lectureKey = buildLectureRowKey(
              contextValue,
              lectureEntry,
              lectureIndex,
            );
            if (lectureKey !== selectedLectureKey) {
              return lectureEntry;
            }

            const lecturePages = normalizeLecturePagesFinished(
              lectureEntry?.lecture_pagesFinished,
            ).filter((entry) => entry <= selectedLectureTotal);
            const nextLecturePages = lecturePages.includes(pageNumber)
              ? lecturePages.filter((entry) => entry !== pageNumber)
              : [...lecturePages, pageNumber].sort((left, right) => left - right);
            const lectureTotal = Math.max(
              0,
              Number(lectureEntry?.lectureVolume?.total || 0) || 0,
            );

            return {
              ...lectureEntry,
              lecture_pagesFinished: nextLecturePages,
              lectureVolume: {
                ...(lectureEntry?.lectureVolume || {}),
                unit: String(lectureEntry?.lectureVolume?.unit || "page"),
                total: String(lectureTotal || ""),
                done: String(nextLecturePages.length),
                remaining: String(
                  Math.max(lectureTotal - nextLecturePages.length, 0),
                ),
              },
            };
          }),
        );
      } catch (error) {
        planner.props?.serverReply?.(
          String(error?.message || "Failed to update lecture pages."),
        );
      }
    };
    lecturesFormEditor =
      inlineLectureRowVisible && renderMode !== "table" ? (
        <form
          id={inlineLectureFormId}
          className="nogaPlanner_lecturesFormEditorLayout"
          data-panel-id="nogaPlanner_lecturesFormEditor"
          onSubmit={(event) => {
            event.preventDefault();
            planner.submitInlineLectureRow();
          }}
        >
          <div className="nogaPlanner_formCardTitleRow">
            <p
              id="nogaPlanner_lecturesFormCourseCardTitle"
              className="nogaPlanner_lecturesFormLabel"
            >
              {NOGAPLANNER_TEXT.lectures.formTitle}
            </p>
            {Boolean(planner.state?.plannerSettingsVisible) ? (
              <button
                id="nogaPlanner_lecturesFormCloseBtn"
                type="button"
                className="nogaPlanner_coursesMiniBarBtn nogaPlanner_formCardCloseBtn"
                onClick={planner.closeInlineLectureRow}
                aria-label={NOGAPLANNER_TEXT.settings.back}
                title={NOGAPLANNER_TEXT.settings.back}
              >
                <i className="fi fi-rc-arrow-alt-circle-left" />
              </button>
            ) : null}
          </div>
          <div
            id="nogaPlanner_lecturesFormCourseFieldsWrapper"
            className="nogaPlanner_lecturesFormCourseFieldsWrapperLayout"
          >
            <div
              id="nogaPlanner_lecturesFormCourseFieldsColumn_primary"
              className="nogaPlanner_lecturesFormFieldsColumn"
            >
              <span
                id="nogaPlanner_lecturesFieldLabel_columnPrimary"
                className="nogaPlanner_lecturesFieldEyebrow nogaPlanner_lecturesFieldEyebrow--columnTitle"
              >
                {NOGAPLANNER_TEXT.lectures.courseReferenceTitle}
              </span>
              <div
                id="nogaPlanner_lecturesFieldCluster_course"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_course"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.courseName}
                </span>
                <select
                  id="nogaPlanner_lecturesSelect_course"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={inlineLectureDraft?.lecture_courseId || ""}
                  onChange={(event) =>
                    planner.handleInlineLectureCourseChange(event.target.value)
                  }
                >
                  <option
                    id="nogaPlanner_lecturesSelect_course_option_default"
                    value=""
                  >
                    {NOGAPLANNER_TEXT.lectures.chooseCourse}
                  </option>
                  {lectureCourseOptions.map((entry, entryIndex) => (
                    <option
                      id={`nogaPlanner_lecturesSelect_course_option_${entryIndex}`}
                      key={entry.id}
                      value={entry.id}
                    >
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                id="nogaPlanner_lecturesFieldCluster_component"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_component"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.componentType}
                </span>
                <select
                  id="nogaPlanner_lecturesSelect_component"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  disabled={!hasLectureCourseSelection}
                  value={inlineLectureDraft?.lecture_componentId || ""}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const matched =
                      lectureComponentOptions.find(
                        (entry) => entry.id === nextId,
                      ) || null;
                    planner.handleInlineLectureDraftChange(
                      "lecture_componentId",
                      nextId,
                    );
                    planner.handleInlineLectureDraftChange(
                      "lecture_component",
                      matched ? matched.label : "",
                    );
                  }}
                >
                  <option
                    id="nogaPlanner_lecturesSelect_component_option_default"
                    value=""
                  >
                    {NOGAPLANNER_TEXT.lectures.chooseComponent}
                  </option>
                  {lectureComponentOptions.map((entry, entryIndex) => (
                    <option
                      id={`nogaPlanner_lecturesSelect_component_option_${entryIndex}`}
                      key={entry.id}
                      value={entry.id}
                    >
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              id="nogaPlanner_lecturesFormCourseFieldsColumn_secondary"
              className="nogaPlanner_lecturesFormFieldsColumn"
            >
              <span
                id="nogaPlanner_lecturesFieldLabel_columnSecondary"
                className="nogaPlanner_lecturesFieldEyebrow nogaPlanner_lecturesFieldEyebrow--columnTitle"
              >
                {NOGAPLANNER_TEXT.lectures.lectureInfoTitle}
              </span>
              <div
                id="nogaPlanner_lecturesFieldCluster_title"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_title"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.lectureTitle}
                </span>
                <input
                  id="nogaPlanner_lecturesInput_title"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  disabled={!hasLectureSelectionContext}
                  value={inlineLectureDraft?.lecture_name || ""}
                  onChange={(event) =>
                    planner.handleInlineLectureDraftChange(
                      "lecture_name",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div
                id="nogaPlanner_lecturesFieldCluster_instructors"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_instructors"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.instructors}
                </span>
                <select
                  id="nogaPlanner_lecturesSelect_instructors"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  disabled={!hasLectureSelectionContext}
                  value={inlineLectureDraft?.lecture_instructors || ""}
                  onChange={(event) =>
                    planner.handleInlineLectureDraftChange(
                      "lecture_instructors",
                      event.target.value,
                    )
                  }
                >
                  <option
                    id="nogaPlanner_lecturesSelect_instructors_option_default"
                    value=""
                  >
                    {NOGAPLANNER_TEXT.lectures.chooseInstructor}
                  </option>
                  {resolvedLectureInstructorOptions.map((entry, entryIndex) => (
                    <option
                      id={`nogaPlanner_lecturesSelect_instructors_option_${entryIndex}`}
                      key={entry}
                      value={entry}
                    >
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div
                id="nogaPlanner_lecturesFieldCluster_writers"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_writers"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.writers}
                </span>
                <select
                  id="nogaPlanner_lecturesSelect_writers"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  disabled={!hasLectureSelectionContext}
                  value={inlineLectureDraft?.lecture_writers || ""}
                  onChange={(event) =>
                    planner.handleInlineLectureDraftChange(
                      "lecture_writers",
                      event.target.value,
                    )
                  }
                >
                  <option
                    id="nogaPlanner_lecturesSelect_writers_option_default"
                    value=""
                  >
                    {NOGAPLANNER_TEXT.lectures.chooseWriter}
                  </option>
                  {lectureWriterOptions.map((entry, entryIndex) => (
                    <option
                      id={`nogaPlanner_lecturesSelect_writers_option_${entryIndex}`}
                      key={entry}
                      value={entry}
                    >
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div
                id="nogaPlanner_lecturesFieldCluster_volume"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_volume"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  Volume
                </span>
                <div className="nogaPlanner_savedCourseDetailGroupsGrid">
                  <input
                    id="nogaPlanner_lecturesInput_volume_total"
                    className="nogaPlanner_savedCoursesDetailsInput"
                    type="number"
                    min="1"
                    disabled={!hasLectureSelectionContext}
                    value={inlineLectureDraft?.lecture_volume_total || ""}
                    onChange={(event) =>
                      planner.handleInlineLectureVolumeTotalChange(
                        event.target.value,
                      )
                    }
                    placeholder="Total"
                  />
                </div>
                <div
                  id="nogaPlanner_lecturesVolumePageGrid"
                  className="nogaPlanner_lecturesVolumePageGrid"
                >
                  {Array.from({ length: lectureVolumeTotal }, (_, index) => {
                    const pageNumber = index + 1;
                    const isDone = lecturePagesFinishedSet.has(pageNumber);
                    return (
                      <button
                        id={`nogaPlanner_lecturesVolumePageCube_${pageNumber}`}
                        key={`nogaPlanner_lecturesVolumePageCube_${pageNumber}`}
                        type="button"
                        className={
                          "nogaPlanner_lecturesVolumePageCube" +
                          (isDone ? " is-done" : "")
                        }
                        disabled={!hasLectureSelectionContext}
                        onClick={() =>
                          planner.toggleInlineLecturePageFinished(pageNumber)
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>
                <p
                  id="nogaPlanner_lecturesVolumeStats"
                  className="nogaPlanner_lecturesVolumeStats"
                >
                  {`Finished: ${lectureVolumeDone} | Remaining: ${lectureVolumeRemaining}`}
                </p>
              </div>
              <div
                id="nogaPlanner_lecturesFieldCluster_date"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_date"
                  className="nogaPlanner_lecturesFieldEyebrow"
                >
                  {NOGAPLANNER_TEXT.lectures.publishDate}
                </span>
                <input
                  id="nogaPlanner_lecturesInput_date"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="date"
                  disabled={!hasLectureSelectionContext}
                  value={inlineLectureDraft?.lecture_date || ""}
                  onChange={(event) =>
                    planner.handleInlineLectureDraftChange(
                      "lecture_date",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div
                id="nogaPlanner_lecturesFormContentFieldsWrapper"
                className="nogaPlanner_lecturesFormContentFieldsWrapperLayout"
              >
                <p
                  id="nogaPlanner_lecturesUploadListEmpty"
                  className="nogaPlanner_inlineUploadListEmpty"
                >
                  {NOGAPLANNER_TEXT.lectures.uploadedList}
                </p>
                <button
                  id="nogaPlanner_lecturesUploadButton"
                  type="button"
                  className="nogaPlanner_inlineUploadButton"
                  disabled={!hasLectureSelectionContext}
                  onClick={() => {
                    const uploadInput = document.getElementById(
                      "nogaPlanner_lecturesUploadInput",
                    );
                    if (uploadInput) {
                      uploadInput.click();
                    }
                  }}
                >
                  {NOGAPLANNER_TEXT.lectures.uploadContent}
                </button>
                <input
                  id="nogaPlanner_lecturesUploadInput"
                  type="file"
                  multiple
                  hidden
                  disabled={!hasLectureSelectionContext}
                  onChange={(event) =>
                    planner.handleInlineLectureContentFiles(event.target.files)
                  }
                />
                <div
                  id="nogaPlanner_lecturesUploadList"
                  className="nogaPlanner_inlineUploadList"
                >
                  {lectureContentUploads.length === 0 ? (
                    <p
                      id="nogaPlanner_lecturesUploadListNoFiles"
                      className="nogaPlanner_inlineUploadListEmpty"
                    >
                      {NOGAPLANNER_TEXT.lectures.noUploadedFiles}
                    </p>
                  ) : null}
                  <ul id="nogaPlanner_lecturesUploadListItems">
                    {lectureContentUploads.map((entry, entryIndex) => (
                      <li
                        id={`nogaPlanner_lecturesUploadListItem_${entryIndex}`}
                        key={entry.id}
                      >
                        <span
                          id={`nogaPlanner_lecturesUploadListItemName_${entryIndex}`}
                        >
                          {entry.name}
                        </span>
                        <button
                          id={`nogaPlanner_lecturesUploadListItemDeleteBtn_${entryIndex}`}
                          type="button"
                          disabled={!hasLectureSelectionContext}
                          onClick={() =>
                            planner.removeInlineLectureContentFile(entry.id)
                          }
                        >
                          {NOGAPLANNER_TEXT.common.delete}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div
              id="nogaPlanner_lecturesFormCourseFieldsColumn_tertiary"
              className="nogaPlanner_lecturesFormFieldsColumn"
            >
              <div
                id="nogaPlanner_lecturesFieldCluster_plan"
                className="nogaPlanner_lecturesFormFieldCluster"
              >
                <span
                  id="nogaPlanner_lecturesFieldLabel_plan"
                  className="nogaPlanner_lecturesFieldEyebrow nogaPlanner_lecturesFieldEyebrow--columnTitle"
                >
                  {NOGAPLANNER_TEXT.studyPlan.addPlanInfoTitle}
                </span>
                <div
                  id="nogaPlanner_studyPlanFieldsGrid_tertiary"
                  className="nogaPlanner_studyPlanFieldsGrid"
                >
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planInput_lectureTargetHours"
                  >
                    <span>{STUDY_PLAN_LABELS.lectureTargetHours}</span>
                    <input
                      id="nogaPlanner_planInput_lectureTargetHours"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="number"
                      min="0"
                      value={inlineLectureDraft?.lectureTargetHours || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lectureTargetHours",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planSelect_lectureDifficulty"
                  >
                    <span>{STUDY_PLAN_LABELS.lectureDifficulty}</span>
                    <select
                      id="nogaPlanner_planSelect_lectureDifficulty"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={inlineLectureDraft?.lectureDifficulty || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lectureDifficulty",
                          event.target.value,
                        )
                      }
                    >
                      <option value="" disabled>
                        {STUDY_PLAN_LABELS.lectureDifficulty}
                      </option>
                      {(
                        Array.isArray(STUDY_PLAN_OPTIONS.planDifficultyOptions)
                          ? STUDY_PLAN_OPTIONS.planDifficultyOptions
                          : []
                      ).map((optionValue, optionIndex) => (
                        <option
                          id={`nogaPlanner_planSelect_lectureDifficulty_option_${optionIndex}`}
                          key={optionValue}
                          value={optionValue}
                        >
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planSelect_lectureMastery"
                  >
                    <span>{STUDY_PLAN_LABELS.lectureMastery}</span>
                    <select
                      id="nogaPlanner_planSelect_lectureMastery"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={inlineLectureDraft?.lectureMastery || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lectureMastery",
                          event.target.value,
                        )
                      }
                    >
                      <option value="" disabled>
                        {STUDY_PLAN_LABELS.lectureMastery}
                      </option>
                      {(
                        Array.isArray(STUDY_PLAN_OPTIONS.planMasteryOptions)
                          ? STUDY_PLAN_OPTIONS.planMasteryOptions
                          : []
                      ).map((optionValue, optionIndex) => (
                        <option
                          id={`nogaPlanner_planSelect_lectureMastery_option_${optionIndex}`}
                          key={optionValue}
                          value={optionValue}
                        >
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planSelect_lecturePriority"
                  >
                    <span>{STUDY_PLAN_LABELS.lecturePriority}</span>
                    <select
                      id="nogaPlanner_planSelect_lecturePriority"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={inlineLectureDraft?.lecturePriority || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lecturePriority",
                          event.target.value,
                        )
                      }
                    >
                      <option value="" disabled>
                        {STUDY_PLAN_LABELS.lecturePriority}
                      </option>
                      {(
                        Array.isArray(STUDY_PLAN_OPTIONS.planPriorityOptions)
                          ? STUDY_PLAN_OPTIONS.planPriorityOptions
                          : []
                      ).map((optionValue, optionIndex) => (
                        <option
                          id={`nogaPlanner_planSelect_lecturePriority_option_${optionIndex}`}
                          key={optionValue}
                          value={optionValue}
                        >
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planInput_lectureDailyHoursCap"
                  >
                    <span>
                      {STUDY_PLAN_LABELS.lectureDailyHoursCap ||
                        "Lecture Daily Cap"}
                    </span>
                    <input
                      id="nogaPlanner_planInput_lectureDailyHoursCap"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="number"
                      min="0"
                      step="1"
                      value={inlineLectureDraft?.lectureDailyHoursCap || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lectureDailyHoursCap",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label
                    className="nogaPlanner_studyPlanField"
                    htmlFor="nogaPlanner_planInput_lectureNote"
                  >
                    <span>{STUDY_PLAN_LABELS.lectureNote}</span>
                    <input
                      id="nogaPlanner_planInput_lectureNote"
                      className="nogaPlanner_savedCoursesDetailsInput"
                      type="text"
                      value={inlineLectureDraft?.lectureNote || ""}
                      onChange={(event) =>
                        planner.handleInlineLectureDraftChange(
                          "lectureNote",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : null;
    return (
      <div
        className={`nogaPlanner_lecturesTabRow${inlineLectureRowVisible ? " is-form-open" : ""}`}
      >
        {lecturesFormEditor}
        <div className="nogaPlanner_lecturesTabContentRow">
          <div className="nogaPlanner_lecturesWorkspaceRow">
              <div className="nogaPlanner_lecturesFormCourseFieldsWrapperLayout">
                <span className="nogaPlanner_lecturesFieldEyebrow nogaPlanner_lecturesFieldEyebrow--columnTitle">Lecture details</span>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Material metadata Id</span>
                  <select className="nogaPlanner_savedCoursesDetailsInput" value={lectureDraft.lectureMetadataId} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureMetadataId: String(event.target.value || "").trim() }))}>
                    <option value="">Select metadata</option>
                    {contextOptions.map((optionEntry) => (
                      <option key={optionEntry.value} value={optionEntry.value}>{optionEntry.label}</option>
                    ))}
                  </select>
                </div>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Lecture name</span>
                  <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={lectureDraft.lectureName} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureName: event.target.value }))} />
                </div>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Lecture Instructor</span>
                  <select className="nogaPlanner_savedCoursesDetailsInput" value={lectureDraft.lectureInstructor} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureInstructor: event.target.value }))}>
                    <option value="">Select instructor</option>
                    {programInstructors.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </div>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Lecture editor</span>
                  <select className="nogaPlanner_savedCoursesDetailsInput" value={lectureDraft.lectureEditor} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureEditor: event.target.value }))}>
                    <option value="">Select editor</option>
                    {programEditors.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </div>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Total lecture volume</span>
                  <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" value={lectureDraft.lectureVolumeTotal} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureVolumeTotal: String(event.target.value || "") }))} />
                </div>
                <div className="nogaPlanner_lecturesFormFieldCluster">
                  <span className="nogaPlanner_lecturesFieldEyebrow">Lecture location</span>
                  <select className="nogaPlanner_savedCoursesDetailsInput" value={lectureDraft.lectureLocationKey} onChange={(event) => setLectureDraft((prev) => ({ ...prev, lectureLocationKey: event.target.value }))}>
                    <option value="">Select location</option>
                    {locationOptions.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                  </select>
                </div>
                <div className="nogaPlanner_homeIntervalsAddRow">
                  <button
                    type="button"
                    className="nogaPlanner_homePanelCardSetBtn"
                    disabled={!canSubmitLecture}
                    onClick={async () => {
                      const nextPayload = getDraftPayload();
                      try {
                        await updateAllLectures((lectures, contextValue) => {
                          if (editingLectureKey) {
                            return lectures.map((lectureEntry) =>
                              String(lectureEntry?._id || lectureEntry?.lectureName || "").trim() === editingLectureKey
                                ? { ...lectureEntry, ...nextPayload }
                                : lectureEntry,
                            );
                          }
                          return String(contextValue) === String(lectureDraft.lectureMetadataId)
                            ? [...lectures, nextPayload]
                            : lectures;
                        });
                        clearLectureDraft();
                      } catch (error) {
                        planner.props?.serverReply?.(
                          String(error?.message || "Failed to save lecture."),
                        );
                      }
                    }}
                  >
                    {editingLectureKey ? "Update" : "Add"}
                  </button>
                  <button type="button" className="nogaPlanner_homePanelCardSetBtn nogaPlanner_homePanelCardSetBtn--cancel" onClick={clearLectureDraft}>
                    Cancel
                  </button>
                </div>
              </div>
          </div>
          <table id="nogaPlanner_lecturesTable" className="nogaPlanner_tabTable nogaPlanner_lecturesTable">
              <thead id="nogaPlanner_lecturesTableHead" className="nogaPlanner_tableHead">
                <tr id="nogaPlanner_lecturesTableHeadRow">
                  <th rowSpan={2}>Material metadata Id</th>
                  <th rowSpan={2}>Lecture name</th>
                  <th rowSpan={2}>Lecture Instructor</th>
                  <th rowSpan={2}>Lecture editor</th>
                  <th colSpan={3}>Lecture volume</th>
                  <th rowSpan={2}>Lecture location</th>
                  <th rowSpan={2}>Actions</th>
                </tr>
                <tr>
                  <th>Total</th>
                  <th>Done</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody id="nogaPlanner_lecturesTableBody">
                {lectureRows.length === 0 ? (
                  <tr id="nogaPlanner_lecturesTableEmptyRow">
                    <td id="nogaPlanner_lecturesTableEmptyCell" colSpan={9} style={{ textAlign: "center", opacity: 0.5, padding: "18px" }}>No lectures</td>
                  </tr>
                ) : lectureRows.map((rowEntry) => (
                  <tr
                    key={rowEntry.key}
                    className={`nogaPlanner_tabTableRow${String(rowEntry.key || "") === selectedLectureKey ? " selected" : ""}`}
                    onClick={() => setSelectedLectureKey(String(rowEntry.key || ""))}
                  >
                    <td>{rowEntry.contextLabel}</td>
                    <td>{rowEntry.lectureName || "-"}</td>
                    <td>{formatPlannerTextList(rowEntry.lectureInstructors)}</td>
                    <td>{formatPlannerTextList(rowEntry.lectureEditors)}</td>
                    <td>{String(rowEntry.lectureVolume?.total || "-")}</td>
                    <td>{String(rowEntry.lectureVolume?.done || "0")}</td>
                    <td>{String(rowEntry.lectureVolume?.remaining || "0")}</td>
                    <td>{formatCourseLocationDisplay(rowEntry.lectureLocation || {}) || "-"}</td>
                    <td>
                      <button type="button" className="nogaPlanner_homePanelCardSetBtn" onClick={(event) => { event.stopPropagation(); beginEditLecture(rowEntry); }}>Edit</button>
                      <button type="button" className="nogaPlanner_homeIntervalsDeleteIconBtn" aria-label="Delete lecture" onClick={async (event) => {
                        event.stopPropagation();
                        try {
                          await updateAllLectures((lectures) =>
                            lectures.filter((lectureEntry) =>
                              String(lectureEntry?._id || lectureEntry?.lectureName || "").trim() !==
                              String(rowEntry.lectureId || rowEntry.key || "").trim(),
                            ),
                          );
                        } catch (error) {
                          planner.props?.serverReply?.(
                            String(error?.message || "Failed to delete lecture."),
                          );
                        }
                      }}>
                        <i className="fi fi-br-cross" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <aside className="nogaPlanner_lecturesPagesColumn">
              <span className="nogaPlanner_lecturesFieldEyebrow nogaPlanner_lecturesFieldEyebrow--columnTitle">
                Lecture pages
              </span>
              {selectedLectureRow && selectedLectureTotal > 0 ? (
                <>
                  <p className="nogaPlanner_lecturesVolumeStats">
                    {`${String(selectedLectureRow?.lectureName || "Selected lecture")}: ${selectedLectureTotal} page(s) | Finished: ${selectedLectureDone} | Remaining: ${selectedLectureRemaining}`}
                  </p>
                  <div className="nogaPlanner_lecturesVolumePageGrid">
                    {Array.from({ length: selectedLectureTotal }, (_, index) => {
                      const pageNumber = index + 1;
                      const isDone = selectedLecturePagesFinished.includes(pageNumber);
                      return (
                        <button
                          key={`nogaPlanner_selectedLecturePage_${selectedLectureKey}_${pageNumber}`}
                          type="button"
                          className={
                            "nogaPlanner_lecturesVolumePageCube" +
                            (isDone ? " is-done" : "")
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSelectedLecturePageFinished(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="nogaPlanner_lecturesVolumeStats">
                  Click a lecture with a total volume to show its pages.
                </p>
	              )}
	            </aside>
	        </div>
	      </div>
	    );
	  }


  if (renderMode === "form") {
    return lecturesFormEditor;
  }

  return (
    <div
      className={`nogaPlanner_lecturesTabRow${inlineLectureRowVisible ? " is-form-open" : ""}`}
    >
      {lecturesFormEditor}
      <div className="nogaPlanner_lecturesTabContentRow">
        <table
          id="nogaPlanner_lecturesTable"
          className="nogaPlanner_tabTable nogaPlanner_lecturesTable"
        >
          <thead id="nogaPlanner_lecturesTableHead" className="nogaPlanner_tableHead">
            <tr id="nogaPlanner_lecturesTableHeadRow">
              <th id="nogaPlanner_lecturesTableHead_courseName">
                {NOGAPLANNER_TEXT.lectures.courseName}
              </th>
              <th id="nogaPlanner_lecturesTableHead_componentType">
                {NOGAPLANNER_TEXT.lectures.componentType}
              </th>
              <th id="nogaPlanner_lecturesTableHead_lectureTitle">
                <span
                  id="nogaPlanner_lecturesSort_lectureName"
                  className="nogaPlanner_tabTableSortLabel"
                  role="button"
                  tabIndex={0}
                  onClick={() => planner.handleLectureSort("lecture_name")}
                  onKeyDown={(event) =>
                    (event.key === "Enter" || event.key === " ") &&
                    planner.handleLectureSort("lecture_name")
                  }
                >
                  {renderLectureSortLabel(
                    "lecture_name",
                    NOGAPLANNER_TEXT.lectures.lectureTitle,
                  )}
                </span>
              </th>
              <th id="nogaPlanner_lecturesTableHead_instructors">
                <span
                  id="nogaPlanner_lecturesSort_instructors"
                  className="nogaPlanner_tabTableSortLabel"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    planner.handleLectureSort("lecture_instructors")
                  }
                  onKeyDown={(event) =>
                    (event.key === "Enter" || event.key === " ") &&
                    planner.handleLectureSort("lecture_instructors")
                  }
                >
                  {renderLectureSortLabel(
                    "lecture_instructors",
                    NOGAPLANNER_TEXT.lectures.instructors,
                  )}
                </span>
              </th>
              <th id="nogaPlanner_lecturesTableHead_writers">
                <span
                  id="nogaPlanner_lecturesSort_writers"
                  className="nogaPlanner_tabTableSortLabel"
                  role="button"
                  tabIndex={0}
                  onClick={() => planner.handleLectureSort("lecture_writers")}
                  onKeyDown={(event) =>
                    (event.key === "Enter" || event.key === " ") &&
                    planner.handleLectureSort("lecture_writers")
                  }
                >
                  {renderLectureSortLabel(
                    "lecture_writers",
                    NOGAPLANNER_TEXT.lectures.writers,
                  )}
                </span>
              </th>
              <th id="nogaPlanner_lecturesTableHead_date">
                <span
                  id="nogaPlanner_lecturesSort_date"
                  className="nogaPlanner_tabTableSortLabel"
                  role="button"
                  tabIndex={0}
                  onClick={() => planner.handleLectureSort("lecture_date")}
                  onKeyDown={(event) =>
                    (event.key === "Enter" || event.key === " ") &&
                    planner.handleLectureSort("lecture_date")
                  }
                >
                  {renderLectureSortLabel(
                    "lecture_date",
                    NOGAPLANNER_TEXT.lectures.publishDate,
                  )}
                </span>
              </th>
            </tr>
          </thead>
          <tbody id="nogaPlanner_lecturesTableBody">
            {sortedLectures.length === 0 && (
              <tr id="nogaPlanner_lecturesTableEmptyRow">
                <td
                  id="nogaPlanner_lecturesTableEmptyCell"
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    opacity: 0.5,
                    padding: "18px",
                  }}
                >
                  {NOGAPLANNER_TEXT.messages.noLectures}
                </td>
              </tr>
            )}
            {sortedLectures.map((item, itemIndex) => (
              <tr
                id={`nogaPlanner_lecturesTableRow_${itemIndex}`}
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
                onClick={() => planner.handleTabItemClick(item._id)}
              >
                <td
                  id={`nogaPlanner_lecturesTableCell_course_${itemIndex}`}
                  style={getCellAlignmentStyle(
                    resolveLectureCourseName(item),
                  )}
                >
                  {resolveLectureCourseName(item)}
                </td>
                <td
                  id={`nogaPlanner_lecturesTableCell_component_${itemIndex}`}
                  style={getCellAlignmentStyle(
                    resolveLectureComponentType(item),
                  )}
                >
                  {resolveLectureComponentType(item)}
                </td>
                <td
                  id={`nogaPlanner_lecturesTableCell_title_${itemIndex}`}
                  style={getCellAlignmentStyle(item.lecture_name)}
                >
                  {item.lecture_name}
                </td>
                <td
                  id={`nogaPlanner_lecturesTableCell_instructors_${itemIndex}`}
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
                  id={`nogaPlanner_lecturesTableCell_writers_${itemIndex}`}
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
                <td
                  id={`nogaPlanner_lecturesTableCell_date_${itemIndex}`}
                  style={getCellAlignmentStyle(item.lecture_date || "-")}
                >
                  {item.lecture_date || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NogaPlannerLecturesTablePanel;


