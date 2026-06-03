const DEFAULT_PROFILE_PICTURE_VIEWPORT = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const DEFAULT_HOME_DRAWING = {
  draftPaths: [],
  appliedPaths: [],
  textItems: [],
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeNullableNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProgramTermNumber = (value = "") => {
  const normalizedValue = String(value || "").trim();
  return ["First", "Second", "Third"].includes(normalizedValue)
    ? normalizedValue
    : "";
};

const normalizeProgramTermScheduleEntries = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => ({
      component_class: String(entry?.component_class || "").trim(),
      start_date: entry?.start_date || null,
      end_date: entry?.end_date || null,
    }))
    .filter(
      (entry) =>
        entry.component_class || entry.start_date !== null || entry.end_date !== null,
    );

const normalizeCurrentProgramTerm = (value, fallback = "") => {
  const rawValue =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const number = normalizeProgramTermNumber(
    rawValue?.number ?? value ?? fallback,
  );
  return number || null;
};

const normalizeProfileStudyingTime = (studying = {}) => {
  const studyingYears =
    studying?.academicYearsIntervals &&
    typeof studying.academicYearsIntervals === "object"
      ? studying.academicYearsIntervals
      : {};
  const studyingTime =
    studying?.time && typeof studying.time === "object" ? studying.time : {};
  const start =
    studyingTime?.start && typeof studyingTime.start === "object"
      ? studyingTime.start
      : {};
  const current =
    studyingTime?.current && typeof studyingTime.current === "object"
      ? studyingTime.current
      : {};
  const startDate =
    studyingTime?.startDate && typeof studyingTime.startDate === "object"
      ? studyingTime.startDate
      : {};
  const currentDate =
    studyingTime?.currentDate && typeof studyingTime.currentDate === "object"
      ? studyingTime.currentDate
      : {};

  const totalYearsNum = normalizeNullableNumber(
    studyingTime?.totalYearsNum ?? studyingTime?.totalYears ?? studyingYears?.total,
    0,
  );
  const startProgramYearInterval = String(
    start?.programYearInterval ??
      studyingYears?.first?.interval ??
      startDate?.startYear ??
      "",
  ).trim();
  const startProgramTerm = String(
    start?.programTerm ??
      studyingYears?.first?.term ??
      startDate?.startTerm ??
      "",
  ).trim();
  const currentProgramYearInterval = String(
    current?.programYearInterval ??
      studyingTime?.currentAcademicYear ??
      studyingYears?.current?.interval ??
      "",
  ).trim();
  const currentProgramYearNum = normalizeNullableNumber(
    current?.programYearNum ?? currentDate?.year ?? studyingYears?.current?.num,
    null,
  );
  const currentProgramTermNumber = normalizeProgramTermNumber(
    current?.programTerm?.number ??
      current?.programTerm ??
      studyingYears?.current?.term ??
      currentDate?.term ??
      studying?.term ??
      "",
  );
  const normalizedCurrentProgramTerm = normalizeCurrentProgramTerm(
    current?.programTerm,
    currentProgramTermNumber,
  );

  return {
    ...studyingTime,
    totalYearsNum,
    totalYears: totalYearsNum,
    start: {
      ...(start && typeof start === "object" ? start : {}),
      programYearInterval: startProgramYearInterval || null,
      programTerm: startProgramTerm || null,
    },
    current: {
      ...(current && typeof current === "object" ? current : {}),
      programYearInterval: currentProgramYearInterval || null,
      programYearNum: currentProgramYearNum,
      programTerm: normalizedCurrentProgramTerm,
    },
    currentAcademicYear: currentProgramYearInterval || null,
    startDate: {
      ...(startDate && typeof startDate === "object" ? startDate : {}),
      startYear: startProgramYearInterval || null,
      startTerm: startProgramTerm || null,
    },
    currentDate: {
      ...(currentDate && typeof currentDate === "object" ? currentDate : {}),
      year: currentProgramYearNum,
      term: currentProgramTermNumber || null,
    },
  };
};

const getProfilePictureUrl = (...sources) => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    if (typeof source === "string") {
      const trimmed = source.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }

    if (typeof source === "object") {
      const candidate =
        source.url ||
        source.secure_url ||
        source.picture?.url ||
        source.profilePic?.url ||
        source.profilePicture?.url ||
        source.profilePicture?.picture?.url;
      const trimmed = String(candidate || "").trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return "";
};

export const normalizeProfilePictureViewport = (value) => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROFILE_PICTURE_VIEWPORT };
  }

  const scale = Number(value.scale ?? value.zoom);
  const offsetX = Number(value.offsetX ?? value.x);
  const offsetY = Number(value.offsetY ?? value.y);

  return {
    scale: Number.isFinite(scale) ? scale : DEFAULT_PROFILE_PICTURE_VIEWPORT.scale,
    offsetX: Number.isFinite(offsetX)
      ? offsetX
      : DEFAULT_PROFILE_PICTURE_VIEWPORT.offsetX,
    offsetY: Number.isFinite(offsetY)
      ? offsetY
      : DEFAULT_PROFILE_PICTURE_VIEWPORT.offsetY,
  };
};

export const normalizeHomeDrawingPayload = (value) => {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_HOME_DRAWING };
  }

  return {
    draftPaths: toArray(value.draftPaths),
    appliedPaths: toArray(value.appliedPaths),
    textItems: toArray(value.textItems),
  };
};

export const normalizeMemoryPayload = (payload) => {
  const memory = payload?.memory;
  const planner = memory?.studyPlanner;
  const plannerOrganizer =
    planner?.studyOrganizer && typeof planner.studyOrganizer === "object"
      ? planner.studyOrganizer
      : {};
  const plannerCourses = Array.isArray(plannerOrganizer?.courses)
    ? plannerOrganizer.courses
    : Array.isArray(planner?.courses)
      ? planner.courses
      : [];
  const plannerExams = Array.isArray(plannerOrganizer?.exams)
    ? plannerOrganizer.exams
    : Array.isArray(planner?.exams)
      ? planner.exams
      : [];
  const studyPlanAid =
    planner?.studyPlanAid && typeof planner.studyPlanAid === "object"
      ? planner.studyPlanAid
      : {};
  const moaEntries = Array.isArray(memory?.MOA) ? memory.MOA : [];
  const telegramFromMoa =
    moaEntries.find(
      (entry) => entry?.telegram && typeof entry.telegram === "object",
    )?.telegram || null;

  if (!memory || typeof memory !== "object") {
    return {
      courses: [],
      lectures: [],
      studyPlanner: {},
      studyOrganizer: {},
      studyPlanAid: {},
      telegram: {},
    };
  }

  return {
    ...memory,
    courses:
      Array.isArray(memory.courses) && memory.courses.length > 0
        ? memory.courses
        : plannerCourses,
    lectures: toArray(memory.lectures),
    studyPlanner:
      planner && typeof planner === "object"
        ? {
            ...planner,
            studyOrganizer: plannerOrganizer,
            studyPlanAid,
          }
        : {},
    studyOrganizer: plannerOrganizer,
    studyPlanAid,
    plannerExams,
    telegram:
      memory.telegram && typeof memory.telegram === "object"
        ? memory.telegram
        : telegramFromMoa && typeof telegramFromMoa === "object"
          ? telegramFromMoa
        : {},
  };
};

export const normalizeUserUpdatePayload = (payload) => {
  const identity =
    payload?.identity && typeof payload.identity === "object"
      ? payload.identity
      : {};
  const personal =
    identity?.personal && typeof identity.personal === "object"
      ? identity.personal
      : {};
  const settings =
    payload?.settings && typeof payload.settings === "object"
      ? payload.settings
      : payload?.AI?.settings && typeof payload.AI.settings === "object"
        ? payload.AI.settings
        : {};
  const media =
    payload?.media && typeof payload.media === "object" ? payload.media : {};
  const profile =
    payload?.profile && typeof payload.profile === "object"
      ? payload.profile
      : payload?.bio && typeof payload.bio === "object"
        ? payload.bio
        : {};
  const studying =
    profile?.studying && typeof profile.studying === "object"
      ? profile.studying
      : {};
  const studyingProgram = String(
    studying?.program ?? studying?.id?.program ?? "",
  ).trim();
  const studyingFaculty = String(
    studying?.faculty ?? studying?.location?.faculty ?? "",
  ).trim();
  const studyingUniversity = String(
    studying?.university ?? studying?.location?.university ?? "",
  ).trim();
  const studyingComponentsClass = Array.from(
    new Set(
      (Array.isArray(studying?.componentsClass)
        ? studying.componentsClass
        : Array.isArray(studying?.id?.components)
          ? studying.id.components
          : []
      )
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const normalizedStudyingTime = normalizeProfileStudyingTime(studying);
  const memory = normalizeMemoryPayload(payload);

  const nextProfilePicture = getProfilePictureUrl(
    media?.profilePicture,
    personal?.profilePicture?.picture,
    profile?.profilePic,
    payload?.profilePicture,
  );

  return {
    identity,
    personal: {
      ...personal,
      faculty: String(
        personal?.faculty ?? studyingFaculty ?? profile?.faculty ?? "",
      ).trim(),
      program: String(
        personal?.program ?? studyingProgram ?? profile?.program ?? "",
      ).trim(),
      university: String(
        personal?.university ?? studyingUniversity ?? profile?.university ?? "",
      ).trim(),
      term: String(
        personal?.term ??
          normalizedStudyingTime?.current?.programTerm ??
          normalizedStudyingTime?.currentDate?.term ??
          studying?.term ??
          profile?.term ??
          "",
      ).trim(),
      studyYear: String(
        personal?.studyYear ??
          normalizedStudyingTime?.current?.programYearNum ??
          normalizedStudyingTime?.start?.programYearInterval ??
          normalizedStudyingTime?.startDate?.startYear ??
          studying?.academicYear ??
          profile?.studyYear ??
          profile?.year ??
          "",
      ).trim(),
    },
    profile,
    studying:
      studying && typeof studying === "object"
        ? {
          ...studying,
          program: studyingProgram,
          faculty: studyingFaculty,
          university: studyingUniversity,
          componentsClass: studyingComponentsClass,
          time: normalizedStudyingTime,
        }
        : {},
    settings,
    media,
    memory,
    friends: toArray(payload?.friends),
    friendRequests: toArray(payload?.friend_requests),
    sentFriendRequests: toArray(payload?.sent_friend_requests),
    rejectedUsers: toArray(payload?.rejected_users),
    posts: toArray(payload?.posts),
    chat: toArray(payload?.chat),
    isOnline: Boolean(payload?.isOnline),
    aiProvider: String(settings?.aiProvider || "openai").trim() || "openai",
    profilePicture: nextProfilePicture,
    profilePictureViewport: normalizeProfilePictureViewport(
      media?.profilePictureViewport ||
        personal?.profilePicture?.profilePictureViewport,
    ),
    homeDrawing: normalizeHomeDrawingPayload(media?.homeDrawing),
    imageGallery: toArray(media?.imageGallery),
  };
};
