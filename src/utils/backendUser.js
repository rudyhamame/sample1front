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
        personal?.faculty ?? studying?.faculty ?? profile?.faculty ?? "",
      ).trim(),
      program: String(
        personal?.program ?? studying?.program ?? profile?.program ?? "",
      ).trim(),
      university: String(
        personal?.university ?? studying?.university ?? profile?.university ?? "",
      ).trim(),
      term: String(
        personal?.term ??
          studying?.time?.currentDate?.term ??
          studying?.term ??
          profile?.term ??
          "",
      ).trim(),
      studyYear: String(
        personal?.studyYear ??
          studying?.time?.startDate?.startYear ??
          studying?.academicYear ??
          profile?.studyYear ??
          profile?.year ??
          "",
      ).trim(),
    },
    profile,
    studying,
    settings,
    media,
    memory,
    friends: toArray(payload?.friends),
    friendRequests: toArray(payload?.friend_requests),
    sentFriendRequests: toArray(payload?.sent_friend_requests),
    rejectedUsers: toArray(payload?.rejected_users),
    posts: toArray(payload?.posts),
    chat: payload?.chat,
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
