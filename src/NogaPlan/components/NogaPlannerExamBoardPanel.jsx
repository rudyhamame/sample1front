import React from "react";

const NogaPlannerExamBoardPanel = ({ planner, runtime, embedded = false }) => {
  const {
    EXAM_WEIGHT_UNIT_OPTIONS,
    EXAM_GRADE_UNIT_OPTIONS,
    EXAM_VOLUME_UNIT_OPTIONS,
    EXAM_RECOMMENDATION_TIMING_OPTIONS,
    EXAM_RECOMMENDATION_INTENSITY_OPTIONS,
    formatCourseLocationDisplay,
    formatExamTimingDisplay,
    formatExamVolumeDisplay,
    formatExamWeightDisplay,
    formatExamGradeDisplay,
    formatExamRecommendationDisplay,
    buildAcademicYearOptions,
    ACADEMIC_YEAR_OPTIONS,
    TERM_OPTIONS,
    buildCourseComponentPickerLabel,
    getCellAlignmentStyle,
    NOGAPLANNER_WRAPPER_TABS,
    NOGAPLANNER_TEXT,
  } = runtime;
  const EXAM_UI_TEXT = NOGAPLANNER_TEXT.examBoard;

  const courseEntries = Array.isArray(planner.state?.courses) ? planner.state.courses : [];
  const examRows = courseEntries.flatMap((course) =>
    planner
      .getRenderableCourseExamEntries(course)
      .map((examEntry, examIndex) => ({ course, examEntry, examIndex })),
  );
  const sortedExamRows = planner.getSortedExamBoardRows(examRows);

  const {
    examBoardSortKey,
    examBoardSortDirection,
    show_addExamForm,
    exam_form_mode,
    examDraft,
    selected_course_id,
    selected_exam_index,
  } = planner.state;

  const selectedCourse =
    courseEntries.find(
      (course) => String(course?._id || "").trim() === String(selected_course_id || "").trim(),
    ) || null;
  const selectedExam =
    selectedCourse && selected_exam_index >= 0
      ? planner.getRenderableCourseExamEntries(selectedCourse)[selected_exam_index] || null
      : null;

  const linkedLectureOptions = planner.getExamLectureOptionsForCourse(examDraft?.selectedCourseId || "");
  const examCoursesCount = courseEntries.filter((course) => planner.getRenderableCourseExamEntries(course).length > 0).length;
  const plannerSelectSettings = planner.state?.plannerSelectSettings || {};

  const termOptions = Array.isArray(TERM_OPTIONS) ? TERM_OPTIONS : [];
  const academicYearOptions = Array.isArray(ACADEMIC_YEAR_OPTIONS)
    ? ACADEMIC_YEAR_OPTIONS
    : buildAcademicYearOptions?.() || [];
  const locationBuildingOptions = Array.from(
    new Set(
      (Array.isArray(plannerSelectSettings?.locationBuildingOptions)
        ? plannerSelectSettings.locationBuildingOptions
        : []
      )
        .map((entry) => String(entry || "").trim())
        .concat(
          courseEntries.map((entry) =>
            String(
              entry?.course_location?.building ||
                entry?.course_locationBuilding ||
                "",
            ).trim(),
          ),
        )
        .concat(String(examDraft?.locationBuilding || "").trim())
        .filter(Boolean),
    ),
  );
  const locationRoomOptions = Array.from(
    new Set(
      (
        (() => {
          const selectedBuilding = String(
            examDraft?.locationBuilding || "",
          ).trim();
          const groupedRooms = Array.isArray(
            plannerSelectSettings?.locationRoomOptionsByBuilding,
          )
            ? plannerSelectSettings.locationRoomOptionsByBuilding
                .filter((entry) => {
                  const building = String(entry?.building || "").trim();
                  return !selectedBuilding || building === selectedBuilding;
                })
                .flatMap((entry) =>
                  Array.isArray(entry?.rooms) ? entry.rooms : [],
                )
            : [];
          const flatRooms = Array.isArray(plannerSelectSettings?.locationRoomOptions)
            ? plannerSelectSettings.locationRoomOptions
            : [];
          return [...groupedRooms, ...flatRooms];
        })()
      )
        .map((entry) => String(entry || "").trim())
        .concat(
          courseEntries
            .filter((entry) => {
              const buildingValue = String(
                entry?.course_location?.building ||
                  entry?.course_locationBuilding ||
                  "",
              ).trim();
              const selectedBuilding = String(
                examDraft?.locationBuilding || "",
              ).trim();
              return !selectedBuilding || buildingValue === selectedBuilding;
            })
            .map((entry) =>
              String(
                entry?.course_location?.room || entry?.course_locationRoom || "",
              ).trim(),
            ),
        )
        .concat(String(examDraft?.locationRoom || "").trim())
        .filter(Boolean),
    ),
  );

  const renderExamBoardSortLabel = (sortKey, fallbackLabel) => {
    const isActive = examBoardSortKey === sortKey;
    const sortMarker = isActive ? (examBoardSortDirection === "asc" ? " ?" : " ?") : "";
    return `${fallbackLabel}${sortMarker}`;
  };

  const resolveExamDateValue = (examEntry) =>
    String(examEntry?.exam_date || examEntry?.date || "-").trim() || "-";
  const resolveExamStartTimeValue = (examEntry) =>
    String(examEntry?.time?.start || examEntry?.startTime || examEntry?.exam_time || "-").trim() || "-";
  const resolveExamEndTimeValue = (examEntry) =>
    String(examEntry?.time?.end || examEntry?.endTime || "-").trim() || "-";
  const resolveExamLocationBuildingValue = (examEntry) =>
    String(examEntry?.location?.building || examEntry?.locationBuilding || "-").trim() || "-";
  const resolveExamLocationRoomValue = (examEntry) =>
    String(examEntry?.location?.room || examEntry?.locationRoom || "-").trim() || "-";
  const resolveExamComponentTypeValue = (course, examEntry) => {
    const directValue = String(examEntry?.componentType || examEntry?.course_class || "").trim();
    if (directValue) {
      return directValue;
    }
    const targetComponentId = String(examEntry?.componentId || "").trim();
    const components = Array.isArray(course?.course_components) ? course.course_components : [];
    const matchedComponent = components.find(
      (componentEntry) =>
        String(componentEntry?._id || componentEntry?.id || "").trim() === targetComponentId,
    );
    return String(matchedComponent?.course_class || course?.course_class || "-").trim() || "-";
  };

  const renderWrapperTabs = () => (
    <div id="nogaPlanner_exam_wrapperTabs" className="nogaPlanner_wrapperTabs nogaPlanner_exam_wrapperTabs">
      {(Array.isArray(NOGAPLANNER_WRAPPER_TABS)
        ? NOGAPLANNER_WRAPPER_TABS
        : []
      ).map((tabEntry) => (
        <button
          key={`exam-wrapper-tab-${tabEntry.key}`}
          id={`nogaPlanner_exam_wrapperTabBtn_${tabEntry.key}`}
          type="button"
          className="nogaPlanner_wrapperTabBtn nogaPlanner_exam_wrapperTabBtn"
          data-wrapper-tab-active={
            planner.state.wrapperTab === tabEntry.key ? "true" : "false"
          }
          onClick={() => planner.handleWrapperTabChange(tabEntry.key)}
          aria-label={tabEntry.label}
          title={tabEntry.label}
        >
          {tabEntry.label}
        </button>
      ))}
    </div>
  );

  const renderExamMiniBar = () => (
    <div id="nogaPlanner_exam_miniBar" className="nogaPlanner_coursesMiniBar nogaPlanner_exam_miniBar">
      <div id="nogaPlanner_exam_miniBar_tabs" className="nogaPlanner_coursesMiniBarCol nogaPlanner_coursesMiniBarCol--tabs nogaPlanner_exam_miniBarCol nogaPlanner_exam_miniBarCol--tabs">
        {renderWrapperTabs()}
      </div>
      <div id="nogaPlanner_exam_miniBar_actions" className="nogaPlanner_coursesMiniBarCol nogaPlanner_coursesMiniBarCol--actions nogaPlanner_exam_miniBarCol nogaPlanner_exam_miniBarCol--actions">
        <div id="nogaPlanner_exam_miniBar_actionsGroup" className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete nogaPlanner_exam_miniBarGroup">
          <button
            id="nogaPlanner_exam_miniBarBtn_add"
            type="button"
            className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--add nogaPlanner_exam_miniBarBtn"
            aria-label={EXAM_UI_TEXT.add}
            title={EXAM_UI_TEXT.add}
            onClick={() => planner.openAddExamForm("Add")}
          >
            {EXAM_UI_TEXT.add}
          </button>
          <button
            id="nogaPlanner_exam_miniBarBtn_edit"
            type="button"
            className="nogaPlanner_coursesMiniBarBtn nogaPlanner_exam_miniBarBtn"
            aria-label={EXAM_UI_TEXT.edit}
            title={EXAM_UI_TEXT.edit}
            onClick={() => planner.openAddExamForm("Edit")}
            disabled={!selectedExam}
          >
            {EXAM_UI_TEXT.edit}
          </button>
          <button
            id="nogaPlanner_exam_miniBarBtn_delete"
            type="button"
            className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--danger nogaPlanner_exam_miniBarBtn"
            aria-label={EXAM_UI_TEXT.delete}
            title={EXAM_UI_TEXT.delete}
            onClick={planner.deleteSelectedExam}
            disabled={!selectedExam}
          >
            {EXAM_UI_TEXT.delete}
          </button>
        </div>
      </div>
    </div>
  );

  const renderExamEditorPanel = () => (
    <div id="nogaPlanner_exam_editor" className="nogaPlanner_savedCourseEditor nogaPlanner_examEditor">
      <div id="nogaPlanner_exam_editorGrid" className="nogaPlanner_savedCourseEditorGrid nogaPlanner_exam_editorGrid">
        <div id="nogaPlanner_exam_editorCell_course" className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--course nogaPlanner_exam_editorCell nogaPlanner_exam_editorCell--course">
          <div id="nogaPlanner_exam_editorTitleRow" className="nogaPlanner_formCardTitleRow nogaPlanner_exam_editorTitleRow">
            <p id="nogaPlanner_exam_editorLinkedCourseLabel" className="nogaPlanner_savedCourseEditorLabel nogaPlanner_exam_editorLabel">{EXAM_UI_TEXT.linkedCourseLabel}</p>
            {Boolean(planner.state?.plannerSettingsVisible) ? (
              <button
                id="nogaPlanner_examFormCloseBtn"
                type="button"
                className="nogaPlanner_coursesMiniBarBtn nogaPlanner_formCardCloseBtn"
                onClick={planner.closeAddExamForm}
                aria-label={NOGAPLANNER_TEXT.settings.back}
                title={NOGAPLANNER_TEXT.settings.back}
              >
                <i className="fi fi-rc-arrow-alt-circle-left" />
              </button>
            ) : null}
          </div>
          <select
            id="nogaPlanner_exam_input_selectedCourseId"
            className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_exam_input nogaPlanner_exam_input--select"
            value={examDraft.selectedCourseId}
            onChange={(event) => planner.handleExamDraftChange("selectedCourseId", event.target.value)}
          >
            <option value="">{EXAM_UI_TEXT.linkedCoursePlaceholder}</option>
            {courseEntries.map((course) => (
              <option key={course?._id || Math.random()} value={course?._id || ""}>
                {buildCourseComponentPickerLabel(course, "ar")}
              </option>
            ))}
          </select>
          <input
            id="nogaPlanner_exam_input_type"
            className="nogaPlanner_savedCoursesDetailsInput nogaPlanner_exam_input"
            type="text"
            value={examDraft.type}
            onChange={(event) => planner.handleExamDraftChange("type", event.target.value)}
            placeholder={EXAM_UI_TEXT.examTypePlaceholder}
          />
        </div>

        <div id="nogaPlanner_exam_editorCell_details" className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentDetails nogaPlanner_exam_editorCell nogaPlanner_exam_editorCell--details">
          <p id="nogaPlanner_exam_editorTimingLabel" className="nogaPlanner_savedCourseEditorLabel nogaPlanner_exam_editorLabel">{EXAM_UI_TEXT.timingLabel}</p>

          <div id="nogaPlanner_exam_timingGroups" className="nogaPlanner_savedCourseDetailGroupsGrid nogaPlanner_exam_detailGroupsGrid">
            <div id="nogaPlanner_exam_normativeGroup" className="nogaPlanner_savedCourseDetailGroup nogaPlanner_exam_detailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle nogaPlanner_exam_detailGroupTitle">{EXAM_UI_TEXT.normativeLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.normativeCourseYearNum} onChange={(event) => planner.handleExamDraftChange("normativeCourseYearNum", event.target.value)} placeholder={EXAM_UI_TEXT.yearPlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.normativeCourseTerm} onChange={(event) => planner.handleExamDraftChange("normativeCourseTerm", event.target.value)}>
                <option value="">{EXAM_UI_TEXT.termPlaceholder}</option>
                {termOptions.map((optionValue) => (
                  <option key={`exam-normative-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>
            <div id="nogaPlanner_exam_actualGroup" className="nogaPlanner_savedCourseDetailGroup nogaPlanner_exam_detailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle nogaPlanner_exam_detailGroupTitle">{EXAM_UI_TEXT.actualLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.actualCourseYearNum} onChange={(event) => planner.handleExamDraftChange("actualCourseYearNum", event.target.value)} placeholder={EXAM_UI_TEXT.yearPlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.actualCourseYearInterval} onChange={(event) => planner.handleExamDraftChange("actualCourseYearInterval", event.target.value)}>
                <option value="">{EXAM_UI_TEXT.intervalPlaceholder}</option>
                {academicYearOptions.map((optionValue) => (
                  <option key={`exam-actual-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.actualCourseTerm} onChange={(event) => planner.handleExamDraftChange("actualCourseTerm", event.target.value)}>
                <option value="">{EXAM_UI_TEXT.termPlaceholder}</option>
                {termOptions.map((optionValue) => (
                  <option key={`exam-actual-term-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>
          </div>

          <div id="nogaPlanner_exam_locationGroup" className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull nogaPlanner_exam_detailGroup nogaPlanner_exam_detailGroup--full">
            <span className="nogaPlanner_savedCourseDetailGroupTitle nogaPlanner_exam_detailGroupTitle">{EXAM_UI_TEXT.locationLabel}</span>
            <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.locationBuilding} onChange={(event) => planner.handleExamDraftChange("locationBuilding", event.target.value)}>
              <option value="">{EXAM_UI_TEXT.buildingPlaceholder}</option>
              {locationBuildingOptions.map((optionValue) => (
                <option key={`exam-building-${optionValue}`} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
            <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.locationRoom} onChange={(event) => planner.handleExamDraftChange("locationRoom", event.target.value)}>
              <option value="">{EXAM_UI_TEXT.roomPlaceholder}</option>
              {locationRoomOptions.map((optionValue) => (
                <option key={`exam-room-${optionValue}`} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
          </div>

          <div id="nogaPlanner_exam_linkedLecturesGroup" className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull nogaPlanner_exam_detailGroup nogaPlanner_exam_detailGroup--full">
            <span className="nogaPlanner_savedCourseDetailGroupTitle nogaPlanner_exam_detailGroupTitle">{EXAM_UI_TEXT.linkedLecturesLabel}</span>
            <div id="nogaPlanner_exam_linkedLecturesTokens" className="nogaPlanner_examLectureTokens nogaPlanner_exam_linkedLecturesTokens">
              {linkedLectureOptions.length === 0 ? (
                <span className="nogaPlanner_examLectureEmpty">{EXAM_UI_TEXT.noLinkedLectures}</span>
              ) : (
                linkedLectureOptions.map((lectureOption) => {
                  const isActive = Array.isArray(examDraft.linkedLectureIds)
                    ? examDraft.linkedLectureIds.includes(lectureOption.id)
                    : false;
                  return (
                    <button id={`nogaPlanner_exam_linkedLectureToken_${lectureOption.id}`} key={lectureOption.id} type="button" className={"nogaPlanner_examLectureToken nogaPlanner_exam_linkedLectureToken" + (isActive ? " is-active" : "")} onClick={() => planner.toggleExamDraftLectureId(lectureOption.id)}>
                      {lectureOption.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="nogaPlanner_savedCourseDetailGroupsGrid">
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">{EXAM_UI_TEXT.volumeLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.volumeValue} onChange={(event) => planner.handleExamDraftChange("volumeValue", event.target.value)} placeholder={EXAM_UI_TEXT.valuePlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.volumeUnit} onChange={(event) => planner.handleExamDraftChange("volumeUnit", event.target.value)}>
                {EXAM_VOLUME_UNIT_OPTIONS.map((optionValue) => (
                  <option key={`exam-volume-unit-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.volumeScope} onChange={(event) => planner.handleExamDraftChange("volumeScope", event.target.value)} placeholder={EXAM_UI_TEXT.scopePlaceholder} />
              <textarea className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.volumeNote} onChange={(event) => planner.handleExamDraftChange("volumeNote", event.target.value)} placeholder={EXAM_UI_TEXT.notePlaceholder} />
            </div>

            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">{EXAM_UI_TEXT.weightLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.weightValue} onChange={(event) => planner.handleExamDraftChange("weightValue", event.target.value)} placeholder={EXAM_UI_TEXT.valuePlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.weightUnit} onChange={(event) => planner.handleExamDraftChange("weightUnit", event.target.value)}>
                {EXAM_WEIGHT_UNIT_OPTIONS.map((optionValue) => (
                  <option key={`exam-weight-unit-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nogaPlanner_savedCourseDetailGroupsGrid">
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">{EXAM_UI_TEXT.passGradeLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeValue} onChange={(event) => planner.handleExamDraftChange("passGradeValue", event.target.value)} placeholder={EXAM_UI_TEXT.valuePlaceholder} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeMin} onChange={(event) => planner.handleExamDraftChange("passGradeMin", event.target.value)} placeholder={EXAM_UI_TEXT.minPlaceholder} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeMax} onChange={(event) => planner.handleExamDraftChange("passGradeMax", event.target.value)} placeholder={EXAM_UI_TEXT.maxPlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.passGradeUnit} onChange={(event) => planner.handleExamDraftChange("passGradeUnit", event.target.value)}>
                {EXAM_GRADE_UNIT_OPTIONS.map((optionValue) => (
                  <option key={`exam-pass-unit-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>

            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">{EXAM_UI_TEXT.gradeLabel}</span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeValue} onChange={(event) => planner.handleExamDraftChange("gradeValue", event.target.value)} placeholder={EXAM_UI_TEXT.valuePlaceholder} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeMin} onChange={(event) => planner.handleExamDraftChange("gradeMin", event.target.value)} placeholder={EXAM_UI_TEXT.minPlaceholder} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeMax} onChange={(event) => planner.handleExamDraftChange("gradeMax", event.target.value)} placeholder={EXAM_UI_TEXT.maxPlaceholder} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.gradeUnit} onChange={(event) => planner.handleExamDraftChange("gradeUnit", event.target.value)}>
                {EXAM_GRADE_UNIT_OPTIONS.map((optionValue) => (
                  <option key={`exam-grade-unit-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
            <span className="nogaPlanner_savedCourseDetailGroupTitle">{EXAM_UI_TEXT.recommendationLabel}</span>
            <div className="nogaPlanner_savedCourseDetailGroupsGrid">
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationTiming} onChange={(event) => planner.handleExamDraftChange("recommendationTiming", event.target.value)}>
                {EXAM_RECOMMENDATION_TIMING_OPTIONS.map((optionValue) => (
                  <option key={`exam-rec-timing-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationIntensity} onChange={(event) => planner.handleExamDraftChange("recommendationIntensity", event.target.value)}>
                {EXAM_RECOMMENDATION_INTENSITY_OPTIONS.map((optionValue) => (
                  <option key={`exam-rec-intensity-${optionValue}`} value={optionValue}>{optionValue}</option>
                ))}
              </select>
            </div>
            <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.recommendationSuggestedHours} onChange={(event) => planner.handleExamDraftChange("recommendationSuggestedHours", event.target.value)} placeholder={EXAM_UI_TEXT.suggestedHoursPlaceholder} />
            <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.recommendationReason} onChange={(event) => planner.handleExamDraftChange("recommendationReason", event.target.value)} placeholder={EXAM_UI_TEXT.reasonPlaceholder} />
            <textarea className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationNote} onChange={(event) => planner.handleExamDraftChange("recommendationNote", event.target.value)} placeholder={EXAM_UI_TEXT.notePlaceholder} />
          </div>

          <div id="nogaPlanner_exam_editorActions" className="nogaPlanner_savedCourseEditorActionRow nogaPlanner_exam_editorActions">
            <button id="nogaPlanner_exam_editorBtn_submit" type="button" className="nogaPlanner_coursesMiniBarBtn nogaPlanner_exam_editorBtn" onClick={planner.submitExamForm}>
              {exam_form_mode === "Edit" ? EXAM_UI_TEXT.saveExam : EXAM_UI_TEXT.addExam}
            </button>
            <button id="nogaPlanner_exam_editorBtn_cancel" type="button" className="nogaPlanner_coursesMiniBarBtn nogaPlanner_exam_editorBtn" onClick={planner.closeAddExamForm}>
              {EXAM_UI_TEXT.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExamTableBlock = () => (
    <div id="nogaPlanner_exam_tableBody" className="nogaPlanner_savedCoursesColumnBody nogaPlanner_exam_tableBody" ref={planner.savedCoursesColumnBodyRef}>
      <div id="nogaPlanner_exam_tableBodyScroll" className="nogaPlanner_savedCoursesTableBodyScroll nogaPlanner_exam_tableBodyScroll" onScroll={planner.handleSavedCoursesBodyScroll}>
        <table id="nogaPlanner_exam_table" className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable nogaPlanner_exam_table">
          <thead id="nogaPlanner_exam_tableHead">
            <tr id="nogaPlanner_exam_tableHead_row_1">
              <th id="nogaPlanner_exam_th_courseName" rowSpan={2}>
                <span className="nogaPlanner_tabTableSortLabel" role="button" tabIndex={0} onClick={() => planner.handleExamBoardSort("course_name")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && planner.handleExamBoardSort("course_name")}>
                  {renderExamBoardSortLabel("course_name", EXAM_UI_TEXT.tableCourseName)}
                </span>
              </th>
              <th id="nogaPlanner_exam_th_componentType" rowSpan={2}>{EXAM_UI_TEXT.tableComponentType}</th>
              <th id="nogaPlanner_exam_th_type" rowSpan={2}>
                <span className="nogaPlanner_tabTableSortLabel" role="button" tabIndex={0} onClick={() => planner.handleExamBoardSort("type")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && planner.handleExamBoardSort("type")}>
                  {renderExamBoardSortLabel("type", EXAM_UI_TEXT.tableType)}
                </span>
              </th>
              <th id="nogaPlanner_exam_th_timeGroup" colSpan={3}>{EXAM_UI_TEXT.tableTime}</th>
              <th id="nogaPlanner_exam_th_locationGroup" colSpan={2}>
                <span className="nogaPlanner_tabTableSortLabel" role="button" tabIndex={0} onClick={() => planner.handleExamBoardSort("location")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && planner.handleExamBoardSort("location")}>
                  {renderExamBoardSortLabel("location", EXAM_UI_TEXT.tableLocation)}
                </span>
              </th>
              <th id="nogaPlanner_exam_th_volume" rowSpan={2}>
                <span className="nogaPlanner_tabTableSortLabel" role="button" tabIndex={0} onClick={() => planner.handleExamBoardSort("volume")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && planner.handleExamBoardSort("volume")}>
                  {renderExamBoardSortLabel("volume", EXAM_UI_TEXT.tableVolume)}
                </span>
              </th>
              <th id="nogaPlanner_exam_th_weight" rowSpan={2}>
                <span className="nogaPlanner_tabTableSortLabel" role="button" tabIndex={0} onClick={() => planner.handleExamBoardSort("weight")} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && planner.handleExamBoardSort("weight")}>
                  {renderExamBoardSortLabel("weight", EXAM_UI_TEXT.tableWeight)}
                </span>
              </th>
              <th id="nogaPlanner_exam_th_pass" rowSpan={2}>{EXAM_UI_TEXT.tablePass}</th>
              <th id="nogaPlanner_exam_th_grade" rowSpan={2}>{EXAM_UI_TEXT.tableGrade}</th>
              <th id="nogaPlanner_exam_th_recommendation" rowSpan={2}>{EXAM_UI_TEXT.tableRecommendation}</th>
            </tr>
            <tr id="nogaPlanner_exam_tableHead_row_2">
              <th id="nogaPlanner_exam_th_date">{EXAM_UI_TEXT.tableDate}</th>
              <th id="nogaPlanner_exam_th_startTime">{EXAM_UI_TEXT.tableStartTime}</th>
              <th id="nogaPlanner_exam_th_endTime">{EXAM_UI_TEXT.tableEndTime}</th>
              <th id="nogaPlanner_exam_th_building">{EXAM_UI_TEXT.tableBuilding}</th>
              <th id="nogaPlanner_exam_th_room">{EXAM_UI_TEXT.tableRoom}</th>
            </tr>
          </thead>
          <tbody id="nogaPlanner_exam_tableBodyRows">
            {sortedExamRows.length === 0 ? (
              <tr id="nogaPlanner_exam_tableBody_emptyRow">
                <td id="nogaPlanner_exam_tableBody_emptyCell" colSpan={13} className="nogaPlanner_savedCoursesEmpty nogaPlanner_exam_emptyCell">{EXAM_UI_TEXT.empty}</td>
              </tr>
            ) : (
              sortedExamRows.map(({ course, examEntry, examIndex }) => (
                <tr id={`nogaPlanner_exam_tableBody_row_${course?._id || "course"}_${examIndex}`} key={`${course?._id || course?.course_name || "course"}-${examIndex}`} className={"nogaPlanner_tabTableRow nogaPlanner_exam_tableRow" + (String(course?._id || "").trim() === String(selected_course_id || "").trim() && examIndex === selected_exam_index ? " selected" : "")} onClick={() => planner.setSelectedCourseWithExamFocus(course?._id, examIndex)}>
                  <td id={`nogaPlanner_exam_td_courseName_${course?._id || "course"}_${examIndex}`} className="nogaPlanner_exam_tableCell nogaPlanner_exam_tableCell--courseName" style={getCellAlignmentStyle(course?.course_name || "-")}>{course?.course_name || "-"}</td>
                  <td style={getCellAlignmentStyle(resolveExamComponentTypeValue(course, examEntry))}>{resolveExamComponentTypeValue(course, examEntry)}</td>
                  <td style={getCellAlignmentStyle(examEntry?.type || examEntry?.exam_type || "-")}>{examEntry?.type || examEntry?.exam_type || "-"}</td>
                  <td style={getCellAlignmentStyle(resolveExamDateValue(examEntry))}>{resolveExamDateValue(examEntry)}</td>
                  <td style={getCellAlignmentStyle(resolveExamStartTimeValue(examEntry))}>{resolveExamStartTimeValue(examEntry)}</td>
                  <td style={getCellAlignmentStyle(resolveExamEndTimeValue(examEntry))}>{resolveExamEndTimeValue(examEntry)}</td>
                  <td style={getCellAlignmentStyle(resolveExamLocationBuildingValue(examEntry))}>{resolveExamLocationBuildingValue(examEntry)}</td>
                  <td style={getCellAlignmentStyle(resolveExamLocationRoomValue(examEntry))}>{resolveExamLocationRoomValue(examEntry)}</td>
                  <td style={getCellAlignmentStyle(formatExamVolumeDisplay(examEntry))}>{formatExamVolumeDisplay(examEntry)}</td>
                  <td style={getCellAlignmentStyle(formatExamWeightDisplay(examEntry))}>{formatExamWeightDisplay(examEntry)}</td>
                  <td style={getCellAlignmentStyle(formatExamGradeDisplay(examEntry?.passGrade || {}))}>{formatExamGradeDisplay(examEntry?.passGrade || {})}</td>
                  <td style={getCellAlignmentStyle(formatExamGradeDisplay(examEntry?.grade || {}))}>{formatExamGradeDisplay(examEntry?.grade || {})}</td>
                  <td style={getCellAlignmentStyle(formatExamRecommendationDisplay(examEntry, "ar"))}>{formatExamRecommendationDisplay(examEntry, "ar")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <>
        {renderExamTableBlock()}
        {show_addExamForm ? renderExamEditorPanel() : null}
      </>
    );
  }

  return (
    <section id="nogaPlanner_exam_section" className="nogaPlanner_homeSoulPanel">
      <div className="nogaPlanner_savedCoursesColumnHeader">
        <div className="nogaPlanner_coursesTitleRow">
          <div className="fc">
            <p className="nogaPlanner_homeSoulEyebrow">{EXAM_UI_TEXT.appEyebrow}</p>
            <h2 className="nogaPlanner_homeSoulTitle">{EXAM_UI_TEXT.title}</h2>
            <p className="nogaPlanner_homeSoulSubtitle">{EXAM_UI_TEXT.subtitle}</p>
          </div>
          <div className="nogaPlanner_savedCoursesCounters">
            <div className="nogaPlanner_savedCoursesCounter">
              <span className="nogaPlanner_savedCoursesCounterValue">{sortedExamRows.length}</span>
              <span className="nogaPlanner_savedCoursesCounterLabel">{EXAM_UI_TEXT.countExams}</span>
            </div>
            <div className="nogaPlanner_savedCoursesCounter">
              <span className="nogaPlanner_savedCoursesCounterValue">{examCoursesCount}</span>
              <span className="nogaPlanner_savedCoursesCounterLabel">{EXAM_UI_TEXT.countCourses}</span>
            </div>
          </div>
          {renderExamMiniBar()}
        </div>
      </div>

      {renderExamTableBlock()}

      {show_addExamForm ? renderExamEditorPanel() : null}
    </section>
  );
};

export default NogaPlannerExamBoardPanel;

