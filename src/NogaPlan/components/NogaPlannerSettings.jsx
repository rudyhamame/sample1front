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
  const [activeSettingsSection, setActiveSettingsSection] =
    React.useState("general");

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
    plannerSettingsSelectedRelationshipId,
    plannerSettingsLogoMotionEnabled,
    plannerSettingsVoiceControlEnabled,
    plannerSettingsLogoFixedClock,
    plannerSettingsMessageFromFriendFromId,
    plannerSettingsMessageFromFriendToId,
    plannerSettingsMessageFromFriendToMessage,
    plannerSettingsMessageFromFriendToList,
    plannerSettingsMessageFromFriendSelectedToIndex,
    plannerSettingsPredictionToolEnabled,
    plannerSettingsSelectedPredictionFieldId,
    plannerSettingsSelectedPredictionTab,
    plannerSettingsVoiceCommandTab,
    plannerSettingsVoiceCommandButton,
    plannerSettingsVoiceCommandInput,
    plannerSettingsVoiceCommandEntries,
    plannerSettingsSelectedVoiceCommandIndex,
    plannerSettingsEditingVoiceCommandIndex,
  } = planner.state;
  const predictionToolEntries = Array.isArray(
    plannerSelectSettings?.predictionTool,
  )
    ? plannerSelectSettings.predictionTool
    : [];
  const predictionTabs = Array.from(
    new Set(
      predictionToolEntries
        .map((entry) => String(entry?.tab || "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const predictionFieldEntries = Object.entries(
    planner?.plannerInputHistory &&
      typeof planner.plannerInputHistory === "object"
      ? planner.plannerInputHistory
      : {},
  )
    .map(([fieldId, list]) => ({
      fieldId: String(fieldId || "").trim(),
      list: Array.isArray(list)
        ? list.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [],
    }))
    .filter((entry) => entry.fieldId && entry.list.length > 0)
    .sort((left, right) =>
      left.fieldId.localeCompare(right.fieldId, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
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
    ? locationRoomOptionsByBuilding.find(
        (entry) =>
          String(entry?.building || "").trim() === selectedRoomBuilding,
      )?.rooms || []
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
      placeholder:
        SETTINGS_TEXT.optionGroups.locationBuildingOptions.placeholder,
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
  const settingsSectionEntries = [
    { key: "general", label: "عام" },
    { key: "lists", label: SETTINGS_TEXT.lists },
    { key: "defaults", label: SETTINGS_TEXT.defaults },
    { key: "relationships", label: SETTINGS_TEXT.relationships },
    { key: "voice", label: "أوامر التحكم الصوتي" },
    { key: "friend", label: SETTINGS_TEXT.messageFromFriend },
    { key: "prediction", label: "أداة التنبؤ" },
  ];

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
  const componentRelationshipFieldOptions = [
    { value: "course_classSelection", label: "نوع المكوّن" },
    { value: "normativeCourseTerm", label: "الفصل المفترض" },
    { value: "actualCourseTerm", label: "الفصل الفعلي" },
    { value: "course_daySelection", label: "اليوم" },
    { value: "course_timeSelection", label: "الساعة" },
    { value: "course_locationBuilding", label: "المبنى" },
    { value: "course_locationRoom", label: "القاعة" },
    { value: "course_grade", label: "الوزن" },
  ];
  const allLocationRoomOptions = Array.from(
    new Set(
      [
        ...locationRoomOptions,
        ...locationRoomOptionsByBuilding.flatMap((entry) =>
          Array.isArray(entry?.rooms) ? entry.rooms : [],
        ),
      ]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const getRelationshipFieldValueOptions = (fieldName) => {
    const normalizedFieldName = String(fieldName || "").trim();
    if (!normalizedFieldName) {
      return [];
    }
    if (normalizedFieldName === "course_classSelection") {
      return componentClassOptions;
    }
    if (normalizedFieldName === "normativeCourseTerm") {
      return termOptions;
    }
    if (normalizedFieldName === "actualCourseTerm") {
      return termOptions;
    }
    if (normalizedFieldName === "course_daySelection") {
      return weekdayOptions;
    }
    if (normalizedFieldName === "course_timeSelection") {
      return hourOptions;
    }
    if (normalizedFieldName === "course_locationBuilding") {
      return locationBuildingOptions;
    }
    if (normalizedFieldName === "course_locationRoom") {
      return allLocationRoomOptions;
    }
    return [];
  };
  const renderRelationshipValueControl = ({
    fieldName,
    value,
    onChange,
    placeholder,
  }) => {
    const options = getRelationshipFieldValueOptions(fieldName);
    if (options.length > 0) {
      return (
        <select
          className="nogaPlanner_savedCoursesDetailsInput"
          value={String(value || "")}
          onChange={onChange}
        >
          <option value="">{placeholder}</option>
          {options.map((optionValue) => (
            <option
              key={`relationship-value-${fieldName}-${optionValue}`}
              value={optionValue}
            >
              {optionValue}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="nogaPlanner_savedCoursesDetailsInput"
        type="text"
        value={String(value || "")}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div id="nogaPlanner_selectSettingsPanel" className="nogaPlanner_selectSettingsPanel">
      <div id="nogaPlanner_selectSettingsHeader" className="nogaPlanner_selectSettingsHeader">
        <span id="nogaPlanner_selectSettingsTitle" className="nogaPlanner_selectSettingsTitle">
          {SETTINGS_TEXT.title}
        </span>
      </div>
      <div id="nogaPlanner_selectSettingsContent" className="nogaPlanner_selectSettingsContent">
          <div id="nogaPlanner_selectSettingsMain" className="nogaPlanner_selectSettingsMain">
            {activeSettingsSection === "general" ? (
              <div id="nogaPlanner_selectSettingsFields_general" className="nogaPlanner_selectSettingsFields">
                  <label id="nogaPlanner_selectSettingsRow_logoMotion" className="nogaPlanner_selectSettingsCheckboxRow">
                    <input
                      id="nogaPlanner_selectSettingsInput_logoMotion"
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
                  <label id="nogaPlanner_selectSettingsRow_voiceControl" className="nogaPlanner_selectSettingsCheckboxRow">
                    <input
                      id="nogaPlanner_selectSettingsInput_voiceControl"
                      type="checkbox"
                      checked={Boolean(plannerSettingsVoiceControlEnabled)}
                      onChange={(event) =>
                        planner.handlePlannerSettingsInputChange(
                          "plannerSettingsVoiceControlEnabled",
                          event.target.checked,
                        )
                      }
                    />
                    <span>
                      {SETTINGS_TEXT.voiceControlListener}:{" "}
                      {plannerSettingsVoiceControlEnabled
                        ? SETTINGS_TEXT.motionOn
                        : SETTINGS_TEXT.motionOff}
                    </span>
                  </label>
                  <select
                    id="nogaPlanner_selectSettingsSelect_logoFixedClock"
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
                      <option
                        key={`planner-logo-clock-${entry.value}`}
                        value={entry.value}
                      >
                        {SETTINGS_TEXT.fixedLogoClock} {entry.label}
                      </option>
                    ))}
                  </select>
              </div>
            ) : null}

            <div id="nogaPlanner_selectSettingsColumns" className="nogaPlanner_selectSettingsColumns">
              {activeSettingsSection === "lists" ? (
                <>
                <div id="nogaPlanner_selectSettingsFields_lists" className="nogaPlanner_selectSettingsFields">
              <select
                id="nogaPlanner_selectSettingsSelect_listsSection"
                className="nogaPlanner_savedCoursesDetailsInput"
                value={plannerSettingsDefaultSection}
                onChange={(event) =>
                  planner.handlePlannerSettingsDefaultSectionChange(
                    event.target.value,
                  )
                }
              >
                {plannerDefaultSectionOptions.map((sectionLabel) => (
                  <option
                    key={`settings-section-${sectionLabel}`}
                    value={sectionLabel}
                  >
                    {sectionLabel}
                  </option>
                ))}
              </select>
              <select
                id="nogaPlanner_selectSettingsSelect_activeListKey"
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
                id="nogaPlanner_selectSettingsInput_listValue"
                className="nogaPlanner_savedCoursesDetailsInput"
                type="text"
                value={activePlannerSettingsOptionGroup?.inputValue || ""}
                onChange={(event) =>
                  planner.handlePlannerSettingsInputChange(
                    activePlannerSettingsOptionGroup.key ===
                      "componentClassOptions"
                      ? "plannerSettingsComponentClassInput"
                      : activePlannerSettingsOptionGroup.key ===
                          "weekdayOptions"
                        ? "plannerSettingsWeekdayInput"
                        : activePlannerSettingsOptionGroup.key === "hourOptions"
                          ? "plannerSettingsHourInput"
                          : activePlannerSettingsOptionGroup.key ===
                              "termOptions"
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
                placeholder={
                  activePlannerSettingsOptionGroup?.placeholder || ""
                }
                disabled={roomListBuildingMissing}
              />
              {activePlannerSettingsOptionGroup?.key ===
              "locationRoomOptions" ? (
                <select
                  id="nogaPlanner_selectSettingsSelect_listRoomBuilding"
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
                    <option
                      key={`room-building-${optionValue}`}
                      value={optionValue}
                    >
                      {optionValue}
                    </option>
                  ))}
                </select>
              ) : null}

          </div>
          <div id="nogaPlanner_selectSettingsActions_lists" className="nogaPlanner_selectSettingsActions">
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
                    id="nogaPlanner_selectSettingsBtn_listsAddOrUpdate"
                    type="button"
                    className={
                      "nogaPlanner_coursesMiniBarBtn" +
                      (isAddDisabled
                        ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                        : "")
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
                    id="nogaPlanner_selectSettingsBtn_listsDeleteSelected"
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
                    id="nogaPlanner_selectSettingsBtn_listsDeleteAll"
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
                    id="nogaPlanner_selectSettingsBtn_listsEdit"
                    type="button"
                    className={
                      "nogaPlanner_coursesMiniBarBtn" +
                      (isEditDisabled
                        ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                        : "")
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
          <ul id="nogaPlanner_selectSettingsList_lists" className="nogaPlanner_selectSettingsList">
            {roomListBuildingMissing ? (
              <>
                <li className="nogaPlanner_selectSettingsItem">
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {SETTINGS_TEXT.chooseBuildingFirst}
                  </span>
                </li>
                {Array.from({ length: 7 }).map((_, index) => (
                  <li
                    key={`planner-lists-placeholder-building-${index}`}
                    className="nogaPlanner_selectSettingsItem nogaPlanner_selectSettingsItem--placeholder"
                  >
                    <span className="nogaPlanner_selectSettingsItemLabel">—</span>
                  </li>
                ))}
              </>
            ) : (activePlannerSettingsOptionGroup?.options || []).length === 0 ? (
              <>
                <li className="nogaPlanner_selectSettingsItem">
                  <span className="nogaPlanner_selectSettingsItemLabel">
                    {SETTINGS_TEXT.noSavedItems}
                  </span>
                </li>
                {Array.from({ length: 7 }).map((_, index) => (
                  <li
                    key={`planner-lists-placeholder-empty-${index}`}
                    className="nogaPlanner_selectSettingsItem nogaPlanner_selectSettingsItem--placeholder"
                  >
                    <span className="nogaPlanner_selectSettingsItemLabel">—</span>
                  </li>
                ))}
              </>
            ) : (
              (activePlannerSettingsOptionGroup?.options || []).map(
                (optionValue, optionIndex) => (
                  <li
                    key={`planner-option-${activePlannerSettingsOptionGroup.key}-${optionValue}-${optionIndex}`}
                    className={
                      "nogaPlanner_selectSettingsItem" +
                      (activePlannerSettingsOptionGroup?.selectedIndex === optionIndex
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
                </>

              ) : null}
              {activeSettingsSection === "defaults" ? (
                <div id="nogaPlanner_selectSettingsFields_defaults" className="nogaPlanner_selectSettingsFields">
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

              <div id="nogaPlanner_selectSettingsActions_defaults" className="nogaPlanner_selectSettingsActions">
                {(() => {
                  const isDefaultsAddDisabled =
                    !selectedPlannerDefaultFieldKey ||
                    !plannerDefaultInputValue;
                  const isDefaultsEditDisabled =
                    !selectedPlannerDefaultListEntry;
                  const isDefaultsDeleteDisabled =
                    !selectedPlannerDefaultListEntry;
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
                        {plannerSettingsEditingDefaultFieldKey
                          ? "تحديث"
                          : "إضافة"}
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
                {plannerDefaultsWithValues.length > 0 ? (
                  plannerDefaultsWithValues.map((fieldConfig) => (
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
                        planner.togglePlannerDefaultFieldSelection(
                          fieldConfig.key,
                        )
                      }
                    >
                      <span className="nogaPlanner_selectSettingsItemLabel">
                        {fieldConfig.label}
                      </span>
                      <span className="nogaPlanner_selectSettingsItemLabel">
                        {fieldConfig.value}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="nogaPlanner_selectSettingsItem">
                    <span className="nogaPlanner_selectSettingsItemLabel">
                      لا يوجد أي إدخال
                    </span>
                  </li>
                )}
              </ul>
          </div>

              ) : null}
              {activeSettingsSection === "relationships" ? (
                <div id="nogaPlanner_selectSettingsFields_relationships" className="nogaPlanner_selectSettingsFields">
              <select
                className="nogaPlanner_savedCoursesDetailsInput"
                value={
                  plannerSettingsRelationshipDraft.relationScope ||
                  "innerComponent"
                }
                onChange={(event) =>
                  planner.handlePlannerSettingsRelationshipDraftChange(
                    "relationScope",
                    event.target.value,
                  )
                }
              >
                <option value="innerComponent">داخل المكوّن</option>
                <option value="intercomponent">
                  بين مكوّنات نفس المادّة (لاحقاً)
                </option>
              </select>
              {(plannerSettingsRelationshipDraft.relationScope ||
                "innerComponent") === "innerComponent" ? (
                <>
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={plannerSettingsRelationshipDraft.causeField || ""}
                    onChange={(event) =>
                      planner.handlePlannerSettingsRelationshipDraftChange(
                        "causeField",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">حقل السبب</option>
                    {componentRelationshipFieldOptions.map((option) => (
                      <option
                        key={`relationship-cause-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {renderRelationshipValueControl({
                    fieldName: plannerSettingsRelationshipDraft.causeField,
                    value: plannerSettingsRelationshipDraft.causeValue || "",
                    onChange: (event) =>
                      planner.handlePlannerSettingsRelationshipDraftChange(
                        "causeValue",
                        event.target.value,
                      ),
                    placeholder: "قيمة السبب",
                  })}
                  <select
                    className="nogaPlanner_savedCoursesDetailsInput"
                    value={plannerSettingsRelationshipDraft.effectField || ""}
                    onChange={(event) =>
                      planner.handlePlannerSettingsRelationshipDraftChange(
                        "effectField",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">حقل الأثر</option>
                    {componentRelationshipFieldOptions.map((option) => (
                      <option
                        key={`relationship-effect-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {renderRelationshipValueControl({
                    fieldName: plannerSettingsRelationshipDraft.effectField,
                    value: plannerSettingsRelationshipDraft.effectValue || "",
                    onChange: (event) =>
                      planner.handlePlannerSettingsRelationshipDraftChange(
                        "effectValue",
                        event.target.value,
                      ),
                    placeholder: "قيمة الأثر",
                  })}
                </>
              ) : (
                <span className="nogaPlanner_selectSettingsRelationshipText">
                  سيتم إعداد علاقات المكوّنات المتداخلة لاحقاً
                </span>
              )}
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
              <div id="nogaPlanner_selectSettingsActions_relationships" className="nogaPlanner_selectSettingsActions">
                {(() => {
                  const hasSelectedRelationship = Boolean(
                    String(plannerSettingsSelectedRelationshipId || "").trim(),
                  );
                  const hasRelationships = plannerRelationships.length > 0;
                  return (
                    <>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.submitPlannerSettingsRelationship}
                      >
                        {plannerSettingsEditingRelationshipId
                          ? "تحديث العلاقة"
                          : "إضافة"}
                      </button>
                      <button
                        type="button"
                        className={
                          "nogaPlanner_coursesMiniBarBtn" +
                          (hasSelectedRelationship
                            ? ""
                            : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                        }
                        onClick={
                          planner.editSelectedPlannerSettingsRelationship
                        }
                        disabled={!hasSelectedRelationship}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        className={
                          "nogaPlanner_coursesMiniBarBtn" +
                          (hasSelectedRelationship
                            ? ""
                            : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                        }
                        onClick={
                          planner.deleteSelectedPlannerSettingsRelationship
                        }
                        disabled={!hasSelectedRelationship}
                      >
                        حذف المحدد
                      </button>
                      <button
                        type="button"
                        className={
                          "nogaPlanner_coursesMiniBarBtn" +
                          (hasRelationships
                            ? ""
                            : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                        }
                        onClick={planner.clearPlannerSettingsRelationships}
                        disabled={!hasRelationships}
                      >
                        حذف الكل
                      </button>
                    </>
                  );
                })()}
              </div>
              <ul id="nogaPlanner_selectSettingsList_defaults" className="nogaPlanner_selectSettingsRelationshipsList">
                {plannerRelationships.length > 0 ? (
                  plannerRelationships.map((relationship) => (
                    <li
                      key={relationship.id}
                      className={
                        "nogaPlanner_selectSettingsRelationshipItem" +
                        (String(
                          plannerSettingsSelectedRelationshipId || "",
                        ).trim() === String(relationship.id || "").trim()
                          ? " nogaPlanner_selectSettingsItem--selected"
                          : "")
                      }
                      onClick={() =>
                        planner.togglePlannerSettingsRelationshipSelection(
                          relationship.id,
                        )
                      }
                    >
                      <div className="nogaPlanner_selectSettingsRelationshipBody">
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          {relationship.relationScope === "intercomponent"
                            ? "بين مكوّنات نفس المادّة"
                            : "داخل المكوّن"}
                        </span>
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          {relationship.relationScope === "intercomponent"
                            ? "لاحقاً"
                            : [
                                relationship.causeField
                                  ? `السبب: ${componentRelationshipFieldOptions.find((entry) => entry.value === relationship.causeField)?.label || relationship.causeField}`
                                  : "",
                                relationship.causeValue
                                  ? `قيمة السبب: ${relationship.causeValue}`
                                  : "",
                                relationship.effectField
                                  ? `الأثر: ${componentRelationshipFieldOptions.find((entry) => entry.value === relationship.effectField)?.label || relationship.effectField}`
                                  : "",
                                relationship.effectValue
                                  ? `قيمة الأثر: ${relationship.effectValue}`
                                  : "",
                                relationship.readOnly ? "مقفل" : "",
                              ]
                                .filter(Boolean)
                                .join(" • ") || "بدون قيم إضافية"}
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="nogaPlanner_selectSettingsRelationshipItem nogaPlanner_selectSettingsRelationshipItem--empty">
                    <div className="nogaPlanner_selectSettingsRelationshipBody nogaPlanner_selectSettingsRelationshipBody--empty">
                      <span className="nogaPlanner_selectSettingsRelationshipText">
                        لا يوجد أي إدخال
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </div>

              ) : null}
              {activeSettingsSection === "voice" ? (
                <div id="nogaPlanner_selectSettingsFields_voice" className="nogaPlanner_selectSettingsFields">
              {(() => {
                const voiceTabOptions = [
                  "NogaPlanner",
                  "المقررات",
                  "المحاضرات",
                  "الامتحانات",
                  "الإعدادات",
                  "Settings",
                ];
                const voiceButtonsByTab = {
                  // Global app-level buttons only (not tab-local actions).
                  NogaPlanner: [
                    "المقررات",
                    "المحاضرات",
                    "الامتحانات",
                    "الإعدادات",
                    "رجوع",
                  ],
                  المقررات: [
                    "إضافة",
                    "تعديل المحدد",
                    "حذف المحدد",
                    "حذف الكل",
                    "تحديد",
                  ],
                  المحاضرات: [
                    "إضافة",
                    "تعديل المحدد",
                    "حذف المحدد",
                    "حذف الكل",
                    "تحديد",
                  ],
                  الامتحانات: [
                    "إضافة",
                    "تعديل المحدد",
                    "حذف المحدد",
                    "حذف الكل",
                  ],
                  الإعدادات: ["رجوع", "حفظ", "تعديل", "حذف المحدد", "حذف الكل"],
                  Settings: ["رجوع", "حفظ", "تعديل", "حذف المحدد", "حذف الكل"],
                };
                const buttonOptions =
                  voiceButtonsByTab[
                    String(plannerSettingsVoiceCommandTab || "").trim()
                  ] || [];
                const selectedVoiceIndex = Number(
                  plannerSettingsSelectedVoiceCommandIndex ?? -1,
                );
                const voiceEntriesFromState = Array.isArray(
                  plannerSettingsVoiceCommandEntries,
                )
                  ? plannerSettingsVoiceCommandEntries
                  : [];
                const voiceEntriesFromSettings = Array.isArray(
                  plannerSelectSettings?.voiceCommands,
                )
                  ? plannerSelectSettings.voiceCommands
                  : Array.isArray(plannerSelectSettings?.voiceCommandEntries)
                    ? plannerSelectSettings.voiceCommandEntries
                    : [];
                const voiceEntries =
                  voiceEntriesFromState.length > 0
                    ? voiceEntriesFromState
                    : voiceEntriesFromSettings;
                return (
                  <>
                    <div id="nogaPlanner_selectSettingsVoiceCommandsCard" className="nogaPlanner_selectSettingsVoiceCommandsCard">
                      <div id="nogaPlanner_selectSettingsActions_voice" className="nogaPlanner_selectSettingsActions">
                        <button
                          type="button"
                          className="nogaPlanner_coursesMiniBarBtn"
                          onClick={planner.addOrUpdatePlannerVoiceCommandEntry}
                        >
                          {Number(plannerSettingsEditingVoiceCommandIndex) >= 0
                            ? "تحديث"
                            : "إضافة"}
                        </button>
                        <button
                          type="button"
                          className={
                            "nogaPlanner_coursesMiniBarBtn" +
                            (selectedVoiceIndex >= 0
                              ? ""
                              : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                          }
                          onClick={planner.editSelectedPlannerVoiceCommandEntry}
                          disabled={selectedVoiceIndex < 0}
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          className={
                            "nogaPlanner_coursesMiniBarBtn" +
                            (selectedVoiceIndex >= 0
                              ? ""
                              : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                          }
                          onClick={
                            planner.deleteSelectedPlannerVoiceCommandEntry
                          }
                          disabled={selectedVoiceIndex < 0}
                        >
                          حذف المحدد
                        </button>
                        <button
                          type="button"
                          className={
                            "nogaPlanner_coursesMiniBarBtn" +
                            (voiceEntries.length > 0
                              ? ""
                              : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                          }
                          onClick={planner.clearPlannerVoiceCommandEntries}
                          disabled={voiceEntries.length === 0}
                        >
                          حذف الكل
                        </button>
                      </div>
                      <select
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={String(
                          plannerSettingsVoiceCommandTab || "المقررات",
                        )}
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            "plannerSettingsVoiceCommandTab",
                            event.target.value,
                          )
                        }
                      >
                        {voiceTabOptions.map((tabName) => (
                          <option key={`voice-tab-${tabName}`} value={tabName}>
                            {tabName}
                          </option>
                        ))}
                      </select>
                      <select
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={String(plannerSettingsVoiceCommandButton || "")}
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            "plannerSettingsVoiceCommandButton",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">اختر الزر</option>
                        {buttonOptions.map((buttonName) => (
                          <option
                            key={`voice-btn-${buttonName}`}
                            value={buttonName}
                          >
                            {buttonName}
                          </option>
                        ))}
                      </select>
                      <input
                        className="nogaPlanner_savedCoursesDetailsInput"
                        type="text"
                        value={String(plannerSettingsVoiceCommandInput || "")}
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            "plannerSettingsVoiceCommandInput",
                            event.target.value,
                          )
                        }
                        placeholder="الأمر الصوتي"
                      />
                      <ul id="nogaPlanner_selectSettingsList_voice" className="nogaPlanner_selectSettingsVoiceCommandsList">
                        {voiceEntries.length > 0 ? (
                          voiceEntries.map((entry, entryIndex) => (
                            <li
                              key={entry?.id || `voice-entry-${entryIndex}`}
                              className={
                                Number(
                                  plannerSettingsSelectedVoiceCommandIndex,
                                ) === entryIndex
                                  ? "nogaPlanner_selectSettingsItem--selected"
                                  : ""
                              }
                              onClick={() =>
                                planner.togglePlannerVoiceCommandSelection(
                                  entryIndex,
                                )
                              }
                            >
                              {`${entry?.tab || "-"} • ${entry?.button || "-"} • ${entry?.command || "-"}`}
                            </li>
                          ))
                        ) : (
                          <li>لا يوجد أي إدخال</li>
                        )}
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>

              ) : null}
              {activeSettingsSection === "friend" ? (
                <div id="nogaPlanner_selectSettingsFields_friend" className="nogaPlanner_selectSettingsFields">
              {(() => {
                const normalizeFriendId = (value) => {
                  if (!value) {
                    return "";
                  }
                  if (typeof value === "object") {
                    return String(value?._id || value?.id || "").trim();
                  }
                  return String(value || "").trim();
                };
                const friendOptions = (
                  Array.isArray(planner?.props?.state?.friends)
                    ? planner.props.state.friends
                    : []
                )
                  .map((entry, index) => {
                    const info =
                      entry?.info ||
                      entry?.identity?.personal ||
                      entry?.user?.info ||
                      entry?.user ||
                      {};
                    const friendId = normalizeFriendId(
                      entry?._id ||
                        entry?.id ||
                        entry?.user?._id ||
                        entry?.user?.id,
                    );
                    const firstName = String(info?.firstname || "").trim();
                    const lastName = String(info?.lastname || "").trim();
                    const username = String(info?.username || "").trim();
                    const fullName = `${firstName} ${lastName}`.trim();
                    const label =
                      fullName ||
                      (username ? `@${username}` : `صديق ${index + 1}`);
                    return {
                      id: friendId,
                      label,
                      raw: entry,
                    };
                  })
                  .filter((entry) => Boolean(entry.id));
                const myUserId = String(
                  planner?.props?.state?.my_id || "",
                ).trim();
                const messageFriendSettings =
                  planner.state?.plannerSelectSettings?.messageFriend;
                const listeningFriendMessage = (() => {
                  const selectedFromId = String(
                    plannerSettingsMessageFromFriendFromId || "",
                  ).trim();
                  if (!selectedFromId || !myUserId) {
                    return "";
                  }
                  const selectedFriend = friendOptions.find(
                    (friend) =>
                      String(friend.id || "").trim() === selectedFromId,
                  );
                  if (!selectedFriend?.raw) {
                    return "";
                  }
                  const friendSettings =
                    selectedFriend.raw?.memory?.studyPlanner?.studyOrganizer
                      ?.settings ||
                    selectedFriend.raw?.memory?.MOI?.studyPlanner
                      ?.studyOrganizer?.settings ||
                    selectedFriend.raw?.settings ||
                    selectedFriend.raw?.user?.memory?.studyPlanner
                      ?.studyOrganizer?.settings ||
                    selectedFriend.raw?.user?.memory?.MOI?.studyPlanner
                      ?.studyOrganizer?.settings ||
                    {};
                  const outgoingToList = Array.isArray(
                    friendSettings?.messageFriend?.to,
                  )
                    ? friendSettings.messageFriend.to
                    : [];
                  const matchedIncoming = outgoingToList.find(
                    (toEntry) =>
                      normalizeFriendId(toEntry?.friendID) === myUserId &&
                      String(toEntry?.message || "").trim(),
                  );
                  if (matchedIncoming) {
                    return String(matchedIncoming?.message || "").trim();
                  }
                  const outgoingList = Array.isArray(messageFriendSettings?.to)
                    ? messageFriendSettings.to
                    : [];
                  const matchedOutgoing = outgoingList.find(
                    (entry) =>
                      normalizeFriendId(entry?.friendID) === selectedFromId &&
                      String(entry?.message || "").trim(),
                  );
                  if (matchedOutgoing) {
                    return String(matchedOutgoing?.message || "").trim();
                  }
                  return String(
                    messageFriendSettings?.from?.message || "",
                  ).trim();
                })();
                const toList = Array.isArray(
                  plannerSettingsMessageFromFriendToList,
                )
                  ? plannerSettingsMessageFromFriendToList
                  : [];
                return (
                  <>
                    <span className="nogaPlanner_selectSettingsRelationshipText">
                      {SETTINGS_TEXT.messageFromFriendFrom}
                    </span>
                    <select
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={String(
                        plannerSettingsMessageFromFriendFromId || "",
                      ).trim()}
                      onChange={(event) =>
                        planner.savePlannerSettingsMessageFromFriendSelection(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        {SETTINGS_TEXT.messageFromFriendChoose}
                      </option>
                      {friendOptions.map((friend) => (
                        <option
                          key={`settings-friend-${friend.id}`}
                          value={friend.id}
                        >
                          {friend.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={listeningFriendMessage}
                      placeholder="رسالة الصديق المختار ستظهر هنا"
                      rows={3}
                      readOnly
                    />

                    <span className="nogaPlanner_selectSettingsRelationshipText">
                      {SETTINGS_TEXT.messageFromFriendTo}
                    </span>
                    <select
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={String(
                        plannerSettingsMessageFromFriendToId || "",
                      ).trim()}
                      onChange={(event) =>
                        planner.handlePlannerSettingsInputChange(
                          "plannerSettingsMessageFromFriendToId",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        {SETTINGS_TEXT.messageFromFriendChoose}
                      </option>
                      {friendOptions.map((friend) => (
                        <option
                          key={`settings-friend-to-${friend.id}`}
                          value={friend.id}
                        >
                          {friend.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="nogaPlanner_savedCoursesDetailsInput"
                      value={String(
                        plannerSettingsMessageFromFriendToMessage || "",
                      )}
                      onChange={(event) =>
                        planner.handlePlannerSettingsInputChange(
                          "plannerSettingsMessageFromFriendToMessage",
                          event.target.value,
                        )
                      }
                      placeholder={SETTINGS_TEXT.messageFromFriendInput}
                      rows={4}
                    />
                    <div id="nogaPlanner_selectSettingsActions_friend" className="nogaPlanner_selectSettingsActions">
                      <button
                        type="button"
                        className={
                          "nogaPlanner_coursesMiniBarBtn" +
                          (!String(
                            plannerSettingsMessageFromFriendToId || "",
                          ).trim() ||
                          !String(
                            plannerSettingsMessageFromFriendToMessage || "",
                          ).trim()
                            ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                            : "")
                        }
                        onClick={
                          planner.addPlannerSettingsMessageFriendRecipient
                        }
                        disabled={
                          !String(
                            plannerSettingsMessageFromFriendToId || "",
                          ).trim() ||
                          !String(
                            plannerSettingsMessageFromFriendToMessage || "",
                          ).trim()
                        }
                      >
                        {SETTINGS_TEXT.messageFromFriendAddToList}
                      </button>
                      <button
                        type="button"
                        className={
                          "nogaPlanner_coursesMiniBarBtn" +
                          (Number(
                            plannerSettingsMessageFromFriendSelectedToIndex,
                          ) < 0
                            ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                            : "")
                        }
                        onClick={
                          planner.removeSelectedPlannerSettingsMessageFriendRecipient
                        }
                        disabled={
                          Number(
                            plannerSettingsMessageFromFriendSelectedToIndex,
                          ) < 0
                        }
                      >
                        {SETTINGS_TEXT.messageFromFriendDeleteSelected}
                      </button>
                      <button
                        type="button"
                        className="nogaPlanner_coursesMiniBarBtn"
                        onClick={planner.savePlannerSettingsMessageFromFriend}
                      >
                        {SETTINGS_TEXT.messageFromFriendSave}
                      </button>
                    </div>
                    <span className="nogaPlanner_selectSettingsRelationshipText">
                      {SETTINGS_TEXT.messageFromFriendToList}
                    </span>
                    <ul id="nogaPlanner_selectSettingsList_friendTo" className="nogaPlanner_selectSettingsRelationshipsList">
                      {toList.length > 0 ? (
                        toList.map((entry, entryIndex) => {
                          const friendLabel =
                            friendOptions.find(
                              (friend) =>
                                String(friend.id) ===
                                String(entry?.friendID || ""),
                            )?.label || String(entry?.friendID || "");
                          return (
                            <li
                              key={`settings-message-to-${entryIndex}`}
                              className={
                                "nogaPlanner_selectSettingsRelationshipItem" +
                                (Number(
                                  plannerSettingsMessageFromFriendSelectedToIndex,
                                ) === entryIndex
                                  ? " nogaPlanner_selectSettingsItem--selected"
                                  : "")
                              }
                              onClick={() =>
                                planner.togglePlannerSettingsMessageFriendRecipientSelection(
                                  entryIndex,
                                )
                              }
                            >
                              <div className="nogaPlanner_selectSettingsRelationshipBody">
                                <span className="nogaPlanner_selectSettingsRelationshipText">
                                  {friendLabel}
                                </span>
                                <span className="nogaPlanner_selectSettingsRelationshipText">
                                  {String(entry?.message || "")}
                                </span>
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="nogaPlanner_selectSettingsRelationshipItem nogaPlanner_selectSettingsRelationshipItem--empty">
                          <div className="nogaPlanner_selectSettingsRelationshipBody nogaPlanner_selectSettingsRelationshipBody--empty">
                            <span className="nogaPlanner_selectSettingsRelationshipText">
                              {SETTINGS_TEXT.messageFromFriendNoEntries}
                            </span>
                          </div>
                        </li>
                      )}
                    </ul>
                  </>
                );
              })()}
            </div>

              ) : null}
              {activeSettingsSection === "prediction" ? (
                <div id="nogaPlanner_selectSettingsFields_prediction" className="nogaPlanner_selectSettingsFields">
            
              <label id="nogaPlanner_selectSettingsRow_predictionEnabled" className="nogaPlanner_selectSettingsCheckboxRow">
                <input
                  id="nogaPlanner_selectSettingsInput_predictionEnabled"
                  type="checkbox"
                  checked={Boolean(plannerSettingsPredictionToolEnabled)}
                  onChange={(event) =>
                    planner.handlePlannerSettingsInputChange(
                      "plannerSettingsPredictionToolEnabled",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  تفعيل أداة التنبؤ:{" "}
                  {plannerSettingsPredictionToolEnabled ? "مفعّل" : "متوقّف"}
                </span>
              </label>
              <div id="nogaPlanner_selectSettingsActions_prediction" className="nogaPlanner_selectSettingsActions">
                <button
                  type="button"
                  className="nogaPlanner_coursesMiniBarBtn"
                  onClick={planner.savePlannerPredictionToolSettings}
                >
                  حفظ
                </button>
                <button
                  type="button"
                  className={
                    "nogaPlanner_coursesMiniBarBtn" +
                    (String(
                      plannerSettingsSelectedPredictionFieldId || "",
                    ).trim()
                      ? ""
                      : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                  }
                  onClick={planner.deleteSelectedPlannerPredictionField}
                  disabled={
                    !String(
                      plannerSettingsSelectedPredictionFieldId || "",
                    ).trim()
                  }
                >
                  حذف الحقل المحدد
                </button>
                <button
                  type="button"
                  className={
                    "nogaPlanner_coursesMiniBarBtn" +
                    (String(plannerSettingsSelectedPredictionTab || "").trim()
                      ? ""
                      : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                  }
                  onClick={planner.deletePlannerPredictionByTab}
                  disabled={
                    !String(plannerSettingsSelectedPredictionTab || "").trim()
                  }
                >
                  حذف حسب التبويب
                </button>
                <button
                  type="button"
                  className={
                    "nogaPlanner_coursesMiniBarBtn" +
                    (predictionFieldEntries.length > 0
                      ? ""
                      : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                  }
                  onClick={planner.deleteAllPlannerPredictionFields}
                  disabled={predictionFieldEntries.length === 0}
                >
                  حذف كل الحقول
                </button>
              </div>
              <label className="nogaPlanner_selectSettingsField">
                <span>التبويب</span>
                <select
                  id="nogaPlanner_selectSettingsSelect_predictionTab"
                  value={String(
                    plannerSettingsSelectedPredictionTab || "",
                  ).trim()}
                  onChange={(event) =>
                    planner.selectPlannerPredictionTab(event.target.value)
                  }
                >
                  <option value="">اختر تبويباً</option>
                  {predictionTabs.map((tabName) => (
                    <option key={`prediction-tab-${tabName}`} value={tabName}>
                      {tabName}
                    </option>
                  ))}
                </select>
              </label>
              <ul id="nogaPlanner_selectSettingsList_prediction" className="nogaPlanner_selectSettingsRelationshipsList">
                {predictionFieldEntries.length > 0 ? (
                  predictionFieldEntries.map((entry) => (
                    <li
                      key={`prediction-field-${entry.fieldId}`}
                      className={
                        "nogaPlanner_selectSettingsRelationshipItem" +
                        (String(
                          plannerSettingsSelectedPredictionFieldId || "",
                        ).trim() === entry.fieldId
                          ? " nogaPlanner_selectSettingsItem--selected"
                          : "")
                      }
                      onClick={() =>
                        planner.selectPlannerPredictionField(entry.fieldId)
                      }
                    >
                      <div className="nogaPlanner_selectSettingsRelationshipBody">
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          {entry.fieldId}
                        </span>
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          {entry.list.length} إدخال
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="nogaPlanner_selectSettingsRelationshipItem nogaPlanner_selectSettingsRelationshipItem--empty">
                    <div className="nogaPlanner_selectSettingsRelationshipBody nogaPlanner_selectSettingsRelationshipBody--empty">
                      <span className="nogaPlanner_selectSettingsRelationshipText">
                        لا يوجد أي إدخال
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
              ) : null}
            </div>
          </div>
          <aside id="nogaPlanner_selectSettingsAside" className="nogaPlanner_selectSettingsAside">
            <ul id="nogaPlanner_selectSettingsAsideList" className="nogaPlanner_selectSettingsAsideList">
              {settingsSectionEntries.map((section) => (
                <li
                  id={`nogaPlanner_selectSettingsAsideItem_${section.key}`}
                  key={`settings-aside-${section.key}`}
                >
                  <button
                    id={`nogaPlanner_selectSettingsAsideBtn_${section.key}`}
                    type="button"
                    className={
                      "nogaPlanner_selectSettingsAsideBtn" +
                      (activeSettingsSection === section.key
                        ? " nogaPlanner_selectSettingsAsideBtn--active"
                        : "")
                    }
                    onClick={() => setActiveSettingsSection(section.key)}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
      </div>
    </div>
  );
};

export default NogaPlannerSettings;
