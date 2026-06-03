import React from "react";

const NogaPlannerLecturesTablePanel = ({
  planner,
  runtime,
  renderMode = "full",
}) => {
  const {
    getCellAlignmentStyle,
    formatPlannerTextList,
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
  const lectureInstructorOptions =
    planner.getLectureSettingsOptions("instructor");
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

  const lecturesFormEditor =
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
                {lectureInstructorOptions.map((entry, entryIndex) => (
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

  if (renderMode === "form") {
    return lecturesFormEditor;
  }

  return (
    <div
      id="nogaPlanner_lecturesWorkspace"
      className={
        "nogaPlanner_lecturesWorkspace" +
        (inlineLectureRowVisible ? " is-form-open" : "")
      }
    >
      {lecturesFormEditor}

      {renderMode !== "form" ? (
        <section
          id="nogaPlanner_lecturesTableColumn"
          className="nogaPlanner_lecturesTableColumn"
        >
          <div className="nogaPlanner_tabToolbarMount">
          <div
            id="nogaPlanner_lecturesTableToolbar"
            className="nogaPlanner_tableToolbarRow"
          >
            <div className="nogaPlanner_tableToolbarGroup">
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                Home
              </button>
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                Insert
              </button>
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                Layout
              </button>
            </div>
            <div className="nogaPlanner_tableToolbarGroup">
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                Sort
              </button>
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                Filter
              </button>
              <button type="button" className="nogaPlanner_tableToolbarBtn">
                View
              </button>
            </div>
          </div>
          </div>
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
        </section>
      ) : null}
    </div>
  );
};

export default NogaPlannerLecturesTablePanel;


