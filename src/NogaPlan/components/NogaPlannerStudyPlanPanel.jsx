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

const formatRemainingDuration = (targetDate, nowDate) => {
  const parsedTargetDate = parsePanelDateValue(targetDate);
  const parsedNowDate = parsePanelDateValue(nowDate);
  if (!parsedTargetDate || !parsedNowDate) {
    return "Not set";
  }
  const diffMs = parsedTargetDate.getTime() - parsedNowDate.getTime();
  const isPast = diffMs < 0;
  let remainingMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const months = Math.floor(remainingMinutes / (60 * 24 * 30));
  remainingMinutes -= months * 60 * 24 * 30;
  const weeks = Math.floor(remainingMinutes / (60 * 24 * 7));
  remainingMinutes -= weeks * 60 * 24 * 7;
  const days = Math.floor(remainingMinutes / (60 * 24));
  remainingMinutes -= days * 60 * 24;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes - hours * 60;
  const readableDuration = `${months}mo ${weeks}w ${days}d ${hours}h ${minutes}m`;
  return isPast ? `${readableDuration} ago` : readableDuration;
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
    normalizeStudyPlanAid,
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
  const studyPlanAid = normalizeStudyPlanAid(planner.getPlannerStudyPlanAid());
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [selectedLectureId, setSelectedLectureId] = useState("");
  const [activeViewTab, setActiveViewTab] = useState("attendance");
  const [selectedAttendanceComponentKey, setSelectedAttendanceComponentKey] =
    useState("all");
  const [nowDate, setNowDate] = useState(() => new Date());
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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowDate(new Date());
    }, 60000);
    return () => window.clearInterval(timerId);
  }, []);

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
  const attendanceEntries = Array.isArray(
    profile?.studying?.time?.current?.programTerm?.attendanceDate,
  )
    ? profile.studying.time.current.programTerm.attendanceDate
    : [];
  const finalExamEntries = Array.isArray(
    profile?.studying?.time?.current?.programTerm?.examDate,
  )
    ? profile.studying.time.current.programTerm.examDate
    : [];
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
    const tabs = [{ key: "all", label: "All Components" }];
    attendanceEntries.forEach((entry) => {
      const key = normalizeComponentClassKey(entry?.component_class);
      const label = String(entry?.component_class || "").trim();
      if (!key || !label || tabs.some((tab) => tab.key === key)) {
        return;
      }
      tabs.push({ key, label });
    });
    return tabs;
  }, [attendanceEntries]);

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
    const componentLabelById = new Map();
    const componentLabelByKey = new Map();
    const reportRowsByKey = new Map();

    const ensureReportRow = (labelValue) => {
      const label = String(labelValue || "").trim();
      const key = normalizeComponentClassKey(label);
      if (!key) {
        return null;
      }
      if (!reportRowsByKey.has(key)) {
        reportRowsByKey.set(key, {
          key,
          label,
          attendanceDate: null,
          midExamDates: [],
          finalExamDate: null,
        });
      }
      return reportRowsByKey.get(key);
    };

    const getCourseComponents = (courseEntry) =>
      Array.isArray(courseEntry?.course_components)
        ? courseEntry.course_components
        : Array.isArray(courseEntry?.components)
          ? courseEntry.components
          : [];

    courses.forEach((courseEntry) => {
      getCourseComponents(courseEntry).forEach((componentEntry) => {
        const componentLabel = String(
          componentEntry?.component_class ||
            componentEntry?.course_class ||
            componentEntry?.class ||
            componentEntry?.componentType ||
            courseEntry?.course_class ||
            "",
        ).trim();
        if (!componentLabel) {
          return;
        }
        const componentKey = normalizeComponentClassKey(componentLabel);
        const componentId = String(
          componentEntry?._id || componentEntry?.id || "",
        ).trim();
        if (componentId) {
          componentLabelById.set(componentId, componentLabel);
        }
        componentLabelByKey.set(componentKey, componentLabel);
        ensureReportRow(componentLabel);
      });
    });

    attendanceEntries.forEach((entry) => {
      const reportRow = ensureReportRow(entry?.component_class);
      const endDate = getDayStart(entry?.end_date || entry?.start_date);
      if (!reportRow || !endDate) {
        return;
      }
      if (
        !reportRow.attendanceDate ||
        endDate.getTime() > reportRow.attendanceDate.getTime()
      ) {
        reportRow.attendanceDate = endDate;
      }
    });

    finalExamEntries.forEach((entry) => {
      const reportRow = ensureReportRow(entry?.component_class);
      const finalDate = getDayStart(entry?.end_date || entry?.start_date);
      if (!reportRow || !finalDate) {
        return;
      }
      if (
        !reportRow.finalExamDate ||
        finalDate.getTime() > reportRow.finalExamDate.getTime()
      ) {
        reportRow.finalExamDate = finalDate;
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
          ).trim() ||
          componentLabelById.get(String(examEntry?.componentId || "").trim()) ||
          String(courseEntry?.course_class || "").trim();
        const reportRow = ensureReportRow(componentLabel);
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
        label: componentLabelByKey.get(reportRow.key) || reportRow.label,
        midExamDates: reportRow.midExamDates.sort(
          (leftDate, rightDate) => leftDate.getTime() - rightDate.getTime(),
        ),
      }))
      .sort((leftRow, rightRow) => leftRow.label.localeCompare(rightRow.label));
  }, [attendanceEntries, courses, finalExamEntries]);

  const studyCalendarDays = useMemo(() => {
    const earliestAttendanceDate = attendanceEntries
      .map((entry) => getDayStart(entry?.start_date))
      .filter(Boolean)
      .sort((leftDate, rightDate) => leftDate.getTime() - rightDate.getTime())[0];

    const latestExamDate = finalExamEntries
      .map((entry) => getDayStart(entry?.end_date || entry?.start_date))
      .filter(Boolean)
      .sort((leftDate, rightDate) => rightDate.getTime() - leftDate.getTime())[0];

    if (!earliestAttendanceDate || !latestExamDate) {
      return [];
    }

    const lectureNameMap = new Map(
      (Array.isArray(lectures) ? lectures : []).map((lectureEntry) => [
        String(lectureEntry?._id || "").trim(),
        String(
          lectureEntry?.lecture_name ||
            lectureEntry?.lecture_title ||
            lectureEntry?.title ||
            "",
        ).trim(),
      ]),
    );
    const dayPlanMap = (Array.isArray(studyPlanAid?.dayPlans) ? studyPlanAid.dayPlans : [])
      .reduce((accumulator, dayPlanEntry) => {
        const dayNumber = Number(dayPlanEntry?.dayNumber || 0);
        if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
          return accumulator;
        }
        const existingEntry = accumulator.get(dayNumber) || {
          dailyHoursCap: 0,
          lectureIds: [],
        };
        accumulator.set(dayNumber, {
          dailyHoursCap: Math.max(
            Number(existingEntry.dailyHoursCap || 0),
            Number(dayPlanEntry?.dailyHoursCap || 0),
          ),
          lectureIds: Array.from(
            new Set([
              ...existingEntry.lectureIds,
              ...(Array.isArray(dayPlanEntry?.lectureIds)
                ? dayPlanEntry.lectureIds
                    .map((lectureId) => String(lectureId || "").trim())
                    .filter(Boolean)
                : []),
            ]),
          ),
        });
        return accumulator;
      }, new Map());

    const totalDays = Math.max(
      0,
      Math.floor(
        (latestExamDate.getTime() - earliestAttendanceDate.getTime()) / 86400000,
      ),
    );

    return Array.from({ length: totalDays + 1 }, (_, index) => {
      const currentDate = new Date(earliestAttendanceDate);
      currentDate.setDate(earliestAttendanceDate.getDate() + index);
      const dayNumber = index + 1;
      const mappedDayPlan = dayPlanMap.get(dayNumber) || {
        dailyHoursCap: 0,
        lectureIds: [],
      };
      const lectureNames = mappedDayPlan.lectureIds
        .map((lectureId) => lectureNameMap.get(lectureId) || lectureId)
        .filter(Boolean);

      return {
        dayNumber,
        isoDate: currentDate.toISOString(),
        label: formatCalendarDayLabel(currentDate),
        dailyHoursCap: Number(mappedDayPlan.dailyHoursCap || 0),
        lectureCount: lectureNames.length,
        lectureNames,
      };
    });
  }, [attendanceEntries, finalExamEntries, lectures, studyPlanAid]);

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
    const nextStudyPlanAid = normalizeStudyPlanAid({
      ...studyPlanAid,
      enabled: true,
      viewMode: "timeline",
      timelineUnit: "day",
      defaults: {
        defaultDailyHours: Number(defaultsDraft.defaultDailyHours) || 0,
        defaultDifficulty: defaultsDraft.defaultDifficulty,
        defaultMastery: defaultsDraft.defaultMastery,
        defaultPriority: defaultsDraft.defaultPriority,
      },
    });

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

  const renderReportDeadline = (label, targetDate, key) => (
    <div
      key={key}
      className="nogaPlanner_studyPlanTimeReportDeadline"
    >
      <span className="nogaPlanner_studyPlanTimeReportDeadlineLabel">
        {label}
      </span>
      <strong className="nogaPlanner_studyPlanTimeReportDuration">
        {formatRemainingDuration(targetDate, nowDate)}
      </strong>
      <span className="nogaPlanner_studyPlanTimeReportDate">
        {formatStudyPlanReportDate(targetDate) || "Missing date"}
      </span>
    </div>
  );

  return (
    <>
      <section
        id="nogaPlanner_studyPlanTabs"
        className="nogaPlanner_studyPlanTabs"
      >
        <div
          id="nogaPlanner_studyPlanTabsHeader"
          className="nogaPlanner_studyPlanTabsHeader"
        >
          <button
            id="nogaPlanner_studyPlanTab_attendance"
            type="button"
            className={`nogaPlanner_studyPlanTabBtn${activeViewTab === "attendance" ? " is-active" : ""}`}
            onClick={() => setActiveViewTab("attendance")}
          >
            Attendance Schedule
          </button>
          <button
            id="nogaPlanner_studyPlanTab_calendar"
            type="button"
            className={`nogaPlanner_studyPlanTabBtn${activeViewTab === "calendar" ? " is-active" : ""}`}
            onClick={() => setActiveViewTab("calendar")}
          >
            Study Calender
          </button>
        </div>
        <div
          id="nogaPlanner_studyPlanTabsBody"
          className="nogaPlanner_studyPlanTabsBody"
        >
        <div
          id="nogaPlanner_studyPlanCardsMount"
          className="nogaPlanner_studyPlanCardsMount"
        >
          {activeViewTab === "attendance" ? (
            <div
              id="nogaPlanner_studyPlanAttendanceCards"
              className="nogaPlanner_studyPlanCardsGrid nogaPlanner_studyPlanCardsGrid--attendance"
            >
              <div
                id="nogaPlanner_studyPlanAttendanceComponentTabs"
                className="nogaPlanner_studyPlanAttendanceComponentTabs"
              >
                {attendanceComponentTabs.map((tabEntry) => (
                  <button
                    id={`nogaPlanner_studyPlanAttendanceComponentTab_${tabEntry.key}`}
                    key={`nogaPlanner_studyPlanAttendanceComponentTab_${tabEntry.key}`}
                    type="button"
                    className={`nogaPlanner_studyPlanAttendanceComponentTabBtn${selectedAttendanceComponentKey === tabEntry.key ? " is-active" : ""}`}
                    onClick={() =>
                      setSelectedAttendanceComponentKey(tabEntry.key)
                    }
                  >
                    {tabEntry.label}
                  </button>
                ))}
              </div>
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
                            className="nogaPlanner_studyPlanAttendanceDaySquare"
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
          ) : (
            <div
              id="nogaPlanner_studyCalendarCards"
              className="nogaPlanner_studyPlanCardsGrid nogaPlanner_studyPlanCardsGrid--calendar"
            >
              {studyCalendarDays.length === 0 ? (
                <div
                  id="nogaPlanner_studyCalendarEmpty"
                  className="nogaPlanner_studyPlanEmptyCard"
                >
                  {PLAN_TEXT.noRows}
                </div>
              ) : (
                studyCalendarDays.map((dayEntry, rowIndex) => (
                  <div
                    id={`nogaPlanner_studyCalendarCard_${rowIndex}`}
                    key={`calendar-day-${dayEntry.dayNumber}`}
                    className="nogaPlanner_studyPlanCard nogaPlanner_studyPlanCard--calendar"
                  >
                    <strong className="nogaPlanner_studyPlanCardTitle">
                      Day {dayEntry.dayNumber}
                    </strong>
                    <span className="nogaPlanner_studyPlanCardEyebrow">
                      {dayEntry.label}
                    </span>
                    <div className="nogaPlanner_studyPlanCardFacts">
                      <span className="nogaPlanner_studyPlanCalendarBadge">
                        {String(dayEntry.isoDate).slice(0, 10)}
                      </span>
                      <span>
                        {STUDY_PLAN_LABELS.dailyHoursCap || "Daily Cap"}:{" "}
                        {dayEntry.dailyHoursCap}
                      </span>
                      <span>
                        Planned lectures: {dayEntry.lectureCount}
                      </span>
                      <span>
                        {dayEntry.lectureNames.length > 0
                          ? dayEntry.lectureNames.join(", ")
                          : "No planned lectures"}
                      </span>
                    </div>
                  </div>
                ))
              )}
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
            <strong>Time Report</strong>
            <span>Compared with now</span>
          </div>
          {componentTimeReportRows.length === 0 ? (
            <div
              id="nogaPlanner_studyPlanTimeReportEmpty"
              className="nogaPlanner_studyPlanTimeReportEmpty"
            >
              No component dates.
            </div>
          ) : (
            <div
              id="nogaPlanner_studyPlanTimeReportList"
              className="nogaPlanner_studyPlanTimeReportList"
            >
              {componentTimeReportRows.map((reportRow) => (
                <article
                  id={`nogaPlanner_studyPlanTimeReportCard_${reportRow.key}`}
                  key={reportRow.key}
                  className="nogaPlanner_studyPlanTimeReportCard"
                >
                  <h4>{reportRow.label}</h4>
                  {renderReportDeadline(
                    "Last day of Attendance",
                    reportRow.attendanceDate,
                    `${reportRow.key}-attendance`,
                  )}
                  {reportRow.midExamDates.length > 0
                    ? reportRow.midExamDates.map((midExamDate, midExamIndex) =>
                        renderReportDeadline(
                          `Mid-Exam due ${midExamIndex + 1}`,
                          midExamDate,
                          `${reportRow.key}-mid-${midExamIndex}`,
                        ),
                      )
                    : renderReportDeadline(
                        "Mid-Exam due",
                        null,
                        `${reportRow.key}-mid-empty`,
                      )}
                  {renderReportDeadline(
                    "Final exam due",
                    reportRow.finalExamDate,
                    `${reportRow.key}-final`,
                  )}
                </article>
              ))}
            </div>
          )}
        </aside>
        </div>
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


