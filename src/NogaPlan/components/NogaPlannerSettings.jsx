import React from "react";

const NogaPlannerSettings = ({ planner, runtime }) => {
  const {
    getPlannerDefaultFieldsForForm,
    getPlannerRegistrySelectOptionsBySettingsKey,
    buildDefaultPlannerWeekdayOptions,
    NOGAPLANNER_WRAPPER_TABS,
    NOGAPLANNER_TEXT,
  } = runtime;
  const SETTINGS_TEXT = NOGAPLANNER_TEXT.settings;
  const SAVED_COURSE_FIELD_TEXT = NOGAPLANNER_TEXT.savedCourses.fields || {};
  const STUDY_PLAN_LABELS = NOGAPLANNER_TEXT.registryLabels.studyPlanAid || {};
  const [activeSettingsSection, setActiveSettingsSection] =
    React.useState("general");
  const [isListAddActionLoading, setIsListAddActionLoading] =
    React.useState(false);
  const [planSettingsDraft, setPlanSettingsDraft] = React.useState({
    defaultDailyHours: "",
    selectedDayDailyHoursCap: "",
  });
  const [isPlanSettingsSaving, setIsPlanSettingsSaving] = React.useState(false);

  const {
    plannerSelectSettings,
    plannerSettingsComponentClassInput,
    plannerSettingsWeekdayInput,
    plannerSettingsHourInput,
    plannerSettingsTermInput,
    plannerSettingsAcademicYearInput,
    plannerSettingsLocationBuildingInput,
    plannerSettingsLocationRoomInput,
    plannerSettingsLectureInstructorInput,
    plannerSettingsLectureWriterInput,
    plannerSettingsLocationRoomBuildingInput,
    plannerSettingsActiveListKey,
    plannerSettingsActiveListMode,
    plannerSettingsDependencySelectID,
    plannerSettingsDependencyIndependentOption,
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
    plannerSettingsEditingLectureInstructorIndex,
    plannerSettingsEditingLectureWriterIndex,
    plannerSettingsSelectedLocationBuildingIndex,
    plannerSettingsSelectedLocationRoomIndex,
    plannerSettingsSelectedLectureInstructorIndex,
    plannerSettingsSelectedLectureWriterIndex,
    plannerSettingsRelationshipDraft,
    plannerSettingsEditingRelationshipId,
    plannerSettingsSelectedRelationshipId,
    plannerSettingsLogoMotionEnabled,
    plannerSettingsVoiceControlEnabled,
    plannerSettingsVoiceDictationEnabled,
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
    plannerSettingsVoiceDictationLetter,
    plannerSettingsVoiceDictationNormalizedLetter,
    plannerSettingsVoiceDictationCondition,
    plannerSettingsSelectedVoiceDictationNormalizationIndex,
    plannerSettingsVoiceCommandEntries,
    plannerSettingsSelectedVoiceCommandIndex,
    plannerSettingsEditingVoiceCommandIndex,
    plannerVoiceCommandCaptureMode,
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
    : getPlannerRegistrySelectOptionsBySettingsKey("componentClassOptions");
  const weekdayOptions = Array.isArray(plannerSelectSettings?.weekdayOptions)
    ? plannerSelectSettings.weekdayOptions
    : buildDefaultPlannerWeekdayOptions();
  const hourOptions = Array.isArray(plannerSelectSettings?.hourOptions)
    ? plannerSelectSettings.hourOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("hourOptions");
  const termOptions = Array.isArray(plannerSelectSettings?.termOptions)
    ? plannerSelectSettings.termOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("termOptions");
  const academicYearOptions = Array.isArray(
    plannerSelectSettings?.academicYearOptions,
  )
    ? plannerSelectSettings.academicYearOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("academicYearOptions");
  const locationBuildingOptions = Array.isArray(
    plannerSelectSettings?.locationBuildingOptions,
  )
    ? plannerSelectSettings.locationBuildingOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("locationBuildingOptions");
  const locationRoomOptions = Array.isArray(
    plannerSelectSettings?.locationRoomOptions,
  )
    ? plannerSelectSettings.locationRoomOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("locationRoomOptions");
  const locationRoomOptionsByBuilding = Array.isArray(
    plannerSelectSettings?.locationRoomOptionsByBuilding,
  )
    ? plannerSelectSettings.locationRoomOptionsByBuilding
    : [];
  const roomOptionsForSelectedBuilding = Array.isArray(locationRoomOptions)
    ? locationRoomOptions
    : [];
  const lectureInstructorOptions = Array.isArray(
    plannerSelectSettings?.lectureInstructorOptions,
  )
    ? plannerSelectSettings.lectureInstructorOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("lectureInstructorOptions");
  const lectureWriterOptions = Array.isArray(
    plannerSelectSettings?.lectureWriterOptions,
  )
    ? plannerSelectSettings.lectureWriterOptions
    : getPlannerRegistrySelectOptionsBySettingsKey("lectureWriterOptions");

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
      options: roomOptionsForSelectedBuilding,
      placeholder: SETTINGS_TEXT.optionGroups.locationRoomOptions.placeholder,
    },
    {
      key: "lectureInstructorOptions",
      label: SETTINGS_TEXT.optionGroups.lectureInstructorOptions.label,
      inputValue: plannerSettingsLectureInstructorInput,
      editingIndex: plannerSettingsEditingLectureInstructorIndex,
      selectedIndex: plannerSettingsSelectedLectureInstructorIndex,
      options: lectureInstructorOptions,
      placeholder:
        SETTINGS_TEXT.optionGroups.lectureInstructorOptions.placeholder,
    },
    {
      key: "lectureWriterOptions",
      label: SETTINGS_TEXT.optionGroups.lectureWriterOptions.label,
      inputValue: plannerSettingsLectureWriterInput,
      editingIndex: plannerSettingsEditingLectureWriterIndex,
      selectedIndex: plannerSettingsSelectedLectureWriterIndex,
      options: lectureWriterOptions,
      placeholder: SETTINGS_TEXT.optionGroups.lectureWriterOptions.placeholder,
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
    lectureInstructorOptions,
    lectureWriterOptions,
  };
  const plannerStudyPlanAid =
    planner.getPlannerStudyPlanAid() &&
    typeof planner.getPlannerStudyPlanAid() === "object"
      ? planner.getPlannerStudyPlanAid()
      : {};
  const selectedStudyPlanDay =
    planner.state?.selectedStudyPlanDay &&
    typeof planner.state.selectedStudyPlanDay === "object"
      ? planner.state.selectedStudyPlanDay
      : null;
  const selectedDayPlan = (Array.isArray(plannerStudyPlanAid?.dayPlans)
    ? plannerStudyPlanAid.dayPlans
    : []
  ).find(
    (dayPlanEntry) =>
      String(dayPlanEntry?.periodType || "").trim() ===
        String(selectedStudyPlanDay?.periodType || "").trim() &&
      String(dayPlanEntry?.groupKey || "").trim() ===
        String(selectedStudyPlanDay?.groupKey || "").trim() &&
      Number(dayPlanEntry?.dayNumber || 0) ===
        Number(selectedStudyPlanDay?.dayNumber || 0),
  );
  const plannerDefaultDailyHoursValue = String(
    plannerStudyPlanAid?.defaults?.defaultDailyHours ?? "",
  ).trim();
  const selectedDayDailyHoursCapValue = String(
    selectedDayPlan?.dailyHoursCap ?? "",
  ).trim();
  const selectedDaySettingsLabel = selectedStudyPlanDay
    ? `${String(
        selectedStudyPlanDay?.label ||
          selectedStudyPlanDay?.groupKey ||
          selectedStudyPlanDay?.periodType ||
          "",
      ).trim()} - day ${Number(selectedStudyPlanDay?.dayNumber || 0)}`
    : "";
  const settingsSectionEntries = [
    { key: "general", label: "General" },
    { key: "plan", label: "Plan" },
    { key: "lists", label: SETTINGS_TEXT.lists },
    { key: "defaults", label: SETTINGS_TEXT.defaults },
    { key: "relationships", label: SETTINGS_TEXT.relationships },
    { key: "voice", label: "Voice Commands" },
    { key: "friend", label: SETTINGS_TEXT.messageFromFriend },
    { key: "prediction", label: "Prediction Tool" },
  ];

  const settingsSectionLabel = String(
    NOGAPLANNER_TEXT?.savedCourses?.plannerSettings || "Settings",
  ).trim();
  const plannerDefaultSectionOptions = Array.from(
    new Set([
      ...(Array.isArray(NOGAPLANNER_WRAPPER_TABS)
        ? NOGAPLANNER_WRAPPER_TABS.map((tabEntry) =>
            String(tabEntry?.label || "").trim(),
          ).filter(Boolean)
        : []),
      settingsSectionLabel,
    ]),
  );
  const plannerDefaultSectionFormKeyMap = {
    Plan: "studyPlanAid",
    Courses: "savedCourse",
    Exams: "exam",
    Lectures: "inlineLecture",
    [settingsSectionLabel]: "settings",
  };
  const selectedDefaultFormKey =
    plannerDefaultSectionFormKeyMap[plannerSettingsDefaultSection] ||
    "savedCourse";

  const plannerDefaultFieldRegistry =
    selectedDefaultFormKey === "settings"
      ? []
      : getPlannerDefaultFieldsForForm(selectedDefaultFormKey);
  const plannerSectionSelectRegistry = [
    ...getPlannerDefaultFieldsForForm("savedCourse"),
    ...getPlannerDefaultFieldsForForm("exam"),
    ...getPlannerDefaultFieldsForForm("inlineLecture"),
    ...getPlannerDefaultFieldsForForm("shared"),
  ].filter(
    (fieldConfig) =>
      String(fieldConfig?.element || "").trim() === "select" &&
      !Boolean(fieldConfig?.read_only),
  );
  const plannerSectionListOptions = plannerSectionSelectRegistry.reduce(
    (accumulator, fieldConfig) => {
      const fieldKey = String(fieldConfig?.key || "").trim();
      if (!fieldKey) {
        return accumulator;
      }
      if (accumulator.some((entry) => entry.key === fieldKey)) {
        return accumulator;
      }
      const selectSettingsKey = String(
        fieldConfig?.selectSettingsKey || "",
      ).trim();
      accumulator.push({
        key: fieldKey,
        label: String(fieldConfig?.label || fieldKey).trim(),
        selectSettingsKey,
        selectID:
          String(fieldConfig?.ID || fieldConfig?.selectID || fieldKey).trim() ||
          fieldKey,
        options: Array.isArray(fieldConfig?.options) ? fieldConfig.options : [],
      });
      return accumulator;
    },
    [],
  );
  const plannerOptionsSelectsEntries = Array.isArray(
    plannerSelectSettings?.optionsSelects,
  )
    ? plannerSelectSettings.optionsSelects
    : [];
  const plannerOptionsSelectsByID = new Map(
    plannerOptionsSelectsEntries
      .map((entry) => ({
        selectID: String(entry?.selectID || "").trim(),
        mode:
          String(entry?.mode || "")
            .trim()
            .toLowerCase() === "dependent"
            ? "dependent"
            : "independent",
        dependencyOptions: Array.isArray(entry?.dependencyOptions)
          ? entry.dependencyOptions
          : [],
      }))
      .filter((entry) => Boolean(entry.selectID))
      .map((entry) => [entry.selectID, entry]),
  );
  const activePlannerSettingsSelectField =
    plannerSectionListOptions.find(
      (entry) => entry.key === plannerSettingsActiveListKey,
    ) ||
    plannerSectionListOptions[0] ||
    null;
  const mappedActiveOptionGroup =
    activePlannerSettingsSelectField?.selectSettingsKey
      ? plannerSettingsOptionGroupByKey.get(
          activePlannerSettingsSelectField.selectSettingsKey,
        )
      : null;
  const activeSelectConfig = plannerOptionsSelectsByID.get(
    String(activePlannerSettingsSelectField?.selectSettingsKey || "").trim(),
  );
  const hasExistingSelectConfig = Boolean(
    String(activeSelectConfig?.selectID || "").trim(),
  );
  const activeListMode =
    String(plannerSettingsActiveListMode || "")
      .trim()
      .toLowerCase() === "dependent"
      ? "dependent"
      : String(activeSelectConfig?.mode || "")
            .trim()
            .toLowerCase() === "dependent"
        ? "dependent"
        : "independent";
  const dependencySelectChoices = plannerSectionListOptions
    .filter(
      (entry) =>
        String(entry?.selectSettingsKey || "").trim() &&
        String(entry?.selectSettingsKey || "").trim() !==
          String(
            activePlannerSettingsSelectField?.selectSettingsKey || "",
          ).trim(),
    )
    .reduce((accumulator, entry) => {
      const value = String(entry?.selectSettingsKey || "").trim();
      if (!value) {
        return accumulator;
      }
      if (accumulator.some((candidate) => candidate.value === value)) {
        return accumulator;
      }
      accumulator.push({
        value,
        label: String(entry.label || entry.selectSettingsKey || "").trim(),
      });
      return accumulator;
    }, []);
  const selectedDependencySelectID = String(
    plannerSettingsDependencySelectID ||
      activeSelectConfig?.dependencyOptions?.[0]?.selectID ||
      "",
  ).trim();
  const selectedDependencyIndependentOption = String(
    plannerSettingsDependencyIndependentOption || "",
  ).trim();
  const selectedDependencyField = plannerSectionListOptions.find(
    (entry) =>
      String(entry?.selectSettingsKey || "").trim() ===
        selectedDependencySelectID ||
      String(entry?.selectID || "").trim() === selectedDependencySelectID ||
      String(entry?.key || "").trim() === selectedDependencySelectID,
  );
  const selectedDependencySelectSettingsKey = String(
    selectedDependencyField?.selectSettingsKey ||
      selectedDependencySelectID ||
      "",
  ).trim();
  const dependencyIndependentOptions = Array.isArray(
    plannerSelectSettings?.[selectedDependencySelectSettingsKey],
  )
    ? plannerSelectSettings[selectedDependencySelectSettingsKey]
    : [];
  const dependencyIndependentOptionChoices = Array.from(
    new Set(
      dependencyIndependentOptions
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const dependencySelectChoicesUnique = Array.from(
    new Map(
      dependencySelectChoices
        .map((entry) => ({
          value: String(entry?.value || "").trim(),
          label: String(entry?.label || "").trim(),
        }))
        .filter((entry) => Boolean(entry.value))
        .map((entry) => [entry.value, entry]),
    ).values(),
  );
  const hasCompleteDependentSelection =
    Boolean(selectedDependencySelectID) &&
    Boolean(selectedDependencyIndependentOption);
  const dependentResolvedOptions =
    activeListMode === "dependent" && hasCompleteDependentSelection
      ? (activeSelectConfig?.dependencyOptions || []).find(
          (entry) =>
            String(entry?.selectID || "").trim() ===
              selectedDependencySelectID &&
            String(entry?.independentOption || "").trim() ===
              selectedDependencyIndependentOption,
        )?.options || []
      : [];
  const activePlannerSettingsOptionGroup = mappedActiveOptionGroup
    ? {
        ...mappedActiveOptionGroup,
        selectSettingsKey: mappedActiveOptionGroup.key,
        selectID:
          activePlannerSettingsSelectField?.ID ||
          activePlannerSettingsSelectField?.selectID ||
          "",
        fieldKey: activePlannerSettingsSelectField?.key || "",
        fieldLabel: activePlannerSettingsSelectField?.label || "",
      }
    : activePlannerSettingsSelectField
      ? {
          key: activePlannerSettingsSelectField.key,
          fieldKey: activePlannerSettingsSelectField.key,
          fieldLabel: activePlannerSettingsSelectField.label,
          selectSettingsKey: "",
          selectID:
            activePlannerSettingsSelectField?.ID ||
            activePlannerSettingsSelectField?.selectID ||
            "",
          options: Array.isArray(activePlannerSettingsSelectField.options)
            ? activePlannerSettingsSelectField.options
            : [],
          inputValue: "",
          editingIndex: -1,
          selectedIndex: -1,
          placeholder: "",
          isReadOnly: true,
        }
      : {
          ...plannerSettingsOptionGroupConfigs[0],
          isReadOnly: false,
        };
  const isActiveListEditable = Boolean(
    activePlannerSettingsOptionGroup?.selectSettingsKey &&
    plannerSettingsOptionGroupByKey.has(
      String(activePlannerSettingsOptionGroup.selectSettingsKey || "").trim(),
    ),
  );
  const isRoomOptionsList =
    String(activePlannerSettingsOptionGroup?.selectSettingsKey || "").trim() ===
    "locationRoomOptions";
  const useLegacyRoomOptionsFlow =
    isRoomOptionsList && activeListMode !== "dependent";
  const hardcodedOptionValues = new Set(
    (Array.isArray(activePlannerSettingsSelectField?.options)
      ? activePlannerSettingsSelectField.options
      : []
    )
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  const activeRenderedOptions =
    activeListMode === "dependent"
      ? dependentResolvedOptions
      : activePlannerSettingsOptionGroup?.options || [];
  const selectedOptionValue = String(
    activeRenderedOptions[
      Number(activePlannerSettingsOptionGroup?.selectedIndex ?? -1)
    ] || "",
  ).trim();
  const selectedOptionIsHardcoded =
    Boolean(selectedOptionValue) &&
    hardcodedOptionValues.has(selectedOptionValue);

  const plannerDefaultFieldsSource =
    selectedDefaultFormKey === "savedCourse"
      ? Object.entries(SAVED_COURSE_FIELD_TEXT).map(([fieldName, label]) => {
          const matchedFieldConfig = plannerDefaultFieldRegistry.find(
            (fieldConfig) => fieldConfig.fieldName === fieldName,
          );
          return (
            matchedFieldConfig || {
              key: `savedCourse.${fieldName}`,
              formKey: "savedCourse",
              fieldName,
              label,
              element: "input",
              inputType: "text",
            }
          );
        })
      : plannerDefaultFieldRegistry;

  const plannerDefaultFields = plannerDefaultFieldsSource.map(
    (fieldConfig) => ({
      ...fieldConfig,
      label:
        selectedDefaultFormKey === "savedCourse"
          ? SAVED_COURSE_FIELD_TEXT?.[fieldConfig.fieldName] ||
            fieldConfig.label
          : fieldConfig.label,
      value: String(
        plannerSelectSettings?.fieldDefaults?.[fieldConfig.key] || "",
      ).trim(),
      options: fieldConfig.selectSettingsKey
        ? plannerOptionsByKey[fieldConfig.selectSettingsKey] || []
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
  );
  const plannerRelationships = Array.isArray(
    plannerSelectSettings?.relationships,
  )
    ? plannerSelectSettings.relationships
    : [];
  const componentRelationshipFieldOptions = [
    { value: "course_classSelection", label: "Component Type" },
    { value: "normativeCourseTerm", label: "Normative Term" },
    { value: "actualCourseTerm", label: "Actual Term" },
    { value: "course_daySelection", label: "Day" },
    { value: "course_timeSelection", label: "Time" },
    { value: "locationBuilding", label: "Building" },
    { value: "locationRoom", label: "Room" },
    { value: "course_grade", label: "Weight" },
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
    if (normalizedFieldName === "locationBuilding") {
      return locationBuildingOptions;
    }
    if (normalizedFieldName === "locationRoom") {
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

  React.useEffect(() => {
    setPlanSettingsDraft({
      defaultDailyHours: plannerDefaultDailyHoursValue,
      selectedDayDailyHoursCap: selectedDayDailyHoursCapValue,
    });
  }, [plannerDefaultDailyHoursValue, selectedDayDailyHoursCapValue]);

  const savePlanSettings = async () => {
    if (isPlanSettingsSaving) {
      return;
    }
    setIsPlanSettingsSaving(true);
    try {
      const nextStudyPlanAid = {
        ...plannerStudyPlanAid,
        defaults: {
          ...(plannerStudyPlanAid?.defaults || {}),
          defaultDailyHours:
            Number(planSettingsDraft.defaultDailyHours) > 0
              ? Number(planSettingsDraft.defaultDailyHours)
              : 0,
        },
      };
      if (
        selectedStudyPlanDay?.periodType &&
        selectedStudyPlanDay?.groupKey &&
        Number(selectedStudyPlanDay?.dayNumber || 0) > 0
      ) {
        const nextDayPlans = Array.isArray(nextStudyPlanAid?.dayPlans)
          ? [...nextStudyPlanAid.dayPlans]
          : [];
        const selectedDayPlanIndex = nextDayPlans.findIndex(
          (dayPlanEntry) =>
            String(dayPlanEntry?.periodType || "").trim() ===
              String(selectedStudyPlanDay.periodType || "").trim() &&
            String(dayPlanEntry?.groupKey || "").trim() ===
              String(selectedStudyPlanDay.groupKey || "").trim() &&
            Number(dayPlanEntry?.dayNumber || 0) ===
              Number(selectedStudyPlanDay.dayNumber || 0),
        );
        const nextDayPlan =
          selectedDayPlanIndex >= 0
            ? {
                ...nextDayPlans[selectedDayPlanIndex],
                lectureIds: Array.isArray(
                  nextDayPlans[selectedDayPlanIndex]?.lectureIds,
                )
                  ? [...nextDayPlans[selectedDayPlanIndex].lectureIds]
                  : [],
              }
            : {
                periodType: String(selectedStudyPlanDay.periodType || "").trim(),
                groupKey: String(selectedStudyPlanDay.groupKey || "").trim(),
                label: String(selectedStudyPlanDay.label || "").trim(),
                dayNumber: Number(selectedStudyPlanDay.dayNumber || 0),
                lectureIds: [],
              };
        nextDayPlan.dailyHoursCap =
          Number(planSettingsDraft.selectedDayDailyHoursCap) > 0
            ? Number(planSettingsDraft.selectedDayDailyHoursCap)
            : 0;
        if (selectedDayPlanIndex >= 0) {
          nextDayPlans[selectedDayPlanIndex] = nextDayPlan;
        } else {
          nextDayPlans.push(nextDayPlan);
        }
        nextStudyPlanAid.dayPlans = nextDayPlans;
      }
      await planner.persistStudyPlanAid(nextStudyPlanAid);
      planner.props.serverReply("Plan settings saved.");
    } catch (error) {
      planner.props.serverReply(
        String(error?.message || "Failed to save plan settings."),
      );
    } finally {
      setIsPlanSettingsSaving(false);
    }
  };

  return (
    <div
      id="nogaPlanner_selectSettingsPanel"
      className="nogaPlanner_selectSettingsPanel"
    >
      <div
        id="nogaPlanner_selectSettingsHeader"
        className="nogaPlanner_selectSettingsHeader"
      >
        <span
          id="nogaPlanner_selectSettingsTitle"
          className="nogaPlanner_selectSettingsTitle"
        >
          {SETTINGS_TEXT.title}
        </span>
      </div>
      <div
        id="nogaPlanner_selectSettingsContent"
        className="nogaPlanner_selectSettingsContent"
      >
        <div
          id="nogaPlanner_selectSettingsMain"
          className="nogaPlanner_selectSettingsMain"
        >
          {activeSettingsSection === "general" ? (
            <div
              id="nogaPlanner_selectSettingsFields_general"
              className="nogaPlanner_selectSettingsFields"
            >
              <label
                id="nogaPlanner_selectSettingsRow_logoMotion"
                className="nogaPlanner_selectSettingsCheckboxRow"
              >
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
              <label
                id="nogaPlanner_selectSettingsRow_voiceControl"
                className="nogaPlanner_selectSettingsCheckboxRow"
              >
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
          {activeSettingsSection === "plan" ? (
            <div
              id="nogaPlanner_selectSettingsFields_plan"
              className="nogaPlanner_selectSettingsFields"
            >
              <label className="nogaPlanner_selectSettingsField">
                <span>
                  {STUDY_PLAN_LABELS.defaultDailyHours ||
                    "Default Daily Hours"}
                </span>
                <input
                  id="nogaPlanner_selectSettingsInput_defaultDailyHours"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={String(planSettingsDraft.defaultDailyHours || "")}
                  onChange={(event) =>
                    setPlanSettingsDraft((previousDraft) => ({
                      ...previousDraft,
                      defaultDailyHours: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="nogaPlanner_selectSettingsField">
                <span>
                  {selectedStudyPlanDay
                    ? `Daily cap for the selected day (${selectedDaySettingsLabel})`
                    : "Daily cap for the selected day"}
                </span>
                <input
                  id="nogaPlanner_selectSettingsInput_selectedDayDailyHoursCap"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  type="number"
                  min="0"
                  step="1"
                  value={String(planSettingsDraft.selectedDayDailyHoursCap || "")}
                  disabled={!selectedStudyPlanDay}
                  placeholder={
                    selectedStudyPlanDay
                      ? selectedDaySettingsLabel
                      : "Choose a day from the plan column first"
                  }
                  onChange={(event) =>
                    setPlanSettingsDraft((previousDraft) => ({
                      ...previousDraft,
                      selectedDayDailyHoursCap: event.target.value,
                    }))
                  }
                />
              </label>
              <div
                id="nogaPlanner_selectSettingsActions_plan"
                className="nogaPlanner_selectSettingsActions"
              >
                <button
                  type="button"
                  className={
                    "nogaPlanner_coursesMiniBarBtn" +
                    (isPlanSettingsSaving
                      ? " nogaPlanner_coursesMiniBarBtn--disabledBlack"
                      : "")
                  }
                  onClick={savePlanSettings}
                  disabled={isPlanSettingsSaving}
                >
                  {isPlanSettingsSaving ? "..." : "Save"}
                </button>
              </div>
            </div>
          ) : null}

          <div
            id="nogaPlanner_selectSettingsColumns"
            className="nogaPlanner_selectSettingsColumns"
          >
            {activeSettingsSection === "lists" ? (
              <>
                <div
                  id="nogaPlanner_selectSettingsFields_lists"
                  className="nogaPlanner_selectOptionsFields"
                >
                  <div className="nogaPlanner_selectOptionsFieldGroup">
                    <label className="nogaPlanner_selectOptionsField">
                      <span>{SETTINGS_TEXT.listFieldLabel}</span>
                      <select
                        id="nogaPlanner_selectSettingsSelect_activeListKey"
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={activePlannerSettingsSelectField?.key || ""}
                        disabled={plannerSectionListOptions.length === 0}
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            "plannerSettingsActiveListKey",
                            event.target.value,
                          )
                        }
                      >
                        {plannerSectionListOptions.length === 0 ? (
                          <option value="">
                            {SETTINGS_TEXT.noListsForTab}
                          </option>
                        ) : (
                          <>
                            <option value="" disabled>
                              {SETTINGS_TEXT.chooseListField}
                            </option>
                            {plannerSectionListOptions.map((optionGroup) => (
                              <option
                                key={optionGroup.key}
                                value={optionGroup.key}
                              >
                                {`${optionGroup.label} (${optionGroup.selectID || optionGroup.key})`}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </label>
                    <label className="nogaPlanner_selectOptionsField">
                      <span>{SETTINGS_TEXT.listModeLabel}</span>
                      <select
                        id="nogaPlanner_selectSettingsSelect_listMode"
                        className="nogaPlanner_savedCoursesDetailsInput"
                        value={activeListMode}
                        disabled={hasExistingSelectConfig}
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            "plannerSettingsActiveListMode",
                            event.target.value,
                          )
                        }
                      >
                        <option value="" disabled>
                          {SETTINGS_TEXT.chooseMode}
                        </option>
                        <option value="independent">
                          {SETTINGS_TEXT.modeIndependent}
                        </option>
                        <option value="dependent">
                          {SETTINGS_TEXT.modeDependent}
                        </option>
                      </select>
                    </label>
                    {activeListMode === "dependent" ? (
                      <>
                        <label className="nogaPlanner_selectOptionsField">
                          <span>{SETTINGS_TEXT.dependentSelectLabel}</span>
                          <select
                            id="nogaPlanner_selectSettingsSelect_dependencySelectID"
                            className="nogaPlanner_savedCoursesDetailsInput"
                            value={selectedDependencySelectID}
                            disabled={hasExistingSelectConfig}
                            onChange={(event) =>
                              planner.handlePlannerSettingsInputChange(
                                "plannerSettingsDependencySelectID",
                                event.target.value,
                              )
                            }
                          >
                            <option value="" disabled>
                              {SETTINGS_TEXT.chooseIndependentSelect}
                            </option>
                            {dependencySelectChoicesUnique.map((entry) => (
                              <option
                                key={`dep-${entry.value}`}
                                value={entry.value}
                              >
                                {entry.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="nogaPlanner_selectOptionsField">
                          <span>{SETTINGS_TEXT.dependentOptionLabel}</span>
                          <select
                            id="nogaPlanner_selectSettingsSelect_dependencyIndependentOption"
                            className="nogaPlanner_savedCoursesDetailsInput"
                            value={selectedDependencyIndependentOption}
                            disabled={!selectedDependencySelectID}
                            onChange={(event) =>
                              planner.handlePlannerSettingsInputChange(
                                "plannerSettingsDependencyIndependentOption",
                                event.target.value,
                              )
                            }
                          >
                            <option value="" disabled>
                              {SETTINGS_TEXT.chooseIndependentOption}
                            </option>
                            {dependencyIndependentOptionChoices.map((entry) => (
                              <option key={`dep-opt-${entry}`} value={entry}>
                                {entry}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label className="nogaPlanner_selectOptionsField">
                      <span>{SETTINGS_TEXT.listValueLabel}</span>
                      <input
                        id="nogaPlanner_selectSettingsInput_listValue"
                        className="nogaPlanner_savedCoursesDetailsInput"
                        type="text"
                        value={
                          activePlannerSettingsOptionGroup?.inputValue || ""
                        }
                        onChange={(event) =>
                          planner.handlePlannerSettingsInputChange(
                            activePlannerSettingsOptionGroup.selectSettingsKey ===
                              "componentClassOptions"
                              ? "plannerSettingsComponentClassInput"
                              : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                  "weekdayOptions"
                                ? "plannerSettingsWeekdayInput"
                                : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                    "hourOptions"
                                  ? "plannerSettingsHourInput"
                                  : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                      "termOptions"
                                    ? "plannerSettingsTermInput"
                                    : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                        "academicYearOptions"
                                      ? "plannerSettingsAcademicYearInput"
                                      : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                          "locationBuildingOptions"
                                        ? "plannerSettingsLocationBuildingInput"
                                        : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                            "lectureInstructorOptions"
                                          ? "plannerSettingsLectureInstructorInput"
                                          : activePlannerSettingsOptionGroup.selectSettingsKey ===
                                              "lectureWriterOptions"
                                            ? "plannerSettingsLectureWriterInput"
                                            : "plannerSettingsLocationRoomInput",
                            event.target.value,
                          )
                        }
                        placeholder={
                          activePlannerSettingsOptionGroup?.placeholder || ""
                        }
                        disabled={
                          !isActiveListEditable ||
                          (activeListMode === "dependent" &&
                            !hasCompleteDependentSelection)
                        }
                      />
                    </label>
                  </div>
                  <div
                    id="nogaPlanner_selectSettingsActions_lists"
                    className="nogaPlanner_selectOptionsActions"
                  >
                    {(() => {
                      const isAddDisabled =
                        !isActiveListEditable ||
                        (activeListMode === "dependent" &&
                          !hasCompleteDependentSelection) ||
                        isListAddActionLoading;
                      const isDeleteSelectedDisabled =
                        activePlannerSettingsOptionGroup?.selectedIndex < 0 ||
                        selectedOptionIsHardcoded ||
                        !isActiveListEditable;
                      const isDeleteAllDisabled =
                        activeRenderedOptions.length === 0 ||
                        !isActiveListEditable;
                      const isEditDisabled =
                        activePlannerSettingsOptionGroup?.selectedIndex < 0 ||
                        selectedOptionIsHardcoded ||
                        !isActiveListEditable;
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
                            onClick={async () => {
                              if (isListAddActionLoading) {
                                return;
                              }
                              setIsListAddActionLoading(true);
                              try {
                                if (useLegacyRoomOptionsFlow) {
                                  await planner.addOrUpdatePlannerRoomOption();
                                } else {
                                  await planner.addOrUpdatePlannerSettingsListItem(
                                    activePlannerSettingsOptionGroup.selectSettingsKey,
                                    activePlannerSettingsOptionGroup.selectID,
                                  );
                                }
                              } finally {
                                setIsListAddActionLoading(false);
                              }
                            }}
                            disabled={isAddDisabled}
                          >
                            {isListAddActionLoading
                              ? "..."
                              : activePlannerSettingsOptionGroup?.editingIndex >=
                                  0
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
                              useLegacyRoomOptionsFlow
                                ? planner.deleteSelectedPlannerRoomOption()
                                : planner.deleteSelectedPlannerSettingsListItem(
                                    activePlannerSettingsOptionGroup.selectSettingsKey,
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
                              useLegacyRoomOptionsFlow
                                ? planner.clearPlannerRoomOptions()
                                : planner.clearPlannerSettingsList(
                                    activePlannerSettingsOptionGroup.selectSettingsKey,
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
                              useLegacyRoomOptionsFlow
                                ? planner.editSelectedPlannerRoomOption()
                                : planner.editSelectedPlannerSettingsListItem(
                                    activePlannerSettingsOptionGroup.selectSettingsKey,
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
                </div>

                <div className="nogaPlanner_selectOptionsListWrap">
                  <ul
                    id="nogaPlanner_selectSettingsList_lists"
                    className="nogaPlanner_selectOptionsList"
                  >
                    {activeRenderedOptions.length === 0 ? (
                      <li className="nogaPlanner_selectOptionsItem">
                        <span className="nogaPlanner_selectOptionsItemLabel">
                          {SETTINGS_TEXT.noSavedItems}
                        </span>
                      </li>
                    ) : (
                      activeRenderedOptions.map((optionValue, optionIndex) => {
                        const normalizedOptionValue = String(
                          optionValue || "",
                        ).trim();
                        const isHardcodedOption = hardcodedOptionValues.has(
                          normalizedOptionValue,
                        );
                        return (
                          <li
                            key={`planner-option-${activePlannerSettingsOptionGroup.key}-${optionValue}-${optionIndex}`}
                            className={
                              "nogaPlanner_selectOptionsItem" +
                              (activePlannerSettingsOptionGroup?.selectedIndex ===
                              optionIndex
                                ? " nogaPlanner_selectOptionsItem--selected"
                                : "")
                            }
                            onClick={() =>
                              isActiveListEditable && !isHardcodedOption
                                ? planner.togglePlannerSettingsListItemSelection(
                                    activePlannerSettingsOptionGroup.selectSettingsKey,
                                    optionIndex,
                                  )
                                : null
                            }
                          >
                            <span className="nogaPlanner_selectOptionsItemLabel">
                              {optionValue}
                              {isHardcodedOption
                                ? " (hardcoded - unselectable)"
                                : ""}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </>
            ) : null}
            {activeSettingsSection === "defaults" ? (
              <div
                id="nogaPlanner_selectSettingsFields_defaults"
                className="nogaPlanner_selectSettingsFields"
              >
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
                      "",
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
                  selectedPlannerDefaultField.element === "select" ? (
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
                      <option value="">None</option>
                      {selectedPlannerDefaultField.options.map(
                        (optionValue) => (
                          <option
                            key={`planner-default-option-${selectedPlannerDefaultField.key}-${optionValue}`}
                            value={optionValue}
                          >
                            {optionValue}
                          </option>
                        ),
                      )}
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
                      placeholder="Value"
                    />
                  )
                ) : null}

                <div
                  id="nogaPlanner_selectSettingsActions_defaults"
                  className="nogaPlanner_selectSettingsActions"
                >
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
                            ? "Update"
                            : "Add"}
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
                          Edit
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
                          Delete selected
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
                          Delete all
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
                        No entries
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
            {activeSettingsSection === "relationships" ? (
              <div
                id="nogaPlanner_selectSettingsFields_relationships"
                className="nogaPlanner_selectSettingsFields"
              >
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
                  <option value="innerComponent">Inside component</option>
                  <option value="intercomponent">
                    Between components of the same course (later)
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
                      <option value="">Cause field</option>
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
                      placeholder: "Cause value",
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
                      <option value="">Effect field</option>
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
                      placeholder: "Effect value",
                    })}
                  </>
                ) : (
                  <span className="nogaPlanner_selectSettingsRelationshipText">
                    Nested component relationships will be configured later
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
                  <span>Lock these values in the editor</span>
                </label>
                <div
                  id="nogaPlanner_selectSettingsActions_relationships"
                  className="nogaPlanner_selectSettingsActions"
                >
                  {(() => {
                    const hasSelectedRelationship = Boolean(
                      String(
                        plannerSettingsSelectedRelationshipId || "",
                      ).trim(),
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
                            ? "Update relationship"
                            : "Add"}
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
                          Edit
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
                          Delete selected
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
                          Delete all
                        </button>
                      </>
                    );
                  })()}
                </div>
                <ul
                  id="nogaPlanner_selectSettingsList_defaults"
                  className="nogaPlanner_selectSettingsRelationshipsList"
                >
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
                              ? "Between components of the same course"
                              : "Inside component"}
                          </span>
                          <span className="nogaPlanner_selectSettingsRelationshipText">
                            {relationship.relationScope === "intercomponent"
                              ? "Later"
                              : [
                                  relationship.causeField
                                    ? `Cause: ${componentRelationshipFieldOptions.find((entry) => entry.value === relationship.causeField)?.label || relationship.causeField}`
                                    : "",
                                  relationship.causeValue
                                    ? `Cause value: ${relationship.causeValue}`
                                    : "",
                                  relationship.effectField
                                    ? `Effect: ${componentRelationshipFieldOptions.find((entry) => entry.value === relationship.effectField)?.label || relationship.effectField}`
                                    : "",
                                  relationship.effectValue
                                    ? `Effect value: ${relationship.effectValue}`
                                    : "",
                                  relationship.readOnly ? "Locked" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" • ") || "No extra values"}
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="nogaPlanner_selectSettingsRelationshipItem nogaPlanner_selectSettingsRelationshipItem--empty">
                      <div className="nogaPlanner_selectSettingsRelationshipBody nogaPlanner_selectSettingsRelationshipBody--empty">
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          No entries
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
            {activeSettingsSection === "voice" ? (
              <div
                id="nogaPlanner_selectSettingsFields_voice"
                className="nogaPlanner_selectSettingsFields"
              >
                {(() => {
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
                  const voiceDictationNormalizations = Array.isArray(
                    plannerSelectSettings?.voiceDictationNormalizations,
                  )
                    ? plannerSelectSettings.voiceDictationNormalizations
                    : [];
                  return (
                    <div
                      id="nogaPlanner_selectSettingsVoiceCommandsCard"
                      className="nogaPlanner_selectSettingsVoiceCommandsCard"
                    >
                      <label
                        id="nogaPlanner_selectSettingsRow_voiceDictation"
                        className="nogaPlanner_selectSettingsCheckboxRow"
                      >
                        <input
                          id="nogaPlanner_selectSettingsInput_voiceDictation"
                          type="checkbox"
                          checked={Boolean(
                            plannerSettingsVoiceDictationEnabled,
                          )}
                          onChange={(event) =>
                            planner.handlePlannerSettingsInputChange(
                              "plannerSettingsVoiceDictationEnabled",
                              event.target.checked,
                            )
                          }
                        />
                        <span>
                          Voice dictation:{" "}
                          {plannerSettingsVoiceDictationEnabled
                            ? SETTINGS_TEXT.motionOn
                            : SETTINGS_TEXT.motionOff}
                        </span>
                      </label>
                      <div
                        id="nogaPlanner_selectSettingsActions_voice"
                        className="nogaPlanner_selectSettingsActions"
                      >
                        <button
                          type="button"
                          data-voice-capture-control="true"
                          className={
                            "nogaPlanner_coursesMiniBarBtn" +
                            (plannerVoiceCommandCaptureMode
                              ? ""
                              : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                          }
                          onClick={planner.togglePlannerVoiceCommandCaptureMode}
                        >
                          {plannerVoiceCommandCaptureMode
                            ? "Stop button capture"
                            : "Capture buttons"}
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
                          Edit command
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
                          Delete command
                        </button>
                      </div>
                      <ul
                        id="nogaPlanner_selectSettingsList_voice"
                        className="nogaPlanner_selectSettingsVoiceCommandsList"
                      >
                        {voiceEntries.length > 0 ? (
                          voiceEntries.map((entry, entryIndex) => {
                            const idTreeEntries = Array.isArray(entry?.idTree)
                              ? entry.idTree
                                  .map((treeEntry) =>
                                    String(treeEntry || "").trim(),
                                  )
                                  .filter(Boolean)
                              : [];
                            const elementID =
                              String(
                                entry?.elementID || entry?.button || "-",
                              ).trim() || "-";
                            const elementName =
                              typeof document !== "undefined" &&
                              elementID !== "-"
                                ? String(
                                    document.getElementById(elementID)
                                      ?.textContent || "",
                                  )
                                    .replace(/\s+/g, " ")
                                    .trim()
                                : "";
                            const voiceCommand =
                              String(
                                entry?.voiceCommand || entry?.command || "-",
                              ).trim() || "-";
                            return (
                              <li
                                key={entry?._id || `voice-entry-${entryIndex}`}
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
                                <span>{`idTree: [${idTreeEntries.join(" -> ") || "-"}]`}</span>
                                <span>{`elementID: ${elementID}${elementName ? ` (${elementName})` : ""}`}</span>
                                <span>{`voiceCommand: ${voiceCommand}`}</span>
                              </li>
                            );
                          })
                        ) : (
                          <li>No entries</li>
                        )}
                      </ul>
                      <div
                        id="nogaPlanner_selectSettingsVoiceDictationNormalizerCard"
                        className="nogaPlanner_selectSettingsFields"
                      >
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          Voice dictation normalization
                        </span>
                        <div className="nogaPlanner_selectSettingsRelationshipInlineFields">
                          <input
                            id="nogaPlanner_selectSettingsVoiceDictationLetterInput"
                            className="nogaPlanner_savedCoursesDetailsInput"
                            type="text"
                            value={plannerSettingsVoiceDictationLetter || ""}
                            onChange={(event) =>
                              planner.setState({
                                plannerSettingsVoiceDictationLetter: String(
                                  event?.target?.value || "",
                                ),
                              })
                            }
                            placeholder="Letter"
                          />
                          <input
                            id="nogaPlanner_selectSettingsVoiceDictationNormalizedLetterInput"
                            className="nogaPlanner_savedCoursesDetailsInput"
                            type="text"
                            value={
                              plannerSettingsVoiceDictationNormalizedLetter ||
                              ""
                            }
                            onChange={(event) =>
                              planner.setState({
                                plannerSettingsVoiceDictationNormalizedLetter:
                                  String(event?.target?.value || ""),
                              })
                            }
                            placeholder="Normalized letter"
                          />
                          <select
                            id="nogaPlanner_selectSettingsVoiceDictationConditionSelect"
                            className="nogaPlanner_savedCoursesDetailsInput"
                            value={
                              plannerSettingsVoiceDictationCondition ||
                              "endOfWord"
                            }
                            onChange={(event) =>
                              planner.setState({
                                plannerSettingsVoiceDictationCondition: String(
                                  event?.target?.value || "endOfWord",
                                ),
                              })
                            }
                          >
                            <option value="endOfWord">At end of word</option>
                            <option value="startOfWord">At start of word</option>
                            <option value="anywhere">
                              Anywhere in word
                            </option>
                          </select>
                        </div>
                        <div className="nogaPlanner_selectSettingsActions">
                          <button
                            type="button"
                            className="nogaPlanner_coursesMiniBarBtn"
                            onClick={
                              planner.addPlannerVoiceDictationNormalizationEntry
                            }
                          >
                            Add rule
                          </button>
                          <button
                            type="button"
                            className={
                              "nogaPlanner_coursesMiniBarBtn" +
                              (Number(
                                plannerSettingsSelectedVoiceDictationNormalizationIndex,
                              ) >= 0
                                ? ""
                                : " nogaPlanner_coursesMiniBarBtn--disabledBlack")
                            }
                            onClick={
                              planner.deleteSelectedPlannerVoiceDictationNormalizationEntry
                            }
                            disabled={
                              Number(
                                plannerSettingsSelectedVoiceDictationNormalizationIndex,
                              ) < 0
                            }
                          >
                            Delete rule
                          </button>
                        </div>
                        <ul
                          id="nogaPlanner_selectSettingsList_voiceDictationNormalizations"
                          className="nogaPlanner_selectSettingsVoiceCommandsList"
                        >
                          {voiceDictationNormalizations.length > 0 ? (
                            voiceDictationNormalizations.map(
                              (entry, entryIndex) => (
                                <li
                                  key={`voice-dictation-normalization-${entryIndex}`}
                                  className={
                                    Number(
                                      plannerSettingsSelectedVoiceDictationNormalizationIndex,
                                    ) === entryIndex
                                      ? "nogaPlanner_selectSettingsItem--selected"
                                      : ""
                                  }
                                  onClick={() =>
                                    planner.togglePlannerVoiceDictationNormalizationSelection(
                                      entryIndex,
                                    )
                                  }
                                >
                                  <span>{`Letter: ${String(entry?.letter || "-")} •`}</span>
                                  <span>{`Normalized letter: ${String(entry?.normalizedLetter || "-")} •`}</span>
                                  <span>
                                    {`Condition: ${
                                      String(
                                        entry?.condition || "endOfWord",
                                      ) === "startOfWord"
                                        ? "At start of word"
                                        : String(
                                              entry?.condition || "endOfWord",
                                            ) === "anywhere"
                                          ? "Anywhere in word"
                                          : "At end of word"
                                    }`}
                                  </span>
                                </li>
                              ),
                            )
                          ) : (
                            <li>No entries</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
            {activeSettingsSection === "friend" ? (
              <div
                id="nogaPlanner_selectSettingsFields_friend"
                className="nogaPlanner_selectSettingsFields"
              >
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
                        (username ? `@${username}` : `Friend ${index + 1}`);
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
                    const outgoingList = Array.isArray(
                      messageFriendSettings?.to,
                    )
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
                        placeholder="The selected friend message will appear here"
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
                      <div
                        id="nogaPlanner_selectSettingsActions_friend"
                        className="nogaPlanner_selectSettingsActions"
                      >
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
                      <ul
                        id="nogaPlanner_selectSettingsList_friendTo"
                        className="nogaPlanner_selectSettingsRelationshipsList"
                      >
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
              <div
                id="nogaPlanner_selectSettingsFields_prediction"
                className="nogaPlanner_selectSettingsFields"
              >
                <label
                  id="nogaPlanner_selectSettingsRow_predictionEnabled"
                  className="nogaPlanner_selectSettingsCheckboxRow"
                >
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
                    Enable prediction tool:{" "}
                    {plannerSettingsPredictionToolEnabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
                <div
                  id="nogaPlanner_selectSettingsActions_prediction"
                  className="nogaPlanner_selectSettingsActions"
                >
                  <button
                    type="button"
                    className="nogaPlanner_coursesMiniBarBtn"
                    onClick={planner.savePlannerPredictionToolSettings}
                  >
                    Save
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
                    Delete selected field
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
                    Delete by tab
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
                    Delete all fields
                  </button>
                </div>
                <label className="nogaPlanner_selectSettingsField">
                  <span>Tab</span>
                  <select
                    id="nogaPlanner_selectSettingsSelect_predictionTab"
                    value={String(
                      plannerSettingsSelectedPredictionTab || "",
                    ).trim()}
                    onChange={(event) =>
                      planner.selectPlannerPredictionTab(event.target.value)
                    }
                  >
                    <option value="">Choose a tab</option>
                    {predictionTabs.map((tabName) => (
                      <option key={`prediction-tab-${tabName}`} value={tabName}>
                        {tabName}
                      </option>
                    ))}
                  </select>
                </label>
                <ul
                  id="nogaPlanner_selectSettingsList_prediction"
                  className="nogaPlanner_selectSettingsRelationshipsList"
                >
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
                            {entry.list.length} entries
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="nogaPlanner_selectSettingsRelationshipItem nogaPlanner_selectSettingsRelationshipItem--empty">
                      <div className="nogaPlanner_selectSettingsRelationshipBody nogaPlanner_selectSettingsRelationshipBody--empty">
                        <span className="nogaPlanner_selectSettingsRelationshipText">
                          No entries
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <aside
          id="nogaPlanner_selectSettingsAside"
          className="nogaPlanner_selectSettingsAside"
        >
          <ul
            id="nogaPlanner_selectSettingsAsideList"
            className="nogaPlanner_selectSettingsAsideList"
          >
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


