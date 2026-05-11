import React from "react";

const NogaPlannerSettings = ({ planner, runtime }) => {
  const {
    SAVED_COMPONENT_CLASS_OPTIONS,
    getPlannerDefaultFieldsForForm,
    PLANNER_COURSE_UI,
    ACADEMIC_YEAR_OPTIONS,
    TERM_OPTIONS,
    HOUR_OPTIONS,
    buildDefaultPlannerWeekdayOptions,
    NOGAPLANNER_WRAPPER_TABS,
    NOGAPLANNER_TEXT,
  } = runtime;
  const SETTINGS_TEXT = NOGAPLANNER_TEXT.settings;

  const {
    plannerSelectSettings,
    plannerSettingsComponentClassInput,
    plannerSettingsWeekdayInput,
    plannerSettingsHourInput,
    plannerSettingsTermInput,
    plannerSettingsAcademicYearInput,
    plannerSettingsLocationBuildingInput,
    plannerSettingsLocationRoomInput,
    plannerSettingsLocationRoomBuildingInput,
    plannerSettingsActiveListKey,
    plannerSettingsDefaultSection,
    plannerSettingsDefaultFieldKey,
    plannerSettingsDefaultValueInput,
    plannerSettingsEditingDefaultFieldKey,
    plannerSettingsSelectedDefaultFieldKey,
    plannerSettingsEditingComponentClassIndex,
    plannerSettingsEditingWeekdayIndex,
    plannerSettingsEditingHourIndex,
    plannerSettingsEditingTermIndex,
    plannerSettingsEditingAcademicYearIndex,
    plannerSettingsSelectedComponentClassIndex,
    plannerSettingsSelectedWeekdayIndex,
    plannerSettingsSelectedHourIndex,
    plannerSettingsSelectedTermIndex,
    plannerSettingsSelectedAcademicYearIndex,
    plannerSettingsEditingLocationBuildingIndex,
    plannerSettingsEditingLocationRoomIndex,
    plannerSettingsSelectedLocationBuildingIndex,
    plannerSettingsSelectedLocationRoomIndex,
    plannerSettingsRelationshipDraft,
    plannerSettingsEditingRelationshipId,
    plannerSettingsSaveStatus,
    plannerSettingsSaveMessage,
    plannerSettingsLogoMotionEnabled,
    plannerSettingsLogoFixedClock,
  } = planner.state;
  const logoClockOptions = Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1);
    return { value, label: `${value}` };
  });

  const componentClassOptions = Array.isArray(
    plannerSelectSettings?.componentClassOptions,
  )
    ? plannerSelectSettings.componentClassOptions
    : SAVED_COMPONENT_CLASS_OPTIONS;
  const weekdayOptions = Array.isArray(plannerSelectSettings?.weekdayOptions)
    ? plannerSelectSettings.weekdayOptions
    : buildDefaultPlannerWeekdayOptions();
  const hourOptions = Array.isArray(plannerSelectSettings?.hourOptions)
    ? plannerSelectSettings.hourOptions
    : [...HOUR_OPTIONS];
  const termOptions = Array.isArray(plannerSelectSettings?.termOptions)
    ? plannerSelectSettings.termOptions
    : [...TERM_OPTIONS];
  const academicYearOptions = Array.isArray(
    plannerSelectSettings?.academicYearOptions,
  )
    ? plannerSelectSettings.academicYearOptions
    : [...ACADEMIC_YEAR_OPTIONS];
  const locationBuildingOptions = Array.isArray(
    plannerSelectSettings?.locationBuildingOptions,
  )
    ? plannerSelectSettings.locationBuildingOptions
    : [];
  const locationRoomOptions = Array.isArray(
    plannerSelectSettings?.locationRoomOptions,
  )
    ? plannerSelectSettings.locationRoomOptions
    : [];
  const locationRoomOptionsByBuilding = Array.isArray(
    plannerSelectSettings?.locationRoomOptionsByBuilding,
  )
    ? plannerSelectSettings.locationRoomOptionsByBuilding
    : [];
  const selectedRoomBuilding = String(
    plannerSettingsLocationRoomBuildingInput || "",
  ).trim();
  const locationRoomOptionsForSelectedBuilding = selectedRoomBuilding
    ? (locationRoomOptionsByBuilding.find(
        (entry) => String(entry?.building || "").trim() === selectedRoomBuilding,
      )?.rooms || [])
    : [];

  const plannerSettingsOptionGroupConfigs = [
    {
      key: "componentClassOptions",
      label: SETTINGS_TEXT.optionGroups.componentClassOptions.label,
      inputValue: plannerSettingsComponentClassInput,
      editingIndex: plannerSettingsEditingComponentClassIndex,
      selectedIndex: plannerSettingsSelectedComponentClassIndex,
      options: componentClassOptions,
      placeholder: SETTINGS_TEXT.optionGroups.componentClassOptions.placeholder,
    },
    {
      key: "weekdayOptions",
      label: SETTINGS_TEXT.optionGroups.weekdayOptions.label,
      inputValue: plannerSettingsWeekdayInput,
      editingIndex: plannerSettingsEditingWeekdayIndex,
      selectedIndex: plannerSettingsSelectedWeekdayIndex,
      options: weekdayOptions,
      placeholder: SETTINGS_TEXT.optionGroups.weekdayOptions.placeholder,
    },
    {
      key: "hourOptions",
      label: SETTINGS_TEXT.optionGroups.hourOptions.label,
      inputValue: plannerSettingsHourInput,
      editingIndex: plannerSettingsEditingHourIndex,
      selectedIndex: plannerSettingsSelectedHourIndex,
      options: hourOptions,
      placeholder: SETTINGS_TEXT.optionGroups.hourOptions.placeholder,
    },
    {
      key: "termOptions",
      label: SETTINGS_TEXT.optionGroups.termOptions.label,
      inputValue: plannerSettingsTermInput,
      editingIndex: plannerSettingsEditingTermIndex,
      selectedIndex: plannerSettingsSelectedTermIndex,
      options: termOptions,
      placeholder: SETTINGS_TEXT.optionGroups.termOptions.placeholder,
    },
    {
      key: "academicYearOptions",
      label: SETTINGS_TEXT.optionGroups.academicYearOptions.label,
      inputValue: plannerSettingsAcademicYearInput,
      editingIndex: plannerSettingsEditingAcademicYearIndex,
      selectedIndex: plannerSettingsSelectedAcademicYearIndex,
      options: academicYearOptions,
      placeholder: SETTINGS_TEXT.optionGroups.academicYearOptions.placeholder,
    },
    {
      key: "locationBuildingOptions",
      label: SETTINGS_TEXT.optionGroups.locationBuildingOptions.label,
      inputValue: plannerSettingsLocationBuildingInput,
      editingIndex: plannerSettingsEditingLocationBuildingIndex,
      selectedIndex: plannerSettingsSelectedLocationBuildingIndex,
      options: locationBuildingOptions,
      placeholder: SETTINGS_TEXT.optionGroups.locationBuildingOptions.placeholder,
    },
    {
      key: "locationRoomOptions",
      label: SETTINGS_TEXT.optionGroups.locationRoomOptions.label,
      inputValue: plannerSettingsLocationRoomInput,
      editingIndex: plannerSettingsEditingLocationRoomIndex,
      selectedIndex: plannerSettingsSelectedLocationRoomIndex,
      options: locationRoomOptionsForSelectedBuilding,
      placeholder: SETTINGS_TEXT.optionGroups.locationRoomOptions.placeholder,
    },
  ];
  const plannerSettingsOptionGroupByKey = new Map(
    plannerSettingsOptionGroupConfigs.map((entry) => [entry.key, entry]),
  );

  const plannerOptionsByKey = {
    componentClassOptions,
    weekdayOptions,
    hourOptions,
    termOptions,
    academicYearOptions,
    locationBuildingOptions,
    locationRoomOptions,
  };

  const plannerDefaultSectionOptions = (
    Array.isArray(NOGAPLANNER_WRAPPER_TABS) ? NOGAPLANNER_WRAPPER_TABS : []
  ).map((tabEntry) => tabEntry.label);
  const plannerDefaultSectionFormKeyMap = {
    المقررات: "savedCourse",
    الامتحانات: "exam",
    المحاضرات: "inlineLecture",
  };

  const selectedDefaultFormKey =
    plannerDefaultSectionFormKeyMap[plannerSettingsDefaultSection] ||
    "savedCourse";

  const plannerDefaultFieldRegistry = getPlannerDefaultFieldsForForm(
    selectedDefaultFormKey,
  );
  const plannerSectionListOptions = plannerDefaultFieldRegistry
    .filter(
      (fieldConfig) =>
        String(fieldConfig?.control || "").trim() === "select" &&
        Boolean(String(fieldConfig?.optionsKey || "").trim()) &&
        plannerSettingsOptionGroupByKey.has(
          String(fieldConfig?.optionsKey || "").trim(),
        ),
    )
    .reduce((accumulator, fieldConfig) => {
      const optionsKey = String(fieldConfig?.optionsKey || "").trim();
      if (!optionsKey) {
        return accumulator;
      }
      if (accumulator.some((entry) => entry.key === optionsKey)) {
        return accumulator;
      }
      accumulator.push({
        key: optionsKey,
        label: String(fieldConfig?.label || optionsKey).trim(),
      });
      return accumulator;
    }, []);
  const plannerVisibleSettingsOptionGroups = plannerSectionListOptions
    .map((entry) => plannerSettingsOptionGroupByKey.get(entry.key))
    .filter(Boolean);
  const activePlannerSettingsOptionGroup =
    plannerVisibleSettingsOptionGroups.find(
      (entry) => entry.key === plannerSettingsActiveListKey,
    ) ||
    plannerVisibleSettingsOptionGroups[0] ||
    plannerSettingsOptionGroupConfigs[0];
  const roomListBuildingMissing =
    activePlannerSettingsOptionGroup?.key === "locationRoomOptions" &&
    !selectedRoomBuilding;

  const plannerDefaultFieldsSource =
    selectedDefaultFormKey === "savedCourse"
      ? Object.entries(PLANNER_COURSE_UI.fields || {}).map(
          ([fieldName, label]) => {
            const matchedFieldConfig = plannerDefaultFieldRegistry.find(
              (fieldConfig) => fieldConfig.fieldName === fieldName,
            );
            return (
              matchedFieldConfig || {
                key: `savedCourse.${fieldName}`,
                formKey: "savedCourse",
                fieldName,
                label,
                control: "input",
                inputType: "text",
              }
            );
          },
        )
      : plannerDefaultFieldRegistry;

  const plannerDefaultFields = plannerDefaultFieldsSource.map(
    (fieldConfig) => ({
      ...fieldConfig,
      label:
        selectedDefaultFormKey === "savedCourse"
          ? PLANNER_COURSE_UI.fields?.[fieldConfig.fieldName] ||
            fieldConfig.label
          : fieldConfig.label,
      value: String(
        plannerSelectSettings?.fieldDefaults?.[fieldConfig.key] || "",
      ).trim(),
      options: fieldConfig.optionsKey
        ? plannerOptionsByKey[fieldConfig.optionsKey] || []
        : Array.isArray(fieldConfig.options)
          ? fieldConfig.options
          : [],
    }),
  );

  const selectedPlannerDefaultField =
    plannerDefaultFields.find(
      (fieldConfig) => fieldConfig.key === plannerSettingsDefaultFieldKey,
    ) ||
    plannerDefaultFields[0] ||
    null;
  const selectedPlannerDefaultFieldKey = selectedPlannerDefaultField?.key || "";
  const plannerDefaultsWithValues = plannerDefaultFields.filter((fieldConfig) =>
    Boolean(String(fieldConfig?.value || "").trim()),
  );
  const selectedPlannerDefaultListEntry = plannerDefaultsWithValues.find(
    (fieldConfig) =>
      fieldConfig.key ===
      String(plannerSettingsSelectedDefaultFieldKey || "").trim(),
  );
  const plannerDefaultInputValue = String(
    plannerSettingsDefaultValueInput || "",
  ).trim();
  const plannerRelationships = Array.isArray(
    plannerSelectSettings?.relationships,
  )
    ? plannerSelectSettings.relationships
    : [];

  return (
    <div className="nogaPlanner_selectSettingsPanel">
      <div className="nogaPlanner_selectSettingsHeader">
        <button
          type="button"
          className="nogaPlanner_coursesMiniBarBtn nogaPlanner_selectSettingsBackBtn"
          onClick={planner.handleBackFromPlannerSettings}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          <span>{SETTINGS_TEXT.back}</span>
        </button>
        <span className="nogaPlanner_selectSettingsTitle">{SETTINGS_TEXT.title}</span>
      </div>
      {String(plannerSettingsSaveMessage || "").trim() ? (
        <p
          className="nogaPlanner_homeSoulEyebrow"
          style={{
            color: plannerSettingsSaveStatus === "error" ? "#c62828" : "#2e7d32",
            marginTop: "8px",
            marginBottom: "8px",
          }}
        >
          {plannerSettingsSaveMessage}
        </p>
      ) : null}
      <div className="nogaPlanner_selectSettingsFields">
        <label className="nogaPlanner_selectSettingsCheckboxRow">
          <input
            type="checkbox"
            checked={Boolean(plannerSettingsLogoMotionEnabled)}
            onChange={(event) =>
              planner.handlePlannerSettingsInputChange(
                "plannerSettingsLogoMotionEnabled",
                event.target.checked,
              )
            }
          />
          <span>
            {SETTINGS_TEXT.logoMotionListener}:{" "}
            {plannerSettingsLogoMotionEnabled
              ? SETTINGS_TEXT.motionOn
              : SETTINGS_TEXT.motionOff}
          </span>
        </label>
        <select
          className="nogaPlanner_savedCoursesDetailsInput"
          value={String(plannerSettingsLogoFixedClock || "9")}
          onChange={(event) =>
            planner.handlePlannerSettingsInputChange(
              "plannerSettingsLogoFixedClock",
              event.target.value,
            )
          }
        >
          {logoClockOptions.map((entry) => (
            <option key={`planner-logo-clock-${entry.value}`} value={entry.value}>
              {SETTINGS_TEXT.fixedLogoClock} {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="nogaPlanner_selectSettingsColumns">
        <div className="nogaPlanner_selectSettingsColumn">
          <span className="nogaPlanner_selectSettingsColumnTitle">
            {SETTINGS_TEXT.lists}
          </span>
          <div className="nogaPlanner_selectSettingsFields">
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsDefaultSection}
              onChange={(event) =>
                planner.handlePlannerSettingsDefaultSectionChange(
                  event.target.value,
                )
              }
            >
              {plannerDefaultSectionOptions.map((sectionLabel) => (
                <option key={`settings-section-${sectionLabel}`} value={sectionLabel}>
                  {sectionLabel}
                </option>
              ))}
            </select>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={activePlannerSettingsOptionGroup?.key || ""}
              disabled={plannerSectionListOptions.length === 0}
              onChange={(event) =>
                planner.handlePlannerSettingsInputChange(
                  "plannerSettingsActiveListKey",
                  event.target.value,
                )
              }
            >
              {plannerSectionListOptions.length === 0 ? (
                <option value="">{SETTINGS_TEXT.noListsForTab}</option>
              ) : (
                plannerSectionListOptions.map((optionGroup) => (
                  <option key={optionGroup.key} value={optionGroup.key}>
                    {optionGroup.label}
                  </option>
                ))
              )}
            </select>

            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={activePlannerSettingsOptionGroup?.inputValue || ""}
              onChange={(event) =>
                planner.handlePlannerSettingsInputChange(
                  activePlannerSettingsOptionGroup.key ===
                    "componentClassOptions"
                    ? "plannerSettingsComponentClassInput"
                    : activePlannerSettingsOptionGroup.key === "weekdayOptions"
                      ? "plannerSettingsWeekdayInput"
                      : activePlannerSettingsOptionGroup.key === "hourOptions"
                        ? "plannerSettingsHourInput"
                        : activePlannerSettingsOptionGroup.key === "termOptions"
                          ? "plannerSettingsTermInput"
                          : activePlannerSettingsOptionGroup.key ===
                              "academicYearOptions"
                            ? "plannerSettingsAcademicYearInput"
                            : activePlannerSettingsOptionGroup.key ===
                                "locationBuildingOptions"
                              ? "plannerSettingsLocationBuildingInput"
                              : "plannerSettingsLocationRoomInput",
                  event.target.value,
                )
              }
              placeholder={activePlannerSettingsOptionGroup?.placeholder || ""}
              disabled={roomListBuildingMissing}
            />
            {activePlannerSettingsOptionGroup?.key === "locationRoomOptions" ? (
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={selectedRoomBuilding}
                onChange={(event) =>
                  planner.handlePlannerSettingsInputChange(
                    "plannerSettingsLocationRoomBuildingInput",
                    event.target.value,
                  )
                }
              >
                <option value="">{SETTINGS_TEXT.chooseBuilding}</option>
                {locationBuildingOptions.map((optionValue) => (
                  <option key={`room-building-${optionValue}`} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="nogaPlanner_selectSettingsActions">
              {(() => {
                const isAddDisabled = roomListBuildingMissing;
                const isDeleteSelectedDisabled =
                  activePlannerSettingsOptionGroup?.selectedIndex < 0 ||
                  roomListBuildingMissing;
                const isDeleteAllDisabled =
                  (activePlannerSettingsOptionGroup?.options || []).length === 0 ||
                  roomListBuildingMissing;
                const isEditDisabled =
                  activePlannerSettingsOptionGroup?.selectedIndex < 0 ||
                  roomListBuildingMissing;
                return (
                  <>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isAddDisabled ? " nogaPlanner_coursesMiniBarBtn--disabledBlack" : "")
                }
                onClick={() =>
                  activePlannerSettingsOptionGroup.key === "locationRoomOptions"
                    ? planner.addOrUpdatePlannerRoomOption()
                    : planner.addOrUpdatePlannerSettingsListItem(
                        activePlannerSettingsOptionGroup.key,
                      )
                }
                disabled={isAddDisabled}
              >
                {activePlannerSettingsOptionGroup?.editingIndex >= 0
                  ? SETTINGS_TEXT.update
                  : SETTINGS_TEXT.add}
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDeleteSelectedDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={() =>
                  activePlannerSettingsOptionGroup.key === "locationRoomOptions"
                    ? planner.deleteSelectedPlannerRoomOption()
                    : planner.deleteSelectedPlannerSettingsListItem(
                        activePlannerSettingsOptionGroup.key,
                      )
                }
                disabled={isDeleteSelectedDisabled}
              >
                {SETTINGS_TEXT.deleteSelected}
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDeleteAllDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={() =>
                  activePlannerSettingsOptionGroup.key === "locationRoomOptions"
                    ? planner.clearPlannerRoomOptions()
                    : planner.clearPlannerSettingsList(
                        activePlannerSettingsOptionGroup.key,
                      )
                }
                disabled={isDeleteAllDisabled}
              >
                {SETTINGS_TEXT.deleteAll}
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isEditDisabled ? " nogaPlanner_coursesMiniBarBtn--disabledBlack" : "")
                }
                onClick={() =>
                  activePlannerSettingsOptionGroup.key === "locationRoomOptions"
                    ? planner.editSelectedPlannerRoomOption()
                    : planner.editSelectedPlannerSettingsListItem(
                        activePlannerSettingsOptionGroup.key,
                      )
                }
                disabled={isEditDisabled}
              >
                {SETTINGS_TEXT.edit}
              </button>
                  </>
                );
              })()}
            </div>

            <ul className="nogaPlanner_selectSettingsList">
              {roomListBuildingMissing ? (
                <li className="nogaPlanner_selectSettingsItem">
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {SETTINGS_TEXT.chooseBuildingFirst}
                  </span>
                </li>
              ) : (activePlannerSettingsOptionGroup?.options || []).length === 0 ? (
                <li className="nogaPlanner_selectSettingsItem">
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {SETTINGS_TEXT.noSavedItems}
                  </span>
                </li>
              ) : (
                (activePlannerSettingsOptionGroup?.options || []).map(
                  (optionValue, optionIndex) => (
                    <li
                      key={`planner-option-${activePlannerSettingsOptionGroup.key}-${optionValue}-${optionIndex}`}
                      className={
                        "nogaPlanner_selectSettingsItem" +
                        (activePlannerSettingsOptionGroup?.selectedIndex ===
                        optionIndex
                          ? " nogaPlanner_selectSettingsItem--selected"
                          : "")
                      }
                      onClick={() =>
                        planner.togglePlannerSettingsListItemSelection(
                          activePlannerSettingsOptionGroup.key,
                          optionIndex,
                        )
                      }
                    >
                      <span className="nogaPlanner_selectSettingsItemLabel">
                        {optionValue}
                      </span>
                    </li>
                  ),
                )
              )}
            </ul>
          </div>
        </div>

        <div className="nogaPlanner_selectSettingsColumn">
          <span className="nogaPlanner_selectSettingsColumnTitle">
            {SETTINGS_TEXT.defaults}
          </span>
          <div className="nogaPlanner_selectSettingsFields">
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsDefaultSection}
              onChange={(event) =>
                planner.handlePlannerSettingsDefaultSectionChange(
                  event.target.value,
                )
              }
            >
              {plannerDefaultSectionOptions.map((optionValue) => (
                <option
                  key={`planner-default-section-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>

            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={selectedPlannerDefaultFieldKey}
              onChange={(event) => {
                const nextFieldKey = event.target.value;
                const nextFieldConfig =
                  plannerDefaultFields.find(
                    (fieldConfig) => fieldConfig.key === nextFieldKey,
                  ) || null;
                planner.handlePlannerSettingsInputChange(
                  "plannerSettingsDefaultFieldKey",
                  nextFieldKey,
                );
                planner.handlePlannerSettingsInputChange(
                  "plannerSettingsDefaultValueInput",
                  String(nextFieldConfig?.value || "").trim(),
                );
                planner.handlePlannerSettingsInputChange(
                  "plannerSettingsEditingDefaultFieldKey",
                  "",
                );
              }}
              disabled={!selectedPlannerDefaultField}
            >
              {plannerDefaultFields.map((fieldConfig) => (
                <option
                  key={`planner-default-field-${fieldConfig.key}`}
                  value={fieldConfig.key}
                >
                  {fieldConfig.label}
                </option>
              ))}
            </select>

            {selectedPlannerDefaultField ? (
              selectedPlannerDefaultField.control === "select" ? (
                <select
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={plannerDefaultInputValue}
                  onChange={(event) =>
                    planner.handlePlannerSettingsInputChange(
                      "plannerSettingsDefaultValueInput",
                      event.target.value,
                    )
                  }
                >
                  <option value="">بدون</option>
                  {selectedPlannerDefaultField.options.map((optionValue) => (
                    <option
                      key={`planner-default-option-${selectedPlannerDefaultField.key}-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type={selectedPlannerDefaultField.inputType || "text"}
                  value={plannerDefaultInputValue}
                  onChange={(event) =>
                    planner.handlePlannerSettingsInputChange(
                      "plannerSettingsDefaultValueInput",
                      event.target.value,
                    )
                  }
                  placeholder="القيمة"
                />
              )
            ) : null}

            <div className="nogaPlanner_selectSettingsActions">
              {(() => {
                const isDefaultsAddDisabled =
                  !selectedPlannerDefaultFieldKey || !plannerDefaultInputValue;
                const isDefaultsEditDisabled = !selectedPlannerDefaultListEntry;
                const isDefaultsDeleteDisabled = !selectedPlannerDefaultListEntry;
                const isDefaultsDeleteAllDisabled =
                  plannerDefaultsWithValues.length === 0;
                return (
                  <>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDefaultsAddDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={planner.addOrUpdatePlannerDefaultField}
                disabled={isDefaultsAddDisabled}
              >
                {plannerSettingsEditingDefaultFieldKey ? "تحديث" : "إضافة"}
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDefaultsEditDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={planner.editSelectedPlannerDefaultField}
                disabled={isDefaultsEditDisabled}
              >
                تعديل
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDefaultsDeleteDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={planner.deleteSelectedPlannerDefaultField}
                disabled={isDefaultsDeleteDisabled}
              >
                حذف المحدد
              </button>
              <button
                type="button"
                className={
                  "nogaPlanner_coursesMiniBarBtn" +
                  (isDefaultsDeleteAllDisabled
                    ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                    : "")
                }
                onClick={() =>
                  planner.clearPlannerDefaultFieldsForSection(
                    selectedDefaultFormKey,
                  )
                }
                disabled={isDefaultsDeleteAllDisabled}
              >
                حذف الكل
              </button>
                  </>
                );
              })()}
            </div>

            <ul className="nogaPlanner_selectSettingsList">
              {plannerDefaultsWithValues.map((fieldConfig) => (
                <li
                  key={`planner-default-entry-${fieldConfig.key}`}
                  className={
                    "nogaPlanner_selectSettingsItem" +
                    (String(
                      plannerSettingsSelectedDefaultFieldKey || "",
                    ).trim() === fieldConfig.key
                      ? " nogaPlanner_selectSettingsItem--selected"
                      : "")
                  }
                  onClick={() =>
                    planner.togglePlannerDefaultFieldSelection(fieldConfig.key)
                  }
                >
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {fieldConfig.label}
                  </span>
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {fieldConfig.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="nogaPlanner_selectSettingsColumn">
          <span className="nogaPlanner_selectSettingsColumnTitle">
            {SETTINGS_TEXT.relationships}
          </span>
          <div className="nogaPlanner_selectSettingsFields">
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsRelationshipDraft.course_classSelection}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_classSelection",
                  event.target.value,
                )
              }
            >
              <option value="">نوع المكوّن</option>
              {componentClassOptions.map((optionValue) => (
                <option
                  key={`relationship-class-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsRelationshipDraft.normativeCourseTerm}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "normativeCourseTerm",
                  event.target.value,
                )
              }
            >
              <option value="">الفصل المفترض</option>
              {termOptions.map((optionValue) => (
                <option
                  key={`relationship-normative-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsRelationshipDraft.actualCourseTerm}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "actualCourseTerm",
                  event.target.value,
                )
              }
            >
              <option value="">الفصل الفعلي</option>
              {termOptions.map((optionValue) => (
                <option
                  key={`relationship-actual-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsRelationshipDraft.course_daySelection}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_daySelection",
                  event.target.value,
                )
              }
            >
              <option value="">اليوم</option>
              {weekdayOptions.map((optionValue) => (
                <option
                  key={`relationship-day-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            <select
              className="nogaPlanner_savedCoursesDetailsInput"
              value={plannerSettingsRelationshipDraft.course_timeSelection}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_timeSelection",
                  event.target.value,
                )
              }
            >
              <option value="">الساعة</option>
              {hourOptions.map((optionValue) => (
                <option
                  key={`relationship-hour-${optionValue}`}
                  value={optionValue}
                >
                  {optionValue}
                </option>
              ))}
            </select>
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={plannerSettingsRelationshipDraft.course_locationBuilding}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_locationBuilding",
                  event.target.value,
                )
              }
              placeholder="المبنى"
            />
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={plannerSettingsRelationshipDraft.course_locationRoom}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_locationRoom",
                  event.target.value,
                )
              }
              placeholder="القاعة"
            />
            <input
              className="nogaPlanner_savedCoursesDetailsInput"
              type="text"
              value={plannerSettingsRelationshipDraft.course_grade}
              onChange={(event) =>
                planner.handlePlannerSettingsRelationshipDraftChange(
                  "course_grade",
                  event.target.value,
                )
              }
              placeholder="الوزن"
            />
            <label className="nogaPlanner_selectSettingsCheckboxRow">
              <input
                type="checkbox"
                checked={Boolean(plannerSettingsRelationshipDraft.readOnly)}
                onChange={(event) =>
                  planner.handlePlannerSettingsRelationshipDraftChange(
                    "readOnly",
                    event.target.checked,
                  )
                }
              />
              <span>قفل هذه القيم داخل المحرر</span>
            </label>
            <div className="nogaPlanner_selectSettingsActions">
              <button
                type="button"
                className="nogaPlanner_coursesMiniBarBtn"
                onClick={planner.submitPlannerSettingsRelationship}
              >
                {plannerSettingsEditingRelationshipId
                  ? "تحديث العلاقة"
                  : "إضافة العلاقة"}
              </button>
            </div>
            <ul className="nogaPlanner_selectSettingsRelationshipsList">
              {plannerRelationships.map((relationship) => (
                <li
                  key={relationship.id}
                  className="nogaPlanner_selectSettingsRelationshipItem"
                >
                  <div className="nogaPlanner_selectSettingsRelationshipBody">
                    <span className="nogaPlanner_selectSettingsRelationshipText">
                      {relationship.course_classSelection}
                    </span>
                    <span className="nogaPlanner_selectSettingsRelationshipText">
                      {[
                        relationship.normativeCourseTerm
                          ? `المفترض: ${relationship.normativeCourseTerm}`
                          : "",
                        relationship.actualCourseTerm
                          ? `الفعلي: ${relationship.actualCourseTerm}`
                          : "",
                        relationship.course_daySelection
                          ? `اليوم: ${relationship.course_daySelection}`
                          : "",
                        relationship.course_timeSelection
                          ? `الساعة: ${relationship.course_timeSelection}`
                          : "",
                        relationship.course_locationBuilding
                          ? `المبنى: ${relationship.course_locationBuilding}`
                          : "",
                        relationship.course_locationRoom
                          ? `القاعة: ${relationship.course_locationRoom}`
                          : "",
                        relationship.course_grade
                          ? `الوزن: ${relationship.course_grade}`
                          : "",
                        relationship.readOnly ? "مقفل" : "",
                      ]
                        .filter(Boolean)
                        .join(" • ") || "بدون قيم إضافية"}
                    </span>
                  </div>
                  <span className="nogaPlanner_selectSettingsItemActions">
                    <button
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={() =>
                        planner.editPlannerSettingsRelationship(relationship.id)
                      }
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="nogaPlanner_coursesMiniBarBtn"
                      onClick={() =>
                        planner.deletePlannerSettingsRelationship(
                          relationship.id,
                        )
                      }
                    >
                      حذف
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NogaPlannerSettings;
