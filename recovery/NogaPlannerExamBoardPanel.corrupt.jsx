ï¿½import React from "react";
const NogaPlannerExamBoardPanel = ({
  planner,
  runtime
}) => {
  const {
    ReactDOM,
    apiUrl,
    normalizeMemoryPayload,
    getSafePlannerCourses,
    getSafePlannerLectures,
    getSafePagesPerDay,
    getPrimaryCourseExam,
    normalizeCourseDuplicateKeyPart,
    buildCourseDuplicateKey,
    formatExamDateParts,
    buildExamDateValue,
    getPlannerTermRank,
    getAcademicYearSortValue,
    normalizeProgramYearValue,
    getProgramYearSortValue,
    getComparableProgramYearNumber,
    formatExamTimeParts,
    buildExamTimeValue,
    TELEGRAM_PENDING_VALUE,
    TELEGRAM_COURSE_PAYLOAD_FIELDS,
    isPendingCourseValue,
    hasMeaningfulCourseFieldValue,
    formatCourseScheduleDisplay,
    formatCourseStringListDisplay,
    formatCourseLocationDisplay,
    formatPlannerStatusLabel,
    detectContentDirection,
    getCellAlignmentStyle,
    formatCourseComponentLabel,
    mergeCoursePayloadWithAiResult,
    splitCourseTextList,
    splitPlannerTextList,
    formatPlannerTextList,
    getDefaultInlineCourseDraft,
    getDefaultSavedCourseDraft,
    buildSavedCourseComponentEntryFromDraft,
    getDefaultInlineLectureDraft,
    EXAM_WEIGHT_UNIT_OPTIONS,
    EXAM_GRADE_UNIT_OPTIONS,
    EXAM_VOLUME_UNIT_OPTIONS,
    EXAM_RECOMMENDATION_TIMING_OPTIONS,
    EXAM_RECOMMENDATION_INTENSITY_OPTIONS,
    getDefaultExamDraft,
    normalizeExamEntryForPlanner,
    buildExamDraftFromEntry,
    buildExamEntryFromDraft,
    formatExamTimingDisplay,
    formatExamVolumeDisplay,
    formatExamWeightDisplay,
    formatExamGradeDisplay,
    formatExamRecommendationDisplay,
    buildAcademicYearOptions,
    ACADEMIC_YEAR_OPTIONS,
    normalizeAcademicYearValue,
    formatAcademicTermDisplay,
    formatAcademicYearAndTerm,
    TERM_OPTIONS,
    WEEKDAY_OPTIONS,
    HOUR_OPTIONS,
    SAVED_COMPONENT_CLASS_OPTIONS,
    PLANNER_DEFAULT_FIELD_REGISTRY,
    PLANNER_SELECT_SETTINGS_STORAGE_KEY,
    buildDefaultPlannerWeekdayOptions,
    buildDefaultPlannerSelectSettings,
    getDefaultPlannerRelationshipDraft,
    createPlannerSettingsRelationshipId,
    normalizePlannerSettingsStringList,
    normalizePlannerRelationshipEntry,
    normalizePlannerSelectSettings,
    readPlannerSelectSettingsFromStorage,
    getDefaultInlineComponentDraft,
    getEditableCourseDraft,
    buildCoursePayloadFromDraft,
    formatSavedCourseTitle,
    formatSavedCourseComponent,
    buildSavedCourseGroupKey,
    buildCourseComponentPickerLabel,
    buildCourseLectureMatchLabel,
    getCourseDueText,
    COURSE_PRINT_SOUND_START_OFFSET,
    COURSE_PRINT_SOUND_BASE_DURATION,
    NAGHAM_COURSE_LETTERS_STORAGE_KEY,
    NAGHAM_COURSE_LIST_STORAGE_KEY,
    SCHOOLPLANNER_REDUCED_MOTION_STORAGE_KEY,
    DEFAULT_NAGHAM_COURSE_LETTER,
    TELEGRAM_DISPLAY_TIMEZONE,
    TELEGRAM_LECTURE_STOP_WORDS,
    normalizeTelegramSearchText,
    normalizeLectureCorrections,
    getDefaultPlannerLocale
  } = runtime;
  const courseEntries = Array.isArray(planner.state?.courses) ? planner.state.courses : [];
  const examRows = courseEntries.flatMap(course => planner.getRenderableCourseExamEntries(course).map((examEntry, examIndex) => ({
    course,
    examEntry,
    examIndex
  })));
  const sortedExamRows = planner.getSortedExamBoardRows(examRows);
  const {
    examBoardSortKey,
    examBoardSortDirection,
    show_addExamForm,
    exam_form_mode,
    examDraft,
    selected_course_id,
    selected_exam_index
  } = planner.state;
  const selectedCourse = courseEntries.find(course => String(course?._id || "").trim() === String(selected_course_id || "").trim()) || null;
  const selectedExam = selectedCourse && selected_exam_index >= 0 ? planner.getRenderableCourseExamEntries(selectedCourse)[selected_exam_index] || null : null;
  const linkedLectureOptions = planner.getExamLectureOptionsForCourse(examDraft?.selectedCourseId || "");
  const examComponentsCount = courseEntries.filter(course => planner.getRenderableCourseExamEntries(course).length > 0).length;
  const renderExamBoardSortLabel = (sortKey, fallbackLabel) => {
    const isActive = examBoardSortKey === sortKey;
    const sortMarker = isActive ? examBoardSortDirection === "asc" ? " ï¿½ï¿½" : " ï¿½ï¿½" : "";
    return `${fallbackLabel}${sortMarker}`;
  };
  const renderExamEditorPanel = () => <div className="nogaPlanner_savedCourseEditor nogaPlanner_examEditor">
      <div className="nogaPlanner_savedCourseEditorGrid">
        <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--course">
          <p className="nogaPlanner_savedCourseEditorLabel">
            {"Ø¨ï¿½`Ø§ï¿½ Ø§Øª Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ "}
          </p>
          <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.selectedCourseId} onChange={event => planner.handleExamDraftChange("selectedCourseId", event.target.value)}>
            <option value="">
              {"Ø§ï¿½ï¿½&Ù’ï¿½ï¿½ï¿½ï¿½  Ø§ï¿½ï¿½&Ø±ØªØ¨Ø·"}
            </option>
            {courseEntries.map(course => <option key={course?._id || Math.random()} value={course?._id || ""}>
                {buildCourseComponentPickerLabel(course, "ar")}
              </option>)}
          </select>
          <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.type} onChange={event => planner.handleExamDraftChange("type", event.target.value)} placeholder={"ï¿½ ï¿½ï¿½Ø¹ Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ "} />
        </div>
        <div className="nogaPlanner_savedCourseEditorCell nogaPlanner_savedCourseEditorCell--componentDetails">
          <p className="nogaPlanner_savedCourseEditorLabel">
            {"Ø§ï¿½Øªï¿½ï¿½ï¿½ï¿½`Øª"}
          </p>
          <div className="nogaPlanner_savedCourseDetailGroupsGrid">
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø§ï¿½ï¿½&ÙØªØ±Ø¶"}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.normativeCourseYearNum} onChange={event => planner.handleExamDraftChange("normativeCourseYearNum", event.target.value)} placeholder={"Ø±ï¿½ï¿½& Ø§ï¿½Ø³ï¿½ Ø©"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.normativeCourseTerm} onChange={event => planner.handleExamDraftChange("normativeCourseTerm", event.target.value)}>
                <option value="">
                  {"Ø§ï¿½ÙØµï¿½"}
                </option>
                {termOptions.map(optionValue => <option key={`exam-normative-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø§ï¿½Ø­ï¿½ï¿½`ï¿½ï¿½`"}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.actualCourseYearNum} onChange={event => planner.handleExamDraftChange("actualCourseYearNum", event.target.value)} placeholder={"Ø±ï¿½ï¿½& Ø§ï¿½Ø³ï¿½ Ø©"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.actualCourseYearInterval} onChange={event => planner.handleExamDraftChange("actualCourseYearInterval", event.target.value)}>
                <option value="">
                  {"Ø§ï¿½ÙØªØ±Ø©"}
                </option>
                {academicYearOptions.map(optionValue => <option key={`exam-actual-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.actualCourseTerm} onChange={event => planner.handleExamDraftChange("actualCourseTerm", event.target.value)}>
                <option value="">
                  {"Ø§ï¿½ÙØµï¿½"}
                </option>
                {termOptions.map(optionValue => <option key={`exam-actual-term-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
          </div>
          <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
            <span className="nogaPlanner_savedCourseDetailGroupTitle">
              {"Ø§ï¿½ï¿½&ï¿½ï¿½ï¿½Ø¹"}
            </span>
            <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.locationBuilding} onChange={event => planner.handleExamDraftChange("locationBuilding", event.target.value)} placeholder={"Ø§ï¿½ï¿½&Ø¨ï¿½ ï¿½0"} />
            <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.locationRoom} onChange={event => planner.handleExamDraftChange("locationRoom", event.target.value)} placeholder={"Ø§ï¿½ï¿½Ø§Ø¹Ø©"} />
          </div>
          <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
            <span className="nogaPlanner_savedCourseDetailGroupTitle">
              {"Ø§ï¿½ï¿½&Ø­Ø§Ø¶Ø±Ø§Øª Ø§ï¿½ï¿½&Ø±ØªØ¨Ø·Ø©"}
            </span>
            <div className="nogaPlanner_examLectureTokens">
              {linkedLectureOptions.length === 0 ? <span className="nogaPlanner_examLectureEmpty">
                  {"ï¿½Ø§ Øªï¿½ï¿½Ø¬Ø¯ ï¿½&Ø­Ø§Ø¶Ø±Ø§Øª ï¿½&ØªØ§Ø­Ø© ï¿½ï¿½!Ø°Ø§ Ø§ï¿½ï¿½&Ù’ï¿½ï¿½ï¿½ï¿½ "}
                </span> : linkedLectureOptions.map(lectureOption => {
              const isActive = Array.isArray(examDraft.linkedLectureIds) ? examDraft.linkedLectureIds.includes(lectureOption.id) : false;
              return <button key={lectureOption.id} type="button" className={"nogaPlanner_examLectureToken" + (isActive ? " is-active" : "")} onClick={() => planner.toggleExamDraftLectureId(lectureOption.id)}>
                      {lectureOption.label}
                    </button>;
            })}
            </div>
          </div>
          <div className="nogaPlanner_savedCourseDetailGroupsGrid">
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø§ï¿½Ø­Ø¬ï¿½&"}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.volumeValue} onChange={event => planner.handleExamDraftChange("volumeValue", event.target.value)} placeholder={"Ø§ï¿½ï¿½ï¿½`ï¿½&Ø©"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.volumeUnit} onChange={event => planner.handleExamDraftChange("volumeUnit", event.target.value)}>
                {EXAM_VOLUME_UNIT_OPTIONS.map(optionValue => <option key={`exam-volume-unit-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.volumeScope} onChange={event => planner.handleExamDraftChange("volumeScope", event.target.value)} placeholder={"Ø§ï¿½ï¿½ Ø·Ø§ï¿½"} />
              <textarea className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.volumeNote} onChange={event => planner.handleExamDraftChange("volumeNote", event.target.value)} placeholder={"ï¿½&ï¿½Ø§Ø­Ø¸Ø©"} />
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø§ï¿½ï¿½ï¿½Ø²ï¿½ "}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.weightValue} onChange={event => planner.handleExamDraftChange("weightValue", event.target.value)} placeholder={"Ø§ï¿½ï¿½ï¿½`ï¿½&Ø©"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.weightUnit} onChange={event => planner.handleExamDraftChange("weightUnit", event.target.value)}>
                {EXAM_WEIGHT_UNIT_OPTIONS.map(optionValue => <option key={`exam-weight-unit-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
          </div>
          <div className="nogaPlanner_savedCourseDetailGroupsGrid">
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø¹ï¿½Ø§ï¿½&Ø© Ø§ï¿½ï¿½ Ø¬Ø§Ø­"}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeValue} onChange={event => planner.handleExamDraftChange("passGradeValue", event.target.value)} placeholder={"Ø§ï¿½ï¿½ï¿½`ï¿½&Ø©"} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeMin} onChange={event => planner.handleExamDraftChange("passGradeMin", event.target.value)} placeholder={"Ø§ï¿½Ø­Ø¯ Ø§ï¿½Ø£Ø¯ï¿½ ï¿½0"} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.passGradeMax} onChange={event => planner.handleExamDraftChange("passGradeMax", event.target.value)} placeholder={"Ø§ï¿½Ø­Ø¯ Ø§ï¿½Ø£Ø¹ï¿½ï¿½0"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.passGradeUnit} onChange={event => planner.handleExamDraftChange("passGradeUnit", event.target.value)}>
                {EXAM_GRADE_UNIT_OPTIONS.map(optionValue => <option key={`exam-pass-unit-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
            <div className="nogaPlanner_savedCourseDetailGroup">
              <span className="nogaPlanner_savedCourseDetailGroupTitle">
                {"Ø§ï¿½Ø¹ï¿½Ø§ï¿½&Ø©"}
              </span>
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeValue} onChange={event => planner.handleExamDraftChange("gradeValue", event.target.value)} placeholder={"Ø§ï¿½ï¿½ï¿½`ï¿½&Ø©"} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeMin} onChange={event => planner.handleExamDraftChange("gradeMin", event.target.value)} placeholder={"Ø§ï¿½Ø­Ø¯ Ø§ï¿½Ø£Ø¯ï¿½ ï¿½0"} />
              <input className="nogaPlanner_savedCoursesDetailsInput" type="number" value={examDraft.gradeMax} onChange={event => planner.handleExamDraftChange("gradeMax", event.target.value)} placeholder={"Ø§ï¿½Ø­Ø¯ Ø§ï¿½Ø£Ø¹ï¿½ï¿½0"} />
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.gradeUnit} onChange={event => planner.handleExamDraftChange("gradeUnit", event.target.value)}>
                {EXAM_GRADE_UNIT_OPTIONS.map(optionValue => <option key={`exam-grade-unit-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
          </div>
          <div className="nogaPlanner_savedCourseDetailGroup nogaPlanner_savedCourseEditorFieldFull">
            <span className="nogaPlanner_savedCourseDetailGroupTitle">
              {"Ø§ï¿½Øªï¿½ï¿½Øµï¿½`Ø©"}
            </span>
            <div className="nogaPlanner_savedCourseDetailGroupsGrid">
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationTiming} onChange={event => planner.handleExamDraftChange("recommendationTiming", event.target.value)}>
                {EXAM_RECOMMENDATION_TIMING_OPTIONS.map(optionValue => <option key={`exam-rec-timing-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
              <select className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationIntensity} onChange={event => planner.handleExamDraftChange("recommendationIntensity", event.target.value)}>
                {EXAM_RECOMMENDATION_INTENSITY_OPTIONS.map(optionValue => <option key={`exam-rec-intensity-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>)}
              </select>
            </div>
            <input className="nogaPlanner_savedCoursesDetailsInput" type="number" min="0" step="1" value={examDraft.recommendationSuggestedHours} onChange={event => planner.handleExamDraftChange("recommendationSuggestedHours", event.target.value)} placeholder={"Ø§ï¿½Ø³Ø§Ø¹Ø§Øª Ø§ï¿½ï¿½&ï¿½ØªØ±Ø­Ø©"} />
            <input className="nogaPlanner_savedCoursesDetailsInput" type="text" value={examDraft.recommendationReason} onChange={event => planner.handleExamDraftChange("recommendationReason", event.target.value)} placeholder={"Ø§ï¿½Ø³Ø¨Ø¨"} />
            <textarea className="nogaPlanner_savedCoursesDetailsInput" value={examDraft.recommendationNote} onChange={event => planner.handleExamDraftChange("recommendationNote", event.target.value)} placeholder={"ï¿½&ï¿½Ø§Ø­Ø¸Ø©"} />
          </div>
          <div className="nogaPlanner_savedCourseEditorActionRow">
            <button type="button" className="nogaPlanner_coursesMiniBarBtn" onClick={planner.submitExamForm}>
              {exam_form_mode === "Edit" ? "Ø­ÙØ¸ Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ " : "Ø¥Ø¶Ø§ÙØ© Ø§ï¿½&ØªØ­Ø§ï¿½ "}
            </button>
            <button type="button" className="nogaPlanner_coursesMiniBarBtn" onClick={planner.closeAddExamForm}>
              {"Ø¥ï¿½ØºØ§Ø¡"}
            </button>
          </div>
        </div>
      </div>
    </div>;
  return <section id="nogaPlanner_exam_section" className="nogaPlanner_homeSoulPanel">
      <div className="nogaPlanner_savedCoursesColumnHeader">
        <div className="nogaPlanner_coursesTitleRow">
          <div className="fc">
            <p className="nogaPlanner_homeSoulEyebrow">{"ï¿½ ï¿½ï¿½ØºØ§ Ø¨ï¿½Ø§ï¿½ "}</p>
            <h2 className="nogaPlanner_homeSoulTitle">
              {"Ø¬Ø¯ï¿½ï¿½ï¿½ Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª"}
            </h2>
            <p className="nogaPlanner_homeSoulSubtitle">
              {"Ø£Ø¯Ø± Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª Ø§ï¿½ï¿½&Ø­Ùï¿½ï¿½Ø¸Ø© ï¿½Ù’ï¿½ ï¿½&Ù’ï¿½ï¿½ï¿½ï¿½  Ø¯Ø±Ø§Ø³ï¿½`."}
            </p>
          </div>
          <div className="nogaPlanner_wrapperTabs">
            <button type="button" className={"nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" + (planner.state.wrapperTab === "courses" ? " nogaPlanner_wrapperTabBtn--active" : "")} onClick={() => planner.handleWrapperTabChange("courses")} aria-label={"Ø§ï¿½ï¿½&ï¿½Ø±Ø±Ø§Øª"} title={"Ø§ï¿½ï¿½&ï¿½Ø±Ø±Ø§Øª"}>
              <i className="fas fa-book-open" aria-hidden="true"></i>
            </button>
            <button type="button" className={"nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" + (planner.state.wrapperTab === "lectures" ? " nogaPlanner_wrapperTabBtn--active" : "")} onClick={() => planner.handleWrapperTabChange("lectures")} aria-label={"Ø§ï¿½ï¿½&Ø­Ø§Ø¶Ø±Ø§Øª"} title={"Ø§ï¿½ï¿½&Ø­Ø§Ø¶Ø±Ø§Øª"}>
              <i className="fas fa-chalkboard-teacher" aria-hidden="true"></i>
            </button>
            <button type="button" className={"nogaPlanner_wrapperTabBtn nogaPlanner_wrapperTabBtn--iconOnly" + (planner.state.wrapperTab === "exams" ? " nogaPlanner_wrapperTabBtn--active" : "")} onClick={() => planner.handleWrapperTabChange("exams")} aria-label={"Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª"} title={"Ø§ï¿½Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª"}>
              <i className="fas fa-file-alt" aria-hidden="true"></i>
            </button>
          </div>
          <div className="nogaPlanner_savedCoursesCounters">
            <div className="nogaPlanner_savedCoursesCounter">
              <span className="nogaPlanner_savedCoursesCounterValue">
                {sortedExamRows.length}
              </span>
              <span className="nogaPlanner_savedCoursesCounterLabel">
                {"Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª"}
              </span>
            </div>
            <div className="nogaPlanner_savedCoursesCounter">
              <span className="nogaPlanner_savedCoursesCounterValue">
                {examComponentsCount}
              </span>
              <span className="nogaPlanner_savedCoursesCounterLabel">
                {"ï¿½&Ù’ï¿½ï¿½ï¿½ Ø§Øª"}
              </span>
            </div>
          </div>
          <div className="nogaPlanner_coursesMiniBar">
            <div className="nogaPlanner_coursesMiniBarGroup nogaPlanner_coursesMiniBarGroup--editDelete">
              <button type="button" className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly nogaPlanner_coursesMiniBarBtn--add" aria-label={"Ø¥Ø¶Ø§ÙØ©"} title={"Ø¥Ø¶Ø§ÙØ©"} onClick={() => planner.openAddExamForm("Add")}>
                <i className="fas fa-plus" aria-hidden="true"></i>
              </button>
              <button type="button" className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly" aria-label={"ØªØ¹Ø¯ï¿½`ï¿½"} title={"ØªØ¹Ø¯ï¿½`ï¿½"} onClick={() => planner.openAddExamForm("Edit")} disabled={!selectedExam}>
                <i className="fas fa-pen" aria-hidden="true"></i>
              </button>
              <button type="button" className="nogaPlanner_coursesMiniBarBtn nogaPlanner_coursesMiniBarBtn--iconOnly nogaPlanner_coursesMiniBarBtn--danger" aria-label={"Ø­Ø°Ù"} title={"Ø­Ø°Ù"} onClick={planner.deleteSelectedExam} disabled={!selectedExam}>
                <i className="fas fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="nogaPlanner_savedCoursesColumnBody" ref={planner.savedCoursesColumnBodyRef}>         <div className="nogaPlanner_savedCoursesTableBodyScroll" onScroll={planner.handleSavedCoursesBodyScroll}>         <table className="nogaPlanner_tabTable nogaPlanner_savedCoursesTable">
          <thead>
            <tr>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("course_name")}>
                  {renderExamBoardSortLabel("course_name", "Ø§ï¿½ï¿½&ï¿½Ø±Ø±")}
                </button>
              </th>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("type")}>
                  {renderExamBoardSortLabel("type", "Ø§ï¿½ï¿½ ï¿½ï¿½Ø¹")}
                </button>
              </th>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("time")}>
                  {renderExamBoardSortLabel("time", "Ø§ï¿½Øªï¿½ï¿½ï¿½ï¿½`Øª")}
                </button>
              </th>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("location")}>
                  {renderExamBoardSortLabel("location", "Ø§ï¿½ï¿½&ï¿½ï¿½ï¿½Ø¹")}
                </button>
              </th>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("volume")}>
                  {renderExamBoardSortLabel("volume", "Ø§ï¿½Ø­Ø¬ï¿½&")}
                </button>
              </th>
              <th>
                <button type="button" className="nogaPlanner_tabTableSortButton" onClick={() => planner.handleExamBoardSort("weight")}>
                  {renderExamBoardSortLabel("weight", "Ø§ï¿½ï¿½ï¿½Ø²ï¿½ ")}
                </button>
              </th>
              <th>{"Ø§ï¿½ï¿½ Ø¬Ø§Ø­"}</th>
              <th>{"Ø§ï¿½Ø¹ï¿½Ø§ï¿½&Ø©"}</th>
              <th>{"Ø§ï¿½Øªï¿½ï¿½Øµï¿½`Ø©"}</th>
            </tr>
          </thead>
          <tbody>
            {sortedExamRows.length === 0 ? <tr>
                <td colSpan={9} className="nogaPlanner_savedCoursesEmpty">{"ï¿½Ø§ Øªï¿½ï¿½Ø¬Ø¯ Ø§ï¿½&ØªØ­Ø§ï¿½ Ø§Øª"}</td>
              </tr> : sortedExamRows.map(({
            course,
            examEntry,
            examIndex
          }) => <tr key={`${course?._id || course?.course_name || "course"}-${examIndex}`} className={"nogaPlanner_tabTableRow" + (String(course?._id || "").trim() === String(selected_course_id || "").trim() && examIndex === selected_exam_index ? " selected" : "")} onClick={() => planner.setSelectedCourseWithExamFocus(course?._id, examIndex)}>
                  <td style={getCellAlignmentStyle(course?.course_name || "-")}>
                    {course?.course_name || "-"}
                  </td>
                  <td style={getCellAlignmentStyle(examEntry?.type || examEntry?.exam_type || "-")}>
                    {examEntry?.type || examEntry?.exam_type || "-"}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamTimingDisplay(examEntry, "ar"))}>
                    {formatExamTimingDisplay(examEntry, "ar")}
                  </td>
                  <td style={getCellAlignmentStyle(formatCourseLocationDisplay(examEntry?.location || {}))}>
                    {formatCourseLocationDisplay(examEntry?.location || {})}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamVolumeDisplay(examEntry))}>
                    {formatExamVolumeDisplay(examEntry)}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamWeightDisplay(examEntry))}>
                    {formatExamWeightDisplay(examEntry)}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamGradeDisplay(examEntry?.passGrade || {}))}>
                    {formatExamGradeDisplay(examEntry?.passGrade || {})}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamGradeDisplay(examEntry?.grade || {}))}>
                    {formatExamGradeDisplay(examEntry?.grade || {})}
                  </td>
                  <td style={getCellAlignmentStyle(formatExamRecommendationDisplay(examEntry, "ar"))}>
                    {formatExamRecommendationDisplay(examEntry, "ar")}
                  </td>
                </tr>)}
          </tbody>
        </table>         </div>       </div>       {show_addExamForm ? renderExamEditorPanel() : null}
    </section>;
};
export default NogaPlannerExamBoardPanel;




