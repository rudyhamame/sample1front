import React, { useEffect, useMemo, useState } from "react";

const areSimpleDraftValuesEqual = (left = {}, right = {}) =>
  JSON.stringify(left || {}) === JSON.stringify(right || {});

const parsePanelDateValue = (value) => {
  if (!value) {
    return null;
  }
  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
};

const getDayStart = (value) => {
  const nextDate = parsePanelDateValue(value);
  if (!nextDate) {
    return null;
  }
  return new Date(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate(),
    12,
    0,
    0,
    0,
  );
};

const formatCalendarDayLabel = (value) =>
  value.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatStudyPlanReportDate = (value) => {
  const nextDate = parsePanelDateValue(value);
  if (!nextDate) {
    return "";
  }
  return nextDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};


const normalizeComponentClassKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const NogaPlannerStudyPlanPanel = ({ planner, runtime }) => {
  const {
    NOGAPLANNER_TEXT,
    getPlannerDefaultFieldsForForm,
    buildPlannerStudyPlanTimeline,
  } = runtime;
  const PLAN_TEXT = NOGAPLANNER_TEXT.studyPlan;
  const STUDY_PLAN_LABELS = NOGAPLANNER_TEXT.registryLabels.studyPlanAid;
  const STUDY_PLAN_OPTIONS = NOGAPLANNER_TEXT.selectsOptions.common;
  const studyPlanFieldConfigs = getPlannerDefaultFieldsForForm("studyPlanAid");
  const studyPlanFieldMap = new Map(
    studyPlanFieldConfigs.map((fieldConfig) => [
      fieldConfig.fieldName,
      fieldConfig,
    ]),
  );

  const courses = Array.isArray(planner.state?.courses)
    ? planner.state.courses
    : [];
  const lectures = Array.isArray(planner.state?.lectures)
    ? planner.state.lectures
    : [];
  const profile = planner.props?.state?.profile || planner.props?.state || {};
  const studyPlanAid =
    planner.getPlannerStudyPlanAid() &&
    typeof planner.getPlannerStudyPlanAid() === "object"
      ? planner.getPlannerStudyPlanAid()
      : {};
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [selectedLectureId, setSelectedLectureId] = useState("");
  const selectedAttendanceComponentKey = String(
    planner.state?.studyPlanAttendanceComponentKey || "all",
  );
  const attendanceExcludeMode = Boolean(
    planner.state?.studyPlanAttendanceExcludeMode,
  );
  const excludedAttendanceDates = Array.isArray(
    planner.state?.studyPlanExcludedAttendanceDates,
  )
    ? planner.state.studyPlanExcludedAttendanceDates
    : [];
  const [selectedReportComponentKey, setSelectedReportComponentKey] = useState("");
  const intervalDraft = planner.state?.studyPlanIntervalDraft || {
    componentClass: "",
    startDate: "",
    endDate: "",
  };
  const [componentDraft, setComponentDraft] = useState({
    targetHours: "",
    difficulty: "",
    mastery: "",
    priority: "",
    dailyHoursCap: "",
    note: "",
  });
  const [lectureDraft, setLectureDraft] = useState({
    lectureTargetHours: "",
    lectureDifficulty: "",
    lectureMastery: "",
    lecturePriority: "",
    lectureNote: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const defaultsDraft = studyPlanAid.defaults;

  const timeline = useMemo(
    () =>
      buildPlannerStudyPlanTimeline({
        courses,
        lectures,
        profile,
        studyPlanAid,
      }),
    [courses, lectures, profile, studyPlanAid, buildPlannerStudyPlanTimeline],
  );
  const plannedLectureIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(studyPlanAid?.dayPlans) ? studyPlanAid.dayPlans : [])
          .flatMap((dayPlan) =>
            Array.isArray(dayPlan?.lectureIds) ? dayPlan.lectureIds : [],
          )
          .map((lectureId) => String(lectureId || "").trim())
          .filter(Boolean),
      ),
    [studyPlanAid],
  );
  const lectureRows = useMemo(
    () =>
      timeline.rows.filter(
        (row) =>
          row.rowType === "lecture" &&
          plannedLectureIdSet.has(String(row.lectureId || "").trim()),
      ),
    [timeline.rows, plannedLectureIdSet],
  );
  const visibleTimelineRows = lectureRows;
  const componentRows = useMemo(
    () =>
      Array.from(
        new Map(
          lectureRows.map((row) => [String(row.componentId || "").trim(), row]),
        ).values(),
      ),
    [lectureRows],
  );
  const selectableCourses = Array.from(
    new Map(
      componentRows.map((row) => [
        row.courseId,
        courses.find(
          (courseEntry) =>
            String(courseEntry?._id || "").trim() === row.courseId,
        ),
      ]),
    ).entries(),
  )
    .map(([, courseEntry]) => courseEntry)
    .filter(Boolean);

  useEffect(() => {
    if (!selectedCourseId && componentRows.length > 0) {
      setSelectedCourseId(componentRows[0].courseId);
    }
  }, [componentRows, selectedCourseId]);

  const selectedCourseRows = componentRows.filter(
    (row) => row.courseId === selectedCourseId,
  );

  useEffect(() => {
    if (
      selectedCourseRows.length > 0 &&
      !selectedCourseRows.some((row) => row.componentId === selectedComponentId)
    ) {
      setSelectedComponentId(selectedCourseRows[0].componentId);
    }
  }, [selectedCourseRows, selectedComponentId]);

  const selectedLectureRows = lectureRows.filter(
    (row) =>
      row.courseId === selectedCourseId &&
      row.componentId === selectedComponentId,
  );

  useEffect(() => {
    if (
      selectedLectureRows.length > 0 &&
      !selectedLectureRows.some((row) => row.lectureId === selectedLectureId)
    ) {
      setSelectedLectureId(selectedLectureRows[0].lectureId);
    }
    if (selectedLectureRows.length === 0 && selectedLectureId) {
      setSelectedLectureId("");
    }
  }, [selectedLectureRows, selectedLectureId]);

  useEffect(() => {
    const selectedComponentPlan = studyPlanAid.coursePlans
      .find((coursePlan) => coursePlan.courseId === selectedCourseId)
      ?.componentPlans.find(
        (componentPlan) => componentPlan.componentId === selectedComponentId,
      );

    const nextComponentDraft = {
      targetHours:
        selectedComponentPlan?.targetHours !== undefined
          ? String(selectedComponentPlan.targetHours)
          : "",
      difficulty: String(selectedComponentPlan?.difficulty || "").trim(),
      mastery: String(selectedComponentPlan?.mastery || "").trim(),
      priority: String(selectedComponentPlan?.priority || "").trim(),
      dailyHoursCap:
        selectedComponentPlan?.dailyHoursCap !== undefined
          ? String(selectedComponentPlan.dailyHoursCap)
          : "",
      note: String(selectedComponentPlan?.note || "").trim(),
    };
    setComponentDraft((currentDraft) =>
      areSimpleDraftValuesEqual(currentDraft, nextComponentDraft)
        ? currentDraft
        : nextComponentDraft,
    );
  }, [studyPlanAid.coursePlans, selectedCourseId, selectedComponentId]);

  useEffect(() => {
    const selectedLectureOverride = studyPlanAid.coursePlans
      .find((coursePlan) => coursePlan.courseId === selectedCourseId)
      ?.componentPlans.find(
        (componentPlan) => componentPlan.componentId === selectedComponentId,
      )
      ?.lectureOverrides.find(
        (lectureOverride) => lectureOverride.lectureId === selectedLectureId,
      );

    const nextLectureDraft = {
      lectureTargetHours:
        selectedLectureOverride?.targetHours !== undefined
          ? String(selectedLectureOverride.targetHours)
          : "",
      lectureDifficulty: String(
        selectedLectureOverride?.difficulty || "",
      ).trim(),
      lectureMastery: String(selectedLectureOverride?.mastery || "").trim(),
      lecturePriority: String(selectedLectureOverride?.priority || "").trim(),
      lectureNote: String(selectedLectureOverride?.note || "").trim(),
    };
    setLectureDraft((currentDraft) =>
      areSimpleDraftValuesEqual(currentDraft, nextLectureDraft)
        ? currentDraft
        : nextLectureDraft,
    );
  }, [
    studyPlanAid.coursePlans,
    selectedCourseId,
    selectedComponentId,
    selectedLectureId,
  ]);

  const selectedComponentRow =
    componentRows.find((row) => row.componentId === selectedComponentId) ||
    null;
  const selectedLectureRow =
    lectureRows.find((row) => row.lectureId === selectedLectureId) || null;
  const globalDailyCap = Number(studyPlanAid?.defaults?.defaultDailyHours) || 0;
  const componentDailyCap = Number(selectedComponentRow?.dailyHoursCap) || 0;
  const lectureDailyCap = Number(selectedLectureRow?.dailyHoursCap) || 0;
  const planIntervals = Array.isArray(studyPlanAid?.intervals)
    ? studyPlanAid.intervals
    : [];
  const attendanceEntries = planIntervals.map((entry) => ({
    component_class: String(entry?.componentClass || "").trim(),
    start_date: String(entry?.startDate || "").trim(),
    end_date: String(entry?.endDate || "").trim(),
  }));
  const finalExamEntries = [];
  const profileComponentsClass = Array.from(
    new Set(
      (Array.isArray(profile?.studying?.componentsClass)
        ? profile.studying.componentsClass
        : [profile?.studying?.componentsClass]
      )
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const attendanceComponentMap = useMemo(
    () =>
      attendanceEntries.reduce((accumulator, entry) => {
        const componentClassKey = normalizeComponentClassKey(
          entry?.component_class,
        );
        if (!componentClassKey) {
          return accumulator;
        }
        const currentStart = getDayStart(entry?.start_date);
        const currentEnd = getDayStart(entry?.end_date || entry?.start_date);
        const existingEntry = accumulator.get(componentClassKey) || {
          startDate: null,
          endDate: null,
        };
        accumulator.set(componentClassKey, {
          startDate:
            !existingEntry.startDate ||
            (currentStart &&
              currentStart.getTime() < existingEntry.startDate.getTime())
              ? currentStart
              : existingEntry.startDate,
          endDate:
            !existingEntry.endDate ||
            (currentEnd && currentEnd.getTime() > existingEntry.endDate.getTime())
              ? currentEnd
              : existingEntry.endDate,
        });
        return accumulator;
      }, new Map()),
    [attendanceEntries],
  );
  const attendanceScheduleRows = useMemo(
    () =>
      componentRows.map((row) => {
        const attendanceEntry =
          attendanceComponentMap.get(
            normalizeComponentClassKey(row.componentName),
          ) || null;
        return {
          ...row,
          attendanceStartDate: attendanceEntry?.startDate
            ? attendanceEntry.startDate.toISOString()
            : "",
          attendanceEndDate: attendanceEntry?.endDate
            ? attendanceEntry.endDate.toISOString()
            : "",
        };
      }),
    [attendanceComponentMap, componentRows],
  );
  const attendanceComponentTabs = useMemo(() => {
    const tabs = [{ key: "all", label: "All" }];
    profileComponentsClass.forEach((componentClassLabel) => {
      const key = normalizeComponentClassKey(componentClassLabel);
      const label = String(componentClassLabel || "").trim();
      if (!key || !label || tabs.some((tab) => tab.key === key)) {
        return;
      }
      tabs.push({ key, label });
    });
    return tabs;
  }, [profileComponentsClass]);

  useEffect(() => {
    if (
      attendanceComponentTabs.some(
        (tabEntry) => tabEntry.key === selectedAttendanceComponentKey,
      )
    ) {
      return;
    }
    planner.setStudyPlanAttendanceComponentKey?.("all");
  }, [attendanceComponentTabs, selectedAttendanceComponentKey, planner]);
  useEffect(() => {
    if (!intervalDraft.componentClass && attendanceComponentTabs.length > 1) {
      planner.setStudyPlanIntervalDraft?.({
        componentClass: attendanceComponentTabs[1].label,
      });
    }
  }, [attendanceComponentTabs, intervalDraft.componentClass, planner]);

  const attendanceIntervalDays = useMemo(() => {
    const scopedEntries =
      selectedAttendanceComponentKey === "all"
        ? attendanceEntries
        : attendanceEntries.filter(
            (entry) =>
              normalizeComponentClassKey(entry?.component_class) ===
              selectedAttendanceComponentKey,
          );

    const earliestAttendanceDate = scopedEntries
      .map((entry) => getDayStart(entry?.start_date))
      .filter(Boolean)
      .sort((leftDate, rightDate) => leftDate.getTime() - rightDate.getTime())[0];

    const latestAttendanceDate = scopedEntries
      .map((entry) => getDayStart(entry?.end_date || entry?.start_date))
      .filter(Boolean)
      .sort((leftDate, rightDate) => rightDate.getTime() - leftDate.getTime())[0];

    if (!earliestAttendanceDate || !latestAttendanceDate) {
      return [];
    }

    const totalDays = Math.max(
      0,
      Math.floor(
        (latestAttendanceDate.getTime() - earliestAttendanceDate.getTime()) /
          86400000,
      ),
    );

    return Array.from({ length: totalDays + 1 }, (_, index) => {
      const currentDate = new Date(earliestAttendanceDate);
      currentDate.setDate(earliestAttendanceDate.getDate() + index);
      const currentDayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        12,
        0,
        0,
        0,
      );
      const activeComponentClasses = scopedEntries
        .filter((entry) => {
          const entryStart = getDayStart(entry?.start_date);
          const entryEnd = getDayStart(entry?.end_date || entry?.start_date);
          if (!entryStart || !entryEnd) {
            return false;
          }
          return (
            currentDayStart.getTime() >= entryStart.getTime() &&
            currentDayStart.getTime() <= entryEnd.getTime()
          );
        })
        .map((entry) => String(entry?.component_class || "").trim())
        .filter(Boolean);
      return {
        dayNumber: index + 1,
        isoDate: currentDate.toISOString(),
        weekday: currentDate.toLocaleDateString(undefined, { weekday: "short" }),
        componentClasses: Array.from(new Set(activeComponentClasses)),
      };
    });
  }, [attendanceEntries, selectedAttendanceComponentKey]);
  const attendanceWeekRows = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(attendanceIntervalDays.length / 7) },
        (_, index) => ({
          weekNumber: index + 1,
          days: attendanceIntervalDays.slice(index * 7, index * 7 + 7),
        }),
      ),
    [attendanceIntervalDays],
  );
  const componentTimeReportRows = useMemo(() => {
    const reportRowsByKey = new Map();
    profileComponentsClass.forEach((componentClassLabel) => {
      const key = normalizeComponentClassKey(componentClassLabel);
      if (!key) {
        return;
      }
      reportRowsByKey.set(key, {
        key,
        label: componentClassLabel,
        attendanceStartDate: null,
        attendanceEndDate: null,
        attendanceTotalDays: 0,
        examStartDate: null,
        examEndDate: null,
        midExamDates: [],
        finalExamDate: null,
      });
    });

    attendanceEntries.forEach((entry) => {
      const entryKey = normalizeComponentClassKey(entry?.component_class);
      const reportRow = reportRowsByKey.get(entryKey) || null;
      const startDate = getDayStart(entry?.start_date);
      const endDate = getDayStart(entry?.end_date || entry?.start_date);
      if (!reportRow || !startDate || !endDate) {
        return;
      }
      if (
        !reportRow.attendanceStartDate ||
        startDate.getTime() < reportRow.attendanceStartDate.getTime()
      ) {
        reportRow.attendanceStartDate = startDate;
      }
      if (
        !reportRow.attendanceEndDate ||
        endDate.getTime() > reportRow.attendanceEndDate.getTime()
      ) {
        reportRow.attendanceEndDate = endDate;
      }
    });

    finalExamEntries.forEach((entry) => {
      const entryKey = normalizeComponentClassKey(entry?.component_class);
      const reportRow = reportRowsByKey.get(entryKey) || null;
      const startDate = getDayStart(entry?.start_date);
      const endDate = getDayStart(entry?.end_date || entry?.start_date);
      if (!reportRow || !startDate || !endDate) {
        return;
      }
      if (
        !reportRow.examStartDate ||
        startDate.getTime() < reportRow.examStartDate.getTime()
      ) {
        reportRow.examStartDate = startDate;
      }
      if (
        !reportRow.examEndDate ||
        endDate.getTime() > reportRow.examEndDate.getTime()
      ) {
        reportRow.examEndDate = endDate;
      }
      if (
        !reportRow.finalExamDate ||
        endDate.getTime() > reportRow.finalExamDate.getTime()
      ) {
        reportRow.finalExamDate = endDate;
      }
    });

    courses.forEach((courseEntry) => {
      const examEntries = Array.isArray(courseEntry?.course_exams)
        ? courseEntry.course_exams
        : [];
      examEntries.forEach((examEntry) => {
        const examType = String(
          examEntry?.type || examEntry?.exam_type || "",
        ).toLowerCase();
        if (!examType.includes("mid")) {
          return;
        }
        const componentLabel =
          String(
            examEntry?.componentType || examEntry?.course_class || "",
          ).trim() || String(courseEntry?.course_class || "").trim();
        const reportRow =
          reportRowsByKey.get(normalizeComponentClassKey(componentLabel)) || null;
        const midExamDate = parsePanelDateValue(
          examEntry?.exam_date || examEntry?.date,
        );
        if (!reportRow || !midExamDate) {
          return;
        }
        reportRow.midExamDates.push(midExamDate);
      });
    });

    return Array.from(reportRowsByKey.values())
      .map((reportRow) => ({
        ...reportRow,
        attendanceTotalDays:
          reportRow.attendanceStartDate && reportRow.attendanceEndDate
            ? Math.max(
                0,
                Math.floor(
                  (reportRow.attendanceEndDate.getTime() -
                    reportRow.attendanceStartDate.getTime()) /
                    86400000,
                ) + 1,
              )
            : 0,
        midExamDates: reportRow.midExamDates.sort(
          (leftDate, rightDate) => leftDate.getTime() - rightDate.getTime(),
        ),
      }))
      .sort((leftRow, rightRow) => leftRow.label.localeCompare(rightRow.label));
  }, [attendanceEntries, courses, finalExamEntries, profileComponentsClass]);

  useEffect(() => {
    if (
      selectedReportComponentKey &&
      componentTimeReportRows.some((entry) => entry.key === selectedReportComponentKey)
    ) {
      return;
    }
    setSelectedReportComponentKey(componentTimeReportRows[0]?.key || "");
  }, [componentTimeReportRows, selectedReportComponentKey]);
  const selectedReportRow =
    componentTimeReportRows.find((entry) => entry.key === selectedReportComponentKey) ||
    null;

  const renderRegistryControl = ({
    fieldName,
    value,
    onChange,
    disabled = false,
    placeholderOverride = "",
  }) => {
    const fieldConfig = studyPlanFieldMap.get(fieldName);
    if (!fieldConfig) {
      return null;
    }
    const fieldValue = String(value ?? "");
    return (
      <label
        key={fieldName}
        className="nogaPlanner_studyPlanField"
        htmlFor={fieldConfig.id}
      >
        <span>{fieldConfig.label}</span>
        {fieldConfig.element === "select" ? (
          <select
            id={fieldConfig.id}
            value={fieldValue}
            onChange={(event) => onChange(event.target.value)}
            className="nogaPlanner_savedCoursesDetailsInput"
            disabled={disabled}
          >
            <option value="" disabled>
              {placeholderOverride || fieldConfig.label}
            </option>
            {(Array.isArray(fieldConfig.options)
              ? fieldConfig.options
              : []
            ).map((optionValue) => (
              <option key={`${fieldName}-${optionValue}`} value={optionValue}>
                {optionValue}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fieldConfig.id}
            type={fieldConfig.inputType || "text"}
            value={fieldValue}
            onChange={(event) => onChange(event.target.value)}
            className="nogaPlanner_savedCoursesDetailsInput"
            placeholder={placeholderOverride || fieldConfig.label}
            disabled={disabled}
          />
        )}
      </label>
    );
  };

  const handleSave = async () => {
    const nextStudyPlanAid = {
      ...(studyPlanAid && typeof studyPlanAid === "object" ? studyPlanAid : {}),
      intervals: Array.isArray(studyPlanAid?.intervals)
        ? studyPlanAid.intervals
        : [],
    };

    if (selectedCourseId && selectedComponentId) {
      const nextCoursePlans = Array.isArray(nextStudyPlanAid.coursePlans)
        ? [...nextStudyPlanAid.coursePlans]
        : [];
      let coursePlanIndex = nextCoursePlans.findIndex(
        (coursePlan) => coursePlan.courseId === selectedCourseId,
      );
      if (coursePlanIndex === -1) {
        nextCoursePlans.push({
          courseId: selectedCourseId,
          note: "",
          componentPlans: [],
        });
        coursePlanIndex = nextCoursePlans.length - 1;
      }

      const nextCoursePlan = {
        ...nextCoursePlans[coursePlanIndex],
        componentPlans: Array.isArray(
          nextCoursePlans[coursePlanIndex]?.componentPlans,
        )
          ? [...nextCoursePlans[coursePlanIndex].componentPlans]
          : [],
      };
      let componentPlanIndex = nextCoursePlan.componentPlans.findIndex(
        (componentPlan) => componentPlan.componentId === selectedComponentId,
      );
      if (componentPlanIndex === -1) {
        nextCoursePlan.componentPlans.push({
          componentId: selectedComponentId,
          lectureOverrides: [],
        });
        componentPlanIndex = nextCoursePlan.componentPlans.length - 1;
      }

      const nextComponentPlan = {
        ...nextCoursePlan.componentPlans[componentPlanIndex],
        componentId: selectedComponentId,
        targetHours: Number(componentDraft.targetHours) || 0,
        difficulty: componentDraft.difficulty,
        mastery: componentDraft.mastery,
        priority: componentDraft.priority,
        dailyHoursCap: Number(componentDraft.dailyHoursCap) || 0,
        note: componentDraft.note,
        lectureOverrides: Array.isArray(
          nextCoursePlan.componentPlans[componentPlanIndex]?.lectureOverrides,
        )
          ? [
              ...nextCoursePlan.componentPlans[componentPlanIndex]
                .lectureOverrides,
            ]
          : [],
      };

      if (selectedLectureId) {
        const nextLectureOverride = {
          lectureId: selectedLectureId,
          targetHours: Number(lectureDraft.lectureTargetHours) || 0,
          difficulty: lectureDraft.lectureDifficulty,
          mastery: lectureDraft.lectureMastery,
          priority: lectureDraft.lecturePriority,
          note: lectureDraft.lectureNote,
        };
        const shouldKeepLectureOverride = Boolean(
          nextLectureOverride.targetHours ||
          nextLectureOverride.difficulty ||
          nextLectureOverride.mastery ||
          nextLectureOverride.priority ||
          nextLectureOverride.note,
        );
        const lectureOverrideIndex =
          nextComponentPlan.lectureOverrides.findIndex(
            (lectureOverride) =>
              lectureOverride.lectureId === selectedLectureId,
          );
        if (shouldKeepLectureOverride) {
          if (lectureOverrideIndex === -1) {
            nextComponentPlan.lectureOverrides.push(nextLectureOverride);
          } else {
            nextComponentPlan.lectureOverrides[lectureOverrideIndex] =
              nextLectureOverride;
          }
        } else if (lectureOverrideIndex !== -1) {
          nextComponentPlan.lectureOverrides.splice(lectureOverrideIndex, 1);
        }
      }

      nextCoursePlan.componentPlans[componentPlanIndex] = nextComponentPlan;
      nextCoursePlans[coursePlanIndex] = nextCoursePlan;
      nextStudyPlanAid.coursePlans = nextCoursePlans;
    }

    try {
      setIsSaving(true);
      const persistedStudyPlanAid =
        await planner.persistStudyPlanAid(nextStudyPlanAid);
      planner.props.serverReply?.(NOGAPLANNER_TEXT.messages.settingsSaved);
      planner.setPlannerStudyPlanAidState(persistedStudyPlanAid);
    } catch (error) {
      planner.props.serverReply?.(
        String(error?.message || NOGAPLANNER_TEXT.messages.settingsSaveFailed),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowSelection = (row) => {
    setSelectedCourseId(row.courseId);
    setSelectedComponentId(row.componentId);
    setSelectedLectureId(row.lectureId || "");
  };

  const toggleExcludedAttendanceDay = (dayEntry) => {
    if (!attendanceExcludeMode) {
      return;
    }
    const dayKey = String(dayEntry?.isoDate || "").slice(0, 10);
    if (!dayKey) {
      return;
    }
    planner.toggleStudyPlanExcludedDay?.(dayKey);
  };

  return (
    <>
      <section
        id="nogaPlanner_studyPlanTabs"
        className="nogaPlanner_studyPlanTabs"
      >
        <div
          id="nogaPlanner_studyPlanCardsMount"
          className="nogaPlanner_studyPlanCardsMount"
        >
          {attendanceIntervalDays.length === 0 ? (
            <div
              id="nogaPlanner_studyPlanAttendanceEmpty"
              className="nogaPlanner_studyPlanEmptyCard"
            >
              {PLAN_TEXT.noRows}
            </div>
          ) : (
            <div
              id="nogaPlanner_studyPlanAttendanceDaysGrid"
              className="nogaPlanner_studyPlanAttendanceDaysGrid"
            >
              {attendanceWeekRows.map((weekEntry) => (
                <div
                  id={`nogaPlanner_studyPlanAttendanceWeek_${weekEntry.weekNumber}`}
                  key={`attendance-week-${weekEntry.weekNumber}`}
                  className="nogaPlanner_studyPlanAttendanceWeekRow"
                >
                  <span className="nogaPlanner_studyPlanAttendanceWeekLabel">
                    Week {weekEntry.weekNumber}
                  </span>
                  <div className="nogaPlanner_studyPlanAttendanceWeekDays">
                    {weekEntry.days.map((dayEntry) => (
                      <div
                        id={`nogaPlanner_studyPlanAttendanceDay_${dayEntry.dayNumber}`}
                        key={`attendance-day-${dayEntry.dayNumber}`}
                        className={`nogaPlanner_studyPlanAttendanceDaySquare${attendanceExcludeMode && excludedAttendanceDates.includes(String(dayEntry?.isoDate || "").slice(0, 10)) ? " is-excluded" : ""}`}
                        onClick={() => toggleExcludedAttendanceDay(dayEntry)}
                      >
                        <strong className="nogaPlanner_studyPlanCardTitle">
                          Day {dayEntry.dayNumber}
                        </strong>
                        <span className="nogaPlanner_studyPlanCardEyebrow">
                          {dayEntry.weekday}
                        </span>
                        <span className="nogaPlanner_studyPlanCalendarBadge">
                          {String(dayEntry.isoDate).slice(0, 10)}
                        </span>
                        <span className="nogaPlanner_studyPlanAttendanceDayComponents">
                          {Array.isArray(dayEntry.componentClasses) &&
                          dayEntry.componentClasses.length > 0
                            ? dayEntry.componentClasses.join(", ")
                            : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside
          id="nogaPlanner_studyPlanTimeReportAside"
          className="nogaPlanner_studyPlanTimeReportAside"
        >
          <div
            id="nogaPlanner_studyPlanTimeReportHeader"
            className="nogaPlanner_studyPlanTimeReportHeader"
          >
            <strong>Component Classes Time Report</strong>
            <span>Compared with now by component class</span>
          </div>
          {componentTimeReportRows.length === 0 ? (
            <div
              id="nogaPlanner_studyPlanTimeReportEmpty"
              className="nogaPlanner_studyPlanTimeReportEmpty"
            >
              No component dates.
            </div>
          ) : (
            <>
              <label
                htmlFor="nogaPlanner_studyPlanTimeReportComponentClassSelect"
                className="nogaPlanner_studyPlanTimeReportSelectField"
              >
                <span>component_class</span>
                <select
                  id="nogaPlanner_studyPlanTimeReportComponentClassSelect"
                  className="nogaPlanner_savedCoursesDetailsInput"
                  value={selectedReportComponentKey}
                  onChange={(event) =>
                    setSelectedReportComponentKey(event.target.value)
                  }
                >
                  {componentTimeReportRows.map((reportRow) => (
                    <option key={reportRow.key} value={reportRow.key}>
                      {reportRow.label}
                    </option>
                  ))}
                </select>
              </label>
              <div
                id="nogaPlanner_studyPlanTimeReportRows"
                className="nogaPlanner_studyPlanTimeReportRows"
              >
                {selectedReportRow ? (
                  <>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>first day of Attendance</strong>
                      <span>{formatStudyPlanReportDate(selectedReportRow.attendanceStartDate) || "-"}</span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Last day of Attendance</strong>
                      <span>{formatStudyPlanReportDate(selectedReportRow.attendanceEndDate) || "-"}</span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Attendance total days</strong>
                      <span>{selectedReportRow.attendanceTotalDays ? `${selectedReportRow.attendanceTotalDays} day(s)` : "-"}</span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Exam period first day</strong>
                      <span>{formatStudyPlanReportDate(selectedReportRow.examStartDate) || "-"}</span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Exam period last day</strong>
                      <span>{formatStudyPlanReportDate(selectedReportRow.examEndDate) || "-"}</span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Mid-Exam due</strong>
                      <span>
                        {selectedReportRow.midExamDates.length > 0
                          ? selectedReportRow.midExamDates
                              .map((entry) => formatStudyPlanReportDate(entry))
                              .filter(Boolean)
                              .join(" | ")
                          : "-"}
                      </span>
                    </div>
                    <div className="nogaPlanner_studyPlanTimeReportRow">
                      <strong>Final exam due</strong>
                      <span>{formatStudyPlanReportDate(selectedReportRow.finalExamDate) || "-"}</span>
                    </div>
                  </>
                ) : (
                  <div className="nogaPlanner_studyPlanTimeReportRow">
                    <strong>Details</strong>
                    <span>-</span>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </section>
      {selectedComponentRow ? (
        <section
          id="nogaPlanner_studyPlanSummary"
          className="nogaPlanner_studyPlanSummary"
        >
          <span>
            {PLAN_TEXT.resolvedDeadline}:{" "}
            {selectedComponentRow.deadlineDate
              ? String(selectedComponentRow.deadlineDate).slice(0, 10)
              : PLAN_TEXT.deadlineMissing}
          </span>
          <span>
            {PLAN_TEXT.remainingDays}:{" "}
            {selectedComponentRow.remainingDays ?? "-"}
          </span>
          <span>
            {PLAN_TEXT.remainingHours}:{" "}
            {selectedComponentRow.remainingHours}
          </span>
          <span>
            {PLAN_TEXT.todayHoursHint}:{" "}
            {selectedComponentRow.suggestedDailyHours}
          </span>
          <span>
            {STUDY_PLAN_LABELS.defaultDailyHours || "Default Daily Hours"}:{" "}
            {globalDailyCap}
          </span>
          <span>
            {STUDY_PLAN_LABELS.dailyHoursCap || "Daily Cap"}:{" "}
            {componentDailyCap}
          </span>
          <span>
            {STUDY_PLAN_LABELS.lectureDailyHoursCap || "Lecture Daily Cap"}:{" "}
            {selectedLectureId ? lectureDailyCap : "-"}
          </span>
        </section>
      ) : null}
    </>
  );
};

export default NogaPlannerStudyPlanPanel;


