import React from "react";

const NogaPlannerLecturesTablePanel = ({ planner, runtime, renderMode = "full" }) => {
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

  const lecturesFormEditor =
    inlineLectureRowVisible && renderMode !== "table" ? (
      <div id="nogaPlanner_lecturesFormEditor" className="nogaPlanner_savedCourseEditor">
          <div id="nogaPlanner_lecturesFormCourseCard" className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--courseCard">
            <p id="nogaPlanner_lecturesFormCourseCardTitle" className="nogaPlanner_savedCourseEditorLabel">
              {NOGAPLANNER_TEXT.lectures.formTitle}
            </p>
            <div id="nogaPlanner_lecturesFormCourseFieldsWrapper" className="nogaPlanner_savedCourseEditor_courseFormFieldsWrapper">
              <div id="nogaPlanner_lecturesFieldCluster_course" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_course" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.courseName}</span>
                <select
                  id="nogaPlanner_lecturesSelect_course"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={inlineLectureDraft?.lecture_courseId || ""}
                  onChange={(event) => planner.handleInlineLectureCourseChange(event.target.value)}
                >
                  <option id="nogaPlanner_lecturesSelect_course_option_default" value="">{NOGAPLANNER_TEXT.lectures.chooseCourse}</option>
                  {lectureCourseOptions.map((entry, entryIndex) => (
                    <option id={`nogaPlanner_lecturesSelect_course_option_${entryIndex}`} key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_lecturesFieldCluster_component" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_component" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.componentType}</span>
                <select
                  id="nogaPlanner_lecturesSelect_component"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={inlineLectureDraft?.lecture_componentId || ""}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const matched = lectureComponentOptions.find((entry) => entry.id === nextId) || null;
                    planner.handleInlineLectureDraftChange("lecture_componentId", nextId);
                    planner.handleInlineLectureDraftChange("lecture_component", matched ? matched.label : "");
                  }}
                >
                  <option id="nogaPlanner_lecturesSelect_component_option_default" value="">{NOGAPLANNER_TEXT.lectures.chooseComponent}</option>
                  {lectureComponentOptions.map((entry, entryIndex) => (
                    <option id={`nogaPlanner_lecturesSelect_component_option_${entryIndex}`} key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_lecturesFieldCluster_title" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_title" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.lectureTitle}</span>
                <input
                  id="nogaPlanner_lecturesInput_title"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="text"
                  value={inlineLectureDraft?.lecture_name || ""}
                  onChange={(event) => planner.handleInlineLectureDraftChange("lecture_name", event.target.value)}
                />
              </div>
              <div id="nogaPlanner_lecturesFieldCluster_instructors" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_instructors" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.instructors}</span>
                <select
                  id="nogaPlanner_lecturesSelect_instructors"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={inlineLectureDraft?.lecture_instructors || ""}
                  onChange={(event) => planner.handleInlineLectureDraftChange("lecture_instructors", event.target.value)}
                >
                  <option id="nogaPlanner_lecturesSelect_instructors_option_default" value="">{NOGAPLANNER_TEXT.lectures.chooseInstructor}</option>
                  {lectureInstructorOptions.map((entry, entryIndex) => (
                    <option id={`nogaPlanner_lecturesSelect_instructors_option_${entryIndex}`} key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_lecturesFieldCluster_writers" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_writers" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.writers}</span>
                <select
                  id="nogaPlanner_lecturesSelect_writers"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={inlineLectureDraft?.lecture_writers || ""}
                  onChange={(event) => planner.handleInlineLectureDraftChange("lecture_writers", event.target.value)}
                >
                  <option id="nogaPlanner_lecturesSelect_writers_option_default" value="">{NOGAPLANNER_TEXT.lectures.chooseWriter}</option>
                  {lectureWriterOptions.map((entry, entryIndex) => (
                    <option id={`nogaPlanner_lecturesSelect_writers_option_${entryIndex}`} key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div id="nogaPlanner_lecturesFieldCluster_date" className="nogaPlanner_savedCourseEditorFieldCluster">
                <span id="nogaPlanner_lecturesFieldLabel_date" className="nogaPlanner_savedCourseFieldEyebrow">{NOGAPLANNER_TEXT.lectures.publishDate}</span>
                <input
                  id="nogaPlanner_lecturesInput_date"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="date"
                  value={inlineLectureDraft?.lecture_date || ""}
                  onChange={(event) => planner.handleInlineLectureDraftChange("lecture_date", event.target.value)}
                />
              </div>
            </div>
          </div>

          <div id="nogaPlanner_lecturesFormContentCard" className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentCard">
            <p id="nogaPlanner_lecturesFormContentCardTitle" className="nogaPlanner_savedCourseEditorLabel">
              {NOGAPLANNER_TEXT.lectures.content}
            </p>
            <div id="nogaPlanner_lecturesFormContentFieldsWrapper" className="nogaPlanner_savedCourseEditor_componentFormFieldsWrapper">
              <label id="nogaPlanner_lecturesUploadButton" className="nogaPlanner_inlineUploadButton">
                {NOGAPLANNER_TEXT.lectures.uploadContent}
                <input
                  id="nogaPlanner_lecturesUploadInput"
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => planner.handleInlineLectureContentFiles(event.target.files)}
                />
              </label>

              <div id="nogaPlanner_lecturesUploadList" className="nogaPlanner_inlineUploadList">
                <p id="nogaPlanner_lecturesUploadListTitle" className="nogaPlanner_inlineUploadListTitle">{NOGAPLANNER_TEXT.lectures.uploadedList}</p>
                {lectureContentUploads.length === 0 ? (
                  <p id="nogaPlanner_lecturesUploadListEmpty" className="nogaPlanner_inlineUploadListEmpty">{NOGAPLANNER_TEXT.lectures.noUploadedFiles}</p>
                ) : (
                  <ul id="nogaPlanner_lecturesUploadListItems">
                    {lectureContentUploads.map((entry, entryIndex) => (
                      <li id={`nogaPlanner_lecturesUploadListItem_${entryIndex}`} key={entry.id}>
                        <span id={`nogaPlanner_lecturesUploadListItemName_${entryIndex}`}>{entry.name}</span>
                        <button id={`nogaPlanner_lecturesUploadListItemDeleteBtn_${entryIndex}`} type="button" onClick={() => planner.removeInlineLectureContentFile(entry.id)}>
                          {NOGAPLANNER_TEXT.common.delete}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div id="nogaPlanner_lecturesFormActions" className="nogaPlanner_savedCourseEditorActions">
            <button
              id="nogaPlanner_lecturesFormSubmitBtn"
              type="button"
              className="nogaPlanner_coursesMiniBarBtn"
              onClick={planner.submitInlineLectureRow}
            >
              {NOGAPLANNER_TEXT.common.add}
            </button>
          </div>
      </div>
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
      <section id="nogaPlanner_lecturesTableColumn" className="nogaPlanner_lecturesTableColumn">
        <table id="nogaPlanner_lecturesTable" className="nogaPlanner_tabTable nogaPlanner_lecturesTable">
          <thead id="nogaPlanner_lecturesTableHead">
            <tr id="nogaPlanner_lecturesTableHeadRow">
              <th id="nogaPlanner_lecturesTableHead_courseName">{NOGAPLANNER_TEXT.lectures.courseName}</th>
              <th id="nogaPlanner_lecturesTableHead_componentType">{NOGAPLANNER_TEXT.lectures.componentType}</th>
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
                  ((deleteSelectionMode
                    ? deleteSelectionIds.includes(String(item._id))
                    : String(selectedTabItemId) === String(item._id))
                    ? " selected"
                    : "")
                }
                onClick={() => planner.handleTabItemClick(item._id)}
              >
                <td id={`nogaPlanner_lecturesTableCell_course_${itemIndex}`} style={getCellAlignmentStyle(resolveLectureCourseName(item))}>
                  {resolveLectureCourseName(item)}
                </td>
                <td id={`nogaPlanner_lecturesTableCell_component_${itemIndex}`} style={getCellAlignmentStyle(resolveLectureComponentType(item))}>
                  {resolveLectureComponentType(item)}
                </td>
                <td id={`nogaPlanner_lecturesTableCell_title_${itemIndex}`} style={getCellAlignmentStyle(item.lecture_name)}>{item.lecture_name}</td>
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
                    formatPlannerTextList(item.lecture_writers || item.lecture_writer),
                  )}
                >
                  {formatPlannerTextList(item.lecture_writers || item.lecture_writer)}
                </td>
                <td id={`nogaPlanner_lecturesTableCell_date_${itemIndex}`} style={getCellAlignmentStyle(item.lecture_date || "-")}>{item.lecture_date || "-"}</td>
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
