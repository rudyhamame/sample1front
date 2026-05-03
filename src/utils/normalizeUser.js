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

const normalizeProfilePictureViewport = (value) =>
  value && typeof value === "object"
    ? {
        scale: Number(value.scale ?? value.zoom) || 1,
        offsetX: Number(value.offsetX ?? value.x) || 0,
        offsetY: Number(value.offsetY ?? value.y) || 0,
      }
    : DEFAULT_PROFILE_PICTURE_VIEWPORT;

const normalizeHomeDrawing = (value) =>
  value && typeof value === "object"
    ? {
        draftPaths: Array.isArray(value.draftPaths) ? value.draftPaths : [],
        appliedPaths: Array.isArray(value.appliedPaths)
          ? value.appliedPaths
          : Array.isArray(value.paths)
            ? value.paths
            : [],
        textItems: Array.isArray(value.textItems) ? value.textItems : [],
      }
    : DEFAULT_HOME_DRAWING;

const normalizeImageGallery = (value) =>
  Array.isArray(value) ? value.filter(Boolean) : [];

const normalizeNullableNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProfileStudyingTime = (studying = {}) => {
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
    studyingTime?.totalYearsNum ?? studyingTime?.totalYears,
    0,
  );
  const startProgramYearInterval = String(
    start?.programYearInterval ?? startDate?.startYear ?? "",
  ).trim();
  const startProgramTerm = String(
    start?.programTerm ?? startDate?.startTerm ?? "",
  ).trim();
  const currentProgramYearInterval = String(
    current?.programYearInterval ?? studyingTime?.currentAcademicYear ?? "",
  ).trim();
  const currentProgramYearNum = normalizeNullableNumber(
    current?.programYearNum ?? currentDate?.year,
    null,
  );
  const currentProgramTerm = String(
    current?.programTerm ?? currentDate?.term ?? studying?.term ?? "",
  ).trim();

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
      programTerm: currentProgramTerm || null,
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
      term: currentProgramTerm || null,
    },
  };
};

const isProfileCompleted = (rawUser = {}) => {
  const profile =
    rawUser.profile && typeof rawUser.profile === "object"
      ? rawUser.profile
      : rawUser.bio && typeof rawUser.bio === "object"
        ? rawUser.bio
        : {};

  const hasCorePersonalFields =
    String(profile.firstname || "").trim() &&
    String(profile.lastname || "").trim() &&
    String(profile.email || "").trim() &&
    String(profile.phone || "").trim() &&
    Boolean(profile.dob);

  if (!hasCorePersonalFields) {
    return false;
  }

  const hometown =
    profile.hometown && typeof profile.hometown === "object"
      ? profile.hometown
      : {};
  const hasHometown =
    String(hometown.Country || "").trim() && String(hometown.City || "").trim();

  const studying =
    profile.studying && typeof profile.studying === "object"
      ? profile.studying
      : {};
  const studyingTime = normalizeProfileStudyingTime(studying);
  const studyingTimeStartDate = studyingTime.startDate || {};
  const studyingTimeCurrentDate = studyingTime.currentDate || {};
  const working =
    profile.working && typeof profile.working === "object"
      ? profile.working
      : {};

  const hasStudying =
    String(studying.program || "").trim() &&
    String(studying.university || "").trim() &&
    String(studyingTimeCurrentDate.term || studying.term || "").trim();
  const hasWorking =
    String(working.company || "").trim() && String(working.position || "").trim();

  return Boolean(hasCorePersonalFields && hasHometown && (hasStudying || hasWorking));
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

export const normalizeUserPayload = (rawUser = {}, overrides = {}) => {
  const auth = rawUser.auth || {};
  const identity = rawUser.identity || {};
  const atSignup = identity.atSignup || {};
  const personal = identity.personal || {};
  const aiSettings = rawUser.settings?.AI || {};
  const media = rawUser.media || {};
  const profile = rawUser.profile || rawUser.bio || {};
  const studying = profile.studying || {};
  const normalizedStudyingTime = normalizeProfileStudyingTime(studying);
  const studyingTimeStartDate = normalizedStudyingTime.startDate || {};
  const studyingTimeCurrentDate = normalizedStudyingTime.currentDate || {};
  const normalizedStudying =
    studying && typeof studying === "object"
      ? {
          ...studying,
          time: normalizedStudyingTime,
        }
      : {};
  const working = profile.working || {};
  const memory = rawUser.memory || {};
  const planner = memory.studyPlanner || {};
  const plannerCourses = Array.isArray(planner.courses) ? planner.courses : [];
  const profilePictureNode =
    personal.profilePicture?.picture ||
    media.profilePicture ||
    profile.profilePic ||
    rawUser.profilePicture ||
    {};
  const profilePictureViewportNode =
    personal.profilePicture?.profilePictureViewport ||
    media.profilePictureViewport ||
    profile.viewport;
  const homeDrawingNode = media.homeDrawing;
  const imageGalleryNode = media.imageGallery;

  return {
    my_id: overrides.my_id || rawUser._id || rawUser.id || null,
    username: String(
      overrides.username ?? atSignup.username ?? auth.username ?? "",
    ).trim(),
    firstname: String(overrides.firstname ?? profile.firstname ?? "").trim(),
    lastname: String(overrides.lastname ?? profile.lastname ?? "").trim(),
    email: String(overrides.email ?? profile.email ?? "").trim(),
    phone: String(overrides.phone ?? profile.phone ?? "").trim(),
    bio: String(overrides.bio ?? profile.bio ?? "").trim(),
    hometown:
      overrides.hometown ??
      (profile.hometown && typeof profile.hometown === "object"
        ? profile.hometown
        : { Country: "", City: "" }),
    studying: overrides.studying ?? normalizedStudying,
    working: overrides.working ?? profile.working ?? {},
    faculty: String(overrides.faculty ?? studying.faculty ?? "").trim(),
    program: String(overrides.program ?? studying.program ?? "").trim(),
    university: String(
      overrides.university ?? studying.university ?? "",
    ).trim(),
    studyYear: String(
      overrides.studyYear ??
        normalizedStudyingTime.current?.programYearNum ??
        studyingTimeStartDate.startYear ??
        studying.programStartYear ??
        studying.academicYear ??
        "",
    ).trim(),
    term: String(
      overrides.term ??
        normalizedStudyingTime.current?.programTerm ??
        studyingTimeCurrentDate.term ??
        studying.term ??
        "",
    ).trim(),
    aiProvider:
      String(
        overrides.aiProvider ?? aiSettings.aiProvider ?? "openai",
      ).trim() || "openai",
    profilePicture: getProfilePictureUrl(
      overrides.profilePicture,
      profilePictureNode,
    ),
    profilePictureViewport: normalizeProfilePictureViewport(
      overrides.profilePictureViewport ?? profilePictureViewportNode,
    ),
    homeDrawing: normalizeHomeDrawing(overrides.homeDrawing ?? homeDrawingNode),
    imageGallery: normalizeImageGallery(
      overrides.imageGallery ?? imageGalleryNode,
    ),
    dob: overrides.dob ?? profile.dob ?? personal.dob ?? null,
    token: overrides.token ?? rawUser.token ?? "",
    isConnected: overrides.isConnected ?? rawUser.isConnected ?? true,
    notes: overrides.notes ?? rawUser.notes,
    friends: Array.isArray(overrides.friends)
      ? overrides.friends
      : Array.isArray(rawUser.friends)
        ? rawUser.friends
        : [],
    friend_requests: Array.isArray(overrides.friend_requests)
      ? overrides.friend_requests
      : Array.isArray(rawUser.friend_requests)
        ? rawUser.friend_requests
        : [],
    sent_friend_requests: Array.isArray(overrides.sent_friend_requests)
      ? overrides.sent_friend_requests
      : Array.isArray(rawUser.sent_friend_requests)
        ? rawUser.sent_friend_requests
        : [],
    posts: Array.isArray(overrides.posts)
      ? overrides.posts
      : Array.isArray(rawUser.posts)
        ? rawUser.posts
        : [],
    login_record: Array.isArray(overrides.login_record)
      ? overrides.login_record
      : Array.isArray(rawUser.login_record)
        ? rawUser.login_record
        : [],
    courses: Array.isArray(overrides.courses)
      ? overrides.courses
      : Array.isArray(memory.courses)
        ? memory.courses
        : plannerCourses.length > 0
          ? plannerCourses
          : [],
    lectures: Array.isArray(overrides.lectures)
      ? overrides.lectures
      : Array.isArray(memory.lectures)
        ? memory.lectures
        : [],
    studyPlanner:
      overrides.studyPlanner ??
      (planner && typeof planner === "object" ? planner : {}),
    chat: Array.isArray(overrides.chat)
      ? overrides.chat
      : Array.isArray(rawUser.chat)
        ? rawUser.chat
        : [],
    isOnline: overrides.isOnline ?? rawUser.isOnline ?? false,
    profileCompleted:
      overrides.profileCompleted ?? isProfileCompleted(rawUser),
  };
};

export const defaultUserMediaState = {
  profilePicture: "",
  profilePictureViewport: DEFAULT_PROFILE_PICTURE_VIEWPORT,
  homeDrawing: DEFAULT_HOME_DRAWING,
  imageGallery: [],
};
