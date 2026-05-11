import React from "react";

const NogaPlannerLecturesTablePanel = ({ planner, runtime }) => {
  const {
    getCellAlignmentStyle,
    formatPlannerTextList,
    buildCourseLectureMatchLabel,
    NOGAPLANNER_TEXT,
  } = runtime;

  const {
    selectedTabItemId,
    deleteSelectionMode,
    deleteSelectionIds,
    lectureSortKey,
    lectureSortDirection,
    inlineLectureRowVisible,
    inlineLectureDraft,
  } = planner.state;

  const courseEntries = Array.isArray(planner.state?.courses)
    ? planner.state.courses
    : [];
  const visibleLectures = planner.getLecturesForSelectedCourse();
  const sortedLectures = planner.getSortedLectures(visibleLectures);

  const courseByLectureLabel = new Map();
  const courseByName = new Map();
  courseEntries.forEach((course) => {
    const lectureLabel = String(buildCourseLectureMatchLabel(course) || "").trim();
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
  const lectureComponentOptions = planner.getLectureComponentOptionsByCourseId(
    inlineLectureDraft?.lecture_courseId,
  );
  const lectureInstructorOptions = planner.getLectureSettingsOptions("instructor");
  const lectureWriterOptions = planner.getLectureSettingsOptions("writer");
  const lectureContentUploads = Array.isArray(
    inlineLectureDraft?.lecture_contentUploads,
  )
    ? inlineLectureDraft.lecture_contentUploads
    : [];

  return (
    <div
      className={
        "nogaPlanner_lecturesWorkspace" +
        (inlineLectureRowVisible ? " is-form-open" : "")
      }
    >
      {inlineLectureRowVisible ? (
      <aside className="nogaPlanner_lecturesFormColumn">
        <div className="nogaPlanner_savedCourseEditor">
          <p className="nogaPlanner_courses_sectionTitle">{NOGAPLANNER_TEXT.lectures.formTitle}</p>

          <div className="nogaPlanner_savedCourseEditorGrid">
            <label className="nogaPlanner_savedCourseField">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.courseName}</span>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={inlineLectureDraft?.lecture_courseId || ""}
                onChange={(event) => planner.handleInlineLectureCourseChange(event.target.value)}
              >
                <option value="">{NOGAPLANNER_TEXT.lectures.chooseCourse}</option>
                {lectureCourseOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="nogaPlanner_savedCourseField">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.componentType}</span>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={inlineLectureDraft?.lecture_componentId || ""}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const matched = lectureComponentOptions.find((entry) => entry.id === nextId) || null;
                  planner.handleInlineLectureDraftChange("lecture_componentId", nextId);
                  planner.handleInlineLectureDraftChange("lecture_component", matched ? matched.label : "");
                }}
              >
                <option value="">{NOGAPLANNER_TEXT.lectures.chooseComponent}</option>
                {lectureComponentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="nogaPlanner_savedCourseField nogaPlanner_savedCourseField--wide">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.lectureTitle}</span>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={inlineLectureDraft?.lecture_name || ""}
                onChange={(event) => planner.handleInlineLectureDraftChange("lecture_name", event.target.value)}
              />
            </label>

            <label className="nogaPlanner_savedCourseField">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.instructors}</span>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={inlineLectureDraft?.lecture_instructors || ""}
                onChange={(event) => planner.handleInlineLectureDraftChange("lecture_instructors", event.target.value)}
              >
                <option value="">{NOGAPLANNER_TEXT.lectures.chooseInstructor}</option>
                {lectureInstructorOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="nogaPlanner_savedCourseField">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.writers}</span>
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={inlineLectureDraft?.lecture_writers || ""}
                onChange={(event) => planner.handleInlineLectureDraftChange("lecture_writers", event.target.value)}
              >
                <option value="">{NOGAPLANNER_TEXT.lectures.chooseWriter}</option>
                {lectureWriterOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="nogaPlanner_savedCourseField">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.publishDate}</span>
              <input
                className="nogaPlanner_savedCoursesDetailsInput"
                type="date"
                value={inlineLectureDraft?.lecture_date || ""}
                onChange={(event) => planner.handleInlineLectureDraftChange("lecture_date", event.target.value)}
              />
            </label>

            <div className="nogaPlanner_savedCourseField nogaPlanner_savedCourseField--wide">
              <span className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.content}</span>
              <label className="nogaPlanner_inlineUploadButton">
                {NOGAPLANNER_TEXT.lectures.uploadContent}
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => planner.handleInlineLectureContentFiles(event.target.files)}
                />
              </label>

              <div className="nogaPlanner_inlineUploadList">
                <p className="nogaPlanner_inlineUploadListTitle">{NOGAPLANNER_TEXT.lectures.uploadedList}</p>
                {lectureContentUploads.length === 0 ? (
                  <p className="nogaPlanner_inlineUploadListEmpty">{NOGAPLANNER_TEXT.lectures.noUploadedFiles}</p>
                ) : (
                  <ul>
                    {lectureContentUploads.map((entry) => (
                      <li key={entry.id}>
                        <span>{entry.name}</span>
                        <button type="button" onClick={() => planner.removeInlineLectureContentFile(entry.id)}>
                          {NOGAPLANNER_TEXT.common.delete}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="nogaPlanner_savedCourseEditorActions">
            <button type="button" onClick={planner.submitInlineLectureRow}>
              {NOGAPLANNER_TEXT.common.add}
            </button>
          </div>
        </div>
      </aside>
      ) : null}

      <section className="nogaPlanner_lecturesTableColumn">
        <table className="nogaPlanner_tabTable nogaPlanner_lecturesTable">
          <thead>
            <tr>
              <th>{NOGAPLANNER_TEXT.lectures.courseName}</th>
              <th>{NOGAPLANNER_TEXT.lectures.componentType}</th>
              <th>
                <span
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
              <th>
                <span
                  className="nogaPlanner_tabTableSortLabel"
                  role="button"
                  tabIndex={0}
                  onClick={() => planner.handleLectureSort("lecture_instructors")}
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
              <th>
                <span
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
              <th>
                <span
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
          <tbody>
            {sortedLectures.length === 0 && (
              <tr>
                <td
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
            {sortedLectures.map((item) => (
              <tr
                key={item._id}
                className={
                  "nogaPlanner_tabTableRow" +
                  ((deleteSelectionMode
                    ? deleteSelectionIds.includes(String(item._id))
                    : String(selectedTabItemId) === String(item._id))
                    ? " selected"
                    : "")
                }
                onClick={() => planner.handleTabItemClick(item._id)}
              >
                <td style={getCellAlignmentStyle(resolveLectureCourseName(item))}>
                  {resolveLectureCourseName(item)}
                </td>
                <td style={getCellAlignmentStyle(resolveLectureComponentType(item))}>
                  {resolveLectureComponentType(item)}
                </td>
                <td style={getCellAlignmentStyle(item.lecture_name)}>{item.lecture_name}</td>
                <td
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
                  style={getCellAlignmentStyle(
                    formatPlannerTextList(item.lecture_writers || item.lecture_writer),
                  )}
                >
                  {formatPlannerTextList(item.lecture_writers || item.lecture_writer)}
                </td>
                <td style={getCellAlignmentStyle(item.lecture_date || "-")}>{item.lecture_date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default NogaPlannerLecturesTablePanel;
